# PSForge Desktop 2.0 Design Backlog

## Must Explore

- Unified workbench shell with left rail, center workspace, right inspector, and bottom panel.
- Script Intelligence inspector for summary, risk, modules, parameters, validation, and readiness.
- Run Center for preflight, execution, transcripts, and run history.
- Command palette for keyboard-first actions.
- Richer command library with platform packs and command metadata.
- Better onboarding based on user intent.

## Visual Improvements

- Refined app chrome and header hierarchy.
- Cleaner panel borders, surface contrast, and density.
- Stronger empty states for no script, no run history, no Git repository, and no recent files.
- Purposeful platform pack visuals.
- Better icon-only buttons with tooltips.
- Reduced nested card usage in dense tool surfaces.
- Better status badges for Pro, license, update, validation, and run state.

## Workflow Improvements

- Pin validation and risk summaries near the editor.
- Let users jump from validation issue to fix action.
- Keep AI explanation and optimization available from selected text.
- Preserve and reuse run environment profiles.
- Make recent files feel like a first-class desktop feature.
- Add quick actions for opening transcript folders and generated artifacts.
- Add a clearer upgrade path without blocking free desktop value.

## Technical Investigation

- Determine how much of the current `DesktopWorkspace` can be preserved while introducing a new shell.
- Split large workspace components into smaller layout, inspector, rail, run, and editor modules.
- Create a stable data shape for script intelligence output.
- Centralize local storage keys and persistence helpers for 2.0 workspace state.
- Evaluate whether Monaco editor capabilities can support richer inline actions.
- Identify which workflows need server APIs versus local-only desktop behavior.

## Open Product Questions

- Should 2.0 introduce a project/workspace file concept, or remain script-tab based?
- Should Run Center be a global view, bottom panel, or both?
- Should the command palette use `Ctrl+K`, `Ctrl+Shift+P`, or support both?
- Which platform packs should be first-class at launch?
- Which contextual AI actions should be free, Pro-only, or mixed?
- How much visual forge branding should appear inside the actual workbench?
