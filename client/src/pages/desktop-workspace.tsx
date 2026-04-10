import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, ExternalLink, FileCode, GitBranch, History, LayoutGrid, Plus, RefreshCcw, ShieldCheck, Sparkles, UserPlus, Wand2, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
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
  subscribeToDesktopMenuActions,
  subscribeToDesktopUpdates,
  writeDesktopScriptFile,
} from "@/lib/desktop";
import {
  createDesktopBillingCheckout,
  createDesktopBillingPortal,
  desktopRegisterAccount,
  desktopSignInWithPassword,
  fetchDesktopLicense,
  getDesktopApiBaseUrl,
  getDesktopAuthState,
  getDesktopCachedLicense,
  hasStoredDesktopSession,
} from "@/lib/desktop-auth";
import { queryClient } from "@/lib/queryClient";
import type { ScriptCommand } from "@shared/schema";
import { ScriptGeneratorTab } from "@/components/script-generator-tab";
import { AIAssistantTab } from "@/components/ai-assistant-tab";
import { GUIBuilderTab } from "@/components/gui-builder-tab";
import { ScriptWizardTab } from "@/components/script-wizard-tab";
import { DesktopGitPanel } from "@/components/desktop-git-panel";
import { TroubleshooterTab } from "@/components/troubleshooter-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoImage from "@assets/psforge-full-logo-wide.png";

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
};

type AppSettingsView = "license" | "subscription" | "recovery" | "recent" | null;

const RECOVERY_KEY = "psforge-desktop-recovery";
const RECENTS_KEY = "psforge-desktop-recent-files";

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

