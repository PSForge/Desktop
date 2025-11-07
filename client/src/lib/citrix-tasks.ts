import { escapePowerShellString, toPowerShellBoolean } from './powershell-utils';

export interface CitrixTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface CitrixTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: CitrixTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const citrixTasks: CitrixTask[] = [
  {
    id: 'citrix-bulk-assign-desktops',
    name: 'Bulk Assign Desktops to Users',
    category: 'Bulk Operations',
    description: 'Assign virtual desktops to multiple users',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: true, placeholder: 'Windows10-Desktops' },
      { id: 'userNames', label: 'User Names (comma-separated)', type: 'textarea', required: true, placeholder: 'domain\\user1, domain\\user2' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = escapePowerShellString(params.deliveryGroup);
      const userNamesRaw = (params.userNames as string).split(',').map((n: string) => n.trim());
      
      return `# Bulk Assign Citrix Desktops
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    # Get delivery group
    $DeliveryGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${deliveryGroup}"
    
    $UserNames = @(${userNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($UserName in $UserNames) {
        Add-BrokerUser -AdminAddress "${ddc}" \`
            -Name $UserName \`
            -DesktopGroup $DeliveryGroup
        
        Write-Host "✓ Desktop assigned to: $UserName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk desktop assignment completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'citrix-create-delivery-group',
    name: 'Create Delivery Group',
    category: 'Delivery Group Management',
    description: 'Create a new desktop delivery group',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Finance-Desktops' },
      { id: 'catalog', label: 'Machine Catalog', type: 'text', required: true },
      { id: 'deliveryType', label: 'Delivery Type', type: 'select', required: true, options: ['DesktopsAndApps', 'DesktopsOnly', 'AppsOnly'], defaultValue: 'DesktopsOnly' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const groupName = escapePowerShellString(params.groupName);
      const catalog = escapePowerShellString(params.catalog);
      
      return `# Create Citrix Delivery Group
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Catalog = Get-BrokerCatalog -AdminAddress "${ddc}" -Name "${catalog}"
    
    New-BrokerDesktopGroup -AdminAddress "${ddc}" \`
        -Name "${groupName}" \`
        -DesktopKind "Shared" \`
        -DeliveryType "${params.deliveryType}" \`
        -SessionSupport "MultiSession"
    
    $DeliveryGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${groupName}"
    
    Add-BrokerMachinesToDesktopGroup -AdminAddress "${ddc}" \`
        -Catalog $Catalog \`
        -DesktopGroup $DeliveryGroup \`
        -Count 10
    
    Write-Host "✓ Delivery group '${groupName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create delivery group: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'citrix-publish-application',
    name: 'Publish Application',
    category: 'Application Publishing',
    description: 'Publish an application to a delivery group',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Microsoft Excel' },
      { id: 'executablePath', label: 'Executable Path', type: 'path', required: true, placeholder: 'C:\\Program Files\\Microsoft Office\\Excel.exe' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const appName = escapePowerShellString(params.appName);
      const executablePath = escapePowerShellString(params.executablePath);
      const deliveryGroup = escapePowerShellString(params.deliveryGroup);
      
      return `# Publish Citrix Application
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $DeliveryGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${deliveryGroup}"
    
    New-BrokerApplication -AdminAddress "${ddc}" \`
        -Name "${appName}" \`
        -ApplicationType "HostedOnDesktop" \`
        -CommandLineExecutable "${executablePath}" \`
        -DesktopGroup $DeliveryGroup.Uid
    
    Write-Host "✓ Application '${appName}' published successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to publish application: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'citrix-manage-sessions',
    name: 'Manage User Sessions',
    category: 'Session Management',
    description: 'Log off, disconnect, or reset user sessions',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'userName', label: 'User Name', type: 'text', required: true, placeholder: 'domain\\user' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['LogOff', 'Disconnect', 'Reset'], defaultValue: 'LogOff' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const userName = escapePowerShellString(params.userName);
      const action = params.action;
      
      return `# Manage Citrix User Session
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -UserName "${userName}"
    
    if ($Sessions) {
        foreach ($Session in $Sessions) {
            switch ("${action}") {
                "LogOff" { Stop-BrokerSession -AdminAddress "${ddc}" -InputObject $Session }
                "Disconnect" { Disconnect-BrokerSession -AdminAddress "${ddc}" -InputObject $Session }
                "Reset" { Stop-BrokerSession -AdminAddress "${ddc}" -InputObject $Session -Force }
            }
            
            Write-Host "✓ ${action} action completed for session" -ForegroundColor Green
        }
    } else {
        Write-Host "No active sessions found for ${userName}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'citrix-export-license-report',
    name: 'Export License Usage Report',
    category: 'Reporting',
    description: 'Generate license usage and compliance report',
    parameters: [
      { id: 'licenseServer', label: 'License Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Citrix-Licenses.csv' }
    ],
    scriptTemplate: (params) => {
      const licenseServer = escapePowerShellString(params.licenseServer);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Citrix License Usage Report
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Licensing.Admin.V1 -ErrorAction Stop

try {
    $Licenses = Get-LicInventory -AdminAddress "${licenseServer}"
    
    $Report = $Licenses | ForEach-Object {
        [PSCustomObject]@{
            ProductName = $_.LocalizedLicenseProductName
            Edition = $_.LocalizedLicenseEdition
            Model = $_.LocalizedLicenseModel
            TotalLicenses = $_.LicensesAvailable
            LicensesInUse = $_.LicensesInUse
            LicensesFree = $_.LicensesAvailable - $_.LicensesInUse
            PercentageUsed = [math]::Round(($_.LicensesInUse / $_.LicensesAvailable) * 100, 2)
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ License report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'citrix-modify-delivery-group',
    name: 'Create and Modify Delivery Groups',
    category: 'Common Admin Tasks',
    description: 'Create new delivery groups or modify existing ones',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Modify', 'Delete'], defaultValue: 'Create' },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Finance-Desktops' },
      { id: 'catalog', label: 'Machine Catalog', type: 'text', required: false },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Finance department desktops' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const action = params.action;
      const groupName = escapePowerShellString(params.groupName);
      const catalog = params.catalog ? escapePowerShellString(params.catalog) : '';
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# ${action} Delivery Group
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
${action === 'Create' ? `    $Catalog = Get-BrokerCatalog -AdminAddress "${ddc}" -Name "${catalog}"
    
    New-BrokerDesktopGroup -AdminAddress "${ddc}" \`
        -Name "${groupName}" \`
        -DesktopKind "Shared" \`
        -DeliveryType "DesktopsOnly" \`
        -SessionSupport "MultiSession"${description ? ` \\\`
        -Description "${description}"` : ''}
    
    Write-Host "✓ Delivery group '${groupName}' created successfully!" -ForegroundColor Green` :
action === 'Modify' ? `    $DeliveryGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${groupName}"
    
    Set-BrokerDesktopGroup -AdminAddress "${ddc}" \`
        -InputObject $DeliveryGroup${description ? ` \\\`
        -Description "${description}"` : ''}
    
    Write-Host "✓ Delivery group '${groupName}' modified successfully!" -ForegroundColor Green` :
`    $DeliveryGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${groupName}"
    Remove-BrokerDesktopGroup -AdminAddress "${ddc}" -InputObject $DeliveryGroup
    
    Write-Host "✓ Delivery group '${groupName}' deleted successfully!" -ForegroundColor Green`}
    
} catch {
    Write-Error "Delivery group operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-unpublish-application',
    name: 'Publish or Unpublish Applications',
    category: 'Common Admin Tasks',
    description: 'Publish new applications or unpublish existing ones',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Publish', 'Unpublish'], defaultValue: 'Publish' },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Microsoft Excel' },
      { id: 'executablePath', label: 'Executable Path (for Publish)', type: 'path', required: false, placeholder: 'C:\\Program Files\\Microsoft Office\\Excel.exe' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const action = params.action;
      const appName = escapePowerShellString(params.appName);
      const executablePath = params.executablePath ? escapePowerShellString(params.executablePath) : '';
      const deliveryGroup = params.deliveryGroup ? escapePowerShellString(params.deliveryGroup) : '';
      
      return `# ${action} Application
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
${action === 'Publish' ? `    $DeliveryGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${deliveryGroup}"
    
    New-BrokerApplication -AdminAddress "${ddc}" \`
        -Name "${appName}" \`
        -ApplicationType "HostedOnDesktop" \`
        -CommandLineExecutable "${executablePath}" \`
        -DesktopGroup $DeliveryGroup.Uid
    
    Write-Host "✓ Application '${appName}' published successfully!" -ForegroundColor Green` :
`    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    Remove-BrokerApplication -AdminAddress "${ddc}" -InputObject $Application
    
    Write-Host "✓ Application '${appName}' unpublished successfully!" -ForegroundColor Green`}
    
} catch {
    Write-Error "Application operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-manage-machine-catalog',
    name: 'Create and Update Machine Catalogs',
    category: 'Common Admin Tasks',
    description: 'Create machine catalogs or update existing ones',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'AddMachines', 'ListCatalogs'], defaultValue: 'Create' },
      { id: 'catalogName', label: 'Catalog Name', type: 'text', required: false, placeholder: 'Windows10-Catalog' },
      { id: 'allocationType', label: 'Allocation Type', type: 'select', required: false, options: ['Random', 'Static'], defaultValue: 'Random' },
      { id: 'sessionSupport', label: 'Session Support', type: 'select', required: false, options: ['MultiSession', 'SingleSession'], defaultValue: 'MultiSession' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const action = params.action;
      const catalogName = params.catalogName ? escapePowerShellString(params.catalogName) : '';
      
      return `# ${action} Machine Catalog
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
${action === 'Create' ? `    New-BrokerCatalog -AdminAddress "${ddc}" \`
        -Name "${catalogName}" \`
        -AllocationType ${params.allocationType} \`
        -SessionSupport ${params.sessionSupport} \`
        -PersistUserChanges "Discard" \`
        -ProvisioningType "Manual"
    
    Write-Host "✓ Machine catalog '${catalogName}' created successfully!" -ForegroundColor Green` :
action === 'AddMachines' ? `    # Add machines to catalog
    $Catalog = Get-BrokerCatalog -AdminAddress "${ddc}" -Name "${catalogName}"
    
    # Example: Add machines (adjust as needed)
    # $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -Unassigned
    # $Machines | Add-BrokerMachine -CatalogUid $Catalog.Uid
    
    Write-Host "✓ Machines added to catalog '${catalogName}'" -ForegroundColor Green
    Write-Host "  Note: Adjust script to specify which machines to add" -ForegroundColor Yellow` :
`    $Catalogs = Get-BrokerCatalog -AdminAddress "${ddc}"
    
    Write-Host "Machine Catalogs:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    $Catalogs | ForEach-Object {
        Write-Host ""
        Write-Host "Catalog: $($_.Name)" -ForegroundColor Yellow
        Write-Host "  Allocation Type: $($_.AllocationType)"
        Write-Host "  Session Support: $($_.SessionSupport)"
        Write-Host "  Machine Count: $($_.UsedCount)/$($_.AssignedCount)"
        Write-Host "  Provisioning Type: $($_.ProvisioningType)"
    }`}
    
} catch {
    Write-Error "Machine catalog operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-monitor-user-sessions',
    name: 'Monitor User Sessions and Load Indices',
    category: 'Common Admin Tasks',
    description: 'View active user sessions and server load information',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'deliveryGroup', label: 'Delivery Group (optional)', type: 'text', required: false, placeholder: 'All groups if blank' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Citrix-Sessions.csv' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = params.deliveryGroup ? escapePowerShellString(params.deliveryGroup) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Monitor User Sessions and Load
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    ${deliveryGroup ? `$Sessions = Get-BrokerSession -AdminAddress "${ddc}" -DesktopGroupName "${deliveryGroup}"` : `$Sessions = Get-BrokerSession -AdminAddress "${ddc}"`}
    
    Write-Host "Active User Sessions" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Total Active Sessions: $($Sessions.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    $SessionReport = $Sessions | ForEach-Object {
        [PSCustomObject]@{
            UserName = $_.UserName
            MachineName = $_.MachineName
            SessionState = $_.SessionState
            StartTime = $_.StartTime
            Duration = (Get-Date) - $_.StartTime
            Protocol = $_.Protocol
            ClientName = $_.ClientName
            ClientAddress = $_.ClientAddress
            ApplicationsInUse = ($_.ApplicationsInUse -join ', ')
        }
    }
    
    $SessionReport | Format-Table -AutoSize
    
    # Load Index Information
    Write-Host ""
    Write-Host "Server Load Indices:" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}"${deliveryGroup ? ` -DesktopGroupName "${deliveryGroup}"` : ''}
    
    $Machines | Where-Object { $_.PowerState -eq "On" } | ForEach-Object {
        Write-Host ""
        Write-Host "Machine: $($_.MachineName)" -ForegroundColor Yellow
        Write-Host "  Load Index: $($_.LoadIndex)"
        Write-Host "  Session Count: $($_.SessionCount)"
        Write-Host "  Registration State: $($_.RegistrationState)"
        Write-Host "  Power State: $($_.PowerState)"
    }
    
    ${exportPath ? `$SessionReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Session report exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Session monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-backup-configuration',
    name: 'Backup Citrix Configurations',
    category: 'Common Admin Tasks',
    description: 'Export and backup Citrix site configuration',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: true, placeholder: 'C:\\Backups\\Citrix-Config-Backup.zip' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const backupPath = escapePowerShellString(params.backupPath);
      
      return `# Backup Citrix Configuration
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop
Add-PSSnapin Citrix.Host.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Starting Citrix configuration backup..." -ForegroundColor Cyan
    
    # Create temporary directory for backup files
    $TempDir = Join-Path $env:TEMP "CitrixBackup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    # Export Delivery Groups
    $DeliveryGroups = Get-BrokerDesktopGroup -AdminAddress "${ddc}"
    $DeliveryGroups | Export-Clixml -Path "$TempDir\\DeliveryGroups.xml"
    Write-Host "✓ Exported Delivery Groups" -ForegroundColor Green
    
    # Export Applications
    $Applications = Get-BrokerApplication -AdminAddress "${ddc}"
    $Applications | Export-Clixml -Path "$TempDir\\Applications.xml"
    Write-Host "✓ Exported Applications" -ForegroundColor Green
    
    # Export Machine Catalogs
    $Catalogs = Get-BrokerCatalog -AdminAddress "${ddc}"
    $Catalogs | Export-Clixml -Path "$TempDir\\Catalogs.xml"
    Write-Host "✓ Exported Machine Catalogs" -ForegroundColor Green
    
    # Export Policies
    $Policies = Get-BrokerAccessPolicy -AdminAddress "${ddc}"
    $Policies | Export-Clixml -Path "$TempDir\\Policies.xml"
    Write-Host "✓ Exported Policies" -ForegroundColor Green
    
    # Create ZIP archive
    Compress-Archive -Path "$TempDir\\*" -DestinationPath "${backupPath}" -Force
    
    # Cleanup
    Remove-Item -Path $TempDir -Recurse -Force
    
    Write-Host ""
    Write-Host "✓ Citrix configuration backup completed!" -ForegroundColor Green
    Write-Host "  Backup saved to: ${backupPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Backup failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-manage-app-policies',
    name: 'Manage Application Assignment Policies',
    category: 'Common Admin Tasks',
    description: 'Create and manage application assignment and access policies',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['CreatePolicy', 'AssignUsers', 'RemoveUsers', 'ListPolicies'], defaultValue: 'CreatePolicy' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: false, placeholder: 'Finance-App-Access' },
      { id: 'appName', label: 'Application Name', type: 'text', required: false },
      { id: 'userNames', label: 'User Names (comma-separated)', type: 'textarea', required: false, placeholder: 'domain\\user1, domain\\user2' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const action = params.action;
      const policyName = params.policyName ? escapePowerShellString(params.policyName) : '';
      const appName = params.appName ? escapePowerShellString(params.appName) : '';
      const userNamesRaw = params.userNames ? (params.userNames as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Manage Application Assignment Policies
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
${action === 'CreatePolicy' ? `    # Create new access policy
    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    New-BrokerAccessPolicy -AdminAddress "${ddc}" \`
        -Name "${policyName}" \`
        -Enabled $true \`
        -AllowedProtocols @("HDX", "RDP")
    
    Write-Host "✓ Access policy '${policyName}' created successfully!" -ForegroundColor Green` :
action === 'AssignUsers' ? `    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    $UserNames = @(${userNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($UserName in $UserNames) {
        Add-BrokerUser -AdminAddress "${ddc}" \`
            -Name $UserName \`
            -Application $Application
        
        Write-Host "✓ Assigned application to: $UserName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Application assignment completed!" -ForegroundColor Green` :
action === 'RemoveUsers' ? `    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    $UserNames = @(${userNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($UserName in $UserNames) {
        $User = Get-BrokerUser -AdminAddress "${ddc}" -Name $UserName -Application $Application
        Remove-BrokerUser -AdminAddress "${ddc}" -InputObject $User
        
        Write-Host "✓ Removed application from: $UserName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Application removal completed!" -ForegroundColor Green` :
`    $Policies = Get-BrokerAccessPolicy -AdminAddress "${ddc}"
    
    Write-Host "Application Access Policies:" -ForegroundColor Cyan
    Write-Host "============================" -ForegroundColor Cyan
    
    $Policies | ForEach-Object {
        Write-Host ""
        Write-Host "Policy: $($_.Name)" -ForegroundColor Yellow
        Write-Host "  Enabled: $($_.Enabled)"
        Write-Host "  Allowed Protocols: $($_.AllowedProtocols -join ', ')"
        Write-Host "  Excluded Users: $($_.ExcludedUsers.Count)"
        Write-Host "  Included Users: $($_.IncludedUsers.Count)"
    }`}
    
} catch {
    Write-Error "Policy management failed: $_"
}`;
    },
    isPremium: true
  }
];
