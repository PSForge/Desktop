import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Activity,
  Bot,
  BookOpen,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileJson,
  FileArchive,
  FileCheck,
  FlaskConical,
  Gauge,
  KeyRound,
  List,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Replace,
  Rocket,
  ScrollText,
  Search,
  ShieldAlert,
  Sparkles,
  Table2,
  WandSparkles,
  Wand2,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { CommandSidebar } from "@/components/command-sidebar";
import { ScriptEditor } from "@/components/script-editor";
import { CodePreview } from "@/components/code-preview";
import { ValidationPanel } from "@/components/validation-panel";
import { ComprehensiveValidationPanel } from "@/components/comprehensive-validation-panel";
import { DesktopUpgradeDialog } from "@/components/desktop-upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isDesktopApp, openDesktopDirectory, openDesktopPath, runDesktopPowerShellScript, setDesktopStorageItem, getDesktopStorageItem, writeDesktopScriptFile, zipDesktopDirectory, type DesktopPowerShellRunResult } from "@/lib/desktop";
import type { Command, ValidationResult, ComprehensiveValidationResult } from "@shared/schema";
import {
  analyzeScriptWorkbench,
  buildCertificationManifest,
  buildCompatibilityMatrix,
  buildOperationsSuitePlan,
  buildParameterSetDesignerDraft,
  buildPerformanceProfilerScript,
  buildSanitizedSupportBundle,
  buildScheduledTaskInstaller,
  buildWorkbenchProfileKey,
  buildExportBundleArtifacts,
  detectCredentialLeaks,
  generateCommentHeader,
  inspectPipeline,
  parseCsvMapping,
  replacePlaceholders,
  runRegexLab,
  type ExecutionChecklistItem,
  type ParsedScriptParameter,
} from "@/lib/script-workbench-utils";
import { useDesktopLocale } from "@/lib/i18n";

interface DesktopScriptWorkbenchProps {
  script: string;
  setScript: (script: string) => void;
  currentFileName?: string;
  authorName?: string;
  displayMode?: "editor" | "ops";
  pendingAction?: DesktopWorkbenchAction | null;
  onRunHistorySummaryChange?: (summary: DesktopRunHistorySummary) => void;
}

export type DesktopWorkbenchActionType = "run" | "rerun-last" | "preflight" | "ai-review" | "header" | "placeholders" | "workbench";

export type DesktopWorkbenchAction = {
  id: number;
  type: DesktopWorkbenchActionType;
};

type RunHistoryEntry = DesktopPowerShellRunResult & {
  id: string;
  parameters: Record<string, unknown>;
  runMode: RunMode;
  environmentProfileName?: string;
  beforeNotes?: string;
  afterNotes?: string;
};

type SavedValueProfile = {
  id: string;
  name: string;
  updatedAt: string;
  values: Record<string, unknown>;
};

export type RunMode = "standard" | "dry-run" | "report-only";

export type DesktopRunHistorySummary = {
  totalRuns: number;
  failedRuns: number;
  lastRun?: {
    ok: boolean;
    exitCode: number;
    fileName: string;
    runMode: RunMode;
    startedAt: string;
    finishedAt: string;
    transcriptPath?: string;
    runDirectory?: string;
    stdout?: string;
    stderr?: string;
    shell?: string;
    elevated?: boolean;
    durationMs?: number;
    parameters?: Record<string, unknown>;
    beforeNotes?: string;
    afterNotes?: string;
  };
};

type EnvironmentProfile = {
  id: string;
  name: string;
  updatedAt: string;
  parameterValues: Record<string, unknown>;
  placeholderValues: Record<string, string>;
  checklistState: Record<string, boolean>;
  captureTranscript: boolean;
  runAsAdmin: boolean;
  runMode: RunMode;
  beforeNotes: string;
};

type AIExplainResult = {
  explanation: string;
  keyPoints: string[];
  suggestedNextSteps: string[];
  potentialRisks: string[];
};

type AIOptimizationRecommendation = {
  type: "performance" | "security" | "best-practice" | "alternative";
  title: string;
  description: string;
  code?: string;
  priority: "critical" | "high" | "medium" | "low";
  line?: number;
};

type AIOptimizationAlternative = {
  title: string;
  description: string;
  code: string;
  approach: string;
};

type AIOptimizationResult = {
  performance: AIOptimizationRecommendation[];
  security: AIOptimizationRecommendation[];
  bestPractices: AIOptimizationRecommendation[];
  alternatives: AIOptimizationAlternative[];
  summary: string;
};

type SavedRunbook = {
  id: string;
  name: string;
  createdAt: string;
  fileName: string;
  summary: string;
  runMode: RunMode;
  runAsAdmin: boolean;
  environmentProfileName?: string;
  beforeRunNotes: string;
  parameterValues: Record<string, unknown>;
  placeholderValues: Record<string, string>;
  checklistState: Record<string, boolean>;
};

type UpgradeDialogState = {
  open: boolean;
  feature: string;
  title?: string;
  description?: string;
  previewTitle?: string;
  previewItems?: string[];
  highlights?: string[];
  ctaLabel?: string;
  contextLabel?: string;
};

type OpsToolId =
  | "environment-doctor"
  | "impact-preview"
  | "pester-generator"
  | "script-packager"
  | "runbook-generator"
  | "dependency-manager"
  | "rollback-builder"
  | "script-modernizer"
  | "regex-lab"
  | "pipeline-explorer"
  | "parameter-set-designer"
  | "credential-leak-detector"
  | "performance-profiler"
  | "compatibility-matrix"
  | "csv-data-mapper"
  | "error-reproduction-builder"
  | "scheduled-task-builder"
  | "script-certification";

const spanishOpsToolText: Record<string, { title?: string; description?: string; label?: string; badge?: string }> = {
  prepare: { label: "Preparar" },
  build: { label: "Crear" },
  document: { label: "Documentar" },
  ship: { label: "Publicar" },
  "environment-doctor": {
    title: "Doctor del entorno",
    description: "Puntuacion de preparacion, comprobaciones del equipo y comandos de correccion.",
  },
  "impact-preview": {
    title: "Vista previa del impacto",
    description: "Cambios previstos y sistemas afectados antes de ejecutar.",
  },
  "credential-leak-detector": {
    title: "Detector de filtracion de credenciales",
    description: "Contrasenas, tokens, IDs de tenant y manejo inseguro de secretos.",
  },
  "compatibility-matrix": {
    title: "Matriz de compatibilidad",
    description: "Compatibilidad con PowerShell, Server, Azure Automation y endpoints restringidos.",
  },
  "pester-generator": {
    title: "Generador de pruebas Pester",
    description: "Genera y ejecuta pruebas iniciales para el script activo.",
    badge: "Pruebas",
  },
  "parameter-set-designer": {
    title: "Disenador de conjuntos de parametros",
    description: "Convierte parametros detectados en una estructura de funcion avanzada.",
  },
  "regex-lab": {
    title: "Laboratorio Regex",
    description: "Crea, explica y prueba expresiones regulares de PowerShell.",
  },
  "csv-data-mapper": {
    title: "Mapeador de datos CSV",
    description: "Asocia columnas CSV con parametros y previsualiza objetos masivos.",
  },
  "runbook-generator": {
    title: "Generador de runbooks",
    description: "Documentacion operativa con requisitos, validacion y rollback.",
  },
  "dependency-manager": {
    title: "Administrador de dependencias y modulos",
    description: "Sugerencias de modulos, comandos referenciados y declaraciones #Requires.",
  },
  "pipeline-explorer": {
    title: "Explorador de objetos/pipeline",
    description: "Inspecciona el flujo probable de objetos en cada etapa del pipeline.",
  },
  "error-reproduction-builder": {
    title: "Constructor de reproduccion de errores",
    description: "Crea un paquete de soporte sanitizado desde errores y contexto.",
    badge: "Seguro",
  },
  "script-packager": {
    title: "Empaquetador de scripts PowerShell",
    description: "Plan de paquete de implementacion y exportacion del paquete de Ops.",
  },
  "scheduled-task-builder": {
    title: "Constructor de tareas programadas",
    description: "Configura disparadores, cuentas y script instalador de Task Scheduler.",
  },
  "rollback-builder": {
    title: "Constructor de rollback",
    description: "Guia de rollback con operaciones irreversibles claramente marcadas.",
  },
  "script-modernizer": {
    title: "Modernizador de scripts",
    description: "Guia de migracion y endurecimiento para scripts PowerShell antiguos.",
  },
  "performance-profiler": {
    title: "Perfilador de rendimiento",
    description: "Genera un contenedor de tiempos para analizar la ejecucion del script.",
    badge: "Tiempo",
  },
  "script-certification": {
    title: "Certificacion de scripts",
    description: "Crea manifiestos de aprobacion con hashes, propietarios y expiracion.",
    badge: "Hash",
  },
};

function localizeOpsToolText(locale: string, id: string, field: "title" | "description" | "label" | "badge", fallback: string) {
  return locale === "es" ? spanishOpsToolText[id]?.[field] || fallback : fallback;
}

const COMMAND_FAVORITES_KEY = "psforge-desktop-command-favorites";
const COMMAND_LIBRARY_VISIBLE_KEY = "psforge-desktop-command-library-visible-v2";
const EDITOR_DETAILS_VISIBLE_KEY = "psforge-desktop-editor-details-visible";
const RUN_HISTORY_KEY = "psforge-desktop-run-history";
const PARAMETER_PRESETS_KEY = "psforge-desktop-parameter-presets";
const PLACEHOLDER_PROFILES_KEY = "psforge-desktop-placeholder-profiles";
const ENVIRONMENT_PROFILES_KEY = "psforge-desktop-environment-profiles";
const RUNBOOK_LIBRARY_KEY = "psforge-desktop-runbooks";

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

