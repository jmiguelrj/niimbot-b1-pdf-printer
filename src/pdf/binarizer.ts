export const PHYSICAL_LABEL_MM = 50;
export const PRINTHEAD_DPI = 203;
export const DOTS_PER_MM = 8;
export const LABEL_WIDTH_PX = 384; // 48 mm active printhead width (1 mm unprintable margin per side)
export const LABEL_HEIGHT_PX = 400; // 50 mm label height at 8 dots/mm
export const FULL_PHYSICAL_WIDTH_PX = 400; // 50 mm width before 8 px/side bleed trim
export const SIDE_BLEED_PX = (FULL_PHYSICAL_WIDTH_PX - LABEL_WIDTH_PX) / 2; // 8 px (1 mm)
export const POINTS_PER_INCH = 72;
export const MM_PER_INCH = 25.4;
export const EXPECTED_MM_TOLERANCE = 2.0;

export type FitMode = "fit" | "crop-bleed";
export type DitherMode = "threshold" | "atkinson";
export type RotationDegrees = 0 | 90 | 180 | 270;

export interface BinarizeOptions {
  ditherMode: DitherMode;
  threshold: number;
  invert: boolean;
}

export interface RasterGeometry {
  outputWidth: number;
  outputHeight: number;
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function pointsToMillimeters(points: number): number {
  return (points * MM_PER_INCH) / POINTS_PER_INCH;
}

export function isApproximately50x50Mm(widthMm: number, heightMm: number): boolean {
  return (
    Math.abs(widthMm - PHYSICAL_LABEL_MM) <= EXPECTED_MM_TOLERANCE &&
    Math.abs(heightMm - PHYSICAL_LABEL_MM) <= EXPECTED_MM_TOLERANCE
  );
}

/**
 * Computes exact draw geometry onto the 384x400 px Niimbot B1 canvas.
 * - "fit": uniformly scales into 384x400 px centered on white (#FFFFFF).
 * - "crop-bleed": uniformly scales into 400x400 px (50x50 mm @ 8 dots/mm) and trims 8 px left/right.
 */
export function computeRasterGeometry(
  sourceWidthPt: number,
  sourceHeightPt: number,
  rotation: RotationDegrees,
  fitMode: FitMode,
): RasterGeometry {
  if (sourceWidthPt <= 0 || sourceHeightPt <= 0) {
    throw new Error(`Invalid PDF page dimensions: ${sourceWidthPt}x${sourceHeightPt} pt`);
  }

  const isQuarterTurn = rotation === 90 || rotation === 270;
  const rotatedWidth = isQuarterTurn ? sourceHeightPt : sourceWidthPt;
  const rotatedHeight = isQuarterTurn ? sourceWidthPt : sourceHeightPt;

  const targetBoxWidth = fitMode === "crop-bleed" ? FULL_PHYSICAL_WIDTH_PX : LABEL_WIDTH_PX;
  const targetBoxHeight = LABEL_HEIGHT_PX;

  const scale = Math.min(targetBoxWidth / rotatedWidth, targetBoxHeight / rotatedHeight);
  const drawWidth = rotatedWidth * scale;
  const drawHeight = rotatedHeight * scale;

  const boxOffsetX = (targetBoxWidth - drawWidth) / 2;
  const boxOffsetY = (targetBoxHeight - drawHeight) / 2;
  const cropShiftX = fitMode === "crop-bleed" ? SIDE_BLEED_PX : 0;

  return {
    outputWidth: LABEL_WIDTH_PX,
    outputHeight: LABEL_HEIGHT_PX,
    drawWidth,
    drawHeight,
    offsetX: boxOffsetX - cropShiftX,
    offsetY: boxOffsetY,
    scale,
  };
}

/**
 * Converts RGBA pixels in-place into strict 1-bit #000000 / #FFFFFF RGBA (alpha = 255).
 * Semi-transparent pixels are first composited onto pure white (#FFFFFF).
 */
export function binarizeRgbaBuffer(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: BinarizeOptions,
): number {
  const pixelCount = width * height;
  if (rgba.length !== pixelCount * 4) {
    throw new Error(`RGBA buffer length ${rgba.length} does not match ${width}x${height}x4`);
  }

  const clampedThreshold = Math.max(0, Math.min(255, Math.round(options.threshold)));
  const luminanceBuffer = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4;
    const alpha = rgba[base + 3] / 255;
    const r = rgba[base] * alpha + 255 * (1 - alpha);
    const g = rgba[base + 1] * alpha + 255 * (1 - alpha);
    const b = rgba[base + 2] * alpha + 255 * (1 - alpha);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminanceBuffer[i] = options.invert ? 255 - lum : lum;
  }

  let blackPixels = 0;

  if (options.ditherMode === "threshold") {
    for (let i = 0; i < pixelCount; i++) {
      const isBlack = luminanceBuffer[i] < clampedThreshold;
      const channel = isBlack ? 0 : 255;
      if (isBlack) {
        blackPixels++;
      }
      const base = i * 4;
      rgba[base] = channel;
      rgba[base + 1] = channel;
      rgba[base + 2] = channel;
      rgba[base + 3] = 255;
    }
    return blackPixels;
  }

  // Atkinson 1-bit error diffusion (distributes 6/8 of quantization error)
  const atkinsonCutoff = 128;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = luminanceBuffer[idx];
      const newPixel = oldPixel < atkinsonCutoff ? 0 : 255;
      const quantError = (oldPixel - newPixel) / 8;

      if (newPixel === 0) {
        blackPixels++;
      }

      const base = idx * 4;
      rgba[base] = newPixel;
      rgba[base + 1] = newPixel;
      rgba[base + 2] = newPixel;
      rgba[base + 3] = 255;

      if (x + 1 < width) {
        luminanceBuffer[idx + 1] += quantError;
      }
      if (x + 2 < width) {
        luminanceBuffer[idx + 2] += quantError;
      }
      if (y + 1 < height) {
        const nextRow = (y + 1) * width;
        if (x - 1 >= 0) {
          luminanceBuffer[nextRow + x - 1] += quantError;
        }
        luminanceBuffer[nextRow + x] += quantError;
        if (x + 1 < width) {
          luminanceBuffer[nextRow + x + 1] += quantError;
        }
      }
      if (y + 2 < height) {
        luminanceBuffer[(y + 2) * width + x] += quantError;
      }
    }
  }

  return blackPixels;
}
