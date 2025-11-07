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
  },
  {
    id: 'sf-manage-users',
    name: 'Manage Users and Profiles',
    category: 'Common Admin Tasks',
    description: 'Create and manage Salesforce users and profiles',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true, placeholder: '00e...' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const email = escapePowerShellString(params.email);
      const username = escapePowerShellString(params.username);
      const profileId = escapePowerShellString(params.profileId);
      
      return `# Salesforce Manage Users and Profiles
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        FirstName = "${firstName}"
        LastName = "${lastName}"
        Email = "${email}"
        Username = "${username}"
        ProfileId = "${profileId}"
        Alias = "${firstName.substring(0, Math.min(4, firstName.length))}"
        TimeZoneSidKey = "America/New_York"
        LocaleSidKey = "en_US"
        EmailEncodingKey = "UTF-8"
        LanguageLocaleKey = "en_US"
    } | ConvertTo-Json
    
    $Uri = "$InstanceUrl/services/data/v57.0/sobjects/User"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ User created: ${firstName} ${lastName}" -ForegroundColor Green
    Write-Host "  Username: ${username}" -ForegroundColor Cyan
    Write-Host "  User ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "User creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-manage-permissions',
    name: 'Manage User Permissions',
    category: 'Common Admin Tasks',
    description: 'Assign or modify Salesforce user permissions',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' },
      { id: 'permissionSetId', label: 'Permission Set ID', type: 'text', required: true, placeholder: '0PS...' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Assign', 'Remove'], defaultValue: 'Assign' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      const permissionSetId = escapePowerShellString(params.permissionSetId);
      const action = params.action;
      
      return `# Salesforce Manage User Permissions
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    ${action === 'Assign' ? `
    $Body = @{
        PermissionSetId = "${permissionSetId}"
        AssigneeId = "${userId}"
    } | ConvertTo-Json
    
    $Uri = "$InstanceUrl/services/data/v57.0/sobjects/PermissionSetAssignment"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Permission set assigned" -ForegroundColor Green
    Write-Host "  User ID: ${userId}" -ForegroundColor Cyan
    Write-Host "  Permission Set ID: ${permissionSetId}" -ForegroundColor Cyan
    ` : `
    # Query for the assignment ID
    $Query = "SELECT Id FROM PermissionSetAssignment WHERE AssigneeId = '${userId}' AND PermissionSetId = '${permissionSetId}'"
    $EncodedQuery = [uri]::EscapeDataString($Query)
    $QueryUri = "$InstanceUrl/services/data/v57.0/query?q=$EncodedQuery"
    $QueryResponse = Invoke-RestMethod -Uri $QueryUri -Method Get -Headers $Headers
    
    if ($QueryResponse.records.Count -gt 0) {
        $AssignmentId = $QueryResponse.records[0].Id
        $Uri = "$InstanceUrl/services/data/v57.0/sobjects/PermissionSetAssignment/$AssignmentId"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
        
        Write-Host "✓ Permission set removed" -ForegroundColor Green
    } else {
        Write-Host "No assignment found" -ForegroundColor Yellow
    }
    `}
    
} catch {
    Write-Error "Permission management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-create-records',
    name: 'Create and Modify Records',
    category: 'Common Admin Tasks',
    description: 'Create or update Salesforce records',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'objectType', label: 'Object Type', type: 'select', required: true, options: ['Account', 'Contact', 'Lead', 'Opportunity'], defaultValue: 'Account' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Update'], defaultValue: 'Create' },
      { id: 'recordId', label: 'Record ID (for Update)', type: 'text', required: false },
      { id: 'name', label: 'Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectType = params.objectType;
      const action = params.action;
      const recordId = escapePowerShellString(params.recordId || '');
      const name = escapePowerShellString(params.name);
      
      return `# Salesforce Create and Modify Records
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    ${action === 'Create' ? `
    $Body = @{
        Name = "${name}"
    } | ConvertTo-Json
    
    $Uri = "$InstanceUrl/services/data/v57.0/sobjects/${objectType}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ ${objectType} created: ${name}" -ForegroundColor Green
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    ` : `
    $Body = @{
        Name = "${name}"
    } | ConvertTo-Json
    
    $Uri = "$InstanceUrl/services/data/v57.0/sobjects/${objectType}/${recordId}"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "✓ ${objectType} updated: ${name}" -ForegroundColor Green
    Write-Host "  ID: ${recordId}" -ForegroundColor Cyan
    `}
    
} catch {
    Write-Error "Record operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-data-sync',
    name: 'Automate Data Sync Between Systems',
    category: 'Common Admin Tasks',
    description: 'Sync data between Salesforce and external systems',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'objectType', label: 'Object Type', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'syncField', label: 'Sync Field', type: 'text', required: true, placeholder: 'LastModifiedDate' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectType = escapePowerShellString(params.objectType);
      const exportPath = escapePowerShellString(params.exportPath);
      const syncField = escapePowerShellString(params.syncField);
      
      return `# Salesforce Automate Data Sync
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Accept" = "application/json"
}

try {
    # Get last sync timestamp (or use a date range)
    $LastSync = (Get-Date).AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $Query = "SELECT Id, Name, ${syncField} FROM ${objectType} WHERE ${syncField} >= $LastSync"
    $EncodedQuery = [uri]::EscapeDataString($Query)
    
    $Uri = "$InstanceUrl/services/data/v57.0/query?q=$EncodedQuery"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Records = $Response.records | Select-Object -Property * -ExcludeProperty attributes
    
    $Records | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Data synced: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Records: $($Records.Count)" -ForegroundColor Cyan
    Write-Host "  Object Type: ${objectType}" -ForegroundColor Cyan
    Write-Host "  Last Sync: $LastSync" -ForegroundColor Cyan
    
} catch {
    Write-Error "Data sync failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-compliance-reports',
    name: 'Export Reports for Compliance',
    category: 'Common Admin Tasks',
    description: 'Export Salesforce compliance reports',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'reportId', label: 'Report ID', type: 'text', required: true, placeholder: '00O...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const reportId = escapePowerShellString(params.reportId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Compliance Reports
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Accept" = "application/json"
}

try {
    # Run the report
    $Uri = "$InstanceUrl/services/data/v57.0/analytics/reports/${reportId}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    # Extract report data
    $ReportData = $Response.factMap.'T!T'.rows | ForEach-Object {
        $Row = $_
        $DataCells = $Row.dataCells
        
        [PSCustomObject]@{
            Data = ($DataCells | ForEach-Object { $_.label }) -join '; '
        }
    }
    
    $ReportData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Compliance report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Report ID: ${reportId}" -ForegroundColor Cyan
    Write-Host "  Total Rows: $($ReportData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-manage-accounts-contacts',
    name: 'Manage Accounts and Contacts',
    category: 'Common Admin Tasks',
    description: 'Bulk operations on Salesforce accounts and contacts',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'csvPath', label: 'CSV File Path (with Name column)', type: 'path', required: true },
      { id: 'objectType', label: 'Object Type', type: 'select', required: true, options: ['Account', 'Contact'], defaultValue: 'Account' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const csvPath = escapePowerShellString(params.csvPath);
      const objectType = params.objectType;
      
      return `# Salesforce Manage Accounts and Contacts
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    $Records = Import-Csv -Path "${csvPath}"
    
    foreach ($Record in $Records) {
        $Body = @{
            Name = $Record.Name
        } | ConvertTo-Json
        
        $Uri = "$InstanceUrl/services/data/v57.0/sobjects/${objectType}"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ ${objectType} created: $($Record.Name)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk operation completed!" -ForegroundColor Green
    Write-Host "  Total Records: $($Records.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Bulk operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-security-settings',
    name: 'Configure Security Settings',
    category: 'Common Admin Tasks',
    description: 'Configure Salesforce security and login policies',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true, placeholder: '00e...' },
      { id: 'ipRange', label: 'Allowed IP Range (CIDR)', type: 'text', required: true, placeholder: '192.168.1.0/24' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const profileId = escapePowerShellString(params.profileId);
      const ipRange = escapePowerShellString(params.ipRange);
      
      return `# Salesforce Configure Security Settings
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    # Get profile login IP ranges (this requires Tooling API)
    $Body = @{
        FullName = "LoginIpRange"
        Metadata = @{
            startAddress = "${ipRange.split('/')[0]}"
            endAddress = "${ipRange.split('/')[0]}"
        }
    } | ConvertTo-Json -Depth 10
    
    Write-Host "Configuring IP restrictions..." -ForegroundColor Cyan
    Write-Host "  Profile ID: ${profileId}" -ForegroundColor Yellow
    Write-Host "  IP Range: ${ipRange}" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Note: IP range configuration requires Metadata API." -ForegroundColor Yellow
    Write-Host "Use Salesforce Setup UI for detailed security configuration." -ForegroundColor Yellow
    
    Write-Host "✓ Security settings prepared" -ForegroundColor Green
    
} catch {
    Write-Error "Security configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-audit-logs',
    name: 'Generate Audit Logs',
    category: 'Common Admin Tasks',
    description: 'Export Salesforce audit trail and setup audit logs',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Generate Audit Logs
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token"

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Accept" = "application/json"
}

try {
    # Query SetupAuditTrail
    $Query = "SELECT Id, Action, Section, CreatedDate, CreatedBy.Name, Display FROM SetupAuditTrail WHERE CreatedDate >= ${startDate}T00:00:00Z AND CreatedDate <= ${endDate}T23:59:59Z ORDER BY CreatedDate DESC"
    $EncodedQuery = [uri]::EscapeDataString($Query)
    
    $Uri = "$InstanceUrl/services/data/v57.0/query?q=$EncodedQuery"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $AuditLogs = $Response.records | Select-Object \`
        @{N='Date';E={$_.CreatedDate}},
        @{N='User';E={$_.CreatedBy.Name}},
        @{N='Action';E={$_.Action}},
        @{N='Section';E={$_.Section}},
        @{N='Display';E={$_.Display}}
    
    $AuditLogs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Audit logs exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Entries: $($AuditLogs.Count)" -ForegroundColor Cyan
    Write-Host "  Date Range: ${startDate} to ${endDate}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Audit log export failed: $_"
}`;
    },
    isPremium: true
  }
];