export default function DesktopWorkspace() {
  const { toast } = useToast();
  const { user, isAuthenticated, featureAccess, logout, refetch } = useAuth();
  const [scriptTabs, setScriptTabs] = useState<ScriptWorkspaceTab[]>(() => [createWorkspaceTab()]);
  const [activeScriptTabId, setActiveScriptTabId] = useState("");
  const [scriptCommands, setScriptCommands] = useState<ScriptCommand[]>([]);
  const [selectedGuiCategory, setSelectedGuiCategory] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [desktopSignInLoading, setDesktopSignInLoading] = useState(false);
  const [desktopSignOutLoading, setDesktopSignOutLoading] = useState(false);
  const [desktopRegisterLoading, setDesktopRegisterLoading] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState<null | "checkout" | "portal">(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [checkoutPromoCode, setCheckoutPromoCode] = useState("");
  const [licenseEmail, setLicenseEmail] = useState("");
  const [licensePassword, setLicensePassword] = useState("");
  const [licenseStatusMessage, setLicenseStatusMessage] = useState<string | null>(null);
  const [licenseStatusTone, setLicenseStatusTone] = useState<"default" | "destructive">("default");
  const [recoveryFound, setRecoveryFound] = useState(false);
  const [pendingTabCloseId, setPendingTabCloseId] = useState<string | null>(null);
  const [appSettingsView, setAppSettingsView] = useState<AppSettingsView>(null);
  const [desktopSession, setDesktopSession] = useState(() => getDesktopAuthState());
  const [desktopVersion, setDesktopVersion] = useState("1.0.0");
  const [updateState, setUpdateState] = useState<{ state: string; version?: string; percent?: number; message?: string }>({ state: "idle" });
  const pollTimerRef = useRef<number | null>(null);
  const checkoutRefreshTimerRef = useRef<number | null>(null);
  const cachedLicense = desktopSession.license || getDesktopCachedLicense();
  const cachedUser = desktopSession.user || null;
  const visibleUser = user || cachedUser;
  const activeScriptTab = useMemo(
    () => scriptTabs.find((tab) => tab.id === activeScriptTabId) || scriptTabs[0] || null,
    [activeScriptTabId, scriptTabs],
  );
  const currentFileName = activeScriptTab?.fileName || "Untitled.ps1";
  const currentScript = activeScriptTab?.script || "";
  const activeTabDirty = activeScriptTab ? activeScriptTab.script !== activeScriptTab.lastSavedContent : false;
  const hasProAccess = user?.role === "admin" || !!featureAccess?.hasPremiumCategories || !!cachedLicense?.isPro;
  const isRevalidatingStoredSession = !!desktopSession.token && !visibleUser;

  const accessLabel = useMemo(() => {
    if (hasProAccess) {
      return "Pro access enabled";
    }
    if (visibleUser || isAuthenticated) {
      return "Free access";
    }
    return "License not connected";
  }, [hasProAccess, isAuthenticated, visibleUser]);

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

    return () => {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
      }
      if (checkoutRefreshTimerRef.current) {
        window.clearTimeout(checkoutRefreshTimerRef.current);
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
    let mounted = true;

    getDesktopContext().then((context) => {
      if (mounted && context?.version) {
        setDesktopVersion(context.version);
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
    setScriptTabs((currentTabs) => currentTabs.map((tab) => (tab.id === tabId ? updater(tab) : tab)));
  };

  const setActiveScript = (nextScript: string) => {
    if (!activeScriptTab) {
      return;
    }

    updateScriptTab(activeScriptTab.id, (tab) => ({
      ...tab,
      script: nextScript,
    }));
  };

  const createNewScriptTab = () => {
    const nextTab = createWorkspaceTab({
      fileName: getNextUntitledName(scriptTabs),
    });

    setScriptTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveScriptTabId(nextTab.id);
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
          setLicenseStatusTone("default");
          setLicenseStatusMessage(`PSForge Pro is active on this desktop app via ${result.license.plan || "your subscription"}.`);
          toast({
            title: "PSForge Pro activated",
            description: "Your subscription checkout completed and Pro features are now enabled.",
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

  const handleUpgradeToPro = async () => {
    if (!visibleUser) {
      setLicenseStatusTone("destructive");
      setLicenseStatusMessage("Sign in first, then start the secure PSForge Pro checkout.");
      return;
    }

    setBillingActionLoading("checkout");
    try {
      const { url } = await createDesktopBillingCheckout(checkoutPromoCode);
      await openExternalUrl(url);
      setLicenseStatusTone("default");
      setLicenseStatusMessage("Secure Stripe checkout opened in your browser. Complete the subscription there, then PSForge Desktop will refresh your access automatically.");
      toast({
        title: "Secure checkout opened",
        description: "Finish the recurring PSForge Pro subscription in your browser. We’ll keep checking for the updated license.",
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
      return;
    }

    const nextState = await checkForDesktopUpdates();
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
      title: "Account & License",
      description: "Connect this Windows app to your PSForge account and refresh desktop access.",
    },
    subscription: {
      title: "Subscription & Billing",
      description: "Manage PSForge Pro access and secure Stripe-hosted billing actions.",
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
                    <Input
                      id="desktop-promo-code"
                      value={checkoutPromoCode}
                      onChange={(event) => setCheckoutPromoCode(event.target.value.toUpperCase())}
                      placeholder="Optional promo code"
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  {!hasProAccess && (
                    <Button onClick={handleUpgradeToPro} disabled={billingActionLoading !== null}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {billingActionLoading === "checkout" ? "Opening Secure Checkout..." : "Upgrade to Pro with Secure Stripe Checkout"}
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
                <div key={`${entry.fileName}-${entry.openedAt}`} className="rounded-lg border p-3">
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
                  <div className="rounded-xl border bg-muted/30 p-5">
                    <div className="text-base font-semibold">What this sign-in does</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      PSForge Desktop uses your PSForge account as the identity and license source for this Windows installation.
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                      <div className="rounded-lg border bg-background/60 p-3">Connects the desktop app to your PSForge account.</div>
                      <div className="rounded-lg border bg-background/60 p-3">Unlocks Pro features automatically when your web subscription is active.</div>
                      <div className="rounded-lg border bg-background/60 p-3">Keeps desktop access in sync if your subscription changes on the website.</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <CreditCard className="h-4 w-4 text-primary" />
                      PSForge Pro subscription
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      PSForge Pro is a paid recurring subscription. Purchases and renewals are processed securely through Stripe-hosted checkout tied to your PSForge account.
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <div className="rounded-lg border bg-background/60 p-3">Free tier: local editor, script tabs, file saves, recovery, and core desktop workflow.</div>
                      <div className="rounded-lg border bg-background/60 p-3">Pro tier: AI tools, premium automation features, and advanced PSForge workflows.</div>
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
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">
          <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-2">
            <Badge variant={hasProAccess ? "default" : "secondary"}>
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {accessLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 min-h-0 overflow-hidden p-4 xl:p-6">
        <Card className="min-h-0 w-full overflow-hidden">
          <Tabs defaultValue="script" className="flex h-full min-h-0 flex-col">
            <div className="border-b px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {currentFileName}
                    {activeTabDirty ? " *" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">Desktop-first workspace with local recovery and Windows file access</div>
                </div>
                <TabsList>
                  <TabsTrigger value="script" className="gap-2">
                    <FileCode className="h-4 w-4" />
                    Script
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI
                  </TabsTrigger>
                  <TabsTrigger value="gui" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    GUI
                  </TabsTrigger>
                  <TabsTrigger value="wizard" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    Wizard
                  </TabsTrigger>
                  <TabsTrigger value="git" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Git
                  </TabsTrigger>
                  <TabsTrigger value="troubleshooter" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    Troubleshooter
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

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

                  <Button size="sm" variant="outline" onClick={createNewScriptTab}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Script
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <ScriptGeneratorTab
                    script={currentScript}
                    setScript={setActiveScript}
                    exportDialogOpen={false}
                    setExportDialogOpen={() => undefined}
                    currentFileName={currentFileName}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="h-full overflow-hidden">
                <AIAssistantTab
                  scriptCommands={scriptCommands}
                  setScriptCommands={setScriptCommands}
                  script={currentScript}
                  setScript={setActiveScript}
                />
              </div>
            </TabsContent>

            <TabsContent value="gui" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="h-full overflow-auto">
                <GUIBuilderTab
                  selectedCategory={selectedGuiCategory}
                  onCategorySelect={setSelectedGuiCategory}
                  script={currentScript}
                  setScript={setActiveScript}
                />
              </div>
            </TabsContent>

            <TabsContent value="wizard" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="h-full overflow-auto">
                <ScriptWizardTab
                  script={currentScript}
                  setScript={setActiveScript}
                />
              </div>
            </TabsContent>

            <TabsContent value="git" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <DesktopGitPanel
                scriptName={currentFileName}
                scriptContent={currentScript}
              />
            </TabsContent>

            <TabsContent value="troubleshooter" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              <div className="h-full overflow-auto">
                <TroubleshooterTab setScript={setActiveScript} />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

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

      {accountDialog}
    </div>
  );
}
