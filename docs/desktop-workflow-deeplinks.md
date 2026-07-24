# PSForge Desktop Workflow Deep Links

## Registered URI Format

PSForge Desktop accepts only:

```text
psforge://workflow/{workflowId}
```

`workflowId` must be 1-128 characters and may contain only lowercase letters, numbers, and `-`.

Rejected examples include:

```text
psforge://script/example
psforge://workflow/Example
psforge://workflow/example_workflow
psforge://workflow/example?run=true
psforge://workflow/example/extra
psforge://workflow/../secret
psforge://workflow/example.exe
```

## Installer Behavior

Production Windows builds register the `psforge` URI protocol through Electron Builder's `build.protocols` configuration. The packaged app includes `desktop/deeplink.mjs` alongside `desktop/main.mjs`.

Electron Builder owns the protocol registry entries for installer-based installs and removes them during uninstall. Runtime `app.setAsDefaultProtocolClient("psforge")` is also called so dev and packaged runs can validate the registration path.

## Runtime Behavior

- Cold start: Windows opens PSForge Desktop and passes the URI as an application argument.
- Existing instance: Electron's single-instance lock prevents duplicate app instances, forwards the URI to the running app, and focuses the existing window.
- The main process parses the URI, strips it down to a validated workflow ID, and sends only a safe IPC payload to the renderer.
- The renderer fetches `https://psforge.app/api/public/workflows/{workflowId}`.
- Returned workflow JSON must match contract version `1`:

```json
{
  "id": "string",
  "slug": "string",
  "version": 1,
  "title": "string",
  "category": "string",
  "excerpt": "string",
  "platformId": "optional-string",
  "platformName": "optional-string",
  "taskIds": ["string"],
  "minimumPlan": "free",
  "estimatedTime": "optional-string",
  "relatedWorkflowIds": ["optional-string"]
}
```

Unknown JSON fields are ignored. Malformed records and unsupported versions are rejected.

## Builder Safety

Workflow links never run PowerShell. Valid workflow links open the GUI builder in a review/configuration state:

- The mapped platform is preselected when `platformId` matches the local GUI builder registry.
- The first valid task in `taskIds` is selected for review.
- Remaining valid task IDs are highlighted as suggested next tasks.
- Platform and task IDs are always validated against the local desktop registry before use.

Fallbacks:

- Unknown workflow, missing platform, invalid platform, or empty `taskIds`: opens the normal GUI builder chooser with the notice `We couldn't preselect this workflow - pick your platform below.`
- Pro workflow for a Free user: opens the builder, preserves the mapped platform context, and shows the existing upgrade prompt instead of selecting the premium task.
- If a link arrives before sign-in, the workflow ID is stored locally and resumed immediately after successful sign-in.

## Privacy-Safe Analytics

The desktop app keeps the normal `desktop_app_opened` analytics behavior. Deep-link workflow IDs, titles, source URLs, scripts, credentials, user-entered parameters, tokens, machine names, and tenant data are not sent in telemetry.

## Files Changed

- `desktop/deeplink.mjs`
- `desktop/main.mjs`
- `desktop/preload.ts`
- `client/src/env.d.ts`
- `client/src/lib/desktop.ts`
- `client/src/lib/desktop-analytics.ts`
- `client/src/lib/gui-builder-registry.ts`
- `client/src/lib/desktop-workflow-links.ts`
- `client/src/components/gui-builder-tab.tsx`
- `client/src/pages/desktop-workspace.tsx`
- `package.json`
- `tests/desktop-deeplink.test.ts`
- `docs/desktop-workflow-deeplinks.md`

## Local Testing

Focused tests:

```powershell
npm run test:desktop-deeplink
```

Full desktop checks:

```powershell
npm run check
npm run build
npm run desktop:dist:dir
```

After installing a signed production build, test with Windows Run:

```text
psforge://workflow/example-workflow
```

Or PowerShell:

```powershell
Start-Process "psforge://workflow/example-workflow"
```

To test single-instance behavior, leave PSForge Desktop open and run the same command again. The existing window should focus and navigate to the GUI builder workflow state.

## Signing and Installer Notes

The unpacked package check validates Electron Builder configuration, app bundling, and protocol packaging. Actual Windows protocol registry cleanup should be verified with an installed signed NSIS/MSI artifact because registry writes happen during installer execution.

For Microsoft Store release, validate the final signed installer/MSI in a clean Windows profile before submission.

## Website Handoff

Do not enable the website feature flag from this desktop project. After the signed desktop installer containing this implementation is released, it is safe for the website project to enable:

```text
VITE_DESKTOP_DEEPLINK_ENABLED=true
```
