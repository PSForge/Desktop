import type { Request, Response, NextFunction } from "express";
import { getUserFromSession } from "../auth";
import type { User, FeatureAccess, UserRole } from "@shared/schema";
import { freeTierCategories } from "@shared/schema";
import { storage } from "../storage";
import { createHash } from "crypto";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: { id: string };
      featureAccess?: FeatureAccess;
    }
  }
}

export async function attachUser(req: Request, res: Response, next: NextFunction) {
  // Try Bearer token first (for CLI Companion API key auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7).trim();
    if (rawKey) {
      try {
        const keyHash = createHash("sha256").update(rawKey).digest("hex");
        const apiKey = await storage.getApiKeyByHash(keyHash);
        if (apiKey) {
          const user = await storage.getUserById(apiKey.userId);
          if (user) {
            req.user = user;
            const featureAccess = await getFeatureAccess(user);
            req.featureAccess = featureAccess;
            // Update last used async — don't block request
            storage.updateApiKeyLastUsed(apiKey.id).catch(() => {});
            return next();
          }
        }
      } catch {
        // fall through to session auth
      }
    }
  }

  // Fall back to session cookie auth
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    const user = await getUserFromSession(sessionId);
    if (user) {
      req.user = user;
      req.session = { id: sessionId };
      
      const featureAccess = await getFeatureAccess(user);
      req.featureAccess = featureAccess;
    }
  }
  
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireSubscriber(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== "subscriber" && req.user.role !== "admin") {
    return res.status(403).json({ 
      error: "Subscription required",
      message: "This feature requires an active subscription"
    });
  }
  
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ 
      error: "Admin access required",
      message: "This feature requires administrator privileges"
    });
  }
  
  next();
}

async function getFeatureAccess(user: User): Promise<FeatureAccess> {
  const isSubscriberOrAdmin = user.role === "subscriber" || user.role === "admin";
  
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
  
  const accessibleCategories = isSubscriberOrAdmin 
    ? allCategories 
    : Array.from(freeTierCategories);
  
  const restrictedCategories = isSubscriberOrAdmin
    ? []
    : allCategories.filter(cat => !freeTierCategories.includes(cat as any));
  
  return {
    hasAIAccess: isSubscriberOrAdmin,
    hasPremiumCategories: isSubscriberOrAdmin,
    accessibleCategories,
    restrictedCategories,
  };
}
