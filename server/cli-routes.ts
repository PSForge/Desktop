import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth, requireSubscriber } from "./middleware/auth";
import { validatePowerShellScript } from "./validation";
import { analyzeLogFile } from "./ai-troubleshooter";
import { generateScriptDocumentation } from "./ai-optimizer";

function ok(data: any) {
  return { ok: true, data };
}

function fail(error: string, status = 400) {
  return { ok: false, error, status };
}

export function registerCliRoutes(app: Express) {
  // GET /api/cli/scripts — list authenticated user's saved scripts (requires auth only)
  app.get("/api/cli/scripts", requireAuth, async (req, res) => {
    try {
      const scripts = await storage.getUserScripts(req.user!.id);
      const simplified = scripts.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || null,
        taskCategory: s.taskCategory || null,
        taskName: s.taskName || null,
        isFavorite: s.isFavorite,
        createdAt: s.createdAt,
        lastAccessed: s.lastAccessed || null,
        contentLength: s.content.length,
      }));
      return res.json(ok(simplified));
    } catch (err) {
      console.error("CLI /scripts error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // GET /api/cli/scripts/:id — fetch a specific script by ID (requires auth only)
  app.get("/api/cli/scripts/:id", requireAuth, async (req, res) => {
    try {
      const script = await storage.getScript(req.params.id);
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ ok: false, error: "Script not found" });
      }
      return res.json(ok(script));
    } catch (err) {
      console.error("CLI /scripts/:id error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // POST /api/cli/validate — validate a PowerShell script (requires auth only)
  app.post("/api/cli/validate", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ ok: false, error: "content (string) is required" });
      }
      const result = validatePowerShellScript(content);
      return res.json(ok(result));
    } catch (err) {
      console.error("CLI /validate error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // POST /api/cli/diagnose — AI log file analysis (requires subscriber role)
  app.post("/api/cli/diagnose", requireSubscriber, async (req, res) => {
    try {
      const { logContent, platform, context } = req.body;
      if (!logContent || typeof logContent !== "string") {
        return res.status(400).json({ ok: false, error: "logContent (string) is required" });
      }
      if (!platform || typeof platform !== "string") {
        return res.status(400).json({ ok: false, error: "platform (string) is required" });
      }

      const result = await analyzeLogFile(logContent, platform, context || undefined);

      // Track analytics
      try {
        await storage.createUsageMetric({
          userId: req.user!.id,
          metricType: "log_analysis",
          value: result.issues.length,
          metadata: {
            platform: result.platform,
            totalIssues: result.issues.length,
            criticalCount: result.issues.filter(i => i.severity === "critical").length,
            errorCount: result.issues.filter(i => i.severity === "error").length,
            warningCount: result.issues.filter(i => i.severity === "warning").length,
            infoCount: result.issues.filter(i => i.severity === "info").length,
            source: "cli",
          },
          recordedAt: new Date().toISOString(),
        });
      } catch {
        // analytics failure must not block the response
      }

      return res.json(ok(result));
    } catch (err) {
      console.error("CLI /diagnose error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // POST /api/cli/explain — AI script documentation (requires subscriber role)
  app.post("/api/cli/explain", requireSubscriber, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ ok: false, error: "content (string) is required" });
      }
      const documentation = await generateScriptDocumentation(content);
      return res.json(ok({ documentation }));
    } catch (err) {
      console.error("CLI /explain error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });
}
