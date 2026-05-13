# PSForge Desktop 2.0 Experience Revamp

## Workspace Shell

Replace the current feature-tab feeling with a unified workbench layout:

- Left rail for primary areas: Workspace, Library, AI, Runs, Git, Settings.
- Center pane for the active editor, workflow, or builder.
- Right inspector for script intelligence, validation, parameters, metadata, and readiness.
- Bottom panel for terminal output, run history, problems, AI notes, and Git details.

The current tabs can evolve into workspace modes, but the user should feel like they are staying inside one coherent environment.

## Script Intelligence Panel

Add a persistent or toggleable inspector that summarizes the active script:

- Plain-English purpose
- Parameters and default values
- Required modules
- Detected platforms or services
- Risk level
- Destructive operation warnings
- Elevation needs
- Missing error handling
- Missing `SupportsShouldProcess`
- Comment-based help status
- Run readiness checklist

This panel can combine existing validation, workbench analysis, and future AI enhancement.

## Command And Workflow Library

Make the command library richer and more visually useful:

- Platform packs for Microsoft 365, Intune, Active Directory, Azure, Security, VMware, Help Desk, and Windows Server.
- Command cards with required module, risk level, parameter count, common use case, and Pro/free status.
- Search results grouped by platform.
- Favorites and recently used commands pinned near the top.
- Compact and expanded view modes.
- Team-curated workflows that insert scripts, not just commands.

## Run Center

Create a dedicated execution preparation and history surface:

- Standard, dry-run, and report-only modes.
- Elevated run warnings.
- Parameter preview.
- Environment profile selection.
- Transcript capture status.
- Preflight validation summary.
- Before-run and after-run notes.
- Run history with stdout, stderr, exit code, duration, transcript path, and generated artifacts.
- Export runbook from successful runs.

The Run Center should make PSForge feel safer than running scripts from a plain terminal.

## Contextual AI

Move AI assistance closer to the user action:

- Explain selected block.
- Harden this script.
- Add logging.
- Add comment-based help.
- Add parameter validation.
- Convert to advanced function.
- Generate rollback plan.
- Create runbook.
- Fix validation issue.
- Explain failed run output.
- Compare two script versions.

The AI tab can remain for full conversations, but 2.0 should make the best AI actions available inside the editor, validation panel, and Run Center.

## Visual Polish

Refine the look without making the app decorative:

- More distinct workspace chrome, editor surfaces, inspectors, and bottom panels.
- More disciplined card usage, especially avoiding card-in-card layouts.
- Clearer icon system with tooltips for icon-only actions.
- Better empty states with purposeful PSForge visuals.
- Refined splash and loading experience.
- Platform pack artwork that helps orient users without overwhelming the interface.
- Slightly richer accent system using PowerShell blue, validation green, warning amber, destructive red, and subtle forge gold.

## Onboarding

Turn first-run onboarding into a job-to-be-done selector:

- Build a help desk automation.
- Clean up Active Directory.
- Generate an Intune script.
- Troubleshoot a Windows endpoint.
- Review a risky PowerShell script.
- Start from a blank editor.

The selected path should open the relevant workspace, starter commands, templates, and safety checks.

## Command Palette

Add a `Ctrl+K` command palette for high-frequency actions:

- New script
- Open recent file
- Save as
- Search commands
- Run dry-run
- Generate header
- Explain selected block
- Fix validation issue
- Export bundle
- Open transcript folder
- Check for updates
- Manage license

This will make 2.0 feel faster and more professional for repeat users.
