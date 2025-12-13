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
  isPremium?: boolean;
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
    isPremium: true,
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
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'export-log-baseline',
    name: 'Export Log Configuration Baseline',
    category: 'Log Inventory',
    description: 'Export current log configuration for drift detection and compliance',
    isPremium: true,
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
Write-Host "[SUCCESS] Baseline exported to ${baselinePath}" -ForegroundColor Green`;
    }
  },

  {
    id: 'enable-disable-log',
    name: 'Enable/Disable Event Log Channel',
    category: 'Log Inventory',
    description: 'Enable or disable specific event log channels (classic or ETW)',
    isPremium: true,
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

Write-Host "[SUCCESS] Log ${action.toLowerCase()}d: $LogName" -ForegroundColor Green`;
    }
  },

  {
    id: 'set-retention-policy',
    name: 'Configure Log Retention Policy (Bulk)',
    category: 'Backup & Management',
    description: 'Set maximum size and retention mode for multiple logs',
    isPremium: true,
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
      const maxSize = Number(params.maxSizeMB);
      const mode = escapePowerShellString(params.retentionMode);
      
      return `# Set Log Retention Policy (Bulk)
# Generated: ${new Date().toISOString()}

$Logs = ${buildPowerShellArray(params.logNames)}
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
        Write-Host "[SUCCESS] $LogName\`: $($MaxSize/1MB)MB, $Mode" -ForegroundColor Green
    }
}`;
    }
  },

  {
    id: 'clear-logs',
    name: 'Clear Event Logs with Backup',
    category: 'Backup & Management',
    description: 'Clear selected logs after backing up to .evtx files',
    isPremium: true,
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
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = toPowerShellBoolean(params.compress ?? true);
      
      return `# Clear Event Logs with Backup
# Generated: ${new Date().toISOString()}

$BackupDir = "${backupPath}"
New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
$Logs = ${buildPowerShellArray(params.logNames)}

foreach ($LogName in $Logs) {
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupFile = Join-Path $BackupDir "$LogName-$Timestamp.evtx"
    
    wevtutil epl $LogName $BackupFile
    ${compress ? 'Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force\n    Remove-Item $BackupFile' : ''}
    wevtutil cl $LogName
    
    Write-Host "[SUCCESS] Cleared $LogName (backed up)" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'search-events-by-id',
    name: 'Search Events by ID and Time Range',
    category: 'Log Analysis',
    description: 'Search specific event IDs across logs with date filters',
    isPremium: true,
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
      const hours = Number(params.hours || 24);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Search Events by ID
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$EventIDs = ${buildPowerShellArray(params.eventIDs)}
$StartTime = (Get-Date).AddHours(-${hours})

$Filter = @{
    LogName = $LogName
    ID = $EventIDs
    StartTime = $StartTime
}

$Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction SilentlyContinue
$Events | Select-Object TimeCreated, Id, LevelDisplayName, Message | Format-Table -Wrap

${exportPath ? `$Events | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'top-event-ids',
    name: 'Get Top Event IDs (Trending)',
    category: 'Log Analysis',
    description: 'Extract most frequent event IDs over a time period',
    isPremium: true,
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
Write-Host "[SUCCESS] Top ${topCount} events from $LogName (last ${days} days)" -ForegroundColor Green`;
    }
  },

  {
    id: 'search-security-events',
    name: 'Search Security Events (Failed Logons, Privilege Use)',
    category: 'Security Auditing',
    description: 'Query common security event IDs with filters',
    isPremium: true,
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
      const idsStr = idMap[params.eventType];
      const hours = Number(params.hours);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Search Security Events
# Generated: ${new Date().toISOString()}

$EventIDs = ${buildPowerShellArray(idsStr)}
$StartTime = (Get-Date).AddHours(-${hours})

$Events = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=$EventIDs; StartTime=$StartTime} -ErrorAction SilentlyContinue
$Events | Select-Object TimeCreated, Id, Message | Format-Table -Wrap

${exportPath ? `$Events | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'enable-audit-policy',
    name: 'Enable Advanced Audit Policy Baseline',
    category: 'Security Auditing',
    description: 'Configure audit policy categories (logon, privilege use, object access)',
    isPremium: true,
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

Write-Host "[SUCCESS] Audit policy configured" -ForegroundColor Green
auditpol /get /category:"Logon/Logoff"`;
    }
  },

  {
    id: 'detect-log-tampering',
    name: 'Detect Log Tampering & Clearing',
    category: 'Security Auditing',
    description: 'Search for Event ID 1102 (log cleared) and 4719 (audit policy change)',
    isPremium: true,
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
    Write-Host "[WARNING] WARNING: Detected $($All.Count) tampering events!" -ForegroundColor Red
    $All | Select-Object TimeCreated, Id, Message | Format-Table -Wrap
    ${doExport ? `$All | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Alert exported to ${exportPath}" -ForegroundColor Yellow` : ''}
} else {
    Write-Host "[SUCCESS] No tampering detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'monitor-log-capacity',
    name: 'Monitor Log Capacity & Alert',
    category: 'Backup & Management',
    description: 'Check logs nearing max capacity and alert preemptively',
    isPremium: true,
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
      
      return `# Monitor Log Capacity
# Generated: ${new Date().toISOString()}

$Threshold = ${threshold}
$CriticalLogs = ${buildPowerShellArray(params.criticalLogs)}
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
    Write-Host "[WARNING] Logs nearing capacity:" -ForegroundColor Yellow
    $Alerts | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "[SUCCESS] All monitored logs below ${threshold}% capacity" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'detect-disabled-logs',
    name: 'Detect Disabled Critical Logs',
    category: 'Compliance',
    description: 'Report logs that should be enabled but are disabled',
    isPremium: true,
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
      return `# Detect Disabled Critical Logs
# Generated: ${new Date().toISOString()}

$ExpectedLogs = ${buildPowerShellArray(params.expectedLogs)}
$Disabled = @()

foreach ($LogName in $ExpectedLogs) {
    $Log = Get-WinEvent -ListLog $LogName -ErrorAction SilentlyContinue
    if ($Log -and -not $Log.IsEnabled) {
        $Disabled += $LogName
    }
}

if ($Disabled) {
    Write-Host "[WARNING] WARNING: Critical logs are DISABLED:" -ForegroundColor Red
    $Disabled | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
    Write-Host "[SUCCESS] All expected logs are enabled" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'analyze-error-events',
    name: 'Analyze Error Events by Source',
    category: 'Log Analysis',
    description: 'Group and count error events by source application over time',
    isPremium: true,
    instructions: `**How This Task Works:**
- Filters events by Error level only
- Groups errors by source (ProviderName)
- Counts occurrences for each source
- Identifies most problematic applications

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for most logs
- Access to specified event log

**What You Need to Provide:**
- Log name to analyze (Application, System, etc.)
- Days back to search
- Optional: Export path for results

**What the Script Does:**
1. Queries specified log for Error level events
2. Groups events by ProviderName (source)
3. Counts and sorts by frequency
4. Shows top error sources with sample messages
5. Optionally exports results to CSV`,
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Application' },
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\ErrorAnalysis.csv' }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Analyze Error Events by Source
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$StartTime = (Get-Date).AddDays(-${days})

$Errors = Get-WinEvent -FilterHashtable @{
    LogName = $LogName
    Level = 2
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$Analysis = $Errors | Group-Object ProviderName | Sort-Object Count -Descending | 
    Select-Object @{N='Source';E={$_.Name}}, Count, @{N='LastOccurrence';E={$_.Group[0].TimeCreated}}, @{N='SampleMessage';E={$_.Group[0].Message.Substring(0, [Math]::Min(100, $_.Group[0].Message.Length))}}

Write-Host "Error Analysis for $LogName (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Errors: $($Errors.Count)" -ForegroundColor Yellow
$Analysis | Format-Table -AutoSize -Wrap

${exportPath ? `$Analysis | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'warning-trend-analysis',
    name: 'Warning Trend Analysis',
    category: 'Log Analysis',
    description: 'Analyze warning event trends over time with hourly breakdown',
    isPremium: true,
    instructions: `**How This Task Works:**
- Collects warning-level events over specified period
- Groups events by hour to show patterns
- Identifies peak warning times
- Useful for capacity planning and proactive maintenance

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to specified event log

**What You Need to Provide:**
- Log name to analyze
- Days back to analyze
- Optional: Export path for trend data`,
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'System' },
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Warning Trend Analysis
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$StartTime = (Get-Date).AddDays(-${days})

$Warnings = Get-WinEvent -FilterHashtable @{
    LogName = $LogName
    Level = 3
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$HourlyTrend = $Warnings | Group-Object { $_.TimeCreated.ToString("yyyy-MM-dd HH:00") } | 
    Sort-Object Name | Select-Object @{N='Hour';E={$_.Name}}, Count

Write-Host "Warning Trend for $LogName (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Warnings: $($Warnings.Count)" -ForegroundColor Yellow
$HourlyTrend | Format-Table -AutoSize

$Peak = $HourlyTrend | Sort-Object Count -Descending | Select-Object -First 1
if ($Peak) {
    Write-Host "Peak Hour: $($Peak.Hour) with $($Peak.Count) warnings" -ForegroundColor Magenta
}

${exportPath ? `$HourlyTrend | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'event-correlation-analysis',
    name: 'Event Correlation Analysis',
    category: 'Log Analysis',
    description: 'Find related events across multiple logs within time windows',
    isPremium: true,
    instructions: `**How This Task Works:**
- Searches for events across multiple logs
- Correlates events within specified time window
- Useful for root cause analysis
- Links related errors across Application and System logs

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to specified event logs

**What You Need to Provide:**
- Primary event ID to search for
- Primary log name
- Correlation window in minutes
- Secondary log to correlate with`,
    parameters: [
      { id: 'primaryEventId', label: 'Primary Event ID', type: 'number', required: true, placeholder: '1000' },
      { id: 'primaryLog', label: 'Primary Log', type: 'text', required: true, defaultValue: 'Application' },
      { id: 'correlationMinutes', label: 'Correlation Window (minutes)', type: 'number', required: true, defaultValue: 5 },
      { id: 'secondaryLog', label: 'Secondary Log', type: 'text', required: true, defaultValue: 'System' },
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const primaryId = Number(params.primaryEventId);
      const primaryLog = escapePowerShellString(params.primaryLog);
      const correlationMinutes = Number(params.correlationMinutes);
      const secondaryLog = escapePowerShellString(params.secondaryLog);
      const hours = Number(params.hours);
      
      return `# Event Correlation Analysis
# Generated: ${new Date().toISOString()}

$PrimaryLog = "${primaryLog}"
$SecondaryLog = "${secondaryLog}"
$PrimaryEventId = ${primaryId}
$CorrelationWindow = ${correlationMinutes}
$StartTime = (Get-Date).AddHours(-${hours})

$PrimaryEvents = Get-WinEvent -FilterHashtable @{
    LogName = $PrimaryLog
    ID = $PrimaryEventId
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

Write-Host "Event Correlation Analysis" -ForegroundColor Cyan
Write-Host "Primary Events Found: $($PrimaryEvents.Count)" -ForegroundColor Yellow

foreach ($Event in $PrimaryEvents) {
    $WindowStart = $Event.TimeCreated.AddMinutes(-$CorrelationWindow)
    $WindowEnd = $Event.TimeCreated.AddMinutes($CorrelationWindow)
    
    $Related = Get-WinEvent -FilterHashtable @{
        LogName = $SecondaryLog
        StartTime = $WindowStart
        EndTime = $WindowEnd
    } -ErrorAction SilentlyContinue | Where-Object { $_.Level -le 3 }
    
    if ($Related) {
        Write-Host "\`nPrimary Event at $($Event.TimeCreated)" -ForegroundColor Green
        Write-Host "Correlated events in $SecondaryLog (within $CorrelationWindow min):" -ForegroundColor White
        $Related | Select-Object TimeCreated, Id, LevelDisplayName, Message | Format-Table -Wrap
    }
}`;
    }
  },

  {
    id: 'pattern-detection',
    name: 'Recurring Pattern Detection',
    category: 'Log Analysis',
    description: 'Detect recurring event patterns and cycles',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes event timing to detect patterns
- Identifies events that occur at regular intervals
- Useful for finding scheduled task issues or cyclic failures
- Helps identify root causes of recurring problems

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Sufficient event history

**What You Need to Provide:**
- Log name to analyze
- Event ID to search for patterns
- Minimum occurrences to consider a pattern
- Days back to analyze`,
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Application' },
      { id: 'eventId', label: 'Event ID', type: 'number', required: true, placeholder: '1000' },
      { id: 'minOccurrences', label: 'Minimum Occurrences', type: 'number', required: true, defaultValue: 5 },
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const eventId = Number(params.eventId);
      const minOccurrences = Number(params.minOccurrences);
      const days = Number(params.days);
      
      return `# Recurring Pattern Detection
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$EventId = ${eventId}
$MinOccurrences = ${minOccurrences}
$StartTime = (Get-Date).AddDays(-${days})

$Events = Get-WinEvent -FilterHashtable @{
    LogName = $LogName
    ID = $EventId
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Sort-Object TimeCreated

if ($Events.Count -lt $MinOccurrences) {
    Write-Host "Insufficient events ($($Events.Count)) for pattern analysis" -ForegroundColor Yellow
    exit
}

Write-Host "Pattern Detection for Event ID $EventId" -ForegroundColor Cyan
Write-Host "Total Occurrences: $($Events.Count)" -ForegroundColor Yellow

$Intervals = @()
for ($i = 1; $i -lt $Events.Count; $i++) {
    $Interval = ($Events[$i].TimeCreated - $Events[$i-1].TimeCreated).TotalMinutes
    $Intervals += $Interval
}

$AvgInterval = ($Intervals | Measure-Object -Average).Average
$StdDev = [Math]::Sqrt(($Intervals | ForEach-Object { [Math]::Pow($_ - $AvgInterval, 2) } | Measure-Object -Average).Average)

Write-Host "\`nInterval Analysis:" -ForegroundColor Green
Write-Host "  Average Interval: $([Math]::Round($AvgInterval, 2)) minutes"
Write-Host "  Standard Deviation: $([Math]::Round($StdDev, 2)) minutes"

if ($StdDev -lt ($AvgInterval * 0.2)) {
    Write-Host "\`n[WARNING] PATTERN DETECTED: Events occur regularly every ~$([Math]::Round($AvgInterval, 0)) minutes" -ForegroundColor Red
} else {
    Write-Host "\`n[OK] No strong recurring pattern detected" -ForegroundColor Green
}

$HourlyDistribution = $Events | Group-Object { $_.TimeCreated.Hour } | Sort-Object Name
Write-Host "\`nHourly Distribution:" -ForegroundColor Cyan
$HourlyDistribution | Select-Object @{N='Hour';E={$_.Name}}, Count | Format-Table -AutoSize`;
    }
  },

  {
    id: 'failed-logon-analysis',
    name: 'Failed Logon Analysis with Source IP',
    category: 'Security Auditing',
    description: 'Analyze failed logon attempts with source IP and username details',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Event ID 4625 (failed logon attempts)
- Extracts source IP, username, and failure reason
- Groups by source to identify brute force attempts
- Essential for security incident detection

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Logon auditing must be enabled

**What You Need to Provide:**
- Hours back to search
- Minimum failures to flag as suspicious
- Optional: Export path for report`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'threshold', label: 'Suspicious Threshold', type: 'number', required: true, defaultValue: 5 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const threshold = Number(params.threshold);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Failed Logon Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
$Threshold = ${threshold}

$FailedLogons = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = 4625
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$Analysis = $FailedLogons | ForEach-Object {
    $xml = [xml]$_.ToXml()
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        TargetUserName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' } | Select-Object -ExpandProperty '#text'
        SourceIP = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'IpAddress' } | Select-Object -ExpandProperty '#text'
        FailureReason = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'FailureReason' } | Select-Object -ExpandProperty '#text'
        LogonType = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'LogonType' } | Select-Object -ExpandProperty '#text'
    }
}

Write-Host "Failed Logon Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total Failed Attempts: $($Analysis.Count)" -ForegroundColor Yellow

$BySource = $Analysis | Group-Object SourceIP | Where-Object { $_.Count -ge $Threshold } | Sort-Object Count -Descending
if ($BySource) {
    Write-Host "\`n[WARNING] SUSPICIOUS SOURCES (>= $Threshold failures):" -ForegroundColor Red
    $BySource | Select-Object @{N='SourceIP';E={$_.Name}}, Count, @{N='TargetUsers';E={($_.Group.TargetUserName | Select-Object -Unique) -join ', '}} | Format-Table -AutoSize
}

$ByUser = $Analysis | Group-Object TargetUserName | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Targeted Users:" -ForegroundColor Cyan
$ByUser | Select-Object @{N='Username';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$Analysis | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'privilege-escalation-detection',
    name: 'Privilege Escalation Detection',
    category: 'Security Auditing',
    description: 'Detect potential privilege escalation and sensitive privilege use',
    isPremium: true,
    instructions: `**How This Task Works:**
- Monitors Event IDs 4672, 4673, 4674 for privilege use
- Detects sensitive privilege assignments
- Identifies potential privilege escalation attempts
- Critical for security monitoring

**Prerequisites:**
- Administrator privileges required
- Privilege Use auditing must be enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to search
- Optional: Specific user to investigate
- Optional: Export path for report`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'targetUser', label: 'Target User (optional)', type: 'text', required: false, placeholder: 'domain\\username' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const targetUser = params.targetUser ? escapePowerShellString(params.targetUser) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Privilege Escalation Detection
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
${targetUser ? `$TargetUser = "${targetUser}"` : ''}

$PrivilegeEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = @(4672, 4673, 4674)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$Analysis = $PrivilegeEvents | ForEach-Object {
    $xml = [xml]$_.ToXml()
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        EventId = $_.Id
        SubjectUserName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'SubjectUserName' } | Select-Object -ExpandProperty '#text'
        PrivilegeList = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'PrivilegeList' } | Select-Object -ExpandProperty '#text'
        ProcessName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'ProcessName' } | Select-Object -ExpandProperty '#text'
    }
}

