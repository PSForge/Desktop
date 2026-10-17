export type ScriptParameterKind = "string" | "number" | "switch" | "array" | "path" | "securestring";

export interface ParsedScriptParameter {
  name: string;
  type: string;
  kind: ScriptParameterKind;
  required: boolean;
  defaultValue?: string;
  placeholder: string;
}

export interface PlaceholderToken {
  token: string;
  label: string;
  example: string;
}

export interface ModuleSuggestion {
  moduleName: string;
  reason: string;
  installCommand: string;
  importCommand: string;
  commonCommands: string[];
}

export interface PreflightIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "safety" | "quality" | "portability" | "readiness";
  title: string;
  description: string;
  recommendation?: string;
  line?: number;
}

export interface ExecutionChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  suggested: boolean;
}

export interface ScriptExplanation {
  title: string;
  summary: string;
  primaryActions: string[];
  inputs: string[];
  sideEffects: string[];
  risks: string[];
  operatorNotes: string[];
}

export interface ScriptWorkbenchAnalysis {
  parameters: ParsedScriptParameter[];
  placeholders: PlaceholderToken[];
  moduleSuggestions: ModuleSuggestion[];
  issues: PreflightIssue[];
  checklist: ExecutionChecklistItem[];
  explanation: ScriptExplanation;
}

export interface EnvironmentDoctorCheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "action";
  detail: string;
  remediation?: string;
}

export interface OperationsSuitePlan {
  readinessScore: number;
  environmentChecks: EnvironmentDoctorCheck[];
  dependencyManifest: string;
  impactPreview: string[];
  rollbackPlan: string[];
  modernizationPlan: string[];
  pesterTestDraft: string;
  packagePlan: string;
  runbookDraft: string;
}

export interface RegexLabResult {
  ok: boolean;
  error?: string;
  matches: Array<{ value: string; index: number; groups: string[] }>;
  explanation: string[];
}

export interface PipelineStage {
  index: number;
  command: string;
  likelyInput: string;
  likelyOutput: string;
  notes: string[];
}

export interface CredentialLeakFinding {
  id: string;
  severity: "critical" | "warning";
  line: number;
  title: string;
  evidence: string;
  recommendation: string;
}

export interface CompatibilityFinding {
  target: string;
  status: "compatible" | "review" | "unsupported";
  notes: string[];
}

export interface CsvMappingResult {
  headers: string[];
  rows: string[][];
  suggestedParameterMap: Record<string, string>;
  previewObjects: Record<string, string>[];
}

const TEAM_FAVORITE_COMMAND_IDS = [
  "get-childitem",
  "test-connection",
  "get-service",
  "get-process",
  "copy-item",
  "remove-item",
];

const MODULE_DETECTION_RULES: Array<{
  moduleName: string;
  reason: string;
  installCommand: string;
  importCommand: string;
  commonCommands: string[];
  patterns: RegExp[];
}> = [
  {
    moduleName: "ExchangeOnlineManagement",
    reason: "Your script looks like it works with Exchange Online mailboxes or message traces.",
    installCommand: "Install-Module ExchangeOnlineManagement -Scope CurrentUser",
    importCommand: "Import-Module ExchangeOnlineManagement",
    commonCommands: ["Connect-ExchangeOnline", "Get-EXOMailbox", "Get-MessageTrace"],
    patterns: [/\bConnect-ExchangeOnline\b/i, /\bGet-EXO[A-Za-z]+\b/i, /\bGet-MessageTrace\b/i],
  },
  {
    moduleName: "Microsoft.Graph",
    reason: "Your script looks like it uses Microsoft Graph cmdlets for M365, Entra ID, or Intune work.",
    installCommand: "Install-Module Microsoft.Graph -Scope CurrentUser",
    importCommand: "Import-Module Microsoft.Graph",
    commonCommands: ["Connect-MgGraph", "Get-MgUser", "Get-MgDeviceManagementManagedDevice"],
    patterns: [/\bConnect-MgGraph\b/i, /\bGet-Mg[A-Za-z]+\b/i, /\bUpdate-Mg[A-Za-z]+\b/i],
  },
  {
    moduleName: "Az",
    reason: "Your script looks like it manages Azure resources or subscriptions.",
    installCommand: "Install-Module Az -Scope CurrentUser",
    importCommand: "Import-Module Az",
    commonCommands: ["Connect-AzAccount", "Get-AzResource", "Get-AzVM"],
    patterns: [/\bConnect-AzAccount\b/i, /\bGet-Az[A-Za-z]+\b/i, /\bNew-Az[A-Za-z]+\b/i],
  },
  {
    moduleName: "ActiveDirectory",
    reason: "Your script looks like it manages on-prem Active Directory users, groups, or computers.",
    installCommand: "Install-WindowsFeature RSAT-AD-PowerShell",
    importCommand: "Import-Module ActiveDirectory",
    commonCommands: ["Get-ADUser", "Get-ADGroup", "Set-ADComputer"],
    patterns: [/\bGet-AD[A-Za-z]+\b/i, /\bSet-AD[A-Za-z]+\b/i, /\bNew-AD[A-Za-z]+\b/i],
  },
];

const DANGEROUS_COMMAND_RULES: Array<{
  title: string;
  description: string;
  recommendation: string;
  patterns: RegExp[];
}> = [
  {
    title: "Potentially destructive command detected",
    description: "This script includes commands that can delete data, reformat paths, or make broad changes quickly.",
    recommendation: "Double-check target scope, run with test data first, and use -WhatIf where possible.",
    patterns: [/\bRemove-Item\b/i, /\bClear-EventLog\b/i, /\bFormat-Volume\b/i, /\bRemove-AD[A-Za-z]+\b/i],
  },
  {
    title: "Process or machine interruption detected",
    description: "This script includes commands that can restart computers, stop services, or terminate processes.",
    recommendation: "Confirm impact windows and rollback steps before running in production.",
    patterns: [/\bRestart-Computer\b/i, /\bStop-Process\b/i, /\bStop-Service\b/i, /\bRestart-Service\b/i],
  },
  {
    title: "Dynamic execution detected",
    description: "This script includes dynamic PowerShell execution that can be harder to audit safely.",
    recommendation: "Avoid Invoke-Expression unless the input is trusted and validated carefully.",
    patterns: [/\bInvoke-Expression\b/i, /\biex\b/i],
  },
];

const BUILT_IN_AUTOMATIC_VARIABLES = new Set([
  "_",
  "args",
  "env",
  "error",
  "false",
  "home",
  "host",
  "input",
  "lastexitcode",
  "matches",
  "null",
  "psboundparameters",
  "pscmdlet",
  "psscriptroot",
  "pwd",
  "true",
]);

