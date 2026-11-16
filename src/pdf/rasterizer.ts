import { type EncodedImage, ImageEncoder, PageColorType } from "@mmote/niimbluelib";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import {
  binarizeRgbaBuffer,
  computeRasterGeometry,
  type DitherMode,
  type FitMode,
  isApproximately50x50Mm,
  LABEL_HEIGHT_PX,
  LABEL_WIDTH_PX,
  pointsToMillimeters,
  type RotationDegrees,
} from "./binarizer.ts";

import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  validatePdfBytes,
  validatePdfPageCount,
} from "./validation.ts";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const SUPERSAMPLE_FACTOR = 4;

export { MAX_PDF_BYTES, MAX_PDF_PAGES, validatePdfBytes, validatePdfPageCount };

export interface RasterOptions {
  fitMode: FitMode;
  ditherMode: DitherMode;
  threshold: number;
  rotation: RotationDegrees;
  invert: boolean;
}

export const DEFAULT_RASTER_OPTIONS: RasterOptions = {
  fitMode: "fit",
  ditherMode: "threshold",
  threshold: 160,
  rotation: 0,
  invert: false,
};

export interface RenderedLabelPage {
  pageNumber: number;
  sourceWidthMm: number;
  sourceHeightMm: number;
  isExpected50x50Mm: boolean;
  widthPx: number;
  heightPx: number;
  blackPixelsCount: number;
  encodedImage: EncodedImage;
  canvas: HTMLCanvasElement;
}

type SecureDocumentInitParameters = DocumentInitParameters & {
  readonly enableScripting: false;
};

export function createPdfLoadingTask(pdfBytes: Uint8Array): PDFDocumentLoadingTask {
  validatePdfBytes(pdfBytes);
  // Pass a copy so PDF.js worker buffer transfer does not detach the caller's Uint8Array.
  const params: SecureDocumentInitParameters = {
    data: pdfBytes.slice(),
    enableScripting: false,
    enableXfa: false,
  };
  return getDocument(params);
}

export async function renderPdfPageToLabel(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  options: RasterOptions,
): Promise<RenderedLabelPage> {
  const page = await pdfDoc.getPage(pageNumber);
  try {
    const baseViewport = page.getViewport({ scale: 1, rotation: 0 });
    const sourceWidthMm = pointsToMillimeters(baseViewport.width);
    const sourceHeightMm = pointsToMillimeters(baseViewport.height);
    const isExpected50x50Mm = isApproximately50x50Mm(sourceWidthMm, sourceHeightMm);

    const geometry = computeRasterGeometry(
      baseViewport.width,
      baseViewport.height,
      options.rotation,
      options.fitMode,
    );

    // Supersample onto an offscreen canvas with enforced pure white background.
    const rotatedViewport = page.getViewport({
      scale: geometry.scale * SUPERSAMPLE_FACTOR,
      rotation: options.rotation,
    });

    const supersampleCanvas = document.createElement("canvas");
    supersampleCanvas.width = Math.max(1, Math.round(rotatedViewport.width));
    supersampleCanvas.height = Math.max(1, Math.round(rotatedViewport.height));

    const supersampleCtx = supersampleCanvas.getContext("2d", { alpha: false });
    if (!supersampleCtx) {
      throw new Error("Failed to acquire 2D context for PDF supersampling canvas.");
    }
    supersampleCtx.fillStyle = "#FFFFFF";
    supersampleCtx.fillRect(0, 0, supersampleCanvas.width, supersampleCanvas.height);

    await page.render({
      canvas: supersampleCanvas,
      canvasContext: supersampleCtx,
      viewport: rotatedViewport,
      background: "rgb(255, 255, 255)",
    }).promise;

    // Downsample into strict 384x400 px output canvas centered on #FFFFFF.
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = LABEL_WIDTH_PX;
    outputCanvas.height = LABEL_HEIGHT_PX;

    const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
    if (!outputCtx) {
      throw new Error("Failed to acquire 2D context for 384x400 output canvas.");
    }

    outputCtx.fillStyle = "#FFFFFF";
    outputCtx.fillRect(0, 0, LABEL_WIDTH_PX, LABEL_HEIGHT_PX);
    outputCtx.imageSmoothingEnabled = true;
    outputCtx.imageSmoothingQuality = "high";
    outputCtx.drawImage(
      supersampleCanvas,
      geometry.offsetX,
      geometry.offsetY,
      geometry.drawWidth,
      geometry.drawHeight,
    );

    // Binarize to strict 1-bit #000000 / #FFFFFF pixels.
    const imageData = outputCtx.getImageData(0, 0, LABEL_WIDTH_PX, LABEL_HEIGHT_PX);
    const blackPixelsCount = binarizeRgbaBuffer(imageData.data, LABEL_WIDTH_PX, LABEL_HEIGHT_PX, {
      ditherMode: options.ditherMode,
      threshold: options.threshold,
      invert: options.invert,
    });
    outputCtx.putImageData(imageData, 0, 0);

    // Validate encoding for Niimbot B1 (printDirection = "top", SingleColor = 0).
    const encodedImage = ImageEncoder.encodeCanvas(outputCanvas, PageColorType.SingleColor, "top");
    if (encodedImage.cols !== LABEL_WIDTH_PX || encodedImage.rows !== LABEL_HEIGHT_PX) {
      throw new Error(
        `EncodedImage dimension mismatch: expected ${LABEL_WIDTH_PX}x${LABEL_HEIGHT_PX}, got ${encodedImage.cols}x${encodedImage.rows}`,
      );
    }

    return {
      pageNumber,
      sourceWidthMm,
      sourceHeightMm,
      isExpected50x50Mm,
      widthPx: LABEL_WIDTH_PX,
      heightPx: LABEL_HEIGHT_PX,
      blackPixelsCount,
      encodedImage,
      canvas: outputCanvas,
    };
  } finally {
    page.cleanup();
  }
}

export async function rasterizePdfDocument(
  pdfBytes: Uint8Array,
  options: RasterOptions,
): Promise<RenderedLabelPage[]> {
  const loadingTask = createPdfLoadingTask(pdfBytes);
  const pdfDoc = await loadingTask.promise;
  try {
    validatePdfPageCount(pdfDoc.numPages);
    const pages: RenderedLabelPage[] = [];
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      pages.push(await renderPdfPageToLabel(pdfDoc, pageNum, options));
    }
    return pages;
  } finally {
    await pdfDoc.cleanup();
    await loadingTask.destroy();
  }
}