${targetUser ? `$Analysis = $Analysis | Where-Object { $_.SubjectUserName -like "*$TargetUser*" }` : ''}

Write-Host "Privilege Use Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total Privilege Events: $($Analysis.Count)" -ForegroundColor Yellow

$SensitivePrivileges = @('SeDebugPrivilege', 'SeTakeOwnershipPrivilege', 'SeBackupPrivilege', 'SeRestorePrivilege', 'SeImpersonatePrivilege')

$Suspicious = $Analysis | Where-Object { 
    $Privs = $_.PrivilegeList
    $SensitivePrivileges | Where-Object { $Privs -like "*$_*" }
}

if ($Suspicious) {
    Write-Host "\`n[WARNING] SENSITIVE PRIVILEGE USE DETECTED:" -ForegroundColor Red
    $Suspicious | Select-Object TimeCreated, SubjectUserName, EventId, PrivilegeList | Format-Table -Wrap
}

$ByUser = $Analysis | Group-Object SubjectUserName | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Users by Privilege Events:" -ForegroundColor Cyan
$ByUser | Select-Object @{N='User';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$Analysis | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'account-lockout-investigation',
    name: 'Account Lockout Investigation',
    category: 'Security Auditing',
    description: 'Investigate account lockouts with source workstation and timing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Event ID 4740 (account lockout)
- Extracts source workstation and caller info
- Correlates with failed logon attempts
- Helps identify lockout root cause

**Prerequisites:**
- Administrator privileges required
- Account Logon auditing must be enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Username to investigate (or leave blank for all)
- Hours back to search
- Optional: Export path`,
    parameters: [
      { id: 'username', label: 'Username (optional)', type: 'text', required: false, placeholder: 'jsmith' },
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 48 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const username = params.username ? escapePowerShellString(params.username) : '';
      const hours = Number(params.hours);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Account Lockout Investigation
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
${username ? `$TargetUser = "${username}"` : ''}

$Lockouts = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = 4740
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$LockoutDetails = $Lockouts | ForEach-Object {
    $xml = [xml]$_.ToXml()
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        TargetUserName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' } | Select-Object -ExpandProperty '#text'
        TargetDomainName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetDomainName' } | Select-Object -ExpandProperty '#text'
        CallerComputerName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'SubjectUserName' } | Select-Object -ExpandProperty '#text'
    }
}

${username ? `$LockoutDetails = $LockoutDetails | Where-Object { $_.TargetUserName -eq "$TargetUser" }` : ''}

Write-Host "Account Lockout Investigation (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total Lockouts: $($LockoutDetails.Count)" -ForegroundColor Yellow

if ($LockoutDetails) {
    Write-Host "\`nLockout Events:" -ForegroundColor Red
    $LockoutDetails | Format-Table -AutoSize
    
    Write-Host "\`nLockouts by User:" -ForegroundColor Cyan
    $LockoutDetails | Group-Object TargetUserName | Sort-Object Count -Descending | 
        Select-Object @{N='User';E={$_.Name}}, Count, @{N='LastLockout';E={$_.Group[0].TimeCreated}} | Format-Table -AutoSize
}

${exportPath ? `$LockoutDetails | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'logon-type-analysis',
    name: 'Logon Type Analysis',
    category: 'Security Auditing',
    description: 'Analyze logon events by type (interactive, network, remote, etc.)',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries successful logon events (4624)
- Categorizes by logon type
- Identifies unusual logon patterns
- Useful for security baselining

**Prerequisites:**
- Administrator privileges required
- Logon auditing must be enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to search
- Optional: Filter by specific logon type`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'logonType', label: 'Logon Type Filter', type: 'select', required: false, options: ['All', 'Interactive (2)', 'Network (3)', 'Batch (4)', 'Service (5)', 'RemoteInteractive (10)', 'CachedInteractive (11)'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const logonType = params.logonType || 'All';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      const typeMap: Record<string, string> = {
        'Interactive (2)': '2',
        'Network (3)': '3',
        'Batch (4)': '4',
        'Service (5)': '5',
        'RemoteInteractive (10)': '10',
        'CachedInteractive (11)': '11'
      };
      
      return `# Logon Type Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})

$Logons = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = 4624
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$LogonTypeNames = @{
    '2' = 'Interactive'
    '3' = 'Network'
    '4' = 'Batch'
    '5' = 'Service'
    '7' = 'Unlock'
    '8' = 'NetworkCleartext'
    '9' = 'NewCredentials'
    '10' = 'RemoteInteractive'
    '11' = 'CachedInteractive'
}

$Analysis = $Logons | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $Type = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'LogonType' } | Select-Object -ExpandProperty '#text'
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        TargetUserName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' } | Select-Object -ExpandProperty '#text'
        LogonType = $Type
        LogonTypeName = $LogonTypeNames[$Type]
        SourceIP = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'IpAddress' } | Select-Object -ExpandProperty '#text'
        WorkstationName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'WorkstationName' } | Select-Object -ExpandProperty '#text'
    }
}

${logonType !== 'All' ? `$Analysis = $Analysis | Where-Object { $_.LogonType -eq "${typeMap[logonType]}" }` : ''}

Write-Host "Logon Type Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total Logons: $($Analysis.Count)" -ForegroundColor Yellow

$ByType = $Analysis | Group-Object LogonTypeName | Sort-Object Count -Descending
Write-Host "\`nLogons by Type:" -ForegroundColor Cyan
$ByType | Select-Object @{N='LogonType';E={$_.Name}}, Count | Format-Table -AutoSize

$ByUser = $Analysis | Group-Object TargetUserName | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Users:" -ForegroundColor Cyan
$ByUser | Select-Object @{N='User';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$Analysis | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'disk-error-analysis',
    name: 'Disk Error Analysis',
    category: 'System Health',
    description: 'Analyze disk-related errors and warnings from System log',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries disk-related events from System log
- Includes disk, ntfs, and storage errors
- Identifies failing drives or RAID issues
- Critical for proactive hardware maintenance

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System log

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Disk Error Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})
$DiskProviders = @('disk', 'ntfs', 'storahci', 'stornvme', 'volmgr', 'volsnap', 'partmgr', 'Ntfs')

$DiskEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    Level = @(1, 2, 3)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { $DiskProviders -contains $_.ProviderName }

Write-Host "Disk Error Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Disk-Related Events: $($DiskEvents.Count)" -ForegroundColor Yellow

