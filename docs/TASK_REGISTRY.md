# Task Registry — `niimbot-b1-pdf-printer`

| Task ID | Status | Summary | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Task #1** | `COMPLETED` | Read-only local Windows 11 ARM64 environment & Niimbot B1 USB/COM hardware audit | OS `Arm64`, Node `v24.13.0`, npm `11.8.0`, Git `2.56.0.windows.2`; Niimbot B1 `Status = OK` on `COM9` (`USB\VID_3513&PID_0002&MI_00`), composite `USB\VID_3513&PID_0002\B1-I30707173`, printer interface `MI_02`; zero files modified |
| **Task #2** | `COMPLETED` | Vite + TypeScript repo scaffold, security-pinned deps, `@mmote/niimbluelib` TypeScript signature audit, SOP-001 & Git/GitHub setup | Pinned `@mmote/niimbluelib@0.49.1` & `pdfjs-dist@6.5.438` (`>= 6.2.108`, CVE-2026-16633 patched; `enableScripting: false` policy); `npx tsc --noEmit` exits `0`; `docs/SOP-001-ENVIRONMENT-AND-SETUP.md` created; Git branch `feat/init-architecture` committed |
| **Task #3** | `COMPLETED` | 50×50 mm PDF-to-384×400 px thermal rasterization engine, 1-bit binarization (Threshold & Atkinson), `ImageEncoder` validation & live preview UI | `src/pdf/binarizer.ts`, `src/pdf/rasterizer.ts`, `src/main.ts`, `tests/binarizer.test.ts`; `npx tsc --noEmit` exits `0`; `npm run build` bundles `pdf.worker.min.mjs`; 3/3 unit tests pass; `docs/SOP-002-PDF-RASTERIZATION-50X50.md` created on `feat/pdf-raster-engine` |
| **Task #4** | `COMPLETED` | Niimbot B1 WebSerial (`COM9`) / WebBluetooth transport, RFID & heartbeat telemetry, `WithGaps=1` calibration & single-sticker print state machine | `src/printer/b1Client.ts`, `src/printer/web-hardware.d.ts`, `tests/b1Client.test.ts`, live Hardware Panel & Protocol Log UI; `npx tsc --noEmit` exits `0`; `npm run build` exits `0`; 7/7 unit tests pass; `docs/SOP-003-B1-USB-BLE-GAP-PRINTING.md` created on `feat/b1-hardware-transport` |
| **Task #5** | `COMPLETED` | Multi-PC x64/ARM64 dynamic USB + Windows BLE pacing hardening, multi-page PDF batch printing (`AbortController`), zero-dependency Offline PWA (`sw.js` + `manifest.webmanifest`), GitHub Pages HTTPS CI/CD & merge to `main` | `vite.config.ts` (`base: "./"`), `public/manifest.webmanifest`, `public/pwa-icon.svg`, `.github/workflows/deploy-pages.yml`, `docs/SOP-004-MULTI-PC-AND-BLUETOOTH-DEPLOYMENT.md`; `npx tsc --noEmit` exits `0`; `npm run build` emits `dist/sw.js` (0 npm vulns); 10/10 unit tests pass; merged to `main` |
| **Task #6** | `COMPLETED` | Read-only security, public-repo readiness & proxy routing discovery audit | `npm audit` 0 vulns; identified missing `LICENSE`, `appRoot.innerHTML`, unbounded PDF size/pages, and missing CSP; confirmed production reverse proxy routing requirements with zero local/remote mutations |
| **Task #7** | `COMPLETED` | Security hardening, MIT `LICENSE`, `--nb-*` design tokens (`src/tokens.css`), `@biomejs/biome`, `scripts/verify-guardrails.mjs`, `CLAUDE.md`, `.antigravityrules`, pre-commit hook & CI gate | `npm audit` 0 vulns; `npm run check` (Biome + `tsc` + `verify:guardrails` + 13/13 tests) exits `0`; `npm run build` exits `0`; `docs/SOP-005-SECURITY-AND-AGENTIC-GUARDRAILS.md` created & merged to `main` |
| **Task #8** | `COMPLETED` | Apple Cupertino Print-Center UI/UX redesign (`#FA4676` accent, Light/Auto/Dark modes & pure-DOM SVG icons) | `src/tokens.css`, `src/style.css`, `src/ui/icons.ts`, `src/main.ts`, updated PWA squircle icons/manifest; `npm audit` 0 vulns; `npm run check` (15/15 tests) & `npm run build` exit `0` |
| **Task #9** | `COMPLETED` | Public showcase `README.md`, `SOP-006` subpath reverse-proxy guide, `v1.0.0` release tag & zero-downtime `nginx:1.27-alpine` / Traefik `/labels/` production deployment | `README.md`, `docs/SOP-006-SUBPATH-REVERSE-PROXY-DEPLOYMENT.md`, `git tag v1.0.0`; `npm audit` 0 vulns; `npm run check` & `npm run build` exit `0`; `nginx:1.27-alpine` serving `/labels/` with `application/javascript` on `.mjs` + `Permissions-Policy` & zero root-app regression |
| **Task #10** | `COMPLETED` | Same-origin subpath PWA, Service Worker, CacheStorage, `localStorage` & Nginx cookie/log isolation hardening (`v1.0.1`) | `public/manifest.webmanifest` (`id`/`start_url`/`scope: "./"`), `vite.config.ts` (`niimbot-label-studio-` prefixed CacheStorage + `self.registration.scope` fetch/prune bounds), `src/main.ts` (`niimbot-label-studio:theme`, scoped SW registration), `tests/security.test.ts`; `npm audit` 0 vulns; `npm run check` (16/16 tests) & `npm run build` exit `0` |
| **Task #11** | `COMPLETED` | Live `EN` / `PT-BR` bilingual UI, interactive 5-tab Apple User Manual & Niimbot B1 studio hardware showcase (`v1.1.0`) | `src/i18n/translations.ts`, `src/ui/manualModal.ts`, `public/niimbot-b1.webp`, `src/ui/icons.ts`, `src/tokens.css`, `src/style.css`, `src/main.ts`, `tests/i18n.test.ts`, `tests/security.test.ts`; `npm audit` 0 vulns; `npm run check` & `npm run build` exit `0`; zero-downtime `nginx -s reload` serving `/labels/niimbot-b1.webp` (`image/webp`) |

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

