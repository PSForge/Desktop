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
  instructions?: string;
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
    instructions: `**How This Task Works:**
- Discovers all event logs on the system
- Displays configuration for each log (size, retention, status)
- Supports filtering by log type (Classic, Admin, Operational)
- Optional CSV export for documentation

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Access to Event Log service

**What You Need to Provide:**
- Log type filter: All, Classic, Admin, Operational, Analytical, or Debug
- Optional: Export path for CSV output

**What the Script Does:**
1. Queries all event logs using Get-WinEvent
2. Filters by selected log type if specified
3. Retrieves log name, type, enabled status, max size, record count, last write time
4. Displays results in formatted table
5. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Classic logs: Application, Security, System
- Admin logs: administrative event channels
- Operational logs: runtime operational events
- Typical use: inventory, documentation, capacity planning
- CSV export useful for trending analysis and compliance reports
- Some logs may be empty or disabled`,
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
    instructions: `**How This Task Works:**
- Captures complete event log configuration as baseline
- Exports to JSON format for drift detection
- Records enabled state, size limits, retention mode, and security
- Essential for compliance and change tracking

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Write access to baseline output location

**What You Need to Provide:**
- Baseline output file path (JSON format)

**What the Script Does:**
1. Queries all event logs on system
2. Extracts configuration: log name, enabled state, max size, retention mode, security descriptor
3. Converts to JSON format with full structure
4. Saves to specified file path
5. Reports successful baseline creation

**Important Notes:**
- No administrator privileges required
- JSON format for easy parsing and comparison
- Compare baselines over time to detect configuration drift
- Typical use: compliance audits, change control, security baselining
- Use with version control for historical tracking
- Include in disaster recovery documentation
- Security descriptors define log access permissions`,
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
    instructions: `**How This Task Works:**
- Enables or disables specific event log channels
- Optionally configures maximum log size
- Works with classic logs and ETW (Event Tracing for Windows) channels
- Changes persist across reboots

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Event log channel must exist

**What You Need to Provide:**
- Log name (e.g., "Application" or "Microsoft-Windows-Sysmon/Operational")
- Action: Enable or Disable
- Optional: Maximum size in MB

**What the Script Does:**
1. Retrieves specified event log configuration
2. Sets enabled state to true or false
3. Optionally configures maximum log size
4. Saves changes to system
5. Reports action completed

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Disabling logs stops event collection immediately
- Typical use: enable Sysmon logs, disable noisy debug logs
- ETW channels support advanced diagnostics
- Some logs like Security cannot be disabled
- Enabled logs consume disk space
- Consider impact before disabling critical logs`,
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
    instructions: `**How This Task Works:**
- Configures retention policy for multiple logs at once
- Sets maximum log size and retention mode
- Supports three retention modes: Overwrite, Archive, DoNotOverwrite
- Efficient for standardizing log configuration

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient disk space for log sizes

**What You Need to Provide:**
- Comma-separated log names (e.g., "Application,Security,System")
- Maximum size in MB
- Retention mode: Overwrite (circular), Archive (auto-backup), or DoNotOverwrite

**What the Script Does:**
1. Parses list of log names
2. For each log, retrieves current configuration
3. Sets maximum size to specified value
4. Configures retention mode (Circular, AutoBackup, or default)
5. Saves changes and reports success for each log

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Overwrite (Circular): oldest events overwritten when full
- Archive (AutoBackup): log archived when full, new log started
- DoNotOverwrite: events stop being logged when full
- Typical use: standardize retention across servers, compliance requirements
- Archive mode requires sufficient disk space
- Consider compliance requirements before setting retention
- Some logs may fail if name is incorrect`,
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
        Write-Host "✓ $LogName\`: $($MaxSize/1MB)MB, $Mode" -ForegroundColor Green
    }
}`;
    }
  },

  {
    id: 'clear-logs',
    name: 'Clear Event Logs with Backup',
    category: 'Maintenance & Retention',
    description: 'Clear selected logs after backing up to .evtx files',
    instructions: `**How This Task Works:**
- Backs up event logs to .evtx files before clearing
- Optionally compresses backups to save space
- Uses wevtutil for reliable backup and clear operations
- Prevents data loss during log maintenance

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient disk space for backups
- wevtutil.exe (built into Windows)