$ByLevel = $DiskEvents | Group-Object LevelDisplayName | Sort-Object Count -Descending
Write-Host "\`nEvents by Severity:" -ForegroundColor Cyan
$ByLevel | Select-Object @{N='Level';E={$_.Name}}, Count | Format-Table -AutoSize

$ByProvider = $DiskEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nEvents by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Source';E={$_.Name}}, Count | Format-Table -AutoSize

$Critical = $DiskEvents | Where-Object { $_.Level -eq 1 -or $_.Level -eq 2 }
if ($Critical) {
    Write-Host "\`n[WARNING] CRITICAL DISK EVENTS:" -ForegroundColor Red
    $Critical | Select-Object TimeCreated, ProviderName, Id, Message | Format-Table -Wrap
}

${exportPath ? `$DiskEvents | Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'service-failure-analysis',
    name: 'Service Failure Analysis',
    category: 'System Health',
    description: 'Analyze service crashes and unexpected terminations',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Event ID 7031, 7034, 7000, 7009 (service failures)
- Identifies services that crash or fail to start
- Shows failure frequency and patterns
- Essential for system stability monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System log

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Service Failure Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$ServiceEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = 'Service Control Manager'
    ID = @(7031, 7034, 7000, 7009, 7023, 7024)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$EventTypes = @{
    7031 = 'Service Crash (Unexpected Termination)'
    7034 = 'Service Terminated Unexpectedly'
    7000 = 'Service Failed to Start'
    7009 = 'Service Start Timeout'
    7023 = 'Service Terminated with Error'
    7024 = 'Service Terminated with Error'
}

Write-Host "Service Failure Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Service Failures: $($ServiceEvents.Count)" -ForegroundColor Yellow

$ByType = $ServiceEvents | Group-Object Id | Sort-Object Count -Descending
Write-Host "\`nFailures by Type:" -ForegroundColor Cyan
$ByType | Select-Object @{N='EventID';E={$_.Name}}, @{N='Type';E={$EventTypes[$_.Name]}}, Count | Format-Table -AutoSize

$ServiceNames = $ServiceEvents | ForEach-Object {
    if ($_.Message -match "'([^']+)'") { $Matches[1] }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 10

Write-Host "\`nMost Failing Services:" -ForegroundColor Cyan
$ServiceNames | Select-Object @{N='Service';E={$_.Name}}, Count | Format-Table -AutoSize

Write-Host "\`nRecent Failures:" -ForegroundColor Red
$ServiceEvents | Select-Object -First 10 TimeCreated, Id, Message | Format-Table -Wrap

${exportPath ? `$ServiceEvents | Select-Object TimeCreated, Id, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'driver-issue-analysis',
    name: 'Driver Issue Analysis',
    category: 'System Health',
    description: 'Analyze driver loading failures and kernel errors',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries driver-related events from System log
- Identifies driver load failures and kernel issues
- Helps troubleshoot blue screens and stability issues
- Critical for hardware compatibility analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System log

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Driver Issue Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$DriverEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    Level = @(1, 2, 3)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { 
    $_.ProviderName -match 'kernel|driver|pnp|whea' -or 
    $_.Id -in @(41, 1001, 6008, 7, 7000, 7001, 7022)
}

Write-Host "Driver Issue Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Driver-Related Events: $($DriverEvents.Count)" -ForegroundColor Yellow

$ByProvider = $DriverEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nEvents by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Provider';E={$_.Name}}, Count | Format-Table -AutoSize

$ById = $DriverEvents | Group-Object Id | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Event IDs:" -ForegroundColor Cyan
$ById | Select-Object @{N='EventID';E={$_.Name}}, Count, @{N='Sample';E={$_.Group[0].Message.Substring(0, [Math]::Min(80, $_.Group[0].Message.Length))}} | Format-Table -AutoSize

$Critical = $DriverEvents | Where-Object { $_.Level -eq 1 }
if ($Critical) {
    Write-Host "\`n[WARNING] CRITICAL DRIVER EVENTS:" -ForegroundColor Red
    $Critical | Select-Object TimeCreated, ProviderName, Id, Message | Format-Table -Wrap
}

${exportPath ? `$DriverEvents | Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'performance-event-analysis',
    name: 'Performance Event Analysis',
    category: 'System Health',
    description: 'Analyze performance-related warnings and errors',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries performance events from System and Application logs
- Identifies resource exhaustion and performance degradation
- Monitors for memory, CPU, and I/O issues
- Essential for capacity planning

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System and Application logs

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Performance Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$PerfEvents = @()

$PerfEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = @('Microsoft-Windows-Resource-Exhaustion-Detector', 'Microsoft-Windows-Kernel-Processor-Power', 'Microsoft-Windows-Kernel-Power')
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$PerfEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ID = @(2004, 2019, 2020)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$PerfEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    ProviderName = 'Perflib'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

Write-Host "Performance Event Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Performance Events: $($PerfEvents.Count)" -ForegroundColor Yellow

$ByProvider = $PerfEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nEvents by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Provider';E={$_.Name}}, Count | Format-Table -AutoSize

$ResourceExhaustion = $PerfEvents | Where-Object { $_.ProviderName -eq 'Microsoft-Windows-Resource-Exhaustion-Detector' }
if ($ResourceExhaustion) {
    Write-Host "\`n[WARNING] RESOURCE EXHAUSTION EVENTS:" -ForegroundColor Red
    $ResourceExhaustion | Select-Object TimeCreated, Message | Format-Table -Wrap
}

$HourlyTrend = $PerfEvents | Group-Object { $_.TimeCreated.ToString("yyyy-MM-dd HH:00") } | Sort-Object Name
Write-Host "\`nHourly Trend:" -ForegroundColor Cyan
$HourlyTrend | Select-Object -Last 24 @{N='Hour';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$PerfEvents | Select-Object TimeCreated, ProviderName, Id, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'unexpected-shutdown-analysis',
    name: 'Unexpected Shutdown Analysis',
    category: 'System Health',
    description: 'Analyze unexpected shutdowns and system crashes',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Event ID 41 (Kernel-Power critical)
- Queries Event ID 6008 (unexpected shutdown)
- Identifies blue screens and power loss events
- Essential for stability monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System log

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Unexpected Shutdown Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$ShutdownEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ID = @(41, 6008, 1074, 1076, 6006, 6005)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Sort-Object TimeCreated -Descending

$EventDescriptions = @{
    41 = 'Critical Power Loss / BSOD'
    6008 = 'Unexpected Shutdown'
    1074 = 'Initiated Shutdown/Restart'
    1076 = 'User Shutdown Reason'
    6006 = 'Event Log Service Stopped'
    6005 = 'Event Log Service Started'
}

Write-Host "Unexpected Shutdown Analysis (Last ${days} days)" -ForegroundColor Cyan

$Unexpected = $ShutdownEvents | Where-Object { $_.Id -in @(41, 6008) }
Write-Host "Unexpected Shutdowns: $($Unexpected.Count)" -ForegroundColor $(if ($Unexpected.Count -gt 0) { 'Red' } else { 'Green' })

$ByType = $ShutdownEvents | Group-Object Id | Sort-Object Count -Descending
Write-Host "\`nShutdown Events by Type:" -ForegroundColor Cyan
$ByType | Select-Object @{N='EventID';E={$_.Name}}, @{N='Description';E={$EventDescriptions[[int]$_.Name]}}, Count | Format-Table -AutoSize

if ($Unexpected) {
    Write-Host "\`n[WARNING] UNEXPECTED SHUTDOWN DETAILS:" -ForegroundColor Red
    $Unexpected | Select-Object TimeCreated, Id, @{N='Type';E={$EventDescriptions[$_.Id]}}, Message | Format-Table -Wrap
}

$Daily = $Unexpected | Group-Object { $_.TimeCreated.ToString("yyyy-MM-dd") } | Sort-Object Name
Write-Host "\`nDaily Distribution:" -ForegroundColor Cyan
$Daily | Select-Object @{N='Date';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$ShutdownEvents | Select-Object TimeCreated, Id, @{N='Type';E={$EventDescriptions[$_.Id]}}, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'application-crash-analysis',
    name: 'Application Crash Analysis',
    category: 'Application Monitoring',
    description: 'Analyze application crashes and hangs from Application log',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Application Error (1000) and Application Hang (1002) events
- Identifies crashing applications
- Shows crash frequency and faulting modules
- Essential for application stability monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to Application log

**What You Need to Provide:**
- Days back to search
- Optional: Filter by application name
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'appFilter', label: 'Application Filter (optional)', type: 'text', required: false, placeholder: 'outlook.exe' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const appFilter = params.appFilter ? escapePowerShellString(params.appFilter) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Application Crash Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})
${appFilter ? `$AppFilter = "${appFilter}"` : ''}

$CrashEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    ProviderName = 'Application Error'
    ID = @(1000, 1002)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$CrashDetails = $CrashEvents | ForEach-Object {
    $Parts = $_.Message -split "\`n"
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        EventId = $_.Id
        FaultingApp = ($Parts | Where-Object { $_ -match 'Faulting application' }) -replace '.*name: ', '' -replace ',.*', ''
        FaultingModule = ($Parts | Where-Object { $_ -match 'Faulting module' }) -replace '.*name: ', '' -replace ',.*', ''
        ExceptionCode = ($Parts | Where-Object { $_ -match 'Exception code' }) -replace '.*: ', ''
        Message = $_.Message
    }
}

${appFilter ? `$CrashDetails = $CrashDetails | Where-Object { $_.FaultingApp -like "*$AppFilter*" }` : ''}

Write-Host "Application Crash Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Crashes: $($CrashDetails.Count)" -ForegroundColor Yellow

$ByApp = $CrashDetails | Group-Object FaultingApp | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Crashing Applications:" -ForegroundColor Cyan
$ByApp | Select-Object @{N='Application';E={$_.Name}}, Count | Format-Table -AutoSize

$ByModule = $CrashDetails | Group-Object FaultingModule | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Faulting Modules:" -ForegroundColor Cyan
$ByModule | Select-Object @{N='Module';E={$_.Name}}, Count | Format-Table -AutoSize

Write-Host "\`nRecent Crashes:" -ForegroundColor Red
$CrashDetails | Select-Object -First 10 TimeCreated, FaultingApp, FaultingModule, ExceptionCode | Format-Table -AutoSize

${exportPath ? `$CrashDetails | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'dotnet-error-analysis',
    name: '.NET Runtime Error Analysis',
    category: 'Application Monitoring',
    description: 'Analyze .NET Framework and CLR runtime errors',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries .NET Runtime and CLR events
- Identifies managed code exceptions
- Shows application domain errors
- Essential for .NET application troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to Application log

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# .NET Runtime Error Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$DotNetEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    ProviderName = @('.NET Runtime', 'ASP.NET 4.0.30319.0', 'Application Error')
    Level = @(1, 2)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$DotNetEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    ID = @(1026, 1000)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { $_.Message -match 'CLR|\.NET|managed|Exception' }

$DotNetEvents = $DotNetEvents | Sort-Object TimeCreated -Unique

Write-Host ".NET Runtime Error Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total .NET Errors: $($DotNetEvents.Count)" -ForegroundColor Yellow

$ByProvider = $DotNetEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nErrors by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Source';E={$_.Name}}, Count | Format-Table -AutoSize

$ExceptionTypes = $DotNetEvents | ForEach-Object {
    if ($_.Message -match '([A-Za-z]+Exception)') { $Matches[1] }
} | Where-Object { $_ } | Group-Object | Sort-Object Count -Descending | Select-Object -First 10

Write-Host "\`nTop Exception Types:" -ForegroundColor Cyan
$ExceptionTypes | Select-Object @{N='Exception';E={$_.Name}}, Count | Format-Table -AutoSize

Write-Host "\`nRecent .NET Errors:" -ForegroundColor Red
$DotNetEvents | Select-Object -First 5 TimeCreated, ProviderName, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))}} | Format-Table -Wrap

