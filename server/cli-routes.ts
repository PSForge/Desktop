import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import type { ValidationResult } from "@shared/schema";
import OpenAI from "openai";

// ── OpenAI ───────────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

// ── Response envelopes ────────────────────────────────────────────────────────

interface CliOkResponse<T> {
  ok: true;
  data: T;
}

interface CliErrorResponse {
  ok: false;
  data: null;
  error: string;
}

function okResponse<T>(data: T): CliOkResponse<T> {
  return { ok: true, data };
}

function errResponse(message: string): CliErrorResponse {
  return { ok: false, data: null, error: message };
}

// ── CLI-specific auth middleware ───────────────────────────────────────────────

function cliRequireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(errResponse("Authentication required"));
    return;
  }
  next();
}

function cliRequireSubscriber(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(errResponse("Authentication required"));
    return;
  }
  if (req.user.role !== "subscriber" && req.user.role !== "admin") {
    res.status(403).json(errResponse("Pro subscription required to access this feature"));
    return;
  }
  next();
}

// ── Response types ────────────────────────────────────────────────────────────

interface CliScriptItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | null;
}

interface CliValidateIssue {
  severity: "critical" | "warning" | "info";
  message: string;
  line: number | null;
  suggestion: null;
}

interface CliValidateResult {
  valid: boolean;
  score: number;
  issues: CliValidateIssue[];
}

interface CliLikelyCause {
  cause: string;
  confidence: number;
}

interface CliDiagnoseResult {
  input: string;
  title: string;
  summary: string;
  likelyCauses: CliLikelyCause[];
  recommendedFixes: string[];
  powershellScript: string;
  confidence: "High" | "Medium" | "Low";
  additionalResources: string[];
}

interface CliExplainResult {
  explanation: string;
  keyPoints: string[];
  suggestedNextSteps: string[];
  potentialRisks: string[];
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerCliRoutes(app: Express): void {
  // GET /cli/scripts — minimal list of user's saved scripts
  app.get("/cli/scripts", cliRequireAuth, async (req, res) => {
    try {
      const scripts = await storage.getUserScripts(req.user!.id);
      const data: CliScriptItem[] = scripts
        .filter((s): s is typeof s & { id: string } => typeof s.id === "string")
        .map(s => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
          createdAt: s.createdAt ?? null,
        }));
      res.json(okResponse(data));
    } catch (err) {
      console.error("CLI /cli/scripts error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/validate — validate a PowerShell script
  app.post("/cli/validate", cliRequireAuth, async (req, res) => {
    try {
      const { script } = req.body as { script?: string };
      if (!script || typeof script !== "string") {
        res.status(400).json(errResponse("script (string) is required"));
        return;
      }
      const raw: ValidationResult = validatePowerShellScript(script);
      const issues: CliValidateIssue[] = (raw.errors ?? []).map(e => ({
        severity: e.severity === "error" ? "critical" : (e.severity as "warning" | "info"),
        message: e.message,
        line: e.line ?? null,
        suggestion: null,
      }));
      const result: CliValidateResult = {
        valid: raw.isValid,
        score: raw.isValid ? 100 : Math.max(0, 100 - issues.length * 20),
        issues,
      };
      res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/validate error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/diagnose — AI error code / error message root-cause diagnosis
  app.post("/cli/diagnose", cliRequireSubscriber, async (req, res) => {
    try {
      const { input, context } = req.body as { input?: string; context?: string };
      if (!input || typeof input !== "string") {
        res.status(400).json(errResponse("input (string) is required"));
        return;
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
  "powershellScript": "string - PowerShell diagnostic/remediation script",
  "confidence": "High | Medium | Low",
  "additionalResources": ["string - Microsoft KB or documentation URL"]
}

Guidelines:
- likelyCauses confidence values should sum to ~100
- Include 1-4 causes ordered by confidence descending
- PowerShell script should be ready to run with comments
- additionalResources should be real Microsoft support URLs`;

      const userMessage = `Error/Issue: ${input}${context ? `\nContext: ${context}` : ""}\n\nDiagnose this issue and provide structured troubleshooting guidance.`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2000,
      });

      const content = aiResponse.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      const result = JSON.parse(content) as CliDiagnoseResult;

      // Track analytics (non-blocking)
      storage.createUsageMetric({
        userId: req.user!.id,
        metricType: "cli_diagnose",
        value: 1,
        metadata: { source: "cli" },
        recordedAt: new Date().toISOString(),
      }).catch(() => {});

      res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/diagnose error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/explain — AI plain-English explanation of script/error/log
  app.post("/cli/explain", cliRequireSubscriber, async (req, res) => {
    try {
      const { input, inputType } = req.body as { input?: string; inputType?: "script" | "error" | "log" };
      if (!input || typeof input !== "string") {
        res.status(400).json(errResponse("input (string) is required"));
        return;
      }

      const type: "script" | "error" | "log" =
        inputType === "error" || inputType === "log" ? inputType : "script";

      const openai = getOpenAIClient();

      const systemPrompt = `You are a senior IT engineer and PowerShell expert who explains technical content clearly. Your audience is IT administrators who want to quickly understand what something does and what to do next.

Always respond with valid JSON:
{
  "explanation": "string - clear, plain-English explanation of what this does/means",
  "keyPoints": ["string - important bullet point"],
  "suggestedNextSteps": ["string - actionable next step"],
  "potentialRisks": ["string - risk or caveat (omit array if none)"]
}

Keep explanations practical and concise. Focus on what IT admins need to know to act.`;

      const typeHint =
        type === "script" ? "PowerShell script" : type === "error" ? "error message or code" : "log excerpt";
      const userMessage = `${typeHint.charAt(0).toUpperCase() + typeHint.slice(1)}:\n\`\`\`\n${input.slice(0, 8000)}\n\`\`\`\n\nExplain this ${typeHint} in plain English.`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1500,
      });

      const content = aiResponse.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      const result = JSON.parse(content) as CliExplainResult;

      res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/explain error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });
}
