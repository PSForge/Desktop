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
        Write-Host "✓ Message posted to $Channel" -ForegroundColor Green
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
        Write-Host "✓ Channel created: #${channelName}" -ForegroundColor Green
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
                Write-Host "✓ Channel archived successfully" -ForegroundColor Green
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
                Write-Host "✓ Channel renamed to: ${newValue}" -ForegroundColor Green
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
                Write-Host "✓ Channel topic updated" -ForegroundColor Green
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
                Write-Host "✓ Channel purpose updated" -ForegroundColor Green
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
                Write-Host "✓ User invited to channel" -ForegroundColor Green
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
                Write-Host "✓ User removed from channel" -ForegroundColor Green
            } else {
                Write-Error "Failed: $($Response.error)"
            }
        }
        "Get User Info" {
            $Uri = "https://slack.com/api/users.info?user=$UserId"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            if ($Response.ok) {
                Write-Host "✓ User Information" -ForegroundColor Green
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
        Write-Host "✓ File uploaded successfully" -ForegroundColor Green
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
    
    Write-Host "✓ Activity report generated" -ForegroundColor Green
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
            
            Write-Host "✓ Workspace Statistics" -ForegroundColor Green
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
            
            Write-Host "✓ Channel Statistics Retrieved" -ForegroundColor Green
            $ChannelStats | Format-Table -AutoSize
        }
        "User Activity" {
            $Uri = "https://slack.com/api/users.list"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            
            $ActiveUsers = ($Response.members | Where-Object { -not $_.deleted -and -not $_.is_bot }).Count
            $BotUsers = ($Response.members | Where-Object { $_.is_bot }).Count
            
            Write-Host "✓ User Activity Statistics" -ForegroundColor Green
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
        Write-Host "✓ Webhook message sent successfully" -ForegroundColor Green
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
        Write-Host "✓ Monitoring alert sent" -ForegroundColor Green
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
  }
];