${exportPath ? `$DotNetEvents | Select-Object TimeCreated, ProviderName, Id, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'iis-log-analysis',
    name: 'IIS Event Log Analysis',
    category: 'Application Monitoring',
    description: 'Analyze IIS-related events from Application and System logs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries IIS, W3SVC, and ASP.NET events
- Identifies application pool crashes and recycling
- Shows worker process failures
- Essential for web server monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- IIS must be installed
- Access to Application and System logs

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# IIS Event Log Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$IISProviders = @('Microsoft-Windows-IIS-W3SVC-WP', 'Microsoft-Windows-WAS', 'W3SVC', 'IIS-W3SVC', 'ASP.NET 4.0.30319.0', 'Active Server Pages', 'IISADMIN')

$IISEvents = Get-WinEvent -FilterHashtable @{
    LogName = @('Application', 'System')
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { 
    $IISProviders -contains $_.ProviderName -or $_.Message -match 'IIS|W3SVC|AppPool|worker process'
}

Write-Host "IIS Event Log Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total IIS Events: $($IISEvents.Count)" -ForegroundColor Yellow

$ByLevel = $IISEvents | Group-Object LevelDisplayName | Sort-Object Count -Descending
Write-Host "\`nEvents by Severity:" -ForegroundColor Cyan
$ByLevel | Select-Object @{N='Level';E={$_.Name}}, Count | Format-Table -AutoSize

$ByProvider = $IISEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nEvents by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Source';E={$_.Name}}, Count | Format-Table -AutoSize

$Errors = $IISEvents | Where-Object { $_.Level -le 2 }
if ($Errors) {
    Write-Host "\`n[WARNING] IIS ERRORS:" -ForegroundColor Red
    $Errors | Select-Object -First 10 TimeCreated, ProviderName, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))}} | Format-Table -Wrap
}

${exportPath ? `$IISEvents | Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'sql-server-event-analysis',
    name: 'SQL Server Event Analysis',
    category: 'Application Monitoring',
    description: 'Analyze SQL Server-related events from Application log',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries SQL Server and MSSQLSERVER events
- Identifies database errors and connectivity issues
- Shows login failures and query timeouts
- Essential for database server monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- SQL Server must be installed
- Access to Application log

**What You Need to Provide:**
- Days back to search
- Optional: SQL instance name
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'instanceName', label: 'SQL Instance (optional)', type: 'text', required: false, placeholder: 'MSSQLSERVER' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const instanceName = params.instanceName ? escapePowerShellString(params.instanceName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# SQL Server Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})
${instanceName ? `$InstanceName = "${instanceName}"` : '$InstanceName = "MSSQLSERVER"'}

$SQLEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { 
    $_.ProviderName -like "*SQL*" -or 
    $_.ProviderName -like "*MSSQL*" -or
    $_.ProviderName -eq $InstanceName
}

Write-Host "SQL Server Event Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total SQL Events: $($SQLEvents.Count)" -ForegroundColor Yellow

$ByLevel = $SQLEvents | Group-Object LevelDisplayName | Sort-Object Count -Descending
Write-Host "\`nEvents by Severity:" -ForegroundColor Cyan
$ByLevel | Select-Object @{N='Level';E={$_.Name}}, Count | Format-Table -AutoSize

$ByProvider = $SQLEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nEvents by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Source';E={$_.Name}}, Count | Format-Table -AutoSize

$ById = $SQLEvents | Group-Object Id | Sort-Object Count -Descending | Select-Object -First 10
Write-Host "\`nTop Event IDs:" -ForegroundColor Cyan
$ById | Select-Object @{N='EventID';E={$_.Name}}, Count | Format-Table -AutoSize

$Errors = $SQLEvents | Where-Object { $_.Level -le 2 }
if ($Errors) {
    Write-Host "\`n[WARNING] SQL SERVER ERRORS:" -ForegroundColor Red
    $Errors | Select-Object -First 10 TimeCreated, ProviderName, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))}} | Format-Table -Wrap
}

