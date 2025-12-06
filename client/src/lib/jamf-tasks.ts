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
  // ==================== DEVICE MANAGEMENT ====================
  {
    id: 'jamf-get-computer-inventory',
    name: 'Get Computer Inventory',
    category: 'Device Management',
    description: 'Retrieve detailed computer inventory information including hardware, software, and security status',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'computerId', label: 'Computer ID', type: 'text', required: true, placeholder: 'Enter computer ID or serial number' },
      { id: 'searchType', label: 'Search By', type: 'select', required: true, options: ['id', 'serialnumber', 'udid', 'macaddress'], defaultValue: 'id' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const computerId = escapePowerShellString(params.computerId);
      const searchType = escapePowerShellString(params.searchType);
      
      return `# JAMF Pro Get Computer Inventory
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ComputerId = "${computerId}"
$SearchType = "${searchType}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers/$SearchType/$ComputerId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Computer = $Response.computer
    
    Write-Host "Computer Inventory Details" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    Write-Host "General Information:" -ForegroundColor Cyan
    Write-Host "  Name: $($Computer.general.name)"
    Write-Host "  Serial Number: $($Computer.general.serial_number)"
    Write-Host "  UDID: $($Computer.general.udid)"
    Write-Host "  Last Check-in: $($Computer.general.last_contact_time)"
    Write-Host "  Managed: $($Computer.general.remote_management.managed)"
    Write-Host ""
    Write-Host "Hardware:" -ForegroundColor Cyan
    Write-Host "  Model: $($Computer.hardware.model)"
    Write-Host "  OS Version: $($Computer.hardware.os_version)"
    Write-Host "  Processor: $($Computer.hardware.processor_type)"
    Write-Host "  Total RAM: $($Computer.hardware.total_ram) MB"
    Write-Host "  Storage: $($Computer.hardware.storage.device.size) GB"
    Write-Host ""
    Write-Host "Security:" -ForegroundColor Cyan
    Write-Host "  FileVault: $($Computer.hardware.filevault2_status)"
    Write-Host "  SIP Status: $($Computer.hardware.sip_status)"
    Write-Host "  Gatekeeper: $($Computer.hardware.gatekeeper_status)"
    
    $Response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Error "Failed to retrieve computer inventory: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-all-computers',
    name: 'List All Computers',
    category: 'Device Management',
    description: 'Get a list of all computers enrolled in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\computers.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List All Computers
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
            MACAddress = $_.mac_address
            Model = $_.model
            LastCheckIn = $_.report_date_utc
        }
    }
    
    Write-Host "Total Computers: $($Computers.Count)" -ForegroundColor Green
    $Computers | Format-Table -AutoSize
    ${exportPath ? `
    $Computers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list computers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-mobile-device',
    name: 'Get Mobile Device Details',
    category: 'Device Management',
    description: 'Retrieve detailed information about a specific mobile device (iPhone/iPad)',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'deviceId', label: 'Device ID', type: 'text', required: true },
      { id: 'searchType', label: 'Search By', type: 'select', required: true, options: ['id', 'serialnumber', 'udid'], defaultValue: 'id' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const deviceId = escapePowerShellString(params.deviceId);
      const searchType = escapePowerShellString(params.searchType);
      
      return `# JAMF Pro Get Mobile Device Details
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$DeviceId = "${deviceId}"
$SearchType = "${searchType}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/mobiledevices/$SearchType/$DeviceId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Device = $Response.mobile_device
    
    Write-Host "Mobile Device Details" -ForegroundColor Green
    Write-Host "=====================" -ForegroundColor Green
    Write-Host "General:" -ForegroundColor Cyan
    Write-Host "  Name: $($Device.general.name)"
    Write-Host "  Serial Number: $($Device.general.serial_number)"
    Write-Host "  Model: $($Device.general.model)"
    Write-Host "  iOS Version: $($Device.general.os_version)"
    Write-Host "  UDID: $($Device.general.udid)"
    Write-Host "  Last Inventory: $($Device.general.last_inventory_update)"
    Write-Host ""
    Write-Host "Security:" -ForegroundColor Cyan
    Write-Host "  Supervised: $($Device.general.supervised)"
    Write-Host "  Managed: $($Device.general.managed)"
    Write-Host "  Passcode Present: $($Device.security.passcode_present)"
    Write-Host "  Data Encrypted: $($Device.security.data_protection)"
    
    $Response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Error "Failed to retrieve mobile device: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-mobile-devices',
    name: 'List All Mobile Devices',
    category: 'Device Management',
    description: 'Get a list of all mobile devices enrolled in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\mobile-devices.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List All Mobile Devices
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/mobiledevices"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Devices = $Response.mobile_devices | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
            SerialNumber = $_.serial_number
            Model = $_.model
            OSVersion = $_.os_version
            Managed = $_.managed
            Supervised = $_.supervised
        }
    }
    
    Write-Host "Total Mobile Devices: $($Devices.Count)" -ForegroundColor Green
    $Devices | Format-Table -AutoSize
    ${exportPath ? `
    $Devices | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list mobile devices: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-create-static-group',
    name: 'Create Static Computer Group',
    category: 'Device Management',
    description: 'Create a static computer group with specified members',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'computerIds', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true, placeholder: '1, 2, 3, 4' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const groupName = escapePowerShellString(params.groupName);
      const computerIdsRaw = (params.computerIds as string).split(',').map((n: string) => n.trim());
      
      return `# JAMF Pro Create Static Computer Group
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$GroupName = "${groupName}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

$ComputerIds = @(${computerIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    $ComputerElements = $ComputerIds | ForEach-Object { "<computer><id>$_</id></computer>" }
    $ComputerXml = $ComputerElements -join [Environment]::NewLine
    
    $GroupXml = @"
<computer_group>
    <name>$GroupName</name>
    <is_smart>false</is_smart>
    <computers>
        $ComputerXml
    </computers>
</computer_group>
"@
    
    $Uri = "$JamfUrl/JSSResource/computergroups/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $GroupXml
    
    Write-Host "Static group created: $GroupName" -ForegroundColor Green
    Write-Host "  Group ID: $($Response.computer_group.id)" -ForegroundColor Cyan
    Write-Host "  Members: $($ComputerIds.Count) computers" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create static group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-create-smart-group',
    name: 'Create Smart Computer Group',
    category: 'Device Management',
    description: 'Create a smart computer group with dynamic criteria',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'criteriaField', label: 'Criteria Field', type: 'select', required: true, options: ['Operating System Version', 'Computer Name', 'Model', 'Department', 'Building', 'Last Check-in', 'FileVault 2 Status'], defaultValue: 'Operating System Version' },
      { id: 'searchType', label: 'Search Type', type: 'select', required: true, options: ['is', 'is not', 'like', 'not like', 'greater than', 'less than'], defaultValue: 'is' },
      { id: 'criteriaValue', label: 'Criteria Value', type: 'text', required: true, placeholder: 'macOS 14' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const groupName = escapePowerShellString(params.groupName);
      const criteriaField = escapePowerShellString(params.criteriaField);
      const searchType = escapePowerShellString(params.searchType);
      const criteriaValue = escapePowerShellString(params.criteriaValue);
      
      return `# JAMF Pro Create Smart Computer Group
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
            <name>${criteriaField}</name>
            <priority>0</priority>
            <and_or>and</and_or>
            <search_type>${searchType}</search_type>
            <value>${criteriaValue}</value>
        </criterion>
    </criteria>
</computer_group>
"@
    
    $Uri = "$JamfUrl/JSSResource/computergroups/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $SmartGroupXml
    
    Write-Host "Smart group created: $GroupName" -ForegroundColor Green
    Write-Host "  Group ID: $($Response.computer_group.id)" -ForegroundColor Cyan
    Write-Host "  Criteria: ${criteriaField} ${searchType} ${criteriaValue}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create smart group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-update-computer-inventory',
    name: 'Update Computer Inventory',
    category: 'Device Management',
    description: 'Force inventory update on specific computers',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'computerIds', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const computerIdsRaw = (params.computerIds as string).split(',').map((n: string) => n.trim());
      
      return `# JAMF Pro Update Computer Inventory
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

$ComputerIds = @(${computerIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    foreach ($ComputerId in $ComputerIds) {
        $Uri = "$JamfUrl/JSSResource/computercommands/command/UpdateInventory/id/$ComputerId"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
        
        Write-Host "Inventory update sent to computer ID: $ComputerId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Inventory update commands sent to $($ComputerIds.Count) computers" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to send inventory update: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-computer-groups',
    name: 'List Computer Groups',
    category: 'Device Management',
    description: 'Get a list of all computer groups (smart and static)',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'groupType', label: 'Group Type', type: 'select', required: true, options: ['All', 'Smart', 'Static'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const groupType = escapePowerShellString(params.groupType);
      
      return `# JAMF Pro List Computer Groups
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$GroupType = "${groupType}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computergroups"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Groups = $Response.computer_groups | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
            IsSmart = $_.is_smart
        }
    }
    
    switch ($GroupType) {
        'Smart' { $Groups = $Groups | Where-Object { $_.IsSmart -eq $true } }
        'Static' { $Groups = $Groups | Where-Object { $_.IsSmart -eq $false } }
    }
    
    Write-Host "Computer Groups ($GroupType)" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    $Groups | Format-Table -AutoSize
    Write-Host "Total: $($Groups.Count) groups" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list computer groups: $_"
}`;
    },
    isPremium: true
  },

  // ==================== POLICY MANAGEMENT ====================
  {
    id: 'jamf-create-policy',
    name: 'Create Policy',
    category: 'Policy Management',
    description: 'Create a new JAMF Pro policy with specified settings',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'trigger', label: 'Trigger', type: 'select', required: true, options: ['Recurring Check-in', 'Enrollment Complete', 'Login', 'Logout', 'Startup', 'Network State Change', 'Custom'], defaultValue: 'Recurring Check-in' },
      { id: 'frequency', label: 'Frequency', type: 'select', required: true, options: ['Once per computer', 'Once per user', 'Once per user per computer', 'Ongoing'], defaultValue: 'Once per computer' },
      { id: 'enabled', label: 'Enabled', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyName = escapePowerShellString(params.policyName);
      const trigger = escapePowerShellString(params.trigger);
      const frequency = escapePowerShellString(params.frequency);
      const enabled = params.enabled ? 'true' : 'false';
      
      return `# JAMF Pro Create Policy
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
    $PolicyXml = @"
