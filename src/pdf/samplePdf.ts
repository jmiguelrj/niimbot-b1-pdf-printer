export const SAMPLE_PDF_FILENAME_EN = "calibration-50x50mm.pdf";
export const SAMPLE_PDF_FILENAME_PT = "calibracao-50x50mm.pdf";

function escapePdfString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildSampleContentStream(): string {
  const cmds: string[] = [];

  // Crisp pure-white base and 1 mm (2.835 pt) safe-margin frame + corner registration ticks
  cmds.push("1 1 1 rg");
  cmds.push("0 0 141.732 141.732 re f");
  cmds.push("0 0 0 RG 0.45 w");
  cmds.push("4 4 133.732 133.732 re S");
  cmds.push("0.8 w");
  cmds.push("4 14 m 4 4 l 14 4 l S");
  cmds.push("127.732 4 m 137.732 4 l 137.732 14 l S");
  cmds.push("4 127.732 m 4 137.732 l 14 137.732 l S");
  cmds.push("127.732 137.732 m 137.732 137.732 l 137.732 127.732 l S");

  // Top inverted black header banner
  cmds.push("0 0 0 rg");
  cmds.push("8 115.5 125.732 17 re f");
  cmds.push("1 1 1 rg");
  cmds.push(`BT /F1 7.6 Tf 12 125.2 Td (${escapePdfString("LABEL STUDIO · 50x50mm")}) Tj ET`);
  cmds.push(
    `BT /F2 5.4 Tf 12 118.4 Td (${escapePdfString("384x400px @ 203 DPI CALIBRATION")}) Tj ET`,
  );

  // Left vector QR-style 3-corner finder + data module checkerboard (44x44 pt)
  cmds.push("0 0 0 rg 0 0 0 RG");
  const drawFinder = (fx: number, fy: number) => {
    cmds.push(`${fx} ${fy} 13 13 re f`);
    cmds.push(`1 1 1 rg ${fx + 2} ${fy + 2} 9 9 re f`);
    cmds.push(`0 0 0 rg ${fx + 4} ${fy + 4} 5 5 re f`);
  };
  drawFinder(10, 83);
  drawFinder(41, 83);
  drawFinder(10, 52);

  // Inner micro-modules to test 1-bit edge sharpness vs bleed
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const inTopLeft = row >= 6 && col <= 3;
      const inTopRight = row >= 6 && col >= 6;
      const inBottomLeft = row <= 3 && col <= 3;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      if ((row * 7 + col * 11 + row * col) % 2 === 0) {
        const mx = 10 + col * 4.4;
        const my = 52 + row * 4.4;
        cmds.push(`${mx.toFixed(2)} ${my.toFixed(2)} 3.6 3.6 re f`);
      }
    }
  }

  // Right barcode bars + technical hardware spec text
  const barWidths = [1.8, 0.9, 2.7, 0.9, 1.8, 3.2, 0.9, 1.6, 2.4, 0.9, 1.8, 1.1, 2.8, 0.9, 2.0];
  let bx = 62;
  for (let i = 0; i < barWidths.length; i++) {
    const w = barWidths[i];
    if (i % 2 === 0) {
      cmds.push(`${bx.toFixed(2)} 70 0 0 re`);
      cmds.pop();
      cmds.push(`${bx.toFixed(2)} 70.5 ${w.toFixed(2)} 25.5 re f`);
    }
    bx += w + 1.45;
  }
  cmds.push(`BT /F2 5.4 Tf 62 62 Td (${escapePdfString("VID_3513  WITHGAPS=1")}) Tj ET`);
  cmds.push(`BT /F2 5.2 Tf 62 54 Td (${escapePdfString("THRESHOLD vs ATKINSON")}) Tj ET`);

  // Horizontal divider rule
  cmds.push("0.55 w 8 46.5 m 133.732 46.5 l S");

  // Stepped 5-level grayscale ramp (15% -> 100%) to showcase Threshold vs Atkinson Dithering
  cmds.push(
    `BT /F1 5.2 Tf 10 38.8 Td (${escapePdfString("DITHER RAMP: 15%   35%   55%   75%  100%")}) Tj ET`,
  );
  const shades = [0.85, 0.65, 0.45, 0.25, 0.0];
  for (let i = 0; i < shades.length; i++) {
    const sx = 10 + i * 24.7;
    cmds.push(`${shades[i].toFixed(2)} g ${sx.toFixed(2)} 19.5 22.8 15 re f`);
    cmds.push(`0 0 0 RG 0.45 w ${sx.toFixed(2)} 19.5 22.8 15 re S`);
  }

  // Bottom footer bar
  cmds.push("0 0 0 rg");
  cmds.push(
    `BT /F2 5.0 Tf 10 9.5 Td (${escapePdfString("ZERO-DRIVER WEBSERIAL & BLE  LOCAL PWA")}) Tj ET`,
  );

  return cmds.join("\n");
}

/**
 * Generates a self-contained 1-page 50x50 mm (141.732x141.732 pt) %PDF-1.4
 * calibration & dithering test label without any external dependencies.
 */
export function createSample50x50PdfBytes(): Uint8Array {
  const encoder = new TextEncoder();
  const contentStream = buildSampleContentStream();
  const contentByteLength = encoder.encode(contentStream).byteLength;

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 141.732 141.732] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${contentByteLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  const header = "%PDF-1.4\n";
  let runningOffset = encoder.encode(header).byteLength;
  const offsets: number[] = [];

  const chunks: string[] = [header];
  for (const obj of objects) {
    offsets.push(runningOffset);
    chunks.push(obj);
    runningOffset += encoder.encode(obj).byteLength;
  }

  const xrefOffset = runningOffset;
  const xrefLines = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.map((off) => `${String(off).padStart(10, "0")} 00000 n \n`),
  ];
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(...xrefLines, trailer);
  return encoder.encode(chunks.join(""));
}
