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
  {
    id: 'zoom-bulk-create-users',
    name: 'Bulk Create Users',
    category: 'Bulk Operations',
    description: 'Create multiple Zoom users',
    parameters: [
      { id: 'accountId', label: 'Account ID', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (one per line)', type: 'textarea', required: true },
      { id: 'licenseType', label: 'License Type', type: 'select', required: true, options: ['Basic', 'Licensed', 'On-Prem'], defaultValue: 'Licensed' }
    ],
    scriptTemplate: (params) => {
      const accountId = escapePowerShellString(params.accountId);
      const userEmails = (params.userEmails as string).split('\n').filter((u: string) => u.trim());
      const licenseType = params.licenseType === 'Basic' ? '1' : params.licenseType === 'Licensed' ? '2' : '3';
      
      return `# Zoom Bulk Create Users
# Generated: ${new Date().toISOString()}

$AccountId = "${accountId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

$UserEmails = @(
${userEmails.map(e => `    "${escapePowerShellString(e.trim())}"`).join(',\n')}
)

try {
    foreach ($Email in $UserEmails) {
        $FirstName = $Email.Split('@')[0].Split('.')[0]
        $LastName = $Email.Split('@')[0].Split('.')[1]
        
        $Body = @{
            action = "create"
            user_info = @{
                email = $Email
                type = ${licenseType}
                first_name = $FirstName
                last_name = $LastName
            }
        } | ConvertTo-Json
        
        $Uri = "https://api.zoom.us/v2/users"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ User created: $Email" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk user creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'zoom-schedule-meeting',
    name: 'Schedule Meeting',
    category: 'Meeting Management',
    description: 'Schedule a Zoom meeting',
    parameters: [
      { id: 'userId', label: 'User ID (email)', type: 'email', required: true },
      { id: 'topic', label: 'Meeting Topic', type: 'text', required: true, placeholder: 'Weekly Team Meeting' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: true, defaultValue: 60 }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const topic = escapePowerShellString(params.topic);
      
      return `# Zoom Schedule Meeting
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

$Body = @{
    topic = "${topic}"
    type = 2
    duration = ${params.duration}
    settings = @{
        host_video = $true
        participant_video = $true
        join_before_host = $false
        mute_upon_entry = $true
    }
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/meetings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Meeting scheduled: ${topic}" -ForegroundColor Green
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    Write-Host "  Meeting ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'zoom-manage-users-groups',
    name: 'Manage Users and Groups',
    category: 'Common Admin Tasks',
    description: 'Manage Zoom users, groups, and user settings',
    parameters: [
      { id: 'accountId', label: 'Account ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List Users', 'Update User', 'Delete User', 'List Groups'], defaultValue: 'List Users' },
      { id: 'userId', label: 'User ID (for Update/Delete)', type: 'email', required: false, placeholder: 'user@company.com' }
    ],
    scriptTemplate: (params) => {
      const accountId = escapePowerShellString(params.accountId);
      const action = params.action;
      const userId = params.userId ? escapePowerShellString(params.userId) : '';
      
      return `# Zoom Manage Users and Groups
# Generated: ${new Date().toISOString()}

$AccountId = "${accountId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

try {
    switch ("${action}") {
        "List Users" {
            $Uri = "https://api.zoom.us/v2/users?status=active&page_size=300"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            Write-Host "✓ User List Retrieved" -ForegroundColor Green
            Write-Host "  Total Users: $($Response.total_records)" -ForegroundColor Cyan
            
            $Response.users | Format-Table -Property id, email, type, status -AutoSize
        }
        "Update User" {
            $Uri = "https://api.zoom.us/v2/users/${userId}"
            $Body = @{
                type = 2
            } | ConvertTo-Json
            
            $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
            
            Write-Host "✓ User updated: ${userId}" -ForegroundColor Green
        }
        "Delete User" {
            $Uri = "https://api.zoom.us/v2/users/${userId}?action=delete"
            Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
            
            Write-Host "✓ User deleted: ${userId}" -ForegroundColor Green
        }
        "List Groups" {
            $Uri = "https://api.zoom.us/v2/groups"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            Write-Host "✓ Groups Retrieved" -ForegroundColor Green
            $Response.groups | Format-Table -Property id, name, total_members -AutoSize
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-meeting-details',
    name: 'Retrieve Meeting Details and Participants',
    category: 'Common Admin Tasks',
    description: 'Get detailed information about meetings and participants',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'includeParticipants', label: 'Include Participants', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const includeParticipants = params.includeParticipants;
      
      return `# Zoom Retrieve Meeting Details and Participants
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "✓ Meeting Details Retrieved" -ForegroundColor Green
    Write-Host "  Topic: $($Response.topic)" -ForegroundColor Cyan
    Write-Host "  Start Time: $($Response.start_time)" -ForegroundColor Cyan
    Write-Host "  Duration: $($Response.duration) minutes" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    
    ${includeParticipants ? `
    $ParticipantsUri = "https://api.zoom.us/v2/metrics/meetings/$MeetingId/participants"
    $ParticipantsResponse = Invoke-RestMethod -Uri $ParticipantsUri -Method Get -Headers $Headers
    
    Write-Host ""
    Write-Host "✓ Participants:" -ForegroundColor Green
    Write-Host "  Total: $($ParticipantsResponse.total_records)" -ForegroundColor Cyan
    
    $ParticipantsResponse.participants | Format-Table -Property name, user_email, join_time, leave_time -AutoSize` : ''}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-download-recordings',
    name: 'Retrieve and Download Meeting Recordings',
    category: 'Common Admin Tasks',
    description: 'Download meeting recordings and transcripts',
    parameters: [
      { id: 'meetingId', label: 'Meeting ID', type: 'text', required: true, placeholder: '123456789' },
      { id: 'downloadPath', label: 'Download Directory', type: 'path', required: true, placeholder: 'C:\\Recordings' }
    ],
    scriptTemplate: (params) => {
      const meetingId = escapePowerShellString(params.meetingId);
      const downloadPath = escapePowerShellString(params.downloadPath);
      
      return `# Zoom Retrieve and Download Meeting Recordings
# Generated: ${new Date().toISOString()}

$MeetingId = "${meetingId}"
$DownloadPath = "${downloadPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

if (-not (Test-Path $DownloadPath)) {
    New-Item -Path $DownloadPath -ItemType Directory | Out-Null
}

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/meetings/$MeetingId/recordings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "✓ Recording Information Retrieved" -ForegroundColor Green
    Write-Host "  Topic: $($Response.topic)" -ForegroundColor Cyan
    Write-Host "  Recording Count: $($Response.recording_files.Count)" -ForegroundColor Cyan
    
    foreach ($Recording in $Response.recording_files) {
        $FileName = "$($Response.topic)_$($Recording.recording_type)_$($Recording.id).mp4"
        $FilePath = Join-Path $DownloadPath $FileName
        
        Write-Host ""
        Write-Host "Downloading: $FileName" -ForegroundColor Yellow
        
        $DownloadUri = "$($Recording.download_url)?access_token=$JWTToken"
        Invoke-WebRequest -Uri $DownloadUri -OutFile $FilePath
        
        Write-Host "✓ Downloaded: $FilePath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "All recordings downloaded to: $DownloadPath" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-configure-sso',
    name: 'Configure SSO Settings',
    category: 'Common Admin Tasks',
    description: 'Configure Single Sign-On settings for the account',
    parameters: [
      { id: 'accountId', label: 'Account ID', type: 'text', required: true },
      { id: 'ssoUrl', label: 'SSO URL', type: 'text', required: true, placeholder: 'https://sso.company.com/saml' },
      { id: 'issuer', label: 'Issuer', type: 'text', required: true, placeholder: 'https://company.com' },
      { id: 'certificate', label: 'Certificate', type: 'textarea', required: true, placeholder: 'Paste SSO certificate' }
    ],
    scriptTemplate: (params) => {
      const accountId = escapePowerShellString(params.accountId);
      const ssoUrl = escapePowerShellString(params.ssoUrl);
      const issuer = escapePowerShellString(params.issuer);
      const certificate = escapePowerShellString(params.certificate);
      
      return `# Zoom Configure SSO Settings
# Generated: ${new Date().toISOString()}

$AccountId = "${accountId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

$Body = @{
    sign_in_page_url = "${ssoUrl}"
    sign_out_page_url = "${ssoUrl}/logout"
    saml_provider_name = "Corporate SSO"
    issuer = "${issuer}"
    certificate = "${certificate}"
} | ConvertTo-Json

try {
    $Uri = "https://api.zoom.us/v2/accounts/$AccountId/sso"
    $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "✓ SSO settings configured successfully" -ForegroundColor Green
    Write-Host "  SSO URL: ${ssoUrl}" -ForegroundColor Cyan
    Write-Host "  Issuer: ${issuer}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure SSO: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-security-policies',
    name: 'Configure Security Policies',
    category: 'Common Admin Tasks',
    description: 'Configure account security policies and settings',
    parameters: [
      { id: 'accountId', label: 'Account ID', type: 'text', required: true },
      { id: 'requirePasswordForScheduling', label: 'Require Password for Scheduling', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableWaitingRoom', label: 'Enable Waiting Room', type: 'boolean', required: false, defaultValue: true },
      { id: 'onlyAuthenticatedUsers', label: 'Only Authenticated Users Can Join', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const accountId = escapePowerShellString(params.accountId);
      const requirePassword = params.requirePasswordForScheduling ? 'true' : 'false';
      const waitingRoom = params.enableWaitingRoom ? 'true' : 'false';
      const authenticatedOnly = params.onlyAuthenticatedUsers ? 'true' : 'false';
      
      return `# Zoom Configure Security Policies
# Generated: ${new Date().toISOString()}

$AccountId = "${accountId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

$SecuritySettings = @{
    schedule_meeting = @{
        require_password_for_scheduling_new_meetings = $${requirePassword}
        waiting_room = $${waitingRoom}
        only_authenticated_users_can_join_from_web_client = $${authenticatedOnly}
        embed_password_in_join_link = $false
    }
    in_meeting = @{
        allow_participants_to_rename = $false
        allow_participants_chat = $true
        disable_screen_sharing_for_in_meeting_guests = $true
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/accounts/$AccountId/settings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $SecuritySettings
    
    Write-Host "✓ Security policies configured successfully" -ForegroundColor Green
    Write-Host "  Password Required: ${requirePassword}" -ForegroundColor Cyan
    Write-Host "  Waiting Room: ${waitingRoom}" -ForegroundColor Cyan
    Write-Host "  Authenticated Users Only: ${authenticatedOnly}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure security policies: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-usage-statistics',
    name: 'Monitor Usage Statistics',
    category: 'Common Admin Tasks',
    description: 'Retrieve usage statistics and analytics for the account',
    parameters: [
      { id: 'accountId', label: 'Account ID', type: 'text', required: true },
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\zoom-usage.csv' }
    ],
    scriptTemplate: (params) => {
      const accountId = escapePowerShellString(params.accountId);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Zoom Monitor Usage Statistics
# Generated: ${new Date().toISOString()}

$AccountId = "${accountId}"
$StartDate = "${startDate}"
$EndDate = "${endDate}"
$ExportPath = "${exportPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/metrics/meetings?from=$StartDate&to=$EndDate&page_size=300"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $UsageData = @()
    
    foreach ($Meeting in $Response.meetings) {
        $UsageData += [PSCustomObject]@{
            MeetingID = $Meeting.uuid
            Topic = $Meeting.topic
            Host = $Meeting.host
            StartTime = $Meeting.start_time
            EndTime = $Meeting.end_time
            Duration = $Meeting.duration
            Participants = $Meeting.participants_count
        }
    }
    
    $UsageData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "✓ Usage statistics exported" -ForegroundColor Green
    Write-Host "  Total Meetings: $($UsageData.Count)" -ForegroundColor Cyan
    Write-Host "  Total Participants: $(($UsageData | Measure-Object -Property Participants -Sum).Sum)" -ForegroundColor Cyan
    Write-Host "  Total Duration: $(($UsageData | Measure-Object -Property Duration -Sum).Sum) minutes" -ForegroundColor Cyan
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to retrieve usage statistics: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-audit-logs',
    name: 'Generate Audit Logs',
    category: 'Common Admin Tasks',
    description: 'Generate and export audit logs for compliance',
    parameters: [
      { id: 'accountId', label: 'Account ID', type: 'text', required: true },
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Logs\\zoom-audit.csv' }
    ],
    scriptTemplate: (params) => {
      const accountId = escapePowerShellString(params.accountId);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Zoom Generate Audit Logs
# Generated: ${new Date().toISOString()}

$AccountId = "${accountId}"
$StartDate = "${startDate}"
$EndDate = "${endDate}"
$ExportPath = "${exportPath}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://api.zoom.us/v2/report/activities?from=$StartDate&to=$EndDate&page_size=300"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $AuditData = @()
    
    foreach ($Activity in $Response.activity_logs) {
        $AuditData += [PSCustomObject]@{
            Timestamp = $Activity.time
            User = $Activity.email
            Action = $Activity.action
            Category = $Activity.category
            IP_Address = $Activity.ip_address
            Client_Type = $Activity.client_type
        }
    }
    
    $AuditData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "✓ Audit logs generated" -ForegroundColor Green
    Write-Host "  Total Activities: $($AuditData.Count)" -ForegroundColor Cyan
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
    $ActionSummary = $AuditData | Group-Object -Property Action | Sort-Object Count -Descending | Select-Object -First 5
    
    Write-Host ""
    Write-Host "Top 5 Actions:" -ForegroundColor Yellow
    $ActionSummary | Format-Table -Property Count, Name -AutoSize
    
} catch {
    Write-Error "Failed to generate audit logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'zoom-schedule-recurring',
    name: 'Schedule Recurring Meetings',
    category: 'Common Admin Tasks',
    description: 'Schedule recurring meetings with custom recurrence patterns',
    parameters: [
      { id: 'userId', label: 'User ID (email)', type: 'email', required: true },
      { id: 'topic', label: 'Meeting Topic', type: 'text', required: true, placeholder: 'Weekly Team Standup' },
      { id: 'duration', label: 'Duration (minutes)', type: 'number', required: true, defaultValue: 30 },
      { id: 'recurrenceType', label: 'Recurrence Type', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Weekly' },
      { id: 'occurrences', label: 'Number of Occurrences', type: 'number', required: true, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const userId = escapePowerShellString(params.userId);
      const topic = escapePowerShellString(params.topic);
      const recurrenceType = params.recurrenceType === 'Daily' ? '1' : params.recurrenceType === 'Weekly' ? '2' : '3';
      
      return `# Zoom Schedule Recurring Meetings
# Generated: ${new Date().toISOString()}

$UserId = "${userId}"
$JWTToken = Read-Host -Prompt "Enter Zoom JWT Token"

$Headers = @{
    "Authorization" = "Bearer $JWTToken"
    "Content-Type" = "application/json"
}

$Body = @{
    topic = "${topic}"
    type = 8
    duration = ${params.duration}
    recurrence = @{
        type = ${recurrenceType}
        repeat_interval = 1
        end_times = ${params.occurrences}
    }
    settings = @{
        host_video = $true
        participant_video = $true
        join_before_host = $false
        mute_upon_entry = $true
        waiting_room = $true
        approval_type = 2
    }
} | ConvertTo-Json -Depth 3

try {
    $Uri = "https://api.zoom.us/v2/users/$UserId/meetings"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Recurring meeting scheduled successfully" -ForegroundColor Green
    Write-Host "  Topic: ${topic}" -ForegroundColor Cyan
    Write-Host "  Recurrence: ${params.recurrenceType}" -ForegroundColor Cyan
    Write-Host "  Occurrences: ${params.occurrences}" -ForegroundColor Cyan
    Write-Host "  Join URL: $($Response.join_url)" -ForegroundColor Cyan
    Write-Host "  Meeting ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to schedule recurring meeting: $_"
}`;
    },
    isPremium: true
  }
];
