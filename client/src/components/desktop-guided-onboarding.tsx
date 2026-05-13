import { ArrowRight, Bot, Building2, Cloud, FileSearch, FolderOpen, Mail, MonitorCog, Shield, Smartphone, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type DesktopWorkspaceTab = "script" | "ai" | "gui" | "wizard" | "git" | "troubleshooter";

export type DesktopGuidedWorkflow = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  buttonLabel: string;
  premium: boolean;
  tab: DesktopWorkspaceTab;
  categoryId?: string;
  seedScript?: string;
};

export type DesktopGuidedFocus = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  workflows: DesktopGuidedWorkflow[];
};

export type DesktopGuidedProfile = {
  focusId: string;
  workflowId: string;
  completedAt: string;
  lastUsedAt: string;
};

const focusScriptSeed = (focusTitle: string, taskLine: string) => `# ${focusTitle} starter workflow
# Goal: ${taskLine}
# Notes:
# - Fill in tenant-specific values before running.
# - Use the AI and GUI tabs when you want guided help or faster iteration.

param()

# Start building your ${focusTitle} automation here.
`;

export const DESKTOP_GUIDED_FOCUSES: DesktopGuidedFocus[] = [
  {
    id: "microsoft-365",
    title: "Microsoft 365",
    description: "Reporting, tenant cleanup, and day-to-day cloud admin tasks.",
    icon: Cloud,
    workflows: [
      {
        id: "m365-script-starter",
        title: "Start a Microsoft 365 script outline",
        description: "Open a starter script and begin with your own commands.",
        outcome: "Good for free users who want a quick starting point.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("Microsoft 365", "Build a tenant report or admin automation task"),
      },
      {
        id: "m365-ai-generate",
        title: "Generate a Microsoft 365 script with AI",
        description: "Describe the task in plain English and let PSForge draft it.",
        outcome: "Fastest path from idea to working script.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "m365-troubleshoot",
        title: "Troubleshoot a Microsoft 365 issue",
        description: "Use AI to analyze logs and turn findings into PowerShell fixes.",
        outcome: "Best for mailbox, tenant, or service issues.",
        buttonLabel: "Troubleshoot with AI",
        premium: true,
        tab: "troubleshooter",
      },
    ],
  },
  {
    id: "active-directory",
    title: "Active Directory",
    description: "User lifecycle, groups, permissions, and domain admin automation.",
    icon: Users,
    workflows: [
      {
        id: "ad-gui-library",
        title: "Open Active Directory task library",
        description: "Browse guided AD tasks and generate scripts from forms.",
        outcome: "Great free workflow for repeatable admin tasks.",
        buttonLabel: "Open AD tasks",
        premium: false,
        tab: "gui",
        categoryId: "active-directory",
      },
      {
        id: "ad-ai-generate",
        title: "Generate an AD script with AI",
        description: "Ask for a user, group, or permission workflow and get a draft fast.",
        outcome: "Ideal for custom admin tasks that change often.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "ad-log-troubleshoot",
        title: "Troubleshoot an AD issue",
        description: "Analyze logs and event output for a guided next step.",
        outcome: "Useful for auth issues, replication, and policy errors.",
        buttonLabel: "Troubleshoot with AI",
        premium: true,
        tab: "troubleshooter",
      },
    ],
  },
  {
    id: "intune",
    title: "Intune",
    description: "Device deployment, compliance, app rollout, and endpoint workflows.",
    icon: Smartphone,
    workflows: [
      {
        id: "intune-script-starter",
        title: "Draft an Intune automation script",
        description: "Start from a PowerShell scaffold for deployment or reporting work.",
        outcome: "Free way to begin the workflow before adding Pro help.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("Intune", "Prepare an Intune deployment or device reporting automation"),
      },
      {
        id: "intune-ai-generate",
        title: "Generate this Intune script with AI",
        description: "Use PSForge Pro to draft app deployment, compliance, or inventory scripts.",
        outcome: "Strongest Pro conversion path for endpoint admins.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "intune-pack",
        title: "Unlock all Intune automation tasks",
        description: "Jump into the guided Intune task library and generate scripts from forms.",
        outcome: "Best for repeatable endpoint workflows.",
        buttonLabel: "Open Intune task pack",
        premium: true,
        tab: "gui",
        categoryId: "intune",
      },
    ],
  },
  {
    id: "sccm-mecm",
    title: "SCCM / MECM",
    description: "Configuration Manager reporting, deployment, and device management.",
    icon: MonitorCog,
    workflows: [
      {
        id: "mecm-script-starter",
        title: "Draft a MECM automation script",
        description: "Open a starter script for collection, device, or reporting tasks.",
        outcome: "Free path for admins who want to script manually.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("MECM", "Build a collection, deployment, or reporting automation"),
      },
      {
        id: "mecm-ai-generate",
        title: "Generate a MECM script with AI",
        description: "Create custom Configuration Manager scripts in a guided flow.",
        outcome: "Best for fast script generation from a plain-English task.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "mecm-pack",
        title: "Unlock the MECM task library",
        description: "Browse premium ConfigMgr tasks and build scripts from forms.",
        outcome: "Strong value when you repeat the same admin tasks often.",
        buttonLabel: "Open MECM task pack",
        premium: true,
        tab: "gui",
        categoryId: "mecm",
      },
    ],
  },
  {
    id: "exchange",
    title: "Exchange",
    description: "Mailbox administration, tenant cleanup, and messaging operations.",
    icon: Mail,
    workflows: [
      {
        id: "exchange-script-starter",
        title: "Draft an Exchange automation script",
        description: "Open a starter script for mailbox reporting or admin cleanup work.",
        outcome: "A free way to get moving in the editor.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("Exchange", "Build a mailbox, transport, or tenant cleanup task"),
      },
      {
        id: "exchange-ai-generate",
        title: "Generate an Exchange script with AI",
        description: "Draft mailbox and admin workflows from a plain-English request.",
        outcome: "Strong fit when the task changes every time.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "exchange-pack",
        title: "Unlock Exchange workflow packs",
        description: "Open guided Exchange Online tasks and build scripts faster.",
        outcome: "Best for repeatable mailbox operations.",
        buttonLabel: "Open Exchange task pack",
        premium: true,
        tab: "gui",
        categoryId: "exchange-online",
      },
    ],
  },
  {
    id: "azure",
    title: "Azure",
    description: "Cloud resources, identity, and tenant automation.",
    icon: Building2,
    workflows: [
      {
        id: "azure-script-starter",
        title: "Draft an Azure automation script",
        description: "Open a starter script for infrastructure or identity workflows.",
        outcome: "A free way to start a cloud task immediately.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("Azure", "Build a resource, identity, or tenant automation task"),
      },
      {
        id: "azure-ai-generate",
        title: "Generate an Azure script with AI",
        description: "Describe the resource task and let PSForge draft it.",
        outcome: "Best for custom cloud automation requests.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "azure-pack",
        title: "Unlock Azure automation tasks",
        description: "Browse guided Azure tasks and generate scripts from forms.",
        outcome: "Best for repeatable resource workflows.",
        buttonLabel: "Open Azure task pack",
        premium: true,
        tab: "gui",
        categoryId: "azure-resources",
      },
    ],
  },
  {
    id: "file-system",
    title: "File System",
    description: "Local file automation, audits, cleanup, and scheduled maintenance.",
    icon: FolderOpen,
    workflows: [
      {
        id: "file-system-pack",
        title: "Open file system task library",
        description: "Use the free guided library for file and folder operations.",
        outcome: "Strong free workflow with immediate script output.",
        buttonLabel: "Open file tasks",
        premium: false,
        tab: "gui",
        categoryId: "file-system",
      },
      {
        id: "file-system-ai-generate",
        title: "Generate a file system script with AI",
        description: "Describe cleanup, reporting, or audit logic and get a draft fast.",
        outcome: "Useful for one-off or unusual automation requests.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "file-system-troubleshoot",
        title: "Troubleshoot a file or log issue",
        description: "Use AI to analyze output and recommend fixes.",
        outcome: "Good for script errors and operational debugging.",
        buttonLabel: "Troubleshoot with AI",
        premium: true,
        tab: "troubleshooter",
      },
    ],
  },
  {
    id: "help-desk",
    title: "Help Desk & Troubleshooting",
    description: "Error handling, log analysis, and quick turnaround support work.",
    icon: Wrench,
    workflows: [
      {
        id: "helpdesk-script-starter",
        title: "Open a troubleshooting script starter",
        description: "Start a free remediation script for support work.",
        outcome: "Good for fast manual fixes in the editor.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("Help Desk", "Prepare a remediation or audit script for a support issue"),
      },
      {
        id: "helpdesk-troubleshoot",
        title: "Troubleshoot this issue with AI",
        description: "Upload logs and get likely causes plus PowerShell fixes.",
        outcome: "One of the strongest Pro value moments in the app.",
        buttonLabel: "Troubleshoot with AI",
        premium: true,
        tab: "troubleshooter",
      },
      {
        id: "helpdesk-ai-generate",
        title: "Generate a remediation script with AI",
        description: "Turn a support request into a PowerShell draft in minutes.",
        outcome: "Best for converting repetitive tickets into automation.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
    ],
  },
  {
    id: "general-powershell",
    title: "General PowerShell",
    description: "Blank-canvas scripting, experimentation, and everyday admin work.",
    icon: Shield,
    workflows: [
      {
        id: "general-script-starter",
        title: "Start a blank PowerShell workflow",
        description: "Open the editor with a clean starter scaffold and save locally.",
        outcome: "Best free path for admins who already know what they want to build.",
        buttonLabel: "Open starter script",
        premium: false,
        tab: "script",
        seedScript: focusScriptSeed("PowerShell", "Build a custom automation task from scratch"),
      },
      {
        id: "general-ai-generate",
        title: "Generate a script with AI",
        description: "Tell PSForge what you want and get a script draft instantly.",
        outcome: "Best for turning rough ideas into working automation faster.",
        buttonLabel: "Generate with AI",
        premium: true,
        tab: "ai",
      },
      {
        id: "general-log-troubleshoot",
        title: "Troubleshoot PowerShell output with AI",
        description: "Analyze logs, errors, and script output to find the next fix.",
        outcome: "Great Pro path for debugging and refinement.",
        buttonLabel: "Troubleshoot with AI",
        premium: true,
        tab: "troubleshooter",
      },
    ],
  },
];

export function getDesktopGuidedFocus(focusId: string | null | undefined) {
  return DESKTOP_GUIDED_FOCUSES.find((focus) => focus.id === focusId) || DESKTOP_GUIDED_FOCUSES[0];
}

export function getDesktopGuidedWorkflow(focusId: string | null | undefined, workflowId: string | null | undefined) {
  const focus = getDesktopGuidedFocus(focusId);
  return focus.workflows.find((workflow) => workflow.id === workflowId) || focus.workflows[0];
}

type DesktopGuidedOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFocusId: string;
  selectedWorkflowId: string;
  hasProAccess: boolean;
  onSelectFocus: (focusId: string) => void;
  onSelectWorkflow: (workflowId: string) => void;
  onComplete: () => void;
};

