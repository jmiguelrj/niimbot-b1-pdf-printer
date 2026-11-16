# Label Studio — Niimbot B1 50×50 mm PDF Thermal Printer PWA

A local-first, zero-driver Progressive Web App (PWA) for printing **50×50 mm** die-cut thermal gap labels from PDFs directly to a **Niimbot B1** thermal label printer over **WebSerial (USB-C)** and **WebBluetooth (BLE)** — engineered specifically to work identically across **Windows 10/11 ARM64 (Qualcomm Snapdragon)** and **x86_64 (Intel/AMD)** machines without vendor installers or cloud uploads.

---

## Why This Exists

- **Breaks the ARM64 Driver Deadlock**: Vendor desktop drivers often fail to install or print reliably on Windows on ARM64 laptops. In modern Chromium (**Microsoft Edge** or **Google Chrome `>= 117`**), the browser communicates directly with the Niimbot B1 (`VID_3513:PID_0002`) via Windows' built-in CDC-ACM serial driver (`usbser.sys`) or over BLE GATT (`e7810a71-73ae-499d-8c15-faa9aef0c3f2`).
- **Pixel-Accurate 203 DPI Thermal Output**: Eliminates blurry OS spooler scaling and greyscale halftoning by rasterizing each PDF page client-side at 4× supersampling (`#FFFFFF` composited) and quantizing cleanly into a strict **`384 × 400 px`** 1-bit monochrome bitmap matching the B1 printhead (`48 mm` active thermal head + `1 mm` unprintable side margins × `50 mm` feed height).
- **Zero-Cloud Privacy & Offline PWA**: PDFs are parsed locally in a bundled `pdfjs-dist@6.5.438` Web Worker (`enableScripting: false`, `enableXfa: false`) and can be printed offline once installed as a desktop PWA.

---

## Architecture & Key Engineering Highlights

| Layer | Implementation | Verified Constraint |
| :--- | :--- | :--- |
| **Raster Engine** | `src/pdf/binarizer.ts`, `src/pdf/rasterizer.ts` | Exact `384 × 400 px` (`B1_PRINTHEAD_PX = 384`, `LABEL_HEIGHT_PX = 400`), `fit` or `crop-bleed`, `0/90/180/270°` rotation, 1-bit **Crisp Threshold** & **Atkinson** dithering |
| **Hardware Transport** | `src/printer/b1Client.ts`, `src/printer/web-hardware.d.ts` | `@mmote/niimbluelib@0.49.1` (`NiimbotSerialClient` + `NiimbotBluetoothClient`), dynamic COM port discovery (`VID_3513` / `VID_1A86`), Windows BLE **`20 ms`** packet pacing & `30 s` page timeout |
| **Gap Alignment** | `B1PrinterController` (`LabelType.WithGaps = 1`) | Enforces `WithGaps` mode, provides **Feed 1 Sticker to Gap** (zero-heat alignment) and **Optical Gap Calibration (`0x8E`)**, guarantees `printEnd()` cleanup in `finally` |
| **Batch Queue** | `printBatchLabels()` + `AbortController` | Single/multi-page PDF selection, per-page copy count, live packet/feed progress, and **Stop After Current Sticker** cancellation |
| **UI & Icons** | `src/tokens.css`, `src/style.css`, `src/ui/icons.ts`, `src/ui/manualModal.ts`, `src/main.ts` | Apple macOS Sonoma / iPadOS Print Center layout with `#FA4676` accent, Light / Auto / Pro Dark modes, transparent vector Niimbot B1 showcase pod (`public/niimbot-b1.svg`), interactive 5-tab User Manual, pure-DOM SVG icons (`createElementNS`), and 50×50 mm liner previews |
| **Bilingual i18n** | `src/i18n/translations.ts` | Zero-dependency type-safe **English (`en`)** & **Brazilian Portuguese (`pt-BR`)** live language switcher (`niimbot-label-studio:locale`) preserving active USB/BLE & PDF state |
| **Offline PWA** | `vite.config.ts` (`base: "./"`), `public/manifest.webmanifest` | Zero-dependency `offlinePwaPlugin()` generating relative-path `sw.js` precaching UI bundles and the ES module `pdf.worker.min-*.mjs` |
| **Security & CI** | `index.html`, `src/pdf/validation.ts`, `scripts/verify-guardrails.mjs` | Strict CSP (`script-src 'self'`, `style-src 'self'`), zero `innerHTML`/`any`/`.style.*`, `MAX_PDF_BYTES = 25 MB`, `MAX_PDF_PAGES = 100`, `%PDF-` header check, Biome + pre-commit hook + GitHub Actions CI |

