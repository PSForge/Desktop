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
  }
];
