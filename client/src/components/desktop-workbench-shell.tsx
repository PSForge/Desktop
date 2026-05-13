import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  CheckCircle2,
  Clipboard,
  Clock3,
  Code2,
  FileCode,
  FileOutput,
  FolderOpen,
  GitBranch,
  History,
  LayoutGrid,
  ListChecks,
  PackageCheck,
  Replace,
  Save,
  Search,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wand2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { openDesktopPath } from "@/lib/desktop";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import type { ScriptWorkbenchAnalysis } from "@/lib/script-workbench-utils";
import type { DesktopRunHistorySummary } from "@/components/desktop-script-workbench";

type WorkbenchArea = "script" | "ai" | "gui" | "wizard" | "git" | "troubleshooter";

type UpdateState = {
  state: string;
  version?: string;
  percent?: number;
  message?: string;
};

type BottomPanelTab = "workspace" | "problems" | "runs" | "ai" | "git";
type WorkbenchPreferences = {
  bottomPanelTab?: BottomPanelTab;
  detailsDrawerOpen?: boolean;
};
type CommandPaletteAction = {
  label: string;
  shortcut?: string;
  icon: typeof FileCode;
  run: () => void;
  disabled?: boolean;
};

export type DesktopWorkbenchRecentFile = {
  fileName: string;
  filePath?: string;
  openedAt: string;
};

interface DesktopWorkbenchShellProps {
  logoSrc: string;
  desktopVersion: string;
  accessLabel: string;
  hasProAccess: boolean;
  updateState: UpdateState;
  activeArea: WorkbenchArea;
  currentFileName: string;
  isDirty: boolean;
  analysis: ScriptWorkbenchAnalysis;
  recentFilesCount: number;
  recentFiles: DesktopWorkbenchRecentFile[];
  runHistorySummary: DesktopRunHistorySummary;
  children: ReactNode;
  onAreaChange: (area: WorkbenchArea) => void;
  onNewScript: () => void;
  onOpenScript: () => void;
  onSaveScript: () => void;
  onSaveAs: () => void;
  onManageLicense: () => void;
  onCheckForUpdates: () => void;
  onOpenRecentFiles: () => void;
  onOpenRunTools: () => void;
  onRerunLastRun: () => void;
  onRunPreflight: () => void;
  onRunAiReview: () => void;
  onOpenHeaderGenerator: () => void;
  onOpenPlaceholderTool: () => void;
  onOpenWorkbenchReview: () => void;
}

const railItems: Array<{
  value: WorkbenchArea;
  label: string;
  icon: typeof FileCode;
}> = [
  { value: "script", label: "Work", icon: FileCode },
  { value: "gui", label: "Library", icon: LayoutGrid },
  { value: "troubleshooter", label: "Logs", icon: Wrench },
  { value: "ai", label: "AI", icon: Bot },
  { value: "git", label: "Git", icon: GitBranch },
  { value: "wizard", label: "Wizard", icon: Wand2 },
];

const WORKBENCH_PREFS_KEY = "psforge-workbench-preferences";

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readWorkbenchPreferences(): WorkbenchPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  return safeJsonParse<WorkbenchPreferences>(window.localStorage.getItem(WORKBENCH_PREFS_KEY), {});
}

