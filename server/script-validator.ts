/**
 * PowerShell Script Validator
 * Provides comprehensive validation including syntax, dependencies, impact analysis, and best practices
 */

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'syntax' | 'dependency' | 'impact' | 'best-practice' | 'compliance' | 'security';
  line?: number;
  message: string;
  recommendation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DependencyInfo {
  modules: string[];
  permissions: string[];
  externalTools: string[];
}

export interface ImpactAnalysis {
  modifiesObjects: boolean;
  deletesObjects: boolean;
  createsObjects: boolean;
  estimatedImpact: string;
  affectedResources: string[];
}

export interface BestPractice {
  category: string;
  passed: boolean;
  message: string;
  recommendation?: string;
}

export interface ComplianceCheck {
  standard: string;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  dependencies: DependencyInfo;
  impact: ImpactAnalysis;
  bestPractices: BestPractice[];
  compliance: ComplianceCheck[];
  summary: string;
}

// PowerShell module patterns
const MODULE_PATTERNS = [
  { pattern: /Import-Module\s+[\'\"]?([^\'\"\s]+)/gi, type: 'import' },
  { pattern: /#Requires\s+-Modules?\s+([\w\.\-,\s]+)/gi, type: 'requires' },
  { pattern: /using\s+module\s+([\w\.\-]+)/gi, type: 'using' },
  { pattern: /Install-Module\s+[\'\"]?([^\'\"\s]+)/gi, type: 'install' },
];

// Common PowerShell modules and their purposes
const KNOWN_MODULES: Record<string, { permissions: string[], description: string }> = {
  'ActiveDirectory': { permissions: ['AD Administrator'], description: 'Active Directory management' },
  'AzureAD': { permissions: ['Azure AD Administrator'], description: 'Azure AD management' },
  'Microsoft.Graph': { permissions: ['Graph API permissions'], description: 'Microsoft Graph API' },
  'ExchangeOnlineManagement': { permissions: ['Exchange Administrator'], description: 'Exchange Online' },
  'MSOnline': { permissions: ['Global Administrator'], description: 'Microsoft Online Services' },
  'SharePointPnPPowerShellOnline': { permissions: ['SharePoint Administrator'], description: 'SharePoint Online' },
  'Az': { permissions: ['Azure Contributor/Owner'], description: 'Azure management' },
  'SqlServer': { permissions: ['SQL Server permissions'], description: 'SQL Server management' },
  'VMware.PowerCLI': { permissions: ['VMware Administrator'], description: 'VMware management' },
  'Hyper-V': { permissions: ['Hyper-V Administrator'], description: 'Hyper-V management' },
};

// Impact detection patterns
const IMPACT_PATTERNS = {
  modify: [
    /Set-\w+/gi,
    /Update-\w+/gi,
    /Enable-\w+/gi,
    /Disable-\w+/gi,
    /Grant-\w+/gi,
    /Revoke-\w+/gi,
    /Add-\w+Member/gi,
    /Remove-\w+Member/gi,
  ],
  delete: [
    /Remove-\w+/gi,
    /Delete-\w+/gi,
    /Clear-\w+/gi,
    /Uninstall-\w+/gi,
    /Remove-Item.*-Recurse/gi,
  ],
  create: [
    /New-\w+/gi,
    /Add-\w+/gi,
    /Install-\w+/gi,
    /Create-\w+/gi,
    /Register-\w+/gi,
  ],
};

// Best practice patterns
const BEST_PRACTICE_CHECKS = [
  {
    name: 'Error Handling',
    pattern: /try\s*{[\s\S]*?}\s*catch/i,
    message: 'Script includes error handling (try/catch)',
    failMessage: 'Script lacks error handling blocks',
    recommendation: 'Add try/catch blocks to handle errors gracefully',
  },
  {
    name: 'Parameter Validation',
    pattern: /\[Parameter\(.*Mandatory.*\)\]|\[ValidateNotNull/i,
    message: 'Script includes parameter validation',
    failMessage: 'No parameter validation detected',
    recommendation: 'Add [Parameter(Mandatory)] or [Validate*] attributes to parameters',
  },
  {
    name: 'Comment-Based Help',
    pattern: /\.SYNOPSIS|\.DESCRIPTION|\.PARAMETER|\.EXAMPLE/i,
    message: 'Script includes comment-based help',
    failMessage: 'No comment-based help found',
    recommendation: 'Add .SYNOPSIS, .DESCRIPTION, .PARAMETER, and .EXAMPLE sections',
  },
  {
    name: 'Confirmation for Destructive Operations',
    pattern: /\[CmdletBinding\(.*SupportsShouldProcess.*\)\]|-Confirm|-WhatIf/i,
    message: 'Script supports WhatIf/Confirm for destructive operations',
    failMessage: 'No WhatIf/Confirm support for destructive operations',
    recommendation: 'Add [CmdletBinding(SupportsShouldProcess)] and implement -WhatIf and -Confirm',
  },
  {
    name: 'Approved Verb Usage',
    pattern: /function\s+(Get|Set|New|Remove|Add|Update|Start|Stop|Test|Invoke|Import|Export|Connect|Disconnect)-/i,
    message: 'Functions use approved PowerShell verbs',
    failMessage: 'Consider using approved PowerShell verbs for functions',
    recommendation: 'Use approved verbs: Get-, Set-, New-, Remove-, Add-, etc. (Get-Verb for full list)',
  },
  {
    name: 'Error Action Preference',
    pattern: /\$ErrorActionPreference|ErrorAction/i,
    message: 'Script manages error action preferences',
    failMessage: 'No explicit error action handling',
    recommendation: 'Set $ErrorActionPreference or use -ErrorAction parameter',
  },
];

// Compliance patterns for different standards
const COMPLIANCE_PATTERNS = {
  soc2: [
    {
      pattern: /password|credential|secret|apikey|token/i,
      check: (script: string) => {
        // Check if credentials are hardcoded
        const hasHardcodedCreds = /password\s*=\s*["\'][^"\']+["\']/i.test(script);
        return !hasHardcodedCreds;
      },
      message: 'Credentials must not be hardcoded (SOC 2 - Access Control)',
      recommendation: 'Use Get-Credential, SecureString, or Azure Key Vault',
    },
    {
      pattern: /Write-Log|Add-Content.*log|Out-File.*log/i,
      check: (script: string) => {
        // Check if logging is implemented
        return /Write-Log|Add-Content.*log|Out-File.*log/i.test(script);
      },
      message: 'Audit logging should be implemented (SOC 2 - Monitoring)',
      recommendation: 'Add logging for all operations and changes',
    },
  ],
  hipaa: [
    {
      pattern: /patient|medical|health|phi|ephi/i,
      check: (script: string) => {
        // Check if PHI is properly secured
        const handlesPHI = /patient|medical|health|phi|ephi/i.test(script);
        if (!handlesPHI) return true; // Not handling PHI
        
        // If handling PHI, check for encryption
        const hasEncryption = /ConvertTo-SecureString|Protect-CmsMessage|encrypt/i.test(script);
        return hasEncryption;
      },
      message: 'PHI must be encrypted in transit and at rest (HIPAA)',
      recommendation: 'Use ConvertTo-SecureString or Protect-CmsMessage for PHI data',
    },
    {
      pattern: /Export|Out-File|Set-Content/i,
      check: (script: string) => {
        // Check if data exports are to secure locations
        const hasExport = /Export|Out-File|Set-Content/i.test(script);
        if (!hasExport) return true;
        
        // Check for secure path indicators
        const hasSecurePath = /encrypted|secure|vault|protected/i.test(script);
        return hasSecurePath;
      },
      message: 'Data exports must be to secure, encrypted locations (HIPAA)',
      recommendation: 'Ensure all exports are encrypted and access-controlled',
    },
  ],
  gdpr: [
    {
      pattern: /personal.*data|pii|email|phone|address/i,
      check: (script: string) => {
        const handlesPII = /personal.*data|pii|email|phone|address/i.test(script);
        if (!handlesPII) return true;
        
        // Check for data minimization principles
        const hasValidation = /where|where-object|select.*-property/i.test(script);
        return hasValidation;
      },
      message: 'Personal data must follow data minimization principles (GDPR)',
      recommendation: 'Only collect and process necessary personal data',
    },
  ],
};

/**
 * Validates PowerShell script syntax
 */
function validateSyntax(script: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = script.split('\n');

  // Basic syntax checks
  const brackets = { '{': 0, '}': 0, '(': 0, ')': 0, '[': 0, ']': 0 };
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('#')) return;
    
    // Count brackets
    for (const char of line) {
      if (char in brackets) {
        brackets[char as keyof typeof brackets]++;
      }
    }
    
    // Check for common syntax errors
    if (/\$\s+\w+/.test(line)) {
      issues.push({
        type: 'error',
        category: 'syntax',
        line: index + 1,
        message: 'Invalid variable syntax: space after $',
        recommendation: 'Remove space between $ and variable name',
        severity: 'high',
      });
    }
    
    // Check for unclosed strings
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0 && !line.includes('`')) {
      issues.push({
        type: 'error',
        category: 'syntax',
        line: index + 1,
        message: 'Unclosed single quote',
        recommendation: 'Ensure all quotes are properly closed',
        severity: 'high',
      });
    }
    
    if (doubleQuotes % 2 !== 0 && !line.includes('`')) {
      issues.push({
        type: 'error',
        category: 'syntax',
        line: index + 1,
        message: 'Unclosed double quote',
        recommendation: 'Ensure all quotes are properly closed',
        severity: 'high',
      });
    }
  });
  
  // Check bracket matching
  if (brackets['{'] !== brackets['}']) {
    issues.push({
      type: 'error',
      category: 'syntax',
      message: `Mismatched curly braces: ${brackets['{']} opening, ${brackets['}']} closing`,
      recommendation: 'Ensure all curly braces are properly paired',
      severity: 'critical',
    });
  }
  
  if (brackets['('] !== brackets[')']) {
    issues.push({
      type: 'error',
      category: 'syntax',
      message: `Mismatched parentheses: ${brackets['(']} opening, ${brackets[')']} closing`,
      recommendation: 'Ensure all parentheses are properly paired',
      severity: 'critical',
    });
  }
  
  if (brackets['['] !== brackets[']']) {
    issues.push({
      type: 'error',
      category: 'syntax',
      message: `Mismatched square brackets: ${brackets['[']} opening, ${brackets[']']} closing`,
      recommendation: 'Ensure all square brackets are properly paired',
      severity: 'high',
    });
  }

  return issues;
}

/**
 * Analyzes script dependencies (modules, permissions, external tools)
 */
function analyzeDependencies(script: string): { dependencies: DependencyInfo; issues: ValidationIssue[] } {
  const dependencies: DependencyInfo = {
    modules: [],
    permissions: [],
    externalTools: [],
  };
  const issues: ValidationIssue[] = [];

  // Detect required modules
  MODULE_PATTERNS.forEach(({ pattern }) => {
    let match;
    while ((match = pattern.exec(script)) !== null) {
      const moduleName = match[1].trim().split(',')[0].trim();
      if (!dependencies.modules.includes(moduleName)) {
        dependencies.modules.push(moduleName);
      }
    }
  });

  // Determine required permissions based on modules
  dependencies.modules.forEach(module => {
    const moduleInfo = KNOWN_MODULES[module];
    if (moduleInfo) {
      moduleInfo.permissions.forEach(perm => {
        if (!dependencies.permissions.includes(perm)) {
          dependencies.permissions.push(perm);
        }
      });
      
      issues.push({
        type: 'info',
        category: 'dependency',
        message: `Requires module: ${module} (${moduleInfo.description})`,
        recommendation: `Install with: Install-Module ${module}`,
        severity: 'low',
      });
    }
  });

  // Detect external tool dependencies
  const externalTools = [
    { pattern: /sqlcmd|Invoke-Sqlcmd/i, tool: 'SQL Server Command Line Utilities' },
    { pattern: /git\s+/i, tool: 'Git' },
    { pattern: /docker\s+/i, tool: 'Docker' },
    { pattern: /kubectl\s+/i, tool: 'Kubernetes CLI (kubectl)' },
    { pattern: /az\s+/i, tool: 'Azure CLI' },
    { pattern: /aws\s+/i, tool: 'AWS CLI' },
  ];

  externalTools.forEach(({ pattern, tool }) => {
    if (pattern.test(script) && !dependencies.externalTools.includes(tool)) {
      dependencies.externalTools.push(tool);
      issues.push({
        type: 'info',
        category: 'dependency',
        message: `Requires external tool: ${tool}`,
        recommendation: `Ensure ${tool} is installed and configured`,
        severity: 'medium',
      });
    }
  });

  return { dependencies, issues };
}

/**
 * Performs impact analysis on the script
 */
function analyzeImpact(script: string): { impact: ImpactAnalysis; issues: ValidationIssue[] } {
  const impact: ImpactAnalysis = {
    modifiesObjects: false,
    deletesObjects: false,
    createsObjects: false,
    estimatedImpact: 'Low',
    affectedResources: [],
  };
  const issues: ValidationIssue[] = [];

  // Check for modification patterns
  IMPACT_PATTERNS.modify.forEach(pattern => {
    if (pattern.test(script)) {
      impact.modifiesObjects = true;
    }
  });

  // Check for deletion patterns
  IMPACT_PATTERNS.delete.forEach(pattern => {
    if (pattern.test(script)) {
      impact.deletesObjects = true;
    }
  });

  // Check for creation patterns
  IMPACT_PATTERNS.create.forEach(pattern => {
    if (pattern.test(script)) {
      impact.createsObjects = true;
    }
  });

  // Detect affected resource types
  const resourcePatterns = [
    { pattern: /User|ADUser|MgUser/gi, resource: 'User accounts' },
    { pattern: /Group|ADGroup|MgGroup/gi, resource: 'Groups' },
    { pattern: /Mailbox|ExchangeMailbox/gi, resource: 'Mailboxes' },
    { pattern: /Computer|ADComputer/gi, resource: 'Computer objects' },
    { pattern: /Database|SQL/gi, resource: 'Databases' },
    { pattern: /VM|VirtualMachine/gi, resource: 'Virtual machines' },
    { pattern: /File|Directory|Folder/gi, resource: 'Files/Folders' },
  ];

  resourcePatterns.forEach(({ pattern, resource }) => {
    if (pattern.test(script) && !impact.affectedResources.includes(resource)) {
      impact.affectedResources.push(resource);
    }
  });

  // Estimate impact level
  if (impact.deletesObjects) {
    impact.estimatedImpact = 'Critical';
    issues.push({
      type: 'warning',
      category: 'impact',
      message: 'Script performs destructive DELETE operations',
      recommendation: 'Implement -WhatIf support and test in non-production environment first',
      severity: 'critical',
    });
  } else if (impact.modifiesObjects) {
    impact.estimatedImpact = 'High';
    issues.push({
      type: 'warning',
      category: 'impact',
      message: 'Script MODIFIES existing objects',
      recommendation: 'Test in non-production environment and implement rollback procedures',
      severity: 'high',
    });
  } else if (impact.createsObjects) {
    impact.estimatedImpact = 'Medium';
    issues.push({
      type: 'info',
      category: 'impact',
      message: 'Script CREATES new objects',
      recommendation: 'Verify object naming conventions and organizational units',
      severity: 'low',
    });
  }

  if (impact.affectedResources.length > 0) {
    issues.push({
      type: 'info',
      category: 'impact',
      message: `Affects: ${impact.affectedResources.join(', ')}`,
      recommendation: 'Review scope and ensure appropriate permissions',
      severity: 'medium',
    });
  }

  return { impact, issues };
}

/**
 * Checks script against best practices
 */
function checkBestPractices(script: string): BestPractice[] {
  return BEST_PRACTICE_CHECKS.map(check => {
    const passed = check.pattern.test(script);
    
    // Special case: only require confirmation for destructive scripts
    if (check.name === 'Confirmation for Destructive Operations') {
      const hasDestructive = /Remove-|Delete-|Clear-/i.test(script);
      if (!hasDestructive) {
        return {
          category: check.name,
          passed: true,
          message: 'No destructive operations detected',
        };
      }
    }

    return {
      category: check.name,
      passed,
      message: passed ? check.message : check.failMessage,
      recommendation: passed ? undefined : check.recommendation,
    };
  });
}

/**
 * Performs compliance checks
 */
function checkCompliance(script: string): ComplianceCheck[] {
  const results: ComplianceCheck[] = [];

  // SOC 2 Compliance
  const soc2Issues: string[] = [];
  const soc2Recommendations: string[] = [];
  let soc2Passed = true;

  COMPLIANCE_PATTERNS.soc2.forEach(check => {
    if (check.pattern.test(script)) {
      if (!check.check(script)) {
        soc2Passed = false;
        soc2Issues.push(check.message);
        soc2Recommendations.push(check.recommendation);
      }
    }
  });

  results.push({
    standard: 'SOC 2',
    passed: soc2Passed,
    issues: soc2Issues,
    recommendations: soc2Recommendations,
  });

  // HIPAA Compliance
  const hipaaIssues: string[] = [];
  const hipaaRecommendations: string[] = [];
  let hipaaPassed = true;

  COMPLIANCE_PATTERNS.hipaa.forEach(check => {
    if (check.pattern.test(script)) {
      if (!check.check(script)) {
        hipaaPassed = false;
        hipaaIssues.push(check.message);
        hipaaRecommendations.push(check.recommendation);
      }
    }
  });

  results.push({
    standard: 'HIPAA',
    passed: hipaaPassed,
    issues: hipaaIssues,
    recommendations: hipaaRecommendations,
  });

  // GDPR Compliance
  const gdprIssues: string[] = [];
  const gdprRecommendations: string[] = [];
  let gdprPassed = true;

  COMPLIANCE_PATTERNS.gdpr.forEach(check => {
    if (check.pattern.test(script)) {
      if (!check.check(script)) {
        gdprPassed = false;
        gdprIssues.push(check.message);
        gdprRecommendations.push(check.recommendation);
      }
    }
  });

  results.push({
    standard: 'GDPR',
    passed: gdprPassed,
    issues: gdprIssues,
    recommendations: gdprRecommendations,
  });

  return results;
}

/**
 * Main validation function
 */
export function validatePowerShellScript(script: string): ValidationResult {
  if (!script || script.trim() === '') {
    return {
      isValid: true,
      score: 100,
      issues: [],
      dependencies: { modules: [], permissions: [], externalTools: [] },
      impact: {
        modifiesObjects: false,
        deletesObjects: false,
        createsObjects: false,
        estimatedImpact: 'None',
        affectedResources: [],
      },
      bestPractices: [],
      compliance: [],
      summary: 'No script content to validate.',
    };
  }

  const allIssues: ValidationIssue[] = [];
  
  // 1. Syntax validation
  const syntaxIssues = validateSyntax(script);
  allIssues.push(...syntaxIssues);

  // 2. Dependency analysis
  const { dependencies, issues: depIssues } = analyzeDependencies(script);
  allIssues.push(...depIssues);

  // 3. Impact analysis
  const { impact, issues: impactIssues } = analyzeImpact(script);
  allIssues.push(...impactIssues);

  // 4. Best practices
  const bestPractices = checkBestPractices(script);
  bestPractices.forEach(bp => {
    if (!bp.passed && bp.recommendation) {
      allIssues.push({
        type: 'warning',
        category: 'best-practice',
        message: bp.message,
        recommendation: bp.recommendation,
        severity: 'medium',
      });
    }
  });

  // 5. Compliance checks
  const compliance = checkCompliance(script);
  compliance.forEach(comp => {
    if (!comp.passed) {
      comp.issues.forEach((issue, idx) => {
        allIssues.push({
          type: 'warning',
          category: 'compliance',
          message: `${comp.standard}: ${issue}`,
          recommendation: comp.recommendations[idx] || 'Review compliance requirements',
          severity: 'high',
        });
      });
    }
  });

  // Calculate score
  let score = 100;
  allIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score -= 20; break;
      case 'high': score -= 10; break;
      case 'medium': score -= 5; break;
      case 'low': score -= 2; break;
    }
  });
  score = Math.max(0, Math.min(100, score));

  // Determine if valid
  const criticalErrors = allIssues.filter(i => i.type === 'error' && i.severity === 'critical');
  const isValid = criticalErrors.length === 0;

  // Generate summary
  const errorCount = allIssues.filter(i => i.type === 'error').length;
  const warningCount = allIssues.filter(i => i.type === 'warning').length;
  const infoCount = allIssues.filter(i => i.type === 'info').length;

  let summary = '';
  if (errorCount > 0) {
    summary = `Found ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}. `;
  } else if (warningCount > 0) {
    summary = `Found ${warningCount} warning${warningCount !== 1 ? 's' : ''}, ${infoCount} info item${infoCount !== 1 ? 's' : ''}. `;
  } else if (infoCount > 0) {
    summary = `Script validation passed. ${infoCount} info item${infoCount !== 1 ? 's' : ''} noted. `;
  } else {
    summary = 'Script validation passed with no issues. ';
  }

  if (impact.estimatedImpact !== 'None' && impact.estimatedImpact !== 'Low') {
    summary += `Impact: ${impact.estimatedImpact}. `;
  }

  return {
    isValid,
    score,
    issues: allIssues,
    dependencies,
    impact,
    bestPractices,
    compliance,
    summary,
  };
}
