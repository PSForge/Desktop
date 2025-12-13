import { escapePowerShellString } from './powershell-utils';

export interface SlackTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface SlackTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: SlackTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const slackTasks: SlackTask[] = [
  {
    id: 'slack-post-message',
    name: 'Post Message to Channel',
    category: 'Messaging',
    description: 'Send a message to a Slack channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID or Name', type: 'text', required: true, placeholder: '#general' },
      { id: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'Hello from PowerShell!' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const message = escapePowerShellString(params.message);
      
      return `# Slack Post Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$Message = "${message}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    text = $Message
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/chat.postMessage"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Message posted to $Channel" -ForegroundColor Green
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'slack-create-channel',
    name: 'Create Channel',
    category: 'Channel Management',
    description: 'Create a new Slack channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true },
      { id: 'channelName', label: 'Channel Name', type: 'text', required: true, placeholder: 'project-alpha' },
      { id: 'isPrivate', label: 'Private Channel', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelName = escapePowerShellString(params.channelName);
      const isPrivate = params.isPrivate ? 'true' : 'false';
      
      return `# Slack Create Channel
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    name = "${channelName}"
    is_private = $${isPrivate}
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/conversations.create"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Channel created: #${channelName}" -ForegroundColor Green
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'slack-manage-channels',
    name: 'Manage Channels',
    category: 'Common Admin Tasks',
    description: 'Archive, rename, or update channel properties',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Archive', 'Rename', 'Set Topic', 'Set Purpose'], defaultValue: 'Archive' },
      { id: 'newValue', label: 'New Value (for Rename/Topic/Purpose)', type: 'text', required: false, placeholder: 'New channel name or description' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const action = params.action;
      const newValue = params.newValue ? escapePowerShellString(params.newValue) : '';
      
      return `# Slack Manage Channels
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    switch ("${action}") {
        "Archive" {
            $Uri = "https://slack.com/api/conversations.archive"
            $Body = @{ channel = $ChannelId } | ConvertTo-Json
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] Channel archived successfully" -ForegroundColor Green
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Rename" {
            $Uri = "https://slack.com/api/conversations.rename"
            $Body = @{
                channel = $ChannelId
                name = "${newValue}"
            } | ConvertTo-Json
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] Channel renamed to: ${newValue}" -ForegroundColor Green
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Set Topic" {
            $Uri = "https://slack.com/api/conversations.setTopic"
            $Body = @{
                channel = $ChannelId
                topic = "${newValue}"
            } | ConvertTo-Json
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] Channel topic updated" -ForegroundColor Green
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Set Purpose" {
            $Uri = "https://slack.com/api/conversations.setPurpose"
            $Body = @{
                channel = $ChannelId
                purpose = "${newValue}"
            } | ConvertTo-Json
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] Channel purpose updated" -ForegroundColor Green
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-manage-users',
    name: 'Manage Users and Permissions',
    category: 'Common Admin Tasks',
    description: 'Invite users, manage permissions, and user groups',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Invite to Channel', 'Remove from Channel', 'Get User Info'], defaultValue: 'Invite to Channel' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const userEmail = escapePowerShellString(params.userEmail);
      const channelId = escapePowerShellString(params.channelId);
      const action = params.action;
      
      return `# Slack Manage Users and Permissions
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$UserEmail = "${userEmail}"
$ChannelId = "${channelId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $UserListUri = "https://slack.com/api/users.lookupByEmail?email=$UserEmail"
    $UserResponse = Invoke-RestMethod -Uri $UserListUri -Method Get -Headers $Headers
    
    if (-not $UserResponse.ok) {
        Write-Error "User not found: $($UserResponse.error)"
        exit
    }
    
    $UserId = $UserResponse.user.id
    
    switch ("${action}") {
        "Invite to Channel" {
            $Uri = "https://slack.com/api/conversations.invite"
            $Body = @{
                channel = $ChannelId
                users = $UserId
            } | ConvertTo-Json
            
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] User invited to channel" -ForegroundColor Green
                Write-Host "  User: $UserEmail" -ForegroundColor Cyan
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Remove from Channel" {
            $Uri = "https://slack.com/api/conversations.kick"
            $Body = @{
                channel = $ChannelId
                user = $UserId
            } | ConvertTo-Json
            
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] User removed from channel" -ForegroundColor Green
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Get User Info" {
            $Uri = "https://slack.com/api/users.info?user=$UserId"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] User Information" -ForegroundColor Green
                Write-Host "  Name: $($Response.user.real_name)" -ForegroundColor Cyan
                Write-Host "  Email: $($Response.user.profile.email)" -ForegroundColor Cyan
                Write-Host "  Status: $($Response.user.profile.status_text)" -ForegroundColor Cyan
                Write-Host "  Is Admin: $($Response.user.is_admin)" -ForegroundColor Cyan
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-upload-files',
    name: 'Upload Files to Channels',
    category: 'Common Admin Tasks',
    description: 'Upload files and documents to Slack channels',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'filePath', label: 'File Path', type: 'path', required: true, placeholder: 'C:\\Reports\\report.pdf' },
      { id: 'initialComment', label: 'Initial Comment', type: 'text', required: false, placeholder: 'Here is the report' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const filePath = escapePowerShellString(params.filePath);
      const initialComment = params.initialComment ? escapePowerShellString(params.initialComment) : '';
      
      return `# Slack Upload Files to Channels
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"
$FilePath = "${filePath}"
${initialComment ? `$InitialComment = "${initialComment}"` : ''}

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit
}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
}

try {
    $FileName = Split-Path -Path $FilePath -Leaf
    $FileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $FileContent = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($FileBytes)
    
    $Boundary = [System.Guid]::NewGuid().ToString()
    $Headers["Content-Type"] = "multipart/form-data; boundary=$Boundary"
    
    $BodyLines = @(
        "--$Boundary",
        "Content-Disposition: form-data; name=\`"channels\`"",
        "",
        $ChannelId,
        "--$Boundary",
        "Content-Disposition: form-data; name=\`"file\`"; filename=\`"$FileName\`"",
        "Content-Type: application/octet-stream",
        "",
        $FileContent${initialComment ? `,
        "--$Boundary",
        "Content-Disposition: form-data; name=\`"initial_comment\`"",
        "",
        $InitialComment` : ''},
        "--$Boundary--"
    )
    
    $Body = $BodyLines -join "\`r\`n"
    
    $Uri = "https://slack.com/api/files.upload"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body ([System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($Body))
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] File uploaded successfully" -ForegroundColor Green
        Write-Host "  File: $FileName" -ForegroundColor Cyan
        Write-Host "  URL: $($Response.file.permalink)" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-activity-reports',
    name: 'Retrieve Activity Reports',
    category: 'Common Admin Tasks',
    description: 'Generate activity reports for channels and users',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\slack-activity.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack Retrieve Activity Reports
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://slack.com/api/conversations.history?channel=$ChannelId&limit=1000"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if (-not $Response.ok) {
        Write-Error "Failed: $($Response.error)"
        exit
    }
    
    $ActivityData = @()
    
    foreach ($Message in $Response.messages) {
        $Timestamp = [DateTimeOffset]::FromUnixTimeSeconds([int64]$Message.ts).DateTime
        
        $ActivityData += [PSCustomObject]@{
            Timestamp = $Timestamp
            User = $Message.user
            MessageType = $Message.type
            Text = $Message.text
            HasAttachments = if ($Message.files) { $true } else { $false }
            ReactionCount = if ($Message.reactions) { $Message.reactions.Count } else { 0 }
        }
    }
    
    $ActivityData | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Activity report generated" -ForegroundColor Green
    Write-Host "  Total Messages: $($ActivityData.Count)" -ForegroundColor Cyan
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-usage-statistics',
    name: 'Retrieve Usage Statistics',
    category: 'Common Admin Tasks',
    description: 'Get workspace usage statistics and analytics',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['Workspace Overview', 'Channel Statistics', 'User Activity'], defaultValue: 'Workspace Overview' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const reportType = params.reportType;
      
      return `# Slack Retrieve Usage Statistics
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ReportType = "${reportType}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    switch ($ReportType) {
        "Workspace Overview" {
            $TeamUri = "https://slack.com/api/team.info"
            $TeamResponse = Invoke-RestMethod -Uri $TeamUri -Method Get -Headers $Headers
            
            $UsersUri = "https://slack.com/api/users.list"
            $UsersResponse = Invoke-RestMethod -Uri $UsersUri -Method Get -Headers $Headers
            
            $ChannelsUri = "https://slack.com/api/conversations.list?limit=1000"
            $ChannelsResponse = Invoke-RestMethod -Uri $ChannelsUri -Method Get -Headers $Headers
            
            Write-Host "[SUCCESS] Workspace Statistics" -ForegroundColor Green
            Write-Host "  Team Name: $($TeamResponse.team.name)" -ForegroundColor Cyan
            Write-Host "  Total Users: $($UsersResponse.members.Count)" -ForegroundColor Cyan
            Write-Host "  Total Channels: $($ChannelsResponse.channels.Count)" -ForegroundColor Cyan
        }
        "Channel Statistics" {
            $Uri = "https://slack.com/api/conversations.list?limit=1000"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            $ChannelStats = $Response.channels | ForEach-Object {
                [PSCustomObject]@{
                    Name = $_.name
                    Members = $_.num_members
                    IsPrivate = $_.is_private
                    IsArchived = $_.is_archived
                    Created = [DateTimeOffset]::FromUnixTimeSeconds($_.created).DateTime
                }
            }
            
            Write-Host "[SUCCESS] Channel Statistics Retrieved" -ForegroundColor Green
            $ChannelStats | Format-Table -AutoSize
        }
        "User Activity" {
            $Uri = "https://slack.com/api/users.list"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            $ActiveUsers = ($Response.members | Where-Object { -not $_.deleted -and -not $_.is_bot }).Count
            $BotUsers = ($Response.members | Where-Object { $_.is_bot }).Count
            
            Write-Host "[SUCCESS] User Activity Statistics" -ForegroundColor Green
            Write-Host "  Active Users: $ActiveUsers" -ForegroundColor Cyan
            Write-Host "  Bot Users: $BotUsers" -ForegroundColor Cyan
            Write-Host "  Total: $($Response.members.Count)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-integrate-webhooks',
    name: 'Integrate with Webhooks',
    category: 'Common Admin Tasks',
    description: 'Configure and test incoming webhooks for integrations',
    parameters: [
      { id: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://hooks.slack.com/services/...' },
      { id: 'message', label: 'Test Message', type: 'textarea', required: true, placeholder: 'Test webhook message' },
      { id: 'username', label: 'Bot Username', type: 'text', required: false, placeholder: 'WebhookBot' }
    ],
    scriptTemplate: (params) => {
      const webhookUrl = escapePowerShellString(params.webhookUrl);
      const message = escapePowerShellString(params.message);
      const username = params.username ? escapePowerShellString(params.username) : 'WebhookBot';
      
      return `# Slack Integrate with Webhooks
