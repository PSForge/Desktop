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

## Release checklist

1. Build a signed tagged release.
2. Verify the GitHub Actions artifacts include the MSI.
3. Verify the MSI shows a valid digital signature in Windows file properties.
4. Host the MSI on a stable versioned HTTPS URL.
5. Use that exact versioned URL in the Microsoft Store submission.