${exportPath ? `$SQLEvents | Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'scheduled-log-backup',
    name: 'Scheduled Log Backup (All Logs)',
    category: 'Backup & Management',
    description: 'Create full backup of all event logs to evtx files',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports all event logs to .evtx format
- Creates timestamped backup directory
- Optionally compresses to single archive
- Suitable for scheduled backup jobs

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient disk space for backups
- wevtutil.exe (built into Windows)

**What You Need to Provide:**
- Backup base directory
- Whether to compress all backups into one archive
- Whether to remove individual evtx files after compression`,
    parameters: [
      { id: 'backupPath', label: 'Backup Directory', type: 'path', required: true, placeholder: 'C:\\EventLogBackups' },
      { id: 'compress', label: 'Compress to Archive', type: 'boolean', required: false, defaultValue: true },
      { id: 'cleanupEvtx', label: 'Remove EVTX After Compression', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = params.compress ?? true;
      const cleanup = params.cleanupEvtx ?? true;
      
      return `# Scheduled Log Backup
# Generated: ${new Date().toISOString()}

$BaseDir = "${backupPath}"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $BaseDir $Timestamp

New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null

$Logs = wevtutil el
$Count = 0

foreach ($LogName in $Logs) {
    $SafeName = $LogName -replace '[/\\\\]', '-'
    $BackupFile = Join-Path $BackupDir "$SafeName.evtx"
    
    try {
        wevtutil epl $LogName $BackupFile 2>$null
        if (Test-Path $BackupFile) { $Count++ }
    } catch {}
}

Write-Host "[SUCCESS] Backed up $Count logs to $BackupDir" -ForegroundColor Green

${compress ? `
$ArchivePath = Join-Path $BaseDir "EventLogs-$Timestamp.zip"
Compress-Archive -Path "$BackupDir\\*" -DestinationPath $ArchivePath -Force
Write-Host "[SUCCESS] Compressed to $ArchivePath" -ForegroundColor Green

${cleanup ? `Remove-Item -Path $BackupDir -Recurse -Force
Write-Host "[SUCCESS] Cleaned up temporary files" -ForegroundColor Green` : ''}` : ''}`;
    }
  },

  {
    id: 'configure-log-forwarding',
    name: 'Configure Event Log Forwarding',
    category: 'Backup & Management',
    description: 'Set up Windows Event Forwarding subscription basics',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows Event Forwarding (WEF) prerequisites
- Enables the Windows Event Collector service
- Sets up WinRM for event collection
- Creates foundation for centralized log collection

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network connectivity to collector

**What You Need to Provide:**
- Collector role: Collector or Source
- For sources: Collector computer name`,
    parameters: [
      { id: 'role', label: 'Server Role', type: 'select', required: true, options: ['Collector', 'Source'] },
      { id: 'collectorName', label: 'Collector Computer Name', type: 'text', required: false, placeholder: 'LOGCOLLECTOR01' }
    ],
    scriptTemplate: (params) => {
      const role = params.role;
      const collectorName = params.collectorName ? escapePowerShellString(params.collectorName) : '';
      
      return `# Configure Event Log Forwarding
# Generated: ${new Date().toISOString()}

$Role = "${role}"

if ($Role -eq "Collector") {
    Write-Host "Configuring as Event Collector..." -ForegroundColor Cyan
    
    wecutil qc /q
    
    Set-Service -Name wecsvc -StartupType Automatic
    Start-Service wecsvc
    
    Enable-PSRemoting -Force -SkipNetworkProfileCheck
    
    Write-Host "[SUCCESS] Windows Event Collector configured" -ForegroundColor Green
    Write-Host "Next: Create subscriptions using wecutil or Event Viewer" -ForegroundColor Yellow
    
} else {
    Write-Host "Configuring as Event Source..." -ForegroundColor Cyan
    ${collectorName ? `$Collector = "${collectorName}"` : '$Collector = Read-Host "Enter collector computer name"'}
    
    winrm quickconfig -q
    
    $Group = "Event Log Readers"
    $Account = "NETWORK SERVICE"
    Add-LocalGroupMember -Group $Group -Member $Account -ErrorAction SilentlyContinue
    
    Write-Host "[SUCCESS] Windows Event Forwarding source configured" -ForegroundColor Green
    Write-Host "Next: Create subscription on collector pointing to this computer" -ForegroundColor Yellow
}

winrm get winrm/config/client`;
    }
  },

  {
    id: 'archive-old-logs',
    name: 'Archive Old Log Files',
    category: 'Backup & Management',
    description: 'Archive and compress evtx backup files older than specified days',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans backup directory for old .evtx files
- Compresses files older than threshold
- Moves to archive directory
- Helps manage backup storage

**Prerequisites:**
- PowerShell 5.1 or later
- Access to backup directory
- Sufficient archive storage

**What You Need to Provide:**
- Backup source directory
- Archive destination directory
- Days to keep before archiving
- Whether to delete original after archiving`,
    parameters: [
      { id: 'sourcePath', label: 'Backup Source Directory', type: 'path', required: true, placeholder: 'C:\\EventLogBackups' },
      { id: 'archivePath', label: 'Archive Directory', type: 'path', required: true, placeholder: 'C:\\EventLogArchive' },
      { id: 'daysOld', label: 'Days Before Archive', type: 'number', required: true, defaultValue: 30 },
      { id: 'deleteOriginal', label: 'Delete Original After Archive', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const archivePath = escapePowerShellString(params.archivePath);
      const daysOld = Number(params.daysOld);
      const deleteOriginal = toPowerShellBoolean(params.deleteOriginal ?? true);
      
      return `# Archive Old Log Files
# Generated: ${new Date().toISOString()}

$SourceDir = "${sourcePath}"
$ArchiveDir = "${archivePath}"
$DaysOld = ${daysOld}
$DeleteOriginal = ${deleteOriginal}

New-Item -Path $ArchiveDir -ItemType Directory -Force | Out-Null

$CutoffDate = (Get-Date).AddDays(-$DaysOld)
$OldFiles = Get-ChildItem -Path $SourceDir -Filter "*.evtx" -Recurse | 
    Where-Object { $_.LastWriteTime -lt $CutoffDate }

Write-Host "Archiving Log Files Older Than $DaysOld Days" -ForegroundColor Cyan
Write-Host "Files to archive: $($OldFiles.Count)" -ForegroundColor Yellow

$Archived = 0
foreach ($File in $OldFiles) {
    $ArchiveFile = Join-Path $ArchiveDir "$($File.BaseName).zip"
    
    Compress-Archive -Path $File.FullName -DestinationPath $ArchiveFile -Force
    
    if ($DeleteOriginal -and (Test-Path $ArchiveFile)) {
        Remove-Item $File.FullName -Force
    }
    
    $Archived++
    Write-Host "  [OK] $($File.Name)" -ForegroundColor Green
}

Write-Host "\`n[OK] Archived $Archived files to $ArchiveDir" -ForegroundColor Green`;
    }
  },

  {
    id: 'generate-audit-report',
    name: 'Generate Security Audit Report',
    category: 'Compliance',
    description: 'Generate comprehensive security audit report for compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Collects key security events for audit purposes
- Covers logons, account changes, policy changes
- Generates HTML or CSV report
- Suitable for compliance documentation

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Security auditing must be enabled

**What You Need to Provide:**
- Report output path
- Report format (HTML or CSV)
- Days to include in report`,
    parameters: [
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SecurityAudit.html' },
      { id: 'format', label: 'Report Format', type: 'select', required: true, options: ['HTML', 'CSV'], defaultValue: 'HTML' },
      { id: 'days', label: 'Days to Include', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const reportPath = escapePowerShellString(params.reportPath);
      const format = params.format;
      const days = Number(params.days);
      
      return `# Generate Security Audit Report
# Generated: ${new Date().toISOString()}

$ReportPath = "${reportPath}"
$Days = ${days}
$StartTime = (Get-Date).AddDays(-$Days)

Write-Host "Generating Security Audit Report..." -ForegroundColor Cyan

$AuditEvents = @{
    'Successful Logons' = 4624
    'Failed Logons' = 4625
    'Account Lockouts' = 4740
    'User Account Created' = 4720
    'User Account Deleted' = 4726
    'Password Changed' = 4723
    'Group Membership Changed' = @(4728, 4732, 4756)
    'Audit Policy Changed' = 4719
    'Log Cleared' = 1102
}

$Report = @()

foreach ($Category in $AuditEvents.Keys) {
    $IDs = $AuditEvents[$Category]
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = $IDs
        StartTime = $StartTime
    } -ErrorAction SilentlyContinue
    
    $Report += [PSCustomObject]@{
        Category = $Category
        EventIDs = ($IDs -join ', ')
        Count = $Events.Count
        FirstOccurrence = if ($Events) { ($Events | Sort-Object TimeCreated | Select-Object -First 1).TimeCreated } else { 'N/A' }
        LastOccurrence = if ($Events) { ($Events | Sort-Object TimeCreated -Descending | Select-Object -First 1).TimeCreated } else { 'N/A' }
    }
}

${format === 'HTML' ? `
$HTML = @"
<!DOCTYPE html>
<html>
<head>
<title>Security Audit Report</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; }
h1 { color: #333; }
table { border-collapse: collapse; width: 100%; margin-top: 20px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #4CAF50; color: white; }
tr:nth-child(even) { background-color: #f2f2f2; }
.summary { margin: 20px 0; padding: 10px; background: #e7f3fe; border-left: 4px solid #2196F3; }
</style>
</head>
<body>
<h1>Security Audit Report</h1>
<div class="summary">
<strong>Report Period:</strong> Last $Days days<br>
<strong>Generated:</strong> $(Get-Date)<br>
<strong>Computer:</strong> $env:COMPUTERNAME
</div>
<table>
<tr><th>Category</th><th>Event IDs</th><th>Count</th><th>First Occurrence</th><th>Last Occurrence</th></tr>
$($Report | ForEach-Object { "<tr><td>$($_.Category)</td><td>$($_.EventIDs)</td><td>$($_.Count)</td><td>$($_.FirstOccurrence)</td><td>$($_.LastOccurrence)</td></tr>" })
</table>
</body>
</html>
"@

$HTML | Out-File "$ReportPath" -Encoding UTF8` : `$Report | Export-Csv "$ReportPath" -NoTypeInformation`}

Write-Host "\`n[OK] Report generated: $ReportPath" -ForegroundColor Green

$Report | Format-Table -AutoSize`;
    }
  },

  {
    id: 'stig-compliance-check',
    name: 'STIG Compliance Check (Event Logging)',
    category: 'Compliance',
    description: 'Check event logging configuration against STIG requirements',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks event log configuration against STIG requirements
- Verifies log sizes, retention, and audit policies
- Identifies non-compliant settings
- Generates compliance status report

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Audit policy access

**What You Need to Provide:**
- Minimum Security log size (MB)
- Minimum Application log size (MB)
- Optional: Export path for compliance report`,
    parameters: [
      { id: 'securityLogSize', label: 'Min Security Log Size (MB)', type: 'number', required: true, defaultValue: 196 },
      { id: 'appLogSize', label: 'Min Application Log Size (MB)', type: 'number', required: true, defaultValue: 32 },
      { id: 'exportPath', label: 'Report Export Path', type: 'path', required: false, placeholder: 'C:\\Reports\\STIG-Compliance.csv' }
    ],
    scriptTemplate: (params) => {
      const securityLogSize = Number(params.securityLogSize);
      const appLogSize = Number(params.appLogSize);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# STIG Compliance Check (Event Logging)
# Generated: ${new Date().toISOString()}

$MinSecuritySize = ${securityLogSize} * 1MB
$MinAppSize = ${appLogSize} * 1MB

$Compliance = @()

$SecurityLog = Get-WinEvent -ListLog Security
$Compliance += [PSCustomObject]@{
    Check = 'Security Log Size'
    Required = "$($MinSecuritySize/1MB) MB"
    Current = "$([math]::Round($SecurityLog.MaximumSizeInBytes/1MB)) MB"
    Status = if ($SecurityLog.MaximumSizeInBytes -ge $MinSecuritySize) { 'PASS' } else { 'FAIL' }
}

$AppLog = Get-WinEvent -ListLog Application
$Compliance += [PSCustomObject]@{
    Check = 'Application Log Size'
    Required = "$($MinAppSize/1MB) MB"
    Current = "$([math]::Round($AppLog.MaximumSizeInBytes/1MB)) MB"
    Status = if ($AppLog.MaximumSizeInBytes -ge $MinAppSize) { 'PASS' } else { 'FAIL' }
}

$Compliance += [PSCustomObject]@{
    Check = 'Security Log Enabled'
    Required = 'True'
    Current = $SecurityLog.IsEnabled.ToString()
    Status = if ($SecurityLog.IsEnabled) { 'PASS' } else { 'FAIL' }
}

$AuditPolicy = auditpol /get /category:* 2>$null | Out-String

$LogonAudit = if ($AuditPolicy -match 'Logon.*Success and Failure') { 'Success and Failure' } 
              elseif ($AuditPolicy -match 'Logon.*Success') { 'Success' }
              elseif ($AuditPolicy -match 'Logon.*Failure') { 'Failure' }
              else { 'No Auditing' }

$Compliance += [PSCustomObject]@{
    Check = 'Logon Event Auditing'
    Required = 'Success and Failure'
    Current = $LogonAudit
    Status = if ($LogonAudit -eq 'Success and Failure') { 'PASS' } else { 'FAIL' }
}

$AccountAudit = if ($AuditPolicy -match 'Account Management.*Success and Failure') { 'Success and Failure' }
                elseif ($AuditPolicy -match 'Account Management.*Success') { 'Success' }
                else { 'No Auditing' }

$Compliance += [PSCustomObject]@{
    Check = 'Account Management Auditing'
    Required = 'Success and Failure'
    Current = $AccountAudit
    Status = if ($AccountAudit -eq 'Success and Failure') { 'PASS' } else { 'FAIL' }
}

Write-Host "STIG Compliance Check - Event Logging" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

$PassCount = ($Compliance | Where-Object { $_.Status -eq 'PASS' }).Count
$TotalCount = $Compliance.Count

Write-Host "\`nResults: $PassCount/$TotalCount checks passed" -ForegroundColor $(if ($PassCount -eq $TotalCount) { 'Green' } else { 'Yellow' })

$Compliance | Format-Table -AutoSize

$Failed = $Compliance | Where-Object { $_.Status -eq 'FAIL' }
if ($Failed) {
    Write-Host "[WARNING] FAILED CHECKS:" -ForegroundColor Red
    $Failed | ForEach-Object { Write-Host "  - $($_.Check): Required $($_.Required), Found $($_.Current)" -ForegroundColor Yellow }
}

${exportPath ? `$Compliance | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'event-archival-policy',
    name: 'Implement Event Archival Policy',
    category: 'Compliance',
    description: 'Set up automated archival based on retention requirements',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures event log retention for compliance
- Sets AutoBackup mode on critical logs
- Configures archive destination
- Ensures events are preserved per policy

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient archive storage

**What You Need to Provide:**
- Logs to configure for archival
- Archive destination path
- Retention period in days`,
    parameters: [
      { id: 'logNames', label: 'Logs to Archive (comma-separated)', type: 'textarea', required: true, placeholder: 'Security,Application,System' },
      { id: 'archivePath', label: 'Archive Destination', type: 'path', required: true, placeholder: 'C:\\EventLogArchive' },
      { id: 'retentionDays', label: 'Retention Period (days)', type: 'number', required: true, defaultValue: 365 }
    ],
    scriptTemplate: (params) => {
      const archivePath = escapePowerShellString(params.archivePath);
      const retentionDays = Number(params.retentionDays);
      
      return `# Implement Event Archival Policy
# Generated: ${new Date().toISOString()}

$Logs = ${buildPowerShellArray(params.logNames)}
$ArchivePath = "${archivePath}"
$RetentionDays = ${retentionDays}

New-Item -Path $ArchivePath -ItemType Directory -Force | Out-Null

Write-Host "Implementing Event Archival Policy" -ForegroundColor Cyan
Write-Host "Archive Path: $ArchivePath" -ForegroundColor Yellow
Write-Host "Retention: $RetentionDays days" -ForegroundColor Yellow

foreach ($LogName in $Logs) {
    $Log = Get-WinEvent -ListLog $LogName -ErrorAction SilentlyContinue
    if ($Log) {
        $Log.LogMode = 'AutoBackup'
        $Log.SaveChanges()
        
        $RegPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\EventLog\\$LogName"
        if (Test-Path $RegPath) {
            Set-ItemProperty -Path $RegPath -Name "AutoBackupLogFiles" -Value 1 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path $RegPath -Name "Retention" -Value 0 -Type DWord -ErrorAction SilentlyContinue
        }
        
        Write-Host "[SUCCESS] $LogName configured for auto-backup" -ForegroundColor Green
    }
}

$CleanupScript = @"

\$ArchivePath = '$ArchivePath'
\$RetentionDays = $RetentionDays
\$CutoffDate = (Get-Date).AddDays(-\$RetentionDays)

Get-ChildItem -Path \$ArchivePath -Filter "*.evtx" | 
    Where-Object { \$_.LastWriteTime -lt \$CutoffDate } | 
    Remove-Item -Force
"@

$CleanupScriptPath = Join-Path $ArchivePath "Cleanup-OldLogs.ps1"
$CleanupScript | Out-File $CleanupScriptPath -Encoding UTF8

Write-Host "\`n[OK] Archival policy configured" -ForegroundColor Green
Write-Host "[SUCCESS] Cleanup script created: $CleanupScriptPath" -ForegroundColor Green
Write-Host "\`nSchedule the cleanup script to run daily for retention enforcement" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'search-by-keyword',
    name: 'Search Events by Keyword',
    category: 'Log Analysis',
    description: 'Full-text search across event messages for specific keywords',
    isPremium: true,
    instructions: `**How This Task Works:**
- Searches event message content for keywords
- Supports multiple keywords with AND/OR logic
- Searches across multiple logs simultaneously
- Essential for incident investigation

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for most logs
- Access to specified event logs

**What You Need to Provide:**
- Keywords to search for
- Search mode (AND or OR)
- Log name(s) to search
- Hours back to search`,
    parameters: [
      { id: 'keywords', label: 'Keywords (comma-separated)', type: 'text', required: true, placeholder: 'error,failed,timeout' },
      { id: 'searchMode', label: 'Search Mode', type: 'select', required: true, options: ['OR (any keyword)', 'AND (all keywords)'], defaultValue: 'OR (any keyword)' },
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Application' },
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const isAndMode = params.searchMode === 'AND (all keywords)';
      const logName = escapePowerShellString(params.logName);
      const hours = Number(params.hours);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Search Events by Keyword
# Generated: ${new Date().toISOString()}

$Keywords = ${buildPowerShellArray(params.keywords)}
$LogName = "${logName}"
$StartTime = (Get-Date).AddHours(-${hours})
$AndMode = $${isAndMode}

$Events = Get-WinEvent -FilterHashtable @{
    LogName = $LogName
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$Matches = $Events | Where-Object {
    $Message = $_.Message
    if ($AndMode) {
        $AllMatch = $true
        foreach ($Keyword in $Keywords) {
            if ($Message -notmatch [regex]::Escape($Keyword)) {
                $AllMatch = $false
                break
            }
        }
        $AllMatch
    } else {
        foreach ($Keyword in $Keywords) {
            if ($Message -match [regex]::Escape($Keyword)) {
                return $true
            }
        }
        $false
    }
}

Write-Host "Keyword Search Results" -ForegroundColor Cyan
Write-Host "Keywords: $($Keywords -join ', ')" -ForegroundColor Yellow
Write-Host "Mode: ${isAndMode ? 'AND (all must match)' : 'OR (any match)'}" -ForegroundColor Yellow
Write-Host "Matches Found: $($Matches.Count)" -ForegroundColor Green

$Matches | Select-Object TimeCreated, Id, LevelDisplayName, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))}} | Format-Table -Wrap

${exportPath ? `$Matches | Select-Object TimeCreated, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'windows-update-events',
    name: 'Windows Update Event Analysis',
    category: 'System Health',
    description: 'Analyze Windows Update installation and failure events',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Windows Update related events
- Identifies failed updates and installation issues
- Shows update history and patterns
- Essential for patch management

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System and Setup logs

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Windows Update Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$UpdateEvents = @()

$UpdateEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = 'Microsoft-Windows-WindowsUpdateClient'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$UpdateEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Setup'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$UpdateEvents = $UpdateEvents | Sort-Object TimeCreated -Descending

Write-Host "Windows Update Event Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Update Events: $($UpdateEvents.Count)" -ForegroundColor Yellow

$ByLevel = $UpdateEvents | Group-Object LevelDisplayName | Sort-Object Count -Descending
Write-Host "\`nEvents by Severity:" -ForegroundColor Cyan
$ByLevel | Select-Object @{N='Level';E={$_.Name}}, Count | Format-Table -AutoSize

$Failed = $UpdateEvents | Where-Object { $_.Level -eq 2 -or $_.Message -match 'failed|error' }
if ($Failed) {
    Write-Host "\`n[WARNING] UPDATE FAILURES:" -ForegroundColor Red
    $Failed | Select-Object -First 10 TimeCreated, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))}} | Format-Table -Wrap
}

$Installed = $UpdateEvents | Where-Object { $_.Message -match 'successfully installed|Installation Successful' }
Write-Host "\`nSuccessfully Installed: $($Installed.Count)" -ForegroundColor Green

${exportPath ? `$UpdateEvents | Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'firewall-event-analysis',
    name: 'Windows Firewall Event Analysis',
    category: 'Security Auditing',
    description: 'Analyze Windows Firewall connection and rule events',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Windows Firewall events
- Identifies blocked connections and rule changes
- Shows traffic patterns and potential threats
- Essential for network security monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Windows Firewall logging must be enabled
- Access to Security log

**What You Need to Provide:**
- Hours back to search
- Event type filter
- Optional: Export path for report`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'eventType', label: 'Event Type', type: 'select', required: true, options: ['All', 'Blocked Connections', 'Rule Changes', 'Service Events'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const eventType = params.eventType;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      const eventIdMap: Record<string, string> = {
        'All': '@(5152, 5153, 5154, 5155, 5156, 5157, 5158, 5159, 4946, 4947, 4948, 4949, 4950)',
        'Blocked Connections': '@(5152, 5157)',
        'Rule Changes': '@(4946, 4947, 4948, 4949, 4950)',
        'Service Events': '@(5024, 5025, 5027, 5028, 5029, 5030, 5032)'
      };
      
      return `# Windows Firewall Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
$EventIDs = ${eventIdMap[eventType]}

$FWEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = $EventIDs
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

Write-Host "Windows Firewall Event Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Filter: ${eventType}" -ForegroundColor Yellow
Write-Host "Total Events: $($FWEvents.Count)" -ForegroundColor Yellow

$ById = $FWEvents | Group-Object Id | Sort-Object Count -Descending
Write-Host "\`nEvents by Type:" -ForegroundColor Cyan
$ById | Select-Object @{N='EventID';E={$_.Name}}, Count | Format-Table -AutoSize

$Blocked = $FWEvents | Where-Object { $_.Id -in @(5152, 5157) }
if ($Blocked) {
    Write-Host "\`n[WARNING] BLOCKED CONNECTIONS: $($Blocked.Count)" -ForegroundColor Red
    
    $BlockedDetails = $Blocked | ForEach-Object {
        $xml = [xml]$_.ToXml()
        [PSCustomObject]@{
            Time = $_.TimeCreated
            SourceIP = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'SourceAddress' } | Select-Object -ExpandProperty '#text'
            DestIP = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'DestAddress' } | Select-Object -ExpandProperty '#text'
            DestPort = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'DestPort' } | Select-Object -ExpandProperty '#text'
        }
    }
    
    $BlockedDetails | Select-Object -First 20 | Format-Table -AutoSize
}

${exportPath ? `$FWEvents | Select-Object TimeCreated, Id, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'group-policy-events',
    name: 'Group Policy Event Analysis',
    category: 'System Health',
    description: 'Analyze Group Policy processing and failure events',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Group Policy operational events
- Identifies processing failures and slow policy application
- Shows policy application timeline
- Essential for GPO troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Domain-joined computer
- Access to Group Policy logs

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Group Policy Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$GPEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-GroupPolicy/Operational'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

Write-Host "Group Policy Event Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total GP Events: $($GPEvents.Count)" -ForegroundColor Yellow

$ByLevel = $GPEvents | Group-Object LevelDisplayName | Sort-Object Count -Descending
Write-Host "\`nEvents by Severity:" -ForegroundColor Cyan
$ByLevel | Select-Object @{N='Level';E={$_.Name}}, Count | Format-Table -AutoSize

$Errors = $GPEvents | Where-Object { $_.Level -le 2 }
if ($Errors) {
    Write-Host "\`n[WARNING] GROUP POLICY ERRORS:" -ForegroundColor Red
    $Errors | Select-Object -First 10 TimeCreated, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))}} | Format-Table -Wrap
}

