# PSForge Enterprise License Activation

PSForge Enterprise is a desktop-only 2.0.2 build that removes PSForge account sign-in and Stripe billing from the app. The desktop workspace will not open until a product key is activated. After activation, all local desktop features are enabled.

Enterprise builds are local-only for script storage. The app disables PSForge web Library/cloud storage, web script sync, favorites, and account-connect prompts. Local file open/save, recent local files, recovery, starters, AI tools, Git tooling, and the rest of the desktop capabilities remain available.

## Build

```powershell
npm run desktop:dist:enterprise
```

The build sets `VITE_PSFORGE_EDITION=enterprise` for the renderer and `PSFORGE_EDITION=enterprise` for Electron.

## Updates

PSForge Enterprise uses Electron's built-in `electron-updater` flow, but it must use a separate feed from the standard desktop app.

Runtime update feeds:

- Standard Desktop: `https://www.psforge.app/api/desktop/updates`
- Enterprise Desktop: `https://www.psforge.app/api/desktop/enterprise-updates`

Each feed can serve its own `latest.yml`; the filename does not need to change as long as the endpoint/folder is separate. Keep the Enterprise artifacts together:

```text
enterprise-updates/latest.yml
enterprise-updates/PSForge-Enterprise-Setup-2.0.3-x64.exe
enterprise-updates/PSForge-Enterprise-Setup-2.0.3-x64.exe.blockmap
enterprise-updates/PSForge-Enterprise-2.0.3-x64.zip
enterprise-updates/PSForge-Enterprise-2.0.3-x64.msi
```

Update behavior:

- The app checks for updates about 7 seconds after startup, then every 4 hours.
- Updates download automatically.
- Users are prompted to restart once the update is downloaded.
- If they choose Later, the update installs when the app closes.
- The MSI is for enterprise deployment tools; the in-app updater uses the signed NSIS `.exe` and `.blockmap`.

Recommended Enterprise update release process:

1. Bump `package.json` from `2.0.2` to the next version.
2. Run the GitHub workflow `Release PSForge Desktop` with `edition = enterprise`.
3. Publish the signed Enterprise `latest.yml`, `.exe`, `.exe.blockmap`, `.zip`, and `.msi` to the Enterprise update/download location.
4. Confirm `https://www.psforge.app/api/desktop/enterprise-updates/latest.yml` returns the Enterprise metadata.
5. Launch an older Enterprise install and use **Check for Updates** to confirm it sees only Enterprise builds.

## Enterprise Deployment Parameters

The Enterprise app accepts product-key activation values from environment variables or launch parameters.

```powershell
.\PSForge Enterprise.exe --enterprise-license-key=PSF-ENT-XXXX-XXXX-XXXX --enterprise-silent
```

Optional custom license server:

```powershell
.\PSForge Enterprise.exe --enterprise-license-key=PSF-ENT-XXXX-XXXX-XXXX --enterprise-license-server=https://licenses.example.com --enterprise-silent
```

Supported environment variables:

- `PSFORGE_ENTERPRISE_LICENSE_KEY`
- `PSFORGE_ENTERPRISE_LICENSE_URL`

Supported parameters:

- `--enterprise-license-key=...`
- `--psforge-license-key=...`
- `/enterpriseLicenseKey=...`
- `/psforgeLicenseKey=...`
- `--enterprise-license-server=...`
- `--psforge-license-server=...`
- `/enterpriseLicenseServer=...`
- `/psforgeLicenseServer=...`
- `--enterprise-silent`
- `/enterpriseSilent`

For Intune, SCCM, or similar tools, install the MSI/EXE normally, then assign the license using HKLM registry values or a ProgramData config file. The app reads deployment-supplied license values on first launch and activates before opening the workspace.

## SCCM / Intune Silent Install

Install only:

```cmd
msiexec /i "PSForge-Enterprise-2.0.2-x64.msi" /qn /norestart ALLUSERS=1
```

Install and assign license using HKLM registry values:

```cmd
msiexec /i "PSForge-Enterprise-2.0.2-x64.msi" /qn /norestart ALLUSERS=1
reg add "HKLM\Software\PSForge\Enterprise" /v LicenseKey /t REG_SZ /d "PSF-ENT-XXXX-XXXX-XXXX" /f
reg add "HKLM\Software\PSForge\Enterprise" /v LicenseServerUrl /t REG_SZ /d "https://www.psforge.app" /f
reg add "HKLM\Software\PSForge\Enterprise" /v Silent /t REG_SZ /d "true" /f
```

PowerShell deployment script:

