import assert from "node:assert/strict";
import { test } from "node:test";
import { getAiLanguageInstruction, normalizeAiLocale } from "../server/ai-locale";

test("normalizes supported AI locale codes", () => {
  assert.equal(normalizeAiLocale("es"), "es");
  assert.equal(normalizeAiLocale("ja"), "ja");
  assert.equal(normalizeAiLocale("ar"), "ar");
});

test("falls back to English for malformed AI locale values", () => {
  assert.equal(normalizeAiLocale("es; rm -rf"), "en");
  assert.equal(normalizeAiLocale("../es"), "en");
  assert.equal(normalizeAiLocale({ locale: "es" }), "en");
  assert.equal(normalizeAiLocale(null), "en");
});

test("builds a language instruction while preserving technical content", () => {
  const instruction = getAiLanguageInstruction("es");

  assert.match(instruction, /Respond in Spanish/);
  assert.match(instruction, /Preserve PowerShell code/);
  assert.match(instruction, /cmdlet names/);
});
