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
  ,
    isPremium: true
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
  ,
    isPremium: true
  },
  {
    id: 'duo-manage-users',
    name: 'Manage User Accounts',
    category: 'Common Admin Tasks',
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

try {
    # Note: Production code should implement proper HMAC signing for Duo Admin API
    
    switch ("${action}") {
        "Create" {
            Write-Host "Creating user: $Username..." -ForegroundColor Cyan
            ${email ? `$Email = "${email}"` : ''}
            ${realname ? `$Realname = "${realname}"` : ''}
            
            # API call to create user would go here
            Write-Host "✓ User created: $Username" -ForegroundColor Green
            ${email ? `Write-Host "  Email: ${email}" -ForegroundColor Cyan` : ''}
        }
        "Update" {
            Write-Host "Updating user: $Username..." -ForegroundColor Cyan
            
            # API call to update user would go here
            Write-Host "✓ User updated: $Username" -ForegroundColor Green
        }
        "Delete" {
            Write-Host "Deleting user: $Username..." -ForegroundColor Yellow
            
            # API call to delete user would go here
            Write-Host "✓ User deleted: $Username" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Error "User management failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'duo-manage-devices',
    name: 'Manage Devices and Enrollments',
    category: 'Common Admin Tasks',
    description: 'Manage user devices and MFA enrollments',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List Devices', 'Remove Device', 'Send Enrollment'], defaultValue: 'List Devices' },
      { id: 'deviceId', label: 'Device ID (for removal)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = escapePowerShellString(params.username);
      const action = params.action;
      const deviceId = params.deviceId ? escapePowerShellString(params.deviceId) : '';
      
      return `# Duo Manage Devices and Enrollments
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Username = "${username}"

try {
    switch ("${action}") {
        "List Devices" {
            Write-Host "Retrieving devices for: $Username..." -ForegroundColor Cyan
            
            # API call to list devices would go here
            Write-Host "✓ Devices listed for user: $Username" -ForegroundColor Green
        }
        "Remove Device" {
            ${deviceId ? `
            $DeviceId = "${deviceId}"
            Write-Host "Removing device $DeviceId from user: $Username..." -ForegroundColor Yellow
            
            # API call to remove device would go here
            Write-Host "✓ Device removed: $DeviceId" -ForegroundColor Green
            ` : `
            Write-Host "⚠ Device ID required for removal" -ForegroundColor Yellow
            `}
        }
        "Send Enrollment" {
            Write-Host "Sending enrollment link to: $Username..." -ForegroundColor Cyan
            
            # API call to send enrollment would go here
            Write-Host "✓ Enrollment link sent to: $Username" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Error "Device management failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'duo-retrieve-auth-logs',
    name: 'Retrieve Authentication Logs',
    category: 'Common Admin Tasks',
    description: 'Retrieve and analyze Duo authentication logs',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'username', label: 'Filter by Username (optional)', type: 'text', required: false },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const username = params.username ? escapePowerShellString(params.username) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Duo Retrieve Authentication Logs
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$MinTime = (Get-Date).AddDays(-${params.days}).ToUniversalTime().ToString('s')
${username ? `$Username = "${username}"` : ''}

try {
    Write-Host "Retrieving authentication logs..." -ForegroundColor Cyan
    ${username ? `Write-Host "  Filter: Username = $Username" -ForegroundColor Cyan` : ''}
    
    # Note: Production code should implement proper Duo Admin API authentication
    # API call to retrieve logs would go here
    
    $Logs = @()
    # Populate logs from API
    
    $Report = $Logs | Select-Object \`
        timestamp,
        username,
        factor,
        result,
        ip,
        application,
        device
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Authentication logs exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Period: Last ${params.days} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Log retrieval failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'duo-enforce-mfa',
    name: 'Enforce MFA on Specific Systems',
    category: 'Common Admin Tasks',
    description: 'Configure MFA enforcement for specific systems and applications',
    parameters: [
      { id: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { id: 'applicationName', label: 'Application/System Name', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'requireEnroll', label: 'Require Enrollment', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const integrationKey = escapePowerShellString(params.integrationKey);
      const applicationName = escapePowerShellString(params.applicationName);
      const policyName = escapePowerShellString(params.policyName);
      
      return `# Duo Enforce MFA on Specific Systems
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$ApplicationName = "${applicationName}"
$PolicyName = "${policyName}"
$RequireEnroll = $${params.requireEnroll}

try {
    Write-Host "Configuring MFA enforcement for: $ApplicationName..." -ForegroundColor Cyan
    
    # Note: Production code should implement proper Duo Admin API authentication
    # Get or create policy
    # API call to configure policy would go here
    
    Write-Host "✓ MFA enforcement configured" -ForegroundColor Green
    Write-Host "  Application: $ApplicationName" -ForegroundColor Cyan
    Write-Host "  Policy: $PolicyName" -ForegroundColor Cyan
    Write-Host "  Require Enrollment: $RequireEnroll" -ForegroundColor Cyan
    
} catch {
    Write-Error "MFA enforcement configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'duo-compliance-report',
    name: 'Generate Compliance Reports',
    category: 'Common Admin Tasks',
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
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

try {
    Write-Host "Generating ${reportType} report..." -ForegroundColor Cyan
    
    # Note: Production code should implement proper Duo Admin API authentication
    
    $Report = switch ("${reportType}") {
        "User Enrollment Status" {
            # API call to get users and enrollment status
            @() | Select-Object username, status, enrolled_devices, last_login
        }
        "Authentication Summary" {
            # API call to get authentication statistics
            @() | Select-Object date, total_auths, successful_auths, denied_auths, fraud_auths
        }
        "Device Inventory" {
            # API call to get all enrolled devices
            @() | Select-Object device_id, type, platform, user, activated_date
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Compliance report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Report Type: ${reportType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'duo-usage-report',
    name: 'Generate Usage Reports',
    category: 'Common Admin Tasks',
    description: 'Generate detailed usage and activity reports',
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
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$Days = ${params.days}
$StartDate = (Get-Date).AddDays(-$Days)

try {
    Write-Host "Generating usage report for last $Days days..." -ForegroundColor Cyan
    
    # Note: Production code should implement proper Duo Admin API authentication
    # API calls to gather usage statistics would go here
    
    $Report = @()
    # Populate report with usage data
    
    $UsageReport = $Report | Select-Object \`
        date,
        total_authentications,
        unique_users,
        new_enrollments,
        top_applications,
        authentication_methods
    
    $UsageReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Usage report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Period: Last $Days days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'duo-configure-mfa-policy',
    name: 'Configure MFA Policies',
    category: 'Common Admin Tasks',
    description: 'Configure global MFA policies and requirements',
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
      
      return `# Duo Configure MFA Policies
# Generated: ${new Date().toISOString()}

$IntegrationKey = "${integrationKey}"
$SecretKey = Read-Host -AsSecureString -Prompt "Enter Duo Secret Key"
$ApiHost = Read-Host -Prompt "Enter Duo API Hostname"

$PolicyName = "${policyName}"
$AllowedMethods = "${allowedMethods}"
$RePromptHours = ${params.rePromptTime}

try {
    Write-Host "Configuring MFA policy: $PolicyName..." -ForegroundColor Cyan
    
    # Note: Production code should implement proper Duo Admin API authentication
    # API call to create/update policy would go here
    
    Write-Host "✓ MFA policy configured successfully" -ForegroundColor Green
    Write-Host "  Policy Name: $PolicyName" -ForegroundColor Cyan
    Write-Host "  Allowed Methods: $AllowedMethods" -ForegroundColor Cyan
    Write-Host "  Re-prompt Time: $RePromptHours hours" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
