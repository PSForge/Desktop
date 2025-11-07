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
  }
];
