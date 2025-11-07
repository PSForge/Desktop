import { escapePowerShellString } from './powershell-utils';

export interface OktaTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface OktaTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: OktaTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const oktaTasks: OktaTask[] = [
  {
    id: 'okta-bulk-create-users',
    name: 'Bulk Create Users',
    category: 'Bulk Operations',
    description: 'Create multiple users in Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true, placeholder: 'company.okta.com' },
      { id: 'users', label: 'User Emails (one per line)', type: 'textarea', required: true, placeholder: 'john.doe@company.com\njane.smith@company.com' }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const users = (params.users as string).split('\n').filter((u: string) => u.trim());
      
      return `# Okta Bulk Create Users
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

$Users = @(
${users.map(u => `    "${escapePowerShellString(u.trim())}"`).join(',\n')}
)

try {
    foreach ($Email in $Users) {
        $FirstName = $Email.Split('@')[0].Split('.')[0]
        $LastName = $Email.Split('@')[0].Split('.')[1]
        
        $Body = @{
            profile = @{
                firstName = $FirstName
                lastName = $LastName
                email = $Email
                login = $Email
            }
        } | ConvertTo-Json
        
        $Uri = "https://$OktaDomain/api/v1/users?activate=true"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
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
    id: 'okta-bulk-assign-app',
    name: 'Bulk Assign Application',
    category: 'Bulk Operations',
    description: 'Assign application to multiple users',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appId', label: 'Application ID', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appId = escapePowerShellString(params.appId);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Bulk Assign Application
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$AppId = "${appId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})

try {
    foreach ($Email in $UserEmails) {
        # Get user ID
        $UserUri = "https://$OktaDomain/api/v1/users/$Email"
        $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
        
        # Assign app
        $AssignUri = "https://$OktaDomain/api/v1/apps/$AppId/users"
        $Body = @{ id = $User.id } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $AssignUri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ App assigned to: $Email" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Application assigned to $($UserEmails.Count) users!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-export-users',
    name: 'Export User Report',
    category: 'Reporting',
    description: 'Export all users to CSV',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Okta-Users.csv' }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Export Users
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/users?limit=200"
    $Users = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Users | Select-Object \`
        @{N='Email';E={$_.profile.email}},
        @{N='FirstName';E={$_.profile.firstName}},
        @{N='LastName';E={$_.profile.lastName}},
        @{N='Status';E={$_.status}},
        @{N='Created';E={$_.created}},
        @{N='LastLogin';E={$_.lastLogin}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Users exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Users: $($Users.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
