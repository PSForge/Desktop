# 2.0 Workspace Shell Wireframe

This is the first practical shape for the PSForge Desktop 2.0 interface. It is intended as an implementation guide, not a final visual design.

## Desktop Layout

```text
+--------------------------------------------------------------------------------+
| App title / logo        Active file                         License / Updates   |
+--------+--------------------------------------------------+--------------------+
| Rail   | Script tabs / workspace toolbar                  | Script Intelligence |
|        +--------------------------------------------------+--------------------+
|        |                                                  | Purpose summary     |
| Work   |                                                  | Risk level          |
| Lib    |                                                  | Parameters          |
| Runs   |                  Editor                          | Modules             |
| AI     |                                                  | Validation          |
| Git    |                                                  | Readiness           |
| Sets   |                                                  | Quick actions       |
|        +--------------------------------------------------+--------------------+
|        | Problems | Terminal | Runs | AI Notes | Git                            |
+--------+-----------------------------------------------------------------------+
```

## Primary Areas

### Workspace

Default area for script editing, script tabs, save/open actions, command insertion, validation, and run preparation.

### Library

Command and workflow discovery. This should include platform packs, favorites, recent commands, templates, and workflow cards.

### Runs

Run Center: preflight, parameters, environment profiles, execution settings, transcript paths, stdout/stderr, and runbook export.

### AI

Full AI assistant and generation surface. Contextual AI actions should also appear in the editor, inspector, validation issues, and run results.

### Git

Git status, diff, commit helpers, export bundles, and repository state.

### Settings

Account, license, updates, storage/recovery, theme, keyboard shortcuts, and desktop paths.

## Right Inspector

The right inspector should adapt to the active script and selected context:

- No script: show recent files, starter workflows, and onboarding shortcuts.
- Script open: show Script Intelligence.
- Text selected: show selection actions, explanation, risk, and AI options.
- Validation issue selected: show details and fix actions.
- Run selected: show run summary, transcript, output, and artifacts.

## Bottom Panel

The bottom panel should be collapsible and remember its height:

- Problems: validation and preflight issues.
- Terminal: run output and command logs.
- Runs: recent execution history.
- AI Notes: explanations, recommendations, and applied changes.
- Git: status and diffs.

## First Implementation Slice

The safest first 2.0 slice is to create a new workbench frame around the existing script workspace:

1. Add a left rail component.
2. Add a right inspector placeholder.
3. Add a bottom panel placeholder.
4. Move existing `DesktopScriptWorkbench` into the center pane.
5. Preserve current script tabs, recovery, open/save, auth, and upgrade flows.

This lets the app begin feeling like 2.0 while keeping behavior stable.

## Component Candidates

- `DesktopWorkbenchShell`
- `DesktopWorkbenchRail`
- `DesktopWorkbenchHeader`
- `ScriptIntelligenceInspector`
- `WorkbenchBottomPanel`
- `RunCenterPanel`
- `CommandPalette`

## Early Risks

- `DesktopWorkspace` is already large, so the shell should be introduced by extraction rather than a rewrite.
- The right inspector must not crowd the editor on smaller windows.
- The bottom panel should be useful but easy to collapse.
- Current Pro upgrade and license logic should remain untouched during the first shell pass.
