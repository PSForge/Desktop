import OpenAI from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

export interface TroubleshootIssue {
  severity: "critical" | "error" | "warning" | "info";
  title: string;
  description: string;
  location?: string;
  fix: string;
  powershellFix?: string;
}

export interface TroubleshootWorkaround {
  title: string;
  description: string;
  steps: string[];
  powershellScript?: string;
}

export interface TroubleshootResult {
  summary: string;
  platform: string;
  logType: string;
  issues: TroubleshootIssue[];
  workarounds: TroubleshootWorkaround[];
  rootCause: string;
  preventionTips: string[];
}

export async function analyzeLogFile(
  logContent: string,
  platform: string,
  context?: string
): Promise<TroubleshootResult> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are an expert IT systems engineer and PowerShell automation specialist with deep expertise in troubleshooting enterprise IT environments. You specialize in diagnosing issues from log files across all major Microsoft and third-party IT platforms.

Your task is to analyze log files and provide actionable troubleshooting guidance including:
1. Identification of specific errors, warnings, and anomalies
2. Root cause analysis 
3. Step-by-step fix recommendations with PowerShell scripts where applicable
4. Workarounds for immediate relief while permanent fixes are applied
5. Prevention tips to avoid recurrence

Always respond with valid JSON matching this exact schema:
{
  "summary": "string - Brief overview of what was found in the log",
  "platform": "string - Detected or confirmed platform name",
  "logType": "string - Type of log detected (Application Event Log, System Log, Service Log, etc.)",
  "rootCause": "string - Primary root cause identified from the log analysis",
  "issues": [
    {
      "severity": "critical|error|warning|info",
      "title": "string - Short issue title",
      "description": "string - Detailed description of the issue found",
      "location": "string - Where in the log this was found (optional)",
      "fix": "string - Plain English fix description",
      "powershellFix": "string - PowerShell script to fix this issue (optional, only if applicable)"
    }
  ],
  "workarounds": [
    {
      "title": "string - Workaround title",
      "description": "string - Why this workaround helps",
      "steps": ["string - Step 1", "string - Step 2"],
      "powershellScript": "string - Complete PowerShell script for this workaround (optional)"
    }
  ],
  "preventionTips": ["string - Tip 1", "string - Tip 2"]
}

Guidelines:
- If a PowerShell fix is not applicable for an issue, omit the powershellFix field
- Include at least 1-3 issues identified from the log
- Include 1-2 workarounds where applicable
- PowerShell scripts should be production-ready, follow best practices, include error handling, and use proper comment-based help
- Be specific about error codes, timestamps, and log entries found
- Severity levels: critical = data loss/system down, error = functionality broken, warning = degraded performance/potential issue, info = noteworthy but not harmful`;

  const userMessage = `Platform: ${platform}
${context ? `Additional Context: ${context}\n` : ""}
Log File Content:
\`\`\`
${logContent.slice(0, 15000)}
\`\`\`

Analyze this log file and provide comprehensive troubleshooting recommendations.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const result = JSON.parse(content) as TroubleshootResult;
  return result;
}
