import { escapePowerShellString } from './powershell-utils';

export interface SalesforceTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface SalesforceTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: SalesforceTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const salesforceTasks: SalesforceTask[] = [
  {
    id: 'sf-bulk-create-contacts',
    name: 'Bulk Create Contacts',
    category: 'Bulk Operations',
    description: 'Create multiple Salesforce contacts',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'contacts', label: 'Contacts (FirstName LastName Email, one per line)', type: 'textarea', required: true, placeholder: 'John Doe john.doe@company.com\nJane Smith jane.smith@company.com' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const contacts = (params.contacts as string).split('\n').filter((c: string) => c.trim());
      
      return `# Salesforce Bulk Create Contacts
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

$Contacts = @(
${contacts.map(c => {
  const parts = c.trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1, -1).join(' ') || 'Unknown';
  const email = parts[parts.length - 1] || '';
  return `    @{FirstName="${escapePowerShellString(firstName)}"; LastName="${escapePowerShellString(lastName)}"; Email="${escapePowerShellString(email)}"}`;
}).join(',\n')}
)

try {
    foreach ($Contact in $Contacts) {
        $Body = @{
            FirstName = $Contact.FirstName
            LastName = $Contact.LastName
            Email = $Contact.Email
        } | ConvertTo-Json
        
        $Uri = "$InstanceUrl/services/data/v57.0/sobjects/Contact"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ Contact created: $($Contact.FirstName) $($Contact.LastName)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk contact creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'sf-export-accounts',
    name: 'Export Accounts',
    category: 'Reporting',
    description: 'Export Salesforce accounts to CSV',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SF-Accounts.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Accounts
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, Industry, BillingCity, BillingState, Phone, Website FROM Account"
    $EncodedQuery = [uri]::EscapeDataString($Query)
    
    $Uri = "$InstanceUrl/services/data/v57.0/query?q=$EncodedQuery"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Accounts = $Response.records | Select-Object Id, Name, Industry, BillingCity, BillingState, Phone, Website
    
    $Accounts | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Accounts exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Accounts: $($Accounts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
