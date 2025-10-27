import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import { getAIHelperResponse } from "./ai-helper";
import { hashPassword, verifyPassword, createUserSession, deleteUserSession } from "./auth";
import { 
  insertScriptSchema, 
  insertValidationRequestSchema,
  insertUserSchema,
  loginSchema,
  type ValidationResult 
} from "@shared/schema";
import { attachUser, requireAuth, requireSubscriber, requireAdmin } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(attachUser);

  app.post("/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid registration data",
          details: parsed.error.errors
        });
      }

      const { email, password, name } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: "Email already registered"
        });
      }

      const passwordHash = await hashPassword(password);

      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        role: "free",
        stripeCustomerId: null,
      });

      const session = await createUserSession(
        user.id,
        req.headers["user-agent"],
        req.ip
      );

      res.cookie("sessionId", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({
        error: "Internal server error during registration"
      });
    }
  });

  app.post("/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid login data",
          details: parsed.error.errors
        });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      const session = await createUserSession(
        user.id,
        req.headers["user-agent"],
        req.ip
      );

      res.cookie("sessionId", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        error: "Internal server error during login"
      });
    }
  });

  app.post("/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      
      if (sessionId) {
        await deleteUserSession(sessionId);
      }

      res.clearCookie("sessionId");
      return res.status(204).send();
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({
        error: "Internal server error during logout"
      });
    }
  });

  app.get("/auth/me", requireAuth, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription(req.user!.id);
      
      return res.json({
        user: {
          id: req.user!.id,
          email: req.user!.email,
          name: req.user!.name,
          role: req.user!.role,
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        } : null,
        featureAccess: req.featureAccess,
      });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({
        error: "Internal server error"
      });
    }
  });

  app.post("/api/validate", async (req, res) => {
    try {
      const parsed = insertValidationRequestSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parsed.error.errors
        });
      }

      const { code } = parsed.data;
      const result: ValidationResult = validatePowerShellScript(code);

      return res.json(result);
    } catch (error) {
      console.error("Validation error:", error);
      return res.status(500).json({
        error: "Internal server error during validation"
      });
    }
  });

  app.post("/api/ai-helper", requireSubscriber, async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "Invalid request: message is required"
        });
      }

      const sanitizedHistory = Array.isArray(conversationHistory) 
        ? conversationHistory
            .slice(-10)
            .filter((msg: any) => 
              msg && 
              typeof msg === 'object' &&
              (msg.role === 'user' || msg.role === 'assistant') &&
              typeof msg.content === 'string'
            )
            .map((msg: any) => ({
              role: msg.role,
              content: msg.content.substring(0, 5000)
            }))
        : [];

      const result = await getAIHelperResponse(message, sanitizedHistory);

      return res.json(result);
    } catch (error) {
      console.error("AI helper error:", error);
      return res.status(500).json({
        error: "Failed to get AI response",
        response: "I'm having trouble connecting right now. Please try again.",
        suggestions: []
      });
    }
  });

  app.post("/api/scripts", async (req, res) => {
    try {
      const parsed = insertScriptSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid script data",
          details: parsed.error.errors
        });
      }

      const script = await storage.createScript(parsed.data);
      return res.status(201).json(script);
    } catch (error) {
      console.error("Error creating script:", error);
      return res.status(500).json({
        error: "Internal server error while creating script"
      });
    }
  });

  app.get("/api/scripts", async (_req, res) => {
    try {
      const scripts = await storage.getAllScripts();
      return res.json(scripts);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      return res.status(500).json({
        error: "Internal server error while fetching scripts"
      });
    }
  });

  app.get("/api/scripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      return res.json(script);
    } catch (error) {
      console.error("Error fetching script:", error);
      return res.status(500).json({
        error: "Internal server error while fetching script"
      });
    }
  });

  app.put("/api/scripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = insertScriptSchema.partial().safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid script data",
          details: parsed.error.errors
        });
      }

      const updated = await storage.updateScript(id, parsed.data);
      
      if (!updated) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating script:", error);
      return res.status(500).json({
        error: "Internal server error while updating script"
      });
    }
  });

  app.delete("/api/scripts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteScript(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Script not found"
        });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting script:", error);
      return res.status(500).json({
        error: "Internal server error while deleting script"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
