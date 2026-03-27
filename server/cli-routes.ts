import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth, requireSubscriber } from "./middleware/auth";
import { validatePowerShellScript } from "./validation";
import OpenAI from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

function okResponse(data: any) {
  return { ok: true, data };
}

export function registerCliRoutes(app: Express) {
  // GET /cli/scripts — list user's saved scripts (minimal list, requireAuth)
  app.get("/cli/scripts", requireAuth, async (req, res) => {
    try {
      const scripts = await storage.getUserScripts(req.user!.id);
      const data = scripts.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description ?? null,
        taskCategory: s.taskCategory ?? null,
        isFavorite: s.isFavorite,
        createdAt: s.createdAt,
      }));
      return res.json(okResponse({ scripts: data, total: data.length }));
    } catch (err) {
      console.error("CLI /cli/scripts error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // GET /cli/scripts/:id — fetch a specific script (requireAuth)
  app.get("/cli/scripts/:id", requireAuth, async (req, res) => {
    try {
      const script = await storage.getScript(req.params.id);
      if (!script || script.userId !== req.user!.id) {
        return res.status(404).json({ ok: false, error: "Script not found" });
      }
      return res.json(okResponse(script));
    } catch (err) {
      console.error("CLI /cli/scripts/:id error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // POST /cli/validate — validate a PowerShell script (requireAuth)
  // Request: { script: string }
  // Response: { valid, score, issues: [{severity, message, line, suggestion}] }
  app.post("/cli/validate", requireAuth, async (req, res) => {
    try {
      const { script } = req.body;
      if (!script || typeof script !== "string") {
        return res.status(400).json({ ok: false, error: "script (string) is required" });
      }
      const raw = validatePowerShellScript(script);
      const issues = (raw.errors || []).map((e: any) => ({
        severity: e.severity === "error" ? "critical" : (e.severity || "warning"),
        message: e.message,
        line: e.line ?? null,
        suggestion: null,
      }));
      return res.json(okResponse({
        valid: raw.isValid,
        score: raw.isValid ? 100 : Math.max(0, 100 - issues.length * 20),
        issues,
      }));
    } catch (err) {
      console.error("CLI /cli/validate error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // POST /cli/diagnose — AI error code / error message diagnosis (requireSubscriber)
  // Request: { input: string, context?: string }
  // Response: { input, title, summary, likelyCauses, recommendedFixes, powershellScript, confidence, additionalResources }
  app.post("/cli/diagnose", requireSubscriber, async (req, res) => {
    try {
      const { input, context } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ ok: false, error: "input (string) is required" });
      }

      const openai = getOpenAIClient();

      const systemPrompt = `You are an expert IT systems engineer and PowerShell specialist. You diagnose Windows errors, error codes, and system messages with precision.

Given an error code, error message, or system issue string, provide a structured diagnosis. Always respond with valid JSON matching this schema:
{
  "input": "string - the original input",
  "title": "string - short descriptive title for the error",
  "summary": "string - 2-3 sentence summary of what this error means",
  "likelyCauses": [
    { "cause": "string", "confidence": number }
  ],
  "recommendedFixes": ["string - actionable fix step"],
  "powershellScript": "string - PowerShell diagnostic/remediation script (optional, omit if not applicable)",
  "confidence": "High | Medium | Low",
  "additionalResources": ["string - Microsoft KB or documentation URL"]
}

Guidelines:
- likelyCauses should have percentages that sum to ~100
- Include 1-4 causes ordered by confidence descending
- PowerShell script should be ready to run, with error handling and comments
- additionalResources should be real Microsoft support URLs when applicable`;

      const userMessage = `Error/Issue: ${input}${context ? `\nContext: ${context}` : ""}

Diagnose this issue and provide structured troubleshooting guidance.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      const result = JSON.parse(content);

      // Track analytics
      try {
        await storage.createUsageMetric({
          userId: req.user!.id,
          metricType: "cli_diagnose",
          value: 1,
          metadata: { source: "cli" },
          recordedAt: new Date().toISOString(),
        });
      } catch { /* analytics failure must not block */ }

      return res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/diagnose error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  // POST /cli/explain — AI plain-English explanation of script/error/log (requireSubscriber)
  // Request: { input: string, inputType?: "script" | "error" | "log" }
  // Response: { explanation, keyPoints, suggestedNextSteps, potentialRisks }
  app.post("/cli/explain", requireSubscriber, async (req, res) => {
    try {
      const { input, inputType } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ ok: false, error: "input (string) is required" });
      }

      const type = inputType || "script";
      const openai = getOpenAIClient();

      const systemPrompt = `You are a senior IT engineer and PowerShell expert who explains technical content clearly. Your audience is IT administrators who want to quickly understand what something does and what to do next.

Given a PowerShell script, error message, or log excerpt, provide a clear explanation. Always respond with valid JSON:
{
  "explanation": "string - clear, plain-English explanation of what this does/means",
  "keyPoints": ["string - important bullet point"],
  "suggestedNextSteps": ["string - actionable next step"],
  "potentialRisks": ["string - risk or caveat to be aware of (optional, omit array if none)"]
}

Keep explanations practical and concise. Focus on what IT admins need to know to act.`;

      const typeHint = type === "script" ? "PowerShell script" : type === "error" ? "error message or code" : "log excerpt";
      const userMessage = `${typeHint.charAt(0).toUpperCase() + typeHint.slice(1)}:\n\`\`\`\n${input.slice(0, 8000)}\n\`\`\`\n\nExplain this ${typeHint} in plain English.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      const result = JSON.parse(content);

      return res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/explain error:", err);
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });
}
