export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB safety limit
export const MAX_PDF_PAGES = 100;
const PDF_MAGIC_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d] as const; // %PDF-

export function validatePdfBytes(pdfBytes: Uint8Array): void {
  if (pdfBytes.byteLength === 0) {
    throw new Error("PDF file is empty (0 bytes).");
  }
  if (pdfBytes.byteLength > MAX_PDF_BYTES) {
    throw new Error(
      `PDF file size (${(pdfBytes.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB safety limit.`,
    );
  }
  if (
    pdfBytes.byteLength < PDF_MAGIC_HEADER.length ||
    PDF_MAGIC_HEADER.some((byte, idx) => pdfBytes[idx] !== byte)
  ) {
    throw new Error("Invalid PDF file: missing %PDF- magic header.");
  }
}

export function validatePdfPageCount(numPages: number): void {
  if (numPages < 1 || numPages > MAX_PDF_PAGES) {
    throw new Error(
      `PDF contains ${numPages} pages, exceeding the maximum allowed limit of ${MAX_PDF_PAGES} pages.`,
    );
  }
}
