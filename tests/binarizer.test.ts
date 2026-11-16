import assert from "node:assert/strict";
import test from "node:test";
import {
  binarizeRgbaBuffer,
  computeRasterGeometry,
  isApproximately50x50Mm,
  LABEL_HEIGHT_PX,
  LABEL_WIDTH_PX,
  pointsToMillimeters,
} from "../src/pdf/binarizer.ts";

test("50x50 mm PDF points convert accurately and pass 50x50 mm check", () => {
  const pt50mm = (50 * 72) / 25.4; // ~141.73228 pt
  const widthMm = pointsToMillimeters(pt50mm);
  const heightMm = pointsToMillimeters(pt50mm);
  assert.ok(Math.abs(widthMm - 50) < 0.001);
  assert.equal(isApproximately50x50Mm(widthMm, heightMm), true);
  assert.equal(isApproximately50x50Mm(210, 297), false);
});

test("computeRasterGeometry maps 50x50 mm PDF to 384x400 px in fit and crop-bleed modes", () => {
  const pt50mm = (50 * 72) / 25.4;

  const fitGeo = computeRasterGeometry(pt50mm, pt50mm, 0, "fit");
  assert.equal(fitGeo.outputWidth, LABEL_WIDTH_PX);
  assert.equal(fitGeo.outputHeight, LABEL_HEIGHT_PX);
  assert.ok(Math.abs(fitGeo.drawWidth - 384) < 1e-6);
  assert.ok(Math.abs(fitGeo.drawHeight - 384) < 1e-6);
  assert.ok(Math.abs(fitGeo.offsetX - 0) < 1e-6);
  assert.ok(Math.abs(fitGeo.offsetY - 8) < 1e-6);

  const cropGeo = computeRasterGeometry(pt50mm, pt50mm, 0, "crop-bleed");
  assert.equal(cropGeo.outputWidth, LABEL_WIDTH_PX);
  assert.equal(cropGeo.outputHeight, LABEL_HEIGHT_PX);
  assert.ok(Math.abs(cropGeo.drawWidth - 400) < 1e-6);
  assert.ok(Math.abs(cropGeo.drawHeight - 400) < 1e-6);
  assert.ok(Math.abs(cropGeo.offsetX - -8) < 1e-6);
  assert.ok(Math.abs(cropGeo.offsetY - 0) < 1e-6);

  // Quarter-turn rotation swaps aspect ratio cleanly
  const rotGeo = computeRasterGeometry(100, 200, 90, "fit");
  assert.equal(rotGeo.outputWidth, 384);
  assert.equal(rotGeo.outputHeight, 400);
  assert.ok(rotGeo.drawWidth > rotGeo.drawHeight);
});

function createGradientBuffer(width: number, height: number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const val = Math.round(((x + y) / (width + height - 2)) * 255);
      buf[idx] = val;
      buf[idx + 1] = val;
      buf[idx + 2] = val;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

function assertStrictBinaryRgba(rgba: Uint8ClampedArray): void {
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];
    assert.equal(r, g);
    assert.equal(g, b);
    assert.ok(r === 0 || r === 255, `Expected 0 or 255, got ${r}`);
    assert.equal(a, 255);
  }
}

test("binarizeRgbaBuffer threshold and atkinson produce strict #000000/#FFFFFF pixels", () => {
  const width = 32;
  const height = 32;

  const threshBuf = createGradientBuffer(width, height);
  const threshBlack = binarizeRgbaBuffer(threshBuf, width, height, {
    ditherMode: "threshold",
    threshold: 160,
    invert: false,
  });
  assertStrictBinaryRgba(threshBuf);
  assert.ok(threshBlack > 0 && threshBlack < width * height);

  const atkinsonBuf = createGradientBuffer(width, height);
  const atkinsonBlack = binarizeRgbaBuffer(atkinsonBuf, width, height, {
    ditherMode: "atkinson",
    threshold: 160,
    invert: false,
  });
  assertStrictBinaryRgba(atkinsonBuf);
  assert.ok(atkinsonBlack > 0 && atkinsonBlack < width * height);

  // Transparent pixels must composite onto pure white (#FFFFFF), never black
  const transparentBuf = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
  const blackCount = binarizeRgbaBuffer(transparentBuf, 2, 1, {
    ditherMode: "threshold",
    threshold: 160,
    invert: false,
  });
  assert.equal(blackCount, 1);
  assert.deepEqual(Array.from(transparentBuf), [255, 255, 255, 255, 0, 0, 0, 255]);
});
