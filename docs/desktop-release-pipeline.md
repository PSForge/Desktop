# PSForge Desktop Release Pipeline

PSForge Desktop is now set up for a production-style Windows release flow with:

- signed `NSIS` installer output
- `ZIP` portable output
- `electron-updater` auto-update support
- a GitHub Actions Windows release workflow
- the live PSForge update feed at `https://www.psforge.app/api/desktop/updates`

## Live Web Endpoints

The desktop app uses these web-side endpoints:

- `GET /api/desktop/updates/latest.yml` for update metadata
- `GET /api/desktop/updates/:filename` for release artifact downloads
- `GET /api/desktop/version` for the public website version badge
- `GET /api/desktop/download` for the public website installer download button
- `POST /api/desktop/auth` for desktop sign-in and license association
- `GET /api/desktop/license` for periodic subscription validation
- `POST /api/desktop/deauth` for desktop sign-out and token revocation

## What to publish

After building a desktop release, copy these files into the web app's `downloads/` directory and redeploy the website:

- `latest.yml`
- `PSForge-Desktop-Setup-<version>-x64.exe`
- `PSForge-Desktop-Setup-<version>-x64.exe.blockmap`
- `PSForge-Desktop-<version>-x64.zip`

Once deployed, `electron-updater` will poll:

`https://www.psforge.app/api/desktop/updates/latest.yml`

The website `/desktop` page and `/api/desktop/download` endpoint will also reflect the new release.

## GitHub workflow

Workflow file:

`/.github/workflows/release-desktop.yml`

What it does:

- checks out the repo on `windows-latest`
- installs dependencies with `npm ci`
- generates branding/icon assets
- signs through Azure Artifact Signing using the Entra app registration
- builds the signed installer and ZIP
- verifies update metadata exists
- uploads the artifacts to the workflow run
- uploads tagged builds to GitHub Releases

## Required secrets

For Azure login and Artifact Signing:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TRUSTED_SIGNING_ENDPOINT`
- `AZURE_TRUSTED_SIGNING_ACCOUNT`
- `AZURE_TRUSTED_SIGNING_CERT_PROFILE`
- `AZURE_TRUSTED_SIGNING_PUBLISHER_NAME`

The workflow uses the GitHub environment named `production`. The release job still logs in to Azure with OIDC, but `electron-builder`'s Trusted Signing integration also needs an EnvironmentCredential-compatible secret, so `AZURE_CLIENT_SECRET` must be created on the `psforge-desktop-github-actions` app registration and stored as a GitHub Actions secret.

`WINDOWS_CERT_BASE64` and `WINDOWS_CERT_PASSWORD` are not required when using Azure Artifact Signing.

No AWS secrets are required now that updates are served by `www.psforge.app`.

## Recommended release process

1. Bump the app version in `package.json`.
2. Push a tag such as `v1.0.1`.
3. Let GitHub Actions build and sign the Windows release.
4. Download the workflow or GitHub Release artifacts.
5. Copy the four release files into the web app's `downloads/` directory.
6. Redeploy `www.psforge.app`.
7. Test `/api/desktop/version`, `/api/desktop/download`, and in-app `Check Updates`.
8. Test updating from the prior installed version before public rollout.

## Why signing matters

Windows can still warn on unknown installers even when they are legitimate. Signing each release with the same RSA-based publisher identity is the best way to build SmartScreen trust over time.

References:

- [Microsoft Defender SmartScreen overview](https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/)
- [Smart App Control signing guidance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control)
- [electron-builder auto update](https://www.electron.build/auto-update.html)
- [electron-builder Windows signing](https://www.electron.build/code-signing-win.html)
