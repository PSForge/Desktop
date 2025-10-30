export type SecurityLevel = 'safe' | 'caution' | 'dangerous';

export interface SecurityWarning {
  level: 'info' | 'warning' | 'critical';
  pattern: string;
  line: number;
  message: string;
  recommendation: string;
}

export interface SecurityScanResult {
  securityLevel: SecurityLevel;
  score: number; // 0-100, higher is safer
  warnings: SecurityWarning[];
  summary: string;
}

interface SecurityPattern {
  pattern: RegExp;
  level: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  points: number; // Deduction from 100
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // Critical - Dangerous execution patterns
  {
    pattern: /Invoke-Expression|iex\s/i,
    level: 'critical',
    message: 'Dynamic code execution detected (Invoke-Expression)',
    recommendation: 'Avoid dynamic code execution. Use predefined cmdlets instead.',
    points: 30
  },
  {
    pattern: /Add-Type\s+-TypeDefinition/i,
    level: 'critical',
    message: 'Runtime C# code compilation detected',
    recommendation: 'Review compiled code for malicious behavior. Use pre-compiled assemblies when possible.',
    points: 35
  },
  {
    pattern: /-EncodedCommand|-enc\s/i,
    level: 'critical',
    message: 'Encoded command execution detected',
    recommendation: 'Encoded commands can hide malicious code. Always decode and review.',
    points: 40
  },
  {
    pattern: /New-Object\s+.*ComObject|CreateObject/i,
    level: 'critical',
    message: 'COM object creation detected',
    recommendation: 'COM objects can bypass security controls. Use native PowerShell cmdlets.',
    points: 25
  },
  {
    pattern: /Export-PfxCertificate|Export-Certificate.*-Type\s+CERT/i,
    level: 'critical',
    message: 'Certificate export detected',
    recommendation: 'Exporting certificates with private keys is highly sensitive.',
    points: 35
  },
  {
    pattern: /DownloadString|DownloadFile/i,
    level: 'critical',
    message: 'Remote file download detected',
    recommendation: 'Ensure downloaded content is from trusted sources only.',
    points: 25
  },
  {
    pattern: /\$credential.*GetNetworkCredential|ConvertFrom-SecureString\s+-AsPlainText/i,
    level: 'critical',
    message: 'Credential harvesting pattern detected',
    recommendation: 'Never expose credentials in plain text. Use secure storage.',
    points: 40
  },
  {
    pattern: /Remove-Item.*-Recurse.*-Force/i,
    level: 'critical',
    message: 'Recursive forced deletion detected',
    recommendation: 'Add confirmation prompts before destructive operations.',
    points: 25
  },
  {
    pattern: /Start-Process.*-Verb\s+RunAs/i,
    level: 'warning',
    message: 'Elevation to administrator detected',
    recommendation: 'Ensure elevation is necessary and document why.',
    points: 15
  },
  {
    pattern: /Invoke-Command.*-ScriptBlock/i,
    level: 'warning',
    message: 'Remote script execution detected',
    recommendation: 'Validate remote execution targets and script content.',
    points: 15
  },
  
  // Warning - Registry and system modifications
  {
    pattern: /Set-ItemProperty.*HKLM:|New-ItemProperty.*HKLM:/i,
    level: 'warning',
    message: 'System registry modification detected',
    recommendation: 'Back up registry before modifications. Test in non-production first.',
    points: 15
  },
  {
    pattern: /Remove-Item.*HKLM:|Remove-ItemProperty.*HKLM:/i,
    level: 'critical',
    message: 'System registry deletion detected',
    recommendation: 'Exercise extreme caution. Always back up registry keys.',
    points: 25
  },
  {
    pattern: /Set-ExecutionPolicy/i,
    level: 'warning',
    message: 'Execution policy modification detected',
    recommendation: 'Only modify execution policy when absolutely necessary.',
    points: 15
  },
  
  // Warning - Network operations
  {
    pattern: /Invoke-WebRequest|Invoke-RestMethod|curl\s/i,
    level: 'info',
    message: 'Network request detected',
    recommendation: 'Ensure HTTPS is used and endpoints are trusted.',
    points: 5
  },
  {
    pattern: /New-NetFirewallRule|Set-NetFirewallRule/i,
    level: 'warning',
    message: 'Firewall rule modification detected',
    recommendation: 'Document firewall changes and review security implications.',
    points: 10
  },
  
