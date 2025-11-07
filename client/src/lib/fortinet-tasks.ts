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
  },
  {
    id: 'fortigate-manage-sslvpn-users',
    name: 'Manage SSL VPN Users and Groups',
    category: 'Common Admin Tasks',
    description: 'Create VPN users, configure groups, and set quotas for SSL VPN access',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'username', label: 'VPN Username', type: 'text', required: true, placeholder: 'vpnuser1' },
      { id: 'password', label: 'User Password', type: 'text', required: true, placeholder: 'SecurePassword123!' },
      { id: 'groupName', label: 'VPN Group Name', type: 'text', required: true, placeholder: 'remote-workers' },
      { id: 'quotaMB', label: 'Bandwidth Quota (MB)', type: 'number', required: false, placeholder: '1024' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const username = escapePowerShellString(params.username);
      const password = escapePowerShellString(params.password);
      const groupName = escapePowerShellString(params.groupName);
      const quotaMB = params.quotaMB || 0;
      
      return `# FortiGate Manage SSL VPN Users and Groups
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Create VPN User
    $UserBody = @{
        name = "${username}"
        type = "password"
        passwd = "${password}"
    } | ConvertTo-Json
    
    $UserUri = "https://$FortiGate/api/v2/cmdb/user/local"
    Invoke-RestMethod -Uri $UserUri -Method Post -Headers $Headers -Body $UserBody -SkipCertificateCheck
    Write-Host "✓ SSL VPN user '${username}' created successfully!" -ForegroundColor Green
    
    # Create or update VPN Group
    $GroupBody = @{
        name = "${groupName}"
        member = @(@{name="${username}"})
${quotaMB > 0 ? `        "firewall-policy-quota" = ${quotaMB}` : ''}
    } | ConvertTo-Json -Depth 10
    
    $GroupUri = "https://$FortiGate/api/v2/cmdb/user/group"
    try {
        Invoke-RestMethod -Uri $GroupUri -Method Post -Headers $Headers -Body $GroupBody -SkipCertificateCheck
        Write-Host "✓ VPN group '${groupName}' created with user '${username}'" -ForegroundColor Green
    } catch {
        # Group may exist, try to update
        $GroupUpdateUri = "https://$FortiGate/api/v2/cmdb/user/group/${groupName}"
        Invoke-RestMethod -Uri $GroupUpdateUri -Method Put -Headers $Headers -Body $GroupBody -SkipCertificateCheck
        Write-Host "✓ VPN group '${groupName}' updated with user '${username}'" -ForegroundColor Green
    }
    
${quotaMB > 0 ? `    Write-Host "  Bandwidth quota set: ${quotaMB} MB" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "SSL VPN user/group management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-sdwan',
    name: 'Configure SD-WAN Rules and SLAs',
    category: 'Common Admin Tasks',
    description: 'Create SD-WAN rules, SLA targets, and link health checks for intelligent traffic routing',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'ruleName', label: 'SD-WAN Rule Name', type: 'text', required: true, placeholder: 'Critical-App-Rule' },
      { id: 'slaTarget', label: 'SLA Target (ms latency)', type: 'number', required: true, placeholder: '50' },
      { id: 'healthCheckServer', label: 'Health Check Server', type: 'text', required: true, placeholder: '8.8.8.8' },
      { id: 'interfaces', label: 'SD-WAN Interfaces (comma-separated)', type: 'text', required: true, placeholder: 'wan1, wan2' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const ruleName = escapePowerShellString(params.ruleName);
      const slaTarget = params.slaTarget;
      const healthCheckServer = escapePowerShellString(params.healthCheckServer);
      const interfaces = (params.interfaces as string).split(',').map((i: string) => i.trim());
      
      return `# FortiGate Configure SD-WAN Rules and SLAs
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Configure SD-WAN Zone with interfaces
    $Interfaces = @(${interfaces.map(i => `@{name="${escapePowerShellString(i)}"}`).join(', ')})
    
    # Create Health Check
    $HealthCheckBody = @{
        name = "${ruleName}-healthcheck"
        server = "${healthCheckServer}"
        protocol = "ping"
        interval = 1000
        failtime = 5
        recoverytime = 5
        "sla" = @(@{
            "latency-threshold" = ${slaTarget}
            "jitter-threshold" = 50
            "packetloss-threshold" = 5
        })
    } | ConvertTo-Json -Depth 10
    
    $HealthCheckUri = "https://$FortiGate/api/v2/cmdb/system/sdwan/health-check"
    Invoke-RestMethod -Uri $HealthCheckUri -Method Post -Headers $Headers -Body $HealthCheckBody -SkipCertificateCheck
    Write-Host "✓ SD-WAN health check created for ${healthCheckServer}" -ForegroundColor Green
    Write-Host "  SLA target: ${slaTarget}ms latency" -ForegroundColor Cyan
    
    # Create SD-WAN Rule
    $RuleBody = @{
        name = "${ruleName}"
        mode = "sla"
        "sla" = @(@{
            "health-check" = "${ruleName}-healthcheck"
        })
        "dst" = @(@{name="all"})
        "src" = @(@{name="all"})
    } | ConvertTo-Json -Depth 10
    
    $RuleUri = "https://$FortiGate/api/v2/cmdb/system/sdwan/service"
    Invoke-RestMethod -Uri $RuleUri -Method Post -Headers $Headers -Body $RuleBody -SkipCertificateCheck
    
    Write-Host "✓ SD-WAN rule '${ruleName}' created successfully!" -ForegroundColor Green
    Write-Host "  Interfaces: ${interfaces.join(', ')}" -ForegroundColor Cyan
    
} catch {
    Write-Error "SD-WAN configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-manage-security-profiles',
    name: 'Manage Security Profiles (AV, IPS, Web Filter)',
    category: 'Common Admin Tasks',
    description: 'Configure antivirus, intrusion prevention, and web filtering security policies',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'profileName', label: 'Security Profile Name', type: 'text', required: true, placeholder: 'enterprise-security' },
      { id: 'avProfile', label: 'Antivirus Profile', type: 'select', required: true, options: ['default', 'high-security', 'custom'], defaultValue: 'default' },
      { id: 'ipsProfile', label: 'IPS Profile', type: 'select', required: true, options: ['default', 'strict', 'custom'], defaultValue: 'default' },
      { id: 'webfilterEnabled', label: 'Enable Web Filtering', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const profileName = escapePowerShellString(params.profileName);
      const avProfile = params.avProfile;
      const ipsProfile = params.ipsProfile;
      const webfilterEnabled = params.webfilterEnabled !== false;
      
      return `# FortiGate Manage Security Profiles
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Configure Antivirus Profile
    $AvBody = @{
        name = "${profileName}-av"
        "scan-mode" = "full"
        "http" = @{
            "options" = "scan avmonitor"
        }
        "ftp" = @{
            "options" = "scan avmonitor"
        }
    } | ConvertTo-Json -Depth 10
    
    $AvUri = "https://$FortiGate/api/v2/cmdb/antivirus/profile"
    Invoke-RestMethod -Uri $AvUri -Method Post -Headers $Headers -Body $AvBody -SkipCertificateCheck
    Write-Host "✓ Antivirus profile created: ${profileName}-av (${avProfile})" -ForegroundColor Green
    
    # Configure IPS Profile
    $IpsBody = @{
        name = "${profileName}-ips"
        "block-malicious-url" = "enable"
        "entries" = @(@{
            "severity" = "critical high medium"
            "status" = "enable"
            "action" = "block"
        })
    } | ConvertTo-Json -Depth 10
    
    $IpsUri = "https://$FortiGate/api/v2/cmdb/ips/sensor"
    Invoke-RestMethod -Uri $IpsUri -Method Post -Headers $Headers -Body $IpsBody -SkipCertificateCheck
    Write-Host "✓ IPS profile created: ${profileName}-ips (${ipsProfile})" -ForegroundColor Green
    
${webfilterEnabled ? `    # Configure Web Filter Profile
    $WebFilterBody = @{
        name = "${profileName}-webfilter"
        "https-replacemsg" = "enable"
        "web" = @{
            "blacklist" = "enable"
            "bword-table" = 1
        }
    } | ConvertTo-Json -Depth 10
    
    $WebFilterUri = "https://$FortiGate/api/v2/cmdb/webfilter/profile"
    Invoke-RestMethod -Uri $WebFilterUri -Method Post -Headers $Headers -Body $WebFilterBody -SkipCertificateCheck
    Write-Host "✓ Web filter profile created: ${profileName}-webfilter" -ForegroundColor Green` : ''}
    
    Write-Host ""
    Write-Host "Security profiles configured successfully!" -ForegroundColor Green
    Write-Host "  Profile name: ${profileName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Security profile configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-ha',
    name: 'Configure High Availability (HA)',
    category: 'Common Admin Tasks',
    description: 'Set up HA cluster, synchronize configuration, and monitor cluster status',
    parameters: [
      { id: 'fortigate', label: 'FortiGate Primary IP/Hostname', type: 'text', required: true },
      { id: 'haMode', label: 'HA Mode', type: 'select', required: true, options: ['a-p', 'a-a'], defaultValue: 'a-p' },
      { id: 'groupId', label: 'HA Group ID', type: 'number', required: true, placeholder: '1' },
      { id: 'groupName', label: 'HA Group Name', type: 'text', required: true, placeholder: 'ha-cluster-1' },
      { id: 'password', label: 'HA Password', type: 'text', required: true, placeholder: 'SecureHAPassword123!' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const haMode = params.haMode;
      const groupId = params.groupId;
      const groupName = escapePowerShellString(params.groupName);
      const password = escapePowerShellString(params.password);
      
      return `# FortiGate Configure High Availability
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Configure HA Settings
    $HaBody = @{
        mode = "${haMode}"
        "group-id" = ${groupId}
        "group-name" = "${groupName}"
        password = "${password}"
        "hbdev" = "port3 50"
        "session-pickup" = "enable"
        "session-pickup-connectionless" = "enable"
        "ha-mgmt-status" = "enable"
        "override" = "disable"
        "priority" = 128
    } | ConvertTo-Json -Depth 10
    
    $HaUri = "https://$FortiGate/api/v2/cmdb/system/ha"
    Invoke-RestMethod -Uri $HaUri -Method Put -Headers $Headers -Body $HaBody -SkipCertificateCheck
    
    Write-Host "✓ HA configuration applied successfully!" -ForegroundColor Green
    Write-Host "  Mode: ${haMode === 'a-p' ? 'Active-Passive' : 'Active-Active'}" -ForegroundColor Cyan
    Write-Host "  Group ID: ${groupId}" -ForegroundColor Cyan
    Write-Host "  Group Name: ${groupName}" -ForegroundColor Cyan
    
    # Check HA Status
    Start-Sleep -Seconds 2
    $StatusUri = "https://$FortiGate/api/v2/monitor/system/ha-peer"
    $HaStatus = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host ""
    Write-Host "HA Cluster Status:" -ForegroundColor Green
    foreach ($Peer in $HaStatus.results) {
        Write-Host "  Peer: $($Peer.hostname)" -ForegroundColor White
        Write-Host "    Serial: $($Peer.serial_no)" -ForegroundColor White
        Write-Host "    Priority: $($Peer.priority)" -ForegroundColor White
    }
    
} catch {
    Write-Error "HA configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-manage-fortiguard-updates',
    name: 'Manage FortiGuard Updates',
    category: 'Common Admin Tasks',
    description: 'Check and update FortiGuard threat database, web filter, and antivirus signatures',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'updateType', label: 'Update Type', type: 'select', required: true, options: ['av', 'ips', 'webfilter', 'all'], defaultValue: 'all' },
      { id: 'autoUpdate', label: 'Enable Auto-Update', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const updateType = params.updateType;
      const autoUpdate = params.autoUpdate !== false;
      
      return `# FortiGate Manage FortiGuard Updates
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Check current FortiGuard version
    $VersionUri = "https://$FortiGate/api/v2/monitor/system/fortiguard/version"
    $Versions = Invoke-RestMethod -Uri $VersionUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Current FortiGuard Versions:" -ForegroundColor Green
    Write-Host "  Antivirus: $($Versions.results.'antivirus-db'.version)" -ForegroundColor Cyan
    Write-Host "  IPS: $($Versions.results.'ips-db'.version)" -ForegroundColor Cyan
    Write-Host "  Web Filter: $($Versions.results.'webfilter-db'.version)" -ForegroundColor Cyan
    
${autoUpdate ? `    # Configure Auto-Update
    $AutoUpdateBody = @{
        "fortiguard-anycast" = "enable"
        "antivirus" = "enable"
        "ips" = "enable"
        "webfilter" = "enable"
        "schedule" = @{
            "frequency" = "every"
            "time" = "02:00"
        }
    } | ConvertTo-Json -Depth 10
    
    $UpdateConfigUri = "https://$FortiGate/api/v2/cmdb/system/autoupdate/schedule"
    Invoke-RestMethod -Uri $UpdateConfigUri -Method Put -Headers $Headers -Body $AutoUpdateBody -SkipCertificateCheck
    Write-Host "✓ Auto-update enabled for all FortiGuard services" -ForegroundColor Green` : ''}
    
    # Trigger manual update
    $UpdateBody = @{
${updateType === 'all' 
  ? `        "trigger-update" = "av ips webfilter"` 
  : `        "trigger-update" = "${updateType}"`}
    } | ConvertTo-Json
    
    $UpdateUri = "https://$FortiGate/api/v2/monitor/system/fortiguard/update"
    Invoke-RestMethod -Uri $UpdateUri -Method Post -Headers $Headers -Body $UpdateBody -SkipCertificateCheck
    
    Write-Host ""
    Write-Host "✓ FortiGuard update triggered for: ${updateType}" -ForegroundColor Green
    Write-Host "  Note: Update may take several minutes to complete" -ForegroundColor Yellow
    
} catch {
    Write-Error "FortiGuard update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-generate-security-reports',
    name: 'Generate Security Reports',
    category: 'Common Admin Tasks',
    description: 'Export comprehensive security reports including threat logs, bandwidth usage, and top applications',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['threat-logs', 'bandwidth', 'top-apps', 'comprehensive'], defaultValue: 'comprehensive' },
      { id: 'exportPath', label: 'Export File Path', type: 'path', required: true, placeholder: 'C:\\Reports\\fortigate-security-report.json' },
      { id: 'timeRange', label: 'Time Range (hours)', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      const timeRange = params.timeRange || 24;
      
      return `# FortiGate Generate Security Reports
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

$Report = @{
    GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    FortiGate = "${fortigate}"
    TimeRangeHours = ${timeRange}
    ReportType = "${reportType}"
}

try {
${reportType === 'threat-logs' || reportType === 'comprehensive' ? `    # Fetch Threat Logs
    $ThreatUri = "https://$FortiGate/api/v2/monitor/log/ips/select"
    $ThreatLogs = Invoke-RestMethod -Uri $ThreatUri -Method Get -Headers $Headers -SkipCertificateCheck
    $Report.ThreatLogs = $ThreatLogs.results
    Write-Host "✓ Threat logs retrieved: $($ThreatLogs.results.Count) events" -ForegroundColor Green
    ` : ''}
${reportType === 'bandwidth' || reportType === 'comprehensive' ? `    # Fetch Bandwidth Statistics
    $BandwidthUri = "https://$FortiGate/api/v2/monitor/system/interface/select"
    $Bandwidth = Invoke-RestMethod -Uri $BandwidthUri -Method Get -Headers $Headers -SkipCertificateCheck
    $Report.BandwidthStats = $Bandwidth.results | Select-Object name, rx_bytes, tx_bytes, rx_packets, tx_packets
    Write-Host "✓ Bandwidth statistics retrieved for $($Bandwidth.results.Count) interfaces" -ForegroundColor Green
    ` : ''}
${reportType === 'top-apps' || reportType === 'comprehensive' ? `    # Fetch Top Applications
    $AppsUri = "https://$FortiGate/api/v2/monitor/firewall/session/top"
    $TopApps = Invoke-RestMethod -Uri $AppsUri -Method Get -Headers $Headers -SkipCertificateCheck
    $Report.TopApplications = $TopApps.results
    Write-Host "✓ Top applications retrieved" -ForegroundColor Green
    ` : ''}
    # Fetch System Status
    $StatusUri = "https://$FortiGate/api/v2/monitor/system/status"
    $SystemStatus = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers -SkipCertificateCheck
    $Report.SystemStatus = @{
        Version = $SystemStatus.version
        Serial = $SystemStatus.serial
        Hostname = $SystemStatus.hostname
        OperationMode = $SystemStatus.operation_mode
    }
    
    # Export Report
    $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    
    Write-Host ""
    Write-Host "✓ Security report generated successfully!" -ForegroundColor Green
    Write-Host "  Report saved to: ${exportPath}" -ForegroundColor Cyan
    Write-Host "  Report type: ${reportType}" -ForegroundColor Cyan
    Write-Host "  Time range: ${timeRange} hours" -ForegroundColor Cyan
    
    # Display Summary
    Write-Host ""
    Write-Host "Report Summary:" -ForegroundColor Green
${reportType === 'threat-logs' || reportType === 'comprehensive' ? `    Write-Host "  Threat Events: $($ThreatLogs.results.Count)" -ForegroundColor White` : ''}
${reportType === 'bandwidth' || reportType === 'comprehensive' ? `    Write-Host "  Interfaces Monitored: $($Bandwidth.results.Count)" -ForegroundColor White` : ''}
${reportType === 'top-apps' || reportType === 'comprehensive' ? `    Write-Host "  Top Applications Tracked: $($TopApps.results.Count)" -ForegroundColor White` : ''}
    Write-Host "  System Version: $($SystemStatus.version)" -ForegroundColor White
    
} catch {
    Write-Error "Security report generation failed: $_"
}`;
    },
    isPremium: true
  }
];
