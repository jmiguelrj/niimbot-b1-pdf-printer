import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  validatePdfBytes,
  validatePdfPageCount,
} from "../src/pdf/validation.ts";

test("validatePdfBytes rejects empty files and buffers missing %PDF- magic header", () => {
  assert.throws(() => validatePdfBytes(new Uint8Array(0)), /empty \(0 bytes\)/);

  const nonPdf = new TextEncoder().encode("<html><script>alert(1)</script></html>");
  assert.throws(() => validatePdfBytes(nonPdf), /missing %PDF- magic header/);

  const validHeader = new TextEncoder().encode("%PDF-1.7\n");
  assert.doesNotThrow(() => validatePdfBytes(validHeader));
});

test("validatePdfBytes rejects buffers exceeding MAX_PDF_BYTES (25 MB)", () => {
  const oversized = new Uint8Array(MAX_PDF_BYTES + 1);
  oversized.set([0x25, 0x50, 0x44, 0x46, 0x2d], 0); // %PDF-
  assert.throws(() => validatePdfBytes(oversized), /exceeds the 25 MB safety limit/);
});

test("validatePdfPageCount enforces 1..MAX_PDF_PAGES (100) bounds", () => {
  assert.throws(() => validatePdfPageCount(0), /exceeding the maximum allowed limit/);
  assert.throws(
    () => validatePdfPageCount(MAX_PDF_PAGES + 1),
    /exceeding the maximum allowed limit/,
  );
  assert.doesNotThrow(() => validatePdfPageCount(1));
  assert.doesNotThrow(() => validatePdfPageCount(MAX_PDF_PAGES));
});

test("verify-guardrails.mjs exits cleanly with code 0", () => {
  const stdout = execFileSync(process.execPath, ["scripts/verify-guardrails.mjs"], {
    encoding: "utf8",
  });
  assert.match(stdout, /Guardrails PASSED/);
});

test("Apple Cupertino #FA4676 brand accent token and manifest theme_color are locked", () => {
  const tokensCss = fs.readFileSync("src/tokens.css", "utf8");
  const manifest = fs.readFileSync("public/manifest.webmanifest", "utf8");
  assert.match(tokensCss, /--nb-accent:\s*#fa4676\b/i);
  assert.match(manifest, /"theme_color":\s*"#fa4676"/i);
});

test("subpath PWA manifest, Service Worker scope, and localStorage namespace are strictly isolated", () => {
  const manifestRaw = fs.readFileSync("public/manifest.webmanifest", "utf8");
  const manifest = JSON.parse(manifestRaw) as { id?: string; start_url?: string; scope?: string };
  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");

  const mainTs = fs.readFileSync("src/main.ts", "utf8");
  const i18nTs = fs.readFileSync("src/i18n/translations.ts", "utf8");
  const combinedStorageSources = [mainTs, i18nTs];

  for (const source of combinedStorageSources) {
    for (const keyMatch of source.matchAll(/const\s+\w+_STORAGE_KEY\s*=\s*"([^"]+)"/g)) {
      assert.ok(
        keyMatch[1].startsWith("niimbot-label-studio:"),
        `Storage key constant must use niimbot-label-studio: prefix, got ${keyMatch[1]}`,
      );
    }
    for (const call of source.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^,)]+)/g)) {
      const arg = call[1].trim();
      assert.ok(
        /^(?:THEME|LOCALE)_STORAGE_KEY$/.test(arg) || /^"niimbot-label-studio:[^"]+"$/.test(arg),
        `Unscoped localStorage key usage detected: ${arg}`,
      );
    }
  }
  assert.match(mainTs, /serviceWorker\.register\("\.\/sw\.js",\s*\{\s*scope:\s*"\.\/"\s*\}\)/);

  const b1Svg = fs.readFileSync("public/niimbot-b1.svg", "utf8");
  assert.ok(b1Svg.length > 0, "public/niimbot-b1.svg must be non-empty");
  assert.match(b1Svg, /^<svg\b/);
  assert.doesNotMatch(b1Svg, /<script\b/i);
  assert.doesNotMatch(b1Svg, /\bon[a-z]+\s*=/i);
  assert.doesNotMatch(b1Svg.replaceAll("http://www.w3.org/2000/svg", ""), /https?:\/\//i);
  assert.equal(fs.existsSync("public/niimbot-b1.webp"), false, "obsolete .webp must be removed");

  const viteConfig = fs.readFileSync("vite.config.ts", "utf8");
  assert.match(viteConfig, /niimbot-label-studio-/);
  assert.match(viteConfig, /v1\.1\.1-/);
  assert.match(viteConfig, /"\.\/niimbot-b1\.svg"/);
  assert.match(viteConfig, /k\.startsWith\(CACHE_PREFIX\) && k !== CACHE_NAME/);
  assert.match(viteConfig, /!event\.request\.url\.startsWith\(self\.registration\.scope\)/);
});
