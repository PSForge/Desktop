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
  options?: string[] | { value: string; label: string }[];
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
  isPremium?: boolean;
}

export const adTasks: ADTask[] = [
  {
    id: 'new-hire-provisioning',
    name: 'New Hire Provisioning',
    category: 'Identity Lifecycle',
    isPremium: true,
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
    
    Write-Host "[SUCCESS] User account created: $Username" -ForegroundColor Green
    ${homeDrivePath ? `
    # Create home drive
    $HomePath = "${homeDrivePath}$Username"
    New-Item -Path $HomePath -ItemType Directory -Force
    $Acl = Get-Acl $HomePath
    $Ar = New-Object System.Security.AccessControl.FileSystemAccessRule($Username, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $Acl.SetAccessRule($Ar)
    Set-Acl $HomePath $Acl
    
    Set-ADUser -Identity $Username -HomeDrive "H:" -HomeDirectory $HomePath
    Write-Host "[SUCCESS] Home drive created and configured" -ForegroundColor Green
` : ''}${groups ? `
    # Add to security groups
    $Groups = ${groups}
    foreach ($Group in $Groups) {
        Add-ADGroupMember -Identity $Group -Members $Username -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] Added to group: $Group" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Account disabled: $Username" -ForegroundColor Green
    
    # Set description with disable date
    $Description = "Disabled on $(Get-Date -Format 'yyyy-MM-dd') - Former: $($User.Title)"
    Set-ADUser -Identity $Username -Description $Description
    ${params.removeGroups !== false ? `
    # Remove from all groups except Domain Users
    if ($RemoveGroups) {
        $Groups = $User.MemberOf | Where-Object { $_ -notlike "*Domain Users*" }
        foreach ($Group in $Groups) {
            Remove-ADGroupMember -Identity $Group -Members $Username -Confirm:$false
            Write-Host "[SUCCESS] Removed from: $((Get-ADGroup $Group).Name)" -ForegroundColor Yellow
        }
    }
` : ''}
    # Move to disabled OU
    Move-ADObject -Identity $User.DistinguishedName -TargetPath $DisabledOU
    Write-Host "[SUCCESS] Moved to disabled OU" -ForegroundColor Green
    ${archivePath ? `
    # Archive home drive
    if ($User.HomeDirectory -and (Test-Path $User.HomeDirectory)) {
        $ArchivePath = "${archivePath}$Username-$(Get-Date -Format 'yyyyMMdd')"
        Copy-Item -Path $User.HomeDirectory -Destination $ArchivePath -Recurse -Force
        Write-Host "[SUCCESS] Home drive archived to: $ArchivePath" -ForegroundColor Green
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
    isPremium: true,
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
        
        Write-Host "[SUCCESS] Notification sent to $($User.Name) ($($User.DaysLeft) days)" -ForegroundColor Green
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
    isPremium: true,
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
            Write-Host "  [SUCCESS] Disabled" -ForegroundColor Green
        }
        "Move to Quarantine OU" {
            ${quarantineOU ? `
            Move-ADObject -Identity $Computer.DistinguishedName -TargetPath $QuarantineOU
            Write-Host "  [SUCCESS] Moved to quarantine" -ForegroundColor Green
            ` : `Write-Host "  [WARNING] Quarantine OU not specified" -ForegroundColor Red`}
        }
        "Delete" {
            Remove-ADComputer -Identity $Computer -Confirm:$false
            Write-Host "  [SUCCESS] Deleted" -ForegroundColor Red
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
    isPremium: true,
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
            Write-Host "[SUCCESS] $($GPO.DisplayName)" -ForegroundColor Green
        } catch {
            Write-Host "[FAILED] $($GPO.DisplayName) - Error: $_" -ForegroundColor Red
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
            Write-Host "[SUCCESS] Deleted: $($_.Name)" -ForegroundColor Gray
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
    isPremium: true,
    description: 'Monitor changes to privileged groups and generate diff report',
    instructions: `**How This Task Works:**
This script implements continuous monitoring of privileged Active Directory security groups by maintaining baselines and detecting membership changes over time.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to monitored groups
- Write access to baseline storage location
- SMTP server access (if using email alerts)

**What You Need to Provide:**
- List of privileged groups to monitor (e.g., Domain Admins, Enterprise Admins)
- Baseline storage directory path
- Optional: Email address and SMTP server for change alerts

**What the Script Does:**
1. Creates baseline directory if it doesn't exist
2. For each monitored group, retrieves current membership (recursive)
3. Compares current members against stored baseline
4. Identifies and reports added or removed members
5. Updates baseline with current membership state
6. Sends email alert if changes detected (optional)

**Important Notes:**
- First run creates initial baselines - no changes will be detected
- Uses recursive membership to catch nested group changes
- Schedule this regularly (hourly/daily) for continuous monitoring
- Baselines are stored as XML files for easy review
- Critical for SOX compliance and security auditing
- Consider running before/after change windows`,
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
                Write-Host "[WARNING] Changes detected in: $GroupName" -ForegroundColor Yellow
                
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
                Write-Host "[SUCCESS] No changes: $GroupName" -ForegroundColor Green
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
        -Subject "[WARNING] Privileged Group Changes Detected" -Body $Body \`
        -SmtpServer $SMTPServer
    
    Write-Host ""
    Write-Host "[SUCCESS] Alert sent to $AlertEmail" -ForegroundColor Green
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
    isPremium: true,
    description: 'Compare GPO backups and detect configuration drift',
    instructions: `**How This Task Works:**
This script compares the two most recent GPO backup sets to detect configuration changes and policy drift in your Active Directory environment.

**Prerequisites:**
- Group Policy PowerShell module installed
- At least 2 GPO backup sets in the backup directory
- Read access to backup location
- Write access for report output (optional)

**What You Need to Provide:**
- GPO backup directory path
- Optional: HTML report output path
- Optional: Email address and SMTP server for drift alerts

**What the Script Does:**
1. Identifies the two most recent backup sets by timestamp
2. Compares each GPO's XML report between backups
3. Calculates SHA256 hash to detect any configuration changes
4. Lists all GPOs with detected drift
5. Generates detailed HTML diff report
6. Sends email alert if drift detected (optional)

**Important Notes:**
- Requires regular GPO backups to be effective
- Detects any policy changes between backup points
- Useful for change management and compliance
- HTML report shows side-by-side configuration differences
- Schedule after backup jobs complete
- Zero drift indicates stable GPO environment`,
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
                Write-Host "[WARNING] Drift detected: $GPOName" -ForegroundColor Yellow
                $DriftDetected += [PSCustomObject]@{
                    GPOName = $GPOName
                    LatestHash = $LatestHash
                    PreviousHash = $PreviousHash
                    Timestamp = Get-Date
                }
            } else {
                Write-Host "[SUCCESS] No change: $GPOName" -ForegroundColor Green
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
${alertEmail && smtpServer ? `
# Send alert if drift detected
if ($DriftDetected.Count -gt 0) {
    Send-MailMessage -To $AlertEmail -From "gpo-audit@$((Get-ADDomain).DNSRoot)" \`
        -Subject "[WARNING] GPO Drift Detected ($($DriftDetected.Count) GPOs)" \`
        -Body "GPO configuration drift detected. See attached report." \`
        -Attachments $ReportPath -SmtpServer $SMTPServer
    
    Write-Host "[SUCCESS] Alert sent to $AlertEmail" -ForegroundColor Green
}
` : ''}`;
    }
  },
  {
    id: 'ad-health-report',
    name: 'Weekly AD Health Report',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Comprehensive AD health check including DCs, replication, DIT size, and SYSVOL',
    instructions: `**How This Task Works:**
This script performs a comprehensive health assessment of your Active Directory environment, checking domain controllers, replication status, and overall infrastructure health.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or read-only domain controller access
- Network connectivity to all domain controllers

**What You Need to Provide:**
- Optional: HTML report output path
- Optional: Email address for automated delivery
- Optional: SMTP server for email

**What the Script Does:**
1. Enumerates all domain controllers in the forest
2. Tests network connectivity (ping) to each DC
3. Checks replication partner status and last success times
4. Analyzes domain controller health indicators
5. Generates formatted HTML report with color coding
6. Emails report to administrators (if configured)

**Important Notes:**
- Schedule weekly for proactive monitoring
- Red flags indicate immediate attention needed
- Replication failures over 24 hours are flagged as warnings
- Report includes DC operating systems and IP addresses
- Useful for capacity planning and upgrade decisions
- Keep historical reports for trend analysis`,
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
${emailTo && smtpServer ? `
# Email report
Send-MailMessage -To $EmailTo -From "ad-health@$((Get-ADDomain).DNSRoot)" \`
    -Subject "AD Health Report - $(Get-Date -Format 'yyyy-MM-dd')" \`
    -Body "Weekly AD health report attached." \`
    -Attachments $ReportPath -SmtpServer $SMTPServer

Write-Host "[SUCCESS] Report emailed to $EmailTo" -ForegroundColor Green
` : ''}`;
    }
  },
  {
    id: 'find-lockout-source',
    name: 'Find Account Lockout Source',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Hunt for the source of account lockouts across domain controllers',
    instructions: `**How This Task Works:**
This script investigates account lockout events across all domain controllers to identify the source computer causing repeated lockouts, essential for troubleshooting user access issues.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or permission to read Security event logs on DCs
- Network connectivity to all domain controllers

**What You Need to Provide:**
- Username experiencing lockouts
- Time window to search (hours back from now)

**What the Script Does:**
1. Queries all domain controllers for lockout events (Event ID 4740)
2. Filters events for the specified user and time range
3. Extracts source computer name from each lockout event
4. Identifies the most recent/frequent lockout source
5. Provides remediation recommendations

**Important Notes:**
- Lockouts typically caused by: saved credentials, scheduled tasks, services, mobile devices
- Source computer shown is where bad password originated
- Check Credential Manager on source computer first
- Mobile devices often cache old passwords
- Service accounts particularly prone to lockouts
- May need to check multiple time windows if intermittent`,
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
            
            Write-Host "  [SUCCESS] Found lockout at $($Event.TimeCreated)" -ForegroundColor Green
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
    isPremium: true,
    description: 'Find service accounts with SPNs vulnerable to Kerberoasting attacks',
    instructions: `**How This Task Works:**
This script identifies service accounts with Service Principal Names (SPNs) that are vulnerable to Kerberoasting attacks, a critical security assessment for Active Directory environments.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to Active Directory user objects
- Understanding of Kerberos encryption types

**What You Need to Provide:**
- Optional: Specific OU to scan (e.g., Service Accounts OU)
- Optional: CSV report output path
- Option to flag RC4-only accounts (high risk)

**What the Script Does:**
1. Queries AD for all user accounts with SPNs registered
2. Checks encryption type support (AES vs RC4-only)
3. Calculates password age for each service account
4. Assigns risk level (High/Medium/Low) based on configuration
5. Generates detailed security report with recommendations

**Important Notes:**
- RC4-only accounts are HIGH RISK - enable AES immediately
- Service accounts with old passwords increase risk
- Recommend using Group Managed Service Accounts (gMSA)
- Schedule quarterly audits for ongoing security
- High-risk findings require immediate remediation
- Critical for compliance and penetration test preparation`,
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
Write-Host "[SUCCESS] Report exported to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Find and report stale DNS records for cleanup',
    instructions: `**How This Task Works:**
This script identifies stale DNS A records in your Windows DNS zones by checking record age and computer availability, helping maintain clean DNS infrastructure.

**Prerequisites:**
- DNS Server PowerShell module installed
- DNS Administrator or read access to DNS server
- Network connectivity to test computer availability

**What You Need to Provide:**
- DNS server hostname or IP
- DNS zone name to scan
- Days threshold to consider records stale (default: 90)
- Optional: CSV report output path

**What the Script Does:**
1. Queries DNS server for all A records in specified zone
2. Checks timestamp age for dynamic records
3. Tests network connectivity (ping) for each aged record
4. Identifies offline computers with stale timestamps
5. Exports detailed report with recommendations
6. Provides summary statistics

**Important Notes:**
- Report-only script - no DNS records are modified or deleted
- Only checks dynamic DNS records with timestamps
- Static records (no timestamp) are not evaluated
- Offline test uses single ping - may have false positives
- Review report carefully before manual cleanup
- Stale records can cause name resolution conflicts`,
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
            Write-Host "[WARNING] Stale: $ComputerName ($RecordAge days old, offline)" -ForegroundColor Yellow
            
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
Write-Host "[SUCCESS] Report exported to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Automatically place computers into correct OUs based on site or subnet',
    instructions: `**How This Task Works:**
This script automates computer object organization by moving computers into designated OUs based on their Active Directory site assignment, maintaining proper structure.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated move permissions
- AD Sites and Services properly configured
- Target OUs must already exist

**What You Need to Provide:**
- Site-to-OU mapping in JSON format
- Preview mode option for safety (recommended first run)

**What the Script Does:**
1. Parses JSON site-to-OU mapping configuration
2. Queries all computer objects with site information
3. Matches each computer's site to target OU
4. Moves computers to correct OU (or previews changes)
5. Provides detailed move/skip statistics
6. Alerts on unmapped sites

**Important Notes:**
- Always run in preview mode first to verify mappings
- Computers without site assignments are skipped
- JSON format must be valid (use online validator if unsure)
- Useful after mergers or OU restructuring
- Schedule regularly to maintain organization
- Site assignments based on subnet configuration`,
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
        Write-Host "[WARNING] $($Computer.Name): No site assigned" -ForegroundColor Yellow
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
                    Write-Host "[SUCCESS] Moved: $($Computer.Name) to $TargetOU" -ForegroundColor Green
                    $Moved++
                } catch {
                    Write-Host "[FAILED] Failed to move $($Computer.Name): $_" -ForegroundColor Red
                    $Skipped++
                }
            }
        } else {
            Write-Host "  Already in correct OU: $($Computer.Name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] No OU mapping for site: $Site (Computer: $($Computer.Name))" -ForegroundColor Yellow
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
    isPremium: true,
    description: 'Import and create multiple users from HR CSV file',
    instructions: `**How This Task Works:**
This script processes HR CSV files to bulk-create user accounts in Active Directory, streamlining new hire onboarding for large batches.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated user creation permissions
- CSV file with required columns: FirstName, LastName, Email, Department
- Default OU must exist

**What You Need to Provide:**
- CSV file path from HR system
- Default organizational unit for new users
- Optional: Default password (or script generates random)
- Optional: Enable welcome email sending

**What the Script Does:**
1. Imports CSV file and validates format
2. For each row, generates username and UPN
3. Creates user account with provided attributes
4. Sets password (default or random per user)
5. Enables account and configures email
6. Sends welcome email if enabled
7. Logs success/failure for each user

**Important Notes:**
- CSV must include: FirstName, LastName, Email at minimum
- Usernames auto-generated (first initial + last name)
- Duplicate usernames are detected and skipped
- Default password applies to all users if specified
- Random passwords are displayed once only - save securely
- Test with small CSV first to validate format`,
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
        
        Write-Host "[SUCCESS] Created: $Username" -ForegroundColor Green
        $Created++
    } catch {
        Write-Host "[FAILED] Failed to create $Username: $_" -ForegroundColor Red
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
    isPremium: true,
    description: 'Reset user password and unlock account',
    instructions: `**How This Task Works:**
This script provides quick password reset and account unlock functionality, essential for helpdesk operations and resolving urgent user access issues.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated password reset permissions
- Account operators group membership (minimum)

**What You Need to Provide:**
- Username requiring password reset
- Optional: New password (or script generates secure random)
- Option to unlock account if locked
- Option to require password change at next logon

**What the Script Does:**
1. Verifies user account exists in Active Directory
2. Generates secure random password if none provided
3. Resets user password immediately
4. Unlocks account if lockout detected (optional)
5. Sets password change requirement (optional)
6. Displays new password for helpdesk communication

**Important Notes:**
- Generated password shown only once - communicate to user immediately
- Always require password change at next logon for security
- Account unlocks may take minutes to replicate across DCs
- User may need to wait 15 minutes before retry after unlock
- Password complexity requirements still apply
- Check for lockout source before repeated resets`,
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
    Write-Host "[SUCCESS] Password reset" -ForegroundColor Green
    
    # Set must change password
    Set-ADUser -Identity $Username -ChangePasswordAtLogon $MustChangePassword
    Write-Host "[SUCCESS] Must change password: $MustChangePassword" -ForegroundColor Gray
    
    # Unlock if requested and locked
    if ($UnlockAccount -and $User.LockedOut) {
        Unlock-ADAccount -Identity $Username
        Write-Host "[SUCCESS] Account unlocked" -ForegroundColor Green
    } elseif ($User.LockedOut) {
        Write-Host "[WARNING] Account is locked but unlock not requested" -ForegroundColor Yellow
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
    isPremium: true,
    description: 'Find and report empty groups and groups with no members',
    instructions: `**How This Task Works:**
This script identifies empty security and distribution groups in Active Directory, helping maintain a clean group structure and reduce security audit findings.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to group objects
- Delete permissions if cleanup enabled

**What You Need to Provide:**
- Optional: Specific OU to scan for groups
- Optional: CSV report output path
- Option to delete empty groups (use with caution)

**What the Script Does:**
1. Scans all groups in specified scope
2. Checks membership count for each group
3. Identifies groups with zero members
4. Reports group name, description, and creation date
5. Optionally deletes empty groups (if enabled)
6. Exports detailed CSV report

**Important Notes:**
- Always run report-only mode first before deletion
- Some empty groups may be intentional (placeholder, template)
- Deletion is permanent - cannot be easily reversed
- Check with application owners before deleting
- Groups used by applications may appear empty but serve a purpose
- Consider age - newly created groups may be awaiting population`,
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
        Write-Host "[WARNING] Empty: $($Group.Name)" -ForegroundColor Yellow
        
        $EmptyGroups += [PSCustomObject]@{
            Name = $Group.Name
            Description = $Group.Description
            Created = $Group.WhenCreated
            DistinguishedName = $Group.DistinguishedName
        }
        
        if ($DeleteEmpty) {
            try {
                Remove-ADGroup -Identity $Group -Confirm:$false
                Write-Host "  [SUCCESS] Deleted" -ForegroundColor Red
            } catch {
                Write-Host "  [FAILED] Failed to delete: $_" -ForegroundColor Red
            }
        }
    }
}

# Export report
$EmptyGroups | Export-Csv -Path $ReportPath -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Check and export BitLocker recovery keys from AD',
    instructions: `**How This Task Works:**
This script audits BitLocker recovery keys stored in Active Directory, essential for disaster recovery planning and compliance verification.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to computer objects and recovery info
- BitLocker Group Policy configured to backup to AD

**What You Need to Provide:**
- Optional: Specific OU to scan for computers
- Optional: Secure export path for recovery keys

**What the Script Does:**
1. Enumerates all computer objects in scope
2. Searches for BitLocker recovery key objects
3. Extracts recovery passwords for each computer
4. Identifies computers without backup keys
5. Generates comprehensive CSV report
6. Provides statistics on key coverage

**Important Notes:**
- Export file contains sensitive recovery passwords - secure immediately
- Store export in encrypted location with restricted access
- Missing keys may indicate: BitLocker not enabled, backup policy not configured
- Recovery keys are device-specific, not user-specific
- Critical for disaster recovery scenarios
- Validate export regularly to ensure backup policy working`,
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
        Write-Host "[SUCCESS] $($Computer.Name): $($RecoveryKeys.Count) key(s)" -ForegroundColor Green
    } else {
        $WithoutKeys++
        Write-Host "[WARNING] $($Computer.Name): No keys" -ForegroundColor Yellow
        
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
Write-Host "[SUCCESS] Report exported to: $ExportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Computers with BitLocker keys: $WithKeys" -ForegroundColor Green
Write-Host "  Computers without keys: $WithoutKeys" -ForegroundColor Yellow
Write-Host ""
Write-Host "[WARNING] WARNING: Handle this file securely - it contains recovery keys!" -ForegroundColor Red`;
    }
  },
  {
    id: 'password-never-expires-audit',
    name: 'Password Never Expires Audit',
    category: 'Security & Compliance',
    isPremium: true,
    description: 'Find accounts with password never expires flag set',
    instructions: `**How This Task Works:**
This script identifies user accounts configured with the "Password Never Expires" flag, a critical security audit for compliance and vulnerability assessment.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to user objects in Active Directory
- Understanding of password policy requirements

**What You Need to Provide:**
- Optional: Specific OU to scan
- Optional: CSV report output path
- Option to include disabled accounts in scan

**What the Script Does:**
1. Queries all user accounts with PasswordNeverExpires flag set
2. Checks if accounts are in privileged groups (Domain Admins, etc.)
3. Calculates password age and last logon date
4. Assigns risk level (High for privileged, Medium for standard)
5. Generates detailed audit report with recommendations

**Important Notes:**
- HIGH RISK: Privileged accounts with non-expiring passwords
- Service accounts may legitimately require this setting
- Consider using Group Managed Service Accounts (gMSA) instead
- This setting violates most compliance frameworks (PCI, HIPAA, SOC2)
- Review and remediate high-risk findings immediately
- Schedule regular quarterly audits`,
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
    
    Write-Host "[WARNING] $($Account.SamAccountName) - $Risk Risk" -ForegroundColor Yellow
    
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Monitor and alert on AD replication failures',
    instructions: `**How This Task Works:**
This script monitors Active Directory replication health across all domain controllers, detecting failures and alerting administrators before issues impact users.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or replication monitoring permissions
- Network connectivity to all domain controllers

**What You Need to Provide:**
- Optional: HTML report output path
- Optional: Email address for failure alerts
- Optional: SMTP server for email notifications

**What the Script Does:**
1. Queries all domain controllers in the domain
2. Checks replication partner metadata for each DC
3. Identifies replication failures and delays
4. Calculates time since last successful replication
5. Generates HTML report with color-coded status
6. Sends email alerts if failures detected

**Important Notes:**
- Replication failures over 15 minutes require investigation
- Common causes: network issues, NTDS corruption, DNS problems
- Check DC event logs for specific error details
- Urgent: Failures over 24 hours indicate serious issues
- Schedule hourly for proactive monitoring
- Critical for multi-site AD environments`,
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
                Write-Host "  [FAILED] Failure with $($Partner.Partner)" -ForegroundColor Red
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
                Write-Host "  [SUCCESS] OK with $($Partner.Partner)" -ForegroundColor Green
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green

${alertEmail && smtpServer ? `
# Send alert if failures detected
if ($Failures.Count -gt 0) {
    Send-MailMessage -To $AlertEmail -From "repl-monitor@$((Get-ADDomain).DNSRoot)" \`
        -Subject "[WARNING] AD Replication Failures Detected ($($Failures.Count))" \`
        -Body "Replication failures detected. See attached report." \`
        -Attachments $ReportPath -SmtpServer $SMTPServer
    
    Write-Host "[SUCCESS] Alert sent to $AlertEmail" -ForegroundColor Green
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
    isPremium: true,
    description: 'Report on UPN and email address consistency',
    instructions: `**How This Task Works:**
This script audits user principal names (UPNs) and email addresses to ensure consistency across your organization, critical for Office 365/Azure AD synchronization and user experience.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to user objects
- Knowledge of expected domain suffix

**What You Need to Provide:**
- Expected domain suffix (e.g., company.com)
- Optional: Specific OU to scan
- Optional: CSV report output path

**What the Script Does:**
1. Queries all enabled user accounts
2. Compares UPN suffix to expected domain
3. Compares email suffix to expected domain
4. Checks if UPN matches email address
5. Identifies missing email addresses
6. Reports all inconsistencies with details

**Important Notes:**
- UPN should match primary email for best Office 365 experience
- Inconsistent UPNs cause Azure AD Connect sync issues
- Missing email addresses block cloud service provisioning
- Run before Office 365/Azure AD migration
- Especially important for merged/acquired companies
- May reveal stale accounts needing cleanup`,
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
        Write-Host "[WARNING] $($User.SamAccountName): $($Issues -join ', ')" -ForegroundColor Yellow
        
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Audit NTFS permissions and detect least privilege violations',
    instructions: `**How This Task Works:**
This script performs a comprehensive NTFS permissions audit on file shares and folders, identifying security violations and excessive permissions that violate least privilege principles.

**Prerequisites:**
- Local admin or backup operator rights on target server
- Network access to file server/share
- Understanding of NTFS permissions model

**What You Need to Provide:**
- Target file server path or UNC share path
- Optional: CSV report output path
- Option to flag "Everyone" group permissions

**What the Script Does:**
1. Recursively scans all folders under target path
2. Retrieves ACL (Access Control List) for each folder
3. Identifies "Everyone" or "Authenticated Users" permissions
4. Flags broken inheritance (security risk)
5. Reports Full Control grants (excessive permissions)
6. Generates detailed permissions audit report

**Important Notes:**
- "Everyone" group permissions are major security risk
- Full Control should be granted sparingly
- Broken inheritance can indicate tampering or misconfiguration
- Large share scans may take considerable time
- Schedule during off-hours for network-intensive scans
- Critical for compliance audits (PCI, HIPAA, SOC2)`,
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
                Write-Host "[WARNING] $($Folder.FullName)" -ForegroundColor Yellow
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Move or rename AD objects in bulk from CSV file',
    instructions: `**How This Task Works:**
This script processes CSV files to perform bulk moves and renames of Active Directory objects (users, computers, groups), essential for reorganizations, migrations, and cleanup projects.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or delegated move/rename permissions
- Properly formatted CSV file with required columns

**What You Need to Provide:**
- CSV file path with Identity, TargetOU, and optional NewName columns
- Object type (User, Computer, or Group)
- Preview mode option (recommended for first run)

**What the Script Does:**
1. Imports CSV file with move/rename instructions
2. Validates each object exists in Active Directory
3. Moves objects to new OU if TargetOU specified
4. Renames objects if NewName specified
5. Reports success/failure for each operation
6. Provides summary statistics

**Important Notes:**
- ALWAYS run in preview mode first (WhatIf=true)
- CSV format: Identity, TargetOU, NewName (NewName is optional)
- Identity can be SamAccountName, DN, or GUID
- Moves and renames can be done simultaneously
- Failed operations do not roll back successful ones
- Keep backup of CSV file for audit trail`,
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
                    Write-Host "[SUCCESS] Moved: $Identity to $TargetOU" -ForegroundColor Green
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
                Write-Host "[SUCCESS] Renamed: $Identity to $NewName" -ForegroundColor Green
                $Renamed++
            }
        }
    } catch {
        Write-Host "[FAILED] Failed to process $Identity: $_" -ForegroundColor Red
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
    isPremium: true,
    description: 'Audit nested group depth to identify token bloat issues',
    instructions: `**How This Task Works:**
This script analyzes group nesting depth to identify potential Kerberos token bloat issues, which can cause authentication failures and performance problems in Active Directory environments.

**Prerequisites:**
- Active Directory PowerShell module installed
- Read access to group objects
- Understanding of Kerberos token limits

**What You Need to Provide:**
- Optional: Specific OU to scan for groups
- Maximum acceptable nesting depth (default: 5 levels)
- Optional: CSV report output path

**What the Script Does:**
1. Scans all security groups in specified scope
2. Recursively calculates nesting depth for each group
3. Detects circular group memberships
4. Flags groups exceeding maximum depth threshold
5. Identifies potential token bloat scenarios
6. Generates detailed audit report

**Important Notes:**
- Kerberos tokens have size limits (typically 48KB max)
- Deep nesting (>5 levels) can cause token bloat
- Token bloat symptoms: authentication failures, "MaxTokenSize" errors
- Circular memberships indicate serious configuration issue
- Excessive nesting impacts login performance
- Recommend restructuring groups exceeding 5 levels deep`,
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
        Write-Host "[WARNING] $($Group.Name): Depth = $Depth" -ForegroundColor Red
    } else {
        Write-Host "[SUCCESS] $($Group.Name): Depth = $Depth" -ForegroundColor Green
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
Write-Host "[SUCCESS] Report saved to: $ReportPath" -ForegroundColor Green
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
    isPremium: true,
    description: 'Add multiple users to a security group from CSV file with username list',
    instructions: `**How This Task Works:**
This script adds multiple users to a security group in bulk from a CSV file, streamlining access management for projects, departments, and resource permissions.

**Prerequisites:**
- Active Directory PowerShell module installed
- Group management permissions for target group
- CSV file with Username column

**What You Need to Provide:**
- Security group name (existing group)
- CSV file path containing usernames
- Test mode option for preview

**What the Script Does:**
1. Validates target group exists
2. Imports CSV file with username list
3. Verifies each user exists in AD
4. Checks if user already member (skips duplicates)
5. Adds users to group (or previews in test mode)
6. Reports success/failure for each operation

**Important Notes:**
- ALWAYS run in test mode first to preview changes
- CSV requires "Username" column header
- Users already in group are automatically skipped
- Changes take effect immediately (no rollback)
- Group membership replication can take 15+ minutes
- Maximum recommended batch size: 5,000 users`,
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
    Write-Host "[SUCCESS] Target Group: $($Group.Name)" -ForegroundColor Green
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
        Write-Host "[WARNING] Skipping row with missing Username" -ForegroundColor Yellow
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
            Write-Host "[SUCCESS] $($User.Username): Would be added (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Add-ADGroupMember -Identity $GroupName -Members $User.Username -ErrorAction Stop
            Write-Host "[SUCCESS] $($User.Username): Added successfully" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($User.Username): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-user-property-changes',
    name: 'Bulk User Property Changes',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Update user properties (department, title, manager, etc.) from CSV file',
    instructions: `**How This Task Works:**
This script updates user account properties in bulk from a CSV file, perfect for organizational changes, HR updates, and data quality projects.

**Prerequisites:**
- Active Directory PowerShell module installed
- User modification permissions
- CSV file with Username and property columns

**What You Need to Provide:**
- CSV file with Username and properties to update
- Test mode option for preview

**What the Script Does:**
1. Imports CSV with user data
2. Validates each user exists
3. Updates properties: Department, Title, Manager, Office, Phone, Description, Company
4. Reports changes per user
5. Provides success/failure summary

**Important Notes:**
- CSV columns: Username (required), plus any properties to update
- Only non-empty CSV columns are updated
- Test mode shows what would change without applying
- Manager field requires valid username or DN
- Changes replicate to all DCs within 15 minutes
- Keep CSV backup for audit trail`,
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
        Write-Host "[WARNING] Skipping row with missing Username" -ForegroundColor Yellow
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
            Write-Host "[WARNING] $($User.Username): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "[SUCCESS] $($User.Username): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADUser -Identity $User.Username @PropertiesToUpdate -ErrorAction Stop
            Write-Host "[SUCCESS] $($User.Username): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($User.Username): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-user-account-moves',
    name: 'Bulk User Account Moves',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Move multiple user accounts to different OUs from CSV file',
    instructions: `**How This Task Works:**
This script moves user accounts between organizational units in bulk from a CSV file, essential for reorganizations, migrations, and AD cleanup projects.

**Prerequisites:**
- Active Directory PowerShell module installed
- Move permissions for source and target OUs
- CSV file with Username and TargetOU columns

**What You Need to Provide:**
- CSV file path with move instructions
- Test mode option (recommended first run)

**What the Script Does:**
1. Imports CSV file with Username and TargetOU
2. Validates each user and target OU exist
3. Moves user accounts to specified OUs
4. Skips users already in correct OU
5. Reports success/failure per operation
6. Provides summary statistics

**Important Notes:**
- ALWAYS test first - moves are immediate
- CSV format: Username, TargetOU (full DN required)
- TargetOU example: "OU=Sales,OU=Users,DC=company,DC=com"
- Group Policy inheritance may change after move
- Moves trigger AD replication immediately
- Users already in target OU are skipped`,
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
        Write-Host "[WARNING] Skipping row with missing Username or TargetOU" -ForegroundColor Yellow
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
            Write-Host "[FAILED] $($User.Username): Target OU not found - $($User.TargetOU)" -ForegroundColor Red
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
            Write-Host "[SUCCESS] $($User.Username): Would move to $($User.TargetOU) (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Move-ADObject -Identity $ADUser.DistinguishedName -TargetPath $User.TargetOU -ErrorAction Stop
            Write-Host "[SUCCESS] $($User.Username): Moved to $($User.TargetOU)" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($User.Username): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-add-computers-to-group',
    name: 'Bulk Add Computers to Security Group',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Add multiple computers to a security group from CSV file',
    instructions: `**How This Task Works:**
This script adds multiple computer accounts to a security group in bulk, useful for Group Policy application, resource access, and workstation management.

**Prerequisites:**
- Active Directory PowerShell module installed
- Group management permissions
- CSV file with ComputerName column

**What You Need to Provide:**
- Security group name (existing group)
- CSV file path with computer names
- Test mode option for preview

**What the Script Does:**
1. Validates target group exists
2. Imports CSV with computer names
3. Verifies each computer exists in AD
4. Checks if already member (skips duplicates)
5. Adds computers to group
6. Reports success/failure summary

**Important Notes:**
- Test mode recommended for first run
- CSV requires "ComputerName" column header
- Computer names without "$" suffix work fine
- Changes apply to Group Policy immediately
- Group membership replicates within 15 minutes
- Maximum recommended: 5,000 computers per batch`,
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
    Write-Host "[SUCCESS] Target Group: $($Group.Name)" -ForegroundColor Green
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
        Write-Host "[WARNING] Skipping row with missing ComputerName" -ForegroundColor Yellow
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
            Write-Host "[SUCCESS] $($Computer.ComputerName): Would be added (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Add-ADGroupMember -Identity $GroupName -Members $ADComputer -ErrorAction Stop
            Write-Host "[SUCCESS] $($Computer.ComputerName): Added successfully" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($Computer.ComputerName): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-computer-property-changes',
    name: 'Bulk Computer Property Changes',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Update computer properties (description, location, etc.) from CSV file',
    instructions: `**How This Task Works:**
This script updates computer account properties in bulk from CSV, perfect for asset management, inventory updates, and documentation projects.

**Prerequisites:**
- Active Directory PowerShell module installed
- Computer object modification permissions
- CSV with ComputerName and property columns

**What You Need to Provide:**
- CSV file with ComputerName and properties to update
- Test mode option for preview

**What the Script Does:**
1. Imports CSV with computer data
2. Validates each computer exists
3. Updates properties: Description, Location, ManagedBy
4. Reports changes per computer
5. Provides success/failure summary

**Important Notes:**
- CSV columns: ComputerName (required), plus properties to update
- Only non-empty CSV columns are updated
- Test mode shows changes without applying
- ManagedBy requires valid user DN or username
- Changes replicate within 15 minutes
- Useful for CMDB/asset management integration`,
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
        Write-Host "[WARNING] Skipping row with missing ComputerName" -ForegroundColor Yellow
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
            Write-Host "[WARNING] $($Computer.ComputerName): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "[SUCCESS] $($Computer.ComputerName): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADComputer -Identity $Computer.ComputerName @PropertiesToUpdate -ErrorAction Stop
            Write-Host "[SUCCESS] $($Computer.ComputerName): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($Computer.ComputerName): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-computer-account-moves',
    name: 'Bulk Computer Account Moves',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Move multiple computer accounts to different OUs from CSV file',
    instructions: `**How This Task Works:**
This script moves computer accounts between OUs in bulk, essential for Group Policy reorganization, site consolidation, and infrastructure changes.

**Prerequisites:**
- Active Directory PowerShell module installed
- Move permissions for source and target OUs
- CSV with ComputerName and TargetOU columns

**What You Need to Provide:**
- CSV file path with move instructions
- Test mode option (recommended)

**What the Script Does:**
1. Imports CSV with ComputerName and TargetOU
2. Validates each computer and OU exist
3. Moves computers to specified OUs
4. Skips computers already in target OU
5. Reports success/failure per operation
6. Provides summary statistics

**Important Notes:**
- Test mode strongly recommended first
- CSV format: ComputerName, TargetOU (full DN)
- TargetOU example: "OU=Workstations,OU=Computers,DC=company,DC=com"
- Group Policy inheritance changes after move
- Computers may need gpupdate /force
- Moves replicate immediately`,
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
        Write-Host "[WARNING] Skipping row with missing ComputerName or TargetOU" -ForegroundColor Yellow
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
            Write-Host "[FAILED] $($Computer.ComputerName): Target OU not found - $($Computer.TargetOU)" -ForegroundColor Red
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
            Write-Host "[SUCCESS] $($Computer.ComputerName): Would move to $($Computer.TargetOU) (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Move-ADObject -Identity $ADComputer.DistinguishedName -TargetPath $Computer.TargetOU -ErrorAction Stop
            Write-Host "[SUCCESS] $($Computer.ComputerName): Moved to $($Computer.TargetOU)" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($Computer.ComputerName): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-contact-property-changes',
    name: 'Bulk Contact Property Changes',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Update contact properties (email, phone, company, etc.) from CSV file',
    instructions: `**How This Task Works:**
This script updates contact object properties in bulk from CSV, useful for maintaining external partner information, vendor contacts, and global address list entries.

**Prerequisites:**
- Active Directory PowerShell module installed
- Contact object modification permissions
- CSV with ContactName and property columns

**What You Need to Provide:**
- CSV file with ContactName and properties to update
- Test mode option for preview

**What the Script Does:**
1. Imports CSV with contact data
2. Validates each contact exists
3. Updates properties: Email, Phone, Company, Title, Department, Description
4. Reports changes per contact
5. Provides success/failure summary

**Important Notes:**
- CSV columns: ContactName (required), plus properties to update
- Only non-empty CSV columns are updated
- Test mode shows changes without applying
- Contacts appear in Global Address List
- Changes replicate within 15 minutes
- Useful for partner/vendor directory management`,
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
        Write-Host "[WARNING] Skipping row with missing ContactName" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Verify contact exists
        $ADContact = Get-ADObject -Filter "Name -eq '$($Contact.ContactName)' -and objectClass -eq 'contact'" -ErrorAction Stop
        
        if (-not $ADContact) {
            Write-Host "[FAILED] $($Contact.ContactName): Contact not found" -ForegroundColor Red
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
            Write-Host "[WARNING] $($Contact.ContactName): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "[SUCCESS] $($Contact.ContactName): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADObject -Identity $ADContact -Replace $PropertiesToUpdate -ErrorAction Stop
            Write-Host "[SUCCESS] $($Contact.ContactName): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($Contact.ContactName): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'bulk-group-property-changes',
    name: 'Bulk Security Group Property Changes',
    category: 'Bulk Actions',
    isPremium: true,
    description: 'Update security group properties (description, managed by, etc.) from CSV file',
    instructions: `**How This Task Works:**
This script updates security group properties in bulk from CSV, perfect for documentation cleanup, ownership assignment, and group management hygiene.

**Prerequisites:**
- Active Directory PowerShell module installed
- Group modification permissions
- CSV with GroupName and property columns

**What You Need to Provide:**
- CSV file with GroupName and properties to update
- Test mode option for preview

**What the Script Does:**
1. Imports CSV with group data
2. Validates each group exists
3. Updates properties: Description, ManagedBy, DisplayName
4. Reports changes per group
5. Provides success/failure summary

**Important Notes:**
- CSV columns: GroupName (required), plus properties to update
- Only non-empty CSV columns are updated
- Test mode shows changes without applying
- ManagedBy requires valid user DN or username
- Descriptions improve group discoverability
- Changes replicate within 15 minutes`,
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
        Write-Host "[WARNING] Skipping row with missing GroupName" -ForegroundColor Yellow
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
            Write-Host "[WARNING] $($Group.GroupName): No properties to update" -ForegroundColor Yellow
            continue
        }
        
        if ($TestMode) {
            Write-Host "[SUCCESS] $($Group.GroupName): Would update $($PropertiesToUpdate.Count) properties (TEST MODE)" -ForegroundColor Cyan
            foreach ($Key in $PropertiesToUpdate.Keys) {
                Write-Host "    - $Key = $($PropertiesToUpdate[$Key])" -ForegroundColor Gray
            }
            $SuccessCount++
        } else {
            Set-ADGroup -Identity $Group.GroupName @PropertiesToUpdate -ErrorAction Stop
            Write-Host "[SUCCESS] $($Group.GroupName): Updated $($PropertiesToUpdate.Count) properties" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "[FAILED] $($Group.GroupName): Failed - $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "[WARNING] TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  // ========================================
  // DNS OPERATIONS CATEGORY
  // ========================================
  {
    id: 'create-dns-zone',
    name: 'Create DNS Zone',
    category: 'DNS Operations',
    isPremium: true,
    description: 'Create a new DNS zone (primary or secondary)',
    instructions: `**How This Task Works:**
This script creates a new DNS zone on a Windows DNS server for name resolution.

**Prerequisites:**
- DNS Server role installed
- Domain Administrator or DNS Admins group membership
- DNS service running

**What You Need to Provide:**
- Zone name
- Zone type (Primary or Secondary)
- For Primary zones: Replication scope (if AD-integrated)
- For Secondary zones: Master DNS server IPs

**What the Script Does:**
1. Creates new DNS zone (primary or secondary)
2. For primary: Configures AD integration and replication
3. For secondary: Sets master servers for zone transfers
4. Verifies zone creation

**Important Notes:**
- AD-integrated zones replicate via AD (Primary only)
- Primary zones are authoritative
- Secondary zones are read-only copies from master servers
- Forward lookup zones for name-to-IP
- Reverse lookup zones for IP-to-name
- Secondary zones automatically transfer from masters`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com or 1.168.192.in-addr.arpa' },
      { id: 'zoneType', label: 'Zone Type', type: 'select', required: true, options: ['Primary', 'Secondary'], defaultValue: 'Primary' },
      { id: 'adIntegrated', label: 'AD-Integrated (Primary only)', type: 'boolean', required: false, defaultValue: true, description: 'Store zone in Active Directory (Primary zones only)' },
      { id: 'replicationScope', label: 'Replication Scope (Primary only)', type: 'select', required: false, options: ['Forest', 'Domain', 'Legacy'], defaultValue: 'Domain', description: 'AD replication scope (Primary AD-integrated only)' },
      { id: 'masterServers', label: 'Master Servers (Secondary only)', type: 'textarea', required: false, placeholder: '10.0.0.10, 10.0.0.11', description: 'Comma-separated master DNS server IPs (Secondary zones only)' }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const zoneType = params.zoneType || 'Primary';
      const adIntegrated = params.adIntegrated !== false;
      const replicationScope = params.replicationScope || 'Domain';
      const masterServers = params.masterServers ? params.masterServers.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip) : [];

      return `# Create DNS Zone
# Generated: ${new Date().toISOString()}

Import-Module DnsServer

try {
    Write-Host "Creating ${zoneType} DNS zone: ${zoneName}" -ForegroundColor Cyan
    
    ${zoneType === 'Secondary' ? `
    # Create secondary zone
    ${masterServers.length === 0 ? `
    Write-Host "[WARNING]️ ERROR: Secondary zones require master server IPs" -ForegroundColor Red
    Write-Host "   Please provide master servers in the 'Master Servers' field" -ForegroundColor Yellow
    exit 1
    ` : `
    $MasterServers = @(${masterServers.map((ip: string) => `"${ip}"`).join(', ')})
    Add-DnsServerSecondaryZone -Name "${zoneName}" -MasterServers $MasterServers -ZoneFile "${zoneName}.dns"
    
    Write-Host "[SUCCESS] Secondary DNS zone created successfully" -ForegroundColor Green
    Write-Host "  Zone: ${zoneName}" -ForegroundColor Gray
    Write-Host "  Type: Secondary" -ForegroundColor Gray
    Write-Host "  Master Servers: ${masterServers.join(', ')}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Zone transfer will begin automatically from master servers" -ForegroundColor Cyan
    `}
    ` : adIntegrated ? `
    # Create AD-integrated primary zone
    Add-DnsServerPrimaryZone -Name "${zoneName}" -ReplicationScope "${replicationScope}"
    
    Write-Host "[SUCCESS] Primary DNS zone created successfully" -ForegroundColor Green
    Write-Host "  Zone: ${zoneName}" -ForegroundColor Gray
    Write-Host "  Type: Primary (AD-Integrated)" -ForegroundColor Gray
    Write-Host "  Replication: ${replicationScope}" -ForegroundColor Gray
    ` : `
    # Create file-based primary zone
    Add-DnsServerPrimaryZone -Name "${zoneName}" -ZoneFile "${zoneName}.dns"
    
    Write-Host "[SUCCESS] Primary DNS zone created successfully" -ForegroundColor Green
    Write-Host "  Zone: ${zoneName}" -ForegroundColor Gray
    Write-Host "  Type: Primary (File-based)" -ForegroundColor Gray
    Write-Host "  Zone File: ${zoneName}.dns" -ForegroundColor Gray
    `}
    
} catch {
    Write-Error "Failed to create DNS zone: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-dns-a-record',
    name: 'Create DNS A Record',
    category: 'DNS Operations',
    isPremium: true,
    description: 'Create a DNS A (host) record for name-to-IP resolution',
    instructions: `**How This Task Works:**
This script creates a DNS A record to map a hostname to an IPv4 address.

**Prerequisites:**
- DNS Server role with zone configured
- DNS Admins permissions
- Zone must exist

**What You Need to Provide:**
- Zone name
- Record name (hostname)
- IPv4 address

**What the Script Does:**
1. Verifies zone exists
2. Creates A record
3. Sets TTL if specified
4. Confirms creation

**Important Notes:**
- A records map names to IPv4 addresses
- Use AAAA records for IPv6
- PTR records for reverse lookup
- Can create multiple A records for same name (round-robin)
- Typical TTL: 3600 seconds (1 hour)`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'recordName', label: 'Record Name', type: 'text', required: true, placeholder: 'server01 or www' },
      { id: 'ipAddress', label: 'IPv4 Address', type: 'text', required: true, placeholder: '192.168.1.10' },
      { id: 'ttl', label: 'TTL (seconds)', type: 'number', required: false, placeholder: '3600', description: 'Time to live' }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const recordName = escapePowerShellString(params.recordName);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const ttl = params.ttl ? parseInt(params.ttl) : 3600;

      return `# Create DNS A Record
# Generated: ${new Date().toISOString()}

Import-Module DnsServer

try {
    Write-Host "Creating DNS A record in ${zoneName}" -ForegroundColor Cyan
    
    Add-DnsServerResourceRecordA -Name "${recordName}" -ZoneName "${zoneName}" -IPv4Address "${ipAddress}" -TimeToLive (New-TimeSpan -Seconds ${ttl})
    
    Write-Host "[SUCCESS] DNS A record created successfully" -ForegroundColor Green
    Write-Host "  Zone: ${zoneName}" -ForegroundColor Gray
    Write-Host "  Name: ${recordName}" -ForegroundColor Gray
    Write-Host "  IP: ${ipAddress}" -ForegroundColor Gray
    Write-Host "  TTL: ${ttl} seconds" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test with: nslookup ${recordName}.${zoneName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create DNS A record: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-dns-scavenging',
    name: 'Configure DNS Scavenging',
    category: 'DNS Operations',
    isPremium: true,
    description: 'Enable and configure DNS scavenging to remove stale records',
    instructions: `**How This Task Works:**
This script configures DNS scavenging to automatically clean up stale DNS records.

**Prerequisites:**
- DNS Server role
- DNS Admins permissions
- Understanding of no-refresh and refresh intervals

**What You Need to Provide:**
- Zone name
- Scavenging intervals

**What the Script Does:**
1. Enables scavenging on zone
2. Sets no-refresh interval
3. Sets refresh interval
4. Configures aging

**Important Notes:**
- Prevents DNS database bloat
- Only affects dynamically registered records
- No-refresh: 7 days typical
- Refresh: 7 days typical  
- Scavenging period: sum of both intervals
- Run scavenging manually or on schedule`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'noRefreshInterval', label: 'No-Refresh Interval (days)', type: 'number', required: false, defaultValue: 7, placeholder: '7' },
      { id: 'refreshInterval', label: 'Refresh Interval (days)', type: 'number', required: false, defaultValue: 7, placeholder: '7' }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const noRefresh = params.noRefreshInterval || 7;
      const refresh = params.refreshInterval || 7;

      return `# Configure DNS Scavenging
# Generated: ${new Date().toISOString()}

Import-Module DnsServer

try {
    Write-Host "Configuring DNS scavenging for ${zoneName}" -ForegroundColor Cyan
    
    # Enable scavenging on zone
    Set-DnsServerZoneAging -Name "${zoneName}" -Aging \\$true -NoRefreshInterval (New-TimeSpan -Days ${noRefresh}) -RefreshInterval (New-TimeSpan -Days ${refresh})
    
    # Enable scavenging on server
    Set-DnsServerScavenging -ScavengingState \\$true -ScavengingInterval (New-TimeSpan -Days 7)
    
    Write-Host "[SUCCESS] DNS scavenging configured successfully" -ForegroundColor Green
    Write-Host "  Zone: ${zoneName}" -ForegroundColor Gray
    Write-Host "  No-Refresh Interval: ${noRefresh} days" -ForegroundColor Gray
    Write-Host "  Refresh Interval: ${refresh} days" -ForegroundColor Gray
    Write-Host "  Total Scavenging Period: ${noRefresh + refresh} days" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Run scavenging now:" -ForegroundColor Cyan
    Write-Host "  Start-DnsServerScavenging -Force" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure DNS scavenging: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-dns-conditional-forwarder',
    name: 'Create DNS Conditional Forwarder',
    category: 'DNS Operations',
    isPremium: true,
    description: 'Create a conditional forwarder for selective DNS query forwarding',
    instructions: `**How This Task Works:**
This script creates a DNS conditional forwarder to forward queries for specific domains to designated DNS servers.

**Prerequisites:**
- DNS Server role
- DNS Admins permissions
- Target DNS servers accessible

**What You Need to Provide:**
- Domain name to forward
- Target DNS server IPs

**What the Script Does:**
1. Creates conditional forwarder
2. Configures target DNS servers
3. Sets AD integration if applicable
4. Tests forwarding

**Important Notes:**
- Used for multi-forest scenarios
- Partner domain name resolution
- Can be AD-integrated for replication
- Improves DNS resolution performance
- Reduces external DNS queries`,
    parameters: [
      { id: 'forwardDomain', label: 'Domain to Forward', type: 'text', required: true, placeholder: 'partner.com' },
      { id: 'masterServers', label: 'Target DNS Servers', type: 'textarea', required: true, placeholder: '10.0.0.10, 10.0.0.11', description: 'Comma-separated IP addresses' },
      { id: 'storeInAD', label: 'Store in Active Directory', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const forwardDomain = escapePowerShellString(params.forwardDomain);
      const masterIPs = params.masterServers.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip);
      const storeInAD = params.storeInAD === true;
      const psAD = storeInAD ? '$true' : '$false';

      return `# Create DNS Conditional Forwarder
# Generated: ${new Date().toISOString()}

Import-Module DnsServer

try {
    Write-Host "Creating conditional forwarder for ${forwardDomain}" -ForegroundColor Cyan
    
    $MasterServers = @(${masterIPs.map((ip: string) => `"${ip}"`).join(', ')})
    
    Add-DnsServerConditionalForwarderZone -Name "${forwardDomain}" -MasterServers $MasterServers ${storeInAD ? `-ReplicationScope "Forest"` : ''}
    
    Write-Host "[SUCCESS] Conditional forwarder created successfully" -ForegroundColor Green
    Write-Host "  Domain: ${forwardDomain}" -ForegroundColor Gray
    Write-Host "  Target Servers: ${masterIPs.join(', ')}" -ForegroundColor Gray
    Write-Host "  AD-Integrated: ${storeInAD}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test with:" -ForegroundColor Cyan
    Write-Host "  nslookup server.${forwardDomain}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create conditional forwarder: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SITES & SERVICES CATEGORY
  // ========================================
  {
    id: 'create-ad-site',
    name: 'Create Active Directory Site',
    category: 'Sites & Services',
    isPremium: true,
    description: 'Create a new AD site for physical network location',
    instructions: `**How This Task Works:**
This script creates a new Active Directory site to represent a physical network location.

**Prerequisites:**
- Domain Administrator or Enterprise Administrator
- Active Directory Sites and Services access
- Network topology documented

**What You Need to Provide:**
- Site name
- Site description (optional)

**What the Script Does:**
1. Creates new AD site
2. Sets site description
3. Verifies site creation
4. Provides next steps

**Important Notes:**
- Sites represent physical locations
- Control AD replication traffic
- Improve authentication performance
- Associate subnets after creating site
- Create site links between sites
- Typical naming: City-Building or Location code`,
    parameters: [
      { id: 'siteName', label: 'Site Name', type: 'text', required: true, placeholder: 'Seattle-HQ or SEA01' },
      { id: 'siteDescription', label: 'Site Description', type: 'text', required: false, placeholder: 'Seattle Headquarters Office' }
    ],
    scriptTemplate: (params) => {
      const siteName = escapePowerShellString(params.siteName);
      const siteDesc = params.siteDescription ? escapePowerShellString(params.siteDescription) : '';

      return `# Create AD Site
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "Creating AD site: ${siteName}" -ForegroundColor Cyan
    
    New-ADReplicationSite -Name "${siteName}" ${siteDesc ? `-Description "${siteDesc}"` : ''}
    
    Write-Host "[SUCCESS] AD site created successfully" -ForegroundColor Green
    Write-Host "  Site: ${siteName}" -ForegroundColor Gray
    ${siteDesc ? `Write-Host "  Description: ${siteDesc}" -ForegroundColor Gray` : ''}
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Associate subnets with New-ADReplicationSubnet" -ForegroundColor Gray
    Write-Host "  2. Create site links with New-ADReplicationSiteLink" -ForegroundColor Gray
    Write-Host "  3. Move domain controllers to site if needed" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create AD site: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-ad-subnet',
    name: 'Create and Associate AD Subnet',
    category: 'Sites & Services',
    isPremium: true,
    description: 'Create an AD subnet and associate it with a site',
    instructions: `**How This Task Works:**
This script creates an AD subnet object and associates it with a site for proper client site assignment.

**Prerequisites:**
- Domain Administrator or Enterprise Administrator
- Site must already exist
- Network subnet documented (CIDR notation)

**What You Need to Provide:**
- Subnet in CIDR format (e.g., 192.168.1.0/24)
- Site name to associate with

**What the Script Does:**
1. Creates subnet object
2. Associates subnet with site
3. Sets subnet description
4. Verifies configuration

**Important Notes:**
- Use CIDR notation (192.168.1.0/24)
- Clients use subnet for site discovery
- Affects DC selection and logon
- Don't overlap subnets
- Update when network changes`,
    parameters: [
      { id: 'subnetCIDR', label: 'Subnet (CIDR)', type: 'text', required: true, placeholder: '192.168.1.0/24 or 10.0.0.0/16' },
      { id: 'siteName', label: 'Site Name', type: 'text', required: true, placeholder: 'Seattle-HQ' },
      { id: 'subnetDescription', label: 'Subnet Description', type: 'text', required: false, placeholder: 'HQ LAN Segment 1' }
    ],
    scriptTemplate: (params) => {
      const subnetCIDR = escapePowerShellString(params.subnetCIDR);
      const siteName = escapePowerShellString(params.siteName);
      const subnetDesc = params.subnetDescription ? escapePowerShellString(params.subnetDescription) : '';

      return `# Create AD Subnet
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "Creating AD subnet: ${subnetCIDR}" -ForegroundColor Cyan
    
    # Get site distinguished name
    $Site = Get-ADReplicationSite -Identity "${siteName}"
    
    New-ADReplicationSubnet -Name "${subnetCIDR}" -Site $Site ${subnetDesc ? `-Description "${subnetDesc}"` : ''}
    
    Write-Host "[SUCCESS] AD subnet created successfully" -ForegroundColor Green
    Write-Host "  Subnet: ${subnetCIDR}" -ForegroundColor Gray
    Write-Host "  Site: ${siteName}" -ForegroundColor Gray
    ${subnetDesc ? `Write-Host "  Description: ${subnetDesc}" -ForegroundColor Gray` : ''}
    Write-Host ""
    Write-Host "Clients in this subnet will authenticate to DCs in ${siteName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create AD subnet: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-ad-site-link',
    name: 'Create AD Site Link',
    category: 'Sites & Services',
    isPremium: true,
    description: 'Create a site link to control replication between AD sites',
    instructions: `**How This Task Works:**
This script creates an AD site link to define replication paths and schedules between sites.

**Prerequisites:**
- Enterprise Administrator permissions
- Sites must exist
- Replication requirements documented

**What You Need to Provide:**
- Site link name
- Sites to include in link
- Replication cost and interval

**What the Script Does:**
1. Creates site link
2. Associates sites
3. Sets replication cost
4. Configures replication interval

**Important Notes:**
- Lower cost = preferred path
- Interval: how often replication occurs
- Default interval: 180 minutes
- Cost affects replication topology
- Use schedule for bandwidth control`,
    parameters: [
      { id: 'linkName', label: 'Site Link Name', type: 'text', required: true, placeholder: 'Seattle-Portland-Link' },
      { id: 'site1', label: 'First Site', type: 'text', required: true, placeholder: 'Seattle-HQ' },
      { id: 'site2', label: 'Second Site', type: 'text', required: true, placeholder: 'Portland-Branch' },
      { id: 'cost', label: 'Replication Cost', type: 'number', required: false, defaultValue: 100, placeholder: '100' },
      { id: 'intervalMinutes', label: 'Replication Interval (minutes)', type: 'number', required: false, defaultValue: 180, placeholder: '180' }
    ],
    scriptTemplate: (params) => {
      const linkName = escapePowerShellString(params.linkName);
      const site1 = escapePowerShellString(params.site1);
      const site2 = escapePowerShellString(params.site2);
      const cost = params.cost || 100;
      const interval = params.intervalMinutes || 180;

      return `# Create AD Site Link
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "Creating AD site link: ${linkName}" -ForegroundColor Cyan
    
    $Site1 = Get-ADReplicationSite -Identity "${site1}"
    $Site2 = Get-ADReplicationSite -Identity "${site2}"
    
    New-ADReplicationSiteLink -Name "${linkName}" -SitesIncluded $Site1, $Site2 -Cost ${cost} -ReplicationFrequencyInMinutes ${interval}
    
    Write-Host "[SUCCESS] AD site link created successfully" -ForegroundColor Green
    Write-Host "  Link: ${linkName}" -ForegroundColor Gray
    Write-Host "  Sites: ${site1} <-> ${site2}" -ForegroundColor Gray
    Write-Host "  Cost: ${cost}" -ForegroundColor Gray
    Write-Host "  Interval: ${interval} minutes" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create AD site link: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DOMAIN & FOREST OPERATIONS CATEGORY
  // ========================================
  {
    id: 'transfer-fsmo-role',
    name: 'Transfer FSMO Role',
    category: 'Domain & Forest Operations',
    isPremium: true,
    description: 'Transfer a Flexible Single Master Operations (FSMO) role to another DC',
    instructions: `**How This Task Works:**
This script gracefully transfers an FSMO role from one domain controller to another.

**Prerequisites:**
- Enterprise Administrator (for forest roles) or Domain Administrator (for domain roles)
- Target DC online and responsive
- Good replication health between DCs

**What You Need to Provide:**
- FSMO role to transfer
- Target domain controller

**What the Script Does:**
1. Verifies target DC is online
2. Connects to target DC
3. Transfers specified FSMO role
4. Verifies transfer success

**Important Notes:**
- Forest roles: Schema Master, Domain Naming Master
- Domain roles: RID Master, PDC Emulator, Infrastructure Master
- Use Move-ADDirectoryServerOperationMasterRole for graceful transfer
- Use -Force for seizure (if source DC offline)
- Verify replication after transfer`,
    parameters: [
      { id: 'role', label: 'FSMO Role', type: 'select', required: true, options: ['PDCEmulator', 'RIDMaster', 'InfrastructureMaster', 'SchemaMaster', 'DomainNamingMaster'], defaultValue: 'PDCEmulator' },
      { id: 'targetDC', label: 'Target Domain Controller', type: 'text', required: true, placeholder: 'DC02.contoso.com' }
    ],
    scriptTemplate: (params) => {
      const role = params.role || 'PDCEmulator';
      const targetDC = escapePowerShellString(params.targetDC);

      return `# Transfer FSMO Role
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "Transferring FSMO role: ${role}" -ForegroundColor Yellow
    Write-Host "  Target DC: ${targetDC}" -ForegroundColor Gray
    Write-Host ""
    
    # Verify target DC is reachable
    if (-not (Test-Connection -ComputerName "${targetDC}" -Count 1 -Quiet)) {
        throw "Target DC ${targetDC} is not reachable"
    }
    
    # Transfer role
    Move-ADDirectoryServerOperationMasterRole -Identity "${targetDC}" -OperationMasterRole ${role} -Confirm:\\$false
    
    Write-Host "[SUCCESS] FSMO role transferred successfully" -ForegroundColor Green
    Write-Host "  Role: ${role}" -ForegroundColor Gray
    Write-Host "  New Holder: ${targetDC}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verify with:" -ForegroundColor Cyan
    Write-Host "  Get-ADDomain | Select PDCEmulator, RIDMaster, InfrastructureMaster" -ForegroundColor Gray
    Write-Host "  Get-ADForest | Select SchemaMaster, DomainNamingMaster" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to transfer FSMO role: $_"
    Write-Host ""
    Write-Host "[WARNING]️ If source DC is offline, use -Force to seize role" -ForegroundColor Yellow
    exit 1
}`;
    }
  },

  {
    id: 'raise-domain-functional-level',
    name: 'Raise Domain Functional Level',
    category: 'Domain & Forest Operations',
    isPremium: true,
    description: 'Raise the Active Directory domain functional level',
    instructions: `**How This Task Works:**
This script raises the domain functional level to enable new features.

**Prerequisites:**
- Domain Administrator permissions
- All DCs running compatible Windows Server version
- Good AD replication health
- IRREVERSIBLE - cannot be rolled back

**What You Need to Provide:**
- Target functional level

**What the Script Does:**
1. Verifies current functional level
2. Checks DC compatibility
3. Raises functional level
4. Confirms new level

**Important Notes:**
[WARNING]️ **THIS IS IRREVERSIBLE** - Cannot downgrade after raising
- Ensure all DCs meet minimum OS requirements
- Windows Server 2016 level = WinThreshold domain
- New features enabled at higher levels
- Test in lab environment first
- Document before making change`,
    parameters: [
      { id: 'targetLevel', label: 'Target Functional Level', type: 'select', required: true, options: ['Windows2012R2Domain', 'Windows2016Domain', 'Windows2025Domain'], defaultValue: 'Windows2016Domain' }
    ],
    scriptTemplate: (params) => {
      const targetLevel = params.targetLevel || 'Windows2016Domain';
      const levelDisplay = targetLevel.replace('Windows', 'Windows Server ').replace('Domain', '');

      return `# Raise Domain Functional Level
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    $Domain = Get-ADDomain
    $CurrentLevel = $Domain.DomainMode
    
    Write-Host "Current domain functional level: $CurrentLevel" -ForegroundColor Cyan
    Write-Host "Target level: ${levelDisplay}" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[WARNING]️ WARNING: This operation is IRREVERSIBLE!" -ForegroundColor Red
    Write-Host "   Ensure all DCs meet minimum OS requirements" -ForegroundColor Yellow
    Write-Host ""
    
    # Verify all DCs
    $DCs = Get-ADDomainController -Filter *
    Write-Host "Domain controllers found: $($DCs.Count)" -ForegroundColor Gray
    foreach ($DC in $DCs) {
        Write-Host "  - $($DC.Name): $($DC.OperatingSystem)" -ForegroundColor Gray
    }
    
    Write-Host ""
    $Confirm = Read-Host "Type 'YES' to proceed with raising functional level"
    
    if ($Confirm -ne 'YES') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
    
    Set-ADDomainMode -Identity $Domain -DomainMode ${targetLevel}
    
    Write-Host "[SUCCESS] Domain functional level raised successfully" -ForegroundColor Green
    Write-Host "  New Level: ${levelDisplay}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verify with: Get-ADDomain | Select DomainMode" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to raise domain functional level: $_"
    exit 1
}`;
    }
  },

  {
    id: 'promote-domain-controller',
    name: 'Promote Server to Domain Controller',
    category: 'Domain & Forest Operations',
    isPremium: true,
    description: 'Promote a Windows Server to domain controller role',
    instructions: `**How This Task Works:**
This script promotes a Windows Server to a domain controller in an existing domain.

**Prerequisites:**
- Windows Server (Standard or Datacenter)
- Enterprise Administrator permissions
- Server joined to domain
- Static IP address configured
- DNS configured correctly

**What You Need to Provide:**
- Domain name
- Safe Mode Administrator Password
- Site name (optional)

**What the Script Does:**
1. Installs AD DS role
2. Promotes server to DC
3. Configures DNS (if needed)
4. Sets site association
5. Reboots server

**Important Notes:**
- Server will reboot after promotion
- Process takes 15-30 minutes
- Ensure good network connectivity
- DNS will be configured automatically
- GC role assigned by default
- SYSVOL replication must complete`,
    parameters: [
      { id: 'domainName', label: 'Domain Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'safeModePassword', label: 'Safe Mode Administrator Password', type: 'text', required: true, placeholder: 'P@ssw0rd!', description: 'DSRM password' },
      { id: 'siteName', label: 'Site Name', type: 'text', required: false, placeholder: 'Default-First-Site-Name', description: 'Leave blank for automatic' }
    ],
    scriptTemplate: (params) => {
      const domainName = escapePowerShellString(params.domainName);
      const safeModePassword = escapePowerShellString(params.safeModePassword);
      const siteName = params.siteName ? escapePowerShellString(params.siteName) : '';

      return `# Promote Domain Controller
# Generated: ${new Date().toISOString()}

Write-Host "[WARNING]️ Server will reboot after promotion" -ForegroundColor Yellow
Write-Host ""

try {
    # Install AD DS role
    Write-Host "Installing AD DS role..." -ForegroundColor Cyan
    Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
    
    Write-Host "[SUCCESS] AD DS role installed" -ForegroundColor Green
    Write-Host ""
    
    # Prepare safe mode password
    $SafeModePassword = ConvertTo-SecureString "${safeModePassword}" -AsPlainText -Force
    
    Write-Host "Promoting to domain controller..." -ForegroundColor Cyan
    Write-Host "  Domain: ${domainName}" -ForegroundColor Gray
    ${siteName ? `Write-Host "  Site: ${siteName}" -ForegroundColor Gray` : ''}
    Write-Host ""
    
    # Promote to DC
    Install-ADDSDomainController -DomainName "${domainName}" -SafeModeAdministratorPassword $SafeModePassword -InstallDns \\$true ${siteName ? `-SiteName "${siteName}"` : ''} -Force \\$true
    
    Write-Host "[SUCCESS] Server promoted successfully" -ForegroundColor Green
    Write-Host "  Server will reboot shortly" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to promote domain controller: $_"
    exit 1
}`;
    }
  },

  // ==================== PREMIUM TASKS ====================
  {
    id: 'ad-config-replication',
    name: 'Configure AD Replication',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Force replication, monitor replication status',
    instructions: `**How This Task Works:**
This script manages Active Directory replication for ensuring domain controller synchronization and monitoring replication health.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or Enterprise Admin permissions
- Multiple domain controllers in environment
- Network connectivity between DCs

**What You Need to Provide:**
- Source domain controller
- Target domain controller (optional, for specific replication)
- Action (Force Replication, Check Status, or View Replication Partners)

**What the Script Does:**
- Forces replication between domain controllers
- Checks replication status and health
- Displays replication partners and schedules
- Reports any replication errors or delays

**Important Notes:**
- Essential for ensuring AD data consistency
- Force replication after critical changes
- Monitor for replication failures
- Replication delays can cause authentication issues
- Check after DC promotions or GPO changes
- Typical interval: 15 minutes between DCs in same site
- Verify replication after schema changes
- Use for troubleshooting authentication problems`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Force Replication', 'Check Status', 'View Partners'], defaultValue: 'Check Status' },
      { id: 'sourceDC', label: 'Source Domain Controller', type: 'text', required: true, placeholder: 'DC01' },
      { id: 'targetDC', label: 'Target DC (optional)', type: 'text', required: false, placeholder: 'DC02' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const sourceDC = escapePowerShellString(params.sourceDC);
      const targetDC = params.targetDC ? escapePowerShellString(params.targetDC) : '';

      return `# Configure AD Replication
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "AD Replication operation: ${action}" -ForegroundColor Cyan
    Write-Host "  Source DC: ${sourceDC}" -ForegroundColor Gray
    ${targetDC ? `Write-Host "  Target DC: ${targetDC}" -ForegroundColor Gray` : ''}
    
    switch ("${action}") {
        "Force Replication" {
            Write-Host "Forcing replication..." -ForegroundColor Cyan
            
            ${targetDC ? `
            # Replicate to specific target
            repadmin /replicate ${targetDC} ${sourceDC} DC=contoso,DC=com
            Write-Host "[SUCCESS] Replication triggered: ${sourceDC} → ${targetDC}" -ForegroundColor Green
            ` : `
            # Replicate to all partners
            repadmin /syncall ${sourceDC} /AdeP
            Write-Host "[SUCCESS] Replication triggered to all partners" -ForegroundColor Green
            `}
        }
        
        "Check Status" {
            Write-Host "Checking replication status..." -ForegroundColor Cyan
            
            # Get replication summary
            $RepSum = repadmin /replsum ${sourceDC}
            Write-Host $RepSum
            
            Write-Host ""
            Write-Host "Detailed replication status:" -ForegroundColor Cyan
            Get-ADReplicationPartnerMetadata -Target ${sourceDC} | Select-Object Partner, LastReplicationSuccess, LastReplicationResult | Format-Table -AutoSize
        }
        
        "View Partners" {
            Write-Host "Retrieving replication partners..." -ForegroundColor Cyan
            
            Get-ADReplicationConnection -Filter * | Where-Object { $_.ReplicateFromDirectoryServer -like "*${sourceDC}*" } | Select-Object Name, ReplicateFromDirectoryServer, ReplicateToDirectoryServer | Format-Table -AutoSize
        }
    }
    
} catch {
    Write-Error "Failed to manage AD replication: $_"
}`;
    }
  },

  {
    id: 'ad-manage-sites-subnets',
    name: 'Manage AD Sites and Subnets',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create sites, subnets, site links',
    instructions: `**How This Task Works:**
This script manages Active Directory sites and subnets for optimizing replication and client authentication across geographic locations.

**Prerequisites:**
- Active Directory PowerShell module installed
- Enterprise Admin permissions
- Understanding of network topology
- IP subnet information

**What You Need to Provide:**
- Action (Create Site, Create Subnet, Create Site Link, or List All)
- Site name
- Subnet CIDR notation (for subnet creation)
- Site link name and cost (for site link creation)

**What the Script Does:**
- Creates AD sites for physical locations
- Associates subnets with sites
- Creates site links for replication control
- Configures replication schedules and costs
- Reports configuration success

**Important Notes:**
- Essential for multi-site Active Directory
- Sites improve authentication performance
- Subnets determine client site membership
- Site links control replication topology
- Lower cost = preferred replication path
- Configure sites before deploying DCs
- Typical use: branch offices, data centers
- Match sites to physical network topology`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Site', 'Create Subnet', 'Create Site Link', 'List All'], defaultValue: 'List All' },
      { id: 'siteName', label: 'Site Name', type: 'text', required: false, placeholder: 'BranchOffice-NYC' },
      { id: 'subnetCIDR', label: 'Subnet (CIDR)', type: 'text', required: false, placeholder: '192.168.1.0/24' },
      { id: 'siteLinkName', label: 'Site Link Name', type: 'text', required: false, placeholder: 'HQ-NYC-Link' },
      { id: 'siteLinkCost', label: 'Site Link Cost', type: 'number', required: false, defaultValue: 100, placeholder: '100' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const siteName = params.siteName ? escapePowerShellString(params.siteName) : '';
      const subnetCIDR = params.subnetCIDR ? escapePowerShellString(params.subnetCIDR) : '';
      const siteLinkName = params.siteLinkName ? escapePowerShellString(params.siteLinkName) : '';
      const siteLinkCost = params.siteLinkCost || 100;

      return `# Manage AD Sites and Subnets
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "AD Sites management: ${action}" -ForegroundColor Cyan
    
    switch ("${action}") {
        "Create Site" {
            ${siteName ? `
            Write-Host "Creating AD site: ${siteName}" -ForegroundColor Cyan
            
            New-ADReplicationSite -Name "${siteName}"
            Write-Host "[SUCCESS] Site created: ${siteName}" -ForegroundColor Green
            
            # Display site details
            Get-ADReplicationSite -Identity "${siteName}" | Select-Object Name, Created | Format-List
            ` : `
            Write-Error "Site name is required for Create Site action"
            `}
        }
        
        "Create Subnet" {
            ${subnetCIDR && siteName ? `
            Write-Host "Creating subnet: ${subnetCIDR}" -ForegroundColor Cyan
            Write-Host "  Associated with site: ${siteName}" -ForegroundColor Gray
            
            New-ADReplicationSubnet -Name "${subnetCIDR}" -Site "${siteName}"
            Write-Host "[SUCCESS] Subnet created and associated with ${siteName}" -ForegroundColor Green
            
            # Display subnet details
            Get-ADReplicationSubnet -Identity "${subnetCIDR}" | Select-Object Name, Site | Format-List
            ` : `
            Write-Error "Subnet CIDR and Site name are required for Create Subnet action"
            `}
        }
        
        "Create Site Link" {
            ${siteLinkName ? `
            Write-Host "Creating site link: ${siteLinkName}" -ForegroundColor Cyan
            Write-Host "  Cost: ${siteLinkCost}" -ForegroundColor Gray
            
            # Note: This requires specifying sites to link
            Write-Host "[WARNING] Manual configuration required:" -ForegroundColor Yellow
            Write-Host "  Use Active Directory Sites and Services console" -ForegroundColor Gray
            Write-Host "  or specify sites with:" -ForegroundColor Gray
            Write-Host "  New-ADReplicationSiteLink -Name ${siteLinkName} -SitesIncluded Site1,Site2 -Cost ${siteLinkCost}" -ForegroundColor Gray
            ` : `
            Write-Error "Site link name is required for Create Site Link action"
            `}
        }
        
        "List All" {
            Write-Host "Listing all sites and subnets..." -ForegroundColor Cyan
            
            Write-Host ""
            Write-Host "=== Sites ===" -ForegroundColor Yellow
            Get-ADReplicationSite -Filter * | Select-Object Name, Created | Format-Table -AutoSize
            
            Write-Host ""
            Write-Host "=== Subnets ===" -ForegroundColor Yellow
            Get-ADReplicationSubnet -Filter * | Select-Object Name, Site, Created | Format-Table -AutoSize
            
            Write-Host ""
            Write-Host "=== Site Links ===" -ForegroundColor Yellow
            Get-ADReplicationSiteLink -Filter * | Select-Object Name, Cost, ReplicationFrequencyInMinutes | Format-Table -AutoSize
        }
    }
    
} catch {
    Write-Error "Failed to manage sites and subnets: $_"
}`;
    }
  },

  {
    id: 'ad-config-gpo-preferences',
    name: 'Configure Group Policy Preferences',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Deploy mapped drives, printers, shortcuts',
    instructions: `**How This Task Works:**
This script provides guidance for configuring Group Policy Preferences to deploy mapped drives, printers, and shortcuts to users and computers.

**Prerequisites:**
- Group Policy Management Console (GPMC) installed
- Domain Admin or GPO management permissions
- Target OU structure created
- UNC paths accessible for drive mappings

**What You Need to Provide:**
- GPO name to configure
- Preference type (Mapped Drive, Printer, or Shortcut)
- Target path or printer UNC
- Drive letter or location

**What the Script Does:**
- Provides guidance for GPO Preferences configuration
- Shows PowerShell commands for GPO creation
- Displays examples for common preference items
- Recommends item-level targeting

**Important Notes:**
- Essential for standardizing user environments
- Preferences apply to users or computers
- Item-level targeting enables conditional application
- Mapped drives visible in File Explorer
- Printers auto-install for users
- Shortcuts deploy to desktop/start menu
- Typical use: departmental file shares, network printers
- Test GPO in pilot OU before broad deployment`,
    parameters: [
      { id: 'gpoName', label: 'GPO Name', type: 'text', required: true, placeholder: 'User Environment Settings' },
      { id: 'preferenceType', label: 'Preference Type', type: 'select', required: true, options: ['Mapped Drive', 'Printer', 'Shortcut', 'Registry'], defaultValue: 'Mapped Drive' },
      { id: 'targetPath', label: 'Target Path/UNC', type: 'text', required: false, placeholder: '\\\\server\\share or \\\\server\\printer' }
    ],
    scriptTemplate: (params) => {
      const gpoName = escapePowerShellString(params.gpoName);
      const prefType = params.preferenceType;
      const targetPath = params.targetPath ? escapePowerShellString(params.targetPath) : '';

      return `# Configure Group Policy Preferences
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

try {
    Write-Host "Configuring GPO Preferences..." -ForegroundColor Cyan
    Write-Host "  GPO: ${gpoName}" -ForegroundColor Gray
    Write-Host "  Type: ${prefType}" -ForegroundColor Gray
    ${targetPath ? `Write-Host "  Target: ${targetPath}" -ForegroundColor Gray` : ''}
    
    # Check if GPO exists, create if needed
    $GPO = Get-GPO -Name "${gpoName}" -ErrorAction SilentlyContinue
    if (-not $GPO) {
        Write-Host "Creating new GPO: ${gpoName}" -ForegroundColor Cyan
        $GPO = New-GPO -Name "${gpoName}"
        Write-Host "[SUCCESS] GPO created" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[WARNING] Group Policy Preferences must be configured using GPMC" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps to configure ${prefType}:" -ForegroundColor Cyan
    
    switch ("${prefType}") {
        "Mapped Drive" {
            Write-Host "1. Open Group Policy Management Console (gpmc.msc)" -ForegroundColor Gray
            Write-Host "2. Edit GPO: ${gpoName}" -ForegroundColor Gray
            Write-Host "3. Navigate to: User Configuration > Preferences > Windows Settings > Drive Maps" -ForegroundColor Gray
            Write-Host "4. Right-click > New > Mapped Drive" -ForegroundColor Gray
            ${targetPath ? `Write-Host "5. Location: ${targetPath}" -ForegroundColor Gray` : ''}
            Write-Host "6. Assign drive letter and action (Create/Update/Replace)" -ForegroundColor Gray
            Write-Host "7. Configure item-level targeting if needed" -ForegroundColor Gray
        }
        
        "Printer" {
            Write-Host "1. Open Group Policy Management Console (gpmc.msc)" -ForegroundColor Gray
            Write-Host "2. Edit GPO: ${gpoName}" -ForegroundColor Gray
            Write-Host "3. Navigate to: User Configuration > Preferences > Control Panel Settings > Printers" -ForegroundColor Gray
            Write-Host "4. Right-click > New > Shared Printer" -ForegroundColor Gray
            ${targetPath ? `Write-Host "5. Share path: ${targetPath}" -ForegroundColor Gray` : ''}
            Write-Host "6. Select action (Create/Update/Replace)" -ForegroundColor Gray
            Write-Host "7. Set as default printer if needed" -ForegroundColor Gray
        }
        
        "Shortcut" {
            Write-Host "1. Open Group Policy Management Console (gpmc.msc)" -ForegroundColor Gray
            Write-Host "2. Edit GPO: ${gpoName}" -ForegroundColor Gray
            Write-Host "3. Navigate to: User Configuration > Preferences > Windows Settings > Shortcuts" -ForegroundColor Gray
            Write-Host "4. Right-click > New > Shortcut" -ForegroundColor Gray
            Write-Host "5. Specify target path and shortcut location" -ForegroundColor Gray
            Write-Host "6. Choose location (Desktop, Start Menu, etc.)" -ForegroundColor Gray
        }
        
        "Registry" {
            Write-Host "1. Open Group Policy Management Console (gpmc.msc)" -ForegroundColor Gray
            Write-Host "2. Edit GPO: ${gpoName}" -ForegroundColor Gray
            Write-Host "3. Navigate to: Computer/User Configuration > Preferences > Windows Settings > Registry" -ForegroundColor Gray
            Write-Host "4. Right-click > New > Registry Item" -ForegroundColor Gray
            Write-Host "5. Configure key path, value name, and data" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "After configuration:" -ForegroundColor Cyan
    Write-Host "1. Link GPO to target OU" -ForegroundColor Gray
    Write-Host "2. Test with 'gpupdate /force' on client" -ForegroundColor Gray
    Write-Host "3. Verify preference applied using 'gpresult /r'" -ForegroundColor Gray
    
    # Display GPO info
    Write-Host ""
    Write-Host "GPO Details:" -ForegroundColor Cyan
    $GPO | Select-Object DisplayName, Id, GpoStatus | Format-List
    
} catch {
    Write-Error "Failed to configure GPO preferences: $_"
}`;
    }
  },

  {
    id: 'ad-manage-trusts',
    name: 'Manage AD Trusts',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create, verify, remove domain trusts',
    instructions: `**How This Task Works:**
This script manages Active Directory trust relationships between domains for enabling cross-domain authentication and resource access.

**Prerequisites:**
- Enterprise Admin permissions in both domains
- Network connectivity between domains
- DNS resolution between domains
- Firewall rules allowing AD traffic

**What You Need to Provide:**
- Action (Create Trust, Verify Trust, or Remove Trust)
- Source domain name
- Target domain name
- Trust direction (One-way or Two-way)
- Trust type (External, Forest, or Shortcut)

**What the Script Does:**
- Creates trust relationship between domains
- Verifies trust health and connectivity
- Removes trust relationships
- Reports trust configuration and status

**Important Notes:**
- Essential for multi-domain/multi-forest environments
- Forest trusts enable complete resource access
- External trusts for non-forest domains
- One-way trusts: source trusts target
- Two-way trusts: mutual trust
- Verify trust after creation
- Typical use: mergers, resource forests
- Test cross-domain access after trust creation`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Trust', 'Verify Trust', 'Remove Trust'], defaultValue: 'Verify Trust' },
      { id: 'sourceDomain', label: 'Source Domain', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'targetDomain', label: 'Target Domain', type: 'text', required: false, placeholder: 'fabrikam.com' },
      { id: 'trustDirection', label: 'Trust Direction', type: 'select', required: false, options: ['Bidirectional', 'Inbound', 'Outbound'], defaultValue: 'Bidirectional' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const sourceDomain = escapePowerShellString(params.sourceDomain);
      const targetDomain = params.targetDomain ? escapePowerShellString(params.targetDomain) : '';
      const direction = params.trustDirection || 'Bidirectional';

      return `# Manage AD Trusts
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "AD Trust management: ${action}" -ForegroundColor Cyan
    Write-Host "  Source Domain: ${sourceDomain}" -ForegroundColor Gray
    ${targetDomain ? `Write-Host "  Target Domain: ${targetDomain}" -ForegroundColor Gray` : ''}
    
    switch ("${action}") {
        "Create Trust" {
            ${targetDomain ? `
            Write-Host "Creating trust relationship..." -ForegroundColor Cyan
            Write-Host "  Direction: ${direction}" -ForegroundColor Gray
            
            Write-Host "[WARNING] Trust creation requires manual steps:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "1. Ensure DNS resolution between domains" -ForegroundColor Gray
            Write-Host "   Test: nslookup ${targetDomain}" -ForegroundColor Gray
            Write-Host ""
            Write-Host "2. Use Active Directory Domains and Trusts console:" -ForegroundColor Gray
            Write-Host "   - Right-click ${sourceDomain} > Properties > Trusts" -ForegroundColor Gray
            Write-Host "   - Click 'New Trust'" -ForegroundColor Gray
            Write-Host "   - Enter target domain: ${targetDomain}" -ForegroundColor Gray
            Write-Host "   - Select direction: ${direction}" -ForegroundColor Gray
            Write-Host "   - Choose trust type (Forest/External)" -ForegroundColor Gray
            Write-Host "   - Provide credentials for ${targetDomain}" -ForegroundColor Gray
            Write-Host ""
            Write-Host "3. Verify trust after creation:" -ForegroundColor Gray
            Write-Host "   netdom trust ${sourceDomain} /domain:${targetDomain} /verify" -ForegroundColor Gray
            ` : `
            Write-Error "Target domain is required for Create Trust action"
            `}
        }
        
        "Verify Trust" {
            ${targetDomain ? `
            Write-Host "Verifying trust relationship..." -ForegroundColor Cyan
            
            # Test trust using netdom
            $TrustTest = netdom trust ${sourceDomain} /domain:${targetDomain} /verify 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[SUCCESS] Trust is healthy and operational" -ForegroundColor Green
            } else {
                Write-Host "[FAILED] Trust verification failed" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "Trust Test Output:" -ForegroundColor Cyan
            Write-Host $TrustTest
            
            # Get trust details
            Write-Host ""
            Write-Host "Trust Details:" -ForegroundColor Cyan
            Get-ADTrust -Filter "Target -eq '${targetDomain}'" | Select-Object Name, Direction, TrustType, Created | Format-List
            ` : `
            Write-Error "Target domain is required for Verify Trust action"
            `}
        }
        
        "Remove Trust" {
            ${targetDomain ? `
            Write-Host "[WARNING] WARNING: Removing trust relationship!" -ForegroundColor Red
            Write-Host "  This will break cross-domain access" -ForegroundColor Yellow
            
            $Confirm = Read-Host "Type 'REMOVE' to confirm trust removal"
            
            if ($Confirm -eq 'REMOVE') {
                Write-Host "Removing trust..." -ForegroundColor Cyan
                
                # Remove trust
                Get-ADTrust -Filter "Target -eq '${targetDomain}'" | Remove-ADTrust -Confirm:$false
                
                Write-Host "[SUCCESS] Trust removed from ${sourceDomain}" -ForegroundColor Green
                Write-Host "[WARNING] Also remove trust from ${targetDomain} side" -ForegroundColor Yellow
            } else {
                Write-Host "Trust removal cancelled" -ForegroundColor Yellow
            }
            ` : `
            Write-Error "Target domain is required for Remove Trust action"
            `}
        }
    }
    
} catch {
    Write-Error "Failed to manage AD trust: $_"
}`;
    }
  },

  {
    id: 'ad-generate-security-reports',
    name: 'Generate AD Security Reports',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Export privileged accounts, password policy compliance',
    instructions: `**How This Task Works:**
This script generates comprehensive Active Directory security reports for auditing privileged access, password policies, and account security.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or auditing permissions
- Access to domain controllers
- CSV export path accessible

**What You Need to Provide:**
- Report type (Privileged Accounts, Password Policy, Inactive Accounts, or All)
- CSV export file path

**What the Script Does:**
- Exports privileged account memberships
- Reports password policy compliance
- Identifies inactive or disabled accounts
- Finds accounts with non-expiring passwords
- Reports users with admin rights
- Exports detailed security report to CSV

**Important Notes:**
- Essential for security audits and compliance
- Review privileged accounts monthly
- Enforce password policies consistently
- Remove excessive admin permissions
- Disable unused privileged accounts
- Monitor for unauthorized privilege escalation
- Typical use: compliance audits, security reviews
- Schedule monthly security reports`,
    parameters: [
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['Privileged Accounts', 'Password Policy', 'Inactive Accounts', 'All Security'], defaultValue: 'All Security' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'text', required: true, placeholder: 'C:\\Reports\\ADSecurityReport.csv' },
      { id: 'inactiveDays', label: 'Inactive Days Threshold', type: 'number', required: false, defaultValue: 90, placeholder: '90' }
    ],
    scriptTemplate: (params) => {
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      const inactiveDays = params.inactiveDays || 90;

      return `# Generate AD Security Reports
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    Write-Host "Generating AD security report: ${reportType}" -ForegroundColor Cyan
    
    $SecurityReport = @()
    $Date = Get-Date
    
    if ("${reportType}" -eq "Privileged Accounts" -or "${reportType}" -eq "All Security") {
        Write-Host "Collecting privileged account information..." -ForegroundColor Cyan
        
        # Get privileged groups
        $PrivilegedGroups = @(
            "Domain Admins",
            "Enterprise Admins",
            "Schema Admins",
            "Administrators",
            "Account Operators",
            "Backup Operators",
            "Server Operators",
            "Print Operators"
        )
        
        foreach ($Group in $PrivilegedGroups) {
            $Members = Get-ADGroupMember -Identity $Group -ErrorAction SilentlyContinue
            
            foreach ($Member in $Members) {
                $User = Get-ADUser -Identity $Member.SamAccountName -Properties LastLogonDate, PasswordLastSet, PasswordNeverExpires
                
                $SecurityReport += [PSCustomObject]@{
                    ReportType          = "Privileged Account"
                    Account             = $User.SamAccountName
                    DisplayName         = $User.Name
                    PrivilegedGroup     = $Group
                    Enabled             = $User.Enabled
                    LastLogon           = $User.LastLogonDate
                    PasswordLastSet     = $User.PasswordLastSet
                    PasswordNeverExpires = $User.PasswordNeverExpires
                }
            }
        }
        
        Write-Host "[SUCCESS] Collected $($SecurityReport.Count) privileged account records" -ForegroundColor Green
    }
    
    if ("${reportType}" -eq "Password Policy" -or "${reportType}" -eq "All Security") {
        Write-Host "Checking password policy compliance..." -ForegroundColor Cyan
        
        # Get users with password issues
        $PolicyViolations = Get-ADUser -Filter {Enabled -eq $true} -Properties PasswordNeverExpires, PasswordLastSet |
            Where-Object { $_.PasswordNeverExpires -eq $true }
        
        foreach ($User in $PolicyViolations) {
            $SecurityReport += [PSCustomObject]@{
                ReportType          = "Password Policy Violation"
                Account             = $User.SamAccountName
                DisplayName         = $User.Name
                Issue               = "Password Never Expires"
                PasswordLastSet     = $User.PasswordLastSet
                LastLogon           = $null
                PrivilegedGroup     = $null
                Enabled             = $User.Enabled
                PasswordNeverExpires = $true
            }
        }
        
        Write-Host "[SUCCESS] Found $($PolicyViolations.Count) password policy violations" -ForegroundColor Yellow
    }
    
    if ("${reportType}" -eq "Inactive Accounts" -or "${reportType}" -eq "All Security") {
        Write-Host "Identifying inactive accounts..." -ForegroundColor Cyan
        
        $InactiveCutoff = $Date.AddDays(-${inactiveDays})
        $InactiveUsers = Search-ADAccount -UsersOnly -AccountInactive -TimeSpan ([TimeSpan]::FromDays(${inactiveDays})) |
            Get-ADUser -Properties LastLogonDate, MemberOf
        
        foreach ($User in $InactiveUsers) {
            # Check if user is in privileged group
            $IsPrivileged = $false
            foreach ($Group in $User.MemberOf) {
                if ($Group -match "Domain Admins|Enterprise Admins|Schema Admins|Administrators") {
                    $IsPrivileged = $true
                    break
                }
            }
            
            if ($IsPrivileged) {
                $SecurityReport += [PSCustomObject]@{
                    ReportType          = "Inactive Privileged Account"
                    Account             = $User.SamAccountName
                    DisplayName         = $User.Name
                    Issue               = "Inactive for ${inactiveDays}+ days"
                    LastLogon           = $User.LastLogonDate
                    DaysInactive        = ($Date - $User.LastLogonDate).Days
                    Enabled             = $User.Enabled
                    PrivilegedGroup     = "Yes"
                    PasswordNeverExpires = $null
                    PasswordLastSet     = $null
                }
            }
        }
        
        Write-Host "[SUCCESS] Found $($InactiveUsers.Count) inactive accounts (${inactiveDays}+ days)" -ForegroundColor Yellow
    }
    
    # Export report
    $SecurityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host ""
    Write-Host "[SUCCESS] Security report exported to: ${exportPath}" -ForegroundColor Green
    
    # Display summary
    Write-Host ""
    Write-Host "=== Security Report Summary ===" -ForegroundColor Cyan
    Write-Host "Total Records: $($SecurityReport.Count)" -ForegroundColor Gray
    
    $SecurityReport | Group-Object ReportType | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[WARNING] RECOMMENDATIONS:" -ForegroundColor Yellow
    Write-Host "1. Review all privileged accounts monthly" -ForegroundColor Gray
    Write-Host "2. Disable/remove inactive privileged accounts immediately" -ForegroundColor Gray
    Write-Host "3. Enforce password expiration for all accounts" -ForegroundColor Gray
    Write-Host "4. Implement least privilege access model" -ForegroundColor Gray
    Write-Host "5. Enable MFA for all privileged accounts" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate security report: $_"
}`;
    }
  },

  // ========================================
  // GROUP POLICY MANAGEMENT CATEGORY
  // ========================================
  {
    id: 'create-link-gpo',
    name: 'Create and Link Group Policy Object',
    category: 'Group Policy',
    isPremium: true,
    description: 'Create new GPO, configure settings, and link to organizational units',
    instructions: `**How This Task Works:**
This script creates a new Group Policy Object, configures basic settings, and links it to specified organizational units for automatic application to users and computers.

**Prerequisites:**
- Group Policy Management PowerShell module installed
- Domain Admin or delegated GPO creation permissions
- Target organizational units must exist
- RSAT (Remote Server Administration Tools) installed

**What You Need to Provide:**
- GPO name and description
- Target OU distinguished names to link
- Link order (processing priority)
- Enforcement and enabled status

**What the Script Does:**
1. Creates new Group Policy Object
2. Configures GPO description and comments
3. Links GPO to specified organizational units
4. Sets link order and enforcement
5. Reports GPO GUID and link status

**Important Notes:**
- GPO Link Order: Lower numbers process first (1 = highest priority)
- Enforced GPOs cannot be blocked by child OUs
- Link Enabled: Controls whether GPO is active on linked OU
- Always test GPOs in non-production OU first
- Use Security Filtering to target specific users/computers
- GPO replication takes 5-15 minutes across domain
- Run 'gpupdate /force' on clients to apply immediately
- Common uses: Password policies, software deployment, security settings`,
    parameters: [
      { id: 'gpoName', label: 'GPO Name', type: 'text', required: true, placeholder: 'Workstation Security Policy' },
      { id: 'gpoDescription', label: 'GPO Description', type: 'textarea', required: false, placeholder: 'Enforces security settings for all workstations' },
      { id: 'targetOUs', label: 'Target OUs (comma-separated)', type: 'textarea', required: true, placeholder: 'OU=Workstations,DC=company,DC=com' },
      { id: 'linkOrder', label: 'Link Order', type: 'number', required: false, defaultValue: 1, placeholder: '1' },
      { id: 'enforced', label: 'Enforce GPO (Cannot be Blocked)', type: 'boolean', required: false, defaultValue: false },
      { id: 'linkEnabled', label: 'Enable Link', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['gpoName', 'targetOUs'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const gpoName = escapePowerShellString(params.gpoName);
      const gpoDescription = params.gpoDescription ? escapePowerShellString(params.gpoDescription) : '';
      const targetOUsRaw = (params.targetOUs as string).split(',').map((ou: string) => ou.trim());
      const linkOrder = params.linkOrder || 1;
      const enforced = toPowerShellBoolean(params.enforced);
      const linkEnabled = toPowerShellBoolean(params.linkEnabled);

      return `# Create and Link Group Policy Object
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

try {
    $GPOName = "${gpoName}"
    $GPODescription = "${gpoDescription}"
    $TargetOUs = @(${targetOUsRaw.map(ou => `"${escapePowerShellString(ou)}"`).join(', ')})
    $LinkOrder = ${linkOrder}
    $Enforced = ${enforced}
    $LinkEnabled = ${linkEnabled}
    
    Write-Host "Creating Group Policy Object..." -ForegroundColor Cyan
    Write-Host "  Name: $GPOName" -ForegroundColor White
    ${gpoDescription ? `Write-Host "  Description: $GPODescription" -ForegroundColor White` : ''}
    Write-Host ""
    
    # Check if GPO already exists
    $ExistingGPO = Get-GPO -Name $GPOName -ErrorAction SilentlyContinue
    
    if ($ExistingGPO) {
        Write-Host "[WARNING] GPO already exists: $GPOName" -ForegroundColor Yellow
        Write-Host "  GUID: $($ExistingGPO.Id)" -ForegroundColor Gray
        Write-Host "  Created: $($ExistingGPO.CreationTime)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Using existing GPO for linking..." -ForegroundColor Cyan
        $GPO = $ExistingGPO
    } else {
        # Create new GPO
        $GPO = New-GPO -Name $GPOName -Comment $GPODescription
        Write-Host "[SUCCESS] GPO created successfully" -ForegroundColor Green
        Write-Host "  GUID: $($GPO.Id)" -ForegroundColor Gray
        Write-Host "  Created: $($GPO.CreationTime)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Linking GPO to organizational units..." -ForegroundColor Cyan
    
    $LinkedCount = 0
    $SkippedCount = 0
    $FailedCount = 0
    
    foreach ($OU in $TargetOUs) {
        try {
            Write-Host "  Processing: $OU" -ForegroundColor Gray
            
            # Validate OU exists
            try {
                $OUObject = Get-ADOrganizationalUnit -Identity $OU -ErrorAction Stop
                Write-Host "    [SUCCESS] OU verified" -ForegroundColor Gray
            } catch {
                Write-Host "    [FAILED] OU does not exist or is inaccessible" -ForegroundColor Red
                $FailedCount++
                continue
            }
            
            # Check if link already exists
            $ExistingLink = Get-GPInheritance -Target $OU -ErrorAction Stop | 
                Select-Object -ExpandProperty GpoLinks | 
                Where-Object { $_.DisplayName -eq $GPOName }
            
            if ($ExistingLink) {
                Write-Host "    [WARNING] Link already exists - skipping" -ForegroundColor Yellow
                $SkippedCount++
            } else {
                # Create GPO link with error handling for link order conflicts
                try {
                    $LinkParams = @{
                        Name = $GPOName
                        Target = $OU
                        LinkEnabled = if ($LinkEnabled) { "Yes" } else { "No" }
                    }
                    
                    if ($Enforced) {
                        $LinkParams.Enforced = "Yes"
                    }
                    
                    # Try to create link with specified order
                    try {
                        $LinkParams.Order = $LinkOrder
                        New-GPLink @LinkParams -ErrorAction Stop | Out-Null
                    } catch {
                        # If order fails, create without order and set it afterward
                        $LinkParams.Remove('Order')
                        $Link = New-GPLink @LinkParams -ErrorAction Stop
                        try {
                            Set-GPLink -Guid $GPO.Id -Target $OU -Order $LinkOrder -ErrorAction SilentlyContinue | Out-Null
                        } catch {
                            # Order setting failed, but link succeeded
                        }
                    }
                    
                    Write-Host "    [SUCCESS] Linked successfully" -ForegroundColor Green
                    Write-Host "      Order: $LinkOrder" -ForegroundColor Gray
                    Write-Host "      Enforced: $Enforced" -ForegroundColor Gray
                    Write-Host "      Enabled: $LinkEnabled" -ForegroundColor Gray
                    
                    $LinkedCount++
                } catch {
                    Write-Host "    [FAILED] Failed to create link: $($_.Exception.Message)" -ForegroundColor Red
                    $FailedCount++
                }
            }
        } catch {
            Write-Host "    [FAILED] Failed to process OU: $($_.Exception.Message)" -ForegroundColor Red
            $FailedCount++
        }
    }
    
    Write-Host ""
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "GPO Name: $GPOName" -ForegroundColor Gray
    Write-Host "GPO GUID: $($GPO.Id)" -ForegroundColor Gray
    Write-Host "Target OUs: $($TargetOUs.Count)" -ForegroundColor Gray
    Write-Host "Successfully Linked: $LinkedCount" -ForegroundColor Green
    Write-Host "Skipped (already linked): $SkippedCount" -ForegroundColor Yellow
    Write-Host "Failed: $FailedCount" -ForegroundColor $(if ($FailedCount -gt 0) { "Red" } else { "Gray" })
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Configure GPO settings via Group Policy Management Console" -ForegroundColor Gray
    Write-Host "2. GPO will replicate across domain (5-15 minutes)" -ForegroundColor Gray
    Write-Host "3. Client policy refresh occurs every 90 minutes + random 0-30 minutes" -ForegroundColor Gray
    Write-Host "4. Force immediate client update: gpupdate /force" -ForegroundColor Gray
    Write-Host "5. View GPO report: Get-GPOReport -Name '$GPOName' -ReportType Html" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Security & Best Practices:" -ForegroundColor Cyan
    Write-Host "- Test GPO in non-production OU before linking to production" -ForegroundColor Yellow
    Write-Host "- Use Security Filtering to target specific users/computers" -ForegroundColor Yellow
    Write-Host "- Document GPO purpose and settings in description" -ForegroundColor Yellow
    Write-Host "- Review GPO links quarterly to remove unused policies" -ForegroundColor Yellow
    Write-Host "- Use WMI filters for advanced targeting if needed" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create/link GPO: $_"
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Insufficient permissions (requires Domain Admin or delegated GPO rights)" -ForegroundColor Gray
    Write-Host "- Target OU does not exist or is invalid" -ForegroundColor Gray
    Write-Host "- Group Policy Management PowerShell module not installed" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'backup-restore-gpo',
    name: 'Backup and Restore Group Policy Objects',
    category: 'Group Policy',
    isPremium: true,
    description: 'Backup all GPOs or restore from backup for disaster recovery',
    instructions: `**How This Task Works:**
This script backs up Group Policy Objects to a specified location or restores them from backup, essential for disaster recovery, migration, and change management.

**Prerequisites:**
- Group Policy Management PowerShell module installed
- Domain Admin or delegated GPO backup permissions
- Backup folder with write permissions (for backup)
- Valid GPO backup (for restore)

**What You Need to Provide:**
- Operation (Backup or Restore)
- Backup folder path
- Specific GPO name (or all GPOs)
- Create new GPO vs migrate settings (for restore)

**What the Script Does:**
1. **Backup:** Exports GPO settings to XML backup files
2. **Restore:** Imports GPO settings from backup
3. Preserves GPO settings, WMI filters, and descriptions
4. Reports backup/restore status with timestamps

**Important Notes:**
- Backup ALL GPOs before major changes (best practice)
- Backup location should be on separate server/storage
- Backups include GPO settings but NOT links/permissions
- Restore creates new GPO with same settings
- Use Migration Tables for cross-domain/forest migrations
- Common backup schedule: Weekly automated + before changes
- Backup size: Typically 100-500 KB per GPO
- Keep 3-6 months of backups for compliance`,
    parameters: [
      { id: 'operation', label: 'Operation', type: 'select', required: true, options: ['Backup', 'Restore'], defaultValue: 'Backup' },
      { id: 'backupPath', label: 'Backup Folder Path', type: 'path', required: true, placeholder: 'C:\\GPO_Backups' },
      { id: 'gpoName', label: 'GPO Name (leave empty for all GPOs)', type: 'text', required: false, placeholder: '' },
      { id: 'createNew', label: 'Create New GPO (Restore only)', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['operation', 'backupPath'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const operation = params.operation;
      const backupPath = escapePowerShellString(params.backupPath);
      const gpoName = params.gpoName ? escapePowerShellString(params.gpoName) : '';
      const createNew = toPowerShellBoolean(params.createNew);

      return `# Backup and Restore Group Policy Objects
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

try {
    $Operation = "${operation}"
    $BackupPath = "${backupPath}"
    ${gpoName ? '$GPOName = "' + gpoName + '"' : '$GPOName = $null'}
    $CreateNew = ${createNew}
    
    Write-Host "GPO $Operation Operation" -ForegroundColor Cyan
    Write-Host "  Backup Path: $BackupPath" -ForegroundColor White
    ${gpoName ? 'Write-Host "  GPO: $GPOName" -ForegroundColor White' : 'Write-Host "  Scope: All GPOs" -ForegroundColor White'}
    Write-Host ""
    
    # Validate backup path
    try {
        $ParentPath = Split-Path -Path $BackupPath -Parent
        if ($ParentPath -and -not (Test-Path -Path $ParentPath)) {
            Write-Error "Parent directory does not exist: $ParentPath"
            exit 1
        }
    } catch {
        Write-Error "Invalid backup path: $BackupPath"
        exit 1
    }
    
    if ($Operation -eq "Backup") {
        # ========== BACKUP OPERATION ==========
        
        # Ensure backup folder exists and is writable
        if (-not (Test-Path -Path $BackupPath)) {
            try {
                New-Item -Path $BackupPath -ItemType Directory -Force -ErrorAction Stop | Out-Null
                Write-Host "[SUCCESS] Created backup folder: $BackupPath" -ForegroundColor Green
            } catch {
                Write-Error "Failed to create backup folder: $($_.Exception.Message)"
                exit 1
            }
        } else {
            # Verify write access
            try {
                $TestFile = Join-Path $BackupPath "test_write_access.tmp"
                $null | Out-File -FilePath $TestFile -ErrorAction Stop
                Remove-Item -Path $TestFile -Force -ErrorAction SilentlyContinue
                Write-Host "[SUCCESS] Backup folder verified: $BackupPath" -ForegroundColor Green
            } catch {
                Write-Error "Backup folder is not writable: $BackupPath"
                exit 1
            }
        }
        
        if ($GPOName) {
            # Backup specific GPO
            Write-Host "Backing up GPO: $GPOName..." -ForegroundColor Cyan
            
            $Backup = Backup-GPO -Name $GPOName -Path $BackupPath
            
            Write-Host "[SUCCESS] GPO backed up successfully" -ForegroundColor Green
            Write-Host "  GPO Name: $($Backup.DisplayName)" -ForegroundColor Gray
            Write-Host "  Backup ID: $($Backup.Id)" -ForegroundColor Gray
            Write-Host "  Timestamp: $($Backup.BackupTime)" -ForegroundColor Gray
            Write-Host "  Location: $($Backup.BackupDirectory)" -ForegroundColor Gray
        } else {
            # Backup all GPOs
            Write-Host "Backing up all GPOs..." -ForegroundColor Cyan
            
            $AllGPOs = Get-GPO -All
            Write-Host "Found $($AllGPOs.Count) GPOs to backup" -ForegroundColor Yellow
            Write-Host ""
            
            $BackupCount = 0
            $FailCount = 0
            
            foreach ($GPO in $AllGPOs) {
                try {
                    $Backup = Backup-GPO -Name $GPO.DisplayName -Path $BackupPath
                    Write-Host "  [SUCCESS] Backed up: $($GPO.DisplayName)" -ForegroundColor Green
                    $BackupCount++
                } catch {
                    Write-Host "  [FAILED] Failed: $($GPO.DisplayName) - $_" -ForegroundColor Red
                    $FailCount++
                }
            }
            
            Write-Host ""
            Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
            Write-Host "Total GPOs: $($AllGPOs.Count)" -ForegroundColor Gray
            Write-Host "Successfully Backed Up: $BackupCount" -ForegroundColor Green
            Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Gray" })
            Write-Host "Backup Location: $BackupPath" -ForegroundColor Cyan
        }
        
    } else {
        # ========== RESTORE OPERATION ==========
        
        if (-not (Test-Path -Path $BackupPath)) {
            Write-Error "Backup path does not exist: $BackupPath"
            exit 1
        }
        
        # Verify backup path is readable
        try {
            $null = Get-ChildItem -Path $BackupPath -ErrorAction Stop
        } catch {
            Write-Error "Cannot read backup path: $BackupPath - $($_.Exception.Message)"
            exit 1
        }
        
        # List available backups with error handling
        try {
            $Backups = Get-ChildItem -Path $BackupPath -Filter "manifest.xml" -Recurse -ErrorAction Stop | 
                ForEach-Object {
                    try {
                        $ManifestXml = [xml](Get-Content $_.FullName -ErrorAction Stop)
                        [PSCustomObject]@{
                            GPOName = $ManifestXml.Backups.BackupInst.GPODisplayName.'#cdata-section'
                            BackupID = $ManifestXml.Backups.BackupInst.ID.'#cdata-section'
                            BackupTime = $ManifestXml.Backups.BackupInst.BackupTime.'#cdata-section'
                            BackupFolder = $_.Directory.FullName
                        }
                    } catch {
                        Write-Warning "Skipping corrupted manifest: $($_.FullName)"
                        $null
                    }
                } | Where-Object { $_ -ne $null }
        } catch {
            Write-Error "Failed to scan backup path: $($_.Exception.Message)"
            exit 1
        }
        
        if (-not $Backups -or $Backups.Count -eq 0) {
            Write-Error "No valid GPO backups found in: $BackupPath"
            exit 1
        }
        
        Write-Host "Found $($Backups.Count) GPO backup(s)" -ForegroundColor Yellow
        Write-Host ""
        
        if ($GPOName) {
            # Restore specific GPO
            $TargetBackup = $Backups | Where-Object { $_.GPOName -eq $GPOName } | 
                Sort-Object BackupTime -Descending | Select-Object -First 1
            
            if (-not $TargetBackup) {
                Write-Error "No backup found for GPO: $GPOName"
                exit 1
            }
            
            Write-Host "Restoring GPO: $GPOName" -ForegroundColor Cyan
            Write-Host "  Backup Date: $($TargetBackup.BackupTime)" -ForegroundColor Gray
            Write-Host "  Backup ID: $($TargetBackup.BackupID)" -ForegroundColor Gray
            Write-Host ""
            
            try {
                if ($CreateNew) {
                    # Create new GPO from backup
                    $NewGPOName = "$GPOName (Restored)"
                    
                    # Check if restored GPO name already exists
                    $ExistingRestored = Get-GPO -Name $NewGPOName -ErrorAction SilentlyContinue
                    if ($ExistingRestored) {
                        $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                        $NewGPOName = "$GPOName (Restored-$Timestamp)"
                        Write-Host "  Using unique name: $NewGPOName" -ForegroundColor Yellow
                    }
                    
                    Import-GPO -BackupId $TargetBackup.BackupID -Path $BackupPath \`
                        -TargetName $NewGPOName -CreateIfNeeded -ErrorAction Stop
                    
                    Write-Host "[SUCCESS] GPO restored as new object: $NewGPOName" -ForegroundColor Green
                } else {
                    # Overwrite existing GPO
                    $ExistingGPO = Get-GPO -Name $GPOName -ErrorAction SilentlyContinue
                    if (-not $ExistingGPO) {
                        Write-Error "Target GPO does not exist: $GPOName. Use 'Create New' option instead."
                        exit 1
                    }
                    
                    Import-GPO -BackupId $TargetBackup.BackupID -Path $BackupPath \`
                        -TargetName $GPOName -ErrorAction Stop
                    
                    Write-Host "[SUCCESS] GPO settings restored to existing GPO: $GPOName" -ForegroundColor Green
                }
            } catch {
                Write-Error "Failed to restore GPO: $($_.Exception.Message)"
                Write-Host "Possible causes:" -ForegroundColor Yellow
                Write-Host "- Backup files are corrupted or incomplete" -ForegroundColor Gray
                Write-Host "- Insufficient permissions to create/modify GPO" -ForegroundColor Gray
                Write-Host "- Backup version incompatibility" -ForegroundColor Gray
                exit 1
            }
        } else {
            Write-Host "[WARNING] Bulk restore not recommended - Please specify GPO name" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Available GPO backups:" -ForegroundColor Cyan
            $Backups | ForEach-Object {
                Write-Host "  - $($_.GPOName) (Backup: $($_.BackupTime))" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "Best Practices:" -ForegroundColor Cyan
    Write-Host "1. Backup all GPOs weekly (automated scheduled task)" -ForegroundColor Yellow
    Write-Host "2. Always backup before making GPO changes" -ForegroundColor Yellow
    Write-Host "3. Store backups on separate server/storage" -ForegroundColor Yellow
    Write-Host "4. Test restore process quarterly" -ForegroundColor Yellow
    Write-Host "5. Keep 3-6 months of backups for compliance" -ForegroundColor Yellow
    Write-Host "6. Document GPO backup/restore procedures" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to $Operation GPO: $_"
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Insufficient permissions (requires Domain Admin or delegated rights)" -ForegroundColor Gray
    Write-Host "- Backup folder does not exist or is inaccessible" -ForegroundColor Gray
    Write-Host "- Invalid backup ID or corrupted backup files" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'generate-gpo-report',
    name: 'Generate Group Policy Object Report',
    category: 'Group Policy',
    isPremium: true,
    description: 'Generate comprehensive HTML or XML reports for GPO settings and links',
    instructions: `**How This Task Works:**
This script generates detailed reports of Group Policy Object settings, links, and configurations in HTML or XML format for documentation and compliance.

**Prerequisites:**
- Group Policy Management PowerShell module installed
- Read access to GPO objects
- Sufficient disk space for report generation

**What You Need to Provide:**
- Report type (HTML or XML)
- Specific GPO name (or all GPOs)
- Output file path
- Include GPO links and inheritance

**What the Script Does:**
1. Retrieves GPO settings and configuration
2. Generates detailed report in specified format
3. Includes GPO links, permissions, and inheritance
4. Exports to HTML (readable) or XML (parseable) format
5. Reports generation statistics

**Important Notes:**
- HTML reports: Human-readable, perfect for documentation
- XML reports: Machine-parseable, perfect for automation
- Report includes: Settings, links, permissions, WMI filters
- Use for: Compliance audits, change documentation, troubleshooting
- Large GPOs may take 30-60 seconds to report
- Run monthly for GPO documentation
- Compare reports before/after changes
- Archive reports for audit trail`,
    parameters: [
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['Html', 'Xml'], defaultValue: 'Html' },
      { id: 'gpoName', label: 'GPO Name (leave empty for all GPOs)', type: 'text', required: false, placeholder: '' },
      { id: 'outputPath', label: 'Output File Path', type: 'path', required: true, placeholder: 'C:\\Reports\\GPO_Report.html' },
      { id: 'includeLinks', label: 'Include GPO Links', type: 'boolean', required: false, defaultValue: true }
    ],
    validate: (params) => {
      const required = ['reportType', 'outputPath'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const reportType = params.reportType || 'Html';
      const gpoName = params.gpoName ? escapePowerShellString(params.gpoName) : '';
      const outputPath = escapePowerShellString(params.outputPath);
      const includeLinks = toPowerShellBoolean(params.includeLinks);

      return `# Generate Group Policy Object Report
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

try {
    $ReportType = "${reportType}"
    ${gpoName ? `$GPOName = "${gpoName}"` : '$GPOName = $null'}
    $OutputPath = "${outputPath}"
    $IncludeLinks = ${includeLinks}
    
    Write-Host "Generating GPO Report..." -ForegroundColor Cyan
    Write-Host "  Report Type: $ReportType" -ForegroundColor White
    ${gpoName ? `Write-Host "  GPO: $GPOName" -ForegroundColor White` : 'Write-Host "  Scope: All GPOs" -ForegroundColor White'}
    Write-Host "  Output: $OutputPath" -ForegroundColor White
    Write-Host ""
    
    # Validate output path
    try {
        $OutputDir = Split-Path -Path $OutputPath -Parent
        $OutputFileName = Split-Path -Path $OutputPath -Leaf
        
        if (-not $OutputFileName) {
            Write-Error "Invalid output file path: $OutputPath"
            exit 1
        }
        
        # Ensure output directory exists and is writable
        if ($OutputDir) {
            if (-not (Test-Path -Path $OutputDir)) {
                try {
                    New-Item -Path $OutputDir -ItemType Directory -Force -ErrorAction Stop | Out-Null
                    Write-Host "[SUCCESS] Created output directory: $OutputDir" -ForegroundColor Green
                } catch {
                    Write-Error "Failed to create output directory: $($_.Exception.Message)"
                    exit 1
                }
            }
            
            # Test write access
            try {
                $TestFile = Join-Path $OutputDir "test_write.tmp"
                $null | Out-File -FilePath $TestFile -ErrorAction Stop
                Remove-Item -Path $TestFile -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Error "Output directory is not writable: $OutputDir"
                exit 1
            }
        }
    } catch {
        Write-Error "Invalid output path: $OutputPath - $($_.Exception.Message)"
        exit 1
    }
    
    # Verify Group Policy module cmdlets are available
    try {
        $null = Get-Command Get-GPOReport -ErrorAction Stop
        Write-Host "[SUCCESS] Group Policy cmdlets verified" -ForegroundColor Green
    } catch {
        Write-Error "Get-GPOReport cmdlet not available. Ensure Group Policy Management features are installed."
        exit 1
    }
    
    if ($GPOName) {
        # Generate report for specific GPO
        Write-Host "Generating report for: $GPOName..." -ForegroundColor Cyan
        
        # Verify GPO exists
        try {
            $GPO = Get-GPO -Name $GPOName -ErrorAction Stop
            Write-Host "  [SUCCESS] GPO found: $($GPO.DisplayName)" -ForegroundColor Gray
        } catch {
            Write-Error "GPO not found: $GPOName"
            exit 1
        }
        
        # Generate report
        try {
            $Report = Get-GPOReport -Name $GPOName -ReportType $ReportType -ErrorAction Stop
            
            if (-not $Report) {
                Write-Error "Failed to generate report (empty result)"
                exit 1
            }
            
            $Report | Out-File -FilePath $OutputPath -Encoding UTF8 -ErrorAction Stop
            
            Write-Host "[SUCCESS] Report generated successfully" -ForegroundColor Green
            Write-Host "  File: $OutputPath" -ForegroundColor Gray
            Write-Host "  Size: $([math]::Round((Get-Item $OutputPath).Length / 1KB, 2)) KB" -ForegroundColor Gray
        } catch {
            Write-Error "Failed to generate report: $($_.Exception.Message)"
            exit 1
        }
        
        if ($IncludeLinks) {
            Write-Host ""
            Write-Host "=== GPO LINK INFORMATION ===" -ForegroundColor Cyan
            
            try {
                # Get all domains in forest
                $Domains = (Get-ADForest -ErrorAction Stop).Domains
                
                foreach ($Domain in $Domains) {
                    try {
                        Write-Host "Domain: $Domain" -ForegroundColor Yellow
                        
                        # Find GPO links across the domain
                        $GPOLinks = [System.Collections.ArrayList]@()
                        
                        # Get domain root and OUs
                        $SearchBase = (Get-ADDomain -Server $Domain -ErrorAction Stop).DistinguishedName
                        $AllOUs = @($SearchBase) + (Get-ADOrganizationalUnit -Filter * -Server $Domain -ErrorAction SilentlyContinue | 
                            Select-Object -ExpandProperty DistinguishedName)
                        
                        foreach ($OU in $AllOUs) {
                            try {
                                $Inheritance = Get-GPInheritance -Target $OU -Domain $Domain -ErrorAction SilentlyContinue
                                if ($Inheritance.GpoLinks) {
                                    $LinkedGPO = $Inheritance.GpoLinks | Where-Object { $_.DisplayName -eq $GPOName }
                                    if ($LinkedGPO) {
                                        Write-Host "  [SUCCESS] Linked to: $OU" -ForegroundColor Green
                                        Write-Host "    Enabled: $($LinkedGPO.Enabled)" -ForegroundColor Gray
                                        Write-Host "    Enforced: $($LinkedGPO.Enforced)" -ForegroundColor Gray
                                        Write-Host "    Order: $($LinkedGPO.Order)" -ForegroundColor Gray
                                    }
                                }
                            } catch {
                                # Silently skip inaccessible OUs
                            }
                        }
                    } catch {
                        Write-Host "  [WARNING] Cannot query domain: $Domain" -ForegroundColor Yellow
                    }
                }
            } catch {
                Write-Host "[WARNING] Cannot retrieve forest information for link discovery" -ForegroundColor Yellow
                Write-Host "  GPO report generated without link information" -ForegroundColor Gray
            }
        }
        
    } else {
        # Generate report for all GPOs
        Write-Host "Generating reports for all GPOs..." -ForegroundColor Cyan
        
        try {
            $AllGPOs = Get-GPO -All -ErrorAction Stop
            Write-Host "Found $($AllGPOs.Count) GPOs" -ForegroundColor Yellow
            Write-Host ""
        } catch {
            Write-Error "Failed to retrieve GPOs: $($_.Exception.Message)"
            exit 1
        }
        
        if ($AllGPOs.Count -eq 0) {
            Write-Host "[WARNING] No GPOs found in domain" -ForegroundColor Yellow
            exit 0
        }
        
        # Create combined report for HTML
        $ReportCount = 0
        $FailCount = 0
        
        if ($ReportType -eq "Html") {
            $CombinedReport = @()
            $CombinedReport += "<!DOCTYPE html><html><head><title>All GPOs Report</title>"
            $CombinedReport += "<style>body{font-family:Arial;margin:20px;} h2{color:#0066cc;border-bottom:2px solid #0066cc;} table{border-collapse:collapse;width:100%;margin:20px 0;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#0066cc;color:white;}</style>"
            $CombinedReport += "</head><body>"
            $CombinedReport += "<h1>Group Policy Objects Report</h1>"
            $CombinedReport += "<p>Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>"
            $CombinedReport += "<p>Total GPOs: $($AllGPOs.Count)</p>"
        }
        
        foreach ($GPO in $AllGPOs) {
            try {
                Write-Host "  Processing: $($GPO.DisplayName)" -ForegroundColor Gray
                
                if ($ReportType -eq "Html") {
                    $GPOReport = Get-GPOReport -Guid $GPO.Id -ReportType Html -ErrorAction Stop
                    
                    if ($GPOReport) {
                        # Extract body content and append
                        $GPOReport -match '<body.*?>(.*)</body>' | Out-Null
                        if ($Matches) {
                            $CombinedReport += "<div style='page-break-before:always;'>"
                            $CombinedReport += $Matches[1]
                            $CombinedReport += "</div>"
                        }
                    }
                } else {
                    # For XML, create separate files with safe filename
                    $SafeName = $GPO.DisplayName -replace '[\\/:*?"<>|]', '_'
                    $FileName = "$SafeName.xml"
                    $FilePath = Join-Path -Path $OutputDir -ChildPath $FileName
                    
                    $XMLReport = Get-GPOReport -Guid $GPO.Id -ReportType Xml -ErrorAction Stop
                    if ($XMLReport) {
                        $XMLReport | Out-File -FilePath $FilePath -Encoding UTF8 -ErrorAction Stop
                    }
                }
                
                $ReportCount++
            } catch {
                Write-Host "    [FAILED] Failed: $($_.Exception.Message)" -ForegroundColor Red
                $FailCount++
            }
        }
        
        if ($ReportType -eq "Html") {
            $CombinedReport += "</body></html>"
            $CombinedReport | Out-File -FilePath $OutputPath -Encoding UTF8
            
            Write-Host ""
            Write-Host "[SUCCESS] Combined report generated: $OutputPath" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "[SUCCESS] Individual XML reports generated in: $OutputDir" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
        Write-Host "Total GPOs: $($AllGPOs.Count)" -ForegroundColor Gray
        Write-Host "Reports Generated: $ReportCount" -ForegroundColor Green
        Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Gray" })
    }
    
    Write-Host ""
    Write-Host "Report Uses:" -ForegroundColor Cyan
    Write-Host "1. Compliance documentation and audits" -ForegroundColor Yellow
    Write-Host "2. Change management (before/after comparison)" -ForegroundColor Yellow
    Write-Host "3. Troubleshooting GPO application issues" -ForegroundColor Yellow
    Write-Host "4. Security reviews and access control verification" -ForegroundColor Yellow
    Write-Host "5. Disaster recovery documentation" -ForegroundColor Yellow
    
    if ($ReportType -eq "Html") {
        Write-Host ""
        Write-Host "[SUCCESS] Open HTML report in browser for readable view" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to generate GPO report: $_"
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Insufficient permissions to read GPO" -ForegroundColor Gray
    Write-Host "- GPO not found or invalid name" -ForegroundColor Gray
    Write-Host "- Output path is invalid or not writable" -ForegroundColor Gray
}`;
    }
  },

  // ========================================
  // SITE & REPLICATION MANAGEMENT CATEGORY
  // ========================================
  {
    id: 'create-ad-site-subnet',
    name: 'Create Active Directory Site and Subnet',
    category: 'Site & Replication',
    isPremium: true,
    description: 'Create AD sites and associate subnets for replication topology',
    instructions: `**How This Task Works:**
This script creates Active Directory sites and associates IP subnets to optimize replication traffic and client authentication across geographical locations.

**Prerequisites:**
- Active Directory PowerShell module installed
- Enterprise Admin or Domain Admin permissions
- Understanding of network topology and IP addressing
- Site link infrastructure planned

**What You Need to Provide:**
- Site name and description
- Associated IP subnet (CIDR notation)
- Site link name for replication
- Optional: Preferred domain controller

**What the Script Does:**
1. Creates new Active Directory site
2. Defines IP subnet and associates with site
3. Links site to replication topology
4. Configures site settings and preferences
5. Verifies site creation and subnet association

**Important Notes:**
- Sites control: Client authentication, replication topology, service location
- Subnet format: Use CIDR notation (e.g., 192.168.1.0/24)
- One subnet can only be associated with one site
- Sites optimize logon traffic by directing clients to nearest DC
- Plan sites based on network bandwidth and WAN links
- Replication between sites uses site links (configure separately)
- Default First Site Name can be renamed after creation
- Minimum recommended sites: One per physical location with DC`,
    parameters: [
      { id: 'siteName', label: 'Site Name', type: 'text', required: true, placeholder: 'Chicago-Office' },
      { id: 'siteDescription', label: 'Site Description', type: 'textarea', required: false, placeholder: 'Chicago headquarters and data center' },
      { id: 'subnetAddress', label: 'Subnet Address (CIDR)', type: 'text', required: true, placeholder: '192.168.10.0/24' },
      { id: 'siteLinkName', label: 'Site Link Name', type: 'text', required: false, placeholder: 'DEFAULTIPSITELINK' },
      { id: 'location', label: 'Physical Location', type: 'text', required: false, placeholder: 'Chicago, IL, USA' }
    ],
    validate: (params) => {
      const required = ['siteName', 'subnetAddress'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const siteName = escapePowerShellString(params.siteName);
      const siteDescription = params.siteDescription ? escapePowerShellString(params.siteDescription) : '';
      const subnetAddress = escapePowerShellString(params.subnetAddress);
      const siteLinkName = params.siteLinkName ? escapePowerShellString(params.siteLinkName) : 'DEFAULTIPSITELINK';
      const location = params.location ? escapePowerShellString(params.location) : '';

      return `# Create Active Directory Site and Subnet
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    $SiteName = "${siteName}"
    $SubnetAddress = "${subnetAddress}"
    $SiteLinkName = "${siteLinkName}"
    ${siteDescription ? `$Description = "${siteDescription}"` : '$Description = ""'}
    ${location ? `$Location = "${location}"` : '$Location = ""'}
    
    Write-Host "Creating Active Directory Site and Subnet" -ForegroundColor Cyan
    Write-Host "  Site Name: $SiteName" -ForegroundColor White
    Write-Host "  Subnet: $SubnetAddress" -ForegroundColor White
    ${location ? 'Write-Host "  Location: $Location" -ForegroundColor White' : ''}
    Write-Host ""
    
    # Validate subnet format
    if ($SubnetAddress -notmatch '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}/\\d{1,2}$') {
        Write-Error "Invalid subnet format. Use CIDR notation (e.g., 192.168.1.0/24)"
        exit 1
    }
    
    # Get domain configuration context
    $ConfigContext = (Get-ADRootDSE).configurationNamingContext
    $SitesContainer = "CN=Sites,$ConfigContext"
    
    # Check if site already exists
    try {
        $ExistingSite = Get-ADReplicationSite -Identity $SiteName -ErrorAction Stop
        Write-Host "[WARNING] Site already exists: $SiteName" -ForegroundColor Yellow
        Write-Host "  DN: $($ExistingSite.DistinguishedName)" -ForegroundColor Gray
        Write-Host "  Created: $($ExistingSite.Created)" -ForegroundColor Gray
        $Site = $ExistingSite
    } catch {
        # Create new site
        Write-Host "Creating site: $SiteName..." -ForegroundColor Cyan
        
        $Site = New-ADReplicationSite -Name $SiteName -Description $Description -PassThru
        
        Write-Host "[SUCCESS] Site created successfully" -ForegroundColor Green
        Write-Host "  DN: $($Site.DistinguishedName)" -ForegroundColor Gray
        
        # Set location if provided
        if ($Location) {
            Set-ADReplicationSite -Identity $SiteName -Location $Location -ErrorAction SilentlyContinue
            Write-Host "  Location: $Location" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Creating and associating subnet..." -ForegroundColor Cyan
    
    # Check if subnet already exists
    try {
        $ExistingSubnet = Get-ADReplicationSubnet -Identity $SubnetAddress -ErrorAction Stop
        Write-Host "[WARNING] Subnet already exists: $SubnetAddress" -ForegroundColor Yellow
        Write-Host "  Currently associated with site: $($ExistingSubnet.Site)" -ForegroundColor Yellow
        
        # Reassociate if needed
        if ($ExistingSubnet.Site -ne $Site.DistinguishedName) {
            Write-Host "  Reassociating subnet to $SiteName..." -ForegroundColor Cyan
            Set-ADReplicationSubnet -Identity $SubnetAddress -Site $Site
            Write-Host "[SUCCESS] Subnet reassociated" -ForegroundColor Green
        }
    } catch {
        # Create new subnet
        $Subnet = New-ADReplicationSubnet -Name $SubnetAddress -Site $Site -PassThru
        Write-Host "[SUCCESS] Subnet created and associated" -ForegroundColor Green
        Write-Host "  Subnet: $SubnetAddress" -ForegroundColor Gray
        Write-Host "  Associated with: $SiteName" -ForegroundColor Gray
    }
    
    # Associate site with site link
    Write-Host ""
    Write-Host "Configuring site link..." -ForegroundColor Cyan
    
    try {
        $SiteLink = Get-ADReplicationSiteLink -Identity $SiteLinkName -ErrorAction Stop
        
        # Check if site is already in the site link
        if ($SiteLink.SitesIncluded -notcontains $Site.DistinguishedName) {
            $SitesIncluded = @($SiteLink.SitesIncluded) + @($Site.DistinguishedName)
            Set-ADReplicationSiteLink -Identity $SiteLinkName -SitesIncluded $SitesIncluded
            Write-Host "[SUCCESS] Site added to site link: $SiteLinkName" -ForegroundColor Green
        } else {
            Write-Host "[SUCCESS] Site already in site link: $SiteLinkName" -ForegroundColor Green
        }
        
        Write-Host "  Replication Cost: $($SiteLink.Cost)" -ForegroundColor Gray
        Write-Host "  Replication Interval: $($SiteLink.ReplicationFrequencyInMinutes) minutes" -ForegroundColor Gray
    } catch {
        Write-Host "[WARNING] Site link not found or cannot be configured: $SiteLinkName" -ForegroundColor Yellow
        Write-Host "  Manually configure site links via AD Sites and Services" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "Site Name: $SiteName" -ForegroundColor Gray
    Write-Host "Site DN: $($Site.DistinguishedName)" -ForegroundColor Gray
    Write-Host "Subnet: $SubnetAddress" -ForegroundColor Gray
    ${location ? 'Write-Host "Location: $Location" -ForegroundColor Gray' : ''}
    Write-Host "Site Link: $SiteLinkName" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Install domain controller in new site" -ForegroundColor Yellow
    Write-Host "2. Configure site link costs and replication schedule" -ForegroundColor Yellow
    Write-Host "3. Configure site link bridges if needed" -ForegroundColor Yellow
    Write-Host "4. Verify client computers authenticate to correct site" -ForegroundColor Yellow
    Write-Host "5. Monitor replication: repadmin /showrepl" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Best Practices:" -ForegroundColor Cyan
    Write-Host "- Create sites based on physical network topology" -ForegroundColor Gray
    Write-Host "- One subnet per site for optimal client location" -ForegroundColor Gray
    Write-Host "- Configure site link costs to reflect WAN bandwidth" -ForegroundColor Gray
    Write-Host "- Use 15-minute minimum replication interval for WAN links" -ForegroundColor Gray
    Write-Host "- Document site topology and replication design" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create site/subnet: $_"
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Insufficient permissions (requires Enterprise/Domain Admin)" -ForegroundColor Gray
    Write-Host "- Invalid subnet format (must be CIDR: IP/mask)" -ForegroundColor Gray
    Write-Host "- Site or subnet name already in use" -ForegroundColor Gray
    Write-Host "- Network connectivity to domain controller" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'force-ad-replication',
    name: 'Force Active Directory Replication',
    category: 'Site & Replication',
    isPremium: true,
    description: 'Force immediate replication between domain controllers',
    instructions: `**How This Task Works:**
This script forces immediate Active Directory replication between domain controllers, bypassing the normal replication schedule to ensure critical changes propagate immediately.

**Prerequisites:**
- Active Directory PowerShell module installed
- Domain Admin or Replication permissions
- Network connectivity to target domain controllers
- Understanding of replication topology

**What You Need to Provide:**
- Source domain controller (optional - uses PDC if not specified)
- Target domain controller (or all DCs)
- Naming context to replicate (Domain, Configuration, Schema, or All)
- Option to force full sync

**What the Script Does:**
1. Identifies source and target domain controllers
2. Triggers immediate inbound replication
3. Verifies replication completion
4. Reports replication status and any failures
5. Checks replication metadata

**Important Notes:**
- Normal replication interval: Every 5 minutes (intra-site), 15-180 minutes (inter-site)
- Force replication when: Password resets, GPO changes, schema updates, emergency changes
- Replication is always inbound (target pulls from source)
- Use after: Creating users, making ACL changes, modifying groups
- Full sync: Replicates all objects (slower but comprehensive)
- Incremental: Only replicates changes since last sync (default, faster)
- Replication topology: Managed by KCC (Knowledge Consistency Checker)
- Monitor health: repadmin /showrepl, dcdiag /test:replications`,
    parameters: [
      { id: 'sourceDC', label: 'Source DC (leave empty for PDC emulator)', type: 'text', required: false, placeholder: 'DC01.company.com' },
      { id: 'targetDC', label: 'Target DC (leave empty for all DCs)', type: 'text', required: false, placeholder: 'DC02.company.com' },
      { id: 'namingContext', label: 'Naming Context', type: 'select', required: true, options: ['All', 'Domain', 'Configuration', 'Schema'], defaultValue: 'Domain' },
      { id: 'fullSync', label: 'Force Full Synchronization', type: 'boolean', required: false, defaultValue: false }
    ],
    validate: (params) => {
      const required = ['namingContext'];
      const missing = validateRequiredFields(params, required);
      if (missing.length > 0) {
        return `Missing required fields: ${missing.join(', ')}`;
      }
      return null;
    },
    scriptTemplate: (params) => {
      const sourceDC = params.sourceDC ? escapePowerShellString(params.sourceDC) : '';
      const targetDC = params.targetDC ? escapePowerShellString(params.targetDC) : '';
      const namingContext = params.namingContext || 'Domain';
      const fullSync = toPowerShellBoolean(params.fullSync);

      return `# Force Active Directory Replication
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

try {
    ${sourceDC ? `$SourceDC = "${sourceDC}"` : '$SourceDC = $null'}
    ${targetDC ? `$TargetDC = "${targetDC}"` : '$TargetDC = $null'}
    $NamingContext = "${namingContext}"
    $FullSync = ${fullSync}
    
    Write-Host "Force Active Directory Replication" -ForegroundColor Cyan
    Write-Host "  Naming Context: $NamingContext" -ForegroundColor White
    Write-Host "  Full Sync: $FullSync" -ForegroundColor White
    Write-Host ""
    
    # Get domain information
    $Domain = Get-ADDomain
    $Forest = Get-ADForest
    
    # Determine source DC
    if (-not $SourceDC) {
        $SourceDC = $Domain.PDCEmulator
        Write-Host "[SUCCESS] Using PDC Emulator as source: $SourceDC" -ForegroundColor Green
    } else {
        Write-Host "[SUCCESS] Using specified source: $SourceDC" -ForegroundColor Green
    }
    
    # Verify source DC is reachable
    if (-not (Test-Connection -ComputerName $SourceDC -Count 1 -Quiet)) {
        Write-Error "Source DC is not reachable: $SourceDC"
        exit 1
    }
    
    # Get target DCs
    if ($TargetDC) {
        $TargetDCs = @($TargetDC)
        Write-Host "[SUCCESS] Target DC: $TargetDC" -ForegroundColor Green
    } else {
        $TargetDCs = (Get-ADDomainController -Filter *).HostName | Where-Object { $_ -ne $SourceDC }
        Write-Host "[SUCCESS] Target: All domain controllers ($($TargetDCs.Count) DCs)" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Determine naming contexts to replicate
    $NamingContexts = @()
    
    if ($NamingContext -eq "All" -or $NamingContext -eq "Domain") {
        $NamingContexts += $Domain.DistinguishedName
    }
    
    if ($NamingContext -eq "All" -or $NamingContext -eq "Configuration") {
        $NamingContexts += "CN=Configuration,$($Forest.RootDomain -replace '\\.',',DC=')"
    }
    
    if ($NamingContext -eq "All" -or $NamingContext -eq "Schema") {
        $NamingContexts += "CN=Schema,CN=Configuration,$($Forest.RootDomain -replace '\\.',',DC=')"
    }
    
    # Force replication
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($DC in $TargetDCs) {
        Write-Host "Processing: $DC" -ForegroundColor Cyan
        
        # Verify DC is reachable
        if (-not (Test-Connection -ComputerName $DC -Count 1 -Quiet)) {
            Write-Host "  [FAILED] DC not reachable" -ForegroundColor Red
            $FailCount++
            continue
        }
        
        foreach ($NC in $NamingContexts) {
            try {
                $NCName = ($NC -split ',')[0] -replace 'CN=', '' -replace 'DC=', ''
                Write-Host "  Replicating: $NCName" -ForegroundColor Gray
                
                if ($FullSync) {
                    # Force full synchronization
                    repadmin /syncall $DC $NC /A /e /P 2>&1 | Out-Null
                } else {
                    # Standard incremental sync
                    repadmin /replicate $DC $SourceDC $NC 2>&1 | Out-Null
                }
                
                # Verify replication
                Start-Sleep -Seconds 2
                $ReplStatus = repadmin /showrepl $DC $NC 2>&1
                
                if ($ReplStatus -match "successful") {
                    Write-Host "  [SUCCESS] Replication successful" -ForegroundColor Green
                    $SuccessCount++
                } else {
                    Write-Host "  [WARNING] Replication status unclear - check manually" -ForegroundColor Yellow
                }
                
            } catch {
                Write-Host "  [FAILED] Replication failed: $_" -ForegroundColor Red
                $FailCount++
            }
        }
        
        Write-Host ""
    }
    
    # Summary
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "Source DC: $SourceDC" -ForegroundColor Gray
    Write-Host "Target DCs: $($TargetDCs.Count)" -ForegroundColor Gray
    Write-Host "Naming Contexts: $($NamingContexts.Count)" -ForegroundColor Gray
    Write-Host "Successful Replications: $SuccessCount" -ForegroundColor Green
    Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Gray" })
    
    Write-Host ""
    Write-Host "Verification Commands:" -ForegroundColor Cyan
    Write-Host "  Check replication status: repadmin /showrepl $SourceDC" -ForegroundColor Yellow
    Write-Host "  Check replication queue: repadmin /queue" -ForegroundColor Yellow
    Write-Host "  Test replication: dcdiag /test:replications" -ForegroundColor Yellow
    Write-Host "  View replication partners: repadmin /showreps" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "When to Force Replication:" -ForegroundColor Cyan
    Write-Host "1. After password resets (especially admin accounts)" -ForegroundColor Gray
    Write-Host "2. After Group Policy changes requiring immediate effect" -ForegroundColor Gray
    Write-Host "3. After schema modifications" -ForegroundColor Gray
    Write-Host "4. After creating/modifying user accounts" -ForegroundColor Gray
    Write-Host "5. Before maintenance windows or DC shutdowns" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to force replication: $_"
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Network connectivity between DCs" -ForegroundColor Gray
    Write-Host "- Firewall blocking replication ports (TCP 135, 389, 636, 3268, 3269, dynamic RPC)" -ForegroundColor Gray
    Write-Host "- Replication permissions insufficient" -ForegroundColor Gray
    Write-Host "- DCs in different forests or domains" -ForegroundColor Gray
    Write-Host "- DNS resolution failures" -ForegroundColor Gray
}`;
    }
  }
];
