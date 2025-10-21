import { ValidationResult } from "@shared/schema";

export function validatePowerShellScript(code: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  
  if (!code.trim()) {
    return { isValid: true, errors: [] };
  }

  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const doubleQuoteMatches = trimmedLine.match(/"/g);
    const singleQuoteMatches = trimmedLine.match(/'/g);
    
    if (doubleQuoteMatches && doubleQuoteMatches.length % 2 !== 0) {
      errors.push({
        line: lineNumber,
        message: 'Unmatched double quotation marks detected - string literals must be properly closed',
        severity: 'error'
      });
    }
    
    if (singleQuoteMatches && singleQuoteMatches.length % 2 !== 0) {
      errors.push({
        line: lineNumber,
        message: 'Unmatched single quotation marks detected - string literals must be properly closed',
        severity: 'error'
      });
    }

    if (trimmedLine.includes('\\\\')) {
      errors.push({
        line: lineNumber,
        message: 'Double backslashes detected - PowerShell uses single backslash in paths',
        severity: 'warning'
      });
    }

    const paramPattern = /-(\w+)/g;
    const params = [...trimmedLine.matchAll(paramPattern)];
    
    params.forEach((match, idx) => {
      const paramName = match[1];
      const nextParamIndex = trimmedLine.indexOf('-', match.index! + 1);
      const valueSection = nextParamIndex > 0 
        ? trimmedLine.substring(match.index! + match[0].length, nextParamIndex)
        : trimmedLine.substring(match.index! + match[0].length);
      
      const hasValue = valueSection.trim() !== '' && 
        !valueSection.trim().startsWith('#');
      
      if (!hasValue) {
        const isSwitchParam = ['Force', 'Recurse', 'PassThru', 'File', 'Directory'].includes(paramName);
        
        if (!isSwitchParam) {
          errors.push({
            line: lineNumber,
            message: `Parameter -${paramName} appears to be missing a value`,
            severity: 'warning'
          });
        }
      }
    });

    if (/[A-Z]:[\\\/]\S+/.test(trimmedLine) && !trimmedLine.includes('"') && !trimmedLine.includes("'")) {
      if (trimmedLine.match(/[A-Z]:[\\\/]\S*\s+\S/)) {
        errors.push({
          line: lineNumber,
          message: 'File path with spaces should be enclosed in quotes',
          severity: 'info'
        });
      }
    }

    const cmdletPattern = /^(Get-|Set-|New-|Remove-|Test-|Start-|Stop-|Invoke-|Copy-|Move-)\S*/;
    const hasCmdlet = cmdletPattern.test(trimmedLine);
    
    if (!hasCmdlet && !trimmedLine.startsWith('#') && trimmedLine.length > 0) {
      const knownKeywords = ['if', 'else', 'elseif', 'foreach', 'for', 'while', 'function', 'param'];
      const startsWithKeyword = knownKeywords.some(kw => 
        new RegExp(`^${kw}\\s*\\(`, 'i').test(trimmedLine)
      );
      
      if (!startsWithKeyword && trimmedLine.includes('-')) {
        errors.push({
          line: lineNumber,
          message: 'Command may be malformed - verify cmdlet name is correct',
          severity: 'info'
        });
      }
    }

    if (trimmedLine.includes('$null') && trimmedLine.includes('=')) {
      errors.push({
        line: lineNumber,
        message: 'Assignment to $null detected - this may not work as intended',
        severity: 'warning'
      });
    }
  });

  const isValid = errors.filter(e => e.severity === 'error').length === 0;

  return {
    isValid,
    errors,
    warnings: errors.filter(e => e.severity === 'warning').map(e => e.message),
  };
}
