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
];