<policy>
    <general>
        <name>$PolicyName</name>
        <enabled>${enabled}</enabled>
        <trigger>${trigger === 'Recurring Check-in' ? 'recurring check-in' : trigger.toLowerCase()}</trigger>
        <trigger_checkin>$(if ('${trigger}' -eq 'Recurring Check-in') { 'true' } else { 'false' })</trigger_checkin>
        <trigger_enrollment_complete>$(if ('${trigger}' -eq 'Enrollment Complete') { 'true' } else { 'false' })</trigger_enrollment_complete>
        <trigger_login>$(if ('${trigger}' -eq 'Login') { 'true' } else { 'false' })</trigger_login>
        <trigger_logout>$(if ('${trigger}' -eq 'Logout') { 'true' } else { 'false' })</trigger_logout>
        <trigger_startup>$(if ('${trigger}' -eq 'Startup') { 'true' } else { 'false' })</trigger_startup>
        <trigger_network_state_changed>$(if ('${trigger}' -eq 'Network State Change') { 'true' } else { 'false' })</trigger_network_state_changed>
        <frequency>${frequency}</frequency>
    </general>
    <scope>
        <all_computers>true</all_computers>
    </scope>
</policy>
"@
    
    $Uri = "$JamfUrl/JSSResource/policies/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $PolicyXml
    
    Write-Host "Policy created successfully" -ForegroundColor Green
    Write-Host "  Name: $PolicyName" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.policy.id)" -ForegroundColor Cyan
    Write-Host "  Trigger: ${trigger}" -ForegroundColor Cyan
    Write-Host "  Frequency: ${frequency}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create policy: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-policies',
    name: 'List All Policies',
    category: 'Policy Management',
    description: 'Get a list of all policies in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List All Policies
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/policies"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Policies = $Response.policies | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Total Policies: $($Policies.Count)" -ForegroundColor Green
    $Policies | Format-Table -AutoSize
    ${exportPath ? `
    $Policies | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list policies: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-policy-details',
    name: 'Get Policy Details',
    category: 'Policy Management',
    description: 'Get detailed information about a specific policy',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyId = escapePowerShellString(params.policyId);
      
      return `# JAMF Pro Get Policy Details
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PolicyId = "${policyId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/policies/id/$PolicyId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Policy = $Response.policy
    
    Write-Host "Policy Details" -ForegroundColor Green
    Write-Host "==============" -ForegroundColor Green
    Write-Host "General:" -ForegroundColor Cyan
    Write-Host "  Name: $($Policy.general.name)"
    Write-Host "  ID: $($Policy.general.id)"
    Write-Host "  Enabled: $($Policy.general.enabled)"
    Write-Host "  Frequency: $($Policy.general.frequency)"
    Write-Host ""
    Write-Host "Triggers:" -ForegroundColor Cyan
    Write-Host "  Check-in: $($Policy.general.trigger_checkin)"
    Write-Host "  Enrollment: $($Policy.general.trigger_enrollment_complete)"
    Write-Host "  Login: $($Policy.general.trigger_login)"
    Write-Host "  Startup: $($Policy.general.trigger_startup)"
    Write-Host ""
    Write-Host "Scope:" -ForegroundColor Cyan
    Write-Host "  All Computers: $($Policy.scope.all_computers)"
    
    $Response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Error "Failed to get policy details: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-update-policy-scope',
    name: 'Update Policy Scope',
    category: 'Policy Management',
    description: 'Update the scope of an existing policy',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'scopeType', label: 'Scope Type', type: 'select', required: true, options: ['All Computers', 'Computer Group', 'Specific Computers'], defaultValue: 'All Computers' },
      { id: 'groupId', label: 'Group/Computer ID (if applicable)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyId = escapePowerShellString(params.policyId);
      const scopeType = escapePowerShellString(params.scopeType);
      const groupId = params.groupId ? escapePowerShellString(params.groupId) : '';
      
      return `# JAMF Pro Update Policy Scope
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PolicyId = "${policyId}"
$ScopeType = "${scopeType}"
${groupId ? `$GroupId = "${groupId}"` : ''}

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $ScopeXml = switch ($ScopeType) {
        'All Computers' {
            "<scope><all_computers>true</all_computers></scope>"
        }
        'Computer Group' {
            "<scope><all_computers>false</all_computers><computer_groups><computer_group><id>$GroupId</id></computer_group></computer_groups></scope>"
        }
        'Specific Computers' {
            "<scope><all_computers>false</all_computers><computers><computer><id>$GroupId</id></computer></computers></scope>"
        }
    }
    
    $PolicyXml = @"
<policy>
    $ScopeXml
</policy>
"@
    
    $Uri = "$JamfUrl/JSSResource/policies/id/$PolicyId"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $PolicyXml
    
    Write-Host "Policy scope updated successfully" -ForegroundColor Green
    Write-Host "  Policy ID: $PolicyId" -ForegroundColor Cyan
    Write-Host "  New Scope: $ScopeType" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update policy scope: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-enable-disable-policy',
    name: 'Enable/Disable Policy',
    category: 'Policy Management',
    description: 'Enable or disable a specific policy',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'enabled', label: 'Enable Policy', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyId = escapePowerShellString(params.policyId);
      const enabled = params.enabled ? 'true' : 'false';
      
      return `# JAMF Pro Enable/Disable Policy
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PolicyId = "${policyId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $PolicyXml = @"
<policy>
    <general>
        <enabled>${enabled}</enabled>
    </general>
</policy>
"@
    
    $Uri = "$JamfUrl/JSSResource/policies/id/$PolicyId"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $PolicyXml
    
    Write-Host "Policy ${enabled === 'true' ? 'enabled' : 'disabled'} successfully" -ForegroundColor Green
    Write-Host "  Policy ID: $PolicyId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update policy: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-flush-policy-logs',
    name: 'Flush Policy Logs',
    category: 'Policy Management',
    description: 'Flush policy logs for a specific policy or all policies',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyId', label: 'Policy ID (leave empty for all)', type: 'text', required: false },
      { id: 'interval', label: 'Flush Interval', type: 'select', required: true, options: ['Zero', 'One Day', 'One Week', 'One Month', 'Three Months', 'Six Months', 'One Year'], defaultValue: 'One Month' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyId = params.policyId ? escapePowerShellString(params.policyId) : '';
      const interval = escapePowerShellString(params.interval);
      
      return `# JAMF Pro Flush Policy Logs
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$Interval = "${interval}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    ${policyId ? `$Uri = "$JamfUrl/JSSResource/logflush/policy/id/${policyId}/interval/$Interval"` : `$Uri = "$JamfUrl/JSSResource/logflush/policies/interval/$Interval"`}
    
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "Policy logs flushed successfully" -ForegroundColor Green
    ${policyId ? `Write-Host "  Policy ID: ${policyId}" -ForegroundColor Cyan` : `Write-Host "  All policies" -ForegroundColor Cyan`}
    Write-Host "  Interval: $Interval" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to flush policy logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-bulk-deploy-policy',
    name: 'Bulk Deploy Policy',
    category: 'Policy Management',
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
        
        Write-Host "Policy deployed to computer: $ComputerId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Policy deployed to $($ComputerIds.Count) devices!" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== APPLICATION MANAGEMENT ====================
  {
    id: 'jamf-list-mac-apps',
    name: 'List Mac App Store Apps',
    category: 'Application Management',
    description: 'Get a list of all Mac App Store apps configured in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Mac App Store Apps
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/macapplications"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Apps = $Response.mac_applications | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Mac App Store Apps" -ForegroundColor Green
    Write-Host "==================" -ForegroundColor Green
    $Apps | Format-Table -AutoSize
    Write-Host "Total: $($Apps.Count) apps" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list Mac apps: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-vpp-assignments',
    name: 'Get VPP App Assignments',
    category: 'Application Management',
    description: 'View Volume Purchase Program app assignments',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'appId', label: 'VPP App ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const appId = escapePowerShellString(params.appId);
      
      return `# JAMF Pro Get VPP App Assignments
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$AppId = "${appId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/macapplications/id/$AppId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $App = $Response.mac_application
    
    Write-Host "VPP App Details" -ForegroundColor Green
    Write-Host "===============" -ForegroundColor Green
    Write-Host "Name: $($App.general.name)" -ForegroundColor Cyan
    Write-Host "Bundle ID: $($App.general.bundle_id)" -ForegroundColor Cyan
    Write-Host "Version: $($App.general.version)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Scope:" -ForegroundColor Yellow
    Write-Host "  All Computers: $($App.scope.all_computers)"
    
    if ($App.scope.computer_groups) {
        Write-Host "  Computer Groups:" -ForegroundColor Yellow
        $App.scope.computer_groups | ForEach-Object {
            Write-Host "    - $($_.name) (ID: $($_.id))"
        }
    }
    
    $Response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Error "Failed to get VPP assignments: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-packages',
    name: 'List Software Packages',
    category: 'Application Management',
    description: 'Get a list of all software packages uploaded to JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List Software Packages
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/packages"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Packages = $Response.packages | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Software Packages" -ForegroundColor Green
    Write-Host "=================" -ForegroundColor Green
    $Packages | Format-Table -AutoSize
    Write-Host "Total: $($Packages.Count) packages" -ForegroundColor Cyan
    ${exportPath ? `
    $Packages | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list packages: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-patch-report',
    name: 'Get Patch Management Report',
    category: 'Application Management',
    description: 'Generate a patch management compliance report',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'softwareTitleId', label: 'Software Title ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\patch-report.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const softwareTitleId = escapePowerShellString(params.softwareTitleId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# JAMF Pro Get Patch Management Report
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$SoftwareTitleId = "${softwareTitleId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/patchsoftwaretitles/id/$SoftwareTitleId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Title = $Response.patch_software_title
    
    Write-Host "Patch Software Title: $($Title.name)" -ForegroundColor Green
    Write-Host "==============================" -ForegroundColor Green
    
    $VersionUri = "$JamfUrl/JSSResource/patchreports/patchsoftwaretitleid/$SoftwareTitleId"
    $VersionResponse = Invoke-RestMethod -Uri $VersionUri -Method Get -Headers $Headers
    
    $PatchData = $VersionResponse.patch_report.versions | ForEach-Object {
        [PSCustomObject]@{
            Version = $_.software_version
            ComputerCount = $_.computers.Count
            Computers = ($_.computers.name -join ', ')
        }
    }
    
    $PatchData | Format-Table -AutoSize
    $PatchData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Report exported to: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to get patch report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-deploy-software',
    name: 'Deploy Software Package',
    category: 'Application Management',
    description: 'Deploy a software package to specified computers',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'packageId', label: 'Package ID', type: 'text', required: true },
      { id: 'targetDevices', label: 'Target Computer IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'installAction', label: 'Install Action', type: 'select', required: true, options: ['Install', 'Cache', 'Install Cached'], defaultValue: 'Install' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const packageId = escapePowerShellString(params.packageId);
      const installAction = escapePowerShellString(params.installAction);
      const deviceIdsRaw = (params.targetDevices as string).split(',').map((n: string) => n.trim());
      
      return `# JAMF Pro Deploy Software Package
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PackageId = "${packageId}"
$InstallAction = "${installAction}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

$DeviceIds = @(${deviceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    $ComputerElements = $DeviceIds | ForEach-Object { "<computer><id>$_</id></computer>" }
    $ComputerXml = $ComputerElements -join [Environment]::NewLine
    
    $PolicyXml = @"
<policy>
    <general>
        <name>Deploy Package $PackageId - $(Get-Date -Format 'yyyyMMdd-HHmmss')</name>
        <enabled>true</enabled>
        <trigger>EVENT</trigger>
        <trigger_other>DeployPackage$PackageId</trigger_other>
        <frequency>Once per computer</frequency>
    </general>
    <scope>
        <computers>
            $ComputerXml
        </computers>
    </scope>
    <package_configuration>
        <packages>
            <size>1</size>
            <package>
                <id>$PackageId</id>
                <action>$InstallAction</action>
            </package>
        </packages>
    </package_configuration>
</policy>
"@
    
    $Uri = "$JamfUrl/JSSResource/policies/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $PolicyXml
    $CreatedPolicyId = $Response.policy.id
    
    Write-Host "Deployment policy created: $CreatedPolicyId" -ForegroundColor Green
    
    foreach ($DeviceId in $DeviceIds) {
        $CommandUri = "$JamfUrl/JSSResource/computercommands/command/PolicyById/id/$CreatedPolicyId/computerid/$DeviceId"
        Invoke-RestMethod -Uri $CommandUri -Method Post -Headers $Headers
        Write-Host "  Deployment initiated on computer: $DeviceId" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Package deployment initiated on $($DeviceIds.Count) computers" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to deploy package: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-patch-titles',
    name: 'List Patch Software Titles',
    category: 'Application Management',
    description: 'Get a list of all patch software titles configured in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Patch Software Titles
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/patchsoftwaretitles"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Titles = $Response.patch_software_titles | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Patch Software Titles" -ForegroundColor Green
    Write-Host "=====================" -ForegroundColor Green
    $Titles | Format-Table -AutoSize
    Write-Host "Total: $($Titles.Count) titles" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list patch titles: $_"
}`;
    },
    isPremium: true
  },

  // ==================== CONFIGURATION PROFILES ====================
  {
    id: 'jamf-list-config-profiles',
    name: 'List Configuration Profiles',
    category: 'Configuration Profiles',
    description: 'Get a list of all macOS configuration profiles',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List Configuration Profiles
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/osxconfigurationprofiles"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Profiles = $Response.os_x_configuration_profiles | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "macOS Configuration Profiles" -ForegroundColor Green
    Write-Host "============================" -ForegroundColor Green
    $Profiles | Format-Table -AutoSize
    Write-Host "Total: $($Profiles.Count) profiles" -ForegroundColor Cyan
    ${exportPath ? `
    $Profiles | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list configuration profiles: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-config-profile',
    name: 'Get Configuration Profile Details',
    category: 'Configuration Profiles',
    description: 'Get detailed information about a specific configuration profile',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const profileId = escapePowerShellString(params.profileId);
      
      return `# JAMF Pro Get Configuration Profile Details
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ProfileId = "${profileId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/osxconfigurationprofiles/id/$ProfileId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Profile = $Response.os_x_configuration_profile
    
    Write-Host "Configuration Profile Details" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Green
    Write-Host "General:" -ForegroundColor Cyan
    Write-Host "  Name: $($Profile.general.name)"
    Write-Host "  ID: $($Profile.general.id)"
    Write-Host "  Description: $($Profile.general.description)"
    Write-Host "  Distribution Method: $($Profile.general.distribution_method)"
    Write-Host "  Level: $($Profile.general.level)"
    Write-Host ""
    Write-Host "Scope:" -ForegroundColor Cyan
    Write-Host "  All Computers: $($Profile.scope.all_computers)"
    Write-Host "  All Users: $($Profile.scope.all_jss_users)"
    
    $Response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Error "Failed to get configuration profile: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-create-config-profile',
    name: 'Create Configuration Profile',
    category: 'Configuration Profiles',
    description: 'Create a new macOS configuration profile',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'profileName', label: 'Profile Name', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'level', label: 'Level', type: 'select', required: true, options: ['Computer', 'User'], defaultValue: 'Computer' },
      { id: 'distributionMethod', label: 'Distribution Method', type: 'select', required: true, options: ['Install Automatically', 'Make Available in Self Service'], defaultValue: 'Install Automatically' },
      { id: 'payloadXml', label: 'Payload XML (Base64 encoded mobileconfig)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const profileName = escapePowerShellString(params.profileName);
      const description = params.description ? escapePowerShellString(params.description) : '';
      const level = escapePowerShellString(params.level);
      const distributionMethod = escapePowerShellString(params.distributionMethod);
      const payloadXml = escapePowerShellString(params.payloadXml);
      
      return `# JAMF Pro Create Configuration Profile
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ProfileName = "${profileName}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $ProfileXml = @"
<os_x_configuration_profile>
    <general>
        <name>$ProfileName</name>
        <description>${description}</description>
        <distribution_method>${distributionMethod}</distribution_method>
        <level>${level.toLowerCase()}</level>
        <payloads>${payloadXml}</payloads>
    </general>
    <scope>
        <all_computers>true</all_computers>
    </scope>
</os_x_configuration_profile>
"@
    
    $Uri = "$JamfUrl/JSSResource/osxconfigurationprofiles/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $ProfileXml
    
    Write-Host "Configuration profile created successfully" -ForegroundColor Green
    Write-Host "  Name: $ProfileName" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.os_x_configuration_profile.id)" -ForegroundColor Cyan
    Write-Host "  Level: ${level}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create configuration profile: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-update-config-profile-scope',
    name: 'Update Configuration Profile Scope',
    category: 'Configuration Profiles',
    description: 'Update the scope of an existing configuration profile',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true },
      { id: 'scopeType', label: 'Scope Type', type: 'select', required: true, options: ['All Computers', 'Computer Group', 'Specific Computers'], defaultValue: 'All Computers' },
      { id: 'groupId', label: 'Group/Computer ID (if applicable)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const profileId = escapePowerShellString(params.profileId);
      const scopeType = escapePowerShellString(params.scopeType);
      const groupId = params.groupId ? escapePowerShellString(params.groupId) : '';
      
      return `# JAMF Pro Update Configuration Profile Scope
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ProfileId = "${profileId}"
$ScopeType = "${scopeType}"
${groupId ? `$GroupId = "${groupId}"` : ''}

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $ScopeXml = switch ($ScopeType) {
        'All Computers' {
            "<scope><all_computers>true</all_computers></scope>"
        }
        'Computer Group' {
            "<scope><all_computers>false</all_computers><computer_groups><computer_group><id>$GroupId</id></computer_group></computer_groups></scope>"
        }
        'Specific Computers' {
            "<scope><all_computers>false</all_computers><computers><computer><id>$GroupId</id></computer></computers></scope>"
        }
    }
    
    $ProfileXml = @"
<os_x_configuration_profile>
    $ScopeXml
</os_x_configuration_profile>
"@
    
    $Uri = "$JamfUrl/JSSResource/osxconfigurationprofiles/id/$ProfileId"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $ProfileXml
    
    Write-Host "Configuration profile scope updated successfully" -ForegroundColor Green
    Write-Host "  Profile ID: $ProfileId" -ForegroundColor Cyan
    Write-Host "  New Scope: $ScopeType" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update profile scope: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-mobile-profiles',
    name: 'List Mobile Device Profiles',
    category: 'Configuration Profiles',
    description: 'Get a list of all iOS/iPadOS configuration profiles',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Mobile Device Profiles
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/mobiledeviceconfigurationprofiles"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Profiles = $Response.configuration_profiles | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Mobile Device Configuration Profiles" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    $Profiles | Format-Table -AutoSize
    Write-Host "Total: $($Profiles.Count) profiles" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list mobile profiles: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-delete-config-profile',
    name: 'Delete Configuration Profile',
    category: 'Configuration Profiles',
    description: 'Delete a configuration profile from JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true },
      { id: 'profileType', label: 'Profile Type', type: 'select', required: true, options: ['macOS', 'iOS/iPadOS'], defaultValue: 'macOS' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const profileId = escapePowerShellString(params.profileId);
      const profileType = escapePowerShellString(params.profileType);
      
      return `# JAMF Pro Delete Configuration Profile
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ProfileId = "${profileId}"
$ProfileType = "${profileType}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
}

try {
    $Endpoint = if ($ProfileType -eq 'macOS') { 'osxconfigurationprofiles' } else { 'mobiledeviceconfigurationprofiles' }
    $Uri = "$JamfUrl/JSSResource/$Endpoint/id/$ProfileId"
    
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "Configuration profile deleted successfully" -ForegroundColor Green
    Write-Host "  Profile ID: $ProfileId" -ForegroundColor Cyan
    Write-Host "  Type: $ProfileType" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to delete configuration profile: $_"
}`;
    },
    isPremium: true
  },

  // ==================== USER MANAGEMENT ====================
  {
    id: 'jamf-list-users',
    name: 'List JAMF Pro Users',
    category: 'User Management',
    description: 'Get a list of all JAMF Pro administrator accounts',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Users
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/accounts"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "JAMF Pro User Accounts" -ForegroundColor Green
    Write-Host "======================" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Users:" -ForegroundColor Cyan
    $Response.accounts.users | ForEach-Object {
        Write-Host "  ID: $($_.id) - $($_.name)"
    }
    
    Write-Host ""
    Write-Host "Groups:" -ForegroundColor Cyan
    $Response.accounts.groups | ForEach-Object {
        Write-Host "  ID: $($_.id) - $($_.name)"
    }
    
} catch {
    Write-Error "Failed to list users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-create-local-account',
    name: 'Create Local User Account',
    category: 'User Management',
    description: 'Create a local administrator account in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'fullName', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'password', label: 'Password', type: 'text', required: true },
      { id: 'privilegeSet', label: 'Privilege Set', type: 'select', required: true, options: ['Administrator', 'Auditor', 'Enrollment Only', 'Custom'], defaultValue: 'Custom' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const username = escapePowerShellString(params.username);
      const fullName = escapePowerShellString(params.fullName);
      const email = escapePowerShellString(params.email);
      const password = escapePowerShellString(params.password);
      const privilegeSet = escapePowerShellString(params.privilegeSet);
      
      return `# JAMF Pro Create Local User Account
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$Username = "${username}"
$FullName = "${fullName}"
$Email = "${email}"
$PrivilegeSet = "${privilegeSet}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $UserXml = @"
<account>
    <name>$Username</name>
    <full_name>$FullName</full_name>
    <email>$Email</email>
    <password>${password}</password>
    <enabled>Enabled</enabled>
    <access_level>Full Access</access_level>
    <privilege_set>$PrivilegeSet</privilege_set>
</account>
"@
    
    $Uri = "$JamfUrl/JSSResource/accounts/userid/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $UserXml
    
    Write-Host "User account created successfully" -ForegroundColor Green
    Write-Host "  Username: $Username" -ForegroundColor Cyan
    Write-Host "  Full Name: $FullName" -ForegroundColor Cyan
    Write-Host "  Email: $Email" -ForegroundColor Cyan
    Write-Host "  Privilege Set: $PrivilegeSet" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create user account: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-ldap-servers',
    name: 'List LDAP Servers',
    category: 'User Management',
    description: 'Get a list of configured LDAP servers',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List LDAP Servers
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/ldapservers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $LdapServers = $Response.ldap_servers | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "LDAP Servers" -ForegroundColor Green
    Write-Host "============" -ForegroundColor Green
    $LdapServers | Format-Table -AutoSize
    Write-Host "Total: $($LdapServers.Count) servers" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list LDAP servers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-search-ldap-user',
    name: 'Search LDAP User',
    category: 'User Management',
    description: 'Search for a user in configured LDAP directory',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'ldapServerId', label: 'LDAP Server ID', type: 'text', required: true },
      { id: 'searchTerm', label: 'Search Term (username or email)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const ldapServerId = escapePowerShellString(params.ldapServerId);
      const searchTerm = escapePowerShellString(params.searchTerm);
      
      return `# JAMF Pro Search LDAP User
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$LdapServerId = "${ldapServerId}"
$SearchTerm = "${searchTerm}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/ldapservers/id/$LdapServerId/user/$SearchTerm"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "LDAP User Search Results" -ForegroundColor Green
    Write-Host "========================" -ForegroundColor Green
    
    $Response.ldap_users | ForEach-Object {
        Write-Host ""
        Write-Host "Username: $($_.username)" -ForegroundColor Cyan
        Write-Host "  Full Name: $($_.full_name)"
        Write-Host "  Email: $($_.email)"
        Write-Host "  Phone: $($_.phone_number)"
        Write-Host "  Position: $($_.position)"
        Write-Host "  Department: $($_.department)"
    }
    
} catch {
    Write-Error "Failed to search LDAP user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-user-groups',
    name: 'List User Groups',
    category: 'User Management',
    description: 'Get a list of all user groups in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List User Groups
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/usergroups"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Groups = $Response.user_groups | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
            IsSmart = $_.is_smart
        }
    }
    
    Write-Host "User Groups" -ForegroundColor Green
    Write-Host "===========" -ForegroundColor Green
    $Groups | Format-Table -AutoSize
    Write-Host "Total: $($Groups.Count) groups" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list user groups: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-create-user-group',
    name: 'Create User Group',
    category: 'User Management',
    description: 'Create a new user group in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'isSmart', label: 'Smart Group', type: 'boolean', required: true, defaultValue: false },
      { id: 'usernames', label: 'Usernames (comma-separated, for static groups)', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const groupName = escapePowerShellString(params.groupName);
      const isSmart = params.isSmart ? 'true' : 'false';
      const usernamesRaw = params.usernames ? (params.usernames as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# JAMF Pro Create User Group
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
    ${usernamesRaw.length > 0 ? `$Usernames = @(${usernamesRaw.map(u => `"${escapePowerShellString(u)}"`).join(', ')})
    $UserElements = $Usernames | ForEach-Object { "<user><name>$_</name></user>" }
    $UsersXml = $UserElements -join [Environment]::NewLine` : '$UsersXml = ""'}
    
    $GroupXml = @"
<user_group>
    <name>$GroupName</name>
    <is_smart>${isSmart}</is_smart>
    ${usernamesRaw.length > 0 ? `<users>
        $UsersXml
    </users>` : ''}
</user_group>
"@
    
    $Uri = "$JamfUrl/JSSResource/usergroups/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $GroupXml
    
    Write-Host "User group created successfully" -ForegroundColor Green
    Write-Host "  Name: $GroupName" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.user_group.id)" -ForegroundColor Cyan
    Write-Host "  Smart Group: ${isSmart}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create user group: $_"
}`;
    },
    isPremium: true
  },

  // ==================== REPORTING ====================
  {
    id: 'jamf-export-inventory',
    name: 'Export Device Inventory Report',
    category: 'Reporting',
    description: 'Export comprehensive device inventory to CSV',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
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
    
    Write-Host "Inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Devices: $($Computers.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-compliance-report',
    name: 'Generate Compliance Report',
    category: 'Reporting',
    description: 'Generate a comprehensive device compliance report',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\compliance.csv' },
      { id: 'complianceChecks', label: 'Compliance Checks', type: 'select', required: true, options: ['FileVault', 'OS Version', 'SIP Status', 'Gatekeeper', 'All'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const reportPath = escapePowerShellString(params.reportPath);
      const complianceChecks = escapePowerShellString(params.complianceChecks);
      
      return `# JAMF Pro Generate Compliance Report
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ComplianceChecks = "${complianceChecks}"

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
    $TotalComputers = $Response.computers.Count
    $CurrentComputer = 0
    
    foreach ($Computer in $Response.computers) {
        $CurrentComputer++
        Write-Progress -Activity "Processing Computers" -Status "$CurrentComputer of $TotalComputers" -PercentComplete (($CurrentComputer / $TotalComputers) * 100)
        
        $DetailUri = "$JamfUrl/JSSResource/computers/id/$($Computer.id)"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $Hardware = $Details.computer.hardware
        $General = $Details.computer.general
        
        $ComplianceData += [PSCustomObject]@{
            ComputerName = $General.name
            SerialNumber = $General.serial_number
            OSVersion = $Hardware.os_version
            FileVaultEnabled = $Hardware.filevault2_status
            SIPStatus = $Hardware.sip_status
            GatekeeperStatus = $Hardware.gatekeeper_status
            LastCheckIn = $General.last_contact_time
            Managed = $General.remote_management.managed
        }
    }
    
    $ComplianceData | Export-Csv -Path "${reportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Compliance Report Generated: ${reportPath}" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "Total Devices: $($ComplianceData.Count)" -ForegroundColor Cyan
    Write-Host "FileVault Enabled: $(($ComplianceData | Where-Object { $_.FileVaultEnabled -like '*Encrypted*' }).Count)" -ForegroundColor Cyan
    Write-Host "SIP Enabled: $(($ComplianceData | Where-Object { $_.SIPStatus -eq 'Enabled' }).Count)" -ForegroundColor Cyan
    Write-Host "Gatekeeper Enabled: $(($ComplianceData | Where-Object { $_.GatekeeperStatus -like '*Enabled*' }).Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to generate compliance report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-hardware-report',
    name: 'Generate Hardware Report',
    category: 'Reporting',
    description: 'Generate a detailed hardware inventory report',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\hardware.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const reportPath = escapePowerShellString(params.reportPath);
      
      return `# JAMF Pro Generate Hardware Report
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
    
    $HardwareData = @()
    $TotalComputers = $Response.computers.Count
    $CurrentComputer = 0
    
    foreach ($Computer in $Response.computers) {
        $CurrentComputer++
        Write-Progress -Activity "Gathering Hardware Info" -Status "$CurrentComputer of $TotalComputers" -PercentComplete (($CurrentComputer / $TotalComputers) * 100)
        
        $DetailUri = "$JamfUrl/JSSResource/computers/id/$($Computer.id)"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $Hardware = $Details.computer.hardware
        $General = $Details.computer.general
        
        $HardwareData += [PSCustomObject]@{
            ComputerName = $General.name
            SerialNumber = $General.serial_number
            Model = $Hardware.model
            ModelIdentifier = $Hardware.model_identifier
            Processor = $Hardware.processor_type
            ProcessorSpeed = $Hardware.processor_speed_mhz
            NumberOfCores = $Hardware.number_cores
            TotalRAM_MB = $Hardware.total_ram
            OSVersion = $Hardware.os_version
            OSBuild = $Hardware.os_build
            BootROM = $Hardware.boot_rom
            SMCVersion = $Hardware.smc_version
        }
    }
    
    $HardwareData | Export-Csv -Path "${reportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Hardware Report Generated: ${reportPath}" -ForegroundColor Green
    Write-Host "Total Devices: $($HardwareData.Count)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Model Summary:" -ForegroundColor Yellow
    $HardwareData | Group-Object -Property Model | Sort-Object -Property Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    
} catch {
    Write-Error "Failed to generate hardware report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-software-report',
    name: 'Generate Software Report',
    category: 'Reporting',
    description: 'Generate a report of installed software across all computers',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\software.csv' },
      { id: 'softwareName', label: 'Software Name Filter (optional)', type: 'text', required: false, placeholder: 'Microsoft Office' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const reportPath = escapePowerShellString(params.reportPath);
      const softwareName = params.softwareName ? escapePowerShellString(params.softwareName) : '';
      
      return `# JAMF Pro Generate Software Report
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
${softwareName ? `$SoftwareFilter = "${softwareName}"` : '$SoftwareFilter = $null'}

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $SoftwareData = @()
    $TotalComputers = $Response.computers.Count
    $CurrentComputer = 0
    
    foreach ($Computer in $Response.computers) {
        $CurrentComputer++
        Write-Progress -Activity "Gathering Software Info" -Status "$CurrentComputer of $TotalComputers" -PercentComplete (($CurrentComputer / $TotalComputers) * 100)
        
        $DetailUri = "$JamfUrl/JSSResource/computers/id/$($Computer.id)/subset/software"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $Applications = $Details.computer.software.applications
        
        if ($SoftwareFilter) {
            $Applications = $Applications | Where-Object { $_.name -like "*$SoftwareFilter*" }
        }
        
        foreach ($App in $Applications) {
            $SoftwareData += [PSCustomObject]@{
                ComputerName = $Computer.name
                ComputerID = $Computer.id
                ApplicationName = $App.name
                Version = $App.version
                Path = $App.path
            }
        }
    }
    
    $SoftwareData | Export-Csv -Path "${reportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Software Report Generated: ${reportPath}" -ForegroundColor Green
    Write-Host "Total Software Records: $($SoftwareData.Count)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Most Common Applications:" -ForegroundColor Yellow
    $SoftwareData | Group-Object -Property ApplicationName | Sort-Object -Property Count -Descending | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) installations"
    }
    
} catch {
    Write-Error "Failed to generate software report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-extension-attribute-report',
    name: 'Extension Attribute Report',
    category: 'Reporting',
    description: 'Generate a report based on extension attribute values',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'extensionAttributeName', label: 'Extension Attribute Name', type: 'text', required: true },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ea-report.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const extensionAttributeName = escapePowerShellString(params.extensionAttributeName);
      const reportPath = escapePowerShellString(params.reportPath);
      
      return `# JAMF Pro Extension Attribute Report
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$EAName = "${extensionAttributeName}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $EAData = @()
    $TotalComputers = $Response.computers.Count
    $CurrentComputer = 0
    
    foreach ($Computer in $Response.computers) {
        $CurrentComputer++
        Write-Progress -Activity "Gathering EA Data" -Status "$CurrentComputer of $TotalComputers" -PercentComplete (($CurrentComputer / $TotalComputers) * 100)
        
        $DetailUri = "$JamfUrl/JSSResource/computers/id/$($Computer.id)/subset/extensionattributes"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $EA = $Details.computer.extension_attributes | Where-Object { $_.name -eq $EAName }
        
        $EAData += [PSCustomObject]@{
            ComputerName = $Computer.name
            ComputerID = $Computer.id
            SerialNumber = $Computer.serial_number
            ExtensionAttributeName = $EAName
            Value = if ($EA) { $EA.value } else { 'N/A' }
        }
    }
    
    $EAData | Export-Csv -Path "${reportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Extension Attribute Report Generated: ${reportPath}" -ForegroundColor Green
    Write-Host "Extension Attribute: $EAName" -ForegroundColor Cyan
    Write-Host "Total Devices: $($EAData.Count)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Value Distribution:" -ForegroundColor Yellow
    $EAData | Group-Object -Property Value | Sort-Object -Property Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    
} catch {
    Write-Error "Failed to generate extension attribute report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-policy-history-report',
    name: 'Policy History Report',
    category: 'Reporting',
    description: 'Generate a report of policy execution history',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: true, placeholder: 'C:\\Reports\\policy-history.csv' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const policyId = escapePowerShellString(params.policyId);
      const reportPath = escapePowerShellString(params.reportPath);
      
      return `# JAMF Pro Policy History Report
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$PolicyId = "${policyId}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $PolicyUri = "$JamfUrl/JSSResource/policies/id/$PolicyId"
    $PolicyResponse = Invoke-RestMethod -Uri $PolicyUri -Method Get -Headers $Headers
    $PolicyName = $PolicyResponse.policy.general.name
    
    $HistoryUri = "$JamfUrl/JSSResource/computermanagement/username/all"
    
    Write-Host "Generating Policy History Report" -ForegroundColor Cyan
    Write-Host "Policy: $PolicyName (ID: $PolicyId)" -ForegroundColor Cyan
    
    $ComputersUri = "$JamfUrl/JSSResource/computers"
    $ComputersResponse = Invoke-RestMethod -Uri $ComputersUri -Method Get -Headers $Headers
    
    $HistoryData = @()
    $TotalComputers = $ComputersResponse.computers.Count
    $CurrentComputer = 0
    
    foreach ($Computer in $ComputersResponse.computers) {
        $CurrentComputer++
        Write-Progress -Activity "Checking Policy History" -Status "$CurrentComputer of $TotalComputers" -PercentComplete (($CurrentComputer / $TotalComputers) * 100)
        
        try {
            $MgmtUri = "$JamfUrl/JSSResource/computermanagement/id/$($Computer.id)/subset/policies"
            $MgmtResponse = Invoke-RestMethod -Uri $MgmtUri -Method Get -Headers $Headers
            
            $PolicyExec = $MgmtResponse.computer_management.policies | Where-Object { $_.id -eq $PolicyId }
            
            if ($PolicyExec) {
                $HistoryData += [PSCustomObject]@{
                    ComputerName = $Computer.name
                    ComputerID = $Computer.id
                    PolicyName = $PolicyName
                    PolicyID = $PolicyId
                    LastExecuted = $PolicyExec.completed
                    Status = 'Completed'
                }
            }
        } catch {
            # Skip computers that fail
        }
    }
    
    $HistoryData | Export-Csv -Path "${reportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Policy History Report Generated: ${reportPath}" -ForegroundColor Green
    Write-Host "Total Executions Found: $($HistoryData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to generate policy history report: $_"
}`;
    },
    isPremium: true
  },

  // ==================== ADDITIONAL TASKS ====================
  {
    id: 'jamf-send-mdm-command',
    name: 'Send MDM Command',
    category: 'Device Management',
    description: 'Send an MDM command to a computer or mobile device',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'deviceType', label: 'Device Type', type: 'select', required: true, options: ['Computer', 'Mobile Device'], defaultValue: 'Computer' },
      { id: 'deviceId', label: 'Device ID', type: 'text', required: true },
      { id: 'command', label: 'MDM Command', type: 'select', required: true, options: ['DeviceLock', 'EraseDevice', 'ClearPasscode', 'EnableLostMode', 'DisableLostMode', 'RestartDevice', 'ShutDownDevice', 'BlankPush'], defaultValue: 'BlankPush' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const deviceType = escapePowerShellString(params.deviceType);
      const deviceId = escapePowerShellString(params.deviceId);
      const command = escapePowerShellString(params.command);
      
      return `# JAMF Pro Send MDM Command
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$DeviceType = "${deviceType}"
$DeviceId = "${deviceId}"
$Command = "${command}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $Endpoint = if ($DeviceType -eq 'Computer') { 'computercommands' } else { 'mobiledevicecommands' }
    $DeviceEndpoint = if ($DeviceType -eq 'Computer') { 'computerid' } else { 'mobiledeviceid' }
    
    $Uri = "$JamfUrl/JSSResource/$Endpoint/command/$Command/id/$DeviceId"
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "MDM Command sent successfully" -ForegroundColor Green
    Write-Host "  Command: $Command" -ForegroundColor Cyan
    Write-Host "  Device Type: $DeviceType" -ForegroundColor Cyan
    Write-Host "  Device ID: $DeviceId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to send MDM command: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-scripts',
    name: 'List Scripts',
    category: 'Policy Management',
    description: 'Get a list of all scripts in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List Scripts
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/scripts"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Scripts = $Response.scripts | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "JAMF Pro Scripts" -ForegroundColor Green
    Write-Host "================" -ForegroundColor Green
    $Scripts | Format-Table -AutoSize
    Write-Host "Total: $($Scripts.Count) scripts" -ForegroundColor Cyan
    ${exportPath ? `
    $Scripts | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list scripts: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-upload-script',
    name: 'Upload Script',
    category: 'Policy Management',
    description: 'Upload a new script to JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'scriptName', label: 'Script Name', type: 'text', required: true },
      { id: 'scriptContents', label: 'Script Contents', type: 'textarea', required: true, placeholder: '#!/bin/bash\necho "Hello World"' },
      { id: 'category', label: 'Category', type: 'text', required: false },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['Before', 'After', 'At Reboot'], defaultValue: 'After' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const scriptName = escapePowerShellString(params.scriptName);
      const scriptContents = escapePowerShellString(params.scriptContents);
      const category = params.category ? escapePowerShellString(params.category) : '';
      const priority = escapePowerShellString(params.priority);
      
      return `# JAMF Pro Upload Script
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$ScriptName = "${scriptName}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/xml"
}

try {
    $ScriptXml = @"
<script>
    <name>$ScriptName</name>
    ${category ? `<category>${category}</category>` : ''}
    <priority>${priority}</priority>
    <script_contents><![CDATA[${scriptContents}]]></script_contents>
</script>
"@
    
    $Uri = "$JamfUrl/JSSResource/scripts/id/0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $ScriptXml
    
    Write-Host "Script uploaded successfully" -ForegroundColor Green
    Write-Host "  Name: $ScriptName" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.script.id)" -ForegroundColor Cyan
    Write-Host "  Priority: ${priority}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to upload script: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-retrieve-filevault-keys',
    name: 'Retrieve FileVault Recovery Keys',
    category: 'Device Management',
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
        Write-Host "FileVault Recovery Key Retrieved" -ForegroundColor Green
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
    id: 'jamf-get-buildings',
    name: 'List Buildings',
    category: 'User Management',
    description: 'Get a list of all buildings configured in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Buildings
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/buildings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Buildings = $Response.buildings | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Buildings" -ForegroundColor Green
    Write-Host "=========" -ForegroundColor Green
    $Buildings | Format-Table -AutoSize
    Write-Host "Total: $($Buildings.Count) buildings" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list buildings: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-departments',
    name: 'List Departments',
    category: 'User Management',
    description: 'Get a list of all departments configured in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Departments
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/departments"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Departments = $Response.departments | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Departments" -ForegroundColor Green
    Write-Host "===========" -ForegroundColor Green
    $Departments | Format-Table -AutoSize
    Write-Host "Total: $($Departments.Count) departments" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list departments: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-get-categories',
    name: 'List Categories',
    category: 'Policy Management',
    description: 'Get a list of all categories in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Categories
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/categories"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Categories = $Response.categories | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
            Priority = $_.priority
        }
    }
    
    Write-Host "Categories" -ForegroundColor Green
    Write-Host "==========" -ForegroundColor Green
    $Categories | Sort-Object -Property Priority | Format-Table -AutoSize
    Write-Host "Total: $($Categories.Count) categories" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list categories: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-prestage-enrollment',
    name: 'Get PreStage Enrollments',
    category: 'Device Management',
    description: 'List PreStage enrollment configurations for automated device enrollment',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'deviceType', label: 'Device Type', type: 'select', required: true, options: ['computers', 'mobiledevices'], defaultValue: 'computers' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const deviceType = escapePowerShellString(params.deviceType);
      
      return `# JAMF Pro Get PreStage Enrollments
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"
$DeviceType = "${deviceType}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Endpoint = if ($DeviceType -eq 'computers') { 'computerPrestages' } else { 'mobileDevicePrestages' }
    $Uri = "$JamfUrl/api/v2/$Endpoint"
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "PreStage Enrollments ($DeviceType)" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    
    $Response.results | ForEach-Object {
        Write-Host ""
        Write-Host "Name: $($_.displayName)" -ForegroundColor Cyan
        Write-Host "  ID: $($_.id)"
        Write-Host "  Mandatory: $($_.isMandatory)"
        Write-Host "  MDM Removable: $($_.isMdmRemovable)"
        Write-Host "  Support Phone: $($_.supportPhoneNumber)"
    }
    
    Write-Host ""
    Write-Host "Total: $($Response.totalCount) prestage enrollments" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to get prestage enrollments: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-self-service-policies',
    name: 'List Self Service Policies',
    category: 'Application Management',
    description: 'Get a list of all policies available in Self Service',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Self Service Policies
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/policies"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $SelfServicePolicies = @()
    
    foreach ($Policy in $Response.policies) {
        $DetailUri = "$JamfUrl/JSSResource/policies/id/$($Policy.id)"
        $PolicyDetails = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        if ($PolicyDetails.policy.self_service.use_for_self_service -eq $true) {
            $SelfServicePolicies += [PSCustomObject]@{
                ID = $Policy.id
                Name = $Policy.name
                Category = $PolicyDetails.policy.general.category.name
                SelfServiceDescription = $PolicyDetails.policy.self_service.self_service_description
            }
        }
    }
    
    Write-Host "Self Service Policies" -ForegroundColor Green
    Write-Host "=====================" -ForegroundColor Green
    $SelfServicePolicies | Format-Table -AutoSize
    Write-Host "Total: $($SelfServicePolicies.Count) Self Service policies" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list Self Service policies: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-network-segments',
    name: 'List Network Segments',
    category: 'Configuration Profiles',
    description: 'Get a list of all network segments configured in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      
      return `# JAMF Pro List Network Segments
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/networksegments"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $NetworkSegments = $Response.network_segments | ForEach-Object {
        [PSCustomObject]@{
            ID = $_.id
            Name = $_.name
        }
    }
    
    Write-Host "Network Segments" -ForegroundColor Green
    Write-Host "================" -ForegroundColor Green
    $NetworkSegments | Format-Table -AutoSize
    Write-Host "Total: $($NetworkSegments.Count) network segments" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to list network segments: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jamf-list-extension-attributes',
    name: 'List Extension Attributes',
    category: 'Reporting',
    description: 'Get a list of all computer extension attributes configured in JAMF Pro',
    parameters: [
      { id: 'jamfUrl', label: 'JAMF Pro URL', type: 'text', required: true, placeholder: 'https://company.jamfcloud.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jamfUrl = escapePowerShellString(params.jamfUrl);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# JAMF Pro List Extension Attributes
# Generated: ${new Date().toISOString()}

$JamfUrl = "${jamfUrl}"

$Credential = Get-Credential -Message "Enter JAMF Pro credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JamfUrl/JSSResource/computerextensionattributes"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $ExtensionAttributes = @()
    
    foreach ($EA in $Response.computer_extension_attributes) {
        $DetailUri = "$JamfUrl/JSSResource/computerextensionattributes/id/$($EA.id)"
        $Details = Invoke-RestMethod -Uri $DetailUri -Method Get -Headers $Headers
        
        $ExtensionAttributes += [PSCustomObject]@{
            ID = $EA.id
            Name = $EA.name
            DataType = $Details.computer_extension_attribute.data_type
            InputType = $Details.computer_extension_attribute.input_type.type
            Description = $Details.computer_extension_attribute.description
        }
    }
    
    Write-Host "Extension Attributes" -ForegroundColor Green
    Write-Host "====================" -ForegroundColor Green
    $ExtensionAttributes | Format-Table -AutoSize
    Write-Host "Total: $($ExtensionAttributes.Count) extension attributes" -ForegroundColor Cyan
    ${exportPath ? `
    $ExtensionAttributes | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to list extension attributes: $_"
}`;
    },
    isPremium: true
  }
];
