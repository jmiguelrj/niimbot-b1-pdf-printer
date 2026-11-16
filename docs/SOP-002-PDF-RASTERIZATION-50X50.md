# SOP-002: 50×50 mm PDF Rasterization & 1-Bit Preview (`niimbot-b1-pdf-printer`)

## 1. Prerequisites
- **Completed SOP-001** environment (`C:\repos\Niimbot\niimbot-b1-pdf-printer`, Node `v24.13.0`, npm `11.8.0`, pinned `@mmote/niimbluelib@0.49.1` and `pdfjs-dist@6.5.438`).
- **Git Branch**: `feat/pdf-raster-engine`.
- **Target Thermal Geometry**:
  - Niimbot B1 **203 DPI** (`8 dots/mm`) thermal head: **384 px** active print width (`48 mm`), leaving **8 px (`1 mm`)** unprintable bleed margin on each side of a **50×50 mm (`400×400 px`)** gap label roll.
  - `ImageEncoder.encodeCanvas(canvas, PageColorType.SingleColor, "top")` (`printDirection = "top"`).
- **Security Policy**: PDF.js worker loaded locally from `pdfjs-dist/build/pdf.worker.min.mjs?url`; `enableScripting: false` and `enableXfa: false` enforced on document load.

---

## 2. Execution Steps
Run from PowerShell inside `C:\repos\Niimbot\niimbot-b1-pdf-printer`:

1. **Run strict TypeScript verification (zero errors, zero `any`)**:
   ```powershell
   Set-Location C:\repos\Niimbot\niimbot-b1-pdf-printer
   npx tsc --noEmit
   ```

2. **Run geometry and 1-bit binarization unit tests**:
   ```powershell
   node --test tests/binarizer.test.ts
   ```

3. **Run Vite production build to verify offline worker bundling**:
   ```powershell
   npm run build
   ```

4. **Launch local dev server for visual 50×50 mm label verification**:
   ```powershell
   npm run dev
   ```
   - Open `http://localhost:5173` in Chrome or Edge.
   - Drop or select a 50×50 mm PDF label.
   - Verify source PDF size detection (`50.0×50.0 mm`), toggle between **Scale to Fit (`384×400 px - Safe`)** and **1:1 Physical Crop (`Trim 1mm side bleed`)**, and compare **Sharp Threshold** (`160`) vs. **Atkinson Dither** modes.

---

## 3. Expected Output
- `npx tsc --noEmit` exits with **code `0`**.
- `node --test tests/binarizer.test.ts` passes **3/3 tests**, confirming:
  - `~141.73 × 141.73 pt` (50×50 mm) maps to `384×400 px` output in both `"fit"` and `"crop-bleed"` modes.
  - Both `"threshold"` and `"atkinson"` produce strictly binary `#000000` / `#FFFFFF` (`R === G === B`, value in `{0, 255}`, `A === 255`) pixels with transparent pixels composited onto `#FFFFFF`.
- `npm run build` completes cleanly and emits `dist/assets/pdf.worker.min-*.mjs` with zero missing asset errors.
- Each preview card in the browser displays `Canvas: 384×400 px (1-bit)` and `ImageEncoder: 384×400 · <N> packets`.

---

## 4. Rollback
To discard or revert `feat/pdf-raster-engine` back to `feat/init-architecture` (inside `C:\repos\Niimbot\niimbot-b1-pdf-printer`):
```powershell
git checkout feat/init-architecture
git branch -D feat/pdf-raster-engine
```

If `feat/pdf-raster-engine` was pushed to `origin` and must be removed remotely:
```powershell
git push origin --delete feat/pdf-raster-engine
```
