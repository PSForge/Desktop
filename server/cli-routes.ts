import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
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

function errResponse(message: string) {
  return { ok: false, data: null, error: message };
}

// CLI-specific auth middleware that always returns { ok: false, data: null, error } on failure
function cliRequireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json(errResponse("Authentication required"));
  }
  next();
}

function cliRequireSubscriber(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json(errResponse("Authentication required"));
  }
  if (req.user.role !== "subscriber" && req.user.role !== "admin") {
    return res.status(403).json(errResponse("Pro subscription required to access this feature"));
  }
  next();
}

export function registerCliRoutes(app: Express) {
  // GET /cli/scripts — list user's saved scripts (minimal list, requireAuth)
  // Returns: { ok, data: [{id, name, description, createdAt}] }
  app.get("/cli/scripts", cliRequireAuth, async (req, res) => {
    try {
      const scripts = await storage.getUserScripts(req.user!.id);
      const data = scripts.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description ?? null,
        createdAt: s.createdAt,
      }));
      return res.json(okResponse(data));
    } catch (err) {
      console.error("CLI /cli/scripts error:", err);
      return res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/validate — validate a PowerShell script (requireAuth)
  // Request: { script: string }
  // Response: { ok, data: { valid, score, issues: [{severity, message, line, suggestion}] } }
  app.post("/cli/validate", cliRequireAuth, async (req, res) => {
    try {
      const { script } = req.body;
      if (!script || typeof script !== "string") {
        return res.status(400).json(errResponse("script (string) is required"));
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
      return res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/diagnose — AI error code / error message diagnosis (requireSubscriber)
  // Request: { input: string, context?: string }
  // Response: { ok, data: { input, title, summary, likelyCauses, recommendedFixes, powershellScript, confidence, additionalResources } }
  app.post("/cli/diagnose", cliRequireSubscriber, async (req, res) => {
    try {
      const { input, context } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json(errResponse("input (string) is required"));
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
- likelyCauses confidence percentages should sum to ~100
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

      // Track analytics (non-blocking)
      storage.createUsageMetric({
        userId: req.user!.id,
        metricType: "cli_diagnose",
        value: 1,
        metadata: { source: "cli" },
        recordedAt: new Date().toISOString(),
      }).catch(() => {});

      return res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/diagnose error:", err);
      return res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/explain — AI plain-English explanation of script/error/log (requireSubscriber)
  // Request: { input: string, inputType?: "script" | "error" | "log" }
  // Response: { ok, data: { explanation, keyPoints, suggestedNextSteps, potentialRisks } }
  app.post("/cli/explain", cliRequireSubscriber, async (req, res) => {
    try {
      const { input, inputType } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json(errResponse("input (string) is required"));
      }

      const type = inputType || "script";
      const openai = getOpenAIClient();

      const systemPrompt = `You are a senior IT engineer and PowerShell expert who explains technical content clearly. Your audience is IT administrators who want to quickly understand what something does and what to do next.

Given a PowerShell script, error message, or log excerpt, provide a clear explanation. Always respond with valid JSON:
{
  "explanation": "string - clear, plain-English explanation of what this does/means",
  "keyPoints": ["string - important bullet point"],
  "suggestedNextSteps": ["string - actionable next step"],
  "potentialRisks": ["string - risk or caveat to be aware of (omit array if none)"]
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
      return res.status(500).json(errResponse("Internal server error"));
    }
  });
}
