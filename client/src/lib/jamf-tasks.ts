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
  }
];
