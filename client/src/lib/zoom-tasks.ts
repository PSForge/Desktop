import { escapePowerShellString } from './powershell-utils';

export interface ZoomTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface ZoomTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: ZoomTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const zoomTasks: ZoomTask[] = [
  // ==================== USER MANAGEMENT ====================
  {
    id: 'zoom-create-user',
    name: 'Create Single User',
    category: 'User Management',
    description: 'Create a new Zoom user with specified license type',
    parameters: [
      { id: 'email', label: 'User Email', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
      { id: 'licenseType', label: 'License Type', type: 'select', required: true, options: ['Basic', 'Licensed', 'On-Prem'], defaultValue: 'Licensed' },
      { id: 'department', label: 'Department', type: 'text', required: false, placeholder: 'Engineering' }
    ],
    scriptTemplate: (params) => {
      const email = escapePowerShellString(params.email);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const department = params.department ? escapePowerShellString(params.department) : '';
      const licenseType = params.licenseType === 'Basic' ? '1' : params.licenseType === 'Licensed' ? '2' : '3';
      
      return `# Zoom Create Single User
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    action = "create"
    user_info = @{
        email = "${email}"
        type = ${licenseType}
        first_name = "${firstName}"
        last_name = "${lastName}"
        ${department ? `department = "${department}"` : ''}
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/users"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "User created successfully" -ForegroundColor Green
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    Write-Host "  User ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  License Type: ${params.licenseType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-bulk-create-users',
    name: 'Bulk Create Users',
    category: 'User Management',
    description: 'Create multiple Zoom users from a list',
    parameters: [
      { id: 'userEmails', label: 'User Emails (one per line)', type: 'textarea', required: true, placeholder: 'user1@company.com\nuser2@company.com' },
      { id: 'licenseType', label: 'License Type', type: 'select', required: true, options: ['Basic', 'Licensed', 'On-Prem'], defaultValue: 'Licensed' }
    ],
    scriptTemplate: (params) => {
      const userEmails = (params.userEmails as string).split('\n').filter((u: string) => u.trim());
      const licenseType = params.licenseType === 'Basic' ? '1' : params.licenseType === 'Licensed' ? '2' : '3';
      
      return `# Zoom Bulk Create Users
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$UserEmails = @(
${userEmails.map(e => `    "${escapePowerShellString(e.trim())}"`).join(',\n')}
)

$Results = @()
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        $FirstName = $Email.Split('@')[0].Split('.')[0]
        $LastName = if ($Email.Split('@')[0].Contains('.')) { $Email.Split('@')[0].Split('.')[1] } else { "User" }
        
        $Body = @{
            action = "create"
            user_info = @{
                email = $Email
                type = ${licenseType}
                first_name = $FirstName
                last_name = $LastName
            }
        } | ConvertTo-Json
        
        try {
            $Uri = "https://api.zoom.us/v2/users"
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            $Results += [PSCustomObject]@{
                Email = $Email
                Status = "Success"
                UserId = $Response.id
            }
            $SuccessCount++
            Write-Host "Created: $Email" -ForegroundColor Green
        } catch {
            $Results += [PSCustomObject]@{
                Email = $Email
                Status = "Failed"
                Error = $_.Exception.Message
            }
            $FailCount++
            Write-Host "Failed: $Email - $_" -ForegroundColor Red
        }
        
        Start-Sleep -Milliseconds 200
    }
    
    Write-Host ""
    Write-Host "Bulk user creation completed" -ForegroundColor Green
    Write-Host "  Success: $SuccessCount" -ForegroundColor Cyan
    Write-Host "  Failed: $FailCount" -ForegroundColor Yellow
    
    $Results | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-deactivate-user',
    name: 'Deactivate User',
    category: 'User Management',
    description: 'Deactivate a Zoom user account',
    parameters: [
      { id: 'userId', label: 'User Email or ID', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'transferEmail', label: 'Transfer Meetings/Webinars To', type: 'email', required: false, placeholder: 'manager@company.com' },
      { id: 'transferRecordings', label: 'Transfer Recordings', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const transferEmail = params.transferEmail ? escapePowerShellString(params.transferEmail) : '';
      const transferRecordings = params.transferRecordings ? '$true' : '$false';
      
      return `# Zoom Deactivate User
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    ${transferEmail ? `
    # Transfer meetings and webinars first
    $TransferBody = @{
        transfer_email = "${transferEmail}"
        transfer_meeting = $true
        transfer_webinar = $true
        transfer_recording = ${transferRecordings}
    } | ConvertTo-Json
    
    $TransferUri = "https://api.zoom.us/v2/users/$UserId/settings"
    Invoke-RestMethod -Uri $TransferUri -Method Patch -Headers $Headers -Body $TransferBody
    Write-Host "Assets transferred to: ${transferEmail}" -ForegroundColor Cyan
    ` : ''}
    
    # Deactivate user
    $Uri = "https://api.zoom.us/v2/users/$UserId/status"
    $Body = @{
        action = "deactivate"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "User deactivated successfully: $UserId" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to deactivate user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-bulk-deactivate-users',
    name: 'Bulk Deactivate Users',
    category: 'User Management',
    description: 'Deactivate multiple Zoom users at once',
    parameters: [
      { id: 'userEmails', label: 'User Emails (one per line)', type: 'textarea', required: true, placeholder: 'user1@company.com\nuser2@company.com' },
      { id: 'transferEmail', label: 'Transfer Assets To', type: 'email', required: false, placeholder: 'admin@company.com' }
    ],
    scriptTemplate: (params) => {
      const userEmails = (params.userEmails as string).split('\n').filter((u: string) => u.trim());
      const transferEmail = params.transferEmail ? escapePowerShellString(params.transferEmail) : '';
      
      return `# Zoom Bulk Deactivate Users
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$UserEmails = @(
${userEmails.map(e => `    "${escapePowerShellString(e.trim())}"`).join(',\n')}
)

$SuccessCount = 0
$FailCount = 0

try {
    foreach ($UserId in $UserEmails) {
        try {
            ${transferEmail ? `
            $TransferBody = @{
                transfer_email = "${transferEmail}"
                transfer_meeting = $true
                transfer_webinar = $true
                transfer_recording = $true
            } | ConvertTo-Json
            
            $TransferUri = "https://api.zoom.us/v2/users/$UserId/settings"
            Invoke-RestMethod -Uri $TransferUri -Method Patch -Headers $Headers -Body $TransferBody
            ` : ''}
            
            $Uri = "https://api.zoom.us/v2/users/$UserId/status"
            $Body = @{ action = "deactivate" } | ConvertTo-Json
            
            Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
            
            Write-Host "Deactivated: $UserId" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $UserId - $_" -ForegroundColor Red
            $FailCount++
        }
        
        Start-Sleep -Milliseconds 200
    }
    
    Write-Host ""
    Write-Host "Bulk deactivation completed" -ForegroundColor Green
    Write-Host "  Success: $SuccessCount" -ForegroundColor Cyan
    Write-Host "  Failed: $FailCount" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-assign-license',
    name: 'Assign License to User',
    category: 'User Management',
    description: 'Change or assign a license type to a Zoom user',
    parameters: [
      { id: 'userId', label: 'User Email or ID', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'licenseType', label: 'License Type', type: 'select', required: true, options: ['Basic', 'Licensed', 'On-Prem'], defaultValue: 'Licensed' },
      { id: 'feature', label: 'Additional Feature', type: 'select', required: false, options: ['None', 'Webinar 100', 'Webinar 500', 'Webinar 1000', 'Large Meeting 500', 'Large Meeting 1000'], defaultValue: 'None' }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const licenseType = params.licenseType === 'Basic' ? '1' : params.licenseType === 'Licensed' ? '2' : '3';
      const feature = params.feature !== 'None' ? escapePowerShellString(params.feature) : '';
      
      return `# Zoom Assign License to User
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    type = ${licenseType}
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "License updated successfully" -ForegroundColor Green
    Write-Host "  User: $UserId" -ForegroundColor Cyan
    Write-Host "  License Type: ${params.licenseType}" -ForegroundColor Cyan
    
    ${feature ? `
    # Assign additional feature
    $FeatureBody = @{
        feature = @{
            ${params.feature?.includes('Webinar') ? 'webinar = $true' : ''}
            ${params.feature?.includes('Large Meeting') ? 'large_meeting = $true' : ''}
        }
    } | ConvertTo-Json -Depth 2
    
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $FeatureBody
    Write-Host "  Feature Added: ${feature}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to assign license: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-list-users',
    name: 'List All Users',
    category: 'User Management',
    description: 'List all Zoom users with filtering options',
    parameters: [
      { id: 'status', label: 'User Status', type: 'select', required: true, options: ['active', 'inactive', 'pending'], defaultValue: 'active' },
      { id: 'licenseType', label: 'License Type Filter', type: 'select', required: false, options: ['All', 'Basic', 'Licensed', 'On-Prem'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\zoom-users.csv' }
    ],
    scriptTemplate: (params) => {
      const status = escapePowerShellString(params.status);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom List All Users
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllUsers = @()
$PageNumber = 1
$PageSize = 300

try {
    do {
        $Uri = "https://api.zoom.us/v2/users?status=${status}&page_size=$PageSize&page_number=$PageNumber"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($User in $Response.users) {
            $LicenseTypeName = switch ($User.type) {
                1 { "Basic" }
                2 { "Licensed" }
                3 { "On-Prem" }
                default { "Unknown" }
            }
            
            ${params.licenseType !== 'All' ? `
            if ($LicenseTypeName -ne "${params.licenseType}") { continue }
            ` : ''}
            
            $AllUsers += [PSCustomObject]@{
                Id = $User.id
                Email = $User.email
                FirstName = $User.first_name
                LastName = $User.last_name
                LicenseType = $LicenseTypeName
                Status = $User.status
                Department = $User.dept
                LastLogin = $User.last_login_time
                CreatedAt = $User.created_at
            }
        }
        
        $PageNumber++
        Write-Host "Retrieved page $($PageNumber - 1)..." -ForegroundColor Yellow
        
    } while ($Response.page_count -ge $PageNumber)
    
    Write-Host ""
    Write-Host "User list retrieved successfully" -ForegroundColor Green
    Write-Host "  Total Users: $($AllUsers.Count)" -ForegroundColor Cyan
    
    $AllUsers | Format-Table -Property Email, FirstName, LastName, LicenseType, Status -AutoSize
    
    ${exportPath ? `
    $AllUsers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-create-group',
    name: 'Create User Group',
    category: 'User Management',
    description: 'Create a new Zoom user group',
    parameters: [
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Engineering Team' }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      
      return `# Zoom Create User Group
# Generated: ${new Date().toISOString()}

$GroupName = "${groupName}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    name = $GroupName
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/groups"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Group created successfully" -ForegroundColor Green
    Write-Host "  Group Name: $GroupName" -ForegroundColor Cyan
    Write-Host "  Group ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-add-user-to-group',
    name: 'Add User to Group',
    category: 'User Management',
    description: 'Add one or more users to a Zoom group',
    parameters: [
      { id: 'groupId', label: 'Group ID', type: 'text', required: true, placeholder: 'abc123xyz' },
      { id: 'userEmails', label: 'User Emails (one per line)', type: 'textarea', required: true, placeholder: 'user1@company.com\nuser2@company.com' }
    ],
    scriptTemplate: (params) => {
      const groupId = escapePowerShellString(params.groupId);
      const userEmails = (params.userEmails as string).split('\n').filter((u: string) => u.trim());
      
      return `# Zoom Add User to Group
# Generated: ${new Date().toISOString()}

$GroupId = "${groupId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Members = @(
${userEmails.map(e => `    @{ email = "${escapePowerShellString(e.trim())}" }`).join(',\n')}
)

$Body = @{
    members = $Members
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/groups/$GroupId/members"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Users added to group successfully" -ForegroundColor Green
    Write-Host "  Group ID: $GroupId" -ForegroundColor Cyan
    Write-Host "  Users Added: ${userEmails.length}" -ForegroundColor Cyan
    
    if ($Response.added_at) {
        Write-Host "  Added: $($Response.added_at -join ', ')" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to add users to group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-remove-user-from-group',
    name: 'Remove User from Group',
    category: 'User Management',
    description: 'Remove a user from a Zoom group',
    parameters: [
      { id: 'groupId', label: 'Group ID', type: 'text', required: true, placeholder: 'abc123xyz' },
      { id: 'userId', label: 'User Email or ID', type: 'email', required: true, placeholder: 'user@company.com' }
    ],
    scriptTemplate: (params) => {
      const groupId = escapePowerShellString(params.groupId);
      const userId = escapePowerShellString(params.userId);
      
      return `# Zoom Remove User from Group
# Generated: ${new Date().toISOString()}

$GroupId = "${groupId}"
$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/groups/$GroupId/members/$UserId"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "User removed from group successfully" -ForegroundColor Green
    Write-Host "  Group ID: $GroupId" -ForegroundColor Cyan
    Write-Host "  User: $UserId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to remove user from group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-update-user-settings',
    name: 'Update User Settings',
    category: 'User Management',
    description: 'Update individual user settings and preferences',
    parameters: [
      { id: 'userId', label: 'User Email or ID', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'hostVideo', label: 'Host Video On', type: 'boolean', required: false, defaultValue: true },
      { id: 'participantVideo', label: 'Participant Video On', type: 'boolean', required: false, defaultValue: true },
      { id: 'joinBeforeHost', label: 'Join Before Host', type: 'boolean', required: false, defaultValue: false },
      { id: 'muteOnEntry', label: 'Mute on Entry', type: 'boolean', required: false, defaultValue: true },
      { id: 'waitingRoom', label: 'Enable Waiting Room', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      
      return `# Zoom Update User Settings
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    schedule_meeting = @{
        host_video = $${params.hostVideo ? 'true' : 'false'}
        participants_video = $${params.participantVideo ? 'true' : 'false'}
        join_before_host = $${params.joinBeforeHost ? 'true' : 'false'}
        mute_upon_entry = $${params.muteOnEntry ? 'true' : 'false'}
    }
    in_meeting = @{
        waiting_room = $${params.waitingRoom ? 'true' : 'false'}
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/settings"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "User settings updated successfully" -ForegroundColor Green
    Write-Host "  User: $UserId" -ForegroundColor Cyan
    Write-Host "  Host Video: ${params.hostVideo}" -ForegroundColor Cyan
    Write-Host "  Participant Video: ${params.participantVideo}" -ForegroundColor Cyan
    Write-Host "  Join Before Host: ${params.joinBeforeHost}" -ForegroundColor Cyan
    Write-Host "  Mute on Entry: ${params.muteOnEntry}" -ForegroundColor Cyan
    Write-Host "  Waiting Room: ${params.waitingRoom}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update user settings: $_"
}`;
    },
    isPremium: true
  },

  // ==================== MEETING MANAGEMENT ====================
  {
    id: 'zoom-schedule-meeting',
    name: 'Schedule Meeting',
    category: 'Meeting Management',
    description: 'Schedule a new Zoom meeting',
    parameters: [
      { id: 'userId', label: 'Host Email', type: 'email', required: true, placeholder: 'host@company.com' },
      { id: 'topic', label: 'Meeting Topic', type: 'text', required: true, placeholder: 'Weekly Team Meeting' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: true, defaultValue: 60 },
      { id: 'startTime', label: 'Start Time (ISO format)', type: 'text', required: false, placeholder: '2024-01-15T10:00:00Z' },
      { id: 'timezone', label: 'Timezone', type: 'text', required: false, placeholder: 'America/New_York', defaultValue: 'America/New_York' }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const topic = escapePowerShellString(params.topic);
      const startTime = params.startTime ? escapePowerShellString(params.startTime) : '';
      const timezone = params.timezone ? escapePowerShellString(params.timezone) : 'America/New_York';
      
      return `# Zoom Schedule Meeting
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    topic = "${topic}"
    type = 2
    duration = ${params.duration}
    timezone = "${timezone}"
    ${startTime ? `start_time = "${startTime}"` : ''}
    settings = @{
        host_video = $true
        participant_video = $true
        join_before_host = $false
        mute_upon_entry = $true
        waiting_room = $true
        auto_recording = "none"
    }
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/meetings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Meeting scheduled successfully" -ForegroundColor Green
    Write-Host "  Topic: ${topic}" -ForegroundColor Cyan
    Write-Host "  Meeting ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    Write-Host "  Password: $($Response.password)" -ForegroundColor Cyan
    Write-Host "  Start URL: $($Response.start_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to schedule meeting: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-schedule-recurring',
    name: 'Schedule Recurring Meeting',
    category: 'Meeting Management',
    description: 'Schedule a recurring meeting with custom recurrence patterns',
    parameters: [
      { id: 'userId', label: 'Host Email', type: 'email', required: true },
      { id: 'topic', label: 'Meeting Topic', type: 'text', required: true, placeholder: 'Weekly Team Standup' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: true, defaultValue: 30 },
      { id: 'recurrenceType', label: 'Recurrence Type', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Weekly' },
      { id: 'repeatInterval', label: 'Repeat Interval', type: 'number', required: true, defaultValue: 1 },
      { id: 'occurrences', label: 'Number of Occurrences', type: 'number', required: true, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const topic = escapePowerShellString(params.topic);
      const recurrenceType = params.recurrenceType === 'Daily' ? '1' : params.recurrenceType === 'Weekly' ? '2' : '3';
      
      return `# Zoom Schedule Recurring Meeting
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    topic = "${topic}"
    type = 8
    duration = ${params.duration}
    recurrence = @{
        type = ${recurrenceType}
        repeat_interval = ${params.repeatInterval}
        end_times = ${params.occurrences}
    }
    settings = @{
        host_video = $true
        participant_video = $true
        join_before_host = $false
        mute_upon_entry = $true
        waiting_room = $true
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/meetings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Recurring meeting scheduled successfully" -ForegroundColor Green
    Write-Host "  Topic: ${topic}" -ForegroundColor Cyan
    Write-Host "  Recurrence: ${params.recurrenceType}" -ForegroundColor Cyan
    Write-Host "  Occurrences: ${params.occurrences}" -ForegroundColor Cyan
    Write-Host "  Meeting ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to schedule recurring meeting: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-create-instant-meeting',
    name: 'Create Instant Meeting',
    category: 'Meeting Management',
    description: 'Create an instant meeting that starts immediately',
    parameters: [
      { id: 'userId', label: 'Host Email', type: 'email', required: true, placeholder: 'host@company.com' },
      { id: 'topic', label: 'Meeting Topic', type: 'text', required: true, placeholder: 'Quick Discussion' }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const topic = escapePowerShellString(params.topic);
      
      return `# Zoom Create Instant Meeting
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    topic = "${topic}"
    type = 1
    settings = @{
        host_video = $true
        participant_video = $true
        waiting_room = $false
    }
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/meetings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Instant meeting created successfully" -ForegroundColor Green
    Write-Host "  Topic: ${topic}" -ForegroundColor Cyan
    Write-Host "  Meeting ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    Write-Host "  Start URL: $($Response.start_url)" -ForegroundColor Cyan
    
    # Open the meeting in default browser
    Start-Process $Response.start_url
    
} catch {
    Write-Error "Failed to create instant meeting: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-update-meeting',
    name: 'Update Meeting Settings',
    category: 'Meeting Management',
    description: 'Update settings for an existing meeting',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'topic', label: 'New Topic', type: 'text', required: false, placeholder: 'Updated Meeting Topic' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: false },
      { id: 'waitingRoom', label: 'Enable Waiting Room', type: 'boolean', required: false, defaultValue: true },
      { id: 'autoRecording', label: 'Auto Recording', type: 'select', required: false, options: ['none', 'local', 'cloud'], defaultValue: 'none' }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const topic = params.topic ? escapePowerShellString(params.topic) : '';
      
      return `# Zoom Update Meeting Settings
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    ${topic ? `topic = "${topic}"` : ''}
    ${params.duration ? `duration = ${params.duration}` : ''}
    settings = @{
        waiting_room = $${params.waitingRoom ? 'true' : 'false'}
        auto_recording = "${params.autoRecording || 'none'}"
    }
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "Meeting updated successfully" -ForegroundColor Green
    Write-Host "  Meeting ID: $MeetingId" -ForegroundColor Cyan
    ${topic ? `Write-Host "  New Topic: ${topic}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to update meeting: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-delete-meeting',
    name: 'Delete Meeting',
    category: 'Meeting Management',
    description: 'Delete a scheduled meeting',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'notifyHosts', label: 'Notify Hosts', type: 'boolean', required: false, defaultValue: true },
      { id: 'notifyRegistrants', label: 'Notify Registrants', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      
      return `# Zoom Delete Meeting
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId?schedule_for_reminder=${params.notifyHosts ? 'true' : 'false'}&cancel_meeting_reminder=${params.notifyRegistrants ? 'true' : 'false'}"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "Meeting deleted successfully" -ForegroundColor Green
    Write-Host "  Meeting ID: $MeetingId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to delete meeting: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-list-meetings',
    name: 'List User Meetings',
    category: 'Meeting Management',
    description: 'List all scheduled meetings for a user',
    parameters: [
      { id: 'userId', label: 'User Email', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'type', label: 'Meeting Type', type: 'select', required: true, options: ['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'], defaultValue: 'upcoming' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\meetings.csv' }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const type = escapePowerShellString(params.type);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom List User Meetings
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllMeetings = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/users/$UserId/meetings?type=${type}&page_size=300"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Meeting in $Response.meetings) {
            $AllMeetings += [PSCustomObject]@{
                MeetingId = $Meeting.id
                Topic = $Meeting.topic
                Type = switch ($Meeting.type) { 1 { "Instant" } 2 { "Scheduled" } 3 { "Recurring (No Fixed Time)" } 8 { "Recurring (Fixed Time)" } default { "Unknown" } }
                StartTime = $Meeting.start_time
                Duration = $Meeting.duration
                Timezone = $Meeting.timezone
                JoinUrl = $Meeting.join_url
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Meetings retrieved successfully" -ForegroundColor Green
    Write-Host "  User: $UserId" -ForegroundColor Cyan
    Write-Host "  Total Meetings: $($AllMeetings.Count)" -ForegroundColor Cyan
    
    $AllMeetings | Format-Table -Property MeetingId, Topic, Type, StartTime, Duration -AutoSize
    
    ${exportPath ? `
    $AllMeetings | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list meetings: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-get-meeting-details',
    name: 'Get Meeting Details',
    category: 'Meeting Management',
    description: 'Get detailed information about a specific meeting',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'includeParticipants', label: 'Include Participants (Past Meetings)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      
      return `# Zoom Get Meeting Details
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Meeting Details Retrieved" -ForegroundColor Green
    Write-Host "  Topic: $($Response.topic)" -ForegroundColor Cyan
    Write-Host "  Meeting ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Host: $($Response.host_email)" -ForegroundColor Cyan
    Write-Host "  Start Time: $($Response.start_time)" -ForegroundColor Cyan
    Write-Host "  Duration: $($Response.duration) minutes" -ForegroundColor Cyan
    Write-Host "  Timezone: $($Response.timezone)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    Write-Host "  Password: $($Response.password)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Settings:" -ForegroundColor Yellow
    Write-Host "  Waiting Room: $($Response.settings.waiting_room)" -ForegroundColor Cyan
    Write-Host "  Join Before Host: $($Response.settings.join_before_host)" -ForegroundColor Cyan
    Write-Host "  Mute on Entry: $($Response.settings.mute_upon_entry)" -ForegroundColor Cyan
    Write-Host "  Auto Recording: $($Response.settings.auto_recording)" -ForegroundColor Cyan
    
    ${params.includeParticipants ? `
    Write-Host ""
    Write-Host "Fetching participants..." -ForegroundColor Yellow
    
    $ParticipantsUri = "https://api.zoom.us/v2/past_meetings/$MeetingId/participants"
    $ParticipantsResponse = Invoke-RestMethod -Uri $ParticipantsUri -Method Get -Headers $Headers
    
    Write-Host "Participants:" -ForegroundColor Yellow
    $ParticipantsResponse.participants | Format-Table -Property name, user_email, join_time, leave_time, duration -AutoSize
    ` : ''}
    
} catch {
    Write-Error "Failed to get meeting details: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-add-meeting-registrant',
    name: 'Add Meeting Registrant',
    category: 'Meeting Management',
    description: 'Register an attendee for a meeting with registration enabled',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'email', label: 'Registrant Email', type: 'email', required: true, placeholder: 'attendee@company.com' },
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const email = escapePowerShellString(params.email);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      
      return `# Zoom Add Meeting Registrant
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    email = "${email}"
    first_name = "${firstName}"
    last_name = "${lastName}"
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId/registrants"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Registrant added successfully" -ForegroundColor Green
    Write-Host "  Meeting ID: $MeetingId" -ForegroundColor Cyan
    Write-Host "  Registrant: ${firstName} ${lastName}" -ForegroundColor Cyan
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    Write-Host "  Registrant ID: $($Response.registrant_id)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add registrant: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-download-recordings',
    name: 'Download Meeting Recordings',
    category: 'Meeting Management',
    description: 'Download cloud recordings for a meeting',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'downloadPath', label: 'Download Directory', type: 'path', required: true, placeholder: 'C:\\Recordings' }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const downloadPath = escapePowerShellString(params.downloadPath);
      
      return `# Zoom Download Meeting Recordings
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$DownloadPath = "${downloadPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

if (-not (Test-Path $DownloadPath)) {
    New-Item -Path $DownloadPath -ItemType Directory | Out-Null
}

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId/recordings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Recording Information Retrieved" -ForegroundColor Green
    Write-Host "  Topic: $($Response.topic)" -ForegroundColor Cyan
    Write-Host "  Recording Count: $($Response.recording_files.Count)" -ForegroundColor Cyan
    
    foreach ($Recording in $Response.recording_files) {
        $SafeTopic = $Response.topic -replace '[\\/:*?"<>|]', '_'
        $FileName = "$($SafeTopic)_$($Recording.recording_type)_$($Recording.id).$($Recording.file_extension)"
        $FilePath = Join-Path $DownloadPath $FileName
        
        Write-Host ""
        Write-Host "Downloading: $FileName" -ForegroundColor Yellow
        
        $DownloadUri = "$($Recording.download_url)?access_token=$Token"
        Invoke-WebRequest -Uri $DownloadUri -OutFile $FilePath
        
        Write-Host "Downloaded: $FilePath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "All recordings downloaded to: $DownloadPath" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to download recordings: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-delete-recordings',
    name: 'Delete Meeting Recordings',
    category: 'Meeting Management',
    description: 'Delete cloud recordings for a meeting',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'action', label: 'Delete Action', type: 'select', required: true, options: ['trash', 'delete'], defaultValue: 'trash' }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const action = escapePowerShellString(params.action);
      
      return `# Zoom Delete Meeting Recordings
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId/recordings?action=${action}"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "Recordings deleted successfully" -ForegroundColor Green
    Write-Host "  Meeting ID: $MeetingId" -ForegroundColor Cyan
    Write-Host "  Action: ${action}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to delete recordings: $_"
}`;
    },
    isPremium: true
  },

  // ==================== WEBINAR MANAGEMENT ====================
  {
    id: 'zoom-create-webinar',
    name: 'Create Webinar',
    category: 'Webinar Management',
    description: 'Create a new Zoom webinar',
    parameters: [
      { id: 'userId', label: 'Host Email', type: 'email', required: true, placeholder: 'host@company.com' },
      { id: 'topic', label: 'Webinar Topic', type: 'text', required: true, placeholder: 'Product Launch Webinar' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: true, defaultValue: 60 },
      { id: 'startTime', label: 'Start Time (ISO format)', type: 'text', required: true, placeholder: '2024-01-15T14:00:00Z' },
      { id: 'timezone', label: 'Timezone', type: 'text', required: false, defaultValue: 'America/New_York' },
      { id: 'approvalType', label: 'Registration Approval', type: 'select', required: true, options: ['Automatic', 'Manual', 'No Registration'], defaultValue: 'Automatic' }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const topic = escapePowerShellString(params.topic);
      const startTime = escapePowerShellString(params.startTime);
      const timezone = escapePowerShellString(params.timezone || 'America/New_York');
      const approvalType = params.approvalType === 'Automatic' ? '0' : params.approvalType === 'Manual' ? '1' : '2';
      
      return `# Zoom Create Webinar
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    topic = "${topic}"
    type = 5
    start_time = "${startTime}"
    duration = ${params.duration}
    timezone = "${timezone}"
    settings = @{
        approval_type = ${approvalType}
        registration_type = 1
        host_video = $true
        panelists_video = $true
        practice_session = $true
        on_demand = $false
        auto_recording = "cloud"
        attendees_and_panelists_reminder_email_notification = @{
            enable = $true
            type = 1
        }
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/webinars"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Webinar created successfully" -ForegroundColor Green
    Write-Host "  Topic: ${topic}" -ForegroundColor Cyan
    Write-Host "  Webinar ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Start Time: ${startTime}" -ForegroundColor Cyan
    Write-Host "  Registration URL: $($Response.registration_url)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    Write-Host "  Start URL: $($Response.start_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create webinar: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-update-webinar',
    name: 'Update Webinar Settings',
    category: 'Webinar Management',
    description: 'Update settings for an existing webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'topic', label: 'New Topic', type: 'text', required: false, placeholder: 'Updated Webinar Topic' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: false },
      { id: 'practiceSession', label: 'Enable Practice Session', type: 'boolean', required: false, defaultValue: true },
      { id: 'qaEnabled', label: 'Enable Q&A', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      const topic = params.topic ? escapePowerShellString(params.topic) : '';
      
      return `# Zoom Update Webinar Settings
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    ${topic ? `topic = "${topic}"` : ''}
    ${params.duration ? `duration = ${params.duration}` : ''}
    settings = @{
        practice_session = $${params.practiceSession ? 'true' : 'false'}
        question_and_answer = @{
            enable = $${params.qaEnabled ? 'true' : 'false'}
        }
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/webinars/$WebinarId"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "Webinar updated successfully" -ForegroundColor Green
    Write-Host "  Webinar ID: $WebinarId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update webinar: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-add-webinar-panelist',
    name: 'Add Webinar Panelist',
    category: 'Webinar Management',
    description: 'Add panelists to a webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'panelistEmails', label: 'Panelist Emails (one per line)', type: 'textarea', required: true, placeholder: 'panelist1@company.com\npanelist2@company.com' }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      const panelists = (params.panelistEmails as string).split('\n').filter((p: string) => p.trim());
      
      return `# Zoom Add Webinar Panelist
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Panelists = @(
${panelists.map(p => {
  const email = escapePowerShellString(p.trim());
  const name = p.split('@')[0].replace('.', ' ');
  return `    @{ email = "${email}"; name = "${name}" }`;
}).join(',\n')}
)

$Body = @{
    panelists = $Panelists
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/webinars/$WebinarId/panelists"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Panelists added successfully" -ForegroundColor Green
    Write-Host "  Webinar ID: $WebinarId" -ForegroundColor Cyan
    Write-Host "  Panelists Added: ${panelists.length}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add panelists: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-register-webinar-attendee',
    name: 'Register Webinar Attendee',
    category: 'Webinar Management',
    description: 'Register an attendee for a webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'email', label: 'Attendee Email', type: 'email', required: true, placeholder: 'attendee@company.com' },
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
      { id: 'organization', label: 'Organization', type: 'text', required: false, placeholder: 'Acme Corp' },
      { id: 'jobTitle', label: 'Job Title', type: 'text', required: false, placeholder: 'Software Engineer' }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      const email = escapePowerShellString(params.email);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const organization = params.organization ? escapePowerShellString(params.organization) : '';
      const jobTitle = params.jobTitle ? escapePowerShellString(params.jobTitle) : '';
      
      return `# Zoom Register Webinar Attendee
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    email = "${email}"
    first_name = "${firstName}"
    last_name = "${lastName}"
    ${organization ? `org = "${organization}"` : ''}
    ${jobTitle ? `job_title = "${jobTitle}"` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/webinars/$WebinarId/registrants"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Attendee registered successfully" -ForegroundColor Green
    Write-Host "  Webinar ID: $WebinarId" -ForegroundColor Cyan
    Write-Host "  Registrant: ${firstName} ${lastName}" -ForegroundColor Cyan
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    Write-Host "  Registrant ID: $($Response.registrant_id)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to register attendee: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-create-webinar-poll',
    name: 'Create Webinar Poll',
    category: 'Webinar Management',
    description: 'Create a poll for a webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'pollTitle', label: 'Poll Title', type: 'text', required: true, placeholder: 'Feedback Poll' },
      { id: 'question', label: 'Question', type: 'text', required: true, placeholder: 'How would you rate this session?' },
      { id: 'answers', label: 'Answer Options (one per line)', type: 'textarea', required: true, placeholder: 'Excellent\nGood\nAverage\nPoor' },
      { id: 'pollType', label: 'Poll Type', type: 'select', required: true, options: ['Single Choice', 'Multiple Choice'], defaultValue: 'Single Choice' }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      const pollTitle = escapePowerShellString(params.pollTitle);
      const question = escapePowerShellString(params.question);
      const answers = (params.answers as string).split('\n').filter((a: string) => a.trim());
      const pollType = params.pollType === 'Single Choice' ? 'single' : 'multiple';
      
      return `# Zoom Create Webinar Poll
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    title = "${pollTitle}"
    questions = @(
        @{
            name = "${question}"
            type = "${pollType}"
            answers = @(
${answers.map(a => `                "${escapePowerShellString(a.trim())}"`).join(',\n')}
            )
        }
    )
} | ConvertTo-Json -Depth 4

try {
    $Uri = "https://api.zoom.us/v2/webinars/$WebinarId/polls"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Poll created successfully" -ForegroundColor Green
    Write-Host "  Webinar ID: $WebinarId" -ForegroundColor Cyan
    Write-Host "  Poll Title: ${pollTitle}" -ForegroundColor Cyan
    Write-Host "  Poll ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create poll: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-list-webinar-registrants',
    name: 'List Webinar Registrants',
    category: 'Webinar Management',
    description: 'List all registrants for a webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'status', label: 'Registration Status', type: 'select', required: true, options: ['approved', 'pending', 'denied'], defaultValue: 'approved' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\webinar-registrants.csv' }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      const status = escapePowerShellString(params.status);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom List Webinar Registrants
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllRegistrants = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/webinars/$WebinarId/registrants?status=${status}&page_size=300"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Registrant in $Response.registrants) {
            $AllRegistrants += [PSCustomObject]@{
                Id = $Registrant.id
                Email = $Registrant.email
                FirstName = $Registrant.first_name
                LastName = $Registrant.last_name
                Organization = $Registrant.org
                JobTitle = $Registrant.job_title
                Status = $Registrant.status
                RegisteredAt = $Registrant.create_time
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Webinar registrants retrieved" -ForegroundColor Green
    Write-Host "  Webinar ID: $WebinarId" -ForegroundColor Cyan
    Write-Host "  Status: ${status}" -ForegroundColor Cyan
    Write-Host "  Total Registrants: $($AllRegistrants.Count)" -ForegroundColor Cyan
    
    $AllRegistrants | Format-Table -Property Email, FirstName, LastName, Organization, Status -AutoSize
    
    ${exportPath ? `
    $AllRegistrants | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list registrants: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-delete-webinar',
    name: 'Delete Webinar',
    category: 'Webinar Management',
    description: 'Delete a scheduled webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'notifyPanelists', label: 'Notify Panelists', type: 'boolean', required: false, defaultValue: true },
      { id: 'notifyRegistrants', label: 'Notify Registrants', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      
      return `# Zoom Delete Webinar
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/webinars/$WebinarId?cancel_webinar_reminder=${params.notifyRegistrants ? 'true' : 'false'}"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "Webinar deleted successfully" -ForegroundColor Green
    Write-Host "  Webinar ID: $WebinarId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to delete webinar: $_"
}`;
    },
    isPremium: true
  },

  // ==================== PHONE SYSTEM ====================
  {
    id: 'zoom-list-phone-users',
    name: 'List Phone Users',
    category: 'Phone System',
    description: 'List all Zoom Phone users in the account',
    parameters: [
      { id: 'siteId', label: 'Site ID (optional)', type: 'text', required: false, placeholder: 'Leave empty for all sites' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\phone-users.csv' }
    ],
    scriptTemplate: (params) => {
      const siteId = params.siteId ? escapePowerShellString(params.siteId) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom List Phone Users
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllPhoneUsers = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/phone/users?page_size=100"
        ${siteId ? `$Uri += "&site_id=${siteId}"` : ''}
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($User in $Response.users) {
            $AllPhoneUsers += [PSCustomObject]@{
                UserId = $User.id
                Email = $User.email
                Name = $User.name
                PhoneNumber = $User.phone_numbers -join ", "
                Extension = $User.extension_number
                SiteId = $User.site_id
                Status = $User.status
                CallingPlans = $User.calling_plans.name -join ", "
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Phone users retrieved successfully" -ForegroundColor Green
    Write-Host "  Total Phone Users: $($AllPhoneUsers.Count)" -ForegroundColor Cyan
    
    $AllPhoneUsers | Format-Table -Property Email, Name, PhoneNumber, Extension, Status -AutoSize
    
    ${exportPath ? `
    $AllPhoneUsers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list phone users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-assign-phone-number',
    name: 'Assign Phone Number',
    category: 'Phone System',
    description: 'Assign a phone number to a Zoom Phone user',
    parameters: [
      { id: 'userId', label: 'User Email or ID', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'phoneNumber', label: 'Phone Number', type: 'text', required: true, placeholder: '+14155551234' }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const phoneNumber = escapePowerShellString(params.phoneNumber);
      
      return `# Zoom Assign Phone Number
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$PhoneNumber = "${phoneNumber}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    phone_numbers = @(
        @{
            number = $PhoneNumber
        }
    )
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/phone/users/$UserId/phone_numbers"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Phone number assigned successfully" -ForegroundColor Green
    Write-Host "  User: $UserId" -ForegroundColor Cyan
    Write-Host "  Phone Number: $PhoneNumber" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to assign phone number: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-create-call-queue',
    name: 'Create Call Queue',
    category: 'Phone System',
    description: 'Create a new call queue for Zoom Phone',
    parameters: [
      { id: 'name', label: 'Queue Name', type: 'text', required: true, placeholder: 'Sales Queue' },
      { id: 'extensionNumber', label: 'Extension Number', type: 'text', required: true, placeholder: '1001' },
      { id: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'site-id' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Sales department call queue' }
    ],
    scriptTemplate: (params) => {
      const name = escapePowerShellString(params.name);
      const extensionNumber = escapePowerShellString(params.extensionNumber);
      const siteId = escapePowerShellString(params.siteId);
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# Zoom Create Call Queue
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    name = "${name}"
    extension_number = "${extensionNumber}"
    site_id = "${siteId}"
    ${description ? `description = "${description}"` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/phone/call_queues"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Call queue created successfully" -ForegroundColor Green
    Write-Host "  Name: ${name}" -ForegroundColor Cyan
    Write-Host "  Extension: ${extensionNumber}" -ForegroundColor Cyan
    Write-Host "  Queue ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create call queue: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-add-call-queue-members',
    name: 'Add Call Queue Members',
    category: 'Phone System',
    description: 'Add members to a call queue',
    parameters: [
      { id: 'callQueueId', label: 'Call Queue ID', type: 'text', required: true, placeholder: 'queue-id' },
      { id: 'memberEmails', label: 'Member Emails (one per line)', type: 'textarea', required: true, placeholder: 'user1@company.com\nuser2@company.com' }
    ],
    scriptTemplate: (params) => {
      const callQueueId = escapePowerShellString(params.callQueueId);
      const members = (params.memberEmails as string).split('\n').filter((m: string) => m.trim());
      
      return `# Zoom Add Call Queue Members
# Generated: ${new Date().toISOString()}

$CallQueueId = "${callQueueId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Members = @(
${members.map(m => `    @{ email = "${escapePowerShellString(m.trim())}" }`).join(',\n')}
)

$Body = @{
    members = $Members
} | ConvertTo-Json -Depth 2

try {
    $Uri = "https://api.zoom.us/v2/phone/call_queues/$CallQueueId/members"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Members added to call queue successfully" -ForegroundColor Green
    Write-Host "  Queue ID: $CallQueueId" -ForegroundColor Cyan
    Write-Host "  Members Added: ${members.length}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add queue members: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-create-auto-receptionist',
    name: 'Create Auto Receptionist',
    category: 'Phone System',
    description: 'Create an auto receptionist (IVR) for Zoom Phone',
    parameters: [
      { id: 'name', label: 'Auto Receptionist Name', type: 'text', required: true, placeholder: 'Main Reception' },
      { id: 'extensionNumber', label: 'Extension Number', type: 'text', required: true, placeholder: '1000' },
      { id: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'site-id' }
    ],
    scriptTemplate: (params) => {
      const name = escapePowerShellString(params.name);
      const extensionNumber = escapePowerShellString(params.extensionNumber);
      const siteId = escapePowerShellString(params.siteId);
      
      return `# Zoom Create Auto Receptionist
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    name = "${name}"
    extension_number = "${extensionNumber}"
    site_id = "${siteId}"
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/phone/auto_receptionists"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Auto receptionist created successfully" -ForegroundColor Green
    Write-Host "  Name: ${name}" -ForegroundColor Cyan
    Write-Host "  Extension: ${extensionNumber}" -ForegroundColor Cyan
    Write-Host "  Auto Receptionist ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create auto receptionist: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-get-call-logs',
    name: 'Get Call Logs',
    category: 'Phone System',
    description: 'Retrieve call logs for a user or account',
    parameters: [
      { id: 'userId', label: 'User Email (optional, leave empty for account)', type: 'email', required: false, placeholder: 'user@company.com' },
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'callType', label: 'Call Type', type: 'select', required: false, options: ['All', 'Inbound', 'Outbound', 'Missed'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\call-logs.csv' }
    ],
    scriptTemplate: (params) => {
      const userId = params.userId ? escapePowerShellString(params.userId) : '';
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const callType = params.callType !== 'All' ? params.callType?.toLowerCase() : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom Get Call Logs
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllCallLogs = @()
$NextPageToken = ""

try {
    do {
        ${userId ? `
        $Uri = "https://api.zoom.us/v2/phone/users/${userId}/call_logs?from=${startDate}&to=${endDate}&page_size=100"
        ` : `
        $Uri = "https://api.zoom.us/v2/phone/call_logs?from=${startDate}&to=${endDate}&page_size=100"
        `}
        ${callType ? `$Uri += "&type=${callType}"` : ''}
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Call in $Response.call_logs) {
            $AllCallLogs += [PSCustomObject]@{
                CallId = $Call.id
                Direction = $Call.direction
                DateTime = $Call.date_time
                Duration = $Call.duration
                CallerNumber = $Call.caller_number
                CallerName = $Call.caller_name
                CalleeNumber = $Call.callee_number
                CalleeName = $Call.callee_name
                Result = $Call.result
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Call logs retrieved successfully" -ForegroundColor Green
    Write-Host "  Date Range: ${startDate} to ${endDate}" -ForegroundColor Cyan
    Write-Host "  Total Calls: $($AllCallLogs.Count)" -ForegroundColor Cyan
    
    $AllCallLogs | Format-Table -Property DateTime, Direction, CallerNumber, CalleeNumber, Duration, Result -AutoSize
    
    ${exportPath ? `
    $AllCallLogs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get call logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-configure-voicemail',
    name: 'Configure Voicemail Settings',
    category: 'Phone System',
    description: 'Configure voicemail settings for a Zoom Phone user',
    parameters: [
      { id: 'userId', label: 'User Email', type: 'email', required: true, placeholder: 'user@company.com' },
      { id: 'voicemailEnabled', label: 'Enable Voicemail', type: 'boolean', required: true, defaultValue: true },
      { id: 'transcription', label: 'Enable Transcription', type: 'boolean', required: false, defaultValue: true },
      { id: 'emailNotification', label: 'Email Notification', type: 'boolean', required: false, defaultValue: true },
      { id: 'maxLength', label: 'Max Message Length (seconds)', type: 'number', required: false, defaultValue: 120 }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      
      return `# Zoom Configure Voicemail Settings
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    voicemail_access_members = @{
        access_user_ids = @()
    }
    voicemail = @{
        status = $${params.voicemailEnabled ? 'true' : 'false'}
        voicemail_transcription = @{
            enable = $${params.transcription ? 'true' : 'false'}
        }
        voicemail_notification_by_email = @{
            enable = $${params.emailNotification ? 'true' : 'false'}
            include_voicemail_file = $true
            include_voicemail_transcription = $${params.transcription ? 'true' : 'false'}
        }
    }
} | ConvertTo-Json -Depth 4

try {
    $Uri = "https://api.zoom.us/v2/phone/users/$UserId/settings"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "Voicemail settings configured successfully" -ForegroundColor Green
    Write-Host "  User: $UserId" -ForegroundColor Cyan
    Write-Host "  Voicemail Enabled: ${params.voicemailEnabled}" -ForegroundColor Cyan
    Write-Host "  Transcription: ${params.transcription}" -ForegroundColor Cyan
    Write-Host "  Email Notification: ${params.emailNotification}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure voicemail: $_"
}`;
    },
    isPremium: true
  },

  // ==================== REPORTING ====================
  {
    id: 'zoom-daily-usage-report',
    name: 'Get Daily Usage Report',
    category: 'Reporting',
    description: 'Generate daily usage report for the account',
    parameters: [
      { id: 'year', label: 'Year', type: 'number', required: true, defaultValue: new Date().getFullYear() },
      { id: 'month', label: 'Month (1-12)', type: 'number', required: true, defaultValue: new Date().getMonth() + 1 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\daily-usage.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom Get Daily Usage Report
# Generated: ${new Date().toISOString()}

$Year = ${params.year}
$Month = ${params.month}
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/report/daily?year=$Year&month=$Month"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $UsageData = @()
    
    foreach ($Day in $Response.dates) {
        $UsageData += [PSCustomObject]@{
            Date = $Day.date
            NewUsers = $Day.new_users
            Meetings = $Day.meetings
            Participants = $Day.participants
            MeetingMinutes = $Day.meeting_minutes
        }
    }
    
    Write-Host "Daily usage report generated" -ForegroundColor Green
    Write-Host "  Period: $Month/$Year" -ForegroundColor Cyan
    Write-Host "  Days Reported: $($UsageData.Count)" -ForegroundColor Cyan
    
    $UsageData | Format-Table -AutoSize
    
    ${exportPath ? `
    $UsageData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get daily usage report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-meeting-report',
    name: 'Get Meeting Report',
    category: 'Reporting',
    description: 'Generate detailed report for past meetings',
    parameters: [
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'userId', label: 'User Email (optional)', type: 'email', required: false, placeholder: 'user@company.com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\meeting-report.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const userId = params.userId ? escapePowerShellString(params.userId) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Zoom Get Meeting Report
# Generated: ${new Date().toISOString()}

$StartDate = "${startDate}"
$EndDate = "${endDate}"
$ExportPath = "${exportPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllMeetings = @()
$NextPageToken = ""

try {
    do {
        ${userId ? `
        $Uri = "https://api.zoom.us/v2/report/users/${userId}/meetings?from=$StartDate&to=$EndDate&page_size=300"
        ` : `
        $Uri = "https://api.zoom.us/v2/metrics/meetings?from=$StartDate&to=$EndDate&page_size=300"
        `}
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Meeting in $Response.meetings) {
            $AllMeetings += [PSCustomObject]@{
                MeetingId = $Meeting.uuid
                Topic = $Meeting.topic
                Host = $Meeting.host
                Email = $Meeting.email
                StartTime = $Meeting.start_time
                EndTime = $Meeting.end_time
                Duration = $Meeting.duration
                Participants = $Meeting.participants
                HasPSTN = $Meeting.has_pstn
                HasVoIP = $Meeting.has_voip
                HasVideo = $Meeting.has_3rd_party_audio
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Meeting report generated" -ForegroundColor Green
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Total Meetings: $($AllMeetings.Count)" -ForegroundColor Cyan
    Write-Host "  Total Participants: $(($AllMeetings | Measure-Object -Property Participants -Sum).Sum)" -ForegroundColor Cyan
    
    $AllMeetings | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to get meeting report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-webinar-participants-report',
    name: 'Get Webinar Participants Report',
    category: 'Reporting',
    description: 'Generate report of webinar participants and attendance',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\webinar-participants.csv' }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Zoom Get Webinar Participants Report
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$ExportPath = "${exportPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllParticipants = @()
$NextPageToken = ""

try {
    # Get webinar details first
    $WebinarUri = "https://api.zoom.us/v2/report/webinars/$WebinarId"
    $WebinarResponse = Invoke-RestMethod -Uri $WebinarUri -Method Get -Headers $Headers
    
    Write-Host "Webinar: $($WebinarResponse.topic)" -ForegroundColor Cyan
    
    do {
        $Uri = "https://api.zoom.us/v2/report/webinars/$WebinarId/participants?page_size=300"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Participant in $Response.participants) {
            $AllParticipants += [PSCustomObject]@{
                ParticipantId = $Participant.id
                Name = $Participant.name
                Email = $Participant.user_email
                JoinTime = $Participant.join_time
                LeaveTime = $Participant.leave_time
                Duration = $Participant.duration
                AttentiveScore = $Participant.attentiveness_score
                Country = $Participant.country
                Device = $Participant.device
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Webinar participants report generated" -ForegroundColor Green
    Write-Host "  Total Participants: $($AllParticipants.Count)" -ForegroundColor Cyan
    Write-Host "  Average Attentiveness: $(($AllParticipants | Where-Object { $_.AttentiveScore } | Measure-Object -Property AttentiveScore -Average).Average)%" -ForegroundColor Cyan
    
    $AllParticipants | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to get webinar participants report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-qos-report',
    name: 'Get Quality of Service Report',
    category: 'Reporting',
    description: 'Generate QoS metrics report for meetings',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\qos-report.csv' }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom Get Quality of Service Report
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/metrics/meetings/$MeetingId/participants/qos"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $QoSData = @()
    
    foreach ($Participant in $Response.participants) {
        foreach ($QoS in $Participant.user_qos) {
            $QoSData += [PSCustomObject]@{
                ParticipantName = $Participant.user_name
                DateTime = $QoS.date_time
                AudioInputBitrate = $QoS.audio_input.bitrate
                AudioInputLatency = $QoS.audio_input.latency
                AudioInputJitter = $QoS.audio_input.jitter
                AudioInputPacketLoss = $QoS.audio_input.avg_loss
                VideoInputBitrate = $QoS.video_input.bitrate
                VideoInputLatency = $QoS.video_input.latency
                VideoInputJitter = $QoS.video_input.jitter
                VideoInputPacketLoss = $QoS.video_input.avg_loss
                VideoResolution = $QoS.video_input.resolution
                VideoFrameRate = $QoS.video_input.frame_rate
            }
        }
    }
    
    Write-Host "QoS report generated" -ForegroundColor Green
    Write-Host "  Meeting ID: $MeetingId" -ForegroundColor Cyan
    Write-Host "  Participants Analyzed: $($Response.participants.Count)" -ForegroundColor Cyan
    
    $QoSData | Format-Table -Property ParticipantName, AudioInputLatency, VideoInputLatency, VideoResolution -AutoSize
    
    ${exportPath ? `
    $QoSData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get QoS report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-active-hosts-report',
    name: 'Get Active Hosts Report',
    category: 'Reporting',
    description: 'Generate report of active meeting hosts',
    parameters: [
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\active-hosts.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Zoom Get Active Hosts Report
# Generated: ${new Date().toISOString()}

$StartDate = "${startDate}"
$EndDate = "${endDate}"
$ExportPath = "${exportPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllHosts = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/report/users?from=$StartDate&to=$EndDate&page_size=300"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($User in $Response.users) {
            $AllHosts += [PSCustomObject]@{
                UserId = $User.id
                Email = $User.email
                Name = "$($User.first_name) $($User.last_name)"
                Department = $User.dept
                MeetingsHosted = $User.meetings
                Participants = $User.participants
                MeetingMinutes = $User.meeting_minutes
                LastClientVersion = $User.last_client_version
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Active hosts report generated" -ForegroundColor Green
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Total Active Hosts: $($AllHosts.Count)" -ForegroundColor Cyan
    Write-Host "  Total Meetings: $(($AllHosts | Measure-Object -Property MeetingsHosted -Sum).Sum)" -ForegroundColor Cyan
    
    $AllHosts | Sort-Object -Property MeetingsHosted -Descending | Select-Object -First 10 | Format-Table -Property Name, Email, MeetingsHosted, Participants -AutoSize
    
    $AllHosts | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to get active hosts report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-cloud-recording-usage',
    name: 'Get Cloud Recording Usage',
    category: 'Reporting',
    description: 'Generate cloud recording storage usage report',
    parameters: [
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\recording-usage.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom Get Cloud Recording Usage
# Generated: ${new Date().toISOString()}

$StartDate = "${startDate}"
$EndDate = "${endDate}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllRecordings = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/accounts/me/recordings?from=$StartDate&to=$EndDate&page_size=300"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Meeting in $Response.meetings) {
            $TotalSize = ($Meeting.recording_files | Measure-Object -Property file_size -Sum).Sum
            
            $AllRecordings += [PSCustomObject]@{
                MeetingId = $Meeting.uuid
                Topic = $Meeting.topic
                HostEmail = $Meeting.host_email
                StartTime = $Meeting.start_time
                Duration = $Meeting.duration
                FileCount = $Meeting.recording_files.Count
                TotalSizeMB = [math]::Round($TotalSize / 1MB, 2)
                RecordingTypes = ($Meeting.recording_files.recording_type | Select-Object -Unique) -join ", "
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    $TotalStorageMB = ($AllRecordings | Measure-Object -Property TotalSizeMB -Sum).Sum
    $TotalStorageGB = [math]::Round($TotalStorageMB / 1024, 2)
    
    Write-Host "Cloud recording usage report generated" -ForegroundColor Green
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Total Recordings: $($AllRecordings.Count)" -ForegroundColor Cyan
    Write-Host "  Total Storage Used: $TotalStorageGB GB" -ForegroundColor Cyan
    
    $AllRecordings | Sort-Object -Property TotalSizeMB -Descending | Select-Object -First 10 | Format-Table -Property Topic, HostEmail, TotalSizeMB, FileCount -AutoSize
    
    ${exportPath ? `
    $AllRecordings | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get cloud recording usage: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-audit-logs',
    name: 'Generate Audit Logs',
    category: 'Reporting',
    description: 'Generate audit logs for compliance and security',
    parameters: [
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\audit-logs.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Zoom Generate Audit Logs
# Generated: ${new Date().toISOString()}

$StartDate = "${startDate}"
$EndDate = "${endDate}"
$ExportPath = "${exportPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllAuditLogs = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/report/operationlogs?from=$StartDate&to=$EndDate&page_size=300"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Log in $Response.operation_logs) {
            $AllAuditLogs += [PSCustomObject]@{
                Timestamp = $Log.time
                OperatorEmail = $Log.operator
                Category = $Log.category_type
                Action = $Log.action
                OperationDetail = $Log.operation_detail
                IPAddress = $Log.ip_address
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Audit logs generated" -ForegroundColor Green
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Total Log Entries: $($AllAuditLogs.Count)" -ForegroundColor Cyan
    
    # Summary by category
    $CategorySummary = $AllAuditLogs | Group-Object -Property Category | Sort-Object Count -Descending
    Write-Host ""
    Write-Host "Activities by Category:" -ForegroundColor Yellow
    $CategorySummary | Format-Table -Property Count, Name -AutoSize
    
    $AllAuditLogs | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to generate audit logs: $_"
}`;
    },
    isPremium: true
  },

  // ==================== SETTINGS ====================
  {
    id: 'zoom-configure-account-settings',
    name: 'Configure Account Settings',
    category: 'Settings',
    description: 'Configure global account settings',
    parameters: [
      { id: 'hostVideo', label: 'Host Video Default', type: 'boolean', required: false, defaultValue: true },
      { id: 'participantVideo', label: 'Participant Video Default', type: 'boolean', required: false, defaultValue: true },
      { id: 'autoRecording', label: 'Auto Recording', type: 'select', required: false, options: ['none', 'local', 'cloud'], defaultValue: 'none' },
      { id: 'chatEnabled', label: 'Enable In-Meeting Chat', type: 'boolean', required: false, defaultValue: true },
      { id: 'fileTransfer', label: 'Allow File Transfer', type: 'boolean', required: false, defaultValue: false },
      { id: 'screenSharing', label: 'Screen Sharing', type: 'select', required: false, options: ['host', 'all'], defaultValue: 'host' }
    ],
    scriptTemplate: (params) => {
      return `# Zoom Configure Account Settings
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    schedule_meeting = @{
        host_video = $${params.hostVideo ? 'true' : 'false'}
        participants_video = $${params.participantVideo ? 'true' : 'false'}
    }
    in_meeting = @{
        chat = $${params.chatEnabled ? 'true' : 'false'}
        file_transfer = $${params.fileTransfer ? 'true' : 'false'}
        screen_sharing = $${params.screenSharing === 'host' ? 'false' : 'true'}
    }
    recording = @{
        auto_recording = "${params.autoRecording || 'none'}"
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/accounts/me/settings"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "Account settings configured successfully" -ForegroundColor Green
    Write-Host "  Host Video: ${params.hostVideo}" -ForegroundColor Cyan
    Write-Host "  Participant Video: ${params.participantVideo}" -ForegroundColor Cyan
    Write-Host "  Auto Recording: ${params.autoRecording}" -ForegroundColor Cyan
    Write-Host "  Chat Enabled: ${params.chatEnabled}" -ForegroundColor Cyan
    Write-Host "  File Transfer: ${params.fileTransfer}" -ForegroundColor Cyan
    Write-Host "  Screen Sharing: ${params.screenSharing}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure account settings: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-configure-security-settings',
    name: 'Configure Security Settings',
    category: 'Settings',
    description: 'Configure account security policies and settings',
    parameters: [
      { id: 'requirePasswordForScheduling', label: 'Require Password for Scheduling', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableWaitingRoom', label: 'Enable Waiting Room', type: 'boolean', required: false, defaultValue: true },
      { id: 'onlyAuthenticatedUsers', label: 'Only Authenticated Users Can Join', type: 'boolean', required: false, defaultValue: false },
      { id: 'embedPassword', label: 'Embed Password in Join Link', type: 'boolean', required: false, defaultValue: false },
      { id: 'requireEncryption', label: 'Require Encryption for 3rd Party', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      return `# Zoom Configure Security Settings
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    security = @{
        password_requirement = @{
            minimum_password_length = 8
            have_special_character = $true
            consecutive_characters_length = 0
        }
    }
    schedule_meeting = @{
        require_password_for_scheduling_new_meetings = $${params.requirePasswordForScheduling ? 'true' : 'false'}
        require_password_for_instant_meetings = $${params.requirePasswordForScheduling ? 'true' : 'false'}
        require_password_for_pmi_meetings = "all"
        embed_password_in_join_link = $${params.embedPassword ? 'true' : 'false'}
    }
    in_meeting = @{
        waiting_room = $${params.enableWaitingRoom ? 'true' : 'false'}
        require_encryption_for_3rd_party_endpoints = $${params.requireEncryption ? 'true' : 'false'}
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/accounts/me/settings"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "Security settings configured successfully" -ForegroundColor Green
    Write-Host "  Password Required: ${params.requirePasswordForScheduling}" -ForegroundColor Cyan
    Write-Host "  Waiting Room: ${params.enableWaitingRoom}" -ForegroundColor Cyan
    Write-Host "  Authenticated Users Only: ${params.onlyAuthenticatedUsers}" -ForegroundColor Cyan
    Write-Host "  Embed Password: ${params.embedPassword}" -ForegroundColor Cyan
    Write-Host "  Require Encryption: ${params.requireEncryption}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure security settings: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-configure-sso',
    name: 'Configure SSO Settings',
    category: 'Settings',
    description: 'Configure Single Sign-On settings for the account',
    parameters: [
      { id: 'ssoUrl', label: 'SSO Sign-In URL', type: 'text', required: true, placeholder: 'https://sso.company.com/saml' },
      { id: 'issuer', label: 'Issuer/Entity ID', type: 'text', required: true, placeholder: 'https://company.com' },
      { id: 'certificate', label: 'SAML Certificate', type: 'textarea', required: true, placeholder: 'Paste X.509 certificate' },
      { id: 'bindingType', label: 'Binding Type', type: 'select', required: true, options: ['HTTP-POST', 'HTTP-Redirect'], defaultValue: 'HTTP-POST' }
    ],
    scriptTemplate: (params) => {
      const ssoUrl = escapePowerShellString(params.ssoUrl);
      const issuer = escapePowerShellString(params.issuer);
      const certificate = escapePowerShellString(params.certificate);
      const bindingType = escapePowerShellString(params.bindingType);
      
      return `# Zoom Configure SSO Settings
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Certificate = @"
${certificate}
"@

$Body = @{
    vanity_url = ""
    sign_in_page_url = "${ssoUrl}"
    sign_out_page_url = "${ssoUrl}/logout"
    saml_provider_name = "Corporate SSO"
    issuer = "${issuer}"
    certificate = $Certificate
    binding = "${bindingType}"
    attribute_mappings = @(
        @{
            source_attribute_name = "email"
            target_attribute_name = "email"
        }
        @{
            source_attribute_name = "firstName"
            target_attribute_name = "first_name"
        }
        @{
            source_attribute_name = "lastName"
            target_attribute_name = "last_name"
        }
    )
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/accounts/me/sso"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "SSO settings configured successfully" -ForegroundColor Green
    Write-Host "  SSO URL: ${ssoUrl}" -ForegroundColor Cyan
    Write-Host "  Issuer: ${issuer}" -ForegroundColor Cyan
    Write-Host "  Binding: ${bindingType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure SSO: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-get-account-settings',
    name: 'Get Account Settings',
    category: 'Settings',
    description: 'Retrieve current account settings',
    parameters: [
      { id: 'settingType', label: 'Settings Type', type: 'select', required: true, options: ['meeting', 'recording', 'telephony', 'security', 'all'], defaultValue: 'all' }
    ],
    scriptTemplate: (params) => {
      const settingType = escapePowerShellString(params.settingType);
      
      return `# Zoom Get Account Settings
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/accounts/me/settings"
    ${settingType !== 'all' ? `$Uri += "?option=${settingType}"` : ''}
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Account settings retrieved successfully" -ForegroundColor Green
    Write-Host ""
    
    ${settingType === 'all' || settingType === 'meeting' ? `
    Write-Host "=== Meeting Settings ===" -ForegroundColor Yellow
    Write-Host "  Host Video: $($Response.schedule_meeting.host_video)" -ForegroundColor Cyan
    Write-Host "  Participant Video: $($Response.schedule_meeting.participants_video)" -ForegroundColor Cyan
    Write-Host "  Join Before Host: $($Response.schedule_meeting.join_before_host)" -ForegroundColor Cyan
    Write-Host "  Waiting Room: $($Response.in_meeting.waiting_room)" -ForegroundColor Cyan
    Write-Host ""
    ` : ''}
    
    ${settingType === 'all' || settingType === 'recording' ? `
    Write-Host "=== Recording Settings ===" -ForegroundColor Yellow
    Write-Host "  Auto Recording: $($Response.recording.auto_recording)" -ForegroundColor Cyan
    Write-Host "  Cloud Recording: $($Response.recording.cloud_recording)" -ForegroundColor Cyan
    Write-Host "  Local Recording: $($Response.recording.local_recording)" -ForegroundColor Cyan
    Write-Host ""
    ` : ''}
    
    ${settingType === 'all' || settingType === 'security' ? `
    Write-Host "=== Security Settings ===" -ForegroundColor Yellow
    Write-Host "  Password Required: $($Response.schedule_meeting.require_password_for_scheduling_new_meetings)" -ForegroundColor Cyan
    Write-Host "  Embed Password: $($Response.schedule_meeting.embed_password_in_join_link)" -ForegroundColor Cyan
    Write-Host ""
    ` : ''}
    
    $Response | ConvertTo-Json -Depth 5
    
} catch {
    Write-Error "Failed to get account settings: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-manage-trusted-domains',
    name: 'Manage Trusted Domains',
    category: 'Settings',
    description: 'Manage trusted email domains for the account',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List', 'Add', 'Remove'], defaultValue: 'List' },
      { id: 'domain', label: 'Domain (for Add/Remove)', type: 'text', required: false, placeholder: 'company.com' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const domain = params.domain ? escapePowerShellString(params.domain) : '';
      
      return `# Zoom Manage Trusted Domains
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    switch ("${action}") {
        "List" {
            $Uri = "https://api.zoom.us/v2/accounts/me/trusted_domains"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            Write-Host "Trusted domains retrieved" -ForegroundColor Green
            Write-Host ""
            
            foreach ($Domain in $Response.trusted_domains) {
                Write-Host "  - $Domain" -ForegroundColor Cyan
            }
        }
        "Add" {
            $Uri = "https://api.zoom.us/v2/accounts/me/trusted_domains"
            $Body = @{
                trusted_domains = @("${domain}")
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            Write-Host "Domain added successfully" -ForegroundColor Green
            Write-Host "  Domain: ${domain}" -ForegroundColor Cyan
        }
        "Remove" {
            $Uri = "https://api.zoom.us/v2/accounts/me/trusted_domains/${domain}"
            Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
            
            Write-Host "Domain removed successfully" -ForegroundColor Green
            Write-Host "  Domain: ${domain}" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Failed to manage trusted domains: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-configure-branding',
    name: 'Configure Meeting Branding',
    category: 'Settings',
    description: 'Configure meeting branding and customization settings',
    parameters: [
      { id: 'supportLink', label: 'Support Link URL', type: 'text', required: false, placeholder: 'https://support.company.com' },
      { id: 'privacyLink', label: 'Privacy Policy URL', type: 'text', required: false, placeholder: 'https://company.com/privacy' },
      { id: 'termsLink', label: 'Terms of Service URL', type: 'text', required: false, placeholder: 'https://company.com/terms' }
    ],
    scriptTemplate: (params) => {
      const supportLink = params.supportLink ? escapePowerShellString(params.supportLink) : '';
      const privacyLink = params.privacyLink ? escapePowerShellString(params.privacyLink) : '';
      const termsLink = params.termsLink ? escapePowerShellString(params.termsLink) : '';
      
      return `# Zoom Configure Meeting Branding
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$Body = @{
    ${supportLink ? `support_url = "${supportLink}"` : ''}
    ${privacyLink ? `privacy_url = "${privacyLink}"` : ''}
    ${termsLink ? `terms_url = "${termsLink}"` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/accounts/me/branding"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "Branding settings configured successfully" -ForegroundColor Green
    ${supportLink ? `Write-Host "  Support Link: ${supportLink}" -ForegroundColor Cyan` : ''}
    ${privacyLink ? `Write-Host "  Privacy Link: ${privacyLink}" -ForegroundColor Cyan` : ''}
    ${termsLink ? `Write-Host "  Terms Link: ${termsLink}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to configure branding: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-bulk-update-users',
    name: 'Bulk Update User Settings',
    category: 'User Management',
    description: 'Update settings for multiple users at once',
    parameters: [
      { id: 'userEmails', label: 'User Emails (one per line)', type: 'textarea', required: true, placeholder: 'user1@company.com\nuser2@company.com' },
      { id: 'hostVideo', label: 'Host Video On', type: 'boolean', required: false, defaultValue: true },
      { id: 'waitingRoom', label: 'Enable Waiting Room', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const userEmails = (params.userEmails as string).split('\n').filter((u: string) => u.trim());
      
      return `# Zoom Bulk Update User Settings
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$UserEmails = @(
${userEmails.map(e => `    "${escapePowerShellString(e.trim())}"`).join(',\n')}
)

$Body = @{
    schedule_meeting = @{
        host_video = $${params.hostVideo ? 'true' : 'false'}
    }
    in_meeting = @{
        waiting_room = $${params.waitingRoom ? 'true' : 'false'}
    }
} | ConvertTo-Json -Depth 3

$SuccessCount = 0
$FailCount = 0

try {
    foreach ($UserId in $UserEmails) {
        try {
            $Uri = "https://api.zoom.us/v2/users/$UserId/settings"
            Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
            
            Write-Host "Updated: $UserId" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $UserId - $_" -ForegroundColor Red
            $FailCount++
        }
        
        Start-Sleep -Milliseconds 200
    }
    
    Write-Host ""
    Write-Host "Bulk update completed" -ForegroundColor Green
    Write-Host "  Success: $SuccessCount" -ForegroundColor Cyan
    Write-Host "  Failed: $FailCount" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-get-webinar-details',
    name: 'Get Webinar Details',
    category: 'Webinar Management',
    description: 'Get detailed information about a specific webinar',
    parameters: [
      { id: 'webinarId', label: 'Webinar ID', type: 'text', required: true, placeholder: '123456789' }
    ],
    scriptTemplate: (params) => {
      const webinarId = escapePowerShellString(params.webinarId);
      
      return `# Zoom Get Webinar Details
# Generated: ${new Date().toISOString()}

$WebinarId = "${webinarId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/webinars/$WebinarId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Webinar Details Retrieved" -ForegroundColor Green
    Write-Host "  Topic: $($Response.topic)" -ForegroundColor Cyan
    Write-Host "  Webinar ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Host: $($Response.host_email)" -ForegroundColor Cyan
    Write-Host "  Start Time: $($Response.start_time)" -ForegroundColor Cyan
    Write-Host "  Duration: $($Response.duration) minutes" -ForegroundColor Cyan
    Write-Host "  Timezone: $($Response.timezone)" -ForegroundColor Cyan
    Write-Host "  Registration URL: $($Response.registration_url)" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Settings:" -ForegroundColor Yellow
    Write-Host "  Approval Type: $($Response.settings.approval_type)" -ForegroundColor Cyan
    Write-Host "  Practice Session: $($Response.settings.practice_session)" -ForegroundColor Cyan
    Write-Host "  HD Video: $($Response.settings.hd_video)" -ForegroundColor Cyan
    Write-Host "  Q&A: $($Response.settings.question_and_answer.enable)" -ForegroundColor Cyan
    Write-Host "  Auto Recording: $($Response.settings.auto_recording)" -ForegroundColor Cyan
    
    $Response | ConvertTo-Json -Depth 5
    
} catch {
    Write-Error "Failed to get webinar details: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-list-phone-sites',
    name: 'List Phone Sites',
    category: 'Phone System',
    description: 'List all Zoom Phone sites in the account',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\phone-sites.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Zoom List Phone Sites
# Generated: ${new Date().toISOString()}

$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($JWTToken)
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$AllSites = @()
$NextPageToken = ""

try {
    do {
        $Uri = "https://api.zoom.us/v2/phone/sites?page_size=100"
        if ($NextPageToken) {
            $Uri += "&next_page_token=$NextPageToken"
        }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        foreach ($Site in $Response.sites) {
            $AllSites += [PSCustomObject]@{
                SiteId = $Site.id
                Name = $Site.name
                MainNumber = $Site.main_number
                Country = $Site.country
                Address = $Site.address.address_line1
                City = $Site.address.city
                State = $Site.address.state
                EmergencyAddress = $Site.emergency_address.address_line1
            }
        }
        
        $NextPageToken = $Response.next_page_token
        
    } while ($NextPageToken)
    
    Write-Host "Phone sites retrieved successfully" -ForegroundColor Green
    Write-Host "  Total Sites: $($AllSites.Count)" -ForegroundColor Cyan
    
    $AllSites | Format-Table -Property Name, MainNumber, City, State, Country -AutoSize
    
    ${exportPath ? `
    $AllSites | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list phone sites: $_"
}`;
    },
    isPremium: true
  }
];
