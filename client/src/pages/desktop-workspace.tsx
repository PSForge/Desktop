import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Copy, CreditCard, ExternalLink, FileCode, History, KeyRound, LayoutGrid, Plus, RefreshCcw, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { flushDesktopAnalytics, trackDesktopAnalyticsEvent } from "@/lib/desktop-analytics";
import {
  checkForDesktopUpdates,
  getDesktopContext,
  getDesktopUpdateState,
  getDesktopStorageItem,
  installDesktopUpdate,
  openExternalUrl,
  openDesktopPath,
  openDesktopScript,
  removeDesktopStorageItem,
  saveDesktopScript,
  setDesktopStorageItem,
  getPendingDesktopWorkflowLink,
  subscribeToDesktopMenuActions,
  subscribeToDesktopUpdates,
  subscribeToDesktopWorkflowLinks,
  writeDesktopScriptFile,
  type DesktopWorkflowDeepLinkPayload,
} from "@/lib/desktop";
import {
  createDesktopBillingCheckout,
  createDesktopBillingPortal,
  desktopRegisterAccount,
  desktopSignInWithPassword,
  fetchDesktopLicense,
  getDesktopApiBaseUrl,
  getDesktopAuthHeader,
  getDesktopAuthState,
  getDesktopCachedLicense,
  getDesktopRequestUrl,
  hasStoredDesktopSession,
} from "@/lib/desktop-auth";
import {
  activateEnterpriseLicense,
  clearEnterpriseLicenseRecord,
  getEnterpriseAuthHeader,
  getEnterpriseLicenseRecord,
  getEnterpriseLicenseServerUrl,
  getEnterpriseRequestUrl,
  isEnterpriseEdition,
  isEnterpriseLicenseActive,
  validateEnterpriseLicense,
  type EnterpriseInstallOptions,
} from "@/lib/enterprise-license";
import { queryClient } from "@/lib/queryClient";
import type { ScriptCommand } from "@shared/schema";
import { DesktopScriptWorkbench, type DesktopWorkbenchActionType, type DesktopWorkbenchAction, type DesktopRunHistorySummary } from "@/components/desktop-script-workbench";
import { DesktopWorkbenchShell } from "@/components/desktop-workbench-shell";
import {
  DESKTOP_GUIDED_FOCUSES,
  DesktopFocusPanel,
  DesktopGuidedOnboardingDialog,
  getDesktopGuidedFocus,
  getDesktopGuidedWorkflow,
  type DesktopGuidedProfile,
  type DesktopWorkspaceTab,
} from "@/components/desktop-guided-onboarding";
import {
  DESKTOP_FREE_TRIAL_PROMO_CODE,
  DESKTOP_POST_UPGRADE_CONTEXT_KEY,
  DesktopUpgradeDialog,
} from "@/components/desktop-upgrade-dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import logoImage from "@assets/psforge-2-logo-transparent.png";
import { analyzeScriptWorkbench } from "@/lib/script-workbench-utils";
import {
  DESKTOP_WORKFLOW_CONTEXT_KEY,
  fetchPublicWorkflowDefinition,
  getWorkflowDisplayTitle,
  mapWorkflowToLocalRegistry,
  type SharedWorkflowDefinition,
  type WorkflowMappingResult,
} from "@/lib/desktop-workflow-links";

const AIAssistantTab = lazy(() => import("@/components/ai-assistant-tab").then((module) => ({ default: module.AIAssistantTab })));
const GUIBuilderTab = lazy(() => import("@/components/gui-builder-tab").then((module) => ({ default: module.GUIBuilderTab })));
const ScriptWizardTab = lazy(() => import("@/components/script-wizard-tab").then((module) => ({ default: module.ScriptWizardTab })));
const DesktopGitPanel = lazy(() => import("@/components/desktop-git-panel").then((module) => ({ default: module.DesktopGitPanel })));
const TroubleshooterTab = lazy(() => import("@/components/troubleshooter-tab").then((module) => ({ default: module.TroubleshooterTab })));

type RecentFile = {
  fileName: string;
  filePath?: string;
  openedAt: string;
};

type ScriptWorkspaceTab = {
  id: string;
  fileName: string;
  filePath?: string;
  script: string;
  lastSavedContent: string;
  openedAt: string;
  webScriptId?: string;
  webScriptName?: string;
  webScriptDescription?: string | null;
  webScriptSyncedContent?: string;
  webScriptLastSyncedAt?: string;
};

type AppSettingsView = "license" | "subscription" | "recovery" | "recent" | null;

type DesktopConversionState = {
  appLaunches: number;
  starterWorkflowRuns: number;
};

type StarterWorkflow = {
  id: string;
  title: string;
  description: string;
  badge: string;
  outcome: string;
  script: string;
};