$Processing = $GPEvents | Where-Object { $_.Id -in @(4016, 5016, 8001, 8002) }
if ($Processing) {
    Write-Host "\`nPolicy Processing Summary:" -ForegroundColor Cyan
    $Processing | Group-Object Id | Select-Object @{N='EventID';E={$_.Name}}, Count | Format-Table -AutoSize
}

$SlowPolicies = $GPEvents | Where-Object { $_.Message -match 'slow|timeout|delayed' }
if ($SlowPolicies) {
    Write-Host "\`n[WARNING] Slow Policy Processing Detected: $($SlowPolicies.Count) events" -ForegroundColor Yellow
}

${exportPath ? `$GPEvents | Select-Object TimeCreated, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'rdp-session-analysis',
    name: 'RDP Session Analysis',
    category: 'Security Auditing',
    description: 'Analyze Remote Desktop connection and disconnection events',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries RDP connection events from multiple logs
- Tracks session connections, disconnections, and reconnections
- Shows source IPs and usernames
- Essential for remote access auditing

**Prerequisites:**
- PowerShell 5.1 or later
- RDP auditing must be enabled
- Access to Security and TerminalServices logs

**What You Need to Provide:**
- Hours back to search
- Optional: Filter by username
- Optional: Export path for report`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'username', label: 'Username Filter (optional)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const username = params.username ? escapePowerShellString(params.username) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# RDP Session Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
${username ? `$Username = "${username}"` : ''}

$RDPEvents = @()

$RDPEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-TerminalServices-RemoteConnectionManager/Operational'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$RDPEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-TerminalServices-LocalSessionManager/Operational'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$RDPEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = @(4624, 4625)
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { 
    $xml = [xml]$_.ToXml()
    $LogonType = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'LogonType' } | Select-Object -ExpandProperty '#text'
    $LogonType -eq '10'
}

$SessionDetails = $RDPEvents | ForEach-Object {
    $xml = [xml]$_.ToXml()
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        EventId = $_.Id
        LogName = $_.LogName
        User = $xml.Event.EventData.Data | Where-Object { $_.Name -match 'User|TargetUserName' } | Select-Object -First 1 -ExpandProperty '#text'
        SourceIP = $xml.Event.EventData.Data | Where-Object { $_.Name -match 'Address|IpAddress' } | Select-Object -First 1 -ExpandProperty '#text'
        SessionId = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'SessionId' } | Select-Object -ExpandProperty '#text'
    }
} | Sort-Object TimeCreated -Descending

${username ? `$SessionDetails = $SessionDetails | Where-Object { $_.User -like "*$Username*" }` : ''}

Write-Host "RDP Session Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total RDP Events: $($SessionDetails.Count)" -ForegroundColor Yellow

$ByUser = $SessionDetails | Group-Object User | Sort-Object Count -Descending
Write-Host "\`nSessions by User:" -ForegroundColor Cyan
$ByUser | Select-Object @{N='User';E={$_.Name}}, Count | Format-Table -AutoSize

$ByIP = $SessionDetails | Where-Object { $_.SourceIP } | Group-Object SourceIP | Sort-Object Count -Descending
Write-Host "\`nConnections by Source IP:" -ForegroundColor Cyan
$ByIP | Select-Object @{N='SourceIP';E={$_.Name}}, Count | Format-Table -AutoSize

Write-Host "\`nRecent RDP Activity:" -ForegroundColor Cyan
$SessionDetails | Select-Object -First 20 TimeCreated, EventId, User, SourceIP | Format-Table -AutoSize

${exportPath ? `$SessionDetails | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'powershell-script-block-logging',
    name: 'PowerShell Script Block Logging Analysis',
    category: 'Security Auditing',
    description: 'Analyze PowerShell script execution from script block logs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries PowerShell script block logging events (4104)
- Identifies potentially malicious scripts
- Shows script content and execution context
- Essential for threat hunting and forensics

**Prerequisites:**
- PowerShell 5.1 or later
- Script Block Logging must be enabled
- Access to PowerShell Operational log

**What You Need to Provide:**
- Hours back to search
- Optional: Filter by suspicious keywords
- Optional: Export path for report`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'suspiciousOnly', label: 'Show Suspicious Only', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const suspiciousOnly = params.suspiciousOnly ?? false;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# PowerShell Script Block Logging Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
$SuspiciousPatterns = @(
    'Invoke-Expression', 'IEX', 'Invoke-WebRequest', 'DownloadString',
    'EncodedCommand', 'FromBase64String', 'Net.WebClient',
    'Invoke-Mimikatz', 'Get-Credential', 'ConvertTo-SecureString',
    '-enc ', 'bypass', 'hidden', '-nop', '-w hidden'
)

$ScriptBlocks = Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-PowerShell/Operational'
    ID = 4104
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$Analysis = $ScriptBlocks | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $ScriptBlock = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'ScriptBlockText' } | Select-Object -ExpandProperty '#text'
    
    $IsSuspicious = $false
    foreach ($Pattern in $SuspiciousPatterns) {
        if ($ScriptBlock -match [regex]::Escape($Pattern)) {
            $IsSuspicious = $true
            break
        }
    }
    
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        ScriptBlockId = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'ScriptBlockId' } | Select-Object -ExpandProperty '#text'
        Path = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'Path' } | Select-Object -ExpandProperty '#text'
        IsSuspicious = $IsSuspicious
        ScriptPreview = $ScriptBlock.Substring(0, [Math]::Min(200, $ScriptBlock.Length))
        FullScript = $ScriptBlock
    }
}

${suspiciousOnly ? '$Analysis = $Analysis | Where-Object { $_.IsSuspicious }' : ''}

Write-Host "PowerShell Script Block Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total Script Blocks: $($ScriptBlocks.Count)" -ForegroundColor Yellow

$Suspicious = $Analysis | Where-Object { $_.IsSuspicious }
Write-Host "Suspicious Scripts: $($Suspicious.Count)" -ForegroundColor $(if ($Suspicious.Count -gt 0) { 'Red' } else { 'Green' })

if ($Suspicious) {
    Write-Host "\`n[WARNING] SUSPICIOUS SCRIPTS DETECTED:" -ForegroundColor Red
    $Suspicious | Select-Object TimeCreated, Path, ScriptPreview | Format-Table -Wrap
}

Write-Host "\`nRecent Script Blocks:" -ForegroundColor Cyan
$Analysis | Select-Object -First 10 TimeCreated, Path, IsSuspicious, ScriptPreview | Format-Table -Wrap