**What You Need to Provide:**
- Comma-separated log names to clear
- Backup directory path
- Optional: Enable compression (default: true)

**What the Script Does:**
1. Creates backup directory if it doesn't exist
2. For each log: exports to timestamped .evtx file
3. Optionally compresses backup to .zip and deletes .evtx
4. Clears the log using wevtutil
5. Reports each log cleared with backup confirmation

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Always backs up before clearing (safety measure)
- Compression saves significant disk space
- Typical use: log maintenance, troubleshooting cleanup, capacity management
- Backup files can be imported back into Event Viewer if needed
- Clearing generates Event ID 1102 (audit trail)
- Consider retention requirements before clearing Security log
- Timestamp format: yyyyMMdd-HHmmss ensures unique filenames`,
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
    instructions: `**How This Task Works:**
- Searches for specific event IDs within a time range
- Filters events by log name and hours back
- Displays matching events with timestamp and message
- Optional CSV export for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for most logs (Security may require admin)
- Access to specified event log

**What You Need to Provide:**
- Log name (e.g., "Security", "Application", "System")
- Comma-separated event IDs (e.g., "4624,4625,4672")
- Hours back to search (default: 24)
- Optional: Export path for CSV output

**What the Script Does:**
1. Calculates start time from hours back parameter
2. Creates filter with log name, event IDs, and time range
3. Queries events using Get-WinEvent
4. Displays results with time, ID, level, and message
5. Optionally exports to CSV file

**Important Notes:**
- Standard permissions for most logs (Security log may require admin)
- FilterHashtable provides efficient querying
- Typical use: troubleshooting, security investigations, application diagnostics
- Common Security event IDs: 4624 (logon), 4625 (failed logon), 4672 (admin logon)
- Common Application/System IDs vary by application
- CSV export useful for further analysis in Excel
- Large time ranges may take longer to query`,
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
    instructions: `**How This Task Works:**
- Analyzes event frequency over specified time period
- Identifies most common event IDs (trending events)
- Shows event count and sample message for each
- Useful for identifying noisy events or patterns

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for most logs
- Access to specified event log

**What You Need to Provide:**
- Log name (e.g., "Application", "System")
- Days back to analyze
- Number of top events to display (e.g., 10)

**What the Script Does:**
1. Calculates start time from days back parameter
2. Retrieves all events from log within time range
3. Groups events by Event ID and counts occurrences
4. Sorts by count (most frequent first)
5. Displays top N events with ID, count, and sample message

**Important Notes:**
- Standard permissions for most logs
- Large time ranges on busy logs may take time to process
- Typical use: identify noisy applications, find recurring errors, trend analysis
- Sample message shows one example of each event type
- Use results to tune event filtering or log retention
- High-frequency events may indicate issues or normal activity
- Consider investigating unexpected high-frequency events`,
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
    instructions: `**How This Task Works:**
- Searches Security log for critical security events
- Predefined filters for common security scenarios
- Covers logons, privilege use, account management
- Optional CSV export for investigation

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended (Security log access)
- Windows Audit Policy must be configured to generate events

**What You Need to Provide:**
- Security event type: Failed Logons, Successful Logons, Admin Logons, Account Created, Group Added, or All
- Hours back to search
- Optional: Export path for CSV output

**What the Script Does:**
1. Maps event type to Windows Security event IDs
2. Calculates search timeframe
3. Queries Security log for specified event IDs
4. Displays results with timestamp, ID, and message
5. Optionally exports to CSV for analysis

**Important Notes:**
- Administrator privileges recommended for Security log access
- Event ID 4624: successful logon
- Event ID 4625: failed logon (potential brute force attempts)
- Event ID 4672: special privileges assigned to new logon (admin)
- Event ID 4720: user account created
- Event ID 4732: member added to security-enabled local group
- Typical use: security auditing, threat detection, compliance
- Failed logons may indicate unauthorized access attempts
- CSV export useful for SIEM or analysis tools`,
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
    instructions: `**How This Task Works:**
- Configures Windows Advanced Audit Policy
- Sets auditing for logon events, privilege use, and object access
- Uses auditpol.exe to configure subcategories
- Creates baseline for security event generation

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- auditpol.exe (built into Windows)
- Windows Advanced Audit Policy supported (Vista+)

