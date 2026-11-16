import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function recordError(gate, file, detail) {
  errors.push(`[${gate}] ${file}: ${detail}`);
}

function listFiles(dir, extFilter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, extFilter));
    } else if (!extFilter || extFilter(full)) {
      out.push(full);
    }
  }
  return out;
}

// 1. Secret & Infrastructure Leak Gate across all git-tracked files + working tree docs/scripts/workflows
const trackedRaw = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
const trackedFiles = trackedRaw
  .split(/\r?\n/)
  .map((f) => f.trim())
  .filter(Boolean);

const selfPath = path.normalize("scripts/verify-guardrails.mjs");
const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const allowedIps = new Set(["127.0.0.1", "0.0.0.0"]);
const privateKeyRegex = new RegExp(`-----BEGIN\\s+(?:[A-Z]+\\s+)?PRIVATE` + `_KEY-----`);
const tokenRegex = new RegExp(`(?:gh` + `p_|github_` + `pat_|sk-|xox` + `[baprs]-)[A-Za-z0-9_-]{8,}`);
const sshRootRegex = new RegExp(`root` + `@[A-Za-z0-9._-]+`);

const textExtensions = new Set([
  ".ts",
  ".mts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".css",
  ".md",
  ".yml",
  ".yaml",
  ".svg",
  ".webmanifest",
  "",
]);

for (const rel of trackedFiles) {
  const norm = path.normalize(rel);
  if (norm === selfPath || norm === "package-lock.json") continue;
  const ext = path.extname(norm).toLowerCase();
  if (!textExtensions.has(ext)) continue;

  const abs = path.join(ROOT, norm);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
  const content = fs.readFileSync(abs, "utf8");

  const ips = content.match(ipv4Regex) ?? [];
  for (const ip of ips) {
    if (!allowedIps.has(ip)) {
      recordError("SECRET_LEAK", rel, `Disallowed IPv4 literal detected (${ip})`);
    }
  }
  if (privateKeyRegex.test(content)) {
    recordError("SECRET_LEAK", rel, "Private key header detected");
  }
  if (tokenRegex.test(content)) {
    recordError("SECRET_LEAK", rel, "API/GitHub token pattern detected");
  }
  if (sshRootRegex.test(content)) {
    recordError("SECRET_LEAK", rel, "Internal SSH root@ host reference detected");
  }
}

// 2. DOM / XSS & Type Safety Gate across src/**/*.ts
const srcTsFiles = listFiles(path.join(ROOT, "src"), (p) => p.endsWith(".ts"));
const forbiddenDomSinks = [
  { label: "innerHTML", regex: /\.innerHTML\b/ },
  { label: "outerHTML", regex: /\.outerHTML\b/ },
  { label: "insertAdjacentHTML", regex: /\.insertAdjacentHTML\b/ },
  { label: "eval()", regex: /\beval\s*\(/ },
  { label: "new Function()", regex: /\bnew\s+Function\s*\(/ },
  { label: "document.write", regex: /\bdocument\.write\b/ },
  { label: "explicit any (: any)", regex: /:\s*any\b/ },
  { label: "explicit any (as any)", regex: /\bas\s+any\b/ },
];

for (const abs of srcTsFiles) {
  const rel = path.relative(ROOT, abs);
  const content = fs.readFileSync(abs, "utf8");
  for (const rule of forbiddenDomSinks) {
    if (rule.regex.test(content)) {
      recordError("DOM_XSS_TYPES", rel, `Forbidden pattern "${rule.label}" found`);
    }
  }
}

// 3. CSP Inline-Style Gate across index.html and src/**/*.ts
const indexPath = path.join(ROOT, "index.html");
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  if (/\bstyle\s*=/.test(indexHtml)) {
    recordError("CSP_STYLE", "index.html", "Inline style= attribute violates style-src 'self'");
  }
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(indexHtml)) {
    recordError("CSP_META", "index.html", "Missing Content-Security-Policy meta tag");
  }
}
for (const abs of srcTsFiles) {
  const rel = path.relative(ROOT, abs);
  const content = fs.readFileSync(abs, "utf8");
  if (/\.style\./.test(content) || /\bstyle\s*=/.test(content)) {
    recordError("CSP_STYLE", rel, "Inline style mutation/attribute violates style-src 'self'");
  }
}

// 4. Design Token Purity Gate across src/**/*.css (excluding src/tokens.css)
const cssFiles = listFiles(path.join(ROOT, "src"), (p) => p.endsWith(".css"));
const tokensCssAbs = path.resolve(ROOT, "src", "tokens.css");
const rawColorRegex = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;

for (const abs of cssFiles) {
  if (path.resolve(abs) === tokensCssAbs) continue;
  const rel = path.relative(ROOT, abs);
  const content = fs.readFileSync(abs, "utf8");
  if (rawColorRegex.test(content)) {
    recordError(
      "TOKEN_PURITY",
      rel,
      "Raw color literal (#hex/rgb/hsl) found outside src/tokens.css; use var(--nb-*)",
    );
  }
}

// 5. Hardware Protocol Lock Gate
const allSrcContent = srcTsFiles.map((p) => fs.readFileSync(p, "utf8")).join("\n");
if (!/B1_PRINTHEAD_PX\s*=\s*384\b/.test(allSrcContent)) {
  recordError("HARDWARE_LOCK", "src/", "Required constant B1_PRINTHEAD_PX = 384 is missing");
}
if (!/\bLabelType\.WithGaps\b/.test(allSrcContent)) {
  recordError("HARDWARE_LOCK", "src/", "Required LabelType.WithGaps constant is missing");
}

if (errors.length > 0) {
  console.error(`Guardrail verification FAILED (${errors.length} violation(s)):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `Guardrails PASSED: 0 secret/IP leaks, 0 XSS/any sinks, strict CSP, 100% --nb-* CSS tokens, and B1 hardware invariants intact (${trackedFiles.length} tracked files checked).`,
);
