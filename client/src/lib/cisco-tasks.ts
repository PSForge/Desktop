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
        
        Write-Host "[SUCCESS] SSID created: $SSIDName (Number: $SSIDNumber)" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Client list exported: ${exportPath}" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Configuration backed up to: $BackupPath" -ForegroundColor Green
    
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
    
    Write-Host "[SUCCESS] Router interface ${iface} configured!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Switch port ${iface} configured!" -ForegroundColor Green
    
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
    
    Write-Host "[SUCCESS] Access Point '${name}' configured!" -ForegroundColor Green
    
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
    
    Write-Host "[SUCCESS] Network inventory exported: ${exportPath}" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Configuration updated successfully!" -ForegroundColor Green
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
    Write-Host "[SUCCESS] Metrics exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
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
        
        Write-Host "[SUCCESS] Backup created: $BackupFile"
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

Write-Host "[SUCCESS] Scheduled backup task created: $Schedule" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] VLAN ${vlanId} '${vlanName}' configured!" -ForegroundColor Green
    
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
    
    Write-Host "[SUCCESS] SSID '${ssidName}' configured successfully!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] QoS Policy '${policyName}' configured!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Port Security configured on ${iface}!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Spanning Tree Protocol configured!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Network Access Control configured!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] SNMP Monitoring configured!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Interface statistics exported!" -ForegroundColor Green
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
  },
  {
    id: 'cisco-ios-update-firmware',
    name: 'Cisco IOS: Update IOS Firmware',
    category: 'Router Management',
    description: 'Upload and install new IOS firmware image via TFTP/SCP',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'tftpServer', label: 'TFTP/SCP Server IP', type: 'text', required: true, placeholder: '10.0.0.100' },
      { id: 'imageName', label: 'IOS Image Filename', type: 'text', required: true, placeholder: 'c2960x-universalk9-mz.152-7.E2.bin' },
      { id: 'transferMethod', label: 'Transfer Method', type: 'select', required: true, options: ['tftp', 'scp'], defaultValue: 'tftp' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const tftpServer = escapePowerShellString(params.tftpServer);
      const imageName = escapePowerShellString(params.imageName);
      const transferMethod = params.transferMethod;
      
      return `# Cisco IOS Update Firmware
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    Write-Host "Checking current IOS version..." -ForegroundColor Cyan
    $CurrentVersion = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show version | include IOS"
    Write-Host $CurrentVersion.Output
    
    Write-Host "Checking flash storage..." -ForegroundColor Cyan
    $FlashCheck = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show flash: | include bytes"
    Write-Host $FlashCheck.Output
    
    Write-Host "Downloading new IOS image..." -ForegroundColor Yellow
    $Commands = @"
configure terminal
file prompt quiet
exit
copy ${transferMethod}://${tftpServer}/${imageName} flash:
${imageName}
"@
    
    $DownloadResult = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands -TimeOut 1800
    
    Write-Host "Setting boot image..." -ForegroundColor Cyan
    $BootCommands = @"
configure terminal
no boot system
boot system flash:${imageName}
exit
write memory
"@
    
    Invoke-SSHCommand -SessionId $Session.SessionId -Command $BootCommands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] IOS firmware update prepared!" -ForegroundColor Green
    Write-Host "  New Image: ${imageName}" -ForegroundColor Cyan
    Write-Host "  Transfer Method: ${transferMethod}" -ForegroundColor Cyan
    Write-Host "  WARNING: Device must be rebooted to complete update!" -ForegroundColor Yellow
    
} catch {
    Write-Error "Firmware update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-show-routing-table',
    name: 'Cisco IOS: Export Routing Table',
    category: 'Router Management',
    description: 'Export complete routing table to file with route analysis',
    parameters: [
      { id: 'deviceIP', label: 'Router IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\routing-table.txt' },
      { id: 'routeType', label: 'Route Type Filter', type: 'select', required: false, options: ['all', 'static', 'connected', 'ospf', 'eigrp', 'bgp'], defaultValue: 'all' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const exportPath = escapePowerShellString(params.exportPath);
      const routeType = params.routeType || 'all';
      
      return `# Cisco IOS Export Routing Table
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
$ExportPath = "${exportPath}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $RouteCommand = switch ("${routeType}") {
        "static"    { "show ip route static" }
        "connected" { "show ip route connected" }
        "ospf"      { "show ip route ospf" }
        "eigrp"     { "show ip route eigrp" }
        "bgp"       { "show ip route bgp" }
        default     { "show ip route" }
    }
    
    $Routes = Invoke-SSHCommand -SessionId $Session.SessionId -Command $RouteCommand
    $RouteSummary = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show ip route summary"
    
    Remove-SSHSession -SessionId $Session.SessionId
    
    $Report = @"
=== Cisco Routing Table Export ===
Device: $DeviceIP
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Filter: ${routeType}

=== Route Summary ===
$($RouteSummary.Output)

