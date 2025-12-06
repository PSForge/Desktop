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
    },
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
    },
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
    },
    isPremium: true
  },
  {
    id: 'fortigate-edit-firewall-policy',
    name: 'Edit Firewall Policy',
    category: 'Policy Management',
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
        status = "${enabled ? 'enable' : 'disable'}"
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
    id: 'fortigate-reorder-firewall-policy',
    name: 'Reorder Firewall Policy',
    category: 'Policy Management',
    description: 'Move a firewall policy to a new position in the policy list',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID to Move', type: 'number', required: true, placeholder: '5' },
      { id: 'targetId', label: 'Target Policy ID', type: 'number', required: true, placeholder: '2' },
      { id: 'position', label: 'Position', type: 'select', required: true, options: ['before', 'after'], defaultValue: 'before' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const policyId = params.policyId;
      const targetId = params.targetId;
      const position = params.position;
      
      return `# FortiGate Reorder Firewall Policy
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/policy/${policyId}"
    $MoveParams = "action=move&${position}=${targetId}"
    
    Invoke-RestMethod -Uri "$Uri\`?$MoveParams" -Method Put -Headers $Headers -SkipCertificateCheck
    
    Write-Host "✓ Policy ${policyId} moved ${position} policy ${targetId}" -ForegroundColor Green
    
    # Verify new order
    $AllPolicies = Invoke-RestMethod -Uri "https://$FortiGate/api/v2/cmdb/firewall/policy" -Method Get -Headers $Headers -SkipCertificateCheck
    Write-Host ""
    Write-Host "Current Policy Order:" -ForegroundColor Cyan
    foreach ($Policy in $AllPolicies.results | Select-Object -First 10) {
        Write-Host "  ID: $($Policy.policyid) - $($Policy.name)" -ForegroundColor White
    }
    
} catch {
    Write-Error "Policy reorder failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-delete-firewall-policy',
    name: 'Delete Firewall Policy',
    category: 'Policy Management',
    description: 'Delete an existing firewall policy rule',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'number', required: true, placeholder: '1' },
      { id: 'confirm', label: 'Confirm Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const policyId = params.policyId;
      
      return `# FortiGate Delete Firewall Policy
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    # Get policy details before deletion
    $GetUri = "https://$FortiGate/api/v2/cmdb/firewall/policy/${policyId}"
    $Policy = Invoke-RestMethod -Uri $GetUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Deleting policy:" -ForegroundColor Yellow
    Write-Host "  ID: ${policyId}" -ForegroundColor White
    Write-Host "  Name: $($Policy.results.name)" -ForegroundColor White
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/policy/${policyId}"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -SkipCertificateCheck
    
    Write-Host ""
    Write-Host "✓ Firewall policy ${policyId} deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Policy deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-clone-firewall-policy',
    name: 'Clone Firewall Policy',
    category: 'Policy Management',
    description: 'Clone an existing firewall policy with a new name',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'sourcePolicyId', label: 'Source Policy ID', type: 'number', required: true, placeholder: '1' },
      { id: 'newPolicyName', label: 'New Policy Name', type: 'text', required: true, placeholder: 'Cloned-Policy' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const sourcePolicyId = params.sourcePolicyId;
      const newPolicyName = escapePowerShellString(params.newPolicyName);
      
      return `# FortiGate Clone Firewall Policy
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Get source policy
    $GetUri = "https://$FortiGate/api/v2/cmdb/firewall/policy/${sourcePolicyId}"
    $SourcePolicy = Invoke-RestMethod -Uri $GetUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    if (-not $SourcePolicy.results) {
        throw "Source policy ${sourcePolicyId} not found"
    }
    
    $Policy = $SourcePolicy.results
    
    # Create new policy with same settings
    $NewPolicy = @{
        name = "${newPolicyName}"
        srcintf = $Policy.srcintf
        dstintf = $Policy.dstintf
        srcaddr = $Policy.srcaddr
        dstaddr = $Policy.dstaddr
        action = $Policy.action
        schedule = $Policy.schedule
        service = $Policy.service
        nat = $Policy.nat
        logtraffic = $Policy.logtraffic
        status = "enable"
    } | ConvertTo-Json -Depth 10
    
    $CreateUri = "https://$FortiGate/api/v2/cmdb/firewall/policy"
    $Result = Invoke-RestMethod -Uri $CreateUri -Method Post -Headers $Headers -Body $NewPolicy -SkipCertificateCheck
    
    Write-Host "✓ Policy cloned successfully!" -ForegroundColor Green
    Write-Host "  Source: Policy ${sourcePolicyId} ($($Policy.name))" -ForegroundColor Cyan
    Write-Host "  New Policy: ${newPolicyName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy clone failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-service-object',
    name: 'Create Service Object',
    category: 'Firewall Objects',
    description: 'Create a custom service object for firewall policies',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Custom-HTTP-8080' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['TCP', 'UDP', 'ICMP', 'TCP/UDP'], defaultValue: 'TCP' },
      { id: 'destPort', label: 'Destination Port(s)', type: 'text', required: true, placeholder: '8080 or 8080-8090' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const serviceName = escapePowerShellString(params.serviceName);
      const protocol = params.protocol;
      const destPort = escapePowerShellString(params.destPort);
      
      return `# FortiGate Create Service Object
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
        name = "${serviceName}"
        protocol = "${protocol}"
        "tcp-portrange" = "${destPort}"
        "udp-portrange" = "${destPort}"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall.service/custom"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Service object '${serviceName}' created successfully!" -ForegroundColor Green
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  Port(s): ${destPort}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Service object creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-service-group',
    name: 'Create Service Group',
    category: 'Firewall Objects',
    description: 'Create a service group containing multiple service objects',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Web-Services' },
      { id: 'members', label: 'Member Services (comma-separated)', type: 'textarea', required: true, placeholder: 'HTTP, HTTPS, DNS' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const groupName = escapePowerShellString(params.groupName);
      const members = (params.members as string).split(',').map((m: string) => m.trim());
      
      return `# FortiGate Create Service Group
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
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall.service/group"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Service group '${groupName}' created successfully!" -ForegroundColor Green
    Write-Host "  Members: ${members.join(', ')}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Service group creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-nat-rule',
    name: 'Create NAT Rule',
    category: 'Network Configuration',
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
        nat = "${natEnabled ? 'enable' : 'disable'}"
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
    category: 'Network Configuration',
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
    category: 'Firewall Objects',
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
    id: 'fortigate-create-ipsec-vpn',
    name: 'Create IPSec VPN Tunnel',
    category: 'VPN Management',
    description: 'Create a site-to-site IPSec VPN tunnel',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'tunnelName', label: 'Tunnel Name', type: 'text', required: true, placeholder: 'branch-office-vpn' },
      { id: 'remoteGateway', label: 'Remote Gateway IP', type: 'text', required: true, placeholder: '203.0.113.1' },
      { id: 'preSharedKey', label: 'Pre-Shared Key', type: 'text', required: true, placeholder: 'YourSecureKey123!' },
      { id: 'localSubnet', label: 'Local Subnet', type: 'text', required: true, placeholder: '192.168.1.0/24' },
      { id: 'remoteSubnet', label: 'Remote Subnet', type: 'text', required: true, placeholder: '192.168.2.0/24' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const tunnelName = escapePowerShellString(params.tunnelName);
      const remoteGateway = escapePowerShellString(params.remoteGateway);
      const preSharedKey = escapePowerShellString(params.preSharedKey);
      const localSubnet = escapePowerShellString(params.localSubnet);
      const remoteSubnet = escapePowerShellString(params.remoteSubnet);
      
      return `# FortiGate Create IPSec VPN Tunnel
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Create Phase 1 Interface
    $Phase1Body = @{
        name = "${tunnelName}"
        type = "static"
        interface = "wan1"
        "remote-gw" = "${remoteGateway}"
        psksecret = "${preSharedKey}"
        proposal = "aes256-sha256"
        dhgrp = "14"
        "ike-version" = "2"
        keylife = 86400
    } | ConvertTo-Json -Depth 10
    
    $Phase1Uri = "https://$FortiGate/api/v2/cmdb/vpn.ipsec/phase1-interface"
    Invoke-RestMethod -Uri $Phase1Uri -Method Post -Headers $Headers -Body $Phase1Body -SkipCertificateCheck
    Write-Host "✓ Phase 1 interface created" -ForegroundColor Green
    
    # Create Phase 2 Interface
    $Phase2Body = @{
        name = "${tunnelName}-p2"
        "phase1name" = "${tunnelName}"
        proposal = "aes256-sha256"
        "src-subnet" = "${localSubnet}"
        "dst-subnet" = "${remoteSubnet}"
        keylifeseconds = 43200
    } | ConvertTo-Json -Depth 10
    
    $Phase2Uri = "https://$FortiGate/api/v2/cmdb/vpn.ipsec/phase2-interface"
    Invoke-RestMethod -Uri $Phase2Uri -Method Post -Headers $Headers -Body $Phase2Body -SkipCertificateCheck
    Write-Host "✓ Phase 2 interface created" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✓ IPSec VPN tunnel '${tunnelName}' created successfully!" -ForegroundColor Green
    Write-Host "  Remote Gateway: ${remoteGateway}" -ForegroundColor Cyan
    Write-Host "  Local Subnet: ${localSubnet}" -ForegroundColor Cyan
    Write-Host "  Remote Subnet: ${remoteSubnet}" -ForegroundColor Cyan
    
} catch {
    Write-Error "IPSec VPN creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-monitor-vpn-tunnels',
    name: 'Monitor VPN Tunnel Status',
    category: 'VPN Management',
    description: 'Get status and statistics for all VPN tunnels',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\vpn-status.json' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# FortiGate Monitor VPN Tunnel Status
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    # Get IPSec VPN Status
    $IpsecUri = "https://$FortiGate/api/v2/monitor/vpn/ipsec"
    $IpsecTunnels = Invoke-RestMethod -Uri $IpsecUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "IPSec VPN Tunnels:" -ForegroundColor Green
    foreach ($Tunnel in $IpsecTunnels.results) {
        $StatusColor = if ($Tunnel.status -eq "up") { "Green" } else { "Red" }
        Write-Host ""
        Write-Host "  Tunnel: $($Tunnel.name)" -ForegroundColor Cyan
        Write-Host "    Status: $($Tunnel.status)" -ForegroundColor $StatusColor
        Write-Host "    Remote Gateway: $($Tunnel.'remote-gw')" -ForegroundColor White
        Write-Host "    Incoming Bytes: $($Tunnel.'incoming-bytes')" -ForegroundColor White
        Write-Host "    Outgoing Bytes: $($Tunnel.'outgoing-bytes')" -ForegroundColor White
    }
    
    # Get SSL VPN Status
    $SslVpnUri = "https://$FortiGate/api/v2/monitor/vpn/ssl"
    $SslVpnStatus = Invoke-RestMethod -Uri $SslVpnUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host ""
    Write-Host "SSL VPN Status:" -ForegroundColor Green
    Write-Host "  Active Users: $($SslVpnStatus.results.users.Count)" -ForegroundColor Cyan
    
${exportPath ? `    
    $Report = @{
        GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        IpsecTunnels = $IpsecTunnels.results
        SslVpnStatus = $SslVpnStatus.results
    }
    $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "✓ VPN status exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "VPN monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-ssl-vpn-portal',
    name: 'Configure SSL VPN Portal',
    category: 'VPN Management',
    description: 'Configure SSL VPN web portal settings and bookmarks',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'portalName', label: 'Portal Name', type: 'text', required: true, placeholder: 'full-access-portal' },
      { id: 'tunnelMode', label: 'Enable Tunnel Mode', type: 'boolean', required: false, defaultValue: true },
      { id: 'webMode', label: 'Enable Web Mode', type: 'boolean', required: false, defaultValue: true },
      { id: 'splitTunneling', label: 'Enable Split Tunneling', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const portalName = escapePowerShellString(params.portalName);
      const tunnelMode = params.tunnelMode !== false;
      const webMode = params.webMode !== false;
      const splitTunneling = params.splitTunneling === true;
      
      return `# FortiGate Configure SSL VPN Portal
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
        name = "${portalName}"
        "tunnel-mode" = "${tunnelMode ? 'enable' : 'disable'}"
        "web-mode" = "${webMode ? 'enable' : 'disable'}"
        "split-tunneling" = "${splitTunneling ? 'enable' : 'disable'}"
        "auto-connect" = "disable"
        "keep-alive" = "enable"
        "save-password" = "enable"
        "ip-pools" = @(@{name="SSLVPN_TUNNEL_ADDR1"})
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/vpn.ssl.web/portal"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ SSL VPN portal '${portalName}' configured successfully!" -ForegroundColor Green
    Write-Host "  Tunnel Mode: ${tunnelMode ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    Write-Host "  Web Mode: ${webMode ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    Write-Host "  Split Tunneling: ${splitTunneling ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "SSL VPN portal configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-get-vpn-users-online',
    name: 'Get Connected VPN Users',
    category: 'VPN Management',
    description: 'List all currently connected SSL VPN users',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\vpn-users.csv' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# FortiGate Get Connected VPN Users
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/monitor/vpn/ssl"
    $VpnStatus = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Connected SSL VPN Users:" -ForegroundColor Green
    Write-Host "  Total Active: $($VpnStatus.results.users.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($User in $VpnStatus.results.users) {
        Write-Host "  User: $($User.user_name)" -ForegroundColor White
        Write-Host "    IP Address: $($User.remote_addr)" -ForegroundColor Gray
        Write-Host "    Assigned IP: $($User.tunnel_ip)" -ForegroundColor Gray
        Write-Host "    Duration: $($User.duration) seconds" -ForegroundColor Gray
        Write-Host "    Bytes In: $($User.rx_bytes)" -ForegroundColor Gray
        Write-Host "    Bytes Out: $($User.tx_bytes)" -ForegroundColor Gray
        Write-Host ""
    }
    
${exportPath ? `    
    $VpnStatus.results.users | Select-Object user_name, remote_addr, tunnel_ip, duration, rx_bytes, tx_bytes | 
        Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ User list exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to get VPN users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-disconnect-vpn-user',
    name: 'Disconnect VPN User',
    category: 'VPN Management',
    description: 'Force disconnect a specific SSL VPN user session',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'username', label: 'Username to Disconnect', type: 'text', required: true, placeholder: 'jsmith' },
      { id: 'index', label: 'Session Index (optional)', type: 'number', required: false, placeholder: '1' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const username = escapePowerShellString(params.username);
      const index = params.index || '';
      
      return `# FortiGate Disconnect VPN User
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # First, get user session info
    $StatusUri = "https://$FortiGate/api/v2/monitor/vpn/ssl"
    $VpnStatus = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $UserSession = $VpnStatus.results.users | Where-Object { $_.user_name -eq "${username}" }
    
    if (-not $UserSession) {
        Write-Host "User '${username}' not found in active VPN sessions" -ForegroundColor Yellow
        return
    }
    
    $Body = @{
        user = "${username}"
${index ? `        index = ${index}` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/monitor/vpn/ssl/logout"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ User '${username}' disconnected from SSL VPN!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to disconnect VPN user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-manage-vpn-tunnel',
    name: 'Manage VPN Tunnels',
    category: 'VPN Management',
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
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
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
    category: 'VPN Management',
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
    id: 'fortigate-configure-interface',
    name: 'Configure Network Interface',
    category: 'Network Configuration',
    description: 'Configure network interface settings including IP address and mode',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'interfaceName', label: 'Interface Name', type: 'text', required: true, placeholder: 'port1' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'netmask', label: 'Netmask', type: 'text', required: true, placeholder: '255.255.255.0' },
      { id: 'allowAccess', label: 'Allow Access', type: 'text', required: false, placeholder: 'ping https ssh', defaultValue: 'ping https ssh' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const interfaceName = escapePowerShellString(params.interfaceName);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const netmask = escapePowerShellString(params.netmask);
      const allowAccess = escapePowerShellString(params.allowAccess || 'ping https ssh');
      
      return `# FortiGate Configure Network Interface
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
        ip = "${ipAddress} ${netmask}"
        allowaccess = "${allowAccess}"
        mode = "static"
        status = "up"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/system/interface/${interfaceName}"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Interface '${interfaceName}' configured successfully!" -ForegroundColor Green
    Write-Host "  IP Address: ${ipAddress}/${netmask}" -ForegroundColor Cyan
    Write-Host "  Allow Access: ${allowAccess}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Interface configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-add-static-route',
    name: 'Add Static Route',
    category: 'Network Configuration',
    description: 'Add a static routing entry',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'destination', label: 'Destination Network', type: 'text', required: true, placeholder: '10.0.0.0/8' },
      { id: 'gateway', label: 'Gateway IP', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'device', label: 'Outgoing Interface', type: 'text', required: true, placeholder: 'wan1' },
      { id: 'distance', label: 'Administrative Distance', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const destination = escapePowerShellString(params.destination);
      const gateway = escapePowerShellString(params.gateway);
      const device = escapePowerShellString(params.device);
      const distance = params.distance || 10;
      
      return `# FortiGate Add Static Route
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
        dst = "${destination}"
        gateway = "${gateway}"
        device = "${device}"
        distance = ${distance}
        status = "enable"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/router/static"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Static route added successfully!" -ForegroundColor Green
    Write-Host "  Destination: ${destination}" -ForegroundColor Cyan
    Write-Host "  Gateway: ${gateway}" -ForegroundColor Cyan
    Write-Host "  Interface: ${device}" -ForegroundColor Cyan
    Write-Host "  Distance: ${distance}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Static route creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-get-routing-table',
    name: 'Get Routing Table',
    category: 'Network Configuration',
    description: 'Retrieve the current routing table',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\routing-table.txt' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# FortiGate Get Routing Table
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/monitor/router/ipv4"
    $Routes = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Routing Table:" -ForegroundColor Green
    Write-Host ""
    Write-Host ("{0,-20} {1,-18} {2,-12} {3,-10} {4}" -f "Destination", "Gateway", "Interface", "Distance", "Type") -ForegroundColor Cyan
    Write-Host ("-" * 80) -ForegroundColor Gray
    
    foreach ($Route in $Routes.results) {
        Write-Host ("{0,-20} {1,-18} {2,-12} {3,-10} {4}" -f $Route.ip_mask, $Route.gateway, $Route.interface, $Route.distance, $Route.type) -ForegroundColor White
    }
    
${exportPath ? `    
    $Routes.results | Format-Table -Property ip_mask, gateway, interface, distance, type | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "✓ Routing table exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to get routing table: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-dhcp-server',
    name: 'Configure DHCP Server',
    category: 'Network Configuration',
    description: 'Configure DHCP server on an interface',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'interface', label: 'Interface', type: 'text', required: true, placeholder: 'internal' },
      { id: 'startIp', label: 'Start IP', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'endIp', label: 'End IP', type: 'text', required: true, placeholder: '192.168.1.200' },
      { id: 'gateway', label: 'Default Gateway', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'dnsServer', label: 'DNS Server', type: 'text', required: false, placeholder: '8.8.8.8' },
      { id: 'leaseTime', label: 'Lease Time (seconds)', type: 'number', required: false, defaultValue: 86400 }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const iface = escapePowerShellString(params.interface);
      const startIp = escapePowerShellString(params.startIp);
      const endIp = escapePowerShellString(params.endIp);
      const gateway = escapePowerShellString(params.gateway);
      const dnsServer = params.dnsServer ? escapePowerShellString(params.dnsServer) : '8.8.8.8';
      const leaseTime = params.leaseTime || 86400;
      
      return `# FortiGate Configure DHCP Server
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
        interface = "${iface}"
        status = "enable"
        "ip-range" = @(@{
            "start-ip" = "${startIp}"
            "end-ip" = "${endIp}"
        })
        "default-gateway" = "${gateway}"
        "dns-server1" = "${dnsServer}"
        "lease-time" = ${leaseTime}
        netmask = "255.255.255.0"
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/system.dhcp/server"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ DHCP server configured successfully!" -ForegroundColor Green
    Write-Host "  Interface: ${iface}" -ForegroundColor Cyan
    Write-Host "  IP Range: ${startIp} - ${endIp}" -ForegroundColor Cyan
    Write-Host "  Gateway: ${gateway}" -ForegroundColor Cyan
    Write-Host "  DNS Server: ${dnsServer}" -ForegroundColor Cyan
    Write-Host "  Lease Time: ${leaseTime} seconds" -ForegroundColor Cyan
    
} catch {
    Write-Error "DHCP server configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-dns-settings',
    name: 'Configure DNS Settings',
    category: 'Network Configuration',
    description: 'Configure system DNS servers and settings',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'primaryDns', label: 'Primary DNS Server', type: 'text', required: true, placeholder: '8.8.8.8' },
      { id: 'secondaryDns', label: 'Secondary DNS Server', type: 'text', required: false, placeholder: '8.8.4.4' },
      { id: 'dnsCacheEnabled', label: 'Enable DNS Cache', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const primaryDns = escapePowerShellString(params.primaryDns);
      const secondaryDns = params.secondaryDns ? escapePowerShellString(params.secondaryDns) : '';
      const dnsCacheEnabled = params.dnsCacheEnabled !== false;
      
      return `# FortiGate Configure DNS Settings
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
        primary = "${primaryDns}"
${secondaryDns ? `        secondary = "${secondaryDns}"` : ''}
        "dns-cache-limit" = 5000
        "dns-cache-ttl" = 1800
        "cache-notfound-responses" = "${dnsCacheEnabled ? 'enable' : 'disable'}"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/system/dns"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ DNS settings configured successfully!" -ForegroundColor Green
    Write-Host "  Primary DNS: ${primaryDns}" -ForegroundColor Cyan
${secondaryDns ? `    Write-Host "  Secondary DNS: ${secondaryDns}" -ForegroundColor Cyan` : ''}
    Write-Host "  DNS Cache: ${dnsCacheEnabled ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "DNS configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-sdwan',
    name: 'Configure SD-WAN Rules and SLAs',
    category: 'Network Configuration',
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
    category: 'Security Profiles',
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
    id: 'fortigate-create-application-control-profile',
    name: 'Create Application Control Profile',
    category: 'Security Profiles',
    description: 'Create an application control profile to manage application usage',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'profileName', label: 'Profile Name', type: 'text', required: true, placeholder: 'app-control-policy' },
      { id: 'blockedCategories', label: 'Blocked Categories (comma-separated)', type: 'textarea', required: true, placeholder: 'P2P, Game, Proxy' },
      { id: 'logEnabled', label: 'Enable Logging', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const profileName = escapePowerShellString(params.profileName);
      const blockedCategories = (params.blockedCategories as string).split(',').map((c: string) => c.trim());
      const logEnabled = params.logEnabled !== false;
      
      return `# FortiGate Create Application Control Profile
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Entries = @(
${blockedCategories.map(c => `        @{
            category = "${escapePowerShellString(c)}"
            action = "block"
            log = "${logEnabled ? 'enable' : 'disable'}"
        }`).join(',\n')}
    )
    
    $Body = @{
        name = "${profileName}"
        "deep-app-inspection" = "enable"
        entries = $Entries
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/application/list"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Application control profile '${profileName}' created!" -ForegroundColor Green
    Write-Host "  Blocked categories: ${blockedCategories.join(', ')}" -ForegroundColor Cyan
    Write-Host "  Logging: ${logEnabled ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Application control profile creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-ssl-inspection',
    name: 'Configure SSL Inspection Profile',
    category: 'Security Profiles',
    description: 'Create an SSL/TLS inspection profile for deep packet inspection',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'profileName', label: 'Profile Name', type: 'text', required: true, placeholder: 'ssl-inspection-full' },
      { id: 'inspectionMode', label: 'Inspection Mode', type: 'select', required: true, options: ['certificate-inspection', 'deep-inspection'], defaultValue: 'deep-inspection' },
      { id: 'untrustedCaAction', label: 'Untrusted CA Action', type: 'select', required: true, options: ['allow', 'block', 'ignore'], defaultValue: 'block' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const profileName = escapePowerShellString(params.profileName);
      const inspectionMode = params.inspectionMode;
      const untrustedCaAction = params.untrustedCaAction;
      
      return `# FortiGate Configure SSL Inspection Profile
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
        name = "${profileName}"
        inspection = "${inspectionMode}"
        "untrusted-caname" = "${untrustedCaAction}"
        https = @{
            ports = "443"
            status = "enable"
        }
        ftps = @{
            ports = "990"
            status = "enable"
        }
        smtps = @{
            ports = "465"
            status = "enable"
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/ssl-ssh-profile"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ SSL inspection profile '${profileName}' created!" -ForegroundColor Green
    Write-Host "  Inspection Mode: ${inspectionMode}" -ForegroundColor Cyan
    Write-Host "  Untrusted CA Action: ${untrustedCaAction}" -ForegroundColor Cyan
    
} catch {
    Write-Error "SSL inspection profile creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-dlp-profile',
    name: 'Create DLP Profile',
    category: 'Security Profiles',
    description: 'Create a Data Loss Prevention profile to protect sensitive data',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'profileName', label: 'Profile Name', type: 'text', required: true, placeholder: 'dlp-sensitive-data' },
      { id: 'sensitivity', label: 'Sensitivity Level', type: 'select', required: true, options: ['low', 'medium', 'high', 'critical'], defaultValue: 'high' },
      { id: 'action', label: 'Action on Match', type: 'select', required: true, options: ['log-only', 'block', 'quarantine'], defaultValue: 'block' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const profileName = escapePowerShellString(params.profileName);
      const sensitivity = params.sensitivity;
      const action = params.action;
      
      return `# FortiGate Create DLP Profile
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
        name = "${profileName}"
        "full-archive-proto" = "smtp pop3 imap http-get http-post ftp nntp mapi"
        "summary-proto" = "smtp pop3 imap http-get http-post ftp nntp mapi"
        rule = @(@{
            name = "${profileName}-rule1"
            sensitivity = "${sensitivity}"
            action = "${action}"
            proto = "smtp pop3 imap http-get http-post"
        })
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/dlp/sensor"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ DLP profile '${profileName}' created!" -ForegroundColor Green
    Write-Host "  Sensitivity: ${sensitivity}" -ForegroundColor Cyan
    Write-Host "  Action: ${action}" -ForegroundColor Cyan
    
} catch {
    Write-Error "DLP profile creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-dos-policy',
    name: 'Configure DoS Protection Policy',
    category: 'Security Profiles',
    description: 'Configure Denial of Service protection settings',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'dos-protection' },
      { id: 'interface', label: 'Interface', type: 'text', required: true, placeholder: 'wan1' },
      { id: 'tcpSynFloodThreshold', label: 'TCP SYN Flood Threshold', type: 'number', required: false, defaultValue: 2000 },
      { id: 'icmpFloodThreshold', label: 'ICMP Flood Threshold', type: 'number', required: false, defaultValue: 1000 }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const policyName = escapePowerShellString(params.policyName);
      const iface = escapePowerShellString(params.interface);
      const tcpSynFloodThreshold = params.tcpSynFloodThreshold || 2000;
      const icmpFloodThreshold = params.icmpFloodThreshold || 1000;
      
      return `# FortiGate Configure DoS Protection Policy
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
        interface = @(@{name="${iface}"})
        srcaddr = @(@{name="all"})
        dstaddr = @(@{name="all"})
        service = @(@{name="ALL"})
        anomaly = @(
            @{
                name = "tcp_syn_flood"
                status = "enable"
                action = "block"
                threshold = ${tcpSynFloodThreshold}
            },
            @{
                name = "icmp_flood"
                status = "enable"
                action = "block"
                threshold = ${icmpFloodThreshold}
            },
            @{
                name = "udp_flood"
                status = "enable"
                action = "block"
                threshold = 2000
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/firewall/DoS-policy"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ DoS protection policy '${policyName}' created!" -ForegroundColor Green
    Write-Host "  Interface: ${iface}" -ForegroundColor Cyan
    Write-Host "  TCP SYN Flood Threshold: ${tcpSynFloodThreshold}/sec" -ForegroundColor Cyan
    Write-Host "  ICMP Flood Threshold: ${icmpFloodThreshold}/sec" -ForegroundColor Cyan
    
} catch {
    Write-Error "DoS policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-create-local-user',
    name: 'Create Local User',
    category: 'User Management',
    description: 'Create a local user account for authentication',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jsmith' },
      { id: 'password', label: 'Password', type: 'text', required: true, placeholder: 'SecurePassword123!' },
      { id: 'email', label: 'Email Address', type: 'email', required: false, placeholder: 'jsmith@company.com' },
      { id: 'twoFactor', label: 'Enable Two-Factor Auth', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const username = escapePowerShellString(params.username);
      const password = escapePowerShellString(params.password);
      const email = params.email ? escapePowerShellString(params.email) : '';
      const twoFactor = params.twoFactor === true;
      
      return `# FortiGate Create Local User
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
        name = "${username}"
        type = "password"
        passwd = "${password}"
        status = "enable"
${email ? `        "email-to" = "${email}"` : ''}
${twoFactor ? `        "two-factor" = "email"
        "email-to" = "${email}"` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/user/local"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Local user '${username}' created successfully!" -ForegroundColor Green
${email ? `    Write-Host "  Email: ${email}" -ForegroundColor Cyan` : ''}
    Write-Host "  Two-Factor Auth: ${twoFactor ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "User creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-ldap-server',
    name: 'Configure LDAP Server',
    category: 'User Management',
    description: 'Configure LDAP server integration for user authentication',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'corp-ldap' },
      { id: 'ldapServer', label: 'LDAP Server IP', type: 'text', required: true, placeholder: '192.168.1.10' },
      { id: 'baseDn', label: 'Base DN', type: 'text', required: true, placeholder: 'dc=company,dc=com' },
      { id: 'bindDn', label: 'Bind DN', type: 'text', required: true, placeholder: 'cn=admin,dc=company,dc=com' },
      { id: 'bindPassword', label: 'Bind Password', type: 'text', required: true, placeholder: 'LdapPassword123!' },
      { id: 'secure', label: 'Use LDAPS', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const serverName = escapePowerShellString(params.serverName);
      const ldapServer = escapePowerShellString(params.ldapServer);
      const baseDn = escapePowerShellString(params.baseDn);
      const bindDn = escapePowerShellString(params.bindDn);
      const bindPassword = escapePowerShellString(params.bindPassword);
      const secure = params.secure !== false;
      
      return `# FortiGate Configure LDAP Server
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
        name = "${serverName}"
        server = "${ldapServer}"
        cnid = "cn"
        dn = "${baseDn}"
        type = "regular"
        username = "${bindDn}"
        password = "${bindPassword}"
        port = ${secure ? 636 : 389}
        secure = "${secure ? 'ldaps' : 'disable'}"
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/user/ldap"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ LDAP server '${serverName}' configured successfully!" -ForegroundColor Green
    Write-Host "  Server: ${ldapServer}" -ForegroundColor Cyan
    Write-Host "  Base DN: ${baseDn}" -ForegroundColor Cyan
    Write-Host "  Secure: ${secure ? 'LDAPS' : 'LDAP'}" -ForegroundColor Cyan
    
} catch {
    Write-Error "LDAP configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-radius-server',
    name: 'Configure RADIUS Server',
    category: 'User Management',
    description: 'Configure RADIUS server for authentication',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'corp-radius' },
      { id: 'radiusServer', label: 'RADIUS Server IP', type: 'text', required: true, placeholder: '192.168.1.20' },
      { id: 'secret', label: 'Shared Secret', type: 'text', required: true, placeholder: 'RadiusSecret123!' },
      { id: 'authType', label: 'Auth Type', type: 'select', required: true, options: ['auto', 'ms_chap_v2', 'pap', 'chap'], defaultValue: 'auto' },
      { id: 'secondaryServer', label: 'Secondary Server IP (optional)', type: 'text', required: false, placeholder: '192.168.1.21' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const serverName = escapePowerShellString(params.serverName);
      const radiusServer = escapePowerShellString(params.radiusServer);
      const secret = escapePowerShellString(params.secret);
      const authType = params.authType;
      const secondaryServer = params.secondaryServer ? escapePowerShellString(params.secondaryServer) : '';
      
      return `# FortiGate Configure RADIUS Server
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
        name = "${serverName}"
        server = "${radiusServer}"
        secret = "${secret}"
        "auth-type" = "${authType}"
        "radius-port" = 1812
        "acct-interim-interval" = 600
${secondaryServer ? `        "secondary-server" = "${secondaryServer}"
        "secondary-secret" = "${secret}"` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/user/radius"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ RADIUS server '${serverName}' configured successfully!" -ForegroundColor Green
    Write-Host "  Primary Server: ${radiusServer}" -ForegroundColor Cyan
${secondaryServer ? `    Write-Host "  Secondary Server: ${secondaryServer}" -ForegroundColor Cyan` : ''}
    Write-Host "  Auth Type: ${authType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "RADIUS configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-two-factor-auth',
    name: 'Configure Two-Factor Authentication',
    category: 'User Management',
    description: 'Configure two-factor authentication for user accounts',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jsmith' },
      { id: 'method', label: '2FA Method', type: 'select', required: true, options: ['email', 'sms', 'fortitoken'], defaultValue: 'email' },
      { id: 'emailOrPhone', label: 'Email or Phone', type: 'text', required: true, placeholder: 'jsmith@company.com or +1234567890' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const username = escapePowerShellString(params.username);
      const method = params.method;
      const emailOrPhone = escapePowerShellString(params.emailOrPhone);
      
      return `# FortiGate Configure Two-Factor Authentication
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
        "two-factor" = "${method}"
${method === 'email' ? `        "email-to" = "${emailOrPhone}"` : ''}
${method === 'sms' ? `        "sms-phone" = "${emailOrPhone}"` : ''}
    } | ConvertTo-Json
    
    $Uri = "https://$FortiGate/api/v2/cmdb/user/local/${username}"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Two-factor authentication configured for '${username}'!" -ForegroundColor Green
    Write-Host "  Method: ${method}" -ForegroundColor Cyan
    Write-Host "  Destination: ${emailOrPhone}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Two-factor configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-ha',
    name: 'Configure High Availability (HA)',
    category: 'High Availability',
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
    id: 'fortigate-get-ha-status',
    name: 'Get HA Cluster Status',
    category: 'High Availability',
    description: 'Retrieve current HA cluster status and health information',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\ha-status.json' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# FortiGate Get HA Cluster Status
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    # Get HA Configuration
    $HaConfigUri = "https://$FortiGate/api/v2/cmdb/system/ha"
    $HaConfig = Invoke-RestMethod -Uri $HaConfigUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get HA Peer Status
    $HaPeerUri = "https://$FortiGate/api/v2/monitor/system/ha-peer"
    $HaPeers = Invoke-RestMethod -Uri $HaPeerUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get HA Checksums
    $HaChecksumUri = "https://$FortiGate/api/v2/monitor/system/ha-checksums"
    $HaChecksums = Invoke-RestMethod -Uri $HaChecksumUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "HA Configuration:" -ForegroundColor Green
    Write-Host "  Mode: $($HaConfig.results.mode)" -ForegroundColor Cyan
    Write-Host "  Group ID: $($HaConfig.results.'group-id')" -ForegroundColor Cyan
    Write-Host "  Group Name: $($HaConfig.results.'group-name')" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Cluster Members:" -ForegroundColor Green
    foreach ($Peer in $HaPeers.results) {
        $StatusColor = if ($Peer.status -eq "up") { "Green" } else { "Red" }
        Write-Host ""
        Write-Host "  $($Peer.hostname)" -ForegroundColor Cyan
        Write-Host "    Status: $($Peer.status)" -ForegroundColor $StatusColor
        Write-Host "    Serial: $($Peer.serial_no)" -ForegroundColor White
        Write-Host "    Priority: $($Peer.priority)" -ForegroundColor White
        Write-Host "    Role: $($Peer.role)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Sync Status:" -ForegroundColor Green
    $InSync = $HaChecksums.results.is_in_sync
    $SyncColor = if ($InSync) { "Green" } else { "Yellow" }
    Write-Host "  Configuration In Sync: $InSync" -ForegroundColor $SyncColor
    
${exportPath ? `    
    $Report = @{
        GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Configuration = $HaConfig.results
        Peers = $HaPeers.results
        Checksums = $HaChecksums.results
    }
    $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "✓ HA status exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to get HA status: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-ha-failover',
    name: 'Trigger HA Failover',
    category: 'High Availability',
    description: 'Manually trigger HA failover to secondary device',
    parameters: [
      { id: 'fortigate', label: 'FortiGate Primary IP/Hostname', type: 'text', required: true },
      { id: 'confirm', label: 'Confirm Failover', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      
      return `# FortiGate Trigger HA Failover
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Get current HA status first
    $StatusUri = "https://$FortiGate/api/v2/monitor/system/ha-peer"
    $HaStatus = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Current HA Status:" -ForegroundColor Yellow
    foreach ($Peer in $HaStatus.results) {
        Write-Host "  $($Peer.hostname): $($Peer.role)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Triggering HA failover..." -ForegroundColor Yellow
    
    $Body = @{
        "action" = "failover"
    } | ConvertTo-Json
    
    $FailoverUri = "https://$FortiGate/api/v2/monitor/system/ha/failover"
    Invoke-RestMethod -Uri $FailoverUri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host ""
    Write-Host "✓ HA failover triggered successfully!" -ForegroundColor Green
    Write-Host "  Note: It may take a few seconds for the failover to complete." -ForegroundColor Yellow
    Write-Host "  Note: Your connection to the primary device may be interrupted." -ForegroundColor Yellow
    
} catch {
    Write-Error "HA failover failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-ha-sync-checksum',
    name: 'Check HA Sync Status',
    category: 'High Availability',
    description: 'Verify configuration sync status between HA cluster members',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'forceSync', label: 'Force Sync if Out of Sync', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const forceSync = params.forceSync === true;
      
      return `# FortiGate Check HA Sync Status
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://$FortiGate/api/v2/monitor/system/ha-checksums"
    $Checksums = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "HA Configuration Sync Status:" -ForegroundColor Green
    Write-Host ""
    
    $InSync = $Checksums.results.is_in_sync
    $SyncColor = if ($InSync) { "Green" } else { "Red" }
    
    Write-Host "  Overall Sync Status: $(if ($InSync) { 'IN SYNC' } else { 'OUT OF SYNC' })" -ForegroundColor $SyncColor
    Write-Host ""
    
    if ($Checksums.results.checksums) {
        Write-Host "  Checksum Details:" -ForegroundColor Cyan
        foreach ($Item in $Checksums.results.checksums.PSObject.Properties) {
            $Match = $Item.Value.match
            $MatchColor = if ($Match) { "Green" } else { "Yellow" }
            Write-Host "    $($Item.Name): $(if ($Match) { 'Match' } else { 'Mismatch' })" -ForegroundColor $MatchColor
        }
    }
    
${forceSync ? `    
    if (-not $InSync) {
        Write-Host ""
        Write-Host "Forcing configuration sync..." -ForegroundColor Yellow
        
        $SyncBody = @{
            action = "sync"
        } | ConvertTo-Json
        
        $SyncUri = "https://$FortiGate/api/v2/monitor/system/ha/sync"
        Invoke-RestMethod -Uri $SyncUri -Method Post -Headers $Headers -Body $SyncBody -SkipCertificateCheck
        
        Write-Host "✓ Configuration sync initiated!" -ForegroundColor Green
    }` : ''}
    
} catch {
    Write-Error "Failed to check HA sync status: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-sync-config',
    name: 'Sync Configuration to Devices',
    category: 'High Availability',
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
    id: 'fortigate-get-session-stats',
    name: 'Retrieve Session Statistics',
    category: 'Logging & Monitoring',
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
    category: 'Logging & Monitoring',
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
    id: 'fortigate-get-traffic-logs',
    name: 'Get Traffic Logs',
    category: 'Logging & Monitoring',
    description: 'Retrieve and export firewall traffic logs',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'logType', label: 'Log Type', type: 'select', required: true, options: ['traffic', 'forward', 'local'], defaultValue: 'traffic' },
      { id: 'rows', label: 'Number of Rows', type: 'number', required: false, defaultValue: 100 },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\traffic-logs.json' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const logType = params.logType;
      const rows = params.rows || 100;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# FortiGate Get Traffic Logs
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/log/disk/${logType}?rows=${rows}"
    $Logs = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Traffic Logs Retrieved:" -ForegroundColor Green
    Write-Host "  Log Type: ${logType}" -ForegroundColor Cyan
    Write-Host "  Entries: $($Logs.results.Count)" -ForegroundColor Cyan
    
    # Display sample entries
    Write-Host ""
    Write-Host "Sample Entries:" -ForegroundColor Yellow
    foreach ($Log in $Logs.results | Select-Object -First 5) {
        Write-Host "  [$($Log.date) $($Log.time)] $($Log.srcip) -> $($Log.dstip):$($Log.dstport) ($($Log.action))" -ForegroundColor White
    }
    
    # Export to file
    $Logs | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "✓ Logs exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to get traffic logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-get-event-logs',
    name: 'Get Event Logs',
    category: 'Logging & Monitoring',
    description: 'Retrieve system event and security logs',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'logType', label: 'Event Type', type: 'select', required: true, options: ['event', 'system', 'user', 'vpn', 'ha'], defaultValue: 'event' },
      { id: 'rows', label: 'Number of Rows', type: 'number', required: false, defaultValue: 100 },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\event-logs.json' }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const logType = params.logType;
      const rows = params.rows || 100;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# FortiGate Get Event Logs
# Generated: ${new Date().toISOString()}

$FortiGate = "${fortigate}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter FortiGate API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "Bearer $ApiTokenPlain"
}

try {
    $Uri = "https://$FortiGate/api/v2/log/disk/event/${logType}?rows=${rows}"
    $Logs = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Event Logs Retrieved:" -ForegroundColor Green
    Write-Host "  Event Type: ${logType}" -ForegroundColor Cyan
    Write-Host "  Entries: $($Logs.results.Count)" -ForegroundColor Cyan
    
    # Display sample entries
    Write-Host ""
    Write-Host "Recent Events:" -ForegroundColor Yellow
    foreach ($Log in $Logs.results | Select-Object -First 10) {
        $SeverityColor = switch ($Log.level) {
            "critical" { "Red" }
            "error" { "Red" }
            "warning" { "Yellow" }
            default { "White" }
        }
        Write-Host "  [$($Log.date) $($Log.time)] [$($Log.level)] $($Log.msg)" -ForegroundColor $SeverityColor
    }
    
    # Export to file
    $Logs | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "✓ Logs exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to get event logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-configure-logging',
    name: 'Configure Logging Settings',
    category: 'Logging & Monitoring',
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
    id: 'fortigate-configure-fortianalyzer',
    name: 'Configure FortiAnalyzer Connection',
    category: 'Logging & Monitoring',
    description: 'Configure FortiAnalyzer integration for centralized logging and reporting',
    parameters: [
      { id: 'fortigate', label: 'FortiGate IP/Hostname', type: 'text', required: true },
      { id: 'fazServer', label: 'FortiAnalyzer Server IP', type: 'text', required: true, placeholder: '192.168.1.50' },
      { id: 'fazSerial', label: 'FortiAnalyzer Serial (optional)', type: 'text', required: false, placeholder: 'FAZ-SERIAL' },
      { id: 'encryptedConnection', label: 'Encrypted Connection', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const fortigate = escapePowerShellString(params.fortigate);
      const fazServer = escapePowerShellString(params.fazServer);
      const fazSerial = params.fazSerial ? escapePowerShellString(params.fazSerial) : '';
      const encryptedConnection = params.encryptedConnection !== false;
      
      return `# FortiGate Configure FortiAnalyzer Connection
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
        server = "${fazServer}"
        status = "enable"
        "enc-algorithm" = "${encryptedConnection ? 'high' : 'disable'}"
        "ssl-min-proto-version" = "TLSv1.2"
        "reliable" = "enable"
        "upload-option" = "realtime"
${fazSerial ? `        "serial" = @("${fazSerial}")` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$FortiGate/api/v2/cmdb/log.fortianalyzer/setting"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ FortiAnalyzer connection configured!" -ForegroundColor Green
    Write-Host "  Server: ${fazServer}" -ForegroundColor Cyan
    Write-Host "  Encryption: ${encryptedConnection ? 'Enabled' : 'Disabled'}" -ForegroundColor Cyan
${fazSerial ? `    Write-Host "  Serial: ${fazSerial}" -ForegroundColor Cyan` : ''}
    
    # Test connection
    $TestUri = "https://$FortiGate/api/v2/monitor/log/fortianalyzer/test-connectivity"
    $TestResult = Invoke-RestMethod -Uri $TestUri -Method Post -Headers $Headers -SkipCertificateCheck
    
    Write-Host ""
    if ($TestResult.results.status -eq "success") {
        Write-Host "✓ Connection test successful!" -ForegroundColor Green
    } else {
        Write-Host "Connection test failed: $($TestResult.results.message)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "FortiAnalyzer configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortigate-schedule-backup',
    name: 'Schedule Configuration Backup',
    category: 'Configuration Management',
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
    id: 'fortigate-manage-fortiguard-updates',
    name: 'Manage FortiGuard Updates',
    category: 'Security Profiles',
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
    category: 'Logging & Monitoring',
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
  },
  {
    id: 'fortimanager-get-managed-devices',
    name: 'Get FortiManager Managed Devices',
    category: 'FortiManager',
    description: 'List all devices managed by FortiManager',
    parameters: [
      { id: 'fortimanager', label: 'FortiManager IP/Hostname', type: 'text', required: true },
      { id: 'adom', label: 'ADOM Name', type: 'text', required: false, placeholder: 'root', defaultValue: 'root' },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\managed-devices.json' }
    ],
    scriptTemplate: (params) => {
      const fortimanager = escapePowerShellString(params.fortimanager);
      const adom = escapePowerShellString(params.adom || 'root');
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# FortiManager Get Managed Devices
# Generated: ${new Date().toISOString()}

$FortiManager = "${fortimanager}"
$ADOM = "${adom}"

$Credentials = Get-Credential -Message "Enter FortiManager credentials"
$Username = $Credentials.UserName
$Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Credentials.Password))

try {
    # Login to FortiManager
    $LoginBody = @{
        method = "exec"
        params = @(@{
            url = "/sys/login/user"
            data = @{
                user = $Username
                passwd = $Password
            }
        })
        id = 1
    } | ConvertTo-Json -Depth 10
    
    $LoginResponse = Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $LoginBody -ContentType "application/json" -SkipCertificateCheck
    $SessionId = $LoginResponse.session
    
    if (-not $SessionId) {
        throw "Failed to login to FortiManager"
    }
    
    Write-Host "✓ Connected to FortiManager" -ForegroundColor Green
    
    # Get managed devices
    $DevicesBody = @{
        method = "get"
        params = @(@{
            url = "/dvmdb/adom/$ADOM/device"
        })
        session = $SessionId
        id = 2
    } | ConvertTo-Json -Depth 10
    
    $DevicesResponse = Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $DevicesBody -ContentType "application/json" -SkipCertificateCheck
    
    Write-Host ""
    Write-Host "Managed Devices in ADOM '$ADOM':" -ForegroundColor Green
    Write-Host ""
    
    foreach ($Device in $DevicesResponse.result.data) {
        $StatusColor = switch ($Device.conn_status) {
            1 { "Green" }
            0 { "Red" }
            default { "Yellow" }
        }
        
        Write-Host "  Device: $($Device.name)" -ForegroundColor Cyan
        Write-Host "    Serial: $($Device.sn)" -ForegroundColor White
        Write-Host "    IP: $($Device.ip)" -ForegroundColor White
        Write-Host "    Version: $($Device.'os_ver') build $($Device.build)" -ForegroundColor White
        Write-Host "    Connection: $(if ($Device.conn_status -eq 1) { 'Connected' } else { 'Disconnected' })" -ForegroundColor $StatusColor
        Write-Host ""
    }
    
${exportPath ? `    
    $DevicesResponse.result.data | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host "✓ Device list exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
    # Logout
    $LogoutBody = @{
        method = "exec"
        params = @(@{
            url = "/sys/logout"
        })
        session = $SessionId
        id = 3
    } | ConvertTo-Json -Depth 10
    
    Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $LogoutBody -ContentType "application/json" -SkipCertificateCheck | Out-Null
    
} catch {
    Write-Error "FortiManager operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'fortimanager-deploy-template',
    name: 'Deploy Configuration Template',
    category: 'FortiManager',
    description: 'Deploy a configuration template to managed devices',
    parameters: [
      { id: 'fortimanager', label: 'FortiManager IP/Hostname', type: 'text', required: true },
      { id: 'adom', label: 'ADOM Name', type: 'text', required: true, placeholder: 'root' },
      { id: 'templateName', label: 'Template Name', type: 'text', required: true, placeholder: 'Standard-Security-Policy' },
      { id: 'targetDevices', label: 'Target Devices (comma-separated)', type: 'textarea', required: true, placeholder: 'FG-01, FG-02, FG-03' }
    ],
    scriptTemplate: (params) => {
      const fortimanager = escapePowerShellString(params.fortimanager);
      const adom = escapePowerShellString(params.adom);
      const templateName = escapePowerShellString(params.templateName);
      const targetDevices = (params.targetDevices as string).split(',').map((d: string) => d.trim());
      
      return `# FortiManager Deploy Configuration Template
# Generated: ${new Date().toISOString()}

$FortiManager = "${fortimanager}"
$ADOM = "${adom}"
$TemplateName = "${templateName}"
$TargetDevices = @(${targetDevices.map(d => `"${escapePowerShellString(d)}"`).join(', ')})

$Credentials = Get-Credential -Message "Enter FortiManager credentials"
$Username = $Credentials.UserName
$Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Credentials.Password))

try {
    # Login to FortiManager
    $LoginBody = @{
        method = "exec"
        params = @(@{
            url = "/sys/login/user"
            data = @{
                user = $Username
                passwd = $Password
            }
        })
        id = 1
    } | ConvertTo-Json -Depth 10
    
    $LoginResponse = Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $LoginBody -ContentType "application/json" -SkipCertificateCheck
    $SessionId = $LoginResponse.session
    
    if (-not $SessionId) {
        throw "Failed to login to FortiManager"
    }
    
    Write-Host "✓ Connected to FortiManager" -ForegroundColor Green
    
    # Install policy package to devices
    $Scope = $TargetDevices | ForEach-Object {
        @{
            name = $_
            vdom = "root"
        }
    }
    
    $InstallBody = @{
        method = "exec"
        params = @(@{
            url = "/securityconsole/install/package"
            data = @{
                adom = $ADOM
                pkg = $TemplateName
                scope = $Scope
            }
        })
        session = $SessionId
        id = 2
    } | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "Deploying template '$TemplateName' to devices..." -ForegroundColor Yellow
    
    $InstallResponse = Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $InstallBody -ContentType "application/json" -SkipCertificateCheck
    
    $TaskId = $InstallResponse.result.data.task
    
    if ($TaskId) {
        Write-Host "  Task ID: $TaskId" -ForegroundColor Cyan
        
        # Monitor task progress
        do {
            Start-Sleep -Seconds 3
            
            $TaskBody = @{
                method = "get"
                params = @(@{
                    url = "/task/task/$TaskId"
                })
                session = $SessionId
                id = 3
            } | ConvertTo-Json -Depth 10
            
            $TaskStatus = Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $TaskBody -ContentType "application/json" -SkipCertificateCheck
            
            $Percent = $TaskStatus.result.data.percent
            Write-Host "  Progress: $Percent%" -ForegroundColor White
            
        } while ($TaskStatus.result.data.state -eq "running")
        
        if ($TaskStatus.result.data.state -eq "done") {
            Write-Host ""
            Write-Host "✓ Template deployment completed successfully!" -ForegroundColor Green
            Write-Host "  Template: $TemplateName" -ForegroundColor Cyan
            Write-Host "  Devices: ${targetDevices.join(', ')}" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "Template deployment finished with status: $($TaskStatus.result.data.state)" -ForegroundColor Yellow
        }
    }
    
    # Logout
    $LogoutBody = @{
        method = "exec"
        params = @(@{
            url = "/sys/logout"
        })
        session = $SessionId
        id = 4
    } | ConvertTo-Json -Depth 10
    
    Invoke-RestMethod -Uri "https://$FortiManager/jsonrpc" -Method Post -Body $LogoutBody -ContentType "application/json" -SkipCertificateCheck | Out-Null
    
} catch {
    Write-Error "FortiManager template deployment failed: $_"
}`;
    },
    isPremium: true
  }
];