# Generated: ${new Date().toISOString()}

$WebhookUrl = "${webhookUrl}"

$Headers = @{
    "Content-Type" = "application/json"
}

$Body = @{
    text = "${message}"
    username = "${username}"
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri $WebhookUrl -Method Post -Headers $Headers -Body $Body
    
    if ($Response -eq "ok") {
        Write-Host "[SUCCESS] Webhook message sent successfully" -ForegroundColor Green
        Write-Host "  Message: ${message}" -ForegroundColor Cyan
    } else {
        Write-Error "Webhook failed: $Response"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-monitoring-alerts',
    name: 'Integrate with Monitoring Alerts',
    category: 'Common Admin Tasks',
    description: 'Send monitoring alerts and notifications to Slack channels',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Alert Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'alertLevel', label: 'Alert Level', type: 'select', required: true, options: ['Info', 'Warning', 'Error', 'Critical'], defaultValue: 'Info' },
      { id: 'alertMessage', label: 'Alert Message', type: 'textarea', required: true, placeholder: 'Server CPU usage at 95%' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const alertLevel = params.alertLevel;
      const alertMessage = escapePowerShellString(params.alertMessage);
      
      return `# Slack Integrate with Monitoring Alerts
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"
$AlertLevel = "${alertLevel}"
$AlertMessage = "${alertMessage}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$ColorMap = @{
    "Info" = "#36a64f"
    "Warning" = "#ff9800"
    "Error" = "#f44336"
    "Critical" = "#9c27b0"
}

$IconMap = @{
    "Info" = ":information_source:"
    "Warning" = ":warning:"
    "Error" = ":x:"
    "Critical" = ":rotating_light:"
}

try {
    $Attachment = @{
        color = $ColorMap[$AlertLevel]
        title = "$($IconMap[$AlertLevel]) $AlertLevel Alert"
        text = $AlertMessage
        footer = "Monitoring System"
        ts = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    }
    
    $Body = @{
        channel = $ChannelId
        text = "$AlertLevel Alert"
        attachments = @($Attachment)
    } | ConvertTo-Json -Depth 3
    
    $Uri = "https://slack.com/api/chat.postMessage"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Monitoring alert sent" -ForegroundColor Green
        Write-Host "  Level: $AlertLevel" -ForegroundColor Cyan
        Write-Host "  Channel: $ChannelId" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-archive-channel',
    name: 'Archive Channel',
    category: 'Channel Management',
    description: 'Archive a Slack channel to preserve history while removing from active list',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      
      return `# Slack Archive Channel
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $InfoUri = "https://slack.com/api/conversations.info?channel=$ChannelId"
    $InfoResponse = Invoke-RestMethod -Uri $InfoUri -Method Get -Headers $Headers
    
    if (-not $InfoResponse.ok) {
        Write-Error "Failed to get channel info: $($InfoResponse.error)"
        exit
    }
    
    $ChannelName = $InfoResponse.channel.name
    
    $Body = @{
        channel = $ChannelId
    } | ConvertTo-Json
    
    $Uri = "https://slack.com/api/conversations.archive"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Channel archived successfully" -ForegroundColor Green
        Write-Host "  Channel: #$ChannelName" -ForegroundColor Cyan
        Write-Host "  ID: $ChannelId" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-unarchive-channel',
    name: 'Unarchive Channel',
    category: 'Channel Management',
    description: 'Restore an archived channel back to active status',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      
      return `# Slack Unarchive Channel
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        channel = $ChannelId
    } | ConvertTo-Json
    
    $Uri = "https://slack.com/api/conversations.unarchive"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Channel unarchived successfully" -ForegroundColor Green
        Write-Host "  Channel ID: $ChannelId" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-bulk-create-channels',
    name: 'Bulk Create Channels',
    category: 'Channel Management',
    description: 'Create multiple Slack channels from a CSV file',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Channels\\channels.csv', description: 'CSV with columns: Name,IsPrivate,Description' },
      { id: 'defaultPrivate', label: 'Default Private', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const csvPath = escapePowerShellString(params.csvPath);
      const defaultPrivate = params.defaultPrivate ? '$true' : '$false';
      
      return `# Slack Bulk Create Channels
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$CsvPath = "${csvPath}"
$DefaultPrivate = ${defaultPrivate}

if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit
}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Channels = Import-Csv -Path $CsvPath
$Results = @()

foreach ($Channel in $Channels) {
    $ChannelName = $Channel.Name -replace '[^a-z0-9-_]', '' -replace ' ', '-'
    $IsPrivate = if ($Channel.IsPrivate) { [bool]::Parse($Channel.IsPrivate) } else { $DefaultPrivate }
    
    $Body = @{
        name = $ChannelName.ToLower()
        is_private = $IsPrivate
    } | ConvertTo-Json
    
    try {
        $Uri = "https://slack.com/api/conversations.create"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        if ($Response.ok) {
            if ($Channel.Description) {
                $PurposeBody = @{
                    channel = $Response.channel.id
                    purpose = $Channel.Description
                } | ConvertTo-Json
                Invoke-RestMethod -Uri "https://slack.com/api/conversations.setPurpose" -Method Post -Headers $Headers -Body $PurposeBody | Out-Null
            }
            
            $Results += [PSCustomObject]@{
                Name = $ChannelName
                Status = "Created"
                ChannelId = $Response.channel.id
            }
            Write-Host "[SUCCESS] Created: #$ChannelName" -ForegroundColor Green
        } else {
            $Results += [PSCustomObject]@{
                Name = $ChannelName
                Status = "Failed: $($Response.error)"
                ChannelId = $null
            }
            Write-Host "[FAILED] Failed: #$ChannelName - $($Response.error)" -ForegroundColor Red
        }
    } catch {
        $Results += [PSCustomObject]@{
            Name = $ChannelName
            Status = "Error: $_"
            ChannelId = $null
        }
    }
}

Write-Host ""
Write-Host "Bulk Channel Creation Summary" -ForegroundColor Cyan
$Results | Format-Table -AutoSize`;
    },
    isPremium: true
  },
  {
    id: 'slack-convert-channel-private',
    name: 'Convert Channel to Private',
    category: 'Channel Management',
    description: 'Convert a public channel to a private channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      
      return `# Slack Convert Channel to Private
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $InfoUri = "https://slack.com/api/conversations.info?channel=$ChannelId"
    $InfoResponse = Invoke-RestMethod -Uri $InfoUri -Method Get -Headers $Headers
    
    if (-not $InfoResponse.ok) {
        Write-Error "Failed to get channel info: $($InfoResponse.error)"
        exit
    }
    
    if ($InfoResponse.channel.is_private) {
        Write-Host "Channel is already private" -ForegroundColor Yellow
        exit
    }
    
    $ChannelName = $InfoResponse.channel.name
    $MemberCount = $InfoResponse.channel.num_members
    
    Write-Host "Converting public channel to private..." -ForegroundColor Cyan
    Write-Host "  Channel: #$ChannelName" -ForegroundColor Cyan
    Write-Host "  Members: $MemberCount" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: This action cannot be undone via API." -ForegroundColor Yellow
    
    $Body = @{
        channel = $ChannelId
    } | ConvertTo-Json
    
    $Uri = "https://slack.com/api/admin.conversations.convertToPrivate"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Channel converted to private successfully" -ForegroundColor Green
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-list-archived-channels',
    name: 'List Archived Channels',
    category: 'Channel Management',
    description: 'Get a list of all archived channels in the workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\archived-channels.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Slack List Archived Channels
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $AllChannels = @()
    $Cursor = $null
    
    do {
        $Uri = "https://slack.com/api/conversations.list?limit=1000&exclude_archived=false"
        if ($Cursor) { $Uri += "&cursor=$Cursor" }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        if (-not $Response.ok) {
            Write-Error "Failed: $($Response.error)"
            exit
        }
        
        $AllChannels += $Response.channels
        $Cursor = $Response.response_metadata.next_cursor
    } while ($Cursor)
    
    $ArchivedChannels = $AllChannels | Where-Object { $_.is_archived } | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            ID = $_.id
            IsPrivate = $_.is_private
            Members = $_.num_members
            Created = [DateTimeOffset]::FromUnixTimeSeconds($_.created).DateTime
            Purpose = $_.purpose.value
        }
    }
    
    Write-Host "[SUCCESS] Found $($ArchivedChannels.Count) archived channels" -ForegroundColor Green
    $ArchivedChannels | Format-Table -AutoSize
    
    ${exportPath ? `if ($ExportPath) {
        $ArchivedChannels | Export-Csv -Path $ExportPath -NoTypeInformation
        Write-Host "Exported to: $ExportPath" -ForegroundColor Cyan
    }` : ''}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-user-provisioning',
    name: 'Provision User',
    category: 'User Management',
    description: 'Invite a new user to the Slack workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'email', label: 'User Email', type: 'email', required: true },
      { id: 'channelIds', label: 'Channel IDs (comma-separated)', type: 'text', required: false, placeholder: 'C1234,C5678' },
      { id: 'isRestricted', label: 'Guest Account', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const email = escapePowerShellString(params.email);
      const channelIds = params.channelIds ? escapePowerShellString(params.channelIds) : '';
      const isRestricted = params.isRestricted ? '$true' : '$false';
      
      return `# Slack Provision User
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Email = "${email}"
$ChannelIds = "${channelIds}"
$IsRestricted = ${isRestricted}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        email = $Email
    }
    
    if ($ChannelIds) {
        $Body["channel_ids"] = $ChannelIds -split ','
    }
    
    if ($IsRestricted) {
        $Body["is_restricted"] = $true
    }
    
    $JsonBody = $Body | ConvertTo-Json
    
    $Uri = "https://slack.com/api/admin.users.invite"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $JsonBody
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] User invitation sent successfully" -ForegroundColor Green
        Write-Host "  Email: $Email" -ForegroundColor Cyan
        if ($IsRestricted) {
            Write-Host "  Type: Guest Account" -ForegroundColor Cyan
        }
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-deactivate-user',
    name: 'Deactivate User',
    category: 'User Management',
    description: 'Deactivate a user account in the Slack workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'userId', label: 'User ID', type: 'text', required: true, placeholder: 'U1234567890' },
      { id: 'teamId', label: 'Team ID', type: 'text', required: true, placeholder: 'T1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const userId = escapePowerShellString(params.userId);
      const teamId = escapePowerShellString(params.teamId);
      
      return `# Slack Deactivate User
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$UserId = "${userId}"
$TeamId = "${teamId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $InfoUri = "https://slack.com/api/users.info?user=$UserId"
    $InfoResponse = Invoke-RestMethod -Uri $InfoUri -Method Get -Headers $Headers
    
    if ($InfoResponse.ok) {
        Write-Host "Deactivating user: $($InfoResponse.user.real_name)" -ForegroundColor Yellow
        Write-Host "  Email: $($InfoResponse.user.profile.email)" -ForegroundColor Cyan
    }
    
    $Body = @{
        team_id = $TeamId
        user_id = $UserId
    } | ConvertTo-Json
    
    $Uri = "https://slack.com/api/admin.users.remove"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] User deactivated successfully" -ForegroundColor Green
        Write-Host "  User ID: $UserId" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-user-audit',
    name: 'User Audit Report',
    category: 'User Management',
    description: 'Generate a comprehensive user audit report',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\user-audit.csv' },
      { id: 'includeDeleted', label: 'Include Deleted Users', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = escapePowerShellString(params.exportPath);
      const includeDeleted = params.includeDeleted ? '$true' : '$false';
      
      return `# Slack User Audit Report
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ExportPath = "${exportPath}"
$IncludeDeleted = ${includeDeleted}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $AllUsers = @()
    $Cursor = $null
    
    do {
        $Uri = "https://slack.com/api/users.list?limit=1000"
        if ($Cursor) { $Uri += "&cursor=$Cursor" }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        if (-not $Response.ok) {
            Write-Error "Failed: $($Response.error)"
            exit
        }
        
        $AllUsers += $Response.members
        $Cursor = $Response.response_metadata.next_cursor
    } while ($Cursor)
    
    $UserAudit = $AllUsers | Where-Object { 
        $IncludeDeleted -or (-not $_.deleted)
    } | ForEach-Object {
        [PSCustomObject]@{
            UserId = $_.id
            Username = $_.name
            RealName = $_.real_name
            Email = $_.profile.email
            Title = $_.profile.title
            IsAdmin = $_.is_admin
            IsOwner = $_.is_owner
            IsPrimaryOwner = $_.is_primary_owner
            IsRestricted = $_.is_restricted
            IsUltraRestricted = $_.is_ultra_restricted
            IsBot = $_.is_bot
            IsDeleted = $_.deleted
            Has2FA = $_.has_2fa
            StatusText = $_.profile.status_text
            Timezone = $_.tz
            Updated = if ($_.updated) { [DateTimeOffset]::FromUnixTimeSeconds($_.updated).DateTime } else { $null }
        }
    }
    
    $UserAudit | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] User Audit Report Generated" -ForegroundColor Green
    Write-Host "  Total Users: $($UserAudit.Count)" -ForegroundColor Cyan
    Write-Host "  Admins: $(($UserAudit | Where-Object { $_.IsAdmin }).Count)" -ForegroundColor Cyan
    Write-Host "  Guests: $(($UserAudit | Where-Object { $_.IsRestricted -or $_.IsUltraRestricted }).Count)" -ForegroundColor Cyan
    Write-Host "  Bots: $(($UserAudit | Where-Object { $_.IsBot }).Count)" -ForegroundColor Cyan
    Write-Host "  With 2FA: $(($UserAudit | Where-Object { $_.Has2FA }).Count)" -ForegroundColor Cyan
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-guest-management',
    name: 'Manage Guest Users',
    category: 'User Management',
    description: 'List, audit, or remove guest users from the workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List Guests', 'Export Guest Report', 'List Single-Channel Guests'], defaultValue: 'List Guests' },
      { id: 'exportPath', label: 'Export Path (for reports)', type: 'path', required: false, placeholder: 'C:\\Reports\\guests.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const action = params.action;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Slack Manage Guest Users
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Action = "${action}"
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://slack.com/api/users.list"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if (-not $Response.ok) {
        Write-Error "Failed: $($Response.error)"
        exit
    }
    
    switch ($Action) {
        "List Guests" {
            $Guests = $Response.members | Where-Object { $_.is_restricted -or $_.is_ultra_restricted }
            
            Write-Host "[SUCCESS] Guest Users in Workspace" -ForegroundColor Green
            Write-Host ""
            
            foreach ($Guest in $Guests) {
                $GuestType = if ($Guest.is_ultra_restricted) { "Single-Channel" } else { "Multi-Channel" }
                Write-Host "  $($Guest.real_name) ($($Guest.profile.email))" -ForegroundColor Cyan
                Write-Host "    Type: $GuestType Guest" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "Total Guests: $($Guests.Count)" -ForegroundColor Yellow
        }
        "Export Guest Report" {
            $Guests = $Response.members | Where-Object { $_.is_restricted -or $_.is_ultra_restricted } | ForEach-Object {
                [PSCustomObject]@{
                    UserId = $_.id
                    Name = $_.real_name
                    Email = $_.profile.email
                    GuestType = if ($_.is_ultra_restricted) { "Single-Channel" } else { "Multi-Channel" }
                    IsDeleted = $_.deleted
                }
            }
            
            ${exportPath ? `$Guests | Export-Csv -Path $ExportPath -NoTypeInformation
            Write-Host "[SUCCESS] Guest report exported to: $ExportPath" -ForegroundColor Green` : 'Write-Host "No export path specified" -ForegroundColor Yellow'}
        }
        "List Single-Channel Guests" {
            $SingleChannelGuests = $Response.members | Where-Object { $_.is_ultra_restricted }
            
            Write-Host "[SUCCESS] Single-Channel Guests" -ForegroundColor Green
            foreach ($Guest in $SingleChannelGuests) {
                Write-Host "  $($Guest.real_name) - $($Guest.profile.email)" -ForegroundColor Cyan
            }
            Write-Host ""
            Write-Host "Total: $($SingleChannelGuests.Count)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-bulk-user-deactivation',
    name: 'Bulk User Deactivation',
    category: 'User Management',
    description: 'Deactivate multiple users from a CSV file',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'teamId', label: 'Team ID', type: 'text', required: true, placeholder: 'T1234567890' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\deactivate.csv', description: 'CSV with column: UserId' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const teamId = escapePowerShellString(params.teamId);
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Slack Bulk User Deactivation
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$TeamId = "${teamId}"
$CsvPath = "${csvPath}"

if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit
}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Users = Import-Csv -Path $CsvPath
$Results = @()

Write-Host "Starting bulk user deactivation..." -ForegroundColor Yellow
Write-Host "Users to deactivate: $($Users.Count)" -ForegroundColor Cyan

foreach ($User in $Users) {
    $UserId = $User.UserId
    
    try {
        $InfoUri = "https://slack.com/api/users.info?user=$UserId"
        $InfoResponse = Invoke-RestMethod -Uri $InfoUri -Method Get -Headers $Headers
        $UserName = if ($InfoResponse.ok) { $InfoResponse.user.real_name } else { "Unknown" }
        
        $Body = @{
            team_id = $TeamId
            user_id = $UserId
        } | ConvertTo-Json
        
        $Uri = "https://slack.com/api/admin.users.remove"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        if ($Response.ok) {
            $Results += [PSCustomObject]@{ UserId = $UserId; Name = $UserName; Status = "Deactivated" }
            Write-Host "[SUCCESS] Deactivated: $UserName ($UserId)" -ForegroundColor Green
        } else {
            $Results += [PSCustomObject]@{ UserId = $UserId; Name = $UserName; Status = "Failed: $($Response.error)" }
            Write-Host "[FAILED] Failed: $UserName - $($Response.error)" -ForegroundColor Red
        }
    } catch {
        $Results += [PSCustomObject]@{ UserId = $UserId; Name = "Unknown"; Status = "Error: $_" }
    }
}

Write-Host ""
Write-Host "Bulk Deactivation Summary" -ForegroundColor Cyan
$Results | Format-Table -AutoSize`;
    },
    isPremium: true
  },
  {
    id: 'slack-message-export',
    name: 'Export Channel Messages',
    category: 'Compliance',
    description: 'Export messages from a channel for compliance and archival',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Exports\\messages.json' },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: false, placeholder: '2024-01-01' },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: false, placeholder: '2024-12-31' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const exportPath = escapePowerShellString(params.exportPath);
      const startDate = params.startDate ? escapePowerShellString(params.startDate) : '';
      const endDate = params.endDate ? escapePowerShellString(params.endDate) : '';
      
      return `# Slack Export Channel Messages
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"
$ExportPath = "${exportPath}"
${startDate ? `$StartDate = "${startDate}"` : ''}
${endDate ? `$EndDate = "${endDate}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $AllMessages = @()
    $Cursor = $null
    
    $Uri = "https://slack.com/api/conversations.history?channel=$ChannelId&limit=1000"
    ${startDate ? `
    $StartTs = ([DateTimeOffset](Get-Date $StartDate)).ToUnixTimeSeconds()
    $Uri += "&oldest=$StartTs"` : ''}
    ${endDate ? `
    $EndTs = ([DateTimeOffset](Get-Date $EndDate).AddDays(1)).ToUnixTimeSeconds()
    $Uri += "&latest=$EndTs"` : ''}
    
    do {
        $RequestUri = $Uri
        if ($Cursor) { $RequestUri += "&cursor=$Cursor" }
        
        $Response = Invoke-RestMethod -Uri $RequestUri -Method Get -Headers $Headers
        
        if (-not $Response.ok) {
            Write-Error "Failed: $($Response.error)"
            exit
        }
        
        foreach ($Message in $Response.messages) {
            $AllMessages += [PSCustomObject]@{
                Timestamp = [DateTimeOffset]::FromUnixTimeSeconds([double]$Message.ts).DateTime.ToString("yyyy-MM-dd HH:mm:ss")
                User = $Message.user
                Text = $Message.text
                Type = $Message.type
                Subtype = $Message.subtype
                HasAttachments = if ($Message.files) { $true } else { $false }
                ThreadTs = $Message.thread_ts
                ReplyCount = $Message.reply_count
            }
        }
        
        $Cursor = $Response.response_metadata.next_cursor
    } while ($Cursor)
    
    $AllMessages | ConvertTo-Json -Depth 10 | Out-File -FilePath $ExportPath -Encoding UTF8
    
    Write-Host "[SUCCESS] Messages exported successfully" -ForegroundColor Green
    Write-Host "  Total Messages: $($AllMessages.Count)" -ForegroundColor Cyan
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-retention-policy',
    name: 'Configure Retention Policy',
    category: 'Compliance',
    description: 'View and configure message retention settings',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['View Current Policy', 'Set Retention Days', 'Disable Retention'], defaultValue: 'View Current Policy' },
      { id: 'retentionDays', label: 'Retention Days', type: 'number', required: false, placeholder: '365' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const action = params.action;
      const retentionDays = params.retentionDays || '365';
      
      return `# Slack Configure Retention Policy
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Action = "${action}"
$RetentionDays = ${retentionDays}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    switch ($Action) {
        "View Current Policy" {
            $Uri = "https://slack.com/api/team.info"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] Current Workspace Settings" -ForegroundColor Green
                Write-Host "  Team Name: $($Response.team.name)" -ForegroundColor Cyan
                Write-Host "  Domain: $($Response.team.domain)" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "Note: Detailed retention policy requires admin.teams.settings.info API" -ForegroundColor Yellow
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Set Retention Days" {
            Write-Host "Setting retention policy to $RetentionDays days..." -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Note: Message retention configuration requires Enterprise Grid." -ForegroundColor Yellow
            Write-Host "For Enterprise Grid workspaces, use admin.conversations.setRetentionPolicy API" -ForegroundColor Yellow
            
            $Body = @{
                retention_type = 1
                retention_duration = $RetentionDays
            } | ConvertTo-Json
            
            Write-Host "Policy configuration: $RetentionDays days" -ForegroundColor Cyan
        }
        "Disable Retention" {
            Write-Host "Retention policy management requires Enterprise Grid plan" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-dlp-scan',
    name: 'DLP Content Scan',
    category: 'Compliance',
    description: 'Scan channel messages for sensitive content patterns',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'patterns', label: 'DLP Patterns', type: 'select', required: true, options: ['Credit Cards', 'SSN', 'Email Addresses', 'Phone Numbers', 'All Patterns'], defaultValue: 'All Patterns' },
      { id: 'exportPath', label: 'Report Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\dlp-scan.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const patterns = params.patterns;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack DLP Content Scan
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"
$PatternType = "${patterns}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$DLPPatterns = @{
    "Credit Cards" = @{
        Pattern = '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b'
        Description = "Credit Card Number"
    }
    "SSN" = @{
        Pattern = '\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b'
        Description = "Social Security Number"
    }
    "Email Addresses" = @{
        Pattern = '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'
        Description = "Email Address"
    }
    "Phone Numbers" = @{
        Pattern = '\\b(?:\\+1)?[-.]?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b'
        Description = "Phone Number"
    }
}

try {
    $Uri = "https://slack.com/api/conversations.history?channel=$ChannelId&limit=1000"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if (-not $Response.ok) {
        Write-Error "Failed: $($Response.error)"
        exit
    }
    
    $Findings = @()
    $PatternsToCheck = if ($PatternType -eq "All Patterns") { $DLPPatterns.Keys } else { @($PatternType) }
    
    foreach ($Message in $Response.messages) {
        foreach ($PatternName in $PatternsToCheck) {
            if ($DLPPatterns.ContainsKey($PatternName)) {
                $Pattern = $DLPPatterns[$PatternName].Pattern
                if ($Message.text -match $Pattern) {
                    $Findings += [PSCustomObject]@{
                        Timestamp = [DateTimeOffset]::FromUnixTimeSeconds([double]$Message.ts).DateTime
                        User = $Message.user
                        PatternType = $PatternName
                        MessagePreview = if ($Message.text.Length -gt 50) { $Message.text.Substring(0, 50) + "..." } else { $Message.text }
                        FullText = $Message.text
                    }
                }
            }
        }
    }
    
    if ($Findings.Count -gt 0) {
        $Findings | Export-Csv -Path $ExportPath -NoTypeInformation
        
        Write-Host "[WARNING] DLP Scan Complete - Findings Detected" -ForegroundColor Yellow
        Write-Host "  Total Findings: $($Findings.Count)" -ForegroundColor Red
        Write-Host "  Report: $ExportPath" -ForegroundColor Cyan
        
        $Findings | Group-Object PatternType | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Count) occurrences" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[SUCCESS] DLP Scan Complete - No sensitive content detected" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-legal-hold',
    name: 'Legal Hold Management',
    category: 'Compliance',
    description: 'Manage legal hold on user data for eDiscovery',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Hold', 'Release Hold', 'List Holds'], defaultValue: 'List Holds' },
      { id: 'userId', label: 'User ID (for Create/Release)', type: 'text', required: false, placeholder: 'U1234567890' },
      { id: 'holdName', label: 'Hold Name', type: 'text', required: false, placeholder: 'Case-2024-001' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const action = params.action;
      const userId = params.userId ? escapePowerShellString(params.userId) : '';
      const holdName = params.holdName ? escapePowerShellString(params.holdName) : '';
      
      return `# Slack Legal Hold Management
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Action = "${action}"
${userId ? `$UserId = "${userId}"` : ''}
${holdName ? `$HoldName = "${holdName}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    switch ($Action) {
        "List Holds" {
            Write-Host "Legal Hold Status" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Note: Legal hold functionality requires Enterprise Grid plan" -ForegroundColor Yellow
            Write-Host "and use of the Discovery API or Compliance Exports feature." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "For Discovery API access, contact Slack Enterprise support." -ForegroundColor Gray
        }
        "Create Hold" {
            ${userId ? `
            Write-Host "Creating legal hold for user: $UserId" -ForegroundColor Cyan
            ${holdName ? `Write-Host "Hold Name: $HoldName" -ForegroundColor Cyan` : ''}
            Write-Host ""
            Write-Host "Note: Legal holds require Enterprise Grid + Discovery API access." -ForegroundColor Yellow
            
            $HoldRecord = [PSCustomObject]@{
                HoldId = [Guid]::NewGuid().ToString()
                HoldName = "${holdName}"
                UserId = $UserId
                CreatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                Status = "Pending - Requires Discovery API"
            }
            
            Write-Host "Hold record prepared:" -ForegroundColor Green
            $HoldRecord | Format-List
            ` : 'Write-Host "User ID required for creating hold" -ForegroundColor Red'}
        }
        "Release Hold" {
            ${userId ? `
            Write-Host "Releasing legal hold for user: $UserId" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Note: Legal holds require Enterprise Grid + Discovery API access." -ForegroundColor Yellow
            ` : 'Write-Host "User ID required for releasing hold" -ForegroundColor Red'}
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-compliance-export',
    name: 'Compliance Data Export',
    category: 'Compliance',
    description: 'Export workspace data for compliance and audit purposes',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportType', label: 'Export Type', type: 'select', required: true, options: ['Users', 'Channels', 'Files Metadata', 'Full Workspace'], defaultValue: 'Full Workspace' },
      { id: 'exportPath', label: 'Export Directory', type: 'path', required: true, placeholder: 'C:\\Compliance\\Export' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportType = params.exportType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack Compliance Data Export
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ExportType = "${exportType}"
$ExportPath = "${exportPath}"

if (-not (Test-Path $ExportPath)) {
    New-Item -Path $ExportPath -ItemType Directory -Force | Out-Null
}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$ExportTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"

try {
    switch ($ExportType) {
        "Users" {
            $Uri = "https://slack.com/api/users.list"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            if ($Response.ok) {
                $FilePath = Join-Path $ExportPath "users_$ExportTimestamp.json"
                $Response.members | ConvertTo-Json -Depth 10 | Out-File $FilePath -Encoding UTF8
                Write-Host "[SUCCESS] Users exported: $FilePath" -ForegroundColor Green
            }
        }
        "Channels" {
            $Uri = "https://slack.com/api/conversations.list?limit=1000&types=public_channel,private_channel"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            if ($Response.ok) {
                $FilePath = Join-Path $ExportPath "channels_$ExportTimestamp.json"
                $Response.channels | ConvertTo-Json -Depth 10 | Out-File $FilePath -Encoding UTF8
                Write-Host "[SUCCESS] Channels exported: $FilePath" -ForegroundColor Green
            }
        }
        "Files Metadata" {
            $Uri = "https://slack.com/api/files.list?count=1000"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            if ($Response.ok) {
                $FilePath = Join-Path $ExportPath "files_$ExportTimestamp.json"
                $Response.files | ConvertTo-Json -Depth 10 | Out-File $FilePath -Encoding UTF8
                Write-Host "[SUCCESS] Files metadata exported: $FilePath" -ForegroundColor Green
            }
        }
        "Full Workspace" {
            $UsersUri = "https://slack.com/api/users.list"
            $UsersResponse = Invoke-RestMethod -Uri $UsersUri -Method Get -Headers $Headers
            if ($UsersResponse.ok) {
                $UsersPath = Join-Path $ExportPath "users_$ExportTimestamp.json"
                $UsersResponse.members | ConvertTo-Json -Depth 10 | Out-File $UsersPath -Encoding UTF8
                Write-Host "[SUCCESS] Users exported" -ForegroundColor Green
            }
            
            $ChannelsUri = "https://slack.com/api/conversations.list?limit=1000&types=public_channel,private_channel"
            $ChannelsResponse = Invoke-RestMethod -Uri $ChannelsUri -Method Get -Headers $Headers
            if ($ChannelsResponse.ok) {
                $ChannelsPath = Join-Path $ExportPath "channels_$ExportTimestamp.json"
                $ChannelsResponse.channels | ConvertTo-Json -Depth 10 | Out-File $ChannelsPath -Encoding UTF8
                Write-Host "[SUCCESS] Channels exported" -ForegroundColor Green
            }
            
            $TeamUri = "https://slack.com/api/team.info"
            $TeamResponse = Invoke-RestMethod -Uri $TeamUri -Method Get -Headers $Headers
            if ($TeamResponse.ok) {
                $TeamPath = Join-Path $ExportPath "team_$ExportTimestamp.json"
                $TeamResponse.team | ConvertTo-Json -Depth 10 | Out-File $TeamPath -Encoding UTF8
                Write-Host "[SUCCESS] Team info exported" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
    Write-Host "Compliance export completed" -ForegroundColor Cyan
    Write-Host "Export location: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-list-apps',
    name: 'List Installed Apps',
    category: 'App Management',
    description: 'Get a list of all apps installed in the workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\installed-apps.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Slack List Installed Apps
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://slack.com/api/apps.permissions.users.list"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $BotListUri = "https://slack.com/api/users.list"
    $BotResponse = Invoke-RestMethod -Uri $BotListUri -Method Get -Headers $Headers
    
    if ($BotResponse.ok) {
        $Apps = $BotResponse.members | Where-Object { $_.is_bot } | ForEach-Object {
            [PSCustomObject]@{
                AppId = $_.profile.api_app_id
                BotId = $_.id
                Name = $_.real_name
                DisplayName = $_.profile.display_name
                IsDeleted = $_.deleted
            }
        }
        
        Write-Host "[SUCCESS] Installed Apps/Bots in Workspace" -ForegroundColor Green
        Write-Host ""
        $Apps | Format-Table -AutoSize
        
        ${exportPath ? `if ($ExportPath) {
            $Apps | Export-Csv -Path $ExportPath -NoTypeInformation
            Write-Host "Exported to: $ExportPath" -ForegroundColor Cyan
        }` : ''}
    } else {
        Write-Error "Failed: $($BotResponse.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-app-permissions-audit',
    name: 'App Permissions Audit',
    category: 'App Management',
    description: 'Audit app permissions and OAuth scopes',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\app-permissions.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack App Permissions Audit
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $AuthUri = "https://slack.com/api/auth.test"
    $AuthResponse = Invoke-RestMethod -Uri $AuthUri -Method Get -Headers $Headers
    
    if (-not $AuthResponse.ok) {
        Write-Error "Authentication failed: $($AuthResponse.error)"
        exit
    }
    
    Write-Host "[SUCCESS] Current Token Permissions" -ForegroundColor Green
    Write-Host "  App: $($AuthResponse.bot_id)" -ForegroundColor Cyan
    Write-Host "  Team: $($AuthResponse.team)" -ForegroundColor Cyan
    Write-Host ""
    
    $BotUri = "https://slack.com/api/users.list"
    $BotResponse = Invoke-RestMethod -Uri $BotUri -Method Get -Headers $Headers
    
    if ($BotResponse.ok) {
        $Bots = $BotResponse.members | Where-Object { $_.is_bot -and -not $_.deleted }
        
        $AuditReport = $Bots | ForEach-Object {
            [PSCustomObject]@{
                BotName = $_.real_name
                BotId = $_.id
                AppId = $_.profile.api_app_id
                TeamId = $_.team_id
                IsAppRestricted = $_.is_app_user
                Updated = if ($_.updated) { [DateTimeOffset]::FromUnixTimeSeconds($_.updated).DateTime } else { $null }
            }
        }
        
        $AuditReport | Export-Csv -Path $ExportPath -NoTypeInformation
        
        Write-Host "App Permissions Audit Summary" -ForegroundColor Cyan
        Write-Host "  Total Apps/Bots: $($AuditReport.Count)" -ForegroundColor Cyan
        Write-Host "  Report: $ExportPath" -ForegroundColor Cyan
        Write-Host ""
        $AuditReport | Format-Table -AutoSize
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-restrict-app',
    name: 'Restrict App Installation',
    category: 'App Management',
    description: 'Manage app installation restrictions for the workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'appId', label: 'App ID', type: 'text', required: true, placeholder: 'A1234567890' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Approve', 'Restrict', 'Get Status'], defaultValue: 'Get Status' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const appId = escapePowerShellString(params.appId);
      const action = params.action;
      
      return `# Slack Restrict App Installation
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$AppId = "${appId}"
$Action = "${action}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    switch ($Action) {
        "Get Status" {
            Write-Host "Checking app status for: $AppId" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Note: App restriction management requires admin.apps.* scopes" -ForegroundColor Yellow
            Write-Host "and is typically managed via Slack Admin Console." -ForegroundColor Yellow
        }
        "Approve" {
            $Body = @{
                app_id = $AppId
                request_id = [Guid]::NewGuid().ToString()
            } | ConvertTo-Json
            
            $Uri = "https://slack.com/api/admin.apps.approve"
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] App approved: $AppId" -ForegroundColor Green
            } else {
                Write-Host "Note: App approval requires admin.apps.approve scope" -ForegroundColor Yellow
                Write-Host "Error: $($Response.error)" -ForegroundColor Red
            }
        }
        "Restrict" {
            $Body = @{
                app_id = $AppId
                request_id = [Guid]::NewGuid().ToString()
            } | ConvertTo-Json
            
            $Uri = "https://slack.com/api/admin.apps.restrict"
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            if ($Response.ok) {
                Write-Host "[SUCCESS] App restricted: $AppId" -ForegroundColor Green
            } else {
                Write-Host "Note: App restriction requires admin.apps.restrict scope" -ForegroundColor Yellow
                Write-Host "Error: $($Response.error)" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-uninstall-app',
    name: 'Uninstall App',
    category: 'App Management',
    description: 'Uninstall an app from the workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token (of app to uninstall)', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'clientId', label: 'App Client ID', type: 'text', required: true, placeholder: '1234567890.1234567890' },
      { id: 'clientSecret', label: 'App Client Secret', type: 'text', required: true, placeholder: 'your-client-secret' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const clientId = escapePowerShellString(params.clientId);
      const clientSecret = escapePowerShellString(params.clientSecret);
      
      return `# Slack Uninstall App
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ClientId = "${clientId}"
$ClientSecret = "${clientSecret}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/x-www-form-urlencoded"
}

try {
    $AuthUri = "https://slack.com/api/auth.test"
    $AuthResponse = Invoke-RestMethod -Uri $AuthUri -Method Get -Headers @{ "Authorization" = "Bearer $BotToken" }
    
    if ($AuthResponse.ok) {
        Write-Host "App to uninstall: $($AuthResponse.bot_id)" -ForegroundColor Yellow
        Write-Host "Team: $($AuthResponse.team)" -ForegroundColor Cyan
    }
    
    $Body = "client_id=$ClientId&client_secret=$ClientSecret"
    
    $Uri = "https://slack.com/api/apps.uninstall"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] App uninstalled successfully" -ForegroundColor Green
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-app-activity-log',
    name: 'App Activity Log',
    category: 'App Management',
    description: 'View activity logs for installed apps',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'days', label: 'Days to Look Back', type: 'number', required: false, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\app-activity.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const days = params.days || 7;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Slack App Activity Log
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$DaysBack = ${days}
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $BotUri = "https://slack.com/api/users.list"
    $BotResponse = Invoke-RestMethod -Uri $BotUri -Method Get -Headers $Headers
    
    if ($BotResponse.ok) {
        $Bots = $BotResponse.members | Where-Object { $_.is_bot }
        $CutoffDate = (Get-Date).AddDays(-$DaysBack)
        
        $ActivityLog = @()
        
        foreach ($Bot in $Bots) {
            $UpdatedDate = if ($Bot.updated) { 
                [DateTimeOffset]::FromUnixTimeSeconds($Bot.updated).DateTime 
            } else { 
                $null 
            }
            
            $ActivityLog += [PSCustomObject]@{
                AppName = $Bot.real_name
                BotId = $Bot.id
                AppId = $Bot.profile.api_app_id
                LastUpdated = $UpdatedDate
                IsDeleted = $Bot.deleted
                IsActive = if ($UpdatedDate -and $UpdatedDate -gt $CutoffDate) { $true } else { $false }
            }
        }
        
        Write-Host "[SUCCESS] App Activity Log (Last $DaysBack days)" -ForegroundColor Green
        Write-Host ""
        
        $ActiveApps = $ActivityLog | Where-Object { $_.IsActive }
        $InactiveApps = $ActivityLog | Where-Object { -not $_.IsActive -and -not $_.IsDeleted }
        
        Write-Host "Active Apps: $($ActiveApps.Count)" -ForegroundColor Cyan
        Write-Host "Inactive Apps: $($InactiveApps.Count)" -ForegroundColor Yellow
        Write-Host ""
        
        $ActivityLog | Sort-Object LastUpdated -Descending | Format-Table -AutoSize
        
        ${exportPath ? `if ($ExportPath) {
            $ActivityLog | Export-Csv -Path $ExportPath -NoTypeInformation
            Write-Host "Exported to: $ExportPath" -ForegroundColor Cyan
        }` : ''}
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-workspace-analytics',
    name: 'Workspace Analytics',
    category: 'Analytics',
    description: 'Generate comprehensive workspace analytics report',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\workspace-analytics.html' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack Workspace Analytics
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $TeamUri = "https://slack.com/api/team.info"
    $TeamResponse = Invoke-RestMethod -Uri $TeamUri -Method Get -Headers $Headers
    
    $UsersUri = "https://slack.com/api/users.list"
    $UsersResponse = Invoke-RestMethod -Uri $UsersUri -Method Get -Headers $Headers
    
    $ChannelsUri = "https://slack.com/api/conversations.list?limit=1000&types=public_channel,private_channel"
    $ChannelsResponse = Invoke-RestMethod -Uri $ChannelsUri -Method Get -Headers $Headers
    
    $Analytics = [PSCustomObject]@{
        TeamName = $TeamResponse.team.name
        TeamDomain = $TeamResponse.team.domain
        TotalUsers = $UsersResponse.members.Count
        ActiveUsers = ($UsersResponse.members | Where-Object { -not $_.deleted -and -not $_.is_bot }).Count
        BotUsers = ($UsersResponse.members | Where-Object { $_.is_bot }).Count
        DeactivatedUsers = ($UsersResponse.members | Where-Object { $_.deleted }).Count
        AdminUsers = ($UsersResponse.members | Where-Object { $_.is_admin }).Count
        GuestUsers = ($UsersResponse.members | Where-Object { $_.is_restricted -or $_.is_ultra_restricted }).Count
        TotalChannels = $ChannelsResponse.channels.Count
        PublicChannels = ($ChannelsResponse.channels | Where-Object { -not $_.is_private }).Count
        PrivateChannels = ($ChannelsResponse.channels | Where-Object { $_.is_private }).Count
        ArchivedChannels = ($ChannelsResponse.channels | Where-Object { $_.is_archived }).Count
        With2FA = ($UsersResponse.members | Where-Object { $_.has_2fa }).Count
        GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    
    Write-Host "[SUCCESS] Workspace Analytics Report" -ForegroundColor Green
    Write-Host ""
    Write-Host "Team: $($Analytics.TeamName)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Users:" -ForegroundColor Yellow
    Write-Host "  Active: $($Analytics.ActiveUsers)" -ForegroundColor Cyan
    Write-Host "  Admins: $($Analytics.AdminUsers)" -ForegroundColor Cyan
    Write-Host "  Guests: $($Analytics.GuestUsers)" -ForegroundColor Cyan
    Write-Host "  Bots: $($Analytics.BotUsers)" -ForegroundColor Cyan
    Write-Host "  Deactivated: $($Analytics.DeactivatedUsers)" -ForegroundColor Cyan
    Write-Host "  With 2FA: $($Analytics.With2FA)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Channels:" -ForegroundColor Yellow
    Write-Host "  Public: $($Analytics.PublicChannels)" -ForegroundColor Cyan
    Write-Host "  Private: $($Analytics.PrivateChannels)" -ForegroundColor Cyan
    Write-Host "  Archived: $($Analytics.ArchivedChannels)" -ForegroundColor Cyan
    
    $Analytics | ConvertTo-Json | Out-File -FilePath $ExportPath -Encoding UTF8
    Write-Host ""
    Write-Host "Report saved to: $ExportPath" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-channel-analytics',
    name: 'Channel Analytics',
    category: 'Analytics',
    description: 'Analyze channel activity and engagement metrics',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channelId', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'days', label: 'Days to Analyze', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channelId = escapePowerShellString(params.channelId);
      const days = params.days || 30;
      
      return `# Slack Channel Analytics
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ChannelId = "${channelId}"
$DaysBack = ${days}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $InfoUri = "https://slack.com/api/conversations.info?channel=$ChannelId"
    $InfoResponse = Invoke-RestMethod -Uri $InfoUri -Method Get -Headers $Headers
    
    if (-not $InfoResponse.ok) {
        Write-Error "Failed to get channel info: $($InfoResponse.error)"
        exit
    }
    
    $OldestTs = ([DateTimeOffset](Get-Date).AddDays(-$DaysBack)).ToUnixTimeSeconds()
    $HistoryUri = "https://slack.com/api/conversations.history?channel=$ChannelId&limit=1000&oldest=$OldestTs"
    $HistoryResponse = Invoke-RestMethod -Uri $HistoryUri -Method Get -Headers $Headers
    
    if ($HistoryResponse.ok) {
        $Messages = $HistoryResponse.messages
        $UniqueUsers = ($Messages | Select-Object -Property user -Unique).Count
        $ThreadedMessages = ($Messages | Where-Object { $_.thread_ts }).Count
        $MessagesWithReactions = ($Messages | Where-Object { $_.reactions }).Count
        $MessagesWithFiles = ($Messages | Where-Object { $_.files }).Count
        
        $MessagesByDay = $Messages | Group-Object {
            [DateTimeOffset]::FromUnixTimeSeconds([double]$_.ts).DateTime.Date.ToString("yyyy-MM-dd")
        } | Sort-Object Name
        
        Write-Host "[SUCCESS] Channel Analytics: #$($InfoResponse.channel.name)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Channel Info:" -ForegroundColor Yellow
        Write-Host "  Members: $($InfoResponse.channel.num_members)" -ForegroundColor Cyan
        Write-Host "  Created: $([DateTimeOffset]::FromUnixTimeSeconds($InfoResponse.channel.created).DateTime)" -ForegroundColor Cyan
        Write-Host "  Is Private: $($InfoResponse.channel.is_private)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Activity (Last $DaysBack days):" -ForegroundColor Yellow
        Write-Host "  Total Messages: $($Messages.Count)" -ForegroundColor Cyan
        Write-Host "  Unique Posters: $UniqueUsers" -ForegroundColor Cyan
        Write-Host "  Threaded Replies: $ThreadedMessages" -ForegroundColor Cyan
        Write-Host "  Messages with Reactions: $MessagesWithReactions" -ForegroundColor Cyan
        Write-Host "  Messages with Files: $MessagesWithFiles" -ForegroundColor Cyan
        Write-Host "  Avg Messages/Day: $([math]::Round($Messages.Count / $DaysBack, 1))" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Messages by Day:" -ForegroundColor Yellow
        $MessagesByDay | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Count) messages" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-user-activity-analytics',
    name: 'User Activity Analytics',
    category: 'Analytics',
    description: 'Analyze user activity patterns and engagement',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\user-activity.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack User Activity Analytics
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $UsersUri = "https://slack.com/api/users.list"
    $UsersResponse = Invoke-RestMethod -Uri $UsersUri -Method Get -Headers $Headers
    
    if (-not $UsersResponse.ok) {
        Write-Error "Failed: $($UsersResponse.error)"
        exit
    }
    
    $UserActivity = $UsersResponse.members | Where-Object { -not $_.is_bot -and -not $_.deleted } | ForEach-Object {
        $LastUpdate = if ($_.updated) { 
            [DateTimeOffset]::FromUnixTimeSeconds($_.updated).DateTime 
        } else { 
            $null 
        }
        
        $DaysSinceUpdate = if ($LastUpdate) {
            [math]::Round(((Get-Date) - $LastUpdate).TotalDays, 0)
        } else {
            -1
        }
        
        [PSCustomObject]@{
            UserId = $_.id
            Name = $_.real_name
            Email = $_.profile.email
            Title = $_.profile.title
            LastUpdated = $LastUpdate
            DaysSinceActivity = $DaysSinceUpdate
            IsAdmin = $_.is_admin
            Has2FA = $_.has_2fa
            Timezone = $_.tz
            StatusText = $_.profile.status_text
            ActivityStatus = switch ($DaysSinceUpdate) {
                { $_ -lt 0 } { "Unknown" }
                { $_ -le 7 } { "Active" }
                { $_ -le 30 } { "Recent" }
                { $_ -le 90 } { "Inactive" }
                default { "Dormant" }
            }
        }
    }
    
    $UserActivity | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] User Activity Analytics Report" -ForegroundColor Green
    Write-Host ""
    Write-Host "Activity Summary:" -ForegroundColor Yellow
    $UserActivity | Group-Object ActivityStatus | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) users" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "Exported to: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-workspace-health',
    name: 'Workspace Health Check',
    category: 'Analytics',
    description: 'Perform a health check on workspace configuration and security',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      
      return `# Slack Workspace Health Check
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$HealthChecks = @()

try {
    $TeamUri = "https://slack.com/api/team.info"
    $TeamResponse = Invoke-RestMethod -Uri $TeamUri -Method Get -Headers $Headers
    
    $UsersUri = "https://slack.com/api/users.list"
    $UsersResponse = Invoke-RestMethod -Uri $UsersUri -Method Get -Headers $Headers
    
    $ChannelsUri = "https://slack.com/api/conversations.list?limit=1000"
    $ChannelsResponse = Invoke-RestMethod -Uri $ChannelsUri -Method Get -Headers $Headers
    
    Write-Host "Slack Workspace Health Check" -ForegroundColor Cyan
    Write-Host "Team: $($TeamResponse.team.name)" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Gray
    Write-Host ""
    
    $ActiveUsers = $UsersResponse.members | Where-Object { -not $_.deleted -and -not $_.is_bot }
    $UsersWithout2FA = $ActiveUsers | Where-Object { -not $_.has_2fa }
    $TwoFAPercent = [math]::Round((($ActiveUsers.Count - $UsersWithout2FA.Count) / $ActiveUsers.Count) * 100, 1)
    
    if ($TwoFAPercent -ge 90) {
        Write-Host "[SUCCESS] 2FA Adoption: $TwoFAPercent% ($($ActiveUsers.Count - $UsersWithout2FA.Count)/$($ActiveUsers.Count))" -ForegroundColor Green
    } elseif ($TwoFAPercent -ge 70) {
        Write-Host "[WARNING] 2FA Adoption: $TwoFAPercent% - Needs improvement" -ForegroundColor Yellow
    } else {
        Write-Host "[FAILED] 2FA Adoption: $TwoFAPercent% - Critical security risk" -ForegroundColor Red
    }
    
    $AdminCount = ($ActiveUsers | Where-Object { $_.is_admin }).Count
    $AdminPercent = [math]::Round(($AdminCount / $ActiveUsers.Count) * 100, 1)
    
    if ($AdminPercent -le 5) {
        Write-Host "[SUCCESS] Admin Ratio: $AdminPercent% ($AdminCount admins)" -ForegroundColor Green
    } elseif ($AdminPercent -le 15) {
        Write-Host "[WARNING] Admin Ratio: $AdminPercent% - Consider reducing" -ForegroundColor Yellow
    } else {
        Write-Host "[FAILED] Admin Ratio: $AdminPercent% - Too many admins" -ForegroundColor Red
    }
    
    $GuestCount = ($ActiveUsers | Where-Object { $_.is_restricted -or $_.is_ultra_restricted }).Count
    Write-Host "ℹ Guest Users: $GuestCount" -ForegroundColor Cyan
    
    $ArchivedCount = ($ChannelsResponse.channels | Where-Object { $_.is_archived }).Count
    $TotalChannels = $ChannelsResponse.channels.Count
    
    if ($TotalChannels -gt 0) {
        $ArchivedPercent = [math]::Round(($ArchivedCount / $TotalChannels) * 100, 1)
        Write-Host "ℹ Channel Health: $ArchivedCount archived of $TotalChannels total ($ArchivedPercent%)" -ForegroundColor Cyan
    }
    
    $EmptyChannels = $ChannelsResponse.channels | Where-Object { $_.num_members -eq 0 -or $_.num_members -eq 1 }
    if ($EmptyChannels.Count -gt 0) {
        Write-Host "[WARNING] Empty/Single-member Channels: $($EmptyChannels.Count) - Consider cleanup" -ForegroundColor Yellow
    }
    
    $BotCount = ($UsersResponse.members | Where-Object { $_.is_bot -and -not $_.deleted }).Count
    Write-Host "ℹ Active Bots/Apps: $BotCount" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "=" * 50 -ForegroundColor Gray
    Write-Host "Health check completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-usage-trends',
    name: 'Usage Trends Report',
    category: 'Analytics',
    description: 'Generate usage trends and growth metrics',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\usage-trends.json' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack Usage Trends Report
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $UsersUri = "https://slack.com/api/users.list"
    $UsersResponse = Invoke-RestMethod -Uri $UsersUri -Method Get -Headers $Headers
    
    $ChannelsUri = "https://slack.com/api/conversations.list?limit=1000"
    $ChannelsResponse = Invoke-RestMethod -Uri $ChannelsUri -Method Get -Headers $Headers
    
    $Now = Get-Date
    $Last7Days = $Now.AddDays(-7)
    $Last30Days = $Now.AddDays(-30)
    $Last90Days = $Now.AddDays(-90)
    
    $ActiveUsers = $UsersResponse.members | Where-Object { -not $_.deleted -and -not $_.is_bot }
    
    $RecentlyActive7 = $ActiveUsers | Where-Object { 
        $_.updated -and ([DateTimeOffset]::FromUnixTimeSeconds($_.updated).DateTime -gt $Last7Days)
    }
    $RecentlyActive30 = $ActiveUsers | Where-Object { 
        $_.updated -and ([DateTimeOffset]::FromUnixTimeSeconds($_.updated).DateTime -gt $Last30Days)
    }
    $RecentlyActive90 = $ActiveUsers | Where-Object { 
        $_.updated -and ([DateTimeOffset]::FromUnixTimeSeconds($_.updated).DateTime -gt $Last90Days)
    }
    
    $NewChannels30 = $ChannelsResponse.channels | Where-Object {
        [DateTimeOffset]::FromUnixTimeSeconds($_.created).DateTime -gt $Last30Days
    }
    
    $TrendsReport = [PSCustomObject]@{
        GeneratedAt = $Now.ToString("yyyy-MM-dd HH:mm:ss")
        TotalUsers = $ActiveUsers.Count
        UsersActive7Days = $RecentlyActive7.Count
        UsersActive30Days = $RecentlyActive30.Count
        UsersActive90Days = $RecentlyActive90.Count
        Engagement7DayPercent = [math]::Round(($RecentlyActive7.Count / $ActiveUsers.Count) * 100, 1)
        Engagement30DayPercent = [math]::Round(($RecentlyActive30.Count / $ActiveUsers.Count) * 100, 1)
        Engagement90DayPercent = [math]::Round(($RecentlyActive90.Count / $ActiveUsers.Count) * 100, 1)
        TotalChannels = $ChannelsResponse.channels.Count
        NewChannelsLast30Days = $NewChannels30.Count
        PrivateChannelPercent = [math]::Round((($ChannelsResponse.channels | Where-Object { $_.is_private }).Count / $ChannelsResponse.channels.Count) * 100, 1)
    }
    
    Write-Host "[SUCCESS] Usage Trends Report" -ForegroundColor Green
    Write-Host ""
    Write-Host "User Engagement:" -ForegroundColor Yellow
    Write-Host "  7-day active: $($TrendsReport.UsersActive7Days) ($($TrendsReport.Engagement7DayPercent)%)" -ForegroundColor Cyan
    Write-Host "  30-day active: $($TrendsReport.UsersActive30Days) ($($TrendsReport.Engagement30DayPercent)%)" -ForegroundColor Cyan
    Write-Host "  90-day active: $($TrendsReport.UsersActive90Days) ($($TrendsReport.Engagement90DayPercent)%)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Channel Growth:" -ForegroundColor Yellow
    Write-Host "  Total Channels: $($TrendsReport.TotalChannels)" -ForegroundColor Cyan
    Write-Host "  New (30 days): $($TrendsReport.NewChannelsLast30Days)" -ForegroundColor Cyan
    Write-Host "  Private Channels: $($TrendsReport.PrivateChannelPercent)%" -ForegroundColor Cyan
    
    $TrendsReport | ConvertTo-Json | Out-File -FilePath $ExportPath -Encoding UTF8
    Write-Host ""
    Write-Host "Report saved to: $ExportPath" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-scheduled-message',
    name: 'Schedule Message',
    category: 'Messaging',
    description: 'Schedule a message to be sent at a future time',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'message', label: 'Message', type: 'textarea', required: true },
      { id: 'scheduleTime', label: 'Schedule Time (Unix Timestamp)', type: 'text', required: true, placeholder: '1735689600' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const message = escapePowerShellString(params.message);
      const scheduleTime = escapePowerShellString(params.scheduleTime);
      
      return `# Slack Schedule Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$Message = "${message}"
