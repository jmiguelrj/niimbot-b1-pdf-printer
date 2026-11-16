# Engineering & AI Agent Guardrails (`niimbot-b1-pdf-printer`)

## Project Overview
Local-first, zero-driver 50×50 mm PDF thermal label printer web application (Vite + TypeScript + Offline PWA) targeting the **Niimbot B1** over **WebSerial (USB-C)** and **WebBluetooth (BLE)** across Windows 10/11 (x86_64 & ARM64).

## Mandatory Hardware & Protocol Invariants
- **Active Printhead**: `B1_PRINTHEAD_PX = 384` px width (`48 mm` @ 203 DPI) × `LABEL_HEIGHT_PX = 400` px height (`50 mm`), with 1 mm (`8 px`) unprintable side margins. Never bypass the `384×400` pre-print dimension guard in `src/printer/b1Client.ts`.
- **Optical Gap Sensor**: Default label mode is `LabelType.WithGaps` (`1`). Always wrap print jobs in `try / catch / finally` calling `task.printEnd()` so the thermal head never remains energized on failure.
- **Transport Pacing**: USB Serial uses `10 ms` packet interval (`15 s` page timeout); Windows Bluetooth BLE uses `20 ms` packet interval (`30 s` page timeout) to prevent WinRT GATT `writeWithoutResponse` drops.
- **No Hardcoded COM Ports**: Never hardcode `COM9` or Windows-specific paths in runtime logic; enumerate dynamically via `navigator.serial.requestPort({ filters: NIIMBOT_USB_FILTERS })`.

## Security & Public-Repo Rules
- **Public Repo Hygiene**: NEVER commit private/internal server IPs, SSH `root@` targets, API tokens, or private keys anywhere in code, docs, or CI workflows.
- **Strict DOM Safety**: ZERO `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval()`, `new Function()`, or `document.write` in `src/`. Build DOM with `document.createElement`, `textContent`, and `append`.
- **Strict TypeScript**: ZERO `any` (`noExplicitAny: "error"` in `biome.json`).
- **Strict CSP**: `index.html` enforces `style-src 'self'` and `script-src 'self'`. Do NOT write inline `style=` attributes or `.style.*` mutations; toggle CSS classes or `<progress>` elements instead.
- **PDF Safety Bounds**: Enforce `MAX_PDF_BYTES = 25 MB`, `%PDF-` magic header check (`validatePdfBytes`), `MAX_PDF_PAGES = 100` (`validatePdfPageCount`), `enableScripting: false`, and `enableXfa: false`.
- **Origin Storage & i18n Locks**: All `localStorage` keys in `src/` MUST start with `"niimbot-label-studio:"` (`niimbot-label-studio:theme`, `niimbot-label-studio:locale`), and `src/i18n/translations.ts` MUST preserve 100% key/placeholder parity between `en` and `pt-BR`.

## Design Token Architecture & UI Icons
- All colors, glass blur, shadows, typography, and radii live in `src/tokens.css` under canonical `--nb-*` custom properties.
- `--nb-accent: #FA4676` is the locked primary brand accent token (`src/tokens.css` & `public/manifest.webmanifest`).
- Other CSS files (`src/style.css`) MUST `@import "./tokens.css"` and use ONLY `var(--nb-*)` — zero raw `#hex`, `rgb()`, `rgba()`, `hsl()`, or `hsla()` literals outside `src/tokens.css`.
- Vector icons live in `src/ui/icons.ts` and are built strictly via `document.createElementNS("http://www.w3.org/2000/svg", ...)` (zero `innerHTML`, space-separated SVG path coordinates).

## Mandatory Pre-Commit Verification Gate
Before any commit or PR, run and pass:
```powershell
npm run check
npm run build
```
`npm run check` runs Biome lint/format check, `tsc --noEmit`, `node scripts/verify-guardrails.mjs`, and all `node --test` suites.
