# Task Registry — `niimbot-b1-pdf-printer`

| Task ID | Status | Summary | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Task #1** | `COMPLETED` | Read-only local Windows 11 ARM64 environment & Niimbot B1 USB/COM hardware audit | OS `Arm64`, Node `v24.13.0`, npm `11.8.0`, Git `2.56.0.windows.2`; Niimbot B1 `Status = OK` on `COM9` (`USB\VID_3513&PID_0002&MI_00`), composite `USB\VID_3513&PID_0002\B1-I30707173`, printer interface `MI_02`; zero files modified |
| **Task #2** | `COMPLETED` | Vite + TypeScript repo scaffold, security-pinned deps, `@mmote/niimbluelib` TypeScript signature audit, SOP-001 & Git/GitHub setup | Pinned `@mmote/niimbluelib@0.49.1` & `pdfjs-dist@6.5.438` (`>= 6.2.108`, CVE-2026-16633 patched; `enableScripting: false` policy); `npx tsc --noEmit` exits `0`; `docs/SOP-001-ENVIRONMENT-AND-SETUP.md` created; Git branch `feat/init-architecture` committed |
| **Task #3** | `COMPLETED` | 50×50 mm PDF-to-384×400 px thermal rasterization engine, 1-bit binarization (Threshold & Atkinson), `ImageEncoder` validation & live preview UI | `src/pdf/binarizer.ts`, `src/pdf/rasterizer.ts`, `src/main.ts`, `tests/binarizer.test.ts`; `npx tsc --noEmit` exits `0`; `npm run build` bundles `pdf.worker.min.mjs`; 3/3 unit tests pass; `docs/SOP-002-PDF-RASTERIZATION-50X50.md` created on `feat/pdf-raster-engine` |
| **Task #4** | `COMPLETED` | Niimbot B1 WebSerial (`COM9`) / WebBluetooth transport, RFID & heartbeat telemetry, `WithGaps=1` calibration & single-sticker print state machine | `src/printer/b1Client.ts`, `src/printer/web-hardware.d.ts`, `tests/b1Client.test.ts`, live Hardware Panel & Protocol Log UI; `npx tsc --noEmit` exits `0`; `npm run build` exits `0`; 7/7 unit tests pass; `docs/SOP-003-B1-USB-BLE-GAP-PRINTING.md` created on `feat/b1-hardware-transport` |

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

### Task #3 — 50×50 mm PDF Rasterization Engine & Preview UI
- **Date**: 2026-11-16
- **Branch**: `feat/pdf-raster-engine`
- **Verified `@mmote/niimbluelib@0.49.1` `PageColorType` & `EncodedImage` Types**:
  - `PageColorType` (`enumerations.d.ts`): `SingleColor = 0`, `DoubleColor = 1`, `SingleColorAlt = 2`, `Grayscale = 3`. `B1PrintTask.isSupportColor()` accepts `SingleColor` (`0`) and `DoubleColor` (`1`).
  - `EncodedImage` (`image_encoder.d.ts`): `{ pageColor: PageColorType; cols: number; rows: number; rowsData: ImageRow[] }`, where `ImageEncoder.encodeCanvas(outputCanvas, PageColorType.SingleColor, "top")` yields `cols: 384`, `rows: 400`.
- **Verified `pdfjs-dist@6.5.438` API Notes**:
  - Worker bundled locally via `import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"` → `GlobalWorkerOptions.workerSrc = pdfWorkerUrl`.
  - `DocumentInitParameters` omits `isEvalSupported` (removed in 6.5.x) and `enableScripting`; `enableXfa: false` and `enableScripting: false` are enforced via `SecureDocumentInitParameters` without `any` or type casts. `RenderParameters` requires `canvas` explicitly.
- **Implementation**:
  - `src/pdf/binarizer.ts`: Pure geometry (`fit` vs. `crop-bleed`, `0/90/180/270` rotation) and 1-bit binarization (`threshold` default `160`, `atkinson` error diffusion, white `#FFFFFF` alpha compositing, `invert` option).
  - `src/pdf/rasterizer.ts`: 4× supersampled PDF.js rendering onto `#FFFFFF`, downsampling to strict `384×400` px `HTMLCanvasElement`, 1-bit binarization, and `ImageEncoder.encodeCanvas(..., PageColorType.SingleColor, "top")` validation.
  - `src/main.ts`, `src/style.css`, `index.html`: Operator UI with drag/drop `.pdf` input, live controls, 50×50 mm sticker preview cards with dashed 1 mm unprintable side margin guides, and Task #4 transport placeholder (`USB COM9 / BLE`).

