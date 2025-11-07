import { escapePowerShellString } from './powershell-utils';

export interface FortinetTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface FortinetTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: FortinetTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const fortinetTasks: FortinetTask[] = [
  {
    id: 'fortigate-bulk-create-addresses',
    name: 'Bulk Create Address Objects',
    category: 'Bulk Operations',
    description: 'Create multiple firewall address objects',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true, placeholder: 'firewall.company.com' },
      { id: 'addresses', label: 'Addresses (Name=IP, one per line)', type: 'textarea', required: true, placeholder: 'Server1=192.168.1.10\nServer2=192.168.1.11' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const addresses = (params.addresses as string).split('\n').filter((a: string) => a.trim());
      
      return `# FortiGate Bulk Create Address Objects
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

$Addresses = @(
${addresses.map(a => {
  const [name, ip] = a.split('=').map((s: string) => s.trim());
  return `    @{Name="${escapePowerShellString(name)}"; IP="${escapePowerShellString(ip)}"}`;
}).join(',\n')}
)

try {
    foreach ($Addr in $Addresses) {
        $Body = @{
            name = $Addr.Name
            subnet = "$($Addr.IP)/32"
            type = "ipmask"
        } | ConvertTo-Json
        
        $Uri = "https://$FortiGate/api/v2/cmdb/firewall/address"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
        
        Write-Host "✓ Address object created: $($Addr.Name) = $($Addr.IP)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk address creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'fortigate-create-firewall-policy',
    name: 'Create Firewall Policy',
    category: 'Policy Management',
    description: 'Create a new firewall policy rule',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Allow-Web-Traffic' },
      { id: 'sourceInterface', label: 'Source Interface', type: 'text', required: true, placeholder: 'internal' },
      { id: 'destInterface', label: 'Destination Interface', type: 'text', required: true, placeholder: 'wan1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['accept', 'deny'], defaultValue: 'accept' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const policyName = escapePowerShellString(params.policyName);
      const sourceInterface = escapePowerShellString(params.sourceInterface);
      const destInterface = escapePowerShellString(params.destInterface);
      const action = params.action;
      
      return `# FortiGate Create Firewall Policy
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${policyName}"
        srcintf = @(@{name="${sourceInterface}"})
        dstintf = @(@{name="${destInterface}"})
        srcaddr = @(@{name="all"})
        dstaddr = @(@{name="all"})
        action = "${action}"
        schedule = "always"
        service = @(@{name="ALL"})
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/policy"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Firewall policy '${policyName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'fortigate-backup-config',
    name: 'Backup Configuration',
    category: 'Configuration Management',
    description: 'Export FortiGate configuration backup',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'backupPath', label: 'Backup File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\fortigate-backup.conf' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const backupPath = escapePowerShellString(params.backupPath);
      
      return `# FortiGate Backup Configuration
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/monitor/system/config/backup?scope=global"
    $Config = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Config | Out-File -FilePath "${backupPath}"
    
    Write-Host "✓ Configuration backed up to: ${backupPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Backup failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'fortigate-edit-firewall-policy',
    name: 'Edit Firewall Policy',
    category: 'Common Admin Tasks',
    description: 'Modify an existing firewall policy rule',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'number', required: true, placeholder: '1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['accept', 'deny'], defaultValue: 'accept' },
      { id: 'enabled', label: 'Enable Policy', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const policyId = params.policyId;
      const action = params.action;
      const enabled = params.enabled !== false;
      
      return `# FortiGate Edit Firewall Policy
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        action = "${action}"
        status = "$(if (${enabled}) { 'enable' } else { 'disable' })"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/policy/${policyId}"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Firewall policy ${policyId} updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Policy edit failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-nat-rule',
    name: 'Create NAT Rule',
    category: 'Common Admin Tasks',
    description: 'Create a new NAT (Network Address Translation) rule',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'sourceInterface', label: 'Source Interface', type: 'text', required: true, placeholder: 'internal' },
      { id: 'destInterface', label: 'Destination Interface', type: 'text', required: true, placeholder: 'wan1' },
      { id: 'natEnabled', label: 'Enable NAT', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const sourceInterface = escapePowerShellString(params.sourceInterface);
      const destInterface = escapePowerShellString(params.destInterface);
      const natEnabled = params.natEnabled !== false;
      
      return `# FortiGate Create NAT Rule
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        srcintf = @(@{name="${sourceInterface}"})
        dstintf = @(@{name="${destInterface}"})
        srcaddr = @(@{name="all"})
        dstaddr = @(@{name="all"})
        action = "accept"
        schedule = "always"
        service = @(@{name="ALL"})
        nat = "$(if (${natEnabled}) { 'enable' } else { 'disable' })"
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/policy"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ NAT rule created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "NAT rule creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-delete-nat-rule',
    name: 'Delete NAT Rule',
    category: 'Common Admin Tasks',
    description: 'Remove an existing NAT rule',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'policyId', label: 'Policy/NAT Rule ID', type: 'number', required: true, placeholder: '1' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const policyId = params.policyId;
      
      return `# FortiGate Delete NAT Rule
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/policy/${policyId}"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -SkipCertificateCheck
    
    Write-Host "✓ NAT rule ${policyId} deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "NAT rule deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-address-group',
    name: 'Create Address Group',
    category: 'Common Admin Tasks',
    description: 'Create firewall address group from multiple address objects',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Internal-Servers' },
      { id: 'members', label: 'Member Addresses (comma-separated)', type: 'textarea', required: true, placeholder: 'Server1, Server2, Server3' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const groupName = escapePowerShellString(params.groupName);
      const members = (params.members as string).split(',').map((m: string) => m.trim());
      
      return `# FortiGate Create Address Group
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

$Members = @(${members.map(m => `@{name="${escapePowerShellString(m)}"}`).join(', ')})

try {
    $Body = @{
        name = "${groupName}"
        member = $Members
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/addrgrp"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Address group '${groupName}' created successfully!" -ForegroundColor Green
    Write-Host "  Members: ${members.join(', ')}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Address group creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-get-session-stats',
    name: 'Retrieve Session Statistics',
    category: 'Common Admin Tasks',
    description: 'Get current firewall session statistics',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\session-stats.txt' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# FortiGate Retrieve Session Statistics
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/monitor/system/session/stat"
    $Stats = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Session Statistics:" -ForegroundColor Green
    Write-Host "  Total Sessions: $($Stats.results.session_count)" -ForegroundColor Cyan
    Write-Host "  Setup Rate: $($Stats.results.setup_rate)/sec" -ForegroundColor Cyan
    
${exportPath ? `    
    $Stats | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host "✓ Statistics exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to retrieve session statistics: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-get-bandwidth-stats',
    name: 'Retrieve Bandwidth Statistics',
    category: 'Common Admin Tasks',
    description: 'Get interface bandwidth utilization statistics',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'interface', label: 'Interface Name', type: 'text', required: false, placeholder: 'wan1' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const iface = params.interface ? escapePowerShellString(params.interface) : 'all';
      
      return `# FortiGate Retrieve Bandwidth Statistics
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/monitor/system/interface"
    $Interfaces = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Bandwidth Statistics:" -ForegroundColor Green
    foreach ($Int in $Interfaces.results) {
${iface !== 'all' ? `        if ($Int.name -eq "${iface}") {` : ''}
        Write-Host ""
        Write-Host "  Interface: $($Int.name)" -ForegroundColor Cyan
        Write-Host "    RX Bytes: $($Int.rx_bytes)" -ForegroundColor White
        Write-Host "    TX Bytes: $($Int.tx_bytes)" -ForegroundColor White
        Write-Host "    RX Packets: $($Int.rx_packets)" -ForegroundColor White
        Write-Host "    TX Packets: $($Int.tx_packets)" -ForegroundColor White
${iface !== 'all' ? `        }` : ''}
    }
    
} catch {
    Write-Error "Failed to retrieve bandwidth statistics: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-logging',
    name: 'Configure Logging Settings',
    category: 'Common Admin Tasks',
    description: 'Configure syslog and logging settings',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'syslogServer', label: 'Syslog Server IP', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'syslogPort', label: 'Syslog Port', type: 'number', required: false, defaultValue: 514 }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const syslogServer = escapePowerShellString(params.syslogServer);
      const syslogPort = params.syslogPort || 514;
      
      return `# FortiGate Configure Logging Settings
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        server = "${syslogServer}"
        port = ${syslogPort}
        status = "enable"
        mode = "reliable"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/log.syslogd/setting"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Logging configured successfully!" -ForegroundColor Green
    Write-Host "  Syslog Server: ${syslogServer}:${syslogPort}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Logging configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-schedule-backup',
    name: 'Schedule Configuration Backup',
    category: 'Common Admin Tasks',
    description: 'Create scheduled task for automatic configuration backups',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'backupFolder', label: 'Backup Folder Path', type: 'path', required: true, placeholder: 'C:\\Backups\\Fortinet' },
      { id: 'schedule', label: 'Schedule', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Daily' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const backupFolder = escapePowerShellString(params.backupFolder);
      const schedule = params.schedule;
      
      return `# FortiGate Schedule Configuration Backup
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$BackupFolder = "${backupFolder}"
$Schedule = "${schedule}"

$ScriptBlock = {
    param($FortiGate, $BackupFolder)
    
    $ApiToken = Get-Content "$env:USERPROFILE\\fortigate-token.txt"
    $Headers = @{
        "Authorization" = "Bearer $ApiToken"
    }
    
    $BackupFile = Join-Path $BackupFolder "fortigate-backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').conf"
    
    try {
        $Uri = "https://$FortiGate/api/v2/monitor/system/config/backup?scope=global"
        $Config = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
        $Config | Out-File -FilePath $BackupFile
        
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

$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\\Scripts\\FortiGate-Backup.ps1"

# Save script block to file
$ScriptPath = "C:\\Scripts\\FortiGate-Backup.ps1"
$ScriptBlock.ToString() | Out-File -FilePath $ScriptPath -Force

Register-ScheduledTask -TaskName "FortiGate-AutoBackup" -Trigger $Trigger -Action $Action -Description "Automated FortiGate configuration backup" -RunLevel Highest

Write-Host "✓ Scheduled backup task created: $Schedule" -ForegroundColor Green
Write-Host "  Script saved to: $ScriptPath" -ForegroundColor Cyan
Write-Host "  Note: Store API token in $env:USERPROFILE\\fortigate-token.txt" -ForegroundColor Yellow`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-sync-config',
    name: 'Sync Configuration to Devices',
    category: 'Common Admin Tasks',
    description: 'Synchronize configuration across HA cluster members',
    parameters: [
      { id: 'fortigate', label: 'FortiGate Primary IP/Hostname', type: 'text', required: true },
      { id: 'syncScope', label: 'Sync Scope', type: 'select', required: true, options: ['global', 'vdom'], defaultValue: 'global' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const syncScope = params.syncScope;
      
      return `# FortiGate Sync Configuration to Devices
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        action = "sync"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/monitor/system/ha/sync"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Configuration sync initiated!" -ForegroundColor Green
    Write-Host "  Scope: ${syncScope}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Configuration sync failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-manage-vpn-tunnel',
    name: 'Manage VPN Tunnels',
    category: 'Common Admin Tasks',
    description: 'Enable or disable VPN tunnels',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'tunnelName', label: 'VPN Tunnel Name', type: 'text', required: true, placeholder: 'branch-vpn' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['enable', 'disable'], defaultValue: 'enable' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const tunnelName = escapePowerShellString(params.tunnelName);
      const action = params.action;
      
      return `# FortiGate Manage VPN Tunnels
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureFrom -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        status = "${action}"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/vpn.ipsec/phase1-interface/${tunnelName}"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ VPN tunnel '${tunnelName}' ${action}d successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "VPN tunnel management failed: $_"
}`;
    },
    isPremium: true
  }
];
