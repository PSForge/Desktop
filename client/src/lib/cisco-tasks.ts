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
  }
];