function formatRunTimestamp(value?: string) {
  if (!value) {
    return "No runs yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRunDuration(durationMs?: number) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return "Unknown";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function getRiskLabel(analysis: ScriptWorkbenchAnalysis) {
  if (analysis.issues.some((issue) => issue.severity === "critical")) {
    return { label: "High attention", variant: "destructive" as const };
  }

  if (analysis.issues.some((issue) => issue.severity === "warning")) {
    return { label: "Review suggested", variant: "secondary" as const };
  }

  if (analysis.issues.length > 0) {
    return { label: "Notes available", variant: "outline" as const };
  }

  return { label: "Looks calm", variant: "default" as const };
}

function formatUpdateLabel(updateState: UpdateState) {
  if (updateState.state === "downloaded") {
    return "Update ready";
  }
  if (updateState.state === "downloading" && typeof updateState.percent === "number") {
    return `Updating ${Math.round(updateState.percent)}%`;
  }
  if (updateState.state === "available") {
    return updateState.version ? `Update ${updateState.version}` : "Update available";
  }
  if (updateState.state === "checking") {
    return "Checking updates";
  }
  return "Check updates";
}

function getSeverityClasses(severity: "critical" | "warning" | "info") {
  if (severity === "critical") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (severity === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-sky-500/30 bg-sky-500/10 text-sky-200";
}

export function DesktopWorkbenchShell({
  logoSrc,
  desktopVersion,
  accessLabel,
  hasProAccess,
  updateState,
  activeArea,
  currentFileName,
  isDirty,
  analysis,
  recentFilesCount,
  recentFiles,
  runHistorySummary,
  children,
  onAreaChange,
  onNewScript,
  onOpenScript,
  onSaveScript,
  onSaveAs,
  onManageLicense,
  onCheckForUpdates,
  onOpenRecentFiles,
  onOpenRunTools,
  onRerunLastRun,
  onRunPreflight,
  onRunAiReview,
  onOpenHeaderGenerator,
  onOpenPlaceholderTool,
  onOpenWorkbenchReview,
}: DesktopWorkbenchShellProps) {
  const { toast } = useToast();
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>(() => readWorkbenchPreferences().bottomPanelTab || "workspace");
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(() => readWorkbenchPreferences().detailsDrawerOpen ?? false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const risk = getRiskLabel(analysis);
  const lastRun = runHistorySummary.lastRun;
  const criticalIssues = analysis.issues.filter((issue) => issue.severity === "critical").length;
  const warningIssues = analysis.issues.filter((issue) => issue.severity === "warning").length;
  const checkedItems = analysis.checklist.filter((item) => item.checked).length;
  const totalChecklistItems = analysis.checklist.length;
  const hasIssues = analysis.issues.length > 0;
  const openBottomPanelTab = (tab: BottomPanelTab) => {
    setBottomPanelTab(tab);
    setDetailsDrawerOpen(true);
  };
  const commandGroups = useMemo(
    () => {
      const groups: Array<{ heading: string; actions: CommandPaletteAction[] }> = [
        {
          heading: "File",
          actions: [
          { label: "New Script", shortcut: "Ctrl N", icon: FileCode, run: onNewScript },
          { label: "Open Script", shortcut: "Ctrl O", icon: FolderOpen, run: onOpenScript },
          { label: "Save Script", shortcut: "Ctrl S", icon: Save, run: onSaveScript },
          { label: "Save As", shortcut: "Ctrl Shift S", icon: Save, run: onSaveAs },
          { label: "Open Recent Files", shortcut: "Ctrl Alt O", icon: History, run: onOpenRecentFiles },
          ...recentFiles.slice(0, 3).map((file) => ({
            label: `Recent: ${file.fileName}`,
            icon: History,
            run: onOpenRecentFiles,
          })),
          ],
        },
        {
          heading: "Run",
          actions: [
          { label: "Run Script", shortcut: "Ctrl R", icon: TerminalSquare, run: onOpenRunTools },
          { label: "Rerun Last Setup", icon: TerminalSquare, run: onRerunLastRun, disabled: !lastRun },
          { label: "Run Preflight", shortcut: "Ctrl Alt P", icon: ShieldCheck, run: onRunPreflight },
          { label: "Open Run Center", icon: TerminalSquare, run: () => openBottomPanelTab("runs") },
          { label: "Open Last Transcript", icon: FileOutput, run: () => void openLastRunPath(lastRun?.transcriptPath, "transcript"), disabled: !lastRun?.transcriptPath },
          { label: "Open Last Run Folder", icon: FolderOpen, run: () => void openLastRunPath(lastRun?.runDirectory, "run folder"), disabled: !lastRun?.runDirectory },
          { label: "Copy Last STDOUT", icon: Clipboard, run: () => void copyRunOutput("stdout", lastRun?.stdout), disabled: !lastRun?.stdout?.trim() },
          { label: "Copy Last STDERR", icon: Clipboard, run: () => void copyRunOutput("stderr", lastRun?.stderr), disabled: !lastRun?.stderr?.trim() },
          { label: "Explain Last Failure With AI", icon: Sparkles, run: onRunAiReview, disabled: !lastRun || (lastRun.ok && lastRun.exitCode === 0) },
          ],
        },
        {
          heading: "Script Tools",
          actions: [
          { label: "Run AI Review", shortcut: "Ctrl Alt A", icon: Sparkles, run: onRunAiReview },
          { label: "Open Workbench Review", shortcut: "Ctrl Alt W", icon: ShieldAlert, run: onOpenWorkbenchReview },
          { label: "Generate Header", shortcut: "Ctrl Alt H", icon: ScrollText, run: onOpenHeaderGenerator },
          { label: "Replace Placeholders", shortcut: "Ctrl Alt R", icon: Replace, run: onOpenPlaceholderTool },
          { label: "Show Script Intelligence", icon: ListChecks, run: () => openBottomPanelTab("ai") },
          ],
        },
        {
          heading: "Navigation",
          actions: [
          { label: "Open Script Workspace", icon: FileCode, run: () => onAreaChange("script") },
          { label: "Open Command Library", icon: LayoutGrid, run: () => onAreaChange("gui") },
          { label: "Open Wizard", icon: Wand2, run: () => onAreaChange("wizard") },
          { label: "Open AI Workspace", icon: Bot, run: () => onAreaChange("ai") },
          { label: "Open Git Workspace", icon: GitBranch, run: () => onAreaChange("git") },
          { label: "Open Log Troubleshooter", icon: Wrench, run: () => onAreaChange("troubleshooter") },
          { label: "Show Workspace Details", icon: BriefcaseBusiness, run: () => openBottomPanelTab("workspace") },
          { label: "Show Problems", icon: ShieldAlert, run: () => openBottomPanelTab("problems") },
          { label: "Show Script Intelligence", icon: Sparkles, run: () => openBottomPanelTab("ai") },
          { label: "Show Git Details", icon: GitBranch, run: () => openBottomPanelTab("git") },
          { label: detailsDrawerOpen ? "Collapse Details Drawer" : "Open Details Drawer", icon: ChevronDown, run: () => setDetailsDrawerOpen((current) => !current) },
          ],
        },
        {
          heading: "App",
          actions: [
          { label: hasProAccess ? "Manage Pro Access" : accessLabel, icon: Settings, run: onManageLicense },
          { label: formatUpdateLabel(updateState), icon: Clock3, run: onCheckForUpdates },
          ],
        },
      ];

      return groups;
    },
    [
      detailsDrawerOpen,
      accessLabel,
      hasProAccess,
      lastRun,
      onAreaChange,
      onCheckForUpdates,
      onManageLicense,
      onNewScript,
      onOpenHeaderGenerator,
      onOpenPlaceholderTool,
      onOpenRecentFiles,
      onOpenRunTools,
      onOpenScript,
      onOpenWorkbenchReview,
      onRerunLastRun,
      onRunAiReview,
      onRunPreflight,
      onSaveAs,
      onSaveScript,
      recentFiles,
      updateState,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (isModifierPressed && (event.key.toLowerCase() === "k" || (event.shiftKey && event.key.toLowerCase() === "p"))) {
        event.preventDefault();
        setCommandPaletteOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(WORKBENCH_PREFS_KEY, JSON.stringify({ bottomPanelTab, detailsDrawerOpen }));
  }, [bottomPanelTab, detailsDrawerOpen]);

  const runPaletteAction = (action: () => void) => {
    setCommandPaletteOpen(false);
    action();
  };

  async function copyRunOutput(label: "stdout" | "stderr", value?: string) {
    if (!value?.trim()) {
      toast({
        title: `No ${label.toUpperCase()} captured`,
        description: "Run output will appear here after a desktop PowerShell execution captures it.",
      });
      return;
    }

    await navigator.clipboard.writeText(value);
    toast({
      title: `${label.toUpperCase()} copied`,
      description: "The last run output is now on your clipboard.",
    });
  }

  async function openLastRunPath(path?: string, label = "run artifact") {
    if (!path) {
      toast({
        title: `No ${label} captured`,
        description: "Run the script with transcript capture to enable this action.",
      });
      return;
    }

    await openDesktopPath(path);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex min-h-16 w-full items-center gap-3 px-3 py-2 sm:px-4 xl:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoSrc}
              alt="PSForge"
              className="h-12 w-auto max-w-[108px] shrink-0 object-contain object-left drop-shadow-[0_0_10px_rgba(255,255,255,0.25)] sm:h-14 sm:max-w-[128px]"
            />
            <div className="min-w-0 flex-1 border-l pl-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="truncate text-sm font-medium sm:text-base">2.0 Workbench</div>
                <Badge variant="outline">v{desktopVersion}</Badge>
                <Badge variant={risk.variant}>{risk.label}</Badge>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {currentFileName}{isDirty ? " *" : ""} - {analysis.parameters.length} params - {analysis.issues.length} issue{analysis.issues.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCommandPaletteOpen(true)} title="Command palette">
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Command</span>
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={onOpenRunTools} title="Run script">
                  <TerminalSquare className="h-3.5 w-3.5" />
                  <span>Run</span>
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRunPreflight} title="Run preflight">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Preflight</span>
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRunAiReview} title="AI review">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI Review</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-16 shrink-0 flex-col items-center justify-between border-r bg-sidebar px-2 py-3 text-sidebar-foreground">
          <div className="grid gap-2">
            {railItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeArea === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-md border text-[10px] transition ${
                    isActive
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                  onClick={() => onAreaChange(item.value)}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div />
        </aside>

        <main
          className="grid min-w-0 flex-1 grid-cols-1 overflow-hidden"
          style={{ gridTemplateRows: detailsDrawerOpen ? "minmax(0, 1fr) clamp(210px, 30vh, 390px)" : "minmax(0, 1fr) 44px" }}
        >
          <section className="min-h-0 overflow-hidden">
            {children}
          </section>

          <section className="min-h-0 overflow-hidden border-t bg-card/70">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4 py-1.5">
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs">
                  {([
                    { value: "workspace", label: "Workspace", icon: BriefcaseBusiness },
                    { value: "problems", label: "Problems", icon: ShieldAlert },
                    { value: "runs", label: "Run Center", icon: TerminalSquare },
                    { value: "ai", label: "AI", icon: Sparkles },
                    { value: "git", label: "Git", icon: GitBranch },
                  ] as Array<{ value: BottomPanelTab; label: string; icon: typeof ShieldAlert }>).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = bottomPanelTab === tab.value;

                    return (
                      <button
                        key={tab.value}
                        type="button"
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition ${
                          isActive
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground"
                        }`}
                        onClick={() => openBottomPanelTab(tab.value)}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.value === "problems" && analysis.issues.length > 0 ? (
                          <Badge variant={criticalIssues > 0 ? "destructive" : "secondary"} className="ml-1 h-5 px-1.5 text-[10px]">
                            {analysis.issues.length}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    <Clock3 className="mr-1 h-3.5 w-3.5" />
                    {recentFilesCount} recent
                  </Badge>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setDetailsDrawerOpen((current) => !current)}>
                    <span className="hidden sm:inline">{detailsDrawerOpen ? "Collapse" : "Details"}</span>
                    <span className="sm:hidden">{detailsDrawerOpen ? "Less" : "More"}</span>
                    <ChevronDown className={`ml-1 h-4 w-4 transition ${detailsDrawerOpen ? "" : "rotate-180"}`} />
                  </Button>
                </div>
              </div>

              {detailsDrawerOpen && (
              <div className="min-h-0 flex-1 overflow-hidden p-3 text-xs">
                {bottomPanelTab === "problems" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_240px] gap-3 max-lg:grid-cols-1">
                    <div className="min-h-0 overflow-auto rounded-md border bg-background/60">
                      {hasIssues ? (
                        <div className="divide-y">
                          {analysis.issues.map((issue) => (
                            <button
                              key={issue.id}
                              type="button"
                              className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-muted/50"
                              onClick={onOpenWorkbenchReview}
                            >
                              {issue.severity === "critical" ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                              ) : issue.severity === "warning" ? (
                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                              ) : (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{issue.title}</span>
                                  <Badge variant={issue.severity === "critical" ? "destructive" : "secondary"}>{issue.severity}</Badge>
                                  <Badge variant="outline">{issue.category}</Badge>
                                </div>
                                <div className="mt-1 line-clamp-1 text-muted-foreground">{issue.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
                          <div>
                            <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-400" />
                            <div className="font-medium text-foreground">No quick-analysis problems</div>
                            <div className="mt-1">Run preflight for deeper dependency, impact, and readiness checks.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">Problem Actions</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" variant="outline" onClick={onOpenWorkbenchReview}>Open review</Button>
                        <Button size="sm" variant="outline" onClick={onRunPreflight}>Run preflight</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomPanelTab === "workspace" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-3 max-lg:grid-cols-1">
                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                        <div>
                          <div className="font-medium">Project Workspace 2.0</div>
                          <div className="text-muted-foreground">Recent files, active draft, and recovery context.</div>
                        </div>
                        <Badge variant={isDirty ? "secondary" : "outline"}>{isDirty ? "Unsaved draft" : "Saved state"}</Badge>
                      </div>
                      <div className="grid h-[calc(100%-41px)] min-h-0 grid-cols-3 gap-3 p-3 max-lg:grid-cols-1">
                        <div className="rounded-md border bg-background/70 p-3">
                          <div className="text-muted-foreground">Active script</div>
                          <div className="mt-1 truncate font-mono text-sm">{currentFileName}{isDirty ? " *" : ""}</div>
                          <div className="mt-2 text-muted-foreground">{analysis.issues.length} issue{analysis.issues.length === 1 ? "" : "s"} tracked in this workspace.</div>
                        </div>
                        <div className="rounded-md border bg-background/70 p-3">
                          <div className="text-muted-foreground">Recent files</div>
                          <div className="mt-1 text-lg font-semibold">{recentFiles.length}</div>
                          <div className="mt-2 text-muted-foreground">Quick access is available from the Recent Files dialog.</div>
                        </div>
                        <div className="rounded-md border bg-background/70 p-3">
                          <div className="text-muted-foreground">Latest recent</div>
                          <div className="mt-1 truncate font-mono text-sm">{recentFiles[0]?.fileName || "No recent files"}</div>
                          <div className="mt-2 truncate text-muted-foreground">{recentFiles[0]?.filePath || "Open or save a script to start the list."}</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">Workspace Actions</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" onClick={onOpenRecentFiles}>Open recent files</Button>
                        <Button size="sm" variant="outline" onClick={onNewScript}>New script</Button>
                        <Button size="sm" variant="outline" onClick={onOpenScript}>Open script</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomPanelTab === "runs" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(260px,1fr)_minmax(260px,0.9fr)_minmax(240px,280px)] gap-3 max-lg:grid-cols-1">
                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="border-b px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">Prepare</div>
                            <div className="text-muted-foreground">Check the script before execution.</div>
                          </div>
                          <Badge variant="outline">{checkedItems}/{totalChecklistItems}</Badge>
                        </div>
                      </div>
                      <div className="grid gap-3 p-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Params</div>
                            <div className="text-base font-semibold">{analysis.parameters.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Modules</div>
                            <div className="text-base font-semibold">{analysis.moduleSuggestions.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Issues</div>
                            <div className="text-base font-semibold">{analysis.issues.length}</div>
                          </div>
                        </div>
                        <div className="space-y-1.5 rounded-md border bg-background/70 p-3">
                          {analysis.checklist.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-start gap-2 text-muted-foreground">
                              {item.checked ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-400" /> : <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-amber-400" />}
                              <span className="line-clamp-1">{item.label}</span>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" variant="outline" onClick={onRunPreflight}>
                          <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                          Run preflight
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="border-b px-3 py-2">
                        <div>
                          <div className="font-medium">Execute</div>
                          <div className="text-muted-foreground">Choose mode and launch PowerShell.</div>
                        </div>
                      </div>
                      <div className="grid gap-3 p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {(["standard", "dry-run", "report-only"] as const).map((mode) => (
                            <div
                              key={mode}
                              className="rounded-md border bg-background/70 px-2 py-2 text-left text-muted-foreground"
                            >
                              <div className="font-medium capitalize">{mode.replace("-", " ")}</div>
                              <div className="mt-0.5 text-[10px]">
                                {mode === "standard" ? "As written" : mode === "dry-run" ? "WhatIf-first" : "Read-only bias"}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" onClick={onOpenRunTools}>
                          <TerminalSquare className="mr-2 h-3.5 w-3.5" />
                          Run setup
                        </Button>
                        <Button size="sm" variant="outline" disabled={!lastRun} onClick={onRerunLastRun}>
                          Rerun last setup
                        </Button>
                        <div className="rounded-md border bg-background/70 p-2 text-muted-foreground">
                          Set parameters, transcript capture, notes, and elevation before execution.
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="border-b px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">Review</div>
                            <div className="text-muted-foreground">Last run evidence and follow-up.</div>
                          </div>
                          <Badge variant={lastRun ? (lastRun.ok && lastRun.exitCode === 0 ? "default" : "destructive") : "outline"}>
                            {lastRun ? `Exit ${lastRun.exitCode}` : "Ready"}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid gap-2 p-3">
                        <div className="rounded-md border bg-background/70 p-2">
                          <div className="font-medium">Last Run</div>
                          <div className="mt-0.5 truncate text-muted-foreground">
                            {lastRun ? `${lastRun.fileName} at ${formatRunTimestamp(lastRun.finishedAt)}` : "No desktop runs yet."}
                          </div>
                        </div>
                        {lastRun ? (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">Duration</div>
                              <div className="mt-1 font-medium">{formatRunDuration(lastRun.durationMs)}</div>
                            </div>
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">Mode</div>
                              <div className="mt-1 font-medium capitalize">{lastRun.runMode.replace("-", " ")}</div>
                            </div>
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">Shell</div>
                              <div className="mt-1 truncate font-medium">{lastRun.shell || "PowerShell"}</div>
                            </div>
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">Parameters</div>
                              <div className="mt-1 font-medium">{Object.keys(lastRun.parameters || {}).length}</div>
                            </div>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" disabled={!lastRun?.transcriptPath} onClick={() => void openLastRunPath(lastRun?.transcriptPath, "transcript")}>
                            <FileOutput className="mr-2 h-3.5 w-3.5" />
                            Transcript
                          </Button>
                          <Button size="sm" variant="outline" disabled={!lastRun?.runDirectory} onClick={() => void openLastRunPath(lastRun?.runDirectory, "run folder")}>
                            <FolderOpen className="mr-2 h-3.5 w-3.5" />
                            Folder
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" disabled={!lastRun?.stdout?.trim()} onClick={() => void copyRunOutput("stdout", lastRun?.stdout)}>
                            <Clipboard className="mr-2 h-3.5 w-3.5" />
                            STDOUT
                          </Button>
                          <Button size="sm" variant="outline" disabled={!lastRun?.stderr?.trim()} onClick={() => void copyRunOutput("stderr", lastRun?.stderr)}>
                            <Clipboard className="mr-2 h-3.5 w-3.5" />
                            STDERR
                          </Button>
                        </div>
                        {lastRun && (!lastRun.ok || lastRun.exitCode !== 0) ? (
                          <Button size="sm" variant="outline" onClick={onRunAiReview}>Explain failure with AI</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={onOpenWorkbenchReview}>Review risks</Button>
                        )}
                        {lastRun?.beforeNotes || lastRun?.afterNotes ? (
                          <div className="max-h-20 overflow-auto rounded-md border bg-background/70 p-2 text-xs text-muted-foreground">
                            {lastRun.beforeNotes ? <div><span className="font-medium text-foreground">Before:</span> {lastRun.beforeNotes}</div> : null}
                            {lastRun.afterNotes ? <div className="mt-1"><span className="font-medium text-foreground">After:</span> {lastRun.afterNotes}</div> : null}
                          </div>
                        ) : null}
                        <div className="rounded-md border bg-background/70 p-2 text-muted-foreground">
                          {runHistorySummary.totalRuns} total run{runHistorySummary.totalRuns === 1 ? "" : "s"} - {runHistorySummary.failedRuns} failed
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {bottomPanelTab === "ai" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.2fr)_minmax(240px,280px)] gap-3 max-xl:grid-cols-[minmax(0,1fr)_280px] max-lg:grid-cols-1">
                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                        <div>
                          <div className="font-medium">Script Intelligence</div>
                          <div className="text-muted-foreground">Live read on the active script.</div>
                        </div>
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                      </div>
                      <div className="grid gap-3 p-3">
                        <div className="flex items-start gap-2 rounded-md border bg-background/70 p-3">
                          <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{currentFileName}{isDirty ? " *" : ""}</div>
                            <div className="mt-1 line-clamp-2 text-muted-foreground">{analysis.explanation.summary}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Params</div>
                            <div className="text-base font-semibold">{analysis.parameters.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Modules</div>
                            <div className="text-base font-semibold">{analysis.moduleSuggestions.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Critical</div>
                            <div className="text-base font-semibold text-destructive">{criticalIssues}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">Warnings</div>
                            <div className="text-base font-semibold text-amber-400">{warningIssues}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                        <div>
                          <div className="font-medium">Risks And Readiness</div>
                          <div className="text-muted-foreground">Fast review before deeper AI or preflight checks.</div>
                        </div>
                        <Badge variant="outline">{checkedItems}/{totalChecklistItems}</Badge>
                      </div>
                      <div className="grid h-[calc(100%-45px)] min-h-0 grid-cols-2 gap-3 overflow-hidden p-3 max-sm:grid-cols-1">
                        <div className="min-h-0 overflow-auto rounded-md border bg-background/70">
                          {analysis.issues.length === 0 ? (
                            <div className="flex h-full items-center justify-center p-4 text-center text-emerald-200">
                              <div>
                                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
                                <div className="font-medium">No quick-analysis issues</div>
                              </div>
                            </div>
                          ) : (
                            <div className="divide-y">
                              {analysis.issues.slice(0, 4).map((issue) => (
                                <button
                                  key={issue.id}
                                  type="button"
                                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/50"
                                  onClick={onOpenWorkbenchReview}
                                >
                                  {issue.severity === "critical" ? (
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                                  ) : (
                                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                                  )}
                                  <span className="line-clamp-2">{issue.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="min-h-0 overflow-auto rounded-md border bg-background/70 p-3">
                          <div className="space-y-2">
                            {analysis.checklist.slice(0, 4).map((item) => (
                              <div key={item.id} className="flex items-start gap-2 text-muted-foreground">
                                {item.checked ? (
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                ) : (
                                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                                )}
                                <span className="line-clamp-2">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border bg-background/60 p-3 max-xl:col-span-2 max-lg:col-span-1">
                      <div className="font-medium">AI Actions</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" onClick={onRunAiReview}>Run AI review</Button>
                        <Button size="sm" variant="outline" onClick={onOpenWorkbenchReview}>Open review</Button>
                        <Button size="sm" variant="outline" onClick={onRunPreflight}>Run preflight</Button>
                        <Button size="sm" variant="outline" onClick={() => onAreaChange("ai")}>Open AI workspace</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomPanelTab === "git" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_240px] gap-3 max-lg:grid-cols-1">
                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">Current Script</div>
                      <div className="mt-2 flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-primary" />
                        <span className="font-mono">{currentFileName}{isDirty ? " *" : ""}</span>
                      </div>
                      <div className="mt-2 text-muted-foreground">
                        Git tools can package, diff, and commit the active script from the dedicated Git workspace.
                      </div>
                    </div>
                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">Git Actions</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" onClick={() => onAreaChange("git")}>Open Git workspace</Button>
                        <Button size="sm" variant="outline" onClick={onSaveScript}>Save script first</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <CommandInput placeholder="Search commands, workbench actions, and navigation..." />
        <CommandList className="max-h-[440px]">
          <CommandEmpty>No matching command found.</CommandEmpty>
          {commandGroups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.actions.map((action) => {
                const Icon = action.icon;

                return (
                  <CommandItem
                    key={`${group.heading}-${action.label}`}
                    value={`${group.heading} ${action.label}`}
                    disabled={action.disabled}
                    onSelect={() => runPaletteAction(action.run)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                    {action.shortcut ? <CommandShortcut>{action.shortcut}</CommandShortcut> : null}
                    {action.disabled && !action.shortcut ? <CommandShortcut>Unavailable</CommandShortcut> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
