import assert from "node:assert/strict";
import test from "node:test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  computeRasterGeometry,
  isApproximately50x50Mm,
  LABEL_HEIGHT_PX,
  LABEL_WIDTH_PX,
  pointsToMillimeters,
} from "../src/pdf/binarizer.ts";
import {
  createSample50x50PdfBytes,
  SAMPLE_PDF_FILENAME_EN,
  SAMPLE_PDF_FILENAME_PT,
} from "../src/pdf/samplePdf.ts";
import { validatePdfBytes, validatePdfPageCount } from "../src/pdf/validation.ts";

test("createSample50x50PdfBytes produces valid 50x50 mm PDF-1.4 rasterizable by pdfjs-dist", async () => {
  assert.ok(SAMPLE_PDF_FILENAME_EN.endsWith(".pdf"));
  assert.ok(SAMPLE_PDF_FILENAME_PT.endsWith(".pdf"));

  const bytes = createSample50x50PdfBytes();
  validatePdfBytes(bytes);

  const header = new TextDecoder().decode(bytes.subarray(0, 8));
  assert.equal(header, "%PDF-1.4");

  const loadingTask = getDocument({
    data: bytes.slice(),
    enableXfa: false,
    useWorkerFetch: false,
  });

  const pdfDoc = await loadingTask.promise;
  try {
    validatePdfPageCount(pdfDoc.numPages);
    assert.equal(pdfDoc.numPages, 1);

    const page = await pdfDoc.getPage(1);
    try {
      const viewport = page.getViewport({ scale: 1, rotation: 0 });
      const widthMm = pointsToMillimeters(viewport.width);
      const heightMm = pointsToMillimeters(viewport.height);

      assert.ok(Math.abs(widthMm - 50) < 0.05, `Expected 50 mm width, got ${widthMm}`);
      assert.ok(Math.abs(heightMm - 50) < 0.05, `Expected 50 mm height, got ${heightMm}`);
      assert.equal(isApproximately50x50Mm(widthMm, heightMm), true);

      const geom = computeRasterGeometry(viewport.width, viewport.height, 0, "fit");
      assert.equal(geom.outputWidth, LABEL_WIDTH_PX);
      assert.equal(geom.outputHeight, LABEL_HEIGHT_PX);

      const ops = await page.getOperatorList();
      assert.ok(
        ops.fnArray.length > 20,
        `Expected rich drawing operator list, got ${ops.fnArray.length}`,
      );
    } finally {
      page.cleanup();
    }
  } finally {
    await pdfDoc.cleanup();
    await loadingTask.destroy();
  }
});
