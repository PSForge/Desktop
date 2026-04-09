import { isDesktopApp } from "@/lib/desktop";
import type { FeatureAccess, User, UserSubscription } from "@shared/schema";

export interface DesktopLicense {
  isPro: boolean;
  plan: string | null;
  status: string | null;
  validUntil: string | null;
}

export interface DesktopAuthState {
  apiBaseUrl: string;
  token: string | null;
  user?: User | null;
  license?: DesktopLicense | null;
}

type DesktopLicenseResponse = {
  valid: boolean;
  user: User;
  license: DesktopLicense;
};

type DesktopAuthResponse = {
  token: string;
  user: User;
  license: DesktopLicense;
};

type DesktopBillingResponse = {
  url: string;
};

const STORAGE_KEY = "psforge-desktop-auth";
const DEFAULT_WEB_URL = "https://www.psforge.app";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getDesktopFeatureAccess(user: User | null, license: DesktopLicense | null): FeatureAccess | null {
  if (!user) {
    return null;
  }

  const hasProAccess = user.role === "admin" || (!!license?.isPro && license.status === "active");
  const allCategories = [
    "File System",
    "Network",
    "Services",
    "Process Management",
    "Event Logs",
    "Active Directory",
    "Registry",
    "Security",
    "Azure",
    "Azure AD",
    "Exchange Online",
    "Exchange Server",
    "Hyper-V",
    "Intune",
    "MECM",
    "Microsoft Teams",
    "Office 365",
    "OneDrive",
    "Power Platform",
    "SharePoint Online",
    "SharePoint On-Premises",
    "Windows 365",
    "Windows Server",
  ];
  const freeCategories = [
    "File System",
    "Network",
    "Services",
    "Process Management",
    "Event Logs",
    "Active Directory",
    "Registry",
    "Security",
  ];

  return {
    hasAIAccess: hasProAccess,
    hasPremiumCategories: hasProAccess,
    accessibleCategories: hasProAccess ? allCategories : freeCategories,
    restrictedCategories: hasProAccess ? [] : allCategories.filter((item) => !freeCategories.includes(item)),
  };
}

function mapLicenseToSubscription(user: User | null, license: DesktopLicense | null): UserSubscription | null {
  if (!user || !license?.isPro || !license?.plan || !license?.status || !license?.validUntil) {
    return null;
  }

  return {
    id: `desktop-${user.id}`,
    userId: user.id,
    planId: license.plan,
    stripeSubscriptionId: null,
    status: license.status as any,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: license.validUntil,
    cancelAt: null,
    canceledAt: null,
    trialEnd: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultDesktopApiBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_PSFORGE_WEB_URL || DEFAULT_WEB_URL);
}

export function getDesktopAuthState(): DesktopAuthState {
  if (typeof window === "undefined") {
    return { apiBaseUrl: getDefaultDesktopApiBaseUrl(), token: null, user: null, license: null };
  }

  const raw = isDesktopApp() && window.psforgeDesktop?.getStorageItem
    ? window.psforgeDesktop.getStorageItem(STORAGE_KEY)
    : window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { apiBaseUrl: getDefaultDesktopApiBaseUrl(), token: null, user: null, license: null };
  }

  try {
    const parsed = JSON.parse(raw) as DesktopAuthState;
    return {
      apiBaseUrl: normalizeBaseUrl(parsed.apiBaseUrl || getDefaultDesktopApiBaseUrl()),
      token: parsed.token || null,
      user: parsed.user || null,
      license: parsed.license || null,
    };
  } catch {
    return { apiBaseUrl: getDefaultDesktopApiBaseUrl(), token: null, user: null, license: null };
  }
}

export function saveDesktopAuthState(nextState: DesktopAuthState) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify({
    apiBaseUrl: normalizeBaseUrl(nextState.apiBaseUrl || getDefaultDesktopApiBaseUrl()),
    token: nextState.token || null,
    user: nextState.user || null,
    license: nextState.license || null,
  });

  if (isDesktopApp() && window.psforgeDesktop?.setStorageItem) {
    window.psforgeDesktop.setStorageItem(STORAGE_KEY, serialized);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, serialized);
}

