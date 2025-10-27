import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface EventLogTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface EventLogTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: EventLogTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const eventLogTasks: EventLogTask[] = [
  {
    id: 'enum-event-logs',
    name: 'Enumerate All Event Logs',
    category: 'Log Inventory',
    description: 'List all available event logs with configuration details (size, retention, enabled state)',
    parameters: [
      { id: 'logType', label: 'Log Type Filter', type: 'select', required: false, options: ['All', 'Classic', 'Admin', 'Operational', 'Analytical', 'Debug'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\EventLogs.csv' }
    ],
    scriptTemplate: (params) => {
      const logType = escapePowerShellString(params.logType || 'All');
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Enumerate Event Logs
# Generated: ${new Date().toISOString()}

$LogType = "${logType}"
$Logs = Get-WinEvent -ListLog * -ErrorAction SilentlyContinue | Where-Object {
    $LogType -eq 'All' -or $_.LogType -eq $LogType
} | Select-Object LogName, LogType, IsEnabled, MaximumSizeInBytes, RecordCount, LastWriteTime

$Logs | Format-Table -AutoSize
${exportPath ? `$Logs | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'export-log-baseline',
    name: 'Export Log Configuration Baseline',
    category: 'Log Inventory',
    description: 'Export current log configuration for drift detection and compliance',
    parameters: [
      { id: 'baselinePath', label: 'Baseline Output Path (JSON)', type: 'path', required: true, placeholder: 'C:\\Baselines\\EventLogBaseline.json' }
    ],
    scriptTemplate: (params) => {
      const baselinePath = escapePowerShellString(params.baselinePath);
      
      return `# Export Event Log Configuration Baseline
# Generated: ${new Date().toISOString()}

$Baseline = Get-WinEvent -ListLog * | Select-Object LogName, IsEnabled, MaximumSizeInBytes, LogMode, SecurityDescriptor | ConvertTo-Json -Depth 3
$Baseline | Out-File "${baselinePath}" -Encoding UTF8
Write-Host "✓ Baseline exported to ${baselinePath}" -ForegroundColor Green`;
    }
  },

  {
    id: 'enable-disable-log',
    name: 'Enable/Disable Event Log Channel',
    category: 'Log Inventory',
    description: 'Enable or disable specific event log channels (classic or ETW)',
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, placeholder: 'Microsoft-Windows-Sysmon/Operational' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'] },
      { id: 'maxSize', label: 'Max Size (MB)', type: 'number', required: false, placeholder: '100' }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const action = params.action;
      const maxSize = params.maxSize ? Number(params.maxSize) : null;
      
      return `# ${action} Event Log Channel
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$Log = Get-WinEvent -ListLog $LogName -ErrorAction Stop

$Log.IsEnabled = ${action === 'Enable' ? '$true' : '$false'}
${maxSize ? `$Log.MaximumSizeInBytes = ${maxSize} * 1MB` : ''}
$Log.SaveChanges()

Write-Host "✓ Log ${action.toLowerCase()}d: $LogName" -ForegroundColor Green`;
    }
  },

  {
    id: 'set-retention-policy',
    name: 'Configure Log Retention Policy (Bulk)',
    category: 'Maintenance & Retention',
    description: 'Set maximum size and retention mode for multiple logs',
    parameters: [
      { id: 'logNames', label: 'Log Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Application,Security,System' },
      { id: 'maxSizeMB', label: 'Maximum Size (MB)', type: 'number', required: true, defaultValue: 100 },
      { id: 'retentionMode', label: 'Retention Mode', type: 'select', required: true, options: ['Overwrite', 'Archive', 'DoNotOverwrite'], defaultValue: 'Overwrite' }
    ],
    scriptTemplate: (params) => {
      const logs = params.logNames.split(',').map((l: string) => l.trim());
      const maxSize = Number(params.maxSizeMB);
      const mode = escapePowerShellString(params.retentionMode);
      
      return `# Set Log Retention Policy (Bulk)
# Generated: ${new Date().toISOString()}

$Logs = ${buildPowerShellArray(logs)}
$MaxSize = ${maxSize} * 1MB
$Mode = "${mode}"

foreach ($LogName in $Logs) {
    $Log = Get-WinEvent -ListLog $LogName -ErrorAction SilentlyContinue
    if ($Log) {
        $Log.MaximumSizeInBytes = $MaxSize
        if ($Mode -eq 'Overwrite') {
            $Log.LogMode = 'Circular'
        } elseif ($Mode -eq 'Archive') {
            $Log.LogMode = 'AutoBackup'
        }
        $Log.SaveChanges()
        Write-Host "✓ $LogName`: $($MaxSize/1MB)MB, $Mode" -ForegroundColor Green
    }
}`;
    }
  },

  {
    id: 'clear-logs',
    name: 'Clear Event Logs with Backup',
    category: 'Maintenance & Retention',
    description: 'Clear selected logs after backing up to .evtx files',
    parameters: [
      { id: 'logNames', label: 'Log Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Application,System' },
      { id: 'backupPath', label: 'Backup Directory', type: 'path', required: true, placeholder: 'C:\\LogBackups' },
      { id: 'compress', label: 'Compress Backups', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const logs = params.logNames.split(',').map((l: string) => l.trim());
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = toPowerShellBoolean(params.compress ?? true);
      
      return `# Clear Event Logs with Backup
# Generated: ${new Date().toISOString()}

$BackupDir = "${backupPath}"
New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
$Logs = ${buildPowerShellArray(logs)}

foreach ($LogName in $Logs) {
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupFile = Join-Path $BackupDir "$LogName-$Timestamp.evtx"
    
    wevtutil epl $LogName $BackupFile
    ${compress ? 'Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force\n    Remove-Item $BackupFile' : ''}
    wevtutil cl $LogName
    
    Write-Host "✓ Cleared $LogName (backed up)" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'search-events-by-id',
    name: 'Search Events by ID and Time Range',
    category: 'Querying & Filtering',
    description: 'Search specific event IDs across logs with date filters',
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Security' },
      { id: 'eventIDs', label: 'Event IDs (comma-separated)', type: 'text', required: true, placeholder: '4624,4625,4672' },
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\EventSearch.csv' }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const ids = params.eventIDs.split(',').map((i: string) => i.trim());
      const hours = Number(params.hours || 24);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Search Events by ID
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$EventIDs = ${buildPowerShellArray(ids)}
$StartTime = (Get-Date).AddHours(-${hours})

$Filter = @{
    LogName = $LogName
    ID = $EventIDs
    StartTime = $StartTime
}

$Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction SilentlyContinue
$Events | Select-Object TimeCreated, Id, LevelDisplayName, Message | Format-Table -Wrap

${exportPath ? `$Events | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'top-event-ids',
    name: 'Get Top Event IDs (Trending)',
    category: 'Querying & Filtering',
    description: 'Extract most frequent event IDs over a time period',
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Application' },
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'topCount', label: 'Top N Events', type: 'number', required: true, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const days = Number(params.days);
      const topCount = Number(params.topCount);
      
      return `# Top Event IDs Trending Report
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$StartTime = (Get-Date).AddDays(-${days})

$Events = Get-WinEvent -FilterHashtable @{LogName = $LogName; StartTime = $StartTime} -ErrorAction SilentlyContinue

$TopEvents = $Events | Group-Object Id | Sort-Object Count -Descending | Select-Object -First ${topCount} @{N='EventID'; E={$_.Name}}, Count, @{N='Sample'; E={$_.Group[0].Message}}

$TopEvents | Format-Table -AutoSize
Write-Host "✓ Top ${topCount} events from $LogName (last ${days} days)" -ForegroundColor Green`;
    }
  },

  {
    id: 'search-security-events',
    name: 'Search Security Events (Failed Logons, Privilege Use)',
    category: 'Querying & Filtering',
    description: 'Query common security event IDs with filters',
    parameters: [
      { id: 'eventType', label: 'Security Event Type', type: 'select', required: true, options: ['Failed Logons (4625)', 'Successful Logons (4624)', 'Admin Logons (4672)', 'Account Created (4720)', 'Group Added (4732)', 'All'] },
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const idMap: Record<string, string> = {
        'Failed Logons (4625)': '4625',
        'Successful Logons (4624)': '4624',
        'Admin Logons (4672)': '4672',
        'Account Created (4720)': '4720',
        'Group Added (4732)': '4732',
        'All': '4624,4625,4672,4720,4732'
      };
      const ids = idMap[params.eventType].split(',');
      const hours = Number(params.hours);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Search Security Events
# Generated: ${new Date().toISOString()}

$EventIDs = ${buildPowerShellArray(ids)}
$StartTime = (Get-Date).AddHours(-${hours})

$Events = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=$EventIDs; StartTime=$StartTime} -ErrorAction SilentlyContinue
$Events | Select-Object TimeCreated, Id, Message | Format-Table -Wrap

${exportPath ? `$Events | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'enable-audit-policy',
    name: 'Enable Advanced Audit Policy Baseline',
    category: 'Security & Audit',
    description: 'Configure audit policy categories (logon, privilege use, object access)',
    parameters: [
      { id: 'logonEvents', label: 'Audit Logon Events', type: 'select', required: true, options: ['Success', 'Failure', 'Both', 'None'], defaultValue: 'Both' },
      { id: 'privilegeUse', label: 'Audit Privilege Use', type: 'select', required: true, options: ['Success', 'Failure', 'Both', 'None'], defaultValue: 'Both' },
      { id: 'objectAccess', label: 'Audit Object Access', type: 'select', required: false, options: ['Success', 'Failure', 'Both', 'None'], defaultValue: 'None' }
    ],
    scriptTemplate: (params) => {
      const logon = params.logonEvents;
      const priv = params.privilegeUse;
      const obj = params.objectAccess;
      
      return `# Enable Advanced Audit Policy
# Generated: ${new Date().toISOString()}

# Configure Logon/Logoff Auditing
auditpol /set /subcategory:"Logon" /success:${logon === 'Success' || logon === 'Both' ? 'enable' : 'disable'} /failure:${logon === 'Failure' || logon === 'Both' ? 'enable' : 'disable'}

# Configure Privilege Use Auditing  
auditpol /set /subcategory:"Special Logon" /success:${priv === 'Success' || priv === 'Both' ? 'enable' : 'disable'} /failure:${priv === 'Failure' || priv === 'Both' ? 'enable' : 'disable'}

${obj && obj !== 'None' ? `# Configure Object Access Auditing
auditpol /set /subcategory:"File System" /success:${obj === 'Success' || obj === 'Both' ? 'enable' : 'disable'} /failure:${obj === 'Failure' || obj === 'Both' ? 'enable' : 'disable'}` : ''}

Write-Host "✓ Audit policy configured" -ForegroundColor Green
auditpol /get /category:"Logon/Logoff"`;
    }
  },

  {
    id: 'detect-log-tampering',
    name: 'Detect Log Tampering & Clearing',
    category: 'Security & Audit',
    description: 'Search for Event ID 1102 (log cleared) and 4719 (audit policy change)',
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'alert', label: 'Alert Method', type: 'select', required: false, options: ['Console Only', 'Export CSV'], defaultValue: 'Console Only' },
      { id: 'exportPath', label: 'Alert Export Path', type: 'path', required: false, placeholder: 'C:\\Security\\LogTampering.csv' }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const doExport = params.alert === 'Export CSV' && params.exportPath;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Detect Log Tampering
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$Cleared = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=1102; StartTime=$StartTime} -ErrorAction SilentlyContinue
$PolicyChange = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4719; StartTime=$StartTime} -ErrorAction SilentlyContinue

$All = $Cleared + $PolicyChange | Sort-Object TimeCreated

if ($All) {
    Write-Host "⚠ WARNING: Detected $($All.Count) tampering events!" -ForegroundColor Red
    $All | Select-Object TimeCreated, Id, Message | Format-Table -Wrap
    ${doExport ? `$All | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "✓ Alert exported to ${exportPath}" -ForegroundColor Yellow` : ''}
} else {
    Write-Host "✓ No tampering detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'monitor-log-capacity',
    name: 'Monitor Log Capacity & Alert',
    category: 'Hygiene & Monitoring',
    description: 'Check logs nearing max capacity and alert preemptively',
    parameters: [
      { id: 'threshold', label: 'Capacity Threshold (%)', type: 'number', required: true, defaultValue: 80 },
      { id: 'criticalLogs', label: 'Critical Logs to Monitor', type: 'textarea', required: true, placeholder: 'Security,Application,System' }
    ],
    scriptTemplate: (params) => {
      const threshold = Number(params.threshold);
      const logs = params.criticalLogs.split(',').map((l: string) => l.trim());
      
      return `# Monitor Log Capacity
# Generated: ${new Date().toISOString()}

$Threshold = ${threshold}
$CriticalLogs = ${buildPowerShellArray(logs)}
$Alerts = @()

foreach ($LogName in $CriticalLogs) {
    $Log = Get-WinEvent -ListLog $LogName -ErrorAction SilentlyContinue
    if ($Log) {
        $Usage = ($Log.FileSize / $Log.MaximumSizeInBytes) * 100
        if ($Usage -ge $Threshold) {
            $Alerts += "{0}: {1:F1}% ({2:N0} MB / {3:N0} MB)" -f $LogName, $Usage, ($Log.FileSize/1MB), ($Log.MaximumSizeInBytes/1MB)
        }
    }
}

if ($Alerts) {
    Write-Host "⚠ Logs nearing capacity:" -ForegroundColor Yellow
    $Alerts | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "✓ All monitored logs below ${threshold}% capacity" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'detect-disabled-logs',
    name: 'Detect Disabled Critical Logs',
    category: 'Hygiene & Monitoring',
    description: 'Report logs that should be enabled but are disabled',
    parameters: [
      { id: 'expectedLogs', label: 'Expected Enabled Logs', type: 'textarea', required: true, placeholder: 'Security,Application,System,Microsoft-Windows-Sysmon/Operational' }
    ],
    scriptTemplate: (params) => {
      const logs = params.expectedLogs.split(',').map((l: string) => l.trim());
      
      return `# Detect Disabled Critical Logs
# Generated: ${new Date().toISOString()}

$ExpectedLogs = ${buildPowerShellArray(logs)}
$Disabled = @()

foreach ($LogName in $ExpectedLogs) {
    $Log = Get-WinEvent -ListLog $LogName -ErrorAction SilentlyContinue
    if ($Log -and -not $Log.IsEnabled) {
        $Disabled += $LogName
    }
}

if ($Disabled) {
    Write-Host "⚠ WARNING: Critical logs are DISABLED:" -ForegroundColor Red
    $Disabled | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
    Write-Host "✓ All expected logs are enabled" -ForegroundColor Green
}`;
    }
  },
];
