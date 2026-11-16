import assert from "node:assert/strict";
import test from "node:test";
import {
  formatText,
  LOCALE_STORAGE_KEY,
  resolveInitialLocale,
  TRANSLATIONS,
} from "../src/i18n/translations.ts";

function extractPlaceholders(str: string): string[] {
  const matches = str.match(/\{[a-zA-Z0-9_]+\}/g) ?? [];
  return Array.from(new Set(matches)).sort();
}

test("en and pt-BR translation dictionaries have 100% key, value, and placeholder parity", () => {
  const en = TRANSLATIONS.en;
  const pt = TRANSLATIONS["pt-BR"];

  const enKeys = Object.keys(en).sort();
  const ptKeys = Object.keys(pt).sort();
  assert.deepEqual(enKeys, ptKeys);
  assert.ok(enKeys.length >= 120, `Expected full UI + manual keys, found ${enKeys.length}`);

  for (const key of enKeys as Array<keyof typeof en>) {
    assert.ok(en[key].trim().length > 0, `en.${key} must be non-empty`);
    assert.ok(pt[key].trim().length > 0, `pt-BR.${key} must be non-empty`);
    assert.deepEqual(
      extractPlaceholders(pt[key]),
      extractPlaceholders(en[key]),
      `Placeholder mismatch on key "${key}"`,
    );
  }
});

test("resolveInitialLocale respects stored niimbot-label-studio:locale and falls back to navigator.language", () => {
  assert.equal(LOCALE_STORAGE_KEY, "niimbot-label-studio:locale");

  const ptStorage = {
    getItem(key: string) {
      return key === LOCALE_STORAGE_KEY ? "pt-BR" : null;
    },
  };
  const enStorage = {
    getItem(key: string) {
      return key === LOCALE_STORAGE_KEY ? "en" : null;
    },
  };
  const emptyStorage = {
    getItem() {
      return null;
    },
  };

  assert.equal(resolveInitialLocale(ptStorage, "en-US"), "pt-BR");
  assert.equal(resolveInitialLocale(enStorage, "pt-BR"), "en");
  assert.equal(resolveInitialLocale(emptyStorage, "pt-BR"), "pt-BR");
  assert.equal(resolveInitialLocale(emptyStorage, "pt-PT"), "pt-BR");
  assert.equal(resolveInitialLocale(emptyStorage, "en-US"), "en");
  assert.equal(resolveInitialLocale(emptyStorage, "es-AR"), "en");
});

test("formatText interpolates multiple template variables accurately", () => {
  const formatted = formatText(TRANSLATIONS["pt-BR"].batchSummaryMany, {
    selected: 2,
    total: 5,
    stickers: 6,
  });
  assert.equal(formatted, "2/5 selecionada(s) · 6 etiquetas");
});
