# SOP-005: Security Hardening, Public-Repo Guardrails & Agentic Gates (`niimbot-b1-pdf-printer`)

## 1. Prerequisites
- **Environment**: Local Windows 11 (x86_64 or ARM64) or CI Linux runner with Node.js `>= 24` and Git `>= 2.43`.
- **Tooling**:
  - `@biomejs/biome@2.6.8` (`noExplicitAny: "error"`, `noDangerouslySetInnerHtml: "error"`)
  - Zero-dependency guardrail runner (`scripts/verify-guardrails.mjs`)
  - Git hooks path configured via `npm run prepare` (`.githooks/pre-commit`)
- **Security & Design Contracts**:
  - Strict CSP in `index.html` (`script-src 'self'`, `style-src 'self'`, `worker-src 'self' blob:`).
  - Zero `innerHTML` / `outerHTML` / `eval` / `Function` / `any` / inline `style=` or `.style.*` mutations in `src/`.
  - PDF bounds: `MAX_PDF_BYTES = 25 MB`, `%PDF-` magic header check, `MAX_PDF_PAGES = 100`, `enableScripting: false`.
  - Design tokens defined strictly in `src/tokens.css` (`--nb-*`); all other CSS files consume `var(--nb-*)` only.

---

## 2. Execution Steps
Run from PowerShell inside `C:\repos\Niimbot\niimbot-b1-pdf-printer`:

1. **Activate local Git pre-commit hook (one-time per clone)**:
   ```powershell
   Set-Location C:\repos\Niimbot\niimbot-b1-pdf-printer
   npm run prepare
   ```

2. **Audit dependencies for known CVEs**:
   ```powershell
   npm audit
   ```

3. **Run the complete verification gate (`check`)**:
   ```powershell
   npm run check
   ```
   This sequentially executes:
   - `npm run lint` (`biome check src tests`)
   - `npx tsc --noEmit`
   - `npm run verify:guardrails` (Secret/IP leak scan, DOM/XSS & `any` check, CSP inline-style check, `--nb-*` CSS token purity check, `B1_PRINTHEAD_PX = 384` & `LabelType.WithGaps` lock check)
   - `npm test` (`tests/binarizer.test.ts`, `tests/b1Client.test.ts`, `tests/security.test.ts`)

4. **Build production PWA bundle**:
   ```powershell
   npm run build
   ```

---

## 3. Expected Output
- `npm audit` reports `found 0 vulnerabilities`.
- `npm run check` exits with **code `0`**, reporting:
  - `Checked 13 files ... No fixes applied.` (0 errors, 0 warnings)
  - `Guardrails PASSED: 0 secret/IP leaks, 0 XSS/any sinks, strict CSP, 100% --nb-* CSS tokens, and B1 hardware invariants intact`
  - All `node --test` suites pass (`0` failures).
- `npm run build` exits with **code `0`**, emitting `dist/sw.js` and relative `./assets/*` bundles compatible with the strict CSP `<meta>` policy.

---

## 4. Rollback
1. **Disable pre-commit hook temporarily** (if ever needed for emergency local work):
   ```powershell
   git config --unset core.hooksPath
   ```
2. **Git Branch / Commit Rollback** (inside `C:\repos\Niimbot\niimbot-b1-pdf-printer`):
   ```powershell
   git checkout main
   git reset --hard 83e3c9c
   ```
   *(Reverts `main` back to the pre-Task-7 commit `83e3c9c`; run `git push --force-with-lease origin main` only if remote rollback is explicitly intended.)*
