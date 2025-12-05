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
  // ==================== USER MANAGEMENT ====================
  {
    id: 'sf-provision-user',
    name: 'Provision New User',
    category: 'User Management',
    description: 'Create a new Salesforce user with profile and role assignment',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'user@company.salesforce.com' },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true, placeholder: '00e...' },
      { id: 'roleId', label: 'Role ID (optional)', type: 'text', required: false, placeholder: '00E...' },
      { id: 'timezone', label: 'Timezone', type: 'select', required: true, options: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'], defaultValue: 'America/New_York' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const email = escapePowerShellString(params.email);
      const username = escapePowerShellString(params.username);
      const profileId = escapePowerShellString(params.profileId);
      const roleId = escapePowerShellString(params.roleId || '');
      const timezone = escapePowerShellString(params.timezone);
      
      const roleAssignment = roleId ? `    $UserData.UserRoleId = "${roleId}"` : '    # No role specified';
      
      return `# Salesforce Provision New User
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $UserData = @{
        FirstName = "${firstName}"
        LastName = "${lastName}"
        Email = "${email}"
        Username = "${username}"
        ProfileId = "${profileId}"
        Alias = "${firstName}".Substring(0, [Math]::Min(4, "${firstName}".Length)) + "${lastName}".Substring(0, 1)
        TimeZoneSidKey = "${timezone}"
        LocaleSidKey = "en_US"
        EmailEncodingKey = "UTF-8"
        LanguageLocaleKey = "en_US"
    }
    
${roleAssignment}
    
    $Body = $UserData | ConvertTo-Json
    
    $Uri = "$InstanceUrl/services/data/v59.0/sobjects/User"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "User provisioned successfully" -ForegroundColor Green
    Write-Host "  Name: ${firstName} ${lastName}" -ForegroundColor Cyan
    Write-Host "  Username: ${username}" -ForegroundColor Cyan
    Write-Host "  User ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "User provisioning failed: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) {
        Write-Error "Details: $($_.ErrorDetails.Message)"
    }
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-deactivate-user',
    name: 'Deactivate User',
    category: 'User Management',
    description: 'Deactivate a Salesforce user account',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' },
      { id: 'freezeUser', label: 'Freeze User First', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      const freezeUser = params.freezeUser !== false;
      
      const freezeSection = freezeUser ? `
    # Freeze user first
    $FreezeUri = "$InstanceUrl/services/data/v59.0/sobjects/UserLogin/$UserId"
    $FreezeBody = @{ IsFrozen = $true } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $FreezeUri -Method Patch -Headers $Headers -Body $FreezeBody
        Write-Host "  User frozen" -ForegroundColor Yellow
    } catch {
        Write-Host "  Could not freeze user (may not have UserLogin record)" -ForegroundColor Yellow
    }` : '    # Freeze step skipped';
      
      return `# Salesforce Deactivate User
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Get user details first
    $UserUri = "$InstanceUrl/services/data/v59.0/sobjects/User/$UserId"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    Write-Host "Deactivating user: $($User.Name)" -ForegroundColor Yellow
