# Changelog

All notable changes to **Label Studio (`niimbot-b1-pdf-printer`)** are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-11-16
### Added
- Built-in 1-click **Sample 50×50 mm Calibration Sticker** generator (`src/pdf/samplePdf.ts`) outputting a valid `%PDF-1.4` (`141.732 × 141.732 pt`) test label with QR finder targets, barcode bars, and a stepped grayscale ramp to compare Threshold vs. Atkinson dithering live.
- Localized Dropzone sample action button (`Load Sample 50×50 mm Sticker` / `Carregar Etiqueta Exemplo 50×50 mm`) and unit test (`tests/samplePdf.test.ts`).
- High-DPI UI screenshots (`docs/media/showcase-light.png`, `docs/media/showcase-dark.png`, `docs/media/manual-pt-br.png`) and `1280×640` GitHub OpenGraph `docs/media/social-preview.png`.
- Architecture Decision Records (`docs/adr/ADR-001` through `ADR-003`), Mermaid sequence diagram in `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `.github/PULL_REQUEST_TEMPLATE.md`.

## [1.1.1] - 2026-11-16
### Changed
- Replaced raster `niimbot-b1.webp` with sanitized transparent pure-vector `public/niimbot-b1.svg` (`34,380` bytes) and adaptive Light/Dark frosted Apple pedestals in `src/tokens.css` & `src/style.css`.
- Documented single-hop port-80 `HTTP → HTTPS` trailing-slash Traefik redirect rules and HSTS headers in `docs/SOP-006-SUBPATH-REVERSE-PROXY-DEPLOYMENT.md`.

## [1.1.0] - 2026-11-16
### Added
- Zero-dependency type-safe **English (`en`)** and **Brazilian Portuguese (`pt-BR`)** live bilingual engine (`src/i18n/translations.ts`) with `niimbot-label-studio:locale` persistence and key/placeholder parity tests (`tests/i18n.test.ts`).
- Interactive 5-tab Apple-style **User Manual** `<dialog>` (`src/ui/manualModal.ts`) covering Quick Start, Hardware & LEDs, USB/Bluetooth setup on Windows, 1-Bit Quality & Gaps, and PWA install.
- Niimbot B1 product showcase pod inside the **Printer & Sensor** card with live ready/busy ring feedback.

## [1.0.1] - 2026-11-16
### Fixed
- Strict same-origin subpath PWA isolation: explicit `"id": "./"`, `"start_url": "./"`, `"scope": "./"` in `public/manifest.webmanifest`; scoped `niimbot-label-studio-` CacheStorage pruning and `self.registration.scope` fetch guard in `vite.config.ts`; and `niimbot-label-studio:theme` namespacing in `src/main.ts`.

## [1.0.0] - 2026-11-16
### Added
- Public showcase `README.md`, `docs/SOP-006-SUBPATH-REVERSE-PROXY-DEPLOYMENT.md`, strict Nginx/Traefik `/labels/` subpath hosting guide with explicit `.mjs` → `application/javascript` MIME mapping and `Permissions-Policy`.
- Apple Cupertino Print-Center UI (`#FA4676`, `--nb-*` tokens, pure-DOM SVG icons), WebSerial + Windows BLE 20 ms transport, 50×50 mm `384×400 px` rasterizer, strict CSP, Biome, and automated guardrail gate.