### Task #5 — Multi-PC Portability (x64/ARM64), Windows BLE Hardening, Batch Queue & Offline PWA
- **Date**: 2026-11-16
- **Branch**: `feat/multi-pc-ble-batch-pwa` → merged into `main`
- **Verified BLE & Multi-Page Internals** (`node_modules/@mmote/niimbluelib/dist/cjs`):
  - **BLE Discovery & GATT Transport** (`bluetooth_impl.js`): Filters by service UUID `e7810a71-73ae-499d-8c15-faa9aef0c3f2` and model first-letter prefixes (`{ namePrefix: "B" }`, etc.), selecting a characteristic with `notify && writeWithoutResponse`.
  - **BLE Packet Pacing**: Bitmap row commands (`PrintBitmapRow=133`, `PrintBitmapRowIndexed=131`, `PrintEmptyRow=132`) map to `null` (`oneWay = true`) in `commands.js` and write via `writeValueWithoutResponse` after `Utils.sleep(this.packetIntervalMs)` (default `10 ms` in `abstract_client.js`). On Windows 11 BLE, `B1PrinterController` sets `setPacketInterval(20)` (`20 ms`), `pageTimeoutMs = 30000`, and `statusPollIntervalMs = 250` (vs. `10 ms` / `15000 ms` / `100 ms` on USB Serial) to prevent 58-byte `PrintBitmapRow` GATT buffer drops before `PageEnd` (`cmd 227`).
  - **Multi-Page `B1PrintTask` Loop**: `B1PrintTask.printInit()` sends `printStart7b(totalPages)` once; `B1PrintTask` inherits `AbstractPrintTask.waitForPageFinished()` (`Promise.resolve()`) and holds label stock at the printhead between pages until `totalPages` completes (or `printEnd()` terminates early on `AbortController` cancellation).
  - **Dependency Hygiene**: Audited `vite-plugin-pwa@2.0.0`, which introduced 322 transitive packages and 6 moderate/low advisories (`glob@11.1.0`, `minimatch`, `deepmerge`). Removed it in favor of a clean zero-dependency `offlinePwaPlugin()` in `vite.config.ts` (`0` npm vulnerabilities, `29` total packages).

