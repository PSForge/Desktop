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
  // ==================== USER MANAGEMENT ====================
  {
    id: 'okta-create-user',
    name: 'Create Single User',
    category: 'User Management',
    description: 'Create a new user in Okta with profile information',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true, placeholder: 'company.okta.com' },
      { id: 'email', label: 'User Email', type: 'email', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'department', label: 'Department', type: 'text', required: false },
      { id: 'title', label: 'Job Title', type: 'text', required: false },
      { id: 'activateUser', label: 'Activate User Immediately', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const email = escapePowerShellString(params.email);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const department = escapePowerShellString(params.department || '');
      const title = escapePowerShellString(params.title || '');
      
      return `# Okta Create Single User
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $UserProfile = @{
        firstName = "${firstName}"
        lastName = "${lastName}"
        email = "${email}"
        login = "${email}"
    }
    
    ${department ? `$UserProfile.department = "${department}"` : ''}
    ${title ? `$UserProfile.title = "${title}"` : ''}
    
    $Body = @{
        profile = $UserProfile
    } | ConvertTo-Json -Depth 10
    
    $ActivateParam = if (${params.activateUser ? '$true' : '$false'}) { "?activate=true" } else { "?activate=false" }
    $Uri = "https://$OktaDomain/api/v1/users$ActivateParam"
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "User created successfully!" -ForegroundColor Green
    Write-Host "  User ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    Write-Host "  Status: $($Response.status)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-bulk-create-users',
    name: 'Bulk Create Users from CSV',
    category: 'User Management',
    description: 'Create multiple users in Okta from a CSV file',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true, placeholder: 'company.okta.com' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\import.csv' },
      { id: 'activateUsers', label: 'Activate Users', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Okta Bulk Create Users from CSV
# Generated: ${new Date().toISOString()}
# CSV Format: FirstName,LastName,Email,Department,Title

$OktaDomain = "${oktaDomain}"
$CsvPath = "${csvPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$SuccessCount = 0
$FailCount = 0
$Results = @()

try {
    $Users = Import-Csv -Path $CsvPath
    $TotalUsers = $Users.Count
    
    Write-Host "Starting bulk user creation for $TotalUsers users..." -ForegroundColor Cyan
    
    foreach ($User in $Users) {
        try {
            $Body = @{
                profile = @{
                    firstName = $User.FirstName
                    lastName = $User.LastName
                    email = $User.Email
                    login = $User.Email
                    department = $User.Department
                    title = $User.Title
                }
            } | ConvertTo-Json -Depth 10
            
            $ActivateParam = if (${params.activateUsers ? '$true' : '$false'}) { "?activate=true" } else { "?activate=false" }
            $Uri = "https://$OktaDomain/api/v1/users$ActivateParam"
            
            $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            Write-Host "Created: $($User.Email)" -ForegroundColor Green
            $SuccessCount++
            
            $Results += [PSCustomObject]@{
                Email = $User.Email
                Status = "Success"
                UserId = $Response.id
            }
        } catch {
            Write-Host "Failed: $($User.Email) - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
            
            $Results += [PSCustomObject]@{
                Email = $User.Email
                Status = "Failed"
                Error = $_.Exception.Message
            }
        }
    }
    
    Write-Host ""
    Write-Host "Bulk creation completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
    $Results | Export-Csv -Path "$($CsvPath -replace '\\.csv$', '_results.csv')" -NoTypeInformation
    Write-Host "  Results exported to: $($CsvPath -replace '\\.csv$', '_results.csv')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Bulk creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-update-user-profile',
    name: 'Update User Profile',
    category: 'User Management',
    description: 'Update user profile attributes in Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: false },
      { id: 'lastName', label: 'Last Name', type: 'text', required: false },
      { id: 'department', label: 'Department', type: 'text', required: false },
      { id: 'title', label: 'Job Title', type: 'text', required: false },
      { id: 'manager', label: 'Manager Email', type: 'email', required: false },
      { id: 'mobilePhone', label: 'Mobile Phone', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Update User Profile
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $ProfileUpdates = @{}
    
    ${params.firstName ? `$ProfileUpdates.firstName = "${escapePowerShellString(params.firstName)}"` : ''}
    ${params.lastName ? `$ProfileUpdates.lastName = "${escapePowerShellString(params.lastName)}"` : ''}
    ${params.department ? `$ProfileUpdates.department = "${escapePowerShellString(params.department)}"` : ''}
    ${params.title ? `$ProfileUpdates.title = "${escapePowerShellString(params.title)}"` : ''}
    ${params.manager ? `$ProfileUpdates.manager = "${escapePowerShellString(params.manager)}"` : ''}
    ${params.mobilePhone ? `$ProfileUpdates.mobilePhone = "${escapePowerShellString(params.mobilePhone)}"` : ''}
    
    if ($ProfileUpdates.Count -eq 0) {
        Write-Host "No profile updates specified." -ForegroundColor Yellow
        return
    }
    
    $Body = @{ profile = $ProfileUpdates } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "User profile updated successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    Write-Host "  Updated fields: $($ProfileUpdates.Keys -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update user profile: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-activate-user',
    name: 'Activate User Account',
    category: 'User Management',
    description: 'Activate a staged or deactivated user account',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true },
      { id: 'sendEmail', label: 'Send Activation Email', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Activate User Account
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $SendEmailParam = if (${params.sendEmail ? '$true' : '$false'}) { "?sendEmail=true" } else { "?sendEmail=false" }
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/lifecycle/activate$SendEmailParam"
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "User activated successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    ${params.sendEmail ? `Write-Host "  Activation email sent to user" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to activate user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-deactivate-user',
    name: 'Deactivate User Account',
    category: 'User Management',
    description: 'Deactivate one or more user accounts in Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true },
      { id: 'sendEmail', label: 'Send Deactivation Email', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Deactivate User Accounts
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            $SendEmailParam = if (${params.sendEmail ? '$true' : '$false'}) { "?sendEmail=true" } else { "" }
            $Uri = "https://$OktaDomain/api/v1/users/$Email/lifecycle/deactivate$SendEmailParam"
            
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
            
            Write-Host "Deactivated: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Deactivation completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Deactivation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-suspend-user',
    name: 'Suspend User Account',
    category: 'User Management',
    description: 'Suspend user accounts without deactivating them',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Suspend User Accounts
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            $Uri = "https://$OktaDomain/api/v1/users/$Email/lifecycle/suspend"
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
            
            Write-Host "Suspended: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Suspension completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Suspension failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-unsuspend-user',
    name: 'Unsuspend User Account',
    category: 'User Management',
    description: 'Unsuspend previously suspended user accounts',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Unsuspend User Accounts
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            $Uri = "https://$OktaDomain/api/v1/users/$Email/lifecycle/unsuspend"
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
            
            Write-Host "Unsuspended: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Unsuspension completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Unsuspension failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-delete-user',
    name: 'Delete User Account',
    category: 'User Management',
    description: 'Permanently delete deactivated user accounts',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true },
      { id: 'confirmDelete', label: 'Confirm Permanent Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Delete User Accounts (Permanent)
# Generated: ${new Date().toISOString()}
# WARNING: This action is irreversible!

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$ConfirmDelete = ${params.confirmDelete ? '$true' : '$false'}

if (-not $ConfirmDelete) {
    Write-Host "Deletion cancelled - confirmation not provided." -ForegroundColor Yellow
    return
}

$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            # First deactivate if not already
            try {
                $DeactivateUri = "https://$OktaDomain/api/v1/users/$Email/lifecycle/deactivate"
                Invoke-RestMethod -Uri $DeactivateUri -Method Post -Headers $Headers -ErrorAction SilentlyContinue
            } catch { }
            
            # Then delete
            $DeleteUri = "https://$OktaDomain/api/v1/users/$Email"
            Invoke-RestMethod -Uri $DeleteUri -Method Delete -Headers $Headers
            
            Write-Host "Deleted: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Deletion completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-reset-password',
    name: 'Reset User Password',
    category: 'User Management',
    description: 'Reset password and optionally send reset email',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true },
      { id: 'sendEmail', label: 'Send Password Reset Email', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Reset User Password
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $SendEmailParam = if (${params.sendEmail ? '$true' : '$false'}) { "?sendEmail=true" } else { "?sendEmail=false" }
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/lifecycle/reset_password$SendEmailParam"
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "Password reset initiated!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    ${params.sendEmail ? `Write-Host "  Reset email sent to user" -ForegroundColor Cyan` : `Write-Host "  Reset URL: $($Response.resetPasswordUrl)" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Failed to reset password: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-unlock-user',
    name: 'Unlock User Account',
    category: 'User Management',
    description: 'Unlock a user account that has been locked out',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Unlock User Account
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/lifecycle/unlock"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "User account unlocked successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to unlock user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-expire-password',
    name: 'Expire User Password',
    category: 'User Management',
    description: 'Force user to change password at next login',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Expire User Passwords
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            $Uri = "https://$OktaDomain/api/v1/users/$Email/lifecycle/expire_password"
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
            
            Write-Host "Password expired: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Password expiration completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Password expiration failed: $_"
}`;
    },
    isPremium: true
  },
  
  // ==================== GROUP MANAGEMENT ====================
  {
    id: 'okta-create-group',
    name: 'Create Group',
    category: 'Group Management',
    description: 'Create a new Okta group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'groupDescription', label: 'Group Description', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupName = escapePowerShellString(params.groupName);
      const groupDescription = escapePowerShellString(params.groupDescription);
      
      return `# Okta Create Group
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $Body = @{
        profile = @{
            name = "${groupName}"
            description = "${groupDescription}"
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/groups"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Group created successfully!" -ForegroundColor Green
    Write-Host "  Group ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${groupName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-add-users-to-group',
    name: 'Add Users to Group',
    category: 'Group Management',
    description: 'Add multiple users to an Okta group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupId = escapePowerShellString(params.groupId);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Add Users to Group
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$GroupId = "${groupId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            # Get user ID first
            $UserUri = "https://$OktaDomain/api/v1/users/$Email"
            $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
            
            # Add to group
            $MemberUri = "https://$OktaDomain/api/v1/groups/$GroupId/users/$($User.id)"
            Invoke-RestMethod -Uri $MemberUri -Method Put -Headers $Headers
            
            Write-Host "Added: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Group membership update completed!" -ForegroundColor Green
    Write-Host "  Added: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Failed to add users to group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-remove-users-from-group',
    name: 'Remove Users from Group',
    category: 'Group Management',
    description: 'Remove multiple users from an Okta group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupId = escapePowerShellString(params.groupId);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Remove Users from Group
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$GroupId = "${groupId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            # Get user ID first
            $UserUri = "https://$OktaDomain/api/v1/users/$Email"
            $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
            
            # Remove from group
            $MemberUri = "https://$OktaDomain/api/v1/groups/$GroupId/users/$($User.id)"
            Invoke-RestMethod -Uri $MemberUri -Method Delete -Headers $Headers
            
            Write-Host "Removed: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Group membership update completed!" -ForegroundColor Green
    Write-Host "  Removed: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Failed to remove users from group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-list-group-members',
    name: 'List Group Members',
    category: 'Group Management',
    description: 'List all members of an Okta group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupId = escapePowerShellString(params.groupId);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Okta List Group Members
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$GroupId = "${groupId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get group info
    $GroupUri = "https://$OktaDomain/api/v1/groups/$GroupId"
    $Group = Invoke-RestMethod -Uri $GroupUri -Method Get -Headers $Headers
    
    Write-Host "Group: $($Group.profile.name)" -ForegroundColor Cyan
    Write-Host ""
    
    # Get members with pagination
    $AllMembers = @()
    $Uri = "https://$OktaDomain/api/v1/groups/$GroupId/users?limit=200"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Members = $Response.Content | ConvertFrom-Json
        $AllMembers += $Members
        
        # Check for next page
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    $Report = $AllMembers | Select-Object \`
        @{N='Email';E={$_.profile.email}},
        @{N='FirstName';E={$_.profile.firstName}},
        @{N='LastName';E={$_.profile.lastName}},
        @{N='Status';E={$_.status}},
        @{N='Created';E={$_.created}}
    
    $Report | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Members: $($AllMembers.Count)" -ForegroundColor Green
    
    ${exportPath ? `
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list group members: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-delete-group',
    name: 'Delete Group',
    category: 'Group Management',
    description: 'Delete an Okta group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID', type: 'text', required: true },
      { id: 'confirmDelete', label: 'Confirm Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupId = escapePowerShellString(params.groupId);
      
      return `# Okta Delete Group
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$GroupId = "${groupId}"
$ConfirmDelete = ${params.confirmDelete ? '$true' : '$false'}
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

if (-not $ConfirmDelete) {
    Write-Host "Deletion cancelled - confirmation not provided." -ForegroundColor Yellow
    return
}

try {
    # Get group info first
    $GroupUri = "https://$OktaDomain/api/v1/groups/$GroupId"
    $Group = Invoke-RestMethod -Uri $GroupUri -Method Get -Headers $Headers
    
    Write-Host "Deleting group: $($Group.profile.name)" -ForegroundColor Yellow
    
    # Delete the group
    Invoke-RestMethod -Uri $GroupUri -Method Delete -Headers $Headers
    
    Write-Host "Group deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to delete group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-create-group-rule',
    name: 'Create Group Membership Rule',
    category: 'Group Management',
    description: 'Create an automatic group membership rule based on user attributes',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true },
      { id: 'targetGroupId', label: 'Target Group ID', type: 'text', required: true },
      { id: 'attributeName', label: 'User Attribute', type: 'select', required: true, options: ['department', 'title', 'city', 'state', 'country', 'division', 'costCenter'] },
      { id: 'attributeValue', label: 'Attribute Value', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const ruleName = escapePowerShellString(params.ruleName);
      const targetGroupId = escapePowerShellString(params.targetGroupId);
      const attributeName = params.attributeName;
      const attributeValue = escapePowerShellString(params.attributeValue);
      
      return `# Okta Create Group Membership Rule
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $Body = @{
        type = "group_rule"
        name = "${ruleName}"
        conditions = @{
            expression = @{
                value = "user.${attributeName} == \\"${attributeValue}\\""
                type = "urn:okta:expression:1.0"
            }
        }
        actions = @{
            assignUserToGroups = @{
                groupIds = @("${targetGroupId}")
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/groups/rules"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Group rule created successfully!" -ForegroundColor Green
    Write-Host "  Rule ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${ruleName}" -ForegroundColor Cyan
    Write-Host "  Expression: user.${attributeName} == '${attributeValue}'" -ForegroundColor Cyan
    
    # Activate the rule
    $ActivateUri = "https://$OktaDomain/api/v1/groups/rules/$($Response.id)/lifecycle/activate"
    Invoke-RestMethod -Uri $ActivateUri -Method Post -Headers $Headers
    
    Write-Host "  Status: ACTIVE" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create group rule: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-sync-group-from-csv',
    name: 'Sync Group Membership from CSV',
    category: 'Group Management',
    description: 'Synchronize group membership with a CSV file (add missing, remove extra)',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID', type: 'text', required: true },
      { id: 'csvPath', label: 'CSV File Path (Email column)', type: 'path', required: true },
      { id: 'removeExtra', label: 'Remove Users Not in CSV', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const groupId = escapePowerShellString(params.groupId);
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Okta Sync Group Membership from CSV
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$GroupId = "${groupId}"
$CsvPath = "${csvPath}"
$RemoveExtra = ${params.removeExtra ? '$true' : '$false'}
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    # Load desired members from CSV
    $DesiredMembers = (Import-Csv -Path $CsvPath).Email | ForEach-Object { $_.Trim().ToLower() }
    
    # Get current group members
    $CurrentMembersUri = "https://$OktaDomain/api/v1/groups/$GroupId/users?limit=200"
    $CurrentMembers = Invoke-RestMethod -Uri $CurrentMembersUri -Method Get -Headers $Headers
    $CurrentEmails = $CurrentMembers | ForEach-Object { $_.profile.email.ToLower() }
    
    $AddedCount = 0
    $RemovedCount = 0
    
    # Add missing members
    foreach ($Email in $DesiredMembers) {
        if ($Email -notin $CurrentEmails) {
            try {
                $UserUri = "https://$OktaDomain/api/v1/users/$Email"
                $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
                
                $MemberUri = "https://$OktaDomain/api/v1/groups/$GroupId/users/$($User.id)"
                Invoke-RestMethod -Uri $MemberUri -Method Put -Headers $Headers
                
                Write-Host "Added: $Email" -ForegroundColor Green
                $AddedCount++
            } catch {
                Write-Host "Failed to add: $Email" -ForegroundColor Red
            }
        }
    }
    
    # Remove extra members if enabled
    if ($RemoveExtra) {
        foreach ($Member in $CurrentMembers) {
            if ($Member.profile.email.ToLower() -notin $DesiredMembers) {
                try {
                    $RemoveUri = "https://$OktaDomain/api/v1/groups/$GroupId/users/$($Member.id)"
                    Invoke-RestMethod -Uri $RemoveUri -Method Delete -Headers $Headers
                    
                    Write-Host "Removed: $($Member.profile.email)" -ForegroundColor Yellow
                    $RemovedCount++
                } catch {
                    Write-Host "Failed to remove: $($Member.profile.email)" -ForegroundColor Red
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "Sync completed!" -ForegroundColor Green
    Write-Host "  Added: $AddedCount" -ForegroundColor Green
    Write-Host "  Removed: $RemovedCount" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to sync group membership: $_"
}`;
    },
    isPremium: true
  },
  
  // ==================== APPLICATION MANAGEMENT ====================
  {
    id: 'okta-list-applications',
    name: 'List All Applications',
    category: 'Application Management',
    description: 'List all applications in the Okta org',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'status', label: 'Filter by Status', type: 'select', required: false, options: ['ACTIVE', 'INACTIVE', 'All'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const status = params.status;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Okta List All Applications
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $FilterParam = ""
    ${status !== 'All' ? `$FilterParam = "?filter=status eq \\"${status}\\""` : ''}
    
    $Uri = "https://$OktaDomain/api/v1/apps$FilterParam"
    $Apps = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Apps | Select-Object \`
        id,
        @{N='Name';E={$_.label}},
        @{N='SignOnMode';E={$_.signOnMode}},
        status,
        @{N='Created';E={$_.created}},
        @{N='LastUpdated';E={$_.lastUpdated}}
    
    $Report | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Applications: $($Apps.Count)" -ForegroundColor Green
    
    ${exportPath ? `
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list applications: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-assign-app-to-user',
    name: 'Assign Application to User',
    category: 'Application Management',
    description: 'Assign an application to one or more users',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appId', label: 'Application ID', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appId = escapePowerShellString(params.appId);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Assign Application to Users
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$AppId = "${appId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            # Get user ID
            $UserUri = "https://$OktaDomain/api/v1/users/$Email"
            $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
            
            # Assign app to user
            $Body = @{
                id = $User.id
                scope = "USER"
            } | ConvertTo-Json
            
            $AssignUri = "https://$OktaDomain/api/v1/apps/$AppId/users"
            Invoke-RestMethod -Uri $AssignUri -Method Post -Headers $Headers -Body $Body
            
            Write-Host "Assigned to: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Application assignment completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Failed to assign application: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-assign-app-to-group',
    name: 'Assign Application to Group',
    category: 'Application Management',
    description: 'Assign an application to a group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appId', label: 'Application ID', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appId = escapePowerShellString(params.appId);
      const groupId = escapePowerShellString(params.groupId);
      
      return `# Okta Assign Application to Group
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$AppId = "${appId}"
$GroupId = "${groupId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/apps/$AppId/groups/$GroupId"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers
    
    Write-Host "Application assigned to group successfully!" -ForegroundColor Green
    Write-Host "  App ID: $AppId" -ForegroundColor Cyan
    Write-Host "  Group ID: $GroupId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to assign application to group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-remove-app-from-user',
    name: 'Remove Application from User',
    category: 'Application Management',
    description: 'Remove an application assignment from users',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appId', label: 'Application ID', type: 'text', required: true },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appId = escapePowerShellString(params.appId);
      const userEmailsRaw = (params.userEmails as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Remove Application from Users
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$AppId = "${appId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

$UserEmails = @(${userEmailsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
$SuccessCount = 0
$FailCount = 0

try {
    foreach ($Email in $UserEmails) {
        try {
            # Get user ID
            $UserUri = "https://$OktaDomain/api/v1/users/$Email"
            $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
            
            # Remove app from user
            $RemoveUri = "https://$OktaDomain/api/v1/apps/$AppId/users/$($User.id)"
            Invoke-RestMethod -Uri $RemoveUri -Method Delete -Headers $Headers
            
            Write-Host "Removed from: $Email" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $Email - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Application removal completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Failed to remove application: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-list-app-users',
    name: 'List Application Users',
    category: 'Application Management',
    description: 'List all users assigned to an application',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appId', label: 'Application ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appId = escapePowerShellString(params.appId);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Okta List Application Users
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$AppId = "${appId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get app info
    $AppUri = "https://$OktaDomain/api/v1/apps/$AppId"
    $App = Invoke-RestMethod -Uri $AppUri -Method Get -Headers $Headers
    
    Write-Host "Application: $($App.label)" -ForegroundColor Cyan
    Write-Host ""
    
    # Get assigned users with pagination
    $AllUsers = @()
    $Uri = "https://$OktaDomain/api/v1/apps/$AppId/users?limit=200"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Users = $Response.Content | ConvertFrom-Json
        $AllUsers += $Users
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    $Report = $AllUsers | Select-Object \`
        id,
        @{N='Email';E={$_.credentials.userName}},
        scope,
        status,
        @{N='Created';E={$_.created}},
        @{N='LastUpdated';E={$_.lastUpdated}}
    
    $Report | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Assigned Users: $($AllUsers.Count)" -ForegroundColor Green
    
    ${exportPath ? `
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list application users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-deactivate-application',
    name: 'Deactivate Application',
    category: 'Application Management',
    description: 'Deactivate an application in Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'appId', label: 'Application ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const appId = escapePowerShellString(params.appId);
      
      return `# Okta Deactivate Application
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$AppId = "${appId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get app info first
    $AppUri = "https://$OktaDomain/api/v1/apps/$AppId"
    $App = Invoke-RestMethod -Uri $AppUri -Method Get -Headers $Headers
    
    Write-Host "Deactivating application: $($App.label)" -ForegroundColor Yellow
    
    # Deactivate
    $DeactivateUri = "https://$OktaDomain/api/v1/apps/$AppId/lifecycle/deactivate"
    Invoke-RestMethod -Uri $DeactivateUri -Method Post -Headers $Headers
    
    Write-Host "Application deactivated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to deactivate application: $_"
}`;
    },
    isPremium: true
  },
  
  // ==================== AUTHENTICATION / MFA ====================
  {
    id: 'okta-list-user-factors',
    name: 'List User MFA Factors',
    category: 'Authentication',
    description: 'List all enrolled MFA factors for a user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta List User MFA Factors
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/factors"
    $Factors = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "MFA Factors for: $UserEmail" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Factors.Count -eq 0) {
        Write-Host "No MFA factors enrolled." -ForegroundColor Yellow
    } else {
        $Report = $Factors | Select-Object \`
            id,
            factorType,
            provider,
            status,
            @{N='Created';E={$_.created}},
            @{N='LastUpdated';E={$_.lastUpdated}}
        
        $Report | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Total Factors: $($Factors.Count)" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to list MFA factors: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-reset-user-factors',
    name: 'Reset All User MFA Factors',
    category: 'Authentication',
    description: 'Reset all MFA factors for a user (requires re-enrollment)',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Reset All User MFA Factors
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/lifecycle/reset_factors"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "All MFA factors reset for: $UserEmail" -ForegroundColor Green
    Write-Host "User will need to re-enroll in MFA." -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to reset MFA factors: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-delete-specific-factor',
    name: 'Delete Specific MFA Factor',
    category: 'Authentication',
    description: 'Delete a specific MFA factor from a user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true },
      { id: 'factorId', label: 'Factor ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      const factorId = escapePowerShellString(params.factorId);
      
      return `# Okta Delete Specific MFA Factor
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$FactorId = "${factorId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/factors/$FactorId"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "MFA factor deleted successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    Write-Host "  Factor ID: $FactorId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to delete MFA factor: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-clear-user-sessions',
    name: 'Clear User Sessions',
    category: 'Authentication',
    description: 'Clear all active sessions for a user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email/Login', type: 'email', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Clear User Sessions
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/users/$UserEmail/sessions"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "All sessions cleared for: $UserEmail" -ForegroundColor Green
    Write-Host "User will need to re-authenticate." -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to clear sessions: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-list-active-sessions',
    name: 'List Active Sessions',
    category: 'Authentication',
    description: 'List all active sessions in the org',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'limit', label: 'Max Sessions to List', type: 'number', required: true, defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      
      return `# Okta List Active Sessions
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$Limit = ${params.limit || 100}
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Query system log for recent session creations
    $Since = (Get-Date).AddHours(-24).ToString('o')
    $Uri = "https://$OktaDomain/api/v1/logs?since=$Since&filter=eventType eq \\"user.session.start\\"&limit=$Limit"
    
    $Sessions = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Recent Sessions (Last 24 Hours)" -ForegroundColor Cyan
    Write-Host ""
    
    $Report = $Sessions | Select-Object \`
        @{N='User';E={$_.actor.alternateId}},
        @{N='Timestamp';E={$_.published}},
        @{N='Client';E={$_.client.userAgent.rawUserAgent}},
        @{N='IP';E={$_.client.ipAddress}},
        @{N='Result';E={$_.outcome.result}}
    
    $Report | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Sessions: $($Sessions.Count)" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to list sessions: $_"
}`;
    },
    isPremium: true
  },
  
  // ==================== POLICY MANAGEMENT ====================
  {
    id: 'okta-create-password-policy',
    name: 'Create Password Policy',
    category: 'Policy Management',
    description: 'Create a new password policy with complexity requirements',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'policyDescription', label: 'Policy Description', type: 'text', required: true },
      { id: 'minLength', label: 'Minimum Password Length', type: 'number', required: true, defaultValue: 8 },
      { id: 'minLowerCase', label: 'Minimum Lowercase Characters', type: 'number', required: true, defaultValue: 1 },
      { id: 'minUpperCase', label: 'Minimum Uppercase Characters', type: 'number', required: true, defaultValue: 1 },
      { id: 'minNumber', label: 'Minimum Numbers', type: 'number', required: true, defaultValue: 1 },
      { id: 'minSymbol', label: 'Minimum Symbols', type: 'number', required: true, defaultValue: 1 },
      { id: 'maxAgeDays', label: 'Password Max Age (Days, 0=never)', type: 'number', required: true, defaultValue: 90 }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyName = escapePowerShellString(params.policyName);
      const policyDescription = escapePowerShellString(params.policyDescription);
      
      return `# Okta Create Password Policy
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    $Body = @{
        type = "PASSWORD"
        status = "ACTIVE"
        name = "${policyName}"
        description = "${policyDescription}"
        priority = 1
        conditions = @{
            people = @{
                users = @{
                    include = @()
                    exclude = @()
                }
            }
        }
        settings = @{
            password = @{
                complexity = @{
                    minLength = ${params.minLength}
                    minLowerCase = ${params.minLowerCase}
                    minUpperCase = ${params.minUpperCase}
                    minNumber = ${params.minNumber}
                    minSymbol = ${params.minSymbol}
                    excludeUsername = $true
                }
                age = @{
                    maxAgeDays = ${params.maxAgeDays}
                    expireWarnDays = 14
                    historyCount = 5
                }
                lockout = @{
                    maxAttempts = 5
                    autoUnlockMinutes = 30
                    showLockoutFailures = $true
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/policies"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Password policy created successfully!" -ForegroundColor Green
    Write-Host "  Policy ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Min Length: ${params.minLength}" -ForegroundColor Cyan
    Write-Host "  Max Age: ${params.maxAgeDays} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create password policy: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-create-signon-policy',
    name: 'Create Sign-On Policy',
    category: 'Policy Management',
    description: 'Create a sign-on policy with MFA requirements',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'policyDescription', label: 'Policy Description', type: 'text', required: true },
      { id: 'requireMfa', label: 'Require MFA', type: 'boolean', required: true, defaultValue: true },
      { id: 'sessionIdleMinutes', label: 'Session Idle Timeout (minutes)', type: 'number', required: true, defaultValue: 120 },
      { id: 'sessionMaxMinutes', label: 'Session Max Lifetime (minutes)', type: 'number', required: true, defaultValue: 720 }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyName = escapePowerShellString(params.policyName);
      const policyDescription = escapePowerShellString(params.policyDescription);
      
      return `# Okta Create Sign-On Policy
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    # Create the policy
    $PolicyBody = @{
        type = "OKTA_SIGN_ON"
        status = "ACTIVE"
        name = "${policyName}"
        description = "${policyDescription}"
        priority = 1
        conditions = @{
            people = @{
                users = @{
                    include = @()
                    exclude = @()
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "https://$OktaDomain/api/v1/policies"
    $Policy = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $PolicyBody
    
    Write-Host "Policy created: $($Policy.id)" -ForegroundColor Green
    
    # Create a rule for the policy
    $RuleBody = @{
        type = "SIGN_ON"
        name = "Default Rule"
        status = "ACTIVE"
        conditions = @{
            network = @{
                connection = "ANYWHERE"
            }
            authContext = @{
                authType = "ANY"
            }
        }
        actions = @{
            signon = @{
                access = "ALLOW"
                requireFactor = ${params.requireMfa ? '$true' : '$false'}
                factorPromptMode = "ALWAYS"
                session = @{
                    usePersistentCookie = $false
                    maxSessionIdleMinutes = ${params.sessionIdleMinutes}
                    maxSessionLifetimeMinutes = ${params.sessionMaxMinutes}
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $RuleUri = "https://$OktaDomain/api/v1/policies/$($Policy.id)/rules"
    $Rule = Invoke-RestMethod -Uri $RuleUri -Method Post -Headers $Headers -Body $RuleBody
    
    Write-Host "Sign-on policy created successfully!" -ForegroundColor Green
    Write-Host "  Policy ID: $($Policy.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${policyName}" -ForegroundColor Cyan
    Write-Host "  MFA Required: ${params.requireMfa}" -ForegroundColor Cyan
    Write-Host "  Session Idle Timeout: ${params.sessionIdleMinutes} min" -ForegroundColor Cyan
    Write-Host "  Session Max Lifetime: ${params.sessionMaxMinutes} min" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create sign-on policy: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-list-policies',
    name: 'List All Policies',
    category: 'Policy Management',
    description: 'List all policies in the Okta org',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyType', label: 'Policy Type', type: 'select', required: true, options: ['OKTA_SIGN_ON', 'PASSWORD', 'MFA_ENROLL', 'All'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyType = params.policyType;
      
      return `# Okta List All Policies
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $PolicyTypes = @(${policyType === 'All' ? '"OKTA_SIGN_ON", "PASSWORD", "MFA_ENROLL"' : `"${policyType}"`})
    $AllPolicies = @()
    
    foreach ($Type in $PolicyTypes) {
        $Uri = "https://$OktaDomain/api/v1/policies?type=$Type"
        $Policies = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllPolicies += $Policies
    }
    
    Write-Host "Policies in Okta Org" -ForegroundColor Cyan
    Write-Host ""
    
    $Report = $AllPolicies | Select-Object \`
        id,
        name,
        type,
        status,
        @{N='Priority';E={$_.priority}},
        @{N='Created';E={$_.created}}
    
    $Report | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Policies: $($AllPolicies.Count)" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to list policies: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-assign-policy-to-group',
    name: 'Assign Policy to Group',
    category: 'Policy Management',
    description: 'Assign a policy to a specific group',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'groupIds', label: 'Group IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyId = escapePowerShellString(params.policyId);
      const groupIdsRaw = (params.groupIds as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Assign Policy to Groups
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$PolicyId = "${policyId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$GroupIds = @(${groupIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})

try {
    # Get current policy
    $PolicyUri = "https://$OktaDomain/api/v1/policies/$PolicyId"
    $Policy = Invoke-RestMethod -Uri $PolicyUri -Method Get -Headers $Headers
    
    # Update conditions to include groups
    $Policy.conditions.people.groups = @{
        include = $GroupIds
    }
    
    $Body = $Policy | ConvertTo-Json -Depth 10
    
    $Response = Invoke-RestMethod -Uri $PolicyUri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "Policy assigned to groups successfully!" -ForegroundColor Green
    Write-Host "  Policy: $($Policy.name)" -ForegroundColor Cyan
    Write-Host "  Groups: $($GroupIds.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to assign policy to groups: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-delete-policy',
    name: 'Delete Policy',
    category: 'Policy Management',
    description: 'Delete a policy from Okta',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'confirmDelete', label: 'Confirm Deletion', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const policyId = escapePowerShellString(params.policyId);
      
      return `# Okta Delete Policy
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$PolicyId = "${policyId}"
$ConfirmDelete = ${params.confirmDelete ? '$true' : '$false'}
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

if (-not $ConfirmDelete) {
    Write-Host "Deletion cancelled - confirmation not provided." -ForegroundColor Yellow
    return
}

try {
    # Get policy info first
    $PolicyUri = "https://$OktaDomain/api/v1/policies/$PolicyId"
    $Policy = Invoke-RestMethod -Uri $PolicyUri -Method Get -Headers $Headers
    
    Write-Host "Deleting policy: $($Policy.name)" -ForegroundColor Yellow
    
    # Deactivate first if active
    if ($Policy.status -eq "ACTIVE") {
        $DeactivateUri = "https://$OktaDomain/api/v1/policies/$PolicyId/lifecycle/deactivate"
        Invoke-RestMethod -Uri $DeactivateUri -Method Post -Headers $Headers
    }
    
    # Delete the policy
    Invoke-RestMethod -Uri $PolicyUri -Method Delete -Headers $Headers
    
    Write-Host "Policy deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to delete policy: $_"
}`;
    },
    isPremium: true
  },
  
  // ==================== REPORTING ====================
  {
    id: 'okta-export-all-users',
    name: 'Export All Users Report',
    category: 'Reporting',
    description: 'Export comprehensive user report to CSV',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Okta-Users.csv' },
      { id: 'includeInactive', label: 'Include Inactive Users', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Export All Users Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching users from Okta..." -ForegroundColor Cyan
    
    $AllUsers = @()
    $Filter = ${params.includeInactive ? '""' : '"status eq \\"ACTIVE\\""'}
    $Uri = "https://$OktaDomain/api/v1/users?limit=200" + $(if ($Filter) { "&filter=$Filter" } else { "" })
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Users = $Response.Content | ConvertFrom-Json
        $AllUsers += $Users
        
        Write-Host "  Fetched $($AllUsers.Count) users..." -ForegroundColor Gray
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    $Report = $AllUsers | Select-Object \`
        @{N='UserId';E={$_.id}},
        @{N='Email';E={$_.profile.email}},
        @{N='Login';E={$_.profile.login}},
        @{N='FirstName';E={$_.profile.firstName}},
        @{N='LastName';E={$_.profile.lastName}},
        @{N='Department';E={$_.profile.department}},
        @{N='Title';E={$_.profile.title}},
        @{N='Manager';E={$_.profile.manager}},
        @{N='Status';E={$_.status}},
        @{N='Created';E={$_.created}},
        @{N='Activated';E={$_.activated}},
        @{N='StatusChanged';E={$_.statusChanged}},
        @{N='LastLogin';E={$_.lastLogin}},
        @{N='LastUpdated';E={$_.lastUpdated}},
        @{N='PasswordChanged';E={$_.passwordChanged}}
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "User report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Users: $($AllUsers.Count)" -ForegroundColor Cyan
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-system-log-report',
    name: 'System Log Report',
    category: 'Reporting',
    description: 'Export system log events to CSV',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'eventType', label: 'Event Type Filter', type: 'select', required: true, options: ['All Events', 'user.session.start', 'user.session.end', 'user.authentication.sso', 'user.lifecycle.activate', 'user.lifecycle.deactivate', 'user.mfa.factor.activate', 'policy.lifecycle.update', 'application.user_membership.add'], defaultValue: 'All Events' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      const eventType = params.eventType;
      
      return `# Okta System Log Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$HoursBack = ${params.hoursBack}
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching system log events..." -ForegroundColor Cyan
    
    $Since = (Get-Date).AddHours(-$HoursBack).ToString('o')
    ${eventType === 'All Events' ? '$FilterParam = ""' : `$FilterParam = "&filter=eventType eq \\"${eventType}\\""`}
    
    $AllLogs = @()
    $Uri = "https://$OktaDomain/api/v1/logs?since=$Since&limit=1000$FilterParam"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Logs = $Response.Content | ConvertFrom-Json
        $AllLogs += $Logs
        
        Write-Host "  Fetched $($AllLogs.Count) events..." -ForegroundColor Gray
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    $Report = $AllLogs | Select-Object \`
        @{N='Timestamp';E={$_.published}},
        @{N='EventType';E={$_.eventType}},
        @{N='DisplayMessage';E={$_.displayMessage}},
        @{N='Severity';E={$_.severity}},
        @{N='ActorId';E={$_.actor.id}},
        @{N='ActorEmail';E={$_.actor.alternateId}},
        @{N='ActorType';E={$_.actor.type}},
        @{N='TargetId';E={$_.target[0].id}},
        @{N='TargetEmail';E={$_.target[0].alternateId}},
        @{N='TargetType';E={$_.target[0].type}},
        @{N='ClientIP';E={$_.client.ipAddress}},
        @{N='ClientDevice';E={$_.client.device}},
        @{N='ClientUserAgent';E={$_.client.userAgent.rawUserAgent}},
        @{N='Outcome';E={$_.outcome.result}},
        @{N='OutcomeReason';E={$_.outcome.reason}}
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "System log report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Events: $($AllLogs.Count)" -ForegroundColor Cyan
    Write-Host "  Time Range: Last $HoursBack hours" -ForegroundColor Cyan
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export system log: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-failed-login-report',
    name: 'Failed Login Attempts Report',
    category: 'Reporting',
    description: 'Report on failed authentication attempts',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Failed Login Attempts Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$HoursBack = ${params.hoursBack}
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching failed login attempts..." -ForegroundColor Cyan
    
    $Since = (Get-Date).AddHours(-$HoursBack).ToString('o')
    
    $AllLogs = @()
    $Uri = "https://$OktaDomain/api/v1/logs?since=$Since&filter=outcome.result eq \\"FAILURE\\" and eventType sw \\"user.authentication\\"&limit=1000"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Logs = $Response.Content | ConvertFrom-Json
        $AllLogs += $Logs
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    $Report = $AllLogs | Select-Object \`
        @{N='Timestamp';E={$_.published}},
        @{N='User';E={$_.actor.alternateId}},
        @{N='EventType';E={$_.eventType}},
        @{N='FailureReason';E={$_.outcome.reason}},
        @{N='IPAddress';E={$_.client.ipAddress}},
        @{N='City';E={$_.client.geographicalContext.city}},
        @{N='Country';E={$_.client.geographicalContext.country}},
        @{N='Device';E={$_.client.device}},
        @{N='Browser';E={$_.client.userAgent.browser}},
        @{N='OS';E={$_.client.userAgent.os}}
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary statistics
    $UserFailures = $AllLogs | Group-Object { $_.actor.alternateId } | Sort-Object Count -Descending | Select-Object -First 10
    $IPFailures = $AllLogs | Group-Object { $_.client.ipAddress } | Sort-Object Count -Descending | Select-Object -First 10
    
    Write-Host ""
    Write-Host "Failed Login Report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Failed Attempts: $($AllLogs.Count)" -ForegroundColor Red
    Write-Host "  Time Range: Last $HoursBack hours" -ForegroundColor Cyan
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Top 10 Users with Failed Logins:" -ForegroundColor Yellow
    $UserFailures | ForEach-Object { Write-Host "  $($_.Name): $($_.Count) failures" }
    Write-Host ""
    Write-Host "Top 10 IPs with Failed Logins:" -ForegroundColor Yellow
    $IPFailures | ForEach-Object { Write-Host "  $($_.Name): $($_.Count) failures" }
    
} catch {
    Write-Error "Failed to export failed login report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-app-usage-report',
    name: 'Application Usage Report',
    category: 'Reporting',
    description: 'Report on application SSO usage',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'daysBack', label: 'Days to Look Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Application Usage Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$DaysBack = ${params.daysBack}
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching application SSO events..." -ForegroundColor Cyan
    
    $Since = (Get-Date).AddDays(-$DaysBack).ToString('o')
    
    $AllLogs = @()
    $Uri = "https://$OktaDomain/api/v1/logs?since=$Since&filter=eventType eq \\"user.authentication.sso\\"&limit=1000"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Logs = $Response.Content | ConvertFrom-Json
        $AllLogs += $Logs
        
        Write-Host "  Fetched $($AllLogs.Count) SSO events..." -ForegroundColor Gray
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    # Get application details
    $AppsUri = "https://$OktaDomain/api/v1/apps?limit=200"
    $Apps = Invoke-RestMethod -Uri $AppsUri -Method Get -Headers $Headers
    $AppLookup = @{}
    foreach ($App in $Apps) {
        $AppLookup[$App.id] = $App.label
    }
    
    $Report = $AllLogs | Select-Object \`
        @{N='Timestamp';E={$_.published}},
        @{N='User';E={$_.actor.alternateId}},
        @{N='AppId';E={$_.target | Where-Object { $_.type -eq 'AppInstance' } | Select-Object -ExpandProperty id -First 1}},
        @{N='AppName';E={
            $appId = $_.target | Where-Object { $_.type -eq 'AppInstance' } | Select-Object -ExpandProperty id -First 1
            if ($appId -and $AppLookup[$appId]) { $AppLookup[$appId] } else { $_.target[0].displayName }
        }},
        @{N='Outcome';E={$_.outcome.result}},
        @{N='IPAddress';E={$_.client.ipAddress}}
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary by app
    $AppSummary = $AllLogs | Group-Object { 
        $appId = $_.target | Where-Object { $_.type -eq 'AppInstance' } | Select-Object -ExpandProperty id -First 1
        if ($appId -and $AppLookup[$appId]) { $AppLookup[$appId] } else { $_.target[0].displayName }
    } | Sort-Object Count -Descending
    
    Write-Host ""
    Write-Host "Application Usage Report exported successfully!" -ForegroundColor Green
    Write-Host "  Total SSO Events: $($AllLogs.Count)" -ForegroundColor Cyan
    Write-Host "  Time Range: Last $DaysBack days" -ForegroundColor Cyan
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Top Applications by Usage:" -ForegroundColor Yellow
    $AppSummary | Select-Object -First 15 | ForEach-Object { 
        Write-Host "  $($_.Name): $($_.Count) logins" 
    }
    
} catch {
    Write-Error "Failed to export app usage report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-inactive-users-report',
    name: 'Inactive Users Report',
    category: 'Reporting',
    description: 'Find users who have not logged in recently',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'inactiveDays', label: 'Days Since Last Login', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Inactive Users Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$InactiveDays = ${params.inactiveDays}
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching all active users..." -ForegroundColor Cyan
    
    $CutoffDate = (Get-Date).AddDays(-$InactiveDays)
    
    $AllUsers = @()
    $Uri = "https://$OktaDomain/api/v1/users?filter=status eq \\"ACTIVE\\"&limit=200"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Users = $Response.Content | ConvertFrom-Json
        $AllUsers += $Users
        
        Write-Host "  Fetched $($AllUsers.Count) users..." -ForegroundColor Gray
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    # Filter inactive users
    $InactiveUsers = $AllUsers | Where-Object {
        if ($_.lastLogin) {
            $LastLogin = [DateTime]::Parse($_.lastLogin)
            return $LastLogin -lt $CutoffDate
        } else {
            return $true  # Never logged in
        }
    }
    
    $Report = $InactiveUsers | Select-Object \`
        @{N='UserId';E={$_.id}},
        @{N='Email';E={$_.profile.email}},
        @{N='FirstName';E={$_.profile.firstName}},
        @{N='LastName';E={$_.profile.lastName}},
        @{N='Department';E={$_.profile.department}},
        @{N='Title';E={$_.profile.title}},
        @{N='Created';E={$_.created}},
        @{N='LastLogin';E={if ($_.lastLogin) { $_.lastLogin } else { "Never" }}},
        @{N='DaysSinceLogin';E={
            if ($_.lastLogin) { 
                [Math]::Round(((Get-Date) - [DateTime]::Parse($_.lastLogin)).TotalDays) 
            } else { 
                "N/A" 
            }
        }}
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "Inactive Users Report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Active Users: $($AllUsers.Count)" -ForegroundColor Cyan
    Write-Host "  Inactive Users (>$InactiveDays days): $($InactiveUsers.Count)" -ForegroundColor Yellow
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export inactive users report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-mfa-enrollment-report',
    name: 'MFA Enrollment Report',
    category: 'Reporting',
    description: 'Report on MFA factor enrollment status for all users',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta MFA Enrollment Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching all active users..." -ForegroundColor Cyan
    
    $AllUsers = @()
    $Uri = "https://$OktaDomain/api/v1/users?filter=status eq \\"ACTIVE\\"&limit=200"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Users = $Response.Content | ConvertFrom-Json
        $AllUsers += $Users
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    Write-Host "Checking MFA enrollment for $($AllUsers.Count) users..." -ForegroundColor Cyan
    
    $Report = @()
    $Counter = 0
    
    foreach ($User in $AllUsers) {
        $Counter++
        if ($Counter % 50 -eq 0) {
            Write-Host "  Processed $Counter / $($AllUsers.Count) users..." -ForegroundColor Gray
        }
        
        try {
            $FactorsUri = "https://$OktaDomain/api/v1/users/$($User.id)/factors"
            $Factors = Invoke-RestMethod -Uri $FactorsUri -Method Get -Headers $Headers
            
            $ActiveFactors = $Factors | Where-Object { $_.status -eq "ACTIVE" }
            
            $Report += [PSCustomObject]@{
                UserId = $User.id
                Email = $User.profile.email
                FirstName = $User.profile.firstName
                LastName = $User.profile.lastName
                Department = $User.profile.department
                MFAEnrolled = ($ActiveFactors.Count -gt 0)
                FactorCount = $ActiveFactors.Count
                FactorTypes = ($ActiveFactors.factorType -join ", ")
            }
        } catch {
            $Report += [PSCustomObject]@{
                UserId = $User.id
                Email = $User.profile.email
                FirstName = $User.profile.firstName
                LastName = $User.profile.lastName
                Department = $User.profile.department
                MFAEnrolled = "Error"
                FactorCount = "Error"
                FactorTypes = $_.Exception.Message
            }
        }
    }
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary
    $Enrolled = ($Report | Where-Object { $_.MFAEnrolled -eq $true }).Count
    $NotEnrolled = ($Report | Where-Object { $_.MFAEnrolled -eq $false }).Count
    
    Write-Host ""
    Write-Host "MFA Enrollment Report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Users: $($AllUsers.Count)" -ForegroundColor Cyan
    Write-Host "  MFA Enrolled: $Enrolled" -ForegroundColor Green
    Write-Host "  Not Enrolled: $NotEnrolled" -ForegroundColor Yellow
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export MFA enrollment report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-security-events-report',
    name: 'Security Events Report',
    category: 'Reporting',
    description: 'Report on security-related events (suspicious activity, lockouts, etc.)',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: true, defaultValue: 72 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta Security Events Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$HoursBack = ${params.hoursBack}
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

# Security event types to monitor
$SecurityEventTypes = @(
    "user.account.lock",
    "user.account.unlock",
    "user.session.impersonation.initiate",
    "security.threat.detected",
    "policy.evaluate_sign_on",
    "user.mfa.factor.reset_all",
    "user.lifecycle.deactivate",
    "user.lifecycle.suspend",
    "system.api_token.create",
    "system.api_token.revoke"
)

try {
    Write-Host "Fetching security events..." -ForegroundColor Cyan
    
    $Since = (Get-Date).AddHours(-$HoursBack).ToString('o')
    $AllLogs = @()
    
    foreach ($EventType in $SecurityEventTypes) {
        Write-Host "  Checking: $EventType" -ForegroundColor Gray
        
        $Uri = "https://$OktaDomain/api/v1/logs?since=$Since&filter=eventType eq \\"$EventType\\"&limit=1000"
        
        try {
            $Logs = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
            $AllLogs += $Logs
        } catch { }
    }
    
    # Also get high severity events
    Write-Host "  Checking: High severity events" -ForegroundColor Gray
    $SeverityUri = "https://$OktaDomain/api/v1/logs?since=$Since&filter=severity eq \\"ERROR\\" or severity eq \\"WARN\\"&limit=1000"
    try {
        $SeverityLogs = Invoke-RestMethod -Uri $SeverityUri -Method Get -Headers $Headers
        $AllLogs += $SeverityLogs
    } catch { }
    
    # Remove duplicates
    $AllLogs = $AllLogs | Sort-Object uuid -Unique
    
    $Report = $AllLogs | Sort-Object published -Descending | Select-Object \`
        @{N='Timestamp';E={$_.published}},
        @{N='Severity';E={$_.severity}},
        @{N='EventType';E={$_.eventType}},
        @{N='DisplayMessage';E={$_.displayMessage}},
        @{N='ActorEmail';E={$_.actor.alternateId}},
        @{N='ActorType';E={$_.actor.type}},
        @{N='TargetEmail';E={$_.target[0].alternateId}},
        @{N='TargetType';E={$_.target[0].type}},
        @{N='ClientIP';E={$_.client.ipAddress}},
        @{N='City';E={$_.client.geographicalContext.city}},
        @{N='Country';E={$_.client.geographicalContext.country}},
        @{N='Outcome';E={$_.outcome.result}},
        @{N='OutcomeReason';E={$_.outcome.reason}}
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    # Summary
    $EventSummary = $AllLogs | Group-Object eventType | Sort-Object Count -Descending
    
    Write-Host ""
    Write-Host "Security Events Report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Security Events: $($AllLogs.Count)" -ForegroundColor $(if ($AllLogs.Count -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Time Range: Last $HoursBack hours" -ForegroundColor Cyan
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
    if ($EventSummary.Count -gt 0) {
        Write-Host ""
        Write-Host "Event Type Summary:" -ForegroundColor Yellow
        $EventSummary | ForEach-Object { Write-Host "  $($_.Name): $($_.Count)" }
    }
    
} catch {
    Write-Error "Failed to export security events report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-group-membership-report',
    name: 'All Groups Membership Report',
    category: 'Reporting',
    description: 'Export membership for all groups in the org',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta All Groups Membership Report
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    Write-Host "Fetching all groups..." -ForegroundColor Cyan
    
    $AllGroups = @()
    $Uri = "https://$OktaDomain/api/v1/groups?limit=200"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Groups = $Response.Content | ConvertFrom-Json
        $AllGroups += $Groups
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    Write-Host "Found $($AllGroups.Count) groups. Fetching membership..." -ForegroundColor Cyan
    
    $Report = @()
    $Counter = 0
    
    foreach ($Group in $AllGroups) {
        $Counter++
        Write-Host "  Processing ($Counter/$($AllGroups.Count)): $($Group.profile.name)" -ForegroundColor Gray
        
        try {
            $MembersUri = "https://$OktaDomain/api/v1/groups/$($Group.id)/users?limit=200"
            $Members = Invoke-RestMethod -Uri $MembersUri -Method Get -Headers $Headers
            
            foreach ($Member in $Members) {
                $Report += [PSCustomObject]@{
                    GroupId = $Group.id
                    GroupName = $Group.profile.name
                    GroupDescription = $Group.profile.description
                    GroupType = $Group.type
                    UserId = $Member.id
                    UserEmail = $Member.profile.email
                    UserFirstName = $Member.profile.firstName
                    UserLastName = $Member.profile.lastName
                    UserStatus = $Member.status
                }
            }
            
            if ($Members.Count -eq 0) {
                $Report += [PSCustomObject]@{
                    GroupId = $Group.id
                    GroupName = $Group.profile.name
                    GroupDescription = $Group.profile.description
                    GroupType = $Group.type
                    UserId = ""
                    UserEmail = "(No members)"
                    UserFirstName = ""
                    UserLastName = ""
                    UserStatus = ""
                }
            }
        } catch {
            Write-Host "    Error fetching members: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "Group Membership Report exported successfully!" -ForegroundColor Green
    Write-Host "  Total Groups: $($AllGroups.Count)" -ForegroundColor Cyan
    Write-Host "  Total Memberships: $(($Report | Where-Object { $_.UserEmail -ne '(No members)' }).Count)" -ForegroundColor Cyan
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export group membership report: $_"
}`;
    },
    isPremium: true
  },
  
  // ==================== LIFECYCLE / AUTOMATION ====================
  {
    id: 'okta-user-onboarding',
    name: 'Complete User Onboarding',
    category: 'Lifecycle Automation',
    description: 'Create user, assign to groups, and assign applications',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'email', label: 'User Email', type: 'email', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'department', label: 'Department', type: 'text', required: true },
      { id: 'title', label: 'Job Title', type: 'text', required: false },
      { id: 'groupIds', label: 'Group IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'sendActivation', label: 'Send Activation Email', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const email = escapePowerShellString(params.email);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const department = escapePowerShellString(params.department);
      const title = escapePowerShellString(params.title || '');
      const groupIdsRaw = (params.groupIds as string).split(',').map((n: string) => n.trim());
      
      return `# Okta Complete User Onboarding
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    Write-Host "Starting onboarding for: ${email}" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Create User
    Write-Host "Step 1: Creating user account..." -ForegroundColor Yellow
    
    $UserProfile = @{
        firstName = "${firstName}"
        lastName = "${lastName}"
        email = "${email}"
        login = "${email}"
        department = "${department}"
    }
    ${title ? `$UserProfile.title = "${title}"` : ''}
    
    $UserBody = @{ profile = $UserProfile } | ConvertTo-Json -Depth 10
    
    $ActivateParam = if (${params.sendActivation ? '$true' : '$false'}) { "?activate=true" } else { "?activate=false" }
    $UserUri = "https://$OktaDomain/api/v1/users$ActivateParam"
    
    $User = Invoke-RestMethod -Uri $UserUri -Method Post -Headers $Headers -Body $UserBody
    
    Write-Host "  User created: $($User.id)" -ForegroundColor Green
    
    # Step 2: Add to Groups
    Write-Host "Step 2: Adding to groups..." -ForegroundColor Yellow
    
    $GroupIds = @(${groupIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    foreach ($GroupId in $GroupIds) {
        try {
            $MemberUri = "https://$OktaDomain/api/v1/groups/$GroupId/users/$($User.id)"
            Invoke-RestMethod -Uri $MemberUri -Method Put -Headers $Headers
            Write-Host "  Added to group: $GroupId" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to add to group $GroupId : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Onboarding completed successfully!" -ForegroundColor Green
    Write-Host "  User: ${email}" -ForegroundColor Cyan
    Write-Host "  User ID: $($User.id)" -ForegroundColor Cyan
    Write-Host "  Groups: $($GroupIds.Count)" -ForegroundColor Cyan
    ${params.sendActivation ? `Write-Host "  Activation email sent" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Onboarding failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-user-offboarding',
    name: 'Complete User Offboarding',
    category: 'Lifecycle Automation',
    description: 'Remove from groups, revoke sessions, deactivate user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'removeFromGroups', label: 'Remove from All Groups', type: 'boolean', required: true, defaultValue: true },
      { id: 'revokeSessions', label: 'Revoke All Sessions', type: 'boolean', required: true, defaultValue: true },
      { id: 'resetMfa', label: 'Reset MFA Factors', type: 'boolean', required: true, defaultValue: true },
      { id: 'deactivateUser', label: 'Deactivate User', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta Complete User Offboarding
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    Write-Host "Starting offboarding for: $UserEmail" -ForegroundColor Cyan
    Write-Host ""
    
    # Get user
    $UserUri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    ${params.revokeSessions ? `
    # Step 1: Revoke all sessions
    Write-Host "Step 1: Revoking all sessions..." -ForegroundColor Yellow
    try {
        $SessionsUri = "https://$OktaDomain/api/v1/users/$($User.id)/sessions"
        Invoke-RestMethod -Uri $SessionsUri -Method Delete -Headers $Headers
        Write-Host "  Sessions revoked" -ForegroundColor Green
    } catch {
        Write-Host "  No active sessions or error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    ` : ''}
    
    ${params.resetMfa ? `
    # Step 2: Reset MFA factors
    Write-Host "Step 2: Resetting MFA factors..." -ForegroundColor Yellow
    try {
        $MfaUri = "https://$OktaDomain/api/v1/users/$($User.id)/lifecycle/reset_factors"
        Invoke-RestMethod -Uri $MfaUri -Method Post -Headers $Headers
        Write-Host "  MFA factors reset" -ForegroundColor Green
    } catch {
        Write-Host "  Error resetting MFA: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    ` : ''}
    
    ${params.removeFromGroups ? `
    # Step 3: Remove from all groups
    Write-Host "Step 3: Removing from all groups..." -ForegroundColor Yellow
    $GroupsUri = "https://$OktaDomain/api/v1/users/$($User.id)/groups"
    $Groups = Invoke-RestMethod -Uri $GroupsUri -Method Get -Headers $Headers
    
    foreach ($Group in $Groups) {
        if ($Group.type -eq "OKTA_GROUP") {
            try {
                $RemoveUri = "https://$OktaDomain/api/v1/groups/$($Group.id)/users/$($User.id)"
                Invoke-RestMethod -Uri $RemoveUri -Method Delete -Headers $Headers
                Write-Host "  Removed from: $($Group.profile.name)" -ForegroundColor Green
            } catch {
                Write-Host "  Failed to remove from $($Group.profile.name): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
    ` : ''}
    
    ${params.deactivateUser ? `
    # Step 4: Deactivate user
    Write-Host "Step 4: Deactivating user..." -ForegroundColor Yellow
    $DeactivateUri = "https://$OktaDomain/api/v1/users/$($User.id)/lifecycle/deactivate"
    Invoke-RestMethod -Uri $DeactivateUri -Method Post -Headers $Headers
    Write-Host "  User deactivated" -ForegroundColor Green
    ` : ''}
    
    Write-Host ""
    Write-Host "Offboarding completed successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    
} catch {
    Write-Error "Offboarding failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-bulk-update-department',
    name: 'Bulk Update User Departments',
    category: 'Lifecycle Automation',
    description: 'Update department for multiple users from CSV',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'csvPath', label: 'CSV File Path (Email,Department)', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Okta Bulk Update User Departments
# Generated: ${new Date().toISOString()}
# CSV Format: Email,Department

$OktaDomain = "${oktaDomain}"
$CsvPath = "${csvPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$SuccessCount = 0
$FailCount = 0

try {
    $Updates = Import-Csv -Path $CsvPath
    $TotalUpdates = $Updates.Count
    
    Write-Host "Starting bulk department update for $TotalUpdates users..." -ForegroundColor Cyan
    
    foreach ($Update in $Updates) {
        try {
            $Body = @{
                profile = @{
                    department = $Update.Department
                }
            } | ConvertTo-Json -Depth 10
            
            $Uri = "https://$OktaDomain/api/v1/users/$($Update.Email)"
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            
            Write-Host "Updated: $($Update.Email) -> $($Update.Department)" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $($Update.Email) - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Bulk update completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Bulk update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-sync-users-with-ad',
    name: 'Compare Okta Users with AD',
    category: 'Lifecycle Automation',
    description: 'Compare Okta users with Active Directory users (requires AD module)',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'adDomain', label: 'AD Domain (e.g., corp.company.com)', type: 'text', required: true },
      { id: 'adSearchBase', label: 'AD Search Base OU', type: 'text', required: true, placeholder: 'OU=Users,DC=corp,DC=company,DC=com' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const adDomain = escapePowerShellString(params.adDomain);
      const adSearchBase = escapePowerShellString(params.adSearchBase);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Okta/AD User Comparison Report
# Generated: ${new Date().toISOString()}
# Requires: Active Directory PowerShell module

$OktaDomain = "${oktaDomain}"
$ADDomain = "${adDomain}"
$ADSearchBase = "${adSearchBase}"
$ExportPath = "${exportPath}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Check for AD module
    if (-not (Get-Module -ListAvailable ActiveDirectory)) {
        Write-Error "Active Directory PowerShell module is required but not installed."
        return
    }
    
    Import-Module ActiveDirectory
    
    Write-Host "Fetching users from Okta..." -ForegroundColor Cyan
    
    # Get all Okta users
    $OktaUsers = @()
    $Uri = "https://$OktaDomain/api/v1/users?filter=status eq \\"ACTIVE\\"&limit=200"
    
    do {
        $Response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers
        $Users = $Response.Content | ConvertFrom-Json
        $OktaUsers += $Users
        
        $Links = $Response.Headers.Link
        $Uri = $null
        if ($Links) {
            $NextLink = $Links | Where-Object { $_ -match 'rel="next"' }
            if ($NextLink -match '<([^>]+)>') {
                $Uri = $Matches[1]
            }
        }
    } while ($Uri)
    
    Write-Host "Found $($OktaUsers.Count) active Okta users" -ForegroundColor Cyan
    
    # Get all AD users
    Write-Host "Fetching users from Active Directory..." -ForegroundColor Cyan
    $ADUsers = Get-ADUser -Server $ADDomain -SearchBase $ADSearchBase -Filter {Enabled -eq $true} -Properties EmailAddress, Department, Title
    
    Write-Host "Found $($ADUsers.Count) enabled AD users" -ForegroundColor Cyan
    
    # Compare
    $OktaEmails = $OktaUsers | ForEach-Object { $_.profile.email.ToLower() }
    $ADEmails = $ADUsers | Where-Object { $_.EmailAddress } | ForEach-Object { $_.EmailAddress.ToLower() }
    
    $Report = @()
    
    # Users in Okta but not in AD
    $OktaOnly = $OktaUsers | Where-Object { $_.profile.email.ToLower() -notin $ADEmails }
    foreach ($User in $OktaOnly) {
        $Report += [PSCustomObject]@{
            Email = $User.profile.email
            Source = "Okta Only"
            OktaStatus = $User.status
            ADStatus = "Not Found"
            FirstName = $User.profile.firstName
            LastName = $User.profile.lastName
        }
    }
    
    # Users in AD but not in Okta
    $ADOnly = $ADUsers | Where-Object { $_.EmailAddress -and $_.EmailAddress.ToLower() -notin $OktaEmails }
    foreach ($User in $ADOnly) {
        $Report += [PSCustomObject]@{
            Email = $User.EmailAddress
            Source = "AD Only"
            OktaStatus = "Not Found"
            ADStatus = "Enabled"
            FirstName = $User.GivenName
            LastName = $User.Surname
        }
    }
    
    $Report | Export-Csv -Path $ExportPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "Comparison Report exported successfully!" -ForegroundColor Green
    Write-Host "  Okta Active Users: $($OktaUsers.Count)" -ForegroundColor Cyan
    Write-Host "  AD Enabled Users: $($ADUsers.Count)" -ForegroundColor Cyan
    Write-Host "  In Okta Only: $($OktaOnly.Count)" -ForegroundColor Yellow
    Write-Host "  In AD Only: $($ADOnly.Count)" -ForegroundColor Yellow
    Write-Host "  File: $ExportPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Comparison failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-list-api-tokens',
    name: 'List API Tokens',
    category: 'Security Administration',
    description: 'List all API tokens created in the Okta org',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Okta List API Tokens
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    $Uri = "https://$OktaDomain/api/v1/api-tokens"
    $Tokens = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "API Tokens in Okta Org" -ForegroundColor Cyan
    Write-Host ""
    
    $Report = $Tokens | Select-Object \`
        id,
        name,
        @{N='ClientName';E={$_.clientName}},
        @{N='CreatedBy';E={$_.userId}},
        @{N='Created';E={$_.created}},
        @{N='LastUpdated';E={$_.lastUpdated}},
        @{N='ExpiresAt';E={$_.expiresAt}}
    
    $Report | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total API Tokens: $($Tokens.Count)" -ForegroundColor Green
    
    ${exportPath ? `
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list API tokens: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-assign-admin-role',
    name: 'Assign Administrator Role',
    category: 'Security Administration',
    description: 'Assign an administrator role to a user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'roleType', label: 'Admin Role', type: 'select', required: true, options: ['SUPER_ADMIN', 'ORG_ADMIN', 'APP_ADMIN', 'USER_ADMIN', 'HELP_DESK_ADMIN', 'READ_ONLY_ADMIN', 'MOBILE_ADMIN', 'API_ACCESS_MANAGEMENT_ADMIN', 'REPORT_ADMIN'], defaultValue: 'HELP_DESK_ADMIN' }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      const roleType = params.roleType;
      
      return `# Okta Assign Administrator Role
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$RoleType = "${roleType}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    # Get user ID
    $UserUri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    # Assign role
    $Body = @{
        type = $RoleType
    } | ConvertTo-Json
    
    $RoleUri = "https://$OktaDomain/api/v1/users/$($User.id)/roles"
    $Response = Invoke-RestMethod -Uri $RoleUri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Administrator role assigned successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    Write-Host "  Role: $RoleType" -ForegroundColor Cyan
    Write-Host "  Role ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to assign admin role: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-revoke-admin-role',
    name: 'Revoke Administrator Role',
    category: 'Security Administration',
    description: 'Revoke an administrator role from a user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'roleId', label: 'Role Assignment ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      const roleId = escapePowerShellString(params.roleId);
      
      return `# Okta Revoke Administrator Role
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$RoleId = "${roleId}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get user ID
    $UserUri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    # Revoke role
    $RevokeUri = "https://$OktaDomain/api/v1/users/$($User.id)/roles/$RoleId"
    Invoke-RestMethod -Uri $RevokeUri -Method Delete -Headers $Headers
    
    Write-Host "Administrator role revoked successfully!" -ForegroundColor Green
    Write-Host "  User: $UserEmail" -ForegroundColor Cyan
    Write-Host "  Role ID: $RoleId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to revoke admin role: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'okta-list-user-admin-roles',
    name: 'List User Admin Roles',
    category: 'Security Administration',
    description: 'List all administrator roles assigned to a user',
    parameters: [
      { id: 'oktaDomain', label: 'Okta Domain', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true }
    ],
    scriptTemplate: (params) => {
      const oktaDomain = escapePowerShellString(params.oktaDomain);
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Okta List User Administrator Roles
# Generated: ${new Date().toISOString()}

$OktaDomain = "${oktaDomain}"
$UserEmail = "${userEmail}"
$ApiToken = Read-Host -AsSecureString -Prompt "Enter Okta API Token"
$ApiTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))

$Headers = @{
    "Authorization" = "SSWS $ApiTokenPlain"
    "Accept" = "application/json"
}

try {
    # Get user ID
    $UserUri = "https://$OktaDomain/api/v1/users/$UserEmail"
    $User = Invoke-RestMethod -Uri $UserUri -Method Get -Headers $Headers
    
    # Get roles
    $RolesUri = "https://$OktaDomain/api/v1/users/$($User.id)/roles"
    $Roles = Invoke-RestMethod -Uri $RolesUri -Method Get -Headers $Headers
    
    Write-Host "Administrator Roles for: $UserEmail" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Roles.Count -eq 0) {
        Write-Host "No administrator roles assigned." -ForegroundColor Yellow
    } else {
        $Report = $Roles | Select-Object \`
            id,
            type,
            label,
            status,
            @{N='Created';E={$_.created}},
            @{N='LastUpdated';E={$_.lastUpdated}}
        
        $Report | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Total Roles: $($Roles.Count)" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to list admin roles: $_"
}`;
    },
    isPremium: true
  }
];
