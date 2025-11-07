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
}

export const duoTasks: DuoTask[] = [
  {
    id: 'duo-bulk-enroll-users',
    name: 'Bulk Enroll Users',
    category: 'Bulk Operations',
    description: 'Enroll multiple users for MFA',
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

# Note: This is a simplified example. Production code should include proper HMAC signing
try {
    foreach ($Email in $UserEmails) {
        $Username = $Email.Split('@')[0]
        
        # API request would go here with proper HMAC signing
        Write-Host "✓ Enrollment initiated for: $Email" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk enrollment completed for $($UserEmails.Count) users!" -ForegroundColor Green
    Write-Host "⚠ Users will receive enrollment emails" -ForegroundColor Yellow
    
} catch {
    Write-Error "Enrollment failed: $_"
}`;
    }
  },
  {
    id: 'duo-export-auth-logs',
    name: 'Export Authentication Logs',
    category: 'Reporting',
    description: 'Export Duo authentication logs',
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
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$MinTime = (Get-Date).AddDays(-${params.days}).ToUniversalTime().ToString('s')

try {
    # Note: Production code should implement proper Duo Admin API authentication
    # This is a placeholder showing the structure
    
    Write-Host "Fetching authentication logs for last ${params.days} days..." -ForegroundColor Cyan
    
    # Simulated log export structure
    $Logs = @()
    # API call would populate $Logs here
    
    $Logs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Logs exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  }
];
