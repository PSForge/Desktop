import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import { getAIHelperResponse } from "./ai-helper";
import { 
  insertScriptSchema, 
  insertValidationRequestSchema,
  type ValidationResult 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/ai-helper", async (req, res) => {
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