---

## Quickstart (Local Development)

### Prerequisites
- **Node.js** `>= 24` and **npm** `>= 11` (verified on Windows 11 ARM64 with Node `v24.13.0` and Linux CI)
- **Git** `>= 2.43`
- **Microsoft Edge** or **Google Chrome** `>= 117` (required for W3C WebSerial & WebBluetooth APIs over `http://localhost` or `https://`)

### Setup & Commands
```powershell
git clone https://github.com/jmiguelrj/niimbot-b1-pdf-printer.git
cd niimbot-b1-pdf-printer
npm ci
npm run prepare   # Activates .githooks/pre-commit (runs npm run check before commits)
npm run dev       # Starts local Vite dev server on http://localhost:5173
```

### Verification & Production Build
```powershell
npm audit         # Dependency vulnerability check (0 vulnerabilities)
npm run check     # Biome lint + tsc --noEmit + verify-guardrails.mjs + unit tests
npm run build     # Emits relative-path static PWA bundle + dist/sw.js into ./dist
```

---

## Subpath Reverse-Proxy Hosting (`/labels/`)

Because `vite.config.ts` compiles with `base: "./"` and relative service-worker entries, the built `./dist/` bundle can be served either from a root domain or under a subpath such as `https://labels.example.com/labels/` with two critical reverse-proxy rules:

1. **Trailing-Slash Normalization (Before `stripprefix`)**: Redirect exact `/labels` requests (`308`) to `/labels/` **before** stripping the `/labels` prefix so relative `./assets/...`, `./manifest.webmanifest`, and `./sw.js` paths resolve under `/labels/`.
2. **Explicit `.mjs` MIME Type & Hardware `Permissions-Policy`**: Alpine Nginx images do not always include `mjs` in `/etc/nginx/mime.types` by default, which causes Chromium to reject ES module Web Workers (`pdf.worker.min-*.mjs`). Map `.mjs` explicitly to `application/javascript` and set `Permissions-Policy: serial=(self), bluetooth=(self), usb=(self)...`.

```nginx
# Excerpt — /opt/niimbot-label-studio/nginx.conf (nginx:1.27-alpine)
include /etc/nginx/mime.types;
types {
    application/javascript mjs;
    application/manifest+json webmanifest;
}

add_header Permissions-Policy "serial=(self), bluetooth=(self), usb=(self), camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
```

```yaml
# Excerpt — Traefik v3 Docker labels for https://labels.example.com/labels/
- "traefik.http.routers.niimbot-labels-https.rule=Host(`labels.example.com`) && PathPrefix(`/labels`)"
- "traefik.http.routers.niimbot-labels-https.priority=200"
- "traefik.http.routers.niimbot-labels-https.middlewares=niimbot-slash,niimbot-strip"
- "traefik.http.middlewares.niimbot-slash.redirectregex.regex=^(https?://[^/]+/labels)$$"
- "traefik.http.middlewares.niimbot-slash.redirectregex.replacement=$${1}/"
- "traefik.http.middlewares.niimbot-slash.redirectregex.permanent=true"
- "traefik.http.middlewares.niimbot-strip.stripprefix.prefixes=/labels"
```

For full server setup, caching rules, and rollback commands, see [SOP-006](docs/SOP-006-SUBPATH-REVERSE-PROXY-DEPLOYMENT.md).

---

## Operational Documentation

- [Task Registry](docs/TASK_REGISTRY.md) — Chronological engineering log and architecture summary
- [SOP-001: Environment & Setup](docs/SOP-001-ENVIRONMENT-AND-SETUP.md)
- [SOP-002: 50×50 mm PDF Rasterization](docs/SOP-002-PDF-RASTERIZATION-50X50.md)
- [SOP-003: B1 USB/BLE & Optical Gap Printing](docs/SOP-003-B1-USB-BLE-GAP-PRINTING.md)
- [SOP-004: Multi-PC & Bluetooth Deployment](docs/SOP-004-MULTI-PC-AND-BLUETOOTH-DEPLOYMENT.md)
- [SOP-005: Security & Agentic Guardrails](docs/SOP-005-SECURITY-AND-AGENTIC-GUARDRAILS.md)
- [SOP-006: Subpath Reverse-Proxy Deployment](docs/SOP-006-SUBPATH-REVERSE-PROXY-DEPLOYMENT.md)
- [CLAUDE.md](CLAUDE.md) — Automated invariant & architectural guardrails

---

## License

Released under the [MIT License](LICENSE).
