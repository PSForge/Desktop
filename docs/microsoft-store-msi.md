# Microsoft Store MSI Notes

PSForge Desktop now emits a signed MSI artifact intended for hosted Win32 distribution scenarios such as Microsoft Store submission.

## MSI artifact

Expected file name:

- `PSForge-Desktop-Store-<version>-x64.msi`

## Recommended Store-facing values

- Installer type: `MSI`
- Architecture: `x64`
- Hosted installer URL: versioned HTTPS URL pointing to the MSI
- Package version: match `package.json`

## Silent install behavior

Microsoft documents that Store-hosted MSI installers use:

- Silent install: `msiexec /i "<installer>.msi" /qn`

The Store handles MSI silent installation behavior directly, so no custom EXE arguments are needed for the MSI path.

## Packaging notes

- MSI is built and signed alongside the NSIS `.exe` and `.zip`.
- The NSIS `.exe` remains the primary desktop auto-update channel.
- The MSI is intended for Store ingestion, enterprise deployment, and predictable silent installation.

## Microsoft Store analytics readiness

Partner Center analytics for Store-submitted MSI/EXE apps should be available from the product's Analytics area after publication:

- Overview: acquisition, usage, health, ratings, and review summaries.
- Acquisition: Store page views, acquisitions, installs, funnel usage, markets, and campaign attribution.
- Usage: active devices and engagement reporting from Store telemetry.
- Health: crashes, hangs, affected devices, crash rate, hang rate, failure distribution, and package-version filtering.

For PSForge Desktop 2.0, keep the Microsoft Store package version aligned with `package.json` so Partner Center can separate health and engagement data by release. The app also records internal desktop events to `/api/desktop/analytics/batch` for signed-in desktop users so PSForge-side engagement can be compared with Partner Center reporting:

- `desktop_app_opened`
- `desktop_app_closed`
- `desktop_session_heartbeat`
- `desktop_session_duration_seconds`
- `desktop_ai_prompt_sent`
- `desktop_ai_response_received`
- `desktop_script_generated`
- `desktop_script_saved_local`
- `desktop_renderer_error`
- `desktop_renderer_unhandled_rejection`
- `desktop_update_checked`
- `desktop_update_installed`

Do not catch and suppress fatal Electron main-process crashes. Windows/Partner Center health reporting depends on real crash and hang signals reaching Windows Error Reporting. PSForge only logs main-process exceptions through `uncaughtExceptionMonitor`, which observes the crash path without preventing it.

## Release checklist

1. Build a signed tagged release.
2. Verify the GitHub Actions artifacts include the MSI.
3. Verify the MSI shows a valid digital signature in Windows file properties.
4. Host the MSI on a stable versioned HTTPS URL.
5. Use that exact versioned URL in the Microsoft Store submission.
6. Confirm Partner Center Analytics shows the new version under Acquisition, Usage, and Health after Store ingestion and customer activity.
7. Confirm PSForge admin analytics includes desktop metrics for signed-in desktop sessions.
