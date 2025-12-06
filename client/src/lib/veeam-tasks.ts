import { escapePowerShellString, toPowerShellBoolean } from './powershell-utils';

export interface VeeamTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface VeeamTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: VeeamTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const veeamTasks: VeeamTask[] = [
  {
    id: 'veeam-bulk-enable-jobs',
    name: 'Bulk Enable/Disable Backup Jobs',
    category: 'Bulk Operations',
    description: 'Enable or disable multiple backup jobs at once',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobNames', label: 'Job Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Daily-Backup, Weekly-Backup' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobNamesRaw = (params.jobNames as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      
      return `# Bulk ${action} Veeam Backup Jobs
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $JobNames = @(${jobNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($JobName in $JobNames) {
        $Job = Get-VBRJob -Name $JobName
        
        if ($Job) {
${action === 'Enable' ? `            $Job | Enable-VBRJob
            Write-Host "✓ Enabled: $JobName" -ForegroundColor Green` : `            $Job | Disable-VBRJob
            Write-Host "✓ Disabled: $JobName" -ForegroundColor Green`}
        } else {
            Write-Host "⚠ Job not found: $JobName" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Bulk job operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-create-backup-job',
    name: 'Create Backup Job',
    category: 'Job Management',
    description: 'Create a new VM backup job',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Production-VMs-Backup' },
      { id: 'repository', label: 'Backup Repository', type: 'text', required: true, placeholder: 'Default Backup Repository' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'retentionDays', label: 'Retention (Days)', type: 'number', required: true, defaultValue: 14 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const repository = escapePowerShellString(params.repository);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      
      return `# Create Veeam Backup Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Repository = Get-VBRBackupRepository -Name "${repository}"
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    $VMs = foreach ($VMName in $VMNames) {
        Find-VBRViEntity -Name $VMName
    }
    
    Add-VBRViBackupJob \`
        -Name "${jobName}" \`
        -BackupRepository $Repository \`
        -Entity $VMs \`
        -RetentionPolicy "Simple" \`
        -RetentionPolicyDeleteDays ${params.retentionDays}
    
    Write-Host "✓ Backup job '${jobName}' created successfully!" -ForegroundColor Green
    Write-Host "  VMs: $($VMNames.Count)" -ForegroundColor Cyan
    Write-Host "  Retention: ${params.retentionDays} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-start-backup-job',
    name: 'Start/Stop Backup Job',
    category: 'Job Management',
    description: 'Manually start or stop a backup job',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Start', 'Stop'], defaultValue: 'Start' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const action = params.action;
      
      return `# ${action} Veeam Backup Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    
${action === 'Start' ? `    Start-VBRJob -Job $Job
    Write-Host "✓ Backup job started: ${jobName}" -ForegroundColor Green` : `    Stop-VBRJob -Job $Job
    Write-Host "✓ Backup job stopped: ${jobName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-restore-vm',
    name: 'Restore VM from Backup',
    category: 'Restore Operations',
    description: 'Restore a virtual machine from backup',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'restorePoint', label: 'Restore Point', type: 'select', required: true, options: ['Latest', 'Yesterday', 'LastWeek'], defaultValue: 'Latest' },
      { id: 'powerOn', label: 'Power On After Restore', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const powerOn = toPowerShellBoolean(params.powerOn);
      
      return `# Restore VM from Backup
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if ($RestorePoint) {
        Start-VBRRestoreVM -RestorePoint $RestorePoint -PowerUp:${powerOn}
        Write-Host "✓ VM restore initiated: ${vmName}" -ForegroundColor Green
    } else {
        Write-Error "No restore point found for ${vmName}"
    }
    
} catch {
    Write-Error "Restore failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-export-job-report',
    name: 'Export Backup Job Report',
    category: 'Reporting',
    description: 'Generate comprehensive backup job report',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Veeam-Jobs.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Veeam Backup Job Report
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Jobs = Get-VBRJob
    
    $Report = $Jobs | ForEach-Object {
        [PSCustomObject]@{
            JobName = $_.Name
            JobType = $_.JobType
            IsEnabled = $_.IsEnabled
            IsScheduleEnabled = $_.IsScheduleEnabled
            LastResult = $_.LastResult
            LastRun = $_.LastRun
            NextRun = $_.NextRun
            Repository = ($_ | Get-VBRJobObject).TargetRepositoryName
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Jobs: $($Jobs.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-restore-files',
    name: 'Restore Files from Backup',
    category: 'Common Admin Tasks',
    description: 'Restore specific files or folders from VM backup',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'filePath', label: 'File/Folder Path', type: 'path', required: true, placeholder: 'C:\\Users\\Admin\\Documents' },
      { id: 'restoreDestination', label: 'Restore Destination', type: 'path', required: true, placeholder: 'C:\\RestoreTemp' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const filePath = escapePowerShellString(params.filePath);
      const restoreDestination = escapePowerShellString(params.restoreDestination);
      
      return `# Restore Files from Backup
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if ($RestorePoint) {
        $FileRestoreSession = Start-VBRWindowsFileRestore -RestorePoint $RestorePoint
        
        # Browse and restore files
        $Files = Get-VBRWindowsGuestItem -Session $FileRestoreSession -Path "${filePath}"
        
        Restore-VBRWindowsGuestItem -Session $FileRestoreSession -Item $Files -TargetFolder "${restoreDestination}"
        
        Stop-VBRWindowsFileRestore -Session $FileRestoreSession
        
        Write-Host "✓ Files restored to: ${restoreDestination}" -ForegroundColor Green
    } else {
        Write-Error "No restore point found for ${vmName}"
    }
    
} catch {
    Write-Error "File restore failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-restore-application-items',
    name: 'Restore Application Items (Exchange, SQL, AD)',
    category: 'Common Admin Tasks',
    description: 'Restore individual items from application backups',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'applicationType', label: 'Application Type', type: 'select', required: true, options: ['Exchange', 'SQL', 'ActiveDirectory'], defaultValue: 'Exchange' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'itemName', label: 'Item Name', type: 'text', required: true, placeholder: 'Database name or mailbox' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const applicationType = params.applicationType;
      const vmName = escapePowerShellString(params.vmName);
      const itemName = escapePowerShellString(params.itemName);
      
      return `# Restore ${applicationType} Application Items
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if ($RestorePoint) {
${applicationType === 'Exchange' ? `        # Exchange mailbox restore
        $Session = Start-VBRExchangeItemRestore -RestorePoint $RestorePoint
        $Mailbox = Get-VBRExchangeMailbox -Session $Session -Name "${itemName}"
        Restore-VBRExchangeMailbox -Session $Session -Mailbox $Mailbox
        Stop-VBRExchangeItemRestore -Session $Session
        Write-Host "✓ Exchange mailbox restored: ${itemName}" -ForegroundColor Green` :
applicationType === 'SQL' ? `        # SQL database restore
        $Session = Start-VBRSQLItemRestore -RestorePoint $RestorePoint
        $Database = Get-VBRSQLDatabase -Session $Session -Name "${itemName}"
        Restore-VBRSQLDatabase -Session $Session -Database $Database
        Stop-VBRSQLItemRestore -Session $Session
        Write-Host "✓ SQL database restored: ${itemName}" -ForegroundColor Green` :
`        # Active Directory object restore
        $Session = Start-VBRADObjectRestore -RestorePoint $RestorePoint
        $Object = Get-VBRADObject -Session $Session -Name "${itemName}"
        Restore-VBRADObject -Session $Session -Object $Object
        Stop-VBRADObjectRestore -Session $Session
        Write-Host "✓ AD object restored: ${itemName}" -ForegroundColor Green`}
    } else {
        Write-Error "No restore point found"
    }
    
} catch {
    Write-Error "Application restore failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-surebackup-verify',
    name: 'Verify Backup Integrity with SureBackup',
    category: 'Common Admin Tasks',
    description: 'Run SureBackup verification to test backup validity',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'jobName', label: 'Backup Job Name', type: 'text', required: true },
      { id: 'virtualLab', label: 'Virtual Lab', type: 'text', required: true, placeholder: 'SureBackup Lab' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const virtualLab = escapePowerShellString(params.virtualLab);
      
      return `# Verify Backup with SureBackup
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    $VirtualLab = Get-VBRVirtualLab -Name "${virtualLab}"
    
    # Create SureBackup job
    $SureBackupJob = Add-VBRViSureBackupJob \`
        -Name "Verify-${jobName}" \`
        -VirtualLab $VirtualLab \`
        -Job $Job
    
    # Start verification
    Start-VBRSureBackupJob -Job $SureBackupJob
    
    Write-Host "✓ SureBackup verification started for: ${jobName}" -ForegroundColor Green
    Write-Host "  Monitor job progress in Veeam console" -ForegroundColor Cyan
    
} catch {
    Write-Error "SureBackup verification failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-manage-repositories',
    name: 'Manage Backup Repositories and Proxies',
    category: 'Common Admin Tasks',
    description: 'Add or configure backup repositories and proxy servers',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['AddRepository', 'ListRepositories', 'AddProxy', 'ListProxies'], defaultValue: 'ListRepositories' },
      { id: 'repositoryName', label: 'Repository Name', type: 'text', required: false, placeholder: 'Backup-Repository-02' },
      { id: 'repositoryPath', label: 'Repository Path', type: 'path', required: false, placeholder: 'E:\\Backups' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const action = params.action;
      const repositoryName = params.repositoryName ? escapePowerShellString(params.repositoryName) : '';
      const repositoryPath = params.repositoryPath ? escapePowerShellString(params.repositoryPath) : '';
      
      return `# Manage Backup Repositories and Proxies
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
${action === 'AddRepository' ? `    Add-VBRBackupRepository \`
        -Name "${repositoryName}" \`
        -Folder "${repositoryPath}" \`
        -Type WinLocal
    Write-Host "✓ Repository added: ${repositoryName}" -ForegroundColor Green` :
action === 'ListRepositories' ? `    $Repositories = Get-VBRBackupRepository
    
    Write-Host "Backup Repositories:" -ForegroundColor Cyan
    $Repositories | ForEach-Object {
        Write-Host "  Name: $($_.Name)"
        Write-Host "    Path: $($_.Path)"
        Write-Host "    Capacity: $([math]::Round($_.Info.CachedTotalSpace/1GB,2)) GB"
        Write-Host "    Free Space: $([math]::Round($_.Info.CachedFreeSpace/1GB,2)) GB"
        Write-Host ""
    }` :
action === 'AddProxy' ? `    $ProxyServer = Get-VBRServer -Name "${repositoryName}"
    Add-VBRViProxy -Server $ProxyServer
    Write-Host "✓ Proxy added: ${repositoryName}" -ForegroundColor Green` :
`    $Proxies = Get-VBRViProxy
    
    Write-Host "Backup Proxies:" -ForegroundColor Cyan
    $Proxies | ForEach-Object {
        Write-Host "  Name: $($_.Name)"
        Write-Host "    Host: $($_.Host.Name)"
        Write-Host "    Max Tasks: $($_.Options.MaxTasksCount)"
        Write-Host ""
    }`}
    
} catch {
    Write-Error "Repository/Proxy operation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-export-job-report-html',
    name: 'Export Backup Job Reports to CSV/HTML',
    category: 'Common Admin Tasks',
    description: 'Generate backup job reports in CSV or HTML format',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'exportFormat', label: 'Export Format', type: 'select', required: true, options: ['CSV', 'HTML'], defaultValue: 'CSV' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Veeam-Report.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportFormat = params.exportFormat;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Backup Job Reports
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Jobs = Get-VBRJob
    $Sessions = Get-VBRBackupSession | Where-Object { $_.EndTime -gt (Get-Date).AddDays(-7) }
    
    $Report = $Sessions | ForEach-Object {
        [PSCustomObject]@{
            JobName = $_.JobName
            JobType = $_.JobType
            State = $_.State
            Result = $_.Result
            StartTime = $_.CreationTime
            EndTime = $_.EndTime
            Duration = ($_.EndTime - $_.CreationTime).ToString()
            ProcessedSize = [math]::Round($_.BackupStats.DataSize/1GB,2)
            TransferredSize = [math]::Round($_.BackupStats.BackupSize/1GB,2)
        }
    }
    
${exportFormat === 'CSV' ? `    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ CSV report exported: ${exportPath}" -ForegroundColor Green` :
`    $HTML = $Report | ConvertTo-Html -Title "Veeam Backup Report" -PreContent "<h1>Veeam Backup Job Report</h1><p>Generated: $(Get-Date)</p>"
    $HTML | Out-File -FilePath "${exportPath}"
    Write-Host "✓ HTML report exported: ${exportPath}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Export failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-configure-email-notifications',
    name: 'Configure Email Notifications for Jobs',
    category: 'Common Admin Tasks',
    description: 'Set up email alerts for backup job results',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'smtpServer', label: 'SMTP Server', type: 'text', required: true, placeholder: 'smtp.company.com' },
      { id: 'smtpPort', label: 'SMTP Port', type: 'number', required: true, defaultValue: 25 },
      { id: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'veeam@company.com' },
      { id: 'toEmail', label: 'To Email', type: 'email', required: true, placeholder: 'admin@company.com' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const smtpServer = escapePowerShellString(params.smtpServer);
      const fromEmail = escapePowerShellString(params.fromEmail);
      const toEmail = escapePowerShellString(params.toEmail);
      
      return `# Configure Email Notifications
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    # Configure SMTP settings
    Set-VBRMailServer \`
        -Server "${smtpServer}" \`
        -Port ${params.smtpPort} \`
        -From "${fromEmail}"
    
    # Enable notifications for all jobs
    $Jobs = Get-VBRJob
    
    foreach ($Job in $Jobs) {
        Set-VBRJobAdvancedNotificationOptions -Job $Job \`
            -EmailNotification $true \`
            -EmailNotificationAddress "${toEmail}" \`
            -NotifyOnSuccess $true \`
            -NotifyOnWarning $true \`
            -NotifyOnError $true
        
        Write-Host "✓ Email notifications configured for: $($Job.Name)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Email notifications configured successfully!" -ForegroundColor Green
    Write-Host "  SMTP Server: ${smtpServer}:${params.smtpPort}" -ForegroundColor Cyan
    Write-Host "  Recipient: ${toEmail}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Email configuration failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-monitor-job-sessions',
    name: 'Monitor Job Sessions and Error Logs',
    category: 'Common Admin Tasks',
    description: 'View active job sessions and recent error logs',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'daysBack', label: 'Days to Look Back', type: 'number', required: true, defaultValue: 7 },
      { id: 'showErrorsOnly', label: 'Show Errors Only', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const showErrorsOnly = toPowerShellBoolean(params.showErrorsOnly);
      
      return `# Monitor Job Sessions and Error Logs
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $StartDate = (Get-Date).AddDays(-${params.daysBack})
    $Sessions = Get-VBRBackupSession | Where-Object { $_.EndTime -gt $StartDate }
    
    ${showErrorsOnly} {
        $Sessions = $Sessions | Where-Object { $_.Result -eq "Failed" -or $_.Result -eq "Warning" }
    }
    
    Write-Host "Backup Job Sessions (Last ${params.daysBack} days)" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $Sessions | Sort-Object EndTime -Descending | ForEach-Object {
        $Color = switch ($_.Result) {
            "Success" { "Green" }
            "Warning" { "Yellow" }
            "Failed" { "Red" }
            default { "White" }
        }
        
        Write-Host "Job: $($_.JobName)" -ForegroundColor $Color
        Write-Host "  Result: $($_.Result)" -ForegroundColor $Color
        Write-Host "  State: $($_.State)"
        Write-Host "  Start: $($_.CreationTime)"
        Write-Host "  End: $($_.EndTime)"
        Write-Host "  Duration: $(($_.EndTime - $_.CreationTime).ToString())"
        
        # Show error details for failed jobs
        if ($_.Result -eq "Failed" -or $_.Result -eq "Warning") {
            $TaskSessions = $_ | Get-VBRTaskSession
            $Warnings = $TaskSessions | Where-Object { $_.Status -eq "Warning" -or $_.Status -eq "Failed" }
            
            if ($Warnings) {
                Write-Host "  Errors/Warnings:" -ForegroundColor Red
                $Warnings | ForEach-Object {
                    Write-Host "    - $($_.Name): $($_.Info.Reason)" -ForegroundColor Red
                }
            }
        }
        
        Write-Host ""
    }
    
    # Summary
    $TotalJobs = $Sessions.Count
    $SuccessJobs = ($Sessions | Where-Object { $_.Result -eq "Success" }).Count
    $WarningJobs = ($Sessions | Where-Object { $_.Result -eq "Warning" }).Count
    $FailedJobs = ($Sessions | Where-Object { $_.Result -eq "Failed" }).Count
    
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total Sessions: $TotalJobs"
    Write-Host "  Success: $SuccessJobs" -ForegroundColor Green
    Write-Host "  Warnings: $WarningJobs" -ForegroundColor Yellow
    Write-Host "  Failed: $FailedJobs" -ForegroundColor Red
    
} catch {
    Write-Error "Monitoring failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-configure-backup-copy',
    name: 'Configure Backup Copy Jobs',
    category: 'Common Admin Tasks',
    description: 'Set up backup copies to secondary repository for 3-2-1 rule',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'copyJobName', label: 'Backup Copy Job Name', type: 'text', required: true, placeholder: 'Copy-to-Offsite' },
      { id: 'sourceJob', label: 'Source Backup Job', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'targetRepository', label: 'Target Repository', type: 'text', required: true, placeholder: 'Offsite-Repository' },
      { id: 'retentionDays', label: 'Retention (Days)', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const copyJobName = escapePowerShellString(params.copyJobName);
      const sourceJob = escapePowerShellString(params.sourceJob);
      const targetRepository = escapePowerShellString(params.targetRepository);
      
      return `# Configure Backup Copy Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    # Get source job and target repository
    $SourceJob = Get-VBRJob -Name "${sourceJob}"
    $TargetRepo = Get-VBRBackupRepository -Name "${targetRepository}"
    
    if (-not $SourceJob) {
        throw "Source backup job '${sourceJob}' not found"
    }
    
    if (-not $TargetRepo) {
        throw "Target repository '${targetRepository}' not found"
    }
    
    # Create backup copy job
    Add-VBRBackupCopyJob \`
        -Name "${copyJobName}" \`
        -BackupJob $SourceJob \`
        -TargetRepository $TargetRepo \`
        -RetentionPolicy "Simple" \`
        -RetentionPolicyDeleteDays ${params.retentionDays}
    
    Write-Host "✓ Backup copy job '${copyJobName}' created successfully!" -ForegroundColor Green
    Write-Host "  Source Job: ${sourceJob}" -ForegroundColor Cyan
    Write-Host "  Target Repository: ${targetRepository}" -ForegroundColor Cyan
    Write-Host "  Retention: ${params.retentionDays} days" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3-2-1 Rule Status: Enhanced with offsite copy" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to configure backup copy job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-manage-tape-backup',
    name: 'Manage Tape Backup Jobs',
    category: 'Common Admin Tasks',
    description: 'Create tape jobs, manage media pools, export to tape',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'tapeJobName', label: 'Tape Job Name', type: 'text', required: true, placeholder: 'Weekly-Tape-Backup' },
      { id: 'sourceJob', label: 'Source Backup Job', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'mediaPool', label: 'Media Pool Name', type: 'text', required: true, placeholder: 'Monthly-Tape-Pool' },
      { id: 'retentionType', label: 'Retention Type', type: 'select', required: true, options: ['Days', 'Weeks', 'Months'], defaultValue: 'Months' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const tapeJobName = escapePowerShellString(params.tapeJobName);
      const sourceJob = escapePowerShellString(params.sourceJob);
      const mediaPool = escapePowerShellString(params.mediaPool);
      const retentionType = params.retentionType;
      
      return `# Manage Tape Backup Jobs
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    # Get source backup job
    $SourceJob = Get-VBRJob -Name "${sourceJob}"
    
    if (-not $SourceJob) {
        throw "Source backup job '${sourceJob}' not found"
    }
    
    # Check if media pool exists, create if not
    $MediaPool = Get-VBRTapeMediaPool -Name "${mediaPool}" -ErrorAction SilentlyContinue
    
    if (-not $MediaPool) {
        Write-Host "Creating new media pool: ${mediaPool}" -ForegroundColor Yellow
        $TapeLibrary = Get-VBRTapeLibrary | Select-Object -First 1
        $MediaPool = Add-VBRTapeMediaPool -Library $TapeLibrary -Name "${mediaPool}"
    }
    
    # Create tape backup job
    Add-VBRTapeBackupJob \`
        -Name "${tapeJobName}" \`
        -BackupJob $SourceJob \`
        -MediaPool $MediaPool \`
        -RetentionType "${retentionType}"
    
    Write-Host "✓ Tape backup job '${tapeJobName}' created successfully!" -ForegroundColor Green
    Write-Host "  Source Job: ${sourceJob}" -ForegroundColor Cyan
    Write-Host "  Media Pool: ${mediaPool}" -ForegroundColor Cyan
    Write-Host "  Retention: ${retentionType}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Tape Management Tips:" -ForegroundColor Yellow
    Write-Host "  - Use Get-VBRTapeMediaPool to view media pools" -ForegroundColor Gray
    Write-Host "  - Use Start-VBRTapeJob to run tape jobs manually" -ForegroundColor Gray
    Write-Host "  - Use Get-VBRTapeBackupSession for job history" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure tape backup job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-configure-replication',
    name: 'Configure Replication Jobs',
    category: 'Common Admin Tasks',
    description: 'Set up VM replication for DR, configure failover plans',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'replicationJobName', label: 'Replication Job Name', type: 'text', required: true, placeholder: 'DR-Replication' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true, placeholder: 'VM1, VM2, VM3' },
      { id: 'targetHost', label: 'Target ESXi/Hyper-V Host', type: 'text', required: true, placeholder: 'dr-host.company.com' },
      { id: 'restorePoints', label: 'Restore Points to Keep', type: 'number', required: true, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const replicationJobName = escapePowerShellString(params.replicationJobName);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const targetHost = escapePowerShellString(params.targetHost);
      
      return `# Configure VM Replication Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    # Get target host
    $TargetHost = Get-VBRServer -Name "${targetHost}"
    
    if (-not $TargetHost) {
        throw "Target host '${targetHost}' not found. Add it first using Add-VBRServer."
    }
    
    # Get VMs to replicate
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    $VMs = foreach ($VMName in $VMNames) {
        $VM = Find-VBRViEntity -Name $VMName
        if ($VM) {
            Write-Host "✓ Found VM: $VMName" -ForegroundColor Green
            $VM
        } else {
            Write-Host "⚠ VM not found: $VMName" -ForegroundColor Yellow
        }
    }
    
    if ($VMs.Count -eq 0) {
        throw "No valid VMs found for replication"
    }
    
    # Create replication job
    Add-VBRViReplicaJob \`
        -Name "${replicationJobName}" \`
        -Entity $VMs \`
        -Server $TargetHost \`
        -RestorePoints ${params.restorePoints}
    
    Write-Host ""
    Write-Host "✓ Replication job '${replicationJobName}' created successfully!" -ForegroundColor Green
    Write-Host "  VMs to Replicate: $($VMs.Count)" -ForegroundColor Cyan
    Write-Host "  Target Host: ${targetHost}" -ForegroundColor Cyan
    Write-Host "  Restore Points: ${params.restorePoints}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Disaster Recovery Status:" -ForegroundColor Yellow
    Write-Host "  - Replication configured for continuous DR protection" -ForegroundColor Gray
    Write-Host "  - Use Start-VBRJob to run initial replication" -ForegroundColor Gray
    Write-Host "  - Configure failover plans with Add-VBRFailoverPlan" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Failover Commands:" -ForegroundColor Cyan
    Write-Host "  Test Failover: Start-VBRViReplicaFailoverTest" -ForegroundColor Gray
    Write-Host "  Planned Failover: Start-VBRViReplicaPlannedFailover" -ForegroundColor Gray
    Write-Host "  Failback: Start-VBRViReplicaFailback" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure replication job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  {
    id: 'veeam-configure-instant-vm-recovery',
    name: 'Configure Instant VM Recovery',
    category: 'Common Admin Tasks',
    description: 'Restore VMs instantly from backups',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'targetHost', label: 'Target ESXi Host', type: 'text', required: true, placeholder: 'esxi-host.company.com' },
      { id: 'datastore', label: 'Datastore', type: 'text', required: true, placeholder: 'Datastore01' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const targetHost = escapePowerShellString(params.targetHost);
      const datastore = escapePowerShellString(params.datastore);
      
      return `# Configure Instant VM Recovery
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    # Get latest restore point
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if ($RestorePoint) {
        Write-Host "Starting Instant VM Recovery for: ${vmName}..." -ForegroundColor Cyan
        
        # Start Instant Recovery
        $VMHost = Get-VBRServer -Name "${targetHost}"
        $Datastore = Find-VBRViDatastore -Server $VMHost -Name "${datastore}"
        
        Start-VBRInstantRecovery \`
            -RestorePoint $RestorePoint \`
            -Server $VMHost \`
            -Datastore $Datastore \`
            -QuickRollback
        
        Write-Host "✓ Instant VM Recovery started successfully!" -ForegroundColor Green
        Write-Host "  VM: ${vmName}" -ForegroundColor Cyan
        Write-Host "  Target Host: ${targetHost}" -ForegroundColor Cyan
        Write-Host "  Datastore: ${datastore}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "VM will boot from backup snapshot" -ForegroundColor Yellow
        Write-Host "Use Quick Migration to move to production storage when ready" -ForegroundColor Yellow
    } else {
        Write-Error "No restore points found for ${vmName}"
    }
    
} catch {
    Write-Error "Instant recovery failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  {
    id: 'veeam-manage-repositories-advanced',
    name: 'Manage Backup Repositories (Advanced)',
    category: 'Common Admin Tasks',
    description: 'Configure scale-out repositories and deduplication',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['CreateScaleOut', 'ConfigureDedup', 'ViewStats'], defaultValue: 'CreateScaleOut' },
      { id: 'repoName', label: 'Repository Name', type: 'text', required: false, placeholder: 'ScaleOut-Repo' },
      { id: 'extentRepos', label: 'Extent Repositories (comma-separated)', type: 'textarea', required: false, placeholder: 'Repo01, Repo02' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const action = params.action;
      const repoName = params.repoName ? escapePowerShellString(params.repoName) : '';
      const extentReposRaw = params.extentRepos ? (params.extentRepos as string).split(',').map((r: string) => r.trim()) : [];
      
      return `# Manage Backup Repositories (Advanced)
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    ${action === 'CreateScaleOut' ? `
    Write-Host "Creating Scale-Out Repository: ${repoName}..." -ForegroundColor Cyan
    
    $ExtentRepos = @(${extentReposRaw.map(r => `"${escapePowerShellString(r)}"`).join(', ')})
    $Extents = @()
    
    foreach ($RepoName in $ExtentRepos) {
        $Repo = Get-VBRBackupRepository -Name $RepoName
        $Extents += $Repo
    }
    
    Add-VBRScaleOutBackupRepository \`
        -Name "${repoName}" \`
        -Extent $Extents \`
        -PolicyType "DataLocality"
    
    Write-Host "✓ Scale-Out Repository created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${repoName}" -ForegroundColor Cyan
    Write-Host "  Extents: $($Extents.Count)" -ForegroundColor Cyan
    ` : action === 'ConfigureDedup' ? `
    Write-Host "Configuring deduplication for repository: ${repoName}..." -ForegroundColor Cyan
    
    $Repo = Get-VBRBackupRepository -Name "${repoName}"
    Set-VBRRepositoryDeduplicationSettings \`
        -Repository $Repo \`
        -Enabled:$true \`
        -BlockSize "4KB"
    
    Write-Host "✓ Deduplication configured successfully!" -ForegroundColor Green
    ` : `
    $Repos = Get-VBRBackupRepository
    
    Write-Host "Backup Repository Statistics:" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    
    $Repos | ForEach-Object {
        $Repo = $_
        Write-Host ""
        Write-Host "Repository: $($Repo.Name)" -ForegroundColor Yellow
        Write-Host "  Type: $($Repo.Type)"
        Write-Host "  Capacity: $([math]::Round($Repo.Info.CachedTotalSpace/1TB,2)) TB"
        Write-Host "  Free: $([math]::Round($Repo.Info.CachedFreeSpace/1TB,2)) TB"
        Write-Host "  Used: $([math]::Round(($Repo.Info.CachedTotalSpace - $Repo.Info.CachedFreeSpace)/1TB,2)) TB"
        Write-Host "  Dedup: $($Repo.DeduplicationEnabled)"
    }
    `}
    
} catch {
    Write-Error "Repository operation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  {
    id: 'veeam-configure-app-aware-processing',
    name: 'Configure Application-Aware Processing',
    category: 'Common Admin Tasks',
    description: 'Enable app-aware backups for SQL and Exchange',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'jobName', label: 'Backup Job Name', type: 'text', required: true },
      { id: 'appType', label: 'Application Type', type: 'select', required: true, options: ['SQL', 'Exchange', 'ActiveDirectory'], defaultValue: 'SQL' },
      { id: 'truncateLogs', label: 'Truncate Logs', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const appType = params.appType;
      const truncateLogs = toPowerShellBoolean(params.truncateLogs);
      
      return `# Configure Application-Aware Processing
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    
    if ($Job) {
        Write-Host "Configuring Application-Aware Processing for: ${jobName}..." -ForegroundColor Cyan
        
        # Enable application-aware processing
        $JobOptions = $Job.GetOptions()
        $JobOptions.ViSourceOptions.AppAware = $true
        $JobOptions.ViSourceOptions.GuestProxyAutoDetect = $true
        
        ${appType === 'SQL' ? `
        # SQL Server settings
        $JobOptions.SqlBackupOptions.TransactionLogProcessing = "TruncateOnlyOnSuccessJob"
        $JobOptions.SqlBackupOptions.BackupLogsFrequencyMin = 15
        Write-Host "  Configured for SQL Server" -ForegroundColor Cyan
        ` : appType === 'Exchange' ? `
        # Exchange Server settings
        $JobOptions.ExchangeBackupOptions.ProcessCircularLogging = $true
        Write-Host "  Configured for Exchange Server" -ForegroundColor Cyan
        ` : `
        # Active Directory settings
        $JobOptions.ViSourceOptions.UseChangeTracking = $true
        Write-Host "  Configured for Active Directory" -ForegroundColor Cyan
        `}
        
        $Job.SetOptions($JobOptions)
        
        Write-Host "✓ Application-Aware Processing configured successfully!" -ForegroundColor Green
        Write-Host "  Job: ${jobName}" -ForegroundColor Cyan
        Write-Host "  Application: ${appType}" -ForegroundColor Cyan
        Write-Host "  Truncate Logs: ${params.truncateLogs}" -ForegroundColor Cyan
    } else {
        Write-Error "Job ${jobName} not found"
    }
    
} catch {
    Write-Error "Configuration failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  {
    id: 'veeam-manage-cloud-connect',
    name: 'Manage Veeam Cloud Connect',
    category: 'Common Admin Tasks',
    description: 'Set up cloud backup targets',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'cloudProvider', label: 'Cloud Provider Address', type: 'text', required: true, placeholder: 'cloud.serviceprovider.com' },
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'tenant@provider.com' },
      { id: 'repoName', label: 'Cloud Repository Name', type: 'text', required: true, placeholder: 'Cloud-Backup-Repo' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const cloudProvider = escapePowerShellString(params.cloudProvider);
      const username = escapePowerShellString(params.username);
      const repoName = escapePowerShellString(params.repoName);
      
      return `# Manage Veeam Cloud Connect
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Connecting to Cloud Provider: ${cloudProvider}..." -ForegroundColor Cyan
    
    # Prompt for password securely
    $SecurePassword = Read-Host -AsSecureString "Enter password for ${username}"
    $Credentials = New-Object System.Management.Automation.PSCredential("${username}", $SecurePassword)
    
    # Add Cloud Connect server
    $CloudServer = Add-VBRCloudProvider \`
        -Address "${cloudProvider}" \`
        -Credentials $Credentials \`
        -Description "Cloud Connect Provider"
    
    # Get cloud repository
    $CloudRepo = Get-VBRCloudHardwarePlan | Where-Object { $_.Name -eq "${repoName}" } | Select-Object -First 1
    
    if ($CloudRepo) {
        Write-Host "✓ Cloud Connect configured successfully!" -ForegroundColor Green
        Write-Host "  Provider: ${cloudProvider}" -ForegroundColor Cyan
        Write-Host "  Repository: ${repoName}" -ForegroundColor Cyan
        Write-Host "  User: ${username}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Create cloud backup jobs with: Add-VBRViBackupCopyJob" -ForegroundColor Yellow
    } else {
        Write-Warning "Cloud repository ${repoName} not found. Contact provider for available repos."
    }
    
} catch {
    Write-Error "Cloud Connect configuration failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  {
    id: 'veeam-generate-compliance-reports',
    name: 'Generate Backup Compliance Reports',
    category: 'Common Admin Tasks',
    description: 'Export compliance and SLA adherence data',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true },
      { id: 'daysBack', label: 'Days to Analyze', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Veeam-Compliance.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate Backup Compliance Reports
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Generating compliance report for last ${params.daysBack} days..." -ForegroundColor Cyan
    
    $StartDate = (Get-Date).AddDays(-${params.daysBack})
    $Jobs = Get-VBRJob
    $Sessions = Get-VBRBackupSession | Where-Object { $_.EndTime -gt $StartDate }
    
    $ComplianceReport = $Jobs | ForEach-Object {
        $Job = $_
        $JobSessions = $Sessions | Where-Object { $_.JobName -eq $Job.Name }
        
        $SuccessRate = if ($JobSessions.Count -gt 0) {
            [math]::Round((($JobSessions | Where-Object { $_.Result -eq "Success" }).Count / $JobSessions.Count) * 100, 2)
        } else {
            0
        }
        
        $LastSession = $JobSessions | Sort-Object EndTime -Descending | Select-Object -First 1
        $SLA_Met = $SuccessRate -ge 95
        
        [PSCustomObject]@{
            JobName = $Job.Name
            JobType = $Job.JobType
            IsEnabled = $Job.IsScheduleEnabled
            TotalRuns = $JobSessions.Count
            SuccessfulRuns = ($JobSessions | Where-Object { $_.Result -eq "Success" }).Count
            FailedRuns = ($JobSessions | Where-Object { $_.Result -eq "Failed" }).Count
            WarningRuns = ($JobSessions | Where-Object { $_.Result -eq "Warning" }).Count
            SuccessRate_Percent = $SuccessRate
            SLA_Status = if ($SLA_Met) { "Compliant" } else { "Non-Compliant" }
            LastRunTime = $LastSession.EndTime
            LastRunResult = $LastSession.Result
            LastRunDuration = if ($LastSession) { ($LastSession.EndTime - $LastSession.CreationTime).ToString() } else { "N/A" }
        }
    }
    
    $ComplianceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Compliance report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Compliance Summary:" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Yellow
    
    $CompliantJobs = ($ComplianceReport | Where-Object { $_.SLA_Status -eq "Compliant" }).Count
    $TotalJobs = $ComplianceReport.Count
    $ComplianceRate = [math]::Round(($CompliantJobs / $TotalJobs) * 100, 2)
    
    Write-Host "  Total Jobs: $TotalJobs" -ForegroundColor Cyan
    Write-Host "  Compliant Jobs: $CompliantJobs" -ForegroundColor Green
    Write-Host "  Non-Compliant Jobs: $($TotalJobs - $CompliantJobs)" -ForegroundColor Red
    Write-Host "  Overall Compliance Rate: $ComplianceRate%" -ForegroundColor $(if ($ComplianceRate -ge 95) { 'Green' } else { 'Red' })
    
    Write-Host ""
    $ComplianceReport | Format-Table -AutoSize | Out-String | Write-Host
    
} catch {
    Write-Error "Report generation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // REPLICATION JOBS
  // ============================================
  {
    id: 'veeam-create-replication-job',
    name: 'Create VM Replication Job',
    category: 'Replication Jobs',
    description: 'Create a new VM replication job to a target host',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobName', label: 'Replication Job Name', type: 'text', required: true, placeholder: 'DR-Replication-Job' },
      { id: 'sourceVMs', label: 'Source VMs (comma-separated)', type: 'textarea', required: true, placeholder: 'VM1, VM2, VM3' },
      { id: 'targetHost', label: 'Target ESXi Host', type: 'text', required: true, placeholder: 'esxi-dr.company.com' },
      { id: 'targetDatastore', label: 'Target Datastore', type: 'text', required: true, placeholder: 'DR-Datastore' },
      { id: 'restorePoints', label: 'Restore Points to Keep', type: 'number', required: true, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const vmNamesRaw = (params.sourceVMs as string).split(',').map((n: string) => n.trim());
      const targetHost = escapePowerShellString(params.targetHost);
      const targetDatastore = escapePowerShellString(params.targetDatastore);
      
      return `# Create VM Replication Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Creating replication job: ${jobName}..." -ForegroundColor Cyan
    
    # Get source VMs
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $VMs = foreach ($VMName in $VMNames) {
        Find-VBRViEntity -Name $VMName
    }
    
    # Get target infrastructure
    $TargetHost = Get-VBRServer -Name "${targetHost}"
    $TargetDatastore = Find-VBRViDatastore -Server $TargetHost -Name "${targetDatastore}"
    
    # Create replication job
    Add-VBRViReplicaJob \`
        -Name "${jobName}" \`
        -Entity $VMs \`
        -Server $TargetHost \`
        -Datastore $TargetDatastore \`
        -RestorePointsToKeep ${params.restorePoints}
    
    Write-Host "✓ Replication job '${jobName}' created successfully!" -ForegroundColor Green
    Write-Host "  Source VMs: $($VMNames.Count)" -ForegroundColor Cyan
    Write-Host "  Target Host: ${targetHost}" -ForegroundColor Cyan
    Write-Host "  Target Datastore: ${targetDatastore}" -ForegroundColor Cyan
    Write-Host "  Restore Points: ${params.restorePoints}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create replication job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-failover-replica',
    name: 'Perform Replica Failover',
    category: 'Replication Jobs',
    description: 'Failover to a VM replica during disaster recovery',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Replica Name', type: 'text', required: true, placeholder: 'VM-DR-Replica' },
      { id: 'restorePoint', label: 'Restore Point', type: 'select', required: true, options: ['Latest', 'Previous'], defaultValue: 'Latest' },
      { id: 'powerOn', label: 'Power On After Failover', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const powerOn = toPowerShellBoolean(params.powerOn);
      
      return `# Perform Replica Failover
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Initiating failover for replica: ${vmName}..." -ForegroundColor Cyan
    
    # Get the replica
    $Replica = Get-VBRReplica -Name "${vmName}"
    
    if (-not $Replica) {
        throw "Replica '${vmName}' not found"
    }
    
    # Get restore point
    $RestorePoints = Get-VBRReplicaRestorePoint -Replica $Replica | Sort-Object CreationTime -Descending
    $SelectedPoint = $RestorePoints | Select-Object -First 1
    
    if (-not $SelectedPoint) {
        throw "No restore points found for replica"
    }
    
    # Perform failover
    Start-VBRViReplicaFailover \`
        -Replica $Replica \`
        -RestorePoint $SelectedPoint \`
        -PowerOn:${powerOn} \`
        -Reason "DR Failover initiated via PowerShell"
    
    Write-Host "✓ Failover initiated successfully!" -ForegroundColor Green
    Write-Host "  VM Replica: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Restore Point: $($SelectedPoint.CreationTime)" -ForegroundColor Cyan
    Write-Host "  Power On: ${params.powerOn}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Remember to commit or undo failover when ready" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failover failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-failback-replica',
    name: 'Perform Replica Failback',
    category: 'Replication Jobs',
    description: 'Failback from replica to original production VM',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Replica Name', type: 'text', required: true, placeholder: 'VM-DR-Replica' },
      { id: 'quickRollback', label: 'Quick Rollback', type: 'boolean', required: false, defaultValue: false },
      { id: 'powerOnOriginal', label: 'Power On Original VM', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const quickRollback = toPowerShellBoolean(params.quickRollback);
      const powerOnOriginal = toPowerShellBoolean(params.powerOnOriginal);
      
      return `# Perform Replica Failback
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Initiating failback for replica: ${vmName}..." -ForegroundColor Cyan
    
    # Get the replica
    $Replica = Get-VBRReplica -Name "${vmName}"
    
    if (-not $Replica) {
        throw "Replica '${vmName}' not found"
    }
    
    # Check if replica is in failover state
    if ($Replica.State -ne "Failover") {
        throw "Replica is not in failover state. Current state: $($Replica.State)"
    }
    
    # Perform failback
    Start-VBRViReplicaFailback \`
        -Replica $Replica \`
        -QuickRollback:${quickRollback} \`
        -PowerOn:${powerOnOriginal}
    
    Write-Host "✓ Failback initiated successfully!" -ForegroundColor Green
    Write-Host "  VM Replica: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Quick Rollback: ${params.quickRollback}" -ForegroundColor Cyan
    Write-Host "  Power On Original: ${params.powerOnOriginal}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitor failback progress in Veeam console" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failback failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-planned-failover',
    name: 'Perform Planned Failover',
    category: 'Replication Jobs',
    description: 'Execute a planned failover with final data sync',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Replica Name', type: 'text', required: true, placeholder: 'VM-DR-Replica' },
      { id: 'shutdownSource', label: 'Shutdown Source VM', type: 'boolean', required: false, defaultValue: true },
      { id: 'powerOnReplica', label: 'Power On Replica', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const shutdownSource = toPowerShellBoolean(params.shutdownSource);
      const powerOnReplica = toPowerShellBoolean(params.powerOnReplica);
      
      return `# Perform Planned Failover
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Initiating planned failover for: ${vmName}..." -ForegroundColor Cyan
    Write-Host "This will sync final changes before failover" -ForegroundColor Yellow
    
    # Get the replica
    $Replica = Get-VBRReplica -Name "${vmName}"
    
    if (-not $Replica) {
        throw "Replica '${vmName}' not found"
    }
    
    # Perform planned failover (with final sync)
    Start-VBRPlannedFailover \`
        -Replica $Replica \`
        -ShutdownSourceVM:${shutdownSource} \`
        -PowerOnReplica:${powerOnReplica}
    
    Write-Host "✓ Planned failover initiated successfully!" -ForegroundColor Green
    Write-Host "  VM Replica: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Source VM Shutdown: ${params.shutdownSource}" -ForegroundColor Cyan
    Write-Host "  Replica Power On: ${params.powerOnReplica}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Planned failover includes final incremental sync" -ForegroundColor Yellow
    
} catch {
    Write-Error "Planned failover failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-test-failover',
    name: 'Test Replica Failover',
    category: 'Replication Jobs',
    description: 'Test failover to replica without affecting production',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Replica Name', type: 'text', required: true, placeholder: 'VM-DR-Replica' },
      { id: 'isolatedNetwork', label: 'Use Isolated Network', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const isolatedNetwork = toPowerShellBoolean(params.isolatedNetwork);
      
      return `# Test Replica Failover
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Starting test failover for: ${vmName}..." -ForegroundColor Cyan
    
    # Get the replica
    $Replica = Get-VBRReplica -Name "${vmName}"
    
    if (-not $Replica) {
        throw "Replica '${vmName}' not found"
    }
    
    # Get latest restore point
    $RestorePoint = Get-VBRReplicaRestorePoint -Replica $Replica | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    # Start test failover
    Start-VBRViReplicaFailoverTest \`
        -Replica $Replica \`
        -RestorePoint $RestorePoint \`
        -UseIsolatedNetwork:${isolatedNetwork}
    
    Write-Host "✓ Test failover started successfully!" -ForegroundColor Green
    Write-Host "  VM Replica: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Restore Point: $($RestorePoint.CreationTime)" -ForegroundColor Cyan
    Write-Host "  Isolated Network: ${params.isolatedNetwork}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Remember to stop test failover when done:" -ForegroundColor Yellow
    Write-Host "  Stop-VBRViReplicaFailoverTest -Replica \$Replica" -ForegroundColor Yellow
    
} catch {
    Write-Error "Test failover failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-commit-undo-failover',
    name: 'Commit or Undo Failover',
    category: 'Replication Jobs',
    description: 'Commit failover permanently or undo to restore original state',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Replica Name', type: 'text', required: true, placeholder: 'VM-DR-Replica' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Commit', 'Undo'], defaultValue: 'Commit' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const action = params.action;
      
      return `# ${action} Replica Failover
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "${action === 'Commit' ? 'Committing' : 'Undoing'} failover for: ${vmName}..." -ForegroundColor Cyan
    
    # Get the replica
    $Replica = Get-VBRReplica -Name "${vmName}"
    
    if (-not $Replica) {
        throw "Replica '${vmName}' not found"
    }
    
    # Check if replica is in failover state
    if ($Replica.State -ne "Failover") {
        throw "Replica is not in failover state. Current state: $($Replica.State)"
    }
    
${action === 'Commit' ? `    # Commit the failover (makes it permanent)
    Invoke-VBRViReplicaFailoverCommit -Replica $Replica
    
    Write-Host "✓ Failover committed successfully!" -ForegroundColor Green
    Write-Host "  The replica is now the production VM" -ForegroundColor Cyan
    Write-Host "  Original VM has been removed" -ForegroundColor Yellow` :
`    # Undo the failover (restore original state)
    Stop-VBRViReplicaFailover -Replica $Replica
    
    Write-Host "✓ Failover undone successfully!" -ForegroundColor Green
    Write-Host "  Replica restored to standby mode" -ForegroundColor Cyan
    Write-Host "  Original VM is now active" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "${action} failover failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // BACKUP JOB MANAGEMENT
  // ============================================
  {
    id: 'veeam-modify-job-schedule',
    name: 'Modify Backup Job Schedule',
    category: 'Backup Jobs',
    description: 'Change the schedule for an existing backup job',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'scheduleType', label: 'Schedule Type', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly', 'Periodically'], defaultValue: 'Daily' },
      { id: 'runTime', label: 'Run Time (HH:MM)', type: 'text', required: true, placeholder: '22:00', defaultValue: '22:00' },
      { id: 'daysOfWeek', label: 'Days (for Weekly)', type: 'text', required: false, placeholder: 'Monday,Wednesday,Friday' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const scheduleType = params.scheduleType;
      const runTime = escapePowerShellString(params.runTime);
      const daysOfWeek = params.daysOfWeek ? (params.daysOfWeek as string).split(',').map((d: string) => d.trim()) : [];
      
      return `# Modify Backup Job Schedule
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    
    if (-not $Job) {
        throw "Job '${jobName}' not found"
    }
    
    Write-Host "Modifying schedule for job: ${jobName}..." -ForegroundColor Cyan
    
    # Parse run time
    $RunTime = [DateTime]::ParseExact("${runTime}", "HH:mm", $null)
    
${scheduleType === 'Daily' ? `    # Set daily schedule
    Set-VBRJobSchedule -Job $Job -Daily -At $RunTime
    Write-Host "  Schedule: Daily at ${runTime}" -ForegroundColor Cyan` :
scheduleType === 'Weekly' ? `    # Set weekly schedule
    $Days = @(${daysOfWeek.map(d => `[DayOfWeek]::${d}`).join(', ')})
    Set-VBRJobSchedule -Job $Job -Weekly -At $RunTime -DaysOfWeek $Days
    Write-Host "  Schedule: Weekly on ${params.daysOfWeek} at ${runTime}" -ForegroundColor Cyan` :
scheduleType === 'Monthly' ? `    # Set monthly schedule
    Set-VBRJobSchedule -Job $Job -Monthly -At $RunTime -DaysOfMonth 1
    Write-Host "  Schedule: Monthly on 1st at ${runTime}" -ForegroundColor Cyan` :
`    # Set periodic schedule (every 4 hours)
    Set-VBRJobSchedule -Job $Job -Periodicaly -FullPeriod 4 -PeriodicallyKind Hours
    Write-Host "  Schedule: Every 4 hours" -ForegroundColor Cyan`}
    
    # Enable the schedule
    Enable-VBRJobSchedule -Job $Job
    
    Write-Host "✓ Job schedule updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to modify schedule: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-set-job-retention',
    name: 'Set Backup Job Retention Policy',
    category: 'Backup Jobs',
    description: 'Configure retention settings for backup jobs',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'retentionType', label: 'Retention Type', type: 'select', required: true, options: ['RestorePoints', 'Days'], defaultValue: 'RestorePoints' },
      { id: 'retentionValue', label: 'Retention Value', type: 'number', required: true, defaultValue: 14 },
      { id: 'deleteOldBackups', label: 'Delete Old Backups Immediately', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const retentionType = params.retentionType;
      const deleteOld = toPowerShellBoolean(params.deleteOldBackups);
      
      return `# Set Backup Job Retention Policy
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    
    if (-not $Job) {
        throw "Job '${jobName}' not found"
    }
    
    Write-Host "Configuring retention for job: ${jobName}..." -ForegroundColor Cyan
    
    # Get current job options
    $Options = $Job.GetOptions()
    
${retentionType === 'RestorePoints' ? `    # Set retention by restore points
    $Options.BackupStorageOptions.RetentionType = "Simple"
    $Options.BackupStorageOptions.RetainCycles = ${params.retentionValue}
    Write-Host "  Retention: ${params.retentionValue} restore points" -ForegroundColor Cyan` :
`    # Set retention by days
    $Options.BackupStorageOptions.RetentionType = "Days"
    $Options.BackupStorageOptions.RetainDays = ${params.retentionValue}
    Write-Host "  Retention: ${params.retentionValue} days" -ForegroundColor Cyan`}
    
    # Apply options
    $Job.SetOptions($Options)
    
    # Optionally delete old backups
    if (${deleteOld}) {
        Write-Host "  Removing backups exceeding retention..." -ForegroundColor Yellow
        Remove-VBRBackup -Backup (Get-VBRBackup -Name "${jobName}") -FromDisk
    }
    
    Write-Host "✓ Retention policy updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to set retention: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-add-vm-to-job',
    name: 'Add VMs to Existing Backup Job',
    category: 'Backup Jobs',
    description: 'Add virtual machines to an existing backup job',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true, placeholder: 'NewVM1, NewVM2' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      
      return `# Add VMs to Existing Backup Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    
    if (-not $Job) {
        throw "Job '${jobName}' not found"
    }
    
    Write-Host "Adding VMs to job: ${jobName}..." -ForegroundColor Cyan
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $AddedCount = 0
    
    foreach ($VMName in $VMNames) {
        $VM = Find-VBRViEntity -Name $VMName
        
        if ($VM) {
            Add-VBRViJobObject -Job $Job -Entity $VM
            Write-Host "  ✓ Added: $VMName" -ForegroundColor Green
            $AddedCount++
        } else {
            Write-Host "  ⚠ VM not found: $VMName" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "✓ Operation completed!" -ForegroundColor Green
    Write-Host "  VMs added: $AddedCount" -ForegroundColor Cyan
    Write-Host "  Job: ${jobName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add VMs: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-remove-vm-from-job',
    name: 'Remove VMs from Backup Job',
    category: 'Backup Jobs',
    description: 'Remove virtual machines from an existing backup job',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true, placeholder: 'OldVM1, OldVM2' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      
      return `# Remove VMs from Backup Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Job = Get-VBRJob -Name "${jobName}"
    
    if (-not $Job) {
        throw "Job '${jobName}' not found"
    }
    
    Write-Host "Removing VMs from job: ${jobName}..." -ForegroundColor Cyan
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $RemovedCount = 0
    
    # Get job objects
    $JobObjects = Get-VBRJobObject -Job $Job
    
    foreach ($VMName in $VMNames) {
        $JobObject = $JobObjects | Where-Object { $_.Name -eq $VMName }
        
        if ($JobObject) {
            Remove-VBRJobObject -Objects $JobObject
            Write-Host "  ✓ Removed: $VMName" -ForegroundColor Green
            $RemovedCount++
        } else {
            Write-Host "  ⚠ VM not in job: $VMName" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "✓ Operation completed!" -ForegroundColor Green
    Write-Host "  VMs removed: $RemovedCount" -ForegroundColor Cyan
    Write-Host "  Job: ${jobName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to remove VMs: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-clone-backup-job',
    name: 'Clone Backup Job',
    category: 'Backup Jobs',
    description: 'Create a copy of an existing backup job with new settings',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'sourceJobName', label: 'Source Job Name', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'newJobName', label: 'New Job Name', type: 'text', required: true, placeholder: 'Production-Backup-Clone' },
      { id: 'newRepository', label: 'New Repository (optional)', type: 'text', required: false, placeholder: 'Secondary-Repository' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const sourceJobName = escapePowerShellString(params.sourceJobName);
      const newJobName = escapePowerShellString(params.newJobName);
      const newRepository = params.newRepository ? escapePowerShellString(params.newRepository) : '';
      
      return `# Clone Backup Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $SourceJob = Get-VBRJob -Name "${sourceJobName}"
    
    if (-not $SourceJob) {
        throw "Source job '${sourceJobName}' not found"
    }
    
    Write-Host "Cloning job '${sourceJobName}' to '${newJobName}'..." -ForegroundColor Cyan
    
    # Clone the job
    $NewJob = Copy-VBRJob -Job $SourceJob -Name "${newJobName}"
    
${newRepository ? `    # Change repository if specified
    $NewRepo = Get-VBRBackupRepository -Name "${newRepository}"
    if ($NewRepo) {
        Set-VBRJobAdvancedStorageOptions -Job $NewJob -BackupRepository $NewRepo
        Write-Host "  Repository changed to: ${newRepository}" -ForegroundColor Cyan
    }
` : ''}
    # Disable the cloned job by default
    Disable-VBRJob -Job $NewJob
    
    Write-Host "✓ Job cloned successfully!" -ForegroundColor Green
    Write-Host "  Source Job: ${sourceJobName}" -ForegroundColor Cyan
    Write-Host "  New Job: ${newJobName}" -ForegroundColor Cyan
    Write-Host "  Status: Disabled (enable when ready)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to clone job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // RESTORE OPERATIONS
  // ============================================
  {
    id: 'veeam-instant-vm-recovery',
    name: 'Instant VM Recovery',
    category: 'Restore Operations',
    description: 'Start VM instantly from backup without full restore',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'CriticalServer' },
      { id: 'targetHost', label: 'Target ESXi Host', type: 'text', required: true, placeholder: 'esxi01.company.com' },
      { id: 'restoredVMName', label: 'Restored VM Name', type: 'text', required: false, placeholder: 'CriticalServer_Restored' },
      { id: 'powerOn', label: 'Power On Immediately', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const targetHost = escapePowerShellString(params.targetHost);
      const restoredVMName = params.restoredVMName ? escapePowerShellString(params.restoredVMName) : vmName + '_Restored';
      const powerOn = toPowerShellBoolean(params.powerOn);
      
      return `# Instant VM Recovery
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Starting Instant VM Recovery for: ${vmName}..." -ForegroundColor Cyan
    
    # Get latest restore point
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if (-not $RestorePoint) {
        throw "No restore point found for VM '${vmName}'"
    }
    
    # Get target host
    $TargetHost = Get-VBRServer -Name "${targetHost}"
    
    if (-not $TargetHost) {
        throw "Target host '${targetHost}' not found"
    }
    
    # Start Instant VM Recovery
    $Session = Start-VBRInstantRecovery \`
        -RestorePoint $RestorePoint \`
        -Server $TargetHost \`
        -VMName "${restoredVMName}" \`
        -PowerOn:${powerOn}
    
    Write-Host "✓ Instant VM Recovery started successfully!" -ForegroundColor Green
    Write-Host "  Original VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Restored VM: ${restoredVMName}" -ForegroundColor Cyan
    Write-Host "  Target Host: ${targetHost}" -ForegroundColor Cyan
    Write-Host "  Restore Point: $($RestorePoint.CreationTime)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: VM is running from backup. Migrate to production storage when ready:" -ForegroundColor Yellow
    Write-Host "  Stop-VBRInstantRecovery -Session \$Session -Migrate" -ForegroundColor Yellow
    
} catch {
    Write-Error "Instant VM Recovery failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-restore-vm-disk',
    name: 'Restore VM Disk',
    category: 'Restore Operations',
    description: 'Restore individual VM disk to original or new location',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'Server01' },
      { id: 'diskName', label: 'Disk Name', type: 'text', required: true, placeholder: 'Hard disk 1' },
      { id: 'targetDatastore', label: 'Target Datastore', type: 'text', required: true, placeholder: 'Datastore1' },
      { id: 'targetFolder', label: 'Target Folder Path', type: 'text', required: false, placeholder: '[Datastore1] RestoredDisks/' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const diskName = escapePowerShellString(params.diskName);
      const targetDatastore = escapePowerShellString(params.targetDatastore);
      const targetFolder = params.targetFolder ? escapePowerShellString(params.targetFolder) : '';
      
      return `# Restore VM Disk
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Restoring disk from VM: ${vmName}..." -ForegroundColor Cyan
    
    # Get latest restore point
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if (-not $RestorePoint) {
        throw "No restore point found for VM '${vmName}'"
    }
    
    # Get disk from restore point
    $Disks = Get-VBRViRestorePointDisk -RestorePoint $RestorePoint
    $TargetDisk = $Disks | Where-Object { $_.Name -like "*${diskName}*" } | Select-Object -First 1
    
    if (-not $TargetDisk) {
        Write-Host "Available disks:" -ForegroundColor Yellow
        $Disks | ForEach-Object { Write-Host "  - $($_.Name)" }
        throw "Disk '${diskName}' not found"
    }
    
    # Get target datastore
    $Datastore = Find-VBRViDatastore -Name "${targetDatastore}"
    
    # Restore the disk
    Restore-VBRViVMDisk \`
        -RestorePoint $RestorePoint \`
        -Disk $TargetDisk \`
        -Datastore $Datastore${targetFolder ? ` \`
        -Folder "${targetFolder}"` : ''}
    
    Write-Host "✓ Disk restored successfully!" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Disk: $($TargetDisk.Name)" -ForegroundColor Cyan
    Write-Host "  Target Datastore: ${targetDatastore}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Disk restore failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-restore-to-azure',
    name: 'Restore VM to Azure',
    category: 'Restore Operations',
    description: 'Restore VM directly to Microsoft Azure',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'Server01' },
      { id: 'azureSubscription', label: 'Azure Subscription', type: 'text', required: true, placeholder: 'Production-Subscription' },
      { id: 'resourceGroup', label: 'Resource Group', type: 'text', required: true, placeholder: 'rg-dr-recovery' },
      { id: 'vmSize', label: 'Azure VM Size', type: 'text', required: true, placeholder: 'Standard_D2s_v3', defaultValue: 'Standard_D2s_v3' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vmName = escapePowerShellString(params.vmName);
      const azureSubscription = escapePowerShellString(params.azureSubscription);
      const resourceGroup = escapePowerShellString(params.resourceGroup);
      const vmSize = escapePowerShellString(params.vmSize);
      
      return `# Restore VM to Azure
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Restoring VM to Azure: ${vmName}..." -ForegroundColor Cyan
    
    # Get latest restore point
    $RestorePoint = Get-VBRBackup | Get-VBRRestorePoint -Name "${vmName}" | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if (-not $RestorePoint) {
        throw "No restore point found for VM '${vmName}'"
    }
    
    # Get Azure account
    $AzureAccount = Get-VBRAzureAccount | Select-Object -First 1
    
    if (-not $AzureAccount) {
        throw "No Azure account configured in Veeam"
    }
    
    # Get subscription
    $Subscription = Get-VBRAzureSubscription -Account $AzureAccount | Where-Object { $_.Name -eq "${azureSubscription}" }
    
    # Get resource group
    $RG = Get-VBRAzureResourceGroup -Subscription $Subscription | Where-Object { $_.Name -eq "${resourceGroup}" }
    
    # Get storage account and network
    $StorageAccount = Get-VBRAzureStorageAccount -Subscription $Subscription | Select-Object -First 1
    $VNet = Get-VBRAzureVirtualNetwork -Subscription $Subscription | Select-Object -First 1
    $Subnet = Get-VBRAzureVirtualNetworkSubnet -Network $VNet | Select-Object -First 1
    
    # Start restore to Azure
    Start-VBRRestoreToAzure \`
        -RestorePoint $RestorePoint \`
        -Subscription $Subscription \`
        -ResourceGroup $RG \`
        -StorageAccount $StorageAccount \`
        -VirtualNetwork $VNet \`
        -Subnet $Subnet \`
        -VMSize "${vmSize}" \`
        -VMName "${vmName}-Azure"
    
    Write-Host "✓ Azure restore initiated!" -ForegroundColor Green
    Write-Host "  Source VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Azure Subscription: ${azureSubscription}" -ForegroundColor Cyan
    Write-Host "  Resource Group: ${resourceGroup}" -ForegroundColor Cyan
    Write-Host "  VM Size: ${vmSize}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Azure restore failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // REPOSITORY MANAGEMENT
  // ============================================
  {
    id: 'veeam-repository-maintenance',
    name: 'Run Repository Maintenance',
    category: 'Repository Management',
    description: 'Perform maintenance tasks on backup repository',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'repositoryName', label: 'Repository Name', type: 'text', required: true, placeholder: 'Default Backup Repository' },
      { id: 'maintenanceType', label: 'Maintenance Type', type: 'select', required: true, options: ['HealthCheck', 'Compact', 'RemoveDeleted'], defaultValue: 'HealthCheck' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const repositoryName = escapePowerShellString(params.repositoryName);
      const maintenanceType = params.maintenanceType;
      
      return `# Run Repository Maintenance
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Repository = Get-VBRBackupRepository -Name "${repositoryName}"
    
    if (-not $Repository) {
        throw "Repository '${repositoryName}' not found"
    }
    
    Write-Host "Starting ${maintenanceType} maintenance on: ${repositoryName}..." -ForegroundColor Cyan
    
${maintenanceType === 'HealthCheck' ? `    # Run health check on all backups in repository
    $Backups = Get-VBRBackup | Where-Object { $_.RepositoryId -eq $Repository.Id }
    
    foreach ($Backup in $Backups) {
        Write-Host "  Checking: $($Backup.Name)..." -ForegroundColor Cyan
        Start-VBRBackupFilesHealthCheck -Backup $Backup
    }
    
    Write-Host "✓ Health check completed!" -ForegroundColor Green` :
maintenanceType === 'Compact' ? `    # Compact backup files in repository
    $Backups = Get-VBRBackup | Where-Object { $_.RepositoryId -eq $Repository.Id }
    
    foreach ($Backup in $Backups) {
        Write-Host "  Compacting: $($Backup.Name)..." -ForegroundColor Cyan
        Start-VBRBackupCompact -Backup $Backup
    }
    
    Write-Host "✓ Compaction completed!" -ForegroundColor Green` :
`    # Remove deleted VM backups
    $Backups = Get-VBRBackup | Where-Object { $_.RepositoryId -eq $Repository.Id }
    
    foreach ($Backup in $Backups) {
        $DeletedVMs = Get-VBRRestorePoint -Backup $Backup | Where-Object { $_.IsCorrupted -or $_.IsDeleted }
        
        if ($DeletedVMs) {
            Write-Host "  Removing deleted from: $($Backup.Name)..." -ForegroundColor Cyan
            Remove-VBRRestorePoint -Oib $DeletedVMs -Confirm:$false
        }
    }
    
    Write-Host "✓ Deleted VMs removed!" -ForegroundColor Green`}
    
} catch {
    Write-Error "Maintenance failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-repository-capacity-report',
    name: 'Generate Repository Capacity Report',
    category: 'Repository Management',
    description: 'Export detailed capacity and usage report for all repositories',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Repo-Capacity.csv' },
      { id: 'warningThreshold', label: 'Warning Threshold (%)', type: 'number', required: true, defaultValue: 80 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate Repository Capacity Report
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Generating repository capacity report..." -ForegroundColor Cyan
    
    $Repositories = Get-VBRBackupRepository
    
    $Report = $Repositories | ForEach-Object {
        $Repo = $_
        $TotalGB = [math]::Round($Repo.Info.CachedTotalSpace/1GB, 2)
        $FreeGB = [math]::Round($Repo.Info.CachedFreeSpace/1GB, 2)
        $UsedGB = $TotalGB - $FreeGB
        $UsedPercent = if ($TotalGB -gt 0) { [math]::Round(($UsedGB / $TotalGB) * 100, 2) } else { 0 }
        
        # Count backups in repository
        $BackupCount = (Get-VBRBackup | Where-Object { $_.RepositoryId -eq $Repo.Id }).Count
        
        [PSCustomObject]@{
            RepositoryName = $Repo.Name
            Type = $Repo.Type
            Path = $Repo.Path
            TotalCapacity_GB = $TotalGB
            UsedSpace_GB = $UsedGB
            FreeSpace_GB = $FreeGB
            UsedPercent = $UsedPercent
            BackupCount = $BackupCount
            Status = if ($UsedPercent -ge ${params.warningThreshold}) { "Warning" } else { "OK" }
            DeduplicationEnabled = $Repo.DeduplicationEnabled
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository Summary:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    
    $Report | ForEach-Object {
        $Color = if ($_.Status -eq "Warning") { "Yellow" } else { "Green" }
        Write-Host ""
        Write-Host "  $($_.RepositoryName)" -ForegroundColor $Color
        Write-Host "    Capacity: $($_.TotalCapacity_GB) GB"
        Write-Host "    Used: $($_.UsedSpace_GB) GB ($($_.UsedPercent)%)"
        Write-Host "    Free: $($_.FreeSpace_GB) GB"
        Write-Host "    Backups: $($_.BackupCount)"
    }
    
    $WarningRepos = ($Report | Where-Object { $_.Status -eq "Warning" }).Count
    if ($WarningRepos -gt 0) {
        Write-Host ""
        Write-Host "⚠ $WarningRepos repository(s) above ${params.warningThreshold}% threshold!" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Report generation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-add-sobr-extent',
    name: 'Add Extent to Scale-Out Repository',
    category: 'Repository Management',
    description: 'Add a new extent to an existing scale-out backup repository',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'sobrName', label: 'Scale-Out Repository Name', type: 'text', required: true, placeholder: 'SOBR-Primary' },
      { id: 'extentName', label: 'New Extent Name', type: 'text', required: true, placeholder: 'Extent-03' },
      { id: 'extentPath', label: 'Extent Path', type: 'path', required: true, placeholder: 'E:\\VeeamBackups' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const sobrName = escapePowerShellString(params.sobrName);
      const extentName = escapePowerShellString(params.extentName);
      const extentPath = escapePowerShellString(params.extentPath);
      
      return `# Add Extent to Scale-Out Repository
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Adding extent to SOBR: ${sobrName}..." -ForegroundColor Cyan
    
    # Get Scale-Out Repository
    $SOBR = Get-VBRBackupRepository -ScaleOut | Where-Object { $_.Name -eq "${sobrName}" }
    
    if (-not $SOBR) {
        throw "Scale-Out Repository '${sobrName}' not found"
    }
    
    # Create new extent repository
    Write-Host "  Creating extent repository: ${extentName}..." -ForegroundColor Cyan
    $NewExtent = Add-VBRBackupRepository \`
        -Name "${extentName}" \`
        -Folder "${extentPath}" \`
        -Type WinLocal
    
    # Add extent to SOBR
    Write-Host "  Adding to Scale-Out Repository..." -ForegroundColor Cyan
    Add-VBRScaleOutBackupRepositoryExtent \`
        -Repository $SOBR \`
        -Extent $NewExtent
    
    Write-Host "✓ Extent added successfully!" -ForegroundColor Green
    Write-Host "  SOBR: ${sobrName}" -ForegroundColor Cyan
    Write-Host "  New Extent: ${extentName}" -ForegroundColor Cyan
    Write-Host "  Path: ${extentPath}" -ForegroundColor Cyan
    
    # Show updated SOBR info
    $UpdatedSOBR = Get-VBRBackupRepository -ScaleOut | Where-Object { $_.Name -eq "${sobrName}" }
    $ExtentCount = ($UpdatedSOBR | Get-VBRRepositoryExtent).Count
    Write-Host "  Total Extents: $ExtentCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add extent: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // TAPE MANAGEMENT
  // ============================================
  {
    id: 'veeam-create-tape-job',
    name: 'Create Tape Backup Job',
    category: 'Tape Management',
    description: 'Create a new backup to tape job',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'jobName', label: 'Tape Job Name', type: 'text', required: true, placeholder: 'Weekly-Tape-Backup' },
      { id: 'sourceBackupJob', label: 'Source Backup Job', type: 'text', required: true, placeholder: 'Production-Backup' },
      { id: 'mediaPool', label: 'Media Pool', type: 'text', required: true, placeholder: 'Weekly-Pool' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const jobName = escapePowerShellString(params.jobName);
      const sourceBackupJob = escapePowerShellString(params.sourceBackupJob);
      const mediaPool = escapePowerShellString(params.mediaPool);
      
      return `# Create Tape Backup Job
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Creating tape backup job: ${jobName}..." -ForegroundColor Cyan
    
    # Get source backup
    $SourceBackup = Get-VBRBackup -Name "${sourceBackupJob}"
    
    if (-not $SourceBackup) {
        throw "Source backup '${sourceBackupJob}' not found"
    }
    
    # Get media pool
    $Pool = Get-VBRTapeMediaPool -Name "${mediaPool}"
    
    if (-not $Pool) {
        throw "Media pool '${mediaPool}' not found"
    }
    
    # Create tape job
    Add-VBRTapeBackupJob \`
        -Name "${jobName}" \`
        -Backup $SourceBackup \`
        -MediaPool $Pool \`
        -ProcessIncrementalBackup \`
        -EjectMedium
    
    Write-Host "✓ Tape backup job created successfully!" -ForegroundColor Green
    Write-Host "  Job Name: ${jobName}" -ForegroundColor Cyan
    Write-Host "  Source: ${sourceBackupJob}" -ForegroundColor Cyan
    Write-Host "  Media Pool: ${mediaPool}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create tape job: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-create-media-pool',
    name: 'Create Tape Media Pool',
    category: 'Tape Management',
    description: 'Create a new tape media pool with retention settings',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'poolName', label: 'Pool Name', type: 'text', required: true, placeholder: 'Monthly-Archive-Pool' },
      { id: 'retentionDays', label: 'Retention (Days)', type: 'number', required: true, defaultValue: 365 },
      { id: 'vaultName', label: 'Vault Name (optional)', type: 'text', required: false, placeholder: 'Offsite-Vault' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const poolName = escapePowerShellString(params.poolName);
      const vaultName = params.vaultName ? escapePowerShellString(params.vaultName) : '';
      
      return `# Create Tape Media Pool
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Creating tape media pool: ${poolName}..." -ForegroundColor Cyan
    
    # Create media pool
    $Pool = Add-VBRTapeMediaPool \`
        -Name "${poolName}" \`
        -RetentionDays ${params.retentionDays} \`
        -MoveFromFreePool \`
        -MoveOfflineToVault
    
${vaultName ? `    # Assign vault if specified
    $Vault = Get-VBRTapeVault -Name "${vaultName}"
    if ($Vault) {
        Set-VBRTapeMediaPool -Pool $Pool -Vault $Vault
        Write-Host "  Vault assigned: ${vaultName}" -ForegroundColor Cyan
    }
` : ''}
    Write-Host "✓ Media pool created successfully!" -ForegroundColor Green
    Write-Host "  Pool Name: ${poolName}" -ForegroundColor Cyan
    Write-Host "  Retention: ${params.retentionDays} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create media pool: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-tape-inventory',
    name: 'Run Tape Library Inventory',
    category: 'Tape Management',
    description: 'Inventory tape library and report on media status',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'libraryName', label: 'Tape Library Name', type: 'text', required: true, placeholder: 'TapeLibrary01' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\Tape-Inventory.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const libraryName = escapePowerShellString(params.libraryName);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Run Tape Library Inventory
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Running tape library inventory: ${libraryName}..." -ForegroundColor Cyan
    
    # Get tape library
    $Library = Get-VBRTapeLibrary -Name "${libraryName}"
    
    if (-not $Library) {
        throw "Tape library '${libraryName}' not found"
    }
    
    # Run inventory
    Start-VBRTapeInventory -Library $Library
    
    # Get all tapes
    $Tapes = Get-VBRTapeMedium -Library $Library
    
    $Report = $Tapes | ForEach-Object {
        [PSCustomObject]@{
            Barcode = $_.Barcode
            Name = $_.Name
            MediaPool = $_.MediaPool
            Location = $_.Location
            State = $_.State
            CapacityGB = [math]::Round($_.Capacity/1GB, 2)
            FreeSpaceGB = [math]::Round($_.Free/1GB, 2)
            WriteProtected = $_.IsWriteProtected
            ExpirationDate = $_.ExpirationDate
            LastWriteTime = $_.LastWriteTime
        }
    }
    
${exportPath ? `    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green
` : ''}
    Write-Host ""
    Write-Host "Tape Inventory Summary:" -ForegroundColor Cyan
    Write-Host "=======================" -ForegroundColor Cyan
    Write-Host "  Total Tapes: $($Tapes.Count)"
    Write-Host "  Free Pool: $(($Tapes | Where-Object { $_.MediaPool -eq 'Free' }).Count)"
    Write-Host "  Online: $(($Tapes | Where-Object { $_.Location -ne 'Vault' }).Count)"
    Write-Host "  In Vault: $(($Tapes | Where-Object { $_.Location -eq 'Vault' }).Count)"
    Write-Host ""
    
    $Report | Format-Table Barcode, MediaPool, State, CapacityGB, FreeSpaceGB -AutoSize
    
} catch {
    Write-Error "Tape inventory failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-export-tape-to-vault',
    name: 'Export Tapes to Vault',
    category: 'Tape Management',
    description: 'Mark tapes for export to offsite vault',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'mediaPool', label: 'Media Pool', type: 'text', required: true, placeholder: 'Monthly-Archive-Pool' },
      { id: 'vaultName', label: 'Vault Name', type: 'text', required: true, placeholder: 'Iron-Mountain' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const mediaPool = escapePowerShellString(params.mediaPool);
      const vaultName = escapePowerShellString(params.vaultName);
      
      return `# Export Tapes to Vault
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Exporting tapes to vault: ${vaultName}..." -ForegroundColor Cyan
    
    # Get media pool
    $Pool = Get-VBRTapeMediaPool -Name "${mediaPool}"
    
    if (-not $Pool) {
        throw "Media pool '${mediaPool}' not found"
    }
    
    # Get vault
    $Vault = Get-VBRTapeVault -Name "${vaultName}"
    
    if (-not $Vault) {
        throw "Vault '${vaultName}' not found"
    }
    
    # Get tapes ready for export (full and not in vault)
    $TapesToExport = Get-VBRTapeMedium -MediaPool $Pool | Where-Object { 
        $_.State -eq "Full" -and $_.Location -ne "Vault" 
    }
    
    if ($TapesToExport.Count -eq 0) {
        Write-Host "No tapes ready for export in pool '${mediaPool}'" -ForegroundColor Yellow
        return
    }
    
    foreach ($Tape in $TapesToExport) {
        Move-VBRTapeMedium -Medium $Tape -Vault $Vault
        Write-Host "  ✓ Exported: $($Tape.Barcode)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✓ Export completed!" -ForegroundColor Green
    Write-Host "  Tapes Exported: $($TapesToExport.Count)" -ForegroundColor Cyan
    Write-Host "  Destination Vault: ${vaultName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Tape export failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // MONITORING
  // ============================================
  {
    id: 'veeam-check-license',
    name: 'Check Veeam License Status',
    category: 'Monitoring',
    description: 'View license details, usage, and expiration',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      
      return `# Check Veeam License Status
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Veeam License Information" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    $License = Get-VBRInstalledLicense
    
    Write-Host ""
    Write-Host "License Details:" -ForegroundColor Yellow
    Write-Host "  Edition: $($License.Edition)"
    Write-Host "  Type: $($License.Type)"
    Write-Host "  Status: $($License.Status)"
    Write-Host "  Licensed To: $($License.LicensedTo)"
    Write-Host ""
    
    # Expiration
    $ExpirationDate = $License.ExpirationDate
    $DaysToExpire = ($ExpirationDate - (Get-Date)).Days
    
    if ($DaysToExpire -lt 30) {
        Write-Host "  Expiration: $ExpirationDate ($DaysToExpire days)" -ForegroundColor Red
    } elseif ($DaysToExpire -lt 90) {
        Write-Host "  Expiration: $ExpirationDate ($DaysToExpire days)" -ForegroundColor Yellow
    } else {
        Write-Host "  Expiration: $ExpirationDate ($DaysToExpire days)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  Instances Used: $($License.InstancesUsed)"
    Write-Host "  Instances Licensed: $($License.InstanceLicenseSummary.LicensedInstancesNumber)"
    Write-Host "  Sockets Used: $($License.SocketsUsed)"
    Write-Host "  Sockets Licensed: $($License.SocketLicenseSummary.LicensedSocketsNumber)"
    
    # Check for issues
    if ($License.Status -ne "Valid") {
        Write-Host ""
        Write-Host "⚠ License issue detected: $($License.Status)" -ForegroundColor Red
    }
    
    if ($DaysToExpire -lt 30) {
        Write-Host ""
        Write-Host "⚠ License expires soon! Contact Veeam for renewal." -ForegroundColor Red
    }
    
} catch {
    Write-Error "License check failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-sla-compliance-check',
    name: 'Check SLA Compliance',
    category: 'Monitoring',
    description: 'Verify backup jobs meet SLA requirements',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'rpoHours', label: 'RPO Target (Hours)', type: 'number', required: true, defaultValue: 24 },
      { id: 'successRateTarget', label: 'Success Rate Target (%)', type: 'number', required: true, defaultValue: 95 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      
      return `# Check SLA Compliance
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "SLA Compliance Check" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host "  RPO Target: ${params.rpoHours} hours" -ForegroundColor Cyan
    Write-Host "  Success Rate Target: ${params.successRateTarget}%" -ForegroundColor Cyan
    Write-Host ""
    
    $RPOTarget = ${params.rpoHours}
    $SuccessRateTarget = ${params.successRateTarget}
    $Now = Get-Date
    
    $Jobs = Get-VBRJob | Where-Object { $_.IsScheduleEnabled }
    $SLAResults = @()
    
    foreach ($Job in $Jobs) {
        $Sessions = Get-VBRBackupSession -Job $Job | Where-Object { $_.EndTime -gt $Now.AddDays(-7) }
        
        # Calculate success rate
        $TotalSessions = $Sessions.Count
        $SuccessSessions = ($Sessions | Where-Object { $_.Result -eq "Success" }).Count
        $SuccessRate = if ($TotalSessions -gt 0) { [math]::Round(($SuccessSessions / $TotalSessions) * 100, 2) } else { 0 }
        
        # Calculate RPO
        $LastSuccessfulSession = $Sessions | Where-Object { $_.Result -eq "Success" } | Sort-Object EndTime -Descending | Select-Object -First 1
        $HoursSinceLastBackup = if ($LastSuccessfulSession) { [math]::Round(($Now - $LastSuccessfulSession.EndTime).TotalHours, 2) } else { 999 }
        
        # Determine compliance
        $RPOCompliant = $HoursSinceLastBackup -le $RPOTarget
        $SuccessRateCompliant = $SuccessRate -ge $SuccessRateTarget
        $OverallCompliant = $RPOCompliant -and $SuccessRateCompliant
        
        $SLAResults += [PSCustomObject]@{
            JobName = $Job.Name
            SuccessRate = $SuccessRate
            HoursSinceBackup = $HoursSinceLastBackup
            RPOCompliant = $RPOCompliant
            SuccessRateCompliant = $SuccessRateCompliant
            SLAStatus = if ($OverallCompliant) { "COMPLIANT" } else { "VIOLATION" }
        }
    }
    
    # Display results
    $Compliant = ($SLAResults | Where-Object { $_.SLAStatus -eq "COMPLIANT" }).Count
    $Violations = ($SLAResults | Where-Object { $_.SLAStatus -eq "VIOLATION" }).Count
    
    Write-Host "Results:" -ForegroundColor Yellow
    Write-Host "========" -ForegroundColor Yellow
    
    foreach ($Result in $SLAResults) {
        $Color = if ($Result.SLAStatus -eq "COMPLIANT") { "Green" } else { "Red" }
        Write-Host ""
        Write-Host "  $($Result.JobName): $($Result.SLAStatus)" -ForegroundColor $Color
        Write-Host "    Success Rate: $($Result.SuccessRate)% (Target: $SuccessRateTarget%)"
        Write-Host "    Hours Since Backup: $($Result.HoursSinceBackup) (RPO: $RPOTarget hours)"
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Total Jobs: $($SLAResults.Count)"
    Write-Host "  Compliant: $Compliant" -ForegroundColor Green
    Write-Host "  Violations: $Violations" -ForegroundColor $(if ($Violations -gt 0) { 'Red' } else { 'Green' })
    
} catch {
    Write-Error "SLA check failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-capacity-forecast',
    name: 'Generate Capacity Forecast',
    category: 'Monitoring',
    description: 'Forecast repository capacity based on growth trends',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'forecastDays', label: 'Forecast Days', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\Capacity-Forecast.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Generate Capacity Forecast
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Generating ${params.forecastDays}-day capacity forecast..." -ForegroundColor Cyan
    
    $Repositories = Get-VBRBackupRepository
    $ForecastDays = ${params.forecastDays}
    
    $Forecast = $Repositories | ForEach-Object {
        $Repo = $_
        $TotalGB = [math]::Round($Repo.Info.CachedTotalSpace/1GB, 2)
        $FreeGB = [math]::Round($Repo.Info.CachedFreeSpace/1GB, 2)
        $UsedGB = $TotalGB - $FreeGB
        
        # Get backup sessions to calculate growth
        $Backups = Get-VBRBackup | Where-Object { $_.RepositoryId -eq $Repo.Id }
        $Sessions = foreach ($Backup in $Backups) {
            Get-VBRBackupSession -Backup $Backup | Where-Object { $_.EndTime -gt (Get-Date).AddDays(-30) }
        }
        
        # Calculate daily growth rate
        $TotalTransferred = ($Sessions | Measure-Object -Property { $_.BackupStats.BackupSize } -Sum).Sum
        $DaysAnalyzed = 30
        $DailyGrowthGB = [math]::Round(($TotalTransferred / 1GB) / $DaysAnalyzed, 2)
        
        # Forecast
        $ForecastedUsedGB = $UsedGB + ($DailyGrowthGB * $ForecastDays)
        $DaysUntilFull = if ($DailyGrowthGB -gt 0) { [math]::Round($FreeGB / $DailyGrowthGB, 0) } else { 9999 }
        
        [PSCustomObject]@{
            Repository = $Repo.Name
            TotalCapacity_GB = $TotalGB
            CurrentUsed_GB = $UsedGB
            CurrentFree_GB = $FreeGB
            DailyGrowth_GB = $DailyGrowthGB
            Forecasted_${params.forecastDays}Day_Used_GB = [math]::Round($ForecastedUsedGB, 2)
            Forecasted_${params.forecastDays}Day_Free_GB = [math]::Round($TotalGB - $ForecastedUsedGB, 2)
            DaysUntilFull = $DaysUntilFull
            Warning = if ($DaysUntilFull -le $ForecastDays) { "EXPAND SOON" } else { "OK" }
        }
    }
    
${exportPath ? `    $Forecast | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
` : ''}
    Write-Host "Capacity Forecast (${params.forecastDays} days):" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Yellow
    
    foreach ($Repo in $Forecast) {
        $Color = if ($Repo.Warning -eq "EXPAND SOON") { "Red" } else { "Green" }
        Write-Host ""
        Write-Host "  $($Repo.Repository)" -ForegroundColor $Color
        Write-Host "    Current: $($Repo.CurrentUsed_GB) GB / $($Repo.TotalCapacity_GB) GB"
        Write-Host "    Daily Growth: $($Repo.DailyGrowth_GB) GB/day"
        Write-Host "    ${params.forecastDays}-Day Forecast: $($Repo.'Forecasted_${params.forecastDays}Day_Used_GB') GB"
        Write-Host "    Days Until Full: $($Repo.DaysUntilFull)"
        if ($Repo.Warning -eq "EXPAND SOON") {
            Write-Host "    ⚠ WARNING: Repository will fill within forecast period!" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Error "Forecast generation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-infrastructure-health',
    name: 'Check Infrastructure Health',
    category: 'Monitoring',
    description: 'Verify health of Veeam infrastructure components',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      
      return `# Check Infrastructure Health
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Veeam Infrastructure Health Check" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    
    $Issues = @()
    
    # Check Backup Proxies
    Write-Host ""
    Write-Host "Backup Proxies:" -ForegroundColor Yellow
    $Proxies = Get-VBRViProxy
    foreach ($Proxy in $Proxies) {
        $Status = if ($Proxy.IsDisabled) { "Disabled" } else { "OK" }
        $Color = if ($Proxy.IsDisabled) { "Yellow" } else { "Green" }
        Write-Host "  $($Proxy.Name): $Status" -ForegroundColor $Color
        if ($Proxy.IsDisabled) { $Issues += "Proxy disabled: $($Proxy.Name)" }
    }
    
    # Check Repositories
    Write-Host ""
    Write-Host "Backup Repositories:" -ForegroundColor Yellow
    $Repositories = Get-VBRBackupRepository
    foreach ($Repo in $Repositories) {
        $FreePercent = [math]::Round(($Repo.Info.CachedFreeSpace / $Repo.Info.CachedTotalSpace) * 100, 2)
        $Status = if ($FreePercent -lt 10) { "Critical" } elseif ($FreePercent -lt 20) { "Warning" } else { "OK" }
        $Color = if ($Status -eq "Critical") { "Red" } elseif ($Status -eq "Warning") { "Yellow" } else { "Green" }
        Write-Host "  $($Repo.Name): $FreePercent% free - $Status" -ForegroundColor $Color
        if ($Status -ne "OK") { $Issues += "Repository low space: $($Repo.Name) ($FreePercent% free)" }
    }
    
    # Check WAN Accelerators
    Write-Host ""
    Write-Host "WAN Accelerators:" -ForegroundColor Yellow
    $WANAccelerators = Get-VBRWANAccelerator
    if ($WANAccelerators.Count -eq 0) {
        Write-Host "  None configured" -ForegroundColor Gray
    } else {
        foreach ($WAN in $WANAccelerators) {
            Write-Host "  $($WAN.Name): OK" -ForegroundColor Green
        }
    }
    
    # Check Managed Servers
    Write-Host ""
    Write-Host "Managed Servers:" -ForegroundColor Yellow
    $Servers = Get-VBRServer
    foreach ($Server in $Servers) {
        $Status = if ($Server.IsUnavailable) { "Unavailable" } else { "OK" }
        $Color = if ($Server.IsUnavailable) { "Red" } else { "Green" }
        Write-Host "  $($Server.Name) [$($Server.Type)]: $Status" -ForegroundColor $Color
        if ($Server.IsUnavailable) { $Issues += "Server unavailable: $($Server.Name)" }
    }
    
    # Summary
    Write-Host ""
    Write-Host "Health Summary:" -ForegroundColor Yellow
    Write-Host "===============" -ForegroundColor Yellow
    Write-Host "  Proxies: $($Proxies.Count)"
    Write-Host "  Repositories: $($Repositories.Count)"
    Write-Host "  WAN Accelerators: $($WANAccelerators.Count)"
    Write-Host "  Managed Servers: $($Servers.Count)"
    
    if ($Issues.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠ Issues Found:" -ForegroundColor Red
        foreach ($Issue in $Issues) {
            Write-Host "  - $Issue" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "✓ All infrastructure components healthy!" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Health check failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // CONFIGURATION
  // ============================================
  {
    id: 'veeam-configure-proxy',
    name: 'Configure Backup Proxy Settings',
    category: 'Configuration',
    description: 'Adjust backup proxy transport mode and task limits',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'proxyName', label: 'Proxy Name', type: 'text', required: true, placeholder: 'Proxy01' },
      { id: 'maxTasks', label: 'Max Concurrent Tasks', type: 'number', required: true, defaultValue: 4 },
      { id: 'transportMode', label: 'Transport Mode', type: 'select', required: true, options: ['Auto', 'DirectSAN', 'HotAdd', 'NBD'], defaultValue: 'Auto' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const proxyName = escapePowerShellString(params.proxyName);
      const transportMode = params.transportMode;
      
      return `# Configure Backup Proxy Settings
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    $Proxy = Get-VBRViProxy -Name "${proxyName}"
    
    if (-not $Proxy) {
        throw "Proxy '${proxyName}' not found"
    }
    
    Write-Host "Configuring proxy: ${proxyName}..." -ForegroundColor Cyan
    
    # Set transport mode and max tasks
    Set-VBRViProxy -Proxy $Proxy \`
        -MaxTasks ${params.maxTasks} \`
        -TransportMode ${transportMode}
    
    Write-Host "✓ Proxy configured successfully!" -ForegroundColor Green
    Write-Host "  Proxy: ${proxyName}" -ForegroundColor Cyan
    Write-Host "  Max Tasks: ${params.maxTasks}" -ForegroundColor Cyan
    Write-Host "  Transport Mode: ${transportMode}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Proxy configuration failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-add-wan-accelerator',
    name: 'Add WAN Accelerator',
    category: 'Configuration',
    description: 'Configure WAN accelerator for remote backup copies',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'wanServerName', label: 'WAN Accelerator Server', type: 'text', required: true, placeholder: 'wan-accel01.company.com' },
      { id: 'cachePath', label: 'Cache Path', type: 'path', required: true, placeholder: 'D:\\VeeamWANCache' },
      { id: 'cacheSizeGB', label: 'Cache Size (GB)', type: 'number', required: true, defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const wanServerName = escapePowerShellString(params.wanServerName);
      const cachePath = escapePowerShellString(params.cachePath);
      
      return `# Add WAN Accelerator
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Adding WAN Accelerator: ${wanServerName}..." -ForegroundColor Cyan
    
    # Get the server
    $WANServer = Get-VBRServer -Name "${wanServerName}"
    
    if (-not $WANServer) {
        Write-Host "  Adding server to Veeam infrastructure..." -ForegroundColor Cyan
        $WANServer = Add-VBRServer -Name "${wanServerName}" -Type Windows
    }
    
    # Add WAN Accelerator
    Add-VBRWANAccelerator \`
        -Server $WANServer \`
        -CacheFolder "${cachePath}" \`
        -CacheSize ${params.cacheSizeGB}
    
    Write-Host "✓ WAN Accelerator added successfully!" -ForegroundColor Green
    Write-Host "  Server: ${wanServerName}" -ForegroundColor Cyan
    Write-Host "  Cache Path: ${cachePath}" -ForegroundColor Cyan
    Write-Host "  Cache Size: ${params.cacheSizeGB} GB" -ForegroundColor Cyan
    
} catch {
    Write-Error "WAN Accelerator configuration failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-manage-credentials',
    name: 'Manage Stored Credentials',
    category: 'Configuration',
    description: 'Add, update, or list stored credentials',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List', 'Add', 'Update'], defaultValue: 'List' },
      { id: 'credentialName', label: 'Credential Name', type: 'text', required: false, placeholder: 'VMware-Admin' },
      { id: 'username', label: 'Username', type: 'text', required: false, placeholder: 'admin@vsphere.local' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const action = params.action;
      const credentialName = params.credentialName ? escapePowerShellString(params.credentialName) : '';
      const username = params.username ? escapePowerShellString(params.username) : '';
      
      return `# Manage Stored Credentials
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
${action === 'List' ? `    Write-Host "Stored Credentials:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    
    $Credentials = Get-VBRCredentials
    
    if ($Credentials.Count -eq 0) {
        Write-Host "  No credentials stored" -ForegroundColor Yellow
    } else {
        $Credentials | ForEach-Object {
            Write-Host ""
            Write-Host "  Name: $($_.Name)" -ForegroundColor Yellow
            Write-Host "    Username: $($_.UserName)"
            Write-Host "    Description: $($_.Description)"
        }
    }
    
    Write-Host ""
    Write-Host "Total Credentials: $($Credentials.Count)" -ForegroundColor Cyan` :
action === 'Add' ? `    Write-Host "Adding new credential: ${credentialName}..." -ForegroundColor Cyan
    
    # Prompt for password securely
    $SecurePassword = Read-Host -AsSecureString "Enter password for ${username}"
    
    Add-VBRCredentials \`
        -User "${username}" \`
        -Password $SecurePassword \`
        -Description "${credentialName}"
    
    Write-Host "✓ Credential added successfully!" -ForegroundColor Green
    Write-Host "  Name: ${credentialName}" -ForegroundColor Cyan
    Write-Host "  Username: ${username}" -ForegroundColor Cyan` :
`    Write-Host "Updating credential: ${credentialName}..." -ForegroundColor Cyan
    
    $Credential = Get-VBRCredentials | Where-Object { $_.Name -eq "${credentialName}" -or $_.UserName -eq "${credentialName}" }
    
    if (-not $Credential) {
        throw "Credential '${credentialName}' not found"
    }
    
    # Prompt for new password
    $SecurePassword = Read-Host -AsSecureString "Enter new password"
    
    Set-VBRCredentials -Credential $Credential -Password $SecurePassword
    
    Write-Host "✓ Credential updated successfully!" -ForegroundColor Green`}
    
} catch {
    Write-Error "Credential operation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-add-vcenter',
    name: 'Add vCenter Server',
    category: 'Configuration',
    description: 'Add vCenter or ESXi host to Veeam infrastructure',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'vcenterName', label: 'vCenter/ESXi Name', type: 'text', required: true, placeholder: 'vcenter.company.com' },
      { id: 'serverType', label: 'Server Type', type: 'select', required: true, options: ['vCenter', 'ESXi'], defaultValue: 'vCenter' },
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'administrator@vsphere.local' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const vcenterName = escapePowerShellString(params.vcenterName);
      const serverType = params.serverType;
      const username = escapePowerShellString(params.username);
      
      return `# Add vCenter/ESXi Server
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Adding ${serverType} server: ${vcenterName}..." -ForegroundColor Cyan
    
    # Prompt for password securely
    $SecurePassword = Read-Host -AsSecureString "Enter password for ${username}"
    $Credential = New-Object System.Management.Automation.PSCredential("${username}", $SecurePassword)
    
    # Add server
    Add-VBRvCenter \`
        -Name "${vcenterName}" \`
        -User "${username}" \`
        -Password $SecurePassword
    
    Write-Host "✓ ${serverType} server added successfully!" -ForegroundColor Green
    Write-Host "  Server: ${vcenterName}" -ForegroundColor Cyan
    Write-Host "  Username: ${username}" -ForegroundColor Cyan
    
    # Verify connection
    $AddedServer = Get-VBRServer -Name "${vcenterName}"
    if ($AddedServer -and -not $AddedServer.IsUnavailable) {
        Write-Host "  Status: Connected" -ForegroundColor Green
    } else {
        Write-Host "  Status: Check connection" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to add ${serverType}: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-configure-global-settings',
    name: 'Configure Global Notification Settings',
    category: 'Configuration',
    description: 'Set up global email and SNMP notification settings',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'smtpServer', label: 'SMTP Server', type: 'text', required: true, placeholder: 'smtp.company.com' },
      { id: 'smtpPort', label: 'SMTP Port', type: 'number', required: true, defaultValue: 587 },
      { id: 'smtpSSL', label: 'Use SSL', type: 'boolean', required: false, defaultValue: true },
      { id: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'veeam-alerts@company.com' },
      { id: 'adminEmail', label: 'Admin Email', type: 'email', required: true, placeholder: 'it-team@company.com' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const smtpServer = escapePowerShellString(params.smtpServer);
      const smtpSSL = toPowerShellBoolean(params.smtpSSL);
      const fromEmail = escapePowerShellString(params.fromEmail);
      const adminEmail = escapePowerShellString(params.adminEmail);
      
      return `# Configure Global Notification Settings
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Configuring global notification settings..." -ForegroundColor Cyan
    
    # Configure SMTP settings
    Set-VBRMailNotificationConfiguration \`
        -EnableNotification \`
        -SMTPServer "${smtpServer}" \`
        -Port ${params.smtpPort} \`
        -SSLEnabled:${smtpSSL} \`
        -From "${fromEmail}" \`
        -To "${adminEmail}" \`
        -NotifyOnSuccess \`
        -NotifyOnWarning \`
        -NotifyOnFailure \`
        -NotifyOnLastRetry
    
    Write-Host "✓ Global notification settings configured!" -ForegroundColor Green
    Write-Host "  SMTP Server: ${smtpServer}:${params.smtpPort}" -ForegroundColor Cyan
    Write-Host "  SSL Enabled: ${params.smtpSSL}" -ForegroundColor Cyan
    Write-Host "  From: ${fromEmail}" -ForegroundColor Cyan
    Write-Host "  To: ${adminEmail}" -ForegroundColor Cyan
    
    # Send test email
    Write-Host ""
    Write-Host "Sending test email..." -ForegroundColor Cyan
    Send-VBRMailNotification -Subject "Veeam Test Email" -Message "This is a test email from Veeam Backup & Replication."
    Write-Host "✓ Test email sent!" -ForegroundColor Green
    
} catch {
    Write-Error "Configuration failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },

  // ============================================
  // CLOUD CONNECT
  // ============================================
  {
    id: 'veeam-cloud-tenant-report',
    name: 'Generate Cloud Tenant Usage Report',
    category: 'Cloud Connect',
    description: 'Report on cloud tenant resource usage and quotas',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\Cloud-Tenant-Usage.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Generate Cloud Tenant Usage Report
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Generating cloud tenant usage report..." -ForegroundColor Cyan
    
    $Tenants = Get-VBRCloudTenant
    
    if ($Tenants.Count -eq 0) {
        Write-Host "No cloud tenants configured" -ForegroundColor Yellow
        return
    }
    
    $Report = $Tenants | ForEach-Object {
        $Tenant = $_
        $Resources = Get-VBRCloudTenantResource -Tenant $Tenant
        
        [PSCustomObject]@{
            TenantName = $Tenant.Name
            Description = $Tenant.Description
            Enabled = $Tenant.Enabled
            BackupCount = $Tenant.BackupCount
            ReplicaCount = $Tenant.ReplicaCount
            UsedStorageGB = [math]::Round($Tenant.UsedSpace/1GB, 2)
            QuotaGB = [math]::Round($Tenant.Quota/1GB, 2)
            UsagePercent = if ($Tenant.Quota -gt 0) { [math]::Round(($Tenant.UsedSpace / $Tenant.Quota) * 100, 2) } else { 0 }
            LastActive = $Tenant.LastActive
            ResourceCount = $Resources.Count
        }
    }
    
${exportPath ? `    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
` : ''}
    Write-Host "Cloud Tenant Usage:" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Yellow
    
    foreach ($Tenant in $Report) {
        $Color = if ($Tenant.UsagePercent -ge 90) { "Red" } elseif ($Tenant.UsagePercent -ge 75) { "Yellow" } else { "Green" }
        Write-Host ""
        Write-Host "  $($Tenant.TenantName)" -ForegroundColor $Color
        Write-Host "    Status: $(if ($Tenant.Enabled) { 'Active' } else { 'Disabled' })"
        Write-Host "    Storage: $($Tenant.UsedStorageGB) GB / $($Tenant.QuotaGB) GB ($($Tenant.UsagePercent)%)"
        Write-Host "    Backups: $($Tenant.BackupCount)"
        Write-Host "    Replicas: $($Tenant.ReplicaCount)"
        Write-Host "    Last Active: $($Tenant.LastActive)"
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total Tenants: $($Tenants.Count)"
    Write-Host "  Active Tenants: $(($Report | Where-Object { $_.Enabled }).Count)"
    Write-Host "  Total Used Storage: $([math]::Round(($Report | Measure-Object -Property UsedStorageGB -Sum).Sum, 2)) GB"
    
} catch {
    Write-Error "Report generation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-create-cloud-tenant',
    name: 'Create Cloud Connect Tenant',
    category: 'Cloud Connect',
    description: 'Create a new cloud connect tenant with resource allocation',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'tenantName', label: 'Tenant Name', type: 'text', required: true, placeholder: 'Contoso-Corp' },
      { id: 'tenantPassword', label: 'Tenant Password', type: 'text', required: true, placeholder: 'SecurePassword123!' },
      { id: 'quotaGB', label: 'Storage Quota (GB)', type: 'number', required: true, defaultValue: 500 },
      { id: 'repository', label: 'Cloud Repository', type: 'text', required: true, placeholder: 'Cloud-Repo-01' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const tenantName = escapePowerShellString(params.tenantName);
      const tenantPassword = escapePowerShellString(params.tenantPassword);
      const repository = escapePowerShellString(params.repository);
      
      return `# Create Cloud Connect Tenant
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Creating cloud tenant: ${tenantName}..." -ForegroundColor Cyan
    
    # Get cloud repository
    $CloudRepo = Get-VBRBackupRepository -Name "${repository}"
    
    if (-not $CloudRepo) {
        throw "Cloud repository '${repository}' not found"
    }
    
    # Create secure password
    $SecurePassword = ConvertTo-SecureString "${tenantPassword}" -AsPlainText -Force
    
    # Create tenant
    $Tenant = Add-VBRCloudTenant \`
        -Name "${tenantName}" \`
        -Password $SecurePassword \`
        -Description "Cloud tenant for ${tenantName}"
    
    # Add backup resource
    $QuotaMB = ${params.quotaGB} * 1024
    Add-VBRCloudTenantResource \`
        -Tenant $Tenant \`
        -Repository $CloudRepo \`
        -QuotaMB $QuotaMB
    
    Write-Host "✓ Cloud tenant created successfully!" -ForegroundColor Green
    Write-Host "  Tenant: ${tenantName}" -ForegroundColor Cyan
    Write-Host "  Repository: ${repository}" -ForegroundColor Cyan
    Write-Host "  Quota: ${params.quotaGB} GB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Tenant Connection Details:" -ForegroundColor Yellow
    Write-Host "  Username: ${tenantName}" -ForegroundColor Cyan
    Write-Host "  Password: [as configured]" -ForegroundColor Cyan
    
} catch {
    Write-Error "Tenant creation failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  },
  {
    id: 'veeam-modify-tenant-quota',
    name: 'Modify Cloud Tenant Quota',
    category: 'Cloud Connect',
    description: 'Adjust storage quota for existing cloud tenant',
    parameters: [
      { id: 'server', label: 'Veeam Server', type: 'text', required: true, placeholder: 'veeam.company.com' },
      { id: 'tenantName', label: 'Tenant Name', type: 'text', required: true, placeholder: 'Contoso-Corp' },
      { id: 'newQuotaGB', label: 'New Quota (GB)', type: 'number', required: true, defaultValue: 1000 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const tenantName = escapePowerShellString(params.tenantName);
      
      return `# Modify Cloud Tenant Quota
# Generated: ${new Date().toISOString()}

Add-PSSnapin VeeamPSSnapIn -ErrorAction Stop

try {
    Connect-VBRServer -Server "${server}"
    
    Write-Host "Modifying quota for tenant: ${tenantName}..." -ForegroundColor Cyan
    
    # Get tenant
    $Tenant = Get-VBRCloudTenant -Name "${tenantName}"
    
    if (-not $Tenant) {
        throw "Tenant '${tenantName}' not found"
    }
    
    # Get current resources
    $Resources = Get-VBRCloudTenantResource -Tenant $Tenant
    
    if ($Resources.Count -eq 0) {
        throw "No resources found for tenant"
    }
    
    # Current usage
    $CurrentUsedGB = [math]::Round($Tenant.UsedSpace/1GB, 2)
    $CurrentQuotaGB = [math]::Round($Tenant.Quota/1GB, 2)
    
    Write-Host "  Current Usage: $CurrentUsedGB GB / $CurrentQuotaGB GB" -ForegroundColor Cyan
    
    # Update quota
    $NewQuotaMB = ${params.newQuotaGB} * 1024
    
    foreach ($Resource in $Resources) {
        Set-VBRCloudTenantResource -Resource $Resource -QuotaMB $NewQuotaMB
    }
    
    Write-Host "✓ Quota updated successfully!" -ForegroundColor Green
    Write-Host "  Tenant: ${tenantName}" -ForegroundColor Cyan
    Write-Host "  Previous Quota: $CurrentQuotaGB GB" -ForegroundColor Cyan
    Write-Host "  New Quota: ${params.newQuotaGB} GB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Quota modification failed: $_"
} finally {
    Disconnect-VBRServer
}`;
    },
    isPremium: true
  }
];
