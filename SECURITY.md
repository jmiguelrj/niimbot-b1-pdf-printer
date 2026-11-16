# Security Policy

## Local-First Privacy Architecture
**Label Studio (`niimbot-b1-pdf-printer`)** runs **100% client-side in your browser**:
- Uploaded PDFs, rendered label bitmaps, QR payloads, and calibration patterns remain strictly in local browser memory and never touch an external server or analytics pipeline.
- **Same-Origin Storage Isolation**: Persistent preferences are scoped under dedicated `niimbot-label-studio:` keys (`niimbot-label-studio:theme`, `niimbot-label-studio:locale`), and Service Worker caching uses `CACHE_PREFIX = "niimbot-label-studio-"` restricted strictly to `self.registration.scope`.

## Implemented Defense-in-Depth Controls
- **PDF.js Hardening (`pdfjs-dist@6.5.438`, `>= 6.2.108`)**: Mitigates CVE-2026-16633 with `enableScripting: false` and `enableXfa: false`.
- **Input Validation Bounds (`src/pdf/validation.ts`)**: Enforces `%PDF-` magic-header verification, non-empty checks, `MAX_PDF_BYTES = 25 MB`, and `MAX_PDF_PAGES = 100`.
- **Strict Content Security Policy (`index.html` & Reverse-Proxy Headers)**:
  - `default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`
  - `Permissions-Policy: serial=(self), bluetooth=(self), usb=(self), camera=(), microphone=(), geolocation=()`
- **XSS & Type-Safety Guardrails**: Zero `innerHTML`, `outerHTML`, `eval()`, `new Function()`, `.style.*` mutations, or `any` types — continuously verified by `@biomejs/biome`, TypeScript `strict`, `scripts/verify-guardrails.mjs`, `.githooks/pre-commit`, and GitHub Actions CI.
- **Static Hardware Asset Validation**: SVG graphics (`public/niimbot-b1.svg`) are pure static markup stripped of `<script>`, inline `on*` event attributes, and external URLs, loaded strictly as `<img src>` resources under `img-src 'self'`.

## Reporting a Vulnerability
Please report suspected vulnerabilities privately via **GitHub Security Advisories** (`Security` tab → *Report a vulnerability* on `jmiguelrj/niimbot-b1-pdf-printer`) rather than opening a public issue. Include steps to reproduce and affected version tags (`v1.x.y`).
