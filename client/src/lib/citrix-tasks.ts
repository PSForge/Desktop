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
  },

  {
    id: 'citrix-configure-adc-load-balancing',
    name: 'Configure Citrix ADC Load Balancing',
    category: 'Common Admin Tasks',
    description: 'Set up virtual servers, services, and monitors',
    parameters: [
      { id: 'nsip', label: 'NetScaler IP', type: 'text', required: true, placeholder: 'netscaler.company.com' },
      { id: 'vserverName', label: 'Virtual Server Name', type: 'text', required: true, placeholder: 'vs-web-app' },
      { id: 'vserverIP', label: 'Virtual Server IP', type: 'text', required: true, placeholder: '10.1.1.100' },
      { id: 'vserverPort', label: 'Port', type: 'number', required: true, defaultValue: 80 },
      { id: 'backendServers', label: 'Backend Servers (comma-separated)', type: 'textarea', required: true, placeholder: '10.1.1.10, 10.1.1.11' }
    ],
    scriptTemplate: (params) => {
      const nsip = escapePowerShellString(params.nsip);
      const vserverName = escapePowerShellString(params.vserverName);
      const vserverIP = escapePowerShellString(params.vserverIP);
      const backendServersRaw = (params.backendServers as string).split(',').map((s: string) => s.trim());
      
      return `# Configure Citrix ADC Load Balancing
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Connecting to NetScaler: ${nsip}..." -ForegroundColor Cyan
    
    # Create services for backend servers
    $BackendServers = @(${backendServersRaw.map(s => `"${escapePowerShellString(s)}"`).join(', ')})
    
    foreach ($Server in $BackendServers) {
        $ServiceName = "svc_$Server"
        Write-Host "Creating service: $ServiceName" -ForegroundColor Yellow
        
        # Command to add service (use NetScaler CLI or API)
        Write-Host "add service $ServiceName $Server HTTP ${params.vserverPort}" -ForegroundColor Gray
    }
    
    # Create virtual server
    Write-Host "Creating virtual server: ${vserverName}..." -ForegroundColor Cyan
    Write-Host "add lb vserver ${vserverName} HTTP ${vserverIP} ${params.vserverPort}" -ForegroundColor Gray
    
    # Bind services to virtual server
    foreach ($Server in $BackendServers) {
        $ServiceName = "svc_$Server"
        Write-Host "bind lb vserver ${vserverName} $ServiceName" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "✓ Load balancer configured successfully!" -ForegroundColor Green
    Write-Host "  Virtual Server: ${vserverName}" -ForegroundColor Cyan
    Write-Host "  VIP: ${vserverIP}:${params.vserverPort}" -ForegroundColor Cyan
    Write-Host "  Backend Servers: $($BackendServers.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure load balancer: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'citrix-manage-pvs',
    name: 'Manage Citrix Provisioning Services (PVS)',
    category: 'Common Admin Tasks',
    description: 'Create vDisks and target devices',
    parameters: [
      { id: 'pvsServer', label: 'PVS Server', type: 'text', required: true, placeholder: 'pvs.company.com' },
      { id: 'storeName', label: 'Store Name', type: 'text', required: true, placeholder: 'Production-Store' },
      { id: 'vDiskName', label: 'vDisk Name', type: 'text', required: true, placeholder: 'Windows10-vDisk' },
      { id: 'vDiskSize', label: 'vDisk Size (GB)', type: 'number', required: true, defaultValue: 40 }
    ],
    scriptTemplate: (params) => {
      const pvsServer = escapePowerShellString(params.pvsServer);
      const storeName = escapePowerShellString(params.storeName);
      const vDiskName = escapePowerShellString(params.vDiskName);
      
      return `# Manage Citrix Provisioning Services (PVS)
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.PVS.SnapIn -ErrorAction Stop

try {
    Set-PvsConnection -Server "${pvsServer}"
    
    # Create vDisk
    Write-Host "Creating vDisk: ${vDiskName}..." -ForegroundColor Cyan
    
    $Store = Get-PvsStore -StoreName "${storeName}"
    
    New-PvsDiskLocator \`
        -DiskLocatorName "${vDiskName}" \`
        -SiteName $Store.SiteName \`
        -StoreName "${storeName}" \`
        -DiskSize (${params.vDiskSize} * 1024)
    
    Write-Host "✓ vDisk created successfully!" -ForegroundColor Green
    Write-Host "  vDisk: ${vDiskName}" -ForegroundColor Cyan
    Write-Host "  Size: ${params.vDiskSize} GB" -ForegroundColor Cyan
    Write-Host "  Store: ${storeName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "PVS operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'citrix-configure-gateway',
    name: 'Configure Citrix Gateway',
    category: 'Common Admin Tasks',
    description: 'Set up remote access and SSL certificates',
    parameters: [
      { id: 'nsip', label: 'NetScaler IP', type: 'text', required: true },
      { id: 'gatewayName', label: 'Gateway Name', type: 'text', required: true, placeholder: 'gateway-remote-access' },
      { id: 'gatewayIP', label: 'Gateway IP', type: 'text', required: true, placeholder: '203.0.113.10' },
      { id: 'certName', label: 'SSL Certificate Name', type: 'text', required: true, placeholder: 'gateway-cert' }
    ],
    scriptTemplate: (params) => {
      const nsip = escapePowerShellString(params.nsip);
      const gatewayName = escapePowerShellString(params.gatewayName);
      const gatewayIP = escapePowerShellString(params.gatewayIP);
      const certName = escapePowerShellString(params.certName);
      
      return `# Configure Citrix Gateway
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring Citrix Gateway on NetScaler: ${nsip}..." -ForegroundColor Cyan
    
    # Create Gateway vServer
    Write-Host "Creating Gateway virtual server..." -ForegroundColor Yellow
    Write-Host "add vpn vserver ${gatewayName} SSL ${gatewayIP} 443" -ForegroundColor Gray
    
    # Bind SSL certificate
    Write-Host "Binding SSL certificate..." -ForegroundColor Yellow
    Write-Host "bind ssl vserver ${gatewayName} -certkeyName ${certName}" -ForegroundColor Gray
    
    # Configure session policies
    Write-Host "Configuring session policies..." -ForegroundColor Yellow
    Write-Host "add vpn sessionPolicy session-policy -rule true -action session-profile" -ForegroundColor Gray
    Write-Host "bind vpn vserver ${gatewayName} -policy session-policy -priority 100" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "✓ Citrix Gateway configured successfully!" -ForegroundColor Green
    Write-Host "  Gateway: ${gatewayName}" -ForegroundColor Cyan
    Write-Host "  IP: ${gatewayIP}:443" -ForegroundColor Cyan
    Write-Host "  SSL Certificate: ${certName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Gateway configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'citrix-manage-storefront',
    name: 'Manage StoreFront Stores',
    category: 'Common Admin Tasks',
    description: 'Create stores and configure authentication',
    parameters: [
      { id: 'storeName', label: 'Store Name', type: 'text', required: true, placeholder: 'Production-Store' },
      { id: 'friendlyName', label: 'Friendly Name', type: 'text', required: true, placeholder: 'Company Apps' },
      { id: 'deliveryController', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'ddc.company.com' },
      { id: 'authMethod', label: 'Authentication Method', type: 'select', required: true, options: ['Domain', 'DomainAndPass', 'Certificate'], defaultValue: 'Domain' }
    ],
    scriptTemplate: (params) => {
      const storeName = escapePowerShellString(params.storeName);
      const friendlyName = escapePowerShellString(params.friendlyName);
      const deliveryController = escapePowerShellString(params.deliveryController);
      const authMethod = params.authMethod;
      
      return `# Manage StoreFront Stores
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.StoreFront -ErrorAction Stop

try {
    Write-Host "Creating StoreFront store: ${storeName}..." -ForegroundColor Cyan
    
    # Get StoreFront deployment
    $Deployment = Get-STFDeployment
    
    # Create store
    $Store = New-STFStoreService \`
        -VirtualPath "/Citrix/${storeName}" \`
        -FriendlyName "${friendlyName}" \`
        -SiteId $Deployment.SiteId
    
    # Add Delivery Controller
    $FarmConfig = New-STFStoreFarmConfiguration \`
        -FarmName "Controller Farm" \`
        -FarmType "XenDesktop" \`
        -Servers @("${deliveryController}") \`
        -Port 80 \`
        -TransportType "HTTP"
    
    Add-STFStoreFarm -StoreService $Store -FarmConfiguration $FarmConfig
    
    # Configure authentication
    $AuthService = Get-STFAuthenticationService -SiteId $Deployment.SiteId
    Set-STFStoreService -StoreService $Store -AuthenticationService $AuthService
    
    Write-Host "✓ StoreFront store created successfully!" -ForegroundColor Green
    Write-Host "  Store: ${storeName}" -ForegroundColor Cyan
    Write-Host "  Friendly Name: ${friendlyName}" -ForegroundColor Cyan
    Write-Host "  Controller: ${deliveryController}" -ForegroundColor Cyan
    Write-Host "  Auth Method: ${authMethod}" -ForegroundColor Cyan
    
} catch {
    Write-Error "StoreFront configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'citrix-generate-performance-reports',
    name: 'Generate Citrix Performance Reports',
    category: 'Common Admin Tasks',
    description: 'Export session performance and resource usage',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['SessionPerformance', 'ResourceUsage', 'LoadIndex'], defaultValue: 'SessionPerformance' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Citrix-Performance.csv' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate Citrix Performance Reports
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Generating ${reportType} report..." -ForegroundColor Cyan
    
    ${reportType === 'SessionPerformance' ? `
    $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -MaxRecordCount 5000
    
    $Report = $Sessions | ForEach-Object {
        [PSCustomObject]@{
            UserName = $_.UserName
            MachineName = $_.MachineName
            SessionState = $_.SessionState
            StartTime = $_.StartTime
            Duration = if ($_.StartTime) { (Get-Date) - $_.StartTime } else { "N/A" }
            Protocol = $_.Protocol
            ClientName = $_.ClientName
            ClientAddress = $_.ClientAddress
            Latency_ms = $_.Latency
            Bandwidth_kbps = $_.Bandwidth
        }
    }
    ` : reportType === 'ResourceUsage' ? `
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -MaxRecordCount 5000
    
    $Report = $Machines | ForEach-Object {
        [PSCustomObject]@{
            MachineName = $_.MachineName
            PowerState = $_.PowerState
            SessionCount = $_.SessionCount
            LoadIndex = $_.LoadIndex
            RegistrationState = $_.RegistrationState
            OSType = $_.OSType
            CatalogName = $_.CatalogName
            DeliveryGroup = $_.DesktopGroupName
        }
    }
    ` : `
    $DeliveryGroups = Get-BrokerDesktopGroup -AdminAddress "${ddc}"
    
    $Report = $DeliveryGroups | ForEach-Object {
        $DG = $_
        $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -DesktopGroupName $DG.Name
        $AvgLoad = ($Machines | Measure-Object -Property LoadIndex -Average).Average
        
        [PSCustomObject]@{
            DeliveryGroup = $DG.Name
            TotalMachines = $DG.TotalMachines
            AvailableMachines = ($Machines | Where-Object { $_.PowerState -eq "On" -and $_.SessionCount -lt $_.MaxSessions }).Count
            ActiveSessions = $DG.Sessions
            AverageLoadIndex = [math]::Round($AvgLoad, 2)
            DeliveryType = $DG.DeliveryType
        }
    }
    `}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Records: $($Report.Count)" -ForegroundColor Cyan
    
    $Report | Format-Table -AutoSize | Out-String | Write-Host
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },

  // Machine Catalog Tasks
  {
    id: 'citrix-catalog-power-management',
    name: 'Machine Catalog Power Management',
    category: 'Machine Catalogs',
    description: 'Power on, off, restart, or suspend machines in a catalog',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'catalogName', label: 'Catalog Name', type: 'text', required: true, placeholder: 'Windows10-Catalog' },
      { id: 'action', label: 'Power Action', type: 'select', required: true, options: ['TurnOn', 'TurnOff', 'Restart', 'Suspend', 'Resume'], defaultValue: 'TurnOn' },
      { id: 'machineCount', label: 'Number of Machines (0=All)', type: 'number', required: false, defaultValue: 0 }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const catalogName = escapePowerShellString(params.catalogName);
      const action = params.action;
      const machineCount = params.machineCount || 0;
      
      return `# Machine Catalog Power Management
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Executing power action '${action}' on catalog '${catalogName}'..." -ForegroundColor Cyan
    
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -CatalogName "${catalogName}"
    
    if (${machineCount} -gt 0) {
        $Machines = $Machines | Select-Object -First ${machineCount}
    }
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Machine in $Machines) {
        try {
            New-BrokerHostingPowerAction -AdminAddress "${ddc}" \`
                -MachineName $Machine.MachineName \`
                -Action "${action}"
            
            Write-Host "  Power action sent: $($Machine.MachineName)" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "  Failed: $($Machine.MachineName) - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Power management completed!" -ForegroundColor Cyan
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Power management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-catalog-remove-machines',
    name: 'Remove Machines from Catalog',
    category: 'Machine Catalogs',
    description: 'Remove specific machines from a machine catalog',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'machineNames', label: 'Machine Names (comma-separated)', type: 'textarea', required: true, placeholder: 'VDI-001, VDI-002, VDI-003' },
      { id: 'forceRemove', label: 'Force Remove (even if in use)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const machineNamesRaw = (params.machineNames as string).split(',').map((n: string) => n.trim());
      const forceRemove = params.forceRemove;
      
      return `# Remove Machines from Catalog
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $MachineNames = @(${machineNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($MachineName in $MachineNames) {
        try {
            $Machine = Get-BrokerMachine -AdminAddress "${ddc}" -MachineName "*\\$MachineName"
            
            if ($Machine) {
                if ($Machine.SessionCount -gt 0 -and -not ${toPowerShellBoolean(forceRemove)}) {
                    Write-Host "  Skipped (active sessions): $MachineName" -ForegroundColor Yellow
                    continue
                }
                
                Remove-BrokerMachine -AdminAddress "${ddc}" -InputObject $Machine -Force:${toPowerShellBoolean(forceRemove)}
                Write-Host "  Removed: $MachineName" -ForegroundColor Green
            } else {
                Write-Host "  Not found: $MachineName" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  Failed: $MachineName - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Machine removal completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Machine removal failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-catalog-update-image',
    name: 'Update Machine Catalog Image (MCS)',
    category: 'Machine Catalogs',
    description: 'Update the master image for an MCS machine catalog',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'catalogName', label: 'Catalog Name', type: 'text', required: true, placeholder: 'Windows10-MCS-Catalog' },
      { id: 'snapshotPath', label: 'Master Image Snapshot Path', type: 'text', required: true, placeholder: 'XDHyp:\\HostingUnits\\MyUnit\\VM.vm\\Snapshot.snapshot' },
      { id: 'rebootSchedule', label: 'Reboot Schedule', type: 'select', required: true, options: ['Immediate', 'Scheduled', 'OnLogoff'], defaultValue: 'OnLogoff' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const catalogName = escapePowerShellString(params.catalogName);
      const snapshotPath = escapePowerShellString(params.snapshotPath);
      const rebootSchedule = params.rebootSchedule;
      
      return `# Update Machine Catalog Image (MCS)
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop
Add-PSSnapin Citrix.MachineCreation.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Updating master image for catalog '${catalogName}'..." -ForegroundColor Cyan
    
    # Get the provisioning scheme
    $ProvScheme = Get-ProvScheme -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}"
    
    if (-not $ProvScheme) {
        throw "Provisioning scheme not found for catalog '${catalogName}'"
    }
    
    # Publish the new image
    Write-Host "Publishing new master image..." -ForegroundColor Yellow
    $PubTask = Publish-ProvMasterVMImage -AdminAddress "${ddc}" \`
        -ProvisioningSchemeName "${catalogName}" \`
        -MasterImageVM "${snapshotPath}" \`
        -RunAsynchronously
    
    # Wait for publish to complete
    $Task = Get-ProvTask -AdminAddress "${ddc}" -TaskId $PubTask
    while ($Task.Active) {
        Write-Host "  Publishing in progress... $($Task.TaskProgress)%" -ForegroundColor Gray
        Start-Sleep -Seconds 10
        $Task = Get-ProvTask -AdminAddress "${ddc}" -TaskId $PubTask
    }
    
    if ($Task.TaskState -ne "Finished") {
        throw "Image publish failed: $($Task.TerminatingError)"
    }
    
    Write-Host "  Master image published successfully!" -ForegroundColor Green
    
    # Get machines in the catalog
    $BrokerCatalog = Get-BrokerCatalog -AdminAddress "${ddc}" -Name "${catalogName}"
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -CatalogUid $BrokerCatalog.Uid
    
    Write-Host "Scheduling machine updates (${rebootSchedule})..." -ForegroundColor Yellow
    
    foreach ($Machine in $Machines) {
        Set-ProvVMUpdateTimeWindow -AdminAddress "${ddc}" \`
            -ProvisioningSchemeName "${catalogName}" \`
            -VMName $Machine.HostedMachineName \`
            -StartsNow \`
            -DurationInMinutes $(if ("${rebootSchedule}" -eq "Immediate") { 0 } else { 1440 })
    }
    
    Write-Host ""
    Write-Host "Image update initiated!" -ForegroundColor Green
    Write-Host "  Catalog: ${catalogName}" -ForegroundColor Cyan
    Write-Host "  Machines to update: $($Machines.Count)" -ForegroundColor Cyan
    Write-Host "  Reboot Schedule: ${rebootSchedule}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Image update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-catalog-health-check',
    name: 'Machine Catalog Health Check',
    category: 'Machine Catalogs',
    description: 'Check registration status and health of all machines in a catalog',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'catalogName', label: 'Catalog Name', type: 'text', required: true, placeholder: 'Windows10-Catalog' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\CatalogHealth.csv' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const catalogName = escapePowerShellString(params.catalogName);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Machine Catalog Health Check
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Running health check for catalog '${catalogName}'..." -ForegroundColor Cyan
    
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -CatalogName "${catalogName}"
    
    $HealthReport = $Machines | ForEach-Object {
        $HealthStatus = "Healthy"
        $Issues = @()
        
        if ($_.RegistrationState -ne "Registered") {
            $HealthStatus = "Unhealthy"
            $Issues += "Not Registered"
        }
        if ($_.PowerState -eq "Off" -and $_.InMaintenanceMode -eq $false) {
            $HealthStatus = "Warning"
            $Issues += "Powered Off"
        }
        if ($_.InMaintenanceMode) {
            if ($HealthStatus -eq "Healthy") { $HealthStatus = "Maintenance" }
            $Issues += "In Maintenance Mode"
        }
        if ($_.LastConnectionFailure -and $_.LastConnectionFailure -ne "None") {
            $HealthStatus = "Unhealthy"
            $Issues += "Connection Failure: $($_.LastConnectionFailure)"
        }
        
        [PSCustomObject]@{
            MachineName = $_.MachineName
            HealthStatus = $HealthStatus
            RegistrationState = $_.RegistrationState
            PowerState = $_.PowerState
            InMaintenanceMode = $_.InMaintenanceMode
            SessionCount = $_.SessionCount
            LoadIndex = $_.LoadIndex
            LastDeregistration = $_.LastDeregistrationTime
            Issues = ($Issues -join "; ")
        }
    }
    
    # Display summary
    $Healthy = ($HealthReport | Where-Object { $_.HealthStatus -eq "Healthy" }).Count
    $Warning = ($HealthReport | Where-Object { $_.HealthStatus -eq "Warning" }).Count
    $Unhealthy = ($HealthReport | Where-Object { $_.HealthStatus -eq "Unhealthy" }).Count
    $Maintenance = ($HealthReport | Where-Object { $_.HealthStatus -eq "Maintenance" }).Count
    
    Write-Host ""
    Write-Host "Health Summary for '${catalogName}':" -ForegroundColor Cyan
    Write-Host "  Total Machines: $($Machines.Count)" -ForegroundColor White
    Write-Host "  Healthy: $Healthy" -ForegroundColor Green
    Write-Host "  Warning: $Warning" -ForegroundColor Yellow
    Write-Host "  Unhealthy: $Unhealthy" -ForegroundColor Red
    Write-Host "  Maintenance: $Maintenance" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Detailed Status:" -ForegroundColor Cyan
    $HealthReport | Format-Table MachineName, HealthStatus, RegistrationState, PowerState, SessionCount -AutoSize
    
    ${exportPath ? `
    $HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Report exported to: ${exportPath}" -ForegroundColor Green
    ` : ''}
    
} catch {
    Write-Error "Health check failed: $_"
}`;
    },
    isPremium: true
  },

  // Delivery Group Tasks
  {
    id: 'citrix-dg-maintenance-mode',
    name: 'Set Delivery Group Maintenance Mode',
    category: 'Delivery Groups',
    description: 'Enable or disable maintenance mode for delivery group machines',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: true, placeholder: 'Finance-Desktops' },
      { id: 'maintenanceMode', label: 'Maintenance Mode', type: 'boolean', required: true, defaultValue: true },
      { id: 'machineScope', label: 'Machine Scope', type: 'select', required: true, options: ['All', 'Registered', 'Unregistered'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = escapePowerShellString(params.deliveryGroup);
      const maintenanceMode = params.maintenanceMode;
      const machineScope = params.machineScope;
      
      return `# Set Delivery Group Maintenance Mode
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Setting maintenance mode for '${deliveryGroup}'..." -ForegroundColor Cyan
    
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -DesktopGroupName "${deliveryGroup}"
    
    ${machineScope === 'Registered' ? `$Machines = $Machines | Where-Object { $_.RegistrationState -eq "Registered" }` : 
      machineScope === 'Unregistered' ? `$Machines = $Machines | Where-Object { $_.RegistrationState -ne "Registered" }` : ''}
    
    $UpdatedCount = 0
    
    foreach ($Machine in $Machines) {
        Set-BrokerMachine -AdminAddress "${ddc}" \`
            -InputObject $Machine \`
            -InMaintenanceMode ${toPowerShellBoolean(maintenanceMode)}
        
        Write-Host "  Updated: $($Machine.MachineName)" -ForegroundColor Green
        $UpdatedCount++
    }
    
    Write-Host ""
    Write-Host "Maintenance mode $(if (${toPowerShellBoolean(maintenanceMode)}) { "enabled" } else { "disabled" }) for $UpdatedCount machines" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to set maintenance mode: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-dg-configure-access',
    name: 'Configure Delivery Group Access Rules',
    category: 'Delivery Groups',
    description: 'Configure access policy rules for a delivery group',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: true, placeholder: 'Finance-Desktops' },
      { id: 'ruleName', label: 'Access Rule Name', type: 'text', required: true, placeholder: 'Direct-Access-Rule' },
      { id: 'allowedConnections', label: 'Allowed Connections', type: 'select', required: true, options: ['NotViaAG', 'ViaAG', 'AnyConnection'], defaultValue: 'AnyConnection' },
      { id: 'includedUsers', label: 'Included Users (comma-separated)', type: 'textarea', required: false, placeholder: 'domain\\group1, domain\\user1' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = escapePowerShellString(params.deliveryGroup);
      const ruleName = escapePowerShellString(params.ruleName);
      const allowedConnections = params.allowedConnections;
      const includedUsersRaw = params.includedUsers ? (params.includedUsers as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Configure Delivery Group Access Rules
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $DesktopGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${deliveryGroup}"
    
    if (-not $DesktopGroup) {
        throw "Delivery group '${deliveryGroup}' not found"
    }
    
    # Create access policy rule
    $AccessRuleParams = @{
        AdminAddress = "${ddc}"
        Name = "${ruleName}"
        DesktopGroupUid = $DesktopGroup.Uid
        AllowedConnections = "${allowedConnections}"
        Enabled = $true
    }
    
    ${includedUsersRaw.length > 0 ? `
    $IncludedUsers = @(${includedUsersRaw.map(u => `"${escapePowerShellString(u)}"`).join(', ')})
    $AccessRuleParams.IncludedUsers = $IncludedUsers
    ` : ''}
    
    # Check if rule exists
    $ExistingRule = Get-BrokerAccessPolicyRule -AdminAddress "${ddc}" -Name "${ruleName}" -ErrorAction SilentlyContinue
    
    if ($ExistingRule) {
        Set-BrokerAccessPolicyRule @AccessRuleParams
        Write-Host "Updated access rule: ${ruleName}" -ForegroundColor Green
    } else {
        New-BrokerAccessPolicyRule @AccessRuleParams
        Write-Host "Created access rule: ${ruleName}" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Access rule configuration completed!" -ForegroundColor Green
    Write-Host "  Delivery Group: ${deliveryGroup}" -ForegroundColor Cyan
    Write-Host "  Rule Name: ${ruleName}" -ForegroundColor Cyan
    Write-Host "  Allowed Connections: ${allowedConnections}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Access rule configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-dg-reboot-schedule',
    name: 'Configure Delivery Group Reboot Schedule',
    category: 'Delivery Groups',
    description: 'Create or modify reboot schedule for a delivery group',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: true, placeholder: 'Finance-Desktops' },
      { id: 'scheduleName', label: 'Schedule Name', type: 'text', required: true, placeholder: 'Weekly-Maintenance-Reboot' },
      { id: 'frequency', label: 'Frequency', type: 'select', required: true, options: ['Daily', 'Weekly'], defaultValue: 'Weekly' },
      { id: 'dayOfWeek', label: 'Day of Week (for Weekly)', type: 'select', required: false, options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], defaultValue: 'Sunday' },
      { id: 'startTime', label: 'Start Time (HH:MM)', type: 'text', required: true, placeholder: '02:00', defaultValue: '02:00' },
      { id: 'rebootDuration', label: 'Reboot Duration (minutes)', type: 'number', required: true, defaultValue: 120 }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = escapePowerShellString(params.deliveryGroup);
      const scheduleName = escapePowerShellString(params.scheduleName);
      const frequency = params.frequency;
      const dayOfWeek = params.dayOfWeek || 'Sunday';
      const startTime = escapePowerShellString(params.startTime);
      const rebootDuration = params.rebootDuration || 120;
      
      return `# Configure Delivery Group Reboot Schedule
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $DesktopGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${deliveryGroup}"
    
    if (-not $DesktopGroup) {
        throw "Delivery group '${deliveryGroup}' not found"
    }
    
    # Parse start time
    $StartTimeSpan = [TimeSpan]::Parse("${startTime}")
    
    $ScheduleParams = @{
        AdminAddress = "${ddc}"
        Name = "${scheduleName}"
        DesktopGroupUid = $DesktopGroup.Uid
        Frequency = "${frequency}"
        StartTime = $StartTimeSpan
        RebootDuration = ${rebootDuration}
        Enabled = $true
        WarningDuration = 15
        WarningMessage = "Your session will be restarted for maintenance in 15 minutes. Please save your work."
        WarningRepeatInterval = 5
    }
    
    ${frequency === 'Weekly' ? `$ScheduleParams.Day = "${dayOfWeek}"` : ''}
    
    # Check if schedule exists
    $ExistingSchedule = Get-BrokerRebootSchedule -AdminAddress "${ddc}" -Name "${scheduleName}" -ErrorAction SilentlyContinue
    
    if ($ExistingSchedule) {
        Set-BrokerRebootSchedule @ScheduleParams
        Write-Host "Updated reboot schedule: ${scheduleName}" -ForegroundColor Green
    } else {
        New-BrokerRebootSchedule @ScheduleParams
        Write-Host "Created reboot schedule: ${scheduleName}" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Reboot schedule configured!" -ForegroundColor Green
    Write-Host "  Delivery Group: ${deliveryGroup}" -ForegroundColor Cyan
    Write-Host "  Schedule: ${scheduleName}" -ForegroundColor Cyan
    Write-Host "  Frequency: ${frequency}" -ForegroundColor Cyan
    Write-Host "  Start Time: ${startTime}" -ForegroundColor Cyan
    Write-Host "  Duration: ${rebootDuration} minutes" -ForegroundColor Cyan
    
} catch {
    Write-Error "Reboot schedule configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-dg-autoscale',
    name: 'Configure Delivery Group Autoscale',
    category: 'Delivery Groups',
    description: 'Configure autoscale settings for power management',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'deliveryGroup', label: 'Delivery Group', type: 'text', required: true, placeholder: 'Finance-Desktops' },
      { id: 'peakBufferPercent', label: 'Peak Buffer Percent', type: 'number', required: true, defaultValue: 10 },
      { id: 'offPeakBufferPercent', label: 'Off-Peak Buffer Percent', type: 'number', required: true, defaultValue: 5 },
      { id: 'peakDisconnectTimeout', label: 'Peak Disconnect Timeout (min)', type: 'number', required: false, defaultValue: 60 },
      { id: 'offPeakDisconnectTimeout', label: 'Off-Peak Disconnect Timeout (min)', type: 'number', required: false, defaultValue: 15 }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = escapePowerShellString(params.deliveryGroup);
      const peakBuffer = params.peakBufferPercent || 10;
      const offPeakBuffer = params.offPeakBufferPercent || 5;
      const peakTimeout = params.peakDisconnectTimeout || 60;
      const offPeakTimeout = params.offPeakDisconnectTimeout || 15;
      
      return `# Configure Delivery Group Autoscale
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $DesktopGroup = Get-BrokerDesktopGroup -AdminAddress "${ddc}" -Name "${deliveryGroup}"
    
    if (-not $DesktopGroup) {
        throw "Delivery group '${deliveryGroup}' not found"
    }
    
    # Configure autoscale settings
    Set-BrokerDesktopGroup -AdminAddress "${ddc}" \`
        -InputObject $DesktopGroup \`
        -AutomaticPowerOnForAssigned $true \`
        -AutomaticPowerOnForAssignedDuringPeak $true \`
        -PeakBufferSizePercent ${peakBuffer} \`
        -OffPeakBufferSizePercent ${offPeakBuffer} \`
        -PeakDisconnectTimeout ${peakTimeout} \`
        -OffPeakDisconnectTimeout ${offPeakTimeout} \`
        -PeakLogOffTimeout 60 \`
        -OffPeakLogOffTimeout 15 \`
        -PeakDisconnectAction "Suspend" \`
        -OffPeakDisconnectAction "Shutdown"
    
    Write-Host "Autoscale settings configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration Summary:" -ForegroundColor Cyan
    Write-Host "  Delivery Group: ${deliveryGroup}" -ForegroundColor White
    Write-Host "  Peak Buffer: ${peakBuffer}%" -ForegroundColor White
    Write-Host "  Off-Peak Buffer: ${offPeakBuffer}%" -ForegroundColor White
    Write-Host "  Peak Disconnect Timeout: ${peakTimeout} min" -ForegroundColor White
    Write-Host "  Off-Peak Disconnect Timeout: ${offPeakTimeout} min" -ForegroundColor White
    
} catch {
    Write-Error "Autoscale configuration failed: $_"
}`;
    },
    isPremium: true
  },

  // Application Tasks
  {
    id: 'citrix-app-file-type-association',
    name: 'Configure File Type Association',
    category: 'Applications',
    description: 'Associate file types with a published application',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Microsoft Excel' },
      { id: 'fileExtensions', label: 'File Extensions (comma-separated)', type: 'textarea', required: true, placeholder: '.xlsx, .xls, .csv' },
      { id: 'contentTypes', label: 'MIME Content Types (comma-separated)', type: 'textarea', required: false, placeholder: 'application/vnd.ms-excel' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const appName = escapePowerShellString(params.appName);
      const fileExtensionsRaw = (params.fileExtensions as string).split(',').map((e: string) => e.trim());
      const contentTypesRaw = params.contentTypes ? (params.contentTypes as string).split(',').map((c: string) => c.trim()) : [];
      
      return `# Configure File Type Association
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    if (-not $Application) {
        throw "Application '${appName}' not found"
    }
    
    $FileExtensions = @(${fileExtensionsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
    ${contentTypesRaw.length > 0 ? `$ContentTypes = @(${contentTypesRaw.map(c => `"${escapePowerShellString(c)}"`).join(', ')})` : ''}
    
    foreach ($Extension in $FileExtensions) {
        $FTAParams = @{
            AdminAddress = "${ddc}"
            ApplicationUid = $Application.Uid
            ExtensionName = $Extension
        }
        
        # Check if FTA exists
        $ExistingFTA = Get-BrokerConfiguredFTA -AdminAddress "${ddc}" \`
            -ApplicationUid $Application.Uid \`
            -ExtensionName $Extension -ErrorAction SilentlyContinue
        
        if (-not $ExistingFTA) {
            New-BrokerConfiguredFTA @FTAParams
            Write-Host "  Added FTA: $Extension" -ForegroundColor Green
        } else {
            Write-Host "  FTA exists: $Extension" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "File type associations configured!" -ForegroundColor Green
    Write-Host "  Application: ${appName}" -ForegroundColor Cyan
    Write-Host "  Extensions: $($FileExtensions -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "FTA configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-app-launch-settings',
    name: 'Configure Application Launch Settings',
    category: 'Applications',
    description: 'Configure command line, working directory, and launch parameters',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Custom App' },
      { id: 'commandLineArgs', label: 'Command Line Arguments', type: 'text', required: false, placeholder: '/config=production' },
      { id: 'workingDirectory', label: 'Working Directory', type: 'path', required: false, placeholder: 'C:\\Program Files\\MyApp' },
      { id: 'cpuPriorityLevel', label: 'CPU Priority', type: 'select', required: false, options: ['Low', 'BelowNormal', 'Normal', 'AboveNormal', 'High'], defaultValue: 'Normal' },
      { id: 'addToStartMenu', label: 'Add to Start Menu', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const appName = escapePowerShellString(params.appName);
      const commandLineArgs = params.commandLineArgs ? escapePowerShellString(params.commandLineArgs) : '';
      const workingDirectory = params.workingDirectory ? escapePowerShellString(params.workingDirectory) : '';
      const cpuPriority = params.cpuPriorityLevel || 'Normal';
      const addToStartMenu = params.addToStartMenu !== false;
      
      return `# Configure Application Launch Settings
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    if (-not $Application) {
        throw "Application '${appName}' not found"
    }
    
    $UpdateParams = @{
        AdminAddress = "${ddc}"
        InputObject = $Application
    }
    
    ${commandLineArgs ? `$UpdateParams.CommandLineArguments = "${commandLineArgs}"` : ''}
    ${workingDirectory ? `$UpdateParams.WorkingDirectory = "${workingDirectory}"` : ''}
    $UpdateParams.CpuPriorityLevel = "${cpuPriority}"
    $UpdateParams.ShortcutAddedToStartMenu = ${toPowerShellBoolean(addToStartMenu)}
    
    Set-BrokerApplication @UpdateParams
    
    Write-Host "Application launch settings updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Application: ${appName}" -ForegroundColor White
    ${commandLineArgs ? `Write-Host "  Command Line Args: ${commandLineArgs}" -ForegroundColor White` : ''}
    ${workingDirectory ? `Write-Host "  Working Directory: ${workingDirectory}" -ForegroundColor White` : ''}
    Write-Host "  CPU Priority: ${cpuPriority}" -ForegroundColor White
    Write-Host "  Start Menu: ${addToStartMenu}" -ForegroundColor White
    
} catch {
    Write-Error "Launch settings configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-app-visibility',
    name: 'Configure Application Visibility',
    category: 'Applications',
    description: 'Show or hide applications for specific user groups',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Admin Tools' },
      { id: 'visibilityMode', label: 'Visibility Mode', type: 'select', required: true, options: ['Show', 'Hide', 'ShowToSpecificUsers'], defaultValue: 'Show' },
      { id: 'targetUsers', label: 'Target Users/Groups (comma-separated)', type: 'textarea', required: false, placeholder: 'domain\\IT-Admins, domain\\Developers' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const appName = escapePowerShellString(params.appName);
      const visibilityMode = params.visibilityMode;
      const targetUsersRaw = params.targetUsers ? (params.targetUsers as string).split(',').map((u: string) => u.trim()) : [];
      
      return `# Configure Application Visibility
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    if (-not $Application) {
        throw "Application '${appName}' not found"
    }
    
    switch ("${visibilityMode}") {
        "Show" {
            Set-BrokerApplication -AdminAddress "${ddc}" \`
                -InputObject $Application \`
                -Enabled $true \`
                -Visible $true
            Write-Host "Application set to visible for all users" -ForegroundColor Green
        }
        "Hide" {
            Set-BrokerApplication -AdminAddress "${ddc}" \`
                -InputObject $Application \`
                -Visible $false
            Write-Host "Application hidden from all users" -ForegroundColor Yellow
        }
        "ShowToSpecificUsers" {
            $TargetUsers = @(${targetUsersRaw.map(u => `"${escapePowerShellString(u)}"`).join(', ')})
            
            # Clear existing user assignments
            $ExistingUsers = Get-BrokerUser -AdminAddress "${ddc}" -ApplicationUid $Application.Uid
            foreach ($User in $ExistingUsers) {
                Remove-BrokerUser -AdminAddress "${ddc}" -InputObject $User -ApplicationUid $Application.Uid
            }
            
            # Add new user assignments
            foreach ($User in $TargetUsers) {
                Add-BrokerUser -AdminAddress "${ddc}" -Name $User -Application $Application
                Write-Host "  Added visibility for: $User" -ForegroundColor Green
            }
            
            Set-BrokerApplication -AdminAddress "${ddc}" \`
                -InputObject $Application \`
                -UserFilterEnabled $true
        }
    }
    
    Write-Host ""
    Write-Host "Application visibility configured!" -ForegroundColor Green
    Write-Host "  Application: ${appName}" -ForegroundColor Cyan
    Write-Host "  Mode: ${visibilityMode}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Visibility configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-app-icon-update',
    name: 'Update Application Icon',
    category: 'Applications',
    description: 'Update the icon for a published application',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Custom App' },
      { id: 'iconPath', label: 'Icon Path (.ico or .exe)', type: 'path', required: true, placeholder: 'C:\\Icons\\myapp.ico' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const appName = escapePowerShellString(params.appName);
      const iconPath = escapePowerShellString(params.iconPath);
      
      return `# Update Application Icon
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Application = Get-BrokerApplication -AdminAddress "${ddc}" -Name "${appName}"
    
    if (-not $Application) {
        throw "Application '${appName}' not found"
    }
    
    # Read icon from file
    $IconPath = "${iconPath}"
    
    if (-not (Test-Path $IconPath)) {
        throw "Icon file not found: $IconPath"
    }
    
    # Get icon data
    $IconData = Get-BrokerIcon -AdminAddress "${ddc}" -FileName $IconPath
    
    if (-not $IconData) {
        # Create new icon
        $IconData = New-BrokerIcon -AdminAddress "${ddc}" -EncodedIconData ([System.IO.File]::ReadAllBytes($IconPath))
    }
    
    # Update application with new icon
    Set-BrokerApplication -AdminAddress "${ddc}" \`
        -InputObject $Application \`
        -IconUid $IconData.Uid
    
    Write-Host "Application icon updated!" -ForegroundColor Green
    Write-Host "  Application: ${appName}" -ForegroundColor Cyan
    Write-Host "  Icon Source: ${iconPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Icon update failed: $_"
}`;
    },
    isPremium: true
  },

  // Session Management Tasks
  {
    id: 'citrix-session-shadow',
    name: 'Shadow User Session',
    category: 'Session Management',
    description: 'Initiate a shadow session to view or control a user session',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'userName', label: 'User Name', type: 'text', required: true, placeholder: 'domain\\user' },
      { id: 'shadowMode', label: 'Shadow Mode', type: 'select', required: true, options: ['View', 'Control'], defaultValue: 'View' },
      { id: 'askConsent', label: 'Ask User Consent', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const userName = escapePowerShellString(params.userName);
      const shadowMode = params.shadowMode;
      const askConsent = params.askConsent !== false;
      
      return `# Shadow User Session
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Session = Get-BrokerSession -AdminAddress "${ddc}" -UserName "${userName}" | Select-Object -First 1
    
    if (-not $Session) {
        throw "No active session found for user '${userName}'"
    }
    
    Write-Host "Session found:" -ForegroundColor Cyan
    Write-Host "  User: $($Session.UserName)" -ForegroundColor White
    Write-Host "  Machine: $($Session.MachineName)" -ForegroundColor White
    Write-Host "  Session ID: $($Session.SessionKey)" -ForegroundColor White
    
    $MachineName = ($Session.MachineName -split "\\\\")[-1]
    $SessionId = $Session.SessionId
    
    # Shadow command using mstsc
    $ShadowArgs = "/v:$MachineName /shadow:$SessionId"
    
    if ("${shadowMode}" -eq "Control") {
        $ShadowArgs += " /control"
    }
    
    if (-not ${toPowerShellBoolean(askConsent)}) {
        $ShadowArgs += " /noConsentPrompt"
    }
    
    Write-Host ""
    Write-Host "Initiating shadow session..." -ForegroundColor Yellow
    Write-Host "  Mode: ${shadowMode}" -ForegroundColor White
    Write-Host "  Consent Required: ${askConsent}" -ForegroundColor White
    Write-Host ""
    Write-Host "Run the following command to shadow:" -ForegroundColor Cyan
    Write-Host "mstsc $ShadowArgs" -ForegroundColor Green
    
    # Optionally start the shadow session
    # Start-Process "mstsc.exe" -ArgumentList $ShadowArgs
    
} catch {
    Write-Error "Shadow session failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-session-send-message',
    name: 'Send Message to User Sessions',
    category: 'Session Management',
    description: 'Send a message to one or more user sessions',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'targetScope', label: 'Target Scope', type: 'select', required: true, options: ['User', 'DeliveryGroup', 'AllSessions'], defaultValue: 'User' },
      { id: 'targetName', label: 'Target (User or Delivery Group)', type: 'text', required: false, placeholder: 'domain\\user or DeliveryGroupName' },
      { id: 'messageTitle', label: 'Message Title', type: 'text', required: true, placeholder: 'IT Notification' },
      { id: 'messageText', label: 'Message Text', type: 'textarea', required: true, placeholder: 'System maintenance will begin in 30 minutes. Please save your work.' },
      { id: 'messageStyle', label: 'Message Style', type: 'select', required: false, options: ['Information', 'Warning', 'Critical'], defaultValue: 'Information' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const targetScope = params.targetScope;
      const targetName = params.targetName ? escapePowerShellString(params.targetName) : '';
      const messageTitle = escapePowerShellString(params.messageTitle);
      const messageText = escapePowerShellString(params.messageText);
      const messageStyle = params.messageStyle || 'Information';
      
      return `# Send Message to User Sessions
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    # Get target sessions
    switch ("${targetScope}") {
        "User" {
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -UserName "${targetName}"
        }
        "DeliveryGroup" {
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -DesktopGroupName "${targetName}"
        }
        "AllSessions" {
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}"
        }
    }
    
    if (-not $Sessions -or $Sessions.Count -eq 0) {
        Write-Host "No active sessions found for target" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Sending message to $($Sessions.Count) session(s)..." -ForegroundColor Cyan
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Session in $Sessions) {
        try {
            Send-BrokerSessionMessage -AdminAddress "${ddc}" \`
                -InputObject $Session \`
                -MessageStyle "${messageStyle}" \`
                -Title "${messageTitle}" \`
                -Text "${messageText}"
            
            Write-Host "  Message sent to: $($Session.UserName)" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "  Failed for: $($Session.UserName) - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Message delivery completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Message delivery failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-session-bulk-logoff',
    name: 'Bulk Session Logoff',
    category: 'Session Management',
    description: 'Log off multiple sessions by delivery group, machine, or idle time',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'filterType', label: 'Filter Type', type: 'select', required: true, options: ['DeliveryGroup', 'MachineName', 'IdleTime', 'Disconnected'], defaultValue: 'DeliveryGroup' },
      { id: 'filterValue', label: 'Filter Value', type: 'text', required: false, placeholder: 'DeliveryGroupName or MachineName' },
      { id: 'idleMinutes', label: 'Idle Minutes (for IdleTime filter)', type: 'number', required: false, defaultValue: 60 },
      { id: 'forceLogoff', label: 'Force Logoff', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const filterType = params.filterType;
      const filterValue = params.filterValue ? escapePowerShellString(params.filterValue) : '';
      const idleMinutes = params.idleMinutes || 60;
      const forceLogoff = params.forceLogoff;
      
      return `# Bulk Session Logoff
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    # Get sessions based on filter
    switch ("${filterType}") {
        "DeliveryGroup" {
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -DesktopGroupName "${filterValue}"
        }
        "MachineName" {
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -MachineName "*\\${filterValue}"
        }
        "IdleTime" {
            $CutoffTime = (Get-Date).AddMinutes(-${idleMinutes})
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}" | Where-Object {
                $_.SessionState -eq "Active" -and $_.IdleSince -and $_.IdleSince -lt $CutoffTime
            }
        }
        "Disconnected" {
            $Sessions = Get-BrokerSession -AdminAddress "${ddc}" -SessionState "Disconnected"
        }
    }
    
    if (-not $Sessions -or $Sessions.Count -eq 0) {
        Write-Host "No sessions found matching filter criteria" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Found $($Sessions.Count) session(s) to log off" -ForegroundColor Cyan
    Write-Host ""
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Session in $Sessions) {
        try {
            if (${toPowerShellBoolean(forceLogoff)}) {
                Stop-BrokerSession -AdminAddress "${ddc}" -InputObject $Session -Force
            } else {
                Stop-BrokerSession -AdminAddress "${ddc}" -InputObject $Session
            }
            
            Write-Host "  Logged off: $($Session.UserName) on $($Session.MachineName)" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "  Failed: $($Session.UserName) - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Bulk logoff completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Bulk logoff failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-session-hide-published-app',
    name: 'Hide Published Application from Session',
    category: 'Session Management',
    description: 'Terminate a specific published application within a user session',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'userName', label: 'User Name', type: 'text', required: true, placeholder: 'domain\\user' },
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Microsoft Excel' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const userName = escapePowerShellString(params.userName);
      const appName = escapePowerShellString(params.appName);
      
      return `# Terminate Published Application in Session
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    $Session = Get-BrokerSession -AdminAddress "${ddc}" -UserName "${userName}" | Select-Object -First 1
    
    if (-not $Session) {
        throw "No active session found for user '${userName}'"
    }
    
    Write-Host "Session found for: $($Session.UserName)" -ForegroundColor Cyan
    Write-Host "Machine: $($Session.MachineName)" -ForegroundColor Cyan
    Write-Host ""
    
    # Get applications in use
    $AppsInUse = $Session.ApplicationsInUse
    
    if ($AppsInUse -contains "${appName}") {
        Write-Host "Application '${appName}' is running in session" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To terminate this application, use remote PowerShell:" -ForegroundColor Cyan
        
        $MachineName = ($Session.MachineName -split "\\\\")[-1]
        
        Write-Host "Invoke-Command -ComputerName $MachineName -ScriptBlock {" -ForegroundColor Green
        Write-Host "    Get-Process | Where-Object { \`$_.MainWindowTitle -like '*${appName}*' } | Stop-Process -Force" -ForegroundColor Green
        Write-Host "}" -ForegroundColor Green
        
    } else {
        Write-Host "Application '${appName}' is not currently running in this session" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Applications currently in use:" -ForegroundColor Cyan
        foreach ($App in $AppsInUse) {
            Write-Host "  - $App" -ForegroundColor White
        }
    }
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    },
    isPremium: true
  },

  // Policy Tasks
  {
    id: 'citrix-policy-create',
    name: 'Create Citrix Policy',
    category: 'Policies',
    description: 'Create a new Citrix policy with settings',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'High-Performance-Policy' },
      { id: 'policyDescription', label: 'Description', type: 'text', required: false, placeholder: 'Policy for power users' },
      { id: 'policyType', label: 'Policy Type', type: 'select', required: true, options: ['User', 'Computer'], defaultValue: 'User' },
      { id: 'priority', label: 'Priority (lower = higher)', type: 'number', required: false, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const policyName = escapePowerShellString(params.policyName);
      const policyDescription = params.policyDescription ? escapePowerShellString(params.policyDescription) : '';
      const policyType = params.policyType;
      const priority = params.priority || 1;
      
      return `# Create Citrix Policy
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Common.GroupPolicy -ErrorAction Stop

try {
    Write-Host "Creating Citrix policy '${policyName}'..." -ForegroundColor Cyan
    
    # Create the policy
    $Policy = New-CtxGroupPolicy -PolicyName "${policyName}" \`
        -Type "${policyType}" \`
        -Priority ${priority} \`
        -Description "${policyDescription}"
    
    Write-Host ""
    Write-Host "Policy created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Type: ${policyType}" -ForegroundColor Cyan
    Write-Host "  Priority: ${priority}" -ForegroundColor Cyan
    ${policyDescription ? `Write-Host "  Description: ${policyDescription}" -ForegroundColor Cyan` : ''}
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Configure policy settings using Set-CtxGroupPolicySetting" -ForegroundColor White
    Write-Host "  2. Add filters using Add-CtxGroupPolicyFilter" -ForegroundColor White
    Write-Host "  3. Enable the policy" -ForegroundColor White
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-policy-configure-settings',
    name: 'Configure Policy Settings',
    category: 'Policies',
    description: 'Configure specific settings within a Citrix policy',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'High-Performance-Policy' },
      { id: 'settingCategory', label: 'Setting Category', type: 'select', required: true, options: ['ICA', 'Bandwidth', 'Security', 'SessionLimits', 'Profile'], defaultValue: 'ICA' },
      { id: 'audioQuality', label: 'Audio Quality', type: 'select', required: false, options: ['Low', 'Medium', 'High'], defaultValue: 'Medium' },
      { id: 'clipboardRedirection', label: 'Clipboard Redirection', type: 'boolean', required: false, defaultValue: true },
      { id: 'clientPrinterRedirection', label: 'Client Printer Redirection', type: 'boolean', required: false, defaultValue: true },
      { id: 'sessionIdleTimeout', label: 'Session Idle Timeout (min)', type: 'number', required: false, defaultValue: 0 }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const policyName = escapePowerShellString(params.policyName);
      const settingCategory = params.settingCategory;
      const audioQuality = params.audioQuality || 'Medium';
      const clipboardRedirection = params.clipboardRedirection !== false;
      const clientPrinterRedirection = params.clientPrinterRedirection !== false;
      const sessionIdleTimeout = params.sessionIdleTimeout || 0;
      
      return `# Configure Policy Settings
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Common.GroupPolicy -ErrorAction Stop

try {
    Write-Host "Configuring settings for policy '${policyName}'..." -ForegroundColor Cyan
    
    # Configure ICA settings
    ${settingCategory === 'ICA' || settingCategory === 'Bandwidth' ? `
    # Audio quality
    Set-CtxGroupPolicySetting -PolicyName "${policyName}" \`
        -SettingName "AudioQuality" \`
        -Value "${audioQuality}"
    Write-Host "  Audio Quality: ${audioQuality}" -ForegroundColor Green
    
    # Clipboard redirection
    Set-CtxGroupPolicySetting -PolicyName "${policyName}" \`
        -SettingName "AllowClipboardRedirection" \`
        -Value ${toPowerShellBoolean(clipboardRedirection)}
    Write-Host "  Clipboard Redirection: ${clipboardRedirection}" -ForegroundColor Green
    ` : ''}
    
    ${settingCategory === 'ICA' || settingCategory === 'Security' ? `
    # Client printer redirection
    Set-CtxGroupPolicySetting -PolicyName "${policyName}" \`
        -SettingName "AllowClientPrinterRedirection" \`
        -Value ${toPowerShellBoolean(clientPrinterRedirection)}
    Write-Host "  Client Printer Redirection: ${clientPrinterRedirection}" -ForegroundColor Green
    ` : ''}
    
    ${settingCategory === 'SessionLimits' && sessionIdleTimeout > 0 ? `
    # Session idle timeout
    Set-CtxGroupPolicySetting -PolicyName "${policyName}" \`
        -SettingName "SessionIdleTimer" \`
        -Value $true
    Set-CtxGroupPolicySetting -PolicyName "${policyName}" \`
        -SettingName "SessionIdleTimerInterval" \`
        -Value ${sessionIdleTimeout}
    Write-Host "  Session Idle Timeout: ${sessionIdleTimeout} minutes" -ForegroundColor Green
    ` : ''}
    
    Write-Host ""
    Write-Host "Policy settings configured successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-policy-add-filter',
    name: 'Add Policy Filter',
    category: 'Policies',
    description: 'Add user, group, or delivery group filters to a policy',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'High-Performance-Policy' },
      { id: 'filterType', label: 'Filter Type', type: 'select', required: true, options: ['User', 'ClientIP', 'DeliveryGroup', 'AccessControl', 'OU'], defaultValue: 'User' },
      { id: 'filterValue', label: 'Filter Value', type: 'text', required: true, placeholder: 'domain\\group or IP range' },
      { id: 'filterMode', label: 'Filter Mode', type: 'select', required: true, options: ['Allow', 'Deny'], defaultValue: 'Allow' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const policyName = escapePowerShellString(params.policyName);
      const filterType = params.filterType;
      const filterValue = escapePowerShellString(params.filterValue);
      const filterMode = params.filterMode;
      
      return `# Add Policy Filter
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Common.GroupPolicy -ErrorAction Stop

try {
    Write-Host "Adding filter to policy '${policyName}'..." -ForegroundColor Cyan
    
    $FilterParams = @{
        PolicyName = "${policyName}"
        FilterType = "${filterType}"
        FilterValue = "${filterValue}"
        Mode = "${filterMode}"
        Enabled = $true
    }
    
    switch ("${filterType}") {
        "User" {
            Add-CtxGroupPolicyFilter @FilterParams
            Write-Host "  Added user filter: ${filterValue} (${filterMode})" -ForegroundColor Green
        }
        "ClientIP" {
            Add-CtxGroupPolicyFilter @FilterParams
            Write-Host "  Added client IP filter: ${filterValue} (${filterMode})" -ForegroundColor Green
        }
        "DeliveryGroup" {
            $FilterParams.FilterType = "DesktopGroup"
            Add-CtxGroupPolicyFilter @FilterParams
            Write-Host "  Added delivery group filter: ${filterValue} (${filterMode})" -ForegroundColor Green
        }
        "AccessControl" {
            Add-CtxGroupPolicyFilter @FilterParams
            Write-Host "  Added access control filter: ${filterValue} (${filterMode})" -ForegroundColor Green
        }
        "OU" {
            $FilterParams.FilterType = "OrganizationalUnit"
            Add-CtxGroupPolicyFilter @FilterParams
            Write-Host "  Added OU filter: ${filterValue} (${filterMode})" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Filter added successfully!" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Filter Type: ${filterType}" -ForegroundColor Cyan
    Write-Host "  Filter Value: ${filterValue}" -ForegroundColor Cyan
    Write-Host "  Mode: ${filterMode}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Filter addition failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-policy-export-import',
    name: 'Export/Import Policies',
    category: 'Policies',
    description: 'Export policies to file or import from file',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Export', 'Import'], defaultValue: 'Export' },
      { id: 'filePath', label: 'File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\CitrixPolicies.xml' },
      { id: 'policyNames', label: 'Policy Names (comma-separated, blank=all)', type: 'textarea', required: false, placeholder: 'Policy1, Policy2' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const action = params.action;
      const filePath = escapePowerShellString(params.filePath);
      const policyNamesRaw = params.policyNames ? (params.policyNames as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Export/Import Citrix Policies
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Common.GroupPolicy -ErrorAction Stop

try {
    ${action === 'Export' ? `
    Write-Host "Exporting Citrix policies..." -ForegroundColor Cyan
    
    ${policyNamesRaw.length > 0 ? `
    $PolicyNames = @(${policyNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $Policies = Get-CtxGroupPolicy | Where-Object { $PolicyNames -contains $_.PolicyName }
    ` : `
    $Policies = Get-CtxGroupPolicy
    `}
    
    $ExportData = @()
    foreach ($Policy in $Policies) {
        $Settings = Get-CtxGroupPolicySetting -PolicyName $Policy.PolicyName
        $Filters = Get-CtxGroupPolicyFilter -PolicyName $Policy.PolicyName
        
        $ExportData += [PSCustomObject]@{
            Policy = $Policy
            Settings = $Settings
            Filters = $Filters
        }
        Write-Host "  Exported: $($Policy.PolicyName)" -ForegroundColor Green
    }
    
    $ExportData | Export-Clixml -Path "${filePath}"
    
    Write-Host ""
    Write-Host "Export completed!" -ForegroundColor Green
    Write-Host "  Policies exported: $($ExportData.Count)" -ForegroundColor Cyan
    Write-Host "  File: ${filePath}" -ForegroundColor Cyan
    ` : `
    Write-Host "Importing Citrix policies..." -ForegroundColor Cyan
    
    if (-not (Test-Path "${filePath}")) {
        throw "Import file not found: ${filePath}"
    }
    
    $ImportData = Import-Clixml -Path "${filePath}"
    
    foreach ($Item in $ImportData) {
        try {
            # Create policy
            New-CtxGroupPolicy -PolicyName $Item.Policy.PolicyName \`
                -Type $Item.Policy.Type \`
                -Priority $Item.Policy.Priority \`
                -Description $Item.Policy.Description -ErrorAction SilentlyContinue
            
            # Apply settings
            foreach ($Setting in $Item.Settings) {
                Set-CtxGroupPolicySetting -PolicyName $Item.Policy.PolicyName \`
                    -SettingName $Setting.SettingName \`
                    -Value $Setting.Value -ErrorAction SilentlyContinue
            }
            
            # Apply filters
            foreach ($Filter in $Item.Filters) {
                Add-CtxGroupPolicyFilter -PolicyName $Item.Policy.PolicyName \`
                    -FilterType $Filter.FilterType \`
                    -FilterValue $Filter.FilterValue \`
                    -Mode $Filter.Mode -ErrorAction SilentlyContinue
            }
            
            Write-Host "  Imported: $($Item.Policy.PolicyName)" -ForegroundColor Green
        } catch {
            Write-Host "  Failed: $($Item.Policy.PolicyName) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Import completed!" -ForegroundColor Green
    `}
    
} catch {
    Write-Error "Policy ${action.toLowerCase()} failed: $_"
}`;
    },
    isPremium: true
  },

  // Provisioning Tasks
  {
    id: 'citrix-mcs-create-catalog',
    name: 'Create MCS Machine Catalog',
    category: 'Provisioning',
    description: 'Create a new Machine Creation Services catalog with master image',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'catalogName', label: 'Catalog Name', type: 'text', required: true, placeholder: 'Windows11-MCS' },
      { id: 'hostingUnit', label: 'Hosting Unit Name', type: 'text', required: true, placeholder: 'vSphere-Hosting' },
      { id: 'masterImagePath', label: 'Master Image VM Path', type: 'text', required: true, placeholder: 'XDHyp:\\HostingUnits\\MyUnit\\MasterVM.vm' },
      { id: 'machineCount', label: 'Number of Machines', type: 'number', required: true, defaultValue: 10 },
      { id: 'namingScheme', label: 'Naming Scheme', type: 'text', required: true, placeholder: 'VDI-###', defaultValue: 'VDI-###' },
      { id: 'identityPoolName', label: 'Identity Pool Name', type: 'text', required: true, placeholder: 'VDI-Pool' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const catalogName = escapePowerShellString(params.catalogName);
      const hostingUnit = escapePowerShellString(params.hostingUnit);
      const masterImagePath = escapePowerShellString(params.masterImagePath);
      const machineCount = params.machineCount || 10;
      const namingScheme = escapePowerShellString(params.namingScheme);
      const identityPoolName = escapePowerShellString(params.identityPoolName);
      
      return `# Create MCS Machine Catalog
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop
Add-PSSnapin Citrix.MachineCreation.Admin.V2 -ErrorAction Stop
Add-PSSnapin Citrix.ADIdentity.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Creating MCS Machine Catalog '${catalogName}'..." -ForegroundColor Cyan
    
    # Create identity pool
    Write-Host "Creating identity pool..." -ForegroundColor Yellow
    $IdentityPool = New-AcctIdentityPool -AdminAddress "${ddc}" \`
        -IdentityPoolName "${identityPoolName}" \`
        -NamingScheme "${namingScheme}" \`
        -NamingSchemeType "Numeric" \`
        -Domain (Get-ADDomain).DNSRoot \`
        -OU "CN=Computers,$(([ADSI]'').distinguishedName)"
    
    # Create AD accounts
    Write-Host "Creating AD computer accounts..." -ForegroundColor Yellow
    $ADAccounts = New-AcctADAccount -AdminAddress "${ddc}" \`
        -IdentityPoolName "${identityPoolName}" \`
        -Count ${machineCount}
    
    # Create provisioning scheme
    Write-Host "Creating provisioning scheme..." -ForegroundColor Yellow
    $ProvTaskId = New-ProvScheme -AdminAddress "${ddc}" \`
        -ProvisioningSchemeName "${catalogName}" \`
        -HostingUnitName "${hostingUnit}" \`
        -MasterImageVM "${masterImagePath}" \`
        -IdentityPoolName "${identityPoolName}" \`
        -CleanOnBoot \`
        -RunAsynchronously
    
    # Wait for provisioning scheme creation
    $ProvTask = Get-ProvTask -AdminAddress "${ddc}" -TaskId $ProvTaskId
    while ($ProvTask.Active) {
        Write-Host "  Creating provisioning scheme... $($ProvTask.TaskProgress)%" -ForegroundColor Gray
        Start-Sleep -Seconds 10
        $ProvTask = Get-ProvTask -AdminAddress "${ddc}" -TaskId $ProvTaskId
    }
    
    if ($ProvTask.TaskState -ne "Finished") {
        throw "Provisioning scheme creation failed: $($ProvTask.TerminatingError)"
    }
    
    # Create broker catalog
    Write-Host "Creating broker catalog..." -ForegroundColor Yellow
    $BrokerCatalog = New-BrokerCatalog -AdminAddress "${ddc}" \`
        -Name "${catalogName}" \`
        -AllocationType "Random" \`
        -SessionSupport "MultiSession" \`
        -PersistUserChanges "Discard" \`
        -ProvisioningType "MCS"
    
    # Create VMs
    Write-Host "Creating ${machineCount} virtual machines..." -ForegroundColor Yellow
    $VMTaskId = New-ProvVM -AdminAddress "${ddc}" \`
        -ProvisioningSchemeName "${catalogName}" \`
        -ADAccountName $ADAccounts.SuccessfulAccounts \`
        -RunAsynchronously
    
    # Wait for VM creation
    $VMTask = Get-ProvTask -AdminAddress "${ddc}" -TaskId $VMTaskId
    while ($VMTask.Active) {
        Write-Host "  Creating VMs... $($VMTask.TaskProgress)%" -ForegroundColor Gray
        Start-Sleep -Seconds 15
        $VMTask = Get-ProvTask -AdminAddress "${ddc}" -TaskId $VMTaskId
    }
    
    # Add VMs to catalog
    $ProvScheme = Get-ProvScheme -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}"
    $ProvVMs = Get-ProvVM -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}"
    
    foreach ($VM in $ProvVMs) {
        New-BrokerMachine -AdminAddress "${ddc}" \`
            -CatalogUid $BrokerCatalog.Uid \`
            -MachineName $VM.VMName
    }
    
    Write-Host ""
    Write-Host "MCS Catalog created successfully!" -ForegroundColor Green
    Write-Host "  Catalog: ${catalogName}" -ForegroundColor Cyan
    Write-Host "  Machines: ${machineCount}" -ForegroundColor Cyan
    Write-Host "  Naming Scheme: ${namingScheme}" -ForegroundColor Cyan
    
} catch {
    Write-Error "MCS catalog creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-pvs-update-vdisk',
    name: 'Update PVS vDisk Version',
    category: 'Provisioning',
    description: 'Create new vDisk version and promote to production',
    parameters: [
      { id: 'pvsServer', label: 'PVS Server', type: 'text', required: true, placeholder: 'pvs.company.com' },
      { id: 'storeName', label: 'Store Name', type: 'text', required: true, placeholder: 'Production-Store' },
      { id: 'vDiskName', label: 'vDisk Name', type: 'text', required: true, placeholder: 'Windows10-vDisk' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['CreateVersion', 'PromoteVersion', 'RevertVersion'], defaultValue: 'CreateVersion' },
      { id: 'versionNumber', label: 'Version Number (for Promote/Revert)', type: 'number', required: false }
    ],
    scriptTemplate: (params) => {
      const pvsServer = escapePowerShellString(params.pvsServer);
      const storeName = escapePowerShellString(params.storeName);
      const vDiskName = escapePowerShellString(params.vDiskName);
      const action = params.action;
      const versionNumber = params.versionNumber;
      
      return `# Update PVS vDisk Version
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.PVS.SnapIn -ErrorAction Stop

try {
    Set-PvsConnection -Server "${pvsServer}"
    
    $Store = Get-PvsStore -StoreName "${storeName}"
    $vDisk = Get-PvsDiskLocator -DiskLocatorName "${vDiskName}" -StoreName "${storeName}" -SiteName $Store.SiteName
    
    if (-not $vDisk) {
        throw "vDisk '${vDiskName}' not found in store '${storeName}'"
    }
    
    switch ("${action}") {
        "CreateVersion" {
            Write-Host "Creating new vDisk version..." -ForegroundColor Cyan
            
            New-PvsDiskMaintenanceVersion \`
                -DiskLocatorName "${vDiskName}" \`
                -StoreName "${storeName}" \`
                -SiteName $Store.SiteName
            
            $Versions = Get-PvsDiskVersion -DiskLocatorName "${vDiskName}" -StoreName "${storeName}" -SiteName $Store.SiteName
            $LatestVersion = $Versions | Sort-Object Version -Descending | Select-Object -First 1
            
            Write-Host "New maintenance version created: $($LatestVersion.Version)" -ForegroundColor Green
        }
        "PromoteVersion" {
            Write-Host "Promoting vDisk version ${versionNumber} to production..." -ForegroundColor Cyan
            
            Invoke-PvsPromoteDiskVersion \`
                -DiskLocatorName "${vDiskName}" \`
                -StoreName "${storeName}" \`
                -SiteName $Store.SiteName
            
            Write-Host "Version promoted to production!" -ForegroundColor Green
        }
        "RevertVersion" {
            Write-Host "Reverting vDisk to version ${versionNumber}..." -ForegroundColor Cyan
            
            Invoke-PvsRevertDiskVersion \`
                -DiskLocatorName "${vDiskName}" \`
                -StoreName "${storeName}" \`
                -SiteName $Store.SiteName \`
                -Version ${versionNumber}
            
            Write-Host "Reverted to version ${versionNumber}!" -ForegroundColor Green
        }
    }
    
    # Display current versions
    Write-Host ""
    Write-Host "Current vDisk Versions:" -ForegroundColor Cyan
    Get-PvsDiskVersion -DiskLocatorName "${vDiskName}" -StoreName "${storeName}" -SiteName $Store.SiteName | 
        Format-Table Version, Description, Access, CreateDate -AutoSize
    
} catch {
    Write-Error "vDisk operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-mcs-rollback-image',
    name: 'Rollback MCS Image Update',
    category: 'Provisioning',
    description: 'Rollback machines to previous master image version',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'catalogName', label: 'Catalog Name', type: 'text', required: true, placeholder: 'Windows10-MCS' },
      { id: 'machineScope', label: 'Machine Scope', type: 'select', required: true, options: ['All', 'Selected'], defaultValue: 'All' },
      { id: 'machineNames', label: 'Machine Names (for Selected)', type: 'textarea', required: false, placeholder: 'VDI-001, VDI-002' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const catalogName = escapePowerShellString(params.catalogName);
      const machineScope = params.machineScope;
      const machineNamesRaw = params.machineNames ? (params.machineNames as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Rollback MCS Image Update
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop
Add-PSSnapin Citrix.MachineCreation.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Rolling back image for catalog '${catalogName}'..." -ForegroundColor Cyan
    
    # Get the provisioning scheme
    $ProvScheme = Get-ProvScheme -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}"
    
    if (-not $ProvScheme) {
        throw "Provisioning scheme not found for catalog '${catalogName}'"
    }
    
    # Get image history
    $ImageHistory = Get-ProvSchemeImageVersionHistory -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}"
    
    if ($ImageHistory.Count -lt 2) {
        throw "No previous image version available for rollback"
    }
    
    Write-Host "Available image versions:" -ForegroundColor Yellow
    $ImageHistory | Format-Table ImageVersionNumber, ImageStatus, CreateTime -AutoSize
    
    $PreviousImage = $ImageHistory | Where-Object { $_.ImageStatus -eq "Previous" } | Select-Object -First 1
    
    if (-not $PreviousImage) {
        throw "No previous image version found"
    }
    
    Write-Host "Rolling back to version: $($PreviousImage.ImageVersionNumber)" -ForegroundColor Cyan
    
    # Get machines to rollback
    ${machineScope === 'All' ? `
    $Machines = Get-ProvVM -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}"
    ` : `
    $MachineNames = @(${machineNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $Machines = Get-ProvVM -AdminAddress "${ddc}" -ProvisioningSchemeName "${catalogName}" | 
        Where-Object { $MachineNames -contains $_.VMName }
    `}
    
    Write-Host "Machines to rollback: $($Machines.Count)" -ForegroundColor Yellow
    
    foreach ($Machine in $Machines) {
        try {
            Set-ProvVMUpdateTimeWindow -AdminAddress "${ddc}" \`
                -ProvisioningSchemeName "${catalogName}" \`
                -VMName $Machine.VMName \`
                -Revert \`
                -StartsNow \`
                -DurationInMinutes 60
            
            Write-Host "  Scheduled rollback: $($Machine.VMName)" -ForegroundColor Green
        } catch {
            Write-Host "  Failed: $($Machine.VMName) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Rollback scheduled!" -ForegroundColor Green
    Write-Host "Machines will revert on next reboot." -ForegroundColor Cyan
    
} catch {
    Write-Error "Rollback failed: $_"
}`;
    },
    isPremium: true
  },

  // Monitoring Tasks
  {
    id: 'citrix-monitor-connection-failures',
    name: 'Monitor Connection Failures',
    category: 'Monitoring',
    description: 'Identify and report connection failures across the environment',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: false, defaultValue: 24 },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\ConnectionFailures.csv' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const hoursBack = params.hoursBack || 24;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Monitor Connection Failures
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop
Add-PSSnapin Citrix.Monitor.Admin.V1 -ErrorAction Stop

try {
    Write-Host "Analyzing connection failures for the last ${hoursBack} hours..." -ForegroundColor Cyan
    
    $StartDate = (Get-Date).AddHours(-${hoursBack})
    
    # Get connection failures from monitoring data
    $Failures = Get-MonitorNotificationEmailServerConfiguration -AdminAddress "${ddc}" -ErrorAction SilentlyContinue
    
    # Get machines with connection issues
    $MachinesWithIssues = Get-BrokerMachine -AdminAddress "${ddc}" | Where-Object {
        $_.LastConnectionFailure -and $_.LastConnectionFailure -ne "None"
    }
    
    Write-Host ""
    Write-Host "Connection Failure Summary:" -ForegroundColor Cyan
    Write-Host "===========================" -ForegroundColor Cyan
    
    $FailureReport = $MachinesWithIssues | ForEach-Object {
        [PSCustomObject]@{
            MachineName = $_.MachineName
            DeliveryGroup = $_.DesktopGroupName
            LastFailure = $_.LastConnectionFailure
            LastFailureTime = $_.LastConnectionFailureTime
            RegistrationState = $_.RegistrationState
            PowerState = $_.PowerState
            SessionCount = $_.SessionCount
        }
    }
    
    $FailureReport | Format-Table -AutoSize
    
    # Group by failure type
    Write-Host ""
    Write-Host "Failures by Type:" -ForegroundColor Yellow
    $FailureReport | Group-Object LastFailure | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
    # Group by delivery group
    Write-Host ""
    Write-Host "Failures by Delivery Group:" -ForegroundColor Yellow
    $FailureReport | Group-Object DeliveryGroup | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
    ${exportPath ? `
    $FailureReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "Report exported to: ${exportPath}" -ForegroundColor Green
    ` : ''}
    
} catch {
    Write-Error "Connection failure monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-monitor-machine-registration',
    name: 'Monitor Machine Registration Status',
    category: 'Monitoring',
    description: 'Report on unregistered machines and registration issues',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'includeMaintenanceMode', label: 'Include Maintenance Mode', type: 'boolean', required: false, defaultValue: false },
      { id: 'attemptReregister', label: 'Attempt Re-registration', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const includeMaintenanceMode = params.includeMaintenanceMode;
      const attemptReregister = params.attemptReregister;
      
      return `# Monitor Machine Registration Status
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Checking machine registration status..." -ForegroundColor Cyan
    
    $AllMachines = Get-BrokerMachine -AdminAddress "${ddc}"
    
    $UnregisteredMachines = $AllMachines | Where-Object {
        $_.RegistrationState -ne "Registered" ${includeMaintenanceMode ? '' : '-and $_.InMaintenanceMode -eq $false'}
    }
    
    # Summary
    $RegisteredCount = ($AllMachines | Where-Object { $_.RegistrationState -eq "Registered" }).Count
    $UnregisteredCount = $UnregisteredMachines.Count
    $MaintenanceCount = ($AllMachines | Where-Object { $_.InMaintenanceMode }).Count
    
    Write-Host ""
    Write-Host "Registration Summary:" -ForegroundColor Cyan
    Write-Host "  Total Machines: $($AllMachines.Count)" -ForegroundColor White
    Write-Host "  Registered: $RegisteredCount" -ForegroundColor Green
    Write-Host "  Unregistered: $UnregisteredCount" -ForegroundColor $(if ($UnregisteredCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  In Maintenance: $MaintenanceCount" -ForegroundColor Yellow
    
    if ($UnregisteredMachines.Count -gt 0) {
        Write-Host ""
        Write-Host "Unregistered Machines:" -ForegroundColor Yellow
        Write-Host "======================" -ForegroundColor Yellow
        
        $UnregisteredMachines | ForEach-Object {
            Write-Host ""
            Write-Host "Machine: $($_.MachineName)" -ForegroundColor Red
            Write-Host "  Delivery Group: $($_.DesktopGroupName)"
            Write-Host "  Power State: $($_.PowerState)"
            Write-Host "  Last Deregistration: $($_.LastDeregistrationTime)"
            Write-Host "  Last Deregistration Reason: $($_.LastDeregistrationReason)"
            Write-Host "  Fault State: $($_.FaultState)"
            
            ${attemptReregister ? `
            if ($_.PowerState -eq "On") {
                Write-Host "  Attempting power cycle to re-register..." -ForegroundColor Yellow
                try {
                    New-BrokerHostingPowerAction -AdminAddress "${ddc}" \`
                        -MachineName $_.MachineName \`
                        -Action "Restart"
                    Write-Host "  Restart initiated" -ForegroundColor Green
                } catch {
                    Write-Host "  Failed to restart: $_" -ForegroundColor Red
                }
            }
            ` : ''}
        }
    }
    
    # Group by reason
    Write-Host ""
    Write-Host "Deregistration Reasons:" -ForegroundColor Yellow
    $UnregisteredMachines | Group-Object LastDeregistrationReason | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
} catch {
    Write-Error "Registration monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-monitor-resource-utilization',
    name: 'Monitor Resource Utilization',
    category: 'Monitoring',
    description: 'Report on CPU, memory, and session utilization across VDAs',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'deliveryGroup', label: 'Delivery Group (optional)', type: 'text', required: false, placeholder: 'All groups if blank' },
      { id: 'thresholdCPU', label: 'CPU Alert Threshold (%)', type: 'number', required: false, defaultValue: 80 },
      { id: 'thresholdMemory', label: 'Memory Alert Threshold (%)', type: 'number', required: false, defaultValue: 85 },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\ResourceUtil.csv' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const deliveryGroup = params.deliveryGroup ? escapePowerShellString(params.deliveryGroup) : '';
      const thresholdCPU = params.thresholdCPU || 80;
      const thresholdMemory = params.thresholdMemory || 85;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Monitor Resource Utilization
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Collecting resource utilization data..." -ForegroundColor Cyan
    
    ${deliveryGroup ? `
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -DesktopGroupName "${deliveryGroup}" | 
        Where-Object { $_.PowerState -eq "On" }
    ` : `
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}" | 
        Where-Object { $_.PowerState -eq "On" }
    `}
    
    $ResourceReport = @()
    $HighCPUCount = 0
    $HighMemoryCount = 0
    
    foreach ($Machine in $Machines) {
        $MachineName = ($Machine.MachineName -split "\\\\")[-1]
        
        try {
            # Get performance counters via WMI
            $CPU = Get-WmiObject -ComputerName $MachineName -Class Win32_Processor -ErrorAction Stop | 
                Measure-Object -Property LoadPercentage -Average | 
                Select-Object -ExpandProperty Average
            
            $Memory = Get-WmiObject -ComputerName $MachineName -Class Win32_OperatingSystem -ErrorAction Stop
            $MemoryUsed = [math]::Round((($Memory.TotalVisibleMemorySize - $Memory.FreePhysicalMemory) / $Memory.TotalVisibleMemorySize) * 100, 2)
            
            $Status = "Normal"
            if ($CPU -ge ${thresholdCPU}) {
                $Status = "High CPU"
                $HighCPUCount++
            }
            if ($MemoryUsed -ge ${thresholdMemory}) {
                $Status = if ($Status -eq "Normal") { "High Memory" } else { "High CPU & Memory" }
                $HighMemoryCount++
            }
            
            $ResourceReport += [PSCustomObject]@{
                MachineName = $Machine.MachineName
                DeliveryGroup = $Machine.DesktopGroupName
                CPUPercent = $CPU
                MemoryPercent = $MemoryUsed
                SessionCount = $Machine.SessionCount
                LoadIndex = $Machine.LoadIndex
                Status = $Status
            }
        } catch {
            $ResourceReport += [PSCustomObject]@{
                MachineName = $Machine.MachineName
                DeliveryGroup = $Machine.DesktopGroupName
                CPUPercent = "N/A"
                MemoryPercent = "N/A"
                SessionCount = $Machine.SessionCount
                LoadIndex = $Machine.LoadIndex
                Status = "Unable to query"
            }
        }
    }
    
    Write-Host ""
    Write-Host "Resource Utilization Summary:" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "  Total Machines Queried: $($Machines.Count)" -ForegroundColor White
    Write-Host "  High CPU (>=${thresholdCPU}%): $HighCPUCount" -ForegroundColor $(if ($HighCPUCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  High Memory (>=${thresholdMemory}%): $HighMemoryCount" -ForegroundColor $(if ($HighMemoryCount -gt 0) { "Red" } else { "Green" })
    
    Write-Host ""
    $ResourceReport | Sort-Object CPUPercent -Descending | Format-Table -AutoSize
    
    ${exportPath ? `
    $ResourceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Report exported to: ${exportPath}" -ForegroundColor Green
    ` : ''}
    
} catch {
    Write-Error "Resource monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-monitor-session-duration',
    name: 'Monitor Long-Running Sessions',
    category: 'Monitoring',
    description: 'Identify sessions exceeding duration thresholds',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'maxDurationHours', label: 'Max Session Duration (hours)', type: 'number', required: true, defaultValue: 24 },
      { id: 'includeDisconnected', label: 'Include Disconnected Sessions', type: 'boolean', required: false, defaultValue: true },
      { id: 'sendWarning', label: 'Send Warning to Users', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const maxDurationHours = params.maxDurationHours || 24;
      const includeDisconnected = params.includeDisconnected !== false;
      const sendWarning = params.sendWarning;
      
      return `# Monitor Long-Running Sessions
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Finding sessions exceeding ${maxDurationHours} hours..." -ForegroundColor Cyan
    
    $CutoffTime = (Get-Date).AddHours(-${maxDurationHours})
    
    $AllSessions = Get-BrokerSession -AdminAddress "${ddc}"
    
    $LongSessions = $AllSessions | Where-Object {
        $_.StartTime -and $_.StartTime -lt $CutoffTime ${!includeDisconnected ? '-and $_.SessionState -eq "Active"' : ''}
    }
    
    if ($LongSessions.Count -eq 0) {
        Write-Host "No sessions found exceeding ${maxDurationHours} hours" -ForegroundColor Green
        return
    }
    
    Write-Host ""
    Write-Host "Long-Running Sessions Found: $($LongSessions.Count)" -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Yellow
    
    $SessionReport = $LongSessions | ForEach-Object {
        $Duration = (Get-Date) - $_.StartTime
        
        [PSCustomObject]@{
            UserName = $_.UserName
            MachineName = $_.MachineName
            SessionState = $_.SessionState
            StartTime = $_.StartTime
            Duration = "$($Duration.Days)d $($Duration.Hours)h $($Duration.Minutes)m"
            DurationHours = [math]::Round($Duration.TotalHours, 1)
            Protocol = $_.Protocol
            ClientName = $_.ClientName
        }
    } | Sort-Object DurationHours -Descending
    
    $SessionReport | Format-Table UserName, MachineName, SessionState, Duration, ClientName -AutoSize
    
    ${sendWarning ? `
    Write-Host ""
    Write-Host "Sending warning messages to users..." -ForegroundColor Yellow
    
    foreach ($Session in $LongSessions) {
        try {
            $Duration = (Get-Date) - $Session.StartTime
            $WarningMessage = "Your session has been active for $([math]::Round($Duration.TotalHours, 1)) hours. Please log off if you are no longer using this session."
            
            Send-BrokerSessionMessage -AdminAddress "${ddc}" \`
                -InputObject $Session \`
                -MessageStyle "Warning" \`
                -Title "Long Session Warning" \`
                -Text $WarningMessage
            
            Write-Host "  Warning sent to: $($Session.UserName)" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to warn: $($Session.UserName) - $_" -ForegroundColor Red
        }
    }
    ` : ''}
    
    # Summary by state
    Write-Host ""
    Write-Host "Sessions by State:" -ForegroundColor Cyan
    $SessionReport | Group-Object SessionState | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
} catch {
    Write-Error "Session monitoring failed: $_"
}`;
    },
    isPremium: true
  },

  // StoreFront Tasks
  {
    id: 'citrix-storefront-add-farm',
    name: 'Add Delivery Controller Farm to Store',
    category: 'StoreFront',
    description: 'Add or update delivery controller farm configuration',
    parameters: [
      { id: 'storePath', label: 'Store Virtual Path', type: 'text', required: true, placeholder: '/Citrix/Store' },
      { id: 'farmName', label: 'Farm Name', type: 'text', required: true, placeholder: 'Primary-Controllers' },
      { id: 'controllers', label: 'Controllers (comma-separated)', type: 'textarea', required: true, placeholder: 'ddc1.company.com, ddc2.company.com' },
      { id: 'port', label: 'Port', type: 'number', required: false, defaultValue: 80 },
      { id: 'transportType', label: 'Transport Type', type: 'select', required: false, options: ['HTTP', 'HTTPS', 'SSL'], defaultValue: 'HTTP' }
    ],
    scriptTemplate: (params) => {
      const storePath = escapePowerShellString(params.storePath);
      const farmName = escapePowerShellString(params.farmName);
      const controllersRaw = (params.controllers as string).split(',').map((c: string) => c.trim());
      const port = params.port || 80;
      const transportType = params.transportType || 'HTTP';
      
      return `# Add Delivery Controller Farm to StoreFront Store
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.StoreFront -ErrorAction Stop

try {
    Write-Host "Configuring farm for store '${storePath}'..." -ForegroundColor Cyan
    
    # Get the store service
    $Store = Get-STFStoreService -VirtualPath "${storePath}"
    
    if (-not $Store) {
        throw "Store not found at path '${storePath}'"
    }
    
    $Controllers = @(${controllersRaw.map(c => `"${escapePowerShellString(c)}"`).join(', ')})
    
    # Check if farm exists
    $ExistingFarm = Get-STFStoreFarm -StoreService $Store -FarmName "${farmName}" -ErrorAction SilentlyContinue
    
    if ($ExistingFarm) {
        Write-Host "Updating existing farm '${farmName}'..." -ForegroundColor Yellow
        
        Set-STFStoreFarm -StoreService $Store \`
            -FarmName "${farmName}" \`
            -Servers $Controllers \`
            -Port ${port} \`
            -TransportType "${transportType}"
        
        Write-Host "Farm updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "Creating new farm '${farmName}'..." -ForegroundColor Yellow
        
        Add-STFStoreFarm -StoreService $Store \`
            -FarmName "${farmName}" \`
            -FarmType "XenDesktop" \`
            -Servers $Controllers \`
            -Port ${port} \`
            -TransportType "${transportType}" \`
            -LoadBalance $true
        
        Write-Host "Farm created successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Configuration Summary:" -ForegroundColor Cyan
    Write-Host "  Store: ${storePath}" -ForegroundColor White
    Write-Host "  Farm: ${farmName}" -ForegroundColor White
    Write-Host "  Controllers: $($Controllers -join ', ')" -ForegroundColor White
    Write-Host "  Port: ${port}" -ForegroundColor White
    Write-Host "  Transport: ${transportType}" -ForegroundColor White
    
} catch {
    Write-Error "Farm configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-storefront-configure-auth',
    name: 'Configure StoreFront Authentication',
    category: 'StoreFront',
    description: 'Configure authentication methods for StoreFront',
    parameters: [
      { id: 'storePath', label: 'Store Virtual Path', type: 'text', required: true, placeholder: '/Citrix/Store' },
      { id: 'enableDomainPassthrough', label: 'Enable Domain Pass-through', type: 'boolean', required: false, defaultValue: false },
      { id: 'enableExplicit', label: 'Enable Username/Password', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableSmartCard', label: 'Enable Smart Card', type: 'boolean', required: false, defaultValue: false },
      { id: 'enableSAML', label: 'Enable SAML', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const storePath = escapePowerShellString(params.storePath);
      const enableDomainPassthrough = params.enableDomainPassthrough;
      const enableExplicit = params.enableExplicit !== false;
      const enableSmartCard = params.enableSmartCard;
      const enableSAML = params.enableSAML;
      
      return `# Configure StoreFront Authentication
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.StoreFront -ErrorAction Stop

try {
    Write-Host "Configuring authentication for '${storePath}'..." -ForegroundColor Cyan
    
    # Get the store and authentication service
    $Store = Get-STFStoreService -VirtualPath "${storePath}"
    
    if (-not $Store) {
        throw "Store not found at path '${storePath}'"
    }
    
    $AuthService = Get-STFAuthenticationService -StoreService $Store
    
    # Configure authentication methods
    ${enableExplicit ? `
    Write-Host "  Enabling explicit (username/password) authentication..." -ForegroundColor Yellow
    Enable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "ExplicitForms"
    ` : `
    Write-Host "  Disabling explicit authentication..." -ForegroundColor Yellow
    Disable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "ExplicitForms" -ErrorAction SilentlyContinue
    `}
    
    ${enableDomainPassthrough ? `
    Write-Host "  Enabling domain pass-through authentication..." -ForegroundColor Yellow
    Enable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "IntegratedWindows"
    ` : `
    Write-Host "  Disabling domain pass-through..." -ForegroundColor Yellow
    Disable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "IntegratedWindows" -ErrorAction SilentlyContinue
    `}
    
    ${enableSmartCard ? `
    Write-Host "  Enabling smart card authentication..." -ForegroundColor Yellow
    Enable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "Certificate"
    ` : `
    Write-Host "  Disabling smart card authentication..." -ForegroundColor Yellow
    Disable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "Certificate" -ErrorAction SilentlyContinue
    `}
    
    ${enableSAML ? `
    Write-Host "  Enabling SAML authentication..." -ForegroundColor Yellow
    Enable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "SAML"
    ` : `
    Write-Host "  Disabling SAML authentication..." -ForegroundColor Yellow
    Disable-STFAuthenticationServiceProtocol -AuthenticationService $AuthService -Name "SAML" -ErrorAction SilentlyContinue
    `}
    
    Write-Host ""
    Write-Host "Authentication configured successfully!" -ForegroundColor Green
    
    # Display current configuration
    Write-Host ""
    Write-Host "Current Authentication Methods:" -ForegroundColor Cyan
    $Protocols = Get-STFAuthenticationServiceProtocol -AuthenticationService $AuthService
    $Protocols | ForEach-Object {
        $Status = if ($_.Enabled) { "Enabled" } else { "Disabled" }
        $Color = if ($_.Enabled) { "Green" } else { "Gray" }
        Write-Host "  $($_.Name): $Status" -ForegroundColor $Color
    }
    
} catch {
    Write-Error "Authentication configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-storefront-configure-gateway',
    name: 'Configure StoreFront Gateway',
    category: 'StoreFront',
    description: 'Add or configure Citrix Gateway for remote access',
    parameters: [
      { id: 'storePath', label: 'Store Virtual Path', type: 'text', required: true, placeholder: '/Citrix/Store' },
      { id: 'gatewayName', label: 'Gateway Name', type: 'text', required: true, placeholder: 'External-Gateway' },
      { id: 'gatewayUrl', label: 'Gateway URL', type: 'text', required: true, placeholder: 'https://gateway.company.com' },
      { id: 'callbackUrl', label: 'Callback URL', type: 'text', required: true, placeholder: 'https://gateway.company.com/CitrixAuthService/AuthService.asmx' },
      { id: 'staUrls', label: 'STA URLs (comma-separated)', type: 'textarea', required: true, placeholder: 'https://ddc1.company.com/scripts/ctxsta.dll' }
    ],
    scriptTemplate: (params) => {
      const storePath = escapePowerShellString(params.storePath);
      const gatewayName = escapePowerShellString(params.gatewayName);
      const gatewayUrl = escapePowerShellString(params.gatewayUrl);
      const callbackUrl = escapePowerShellString(params.callbackUrl);
      const staUrlsRaw = (params.staUrls as string).split(',').map((u: string) => u.trim());
      
      return `# Configure StoreFront Gateway
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.StoreFront -ErrorAction Stop

try {
    Write-Host "Configuring gateway for '${storePath}'..." -ForegroundColor Cyan
    
    $Store = Get-STFStoreService -VirtualPath "${storePath}"
    
    if (-not $Store) {
        throw "Store not found at path '${storePath}'"
    }
    
    $STAUrls = @(${staUrlsRaw.map(u => `"${escapePowerShellString(u)}"`).join(', ')})
    
    # Check if gateway exists
    $ExistingGateway = Get-STFRoamingGateway -Name "${gatewayName}" -ErrorAction SilentlyContinue
    
    if ($ExistingGateway) {
        Write-Host "Updating existing gateway '${gatewayName}'..." -ForegroundColor Yellow
        
        Set-STFRoamingGateway -Name "${gatewayName}" \`
            -GatewayUrl "${gatewayUrl}" \`
            -CallbackUrl "${callbackUrl}" \`
            -SecureTicketAuthorityUrls $STAUrls
    } else {
        Write-Host "Creating new gateway '${gatewayName}'..." -ForegroundColor Yellow
        
        Add-STFRoamingGateway -Name "${gatewayName}" \`
            -GatewayUrl "${gatewayUrl}" \`
            -CallbackUrl "${callbackUrl}" \`
            -SecureTicketAuthorityUrls $STAUrls \`
            -LogonType "Domain" \`
            -SessionReliability $true \`
            -RequestTicketTwoSTAs $false
    }
    
    # Register gateway with store
    $Gateway = Get-STFRoamingGateway -Name "${gatewayName}"
    Register-STFStoreGateway -Gateway $Gateway -StoreService $Store -DefaultGateway
    
    Write-Host ""
    Write-Host "Gateway configured successfully!" -ForegroundColor Green
    Write-Host "  Name: ${gatewayName}" -ForegroundColor Cyan
    Write-Host "  URL: ${gatewayUrl}" -ForegroundColor Cyan
    Write-Host "  Callback: ${callbackUrl}" -ForegroundColor Cyan
    Write-Host "  STA Servers: $($STAUrls.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Gateway configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-storefront-propagate-config',
    name: 'Propagate StoreFront Configuration',
    category: 'StoreFront',
    description: 'Propagate configuration changes to other StoreFront servers',
    parameters: [
      { id: 'targetServers', label: 'Target Servers (comma-separated)', type: 'textarea', required: true, placeholder: 'storefront2.company.com, storefront3.company.com' }
    ],
    scriptTemplate: (params) => {
      const targetServersRaw = (params.targetServers as string).split(',').map((s: string) => s.trim());
      
      return `# Propagate StoreFront Configuration
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.StoreFront -ErrorAction Stop

try {
    Write-Host "Propagating StoreFront configuration..." -ForegroundColor Cyan
    
    $TargetServers = @(${targetServersRaw.map(s => `"${escapePowerShellString(s)}"`).join(', ')})
    
    # Get current deployment
    $Deployment = Get-STFDeployment
    
    if (-not $Deployment) {
        throw "No StoreFront deployment found on this server"
    }
    
    # Export configuration
    Write-Host "Exporting local configuration..." -ForegroundColor Yellow
    $ExportPath = Join-Path $env:TEMP "StoreFrontConfig_$(Get-Date -Format 'yyyyMMddHHmmss').ctxsf"
    Export-STFConfiguration -Path $ExportPath
    
    Write-Host "Configuration exported to: $ExportPath" -ForegroundColor Gray
    
    # Propagate to each server
    foreach ($Server in $TargetServers) {
        Write-Host ""
        Write-Host "Propagating to: $Server" -ForegroundColor Yellow
        
        try {
            # Copy configuration file
            $RemotePath = "\\\\$Server\\C\`$\\Windows\\Temp\\StoreFrontConfig.ctxsf"
            Copy-Item -Path $ExportPath -Destination $RemotePath -Force
            
            # Import on remote server
            Invoke-Command -ComputerName $Server -ScriptBlock {
                param($ConfigPath)
                Add-PSSnapin Citrix.StoreFront -ErrorAction Stop
                Import-STFConfiguration -Path $ConfigPath -Confirm:$false
                Remove-Item $ConfigPath -Force
            } -ArgumentList "C:\\Windows\\Temp\\StoreFrontConfig.ctxsf"
            
            Write-Host "  Configuration propagated successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to propagate: $_" -ForegroundColor Red
        }
    }
    
    # Cleanup
    Remove-Item $ExportPath -Force
    
    Write-Host ""
    Write-Host "Configuration propagation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Configuration propagation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-storefront-subscription-sync',
    name: 'Sync StoreFront Subscriptions',
    category: 'StoreFront',
    description: 'Synchronize user application subscriptions between stores',
    parameters: [
      { id: 'storePath', label: 'Store Virtual Path', type: 'text', required: true, placeholder: '/Citrix/Store' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Export', 'Import', 'Sync'], defaultValue: 'Export' },
      { id: 'filePath', label: 'Export/Import File Path', type: 'path', required: false, placeholder: 'C:\\Backups\\Subscriptions.xml' }
    ],
    scriptTemplate: (params) => {
      const storePath = escapePowerShellString(params.storePath);
      const action = params.action;
      const filePath = params.filePath ? escapePowerShellString(params.filePath) : '';
      
      return `# Sync StoreFront Subscriptions
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.StoreFront -ErrorAction Stop

try {
    $Store = Get-STFStoreService -VirtualPath "${storePath}"
    
    if (-not $Store) {
        throw "Store not found at path '${storePath}'"
    }
    
    switch ("${action}") {
        "Export" {
            Write-Host "Exporting subscriptions from '${storePath}'..." -ForegroundColor Cyan
            
            $Subscriptions = Get-STFStoreSubscriptions -StoreService $Store
            
            if ($Subscriptions) {
                $Subscriptions | Export-Clixml -Path "${filePath}"
                Write-Host "Subscriptions exported to: ${filePath}" -ForegroundColor Green
                Write-Host "  Total subscriptions: $($Subscriptions.Count)" -ForegroundColor Cyan
            } else {
                Write-Host "No subscriptions found" -ForegroundColor Yellow
            }
        }
        "Import" {
            Write-Host "Importing subscriptions to '${storePath}'..." -ForegroundColor Cyan
            
            if (-not (Test-Path "${filePath}")) {
                throw "Import file not found: ${filePath}"
            }
            
            $Subscriptions = Import-Clixml -Path "${filePath}"
            
            foreach ($Sub in $Subscriptions) {
                try {
                    Set-STFStoreSubscriptions -StoreService $Store \`
                        -SubscriptionId $Sub.SubscriptionId \`
                        -User $Sub.User
                    Write-Host "  Imported: $($Sub.User)" -ForegroundColor Green
                } catch {
                    Write-Host "  Failed: $($Sub.User) - $_" -ForegroundColor Red
                }
            }
            
            Write-Host ""
            Write-Host "Import completed!" -ForegroundColor Green
        }
        "Sync" {
            Write-Host "Synchronizing subscriptions for '${storePath}'..." -ForegroundColor Cyan
            
            # Get subscription store service
            $SubStore = Get-STFStoreSubscriptionsDatabase -StoreService $Store
            
            if ($SubStore) {
                Restore-STFStoreSubscriptions -StoreService $Store
                Write-Host "Subscriptions synchronized!" -ForegroundColor Green
            } else {
                Write-Host "No subscription database configured" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Error "Subscription operation failed: $_"
}`;
    },
    isPremium: true
  },

  // Additional utility tasks
  {
    id: 'citrix-site-health-report',
    name: 'Generate Site Health Report',
    category: 'Monitoring',
    description: 'Comprehensive health report for entire Citrix site',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'exportPath', label: 'Export HTML Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SiteHealth.html' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate Citrix Site Health Report
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    Write-Host "Generating comprehensive site health report..." -ForegroundColor Cyan
    
    # Collect data
    $Site = Get-BrokerSite -AdminAddress "${ddc}"
    $Catalogs = Get-BrokerCatalog -AdminAddress "${ddc}"
    $DeliveryGroups = Get-BrokerDesktopGroup -AdminAddress "${ddc}"
    $Machines = Get-BrokerMachine -AdminAddress "${ddc}"
    $Sessions = Get-BrokerSession -AdminAddress "${ddc}"
    $Apps = Get-BrokerApplication -AdminAddress "${ddc}"
    
    # Calculate metrics
    $TotalMachines = $Machines.Count
    $RegisteredMachines = ($Machines | Where-Object { $_.RegistrationState -eq "Registered" }).Count
    $MaintenanceMachines = ($Machines | Where-Object { $_.InMaintenanceMode }).Count
    $PoweredOnMachines = ($Machines | Where-Object { $_.PowerState -eq "On" }).Count
    $ActiveSessions = ($Sessions | Where-Object { $_.SessionState -eq "Active" }).Count
    $DisconnectedSessions = ($Sessions | Where-Object { $_.SessionState -eq "Disconnected" }).Count
    
    # Build HTML report
    $HTML = @"
<!DOCTYPE html>
<html>
<head>
    <title>Citrix Site Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #0066cc; }
        h2 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f5f5f5; border-radius: 5px; min-width: 150px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #0066cc; }
        .metric-label { font-size: 12px; color: #666; }
        .healthy { color: green; }
        .warning { color: orange; }
        .critical { color: red; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #0066cc; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
    </style>
</head>
<body>
    <h1>Citrix Site Health Report</h1>
    <p>Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
    <p>Site: $($Site.Name)</p>
    
    <h2>Overview Metrics</h2>
    <div class="metric"><div class="metric-value">$TotalMachines</div><div class="metric-label">Total Machines</div></div>
    <div class="metric"><div class="metric-value healthy">$RegisteredMachines</div><div class="metric-label">Registered</div></div>
    <div class="metric"><div class="metric-value warning">$MaintenanceMachines</div><div class="metric-label">In Maintenance</div></div>
    <div class="metric"><div class="metric-value">$($Sessions.Count)</div><div class="metric-label">Total Sessions</div></div>
    <div class="metric"><div class="metric-value healthy">$ActiveSessions</div><div class="metric-label">Active Sessions</div></div>
    <div class="metric"><div class="metric-value warning">$DisconnectedSessions</div><div class="metric-label">Disconnected</div></div>
    
    <h2>Delivery Groups</h2>
    <table>
        <tr><th>Name</th><th>Machines</th><th>Sessions</th><th>Delivery Type</th></tr>
        $(foreach ($DG in $DeliveryGroups) {
            "<tr><td>$($DG.Name)</td><td>$($DG.TotalMachines)</td><td>$($DG.Sessions)</td><td>$($DG.DeliveryType)</td></tr>"
        })
    </table>
    
    <h2>Machine Catalogs</h2>
    <table>
        <tr><th>Name</th><th>Machine Count</th><th>Provisioning Type</th><th>Session Support</th></tr>
        $(foreach ($Cat in $Catalogs) {
            "<tr><td>$($Cat.Name)</td><td>$($Cat.UsedCount)</td><td>$($Cat.ProvisioningType)</td><td>$($Cat.SessionSupport)</td></tr>"
        })
    </table>
    
    <h2>Applications</h2>
    <table>
        <tr><th>Name</th><th>Enabled</th><th>Visible</th><th>Application Type</th></tr>
        $(foreach ($App in $Apps) {
            $EnabledStatus = if ($App.Enabled) { "<span class='healthy'>Yes</span>" } else { "<span class='critical'>No</span>" }
            "<tr><td>$($App.Name)</td><td>$EnabledStatus</td><td>$($App.Visible)</td><td>$($App.ApplicationType)</td></tr>"
        })
    </table>
</body>
</html>
"@
    
    $HTML | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    Write-Host ""
    Write-Host "Site health report generated!" -ForegroundColor Green
    Write-Host "  Report: ${exportPath}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Quick Summary:" -ForegroundColor Cyan
    Write-Host "  Total Machines: $TotalMachines" -ForegroundColor White
    Write-Host "  Registered: $RegisteredMachines ($([math]::Round($RegisteredMachines / $TotalMachines * 100, 1))%)" -ForegroundColor $(if ($RegisteredMachines -eq $TotalMachines) { "Green" } else { "Yellow" })
    Write-Host "  Total Sessions: $($Sessions.Count)" -ForegroundColor White
    Write-Host "  Applications: $($Apps.Count)" -ForegroundColor White
    
} catch {
    Write-Error "Site health report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'citrix-tag-management',
    name: 'Manage Machine Tags',
    category: 'Machine Catalogs',
    description: 'Add, remove, or list tags on machines for filtering and targeting',
    parameters: [
      { id: 'ddc', label: 'Delivery Controller', type: 'text', required: true, placeholder: 'citrix-ddc.company.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['AddTag', 'RemoveTag', 'ListTags', 'CreateTag'], defaultValue: 'AddTag' },
      { id: 'tagName', label: 'Tag Name', type: 'text', required: true, placeholder: 'Production' },
      { id: 'machineNames', label: 'Machine Names (comma-separated)', type: 'textarea', required: false, placeholder: 'VDI-001, VDI-002' },
      { id: 'deliveryGroup', label: 'Delivery Group (for bulk tagging)', type: 'text', required: false, placeholder: 'Finance-Desktops' }
    ],
    scriptTemplate: (params) => {
      const ddc = escapePowerShellString(params.ddc);
      const action = params.action;
      const tagName = escapePowerShellString(params.tagName);
      const machineNamesRaw = params.machineNames ? (params.machineNames as string).split(',').map((n: string) => n.trim()) : [];
      const deliveryGroup = params.deliveryGroup ? escapePowerShellString(params.deliveryGroup) : '';
      
      return `# Manage Machine Tags
# Generated: ${new Date().toISOString()}

Add-PSSnapin Citrix.Broker.Admin.V2 -ErrorAction Stop

try {
    switch ("${action}") {
        "CreateTag" {
            Write-Host "Creating tag '${tagName}'..." -ForegroundColor Cyan
            
            $ExistingTag = Get-BrokerTag -AdminAddress "${ddc}" -Name "${tagName}" -ErrorAction SilentlyContinue
            
            if ($ExistingTag) {
                Write-Host "Tag '${tagName}' already exists" -ForegroundColor Yellow
            } else {
                New-BrokerTag -AdminAddress "${ddc}" -Name "${tagName}"
                Write-Host "Tag '${tagName}' created successfully!" -ForegroundColor Green
            }
        }
        "AddTag" {
            Write-Host "Adding tag '${tagName}' to machines..." -ForegroundColor Cyan
            
            # Ensure tag exists
            $Tag = Get-BrokerTag -AdminAddress "${ddc}" -Name "${tagName}" -ErrorAction SilentlyContinue
            if (-not $Tag) {
                $Tag = New-BrokerTag -AdminAddress "${ddc}" -Name "${tagName}"
            }
            
            # Get machines
            ${machineNamesRaw.length > 0 ? `
            $MachineNames = @(${machineNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
            $Machines = $MachineNames | ForEach-Object { Get-BrokerMachine -AdminAddress "${ddc}" -MachineName "*\\$_" }
            ` : deliveryGroup ? `
            $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -DesktopGroupName "${deliveryGroup}"
            ` : `
            throw "Please specify machine names or a delivery group"
            `}
            
            foreach ($Machine in $Machines) {
                Add-BrokerTag -AdminAddress "${ddc}" -Name "${tagName}" -Machine $Machine
                Write-Host "  Tagged: $($Machine.MachineName)" -ForegroundColor Green
            }
        }
        "RemoveTag" {
            Write-Host "Removing tag '${tagName}' from machines..." -ForegroundColor Cyan
            
            ${machineNamesRaw.length > 0 ? `
            $MachineNames = @(${machineNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
            $Machines = $MachineNames | ForEach-Object { Get-BrokerMachine -AdminAddress "${ddc}" -MachineName "*\\$_" }
            ` : deliveryGroup ? `
            $Machines = Get-BrokerMachine -AdminAddress "${ddc}" -DesktopGroupName "${deliveryGroup}"
            ` : `
            throw "Please specify machine names or a delivery group"
            `}
            
            foreach ($Machine in $Machines) {
                Remove-BrokerTag -AdminAddress "${ddc}" -Name "${tagName}" -Machine $Machine -ErrorAction SilentlyContinue
                Write-Host "  Untagged: $($Machine.MachineName)" -ForegroundColor Green
            }
        }
        "ListTags" {
            Write-Host "Tags in site:" -ForegroundColor Cyan
            $Tags = Get-BrokerTag -AdminAddress "${ddc}"
            
            foreach ($Tag in $Tags) {
                $MachineCount = (Get-BrokerMachine -AdminAddress "${ddc}" -Tag $Tag.Name).Count
                Write-Host "  $($Tag.Name): $MachineCount machines" -ForegroundColor White
            }
        }
    }
    
    Write-Host ""
    Write-Host "Tag operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Tag management failed: $_"
}`;
    },
    isPremium: true
  }
];