function normalizeParameterState(parameters: ParsedScriptParameter[]) {
  return parameters.reduce<Record<string, unknown>>((accumulator, parameter) => {
    if (parameter.kind === "switch") {
      accumulator[parameter.name] = false;
    } else if (parameter.kind === "array") {
      accumulator[parameter.name] = "";
    } else {
      accumulator[parameter.name] = parameter.defaultValue?.replace(/^['"]|['"]$/g, "") || "";
    }
    return accumulator;
  }, {});
}

function convertParameterValue(parameter: ParsedScriptParameter, value: unknown) {
  if (parameter.kind === "switch") {
    return Boolean(value);
  }

  if (parameter.kind === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (parameter.kind === "array") {
    if (Array.isArray(value)) {
      return value;
    }
    return String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return String(value ?? "");
}

function recordsEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

function stringRecordsEqual(left: Record<string, string>, right: Record<string, string>) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

function buildRecommendationKey(recommendation: AIOptimizationRecommendation) {
  return `${recommendation.type}:${recommendation.priority}:${recommendation.title}:${recommendation.line ?? "na"}`;
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function sanitizePowerShellFileName(fileName: string) {
  const sanitized = fileName.replace(/[^A-Za-z0-9_.-]/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "script.ps1";
}

export function DesktopScriptWorkbench({
  script,
  setScript,
  currentFileName = "script.ps1",
  authorName = "PSForge User",
  displayMode = "editor",
  pendingAction = null,
  onRunHistorySummaryChange,
}: DesktopScriptWorkbenchProps) {
  const { toast } = useToast();
  const { featureAccess } = useAuth();
  const { locale, t } = useDesktopLocale();
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [comprehensiveValidation, setComprehensiveValidation] = useState<ComprehensiveValidationResult | null>(null);
  const [lastValidatedCode, setLastValidatedCode] = useState("");
  const [lastComprehensiveCode, setLastComprehensiveCode] = useState("");
  const [isCommandLibraryVisible, setIsCommandLibraryVisible] = useState(() =>
    safeJsonParse<boolean>(getDesktopStorageItem(COMMAND_LIBRARY_VISIBLE_KEY), false),
  );
  const [isEditorDetailsVisible, setIsEditorDetailsVisible] = useState(() =>
    safeJsonParse<boolean>(getDesktopStorageItem(EDITOR_DETAILS_VISIBLE_KEY), false),
  );
  const [detailsTab, setDetailsTab] = useState("preview");
  const [favoriteCommandIds, setFavoriteCommandIds] = useState<string[]>(() =>
    safeJsonParse<string[]>(getDesktopStorageItem(COMMAND_FAVORITES_KEY), []),
  );
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);
  const [placeholderDialogOpen, setPlaceholderDialogOpen] = useState(false);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [exportingBundle, setExportingBundle] = useState(false);
  const [runbookName, setRunbookName] = useState("");
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>(() =>
    safeJsonParse<RunHistoryEntry[]>(getDesktopStorageItem(RUN_HISTORY_KEY), []),
  );
  const [parameterPresetLibrary, setParameterPresetLibrary] = useState<Record<string, SavedValueProfile[]>>(() =>
    safeJsonParse<Record<string, SavedValueProfile[]>>(getDesktopStorageItem(PARAMETER_PRESETS_KEY), {}),
  );
  const [placeholderProfileLibrary, setPlaceholderProfileLibrary] = useState<Record<string, SavedValueProfile[]>>(() =>
    safeJsonParse<Record<string, SavedValueProfile[]>>(getDesktopStorageItem(PLACEHOLDER_PROFILES_KEY), {}),
  );
  const [environmentProfileLibrary, setEnvironmentProfileLibrary] = useState<Record<string, EnvironmentProfile[]>>(() =>
    safeJsonParse<Record<string, EnvironmentProfile[]>>(getDesktopStorageItem(ENVIRONMENT_PROFILES_KEY), {}),
  );
  const [runbookLibrary, setRunbookLibrary] = useState<Record<string, SavedRunbook[]>>(() =>
    safeJsonParse<Record<string, SavedRunbook[]>>(getDesktopStorageItem(RUNBOOK_LIBRARY_KEY), {}),
  );
  const [parameterValues, setParameterValues] = useState<Record<string, unknown>>({});
  const [captureTranscript, setCaptureTranscript] = useState(true);
  const [runAsAdmin, setRunAsAdmin] = useState(false);
  const [runMode, setRunMode] = useState<RunMode>("standard");
  const [headerVersion, setHeaderVersion] = useState("1.0.0");
  const [headerModules, setHeaderModules] = useState("");
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [parameterPresetName, setParameterPresetName] = useState("");
  const [placeholderProfileName, setPlaceholderProfileName] = useState("");
  const [environmentProfileName, setEnvironmentProfileName] = useState("");
  const [activeEnvironmentProfileName, setActiveEnvironmentProfileName] = useState<string | undefined>(undefined);
  const [beforeRunNotes, setBeforeRunNotes] = useState("");
  const [runHistoryFilter, setRunHistoryFilter] = useState("");
  const [aiExplanation, setAiExplanation] = useState<AIExplainResult | null>(null);
  const [aiOptimization, setAiOptimization] = useState<AIOptimizationResult | null>(null);
  const [selectedRecommendationKeys, setSelectedRecommendationKeys] = useState<string[]>([]);
  const [environmentDoctorResult, setEnvironmentDoctorResult] = useState<DesktopPowerShellRunResult | null>(null);
  const [environmentDoctorRunning, setEnvironmentDoctorRunning] = useState(false);
  const [regexPattern, setRegexPattern] = useState("\\b[A-Z][A-Za-z]+-[A-Z][A-Za-z]+\\b");
  const [regexSample, setRegexSample] = useState(script.slice(0, 4000));
  const [csvSample, setCsvSample] = useState(() => "Name,Path,Enabled\nExample,C:\\Temp,true");
  const [supportContext, setSupportContext] = useState("");
  const [scheduledTaskName, setScheduledTaskName] = useState("PSForge Script Task");
  const [scheduledTaskPath, setScheduledTaskPath] = useState(`C:\\Scripts\\${currentFileName}`);
  const [scheduledTaskSchedule, setScheduledTaskSchedule] = useState<"Daily" | "Weekly" | "AtLogon">("Daily");
  const [scheduledTaskTime, setScheduledTaskTime] = useState("09:00");
  const [scheduledTaskRunHighest, setScheduledTaskRunHighest] = useState(false);
  const [certificationNotes, setCertificationNotes] = useState("Reviewed and approved in PSForge Desktop 3.0.");
  const [certificationHash, setCertificationHash] = useState("");
  const [opsExporting, setOpsExporting] = useState(false);
  const [selectedOpsToolId, setSelectedOpsToolId] = useState<OpsToolId>("environment-doctor");
  const [upgradeDialogState, setUpgradeDialogState] = useState<UpgradeDialogState>({
    open: false,
    feature: "PSForge Pro",
  });

  const analysis = useMemo(() => analyzeScriptWorkbench(script), [script]);
  const hasAIAccess = Boolean(featureAccess?.hasAIAccess);
  const selectedScriptScope = selectedText.trim() ? selectedText.trim() : script;
  const workspaceProfileKey = useMemo(
    () => buildWorkbenchProfileKey(currentFileName, analysis.parameters, analysis.placeholders),
    [analysis.parameters, analysis.placeholders, currentFileName],
  );
  const parameterPresets = useMemo(
    () => parameterPresetLibrary[workspaceProfileKey] || [],
    [parameterPresetLibrary, workspaceProfileKey],
  );
  const placeholderProfiles = useMemo(
    () => placeholderProfileLibrary[workspaceProfileKey] || [],
    [placeholderProfileLibrary, workspaceProfileKey],
  );
  const environmentProfiles = useMemo(
    () => environmentProfileLibrary[workspaceProfileKey] || [],
    [environmentProfileLibrary, workspaceProfileKey],
  );
  const runbooks = useMemo(
    () => runbookLibrary[workspaceProfileKey] || [],
    [runbookLibrary, workspaceProfileKey],
  );
  const showEditorDetailsTab = (tab: string) => {
    setDetailsTab(tab);
    setIsEditorDetailsVisible(true);
  };
  const allOptimizationRecommendations = useMemo(
    () => aiOptimization ? [...aiOptimization.security, ...aiOptimization.performance, ...aiOptimization.bestPractices] : [],
    [aiOptimization],
  );
  const selectedRecommendations = useMemo(
    () => allOptimizationRecommendations.filter((recommendation) => selectedRecommendationKeys.includes(buildRecommendationKey(recommendation))),
    [allOptimizationRecommendations, selectedRecommendationKeys],
  );

  useEffect(() => {
    setParameterValues((current) => {
      const next = { ...normalizeParameterState(analysis.parameters), ...current };
      const normalized = analysis.parameters.reduce<Record<string, unknown>>((accumulator, parameter) => {
        accumulator[parameter.name] = next[parameter.name];
        return accumulator;
      }, {});
      return recordsEqual(current, normalized) ? current : normalized;
    });
  }, [analysis.parameters]);

  useEffect(() => {
    setPlaceholderValues((current) => {
      const normalized = analysis.placeholders.reduce<Record<string, string>>((accumulator, placeholder) => {
        accumulator[placeholder.token] = "";
        return accumulator;
      }, {});
      return stringRecordsEqual(current, normalized) ? current : normalized;
    });
  }, [analysis.placeholders]);

  useEffect(() => {
    setChecklistState((current) => {
      const next: Record<string, boolean> = {};
      for (const item of analysis.checklist) {
        next[item.id] = current[item.id] ?? item.checked;
      }
      return recordsEqual(current, next) ? current : next;
    });
  }, [analysis.checklist]);

  useEffect(() => {
    setDesktopStorageItem(COMMAND_FAVORITES_KEY, JSON.stringify(favoriteCommandIds));
  }, [favoriteCommandIds]);

  useEffect(() => {
    setDesktopStorageItem(COMMAND_LIBRARY_VISIBLE_KEY, JSON.stringify(isCommandLibraryVisible));
  }, [isCommandLibraryVisible]);

  useEffect(() => {
    setDesktopStorageItem(EDITOR_DETAILS_VISIBLE_KEY, JSON.stringify(isEditorDetailsVisible));
  }, [isEditorDetailsVisible]);

  useEffect(() => {
    setDesktopStorageItem(RUN_HISTORY_KEY, JSON.stringify(runHistory.slice(0, 12)));
  }, [runHistory]);

  useEffect(() => {
    const lastRun = runHistory[0];
    onRunHistorySummaryChange?.({
      totalRuns: runHistory.length,
      failedRuns: runHistory.filter((run) => !run.ok || run.exitCode !== 0).length,
      lastRun: lastRun
        ? {
          ok: lastRun.ok,
          exitCode: lastRun.exitCode,
          fileName: lastRun.fileName,
          runMode: lastRun.runMode,
          startedAt: lastRun.startedAt,
          finishedAt: lastRun.finishedAt,
          transcriptPath: lastRun.transcriptPath,
          runDirectory: lastRun.runDirectory,
          stdout: lastRun.stdout,
          stderr: lastRun.stderr,
          shell: lastRun.shell,
          elevated: lastRun.elevated,
          durationMs: new Date(lastRun.finishedAt).getTime() - new Date(lastRun.startedAt).getTime(),
          parameters: lastRun.parameters,
          beforeNotes: lastRun.beforeNotes,
          afterNotes: lastRun.afterNotes,
        }
        : undefined,
    });
  }, [onRunHistorySummaryChange, runHistory]);

  useEffect(() => {
    setDesktopStorageItem(PARAMETER_PRESETS_KEY, JSON.stringify(parameterPresetLibrary));
  }, [parameterPresetLibrary]);

  useEffect(() => {
    setDesktopStorageItem(PLACEHOLDER_PROFILES_KEY, JSON.stringify(placeholderProfileLibrary));
  }, [placeholderProfileLibrary]);

  useEffect(() => {
    setDesktopStorageItem(ENVIRONMENT_PROFILES_KEY, JSON.stringify(environmentProfileLibrary));
  }, [environmentProfileLibrary]);

  useEffect(() => {
    setDesktopStorageItem(RUNBOOK_LIBRARY_KEY, JSON.stringify(runbookLibrary));
  }, [runbookLibrary]);

  useEffect(() => {
    setAiExplanation(null);
    setAiOptimization(null);
    setSelectedRecommendationKeys([]);
  }, [script, selectedText]);

  useEffect(() => {
    if (!regexSample.trim() && script.trim()) {
      setRegexSample(script.slice(0, 4000));
    }
  }, [regexSample, script]);

  useEffect(() => {
    setScheduledTaskPath((current) => {
      if (!current || /\\script\.ps1$/i.test(current) || current.endsWith(currentFileName)) {
        return `C:\\Scripts\\${currentFileName}`;
      }
      return current;
    });
  }, [currentFileName]);

  const validationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/validate", "POST", { code });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setValidationResult(data);
      setLastValidatedCode(variables);
    },
    onError: (_error, variables) => {
      setValidationResult({
        isValid: false,
        errors: [{ line: 0, message: "Failed to validate script - please try again", severity: "error" }],
      });
      setLastValidatedCode(variables);
    },
  });

  const comprehensiveValidationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/validate/comprehensive", "POST", { code });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setComprehensiveValidation(data);
      setLastComprehensiveCode(variables);
    },
    onError: () => {
      toast({
        title: "Validation failed",
        description: "Could not run the comprehensive pre-flight analysis right now.",
        variant: "destructive",
      });
      setComprehensiveValidation(null);
    },
  });

  const explainMutation = useMutation({
    mutationFn: async ({ input }: { input: string }) => {
      const response = await apiRequest("/cli/explain", "POST", {
        input,
        inputType: "script",
        locale,
      });
      return response.json() as Promise<{ ok: true; data: AIExplainResult }>;
    },
    onSuccess: (payload) => {
      setAiExplanation(payload.data);
    },
    onError: () => {
      toast({
        title: "AI explanation unavailable",
        description: "PSForge could not generate the script explanation right now.",
        variant: "destructive",
      });
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/ai/optimize", "POST", { code, locale });
      return response.json() as Promise<AIOptimizationResult>;
    },
    onSuccess: (result) => {
      setAiOptimization(result);
      const defaultKeys = [...result.security, ...result.performance, ...result.bestPractices]
        .filter((recommendation) => recommendation.priority === "critical" || recommendation.priority === "high")
        .map(buildRecommendationKey);
      setSelectedRecommendationKeys(defaultKeys);
      showEditorDetailsTab("ai-review");
    },
    onError: () => {
      toast({
        title: "AI review unavailable",
        description: "PSForge could not analyze this script with AI right now.",
        variant: "destructive",
      });
    },
  });

  const applyOptimizationsMutation = useMutation({
    mutationFn: async (recommendations: AIOptimizationRecommendation[]) => {
      const response = await apiRequest("/api/ai/apply-optimizations", "POST", {
        code: script,
        recommendations,
        locale,
      });
      return response.json() as Promise<{ optimizedScript: string }>;
    },
    onSuccess: ({ optimizedScript }) => {
      setScript(optimizedScript);
      toast({
        title: "AI fixes applied",
        description: "PSForge updated the script with the selected AI recommendations.",
      });
    },
    onError: () => {
      toast({
        title: "Could not apply AI fixes",
        description: "The selected recommendations could not be applied automatically right now.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!script.trim()) {
      setValidationResult((current) => (
        current.isValid && current.errors.length === 0
          ? current
          : { isValid: true, errors: [] }
      ));
      setComprehensiveValidation((current) => (current === null ? current : null));
      setLastValidatedCode((current) => (current === "" ? current : ""));
      setLastComprehensiveCode((current) => (current === "" ? current : ""));
      return;
    }

    if (script !== lastValidatedCode && !validationMutation.isPending) {
      validationMutation.mutate(script);
    }

    if (script !== lastComprehensiveCode && comprehensiveValidation !== null) {
      setComprehensiveValidation(null);
    }
  }, [script, lastValidatedCode, lastComprehensiveCode, comprehensiveValidation, validationMutation.isPending, validationMutation.mutate]);

  const preflightSummary = useMemo(() => {
    return {
      critical: analysis.issues.filter((issue) => issue.severity === "critical").length,
      warning: analysis.issues.filter((issue) => issue.severity === "warning").length,
      info: analysis.issues.filter((issue) => issue.severity === "info").length,
    };
  }, [analysis.issues]);

  const handleAddCommand = (command: Command) => {
    let commandSyntax = `${command.name}`;

    if (command.parameters.length > 0) {
      const params = command.parameters
        .map((param) => {
          if (param.type === "switch" || param.type === "boolean") {
            return `-${param.name}`;
          }
          if (param.required) {
            return `-${param.name} <${param.name}>`;
          }
          return `-${param.name} [${param.name}]`;
        })
        .join(" ");
      commandSyntax += ` ${params}`;
    }

    let insertion = commandSyntax;
    if (script.length > 0 && cursorPosition > 0 && script[cursorPosition - 1] !== "\n") {
      insertion = `\n${insertion}`;
    }
    insertion += "\n";

    const before = script.slice(0, cursorPosition);
    const after = script.slice(cursorPosition);
    setScript(`${before}${insertion}${after}`);
    setCursorPosition(cursorPosition + insertion.length);
  };

  const toggleFavoriteCommand = (commandId: string) => {
    setFavoriteCommandIds((current) =>
      current.includes(commandId)
        ? current.filter((entry) => entry !== commandId)
        : [commandId, ...current].slice(0, 12),
    );
  };

  const saveParameterPreset = () => {
    const name = parameterPresetName.trim();
    if (!name) {
      toast({
        title: "Name this preset first",
        description: "Give the parameter preset a short name so you can reuse it later.",
        variant: "destructive",
      });
      return;
    }

    const preset: SavedValueProfile = {
      id: `${Date.now()}`,
      name,
      updatedAt: new Date().toISOString(),
      values: { ...parameterValues },
    };

    setParameterPresetLibrary((current) => {
      const existing = (current[workspaceProfileKey] || []).filter((entry) => entry.name.toLowerCase() !== name.toLowerCase());
      return {
        ...current,
        [workspaceProfileKey]: [preset, ...existing].slice(0, 8),
      };
    });
    setParameterPresetName("");
    toast({
      title: "Preset saved",
      description: `${name} is ready to reuse the next time you run this script shape.`,
    });
  };

  const applyParameterPreset = (preset: SavedValueProfile) => {
    setParameterValues((current) => ({ ...current, ...preset.values }));
    toast({
      title: "Preset applied",
      description: `${preset.name} filled the current parameter form.`,
    });
  };

  const deleteParameterPreset = (presetId: string) => {
    setParameterPresetLibrary((current) => ({
      ...current,
      [workspaceProfileKey]: (current[workspaceProfileKey] || []).filter((entry) => entry.id !== presetId),
    }));
  };

  const savePlaceholderProfile = () => {
    const name = placeholderProfileName.trim();
    if (!name) {
      toast({
        title: "Name this profile first",
        description: "Give the placeholder profile a short name so you can load it back in one click.",
        variant: "destructive",
      });
      return;
    }

    const profile: SavedValueProfile = {
      id: `${Date.now()}`,
      name,
      updatedAt: new Date().toISOString(),
      values: { ...placeholderValues },
    };

    setPlaceholderProfileLibrary((current) => {
      const existing = (current[workspaceProfileKey] || []).filter((entry) => entry.name.toLowerCase() !== name.toLowerCase());
      return {
        ...current,
        [workspaceProfileKey]: [profile, ...existing].slice(0, 8),
      };
    });
    setPlaceholderProfileName("");
    toast({
      title: "Profile saved",
      description: `${name} is ready for this workflow the next time you replace placeholders.`,
    });
  };

  const applyPlaceholderProfile = (profile: SavedValueProfile) => {
    setPlaceholderValues((current) => {
      const next: Record<string, string> = { ...current };
      for (const [token, value] of Object.entries(profile.values)) {
        next[token] = String(value ?? "");
      }
      return next;
    });
    toast({
      title: "Profile applied",
      description: `${profile.name} restored the saved placeholder values.`,
    });
  };

  const deletePlaceholderProfile = (profileId: string) => {
    setPlaceholderProfileLibrary((current) => ({
      ...current,
      [workspaceProfileKey]: (current[workspaceProfileKey] || []).filter((entry) => entry.id !== profileId),
    }));
  };

  const saveEnvironmentProfile = () => {
    const name = environmentProfileName.trim();
    if (!name) {
      toast({
        title: "Name this environment profile first",
        description: "Use a label like Dev, Pilot, Production, or Customer A so the run setup is easy to reload later.",
        variant: "destructive",
      });
      return;
    }

    const profile: EnvironmentProfile = {
      id: `${Date.now()}`,
      name,
      updatedAt: new Date().toISOString(),
      parameterValues: { ...parameterValues },
      placeholderValues: { ...placeholderValues },
      checklistState: { ...checklistState },
      captureTranscript,
      runAsAdmin,
      runMode,
      beforeNotes: beforeRunNotes,
    };

    setEnvironmentProfileLibrary((current) => {
      const existing = (current[workspaceProfileKey] || []).filter((entry) => entry.name.toLowerCase() !== name.toLowerCase());
      return {
        ...current,
        [workspaceProfileKey]: [profile, ...existing].slice(0, 8),
      };
    });
    setActiveEnvironmentProfileName(name);
    setEnvironmentProfileName("");
    toast({
      title: "Environment profile saved",
      description: `${name} now captures your parameters, placeholders, run mode, and checklist state for this script.`,
    });
  };

  const applyEnvironmentProfile = (profile: EnvironmentProfile) => {
    setParameterValues((current) => ({ ...current, ...profile.parameterValues }));
    setPlaceholderValues((current) => ({ ...current, ...profile.placeholderValues }));
    setChecklistState((current) => ({ ...current, ...profile.checklistState }));
    setCaptureTranscript(profile.captureTranscript);
    setRunAsAdmin(profile.runAsAdmin);
    setRunMode(profile.runMode);
    setBeforeRunNotes(profile.beforeNotes);
    setActiveEnvironmentProfileName(profile.name);
    toast({
      title: "Environment profile applied",
      description: `${profile.name} restored the saved run configuration for this workflow.`,
    });
  };

  const deleteEnvironmentProfile = (profileId: string) => {
    setEnvironmentProfileLibrary((current) => ({
      ...current,
      [workspaceProfileKey]: (current[workspaceProfileKey] || []).filter((entry) => entry.id !== profileId),
    }));
    if ((environmentProfiles.find((entry) => entry.id === profileId)?.name || "") === activeEnvironmentProfileName) {
      setActiveEnvironmentProfileName(undefined);
    }
  };

  const updateRunAfterNotes = (runId: string, afterNotes: string) => {
    setRunHistory((current) =>
      current.map((entry) => (entry.id === runId ? { ...entry, afterNotes } : entry)),
    );
  };

  const runComprehensiveValidation = () => {
    if (!script.trim()) {
      return;
    }
    comprehensiveValidationMutation.mutate(script);
    showEditorDetailsTab("workbench");
  };

  const openUpgradeDialog = (nextState: Omit<UpgradeDialogState, "open">) => {
    setUpgradeDialogState({
      ...nextState,
      open: true,
    });
  };

  const handleRequestAiExplanation = () => {
    if (!selectedScriptScope.trim()) {
      toast({
        title: "Nothing to explain",
        description: "Add a script or highlight a section before asking PSForge to explain it.",
        variant: "destructive",
      });
      return;
    }

    if (!hasAIAccess) {
      openUpgradeDialog({
        feature: "AI script explanations",
        title: "Explain scripts with PSForge Pro",
        description: "Use AI to turn selected PowerShell into a plain-English explanation, operator notes, likely risks, and next-step guidance.",
        previewTitle: "What the AI explanation gives you",
        previewItems: [
          "Summarize what the script or selected block actually does.",
          "Call out likely risks, side effects, and operator caveats.",
          "Suggest the next safe step before you run or hand off the script.",
        ],
        contextLabel: "AI explanation",
      });
      return;
    }

    void explainMutation.mutateAsync({ input: selectedScriptScope });
  };

  const handleRunAiReview = () => {
    if (!script.trim()) {
      toast({
        title: "Nothing to review",
        description: "Add a script before asking PSForge to run the AI review.",
        variant: "destructive",
      });
      return;
    }

    if (!hasAIAccess) {
      showEditorDetailsTab("ai-review");
      openUpgradeDialog({
        feature: "AI script review",
        title: "Review scripts with PSForge Pro",
        description: "Get a deeper AI pass over performance, security, best practices, and safer alternative approaches before you run the script.",
        previewTitle: "What PSForge Pro reviews for you",
        previewItems: [
          "Performance and pipeline cleanup opportunities.",
          "Security and privilege concerns worth fixing before production.",
          "Guided remediation with one-click apply for selected fixes.",
        ],
        contextLabel: "AI review",
      });
      return;
    }

    void optimizeMutation.mutateAsync(script);
  };

  const handleToggleRecommendation = (recommendation: AIOptimizationRecommendation) => {
    const key = buildRecommendationKey(recommendation);
    setSelectedRecommendationKeys((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  };

  const handleApplySelectedAiFixes = () => {
    if (selectedRecommendations.length === 0) {
      toast({
        title: "Select recommendations first",
        description: "Pick at least one AI recommendation before applying fixes to the script.",
        variant: "destructive",
      });
      return;
    }

    void applyOptimizationsMutation.mutateAsync(selectedRecommendations);
  };

  const handleRecommendedRemediation = (issueId: string) => {
    if (issueId === "placeholders") {
      setPlaceholderDialogOpen(true);
      return;
    }

    if (issueId === "required-parameters") {
      setRunDialogOpen(true);
      return;
    }

    if (issueId === "no-param-block") {
      setHeaderDialogOpen(true);
      return;
    }

    handleRunAiReview();
  };

  useEffect(() => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "run") {
      setRunDialogOpen(true);
      return;
    }

    if (pendingAction.type === "rerun-last") {
      const lastRun = runHistory[0];
      if (!lastRun) {
        setRunDialogOpen(true);
        return;
      }

      setParameterValues((current) => ({
        ...current,
        ...lastRun.parameters,
      }));
      setRunMode(lastRun.runMode);
      setActiveEnvironmentProfileName(lastRun.environmentProfileName);
      setBeforeRunNotes(lastRun.beforeNotes || "");
      setRunDialogOpen(true);
      toast({
        title: "Last run loaded",
        description: "Parameters and run mode are ready for review before rerunning.",
      });
      return;
    }

    if (pendingAction.type === "preflight") {
      runComprehensiveValidation();
      return;
    }

    if (pendingAction.type === "ai-review") {
      handleRunAiReview();
      return;
    }

    if (pendingAction.type === "header") {
      setHeaderDialogOpen(true);
      return;
    }

    if (pendingAction.type === "placeholders") {
      setPlaceholderDialogOpen(true);
      return;
    }

    if (pendingAction.type === "workbench") {
      showEditorDetailsTab("workbench");
    }
  }, [pendingAction?.id]);

  const handleGenerateHeader = () => {
    const headerScript = generateCommentHeader(script, {
      fileName: currentFileName,
      author: authorName,
      version: headerVersion,
      requiredModules: headerModules
        .split(",")
        .map((moduleName) => moduleName.trim())
        .filter(Boolean),
    });
    setScript(headerScript);
    setHeaderDialogOpen(false);
    toast({
      title: "Header inserted",
      description: "Comment-based help, notes, modules, and changelog details were added at the top of the script.",
    });
  };

  const handleApplyPlaceholderReplacements = () => {
    setScript(replacePlaceholders(script, placeholderValues));
    setPlaceholderDialogOpen(false);
    toast({
      title: "Placeholders replaced",
      description: "The script was updated with your environment-specific values.",
    });
  };

  const handleExportBundle = async () => {
    const targetDirectory = await openDesktopDirectory();
    if (!targetDirectory || targetDirectory.canceled || !targetDirectory.filePath) {
      return;
    }

    setExportingBundle(true);
    try {
      const bundleFolderName = `${currentFileName.replace(/\.[^.]+$/, "") || "psforge-script"}-bundle`;
      const bundleRoot = `${targetDirectory.filePath}\\${bundleFolderName}`;
      const checklist = analysis.checklist.map((item) => ({
        ...item,
        checked: checklistState[item.id] ?? item.checked,
      }));
      const files = buildExportBundleArtifacts(script, {
        fileName: currentFileName,
        author: authorName,
        checklist,
      });
      const baseName = currentFileName.replace(/\.[^.]+$/, "") || "psforge-script";
      const deploymentReadiness = [
        `# ${baseName} deployment readiness`,
        "",
        analysis.explanation.summary,
        "",
        "## Recommended environment",
        `- Active profile: ${activeEnvironmentProfileName || "Not selected"}`,
        `- Run mode: ${runMode}`,
        `- Run as admin: ${runAsAdmin ? "Yes" : "No"}`,
        `- Transcript capture: ${captureTranscript ? "Enabled" : "Disabled"}`,
        "",
        "## Outstanding quick-review issues",
        ...(analysis.issues.length > 0
          ? analysis.issues.map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.recommendation || issue.description}`)
          : ["- No quick-analysis issues detected."]),
        "",
        "## Deployment checklist",
        ...checklist.map((item) => `- [${item.checked ? "x" : " "}] ${item.label} — ${item.description}`),
        "",
        "## Before-run notes",
        beforeRunNotes || "- Add target environment, rollback notes, and approval references here.",
      ].join("\n");
      const runbookMarkdown = [
        `# ${baseName} runbook`,
        "",
        `Created: ${new Date().toISOString()}`,
        `Author: ${authorName}`,
        "",
        "## Purpose",
        analysis.explanation.summary,
        "",
        "## Inputs",
        ...(analysis.parameters.length > 0
          ? analysis.parameters.map((parameter) => `- ${parameter.name} (${parameter.type})${parameter.required ? " — required" : ""}`)
          : ["- No explicit param() block detected."]),
        "",
        "## Placeholder values",
        ...(analysis.placeholders.length > 0
          ? analysis.placeholders.map((placeholder) => `- ${placeholder.token}: ${placeholderValues[placeholder.token] || placeholder.example}`)
          : ["- No placeholders detected."]),
        "",
        "## Execution sequence",
        "1. Review the deployment-readiness file and complete any unchecked items.",
        "2. Confirm required modules are available in the target environment.",
        "3. Load the saved environment profile or parameter preset for the target run.",
        "4. Run the script in the selected mode and review the transcript output.",
        "5. Record the outcome and any after-run notes in PSForge.",
      ].join("\n");

      for (const file of files) {
        await writeDesktopScriptFile(`${bundleRoot}\\${file.name}`, file.content);
      }
      await writeDesktopScriptFile(`${bundleRoot}\\deployment-readiness.md`, deploymentReadiness);
      await writeDesktopScriptFile(`${bundleRoot}\\runbook.md`, runbookMarkdown);

      const zipPath = `${bundleRoot}.zip`;
      await zipDesktopDirectory(bundleRoot, zipPath);

      toast({
        title: "Bundle exported",
        description: `${bundleFolderName} and its zip archive are ready with the script, README, notes, and input samples.`,
      });
      await openDesktopPath(zipPath);
    } catch (error: any) {
      toast({
        title: "Bundle export failed",
        description: error?.message || "Could not create the export bundle.",
        variant: "destructive",
      });
    } finally {
      setExportingBundle(false);
    }
  };

  const handleCopyText = async (value: string, description: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: "Copied",
        description,
      });
    } catch (error: any) {
      toast({
        title: "Copy failed",
        description: error?.message || "Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const buildEnvironmentDoctorScript = () => [
    "$ErrorActionPreference = 'Continue'",
    "$checks = [ordered]@{}",
    "$checks.PowerShellVersion = $PSVersionTable.PSVersion.ToString()",
    "$checks.Edition = $PSVersionTable.PSEdition",
    "$checks.ExecutionPolicy = (Get-ExecutionPolicy -List | Out-String).Trim()",
    "$identity = [Security.Principal.WindowsIdentity]::GetCurrent()",
    "$principal = [Security.Principal.WindowsPrincipal]::new($identity)",
    "$checks.IsAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
    "$checks.Network = Test-Connection -ComputerName 'psforge.app' -Count 1 -Quiet -ErrorAction SilentlyContinue",
    "$checks.Dns = [bool](Resolve-DnsName 'psforge.app' -ErrorAction SilentlyContinue)",
    "$checks.Domain = try { (Get-CimInstance Win32_ComputerSystem).Domain } catch { 'Unavailable' }",
    "$checks.EntraJoin = try { (dsregcmd /status | Select-String 'AzureAdJoined|DomainJoined' | ForEach-Object { $_.Line.Trim() }) -join '; ' } catch { 'Unavailable' }",
    "$checks.WinRM = try { Test-WSMan -ComputerName localhost -ErrorAction Stop | Out-Null; 'Available' } catch { 'Unavailable' }",
    "$checks.Modules = @(",
    ...operationsSuitePlan.environmentChecks
      .find((check) => check.id === "modules")
      ?.remediation?.split(/\r?\n/)
      .filter(Boolean)
      .map((command) => {
        const moduleMatch = /Install-Module\s+([A-Za-z0-9_.-]+)/i.exec(command);
        return moduleMatch ? `  '${moduleMatch[1]}'` : "";
      })
      .filter(Boolean) || [],
    ") | ForEach-Object { [pscustomobject]@{ Name = $_; Available = [bool](Get-Module -ListAvailable -Name $_) } }",
    "[pscustomobject]$checks | Format-List",
  ].join("\n");

  const handleRunEnvironmentDoctor = async () => {
    if (!isDesktopApp()) {
      toast({
        title: "Desktop-only action",
        description: "Environment Doctor needs the Windows desktop runtime.",
        variant: "destructive",
      });
      return;
    }

    setEnvironmentDoctorRunning(true);
    try {
      const result = await runDesktopPowerShellScript({
        scriptContent: buildEnvironmentDoctorScript(),
        fileName: "psforge-environment-doctor.ps1",
        captureTranscript: true,
        runMode: "report-only",
      });
      setEnvironmentDoctorResult(result);
      toast({
        title: "Environment Doctor complete",
        description: "Machine readiness output was captured for review.",
        variant: result.exitCode === 0 ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Environment Doctor failed",
        description: error?.message || "Could not run the local diagnostic script.",
        variant: "destructive",
      });
    } finally {
      setEnvironmentDoctorRunning(false);
    }
  };

  const handleRunGeneratedPesterTests = async () => {
    if (!isDesktopApp()) {
      toast({
        title: "Desktop-only action",
        description: "Pester execution needs the Windows desktop runtime.",
        variant: "destructive",
      });
      return;
    }

    try {
      const safeScriptFileName = sanitizePowerShellFileName(currentFileName);
      const safeTestFileName = `${safeScriptFileName.replace(/\.[^.]+$/, "") || "script"}.Tests.ps1`;
      const encodedScript = encodeUtf8Base64(script);
      const encodedTest = encodeUtf8Base64(operationsSuitePlan.pesterTestDraft);
      const runnerScript = [
        "$ErrorActionPreference = 'Stop'",
        `$ScriptBytes = [Convert]::FromBase64String("${encodedScript}")`,
        `$TestBytes = [Convert]::FromBase64String("${encodedTest}")`,
        "$ScriptText = [Text.Encoding]::UTF8.GetString($ScriptBytes)",
        "$TestText = [Text.Encoding]::UTF8.GetString($TestBytes)",
        "$TempRoot = Join-Path $env:TEMP ('psforge-pester-' + [guid]::NewGuid().ToString('N'))",
        "New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null",
        `$ScriptPath = Join-Path $TempRoot "${safeScriptFileName}"`,
        `$TestPath = Join-Path $TempRoot "${safeTestFileName}"`,
        "Set-Content -Path $ScriptPath -Value $ScriptText -Encoding UTF8",
        "Set-Content -Path $TestPath -Value $TestText -Encoding UTF8",
        "if (Get-Module -ListAvailable -Name Pester) {",
        "  Import-Module Pester",
        "  Invoke-Pester -Path $TestPath -Output Detailed",
        "} else {",
        "  Write-Warning 'Pester is not installed. Running PSForge syntax fallback only.'",
        "  [scriptblock]::Create($ScriptText) | Out-Null",
        "  Write-Host '[PASS] Script syntax parsed successfully.'",
        "  Write-Host 'Install-Module Pester -Scope CurrentUser to run the generated .Tests.ps1 file.'",
        "}",
      ].join("\n");

      const result = await runDesktopPowerShellScript({
        scriptContent: runnerScript,
        fileName: `${safeScriptFileName.replace(/\.[^.]+$/, "") || "script"}-pester-runner.ps1`,
        captureTranscript: true,
        runMode: "report-only",
      });
      const nextEntry: RunHistoryEntry = {
        ...result,
        id: `${Date.now()}`,
        parameters: {},
        runMode: "report-only",
        beforeNotes: "Generated Pester starter test run.",
      };
      setRunHistory((current) => [nextEntry, ...current].slice(0, 12));
      showEditorDetailsTab("runs");
      toast({
        title: result.exitCode === 0 ? "Pester run captured" : "Pester run needs review",
        description: "The generated test output is available in Runs.",
        variant: result.exitCode === 0 ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Could not run Pester tests",
        description: error?.message || "Install Pester or export the test file to run it manually.",
        variant: "destructive",
      });
    }
  };

  const handleCalculateCertification = async () => {
    try {
      const bytes = new TextEncoder().encode(script);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      setCertificationHash(hash);
      toast({
        title: "Certification hash calculated",
        description: "A SHA-256 script fingerprint is ready for the manifest.",
      });
    } catch (error: any) {
      toast({
        title: "Certification failed",
        description: error?.message || "Could not calculate the SHA-256 hash.",
        variant: "destructive",
      });
    }
  };

  const handleExportOpsSuiteBundle = async () => {
    const targetDirectory = await openDesktopDirectory();
    if (!targetDirectory || targetDirectory.canceled || !targetDirectory.filePath) {
      return;
    }

    setOpsExporting(true);
    try {
      const baseName = currentFileName.replace(/\.[^.]+$/, "") || "psforge-script";
      const bundleRoot = `${targetDirectory.filePath}\\${baseName}-psforge-ops-suite`;
      const artifacts = [
        { name: currentFileName, content: script },
        { name: `${baseName}.Tests.ps1`, content: operationsSuitePlan.pesterTestDraft },
        { name: "environment-doctor.ps1", content: buildEnvironmentDoctorScript() },
        { name: "dependency-manifest.md", content: operationsSuitePlan.dependencyManifest },
        { name: "package-plan.md", content: operationsSuitePlan.packagePlan },
        { name: "runbook.md", content: operationsSuitePlan.runbookDraft },
        { name: "rollback-plan.md", content: operationsSuitePlan.rollbackPlan.map((item) => `- ${item}`).join("\n") },
        { name: "modernization-plan.md", content: operationsSuitePlan.modernizationPlan.map((item) => `- ${item}`).join("\n") },
        { name: "compatibility-matrix.json", content: JSON.stringify(compatibilityMatrix, null, 2) },
        { name: "credential-leak-report.json", content: JSON.stringify(credentialFindings, null, 2) },
        { name: "pipeline-explorer.json", content: JSON.stringify(pipelineStages, null, 2) },
        { name: "performance-profiler.ps1", content: profilerScript },
        { name: "scheduled-task-installer.ps1", content: scheduledTaskInstaller },
        { name: "sanitized-support-bundle.md", content: supportBundle },
        { name: "script-certification.json", content: certificationManifest },
      ];

      for (const artifact of artifacts) {
        await writeDesktopScriptFile(`${bundleRoot}\\${artifact.name}`, artifact.content);
      }

      const zipPath = `${bundleRoot}.zip`;
      await zipDesktopDirectory(bundleRoot, zipPath);
      await openDesktopPath(zipPath);
      toast({
        title: "Ops Suite bundle exported",
        description: "The script, diagnostics, tests, package plan, runbook, rollback plan, and support artifacts were zipped.",
      });
    } catch (error: any) {
      toast({
        title: "Ops Suite export failed",
        description: error?.message || "Could not create the Ops Suite bundle.",
        variant: "destructive",
      });
    } finally {
      setOpsExporting(false);
    }
  };

  const handleRunScript = async () => {
    if (!isDesktopApp()) {
      toast({
        title: "Desktop-only action",
        description: "Script execution and transcript capture are available in PSForge Desktop.",
        variant: "destructive",
      });
      return;
    }

    if (!script.trim()) {
      toast({
        title: "Nothing to run",
        description: "Add a script before opening Run setup.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parameters = analysis.parameters.reduce<Record<string, unknown>>((accumulator, parameter) => {
        accumulator[parameter.name] = convertParameterValue(parameter, parameterValues[parameter.name]);
        return accumulator;
      }, {});

      const result = await runDesktopPowerShellScript({
        scriptContent: script,
        fileName: currentFileName,
        parameters,
        captureTranscript,
        runAsAdmin,
        runMode,
      });

      const nextEntry: RunHistoryEntry = {
        ...result,
        id: `${Date.now()}`,
        parameters,
        runMode,
        environmentProfileName: activeEnvironmentProfileName,
        beforeNotes: beforeRunNotes.trim() || undefined,
      };
      setRunHistory((current) => [nextEntry, ...current].slice(0, 12));
      setRunDialogOpen(false);
      showEditorDetailsTab("runs");

      toast({
        title: result.exitCode === 0 ? "Script run completed" : "Script run finished with issues",
        description: result.exitCode === 0
          ? "Transcript, output, and run summary details were captured in the Runs tab."
          : "Review the Runs tab for transcript output and error details.",
        variant: result.exitCode === 0 ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Run failed",
        description: error?.message || "Could not start the PowerShell run.",
        variant: "destructive",
      });
    }
  };

  const checklistItems: ExecutionChecklistItem[] = useMemo(
    () => analysis.checklist.map((item) => ({ ...item, checked: checklistState[item.id] ?? item.checked })),
    [analysis.checklist, checklistState],
  );
  const operationsSuitePlan = useMemo(
    () => displayMode === "ops"
      ? buildOperationsSuitePlan(script, {
        fileName: currentFileName,
        author: authorName,
        checklist: checklistItems,
      })
      : {
        readinessScore: 0,
        environmentChecks: [],
        dependencyManifest: "",
        impactPreview: [],
        rollbackPlan: [],
        modernizationPlan: [],
        pesterTestDraft: "",
        packagePlan: "",
        runbookDraft: "",
      },
    [authorName, checklistItems, currentFileName, displayMode, script],
  );
  const regexLabResult = useMemo(
    () => displayMode === "ops" ? runRegexLab(regexPattern, regexSample) : { ok: true, matches: [], explanation: [] },
    [displayMode, regexPattern, regexSample],
  );
  const pipelineStages = useMemo(() => displayMode === "ops" ? inspectPipeline(script) : [], [displayMode, script]);
  const parameterSetDraft = useMemo(() => displayMode === "ops" ? buildParameterSetDesignerDraft(analysis.parameters) : "", [analysis.parameters, displayMode]);
  const credentialFindings = useMemo(() => displayMode === "ops" ? detectCredentialLeaks(script) : [], [displayMode, script]);
  const compatibilityMatrix = useMemo(() => displayMode === "ops" ? buildCompatibilityMatrix(script) : [], [displayMode, script]);
  const csvMapping = useMemo(
    () => displayMode === "ops" ? parseCsvMapping(csvSample, analysis.parameters) : { headers: [], suggestedParameterMap: {}, previewObjects: [] },
    [analysis.parameters, csvSample, displayMode],
  );
  const profilerScript = useMemo(() => displayMode === "ops" ? buildPerformanceProfilerScript(script, currentFileName) : "", [currentFileName, displayMode, script]);
  const supportBundle = useMemo(() => displayMode === "ops" ? buildSanitizedSupportBundle(script, supportContext, currentFileName) : "", [currentFileName, displayMode, script, supportContext]);
  const scheduledTaskInstaller = useMemo(
    () => displayMode === "ops" ? buildScheduledTaskInstaller({
      taskName: scheduledTaskName,
      scriptPath: scheduledTaskPath,
      schedule: scheduledTaskSchedule,
      time: scheduledTaskTime,
      runAsHighest: scheduledTaskRunHighest,
    }) : "",
    [displayMode, scheduledTaskName, scheduledTaskPath, scheduledTaskRunHighest, scheduledTaskSchedule, scheduledTaskTime],
  );
  const certificationManifest = useMemo(
    () => displayMode === "ops" ? buildCertificationManifest(script, {
      fileName: currentFileName,
      hash: certificationHash || "Run certification to calculate SHA-256",
      owner: authorName,
      notes: certificationNotes,
    }) : "",
    [authorName, certificationHash, certificationNotes, currentFileName, displayMode, script],
  );
  const opsToolGroups = [
    {
      label: localizeOpsToolText(locale, "prepare", "label", "Prepare"),
      tools: [
        {
          id: "environment-doctor" as OpsToolId,
          title: localizeOpsToolText(locale, "environment-doctor", "title", "Environment Doctor"),
          description: localizeOpsToolText(locale, "environment-doctor", "description", "Readiness score, machine checks, and remediation commands."),
          icon: ShieldAlert,
          badge: `${operationsSuitePlan.readinessScore}%`,
        },
        {
          id: "impact-preview" as OpsToolId,
          title: localizeOpsToolText(locale, "impact-preview", "title", "Change Impact Preview"),
          description: localizeOpsToolText(locale, "impact-preview", "description", "Predicted changes and touched systems before execution."),
          icon: Eye,
          badge: `${operationsSuitePlan.impactPreview.length}`,
        },
        {
          id: "credential-leak-detector" as OpsToolId,
          title: localizeOpsToolText(locale, "credential-leak-detector", "title", "Credential Leak Detector"),
          description: localizeOpsToolText(locale, "credential-leak-detector", "description", "Hard-coded passwords, tokens, tenant IDs, and unsafe secret handling."),
          icon: KeyRound,
          badge: `${credentialFindings.length}`,
        },
        {
          id: "compatibility-matrix" as OpsToolId,
          title: localizeOpsToolText(locale, "compatibility-matrix", "title", "Compatibility Matrix"),
          description: localizeOpsToolText(locale, "compatibility-matrix", "description", "PowerShell, Server, Azure Automation, and constrained endpoint fit."),
          icon: FileCheck,
          badge: `${compatibilityMatrix.filter((item) => item.status !== "compatible").length}`,
        },
      ],
    },
    {
      label: localizeOpsToolText(locale, "build", "label", "Build"),
      tools: [
        {
          id: "pester-generator" as OpsToolId,
          title: localizeOpsToolText(locale, "pester-generator", "title", "Pester Test Generator"),
          description: localizeOpsToolText(locale, "pester-generator", "description", "Generate and run starter tests for the active script."),
          icon: FlaskConical,
          badge: localizeOpsToolText(locale, "pester-generator", "badge", "Tests"),
        },
        {
          id: "parameter-set-designer" as OpsToolId,
          title: localizeOpsToolText(locale, "parameter-set-designer", "title", "Parameter Set Designer"),
          description: localizeOpsToolText(locale, "parameter-set-designer", "description", "Turn detected parameters into an advanced function scaffold."),
          icon: List,
          badge: `${analysis.parameters.length}`,
        },
        {
          id: "regex-lab" as OpsToolId,
          title: localizeOpsToolText(locale, "regex-lab", "title", "Regex Lab"),
          description: localizeOpsToolText(locale, "regex-lab", "description", "Build, explain, and test PowerShell regular expressions."),
          icon: Search,
          badge: `${regexLabResult.matches.length}`,
        },
        {
          id: "csv-data-mapper" as OpsToolId,
          title: localizeOpsToolText(locale, "csv-data-mapper", "title", "CSV Data Mapper"),
          description: localizeOpsToolText(locale, "csv-data-mapper", "description", "Map CSV columns into parameters and preview bulk objects."),
          icon: Table2,
          badge: `${csvMapping.headers.length}`,
        },
      ],
    },
    {
      label: localizeOpsToolText(locale, "document", "label", "Document"),
      tools: [
        {
          id: "runbook-generator" as OpsToolId,
          title: localizeOpsToolText(locale, "runbook-generator", "title", "Runbook Generator"),
          description: localizeOpsToolText(locale, "runbook-generator", "description", "Operational documentation with prerequisites, validation, and rollback."),
          icon: BookOpen,
          badge: "MD",
        },
        {
          id: "dependency-manager" as OpsToolId,
          title: localizeOpsToolText(locale, "dependency-manager", "title", "Dependency and Module Manager"),
          description: localizeOpsToolText(locale, "dependency-manager", "description", "Module hints, referenced commands, and #Requires suggestions."),
          icon: ClipboardList,
          badge: `${analysis.moduleSuggestions.length}`,
        },
        {
          id: "pipeline-explorer" as OpsToolId,
          title: localizeOpsToolText(locale, "pipeline-explorer", "title", "Object/Pipeline Explorer"),
          description: localizeOpsToolText(locale, "pipeline-explorer", "description", "Inspect likely object flow through each pipeline stage."),
          icon: Activity,
          badge: `${pipelineStages.length}`,
        },
        {
          id: "error-reproduction-builder" as OpsToolId,
          title: localizeOpsToolText(locale, "error-reproduction-builder", "title", "Error Reproduction Builder"),
          description: localizeOpsToolText(locale, "error-reproduction-builder", "description", "Create a sanitized support bundle from errors and context."),
          icon: FileJson,
          badge: localizeOpsToolText(locale, "error-reproduction-builder", "badge", "Safe"),
        },
      ],
    },
    {
      label: localizeOpsToolText(locale, "ship", "label", "Ship"),
      tools: [
        {
          id: "script-packager" as OpsToolId,
          title: localizeOpsToolText(locale, "script-packager", "title", "PowerShell Script Packager"),
          description: localizeOpsToolText(locale, "script-packager", "description", "Deployment package plan and one-click Ops bundle export."),
          icon: FileArchive,
          badge: "ZIP",
        },
        {
          id: "scheduled-task-builder" as OpsToolId,
          title: localizeOpsToolText(locale, "scheduled-task-builder", "title", "Scheduled Task Builder"),
          description: localizeOpsToolText(locale, "scheduled-task-builder", "description", "Configure Task Scheduler triggers, accounts, and installer script."),
          icon: CalendarClock,
          badge: scheduledTaskSchedule,
        },
        {
          id: "rollback-builder" as OpsToolId,
          title: localizeOpsToolText(locale, "rollback-builder", "title", "Rollback Builder"),
          description: localizeOpsToolText(locale, "rollback-builder", "description", "Rollback guidance with irreversible operations called out."),
          icon: ShieldAlert,
          badge: `${operationsSuitePlan.rollbackPlan.length}`,
        },
        {
          id: "script-modernizer" as OpsToolId,
          title: localizeOpsToolText(locale, "script-modernizer", "title", "Script Modernizer"),
          description: localizeOpsToolText(locale, "script-modernizer", "description", "Migration and hardening guidance for older PowerShell scripts."),
          icon: WandSparkles,
          badge: `${operationsSuitePlan.modernizationPlan.length}`,
        },
        {
          id: "performance-profiler" as OpsToolId,
          title: localizeOpsToolText(locale, "performance-profiler", "title", "Performance Profiler"),
          description: localizeOpsToolText(locale, "performance-profiler", "description", "Generate a timing wrapper for script execution analysis."),
          icon: Gauge,
          badge: localizeOpsToolText(locale, "performance-profiler", "badge", "Time"),
        },
        {
          id: "script-certification" as OpsToolId,
          title: localizeOpsToolText(locale, "script-certification", "title", "Script Certification"),
          description: localizeOpsToolText(locale, "script-certification", "description", "Create approval manifests with hashes, owners, and expiration."),
          icon: FileCheck,
          badge: certificationHash ? "Signed" : localizeOpsToolText(locale, "script-certification", "badge", "Hash"),
        },
      ],
    },
  ];
  const selectedOpsTool = opsToolGroups.flatMap((group) => group.tools).find((tool) => tool.id === selectedOpsToolId) || opsToolGroups[0].tools[0];
  const SelectedOpsIcon = selectedOpsTool.icon;

  const filteredRunHistory = useMemo(() => {
    const query = runHistoryFilter.trim().toLowerCase();
    if (!query) {
      return runHistory;
    }

    return runHistory.filter((run) =>
      [
        run.fileName,
        run.stdout,
        run.stderr,
        run.transcriptContent,
        run.runDirectory,
        JSON.stringify(run.parameters),
        run.runMode,
        run.environmentProfileName,
        run.beforeNotes,
        run.afterNotes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [runHistory, runHistoryFilter]);

  const saveRunbook = () => {
    const name = runbookName.trim();
    if (!name) {
      toast({
        title: "Name this runbook first",
        description: "Give the runbook a short name so you can reuse this execution sequence later.",
        variant: "destructive",
      });
      return;
    }

    const runbook: SavedRunbook = {
      id: `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      fileName: currentFileName,
      summary: analysis.explanation.summary,
      runMode,
      runAsAdmin,
      environmentProfileName: activeEnvironmentProfileName,
      beforeRunNotes,
      parameterValues: { ...parameterValues },
      placeholderValues: { ...placeholderValues },
      checklistState: { ...checklistState },
    };

    setRunbookLibrary((current) => {
      const existing = (current[workspaceProfileKey] || []).filter((entry) => entry.name.toLowerCase() !== name.toLowerCase());
      return {
        ...current,
        [workspaceProfileKey]: [runbook, ...existing].slice(0, 12),
      };
    });
    setRunbookName("");
    toast({
      title: "Runbook saved",
      description: `${name} now captures the current checklist, placeholders, parameters, and run mode for this workflow.`,
    });
  };

  const applyRunbook = (runbook: SavedRunbook) => {
    setParameterValues((current) => ({ ...current, ...runbook.parameterValues }));
    setPlaceholderValues((current) => ({ ...current, ...runbook.placeholderValues }));
    setChecklistState((current) => ({ ...current, ...runbook.checklistState }));
    setRunMode(runbook.runMode);
    setRunAsAdmin(runbook.runAsAdmin);
    setBeforeRunNotes(runbook.beforeRunNotes);
    setActiveEnvironmentProfileName(runbook.environmentProfileName);
    toast({
      title: "Runbook applied",
      description: `${runbook.name} restored the saved execution sequence for this script.`,
    });
  };

  const deleteRunbook = (runbookId: string) => {
    setRunbookLibrary((current) => ({
      ...current,
      [workspaceProfileKey]: (current[workspaceProfileKey] || []).filter((entry) => entry.id !== runbookId),
    }));
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {displayMode === "editor" ? (
        <div className="border-b px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm text-muted-foreground">
              <span className="line-clamp-1">Build, review, and run scripts from one focused workspace.</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={() => setRunDialogOpen(true)} data-testid="button-run-script">
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCommandLibraryVisible((current) => !current)}
                data-testid="button-toggle-command-library"
              >
                {isCommandLibraryVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
                <span className="hidden sm:inline">{isCommandLibraryVisible ? "Hide Library" : "Library"}</span>
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={toolsMenuOpen}
                  onClick={() => setToolsMenuOpen((current) => !current)}
                >
                  Tools
                  <ChevronDown className={`ml-2 h-4 w-4 transition ${toolsMenuOpen ? "rotate-180" : ""}`} />
                </Button>
                {toolsMenuOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1.5 text-sm font-semibold">Script Tools</div>
                    {[
                      { label: "Header", icon: ScrollText, action: () => setHeaderDialogOpen(true) },
                      { label: "Explain", icon: Sparkles, action: () => setExplainDialogOpen(true) },
                      { label: "AI Review", icon: Bot, action: handleRunAiReview, testId: "button-ai-review" },
                      { label: "Placeholders", icon: Replace, action: () => setPlaceholderDialogOpen(true), disabled: analysis.placeholders.length === 0 },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          data-testid={item.testId}
                          disabled={item.disabled}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => {
                            setToolsMenuOpen(false);
                            item.action();
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </button>
                      );
                    })}
                    <div className="-mx-1 my-1 h-px bg-muted" />
                    <button
                      type="button"
                      disabled={exportingBundle}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        void handleExportBundle();
                      }}
                    >
                      <FileArchive className="h-4 w-4 shrink-0" />
                      {exportingBundle ? "Exporting..." : "Export Bundle"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        ) : null}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {displayMode === "editor" && isCommandLibraryVisible && (
            <div className="hidden min-h-0 lg:block">
              <CommandSidebar
                onAddCommand={handleAddCommand}
                favoriteCommandIds={favoriteCommandIds}
                onToggleFavorite={toggleFavoriteCommand}
              />
            </div>
          )}

          <div
            className="grid min-w-0 flex-1 min-h-0 overflow-hidden"
            style={{ gridTemplateRows: displayMode === "ops" ? "minmax(0, 1fr)" : isEditorDetailsVisible ? "minmax(0, 1fr) clamp(220px, 30vh, 380px)" : "minmax(0, 1fr) 42px" }}
          >
            {displayMode === "editor" ? (
            <div className="min-h-0 overflow-hidden border-b">
              <ScriptEditor
                script={script}
                onScriptChange={setScript}
                onCursorPositionChange={setCursorPosition}
                onSelectionChange={setSelectedText}
              />
            </div>
            ) : null}

            <div className="min-h-0 overflow-hidden">
              <Tabs value={displayMode === "ops" ? "ops-suite" : detailsTab} onValueChange={showEditorDetailsTab} className="flex h-full min-h-0 flex-col overflow-hidden">
                {displayMode === "editor" ? (
                <div className="flex h-[42px] shrink-0 items-center justify-between gap-3 border-b px-3 py-1.5">
                  <TabsList className="flex w-auto shrink-0 overflow-hidden">
                    <TabsTrigger value="preview" className="flex h-8 w-8 items-center justify-center gap-1 px-0 sm:w-auto sm:px-3">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </TabsTrigger>
                    <TabsTrigger value="basic" className="flex h-8 w-8 items-center justify-center gap-1 px-0 sm:w-auto sm:px-3">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">Basic</span>
                    </TabsTrigger>
                    <TabsTrigger value="comprehensive" className="flex h-8 w-8 items-center justify-center gap-1 px-0 sm:w-auto sm:px-3">
                      <FileCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Full</span>
                    </TabsTrigger>
                    <TabsTrigger value="workbench" className="flex h-8 w-8 items-center justify-center gap-1 px-0 sm:w-auto sm:px-3">
                      <ClipboardList className="h-4 w-4" />
                      <span className="hidden sm:inline">Workbench</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai-review" className="flex h-8 w-8 items-center justify-center gap-1 px-0 sm:w-auto sm:px-3">
                      <Bot className="h-4 w-4" />
                      <span className="hidden sm:inline">AI</span>
                    </TabsTrigger>
                    <TabsTrigger value="runs" className="flex h-8 w-8 items-center justify-center gap-1 px-0 sm:w-auto sm:px-3">
                      <Play className="h-4 w-4" />
                      <span className="hidden sm:inline">Runs</span>
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={preflightSummary.critical > 0 ? "destructive" : "secondary"} className="hidden sm:inline-flex">
                      {preflightSummary.critical} critical
                    </Badge>
                    <Badge variant="secondary" className="hidden sm:inline-flex">{preflightSummary.warning} warnings</Badge>
                    <Button size="sm" className="hidden md:inline-flex" onClick={runComprehensiveValidation} disabled={!script.trim() || comprehensiveValidationMutation.isPending}>
                      {comprehensiveValidationMutation.isPending ? "Analyzing..." : "Run Pre-flight"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditorDetailsVisible((current) => !current)}>
                      <span className="hidden sm:inline">{isEditorDetailsVisible ? "Hide" : "Show"}</span>
                      <ChevronDown className={`h-4 w-4 transition ${isEditorDetailsVisible ? "" : "rotate-180"}`} />
                    </Button>
                  </div>
                </div>
                ) : null}

                {(displayMode === "ops" || isEditorDetailsVisible) && (
                  <>
                <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <CodePreview code={script} validationErrors={validationResult.errors || []} />
                </TabsContent>

                <TabsContent value="basic" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  <ValidationPanel errors={validationResult.errors || []} isValidating={validationMutation.isPending} />
                </TabsContent>

                <TabsContent value="comprehensive" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  {comprehensiveValidation ? (
                    <ComprehensiveValidationPanel result={comprehensiveValidation} />
                  ) : (
                    <div className="rounded-md border py-8 text-center text-muted-foreground">
                      <FileCheck className="mx-auto mb-3 h-12 w-12 opacity-50" />
                      <p className="mb-1 font-medium">Comprehensive validation</p>
                      <p className="text-sm">Run the deeper pre-flight analysis for dependencies, best practices, impact review, and compliance hints.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="workbench" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5" />
                          Pre-flight validation
                        </CardTitle>
                        <CardDescription>Flag likely missing values, risky commands, and quick cleanup tasks before you save or run.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.issues.length === 0 ? (
                          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
                            No quick-analysis issues were detected. You can still run the comprehensive panel for deeper review.
                          </div>
                        ) : (
                          analysis.issues.map((issue) => (
                            <div key={issue.id} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex items-center gap-2">
                                {issue.severity === "critical" ? (
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                ) : issue.severity === "warning" ? (
                                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-sky-400" />
                                )}
                                <div className="font-medium">{issue.title}</div>
                                <Badge variant={issue.severity === "critical" ? "destructive" : "secondary"}>{issue.severity}</Badge>
                                <Badge variant="outline">{issue.category}</Badge>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">{issue.description}</div>
                              {issue.recommendation ? <div className="mt-2 text-xs text-primary">{issue.recommendation}</div> : null}
                              <div className="mt-3">
                                <Button size="sm" variant="outline" onClick={() => handleRecommendedRemediation(issue.id)}>
                                  {issue.id === "placeholders"
                                    ? "Replace placeholders"
                                    : issue.id === "required-parameters"
                                      ? "Open Run setup"
                                      : issue.id === "no-param-block"
                                        ? "Add script header"
                                        : hasAIAccess
                                          ? "Open AI review"
                                          : "Unlock AI remediation"}
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ClipboardList className="h-5 w-5" />
                          Execution checklist
                        </CardTitle>
                        <CardDescription>Use this lightweight operational checklist before you push scripts into production.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {checklistItems.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border bg-background/60 px-3 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{item.label}</div>
                                {item.suggested ? <Badge variant="secondary">Suggested</Badge> : null}
                              </div>
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            </div>
                            <Switch checked={item.checked} onCheckedChange={(checked) => setChecklistState((current) => ({ ...current, [item.id]: checked }))} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wand2 className="h-5 w-5" />
                          Environment profiles
                        </CardTitle>
                        <CardDescription>Save Dev, Pilot, Production, or customer-specific run setups so parameters, placeholders, and run mode come back together.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={environmentProfileName}
                            onChange={(event) => setEnvironmentProfileName(event.target.value)}
                            placeholder="Profile name"
                            className="max-w-xs"
                          />
                          <Button size="sm" variant="outline" onClick={saveEnvironmentProfile}>
                            Save environment profile
                          </Button>
                          {activeEnvironmentProfileName ? <Badge variant="secondary">Active: {activeEnvironmentProfileName}</Badge> : null}
                        </div>
                        {environmentProfiles.length === 0 ? (
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                            No environment profiles are saved for this script shape yet.
                          </div>
                        ) : (
                          environmentProfiles.map((profile) => (
                            <div key={profile.id} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 font-medium">
                                    <span>{profile.name}</span>
                                    <Badge variant="outline">{profile.runMode}</Badge>
                                    {profile.runAsAdmin ? <Badge variant="outline">Admin</Badge> : null}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Updated {new Date(profile.updatedAt).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => applyEnvironmentProfile(profile)}>
                                    Apply
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => deleteEnvironmentProfile(profile.id)}>
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wand2 className="h-5 w-5" />
                          Module-aware suggestions
                        </CardTitle>
                        <CardDescription>PSForge spotted module hints based on your current script and surfaced quick install/import steps.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.moduleSuggestions.length === 0 ? (
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                            No common enterprise modules were detected from the current script contents.
                          </div>
                        ) : (
                          analysis.moduleSuggestions.map((module) => (
                            <div key={module.moduleName} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium">{module.moduleName}</div>
                                  <div className="text-sm text-muted-foreground">{module.reason}</div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleCopyText(module.installCommand, `${module.moduleName} install command copied.`)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy install
                                </Button>
                              </div>
                              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                                <div><span className="font-medium text-foreground">Install:</span> {module.installCommand}</div>
                                <div><span className="font-medium text-foreground">Import:</span> {module.importCommand}</div>
                                <div><span className="font-medium text-foreground">Common commands:</span> {module.commonCommands.join(", ")}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Replace className="h-5 w-5" />
                          Placeholder review
                        </CardTitle>
                        <CardDescription>Turn template values into guided replacements instead of editing risky text by hand.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.placeholders.length === 0 ? (
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                            No common placeholders were detected in this script right now.
                          </div>
                        ) : (
                          <>
                            {analysis.placeholders.map((placeholder) => (
                              <div key={placeholder.token} className="rounded-md border bg-background/60 px-3 py-3 text-sm">
                                <div className="font-mono text-primary">{placeholder.token}</div>
                                <div className="mt-1 text-muted-foreground">{placeholder.example}</div>
                              </div>
                            ))}
                            <Button onClick={() => setPlaceholderDialogOpen(true)}>
                              <Replace className="mr-2 h-4 w-4" />
                              Replace placeholders
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Reusable runbooks
                        </CardTitle>
                        <CardDescription>Save an execution sequence with notes, placeholders, checklist items, and run mode so the same workflow is easier to repeat.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={runbookName}
                            onChange={(event) => setRunbookName(event.target.value)}
                            placeholder="Runbook name"
                            className="max-w-xs"
                          />
                          <Button size="sm" variant="outline" onClick={saveRunbook}>
                            Save runbook
                          </Button>
                        </div>
                        {runbooks.length === 0 ? (
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                            No reusable runbooks are saved for this script shape yet.
                          </div>
                        ) : (
                          runbooks.map((runbook) => (
                            <div key={runbook.id} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 font-medium">
                                    <span>{runbook.name}</span>
                                    <Badge variant="outline">{runbook.runMode}</Badge>
                                    {runbook.runAsAdmin ? <Badge variant="outline">Admin</Badge> : null}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{runbook.summary}</div>
                                  <div className="text-xs text-muted-foreground">Saved {new Date(runbook.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => applyRunbook(runbook)}>
                                    Apply
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => deleteRunbook(runbook.id)}>
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Rocket className="h-5 w-5" />
                          Deployment-ready package
                        </CardTitle>
                        <CardDescription>Export a handoff bundle with the script, README, parameter samples, a runbook, and deployment readiness notes in one click.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                          The deployment bundle now includes <span className="font-medium text-foreground">runbook.md</span> and <span className="font-medium text-foreground">deployment-readiness.md</span> alongside the script, notes, README, parameter JSON, and sample CSV.
                        </div>
                        <Button onClick={handleExportBundle} disabled={exportingBundle}>
                          <FileArchive className="mr-2 h-4 w-4" />
                          {exportingBundle ? "Exporting deployment bundle..." : "Export deployment bundle"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="ops-suite" className="mt-0 h-full min-h-0 flex-1 overflow-hidden p-4">
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <Card className="shrink-0">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Rocket className="h-5 w-5" />
                              {t("opsSuite")}
                            </CardTitle>
                            <CardDescription>
                              {t("opsSuiteDescription")}
                            </CardDescription>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={operationsSuitePlan.readinessScore >= 80 ? "default" : operationsSuitePlan.readinessScore >= 60 ? "secondary" : "destructive"}>
                              {t("readiness", { score: operationsSuitePlan.readinessScore })}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={handleExportOpsSuiteBundle} disabled={opsExporting || !script.trim()}>
                              <FileArchive className="mr-2 h-4 w-4" />
                              {opsExporting ? t("exporting") : t("exportOpsBundle")}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3 lg:grid-cols-4">
                        {[
                          { label: "Environment checks", value: operationsSuitePlan.environmentChecks.length, detail: t("machineReadinessSignals") },
                          { label: "Dependencies", value: analysis.moduleSuggestions.length, detail: t("moduleHintsFound") },
                          { label: "Impact items", value: operationsSuitePlan.impactPreview.length, detail: t("predictedEffects") },
                          { label: t("safetyNotes"), value: analysis.issues.length, detail: t("reviewItems") },
                        ].map((metric) => (
                          <div key={metric.label} className="rounded-md border bg-background/60 px-3 py-3">
                            <div className="text-xs text-muted-foreground">{metric.label}</div>
                            <div className="mt-1 text-2xl font-semibold">{metric.value}</div>
                            <div className="text-xs text-muted-foreground">{metric.detail}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[18rem_minmax(0,1fr)]">
                      <Card className="flex min-h-0 flex-col xl:sticky xl:top-0 xl:h-[calc(100vh-18rem)] xl:max-h-[calc(100vh-18rem)]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{t("opsTools")}</CardTitle>
                          <CardDescription>{t("opsToolsDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
                          <div className="h-full space-y-4 overflow-y-auto px-6 pb-6 pr-4">
                            {opsToolGroups.map((group) => (
                              <div key={group.label} className="space-y-2">
                                <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</div>
                                <div className="space-y-1">
                                  {group.tools.map((tool) => {
                                    const Icon = tool.icon;
                                    const selected = selectedOpsToolId === tool.id;
                                    return (
                                      <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => setSelectedOpsToolId(tool.id)}
                                        className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition ${
                                          selected ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-background/40 text-muted-foreground hover:border-border hover:bg-background/70 hover:text-foreground"
                                        }`}
                                      >
                                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-primary" : ""}`} />
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-sm font-medium">{tool.title}</span>
                                          <span className="mt-0.5 line-clamp-2 block text-xs">{tool.description}</span>
                                        </span>
                                        <Badge variant={selected ? "default" : "outline"} className="shrink-0 text-[10px]">{tool.badge}</Badge>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="min-h-0 min-w-0 space-y-4 overflow-hidden">
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <SelectedOpsIcon className="h-5 w-5" />
                                  {selectedOpsTool.title}
                                </CardTitle>
                                <CardDescription>{selectedOpsTool.description}</CardDescription>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{selectedOpsTool.badge}</Badge>
                                <Button size="sm" variant="outline" onClick={handleExportOpsSuiteBundle} disabled={opsExporting || !script.trim()}>
                                  <FileArchive className="mr-2 h-4 w-4" />
                                  {opsExporting ? t("exporting") : t("exportOpsBundle")}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>

                        <div className="grid gap-4">
                      <Card className={selectedOpsToolId === "environment-doctor" ? "" : "hidden"}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                Environment Doctor
                              </CardTitle>
                              <CardDescription>Run a local diagnostic and review prerequisites before the script is run.</CardDescription>
                            </div>
                            <Button size="sm" onClick={handleRunEnvironmentDoctor} disabled={environmentDoctorRunning}>
                              <Play className="mr-2 h-4 w-4" />
                              {environmentDoctorRunning ? "Running..." : "Run Doctor"}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {operationsSuitePlan.environmentChecks.map((check) => (
                            <div key={check.id} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={check.status === "action" ? "destructive" : check.status === "warning" ? "secondary" : "outline"}>
                                  {check.status}
                                </Badge>
                                <div className="font-medium">{check.label}</div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">{check.detail}</div>
                              {check.remediation ? (
                                <Button size="sm" variant="ghost" className="mt-2 px-0" onClick={() => handleCopyText(check.remediation || "", `${check.label} command copied.`)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy check
                                </Button>
                              ) : null}
                            </div>
                          ))}
                          {environmentDoctorResult ? (
                            <pre className="max-h-48 overflow-auto rounded-md border bg-background px-3 py-3 text-xs text-muted-foreground">
                              <code>{environmentDoctorResult.stdout || environmentDoctorResult.stderr || "Environment Doctor produced no console output."}</code>
                            </pre>
                          ) : null}
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "impact-preview" ? "" : "hidden"}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Change Impact Preview
                          </CardTitle>
                          <CardDescription>Static prediction of what the script is likely to touch.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {operationsSuitePlan.impactPreview.map((impact) => (
                            <div key={impact} className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                              {impact}
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {[
                        {
                          id: "pester-generator" as OpsToolId,
                          title: "Pester Test Generator",
                          description: "Companion .Tests.ps1 starter for syntax, parameter, and safety discovery tests.",
                          icon: FlaskConical,
                          content: operationsSuitePlan.pesterTestDraft,
                          copy: "Pester test draft copied.",
                          action: handleRunGeneratedPesterTests,
                          actionLabel: "Run Tests",
                        },
                        {
                          id: "script-packager" as OpsToolId,
                          title: "PowerShell Script Packager",
                          description: "Deployment packaging plan for ZIP, Intune, scheduled task, and install/uninstall outputs.",
                          icon: FileArchive,
                          content: operationsSuitePlan.packagePlan,
                          copy: "Package plan copied.",
                        },
                        {
                          id: "runbook-generator" as OpsToolId,
                          title: "Runbook Generator",
                          description: "Operational documentation with prerequisites, validation, and rollback sections.",
                          icon: BookOpen,
                          content: operationsSuitePlan.runbookDraft,
                          copy: "Runbook draft copied.",
                        },
                        {
                          id: "dependency-manager" as OpsToolId,
                          title: "Dependency and Module Manager",
                          description: "Module, cmdlet, and #Requires manifest based on the current script.",
                          icon: ClipboardList,
                          content: operationsSuitePlan.dependencyManifest,
                          copy: "Dependency manifest copied.",
                        },
                        {
                          id: "rollback-builder" as OpsToolId,
                          title: "Rollback Builder",
                          description: "Honest rollback guidance with non-reversible operations called out for review.",
                          icon: ShieldAlert,
                          content: operationsSuitePlan.rollbackPlan.map((item) => `- ${item}`).join("\n"),
                          copy: "Rollback plan copied.",
                        },
                        {
                          id: "script-modernizer" as OpsToolId,
                          title: "Script Modernizer",
                          description: "Modernization guidance for deprecated modules, secrets, output style, and strict mode.",
                          icon: WandSparkles,
                          content: operationsSuitePlan.modernizationPlan.map((item) => `- ${item}`).join("\n"),
                          copy: "Modernization plan copied.",
                        },
                      ].filter((item) => item.id === selectedOpsToolId).map((item) => {
                        const Icon = item.icon;
                        return (
                          <Card key={item.title}>
                            <CardHeader>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    <Icon className="h-5 w-5" />
                                    {item.title}
                                  </CardTitle>
                                  <CardDescription>{item.description}</CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {"action" in item && item.action ? (
                                    <Button size="sm" onClick={item.action}>
                                      <Play className="mr-2 h-4 w-4" />
                                      {item.actionLabel}
                                    </Button>
                                  ) : null}
                                  <Button size="sm" variant="outline" onClick={() => handleCopyText(item.content, item.copy)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <pre className="max-h-56 overflow-auto rounded-md border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                                <code>{item.content}</code>
                              </pre>
                            </CardContent>
                          </Card>
                        );
                      })}

                      <Card className={selectedOpsToolId === "regex-lab" ? "" : "hidden"}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Regex Lab
                          </CardTitle>
                          <CardDescription>Build, explain, test, and preview PowerShell regex matches against sample text.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Input value={regexPattern} onChange={(event) => setRegexPattern(event.target.value)} placeholder="Regex pattern" />
                          <Textarea value={regexSample} onChange={(event) => setRegexSample(event.target.value)} className="min-h-28 font-mono text-xs" placeholder="Sample text" />
                          {regexLabResult.ok ? (
                            <div className="grid gap-2">
                              {regexLabResult.explanation.map((line) => (
                                <div key={line} className="rounded-md border bg-background/60 px-3 py-2 text-sm text-muted-foreground">{line}</div>
                              ))}
                              <pre className="max-h-40 overflow-auto rounded-md border bg-background px-3 py-3 text-xs text-muted-foreground">
                                <code>{regexLabResult.matches.map((match) => `${match.index}: ${match.value}${match.groups.length ? ` groups=${JSON.stringify(match.groups)}` : ""}`).join("\n") || "No matches."}</code>
                              </pre>
                            </div>
                          ) : (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">{regexLabResult.error}</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "pipeline-explorer" ? "" : "hidden"}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Object/Pipeline Explorer
                          </CardTitle>
                          <CardDescription>Inspect the likely object flow through each pipeline stage.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {pipelineStages.length > 0 ? pipelineStages.map((stage) => (
                            <div key={`${stage.index}-${stage.command}`} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="font-mono text-sm text-primary">{stage.index}. {stage.command}</div>
                              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                                <div>Input: {stage.likelyInput}</div>
                                <div>Output: {stage.likelyOutput}</div>
                                {stage.notes.map((note) => <div key={note}>Note: {note}</div>)}
                              </div>
                            </div>
                          )) : (
                            <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">No pipeline stages were detected.</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "parameter-set-designer" ? "" : "hidden"}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <List className="h-5 w-5" />
                                Parameter Set Designer
                              </CardTitle>
                              <CardDescription>Create an advanced-function parameter block from detected parameters.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleCopyText(parameterSetDraft, "Parameter set draft copied.")}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="max-h-56 overflow-auto rounded-md border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground"><code>{parameterSetDraft}</code></pre>
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "credential-leak-detector" ? "" : "hidden"}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5" />
                            Credential Leak Detector
                          </CardTitle>
                          <CardDescription>Detect hard-coded passwords, tokens, tenant values, and unsafe secret handling.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {credentialFindings.length > 0 ? credentialFindings.map((finding) => (
                            <div key={finding.id} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={finding.severity === "critical" ? "destructive" : "secondary"}>{finding.severity}</Badge>
                                <div className="font-medium">{finding.title}</div>
                                <Badge variant="outline">Line {finding.line}</Badge>
                              </div>
                              <div className="mt-2 font-mono text-xs text-muted-foreground">{finding.evidence}</div>
                              <div className="mt-2 text-sm text-primary">{finding.recommendation}</div>
                            </div>
                          )) : (
                            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">No credential leak patterns detected.</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "performance-profiler" ? "" : "hidden"}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Gauge className="h-5 w-5" />
                                Performance Profiler
                              </CardTitle>
                              <CardDescription>Generate a wrapper that measures elapsed time, errors, and process memory.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleCopyText(profilerScript, "Performance profiler copied.")}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="max-h-56 overflow-auto rounded-md border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground"><code>{profilerScript}</code></pre>
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "compatibility-matrix" ? "" : "hidden"}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5" />
                            Compatibility Matrix
                          </CardTitle>
                          <CardDescription>Review suitability for PowerShell 5.1, 7.x, Windows Server, Azure Automation, and constrained endpoints.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {compatibilityMatrix.map((finding) => (
                            <div key={finding.target} className="rounded-md border bg-background/60 px-3 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={finding.status === "unsupported" ? "destructive" : finding.status === "review" ? "secondary" : "outline"}>{finding.status}</Badge>
                                <div className="font-medium">{finding.target}</div>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                {finding.notes.map((note) => <div key={note}>{note}</div>)}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "csv-data-mapper" ? "" : "hidden"}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Table2 className="h-5 w-5" />
                            CSV Data Mapper
                          </CardTitle>
                          <CardDescription>Map CSV columns into script parameters and preview bulk input objects.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Textarea value={csvSample} onChange={(event) => setCsvSample(event.target.value)} className="min-h-28 font-mono text-xs" placeholder="Paste CSV sample" />
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm">
                            <div className="font-medium">Detected headers</div>
                            <div className="mt-1 text-muted-foreground">{csvMapping.headers.join(", ") || "No headers detected."}</div>
                          </div>
                          <pre className="max-h-40 overflow-auto rounded-md border bg-background px-3 py-3 text-xs text-muted-foreground">
                            <code>{JSON.stringify({ suggestedParameterMap: csvMapping.suggestedParameterMap, previewObjects: csvMapping.previewObjects }, null, 2)}</code>
                          </pre>
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "error-reproduction-builder" ? "" : "hidden"}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <FileJson className="h-5 w-5" />
                                Error Reproduction Builder
                              </CardTitle>
                              <CardDescription>Create a sanitized support bundle from an error, notes, and the relevant script.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleCopyText(supportBundle, "Sanitized support bundle copied.")}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Textarea value={supportContext} onChange={(event) => setSupportContext(event.target.value)} className="min-h-28" placeholder="Paste the error message and environment context. PSForge will redact common sensitive values." />
                          <pre className="max-h-52 overflow-auto rounded-md border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground"><code>{supportBundle}</code></pre>
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "scheduled-task-builder" ? "" : "hidden"}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5" />
                                Scheduled Task Builder
                              </CardTitle>
                              <CardDescription>Configure triggers, run level, and deployment script for Task Scheduler.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleCopyText(scheduledTaskInstaller, "Scheduled task installer copied.")}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>Task name</Label>
                              <Input value={scheduledTaskName} onChange={(event) => setScheduledTaskName(event.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Script path</Label>
                              <Input value={scheduledTaskPath} onChange={(event) => setScheduledTaskPath(event.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Schedule</Label>
                              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={scheduledTaskSchedule} onChange={(event) => setScheduledTaskSchedule(event.target.value as "Daily" | "Weekly" | "AtLogon")}>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="AtLogon">At logon</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Time</Label>
                              <Input value={scheduledTaskTime} onChange={(event) => setScheduledTaskTime(event.target.value)} disabled={scheduledTaskSchedule === "AtLogon"} />
                            </div>
                          </div>
                          <label className="flex items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-3 text-sm">
                            <span>Run with highest privileges</span>
                            <Switch checked={scheduledTaskRunHighest} onCheckedChange={setScheduledTaskRunHighest} />
                          </label>
                          <pre className="max-h-52 overflow-auto rounded-md border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground"><code>{scheduledTaskInstaller}</code></pre>
                        </CardContent>
                      </Card>

                      <Card className={selectedOpsToolId === "script-certification" ? "" : "hidden"}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                Script Certification
                              </CardTitle>
                              <CardDescription>Create an approval manifest with hash, owner, issue counts, and expiration.</CardDescription>
                            </div>
                            <Button size="sm" onClick={handleCalculateCertification} disabled={!script.trim()}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Certify
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Textarea value={certificationNotes} onChange={(event) => setCertificationNotes(event.target.value)} className="min-h-20" placeholder="Approval notes" />
                          <pre className="max-h-52 overflow-auto rounded-md border bg-background px-3 py-3 text-xs leading-relaxed text-muted-foreground"><code>{certificationManifest}</code></pre>
                        </CardContent>
                      </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai-review" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Bot className="h-5 w-5" />
                              AI review and remediation
                            </CardTitle>
                            <CardDescription>Use Pro to explain scripts in plain English, review them for performance/security issues, and apply selected fixes with guidance.</CardDescription>
                          </div>
                          {hasAIAccess ? <Badge variant="default">Pro active</Badge> : <Badge variant="secondary">Pro required</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={handleRunAiReview} disabled={optimizeMutation.isPending || !script.trim()}>
                            <WandSparkles className="mr-2 h-4 w-4" />
                            {optimizeMutation.isPending ? "Reviewing..." : "Run AI review"}
                          </Button>
                          <Button variant="outline" onClick={handleRequestAiExplanation} disabled={explainMutation.isPending || !selectedScriptScope.trim()}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            {explainMutation.isPending ? "Explaining..." : selectedText.trim() ? "Explain selection" : "Explain script"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleApplySelectedAiFixes}
                            disabled={!hasAIAccess || applyOptimizationsMutation.isPending || selectedRecommendations.length === 0}
                          >
                            <FlaskConical className="mr-2 h-4 w-4" />
                            {applyOptimizationsMutation.isPending ? "Applying..." : `Apply selected fixes (${selectedRecommendations.length})`}
                          </Button>
                        </div>
                        {!hasAIAccess ? (
                          <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-4 text-sm">
                            <div className="font-medium">PSForge Pro makes review actionable</div>
                            <div className="mt-1 text-muted-foreground">
                              Run deeper AI review, explain selected code in plain English, and apply guided fixes without leaving the desktop workflow.
                            </div>
                            <Button
                              className="mt-3"
                              onClick={() =>
                                openUpgradeDialog({
                                  feature: "AI review and remediation",
                                  title: "Unlock AI review with PSForge Pro",
                                  description: "Use PSForge Pro to explain scripts clearly, review them for risk and performance, and apply guided fixes before you run them.",
                                  previewTitle: "What Pro adds to this workbench",
                                  previewItems: [
                                    "Plain-English explanations for scripts and selected sections.",
                                    "Performance, security, and best-practice review tailored to PowerShell.",
                                    "One-click apply for the fixes you want to keep.",
                                  ],
                                  contextLabel: "AI review",
                                })
                              }
                            >
                              Try Pro free for 30 days
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    {aiExplanation ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            AI explanation
                          </CardTitle>
                          <CardDescription>{selectedText.trim() ? "Based on the selected script block." : "Based on the current script contents."}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <div className="font-medium">Summary</div>
                            <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">{aiExplanation.explanation}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="font-medium">Key points</div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {aiExplanation.keyPoints.map((point) => (
                                <li key={point}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <div className="font-medium">Suggested next steps</div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {aiExplanation.suggestedNextSteps.map((step) => (
                                <li key={step}>• {step}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <div className="font-medium">Potential risks</div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {(aiExplanation.potentialRisks.length > 0 ? aiExplanation.potentialRisks : ["No major risks were highlighted in this explanation."]).map((risk) => (
                                <li key={risk}>• {risk}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}

                    {aiOptimization ? (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle>AI review summary</CardTitle>
                            <CardDescription>{aiOptimization.summary}</CardDescription>
                          </CardHeader>
                        </Card>

                        {[
                          { title: "Security", recommendations: aiOptimization.security },
                          { title: "Performance", recommendations: aiOptimization.performance },
                          { title: "Best practices", recommendations: aiOptimization.bestPractices },
                        ].map((section) => (
                          <Card key={section.title}>
                            <CardHeader>
                              <CardTitle>{section.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {section.recommendations.length === 0 ? (
                                <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                                  No {section.title.toLowerCase()} recommendations were returned in this pass.
                                </div>
                              ) : (
                                section.recommendations.map((recommendation) => {
                                  const selected = selectedRecommendationKeys.includes(buildRecommendationKey(recommendation));
                                  return (
                                    <div key={buildRecommendationKey(recommendation)} className="rounded-md border bg-background/60 px-3 py-3">
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-medium">{recommendation.title}</div>
                                            <Badge variant={recommendation.priority === "critical" ? "destructive" : "secondary"}>{recommendation.priority}</Badge>
                                            {recommendation.line ? <Badge variant="outline">Line {recommendation.line}</Badge> : null}
                                          </div>
                                          <div className="mt-2 text-sm text-muted-foreground">{recommendation.description}</div>
                                        </div>
                                        <Button variant={selected ? "default" : "outline"} size="sm" onClick={() => handleToggleRecommendation(recommendation)}>
                                          {selected ? "Selected" : "Select"}
                                        </Button>
                                      </div>
                                      {recommendation.code ? (
                                        <pre className="mt-3 overflow-auto rounded-md border bg-background px-3 py-3 text-xs text-muted-foreground">
                                          <code>{recommendation.code}</code>
                                        </pre>
                                      ) : null}
                                    </div>
                                  );
                                })
                              )}
                            </CardContent>
                          </Card>
                        ))}

                        <Card>
                          <CardHeader>
                            <CardTitle>Alternative approaches</CardTitle>
                            <CardDescription>Use these to compare implementation style before you settle on the final script.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {aiOptimization.alternatives.length === 0 ? (
                              <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                                No alternative approaches were returned in this pass.
                              </div>
                            ) : (
                              aiOptimization.alternatives.map((alternative) => (
                                <div key={`${alternative.approach}-${alternative.title}`} className="rounded-md border bg-background/60 px-3 py-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-medium">{alternative.title}</div>
                                    <Badge variant="outline">{alternative.approach}</Badge>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">{alternative.description}</div>
                                  <pre className="mt-3 overflow-auto rounded-md border bg-background px-3 py-3 text-xs text-muted-foreground">
                                    <code>{alternative.code}</code>
                                  </pre>
                                </div>
                              ))
                            )}
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>AI review is ready when you are</CardTitle>
                          <CardDescription>Use it after the quick pre-flight pass when you want deeper reasoning about security, performance, and safer implementation choices.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                          <div className="rounded-md border bg-background/60 px-3 py-3">
                            Start with the regular validation and checklist, then run AI review once you want deeper remediation guidance or a second set of eyes on production-facing changes.
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="runs" className="mt-0 min-h-0 flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="relative w-full max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={runHistoryFilter}
                          onChange={(event) => setRunHistoryFilter(event.target.value)}
                          className="pl-9"
                          placeholder="Search runs, transcripts, errors, or parameter values"
                        />
                      </div>
                      {runHistoryFilter ? (
                        <Button variant="ghost" size="sm" onClick={() => setRunHistoryFilter("")}>
                          <X className="mr-2 h-4 w-4" />
                          Clear filter
                        </Button>
                      ) : null}
                    </div>
                    {runHistory.length === 0 ? (
                      <div className="rounded-md border py-8 text-center text-muted-foreground">
                        <Play className="mx-auto mb-3 h-12 w-12 opacity-50" />
                        <p className="mb-1 font-medium">No desktop runs yet</p>
                        <p className="text-sm">Use Run setup to execute the script and capture transcript output here.</p>
                      </div>
                    ) : filteredRunHistory.length === 0 ? (
                      <div className="rounded-md border py-8 text-center text-muted-foreground">
                        <Search className="mx-auto mb-3 h-12 w-12 opacity-50" />
                        <p className="mb-1 font-medium">No runs matched that filter</p>
                        <p className="text-sm">Try a broader search term or clear the filter to see all run history.</p>
                      </div>
                    ) : (
                      filteredRunHistory.map((run) => (
                        <Card key={run.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <CardTitle className="text-base">{run.fileName}</CardTitle>
                                <CardDescription>{new Date(run.finishedAt).toLocaleString()} • {run.shell}</CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={run.exitCode === 0 ? "secondary" : "destructive"}>Exit {run.exitCode}</Badge>
                                {run.elevated ? <Badge variant="outline">Admin</Badge> : null}
                                <Badge variant="outline">{run.runMode}</Badge>
                                {run.environmentProfileName ? <Badge variant="outline">{run.environmentProfileName}</Badge> : null}
                                {run.transcriptPath ? (
                                  <Button size="sm" variant="outline" onClick={() => openDesktopPath(run.transcriptPath!)}>
                                    Open transcript
                                  </Button>
                                ) : null}
                                <Button size="sm" variant="outline" onClick={() => openDesktopPath(run.runDirectory)}>
                                  Open run folder
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid gap-3 xl:grid-cols-2">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">Before-run notes</div>
                                <div className="min-h-24 rounded-md border bg-background/70 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                                  {run.beforeNotes || "No before-run notes were captured for this run."}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">After-run notes</div>
                                <Textarea
                                  rows={4}
                                  value={run.afterNotes || ""}
                                  onChange={(event) => updateRunAfterNotes(run.id, event.target.value)}
                                  placeholder="Capture what changed, what succeeded, what failed, or next steps."
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 xl:grid-cols-2">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">Transcript / output</div>
                                <pre className="max-h-64 overflow-auto rounded-md border bg-background/70 p-3 text-xs whitespace-pre-wrap">
                                  {run.transcriptContent || run.stdout || "No transcript content was captured."}
                                </pre>
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">Errors / stderr</div>
                                <pre className="max-h-64 overflow-auto rounded-md border bg-background/70 p-3 text-xs whitespace-pre-wrap">
                                  {run.stderr || "No stderr output was captured."}
                                </pre>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Run setup</DialogTitle>
            <DialogDescription>
              Prepare parameters, safety options, transcript capture, and notes before launching PowerShell.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(90vh-140px)] space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Parameters</div>
                <div className="mt-1 text-lg font-semibold">{analysis.parameters.length}</div>
              </div>
              <div className="rounded-md border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Mode</div>
                <div className="mt-1 truncate font-medium capitalize">{runMode.replace("-", " ")}</div>
              </div>
              <div className="rounded-md border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Transcript</div>
                <div className="mt-1 font-medium">{captureTranscript ? "On" : "Off"}</div>
              </div>
              <div className="rounded-md border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Elevation</div>
                <div className="mt-1 font-medium">{runAsAdmin ? "Admin" : "Standard"}</div>
              </div>
            </div>

            <div className="rounded-md border bg-background/60 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Saved parameter presets</div>
                  <div className="text-sm text-muted-foreground">Reuse known-good values for this script shape without typing them again.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={parameterPresetName}
                    onChange={(event) => setParameterPresetName(event.target.value)}
                    placeholder="Preset name"
                    className="w-44"
                  />
                  <Button variant="outline" size="sm" onClick={saveParameterPreset}>
                    Save preset
                  </Button>
                </div>
              </div>
              {parameterPresets.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {parameterPresets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2">
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">Updated {new Date(preset.updatedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => applyParameterPreset(preset)}>
                          Apply
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteParameterPreset(preset.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {analysis.parameters.length === 0 ? (
              <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                No param() block was detected, so this run will execute the script exactly as written.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {analysis.parameters.map((parameter) => {
                  const value = parameterValues[parameter.name];
                  return (
                    <div key={parameter.name} className="space-y-2">
                      <Label htmlFor={`run-param-${parameter.name}`}>
                        {parameter.name}
                        {parameter.required ? <span className="ml-1 text-destructive">*</span> : null}
                      </Label>
                      {parameter.kind === "switch" ? (
                        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                          <Switch
                            id={`run-param-${parameter.name}`}
                            checked={Boolean(value)}
                            onCheckedChange={(checked) => setParameterValues((current) => ({ ...current, [parameter.name]: checked }))}
                          />
                          <div className="text-sm text-muted-foreground">Enable {parameter.name}</div>
                        </div>
                      ) : parameter.kind === "array" ? (
                        <Textarea
                          id={`run-param-${parameter.name}`}
                          rows={3}
                          value={String(value ?? "")}
                          placeholder={parameter.placeholder}
                          onChange={(event) => setParameterValues((current) => ({ ...current, [parameter.name]: event.target.value }))}
                        />
                      ) : (
                        <Input
                          id={`run-param-${parameter.name}`}
                          type={parameter.kind === "securestring" ? "password" : parameter.kind === "number" ? "number" : "text"}
                          value={String(value ?? "")}
                          placeholder={parameter.placeholder}
                          onChange={(event) => setParameterValues((current) => ({ ...current, [parameter.name]: event.target.value }))}
                        />
                      )}
                      <div className="text-xs text-muted-foreground">{parameter.type} {parameter.required ? "- required" : "- optional"}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-3">
              <div>
                <div className="font-medium">Capture transcript and logs</div>
                <div className="text-sm text-muted-foreground">PSForge will keep the transcript path and stdout/stderr output in the Runs tab.</div>
              </div>
              <Switch checked={captureTranscript} onCheckedChange={setCaptureTranscript} />
            </div>

            <div className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-3">
              <div>
                <div className="font-medium">Run in an elevated PowerShell session</div>
                <div className="text-sm text-muted-foreground">Use this when the script changes services, registry, AD, or other machine-wide resources.</div>
              </div>
              <Switch checked={runAsAdmin} onCheckedChange={setRunAsAdmin} />
            </div>

            <div className="rounded-md border bg-background/60 px-3 py-3">
              <div className="font-medium">Run mode</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Standard runs as written. Dry-run turns on WhatIf preferences where supported. Report-only favors a read-only style run with extra transcript capture guidance.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["standard", "dry-run", "report-only"] as RunMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={runMode === mode ? "default" : "outline"}
                    onClick={() => setRunMode(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-md border bg-background/60 px-3 py-3">
              <Label htmlFor="before-run-notes">Before-run notes</Label>
              <Textarea
                id="before-run-notes"
                rows={3}
                value={beforeRunNotes}
                onChange={(event) => setBeforeRunNotes(event.target.value)}
                placeholder="Capture intent, target environment, change ticket, or what success should look like."
              />
              <div className="text-xs text-muted-foreground">
                These notes are stored with the run summary so you can remember why the script was executed later.
              </div>
            </div>

            {activeEnvironmentProfileName ? (
              <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                Active environment profile: <span className="font-medium text-foreground">{activeEnvironmentProfileName}</span>
              </div>
            ) : null}

            {analysis.issues.length > 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                PSForge spotted {analysis.issues.length} pre-flight note{analysis.issues.length === 1 ? "" : "s"} for this script. You can still run it, but review the Workbench tab first if the target environment is sensitive.
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRunScript()}>
              <Play className="mr-2 h-4 w-4" />
              Run with transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={headerDialogOpen} onOpenChange={setHeaderDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Script header generator</DialogTitle>
            <DialogDescription>
              Add comment-based help, examples, author/version notes, required modules, and a changelog header in one click.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="header-version">Version</Label>
              <Input id="header-version" value={headerVersion} onChange={(event) => setHeaderVersion(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header-modules">Required modules (comma-separated)</Label>
              <Input
                id="header-modules"
                value={headerModules}
                placeholder={analysis.moduleSuggestions.map((module) => module.moduleName).join(", ")}
                onChange={(event) => setHeaderModules(event.target.value)}
              />
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
              The generated header will include synopsis, description, parameter sections, an example, notes, modules, and a changelog entry.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeaderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateHeader}>
              <ScrollText className="mr-2 h-4 w-4" />
              Insert header
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={placeholderDialogOpen} onOpenChange={setPlaceholderDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Safe placeholder replacement</DialogTitle>
            <DialogDescription>
              Replace template values like tenant IDs, paths, names, and sample exports without editing the script line by line.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-md border bg-background/60 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Saved placeholder profiles</div>
                  <div className="text-sm text-muted-foreground">Keep environment-specific replacement sets for this workflow and reload them in one click.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={placeholderProfileName}
                    onChange={(event) => setPlaceholderProfileName(event.target.value)}
                    placeholder="Profile name"
                    className="w-44"
                  />
                  <Button variant="outline" size="sm" onClick={savePlaceholderProfile}>
                    Save profile
                  </Button>
                </div>
              </div>
              {placeholderProfiles.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {placeholderProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2">
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-xs text-muted-foreground">Updated {new Date(profile.updatedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => applyPlaceholderProfile(profile)}>
                          Apply
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePlaceholderProfile(profile.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {analysis.placeholders.length === 0 ? (
              <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                No placeholders were detected in the current script.
              </div>
            ) : (
              analysis.placeholders.map((placeholder) => (
                <div key={placeholder.token} className="space-y-2">
                  <Label htmlFor={`placeholder-${placeholder.token}`}>{placeholder.label}</Label>
                  <Input
                    id={`placeholder-${placeholder.token}`}
                    value={placeholderValues[placeholder.token] || ""}
                    placeholder={placeholder.example}
                    onChange={(event) => setPlaceholderValues((current) => ({ ...current, [placeholder.token]: event.target.value }))}
                  />
                  <div className="font-mono text-xs text-muted-foreground">{placeholder.token}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaceholderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyPlaceholderReplacements} disabled={analysis.placeholders.length === 0}>
              <Replace className="mr-2 h-4 w-4" />
              Apply replacements
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={explainDialogOpen} onOpenChange={setExplainDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Explain this script</DialogTitle>
            <DialogDescription>
              Start with the built-in summary, then use Pro AI explanation if you want clearer next steps, risks, and operator guidance for the current {selectedText.trim() ? "selection" : "script"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{analysis.explanation.title}</CardTitle>
                <CardDescription>{selectedScriptScope.trim() ? analysis.explanation.summary : "Add script content to generate an explanation."}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="font-medium">Primary actions</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.explanation.primaryActions.map((action) => (
                      <li key={action}>• {action}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Inputs</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.explanation.inputs.map((input) => (
                      <li key={input}>• {input}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Side effects</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.explanation.sideEffects.map((effect) => (
                      <li key={effect}>• {effect}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Operator notes</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.explanation.operatorNotes.map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">AI explanation</CardTitle>
                    <CardDescription>Get a more operator-focused explanation with key points, next steps, and likely risks.</CardDescription>
                  </div>
                  {hasAIAccess ? <Badge variant="default">Pro active</Badge> : <Badge variant="secondary">Pro required</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiExplanation ? (
                  <div className="space-y-3">
                    <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">{aiExplanation.explanation}</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="mb-2 font-medium">Key points</div>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {aiExplanation.keyPoints.map((point) => (
                            <li key={point}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-2 font-medium">Suggested next steps</div>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {aiExplanation.suggestedNextSteps.map((step) => (
                            <li key={step}>• {step}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                    Use AI explanation when you want a clearer handoff summary, safer operator notes, and a more guided reading of the script.
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleRequestAiExplanation} disabled={explainMutation.isPending || !selectedScriptScope.trim()}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {explainMutation.isPending ? "Explaining..." : hasAIAccess ? "Generate AI explanation" : "Unlock AI explanation"}
                  </Button>
                  {!hasAIAccess ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        openUpgradeDialog({
                          feature: "AI script explanations",
                          title: "Unlock AI explanations with PSForge Pro",
                          description: "Turn scripts and selected blocks into plain-English guidance, safer next steps, and operator-facing notes without leaving the desktop workflow.",
                          previewTitle: "What Pro adds here",
                          previewItems: [
                            "Explain what the script is doing in practical admin language.",
                            "Flag likely operator risks and follow-up steps.",
                            "Help you review or hand off scripts with more confidence.",
                          ],
                          contextLabel: "AI explanation",
                        })
                      }
                    >
                      Try Pro free for 30 days
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExplainDialogOpen(false)}>Close</Button>
            <Button onClick={() => handleCopyText(JSON.stringify(analysis.explanation, null, 2), "Plain-English script explanation copied.")}>
              <Copy className="mr-2 h-4 w-4" />
              Copy explanation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DesktopUpgradeDialog
        open={upgradeDialogState.open}
        onOpenChange={(open) => setUpgradeDialogState((current) => ({ ...current, open }))}
        feature={upgradeDialogState.feature}
        title={upgradeDialogState.title}
        description={upgradeDialogState.description}
        previewTitle={upgradeDialogState.previewTitle}
        previewItems={upgradeDialogState.previewItems}
        highlights={upgradeDialogState.highlights}
        ctaLabel={upgradeDialogState.ctaLabel}
        contextLabel={upgradeDialogState.contextLabel}
      />
    </>
  );
}