### Task #4 — Niimbot B1 Hardware Transport, Optical Gap Calibration & Single-Sticker Printing
- **Date**: 2026-11-16
- **Branch**: `feat/b1-hardware-transport`
- **Verified `@mmote/niimbluelib@0.49.1` Runtime Protocol Findings** (`node_modules/@mmote/niimbluelib/dist/cjs`):
  - **Protocol Namespace**: High-level packet helpers reside on `client.protocol` (`NiimbotProtocol`), while `NiimbotAbstractClient` exposes `fetchPrinterInfo()`, `fetchRfidInfo()`, and `fetchHeartbeatData()`.
  - **`B1PrintTask` Packet Sequence** (`print_tasks/B1PrintTask.js`):
    1. `printInit()` sends `SetDensity(33)` → `SetLabelType(35)` (`this.printOptions.labelType`, automatically enforcing `LabelType.WithGaps = 1`) → `PrintStart(1)` (`printStart7b(totalPages, pageColor)`).
    2. `printPage(image, quantity)` sends `PageStart(3)` → `SetPageSize(19)` (`setPageSize6b(rows=400, cols=384, copies)`) → `writeImageData` (`PrintEmptyRow=132`, `PrintBitmapRowIndexed=131` for `<=6` black dots, `PrintBitmapRow=133` for `>6` dots) → `PageEnd(227)`.
    3. `waitForFinished()` polls `PrintStatus(163)` via `waitUntilPrintFinishedByStatusPoll(totalPages, statusPollIntervalMs)` until `status.page === totalPages`.
    4. `printEnd()` cancels status polling and sends `PrintEnd(243)`.
  - **RFID & Heartbeat Behavior** (`client/abstract_client.js`):
    - `client.fetchRfidInfo()` wraps `protocol.rfidInfo()` (`0x1A`), `protocol.getPaperInfo()` (`0x59`), and `protocol.rfidInfo2()` (`0x1C`) in internal `try/catch` blocks so non-RFID third-party 50×50 mm rolls never throw (`labelRfidInfo?.tagPresent === false`).
    - `client.fetchHeartbeatData()` calls `protocol.heartbeat()` (`HeartbeatType.Advanced1` or `Advanced2` for protocol >= 3), updating `batteryPercents`, `lidClosed`, and `paperInserted`. Background 2000 ms heartbeat timer is paused (`stopHeartbeat()`) during `printSingleLabel` and `calibrateGapSensor` and resumed in `finally` to avoid packet interleaving.
  - **Gap Calibration vs. 1-Sticker Gap Feed** (`packets/protocol.js`):
    - `client.protocol.labelPositioningCalibration(value)` (`RequestCommandId.LabelPositioningCalibration = 142 / 0x8E`, `1` for gap, `2` for black mark) performs factory optical sensor voltage calibration on B1, feeding ~15 cm (~2–3 labels).
    - `B1PrinterController` exposes both `calibrateGapSensor()` (`SetLabelType` + `0x8E`) and `feedBlankToGap()` (1-page all-void `384×400` zero-heat `B1PrintTask`) so operators can align 1 sticker to the tear bar without wasting 3 labels.
- **Implementation**:
  - `src/printer/web-hardware.d.ts`: Strict W3C WebSerial & WebBluetooth interfaces (zero `any`).
  - `src/printer/b1Client.ts`: `B1PrinterController` with `VID_3513:PID_0002` (`COM9`) USB filtering, `beforeunload` port cleanup, strict `384×400` pre-print dimension guard, `try/catch/finally` guaranteed `printEnd()`, and structured protocol log emitter.
  - `tests/b1Client.test.ts`: 4 deterministic state-machine unit tests (dimension guard, `WithGaps=1` lifecycle order, mid-print timeout `printEnd()` recovery without deadlock, and `0x8E` calibration sequence).
