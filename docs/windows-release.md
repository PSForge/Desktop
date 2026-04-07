# PSForge Desktop Windows Release

This project is configured to produce a standard Windows installer and ZIP build for `PSForge Desktop`.

## Why this matters

To reduce Microsoft Defender SmartScreen and antivirus friction, ship the app as a normal signed Windows desktop release:

- Build a stable installer instead of ad-hoc loose files.
- Use a consistent app name, publisher name, icon, and installer format.
- Sign both the installer and the app executable with a trusted RSA code-signing certificate.
- Keep the download URL and file names stable across releases so reputation can build over time.

Microsoft says SmartScreen uses reputation for downloaded apps and files, and a file or publisher with no established reputation can warn users. Microsoft also documents that app signing is important for Smart App Control compliance, and currently calls out RSA-based digital certificates specifically. Electron Builder documents that Windows signing is supported automatically when certificate settings are provided.

Sources:

- [Microsoft Defender SmartScreen overview](https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/)
- [Sign your app for Smart App Control compliance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control)
- [Microsoft Artifact Signing / Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/)
- [electron-builder Windows signing docs](https://www.electron.build/code-signing-win.html)

## Packaging commands

Install dependencies:

```powershell
npm install
```

Generate Windows icon assets:

```powershell
npm run desktop:icons
```

Build Windows release artifacts:

```powershell
npm run desktop:dist
```

Build an unpacked test directory only:

```powershell
npm run desktop:dist:dir
```

Artifacts are written to `release/`.

## Signing setup

For best Windows trust, use one of these:

1. EV code-signing certificate
2. Standard code-signing certificate
3. Microsoft Trusted Signing / Artifact Signing

Important note:

- EV generally improves trust faster.
- Standard certs still work, but SmartScreen reputation may take time.
- Microsoft’s Smart App Control guidance currently says to use RSA-based digital certificates.

### Electron Builder certificate env vars

If you use a `.pfx` or `.p12` certificate locally or in CI, Electron Builder can sign automatically when these environment variables are set:

```powershell
$env:CSC_LINK="C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD="your-password"
```

Then run:

```powershell
npm run desktop:dist
```

## Recommended release hygiene

- Use a real company/publisher identity consistently.
- Avoid changing the app name, publisher, and installer naming every release.
- Publish from your primary domain, ideally `https://www.psforge.app`.
- Keep hashes and release notes on the download page.
- Don’t ship unsigned preview binaries to customers.
- Submit false positives to Microsoft only if you hit a detection after signing and clean packaging.

## Current project setup

This repo now uses:

- Electron Builder for Windows packaging
- `NSIS` installer
- `ZIP` portable release artifact
- generated `build/icon.ico` from `generated-icon.png`
- app id `com.psforge.desktop`
- product name `PSForge Desktop`

## Local packaging vs signed release

The default packaging scripts in this repo intentionally build unsigned Windows artifacts for local verification:

- `npm run desktop:dist`
- `npm run desktop:dist:dir`

That avoids a common Windows packaging failure where Electron Builder tries to unpack its signing helper bundle on machines without symlink privileges.

For customer-facing releases, do not ship those unsigned artifacts. Instead, run the same build in a CI pipeline or signing machine with your code-signing configuration enabled.

## Next recommendation

Before broad release, obtain signing first. Packaging alone helps, but signing is the biggest practical step toward avoiding “unknown app” warnings.
