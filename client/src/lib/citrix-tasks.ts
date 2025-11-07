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
  }
];
