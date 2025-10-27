import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { User, Session } from "@shared/schema";

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUserSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<Session> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await storage.createSession({
    userId,
    expiresAt: expiresAt.toISOString(),
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
  });

  return session;
}

export async function getUserFromSession(sessionId: string): Promise<User | null> {
  const session = await storage.getSession(sessionId);
  if (!session) {
    return null;
  }

  const user = await storage.getUserById(session.userId);
  return user || null;
}

export async function deleteUserSession(sessionId: string): Promise<boolean> {
  return storage.deleteSession(sessionId);
}

export async function cleanupExpiredSessions(): Promise<void> {
  await storage.deleteExpiredSessions();
}