$ScheduleTime = ${scheduleTime}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    text = $Message
    post_at = $ScheduleTime
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/chat.scheduleMessage"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        $ScheduledDateTime = [DateTimeOffset]::FromUnixTimeSeconds($ScheduleTime).DateTime
        Write-Host "[SUCCESS] Message scheduled successfully" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
        Write-Host "  Scheduled for: $ScheduledDateTime" -ForegroundColor Cyan
        Write-Host "  Message ID: $($Response.scheduled_message_id)" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-delete-scheduled',
    name: 'Delete Scheduled Message',
    category: 'Messaging',
    description: 'Delete a scheduled message before it is sent',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'scheduledMessageId', label: 'Scheduled Message ID', type: 'text', required: true, placeholder: 'Q1234ABCD5678' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const scheduledMessageId = escapePowerShellString(params.scheduledMessageId);
      
      return `# Slack Delete Scheduled Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$ScheduledMessageId = "${scheduledMessageId}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    scheduled_message_id = $ScheduledMessageId
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/chat.deleteScheduledMessage"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Scheduled message deleted" -ForegroundColor Green
        Write-Host "  Message ID: $ScheduledMessageId" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-list-scheduled',
    name: 'List Scheduled Messages',
    category: 'Messaging',
    description: 'List all scheduled messages for a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      
      return `# Slack List Scheduled Messages
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://slack.com/api/chat.scheduledMessages.list?channel=$Channel"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if ($Response.ok) {
        if ($Response.scheduled_messages.Count -eq 0) {
            Write-Host "No scheduled messages found for this channel" -ForegroundColor Yellow
        } else {
            Write-Host "[SUCCESS] Scheduled Messages" -ForegroundColor Green
            Write-Host ""
            
            foreach ($Msg in $Response.scheduled_messages) {
                $PostAt = [DateTimeOffset]::FromUnixTimeSeconds($Msg.post_at).DateTime
                Write-Host "  ID: $($Msg.id)" -ForegroundColor Cyan
                Write-Host "  Scheduled: $PostAt" -ForegroundColor Cyan
                Write-Host "  Preview: $($Msg.text.Substring(0, [Math]::Min(50, $Msg.text.Length)))..." -ForegroundColor Gray
                Write-Host ""
            }
            
            Write-Host "Total: $($Response.scheduled_messages.Count) scheduled messages" -ForegroundColor Yellow
        }
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-post-blocks',
    name: 'Post Block Message',
    category: 'Messaging',
    description: 'Send a rich message with Block Kit formatting',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'headerText', label: 'Header Text', type: 'text', required: true, placeholder: 'Important Announcement' },
      { id: 'bodyText', label: 'Body Text', type: 'textarea', required: true },
      { id: 'buttonText', label: 'Button Text', type: 'text', required: false, placeholder: 'Learn More' },
      { id: 'buttonUrl', label: 'Button URL', type: 'text', required: false, placeholder: 'https://example.com' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const headerText = escapePowerShellString(params.headerText);
      const bodyText = escapePowerShellString(params.bodyText);
      const buttonText = params.buttonText ? escapePowerShellString(params.buttonText) : '';
      const buttonUrl = params.buttonUrl ? escapePowerShellString(params.buttonUrl) : '';
      
      return `# Slack Post Block Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$HeaderText = "${headerText}"
$BodyText = "${bodyText}"
${buttonText ? `$ButtonText = "${buttonText}"` : ''}
${buttonUrl ? `$ButtonUrl = "${buttonUrl}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Blocks = @(
    @{
        type = "header"
        text = @{
            type = "plain_text"
            text = $HeaderText
        }
    },
    @{
        type = "section"
        text = @{
            type = "mrkdwn"
            text = $BodyText
        }
    }
)