  // Warning - Credential handling
  {
    pattern: /ConvertTo-SecureString.*-AsPlainText/i,
    level: 'warning',
    message: 'Plain text password conversion detected',
    recommendation: 'Use secure credential storage. Never hardcode passwords.',
    points: 20
  },
  {
    pattern: /Get-Credential/i,
    level: 'info',
    message: 'Credential prompt detected',
    recommendation: 'Good practice - prompting for credentials securely.',
    points: 0
  },
  {
    pattern: /\$password\s*=\s*["']/i,
    level: 'critical',
    message: 'Hardcoded password detected',
    recommendation: 'NEVER hardcode passwords. Use Get-Credential or secure storage.',
    points: 35
  },
  
  // Warning - File operations
  {
    pattern: /Remove-Item.*\*.*-Force/i,
    level: 'critical',
    message: 'Wildcard deletion with force detected',
    recommendation: 'Add -WhatIf and confirmation before destructive wildcard operations.',
    points: 25
  },
  {
    pattern: /Copy-Item.*-Force/i,
    level: 'info',
    message: 'Forced file copy detected',
    recommendation: 'Ensure destination files can be safely overwritten.',
    points: 5
  },
  
  // Warning - Active Directory
  {
    pattern: /Remove-ADUser.*-Confirm:\$false/i,
    level: 'critical',
    message: 'AD user deletion without confirmation detected',
    recommendation: 'Always confirm before deleting user accounts.',
    points: 25
  },
  {
    pattern: /Remove-ADGroup.*-Confirm:\$false/i,
    level: 'critical',
    message: 'AD group deletion without confirmation detected',
    recommendation: 'Always confirm before deleting security groups.',
    points: 25
  },
  
  // Info - Best practices
  {
    pattern: /-WhatIf/i,
    level: 'info',
    message: 'WhatIf parameter used (good practice)',
    recommendation: 'Keep using -WhatIf for testing destructive operations.',
    points: -5 // Bonus points for good practice
  },
  {
    pattern: /-Confirm/i,
    level: 'info',
    message: 'Confirmation parameter used (good practice)',
    recommendation: 'Keep using -Confirm for destructive operations.',
    points: -5 // Bonus points
  },
  {
    pattern: /try\s*{[\s\S]*?}\s*catch/i,
    level: 'info',
    message: 'Error handling detected (good practice)',
    recommendation: 'Keep using try-catch blocks for robust scripts.',
    points: -3 // Bonus points
  }
];

export function scanPowerShellScript(script: string): SecurityScanResult {
  if (!script || script.trim() === '') {
    return {
      securityLevel: 'safe',
      score: 100,
      warnings: [],
      summary: 'No script content to scan.'
    };
  }

  const warnings: SecurityWarning[] = [];
  let score = 100;
  const lines = script.split('\n');

  // Scan each line for security patterns
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('#')) {
      return;
    }

    SECURITY_PATTERNS.forEach(pattern => {
      if (pattern.pattern.test(line)) {
        warnings.push({
          level: pattern.level,
          pattern: pattern.pattern.source,
          line: index + 1,
          message: pattern.message,
          recommendation: pattern.recommendation
        });
        score -= pattern.points;
      }
    });
  });

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine security level
  let securityLevel: SecurityLevel;
  if (score >= 80) {
    securityLevel = 'safe';
  } else if (score >= 50) {
    securityLevel = 'caution';
  } else {
    securityLevel = 'dangerous';
  }

  // Generate summary
  const criticalCount = warnings.filter(w => w.level === 'critical').length;
  const warningCount = warnings.filter(w => w.level === 'warning').length;
  const infoCount = warnings.filter(w => w.level === 'info').length;

  let summary = '';
  if (criticalCount > 0) {
    summary = `Found ${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}.`;
  } else if (warningCount > 0) {
    summary = `Found ${warningCount} warning${warningCount !== 1 ? 's' : ''}, ${infoCount} info item${infoCount !== 1 ? 's' : ''}.`;
  } else if (infoCount > 0) {
    summary = `Script looks safe. ${infoCount} info item${infoCount !== 1 ? 's' : ''} noted.`;
  } else {
    summary = 'Script appears safe with no security concerns detected.';
  }

  return {
    securityLevel,
    score,
    warnings,
    summary
  };
}

export function getSecurityLevelColor(level: SecurityLevel): string {
  switch (level) {
    case 'safe':
      return 'text-green-600 dark:text-green-400';
    case 'caution':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'dangerous':
      return 'text-red-600 dark:text-red-400';
  }
}

export function getSecurityLevelBadgeVariant(level: SecurityLevel): 'default' | 'secondary' | 'destructive' {
  switch (level) {
    case 'safe':
      return 'default';
    case 'caution':
      return 'secondary';
    case 'dangerous':
      return 'destructive';
  }
}

export function getWarningLevelColor(level: 'info' | 'warning' | 'critical'): string {
  switch (level) {
    case 'info':
      return 'text-blue-600 dark:text-blue-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'critical':
      return 'text-red-600 dark:text-red-400';
  }
}
