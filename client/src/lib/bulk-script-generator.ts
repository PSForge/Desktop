import { escapePowerShellString } from './powershell-utils';

export interface BulkTaskConfig {
  taskId: string;
  taskName: string;
  parameters: any[];
  scriptTemplate: string;
  parameterMappings: Record<string, string>; // Maps parameter ID to CSV column name
}

export interface BulkScriptOptions {
  includeErrorHandling: boolean;
  includeProgressOutput: boolean;
  includeRetryLogic: boolean;
}

/**
 * Generate a PowerShell script for bulk operations
 */
export function generateBulkScript(
  tasks: BulkTaskConfig[],
  csvData: Record<string, string>[],
  options: BulkScriptOptions = {
    includeErrorHandling: true,
    includeProgressOutput: true,
    includeRetryLogic: false
  }
): string {
  if (csvData.length === 0) {
    return '# No data provided for bulk operation\n';
  }

  const lines: string[] = [];

  // Header
  lines.push('# PowerShell Bulk Operations Script');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Total Items: ${csvData.length}`);
  lines.push(`# Total Tasks per Item: ${tasks.length}`);
  lines.push('');

  // Error handling setup
  if (options.includeErrorHandling) {
    lines.push('# Error handling configuration');
    lines.push('$ErrorActionPreference = "Continue"');
    lines.push('$SuccessCount = 0');
    lines.push('$FailureCount = 0');
    lines.push('$Errors = @()');
    lines.push('');
  }

  // Define data array
  lines.push('# Define bulk data');
  lines.push('$BulkData = @(');
  csvData.forEach((row, index) => {
    lines.push('  @{');
    Object.entries(row).forEach(([key, value]) => {
      const escapedValue = escapePowerShellString(value);
      lines.push(`    ${key} = "${escapedValue}"`);
    });
    lines.push(`  }${index < csvData.length - 1 ? ',' : ''}`);
  });
  lines.push(')');
  lines.push('');

  // Progress output
  if (options.includeProgressOutput) {
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host "Starting Bulk Operations" -ForegroundColor Cyan');
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host ""');
    lines.push('');
  }

  // Main processing loop
  lines.push('# Process each item');
  lines.push('$ItemNumber = 0');
  lines.push('foreach ($Item in $BulkData) {');
  lines.push('  $ItemNumber++');
  lines.push('');

  if (options.includeProgressOutput) {
    lines.push('  Write-Host "--------------------------------------------" -ForegroundColor Yellow');
    lines.push('  Write-Host "Processing Item $ItemNumber of $($BulkData.Count)" -ForegroundColor Yellow');
    lines.push('  Write-Host "--------------------------------------------" -ForegroundColor Yellow');
    lines.push('');
  }

  if (options.includeErrorHandling) {
    lines.push('  try {');
    lines.push('');
  }

  // Add each task
  tasks.forEach((task, taskIndex) => {
    if (options.includeProgressOutput) {
      lines.push(`    Write-Host "  → ${task.taskName}..." -ForegroundColor Gray`);
    }

    // Replace placeholder values with CSV column references
    let taskScript = task.scriptTemplate;
    
    Object.entries(task.parameterMappings).forEach(([paramId, csvColumn]) => {
      // Quote column names to handle spaces and special characters
      const quotedColumn = csvColumn.includes(' ') || csvColumn.includes('-') || csvColumn.match(/[^a-zA-Z0-9_]/)
        ? `'${csvColumn.replace(/'/g, "''")}'`
        : csvColumn;
      
      const placeholder = `__CSVMAP_${paramId}__`;
      const csvReference = `$($Item.${quotedColumn})`;
      
      // Replace all occurrences of placeholder with CSV reference
      // Handle both quoted and unquoted contexts
      taskScript = taskScript.replace(new RegExp(`["']${placeholder}["']`, 'g'), csvReference);
      taskScript = taskScript.replace(new RegExp(placeholder, 'g'), csvReference);
    });

    // Add the task script with CSV references
    const taskLines = taskScript.split('\n');
    
    taskLines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and generated timestamp comments
      if (!trimmedLine) return;
      if (trimmedLine.startsWith('# Generated:')) return;
      
      // Add the line
      if (trimmedLine) {
        lines.push(`    ${line}`);
      }
    });
    
    lines.push('');
  });

  if (options.includeErrorHandling) {
    if (options.includeProgressOutput) {
      lines.push('    Write-Host "  ✓ Successfully completed" -ForegroundColor Green');
    }
    lines.push('    $SuccessCount++');
    lines.push('');
    lines.push('  } catch {');
    lines.push('    $FailureCount++');
    lines.push('    $ErrorMessage = $_.Exception.Message');
    lines.push('    $Errors += @{');
    lines.push('      ItemNumber = $ItemNumber');
    lines.push('      Item = $Item');
    lines.push('      Error = $ErrorMessage');
    lines.push('    }');
    if (options.includeProgressOutput) {
      lines.push('    Write-Host "  ✗ Failed: $ErrorMessage" -ForegroundColor Red');
    }
    lines.push('  }');
  }

  lines.push('');
  lines.push('}');
  lines.push('');

  // Summary
  if (options.includeProgressOutput) {
    lines.push('Write-Host ""');
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host "Bulk Operations Complete" -ForegroundColor Cyan');
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    
    if (options.includeErrorHandling) {
      lines.push('Write-Host "Total Items: $($BulkData.Count)" -ForegroundColor White');
      lines.push('Write-Host "Successful: $SuccessCount" -ForegroundColor Green');
      lines.push('Write-Host "Failed: $FailureCount" -ForegroundColor Red');
      lines.push('');
      lines.push('if ($Errors.Count -gt 0) {');
      lines.push('  Write-Host ""');
      lines.push('  Write-Host "Errors Encountered:" -ForegroundColor Red');
      lines.push('  $Errors | ForEach-Object {');
      lines.push('    Write-Host "  Item $($_.ItemNumber): $($_.Error)" -ForegroundColor Red');
      lines.push('  }');
      lines.push('}');
    }
  }

  return lines.join('\n');
}

/**
 * Generate a simple foreach loop script
 */
export function generateSimpleForeachScript(
  variableName: string,
  dataArray: any[],
  scriptBlock: string
): string {
  const lines: string[] = [];
  
  lines.push(`foreach ($${variableName} in $DataArray) {`);
  lines.push(`  ${scriptBlock}`);
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Extract required parameters from multiple tasks
 */
export function extractRequiredParameters(tasks: { parameters?: { id: string; name: string; required?: boolean }[] }[]): string[] {
  const params = new Set<string>();
  
  tasks.forEach(task => {
    task.parameters?.forEach(param => {
      if (param.required) {
        params.add(param.id);
      }
    });
  });
  
  return Array.from(params);
}
