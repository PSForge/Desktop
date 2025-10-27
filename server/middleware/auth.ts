import type { Request, Response, NextFunction } from "express";
import { getUserFromSession } from "../auth";
import type { User, FeatureAccess, UserRole } from "@shared/schema";
import { freeTierCategories } from "@shared/schema";
import { storage } from "../storage";

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
