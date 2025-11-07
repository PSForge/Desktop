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
    }
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
    }
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
    }
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
    }
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
    }
  }
];
