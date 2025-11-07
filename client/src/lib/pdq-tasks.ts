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
  {
    id: 'pdq-bulk-deploy',
    name: 'Bulk Software Deployment',
    category: 'Bulk Operations',
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
    }
  ,
    isPremium: true
  },
  {
    id: 'pdq-create-package',
    name: 'Create Deployment Package',
    category: 'Package Management',
    description: 'Create a new deployment package',
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
    }
  ,
    isPremium: true
  },
  {
    id: 'pdq-inventory-scan',
    name: 'Run Inventory Scan',
    category: 'Inventory Management',
    description: 'Scan computers for software and hardware inventory',
    parameters: [
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'scanType', label: 'Scan Type', type: 'select', required: true, options: ['Software', 'Hardware', 'Both'], defaultValue: 'Both' }
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
    }
  ,
    isPremium: true
  },
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
    }
  ,
    isPremium: true
  },
  {
    id: 'pdq-edit-package',
    name: 'Edit Deployment Package',
    category: 'Common Admin Tasks',
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
    id: 'pdq-schedule-deployment',
    name: 'Schedule Software Deployments',
    category: 'Common Admin Tasks',
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
    id: 'pdq-build-dynamic-collection',
    name: 'Build Dynamic Collections for Patch Compliance',
    category: 'Common Admin Tasks',
    description: 'Create dynamic collections based on patch compliance status',
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Missing-Critical-Patches' },
      { id: 'patchSeverity', label: 'Patch Severity', type: 'select', required: true, options: ['Critical', 'Important', 'Moderate', 'Low', 'Any'], defaultValue: 'Critical' }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const patchSeverity = params.patchSeverity;
      
      return `# PDQ Inventory - Build Dynamic Collection
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Filter = @{
        Name = "${collectionName}"
        Type = "Dynamic"
        Criteria = @{
            Property = "MissingPatches"
            Operator = "GreaterThan"
            Value = 0
${patchSeverity !== 'Any' ? `            Severity = "${patchSeverity}"` : ''}
        }
    }
    
    New-PDQCollection @Filter
    
    Write-Host "✓ Dynamic collection '${collectionName}' created!" -ForegroundColor Green
    Write-Host "  Criteria: Computers missing ${patchSeverity} patches" -ForegroundColor Cyan
    
    $Members = Get-PDQCollectionMember -Collection "${collectionName}"
    Write-Host "  Current Members: $($Members.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Collection creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'pdq-export-hardware-report',
    name: 'Generate Hardware Inventory Reports',
    category: 'Common Admin Tasks',
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
    id: 'pdq-manage-credentials',
    name: 'Manage Deployment Credentials',
    category: 'Common Admin Tasks',
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
    # Prompt for password securely
    $SecurePassword = Read-Host "Enter password for ${username}" -AsSecureString
    $Credential = New-Object System.Management.Automation.PSCredential("${username}", $SecurePassword)
    
    # Add or update credential in PDQ
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
    category: 'Common Admin Tasks',
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
    # Test path accessibility
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
    id: 'pdq-integrate-ad-groups',
    name: 'Integrate PDQ with AD Groups',
    category: 'Common Admin Tasks',
    description: 'Create PDQ collections based on Active Directory groups',
    parameters: [
      { id: 'adGroupName', label: 'AD Group Name', type: 'text', required: true, placeholder: 'IT-Workstations' },
      { id: 'collectionName', label: 'PDQ Collection Name', type: 'text', required: true, placeholder: 'IT-Computers' }
    ],
    scriptTemplate: (params) => {
      const adGroupName = escapePowerShellString(params.adGroupName);
      const collectionName = escapePowerShellString(params.collectionName);
      
      return `# PDQ Inventory - Integrate with AD Groups
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory
Import-Module ActiveDirectory

try {
    # Get computers from AD group
    $ADComputers = Get-ADGroupMember -Identity "${adGroupName}" | 
        Where-Object { $_.objectClass -eq 'computer' } |
        Get-ADComputer |
        Select-Object -ExpandProperty Name
    
    Write-Host "Found $($ADComputers.Count) computers in AD group '${adGroupName}'" -ForegroundColor Cyan
    
    # Create PDQ collection
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
    id: 'pdq-export-compliance-report',
    name: 'Export Compliance Reports to CSV',
    category: 'Common Admin Tasks',
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
    Write-Host "  Compliant (≥${threshold}%): $CompliantCount" -ForegroundColor Green
    Write-Host "  Non-Compliant (<${threshold}%): $NonCompliantCount" -ForegroundColor Red
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  }
];
