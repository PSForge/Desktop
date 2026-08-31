import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...parts: string[]) {
  return readFileSync(path.join(repoRoot, ...parts), "utf8");
}

test("desktop startup keeps splash visible until the renderer first paint is ready", () => {
  const main = readRepoFile("desktop", "main.mjs");
  const preload = readRepoFile("desktop", "preload.ts");
  const renderer = readRepoFile("client", "src", "main.tsx");

  assert.match(main, /let mainWindowReadyToShow = false;/);
  assert.match(main, /let rendererReadyForDisplay = false;/);
  assert.match(main, /function revealMainWindow/);
  assert.match(main, /desktop:renderer-ready/);
  assert.match(main, /Renderer ready signal timed out; revealing main window by fallback/);
  assert.match(preload, /rendererReady:/);
  assert.match(renderer, /requestAnimationFrame/);
  assert.match(renderer, /reportDesktopRendererReady/);
});

test("first run prompts for language before the splash starts", () => {
  const main = readRepoFile("desktop", "main.mjs");
  const languagePreload = readRepoFile("desktop", "language-preload.cjs");
  const pkg = JSON.parse(readRepoFile("package.json"));
  const promptIndex = main.indexOf("await createFirstRunLanguageWindow();");
  const splashIndex = main.indexOf("createSplashWindow();");

  assert.ok(promptIndex > -1, "first-run language prompt should be called during startup");
  assert.ok(splashIndex > -1, "splash window should still be created");
  assert.ok(promptIndex < splashIndex, "language prompt should appear before the splash");
  assert.match(main, /const localeStorageKey = "psforge-locale";/);
  assert.match(main, /Choose your language/);
  assert.match(main, /desktop:first-run-language-selected/);
  assert.match(main, /preload: getLanguagePreloadPath\(\)/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /window\.psforgeLanguagePrompt\.selectLanguage\(select\.value\)/);
  assert.match(languagePreload, /contextBridge\.exposeInMainWorld\("psforgeLanguagePrompt"/);
  assert.match(languagePreload, /desktop:first-run-language-selected/);
  assert.ok(pkg.build.files.includes("desktop/language-preload.cjs"));
  assert.match(main, /nextUrl\.searchParams\.set\("psforgeLocale", getStoredLocale\(\)\)/);
});

test("desktop localization foundation exposes persisted supported locales", () => {
  const i18n = readRepoFile("client", "src", "lib", "i18n.ts");
  const shell = readRepoFile("client", "src", "components", "desktop-workbench-shell.tsx");

  for (const locale of ["en", "es", "fr", "de", "pt", "it", "nl", "ja", "ko", "zh", "hi", "ar"]) {
    assert.match(i18n, new RegExp(`code: "${locale}"`));
  }

  assert.match(i18n, /PSFORGE_LOCALE_STORAGE_KEY/);
  assert.match(i18n, /getDesktopStorageItem/);
  assert.match(i18n, /setDesktopStorageItem/);
  assert.match(shell, /supportedLocales\.map/);
  assert.match(shell, /aria-label=\{t\("language"\)\}/);
  assert.match(shell, /document\.documentElement\.lang = locale/);
  assert.match(shell, /document\.documentElement\.dir = getLocaleDirection\(locale\)/);
});

test("3.0 release metadata and Store listing point to the 3.0 MSI", () => {
  const pkg = JSON.parse(readRepoFile("package.json"));
  const listing = readRepoFile("docs", "microsoft-store-listing.md");

  assert.equal(pkg.version, "3.0.0");
  assert.match(listing, /Version: `3\.0\.0`/);
  assert.match(listing, /PSForge-Desktop-Store-3\.0\.0-x64\.msi/);
  assert.match(listing, /faster startup/i);
  assert.match(listing, /language/i);
});

test("3.0 operations suite exposes review-first workflow features", () => {
  const utils = readRepoFile("client", "src", "lib", "script-workbench-utils.ts");
  const workbench = readRepoFile("client", "src", "components", "desktop-script-workbench.tsx");

  for (const phrase of [
    "Environment Doctor",
    "Pester Test Generator",
    "PowerShell Script Packager",
    "Runbook Generator",
    "Change Impact Preview",
    "Rollback Builder",
    "Script Modernizer",
    "Dependency and Module Manager",
  ]) {
    assert.match(workbench, new RegExp(phrase));
  }

  assert.match(utils, /buildOperationsSuitePlan/);
  assert.match(workbench, /value="ops-suite"/);
  assert.match(workbench, /PSForge 3\.0 Ops Suite/);
});
