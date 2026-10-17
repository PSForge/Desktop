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
import {
  getLocaleDirection,
  getStoredLocale,
  translate,
  type LocaleCode,
  type TranslationKey,
} from "@/lib/i18n";

type WorkbenchArea = "script" | "ai" | "gui" | "wizard" | "git" | "troubleshooter" | "ops";

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
  labelKey?: TranslationKey;
  label?: string;
  icon: typeof FileCode;
}> = [
  { value: "script", labelKey: "work", icon: FileCode },
  { value: "gui", labelKey: "library", icon: LayoutGrid },
  { value: "troubleshooter", labelKey: "logs", icon: Wrench },
  { value: "ai", labelKey: "ai", icon: Bot },
  { value: "git", labelKey: "git", icon: GitBranch },
  { value: "wizard", labelKey: "wizard", icon: Wand2 },
  { value: "ops", labelKey: "ops", icon: PackageCheck },
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

function formatRunTimestamp(value?: string, fallback = "No runs yet") {
  if (!value) {
    return fallback;
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

function formatRunDuration(durationMs?: number, fallback = "Unknown") {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return fallback;
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

function getRiskLabel(analysis: ScriptWorkbenchAnalysis, t: (key: TranslationKey, replacements?: Record<string, string | number>) => string) {
  if (analysis.issues.some((issue) => issue.severity === "critical")) {
    return { label: t("appHealthHighAttention"), variant: "destructive" as const };
  }

  if (analysis.issues.some((issue) => issue.severity === "warning")) {
    return { label: t("appHealthReviewSuggested"), variant: "secondary" as const };
  }

  if (analysis.issues.length > 0) {
    return { label: t("appHealthNotesAvailable"), variant: "outline" as const };
  }

  return { label: t("appHealthLooksCalm"), variant: "default" as const };
}

function formatUpdateLabel(updateState: UpdateState, t: (key: TranslationKey, replacements?: Record<string, string | number>) => string) {
  if (updateState.state === "downloaded") {
    return t("updateReady");
  }
  if (updateState.state === "downloading" && typeof updateState.percent === "number") {
    return `${t("updating")} ${Math.round(updateState.percent)}%`;
  }
  if (updateState.state === "available") {
    return updateState.version ? `Update ${updateState.version}` : t("updateAvailable");
  }
  if (updateState.state === "checking") {
    return t("checkingUpdates");
  }
  return t("checkUpdates");
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
  const [locale, setLocale] = useState<LocaleCode>(() => getStoredLocale());
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>(() => readWorkbenchPreferences().bottomPanelTab || "workspace");
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(() => readWorkbenchPreferences().detailsDrawerOpen ?? false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const t = (key: TranslationKey, replacements?: Record<string, string | number>) => translate(locale, key, replacements);
  const risk = getRiskLabel(analysis, t);
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
          heading: t("file"),
          actions: [
          { label: "New Script", shortcut: "Ctrl N", icon: FileCode, run: onNewScript },
          { label: t("openScript"), shortcut: "Ctrl O", icon: FolderOpen, run: onOpenScript },
          { label: "Save Script", shortcut: "Ctrl S", icon: Save, run: onSaveScript },
          { label: "Save As", shortcut: "Ctrl Shift S", icon: Save, run: onSaveAs },
          { label: t("openRecentFiles"), shortcut: "Ctrl Alt O", icon: History, run: onOpenRecentFiles },
          ...recentFiles.slice(0, 3).map((file) => ({
            label: `Recent: ${file.fileName}`,
            icon: History,
            run: onOpenRecentFiles,
          })),
          ],
        },
        {
          heading: t("run"),
          actions: [
          { label: t("runScript"), shortcut: "Ctrl R", icon: TerminalSquare, run: onOpenRunTools },
          { label: t("rerunLastSetup"), icon: TerminalSquare, run: onRerunLastRun, disabled: !lastRun },
          { label: t("runPreflight"), shortcut: "Ctrl Alt P", icon: ShieldCheck, run: onRunPreflight },
          { label: t("openRunCenter"), icon: TerminalSquare, run: () => openBottomPanelTab("runs") },
          { label: t("openLastTranscript"), icon: FileOutput, run: () => void openLastRunPath(lastRun?.transcriptPath, "transcript"), disabled: !lastRun?.transcriptPath },
          { label: t("openLastRunFolder"), icon: FolderOpen, run: () => void openLastRunPath(lastRun?.runDirectory, "run folder"), disabled: !lastRun?.runDirectory },
          { label: "Copy Last STDOUT", icon: Clipboard, run: () => void copyRunOutput("stdout", lastRun?.stdout), disabled: !lastRun?.stdout?.trim() },
          { label: "Copy Last STDERR", icon: Clipboard, run: () => void copyRunOutput("stderr", lastRun?.stderr), disabled: !lastRun?.stderr?.trim() },
          { label: "Explain Last Failure With AI", icon: Sparkles, run: onRunAiReview, disabled: !lastRun || (lastRun.ok && lastRun.exitCode === 0) },
          ],
        },
        {
          heading: t("scriptTools"),
          actions: [
          { label: t("runAiReview"), shortcut: "Ctrl Alt A", icon: Sparkles, run: onRunAiReview },
          { label: "Open Workbench Review", shortcut: "Ctrl Alt W", icon: ShieldAlert, run: onOpenWorkbenchReview },
          { label: "Generate Header", shortcut: "Ctrl Alt H", icon: ScrollText, run: onOpenHeaderGenerator },
          { label: t("replacePlaceholders"), shortcut: "Ctrl Alt R", icon: Replace, run: onOpenPlaceholderTool },
          { label: t("showScriptIntelligence"), icon: ListChecks, run: () => openBottomPanelTab("ai") },
          ],
        },
        {
          heading: t("navigation"),
          actions: [
          { label: t("openScriptWorkspace"), icon: FileCode, run: () => onAreaChange("script") },
          { label: t("openCommandLibrary"), icon: LayoutGrid, run: () => onAreaChange("gui") },
          { label: t("openWizard"), icon: Wand2, run: () => onAreaChange("wizard") },
          { label: t("openAiWorkspace"), icon: Bot, run: () => onAreaChange("ai") },
          { label: t("openGitWorkspace"), icon: GitBranch, run: () => onAreaChange("git") },
          { label: t("logTroubleshooter"), icon: Wrench, run: () => onAreaChange("troubleshooter") },
          { label: t("opsSuite"), icon: PackageCheck, run: () => onAreaChange("ops") },
          { label: t("showWorkspaceDetails"), icon: BriefcaseBusiness, run: () => openBottomPanelTab("workspace") },
          { label: t("showProblems"), icon: ShieldAlert, run: () => openBottomPanelTab("problems") },
          { label: t("showScriptIntelligence"), icon: Sparkles, run: () => openBottomPanelTab("ai") },
          { label: t("showGitDetails"), icon: GitBranch, run: () => openBottomPanelTab("git") },
          { label: detailsDrawerOpen ? t("collapseDetailsDrawer") : t("expandDetailsDrawer"), icon: ChevronDown, run: () => setDetailsDrawerOpen((current) => !current) },
          ],
        },
        {
          heading: t("app"),
          actions: [
          { label: hasProAccess ? "Manage Pro Access" : accessLabel, icon: Settings, run: onManageLicense },
          { label: formatUpdateLabel(updateState, t), icon: Clock3, run: onCheckForUpdates },
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
      locale,
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

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDirection(locale);
  }, [locale]);

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
                <div className="truncate text-sm font-medium sm:text-base">{t("workbench")}</div>
                <Badge variant="outline">v{desktopVersion}</Badge>
                <Badge variant={risk.variant}>{risk.label}</Badge>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {currentFileName}{isDirty ? " *" : ""} - {analysis.parameters.length} params - {analysis.issues.length} issue{analysis.issues.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCommandPaletteOpen(true)} title="Command palette">
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t("command")}</span>
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={onOpenRunTools} title="Run script">
                  <TerminalSquare className="h-3.5 w-3.5" />
                  <span>{t("run")}</span>
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRunPreflight} title="Run preflight">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("preflight")}</span>
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRunAiReview} title="AI review">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("aiReview")}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[72px] shrink-0 flex-col items-center justify-between border-r bg-sidebar px-2 py-3 text-sidebar-foreground">
          <div className="grid gap-2">
            {railItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeArea === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`flex min-h-12 w-14 flex-col items-center justify-center gap-1 rounded-md border px-1 text-[10px] transition ${
                    isActive
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                  onClick={() => onAreaChange(item.value)}
                  title={item.labelKey ? t(item.labelKey) : item.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full truncate text-center leading-tight">{item.labelKey ? t(item.labelKey) : item.label}</span>
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
                    { value: "workspace", labelKey: "workspace", icon: BriefcaseBusiness },
                    { value: "problems", labelKey: "problems", icon: ShieldAlert },
                    { value: "runs", labelKey: "runCenter", icon: TerminalSquare },
                    { value: "ai", labelKey: "ai", icon: Sparkles },
                    { value: "git", labelKey: "git", icon: GitBranch },
                  ] as Array<{ value: BottomPanelTab; labelKey: TranslationKey; icon: typeof ShieldAlert }>).map((tab) => {
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
                        <span className="hidden sm:inline">{t(tab.labelKey)}</span>
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
                    {recentFilesCount} {t("recent")}
                  </Badge>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setDetailsDrawerOpen((current) => !current)}>
                    <span className="hidden sm:inline">{detailsDrawerOpen ? t("collapse") : t("details")}</span>
                    <span className="sm:hidden">{detailsDrawerOpen ? t("collapse") : t("details")}</span>
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
                            <div className="font-medium text-foreground">{t("noQuickAnalysisProblems")}</div>
                            <div className="mt-1">{t("runPreflightDeeper")}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">{t("problemActions")}</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" variant="outline" onClick={onOpenWorkbenchReview}>{t("openReview")}</Button>
                        <Button size="sm" variant="outline" onClick={onRunPreflight}>{t("runPreflight")}</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomPanelTab === "workspace" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-3 max-lg:grid-cols-1">
                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                        <div>
                          <div className="font-medium">{t("projectWorkspaceTitle")}</div>
                          <div className="text-muted-foreground">{t("projectWorkspaceDescription")}</div>
                        </div>
                        <Badge variant={isDirty ? "secondary" : "outline"}>{isDirty ? t("unsavedDraft") : t("savedState")}</Badge>
                      </div>
                      <div className="grid h-[calc(100%-41px)] min-h-0 grid-cols-3 gap-3 p-3 max-lg:grid-cols-1">
                        <div className="rounded-md border bg-background/70 p-3">
                          <div className="text-muted-foreground">{t("activeScript")}</div>
                          <div className="mt-1 truncate font-mono text-sm">{currentFileName}{isDirty ? " *" : ""}</div>
                          <div className="mt-2 text-muted-foreground">{analysis.issues.length} issue{analysis.issues.length === 1 ? "" : "s"} tracked in this workspace.</div>
                        </div>
                        <div className="rounded-md border bg-background/70 p-3">
                          <div className="text-muted-foreground">{t("recentFilesLabel")}</div>
                          <div className="mt-1 text-lg font-semibold">{recentFiles.length}</div>
                          <div className="mt-2 text-muted-foreground">{t("quickAccessRecentFiles")}</div>
                        </div>
                        <div className="rounded-md border bg-background/70 p-3">
                          <div className="text-muted-foreground">{t("latestRecent")}</div>
                          <div className="mt-1 truncate font-mono text-sm">{recentFiles[0]?.fileName || t("noRecentFiles")}</div>
                          <div className="mt-2 truncate text-muted-foreground">{recentFiles[0]?.filePath || t("openOrSaveScript")}</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">{t("workspaceActions")}</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" onClick={onOpenRecentFiles}>{t("openRecentFiles")}</Button>
                        <Button size="sm" variant="outline" onClick={onNewScript}>{t("newScript")}</Button>
                        <Button size="sm" variant="outline" onClick={onOpenScript}>{t("openScript")}</Button>
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
                            <div className="font-medium">{t("prepare")}</div>
                            <div className="text-muted-foreground">{t("prepareDescription")}</div>
                          </div>
                          <Badge variant="outline">{checkedItems}/{totalChecklistItems}</Badge>
                        </div>
                      </div>
                      <div className="grid gap-3 p-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">{t("params")}</div>
                            <div className="text-base font-semibold">{analysis.parameters.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">{t("modules")}</div>
                            <div className="text-base font-semibold">{analysis.moduleSuggestions.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">{t("problems")}</div>
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
                          {t("runPreflight")}
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="border-b px-3 py-2">
                        <div>
                          <div className="font-medium">{t("execute")}</div>
                          <div className="text-muted-foreground">{t("chooseModeLaunchPowerShell")}</div>
                        </div>
                      </div>
                      <div className="grid gap-3 p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {(["standard", "dry-run", "report-only"] as const).map((mode) => (
                            <div
                              key={mode}
                              className="rounded-md border bg-background/70 px-2 py-2 text-left text-muted-foreground"
                            >
                              <div className="font-medium capitalize">{mode === "standard" ? t("standard") : mode === "dry-run" ? t("dryRun") : t("reportOnly")}</div>
                              <div className="mt-0.5 text-[10px]">
                                {mode === "standard" ? t("asWritten") : mode === "dry-run" ? "WhatIf-first" : t("readOnlyBias")}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" onClick={onOpenRunTools}>
                          <TerminalSquare className="mr-2 h-3.5 w-3.5" />
                          {t("runSetup")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={!lastRun} onClick={onRerunLastRun}>
                          {t("rerunLastSetup")}
                        </Button>
                        <div className="rounded-md border bg-background/70 p-2 text-muted-foreground">
                          {t("setParametersBeforeExecution")}
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="border-b px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{t("review")}</div>
                            <div className="text-muted-foreground">{t("lastRunEvidence")}</div>
                          </div>
                          <Badge variant={lastRun ? (lastRun.ok && lastRun.exitCode === 0 ? "default" : "destructive") : "outline"}>
                            {lastRun ? `Exit ${lastRun.exitCode}` : t("ready")}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid gap-2 p-3">
                        <div className="rounded-md border bg-background/70 p-2">
                          <div className="font-medium">{t("lastRun")}</div>
                          <div className="mt-0.5 truncate text-muted-foreground">
                            {lastRun ? `${lastRun.fileName} at ${formatRunTimestamp(lastRun.finishedAt, "")}` : t("noDesktopRunsYet")}
                          </div>
                        </div>
                        {lastRun ? (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">{t("duration")}</div>
                              <div className="mt-1 font-medium">{formatRunDuration(lastRun.durationMs, t("unknown"))}</div>
                            </div>
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">{t("mode")}</div>
                              <div className="mt-1 font-medium capitalize">{lastRun.runMode.replace("-", " ")}</div>
                            </div>
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">{t("shell")}</div>
                              <div className="mt-1 truncate font-medium">{lastRun.shell || "PowerShell"}</div>
                            </div>
                            <div className="rounded-md border bg-background/70 p-2">
                              <div className="text-muted-foreground">{t("params")}</div>
                              <div className="mt-1 font-medium">{Object.keys(lastRun.parameters || {}).length}</div>
                            </div>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" disabled={!lastRun?.transcriptPath} onClick={() => void openLastRunPath(lastRun?.transcriptPath, "transcript")}>
                            <FileOutput className="mr-2 h-3.5 w-3.5" />
                            {t("transcript")}
                          </Button>
                          <Button size="sm" variant="outline" disabled={!lastRun?.runDirectory} onClick={() => void openLastRunPath(lastRun?.runDirectory, t("openRunFolder"))}>
                            <FolderOpen className="mr-2 h-3.5 w-3.5" />
                            {t("folder")}
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
                          <Button size="sm" variant="outline" onClick={onRunAiReview}>{t("explainFailureWithAi")}</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={onOpenWorkbenchReview}>{t("reviewRisks")}</Button>
                        )}
                        {lastRun?.beforeNotes || lastRun?.afterNotes ? (
                          <div className="max-h-20 overflow-auto rounded-md border bg-background/70 p-2 text-xs text-muted-foreground">
                            {lastRun.beforeNotes ? <div><span className="font-medium text-foreground">{t("before")}:</span> {lastRun.beforeNotes}</div> : null}
                            {lastRun.afterNotes ? <div className="mt-1"><span className="font-medium text-foreground">{t("after")}:</span> {lastRun.afterNotes}</div> : null}
                          </div>
                        ) : null}
                        <div className="rounded-md border bg-background/70 p-2 text-muted-foreground">
                          {t("totalRunsSummary", {
                            total: runHistorySummary.totalRuns,
                            plural: runHistorySummary.totalRuns === 1 ? "" : "s",
                            failed: runHistorySummary.failedRuns,
                          })}
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
                          <div className="font-medium">{t("scriptIntelligence")}</div>
                          <div className="text-muted-foreground">{t("liveReadActiveScript")}</div>
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
                            <div className="text-muted-foreground">{t("params")}</div>
                            <div className="text-base font-semibold">{analysis.parameters.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">{t("modules")}</div>
                            <div className="text-base font-semibold">{analysis.moduleSuggestions.length}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">{t("critical")}</div>
                            <div className="text-base font-semibold text-destructive">{criticalIssues}</div>
                          </div>
                          <div className="rounded-md border bg-background/70 p-2">
                            <div className="text-muted-foreground">{t("warnings")}</div>
                            <div className="text-base font-semibold text-amber-400">{warningIssues}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border bg-background/60">
                      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                        <div>
                          <div className="font-medium">{t("risksAndReadiness")}</div>
                          <div className="text-muted-foreground">{t("fastReviewBeforeChecks")}</div>
                        </div>
                        <Badge variant="outline">{checkedItems}/{totalChecklistItems}</Badge>
                      </div>
                      <div className="grid h-[calc(100%-45px)] min-h-0 grid-cols-2 gap-3 overflow-hidden p-3 max-sm:grid-cols-1">
                        <div className="min-h-0 overflow-auto rounded-md border bg-background/70">
                          {analysis.issues.length === 0 ? (
                            <div className="flex h-full items-center justify-center p-4 text-center text-emerald-200">
                              <div>
                                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
                                <div className="font-medium">{t("noQuickAnalysisIssues")}</div>
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
                      <div className="font-medium">{t("aiActions")}</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" onClick={onRunAiReview}>{t("runAiReview")}</Button>
                        <Button size="sm" variant="outline" onClick={onOpenWorkbenchReview}>{t("openReview")}</Button>
                        <Button size="sm" variant="outline" onClick={onRunPreflight}>{t("runPreflight")}</Button>
                        <Button size="sm" variant="outline" onClick={() => onAreaChange("ai")}>{t("openAiWorkspace")}</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomPanelTab === "git" && (
                  <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_240px] gap-3 max-lg:grid-cols-1">
                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">{t("currentScript")}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-primary" />
                        <span className="font-mono">{currentFileName}{isDirty ? " *" : ""}</span>
                      </div>
                      <div className="mt-2 text-muted-foreground">
                        {t("gitToolsDescription")}
                      </div>
                    </div>
                    <div className="rounded-md border bg-background/60 p-3">
                      <div className="font-medium">{t("gitActions")}</div>
                      <div className="mt-2 grid gap-2">
                        <Button size="sm" onClick={() => onAreaChange("git")}>{t("openGitWorkspace")}</Button>
                        <Button size="sm" variant="outline" onClick={onSaveScript}>{t("saveScriptFirst")}</Button>
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
        <CommandInput placeholder={t("commandPalettePlaceholder")} />
        <CommandList className="max-h-[440px]">
          <CommandEmpty>{t("noMatchingCommand")}</CommandEmpty>
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
                    {action.disabled && !action.shortcut ? <CommandShortcut>{t("unavailable")}</CommandShortcut> : null}
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