${freezeSection}
    
    # Deactivate user
    $DeactivateBody = @{ IsActive = $false } | ConvertTo-Json
    Invoke-RestMethod -Uri $UserUri -Method Patch -Headers $Headers -Body $DeactivateBody
    
    Write-Host "User deactivated successfully" -ForegroundColor Green
    Write-Host "  User: $($User.Name)" -ForegroundColor Cyan
    Write-Host "  Username: $($User.Username)" -ForegroundColor Cyan
    
} catch {
    Write-Error "User deactivation failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-assign-permission-set',
    name: 'Assign Permission Set',
    category: 'User Management',
    description: 'Assign a permission set to a user',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' },
      { id: 'permissionSetId', label: 'Permission Set ID', type: 'text', required: true, placeholder: '0PS...' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      const permissionSetId = escapePowerShellString(params.permissionSetId);
      
      return `# Salesforce Assign Permission Set
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$PermissionSetId = "${permissionSetId}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Check if already assigned
    $Query = "SELECT Id FROM PermissionSetAssignment WHERE AssigneeId = '$UserId' AND PermissionSetId = '$PermissionSetId'"
    $CheckUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    $Existing = Invoke-RestMethod -Uri $CheckUri -Method Get -Headers $Headers
    
    if ($Existing.totalSize -gt 0) {
        Write-Host "Permission set already assigned to user" -ForegroundColor Yellow
        exit
    }
    
    # Assign permission set
    $Body = @{
        AssigneeId = $UserId
        PermissionSetId = $PermissionSetId
    } | ConvertTo-Json
    
    $Uri = "$InstanceUrl/services/data/v59.0/sobjects/PermissionSetAssignment"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Permission set assigned successfully" -ForegroundColor Green
    Write-Host "  Assignment ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Permission set assignment failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-bulk-user-export',
    name: 'Export All Users',
    category: 'User Management',
    description: 'Export all Salesforce users to CSV for auditing',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\users.csv' },
      { id: 'activeOnly', label: 'Active Users Only', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      const activeOnly = params.activeOnly !== false;
      
      const whereClause = activeOnly ? "WHERE IsActive = true" : "";
      
      return `# Salesforce Export All Users
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, Username, Email, Profile.Name, UserRole.Name, IsActive, LastLoginDate, CreatedDate FROM User ${whereClause} ORDER BY Name"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, Name, Username, Email, 
        @{N='Profile';E={$_.Profile.Name}}, 
        @{N='Role';E={$_.UserRole.Name}}, 
        IsActive, LastLoginDate, CreatedDate
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Users exported successfully" -ForegroundColor Green
    Write-Host "  Total Users: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "User export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-reset-user-password',
    name: 'Reset User Password',
    category: 'User Management',
    description: 'Trigger a password reset email for a user',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      
      return `# Salesforce Reset User Password
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Get user info first
    $UserUri = "$InstanceUrl/services/data/v59.0/sobjects/User/$UserId"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    # Reset password
    $ResetUri = "$InstanceUrl/services/data/v59.0/sobjects/User/$UserId/password"
    Invoke-RestMethod -Uri $ResetUri -Method Delete -Headers $Headers
    
    Write-Host "Password reset email sent" -ForegroundColor Green
    Write-Host "  User: $($User.Name)" -ForegroundColor Cyan
    Write-Host "  Email: $($User.Email)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Password reset failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-update-user-profile',
    name: 'Update User Profile',
    category: 'User Management',
    description: 'Change a user profile assignment',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' },
      { id: 'newProfileId', label: 'New Profile ID', type: 'text', required: true, placeholder: '00e...' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      const newProfileId = escapePowerShellString(params.newProfileId);
      
      return `# Salesforce Update User Profile
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$NewProfileId = "${newProfileId}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Get current user info
    $UserUri = "$InstanceUrl/services/data/v59.0/sobjects/User/$UserId"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    $OldProfileId = $User.ProfileId
    
    # Update profile
    $Body = @{ ProfileId = $NewProfileId } | ConvertTo-Json
    Invoke-RestMethod -Uri $UserUri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "User profile updated successfully" -ForegroundColor Green
    Write-Host "  User: $($User.Name)" -ForegroundColor Cyan
    Write-Host "  Old Profile ID: $OldProfileId" -ForegroundColor Yellow
    Write-Host "  New Profile ID: $NewProfileId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Profile update failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== DATA MANAGEMENT ====================
  {
    id: 'sf-export-object-data',
    name: 'Export Object Data',
    category: 'Data Management',
    description: 'Export all records from a Salesforce object to CSV',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'fields', label: 'Fields (comma-separated)', type: 'text', required: true, placeholder: 'Id, Name, CreatedDate' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Exports\\data.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const fields = escapePowerShellString(params.fields);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Object Data
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$Fields = "${fields}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT $Fields FROM $ObjectName"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    $BatchCount = 0
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $BatchCount++
        Write-Host "  Fetched batch $BatchCount ($($AllRecords.Count) total records)" -ForegroundColor Yellow
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Data exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Records: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Data export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-bulk-data-import',
    name: 'Bulk Data Import',
    category: 'Data Management',
    description: 'Import records from CSV using Bulk API 2.0',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Data\\import.csv' },
      { id: 'operation', label: 'Operation', type: 'select', required: true, options: ['insert', 'update', 'upsert'], defaultValue: 'insert' },
      { id: 'externalIdField', label: 'External ID Field (for upsert)', type: 'text', required: false, placeholder: 'External_Id__c' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const csvPath = escapePowerShellString(params.csvPath);
      const operation = escapePowerShellString(params.operation);
      const externalIdField = escapePowerShellString(params.externalIdField || '');
      
      const extIdConfig = externalIdField ? `        externalIdFieldName = "${externalIdField}"` : '        # No external ID field';
      
      return `# Salesforce Bulk Data Import
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$CsvPath = "${csvPath}"
$Operation = "${operation}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Create Bulk API job
    $JobBody = @{
        object = $ObjectName
        operation = $Operation
        contentType = "CSV"
        lineEnding = "CRLF"
${extIdConfig}
    }
    
    $JobUri = "$InstanceUrl/services/data/v59.0/jobs/ingest"
    $Job = Invoke-RestMethod -Uri $JobUri -Method Post -Headers $Headers -Body ($JobBody | ConvertTo-Json)
    Write-Host "Job created: $($Job.id)" -ForegroundColor Yellow
    
    # Upload CSV data
    $CsvContent = Get-Content -Path $CsvPath -Raw
    $UploadHeaders = @{
        "Authorization" = "Bearer $AccessTokenPlain"
        "Content-Type" = "text/csv"
    }
    $UploadUri = "$InstanceUrl/services/data/v59.0/jobs/ingest/$($Job.id)/batches"
    Invoke-RestMethod -Uri $UploadUri -Method Put -Headers $UploadHeaders -Body $CsvContent
    Write-Host "CSV data uploaded" -ForegroundColor Yellow
    
    # Close job to start processing
    $CloseBody = @{ state = "UploadComplete" } | ConvertTo-Json
    $CloseUri = "$InstanceUrl/services/data/v59.0/jobs/ingest/$($Job.id)"
    Invoke-RestMethod -Uri $CloseUri -Method Patch -Headers $Headers -Body $CloseBody
    
    # Poll for completion
    do {
        Start-Sleep -Seconds 5
        $StatusUri = "$InstanceUrl/services/data/v59.0/jobs/ingest/$($Job.id)"
        $Status = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers
        Write-Host "  Status: $($Status.state) - Processed: $($Status.numberRecordsProcessed)" -ForegroundColor Yellow
    } while ($Status.state -notin @("JobComplete", "Failed", "Aborted"))
    
    Write-Host ""
    Write-Host "Bulk import completed" -ForegroundColor Green
    Write-Host "  Records Processed: $($Status.numberRecordsProcessed)" -ForegroundColor Cyan
    Write-Host "  Records Failed: $($Status.numberRecordsFailed)" -ForegroundColor $(if ($Status.numberRecordsFailed -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Bulk import failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-bulk-delete',
    name: 'Bulk Delete Records',
    category: 'Data Management',
    description: 'Delete multiple records using Bulk API',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'csvPath', label: 'CSV with Record IDs', type: 'path', required: true, placeholder: 'C:\\Data\\delete-ids.csv' },
      { id: 'hardDelete', label: 'Hard Delete (bypass recycle bin)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const csvPath = escapePowerShellString(params.csvPath);
      const hardDelete = params.hardDelete === true;
      
      const operationType = hardDelete ? 'hardDelete' : 'delete';
      
      return `# Salesforce Bulk Delete Records
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$CsvPath = "${csvPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $Records = Import-Csv -Path $CsvPath
    $RecordCount = ($Records | Measure-Object).Count
    
    Write-Host "Found $RecordCount records to delete" -ForegroundColor Yellow
    Write-Host "Operation: ${operationType}" -ForegroundColor Yellow
    
    $Confirm = Read-Host "Type 'DELETE' to confirm"
    if ($Confirm -ne 'DELETE') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    
    # Create Bulk API delete job
    $JobBody = @{
        object = $ObjectName
        operation = "${operationType}"
        contentType = "CSV"
        lineEnding = "CRLF"
    }
    
    $JobUri = "$InstanceUrl/services/data/v59.0/jobs/ingest"
    $Job = Invoke-RestMethod -Uri $JobUri -Method Post -Headers $Headers -Body ($JobBody | ConvertTo-Json)
    
    # Upload CSV
    $CsvContent = Get-Content -Path $CsvPath -Raw
    $UploadHeaders = @{
        "Authorization" = "Bearer $AccessTokenPlain"
        "Content-Type" = "text/csv"
    }
    $UploadUri = "$InstanceUrl/services/data/v59.0/jobs/ingest/$($Job.id)/batches"
    Invoke-RestMethod -Uri $UploadUri -Method Put -Headers $UploadHeaders -Body $CsvContent
    
    # Close job
    $CloseBody = @{ state = "UploadComplete" } | ConvertTo-Json
    $CloseUri = "$InstanceUrl/services/data/v59.0/jobs/ingest/$($Job.id)"
    Invoke-RestMethod -Uri $CloseUri -Method Patch -Headers $Headers -Body $CloseBody
    
    # Poll for completion
    do {
        Start-Sleep -Seconds 5
        $StatusUri = "$InstanceUrl/services/data/v59.0/jobs/ingest/$($Job.id)"
        $Status = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers
        Write-Host "  Status: $($Status.state) - Processed: $($Status.numberRecordsProcessed)" -ForegroundColor Yellow
    } while ($Status.state -notin @("JobComplete", "Failed", "Aborted"))
    
    Write-Host ""
    Write-Host "Bulk delete completed" -ForegroundColor Green
    Write-Host "  Records Deleted: $($Status.numberRecordsProcessed)" -ForegroundColor Cyan
    Write-Host "  Records Failed: $($Status.numberRecordsFailed)" -ForegroundColor $(if ($Status.numberRecordsFailed -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Bulk delete failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-find-duplicates',
    name: 'Find Duplicate Records',
    category: 'Data Management',
    description: 'Identify potential duplicate records based on field matching',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Lead' },
      { id: 'matchField', label: 'Field to Match On', type: 'text', required: true, placeholder: 'Email' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\duplicates.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const matchField = escapePowerShellString(params.matchField);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Find Duplicate Records
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$MatchField = "${matchField}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Searching for duplicates based on: $MatchField" -ForegroundColor Yellow
    
    $Query = "SELECT Id, Name, $MatchField, CreatedDate FROM $ObjectName WHERE $MatchField != null ORDER BY $MatchField, CreatedDate"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    # Group by match field and find duplicates
    $Grouped = $AllRecords | Group-Object -Property $MatchField | Where-Object { $_.Count -gt 1 }
    
    $Duplicates = @()
    foreach ($Group in $Grouped) {
        foreach ($Record in $Group.Group) {
            $Duplicates += [PSCustomObject]@{
                Id = $Record.Id
                Name = $Record.Name
                MatchValue = $Record.$MatchField
                CreatedDate = $Record.CreatedDate
                DuplicateCount = $Group.Count
            }
        }
    }
    
    $Duplicates | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Duplicate analysis completed" -ForegroundColor Green
    Write-Host "  Total Records Analyzed: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Duplicate Groups Found: $($Grouped.Count)" -ForegroundColor Cyan
    Write-Host "  Total Duplicate Records: $($Duplicates.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Duplicate search failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-backup-metadata',
    name: 'Backup Metadata',
    category: 'Data Management',
    description: 'Export metadata backup using SFDX CLI',
    parameters: [
      { id: 'targetOrg', label: 'Target Org Alias', type: 'text', required: true, placeholder: 'myOrg' },
      { id: 'outputDir', label: 'Output Directory', type: 'path', required: true, placeholder: 'C:\\Backups\\metadata' },
      { id: 'metadataTypes', label: 'Metadata Types', type: 'text', required: true, placeholder: 'ApexClass,ApexTrigger,CustomObject', description: 'Comma-separated list of metadata types' }
    ],
    scriptTemplate: (params) => {
      const targetOrg = escapePowerShellString(params.targetOrg);
      const outputDir = escapePowerShellString(params.outputDir);
      const metadataTypes = escapePowerShellString(params.metadataTypes);
      
      return `# Salesforce Backup Metadata
# Generated: ${new Date().toISOString()}

$TargetOrg = "${targetOrg}"
$OutputDir = "${outputDir}"
$MetadataTypes = "${metadataTypes}"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = "$OutputDir\\backup_$Timestamp"

try {
    # Ensure output directory exists
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    Write-Host "Starting metadata backup..." -ForegroundColor Yellow
    Write-Host "  Target Org: $TargetOrg" -ForegroundColor Cyan
    Write-Host "  Backup Directory: $BackupDir" -ForegroundColor Cyan
    
    # Retrieve metadata
    $TypesArray = $MetadataTypes -split ','
    foreach ($Type in $TypesArray) {
        $Type = $Type.Trim()
        Write-Host "  Retrieving: $Type" -ForegroundColor Yellow
        sfdx force:source:retrieve -m "$Type" -u $TargetOrg -r $BackupDir 2>&1 | Out-Null
    }
    
    # Create manifest
    $Manifest = @{
        BackupDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        TargetOrg = $TargetOrg
        MetadataTypes = $TypesArray
    }
    $Manifest | ConvertTo-Json | Out-File "$BackupDir\\manifest.json"
    
    Write-Host ""
    Write-Host "Metadata backup completed" -ForegroundColor Green
    Write-Host "  Backup Location: $BackupDir" -ForegroundColor Cyan
    
} catch {
    Write-Error "Metadata backup failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-recycle-bin-empty',
    name: 'Empty Recycle Bin',
    category: 'Data Management',
    description: 'Permanently delete all records from the recycle bin',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      
      return `# Salesforce Empty Recycle Bin
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    Write-Host "WARNING: This will permanently delete all records in the recycle bin!" -ForegroundColor Red
    $Confirm = Read-Host "Type 'EMPTY' to confirm"
    if ($Confirm -ne 'EMPTY') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    
    # Use the emptyRecycleBin REST API
    $Uri = "$InstanceUrl/services/data/v59.0/sobjects/recycle-bin/empty"
    $Response = Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "Recycle bin emptied successfully" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to empty recycle bin: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== SECURITY ====================
  {
    id: 'sf-login-history',
    name: 'Export Login History',
    category: 'Security',
    description: 'Export user login history for security auditing',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\login-history.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Login History
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    $Query = "SELECT Id, UserId, LoginTime, SourceIp, LoginType, Status, Application, Browser, Platform FROM LoginHistory WHERE LoginTime >= $StartDate ORDER BY LoginTime DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Login history exported successfully" -ForegroundColor Green
    Write-Host "  Records: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Date Range: Last $Days days" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Login history export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-session-management',
    name: 'Terminate User Sessions',
    category: 'Security',
    description: 'Terminate all active sessions for a specific user',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      
      return `# Salesforce Terminate User Sessions
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get user info
    $UserUri = "$InstanceUrl/services/data/v59.0/sobjects/User/$UserId"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    Write-Host "Terminating sessions for: $($User.Name)" -ForegroundColor Yellow
    
    # Query active sessions
    $Query = "SELECT Id FROM AuthSession WHERE UsersId = '$UserId'"
    $QueryUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    $Sessions = Invoke-RestMethod -Uri $QueryUri -Method Get -Headers $Headers
    
    $TerminatedCount = 0
    foreach ($Session in $Sessions.records) {
        try {
            $DeleteUri = "$InstanceUrl/services/data/v59.0/sobjects/AuthSession/$($Session.Id)"
            Invoke-RestMethod -Uri $DeleteUri -Method Delete -Headers $Headers
            $TerminatedCount++
        } catch {
            Write-Host "  Could not terminate session: $($Session.Id)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Session termination completed" -ForegroundColor Green
    Write-Host "  User: $($User.Name)" -ForegroundColor Cyan
    Write-Host "  Sessions Found: $($Sessions.totalSize)" -ForegroundColor Cyan
    Write-Host "  Sessions Terminated: $TerminatedCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Session termination failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-failed-logins',
    name: 'Export Failed Login Attempts',
    category: 'Security',
    description: 'Export failed login attempts for security analysis',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\failed-logins.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const days = params.days || 7;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Failed Login Attempts
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    $Query = "SELECT Id, UserId, LoginTime, SourceIp, LoginType, Status, Application, Browser, Platform FROM LoginHistory WHERE Status != 'Success' AND LoginTime >= $StartDate ORDER BY LoginTime DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    # Group by IP for analysis
    $ByIP = $AllRecords | Group-Object -Property SourceIp | Sort-Object Count -Descending
    
    Write-Host "Failed Login Analysis:" -ForegroundColor Yellow
    Write-Host "  Total Failed Attempts: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Top Offending IPs:" -ForegroundColor Cyan
    $ByIP | Select-Object -First 5 | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count) attempts" -ForegroundColor Yellow
    }
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "Failed login report exported" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed login export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-mfa-status',
    name: 'Export MFA Status',
    category: 'Security',
    description: 'Export MFA enrollment status for all users',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\mfa-status.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export MFA Status
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get all active users
    $UserQuery = "SELECT Id, Name, Username, Email, Profile.Name, IsActive FROM User WHERE IsActive = true"
    $UserUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($UserQuery))"
    
    $Users = @()
    do {
        $Response = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
        $Users += $Response.records
        $UserUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($UserUri)
    
    # Get TwoFactorInfo for each user
    $MfaQuery = "SELECT UserId, HasUserVerifiedMobileNumber, HasUserVerifiedEmailAddress FROM TwoFactorInfo"
    $MfaUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($MfaQuery))"
    
    $MfaInfo = @{}
    try {
        do {
            $MfaResponse = Invoke-RestMethod -Uri $MfaUri -Method Get -Headers $Headers
            foreach ($Record in $MfaResponse.records) {
                $MfaInfo[$Record.UserId] = $Record
            }
            $MfaUri = if ($MfaResponse.nextRecordsUrl) { "$InstanceUrl$($MfaResponse.nextRecordsUrl)" } else { $null }
        } while ($MfaUri)
    } catch {
        Write-Host "Note: Could not query TwoFactorInfo (may require additional permissions)" -ForegroundColor Yellow
    }
    
    $Results = $Users | ForEach-Object {
        $MfaRecord = $MfaInfo[$_.Id]
        [PSCustomObject]@{
            Id = $_.Id
            Name = $_.Name
            Username = $_.Username
            Email = $_.Email
            Profile = $_.Profile.Name
            MobileVerified = if ($MfaRecord) { $MfaRecord.HasUserVerifiedMobileNumber } else { "Unknown" }
            EmailVerified = if ($MfaRecord) { $MfaRecord.HasUserVerifiedEmailAddress } else { "Unknown" }
        }
    }
    
    $Results | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "MFA status exported successfully" -ForegroundColor Green
    Write-Host "  Total Users: $($Users.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "MFA status export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-ip-whitelist',
    name: 'Export IP Whitelist',
    category: 'Security',
    description: 'Export trusted IP ranges configuration',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ip-whitelist.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export IP Whitelist
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query network IP ranges
    $Query = "SELECT Id, Description, StartAddress, EndAddress FROM LoginIpRange"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "IP whitelist exported successfully" -ForegroundColor Green
    Write-Host "  Total IP Ranges: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "IP Ranges:" -ForegroundColor Yellow
    foreach ($Range in $AllRecords) {
        Write-Host "  $($Range.StartAddress) - $($Range.EndAddress): $($Range.Description)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "IP whitelist export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-security-health-check',
    name: 'Security Health Check',
    category: 'Security',
    description: 'Run security health check and export results',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\security-health.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Security Health Check
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query SecurityHealthCheck object
    $Query = "SELECT Id, DurableId, RiskType, Score, Setting, SettingGroup, SettingRiskCategory FROM SecurityHealthCheck"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Calculate summary
    $HighRisk = ($AllRecords | Where-Object { $_.RiskType -eq 'HIGH_RISK' }).Count
    $MediumRisk = ($AllRecords | Where-Object { $_.RiskType -eq 'MEDIUM_RISK' }).Count
    $LowRisk = ($AllRecords | Where-Object { $_.RiskType -eq 'LOW_RISK' }).Count
    $Compliant = ($AllRecords | Where-Object { $_.RiskType -eq 'MEETS_STANDARD' }).Count
    
    Write-Host "Security Health Check completed" -ForegroundColor Green
    Write-Host "  Total Settings: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  High Risk: $HighRisk" -ForegroundColor Red
    Write-Host "  Medium Risk: $MediumRisk" -ForegroundColor Yellow
    Write-Host "  Low Risk: $LowRisk" -ForegroundColor Yellow
    Write-Host "  Compliant: $Compliant" -ForegroundColor Green
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Security health check failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== AUTOMATION ====================
  {
    id: 'sf-list-flows',
    name: 'List Active Flows',
    category: 'Automation',
    description: 'Export list of all active flows and their versions',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\flows.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Active Flows
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, DeveloperName, MasterLabel, ProcessType, TriggerType, Status, ActiveVersionId, LatestVersionId, Description, LastModifiedDate FROM FlowDefinition WHERE Status = 'Active'"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by type
    $ByType = $AllRecords | Group-Object -Property ProcessType
    
    Write-Host "Active flows exported successfully" -ForegroundColor Green
    Write-Host "  Total Active Flows: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  By Type:" -ForegroundColor Cyan
    foreach ($Type in $ByType) {
        Write-Host "    $($Type.Name): $($Type.Count)" -ForegroundColor Yellow
    }
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Flow export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-scheduled-jobs',
    name: 'List Scheduled Jobs',
    category: 'Automation',
    description: 'Export all scheduled Apex jobs and their status',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\scheduled-jobs.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Scheduled Jobs
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, CronJobDetail.Name, CronJobDetail.JobType, State, NextFireTime, PreviousFireTime, StartTime, EndTime, TimesTriggered FROM CronTrigger"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, 
        @{N='JobName';E={$_.CronJobDetail.Name}},
        @{N='JobType';E={$_.CronJobDetail.JobType}},
        State, NextFireTime, PreviousFireTime, TimesTriggered
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Scheduled jobs exported successfully" -ForegroundColor Green
    Write-Host "  Total Jobs: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    # Show upcoming jobs
    $Upcoming = $AllRecords | Where-Object { $_.NextFireTime } | Sort-Object NextFireTime | Select-Object -First 5
    if ($Upcoming) {
        Write-Host ""
        Write-Host "Next 5 Scheduled Runs:" -ForegroundColor Yellow
        foreach ($Job in $Upcoming) {
            Write-Host "  $($Job.CronJobDetail.Name): $($Job.NextFireTime)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Scheduled jobs export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-workflow-rules',
    name: 'Export Workflow Rules',
    category: 'Automation',
    description: 'Export all workflow rules using Tooling API',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\workflow-rules.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Workflow Rules
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, TableEnumOrId, Description, CreatedDate, LastModifiedDate FROM WorkflowRule"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by object
    $ByObject = $AllRecords | Group-Object -Property TableEnumOrId | Sort-Object Count -Descending
    
    Write-Host "Workflow rules exported successfully" -ForegroundColor Green
    Write-Host "  Total Rules: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  By Object:" -ForegroundColor Cyan
    $ByObject | Select-Object -First 10 | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor Yellow
    }
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Workflow rules export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-process-builder',
    name: 'Export Process Builder Processes',
    category: 'Automation',
    description: 'Export Process Builder definitions',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\processes.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Process Builder Processes
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Process Builder processes are stored as Flows with ProcessType = 'Workflow'
    $Query = "SELECT Id, DeveloperName, MasterLabel, ProcessType, Status, Description, LastModifiedDate FROM FlowDefinition WHERE ProcessType = 'Workflow'"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $Active = ($AllRecords | Where-Object { $_.Status -eq 'Active' }).Count
    $Inactive = ($AllRecords | Where-Object { $_.Status -ne 'Active' }).Count
    
    Write-Host "Process Builder export completed" -ForegroundColor Green
    Write-Host "  Total Processes: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Active: $Active" -ForegroundColor Green
    Write-Host "  Inactive: $Inactive" -ForegroundColor Yellow
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Process Builder export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-apex-jobs',
    name: 'Monitor Apex Jobs',
    category: 'Automation',
    description: 'Export recent Apex job executions and their status',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'hours', label: 'Hours of History', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\apex-jobs.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const hours = params.hours || 24;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Monitor Apex Jobs
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Hours = ${hours}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddHours(-$Hours).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    $Query = "SELECT Id, JobType, ApexClass.Name, Status, ExtendedStatus, NumberOfErrors, JobItemsProcessed, TotalJobItems, CreatedDate, CompletedDate FROM AsyncApexJob WHERE CreatedDate >= $StartDate ORDER BY CreatedDate DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, JobType, 
        @{N='ApexClass';E={$_.ApexClass.Name}},
        Status, ExtendedStatus, NumberOfErrors, JobItemsProcessed, TotalJobItems, CreatedDate, CompletedDate
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary
    $ByStatus = $AllRecords | Group-Object -Property Status
    $Failed = ($AllRecords | Where-Object { $_.Status -eq 'Failed' -or $_.NumberOfErrors -gt 0 }).Count
    
    Write-Host "Apex job monitoring completed" -ForegroundColor Green
    Write-Host "  Time Range: Last $Hours hours" -ForegroundColor Cyan
    Write-Host "  Total Jobs: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  By Status:" -ForegroundColor Cyan
    foreach ($Status in $ByStatus) {
        $Color = if ($Status.Name -eq 'Failed') { "Red" } elseif ($Status.Name -eq 'Completed') { "Green" } else { "Yellow" }
        Write-Host "    $($Status.Name): $($Status.Count)" -ForegroundColor $Color
    }
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Apex job monitoring failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== REPORTING ====================
  {
    id: 'sf-export-report',
    name: 'Export Report to CSV',
    category: 'Reporting',
    description: 'Export a Salesforce report to CSV file',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'reportId', label: 'Report ID', type: 'text', required: true, placeholder: '00O...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\report-export.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const reportId = escapePowerShellString(params.reportId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Report to CSV
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ReportId = "${reportId}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get report metadata first
    $MetaUri = "$InstanceUrl/services/data/v59.0/analytics/reports/$ReportId/describe"
    $Metadata = Invoke-RestMethod -Uri $MetaUri -Method Get -Headers $Headers
    
    Write-Host "Exporting report: $($Metadata.reportMetadata.name)" -ForegroundColor Yellow
    
    # Run the report
    $RunUri = "$InstanceUrl/services/data/v59.0/analytics/reports/$ReportId"
    $ReportData = Invoke-RestMethod -Uri $RunUri -Method Get -Headers $Headers
    
    # Extract column labels
    $Columns = $ReportData.reportMetadata.detailColumns
    $ColumnInfo = $ReportData.reportExtendedMetadata.detailColumnInfo
    
    # Build export data
    $ExportRows = @()
    if ($ReportData.factMap.'T!T'.rows) {
        foreach ($Row in $ReportData.factMap.'T!T'.rows) {
            $ExportRow = @{}
            for ($i = 0; $i -lt $Columns.Count; $i++) {
                $ColName = $ColumnInfo[$Columns[$i]].label
                $ExportRow[$ColName] = $Row.dataCells[$i].label
            }
            $ExportRows += [PSCustomObject]$ExportRow
        }
    }
    
    $ExportRows | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Report exported successfully" -ForegroundColor Green
    Write-Host "  Report: $($Metadata.reportMetadata.name)" -ForegroundColor Cyan
    Write-Host "  Rows: $($ExportRows.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-list-reports',
    name: 'List All Reports',
    category: 'Reporting',
    description: 'Export list of all reports with folder information',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\report-list.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List All Reports
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, DeveloperName, Description, FolderName, Format, LastRunDate, LastModifiedDate, CreatedDate, CreatedBy.Name FROM Report ORDER BY FolderName, Name"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, Name, DeveloperName, Description, FolderName, Format, LastRunDate, LastModifiedDate, CreatedDate, @{N='CreatedBy';E={$_.CreatedBy.Name}}
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by folder
    $ByFolder = $AllRecords | Group-Object -Property FolderName | Sort-Object Count -Descending
    
    Write-Host "Reports exported successfully" -ForegroundColor Green
    Write-Host "  Total Reports: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Top Folders:" -ForegroundColor Cyan
    $ByFolder | Select-Object -First 5 | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor Yellow
    }
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report list export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-dashboard-data',
    name: 'Export Dashboard Data',
    category: 'Reporting',
    description: 'Export dashboard component data',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'dashboardId', label: 'Dashboard ID', type: 'text', required: true, placeholder: '01Z...' },
      { id: 'exportPath', label: 'Export Directory', type: 'path', required: true, placeholder: 'C:\\Reports\\dashboard' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const dashboardId = escapePowerShellString(params.dashboardId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Dashboard Data
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$DashboardId = "${dashboardId}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Ensure output directory exists
    if (!(Test-Path $ExportPath)) {
        New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
    }
    
    # Get dashboard data
    $Uri = "$InstanceUrl/services/data/v59.0/analytics/dashboards/$DashboardId"
    $Dashboard = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Exporting dashboard: $($Dashboard.name)" -ForegroundColor Yellow
    
    # Export each component
    $ComponentCount = 0
    foreach ($Component in $Dashboard.componentData) {
        $ComponentName = $Component.componentId -replace '[^a-zA-Z0-9]', '_'
        $ComponentPath = "$ExportPath\\$ComponentName.json"
        $Component | ConvertTo-Json -Depth 10 | Out-File $ComponentPath
        $ComponentCount++
    }
    
    # Export dashboard metadata
    $MetadataPath = "$ExportPath\\dashboard_metadata.json"
    $Dashboard | ConvertTo-Json -Depth 5 | Out-File $MetadataPath
    
    Write-Host "Dashboard data exported successfully" -ForegroundColor Green
    Write-Host "  Dashboard: $($Dashboard.name)" -ForegroundColor Cyan
    Write-Host "  Components: $ComponentCount" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Dashboard export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-api-usage',
    name: 'API Usage Report',
    category: 'Reporting',
    description: 'Generate API usage statistics report',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      
      return `# Salesforce API Usage Report
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get limits information
    $LimitsUri = "$InstanceUrl/services/data/v59.0/limits"
    $Limits = Invoke-RestMethod -Uri $LimitsUri -Method Get -Headers $Headers
    
    Write-Host "Salesforce API Usage Report" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    # Daily API Requests
    Write-Host ""
    Write-Host "Daily API Requests:" -ForegroundColor Yellow
    Write-Host "  Used: $($Limits.DailyApiRequests.Remaining) remaining of $($Limits.DailyApiRequests.Max)" -ForegroundColor Cyan
    $UsagePercent = [math]::Round((($Limits.DailyApiRequests.Max - $Limits.DailyApiRequests.Remaining) / $Limits.DailyApiRequests.Max) * 100, 2)
    Write-Host "  Usage: $UsagePercent%" -ForegroundColor $(if ($UsagePercent -gt 80) { "Red" } elseif ($UsagePercent -gt 50) { "Yellow" } else { "Green" })
    
    # Bulk API
    Write-Host ""
    Write-Host "Daily Bulk API Requests:" -ForegroundColor Yellow
    Write-Host "  Remaining: $($Limits.DailyBulkApiRequests.Remaining) of $($Limits.DailyBulkApiRequests.Max)" -ForegroundColor Cyan
    
    # Streaming API
    Write-Host ""
    Write-Host "Daily Streaming API Events:" -ForegroundColor Yellow
    Write-Host "  Remaining: $($Limits.DailyStreamingApiEvents.Remaining) of $($Limits.DailyStreamingApiEvents.Max)" -ForegroundColor Cyan
    
    # Data Storage
    Write-Host ""
    Write-Host "Data Storage:" -ForegroundColor Yellow
    Write-Host "  Used: $($Limits.DataStorageMB.Remaining) MB remaining of $($Limits.DataStorageMB.Max) MB" -ForegroundColor Cyan
    
    # File Storage
    Write-Host ""
    Write-Host "File Storage:" -ForegroundColor Yellow
    Write-Host "  Used: $($Limits.FileStorageMB.Remaining) MB remaining of $($Limits.FileStorageMB.Max) MB" -ForegroundColor Cyan
    
} catch {
    Write-Error "API usage report failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-storage-usage',
    name: 'Storage Usage Report',
    category: 'Reporting',
    description: 'Analyze storage usage by object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\storage-usage.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Storage Usage Report
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get list of all objects
    $ObjectsUri = "$InstanceUrl/services/data/v59.0/sobjects"
    $Objects = Invoke-RestMethod -Uri $ObjectsUri -Method Get -Headers $Headers
    
    Write-Host "Analyzing storage usage..." -ForegroundColor Yellow
    
    $StorageData = @()
    foreach ($Obj in $Objects.sobjects | Where-Object { $_.queryable }) {
        try {
            $CountQuery = "SELECT COUNT() FROM $($Obj.name)"
            $CountUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($CountQuery))"
            $CountResult = Invoke-RestMethod -Uri $CountUri -Method Get -Headers $Headers
            
            if ($CountResult.totalSize -gt 0) {
                $StorageData += [PSCustomObject]@{
                    ObjectName = $Obj.name
                    Label = $Obj.label
                    RecordCount = $CountResult.totalSize
                    Custom = $Obj.custom
                }
            }
        } catch {
            # Skip objects that can't be queried
        }
    }
    
    $StorageData = $StorageData | Sort-Object RecordCount -Descending
    $StorageData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Storage usage report completed" -ForegroundColor Green
    Write-Host "  Objects Analyzed: $($StorageData.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Top 10 Objects by Record Count:" -ForegroundColor Yellow
    $StorageData | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.ObjectName): $($_.RecordCount) records" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Storage usage report failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== INTEGRATION ====================
  {
    id: 'sf-connected-apps',
    name: 'List Connected Apps',
    category: 'Integration',
    description: 'Export all connected app configurations',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\connected-apps.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Connected Apps
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, ContactEmail, Description, CreatedDate, LastModifiedDate FROM ConnectedApplication"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Connected apps exported successfully" -ForegroundColor Green
    Write-Host "  Total Apps: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Connected Apps:" -ForegroundColor Yellow
    foreach ($App in $AllRecords) {
        Write-Host "  - $($App.Name)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Connected apps export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-oauth-tokens',
    name: 'Revoke OAuth Tokens',
    category: 'Integration',
    description: 'Revoke OAuth tokens for a connected app',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' },
      { id: 'appName', label: 'Connected App Name', type: 'text', required: true, placeholder: 'My App' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      const appName = escapePowerShellString(params.appName);
      
      return `# Salesforce Revoke OAuth Tokens
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$AppName = "${appName}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query OAuth tokens for the user and app
    $Query = "SELECT Id, AppName, LastUsedDate FROM OAuthToken WHERE UserId = '$UserId' AND AppName = '$AppName'"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    $Tokens = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if ($Tokens.totalSize -eq 0) {
        Write-Host "No OAuth tokens found for user and app combination" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "Found $($Tokens.totalSize) OAuth token(s) to revoke" -ForegroundColor Yellow
    $Confirm = Read-Host "Type 'REVOKE' to confirm"
    if ($Confirm -ne 'REVOKE') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    
    $RevokedCount = 0
    foreach ($Token in $Tokens.records) {
        try {
            $DeleteUri = "$InstanceUrl/services/data/v59.0/sobjects/OAuthToken/$($Token.Id)"
            Invoke-RestMethod -Uri $DeleteUri -Method Delete -Headers $Headers
            $RevokedCount++
        } catch {
            Write-Host "  Could not revoke token: $($Token.Id)" -ForegroundColor Red
        }
    }
    
    Write-Host "OAuth tokens revoked" -ForegroundColor Green
    Write-Host "  App: $AppName" -ForegroundColor Cyan
    Write-Host "  Tokens Revoked: $RevokedCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "OAuth revocation failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-api-version-check',
    name: 'Check API Versions',
    category: 'Integration',
    description: 'List available Salesforce API versions',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      
      return `# Salesforce Check API Versions
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "$InstanceUrl/services/data"
    $Versions = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Available Salesforce API Versions:" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    foreach ($Version in $Versions | Sort-Object -Property version -Descending | Select-Object -First 10) {
        Write-Host "  Version $($Version.version) - $($Version.label)" -ForegroundColor Cyan
        Write-Host "    URL: $($Version.url)" -ForegroundColor Yellow
    }
    
    $Latest = $Versions | Sort-Object -Property version -Descending | Select-Object -First 1
    Write-Host ""
    Write-Host "Latest Version: $($Latest.version)" -ForegroundColor Green
    
} catch {
    Write-Error "API version check failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-named-credentials',
    name: 'List Named Credentials',
    category: 'Integration',
    description: 'Export all named credentials configuration',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\named-credentials.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Named Credentials
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, DeveloperName, MasterLabel, Endpoint, NamespacePrefix FROM NamedCredential"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Named credentials exported successfully" -ForegroundColor Green
    Write-Host "  Total Credentials: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Named Credentials:" -ForegroundColor Yellow
    foreach ($Cred in $AllRecords) {
        Write-Host "  - $($Cred.MasterLabel): $($Cred.Endpoint)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Named credentials export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-external-services',
    name: 'List External Services',
    category: 'Integration',
    description: 'Export all external service registrations',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\external-services.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List External Services
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, DeveloperName, MasterLabel, Description, NamedCredential, Status FROM ExternalServiceRegistration"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "External services exported successfully" -ForegroundColor Green
    Write-Host "  Total Services: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "External services export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== OBJECT MANAGEMENT ====================
  {
    id: 'sf-describe-object',
    name: 'Describe Object',
    category: 'Object Management',
    description: 'Get detailed metadata about a Salesforce object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export JSON Path', type: 'path', required: true, placeholder: 'C:\\Reports\\object-describe.json' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Describe Object
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "$InstanceUrl/services/data/v59.0/sobjects/$ObjectName/describe"
    $Describe = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    # Save full describe to JSON
    $Describe | ConvertTo-Json -Depth 10 | Out-File $ExportPath
    
    Write-Host "Object: $($Describe.label) ($($Describe.name))" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Object Properties:" -ForegroundColor Yellow
    Write-Host "  Createable: $($Describe.createable)" -ForegroundColor Cyan
    Write-Host "  Updateable: $($Describe.updateable)" -ForegroundColor Cyan
    Write-Host "  Deletable: $($Describe.deletable)" -ForegroundColor Cyan
    Write-Host "  Queryable: $($Describe.queryable)" -ForegroundColor Cyan
    Write-Host "  Custom: $($Describe.custom)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Fields: $($Describe.fields.Count)" -ForegroundColor Yellow
    $RequiredFields = $Describe.fields | Where-Object { $_.nillable -eq $false -and $_.createable -eq $true -and $_.defaultedOnCreate -eq $false }
    Write-Host "  Required for Create: $($RequiredFields.Count)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Record Types: $($Describe.recordTypeInfos.Count)" -ForegroundColor Yellow
    foreach ($RT in $Describe.recordTypeInfos | Where-Object { $_.available }) {
        Write-Host "  - $($RT.name) ($($RT.recordTypeId))" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Full describe saved to: $ExportPath" -ForegroundColor Green
    
} catch {
    Write-Error "Object describe failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-list-custom-objects',
    name: 'List Custom Objects',
    category: 'Object Management',
    description: 'Export list of all custom objects',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\custom-objects.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Custom Objects
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "$InstanceUrl/services/data/v59.0/sobjects"
    $Objects = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $CustomObjects = $Objects.sobjects | Where-Object { $_.custom -eq $true }
    
    $ExportData = $CustomObjects | Select-Object name, label, 
        @{N='Createable';E={$_.createable}},
        @{N='Updateable';E={$_.updateable}},
        @{N='Deletable';E={$_.deletable}},
        @{N='Queryable';E={$_.queryable}},
        @{N='Triggerable';E={$_.triggerable}}
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Custom objects exported successfully" -ForegroundColor Green
    Write-Host "  Total Custom Objects: $($CustomObjects.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Custom Objects:" -ForegroundColor Yellow
    foreach ($Obj in $CustomObjects | Select-Object -First 20) {
        Write-Host "  - $($Obj.label) ($($Obj.name))" -ForegroundColor Cyan
    }
    if ($CustomObjects.Count -gt 20) {
        Write-Host "  ... and $($CustomObjects.Count - 20) more" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Custom objects export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-export-fields',
    name: 'Export Object Fields',
    category: 'Object Management',
    description: 'Export all fields for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\object-fields.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Object Fields
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "$InstanceUrl/services/data/v59.0/sobjects/$ObjectName/describe"
    $Describe = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Fields = $Describe.fields | Select-Object name, label, type, length, 
        @{N='Required';E={-not $_.nillable}},
        @{N='Custom';E={$_.custom}},
        @{N='Createable';E={$_.createable}},
        @{N='Updateable';E={$_.updateable}},
        @{N='Calculated';E={$_.calculated}},
        @{N='AutoNumber';E={$_.autoNumber}},
        inlineHelpText
    
    $Fields | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary
    $CustomFields = ($Fields | Where-Object { $_.Custom }).Count
    $RequiredFields = ($Fields | Where-Object { $_.Required }).Count
    
    Write-Host "Object fields exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Fields: $($Fields.Count)" -ForegroundColor Cyan
    Write-Host "  Custom Fields: $CustomFields" -ForegroundColor Cyan
    Write-Host "  Required Fields: $RequiredFields" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Field export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-page-layouts',
    name: 'Export Page Layouts',
    category: 'Object Management',
    description: 'Export page layout assignments for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\page-layouts.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Page Layouts
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query layouts using Tooling API
    $Query = "SELECT Id, Name, EntityDefinitionId, LayoutType, NamespacePrefix FROM Layout WHERE EntityDefinition.QualifiedApiName = '$ObjectName'"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Page layouts exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Layouts: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Page Layouts:" -ForegroundColor Yellow
    foreach ($Layout in $AllRecords) {
        Write-Host "  - $($Layout.Name) ($($Layout.LayoutType))" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Page layout export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-record-types',
    name: 'Export Record Types',
    category: 'Object Management',
    description: 'Export record types for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\record-types.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Record Types
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, DeveloperName, Description, IsActive, SobjectType FROM RecordType WHERE SobjectType = '$ObjectName'"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $Active = ($AllRecords | Where-Object { $_.IsActive }).Count
    $Inactive = ($AllRecords | Where-Object { -not $_.IsActive }).Count
    
    Write-Host "Record types exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Record Types: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Active: $Active" -ForegroundColor Green
    Write-Host "  Inactive: $Inactive" -ForegroundColor Yellow
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Record Types:" -ForegroundColor Yellow
    foreach ($RT in $AllRecords) {
        $Status = if ($RT.IsActive) { "[Active]" } else { "[Inactive]" }
        Write-Host "  - $($RT.Name) $Status" -ForegroundColor $(if ($RT.IsActive) { "Cyan" } else { "Yellow" })
    }
    
} catch {
    Write-Error "Record type export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-validation-rules',
    name: 'Export Validation Rules',
    category: 'Object Management',
    description: 'Export validation rules for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\validation-rules.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Validation Rules
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, ValidationName, Active, Description, ErrorMessage FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = '$ObjectName'"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $Active = ($AllRecords | Where-Object { $_.Active }).Count
    $Inactive = ($AllRecords | Where-Object { -not $_.Active }).Count
    
    Write-Host "Validation rules exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Rules: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Active: $Active" -ForegroundColor Green
    Write-Host "  Inactive: $Inactive" -ForegroundColor Yellow
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Validation rule export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== COMPLIANCE ====================
  {
    id: 'sf-setup-audit-trail',
    name: 'Export Setup Audit Trail',
    category: 'Compliance',
    description: 'Export setup audit trail for compliance reporting',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Compliance\\setup-audit.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Setup Audit Trail
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    $Query = "SELECT Id, Action, Section, CreatedDate, CreatedBy.Name, Display, DelegateUser FROM SetupAuditTrail WHERE CreatedDate >= $StartDate ORDER BY CreatedDate DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, Action, Section, CreatedDate, 
        @{N='CreatedBy';E={$_.CreatedBy.Name}}, Display, DelegateUser
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by section
    $BySection = $AllRecords | Group-Object -Property Section | Sort-Object Count -Descending
    
    Write-Host "Setup audit trail exported successfully" -ForegroundColor Green
    Write-Host "  Date Range: Last $Days days" -ForegroundColor Cyan
    Write-Host "  Total Changes: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Changes by Section:" -ForegroundColor Yellow
    $BySection | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Setup audit trail export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-field-history',
    name: 'Export Field History',
    category: 'Compliance',
    description: 'Export field history tracking data for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'recordId', label: 'Record ID (optional)', type: 'text', required: false, placeholder: '001...' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Compliance\\field-history.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const recordId = escapePowerShellString(params.recordId || '');
      const days = params.days || 90;
      const exportPath = escapePowerShellString(params.exportPath);
      
      const historyObject = `${objectName}History`;
      const parentField = objectName === 'Opportunity' ? 'OpportunityId' : `${objectName}Id`;
      const recordFilter = recordId ? ` AND ${parentField} = '${recordId}'` : '';
      
      return `# Salesforce Export Field History
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$HistoryObject = "${historyObject}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    $Query = "SELECT Id, Field, OldValue, NewValue, CreatedDate, CreatedBy.Name FROM $HistoryObject WHERE CreatedDate >= $StartDate${recordFilter} ORDER BY CreatedDate DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, Field, OldValue, NewValue, CreatedDate, 
        @{N='ChangedBy';E={$_.CreatedBy.Name}}
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by field
    $ByField = $AllRecords | Group-Object -Property Field | Sort-Object Count -Descending
    
    Write-Host "Field history exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Date Range: Last $Days days" -ForegroundColor Cyan
    Write-Host "  Total Changes: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Most Changed Fields:" -ForegroundColor Yellow
    $ByField | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) changes" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Field history export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-data-classification',
    name: 'Export Data Classification',
    category: 'Compliance',
    description: 'Export field-level data classification settings',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Compliance\\data-classification.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Data Classification
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get field definitions with compliance metadata
    $Query = "SELECT Id, QualifiedApiName, MasterLabel, DataType, ComplianceGroup, SecurityClassification, BusinessOwnerId, BusinessStatus FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '$ObjectName'"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary
    $ClassifiedFields = ($AllRecords | Where-Object { $_.SecurityClassification -or $_.ComplianceGroup }).Count
    
    Write-Host "Data classification exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Fields: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Classified Fields: $ClassifiedFields" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Data classification export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-event-log-files',
    name: 'Download Event Log Files',
    category: 'Compliance',
    description: 'Download event log files for security analysis',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'eventType', label: 'Event Type', type: 'select', required: true, options: ['Login', 'Logout', 'API', 'Report', 'ApexExecution', 'URI', 'RestApi'], defaultValue: 'Login' },
      { id: 'days', label: 'Days Back', type: 'number', required: true, defaultValue: 1 },
      { id: 'outputDir', label: 'Output Directory', type: 'path', required: true, placeholder: 'C:\\Compliance\\event-logs' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const eventType = escapePowerShellString(params.eventType);
      const days = params.days || 1;
      const outputDir = escapePowerShellString(params.outputDir);
      
      return `# Salesforce Download Event Log Files
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$EventType = "${eventType}"
$Days = ${days}
$OutputDir = "${outputDir}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Ensure output directory exists
    if (!(Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    $Query = "SELECT Id, EventType, LogDate, LogFileLength, LogFile FROM EventLogFile WHERE EventType = '$EventType' AND LogDate >= $StartDate"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $LogFiles = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Found $($LogFiles.totalSize) event log file(s)" -ForegroundColor Yellow
    
    $DownloadedCount = 0
    foreach ($LogFile in $LogFiles.records) {
        $LogDate = ([DateTime]$LogFile.LogDate).ToString("yyyy-MM-dd")
        $FileName = "$OutputDir\\$($LogFile.EventType)_$LogDate.csv"
        
        # Download log file content
        $LogUri = "$InstanceUrl$($LogFile.LogFile)"
        $LogContent = Invoke-RestMethod -Uri $LogUri -Method Get -Headers $Headers
        $LogContent | Out-File $FileName
        
        Write-Host "  Downloaded: $FileName" -ForegroundColor Cyan
        $DownloadedCount++
    }
    
    Write-Host ""
    Write-Host "Event log download completed" -ForegroundColor Green
    Write-Host "  Event Type: $EventType" -ForegroundColor Cyan
    Write-Host "  Files Downloaded: $DownloadedCount" -ForegroundColor Cyan
    Write-Host "  Output Directory: $OutputDir" -ForegroundColor Cyan
    
} catch {
    Write-Error "Event log download failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-sharing-rules',
    name: 'Export Sharing Rules',
    category: 'Compliance',
    description: 'Export sharing rules configuration for compliance',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Compliance\\sharing-rules.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Sharing Rules
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get sharing rules using the Tooling API
    $SharingObject = "${objectName}Share"
    $Query = "SELECT Id, DeveloperName, MasterLabel, Description FROM SharingRules WHERE SobjectType = '$ObjectName'"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    try {
        do {
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            $AllRecords += $Response.records
            $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
        } while ($Uri)
    } catch {
        Write-Host "Note: Using alternative query method" -ForegroundColor Yellow
    }
    
    # Also get org-wide defaults
    $OWDQuery = "SELECT Id, InternalSharingModel, ExternalSharingModel FROM EntityDefinition WHERE QualifiedApiName = '$ObjectName'"
    $OWDUri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($OWDQuery))"
    $OWD = Invoke-RestMethod -Uri $OWDUri -Method Get -Headers $Headers
    
    if ($OWD.records.Count -gt 0) {
        Write-Host "Org-Wide Defaults for $ObjectName:" -ForegroundColor Yellow
        Write-Host "  Internal Sharing: $($OWD.records[0].InternalSharingModel)" -ForegroundColor Cyan
        Write-Host "  External Sharing: $($OWD.records[0].ExternalSharingModel)" -ForegroundColor Cyan
    }
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "Sharing rules exported successfully" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Total Rules: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Sharing rules export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-profiles-permissions',
    name: 'Export Profile Permissions',
    category: 'Compliance',
    description: 'Export detailed permissions for a profile',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'profileId', label: 'Profile ID', type: 'text', required: true, placeholder: '00e...' },
      { id: 'exportPath', label: 'Export Directory', type: 'path', required: true, placeholder: 'C:\\Compliance\\profile-permissions' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const profileId = escapePowerShellString(params.profileId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Profile Permissions
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ProfileId = "${profileId}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Ensure output directory exists
    if (!(Test-Path $ExportPath)) {
        New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
    }
    
    # Get profile info
    $ProfileUri = "$InstanceUrl/services/data/v59.0/sobjects/Profile/$ProfileId"
    $Profile = Invoke-RestMethod -Uri $ProfileUri -Method Get -Headers $Headers
    
    Write-Host "Exporting permissions for: $($Profile.Name)" -ForegroundColor Yellow
    
    # Object permissions
    $ObjQuery = "SELECT Id, SobjectType, PermissionsCreate, PermissionsRead, PermissionsEdit, PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords FROM ObjectPermissions WHERE ParentId = '$ProfileId'"
    $ObjUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($ObjQuery))"
    
    $ObjPerms = @()
    do {
        $Response = Invoke-RestMethod -Uri $ObjUri -Method Get -Headers $Headers
        $ObjPerms += $Response.records
        $ObjUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($ObjUri)
    
    $ObjPerms | Export-Csv -Path "$ExportPath\\object_permissions.csv" -NoTypeInformation
    
    # Field permissions
    $FieldQuery = "SELECT Id, Field, SobjectType, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE ParentId = '$ProfileId'"
    $FieldUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($FieldQuery))"
    
    $FieldPerms = @()
    do {
        $Response = Invoke-RestMethod -Uri $FieldUri -Method Get -Headers $Headers
        $FieldPerms += $Response.records
        $FieldUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($FieldUri)
    
    $FieldPerms | Export-Csv -Path "$ExportPath\\field_permissions.csv" -NoTypeInformation
    
    Write-Host ""
    Write-Host "Profile permissions exported successfully" -ForegroundColor Green
    Write-Host "  Profile: $($Profile.Name)" -ForegroundColor Cyan
    Write-Host "  Object Permissions: $($ObjPerms.Count)" -ForegroundColor Cyan
    Write-Host "  Field Permissions: $($FieldPerms.Count)" -ForegroundColor Cyan
    Write-Host "  Export Directory: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Profile permissions export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-inactive-users',
    name: 'Find Inactive Users',
    category: 'User Management',
    description: 'Identify users who have not logged in for a specified period',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'days', label: 'Days Inactive', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\inactive-users.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const days = params.days || 90;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Find Inactive Users
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $CutoffDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    $Query = "SELECT Id, Name, Username, Email, Profile.Name, LastLoginDate, IsActive, CreatedDate FROM User WHERE IsActive = true AND (LastLoginDate < $CutoffDate OR LastLoginDate = null) ORDER BY LastLoginDate"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id, Name, Username, Email, 
        @{N='Profile';E={$_.Profile.Name}}, LastLoginDate, CreatedDate
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $NeverLogged = ($AllRecords | Where-Object { $null -eq $_.LastLoginDate }).Count
    
    Write-Host "Inactive users report completed" -ForegroundColor Green
    Write-Host "  Inactive Period: $Days days" -ForegroundColor Cyan
    Write-Host "  Total Inactive Users: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Never Logged In: $NeverLogged" -ForegroundColor Yellow
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Inactive users report failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-permission-set-groups',
    name: 'List Permission Set Groups',
    category: 'User Management',
    description: 'Export all permission set groups and their members',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\permission-set-groups.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Permission Set Groups
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, DeveloperName, MasterLabel, Description, Status FROM PermissionSetGroup"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Permission set groups exported successfully" -ForegroundColor Green
    Write-Host "  Total Groups: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Permission Set Groups:" -ForegroundColor Yellow
    foreach ($Group in $AllRecords) {
        Write-Host "  - $($Group.MasterLabel) ($($Group.Status))" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Permission set groups export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-triggers-list',
    name: 'List Apex Triggers',
    category: 'Automation',
    description: 'Export all Apex triggers with their status',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\apex-triggers.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Apex Triggers
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, Name, TableEnumOrId, Status, UsageBeforeInsert, UsageAfterInsert, UsageBeforeUpdate, UsageAfterUpdate, UsageBeforeDelete, UsageAfterDelete, UsageAfterUndelete, ApiVersion, LengthWithoutComments FROM ApexTrigger"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $Active = ($AllRecords | Where-Object { $_.Status -eq 'Active' }).Count
    $Inactive = ($AllRecords | Where-Object { $_.Status -ne 'Active' }).Count
    
    Write-Host "Apex triggers exported successfully" -ForegroundColor Green
    Write-Host "  Total Triggers: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Active: $Active" -ForegroundColor Green
    Write-Host "  Inactive: $Inactive" -ForegroundColor Yellow
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    # Group by object
    $ByObject = $AllRecords | Group-Object -Property TableEnumOrId | Sort-Object Count -Descending
    Write-Host ""
    Write-Host "Triggers by Object:" -ForegroundColor Yellow
    $ByObject | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Apex triggers export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-remote-site-settings',
    name: 'Export Remote Site Settings',
    category: 'Integration',
    description: 'Export all remote site settings for security review',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\remote-sites.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Remote Site Settings
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Query = "SELECT Id, SiteName, EndpointUrl, Description, IsActive, DisableProtocolSecurity FROM RemoteProxy"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $Active = ($AllRecords | Where-Object { $_.IsActive }).Count
    $Insecure = ($AllRecords | Where-Object { $_.DisableProtocolSecurity }).Count
    
    Write-Host "Remote site settings exported successfully" -ForegroundColor Green
    Write-Host "  Total Sites: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Active: $Active" -ForegroundColor Cyan
    if ($Insecure -gt 0) {
        Write-Host "  WARNING - Protocol Security Disabled: $Insecure" -ForegroundColor Red
    }
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Remote Sites:" -ForegroundColor Yellow
    foreach ($Site in $AllRecords) {
        $Status = if ($Site.IsActive) { "[Active]" } else { "[Inactive]" }
        Write-Host "  - $($Site.SiteName) $Status" -ForegroundColor Cyan
        Write-Host "    $($Site.EndpointUrl)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Remote site settings export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-email-deliverability',
    name: 'Check Email Deliverability',
    category: 'Compliance',
    description: 'Export email deliverability settings and bounce statistics',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\email-deliverability.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Check Email Deliverability
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    # Query email status
    $Query = "SELECT Id, Subject, Status, ToAddress, FromAddress, CreatedDate FROM EmailMessage WHERE CreatedDate >= $StartDate ORDER BY CreatedDate DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $AllRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by status
    $ByStatus = $AllRecords | Group-Object -Property Status
    
    Write-Host "Email deliverability report completed" -ForegroundColor Green
    Write-Host "  Date Range: Last $Days days" -ForegroundColor Cyan
    Write-Host "  Total Emails: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "By Status:" -ForegroundColor Yellow
    foreach ($Status in $ByStatus) {
        Write-Host "  $($Status.Name): $($Status.Count)" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Email deliverability check failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== ADDITIONAL DATA MANAGEMENT ====================
  {
    id: 'sf-data-quality-report',
    name: 'Data Quality Report',
    category: 'Data Management',
    description: 'Generate a data quality report for an object analyzing null values and data completeness',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'fieldsToAnalyze', label: 'Fields to Analyze (comma-separated)', type: 'text', required: true, placeholder: 'Phone, Website, Industry' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\data-quality.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const fieldsToAnalyze = escapePowerShellString(params.fieldsToAnalyze);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Data Quality Report
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$FieldsToAnalyze = "${fieldsToAnalyze}" -split ',' | ForEach-Object { $_.Trim() }
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $AllFields = @("Id") + $FieldsToAnalyze
    $FieldList = $AllFields -join ", "
    
    $Query = "SELECT $FieldList FROM $ObjectName"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $TotalRecords = $AllRecords.Count
    $Results = @()
    
    foreach ($Field in $FieldsToAnalyze) {
        $NullCount = ($AllRecords | Where-Object { $null -eq $_.$Field -or $_.$Field -eq '' }).Count
        $PopulatedCount = $TotalRecords - $NullCount
        $CompletenessPercent = [math]::Round(($PopulatedCount / $TotalRecords) * 100, 2)
        
        $Results += [PSCustomObject]@{
            Field = $Field
            TotalRecords = $TotalRecords
            PopulatedCount = $PopulatedCount
            NullCount = $NullCount
            CompletenessPercent = $CompletenessPercent
        }
    }
    
    $Results | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Data Quality Report for $ObjectName" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "Total Records: $TotalRecords" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Field Completeness:" -ForegroundColor Yellow
    foreach ($Result in $Results | Sort-Object CompletenessPercent) {
        $Color = if ($Result.CompletenessPercent -ge 80) { "Green" } elseif ($Result.CompletenessPercent -ge 50) { "Yellow" } else { "Red" }
        Write-Host "  $($Result.Field): $($Result.CompletenessPercent)% ($($Result.PopulatedCount)/$TotalRecords)" -ForegroundColor $Color
    }
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Data quality report failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-bulk-update-field',
    name: 'Bulk Update Field Value',
    category: 'Data Management',
    description: 'Bulk update a field value for records matching a filter criteria',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'fieldToUpdate', label: 'Field to Update', type: 'text', required: true, placeholder: 'Industry' },
      { id: 'newValue', label: 'New Value', type: 'text', required: true, placeholder: 'Technology' },
      { id: 'whereClause', label: 'WHERE Clause (SOQL)', type: 'text', required: true, placeholder: "Industry = 'Other'" }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const fieldToUpdate = escapePowerShellString(params.fieldToUpdate);
      const newValue = escapePowerShellString(params.newValue);
      const whereClause = escapePowerShellString(params.whereClause);
      
      return `# Salesforce Bulk Update Field Value
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$FieldToUpdate = "${fieldToUpdate}"
$NewValue = "${newValue}"
$WhereClause = "${whereClause}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Query records to update
    $Query = "SELECT Id, $FieldToUpdate FROM $ObjectName WHERE $WhereClause"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $RecordsToUpdate = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $RecordsToUpdate += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    if ($RecordsToUpdate.Count -eq 0) {
        Write-Host "No records found matching the criteria" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "Found $($RecordsToUpdate.Count) records to update" -ForegroundColor Yellow
    $Confirm = Read-Host "Type 'UPDATE' to confirm"
    if ($Confirm -ne 'UPDATE') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    
    # Prepare composite request (up to 200 records per batch)
    $BatchSize = 200
    $SuccessCount = 0
    $FailCount = 0
    
    for ($i = 0; $i -lt $RecordsToUpdate.Count; $i += $BatchSize) {
        $Batch = $RecordsToUpdate[$i..([Math]::Min($i + $BatchSize - 1, $RecordsToUpdate.Count - 1))]
        
        $CompositeRequest = @{
            allOrNone = $false
            records = @($Batch | ForEach-Object {
                @{
                    attributes = @{ type = $ObjectName }
                    id = $_.Id
                    $FieldToUpdate = $NewValue
                }
            })
        }
        
        $CompositeUri = "$InstanceUrl/services/data/v59.0/composite/sobjects"
        $CompositeResponse = Invoke-RestMethod -Uri $CompositeUri -Method Patch -Headers $Headers -Body ($CompositeRequest | ConvertTo-Json -Depth 10)
        
        $SuccessCount += ($CompositeResponse | Where-Object { $_.success }).Count
        $FailCount += ($CompositeResponse | Where-Object { -not $_.success }).Count
        
        Write-Host "  Processed batch $([Math]::Ceiling(($i + 1) / $BatchSize))" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Bulk update completed" -ForegroundColor Green
    Write-Host "  Field: $FieldToUpdate" -ForegroundColor Cyan
    Write-Host "  New Value: $NewValue" -ForegroundColor Cyan
    Write-Host "  Records Updated: $SuccessCount" -ForegroundColor Green
    Write-Host "  Records Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Bulk update failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-recycle-bin-export',
    name: 'Export Recycle Bin Records',
    category: 'Data Management',
    description: 'Export deleted records from the recycle bin for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\recycle-bin.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Recycle Bin Records
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query deleted records using queryAll
    $Query = "SELECT Id, Name, IsDeleted, CreatedDate, LastModifiedDate FROM $ObjectName WHERE IsDeleted = true"
    $Uri = "$InstanceUrl/services/data/v59.0/queryAll?q=$([uri]::EscapeDataString($Query))"
    
    $DeletedRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $DeletedRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $DeletedRecords | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Recycle Bin Export completed" -ForegroundColor Green
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Deleted Records Found: $($DeletedRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    if ($DeletedRecords.Count -gt 0) {
        Write-Host ""
        Write-Host "Recent Deletions:" -ForegroundColor Yellow
        $DeletedRecords | Sort-Object LastModifiedDate -Descending | Select-Object -First 10 | ForEach-Object {
            Write-Host "  - $($_.Name) (Deleted: $($_.LastModifiedDate))" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Recycle bin export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== ADDITIONAL USER MANAGEMENT ====================
  {
    id: 'sf-user-login-forensics',
    name: 'User Login Forensics',
    category: 'User Management',
    description: 'Detailed login analysis for a specific user including IP addresses and login patterns',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: '005...' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\login-forensics.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const userId = escapePowerShellString(params.userId);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce User Login Forensics
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$UserId = "${userId}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get user info
    $UserUri = "$InstanceUrl/services/data/v59.0/sobjects/User/$UserId"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    Write-Host "Login Forensics for: $($User.Name)" -ForegroundColor Yellow
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    # Get login history
    $Query = "SELECT Id, LoginTime, LoginType, Status, SourceIp, Browser, Platform, Application, AuthenticationServiceId FROM LoginHistory WHERE UserId = '$UserId' AND LoginTime >= $StartDate ORDER BY LoginTime DESC"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $Logins = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $Logins += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $Logins | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Analysis
    $SuccessLogins = ($Logins | Where-Object { $_.Status -eq 'Success' }).Count
    $FailedLogins = ($Logins | Where-Object { $_.Status -ne 'Success' }).Count
    $UniqueIPs = ($Logins | Select-Object -Property SourceIp -Unique).Count
    $UniqueBrowsers = ($Logins | Select-Object -Property Browser -Unique).Count
    
    Write-Host ""
    Write-Host "Summary (Last $Days days):" -ForegroundColor Yellow
    Write-Host "  Total Login Attempts: $($Logins.Count)" -ForegroundColor Cyan
    Write-Host "  Successful: $SuccessLogins" -ForegroundColor Green
    Write-Host "  Failed: $FailedLogins" -ForegroundColor $(if ($FailedLogins -gt 0) { "Red" } else { "Green" })
    Write-Host "  Unique IP Addresses: $UniqueIPs" -ForegroundColor Cyan
    Write-Host "  Unique Browsers: $UniqueBrowsers" -ForegroundColor Cyan
    
    # Show IP distribution
    Write-Host ""
    Write-Host "Top IP Addresses:" -ForegroundColor Yellow
    $Logins | Group-Object -Property SourceIp | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) logins" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Login forensics failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-inactive-users-report',
    name: 'Inactive Users Report',
    category: 'User Management',
    description: 'Identify users who have not logged in for a specified period',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'inactiveDays', label: 'Days Since Last Login', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\inactive-users.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const inactiveDays = params.inactiveDays || 90;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Inactive Users Report
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$InactiveDays = ${inactiveDays}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $CutoffDate = (Get-Date).AddDays(-$InactiveDays).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    $Query = "SELECT Id, Name, Username, Email, Profile.Name, UserRole.Name, LastLoginDate, IsActive, CreatedDate FROM User WHERE IsActive = true AND (LastLoginDate < $CutoffDate OR LastLoginDate = null) ORDER BY LastLoginDate ASC NULLS FIRST"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $InactiveUsers = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $InactiveUsers += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $InactiveUsers | Select-Object Id, Name, Username, Email,
        @{N='Profile';E={$_.Profile.Name}},
        @{N='Role';E={$_.UserRole.Name}},
        LastLoginDate, CreatedDate,
        @{N='DaysSinceLogin';E={
            if ($_.LastLoginDate) {
                [math]::Round(((Get-Date) - [DateTime]$_.LastLoginDate).TotalDays)
            } else {
                "Never"
            }
        }}
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    $NeverLoggedIn = ($InactiveUsers | Where-Object { $null -eq $_.LastLoginDate }).Count
    
    Write-Host "Inactive Users Report" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "  Inactive Threshold: $InactiveDays days" -ForegroundColor Cyan
    Write-Host "  Total Inactive Users: $($InactiveUsers.Count)" -ForegroundColor Yellow
    Write-Host "  Never Logged In: $NeverLoggedIn" -ForegroundColor Red
    Write-Host ""
    
    # Group by profile
    $ByProfile = $InactiveUsers | Group-Object -Property { $_.Profile.Name } | Sort-Object Count -Descending
    Write-Host "By Profile:" -ForegroundColor Yellow
    $ByProfile | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Inactive users report failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-delegated-admins',
    name: 'List Delegated Administrators',
    category: 'User Management',
    description: 'Export all delegated admin groups and their members',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\delegated-admins.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce List Delegated Administrators
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query DelegatedAdmin groups
    $GroupQuery = "SELECT Id, DeveloperName, MasterLabel FROM DelegatedGroup"
    $GroupUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($GroupQuery))"
    
    $Groups = @()
    do {
        $Response = Invoke-RestMethod -Uri $GroupUri -Method Get -Headers $Headers
        $Groups += $Response.records
        $GroupUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($GroupUri)
    
    $AllMembers = @()
    
    foreach ($Group in $Groups) {
        # Get members
        $MemberQuery = "SELECT Id, DelegatedGroupId, MemberId FROM DelegatedGroupMember WHERE DelegatedGroupId = '$($Group.Id)'"
        $MemberUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($MemberQuery))"
        
        $Members = @()
        do {
            $MemberResponse = Invoke-RestMethod -Uri $MemberUri -Method Get -Headers $Headers
            $Members += $MemberResponse.records
            $MemberUri = if ($MemberResponse.nextRecordsUrl) { "$InstanceUrl$($MemberResponse.nextRecordsUrl)" } else { $null }
        } while ($MemberUri)
        
        foreach ($Member in $Members) {
            $AllMembers += [PSCustomObject]@{
                GroupId = $Group.Id
                GroupName = $Group.MasterLabel
                DeveloperName = $Group.DeveloperName
                MemberId = $Member.MemberId
            }
        }
    }
    
    $AllMembers | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Delegated Admin Groups exported" -ForegroundColor Green
    Write-Host "  Total Groups: $($Groups.Count)" -ForegroundColor Cyan
    Write-Host "  Total Memberships: $($AllMembers.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Delegated Admin Groups:" -ForegroundColor Yellow
    foreach ($Group in $Groups) {
        $MemberCount = ($AllMembers | Where-Object { $_.GroupId -eq $Group.Id }).Count
        Write-Host "  - $($Group.MasterLabel): $MemberCount members" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Delegated admin export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== ADDITIONAL SECURITY ====================
  {
    id: 'sf-field-level-security',
    name: 'Export Field Level Security',
    category: 'Security',
    description: 'Export field-level security settings for an object across all profiles',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\field-security.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Field Level Security
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query field permissions
    $Query = "SELECT Id, Parent.Profile.Name, Field, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE SobjectType = '$ObjectName'"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $AllRecords = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRecords += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $AllRecords | Select-Object Id,
        @{N='Profile';E={$_.Parent.Profile.Name}},
        @{N='Field';E={$_.Field -replace "^$ObjectName\\.", ""}},
        @{N='Readable';E={$_.PermissionsRead}},
        @{N='Editable';E={$_.PermissionsEdit}}
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary
    $UniqueProfiles = ($AllRecords | Select-Object -Property { $_.Parent.Profile.Name } -Unique).Count
    $UniqueFields = ($AllRecords | Select-Object -Property Field -Unique).Count
    
    Write-Host "Field Level Security Export" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "  Object: $ObjectName" -ForegroundColor Cyan
    Write-Host "  Profiles Analyzed: $UniqueProfiles" -ForegroundColor Cyan
    Write-Host "  Fields with Permissions: $UniqueFields" -ForegroundColor Cyan
    Write-Host "  Total Permission Records: $($AllRecords.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Field level security export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-session-management',
    name: 'Active Session Management',
    category: 'Security',
    description: 'View and export all active user sessions',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\active-sessions.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Active Session Management
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query active sessions
    $Query = "SELECT Id, UsersId, Users.Name, Users.Username, SessionType, SourceIp, LoginType, CreatedDate, LastModifiedDate FROM AuthSession"
    $Uri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    $Sessions = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $Sessions += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $ExportData = $Sessions | Select-Object Id,
        @{N='UserName';E={$_.Users.Name}},
        @{N='Username';E={$_.Users.Username}},
        SessionType, SourceIp, LoginType, CreatedDate, LastModifiedDate
    
    $ExportData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Analysis
    $UniqueUsers = ($Sessions | Select-Object -Property UsersId -Unique).Count
    $UniqueIPs = ($Sessions | Select-Object -Property SourceIp -Unique).Count
    
    Write-Host "Active Sessions Report" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "  Total Active Sessions: $($Sessions.Count)" -ForegroundColor Cyan
    Write-Host "  Unique Users: $UniqueUsers" -ForegroundColor Cyan
    Write-Host "  Unique IP Addresses: $UniqueIPs" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Sessions by Type:" -ForegroundColor Yellow
    $Sessions | Group-Object -Property SessionType | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Top Users by Session Count:" -ForegroundColor Yellow
    $Sessions | Group-Object -Property { $_.Users.Name } | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) sessions" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Session management export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-sharing-rules',
    name: 'Export Sharing Rules',
    category: 'Security',
    description: 'Export all sharing rules for an object',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'objectName', label: 'Object API Name', type: 'text', required: true, placeholder: 'Account' },
      { id: 'exportPath', label: 'Export JSON Path', type: 'path', required: true, placeholder: 'C:\\Reports\\sharing-rules.json' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const objectName = escapePowerShellString(params.objectName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Export Sharing Rules
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$ObjectName = "${objectName}"
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get object describe for sharing info
    $DescribeUri = "$InstanceUrl/services/data/v59.0/sobjects/$ObjectName/describe"
    $Describe = Invoke-RestMethod -Uri $DescribeUri -Method Get -Headers $Headers
    
    Write-Host "Sharing Model for $ObjectName" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    # Get organization-wide defaults via Tooling API
    $OWDQuery = "SELECT Id, Name, ExternalSharingModel, InternalSharingModel FROM CustomObject WHERE DeveloperName = '$($ObjectName -replace '__c$', '')'"
    $OWDUri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($OWDQuery))"
    
    try {
        $OWD = Invoke-RestMethod -Uri $OWDUri -Method Get -Headers $Headers
        if ($OWD.records.Count -gt 0) {
            Write-Host "Organization-Wide Defaults:" -ForegroundColor Yellow
            Write-Host "  Internal: $($OWD.records[0].InternalSharingModel)" -ForegroundColor Cyan
            Write-Host "  External: $($OWD.records[0].ExternalSharingModel)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Note: Could not retrieve OWD (may be standard object)" -ForegroundColor Yellow
    }
    
    # Query sharing rules using metadata
    $SharingRuleQuery = "SELECT Id, DeveloperName, Name FROM SharingCriteriaRule WHERE ObjectType = '$ObjectName'"
    $SharingUri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($SharingRuleQuery))"
    
    $SharingRules = @()
    try {
        do {
            $Response = Invoke-RestMethod -Uri $SharingUri -Method Get -Headers $Headers
            $SharingRules += $Response.records
            $SharingUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
        } while ($SharingUri)
    } catch {
        Write-Host "Note: Could not retrieve criteria-based sharing rules" -ForegroundColor Yellow
    }
    
    $ExportData = @{
        Object = $ObjectName
        SharingRulesCount = $SharingRules.Count
        SharingRules = $SharingRules
        ExportDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    $ExportData | ConvertTo-Json -Depth 10 | Out-File $ExportPath
    
    Write-Host ""
    Write-Host "Sharing Rules:" -ForegroundColor Yellow
    if ($SharingRules.Count -gt 0) {
        foreach ($Rule in $SharingRules) {
            Write-Host "  - $($Rule.Name)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  No criteria-based sharing rules found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Sharing rules export failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== ADDITIONAL REPORTING ====================
  {
    id: 'sf-dashboard-refresh',
    name: 'Refresh Dashboard',
    category: 'Reporting',
    description: 'Programmatically refresh a Salesforce dashboard',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'dashboardId', label: 'Dashboard ID', type: 'text', required: true, placeholder: '01Z...' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const dashboardId = escapePowerShellString(params.dashboardId);
      
      return `# Salesforce Refresh Dashboard
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$DashboardId = "${dashboardId}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Get dashboard metadata
    $MetaUri = "$InstanceUrl/services/data/v59.0/analytics/dashboards/$DashboardId"
    $Dashboard = Invoke-RestMethod -Uri $MetaUri -Method Get -Headers $Headers
    
    Write-Host "Refreshing Dashboard: $($Dashboard.name)" -ForegroundColor Yellow
    
    # Refresh the dashboard
    $RefreshUri = "$InstanceUrl/services/data/v59.0/analytics/dashboards/$DashboardId"
    $RefreshBody = @{} | ConvertTo-Json
    $RefreshedDashboard = Invoke-RestMethod -Uri $RefreshUri -Method Put -Headers $Headers -Body $RefreshBody
    
    Write-Host "Dashboard refreshed successfully" -ForegroundColor Green
    Write-Host "  Dashboard: $($RefreshedDashboard.name)" -ForegroundColor Cyan
    Write-Host "  Running User: $($RefreshedDashboard.runningUser.displayName)" -ForegroundColor Cyan
    Write-Host "  Component Count: $($RefreshedDashboard.components.Count)" -ForegroundColor Cyan
    Write-Host "  Last Refresh: $(Get-Date)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Dashboard refresh failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-user-adoption-metrics',
    name: 'User Adoption Metrics',
    category: 'Reporting',
    description: 'Generate comprehensive user adoption metrics including login frequency and feature usage',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'days', label: 'Days of History', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\adoption-metrics.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce User Adoption Metrics
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Days = ${days}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddT00:00:00Z")
    
    # Get active users
    $UserQuery = "SELECT Id, Name, Username, Profile.Name, LastLoginDate, IsActive FROM User WHERE IsActive = true"
    $UserUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($UserQuery))"
    
    $Users = @()
    do {
        $Response = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
        $Users += $Response.records
        $UserUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($UserUri)
    
    # Get login history for each user
    $LoginQuery = "SELECT UserId, COUNT(Id) LoginCount FROM LoginHistory WHERE LoginTime >= $StartDate GROUP BY UserId"
    $LoginUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($LoginQuery))"
    
    $LoginCounts = @{}
    do {
        $Response = Invoke-RestMethod -Uri $LoginUri -Method Get -Headers $Headers
        foreach ($Record in $Response.records) {
            $LoginCounts[$Record.UserId] = $Record.LoginCount
        }
        $LoginUri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($LoginUri)
    
    $Metrics = $Users | ForEach-Object {
        $LoginCount = if ($LoginCounts[$_.Id]) { $LoginCounts[$_.Id] } else { 0 }
        $DaysSinceLogin = if ($_.LastLoginDate) { 
            [math]::Round(((Get-Date) - [DateTime]$_.LastLoginDate).TotalDays)
        } else { 
            -1 
        }
        
        [PSCustomObject]@{
            UserId = $_.Id
            Name = $_.Name
            Username = $_.Username
            Profile = $_.Profile.Name
            LoginCount = $LoginCount
            AvgLoginsPerWeek = [math]::Round($LoginCount / ($Days / 7), 1)
            LastLoginDate = $_.LastLoginDate
            DaysSinceLogin = $DaysSinceLogin
            AdoptionScore = if ($LoginCount -eq 0) { 0 } elseif ($LoginCount -ge $Days) { 100 } else { [math]::Round(($LoginCount / $Days) * 100) }
        }
    }
    
    $Metrics | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary statistics
    $TotalUsers = $Users.Count
    $ActiveUsers = ($Metrics | Where-Object { $_.LoginCount -gt 0 }).Count
    $AdoptionRate = [math]::Round(($ActiveUsers / $TotalUsers) * 100, 1)
    $AvgLogins = [math]::Round(($Metrics | Measure-Object -Property LoginCount -Average).Average, 1)
    
    Write-Host "User Adoption Metrics" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "  Analysis Period: Last $Days days" -ForegroundColor Cyan
    Write-Host "  Total Active Users: $TotalUsers" -ForegroundColor Cyan
    Write-Host "  Users Who Logged In: $ActiveUsers" -ForegroundColor Cyan
    Write-Host "  Adoption Rate: $AdoptionRate%" -ForegroundColor $(if ($AdoptionRate -ge 80) { "Green" } elseif ($AdoptionRate -ge 50) { "Yellow" } else { "Red" })
    Write-Host "  Avg Logins Per User: $AvgLogins" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Top 5 Most Active Users:" -ForegroundColor Yellow
    $Metrics | Sort-Object LoginCount -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.LoginCount) logins" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Adoption metrics failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },

  // ==================== ADDITIONAL INTEGRATION ====================
  {
    id: 'sf-platform-events',
    name: 'Monitor Platform Events',
    category: 'Integration',
    description: 'Subscribe to and monitor Salesforce platform events',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'eventName', label: 'Platform Event API Name', type: 'text', required: true, placeholder: 'Order_Event__e' },
      { id: 'duration', label: 'Monitor Duration (seconds)', type: 'number', required: true, defaultValue: 60 }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const eventName = escapePowerShellString(params.eventName);
      const duration = params.duration || 60;
      
      return `# Salesforce Monitor Platform Events
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$EventName = "${eventName}"
$Duration = ${duration}
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Platform Event Monitor for: $EventName" -ForegroundColor Green
    Write-Host "Duration: $Duration seconds" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    # Get event describe
    $DescribeUri = "$InstanceUrl/services/data/v59.0/sobjects/$EventName/describe"
    try {
        $Describe = Invoke-RestMethod -Uri $DescribeUri -Method Get -Headers $Headers
        Write-Host "Event Found: $($Describe.label)" -ForegroundColor Green
        Write-Host "Fields:" -ForegroundColor Yellow
        $Describe.fields | Where-Object { $_.name -ne 'ReplayId' } | ForEach-Object {
            Write-Host "  - $($_.name) ($($_.type))" -ForegroundColor Cyan
        }
    } catch {
        Write-Error "Platform event '$EventName' not found"
        exit
    }
    
    Write-Host ""
    Write-Host "Note: Real-time event subscription requires CometD client." -ForegroundColor Yellow
    Write-Host "For full streaming, use Salesforce CLI: sfdx force:lightning:event:subscribe -e $EventName" -ForegroundColor Yellow
    Write-Host ""
    
    # Query recent events (if EventRelayConfig is available)
    Write-Host "Querying recent event history..." -ForegroundColor Yellow
    $Query = "SELECT Id, CreatedDate, CreatedById FROM $EventName ORDER BY CreatedDate DESC LIMIT 10"
    $QueryUri = "$InstanceUrl/services/data/v59.0/query?q=$([uri]::EscapeDataString($Query))"
    
    try {
        $Events = Invoke-RestMethod -Uri $QueryUri -Method Get -Headers $Headers
        Write-Host "Recent Events: $($Events.totalSize)" -ForegroundColor Cyan
        foreach ($Event in $Events.records) {
            Write-Host "  - Created: $($Event.CreatedDate)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Event history not available (may not be enabled)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Platform event monitoring failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-outbound-messages',
    name: 'Monitor Outbound Messages',
    category: 'Integration',
    description: 'Export and monitor outbound message queue status',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' },
      { id: 'hours', label: 'Hours of History', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\outbound-messages.csv' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      const hours = params.hours || 24;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Salesforce Monitor Outbound Messages
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$Hours = ${hours}
$ExportPath = "${exportPath}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $StartDate = (Get-Date).AddHours(-$Hours).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Query OutboundMessage objects
    $Query = "SELECT Id, Name FROM OutboundMessage"
    $Uri = "$InstanceUrl/services/data/v59.0/tooling/query?q=$([uri]::EscapeDataString($Query))"
    
    $Messages = @()
    do {
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $Messages += $Response.records
        $Uri = if ($Response.nextRecordsUrl) { "$InstanceUrl$($Response.nextRecordsUrl)" } else { $null }
    } while ($Uri)
    
    $Messages | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "Outbound Messages Configuration" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "  Configured Outbound Messages: $($Messages.Count)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Outbound Messages:" -ForegroundColor Yellow
    foreach ($Msg in $Messages) {
        Write-Host "  - $($Msg.Name)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Export Path: $ExportPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: To view delivery status, check Setup > Outbound Messages > View Status" -ForegroundColor Yellow
    
} catch {
    Write-Error "Outbound message monitoring failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  },
  {
    id: 'sf-api-usage-limits',
    name: 'Check API Usage Limits',
    category: 'Integration',
    description: 'Monitor current API usage against org limits',
    parameters: [
      { id: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://company.my.salesforce.com' }
    ],
    scriptTemplate: (params) => {
      const instanceUrl = escapePowerShellString(params.instanceUrl);
      
      return `# Salesforce Check API Usage Limits
# Generated: ${new Date().toISOString()}

$InstanceUrl = "${instanceUrl}"
$AccessToken = Read-Host -Prompt "Enter Salesforce Access Token" -AsSecureString
$AccessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AccessToken))

$Headers = @{
    "Authorization" = "Bearer $AccessTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "$InstanceUrl/services/data/v59.0/limits"
    $Limits = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Salesforce API Limits Report" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    # Key limits to monitor
    $KeyLimits = @(
        "DailyApiRequests",
        "DailyBulkApiRequests", 
        "DailyAsyncApexExecutions",
        "DailyWorkflowEmails",
        "DataStorageMB",
        "FileStorageMB",
        "HourlyTimeBasedWorkflow",
        "MassEmail",
        "SingleEmail",
        "StreamingApiConcurrentClients"
    )
    
    Write-Host "Critical API Limits:" -ForegroundColor Yellow
    foreach ($LimitName in $KeyLimits) {
        if ($Limits.$LimitName) {
            $Limit = $Limits.$LimitName
            $Used = $Limit.Max - $Limit.Remaining
            $PercentUsed = [math]::Round(($Used / $Limit.Max) * 100, 1)
            
            $Color = if ($PercentUsed -ge 90) { "Red" } elseif ($PercentUsed -ge 70) { "Yellow" } else { "Green" }
            
            Write-Host "  $LimitName" -ForegroundColor Cyan
            Write-Host "    Used: $Used / $($Limit.Max) ($PercentUsed%)" -ForegroundColor $Color
        }
    }
    
    Write-Host ""
    Write-Host "Storage:" -ForegroundColor Yellow
    if ($Limits.DataStorageMB) {
        $DataUsed = $Limits.DataStorageMB.Max - $Limits.DataStorageMB.Remaining
        $DataPercent = [math]::Round(($DataUsed / $Limits.DataStorageMB.Max) * 100, 1)
        Write-Host "  Data Storage: $DataUsed MB / $($Limits.DataStorageMB.Max) MB ($DataPercent%)" -ForegroundColor $(if ($DataPercent -ge 90) { "Red" } elseif ($DataPercent -ge 70) { "Yellow" } else { "Green" })
    }
    if ($Limits.FileStorageMB) {
        $FileUsed = $Limits.FileStorageMB.Max - $Limits.FileStorageMB.Remaining
        $FilePercent = [math]::Round(($FileUsed / $Limits.FileStorageMB.Max) * 100, 1)
        Write-Host "  File Storage: $FileUsed MB / $($Limits.FileStorageMB.Max) MB ($FilePercent%)" -ForegroundColor $(if ($FilePercent -ge 90) { "Red" } elseif ($FilePercent -ge 70) { "Yellow" } else { "Green" })
    }
    
    Write-Host ""
    Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Cyan
    
} catch {
    Write-Error "API limits check failed: $($_.Exception.Message)"
}`;
    },
    isPremium: true
  }
];

export function getSalesforceTasksByCategory(): Record<string, SalesforceTask[]> {
  return salesforceTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, SalesforceTask[]>);
}

export function getSalesforceTaskById(id: string): SalesforceTask | undefined {
  return salesforceTasks.find(task => task.id === id);
}
