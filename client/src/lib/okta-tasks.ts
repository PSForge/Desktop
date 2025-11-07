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
  },
  {
    id: 'okta-update-user',
    name: 'Update User Profile',
    category: 'Common Admin Tasks',
    description: 'Update user profile information in Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: false },
      { id: 'lastName', label: 'Last Name', type: 'text', required: false },
      { id: 'mobilePhone', label: 'Mobile Phone', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Update User Profile
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $UserEmail = "${userEmail}"
    
    $ProfileUpdates = @{}
    ${params.firstName ? `$ProfileUpdates.firstName = "${escapePowerShellString(params.firstName)}"` : ''}
    ${params.lastName ? `$ProfileUpdates.lastName = "${escapePowerShellString(params.lastName)}"` : ''}
    ${params.mobilePhone ? `$ProfileUpdates.mobilePhone = "${escapePowerShellString(params.mobilePhone)}"` : ''}
    
    $Body = @{ profile = $ProfileUpdates } | ConvertTo-Json
    
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ User profile updated: $UserEmail" -ForegroundColor Green
    
} catch {
    Write-Error "Update failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-deactivate-user',
    name: 'Deactivate User Account',
    category: 'Common Admin Tasks',
    description: 'Deactivate user accounts in Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Deactivate Users
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})