${exportPath ? `$Analysis | Select-Object TimeCreated, Path, IsSuspicious, FullScript | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'task-scheduler-events',
    name: 'Task Scheduler Event Analysis',
    category: 'System Health',
    description: 'Analyze scheduled task execution and failure events',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Task Scheduler operational events
- Identifies failed and successful task executions
- Shows task run history and patterns
- Essential for automation monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to Task Scheduler log

**What You Need to Provide:**
- Days back to search
- Optional: Filter by task name
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'taskName', label: 'Task Name Filter (optional)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const taskName = params.taskName ? escapePowerShellString(params.taskName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Task Scheduler Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})
${taskName ? `$TaskFilter = "${taskName}"` : ''}

$TaskEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-TaskScheduler/Operational'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

${taskName ? '$TaskEvents = $TaskEvents | Where-Object { $_.Message -like "*$TaskFilter*" }' : ''}

$EventTypes = @{
    100 = 'Task Started'
    101 = 'Task Start Failed'
    102 = 'Task Completed'
    103 = 'Action Start Failed'
    111 = 'Task Terminated'
    201 = 'Action Completed'
    202 = 'Action Failed'
}

Write-Host "Task Scheduler Event Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Task Events: $($TaskEvents.Count)" -ForegroundColor Yellow

$ById = $TaskEvents | Group-Object Id | Sort-Object Count -Descending
Write-Host "\`nEvents by Type:" -ForegroundColor Cyan
$ById | Select-Object @{N='EventID';E={$_.Name}}, @{N='Type';E={$EventTypes[[int]$_.Name]}}, Count | Format-Table -AutoSize

$Failed = $TaskEvents | Where-Object { $_.Id -in @(101, 103, 202) }
if ($Failed) {
    Write-Host "\`n[WARNING] TASK FAILURES:" -ForegroundColor Red
    $Failed | Select-Object -First 10 TimeCreated, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))}} | Format-Table -Wrap
}

$TaskNames = $TaskEvents | ForEach-Object {
    if ($_.Message -match '"([^"]+)"') { $Matches[1] }
} | Where-Object { $_ } | Group-Object | Sort-Object Count -Descending | Select-Object -First 10

Write-Host "\`nMost Active Tasks:" -ForegroundColor Cyan
$TaskNames | Select-Object @{N='TaskName';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$TaskEvents | Select-Object TimeCreated, Id, @{N='Type';E={$EventTypes[$_.Id]}}, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'certificate-events',
    name: 'Certificate Event Analysis',
    category: 'Security Auditing',
    description: 'Analyze certificate-related events including expirations and errors',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries certificate-related events
- Identifies expired or expiring certificates
- Shows certificate validation errors
- Essential for PKI and SSL monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System and Security logs

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Certificate Event Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$CertEvents = @()

$CertEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { 
    $_.ProviderName -match 'Schannel|CertificateServicesClient|Crypto' -or
    $_.Message -match 'certificate|SSL|TLS'
}

$CertEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { 
    $_.Message -match 'certificate|expired|expir'
}

$CertEvents = $CertEvents | Sort-Object TimeCreated -Descending -Unique

Write-Host "Certificate Event Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total Certificate Events: $($CertEvents.Count)" -ForegroundColor Yellow

$ByLevel = $CertEvents | Group-Object LevelDisplayName | Sort-Object Count -Descending
Write-Host "\`nEvents by Severity:" -ForegroundColor Cyan
$ByLevel | Select-Object @{N='Level';E={$_.Name}}, Count | Format-Table -AutoSize

$Errors = $CertEvents | Where-Object { $_.Level -le 2 }
if ($Errors) {
    Write-Host "\`n[WARNING] CERTIFICATE ERRORS:" -ForegroundColor Red
    $Errors | Select-Object -First 10 TimeCreated, ProviderName, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))}} | Format-Table -Wrap
}

$ByProvider = $CertEvents | Group-Object ProviderName | Sort-Object Count -Descending
Write-Host "\`nEvents by Source:" -ForegroundColor Cyan
$ByProvider | Select-Object @{N='Provider';E={$_.Name}}, Count | Format-Table -AutoSize

${exportPath ? `$CertEvents | Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'wmi-event-analysis',
    name: 'WMI Activity Analysis',
    category: 'Security Auditing',
    description: 'Analyze WMI operations and potential WMI-based attacks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries WMI operational events
- Identifies WMI script executions
- Detects potential WMI persistence mechanisms
- Essential for threat hunting

**Prerequisites:**
- PowerShell 5.1 or later
- WMI operational logging must be enabled
- Access to WMI-Activity log

**What You Need to Provide:**
- Hours back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# WMI Activity Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})

$WMIEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-WMI-Activity/Operational'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

Write-Host "WMI Activity Analysis (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "Total WMI Events: $($WMIEvents.Count)" -ForegroundColor Yellow

$ById = $WMIEvents | Group-Object Id | Sort-Object Count -Descending
Write-Host "\`nEvents by Type:" -ForegroundColor Cyan
$ById | Select-Object @{N='EventID';E={$_.Name}}, Count | Format-Table -AutoSize

$SuspiciousPatterns = @('Win32_Process', 'Create', 'CommandLineEventConsumer', 'ActiveScriptEventConsumer', 'powershell', 'cmd.exe')

$Suspicious = $WMIEvents | Where-Object {
    $Message = $_.Message
    foreach ($Pattern in $SuspiciousPatterns) {
        if ($Message -match [regex]::Escape($Pattern)) {
            return $true
        }
    }
    $false
}

if ($Suspicious) {
    Write-Host "\`n[WARNING] SUSPICIOUS WMI ACTIVITY:" -ForegroundColor Red
    $Suspicious | Select-Object TimeCreated, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))}} | Format-Table -Wrap
}

$Errors = $WMIEvents | Where-Object { $_.Level -le 2 }
if ($Errors) {
    Write-Host "\`nWMI Errors:" -ForegroundColor Yellow
    $Errors | Select-Object -First 5 TimeCreated, Id, Message | Format-Table -Wrap
}

${exportPath ? `$WMIEvents | Select-Object TimeCreated, Id, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'usb-device-events',
    name: 'USB Device Connection Analysis',
    category: 'Security Auditing',
    description: 'Track USB device connections and removals for security auditing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries USB device connection events
- Tracks device insertions and removals
- Identifies device types and serial numbers
- Essential for data loss prevention

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to System log

**What You Need to Provide:**
- Days back to search
- Optional: Export path for report`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# USB Device Connection Analysis
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddDays(-${days})

$USBEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = @('Microsoft-Windows-DriverFrameworks-UserMode', 'Microsoft-Windows-Kernel-PnP')
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { $_.Message -match 'USB|USBSTOR|Removable' }

$USBEvents += Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-DriverFrameworks-UserMode/Operational'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

$USBEvents = $USBEvents | Sort-Object TimeCreated -Descending -Unique

Write-Host "USB Device Connection Analysis (Last ${days} days)" -ForegroundColor Cyan
Write-Host "Total USB Events: $($USBEvents.Count)" -ForegroundColor Yellow

$ById = $USBEvents | Group-Object Id | Sort-Object Count -Descending
Write-Host "\`nEvents by Type:" -ForegroundColor Cyan
$ById | Select-Object @{N='EventID';E={$_.Name}}, Count | Format-Table -AutoSize

$DeviceInfo = $USBEvents | ForEach-Object {
    if ($_.Message -match 'Device (\\\\[^\\s]+)') {
        $Matches[1]
    }
} | Where-Object { $_ } | Group-Object | Sort-Object Count -Descending

Write-Host "\`nDevices Detected:" -ForegroundColor Cyan
$DeviceInfo | Select-Object @{N='Device';E={$_.Name}}, Count | Format-Table -AutoSize

Write-Host "\`nRecent USB Activity:" -ForegroundColor Cyan
$USBEvents | Select-Object -First 20 TimeCreated, Id, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))}} | Format-Table -Wrap

${exportPath ? `$USBEvents | Select-Object TimeCreated, ProviderName, Id, Message | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'event-log-export-xml',
    name: 'Export Events to XML Format',
    category: 'Backup & Management',
    description: 'Export filtered events to structured XML for external analysis',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports events to structured XML format
- Preserves full event data including XML payload
- Suitable for SIEM ingestion
- Maintains event fidelity for forensics

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Write access to export location

**What You Need to Provide:**
- Log name to export
- Time range in hours
- Output file path
- Optional: Event ID filter`,
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Security' },
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (XML)', type: 'path', required: true, placeholder: 'C:\\Exports\\Events.xml' },
      { id: 'eventIds', label: 'Event IDs (optional, comma-separated)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const hours = Number(params.hours);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Events to XML
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$StartTime = (Get-Date).AddHours(-${hours})
$ExportPath = "${exportPath}"

$Filter = @{
    LogName = $LogName
    StartTime = $StartTime
}

${params.eventIds ? `$Filter.ID = ${buildPowerShellArray(params.eventIds)}` : ''}

$Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction SilentlyContinue

Write-Host "Exporting Events to XML" -ForegroundColor Cyan
Write-Host "Log: $LogName" -ForegroundColor Yellow
Write-Host "Events: $($Events.Count)" -ForegroundColor Yellow

$XMLContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<EventExport>
    <ExportInfo>
        <LogName>$LogName</LogName>
        <StartTime>$StartTime</StartTime>
        <EndTime>$(Get-Date)</EndTime>
        <EventCount>$($Events.Count)</EventCount>
        <Computer>$env:COMPUTERNAME</Computer>
    </ExportInfo>
    <Events>
"@

foreach ($Event in $Events) {
    $XMLContent += $Event.ToXml() + "\`n"
}

$XMLContent += @"
    </Events>
</EventExport>
"@

$XMLContent | Out-File $ExportPath -Encoding UTF8
Write-Host "[SUCCESS] Exported to $ExportPath" -ForegroundColor Green
Write-Host "File size: $([Math]::Round((Get-Item $ExportPath).Length/1KB, 2)) KB" -ForegroundColor Gray`;
    }
  },

  {
    id: 'compare-log-baselines',
    name: 'Compare Log Configuration Baselines',
    category: 'Compliance',
    description: 'Compare current log configuration against saved baseline',
    isPremium: true,
    instructions: `**How This Task Works:**
- Loads saved baseline configuration
- Compares against current system state
- Identifies configuration drift
- Essential for change detection

**Prerequisites:**
- PowerShell 5.1 or later
- Previously exported baseline file
- Standard user permissions

**What You Need to Provide:**
- Path to baseline JSON file
- Optional: Export path for drift report`,
    parameters: [
      { id: 'baselinePath', label: 'Baseline File Path (JSON)', type: 'path', required: true, placeholder: 'C:\\Baselines\\EventLogBaseline.json' },
      { id: 'exportPath', label: 'Drift Report Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const baselinePath = escapePowerShellString(params.baselinePath);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Compare Log Configuration Baselines
# Generated: ${new Date().toISOString()}

$BaselinePath = "${baselinePath}"

if (-not (Test-Path $BaselinePath)) {
    Write-Host "[WARNING] Baseline file not found: $BaselinePath" -ForegroundColor Red
    exit
}

$Baseline = Get-Content $BaselinePath -Raw | ConvertFrom-Json
$Current = Get-WinEvent -ListLog * | Select-Object LogName, IsEnabled, MaximumSizeInBytes, LogMode

Write-Host "Comparing Log Configuration to Baseline" -ForegroundColor Cyan
Write-Host "Baseline: $BaselinePath" -ForegroundColor Yellow

$Drift = @()

foreach ($BaselineLog in $Baseline) {
    $CurrentLog = $Current | Where-Object { $_.LogName -eq $BaselineLog.LogName }
    
    if (-not $CurrentLog) {
        $Drift += [PSCustomObject]@{
            LogName = $BaselineLog.LogName
            Property = 'Existence'
            Baseline = 'Present'
            Current = 'Missing'
            Status = 'DRIFT'
        }
        continue
    }
    
    if ($CurrentLog.IsEnabled -ne $BaselineLog.IsEnabled) {
        $Drift += [PSCustomObject]@{
            LogName = $BaselineLog.LogName
            Property = 'IsEnabled'
            Baseline = $BaselineLog.IsEnabled.ToString()
            Current = $CurrentLog.IsEnabled.ToString()
            Status = 'DRIFT'
        }
    }
    
    if ($CurrentLog.MaximumSizeInBytes -ne $BaselineLog.MaximumSizeInBytes) {
        $Drift += [PSCustomObject]@{
            LogName = $BaselineLog.LogName
            Property = 'MaxSize'
            Baseline = "$([Math]::Round($BaselineLog.MaximumSizeInBytes/1MB)) MB"
            Current = "$([Math]::Round($CurrentLog.MaximumSizeInBytes/1MB)) MB"
            Status = 'DRIFT'
        }
    }
}

if ($Drift) {
    Write-Host "\`n[WARNING] CONFIGURATION DRIFT DETECTED:" -ForegroundColor Red
    $Drift | Format-Table -AutoSize
    
    ${exportPath ? `$Drift | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Drift report exported to ${exportPath}" -ForegroundColor Yellow` : ''}
} else {
    Write-Host "\`n[OK] No configuration drift detected" -ForegroundColor Green
}

Write-Host "\`nSummary: $($Drift.Count) drift issues found" -ForegroundColor $(if ($Drift.Count -gt 0) { 'Yellow' } else { 'Green' })`;
    }
  },

  {
    id: 'event-statistics-dashboard',
    name: 'Event Statistics Dashboard',
    category: 'Log Analysis',
    description: 'Generate comprehensive event statistics across all logs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Collects statistics from all major logs
- Shows event counts by level and log
- Identifies busiest logs and error hotspots
- Provides system health overview

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Access to event logs

**What You Need to Provide:**
- Hours back to analyze
- Optional: Export path for statistics`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Event Statistics Dashboard
# Generated: ${new Date().toISOString()}

$StartTime = (Get-Date).AddHours(-${hours})
$Logs = @('Application', 'Security', 'System', 'Setup')

Write-Host "Event Statistics Dashboard (Last ${hours} hours)" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$Stats = @()

foreach ($LogName in $Logs) {
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = $LogName
        StartTime = $StartTime
    } -ErrorAction SilentlyContinue
    
    $Critical = ($Events | Where-Object { $_.Level -eq 1 }).Count
    $Error = ($Events | Where-Object { $_.Level -eq 2 }).Count
    $Warning = ($Events | Where-Object { $_.Level -eq 3 }).Count
    $Info = ($Events | Where-Object { $_.Level -eq 4 }).Count
    
    $Stats += [PSCustomObject]@{
        Log = $LogName
        Total = $Events.Count
        Critical = $Critical
        Error = $Error
        Warning = $Warning
        Information = $Info
        HealthScore = if ($Events.Count -eq 0) { 100 } else { [Math]::Round((1 - (($Critical * 10 + $Error * 5 + $Warning) / $Events.Count)) * 100, 1) }
    }
}

