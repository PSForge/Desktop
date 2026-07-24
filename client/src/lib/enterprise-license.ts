import { getDesktopContext, getDesktopStorageItem, removeDesktopStorageItem, setDesktopStorageItem } from "@/lib/desktop";

export interface EnterpriseLicenseRecord {
  activated: boolean;
  activationToken: string;
  licenseKeySuffix?: string | null;
  licenseId?: string | null;
  organizationName?: string | null;
  plan?: string | null;
  status: "active" | "expired" | "revoked" | "suspended" | string;
  validUntil?: string | null;
  refreshAfter?: string | null;
  activatedAt: string;
  deviceId: string;
  features?: string[];
}

export interface EnterpriseActivationResponse {
  valid: boolean;
  activationToken: string;
  license: {
    licenseKeySuffix?: string | null;
    licenseId?: string | null;
    organizationName?: string | null;
    plan?: string | null;
    status?: string | null;
    validUntil?: string | null;
    refreshAfter?: string | null;
    features?: string[];
    deviceId?: string | null;
  };
}

export interface EnterpriseActivationOptions {
  licenseKey: string;
  licenseServerUrl?: string | null;
}

export type EnterpriseInstallOptions = {
  licenseKey?: string;
  licenseServerUrl?: string;
  silent?: boolean;
};

const ENTERPRISE_LICENSE_STORAGE_KEY = "psforge-enterprise-license";
const ENTERPRISE_DEVICE_STORAGE_KEY = "psforge-enterprise-device-id";
const ENTERPRISE_ACTIVATION_ENDPOINT = "/api/enterprise/desktop/activate";
const ENTERPRISE_VALIDATE_ENDPOINT = "/api/enterprise/desktop/validate";
const DEFAULT_LICENSE_SERVER_URL = "https://psforge.app";

function normalizeBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed === "https://www.psforge.app" ? DEFAULT_LICENSE_SERVER_URL : trimmed;
}

export function isEnterpriseEdition() {
  return import.meta.env.VITE_PSFORGE_EDITION === "enterprise" || import.meta.env.VITE_PSFORGE_ENTERPRISE === "true";
}

export function getEnterpriseLicenseServerUrl(overrideUrl?: string | null) {
  return normalizeBaseUrl(
    overrideUrl?.trim()
    || import.meta.env.VITE_PSFORGE_ENTERPRISE_LICENSE_URL
    || import.meta.env.VITE_PSFORGE_WEB_URL
    || DEFAULT_LICENSE_SERVER_URL,
  );
}