try {
    foreach ($Email in $UserEmails) {
        $Uri = "https://$OktaDomain/api/v1/users/$Email/lifecycle/deactivate"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
        
        Write-Host "✓ User deactivated: $Email" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Deactivated $($UserEmails.Count) users successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Deactivation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-manage-groups',
    name: 'Manage Groups and Memberships',
    category: 'Common Admin Tasks',
    description: 'Create groups and manage user memberships',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'groupDescription', label: 'Group Description', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails to Add (comma-separated)', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupName = escapePowerShellString(params.groupName);
      const groupDescription = escapePowerShellString(params.groupDescription);
      const userEmailsRaw = params.userEmails ? (params.userEmails as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Okta Manage Groups and Memberships
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Create or get group
    $GroupBody = @{
        profile = @{
            name = "${groupName}"
            description = "${groupDescription}"
        }
    } | ConvertTo-Json
    
    $GroupUri = "https://$OktaDomain/api/v1/groups"
    $Group = Invoke-RestMethod -Uri $GroupUri -Method Post -Headers $Headers -Body $GroupBody
    
    Write-Host "✓ Group created: ${groupName}" -ForegroundColor Green
    
    ${userEmailsRaw.length > 0 ? `
    # Add users to group
    $UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
    
    foreach ($Email in $UserEmails) {
        $UserUri = "https://$OktaDomain/api/v1/users/$Email"
        $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
        
        $MemberUri = "https://$OktaDomain/api/v1/groups/$($Group.id)/users/$($User.id)"
        Invoke-RestMethod -Uri $MemberUri -Method Put -Headers $Headers
        
        Write-Host "  Added user: $Email" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Group created and $($UserEmails.Count) users added!" -ForegroundColor Green
    ` : ''}
    
} catch {
    Write-Error "Group management failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-password-policy',
    name: 'Configure Password Policies',
    category: 'Common Admin Tasks',
    description: 'Configure password complexity and expiration policies',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'minLength', label: 'Minimum Password Length', type: 'number', required: true, defaultValue: 8 },
      { id: 'requireLowercase', label: 'Require Lowercase', type: 'boolean', required: true, defaultValue: true },
      { id: 'requireUppercase', label: 'Require Uppercase', type: 'boolean', required: true, defaultValue: true },
      { id: 'requireNumber', label: 'Require Number', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyName = escapePowerShellString(params.policyName);
      
      return `# Okta Configure Password Policy
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $PolicyBody = @{
        type = "PASSWORD"
        status = "ACTIVE"
        name = "${policyName}"
        description = "Password policy configured via PSForge"
        settings = @{
            password = @{
                complexity = @{
                    minLength = ${params.minLength}
                    minLowerCase = $(if (${params.requireLowercase}) { 1 } else { 0 })
                    minUpperCase = $(if (${params.requireUppercase}) { 1 } else { 0 })
                    minNumber = $(if (${params.requireNumber}) { 1 } else { 0 })
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/policies"
    $Policy = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $PolicyBody
    
    Write-Host "✓ Password policy created: ${policyName}" -ForegroundColor Green
    Write-Host "  Min Length: ${params.minLength}" -ForegroundColor Cyan
    Write-Host "  Complexity Requirements:" -ForegroundColor Cyan
    Write-Host "    - Lowercase: ${params.requireLowercase}" -ForegroundColor Cyan
    Write-Host "    - Uppercase: ${params.requireUppercase}" -ForegroundColor Cyan
    Write-Host "    - Numbers: ${params.requireNumber}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-automate-onboarding',
    name: 'Automate User Onboarding',
    category: 'Common Admin Tasks',
    description: 'Automated user onboarding with group assignments and app provisioning',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'department', label: 'Department', type: 'text', required: true },
      { id: 'groupIds', label: 'Group IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const department = escapePowerShellString(params.department);
      const groupIdsRaw = (params.groupIds as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Automated User Onboarding
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    # Step 1: Create user
    $UserBody = @{
        profile = @{
            firstName = "${firstName}"
            lastName = "${lastName}"
            email = "${userEmail}"
            login = "${userEmail}"
            department = "${department}"
        }
    } | ConvertTo-Json
    
    $UserUri = "https://$OktaDomain/api/v1/users?activate=true"
    $User = Invoke-RestMethod -Uri $UserUri -Method Post -Headers $Headers -Body $UserBody
    
    Write-Host "✓ User created: ${userEmail}" -ForegroundColor Green
    
    # Step 2: Add to groups
    $GroupIds = @(${groupIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    foreach ($GroupId in $GroupIds) {
        $MemberUri = "https://$OktaDomain/api/v1/groups/$GroupId/users/$($User.id)"
        Invoke-RestMethod -Uri $MemberUri -Method Put -Headers $Headers
        Write-Host "  Added to group: $GroupId" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "✓ User onboarding completed successfully!" -ForegroundColor Green
    Write-Host "  Activation email sent to: ${userEmail}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Onboarding failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-automate-offboarding',
    name: 'Automate User Offboarding',
    category: 'Common Admin Tasks',
    description: 'Automated user offboarding with app removal and account deactivation',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'removeFromGroups', label: 'Remove from All Groups', type: 'boolean', required: true, defaultValue: true },
      { id: 'suspendOnly', label: 'Suspend Only (Don\'t Deactivate)', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Automated User Offboarding
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $UserEmail = "${userEmail}"
    
    # Get user
    $UserUri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    ${params.removeFromGroups ? `
    # Remove from all groups
    $GroupsUri = "https://$OktaDomain/api/v1/users/$($User.id)/groups"
    $Groups = Invoke-RestMethod -Uri $GroupsUri -Method Get -Headers $Headers
    
    foreach ($Group in $Groups) {
        $RemoveUri = "https://$OktaDomain/api/v1/groups/$($Group.id)/users/$($User.id)"
        Invoke-RestMethod -Uri $RemoveUri -Method Delete -Headers $Headers
        Write-Host "  Removed from group: $($Group.profile.name)" -ForegroundColor Cyan
    }
    ` : ''}
    
    # Deactivate or suspend user
    ${params.suspendOnly ? `
    $SuspendUri = "https://$OktaDomain/api/v1/users/$($User.id)/lifecycle/suspend"
    Invoke-RestMethod -Uri $SuspendUri -Method Post -Headers $Headers
    Write-Host "✓ User suspended: $UserEmail" -ForegroundColor Green
    ` : `
    $DeactivateUri = "https://$OktaDomain/api/v1/users/$($User.id)/lifecycle/deactivate"
    Invoke-RestMethod -Uri $DeactivateUri -Method Post -Headers $Headers
    Write-Host "✓ User deactivated: $UserEmail" -ForegroundColor Green
    `}
    
    Write-Host ""
    Write-Host "User offboarding completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Offboarding failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-audit-report',
    name: 'Generate Audit Reports',
    category: 'Common Admin Tasks',
    description: 'Generate comprehensive audit and compliance reports',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['User Activity', 'Admin Actions', 'Authentication Events'], defaultValue: 'User Activity' },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Audit Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Since = (Get-Date).AddDays(-${params.days}).ToString('o')
    
    $Filter = switch ("${reportType}") {
        "User Activity" { "eventType eq \\"user.*\\"" }
        "Admin Actions" { "eventType eq \\"system.*\\"" }
        "Authentication Events" { "eventType eq \\"user.authentication.*\\"" }
    }
    
    $Uri = "https://$OktaDomain/api/v1/logs?since=$Since&filter=$Filter&limit=1000"
    $Logs = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Logs | Select-Object \`
        @{N='Timestamp';E={$_.published}},
        @{N='EventType';E={$_.eventType}},
        @{N='Actor';E={$_.actor.alternateId}},
        @{N='Target';E={$_.target[0].alternateId}},
        @{N='Outcome';E={$_.outcome.result}},
        @{N='Message';E={$_.displayMessage}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Audit report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Report Type: ${reportType}" -ForegroundColor Cyan
    Write-Host "  Events: $($Logs.Count)" -ForegroundColor Cyan
    Write-Host "  Period: Last ${params.days} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-integrate-apps',
    name: 'Integrate Okta Apps via API',
    category: 'Common Admin Tasks',
    description: 'Configure and integrate applications with Okta using API',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appName', label: 'Application Name', type: 'text', required: true },
      { id: 'appLabel', label: 'Application Label', type: 'text', required: true },
      { id: 'signOnMode', label: 'Sign-On Mode', type: 'select', required: true, options: ['SAML_2_0', 'OPENID_CONNECT', 'BASIC_AUTH'], defaultValue: 'SAML_2_0' }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appName = escapePowerShellString(params.appName);
      const appLabel = escapePowerShellString(params.appLabel);
      const signOnMode = params.signOnMode;
      
      return `# Okta Integrate Application
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $AppBody = @{
        name = "${appName}"
        label = "${appLabel}"
        signOnMode = "${signOnMode}"
        settings = @{
            signOn = @{}
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/apps"
    $App = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $AppBody
    
    Write-Host "✓ Application integrated: ${appLabel}" -ForegroundColor Green
    Write-Host "  App ID: $($App.id)" -ForegroundColor Cyan
    Write-Host "  Sign-On Mode: ${signOnMode}" -ForegroundColor Cyan
    Write-Host "  Status: $($App.status)" -ForegroundColor Cyan
    
} catch {
    Write-Error "App integration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'okta-session-policy',
    name: 'Configure Session Policies',
    category: 'Common Admin Tasks',
    description: 'Configure session timeout and security policies',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'maxSessionLifetime', label: 'Max Session Lifetime (hours)', type: 'number', required: true, defaultValue: 8 },
      { id: 'maxSessionIdle', label: 'Max Session Idle Time (hours)', type: 'number', required: true, defaultValue: 2 }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyName = escapePowerShellString(params.policyName);
      
      return `# Okta Configure Session Policy
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
}

try {
    $PolicyBody = @{
        type = "OKTA_SIGN_ON"
        status = "ACTIVE"
        name = "${policyName}"
        description = "Session policy configured via PSForge"
        conditions = @{
            people = @{
                users = @{
                    include = @("EVERYONE")
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/policies"
    $Policy = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $PolicyBody
    
    # Create rule for the policy
    $RuleBody = @{
        type = "SIGN_ON"
        name = "Default Rule"
        actions = @{
            signon = @{
                session = @{
                    maxSessionLifetimeMinutes = ${params.maxSessionLifetime * 60}
                    maxSessionIdleMinutes = ${params.maxSessionIdle * 60}
                    usePersistentCookie = $false
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $RuleUri = "https://$OktaDomain/api/v1/policies/$($Policy.id)/rules"
    $Rule = Invoke-RestMethod -Uri $RuleUri -Method Post -Headers $Headers -Body $RuleBody
    
    Write-Host "✓ Session policy created: ${policyName}" -ForegroundColor Green
    Write-Host "  Max Session Lifetime: ${params.maxSessionLifetime} hours" -ForegroundColor Cyan
    Write-Host "  Max Session Idle: ${params.maxSessionIdle} hours" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
