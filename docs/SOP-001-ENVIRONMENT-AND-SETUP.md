# SOP-001: Environment and Setup (`niimbot-b1-pdf-printer`)

## 1. Prerequisites
- **Operating System**: Windows 11 ARM64 (`Arm64`).
- **Runtime & Tooling**:
  - Node.js `>= 24` (verified `v24.13.0`)
  - npm `11.8.0`
  - Git `2.56.0.windows.2`
- **Browser**: Chromium-based browser (Microsoft Edge or Google Chrome) with **WebSerial** (`navigator.serial`) and **WebBluetooth** (`navigator.bluetooth`) available over `http://localhost` or HTTPS.
- **Printer Hardware**:
  - **Niimbot B1** connected via USB-C and detected in Windows Device Manager with `Status = OK`:
    - USB Serial Device (`Ports`): **`COM9`** (`USB\VID_3513&PID_0002&MI_00`)
    - Composite USB Device: `USB\VID_3513&PID_0002\B1-I30707173`
  - Loaded with a **50×50 mm thermal gap label roll** (`LabelType.WithGaps = 1`), matching the B1 **384 px** printhead width at **203 DPI** (`printDirection: "top"`, 400 px height for 50 mm at 203 DPI).

---

## 2. Execution Steps
Run all commands from PowerShell on the local Windows ARM64 machine:

1. **Navigate to the repository and install pinned dependencies**:
   ```powershell
   Set-Location C:\repos\Niimbot\niimbot-b1-pdf-printer
   npm ci
   ```
   *(If setting up from scratch before `package-lock.json` is present, run `npm install`.)*

2. **Verify `pdfjs-dist` worker assets & security posture (CVE-2026-16633)**:
   ```powershell
   Get-ChildItem .\node_modules\pdfjs-dist\build\pdf.worker*.mjs
   ```
   - Confirm `pdfjs-dist` is **`>= 6.2.108`** (pinned at `6.5.438`).
   - Confirm `pdf.worker.min.mjs` / `pdf.worker.mjs` exists in `node_modules/pdfjs-dist/build/`.
   - **Security Mandate**: All PDF loading calls using `pdfjs-dist` MUST pass `enableScripting: false` to `getDocument(...)`.

3. **Run static TypeScript verification**:
   ```powershell
   npx tsc --noEmit
   ```

4. **Launch the local Vite development server**:
   ```powershell
   npm run dev
   ```
   Open the printed `http://localhost:5173` URL in Edge or Chrome to access WebSerial / WebBluetooth APIs.

---

## 3. Expected Output
- `npm ls @mmote/niimbluelib pdfjs-dist vite typescript` lists:
  - `@mmote/niimbluelib@0.49.1`
  - `pdfjs-dist@6.5.438`
  - `vite@8.x`
  - `typescript@7.0.x`
- `npx tsc --noEmit` exits with **code `0`** and produces **zero TypeScript errors**.
- Verified `@mmote/niimbluelib` contract in `node_modules/@mmote/niimbluelib/dist/cjs`:
  - `NiimbotSerialClient` / `NiimbotBluetoothClient` → `client.protocol.newPrintTask("B1", { totalPages, labelType: LabelType.WithGaps, density })`
  - `ImageEncoder.encodeCanvas(canvas, PageColorType.SingleColor, "top")`

---

## 4. Rollback
To undo the feature branch locally (from inside `C:\repos\Niimbot\niimbot-b1-pdf-printer`):
```powershell
git checkout main
git branch -D feat/init-architecture
```

If `feat/init-architecture` was pushed to `origin` and must be removed remotely:
```powershell
git push origin --delete feat/init-architecture
```

To completely remove the scaffolded repository from `C:\repos\Niimbot`:
```powershell
Set-Location C:\repos\Niimbot
Remove-Item -Recurse -Force ./niimbot-b1-pdf-printer
```