**What You Need to Provide:**
- Logon events: Success, Failure, Both, or None
- Privilege use: Success, Failure, Both, or None
- Optional: Object access: Success, Failure, Both, or None

**What the Script Does:**
1. Configures Logon/Logoff auditing subcategory
2. Configures Special Logon (privilege use) subcategory
3. Optionally configures File System (object access) subcategory
4. Displays confirmation message
5. Shows current audit policy for Logon/Logoff category

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Success: audit successful operations
- Failure: audit failed operations
- Both: audit success and failure (recommended for security)
- Typical use: security baseline, compliance (CIS, NIST), threat detection
- Object access auditing can generate high volume of events
- Configure Security log retention before enabling audit policy
- Changes take effect immediately
- Verify Security log size is adequate for event volume`,
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
    instructions: `**How This Task Works:**
- Detects potential log tampering and audit policy changes
- Searches for Event ID 1102 (audit log cleared)
- Searches for Event ID 4719 (audit policy modified)
- Essential for detecting anti-forensic activities

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended (Security log access)
- Audit policy must be configured to log these events

**What You Need to Provide:**
- Days back to search for tampering events
- Alert method: Console Only or Export CSV
- Optional: Alert export path for CSV output

**What the Script Does:**
1. Calculates search timeframe from days back
2. Searches Security log for Event ID 1102 (log cleared events)
3. Searches Security log for Event ID 4719 (audit policy changes)
4. Combines and sorts events chronologically
5. Displays warning if tampering detected or success if clean
6. Optionally exports alerts to CSV file

**Important Notes:**
- Administrator privileges recommended for Security log access
- Event ID 1102: audit log was cleared (major security indicator)
- Event ID 4719: system audit policy was changed
- Typical use: security monitoring, incident response, forensics
- Log clearing often indicates malicious activity or cover-up
- Legitimate clearing should be documented and scheduled
- Include in security monitoring and alerting workflows
- CSV export useful for security incident reports`,
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
    instructions: `**How This Task Works:**
- Monitors event log disk usage against capacity limits
- Alerts when logs approach maximum size threshold
- Prevents log overflow and event loss
- Proactive capacity management

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Access to event log configuration

**What You Need to Provide:**
- Capacity threshold percentage (e.g., 80%)
- Comma-separated list of critical logs to monitor

**What the Script Does:**
1. Parses list of logs to monitor
2. For each log: retrieves current size and maximum size
3. Calculates percentage usage
4. Identifies logs exceeding threshold
5. Displays alerts for logs nearing capacity or success if all OK

**Important Notes:**
- No administrator privileges required
- Typical threshold: 80-90% capacity
- Typical use: proactive monitoring, prevent event loss, capacity planning
- Logs at 100% may stop recording events (DoNotOverwrite mode) or overwrite oldest events (Circular mode)
- Schedule this check regularly (daily or hourly for critical systems)
- Security log capacity critical for audit compliance
- Consider increasing log size or archiving if frequently at threshold
- Alert output suitable for monitoring systems or email alerts`,
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
    instructions: `**How This Task Works:**
- Verifies critical logs are enabled and collecting events
- Compares expected enabled logs against actual state
- Detects disabled logs that should be running
- Essential for security and compliance monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Access to event log configuration

**What You Need to Provide:**
- Comma-separated list of logs expected to be enabled (e.g., "Security,Application,System,Microsoft-Windows-Sysmon/Operational")

**What the Script Does:**
1. Parses list of expected enabled logs
2. For each log: checks if it exists and enabled status
3. Identifies logs that exist but are disabled
4. Displays warning for disabled critical logs or success if all enabled
5. Reports count of compliance issues

**Important Notes:**
- No administrator privileges required
- Typical critical logs: Security, Application, System, Sysmon
- Typical use: compliance checking, security baselining, configuration validation
- Disabled logs do not collect events (security gap)
- Security log should NEVER be disabled
- Sysmon log critical if Sysmon is installed
- Schedule regular checks to detect configuration drift
- Failed check may indicate tampering or misconfiguration
- Use "Enable/Disable Event Log Channel" task to fix issues`,
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