function normalizeParameterKind(type: string): ScriptParameterKind {
  const normalized = type.replace(/[\[\]]/g, "").trim().toLowerCase();
  if (normalized.includes("switch") || normalized.includes("bool")) {
    return "switch";
  }
  if (normalized.includes("int") || normalized.includes("double") || normalized.includes("decimal")) {
    return "number";
  }
  if (normalized.includes("securestring")) {
    return "securestring";
  }
  if (normalized.includes("path")) {
    return "path";
  }
  if (normalized.includes("array") || normalized.endsWith("[]")) {
    return "array";
  }
  return "string";
}

function getParameterPlaceholder(kind: ScriptParameterKind, name: string) {
  switch (kind) {
    case "number":
      return `Enter ${name} as a number`;
    case "switch":
      return `Enable ${name} if needed`;
    case "array":
      return `Comma-separated ${name} values`;
    case "path":
      return `C:\\Path\\To\\${name}`;
    case "securestring":
      return `Enter ${name} securely`;
    default:
      return `Enter ${name}`;
  }
}

function findBalancedSection(source: string, keyword: string) {
  const match = new RegExp(`${keyword}\\s*\\(`, "i").exec(source);
  if (!match) {
    return "";
  }

  let depth = 0;
  let section = "";
  for (let index = match.index + keyword.length; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") {
      depth += 1;
      if (depth === 1) {
        continue;
      }
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        break;
      }
    }

    if (depth >= 1) {
      section += char;
    }
  }

  return section;
}

export function parseScriptParameters(script: string): ParsedScriptParameter[] {
  const paramBlock = findBalancedSection(script, "param");
  if (!paramBlock.trim()) {
    return [];
  }

  const entries = paramBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .split(/,(?=\s*(?:\[[^\]]+\]\s*)?(?:\[[^\]]+\]\s*)?\$)/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const parsedParameters: ParsedScriptParameter[] = [];

  for (const entry of entries) {
    const variableMatch = /\$([A-Za-z_][A-Za-z0-9_]*)/.exec(entry);
    if (!variableMatch) {
      continue;
    }

    const typeMatch = entry.match(/\[([A-Za-z0-9_.\[\]]+)\]\s*\$[A-Za-z_]/);
    const rawType = typeMatch?.[1] || "string";
    const defaultMatch = entry.match(/=\s*(.+)$/s);
    const required = /\bMandatory\s*=\s*\$true\b/i.test(entry) || /\[Parameter\s*\(\s*Mandatory\s*\)\s*\]/i.test(entry);

    const kind = normalizeParameterKind(rawType);
    parsedParameters.push({
      name: variableMatch[1],
      type: rawType,
      kind,
      required,
      defaultValue: defaultMatch?.[1]?.trim(),
      placeholder: getParameterPlaceholder(kind, variableMatch[1]),
    });
  }

  return parsedParameters;
}

export function detectPlaceholders(script: string): PlaceholderToken[] {
  const matches = new Map<string, PlaceholderToken>();
  const placeholderPatterns: Array<{ regex: RegExp; normalize: (match: string) => PlaceholderToken }> = [
    {
      regex: /<([A-Za-z][A-Za-z0-9 _-]{1,40})>/g,
      normalize: (match) => {
        const label = match.slice(1, -1);
        return { token: match, label, example: `Replace ${label} with your environment value` };
      },
    },
    {
      regex: /\{\{([A-Za-z][A-Za-z0-9 _-]{1,40})\}\}/g,
      normalize: (match) => {
        const label = match.slice(2, -2);
        return { token: match, label, example: `Replace ${label} before running` };
      },
    },
    {
      regex: /\bYOUR_[A-Z0-9_]{2,40}\b/g,
      normalize: (match) => ({ token: match, label: match.replace(/^YOUR_/, "").replace(/_/g, " "), example: "Replace this placeholder with a real value" }),
    },
    {
      regex: /C:\\Path\\To\\[A-Za-z0-9_.-]+/g,
      normalize: (match) => ({ token: match, label: "Windows path", example: "Replace the sample path with your real export or input location" }),
    },
  ];

  for (const pattern of placeholderPatterns) {
    for (const match of script.matchAll(pattern.regex)) {
      const token = match[0];
      if (!matches.has(token)) {
        matches.set(token, pattern.normalize(token));
      }
    }
  }

  return Array.from(matches.values());
}

function detectHardcodedTenantIssue(script: string): PreflightIssue | null {
  const match = /(contoso|fabrikam|[A-Za-z0-9-]+\.onmicrosoft\.com)/i.exec(script);
  if (!match) {
    return null;
  }

  const index = match.index ?? 0;
  return {
    id: `tenant-${index}`,
    severity: "warning",
    category: "portability",
    title: "Tenant or environment value appears hardcoded",
    description: `The script contains "${match[0]}", which looks environment-specific.`,
    recommendation: "Swap hardcoded tenant names and domains for parameters or placeholders before sharing broadly.",
    line: getLineNumberForIndex(script, index),
  };
}

function detectUndefinedVariableIssues(script: string, parameters: ParsedScriptParameter[]): PreflightIssue[] {
  const definedVariables = new Set<string>(parameters.map((param) => param.name.toLowerCase()));

  for (const match of script.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)\s*=/g)) {
    definedVariables.add(match[1].toLowerCase());
  }

  const issues = new Map<string, PreflightIssue>();
  for (const match of script.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const variableName = match[1];
    const normalized = variableName.toLowerCase();
    if (BUILT_IN_AUTOMATIC_VARIABLES.has(normalized) || definedVariables.has(normalized)) {
      continue;
    }

    if (!issues.has(normalized)) {
      issues.set(normalized, {
        id: `var-${normalized}`,
        severity: "warning",
        category: "quality",
        title: `Variable $${variableName} may be undefined`,
        description: `The script references $${variableName} without an obvious assignment or parameter declaration.`,
        recommendation: "Confirm this variable is set earlier in the script or turn it into a parameter.",
        line: getLineNumberForIndex(script, match.index ?? 0),
      });
    }
  }

  return Array.from(issues.values());
}

function detectBraceIssue(script: string): PreflightIssue | null {
  let braces = 0;
  let parentheses = 0;

  for (const char of script) {
    if (char === "{") braces += 1;
    if (char === "}") braces -= 1;
    if (char === "(") parentheses += 1;
    if (char === ")") parentheses -= 1;
  }

  if (braces !== 0 || parentheses !== 0) {
    return {
      id: "brace-balance",
      severity: "warning",
      category: "quality",
      title: "The script may have unbalanced braces or parentheses",
      description: "A quick structural check suggests the script may be missing a closing or opening symbol.",
      recommendation: "Run the Basic or Comprehensive validation panel before saving or executing.",
    };
  }

  return null;
}

