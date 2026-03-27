import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { validatePowerShellScript } from "./validation";
import type { ValidationResult } from "@shared/schema";
import OpenAI from "openai";
import { searchTasks, getTaskById, getPlatforms, type TaskSummary, type TaskParameter } from "./task-registry";

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

  // ── Phase 2: Script fetch ─────────────────────────────────────────────────

  // GET /cli/scripts/:id — fetch full script content for `psforge run`
  app.get("/cli/scripts/:id", cliRequireAuth, async (req, res) => {
    try {
      const script = await storage.getScript(req.params.id);
      if (!script || script.userId !== req.user!.id) {
        res.status(404).json(errResponse("Script not found"));
        return;
      }
      res.json(okResponse({
        id: script.id,
        name: script.name,
        description: script.description ?? null,
        content: script.content,
        createdAt: script.createdAt ?? null,
      }));
    } catch (err) {
      console.error("CLI /cli/scripts/:id error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // ── Phase 2: GUI Builder tasks ────────────────────────────────────────────

  // GET /cli/tasks/platforms — list all platforms with task counts (public)
  app.get("/cli/tasks/platforms", (req, res) => {
    try {
      const platforms = getPlatforms();
      res.json(okResponse(platforms));
    } catch (err) {
      console.error("CLI /cli/tasks/platforms error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // GET /cli/tasks — search GUI Builder tasks (public)
  // Query: ?search=&platformId=&category=&freeOnly=true&limit=20&offset=0
  app.get("/cli/tasks", (req, res) => {
    try {
      const {
        search,
        platformId,
        category,
        freeOnly,
        limit: limitStr,
        offset: offsetStr,
      } = req.query as Record<string, string | undefined>;

      const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;
      const offset = offsetStr ? Math.max(parseInt(offsetStr, 10) || 0, 0) : 0;

      const { tasks, total } = searchTasks({
        search: search ?? undefined,
        platformId: platformId ?? undefined,
        category: category ?? undefined,
        freeOnly: freeOnly === "true",
        limit,
        offset,
      });

      res.json(okResponse({ tasks, total, limit, offset }));
    } catch (err) {
      console.error("CLI /cli/tasks error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // GET /cli/tasks/:id — get task details + parameter definitions (public)
  app.get("/cli/tasks/:id", (req, res) => {
    try {
      const task = getTaskById(req.params.id);
      if (!task) {
        res.status(404).json(errResponse("Task not found"));
        return;
      }
      const { generate: _generate, ...summary } = task;
      res.json(okResponse(summary));
    } catch (err) {
      console.error("CLI /cli/tasks/:id error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/tasks/generate — generate a PowerShell script from a task (requireAuth)
  // Premium tasks additionally require subscriber role.
  // Request: { taskId: string, parameters: Record<string, string>, saveToLibrary?: boolean, scriptName?: string }
  // Response: { taskId, taskName, platform, script, saved?: { id, name } }
  app.post("/cli/tasks/generate", cliRequireAuth, async (req, res) => {
    try {
      const {
        taskId,
        parameters,
        saveToLibrary,
        scriptName,
      } = req.body as {
        taskId?: string;
        parameters?: Record<string, string>;
        saveToLibrary?: boolean;
        scriptName?: string;
      };

      if (!taskId || typeof taskId !== "string") {
        res.status(400).json(errResponse("taskId (string) is required"));
        return;
      }

      const task = getTaskById(taskId);
      if (!task) {
        res.status(404).json(errResponse("Task not found"));
        return;
      }

      // Premium tasks require Pro subscription
      if (task.isPremium) {
        const role = req.user!.role;
        if (role !== "subscriber" && role !== "admin") {
          res.status(403).json(errResponse("This task requires a Pro subscription"));
          return;
        }
      }

      const params = parameters ?? {};
      let script: string;
      try {
        script = task.generate(params);
      } catch {
        res.status(422).json(errResponse("Failed to generate script — check your parameters"));
        return;
      }

      interface GenerateResult {
        taskId: string;
        taskName: string;
        platform: string;
        script: string;
        saved?: { id: string; name: string };
      }

      const result: GenerateResult = {
        taskId: task.id,
        taskName: task.name,
        platform: task.platform,
        script,
      };

      // Optionally save to the user's script library
      if (saveToLibrary) {
        const name = scriptName?.trim() || task.name;
        const saved = await storage.createScript({
          userId: req.user!.id,
          name,
          content: script,
          description: task.description,
          taskCategory: task.platform,
          taskName: task.name,
          isFavorite: false,
        });
        result.saved = { id: saved.id as string, name: saved.name };
      }

      res.json(okResponse(result));
    } catch (err) {
      console.error("CLI /cli/tasks/generate error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // ── Phase 2: Marketplace templates ───────────────────────────────────────

  // GET /cli/templates — search approved marketplace templates (public)
  // Query: ?search=&categoryId=&sort=popular|recent|az&limit=20&offset=0
  app.get("/cli/templates", async (req, res) => {
    try {
      const {
        search,
        categoryId,
        sort,
        limit: limitStr,
        offset: offsetStr,
      } = req.query as Record<string, string | undefined>;

      const filters: { status: string; categoryId?: string } = { status: "approved" };
      if (categoryId) filters.categoryId = categoryId;

      let templates = await storage.getAllTemplates(filters);

      // Text search
      if (search) {
        const q = search.toLowerCase();
        templates = templates.filter(
          t =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q),
        );
      }

      // Sort
      if (sort === "popular") {
        templates = templates.sort((a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0));
      } else if (sort === "recent") {
        templates = templates.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        );
      } else {
        // default: alphabetical
        templates = templates.sort((a, b) => a.title.localeCompare(b.title));
      }

      const total = templates.length;
      const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;
      const offset = offsetStr ? Math.max(parseInt(offsetStr, 10) || 0, 0) : 0;
      const page = templates.slice(offset, offset + limit);

      const data = page.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        categoryId: t.categoryId ?? null,
        downloads: t.downloadCount ?? 0,
        rating: t.averageRating ?? null,
        isPaid: t.isPaid ?? false,
        priceCents: t.priceCents ?? null,
        createdAt: t.createdAt ?? null,
      }));

      res.json(okResponse({ templates: data, total, limit, offset }));
    } catch (err) {
      console.error("CLI /cli/templates error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // GET /cli/templates/:id — get template details + content (public)
  app.get("/cli/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template || template.status !== "approved") {
        res.status(404).json(errResponse("Template not found"));
        return;
      }
      res.json(okResponse({
        id: template.id,
        title: template.title,
        description: template.description,
        content: template.content,
        categoryId: template.categoryId ?? null,
        downloads: template.downloadCount ?? 0,
        rating: template.averageRating ?? null,
        isPaid: template.isPaid ?? false,
        priceCents: template.priceCents ?? null,
        createdAt: template.createdAt ?? null,
      }));
    } catch (err) {
      console.error("CLI /cli/templates/:id error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });

  // POST /cli/templates/:id/install — install a template into user's script library (requireAuth)
  // Paid templates are blocked unless user has purchased them.
  // Response: { installed: { id, name } }
  app.post("/cli/templates/:id/install", cliRequireAuth, async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template || template.status !== "approved") {
        res.status(404).json(errResponse("Template not found"));
        return;
      }

      // Block paid templates without purchase
      if (template.isPaid && template.priceCents && template.priceCents > 0) {
        const purchase = await storage.getTemplatePurchase(req.user!.id, template.id as string);
        if (!purchase) {
          res.status(403).json(errResponse("This is a paid template — purchase it first on the PSForge marketplace"));
          return;
        }
      }

      const script = await storage.createScript({
        userId: req.user!.id,
        name: template.title,
        content: template.content,
        description: template.description,
        taskCategory: "Template",
        taskName: template.title,
        isFavorite: false,
      });

      res.json(okResponse({ installed: { id: script.id as string, name: script.name } }));
    } catch (err) {
      console.error("CLI /cli/templates/:id/install error:", err);
      res.status(500).json(errResponse("Internal server error"));
    }
  });
}
