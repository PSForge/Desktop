# Azure workflow integration

## Scope

This integration moves the validated Azure signing and storage configuration to
`main` without merging the 3.0 application or Enterprise packaging changes.
`main` remains Standard-only and retains its existing application version.
Use the 3.0 release branch for the tested 3.0 builds until that application is
integrated separately. Do not publish an older version from `main` as a new release.

## Configuration

- Production secrets: `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET`.
- Tenant: `450dfae7-02af-4d2b-8c83-0b2a1e2bcd05`.
- Subscription: `306ed9ad-e561-4c31-ae43-5d1267d263cf`.
- Signing resource group: `PSForge_Desktop`.
- Signing account/profile: `psforgedesktopsigning` / `PSForgeDesktopSigning`.
- Endpoint: `https://eus.codesigning.azure.net`.
- Publisher: `IsaiahBlacknall LLC`.
- Storage: `psforgedownloads02`, container `store-packages`.

The remaining configuration is explicit in the workflow. Old configuration
secrets cannot override these values. Existing Azure resources are left intact.

## Safe testing

Dispatch with `test_only = true` to use the production identity while uploading
under `migration-tests/<run-id>/<attempt>/psforge/<version>/`. GitHub release
publication is disabled in this mode, including dispatches from a tag.
Test installers and metadata must not be promoted to the website or Store.

The workflow validates the Public Trust signing profile, installer signatures
and publisher, and the anonymous MSI download's SHA256 against the signed build.
It accepts flattened Azure CLI resource properties and removes the unsupported
combined `ExcludeCredentials` argument from the signing invocation.

## Validation evidence

- [Standard 3.0 test #29](https://github.com/PSForge/Desktop/actions/runs/39034676242): passed on the release branch.
- [Enterprise 3.0 test #30](https://github.com/PSForge/Desktop/actions/runs/39041581138): passed on the release branch.
- On 2026-10-17 the owner confirmed that installs are good and authorized proceeding.
  This is user-reported installation acceptance, not an automated clean-install or upgrade test.
- Neither run published a production GitHub release or overwrote production installers.

Application integration, version selection, Store submission, and retirement of
old Azure resources are separate release actions.
