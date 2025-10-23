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
  parameters: ADTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
}

export const adTasks: ADTask[] = [
  {
    id: 'new-hire-provisioning',
    name: 'New Hire Provisioning',
    category: 'Identity Lifecycle',
    description: 'Create new user account with groups, home drive, manager, and welcome notification',
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
    scriptTemplate: (params) => `# New Hire Provisioning Script
# Generated: ${new Date().toISOString()}

# Import Active Directory module
Import-Module ActiveDirectory

# User details
$FirstName = "${params.firstName}"
$LastName = "${params.lastName}"
$Username = ($FirstName.Substring(0,1) + $LastName).ToLower()
$DisplayName = "$FirstName $LastName"
$Department = "${params.department}"
$Title = "${params.jobTitle}"
$Manager = "${params.manager}"
$OU = "${params.ou}"

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
    ${params.homeDrivePath ? `
    # Create home drive
    $HomePath = "${params.homeDrivePath}$Username"
    New-Item -Path $HomePath -ItemType Directory -Force
    $Acl = Get-Acl $HomePath
    $Ar = New-Object System.Security.AccessControl.FileSystemAccessRule($Username, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $Acl.SetAccessRule($Ar)
    Set-Acl $HomePath $Acl
    
    Set-ADUser -Identity $Username -HomeDrive "H:" -HomeDirectory $HomePath
    Write-Host "✓ Home drive created and configured" -ForegroundColor Green
` : ''}${params.groups ? `
    # Add to security groups
    $Groups = @(${params.groups.split(',').map((g: string) => `"${g.trim()}"`).join(', ')})
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
}`
  },
  {
    id: 'offboarding-disable',
    name: 'User Offboarding',
    category: 'Identity Lifecycle',
    description: 'Disable account, remove groups, move to disabled OU, and archive home drive',
    parameters: [
      { id: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jdoe' },
      { id: 'disabledOU', label: 'Disabled Users OU', type: 'text', required: true, placeholder: 'OU=Disabled,DC=company,DC=com' },
      { id: 'archivePath', label: 'Archive Path (optional)', type: 'path', required: false, placeholder: '\\\\server\\archives\\' },
      { id: 'removeGroups', label: 'Remove All Groups', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => `# User Offboarding Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$Username = "${params.username}"
$DisabledOU = "${params.disabledOU}"
$RemoveGroups = $${params.removeGroups}

try {
    # Get user object
    $User = Get-ADUser -Identity $Username -Properties MemberOf, HomeDirectory
    
    # Disable account
    Disable-ADAccount -Identity $Username
    Write-Host "✓ Account disabled: $Username" -ForegroundColor Green
    
    # Set description with disable date
    $Description = "Disabled on $(Get-Date -Format 'yyyy-MM-dd') - Former: $($User.Title)"
    Set-ADUser -Identity $Username -Description $Description
    ${params.removeGroups ? `
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
    ${params.archivePath ? `
    # Archive home drive
    if ($User.HomeDirectory -and (Test-Path $User.HomeDirectory)) {
        $ArchivePath = "${params.archivePath}$Username-$(Get-Date -Format 'yyyyMMdd')"
        Copy-Item -Path $User.HomeDirectory -Destination $ArchivePath -Recurse -Force
        Write-Host "✓ Home drive archived to: $ArchivePath" -ForegroundColor Green
    }
` : ''}
    Write-Host ""
    Write-Host "User offboarding completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to offboard user: $_"
}`
  },
  {
    id: 'password-expiry-notification',
    name: 'Password Expiry Notification',
    category: 'Identity Lifecycle',
    description: 'Find users with expiring passwords and send notifications',
    parameters: [
      { id: 'daysBeforeExpiry', label: 'Days Before Expiry', type: 'number', required: true, defaultValue: 14, placeholder: '14' },
      { id: 'searchBase', label: 'Search Base (optional)', type: 'text', required: false, placeholder: 'OU=Users,DC=company,DC=com' },
      { id: 'smtpServer', label: 'SMTP Server', type: 'text', required: true, placeholder: 'smtp.company.com' },
      { id: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@company.com' }
    ],
    scriptTemplate: (params) => `# Password Expiry Notification Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$DaysBeforeExpiry = ${params.daysBeforeExpiry}
$SMTPServer = "${params.smtpServer}"
$FromEmail = "${params.fromEmail}"
${params.searchBase ? `$SearchBase = "${params.searchBase}"` : '$SearchBase = (Get-ADDomain).DistinguishedName'}

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
Write-Host "Found $($ExpiringUsers.Count) users with expiring passwords" -ForegroundColor Cyan`
  },
  {
    id: 'cleanup-stale-computers',
    name: 'Cleanup Stale Computers',
    category: 'Computers & OUs',
    description: 'Find and optionally remove/disable computers inactive for specified days',
    parameters: [
      { id: 'inactiveDays', label: 'Inactive Days Threshold', type: 'number', required: true, defaultValue: 90, placeholder: '90' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Report Only', 'Disable', 'Move to Quarantine OU', 'Delete'], defaultValue: 'Report Only' },
      { id: 'quarantineOU', label: 'Quarantine OU (if moving)', type: 'text', required: false, placeholder: 'OU=Quarantine,DC=company,DC=com' },
      { id: 'exportPath', label: 'Report Export Path', type: 'path', required: false, placeholder: 'C:\\Reports\\StaleComputers.csv' }
    ],
    scriptTemplate: (params) => `# Stale Computers Cleanup Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$InactiveDays = ${params.inactiveDays}
$Action = "${params.action}"
${params.quarantineOU ? `$QuarantineOU = "${params.quarantineOU}"` : ''}
${params.exportPath ? `$ExportPath = "${params.exportPath}"` : ''}

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
            ${params.quarantineOU ? `
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
${params.exportPath ? `
# Export report
$StaleComputers | Select-Object Name, LastLogonDate, OperatingSystem, Description | 
    Export-Csv -Path $ExportPath -NoTypeInformation
Write-Host ""
Write-Host "Report exported to: $ExportPath" -ForegroundColor Green
` : ''}
Write-Host ""
Write-Host "Stale computers cleanup completed!" -ForegroundColor Green`
  },
  {
    id: 'backup-all-gpos',
    name: 'Backup All GPOs',
    category: 'GPO & Configuration',
    description: 'Create timestamped backup of all Group Policy Objects',
    parameters: [
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: true, placeholder: 'C:\\GPOBackups' },
      { id: 'retentionDays', label: 'Retention Days (delete older)', type: 'number', required: false, defaultValue: 30, placeholder: '30' },
      { id: 'comment', label: 'Backup Comment', type: 'text', required: false, placeholder: 'Scheduled daily backup' }
    ],
    scriptTemplate: (params) => `# GPO Backup Script
# Generated: ${new Date().toISOString()}

Import-Module GroupPolicy

$BackupPath = "${params.backupPath}"
${params.retentionDays ? `$RetentionDays = ${params.retentionDays}` : ''}
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
            Backup-GPO -Guid $GPO.Id -Path $BackupFolder ${params.comment ? `-Comment "${params.comment}"` : ''} | Out-Null
            Write-Host "✓ $($GPO.DisplayName)" -ForegroundColor Green
        } catch {
            Write-Host "✗ $($GPO.DisplayName) - Error: $_" -ForegroundColor Red
        }
    }
    ${params.retentionDays ? `
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
}`
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
    scriptTemplate: (params) => `# Privileged Groups Audit Script
# Generated: ${new Date().toISOString()}

Import-Module ActiveDirectory

$Groups = @(${params.groups.split(',').map((g: string) => `"${g.trim()}"`).join(', ')})
$BaselinePath = "${params.baselinePath}"
${params.alertEmail ? `$AlertEmail = "${params.alertEmail}"` : ''}
${params.smtpServer ? `$SMTPServer = "${params.smtpServer}"` : ''}

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
${params.alertEmail && params.smtpServer ? `
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
Write-Host "Privileged groups audit completed!" -ForegroundColor Green`
  }
];