type WebLibraryScript = {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  taskCategory?: string | null;
  taskName?: string | null;
  isFavorite?: boolean;
  lastAccessed?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type LibraryFilter = "all" | "web" | "favorites" | "recent" | "starters" | "local";

type WebScriptConflict = {
  tabId: string;
  remoteScript: WebLibraryScript;
};

type WorkflowReviewState = {
  workflow: SharedWorkflowDefinition;
  mapping: WorkflowMappingResult;
};

const RECOVERY_KEY = "psforge-desktop-recovery";
const RECENTS_KEY = "psforge-desktop-recent-files";
const CONVERSION_STATE_KEY = "psforge-desktop-conversion-state";
const WEB_LIBRARY_CACHE_KEY = "psforge-desktop-web-library-cache";

const STARTER_WORKFLOWS: StarterWorkflow[] = [
  {
    id: "ad-user-offboarding",
    title: "AD User Offboarding",
    description: "Disable an account, move it to a target OU, and log the action with WhatIf support.",
    badge: "Identity",
    outcome: "A reviewable offboarding scaffold with ShouldProcess guardrails, logging, and AD module import hints.",
    script: `<#
.SYNOPSIS
Safely prepares an Active Directory user offboarding workflow.

.DESCRIPTION
Disables a user account, optionally moves it to a target OU, and writes an operator log entry. Review all values before running against production.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)]
  [string]$SamAccountName,

  [string]$DisabledUsersOu = "OU=Disabled Users,DC=contoso,DC=com",

  [string]$LogPath = ".\\offboarding-log.txt"
)

Import-Module ActiveDirectory

$user = Get-ADUser -Identity $SamAccountName -Properties DistinguishedName

if ($PSCmdlet.ShouldProcess($SamAccountName, "Disable AD account")) {
  Disable-ADAccount -Identity $user
}

if ($DisabledUsersOu -and $PSCmdlet.ShouldProcess($SamAccountName, "Move account to disabled users OU")) {
  Move-ADObject -Identity $user.DistinguishedName -TargetPath $DisabledUsersOu
}

"$(Get-Date -Format o) Offboarding prepared for $SamAccountName" | Add-Content -Path $LogPath
`,
  },
  {
    id: "intune-remediation",
    title: "Intune Detection + Remediation",
    description: "Create a safe detection/remediation starter for endpoint compliance work.",
    badge: "Endpoint",
    outcome: "A paired detection and remediation script that can be split into Intune-ready deployment pieces.",
    script: `<#
.SYNOPSIS
Starter scaffold for an Intune detection and remediation workflow.

.DESCRIPTION
Use the detection block to report compliance and the remediation block to apply a targeted fix. Keep remediation idempotent.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [switch]$Remediate,
  [string]$LogPath = "$env:ProgramData\\PSForge\\intune-remediation.log"
)

New-Item -ItemType Directory -Path (Split-Path $LogPath) -Force | Out-Null

$isCompliant = Test-Path "C:\\ProgramData\\Example\\required.marker"

if (-not $isCompliant -and -not $Remediate) {
  Write-Output "Non-compliant"
  exit 1
}

if (-not $isCompliant -and $Remediate) {
  if ($PSCmdlet.ShouldProcess("Endpoint", "Apply remediation")) {
    New-Item -ItemType Directory -Path "C:\\ProgramData\\Example" -Force | Out-Null
    New-Item -ItemType File -Path "C:\\ProgramData\\Example\\required.marker" -Force | Out-Null
    "$(Get-Date -Format o) Remediation applied" | Add-Content -Path $LogPath
  }
}

Write-Output "Compliant"
exit 0
`,
  },
  {
    id: "m365-license-report",
    title: "Microsoft 365 License Report",
    description: "Generate a Graph-ready reporting scaffold for user license review.",
    badge: "Reporting",
    outcome: "A Graph module reporting starter with export wiring and obvious places for tenant-specific columns.",
    script: `<#
.SYNOPSIS
Creates a Microsoft 365 license report scaffold.

.DESCRIPTION
Connects to Microsoft Graph and exports user license posture for review. Replace scopes and properties as needed.
#>
[CmdletBinding()]
param(
  [string]$OutputPath = ".\\m365-license-report.csv"
)

Import-Module Microsoft.Graph.Users
Import-Module Microsoft.Graph.Identity.DirectoryManagement

Connect-MgGraph -Scopes "User.Read.All", "Directory.Read.All"

$users = Get-MgUser -All -Property Id,DisplayName,UserPrincipalName,AssignedLicenses

$users | Select-Object DisplayName, UserPrincipalName, @{
  Name = "AssignedLicenseCount"
  Expression = { $_.AssignedLicenses.Count }
} | Export-Csv -Path $OutputPath -NoTypeInformation

Write-Output "License report exported to $OutputPath"
`,
  },
  {
    id: "windows-service-health",
    title: "Windows Service Health Check",
    description: "Audit service state and optionally restart target services with ShouldProcess.",
    badge: "Windows",
    outcome: "A safe operational check that reports service state and only restarts services when explicitly requested.",
    script: `<#
.SYNOPSIS
Checks Windows service health and optionally restarts stopped services.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [string[]]$ServiceName = @("Spooler"),
  [switch]$RestartStopped
)

$services = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

foreach ($service in $services) {
  [PSCustomObject]@{
    Name = $service.Name
    DisplayName = $service.DisplayName
    Status = $service.Status
  }

  if ($RestartStopped -and $service.Status -ne "Running") {
    if ($PSCmdlet.ShouldProcess($service.Name, "Restart service")) {
      Restart-Service -Name $service.Name -Force
    }
  }
}
`,
  },
];

function createWorkspaceTab(partial?: Partial<ScriptWorkspaceTab>): ScriptWorkspaceTab {
  return {
    id: globalThis.crypto?.randomUUID?.() || `script-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: "Untitled.ps1",
    filePath: undefined,
    script: "",
    lastSavedContent: "",
    openedAt: new Date().toISOString(),
    ...partial,
  };
}

function getNextUntitledName(tabs: ScriptWorkspaceTab[]) {
  const existingNames = new Set(tabs.map((tab) => tab.fileName.toLowerCase()));
  if (!existingNames.has("untitled.ps1")) {
    return "Untitled.ps1";
  }

  let index = 2;
  while (existingNames.has(`untitled ${index}.ps1`)) {
    index += 1;
  }

  return `Untitled ${index}.ps1`;
}

function readDesktopConversionState(): DesktopConversionState {
  const savedState = getDesktopStorageItem(CONVERSION_STATE_KEY);
  if (!savedState) {
    return {
      appLaunches: 0,
      starterWorkflowRuns: 0,
    };
  }

  try {
    const parsed = JSON.parse(savedState) as Partial<DesktopConversionState>;
    return {
      appLaunches: typeof parsed.appLaunches === "number" ? parsed.appLaunches : 0,
      starterWorkflowRuns: typeof parsed.starterWorkflowRuns === "number" ? parsed.starterWorkflowRuns : 0,
    };
  } catch {
    return {
      appLaunches: 0,
      starterWorkflowRuns: 0,
    };
  }
}

interface DesktopWorkspaceProps {
  previewMode?: boolean;
}

export default function DesktopWorkspace({ previewMode = false }: DesktopWorkspaceProps) {
  const { toast } = useToast();
  const { user, isAuthenticated, featureAccess, logout, refetch } = useAuth();
  const [scriptTabs, setScriptTabs] = useState<ScriptWorkspaceTab[]>(() => [createWorkspaceTab()]);
  const [activeScriptTabId, setActiveScriptTabId] = useState("");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<DesktopWorkspaceTab>("script");
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [pendingWorkbenchAction, setPendingWorkbenchAction] = useState<DesktopWorkbenchAction | null>(null);
  const [runHistorySummary, setRunHistorySummary] = useState<DesktopRunHistorySummary>({ totalRuns: 0, failedRuns: 0 });
  const [selectedGuiCategory, setSelectedGuiCategory] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [starterWorkflowPreview, setStarterWorkflowPreview] = useState<StarterWorkflow | null>(null);
  const [starterGalleryOpen, setStarterGalleryOpen] = useState(false);
  const [starterGalleryQuery, setStarterGalleryQuery] = useState("");
  const [webLibraryScripts, setWebLibraryScripts] = useState<WebLibraryScript[]>([]);
  const [webLibraryLoading, setWebLibraryLoading] = useState(false);
  const [webLibraryError, setWebLibraryError] = useState<string | null>(null);
  const [webLibraryQuery, setWebLibraryQuery] = useState("");
  const [webLibraryFilter, setWebLibraryFilter] = useState<LibraryFilter>("all");
  const [webLibraryFromCache, setWebLibraryFromCache] = useState(false);
  const [webScriptConflict, setWebScriptConflict] = useState<WebScriptConflict | null>(null);
  const [workflowLaunchNotice, setWorkflowLaunchNotice] = useState<string | null>(null);
  const [workflowTaskHighlights, setWorkflowTaskHighlights] = useState<string[]>([]);
  const [workflowSelectedTaskId, setWorkflowSelectedTaskId] = useState<string | null>(null);
  const [workflowUpgradeContext, setWorkflowUpgradeContext] = useState<WorkflowReviewState | null>(null);
  const [desktopSignInLoading, setDesktopSignInLoading] = useState(false);
  const [desktopSignOutLoading, setDesktopSignOutLoading] = useState(false);
  const [desktopRegisterLoading, setDesktopRegisterLoading] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState<null | "checkout" | "portal">(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [generalUpgradeDialogOpen, setGeneralUpgradeDialogOpen] = useState(false);
  const [licenseEmail, setLicenseEmail] = useState("");
  const [licensePassword, setLicensePassword] = useState("");
  const [licenseStatusMessage, setLicenseStatusMessage] = useState<string | null>(null);
  const [licenseStatusTone, setLicenseStatusTone] = useState<"default" | "destructive">("default");
  const [recoveryFound, setRecoveryFound] = useState(false);
  const [pendingTabCloseId, setPendingTabCloseId] = useState<string | null>(null);
  const [appSettingsView, setAppSettingsView] = useState<AppSettingsView>(null);
  const [guidedProfile, setGuidedProfile] = useState<DesktopGuidedProfile | null>(null);
  const [guidedOnboardingOpen, setGuidedOnboardingOpen] = useState(false);
  const [guidedUpgradeWorkflowId, setGuidedUpgradeWorkflowId] = useState<string | null>(null);
  const [guidedFocusDraftId, setGuidedFocusDraftId] = useState(() => DESKTOP_GUIDED_FOCUSES[0].id);
  const [guidedWorkflowDraftId, setGuidedWorkflowDraftId] = useState(() => DESKTOP_GUIDED_FOCUSES[0].workflows[0].id);
  const [conversionState, setConversionState] = useState<DesktopConversionState>(() => readDesktopConversionState());
  const [conversionBannerDismissed, setConversionBannerDismissed] = useState(false);
  const [trialCodeCopied, setTrialCodeCopied] = useState(false);
  const [desktopSession, setDesktopSession] = useState(() => getDesktopAuthState());
  const [enterpriseInstallOptions, setEnterpriseInstallOptions] = useState<EnterpriseInstallOptions | null>(null);
  const [enterpriseLicenseKey, setEnterpriseLicenseKey] = useState("");
  const [enterpriseLicenseServerUrl, setEnterpriseLicenseServerUrl] = useState(() => getEnterpriseLicenseServerUrl());
  const [enterpriseActivationLoading, setEnterpriseActivationLoading] = useState(false);
  const [enterpriseActivationMessage, setEnterpriseActivationMessage] = useState<string | null>(null);
  const [enterpriseLicense, setEnterpriseLicense] = useState(() => getEnterpriseLicenseRecord());
  const [desktopVersion, setDesktopVersion] = useState("1.0.0");
  const [updateState, setUpdateState] = useState<{ state: string; version?: string; percent?: number; message?: string }>({ state: "idle" });
  const pollTimerRef = useRef<number | null>(null);
  const checkoutRefreshTimerRef = useRef<number | null>(null);
  const analyticsHeartbeatRef = useRef<number | null>(null);
  const enterpriseRefreshTimerRef = useRef<number | null>(null);
  const appOpenedTrackedRef = useRef(false);
  const cachedLicense = desktopSession.license || getDesktopCachedLicense();
  const enterpriseMode = isEnterpriseEdition();
  const enterpriseActive = enterpriseMode && isEnterpriseLicenseActive(enterpriseLicense);
  const cloudStorageEnabled = !enterpriseMode;
  const cachedUser = desktopSession.user || null;
  const previewUser = previewMode
    ? {
      id: "desktop-preview-user",
      email: "preview@psforge.local",
      name: "PSForge Preview",
      role: "admin" as const,
    }
    : null;
  const enterpriseUser = enterpriseActive
    ? {
      id: enterpriseLicense?.licenseId || "enterprise-license",
      email: "enterprise@psforge.local",
      name: enterpriseLicense?.organizationName || "PSForge Enterprise",
      role: "admin" as const,
    }
    : null;
  const visibleUser = enterpriseUser || user || cachedUser || previewUser;
  const activeScriptTab = useMemo(
    () => scriptTabs.find((tab) => tab.id === activeScriptTabId) || scriptTabs[0] || null,
    [activeScriptTabId, scriptTabs],
  );
  const currentFileName = activeScriptTab?.fileName || "Untitled.ps1";
  const currentScript = activeScriptTab?.script || "";
  const activeTabDirty = activeScriptTab ? activeScriptTab.script !== activeScriptTab.lastSavedContent : false;
  const activeWebSyncDirty = activeScriptTab?.webScriptId
    ? activeScriptTab.script !== (activeScriptTab.webScriptSyncedContent || "")
    : false;
  const currentScriptAnalysis = useMemo(() => analyzeScriptWorkbench(currentScript), [currentScript]);
  const hasProAccess = enterpriseActive || previewMode || user?.role === "admin" || !!featureAccess?.hasPremiumCategories || !!cachedLicense?.isPro;
  const isRevalidatingStoredSession = !!desktopSession.token && !visibleUser;
  const currentGuidedProfile = guidedProfile ? guidedProfile : null;
  const currentGuidedFocus = currentGuidedProfile ? getDesktopGuidedFocus(currentGuidedProfile.focusId) : null;
  const currentGuidedWorkflow = currentGuidedProfile
    ? getDesktopGuidedWorkflow(currentGuidedProfile.focusId, currentGuidedProfile.workflowId)
    : null;
  const guidedDraftFocus = getDesktopGuidedFocus(guidedFocusDraftId);
  const guidedDraftWorkflow = getDesktopGuidedWorkflow(guidedDraftFocus.id, guidedWorkflowDraftId);
  const guidedUpgradeWorkflow = currentGuidedFocus && guidedUpgradeWorkflowId
    ? currentGuidedFocus.workflows.find((workflow) => workflow.id === guidedUpgradeWorkflowId) || null
    : null;
  const filteredStarterWorkflows = useMemo(() => {
    const query = starterGalleryQuery.trim().toLowerCase();
    if (!query) {
      return STARTER_WORKFLOWS;
    }

    return STARTER_WORKFLOWS.filter((workflow) =>
      [workflow.title, workflow.description, workflow.badge, workflow.outcome].some((value) => value.toLowerCase().includes(query)),
    );
  }, [starterGalleryQuery]);
  const filteredWebLibraryScripts = useMemo(() => {
    if (!cloudStorageEnabled) {
      return [];
    }

    const query = webLibraryQuery.trim().toLowerCase();
    const baseScripts = webLibraryFilter === "favorites"
      ? webLibraryScripts.filter((script) => script.isFavorite)
      : webLibraryFilter === "recent"
        ? [...webLibraryScripts].sort((first, second) =>
          new Date(second.lastAccessed || second.updatedAt || second.createdAt || 0).getTime()
          - new Date(first.lastAccessed || first.updatedAt || first.createdAt || 0).getTime(),
        )
        : webLibraryScripts;

    if (!query) {
      return baseScripts;
    }

    return baseScripts.filter((script) =>
      [
        script.name,
        script.description || "",
        script.taskCategory || "",
        script.taskName || "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [cloudStorageEnabled, webLibraryFilter, webLibraryQuery, webLibraryScripts]);
  const filteredStarterLibrary = useMemo(() => {
    const query = webLibraryQuery.trim().toLowerCase();
    if (!query) {
      return STARTER_WORKFLOWS;
    }

    return STARTER_WORKFLOWS.filter((workflow) =>
      [workflow.title, workflow.description, workflow.badge, workflow.outcome].some((value) => value.toLowerCase().includes(query)),
    );
  }, [webLibraryQuery]);
  const filteredRecentLibrary = useMemo(() => {
    const query = webLibraryQuery.trim().toLowerCase();
    if (!query) {
      return recentFiles;
    }

    return recentFiles.filter((file) =>
      [file.fileName, file.filePath || ""].some((value) => value.toLowerCase().includes(query)),
    );
  }, [recentFiles, webLibraryQuery]);
  const showWebLibrary = cloudStorageEnabled
    && (webLibraryFilter === "all" || webLibraryFilter === "web" || webLibraryFilter === "favorites" || webLibraryFilter === "recent");
  const showStarterLibrary = webLibraryFilter === "all" || webLibraryFilter === "starters";
  const showLocalLibrary = webLibraryFilter === "all" || webLibraryFilter === "local" || webLibraryFilter === "recent";
  const libraryFilters: Array<[LibraryFilter, string]> = cloudStorageEnabled
    ? [
      ["all", "All"],
      ["web", "Web"],
      ["starters", "Starters"],
      ["local", "Local"],
      ["favorites", "Favorites"],
      ["recent", "Recent"],
    ]
    : [
      ["all", "All"],
      ["starters", "Starters"],
      ["local", "Local"],
      ["recent", "Recent"],
    ];

  const accessLabel = useMemo(() => {
    if (enterpriseActive) {
      return enterpriseLicense?.organizationName
        ? `${enterpriseLicense.organizationName} Enterprise`
        : "Enterprise activated";
    }
    if (hasProAccess) {
      return "Pro access enabled";
    }
    if (visibleUser || isAuthenticated) {
      return "Free access";
    }
    return "License not connected";
  }, [enterpriseActive, enterpriseLicense?.organizationName, hasProAccess, isAuthenticated, visibleUser]);

  const desktopConversionBanner = useMemo(() => {
    if (hasProAccess || !visibleUser || conversionBannerDismissed) {
      return null;
    }

    if (conversionState.starterWorkflowRuns >= 3) {
      return {
        title: `You've already started ${conversionState.starterWorkflowRuns} workflows. Let Pro finish them much faster.`,
        description: "Use AI generation, guided troubleshooting, and premium workflow packs without bouncing back to the manual path.",
        cta: "Start 30-day Pro trial",
      };
    }

    if (conversionState.starterWorkflowRuns >= 1) {
      return {
        title: "Nice start. PSForge Pro turns starter scripts into finished automation much faster.",
        description: "Keep the editor free path whenever you want, then unlock AI generation and premium workflows when you're ready to speed things up.",
        cta: "Try Pro free for 30 days",
      };
    }

      return {
        title: "Start your 30-day PSForge Pro trial when you're ready to move faster.",
        description: "Use promo code FREE30 at checkout to test AI, troubleshooting, and premium workflow packs from inside the app.",
        cta: "Start 30-day Pro trial",
      };
  }, [conversionBannerDismissed, conversionState.starterWorkflowRuns, hasProAccess, visibleUser]);

  useEffect(() => {
    if (!activeScriptTabId && scriptTabs[0]) {
      setActiveScriptTabId(scriptTabs[0].id);
    }
  }, [activeScriptTabId, scriptTabs]);

  useEffect(() => {
    const savedRecents = getDesktopStorageItem(RECENTS_KEY);
    if (savedRecents) {
      try {
        setRecentFiles(JSON.parse(savedRecents));
      } catch {
        setRecentFiles([]);
      }
    }

    const savedRecovery = getDesktopStorageItem(RECOVERY_KEY);
    if (savedRecovery) {
      try {
        const parsed = JSON.parse(savedRecovery) as { tabs?: ScriptWorkspaceTab[]; activeScriptTabId?: string };
        if (parsed.tabs?.length) {
          setRecoveryFound(parsed.tabs.some((tab) => tab.script !== tab.lastSavedContent));
          setScriptTabs(parsed.tabs.map((tab) => createWorkspaceTab(tab)));
          setActiveScriptTabId(parsed.activeScriptTabId || parsed.tabs[0].id);
        }
      } catch {
        removeDesktopStorageItem(RECOVERY_KEY);
      }
    }

    removeDesktopStorageItem("psforge-desktop-guided-onboarding");
    removeDesktopStorageItem("psforge-desktop-guided-profile");
    setConversionState((current) => {
      const next = {
        ...current,
        appLaunches: current.appLaunches + 1,
      };
      setDesktopStorageItem(CONVERSION_STATE_KEY, JSON.stringify(next));
      return next;
    });
    setConversionBannerDismissed(false);

    return () => {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
      }
      if (checkoutRefreshTimerRef.current) {
        window.clearTimeout(checkoutRefreshTimerRef.current);
      }
      if (analyticsHeartbeatRef.current) {
        window.clearInterval(analyticsHeartbeatRef.current);
      }
      if (enterpriseRefreshTimerRef.current) {
        window.clearTimeout(enterpriseRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasStoredDesktopSession()) {
      return;
    }

    setDesktopSession(getDesktopAuthState());
    queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
  }, []);

  useEffect(() => {
    setDesktopSession(getDesktopAuthState());
  }, [user, isAuthenticated]);

  useEffect(() => {
    const workflowStillExists = guidedDraftFocus.workflows.some((workflow) => workflow.id === guidedWorkflowDraftId);
    if (!workflowStillExists) {
      setGuidedWorkflowDraftId(guidedDraftFocus.workflows[0].id);
    }
  }, [guidedDraftFocus, guidedWorkflowDraftId]);

  useEffect(() => {
    if (!visibleUser) {
      setGuidedOnboardingOpen(false);
      return;
    }

    if (guidedProfile) {
      setGuidedFocusDraftId(guidedProfile.focusId);
      setGuidedWorkflowDraftId(guidedProfile.workflowId);
    }
  }, [guidedProfile, visibleUser]);

  useEffect(() => {
    if (!hasProAccess || !guidedUpgradeWorkflowId || !currentGuidedFocus) {
      return;
    }

    const workflowId = guidedUpgradeWorkflowId;
    setGuidedUpgradeWorkflowId(null);
    startGuidedWorkflow(workflowId, currentGuidedFocus.id);
  }, [currentGuidedFocus, guidedUpgradeWorkflowId, hasProAccess]);

  useEffect(() => {
    if (!appOpenedTrackedRef.current) {
      appOpenedTrackedRef.current = true;
      void trackDesktopAnalyticsEvent("desktop_app_opened");
    }

    if (analyticsHeartbeatRef.current) {
      window.clearInterval(analyticsHeartbeatRef.current);
    }

    analyticsHeartbeatRef.current = window.setInterval(() => {
      void trackDesktopAnalyticsEvent("desktop_session_heartbeat");
    }, 5 * 60 * 1000);

    return () => {
      if (analyticsHeartbeatRef.current) {
        window.clearInterval(analyticsHeartbeatRef.current);
        analyticsHeartbeatRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (desktopSession.token) {
      void flushDesktopAnalytics();
    }
  }, [desktopSession.token]);

  useEffect(() => {
    if (!enterpriseMode || !enterpriseActive) {
      return;
    }

    void validateEnterpriseLicense(enterpriseLicenseServerUrl)
      .then((record) => {
        if (record) {
          setEnterpriseLicense(record);
          void queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
        }
      })
      .catch((error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          clearEnterpriseLicenseRecord();
          setEnterpriseLicense(null);
          void queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
        }
        setEnterpriseActivationMessage(error?.message || "Enterprise license validation failed.");
      });
  }, [enterpriseActive, enterpriseLicenseServerUrl, enterpriseMode]);

  useEffect(() => {
    if (enterpriseRefreshTimerRef.current) {
      window.clearTimeout(enterpriseRefreshTimerRef.current);
      enterpriseRefreshTimerRef.current = null;
    }

    if (!enterpriseMode || !enterpriseActive || !enterpriseLicense) {
      return;
    }

    const refreshAt = enterpriseLicense.refreshAfter
      ? new Date(enterpriseLicense.refreshAfter).getTime()
      : Date.now() + 24 * 60 * 60 * 1000;
    const refreshDelay = Math.max(60_000, refreshAt - Date.now());

    enterpriseRefreshTimerRef.current = window.setTimeout(async () => {
      try {
        const record = await validateEnterpriseLicense(enterpriseLicenseServerUrl);
        if (record) {
          setEnterpriseLicense(record);
          setEnterpriseActivationMessage(null);
          await queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
        }
      } catch (error: any) {
        if (error?.status === 401 || error?.status === 403) {
          clearEnterpriseLicenseRecord();
          setEnterpriseLicense(null);
          setEnterpriseActivationMessage(error?.message || "Enterprise license is no longer active.");
          await queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
          return;
        }

        setEnterpriseActivationMessage(error?.message || "Enterprise license validation failed. The app will retry after restart.");
      }
    }, refreshDelay);

    return () => {
      if (enterpriseRefreshTimerRef.current) {
        window.clearTimeout(enterpriseRefreshTimerRef.current);
        enterpriseRefreshTimerRef.current = null;
      }
    };
  }, [enterpriseActive, enterpriseLicense, enterpriseLicenseServerUrl, enterpriseMode]);

  useEffect(() => {
    if (!enterpriseMode || enterpriseActive || !enterpriseInstallOptions?.licenseKey) {
      return;
    }

    void handleEnterpriseActivation(enterpriseInstallOptions.licenseKey, enterpriseInstallOptions.licenseServerUrl);
  }, [enterpriseActive, enterpriseInstallOptions, enterpriseMode]);

  useEffect(() => {
    if (!cloudStorageEnabled && (webLibraryFilter === "web" || webLibraryFilter === "favorites")) {
      setWebLibraryFilter("all");
    }
  }, [cloudStorageEnabled, webLibraryFilter]);

  useEffect(() => {
    if (activeWorkspaceTab === "gui") {
      void loadWebLibraryScripts();
    }
  }, [activeWorkspaceTab, cloudStorageEnabled, desktopSession.token]);

  useEffect(() => {
    let mounted = true;

    getDesktopContext().then((context) => {
      if (!mounted) {
        return;
      }

      if (context?.version) {
        setDesktopVersion(context.version);
      }

      if (context?.enterpriseInstallOptions) {
        setEnterpriseInstallOptions(context.enterpriseInstallOptions);
        if (context.enterpriseInstallOptions.licenseKey) {
          setEnterpriseLicenseKey(context.enterpriseInstallOptions.licenseKey);
        }
        if (context.enterpriseInstallOptions.licenseServerUrl) {
          setEnterpriseLicenseServerUrl(getEnterpriseLicenseServerUrl(context.enterpriseInstallOptions.licenseServerUrl));
        }
      }
    }).catch(() => undefined);

    getDesktopUpdateState().then((state) => {
      if (mounted && state) {
        setUpdateState(state);
      }
    }).catch(() => undefined);

    const unsubscribe = subscribeToDesktopUpdates((payload) => {
      if (mounted) {
        setUpdateState(payload);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!desktopSession.token) {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const scheduleRefresh = () => {
      const state = getDesktopAuthState();
      if (!state.token || cancelled) {
        return;
      }

      const validUntilDelay = state.license?.validUntil
        ? new Date(state.license.validUntil).getTime() - Date.now() + 5_000
        : Number.POSITIVE_INFINITY;
      const nextDelay = Math.max(60_000, Math.min(15 * 60_000, Number.isFinite(validUntilDelay) ? validUntilDelay : 15 * 60_000));

      pollTimerRef.current = window.setTimeout(async () => {
        const previousState = getDesktopAuthState();

        try {
          const result = await fetchDesktopLicense();
          if (cancelled) {
            return;
          }

          setDesktopSession(getDesktopAuthState());
          await refetch();

          if (previousState.license?.isPro && !result.license.isPro) {
            setLicenseStatusTone("destructive");
            setLicenseStatusMessage("This account is still connected, but Pro access is no longer active.");
            toast({
              title: "Pro access removed",
              description: "Your PSForge subscription is no longer active on the web account connected to this desktop app.",
              variant: "destructive",
            });
          }
        } catch (error: any) {
          if (cancelled) {
            return;
          }

          setDesktopSession(getDesktopAuthState());
          await refetch();

          const message = String(error?.message || "");
          if (message.includes("401")) {
            setLicenseStatusTone("destructive");
            setLicenseStatusMessage("Desktop license disconnected. Please reconnect your PSForge account.");
            toast({
              title: "License disconnected",
              description: "Your desktop license token was revoked or expired, so Pro access has been removed.",
              variant: "destructive",
            });
            return;
          }
        }

        if (!cancelled) {
          scheduleRefresh();
        }
      }, nextDelay);
    };

    scheduleRefresh();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [desktopSession.token, refetch, toast]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const hasMeaningfulWorkspace = scriptTabs.length > 1 || scriptTabs.some((tab) => tab.script.trim().length > 0);
      const hasDirtyTabs = scriptTabs.some((tab) => tab.script !== tab.lastSavedContent);

      setRecoveryFound(hasDirtyTabs);

      if (!hasMeaningfulWorkspace) {
        removeDesktopStorageItem(RECOVERY_KEY);
        return;
      }

      setDesktopStorageItem(RECOVERY_KEY, JSON.stringify({
        tabs: scriptTabs,
        activeScriptTabId,
        updatedAt: new Date().toISOString(),
      }));
    }, 600);

    return () => window.clearTimeout(handle);
  }, [activeScriptTabId, scriptTabs]);

  const rememberRecentFile = (fileName: string, filePath?: string) => {
    const next = [
      { fileName, filePath, openedAt: new Date().toISOString() },
      ...recentFiles.filter((entry) => entry.filePath !== filePath && entry.fileName !== fileName),
    ].slice(0, 8);

    setRecentFiles(next);
    setDesktopStorageItem(RECENTS_KEY, JSON.stringify(next));
  };

  const updateScriptTab = (tabId: string, updater: (tab: ScriptWorkspaceTab) => ScriptWorkspaceTab) => {
    setScriptTabs((currentTabs) => {
      let changed = false;
      const nextTabs = currentTabs.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }

        const nextTab = updater(tab);
        changed = changed || nextTab !== tab;
        return nextTab;
      });

      return changed ? nextTabs : currentTabs;
    });
  };

  const setActiveScript = (nextScript: string) => {
    if (!activeScriptTab) {
      return;
    }

    updateScriptTab(activeScriptTab.id, (tab) => (
      tab.script === nextScript
        ? tab
        : {
          ...tab,
          script: nextScript,
        }
    ));
  };

  const triggerWorkbenchAction = (type: DesktopWorkbenchActionType) => {
    setActiveWorkspaceTab("script");
    setPendingWorkbenchAction({
      id: Date.now(),
      type,
    });
  };

  const openWorkflowChooserFallback = (notice = "We couldn't preselect this workflow - pick your platform below.") => {
    setSelectedGuiCategory(null);
    setWorkflowTaskHighlights([]);
    setWorkflowSelectedTaskId(null);
    setWorkflowLaunchNotice(notice);
    setWebLibraryFilter("starters");
    setActiveWorkspaceTab("gui");
  };

  const launchWorkflowToBuilder = async (workflowId: string) => {
    if (!visibleUser) {
      setDesktopStorageItem(DESKTOP_WORKFLOW_CONTEXT_KEY, JSON.stringify({ workflowId }));
      setLicenseStatusTone("default");
      setLicenseStatusMessage("Sign in to continue opening this PSForge workflow in the desktop builder.");
      return;
    }

    const result = await fetchPublicWorkflowDefinition(workflowId);
    if (!result.ok) {
      removeDesktopStorageItem(DESKTOP_WORKFLOW_CONTEXT_KEY);
      openWorkflowChooserFallback();
      return;
    }

    const mapping = mapWorkflowToLocalRegistry(result.workflow, hasProAccess);
    const hasPreselectableWorkflow = !!mapping.platform && mapping.validTasks.length > 0;

    if (!hasPreselectableWorkflow) {
      removeDesktopStorageItem(DESKTOP_WORKFLOW_CONTEXT_KEY);
      openWorkflowChooserFallback();
      return;
    }

    setSelectedGuiCategory(mapping.platform!.id);
    setWorkflowTaskHighlights(mapping.validTasks.map((task) => task.id));
    setWorkflowSelectedTaskId(mapping.requiresUpgrade ? null : mapping.validTasks[0].id);
    setWorkflowLaunchNotice(
      mapping.validTasks.length > 1
        ? `${getWorkflowDisplayTitle(result.workflow)} opened. The first task is selected; remaining workflow tasks are highlighted as suggestions.`
        : `${getWorkflowDisplayTitle(result.workflow)} opened in the builder.`,
    );
    setWebLibraryFilter("starters");
    setActiveWorkspaceTab("gui");
    removeDesktopStorageItem(DESKTOP_WORKFLOW_CONTEXT_KEY);

    if (mapping.requiresUpgrade) {
      setWorkflowUpgradeContext({ workflow: result.workflow, mapping });
      setDesktopStorageItem(DESKTOP_POST_UPGRADE_CONTEXT_KEY, JSON.stringify({
        label: getWorkflowDisplayTitle(result.workflow),
      }));
      return;
    }

    toast({
      title: "Workflow opened",
      description: "Review the selected task before generating or running any PowerShell.",
    });
  };

  const handleWorkflowDeepLink = async (payload: DesktopWorkflowDeepLinkPayload) => {
    if (!payload.ok) {
      return;
    }

    await launchWorkflowToBuilder(payload.workflowId);
  };

  useEffect(() => {
    const unsubscribe = subscribeToDesktopWorkflowLinks((payload) => {
      void handleWorkflowDeepLink(payload);
    });

    void getPendingDesktopWorkflowLink().then((payload) => {
      if (payload) {
        void handleWorkflowDeepLink(payload);
      }
    });

    return unsubscribe;
  }, [hasProAccess, visibleUser]);

  useEffect(() => {
    if (!visibleUser) {
      return;
    }

    const storedWorkflowContext = getDesktopStorageItem(DESKTOP_WORKFLOW_CONTEXT_KEY);
    if (!storedWorkflowContext) {
      return;
    }

    try {
      const parsed = JSON.parse(storedWorkflowContext) as { workflowId?: string };
      if (parsed.workflowId) {
        void launchWorkflowToBuilder(parsed.workflowId);
      }
    } catch {
      removeDesktopStorageItem(DESKTOP_WORKFLOW_CONTEXT_KEY);
    }
  }, [hasProAccess, visibleUser]);

  const runWebLibraryRequest = async <T,>(path: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) => {
    if (!cloudStorageEnabled) {
      throw new Error("Cloud storage is not available in PSForge Enterprise.");
    }

    const enterpriseRemoteAuth = enterpriseMode && enterpriseActive;
    const url = enterpriseRemoteAuth ? getEnterpriseRequestUrl(path) : getDesktopRequestUrl(path);
    const headers = {
      ...(enterpriseRemoteAuth ? getEnterpriseAuthHeader() : getDesktopAuthHeader()),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    };

    if (typeof window !== "undefined" && window.psforgeDesktop?.request) {
      const response = await window.psforgeDesktop.request({
        url,
        method: init.method || "GET",
        headers,
        body: init.body,
      });

      if (!response.ok) {
        throw new Error(response.text || `Request failed with status ${response.status}`);
      }

      return response.text ? JSON.parse(response.text) as T : ({} as T);
    }

    const response = await fetch(url, {
      method: init.method || "GET",
      headers,
      body: init.body,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.status === 204 ? ({} as T) : await response.json() as T;
  };

  const readCachedWebLibraryScripts = () => {
    const cached = getDesktopStorageItem(WEB_LIBRARY_CACHE_KEY);
    if (!cached) {
      return [];
    }

    try {
      const parsed = JSON.parse(cached) as { scripts?: WebLibraryScript[] };
      return Array.isArray(parsed.scripts) ? parsed.scripts : [];
    } catch {
      return [];
    }
  };

  const loadWebLibraryScripts = async () => {
    if (!cloudStorageEnabled) {
      setWebLibraryScripts([]);
      setWebLibraryFromCache(false);
      setWebLibraryError(null);
      return;
    }

    if (!getDesktopAuthState().token) {
      const cachedScripts = readCachedWebLibraryScripts();
      setWebLibraryScripts(cachedScripts);
      setWebLibraryFromCache(cachedScripts.length > 0);
      setWebLibraryError(cachedScripts.length > 0
        ? "Showing the last cached web Library. Connect your account to refresh it."
        : "Connect your PSForge web account to sync scripts created in the browser.");
      return;
    }

    setWebLibraryLoading(true);
    setWebLibraryError(null);

    try {
      const scripts = await runWebLibraryRequest<WebLibraryScript[]>("/api/scripts/user/me");
      setWebLibraryScripts(scripts);
      setWebLibraryFromCache(false);
      setDesktopStorageItem(WEB_LIBRARY_CACHE_KEY, JSON.stringify({
        cachedAt: new Date().toISOString(),
        scripts,
      }));
    } catch (error) {
      const cachedScripts = readCachedWebLibraryScripts();
      if (cachedScripts.length > 0) {
        setWebLibraryScripts(cachedScripts);
        setWebLibraryFromCache(true);
        setWebLibraryError("Could not refresh web scripts. Showing the last cached Library.");
      } else {
        setWebLibraryError(error instanceof Error ? error.message : "Could not load your web scripts.");
      }
    } finally {
      setWebLibraryLoading(false);
    }
  };

  const recordWebLibraryAccess = async (scriptId: string) => {
    if (!cloudStorageEnabled) {
      return;
    }

    try {
      await runWebLibraryRequest(`/api/scripts/${scriptId}/access`, { method: "PATCH" });
    } catch {
      // Access tracking should never block opening the script locally.
    }
  };

  const openWebLibraryScript = (script: WebLibraryScript) => {
    const fileName = script.name.toLowerCase().endsWith(".ps1") ? script.name : `${script.name}.ps1`;
    const nextTab = createWorkspaceTab({
      fileName,
      script: script.content || "",
      lastSavedContent: script.content || "",
      webScriptId: script.id,
      webScriptName: script.name,
      webScriptDescription: script.description || null,
      webScriptSyncedContent: script.content || "",
      webScriptLastSyncedAt: new Date().toISOString(),
    });

    setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveScriptTabId(nextTab.id);
    setActiveWorkspaceTab("script");
    rememberRecentFile(fileName);
    void recordWebLibraryAccess(script.id);

    toast({
      title: "Web script opened",
      description: `${script.name} is ready to edit locally.`,
    });
  };

  const saveActiveWebScript = async (force = false) => {
    if (!activeScriptTab?.webScriptId) {
      return;
    }

    if (!cloudStorageEnabled) {
      toast({
        title: "Cloud storage unavailable",
        description: "PSForge Enterprise keeps scripts local and disables web Library sync.",
        variant: "destructive",
      });
      return;
    }

    if (!getDesktopAuthState().token) {
      setAccountDialogOpen(true);
      toast({
        title: "Account connection required",
        description: "Connect your PSForge web account before saving this script back to Library.",
        variant: "destructive",
      });
      return;
    }

    try {
      const remoteScript = await runWebLibraryRequest<WebLibraryScript>(`/api/scripts/${activeScriptTab.webScriptId}`);
      const lastSyncedContent = activeScriptTab.webScriptSyncedContent || "";
      const remoteContent = remoteScript.content || "";

      if (!force && remoteContent !== lastSyncedContent && activeScriptTab.script !== remoteContent) {
        setWebScriptConflict({
          tabId: activeScriptTab.id,
          remoteScript,
        });
        return;
      }

      const updated = await runWebLibraryRequest<WebLibraryScript>(`/api/scripts/${activeScriptTab.webScriptId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: activeScriptTab.webScriptName || activeScriptTab.fileName.replace(/\.ps1$/i, ""),
          description: activeScriptTab.webScriptDescription || remoteScript.description || undefined,
          content: activeScriptTab.script,
        }),
      });

      const syncedAt = new Date().toISOString();
      updateScriptTab(activeScriptTab.id, (tab) => ({
        ...tab,
        webScriptName: updated.name || tab.webScriptName,
        webScriptDescription: updated.description ?? tab.webScriptDescription,
        webScriptSyncedContent: updated.content || tab.script,
        webScriptLastSyncedAt: syncedAt,
        lastSavedContent: tab.filePath ? tab.lastSavedContent : tab.script,
      }));
      setWebLibraryScripts((scripts) => scripts.map((script) => (script.id === updated.id ? { ...script, ...updated } : script)));

      toast({
        title: "Saved to web Library",
        description: `${updated.name || activeScriptTab.fileName} is synced with PSForge web.`,
      });
    } catch (error) {
      toast({
        title: "Web save failed",
        description: error instanceof Error ? error.message : "Could not save this script to the web Library.",
        variant: "destructive",
      });
    }
  };

  const resolveWebScriptConflict = (action: "keep-desktop" | "use-web" | "open-both") => {
    if (!webScriptConflict) {
      return;
    }

    const tab = scriptTabs.find((currentTab) => currentTab.id === webScriptConflict.tabId);
    if (!tab) {
      setWebScriptConflict(null);
      return;
    }

    if (action === "use-web") {
      updateScriptTab(tab.id, (currentTab) => ({
        ...currentTab,
        script: webScriptConflict.remoteScript.content || "",
        lastSavedContent: currentTab.filePath ? currentTab.lastSavedContent : webScriptConflict.remoteScript.content || "",
        webScriptName: webScriptConflict.remoteScript.name,
        webScriptDescription: webScriptConflict.remoteScript.description || null,
        webScriptSyncedContent: webScriptConflict.remoteScript.content || "",
        webScriptLastSyncedAt: new Date().toISOString(),
      }));
      setWebScriptConflict(null);
      toast({
        title: "Web copy loaded",
        description: "The desktop tab now matches the latest web Library version.",
      });
      return;
    }

    if (action === "open-both") {
      const nextTab = createWorkspaceTab({
        fileName: `${webScriptConflict.remoteScript.name.replace(/\.ps1$/i, "")} - Web.ps1`,
        script: webScriptConflict.remoteScript.content || "",
        lastSavedContent: webScriptConflict.remoteScript.content || "",
        webScriptId: webScriptConflict.remoteScript.id,
        webScriptName: webScriptConflict.remoteScript.name,
        webScriptDescription: webScriptConflict.remoteScript.description || null,
        webScriptSyncedContent: webScriptConflict.remoteScript.content || "",
        webScriptLastSyncedAt: new Date().toISOString(),
      });
      setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
      setActiveScriptTabId(nextTab.id);
      setActiveWorkspaceTab("script");
      setWebScriptConflict(null);
      toast({
        title: "Opened both versions",
        description: "The latest web copy is open in a separate tab.",
      });
      return;
    }

    setWebScriptConflict(null);
    void saveActiveWebScript(true);
  };

  const startStarterWorkflow = (workflow: StarterWorkflow) => {
    const nextTab = createWorkspaceTab({
      fileName: `${workflow.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}.ps1`,
      script: workflow.script,
      lastSavedContent: "",
    });

    setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveScriptTabId(nextTab.id);
    setActiveWorkspaceTab("script");
    setStarterWorkflowPreview(null);
    setConversionState((current) => {
      const next = {
        ...current,
        starterWorkflowRuns: current.starterWorkflowRuns + 1,
      };
      setDesktopStorageItem(CONVERSION_STATE_KEY, JSON.stringify(next));
      return next;
    });
    toast({
      title: `${workflow.title} loaded`,
      description: "A fresh starter script was opened in a new tab.",
    });
  };

  const createNewScriptTab = () => {
    const nextTab = createWorkspaceTab({
      fileName: getNextUntitledName(scriptTabs),
    });

    setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveScriptTabId(nextTab.id);
    setActiveWorkspaceTab("script");
  };

  const persistGuidedProfile = (nextProfile: DesktopGuidedProfile) => {
    setGuidedProfile(nextProfile);
  };

  const incrementConversionState = (updates: Partial<DesktopConversionState>) => {
    setConversionState((current) => {
      const next = {
        appLaunches: current.appLaunches + (updates.appLaunches || 0),
        starterWorkflowRuns: current.starterWorkflowRuns + (updates.starterWorkflowRuns || 0),
      };
      setDesktopStorageItem(CONVERSION_STATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openGuidedOnboarding = () => {
    const startingFocus = currentGuidedProfile?.focusId || guidedFocusDraftId || DESKTOP_GUIDED_FOCUSES[0].id;
    const startingWorkflow = currentGuidedProfile?.workflowId || getDesktopGuidedFocus(startingFocus).workflows[0].id;
    setGuidedFocusDraftId(startingFocus);
    setGuidedWorkflowDraftId(startingWorkflow);
    setGuidedOnboardingOpen(true);
  };

  const seedScriptForWorkflow = (workflowTitle: string, seedScript?: string) => {
    if (!seedScript) {
      return;
    }

    if (activeScriptTab && activeScriptTab.script.trim().length === 0 && !activeScriptTab.filePath) {
      updateScriptTab(activeScriptTab.id, (tab) => ({
        ...tab,
        script: seedScript,
      }));
      return;
    }

    const nextTab = createWorkspaceTab({
      fileName: getNextUntitledName(scriptTabs),
      script: seedScript,
      lastSavedContent: "",
    });

    setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveScriptTabId(nextTab.id);
    toast({
      title: `${workflowTitle} starter loaded`,
      description: "A fresh starter script was opened in a new tab.",
    });
  };

  const startGuidedWorkflow = (workflowId: string, focusId = currentGuidedProfile?.focusId || guidedFocusDraftId) => {
    const workflow = getDesktopGuidedWorkflow(focusId, workflowId);
    const nextProfile: DesktopGuidedProfile = {
      focusId,
      workflowId: workflow.id,
      completedAt: currentGuidedProfile?.completedAt || new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    persistGuidedProfile(nextProfile);
    setGuidedOnboardingOpen(false);

    if (workflow.premium && !hasProAccess) {
      setGuidedUpgradeWorkflowId(workflow.id);
      return;
    }

    if (!workflow.premium) {
      const previousRuns = conversionState.starterWorkflowRuns;
      incrementConversionState({ starterWorkflowRuns: 1 });
      if (previousRuns === 0) {
        toast({
          title: "Starter workflow ready",
          description: "You can keep building for free here, or unlock Pro if you want AI to finish the heavier lifting faster.",
        });
      } else if (previousRuns === 2) {
        toast({
          title: "You're building momentum",
          description: "PSForge Pro can take these repeated starter workflows and turn them into finished automation much faster.",
        });
      }
    }

    if (workflow.categoryId) {
      setSelectedGuiCategory(workflow.categoryId);
    }

    if (workflow.seedScript) {
      seedScriptForWorkflow(workflow.title, workflow.seedScript);
    }

    setActiveWorkspaceTab(workflow.tab);
    toast({
      title: workflow.title,
      description: workflow.description,
    });
  };

  const handleCompleteGuidedOnboarding = () => {
    startGuidedWorkflow(guidedDraftWorkflow.id, guidedDraftFocus.id);
  };

  const closeScriptTab = (tabId: string) => {
    setScriptTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
      if (nextTabs.length === 0) {
        const fallback = createWorkspaceTab();
        setActiveScriptTabId(fallback.id);
        return [fallback];
      }

      if (activeScriptTabId === tabId) {
        const closingIndex = currentTabs.findIndex((tab) => tab.id === tabId);
        const nextActiveTab = nextTabs[Math.max(0, Math.min(closingIndex, nextTabs.length - 1))];
        setActiveScriptTabId(nextActiveTab.id);
      }

      return nextTabs;
    });
  };

  const requestCloseScriptTab = (tabId: string) => {
    const tab = scriptTabs.find((entry) => entry.id === tabId);
    if (!tab) {
      return;
    }

    const isDirty = tab.script !== tab.lastSavedContent;
    if (isDirty) {
      setPendingTabCloseId(tabId);
      return;
    }

    closeScriptTab(tabId);
  };

  const saveScriptTab = async (tabId: string, forceSaveAs = false) => {
    const tab = scriptTabs.find((entry) => entry.id === tabId);
    if (!tab) {
      return false;
    }

    const preflight = analyzeScriptWorkbench(tab.script);
    const notableIssues = preflight.issues.filter((issue) => issue.severity === "critical" || issue.severity === "warning");
    if (notableIssues.length > 0) {
      toast({
        title: "Pre-flight note before save",
        description: `${notableIssues.length} issue${notableIssues.length === 1 ? "" : "s"} still appear in this script. PSForge saved it locally, but review the Workbench tab before sharing or running it.`,
      });
    }

    const result = !forceSaveAs && tab.filePath
      ? await writeDesktopScriptFile(tab.filePath, tab.script)
      : await saveDesktopScript(tab.script, tab.fileName);

    if (!result || result.canceled) {
      return false;
    }

    const savedFileName = result.fileName || tab.fileName;
    updateScriptTab(tabId, (currentTab) => ({
      ...currentTab,
      fileName: savedFileName,
      filePath: result.filePath || currentTab.filePath,
      lastSavedContent: currentTab.script,
    }));

    rememberRecentFile(savedFileName, result.filePath || tab.filePath);

    toast({
      title: forceSaveAs || !tab.filePath ? "Saved locally" : "Saved",
      description: `${savedFileName} was saved to your computer.`,
    });
    void trackDesktopAnalyticsEvent("desktop_script_saved_local");

    return true;
  };

  const handleOpenScript = async () => {
    const file = await openDesktopScript();
    if (!file || file.canceled) {
      return;
    }

    const existingTab = file.filePath
      ? scriptTabs.find((tab) => tab.filePath?.toLowerCase() === file.filePath?.toLowerCase())
      : null;

    if (existingTab) {
      setActiveScriptTabId(existingTab.id);
      toast({
        title: "Script already open",
        description: `${existingTab.fileName} is already open in another tab.`,
      });
      return;
    }

    const nextTab = createWorkspaceTab({
      fileName: file.fileName || "script.ps1",
      filePath: file.filePath,
      script: file.content || "",
      lastSavedContent: file.content || "",
    });

    setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveScriptTabId(nextTab.id);
    setRecoveryFound(false);
    setActiveWorkspaceTab("script");
    rememberRecentFile(file.fileName || "script.ps1", file.filePath);

    toast({
      title: "Script opened",
      description: `${file.fileName || "Script"} is ready to edit.`,
    });
  };

  const handleSaveScript = async () => {
    if (!activeScriptTab) {
      return false;
    }

    const saved = await saveScriptTab(activeScriptTab.id);
    return saved;
  };

  const handleSaveAs = async () => {
    if (!activeScriptTab) {
      return false;
    }

    const saved = await saveScriptTab(activeScriptTab.id, true);
    return saved;
  };

  const clearRecovery = () => {
    removeDesktopStorageItem(RECOVERY_KEY);
    setRecoveryFound(false);
    toast({
      title: "Recovery cleared",
      description: "The cached recovery draft has been cleared.",
    });
  };

  const handleEnterpriseActivation = async (keyOverride?: string, serverOverride?: string | null) => {
    const licenseKey = keyOverride || enterpriseLicenseKey;
    const licenseServerUrl = serverOverride || enterpriseLicenseServerUrl;

    setEnterpriseActivationLoading(true);
    setEnterpriseActivationMessage(null);
    try {
      const record = await activateEnterpriseLicense({
        licenseKey,
        licenseServerUrl,
      });
      setEnterpriseLicense(record);
      setEnterpriseLicenseKey("");
      setEnterpriseActivationMessage(`Activated ${record.plan || "PSForge Enterprise"}${record.organizationName ? ` for ${record.organizationName}` : ""}.`);
      await queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      toast({
        title: "Enterprise activated",
        description: "PSForge Enterprise is ready with all desktop features enabled.",
      });
    } catch (error: any) {
      const message = error?.message || "Enterprise activation failed.";
      setEnterpriseActivationMessage(message);
      toast({
        title: "Enterprise activation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setEnterpriseActivationLoading(false);
    }
  };

  const handleDesktopSignIn = async () => {
    setDesktopSignInLoading(true);
    setLicenseStatusMessage(null);
    setLicenseStatusTone("default");
    try {
      const result = (user || desktopSession.token)
        ? await fetchDesktopLicense()
        : await desktopSignInWithPassword(licenseEmail, licensePassword);
      setDesktopSession(getDesktopAuthState());
      await queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      setLicensePassword("");
      setLicenseStatusMessage(
        result.license.isPro
          ? `Connected to ${result.license.plan || "PSForge"}`
          : "License connected, but this account does not currently have Pro desktop access.",
      );
      setLicenseStatusTone(result.license.isPro ? "default" : "destructive");
      toast({
        title: result.license.isPro ? "License connected" : "License connected with free access",
        description: result.license.isPro
          ? "Your desktop app is now linked to your PSForge Pro account."
          : "This account is signed in, but a Pro subscription is required for full desktop features.",
      });
      void flushDesktopAnalytics();
    } catch (error: any) {
      setDesktopSignInLoading(false);
      setLicenseStatusMessage(error.message || "Please try again.");
      setLicenseStatusTone("destructive");
      toast({
        title: "License sign-in failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setDesktopSignInLoading(false);
  };

  const resetDesktopRegistrationForm = () => {
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterPasswordConfirm("");
  };

  const handleCopyTrialCode = async () => {
    try {
      await navigator.clipboard.writeText(DESKTOP_FREE_TRIAL_PROMO_CODE);
      setTrialCodeCopied(true);
      window.setTimeout(() => setTrialCodeCopied(false), 2000);
      toast({
        title: "Promo code copied",
        description: "Paste FREE30 into Stripe checkout to start the 30-day Pro trial.",
      });
    } catch (error: any) {
      toast({
        title: "Could not copy promo code",
        description: error?.message || "Please copy FREE30 manually.",
        variant: "destructive",
      });
    }
  };

  const scheduleProAccessRefresh = (attempt = 0) => {
    if (checkoutRefreshTimerRef.current) {
      window.clearTimeout(checkoutRefreshTimerRef.current);
      checkoutRefreshTimerRef.current = null;
    }

    checkoutRefreshTimerRef.current = window.setTimeout(async () => {
      try {
        const result = await fetchDesktopLicense();
        setDesktopSession(getDesktopAuthState());
        await refetch();

        if (result.license.isPro) {
          const upgradeContext = getDesktopStorageItem(DESKTOP_POST_UPGRADE_CONTEXT_KEY);
          let contextLabel = "your workflow";
          if (upgradeContext) {
            try {
              const parsed = JSON.parse(upgradeContext) as { label?: string };
              contextLabel = parsed.label || contextLabel;
            } catch {
              contextLabel = "your workflow";
            }
            removeDesktopStorageItem(DESKTOP_POST_UPGRADE_CONTEXT_KEY);
          }

          setLicenseStatusTone("default");
          setLicenseStatusMessage(`PSForge Pro is active on this desktop app via ${result.license.plan || "your subscription"}. Continue with ${contextLabel}.`);
          toast({
            title: "PSForge Pro activated",
            description: `${contextLabel} is ready to continue with Pro features enabled.`,
          });
          return;
        }
      } catch {
        // Ignore transient polling errors and allow the next attempt.
      }

      if (attempt < 7) {
        scheduleProAccessRefresh(attempt + 1);
      }
    }, 15_000);
  };

  const handleDesktopRegister = async () => {
    const trimmedName = registerName.trim();
    const trimmedEmail = registerEmail.trim();

    if (!trimmedName || !trimmedEmail || !registerPassword.trim()) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage("Name, email, and password are required to create your PSForge account.");
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage("The confirmation password does not match.");
      return;
    }

    setDesktopRegisterLoading(true);
    setLicenseStatusMessage(null);
    setLicenseStatusTone("default");

    try {
      const result = await desktopRegisterAccount(trimmedName, trimmedEmail, registerPassword);
      setDesktopSession(getDesktopAuthState());
      await queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      await refetch();
      setLicenseEmail(result.user.email);
      setLicensePassword("");
      setAccountDialogOpen(false);
      void flushDesktopAnalytics();
      resetDesktopRegistrationForm();
      setLicenseStatusMessage(
        result.license.isPro
          ? `Account created and connected to ${result.license.plan || "PSForge Pro"}.`
          : "Account created. You’re signed in with free access and can upgrade to PSForge Pro any time.",
      );
      setLicenseStatusTone("default");
      toast({
        title: "Account created",
        description: result.license.isPro
          ? "Your new PSForge account is connected and Pro access is ready."
          : "Your new PSForge account is connected. Upgrade securely to PSForge Pro when you’re ready.",
      });
    } catch (error: any) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage(error?.message || "Could not create the PSForge account.");
      toast({
        title: "Account creation failed",
        description: error?.message || "Could not create the PSForge account.",
        variant: "destructive",
      });
    } finally {
      setDesktopRegisterLoading(false);
    }
  };

  const handleDesktopSignOut = async () => {
    setDesktopSignOutLoading(true);
    try {
      if (checkoutRefreshTimerRef.current) {
        window.clearTimeout(checkoutRefreshTimerRef.current);
        checkoutRefreshTimerRef.current = null;
      }
      await logout();
      setDesktopSession(getDesktopAuthState());
      setLicenseEmail("");
      setLicensePassword("");
      setLicenseStatusMessage(null);
      setLicenseStatusTone("default");
      toast({
        title: "License disconnected",
        description: "This desktop app is no longer linked to your PSForge account.",
      });
    } catch (error: any) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage(error?.message || "Could not disconnect the desktop license.");
      toast({
        title: "Disconnect failed",
        description: error?.message || "Could not disconnect the desktop license.",
        variant: "destructive",
      });
    } finally {
      setDesktopSignOutLoading(false);
    }
  };

  const handleUpgradeToPro = async (contextLabel = currentGuidedWorkflow?.title || "PSForge Pro trial") => {
    if (!visibleUser) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage("Sign in first, then start the secure PSForge Pro checkout.");
      return;
    }

    setBillingActionLoading("checkout");
    try {
      setDesktopStorageItem(
        DESKTOP_POST_UPGRADE_CONTEXT_KEY,
        JSON.stringify({
          label: contextLabel,
          startedAt: new Date().toISOString(),
        }),
      );
      const { url } = await createDesktopBillingCheckout();
      await openExternalUrl(url);
      setLicenseStatusTone("default");
      setLicenseStatusMessage("Secure Stripe checkout opened in your browser. Copy promo code FREE30 and paste it into Stripe checkout to start your 30-day Pro trial.");
      toast({
        title: "Secure checkout opened",
        description: `Finish the recurring PSForge Pro subscription in your browser, use promo code FREE30 at checkout, and then continue with ${contextLabel}.`,
      });
      scheduleProAccessRefresh();
    } catch (error: any) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage(error?.message || "Could not start the secure checkout.");
      toast({
        title: "Checkout unavailable",
        description: error?.message || "Could not start the secure checkout.",
        variant: "destructive",
      });
    } finally {
      setBillingActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!visibleUser) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage("Sign in first to manage your PSForge subscription.");
      return;
    }

    setBillingActionLoading("portal");
    try {
      const { url } = await createDesktopBillingPortal();
      await openExternalUrl(url);
      toast({
        title: "Subscription portal opened",
        description: "Your secure Stripe billing portal is open in your browser.",
      });
    } catch (error: any) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage(error?.message || "Could not open the subscription portal.");
      toast({
        title: "Subscription portal unavailable",
        description: error?.message || "Could not open the subscription portal.",
        variant: "destructive",
      });
    } finally {
      setBillingActionLoading(null);
    }
  };

  const handleCheckForUpdates = async () => {
    if (updateState.state === "downloaded") {
      await installDesktopUpdate();
      void trackDesktopAnalyticsEvent("desktop_update_installed");
      return;
    }

    const nextState = await checkForDesktopUpdates();
    void trackDesktopAnalyticsEvent("desktop_update_checked");
    if (nextState) {
      setUpdateState(nextState);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToDesktopMenuActions((action) => {
      switch (action) {
        case "file:new":
          createNewScriptTab();
          break;
        case "file:open":
          void handleOpenScript();
          break;
        case "file:save":
          void handleSaveScript();
          break;
        case "file:save-as":
          void handleSaveAs();
          break;
        case "file:recent":
          setAppSettingsView("recent");
          break;
        case "settings:license":
          setAppSettingsView("license");
          break;
        case "settings:subscription":
          setAppSettingsView("subscription");
          break;
        case "settings:recovery":
          setAppSettingsView("recovery");
          break;
        case "settings:check-updates":
          void handleCheckForUpdates();
          break;
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [createNewScriptTab, handleOpenScript, handleSaveAs, handleSaveScript]);

  const pendingCloseTab = pendingTabCloseId
    ? scriptTabs.find((tab) => tab.id === pendingTabCloseId) || null
    : null;

  const accountDialog = (
    <Dialog
      open={accountDialogOpen}
      onOpenChange={(open) => {
        setAccountDialogOpen(open);
        if (!open) {
          resetDesktopRegistrationForm();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create your PSForge account</DialogTitle>
          <DialogDescription>
            Create a free PSForge account here, then upgrade securely to PSForge Pro with Stripe whenever you want premium desktop features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="desktop-register-name">Name</Label>
            <Input
              id="desktop-register-name"
              value={registerName}
              onChange={(event) => setRegisterName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desktop-register-email">Email</Label>
            <Input
              id="desktop-register-email"
              type="email"
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desktop-register-password">Password</Label>
            <Input
              id="desktop-register-password"
              type="password"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desktop-register-password-confirm">Confirm Password</Label>
            <Input
              id="desktop-register-password-confirm"
              type="password"
              value={registerPasswordConfirm}
              onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
              placeholder="Re-enter your password"
            />
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            Your account is stored and licensed through the PSForge web platform. This desktop app will connect to it immediately after creation.
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setAccountDialogOpen(false)} disabled={desktopRegisterLoading}>
            Cancel
          </Button>
          <Button onClick={handleDesktopRegister} disabled={desktopRegisterLoading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {desktopRegisterLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const handleOpenRecentFileLocation = async (filePath?: string) => {
    if (!filePath) {
      return;
    }

    await openDesktopPath(filePath);
  };

  const appSettingsDialogMeta: Record<Exclude<AppSettingsView, null>, { title: string; description: string }> = {
    license: {
      title: enterpriseMode ? "Enterprise License" : "Account & License",
      description: enterpriseMode
        ? "Review the activated Enterprise product key for this Windows app."
        : "Connect this Windows app to your PSForge account and refresh desktop access.",
    },
    subscription: {
      title: enterpriseMode ? "Enterprise Plan" : "Subscription & Billing",
      description: enterpriseMode
        ? "Enterprise builds unlock the full PSForge desktop feature set through product-key activation."
        : "Manage PSForge Pro access and secure Stripe-hosted billing actions.",
    },
    recovery: {
      title: "Workspace Recovery",
      description: "Review the local recovery cache that protects unsaved desktop work.",
    },
    recent: {
      title: "Recent Files",
      description: "Review the PowerShell files this desktop workspace has opened recently.",
    },
  };

  const renderAppSettingsContent = () => {
    switch (appSettingsView) {
      case "license":
        if (enterpriseMode) {
          return (
            <div className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="font-medium text-foreground">PSForge Enterprise is activated</div>
                <div className="mt-1 text-muted-foreground">
                  {enterpriseLicense?.organizationName || "Enterprise license"} has access to every desktop workflow and capability in this 2.0.2 build.
                </div>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div>Plan: {enterpriseLicense?.plan || "PSForge Enterprise"}</div>
                <div>Status: {enterpriseLicense?.status || "active"}</div>
                {enterpriseLicense?.licenseKeySuffix ? <div>Product key ending: {enterpriseLicense.licenseKeySuffix}</div> : null}
                {enterpriseLicense?.validUntil ? <div>Valid until: {new Date(enterpriseLicense.validUntil).toLocaleString()}</div> : null}
              </div>
              {enterpriseActivationMessage && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {enterpriseActivationMessage}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => void validateEnterpriseLicense(enterpriseLicenseServerUrl).then((record) => {
                  if (record) {
                    setEnterpriseLicense(record);
                    setEnterpriseActivationMessage("Enterprise license refreshed.");
                  }
                }).catch((error: any) => setEnterpriseActivationMessage(error?.message || "Enterprise license refresh failed."))}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Enterprise License
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {visibleUser ? `Signed in as ${visibleUser.email}` : "Not signed in yet."}
            </div>
            {cachedLicense?.validUntil && (
              <div className="text-xs text-muted-foreground">
                License valid until {new Date(cachedLicense.validUntil).toLocaleString()}
              </div>
            )}
            {visibleUser && !hasProAccess && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                This account is connected, but it does not currently have an active Pro desktop license.
              </div>
            )}
            {!user && visibleUser && (
              <div className="rounded-md border bg-primary/5 p-3 text-xs text-muted-foreground">
                Saved desktop license found. Revalidating it with PSForge now.
              </div>
            )}
            {!visibleUser && (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  License activation is handled by your PSForge web account at {getDesktopApiBaseUrl()}.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desktop-license-email">Email</Label>
                  <Input
                    id="desktop-license-email"
                    type="email"
                    value={licenseEmail}
                    onChange={(e) => setLicenseEmail(e.target.value)}
                    placeholder="you@psforge.app"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desktop-license-password">Password</Label>
                  <Input
                    id="desktop-license-password"
                    type="password"
                    value={licensePassword}
                    onChange={(e) => setLicensePassword(e.target.value)}
                    placeholder="Enter your PSForge password"
                  />
                </div>
              </>
            )}
            {licenseStatusMessage && (
              <div className={`rounded-md border p-3 text-sm ${
                licenseStatusTone === "destructive"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/20 bg-primary/10 text-foreground"
              }`}>
                {licenseStatusMessage}
              </div>
            )}
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={handleDesktopSignIn}
                disabled={desktopSignInLoading || desktopSignOutLoading || (!visibleUser && (!licenseEmail.trim() || !licensePassword.trim()))}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {desktopSignInLoading ? "Connecting..." : visibleUser ? "Refresh License" : "Connect License"}
              </Button>
              {visibleUser ? (
                <Button
                  variant="ghost"
                  onClick={handleDesktopSignOut}
                  disabled={desktopSignInLoading || desktopSignOutLoading}
                >
                  {desktopSignOutLoading ? "Disconnecting..." : "Disconnect License"}
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setAccountDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              )}
              <Button variant="ghost" onClick={() => openExternalUrl(getDesktopApiBaseUrl())}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit PSForge Website
              </Button>
            </div>
          </div>
        );
      case "subscription":
        if (enterpriseMode) {
          return (
            <div className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                This Enterprise build removes PSForge account sign-in and Stripe billing from the desktop app. Product-key activation grants access to all local desktop features.
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                License renewals, seat limits, revocation, offline grace periods, and audit history should be managed by the Enterprise license service endpoint.
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Free tier includes the local editor, script tabs, save/open, recovery cache, and core desktop scripting workflow.
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Pro adds AI-assisted scripting, premium automation features, and advanced PSForge workflows. Billing and renewals happen in secure Stripe-hosted pages opened in your browser.
            </div>
            {visibleUser ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {hasProAccess ? `Current plan: ${cachedLicense?.plan || "PSForge Pro"}` : "Current plan: Free tier"}
                </div>
                {!hasProAccess && (
                  <div className="space-y-2">
                    <Label htmlFor="desktop-promo-code">Promo Code</Label>
                    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                      <Input
                        id="desktop-promo-code"
                        value={DESKTOP_FREE_TRIAL_PROMO_CODE}
                        readOnly
                        className="max-w-[160px] font-mono"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyTrialCode()}>
                        <Copy className="mr-2 h-4 w-4" />
                        {trialCodeCopied ? "Copied" : "Copy code"}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Copy FREE30 here, then paste it into Stripe checkout to start the 30-day Pro trial.
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  {!hasProAccess && (
                    <Button onClick={() => void handleUpgradeToPro("PSForge Pro trial")} disabled={billingActionLoading !== null}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {billingActionLoading === "checkout" ? "Opening Secure Checkout..." : "Start 30-Day Pro Trial"}
                    </Button>
                  )}
                  <Button
                    variant={hasProAccess ? "outline" : "ghost"}
                    onClick={handleManageSubscription}
                    disabled={billingActionLoading !== null || !visibleUser}
                  >
                    {billingActionLoading === "portal" ? "Opening Subscription Portal..." : "Manage Subscription"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                Sign in or create an account first. Once connected, you can upgrade securely to PSForge Pro from this desktop app.
              </div>
            )}
          </div>
        );
      case "recovery":
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {recoveryFound ? "A recovery draft is currently loaded." : "No unsaved recovery draft is active."}
            </div>
            <Button variant="ghost" onClick={clearRecovery} disabled={!recoveryFound}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Clear Recovery Cache
            </Button>
          </div>
        );
      case "recent":
        return (
          <div className="space-y-3">
            {recentFiles.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent files yet.</div>
            ) : (
              recentFiles.map((entry) => (
                <div key={`${entry.fileName}-${entry.openedAt}`} className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{entry.fileName}</span>
                  </div>
                  {entry.filePath && (
                    <div className="mt-1 break-all text-xs text-muted-foreground">{entry.filePath}</div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last opened {new Date(entry.openedAt).toLocaleString()}
                  </div>
                  {entry.filePath && (
                    <div className="mt-3">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenRecentFileLocation(entry.filePath)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in Windows
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (enterpriseMode && !enterpriseActive) {
    const silentActivation = enterpriseInstallOptions?.silent && enterpriseInstallOptions.licenseKey;

    return (
      <div className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
          <div className="grid w-full gap-6 lg:grid-cols-[1fr_420px]">
            <div className="flex flex-col justify-center">
              <img src={logoImage} alt="PSForge" className="mb-8 h-16 w-fit" />
              <Badge variant="outline" className="mb-4 w-fit">
                PSForge Enterprise 2.0.2
              </Badge>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight">
                Activate your Enterprise license to open PSForge.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                This build removes PSForge account sign-in and unlocks every desktop workflow after product-key activation.
              </p>
              <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-md border bg-muted/20 p-3">All 2.0.2 features retained</div>
                <div className="rounded-md border bg-muted/20 p-3">No user sign-in required</div>
                <div className="rounded-md border bg-muted/20 p-3">Silent deployment ready</div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <CardTitle>Product Key Activation</CardTitle>
                </div>
                <CardDescription>
                  Enter a PSForge Enterprise product key. IT deployments can pass the same key with installation or launch parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {silentActivation ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Silent activation is running from enterprise deployment parameters.
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="enterprise-license-key">Enterprise Product Key</Label>
                  <Input
                    id="enterprise-license-key"
                    value={enterpriseLicenseKey}
                    onChange={(event) => setEnterpriseLicenseKey(event.target.value)}
                    placeholder="PSF-ENT-XXXX-XXXX-XXXX"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enterprise-license-server">License Server URL</Label>
                  <Input
                    id="enterprise-license-server"
                    value={enterpriseLicenseServerUrl}
                    onChange={(event) => setEnterpriseLicenseServerUrl(event.target.value)}
                    placeholder="https://psforge.app"
                  />
                </div>
                {enterpriseActivationMessage ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {enterpriseActivationMessage}
                  </div>
                ) : null}
                <Button
                  className="w-full"
                  onClick={() => void handleEnterpriseActivation()}
                  disabled={enterpriseActivationLoading || !enterpriseLicenseKey.trim()}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {enterpriseActivationLoading ? "Activating..." : "Activate Enterprise"}
                </Button>
                <div className="text-xs text-muted-foreground">
                  Deployment example: <code>PSForge Enterprise.exe --enterprise-license-key=PSF-ENT-... --enterprise-silent</code>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!visibleUser) {
    return (
      <>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">
              <div className="min-w-0">
                <img
                  src={logoImage}
                  alt="PSForge"
                  className="h-20 w-auto max-w-[360px] object-contain object-left sm:h-24 sm:max-w-[440px] 2xl:h-28 2xl:max-w-[560px]"
                />
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>PowerShell Automation Workspace for Windows</span>
                  <Badge variant="outline">v{desktopVersion}</Badge>
                </div>
              </div>
            </div>
          </div>

        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-3xl overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">Sign in to use PSForge Desktop</CardTitle>
                    <CardDescription>
                      A PSForge account is required to open the desktop workspace. Your web account also controls Pro feature access.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Account required</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-5">
                    <div className="text-base font-semibold">What this sign-in does</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      PSForge Desktop uses your PSForge account as the identity and license source for this Windows installation.
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                      <div className="rounded-md border bg-background/60 p-3">Connects the desktop app to your PSForge account.</div>
                      <div className="rounded-md border bg-background/60 p-3">Unlocks Pro features automatically when your web subscription is active.</div>
                      <div className="rounded-md border bg-background/60 p-3">Keeps desktop access in sync if your subscription changes on the website.</div>
                    </div>
                  </div>
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <CreditCard className="h-4 w-4 text-primary" />
                      PSForge Pro subscription
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      PSForge Pro is a paid recurring subscription. Purchases and renewals are processed securely through Stripe-hosted checkout tied to your PSForge account.
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <div className="rounded-md border bg-background/60 p-3">Free tier: local editor, script tabs, file saves, recovery, and core desktop workflow.</div>
                      <div className="rounded-md border bg-background/60 p-3">Pro tier: AI tools, premium automation features, and advanced PSForge workflows.</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setAccountDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account in App
                    </Button>
                    <Button variant="ghost" onClick={() => openExternalUrl(getDesktopApiBaseUrl())}>
                      Visit PSForge Website
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    You can create a new PSForge account here, or visit the website for plan details and support resources.
                  </div>
                </div>

                <div className="space-y-4">
                  {isRevalidatingStoredSession ? (
                    <div className="rounded-md border bg-primary/5 p-4 text-sm text-muted-foreground">
                      Checking your saved desktop session with PSForge.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="desktop-auth-email">Email</Label>
                        <Input
                          id="desktop-auth-email"
                          type="email"
                          value={licenseEmail}
                          onChange={(e) => setLicenseEmail(e.target.value)}
                          placeholder="you@psforge.app"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop-auth-password">Password</Label>
                          <button
                            type="button"
                            className="text-sm text-primary hover:underline"
                            onClick={() => openExternalUrl(`${getDesktopApiBaseUrl()}/forgot-password`)}
                          >
                            Forgot password?
                          </button>
                        </div>
                        <Input
                          id="desktop-auth-password"
                          type="password"
                          value={licensePassword}
                          onChange={(e) => setLicensePassword(e.target.value)}
                          placeholder="Enter your PSForge password"
                        />
                      </div>
                    </>
                  )}

                  {licenseStatusMessage && (
                    <div className={`rounded-md border p-3 text-sm ${
                      licenseStatusTone === "destructive"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-primary/20 bg-primary/10 text-foreground"
                    }`}>
                      {licenseStatusMessage}
                    </div>
                  )}

                  <div className="grid gap-3">
                    <Button
                      onClick={handleDesktopSignIn}
                      disabled={desktopSignInLoading || isRevalidatingStoredSession || !licenseEmail.trim() || !licensePassword.trim()}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {desktopSignInLoading ? "Signing In..." : "Sign In"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAccountDialogOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </Button>
                  </div>

                  <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Signing in here links this Windows app to your PSForge account. Free desktop access is available after sign-in, and PSForge Pro can be purchased securely through Stripe when you want premium features.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {accountDialog}
      </>
    );
  }

  const handleConfirmSaveAndClose = async () => {
    if (!pendingCloseTab) {
      return;
    }

    const saved = await saveScriptTab(pendingCloseTab.id);
    if (!saved) {
      return;
    }

    closeScriptTab(pendingCloseTab.id);
    setPendingTabCloseId(null);
  };

  const handleDiscardAndClose = () => {
    if (!pendingCloseTab) {
      return;
    }

    closeScriptTab(pendingCloseTab.id);
    setPendingTabCloseId(null);
  };

  return (
    <DesktopWorkbenchShell
      logoSrc={logoImage}
      desktopVersion={desktopVersion}
      accessLabel={accessLabel}
      hasProAccess={hasProAccess}
      updateState={updateState}
      activeArea={activeWorkspaceTab}
      currentFileName={currentFileName}
      isDirty={activeTabDirty}
      analysis={currentScriptAnalysis}
      recentFilesCount={recentFiles.length}
      recentFiles={recentFiles}
      runHistorySummary={runHistorySummary}
      onAreaChange={setActiveWorkspaceTab}
      onNewScript={createNewScriptTab}
      onOpenScript={() => void handleOpenScript()}
      onSaveScript={() => void handleSaveScript()}
      onSaveAs={() => void handleSaveAs()}
      onManageLicense={() => setAppSettingsView("license")}
      onCheckForUpdates={() => void handleCheckForUpdates()}
      onOpenRecentFiles={() => setAppSettingsView("recent")}
      onOpenRunTools={() => triggerWorkbenchAction("run")}
      onRerunLastRun={() => triggerWorkbenchAction("rerun-last")}
      onRunPreflight={() => triggerWorkbenchAction("preflight")}
      onRunAiReview={() => triggerWorkbenchAction("ai-review")}
      onOpenHeaderGenerator={() => triggerWorkbenchAction("header")}
      onOpenPlaceholderTool={() => triggerWorkbenchAction("placeholders")}
      onOpenWorkbenchReview={() => triggerWorkbenchAction("workbench")}
    >
        <Card className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-none border-0">
          <div className="border-b px-3 py-2 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DesktopFocusPanel
                profile={guidedProfile}
                hasProAccess={hasProAccess}
                onChangeFocus={openGuidedOnboarding}
                onStartWorkflow={startGuidedWorkflow}
              />
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => setStarterGalleryOpen((current) => !current)}>
                <LayoutGrid className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Starters</span>
                <ChevronDown className={`ml-1 h-4 w-4 transition sm:ml-2 ${starterGalleryOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
            {desktopConversionBanner && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{desktopConversionBanner.title}</div>
                  <div className="text-xs text-muted-foreground">{desktopConversionBanner.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setGeneralUpgradeDialogOpen(true)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {desktopConversionBanner.cta}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConversionBannerDismissed(true)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
            {starterGalleryOpen && (
              <div className="mt-2 rounded-md border bg-background/50 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-background px-2 py-1.5">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      value={starterGalleryQuery}
                      onChange={(event) => setStarterGalleryQuery(event.target.value)}
                      placeholder="Search starters"
                      className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {filteredStarterWorkflows.length} starter{filteredStarterWorkflows.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto xl:grid-cols-4">
                  {filteredStarterWorkflows.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-background/70 px-3 py-4 text-sm text-muted-foreground xl:col-span-4">
                      No starters match that search. Try a platform like AD, Intune, Microsoft 365, or Exchange.
                    </div>
                  ) : (
                    filteredStarterWorkflows.map((workflow) => (
                      <button
                        key={workflow.id}
                        type="button"
                        className="rounded-md border bg-background/70 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/5"
                        onClick={() => setStarterWorkflowPreview(workflow)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium">{workflow.title}</div>
                          <Badge variant="outline" className="text-[10px]">{workflow.badge}</Badge>
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{workflow.description}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <Tabs value={activeWorkspaceTab} onValueChange={(value) => setActiveWorkspaceTab(value as DesktopWorkspaceTab)} className="flex h-full min-h-0 flex-col overflow-hidden">
            <TabsContent value="script" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
                    {scriptTabs.map((tab) => {
                      const isActive = tab.id === activeScriptTab?.id;
                      const isDirty = tab.script !== tab.lastSavedContent;

                      return (
                        <div
                          key={tab.id}
                          className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
                            isActive ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            className="max-w-[220px] truncate text-left"
                            onClick={() => setActiveScriptTabId(tab.id)}
                          >
                            {tab.fileName}
                            {isDirty ? " *" : ""}
                          </button>
                          {cloudStorageEnabled && tab.webScriptId ? (
                            <Badge variant="outline" className="ml-1 border-primary/30 px-1.5 py-0 text-[10px] text-primary">
                              Web
                            </Badge>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
                            onClick={() => requestCloseScriptTab(tab.id)}
                            aria-label={`Close ${tab.fileName}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {cloudStorageEnabled && activeScriptTab?.webScriptId ? (
                      <>
                        <Badge variant={activeWebSyncDirty ? "secondary" : "outline"} className="hidden text-[11px] sm:inline-flex">
                          {activeWebSyncDirty ? "Local edits" : "Synced"}
                        </Badge>
                        <Button size="sm" variant={activeWebSyncDirty ? "default" : "outline"} onClick={() => void saveActiveWebScript()}>
                          Save to Web
                        </Button>
                      </>
                    ) : null}
                    <Button size="sm" variant="outline" className="shrink-0" onClick={createNewScriptTab}>
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">New Script</span>
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <DesktopScriptWorkbench
                    script={currentScript}
                    setScript={setActiveScript}
                    currentFileName={currentFileName}
                    authorName={visibleUser?.name || visibleUser?.email || "PSForge User"}
                    pendingAction={pendingWorkbenchAction}
                    onRunHistorySummaryChange={setRunHistorySummary}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
              <div className="h-full min-h-0">
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading AI workspace...</div>}>
                  <AIAssistantTab
                    scriptCommands={scriptCommands}
                    setScriptCommands={setScriptCommands}
                    script={currentScript}
                    setScript={setActiveScript}
                  />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="gui" className="mt-0 h-full min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                <div className="border-b px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        Library
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cloudStorageEnabled
                          ? "Open synced scripts, local recents, and starter building blocks from one place."
                          : "Open local recents and starter building blocks from one place."}
                      </div>
                    </div>
                    {cloudStorageEnabled ? (
                      <Button size="sm" variant="outline" onClick={() => void loadWebLibraryScripts()} disabled={webLibraryLoading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${webLibraryLoading ? "animate-spin" : ""}`} />
                        Sync
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid h-full min-h-0 grid-cols-[minmax(300px,380px)_minmax(0,1fr)] overflow-hidden max-xl:grid-cols-1">
                  <section className="min-h-0 overflow-hidden border-r bg-muted/20 max-xl:border-b max-xl:border-r-0">
                    <div className="flex h-full min-h-0 flex-col">
                      <div className="border-b p-3">
                        <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
                          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <Input
                            value={webLibraryQuery}
                            onChange={(event) => setWebLibraryQuery(event.target.value)}
                            placeholder="Search Library"
                            className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {libraryFilters.map(([value, label]) => (
                            <Button
                              key={value}
                              type="button"
                              size="sm"
                              variant={webLibraryFilter === value ? "default" : "outline"}
                              className="h-7 px-2 text-xs"
                              onClick={() => setWebLibraryFilter(value)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {cloudStorageEnabled
                              ? `${webLibraryScripts.length} web - ${STARTER_WORKFLOWS.length} starters - ${recentFiles.length} local`
                              : `${STARTER_WORKFLOWS.length} starters - ${recentFiles.length} local`}
                          </span>
                          {cloudStorageEnabled && webLibraryFromCache ? <span>Cached</span> : null}
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain p-3 [scrollbar-gutter:stable]">
                        {webLibraryLoading && showWebLibrary ? (
                          <div className="rounded-md border bg-background/70 p-4 text-sm text-muted-foreground">
                            Loading scripts from your PSForge web account...
                          </div>
                        ) : webLibraryError && showWebLibrary && webLibraryScripts.length === 0 ? (
                          <div className="rounded-md border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">
                            <div>{webLibraryError}</div>
                            <Button className="mt-3" size="sm" variant="outline" onClick={() => setAccountDialogOpen(true)}>
                              Connect Account
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {webLibraryError && showWebLibrary ? (
                              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                                {webLibraryError}
                              </div>
                            ) : null}

                            {showWebLibrary ? (
                              <div className="space-y-2">
                                {filteredWebLibraryScripts.length > 0 ? (
                                  filteredWebLibraryScripts.map((script) => (
                                    <div key={script.id} className="rounded-md border bg-background/80 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <FileCode className="h-4 w-4 shrink-0 text-primary" />
                                            <div className="truncate text-sm font-medium">{script.name}</div>
                                            {script.isFavorite ? <Badge variant="outline" className="text-[10px]">Favorite</Badge> : null}
                                          </div>
                                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {script.description || script.taskName || "Saved from PSForge web."}
                                          </div>
                                        </div>
                                        <Button size="sm" onClick={() => openWebLibraryScript(script)}>
                                          Open
                                        </Button>
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                        {script.taskCategory ? <Badge variant="secondary">{script.taskCategory}</Badge> : null}
                                        {script.updatedAt || script.lastAccessed || script.createdAt ? (
                                          <span>
                                            {new Date(script.updatedAt || script.lastAccessed || script.createdAt || "").toLocaleDateString()}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
                                    No web scripts match this view.
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {showStarterLibrary ? (
                              <div className="space-y-2">
                                {filteredStarterLibrary.map((workflow) => (
                                  <button
                                    key={workflow.id}
                                    type="button"
                                    className="w-full rounded-md border bg-background/80 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                                    onClick={() => setStarterWorkflowPreview(workflow)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="truncate text-sm font-medium">{workflow.title}</div>
                                      <Badge variant="outline" className="text-[10px]">{workflow.badge}</Badge>
                                    </div>
                                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{workflow.description}</div>
                                  </button>
                                ))}
                                {filteredStarterLibrary.length === 0 ? (
                                  <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
                                    No starters match this search.
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {showLocalLibrary ? (
                              <div className="space-y-2">
                                {filteredRecentLibrary.map((file) => (
                                  <div key={`${file.fileName}-${file.openedAt}`} className="rounded-md border bg-background/80 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">{file.fileName}</div>
                                        <div className="mt-1 truncate text-xs text-muted-foreground">{file.filePath || "Local recent file"}</div>
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => setAppSettingsView("recent")}>
                                        Open
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                {filteredRecentLibrary.length === 0 ? (
                                  <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
                                    No local recent scripts match this view.
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="flex h-full min-h-0 overflow-hidden">
                    <div className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                      {workflowLaunchNotice ? (
                        <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-muted-foreground">
                          <div className="flex items-center justify-between gap-3">
                            <span>{workflowLaunchNotice}</span>
                            <Button size="sm" variant="ghost" onClick={() => setWorkflowLaunchNotice(null)}>
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading builder library...</div>}>
                        <GUIBuilderTab
                          selectedCategory={selectedGuiCategory}
                          onCategorySelect={setSelectedGuiCategory}
                          script={currentScript}
                          setScript={setActiveScript}
                          highlightedTaskIds={workflowTaskHighlights}
                          autoSelectedTaskId={workflowSelectedTaskId}
                        />
                      </Suspense>
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wizard" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="h-full overflow-auto">
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading wizard...</div>}>
                  <ScriptWizardTab
                    script={currentScript}
                    setScript={setActiveScript}
                  />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="git" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading Git workspace...</div>}>
                <DesktopGitPanel
                  scriptName={currentFileName}
                  scriptContent={currentScript}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="troubleshooter" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="h-full overflow-auto">
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading troubleshooter...</div>}>
                  <TroubleshooterTab setScript={setActiveScript} />
                </Suspense>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

      <Dialog open={appSettingsView !== null} onOpenChange={(open) => !open && setAppSettingsView(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{appSettingsView ? appSettingsDialogMeta[appSettingsView].title : "App Settings"}</DialogTitle>
            <DialogDescription>
              {appSettingsView ? appSettingsDialogMeta[appSettingsView].description : "Manage desktop settings."}
            </DialogDescription>
          </DialogHeader>
          {renderAppSettingsContent()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!starterWorkflowPreview} onOpenChange={(open) => !open && setStarterWorkflowPreview(null)}>
        <DialogContent className="max-h-[86vh] overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{starterWorkflowPreview?.title || "Starter Workflow"}</DialogTitle>
              {starterWorkflowPreview ? <Badge variant="outline">{starterWorkflowPreview.badge}</Badge> : null}
            </div>
            <DialogDescription>
              {starterWorkflowPreview?.description || "Review the starter before opening it."}
            </DialogDescription>
          </DialogHeader>
          {starterWorkflowPreview && (
            <div className="grid min-h-0 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">What this gives you</div>
                <div className="mt-2 text-muted-foreground">{starterWorkflowPreview.outcome}</div>
                <div className="mt-4 rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
                  Opens in a fresh tab so your active draft stays untouched.
                </div>
              </div>
              <pre className="max-h-[52vh] overflow-auto rounded-md border bg-background p-3 text-xs leading-relaxed">
                <code>{starterWorkflowPreview.script}</code>
              </pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarterWorkflowPreview(null)}>
              Cancel
            </Button>
            <Button onClick={() => starterWorkflowPreview && startStarterWorkflow(starterWorkflowPreview)}>
              Open in New Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DesktopGuidedOnboardingDialog
        open={guidedOnboardingOpen}
        onOpenChange={setGuidedOnboardingOpen}
        selectedFocusId={guidedFocusDraftId}
        selectedWorkflowId={guidedWorkflowDraftId}
        hasProAccess={hasProAccess}
        onSelectFocus={setGuidedFocusDraftId}
        onSelectWorkflow={setGuidedWorkflowDraftId}
        onComplete={handleCompleteGuidedOnboarding}
      />

      <DesktopUpgradeDialog
        open={generalUpgradeDialogOpen}
        onOpenChange={setGeneralUpgradeDialogOpen}
        feature="PSForge Pro"
        title="Unlock PSForge Pro"
        description="Get the full PSForge desktop experience with AI help, premium workflow packs, guided troubleshooting, and faster script generation across the app."
        previewTitle="What PSForge Pro unlocks across the desktop app"
        previewItems={[
          "Generate and refine PowerShell scripts with AI from the desktop workflow.",
          "Use premium workflow packs for Intune, Microsoft 365, Azure, Help Desk, and more.",
          "Move from troubleshooting, planning, and drafting into finished automation faster.",
        ]}
        contextLabel="PSForge Pro"
      />

      <DesktopUpgradeDialog
        open={!!guidedUpgradeWorkflow}
        onOpenChange={(open) => !open && setGuidedUpgradeWorkflowId(null)}
        feature={guidedUpgradeWorkflow?.title || "guided workflow"}
        title={guidedUpgradeWorkflow?.title || "Unlock this workflow with Pro"}
        description={guidedUpgradeWorkflow?.description || "PSForge Pro is required for this workflow."}
        previewTitle="What Pro will do once you continue"
        previewItems={guidedUpgradeWorkflow ? [
          guidedUpgradeWorkflow.outcome,
          guidedUpgradeWorkflow.tab === "ai"
            ? "Draft the script directly in the AI tab instead of building it manually."
            : guidedUpgradeWorkflow.tab === "troubleshooter"
              ? "Analyze the issue and move straight into remediation guidance."
              : "Open the premium task pack and generate repeatable automation faster.",
        ] : []}
        contextLabel={guidedUpgradeWorkflow?.title || "guided workflow"}
      />

      <DesktopUpgradeDialog
        open={!!workflowUpgradeContext}
        onOpenChange={(open) => !open && setWorkflowUpgradeContext(null)}
        feature={workflowUpgradeContext ? getWorkflowDisplayTitle(workflowUpgradeContext.workflow) : "workflow"}
        title="Unlock this workflow with Pro"
        description="This PSForge workflow is marked as Pro. Upgrade or connect a Pro account to continue without losing the workflow context."
        previewTitle="What will stay ready after upgrade"
        previewItems={workflowUpgradeContext ? [
          `${getWorkflowDisplayTitle(workflowUpgradeContext.workflow)} from psforge.app.`,
          workflowUpgradeContext.mapping.platform
            ? `${workflowUpgradeContext.mapping.platform.name} will stay selected in the builder.`
            : "The general workflow chooser will open when no local platform mapping is available.",
          `${workflowUpgradeContext.mapping.validTasks.length} mapped task${workflowUpgradeContext.mapping.validTasks.length === 1 ? "" : "s"} will remain highlighted for review.`,
        ] : []}
        contextLabel={workflowUpgradeContext ? getWorkflowDisplayTitle(workflowUpgradeContext.workflow) : "workflow"}
      />

      <Dialog open={!!pendingCloseTab} onOpenChange={(open) => !open && setPendingTabCloseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save changes before closing?</DialogTitle>
            <DialogDescription>
              {pendingCloseTab?.fileName || "This script"} has unsaved changes. Save it before closing the tab?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setPendingTabCloseId(null)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDiscardAndClose}>
                Don't Save
              </Button>
              <Button onClick={handleConfirmSaveAndClose}>
                Save and Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!webScriptConflict} onOpenChange={(open) => !open && setWebScriptConflict(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Web script changed</DialogTitle>
            <DialogDescription>
              The Library copy changed after this desktop tab was opened. Choose which version to keep before saving.
            </DialogDescription>
          </DialogHeader>
          {webScriptConflict ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-sm font-medium">Desktop edits</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Your current local tab. Saving this will replace the web copy.
                </div>
                <pre className="mt-3 max-h-48 overflow-auto rounded-md border bg-background p-2 text-xs">
                  <code>{scriptTabs.find((tab) => tab.id === webScriptConflict.tabId)?.script || ""}</code>
                </pre>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-sm font-medium">Latest web copy</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  The version currently saved in PSForge web Library.
                </div>
                <pre className="mt-3 max-h-48 overflow-auto rounded-md border bg-background p-2 text-xs">
                  <code>{webScriptConflict.remoteScript.content || ""}</code>
                </pre>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setWebScriptConflict(null)}>
              Cancel
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => resolveWebScriptConflict("open-both")}>
                Open Both
              </Button>
              <Button variant="outline" onClick={() => resolveWebScriptConflict("use-web")}>
                Use Web Copy
              </Button>
              <Button onClick={() => resolveWebScriptConflict("keep-desktop")}>
                Keep Desktop
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {accountDialog}
    </DesktopWorkbenchShell>
  );
}

