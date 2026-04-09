import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type DesktopDeviceSession = {
  deviceCode: string;
  userCode: string;
  status: "pending" | "approved" | "consumed";
  createdAt: number;
  expiresAt: number;
  approvedAt?: number;
  userId?: string;
};

type DesktopTokenPayload = {
  userId: string;
  exp: number;
  iat: number;
  typ: "desktop";
};

const DEVICE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const deviceSessions = new Map<string, DesktopDeviceSession>();
const userCodeIndex = new Map<string, string>();

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function getDesktopAuthSecret() {
  return process.env.DESKTOP_AUTH_SECRET || process.env.STRIPE_SECRET_KEY || "psforge-desktop-dev-secret";
}

function signPayload(payload: DesktopTokenPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getDesktopAuthSecret())
    .update(encodedPayload)
    .digest();

  return `psfd_${encodedPayload}.${base64UrlEncode(signature)}`;
}

export function createDesktopAccessToken(userId: string) {
  return signPayload({
    userId,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
    typ: "desktop",
  });
}

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [deviceCode, session] of deviceSessions.entries()) {
    if (session.expiresAt <= now) {
      deviceSessions.delete(deviceCode);
      userCodeIndex.delete(session.userCode);
    }
  }
}

function createUserCode() {
  const raw = randomBytes(4).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function createDesktopDeviceSession() {
  cleanupExpiredSessions();

  const deviceCode = randomBytes(24).toString("hex");
  const userCode = createUserCode();
  const now = Date.now();

  const session: DesktopDeviceSession = {
    deviceCode,
    userCode,
    status: "pending",
    createdAt: now,
    expiresAt: now + DEVICE_TTL_MS,
  };

  deviceSessions.set(deviceCode, session);
  userCodeIndex.set(userCode, deviceCode);

  return session;
}

export function approveDesktopDeviceSession(userCode: string, userId: string) {
  cleanupExpiredSessions();

  const normalizedUserCode = userCode.trim().toUpperCase();
  const deviceCode = userCodeIndex.get(normalizedUserCode);
  if (!deviceCode) {
    return null;
  }

  const session = deviceSessions.get(deviceCode);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) {
      deviceSessions.delete(deviceCode);
      userCodeIndex.delete(session.userCode);
    }
    return null;
  }

  session.status = "approved";
  session.userId = userId;
  session.approvedAt = Date.now();

  return session;
}

export function consumeDesktopDeviceSession(deviceCode: string) {
  cleanupExpiredSessions();

  const session = deviceSessions.get(deviceCode);
  if (!session) {
    return { status: "not_found" as const };
  }

  if (session.expiresAt <= Date.now()) {
    deviceSessions.delete(deviceCode);
    userCodeIndex.delete(session.userCode);
    return { status: "expired" as const };
  }

  if (session.status === "pending") {
    return { status: "pending" as const, expiresAt: session.expiresAt };
  }

  if (session.status === "consumed" || !session.userId) {
    return { status: "consumed" as const };
  }

  session.status = "consumed";
  deviceSessions.delete(deviceCode);
  userCodeIndex.delete(session.userCode);

  return {
    status: "approved" as const,
    token: createDesktopAccessToken(session.userId),
  };
}

export function verifyDesktopAccessToken(rawToken: string) {
  if (!rawToken.startsWith("psfd_")) {
    return null;
  }

  const trimmed = rawToken.slice(5);
  const [payloadPart, signaturePart] = trimmed.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getDesktopAuthSecret())
    .update(payloadPart)
    .digest();
  const providedSignature = base64UrlDecode(signaturePart);

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8")) as DesktopTokenPayload;
  if (payload.typ !== "desktop" || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}