```powershell
$MsiPath = Join-Path $PSScriptRoot "PSForge-Enterprise-2.0.2-x64.msi"
$LicenseKey = "PSF-ENT-XXXX-XXXX-XXXX"
$LicenseServerUrl = "https://www.psforge.app"

Start-Process msiexec.exe -ArgumentList @(
  "/i", "`"$MsiPath`"",
  "/qn",
  "/norestart",
  "ALLUSERS=1"
) -Wait -NoNewWindow

New-Item -Path "HKLM:\Software\PSForge\Enterprise" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\Software\PSForge\Enterprise" -Name "LicenseKey" -Type String -Value $LicenseKey
Set-ItemProperty -Path "HKLM:\Software\PSForge\Enterprise" -Name "LicenseServerUrl" -Type String -Value $LicenseServerUrl
Set-ItemProperty -Path "HKLM:\Software\PSForge\Enterprise" -Name "Silent" -Type String -Value "true"
```

Alternative ProgramData config file:

```powershell
$ConfigDirectory = "C:\ProgramData\PSForge\Enterprise"
New-Item -ItemType Directory -Path $ConfigDirectory -Force | Out-Null
@{
  licenseKey = "PSF-ENT-XXXX-XXXX-XXXX"
  licenseServerUrl = "https://www.psforge.app"
  silent = $true
} | ConvertTo-Json | Set-Content -Path "$ConfigDirectory\activation.json" -Encoding UTF8
```

Detection rule examples:

- MSI product installed: detect product code from the generated MSI in your packaging console.
- File exists: `%ProgramFiles%\PSForge Enterprise\PSForge Enterprise.exe`
- Registry exists: `HKLM\Software\PSForge\Enterprise\LicenseKey`

## Activation Endpoint

`POST /api/enterprise/desktop/activate`

Request:

```json
{
  "licenseKey": "PSF-ENT-XXXX-XXXX-XXXX",
  "deviceId": "win32-8b0f0f46-....",
  "machineName": "renderer supplied device hint",
  "appVersion": "2.0.2",
  "edition": "enterprise"
}
```

Success response:

```json
{
  "valid": true,
  "activationToken": "signed-enterprise-activation-token",
  "license": {
    "licenseId": "lic_123",
    "licenseKeySuffix": "XXXX",
    "organizationName": "Example Corp",
    "plan": "PSForge Enterprise",
    "status": "active",
    "validUntil": "2027-05-15T00:00:00.000Z",
    "refreshAfter": "2026-05-16T00:00:00.000Z",
    "features": ["all"]
  }
}
```

Failure response:

```json
{
  "valid": false,
  "error": "Product key is invalid, expired, revoked, or seat limit has been reached."
}
```

## Validation Endpoint

`POST /api/enterprise/desktop/validate`

Request:

```json
{
  "activationToken": "signed-enterprise-activation-token",
  "deviceId": "win32-8b0f0f46-....",
  "appVersion": "2.0.2",
  "edition": "enterprise"
}
```

Return the same response shape as activation. If the license is revoked, expired, or the device is no longer allowed, return `401` or `403` with a JSON error.

## Auth For Web-Backed Features

After activation, the Enterprise app sends:

```http
Authorization: Bearer signed-enterprise-activation-token
X-Device-Id: win32-8b0f0f46-....
```

to remote API calls such as validation, AI optimization, AI troubleshooting, CLI explain, script metrics, and other `/api/...` requests. The `X-Device-Id` value is the same device id sent during activation. The web server should treat a valid Enterprise activation token and matching device id as a fully licensed desktop principal with access equivalent to PSForge Pro/Admin for feature gates.

Minimum server behavior:

- Verify the activation token signature or look it up server-side.
- Confirm `deviceId` is still assigned to the license.
- Reject bearer auth when `X-Device-Id` is missing or does not match the token/device binding.
- Confirm `status` is `active`.
- Enforce seat/device limits during activation.
- Track `activatedAt`, `lastSeenAt`, `appVersion`, and device metadata.
- Return JSON errors rather than HTML pages.

Recommended token claims:

```json
{
  "typ": "psforge-enterprise-activation",
  "licenseId": "lic_123",
  "organizationId": "org_123",
  "deviceId": "win32-8b0f0f46-....",
  "features": ["all"],
  "iat": 1778846400000,
  "exp": 1810382400000
}
```

The desktop app schedules `/api/enterprise/desktop/validate` after the returned `license.refreshAfter` timestamp. A `401` or `403` validation response clears the cached activation and returns the app to the Enterprise activation screen.