export function clearDesktopAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  if (isDesktopApp() && window.psforgeDesktop?.removeStorageItem) {
    window.psforgeDesktop.removeStorageItem(STORAGE_KEY);
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function isDesktopRemoteAuthEnabled() {
  if (!isDesktopApp()) {
    return false;
  }

  return !!getDesktopAuthState().token;
}

export function hasStoredDesktopSession() {
  return !!getDesktopAuthState().token;
}

export function getDesktopApiBaseUrl() {
  return getDesktopAuthState().apiBaseUrl || getDefaultDesktopApiBaseUrl();
}

export function getDesktopAuthHeader(): Record<string, string> {
  const token = getDesktopAuthState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getDesktopRequestUrl(url: string) {
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${getDesktopApiBaseUrl()}${normalized}`;
}

export function getDesktopCachedLicense() {
  return getDesktopAuthState().license || null;
}

async function desktopAwareRequest(url: string, init: { method: string; headers?: Record<string, string>; body?: string }) {
  if (typeof window !== "undefined" && window.psforgeDesktop?.request) {
    let response;
    try {
      response = await window.psforgeDesktop.request({
        url,
        method: init.method,
        headers: init.headers,
        body: init.body,
      });
    } catch (error) {
      return {
        ok: false,
        status: 0,
        headers: {
          get: () => null,
        },
        text: async () => error instanceof Error ? error.message : String(error),
        json: async () => {
          throw error;
        },
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: {
        get: (name: string) => response.headers[name.toLowerCase()] || response.headers[name] || null,
      },
      text: async () => response.text,
      json: async () => JSON.parse(response.text),
    };
  }

  return fetch(url, init);
}

async function readJsonResponse<T>(response: Awaited<ReturnType<typeof desktopAwareRequest>>, fallbackMessage: string) {
  if (response.status === 0) {
    throw new Error((await response.text()) || fallbackMessage);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("The PSForge website returned a webpage instead of the desktop API. Please verify the desktop auth deployment is live.");
    }
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    throw new Error((await response.text()) || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export async function desktopSignInWithPassword(email: string, password: string) {
  let response: Awaited<ReturnType<typeof desktopAwareRequest>>;
  try {
    response = await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/auth"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Desktop sign-in could not reach the PSForge license service.");
  }

  const data = await readJsonResponse<DesktopAuthResponse>(response, "Desktop sign-in failed.");
  saveDesktopAuthState({
    apiBaseUrl: getDefaultDesktopApiBaseUrl(),
    token: data.token,
    user: data.user,
    license: data.license,
  });
  return data;
}

export async function desktopRegisterAccount(name: string, email: string, password: string) {
  let response: Awaited<ReturnType<typeof desktopAwareRequest>>;
  try {
    response = await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
  } catch {
    throw new Error("Desktop account creation could not reach the PSForge service.");
  }

  const data = await readJsonResponse<DesktopAuthResponse>(response, "Desktop account creation failed.");
  saveDesktopAuthState({
    apiBaseUrl: getDefaultDesktopApiBaseUrl(),
    token: data.token,
    user: data.user,
    license: data.license,
  });
  return data;
}

export async function fetchDesktopLicense() {
  const headers = {
    "Content-Type": "application/json",
    ...getDesktopAuthHeader(),
  };

  let response: Awaited<ReturnType<typeof desktopAwareRequest>>;
  try {
    response = await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/license"), {
      method: "GET",
      headers,
    });
  } catch {
    throw new Error("Desktop license check could not reach the PSForge service.");
  }

  if (response.status === 401) {
    clearDesktopAuthState();
    throw new Error("401: Desktop license token is invalid or has been revoked.");
  }

  const data = await readJsonResponse<DesktopLicenseResponse>(response, "Desktop license check failed.");
  saveDesktopAuthState({
    ...getDesktopAuthState(),
    user: data.user,
    license: data.license,
  });
  return data;
}

export async function deauthorizeDesktopLicense() {
  const token = getDesktopAuthState().token;
  if (!token) {
    clearDesktopAuthState();
    return;
  }

  try {
    await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/deauth"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    clearDesktopAuthState();
  }
}

export async function createDesktopBillingCheckout(promoCode?: string) {
  let response: Awaited<ReturnType<typeof desktopAwareRequest>>;
  try {
    response = await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/billing/checkout"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getDesktopAuthHeader(),
      },
      body: JSON.stringify({
        promoCode: promoCode?.trim() || undefined,
      }),
    });
  } catch {
    throw new Error("Secure Stripe checkout could not reach the PSForge billing service.");
  }

  return readJsonResponse<DesktopBillingResponse>(response, "Could not start the PSForge Pro checkout.");
}

export async function createDesktopBillingPortal() {
  let response: Awaited<ReturnType<typeof desktopAwareRequest>>;
  try {
    response = await desktopAwareRequest(getDesktopRequestUrl("/api/desktop/billing/portal"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getDesktopAuthHeader(),
      },
      body: JSON.stringify({}),
    });
  } catch {
    throw new Error("Subscription management could not reach the PSForge billing service.");
  }

  return readJsonResponse<DesktopBillingResponse>(response, "Could not open subscription management.");
}

export function mapDesktopLicenseToAuthPayload() {
  const state = getDesktopAuthState();
  if (!state.token || !state.user) {
    return null;
  }

  return {
    user: state.user,
    subscription: mapLicenseToSubscription(state.user, state.license || null),
    featureAccess: getDesktopFeatureAccess(state.user, state.license || null),
  };
}