${buttonText && buttonUrl ? `$Blocks += @{
    type = "actions"
    elements = @(
        @{
            type = "button"
            text = @{
                type = "plain_text"
                text = $ButtonText
            }
            url = $ButtonUrl
            action_id = "button_click"
        }
    )
}` : ''}

$Body = @{
    channel = $Channel
    blocks = $Blocks
    text = $HeaderText
} | ConvertTo-Json -Depth 10

try {
    $Uri = "https://slack.com/api/chat.postMessage"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Block message posted successfully" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
        Write-Host "  Timestamp: $($Response.ts)" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-update-message',
    name: 'Update Message',
    category: 'Messaging',
    description: 'Update an existing message in a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'messageTs', label: 'Message Timestamp', type: 'text', required: true, placeholder: '1234567890.123456' },
      { id: 'newText', label: 'New Message Text', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const messageTs = escapePowerShellString(params.messageTs);
      const newText = escapePowerShellString(params.newText);
      
      return `# Slack Update Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$MessageTs = "${messageTs}"
$NewText = "${newText}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    ts = $MessageTs
    text = $NewText
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/chat.update"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Message updated successfully" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
        Write-Host "  Message TS: $MessageTs" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-delete-message',
    name: 'Delete Message',
    category: 'Messaging',
    description: 'Delete a message from a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'messageTs', label: 'Message Timestamp', type: 'text', required: true, placeholder: '1234567890.123456' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const messageTs = escapePowerShellString(params.messageTs);
      
      return `# Slack Delete Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$MessageTs = "${messageTs}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    ts = $MessageTs
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/chat.delete"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Message deleted successfully" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
        Write-Host "  Message TS: $MessageTs" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-add-reaction',
    name: 'Add Reaction',
    category: 'Messaging',
    description: 'Add an emoji reaction to a message',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'messageTs', label: 'Message Timestamp', type: 'text', required: true, placeholder: '1234567890.123456' },
      { id: 'emoji', label: 'Emoji Name', type: 'text', required: true, placeholder: 'thumbsup' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const messageTs = escapePowerShellString(params.messageTs);
      const emoji = escapePowerShellString(params.emoji);
      
      return `# Slack Add Reaction
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$MessageTs = "${messageTs}"
$Emoji = "${emoji}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    timestamp = $MessageTs
    name = $Emoji
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/reactions.add"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Reaction added successfully" -ForegroundColor Green
        Write-Host "  Emoji: :$Emoji:" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-pin-message',
    name: 'Pin Message',
    category: 'Messaging',
    description: 'Pin a message to a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'messageTs', label: 'Message Timestamp', type: 'text', required: true, placeholder: '1234567890.123456' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const messageTs = escapePowerShellString(params.messageTs);
      
      return `# Slack Pin Message
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$MessageTs = "${messageTs}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    timestamp = $MessageTs
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/pins.add"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Message pinned successfully" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-list-pins',
    name: 'List Pinned Messages',
    category: 'Messaging',
    description: 'List all pinned messages in a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      
      return `# Slack List Pinned Messages
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $Uri = "https://slack.com/api/pins.list?channel=$Channel"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if ($Response.ok) {
        if ($Response.items.Count -eq 0) {
            Write-Host "No pinned messages in this channel" -ForegroundColor Yellow
        } else {
            Write-Host "[SUCCESS] Pinned Messages" -ForegroundColor Green
            Write-Host ""
            
            foreach ($Item in $Response.items) {
                $Created = [DateTimeOffset]::FromUnixTimeSeconds($Item.created).DateTime
                Write-Host "  Pinned by: $($Item.created_by)" -ForegroundColor Cyan
                Write-Host "  Date: $Created" -ForegroundColor Cyan
                if ($Item.message) {
                    $Preview = if ($Item.message.text.Length -gt 60) { $Item.message.text.Substring(0, 60) + "..." } else { $Item.message.text }
                    Write-Host "  Message: $Preview" -ForegroundColor Gray
                }
                Write-Host ""
            }
            
            Write-Host "Total: $($Response.items.Count) pinned items" -ForegroundColor Yellow
        }
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-set-channel-topic',
    name: 'Set Channel Topic',
    category: 'Channel Management',
    description: 'Set or update the topic for a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'topic', label: 'Channel Topic', type: 'textarea', required: true, placeholder: 'This channel is for...' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const topic = escapePowerShellString(params.topic);
      
      return `# Slack Set Channel Topic
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
$Topic = "${topic}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
    topic = $Topic
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/conversations.setTopic"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Channel topic updated" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
        Write-Host "  Topic: $Topic" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-join-channel',
    name: 'Join Channel',
    category: 'Channel Management',
    description: 'Join a public channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      
      return `# Slack Join Channel
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/conversations.join"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Joined channel successfully" -ForegroundColor Green
        Write-Host "  Channel: #$($Response.channel.name)" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-leave-channel',
    name: 'Leave Channel',
    category: 'Channel Management',
    description: 'Leave a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      
      return `# Slack Leave Channel
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$Body = @{
    channel = $Channel
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/conversations.leave"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Left channel successfully" -ForegroundColor Green
        Write-Host "  Channel: $Channel" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-list-channel-members',
    name: 'List Channel Members',
    category: 'Channel Management',
    description: 'Get a list of all members in a channel',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'channel', label: 'Channel ID', type: 'text', required: true, placeholder: 'C1234567890' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\channel-members.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const channel = escapePowerShellString(params.channel);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Slack List Channel Members
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$Channel = "${channel}"
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

try {
    $AllMembers = @()
    $Cursor = $null
    
    do {
        $Uri = "https://slack.com/api/conversations.members?channel=$Channel&limit=1000"
        if ($Cursor) { $Uri += "&cursor=$Cursor" }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        if (-not $Response.ok) {
            Write-Error "Failed: $($Response.error)"
            exit
        }
        
        $AllMembers += $Response.members
        $Cursor = $Response.response_metadata.next_cursor
    } while ($Cursor)
    
    $MemberDetails = @()
    
    foreach ($MemberId in $AllMembers) {
        $UserUri = "https://slack.com/api/users.info?user=$MemberId"
        $UserResponse = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
        
        if ($UserResponse.ok) {
            $MemberDetails += [PSCustomObject]@{
                UserId = $MemberId
                Name = $UserResponse.user.real_name
                Email = $UserResponse.user.profile.email
                Title = $UserResponse.user.profile.title
                IsAdmin = $UserResponse.user.is_admin
                IsBot = $UserResponse.user.is_bot
            }
        }
    }
    
    Write-Host "[SUCCESS] Channel Members" -ForegroundColor Green
    Write-Host "  Total: $($MemberDetails.Count)" -ForegroundColor Cyan
    Write-Host ""
    $MemberDetails | Format-Table -AutoSize
    
    ${exportPath ? `if ($ExportPath) {
        $MemberDetails | Export-Csv -Path $ExportPath -NoTypeInformation
        Write-Host "Exported to: $ExportPath" -ForegroundColor Cyan
    }` : ''}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-set-user-status',
    name: 'Set User Status',
    category: 'User Management',
    description: 'Set the status text and emoji for a user',
    parameters: [
      { id: 'userToken', label: 'User Token', type: 'text', required: true, placeholder: 'xoxp-...' },
      { id: 'statusText', label: 'Status Text', type: 'text', required: true, placeholder: 'In a meeting' },
      { id: 'statusEmoji', label: 'Status Emoji', type: 'text', required: false, placeholder: ':calendar:', defaultValue: ':speech_balloon:' },
      { id: 'expirationMinutes', label: 'Expiration (minutes)', type: 'number', required: false, placeholder: '60' }
    ],
    scriptTemplate: (params) => {
      const userToken = escapePowerShellString(params.userToken);
      const statusText = escapePowerShellString(params.statusText);
      const statusEmoji = params.statusEmoji ? escapePowerShellString(params.statusEmoji) : ':speech_balloon:';
      const expirationMinutes = params.expirationMinutes || 0;
      
      return `# Slack Set User Status
# Generated: ${new Date().toISOString()}

$UserToken = "${userToken}"
$StatusText = "${statusText}"
$StatusEmoji = "${statusEmoji}"
$ExpirationMinutes = ${expirationMinutes}

$Headers = @{
    "Authorization" = "Bearer $UserToken"
    "Content-Type" = "application/json"
}

$Profile = @{
    status_text = $StatusText
    status_emoji = $StatusEmoji
}

if ($ExpirationMinutes -gt 0) {
    $Expiration = [DateTimeOffset]::UtcNow.AddMinutes($ExpirationMinutes).ToUnixTimeSeconds()
    $Profile["status_expiration"] = $Expiration
}

$Body = @{
    profile = $Profile
} | ConvertTo-Json

try {
    $Uri = "https://slack.com/api/users.profile.set"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Status updated successfully" -ForegroundColor Green
        Write-Host "  Status: $StatusEmoji $StatusText" -ForegroundColor Cyan
        if ($ExpirationMinutes -gt 0) {
            Write-Host "  Expires in: $ExpirationMinutes minutes" -ForegroundColor Cyan
        }
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-search-messages',
    name: 'Search Messages',
    category: 'Analytics',
    description: 'Search for messages across the workspace',
    parameters: [
      { id: 'userToken', label: 'User Token', type: 'text', required: true, placeholder: 'xoxp-...' },
      { id: 'query', label: 'Search Query', type: 'text', required: true, placeholder: 'from:@user in:#channel keyword' },
      { id: 'count', label: 'Max Results', type: 'number', required: false, defaultValue: 20 }
    ],
    scriptTemplate: (params) => {
      const userToken = escapePowerShellString(params.userToken);
      const query = escapePowerShellString(params.query);
      const count = params.count || 20;
      
      return `# Slack Search Messages
# Generated: ${new Date().toISOString()}

$UserToken = "${userToken}"
$Query = "${query}"
$Count = ${count}

$Headers = @{
    "Authorization" = "Bearer $UserToken"
    "Content-Type" = "application/json"
}

try {
    $EncodedQuery = [System.Web.HttpUtility]::UrlEncode($Query)
    $Uri = "https://slack.com/api/search.messages?query=$EncodedQuery&count=$Count"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    if ($Response.ok) {
        Write-Host "[SUCCESS] Search Results" -ForegroundColor Green
        Write-Host "  Query: $Query" -ForegroundColor Cyan
        Write-Host "  Total matches: $($Response.messages.total)" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($Match in $Response.messages.matches) {
            $Timestamp = [DateTimeOffset]::FromUnixTimeSeconds([double]$Match.ts).DateTime
            Write-Host "  [$Timestamp] $($Match.username)" -ForegroundColor Yellow
            Write-Host "  $($Match.text)" -ForegroundColor Gray
            Write-Host "  Channel: $($Match.channel.name)" -ForegroundColor Cyan
            Write-Host ""
        }
    } else {
        Write-Error "Failed: $($Response.error)"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'slack-list-files',
    name: 'List Workspace Files',
    category: 'Compliance',
    description: 'List and export all files shared in the workspace',
    parameters: [
      { id: 'botToken', label: 'Bot Token', type: 'text', required: true, placeholder: 'xoxb-...' },
      { id: 'fileType', label: 'File Type Filter', type: 'select', required: false, options: ['All', 'Images', 'PDFs', 'Documents', 'Spreadsheets'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\workspace-files.csv' }
    ],
    scriptTemplate: (params) => {
      const botToken = escapePowerShellString(params.botToken);
      const fileType = params.fileType || 'All';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Slack List Workspace Files
# Generated: ${new Date().toISOString()}

$BotToken = "${botToken}"
$FileType = "${fileType}"
$ExportPath = "${exportPath}"

$Headers = @{
    "Authorization" = "Bearer $BotToken"
    "Content-Type" = "application/json"
}

$TypeFilter = switch ($FileType) {
    "Images" { "images" }
    "PDFs" { "pdfs" }
    "Documents" { "docs" }
    "Spreadsheets" { "spaces" }
    default { "" }
}

try {
    $AllFiles = @()
    $Page = 1
    
    do {
        $Uri = "https://slack.com/api/files.list?count=100&page=$Page"
        if ($TypeFilter) { $Uri += "&types=$TypeFilter" }
        
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        
        if (-not $Response.ok) {
            Write-Error "Failed: $($Response.error)"
            exit
        }
        
        $AllFiles += $Response.files
        $Page++
    } while ($Response.paging.pages -ge $Page)
    
    $FileReport = $AllFiles | ForEach-Object {
        [PSCustomObject]@{
            FileId = $_.id
            Name = $_.name
            Title = $_.title
            FileType = $_.filetype
            Size = [math]::Round($_.size / 1024, 2)
            SizeUnit = "KB"
            UploadedBy = $_.user
            Created = [DateTimeOffset]::FromUnixTimeSeconds($_.created).DateTime
            IsPublic = $_.is_public
            IsExternal = $_.is_external
            Channels = ($_.channels -join ", ")
            DownloadUrl = $_.url_private_download
        }
    }
    
    $FileReport | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Workspace Files Report" -ForegroundColor Green
    Write-Host "  Total Files: $($FileReport.Count)" -ForegroundColor Cyan
    Write-Host "  Total Size: $([math]::Round(($AllFiles | Measure-Object -Property size -Sum).Sum / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "  Exported to: $ExportPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "File Types Breakdown:" -ForegroundColor Yellow
    $FileReport | Group-Object FileType | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) files" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  }
];
