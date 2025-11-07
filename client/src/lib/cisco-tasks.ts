import { escapePowerShellString } from './powershell-utils';

export interface CiscoTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface CiscoTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: CiscoTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const ciscoTasks: CiscoTask[] = [
  {
    id: 'meraki-bulk-create-ssids',
    name: 'Meraki: Bulk Create SSIDs',
    category: 'Bulk Operations',
    description: 'Create multiple wireless SSIDs',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'ssidNames', label: 'SSID Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Guest-WiFi, Employee-WiFi, IoT-WiFi' }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const ssidNamesRaw = (params.ssidNames as string).split(',').map((n: string) => n.trim());
      
      return `# Cisco Meraki Bulk Create SSIDs
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

$SSIDNames = @(${ssidNamesRaw.map(s => `"${escapePowerShellString(s)}"`).join(', ')})

try {
    $SSIDNumber = 0
    
    foreach ($SSIDName in $SSIDNames) {
        $Body = @{
            name = $SSIDName
            enabled = $true
            authMode = "psk"
            encryptionMode = "wpa"
            psk = "ChangeMe123!"
        } | ConvertTo-Json
        
        $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/wireless/ssids/$SSIDNumber"
        Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
        
        Write-Host "✓ SSID created: $SSIDName (Number: $SSIDNumber)" -ForegroundColor Green
        $SSIDNumber++
    }
    
    Write-Host ""
    Write-Host "Bulk SSID creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'meraki-export-client-list',
    name: 'Meraki: Export Client List',
    category: 'Reporting',
    description: 'Export connected clients inventory',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco Meraki Export Client List
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
}

try {
    $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/clients"
    $Clients = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Clients | Select-Object \`
        description,
        mac,
        ip,
        vlan,
        usage.sent,
        usage.recv,
        ssid,
        switchport
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Client list exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Clients: $($Clients.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cisco-ios-backup-config',
    name: 'Cisco IOS: Backup Configuration',
    category: 'Configuration Management',
    description: 'Backup Cisco switch/router configuration',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'backupPath', label: 'Backup File Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const backupPath = escapePowerShellString(params.backupPath);
      
      return `# Cisco IOS Backup Configuration
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
$BackupPath = "${backupPath}"

# Note: Requires Posh-SSH module
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Config = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show running-config"
    
    $Config.Output | Out-File -FilePath $BackupPath
    
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Configuration backed up to: $BackupPath" -ForegroundColor Green
    
} catch {
    Write-Error "Backup failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cisco-ios-manage-router',
    name: 'Cisco IOS: Manage Router',
    category: 'Common Admin Tasks',
    description: 'Configure router interface settings',
    parameters: [
      { id: 'deviceIP', label: 'Router IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'interface', label: 'Interface Name', type: 'text', required: true, placeholder: 'GigabitEthernet0/0' },
      { id: 'ipAddress', label: 'IP Address/Subnet', type: 'text', required: true, placeholder: '10.0.0.1 255.255.255.0' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const iface = escapePowerShellString(params.interface);
      const ipAddress = escapePowerShellString(params.ipAddress);
      
      return `# Cisco IOS Manage Router Interface
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
interface ${iface}
ip address ${ipAddress}
no shutdown
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Router interface ${iface} configured!" -ForegroundColor Green
    Write-Host $Result.Output
    
} catch {
    Write-Error "Router configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-manage-switch',
    name: 'Cisco IOS: Manage Switch',
    category: 'Common Admin Tasks',
    description: 'Configure switch port settings',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'interface', label: 'Interface Name', type: 'text', required: true, placeholder: 'FastEthernet0/1' },
      { id: 'mode', label: 'Port Mode', type: 'select', required: true, options: ['access', 'trunk'], defaultValue: 'access' },
      { id: 'vlan', label: 'VLAN ID', type: 'number', required: false, placeholder: '10' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const iface = escapePowerShellString(params.interface);
      const mode = params.mode;
      const vlan = params.vlan;
      
      return `# Cisco IOS Manage Switch Port
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
interface ${iface}
switchport mode ${mode}
${vlan ? `switchport ${mode === 'access' ? 'access vlan' : 'trunk allowed vlan'} ${vlan}` : ''}
no shutdown
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Switch port ${iface} configured!" -ForegroundColor Green
    
} catch {
    Write-Error "Switch configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-manage-access-point',
    name: 'Meraki: Manage Wireless Access Point',
    category: 'Common Admin Tasks',
    description: 'Configure wireless access point settings',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'serial', label: 'AP Serial Number', type: 'text', required: true, placeholder: 'Q2XX-XXXX-XXXX' },
      { id: 'name', label: 'AP Name', type: 'text', required: true, placeholder: 'Floor-2-AP-01' },
      { id: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false, placeholder: 'floor2, building-a' }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const serial = escapePowerShellString(params.serial);
      const name = escapePowerShellString(params.name);
      const tags = params.tags ? (params.tags as string).split(',').map((t: string) => t.trim()) : [];
      
      return `# Cisco Meraki Manage Access Point
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$Serial = "${serial}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${name}"
${tags.length > 0 ? `        tags = @(${tags.map(t => `"${escapePowerShellString(t)}"`).join(', ')})` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://api.meraki.com/api/v1/devices/$Serial"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "✓ Access Point '${name}' configured!" -ForegroundColor Green
    
} catch {
    Write-Error "AP configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-export-network-inventory',
    name: 'Meraki: Export Network Inventory',
    category: 'Common Admin Tasks',
    description: 'Export complete network device inventory',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'organizationId', label: 'Organization ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const orgId = escapePowerShellString(params.organizationId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco Meraki Export Network Inventory
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$OrgId = "${orgId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
}

try {
    $Uri = "https://api.meraki.com/api/v1/organizations/$OrgId/devices"
    $Devices = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Inventory = $Devices | Select-Object \`
        name,
        serial,
        model,
        mac,
        networkId,
        lanIp,
        firmware,
        productType
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Network inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Devices: $($Devices.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Inventory export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-update-config',
    name: 'Cisco IOS: Update Network Configuration',
    category: 'Common Admin Tasks',
    description: 'Push configuration changes to network device',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'configCommands', label: 'Configuration Commands (one per line)', type: 'textarea', required: true, placeholder: 'hostname NewName\nip domain-name example.com' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const commands = (params.configCommands as string).split('\n').filter((c: string) => c.trim());
      
      return `# Cisco IOS Update Configuration
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $ConfigCommands = @"
configure terminal
${commands.map(c => escapePowerShellString(c)).join('\n')}
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $ConfigCommands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Configuration updated successfully!" -ForegroundColor Green
    Write-Host $Result.Output
    
} catch {
    Write-Error "Configuration update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-monitor-performance',
    name: 'Meraki: Monitor Network Performance',
    category: 'Common Admin Tasks',
    description: 'Retrieve network performance metrics',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Cisco Meraki Monitor Performance
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
}

try {
    $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/clients"
    $Clients = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $TotalSent = ($Clients | Measure-Object -Property usage.sent -Sum).Sum
    $TotalReceived = ($Clients | Measure-Object -Property usage.recv -Sum).Sum
    
    Write-Host "Network Performance Metrics:" -ForegroundColor Green
    Write-Host "  Active Clients: $($Clients.Count)" -ForegroundColor Cyan
    Write-Host "  Total Data Sent: $([math]::Round($TotalSent / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "  Total Data Received: $([math]::Round($TotalReceived / 1MB, 2)) MB" -ForegroundColor Cyan
    
${exportPath ? `    
    $Metrics = @{
        Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        ActiveClients = $Clients.Count
        TotalSentMB = [math]::Round($TotalSent / 1MB, 2)
        TotalReceivedMB = [math]::Round($TotalReceived / 1MB, 2)
    }
    $Metrics | ConvertTo-Json | Out-File -FilePath "${exportPath}"
    Write-Host "✓ Metrics exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Performance monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-automate-backup',
    name: 'Cisco IOS: Automate Configuration Backup',
    category: 'Common Admin Tasks',
    description: 'Schedule automated configuration backups',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'backupFolder', label: 'Backup Folder Path', type: 'path', required: true, placeholder: 'C:\\Backups\\Cisco' },
      { id: 'schedule', label: 'Schedule', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Daily' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const backupFolder = escapePowerShellString(params.backupFolder);
      const schedule = params.schedule;
      
      return `# Cisco IOS Automate Configuration Backup
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
$BackupFolder = "${backupFolder}"
$Schedule = "${schedule}"

$ScriptBlock = {
    param($DeviceIP, $BackupFolder)
    
    Import-Module Posh-SSH
    
    $CredPath = "$env:USERPROFILE\\cisco-creds.xml"
    $Credential = Import-Clixml -Path $CredPath
    
    $BackupFile = Join-Path $BackupFolder "cisco-backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    
    try {
        $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
        $Config = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show running-config"
        $Config.Output | Out-File -FilePath $BackupFile
        Remove-SSHSession -SessionId $Session.SessionId
        
        Write-Host "✓ Backup created: $BackupFile"
    } catch {
        Write-Error "Backup failed: $_"
    }
}

$Trigger = switch ($Schedule) {
    "Daily"   { New-ScheduledTaskTrigger -Daily -At 2am }
    "Weekly"  { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am }
    "Monthly" { New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Sunday -At 2am }
}

$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\\Scripts\\Cisco-Backup.ps1"

# Save script block to file
$ScriptPath = "C:\\Scripts\\Cisco-Backup.ps1"
$ScriptBlock.ToString() | Out-File -FilePath $ScriptPath -Force

Register-ScheduledTask -TaskName "Cisco-AutoBackup" -Trigger $Trigger -Action $Action -Description "Automated Cisco configuration backup" -RunLevel Highest

Write-Host "✓ Scheduled backup task created: $Schedule" -ForegroundColor Green
Write-Host "  Script saved to: $ScriptPath" -ForegroundColor Cyan
Write-Host "  Note: Save credentials to $env:USERPROFILE\\cisco-creds.xml" -ForegroundColor Yellow
Write-Host "  Run: Get-Credential | Export-Clixml -Path $env:USERPROFILE\\cisco-creds.xml" -ForegroundColor Yellow`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-vlan',
    name: 'Cisco IOS: Configure VLAN',
    category: 'Common Admin Tasks',
    description: 'Create and configure VLANs on switch',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: true, placeholder: '10' },
      { id: 'vlanName', label: 'VLAN Name', type: 'text', required: true, placeholder: 'Marketing' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const vlanId = params.vlanId;
      const vlanName = escapePowerShellString(params.vlanName);
      
      return `# Cisco IOS Configure VLAN
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
vlan ${vlanId}
name ${vlanName}
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ VLAN ${vlanId} '${vlanName}' configured!" -ForegroundColor Green
    
} catch {
    Write-Error "VLAN configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-configure-ssid',
    name: 'Meraki: Configure SSID Settings',
    category: 'Common Admin Tasks',
    description: 'Configure individual SSID settings and security',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'ssidNumber', label: 'SSID Number', type: 'number', required: true, placeholder: '0' },
      { id: 'ssidName', label: 'SSID Name', type: 'text', required: true, placeholder: 'Corporate-WiFi' },
      { id: 'authMode', label: 'Authentication Mode', type: 'select', required: true, options: ['psk', 'open', '8021x-radius'], defaultValue: 'psk' },
      { id: 'enabled', label: 'Enable SSID', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const ssidNumber = params.ssidNumber;
      const ssidName = escapePowerShellString(params.ssidName);
      const authMode = params.authMode;
      const enabled = params.enabled !== false;
      
      return `# Cisco Meraki Configure SSID
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${ssidName}"
        enabled = $${enabled}
        authMode = "${authMode}"
${authMode === 'psk' ? `        encryptionMode = "wpa"
        psk = Read-Host -AsSecureString -Prompt "Enter PSK" | ConvertFrom-SecureString -AsPlainText` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/wireless/ssids/${ssidNumber}"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "✓ SSID '${ssidName}' configured successfully!" -ForegroundColor Green
    Write-Host "  Number: ${ssidNumber}" -ForegroundColor Cyan
    Write-Host "  Auth Mode: ${authMode}" -ForegroundColor Cyan
    
} catch {
    Write-Error "SSID configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-qos',
    name: 'Cisco IOS: Configure Quality of Service (QoS) Policies',
    category: 'Common Admin Tasks',
    description: 'Set bandwidth limits, traffic prioritization, and QoS policies',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'policyName', label: 'QoS Policy Name', type: 'text', required: true, placeholder: 'VOICE-QOS' },
      { id: 'bandwidth', label: 'Bandwidth Limit (Mbps)', type: 'number', required: true, placeholder: '100' },
      { id: 'priorityClass', label: 'Priority Class', type: 'select', required: true, options: ['voice', 'video', 'critical-data', 'best-effort'], defaultValue: 'critical-data' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const policyName = escapePowerShellString(params.policyName);
      const bandwidth = params.bandwidth;
      const priorityClass = params.priorityClass;
      
      return `# Cisco IOS Configure QoS Policies
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
class-map match-any ${policyName}
match ip dscp ef
exit
policy-map ${policyName}
class ${policyName}
priority ${bandwidth}
exit
exit
interface range GigabitEthernet0/1-24
service-policy output ${policyName}
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ QoS Policy '${policyName}' configured!" -ForegroundColor Green
    Write-Host "  Bandwidth Limit: ${bandwidth} Mbps" -ForegroundColor Cyan
    Write-Host "  Priority Class: ${priorityClass}" -ForegroundColor Cyan
    Write-Host $Result.Output
    
} catch {
    Write-Error "QoS configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-port-security',
    name: 'Cisco IOS: Manage Port Security and 802.1X',
    category: 'Common Admin Tasks',
    description: 'Configure port security, MAC address limits, and RADIUS authentication',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'interface', label: 'Interface Name', type: 'text', required: true, placeholder: 'GigabitEthernet0/1' },
      { id: 'maxMacs', label: 'Maximum MAC Addresses', type: 'number', required: true, placeholder: '2', defaultValue: 2 },
      { id: 'radiusServer', label: 'RADIUS Server IP', type: 'text', required: false, placeholder: '10.0.0.100' },
      { id: 'radiusKey', label: 'RADIUS Shared Key', type: 'text', required: false, placeholder: 'SecretKey123' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const iface = escapePowerShellString(params.interface);
      const maxMacs = params.maxMacs;
      const radiusServer = params.radiusServer ? escapePowerShellString(params.radiusServer) : '';
      const radiusKey = params.radiusKey ? escapePowerShellString(params.radiusKey) : '';
      
      return `# Cisco IOS Configure Port Security and 802.1X
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
${radiusServer && radiusKey ? `aaa new-model
aaa authentication dot1x default group radius
radius server RADIUS-AUTH
address ipv4 ${radiusServer} auth-port 1812 acct-port 1813
key ${radiusKey}
exit
dot1x system-auth-control
` : ''}interface ${iface}
switchport mode access
switchport port-security
switchport port-security maximum ${maxMacs}
switchport port-security violation restrict
switchport port-security mac-address sticky
${radiusServer ? `authentication port-control auto
dot1x pae authenticator
` : ''}no shutdown
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Port Security configured on ${iface}!" -ForegroundColor Green
    Write-Host "  Maximum MACs: ${maxMacs}" -ForegroundColor Cyan
${radiusServer ? `    Write-Host "  802.1X Authentication: Enabled" -ForegroundColor Cyan
    Write-Host "  RADIUS Server: ${radiusServer}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Port security configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-stp',
    name: 'Cisco IOS: Configure Spanning Tree Protocol (STP)',
    category: 'Common Admin Tasks',
    description: 'Configure STP modes, bridge priorities, and BPDU guard protection',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'stpMode', label: 'STP Mode', type: 'select', required: true, options: ['pvst', 'rapid-pvst', 'mst'], defaultValue: 'rapid-pvst' },
      { id: 'priority', label: 'Bridge Priority', type: 'select', required: true, options: ['4096', '8192', '16384', '32768', '61440'], defaultValue: '32768' },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: false, placeholder: '1' },
      { id: 'bpduGuard', label: 'Enable BPDU Guard', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const stpMode = params.stpMode;
      const priority = params.priority;
      const vlanId = params.vlanId || 1;
      const bpduGuard = params.bpduGuard !== false;
      
      return `# Cisco IOS Configure Spanning Tree Protocol
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
spanning-tree mode ${stpMode}
spanning-tree vlan ${vlanId} priority ${priority}
${bpduGuard ? `spanning-tree portfast bpduguard default
interface range GigabitEthernet0/1-24
spanning-tree portfast
spanning-tree bpduguard enable
exit` : ''}
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Spanning Tree Protocol configured!" -ForegroundColor Green
    Write-Host "  STP Mode: ${stpMode}" -ForegroundColor Cyan
    Write-Host "  Bridge Priority: ${priority}" -ForegroundColor Cyan
    Write-Host "  VLAN: ${vlanId}" -ForegroundColor Cyan
    Write-Host "  BPDU Guard: ${bpduGuard ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "STP configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-nac',
    name: 'Cisco IOS: Manage Network Access Control (NAC)',
    category: 'Common Admin Tasks',
    description: 'Configure network segmentation, guest access, and access control lists',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'guestVlan', label: 'Guest VLAN ID', type: 'number', required: true, placeholder: '100' },
      { id: 'employeeVlan', label: 'Employee VLAN ID', type: 'number', required: true, placeholder: '10' },
      { id: 'guestNetwork', label: 'Guest Network', type: 'text', required: true, placeholder: '192.168.100.0 0.0.0.255' },
      { id: 'denyInternet', label: 'Restrict Guest Internal Access', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const guestVlan = params.guestVlan;
      const employeeVlan = params.employeeVlan;
      const guestNetwork = escapePowerShellString(params.guestNetwork);
      const denyInternal = params.denyInternet !== false;
      
      return `# Cisco IOS Configure Network Access Control
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
vlan ${guestVlan}
name GUEST-NETWORK
exit
vlan ${employeeVlan}
name EMPLOYEE-NETWORK
exit
${denyInternal ? `ip access-list extended GUEST-ACL
deny ip ${guestNetwork} 10.0.0.0 0.255.255.255
deny ip ${guestNetwork} 172.16.0.0 0.15.255.255
deny ip ${guestNetwork} 192.168.0.0 0.0.255.255
permit ip ${guestNetwork} any
exit
interface vlan ${guestVlan}
ip access-group GUEST-ACL in
exit` : ''}
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ Network Access Control configured!" -ForegroundColor Green
    Write-Host "  Guest VLAN: ${guestVlan}" -ForegroundColor Cyan
    Write-Host "  Employee VLAN: ${employeeVlan}" -ForegroundColor Cyan
    Write-Host "  Guest Network: ${guestNetwork}" -ForegroundColor Cyan
    Write-Host "  Internal Access Restriction: ${denyInternal ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "NAC configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-snmp',
    name: 'Cisco IOS: Configure SNMP Monitoring',
    category: 'Common Admin Tasks',
    description: 'Set up SNMP v2/v3, configure traps, and monitoring communities',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'snmpVersion', label: 'SNMP Version', type: 'select', required: true, options: ['v2c', 'v3'], defaultValue: 'v3' },
      { id: 'communityString', label: 'Community String (v2c)', type: 'text', required: false, placeholder: 'public' },
      { id: 'snmpUser', label: 'SNMP User (v3)', type: 'text', required: false, placeholder: 'snmpadmin' },
      { id: 'trapServer', label: 'SNMP Trap Server', type: 'text', required: true, placeholder: '10.0.0.50' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const snmpVersion = params.snmpVersion;
      const communityString = params.communityString ? escapePowerShellString(params.communityString) : 'public';
      const snmpUser = params.snmpUser ? escapePowerShellString(params.snmpUser) : 'snmpadmin';
      const trapServer = escapePowerShellString(params.trapServer);
      
      return `# Cisco IOS Configure SNMP Monitoring
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
${snmpVersion === 'v2c' ? `snmp-server community ${communityString} RO
snmp-server host ${trapServer} version 2c ${communityString}` : `snmp-server group SNMP-GROUP v3 priv
snmp-server user ${snmpUser} SNMP-GROUP v3 auth sha AuthPass123 priv aes 128 PrivPass123
snmp-server host ${trapServer} version 3 priv ${snmpUser}`}
snmp-server enable traps config
snmp-server enable traps entity
snmp-server enable traps cpu threshold
snmp-server enable traps memory bufferpeak
snmp-server enable traps syslog
snmp-server ifindex persist
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "✓ SNMP Monitoring configured!" -ForegroundColor Green
    Write-Host "  SNMP Version: ${snmpVersion}" -ForegroundColor Cyan
    Write-Host "  Trap Server: ${trapServer}" -ForegroundColor Cyan
${snmpVersion === 'v3' ? `    Write-Host "  User: ${snmpUser}" -ForegroundColor Cyan
    Write-Host "  Authentication: SHA / AES-128" -ForegroundColor Cyan` : `    Write-Host "  Community: ${communityString}" -ForegroundColor Cyan`}
    Write-Host "  Note: ${snmpVersion === 'v3' ? 'Default passwords set (AuthPass123/PrivPass123) - Change immediately!' : 'Community string configured'}" -ForegroundColor Yellow
    
} catch {
    Write-Error "SNMP configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-generate-interface-stats',
    name: 'Cisco IOS: Generate Interface Statistics Reports',
    category: 'Common Admin Tasks',
    description: 'Export traffic statistics, error rates, and utilization metrics',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\interface-stats.csv' },
      { id: 'includeErrors', label: 'Include Error Statistics', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const exportPath = escapePowerShellString(params.exportPath);
      const includeErrors = params.includeErrors !== false;
      
      return `# Cisco IOS Generate Interface Statistics Report
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
$ExportPath = "${exportPath}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $InterfaceStats = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show interfaces"
    ${includeErrors ? `$ErrorStats = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show interfaces counters errors"` : ''}
    
    Remove-SSHSession -SessionId $Session.SessionId
    
    $Output = $InterfaceStats.Output
    $Interfaces = @()
    
    $Output -split "\\n" | ForEach-Object {
        if ($_ -match "^(\\S+)\\s+is\\s+(up|down|administratively down)") {
            $InterfaceName = $Matches[1]
            $Status = $Matches[2]
            
            $Interfaces += [PSCustomObject]@{
                Interface = $InterfaceName
                Status = $Status
                Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            }
        }
    }
    
    $Interfaces | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "✓ Interface statistics exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Total Interfaces: $($Interfaces.Count)" -ForegroundColor Cyan
    Write-Host "  Include Errors: ${includeErrors ? 'Yes' : 'No'}" -ForegroundColor Cyan
    
    $UpCount = ($Interfaces | Where-Object { $_.Status -eq 'up' }).Count
    $DownCount = ($Interfaces | Where-Object { $_.Status -match 'down' }).Count
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Up: $UpCount" -ForegroundColor Green
    Write-Host "  Down: $DownCount" -ForegroundColor Red
    
} catch {
    Write-Error "Interface statistics generation failed: $_"
}`;
    },
    isPremium: true
  }
];
