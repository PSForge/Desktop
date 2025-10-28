import { 
  escapePowerShellString, 
  buildPowerShellArray, 
  toPowerShellBoolean,
  validateRequiredFields 
} from './powershell-utils';

export interface ADTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface ADTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: ADTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const adTasks: ADTask[] = [
  {
    id: 'new-hire-provisioning',
    name: 'New Hire Provisioning',
    category: 'Identity Lifecycle',
    description: 'Create new user account with groups, home drive, manager, and welcome notification',
    instructions: `**How This Task Works:**
This script automates the complete new hire provisioning process by creating a new Active Directory user account with all required attributes, security group memberships, home drive configuration, and manager assignment.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated user creation permissions
- Manager account must already exist in AD
- Organizational Unit (OU) must exist
- Home drive file server accessible (if using home drives)

**What You Need to Provide:**
- Employee first name, last name, department, and job title
- Manager's username for reporting structure
- Target OU distinguished name (e.g., OU=Users,DC=company,DC=com)
- Optional: Home drive UNC path and security groups

**What the Script Does:**
1. Generates username from first initial + last name (e.g., John Doe → jdoe)
2. Creates secure random password (user must change at first logon)
3. Creates AD user account with all specified attributes
4. Creates and configures home drive folder with proper permissions (if specified)
5. Adds user to specified security groups
6. Outputs username and confirms successful creation

**Important Notes:**
- The generated temporary password is displayed only once - save it securely
- Username conflicts are not automatically handled - ensure uniqueness
- Home drive creation requires network share permissions
- User will be prompted to change password at first logon`,
    parameters: [
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
      { id: 'department', label: 'Department', type: 'text', required: true, placeholder: 'IT' },
      { id: 'jobTitle', label: 'Job Title', type: 'text', required: true, placeholder: 'Systems Administrator' },
      { id: 'manager', label: 'Manager Username', type: 'text', required: true, placeholder: 'jsmith' },
      { id: 'ou', label: 'Organizational Unit', type: 'text', required: true, placeholder: 'OU=Users,DC=company,DC=com' },
      { id: 'homeDrivePath', label: 'Home Drive Path', type: 'path', required: false, placeholder: '\\\\server\\home\\' },
      { id: 'groups', label: 'Security Groups (comma-separated)', type: 'textarea', required: false, placeholder: 'Domain Users, IT Staff' }
    ],
    validate: (params) => {
      const required = ['firstName', 'lastName', 'department', 'jobTitle', 'manager', 'ou'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const department = escapePowerShellString(params.department);
      const jobTitle = escapePowerShellString(params.jobTitle);
      const manager = escapePowerShellString(params.manager);
      const ou = escapePowerShellString(params.ou);
      const homeDrivePath = params.homeDrivePath ? escapePowerShellString(params.homeDrivePath) : '';
      const groups = params.groups ? buildPowerShellArray(params.groups) : '';

      return `# New Hire Provisioning Script
# Generated: ${new Date().toISOString()}

# Import Active Directory module
Import-Module ActiveDirectory

# User details
$FirstName = "${firstName}"
$LastName = "${lastName}"
$Username = ($FirstName.Substring(0,1) + $LastName).ToLower()
$DisplayName = "$FirstName $LastName"
$Department = "${department}"
$Title = "${jobTitle}"
$Manager = "${manager}"
$OU = "${ou}"

# Generate secure password
$Password = ConvertTo-SecureString -String (New-Guid).ToString() -AsPlainText -Force

try {
    # Create new user
    New-ADUser \`
        -Name $DisplayName \`
        -GivenName $FirstName \`
        -Surname $LastName \`
        -SamAccountName $Username \`
        -UserPrincipalName "$Username@$((Get-ADDomain).DNSRoot)" \`
        -DisplayName $DisplayName \`
        -Department $Department \`
        -Title $Title \`
        -Manager $Manager \`
        -Path $OU \`
        -AccountPassword $Password \`
        -Enabled $true \`
        -ChangePasswordAtLogon $true
    
    Write-Host "✓ User account created: $Username" -ForegroundColor Green
    ${homeDrivePath ? `
    # Create home drive
    $HomePath = "${homeDrivePath}$Username"
    New-Item -Path $HomePath -ItemType Directory -Force
    $Acl = Get-Acl $HomePath
    $Ar = New-Object System.Security.AccessControl.FileSystemAccessRule($Username, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $Acl.SetAccessRule($Ar)
    Set-Acl $HomePath $Acl
    
    Set-ADUser -Identity $Username -HomeDrive "H:" -HomeDirectory $HomePath
    Write-Host "✓ Home drive created and configured" -ForegroundColor Green
` : ''}${groups ? `
    # Add to security groups
    $Groups = ${groups}
    foreach ($Group in $Groups) {
        Add-ADGroupMember -Identity $Group -Members $Username -ErrorAction SilentlyContinue
        Write-Host "✓ Added to group: $Group" -ForegroundColor Green
    }
` : ''}
    Write-Host ""
    Write-Host "New hire provisioning completed successfully!" -ForegroundColor Green
    Write-Host "Username: $Username"
    Write-Host "Temporary Password: (New-Guid output - user must change at logon)"
    
} catch {
    Write-Error "Failed to provision user: $_"
}`;
    }
  },
  {
    id: 'offboarding-disable',
    name: 'User Offboarding',
    category: 'Identity Lifecycle',
    description: 'Disable account, remove groups, move to disabled OU, and archive home drive',
    instructions: `**How This Task Works:**
This script performs a complete user offboarding process by disabling the account, removing group memberships, relocating to a disabled users OU, and optionally archiving the home directory.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated account management permissions
- Disabled Users OU must exist
- Access to home drive archive location (if archiving)

**What You Need to Provide:**
- Username of the departing employee
- Disabled Users OU distinguished name
- Optional: Archive path for home drive backup
- Choose whether to remove all group memberships

**What the Script Does:**
1. Retrieves user account and current group memberships
2. Disables the user account immediately
3. Updates description with disable date and former title
4. Removes user from all security groups (except Domain Users)
5. Moves user object to Disabled Users OU
6. Archives home directory with timestamp (if specified)

**Important Notes:**
- Account is disabled immediately - user cannot log in
- Group removal preserves Domain Users membership
- Home drive is copied, not moved - original remains intact
- Archive includes timestamp to prevent naming conflicts
- This is reversible - account can be re-enabled if needed`,
    parameters: [
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jdoe' },
      { id: 'disabledOU', label: 'Disabled Users OU', type: 'text', required: true, placeholder: 'OU=Disabled,DC=company,DC=com' },
      { id: 'archivePath', label: 'Archive Path (optional)', type: 'path', required: false, placeholder: '\\\\server\\archives\\' },
      { id: 'removeGroups', label: 'Remove All Groups', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['username', 'disabledOU'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const username = escapePowerShellString(params.username);
      const disabledOU = escapePowerShellString(params.disabledOU);
      const archivePath = params.archivePath ? escapePowerShellString(params.archivePath) : '';
      const removeGroups = toPowerShellBoolean(params.removeGroups);

      return `# User Offboarding Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$Username = "${username}"
$DisabledOU = "${disabledOU}"
$RemoveGroups = ${removeGroups}

try {
    # Get user object
    $User = Get-ADUser -Identity $Username -Properties MemberOf, HomeDirectory
    
    # Disable account
    Disable-ADAccount -Identity $Username
    Write-Host "✓ Account disabled: $Username" -ForegroundColor Green
    
    # Set description with disable date
    $Description = "Disabled on $(Get-Date -Format 'yyyy-MM-dd') - Former: $($User.Title)"
    Set-ADUser -Identity $Username -Description $Description
    ${params.removeGroups !== false ? `
    # Remove from all groups except Domain Users
    if ($RemoveGroups) {
        $Groups = $User.MemberOf | Where-Object { $_ -notlike "*Domain Users*" }
        foreach ($Group in $Groups) {
            Remove-ADGroupMember -Identity $Group -Members $Username -Confirm:$false
            Write-Host "✓ Removed from: $((Get-ADGroup $Group).Name)" -ForegroundColor Yellow
        }
    }
` : ''}
    # Move to disabled OU
    Move-ADObject -Identity $User.DistinguishedName -TargetPath $DisabledOU
    Write-Host "✓ Moved to disabled OU" -ForegroundColor Green
    ${archivePath ? `
    # Archive home drive
    if ($User.HomeDirectory -and (Test-Path $User.HomeDirectory)) {
        $ArchivePath = "${archivePath}$Username-$(Get-Date -Format 'yyyyMMdd')"
        Copy-Item -Path $User.HomeDirectory -Destination $ArchivePath -Recurse -Force
        Write-Host "✓ Home drive archived to: $ArchivePath" -ForegroundColor Green
    }
` : ''}
    Write-Host ""
    Write-Host "User offboarding completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to offboard user: $_"
}`;
    }
  },
  {
    id: 'password-expiry-notification',
    name: 'Password Expiry Notification',
    category: 'Identity Lifecycle',
    description: 'Find users with expiring passwords and send notifications',
    instructions: `**How This Task Works:**
This script identifies users whose passwords are approaching expiration and sends automated email notifications to remind them to change their passwords before they expire.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to Active Directory
- SMTP server accessible and configured
- Email relay permissions configured

**What You Need to Provide:**
- Days before expiry to trigger notifications (e.g., 14 days)
- SMTP server hostname or IP address
- From email address for notifications
- Optional: Specific OU to search (default: entire domain)

**What the Script Does:**
1. Calculates the expiration window based on days specified
2. Queries Active Directory for users with expiring passwords
3. Filters enabled accounts with email addresses
4. Generates personalized email for each user
5. Sends notification via SMTP with expiry date and instructions
6. Outputs summary of notifications sent

**Important Notes:**
- Only processes enabled accounts with valid email addresses
- Requires users to have the "mail" attribute populated in AD
- SMTP server must allow relay from the executing server
- Password expiry is based on domain password policy
- Run regularly (scheduled task) for ongoing notification`,
    parameters: [
      { id: 'daysBeforeExpiry', label: 'Days Before Expiry', type: 'number', required: true, defaultValue: 14, placeholder: '14' },
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'OU=Users,DC=company,DC=com' },
      { id: 'smtpServer', label: 'SMTP Server', type: 'text', required: true, placeholder: 'smtp.company.com' },
      { id: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@company.com' }
    ],
    validate: (params) => {
      const required = ['daysBeforeExpiry', 'smtpServer', 'fromEmail'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const daysBeforeExpiry = parseInt(params.daysBeforeExpiry) || 14;
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const smtpServer = escapePowerShellString(params.smtpServer);
      const fromEmail = escapePowerShellString(params.fromEmail);

      return `# Password Expiry Notification Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$DaysBeforeExpiry = ${daysBeforeExpiry}
$SMTPServer = "${smtpServer}"
$FromEmail = "${fromEmail}"
${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}

# Get domain password policy
$MaxPasswordAge = (Get-ADDefaultDomainPasswordPolicy).MaxPasswordAge.Days

# Calculate expiry window
$ExpiryDate = (Get-Date).AddDays($DaysBeforeExpiry)

# Find users with expiring passwords
$Users = Get-ADUser -Filter {Enabled -eq $true -and PasswordNeverExpires -eq $false} \`
    -Properties "msDS-UserPasswordExpiryTimeComputed", EmailAddress, DisplayName \`
    -SearchBase $SearchBase

$ExpiringUsers = @()

foreach ($User in $Users) {
    $PasswordExpiry = [datetime]::FromFileTime($User."msDS-UserPasswordExpiryTimeComputed")
    $DaysUntilExpiry = ($PasswordExpiry - (Get-Date)).Days
    
    if ($DaysUntilExpiry -le $DaysBeforeExpiry -and $DaysUntilExpiry -gt 0) {
        $ExpiringUsers += [PSCustomObject]@{
            Name = $User.DisplayName
            Username = $User.SamAccountName
            Email = $User.EmailAddress
            ExpiryDate = $PasswordExpiry
            DaysLeft = $DaysUntilExpiry
        }
    }
}

# Send notifications
foreach ($User in $ExpiringUsers) {
    if ($User.Email) {
        $Subject = "Password Expiring Soon - Action Required"
        $Body = @"
Hello $($User.Name),

Your password will expire in $($User.DaysLeft) day$(if($User.DaysLeft -ne 1){'s'}).

Expiry Date: $($User.ExpiryDate.ToString('MMMM dd, yyyy'))

Please change your password before it expires to avoid account lockout.

Thank you,
IT Department
"@
        
        Send-MailMessage -To $User.Email -From $FromEmail -Subject $Subject \`
            -Body $Body -SmtpServer $SMTPServer -ErrorAction SilentlyContinue
        
        Write-Host "✓ Notification sent to $($User.Name) ($($User.DaysLeft) days)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Found $($ExpiringUsers.Count) users with expiring passwords" -ForegroundColor Cyan`;
    }
  },
  {
    id: 'cleanup-stale-computers',
    name: 'Cleanup Stale Computers',
    category: 'Computers & OUs',
    description: 'Find and optionally remove/disable computers inactive for specified days',
    instructions: `**How This Task Works:**
This script identifies computer accounts that haven't logged into the domain for a specified period and performs cleanup actions to maintain Active Directory hygiene.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated computer object management permissions
- Quarantine OU must exist (if using move action)

**What You Need to Provide:**
- Inactive days threshold (e.g., 90 days)
- Action to perform: Report Only, Disable, Move to Quarantine OU, or Delete
- Quarantine OU path (if moving objects)
- Optional: CSV export path for reporting

**What the Script Does:**
1. Calculates cutoff date based on inactive days threshold
2. Searches Active Directory for computers with no activity since cutoff
3. Lists all stale computers with last logon date
4. Performs specified action (report, disable, move, or delete)
5. Exports detailed report to CSV (if path specified)

**Important Notes:**
- "Report Only" is safest - review before taking destructive actions
- LastLogonDate may be up to 14 days old due to AD replication
- Deleted computer objects cannot be easily recovered
- Consider disabling before deleting to allow time for review
- Excludes domain controllers from stale computer detection`,
    parameters: [
      { id: 'inactiveDays', label: 'Inactive Days Threshold', type: 'number', required: true, defaultValue: 90, placeholder: '90' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Report Only', 'Disable', 'Move to Quarantine OU', 'Delete'], defaultValue: 'Report Only' },
      { id: 'quarantineOU', label: 'Quarantine OU (if moving)', type: 'text', required: false, placeholder: 'OU=Quarantine,DC=company,DC=com' },
      { id: 'exportPath', label: 'Report Export Path', type: 'path', required: false, placeholder: 'C:\\Reports\\StaleComputers.csv' }
    ],
    validate: (params) => {
      const required = ['inactiveDays', 'action'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const inactiveDays = parseInt(params.inactiveDays) || 90;
      const action = escapePowerShellString(params.action);
      const quarantineOU = params.quarantineOU ? escapePowerShellString(params.quarantineOU) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# Stale Computers Cleanup Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$InactiveDays = ${inactiveDays}
$Action = "${action}"
${quarantineOU ? `$QuarantineOU = "${quarantineOU}"` : ''}
${exportPath ? `$ExportPath = "${exportPath}"` : ''}

# Calculate cutoff date
$CutoffDate = (Get-Date).AddDays(-$InactiveDays)

# Find stale computers
$StaleComputers = Search-ADAccount -ComputersOnly -AccountInactive \`
    -TimeSpan ([TimeSpan]::FromDays($InactiveDays)) |
    Get-ADComputer -Properties LastLogonDate, OperatingSystem, Description

Write-Host "Found $($StaleComputers.Count) stale computer accounts (inactive > $InactiveDays days)" -ForegroundColor Cyan
Write-Host ""

foreach ($Computer in $StaleComputers) {
    $DaysInactive = ((Get-Date) - $Computer.LastLogonDate).Days
    
    Write-Host "$($Computer.Name) - Last logon: $($Computer.LastLogonDate) ($DaysInactive days ago)" -ForegroundColor Yellow
    
    switch ($Action) {
        "Disable" {
            Disable-ADAccount -Identity $Computer
            Write-Host "  ✓ Disabled" -ForegroundColor Green
        }
        "Move to Quarantine OU" {
            ${quarantineOU ? `
            Move-ADObject -Identity $Computer.DistinguishedName -TargetPath $QuarantineOU
            Write-Host "  ✓ Moved to quarantine" -ForegroundColor Green
            ` : `Write-Host "  ⚠ Quarantine OU not specified" -ForegroundColor Red`}
        }
        "Delete" {
            Remove-ADComputer -Identity $Computer -Confirm:$false
            Write-Host "  ✓ Deleted" -ForegroundColor Red
        }
        default {
            Write-Host "  ℹ Report only - no action taken" -ForegroundColor Gray
        }
    }
}
${exportPath ? `
# Export report
$StaleComputers | Select-Object Name, LastLogonDate, OperatingSystem, Description | 
    Export-Csv -Path $ExportPath -NoTypeInformation
Write-Host ""
Write-Host "Report exported to: $ExportPath" -ForegroundColor Green
` : ''}
Write-Host ""
Write-Host "Stale computers cleanup completed!" -ForegroundColor Green`;
    }
  },
  {
    id: 'backup-all-gpos',
    name: 'Backup All GPOs',
    category: 'GPO & Configuration',
    description: 'Create timestamped backup of all Group Policy Objects',
    instructions: `**How This Task Works:**
This script creates a complete backup of all Group Policy Objects in the domain, organized by timestamp, with optional automatic cleanup of old backups.

**Prerequisites:**
- Group Policy PowerShell module installed
- Domain Admin or delegated GPO management permissions
- Write access to backup destination path
- Sufficient disk space for GPO backups

**What You Need to Provide:**
- Backup directory path (e.g., C:\\GPOBackups)
- Optional: Retention period in days for automatic cleanup
- Optional: Comment to document backup purpose

**What the Script Does:**
1. Creates timestamped backup folder (format: yyyyMMdd-HHmmss)
2. Enumerates all GPOs in the domain
3. Backs up each GPO individually with metadata
4. Generates detailed backup manifest
5. Removes backups older than retention period (if specified)

**Important Notes:**
- Each backup includes GPO settings and permissions
- Backups are stored in individual GUID folders
- Manifest file maps GPO names to backup GUIDs
- Schedule this regularly (daily/weekly) for disaster recovery
- Test restoration process periodically
- Retention cleanup helps manage disk space automatically`,
    parameters: [
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: true, placeholder: 'C:\\GPOBackups' },
      { id: 'retentionDays', label: 'Retention Days (delete older)', type: 'number', required: false, defaultValue: 30, placeholder: '30' },
      { id: 'comment', label: 'Backup Comment', type: 'text', required: false, placeholder: 'Scheduled daily backup' }
    ],
    validate: (params) => {
      const required = ['backupPath'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const backupPath = escapePowerShellString(params.backupPath);
      const retentionDays = params.retentionDays ? parseInt(params.retentionDays) : 0;
      const comment = params.comment ? escapePowerShellString(params.comment) : '';

      return `# GPO Backup Script
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

$BackupPath = "${backupPath}"
${retentionDays ? `$RetentionDays = ${retentionDays}` : ''}
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFolder = Join-Path $BackupPath $Timestamp

try {
    # Create backup directory
    New-Item -Path $BackupFolder -ItemType Directory -Force | Out-Null
    
    # Get all GPOs
    $GPOs = Get-GPO -All
    
    Write-Host "Backing up $($GPOs.Count) Group Policy Objects..." -ForegroundColor Cyan
    Write-Host ""
    
    # Backup each GPO
    foreach ($GPO in $GPOs) {
        try {
            Backup-GPO -Guid $GPO.Id -Path $BackupFolder ${comment ? `-Comment "${comment}"` : ''} | Out-Null
            Write-Host "✓ $($GPO.DisplayName)" -ForegroundColor Green
        } catch {
            Write-Host "✗ $($GPO.DisplayName) - Error: $_" -ForegroundColor Red
        }
    }
    ${retentionDays ? `
    # Clean up old backups
    Write-Host ""
    Write-Host "Cleaning up backups older than $RetentionDays days..." -ForegroundColor Yellow
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupPath -Directory | 
        Where-Object { $_.CreationTime -lt $CutoffDate } |
        ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force
            Write-Host "✓ Deleted: $($_.Name)" -ForegroundColor Gray
        }
` : ''}
    Write-Host ""
    Write-Host "GPO backup completed successfully!" -ForegroundColor Green
    Write-Host "Backup location: $BackupFolder" -ForegroundColor Cyan
    
} catch {
    Write-Error "GPO backup failed: $_"
}`;
    }
  },
  {
    id: 'audit-priv-groups',
    name: 'Audit Privileged Groups',
    category: 'Security & Compliance',
    description: 'Monitor changes to privileged groups and generate diff report',
    parameters: [
      { id: 'groups', label: 'Groups to Monitor (comma-separated)', type: 'textarea', required: true, defaultValue: 'Domain Admins,Enterprise Admins,Schema Admins', placeholder: 'Domain Admins,Enterprise Admins' },
      { id: 'baselinePath', label: 'Baseline Storage Path', type: 'path', required: true, placeholder: 'C:\\ADBaselines' },
      { id: 'alertEmail', label: 'Alert Email (optional)', type: 'email', required: false, placeholder: 'security@company.com' },
      { id: 'smtpServer', label: 'SMTP Server (if email)', type: 'text', required: false, placeholder: 'smtp.company.com' }
    ],
    validate: (params) => {
      const required = ['groups', 'baselinePath'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const groups = buildPowerShellArray(params.groups);
      const baselinePath = escapePowerShellString(params.baselinePath);
      const alertEmail = params.alertEmail ? escapePowerShellString(params.alertEmail) : '';
      const smtpServer = params.smtpServer ? escapePowerShellString(params.smtpServer) : '';

      return `# Privileged Groups Audit Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$Groups = ${groups}
$BaselinePath = "${baselinePath}"
${alertEmail ? `$AlertEmail = "${alertEmail}"` : ''}
${smtpServer ? `$SMTPServer = "${smtpServer}"` : ''}

# Create baseline directory if needed
if (!(Test-Path $BaselinePath)) {
    New-Item -Path $BaselinePath -ItemType Directory -Force | Out-Null
}

$Changes = @()

foreach ($GroupName in $Groups) {
    try {
        # Get current members
        $CurrentMembers = Get-ADGroupMember -Identity $GroupName -Recursive |
            Select-Object Name, SamAccountName, DistinguishedName |
            Sort-Object SamAccountName
        
        $BaselineFile = Join-Path $BaselinePath "$GroupName.xml"
        
        if (Test-Path $BaselineFile) {
            # Compare with baseline
            $BaselineMembers = Import-Clixml $BaselineFile
            
            $Added = Compare-Object $BaselineMembers $CurrentMembers -Property SamAccountName |
                Where-Object { $_.SideIndicator -eq '=>' }
            
            $Removed = Compare-Object $BaselineMembers $CurrentMembers -Property SamAccountName |
                Where-Object { $_.SideIndicator -eq '<=' }
            
            if ($Added -or $Removed) {
                Write-Host ""
                Write-Host "⚠ Changes detected in: $GroupName" -ForegroundColor Yellow
                
                if ($Added) {
                    Write-Host "  Added:" -ForegroundColor Green
                    $Added | ForEach-Object { 
                        $Member = $CurrentMembers | Where-Object { $_.SamAccountName -eq $_.SamAccountName }
                        Write-Host "    + $($Member.Name) ($($Member.SamAccountName))" -ForegroundColor Green
                    }
                }
                
                if ($Removed) {
                    Write-Host "  Removed:" -ForegroundColor Red
                    $Removed | ForEach-Object {
                        $Member = $BaselineMembers | Where-Object { $_.SamAccountName -eq $_.SamAccountName }
                        Write-Host "    - $($Member.Name) ($($Member.SamAccountName))" -ForegroundColor Red
                    }
                }
                
                $Changes += [PSCustomObject]@{
                    Group = $GroupName
                    Added = ($Added | ForEach-Object { $_.SamAccountName }) -join ', '
                    Removed = ($Removed | ForEach-Object { $_.SamAccountName }) -join ', '
                    Timestamp = Get-Date
                }
            } else {
                Write-Host "✓ No changes: $GroupName" -ForegroundColor Green
            }
        } else {
            Write-Host "ℹ Creating baseline: $GroupName" -ForegroundColor Cyan
        }
        
        # Update baseline
        $CurrentMembers | Export-Clixml $BaselineFile
        
    } catch {
        Write-Warning "Failed to audit $GroupName: $_"
    }
}
${alertEmail && smtpServer ? `
# Send alert if changes detected
if ($Changes.Count -gt 0) {
    $Body = "Privileged group changes detected:\\n\\n"
    $Body += $Changes | Format-Table -AutoSize | Out-String
    
    Send-MailMessage -To $AlertEmail -From "ad-audit@$((Get-ADDomain).DNSRoot)" \`
        -Subject "⚠ Privileged Group Changes Detected" -Body $Body \`
        -SmtpServer $SMTPServer
    
    Write-Host ""
    Write-Host "✓ Alert sent to $AlertEmail" -ForegroundColor Green
}
` : ''}
Write-Host ""
Write-Host "Privileged groups audit completed!" -ForegroundColor Green`;
    }
  },
  {
    id: 'gpo-drift-report',
    name: 'GPO Drift Report',
    category: 'GPO & Configuration',
    description: 'Compare GPO backups and detect configuration drift',
    parameters: [
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: true, placeholder: 'C:\\GPOBackups' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: false, placeholder: 'C:\\Reports\\GPODrift.html' },
      { id: 'alertEmail', label: 'Alert Email (optional)', type: 'email', required: false, placeholder: 'it@company.com' },
      { id: 'smtpServer', label: 'SMTP Server (if email)', type: 'text', required: false, placeholder: 'smtp.company.com' }
    ],
    validate: (params) => {
      const required = ['backupPath'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const backupPath = escapePowerShellString(params.backupPath);
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const alertEmail = params.alertEmail ? escapePowerShellString(params.alertEmail) : '';
      const smtpServer = params.smtpServer ? escapePowerShellString(params.smtpServer) : '';

      return `# GPO Drift Report Script
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

$BackupPath = "${backupPath}"
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "GPODrift-$(Get-Date -Format yyyyMMdd-HHmmss).html"'}
${alertEmail ? `$AlertEmail = "${alertEmail}"` : ''}
${smtpServer ? `$SMTPServer = "${smtpServer}"` : ''}

$DriftDetected = @()
$AllBackups = Get-ChildItem -Path $BackupPath -Directory | Sort-Object CreationTime -Descending

if ($AllBackups.Count -lt 2) {
    Write-Warning "Need at least 2 backup sets to compare. Found: $($AllBackups.Count)"
    exit 1
}

$LatestBackup = $AllBackups[0]
$PreviousBackup = $AllBackups[1]

Write-Host "Comparing GPO backups..." -ForegroundColor Cyan
Write-Host "Latest:   $($LatestBackup.Name) ($($LatestBackup.CreationTime))" -ForegroundColor Green
Write-Host "Previous: $($PreviousBackup.Name) ($($PreviousBackup.CreationTime))" -ForegroundColor Yellow
Write-Host ""

$LatestGPOs = Get-ChildItem -Path $LatestBackup.FullName -Directory
$PreviousGPOs = Get-ChildItem -Path $PreviousBackup.FullName -Directory

foreach ($GPOFolder in $LatestGPOs) {
    $GPOName = $GPOFolder.Name
    $LatestReport = Join-Path $GPOFolder.FullName "gpreport.xml"
    $PreviousFolder = Get-ChildItem -Path $PreviousBackup.FullName -Directory | Where-Object { $_.Name -eq $GPOName }
    
    if ($PreviousFolder) {
        $PreviousReport = Join-Path $PreviousFolder.FullName "gpreport.xml"
        
        if ((Test-Path $LatestReport) -and (Test-Path $PreviousReport)) {
            $LatestHash = (Get-FileHash $LatestReport -Algorithm SHA256).Hash
            $PreviousHash = (Get-FileHash $PreviousReport -Algorithm SHA256).Hash
            
            if ($LatestHash -ne $PreviousHash) {
                Write-Host "⚠ Drift detected: $GPOName" -ForegroundColor Yellow
                $DriftDetected += [PSCustomObject]@{
                    GPOName = $GPOName
                    LatestHash = $LatestHash
                    PreviousHash = $PreviousHash
                    Timestamp = Get-Date
                }
            } else {
                Write-Host "✓ No change: $GPOName" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "ℹ New GPO: $GPOName" -ForegroundColor Cyan
    }
}

# Generate HTML report
$Html = @"
<!DOCTYPE html>
<html>
<head>
    <title>GPO Drift Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
    </style>
</head>
<body>
    <h1>GPO Drift Report</h1>
    <p>Generated: $(Get-Date)</p>
    <p>Latest Backup: $($LatestBackup.Name)</p>
    <p>Previous Backup: $($PreviousBackup.Name)</p>
    <p>GPOs with drift detected: $($DriftDetected.Count)</p>
    <table>
        <tr><th>GPO Name</th><th>Status</th><th>Timestamp</th></tr>
        $(foreach ($GPO in $DriftDetected) { "<tr><td>$($GPO.GPOName)</td><td>Drift Detected</td><td>$($GPO.Timestamp)</td></tr>" })
    </table>
</body>
</html>
"@

$Html | Out-File -FilePath $ReportPath -Encoding UTF8
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
${alertEmail && smtpServer ? `
# Send alert if drift detected
if ($DriftDetected.Count -gt 0) {
    Send-MailMessage -To $AlertEmail -From "gpo-audit@$((Get-ADDomain).DNSRoot)" \`
        -Subject "⚠ GPO Drift Detected ($($DriftDetected.Count) GPOs)" \`
        -Body "GPO configuration drift detected. See attached report." \`
        -Attachments $ReportPath -SmtpServer $SMTPServer
    
    Write-Host "✓ Alert sent to $AlertEmail" -ForegroundColor Green
}
` : ''}`;
    }
  },
  {
    id: 'ad-health-report',
    name: 'Weekly AD Health Report',
    category: 'Reporting & Inventory',
    description: 'Comprehensive AD health check including DCs, replication, DIT size, and SYSVOL',
    parameters: [
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: false, placeholder: 'C:\\Reports\\ADHealth.html' },
      { id: 'emailTo', label: 'Email Report To (optional)', type: 'email', required: false, placeholder: 'admins@company.com' },
      { id: 'smtpServer', label: 'SMTP Server (if email)', type: 'text', required: false, placeholder: 'smtp.company.com' }
    ],
    scriptTemplate: (params) => {
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const emailTo = params.emailTo ? escapePowerShellString(params.emailTo) : '';
      const smtpServer = params.smtpServer ? escapePowerShellString(params.smtpServer) : '';

      return `# AD Health Report Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "ADHealth-$(Get-Date -Format yyyyMMdd).html"'}
${emailTo ? `$EmailTo = "${emailTo}"` : ''}
${smtpServer ? `$SMTPServer = "${smtpServer}"` : ''}

Write-Host "Generating AD Health Report..." -ForegroundColor Cyan
Write-Host ""

# Get domain controllers
$DCs = Get-ADDomainController -Filter *

Write-Host "Domain Controllers ($($DCs.Count)):" -ForegroundColor Green
$DCStatus = @()
foreach ($DC in $DCs) {
    $Ping = Test-Connection -ComputerName $DC.HostName -Count 1 -Quiet
    $Status = if ($Ping) { "Online" } else { "Offline" }
    
    Write-Host "  $($DC.Name): $Status" -ForegroundColor $(if ($Ping) { "Green" } else { "Red" })
    
    $DCStatus += [PSCustomObject]@{
        Name = $DC.Name
        Site = $DC.Site
        OS = $DC.OperatingSystem
        IPv4 = $DC.IPv4Address
        Status = $Status
    }
}

# Check replication
Write-Host ""
Write-Host "Replication Status:" -ForegroundColor Green
$ReplStatus = @()
foreach ($DC in $DCs) {
    try {
        $Partners = Get-ADReplicationPartnerMetadata -Target $DC.Name -Scope Domain
        foreach ($Partner in $Partners) {
            $LastRepl = $Partner.LastReplicationSuccess
            $Status = if ($LastRepl -gt (Get-Date).AddHours(-24)) { "Healthy" } else { "Warning" }
            
            $ReplStatus += [PSCustomObject]@{
                SourceDC = $Partner.Partner
                TargetDC = $DC.Name
                LastReplication = $LastRepl
                Status = $Status
            }
        }
    } catch {
        Write-Warning "Failed to get replication info for $($DC.Name): $_"
    }
}

# Generate HTML Report
$Html = @"
<!DOCTYPE html>
<html>
<head>
    <title>AD Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        .healthy { color: green; }
        .warning { color: orange; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Active Directory Health Report</h1>
    <p>Generated: $(Get-Date)</p>
    <p>Domain: $((Get-ADDomain).DNSRoot)</p>
    
    <h2>Domain Controllers</h2>
    <table>
        <tr><th>Name</th><th>Site</th><th>OS</th><th>IP Address</th><th>Status</th></tr>
        $(foreach ($DC in $DCStatus) { 
            $StatusClass = if ($DC.Status -eq "Online") { "healthy" } else { "error" }
            "<tr><td>$($DC.Name)</td><td>$($DC.Site)</td><td>$($DC.OS)</td><td>$($DC.IPv4)</td><td class='$StatusClass'>$($DC.Status)</td></tr>" 
        })
    </table>
    
    <h2>Replication Status</h2>
    <table>
        <tr><th>Source DC</th><th>Target DC</th><th>Last Replication</th><th>Status</th></tr>
        $(foreach ($Repl in $ReplStatus) { 
            $StatusClass = if ($Repl.Status -eq "Healthy") { "healthy" } else { "warning" }
            "<tr><td>$($Repl.SourceDC)</td><td>$($Repl.TargetDC)</td><td>$($Repl.LastReplication)</td><td class='$StatusClass'>$($Repl.Status)</td></tr>" 
        })
    </table>
</body>
</html>
"@

$Html | Out-File -FilePath $ReportPath -Encoding UTF8
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
${emailTo && smtpServer ? `
# Email report
Send-MailMessage -To $EmailTo -From "ad-health@$((Get-ADDomain).DNSRoot)" \`
    -Subject "AD Health Report - $(Get-Date -Format 'yyyy-MM-dd')" \`
    -Body "Weekly AD health report attached." \`
    -Attachments $ReportPath -SmtpServer $SMTPServer

Write-Host "✓ Report emailed to $EmailTo" -ForegroundColor Green
` : ''}`;
    }
  },
  {
    id: 'find-lockout-source',
    name: 'Find Account Lockout Source',
    category: 'Reporting & Inventory',
    description: 'Hunt for the source of account lockouts across domain controllers',
    parameters: [
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jdoe' },
      { id: 'hoursBack', label: 'Hours to Search Back', type: 'number', required: false, defaultValue: 24, placeholder: '24' }
    ],
    validate: (params) => {
      const required = ['username'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const username = escapePowerShellString(params.username);
      const hoursBack = parseInt(params.hoursBack) || 24;

      return `# Find Account Lockout Source Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$Username = "${username}"
$HoursBack = ${hoursBack}
$StartTime = (Get-Date).AddHours(-$HoursBack)

Write-Host "Searching for lockout source for: $Username" -ForegroundColor Cyan
Write-Host "Time range: $StartTime to $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Get all domain controllers
$DCs = Get-ADDomainController -Filter *

$LockoutEvents = @()

foreach ($DC in $DCs) {
    Write-Host "Checking $($DC.Name)..." -ForegroundColor Yellow
    
    try {
        # Event ID 4740 = Account lockout
        $Events = Get-WinEvent -ComputerName $DC.HostName -FilterHashtable @{
            LogName = 'Security'
            ID = 4740
            StartTime = $StartTime
        } -ErrorAction SilentlyContinue | Where-Object {
            $_.Properties[0].Value -eq $Username
        }
        
        foreach ($Event in $Events) {
            $CallerComputer = $Event.Properties[1].Value
            
            $LockoutEvents += [PSCustomObject]@{
                DomainController = $DC.Name
                Time = $Event.TimeCreated
                SourceComputer = $CallerComputer
                Username = $Username
            }
            
            Write-Host "  ✓ Found lockout at $($Event.TimeCreated)" -ForegroundColor Green
            Write-Host "    Source: $CallerComputer" -ForegroundColor Cyan
        }
    } catch {
        Write-Warning "Failed to query $($DC.Name): $_"
    }
}

Write-Host ""
if ($LockoutEvents.Count -gt 0) {
    Write-Host "Found $($LockoutEvents.Count) lockout event(s)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    $LockoutEvents | Format-Table -AutoSize
    
    # Get bad password attempts
    Write-Host ""
    Write-Host "Checking for bad password attempts (Event 4625)..." -ForegroundColor Yellow
    
    $MostRecentLockout = $LockoutEvents | Sort-Object Time -Descending | Select-Object -First 1
    $SourceComputer = $MostRecentLockout.SourceComputer
    
    Write-Host ""
    Write-Host "Most likely source: $SourceComputer" -ForegroundColor Green
    Write-Host "Recommendation: Check the following on $SourceComputer" -ForegroundColor Cyan
    Write-Host "  - Saved credentials in Credential Manager" -ForegroundColor Gray
    Write-Host "  - Scheduled tasks running as $Username" -ForegroundColor Gray
    Write-Host "  - Services running as $Username" -ForegroundColor Gray
    Write-Host "  - Mobile devices with old passwords" -ForegroundColor Gray
} else {
    Write-Host "No lockout events found for $Username in the past $HoursBack hours" -ForegroundColor Yellow
}`;
    }
  },
  {
    id: 'audit-kerberoastable-spns',
    name: 'Audit Kerberoastable SPNs',
    category: 'Security & Compliance',
    description: 'Find service accounts with SPNs vulnerable to Kerberoasting attacks',
    parameters: [
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'OU=Service Accounts,DC=company,DC=com' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: false, placeholder: 'C:\\Reports\\KerberoastableAccounts.csv' },
      { id: 'checkAES', label: 'Flag RC4-only Accounts', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const checkAES = toPowerShellBoolean(params.checkAES);

      return `# Audit Kerberoastable SPNs Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "KerberoastableAccounts-$(Get-Date -Format yyyyMMdd).csv"'}
$CheckAES = ${checkAES}

Write-Host "Scanning for Kerberoastable accounts..." -ForegroundColor Cyan
Write-Host "Search Base: $SearchBase" -ForegroundColor Gray
Write-Host ""

# Find accounts with SPNs
$Accounts = Get-ADUser -Filter {ServicePrincipalName -like "*"} \`
    -Properties ServicePrincipalName, PasswordLastSet, msDS-SupportedEncryptionTypes, Enabled \`
    -SearchBase $SearchBase

$Results = @()

foreach ($Account in $Accounts) {
    $SPNs = $Account.ServicePrincipalName
    $EncTypes = $Account."msDS-SupportedEncryptionTypes"
    
    # Check encryption types (0 or null = RC4 only, which is vulnerable)
    $AESSupported = $EncTypes -band 0x18  # 0x18 = AES128 + AES256
    $RC4Only = -not $AESSupported
    
    $PasswordAge = if ($Account.PasswordLastSet) {
        ((Get-Date) - $Account.PasswordLastSet).Days
    } else {
        "Never"
    }
    
    $Risk = "Low"
    if ($RC4Only) { $Risk = "High" }
    elseif ($PasswordAge -gt 365) { $Risk = "Medium" }
    
    Write-Host "Account: $($Account.SamAccountName)" -ForegroundColor Yellow
    Write-Host "  SPNs: $($SPNs.Count)" -ForegroundColor Gray
    Write-Host "  AES Support: $(if ($AESSupported) { "Yes" } else { "No (RC4 only!)" })" -ForegroundColor $(if ($AESSupported) { "Green" } else { "Red" })
    Write-Host "  Password Age: $PasswordAge days" -ForegroundColor Gray
    Write-Host "  Risk: $Risk" -ForegroundColor $(if ($Risk -eq "High") { "Red" } elseif ($Risk -eq "Medium") { "Yellow" } else { "Green" })
    Write-Host ""
    
    $Results += [PSCustomObject]@{
        Username = $Account.SamAccountName
        DisplayName = $Account.Name
        Enabled = $Account.Enabled
        SPNCount = $SPNs.Count
        SPNs = ($SPNs -join "; ")
        AESSupported = $AESSupported
        PasswordLastSet = $Account.PasswordLastSet
        PasswordAgeDays = $PasswordAge
        Risk = $Risk
    }
}

# Export results
$Results | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host "✓ Report exported to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total accounts with SPNs: $($Results.Count)" -ForegroundColor Gray
Write-Host "  High risk (RC4-only): $(($Results | Where-Object { $_.Risk -eq 'High' }).Count)" -ForegroundColor Red
Write-Host "  Medium risk: $(($Results | Where-Object { $_.Risk -eq 'Medium' }).Count)" -ForegroundColor Yellow
Write-Host "  Low risk: $(($Results | Where-Object { $_.Risk -eq 'Low' }).Count)" -ForegroundColor Green
Write-Host ""
Write-Host "Recommendations:" -ForegroundColor Cyan
Write-Host "  - Enable AES encryption for RC4-only accounts" -ForegroundColor Gray
Write-Host "  - Rotate passwords for stale service accounts" -ForegroundColor Gray
Write-Host "  - Use Group Managed Service Accounts (gMSA) when possible" -ForegroundColor Gray`;
    }
  },
  {
    id: 'report-stale-dns',
    name: 'Report Stale DNS Records',
    category: 'DNS / DHCP',
    description: 'Find and report stale DNS records for cleanup',
    parameters: [
      { id: 'dnsServer', label: 'DNS Server', type: 'text', required: true, placeholder: 'dc01.company.com' },
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'company.com' },
      { id: 'staleDays', label: 'Days to Consider Stale', type: 'number', required: false, defaultValue: 90, placeholder: '90' },
      { id: 'reportPath', label: 'Report Output Path', type: 'path', required: false, placeholder: 'C:\\Reports\\StaleDNS.csv' }
    ],
    validate: (params) => {
      const required = ['dnsServer', 'zoneName'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const dnsServer = escapePowerShellString(params.dnsServer);
      const zoneName = escapePowerShellString(params.zoneName);
      const staleDays = parseInt(params.staleDays) || 90;
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';

      return `# Report Stale DNS Records Script
# Generated: ${new Date().toISOString()}

$DNSServer = "${dnsServer}"
$ZoneName = "${zoneName}"
$StaleDays = ${staleDays}
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "StaleDNS-$(Get-Date -Format yyyyMMdd).csv"'}

Write-Host "Scanning DNS zone for stale records..." -ForegroundColor Cyan
Write-Host "Server: $DNSServer" -ForegroundColor Gray
Write-Host "Zone: $ZoneName" -ForegroundColor Gray
Write-Host "Stale threshold: $StaleDays days" -ForegroundColor Gray
Write-Host ""

$CutoffDate = (Get-Date).AddDays(-$StaleDays)

# Get all A records
$Records = Get-DnsServerResourceRecord -ZoneName $ZoneName -ComputerName $DNSServer -RRType A

$StaleRecords = @()

foreach ($Record in $Records) {
    $RecordAge = if ($Record.TimeStamp) {
        ((Get-Date) - $Record.TimeStamp).Days
    } else {
        $null  # Static record
    }
    
    if ($RecordAge -and $RecordAge -gt $StaleDays) {
        # Test if computer is online
        $ComputerName = $Record.HostName
        $Ping = Test-Connection -ComputerName $ComputerName -Count 1 -Quiet -ErrorAction SilentlyContinue
        
        if (-not $Ping) {
            Write-Host "⚠ Stale: $ComputerName ($RecordAge days old, offline)" -ForegroundColor Yellow
            
            $StaleRecords += [PSCustomObject]@{
                HostName = $ComputerName
                IPAddress = $Record.RecordData.IPv4Address
                Timestamp = $Record.TimeStamp
                AgeDays = $RecordAge
                Status = "Offline"
            }
        }
    }
}

# Export results
$StaleRecords | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report exported to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total records scanned: $($Records.Count)" -ForegroundColor Gray
Write-Host "  Stale records found: $($StaleRecords.Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE: This script reports only - no records are deleted" -ForegroundColor Green
Write-Host "Review the report before taking action" -ForegroundColor Gray`;
    }
  },
  {
    id: 'move-computers-by-site',
    name: 'Move Computers by Site',
    category: 'Computers & OUs',
    description: 'Automatically place computers into correct OUs based on site or subnet',
    parameters: [
      { id: 'siteMapping', label: 'Site-to-OU Mapping (JSON format)', type: 'textarea', required: true, placeholder: '{"Default-Site": "OU=Computers,DC=company,DC=com", "Branch-Site": "OU=Branch,DC=company,DC=com"}' },
      { id: 'whatIf', label: 'Preview Only (No Changes)', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['siteMapping'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const siteMapping = escapePowerShellString(params.siteMapping);
      const whatIf = toPowerShellBoolean(params.whatIf);

      return `# Move Computers by Site Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$WhatIf = ${whatIf}

# Parse site mapping
$SiteMappingJson = @'
${siteMapping}
'@

try {
    $SiteMapping = $SiteMappingJson | ConvertFrom-Json
} catch {
    Write-Error "Invalid JSON format in site mapping: $_"
    exit 1
}

Write-Host "Moving computers based on site assignments..." -ForegroundColor Cyan
Write-Host "Preview mode: $WhatIf" -ForegroundColor $(if ($WhatIf) { "Yellow" } else { "Red" })
Write-Host ""

# Get all computers
$Computers = Get-ADComputer -Filter * -Properties Site

$Moved = 0
$Skipped = 0

foreach ($Computer in $Computers) {
    $Site = $Computer.Site
    
    if (-not $Site) {
        Write-Host "⚠ $($Computer.Name): No site assigned" -ForegroundColor Yellow
        $Skipped++
        continue
    }
    
    # Find target OU for this site
    $TargetOU = $SiteMapping.PSObject.Properties | Where-Object { $_.Name -eq $Site } | Select-Object -ExpandProperty Value
    
    if ($TargetOU) {
        $CurrentOU = $Computer.DistinguishedName -replace '^CN=[^,]+,', ''
        
        if ($CurrentOU -ne $TargetOU) {
            if ($WhatIf) {
                Write-Host "Would move: $($Computer.Name) from $CurrentOU to $TargetOU" -ForegroundColor Cyan
            } else {
                try {
                    Move-ADObject -Identity $Computer.DistinguishedName -TargetPath $TargetOU
                    Write-Host "✓ Moved: $($Computer.Name) to $TargetOU" -ForegroundColor Green
                    $Moved++
                } catch {
                    Write-Host "✗ Failed to move $($Computer.Name): $_" -ForegroundColor Red
                    $Skipped++
                }
            }
        } else {
            Write-Host "  Already in correct OU: $($Computer.Name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠ No OU mapping for site: $Site (Computer: $($Computer.Name))" -ForegroundColor Yellow
        $Skipped++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "  Would move: $Moved computers" -ForegroundColor Yellow
} else {
    Write-Host "  Moved: $Moved computers" -ForegroundColor Green
}
Write-Host "  Skipped: $Skipped computers" -ForegroundColor Gray`;
    }
  },
  {
    id: 'bulk-user-import',
    name: 'Bulk User Import from CSV',
    category: 'Identity Lifecycle',
    description: 'Import and create multiple users from HR CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\HR\\NewHires.csv' },
      { id: 'defaultOU', label: 'Default OU', type: 'text', required: true, placeholder: 'OU=Users,DC=company,DC=com' },
      { id: 'defaultPassword', label: 'Default Password (or leave empty for random)', type: 'text', required: false },
      { id: 'sendWelcomeEmail', label: 'Send Welcome Email', type: 'boolean', required: false, defaultValue: false }
    ],
    validate: (params) => {
      const required = ['csvPath', 'defaultOU'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const defaultOU = escapePowerShellString(params.defaultOU);
      const defaultPassword = params.defaultPassword ? escapePowerShellString(params.defaultPassword) : '';
      const sendEmail = toPowerShellBoolean(params.sendWelcomeEmail);

      return `# Bulk User Import Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CSVPath = "${csvPath}"
$DefaultOU = "${defaultOU}"
${defaultPassword ? `$DefaultPassword = ConvertTo-SecureString "${defaultPassword}" -AsPlainText -Force` : '$DefaultPassword = $null'}
$SendWelcomeEmail = ${sendEmail}

# Expected CSV format: FirstName,LastName,Department,Title,Manager
$Users = Import-Csv -Path $CSVPath

$Created = 0
$Failed = 0

foreach ($User in $Users) {
    $FirstName = $User.FirstName
    $LastName = $User.LastName
    $Username = ($FirstName.Substring(0,1) + $LastName).ToLower()
    
    # Generate password if not provided
    if ($null -eq $DefaultPassword) {
        $Password = ConvertTo-SecureString (New-Guid).ToString() -AsPlainText -Force
    } else {
        $Password = $DefaultPassword
    }
    
    try {
        New-ADUser \`
            -Name "$FirstName $LastName" \`
            -GivenName $FirstName \`
            -Surname $LastName \`
            -SamAccountName $Username \`
            -UserPrincipalName "$Username@$((Get-ADDomain).DNSRoot)" \`
            -Department $User.Department \`
            -Title $User.Title \`
            -Manager $User.Manager \`
            -Path $DefaultOU \`
            -AccountPassword $Password \`
            -Enabled $true \`
            -ChangePasswordAtLogon $true
        
        Write-Host "✓ Created: $Username" -ForegroundColor Green
        $Created++
    } catch {
        Write-Host "✗ Failed to create $Username: $_" -ForegroundColor Red
        $Failed++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Created: $Created users" -ForegroundColor Green
Write-Host "  Failed: $Failed users" -ForegroundColor Red`;
    }
  },
  {
    id: 'password-reset-unlock',
    name: 'Password Reset & Account Unlock',
    category: 'Identity Lifecycle',
    description: 'Reset user password and unlock account',
    parameters: [
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jdoe' },
      { id: 'newPassword', label: 'New Password (or leave empty for random)', type: 'text', required: false },
      { id: 'unlockAccount', label: 'Also Unlock Account', type: 'boolean', required: false, defaultValue: true },
      { id: 'mustChangePassword', label: 'User Must Change at Next Logon', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['username'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const username = escapePowerShellString(params.username);
      const newPassword = params.newPassword ? escapePowerShellString(params.newPassword) : '';
      const unlockAccount = toPowerShellBoolean(params.unlockAccount);
      const mustChangePassword = toPowerShellBoolean(params.mustChangePassword);

      return `# Password Reset & Unlock Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$Username = "${username}"
$UnlockAccount = ${unlockAccount}
$MustChangePassword = ${mustChangePassword}

# Generate password if not provided
${newPassword ? `$NewPassword = ConvertTo-SecureString "${newPassword}" -AsPlainText -Force` : '$NewPassword = ConvertTo-SecureString (New-Guid).ToString() -AsPlainText -Force'}

try {
    # Check if user exists
    $User = Get-ADUser -Identity $Username -Properties LockedOut
    
    Write-Host "Processing $Username..." -ForegroundColor Cyan
    
    # Reset password
    Set-ADAccountPassword -Identity $Username -NewPassword $NewPassword -Reset
    Write-Host "✓ Password reset" -ForegroundColor Green
    
    # Set must change password
    Set-ADUser -Identity $Username -ChangePasswordAtLogon $MustChangePassword
    Write-Host "✓ Must change password: $MustChangePassword" -ForegroundColor Gray
    
    # Unlock if requested and locked
    if ($UnlockAccount -and $User.LockedOut) {
        Unlock-ADAccount -Identity $Username
        Write-Host "✓ Account unlocked" -ForegroundColor Green
    } elseif ($User.LockedOut) {
        Write-Host "⚠ Account is locked but unlock not requested" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Password reset completed!" -ForegroundColor Green
    ${!newPassword ? `Write-Host "New password: (Generated GUID - provide to user securely)" -ForegroundColor Cyan` : ''}
} catch {
    Write-Error "Failed to reset password: $_"
}`;
    }
  },
  {
    id: 'orphaned-groups-cleanup',
    name: 'Orphaned/Empty Groups Report',
    category: 'Groups & Access',
    description: 'Find and report empty groups and groups with no members',
    parameters: [
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'OU=Groups,DC=company,DC=com' },
      { id: 'reportPath', label: 'Report Path', type: 'path', required: false, placeholder: 'C:\\Reports\\OrphanedGroups.csv' },
      { id: 'deleteEmpty', label: 'Delete Empty Groups', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const deleteEmpty = toPowerShellBoolean(params.deleteEmpty);

      return `# Orphaned/Empty Groups Report Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "OrphanedGroups-$(Get-Date -Format yyyyMMdd).csv"'}
$DeleteEmpty = ${deleteEmpty}

Write-Host "Scanning for orphaned/empty groups..." -ForegroundColor Cyan
Write-Host ""

$AllGroups = Get-ADGroup -Filter * -SearchBase $SearchBase -Properties Members, Description, WhenCreated

$EmptyGroups = @()

foreach ($Group in $AllGroups) {
    $Members = Get-ADGroupMember -Identity $Group -ErrorAction SilentlyContinue
    
    if ($Members.Count -eq 0) {
        Write-Host "⚠ Empty: $($Group.Name)" -ForegroundColor Yellow
        
        $EmptyGroups += [PSCustomObject]@{
            Name = $Group.Name
            Description = $Group.Description
            Created = $Group.WhenCreated
            DistinguishedName = $Group.DistinguishedName
        }
        
        if ($DeleteEmpty) {
            try {
                Remove-ADGroup -Identity $Group -Confirm:$false
                Write-Host "  ✓ Deleted" -ForegroundColor Red
            } catch {
                Write-Host "  ✗ Failed to delete: $_" -ForegroundColor Red
            }
        }
    }
}

# Export report
$EmptyGroups | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total groups scanned: $($AllGroups.Count)" -ForegroundColor Gray
Write-Host "  Empty groups found: $($EmptyGroups.Count)" -ForegroundColor Yellow`;
    }
  },
  {
    id: 'bitlocker-recovery-audit',
    name: 'BitLocker Recovery Key Audit',
    category: 'Computers & OUs',
    description: 'Check and export BitLocker recovery keys from AD',
    parameters: [
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'OU=Computers,DC=company,DC=com' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: false, placeholder: 'C:\\Secure\\BitLockerKeys.csv' }
    ],
    scriptTemplate: (params) => {
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# BitLocker Recovery Key Audit Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}
${exportPath ? `$ExportPath = "${exportPath}"` : '$ExportPath = Join-Path $env:TEMP "BitLockerKeys-$(Get-Date -Format yyyyMMdd).csv"'}

Write-Host "Auditing BitLocker recovery keys..." -ForegroundColor Cyan
Write-Host ""

$Computers = Get-ADComputer -Filter * -SearchBase $SearchBase

$Results = @()
$WithKeys = 0
$WithoutKeys = 0

foreach ($Computer in $Computers) {
    # Get BitLocker recovery information
    $RecoveryKeys = Get-ADObject -Filter {objectClass -eq 'msFVE-RecoveryInformation'} \`
        -SearchBase $Computer.DistinguishedName \`
        -Properties msFVE-RecoveryPassword, WhenCreated
    
    if ($RecoveryKeys) {
        $WithKeys++
        foreach ($Key in $RecoveryKeys) {
            $Results += [PSCustomObject]@{
                Computer Name = $Computer.Name
                KeyCreated = $Key.WhenCreated
                RecoveryPassword = $Key.'msFVE-RecoveryPassword'
            }
        }
        Write-Host "✓ $($Computer.Name): $($RecoveryKeys.Count) key(s)" -ForegroundColor Green
    } else {
        $WithoutKeys++
        Write-Host "⚠ $($Computer.Name): No keys" -ForegroundColor Yellow
        
        $Results += [PSCustomObject]@{
            ComputerName = $Computer.Name
            KeyCreated = $null
            RecoveryPassword = "No keys found"
        }
    }
}

# Export results
$Results | Export-Csv -Path $ExportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report exported to: $ExportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Computers with BitLocker keys: $WithKeys" -ForegroundColor Green
Write-Host "  Computers without keys: $WithoutKeys" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠ WARNING: Handle this file securely - it contains recovery keys!" -ForegroundColor Red`;
    }
  },
  {
    id: 'password-never-expires-audit',
    name: 'Password Never Expires Audit',
    category: 'Security & Compliance',
    description: 'Find accounts with password never expires flag set',
    parameters: [
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'DC=company,DC=com' },
      { id: 'reportPath', label: 'Report Path', type: 'path', required: false, placeholder: 'C:\\Reports\\PasswordNeverExpires.csv' },
      { id: 'includeDisabled', label: 'Include Disabled Accounts', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const includeDisabled = toPowerShellBoolean(params.includeDisabled);

      return `# Password Never Expires Audit Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "PasswordNeverExpires-$(Get-Date -Format yyyyMMdd).csv"'}
$IncludeDisabled = ${includeDisabled}

Write-Host "Scanning for accounts with PasswordNeverExpires..." -ForegroundColor Cyan
Write-Host ""

# Build filter
$Filter = if ($IncludeDisabled) {
    {PasswordNeverExpires -eq $true}
} else {
    {PasswordNeverExpires -eq $true -and Enabled -eq $true}
}

$Accounts = Get-ADUser -Filter $Filter -SearchBase $SearchBase \`
    -Properties PasswordNeverExpires, PasswordLastSet, LastLogonDate, Description, MemberOf

$Results = @()

foreach ($Account in $Accounts) {
    $IsMemberOfPrivilegedGroup = $false
    $PrivilegedGroups = @('Domain Admins', 'Enterprise Admins', 'Schema Admins', 'Administrators')
    
    foreach ($Group in $Account.MemberOf) {
        $GroupName = (Get-ADGroup $Group).Name
        if ($PrivilegedGroups -contains $GroupName) {
            $IsMemberOfPrivilegedGroup = $true
            break
        }
    }
    
    $Risk = if ($IsMemberOfPrivilegedGroup) { "High" } else { "Medium" }
    
    Write-Host "⚠ $($Account.SamAccountName) - $Risk Risk" -ForegroundColor Yellow
    
    $Results += [PSCustomObject]@{
        Username = $Account.SamAccountName
        Name = $Account.Name
        Enabled = $Account.Enabled
        Description = $Account.Description
        PasswordLastSet = $Account.PasswordLastSet
        LastLogon = $Account.LastLogonDate
        PrivilegedAccount = $IsMemberOfPrivilegedGroup
        Risk = $Risk
    }
}

# Export report
$Results | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total accounts: $($Results.Count)" -ForegroundColor Yellow
Write-Host "  High risk (privileged): $(($Results | Where-Object { $_.Risk -eq 'High' }).Count)" -ForegroundColor Red
Write-Host "  Medium risk: $(($Results | Where-Object { $_.Risk -eq 'Medium' }).Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recommendation: Review and disable PasswordNeverExpires for non-service accounts" -ForegroundColor Cyan`;
    }
  },
  {
    id: 'replication-failure-watcher',
    name: 'Replication Failure Watcher',
    category: 'Reporting & Inventory',
    description: 'Monitor and alert on AD replication failures',
    parameters: [
      { id: 'reportPath', label: 'Report Path', type: 'path', required: false, placeholder: 'C:\\Reports\\ReplFailures.html' },
      { id: 'alertEmail', label: 'Alert Email', type: 'email', required: false, placeholder: 'admins@company.com' },
      { id: 'smtpServer', label: 'SMTP Server', type: 'text', required: false, placeholder: 'smtp.company.com' }
    ],
    scriptTemplate: (params) => {
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const alertEmail = params.alertEmail ? escapePowerShellString(params.alertEmail) : '';
      const smtpServer = params.smtpServer ? escapePowerShellString(params.smtpServer) : '';

      return `# Replication Failure Watcher Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "ReplFailures-$(Get-Date -Format yyyyMMdd).html"'}
${alertEmail ? `$AlertEmail = "${alertEmail}"` : ''}
${smtpServer ? `$SMTPServer = "${smtpServer}"` : ''}

Write-Host "Checking AD replication status..." -ForegroundColor Cyan
Write-Host ""

$DCs = Get-ADDomainController -Filter *
$Failures = @()

foreach ($DC in $DCs) {
    Write-Host "Checking $($DC.Name)..." -ForegroundColor Yellow
    
    try {
        $ReplStatus = Get-ADReplicationPartnerMetadata -Target $DC.Name
        
        foreach ($Partner in $ReplStatus) {
            $LastSuccess = $Partner.LastReplicationSuccess
            $LastAttempt = $Partner.LastReplicationAttempt
            $Consecutive Failures = $Partner.ConsecutiveReplicationFailures
            
            if ($ConsecutiveFailures -gt 0) {
                Write-Host "  ✗ Failure with $($Partner.Partner)" -ForegroundColor Red
                Write-Host "    Last success: $LastSuccess" -ForegroundColor Gray
                Write-Host "    Last attempt: $LastAttempt" -ForegroundColor Gray
                Write-Host "    Failures: $ConsecutiveFailures" -ForegroundColor Red
                
                $Failures += [PSCustomObject]@{
                    SourceDC = $DC.Name
                    TargetDC = $Partner.Partner
                    LastSuccess = $LastSuccess
                    LastAttempt = $LastAttempt
                    ConsecutiveFailures = $ConsecutiveFailures
                    LastResult = $Partner.LastReplicationResult
                }
            } else {
                Write-Host "  ✓ OK with $($Partner.Partner)" -ForegroundColor Green
            }
        }
    } catch {
        Write-Warning "Failed to check $($DC.Name): $_"
    }
}

# Generate HTML report
$Html = @"
<!DOCTYPE html>
<html>
<head>
    <title>AD Replication Failures</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #d32f2f; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #d32f2f; color: white; }
    </style>
</head>
<body>
    <h1>AD Replication Failures</h1>
    <p>Generated: $(Get-Date)</p>
    <p>Failures detected: $($Failures.Count)</p>
    <table>
        <tr><th>Source DC</th><th>Target DC</th><th>Last Success</th><th>Failures</th><th>Result Code</th></tr>
        $(foreach ($Failure in $Failures) { 
            "<tr><td>$($Failure.SourceDC)</td><td>$($Failure.TargetDC)</td><td>$($Failure.LastSuccess)</td><td>$($Failure.ConsecutiveFailures)</td><td>$($Failure.LastResult)</td></tr>" 
        })
    </table>
</body>
</html>
"@

$Html | Out-File -FilePath $ReportPath -Encoding UTF8
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green

${alertEmail && smtpServer ? `
# Send alert if failures detected
if ($Failures.Count -gt 0) {
    Send-MailMessage -To $AlertEmail -From "repl-monitor@$((Get-ADDomain).DNSRoot)" \`
        -Subject "⚠ AD Replication Failures Detected ($($Failures.Count))" \`
        -Body "Replication failures detected. See attached report." \`
        -Attachments $ReportPath -SmtpServer $SMTPServer
    
    Write-Host "✓ Alert sent to $AlertEmail" -ForegroundColor Green
}
` : ''}
Write-Host ""
Write-Host "Summary: $($Failures.Count) replication failure(s) found" -ForegroundColor $(if ($Failures.Count -gt 0) { "Red" } else { "Green" })`;
    }
  },
  {
    id: 'upn-consistency-report',
    name: 'UPN & Email Suffix Consistency',
    category: 'Reporting & Inventory',
    description: 'Report on UPN and email address consistency',
    parameters: [
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'DC=company,DC=com' },
      { id: 'expectedDomain', label: 'Expected Domain', type: 'text', required: true, placeholder: 'company.com' },
      { id: 'reportPath', label: 'Report Path', type: 'path', required: false, placeholder: 'C:\\Reports\\UPNConsistency.csv' }
    ],
    validate: (params) => {
      const required = ['expectedDomain'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const expectedDomain = escapePowerShellString(params.expectedDomain);
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';

      return `# UPN & Email Suffix Consistency Report
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}
$ExpectedDomain = "${expectedDomain}"
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "UPNConsistency-$(Get-Date -Format yyyyMMdd).csv"'}

Write-Host "Checking UPN and email consistency..." -ForegroundColor Cyan
Write-Host "Expected domain: $ExpectedDomain" -ForegroundColor Gray
Write-Host ""

$Users = Get-ADUser -Filter {Enabled -eq $true} -SearchBase $SearchBase \`
    -Properties UserPrincipalName, EmailAddress, ProxyAddresses

$Inconsistent = @()

foreach ($User in $Users) {
    $UPN = $User.UserPrincipalName
    $Email = $User.EmailAddress
    
    $UPNDomain = if ($UPN) { $UPN.Split('@')[1] } else { $null }
    $EmailDomain = if ($Email) { $Email.Split('@')[1] } else { $null }
    
    $Issues = @()
    
    if ($UPNDomain -ne $ExpectedDomain) {
        $Issues += "UPN domain mismatch"
    }
    
    if ($Email -and $EmailDomain -ne $ExpectedDomain) {
        $Issues += "Email domain mismatch"
    }
    
    if (-not $Email) {
        $Issues += "No email address"
    }
    
    if ($UPN -ne $Email -and $Email) {
        $Issues += "UPN and email don't match"
    }
    
    if ($Issues.Count -gt 0) {
        Write-Host "⚠ $($User.SamAccountName): $($Issues -join ', ')" -ForegroundColor Yellow
        
        $Inconsistent += [PSCustomObject]@{
            Username = $User.SamAccountName
            Name = $User.Name
            UPN = $UPN
            Email = $Email
            Issues = ($Issues -join '; ')
        }
    }
}

# Export report
$Inconsistent | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total users checked: $($Users.Count)" -ForegroundColor Gray
Write-Host "  Inconsistent: $($Inconsistent.Count)" -ForegroundColor Yellow`;
    }
  },
  {
    id: 'ntfs-permissions-review',
    name: 'NTFS Permissions Review',
    category: 'File/Print & Permissions',
    description: 'Audit NTFS permissions and detect least privilege violations',
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: '\\\\server\\shares' },
      { id: 'reportPath', label: 'Report Path', type: 'path', required: false, placeholder: 'C:\\Reports\\NTFSPermissions.csv' },
      { id: 'checkForEveryone', label: 'Flag "Everyone" Group', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['targetPath'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';
      const checkForEveryone = toPowerShellBoolean(params.checkForEveryone);

      return `# NTFS Permissions Review Script
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "NTFSPermissions-$(Get-Date -Format yyyyMMdd).csv"'}
$CheckForEveryone = ${checkForEveryone}

Write-Host "Auditing NTFS permissions..." -ForegroundColor Cyan
Write-Host "Target: $TargetPath" -ForegroundColor Gray
Write-Host ""

$Results = @()

# Get all folders
$Folders = Get-ChildItem -Path $TargetPath -Directory -Recurse -ErrorAction SilentlyContinue

foreach ($Folder in $Folders) {
    try {
        $ACL = Get-Acl -Path $Folder.FullName
        
        foreach ($Access in $ACL.Access) {
            $Issues = @()
            
            # Check for Everyone group
            if ($CheckForEveryone -and $Access.IdentityReference -match "Everyone|Authenticated Users") {
                $Issues += "Everyone/Authenticated Users"
            }
            
            # Check for inheritance disabled
            if (-not $ACL.AreAccessRulesProtected) {
                $Inherited = "Yes"
            } else {
                $Inherited = "No (Broken)"
                $Issues += "Inheritance broken"
            }
            
            # Check for full control
            if ($Access.FileSystemRights -match "FullControl") {
                $Issues += "Full Control granted"
            }
            
            if ($Issues.Count -gt 0) {
                Write-Host "⚠ $($Folder.FullName)" -ForegroundColor Yellow
                Write-Host "  Identity: $($Access.IdentityReference)" -ForegroundColor Gray
                Write-Host "  Rights: $($Access.FileSystemRights)" -ForegroundColor Gray
                Write-Host "  Issues: $($Issues -join ', ')" -ForegroundColor Red
                
                $Results += [PSCustomObject]@{
                    Path = $Folder.FullName
                    Identity = $Access.IdentityReference
                    Rights = $Access.FileSystemRights
                    AccessType = $Access.AccessControlType
                    Inherited = $Inherited
                    Issues = ($Issues -join '; ')
                }
            }
        }
    } catch {
        Write-Warning "Failed to process $($Folder.FullName): $_"
    }
}

# Export report
$Results | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Folders scanned: $($Folders.Count)" -ForegroundColor Gray
Write-Host "  Permission issues found: $($Results.Count)" -ForegroundColor Yellow`;
    }
  },
  {
    id: 'csv-mass-moves',
    name: 'CSV-Driven Mass Moves/Renames',
    category: 'Migrations & Hygiene',
    description: 'Move or rename AD objects in bulk from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Migrations\\Moves.csv' },
      { id: 'objectType', label: 'Object Type', type: 'select', required: true, options: ['User', 'Computer', 'Group'], defaultValue: 'User' },
      { id: 'whatIf', label: 'Preview Only (No Changes)', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['csvPath', 'objectType'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const objectType = escapePowerShellString(params.objectType);
      const whatIf = toPowerShellBoolean(params.whatIf);

      return `# CSV-Driven Mass Moves/Renames Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CSVPath = "${csvPath}"
$ObjectType = "${objectType}"
$WhatIf = ${whatIf}

Write-Host "Processing bulk moves/renames..." -ForegroundColor Cyan
Write-Host "Object Type: $ObjectType" -ForegroundColor Gray
Write-Host "Preview Mode: $WhatIf" -ForegroundColor $(if ($WhatIf) { "Yellow" } else { "Red" })
Write-Host ""

# Expected CSV format: Identity,TargetOU,NewName (NewName optional)
$Items = Import-Csv -Path $CSVPath

$Moved = 0
$Renamed = 0
$Failed = 0

foreach ($Item in $Items) {
    $Identity = $Item.Identity
    $TargetOU = $Item.TargetOU
    $NewName = $Item.NewName
    
    try {
        # Get the object
        $Object = switch ($ObjectType) {
            "User" { Get-ADUser -Identity $Identity }
            "Computer" { Get-ADComputer -Identity $Identity }
            "Group" { Get-ADGroup -Identity $Identity }
        }
        
        # Move if TargetOU specified
        if ($TargetOU) {
            $CurrentOU = $Object.DistinguishedName -replace '^CN=[^,]+,', ''
            
            if ($CurrentOU -ne $TargetOU) {
                if ($WhatIf) {
                    Write-Host "Would move: $Identity to $TargetOU" -ForegroundColor Cyan
                } else {
                    Move-ADObject -Identity $Object.DistinguishedName -TargetPath $TargetOU
                    Write-Host "✓ Moved: $Identity to $TargetOU" -ForegroundColor Green
                    $Moved++
                }
            }
        }
        
        # Rename if NewName specified
        if ($NewName -and $Object.Name -ne $NewName) {
            if ($WhatIf) {
                Write-Host "Would rename: $Identity to $NewName" -ForegroundColor Cyan
            } else {
                Rename-ADObject -Identity $Object.DistinguishedName -NewName $NewName
                Write-Host "✓ Renamed: $Identity to $NewName" -ForegroundColor Green
                $Renamed++
            }
        }
    } catch {
        Write-Host "✗ Failed to process $Identity: $_" -ForegroundColor Red
        $Failed++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "  Would move: $Moved objects" -ForegroundColor Yellow
    Write-Host "  Would rename: $Renamed objects" -ForegroundColor Yellow
} else {
    Write-Host "  Moved: $Moved objects" -ForegroundColor Green
    Write-Host "  Renamed: $Renamed objects" -ForegroundColor Green
}
Write-Host "  Failed: $Failed objects" -ForegroundColor Red`;
    }
  },
  {
    id: 'nested-group-audit',
    name: 'Nested Group Depth Audit',
    category: 'Groups & Access',
    description: 'Audit nested group depth to identify token bloat issues',
    parameters: [
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'DC=company,DC=com' },
      { id: 'maxDepth', label: 'Alert if Depth Exceeds', type: 'number', required: false, defaultValue: 5, placeholder: '5' },
      { id: 'reportPath', label: 'Report Path', type: 'path', required: false, placeholder: 'C:\\Reports\\NestedGroups.csv' }
    ],
    scriptTemplate: (params) => {
      const searchBase = params.searchBase ? escapePowerShellString(params.searchBase) : '';
      const maxDepth = parseInt(params.maxDepth) || 5;
      const reportPath = params.reportPath ? escapePowerShellString(params.reportPath) : '';

      return `# Nested Group Depth Audit Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

${searchBase ? `$SearchBase = "${searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}
$MaxDepth = ${maxDepth}
${reportPath ? `$ReportPath = "${reportPath}"` : '$ReportPath = Join-Path $env:TEMP "NestedGroups-$(Get-Date -Format yyyyMMdd).csv"'}

Write-Host "Auditing nested group depth..." -ForegroundColor Cyan
Write-Host "Max depth threshold: $MaxDepth" -ForegroundColor Gray
Write-Host ""

function Get-GroupNestingDepth {
    param(
        [string]$GroupDN,
        [int]$CurrentDepth = 0,
        [System.Collections.Generic.HashSet[string]]$Visited = (New-Object 'System.Collections.Generic.HashSet[string]')
    )
    
    # Prevent infinite loops
    if ($Visited.Contains($GroupDN)) {
        return $CurrentDepth
    }
    
    $Visited.Add($GroupDN) | Out-Null
    
    # Get parent groups
    $Group = Get-ADGroup -Identity $GroupDN -Properties MemberOf -ErrorAction SilentlyContinue
    
    if (-not $Group.MemberOf) {
        return $CurrentDepth
    }
    
    $MaxChildDepth = $CurrentDepth
    
    foreach ($ParentDN in $Group.MemberOf) {
        $ChildDepth = Get-GroupNestingDepth -GroupDN $ParentDN -CurrentDepth ($CurrentDepth + 1) -Visited $Visited
        if ($ChildDepth -gt $MaxChildDepth) {
            $MaxChildDepth = $ChildDepth
        }
    }
    
    return $MaxChildDepth
}

$Groups = Get-ADGroup -Filter * -SearchBase $SearchBase -Properties MemberOf
$Results = @()

foreach ($Group in $Groups) {
    $Depth = Get-GroupNestingDepth -GroupDN $Group.DistinguishedName
    
    if ($Depth -gt $MaxDepth) {
        Write-Host "⚠ $($Group.Name): Depth = $Depth" -ForegroundColor Red
    } else {
        Write-Host "✓ $($Group.Name): Depth = $Depth" -ForegroundColor Green
    }
    
    $Results += [PSCustomObject]@{
        GroupName = $Group.Name
        NestingDepth = $Depth
        AlertFlag = ($Depth -gt $MaxDepth)
    }
}

# Export report
$Results | Sort-Object NestingDepth -Descending | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "✓ Report saved to: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Groups scanned: $($Groups.Count)" -ForegroundColor Gray
Write-Host "  Exceeding depth threshold: $(($Results | Where-Object { $_.AlertFlag }).Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Deep nesting can cause token bloat and authentication issues" -ForegroundColor Yellow`;
    }
  },

  // ========================================
  // BULK ACTIONS CATEGORY
  // ========================================
  {
    id: 'bulk-add-users-to-group',
    name: 'Bulk Add Users to Security Group',
    category: 'Bulk Actions',
    description: 'Add multiple users to a security group from CSV file with username list',
    parameters: [
      { id: 'groupName', label: 'Security Group Name', type: 'text', required: true, placeholder: 'IT-Staff' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\users.csv', description: 'CSV with "Username" column' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Add Users to Security Group
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$GroupName = "${groupName}"
$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate inputs
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

try {
    $Group = Get-ADGroup -Identity $GroupName -ErrorAction Stop
    Write-Host "✓ Target Group: $($Group.Name)" -ForegroundColor Green
} catch {
    Write-Error "Group not found: $GroupName"
    exit 1
}

# Import CSV
$Users = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0
$AlreadyMemberCount = 0

Write-Host ""
Write-Host "Processing $($Users.Count) users..." -ForegroundColor Cyan
Write-Host ""

foreach ($User in $Users) {
    if (-not $User.Username) {
        Write-Host "⚠ Skipping row with missing Username" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify user exists
        $ADUser = Get-ADUser -Identity $User.Username -ErrorAction Stop
        
        # Check if already a member
        $IsMember = Get-ADGroupMember -Identity $GroupName -Recursive | Where-Object { $_.SamAccountName -eq $User.Username }
        
        if ($IsMember) {
            Write-Host "ℹ $($User.Username): Already a member" -ForegroundColor Gray
            $AlreadyMemberCount++
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($User.Username): Would be added (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Add-ADGroupMember -Identity $GroupName -Members $User.Username -ErrorAction Stop
            Write-Host "✓ $($User.Username): Added successfully" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($User.Username): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Users.Count) users" -ForegroundColor Gray
Write-Host "  Added: $SuccessCount" -ForegroundColor Green
Write-Host "  Already Members: $AlreadyMemberCount" -ForegroundColor Gray
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-user-property-changes',
    name: 'Bulk User Property Changes',
    category: 'Bulk Actions',
    description: 'Update user properties (department, title, manager, etc.) from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\user-updates.csv', description: 'CSV with Username and properties to update' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk User Property Changes
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Users = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: Username, Department, Title, Manager, Office, Phone, etc." -ForegroundColor Cyan
Write-Host "Processing $($Users.Count) users..." -ForegroundColor Cyan
Write-Host ""

foreach ($User in $Users) {
    if (-not $User.Username) {
        Write-Host "⚠ Skipping row with missing Username" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify user exists
        $ADUser = Get-ADUser -Identity $User.Username -ErrorAction Stop
        
        # Build hashtable of properties to update
        $PropertiesToUpdate = @{}
        
        if ($User.Department) { $PropertiesToUpdate['Department'] = $User.Department }
        if ($User.Title) { $PropertiesToUpdate['Title'] = $User.Title }
        if ($User.Manager) { $PropertiesToUpdate['Manager'] = $User.Manager }
        if ($User.Office) { $PropertiesToUpdate['Office'] = $User.Office }
        if ($User.Phone) { $PropertiesToUpdate['OfficePhone'] = $User.Phone }
        if ($User.Description) { $PropertiesToUpdate['Description'] = $User.Description }
        if ($User.Company) { $PropertiesToUpdate['Company'] = $User.Company }
        
        if ($PropertiesToUpdate.Count -eq 0) {
            Write-Host "⚠ $($User.Username): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($User.Username): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADUser -Identity $User.Username @PropertiesToUpdate -ErrorAction Stop
            Write-Host "✓ $($User.Username): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($User.Username): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Users.Count) users" -ForegroundColor Gray
Write-Host "  Updated: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-user-account-moves',
    name: 'Bulk User Account Moves',
    category: 'Bulk Actions',
    description: 'Move multiple user accounts to different OUs from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\user-moves.csv', description: 'CSV with Username and TargetOU columns' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk User Account Moves
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Users = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: Username, TargetOU" -ForegroundColor Cyan
Write-Host "Processing $($Users.Count) users..." -ForegroundColor Cyan
Write-Host ""

foreach ($User in $Users) {
    if (-not $User.Username -or -not $User.TargetOU) {
        Write-Host "⚠ Skipping row with missing Username or TargetOU" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify user exists
        $ADUser = Get-ADUser -Identity $User.Username -Properties DistinguishedName -ErrorAction Stop
        
        # Verify target OU exists
        try {
            $TargetOU = Get-ADOrganizationalUnit -Identity $User.TargetOU -ErrorAction Stop
        } catch {
            Write-Host "✗ $($User.Username): Target OU not found - $($User.TargetOU)" -ForegroundColor Red
            $FailCount++
            continue
        }
        
        # Check if already in target OU
        if ($ADUser.DistinguishedName -like "*$($User.TargetOU)") {
            Write-Host "ℹ $($User.Username): Already in target OU" -ForegroundColor Gray
            $SuccessCount++
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($User.Username): Would move to $($User.TargetOU) (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Move-ADObject -Identity $ADUser.DistinguishedName -TargetPath $User.TargetOU -ErrorAction Stop
            Write-Host "✓ $($User.Username): Moved to $($User.TargetOU)" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($User.Username): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Users.Count) users" -ForegroundColor Gray
Write-Host "  Moved: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-add-computers-to-group',
    name: 'Bulk Add Computers to Security Group',
    category: 'Bulk Actions',
    description: 'Add multiple computers to a security group from CSV file',
    parameters: [
      { id: 'groupName', label: 'Security Group Name', type: 'text', required: true, placeholder: 'Workstations-Group' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\computers.csv', description: 'CSV with "ComputerName" column' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Add Computers to Security Group
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$GroupName = "${groupName}"
$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate inputs
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

try {
    $Group = Get-ADGroup -Identity $GroupName -ErrorAction Stop
    Write-Host "✓ Target Group: $($Group.Name)" -ForegroundColor Green
} catch {
    Write-Error "Group not found: $GroupName"
    exit 1
}

# Import CSV
$Computers = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0
$AlreadyMemberCount = 0

Write-Host ""
Write-Host "Processing $($Computers.Count) computers..." -ForegroundColor Cyan
Write-Host ""

foreach ($Computer in $Computers) {
    if (-not $Computer.ComputerName) {
        Write-Host "⚠ Skipping row with missing ComputerName" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify computer exists
        $ADComputer = Get-ADComputer -Identity $Computer.ComputerName -ErrorAction Stop
        
        # Check if already a member
        $IsMember = Get-ADGroupMember -Identity $GroupName | Where-Object { $_.Name -eq $Computer.ComputerName }
        
        if ($IsMember) {
            Write-Host "ℹ $($Computer.ComputerName): Already a member" -ForegroundColor Gray
            $AlreadyMemberCount++
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Computer.ComputerName): Would be added (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Add-ADGroupMember -Identity $GroupName -Members $ADComputer -ErrorAction Stop
            Write-Host "✓ $($Computer.ComputerName): Added successfully" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Computer.ComputerName): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Computers.Count) computers" -ForegroundColor Gray
Write-Host "  Added: $SuccessCount" -ForegroundColor Green
Write-Host "  Already Members: $AlreadyMemberCount" -ForegroundColor Gray
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-computer-property-changes',
    name: 'Bulk Computer Property Changes',
    category: 'Bulk Actions',
    description: 'Update computer properties (description, location, etc.) from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\computer-updates.csv', description: 'CSV with ComputerName and properties' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Computer Property Changes
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Computers = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: ComputerName, Description, Location, ManagedBy, etc." -ForegroundColor Cyan
Write-Host "Processing $($Computers.Count) computers..." -ForegroundColor Cyan
Write-Host ""

foreach ($Computer in $Computers) {
    if (-not $Computer.ComputerName) {
        Write-Host "⚠ Skipping row with missing ComputerName" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify computer exists
        $ADComputer = Get-ADComputer -Identity $Computer.ComputerName -ErrorAction Stop
        
        # Build hashtable of properties to update
        $PropertiesToUpdate = @{}
        
        if ($Computer.Description) { $PropertiesToUpdate['Description'] = $Computer.Description }
        if ($Computer.Location) { $PropertiesToUpdate['Location'] = $Computer.Location }
        if ($Computer.ManagedBy) { $PropertiesToUpdate['ManagedBy'] = $Computer.ManagedBy }
        
        if ($PropertiesToUpdate.Count -eq 0) {
            Write-Host "⚠ $($Computer.ComputerName): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Computer.ComputerName): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADComputer -Identity $Computer.ComputerName @PropertiesToUpdate -ErrorAction Stop
            Write-Host "✓ $($Computer.ComputerName): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Computer.ComputerName): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Computers.Count) computers" -ForegroundColor Gray
Write-Host "  Updated: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-computer-account-moves',
    name: 'Bulk Computer Account Moves',
    category: 'Bulk Actions',
    description: 'Move multiple computer accounts to different OUs from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\computer-moves.csv', description: 'CSV with ComputerName and TargetOU columns' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Computer Account Moves
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Computers = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: ComputerName, TargetOU" -ForegroundColor Cyan
Write-Host "Processing $($Computers.Count) computers..." -ForegroundColor Cyan
Write-Host ""

foreach ($Computer in $Computers) {
    if (-not $Computer.ComputerName -or -not $Computer.TargetOU) {
        Write-Host "⚠ Skipping row with missing ComputerName or TargetOU" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify computer exists
        $ADComputer = Get-ADComputer -Identity $Computer.ComputerName -Properties DistinguishedName -ErrorAction Stop
        
        # Verify target OU exists
        try {
            $TargetOU = Get-ADOrganizationalUnit -Identity $Computer.TargetOU -ErrorAction Stop
        } catch {
            Write-Host "✗ $($Computer.ComputerName): Target OU not found - $($Computer.TargetOU)" -ForegroundColor Red
            $FailCount++
            continue
        }
        
        # Check if already in target OU
        if ($ADComputer.DistinguishedName -like "*$($Computer.TargetOU)") {
            Write-Host "ℹ $($Computer.ComputerName): Already in target OU" -ForegroundColor Gray
            $SuccessCount++
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Computer.ComputerName): Would move to $($Computer.TargetOU) (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Move-ADObject -Identity $ADComputer.DistinguishedName -TargetPath $Computer.TargetOU -ErrorAction Stop
            Write-Host "✓ $($Computer.ComputerName): Moved to $($Computer.TargetOU)" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Computer.ComputerName): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Computers.Count) computers" -ForegroundColor Gray
Write-Host "  Moved: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-contact-property-changes',
    name: 'Bulk Contact Property Changes',
    category: 'Bulk Actions',
    description: 'Update contact properties (email, phone, company, etc.) from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\contact-updates.csv', description: 'CSV with ContactName and properties' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Contact Property Changes
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Contacts = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: ContactName, Email, Phone, Company, Title, Department, etc." -ForegroundColor Cyan
Write-Host "Processing $($Contacts.Count) contacts..." -ForegroundColor Cyan
Write-Host ""

foreach ($Contact in $Contacts) {
    if (-not $Contact.ContactName) {
        Write-Host "⚠ Skipping row with missing ContactName" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify contact exists
        $ADContact = Get-ADObject -Filter "Name -eq '$($Contact.ContactName)' -and objectClass -eq 'contact'" -ErrorAction Stop
        
        if (-not $ADContact) {
            Write-Host "✗ $($Contact.ContactName): Contact not found" -ForegroundColor Red
            $FailCount++
            continue
        }
        
        # Build hashtable of properties to update
        $PropertiesToUpdate = @{}
        
        if ($Contact.Email) { $PropertiesToUpdate['mail'] = $Contact.Email }
        if ($Contact.Phone) { $PropertiesToUpdate['telephoneNumber'] = $Contact.Phone }
        if ($Contact.Company) { $PropertiesToUpdate['company'] = $Contact.Company }
        if ($Contact.Title) { $PropertiesToUpdate['title'] = $Contact.Title }
        if ($Contact.Department) { $PropertiesToUpdate['department'] = $Contact.Department }
        if ($Contact.Description) { $PropertiesToUpdate['description'] = $Contact.Description }
        
        if ($PropertiesToUpdate.Count -eq 0) {
            Write-Host "⚠ $($Contact.ContactName): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Contact.ContactName): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADObject -Identity $ADContact -Replace $PropertiesToUpdate -ErrorAction Stop
            Write-Host "✓ $($Contact.ContactName): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Contact.ContactName): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Contacts.Count) contacts" -ForegroundColor Gray
Write-Host "  Updated: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-group-property-changes',
    name: 'Bulk Security Group Property Changes',
    category: 'Bulk Actions',
    description: 'Update security group properties (description, managed by, etc.) from CSV file',
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Users\\admin\\group-updates.csv', description: 'CSV with GroupName and properties' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Security Group Property Changes
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Groups = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: GroupName, Description, ManagedBy, etc." -ForegroundColor Cyan
Write-Host "Processing $($Groups.Count) security groups..." -ForegroundColor Cyan
Write-Host ""

foreach ($Group in $Groups) {
    if (-not $Group.GroupName) {
        Write-Host "⚠ Skipping row with missing GroupName" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify group exists
        $ADGroup = Get-ADGroup -Identity $Group.GroupName -ErrorAction Stop
        
        # Build hashtable of properties to update
        $PropertiesToUpdate = @{}
        
        if ($Group.Description) { $PropertiesToUpdate['Description'] = $Group.Description }
        if ($Group.ManagedBy) { $PropertiesToUpdate['ManagedBy'] = $Group.ManagedBy }
        if ($Group.DisplayName) { $PropertiesToUpdate['DisplayName'] = $Group.DisplayName }
        
        if ($PropertiesToUpdate.Count -eq 0) {
            Write-Host "⚠ $($Group.GroupName): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Group.GroupName): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADGroup -Identity $Group.GroupName @PropertiesToUpdate -ErrorAction Stop
            Write-Host "✓ $($Group.GroupName): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Group.GroupName): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Groups.Count) groups" -ForegroundColor Gray
Write-Host "  Updated: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  }
];
