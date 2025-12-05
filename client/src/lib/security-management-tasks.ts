import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface SecurityManagementTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface SecurityManagementTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: SecurityManagementTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium?: boolean;
}

export const securityManagementTasks: SecurityManagementTask[] = [
  {
    id: 'get-local-admins',
    name: 'Get Local Administrators',
    category: 'Account Security',
    description: 'List all members of the local Administrators group',
    instructions: `**How This Task Works:**
- Lists all members of the local Administrators group
- Shows user accounts and groups with admin privileges
- Optionally exports results to CSV for documentation

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Run on local Windows machine

**What You Need to Provide:**
- Optional: CSV export file path for documentation

**What the Script Does:**
1. Retrieves all members of local Administrators group
2. Displays member names, object class, and principal source
3. Shows total count of administrators
4. Optionally exports results to CSV file

**Important Notes:**
- Essential for security audits and compliance
- Helps identify over-privileged accounts
- Use for least privilege access reviews
- Typical use: quarterly access reviews, security audits
- Domain accounts show as DOMAIN\\Username
- Local accounts show as COMPUTERNAME\\Username
- Review regularly to prevent privilege creep
- Export for documentation and comparison over time`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Local Administrators
# Generated: ${new Date().toISOString()}

$Admins = Get-LocalGroupMember -Group "Administrators" | Select-Object Name, ObjectClass, PrincipalSource

Write-Host "Local Administrators:" -ForegroundColor Cyan
$Admins | Format-Table -AutoSize

Write-Host ""
Write-Host "Total: $($Admins.Count) member(s)" -ForegroundColor Gray

${exportPath ? `$Admins | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'add-local-admin',
    name: 'Add User to Local Administrators',
    category: 'Account Security',
    description: 'Add a user or group to the local Administrators group',
    instructions: `**How This Task Works:**
- Adds a user or group to local Administrators group
- Grants full administrative privileges on the system
- Displays updated administrator list after addition

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- User/group must exist before adding

**What You Need to Provide:**
- User or group name (format: DOMAIN\\User or COMPUTERNAME\\User)

**What the Script Does:**
1. Adds specified user/group to Administrators group
2. Confirms successful addition
3. Displays updated list of all administrators

**Important Notes:**
- SECURITY RISK - grants full system control
- Follow least privilege principle
- Document reason for administrative access
- Use for temporary elevation sparingly
- Typical use: support technician access, emergency fixes
- Consider using time-limited access instead
- Review and remove when no longer needed
- Audit all administrator additions regularly`,
    parameters: [
      { id: 'userName', label: 'User/Group Name', type: 'text', required: true, placeholder: 'DOMAIN\\User' }
    ],
    scriptTemplate: (params) => {
      const userName = escapePowerShellString(params.userName);
      
      return `# Add Local Administrator
# Generated: ${new Date().toISOString()}

$UserName = "${userName}"

try {
    Add-LocalGroupMember -Group "Administrators" -Member $UserName -ErrorAction Stop
    Write-Host "✓ Added $UserName to local Administrators" -ForegroundColor Green
    
    # Display current members
    Write-Host ""
    Write-Host "Current Administrators:" -ForegroundColor Gray
    Get-LocalGroupMember -Group "Administrators" | Select-Object Name | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed to add user: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'remove-local-admin',
    name: 'Remove User from Local Administrators',
    category: 'Account Security',
    description: 'Remove a user or group from the local Administrators group',
    instructions: `**How This Task Works:**
- Removes a user or group from local Administrators group
- Revokes administrative privileges on the system
- Displays updated administrator list after removal

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Cannot remove the last administrator

**What You Need to Provide:**
- User or group name to remove (format: DOMAIN\\User)

**What the Script Does:**
1. Removes specified user/group from Administrators group
2. Confirms successful removal
3. Displays updated list of remaining administrators

**Important Notes:**
- Essential for implementing least privilege
- Part of access review cleanup process
- Cannot remove built-in Administrator account
- Use after user role changes or departure
- Typical use: offboarding, role changes, privilege cleanup
- Verify user no longer needs admin access
- Document removal in change management
- Run after temporary access expires`,
    parameters: [
      { id: 'userName', label: 'User/Group Name', type: 'text', required: true, placeholder: 'DOMAIN\\User' }
    ],
    scriptTemplate: (params) => {
      const userName = escapePowerShellString(params.userName);
      
      return `# Remove Local Administrator
# Generated: ${new Date().toISOString()}

$UserName = "${userName}"

try {
    Remove-LocalGroupMember -Group "Administrators" -Member $UserName -ErrorAction Stop
    Write-Host "✓ Removed $UserName from local Administrators" -ForegroundColor Green
    
    # Display current members
    Write-Host ""
    Write-Host "Current Administrators:" -ForegroundColor Gray
    Get-LocalGroupMember -Group "Administrators" | Select-Object Name | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed to remove user: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-defender-status',
    name: 'Get Windows Defender Status',
    category: 'Windows Defender',
    description: 'Check Windows Defender antivirus and protection status',
    instructions: `**How This Task Works:**
- Checks Windows Defender antivirus protection status
- Displays real-time protection and signature information
- Shows when last scans were performed

**Prerequisites:**
- Windows 10/11 or Windows Server with Defender
- PowerShell 5.1 or later
- Defender module available

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Retrieves Windows Defender computer status
2. Displays real-time protection status (enabled/disabled)
3. Shows antivirus and cloud protection status
4. Reports signature version and age
5. Shows last full scan and quick scan dates

**Important Notes:**
- Essential for security posture verification
- Run daily or before deployments
- Signature age over 7 days is concerning
- Real-time protection should always be enabled
- Typical use: health checks, compliance verification
- Disabled protection indicates security risk
- Use before security audits
- Integrate into monitoring workflows`,
    parameters: []
    ,
    scriptTemplate: () => {
      return `# Get Windows Defender Status
# Generated: ${new Date().toISOString()}

$Status = Get-MpComputerStatus

Write-Host "Windows Defender Status" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

Write-Host "Real-time Protection:" -NoNewline
if ($Status.RealTimeProtectionEnabled) {
    Write-Host " Enabled" -ForegroundColor Green
} else {
    Write-Host " Disabled" -ForegroundColor Red
}

Write-Host "Antivirus Enabled:" -NoNewline
if ($Status.AntivirusEnabled) {
    Write-Host " Enabled" -ForegroundColor Green
} else {
    Write-Host " Disabled" -ForegroundColor Red
}

Write-Host "Cloud Protection:" -NoNewline
if ($Status.IsTamperProtected) {
    Write-Host " Enabled" -ForegroundColor Green
} else {
    Write-Host " Disabled" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Signature Updates:" -ForegroundColor Cyan
Write-Host "  Antivirus Signature Age: $($Status.AntivirusSignatureAge) days" -ForegroundColor Gray
Write-Host "  Last Full Scan: $($Status.FullScanAge) days ago" -ForegroundColor Gray
Write-Host "  Last Quick Scan: $($Status.QuickScanAge) days ago" -ForegroundColor Gray`;
    }
  },

  {
    id: 'update-defender-signatures',
    name: 'Update Windows Defender Signatures',
    category: 'Windows Defender',
    description: 'Force update of Windows Defender antivirus definitions',
    instructions: `**How This Task Works:**
- Forces immediate update of Windows Defender signatures
- Downloads latest malware and threat definitions
- Displays updated signature version and timestamp

**Prerequisites:**
- Windows 10/11 or Windows Server with Defender
- Internet connectivity required
- Administrator privileges required

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Initiates Windows Defender signature update
2. Downloads latest definition files from Microsoft
3. Displays updated signature version
4. Shows last update timestamp

**Important Notes:**
- Run before performing security scans
- Essential for detecting latest threats
- Automatic updates should be enabled
- Use when signature age exceeds 3 days
- Typical use: pre-scan updates, outbreak response
- May take several minutes with slow connections
- Requires internet access to Microsoft servers
- Run after extended offline periods`,
    parameters: [],
    scriptTemplate: () => {
      return `# Update Windows Defender Signatures
# Generated: ${new Date().toISOString()}

Write-Host "Updating Windows Defender signatures..." -ForegroundColor Cyan

try {
    Update-MpSignature -ErrorAction Stop
    Write-Host "✓ Defender signatures updated successfully" -ForegroundColor Green
    
    # Show updated status
    $Status = Get-MpComputerStatus
    Write-Host ""
    Write-Host "Signature Information:" -ForegroundColor Gray
    Write-Host "  Antivirus Signature Version: $($Status.AntivirusSignatureVersion)" -ForegroundColor Gray
    Write-Host "  Last Updated: $($Status.AntivirusSignatureLastUpdated)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to update signatures: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'run-defender-scan',
    name: 'Run Windows Defender Scan',
    category: 'Windows Defender',
    description: 'Initiate a Quick, Full, or Custom antivirus scan',
    instructions: `**How This Task Works:**
- Initiates Windows Defender antivirus scan
- Performs Quick Scan or Full Scan based on selection
- Displays threat detection results if any found

**Prerequisites:**
- Windows 10/11 or Windows Server with Defender
- Administrator privileges required
- Up-to-date signatures recommended

**What You Need to Provide:**
- Scan type: QuickScan or FullScan

**What the Script Does:**
1. Starts selected Windows Defender scan type
2. Waits for scan completion (may take time for FullScan)
3. Displays scan completion status
4. Shows any detected threats with details
5. Reports "No threats detected" if system clean

**Important Notes:**
- Quick Scan takes 5-10 minutes typically
- Full Scan can take 1-3 hours on large drives
- Update signatures before scanning for best results
- Scan runs in foreground (console will wait)
- Typical use: weekly scans, suspected infections
- Full Scan recommended monthly
- Quick Scan suitable for daily checks
- Detected threats are quarantined automatically`,
    parameters: [
      { id: 'scanType', label: 'Scan Type', type: 'select', required: true, options: ['QuickScan', 'FullScan'], defaultValue: 'QuickScan' }
    ],
    scriptTemplate: (params) => {
      const scanType = params.scanType;
      
      return `# Run Windows Defender Scan
# Generated: ${new Date().toISOString()}

$ScanType = "${scanType}"

Write-Host "Starting Windows Defender $ScanType..." -ForegroundColor Cyan
Write-Host "This may take several minutes to complete" -ForegroundColor Yellow
Write-Host ""

try {
    Start-MpScan -ScanType $ScanType -ErrorAction Stop
    Write-Host "✓ Scan completed successfully" -ForegroundColor Green
    
    # Show threat detection summary
    $Threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
    if ($Threats) {
        Write-Host ""
        Write-Host "⚠ Threats detected: $($Threats.Count)" -ForegroundColor Red
        $Threats | Select-Object ThreatName, Resources | Format-List
    } else {
        Write-Host "No threats detected" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Scan failed: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-bitlocker-status',
    name: 'Get BitLocker Encryption Status',
    category: 'BitLocker & Encryption',
    description: 'Check BitLocker encryption status on all volumes',
    instructions: `**How This Task Works:**
- Checks BitLocker encryption status on all drives
- Displays protection status and encryption progress
- Shows volume and lock status for each drive

**Prerequisites:**
- Windows 10/11 Pro or Enterprise (or Server)
- PowerShell 5.1 or later
- Administrator privileges required

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Retrieves BitLocker status for all volumes
2. Displays protection status for each drive
3. Shows encryption percentage completion
4. Reports volume and lock status
5. Lists all volumes with their mount points

**Important Notes:**
- Essential for compliance verification
- Unencrypted drives are security risk
- Encryption percentage shows ongoing encryption
- ProtectionOn means drive is encrypted and protected
- Typical use: security audits, compliance checks
- Run before deployment and quarterly
- Lock status shows if drive is accessible
- Document unencrypted drives for remediation`,
    parameters: [],
    scriptTemplate: () => {
      return `# Get BitLocker Status
# Generated: ${new Date().toISOString()}

$Volumes = Get-BitLockerVolume

Write-Host "BitLocker Encryption Status" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

foreach ($Volume in $Volumes) {
    Write-Host "$($Volume.MountPoint)" -ForegroundColor Yellow
    Write-Host "  Protection Status: $($Volume.ProtectionStatus)" -ForegroundColor Gray
    Write-Host "  Encryption Percentage: $($Volume.EncryptionPercentage)%" -ForegroundColor Gray
    Write-Host "  Volume Status: $($Volume.VolumeStatus)" -ForegroundColor Gray
    Write-Host "  Lock Status: $($Volume.LockStatus)" -ForegroundColor Gray
    Write-Host ""
}`;
    }
  },

  {
    id: 'enable-bitlocker',
    name: 'Enable BitLocker Encryption',
    category: 'BitLocker & Encryption',
    description: 'Enable BitLocker on a drive with recovery key backup',
    instructions: `**How This Task Works:**
- Enables BitLocker encryption on specified drive
- Uses XTS-AES 256-bit encryption (strongest available)
- Automatically backs up recovery key to file

**Prerequisites:**
- Windows 10/11 Pro/Enterprise or Server
- TPM 1.2 or higher recommended
- Administrator privileges required
- Sufficient free space on drive

**What You Need to Provide:**
- Drive letter to encrypt (e.g., C:)
- Recovery key backup file path

**What the Script Does:**
1. Creates recovery key backup directory
2. Enables BitLocker with XTS-AES 256-bit encryption
3. Generates recovery password protector
4. Saves recovery key to specified path
5. Confirms encryption initiation

**Important Notes:**
- CRITICAL: Store recovery key securely off-system
- Encryption happens in background after script
- May take hours to encrypt large drives
- System remains usable during encryption
- Typical use: new system deployment, compliance requirement
- Recovery key needed if TPM fails or password forgotten
- Cannot decrypt without recovery key
- Test recovery key storage and retrieval process`,
    parameters: [
      { id: 'drive', label: 'Drive Letter', type: 'text', required: true, placeholder: 'C:' },
      { id: 'recoveryKeyPath', label: 'Recovery Key Backup Path', type: 'path', required: true, placeholder: 'C:\\BitLockerKeys' }
    ],
    scriptTemplate: (params) => {
      const drive = escapePowerShellString(params.drive);
      const recoveryKeyPath = escapePowerShellString(params.recoveryKeyPath);
      
      return `# Enable BitLocker
# Generated: ${new Date().toISOString()}

$Drive = "${drive}"
$RecoveryPath = "${recoveryKeyPath}"

Write-Host "⚠ WARNING: Enabling BitLocker encryption" -ForegroundColor Yellow
Write-Host "  Drive: $Drive" -ForegroundColor Gray
Write-Host "  This operation will encrypt the entire drive" -ForegroundColor Gray
Write-Host ""

# Create recovery key directory
New-Item -Path $RecoveryPath -ItemType Directory -Force | Out-Null

try {
    # Enable BitLocker with TPM and recovery key
    $Result = Enable-BitLocker -MountPoint $Drive -EncryptionMethod XtsAes256 -RecoveryPasswordProtector -ErrorAction Stop
    
    # Backup recovery key
    $RecoveryKey = ($Result.KeyProtector | Where-Object { $_.KeyProtectorType -eq 'RecoveryPassword' }).RecoveryPassword
    $RecoveryFile = Join-Path $RecoveryPath "BitLocker-$Drive-$(Get-Date -Format 'yyyyMMdd').txt"
    $RecoveryKey | Out-File $RecoveryFile
    
    Write-Host "✓ BitLocker enabled on $Drive" -ForegroundColor Green
    Write-Host "  Recovery key saved to: $RecoveryFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Store recovery key in a secure location!" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to enable BitLocker: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-uac-status',
    name: 'Get UAC Settings',
    category: 'Security Policy',
    description: 'Check User Account Control (UAC) configuration',
    instructions: `**How This Task Works:**
- Checks User Account Control (UAC) configuration
- Displays UAC enablement status
- Shows elevation prompt behavior settings

**Prerequisites:**
- PowerShell 5.1 or later
- Access to registry (HKLM)
- No administrator privileges required

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Reads UAC configuration from registry
2. Displays if UAC is enabled or disabled
3. Shows admin consent prompt behavior level
4. Reports secure desktop prompting status

**Important Notes:**
- UAC should be enabled on all systems
- Disabled UAC is major security risk
- Secure desktop prevents UI manipulation attacks
- Prompt behavior controls elevation frequency
- Typical use: security audits, compliance verification
- UAC disabled allows silent privilege escalation
- Most malware requires UAC disabled to persist
- Never disable UAC in production environments`,
    parameters: [],
    scriptTemplate: () => {
      return `# Get UAC Status
# Generated: ${new Date().toISOString()}

$UACKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"

$EnableLUA = Get-ItemPropertyValue -Path $UACKey -Name "EnableLUA"
$ConsentPromptBehaviorAdmin = Get-ItemPropertyValue -Path $UACKey -Name "ConsentPromptBehaviorAdmin"
$PromptOnSecureDesktop = Get-ItemPropertyValue -Path $UACKey -Name "PromptOnSecureDesktop"

Write-Host "User Account Control (UAC) Settings" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

Write-Host "UAC Enabled:" -NoNewline
if ($EnableLUA -eq 1) {
    Write-Host " Yes" -ForegroundColor Green
} else {
    Write-Host " No" -ForegroundColor Red
}

Write-Host "Admin Consent Behavior: " -NoNewline
switch ($ConsentPromptBehaviorAdmin) {
    0 { Write-Host "Never notify" -ForegroundColor Red }
    1 { Write-Host "Prompt credentials on secure desktop" -ForegroundColor Green }
    2 { Write-Host "Prompt consent on secure desktop" -ForegroundColor Green }
    3 { Write-Host "Prompt credentials" -ForegroundColor Yellow }
    4 { Write-Host "Prompt consent" -ForegroundColor Yellow }
    5 { Write-Host "Prompt for non-Windows binaries" -ForegroundColor Yellow }
}

Write-Host "Secure Desktop Prompt:" -NoNewline
if ($PromptOnSecureDesktop -eq 1) {
    Write-Host " Enabled" -ForegroundColor Green
} else {
    Write-Host " Disabled" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-password-policy',
    name: 'Set Local Password Policy',
    category: 'Security Policy',
    description: 'Configure password complexity, length, and age requirements',
    instructions: `**How This Task Works:**
- Configures local password policy settings
- Sets minimum length, maximum age, and complexity
- Uses secedit to modify security policy database

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Local security policy access

**What You Need to Provide:**
- Minimum password length (characters)
- Maximum password age (days)
- Complexity requirement (true/false)

**What the Script Does:**
1. Exports current security policy to temporary file
2. Modifies password policy settings
3. Imports updated policy to security database
4. Confirms new policy settings applied

**Important Notes:**
- Changes apply to new passwords only
- Existing passwords not affected until change
- Complexity requires 3 of 4: uppercase, lowercase, numbers, symbols
- Recommended: 12+ characters, 90 day max age
- Typical use: compliance enforcement, security hardening
- Domain policy overrides local policy
- Users must change password to meet new requirements
- Test on non-production systems first`,
    parameters: [
      { id: 'minLength', label: 'Minimum Password Length', type: 'number', required: true, defaultValue: 12 },
      { id: 'maxAge', label: 'Maximum Password Age (days)', type: 'number', required: true, defaultValue: 90 },
      { id: 'complexity', label: 'Require Complexity', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const minLength = Number(params.minLength);
      const maxAge = Number(params.maxAge);
      const complexity = params.complexity ? 1 : 0;
      
      return `# Set Local Password Policy
# Generated: ${new Date().toISOString()}

Write-Host "Configuring local password policy..." -ForegroundColor Cyan

# Export current policy
$TempFile = "$env:TEMP\\secpol.cfg"
secedit /export /cfg $TempFile /quiet

# Modify policy
$Content = Get-Content $TempFile
$Content = $Content -replace "MinimumPasswordLength = .*", "MinimumPasswordLength = ${minLength}"
$Content = $Content -replace "MaximumPasswordAge = .*", "MaximumPasswordAge = ${maxAge}"
$Content = $Content -replace "PasswordComplexity = .*", "PasswordComplexity = ${complexity}"
$Content | Set-Content $TempFile

# Import modified policy
secedit /configure /db $env:windir\\security\\local.sdb /cfg $TempFile /areas SECURITYPOLICY /quiet
Remove-Item $TempFile

Write-Host "✓ Password policy configured:" -ForegroundColor Green
Write-Host "  Minimum length: ${minLength} characters" -ForegroundColor Gray
Write-Host "  Maximum age: ${maxAge} days" -ForegroundColor Gray
Write-Host "  Complexity required: ${params.complexity ? 'Yes' : 'No'}" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-failed-logons',
    name: 'Get Failed Logon Attempts',
    category: 'Security Monitoring',
    description: 'Report failed logon attempts from Security event log',
    instructions: `**How This Task Works:**
- Analyzes Security event log for failed logon attempts
- Identifies potential brute force or password guessing attacks
- Shows top users with most failed attempts

**Prerequisites:**
- Administrator privileges required
- Security event logging enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Time range to analyze (hours back, default 24)
- Number of top users to display (default 10)

**What the Script Does:**
1. Queries Security log for Event ID 4625 (failed logons)
2. Parses events to extract username, domain, source IP
3. Groups failed attempts by username
4. Displays top N users with most failures
5. Shows total count of failed logons

**Important Notes:**
- High failed logon counts indicate attack attempts
- Multiple failures from same IP suggests brute force
- Event ID 4625 must be audited (enabled by default)
- Useful for detecting compromised credentials
- Typical use: daily security reviews, incident investigation
- Compare with successful logons for correlation
- Investigate users with 10+ failures
- Consider account lockout policies`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 },
      { id: 'topCount', label: 'Top N Users', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      const topCount = Number(params.topCount || 10);
      
      return `# Get Failed Logon Attempts
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$TopCount = ${topCount}
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Analyzing failed logons (last $Hours hours)..." -ForegroundColor Cyan

$Events = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625; StartTime=$StartTime} -ErrorAction SilentlyContinue

if ($Events) {
    # Parse failed logon events
    $FailedLogons = $Events | ForEach-Object {
        [xml]$XML = $_.ToXml()
        [PSCustomObject]@{
            Time = $_.TimeCreated
            User = $XML.Event.EventData.Data[5].'#text'
            Domain = $XML.Event.EventData.Data[6].'#text'
            SourceIP = $XML.Event.EventData.Data[19].'#text'
        }
    }
    
    # Group by user
    $TopUsers = $FailedLogons | Group-Object User | Sort-Object Count -Descending | Select-Object -First $TopCount @{N='Username'; E={$_.Name}}, Count
    
    Write-Host ""
    Write-Host "⚠ Total failed logons: $($Events.Count)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Top failed logon attempts by user:" -ForegroundColor Yellow
    $TopUsers | Format-Table -AutoSize
} else {
    Write-Host "✓ No failed logons detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'disable-guest-account',
    name: 'Disable Guest Account',
    category: 'Account Security',
    description: 'Disable the built-in Guest account for security',
    instructions: `**How This Task Works:**
- Disables the built-in Guest account on Windows
- Prevents unauthorized access via guest login
- Verifies account disabled status after change

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Guest account exists (default on Windows)

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Disables the built-in Guest user account
2. Confirms successful disablement
3. Displays updated guest account status

**Important Notes:**
- Guest account is security risk (no password required)
- Should be disabled on all production systems
- Part of CIS benchmark security recommendations
- Enabled guest allows unauthenticated access
- Typical use: security hardening, compliance requirements
- Guest account rarely needed in modern environments
- Cannot be deleted, only disabled
- Run after initial system deployment`,
    parameters: [],
    scriptTemplate: () => {
      return `# Disable Guest Account
# Generated: ${new Date().toISOString()}

try {
    Disable-LocalUser -Name "Guest" -ErrorAction Stop
    Write-Host "✓ Guest account disabled" -ForegroundColor Green
    
    # Verify status
    $Guest = Get-LocalUser -Name "Guest"
    Write-Host ""
    Write-Host "Guest account status:" -ForegroundColor Gray
    Write-Host "  Enabled: $($Guest.Enabled)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to disable Guest account: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'audit-firewall-rules',
    name: 'Audit Firewall Rules (Suspicious)',
    category: 'Security Monitoring',
    description: 'Report potentially suspicious firewall rules (any protocols, disabled rules with suspicious ports)',
    instructions: `**How This Task Works:**
- Audits Windows Firewall rules for security concerns
- Identifies suspicious configurations and protocols
- Reports disabled rules and overly permissive settings

**Prerequisites:**
- PowerShell 5.1 or later
- Windows Firewall enabled
- Administrator privileges required

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Retrieves all Windows Firewall rules
2. Identifies rules allowing "Any" protocol
3. Finds disabled rules with common attack ports
4. Lists rules with broad port ranges
5. Reports potentially malicious configurations

**Important Notes:**
- "Any" protocol rules are security risk
- Disabled rules may hide backdoors
- Common attack ports: RDP (3389), SMB (445), WinRM (5985)
- Review and remove unnecessary rules regularly
- Typical use: security audits, breach investigations
- Malware often creates permissive firewall rules
- Document legitimate "Any" protocol rules
- Investigate unfamiliar rule names`,
    parameters: [],
    scriptTemplate: () => {
      return `# Audit Firewall Rules
# Generated: ${new Date().toISOString()}

Write-Host "Auditing firewall rules for security issues..." -ForegroundColor Cyan
Write-Host ""

# Get all rules
$AllRules = Get-NetFirewallRule

# Find potentially suspicious rules
$AllowAny = Get-NetFirewallRule -Action Allow | Where-Object { 
    $PortFilter = $_ | Get-NetFirewallPortFilter
    $PortFilter.Protocol -eq 'Any'
}

$DisabledAllow = Get-NetFirewallRule -Action Allow -Enabled False

Write-Host "⚠ Rules allowing ANY protocol:" -ForegroundColor Yellow
Write-Host "  Count: $($AllowAny.Count)" -ForegroundColor Gray
if ($AllowAny) {
    $AllowAny | Select-Object -First 10 DisplayName, Direction | Format-Table -AutoSize
}

Write-Host ""
Write-Host "⚠ Disabled ALLOW rules:" -ForegroundColor Yellow
Write-Host "  Count: $($DisabledAllow.Count)" -ForegroundColor Gray
if ($DisabledAllow) {
    $DisabledAllow | Select-Object -First 10 DisplayName, Direction | Format-Table -AutoSize
}

Write-Host ""
Write-Host "Total firewall rules: $($AllRules.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'check-windows-updates',
    name: 'Check Windows Update Status',
    category: 'Patch Management',
    description: 'Check for available Windows updates and installation status',
    instructions: `**How This Task Works:**
- Checks Windows Update service status
- Displays recent update installation history
- Shows success or failure of recent patches

**Prerequisites:**
- PowerShell 5.1 or later
- Windows Update service installed
- COM access for Update Session

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Checks if Windows Update service is running
2. Creates Microsoft Update Session COM object
3. Queries last 10 update installation attempts
4. Displays each update title and installation result
5. Shows date and status (Succeeded/Failed/Aborted)

**Important Notes:**
- Does not check for NEW available updates (use Settings app)
- Only shows installation history
- Failed updates require investigation
- Windows Update service must be running
- Typical use: verify patch deployment, troubleshoot failures
- Result codes: 2=Success, 3=Partial, 4=Failed, 5=Aborted
- Run monthly to verify patching compliance
- Coordinate with maintenance windows`,
    parameters: [],
    scriptTemplate: () => {
      return `# Check Windows Update Status
# Generated: ${new Date().toISOString()}

Write-Host "Checking Windows Update status..." -ForegroundColor Cyan
Write-Host ""

# Check Windows Update service
$WUService = Get-Service -Name wuauserv
Write-Host "Windows Update Service:" -NoNewline
if ($WUService.Status -eq 'Running') {
    Write-Host " Running" -ForegroundColor Green
} else {
    Write-Host " $($WUService.Status)" -ForegroundColor Red
}

# Get update history
Write-Host ""
Write-Host "Recent update history (last 10):" -ForegroundColor Cyan
$Session = New-Object -ComObject Microsoft.Update.Session
$Searcher = $Session.CreateUpdateSearcher()
$History = $Searcher.QueryHistory(0, 10)

$History | ForEach-Object {
    $Status = switch ($_.ResultCode) {
        1 { "Missing/Superseded" }
        2 { "Succeeded" }
        3 { "Succeeded with errors" }
        4 { "Failed" }
        5 { "Aborted" }
        default { "Unknown" }
    }
    
    Write-Host "  $($_.Title)" -ForegroundColor Gray
    Write-Host "    Date: $($_.Date), Status: $Status" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Note: Use Windows Update settings to check for new updates" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'export-security-baseline',
    name: 'Export Security Configuration Baseline',
    category: 'Security Policy',
    description: 'Export current security policy for compliance verification',
    instructions: `**How This Task Works:**
- Exports complete local security policy configuration
- Creates .inf file with all security settings
- Used for compliance audits and baseline comparisons

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- secedit utility available (built-in to Windows)

**What You Need to Provide:**
- Export file path (must end in .inf)

**What the Script Does:**
1. Runs secedit to export security policy
2. Saves configuration to specified .inf file
3. Displays export file path and size
4. Confirms successful export

**Important Notes:**
- Captures ALL local security policy settings
- Essential for compliance documentation (SOC2, ISO27001)
- Compare baselines over time to detect drift
- Use as template for other systems
- Typical use: quarterly audits, pre/post hardening
- Store baselines in version control
- Review after major changes or patches
- Can be re-imported to restore settings`,
    parameters: [
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Baselines\\SecurityPolicy.inf' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Security Baseline
# Generated: ${new Date().toISOString()}

$ExportPath = "${exportPath}"

Write-Host "Exporting security policy baseline..." -ForegroundColor Cyan

secedit /export /cfg $ExportPath /quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Security policy exported:" -ForegroundColor Green
    Write-Host "  File: $ExportPath" -ForegroundColor Gray
    
    $FileSize = (Get-Item $ExportPath).Length / 1KB
    Write-Host "  Size: $([math]::Round($FileSize, 2)) KB" -ForegroundColor Gray
} else {
    Write-Host "✗ Export failed" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'export-firewall-rules',
    name: 'Export Firewall Rules',
    category: 'Firewall Management',
    description: 'Export all Windows Firewall rules to file for backup or migration',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports all Windows Firewall rules to specified format
- Creates backup for disaster recovery or migration
- Supports CSV or JSON export formats

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Export file path
- Export format (CSV or JSON)

**What the Script Does:**
1. Retrieves all Windows Firewall rules
2. Gathers port filter and address information
3. Exports rules with all properties
4. Confirms export with file size and rule count

**Important Notes:**
- Essential for disaster recovery planning
- Use before major firewall changes
- Compare exports to track rule changes
- Typical use: migrations, backups, audits`,
    parameters: [
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Backups\\FirewallRules.csv' },
      { id: 'format', label: 'Export Format', type: 'select', required: true, options: ['CSV', 'JSON'], defaultValue: 'CSV' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const format = params.format;
      
      return `# Export Firewall Rules
# Generated: ${new Date().toISOString()}

$ExportPath = "${exportPath}"
$Format = "${format}"

Write-Host "Exporting Windows Firewall rules..." -ForegroundColor Cyan

try {
    $Rules = Get-NetFirewallRule | ForEach-Object {
        $PortFilter = $_ | Get-NetFirewallPortFilter
        $AddressFilter = $_ | Get-NetFirewallAddressFilter
        
        [PSCustomObject]@{
            Name = $_.Name
            DisplayName = $_.DisplayName
            Direction = $_.Direction
            Action = $_.Action
            Enabled = $_.Enabled
            Profile = $_.Profile
            Protocol = $PortFilter.Protocol
            LocalPort = $PortFilter.LocalPort
            RemotePort = $PortFilter.RemotePort
            LocalAddress = $AddressFilter.LocalAddress
            RemoteAddress = $AddressFilter.RemoteAddress
        }
    }
    
    if ($Format -eq "CSV") {
        $Rules | Export-Csv -Path $ExportPath -NoTypeInformation
    } else {
        $Rules | ConvertTo-Json -Depth 3 | Out-File -FilePath $ExportPath
    }
    
    Write-Host "✓ Exported $($Rules.Count) firewall rules" -ForegroundColor Green
    Write-Host "  File: $ExportPath" -ForegroundColor Gray
    Write-Host "  Size: $([math]::Round((Get-Item $ExportPath).Length / 1KB, 2)) KB" -ForegroundColor Gray
} catch {
    Write-Host "✗ Export failed: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'create-firewall-rule-inbound',
    name: 'Create Inbound Firewall Rule',
    category: 'Firewall Management',
    description: 'Create a new inbound firewall rule for specific port and protocol',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates new inbound Windows Firewall rule
- Allows or blocks specific traffic to local ports
- Supports TCP, UDP, or both protocols

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Rule name and description
- Port number(s) to allow
- Protocol (TCP/UDP)
- Action (Allow/Block)

**What the Script Does:**
1. Creates new inbound firewall rule
2. Configures port and protocol settings
3. Sets rule action (allow or block)
4. Displays rule configuration summary

**Important Notes:**
- Test rules before production deployment
- Document business justification for rules
- Use specific ports, avoid "Any"
- Typical use: application access, service ports`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Allow-MyApp-Inbound' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Allow inbound traffic for MyApp' },
      { id: 'port', label: 'Port(s)', type: 'text', required: true, placeholder: '443,8080' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['TCP', 'UDP', 'Any'], defaultValue: 'TCP' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Allow' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const description = escapePowerShellString(params.description || '');
      const port = escapePowerShellString(params.port);
      const protocol = params.protocol;
      const action = params.action;
      
      return `# Create Inbound Firewall Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$Description = "${description}"
$Port = "${port}"
$Protocol = "${protocol}"
$Action = "${action}"

Write-Host "Creating inbound firewall rule..." -ForegroundColor Cyan

try {
    $Params = @{
        DisplayName = $RuleName
        Direction = "Inbound"
        Action = $Action
        Protocol = $Protocol
        LocalPort = $Port.Split(',')
        Enabled = $true
    }
    
    if ($Description) {
        $Params['Description'] = $Description
    }
    
    New-NetFirewallRule @Params -ErrorAction Stop
    
    Write-Host "✓ Inbound firewall rule created" -ForegroundColor Green
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Direction: Inbound" -ForegroundColor Gray
    Write-Host "  Port(s): $Port" -ForegroundColor Gray
    Write-Host "  Protocol: $Protocol" -ForegroundColor Gray
    Write-Host "  Action: $Action" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create rule: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'create-firewall-rule-outbound',
    name: 'Create Outbound Firewall Rule',
    category: 'Firewall Management',
    description: 'Create a new outbound firewall rule for specific port and protocol',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates new outbound Windows Firewall rule
- Controls traffic leaving the system
- Supports TCP, UDP, or both protocols

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Rule name and description
- Remote port number(s)
- Protocol (TCP/UDP)
- Action (Allow/Block)

**What the Script Does:**
1. Creates new outbound firewall rule
2. Configures remote port and protocol
3. Sets rule action (allow or block)
4. Displays rule configuration summary

**Important Notes:**
- Outbound rules control egress traffic
- Block rules useful for data loss prevention
- Document business justification
- Typical use: restrict app communications`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Block-Telemetry-Outbound' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Block outbound telemetry' },
      { id: 'remotePort', label: 'Remote Port(s)', type: 'text', required: true, placeholder: '443,80' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['TCP', 'UDP', 'Any'], defaultValue: 'TCP' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Block' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const description = escapePowerShellString(params.description || '');
      const remotePort = escapePowerShellString(params.remotePort);
      const protocol = params.protocol;
      const action = params.action;
      
      return `# Create Outbound Firewall Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$Description = "${description}"
$RemotePort = "${remotePort}"
$Protocol = "${protocol}"
$Action = "${action}"

Write-Host "Creating outbound firewall rule..." -ForegroundColor Cyan

try {
    $Params = @{
        DisplayName = $RuleName
        Direction = "Outbound"
        Action = $Action
        Protocol = $Protocol
        RemotePort = $RemotePort.Split(',')
        Enabled = $true
    }
    
    if ($Description) {
        $Params['Description'] = $Description
    }
    
    New-NetFirewallRule @Params -ErrorAction Stop
    
    Write-Host "✓ Outbound firewall rule created" -ForegroundColor Green
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Direction: Outbound" -ForegroundColor Gray
    Write-Host "  Remote Port(s): $RemotePort" -ForegroundColor Gray
    Write-Host "  Protocol: $Protocol" -ForegroundColor Gray
    Write-Host "  Action: $Action" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create rule: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'enable-disable-firewall-rule',
    name: 'Enable or Disable Firewall Rule',
    category: 'Firewall Management',
    description: 'Enable or disable an existing Windows Firewall rule by name',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables or disables existing firewall rules
- Supports exact name or wildcard matching
- Shows affected rules after change

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Rule must exist before modification

**What You Need to Provide:**
- Rule name or pattern (wildcards supported)
- Action: Enable or Disable

**What the Script Does:**
1. Finds matching firewall rules
2. Enables or disables matched rules
3. Displays count of modified rules
4. Lists affected rule names

**Important Notes:**
- Use wildcards for bulk changes
- Disabled rules remain in configuration
- Test changes in non-production first
- Typical use: maintenance windows, troubleshooting`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name/Pattern', type: 'text', required: true, placeholder: '*RemoteDesktop*' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Disable' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const action = params.action;
      
      return `# Enable/Disable Firewall Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$Action = "${action}"

Write-Host "$Action firewall rule(s) matching: $RuleName" -ForegroundColor Cyan

try {
    $Rules = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
    
    if (-not $Rules) {
        Write-Host "⚠ No rules found matching: $RuleName" -ForegroundColor Yellow
        exit
    }
    
    if ($Action -eq "Enable") {
        $Rules | Enable-NetFirewallRule -ErrorAction Stop
    } else {
        $Rules | Disable-NetFirewallRule -ErrorAction Stop
    }
    
    Write-Host "✓ $($Action)d $($Rules.Count) rule(s)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Affected rules:" -ForegroundColor Gray
    $Rules | Select-Object DisplayName, Enabled | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed to modify rule: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'remove-firewall-rule',
    name: 'Remove Firewall Rule',
    category: 'Firewall Management',
    description: 'Remove a Windows Firewall rule by name',
    isPremium: true,
    instructions: `**How This Task Works:**
- Permanently removes firewall rules
- Supports exact name matching
- Confirms deletion before removal

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Rule must exist

**What You Need to Provide:**
- Exact rule display name

**What the Script Does:**
1. Locates rule by display name
2. Removes the firewall rule
3. Confirms successful deletion
4. Verifies rule no longer exists

**Important Notes:**
- DESTRUCTIVE: Cannot be undone
- Export rules before bulk deletions
- Use for cleanup of obsolete rules
- Typical use: application removal, cleanup`,
    parameters: [
      { id: 'ruleName', label: 'Rule Display Name', type: 'text', required: true, placeholder: 'My Custom Rule' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      
      return `# Remove Firewall Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"

Write-Host "Removing firewall rule: $RuleName" -ForegroundColor Yellow

try {
    $Rule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction Stop
    
    Write-Host "Found rule:" -ForegroundColor Gray
    Write-Host "  Direction: $($Rule.Direction)" -ForegroundColor Gray
    Write-Host "  Action: $($Rule.Action)" -ForegroundColor Gray
    Write-Host ""
    
    Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction Stop
    Write-Host "✓ Firewall rule removed" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to remove rule: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'add-defender-exclusion',
    name: 'Add Windows Defender Exclusion',
    category: 'Windows Defender',
    description: 'Add path, extension, or process exclusion to Windows Defender',
    isPremium: true,
    instructions: `**How This Task Works:**
- Adds exclusions to Windows Defender scanning
- Supports path, extension, and process exclusions
- Improves performance for trusted applications

**Prerequisites:**
- Administrator privileges required
- Windows Defender enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Exclusion type (Path, Extension, Process)
- Exclusion value

**What the Script Does:**
1. Adds specified exclusion to Defender
2. Confirms exclusion was added
3. Lists current exclusions of that type
4. Displays total exclusion count

**Important Notes:**
- SECURITY RISK: Excluded items not scanned
- Only exclude trusted/verified items
- Document business justification
- Typical use: development tools, backup software`,
    parameters: [
      { id: 'exclusionType', label: 'Exclusion Type', type: 'select', required: true, options: ['Path', 'Extension', 'Process'], defaultValue: 'Path' },
      { id: 'exclusionValue', label: 'Exclusion Value', type: 'text', required: true, placeholder: 'C:\\DevTools or .bak or devenv.exe' }
    ],
    scriptTemplate: (params) => {
      const exclusionType = params.exclusionType;
      const exclusionValue = escapePowerShellString(params.exclusionValue);
      
      return `# Add Windows Defender Exclusion
# Generated: ${new Date().toISOString()}

$ExclusionType = "${exclusionType}"
$ExclusionValue = "${exclusionValue}"

Write-Host "Adding Defender exclusion..." -ForegroundColor Cyan
Write-Host "  Type: $ExclusionType" -ForegroundColor Gray
Write-Host "  Value: $ExclusionValue" -ForegroundColor Gray
Write-Host ""

try {
    switch ($ExclusionType) {
        "Path" {
            Add-MpPreference -ExclusionPath $ExclusionValue -ErrorAction Stop
        }
        "Extension" {
            Add-MpPreference -ExclusionExtension $ExclusionValue -ErrorAction Stop
        }
        "Process" {
            Add-MpPreference -ExclusionProcess $ExclusionValue -ErrorAction Stop
        }
    }
    
    Write-Host "✓ Exclusion added successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ WARNING: Excluded items will NOT be scanned" -ForegroundColor Yellow
    
    # Show current exclusions
    $Prefs = Get-MpPreference
    Write-Host ""
    Write-Host "Current $ExclusionType exclusions:" -ForegroundColor Gray
    switch ($ExclusionType) {
        "Path" { $Prefs.ExclusionPath | ForEach-Object { Write-Host "  $_" } }
        "Extension" { $Prefs.ExclusionExtension | ForEach-Object { Write-Host "  $_" } }
        "Process" { $Prefs.ExclusionProcess | ForEach-Object { Write-Host "  $_" } }
    }
} catch {
    Write-Host "✗ Failed to add exclusion: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'remove-defender-exclusion',
    name: 'Remove Windows Defender Exclusion',
    category: 'Windows Defender',
    description: 'Remove an existing exclusion from Windows Defender',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes exclusions from Windows Defender
- Re-enables scanning for previously excluded items
- Supports path, extension, and process exclusions

**Prerequisites:**
- Administrator privileges required
- Windows Defender enabled
- Exclusion must exist

**What You Need to Provide:**
- Exclusion type (Path, Extension, Process)
- Exclusion value to remove

**What the Script Does:**
1. Removes specified exclusion from Defender
2. Confirms exclusion was removed
3. Lists remaining exclusions of that type
4. Item will now be scanned

**Important Notes:**
- Enables scanning of previously excluded items
- Use during security reviews
- Remove obsolete exclusions regularly
- Typical use: cleanup, security hardening`,
    parameters: [
      { id: 'exclusionType', label: 'Exclusion Type', type: 'select', required: true, options: ['Path', 'Extension', 'Process'], defaultValue: 'Path' },
      { id: 'exclusionValue', label: 'Exclusion Value', type: 'text', required: true, placeholder: 'C:\\DevTools or .bak or devenv.exe' }
    ],
    scriptTemplate: (params) => {
      const exclusionType = params.exclusionType;
      const exclusionValue = escapePowerShellString(params.exclusionValue);
      
      return `# Remove Windows Defender Exclusion
# Generated: ${new Date().toISOString()}

$ExclusionType = "${exclusionType}"
$ExclusionValue = "${exclusionValue}"

Write-Host "Removing Defender exclusion..." -ForegroundColor Cyan

try {
    switch ($ExclusionType) {
        "Path" {
            Remove-MpPreference -ExclusionPath $ExclusionValue -ErrorAction Stop
        }
        "Extension" {
            Remove-MpPreference -ExclusionExtension $ExclusionValue -ErrorAction Stop
        }
        "Process" {
            Remove-MpPreference -ExclusionProcess $ExclusionValue -ErrorAction Stop
        }
    }
    
    Write-Host "✓ Exclusion removed: $ExclusionValue" -ForegroundColor Green
    Write-Host "  Item will now be scanned by Defender" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to remove exclusion: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-defender-threat-report',
    name: 'Get Defender Threat Detection Report',
    category: 'Windows Defender',
    description: 'Generate report of all detected threats and their status',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports all threats detected by Windows Defender
- Shows threat status (quarantined, removed, etc.)
- Exports detailed report for analysis

**Prerequisites:**
- Windows Defender enabled
- PowerShell 5.1 or later
- Administrator privileges required

**What You Need to Provide:**
- Optional: Export path for CSV report

**What the Script Does:**
1. Retrieves all detected threats
2. Displays threat names and severity
3. Shows detection time and status
4. Optionally exports to CSV

**Important Notes:**
- Essential for security incident review
- Quarantined items need manual review
- Active threats require immediate action
- Typical use: security audits, incident response`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (Optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\ThreatReport.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Defender Threat Detection Report
# Generated: ${new Date().toISOString()}

Write-Host "Windows Defender Threat Detection Report" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
    $ThreatCatalog = Get-MpThreat -ErrorAction SilentlyContinue
    
    if ($Threats -or $ThreatCatalog) {
        Write-Host "⚠ Threat Detections Found" -ForegroundColor Red
        Write-Host ""
        
        $ThreatCatalog | ForEach-Object {
            Write-Host "Threat: $($_.ThreatName)" -ForegroundColor Yellow
            Write-Host "  Severity: $($_.SeverityID)" -ForegroundColor Gray
            Write-Host "  Status: $($_.ThreatStatusID)" -ForegroundColor Gray
            Write-Host "  Resources: $($_.Resources -join ', ')" -ForegroundColor Gray
            Write-Host ""
        }
        
${exportPath ? `        $ThreatCatalog | Select-Object ThreatName, SeverityID, ThreatStatusID, Resources | Export-Csv "${exportPath}" -NoTypeInformation
        Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    } else {
        Write-Host "✓ No threats detected" -ForegroundColor Green
    }
    
    # Show summary
    Write-Host ""
    Write-Host "Quarantine Status:" -ForegroundColor Cyan
    $Quarantine = Get-MpThreat -ErrorAction SilentlyContinue | Where-Object { $_.IsActive -eq $false }
    Write-Host "  Quarantined items: $($Quarantine.Count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to retrieve threats: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-defender-exclusions',
    name: 'List Windows Defender Exclusions',
    category: 'Windows Defender',
    description: 'List all configured Windows Defender exclusions',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all Windows Defender exclusions
- Shows path, extension, and process exclusions
- Identifies potential security gaps

**Prerequisites:**
- PowerShell 5.1 or later
- Windows Defender enabled
- No special privileges required

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Retrieves all Defender preferences
2. Lists path exclusions
3. Lists extension exclusions
4. Lists process exclusions

**Important Notes:**
- Review exclusions regularly
- Excessive exclusions reduce protection
- Remove obsolete exclusions
- Typical use: security audits, reviews`,
    parameters: [],
    scriptTemplate: () => {
      return `# List Windows Defender Exclusions
# Generated: ${new Date().toISOString()}

Write-Host "Windows Defender Exclusions" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$Prefs = Get-MpPreference

Write-Host "Path Exclusions:" -ForegroundColor Yellow
if ($Prefs.ExclusionPath) {
    $Prefs.ExclusionPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  (None configured)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Extension Exclusions:" -ForegroundColor Yellow
if ($Prefs.ExclusionExtension) {
    $Prefs.ExclusionExtension | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  (None configured)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Process Exclusions:" -ForegroundColor Yellow
if ($Prefs.ExclusionProcess) {
    $Prefs.ExclusionProcess | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  (None configured)" -ForegroundColor Gray
}

Write-Host ""
$TotalExclusions = ($Prefs.ExclusionPath.Count + $Prefs.ExclusionExtension.Count + $Prefs.ExclusionProcess.Count)
Write-Host "Total exclusions: $TotalExclusions" -ForegroundColor Gray`;
    }
  },

  {
    id: 'configure-audit-policy',
    name: 'Configure Audit Policy',
    category: 'Security Policy',
    description: 'Enable or configure Windows security audit policies',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows audit policy settings
- Enables logging of security-relevant events
- Supports common audit categories

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Local security policy access

**What You Need to Provide:**
- Audit category to configure
- Audit setting (Success, Failure, Both, None)

**What the Script Does:**
1. Sets audit policy for specified category
2. Configures success and/or failure auditing
3. Confirms new audit settings
4. Displays current configuration

**Important Notes:**
- Essential for security monitoring
- Enable auditing before incidents occur
- Balance logging with storage requirements
- Typical use: compliance, SIEM integration`,
    parameters: [
      { id: 'category', label: 'Audit Category', type: 'select', required: true, options: ['Logon', 'Object Access', 'Privilege Use', 'Account Management', 'Policy Change', 'System'], defaultValue: 'Logon' },
      { id: 'setting', label: 'Audit Setting', type: 'select', required: true, options: ['Success', 'Failure', 'Success,Failure', 'No Auditing'], defaultValue: 'Success,Failure' }
    ],
    scriptTemplate: (params) => {
      const category = escapePowerShellString(params.category);
      const setting = params.setting;
      
      return `# Configure Audit Policy
# Generated: ${new Date().toISOString()}

$Category = "${category}"
$Setting = "${setting}"

Write-Host "Configuring audit policy..." -ForegroundColor Cyan
Write-Host "  Category: $Category" -ForegroundColor Gray
Write-Host "  Setting: $Setting" -ForegroundColor Gray
Write-Host ""

try {
    # Map friendly names to auditpol categories
    $CategoryMap = @{
        "Logon" = "Logon/Logoff"
        "Object Access" = "Object Access"
        "Privilege Use" = "Privilege Use"
        "Account Management" = "Account Management"
        "Policy Change" = "Policy Change"
        "System" = "System"
    }
    
    $AuditCategory = $CategoryMap[$Category]
    
    switch ($Setting) {
        "Success" { auditpol /set /category:"$AuditCategory" /success:enable /failure:disable }
        "Failure" { auditpol /set /category:"$AuditCategory" /success:disable /failure:enable }
        "Success,Failure" { auditpol /set /category:"$AuditCategory" /success:enable /failure:enable }
        "No Auditing" { auditpol /set /category:"$AuditCategory" /success:disable /failure:disable }
    }
    
    Write-Host "✓ Audit policy configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current setting:" -ForegroundColor Gray
    auditpol /get /category:"$AuditCategory"
} catch {
    Write-Host "✗ Failed to configure audit policy: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-account-lockout-policy',
    name: 'Set Account Lockout Policy',
    category: 'Security Policy',
    description: 'Configure account lockout threshold, duration, and reset time',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures account lockout policy settings
- Sets threshold, duration, and reset window
- Protects against brute force attacks

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Local security policy access

**What You Need to Provide:**
- Lockout threshold (failed attempts)
- Lockout duration (minutes)
- Reset counter after (minutes)

**What the Script Does:**
1. Exports current security policy
2. Modifies lockout settings
3. Imports updated policy
4. Confirms new settings

**Important Notes:**
- Balance security with user experience
- Too low threshold causes lockouts
- Coordinate with helpdesk procedures
- Typical use: security hardening, compliance`,
    parameters: [
      { id: 'threshold', label: 'Lockout Threshold', type: 'number', required: true, defaultValue: 5 },
      { id: 'duration', label: 'Lockout Duration (minutes)', type: 'number', required: true, defaultValue: 30 },
      { id: 'resetCounter', label: 'Reset Counter After (minutes)', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const threshold = Number(params.threshold);
      const duration = Number(params.duration);
      const resetCounter = Number(params.resetCounter);
      
      return `# Set Account Lockout Policy
# Generated: ${new Date().toISOString()}

Write-Host "Configuring account lockout policy..." -ForegroundColor Cyan

$TempFile = "$env:TEMP\\secpol.cfg"
secedit /export /cfg $TempFile /quiet

$Content = Get-Content $TempFile
$Content = $Content -replace "LockoutBadCount = .*", "LockoutBadCount = ${threshold}"
$Content = $Content -replace "LockoutDuration = .*", "LockoutDuration = ${duration}"
$Content = $Content -replace "ResetLockoutCount = .*", "ResetLockoutCount = ${resetCounter}"
$Content | Set-Content $TempFile

secedit /configure /db $env:windir\\security\\local.sdb /cfg $TempFile /areas SECURITYPOLICY /quiet
Remove-Item $TempFile

Write-Host "✓ Account lockout policy configured:" -ForegroundColor Green
Write-Host "  Lockout threshold: ${threshold} invalid attempts" -ForegroundColor Gray
Write-Host "  Lockout duration: ${duration} minutes" -ForegroundColor Gray
Write-Host "  Reset counter after: ${resetCounter} minutes" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-certificate-expiration',
    name: 'Get Expiring Certificates Report',
    category: 'Certificate Management',
    description: 'Report certificates expiring within specified days',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans certificate stores for expiring certs
- Reports certificates expiring within threshold
- Identifies critical certificates needing renewal

**Prerequisites:**
- PowerShell 5.1 or later
- Access to certificate stores
- No special privileges for personal store

**What You Need to Provide:**
- Days threshold for expiration warning
- Certificate store to scan

**What the Script Does:**
1. Scans specified certificate store
2. Identifies certificates expiring within threshold
3. Reports subject, issuer, and expiration date
4. Sorts by expiration date

**Important Notes:**
- Run monthly to prevent outages
- Critical for web servers and applications
- Expired certs cause service disruptions
- Typical use: certificate lifecycle management`,
    parameters: [
      { id: 'days', label: 'Days Until Expiration', type: 'number', required: true, defaultValue: 30 },
      { id: 'store', label: 'Certificate Store', type: 'select', required: true, options: ['LocalMachine\\My', 'LocalMachine\\Root', 'CurrentUser\\My'], defaultValue: 'LocalMachine\\My' }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days);
      const store = escapePowerShellString(params.store);
      
      return `# Get Expiring Certificates Report
# Generated: ${new Date().toISOString()}

$Days = ${days}
$Store = "Cert:\\${store}"
$ExpirationDate = (Get-Date).AddDays($Days)

Write-Host "Certificate Expiration Report" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host "Store: $Store" -ForegroundColor Gray
Write-Host "Checking certificates expiring within $Days days" -ForegroundColor Gray
Write-Host ""

try {
    $Certs = Get-ChildItem -Path $Store | Where-Object {
        $_.NotAfter -lt $ExpirationDate -and $_.NotAfter -gt (Get-Date)
    } | Sort-Object NotAfter
    
    if ($Certs) {
        Write-Host "⚠ Certificates expiring soon:" -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($Cert in $Certs) {
            $DaysLeft = ($Cert.NotAfter - (Get-Date)).Days
            $Color = if ($DaysLeft -lt 7) { "Red" } elseif ($DaysLeft -lt 14) { "Yellow" } else { "Gray" }
            
            Write-Host "Subject: $($Cert.Subject)" -ForegroundColor $Color
            Write-Host "  Issuer: $($Cert.Issuer)" -ForegroundColor Gray
            Write-Host "  Expires: $($Cert.NotAfter) ($DaysLeft days)" -ForegroundColor $Color
            Write-Host "  Thumbprint: $($Cert.Thumbprint)" -ForegroundColor Gray
            Write-Host ""
        }
        
        Write-Host "Total expiring: $($Certs.Count)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ No certificates expiring within $Days days" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to check certificates: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'export-certificate',
    name: 'Export Certificate',
    category: 'Certificate Management',
    description: 'Export a certificate to file by thumbprint',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports certificate to file by thumbprint
- Supports CER (public) or PFX (with private key)
- Creates backup of important certificates

**Prerequisites:**
- Administrator privileges for LocalMachine store
- Access to certificate private key for PFX
- PowerShell 5.1 or later

**What You Need to Provide:**
- Certificate thumbprint
- Export path and format
- Password for PFX export

**What the Script Does:**
1. Locates certificate by thumbprint
2. Exports to specified format
3. Secures PFX with password
4. Confirms export success

**Important Notes:**
- PFX includes private key (secure storage required)
- CER is public certificate only
- Store PFX backups securely
- Typical use: certificate backup, migration`,
    parameters: [
      { id: 'thumbprint', label: 'Certificate Thumbprint', type: 'text', required: true, placeholder: 'A1B2C3D4E5F6...' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Certs\\backup.pfx' },
      { id: 'format', label: 'Export Format', type: 'select', required: true, options: ['PFX', 'CER'], defaultValue: 'PFX' },
      { id: 'password', label: 'PFX Password (if PFX)', type: 'text', required: false, placeholder: 'SecurePassword123' }
    ],
    scriptTemplate: (params) => {
      const thumbprint = escapePowerShellString(params.thumbprint);
      const exportPath = escapePowerShellString(params.exportPath);
      const format = params.format;
      const password = escapePowerShellString(params.password || '');
      
      return `# Export Certificate
# Generated: ${new Date().toISOString()}

$Thumbprint = "${thumbprint}"
$ExportPath = "${exportPath}"
$Format = "${format}"
${password ? `$Password = ConvertTo-SecureString -String "${password}" -Force -AsPlainText` : ''}

Write-Host "Exporting certificate..." -ForegroundColor Cyan

try {
    $Cert = Get-ChildItem -Path Cert:\\ -Recurse | Where-Object { $_.Thumbprint -eq $Thumbprint } | Select-Object -First 1
    
    if (-not $Cert) {
        Write-Host "✗ Certificate not found: $Thumbprint" -ForegroundColor Red
        exit
    }
    
    Write-Host "Found: $($Cert.Subject)" -ForegroundColor Gray
    
    if ($Format -eq "PFX") {
        ${password ? 'Export-PfxCertificate -Cert $Cert -FilePath $ExportPath -Password $Password' : 'Write-Host "✗ Password required for PFX export" -ForegroundColor Red; exit'}
    } else {
        Export-Certificate -Cert $Cert -FilePath $ExportPath -Type CERT
    }
    
    Write-Host "✓ Certificate exported to: $ExportPath" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round((Get-Item $ExportPath).Length / 1KB, 2)) KB" -ForegroundColor Gray
} catch {
    Write-Host "✗ Export failed: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'import-certificate',
    name: 'Import Certificate',
    category: 'Certificate Management',
    description: 'Import a certificate from file into certificate store',
    isPremium: true,
    instructions: `**How This Task Works:**
- Imports certificate from PFX or CER file
- Places in specified certificate store
- Configures key storage options

**Prerequisites:**
- Administrator privileges for LocalMachine
- Certificate file accessible
- Password for PFX files

**What You Need to Provide:**
- Certificate file path
- Target store
- Password for PFX

**What the Script Does:**
1. Reads certificate from file
2. Imports to specified store
3. Configures private key options
4. Confirms import success

**Important Notes:**
- PFX includes private key
- Use Exportable only when necessary
- Verify certificate chain after import
- Typical use: deployment, migration`,
    parameters: [
      { id: 'certPath', label: 'Certificate Path', type: 'path', required: true, placeholder: 'C:\\Certs\\certificate.pfx' },
      { id: 'store', label: 'Target Store', type: 'select', required: true, options: ['LocalMachine\\My', 'LocalMachine\\Root', 'LocalMachine\\TrustedPeople', 'CurrentUser\\My'], defaultValue: 'LocalMachine\\My' },
      { id: 'password', label: 'PFX Password', type: 'text', required: false, placeholder: 'SecurePassword123' },
      { id: 'exportable', label: 'Make Exportable', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const certPath = escapePowerShellString(params.certPath);
      const store = escapePowerShellString(params.store);
      const password = escapePowerShellString(params.password || '');
      const exportable = params.exportable;
      
      return `# Import Certificate
# Generated: ${new Date().toISOString()}

$CertPath = "${certPath}"
$Store = "Cert:\\${store}"
${password ? `$Password = ConvertTo-SecureString -String "${password}" -Force -AsPlainText` : ''}

Write-Host "Importing certificate..." -ForegroundColor Cyan
Write-Host "  File: $CertPath" -ForegroundColor Gray
Write-Host "  Store: $Store" -ForegroundColor Gray

try {
    $Extension = [System.IO.Path]::GetExtension($CertPath).ToLower()
    
    if ($Extension -eq ".pfx" -or $Extension -eq ".p12") {
        $Flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::MachineKeySet
        ${exportable ? '$Flags = $Flags -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable' : ''}
        
        ${password ? '$Cert = Import-PfxCertificate -FilePath $CertPath -CertStoreLocation $Store -Password $Password -Exportable:$' + (exportable ? 'true' : 'false') : 'Write-Host "✗ Password required for PFX import" -ForegroundColor Red; exit'}
    } else {
        $Cert = Import-Certificate -FilePath $CertPath -CertStoreLocation $Store
    }
    
    Write-Host "✓ Certificate imported successfully" -ForegroundColor Green
    Write-Host "  Subject: $($Cert.Subject)" -ForegroundColor Gray
    Write-Host "  Thumbprint: $($Cert.Thumbprint)" -ForegroundColor Gray
    Write-Host "  Expires: $($Cert.NotAfter)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Import failed: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'suspend-bitlocker',
    name: 'Suspend BitLocker Protection',
    category: 'BitLocker & Encryption',
    description: 'Temporarily suspend BitLocker for maintenance or updates',
    isPremium: true,
    instructions: `**How This Task Works:**
- Temporarily suspends BitLocker protection
- Allows system changes without recovery key
- Auto-resumes after specified reboots

**Prerequisites:**
- Administrator privileges required
- BitLocker enabled on target drive
- PowerShell 5.1 or later

**What You Need to Provide:**
- Drive letter to suspend
- Number of reboots to suspend for

**What the Script Does:**
1. Suspends BitLocker on specified drive
2. Protection resumes after reboot count
3. Allows BIOS/firmware updates
4. Confirms suspension status

**Important Notes:**
- Drive remains encrypted during suspension
- Only protection is suspended, not encryption
- Typical use: BIOS updates, firmware changes
- Protection auto-resumes after reboots`,
    parameters: [
      { id: 'drive', label: 'Drive Letter', type: 'text', required: true, placeholder: 'C:' },
      { id: 'rebootCount', label: 'Reboot Count', type: 'number', required: true, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const drive = escapePowerShellString(params.drive);
      const rebootCount = Number(params.rebootCount);
      
      return `# Suspend BitLocker Protection
# Generated: ${new Date().toISOString()}

$Drive = "${drive}"
$RebootCount = ${rebootCount}

Write-Host "Suspending BitLocker protection..." -ForegroundColor Yellow
Write-Host "  Drive: $Drive" -ForegroundColor Gray
Write-Host "  Suspend for $RebootCount reboot(s)" -ForegroundColor Gray
Write-Host ""

try {
    Suspend-BitLocker -MountPoint $Drive -RebootCount $RebootCount -ErrorAction Stop
    
    Write-Host "✓ BitLocker protection suspended" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ Protection will resume after $RebootCount reboot(s)" -ForegroundColor Yellow
    Write-Host "  Drive remains encrypted" -ForegroundColor Gray
    
    # Show current status
    $Status = Get-BitLockerVolume -MountPoint $Drive
    Write-Host ""
    Write-Host "Current status:" -ForegroundColor Gray
    Write-Host "  Protection Status: $($Status.ProtectionStatus)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to suspend BitLocker: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'resume-bitlocker',
    name: 'Resume BitLocker Protection',
    category: 'BitLocker & Encryption',
    description: 'Resume BitLocker protection after suspension',
    isPremium: true,
    instructions: `**How This Task Works:**
- Resumes BitLocker protection after suspension
- Re-enables pre-boot authentication
- Confirms protection status

**Prerequisites:**
- Administrator privileges required
- BitLocker currently suspended
- PowerShell 5.1 or later

**What You Need to Provide:**
- Drive letter to resume protection

**What the Script Does:**
1. Resumes BitLocker protection
2. Re-enables authentication requirements
3. Confirms protection is active
4. Displays current status

**Important Notes:**
- Use after maintenance completes
- Protection should always be resumed
- Do not leave protection suspended
- Typical use: post-maintenance cleanup`,
    parameters: [
      { id: 'drive', label: 'Drive Letter', type: 'text', required: true, placeholder: 'C:' }
    ],
    scriptTemplate: (params) => {
      const drive = escapePowerShellString(params.drive);
      
      return `# Resume BitLocker Protection
# Generated: ${new Date().toISOString()}

$Drive = "${drive}"

Write-Host "Resuming BitLocker protection..." -ForegroundColor Cyan

try {
    Resume-BitLocker -MountPoint $Drive -ErrorAction Stop
    
    Write-Host "✓ BitLocker protection resumed" -ForegroundColor Green
    
    # Show current status
    $Status = Get-BitLockerVolume -MountPoint $Drive
    Write-Host ""
    Write-Host "Current status:" -ForegroundColor Gray
    Write-Host "  Protection Status: $($Status.ProtectionStatus)" -ForegroundColor Gray
    Write-Host "  Encryption Status: $($Status.VolumeStatus)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to resume BitLocker: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'backup-bitlocker-key',
    name: 'Backup BitLocker Recovery Key',
    category: 'BitLocker & Encryption',
    description: 'Backup BitLocker recovery key to file',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports BitLocker recovery key to file
- Creates backup for disaster recovery
- Essential for system recovery

**Prerequisites:**
- Administrator privileges required
- BitLocker enabled on drive
- PowerShell 5.1 or later

**What You Need to Provide:**
- Drive letter
- Backup file path

**What the Script Does:**
1. Retrieves recovery key from drive
2. Saves key to specified file
3. Displays key ID for reference
4. Confirms backup creation

**Important Notes:**
- CRITICAL: Store key securely offline
- Required for recovery if TPM fails
- Multiple copies recommended
- Typical use: disaster recovery prep`,
    parameters: [
      { id: 'drive', label: 'Drive Letter', type: 'text', required: true, placeholder: 'C:' },
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: true, placeholder: 'C:\\SecureBackup\\BitLockerKey.txt' }
    ],
    scriptTemplate: (params) => {
      const drive = escapePowerShellString(params.drive);
      const backupPath = escapePowerShellString(params.backupPath);
      
      return `# Backup BitLocker Recovery Key
# Generated: ${new Date().toISOString()}

$Drive = "${drive}"
$BackupPath = "${backupPath}"

Write-Host "Backing up BitLocker recovery key..." -ForegroundColor Cyan

try {
    $BitLockerVolume = Get-BitLockerVolume -MountPoint $Drive -ErrorAction Stop
    
    $RecoveryProtector = $BitLockerVolume.KeyProtector | Where-Object { $_.KeyProtectorType -eq 'RecoveryPassword' }
    
    if (-not $RecoveryProtector) {
        Write-Host "✗ No recovery password protector found" -ForegroundColor Red
        exit
    }
    
    # Create backup directory
    $BackupDir = Split-Path $BackupPath
    if (-not (Test-Path $BackupDir)) {
        New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
    }
    
    # Write recovery key
    $Content = @"
BitLocker Recovery Key Backup
=============================
Generated: $(Get-Date)
Computer: $env:COMPUTERNAME
Drive: $Drive

Recovery Key ID: $($RecoveryProtector.KeyProtectorId)
Recovery Key: $($RecoveryProtector.RecoveryPassword)

IMPORTANT: Store this file securely!
"@
    
    $Content | Out-File -FilePath $BackupPath -Encoding UTF8
    
    Write-Host "✓ Recovery key backed up" -ForegroundColor Green
    Write-Host "  File: $BackupPath" -ForegroundColor Gray
    Write-Host "  Key ID: $($RecoveryProtector.KeyProtectorId)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠ CRITICAL: Store this file in a secure location!" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to backup key: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-stored-credentials',
    name: 'Get Stored Credentials Audit',
    category: 'Credential Management',
    description: 'Audit Windows Credential Manager stored credentials',
    isPremium: true,
    instructions: `**How This Task Works:**
- Audits Windows Credential Manager entries
- Lists stored credentials (not passwords)
- Identifies potentially risky stored credentials

**Prerequisites:**
- PowerShell 5.1 or later
- No special privileges required
- Runs for current user context

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Enumerates stored Windows credentials
2. Lists target resources and usernames
3. Shows credential types
4. Identifies persistence settings

**Important Notes:**
- Does NOT reveal actual passwords
- Review for unused or suspicious entries
- Regular cleanup recommended
- Typical use: security audits, offboarding`,
    parameters: [],
    scriptTemplate: () => {
      return `# Stored Credentials Audit
# Generated: ${new Date().toISOString()}

Write-Host "Windows Credential Manager Audit" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

# Use cmdkey to list credentials
$CredOutput = cmdkey /list

if ($CredOutput -match "Currently stored credentials") {
    Write-Host "Stored Credentials:" -ForegroundColor Yellow
    Write-Host ""
    
    $Credentials = @()
    $CurrentCred = $null
    
    foreach ($Line in $CredOutput) {
        if ($Line -match "Target: (.+)") {
            if ($CurrentCred) { $Credentials += $CurrentCred }
            $CurrentCred = [PSCustomObject]@{
                Target = $Matches[1].Trim()
                Type = ""
                User = ""
            }
        }
        elseif ($Line -match "Type: (.+)" -and $CurrentCred) {
            $CurrentCred.Type = $Matches[1].Trim()
        }
        elseif ($Line -match "User: (.+)" -and $CurrentCred) {
            $CurrentCred.User = $Matches[1].Trim()
        }
    }
    if ($CurrentCred) { $Credentials += $CurrentCred }
    
    $Credentials | Format-Table -AutoSize
    Write-Host ""
    Write-Host "Total stored credentials: $($Credentials.Count)" -ForegroundColor Gray
} else {
    Write-Host "✓ No stored credentials found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Note: Passwords are NOT displayed for security" -ForegroundColor Gray`;
    }
  },

  {
    id: 'audit-service-accounts',
    name: 'Audit Service Account Usage',
    category: 'Credential Management',
    description: 'Audit which services are using specific user accounts',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies services running as user accounts
- Flags services using non-standard accounts
- Helps identify credential exposure risks

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Enumerates all Windows services
2. Identifies services with user accounts
3. Flags non-standard logon accounts
4. Groups by account for review

**Important Notes:**
- Services should use service accounts
- User accounts create security risks
- Review and convert to service accounts
- Typical use: security audits, compliance`,
    parameters: [],
    scriptTemplate: () => {
      return `# Service Account Audit
# Generated: ${new Date().toISOString()}

Write-Host "Service Account Usage Audit" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$StandardAccounts = @(
    'LocalSystem',
    'NT AUTHORITY\\LocalService',
    'NT AUTHORITY\\NetworkService',
    'NT AUTHORITY\\SYSTEM',
    'NT AUTHORITY\\LOCAL SERVICE',
    'NT AUTHORITY\\NETWORK SERVICE'
)

$Services = Get-WmiObject -Class Win32_Service | Select-Object Name, DisplayName, StartName, State

# Find services with non-standard accounts
$UserServices = $Services | Where-Object {
    $_.StartName -and $_.StartName -notin $StandardAccounts -and $_.StartName -ne $null
}

if ($UserServices) {
    Write-Host "⚠ Services using user accounts:" -ForegroundColor Yellow
    Write-Host ""
    
    $UserServices | ForEach-Object {
        Write-Host "$($_.DisplayName)" -ForegroundColor White
        Write-Host "  Service: $($_.Name)" -ForegroundColor Gray
        Write-Host "  Account: $($_.StartName)" -ForegroundColor Yellow
        Write-Host "  State: $($_.State)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "Services using user accounts: $($UserServices.Count)" -ForegroundColor Yellow
    
    # Group by account
    Write-Host ""
    Write-Host "Accounts summary:" -ForegroundColor Cyan
    $UserServices | Group-Object StartName | Select-Object @{N='Account';E={$_.Name}}, Count | Format-Table -AutoSize
} else {
    Write-Host "✓ No services using user accounts" -ForegroundColor Green
}

Write-Host ""
Write-Host "Total services: $($Services.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-privilege-use-events',
    name: 'Get Privilege Use Events',
    category: 'Security Auditing',
    description: 'Report sensitive privilege use from Security event log',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes Security log for privilege use events
- Identifies sensitive privilege operations
- Reports who used elevated privileges

**Prerequisites:**
- Administrator privileges required
- Privilege use auditing enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to analyze
- Top N users to display

**What the Script Does:**
1. Queries Event ID 4673 (sensitive privilege use)
2. Parses privilege names and users
3. Groups by user and privilege
4. Displays most active users

**Important Notes:**
- Requires privilege use auditing enabled
- High activity may indicate misuse
- Review regularly for anomalies
- Typical use: security monitoring, compliance`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 },
      { id: 'topCount', label: 'Top N Users', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      const topCount = Number(params.topCount || 10);
      
      return `# Privilege Use Events Report
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$TopCount = ${topCount}
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Privilege Use Audit Report" -ForegroundColor Cyan
Write-Host "Time range: Last $Hours hours" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = 4673
        StartTime = $StartTime
    } -ErrorAction SilentlyContinue
    
    if ($Events) {
        $PrivilegeUse = $Events | ForEach-Object {
            [xml]$XML = $_.ToXml()
            [PSCustomObject]@{
                Time = $_.TimeCreated
                User = $XML.Event.EventData.Data[1].'#text'
                Privilege = $XML.Event.EventData.Data[4].'#text'
            }
        }
        
        Write-Host "⚠ Privilege use events: $($Events.Count)" -ForegroundColor Yellow
        Write-Host ""
        
        Write-Host "Top users by privilege use:" -ForegroundColor Cyan
        $PrivilegeUse | Group-Object User | Sort-Object Count -Descending | 
            Select-Object -First $TopCount @{N='User';E={$_.Name}}, Count | Format-Table -AutoSize
        
        Write-Host "Privileges used:" -ForegroundColor Cyan
        $PrivilegeUse | Group-Object Privilege | Sort-Object Count -Descending |
            Select-Object -First 10 @{N='Privilege';E={$_.Name}}, Count | Format-Table -AutoSize
    } else {
        Write-Host "✓ No privilege use events in last $Hours hours" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to retrieve events: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-object-access-events',
    name: 'Get Object Access Events',
    category: 'Security Auditing',
    description: 'Report file and object access from Security event log',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes object access audit events
- Reports file and folder access attempts
- Identifies suspicious access patterns

**Prerequisites:**
- Administrator privileges required
- Object access auditing enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to analyze
- Optional path filter

**What the Script Does:**
1. Queries Event IDs 4663 (object access)
2. Filters by path if specified
3. Groups by user and access type
4. Reports access counts

**Important Notes:**
- Requires object access auditing enabled
- High volume logging expected
- Filter by critical paths
- Typical use: forensics, compliance`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 },
      { id: 'pathFilter', label: 'Path Filter', type: 'text', required: false, placeholder: 'C:\\Sensitive' }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      const pathFilter = params.pathFilter ? escapePowerShellString(params.pathFilter) : '';
      
      return `# Object Access Events Report
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$PathFilter = "${pathFilter}"
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Object Access Audit Report" -ForegroundColor Cyan
Write-Host "Time range: Last $Hours hours" -ForegroundColor Gray
${pathFilter ? 'Write-Host "Path filter: $PathFilter" -ForegroundColor Gray' : ''}
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = 4663
        StartTime = $StartTime
    } -MaxEvents 1000 -ErrorAction SilentlyContinue
    
    if ($Events) {
        $AccessEvents = $Events | ForEach-Object {
            [xml]$XML = $_.ToXml()
            [PSCustomObject]@{
                Time = $_.TimeCreated
                User = $XML.Event.EventData.Data[1].'#text'
                ObjectName = $XML.Event.EventData.Data[6].'#text'
                AccessMask = $XML.Event.EventData.Data[9].'#text'
            }
        }
        
        # Filter by path if specified
        if ($PathFilter) {
            $AccessEvents = $AccessEvents | Where-Object { $_.ObjectName -like "*$PathFilter*" }
        }
        
        if ($AccessEvents) {
            Write-Host "Object access events: $($AccessEvents.Count)" -ForegroundColor Yellow
            Write-Host ""
            
            Write-Host "Access by user:" -ForegroundColor Cyan
            $AccessEvents | Group-Object User | Sort-Object Count -Descending |
                Select-Object -First 10 @{N='User';E={$_.Name}}, Count | Format-Table -AutoSize
            
            Write-Host "Most accessed objects:" -ForegroundColor Cyan
            $AccessEvents | Group-Object ObjectName | Sort-Object Count -Descending |
                Select-Object -First 10 @{N='Object';E={$_.Name}}, Count | Format-Table -AutoSize
        } else {
            Write-Host "✓ No matching access events found" -ForegroundColor Green
        }
    } else {
        Write-Host "✓ No object access events in last $Hours hours" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to retrieve events: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-security-updates-status',
    name: 'Get Security Updates Status',
    category: 'Vulnerability Assessment',
    description: 'Report installed and missing security updates',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks for installed security updates
- Identifies pending security patches
- Reports update installation timeline

**Prerequisites:**
- PowerShell 5.1 or later
- Windows Update service accessible
- No special privileges required

**What You Need to Provide:**
- Days back to check

**What the Script Does:**
1. Lists recently installed updates
2. Checks for pending updates
3. Reports security update status
4. Shows update history

**Important Notes:**
- Critical for vulnerability assessment
- Monthly patching recommended
- Check after Patch Tuesday
- Typical use: compliance, security audits`,
    parameters: [
      { id: 'days', label: 'Days Back', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const days = Number(params.days || 30);
      
      return `# Security Updates Status
# Generated: ${new Date().toISOString()}

$Days = ${days}
$StartDate = (Get-Date).AddDays(-$Days)

Write-Host "Security Updates Status Report" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

# Get installed updates
Write-Host "Recently installed updates (last $Days days):" -ForegroundColor Yellow
$InstalledUpdates = Get-HotFix | Where-Object { $_.InstalledOn -gt $StartDate } | 
    Sort-Object InstalledOn -Descending

if ($InstalledUpdates) {
    $InstalledUpdates | Select-Object HotFixID, Description, InstalledOn, InstalledBy | Format-Table -AutoSize
    Write-Host "Total installed: $($InstalledUpdates.Count)" -ForegroundColor Green
} else {
    Write-Host "  No updates installed in last $Days days" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking for pending updates..." -ForegroundColor Cyan

try {
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $SearchResult = $Searcher.Search("IsInstalled=0")
    
    $SecurityUpdates = $SearchResult.Updates | Where-Object { 
        $_.Categories | Where-Object { $_.Name -eq "Security Updates" }
    }
    
    if ($SecurityUpdates.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠ Pending security updates: $($SecurityUpdates.Count)" -ForegroundColor Red
        Write-Host ""
        $SecurityUpdates | ForEach-Object {
            Write-Host "  $($_.Title)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✓ No pending security updates" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Total pending updates: $($SearchResult.Updates.Count)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Could not check pending updates: $_" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'compare-security-baseline',
    name: 'Compare Security Baseline',
    category: 'Vulnerability Assessment',
    description: 'Compare current security settings against a baseline file',
    isPremium: true,
    instructions: `**How This Task Works:**
- Compares current settings against baseline
- Identifies security drift from standard
- Reports differences for remediation

**Prerequisites:**
- Administrator privileges required
- Baseline file from previous export
- PowerShell 5.1 or later

**What You Need to Provide:**
- Path to baseline .inf file

**What the Script Does:**
1. Exports current security policy
2. Compares against baseline file
3. Reports setting differences
4. Highlights security drift

**Important Notes:**
- Use baselines from security hardening
- Compare regularly to detect drift
- Essential for compliance
- Typical use: security audits, remediation`,
    parameters: [
      { id: 'baselinePath', label: 'Baseline File Path', type: 'path', required: true, placeholder: 'C:\\Baselines\\SecurityBaseline.inf' }
    ],
    scriptTemplate: (params) => {
      const baselinePath = escapePowerShellString(params.baselinePath);
      
      return `# Compare Security Baseline
# Generated: ${new Date().toISOString()}

$BaselinePath = "${baselinePath}"

Write-Host "Security Baseline Comparison" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $BaselinePath)) {
    Write-Host "✗ Baseline file not found: $BaselinePath" -ForegroundColor Red
    exit
}

Write-Host "Baseline: $BaselinePath" -ForegroundColor Gray
Write-Host ""

# Export current settings
$CurrentPath = "$env:TEMP\\current_security.inf"
secedit /export /cfg $CurrentPath /quiet

# Read both files
$Baseline = Get-Content $BaselinePath
$Current = Get-Content $CurrentPath

# Parse settings (simple key=value comparison)
$BaselineSettings = @{}
$CurrentSettings = @{}

foreach ($Line in $Baseline) {
    if ($Line -match '^(.+?)\s*=\s*(.+)$') {
        $BaselineSettings[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

foreach ($Line in $Current) {
    if ($Line -match '^(.+?)\s*=\s*(.+)$') {
        $CurrentSettings[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

# Compare
$Differences = @()

foreach ($Key in $BaselineSettings.Keys) {
    if ($CurrentSettings.ContainsKey($Key)) {
        if ($BaselineSettings[$Key] -ne $CurrentSettings[$Key]) {
            $Differences += [PSCustomObject]@{
                Setting = $Key
                Baseline = $BaselineSettings[$Key]
                Current = $CurrentSettings[$Key]
            }
        }
    }
}

if ($Differences) {
    Write-Host "⚠ Settings differ from baseline:" -ForegroundColor Yellow
    Write-Host ""
    $Differences | Format-Table -AutoSize
    Write-Host ""
    Write-Host "Total differences: $($Differences.Count)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Current settings match baseline" -ForegroundColor Green
}

# Cleanup
Remove-Item $CurrentPath -Force`;
    }
  },

  {
    id: 'get-firewall-profile-status',
    name: 'Get Firewall Profile Status',
    category: 'Firewall Management',
    description: 'Check Windows Firewall status for all network profiles',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks firewall status for all profiles
- Reports Domain, Private, and Public settings
- Shows default actions for each profile

**Prerequisites:**
- PowerShell 5.1 or later
- Windows Firewall service running
- No special privileges required

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Retrieves status for all firewall profiles
2. Shows enabled/disabled state
3. Reports default inbound/outbound actions
4. Displays logging configuration

**Important Notes:**
- All profiles should be enabled
- Public profile most restrictive
- Review before network changes
- Typical use: security verification`,
    parameters: [],
    scriptTemplate: () => {
      return `# Firewall Profile Status
# Generated: ${new Date().toISOString()}

Write-Host "Windows Firewall Profile Status" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$Profiles = @('Domain', 'Private', 'Public')

foreach ($Profile in $Profiles) {
    $Settings = Get-NetFirewallProfile -Name $Profile
    
    $EnabledColor = if ($Settings.Enabled) { "Green" } else { "Red" }
    
    Write-Host "$Profile Profile:" -ForegroundColor Yellow
    Write-Host "  Enabled: " -NoNewline
    Write-Host "$($Settings.Enabled)" -ForegroundColor $EnabledColor
    Write-Host "  Default Inbound: $($Settings.DefaultInboundAction)" -ForegroundColor Gray
    Write-Host "  Default Outbound: $($Settings.DefaultOutboundAction)" -ForegroundColor Gray
    Write-Host "  Log Allowed: $($Settings.LogAllowed)" -ForegroundColor Gray
    Write-Host "  Log Blocked: $($Settings.LogBlocked)" -ForegroundColor Gray
    Write-Host ""
}

# Summary
$DisabledProfiles = Get-NetFirewallProfile | Where-Object { -not $_.Enabled }
if ($DisabledProfiles) {
    Write-Host "⚠ Warning: Some profiles are disabled!" -ForegroundColor Red
} else {
    Write-Host "✓ All firewall profiles are enabled" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'enable-firewall-profile',
    name: 'Enable/Disable Firewall Profile',
    category: 'Firewall Management',
    description: 'Enable or disable Windows Firewall for specific profile',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables or disables firewall for profile
- Affects Domain, Private, or Public profile
- Can enable/disable all profiles at once

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Profile to modify
- Enable or disable action

**What the Script Does:**
1. Sets firewall state for profile
2. Confirms state change
3. Shows updated profile status
4. Warns if disabling protection

**Important Notes:**
- SECURITY RISK when disabling
- Never disable Public profile
- Document reason for changes
- Typical use: troubleshooting, testing`,
    parameters: [
      { id: 'profile', label: 'Firewall Profile', type: 'select', required: true, options: ['Domain', 'Private', 'Public', 'All'], defaultValue: 'All' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' }
    ],
    scriptTemplate: (params) => {
      const profile = params.profile;
      const action = params.action;
      const enabled = action === 'Enable' ? '$true' : '$false';
      
      return `# Enable/Disable Firewall Profile
# Generated: ${new Date().toISOString()}

$Profile = "${profile}"
$Enabled = ${enabled}

Write-Host "${action} firewall for $Profile profile(s)..." -ForegroundColor ${action === 'Disable' ? 'Yellow' : 'Cyan'}

try {
    if ($Profile -eq "All") {
        Set-NetFirewallProfile -All -Enabled $Enabled -ErrorAction Stop
    } else {
        Set-NetFirewallProfile -Name $Profile -Enabled $Enabled -ErrorAction Stop
    }
    
    Write-Host "✓ Firewall $Profile profile ${action.toLowerCase()}d" -ForegroundColor Green
    
    ${action === 'Disable' ? 'Write-Host ""' : ''}
    ${action === 'Disable' ? 'Write-Host "⚠ WARNING: Firewall protection is now DISABLED!" -ForegroundColor Red' : ''}
    ${action === 'Disable' ? 'Write-Host "  System may be vulnerable to network attacks" -ForegroundColor Red' : ''}
    
    # Show current status
    Write-Host ""
    Write-Host "Current status:" -ForegroundColor Gray
    Get-NetFirewallProfile | Select-Object Name, Enabled | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed to modify firewall: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-user-rights-assignments',
    name: 'Get User Rights Assignments',
    category: 'Security Policy',
    description: 'Report user rights assignments from local security policy',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports and parses user rights assignments
- Shows which users have specific privileges
- Essential for security reviews

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- secedit utility available

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Exports security policy
2. Parses user rights section
3. Displays rights and assigned users
4. Identifies high-risk assignments

**Important Notes:**
- Review for least privilege
- Sensitive rights need justification
- Regular review recommended
- Typical use: security audits, compliance`,
    parameters: [],
    scriptTemplate: () => {
      return `# User Rights Assignments Report
# Generated: ${new Date().toISOString()}

Write-Host "User Rights Assignments" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$TempFile = "$env:TEMP\\secpol_rights.inf"
secedit /export /cfg $TempFile /areas USER_RIGHTS /quiet

if (Test-Path $TempFile) {
    $Content = Get-Content $TempFile
    $InRightsSection = $false
    
    $HighRiskRights = @(
        'SeDebugPrivilege',
        'SeTcbPrivilege',
        'SeBackupPrivilege',
        'SeRestorePrivilege',
        'SeRemoteShutdownPrivilege',
        'SeTakeOwnershipPrivilege'
    )
    
    foreach ($Line in $Content) {
        if ($Line -match '^\[Privilege Rights\]') {
            $InRightsSection = $true
            continue
        }
        elseif ($Line -match '^\[' -and $InRightsSection) {
            break
        }
        
        if ($InRightsSection -and $Line -match '^(.+?)\s*=\s*(.+)$') {
            $Right = $Matches[1].Trim()
            $Assigned = $Matches[2].Trim()
            
            $Color = if ($HighRiskRights -contains $Right) { "Yellow" } else { "Gray" }
            $Prefix = if ($HighRiskRights -contains $Right) { "⚠ " } else { "  " }
            
            Write-Host "$Prefix$Right" -ForegroundColor $Color
            Write-Host "    $Assigned" -ForegroundColor Gray
        }
    }
    
    Remove-Item $TempFile -Force
    
    Write-Host ""
    Write-Host "⚠ High-risk rights marked with warning" -ForegroundColor Yellow
} else {
    Write-Host "✗ Failed to export user rights" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-successful-logons',
    name: 'Get Successful Logon Events',
    category: 'Security Auditing',
    description: 'Report successful logon events for user activity auditing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports successful logon events from Security log
- Identifies user login patterns and times
- Useful for activity monitoring

**Prerequisites:**
- Administrator privileges required
- Logon auditing enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to analyze
- Optional: specific username to filter

**What the Script Does:**
1. Queries Event ID 4624 (successful logons)
2. Filters by logon type (interactive, network, etc.)
3. Groups by user for summary
4. Shows login times and sources

**Important Notes:**
- Excludes service account noise
- Interactive logons most relevant
- Correlate with failed logons
- Typical use: user activity audits, investigations`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 },
      { id: 'username', label: 'Username Filter', type: 'text', required: false, placeholder: 'jsmith' }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      const username = params.username ? escapePowerShellString(params.username) : '';
      
      return `# Successful Logon Events Report
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$UsernameFilter = "${username}"
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Successful Logon Events Report" -ForegroundColor Cyan
Write-Host "Time range: Last $Hours hours" -ForegroundColor Gray
${username ? 'Write-Host "Username filter: $UsernameFilter" -ForegroundColor Gray' : ''}
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = 4624
        StartTime = $StartTime
    } -MaxEvents 500 -ErrorAction SilentlyContinue
    
    if ($Events) {
        $Logons = $Events | ForEach-Object {
            [xml]$XML = $_.ToXml()
            $LogonType = $XML.Event.EventData.Data[8].'#text'
            
            # Skip service logons
            if ($LogonType -in @('2', '10', '11')) {
                [PSCustomObject]@{
                    Time = $_.TimeCreated
                    User = $XML.Event.EventData.Data[5].'#text'
                    Domain = $XML.Event.EventData.Data[6].'#text'
                    LogonType = switch ($LogonType) {
                        '2' { 'Interactive' }
                        '10' { 'RemoteInteractive' }
                        '11' { 'CachedInteractive' }
                        default { $LogonType }
                    }
                    SourceIP = $XML.Event.EventData.Data[18].'#text'
                }
            }
        } | Where-Object { $_ -ne $null }
        
        if ($UsernameFilter) {
            $Logons = $Logons | Where-Object { $_.User -like "*$UsernameFilter*" }
        }
        
        if ($Logons) {
            Write-Host "Recent logons:" -ForegroundColor Yellow
            $Logons | Select-Object Time, User, LogonType, SourceIP | Format-Table -AutoSize
            
            Write-Host ""
            Write-Host "Logon summary by user:" -ForegroundColor Cyan
            $Logons | Group-Object User | Sort-Object Count -Descending |
                Select-Object @{N='User';E={$_.Name}}, Count | Format-Table -AutoSize
        } else {
            Write-Host "No matching logons found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✓ No logon events in last $Hours hours" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to retrieve events: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-account-lockout-events',
    name: 'Get Account Lockout Events',
    category: 'Security Auditing',
    description: 'Report account lockout events for security monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports account lockout events
- Identifies locked out user accounts
- Helps detect brute force attacks

**Prerequisites:**
- Administrator privileges required
- Account lockout auditing enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to analyze

**What the Script Does:**
1. Queries Event ID 4740 (account lockouts)
2. Shows locked account names
3. Reports source computer if available
4. Groups by account for patterns

**Important Notes:**
- High lockout rates indicate attacks
- Legitimate lockouts need user support
- Review lockout policy settings
- Typical use: security monitoring, helpdesk`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      
      return `# Account Lockout Events Report
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Account Lockout Events Report" -ForegroundColor Cyan
Write-Host "Time range: Last $Hours hours" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = 4740
        StartTime = $StartTime
    } -ErrorAction SilentlyContinue
    
    if ($Events) {
        Write-Host "⚠ Account lockouts detected: $($Events.Count)" -ForegroundColor Red
        Write-Host ""
        
        $Lockouts = $Events | ForEach-Object {
            [xml]$XML = $_.ToXml()
            [PSCustomObject]@{
                Time = $_.TimeCreated
                Account = $XML.Event.EventData.Data[0].'#text'
                CallerComputer = $XML.Event.EventData.Data[1].'#text'
            }
        }
        
        $Lockouts | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Lockouts by account:" -ForegroundColor Yellow
        $Lockouts | Group-Object Account | Sort-Object Count -Descending |
            Select-Object @{N='Account';E={$_.Name}}, Count | Format-Table -AutoSize
    } else {
        Write-Host "✓ No account lockouts in last $Hours hours" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to retrieve events: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-security-event-summary',
    name: 'Get Security Event Summary',
    category: 'Security Auditing',
    description: 'Generate summary of security events by type and count',
    isPremium: true,
    instructions: `**How This Task Works:**
- Summarizes security events by event ID
- Provides quick security health overview
- Identifies unusual activity patterns

**Prerequisites:**
- Administrator privileges required
- Security logging enabled
- PowerShell 5.1 or later

**What You Need to Provide:**
- Hours back to analyze

**What the Script Does:**
1. Queries Security event log
2. Groups events by Event ID
3. Provides counts for each type
4. Highlights concerning event types

**Important Notes:**
- Quick security health check
- Identify spikes in specific events
- Compare to baseline counts
- Typical use: daily security review`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      
      return `# Security Event Summary
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Security Event Summary" -ForegroundColor Cyan
Write-Host "Time range: Last $Hours hours" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$ImportantEvents = @{
    4624 = "Successful Logon"
    4625 = "Failed Logon"
    4634 = "Logoff"
    4648 = "Explicit Credentials Logon"
    4672 = "Special Privileges Assigned"
    4673 = "Sensitive Privilege Use"
    4688 = "Process Created"
    4740 = "Account Locked Out"
    4720 = "User Account Created"
    4722 = "User Account Enabled"
    4725 = "User Account Disabled"
    4726 = "User Account Deleted"
    4732 = "Member Added to Local Group"
    4756 = "Member Added to Universal Group"
}

try {
    $Events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        StartTime = $StartTime
    } -MaxEvents 10000 -ErrorAction SilentlyContinue
    
    if ($Events) {
        $Summary = $Events | Group-Object Id | Sort-Object Count -Descending |
            Select-Object -First 20 @{N='EventID';E={$_.Name}}, Count,
                @{N='Description';E={
                    $id = [int]$_.Name
                    if ($ImportantEvents.ContainsKey($id)) { $ImportantEvents[$id] } else { "Other" }
                }}
        
        Write-Host "Top 20 Security Events:" -ForegroundColor Yellow
        $Summary | Format-Table -AutoSize
        
        # Highlight concerns
        Write-Host ""
        $FailedLogons = ($Summary | Where-Object { $_.EventID -eq 4625 }).Count
        $Lockouts = ($Summary | Where-Object { $_.EventID -eq 4740 }).Count
        
        if ($FailedLogons -gt 100) {
            Write-Host "⚠ High failed logon count: $FailedLogons" -ForegroundColor Red
        }
        if ($Lockouts -gt 0) {
            Write-Host "⚠ Account lockouts detected: $Lockouts" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Total events analyzed: $($Events.Count)" -ForegroundColor Gray
    } else {
        Write-Host "No security events in last $Hours hours" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Failed to retrieve events: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-certificate-health',
    name: 'Get Certificate Health Report',
    category: 'Certificate Management',
    description: 'Comprehensive health report of all certificates in store',
    isPremium: true,
    instructions: `**How This Task Works:**
- Performs health check on certificate store
- Identifies issues like expired, untrusted, weak certs
- Provides remediation recommendations

**Prerequisites:**
- PowerShell 5.1 or later
- Access to certificate stores
- No special privileges for CurrentUser

**What You Need to Provide:**
- Certificate store to analyze

**What the Script Does:**
1. Scans certificate store
2. Checks expiration, trust chain, key strength
3. Categorizes by health status
4. Provides remediation suggestions

**Important Notes:**
- Run monthly for proactive management
- Critical for SSL/TLS security
- Weak keys are security risks
- Typical use: security audits, compliance`,
    parameters: [
      { id: 'store', label: 'Certificate Store', type: 'select', required: true, options: ['LocalMachine\\My', 'LocalMachine\\Root', 'LocalMachine\\CA', 'CurrentUser\\My'], defaultValue: 'LocalMachine\\My' }
    ],
    scriptTemplate: (params) => {
      const store = escapePowerShellString(params.store);
      
      return `# Certificate Health Report
# Generated: ${new Date().toISOString()}

$Store = "Cert:\\${store}"

Write-Host "Certificate Health Report" -ForegroundColor Cyan
Write-Host "Store: $Store" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Certs = Get-ChildItem -Path $Store -ErrorAction Stop
    
    $Expired = @()
    $ExpiringSoon = @()
    $Healthy = @()
    $WeakKey = @()
    
    foreach ($Cert in $Certs) {
        if ($Cert.NotAfter -lt (Get-Date)) {
            $Expired += $Cert
        }
        elseif ($Cert.NotAfter -lt (Get-Date).AddDays(30)) {
            $ExpiringSoon += $Cert
        }
        else {
            $Healthy += $Cert
        }
        
        # Check key strength
        if ($Cert.PublicKey.Key.KeySize -lt 2048) {
            $WeakKey += $Cert
        }
    }
    
    Write-Host "Certificate Summary:" -ForegroundColor Yellow
    Write-Host "  Total certificates: $($Certs.Count)" -ForegroundColor Gray
    Write-Host "  Healthy: $($Healthy.Count)" -ForegroundColor Green
    Write-Host "  Expiring (30 days): $($ExpiringSoon.Count)" -ForegroundColor Yellow
    Write-Host "  Expired: $($Expired.Count)" -ForegroundColor Red
    Write-Host "  Weak Keys (<2048): $($WeakKey.Count)" -ForegroundColor Red
    Write-Host ""
    
    if ($Expired) {
        Write-Host "⚠ Expired Certificates:" -ForegroundColor Red
        $Expired | ForEach-Object {
            Write-Host "  $($_.Subject)" -ForegroundColor Red
            Write-Host "    Expired: $($_.NotAfter)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    if ($ExpiringSoon) {
        Write-Host "⚠ Expiring Soon:" -ForegroundColor Yellow
        $ExpiringSoon | ForEach-Object {
            $Days = ($_.NotAfter - (Get-Date)).Days
            Write-Host "  $($_.Subject) ($Days days)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    if ($WeakKey) {
        Write-Host "⚠ Weak Key Certificates:" -ForegroundColor Red
        $WeakKey | ForEach-Object {
            Write-Host "  $($_.Subject) ($($_.PublicKey.Key.KeySize)-bit)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "✗ Failed to analyze certificates: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'delete-expired-certificates',
    name: 'Delete Expired Certificates',
    category: 'Certificate Management',
    description: 'Remove expired certificates from certificate store',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies and removes expired certificates
- Cleans up certificate stores
- Optionally exports before deletion

**Prerequisites:**
- Administrator privileges for LocalMachine
- PowerShell 5.1 or later
- Backup recommended

**What You Need to Provide:**
- Certificate store to clean
- Whether to backup before deletion

**What the Script Does:**
1. Scans for expired certificates
2. Optionally exports for backup
3. Deletes expired certificates
4. Reports cleanup results

**Important Notes:**
- DESTRUCTIVE: Removes certificates
- Some expired certs may still be needed
- Always backup before deletion
- Typical use: store maintenance`,
    parameters: [
      { id: 'store', label: 'Certificate Store', type: 'select', required: true, options: ['LocalMachine\\My', 'CurrentUser\\My'], defaultValue: 'LocalMachine\\My' },
      { id: 'backup', label: 'Backup Before Delete', type: 'boolean', required: true, defaultValue: true },
      { id: 'backupPath', label: 'Backup Path', type: 'path', required: false, placeholder: 'C:\\CertBackups' }
    ],
    scriptTemplate: (params) => {
      const store = escapePowerShellString(params.store);
      const backup = params.backup;
      const backupPath = params.backupPath ? escapePowerShellString(params.backupPath) : '';
      
      return `# Delete Expired Certificates
# Generated: ${new Date().toISOString()}

$Store = "Cert:\\${store}"
$DoBackup = $${backup ? 'true' : 'false'}
$BackupPath = "${backupPath}"

Write-Host "Expired Certificate Cleanup" -ForegroundColor Yellow
Write-Host "Store: $Store" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $ExpiredCerts = Get-ChildItem -Path $Store | Where-Object { $_.NotAfter -lt (Get-Date) }
    
    if (-not $ExpiredCerts) {
        Write-Host "✓ No expired certificates found" -ForegroundColor Green
        exit
    }
    
    Write-Host "Found $($ExpiredCerts.Count) expired certificate(s)" -ForegroundColor Yellow
    
    ${backup ? `if ($BackupPath) {
        New-Item -Path $BackupPath -ItemType Directory -Force | Out-Null
        Write-Host "Backing up certificates..." -ForegroundColor Gray
        
        foreach ($Cert in $ExpiredCerts) {
            $FileName = "$BackupPath\\$($Cert.Thumbprint).cer"
            Export-Certificate -Cert $Cert -FilePath $FileName | Out-Null
        }
        Write-Host "  Backed up to: $BackupPath" -ForegroundColor Gray
    }` : ''}
    
    Write-Host ""
    Write-Host "Deleting expired certificates..." -ForegroundColor Yellow
    
    $Deleted = 0
    foreach ($Cert in $ExpiredCerts) {
        try {
            Write-Host "  Removing: $($Cert.Subject)" -ForegroundColor Gray
            Remove-Item -Path $Cert.PSPath -Force
            $Deleted++
        } catch {
            Write-Host "  ✗ Failed: $($Cert.Subject)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ Deleted $Deleted expired certificate(s)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'scan-folder-defender',
    name: 'Scan Folder with Defender',
    category: 'Windows Defender',
    description: 'Scan a specific folder or file path with Windows Defender',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans specific folder or file with Defender
- More targeted than full system scan
- Shows threats found in scanned path

**Prerequisites:**
- Windows Defender enabled
- Administrator privileges required
- PowerShell 5.1 or later

**What You Need to Provide:**
- Path to scan (folder or file)

**What the Script Does:**
1. Initiates custom scan on path
2. Waits for scan completion
3. Reports any threats found
4. Shows scan duration

**Important Notes:**
- Faster than full system scan
- Use for suspicious downloads
- Scan new software before running
- Typical use: on-demand scanning`,
    parameters: [
      { id: 'scanPath', label: 'Path to Scan', type: 'path', required: true, placeholder: 'C:\\Downloads' }
    ],
    scriptTemplate: (params) => {
      const scanPath = escapePowerShellString(params.scanPath);
      
      return `# Scan Folder with Defender
# Generated: ${new Date().toISOString()}

$ScanPath = "${scanPath}"

Write-Host "Windows Defender Custom Scan" -ForegroundColor Cyan
Write-Host "Path: $ScanPath" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $ScanPath)) {
    Write-Host "✗ Path not found: $ScanPath" -ForegroundColor Red
    exit
}

$StartTime = Get-Date
Write-Host "Starting scan..." -ForegroundColor Yellow

try {
    Start-MpScan -ScanPath $ScanPath -ScanType CustomScan -ErrorAction Stop
    
    $Duration = (Get-Date) - $StartTime
    Write-Host "✓ Scan completed in $([math]::Round($Duration.TotalSeconds, 1)) seconds" -ForegroundColor Green
    Write-Host ""
    
    # Check for threats
    $Threats = Get-MpThreatDetection -ErrorAction SilentlyContinue | Where-Object {
        $_.Resources -like "*$ScanPath*"
    }
    
    if ($Threats) {
        Write-Host "⚠ Threats detected: $($Threats.Count)" -ForegroundColor Red
        $Threats | ForEach-Object {
            Write-Host "  $($_.ThreatName)" -ForegroundColor Red
            Write-Host "    $($_.Resources -join ', ')" -ForegroundColor Gray
        }
    } else {
        Write-Host "✓ No threats detected in scanned path" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Scan failed: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-smb-shares-security',
    name: 'Get SMB Shares Security Report',
    category: 'Security Auditing',
    description: 'Audit SMB shares and their security permissions',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all SMB shares on system
- Reports share permissions
- Identifies overly permissive shares

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- SMB Server role features

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Enumerates all SMB shares
2. Gets access permissions for each
3. Identifies "Everyone" permissions
4. Reports hidden (admin) shares

**Important Notes:**
- "Everyone" access is security risk
- Review share necessity regularly
- Admin shares (C$, ADMIN$) are normal
- Typical use: security audits, compliance`,
    parameters: [],
    scriptTemplate: () => {
      return `# SMB Shares Security Report
# Generated: ${new Date().toISOString()}

Write-Host "SMB Shares Security Report" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Shares = Get-SmbShare -ErrorAction Stop | Where-Object { $_.Name -notlike "*$" }
    $AdminShares = Get-SmbShare | Where-Object { $_.Name -like "*$" }
    
    Write-Host "User Shares:" -ForegroundColor Yellow
    if ($Shares) {
        foreach ($Share in $Shares) {
            Write-Host ""
            Write-Host "  $($Share.Name)" -ForegroundColor White
            Write-Host "    Path: $($Share.Path)" -ForegroundColor Gray
            Write-Host "    Description: $($Share.Description)" -ForegroundColor Gray
            
            # Get permissions
            $Access = Get-SmbShareAccess -Name $Share.Name -ErrorAction SilentlyContinue
            if ($Access) {
                $EveryoneAccess = $Access | Where-Object { $_.AccountName -eq 'Everyone' }
                if ($EveryoneAccess) {
                    Write-Host "    ⚠ Everyone: $($EveryoneAccess.AccessRight)" -ForegroundColor Red
                } else {
                    Write-Host "    Permissions:" -ForegroundColor Gray
                    $Access | ForEach-Object {
                        Write-Host "      $($_.AccountName): $($_.AccessRight)" -ForegroundColor Gray
                    }
                }
            }
        }
    } else {
        Write-Host "  (No user shares found)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Administrative Shares:" -ForegroundColor Yellow
    Write-Host "  Count: $($AdminShares.Count)" -ForegroundColor Gray
    $AdminShares | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }
    
    # Summary
    Write-Host ""
    $EveryoneShares = $Shares | Where-Object {
        $Access = Get-SmbShareAccess -Name $_.Name -ErrorAction SilentlyContinue
        $Access.AccountName -contains 'Everyone'
    }
    
    if ($EveryoneShares) {
        Write-Host "⚠ Shares with Everyone access: $($EveryoneShares.Count)" -ForegroundColor Red
    } else {
        Write-Host "✓ No shares with Everyone access" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to retrieve shares: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-open-ports',
    name: 'Get Open Ports Report',
    category: 'Vulnerability Assessment',
    description: 'Report all open network ports and listening services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all open listening ports
- Shows processes using each port
- Identifies potential security risks

**Prerequisites:**
- Administrator privileges recommended
- PowerShell 5.1 or later
- Network connectivity

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Gets all listening TCP ports
2. Maps ports to processes
3. Identifies high-risk ports
4. Reports unusual listeners

**Important Notes:**
- Open ports are attack surface
- Close unnecessary ports
- Document legitimate services
- Typical use: security audits, hardening`,
    parameters: [],
    scriptTemplate: () => {
      return `# Open Ports Report
# Generated: ${new Date().toISOString()}

Write-Host "Open Ports Security Report" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$HighRiskPorts = @(21, 23, 25, 135, 139, 445, 1433, 3306, 3389, 5985, 5986)

try {
    $Listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | 
        Sort-Object LocalPort |
        Select-Object LocalAddress, LocalPort, OwningProcess, @{
            N='ProcessName'; E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name}
        }
    
    Write-Host "Listening Ports:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Listener in $Listeners) {
        $IsHighRisk = $HighRiskPorts -contains $Listener.LocalPort
        $Color = if ($IsHighRisk) { "Yellow" } else { "Gray" }
        $Prefix = if ($IsHighRisk) { "⚠ " } else { "  " }
        
        Write-Host "$Prefix$($Listener.LocalAddress):$($Listener.LocalPort)" -ForegroundColor $Color -NoNewline
        Write-Host " -> $($Listener.ProcessName) (PID: $($Listener.OwningProcess))" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total listening ports: $($Listeners.Count)" -ForegroundColor Gray
    
    $RiskyOpen = $Listeners | Where-Object { $HighRiskPorts -contains $_.LocalPort }
    if ($RiskyOpen) {
        Write-Host "  ⚠ High-risk ports open: $($RiskyOpen.Count)" -ForegroundColor Yellow
        Write-Host "    (Ports: $($RiskyOpen.LocalPort -join ', '))" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ No high-risk ports detected" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "High-risk ports monitored: $($HighRiskPorts -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to retrieve port information: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-scheduled-tasks-security',
    name: 'Get Scheduled Tasks Security Audit',
    category: 'Vulnerability Assessment',
    description: 'Audit scheduled tasks for security issues and suspicious entries',
    isPremium: true,
    instructions: `**How This Task Works:**
- Audits scheduled tasks for security issues
- Identifies tasks running with high privileges
- Flags suspicious or unusual tasks

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Enumerates all scheduled tasks
2. Checks run-as accounts
3. Identifies SYSTEM/Admin tasks
4. Flags unusual task locations

**Important Notes:**
- Malware often creates scheduled tasks
- Review unfamiliar task names
- Check action paths for legitimacy
- Typical use: security audits, incident response`,
    parameters: [],
    scriptTemplate: () => {
      return `# Scheduled Tasks Security Audit
# Generated: ${new Date().toISOString()}

Write-Host "Scheduled Tasks Security Audit" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

try {
    $Tasks = Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' }
    
    $HighPrivTasks = @()
    $SuspiciousTasks = @()
    
    foreach ($Task in $Tasks) {
        $TaskInfo = Get-ScheduledTaskInfo -TaskName $Task.TaskName -TaskPath $Task.TaskPath -ErrorAction SilentlyContinue
        $Principal = $Task.Principal
        
        # Check for high privilege
        if ($Principal.UserId -in @('SYSTEM', 'NT AUTHORITY\\SYSTEM', 'BUILTIN\\Administrators') -or
            $Principal.RunLevel -eq 'Highest') {
            $HighPrivTasks += [PSCustomObject]@{
                Name = $Task.TaskName
                Path = $Task.TaskPath
                RunAs = $Principal.UserId
                Author = $Task.Author
            }
        }
        
        # Check for suspicious indicators
        $Actions = $Task.Actions
        foreach ($Action in $Actions) {
            if ($Action.Execute -like "*powershell*" -or 
                $Action.Execute -like "*cmd*" -or
                $Action.Execute -like "*temp*" -or
                $Action.Execute -like "*appdata*") {
                $SuspiciousTasks += [PSCustomObject]@{
                    Name = $Task.TaskName
                    Execute = $Action.Execute
                    Arguments = $Action.Arguments
                }
            }
        }
    }
    
    Write-Host "Active scheduled tasks: $($Tasks.Count)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "High Privilege Tasks:" -ForegroundColor Yellow
    if ($HighPrivTasks) {
        $HighPrivTasks | Select-Object -First 15 | ForEach-Object {
            Write-Host "  $($_.Name)" -ForegroundColor Yellow
            Write-Host "    RunAs: $($_.RunAs)" -ForegroundColor Gray
        }
        Write-Host "  ... ($($HighPrivTasks.Count) total)" -ForegroundColor Gray
    } else {
        Write-Host "  (None found)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "⚠ Potentially Suspicious Tasks:" -ForegroundColor Red
    if ($SuspiciousTasks) {
        $SuspiciousTasks | Select-Object -First 10 | ForEach-Object {
            Write-Host "  $($_.Name)" -ForegroundColor Red
            Write-Host "    Execute: $($_.Execute)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✓ None detected" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to audit tasks: $_" -ForegroundColor Red
}`;
    }
  },
];
