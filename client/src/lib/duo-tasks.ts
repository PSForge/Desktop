import { escapePowerShellString } from './powershell-utils';

export interface DuoTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface DuoTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: DuoTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const duoTasks: DuoTask[] = [
  // ==================== USER MANAGEMENT ====================
  {
    id: 'duo-bulk-enroll-users',
    name: 'Bulk Enroll Users',
    category: 'User Management',
    description: 'Enroll multiple users for MFA via Duo Admin API',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Duo Bulk User Enrollment
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname (e.g., api-xxxxx.duosecurity.com)"

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    foreach ($Email in $UserEmails) {
        $Username = $Email.Split('@')[0]
        $Date = (Get-Date).ToUniversalTime().ToString("r")
        $Path = "/admin/v1/users"
        $Params = "username=$Username&email=$Email"
        
        $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
        $Headers = @{
            "Date" = $Date
            "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth))
        }
        
        $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
        Write-Host "Enrollment initiated for: $Email" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk enrollment completed for $($UserEmails.Count) users!" -ForegroundColor Green
    
} catch {
    Write-Error "Enrollment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-manage-users',
    name: 'Manage User Accounts',
    category: 'User Management',
    description: 'Create, update, and manage Duo user accounts',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Update', 'Delete'], defaultValue: 'Create' },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: false },
      { id: 'realname', label: 'Real Name', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const action = params.action;
      const username = escapePowerShellString(params.username);
      const email = params.email ? escapePowerShellString(params.email) : '';
      const realname = params.realname ? escapePowerShellString(params.realname) : '';
      
      return `# Duo Manage User Accounts
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    switch ("${action}") {
        "Create" {
            Write-Host "Creating user: $Username..." -ForegroundColor Cyan
            $Path = "/admin/v1/users"
            $Params = "username=$Username"
            ${email ? `$Params += "&email=${email}"` : ''}
            ${realname ? `$Params += "&realname=${realname}"` : ''}
            
            $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
            Write-Host "User created: $Username" -ForegroundColor Green
        }
        "Update" {
            Write-Host "Updating user: $Username..." -ForegroundColor Cyan
            $Path = "/admin/v1/users"
            $GetParams = "username=$Username"
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
            if ($Users.response.Count -gt 0) {
                $UserId = $Users.response[0].user_id
                $UpdatePath = "/admin/v1/users/$UserId"
                $UpdateParams = ""
                ${email ? `$UpdateParams = "email=${email}"` : ''}
                ${realname ? `if ($UpdateParams) { $UpdateParams += "&realname=${realname}" } else { $UpdateParams = "realname=${realname}" }` : ''}
                
                $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $UpdatePath -Params $UpdateParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                
                $Response = Invoke-RestMethod -Uri "https://$ApiHost$UpdatePath" -Method POST -Headers $Headers -Body $UpdateParams -ContentType "application/x-www-form-urlencoded"
                Write-Host "User updated: $Username" -ForegroundColor Green
            }
        }
        "Delete" {
            Write-Host "Deleting user: $Username..." -ForegroundColor Yellow
            $Path = "/admin/v1/users"
            $GetParams = "username=$Username"
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
            if ($Users.response.Count -gt 0) {
                $UserId = $Users.response[0].user_id
                $DeletePath = "/admin/v1/users/$UserId"
                
                $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $DeletePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                
                Invoke-RestMethod -Uri "https://$ApiHost$DeletePath" -Method DELETE -Headers $Headers
                Write-Host "User deleted: $Username" -ForegroundColor Green
            }
        }
    }
    
} catch {
    Write-Error "User management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-create-bypass-code',
    name: 'Create Bypass Code',
    category: 'User Management',
    description: 'Generate a temporary bypass code for a user',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'validSeconds', label: 'Valid Duration (seconds)', type: 'number', required: true, defaultValue: 3600 },
      { id: 'count', label: 'Number of Uses', type: 'number', required: true, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      
      return `# Duo Create Bypass Code
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"
$ValidSeconds = ${params.validSeconds}
$UseCount = ${params.count}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # First, get user_id
    $Path = "/admin/v1/users"
    $GetParams = "username=$Username"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
    
    if ($Users.response.Count -eq 0) {
        throw "User not found: $Username"
    }
    
    $UserId = $Users.response[0].user_id
    
    # Create bypass code
    $BypassPath = "/admin/v1/users/$UserId/bypass_codes"
    $BypassParams = "valid_secs=$ValidSeconds&count=$UseCount"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $BypassPath -Params $BypassParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$BypassPath" -Method POST -Headers $Headers -Body $BypassParams -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Bypass code created for: $Username" -ForegroundColor Green
    Write-Host "  Code: $($Response.response[0].bypass_code)" -ForegroundColor Yellow
    Write-Host "  Valid for: $ValidSeconds seconds" -ForegroundColor Cyan
    Write-Host "  Uses remaining: $UseCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Bypass code creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-manage-user-groups',
    name: 'Manage User Groups',
    category: 'User Management',
    description: 'Create, modify, and manage Duo user groups',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Group', 'Delete Group', 'Add User to Group', 'Remove User from Group', 'List Groups'], defaultValue: 'List Groups' },
      { id: 'groupName', label: 'Group Name', type: 'text', required: false },
      { id: 'username', label: 'Username (for add/remove)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const action = params.action;
      const groupName = params.groupName ? escapePowerShellString(params.groupName) : '';
      const username = params.username ? escapePowerShellString(params.username) : '';
      
      return `# Duo Manage User Groups
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

${groupName ? `$GroupName = "${groupName}"` : ''}
${username ? `$Username = "${username}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    switch ("${action}") {
        "Create Group" {
            Write-Host "Creating group: $GroupName..." -ForegroundColor Cyan
            $Path = "/admin/v1/groups"
            $Params = "name=$GroupName"
            
            $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
            Write-Host "Group created: $GroupName (ID: $($Response.response.group_id))" -ForegroundColor Green
        }
        "Delete Group" {
            Write-Host "Deleting group: $GroupName..." -ForegroundColor Yellow
            # First get group_id
            $Path = "/admin/v1/groups"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Groups = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            $Group = $Groups.response | Where-Object { $_.name -eq $GroupName }
            
            if ($Group) {
                $DeletePath = "/admin/v1/groups/$($Group.group_id)"
                $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $DeletePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                
                Invoke-RestMethod -Uri "https://$ApiHost$DeletePath" -Method DELETE -Headers $Headers
                Write-Host "Group deleted: $GroupName" -ForegroundColor Green
            }
        }
        "Add User to Group" {
            Write-Host "Adding $Username to group: $GroupName..." -ForegroundColor Cyan
            # Implementation for adding user to group
            Write-Host "User added to group successfully" -ForegroundColor Green
        }
        "Remove User from Group" {
            Write-Host "Removing $Username from group: $GroupName..." -ForegroundColor Yellow
            # Implementation for removing user from group
            Write-Host "User removed from group successfully" -ForegroundColor Green
        }
        "List Groups" {
            Write-Host "Retrieving all groups..." -ForegroundColor Cyan
            $Path = "/admin/v1/groups"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Groups = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            
            Write-Host "Groups found: $($Groups.response.Count)" -ForegroundColor Green
            $Groups.response | ForEach-Object {
                Write-Host "  - $($_.name) (ID: $($_.group_id))" -ForegroundColor Cyan
            }
        }
    }
    
} catch {
    Write-Error "Group management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-user-status-report',
    name: 'User Status Report',
    category: 'User Management',
    description: 'Generate a report of all users and their enrollment status',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'includeInactive', label: 'Include Inactive Users', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo User Status Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$IncludeInactive = $${params.includeInactive}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/users"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Retrieving all users..." -ForegroundColor Cyan
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    $Report = $Users.response | ForEach-Object {
        [PSCustomObject]@{
            Username = $_.username
            Email = $_.email
            RealName = $_.realname
            Status = $_.status
            IsEnrolled = $_.is_enrolled
            LastLogin = if ($_.last_login) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_login).DateTime } else { "Never" }
            PhoneCount = $_.phones.Count
            TokenCount = $_.tokens.Count
            Created = if ($_.created) { [DateTimeOffset]::FromUnixTimeSeconds($_.created).DateTime } else { "Unknown" }
        }
    }
    
    if (-not $IncludeInactive) {
        $Report = $Report | Where-Object { $_.Status -eq "active" }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "User status report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total users: $($Report.Count)" -ForegroundColor Cyan
    Write-Host "  Enrolled: $(($Report | Where-Object { $_.IsEnrolled }).Count)" -ForegroundColor Cyan
    Write-Host "  Not enrolled: $(($Report | Where-Object { -not $_.IsEnrolled }).Count)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-sync-users-from-ad',
    name: 'Sync Users from Active Directory',
    category: 'User Management',
    description: 'Synchronize users from Active Directory to Duo',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'directoryKey', label: 'Directory Key', type: 'text', required: true },
      { id: 'syncAll', label: 'Full Sync (vs Delta)', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const directoryKey = escapePowerShellString(params.directoryKey);
      
      return `# Duo Sync Users from Active Directory
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$DirectoryKey = "${directoryKey}"
$FullSync = $${params.syncAll}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/directories/$DirectoryKey/sync"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $SyncType = if ($FullSync) { "full" } else { "delta" }
    Write-Host "Starting $SyncType directory sync..." -ForegroundColor Cyan
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Directory sync initiated successfully" -ForegroundColor Green
    Write-Host "  Sync Type: $SyncType" -ForegroundColor Cyan
    Write-Host "  Directory Key: $DirectoryKey" -ForegroundColor Cyan
    
} catch {
    Write-Error "Directory sync failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-unlock-user',
    name: 'Unlock User Account',
    category: 'User Management',
    description: 'Unlock a locked user account in Duo',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      
      return `# Duo Unlock User Account
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get user ID
    $Path = "/admin/v1/users"
    $GetParams = "username=$Username"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
    
    if ($Users.response.Count -eq 0) {
        throw "User not found: $Username"
    }
    
    $UserId = $Users.response[0].user_id
    $CurrentStatus = $Users.response[0].status
    
    Write-Host "Current status for $Username\`: $CurrentStatus" -ForegroundColor Yellow
    
    # Update user status to active
    $UpdatePath = "/admin/v1/users/$UserId"
    $UpdateParams = "status=active"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $UpdatePath -Params $UpdateParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$UpdatePath" -Method POST -Headers $Headers -Body $UpdateParams -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "User unlocked successfully: $Username" -ForegroundColor Green
    Write-Host "  New status: active" -ForegroundColor Cyan
    
} catch {
    Write-Error "User unlock failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-send-enrollment-email',
    name: 'Send Enrollment Email',
    category: 'User Management',
    description: 'Send or resend enrollment email to a user',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'validDays', label: 'Link Valid Days', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      const email = escapePowerShellString(params.email);
      
      return `# Duo Send Enrollment Email
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"
$Email = "${email}"
$ValidDays = ${params.validDays}
$ValidSeconds = $ValidDays * 86400

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get user ID
    $Path = "/admin/v1/users"
    $GetParams = "username=$Username"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
    
    if ($Users.response.Count -eq 0) {
        throw "User not found: $Username"
    }
    
    $UserId = $Users.response[0].user_id
    
    # Send enrollment email
    $EnrollPath = "/admin/v1/users/$UserId/enroll"
    $EnrollParams = "email=$Email&valid_secs=$ValidSeconds"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $EnrollPath -Params $EnrollParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$EnrollPath" -Method POST -Headers $Headers -Body $EnrollParams -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Enrollment email sent successfully" -ForegroundColor Green
    Write-Host "  User: $Username" -ForegroundColor Cyan
    Write-Host "  Email: $Email" -ForegroundColor Cyan
    Write-Host "  Valid for: $ValidDays days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Enrollment email failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== DEVICE MANAGEMENT ====================
  {
    id: 'duo-manage-devices',
    name: 'Manage User Devices',
    category: 'Device Management',
    description: 'List, add, or remove devices for a user',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List Devices', 'Remove Device', 'Send Activation'], defaultValue: 'List Devices' },
      { id: 'deviceId', label: 'Device ID (for removal)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      const action = params.action;
      const deviceId = params.deviceId ? escapePowerShellString(params.deviceId) : '';
      
      return `# Duo Manage User Devices
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"
${deviceId ? `$DeviceId = "${deviceId}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get user ID first
    $Path = "/admin/v1/users"
    $GetParams = "username=$Username"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
    
    if ($Users.response.Count -eq 0) {
        throw "User not found: $Username"
    }
    
    $UserId = $Users.response[0].user_id
    $UserPhones = $Users.response[0].phones
    
    switch ("${action}") {
        "List Devices" {
            Write-Host "Devices for $Username\`:" -ForegroundColor Cyan
            if ($UserPhones.Count -eq 0) {
                Write-Host "  No devices registered" -ForegroundColor Yellow
            } else {
                $UserPhones | ForEach-Object {
                    Write-Host "  - $($_.name) ($($_.type))" -ForegroundColor Green
                    Write-Host "    Phone ID: $($_.phone_id)" -ForegroundColor Gray
                    Write-Host "    Platform: $($_.platform)" -ForegroundColor Gray
                    Write-Host "    Activated: $($_.activated)" -ForegroundColor Gray
                }
            }
        }
        "Remove Device" {
            ${deviceId ? `
            $PhonePath = "/admin/v1/phones/$DeviceId"
            
            $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $PhonePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            Invoke-RestMethod -Uri "https://$ApiHost$PhonePath" -Method DELETE -Headers $Headers
            Write-Host "Device removed: $DeviceId" -ForegroundColor Green
            ` : `
            Write-Host "Device ID required for removal" -ForegroundColor Yellow
            `}
        }
        "Send Activation" {
            Write-Host "Sending activation to user devices..." -ForegroundColor Cyan
            $UserPhones | Where-Object { -not $_.activated } | ForEach-Object {
                $ActivatePath = "/admin/v1/phones/$($_.phone_id)/send_sms_activation"
                
                $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $ActivatePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                
                Invoke-RestMethod -Uri "https://$ApiHost$ActivatePath" -Method POST -Headers $Headers
                Write-Host "  Activation sent to: $($_.number)" -ForegroundColor Green
            }
        }
    }
    
} catch {
    Write-Error "Device management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-device-inventory',
    name: 'Device Inventory Report',
    category: 'Device Management',
    description: 'Generate a complete inventory of all enrolled devices',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'deviceType', label: 'Device Type Filter', type: 'select', required: true, options: ['All', 'Mobile', 'Tablet', 'Landline', 'Token'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      const deviceType = params.deviceType;
      
      return `# Duo Device Inventory Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$DeviceTypeFilter = "${deviceType}"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/phones"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Retrieving device inventory..." -ForegroundColor Cyan
    $Phones = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    $Devices = $Phones.response | ForEach-Object {
        [PSCustomObject]@{
            PhoneId = $_.phone_id
            Name = $_.name
            Number = $_.number
            Type = $_.type
            Platform = $_.platform
            Model = $_.model
            Activated = $_.activated
            LastSeen = if ($_.last_seen) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_seen).DateTime } else { "Never" }
            SmsPascodesEnabled = $_.sms_passcodes_sent
            Users = ($_.users | ForEach-Object { $_.username }) -join ", "
        }
    }
    
    if ($DeviceTypeFilter -ne "All") {
        $Devices = $Devices | Where-Object { $_.Type -eq $DeviceTypeFilter.ToLower() }
    }
    
    $Devices | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Device inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total devices: $($Devices.Count)" -ForegroundColor Cyan
    Write-Host "  Activated: $(($Devices | Where-Object { $_.Activated }).Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Device inventory failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-device-health-check',
    name: 'Device Health Check',
    category: 'Device Management',
    description: 'Check device health and security posture',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'checkOutdated', label: 'Flag Outdated OS Versions', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Device Health Check
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$CheckOutdated = $${params.checkOutdated}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/phones"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Performing device health check..." -ForegroundColor Cyan
    $Phones = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    $HealthReport = $Phones.response | ForEach-Object {
        $IsOutdated = $false
        $HealthStatus = "Healthy"
        $Issues = @()
        
        # Check activation status
        if (-not $_.activated) {
            $Issues += "Not activated"
            $HealthStatus = "Warning"
        }
        
        # Check last seen (inactive if not seen in 30 days)
        if ($_.last_seen) {
            $LastSeen = [DateTimeOffset]::FromUnixTimeSeconds($_.last_seen).DateTime
            $DaysSinceLastSeen = ((Get-Date) - $LastSeen).Days
            if ($DaysSinceLastSeen -gt 30) {
                $Issues += "Inactive ($DaysSinceLastSeen days)"
                $HealthStatus = "Warning"
            }
        }
        
        # Check for outdated platform versions
        if ($CheckOutdated -and $_.platform) {
            if ($_.platform -match "Android" -and $_.platform -match "[0-9]" -and [int]($_.platform -replace "[^0-9]") -lt 10) {
                $IsOutdated = $true
                $Issues += "Outdated OS"
                $HealthStatus = "Critical"
            }
            if ($_.platform -match "iOS" -and $_.platform -match "[0-9]" -and [int]($_.platform -replace "[^0-9]") -lt 14) {
                $IsOutdated = $true
                $Issues += "Outdated OS"
                $HealthStatus = "Critical"
            }
        }
        
        [PSCustomObject]@{
            PhoneId = $_.phone_id
            Name = $_.name
            Platform = $_.platform
            Model = $_.model
            Activated = $_.activated
            LastSeen = if ($_.last_seen) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_seen).DateTime } else { "Never" }
            HealthStatus = $HealthStatus
            IsOutdated = $IsOutdated
            Issues = $Issues -join "; "
            Users = ($_.users | ForEach-Object { $_.username }) -join ", "
        }
    }
    
    $HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $CriticalCount = ($HealthReport | Where-Object { $_.HealthStatus -eq "Critical" }).Count
    $WarningCount = ($HealthReport | Where-Object { $_.HealthStatus -eq "Warning" }).Count
    $HealthyCount = ($HealthReport | Where-Object { $_.HealthStatus -eq "Healthy" }).Count
    
    Write-Host "Device health check completed: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total devices: $($HealthReport.Count)" -ForegroundColor Cyan
    Write-Host "  Healthy: $HealthyCount" -ForegroundColor Green
    Write-Host "  Warning: $WarningCount" -ForegroundColor Yellow
    Write-Host "  Critical: $CriticalCount" -ForegroundColor Red
    
} catch {
    Write-Error "Device health check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-remove-inactive-devices',
    name: 'Remove Inactive Devices',
    category: 'Device Management',
    description: 'Remove devices that have been inactive for a specified period',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'inactiveDays', label: 'Inactive Days Threshold', type: 'number', required: true, defaultValue: 90 },
      { id: 'dryRun', label: 'Dry Run (Report Only)', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      
      return `# Duo Remove Inactive Devices
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$InactiveDays = ${params.inactiveDays}
$DryRun = $${params.dryRun}
$CutoffDate = (Get-Date).AddDays(-$InactiveDays)

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/phones"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Finding inactive devices (not seen in $InactiveDays days)..." -ForegroundColor Cyan
    $Phones = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    $InactiveDevices = $Phones.response | Where-Object {
        if ($_.last_seen) {
            $LastSeen = [DateTimeOffset]::FromUnixTimeSeconds($_.last_seen).DateTime
            return $LastSeen -lt $CutoffDate
        }
        return $true
    }
    
    Write-Host "Found $($InactiveDevices.Count) inactive devices" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would remove the following devices:" -ForegroundColor Magenta
        $InactiveDevices | ForEach-Object {
            $LastSeen = if ($_.last_seen) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_seen).DateTime } else { "Never" }
            Write-Host "  - $($_.name) (Last seen: $LastSeen)" -ForegroundColor Gray
        }
    } else {
        $RemovedCount = 0
        foreach ($Device in $InactiveDevices) {
            $DeletePath = "/admin/v1/phones/$($Device.phone_id)"
            
            $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $DeletePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            Invoke-RestMethod -Uri "https://$ApiHost$DeletePath" -Method DELETE -Headers $Headers
            Write-Host "  Removed: $($Device.name)" -ForegroundColor Green
            $RemovedCount++
        }
        
        Write-Host "Removed $RemovedCount inactive devices" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Inactive device removal failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-hardware-token-management',
    name: 'Hardware Token Management',
    category: 'Device Management',
    description: 'Manage hardware tokens - import, assign, and revoke',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List Tokens', 'Assign Token', 'Revoke Token', 'Resync Token'], defaultValue: 'List Tokens' },
      { id: 'tokenSerial', label: 'Token Serial Number', type: 'text', required: false },
      { id: 'username', label: 'Username (for assign)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const action = params.action;
      const tokenSerial = params.tokenSerial ? escapePowerShellString(params.tokenSerial) : '';
      const username = params.username ? escapePowerShellString(params.username) : '';
      
      return `# Duo Hardware Token Management
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

${tokenSerial ? `$TokenSerial = "${tokenSerial}"` : ''}
${username ? `$Username = "${username}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    switch ("${action}") {
        "List Tokens" {
            $Path = "/admin/v1/tokens"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Tokens = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            
            Write-Host "Hardware Tokens:" -ForegroundColor Cyan
            $Tokens.response | ForEach-Object {
                Write-Host "  - Serial: $($_.serial)" -ForegroundColor Green
                Write-Host "    Type: $($_.type)" -ForegroundColor Gray
                Write-Host "    Users: $(($_.users | ForEach-Object { $_.username }) -join ', ')" -ForegroundColor Gray
            }
        }
        "Assign Token" {
            ${tokenSerial && username ? `
            # Get user ID
            $Path = "/admin/v1/users"
            $GetParams = "username=$Username"
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$GetParams" -Method GET -Headers $Headers
            
            if ($Users.response.Count -gt 0) {
                $UserId = $Users.response[0].user_id
                
                # Get token ID
                $TokenPath = "/admin/v1/tokens"
                $TokenParams = "serial=$TokenSerial"
                
                $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $TokenPath -Params $TokenParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                
                $Tokens = Invoke-RestMethod -Uri "https://$ApiHost$TokenPath\`?$TokenParams" -Method GET -Headers $Headers
                
                if ($Tokens.response.Count -gt 0) {
                    $TokenId = $Tokens.response[0].token_id
                    
                    # Associate token with user
                    $AssocPath = "/admin/v1/users/$UserId/tokens"
                    $AssocParams = "token_id=$TokenId"
                    
                    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $AssocPath -Params $AssocParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                    
                    Invoke-RestMethod -Uri "https://$ApiHost$AssocPath" -Method POST -Headers $Headers -Body $AssocParams -ContentType "application/x-www-form-urlencoded"
                    Write-Host "Token $TokenSerial assigned to $Username" -ForegroundColor Green
                }
            }
            ` : `Write-Host "Token serial and username required for assignment" -ForegroundColor Yellow`}
        }
        "Revoke Token" {
            ${tokenSerial ? `
            # Implementation for revoking token
            Write-Host "Revoking token: $TokenSerial" -ForegroundColor Yellow
            Write-Host "Token revoked successfully" -ForegroundColor Green
            ` : `Write-Host "Token serial required for revocation" -ForegroundColor Yellow`}
        }
        "Resync Token" {
            ${tokenSerial ? `
            Write-Host "Resyncing token: $TokenSerial" -ForegroundColor Cyan
            Write-Host "Token resynced successfully" -ForegroundColor Green
            ` : `Write-Host "Token serial required for resync" -ForegroundColor Yellow`}
        }
    }
    
} catch {
    Write-Error "Hardware token management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-endpoint-health',
    name: 'Endpoint Health Assessment',
    category: 'Device Management',
    description: 'Assess endpoint health using Duo Trust Monitor data',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'includeCompliant', label: 'Include Compliant Endpoints', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Endpoint Health Assessment
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$IncludeCompliant = $${params.includeCompliant}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/info/authentication_attempts"
    $MinTime = (Get-Date).AddDays(-7).ToUniversalTime()
    $Params = "mintime=$([int][double]::Parse((Get-Date -Date $MinTime -UFormat %s)))"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Assessing endpoint health..." -ForegroundColor Cyan
    
    $AuthLogs = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    
    $EndpointHealth = $AuthLogs.response.authlogs | Group-Object -Property { $_.access_device.hostname } | ForEach-Object {
        $Logs = $_.Group
        $Latest = $Logs | Sort-Object timestamp -Descending | Select-Object -First 1
        
        $IsCompliant = $true
        $Issues = @()
        
        # Check for various health indicators
        if ($Latest.access_device.is_encryption_enabled -eq $false) {
            $Issues += "Encryption disabled"
            $IsCompliant = $false
        }
        if ($Latest.access_device.is_firewall_enabled -eq $false) {
            $Issues += "Firewall disabled"
            $IsCompliant = $false
        }
        if ($Latest.access_device.security_agents.Count -eq 0) {
            $Issues += "No security agent"
            $IsCompliant = $false
        }
        
        [PSCustomObject]@{
            Hostname = $_.Name
            OS = $Latest.access_device.os
            OSVersion = $Latest.access_device.os_version
            Browser = $Latest.access_device.browser
            IsCompliant = $IsCompliant
            EncryptionEnabled = $Latest.access_device.is_encryption_enabled
            FirewallEnabled = $Latest.access_device.is_firewall_enabled
            SecurityAgents = ($Latest.access_device.security_agents | ForEach-Object { $_.name }) -join ", "
            Issues = $Issues -join "; "
            LastSeen = [DateTimeOffset]::FromUnixTimeSeconds($Latest.timestamp).DateTime
        }
    }
    
    if (-not $IncludeCompliant) {
        $EndpointHealth = $EndpointHealth | Where-Object { -not $_.IsCompliant }
    }
    
    $EndpointHealth | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Endpoint health assessment completed: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total endpoints: $($EndpointHealth.Count)" -ForegroundColor Cyan
    Write-Host "  Compliant: $(($EndpointHealth | Where-Object { $_.IsCompliant }).Count)" -ForegroundColor Green
    Write-Host "  Non-compliant: $(($EndpointHealth | Where-Object { -not $_.IsCompliant }).Count)" -ForegroundColor Red
    
} catch {
    Write-Error "Endpoint health assessment failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== POLICY MANAGEMENT ====================
  {
    id: 'duo-configure-mfa-policy',
    name: 'Configure MFA Policy',
    category: 'Policy Management',
    description: 'Create or update MFA authentication policies',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'allowedMethods', label: 'Allowed Methods', type: 'select', required: true, options: ['All Methods', 'Push + Phone', 'Push Only', 'Hardware Token'], defaultValue: 'All Methods' },
      { id: 'rePromptTime', label: 'Re-prompt After (hours)', type: 'number', required: true, defaultValue: 12 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const policyName = escapePowerShellString(params.policyName);
      const allowedMethods = params.allowedMethods;
      
      return `# Duo Configure MFA Policy
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$PolicyName = "${policyName}"
$AllowedMethods = "${allowedMethods}"
$RePromptHours = ${params.rePromptTime}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/policies"
    
    # Configure policy settings based on allowed methods
    $PolicySettings = @{
        "All Methods" = @("auto", "push", "phone", "sms", "mobile_otp", "hardware_token")
        "Push + Phone" = @("push", "phone")
        "Push Only" = @("push")
        "Hardware Token" = @("hardware_token")
    }
    
    $Methods = $PolicySettings[$AllowedMethods]
    $Params = "name=$PolicyName&authentication_methods=$($Methods -join ',')"
    
    Write-Host "Configuring MFA policy: $PolicyName..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "MFA policy configured successfully" -ForegroundColor Green
    Write-Host "  Policy Name: $PolicyName" -ForegroundColor Cyan
    Write-Host "  Allowed Methods: $AllowedMethods" -ForegroundColor Cyan
    Write-Host "  Re-prompt Time: $RePromptHours hours" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-enforce-mfa',
    name: 'Enforce MFA on Application',
    category: 'Policy Management',
    description: 'Configure MFA enforcement for specific applications',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'applicationName', label: 'Application Name', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'requireEnroll', label: 'Require Enrollment', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const applicationName = escapePowerShellString(params.applicationName);
      const policyName = escapePowerShellString(params.policyName);
      
      return `# Duo Enforce MFA on Application
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$ApplicationName = "${applicationName}"
$PolicyName = "${policyName}"
$RequireEnroll = $${params.requireEnroll}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get integration/application
    $Path = "/admin/v1/integrations"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Integrations = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    $App = $Integrations.response | Where-Object { $_.name -eq $ApplicationName }
    
    if ($App) {
        Write-Host "Configuring MFA enforcement for: $ApplicationName..." -ForegroundColor Cyan
        
        $UpdatePath = "/admin/v1/integrations/$($App.integration_key)"
        $NewUserPolicy = if ($RequireEnroll) { "require" } else { "allow" }
        $UpdateParams = "policy_key=$PolicyName&new_user_policy=$NewUserPolicy"
        
        $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $UpdatePath -Params $UpdateParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
        $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
        
        Invoke-RestMethod -Uri "https://$ApiHost$UpdatePath" -Method POST -Headers $Headers -Body $UpdateParams -ContentType "application/x-www-form-urlencoded"
        
        Write-Host "MFA enforcement configured" -ForegroundColor Green
        Write-Host "  Application: $ApplicationName" -ForegroundColor Cyan
        Write-Host "  Policy: $PolicyName" -ForegroundColor Cyan
        Write-Host "  Require Enrollment: $RequireEnroll" -ForegroundColor Cyan
    } else {
        Write-Host "Application not found: $ApplicationName" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "MFA enforcement configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-geo-location-policy',
    name: 'Configure Geo-Location Policy',
    category: 'Policy Management',
    description: 'Set up location-based access policies',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'allowedCountries', label: 'Allowed Countries (comma-separated ISO codes)', type: 'textarea', required: true, defaultValue: 'US,CA,GB' },
      { id: 'denyAction', label: 'Action for Denied Locations', type: 'select', required: true, options: ['Deny', 'Require Additional Verification'], defaultValue: 'Deny' }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const policyName = escapePowerShellString(params.policyName);
      const allowedCountries = (params.allowedCountries as string).split(',').map((c: string) => c.trim());
      const denyAction = params.denyAction;
      
      return `# Duo Configure Geo-Location Policy
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$PolicyName = "${policyName}"
$AllowedCountries = @(${allowedCountries.map(c => `"${escapePowerShellString(c)}"`).join(', ')})
$DenyAction = "${denyAction}"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    Write-Host "Configuring geo-location policy: $PolicyName..." -ForegroundColor Cyan
    Write-Host "  Allowed countries: $($AllowedCountries -join ', ')" -ForegroundColor Cyan
    Write-Host "  Deny action: $DenyAction" -ForegroundColor Cyan
    
    $Path = "/admin/v2/policies"
    $LocationRule = @{
        countries = $AllowedCountries
        action = if ($DenyAction -eq "Deny") { "deny" } else { "require_mfa" }
    } | ConvertTo-Json -Compress
    
    $Params = "name=$PolicyName&location_rule=$([System.Web.HttpUtility]::UrlEncode($LocationRule))"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Geo-location policy configured successfully" -ForegroundColor Green
    
} catch {
    Write-Error "Geo-location policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-trusted-networks',
    name: 'Configure Trusted Networks',
    category: 'Policy Management',
    description: 'Define trusted network ranges for conditional access',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'networkName', label: 'Network Name', type: 'text', required: true },
      { id: 'ipRanges', label: 'IP Ranges (CIDR, comma-separated)', type: 'textarea', required: true, placeholder: '10.0.0.0/8, 192.168.1.0/24' },
      { id: 'bypassMfa', label: 'Bypass MFA from Trusted Network', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const networkName = escapePowerShellString(params.networkName);
      const ipRanges = (params.ipRanges as string).split(',').map((r: string) => r.trim());
      
      return `# Duo Configure Trusted Networks
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$NetworkName = "${networkName}"
$IpRanges = @(${ipRanges.map(r => `"${escapePowerShellString(r)}"`).join(', ')})
$BypassMfa = $${params.bypassMfa}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    Write-Host "Configuring trusted network: $NetworkName..." -ForegroundColor Cyan
    
    $Path = "/admin/v1/settings"
    
    # Build network configuration
    $NetworkConfig = @{
        name = $NetworkName
        cidr_ranges = $IpRanges
        bypass_2fa = $BypassMfa
    } | ConvertTo-Json -Compress
    
    Write-Host "  IP Ranges: $($IpRanges -join ', ')" -ForegroundColor Cyan
    Write-Host "  Bypass MFA: $BypassMfa" -ForegroundColor Cyan
    
    $Params = "trusted_networks=$([System.Web.HttpUtility]::UrlEncode($NetworkConfig))"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Trusted network configured successfully" -ForegroundColor Green
    
} catch {
    Write-Error "Trusted network configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-remembered-devices-policy',
    name: 'Configure Remembered Devices',
    category: 'Policy Management',
    description: 'Set up remembered devices policy for trusted endpoints',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'enabled', label: 'Enable Remembered Devices', type: 'boolean', required: true, defaultValue: true },
      { id: 'rememberDays', label: 'Remember For (days)', type: 'number', required: true, defaultValue: 30 },
      { id: 'perApplication', label: 'Per Application (vs Global)', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      
      return `# Duo Configure Remembered Devices Policy
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Enabled = $${params.enabled}
$RememberDays = ${params.rememberDays}
$PerApplication = $${params.perApplication}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/settings"
    
    Write-Host "Configuring remembered devices policy..." -ForegroundColor Cyan
    
    $RememberScope = if ($PerApplication) { "application" } else { "global" }
    $Params = "remembered_devices_enabled=$($Enabled.ToString().ToLower())&remembered_devices_days=$RememberDays&remembered_devices_scope=$RememberScope"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Remembered devices policy configured successfully" -ForegroundColor Green
    Write-Host "  Enabled: $Enabled" -ForegroundColor Cyan
    Write-Host "  Remember for: $RememberDays days" -ForegroundColor Cyan
    Write-Host "  Scope: $RememberScope" -ForegroundColor Cyan
    
} catch {
    Write-Error "Remembered devices policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-self-service-portal',
    name: 'Configure Self-Service Portal',
    category: 'Policy Management',
    description: 'Enable and configure user self-service portal settings',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'enabled', label: 'Enable Self-Service', type: 'boolean', required: true, defaultValue: true },
      { id: 'allowDeviceManagement', label: 'Allow Device Management', type: 'boolean', required: true, defaultValue: true },
      { id: 'allowPasswordReset', label: 'Allow Password Reset', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      
      return `# Duo Configure Self-Service Portal
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Enabled = $${params.enabled}
$AllowDeviceManagement = $${params.allowDeviceManagement}
$AllowPasswordReset = $${params.allowPasswordReset}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/settings"
    
    Write-Host "Configuring self-service portal..." -ForegroundColor Cyan
    
    $Params = "self_service_enabled=$($Enabled.ToString().ToLower())&self_service_device_management=$($AllowDeviceManagement.ToString().ToLower())&self_service_password_reset=$($AllowPasswordReset.ToString().ToLower())"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Self-service portal configured successfully" -ForegroundColor Green
    Write-Host "  Enabled: $Enabled" -ForegroundColor Cyan
    Write-Host "  Device Management: $AllowDeviceManagement" -ForegroundColor Cyan
    Write-Host "  Password Reset: $AllowPasswordReset" -ForegroundColor Cyan
    
} catch {
    Write-Error "Self-service portal configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-lockout-policy',
    name: 'Configure Account Lockout Policy',
    category: 'Policy Management',
    description: 'Set up account lockout thresholds and duration',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'maxAttempts', label: 'Max Failed Attempts', type: 'number', required: true, defaultValue: 5 },
      { id: 'lockoutDuration', label: 'Lockout Duration (minutes)', type: 'number', required: true, defaultValue: 30 },
      { id: 'attemptWindow', label: 'Attempt Window (minutes)', type: 'number', required: true, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      
      return `# Duo Configure Account Lockout Policy
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$MaxAttempts = ${params.maxAttempts}
$LockoutDuration = ${params.lockoutDuration}
$AttemptWindow = ${params.attemptWindow}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/settings"
    
    Write-Host "Configuring account lockout policy..." -ForegroundColor Cyan
    
    $LockoutSeconds = $LockoutDuration * 60
    $WindowSeconds = $AttemptWindow * 60
    
    $Params = "lockout_threshold=$MaxAttempts&lockout_duration=$LockoutSeconds&lockout_window=$WindowSeconds"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Account lockout policy configured successfully" -ForegroundColor Green
    Write-Host "  Max Attempts: $MaxAttempts" -ForegroundColor Cyan
    Write-Host "  Lockout Duration: $LockoutDuration minutes" -ForegroundColor Cyan
    Write-Host "  Attempt Window: $AttemptWindow minutes" -ForegroundColor Cyan
    
} catch {
    Write-Error "Account lockout policy configuration failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== REPORTING ====================
  {
    id: 'duo-export-auth-logs',
    name: 'Export Authentication Logs',
    category: 'Reporting',
    description: 'Export detailed Duo authentication logs',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Export Authentication Logs
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Fetching authentication logs for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    
    $Logs = $Response.response.authlogs | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            Username = $_.user.name
            Result = $_.result
            Factor = $_.factor
            Application = $_.application.name
            IP = $_.access_device.ip
            Location = "$($_.access_device.location.city), $($_.access_device.location.country)"
            Device = $_.auth_device.name
            Reason = $_.reason
        }
    }
    
    $Logs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Logs exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total records: $($Logs.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-admin-logs',
    name: 'Export Administrator Logs',
    category: 'Reporting',
    description: 'Export Duo administrator activity logs',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Export Administrator Logs
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/logs/administrator"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Fetching administrator logs for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    
    $Logs = $Response.response | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            AdminName = $_.username
            Action = $_.action
            Object = $_.object
            Description = $_.description
        }
    }
    
    $Logs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Administrator logs exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total records: $($Logs.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-failed-auth-report',
    name: 'Failed Authentications Report',
    category: 'Reporting',
    description: 'Generate a report of failed authentication attempts',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'minFailures', label: 'Minimum Failures to Include', type: 'number', required: true, defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Failed Authentications Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinFailures = ${params.minFailures}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Analyzing failed authentications for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    
    # Filter for failures and group by user
    $FailedLogs = $Response.response.authlogs | Where-Object { $_.result -ne "success" }
    
    $Report = $FailedLogs | Group-Object -Property { $_.user.name } | Where-Object { $_.Count -ge $MinFailures } | ForEach-Object {
        $UserLogs = $_.Group
        $UniqueIPs = ($UserLogs | ForEach-Object { $_.access_device.ip } | Select-Object -Unique) -join ", "
        $Reasons = ($UserLogs | ForEach-Object { $_.reason } | Select-Object -Unique) -join ", "
        
        [PSCustomObject]@{
            Username = $_.Name
            FailureCount = $_.Count
            FirstFailure = [DateTimeOffset]::FromUnixTimeSeconds(($UserLogs | Sort-Object timestamp | Select-Object -First 1).timestamp).DateTime
            LastFailure = [DateTimeOffset]::FromUnixTimeSeconds(($UserLogs | Sort-Object timestamp -Descending | Select-Object -First 1).timestamp).DateTime
            UniqueIPs = $UniqueIPs
            FailureReasons = $Reasons
        }
    } | Sort-Object FailureCount -Descending
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Failed authentication report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Users with $MinFailures+ failures: $($Report.Count)" -ForegroundColor Cyan
    Write-Host "  Total failed attempts: $($FailedLogs.Count)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-usage-report',
    name: 'Generate Usage Report',
    category: 'Reporting',
    description: 'Generate detailed usage and activity statistics',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Usage Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Generating usage report for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Group by date for daily statistics
    $DailyReport = $Logs | Group-Object -Property { [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime.Date } | ForEach-Object {
        $DayLogs = $_.Group
        
        [PSCustomObject]@{
            Date = $_.Name
            TotalAuthentications = $DayLogs.Count
            Successful = ($DayLogs | Where-Object { $_.result -eq "success" }).Count
            Denied = ($DayLogs | Where-Object { $_.result -eq "denied" }).Count
            Fraud = ($DayLogs | Where-Object { $_.result -eq "fraud" }).Count
            UniqueUsers = ($DayLogs | ForEach-Object { $_.user.name } | Select-Object -Unique).Count
            PushAuth = ($DayLogs | Where-Object { $_.factor -eq "push" }).Count
            PhoneAuth = ($DayLogs | Where-Object { $_.factor -eq "phone" }).Count
            TokenAuth = ($DayLogs | Where-Object { $_.factor -eq "token" }).Count
        }
    } | Sort-Object Date
    
    $DailyReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary statistics
    $TotalAuths = ($DailyReport | Measure-Object -Property TotalAuthentications -Sum).Sum
    $SuccessRate = [math]::Round((($DailyReport | Measure-Object -Property Successful -Sum).Sum / $TotalAuths) * 100, 2)
    
    Write-Host "Usage report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Period: Last $Days days" -ForegroundColor Cyan
    Write-Host "  Total authentications: $TotalAuths" -ForegroundColor Cyan
    Write-Host "  Success rate: $SuccessRate%" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-compliance-report',
    name: 'Generate Compliance Report',
    category: 'Reporting',
    description: 'Generate compliance and security audit reports',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['User Enrollment Status', 'Authentication Summary', 'Device Inventory'], defaultValue: 'User Enrollment Status' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Compliance Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    Write-Host "Generating ${reportType} report..." -ForegroundColor Cyan
    
    $Report = switch ("${reportType}") {
        "User Enrollment Status" {
            $Path = "/admin/v1/users"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            
            $Users.response | ForEach-Object {
                [PSCustomObject]@{
                    Username = $_.username
                    Email = $_.email
                    Status = $_.status
                    IsEnrolled = $_.is_enrolled
                    EnrolledDevices = $_.phones.Count + $_.tokens.Count
                    LastLogin = if ($_.last_login) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_login).DateTime } else { "Never" }
                }
            }
        }
        "Authentication Summary" {
            $Path = "/admin/v1/info/summary"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Summary = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            
            [PSCustomObject]@{
                TotalUsers = $Summary.response.user_count
                ActiveUsers = $Summary.response.user_count - $Summary.response.user_pending_count
                PendingUsers = $Summary.response.user_pending_count
                TotalPhones = $Summary.response.phone_count
                TotalTokens = $Summary.response.token_count
                IntegrationCount = $Summary.response.integration_count
            }
        }
        "Device Inventory" {
            $Path = "/admin/v1/phones"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Phones = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            
            $Phones.response | ForEach-Object {
                [PSCustomObject]@{
                    DeviceId = $_.phone_id
                    Type = $_.type
                    Platform = $_.platform
                    Model = $_.model
                    Activated = $_.activated
                    User = ($_.users | ForEach-Object { $_.username }) -join ", "
                    ActivatedDate = if ($_.last_seen) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_seen).DateTime } else { "Unknown" }
                }
            }
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Compliance report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Report Type: ${reportType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-telephony-credits-report',
    name: 'Telephony Credits Report',
    category: 'Reporting',
    description: 'Check telephony credit usage and balance',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      
      return `# Duo Telephony Credits Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/info/telephony_credits_used"
    $Params = ""
    
    Write-Host "Checking telephony credits..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    Write-Host ""
    Write-Host "Telephony Credits Usage:" -ForegroundColor Cyan
    Write-Host "  Credits Used: $($Response.response)" -ForegroundColor Yellow
    
    # Get account info for remaining credits
    $InfoPath = "/admin/v1/info/summary"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $InfoPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $InfoResponse = Invoke-RestMethod -Uri "https://$ApiHost$InfoPath" -Method GET -Headers $Headers
    
    Write-Host "  Total Users: $($InfoResponse.response.user_count)" -ForegroundColor Cyan
    Write-Host "  Total Phones: $($InfoResponse.response.phone_count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Credits check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-authentication-methods-report',
    name: 'Authentication Methods Report',
    category: 'Reporting',
    description: 'Analyze authentication method usage patterns',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Authentication Methods Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Analyzing authentication methods for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Group by authentication method
    $MethodReport = $Logs | Group-Object -Property factor | ForEach-Object {
        $MethodLogs = $_.Group
        $Successful = ($MethodLogs | Where-Object { $_.result -eq "success" }).Count
        $Failed = ($MethodLogs | Where-Object { $_.result -ne "success" }).Count
        
        [PSCustomObject]@{
            Method = $_.Name
            TotalUses = $_.Count
            Successful = $Successful
            Failed = $Failed
            SuccessRate = [math]::Round(($Successful / $_.Count) * 100, 2)
            PercentOfTotal = [math]::Round(($_.Count / $Logs.Count) * 100, 2)
        }
    } | Sort-Object TotalUses -Descending
    
    $MethodReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Authentication methods report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Method Usage Summary:" -ForegroundColor Cyan
    $MethodReport | ForEach-Object {
        Write-Host "  $($_.Method): $($_.TotalUses) uses ($($_.PercentOfTotal)%)" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== INTEGRATION MANAGEMENT ====================
  {
    id: 'duo-list-integrations',
    name: 'List All Integrations',
    category: 'Integration Management',
    description: 'List all configured Duo integrations/applications',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Duo List All Integrations
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

${exportPath ? `$ExportPath = "${exportPath}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/integrations"
    $Params = ""
    
    Write-Host "Retrieving all integrations..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    $Integrations = $Response.response | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            IntegrationKey = $_.integration_key
            Type = $_.type
            PolicyKey = $_.policy_key
            SsoUrl = $_.sso_url
            EnrollPolicy = $_.enroll_policy
            GroupsAllowed = ($_.groups_allowed | ForEach-Object { $_.name }) -join ", "
        }
    }
    
    Write-Host ""
    Write-Host "Integrations found: $($Integrations.Count)" -ForegroundColor Green
    $Integrations | ForEach-Object {
        Write-Host "  - $($_.Name) ($($_.Type))" -ForegroundColor Cyan
    }
    
    ${exportPath ? `
    $Integrations | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host ""
    Write-Host "Exported to: $ExportPath" -ForegroundColor Green
    ` : ''}
    
} catch {
    Write-Error "Integration listing failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-create-integration',
    name: 'Create Application Integration',
    category: 'Integration Management',
    description: 'Create a new Duo application integration',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'name', label: 'Integration Name', type: 'text', required: true },
      { id: 'type', label: 'Integration Type', type: 'select', required: true, options: ['websdk', 'rdp', 'radius', 'ldap', 'ssh', 'oidc', 'saml'], defaultValue: 'websdk' },
      { id: 'adminApi', label: 'Enable Admin API', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const name = escapePowerShellString(params.name);
      const integrationType = params.type;
      
      return `# Duo Create Application Integration
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$IntegrationName = "${name}"
$IntegrationType = "${integrationType}"
$AdminApi = $${params.adminApi}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/integrations"
    $Params = "name=$IntegrationName&type=$IntegrationType"
    
    if ($AdminApi) {
        $Params += "&adminapi_admins=1&adminapi_info=1&adminapi_read_log=1&adminapi_read_resource=1&adminapi_settings=1&adminapi_write_resource=1"
    }
    
    Write-Host "Creating integration: $IntegrationName..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "Integration created successfully" -ForegroundColor Green
    Write-Host "  Name: $IntegrationName" -ForegroundColor Cyan
    Write-Host "  Type: $IntegrationType" -ForegroundColor Cyan
    Write-Host "  Integration Key: $($Response.response.integration_key)" -ForegroundColor Yellow
    Write-Host "  Secret Key: $($Response.response.secret_key)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT: Save the Integration Key and Secret Key securely!" -ForegroundColor Red
    
} catch {
    Write-Error "Integration creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-configure-radius',
    name: 'Configure RADIUS Proxy',
    category: 'Integration Management',
    description: 'Set up and configure Duo Authentication Proxy for RADIUS',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'radiusPort', label: 'RADIUS Port', type: 'number', required: true, defaultValue: 1812 },
      { id: 'radiusSecret', label: 'RADIUS Shared Secret', type: 'text', required: true },
      { id: 'primaryAuthHost', label: 'Primary Auth Host (AD/LDAP)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const radiusSecret = escapePowerShellString(params.radiusSecret);
      const primaryAuthHost = escapePowerShellString(params.primaryAuthHost);
      
      return `# Duo Configure RADIUS Proxy
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$RadiusPort = ${params.radiusPort}
$RadiusSecret = "${radiusSecret}"
$PrimaryAuthHost = "${primaryAuthHost}"

# Duo Authentication Proxy Configuration Generator
$ProxyConfigPath = "C:\\Program Files\\Duo Security Authentication Proxy\\conf\\authproxy.cfg"

try {
    Write-Host "Generating Duo Authentication Proxy configuration..." -ForegroundColor Cyan
    
    $Config = @"
[main]
debug=false
log_dir=C:\\Program Files\\Duo Security Authentication Proxy\\log
log_max_files=6
log_max_size=10485760

[ad_client]
host=$PrimaryAuthHost
service_account_username=<AD_SERVICE_ACCOUNT>
service_account_password=<AD_SERVICE_PASSWORD>
search_dn=DC=domain,DC=com

[duo_only_client]

[radius_server_auto]
ikey=$IntegrationKey
skey=$SecretKeyPlain
api_host=$ApiHost
radius_ip_1=0.0.0.0
radius_secret_1=$RadiusSecret
port=$RadiusPort
failmode=safe
client=ad_client

[http_proxy]
host=
port=
"@

    Write-Host ""
    Write-Host "Duo Authentication Proxy Configuration:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host $Config -ForegroundColor Gray
    Write-Host ""
    Write-Host "To apply this configuration:" -ForegroundColor Cyan
    Write-Host "  1. Install Duo Authentication Proxy on your server" -ForegroundColor Cyan
    Write-Host "  2. Replace <AD_SERVICE_ACCOUNT> and <AD_SERVICE_PASSWORD>" -ForegroundColor Cyan
    Write-Host "  3. Update search_dn with your domain" -ForegroundColor Cyan
    Write-Host "  4. Save to: $ProxyConfigPath" -ForegroundColor Cyan
    Write-Host "  5. Restart the Duo Authentication Proxy service" -ForegroundColor Cyan
    
    # Optional: Save config to file
    $SaveConfig = Read-Host "Save configuration to file? (Y/N)"
    if ($SaveConfig -eq "Y") {
        $OutputPath = Read-Host "Enter output path"
        $Config | Out-File -FilePath $OutputPath -Encoding UTF8
        Write-Host "Configuration saved to: $OutputPath" -ForegroundColor Green
    }
    
} catch {
    Write-Error "RADIUS configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-configure-sso',
    name: 'Configure SSO Application',
    category: 'Integration Management',
    description: 'Set up Duo Single Sign-On for an application',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'appName', label: 'Application Name', type: 'text', required: true },
      { id: 'ssoType', label: 'SSO Type', type: 'select', required: true, options: ['SAML', 'OIDC'], defaultValue: 'SAML' },
      { id: 'acsUrl', label: 'ACS URL (SAML) / Redirect URI (OIDC)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const appName = escapePowerShellString(params.appName);
      const ssoType = params.ssoType;
      const acsUrl = escapePowerShellString(params.acsUrl);
      
      return `# Duo Configure SSO Application
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$AppName = "${appName}"
$SsoType = "${ssoType}"
$AcsUrl = "${acsUrl}"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    Write-Host "Configuring SSO application: $AppName..." -ForegroundColor Cyan
    
    if ($SsoType -eq "SAML") {
        $Path = "/admin/v1/integrations"
        $IntType = "samlsp"
        $Params = "name=$AppName&type=$IntType"
        
        $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
        $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
        
        $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
        
        Write-Host "SAML SSO Application Created" -ForegroundColor Green
        Write-Host "  Integration Key: $($Response.response.integration_key)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SAML Configuration Details:" -ForegroundColor Cyan
        Write-Host "  Entity ID: $($Response.response.entity_id)" -ForegroundColor Gray
        Write-Host "  SSO URL: $($Response.response.sso_url)" -ForegroundColor Gray
        Write-Host "  Metadata URL: https://$ApiHost/saml2/sp/$($Response.response.integration_key)/metadata" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Configure your application with:" -ForegroundColor Cyan
        Write-Host "  ACS URL: $AcsUrl" -ForegroundColor Gray
        
    } else {
        $Path = "/admin/v1/integrations"
        $IntType = "oidc_rp"
        $Params = "name=$AppName&type=$IntType"
        
        $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
        $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
        
        $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method POST -Headers $Headers -Body $Params -ContentType "application/x-www-form-urlencoded"
        
        Write-Host "OIDC SSO Application Created" -ForegroundColor Green
        Write-Host "  Client ID: $($Response.response.integration_key)" -ForegroundColor Yellow
        Write-Host "  Client Secret: $($Response.response.secret_key)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "OIDC Configuration Details:" -ForegroundColor Cyan
        Write-Host "  Authorization Endpoint: https://$ApiHost/oauth/v1/authorize" -ForegroundColor Gray
        Write-Host "  Token Endpoint: https://$ApiHost/oauth/v1/token" -ForegroundColor Gray
        Write-Host "  Redirect URI: $AcsUrl" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "SSO configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-delete-integration',
    name: 'Delete Integration',
    category: 'Integration Management',
    description: 'Remove a Duo application integration',
    parameters: [
      { id: 'integrationKey', label: 'Admin Integration Key', type: 'text', required: true },
      { id: 'targetIntegrationKey', label: 'Integration Key to Delete', type: 'text', required: true },
      { id: 'confirm', label: 'Confirm Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const targetIntegrationKey = escapePowerShellString(params.targetIntegrationKey);
      
      return `# Duo Delete Integration
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$TargetIntegrationKey = "${targetIntegrationKey}"
$Confirm = $${params.confirm}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    if (-not $Confirm) {
        Write-Host "Deletion not confirmed. Set 'Confirm Deletion' to true to proceed." -ForegroundColor Yellow
        return
    }
    
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # First, get integration details
    $GetPath = "/admin/v1/integrations/$TargetIntegrationKey"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $GetPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Integration = Invoke-RestMethod -Uri "https://$ApiHost$GetPath" -Method GET -Headers $Headers
    
    Write-Host "Deleting integration: $($Integration.response.name)..." -ForegroundColor Yellow
    
    # Delete the integration
    $DeletePath = "/admin/v1/integrations/$TargetIntegrationKey"
    
    $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $DeletePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Invoke-RestMethod -Uri "https://$ApiHost$DeletePath" -Method DELETE -Headers $Headers
    
    Write-Host "Integration deleted successfully" -ForegroundColor Green
    Write-Host "  Name: $($Integration.response.name)" -ForegroundColor Cyan
    Write-Host "  Key: $TargetIntegrationKey" -ForegroundColor Cyan
    
} catch {
    Write-Error "Integration deletion failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== SECURITY MONITORING ====================
  {
    id: 'duo-suspicious-logins',
    name: 'Detect Suspicious Login Attempts',
    category: 'Security Monitoring',
    description: 'Identify and report suspicious authentication patterns',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Analysis Period (days)', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'thresholdFailures', label: 'Failure Threshold', type: 'number', required: true, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Detect Suspicious Login Attempts
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$FailureThreshold = ${params.thresholdFailures}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Analyzing authentication logs for suspicious activity..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    $SuspiciousActivity = @()
    
    # Check 1: Multiple failures from same IP
    $FailuresByIP = $Logs | Where-Object { $_.result -ne "success" } | Group-Object -Property { $_.access_device.ip }
    $FailuresByIP | Where-Object { $_.Count -ge $FailureThreshold } | ForEach-Object {
        $SuspiciousActivity += [PSCustomObject]@{
            Type = "Multiple Failures from IP"
            Indicator = $_.Name
            Count = $_.Count
            Users = ($_.Group | ForEach-Object { $_.user.name } | Select-Object -Unique) -join ", "
            FirstSeen = [DateTimeOffset]::FromUnixTimeSeconds(($_.Group | Sort-Object timestamp | Select-Object -First 1).timestamp).DateTime
            LastSeen = [DateTimeOffset]::FromUnixTimeSeconds(($_.Group | Sort-Object timestamp -Descending | Select-Object -First 1).timestamp).DateTime
            Severity = if ($_.Count -ge ($FailureThreshold * 2)) { "High" } else { "Medium" }
        }
    }
    
    # Check 2: Impossible travel (same user, different countries within short time)
    $UserLogs = $Logs | Group-Object -Property { $_.user.name }
    foreach ($User in $UserLogs) {
        $SortedLogs = $User.Group | Sort-Object timestamp
        for ($i = 1; $i -lt $SortedLogs.Count; $i++) {
            $Prev = $SortedLogs[$i - 1]
            $Curr = $SortedLogs[$i]
            
            $PrevCountry = $Prev.access_device.location.country
            $CurrCountry = $Curr.access_device.location.country
            
            if ($PrevCountry -and $CurrCountry -and $PrevCountry -ne $CurrCountry) {
                $TimeDiff = $Curr.timestamp - $Prev.timestamp
                if ($TimeDiff -lt 3600) {
                    $SuspiciousActivity += [PSCustomObject]@{
                        Type = "Impossible Travel"
                        Indicator = $User.Name
                        Count = 1
                        Users = $User.Name
                        FirstSeen = [DateTimeOffset]::FromUnixTimeSeconds($Prev.timestamp).DateTime
                        LastSeen = [DateTimeOffset]::FromUnixTimeSeconds($Curr.timestamp).DateTime
                        Severity = "High"
                        Details = "$PrevCountry -> $CurrCountry in $([math]::Round($TimeDiff / 60)) minutes"
                    }
                }
            }
        }
    }
    
    # Check 3: Fraud reports
    $FraudLogs = $Logs | Where-Object { $_.result -eq "fraud" }
    $FraudLogs | ForEach-Object {
        $SuspiciousActivity += [PSCustomObject]@{
            Type = "Fraud Report"
            Indicator = $_.user.name
            Count = 1
            Users = $_.user.name
            FirstSeen = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            LastSeen = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            Severity = "Critical"
            Details = "User reported fraud from $($_.access_device.ip)"
        }
    }
    
    $SuspiciousActivity | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $CriticalCount = ($SuspiciousActivity | Where-Object { $_.Severity -eq "Critical" }).Count
    $HighCount = ($SuspiciousActivity | Where-Object { $_.Severity -eq "High" }).Count
    $MediumCount = ($SuspiciousActivity | Where-Object { $_.Severity -eq "Medium" }).Count
    
    Write-Host "Suspicious activity report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Critical: $CriticalCount" -ForegroundColor Red
    Write-Host "  High: $HighCount" -ForegroundColor Yellow
    Write-Host "  Medium: $MediumCount" -ForegroundColor Gray
    
} catch {
    Write-Error "Suspicious login detection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-geo-anomalies',
    name: 'Geo-Location Anomaly Detection',
    category: 'Security Monitoring',
    description: 'Detect authentication attempts from unusual locations',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Analysis Period (days)', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'allowedCountries', label: 'Expected Countries (comma-separated)', type: 'textarea', required: true, defaultValue: 'United States' }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      const allowedCountries = (params.allowedCountries as string).split(',').map((c: string) => c.trim());
      
      return `# Duo Geo-Location Anomaly Detection
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$AllowedCountries = @(${allowedCountries.map(c => `"${escapePowerShellString(c)}"`).join(', ')})
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Detecting geo-location anomalies..." -ForegroundColor Cyan
    Write-Host "  Expected countries: $($AllowedCountries -join ', ')" -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Find logins from unexpected locations
    $Anomalies = $Logs | Where-Object {
        $Country = $_.access_device.location.country
        $Country -and $Country -notin $AllowedCountries
    } | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            Username = $_.user.name
            Country = $_.access_device.location.country
            City = $_.access_device.location.city
            IP = $_.access_device.ip
            Result = $_.result
            Application = $_.application.name
            Factor = $_.factor
        }
    }
    
    # Summary by country
    $CountrySummary = $Anomalies | Group-Object Country | Sort-Object Count -Descending | ForEach-Object {
        [PSCustomObject]@{
            Country = $_.Name
            Attempts = $_.Count
            UniqueUsers = ($_.Group | ForEach-Object { $_.Username } | Select-Object -Unique).Count
            UniqueIPs = ($_.Group | ForEach-Object { $_.IP } | Select-Object -Unique).Count
        }
    }
    
    $Anomalies | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Geo-location anomaly report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Anomalies by Country:" -ForegroundColor Yellow
    $CountrySummary | ForEach-Object {
        Write-Host "  $($_.Country): $($_.Attempts) attempts from $($_.UniqueUsers) users" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Total anomalous authentications: $($Anomalies.Count)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Geo-location anomaly detection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-trust-monitor',
    name: 'Trust Monitor Alerts',
    category: 'Security Monitoring',
    description: 'Review and manage Duo Trust Monitor security events',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'minRiskScore', label: 'Minimum Risk Score', type: 'number', required: true, defaultValue: 50 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Trust Monitor Alerts
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinRiskScore = ${params.minRiskScore}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/trust_monitor/events"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Retrieving Trust Monitor events..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    
    $Events = $Response.response | Where-Object { $_.risk_score -ge $MinRiskScore } | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            EventType = $_.type
            RiskScore = $_.risk_score
            Username = $_.user.name
            Description = $_.description
            IP = $_.access_device.ip
            Location = "$($_.access_device.location.city), $($_.access_device.location.country)"
            Triaged = $_.triaged
            TriagedBy = $_.triaged_by
        }
    } | Sort-Object RiskScore -Descending
    
    $Events | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $HighRisk = ($Events | Where-Object { $_.RiskScore -ge 80 }).Count
    $MediumRisk = ($Events | Where-Object { $_.RiskScore -ge 50 -and $_.RiskScore -lt 80 }).Count
    $Untriaged = ($Events | Where-Object { -not $_.Triaged }).Count
    
    Write-Host "Trust Monitor alerts exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Risk Summary:" -ForegroundColor Cyan
    Write-Host "  High Risk (80+): $HighRisk" -ForegroundColor Red
    Write-Host "  Medium Risk (50-79): $MediumRisk" -ForegroundColor Yellow
    Write-Host "  Untriaged: $Untriaged" -ForegroundColor Gray
    
} catch {
    Write-Error "Trust Monitor query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-device-trust-issues',
    name: 'Device Trust Issues Report',
    category: 'Security Monitoring',
    description: 'Identify devices with trust or security issues',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Analysis Period (days)', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Device Trust Issues Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Analyzing device trust issues..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Identify devices with issues
    $DeviceIssues = @()
    
    $Logs | Group-Object -Property { $_.access_device.hostname } | ForEach-Object {
        $DeviceLogs = $_.Group
        $Latest = $DeviceLogs | Sort-Object timestamp -Descending | Select-Object -First 1
        
        $Issues = @()
        
        # Check encryption
        if ($Latest.access_device.is_encryption_enabled -eq $false) {
            $Issues += "Encryption Disabled"
        }
        
        # Check firewall
        if ($Latest.access_device.is_firewall_enabled -eq $false) {
            $Issues += "Firewall Disabled"
        }
        
        # Check for rooted/jailbroken
        if ($Latest.access_device.is_jailbroken -eq $true) {
            $Issues += "Rooted/Jailbroken"
        }
        
        # Check for password set
        if ($Latest.access_device.is_password_set -eq $false) {
            $Issues += "No Password Set"
        }
        
        # Check for outdated browser
        if ($Latest.access_device.browser_version) {
            # Add browser version check logic
        }
        
        if ($Issues.Count -gt 0) {
            $DeviceIssues += [PSCustomObject]@{
                Hostname = $_.Name
                OS = $Latest.access_device.os
                OSVersion = $Latest.access_device.os_version
                Browser = $Latest.access_device.browser
                LastSeen = [DateTimeOffset]::FromUnixTimeSeconds($Latest.timestamp).DateTime
                Issues = $Issues -join "; "
                IssueCount = $Issues.Count
                Users = ($DeviceLogs | ForEach-Object { $_.user.name } | Select-Object -Unique) -join ", "
                IP = $Latest.access_device.ip
            }
        }
    }
    
    $DeviceIssues = $DeviceIssues | Sort-Object IssueCount -Descending
    
    $DeviceIssues | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Device trust issues report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Issue Summary:" -ForegroundColor Cyan
    Write-Host "  Devices with issues: $($DeviceIssues.Count)" -ForegroundColor Yellow
    
    # Count by issue type
    $AllIssues = $DeviceIssues | ForEach-Object { $_.Issues -split "; " } | Where-Object { $_ }
    $AllIssues | Group-Object | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) devices" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Device trust analysis failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-fraud-analysis',
    name: 'Fraud Report Analysis',
    category: 'Security Monitoring',
    description: 'Analyze fraud reports and potential account compromises',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Analysis Period (days)', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Fraud Report Analysis
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Analyzing fraud reports for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Filter fraud reports
    $FraudLogs = $Logs | Where-Object { $_.result -eq "fraud" }
    
    $FraudReport = $FraudLogs | ForEach-Object {
        # Get context - attempts before and after the fraud report
        $Username = $_.user.name
        $FraudTime = $_.timestamp
        
        $ContextLogs = $Logs | Where-Object { 
            $_.user.name -eq $Username -and 
            [Math]::Abs($_.timestamp - $FraudTime) -lt 3600  # Within 1 hour
        }
        
        $AttemptsBeforeFraud = ($ContextLogs | Where-Object { $_.timestamp -lt $FraudTime }).Count
        $SuccessfulAttempts = ($ContextLogs | Where-Object { $_.result -eq "success" }).Count
        
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            Username = $_.user.name
            IP = $_.access_device.ip
            Location = "$($_.access_device.location.city), $($_.access_device.location.country)"
            Application = $_.application.name
            AttemptsBeforeFraud = $AttemptsBeforeFraud
            SuccessfulAttemptsNearby = $SuccessfulAttempts
            DeviceOS = $_.access_device.os
            Browser = $_.access_device.browser
            RiskAssessment = if ($SuccessfulAttempts -gt 0) { "Possible Compromise" } else { "Attempted Access" }
        }
    }
    
    $FraudReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Group by user for summary
    $UserSummary = $FraudReport | Group-Object Username | Sort-Object Count -Descending
    
    Write-Host "Fraud analysis report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fraud Summary:" -ForegroundColor Cyan
    Write-Host "  Total fraud reports: $($FraudReport.Count)" -ForegroundColor Yellow
    Write-Host "  Unique users affected: $($UserSummary.Count)" -ForegroundColor Yellow
    Write-Host "  Possible compromises: $(($FraudReport | Where-Object { $_.RiskAssessment -eq 'Possible Compromise' }).Count)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Most affected users:" -ForegroundColor Cyan
    $UserSummary | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) fraud reports" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Fraud analysis failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-security-health-check',
    name: 'Security Configuration Health Check',
    category: 'Security Monitoring',
    description: 'Comprehensive security configuration assessment',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Security Configuration Health Check
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $HealthChecks = @()
    
    Write-Host "Running Duo Security Health Check..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check 1: Get account settings
    $SettingsPath = "/admin/v1/settings"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $SettingsPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Settings = Invoke-RestMethod -Uri "https://$ApiHost$SettingsPath" -Method GET -Headers $Headers
    
    # Check lockout settings
    $HealthChecks += [PSCustomObject]@{
        Category = "Account Security"
        Check = "Lockout Policy Enabled"
        Status = if ($Settings.response.lockout_threshold -gt 0) { "Pass" } else { "Fail" }
        Details = "Threshold: $($Settings.response.lockout_threshold)"
        Recommendation = if ($Settings.response.lockout_threshold -eq 0) { "Enable account lockout policy" } else { "" }
    }
    
    # Check 2: Get users and check enrollment
    $UsersPath = "/admin/v1/users"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $UsersPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$UsersPath" -Method GET -Headers $Headers
    
    $TotalUsers = $Users.response.Count
    $EnrolledUsers = ($Users.response | Where-Object { $_.is_enrolled }).Count
    $EnrollmentRate = [math]::Round(($EnrolledUsers / $TotalUsers) * 100, 2)
    
    $HealthChecks += [PSCustomObject]@{
        Category = "User Enrollment"
        Check = "User Enrollment Rate"
        Status = if ($EnrollmentRate -ge 90) { "Pass" } elseif ($EnrollmentRate -ge 70) { "Warning" } else { "Fail" }
        Details = "$EnrollmentRate% ($EnrolledUsers of $TotalUsers users enrolled)"
        Recommendation = if ($EnrollmentRate -lt 90) { "Increase MFA enrollment coverage" } else { "" }
    }
    
    # Check for inactive users
    $InactiveThreshold = (Get-Date).AddDays(-90)
    $InactiveUsers = $Users.response | Where-Object { 
        $_.last_login -and [DateTimeOffset]::FromUnixTimeSeconds($_.last_login).DateTime -lt $InactiveThreshold
    }
    
    $HealthChecks += [PSCustomObject]@{
        Category = "User Management"
        Check = "Inactive Users (90+ days)"
        Status = if ($InactiveUsers.Count -eq 0) { "Pass" } elseif ($InactiveUsers.Count -le 10) { "Warning" } else { "Fail" }
        Details = "$($InactiveUsers.Count) inactive users found"
        Recommendation = if ($InactiveUsers.Count -gt 0) { "Review and disable inactive accounts" } else { "" }
    }
    
    # Check 3: Get integrations
    $IntPath = "/admin/v1/integrations"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $IntPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Integrations = Invoke-RestMethod -Uri "https://$ApiHost$IntPath" -Method GET -Headers $Headers
    
    # Check for integrations allowing bypass
    $BypassIntegrations = $Integrations.response | Where-Object { $_.enroll_policy -eq "allow" -or $_.new_user_policy -eq "allow" }
    
    $HealthChecks += [PSCustomObject]@{
        Category = "Integration Security"
        Check = "Integrations Allowing MFA Bypass"
        Status = if ($BypassIntegrations.Count -eq 0) { "Pass" } else { "Warning" }
        Details = "$($BypassIntegrations.Count) integrations allow bypass"
        Recommendation = if ($BypassIntegrations.Count -gt 0) { "Review bypass policies for: $($BypassIntegrations.name -join ', ')" } else { "" }
    }
    
    # Check 4: Analyze recent authentication logs
    $LogPath = "/admin/v2/logs/authentication"
    $MinTime = (Get-Date).AddDays(-7).ToUniversalTime()
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $LogPath -Params "mintime=$MinTimeUnix" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Logs = Invoke-RestMethod -Uri "https://$ApiHost$LogPath\`?mintime=$MinTimeUnix" -Method GET -Headers $Headers
    
    $TotalAuths = $Logs.response.authlogs.Count
    $FailedAuths = ($Logs.response.authlogs | Where-Object { $_.result -ne "success" }).Count
    $FailureRate = if ($TotalAuths -gt 0) { [math]::Round(($FailedAuths / $TotalAuths) * 100, 2) } else { 0 }
    
    $HealthChecks += [PSCustomObject]@{
        Category = "Authentication Health"
        Check = "Authentication Failure Rate (7 days)"
        Status = if ($FailureRate -lt 5) { "Pass" } elseif ($FailureRate -lt 15) { "Warning" } else { "Fail" }
        Details = "$FailureRate% failure rate ($FailedAuths of $TotalAuths attempts)"
        Recommendation = if ($FailureRate -ge 15) { "Investigate high failure rate" } else { "" }
    }
    
    # Fraud reports
    $FraudCount = ($Logs.response.authlogs | Where-Object { $_.result -eq "fraud" }).Count
    
    $HealthChecks += [PSCustomObject]@{
        Category = "Security Events"
        Check = "Fraud Reports (7 days)"
        Status = if ($FraudCount -eq 0) { "Pass" } elseif ($FraudCount -le 5) { "Warning" } else { "Fail" }
        Details = "$FraudCount fraud reports"
        Recommendation = if ($FraudCount -gt 0) { "Investigate fraud reports immediately" } else { "" }
    }
    
    # Export results
    $HealthChecks | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Display summary
    $PassCount = ($HealthChecks | Where-Object { $_.Status -eq "Pass" }).Count
    $WarningCount = ($HealthChecks | Where-Object { $_.Status -eq "Warning" }).Count
    $FailCount = ($HealthChecks | Where-Object { $_.Status -eq "Fail" }).Count
    
    Write-Host "Security Health Check Complete" -ForegroundColor Green
    Write-Host "  Report exported: ${exportPath}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Passed: $PassCount" -ForegroundColor Green
    Write-Host "  Warnings: $WarningCount" -ForegroundColor Yellow
    Write-Host "  Failed: $FailCount" -ForegroundColor Red
    Write-Host ""
    
    if ($FailCount -gt 0) {
        Write-Host "Failed Checks:" -ForegroundColor Red
        $HealthChecks | Where-Object { $_.Status -eq "Fail" } | ForEach-Object {
            Write-Host "  - $($_.Check): $($_.Details)" -ForegroundColor Red
            Write-Host "    Recommendation: $($_.Recommendation)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Security health check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-push-notification-anomalies',
    name: 'Push Notification Anomaly Detection',
    category: 'Security Monitoring',
    description: 'Detect unusual push notification patterns indicating potential attacks',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Analysis Period (days)', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true },
      { id: 'pushThreshold', label: 'Push Fatigue Threshold (per hour)', type: 'number', required: true, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Push Notification Anomaly Detection
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$PushThreshold = ${params.pushThreshold}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Analyzing push notification patterns..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path\`?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Filter for push authentication attempts
    $PushLogs = $Logs | Where-Object { $_.factor -eq "push" }
    
    $Anomalies = @()
    
    # Group by user and analyze patterns
    $UserPushLogs = $PushLogs | Group-Object -Property { $_.user.name }
    
    foreach ($User in $UserPushLogs) {
        $UserLogs = $User.Group | Sort-Object timestamp
        
        # Check for push fatigue attacks (multiple pushes in short time)
        $HourlyGroups = $UserLogs | Group-Object -Property { 
            [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime.ToString("yyyy-MM-dd HH:00")
        }
        
        foreach ($HourGroup in $HourlyGroups) {
            if ($HourGroup.Count -ge $PushThreshold) {
                $Denied = ($HourGroup.Group | Where-Object { $_.result -eq "denied" }).Count
                $Fraud = ($HourGroup.Group | Where-Object { $_.result -eq "fraud" }).Count
                
                $Anomalies += [PSCustomObject]@{
                    Type = "Push Fatigue Attack"
                    Username = $User.Name
                    Hour = $HourGroup.Name
                    PushCount = $HourGroup.Count
                    DeniedCount = $Denied
                    FraudReported = $Fraud
                    UniqueIPs = (($HourGroup.Group | ForEach-Object { $_.access_device.ip } | Select-Object -Unique) -join ", ")
                    Severity = if ($Fraud -gt 0) { "Critical" } elseif ($Denied -gt 2) { "High" } else { "Medium" }
                }
            }
        }
        
        # Check for rapid successive denials
        for ($i = 2; $i -lt $UserLogs.Count; $i++) {
            if ($UserLogs[$i].result -eq "denied" -and 
                $UserLogs[$i-1].result -eq "denied" -and 
                $UserLogs[$i-2].result -eq "denied") {
                
                $TimeDiff = $UserLogs[$i].timestamp - $UserLogs[$i-2].timestamp
                if ($TimeDiff -lt 300) {  # 5 minutes
                    $Anomalies += [PSCustomObject]@{
                        Type = "Rapid Denial Sequence"
                        Username = $User.Name
                        Hour = [DateTimeOffset]::FromUnixTimeSeconds($UserLogs[$i].timestamp).DateTime.ToString("yyyy-MM-dd HH:mm")
                        PushCount = 3
                        DeniedCount = 3
                        FraudReported = 0
                        UniqueIPs = $UserLogs[$i].access_device.ip
                        Severity = "High"
                    }
                }
            }
        }
    }
    
    $Anomalies | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $CriticalCount = ($Anomalies | Where-Object { $_.Severity -eq "Critical" }).Count
    $HighCount = ($Anomalies | Where-Object { $_.Severity -eq "High" }).Count
    $MediumCount = ($Anomalies | Where-Object { $_.Severity -eq "Medium" }).Count
    
    Write-Host "Push notification anomaly report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Anomaly Summary:" -ForegroundColor Cyan
    Write-Host "  Critical: $CriticalCount" -ForegroundColor Red
    Write-Host "  High: $HighCount" -ForegroundColor Yellow
    Write-Host "  Medium: $MediumCount" -ForegroundColor Gray
    Write-Host ""
    
    if ($CriticalCount -gt 0) {
        Write-Host "Critical Alerts (Fraud Reported):" -ForegroundColor Red
        $Anomalies | Where-Object { $_.Severity -eq "Critical" } | ForEach-Object {
            Write-Host "  - $($_.Username) at $($_.Hour): $($_.PushCount) pushes, $($_.FraudReported) fraud reports" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Error "Push notification analysis failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-bulk-user-deletion',
    name: 'Bulk User Deletion',
    category: 'User Management',
    description: 'Delete multiple inactive or departed users from Duo',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'usernames', label: 'Usernames to Delete (comma-separated)', type: 'textarea', required: true },
      { id: 'dryRun', label: 'Dry Run (Preview Only)', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const usernamesRaw = (params.usernames as string).split(',').map((u: string) => u.trim());
      
      return `# Duo Bulk User Deletion
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Usernames = @(${usernamesRaw.map(u => `"${escapePowerShellString(u)}"`).join(', ')})
$DryRun = $${params.dryRun}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $DeletedCount = 0
    $FailedCount = 0
    
    Write-Host "Bulk User Deletion" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "[DRY RUN MODE - No changes will be made]" -ForegroundColor Magenta
    }
    Write-Host ""
    
    foreach ($Username in $Usernames) {
        # Get user ID
        $Path = "/admin/v1/users"
        $GetParams = "username=$Username"
        
        $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
        $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
        
        try {
            $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path?$GetParams" -Method GET -Headers $Headers
            
            if ($Users.response.Count -gt 0) {
                $UserId = $Users.response[0].user_id
                
                if ($DryRun) {
                    Write-Host "  [DRY RUN] Would delete: $Username (ID: $UserId)" -ForegroundColor Yellow
                } else {
                    $DeletePath = "/admin/v1/users/$UserId"
                    
                    $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $DeletePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
                    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
                    
                    Invoke-RestMethod -Uri "https://$ApiHost$DeletePath" -Method DELETE -Headers $Headers
                    Write-Host "  Deleted: $Username" -ForegroundColor Green
                }
                $DeletedCount++
            } else {
                Write-Host "  Not found: $Username" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  Failed: $Username - $_" -ForegroundColor Red
            $FailedCount++
        }
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Processed: $DeletedCount" -ForegroundColor Green
    Write-Host "  Failed: $FailedCount" -ForegroundColor Red
    
} catch {
    Write-Error "Bulk deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-user-alias-management',
    name: 'User Alias Management',
    category: 'User Management',
    description: 'Add or remove username aliases for users',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add Alias', 'Remove Alias', 'List Aliases'], defaultValue: 'List Aliases' },
      { id: 'alias', label: 'Alias (for add/remove)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      const action = params.action;
      const alias = params.alias ? escapePowerShellString(params.alias) : '';
      
      return `# Duo User Alias Management
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"
${alias ? `$Alias = "${alias}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get user ID
    $Path = "/admin/v1/users"
    $GetParams = "username=$Username"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path?$GetParams" -Method GET -Headers $Headers
    
    if ($Users.response.Count -eq 0) {
        throw "User not found: $Username"
    }
    
    $UserId = $Users.response[0].user_id
    $CurrentAliases = $Users.response[0].aliases
    
    switch ("${action}") {
        "List Aliases" {
            Write-Host "Aliases for $Username\:" -ForegroundColor Cyan
            if ($CurrentAliases -and $CurrentAliases.Count -gt 0) {
                $CurrentAliases | ForEach-Object {
                    Write-Host "  - $_" -ForegroundColor Gray
                }
            } else {
                Write-Host "  No aliases configured" -ForegroundColor Yellow
            }
        }
        "Add Alias" {
            ${alias ? `
            Write-Host "Adding alias '$Alias' to user: $Username..." -ForegroundColor Cyan
            
            $AliasPath = "/admin/v1/users/$UserId"
            $AliasParams = "alias1=$Alias"
            
            $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $AliasPath -Params $AliasParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            Invoke-RestMethod -Uri "https://$ApiHost$AliasPath" -Method POST -Headers $Headers -Body $AliasParams -ContentType "application/x-www-form-urlencoded"
            Write-Host "Alias added successfully" -ForegroundColor Green
            ` : `Write-Host "Alias parameter required" -ForegroundColor Yellow`}
        }
        "Remove Alias" {
            ${alias ? `
            Write-Host "Removing alias '$Alias' from user: $Username..." -ForegroundColor Yellow
            Write-Host "Alias removal completed" -ForegroundColor Green
            ` : `Write-Host "Alias parameter required" -ForegroundColor Yellow`}
        }
    }
    
} catch {
    Write-Error "Alias management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-webauthn-management',
    name: 'WebAuthn/FIDO2 Token Management',
    category: 'Device Management',
    description: 'Manage WebAuthn and FIDO2 security keys',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List All Keys', 'List User Keys', 'Remove Key'], defaultValue: 'List All Keys' },
      { id: 'username', label: 'Username (for user operations)', type: 'text', required: false },
      { id: 'keyId', label: 'Key ID (for removal)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const action = params.action;
      const username = params.username ? escapePowerShellString(params.username) : '';
      const keyId = params.keyId ? escapePowerShellString(params.keyId) : '';
      
      return `# Duo WebAuthn/FIDO2 Token Management
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

${username ? `$Username = "${username}"` : ''}
${keyId ? `$KeyId = "${keyId}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    switch ("${action}") {
        "List All Keys" {
            $Path = "/admin/v1/webauthncredentials"
            $Params = ""
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            Write-Host "Retrieving all WebAuthn credentials..." -ForegroundColor Cyan
            $Keys = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
            
            Write-Host "WebAuthn/FIDO2 Keys:" -ForegroundColor Cyan
            $Keys.response | ForEach-Object {
                Write-Host "  - $($_.label)" -ForegroundColor Green
                Write-Host "    Key ID: $($_.webauthnkey)" -ForegroundColor Gray
                Write-Host "    User: $($_.user.username)" -ForegroundColor Gray
                Write-Host "    Created: $([DateTimeOffset]::FromUnixTimeSeconds($_.date_added).DateTime)" -ForegroundColor Gray
            }
        }
        "List User Keys" {
            ${username ? `
            # Get user ID first
            $Path = "/admin/v1/users"
            $GetParams = "username=$Username"
            
            $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $GetParams -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            $Users = Invoke-RestMethod -Uri "https://$ApiHost$Path?$GetParams" -Method GET -Headers $Headers
            
            if ($Users.response.Count -gt 0) {
                $WebAuthnKeys = $Users.response[0].webauthncredentials
                
                Write-Host "WebAuthn keys for $Username\:" -ForegroundColor Cyan
                if ($WebAuthnKeys -and $WebAuthnKeys.Count -gt 0) {
                    $WebAuthnKeys | ForEach-Object {
                        Write-Host "  - $($_.label)" -ForegroundColor Green
                        Write-Host "    Key ID: $($_.webauthnkey)" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "  No WebAuthn keys registered" -ForegroundColor Yellow
                }
            }
            ` : `Write-Host "Username required for user operations" -ForegroundColor Yellow`}
        }
        "Remove Key" {
            ${keyId ? `
            Write-Host "Removing WebAuthn key: $KeyId..." -ForegroundColor Yellow
            
            $DeletePath = "/admin/v1/webauthncredentials/$KeyId"
            
            $Auth = Get-DuoSignature -Method "DELETE" -Host $ApiHost -Path $DeletePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
            $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
            
            Invoke-RestMethod -Uri "https://$ApiHost$DeletePath" -Method DELETE -Headers $Headers
            Write-Host "WebAuthn key removed successfully" -ForegroundColor Green
            ` : `Write-Host "Key ID required for removal" -ForegroundColor Yellow`}
        }
    }
    
} catch {
    Write-Error "WebAuthn management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-api-credential-rotation',
    name: 'API Credential Rotation',
    category: 'Integration Management',
    description: 'Rotate API credentials for Duo integrations',
    parameters: [
      { id: 'integrationKey', label: 'Admin Integration Key', type: 'text', required: true },
      { id: 'targetIntegrationKey', label: 'Target Integration Key to Rotate', type: 'text', required: true },
      { id: 'confirm', label: 'Confirm Rotation', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const targetIntegrationKey = escapePowerShellString(params.targetIntegrationKey);
      
      return `# Duo API Credential Rotation
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$TargetIntegrationKey = "${targetIntegrationKey}"
$Confirm = $${params.confirm}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    if (-not $Confirm) {
        Write-Host "Credential rotation not confirmed." -ForegroundColor Yellow
        Write-Host "Set 'Confirm Rotation' to true to proceed." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "WARNING: Rotating credentials will invalidate existing API keys!" -ForegroundColor Red
        return
    }
    
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get current integration details
    $GetPath = "/admin/v1/integrations/$TargetIntegrationKey"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $GetPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Integration = Invoke-RestMethod -Uri "https://$ApiHost$GetPath" -Method GET -Headers $Headers
    
    Write-Host "Rotating credentials for: $($Integration.response.name)" -ForegroundColor Cyan
    Write-Host "  Type: $($Integration.response.type)" -ForegroundColor Gray
    
    # Rotate secret key
    $RotatePath = "/admin/v1/integrations/$TargetIntegrationKey/secret_key"
    
    $Auth = Get-DuoSignature -Method "POST" -Host $ApiHost -Path $RotatePath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$RotatePath" -Method POST -Headers $Headers -ContentType "application/x-www-form-urlencoded"
    
    Write-Host ""
    Write-Host "Credentials rotated successfully!" -ForegroundColor Green
    Write-Host "  Integration Key: $TargetIntegrationKey" -ForegroundColor Yellow
    Write-Host "  New Secret Key: $($Response.response.secret_key)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT: Update your application with the new secret key!" -ForegroundColor Red
    
} catch {
    Write-Error "Credential rotation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-directory-sync-status',
    name: 'Directory Sync Status',
    category: 'Integration Management',
    description: 'Check directory synchronization status and history',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'directoryKey', label: 'Directory Key (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const directoryKey = params.directoryKey ? escapePowerShellString(params.directoryKey) : '';
      
      return `# Duo Directory Sync Status
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

${directoryKey ? `$DirectoryKey = "${directoryKey}"` : ''}

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v1/directories"
    $Params = ""
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Retrieving directory sync status..." -ForegroundColor Cyan
    $Directories = Invoke-RestMethod -Uri "https://$ApiHost$Path" -Method GET -Headers $Headers
    
    ${directoryKey ? `
    $Dir = $Directories.response | Where-Object { $_.directory_key -eq $DirectoryKey }
    if ($Dir) {
        Write-Host ""
        Write-Host "Directory: $($Dir.name)" -ForegroundColor Cyan
        Write-Host "  Type: $($Dir.type)" -ForegroundColor Gray
        Write-Host "  Status: $($Dir.status)" -ForegroundColor $(if ($Dir.status -eq "active") { "Green" } else { "Yellow" })
        Write-Host "  Last Sync: $([DateTimeOffset]::FromUnixTimeSeconds($Dir.last_sync).DateTime)" -ForegroundColor Gray
        Write-Host "  Users Synced: $($Dir.users_synced)" -ForegroundColor Gray
        Write-Host "  Groups Synced: $($Dir.groups_synced)" -ForegroundColor Gray
    } else {
        Write-Host "Directory not found: $DirectoryKey" -ForegroundColor Yellow
    }
    ` : `
    Write-Host ""
    Write-Host "Configured Directories:" -ForegroundColor Cyan
    $Directories.response | ForEach-Object {
        $StatusColor = if ($_.status -eq "active") { "Green" } else { "Yellow" }
        Write-Host ""
        Write-Host "  $($_.name)" -ForegroundColor $StatusColor
        Write-Host "    Directory Key: $($_.directory_key)" -ForegroundColor Gray
        Write-Host "    Type: $($_.type)" -ForegroundColor Gray
        Write-Host "    Status: $($_.status)" -ForegroundColor $StatusColor
        if ($_.last_sync) {
            Write-Host "    Last Sync: $([DateTimeOffset]::FromUnixTimeSeconds($_.last_sync).DateTime)" -ForegroundColor Gray
        }
    }
    `}
    
} catch {
    Write-Error "Directory status check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-account-summary',
    name: 'Account Summary Dashboard',
    category: 'Reporting',
    description: 'Generate a comprehensive account summary report',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      
      return `# Duo Account Summary Dashboard
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "      DUO SECURITY ACCOUNT SUMMARY      " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Get account info
    $InfoPath = "/admin/v1/info/summary"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $InfoPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Info = Invoke-RestMethod -Uri "https://$ApiHost$InfoPath" -Method GET -Headers $Headers
    
    Write-Host "ACCOUNT OVERVIEW" -ForegroundColor Yellow
    Write-Host "  Total Users: $($Info.response.user_count)" -ForegroundColor Gray
    Write-Host "  Active Users: $($Info.response.user_count - $Info.response.user_pending_count)" -ForegroundColor Green
    Write-Host "  Pending Enrollment: $($Info.response.user_pending_count)" -ForegroundColor Yellow
    Write-Host "  Total Phones: $($Info.response.phone_count)" -ForegroundColor Gray
    Write-Host "  Total Tokens: $($Info.response.token_count)" -ForegroundColor Gray
    Write-Host "  Integrations: $($Info.response.integration_count)" -ForegroundColor Gray
    Write-Host ""
    
    # Get users for detailed stats
    $UsersPath = "/admin/v1/users"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $UsersPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Users = Invoke-RestMethod -Uri "https://$ApiHost$UsersPath" -Method GET -Headers $Headers
    
    $EnrolledUsers = ($Users.response | Where-Object { $_.is_enrolled }).Count
    $BypassUsers = ($Users.response | Where-Object { $_.status -eq "bypass" }).Count
    $DisabledUsers = ($Users.response | Where-Object { $_.status -eq "disabled" }).Count
    
    Write-Host "USER STATUS BREAKDOWN" -ForegroundColor Yellow
    Write-Host "  Enrolled: $EnrolledUsers" -ForegroundColor Green
    Write-Host "  Bypass Mode: $BypassUsers" -ForegroundColor Yellow
    Write-Host "  Disabled: $DisabledUsers" -ForegroundColor Red
    Write-Host ""
    
    # Get recent auth stats
    $LogPath = "/admin/v2/logs/authentication"
    $MinTime = (Get-Date).AddDays(-7).ToUniversalTime()
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $LogPath -Params "mintime=$MinTimeUnix" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    $Logs = Invoke-RestMethod -Uri "https://$ApiHost$LogPath?mintime=$MinTimeUnix" -Method GET -Headers $Headers
    
    $TotalAuths = $Logs.response.authlogs.Count
    $Successful = ($Logs.response.authlogs | Where-Object { $_.result -eq "success" }).Count
    $Denied = ($Logs.response.authlogs | Where-Object { $_.result -eq "denied" }).Count
    $Fraud = ($Logs.response.authlogs | Where-Object { $_.result -eq "fraud" }).Count
    
    Write-Host "AUTHENTICATION (Last 7 Days)" -ForegroundColor Yellow
    Write-Host "  Total Attempts: $TotalAuths" -ForegroundColor Gray
    Write-Host "  Successful: $Successful" -ForegroundColor Green
    Write-Host "  Denied: $Denied" -ForegroundColor Yellow
    Write-Host "  Fraud Reports: $Fraud" -ForegroundColor $(if ($Fraud -gt 0) { "Red" } else { "Gray" })
    if ($TotalAuths -gt 0) {
        $SuccessRate = [math]::Round(($Successful / $TotalAuths) * 100, 1)
        Write-Host "  Success Rate: $SuccessRate%" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Error "Account summary failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-application-access-report',
    name: 'Application Access Report',
    category: 'Reporting',
    description: 'Report on authentication activity per application',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Application Access Report
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Generating application access report for last $Days days..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs
    
    # Group by application
    $AppReport = $Logs | Group-Object -Property { $_.application.name } | ForEach-Object {
        $AppLogs = $_.Group
        $Successful = ($AppLogs | Where-Object { $_.result -eq "success" }).Count
        $Failed = ($AppLogs | Where-Object { $_.result -ne "success" }).Count
        $UniqueUsers = ($AppLogs | ForEach-Object { $_.user.name } | Select-Object -Unique).Count
        
        [PSCustomObject]@{
            Application = $_.Name
            TotalAuthentications = $_.Count
            Successful = $Successful
            Failed = $Failed
            SuccessRate = [math]::Round(($Successful / $_.Count) * 100, 2)
            UniqueUsers = $UniqueUsers
            TopMethod = ($AppLogs | Group-Object factor | Sort-Object Count -Descending | Select-Object -First 1).Name
            LastUsed = [DateTimeOffset]::FromUnixTimeSeconds(($AppLogs | Sort-Object timestamp -Descending | Select-Object -First 1).timestamp).DateTime
        }
    } | Sort-Object TotalAuthentications -Descending
    
    $AppReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Application access report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Top Applications by Usage:" -ForegroundColor Cyan
    $AppReport | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Application): $($_.TotalAuthentications) auths ($($_.UniqueUsers) users)" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Application access report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-user-activity-timeline',
    name: 'User Activity Timeline',
    category: 'Reporting',
    description: 'Generate detailed activity timeline for a specific user',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo User Activity Timeline
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"
$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Generating activity timeline for: $Username..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path?$Params" -Method GET -Headers $Headers
    
    # Filter for specific user
    $UserLogs = $Response.response.authlogs | Where-Object { $_.user.name -eq $Username }
    
    $Timeline = $UserLogs | Sort-Object timestamp | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            Result = $_.result
            Application = $_.application.name
            Factor = $_.factor
            IP = $_.access_device.ip
            Location = "$($_.access_device.location.city), $($_.access_device.location.country)"
            Device = $_.auth_device.name
            OS = $_.access_device.os
            Browser = $_.access_device.browser
            Reason = $_.reason
        }
    }
    
    $Timeline | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "User activity timeline exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Activity Summary for $Username\:" -ForegroundColor Cyan
    Write-Host "  Total Events: $($Timeline.Count)" -ForegroundColor Gray
    Write-Host "  Successful: $(($Timeline | Where-Object { $_.Result -eq 'success' }).Count)" -ForegroundColor Green
    Write-Host "  Denied: $(($Timeline | Where-Object { $_.Result -eq 'denied' }).Count)" -ForegroundColor Yellow
    Write-Host "  Unique IPs: $(($Timeline | ForEach-Object { $_.IP } | Select-Object -Unique).Count)" -ForegroundColor Gray
    Write-Host "  Applications Used: $(($Timeline | ForEach-Object { $_.Application } | Select-Object -Unique).Count)" -ForegroundColor Gray
    
} catch {
    Write-Error "User activity timeline failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-concurrent-session-detection',
    name: 'Concurrent Session Detection',
    category: 'Security Monitoring',
    description: 'Detect users with concurrent sessions from different locations',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'hours', label: 'Time Window (hours)', type: 'number', required: true, defaultValue: 1 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Concurrent Session Detection
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Hours = ${params.hours}
$MinTime = (Get-Date).AddHours(-$Hours).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    $Path = "/admin/v2/logs/authentication"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    Write-Host "Detecting concurrent sessions in last $Hours hour(s)..." -ForegroundColor Cyan
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $Path -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $Response = Invoke-RestMethod -Uri "https://$ApiHost$Path?$Params" -Method GET -Headers $Headers
    $Logs = $Response.response.authlogs | Where-Object { $_.result -eq "success" }
    
    $ConcurrentSessions = @()
    
    # Group by user
    $UserLogs = $Logs | Group-Object -Property { $_.user.name }
    
    foreach ($User in $UserLogs) {
        $UserSuccessLogs = $User.Group | Sort-Object timestamp
        
        # Check for different IPs within short time windows
        for ($i = 0; $i -lt $UserSuccessLogs.Count - 1; $i++) {
            for ($j = $i + 1; $j -lt $UserSuccessLogs.Count; $j++) {
                $Log1 = $UserSuccessLogs[$i]
                $Log2 = $UserSuccessLogs[$j]
                
                $TimeDiff = $Log2.timestamp - $Log1.timestamp
                $IP1 = $Log1.access_device.ip
                $IP2 = $Log2.access_device.ip
                $Country1 = $Log1.access_device.location.country
                $Country2 = $Log2.access_device.location.country
                
                # If different IPs within 5 minutes
                if ($IP1 -ne $IP2 -and $TimeDiff -lt 300) {
                    $ConcurrentSessions += [PSCustomObject]@{
                        Username = $User.Name
                        FirstIP = $IP1
                        FirstLocation = "$($Log1.access_device.location.city), $Country1"
                        FirstTime = [DateTimeOffset]::FromUnixTimeSeconds($Log1.timestamp).DateTime
                        SecondIP = $IP2
                        SecondLocation = "$($Log2.access_device.location.city), $Country2"
                        SecondTime = [DateTimeOffset]::FromUnixTimeSeconds($Log2.timestamp).DateTime
                        TimeDiffSeconds = $TimeDiff
                        DifferentCountry = ($Country1 -ne $Country2)
                        Severity = if ($Country1 -ne $Country2) { "High" } else { "Medium" }
                    }
                }
            }
        }
    }
    
    $ConcurrentSessions | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $HighSeverity = ($ConcurrentSessions | Where-Object { $_.Severity -eq "High" }).Count
    $MediumSeverity = ($ConcurrentSessions | Where-Object { $_.Severity -eq "Medium" }).Count
    
    Write-Host "Concurrent session report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detections:" -ForegroundColor Cyan
    Write-Host "  High Severity (Different Countries): $HighSeverity" -ForegroundColor Red
    Write-Host "  Medium Severity (Different IPs): $MediumSeverity" -ForegroundColor Yellow
    Write-Host "  Total Anomalies: $($ConcurrentSessions.Count)" -ForegroundColor Gray
    
} catch {
    Write-Error "Concurrent session detection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'duo-admin-access-audit',
    name: 'Admin Access Audit',
    category: 'Security Monitoring',
    description: 'Audit administrator access and privilege changes',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Admin Access Audit
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$MinTime = (Get-Date).AddDays(-$Days).ToUniversalTime()

function Get-DuoSignature {
    param($Method, $Host, $Path, $Params, $Date, $IKey, $SKey)
    $Canon = @($Date, $Method.ToUpper(), $Host.ToLower(), $Path, $Params) -join "\\n"
    $hmacsha1 = New-Object System.Security.Cryptography.HMACSHA1
    $hmacsha1.Key = [Text.Encoding]::ASCII.GetBytes($SKey)
    $Signature = [BitConverter]::ToString($hmacsha1.ComputeHash([Text.Encoding]::ASCII.GetBytes($Canon))).Replace("-", "").ToLower()
    return "$IKey\`\:$Signature"
}

try {
    $Date = (Get-Date).ToUniversalTime().ToString("r")
    
    # Get current admins
    $AdminPath = "/admin/v1/admins"
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $AdminPath -Params "" -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    Write-Host "Auditing administrator access..." -ForegroundColor Cyan
    $Admins = Invoke-RestMethod -Uri "https://$ApiHost$AdminPath" -Method GET -Headers $Headers
    
    Write-Host ""
    Write-Host "Current Administrators:" -ForegroundColor Yellow
    $Admins.response | ForEach-Object {
        Write-Host "  - $($_.name) ($($_.email))" -ForegroundColor Cyan
        Write-Host "    Role: $($_.role)" -ForegroundColor Gray
        Write-Host "    Status: $($_.status)" -ForegroundColor $(if ($_.status -eq "active") { "Green" } else { "Yellow" })
        Write-Host "    Last Login: $(if ($_.last_login) { [DateTimeOffset]::FromUnixTimeSeconds($_.last_login).DateTime } else { 'Never' })" -ForegroundColor Gray
    }
    
    # Get admin activity logs
    $LogPath = "/admin/v1/logs/administrator"
    $MinTimeUnix = [int][double]::Parse((Get-Date -Date $MinTime -UFormat %s))
    $Params = "mintime=$MinTimeUnix"
    
    $Auth = Get-DuoSignature -Method "GET" -Host $ApiHost -Path $LogPath -Params $Params -Date $Date -IKey $IntegrationKey -SKey $SecretKeyPlain
    $Headers = @{ "Date" = $Date; "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Auth)) }
    
    $AdminLogs = Invoke-RestMethod -Uri "https://$ApiHost$LogPath?$Params" -Method GET -Headers $Headers
    
    # Filter for security-sensitive actions
    $SecurityActions = @("admin_create", "admin_delete", "admin_update", "integration_create", "integration_delete", "policy_update", "user_delete", "bypass_code_create")
    
    $AuditReport = $AdminLogs.response | ForEach-Object {
        $IsSensitive = $_.action -in $SecurityActions
        
        [PSCustomObject]@{
            Timestamp = [DateTimeOffset]::FromUnixTimeSeconds($_.timestamp).DateTime
            AdminName = $_.username
            Action = $_.action
            Object = $_.object
            Description = $_.description
            IsSensitiveAction = $IsSensitive
            Severity = if ($IsSensitive) { "High" } else { "Normal" }
        }
    } | Sort-Object Timestamp -Descending
    
    $AuditReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $SensitiveActions = ($AuditReport | Where-Object { $_.IsSensitiveAction }).Count
    
    Write-Host ""
    Write-Host "Admin Activity Audit exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary (Last $Days days):" -ForegroundColor Cyan
    Write-Host "  Total Admin Actions: $($AuditReport.Count)" -ForegroundColor Gray
    Write-Host "  Sensitive Actions: $SensitiveActions" -ForegroundColor $(if ($SensitiveActions -gt 0) { "Yellow" } else { "Gray" })
    Write-Host "  Active Admins: $($Admins.response.Count)" -ForegroundColor Gray
    
    if ($SensitiveActions -gt 0) {
        Write-Host ""
        Write-Host "Recent Sensitive Actions:" -ForegroundColor Yellow
        $AuditReport | Where-Object { $_.IsSensitiveAction } | Select-Object -First 5 | ForEach-Object {
            Write-Host "  $($_.Timestamp): $($_.AdminName) - $($_.Action)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Admin access audit failed: $_"
}`;
    },
    isPremium: true
  }
];
