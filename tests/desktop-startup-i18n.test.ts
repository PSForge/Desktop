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
  const promptIndex = main.indexOf("await createFirstRunLanguageWindow();");
  const splashIndex = main.indexOf("createSplashWindow();");

  assert.ok(promptIndex > -1, "first-run language prompt should be called during startup");
  assert.ok(splashIndex > -1, "splash window should still be created");
  assert.ok(promptIndex < splashIndex, "language prompt should appear before the splash");
  assert.match(main, /const localeStorageKey = "psforge-locale";/);
  assert.match(main, /Choose your language/);
  assert.match(main, /desktop:first-run-language-selected/);
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

test("2.0.4 release metadata and Store listing point to the 2.0.4 MSI", () => {
  const pkg = JSON.parse(readRepoFile("package.json"));
  const listing = readRepoFile("docs", "microsoft-store-listing.md");

  assert.equal(pkg.version, "2.0.4");
  assert.match(listing, /Version: `2\.0\.4`/);
  assert.match(listing, /PSForge-Desktop-Store-2\.0\.4-x64\.msi/);
  assert.match(listing, /faster startup/i);
  assert.match(listing, /language/i);
});