export function getEnterpriseRequestUrl(url: string) {
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${getEnterpriseLicenseServerUrl()}${normalized}`;
}

export function getEnterpriseAuthHeader(): Record<string, string> {
  const record = getEnterpriseLicenseRecord();
  return isEnterpriseLicenseActive(record)
    ? {
      Authorization: `Bearer ${record!.activationToken}`,
      "X-Device-Id": record!.deviceId,
    }
    : {};
}

export function getEnterpriseLicenseRecord(): EnterpriseLicenseRecord | null {
  const raw = getDesktopStorageItem(ENTERPRISE_LICENSE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as EnterpriseLicenseRecord;
    return parsed?.activated && parsed.activationToken ? parsed : null;
  } catch {
    return null;
  }
}

export function saveEnterpriseLicenseRecord(record: EnterpriseLicenseRecord) {
  setDesktopStorageItem(ENTERPRISE_LICENSE_STORAGE_KEY, JSON.stringify(record));
}

export function clearEnterpriseLicenseRecord() {
  removeDesktopStorageItem(ENTERPRISE_LICENSE_STORAGE_KEY);
}

export function isEnterpriseLicenseActive(record = getEnterpriseLicenseRecord()) {
  if (!record?.activated || record.status !== "active") {
    return false;
  }

  if (!record.validUntil) {
    return true;
  }

  return new Date(record.validUntil).getTime() > Date.now();
}

export function getEnterpriseFeatureAccess() {
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

  return {
    hasAIAccess: true,
    hasPremiumCategories: true,
    accessibleCategories: allCategories,
    restrictedCategories: [],
  };
}

export function getEnterpriseAuthPayload() {
  const record = getEnterpriseLicenseRecord();
  if (!isEnterpriseLicenseActive(record)) {
    return null;
  }
  if (!record) {
    return null;
  }

  return {
    user: {
      id: record.licenseId || "enterprise-license",
      email: "enterprise@psforge.local",
      name: record.organizationName || "PSForge Enterprise",
      role: "admin" as const,
    },
    subscription: {
      id: record.licenseId || "enterprise-license",
      userId: record.licenseId || "enterprise-license",
      planId: "psforge-enterprise",
      stripeSubscriptionId: null,
      status: "active" as const,
      currentPeriodStart: record.activatedAt,
      currentPeriodEnd: record.validUntil || "2999-12-31T23:59:59.999Z",
      cancelAt: null,
      canceledAt: null,
      trialEnd: null,
      createdAt: record.activatedAt,
      updatedAt: new Date().toISOString(),
    },
    featureAccess: getEnterpriseFeatureAccess(),
  };
}

async function getEnterpriseDeviceId() {
  const existing = getDesktopStorageItem(ENTERPRISE_DEVICE_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const context = await getDesktopContext();
  const installId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const deviceId = `${context?.platform || "desktop"}-${installId}`;
  setDesktopStorageItem(ENTERPRISE_DEVICE_STORAGE_KEY, deviceId);
  return deviceId;
}

async function enterpriseRequest<T>(url: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const requestBody = JSON.stringify(body);
  const response = window.psforgeDesktop?.request
    ? await window.psforgeDesktop.request({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: requestBody,
    })
    : await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: requestBody,
    });

  const ok = "ok" in response ? response.ok : false;
  const text = typeof response.text === "string" ? response.text : await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!ok) {
    const error = new Error(data?.error || data?.message || "Enterprise license request failed.") as Error & { status?: number };
    error.status = typeof response.status === "number" ? response.status : undefined;
    throw error;
  }

  return data as T;
}

function activationUrl(baseUrl?: string | null) {
  return `${getEnterpriseLicenseServerUrl(baseUrl)}${ENTERPRISE_ACTIVATION_ENDPOINT}`;
}

function validateUrl(baseUrl?: string | null) {
  return `${getEnterpriseLicenseServerUrl(baseUrl)}${ENTERPRISE_VALIDATE_ENDPOINT}`;
}

function toLicenseRecord(data: EnterpriseActivationResponse, deviceId: string): EnterpriseLicenseRecord {
  if (data.license.deviceId && data.license.deviceId !== deviceId) {
    throw new Error("Enterprise license response was issued for a different device.");
  }

  return {
    activated: true,
    activationToken: data.activationToken,
    licenseKeySuffix: data.license.licenseKeySuffix || null,
    licenseId: data.license.licenseId || null,
    organizationName: data.license.organizationName || null,
    plan: data.license.plan || "PSForge Enterprise",
    status: data.license.status || "active",
    validUntil: data.license.validUntil || null,
    refreshAfter: data.license.refreshAfter || null,
    activatedAt: new Date().toISOString(),
    deviceId: data.license.deviceId || deviceId,
    features: data.license.features || ["all"],
  };
}

export async function activateEnterpriseLicense({ licenseKey, licenseServerUrl }: EnterpriseActivationOptions) {
  const trimmedKey = licenseKey.trim();
  if (!trimmedKey) {
    throw new Error("Enter an Enterprise product key.");
  }

  const context = await getDesktopContext();
  const deviceId = await getEnterpriseDeviceId();
  const data = await enterpriseRequest<EnterpriseActivationResponse>(activationUrl(licenseServerUrl), {
    licenseKey: trimmedKey,
    deviceId,
    machineName: window.navigator.userAgent,
    appVersion: context?.version || "unknown",
    edition: "enterprise",
  });

  if (!data.valid || !data.activationToken) {
    throw new Error("Enterprise product key activation was rejected.");
  }

  const record = toLicenseRecord(data, deviceId);
  saveEnterpriseLicenseRecord(record);
  return record;
}

export async function validateEnterpriseLicense(licenseServerUrl?: string | null) {
  const record = getEnterpriseLicenseRecord();
  if (!record) {
    return null;
  }

  const context = await getDesktopContext();
  const data = await enterpriseRequest<EnterpriseActivationResponse>(validateUrl(licenseServerUrl), {
    activationToken: record.activationToken,
    deviceId: record.deviceId,
    appVersion: context?.version || "unknown",
    edition: "enterprise",
  }, {
    Authorization: `Bearer ${record.activationToken}`,
    "X-Device-Id": record.deviceId,
  });

  if (!data.valid) {
    throw new Error("Enterprise license validation was rejected.");
  }

  const nextRecord = {
    ...toLicenseRecord(data, record.deviceId),
    activatedAt: record.activatedAt,
  };
  saveEnterpriseLicenseRecord(nextRecord);
  return nextRecord;
}
