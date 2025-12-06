import { escapePowerShellString } from './powershell-utils';

export interface PDQTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface PDQTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: PDQTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const pdqTasks: PDQTask[] = [
  // ==================== DEPLOYMENT ====================
  {
    id: 'pdq-bulk-deploy',
    name: 'Bulk Software Deployment',
    category: 'Deployment',
    description: 'Deploy software packages to multiple computers',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Chrome-Latest' },
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true, placeholder: 'PC01, PC02, PC03' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      
      return `# PDQ Deploy - Bulk Software Deployment
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($Target in $Targets) {
        Write-Host "Deploying to: $Target..." -ForegroundColor Yellow
        Start-PDQDeploy -Package $Package -Target $Target
        Write-Host "✓ Deployment initiated for $Target" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk deployment initiated for $($Targets.Count) computers" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-schedule-deployment',
    name: 'Schedule Software Deployment',
    category: 'Deployment',
    description: 'Schedule a deployment to run at a specific time',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Chrome-Latest' },
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'scheduleTime', label: 'Schedule Time (HH:mm)', type: 'text', required: true, placeholder: '02:00' },
      { id: 'scheduleDate', label: 'Schedule Date (yyyy-MM-dd)', type: 'text', required: true, placeholder: '2025-12-31' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const scheduleTime = escapePowerShellString(params.scheduleTime);
      const scheduleDate = escapePowerShellString(params.scheduleDate);
      
      return `# PDQ Deploy - Schedule Deployment
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $ScheduleDateTime = [DateTime]::Parse("${scheduleDate} ${scheduleTime}")
    
    $Schedule = New-PDQSchedule -Name "${packageName}-Scheduled" \`
        -StartTime $ScheduleDateTime \`
        -Package $Package \`
        -Targets $Targets
    
    Write-Host "✓ Deployment scheduled for $ScheduleDateTime" -ForegroundColor Green
    Write-Host "  Package: ${packageName}" -ForegroundColor Cyan
    Write-Host "  Targets: $($Targets.Count) computers" -ForegroundColor Cyan
    
} catch {
    Write-Error "Scheduling failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-check-deployment-status',
    name: 'Check Deployment Status',
    category: 'Deployment',
    description: 'Check the status of active and recent deployments',
    parameters: [
      { id: 'deploymentId', label: 'Deployment ID (optional)', type: 'text', required: false, placeholder: 'Leave empty for all recent' },
      { id: 'statusFilter', label: 'Status Filter', type: 'select', required: true, options: ['All', 'Running', 'Successful', 'Failed', 'Queued'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const deploymentId = params.deploymentId ? escapePowerShellString(params.deploymentId) : '';
      const statusFilter = params.statusFilter;
      
      return `# PDQ Deploy - Check Deployment Status
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
${deploymentId ? `    $Deployments = Get-PDQDeployment -Id "${deploymentId}"` : `    $Deployments = Get-PDQDeployment -Recent`}
${statusFilter !== 'All' ? `    $Deployments = $Deployments | Where-Object { $_.Status -eq "${statusFilter}" }` : ''}
    
    $Deployments | Format-Table -AutoSize \`
        Id,
        Package,
        Target,
        Status,
        @{N='StartTime';E={$_.StartTime.ToString('yyyy-MM-dd HH:mm')}},
        @{N='Duration';E={$_.Duration.ToString('hh\\:mm\\:ss')}}
    
    $Summary = $Deployments | Group-Object Status
    Write-Host ""
    Write-Host "Deployment Summary:" -ForegroundColor Cyan
    foreach ($Group in $Summary) {
        $Color = switch ($Group.Name) {
            'Successful' { 'Green' }
            'Failed' { 'Red' }
            'Running' { 'Yellow' }
            default { 'White' }
        }
        Write-Host "  $($Group.Name): $($Group.Count)" -ForegroundColor $Color
    }
    
} catch {
    Write-Error "Failed to retrieve deployment status: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-deploy-to-collection',
    name: 'Deploy to Collection',
    category: 'Deployment',
    description: 'Deploy a package to all computers in a PDQ collection',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Microsoft-Office-365' },
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All-Workstations' },
      { id: 'useHeartbeat', label: 'Wait for Heartbeat', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const collectionName = escapePowerShellString(params.collectionName);
      const useHeartbeat = params.useHeartbeat;
      
      return `# PDQ Deploy - Deploy to Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy
Import-Module PDQInventory

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Collection = Get-PDQCollection -Name "${collectionName}"
    $Members = Get-PDQCollectionMember -Collection $Collection
    
    Write-Host "Deploying '${packageName}' to collection '${collectionName}'..." -ForegroundColor Yellow
    Write-Host "  Target count: $($Members.Count) computers" -ForegroundColor Cyan
    
    $DeployParams = @{
        Package = $Package
        Collection = $Collection
${useHeartbeat ? `        UseHeartbeat = $true` : ''}
    }
    
    Start-PDQDeploy @DeployParams
    
    Write-Host "✓ Deployment initiated to collection '${collectionName}'" -ForegroundColor Green
    
} catch {
    Write-Error "Collection deployment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-retry-failed-deployment',
    name: 'Retry Failed Deployments',
    category: 'Deployment',
    description: 'Retry deployments that failed on target computers',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Chrome-Latest' },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: true, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const hoursBack = params.hoursBack || 24;
      
      return `# PDQ Deploy - Retry Failed Deployments
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $CutoffTime = (Get-Date).AddHours(-${hoursBack})
    
    $FailedDeployments = Get-PDQDeployment -Package "${packageName}" | 
        Where-Object { 
            $_.Status -eq 'Failed' -and 
            $_.StartTime -gt $CutoffTime 
        }
    
    if ($FailedDeployments.Count -eq 0) {
        Write-Host "No failed deployments found for '${packageName}' in the last ${hoursBack} hours" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Found $($FailedDeployments.Count) failed deployments to retry" -ForegroundColor Yellow
    
    $FailedTargets = $FailedDeployments | Select-Object -ExpandProperty Target -Unique
    $Package = Get-PDQPackage -Name "${packageName}"
    
    foreach ($Target in $FailedTargets) {
        Write-Host "  Retrying: $Target" -ForegroundColor Cyan
        Start-PDQDeploy -Package $Package -Target $Target
    }
    
    Write-Host ""
    Write-Host "✓ Retry initiated for $($FailedTargets.Count) targets" -ForegroundColor Green
    
} catch {
    Write-Error "Retry operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-cancel-deployment',
    name: 'Cancel Running Deployment',
    category: 'Deployment',
    description: 'Cancel an active deployment by ID or package name',
    parameters: [
      { id: 'deploymentId', label: 'Deployment ID', type: 'text', required: false, placeholder: 'Leave empty to cancel by package' },
      { id: 'packageName', label: 'Package Name (if no ID)', type: 'text', required: false, placeholder: 'Chrome-Latest' }
    ],
    scriptTemplate: (params) => {
      const deploymentId = params.deploymentId ? escapePowerShellString(params.deploymentId) : '';
      const packageName = params.packageName ? escapePowerShellString(params.packageName) : '';
      
      return `# PDQ Deploy - Cancel Deployment
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
${deploymentId ? `    $Deployments = Get-PDQDeployment -Id "${deploymentId}" | Where-Object { $_.Status -eq 'Running' -or $_.Status -eq 'Queued' }` : 
`    $Deployments = Get-PDQDeployment -Package "${packageName}" | Where-Object { $_.Status -eq 'Running' -or $_.Status -eq 'Queued' }`}
    
    if ($Deployments.Count -eq 0) {
        Write-Host "No active deployments found to cancel" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Found $($Deployments.Count) active deployment(s) to cancel" -ForegroundColor Yellow
    
    foreach ($Deployment in $Deployments) {
        Stop-PDQDeployment -Id $Deployment.Id -Force
        Write-Host "  Cancelled: $($Deployment.Package) -> $($Deployment.Target)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "✓ Cancelled $($Deployments.Count) deployment(s)" -ForegroundColor Green
    
} catch {
    Write-Error "Cancel operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-deploy-maintenance-window',
    name: 'Deploy During Maintenance Window',
    category: 'Deployment',
    description: 'Deploy packages only during specified maintenance windows',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Windows-Updates' },
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'windowStart', label: 'Window Start (HH:mm)', type: 'text', required: true, placeholder: '22:00' },
      { id: 'windowEnd', label: 'Window End (HH:mm)', type: 'text', required: true, placeholder: '06:00' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const windowStart = escapePowerShellString(params.windowStart);
      const windowEnd = escapePowerShellString(params.windowEnd);
      
      return `# PDQ Deploy - Maintenance Window Deployment
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    $WindowStart = [TimeSpan]::Parse("${windowStart}")
    $WindowEnd = [TimeSpan]::Parse("${windowEnd}")
    $CurrentTime = (Get-Date).TimeOfDay
    
    $InWindow = if ($WindowStart -lt $WindowEnd) {
        $CurrentTime -ge $WindowStart -and $CurrentTime -lt $WindowEnd
    } else {
        $CurrentTime -ge $WindowStart -or $CurrentTime -lt $WindowEnd
    }
    
    if (-not $InWindow) {
        $NextWindow = if ($CurrentTime -lt $WindowStart) {
            (Get-Date).Date.Add($WindowStart)
        } else {
            (Get-Date).Date.AddDays(1).Add($WindowStart)
        }
        
        Write-Host "Outside maintenance window. Scheduling for: $NextWindow" -ForegroundColor Yellow
        
        New-PDQSchedule -Name "${packageName}-MaintenanceWindow" \`
            -StartTime $NextWindow \`
            -Package $Package \`
            -Targets $Targets
        
        Write-Host "✓ Deployment scheduled for next maintenance window" -ForegroundColor Green
    } else {
        Write-Host "Within maintenance window - deploying now" -ForegroundColor Green
        
        foreach ($Target in $Targets) {
            Start-PDQDeploy -Package $Package -Target $Target
            Write-Host "  Deployed to: $Target" -ForegroundColor Cyan
        }
        
        Write-Host "✓ Deployment initiated for $($Targets.Count) targets" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Maintenance window deployment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-chain-deployments',
    name: 'Chain Multiple Deployments',
    category: 'Deployment',
    description: 'Deploy multiple packages in sequence to targets',
    parameters: [
      { id: 'packages', label: 'Package Names (comma-separated, in order)', type: 'textarea', required: true, placeholder: 'Prereq-Package, Main-Package, Config-Package' },
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'waitBetween', label: 'Wait Between Packages (minutes)', type: 'number', required: true, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const packagesRaw = (params.packages as string).split(',').map((n: string) => n.trim());
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const waitMinutes = params.waitBetween || 5;
      
      return `# PDQ Deploy - Chain Multiple Deployments
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Packages = @(${packagesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $WaitMinutes = ${waitMinutes}
    
    Write-Host "Chained deployment starting..." -ForegroundColor Yellow
    Write-Host "  Packages: $($Packages.Count)" -ForegroundColor Cyan
    Write-Host "  Targets: $($Targets.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    for ($i = 0; $i -lt $Packages.Count; $i++) {
        $PackageName = $Packages[$i]
        $Package = Get-PDQPackage -Name $PackageName
        
        Write-Host "[$($i + 1)/$($Packages.Count)] Deploying: $PackageName" -ForegroundColor Yellow
        
        foreach ($Target in $Targets) {
            Start-PDQDeploy -Package $Package -Target $Target
        }
        
        if ($i -lt ($Packages.Count - 1)) {
            Write-Host "  Waiting $WaitMinutes minutes before next package..." -ForegroundColor Cyan
            Start-Sleep -Seconds ($WaitMinutes * 60)
        }
    }
    
    Write-Host ""
    Write-Host "✓ Chained deployment completed for $($Packages.Count) packages" -ForegroundColor Green
    
} catch {
    Write-Error "Chained deployment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-view-deployment-history',
    name: 'View Deployment History',
    category: 'Deployment',
    description: 'View deployment history for a computer or package',
    parameters: [
      { id: 'targetComputer', label: 'Target Computer (optional)', type: 'text', required: false, placeholder: 'PC01' },
      { id: 'packageName', label: 'Package Name (optional)', type: 'text', required: false, placeholder: 'Chrome-Latest' },
      { id: 'daysBack', label: 'Days to Look Back', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const targetComputer = params.targetComputer ? escapePowerShellString(params.targetComputer) : '';
      const packageName = params.packageName ? escapePowerShellString(params.packageName) : '';
      const daysBack = params.daysBack || 30;
      
      return `# PDQ Deploy - View Deployment History
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $CutoffDate = (Get-Date).AddDays(-${daysBack})
    
    $History = Get-PDQDeployment | Where-Object { $_.StartTime -gt $CutoffDate }
${targetComputer ? `    $History = $History | Where-Object { $_.Target -eq "${targetComputer}" }` : ''}
${packageName ? `    $History = $History | Where-Object { $_.Package -eq "${packageName}" }` : ''}
    
    $History = $History | Sort-Object StartTime -Descending
    
    Write-Host "Deployment History (Last ${daysBack} days):" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    
    $History | Format-Table -AutoSize \`
        @{N='Date';E={$_.StartTime.ToString('yyyy-MM-dd HH:mm')}},
        Package,
        Target,
        Status,
        @{N='Duration';E={$_.Duration.ToString('mm\\:ss')}}
    
    $Stats = $History | Group-Object Status
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total Deployments: $($History.Count)"
    foreach ($Stat in $Stats) {
        Write-Host "  $($Stat.Name): $($Stat.Count)"
    }
    
} catch {
    Write-Error "Failed to retrieve deployment history: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-force-deployment',
    name: 'Force Package Reinstallation',
    category: 'Deployment',
    description: 'Force reinstall a package even if already installed',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Antivirus-Latest' },
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'uninstallFirst', label: 'Uninstall First', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const uninstallFirst = params.uninstallFirst;
      
      return `# PDQ Deploy - Force Package Reinstallation
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    Write-Host "Force deploying '${packageName}' to $($Targets.Count) targets..." -ForegroundColor Yellow
    
    foreach ($Target in $Targets) {
${uninstallFirst ? `        Write-Host "  Uninstalling on $Target first..." -ForegroundColor Cyan
        $UninstallPackage = Get-PDQPackage -Name "${packageName}-Uninstall" -ErrorAction SilentlyContinue
        if ($UninstallPackage) {
            Start-PDQDeploy -Package $UninstallPackage -Target $Target -Wait
        }
        
` : ''}        Write-Host "  Deploying to: $Target" -ForegroundColor Cyan
        Start-PDQDeploy -Package $Package -Target $Target -Force
    }
    
    Write-Host ""
    Write-Host "✓ Force deployment initiated for $($Targets.Count) targets" -ForegroundColor Green
    
} catch {
    Write-Error "Force deployment failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== PACKAGE MANAGEMENT ====================
  {
    id: 'pdq-create-package',
    name: 'Create Deployment Package',
    category: 'Package Management',
    description: 'Create a new deployment package with installer',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Adobe-Reader-DC' },
      { id: 'installerPath', label: 'Installer Path', type: 'path', required: true, placeholder: 'C:\\Installers\\AdobeReader.exe' },
      { id: 'parameters', label: 'Install Parameters', type: 'text', required: false, placeholder: '/S /v/qn' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const installerPath = escapePowerShellString(params.installerPath);
      const installParams = params.parameters ? escapePowerShellString(params.parameters) : '';
      
      return `# Create PDQ Deploy Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $NewPackage = New-PDQPackage -Name "${packageName}"
    
    Add-PDQStep -Package $NewPackage \`
        -Type "Install" \`
        -Path "${installerPath}"${installParams ? ` \`\n        -Parameters "${installParams}"` : ''}
    
    Write-Host "✓ Package '${packageName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create package: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-edit-package',
    name: 'Edit Deployment Package',
    category: 'Package Management',
    description: 'Edit an existing deployment package configuration',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Adobe-Reader-DC' },
      { id: 'newInstallerPath', label: 'New Installer Path (optional)', type: 'path', required: false, placeholder: 'C:\\Installers\\NewVersion.exe' },
      { id: 'newParameters', label: 'New Install Parameters (optional)', type: 'text', required: false, placeholder: '/S /v/qn' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const newInstallerPath = params.newInstallerPath ? escapePowerShellString(params.newInstallerPath) : '';
      const newParameters = params.newParameters ? escapePowerShellString(params.newParameters) : '';
      
      return `# Edit PDQ Deploy Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    
${newInstallerPath ? `    Set-PDQPackageStep -Package $Package -Path "${newInstallerPath}"
    Write-Host "✓ Updated installer path" -ForegroundColor Green
` : ''}${newParameters ? `    Set-PDQPackageStep -Package $Package -Parameters "${newParameters}"
    Write-Host "✓ Updated install parameters" -ForegroundColor Green
` : ''}    
    Write-Host "✓ Package '${packageName}' updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to edit package: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-add-package-step',
    name: 'Add Step to Package',
    category: 'Package Management',
    description: 'Add a new step to an existing deployment package',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'My-Package' },
      { id: 'stepType', label: 'Step Type', type: 'select', required: true, options: ['Install', 'Uninstall', 'Command', 'PowerShell', 'Reboot', 'Message', 'Sleep'], defaultValue: 'Command' },
      { id: 'stepContent', label: 'Step Content/Path', type: 'textarea', required: true, placeholder: 'Command or script path' },
      { id: 'stepOrder', label: 'Step Order (1=first)', type: 'number', required: false, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const stepType = params.stepType;
      const stepContent = escapePowerShellString(params.stepContent);
      const stepOrder = params.stepOrder || 1;
      
      return `# PDQ Deploy - Add Package Step
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    
    $StepParams = @{
        Package = $Package
        Type = "${stepType}"
        Order = ${stepOrder}
    }
    
    switch ("${stepType}") {
        'Install' { $StepParams.Path = "${stepContent}" }
        'Uninstall' { $StepParams.Path = "${stepContent}" }
        'Command' { $StepParams.Command = "${stepContent}" }
        'PowerShell' { $StepParams.Script = "${stepContent}" }
        'Reboot' { $StepParams.Message = "${stepContent}" }
        'Message' { $StepParams.Message = "${stepContent}" }
        'Sleep' { $StepParams.Seconds = [int]"${stepContent}" }
    }
    
    Add-PDQStep @StepParams
    
    Write-Host "✓ Added ${stepType} step to '${packageName}'" -ForegroundColor Green
    Write-Host "  Step Order: ${stepOrder}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add step: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-add-package-condition',
    name: 'Add Package Condition',
    category: 'Package Management',
    description: 'Add a pre-deployment condition to a package',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'My-Package' },
      { id: 'conditionType', label: 'Condition Type', type: 'select', required: true, options: ['OSVersion', 'Architecture', 'FileExists', 'RegistryValue', 'ApplicationInstalled', 'FreeSpace'], defaultValue: 'OSVersion' },
      { id: 'conditionValue', label: 'Condition Value', type: 'text', required: true, placeholder: 'Windows 10' },
      { id: 'conditionOperator', label: 'Operator', type: 'select', required: true, options: ['Equals', 'NotEquals', 'Contains', 'GreaterThan', 'LessThan'], defaultValue: 'Equals' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const conditionType = params.conditionType;
      const conditionValue = escapePowerShellString(params.conditionValue);
      const conditionOperator = params.conditionOperator;
      
      return `# PDQ Deploy - Add Package Condition
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    
    $Condition = @{
        Type = "${conditionType}"
        Operator = "${conditionOperator}"
        Value = "${conditionValue}"
    }
    
    Add-PDQCondition -Package $Package @Condition
    
    Write-Host "✓ Condition added to '${packageName}':" -ForegroundColor Green
    Write-Host "  ${conditionType} ${conditionOperator} '${conditionValue}'" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add condition: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-clone-package',
    name: 'Clone Package',
    category: 'Package Management',
    description: 'Create a copy of an existing package with a new name',
    parameters: [
      { id: 'sourcePackage', label: 'Source Package Name', type: 'text', required: true, placeholder: 'Chrome-Latest' },
      { id: 'newPackageName', label: 'New Package Name', type: 'text', required: true, placeholder: 'Chrome-Latest-Test' }
    ],
    scriptTemplate: (params) => {
      const sourcePackage = escapePowerShellString(params.sourcePackage);
      const newPackageName = escapePowerShellString(params.newPackageName);
      
      return `# PDQ Deploy - Clone Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Source = Get-PDQPackage -Name "${sourcePackage}"
    
    if (-not $Source) {
        throw "Source package '${sourcePackage}' not found"
    }
    
    Copy-PDQPackage -Package $Source -NewName "${newPackageName}"
    
    Write-Host "✓ Package cloned successfully!" -ForegroundColor Green
    Write-Host "  Source: ${sourcePackage}" -ForegroundColor Cyan
    Write-Host "  New Package: ${newPackageName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to clone package: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-export-package',
    name: 'Export Package',
    category: 'Package Management',
    description: 'Export a package to a file for backup or sharing',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'My-Package' },
      { id: 'exportPath', label: 'Export File Path', type: 'path', required: true, placeholder: 'C:\\Exports\\package.xml' },
      { id: 'includeFiles', label: 'Include Installer Files', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const exportPath = escapePowerShellString(params.exportPath);
      const includeFiles = params.includeFiles;
      
      return `# PDQ Deploy - Export Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    
    $ExportParams = @{
        Package = $Package
        Path = "${exportPath}"
${includeFiles ? `        IncludeFiles = $true` : `        IncludeFiles = $false`}
    }
    
    Export-PDQPackage @ExportParams
    
    $FileInfo = Get-Item "${exportPath}"
    
    Write-Host "✓ Package exported successfully!" -ForegroundColor Green
    Write-Host "  Package: ${packageName}" -ForegroundColor Cyan
    Write-Host "  File: ${exportPath}" -ForegroundColor Cyan
    Write-Host "  Size: $([Math]::Round($FileInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export package: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-import-package',
    name: 'Import Package',
    category: 'Package Management',
    description: 'Import a package from an export file',
    parameters: [
      { id: 'importPath', label: 'Import File Path', type: 'path', required: true, placeholder: 'C:\\Imports\\package.xml' },
      { id: 'newPackageName', label: 'New Package Name (optional)', type: 'text', required: false, placeholder: 'Leave empty to use original name' }
    ],
    scriptTemplate: (params) => {
      const importPath = escapePowerShellString(params.importPath);
      const newPackageName = params.newPackageName ? escapePowerShellString(params.newPackageName) : '';
      
      return `# PDQ Deploy - Import Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    if (-not (Test-Path "${importPath}")) {
        throw "Import file not found: ${importPath}"
    }
    
    $ImportParams = @{
        Path = "${importPath}"
    }
${newPackageName ? `    $ImportParams.NewName = "${newPackageName}"` : ''}
    
    $ImportedPackage = Import-PDQPackage @ImportParams
    
    Write-Host "✓ Package imported successfully!" -ForegroundColor Green
    Write-Host "  Name: $($ImportedPackage.Name)" -ForegroundColor Cyan
    Write-Host "  Steps: $($ImportedPackage.Steps.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to import package: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-configure-package-timeout',
    name: 'Configure Package Timeout',
    category: 'Package Management',
    description: 'Set timeout and retry settings for a package',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'My-Package' },
      { id: 'timeout', label: 'Timeout (minutes)', type: 'number', required: true, defaultValue: 60 },
      { id: 'retryCount', label: 'Retry Count', type: 'number', required: false, defaultValue: 0 },
      { id: 'retryInterval', label: 'Retry Interval (minutes)', type: 'number', required: false, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const timeout = params.timeout || 60;
      const retryCount = params.retryCount || 0;
      const retryInterval = params.retryInterval || 5;
      
      return `# PDQ Deploy - Configure Package Timeout
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    
    Set-PDQPackage -Package $Package \`
        -Timeout ${timeout} \`
        -RetryCount ${retryCount} \`
        -RetryInterval ${retryInterval}
    
    Write-Host "✓ Package timeout configured!" -ForegroundColor Green
    Write-Host "  Package: ${packageName}" -ForegroundColor Cyan
    Write-Host "  Timeout: ${timeout} minutes" -ForegroundColor Cyan
    Write-Host "  Retries: ${retryCount} (every ${retryInterval} min)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure timeout: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-list-packages',
    name: 'List All Packages',
    category: 'Package Management',
    description: 'List all deployment packages with details',
    parameters: [
      { id: 'filter', label: 'Name Filter (optional)', type: 'text', required: false, placeholder: 'Chrome' },
      { id: 'exportPath', label: 'Export to CSV (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\packages.csv' }
    ],
    scriptTemplate: (params) => {
      const filter = params.filter ? escapePowerShellString(params.filter) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# PDQ Deploy - List All Packages
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Packages = Get-PDQPackage
${filter ? `    $Packages = $Packages | Where-Object { $_.Name -like "*${filter}*" }` : ''}
    
    $PackageInfo = $Packages | Select-Object \`
        Name,
        @{N='Steps';E={$_.Steps.Count}},
        @{N='Conditions';E={$_.Conditions.Count}},
        @{N='LastModified';E={$_.ModifiedDate.ToString('yyyy-MM-dd')}},
        @{N='DeployCount';E={(Get-PDQDeployment -Package $_.Name).Count}}
    
    $PackageInfo | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Packages: $($Packages.Count)" -ForegroundColor Cyan
${exportPath ? `
    $PackageInfo | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to list packages: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-delete-package',
    name: 'Delete Package',
    category: 'Package Management',
    description: 'Delete a deployment package',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Old-Package' },
      { id: 'confirm', label: 'Confirm Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const confirm = params.confirm;
      
      return `# PDQ Deploy - Delete Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    
    if (-not $Package) {
        throw "Package '${packageName}' not found"
    }
    
${confirm ? '' : `    Write-Host "⚠ Deletion not confirmed. Set 'Confirm Deletion' to true to proceed." -ForegroundColor Yellow
    return
`}
    $DeployCount = (Get-PDQDeployment -Package "${packageName}").Count
    
    if ($DeployCount -gt 0) {
        Write-Host "Warning: This package has $DeployCount deployment(s) in history" -ForegroundColor Yellow
    }
    
    Remove-PDQPackage -Package $Package -Force
    
    Write-Host "✓ Package '${packageName}' deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to delete package: $_"
}`;
    },
    isPremium: true
  },

  // ==================== INVENTORY SCANNING ====================
  {
    id: 'pdq-inventory-scan',
    name: 'Run Inventory Scan',
    category: 'Inventory Scanning',
    description: 'Scan computers for software and hardware inventory',
    parameters: [
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'scanType', label: 'Scan Type', type: 'select', required: true, options: ['Standard', 'Applications', 'Hardware', 'Services', 'Full'], defaultValue: 'Standard' }
    ],
    scriptTemplate: (params) => {
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const scanType = params.scanType;
      
      return `# PDQ Inventory Scan
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($Target in $Targets) {
        Write-Host "Scanning: $Target..." -ForegroundColor Yellow
        Start-PDQScan -Computer $Target -ScanProfile "${scanType}"
        Write-Host "✓ Scan initiated for $Target" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Inventory scan initiated for $($Targets.Count) computers" -ForegroundColor Green
    
} catch {
    Write-Error "Scan failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-create-scan-profile',
    name: 'Create Scan Profile',
    category: 'Inventory Scanning',
    description: 'Create a custom inventory scan profile',
    parameters: [
      { id: 'profileName', label: 'Profile Name', type: 'text', required: true, placeholder: 'Custom-Full-Scan' },
      { id: 'scanApplications', label: 'Scan Applications', type: 'boolean', required: false, defaultValue: true },
      { id: 'scanServices', label: 'Scan Services', type: 'boolean', required: false, defaultValue: true },
      { id: 'scanHardware', label: 'Scan Hardware', type: 'boolean', required: false, defaultValue: true },
      { id: 'scanWindowsUpdates', label: 'Scan Windows Updates', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const profileName = escapePowerShellString(params.profileName);
      const scanApps = params.scanApplications;
      const scanServices = params.scanServices;
      const scanHardware = params.scanHardware;
      const scanUpdates = params.scanWindowsUpdates;
      
      return `# PDQ Inventory - Create Scan Profile
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $ScanOptions = @{
        Name = "${profileName}"
        ScanApplications = $${scanApps}
        ScanServices = $${scanServices}
        ScanHardware = $${scanHardware}
        ScanWindowsUpdates = $${scanUpdates}
    }
    
    New-PDQScanProfile @ScanOptions
    
    Write-Host "✓ Scan profile '${profileName}' created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Profile Settings:" -ForegroundColor Cyan
    Write-Host "  Applications: ${scanApps ? 'Yes' : 'No'}"
    Write-Host "  Services: ${scanServices ? 'Yes' : 'No'}"
    Write-Host "  Hardware: ${scanHardware ? 'Yes' : 'No'}"
    Write-Host "  Windows Updates: ${scanUpdates ? 'Yes' : 'No'}"
    
} catch {
    Write-Error "Failed to create scan profile: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-schedule-scan',
    name: 'Schedule Recurring Scan',
    category: 'Inventory Scanning',
    description: 'Schedule automatic inventory scans for collections',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All-Workstations' },
      { id: 'scanProfile', label: 'Scan Profile', type: 'text', required: true, placeholder: 'Standard' },
      { id: 'frequency', label: 'Frequency', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Daily' },
      { id: 'scanTime', label: 'Scan Time (HH:mm)', type: 'text', required: true, placeholder: '03:00' }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const scanProfile = escapePowerShellString(params.scanProfile);
      const frequency = params.frequency;
      const scanTime = escapePowerShellString(params.scanTime);
      
      return `# PDQ Inventory - Schedule Recurring Scan
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Collection = Get-PDQCollection -Name "${collectionName}"
    $Profile = Get-PDQScanProfile -Name "${scanProfile}"
    
    $ScheduleParams = @{
        Name = "${collectionName}-Scheduled-Scan"
        Collection = $Collection
        ScanProfile = $Profile
        Frequency = "${frequency}"
        StartTime = [TimeSpan]::Parse("${scanTime}")
    }
    
    New-PDQScanSchedule @ScheduleParams
    
    Write-Host "✓ Scan schedule created!" -ForegroundColor Green
    Write-Host "  Collection: ${collectionName}" -ForegroundColor Cyan
    Write-Host "  Profile: ${scanProfile}" -ForegroundColor Cyan
    Write-Host "  Frequency: ${frequency} at ${scanTime}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to schedule scan: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-view-scan-status',
    name: 'View Scan Status',
    category: 'Inventory Scanning',
    description: 'View active and recent scan status',
    parameters: [
      { id: 'showActive', label: 'Show Active Only', type: 'boolean', required: false, defaultValue: false },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: true, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const showActive = params.showActive;
      const hoursBack = params.hoursBack || 24;
      
      return `# PDQ Inventory - View Scan Status
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $CutoffTime = (Get-Date).AddHours(-${hoursBack})
    
    $Scans = Get-PDQScan | Where-Object { $_.StartTime -gt $CutoffTime }
${showActive ? `    $Scans = $Scans | Where-Object { $_.Status -eq 'Running' }` : ''}
    
    $Scans | Sort-Object StartTime -Descending | Format-Table -AutoSize \`
        Computer,
        ScanProfile,
        Status,
        @{N='Started';E={$_.StartTime.ToString('HH:mm:ss')}},
        @{N='Duration';E={$_.Duration.ToString('mm\\:ss')}}
    
    $Summary = $Scans | Group-Object Status
    
    Write-Host ""
    Write-Host "Scan Summary (Last ${hoursBack} hours):" -ForegroundColor Cyan
    foreach ($Group in $Summary) {
        $Color = switch ($Group.Name) {
            'Completed' { 'Green' }
            'Failed' { 'Red' }
            'Running' { 'Yellow' }
            default { 'White' }
        }
        Write-Host "  $($Group.Name): $($Group.Count)" -ForegroundColor $Color
    }
    
} catch {
    Write-Error "Failed to get scan status: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-scan-new-computers',
    name: 'Scan Newly Added Computers',
    category: 'Inventory Scanning',
    description: 'Automatically scan computers added in the last N days',
    parameters: [
      { id: 'daysBack', label: 'Days Since Added', type: 'number', required: true, defaultValue: 7 },
      { id: 'scanProfile', label: 'Scan Profile', type: 'text', required: true, placeholder: 'Full' }
    ],
    scriptTemplate: (params) => {
      const daysBack = params.daysBack || 7;
      const scanProfile = escapePowerShellString(params.scanProfile);
      
      return `# PDQ Inventory - Scan New Computers
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $CutoffDate = (Get-Date).AddDays(-${daysBack})
    
    $NewComputers = Get-PDQComputer | Where-Object { 
        $_.AddedDate -gt $CutoffDate -and 
        ($_.LastScanDate -eq $null -or $_.LastScanDate -lt $_.AddedDate)
    }
    
    if ($NewComputers.Count -eq 0) {
        Write-Host "No new computers found that need scanning" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Found $($NewComputers.Count) new computers to scan" -ForegroundColor Cyan
    
    foreach ($Computer in $NewComputers) {
        Write-Host "  Scanning: $($Computer.Name)..." -ForegroundColor Yellow
        Start-PDQScan -Computer $Computer.Name -ScanProfile "${scanProfile}"
    }
    
    Write-Host ""
    Write-Host "✓ Initiated scans for $($NewComputers.Count) new computers" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to scan new computers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-export-scan-results',
    name: 'Export Scan Results',
    category: 'Inventory Scanning',
    description: 'Export inventory scan results to CSV',
    parameters: [
      { id: 'computerName', label: 'Computer Name (optional)', type: 'text', required: false, placeholder: 'Leave empty for all' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\scan-results.csv' },
      { id: 'includeDetails', label: 'Detail Level', type: 'select', required: true, options: ['Summary', 'Applications', 'Hardware', 'Full'], defaultValue: 'Summary' }
    ],
    scriptTemplate: (params) => {
      const computerName = params.computerName ? escapePowerShellString(params.computerName) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      const detailLevel = params.includeDetails;
      
      return `# PDQ Inventory - Export Scan Results
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
${computerName ? `    $Computers = Get-PDQComputer -Name "${computerName}"` : `    $Computers = Get-PDQComputer`}
    
    $Results = foreach ($Computer in $Computers) {
        $Base = [PSCustomObject]@{
            Name = $Computer.Name
            OS = $Computer.OperatingSystem
            LastScan = $Computer.LastScanDate
            IPAddress = $Computer.IPAddress
        }
        
${detailLevel === 'Full' || detailLevel === 'Applications' ? `        $Base | Add-Member -NotePropertyName 'ApplicationCount' -NotePropertyValue $Computer.Applications.Count
        $Base | Add-Member -NotePropertyName 'TopApps' -NotePropertyValue (($Computer.Applications | Select-Object -First 5 -ExpandProperty Name) -join '; ')` : ''}
${detailLevel === 'Full' || detailLevel === 'Hardware' ? `        $Base | Add-Member -NotePropertyName 'CPU' -NotePropertyValue $Computer.Processor.Name
        $Base | Add-Member -NotePropertyName 'RAM_GB' -NotePropertyValue ([Math]::Round($Computer.Memory.Total / 1GB, 2))
        $Base | Add-Member -NotePropertyName 'Disk_GB' -NotePropertyValue ([Math]::Round($Computer.Disk.Total / 1GB, 2))` : ''}
        
        $Base
    }
    
    $Results | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Scan results exported!" -ForegroundColor Green
    Write-Host "  Computers: $($Results.Count)" -ForegroundColor Cyan
    Write-Host "  File: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export scan results: $_"
}`;
    },
    isPremium: true
  },

  // ==================== REPORTING ====================
  {
    id: 'pdq-export-software-report',
    name: 'Export Software Inventory Report',
    category: 'Reporting',
    description: 'Export installed software report from PDQ Inventory',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Software-Inventory.csv' },
      { id: 'softwareName', label: 'Software Name Filter (optional)', type: 'text', required: false, placeholder: 'Microsoft' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const filter = params.softwareName ? ` | Where-Object { $_.Name -like "*${escapePowerShellString(params.softwareName)}*" }` : '';
      
      return `# PDQ Inventory - Software Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Software = Get-PDQApplication${filter}
    
    $Report = $Software | Select-Object \`
        Name,
        Version,
        Publisher,
        @{N='ComputerCount';E={$_.Computers.Count}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Software inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Applications: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-export-hardware-report',
    name: 'Generate Hardware Inventory Report',
    category: 'Reporting',
    description: 'Export hardware inventory report from PDQ Inventory',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Hardware-Inventory.csv' },
      { id: 'includeDetails', label: 'Include Details', type: 'select', required: true, options: ['CPU', 'Memory', 'Disk', 'Network', 'All'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const includeDetails = params.includeDetails;
      
      return `# PDQ Inventory - Hardware Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Computers = Get-PDQComputer
    
    $Report = $Computers | Select-Object \`
        Name,
        DomainName,
        OperatingSystem,
${includeDetails === 'All' || includeDetails === 'CPU' ? `        @{N='CPU';E={$_.Processor.Name}},
        @{N='CPUCores';E={$_.Processor.Cores}},` : ''}
${includeDetails === 'All' || includeDetails === 'Memory' ? `        @{N='TotalRAM_GB';E={[Math]::Round($_.Memory.Total / 1GB, 2)}},` : ''}
${includeDetails === 'All' || includeDetails === 'Disk' ? `        @{N='TotalDisk_GB';E={[Math]::Round($_.Disk.Total / 1GB, 2)}},
        @{N='FreeDisk_GB';E={[Math]::Round($_.Disk.Free / 1GB, 2)}},` : ''}
${includeDetails === 'All' || includeDetails === 'Network' ? `        @{N='IPAddress';E={$_.Network.IPAddress}},
        @{N='MACAddress';E={$_.Network.MACAddress}},` : ''}
        LastInventoryScan
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Hardware inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Computers: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-export-compliance-report',
    name: 'Export Compliance Report',
    category: 'Reporting',
    description: 'Generate and export patch compliance reports',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Compliance-Report.csv' },
      { id: 'complianceThreshold', label: 'Compliance Threshold (%)', type: 'number', required: true, defaultValue: 95 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const threshold = params.complianceThreshold;
      
      return `# PDQ Inventory - Compliance Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Computers = Get-PDQComputer | Select-Object \`
        Name,
        OperatingSystem,
        @{N='TotalPatches';E={$_.Patches.Total}},
        @{N='InstalledPatches';E={$_.Patches.Installed}},
        @{N='MissingPatches';E={$_.Patches.Missing}},
        @{N='CompliancePercent';E={
            if ($_.Patches.Total -gt 0) {
                [Math]::Round(($_.Patches.Installed / $_.Patches.Total) * 100, 2)
            } else { 100 }
        }},
        @{N='Status';E={
            $percent = if ($_.Patches.Total -gt 0) { 
                ($_.Patches.Installed / $_.Patches.Total) * 100 
            } else { 100 }
            if ($percent -ge ${threshold}) { "Compliant" } else { "Non-Compliant" }
        }},
        LastInventoryScan
    
    $Computers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $CompliantCount = ($Computers | Where-Object Status -eq "Compliant").Count
    $NonCompliantCount = ($Computers | Where-Object Status -eq "Non-Compliant").Count
    
    Write-Host "✓ Compliance report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Computers: $($Computers.Count)" -ForegroundColor Cyan
    Write-Host "  Compliant (>=${threshold}%): $CompliantCount" -ForegroundColor Green
    Write-Host "  Non-Compliant (<${threshold}%): $NonCompliantCount" -ForegroundColor Red
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-computer-age-report',
    name: 'Computer Age Report',
    category: 'Reporting',
    description: 'Generate report of computer ages based on purchase/build date',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Computer-Age.csv' },
      { id: 'warningAgeYears', label: 'Warning Age (years)', type: 'number', required: true, defaultValue: 4 },
      { id: 'criticalAgeYears', label: 'Critical Age (years)', type: 'number', required: true, defaultValue: 6 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const warningAge = params.warningAgeYears || 4;
      const criticalAge = params.criticalAgeYears || 6;
      
      return `# PDQ Inventory - Computer Age Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Today = Get-Date
    
    $Computers = Get-PDQComputer | Select-Object \`
        Name,
        Manufacturer,
        Model,
        SerialNumber,
        @{N='PurchaseDate';E={$_.BiosDate}},
        @{N='AgeYears';E={
            if ($_.BiosDate) {
                [Math]::Round(($Today - $_.BiosDate).TotalDays / 365, 1)
            } else { 'Unknown' }
        }},
        @{N='Status';E={
            if (-not $_.BiosDate) { 'Unknown' }
            elseif (($Today - $_.BiosDate).TotalDays / 365 -ge ${criticalAge}) { 'Critical' }
            elseif (($Today - $_.BiosDate).TotalDays / 365 -ge ${warningAge}) { 'Warning' }
            else { 'OK' }
        }}
    
    $Computers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $Summary = $Computers | Group-Object Status
    
    Write-Host "✓ Computer age report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    foreach ($Group in $Summary) {
        $Color = switch ($Group.Name) {
            'OK' { 'Green' }
            'Warning' { 'Yellow' }
            'Critical' { 'Red' }
            default { 'White' }
        }
        Write-Host "  $($Group.Name): $($Group.Count)" -ForegroundColor $Color
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-disk-space-report',
    name: 'Disk Space Report',
    category: 'Reporting',
    description: 'Generate report of computers with low disk space',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Disk-Space.csv' },
      { id: 'warningThresholdGB', label: 'Warning Threshold (GB)', type: 'number', required: true, defaultValue: 50 },
      { id: 'criticalThresholdGB', label: 'Critical Threshold (GB)', type: 'number', required: true, defaultValue: 20 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const warningGB = params.warningThresholdGB || 50;
      const criticalGB = params.criticalThresholdGB || 20;
      
      return `# PDQ Inventory - Disk Space Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Computers = Get-PDQComputer | Select-Object \`
        Name,
        @{N='TotalDisk_GB';E={[Math]::Round($_.Disk.Total / 1GB, 2)}},
        @{N='FreeDisk_GB';E={[Math]::Round($_.Disk.Free / 1GB, 2)}},
        @{N='UsedDisk_GB';E={[Math]::Round(($_.Disk.Total - $_.Disk.Free) / 1GB, 2)}},
        @{N='PercentFree';E={[Math]::Round(($_.Disk.Free / $_.Disk.Total) * 100, 1)}},
        @{N='Status';E={
            $FreeGB = $_.Disk.Free / 1GB
            if ($FreeGB -lt ${criticalGB}) { 'Critical' }
            elseif ($FreeGB -lt ${warningGB}) { 'Warning' }
            else { 'OK' }
        }},
        LastInventoryScan
    
    $Computers = $Computers | Sort-Object FreeDisk_GB
    $Computers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $Critical = ($Computers | Where-Object Status -eq 'Critical').Count
    $Warning = ($Computers | Where-Object Status -eq 'Warning').Count
    
    Write-Host "✓ Disk space report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Critical (<${criticalGB}GB): $Critical" -ForegroundColor Red
    Write-Host "  Warning (<${warningGB}GB): $Warning" -ForegroundColor Yellow
    Write-Host "  OK: $(($Computers).Count - $Critical - $Warning)" -ForegroundColor Green
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-last-boot-report',
    name: 'Last Boot Time Report',
    category: 'Reporting',
    description: 'Report computers that have not been rebooted recently',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\LastBoot.csv' },
      { id: 'daysThreshold', label: 'Days Without Reboot', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const daysThreshold = params.daysThreshold || 30;
      
      return `# PDQ Inventory - Last Boot Time Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Today = Get-Date
    $Threshold = $Today.AddDays(-${daysThreshold})
    
    $Computers = Get-PDQComputer | Select-Object \`
        Name,
        OperatingSystem,
        @{N='LastBootTime';E={$_.LastBootTime}},
        @{N='UptimeDays';E={
            if ($_.LastBootTime) {
                [Math]::Round(($Today - $_.LastBootTime).TotalDays, 1)
            } else { 'Unknown' }
        }},
        @{N='NeedsReboot';E={
            if (-not $_.LastBootTime) { 'Unknown' }
            elseif ($_.LastBootTime -lt $Threshold) { 'Yes' }
            else { 'No' }
        }}
    
    $Computers = $Computers | Sort-Object UptimeDays -Descending
    $Computers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $NeedsReboot = ($Computers | Where-Object NeedsReboot -eq 'Yes').Count
    
    Write-Host "✓ Last boot report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Computers needing reboot (>${daysThreshold} days): $NeedsReboot" -ForegroundColor $(if ($NeedsReboot -gt 0) { 'Yellow' } else { 'Green' })
    
    if ($NeedsReboot -gt 0) {
        Write-Host ""
        Write-Host "Computers with longest uptime:" -ForegroundColor Yellow
        $Computers | Where-Object NeedsReboot -eq 'Yes' | 
            Select-Object -First 5 | 
            ForEach-Object { Write-Host "  $($_.Name): $($_.UptimeDays) days" -ForegroundColor Yellow }
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-missing-software-report',
    name: 'Missing Software Report',
    category: 'Reporting',
    description: 'Find computers missing required software',
    parameters: [
      { id: 'softwareName', label: 'Required Software Name', type: 'text', required: true, placeholder: 'Microsoft 365' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Missing-Software.csv' },
      { id: 'collectionFilter', label: 'Collection Filter (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const softwareName = escapePowerShellString(params.softwareName);
      const exportPath = escapePowerShellString(params.exportPath);
      const collectionFilter = params.collectionFilter ? escapePowerShellString(params.collectionFilter) : '';
      
      return `# PDQ Inventory - Missing Software Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
${collectionFilter ? `    $Collection = Get-PDQCollection -Name "${collectionFilter}"
    $AllComputers = Get-PDQCollectionMember -Collection $Collection | Get-PDQComputer` : `    $AllComputers = Get-PDQComputer`}
    
    $MissingComputers = $AllComputers | Where-Object {
        $Apps = $_.Applications | Select-Object -ExpandProperty Name
        -not ($Apps -like "*${softwareName}*")
    }
    
    $Report = $MissingComputers | Select-Object \`
        Name,
        OperatingSystem,
        IPAddress,
        @{N='LastScan';E={$_.LastScanDate.ToString('yyyy-MM-dd')}},
        @{N='MissingSoftware';E={'${softwareName}'}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Missing software report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total Computers Checked: $($AllComputers.Count)"
    Write-Host "  Missing '${softwareName}': $($MissingComputers.Count)" -ForegroundColor $(if ($MissingComputers.Count -gt 0) { 'Yellow' } else { 'Green' })
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-deployment-summary-report',
    name: 'Deployment Summary Report',
    category: 'Reporting',
    description: 'Generate deployment success/failure summary report',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Deployment-Summary.csv' },
      { id: 'daysBack', label: 'Days to Look Back', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const daysBack = params.daysBack || 30;
      
      return `# PDQ Deploy - Deployment Summary Report
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $CutoffDate = (Get-Date).AddDays(-${daysBack})
    
    $Deployments = Get-PDQDeployment | Where-Object { $_.StartTime -gt $CutoffDate }
    
    $Summary = $Deployments | Group-Object Package | ForEach-Object {
        $PackageDeployments = $_.Group
        [PSCustomObject]@{
            Package = $_.Name
            TotalDeployments = $PackageDeployments.Count
            Successful = ($PackageDeployments | Where-Object Status -eq 'Successful').Count
            Failed = ($PackageDeployments | Where-Object Status -eq 'Failed').Count
            SuccessRate = [Math]::Round(
                (($PackageDeployments | Where-Object Status -eq 'Successful').Count / 
                $PackageDeployments.Count) * 100, 1
            )
            LastDeployment = ($PackageDeployments | Sort-Object StartTime -Descending | 
                Select-Object -First 1).StartTime.ToString('yyyy-MM-dd')
        }
    }
    
    $Summary = $Summary | Sort-Object TotalDeployments -Descending
    $Summary | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Deployment summary report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary (Last ${daysBack} days):" -ForegroundColor Cyan
    Write-Host "  Total Packages Deployed: $($Summary.Count)"
    Write-Host "  Total Deployments: $(($Summary | Measure-Object -Property TotalDeployments -Sum).Sum)"
    Write-Host "  Overall Success Rate: $([Math]::Round((($Deployments | Where-Object Status -eq 'Successful').Count / $Deployments.Count) * 100, 1))%"
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== TARGET MANAGEMENT ====================
  {
    id: 'pdq-build-dynamic-collection',
    name: 'Build Dynamic Collection',
    category: 'Target Management',
    description: 'Create dynamic collections based on criteria',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Windows-11-Computers' },
      { id: 'criteriaType', label: 'Criteria Type', type: 'select', required: true, options: ['OSVersion', 'OSArchitecture', 'ApplicationInstalled', 'MissingPatches', 'DiskSpaceLow', 'LastScanOlderThan'], defaultValue: 'OSVersion' },
      { id: 'criteriaValue', label: 'Criteria Value', type: 'text', required: true, placeholder: 'Windows 11' }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const criteriaType = params.criteriaType;
      const criteriaValue = escapePowerShellString(params.criteriaValue);
      
      return `# PDQ Inventory - Build Dynamic Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Filter = @{
        Name = "${collectionName}"
        Type = "Dynamic"
        Criteria = @{
            Property = "${criteriaType}"
            Operator = "Contains"
            Value = "${criteriaValue}"
        }
    }
    
    New-PDQCollection @Filter
    
    Write-Host "✓ Dynamic collection '${collectionName}' created!" -ForegroundColor Green
    Write-Host "  Criteria: ${criteriaType} contains '${criteriaValue}'" -ForegroundColor Cyan
    
    $Members = Get-PDQCollectionMember -Collection "${collectionName}"
    Write-Host "  Current Members: $($Members.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Collection creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-create-static-collection',
    name: 'Create Static Collection',
    category: 'Target Management',
    description: 'Create a static collection with specified computers',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Finance-Department' },
      { id: 'computers', label: 'Computers (comma-separated)', type: 'textarea', required: true, placeholder: 'PC01, PC02, PC03' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Finance department workstations' }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const computersRaw = (params.computers as string).split(',').map((n: string) => n.trim());
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# PDQ Inventory - Create Static Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Computers = @(${computersRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    $Collection = New-PDQCollection -Name "${collectionName}" \`
        -Type "Static"${description ? ` \`\n        -Description "${description}"` : ''}
    
    foreach ($Computer in $Computers) {
        $PDQComputer = Get-PDQComputer -Name $Computer -ErrorAction SilentlyContinue
        if ($PDQComputer) {
            Add-PDQCollectionMember -Collection $Collection -Computer $Computer
            Write-Host "  Added: $Computer" -ForegroundColor Cyan
        } else {
            Write-Host "  Not found in inventory: $Computer" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "✓ Static collection '${collectionName}' created!" -ForegroundColor Green
    Write-Host "  Members: $(Get-PDQCollectionMember -Collection $Collection).Count" -ForegroundColor Cyan
    
} catch {
    Write-Error "Collection creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-integrate-ad-groups',
    name: 'Sync Collection with AD Group',
    category: 'Target Management',
    description: 'Create PDQ collections based on Active Directory groups',
    parameters: [
      { id: 'adGroupName', label: 'AD Group Name', type: 'text', required: true, placeholder: 'IT-Workstations' },
      { id: 'collectionName', label: 'PDQ Collection Name', type: 'text', required: true, placeholder: 'IT-Computers' }
    ],
    scriptTemplate: (params) => {
      const adGroupName = escapePowerShellString(params.adGroupName);
      const collectionName = escapePowerShellString(params.collectionName);
      
      return `# PDQ Inventory - Sync with AD Groups
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory
Import-Module ActiveDirectory

try {
    $ADComputers = Get-ADGroupMember -Identity "${adGroupName}" | 
        Where-Object { $_.objectClass -eq 'computer' } |
        Get-ADComputer |
        Select-Object -ExpandProperty Name
    
    Write-Host "Found $($ADComputers.Count) computers in AD group '${adGroupName}'" -ForegroundColor Cyan
    
    $Collection = New-PDQCollection -Name "${collectionName}" -Type "Static"
    
    foreach ($Computer in $ADComputers) {
        Add-PDQCollectionMember -Collection $Collection -Computer $Computer
    }
    
    Write-Host "✓ PDQ collection '${collectionName}' created and synced with AD!" -ForegroundColor Green
    Write-Host "  Members: $($ADComputers.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "AD integration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-add-to-collection',
    name: 'Add Computer to Collection',
    category: 'Target Management',
    description: 'Add computers to an existing collection',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'My-Collection' },
      { id: 'computers', label: 'Computers (comma-separated)', type: 'textarea', required: true, placeholder: 'PC01, PC02' }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const computersRaw = (params.computers as string).split(',').map((n: string) => n.trim());
      
      return `# PDQ Inventory - Add to Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Collection = Get-PDQCollection -Name "${collectionName}"
    
    if (-not $Collection) {
        throw "Collection '${collectionName}' not found"
    }
    
    if ($Collection.Type -ne 'Static') {
        throw "Cannot manually add computers to dynamic collection"
    }
    
    $Computers = @(${computersRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $Added = 0
    
    foreach ($Computer in $Computers) {
        try {
            Add-PDQCollectionMember -Collection $Collection -Computer $Computer
            Write-Host "  Added: $Computer" -ForegroundColor Green
            $Added++
        } catch {
            Write-Host "  Failed: $Computer - $_" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "✓ Added $Added computer(s) to '${collectionName}'" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to add computers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-remove-from-collection',
    name: 'Remove Computer from Collection',
    category: 'Target Management',
    description: 'Remove computers from an existing collection',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'My-Collection' },
      { id: 'computers', label: 'Computers (comma-separated)', type: 'textarea', required: true, placeholder: 'PC01, PC02' }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const computersRaw = (params.computers as string).split(',').map((n: string) => n.trim());
      
      return `# PDQ Inventory - Remove from Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Collection = Get-PDQCollection -Name "${collectionName}"
    
    if (-not $Collection) {
        throw "Collection '${collectionName}' not found"
    }
    
    if ($Collection.Type -ne 'Static') {
        throw "Cannot manually remove computers from dynamic collection"
    }
    
    $Computers = @(${computersRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $Removed = 0
    
    foreach ($Computer in $Computers) {
        try {
            Remove-PDQCollectionMember -Collection $Collection -Computer $Computer
            Write-Host "  Removed: $Computer" -ForegroundColor Yellow
            $Removed++
        } catch {
            Write-Host "  Failed: $Computer - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ Removed $Removed computer(s) from '${collectionName}'" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to remove computers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-list-collections',
    name: 'List All Collections',
    category: 'Target Management',
    description: 'List all PDQ collections with member counts',
    parameters: [
      { id: 'filter', label: 'Name Filter (optional)', type: 'text', required: false, placeholder: 'Department' },
      { id: 'collectionType', label: 'Collection Type', type: 'select', required: false, options: ['All', 'Static', 'Dynamic'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const filter = params.filter ? escapePowerShellString(params.filter) : '';
      const collectionType = params.collectionType;
      
      return `# PDQ Inventory - List Collections
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Collections = Get-PDQCollection
${filter ? `    $Collections = $Collections | Where-Object { $_.Name -like "*${filter}*" }` : ''}
${collectionType !== 'All' ? `    $Collections = $Collections | Where-Object { $_.Type -eq "${collectionType}" }` : ''}
    
    $CollectionInfo = $Collections | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.Name
            Type = $_.Type
            Members = (Get-PDQCollectionMember -Collection $_).Count
            Description = $_.Description
        }
    } | Sort-Object Name
    
    $CollectionInfo | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Collections: $($CollectionInfo.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list collections: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-delete-collection',
    name: 'Delete Collection',
    category: 'Target Management',
    description: 'Delete a PDQ collection',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Old-Collection' },
      { id: 'confirm', label: 'Confirm Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const confirm = params.confirm;
      
      return `# PDQ Inventory - Delete Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Collection = Get-PDQCollection -Name "${collectionName}"
    
    if (-not $Collection) {
        throw "Collection '${collectionName}' not found"
    }
    
${confirm ? '' : `    Write-Host "⚠ Deletion not confirmed. Set 'Confirm Deletion' to true to proceed." -ForegroundColor Yellow
    return
`}
    $MemberCount = (Get-PDQCollectionMember -Collection $Collection).Count
    Write-Host "Collection '${collectionName}' has $MemberCount members" -ForegroundColor Cyan
    
    Remove-PDQCollection -Collection $Collection -Force
    
    Write-Host "✓ Collection '${collectionName}' deleted!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to delete collection: $_"
}`;
    },
    isPremium: true
  },

  // ==================== ADMINISTRATION ====================
  {
    id: 'pdq-manage-credentials',
    name: 'Manage Deployment Credentials',
    category: 'Administration',
    description: 'Add or update deployment credentials for PDQ',
    parameters: [
      { id: 'credentialName', label: 'Credential Name', type: 'text', required: true, placeholder: 'DomainAdmin' },
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'DOMAIN\\Admin' }
    ],
    scriptTemplate: (params) => {
      const credentialName = escapePowerShellString(params.credentialName);
      const username = escapePowerShellString(params.username);
      
      return `# PDQ Deploy - Manage Credentials
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $SecurePassword = Read-Host "Enter password for ${username}" -AsSecureString
    $Credential = New-Object System.Management.Automation.PSCredential("${username}", $SecurePassword)
    
    Set-PDQCredential -Name "${credentialName}" -Credential $Credential
    
    Write-Host "✓ Credential '${credentialName}' saved successfully!" -ForegroundColor Green
    Write-Host "  Username: ${username}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to save credential: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-configure-repository',
    name: 'Configure Repository Paths',
    category: 'Administration',
    description: 'Configure PDQ Deploy repository paths for package storage',
    parameters: [
      { id: 'repositoryPath', label: 'Repository Path', type: 'path', required: true, placeholder: '\\\\Server\\PDQRepository' },
      { id: 'repositoryName', label: 'Repository Name', type: 'text', required: true, placeholder: 'Main-Repository' }
    ],
    scriptTemplate: (params) => {
      const repositoryPath = escapePowerShellString(params.repositoryPath);
      const repositoryName = escapePowerShellString(params.repositoryName);
      
      return `# PDQ Deploy - Configure Repository
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    if (Test-Path "${repositoryPath}") {
        Set-PDQPreference -Name "RepositoryPath" -Value "${repositoryPath}"
        Set-PDQPreference -Name "RepositoryName" -Value "${repositoryName}"
        
        Write-Host "✓ Repository configured successfully!" -ForegroundColor Green
        Write-Host "  Name: ${repositoryName}" -ForegroundColor Cyan
        Write-Host "  Path: ${repositoryPath}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Warning: Repository path not accessible: ${repositoryPath}" -ForegroundColor Yellow
        Write-Host "  Please ensure the path exists and you have permissions" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Repository configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-backup-database',
    name: 'Backup PDQ Database',
    category: 'Administration',
    description: 'Create a backup of the PDQ database',
    parameters: [
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: true, placeholder: 'C:\\Backups\\PDQ' },
      { id: 'backupType', label: 'Backup Type', type: 'select', required: true, options: ['Deploy', 'Inventory', 'Both'], defaultValue: 'Both' }
    ],
    scriptTemplate: (params) => {
      const backupPath = escapePowerShellString(params.backupPath);
      const backupType = params.backupType;
      
      return `# PDQ - Backup Database
# Generated: ${new Date().toISOString()}

try {
    $BackupPath = "${backupPath}"
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
    
    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }
    
${backupType === 'Both' || backupType === 'Deploy' ? `    # Backup PDQ Deploy database
    $DeployDB = "$env:ProgramData\\Admin Arsenal\\PDQ Deploy\\Database.db"
    if (Test-Path $DeployDB) {
        $DeployBackup = Join-Path $BackupPath "PDQDeploy_$Timestamp.db"
        Copy-Item $DeployDB $DeployBackup -Force
        Write-Host "✓ PDQ Deploy database backed up" -ForegroundColor Green
        Write-Host "  File: $DeployBackup" -ForegroundColor Cyan
    }
` : ''}
${backupType === 'Both' || backupType === 'Inventory' ? `    # Backup PDQ Inventory database
    $InventoryDB = "$env:ProgramData\\Admin Arsenal\\PDQ Inventory\\Database.db"
    if (Test-Path $InventoryDB) {
        $InventoryBackup = Join-Path $BackupPath "PDQInventory_$Timestamp.db"
        Copy-Item $InventoryDB $InventoryBackup -Force
        Write-Host "✓ PDQ Inventory database backed up" -ForegroundColor Green
        Write-Host "  File: $InventoryBackup" -ForegroundColor Cyan
    }
` : ''}
    Write-Host ""
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Backup failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-configure-auto-deployment',
    name: 'Configure Auto-Deployment',
    category: 'Administration',
    description: 'Set up automatic deployment triggers for new computers',
    parameters: [
      { id: 'triggerName', label: 'Trigger Name', type: 'text', required: true, placeholder: 'New-Computer-Setup' },
      { id: 'packageName', label: 'Package to Deploy', type: 'text', required: true, placeholder: 'Base-Software-Package' },
      { id: 'collectionName', label: 'Target Collection', type: 'text', required: true, placeholder: 'New-Computers' },
      { id: 'delayMinutes', label: 'Delay After Detection (minutes)', type: 'number', required: false, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const triggerName = escapePowerShellString(params.triggerName);
      const packageName = escapePowerShellString(params.packageName);
      const collectionName = escapePowerShellString(params.collectionName);
      const delayMinutes = params.delayMinutes || 5;
      
      return `# PDQ Deploy - Configure Auto-Deployment
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy
Import-Module PDQInventory

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Collection = Get-PDQCollection -Name "${collectionName}"
    
    $TriggerParams = @{
        Name = "${triggerName}"
        Package = $Package
        Collection = $Collection
        TriggerType = "CollectionMemberAdded"
        DelayMinutes = ${delayMinutes}
        Enabled = $true
    }
    
    New-PDQAutoDeployment @TriggerParams
    
    Write-Host "✓ Auto-deployment trigger '${triggerName}' created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Package: ${packageName}"
    Write-Host "  Collection: ${collectionName}"
    Write-Host "  Delay: ${delayMinutes} minutes"
    Write-Host "  Status: Enabled"
    
} catch {
    Write-Error "Failed to configure auto-deployment: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-configure-preferences',
    name: 'Configure PDQ Preferences',
    category: 'Administration',
    description: 'Configure PDQ Deploy and Inventory preferences',
    parameters: [
      { id: 'concurrentDeployments', label: 'Max Concurrent Deployments', type: 'number', required: false, defaultValue: 8 },
      { id: 'deployTimeout', label: 'Default Deploy Timeout (minutes)', type: 'number', required: false, defaultValue: 60 },
      { id: 'scanTimeout', label: 'Default Scan Timeout (minutes)', type: 'number', required: false, defaultValue: 30 },
      { id: 'keepHistoryDays', label: 'Keep History (days)', type: 'number', required: false, defaultValue: 90 }
    ],
    scriptTemplate: (params) => {
      const concurrent = params.concurrentDeployments || 8;
      const deployTimeout = params.deployTimeout || 60;
      const scanTimeout = params.scanTimeout || 30;
      const historyDays = params.keepHistoryDays || 90;
      
      return `# PDQ - Configure Preferences
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy
Import-Module PDQInventory

try {
    # PDQ Deploy Preferences
    Set-PDQPreference -Name "MaxConcurrentDeployments" -Value ${concurrent}
    Set-PDQPreference -Name "DefaultTimeout" -Value ${deployTimeout}
    Set-PDQPreference -Name "KeepHistoryDays" -Value ${historyDays}
    
    Write-Host "✓ PDQ Deploy preferences updated:" -ForegroundColor Green
    Write-Host "  Max Concurrent: ${concurrent}"
    Write-Host "  Default Timeout: ${deployTimeout} minutes"
    Write-Host "  Keep History: ${historyDays} days"
    
    # PDQ Inventory Preferences
    Set-PDQInventoryPreference -Name "DefaultScanTimeout" -Value ${scanTimeout}
    Set-PDQInventoryPreference -Name "KeepHistoryDays" -Value ${historyDays}
    
    Write-Host ""
    Write-Host "✓ PDQ Inventory preferences updated:" -ForegroundColor Green
    Write-Host "  Default Scan Timeout: ${scanTimeout} minutes"
    Write-Host "  Keep History: ${historyDays} days"
    
} catch {
    Write-Error "Failed to configure preferences: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-view-deployment-queue',
    name: 'View Deployment Queue',
    category: 'Administration',
    description: 'View currently queued and running deployments',
    parameters: [
      { id: 'showRunningOnly', label: 'Show Running Only', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const showRunningOnly = params.showRunningOnly;
      
      return `# PDQ Deploy - View Deployment Queue
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Queue = Get-PDQDeployment | Where-Object { 
        $_.Status -eq 'Running' -or $_.Status -eq 'Queued' 
    }
${showRunningOnly ? `    $Queue = $Queue | Where-Object { $_.Status -eq 'Running' }` : ''}
    
    if ($Queue.Count -eq 0) {
        Write-Host "No deployments currently in queue" -ForegroundColor Yellow
        return
    }
    
    $Queue | Sort-Object StartTime | Format-Table -AutoSize \`
        @{N='ID';E={$_.Id}},
        Package,
        Target,
        Status,
        @{N='Started';E={$_.StartTime.ToString('HH:mm:ss')}},
        @{N='Duration';E={
            if ($_.Status -eq 'Running') {
                ((Get-Date) - $_.StartTime).ToString('mm\\:ss')
            } else { 'Queued' }
        }}
    
    $Running = ($Queue | Where-Object Status -eq 'Running').Count
    $Queued = ($Queue | Where-Object Status -eq 'Queued').Count
    
    Write-Host ""
    Write-Host "Queue Summary:" -ForegroundColor Cyan
    Write-Host "  Running: $Running"
    Write-Host "  Queued: $Queued"
    
} catch {
    Write-Error "Failed to get queue: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-cleanup-old-deployments',
    name: 'Cleanup Old Deployment History',
    category: 'Administration',
    description: 'Remove old deployment history to optimize database',
    parameters: [
      { id: 'daysToKeep', label: 'Days to Keep', type: 'number', required: true, defaultValue: 90 },
      { id: 'confirm', label: 'Confirm Cleanup', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const daysToKeep = params.daysToKeep || 90;
      const confirm = params.confirm;
      
      return `# PDQ Deploy - Cleanup Old History
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $CutoffDate = (Get-Date).AddDays(-${daysToKeep})
    
    $OldDeployments = Get-PDQDeployment | Where-Object { $_.StartTime -lt $CutoffDate }
    
    Write-Host "Found $($OldDeployments.Count) deployments older than ${daysToKeep} days" -ForegroundColor Cyan
    
${confirm ? '' : `    Write-Host ""
    Write-Host "⚠ Cleanup not confirmed. Set 'Confirm Cleanup' to true to proceed." -ForegroundColor Yellow
    return
`}
    if ($OldDeployments.Count -eq 0) {
        Write-Host "No old deployments to clean up" -ForegroundColor Green
        return
    }
    
    Clear-PDQDeploymentHistory -Before $CutoffDate -Force
    
    Write-Host ""
    Write-Host "✓ Cleaned up $($OldDeployments.Count) old deployment records" -ForegroundColor Green
    Write-Host "  Kept deployments from the last ${daysToKeep} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Cleanup failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-test-connectivity',
    name: 'Test Target Connectivity',
    category: 'Administration',
    description: 'Test PDQ connectivity to target computers',
    parameters: [
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'testWMI', label: 'Test WMI', type: 'boolean', required: false, defaultValue: true },
      { id: 'testAdminShare', label: 'Test Admin Share (C$)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const testWMI = params.testWMI;
      const testAdminShare = params.testAdminShare;
      
      return `# PDQ - Test Target Connectivity
# Generated: ${new Date().toISOString()}

try {
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    $Results = foreach ($Target in $Targets) {
        $Result = [PSCustomObject]@{
            Computer = $Target
            Ping = $false
            WMI = 'N/A'
            AdminShare = 'N/A'
        }
        
        # Test Ping
        $Result.Ping = Test-Connection -ComputerName $Target -Count 1 -Quiet
        
        if ($Result.Ping) {
${testWMI ? `            # Test WMI
            try {
                Get-WmiObject -Class Win32_OperatingSystem -ComputerName $Target -ErrorAction Stop | Out-Null
                $Result.WMI = 'OK'
            } catch {
                $Result.WMI = 'Failed'
            }` : ''}
            
${testAdminShare ? `            # Test Admin Share
            $AdminPath = "\\\\$Target\\C$"
            if (Test-Path $AdminPath -ErrorAction SilentlyContinue) {
                $Result.AdminShare = 'OK'
            } else {
                $Result.AdminShare = 'Failed'
            }` : ''}
        }
        
        $Result
    }
    
    $Results | Format-Table -AutoSize
    
    $Online = ($Results | Where-Object Ping -eq $true).Count
    $Offline = ($Results | Where-Object Ping -eq $false).Count
    
    Write-Host ""
    Write-Host "Connectivity Summary:" -ForegroundColor Cyan
    Write-Host "  Online: $Online" -ForegroundColor Green
    Write-Host "  Offline: $Offline" -ForegroundColor $(if ($Offline -gt 0) { 'Red' } else { 'Green' })
    
} catch {
    Write-Error "Connectivity test failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-export-settings',
    name: 'Export PDQ Settings',
    category: 'Administration',
    description: 'Export PDQ settings and preferences to a file',
    parameters: [
      { id: 'exportPath', label: 'Export File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\PDQ-Settings.xml' },
      { id: 'includeCredentials', label: 'Include Credentials', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const includeCredentials = params.includeCredentials;
      
      return `# PDQ - Export Settings
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy
Import-Module PDQInventory

try {
    $Settings = @{
        ExportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        DeployPreferences = Get-PDQPreference
        InventoryPreferences = Get-PDQInventoryPreference
        Schedules = Get-PDQSchedule | Select-Object Name, Enabled, NextRun
        ScanProfiles = Get-PDQScanProfile | Select-Object Name
${includeCredentials ? `        Credentials = Get-PDQCredential | Select-Object Name, Username` : ''}
    }
    
    $Settings | Export-Clixml -Path "${exportPath}"
    
    Write-Host "✓ PDQ settings exported!" -ForegroundColor Green
    Write-Host "  File: ${exportPath}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Exported:" -ForegroundColor Cyan
    Write-Host "  Deploy Preferences"
    Write-Host "  Inventory Preferences"
    Write-Host "  $($Settings.Schedules.Count) Schedules"
    Write-Host "  $($Settings.ScanProfiles.Count) Scan Profiles"
${includeCredentials ? `    Write-Host "  $($Settings.Credentials.Count) Credentials (names only)"` : ''}
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-license-status',
    name: 'View License Status',
    category: 'Administration',
    description: 'View PDQ Deploy and Inventory license information',
    parameters: [],
    scriptTemplate: () => {
      return `# PDQ - View License Status
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy
Import-Module PDQInventory

try {
    Write-Host "PDQ Deploy License:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    $DeployLicense = Get-PDQLicense
    Write-Host "  Edition: $($DeployLicense.Edition)"
    Write-Host "  Licensed To: $($DeployLicense.LicensedTo)"
    Write-Host "  Expiration: $($DeployLicense.ExpirationDate.ToString('yyyy-MM-dd'))"
    Write-Host "  Mode: $(if ($DeployLicense.Mode -eq 'Enterprise') { 'Enterprise' } else { 'Standard' })"
    
    Write-Host ""
    Write-Host "PDQ Inventory License:" -ForegroundColor Cyan
    Write-Host "=======================" -ForegroundColor Cyan
    $InventoryLicense = Get-PDQInventoryLicense
    Write-Host "  Edition: $($InventoryLicense.Edition)"
    Write-Host "  Licensed To: $($InventoryLicense.LicensedTo)"
    Write-Host "  Expiration: $($InventoryLicense.ExpirationDate.ToString('yyyy-MM-dd'))"
    
    # Check expiration
    $DaysToExpiry = ($DeployLicense.ExpirationDate - (Get-Date)).Days
    if ($DaysToExpiry -lt 30) {
        Write-Host ""
        Write-Host "⚠ License expires in $DaysToExpiry days!" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to retrieve license info: $_"
}`;
    },
    isPremium: true
  }
];
