import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileArchive,
  FileCheck,
  FlaskConical,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Replace,
  Rocket,
  ScrollText,
  Search,
  ShieldAlert,
  Sparkles,
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
  buildWorkbenchProfileKey,
  buildExportBundleArtifacts,
  generateCommentHeader,
  getTeamFavoriteCommandIds,
  replacePlaceholders,
  type ExecutionChecklistItem,
  type ParsedScriptParameter,
} from "@/lib/script-workbench-utils";

interface DesktopScriptWorkbenchProps {
  script: string;
  setScript: (script: string) => void;
  currentFileName?: string;
  authorName?: string;
}

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

type RunMode = "standard" | "dry-run" | "report-only";

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

const COMMAND_FAVORITES_KEY = "psforge-desktop-command-favorites";
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

function buildRecommendationKey(recommendation: AIOptimizationRecommendation) {
  return `${recommendation.type}:${recommendation.priority}:${recommendation.title}:${recommendation.line ?? "na"}`;
}

export function DesktopScriptWorkbench({
  script,
  setScript,
  currentFileName = "script.ps1",
  authorName = "PSForge User",
}: DesktopScriptWorkbenchProps) {
  const { toast } = useToast();
  const { featureAccess } = useAuth();
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [comprehensiveValidation, setComprehensiveValidation] = useState<ComprehensiveValidationResult | null>(null);
  const [lastValidatedCode, setLastValidatedCode] = useState("");
  const [lastComprehensiveCode, setLastComprehensiveCode] = useState("");
  const [isCommandLibraryVisible, setIsCommandLibraryVisible] = useState(true);
  const [detailsTab, setDetailsTab] = useState("preview");
  const [favoriteCommandIds, setFavoriteCommandIds] = useState<string[]>(() =>
    safeJsonParse<string[]>(getDesktopStorageItem(COMMAND_FAVORITES_KEY), []),
  );
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);
  const [placeholderDialogOpen, setPlaceholderDialogOpen] = useState(false);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
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
      return analysis.parameters.reduce<Record<string, unknown>>((accumulator, parameter) => {
        accumulator[parameter.name] = next[parameter.name];
        return accumulator;
      }, {});
    });
  }, [analysis.parameters]);

  useEffect(() => {
    setPlaceholderValues(
      analysis.placeholders.reduce<Record<string, string>>((accumulator, placeholder) => {
        accumulator[placeholder.token] = "";
        return accumulator;
      }, {}),
    );
  }, [analysis.placeholders]);

  useEffect(() => {
    setChecklistState((current) => {
      const next: Record<string, boolean> = {};
      for (const item of analysis.checklist) {
        next[item.id] = current[item.id] ?? item.checked;
      }
      return next;
    });
  }, [analysis.checklist]);

  useEffect(() => {
    setDesktopStorageItem(COMMAND_FAVORITES_KEY, JSON.stringify(favoriteCommandIds));
  }, [favoriteCommandIds]);

  useEffect(() => {
    setDesktopStorageItem(RUN_HISTORY_KEY, JSON.stringify(runHistory.slice(0, 12)));
  }, [runHistory]);

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
      const response = await apiRequest("/api/ai/optimize", "POST", { code });
      return response.json() as Promise<AIOptimizationResult>;
    },
    onSuccess: (result) => {
      setAiOptimization(result);
      const defaultKeys = [...result.security, ...result.performance, ...result.bestPractices]
        .filter((recommendation) => recommendation.priority === "critical" || recommendation.priority === "high")
        .map(buildRecommendationKey);
      setSelectedRecommendationKeys(defaultKeys);
      setDetailsTab("ai-review");
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
      setValidationResult({ isValid: true, errors: [] });
      setComprehensiveValidation(null);
      setLastValidatedCode("");
      setLastComprehensiveCode("");
      return;
    }

    if (script !== lastValidatedCode && !validationMutation.isPending) {
      validationMutation.mutate(script);
    }

    if (script !== lastComprehensiveCode && comprehensiveValidation !== null) {
      setComprehensiveValidation(null);
    }
  }, [script, lastValidatedCode, lastComprehensiveCode, comprehensiveValidation, validationMutation]);

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
    setDetailsTab("workbench");
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
      setDetailsTab("ai-review");
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
        description: "Add a script before opening the parameter runner.",
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
      setDetailsTab("runs");

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
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Build scripts visually, review risks, fill parameters, and run them with transcripts from one workspace.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setRunDialogOpen(true)} data-testid="button-run-script">
                <Play className="mr-2 h-4 w-4" />
                Run Script
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHeaderDialogOpen(true)}>
                <ScrollText className="mr-2 h-4 w-4" />
                Header
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExplainDialogOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Explain
              </Button>
              <Button variant="outline" size="sm" onClick={handleRunAiReview} data-testid="button-ai-review">
                <Bot className="mr-2 h-4 w-4" />
                AI Review
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPlaceholderDialogOpen(true)} disabled={analysis.placeholders.length === 0}>
                <Replace className="mr-2 h-4 w-4" />
                Placeholders
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportBundle} disabled={exportingBundle}>
                <FileArchive className="mr-2 h-4 w-4" />
                {exportingBundle ? "Exporting..." : "Export Bundle"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCommandLibraryVisible((current) => !current)}
                data-testid="button-toggle-command-library"
              >
                {isCommandLibraryVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
                {isCommandLibraryVisible ? "Hide Command Library" : "Show Command Library"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {isCommandLibraryVisible && (
            <CommandSidebar
              onAddCommand={handleAddCommand}
              favoriteCommandIds={favoriteCommandIds}
              onToggleFavorite={toggleFavoriteCommand}
              teamFavoriteCommandIds={getTeamFavoriteCommandIds()}
            />
          )}

          <div className="grid min-w-0 flex-1 min-h-0 overflow-hidden" style={{ gridTemplateRows: "minmax(0, 1fr) clamp(260px, 34vh, 420px)" }}>
            <div className="min-h-0 overflow-hidden border-b">
              <ScriptEditor
                script={script}
                onScriptChange={setScript}
                onCursorPositionChange={setCursorPosition}
                onSelectionChange={setSelectedText}
              />
            </div>

            <div className="min-h-0 overflow-hidden">
              <Tabs value={detailsTab} onValueChange={setDetailsTab} className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <TabsList className="grid w-auto grid-cols-6">
                    <TabsTrigger value="preview" className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>Preview</span>
                    </TabsTrigger>
                    <TabsTrigger value="basic" className="flex items-center gap-1">
                      <List className="h-4 w-4" />
                      <span>Basic</span>
                    </TabsTrigger>
                    <TabsTrigger value="comprehensive" className="flex items-center gap-1">
                      <FileCheck className="h-4 w-4" />
                      <span>Comprehensive</span>
                    </TabsTrigger>
                    <TabsTrigger value="workbench" className="flex items-center gap-1">
                      <ClipboardList className="h-4 w-4" />
                      <span>Workbench</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai-review" className="flex items-center gap-1">
                      <Bot className="h-4 w-4" />
                      <span>AI Review</span>
                    </TabsTrigger>
                    <TabsTrigger value="runs" className="flex items-center gap-1">
                      <Play className="h-4 w-4" />
                      <span>Runs</span>
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Badge variant={preflightSummary.critical > 0 ? "destructive" : "secondary"}>
                      {preflightSummary.critical} critical
                    </Badge>
                    <Badge variant="secondary">{preflightSummary.warning} warnings</Badge>
                    <Button size="sm" onClick={runComprehensiveValidation} disabled={!script.trim() || comprehensiveValidationMutation.isPending}>
                      {comprehensiveValidationMutation.isPending ? "Analyzing..." : "Run Pre-flight"}
                    </Button>
                  </div>
                </div>

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
                                      ? "Open parameter runner"
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
                        <p className="text-sm">Use the parameter runner to execute the script and capture transcript output here.</p>
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
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Parameter form runner</DialogTitle>
            <DialogDescription>
              Fill in the detected PowerShell parameters here instead of editing variables by hand. PSForge will run the script and capture transcript output for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                      <div className="text-xs text-muted-foreground">{parameter.type} {parameter.required ? "• required" : "• optional"}</div>
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
