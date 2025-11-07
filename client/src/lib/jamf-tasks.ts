import { escapePowerShellString } from './powershell-utils';

export interface JAMFTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface JAMFTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: JAMFTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const jamfTasks: JAMFTask[] = [
  {
    id: 'jamf-bulk-deploy-policy',
    name: 'Bulk Deploy Policy',
    category: 'Bulk Operations',
    description: 'Deploy policy to multiple devices',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'computerIds', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyId = escapePowerShellString(params.policyId);
      const computerIdsRaw = (params.computerIds as string).split(',').map((n: string) => n.trim());
      
      return `# JAMF Pro Bulk Deploy Policy
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PolicyId = "${policyId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

$ComputerIds = @(${computerIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    foreach ($ComputerId in $ComputerIds) {
        $Uri = "$JamfUrl/JSSResource/computercommands/command/PolicyById/id/$PolicyId/computerid/$ComputerId"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
        
        Write-Host "✓ Policy deployed to computer: $ComputerId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Policy deployed to $($ComputerIds.Count) devices!" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'jamf-export-inventory',
    name: 'Export Device Inventory',
    category: 'Reporting',
    description: 'Export comprehensive device inventory',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\JAMF-Inventory.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# JAMF Pro Export Device Inventory
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Computers = $Response.computers | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
            SerialNumber = $_.serial_number
            MacAddress = $_.mac_address
            LastCheckIn = $_.report_date
        }
    }
    
    $Computers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Devices: $($Computers.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'jamf-manage-computers',
    name: 'Manage Computers and Mobile Devices',
    category: 'Common Admin Tasks',
    description: 'Retrieve and manage computer and mobile device information',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'deviceType', label: 'Device Type', type: 'select', required: true, options: ['computers', 'mobiledevices'], defaultValue: 'computers' },
      { id: 'deviceId', label: 'Device ID', type: 'text', required: true, placeholder: 'Enter device ID' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const deviceType = escapePowerShellString(params.deviceType);
      const deviceId = escapePowerShellString(params.deviceId);
      
      return `# JAMF Pro Manage Computers and Mobile Devices
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$DeviceType = "${deviceType}"
$DeviceId = "${deviceId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/$DeviceType/id/$DeviceId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "✓ Device Information Retrieved" -ForegroundColor Green
    Write-Host "  Device Name: $($Response.$DeviceType.general.name)" -ForegroundColor Cyan
    Write-Host "  Serial Number: $($Response.$DeviceType.general.serial_number)" -ForegroundColor Cyan
    Write-Host "  Last Check-in: $($Response.$DeviceType.general.last_contact_time)" -ForegroundColor Cyan
    
    $Response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Error "Failed to retrieve device: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-enforce-security-profiles',
    name: 'Enforce Security Profiles',
    category: 'Common Admin Tasks',
    description: 'Deploy and enforce security profiles on devices',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'profileId', label: 'Security Profile ID', type: 'text', required: true },
      { id: 'deviceIds', label: 'Device IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const profileId = escapePowerShellString(params.profileId);
      const deviceIdsRaw = (params.deviceIds as string).split(',').map((n: string) => n.trim());
      
      return `# JAMF Pro Enforce Security Profiles
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ProfileId = "${profileId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

$DeviceIds = @(${deviceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    foreach ($DeviceId in $DeviceIds) {
        $Uri = "$JamfUrl/JSSResource/osxconfigurationprofiles/id/$ProfileId"
        Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers
        
        Write-Host "✓ Security profile enforced on device: $DeviceId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Security profiles enforced on $($DeviceIds.Count) devices!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to enforce security profile: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-enforce-config-profiles',
    name: 'Enforce Configuration Profiles',
    category: 'Common Admin Tasks',
    description: 'Deploy and enforce configuration profiles across devices',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'profileName', label: 'Configuration Profile Name', type: 'text', required: true },
      { id: 'scope', label: 'Scope', type: 'select', required: true, options: ['All Computers', 'Smart Group', 'Specific Computers'], defaultValue: 'All Computers' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const profileName = escapePowerShellString(params.profileName);
      const scope = escapePowerShellString(params.scope);
      
      return `# JAMF Pro Enforce Configuration Profiles
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ProfileName = "${profileName}"
$Scope = "${scope}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
    "Accept" = "application/xml"
}

try {
    $ConfigXml = @"
<os_x_configuration_profile>
    <general>
        <name>$ProfileName</name>
        <description>Enforced configuration profile</description>
    </general>
    <scope>
        <all_computers>$(if ($Scope -eq 'All Computers') { 'true' } else { 'false' })</all_computers>
    </scope>
</os_x_configuration_profile>
"@
    
    $Uri = "$JamfUrl/JSSResource/osxconfigurationprofiles/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $ConfigXml
    
    Write-Host "✓ Configuration profile enforced: $ProfileName" -ForegroundColor Green
    Write-Host "  Scope: $Scope" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to enforce configuration profile: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-manage-policies-scripts',
    name: 'Manage Policies and Scripts',
    category: 'Common Admin Tasks',
    description: 'Create and manage JAMF policies and scripts',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'scriptContent', label: 'Script Content', type: 'textarea', required: true, placeholder: 'Enter bash script content' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyName = escapePowerShellString(params.policyName);
      const scriptContent = escapePowerShellString(params.scriptContent);
      
      return `# JAMF Pro Manage Policies and Scripts
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PolicyName = "${policyName}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $ScriptXml = @"
<script>
    <name>$PolicyName-Script</name>
    <script_contents><![CDATA[${scriptContent}]]></script_contents>
</script>
"@
    
    $ScriptUri = "$JamfUrl/JSSResource/scripts/id/0"
    $ScriptResponse = Invoke-RestMethod -Uri $ScriptUri -Method Post -Headers $Headers -Body $ScriptXml
    $ScriptId = $ScriptResponse.script.id
    
    $PolicyXml = @"
<policy>
    <general>
        <name>$PolicyName</name>
        <enabled>true</enabled>
    </general>
    <scripts>
        <script>
            <id>$ScriptId</id>
        </script>
    </scripts>
</policy>
"@
    
    $PolicyUri = "$JamfUrl/JSSResource/policies/id/0"
    Invoke-RestMethod -Uri $PolicyUri -Method Post -Headers $Headers -Body $PolicyXml
    
    Write-Host "✓ Policy and script created: $PolicyName" -ForegroundColor Green
    Write-Host "  Script ID: $ScriptId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create policy/script: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-manage-smart-groups',
    name: 'Manage Smart Groups',
    category: 'Common Admin Tasks',
    description: 'Create and manage smart groups for dynamic device grouping',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'groupName', label: 'Smart Group Name', type: 'text', required: true },
      { id: 'criteria', label: 'Criteria Field', type: 'text', required: true, placeholder: 'Operating System' },
      { id: 'criteriaValue', label: 'Criteria Value', type: 'text', required: true, placeholder: 'macOS 14' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const groupName = escapePowerShellString(params.groupName);
      const criteria = escapePowerShellString(params.criteria);
      const criteriaValue = escapePowerShellString(params.criteriaValue);
      
      return `# JAMF Pro Manage Smart Groups
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$GroupName = "${groupName}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $SmartGroupXml = @"
<computer_group>
    <name>$GroupName</name>
    <is_smart>true</is_smart>
    <criteria>
        <criterion>
            <name>${criteria}</name>
            <search_type>is</search_type>
            <value>${criteriaValue}</value>
        </criterion>
    </criteria>
</computer_group>
"@
    
    $Uri = "$JamfUrl/JSSResource/computergroups/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $SmartGroupXml
    
    Write-Host "✓ Smart group created: $GroupName" -ForegroundColor Green
    Write-Host "  Criteria: ${criteria} = ${criteriaValue}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create smart group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-compliance-reports',
    name: 'Generate Device Compliance Reports',
    category: 'Common Admin Tasks',
    description: 'Generate comprehensive device compliance reports',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\JAMF-Compliance.csv' },
      { id: 'complianceType', label: 'Compliance Type', type: 'select', required: true, options: ['FileVault', 'OS Updates', 'Security Profiles', 'All'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const reportPath = escapePowerShellString(params.reportPath);
      const complianceType = escapePowerShellString(params.complianceType);
      
      return `# JAMF Pro Generate Compliance Reports
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ComplianceType = "${complianceType}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $ComplianceData = @()
    
    foreach ($Computer in $Response.computers) {
        $DetailUri = "$JamfUrl/JSSResource/computers/id/$($Computer.id)"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $ComplianceData += [PSCustomObject]@{
            ComputerName = $Details.computer.general.name
            SerialNumber = $Details.computer.general.serial_number
            OSVersion = $Details.computer.hardware.os_version
            FileVaultEnabled = $Details.computer.hardware.filevault_enabled
            LastCheckIn = $Details.computer.general.last_contact_time
            ComplianceStatus = if ($Details.computer.hardware.filevault_enabled -eq 'true') { 'Compliant' } else { 'Non-Compliant' }
        }
        
        Write-Host "✓ Processed: $($Computer.name)" -ForegroundColor Gray
    }
    
    $ComplianceData | Export-Csv -Path "${reportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "✓ Compliance report generated: ${reportPath}" -ForegroundColor Green
    Write-Host "  Total Devices: $($ComplianceData.Count)" -ForegroundColor Cyan
    Write-Host "  Compliant: $(($ComplianceData | Where-Object ComplianceStatus -eq 'Compliant').Count)" -ForegroundColor Cyan
    Write-Host "  Non-Compliant: $(($ComplianceData | Where-Object ComplianceStatus -eq 'Non-Compliant').Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to generate compliance report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-deploy-software',
    name: 'Deploy Software Packages',
    category: 'Common Admin Tasks',
    description: 'Deploy software packages to managed devices',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'packageId', label: 'Package ID', type: 'text', required: true },
      { id: 'targetDevices', label: 'Target Device IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const packageId = escapePowerShellString(params.packageId);
      const deviceIdsRaw = (params.targetDevices as string).split(',').map((n: string) => n.trim());
      
      return `# JAMF Pro Deploy Software Packages
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PackageId = "${packageId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

$DeviceIds = @(${deviceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    $PolicyXml = @"
<policy>
    <general>
        <name>Software Deployment - Package $PackageId</name>
        <enabled>true</enabled>
    </general>
    <packages>
        <package>
            <id>$PackageId</id>
            <action>Install</action>
        </package>
    </packages>
</policy>
"@
    
    $Uri = "$JamfUrl/JSSResource/policies/id/0"
    $PolicyResponse = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $PolicyXml
    $PolicyId = $PolicyResponse.policy.id
    
    foreach ($DeviceId in $DeviceIds) {
        $CommandUri = "$JamfUrl/JSSResource/computercommands/command/PolicyById/id/$PolicyId/computerid/$DeviceId"
        Invoke-RestMethod -Uri $CommandUri -Method Post -Headers $Headers
        
        Write-Host "✓ Software deployment initiated on device: $DeviceId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Software package deployed to $($DeviceIds.Count) devices!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to deploy software: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-retrieve-filevault-keys',
    name: 'Retrieve FileVault Recovery Keys',
    category: 'Common Admin Tasks',
    description: 'Retrieve FileVault recovery keys for encrypted devices',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'computerId', label: 'Computer ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Keys\\recovery-key.txt' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const computerId = escapePowerShellString(params.computerId);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro Retrieve FileVault Recovery Keys
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ComputerId = "${computerId}"
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers/id/$ComputerId/subset/hardware"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $RecoveryKey = $Response.computer.hardware.filevault2_recovery_key
    
    if ($RecoveryKey) {
        Write-Host "✓ FileVault Recovery Key Retrieved" -ForegroundColor Green
        Write-Host "  Computer: $($Response.computer.general.name)" -ForegroundColor Cyan
        Write-Host "  Recovery Key: $RecoveryKey" -ForegroundColor Yellow
        ${exportPath ? `
        
        $RecoveryKey | Out-File -FilePath $ExportPath -Encoding UTF8
        Write-Host "  Saved to: $ExportPath" -ForegroundColor Cyan` : ''}
    } else {
        Write-Warning "No FileVault recovery key found for this computer"
    }
    
} catch {
    Write-Error "Failed to retrieve FileVault key: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-monitor-inventory',
    name: 'Monitor Device Inventory',
    category: 'Common Admin Tasks',
    description: 'Monitor real-time device inventory and hardware status',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'inventoryType', label: 'Inventory Type', type: 'select', required: true, options: ['All', 'Hardware', 'Software', 'Security'], defaultValue: 'All' },
      { id: 'outputFormat', label: 'Output Format', type: 'select', required: true, options: ['Table', 'CSV', 'JSON'], defaultValue: 'Table' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const inventoryType = escapePowerShellString(params.inventoryType);
      const outputFormat = escapePowerShellString(params.outputFormat);
      
      return `# JAMF Pro Monitor Device Inventory
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$InventoryType = "${inventoryType}"
$OutputFormat = "${outputFormat}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $InventoryData = @()
    
    foreach ($Computer in $Response.computers) {
        $DetailUri = "$JamfUrl/JSSResource/computers/id/$($Computer.id)"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $InventoryData += [PSCustomObject]@{
            ID = $Computer.id
            Name = $Details.computer.general.name
            Model = $Details.computer.hardware.model
            OSVersion = $Details.computer.hardware.os_version
            TotalRAM = $Details.computer.hardware.total_ram
            StorageCapacity = $Details.computer.hardware.storage.disk.size
            LastInventory = $Details.computer.general.last_contact_time
            ManagedStatus = $Details.computer.general.remote_management.managed
        }
        
        Write-Host "✓ Inventoried: $($Computer.name)" -ForegroundColor Gray
    }
    
    Write-Host ""
    
    switch ($OutputFormat) {
        "Table" { $InventoryData | Format-Table -AutoSize }
        "CSV" { 
            $CsvPath = "JAMF-Inventory-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
            $InventoryData | Export-Csv -Path $CsvPath -NoTypeInformation
            Write-Host "✓ Exported to: $CsvPath" -ForegroundColor Green
        }
        "JSON" { $InventoryData | ConvertTo-Json -Depth 5 }
    }
    
    Write-Host ""
    Write-Host "Total Devices Monitored: $($InventoryData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to monitor inventory: $_"
}`;
    },
    isPremium: true
  }
];
