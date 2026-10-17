# Azure release tenant migration

Prepared 2026-10-13; updated 2026-10-17 during live workflow validation.

## Configured release identity

- Application: `psforge-desktop-github-actions`
- Client ID: `1f6d5df5-3654-493c-8584-2771fd87c416`
- Service principal object ID: `7a6d7fab-c751-49fd-94ee-4a786226d152`
- GitHub `production` environment contains the new client ID and secret. No secret value is stored in this repository.
- Federated credential `github-production` uses subject `repo:PSForge/Desktop:environment:production`, issuer `https://token.actions.githubusercontent.com`, and audience `api://AzureADTokenExchange`.
- Reader is assigned on `psforgedesktopsigning`; Artifact Signing Certificate Profile Signer is assigned on its `PSForgeDesktopSigning` profile; Storage Blob Data Contributor is assigned on `psforgedownloads02/blobServices/default/containers/store-packages`.
- The Public Trust profile is active. OIDC login and live signing-resource checks have passed in GitHub Actions.

Validation found and corrected two workflow compatibility issues: Azure CLI flattens resource properties, and `Invoke-TrustedSigning` does not accept the combined `ExcludeCredentials` parameter. Signing now uses the standard credential chain with the configured application credentials available.

## Validation result

[Standard-edition isolated test #29](https://github.com/PSForge/Desktop/actions/runs/39034676242) succeeded on 2026-10-17 using commit `8e603d7` on `codex-release-2.0.2-store-rc`, with `test_only = true` and `migration_test = false`.

Passed: OIDC login, signing-profile validation, signed Windows build, EXE/MSI signature verification, MSI upload, anonymous download/hash verification, update metadata validation, and workflow artifact upload. GitHub release publication was skipped as intended. Existing release paths and old Azure resources were not changed.

[Enterprise-edition isolated test #30](https://github.com/PSForge/Desktop/actions/runs/39041581138) also succeeded on 2026-10-17 using commit `5cd4a21` on `codex-release-2.0.2-store-rc`, with `edition = enterprise`, `test_only = true`, and `migration_test = false`.

The Enterprise run passed OIDC login, signing-profile validation, signed Windows packaging, EXE/MSI signature verification, MSI upload, anonymous download/hash verification, Enterprise update artifact checks, and workflow artifact upload. GitHub release publication was skipped. Its MSI upload uses the isolated `migration-tests/39041581138/1/psforge-enterprise/3.0.0/` path.

Both editions' release pipelines are now validated against the new Azure account. This is not a Store submission or installed-app smoke test: clean-install/upgrade checks remain separate release checks. The tested workflow is on the release branch; `main` was not updated by this work.

## Current boundary

The owner reports the Azure migration is complete. The workflow now targets the new tenant, subscription, signing account, profile, and storage directly. No old Azure resources are modified or removed by this change.

Normal tag and manual releases use `production`. A manual `migration_test = true` run still uses the separate `production-migration` environment and isolated upload paths. Both modes target the new Azure resources.

## Target configuration

Only `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are GitHub **environment secrets**. All other values below are explicit workflow job environment settings, so old GitHub configuration secrets cannot override the migrated resources.

| Setting | Target value |
| --- | --- |
| AZURE_CLIENT_ID | New Entra application client ID, supplied through GitHub secrets |
| AZURE_TENANT_ID | 450dfae7-02af-4d2b-8c83-0b2a1e2bcd05 |
| AZURE_SUBSCRIPTION_ID | 306ed9ad-e561-4c31-ae43-5d1267d263cf |
| AZURE_CLIENT_SECRET | New application secret value, supplied through GitHub secrets |
| AZURE_TRUSTED_SIGNING_RESOURCE_GROUP | PSForge_Desktop |
| AZURE_TRUSTED_SIGNING_ENDPOINT | https://eus.codesigning.azure.net |
| AZURE_TRUSTED_SIGNING_ACCOUNT | psforgedesktopsigning |
| AZURE_TRUSTED_SIGNING_CERT_PROFILE | PSForgeDesktopSigning |
| AZURE_TRUSTED_SIGNING_PUBLISHER_NAME | IsaiahBlacknall LLC |

`AZURE_STORE_STORAGE_ACCOUNT` is fixed to `psforgedownloads02` in the workflow. GitHub repository/environment variables no longer override it.

Subscription display name: Azure subscription 1. Region: East US. Signing SKU: Basic.

Storage container: `store-packages`. Target base URL: `https://psforgedownloads02.blob.core.windows.net/store-packages/`. The handoff reports all 13 blobs copied with `psforge/...` and `psforge-enterprise/...` paths preserved. Blob anonymous reads are enabled; `$logs` must stay private.

## Identity and access prerequisites

1. Wait for Microsoft organization validation approval, then create the Public Trust profile `PSForgeDesktopSigning` for IsaiahBlacknall LLC.
2. Create an Entra application and service principal in the target tenant. Create its client secret and store the value directly in GitHub environment secrets; never commit or log it. Record expiration in the credential management process.
3. For optional isolated tests, create a GitHub environment named `production-migration`, with appropriate branch restrictions and reviewers. Set its `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` to the new application's credentials. Production needs these same two credentials in its own environment.
4. Add an OIDC federated credential with issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`, and subject `repo:PSForge/Desktop:environment:production-migration`.
5. Add a separate federated credential for the eventual cutover with subject `repo:PSForge/Desktop:environment:production`. Subjects are case-sensitive and must match the actual repository/environment names.
6. Assign the service principal **Artifact Signing Certificate Profile Signer** scoped to the new certificate profile. Assign **Reader** on the signing account so the workflow can inspect account location and profile properties.
7. Assign the service principal **Storage Blob Data Contributor** on the target `store-packages` container. Azure login uses OIDC, and the upload uses `--auth-mode login`; no storage key is required.

The human Identity Verifier assignment on Isaiah@PSForge.onmicrosoft.com does not grant the service principal signing access. OIDC authenticates Azure CLI operations; the existing electron-builder signing integration separately uses the application's client secret through EnvironmentCredential.

## Migration test

For a post-cutover test of the actual production credentials, dispatch with `test_only = true` and `migration_test = false`. This uses `production` with the same isolated upload paths and disabled release publication described below. It does not require a `production-migration` environment or another OIDC credential. Use `migration_test = true` only when intentionally testing that separate environment. Both options default to false.

After prerequisites are complete and the prepared workflow is available on GitHub:

1. Manually dispatch Release PSForge Desktop from the reviewed revision with `edition = standard` and `migration_test = true`.
2. Confirm the target tenant guard passes, account/profile provisioning is Succeeded, and profile type is PublicTrust.
3. Confirm EXE/MSI Authenticode signatures are valid and identify IsaiahBlacknall LLC.
4. Confirm upload and anonymous download hash verification succeed. Test uploads use `migration-tests/<run-id>/<attempt>/psforge/<version>/...`, never existing release paths. These files are publicly readable; do not use customer data in builds.
5. Download workflow artifacts and test clean installation and upgrade from the currently deployed version, including settings preservation and normal app startup.
6. Repeat with `edition = enterprise`; test uploads use the same isolated prefix with `psforge-enterprise` inside it.

Migration tests never publish GitHub release assets, even when manually dispatched from a tag. They still produce update metadata as workflow artifacts; do not deploy that metadata or test URLs to the website or Partner Center.

## Production cutover and recovery

Pause release dispatches during the coordinated configuration change. Preserve the old values in the existing credential management system because GitHub cannot reveal stored secret values later.

Set `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` in `production` to the tested new application's credentials. Ensure the production OIDC credential exists. The reviewed workflow supplies the remaining target configuration directly. Resume releases only when the complete configuration is in place.

Run the next approved, newly versioned production release. Standard paths remain `psforge/<version>/<MSI>`; Enterprise paths remain `psforge-enterprise/<version>/<MSI>`. Update Partner Center package URLs and any website download references separately. The GitHub workflow does not submit to Partner Center or deploy the website.

Copied blobs do not redirect old URLs. Keep old storage serving existing links until consumers are migrated. Keep the old signing account intact until the new certificate profile and GitHub release test succeed; retire resources only under a separate approved cleanup.

An isolated test does not publish production artifacts. If cutover fails, stop release dispatches and restore both the previous workflow configuration and matching old production credentials before retrying. Restoring secrets alone does not revert the explicit target values in the new workflow. A configuration rollback does not undo already published artifacts or Store submissions.

## References

- [Artifact Signing resources and roles](https://learn.microsoft.com/en-us/azure/artifact-signing/concept-resources-roles)
- [Azure login with GitHub OIDC](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect)
- [GitHub OIDC in Azure](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure)
