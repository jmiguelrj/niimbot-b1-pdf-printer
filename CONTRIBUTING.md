# Contributing to Label Studio (`niimbot-b1-pdf-printer`)

Thank you for contributing! This project enforces strict automated hardware, security, design-token, and localization invariants so pull requests remain safe to ship.

## Local Setup
```powershell
git clone https://github.com/jmiguelrj/niimbot-b1-pdf-printer.git
cd niimbot-b1-pdf-printer
npm ci
npm run prepare   # Activates .githooks/pre-commit (runs npm run check automatically)
```

## Non-Negotiable Engineering Rules
1. **Strict Hardware Invariants (`src/pdf/binarizer.ts`, `src/printer/b1Client.ts`)**:
   - Preserve `B1_PRINTHEAD_PX = 384`, `LABEL_HEIGHT_PX = 400`, `LabelType.WithGaps` default, dynamic USB enumeration (never hardcode `COM9` or Windows paths), `20 ms` BLE packet pacing, and `task.printEnd()` in `finally`.
2. **Zero-XSS & Strict CSP (`src/`, `index.html`)**:
   - Never use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval()`, `new Function()`, inline `style=`, or `.style.*` mutations. Construct elements via `document.createElement` / `createElementNS` and toggle CSS classes.
   - Zero explicit `any` types (`noExplicitAny: "error"` in `biome.json`).
3. **`--nb-*` Design Token Purity (`src/tokens.css`, `src/style.css`)**:
   - Define all color, blur, radius, and shadow tokens in `src/tokens.css` across Light, `@media (prefers-color-scheme: dark)`, and `[data-theme="dark"]`.
   - `src/style.css` MUST consume `var(--nb-*)` exclusively (zero raw `#hex`, `rgb()`, or `hsl()` literals).
4. **Same-Origin Storage & Bilingual Parity**:
   - Prefix any new `localStorage` keys with `"niimbot-label-studio:"`.
   - Add every user-facing string to both `TRANSLATIONS.en` and `TRANSLATIONS["pt-BR"]` in `src/i18n/translations.ts` with matching `{placeholder}` variables (`tests/i18n.test.ts` enforces 100% parity).
5. **Public Hygiene**:
   - Never commit private server IPs, credentials, API keys, or internal SSH host targets.

## Mandatory Verification Before Submitting a PR
```powershell
npm run format
npm audit
npm run check
npm run build
```
All four commands must exit with code `0`. See [CLAUDE.md](CLAUDE.md) for the full agentic/engineering rulebook.