### Task #6 — Read-Only Security & Public-Repo Readiness Audit
- **Date**: 2026-11-16
- **Findings**:
  - `npm audit` clean (`0` vulnerabilities); zero secrets or internal IPs in tracked files.
  - Gaps identified: missing root `LICENSE`, `appRoot.innerHTML` shell construction in `src/main.ts`, missing `MAX_PDF_BYTES` / `MAX_PDF_PAGES` / `%PDF-` header checks, and missing `Content-Security-Policy` meta tag in `index.html`.
  - Reverse proxy discovery confirmed root `/` is occupied by an existing host application, making subpath/static container mounting or GitHub Pages HTTPS the cleanest zero-collision deployment path.

### Task #7 — Security Hardening & Genki-Style Engineering Guardrails
- **Date**: 2026-11-16
- **Branch**: `feat/security-and-guardrails` → merged into `main`
- **Hardening & Tooling**:
  - Added root MIT `LICENSE` for public open-source readiness.
  - Eliminated `innerHTML` and inline `.style.*` mutations in `src/main.ts` using typed `document.createElement` builders, `.is-hidden` class toggles, and native `<progress>` bar.
  - Added `src/pdf/validation.ts` (`MAX_PDF_BYTES = 25 MB`, `MAX_PDF_PAGES = 100`, `%PDF-` magic-header validation) and strict CSP `<meta>` tag in `index.html`.
  - Extracted canonical `--nb-*` CSS custom properties into `src/tokens.css` (with dark-mode support via `prefers-color-scheme: dark` and `[data-theme="dark"]`), refactoring `src/style.css` to 100% `var(--nb-*)` token consumption.
  - Installed `@biomejs/biome@2.6.8` (`noExplicitAny: "error"`, `noDangerouslySetInnerHtml: "error"`), `scripts/verify-guardrails.mjs`, `CLAUDE.md`, `.antigravityrules`, `.githooks/pre-commit`, and `.github/workflows/ci.yml`.

### Task #8 — Apple Cupertino Print-Center UI/UX Redesign (`#FA4676`)
- **Date**: 2026-11-16
- **Branch**: `feat/apple-cupertino-ui` → merged into `main`
- **Design & Engineering**:
  - Updated `src/tokens.css` with Apple HIG Light/Pro Dark palettes (`#F5F5F7` / `#0B0B0D`), frosted vibrancy glass (`--nb-glass-blur: 24px`), concentric squircle radii, spring easing, and `#FA4676` primary brand accent (`theme_color` synced in `public/manifest.webmanifest`, `index.html`, `public/pwa-icon.svg`, and `public/favicon.svg`).
- Added pure-DOM SF-Symbol-inspired SVG factory `src/ui/icons.ts` using `document.createElementNS` (zero `innerHTML`, space-separated SVG path coordinates).
  - Refactored `src/main.ts` and `src/style.css` into a sticky frosted topbar with Light/Auto/Dark segmented control (`localStorage`-persisted via `document.documentElement.dataset.theme`), sticky inspector sidebar with Apple segmented controls & `#FA4676` sliders/stepper, tactile PDF dropzone hero, sticky batch toolbar, and 50×50 mm silicone release-liner sticker preview cards with toggleable 1 mm bleed guides.

### Task #9 — v1.0.0 Release Documentation & Subpath Reverse-Proxy Production Deployment
- **Date**: 2026-11-16
- **Branch & Tag**: `feat/release-v1-docs` → merged into `main`, tagged `v1.0.0`
- **Public-Repo & Deployment Architecture**:
  - Created portfolio-grade root `README.md` documenting ARM64 Snapdragon + x64 driverless WebSerial/WebBluetooth architecture, `384×400 px` 203 DPI thermal rasterization, `#FA4676` Apple Cupertino UI, security/token guardrails, local quickstart, and generic `/labels/` subpath reverse-proxy hosting snippets.
  - Created `docs/SOP-006-SUBPATH-REVERSE-PROXY-DEPLOYMENT.md` following the 4-section SOP format (`Prerequisites`, `Execution Steps`, `Expected Output`, `Rollback`) with sanitized generic placeholders (`app.example.com`, `deploy@proxy.example.com`).
  - Deployed isolated `nginx:1.27-alpine` static container (`read_only: true`, `tmpfs` scratch paths, explicit `.mjs` → `application/javascript` & `.webmanifest` → `application/manifest+json` MIME types, `Permissions-Policy: serial=(self), bluetooth=(self), usb=(self)...`, `Content-Security-Policy`, and `no-cache` vs `immutable` cache headers) behind Traefik v3 (`/labels` → `/labels/` redirect prior to `stripprefix`, `priority=200`) with zero impact on root host applications.

