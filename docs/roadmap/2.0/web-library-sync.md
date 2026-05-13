# PSForge 2.0 Web Library Sync

This is the desktop contract for showing scripts created in the PSForge web app inside the desktop Library.

## Available Now

Desktop can authenticate to the web API with its stored bearer token. The existing auth middleware accepts that token on standard `/api/scripts/*` routes, so desktop can already read scripts that belong to the signed-in web user.

Initial desktop integration uses:

- `GET /api/scripts/user/me` to list the user's web scripts.
- `PATCH /api/scripts/:id/access` to record that a script was opened from desktop.
- `PUT /api/scripts/:id` to save a web-origin script back from desktop after ownership is verified.

Desktop currently needs these fields from each script:

- `id`
- `name`
- `description`
- `content`
- `taskCategory`
- `taskName`
- `isFavorite`
- `lastAccessed`
- `createdAt`
- `updatedAt` when available

## Recommended Web Additions

To make sync feel production-ready, the web app should add or expose:

- `updatedAt` on scripts, so desktop can sort and detect stale local copies.
- `GET /api/scripts/:id` for loading a single fresh script by id.
- `PUT /api/scripts/:id` or `PATCH /api/scripts/:id` for saving edits back from desktop.
- A revision token, content hash, or `updatedAt` precondition so desktop can prevent overwriting newer web edits.
- `GET /api/scripts/sync?since=<timestamp>` for faster incremental refreshes.
- Optional `folder`, `collection`, or `source` fields so scripts can be grouped by customer, tenant, workflow, or origin.
- Tags on list responses, not only detail responses, so Library filtering does not need extra calls.

## Desktop UX Rules

- Library should be the only place for synced web scripts, starter templates, and workflow packs.
- Opening a web script creates a local editor tab and does not overwrite the current draft.
- Access tracking should be best-effort and must not block opening the script.
- Saving back to the web shows conflict guidance when the web copy changed after the desktop tab was opened.
- Offline mode should show the last cached library snapshot once caching is added.

## Security Rules

- Every script endpoint must enforce ownership through the authenticated user id.
- Desktop should never show another user's private scripts, even by direct id.
- Content size limits should be enforced before a script reaches the editor.
- Future shared/team libraries should include visibility labels and owner metadata before desktop displays them.