function detectMissingErrorHandling(script: string): PreflightIssue | null {
  const hasRiskyCmdlets = DANGEROUS_COMMAND_RULES.some((rule) => rule.patterns.some((pattern) => pattern.test(script)));
  if (!hasRiskyCmdlets) {
    return null;
  }

  if (/\btry\s*\{/i.test(script) && /\bcatch\s*\{/i.test(script)) {
    return null;
  }

  return {
    id: "missing-error-handling",
    severity: "warning",
    category: "safety",
    title: "High-impact script is missing structured error handling",
    description: "The script makes potentially impactful changes but does not appear to wrap operations in try/catch blocks.",
    recommendation: "Add try/catch around the main action path so failures are easier to recover and log.",
  };
}

function detectWriteHostUsage(script: string): PreflightIssue | null {
  if (!/\bWrite-Host\b/i.test(script)) {
    return null;
  }

  return {
    id: "write-host",
    severity: "info",
    category: "quality",
    title: "Write-Host output detected",
    description: "Write-Host is fine for operator prompts, but it is harder to capture cleanly in automation and transcripts.",
    recommendation: "Prefer Write-Output, Write-Verbose, or structured objects when the script is meant for reuse or export.",
  };
}

function detectStrictModeOpportunity(script: string): PreflightIssue | null {
  if (script.split(/\r?\n/).length < 20) {
    return null;
  }

  if (/\bSet-StrictMode\b/i.test(script)) {
    return null;
  }

  return {
    id: "strict-mode",
    severity: "info",
    category: "quality",
    title: "Strict mode is not enabled",
    description: "Larger scripts benefit from stricter variable and expression checks during testing.",
    recommendation: "Consider adding Set-StrictMode -Version Latest near the top while validating the script.",
  };
}

function detectShouldProcessOpportunity(script: string): PreflightIssue | null {
  const hasDestructiveAction = /\b(Remove-Item|Set-AD[A-Za-z]+|Remove-AD[A-Za-z]+|Restart-Computer|Stop-Service|Restart-Service)\b/i.test(script);
  if (!hasDestructiveAction) {
    return null;
  }

  if (/\bSupportsShouldProcess\s*=\s*\$true\b/i.test(script) || /\b-WhatIf\b/i.test(script) || /\bShouldProcess\b/i.test(script)) {
    return null;
  }

  return {
    id: "should-process",
    severity: "warning",
    category: "safety",
    title: "No WhatIf or ShouldProcess support detected",
    description: "This script appears to modify live state without an obvious dry-run path.",
    recommendation: "Add SupportsShouldProcess or a report-only mode so operators can validate impact before execution.",
  };
}

function detectNoParamBlockIssue(script: string): PreflightIssue | null {
  const trimmed = script.trim();
  if (!trimmed) {
    return null;
  }

  if (/\bparam\s*\(/i.test(script)) {
    return null;
  }

  return {
    id: "no-param-block",
    severity: "info",
    category: "readiness",
    title: "No parameter block detected",
    description: "The script appears to rely on inline values instead of an explicit param() block.",
    recommendation: "Add parameters for tenant names, paths, identities, and toggles so the script is easier to reuse safely.",
  };
}

function getLineNumberForIndex(source: string, index: number) {
  return source.slice(0, index).split(/\r?\n/).length;
}

export function detectModuleSuggestions(script: string): ModuleSuggestion[] {
  return MODULE_DETECTION_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(script)))
    .map((rule) => ({
      moduleName: rule.moduleName,
      reason: rule.reason,
      installCommand: rule.installCommand,
      importCommand: rule.importCommand,
      commonCommands: rule.commonCommands,
    }));
}

function summarizeScriptPurpose(script: string) {
  const cmdlets = Array.from(new Set((script.match(/\b[A-Z][A-Za-z0-9]+-[A-Z][A-Za-z0-9]+\b/g) || []).slice(0, 6)));
  if (cmdlets.length === 0) {
    return "This script is a custom PowerShell workflow that should be reviewed before execution.";
  }

  const readable = cmdlets.slice(0, 3).join(", ");
  return `This script primarily works through cmdlets like ${readable}${cmdlets.length > 3 ? ", and others" : ""}.`;
}

export function buildScriptExplanation(script: string, parameters: ParsedScriptParameter[], moduleSuggestions: ModuleSuggestion[], issues: PreflightIssue[]): ScriptExplanation {
  const cmdlets = Array.from(new Set(script.match(/\b[A-Z][A-Za-z0-9]+-[A-Z][A-Za-z0-9]+\b/g) || []));
  const actions = cmdlets.slice(0, 6).map((cmdlet) => `${cmdlet} is used in this script.`);
  const inputs = parameters.length > 0
    ? parameters.map((parameter) => `${parameter.name}${parameter.required ? " (required)" : ""}`)
    : ["No explicit param() block was detected, so the script may rely on inline values or prompts."];
  const sideEffects = issues
    .filter((issue) => issue.severity !== "info")
    .slice(0, 4)
    .map((issue) => issue.title);
  const risks = issues
    .filter((issue) => issue.severity === "critical" || issue.severity === "warning")
    .slice(0, 4)
    .map((issue) => issue.description);
  const operatorNotes = [
    summarizeScriptPurpose(script),
    ...(moduleSuggestions.length > 0 ? [`This script likely depends on ${moduleSuggestions.map((module) => module.moduleName).join(", ")}.`] : []),
    ...(parameters.length > 0 ? ["Run the parameter form to avoid editing placeholder values directly in the script."] : []),
  ];

  return {
    title: "Plain-English script summary",
    summary: summarizeScriptPurpose(script),
    primaryActions: actions.length > 0 ? actions : ["No standard PowerShell cmdlets were detected, so this script likely uses custom logic or inline functions."],
    inputs,
    sideEffects: sideEffects.length > 0 ? sideEffects : ["No obvious high-impact side effects were detected by the quick analysis."],
    risks: risks.length > 0 ? risks : ["No high-risk patterns were detected by the quick analysis."],
    operatorNotes,
  };
}

export function buildExecutionChecklist(parameters: ParsedScriptParameter[], moduleSuggestions: ModuleSuggestion[], issues: PreflightIssue[]): ExecutionChecklistItem[] {
  const requiresModules = moduleSuggestions.length > 0;
  const riskyScript = issues.some((issue) => issue.severity === "critical");
  const hasWarnings = issues.some((issue) => issue.severity === "warning");

  return [
    {
      id: "admin",
      label: "Run as admin if the script changes system state",
      description: "Use an elevated shell for services, registry, AD, or machine-wide changes.",
      checked: false,
      suggested: riskyScript,
    },
    {
      id: "modules",
      label: "Required modules reviewed",
      description: "Confirm required modules are installed and imported before execution.",
      checked: !requiresModules,
      suggested: requiresModules,
    },
    {
      id: "test-scope",
      label: "Tested with safe scope or sample data",
      description: "Use test users, test paths, or report-only mode before production rollout.",
      checked: false,
      suggested: true,
    },
    {
      id: "target",
      label: "Target environment confirmed",
      description: "Make sure tenant names, export paths, and machine targets are correct.",
      checked: false,
      suggested: true,
    },
    {
      id: "rollback",
      label: "Rollback plan noted",
      description: "Know how you will back out changes if the result is not what you expected.",
      checked: false,
      suggested: riskyScript,
    },
    {
      id: "transcript",
      label: "Transcript capture enabled",
      description: "Keep a transcript or run log so changes and errors can be reviewed after execution.",
      checked: false,
      suggested: riskyScript || hasWarnings,
    },
    {
      id: "approval",
      label: "Peer or change approval confirmed",
      description: "Confirm the script has the right reviewer or approver before using it in production.",
      checked: false,
      suggested: riskyScript,
    },
  ];
}

export function analyzeScriptWorkbench(script: string): ScriptWorkbenchAnalysis {
  const parameters = parseScriptParameters(script);
  const placeholders = detectPlaceholders(script);
  const moduleSuggestions = detectModuleSuggestions(script);
  const issues: PreflightIssue[] = [];

  for (const rule of DANGEROUS_COMMAND_RULES) {
    const match = rule.patterns.find((pattern) => pattern.test(script));
    if (match) {
      issues.push({
        id: `danger-${rule.title}`,
        severity: "critical",
        category: "safety",
        title: rule.title,
        description: rule.description,
        recommendation: rule.recommendation,
      });
    }
  }

  if (placeholders.length > 0) {
    issues.push({
      id: "placeholders",
      severity: "warning",
      category: "readiness",
      title: "Template placeholders still need attention",
      description: `${placeholders.length} placeholder value${placeholders.length === 1 ? "" : "s"} still appear in the script.`,
      recommendation: "Use the placeholder replacement tool before saving or executing.",
    });
  }

  const braceIssue = detectBraceIssue(script);
  if (braceIssue) {
    issues.push(braceIssue);
  }

  const tenantIssue = detectHardcodedTenantIssue(script);
  if (tenantIssue) {
    issues.push(tenantIssue);
  }

  issues.push(...detectUndefinedVariableIssues(script, parameters));

  const missingErrorHandling = detectMissingErrorHandling(script);
  if (missingErrorHandling) {
    issues.push(missingErrorHandling);
  }

  const writeHostIssue = detectWriteHostUsage(script);
  if (writeHostIssue) {
    issues.push(writeHostIssue);
  }

  const strictModeIssue = detectStrictModeOpportunity(script);
  if (strictModeIssue) {
    issues.push(strictModeIssue);
  }

  const shouldProcessIssue = detectShouldProcessOpportunity(script);
  if (shouldProcessIssue) {
    issues.push(shouldProcessIssue);
  }

  const noParamBlockIssue = detectNoParamBlockIssue(script);
  if (noParamBlockIssue) {
    issues.push(noParamBlockIssue);
  }

  if (parameters.some((parameter) => parameter.required && !parameter.defaultValue)) {
    issues.push({
      id: "required-parameters",
      severity: "info",
      category: "readiness",
      title: "Required parameters detected",
      description: "This script declares required parameters, so use the parameter runner before execution.",
      recommendation: "Open the parameter form and fill in the required values instead of editing the script manually.",
    });
  }

  const checklist = buildExecutionChecklist(parameters, moduleSuggestions, issues);
  const explanation = buildScriptExplanation(script, parameters, moduleSuggestions, issues);

  return {
    parameters,
    placeholders,
    moduleSuggestions,
    issues,
    checklist,
    explanation,
  };
}

function toTitleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function replacePlaceholders(script: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((nextScript, [token, replacement]) => {
    if (!replacement) {
      return nextScript;
    }

    return nextScript.split(token).join(replacement);
  }, script);
}

export function generateCommentHeader(
  script: string,
  options: {
    fileName?: string;
    author?: string;
    version?: string;
    requiredModules?: string[];
  },
) {
  const analysis = analyzeScriptWorkbench(script);
  const summary = analysis.explanation.summary;
  const synopsis = summary.replace(/^This script\s+/i, "").replace(/\.$/, "");
  const examples = analysis.parameters.length > 0
    ? `PS C:\\> .\\${options.fileName || "script.ps1"} ${analysis.parameters.map((parameter) => `-${parameter.name} <${parameter.name}>`).join(" ")}`
    : `PS C:\\> .\\${options.fileName || "script.ps1"}`;
  const requiredModules = options.requiredModules && options.requiredModules.length > 0
    ? options.requiredModules
    : analysis.moduleSuggestions.map((module) => module.moduleName);

  const parameterSections = analysis.parameters.length > 0
    ? analysis.parameters.map((parameter) => `.PARAMETER ${parameter.name}\n${parameter.required ? "Required" : "Optional"} ${toTitleCase(parameter.name)} value.`).join("\n\n")
    : ".PARAMETER None\nThis script does not declare a param() block.";

  const notesLines = [
    `.NOTES`,
    `Author: ${options.author || "PSForge Desktop"}`,
    `Version: ${options.version || "1.0.0"}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    requiredModules.length > 0 ? `Required Modules: ${requiredModules.join(", ")}` : "Required Modules: Review script body for environment-specific dependencies.",
    `Changelog:`,
    `- ${new Date().toISOString().slice(0, 10)} Created PSForge script header.`,
  ].join("\n");

  return `<#\n.SYNOPSIS\n${synopsis || "PowerShell automation workflow"}\n\n.DESCRIPTION\n${summary}\n\n${parameterSections}\n\n.EXAMPLE\n${examples}\n\n${notesLines}\n#>\n\n${script}`;
}

export function buildExportBundleArtifacts(
  script: string,
  options: {
    fileName: string;
    author?: string;
    checklist: ExecutionChecklistItem[];
  },
) {
  const analysis = analyzeScriptWorkbench(script);
  const baseName = options.fileName.replace(/\.[^.]+$/, "") || "psforge-script";
  const readme = [
    `# ${baseName}`,
    "",
    analysis.explanation.summary,
    "",
    "## Parameters",
    ...(analysis.parameters.length > 0
      ? analysis.parameters.map((parameter) => `- \`${parameter.name}\` (${parameter.type})${parameter.required ? " - required" : ""}`)
      : ["- No explicit param() block detected."]),
    "",
    "## Pre-flight notes",
    ...(analysis.issues.length > 0
      ? analysis.issues.map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`)
      : ["- No quick-analysis issues detected."]),
    "",
    "## Module suggestions",
    ...(analysis.moduleSuggestions.length > 0
      ? analysis.moduleSuggestions.map((module) => `- ${module.moduleName}: ${module.installCommand}`)
      : ["- No module suggestions detected from the quick analysis."]),
    "",
    "## Execution checklist",
    ...options.checklist.map((item) => `- [ ] ${item.label} — ${item.description}`),
  ].join("\n");

  const notes = [
    `PSForge Desktop export bundle`,
    `Author: ${options.author || "PSForge Desktop"}`,
    `Created: ${new Date().toISOString()}`,
    ``,
    `Plain-English summary:`,
    analysis.explanation.summary,
    ``,
    `Operator notes:`,
    ...analysis.explanation.operatorNotes.map((note) => `- ${note}`),
  ].join("\n");

  const parameterJson = JSON.stringify(
    analysis.parameters.reduce<Record<string, string>>((accumulator, parameter) => {
      accumulator[parameter.name] = parameter.defaultValue || "";
      return accumulator;
    }, {}),
    null,
    2,
  );

  const csvSample = analysis.parameters.length > 0
    ? `${analysis.parameters.map((parameter) => parameter.name).join(",")}\n${analysis.parameters.map(() => "").join(",")}\n`
    : "Name,Value\nExample,ReplaceMe\n";

  return [
    { name: `${baseName}.ps1`, content: script },
    { name: "README.md", content: readme },
    { name: "notes.txt", content: notes },
    { name: "parameters.json", content: parameterJson },
    { name: "sample-input.csv", content: csvSample },
  ];
}

function detectReferencedCmdlets(script: string) {
  return Array.from(new Set(script.match(/\b[A-Z][A-Za-z0-9]+-[A-Z][A-Za-z0-9]+\b/g) || [])).sort();
}

function detectImpactPreview(script: string) {
  const impacts: string[] = [];
  const impactRules: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(New-ADUser|New-MgUser|New-LocalUser)\b/i, label: "Create user or identity objects" },
    { pattern: /\b(Add-ADGroupMember|Add-MgGroupMember|Add-LocalGroupMember)\b/i, label: "Add principals to groups" },
    { pattern: /\b(Set-AD|Set-Mg|Set-ItemProperty|New-ItemProperty)\b/i, label: "Modify directory, cloud, or registry settings" },
    { pattern: /\b(Remove-Item|Remove-AD|Remove-Mg|Clear-EventLog)\b/i, label: "Delete or clear objects/data" },
    { pattern: /\b(Restart-Service|Stop-Service|Start-Service|Restart-Computer)\b/i, label: "Change service or machine state" },
    { pattern: /\b(Connect-MgGraph|Connect-ExchangeOnline|Connect-AzAccount)\b/i, label: "Connect to Microsoft cloud services" },
    { pattern: /\b(Export-Csv|Out-File|Set-Content|Add-Content)\b/i, label: "Write report or output files" },
    { pattern: /\bInvoke-Command\b/i, label: "Run commands on local or remote machines" },
  ];

  for (const rule of impactRules) {
    if (rule.pattern.test(script)) {
      impacts.push(rule.label);
    }
  }

  return impacts.length > 0 ? impacts : ["No obvious high-impact changes detected by static review."];
}

export function buildOperationsSuitePlan(
  script: string,
  options: {
    fileName: string;
    author?: string;
    checklist: ExecutionChecklistItem[];
  },
): OperationsSuitePlan {
  const analysis = analyzeScriptWorkbench(script);
  const cmdlets = detectReferencedCmdlets(script);
  const hasAdminSignals = /\b(HKLM:|Restart-Service|Stop-Service|Set-Service|New-Service|Remove-Service|Install-WindowsFeature|Set-ExecutionPolicy)\b/i.test(script);
  const hasRemotingSignals = /\b(Invoke-Command|Enter-PSSession|New-PSSession|Enable-PSRemoting)\b/i.test(script);
  const hasCloudAuthSignals = /\b(Connect-MgGraph|Connect-ExchangeOnline|Connect-AzAccount|Connect-AzureAD|Connect-MsolService)\b/i.test(script);
  const hasWhatIfSupport = /\b(SupportsShouldProcess\s*=\s*\$true|ShouldProcess|-WhatIf|-Confirm)\b/i.test(script);
  const hasDeprecatedModules = /\b(Connect-AzureAD|Get-AzureAD|Set-AzureAD|Connect-MsolService|Get-Msol|Set-Msol)\b/i.test(script);
  const hasCredentialRisk = /\b(password|clientsecret|secret|token|apikey)\s*=\s*["'][^"']+["']/i.test(script);
  const hasPester = /\bDescribe\s+["']|It\s+["']|Should\s+-/i.test(script);
  const baseName = options.fileName.replace(/\.[^.]+$/, "") || "psforge-script";

  const environmentChecks: EnvironmentDoctorCheck[] = [
    {
      id: "powershell-version",
      label: "PowerShell runtime",
      status: cmdlets.length > 0 ? "warning" : "pass",
      detail: cmdlets.length > 0
        ? "Confirm the target host has Windows PowerShell 5.1 or PowerShell 7 compatible with the referenced cmdlets."
        : "No cmdlets were detected, so runtime requirements need operator confirmation.",
      remediation: "$PSVersionTable.PSVersion",
    },
    {
      id: "execution-policy",
      label: "Execution policy",
      status: script.trim() ? "warning" : "action",
      detail: "Confirm scripts can run in the target scope before deployment.",
      remediation: "Get-ExecutionPolicy -List",
    },
    {
      id: "modules",
      label: "Module availability",
      status: analysis.moduleSuggestions.length > 0 ? "action" : "pass",
      detail: analysis.moduleSuggestions.length > 0
        ? `Review required modules: ${analysis.moduleSuggestions.map((module) => module.moduleName).join(", ")}.`
        : "No known enterprise module dependency was detected.",
      remediation: analysis.moduleSuggestions.map((module) => module.installCommand).join("\n"),
    },
    {
      id: "administrator",
      label: "Administrator privileges",
      status: hasAdminSignals ? "action" : "pass",
      detail: hasAdminSignals
        ? "This script appears to touch machine-wide state and may require elevation."
        : "No obvious administrator-only commands were detected.",
      remediation: "Start-Process PowerShell -Verb RunAs",
    },
    {
      id: "remoting",
      label: "WinRM and remoting",
      status: hasRemotingSignals ? "action" : "pass",
      detail: hasRemotingSignals
        ? "The script references remoting. Confirm WinRM, DNS, firewall, and credentials before execution."
        : "No remoting workflow was detected.",
      remediation: "Test-WSMan <ComputerName>",
    },
    {
      id: "authentication",
      label: "Authentication prerequisites",
      status: hasCloudAuthSignals ? "action" : "pass",
      detail: hasCloudAuthSignals
        ? "Cloud connection commands were detected. Confirm tenant, scopes, and sign-in method before running."
        : "No cloud authentication command was detected.",
      remediation: "Confirm account permissions and required Graph/Azure/Exchange scopes.",
    },
    {
      id: "commands",
      label: "Referenced commands",
      status: cmdlets.length > 0 ? "warning" : "action",
      detail: cmdlets.length > 0
        ? `${cmdlets.length} cmdlet${cmdlets.length === 1 ? "" : "s"} should be verified on the target host.`
        : "No standard cmdlets were found to verify automatically.",
      remediation: cmdlets.slice(0, 12).map((cmdlet) => `Get-Command ${cmdlet} -ErrorAction SilentlyContinue`).join("\n"),
    },
  ];

  const readinessScore = Math.max(
    5,
    100
      - environmentChecks.filter((check) => check.status === "action").length * 13
      - environmentChecks.filter((check) => check.status === "warning").length * 6
      - analysis.issues.filter((issue) => issue.severity === "critical").length * 12
      - analysis.issues.filter((issue) => issue.severity === "warning").length * 6,
  );

  const dependencyManifest = [
    `# ${baseName} dependency manifest`,
    "",
    "## Modules",
    ...(analysis.moduleSuggestions.length > 0
      ? analysis.moduleSuggestions.map((module) => `- ${module.moduleName}: ${module.installCommand}`)
      : ["- No known module dependency detected by static review."]),
    "",
    "## Referenced commands",
    ...(cmdlets.length > 0 ? cmdlets.map((cmdlet) => `- ${cmdlet}`) : ["- No standard cmdlets detected."]),
    "",
    "## Suggested #Requires",
    ...(analysis.moduleSuggestions.length > 0
      ? analysis.moduleSuggestions.map((module) => `#Requires -Modules ${module.moduleName}`)
      : ["# Add #Requires statements after confirming module requirements."]),
  ].join("\n");

  const impactPreview = detectImpactPreview(script);
  const rollbackPlan = [
    hasWhatIfSupport
      ? "Script includes WhatIf/ShouldProcess signals. Use them before committing changes."
      : "Add WhatIf or SupportsShouldProcess before using this against production.",
    hasAdminSignals
      ? "Capture current service, registry, or Windows feature state before applying changes."
      : "Capture affected object state before applying changes.",
    "Save the original script, parameter values, transcript, and generated output with the change record.",
    "Mark any delete, clear, or external API operations as manually reviewed because they may not be fully reversible.",
  ];

  const modernizationPlan = [
    hasDeprecatedModules
      ? "Deprecated AzureAD/MSOnline cmdlets detected. Plan migration to Microsoft Graph modules."
      : "No AzureAD/MSOnline modernization issue detected by static review.",
    hasCredentialRisk
      ? "Potential hard-coded credential or token value detected. Move secrets into secure prompts or a vault."
      : "No obvious hard-coded credential assignment detected.",
    /\bWrite-Host\b/i.test(script)
      ? "Replace status-only Write-Host output with Write-Verbose or structured output where automation will consume results."
      : "Output style looks suitable for automation based on the quick review.",
    /\bSet-StrictMode\b/i.test(script)
      ? "Strict mode is already present."
      : "Consider Set-StrictMode -Version Latest while testing older scripts.",
  ];

  const pesterTestDraft = [
    `# ${baseName}.Tests.ps1`,
    `# Generated by PSForge 3.0 Ops Suite`,
    "",
    `BeforeAll {`,
    `  $ScriptPath = Join-Path $PSScriptRoot "${options.fileName}"`,
    `}`,
    "",
    `Describe "${baseName}" {`,
    `  It "has valid PowerShell syntax" {`,
    `    { [scriptblock]::Create((Get-Content -Raw -Path $ScriptPath)) } | Should -Not -Throw`,
    `  }`,
    "",
    ...analysis.parameters.map((parameter) => [
      `  It "declares the ${parameter.name} parameter" {`,
      `    Get-Content -Raw -Path $ScriptPath | Should -Match '\\$${parameter.name}\\b'`,
      `  }`,
      "",
    ].join("\n")),
    `  It "does not run destructive commands during test discovery" {`,
    `    $content = Get-Content -Raw -Path $ScriptPath`,
    `    $content | Should -Not -Match 'Invoke-Expression\\s+\\$'`,
    `  }`,
    `}`,
  ].join("\n");

  const packagePlan = [
    `# ${baseName} package plan`,
    "",
    "## Recommended outputs",
    "- ZIP bundle with script, README, runbook, dependency manifest, and sample parameters.",
    "- Intune Win32 package when endpoint deployment is required.",
    "- Scheduled task installer when recurring local execution is required.",
    "- Install/uninstall script pair when the workflow changes machine state.",
    "",
    "## Detected package inputs",
    `- Parameters: ${analysis.parameters.length}`,
    `- Module hints: ${analysis.moduleSuggestions.length}`,
    `- Requires elevation: ${hasAdminSignals ? "likely" : "not detected"}`,
    `- Safer dry-run support: ${hasWhatIfSupport ? "detected" : "not detected"}`,
  ].join("\n");

  const runbookDraft = [
    `# ${baseName} operational runbook`,
    "",
    `Owner: ${options.author || "PSForge User"}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Purpose",
    analysis.explanation.summary,
    "",
    "## Prerequisites",
    ...environmentChecks.map((check) => `- ${check.label}: ${check.detail}`),
    "",
    "## Parameters",
    ...(analysis.parameters.length > 0
      ? analysis.parameters.map((parameter) => `- ${parameter.name} (${parameter.type})${parameter.required ? " - required" : ""}`)
      : ["- No explicit param() block detected."]),
    "",
    "## Validation",
    ...options.checklist.map((item) => `- [${item.checked ? "x" : " "}] ${item.label}`),
    "",
    "## Rollback",
    ...rollbackPlan.map((item) => `- ${item}`),
  ].join("\n");

  return {
    readinessScore,
    environmentChecks,
    dependencyManifest,
    impactPreview,
    rollbackPlan,
    modernizationPlan,
    pesterTestDraft,
    packagePlan,
    runbookDraft,
  };
}

export function runRegexLab(pattern: string, sampleText: string): RegexLabResult {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) {
    return {
      ok: false,
      error: "Enter a regular expression pattern first.",
      matches: [],
      explanation: ["The Regex Lab needs a pattern before it can test sample text."],
    };
  }

  try {
    const regex = new RegExp(trimmedPattern, "gim");
    const matches = Array.from(sampleText.matchAll(regex)).slice(0, 100).map((match) => ({
      value: match[0],
      index: match.index || 0,
      groups: match.slice(1),
    }));

    const explanation = [
      regex.ignoreCase ? "Case-insensitive matching is enabled." : "Case-sensitive matching is enabled.",
      regex.multiline ? "Multiline mode lets anchors match each line." : "Multiline mode is not enabled.",
      trimmedPattern.includes("\\d") ? "The pattern looks for digits." : "",
      trimmedPattern.includes("\\w") ? "The pattern looks for word characters." : "",
      trimmedPattern.includes(".*") ? "The pattern includes a greedy wildcard. Review it carefully on long logs." : "",
      matches.length === 0 ? "No matches were found in the current sample." : `${matches.length} match${matches.length === 1 ? "" : "es"} found in the sample.`,
    ].filter(Boolean);

    return { ok: true, matches, explanation };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Invalid regular expression.",
      matches: [],
      explanation: ["Fix the regular expression syntax and try again."],
    };
  }
}

export function inspectPipeline(script: string): PipelineStage[] {
  return script
    .split(/\r?\n/)
    .flatMap((line) => line.split("|").map((part) => part.trim()).filter(Boolean))
    .filter((part) => /\b[A-Za-z]+-[A-Za-z]+\b/.test(part))
    .slice(0, 40)
    .map((command, index) => {
      const verb = command.split("-")[0]?.toLowerCase();
      const likelyOutput = verb === "get"
        ? "PowerShell objects from a query command"
        : verb === "select"
          ? "Projected objects with selected properties"
          : verb === "where"
            ? "Filtered objects from the previous stage"
            : verb === "export"
              ? "A file or serialized output"
              : "Objects or side effects depending on command behavior";

      return {
        index: index + 1,
        command,
        likelyInput: index === 0 ? "Script input, parameters, or local state" : "Objects from previous pipeline stage",
        likelyOutput,
        notes: [
          command.includes("$") ? "Uses variable input." : "No variable input detected in this stage.",
          /\b(Format-|Out-Host|Write-Host)\b/i.test(command) ? "Display-only output can be hard to automate." : "Stage appears reusable in automation.",
        ],
      };
    });
}

export function buildParameterSetDesignerDraft(parameters: ParsedScriptParameter[]) {
  const required = parameters.filter((parameter) => parameter.required);
  const optional = parameters.filter((parameter) => !parameter.required);
  const requiredLines = required.length > 0
    ? required.map((parameter) => `  [Parameter(Mandatory, ParameterSetName = "Default")]\n  [${parameter.type}]$${parameter.name},`)
    : [`  [Parameter(ParameterSetName = "Default")]\n  [string]$TargetName,`];
  const optionalLines = optional.map((parameter) => `  [Parameter(ParameterSetName = "Default")]\n  [${parameter.type}]$${parameter.name}${parameter.defaultValue ? ` = ${parameter.defaultValue}` : ""},`);

  return [
    "[CmdletBinding(SupportsShouldProcess, DefaultParameterSetName = \"Default\")]",
    "param(",
    ...requiredLines,
    ...optionalLines,
    "  [Parameter(ParameterSetName = \"ReportOnly\")]",
    "  [switch]$ReportOnly",
    ")",
  ].join("\n");
}

export function detectCredentialLeaks(script: string): CredentialLeakFinding[] {
  const findings: CredentialLeakFinding[] = [];
  const rules: Array<{ title: string; severity: "critical" | "warning"; pattern: RegExp; recommendation: string }> = [
    {
      title: "Possible hard-coded secret assignment",
      severity: "critical",
      pattern: /\b(password|passwd|pwd|secret|token|apikey|api_key|clientsecret)\b\s*=\s*["'][^"']{4,}["']/i,
      recommendation: "Replace hard-coded values with Get-Credential, SecretManagement, environment variables, or a secure vault.",
    },
    {
      title: "Plain-text secure string conversion",
      severity: "critical",
      pattern: /\bConvertTo-SecureString\b.+\b-AsPlainText\b/i,
      recommendation: "Avoid embedding plain-text secrets. Prompt securely or retrieve secrets from a managed vault.",
    },
    {
      title: "Potential tenant or machine-specific value",
      severity: "warning",
      pattern: /\b[A-Za-z0-9.-]+\.(onmicrosoft\.com|local|corp)\b/i,
      recommendation: "Parameterize tenant, domain, or machine-specific values before sharing or packaging.",
    },
    {
      title: "Credential object exported or serialized",
      severity: "warning",
      pattern: /\b(Export-Clixml|ConvertFrom-SecureString)\b/i,
      recommendation: "Confirm exported credential material is encrypted for the intended user/machine and never committed to source control.",
    },
  ];

  for (const [lineIndex, line] of script.split(/\r?\n/).entries()) {
    for (const rule of rules) {
      const match = rule.pattern.exec(line);
      if (match) {
        findings.push({
          id: `${rule.title}-${lineIndex}`,
          severity: rule.severity,
          line: lineIndex + 1,
          title: rule.title,
          evidence: line.trim().slice(0, 160),
          recommendation: rule.recommendation,
        });
      }
    }
  }

  return findings;
}

export function buildPerformanceProfilerScript(script: string, fileName = "script.ps1") {
  const safeName = fileName.replace(/"/g, "");
  return [
    `$ScriptPath = Join-Path $PSScriptRoot "${safeName}"`,
    "$Result = [ordered]@{}",
    "$Timer = [System.Diagnostics.Stopwatch]::StartNew()",
    "try {",
    "  & $ScriptPath",
    "  $Result.ExitCode = 0",
    "} catch {",
    "  $Result.ExitCode = 1",
    "  $Result.Error = $_.Exception.Message",
    "} finally {",
    "  $Timer.Stop()",
    "  $Result.ElapsedMs = $Timer.ElapsedMilliseconds",
    "  $Result.WorkingSetMB = [math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)",
    "  [pscustomobject]$Result | Format-List",
    "}",
    "",
    "# Original script preview",
    ...script.split(/\r?\n/).slice(0, 40).map((line) => `# ${line}`),
  ].join("\n");
}

export function buildCompatibilityMatrix(script: string): CompatibilityFinding[] {
  const usesWindowsOnly = /\b(Get-CimInstance|Get-WmiObject|Get-EventLog|Get-WindowsFeature|Install-WindowsFeature|HKLM:|Get-Service)\b/i.test(script);
  const usesDesktopOnly = /\bOut-GridView|System\.Windows\.Forms|PresentationFramework\b/i.test(script);
  const usesDeprecated = /\b(Get-WmiObject|Connect-AzureAD|Get-AzureAD|Connect-MsolService|Get-Msol)\b/i.test(script);
  const usesUnsupportedAutomation = /\bRead-Host|Get-Credential|Out-GridView\b/i.test(script);

  return [
    {
      target: "Windows PowerShell 5.1",
      status: usesDeprecated ? "review" : "compatible",
      notes: [
        usesWindowsOnly ? "Windows administration cmdlets detected and are usually best tested on Windows PowerShell." : "No Windows-only dependency detected.",
        usesDeprecated ? "Deprecated cmdlets are present. Keep compatibility notes with the runbook." : "No deprecated 5.1 compatibility issue detected.",
      ],
    },
    {
      target: "PowerShell 7.x",
      status: usesWindowsOnly || usesDeprecated ? "review" : "compatible",
      notes: [
        usesWindowsOnly ? "Windows-only modules or providers may require Windows compatibility mode." : "No obvious blocker for PowerShell 7.x.",
        usesDeprecated ? "Replace deprecated AzureAD/MSOnline/WMI commands where possible." : "No deprecated module signal detected.",
      ],
    },
    {
      target: "Windows Server",
      status: usesDesktopOnly ? "review" : "compatible",
      notes: [
        usesDesktopOnly ? "Desktop UI dependencies may not work on Server Core or unattended jobs." : "No desktop UI dependency detected.",
        "Confirm required roles/features on the target server.",
      ],
    },
    {
      target: "Azure Automation",
      status: usesUnsupportedAutomation ? "unsupported" : usesWindowsOnly ? "review" : "compatible",
      notes: [
        usesUnsupportedAutomation ? "Interactive prompts or UI commands are not suitable for Azure Automation." : "No interactive prompt blocker detected.",
        usesWindowsOnly ? "Windows-only cmdlets need Hybrid Worker or replacement cloud modules." : "Cloud execution looks plausible after module validation.",
      ],
    },
    {
      target: "Constrained endpoints",
      status: /\bInvoke-Expression|Add-Type|Start-Process|New-Object\b/i.test(script) ? "review" : "compatible",
      notes: [
        "Confirm allowed cmdlets, language mode, and module availability.",
        /\bInvoke-Expression|Add-Type|Start-Process|New-Object\b/i.test(script) ? "Dynamic execution or process creation may be blocked." : "No dynamic execution blocker detected.",
      ],
    },
  ];
}

export function parseCsvMapping(csvText: string, parameters: ParsedScriptParameter[]): CsvMappingResult {
  const rows = csvText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((row) => row.some(Boolean));
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);
  const suggestedParameterMap = parameters.reduce<Record<string, string>>((accumulator, parameter) => {
    const match = headers.find((header) => header.toLowerCase() === parameter.name.toLowerCase())
      || headers.find((header) => header.toLowerCase().includes(parameter.name.toLowerCase()));
    accumulator[parameter.name] = match || "";
    return accumulator;
  }, {});
  const previewObjects = dataRows.slice(0, 5).map((row) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = row[index] || "";
      return accumulator;
    }, {}),
  );

  return { headers, rows: dataRows, suggestedParameterMap, previewObjects };
}

