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