=== Routing Table ===
$($Routes.Output)
"@
    
    $Report | Out-File -FilePath $ExportPath
    
    Write-Host "[SUCCESS] Routing table exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Route Filter: ${routeType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Routing table export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-ospf',
    name: 'Cisco IOS: Configure OSPF Routing',
    category: 'Router Management',
    description: 'Configure OSPF routing protocol with network statements',
    parameters: [
      { id: 'deviceIP', label: 'Router IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'processId', label: 'OSPF Process ID', type: 'number', required: true, placeholder: '1' },
      { id: 'routerId', label: 'Router ID', type: 'text', required: true, placeholder: '1.1.1.1' },
      { id: 'networks', label: 'Networks (one per line: network wildcard area)', type: 'textarea', required: true, placeholder: '10.0.0.0 0.0.0.255 0\n192.168.1.0 0.0.0.255 0' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const processId = params.processId;
      const routerId = escapePowerShellString(params.routerId);
      const networks = (params.networks as string).split('\n').filter((n: string) => n.trim());
      
      return `# Cisco IOS Configure OSPF Routing
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
router ospf ${processId}
router-id ${routerId}
${networks.map(n => `network ${escapePowerShellString(n.trim())}`).join('\n')}
passive-interface default
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] OSPF routing configured!" -ForegroundColor Green
    Write-Host "  Process ID: ${processId}" -ForegroundColor Cyan
    Write-Host "  Router ID: ${routerId}" -ForegroundColor Cyan
    Write-Host "  Networks configured: ${networks.length}" -ForegroundColor Cyan
    
} catch {
    Write-Error "OSPF configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-eigrp',
    name: 'Cisco IOS: Configure EIGRP Routing',
    category: 'Router Management',
    description: 'Configure EIGRP routing protocol with authentication',
    parameters: [
      { id: 'deviceIP', label: 'Router IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'asNumber', label: 'AS Number', type: 'number', required: true, placeholder: '100' },
      { id: 'networks', label: 'Networks (one per line)', type: 'textarea', required: true, placeholder: '10.0.0.0\n192.168.1.0' },
      { id: 'enableAuth', label: 'Enable MD5 Authentication', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const asNumber = params.asNumber;
      const networks = (params.networks as string).split('\n').filter((n: string) => n.trim());
      const enableAuth = params.enableAuth === true;
      
      return `# Cisco IOS Configure EIGRP Routing
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
router eigrp ${asNumber}
${networks.map(n => `network ${escapePowerShellString(n.trim())}`).join('\n')}
no auto-summary
${enableAuth ? `key chain EIGRP-KEY
key 1
key-string EigrpSecretKey123
exit
exit
interface GigabitEthernet0/0
ip authentication mode eigrp ${asNumber} md5
ip authentication key-chain eigrp ${asNumber} EIGRP-KEY` : ''}
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] EIGRP routing configured!" -ForegroundColor Green
    Write-Host "  AS Number: ${asNumber}" -ForegroundColor Cyan
    Write-Host "  Networks: ${networks.length}" -ForegroundColor Cyan
    Write-Host "  Authentication: ${enableAuth ? 'MD5 Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "EIGRP configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-trunk',
    name: 'Cisco IOS: Configure Trunk Port',
    category: 'Switch Management',
    description: 'Configure 802.1Q trunk port with allowed VLANs',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'interface', label: 'Interface Name', type: 'text', required: true, placeholder: 'GigabitEthernet0/1' },
      { id: 'nativeVlan', label: 'Native VLAN', type: 'number', required: true, placeholder: '1', defaultValue: 1 },
      { id: 'allowedVlans', label: 'Allowed VLANs', type: 'text', required: true, placeholder: '10,20,30 or 10-50' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const iface = escapePowerShellString(params.interface);
      const nativeVlan = params.nativeVlan;
      const allowedVlans = escapePowerShellString(params.allowedVlans);
      
      return `# Cisco IOS Configure Trunk Port
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
interface ${iface}
switchport trunk encapsulation dot1q
switchport mode trunk
switchport trunk native vlan ${nativeVlan}
switchport trunk allowed vlan ${allowedVlans}
no shutdown
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] Trunk port configured!" -ForegroundColor Green
    Write-Host "  Interface: ${iface}" -ForegroundColor Cyan
    Write-Host "  Native VLAN: ${nativeVlan}" -ForegroundColor Cyan
    Write-Host "  Allowed VLANs: ${allowedVlans}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Trunk configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-etherchannel',
    name: 'Cisco IOS: Configure EtherChannel/Port-Channel',
    category: 'Switch Management',
    description: 'Configure LACP or PAgP port aggregation',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'interfaces', label: 'Member Interfaces (comma-separated)', type: 'text', required: true, placeholder: 'GigabitEthernet0/1, GigabitEthernet0/2' },
      { id: 'channelGroup', label: 'Channel Group Number', type: 'number', required: true, placeholder: '1' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['lacp', 'pagp', 'on'], defaultValue: 'lacp' },
      { id: 'mode', label: 'Mode', type: 'select', required: true, options: ['active', 'passive', 'desirable', 'auto'], defaultValue: 'active' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const interfaces = (params.interfaces as string).split(',').map((i: string) => i.trim());
      const channelGroup = params.channelGroup;
      const protocol = params.protocol;
      const mode = params.mode;
      
      return `# Cisco IOS Configure EtherChannel
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
${interfaces.map(iface => `interface ${escapePowerShellString(iface)}
channel-group ${channelGroup} mode ${mode}
no shutdown
exit`).join('\n')}
interface Port-channel${channelGroup}
switchport mode trunk
no shutdown
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] EtherChannel configured!" -ForegroundColor Green
    Write-Host "  Channel Group: ${channelGroup}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  Mode: ${mode}" -ForegroundColor Cyan
    Write-Host "  Member Interfaces: ${interfaces.length}" -ForegroundColor Cyan
    
} catch {
    Write-Error "EtherChannel configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-asa-configure-nat',
    name: 'Cisco ASA: Configure NAT Rules',
    category: 'Firewall Management',
    description: 'Configure static or dynamic NAT on ASA firewall',
    parameters: [
      { id: 'deviceIP', label: 'ASA IP Address', type: 'text', required: true, placeholder: '192.168.1.254' },
      { id: 'natType', label: 'NAT Type', type: 'select', required: true, options: ['static', 'dynamic-pat', 'dynamic-nat'], defaultValue: 'dynamic-pat' },
      { id: 'insideNetwork', label: 'Inside Network', type: 'text', required: true, placeholder: '10.0.0.0/24' },
      { id: 'outsideInterface', label: 'Outside Interface', type: 'text', required: true, placeholder: 'outside', defaultValue: 'outside' },
      { id: 'publicIP', label: 'Public IP (for static NAT)', type: 'text', required: false, placeholder: '203.0.113.10' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const natType = params.natType;
      const insideNetwork = escapePowerShellString(params.insideNetwork);
      const outsideInterface = escapePowerShellString(params.outsideInterface);
      const publicIP = params.publicIP ? escapePowerShellString(params.publicIP) : '';
      
      return `# Cisco ASA Configure NAT Rules
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter ASA credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $NatConfig = switch ("${natType}") {
        "static" {
@"
object network STATIC-NAT-OBJ
subnet ${insideNetwork.split('/')[0]} 255.255.255.0
nat (inside,${outsideInterface}) static ${publicIP}
"@
        }
        "dynamic-pat" {
@"
object network INSIDE-NETWORK
subnet ${insideNetwork.split('/')[0]} 255.255.255.0
nat (inside,${outsideInterface}) dynamic interface
"@
        }
        "dynamic-nat" {
@"
object network NAT-POOL
range ${publicIP} ${publicIP}
object network INSIDE-NETWORK
subnet ${insideNetwork.split('/')[0]} 255.255.255.0
nat (inside,${outsideInterface}) dynamic NAT-POOL
"@
        }
    }
    
    $Commands = @"
configure terminal
$NatConfig
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] NAT rule configured!" -ForegroundColor Green
    Write-Host "  NAT Type: ${natType}" -ForegroundColor Cyan
    Write-Host "  Inside Network: ${insideNetwork}" -ForegroundColor Cyan
    Write-Host "  Outside Interface: ${outsideInterface}" -ForegroundColor Cyan
    
} catch {
    Write-Error "NAT configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-asa-configure-acl',
    name: 'Cisco ASA: Configure Access Control Lists',
    category: 'Firewall Management',
    description: 'Create and apply ACL rules for traffic filtering',
    parameters: [
      { id: 'deviceIP', label: 'ASA IP Address', type: 'text', required: true, placeholder: '192.168.1.254' },
      { id: 'aclName', label: 'ACL Name', type: 'text', required: true, placeholder: 'OUTSIDE-IN' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['permit', 'deny'], defaultValue: 'permit' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['tcp', 'udp', 'icmp', 'ip'], defaultValue: 'tcp' },
      { id: 'sourceNetwork', label: 'Source Network', type: 'text', required: true, placeholder: 'any' },
      { id: 'destNetwork', label: 'Destination Network', type: 'text', required: true, placeholder: '10.0.0.0 255.255.255.0' },
      { id: 'destPort', label: 'Destination Port', type: 'text', required: false, placeholder: '443' },
      { id: 'applyInterface', label: 'Apply to Interface', type: 'text', required: true, placeholder: 'outside' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const aclName = escapePowerShellString(params.aclName);
      const action = params.action;
      const protocol = params.protocol;
      const sourceNetwork = escapePowerShellString(params.sourceNetwork);
      const destNetwork = escapePowerShellString(params.destNetwork);
      const destPort = params.destPort ? escapePowerShellString(params.destPort) : '';
      const applyInterface = escapePowerShellString(params.applyInterface);
      
      return `# Cisco ASA Configure Access Control List
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter ASA credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
access-list ${aclName} extended ${action} ${protocol} ${sourceNetwork} ${destNetwork}${destPort ? ` eq ${destPort}` : ''}
access-group ${aclName} in interface ${applyInterface}
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] ACL configured!" -ForegroundColor Green
    Write-Host "  ACL Name: ${aclName}" -ForegroundColor Cyan
    Write-Host "  Rule: ${action} ${protocol} ${sourceNetwork} -> ${destNetwork}${destPort ? `:${destPort}` : ''}" -ForegroundColor Cyan
    Write-Host "  Applied to: ${applyInterface}" -ForegroundColor Cyan
    
} catch {
    Write-Error "ACL configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-asa-configure-vpn',
    name: 'Cisco ASA: Configure Site-to-Site VPN',
    category: 'Firewall Management',
    description: 'Configure IPsec site-to-site VPN tunnel',
    parameters: [
      { id: 'deviceIP', label: 'ASA IP Address', type: 'text', required: true, placeholder: '192.168.1.254' },
      { id: 'peerIP', label: 'Remote Peer IP', type: 'text', required: true, placeholder: '203.0.113.50' },
      { id: 'localNetwork', label: 'Local Network', type: 'text', required: true, placeholder: '10.0.0.0 255.255.255.0' },
      { id: 'remoteNetwork', label: 'Remote Network', type: 'text', required: true, placeholder: '192.168.100.0 255.255.255.0' },
      { id: 'psk', label: 'Pre-Shared Key', type: 'text', required: true, placeholder: 'SecureVPNKey123!' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const peerIP = escapePowerShellString(params.peerIP);
      const localNetwork = escapePowerShellString(params.localNetwork);
      const remoteNetwork = escapePowerShellString(params.remoteNetwork);
      const psk = escapePowerShellString(params.psk);
      
      return `# Cisco ASA Configure Site-to-Site VPN
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter ASA credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
crypto ikev1 policy 10
authentication pre-share
encryption aes-256
hash sha
group 14
lifetime 86400
exit
tunnel-group ${peerIP} type ipsec-l2l
tunnel-group ${peerIP} ipsec-attributes
ikev1 pre-shared-key ${psk}
exit
crypto ipsec ikev1 transform-set IPSEC-TRANSFORM esp-aes-256 esp-sha-hmac
object-group network LOCAL-NETWORK
network-object ${localNetwork}
exit
object-group network REMOTE-NETWORK
network-object ${remoteNetwork}
exit
access-list VPN-TRAFFIC extended permit ip object-group LOCAL-NETWORK object-group REMOTE-NETWORK
crypto map CRYPTO-MAP 10 match address VPN-TRAFFIC
crypto map CRYPTO-MAP 10 set peer ${peerIP}
crypto map CRYPTO-MAP 10 set ikev1 transform-set IPSEC-TRANSFORM
crypto map CRYPTO-MAP interface outside
crypto ikev1 enable outside
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] Site-to-Site VPN configured!" -ForegroundColor Green
    Write-Host "  Peer IP: ${peerIP}" -ForegroundColor Cyan
    Write-Host "  Local Network: ${localNetwork}" -ForegroundColor Cyan
    Write-Host "  Remote Network: ${remoteNetwork}" -ForegroundColor Cyan
    Write-Host "  Encryption: AES-256 / SHA" -ForegroundColor Cyan
    
} catch {
    Write-Error "VPN configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-wlc-configure-wlan',
    name: 'Cisco WLC: Configure WLAN',
    category: 'Wireless',
    description: 'Create and configure WLAN on Wireless LAN Controller',
    parameters: [
      { id: 'wlcIP', label: 'WLC IP Address', type: 'text', required: true, placeholder: '192.168.1.10' },
      { id: 'wlanId', label: 'WLAN ID', type: 'number', required: true, placeholder: '1' },
      { id: 'ssid', label: 'SSID Name', type: 'text', required: true, placeholder: 'Corporate-WiFi' },
      { id: 'profileName', label: 'Profile Name', type: 'text', required: true, placeholder: 'Corporate-Profile' },
      { id: 'securityType', label: 'Security Type', type: 'select', required: true, options: ['wpa2-psk', 'wpa2-enterprise', 'open'], defaultValue: 'wpa2-psk' },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: true, placeholder: '10' }
    ],
    scriptTemplate: (params) => {
      const wlcIP = escapePowerShellString(params.wlcIP);
      const wlanId = params.wlanId;
      const ssid = escapePowerShellString(params.ssid);
      const profileName = escapePowerShellString(params.profileName);
      const securityType = params.securityType;
      const vlanId = params.vlanId;
      
      return `# Cisco WLC Configure WLAN
# Generated: ${new Date().toISOString()}

$WlcIP = "${wlcIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter WLC credentials"
    $Session = New-SSHSession -ComputerName $WlcIP -Credential $Credential -AcceptKey
    
    $SecurityConfig = switch ("${securityType}") {
        "wpa2-psk" { "config wlan security wpa akm psk enable ${wlanId}" }
        "wpa2-enterprise" { "config wlan security wpa akm 802.1x enable ${wlanId}" }
        "open" { "config wlan security wpa disable ${wlanId}" }
    }
    
    $Commands = @"
config wlan create ${wlanId} ${profileName} ${ssid}
config wlan interface ${wlanId} vlan${vlanId}
$SecurityConfig
${securityType === 'wpa2-psk' ? `config wlan security wpa akm psk set-key ascii ChangeMe123! ${wlanId}` : ''}
config wlan enable ${wlanId}
save config
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] WLAN configured on WLC!" -ForegroundColor Green
    Write-Host "  WLAN ID: ${wlanId}" -ForegroundColor Cyan
    Write-Host "  SSID: ${ssid}" -ForegroundColor Cyan
    Write-Host "  Security: ${securityType}" -ForegroundColor Cyan
    Write-Host "  VLAN: ${vlanId}" -ForegroundColor Cyan
    
} catch {
    Write-Error "WLAN configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-wlc-export-ap-inventory',
    name: 'Cisco WLC: Export Access Point Inventory',
    category: 'Wireless',
    description: 'Export all access points from WLC to CSV',
    parameters: [
      { id: 'wlcIP', label: 'WLC IP Address', type: 'text', required: true, placeholder: '192.168.1.10' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ap-inventory.csv' }
    ],
    scriptTemplate: (params) => {
      const wlcIP = escapePowerShellString(params.wlcIP);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco WLC Export Access Point Inventory
# Generated: ${new Date().toISOString()}

$WlcIP = "${wlcIP}"
$ExportPath = "${exportPath}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter WLC credentials"
    $Session = New-SSHSession -ComputerName $WlcIP -Credential $Credential -AcceptKey
    
    $APSummary = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show ap summary"
    $APConfig = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show ap config general summary"
    
    Remove-SSHSession -SessionId $Session.SessionId
    
    $APList = @()
    $Lines = $APSummary.Output -split "\\n"
    
    foreach ($Line in $Lines) {
        if ($Line -match "^(\\S+)\\s+(\\d+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)") {
            $APList += [PSCustomObject]@{
                APName = $Matches[1]
                Slots = $Matches[2]
                APModel = $Matches[3]
                EthernetMAC = $Matches[4]
                Location = $Matches[5]
                Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            }
        }
    }
    
    $APList | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] AP inventory exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Total APs: $($APList.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "AP inventory export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ucs-get-blade-inventory',
    name: 'Cisco UCS: Export Blade Server Inventory',
    category: 'UCS',
    description: 'Export UCS blade server inventory via PowerTool',
    parameters: [
      { id: 'ucsIP', label: 'UCS Manager IP', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ucs-blades.csv' }
    ],
    scriptTemplate: (params) => {
      const ucsIP = escapePowerShellString(params.ucsIP);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco UCS Export Blade Server Inventory
# Generated: ${new Date().toISOString()}
# Requires: Cisco UCS PowerTool Suite

$UcsIP = "${ucsIP}"
$ExportPath = "${exportPath}"

try {
    Import-Module Cisco.UCSManager
    
    $Credential = Get-Credential -Message "Enter UCS Manager credentials"
    $UcsConnection = Connect-Ucs -Name $UcsIP -Credential $Credential
    
    $Blades = Get-UcsBlade | Select-Object @{N='Chassis';E={$_.ChassisId}},
        @{N='Slot';E={$_.SlotId}},
        @{N='Model';E={$_.Model}},
        @{N='Serial';E={$_.Serial}},
        @{N='NumCores';E={$_.NumOfCores}},
        @{N='NumCPUs';E={$_.NumOfCpus}},
        @{N='TotalMemory';E={$_.TotalMemory}},
        @{N='OperState';E={$_.OperState}},
        @{N='AssociatedProfile';E={$_.AssignedToDn}},
        @{N='FirmwareVersion';E={$_.OperPnDn}}
    
    $Blades | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Disconnect-Ucs
    
    Write-Host "[SUCCESS] UCS blade inventory exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Total Blades: $($Blades.Count)" -ForegroundColor Cyan
    
    $OperationalCount = ($Blades | Where-Object {$_.OperState -eq 'ok'}).Count
    Write-Host "  Operational: $OperationalCount" -ForegroundColor Green
    
} catch {
    Write-Error "UCS inventory export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ucs-create-service-profile',
    name: 'Cisco UCS: Create Service Profile',
    category: 'UCS',
    description: 'Create a new UCS service profile from template',
    parameters: [
      { id: 'ucsIP', label: 'UCS Manager IP', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'profileName', label: 'Service Profile Name', type: 'text', required: true, placeholder: 'SP-WebServer-01' },
      { id: 'templateName', label: 'Template Name', type: 'text', required: true, placeholder: 'WebServer-Template' },
      { id: 'targetOrg', label: 'Target Organization', type: 'text', required: true, placeholder: 'org-root', defaultValue: 'org-root' }
    ],
    scriptTemplate: (params) => {
      const ucsIP = escapePowerShellString(params.ucsIP);
      const profileName = escapePowerShellString(params.profileName);
      const templateName = escapePowerShellString(params.templateName);
      const targetOrg = escapePowerShellString(params.targetOrg);
      
      return `# Cisco UCS Create Service Profile
# Generated: ${new Date().toISOString()}
# Requires: Cisco UCS PowerTool Suite

$UcsIP = "${ucsIP}"

try {
    Import-Module Cisco.UCSManager
    
    $Credential = Get-Credential -Message "Enter UCS Manager credentials"
    $UcsConnection = Connect-Ucs -Name $UcsIP -Credential $Credential
    
    $Template = Get-UcsServiceProfile -Name "${templateName}" -Type "updating-template"
    
    if (-not $Template) {
        throw "Template '${templateName}' not found"
    }
    
    $NewProfile = Add-UcsServiceProfile -Org "${targetOrg}" \`
        -Name "${profileName}" \`
        -SrcTemplName "${templateName}" \`
        -Type "instance"
    
    Write-Host "[SUCCESS] Service Profile created!" -ForegroundColor Green
    Write-Host "  Profile Name: ${profileName}" -ForegroundColor Cyan
    Write-Host "  Template: ${templateName}" -ForegroundColor Cyan
    Write-Host "  Organization: ${targetOrg}" -ForegroundColor Cyan
    Write-Host "  DN: $($NewProfile.Dn)" -ForegroundColor Cyan
    
    Disconnect-Ucs
    
} catch {
    Write-Error "Service profile creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ucs-associate-blade',
    name: 'Cisco UCS: Associate Service Profile to Blade',
    category: 'UCS',
    description: 'Associate a service profile to a specific blade server',
    parameters: [
      { id: 'ucsIP', label: 'UCS Manager IP', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'profileName', label: 'Service Profile Name', type: 'text', required: true, placeholder: 'SP-WebServer-01' },
      { id: 'chassisId', label: 'Chassis ID', type: 'number', required: true, placeholder: '1' },
      { id: 'slotId', label: 'Slot ID', type: 'number', required: true, placeholder: '1' }
    ],
    scriptTemplate: (params) => {
      const ucsIP = escapePowerShellString(params.ucsIP);
      const profileName = escapePowerShellString(params.profileName);
      const chassisId = params.chassisId;
      const slotId = params.slotId;
      
      return `# Cisco UCS Associate Service Profile to Blade
# Generated: ${new Date().toISOString()}
# Requires: Cisco UCS PowerTool Suite

$UcsIP = "${ucsIP}"

try {
    Import-Module Cisco.UCSManager
    
    $Credential = Get-Credential -Message "Enter UCS Manager credentials"
    $UcsConnection = Connect-Ucs -Name $UcsIP -Credential $Credential
    
    $Blade = Get-UcsBlade -ChassisId ${chassisId} -SlotId ${slotId}
    
    if (-not $Blade) {
        throw "Blade not found at Chassis ${chassisId} Slot ${slotId}"
    }
    
    $Profile = Get-UcsServiceProfile -Name "${profileName}" -Type "instance"
    
    if (-not $Profile) {
        throw "Service Profile '${profileName}' not found"
    }
    
    $Profile | Set-UcsServiceProfile -PnDn $Blade.Dn -Force
    
    Write-Host "[SUCCESS] Service Profile associated!" -ForegroundColor Green
    Write-Host "  Profile: ${profileName}" -ForegroundColor Cyan
    Write-Host "  Blade: Chassis ${chassisId} / Slot ${slotId}" -ForegroundColor Cyan
    Write-Host "  Serial: $($Blade.Serial)" -ForegroundColor Cyan
    
    Disconnect-Ucs
    
} catch {
    Write-Error "Profile association failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-netflow',
    name: 'Cisco IOS: Configure NetFlow',
    category: 'Network Monitoring',
    description: 'Enable NetFlow traffic analysis and export to collector',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'collectorIP', label: 'NetFlow Collector IP', type: 'text', required: true, placeholder: '10.0.0.50' },
      { id: 'collectorPort', label: 'Collector Port', type: 'number', required: true, placeholder: '2055', defaultValue: 2055 },
      { id: 'sourceInterface', label: 'Source Interface', type: 'text', required: true, placeholder: 'GigabitEthernet0/0' },
      { id: 'netflowVersion', label: 'NetFlow Version', type: 'select', required: true, options: ['5', '9'], defaultValue: '9' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const collectorIP = escapePowerShellString(params.collectorIP);
      const collectorPort = params.collectorPort;
      const sourceInterface = escapePowerShellString(params.sourceInterface);
      const netflowVersion = params.netflowVersion;
      
      return `# Cisco IOS Configure NetFlow
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
ip flow-export destination ${collectorIP} ${collectorPort}
ip flow-export version ${netflowVersion}
ip flow-export source ${sourceInterface}
ip flow-cache timeout active 1
ip flow-cache timeout inactive 15
interface ${sourceInterface}
ip flow ingress
ip flow egress
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] NetFlow configured!" -ForegroundColor Green
    Write-Host "  Collector: ${collectorIP}:${collectorPort}" -ForegroundColor Cyan
    Write-Host "  Version: ${netflowVersion}" -ForegroundColor Cyan
    Write-Host "  Source Interface: ${sourceInterface}" -ForegroundColor Cyan
    
} catch {
    Write-Error "NetFlow configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-syslog',
    name: 'Cisco IOS: Configure Syslog',
    category: 'Network Monitoring',
    description: 'Configure syslog logging to remote server',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'syslogServer', label: 'Syslog Server IP', type: 'text', required: true, placeholder: '10.0.0.60' },
      { id: 'facility', label: 'Syslog Facility', type: 'select', required: true, options: ['local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'], defaultValue: 'local7' },
      { id: 'logLevel', label: 'Log Level', type: 'select', required: true, options: ['emergencies', 'alerts', 'critical', 'errors', 'warnings', 'notifications', 'informational', 'debugging'], defaultValue: 'informational' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const syslogServer = escapePowerShellString(params.syslogServer);
      const facility = params.facility;
      const logLevel = params.logLevel;
      
      return `# Cisco IOS Configure Syslog
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
logging host ${syslogServer}
logging facility ${facility}
logging trap ${logLevel}
logging source-interface Loopback0
logging on
service timestamps log datetime msec localtime show-timezone
service timestamps debug datetime msec localtime show-timezone
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] Syslog configured!" -ForegroundColor Green
    Write-Host "  Server: ${syslogServer}" -ForegroundColor Cyan
    Write-Host "  Facility: ${facility}" -ForegroundColor Cyan
    Write-Host "  Log Level: ${logLevel}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Syslog configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-tacacs',
    name: 'Cisco IOS: Configure TACACS+ Authentication',
    category: 'Security',
    description: 'Configure TACACS+ server for centralized authentication',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'tacacsServer', label: 'TACACS+ Server IP', type: 'text', required: true, placeholder: '10.0.0.100' },
      { id: 'tacacsKey', label: 'TACACS+ Shared Key', type: 'text', required: true, placeholder: 'TacacsSecret123' },
      { id: 'localFallback', label: 'Enable Local Fallback', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const tacacsServer = escapePowerShellString(params.tacacsServer);
      const tacacsKey = escapePowerShellString(params.tacacsKey);
      const localFallback = params.localFallback !== false;
      
      return `# Cisco IOS Configure TACACS+ Authentication
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
aaa new-model
tacacs server TACACS-SERVER
address ipv4 ${tacacsServer}
key ${tacacsKey}
exit
aaa group server tacacs+ TACACS-GROUP
server name TACACS-SERVER
exit
aaa authentication login default group TACACS-GROUP ${localFallback ? 'local' : ''}
aaa authorization exec default group TACACS-GROUP ${localFallback ? 'local' : ''} if-authenticated
aaa authorization commands 15 default group TACACS-GROUP ${localFallback ? 'local' : ''} if-authenticated
aaa accounting exec default start-stop group TACACS-GROUP
aaa accounting commands 15 default start-stop group TACACS-GROUP
${localFallback ? `username admin privilege 15 secret AdminBackupPass123` : ''}
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] TACACS+ configured!" -ForegroundColor Green
    Write-Host "  Server: ${tacacsServer}" -ForegroundColor Cyan
    Write-Host "  Local Fallback: ${localFallback ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    Write-Host "  WARNING: Test login before closing current session!" -ForegroundColor Yellow
    
} catch {
    Write-Error "TACACS+ configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-acl',
    name: 'Cisco IOS: Configure Extended ACL',
    category: 'Security',
    description: 'Create and apply extended access control lists',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'aclNumber', label: 'ACL Number (100-199)', type: 'number', required: true, placeholder: '100' },
      { id: 'aclName', label: 'ACL Name (optional)', type: 'text', required: false, placeholder: 'BLOCK-TELNET' },
      { id: 'rules', label: 'ACL Rules (one per line)', type: 'textarea', required: true, placeholder: 'deny tcp any any eq 23\npermit ip any any' },
      { id: 'applyInterface', label: 'Apply to Interface', type: 'text', required: false, placeholder: 'GigabitEthernet0/0' },
      { id: 'direction', label: 'Direction', type: 'select', required: false, options: ['in', 'out'], defaultValue: 'in' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const aclNumber = params.aclNumber;
      const aclName = params.aclName ? escapePowerShellString(params.aclName) : '';
      const rules = (params.rules as string).split('\n').filter((r: string) => r.trim());
      const applyInterface = params.applyInterface ? escapePowerShellString(params.applyInterface) : '';
      const direction = params.direction || 'in';
      
      return `# Cisco IOS Configure Extended ACL
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
${aclName ? `ip access-list extended ${aclName}` : `access-list ${aclNumber}`}
${rules.map(r => aclName ? escapePowerShellString(r.trim()) : `access-list ${aclNumber} ${escapePowerShellString(r.trim())}`).join('\n')}
${aclName ? 'exit' : ''}
${applyInterface ? `interface ${applyInterface}
ip access-group ${aclName || aclNumber} ${direction}
exit` : ''}
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] Extended ACL configured!" -ForegroundColor Green
    Write-Host "  ACL: ${aclName || aclNumber}" -ForegroundColor Cyan
    Write-Host "  Rules: ${rules.length}" -ForegroundColor Cyan
${applyInterface ? `    Write-Host "  Applied to: ${applyInterface} (${direction})" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "ACL configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-dhcp-snooping',
    name: 'Cisco IOS: Configure DHCP Snooping',
    category: 'Security',
    description: 'Enable DHCP snooping for rogue DHCP prevention',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'vlans', label: 'VLANs to Protect', type: 'text', required: true, placeholder: '10,20,30' },
      { id: 'trustedInterface', label: 'Trusted Interface (DHCP Server)', type: 'text', required: true, placeholder: 'GigabitEthernet0/24' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const vlans = escapePowerShellString(params.vlans);
      const trustedInterface = escapePowerShellString(params.trustedInterface);
      
      return `# Cisco IOS Configure DHCP Snooping
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
ip dhcp snooping
ip dhcp snooping vlan ${vlans}
no ip dhcp snooping information option
interface ${trustedInterface}
ip dhcp snooping trust
exit
ip dhcp snooping database flash:dhcp-snooping.db
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] DHCP Snooping configured!" -ForegroundColor Green
    Write-Host "  Protected VLANs: ${vlans}" -ForegroundColor Cyan
    Write-Host "  Trusted Interface: ${trustedInterface}" -ForegroundColor Cyan
    
} catch {
    Write-Error "DHCP Snooping configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-arp-inspection',
    name: 'Cisco IOS: Configure Dynamic ARP Inspection',
    category: 'Security',
    description: 'Enable DAI for ARP spoofing prevention',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'vlans', label: 'VLANs to Protect', type: 'text', required: true, placeholder: '10,20,30' },
      { id: 'trustedInterface', label: 'Trusted Interface', type: 'text', required: true, placeholder: 'GigabitEthernet0/24' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const vlans = escapePowerShellString(params.vlans);
      const trustedInterface = escapePowerShellString(params.trustedInterface);
      
      return `# Cisco IOS Configure Dynamic ARP Inspection
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
ip arp inspection vlan ${vlans}
interface ${trustedInterface}
ip arp inspection trust
exit
ip arp inspection validate src-mac dst-mac ip
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] Dynamic ARP Inspection configured!" -ForegroundColor Green
    Write-Host "  Protected VLANs: ${vlans}" -ForegroundColor Cyan
    Write-Host "  Trusted Interface: ${trustedInterface}" -ForegroundColor Cyan
    Write-Host "  Validation: src-mac, dst-mac, ip" -ForegroundColor Cyan
    
} catch {
    Write-Error "DAI configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-get-device-status',
    name: 'Meraki: Get Device Status Report',
    category: 'Meraki',
    description: 'Generate device uptime and status report',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'organizationId', label: 'Organization ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const orgId = escapePowerShellString(params.organizationId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco Meraki Get Device Status Report
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$OrgId = "${orgId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
}

try {
    $Uri = "https://api.meraki.com/api/v1/organizations/$OrgId/devices/statuses"
    $Devices = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Devices | Select-Object \`
        name,
        serial,
        mac,
        publicIp,
        networkId,
        status,
        lastReportedAt,
        productType,
        model
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $OnlineCount = ($Devices | Where-Object {$_.status -eq 'online'}).Count
    $OfflineCount = ($Devices | Where-Object {$_.status -eq 'offline'}).Count
    $AlertingCount = ($Devices | Where-Object {$_.status -eq 'alerting'}).Count
    
    Write-Host "[SUCCESS] Device status report exported!" -ForegroundColor Green
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    Write-Host "  Total Devices: $($Devices.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Status Summary:" -ForegroundColor Yellow
    Write-Host "  Online: $OnlineCount" -ForegroundColor Green
    Write-Host "  Offline: $OfflineCount" -ForegroundColor Red
    Write-Host "  Alerting: $AlertingCount" -ForegroundColor Yellow
    
} catch {
    Write-Error "Device status report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-configure-firewall-rules',
    name: 'Meraki: Configure MX Firewall Rules',
    category: 'Meraki',
    description: 'Configure L3 firewall rules on MX security appliance',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'policy', label: 'Policy', type: 'select', required: true, options: ['allow', 'deny'], defaultValue: 'deny' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['tcp', 'udp', 'icmp', 'any'], defaultValue: 'tcp' },
      { id: 'srcCidr', label: 'Source CIDR', type: 'text', required: true, placeholder: '10.0.0.0/24' },
      { id: 'destCidr', label: 'Destination CIDR', type: 'text', required: true, placeholder: 'any' },
      { id: 'destPort', label: 'Destination Port', type: 'text', required: false, placeholder: '443' },
      { id: 'comment', label: 'Rule Comment', type: 'text', required: false, placeholder: 'Block external access' }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const policy = params.policy;
      const protocol = params.protocol;
      const srcCidr = escapePowerShellString(params.srcCidr);
      const destCidr = escapePowerShellString(params.destCidr);
      const destPort = params.destPort ? escapePowerShellString(params.destPort) : 'Any';
      const comment = params.comment ? escapePowerShellString(params.comment) : 'Created via API';
      
      return `# Cisco Meraki Configure MX Firewall Rules
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/appliance/firewall/l3FirewallRules"
    $ExistingRules = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $NewRule = @{
        comment = "${comment}"
        policy = "${policy}"
        protocol = "${protocol}"
        srcCidr = "${srcCidr}"
        destCidr = "${destCidr}"
        destPort = "${destPort}"
        syslogEnabled = $false
    }
    
    $Rules = @($ExistingRules.rules | Where-Object {$_.comment -ne 'Default rule'})
    $Rules += $NewRule
    
    $Body = @{
        rules = $Rules
    } | ConvertTo-Json -Depth 10
    
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Firewall rule added!" -ForegroundColor Green
    Write-Host "  Policy: ${policy}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  Source: ${srcCidr}" -ForegroundColor Cyan
    Write-Host "  Destination: ${destCidr}:${destPort}" -ForegroundColor Cyan
    Write-Host "  Comment: ${comment}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Firewall rule configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-configure-vlan',
    name: 'Meraki: Configure VLAN',
    category: 'Meraki',
    description: 'Create or update VLAN on MX appliance',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: true, placeholder: '10' },
      { id: 'vlanName', label: 'VLAN Name', type: 'text', required: true, placeholder: 'Corporate' },
      { id: 'subnet', label: 'Subnet', type: 'text', required: true, placeholder: '10.10.10.0/24' },
      { id: 'applianceIp', label: 'Appliance IP', type: 'text', required: true, placeholder: '10.10.10.1' },
      { id: 'dhcpEnabled', label: 'Enable DHCP', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const vlanId = params.vlanId;
      const vlanName = escapePowerShellString(params.vlanName);
      const subnet = escapePowerShellString(params.subnet);
      const applianceIp = escapePowerShellString(params.applianceIp);
      const dhcpEnabled = params.dhcpEnabled !== false;
      
      return `# Cisco Meraki Configure VLAN
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        id = "${vlanId}"
        name = "${vlanName}"
        subnet = "${subnet}"
        applianceIp = "${applianceIp}"
        dhcpHandling = "${dhcpEnabled ? 'Run a DHCP server' : 'Do not respond to DHCP requests'}"
    } | ConvertTo-Json
    
    $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/appliance/vlans"
    
    try {
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        Write-Host "[SUCCESS] VLAN created!" -ForegroundColor Green
    } catch {
        $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/appliance/vlans/${vlanId}"
        Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
        Write-Host "[SUCCESS] VLAN updated!" -ForegroundColor Green
    }
    
    Write-Host "  VLAN ID: ${vlanId}" -ForegroundColor Cyan
    Write-Host "  Name: ${vlanName}" -ForegroundColor Cyan
    Write-Host "  Subnet: ${subnet}" -ForegroundColor Cyan
    Write-Host "  Appliance IP: ${applianceIp}" -ForegroundColor Cyan
    Write-Host "  DHCP: ${dhcpEnabled ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "VLAN configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-update-switch-port',
    name: 'Meraki: Configure Switch Port',
    category: 'Meraki',
    description: 'Configure switch port settings via API',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'serial', label: 'Switch Serial Number', type: 'text', required: true, placeholder: 'Q2XX-XXXX-XXXX' },
      { id: 'portId', label: 'Port ID', type: 'text', required: true, placeholder: '1' },
      { id: 'portName', label: 'Port Name', type: 'text', required: false, placeholder: 'Workstation-01' },
      { id: 'portType', label: 'Port Type', type: 'select', required: true, options: ['access', 'trunk'], defaultValue: 'access' },
      { id: 'vlan', label: 'VLAN ID', type: 'number', required: false, placeholder: '10' },
      { id: 'enabled', label: 'Port Enabled', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const serial = escapePowerShellString(params.serial);
      const portId = escapePowerShellString(params.portId);
      const portName = params.portName ? escapePowerShellString(params.portName) : '';
      const portType = params.portType;
      const vlan = params.vlan;
      const enabled = params.enabled !== false;
      
      return `# Cisco Meraki Configure Switch Port
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$Serial = "${serial}"
$PortId = "${portId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        enabled = $${enabled}
        type = "${portType}"
${portName ? `        name = "${portName}"` : ''}
${vlan ? `        vlan = ${vlan}` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://api.meraki.com/api/v1/devices/$Serial/switch/ports/$PortId"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Switch port configured!" -ForegroundColor Green
    Write-Host "  Serial: ${serial}" -ForegroundColor Cyan
    Write-Host "  Port: ${portId}" -ForegroundColor Cyan
    Write-Host "  Type: ${portType}" -ForegroundColor Cyan
${vlan ? `    Write-Host "  VLAN: ${vlan}" -ForegroundColor Cyan` : ''}
    Write-Host "  Enabled: ${enabled}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Switch port configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-show-cdp-neighbors',
    name: 'Cisco IOS: Export CDP Neighbors',
    category: 'Network Monitoring',
    description: 'Export CDP neighbor discovery information',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\cdp-neighbors.csv' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco IOS Export CDP Neighbors
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
$ExportPath = "${exportPath}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $CDPOutput = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show cdp neighbors detail"
    Remove-SSHSession -SessionId $Session.SessionId
    
    $Neighbors = @()
    $CurrentNeighbor = @{}
    
    foreach ($Line in ($CDPOutput.Output -split "\\n")) {
        if ($Line -match "Device ID:\\s*(.+)") {
            if ($CurrentNeighbor.Count -gt 0) {
                $Neighbors += [PSCustomObject]$CurrentNeighbor
            }
            $CurrentNeighbor = @{
                DeviceID = $Matches[1].Trim()
                IPAddress = ""
                Platform = ""
                LocalInterface = ""
                RemoteInterface = ""
                Capabilities = ""
            }
        }
        elseif ($Line -match "IP address:\\s*(\\d+\\.\\d+\\.\\d+\\.\\d+)") {
            $CurrentNeighbor.IPAddress = $Matches[1]
        }
        elseif ($Line -match "Platform:\\s*(.+),") {
            $CurrentNeighbor.Platform = $Matches[1].Trim()
        }
        elseif ($Line -match "Interface:\\s*(\\S+),\\s*Port ID.*:\\s*(\\S+)") {
            $CurrentNeighbor.LocalInterface = $Matches[1]
            $CurrentNeighbor.RemoteInterface = $Matches[2]
        }
    }
    
    if ($CurrentNeighbor.Count -gt 0) {
        $Neighbors += [PSCustomObject]$CurrentNeighbor
    }
    
    $Neighbors | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] CDP neighbors exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Total Neighbors: $($Neighbors.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "CDP neighbor export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-ntp',
    name: 'Cisco IOS: Configure NTP',
    category: 'Network Monitoring',
    description: 'Configure NTP servers for time synchronization',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'ntpServer1', label: 'Primary NTP Server', type: 'text', required: true, placeholder: '10.0.0.1' },
      { id: 'ntpServer2', label: 'Secondary NTP Server', type: 'text', required: false, placeholder: '10.0.0.2' },
      { id: 'timezone', label: 'Timezone', type: 'text', required: true, placeholder: 'EST -5', defaultValue: 'UTC 0' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const ntpServer1 = escapePowerShellString(params.ntpServer1);
      const ntpServer2 = params.ntpServer2 ? escapePowerShellString(params.ntpServer2) : '';
      const timezone = escapePowerShellString(params.timezone);
      
      return `# Cisco IOS Configure NTP
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
clock timezone ${timezone}
ntp server ${ntpServer1} prefer
${ntpServer2 ? `ntp server ${ntpServer2}` : ''}
ntp update-calendar
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] NTP configured!" -ForegroundColor Green
    Write-Host "  Primary NTP: ${ntpServer1}" -ForegroundColor Cyan
${ntpServer2 ? `    Write-Host "  Secondary NTP: ${ntpServer2}" -ForegroundColor Cyan` : ''}
    Write-Host "  Timezone: ${timezone}" -ForegroundColor Cyan
    
} catch {
    Write-Error "NTP configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-asa-export-connections',
    name: 'Cisco ASA: Export Active Connections',
    category: 'Firewall Management',
    description: 'Export current connection table from ASA',
    parameters: [
      { id: 'deviceIP', label: 'ASA IP Address', type: 'text', required: true, placeholder: '192.168.1.254' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\asa-connections.txt' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco ASA Export Active Connections
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
$ExportPath = "${exportPath}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter ASA credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Connections = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show conn all"
    $ConnCount = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show conn count"
    $XlateCount = Invoke-SSHCommand -SessionId $Session.SessionId -Command "show xlate count"
    
    Remove-SSHSession -SessionId $Session.SessionId
    
    $Report = @"
=== Cisco ASA Connection Report ===
Device: $DeviceIP
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

=== Connection Count ===
$($ConnCount.Output)

=== Xlate Count ===
$($XlateCount.Output)

=== Active Connections ===
$($Connections.Output)
"@
    
    $Report | Out-File -FilePath $ExportPath
    
    Write-Host "[SUCCESS] Connection report exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Connection export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-banner',
    name: 'Cisco IOS: Configure Login Banner',
    category: 'Security',
    description: 'Set MOTD and login banners for compliance',
    parameters: [
      { id: 'deviceIP', label: 'Device IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'bannerType', label: 'Banner Type', type: 'select', required: true, options: ['motd', 'login', 'exec'], defaultValue: 'motd' },
      { id: 'bannerText', label: 'Banner Text', type: 'textarea', required: true, placeholder: 'Authorized access only. All activity is monitored.' }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const bannerType = params.bannerType;
      const bannerText = escapePowerShellString(params.bannerText);
      
      return `# Cisco IOS Configure Login Banner
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
banner ${bannerType} ^
${bannerText}
^
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] Banner configured!" -ForegroundColor Green
    Write-Host "  Banner Type: ${bannerType}" -ForegroundColor Cyan
    Write-Host "  Banner Text Length: ${bannerText.length} characters" -ForegroundColor Cyan
    
} catch {
    Write-Error "Banner configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-get-network-events',
    name: 'Meraki: Export Network Events',
    category: 'Meraki',
    description: 'Export network events and alerts',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'networkId', label: 'Network ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'eventTypes', label: 'Event Types (comma-separated)', type: 'text', required: false, placeholder: 'dhcp_lease, client_association' }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const networkId = escapePowerShellString(params.networkId);
      const exportPath = escapePowerShellString(params.exportPath);
      const eventTypes = params.eventTypes ? escapePowerShellString(params.eventTypes) : '';
      
      return `# Cisco Meraki Export Network Events
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$NetworkId = "${networkId}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
}

try {
    $Uri = "https://api.meraki.com/api/v1/networks/$NetworkId/events"
${eventTypes ? `    $Uri += "?productType=wireless&includedEventTypes[]=${eventTypes.split(',').map(e => e.trim()).join('&includedEventTypes[]=')}"` : ''}
    
    $Events = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $EventReport = $Events.events | Select-Object \`
        occurredAt,
        type,
        description,
        clientId,
        clientMac,
        deviceSerial,
        deviceName
    
    $EventReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Network events exported!" -ForegroundColor Green
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    Write-Host "  Total Events: $($Events.events.Count)" -ForegroundColor Cyan
    
    $EventSummary = $Events.events | Group-Object type | Sort-Object Count -Descending | Select-Object -First 5
    Write-Host ""
    Write-Host "Top Event Types:" -ForegroundColor Yellow
    $EventSummary | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Event export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ios-configure-ip-source-guard',
    name: 'Cisco IOS: Configure IP Source Guard',
    category: 'Security',
    description: 'Enable IP source guard to prevent IP spoofing attacks',
    parameters: [
      { id: 'deviceIP', label: 'Switch IP Address', type: 'text', required: true, placeholder: '192.168.1.2' },
      { id: 'interface', label: 'Interface', type: 'text', required: true, placeholder: 'GigabitEthernet0/1' },
      { id: 'enablePortSecurity', label: 'Enable Port Security', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const deviceIP = escapePowerShellString(params.deviceIP);
      const iface = escapePowerShellString(params.interface);
      const enablePortSecurity = params.enablePortSecurity !== false;
      
      return `# Cisco IOS Configure IP Source Guard
# Generated: ${new Date().toISOString()}

$DeviceIP = "${deviceIP}"
Import-Module Posh-SSH

try {
    $Credential = Get-Credential -Message "Enter device credentials"
    $Session = New-SSHSession -ComputerName $DeviceIP -Credential $Credential -AcceptKey
    
    $Commands = @"
configure terminal
interface ${iface}
ip verify source
${enablePortSecurity ? `switchport port-security
switchport port-security maximum 2
switchport port-security violation restrict` : ''}
exit
exit
write memory
"@
    
    $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Commands
    Remove-SSHSession -SessionId $Session.SessionId
    
    Write-Host "[SUCCESS] IP Source Guard configured!" -ForegroundColor Green
    Write-Host "  Interface: ${iface}" -ForegroundColor Cyan
    Write-Host "  Port Security: ${enablePortSecurity ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "IP Source Guard configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'meraki-bulk-update-devices',
    name: 'Meraki: Bulk Update Device Names',
    category: 'Meraki',
    description: 'Update multiple device names from CSV file',
    parameters: [
      { id: 'apiKey', label: 'Meraki API Key', type: 'text', required: true },
      { id: 'csvPath', label: 'CSV Path (serial,name columns)', type: 'path', required: true, placeholder: 'C:\\Data\\device-names.csv' }
    ],
    scriptTemplate: (params) => {
      const apiKey = escapePowerShellString(params.apiKey);
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Cisco Meraki Bulk Update Device Names
# Generated: ${new Date().toISOString()}

$ApiKey = "${apiKey}"
$CsvPath = "${csvPath}"

$Headers = @{
    "X-Cisco-Meraki-API-Key" = $ApiKey
    "Content-Type" = "application/json"
}

try {
    $Devices = Import-Csv -Path $CsvPath
    $UpdateCount = 0
    $ErrorCount = 0
    
    foreach ($Device in $Devices) {
        try {
            $Body = @{
                name = $Device.name
            } | ConvertTo-Json
            
            $Uri = "https://api.meraki.com/api/v1/devices/$($Device.serial)"
            Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
            
            Write-Host "[SUCCESS] Updated: $($Device.serial) -> $($Device.name)" -ForegroundColor Green
            $UpdateCount++
            
            Start-Sleep -Milliseconds 250
        } catch {
            Write-Host "[FAILED] Failed: $($Device.serial) - $_" -ForegroundColor Red
            $ErrorCount++
        }
    }
    
    Write-Host ""
    Write-Host "Bulk update completed!" -ForegroundColor Green
    Write-Host "  Successful: $UpdateCount" -ForegroundColor Cyan
    Write-Host "  Failed: $ErrorCount" -ForegroundColor $(if ($ErrorCount -gt 0) {'Yellow'} else {'Cyan'})
    
} catch {
    Write-Error "Bulk update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cisco-ucs-get-firmware-status',
    name: 'Cisco UCS: Export Firmware Status Report',
    category: 'UCS',
    description: 'Generate firmware version report for all UCS components',
    parameters: [
      { id: 'ucsIP', label: 'UCS Manager IP', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ucs-firmware.csv' }
    ],
    scriptTemplate: (params) => {
      const ucsIP = escapePowerShellString(params.ucsIP);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cisco UCS Export Firmware Status Report
# Generated: ${new Date().toISOString()}
# Requires: Cisco UCS PowerTool Suite

$UcsIP = "${ucsIP}"
$ExportPath = "${exportPath}"

try {
    Import-Module Cisco.UCSManager
    
    $Credential = Get-Credential -Message "Enter UCS Manager credentials"
    $UcsConnection = Connect-Ucs -Name $UcsIP -Credential $Credential
    
    $FirmwareRunning = Get-UcsFirmwareRunning | Select-Object \`
        Dn,
        Type,
        Version,
        Deployment,
        PackageVersion
    
    $Report = $FirmwareRunning | ForEach-Object {
        [PSCustomObject]@{
            Component = $_.Dn
            Type = $_.Type
            RunningVersion = $_.Version
            Deployment = $_.Deployment
            PackageVersion = $_.PackageVersion
            Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        }
    }
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Disconnect-Ucs
    
    Write-Host "[SUCCESS] UCS Firmware report exported!" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Components: $($Report.Count)" -ForegroundColor Cyan
    
    $UniqueVersions = $FirmwareRunning | Select-Object Version -Unique
    Write-Host ""
    Write-Host "Firmware Versions Found:" -ForegroundColor Yellow
    $UniqueVersions | ForEach-Object {
        Write-Host "  $($_.Version)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Firmware report failed: $_"
}`;
    },
    isPremium: true
  }
];
