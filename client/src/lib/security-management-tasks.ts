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
