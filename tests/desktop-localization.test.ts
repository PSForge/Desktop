import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeDesktopText } from "../client/src/lib/desktop-localization";
import type { LocaleCode } from "../client/src/lib/i18n";

const supportedNonEnglishLocales: LocaleCode[] = ["es", "fr", "de", "pt", "it", "nl", "ja", "ko", "zh", "hi", "ar"];

test("localizes catalog and task detail strings for every supported non-English desktop locale", () => {
  for (const locale of supportedNonEnglishLocales) {
    assert.notEqual(localizeDesktopText(locale, "Back to Tasks"), "Back to Tasks", locale);
    assert.notEqual(localizeDesktopText(locale, "Generate PowerShell Script"), "Generate PowerShell Script", locale);
    assert.notEqual(localizeDesktopText(locale, "Gets the items and child items in one or more specified locations."), "Gets the items and child items in one or more specified locations.", locale);
    assert.notEqual(localizeDesktopText(locale, "Credential Leak Detector"), "Credential Leak Detector", locale);
    assert.notEqual(localizeDesktopText(locale, "**How This Task Works:**"), "**How This Task Works:**", locale);
  }
});

test("keeps English and unknown technical text stable", () => {
  assert.equal(localizeDesktopText("en", "Get-ChildItem"), "Get-ChildItem");
  assert.equal(localizeDesktopText("es", "Get-ChildItem"), "Get-ChildItem");
});
