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
  }
];
