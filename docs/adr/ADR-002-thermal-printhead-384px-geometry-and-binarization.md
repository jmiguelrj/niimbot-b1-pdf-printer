# ADR-002: 384×400 px Thermal Printhead Geometry, 4× Supersampling & Dual 1-Bit Binarizers

- **Status**: Accepted (`v1.0.0` — `v1.2.0`)
- **Date**: 2026-11-16
- **Context**: While die-cut B1 label stock measures **50×50 mm** (`400×400 px` at `203 DPI` / `8 dots/mm`), hardware metadata inside `@mmote/niimbluelib` (`PrinterModel.B1`) establishes that the physical ceramic thermal printhead spans only **384 pixels (`48 mm`)** (`printDirection: "top"`). Sending unaligned `400 px` buffers or relying on OS print-spooler dithering truncates edges, triggers firmware image errors, or introduces blurry halftone noise into micro QR codes.

## Decision
1. **Strict `384 × 400 px` Output Contract**: Lock `B1_PRINTHEAD_PX = 384` and `LABEL_HEIGHT_PX = 400` in `src/pdf/binarizer.ts`, enforced by a pre-print runtime dimension guard in `B1PrinterController`. Render `48 mm` of active print content centered inside `50 mm` physical stock (`1 mm` / `8 px` non-printable margin per side), supporting both **`fit`** (zero edge clipping) and **`crop-bleed`** (1:1 symmetric `8 px` trim) modes, plus preview liner bleed guides.
2. **4× Supersampled White Compositing**: Render PDF pages in an isolated `pdfjs-dist` worker onto pure `#FFFFFF` at `4×` target resolution (`scale * 4`) before high-quality canvas downsampling, avoiding transparent-alpha artifacts (which otherwise binarize as solid black!).
3. **Dual 1-Bit Engines**:
   - **Sharp Threshold** (`0x00`/`0xFF` luminance cutoff, default `160`): Zero-speckle binary edges optimized for QR codes, barcodes, and typography.
   - **Atkinson Error-Diffusion Dithering**: Clean high-contrast dither matrix (`1/8` weight × 6 neighbors, preserving pure highlights/shadows better than Floyd-Steinberg) for logos and raster illustrations.

## Consequences
- **Positive**: Guaranteed pixel-for-pixel `cols === 384, rows === 400` compliance with `ImageEncoder.encodeCanvas(..., PageColorType.SingleColor, "top")`, crisp scannable QR codes, and real-time visual preview matching physical thermal output.
- **Negative / Mitigations**: Content extending into the outer `1 mm` left/right edges cannot be energized by the `48 mm` physical head; both the UI preview bleed stripes and interactive Hardware Manual highlight this boundary clearly.
