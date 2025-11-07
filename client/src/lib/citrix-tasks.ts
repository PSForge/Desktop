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
  }
];
