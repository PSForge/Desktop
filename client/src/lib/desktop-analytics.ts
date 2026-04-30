import { getDesktopContext, getDesktopStorageItem, isDesktopApp, setDesktopStorageItem } from "@/lib/desktop";
import { getDesktopAuthState, getDesktopCachedLicense, getDesktopRequestUrl } from "@/lib/desktop-auth";

export type DesktopAnalyticsEventType =
  | "desktop_app_opened"
  | "desktop_session_heartbeat"
  | "desktop_ai_prompt_sent"
  | "desktop_ai_response_received"
  | "desktop_script_generated"
  | "desktop_script_saved_local"
  | "desktop_update_checked"
  | "desktop_update_installed";

type DesktopAnalyticsEvent = {
  eventType: DesktopAnalyticsEventType;
  value: number;
  installationId: string;
  sessionId: string;
  appVersion: string;
  platform: string;
  osVersion: string;
  plan: string;
  timestamp?: string;
};

const INSTALLATION_ID_KEY = "psforge-desktop-installation-id";
const ANALYTICS_QUEUE_KEY = "psforge-desktop-analytics-queue";
const SESSION_ID = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_BATCH_SIZE = 100;

let contextPromise: Promise<{ appVersion: string; platform: string; osVersion: string }> | null = null;
let flushInFlight = false;

function readAnalyticsQueue(): DesktopAnalyticsEvent[] {
  const raw = getDesktopStorageItem(ANALYTICS_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAnalyticsQueue(events: DesktopAnalyticsEvent[]) {
  setDesktopStorageItem(ANALYTICS_QUEUE_KEY, JSON.stringify(events));
}

function getInstallationId() {
  const existing = getDesktopStorageItem(INSTALLATION_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextId = globalThis.crypto?.randomUUID?.() || `install-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  setDesktopStorageItem(INSTALLATION_ID_KEY, nextId);
  return nextId;
}

function getPlanLabel() {
  const license = getDesktopCachedLicense();
  if (license?.plan) {
    return license.plan;
  }

  return license?.isPro ? "PSForge Pro" : "PSForge Free";
}

function inferOsVersion() {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent || "";
  const windowsMatch = userAgent.match(/Windows NT ([0-9.]+)/i);
  if (windowsMatch?.[1]) {
    return windowsMatch[1];
  }

  return navigator.platform || "unknown";
}

async function getAnalyticsContext() {
  if (!contextPromise) {
    contextPromise = (async () => {
      const desktopContext = await getDesktopContext().catch(() => null);
      return {
        appVersion: desktopContext?.version || "unknown",
        platform: desktopContext?.platform || (typeof navigator !== "undefined" ? navigator.platform : "unknown"),
        osVersion: desktopContext?.osVersion || inferOsVersion(),
      };
    })();
  }

  return contextPromise;
}

function getAnalyticsAuthHeader() {
  const configuredApiKey = import.meta.env.VITE_PSFORGE_DESKTOP_ANALYTICS_KEY?.trim();
  if (configuredApiKey) {
    return { Authorization: `Bearer ${configuredApiKey}` };
  }

  const token = getDesktopAuthState().token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function desktopAwareRequest(url: string, init: { method: string; headers?: Record<string, string>; body?: string }) {
  if (typeof window !== "undefined" && window.psforgeDesktop?.request) {
    return window.psforgeDesktop.request({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
  }

  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    headers: {},
    text: await response.text(),
  };
}

export async function flushDesktopAnalytics() {
  if (flushInFlight || !isDesktopApp()) {
    return false;
  }

  const authHeader = getAnalyticsAuthHeader();
  const queuedEvents = readAnalyticsQueue();

  if (!authHeader || queuedEvents.length === 0) {
    return false;
  }

  flushInFlight = true;
  try {
    const batch = queuedEvents.slice(0, DEFAULT_BATCH_SIZE);
    const response = await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/analytics/batch"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ events: batch }),
    });

    if (!response.ok) {
      return false;
    }

    writeAnalyticsQueue(queuedEvents.slice(batch.length));

    if (queuedEvents.length > batch.length) {
      void flushDesktopAnalytics();
    }

    return true;
  } catch {
    return false;
  } finally {
    flushInFlight = false;
  }
}

export async function trackDesktopAnalyticsEvent(eventType: DesktopAnalyticsEventType, value = 1) {
  if (!isDesktopApp()) {
    return;
  }

  const context = await getAnalyticsContext();
  const nextEvent: DesktopAnalyticsEvent = {
    eventType,
    value,
    installationId: getInstallationId(),
    sessionId: SESSION_ID,
    appVersion: context.appVersion,
    platform: context.platform,
    osVersion: context.osVersion,
    plan: getPlanLabel(),
    timestamp: new Date().toISOString(),
  };

  writeAnalyticsQueue([...readAnalyticsQueue(), nextEvent]);
  void flushDesktopAnalytics();
}

export function getDesktopAnalyticsSessionId() {
  return SESSION_ID;
}
