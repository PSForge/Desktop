/**
 * Escapes a string for safe use in PowerShell scripts
 * Handles quotes, backticks, and special characters
 */
export function escapePowerShellString(value: string | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  
  // Convert to string if not already
  const str = String(value);
  
  // Escape backticks first (they're PowerShell's escape character)
  let escaped = str.replace(/`/g, '``');
  
  // Escape double quotes
  escaped = escaped.replace(/"/g, '`"');
  
  // Escape dollar signs (variable expansion)
  escaped = escaped.replace(/\$/g, '`$');
  
  return escaped;
}

/**
 * Safely builds a PowerShell array from a comma-separated string
 */
export function buildPowerShellArray(value: string | undefined | null): string {
  if (!value || value.trim() === '') {
    return '@()';
  }
  
  const items = value
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '');
  
  if (items.length === 0) {
    return '@()';
  }
  
  const escapedItems = items.map(item => `"${escapePowerShellString(item)}"`);
  return `@(${escapedItems.join(', ')})`;
}

/**
 * Safely converts a value to a PowerShell boolean
 */
export function toPowerShellBoolean(value: any): string {
  return value ? '$true' : '$false';
}

/**
 * Validates that required fields are present
 */
export function validateRequiredFields(params: Record<string, any>, required: string[]): string[] {
  const missing: string[] = [];
  
  for (const field of required) {
    const value = params[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Safely builds a PowerShell variable assignment
 */
export function buildVariableAssignment(varName: string, value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  
  if (typeof value === 'boolean') {
    return `$${varName} = ${toPowerShellBoolean(value)}`;
  }
  
  if (typeof value === 'number') {
    return `$${varName} = ${value}`;
  }
  
  return `$${varName} = "${escapePowerShellString(String(value))}"`;
}