export function buildSanitizedSupportBundle(script: string, context: string, fileName: string) {
  const redact = (value: string) =>
    value
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
      .replace(/\b[A-Za-z0-9.-]+\.onmicrosoft\.com\b/gi, "[redacted-tenant]")
      .replace(/\b(password|secret|token|apikey|clientsecret)\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[redacted]")
      .replace(/\b[A-Z]:\\Users\\[^\\\r\n]+/gi, "C:\\Users\\[redacted]");

  return [
    "# PSForge sanitized support bundle",
    "",
    `File: ${fileName}`,
    `Created: ${new Date().toISOString()}`,
    "",
    "## Sanitized context",
    redact(context || "No extra context provided."),
    "",
    "## Sanitized script excerpt",
    "```powershell",
    redact(script).slice(0, 12000),
    "```",
  ].join("\n");
}

export function buildScheduledTaskInstaller(options: {
  taskName: string;
  scriptPath: string;
  schedule: "Daily" | "Weekly" | "AtLogon";
  time: string;
  runAsHighest: boolean;
}) {
  const taskName = options.taskName.trim() || "PSForge Script Task";
  const scriptPath = options.scriptPath.trim() || "C:\\Path\\To\\script.ps1";
  const action = `New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File \\"${scriptPath}\\""`;
  const trigger = options.schedule === "AtLogon"
    ? "New-ScheduledTaskTrigger -AtLogOn"
    : `New-ScheduledTaskTrigger -${options.schedule} -At "${options.time || "09:00"}"`;
  const principal = options.runAsHighest
    ? "$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest -LogonType Interactive"
    : "$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive";

  return [
    `[CmdletBinding(SupportsShouldProcess)]`,
    "param()",
    "",
    `$TaskName = "${taskName.replace(/"/g, "")}"`,
    `$Action = ${action}`,
    `$Trigger = ${trigger}`,
    principal,
    "$Settings = New-ScheduledTaskSettingsSet -Compatibility Win8 -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries",
    "",
    "if ($PSCmdlet.ShouldProcess($TaskName, 'Register scheduled task')) {",
    "  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force",
    "}",
    "",
    "# Uninstall command:",
    "# Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false",
  ].join("\n");
}

export function buildCertificationManifest(script: string, options: { fileName: string; hash: string; owner: string; notes: string }) {
  const analysis = analyzeScriptWorkbench(script);
  return JSON.stringify({
    schema: "psforge.script-certification.v1",
    fileName: options.fileName,
    sha256: options.hash,
    owner: options.owner || "PSForge User",
    certifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    status: analysis.issues.some((issue) => issue.severity === "critical") ? "review-required" : "approved",
    notes: options.notes || "Certified from PSForge Desktop 3.0 after operator review.",
    summary: analysis.explanation.summary,
    issueCount: analysis.issues.length,
    criticalIssueCount: analysis.issues.filter((issue) => issue.severity === "critical").length,
  }, null, 2);
}

export function getTeamFavoriteCommandIds() {
  return TEAM_FAVORITE_COMMAND_IDS;
}

export function buildWorkbenchProfileKey(
  fileName: string,
  parameters: ParsedScriptParameter[],
  placeholders: PlaceholderToken[],
) {
  const normalizedFileName = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  const parameterPart = parameters.map((parameter) => parameter.name.toLowerCase()).sort().join("|");
  const placeholderPart = placeholders.map((placeholder) => placeholder.token.toLowerCase()).sort().join("|");
  return [normalizedFileName || "script", parameterPart || "no-params", placeholderPart || "no-placeholders"].join("::");
}