### Task #10 — Same-Origin Subpath PWA & Storage Isolation (`v1.0.1`)
- **Date**: 2026-11-16
- **Branch & Tag**: `fix/subpath-pwa-isolation` → merged into `main`, tagged `v1.0.1`
- **Isolation Controls**:
  - Updated `public/manifest.webmanifest` with explicit `"id": "./"`, `"start_url": "./"`, and `"scope": "./"` so browsers install the subpath app independently from any root PWA on the same origin.
  - Hardened `offlinePwaPlugin()` in `vite.config.ts` with `CACHE_PREFIX = "niimbot-label-studio-"` cache pruning (`k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME`) so activation never evicts sibling app caches on the shared origin, plus strict `self.registration.scope` filtering inside `fetch`.
  - Updated `src/main.ts` to use `niimbot-label-studio:theme` for `localStorage` persistence and register `./sw.js` with `{ scope: "./" }`.
  - Updated production static Nginx config with header-free `static_minimal` access logging (ignoring cookies/query strings, zero `Set-Cookie` emission).

### Task #11 — Bilingual `EN`/`PT-BR` UI, Interactive Manual & B1 Hardware Showcase (`v1.1.0`)
- **Date**: 2026-11-16
- **Branch & Tag**: `feat/pt-br-manual-printer-visual` → merged into `main`, tagged `v1.1.0`
- **Features & Verification**:
  - Added strictly typed zero-dependency `en` / `pt-BR` dictionary (`src/i18n/translations.ts`, `niimbot-label-studio:locale`, `navigator.language` auto-detection) with in-place UI translation preserving active USB/BLE sessions and rendered PDF previews.
  - Added Apple macOS Help / Tips `<dialog>` sheet (`src/ui/manualModal.ts`) accessible from topbar `Manual` / `Ajuda` button and printer showcase pod link, covering Quick Start, Hardware & LEDs (`./niimbot-b1.webp`), USB-C & Bluetooth BLE pairing on Windows, 1-Bit Quality & Gap Calibration, and PWA Install.
  - Integrated `./niimbot-b1.webp` inside `.device-showcase-pod` (consistent `#FFFFFF` studio pedestal in Light & Dark modes with live ready/busy status ring) and added precaching (`niimbot-label-studio-v1.1.0-*`) + unit test parity enforcement (`tests/i18n.test.ts` + `tests/security.test.ts`).

---

## Final v1.1.0 Environment & Architecture State Summary
- **Supported Client Hosts**: Any Windows 10/11 PC (**x86_64 Intel/AMD** and **ARM64 Snapdragon**) running Microsoft Edge or Google Chrome (`>= 117`) over `https://` or `http://localhost` — **zero custom USB drivers** (`usbser.sys` built-in for `VID_3513&PID_0002` on dynamic COM ports) and **zero Node.js required** via installable Offline PWA.
- **Raster Pipeline**: Offline `pdfjs-dist@6.5.438` worker (`enableScripting: false`, `enableXfa: false`, `MAX_PDF_BYTES = 25 MB`, `MAX_PDF_PAGES = 100`, `%PDF-` header check) → 4× supersampled white-composited render → `384×400 px` (203 DPI, 48 mm active head + 1 mm side margins) → 1-bit Threshold or Atkinson dithering → `ImageEncoder.encodeCanvas(..., PageColorType.SingleColor, "top")`.
- **Hardware & Batch Engine**: `@mmote/niimbluelib@0.49.1` dual WebSerial + WebBluetooth controller with `LabelType.WithGaps = 1` default, 1-sticker zero-heat gap alignment feed, `0x8E` optical calibration, `20 ms` Windows BLE GATT pacing (`30 s` page timeout), multi-page batch queue with per-page selection, and safe `Stop After Current Sticker` (`AbortController` → `printEnd()`).
- **UI, Bilingual i18n, Guardrails & Hosting**: Apple Cupertino Print-Center **Label Studio** (`#FA4676`, live `EN`/`PT-BR` i18n in `src/i18n/translations.ts`, 5-tab interactive Manual in `src/ui/manualModal.ts`, `./niimbot-b1.webp` device showcase pod, `niimbot-label-studio:` namespaced `localStorage`, `--nb-*` tokens in `src/tokens.css`, pure-DOM SVG icons, strict CSP), Biome + `scripts/verify-guardrails.mjs` + `.githooks/pre-commit` + GitHub Actions CI, and hardened `nginx:1.27-alpine` / Traefik v3 subpath static PWA hosting (`base: "./"`, scoped `sw.js`).