export function DesktopGuidedOnboardingDialog({
  open,
  onOpenChange,
  selectedFocusId,
  selectedWorkflowId,
  hasProAccess,
  onSelectFocus,
  onSelectWorkflow,
  onComplete,
}: DesktopGuidedOnboardingDialogProps) {
  const selectedFocus = getDesktopGuidedFocus(selectedFocusId);
  const selectedWorkflow = getDesktopGuidedWorkflow(selectedFocus.id, selectedWorkflowId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 px-5 pt-5">
          <DialogTitle>What do you need to automate today?</DialogTitle>
          <DialogDescription>
            Pick a focus area, then choose the best starter workflow. PSForge will use this to guide your next steps and surface the right Pro value at the right time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 lg:grid-cols-[1.1fr_1fr] lg:overflow-hidden">
          <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div>
              <div className="text-sm font-semibold">Choose your focus</div>
              <div className="mt-1 text-sm text-muted-foreground">
                We’ll keep the desktop app centered on this type of work until you change it.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DESKTOP_GUIDED_FOCUSES.map((focus) => {
                const Icon = focus.icon;
                const isSelected = focus.id === selectedFocus.id;
                return (
                  <button
                    key={focus.id}
                    type="button"
                    onClick={() => onSelectFocus(focus.id)}
                    className={`rounded-md border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-md p-2 ${isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{focus.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{focus.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div>
              <div className="text-sm font-semibold">Pick a starter workflow</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Free workflows help users get moving. Pro workflows show the fastest path to the result.
              </div>
            </div>
            <div className="space-y-3">
              {selectedFocus.workflows.map((workflow) => {
                const isSelected = workflow.id === selectedWorkflow.id;
                const locked = workflow.premium && !hasProAccess;
                return (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => onSelectWorkflow(workflow.id)}
                    className={`w-full rounded-md border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{workflow.title}</span>
                          {workflow.premium ? (
                            <Badge variant={locked ? "secondary" : "default"}>Pro</Badge>
                          ) : (
                            <Badge variant="outline">Free</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{workflow.description}</div>
                        <div className="mt-3 text-xs text-muted-foreground">{workflow.outcome}</div>
                      </div>
                      {workflow.premium && (
                        <div className={`rounded-full p-2 ${locked ? "bg-amber-500/10 text-amber-300" : "bg-primary/10 text-primary"}`}>
                          {workflow.tab === "ai" ? <Bot className="h-4 w-4" /> : workflow.tab === "troubleshooter" ? <FileSearch className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Selected workflow</CardTitle>
                <CardDescription>{selectedWorkflow.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>{selectedWorkflow.description}</div>
                <div>{selectedWorkflow.outcome}</div>
                {selectedWorkflow.premium && !hasProAccess && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                    This workflow is a Pro experience. We’ll take the user to the exact upgrade path right when they try it.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-background/95 px-5 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button onClick={onComplete}>
            {selectedWorkflow.premium && !hasProAccess ? "Save focus and preview Pro workflow" : "Save focus and open workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DesktopFocusPanelProps = {
  profile: DesktopGuidedProfile | null;
  hasProAccess: boolean;
  onChangeFocus: () => void;
  onStartWorkflow: (workflowId: string) => void;
};

export function DesktopFocusPanel({ profile, hasProAccess, onChangeFocus, onStartWorkflow }: DesktopFocusPanelProps) {
  if (!profile) {
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
        <div className="flex min-w-[180px] flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">No workflow focus selected</div>
            <div className="truncate text-xs text-muted-foreground">Pick a focus once and we'll keep one useful next step close to the editor.</div>
          </div>
        </div>
        <Button size="sm" className="shrink-0 whitespace-nowrap" onClick={onChangeFocus}>Choose Focus</Button>
      </div>
    );
  }

  const focus = getDesktopGuidedFocus(profile.focusId);
  const FocusIcon = focus.icon;
  const workflow = getDesktopGuidedWorkflow(focus.id, profile.workflowId);
  const locked = workflow.premium && !hasProAccess;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FocusIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">Focused on {focus.title}</span>
            <Badge variant={hasProAccess ? "default" : "secondary"} className="text-[10px]">
              {hasProAccess ? "Pro ready" : "Free"}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">{workflow.title} - {workflow.outcome}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={() => onStartWorkflow(workflow.id)}>
          {locked ? "Preview Pro" : workflow.buttonLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onChangeFocus}>Change</Button>
      </div>
    </div>
  );
}
