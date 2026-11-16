# Task Registry — `niimbot-b1-pdf-printer`

| Task ID | Status | Summary | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Task #1** | `COMPLETED` | Read-only local Windows 11 ARM64 environment & Niimbot B1 USB/COM hardware audit | OS `Arm64`, Node `v24.13.0`, npm `11.8.0`, Git `2.56.0.windows.2`; Niimbot B1 `Status = OK` on `COM9` (`USB\VID_3513&PID_0002&MI_00`), composite `USB\VID_3513&PID_0002\B1-I30707173`, printer interface `MI_02`; zero files modified |
| **Task #2** | `COMPLETED` | Vite + TypeScript repo scaffold, security-pinned deps, `@mmote/niimbluelib` TypeScript signature audit, SOP-001 & Git/GitHub setup | Pinned `@mmote/niimbluelib@0.49.1` & `pdfjs-dist@6.5.438` (`>= 6.2.108`, CVE-2026-16633 patched; `enableScripting: false` policy); `npx tsc --noEmit` exits `0`; `docs/SOP-001-ENVIRONMENT-AND-SETUP.md` created; Git branch `feat/init-architecture` committed |

---

## Task Details

### Task #1 — Hardware & Environment Audit (Read-Only)
- **Date**: 2026-11-16
- **Host**: Local Windows 11 ARM64 (`Arm64`)
- **Toolchain**:
  - Node.js: `v24.13.0`
  - npm: `11.8.0`
  - Git: `git version 2.56.0.windows.2`
- **Hardware Enumeration**:
  - Composite USB device: `USB\VID_3513&PID_0002\B1-I30707173` (`Status = OK`)
  - USB Serial Device (`Ports`): `COM9` — `USB\VID_3513&PID_0002&MI_00\5&D7C70F6&0&0000` (`Status = OK`)
  - USB Printer / SoftwareDevice: `NIIMBOT  B1` — `USB\VID_3513&PID_0002&MI_02\5&D7C70F6&0&0002` & `USBPRINT\NIIMBOT_B1\6&3B585F84&0&USB002` (`Status = OK`)

### Task #2 — Repository Initialization & API Signature Verification
- **Date**: 2026-11-16
- **Dependencies Pinned** (`package.json`):
  - `@mmote/niimbluelib`: `0.49.1` (exact)
  - `pdfjs-dist`: `6.5.438` (exact, `>= 6.2.108` patching CVE-2026-16633; `enableScripting: false` mandatory in PDF loader implementation)
  - `vite`: `^8.3.6`, `typescript`: `~7.0.2`
- **Verified `@mmote/niimbluelib@0.49.1` Signatures** (`node_modules/@mmote/niimbluelib/dist/cjs`):
  - **Clients**: `NiimbotSerialClient` & `NiimbotBluetoothClient` extend `NiimbotAbstractClient` (`new NiimbotSerialClient()`, `new NiimbotBluetoothClient()`). Methods: `connect(options?)`, `disconnect()`, `isConnected()`. Tasks are created via `client.protocol.newPrintTask("B1", options)` (`NiimbotProtocol`).
  - **`LabelType`**: `LabelType.WithGaps = 1`.
  - **`B1PrintTask`**: Created via `client.protocol.newPrintTask("B1", options?: Partial<PrintOptions>)`. `PrintOptions` includes `labelType`, `density`, `totalPages`, `statusPollIntervalMs`, `statusTimeoutMs`, `pageTimeoutMs`, `speed`, `pageColor`, `halfCut`, `tubeWidthMm`, `cutType`, `cutHeight`, `tubeType`. Lifecycle: `printInit()`, `printPage(image, quantity?)`, `waitForPageFinished()`, `waitForFinished()`, `printEnd()`.
  - **`ImageEncoder.encodeCanvas`**: `ImageEncoder.encodeCanvas(canvas: HTMLCanvasElement, pageColor: PageColorType, printDirection: PrintDirection): EncodedImage` where `PrintDirection = "left" | "top"`.
  - **B1 Model Metadata** (`printer_models.js`): `model: PrinterModel.B1`, `id: [4096]`, `dpi: 203`, `printDirection: "top"`, `printheadPixels: 384`, `paperTypes: [1, 2, 5]`, `densityMin: 1`, `densityMax: 5`, `densityDefault: 3`.
