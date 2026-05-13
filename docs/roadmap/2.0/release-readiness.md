# PSForge Desktop 2.0 Release Readiness

## Current Status

The 2.0 workbench refinement is functional and buildable. The main desktop surface now has the new shell, refreshed branding, compact guided workflow strip, searchable starter tray, optional Script Intelligence rail, upgraded command palette, a cleaner Run Center, and a Library surface that can open and save web scripts.

## Completed

- Updated desktop app metadata to `2.0.0`.
- Refreshed in-app logo and generated app icons from transparent branding assets.
- Added the 2.0 workbench shell with top toolbar, left rail, optional Script Intelligence, and bottom details drawer.
- Reworked Run Center into Prepare, Execute, and Review sections.
- Renamed the execution dialog to Run setup and made it scroll-safe.
- Expanded the command palette with run actions, navigation, recent files, script tools, and context-aware disabled actions.
- Replaced the large guided workflow panel with a compact recommendation strip.
- Moved starter templates into a searchable tray that stays closed by default.
- Removed legacy guided focus UI left over from iteration.
- Normalized newer workbench surfaces toward compact `rounded-md` styling.
- Added Library filters for Web, Local, Starters, Favorites, and Recent.
- Added offline cache fallback for web Library scripts.
- Added web-origin editor tabs with sync status and save-back conflict recovery.
- Added richer latest-run evidence in the Run Center detail panel.
- Lazy-loaded heavy workspaces for AI, GUI Builder, Wizard, Git, and Troubleshooter.
- Fixed TypeScript release blockers across CLI profile/template responses, script parsing utilities, task registry casts, storage typing, and admin analytics imports.
- Updated the dev server to bind to `127.0.0.1` by default, with `HOST` or `SERVER_HOST` available for overrides.
- Tightened narrow-width workbench controls so the focus strip, Starters button, and New Script action do not collide in constrained previews.
- Replaced the Script Tools dropdown with a lightweight local menu and guarded editor state effects to remove repeated render-depth warnings.
- Updated desktop package scripts to avoid the local Windows `winCodeSign` symlink privilege blocker during unsigned release builds.

## Verification

- `npm run build` passes.
- `npm run check` passes.
- `npm run dev` starts successfully and serves on `http://127.0.0.1:5000`.
- `npm run desktop:dist:dir` passes and creates `release/win-unpacked`.
- `npm run desktop:dist` passes and creates `release/PSForge-Desktop-Setup-2.0.0-x64.exe`, `release/PSForge-Desktop-2.0.0-x64.zip`, and the installer blockmap.
- Packaged launch smoke passed against `release/win-unpacked/PSForge Desktop.exe`.
- Preview smoke check confirms the compact focus strip is visible, the old guided card is gone, and the starter tray stays closed by default.
- Narrow preview QA confirms the workbench toolbar, Library navigation, Run setup dialog, and Script Tools menu work without render-loop console errors.
- The main browser bundle dropped from roughly 8.65 MB to roughly 1.61 MB after lazy-loading heavy builder/workspace modules.

## Known Build Warnings

- Browserslist data is stale. This needs a dependency metadata refresh with network access.
- A PostCSS plugin does not pass the `from` option to `postcss.parse`.
- The renderer still has large chunks, especially the SQL task data chunk, but the main app entry is significantly smaller.
- Local preview warns when `VITE_GA_MEASUREMENT_ID` is not configured. This is expected in the development QA environment.

## Remaining Release Tasks

- Run one manual wide-screen QA pass on a full desktop monitor.
- Smoke test authenticated web-backed flows: sign-in, save to web Library, conflict recovery, update checks, and license state.
- Confirm installer icon, Start menu shortcut, product name, and update metadata after installing from the generated NSIS artifact.
- Confirm all visible version labels show `2.0.0` from desktop context in packaged builds.
- Decide whether to split platform task data further before release candidate or move that to 2.0.x.
