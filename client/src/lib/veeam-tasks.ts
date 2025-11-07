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
  }
];