$Stats | Format-Table -AutoSize

$TotalErrors = ($Stats | Measure-Object -Property Error -Sum).Sum
$TotalCritical = ($Stats | Measure-Object -Property Critical -Sum).Sum
$TotalWarnings = ($Stats | Measure-Object -Property Warning -Sum).Sum

Write-Host "\`nSummary:" -ForegroundColor Cyan
Write-Host "  Critical Events: $TotalCritical" -ForegroundColor $(if ($TotalCritical -gt 0) { 'Red' } else { 'Green' })
Write-Host "  Error Events: $TotalErrors" -ForegroundColor $(if ($TotalErrors -gt 0) { 'Yellow' } else { 'Green' })
Write-Host "  Warning Events: $TotalWarnings" -ForegroundColor $(if ($TotalWarnings -gt 10) { 'Yellow' } else { 'Green' })

$OverallHealth = ($Stats | Measure-Object -Property HealthScore -Average).Average
Write-Host "\`n  Overall Health Score: $([Math]::Round($OverallHealth, 1))%" -ForegroundColor $(if ($OverallHealth -ge 90) { 'Green' } elseif ($OverallHealth -ge 70) { 'Yellow' } else { 'Red' })

${exportPath ? `$Stats | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "\`n[OK] Statistics exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'xpath-advanced-query',
    name: 'Advanced XPath Event Query',
    category: 'Log Analysis',
    description: 'Execute custom XPath queries for complex event filtering',
    isPremium: true,
    instructions: `**How This Task Works:**
- Executes custom XPath queries against event logs
- Provides powerful filtering beyond simple hashtable filters
- Supports complex conditions and nested data access
- Essential for advanced forensics and analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Understanding of XPath query syntax
- Access to specified event log

**What You Need to Provide:**
- Log name to query
- Custom XPath query string
- Maximum events to return
- Optional: Export path for results`,
    parameters: [
      { id: 'logName', label: 'Log Name', type: 'text', required: true, defaultValue: 'Security' },
      { id: 'xpathQuery', label: 'XPath Query', type: 'textarea', required: true, placeholder: "*[System[(EventID=4624) and TimeCreated[timediff(@SystemTime) <= 86400000]]]" },
      { id: 'maxEvents', label: 'Maximum Events', type: 'number', required: true, defaultValue: 100 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const logName = escapePowerShellString(params.logName);
      const xpathQuery = escapePowerShellString(params.xpathQuery);
      const maxEvents = Number(params.maxEvents);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Advanced XPath Event Query
# Generated: ${new Date().toISOString()}

$LogName = "${logName}"
$XPathQuery = "${xpathQuery}"
$MaxEvents = ${maxEvents}

Write-Host "Executing XPath Query" -ForegroundColor Cyan
Write-Host "Log: $LogName" -ForegroundColor Yellow
Write-Host "Query: $XPathQuery" -ForegroundColor Gray

try {
    $Events = Get-WinEvent -LogName $LogName -FilterXPath $XPathQuery -MaxEvents $MaxEvents -ErrorAction Stop
    
    Write-Host "\`nResults: $($Events.Count) events found" -ForegroundColor Green
    $Events | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, @{N='Message';E={$_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))}} | Format-Table -Wrap
    
    ${exportPath ? `$Events | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}
} catch {
    Write-Host "[WARNING] Query Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "\`nXPath Syntax Tips:" -ForegroundColor Yellow
    Write-Host "  - Basic: *[System[(EventID=1234)]]" -ForegroundColor Gray
    Write-Host "  - Time filter: *[System[TimeCreated[timediff(@SystemTime) <= 86400000]]]" -ForegroundColor Gray
    Write-Host "  - Multiple IDs: *[System[(EventID=4624 or EventID=4625)]]" -ForegroundColor Gray
    Write-Host "  - With data: *[System[(EventID=4624)]] and *[EventData[Data[@Name='LogonType']='10']]" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'security-event-summary',
    name: 'Security Event Summary Report',
    category: 'Compliance',
    description: 'Generate executive summary of security events for reporting',
    isPremium: true,
    instructions: `**How This Task Works:**
- Produces high-level security event summary
- Covers key security metrics and trends
- Suitable for executive or compliance reporting
- Includes recommendations based on findings

**Prerequisites:**
- Administrator privileges recommended
- PowerShell 5.1 or later
- Security log access

**What You Need to Provide:**
- Days to include in report
- Report output path (HTML format)`,
    parameters: [
      { id: 'days', label: 'Days to Include', type: 'number', required: true, defaultValue: 7 },
      { id: 'reportPath', label: 'Report Output Path (HTML)', type: 'path', required: true, placeholder: 'C:\\Reports\\SecuritySummary.html' }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const reportPath = escapePowerShellString(params.reportPath);
      
      return `# Security Event Summary Report
# Generated: ${new Date().toISOString()}

$Days = ${days}
$ReportPath = "${reportPath}"
$StartTime = (Get-Date).AddDays(-$Days)

Write-Host "Generating Security Event Summary Report..." -ForegroundColor Cyan

$Metrics = @{}

$SuccessLogons = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4624;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$FailedLogons = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4625;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$AdminLogons = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4672;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$AccountLockouts = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4740;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$AccountCreated = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4720;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$AccountDeleted = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4726;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$LogCleared = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=1102;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count
$PolicyChanges = (Get-WinEvent -FilterHashtable @{LogName='Security';ID=4719;StartTime=$StartTime} -ErrorAction SilentlyContinue).Count

$FailedLogonRate = if ($SuccessLogons -gt 0) { [Math]::Round(($FailedLogons / ($SuccessLogons + $FailedLogons)) * 100, 2) } else { 0 }

$RiskLevel = "Low"
if ($LogCleared -gt 0 -or $PolicyChanges -gt 0) { $RiskLevel = "Critical" }
elseif ($FailedLogonRate -gt 20 -or $AccountLockouts -gt 10) { $RiskLevel = "High" }
elseif ($FailedLogonRate -gt 10 -or $AccountLockouts -gt 5) { $RiskLevel = "Medium" }

$HTML = @"
<!DOCTYPE html>
<html>
<head>
<title>Security Event Summary - $env:COMPUTERNAME</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f5f5f5; }
.container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
h1 { color: #333; border-bottom: 3px solid #0078d4; padding-bottom: 15px; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
.metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
.metric h3 { margin: 0; color: #666; font-size: 14px; }
.metric .value { font-size: 32px; font-weight: bold; color: #333; }
.risk-low { border-left: 4px solid #28a745; }
.risk-medium { border-left: 4px solid #ffc107; }
.risk-high { border-left: 4px solid #fd7e14; }
.risk-critical { border-left: 4px solid #dc3545; }
.risk-badge { display: inline-block; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
.risk-badge.low { background: #d4edda; color: #155724; }
.risk-badge.medium { background: #fff3cd; color: #856404; }
.risk-badge.high { background: #ffe5d0; color: #8a4a0c; }
.risk-badge.critical { background: #f8d7da; color: #721c24; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
th { background: #f8f9fa; }
.recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; margin-top: 30px; }
.recommendations h3 { margin-top: 0; color: #004085; }
</style>
</head>
<body>
<div class="container">
<h1>Security Event Summary</h1>
<p><strong>Computer:</strong> $env:COMPUTERNAME | <strong>Period:</strong> Last $Days days | <strong>Generated:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm")</p>

<p><strong>Overall Risk Assessment:</strong> <span class="risk-badge $(if ($RiskLevel -eq 'Low') {'low'} elseif ($RiskLevel -eq 'Medium') {'medium'} elseif ($RiskLevel -eq 'High') {'high'} else {'critical'})">$RiskLevel</span></p>

<div class="summary">
<div class="metric"><h3>Successful Logons</h3><div class="value">$SuccessLogons</div></div>
<div class="metric risk-$(if ($FailedLogons -gt 100) {'high'} elseif ($FailedLogons -gt 20) {'medium'} else {'low'})"><h3>Failed Logons</h3><div class="value">$FailedLogons</div></div>
<div class="metric"><h3>Admin Logons</h3><div class="value">$AdminLogons</div></div>
<div class="metric risk-$(if ($AccountLockouts -gt 10) {'high'} elseif ($AccountLockouts -gt 0) {'medium'} else {'low'})"><h3>Account Lockouts</h3><div class="value">$AccountLockouts</div></div>
</div>

<h2>Account Activity</h2>
<table>
<tr><th>Metric</th><th>Count</th><th>Status</th></tr>
<tr><td>Accounts Created</td><td>$AccountCreated</td><td>$(if ($AccountCreated -gt 0) {'Review new accounts'} else {'Normal'})</td></tr>
<tr><td>Accounts Deleted</td><td>$AccountDeleted</td><td>$(if ($AccountDeleted -gt 0) {'Review deletions'} else {'Normal'})</td></tr>
<tr><td>Failed Logon Rate</td><td>$FailedLogonRate%</td><td>$(if ($FailedLogonRate -gt 20) {'High - Investigate'} elseif ($FailedLogonRate -gt 10) {'Elevated'} else {'Normal'})</td></tr>
</table>

<h2>Security Alerts</h2>
<table>
<tr><th>Event Type</th><th>Count</th><th>Severity</th></tr>
<tr><td>Audit Logs Cleared (ID 1102)</td><td>$LogCleared</td><td>$(if ($LogCleared -gt 0) {'CRITICAL - Investigate Immediately'} else {'None'})</td></tr>
<tr><td>Audit Policy Changes (ID 4719)</td><td>$PolicyChanges</td><td>$(if ($PolicyChanges -gt 0) {'HIGH - Review Changes'} else {'None'})</td></tr>
</table>

<div class="recommendations">
<h3>Recommendations</h3>
<ul>
$(if ($LogCleared -gt 0) {'<li><strong>CRITICAL:</strong> Audit logs were cleared. Investigate immediately for potential malicious activity.</li>'})
$(if ($PolicyChanges -gt 0) {'<li><strong>HIGH:</strong> Audit policy was modified. Verify changes were authorized.</li>'})
$(if ($FailedLogonRate -gt 20) {'<li><strong>HIGH:</strong> High failed logon rate detected. Check for brute force attempts.</li>'})
$(if ($AccountLockouts -gt 10) {'<li><strong>MEDIUM:</strong> Multiple account lockouts detected. Review lockout sources.</li>'})
$(if ($RiskLevel -eq 'Low') {'<li>No significant security concerns detected. Continue regular monitoring.</li>'})
</ul>
</div>
</div>
</body>
</html>
"@

$HTML | Out-File $ReportPath -Encoding UTF8
Write-Host "[SUCCESS] Report generated: $ReportPath" -ForegroundColor Green

Write-Host "\`nSummary:" -ForegroundColor Cyan
Write-Host "  Risk Level: $RiskLevel" -ForegroundColor $(if ($RiskLevel -eq 'Low') {'Green'} elseif ($RiskLevel -eq 'Medium') {'Yellow'} elseif ($RiskLevel -eq 'High') {'Red'} else {'Magenta'})
Write-Host "  Failed Logon Rate: $FailedLogonRate%" -ForegroundColor $(if ($FailedLogonRate -gt 20) {'Red'} elseif ($FailedLogonRate -gt 10) {'Yellow'} else {'Green'})
Write-Host "  Account Lockouts: $AccountLockouts" -ForegroundColor $(if ($AccountLockouts -gt 10) {'Red'} elseif ($AccountLockouts -gt 0) {'Yellow'} else {'Green'})`;
    }
  }
];
