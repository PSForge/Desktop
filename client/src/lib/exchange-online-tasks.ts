import { 
  escapePowerShellString, 
  buildPowerShellArray, 
  toPowerShellBoolean,
  validateRequiredFields 
} from './powershell-utils';

export interface ExchangeOnlineTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface ExchangeOnlineTask {
  id: string;
  name: string;
  category: string;
  description: string;
  isPremium: boolean;
  instructions?: string;
  parameters: ExchangeOnlineTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const exchangeOnlineTasks: ExchangeOnlineTask[] = [
  // ========================================
  // USER MAILBOXES & LICENSES CATEGORY
  // ========================================
  {
    id: 'create-mailbox-licensed-user',
    name: 'Create Mailbox for Licensed User',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Create a new Exchange Online mailbox for a licensed user',
    instructions: `**How This Task Works:**
This script provisions Exchange Online mailboxes by assigning Microsoft 365 licenses to users, triggering automatic mailbox creation.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Microsoft Graph PowerShell SDK
- Exchange Administrator and User Administrator roles
- User.ReadWrite.All and Organization.Read.All permissions

**What You Need to Provide:**
- User Principal Name (UPN)
- Display name
- License SKU (e.g., ENTERPRISEPACK for E3)
- Usage location (2-letter country code)

**What the Script Does:**
1. Connects to Exchange Online and Microsoft Graph
2. Verifies mailbox doesn't already exist
3. Sets usage location (required for licensing)
4. Assigns Office 365 license to user
5. Waits for mailbox provisioning (30 seconds)
6. Verifies mailbox creation

**Important Notes:**
- Mailbox auto-provisions when license is assigned
- Usage location MUST be set before licensing
- Common SKUs: ENTERPRISEPACK (E3), SPE_E5 (E5)
- Provisioning takes 30-60 seconds typically
- Run Get-MgSubscribedSku to see available licenses
- User must exist before running this script`,
    parameters: [
      { id: 'upn', label: 'User Principal Name (UPN)', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'displayName', label: 'Display Name', type: 'text', required: true, placeholder: 'John Doe' },
      { id: 'licenseSku', label: 'License SKU', type: 'text', required: true, placeholder: 'contoso:ENTERPRISEPACK', description: 'E.g., contoso:ENTERPRISEPACK for Office 365 E3' },
      { id: 'location', label: 'Usage Location', type: 'text', required: true, placeholder: 'US', description: '2-letter country code' }
    ],
    scriptTemplate: (params) => {
      const upn = escapePowerShellString(params.upn);
      const displayName = escapePowerShellString(params.displayName);
      const licenseSku = escapePowerShellString(params.licenseSku);
      const location = escapePowerShellString(params.location);

      return `# Create Exchange Online Mailbox for Licensed User
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$UPN = "${upn}"
$DisplayName = "${displayName}"
$LicenseSku = "${licenseSku}"
$UsageLocation = "${location}"

try {
    # Check if mailbox already exists
    $Existing = Get-EXOMailbox -Identity $UPN -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Mailbox already exists for: $UPN" -ForegroundColor Yellow
        exit 0
    }
    
    # Create the mailbox (requires Microsoft Graph PowerShell module)
    Connect-MgGraph -Scopes "User.ReadWrite.All", "Organization.Read.All"
    
    # Set usage location first
    Update-MgUser -UserId $UPN -UsageLocation $UsageLocation
    Write-Host "[SUCCESS] Usage location set: $UsageLocation" -ForegroundColor Green
    
    # Assign license - first resolve SKU name to GUID
    $Sku = Get-MgSubscribedSku -All | Where-Object { $_.SkuPartNumber -eq $LicenseSku }
    if (-not $Sku) {
        Write-Error "License SKU not found: $LicenseSku. Run 'Get-MgSubscribedSku | Select SkuPartNumber, SkuId' to see available SKUs"
        exit 1
    }
    
    Set-MgUserLicense -UserId $UPN -AddLicenses @{SkuId = $Sku.SkuId} -RemoveLicenses @()
    Write-Host "[SUCCESS] License assigned: $LicenseSku (SKU ID: $($Sku.SkuId))" -ForegroundColor Green
    
    # Wait for mailbox provisioning
    Write-Host "Waiting for mailbox to provision..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
    
    # Verify mailbox creation
    $Mailbox = Get-EXOMailbox -Identity $UPN -ErrorAction SilentlyContinue
    if ($Mailbox) {
        Write-Host "[SUCCESS] Mailbox created successfully!" -ForegroundColor Green
        Write-Host "  UPN: $UPN" -ForegroundColor Gray
        Write-Host "  Display Name: $DisplayName" -ForegroundColor Gray
        Write-Host "  Primary SMTP: $($Mailbox.PrimarySmtpAddress)" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] Mailbox not yet provisioned. Check again in a few minutes." -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to create mailbox: $_"
    exit 1
}`;
    }
  },

  {
    id: 'assign-mailbox-permissions',
    name: 'Assign/Remove Mailbox Permissions',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Assign or remove Full Access, Send As, or Send on Behalf permissions to a mailbox',
    instructions: `**How This Task Works:**
This script manages delegation permissions for mailboxes, enabling users to access shared mailboxes or send email on behalf of others.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Recipient Management role
- Connected to Exchange Online

**What You Need to Provide:**
- Target mailbox (typically shared mailbox)
- User to grant/remove access
- Permission type (Full Access, Send As, or Send on Behalf)
- Action (Add or Remove)
- Auto-mapping preference (Full Access only)

**What the Script Does:**
1. Connects to Exchange Online
2. Verifies target mailbox and user exist
3. Adds or removes specified permission
4. Confirms permission modification

**Important Notes:**
- Full Access: Read/manage mailbox content (folders, emails)
- Send As: Send emails appearing FROM the mailbox
- Send on Behalf: Send emails showing "on behalf of"
- Auto-mapping adds mailbox to Outlook automatically
- Disable auto-mapping for shared mailboxes with many delegates
- Changes may take 60 minutes to apply in Outlook`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Target Mailbox', type: 'email', required: true, placeholder: 'shared@contoso.com' },
      { id: 'userIdentity', label: 'User to Grant/Remove Access', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'permissionType', label: 'Permission Type', type: 'select', required: true, options: ['FullAccess', 'SendAs', 'SendOnBehalf'], defaultValue: 'FullAccess' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'autoMapping', label: 'Auto-Mapping (FullAccess only)', type: 'boolean', required: false, defaultValue: true, description: 'Automatically add mailbox to Outlook' }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const userIdentity = escapePowerShellString(params.userIdentity);
      const permissionType = params.permissionType || 'FullAccess';
      const action = params.action || 'Add';
      const autoMapping = toPowerShellBoolean(params.autoMapping ?? true);

      return `# ${action} Mailbox ${permissionType} Permission
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$MailboxIdentity = "${mailboxIdentity}"
$UserIdentity = "${userIdentity}"
$PermissionType = "${permissionType}"
$Action = "${action}"
$AutoMapping = ${autoMapping}

try {
    # Verify mailbox exists
    $Mailbox = Get-EXOMailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Target Mailbox: $($Mailbox.DisplayName) ($($Mailbox.PrimarySmtpAddress))" -ForegroundColor Green
    
    # Verify user exists
    $User = Get-EXOMailbox -Identity $UserIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] User: $($User.DisplayName) ($($User.PrimarySmtpAddress))" -ForegroundColor Green
    
    if ($Action -eq "Add") {
        switch ($PermissionType) {
            "FullAccess" {
                Add-MailboxPermission -Identity $MailboxIdentity \`
                    -User $UserIdentity \`
                    -AccessRights FullAccess \`
                    -InheritanceType All \`
                    -AutoMapping $AutoMapping
                Write-Host "[SUCCESS] Full Access permission added" -ForegroundColor Green
                if ($AutoMapping) {
                    Write-Host "  Auto-mapping enabled - mailbox will appear in Outlook" -ForegroundColor Gray
                }
            }
            "SendAs" {
                Add-RecipientPermission -Identity $MailboxIdentity \`
                    -Trustee $UserIdentity \`
                    -AccessRights SendAs \`
                    -Confirm:\$false
                Write-Host "[SUCCESS] Send As permission added" -ForegroundColor Green
            }
            "SendOnBehalf" {
                Set-Mailbox -Identity $MailboxIdentity \`
                    -GrantSendOnBehalfTo @{Add=$UserIdentity}
                Write-Host "[SUCCESS] Send on Behalf permission added" -ForegroundColor Green
            }
        }
    } else {
        # Remove permissions
        switch ($PermissionType) {
            "FullAccess" {
                Remove-MailboxPermission -Identity $MailboxIdentity \`
                    -User $UserIdentity \`
                    -AccessRights FullAccess \`
                    -InheritanceType All \`
                    -Confirm:\$false
                Write-Host "[SUCCESS] Full Access permission removed" -ForegroundColor Green
            }
            "SendAs" {
                Remove-RecipientPermission -Identity $MailboxIdentity \`
                    -Trustee $UserIdentity \`
                    -AccessRights SendAs \`
                    -Confirm:\$false
                Write-Host "[SUCCESS] Send As permission removed" -ForegroundColor Green
            }
            "SendOnBehalf" {
                Set-Mailbox -Identity $MailboxIdentity \`
                    -GrantSendOnBehalfTo @{Remove=$UserIdentity}
                Write-Host "[SUCCESS] Send on Behalf permission removed" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
    Write-Host "Permission modification completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to modify permission: $_"
    exit 1
}`;
    }
  },

  {
    id: 'bulk-mailbox-operations',
    name: 'Bulk Mailbox Creation/Permission Assignment',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Create multiple mailboxes or assign permissions in bulk from CSV file',
    instructions: `**How This Task Works:**
This script automates mailbox provisioning and permission delegation at scale using CSV import for efficient bulk operations.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Microsoft Graph PowerShell SDK
- Exchange Administrator and User Administrator roles
- CSV file prepared with required columns

**What You Need to Provide:**
- CSV file path with mailbox data
- Operation type (Create Mailboxes or Assign Permissions)
- Test mode for preview

**What the Script Does:**
1. Connects to Exchange Online and Microsoft Graph
2. Imports CSV file
3. For Create Mailboxes: Sets usage location and assigns licenses
4. For Assign Permissions: Grants specified permissions
5. Reports success/failure per mailbox
6. Provides summary statistics

**Important Notes:**
- ALWAYS test first with preview mode enabled
- CSV for Create: UPN, DisplayName, Location, LicenseSku columns
- CSV for Permissions: Mailbox, User, PermissionType columns
- Process pauses between operations to avoid throttling
- Large batches (100+) may take significant time
- Review failures and reprocess as needed`,
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Scripts\\mailboxes.csv', description: 'CSV with UPN, DisplayName, Location, LicenseSku columns (SKU part numbers like ENTERPRISEPACK)' },
      { id: 'operation', label: 'Operation', type: 'select', required: true, options: ['CreateMailboxes', 'AssignPermissions'], defaultValue: 'CreateMailboxes' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const operation = params.operation || 'CreateMailboxes';
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Mailbox Operations from CSV
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$CsvPath = "${csvPath}"
$Operation = "${operation}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Import CSV
$Users = Import-Csv -Path $CsvPath
Write-Host "[SUCCESS] Loaded $($Users.Count) records from CSV" -ForegroundColor Green

if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

$SuccessCount = 0
$FailCount = 0

foreach ($User in $Users) {
    try {
        Write-Host "Processing: $($User.UPN)" -ForegroundColor Cyan
        
        if ($TestMode) {
            Write-Host "  [TEST] Would process: $($User.DisplayName)" -ForegroundColor Gray
            $SuccessCount++
        } else {
            if ($Operation -eq "CreateMailboxes") {
                # Set usage location and assign license
                Update-MgUser -UserId $User.UPN -UsageLocation $User.Location
                
                # Resolve SKU name to GUID
                $Sku = Get-MgSubscribedSku -All | Where-Object { $_.SkuPartNumber -eq $User.LicenseSku }
                if ($Sku) {
                    Set-MgUserLicense -UserId $User.UPN -AddLicenses @{SkuId = $Sku.SkuId} -RemoveLicenses @()
                    Write-Host "  [SUCCESS] License assigned: $($User.LicenseSku)" -ForegroundColor Green
                    $SuccessCount++
                } else {
                    Write-Host "  [FAILED] SKU not found: $($User.LicenseSku)" -ForegroundColor Red
                    $FailCount++
                }
            } elseif ($Operation -eq "AssignPermissions") {
                # Assign permissions based on CSV columns
                Add-MailboxPermission -Identity $User.TargetMailbox -User $User.UPN -AccessRights $User.Permission
                Write-Host "  [SUCCESS] Permission assigned" -ForegroundColor Green
                $SuccessCount++
            }
        }
    } catch {
        Write-Host "  [FAILED] Failed: $_" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "Bulk operation completed!" -ForegroundColor Green
Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })`;
    }
  },

  {
    id: 'convert-mailbox-type',
    name: 'Convert Mailbox Type (Shared ↔ User)',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Convert mailbox between User and Shared types',
    instructions: `**How This Task Works:**
This script converts mailboxes between User and Shared types for cost optimization and collaboration scenarios.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Mailbox to convert
- Target type (Shared or Regular/User)
- Option to remove license (when converting to Shared)

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves current mailbox type
3. Converts mailbox to specified type
4. Verifies conversion
5. Reminds about license management

**Important Notes:**
- Converting to Shared saves license costs (no license required)
- Converting to User requires license assignment
- Shared mailboxes limited to 50GB storage
- User access/permissions persist during conversion
- Remove license manually in M365 Admin Center after conversion
- Conversion takes effect immediately`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox to Convert', type: 'email', required: true, placeholder: 'mailbox@contoso.com' },
      { id: 'targetType', label: 'Convert To', type: 'select', required: true, options: ['Shared', 'Regular'], defaultValue: 'Shared' },
      { id: 'removeLicense', label: 'Remove License (when converting to Shared)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const targetType = params.targetType || 'Shared';
      const removeLicense = toPowerShellBoolean(params.removeLicense ?? true);

      return `# Convert Mailbox Type
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$MailboxIdentity = "${mailboxIdentity}"
$TargetType = "${targetType}"
$RemoveLicense = ${removeLicense}

try {
    # Get current mailbox
    $Mailbox = Get-EXOMailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "Current Type: $($Mailbox.RecipientTypeDetails)" -ForegroundColor Cyan
    
    if ($TargetType -eq "Shared") {
        # Convert to Shared
        Set-Mailbox -Identity $MailboxIdentity -Type Shared
        Write-Host "[SUCCESS] Converted to Shared mailbox" -ForegroundColor Green
        
        if ($RemoveLicense) {
            Write-Host "Note: Remove license manually in Microsoft 365 Admin Center" -ForegroundColor Yellow
            Write-Host "  User: $MailboxIdentity" -ForegroundColor Gray
        }
    } else {
        # Convert to Regular (User)
        Set-Mailbox -Identity $MailboxIdentity -Type Regular
        Write-Host "[SUCCESS] Converted to User mailbox" -ForegroundColor Green
        Write-Host "[WARNING] Remember to assign a license to this mailbox" -ForegroundColor Yellow
    }
    
    # Verify conversion
    Start-Sleep -Seconds 5
    $Updated = Get-EXOMailbox -Identity $MailboxIdentity
    Write-Host ""
    Write-Host "Conversion completed!" -ForegroundColor Green
    Write-Host "  New Type: $($Updated.RecipientTypeDetails)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to convert mailbox: $_"
    exit 1
}`;
    }
  },

  {
    id: 'enable-litigation-hold',
    name: 'Enable/Disable Litigation Hold or Archive',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Enable or disable litigation hold or archive mailbox for compliance',
    instructions: `**How This Task Works:**
This script manages litigation hold and archive mailboxes for eDiscovery, compliance, and long-term retention requirements.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Compliance Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Mailbox identity
- Feature (Litigation Hold or Archive)
- Action (Enable or Disable)
- Optional: Comment/reason for hold

**What the Script Does:**
1. Connects to Exchange Online
2. Verifies mailbox exists
3. Enables/disables litigation hold or archive
4. Records comment for audit trail
5. Confirms operation

**Important Notes:**
- Litigation Hold preserves ALL mailbox content indefinitely
- Archive provides additional 100GB+ storage
- Hold prevents deletion by users or retention policies
- Essential for legal cases and compliance
- Archive requires Exchange Online Plan 2 or Archive add-on
- Archive provisioning takes 24-48 hours`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'feature', label: 'Feature', type: 'select', required: true, options: ['LitigationHold', 'Archive'], defaultValue: 'LitigationHold' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' },
      { id: 'comment', label: 'Comment/Reason', type: 'textarea', required: false, placeholder: 'Legal hold for case #12345' }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const feature = params.feature || 'LitigationHold';
      const action = params.action || 'Enable';
      const comment = params.comment ? escapePowerShellString(params.comment) : '';

      return `# ${action} ${feature} for Mailbox
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$MailboxIdentity = "${mailboxIdentity}"
$Feature = "${feature}"
$Action = "${action}"
${comment ? `$Comment = "${comment}"` : ''}

try {
    $Mailbox = Get-EXOMailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    if ($Feature -eq "LitigationHold") {
        if ($Action -eq "Enable") {
            Set-Mailbox -Identity $MailboxIdentity -LitigationHoldEnabled \$true${comment ? ' -LitigationHoldComment $Comment' : ''}
            Write-Host "[SUCCESS] Litigation Hold enabled" -ForegroundColor Green
            ${comment ? 'Write-Host "  Comment: $Comment" -ForegroundColor Gray' : ''}
        } else {
            Set-Mailbox -Identity $MailboxIdentity -LitigationHoldEnabled \$false
            Write-Host "[SUCCESS] Litigation Hold disabled" -ForegroundColor Green
        }
    } elseif ($Feature -eq "Archive") {
        if ($Action -eq "Enable") {
            Enable-Mailbox -Identity $MailboxIdentity -Archive
            Write-Host "[SUCCESS] Archive mailbox enabled" -ForegroundColor Green
            Write-Host "  Archive will be provisioned shortly" -ForegroundColor Gray
        } else {
            Disable-Mailbox -Identity $MailboxIdentity -Archive -Confirm:\$false
            Write-Host "[SUCCESS] Archive mailbox disabled" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Operation completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to modify mailbox: $_"
    exit 1
}`;
    }
  },

  {
    id: 'set-mailbox-quota-retention',
    name: 'Set Mailbox Quota and Retention',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Configure mailbox storage quotas, send/receive limits, and retention policies',
    instructions: `**How This Task Works:**
This script configures mailbox storage quotas and message size limits for capacity management and policy enforcement.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Mailbox identity
- Optional: Prohibit Send quota (GB)
- Optional: Prohibit Send/Receive quota (GB)
- Optional: Max send size (MB)
- Optional: Max receive size (MB)

**What the Script Does:**
1. Connects to Exchange Online
2. Verifies mailbox exists
3. Configures specified quotas and limits
4. Displays current settings

**Important Notes:**
- Prohibit Send: User can receive but not send email
- Prohibit Send/Receive: Mailbox effectively frozen
- Default Exchange Online quotas: 50GB (E3), 100GB (E5)
- Max message size default: 35MB (can increase to 150MB)
- Quota warnings sent at 90% capacity
- Settings override organization-wide defaults`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'prohibitSendQuota', label: 'Prohibit Send Quota (GB)', type: 'number', required: false, placeholder: '49' },
      { id: 'prohibitSendReceiveQuota', label: 'Prohibit Send/Receive Quota (GB)', type: 'number', required: false, placeholder: '50' },
      { id: 'maxSendSize', label: 'Max Send Size (MB)', type: 'number', required: false, placeholder: '35' },
      { id: 'maxReceiveSize', label: 'Max Receive Size (MB)', type: 'number', required: false, placeholder: '35' }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const prohibitSendQuota = params.prohibitSendQuota;
      const prohibitSendReceiveQuota = params.prohibitSendReceiveQuota;
      const maxSendSize = params.maxSendSize;
      const maxReceiveSize = params.maxReceiveSize;

      return `# Set Mailbox Quota and Limits
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$MailboxIdentity = "${mailboxIdentity}"

try {
    $Mailbox = Get-EXOMailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    $params = @{
        Identity = $MailboxIdentity
    }
    
    ${prohibitSendQuota ? `$params.ProhibitSendQuota = "${prohibitSendQuota}GB"` : ''}
    ${prohibitSendReceiveQuota ? `$params.ProhibitSendReceiveQuota = "${prohibitSendReceiveQuota}GB"` : ''}
    ${maxSendSize ? `$params.MaxSendSize = "${maxSendSize}MB"` : ''}
    ${maxReceiveSize ? `$params.MaxReceiveSize = "${maxReceiveSize}MB"` : ''}
    
    Set-Mailbox @params
    Write-Host "[SUCCESS] Quotas and limits updated" -ForegroundColor Green
    
    # Display current settings
    $Updated = Get-EXOMailbox -Identity $MailboxIdentity | Select-Object ProhibitSendQuota, ProhibitSendReceiveQuota
    Write-Host ""
    Write-Host "Current Settings:" -ForegroundColor Cyan
    Write-Host "  Prohibit Send: $($Updated.ProhibitSendQuota)" -ForegroundColor Gray
    Write-Host "  Prohibit Send/Receive: $($Updated.ProhibitSendReceiveQuota)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to set quotas: $_"
    exit 1
}`;
    }
  },

  {
    id: 'bulk-enable-archive',
    name: 'Bulk Enable Archive Mailboxes',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Enable archive mailboxes for multiple users in bulk',
    instructions: `**How This Task Works:**
This script enables archive mailboxes at scale for compliance and mailbox capacity management across multiple users.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Exchange Online Plan 2 or Archive add-on licenses
- CSV file (optional) or domain filter

**What You Need to Provide:**
- Optional: CSV file with UPN column
- Optional: Domain filter (e.g., contoso.com)
- Test mode for preview

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves mailboxes (from CSV, domain filter, or all)
3. Checks archive status for each mailbox
4. Enables archives for eligible mailboxes
5. Reports success/failure statistics

**Important Notes:**
- ALWAYS test first with preview mode enabled
- Requires Exchange Online Plan 2 or Archive add-on
- Archive provides 100GB+ additional storage
- Provisioning takes 24-48 hours
- Skips already-enabled archives
- Large batches (500+) may take significant time`,
    parameters: [
      { id: 'csvPath', label: 'CSV File Path (Optional)', type: 'path', required: false, placeholder: 'C:\\Scripts\\users.csv', description: 'CSV with UPN column, or leave blank for all users' },
      { id: 'filterDomain', label: 'Filter by Domain (Optional)', type: 'text', required: false, placeholder: 'contoso.com' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = params.csvPath ? escapePowerShellString(params.csvPath) : '';
      const filterDomain = params.filterDomain ? escapePowerShellString(params.filterDomain) : '';
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Enable Archive Mailboxes
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

${csvPath ? `$CsvPath = "${csvPath}"` : ''}
${filterDomain ? `$FilterDomain = "${filterDomain}"` : ''}
$TestMode = ${testMode}

if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

try {
    # Get mailboxes
    ${csvPath ? `
    if (-not (Test-Path $CsvPath)) {
        Write-Error "CSV file not found: $CsvPath"
        exit 1
    }
    $Users = Import-Csv -Path $CsvPath
    $Mailboxes = $Users | ForEach-Object { Get-EXOMailbox -Identity $_.UPN -ErrorAction SilentlyContinue }
    ` : filterDomain ? `
    $Mailboxes = Get-EXOMailbox -Filter "PrimarySmtpAddress -like '*@$FilterDomain'" -ResultSize Unlimited
    ` : `
    $Mailboxes = Get-EXOMailbox -ResultSize Unlimited
    `}
    
    Write-Host "[SUCCESS] Found $($Mailboxes.Count) mailboxes to process" -ForegroundColor Green
    
    $EnabledCount = 0
    $AlreadyEnabledCount = 0
    $FailedCount = 0
    
    foreach ($Mailbox in $Mailboxes) {
        try {
            $ArchiveStatus = Get-EXOMailbox -Identity $Mailbox.PrimarySmtpAddress -Properties ArchiveStatus | Select-Object -ExpandProperty ArchiveStatus
            
            if ($ArchiveStatus -eq "Active") {
                Write-Host "  $($Mailbox.PrimarySmtpAddress): Already enabled" -ForegroundColor Gray
                $AlreadyEnabledCount++
            } else {
                if ($TestMode) {
                    Write-Host "  [TEST] Would enable archive for: $($Mailbox.PrimarySmtpAddress)" -ForegroundColor Cyan
                } else {
                    Enable-Mailbox -Identity $Mailbox.PrimarySmtpAddress -Archive
                    Write-Host "  [SUCCESS] $($Mailbox.PrimarySmtpAddress): Archive enabled" -ForegroundColor Green
                }
                $EnabledCount++
            }
        } catch {
            Write-Host "  [FAILED] $($Mailbox.PrimarySmtpAddress): Failed - $_" -ForegroundColor Red
            $FailedCount++
        }
    }
    
    Write-Host ""
    Write-Host "Bulk archive enable completed!" -ForegroundColor Green
    Write-Host "  Enabled: $EnabledCount" -ForegroundColor Green
    Write-Host "  Already Enabled: $AlreadyEnabledCount" -ForegroundColor Gray
    Write-Host "  Failed: $FailedCount" -ForegroundColor $(if ($FailedCount -gt 0) { 'Red' } else { 'Gray' })
    
} catch {
    Write-Error "Failed to process mailboxes: $_"
    exit 1
}`;
    }
  },

  {
    id: 'mailbox-delegation-report',
    name: 'Mailbox Delegation Report',
    category: 'User Mailboxes & Licenses',
    isPremium: true,
    description: 'Generate a report of all mailbox delegations (Full Access, Send As, Send on Behalf)',
    instructions: `**How This Task Works:**
This script generates comprehensive mailbox delegation reports for security audits, compliance, and access governance.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Security Reader role
- Connected to Exchange Online

**What You Need to Provide:**
- Optional: Mailbox filter (specific user or domain)
- CSV export file path
- Option to include inherited permissions

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves mailboxes (filtered or all)
3. Extracts Full Access permissions
4. Extracts Send As permissions
5. Extracts Send on Behalf permissions
6. Exports comprehensive report to CSV

**Important Notes:**
- Critical for security audits and compliance
- Identifies over-permissioned mailboxes
- Inherited permissions usually system/admin accounts
- Exclude inherited to focus on explicit delegations
- Essential for access reviews and SOC 2 compliance
- Large tenants (1000+ mailboxes) may take time`,
    parameters: [
      { id: 'mailboxFilter', label: 'Mailbox Filter (Optional)', type: 'text', required: false, placeholder: 'user@contoso.com or *@domain.com' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MailboxDelegations.csv' },
      { id: 'includeInherited', label: 'Include Inherited Permissions', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const mailboxFilter = params.mailboxFilter ? escapePowerShellString(params.mailboxFilter) : '';
      const outputPath = escapePowerShellString(params.outputPath);
      const includeInherited = toPowerShellBoolean(params.includeInherited ?? false);

      return `# Mailbox Delegation Report
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

${mailboxFilter ? `$MailboxFilter = "${mailboxFilter}"` : ''}
$OutputPath = "${outputPath}"
$IncludeInherited = ${includeInherited}

$Results = @()

try {
    Write-Host "Collecting mailbox delegations..." -ForegroundColor Cyan
    
    # Get mailboxes
    ${mailboxFilter ? `
    $Mailboxes = Get-EXOMailbox -Identity $MailboxFilter -ErrorAction Stop
    ` : `
    $Mailboxes = Get-EXOMailbox -ResultSize Unlimited
    `}
    
    Write-Host "[SUCCESS] Found $($Mailboxes.Count) mailboxes" -ForegroundColor Green
    
    foreach ($Mailbox in $Mailboxes) {
        Write-Host "Processing: $($Mailbox.PrimarySmtpAddress)" -ForegroundColor Gray
        
        # Get Full Access permissions
        $Permissions = Get-MailboxPermission -Identity $Mailbox.PrimarySmtpAddress | 
            Where-Object { $_.User -notlike "NT AUTHORITY\\*" -and $_.User -notlike "S-1-5-*" }
        
        if (-not $IncludeInherited) {
            $Permissions = $Permissions | Where-Object { -not $_.IsInherited }
        }
        
        foreach ($Perm in $Permissions) {
            $Results += [PSCustomObject]@{
                Mailbox = $Mailbox.PrimarySmtpAddress
                DisplayName = $Mailbox.DisplayName
                MailboxType = $Mailbox.RecipientTypeDetails
                DelegateUser = $Perm.User
                Permission = "FullAccess"
                IsInherited = $Perm.IsInherited
            }
        }
        
        # Get Send As permissions
        $SendAsPerms = Get-RecipientPermission -Identity $Mailbox.PrimarySmtpAddress | 
            Where-Object { $_.Trustee -notlike "NT AUTHORITY\\*" -and $_.Trustee -notlike "S-1-5-*" -and $_.AccessRights -contains "SendAs" }
        
        foreach ($Perm in $SendAsPerms) {
            $Results += [PSCustomObject]@{
                Mailbox = $Mailbox.PrimarySmtpAddress
                DisplayName = $Mailbox.DisplayName
                MailboxType = $Mailbox.RecipientTypeDetails
                DelegateUser = $Perm.Trustee
                Permission = "SendAs"
                IsInherited = $false
            }
        }
        
        # Get Send on Behalf permissions
        if ($Mailbox.GrantSendOnBehalfTo) {
            foreach ($Delegate in $Mailbox.GrantSendOnBehalfTo) {
                $Results += [PSCustomObject]@{
                    Mailbox = $Mailbox.PrimarySmtpAddress
                    DisplayName = $Mailbox.DisplayName
                    MailboxType = $Mailbox.RecipientTypeDetails
                    DelegateUser = $Delegate
                    Permission = "SendOnBehalf"
                    IsInherited = $false
                }
            }
        }
    }
    
    # Export to CSV
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Report generated successfully!" -ForegroundColor Green
    Write-Host "  Total Delegations: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate report: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DISTRIBUTION & GROUPS CATEGORY
  // ========================================
  {
    id: 'create-distribution-group',
    name: 'Create/Modify Distribution Group',
    category: 'Distribution & Groups',
    isPremium: true,
    description: 'Create a new distribution group or modify an existing one',
    instructions: `**How This Task Works:**
This script creates or modifies distribution groups for email broadcasting to teams, departments, or project groups.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Recipient Management role
- Connected to Exchange Online

**What You Need to Provide:**
- Group name
- Email address for the group
- Group owner
- Optional: Initial members (comma-separated)
- Sender authentication requirement

**What the Script Does:**
1. Connects to Exchange Online
2. Checks if group already exists
3. Creates new group or updates existing one
4. Adds initial members (if provided)
5. Confirms group creation/modification

**Important Notes:**
- Distribution groups are for email distribution only (no shared resources)
- Require sender auth prevents external spoofing
- Owner can manage membership and settings
- Use for teams, projects, or departmental communication
- Consider Microsoft 365 Groups for collaboration features
- Members added immediately (no approval needed)`,
    parameters: [
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Sales Team' },
      { id: 'emailAddress', label: 'Email Address', type: 'email', required: true, placeholder: 'sales@contoso.com' },
      { id: 'owner', label: 'Group Owner', type: 'email', required: true, placeholder: 'manager@contoso.com' },
      { id: 'members', label: 'Initial Members (comma-separated)', type: 'textarea', required: false, placeholder: 'user1@contoso.com, user2@contoso.com' },
      { id: 'requireSenderAuth', label: 'Require Sender Authentication', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const emailAddress = escapePowerShellString(params.emailAddress);
      const owner = escapePowerShellString(params.owner);
      const members = params.members ? params.members.split(',').map((m: string) => m.trim()).filter((m: string) => m) : [];
      const requireSenderAuth = toPowerShellBoolean(params.requireSenderAuth ?? true);

      return `# Create Distribution Group
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$GroupName = "${groupName}"
$EmailAddress = "${emailAddress}"
$Owner = "${owner}"
$RequireSenderAuth = ${requireSenderAuth}
${members.length > 0 ? `$Members = @(${members.map((m: string) => `"${escapePowerShellString(m)}"`).join(', ')})` : ''}

try {
    # Check if group exists
    $Existing = Get-DistributionGroup -Identity $EmailAddress -ErrorAction SilentlyContinue
    
    if ($Existing) {
        Write-Host "[WARNING] Group already exists. Updating..." -ForegroundColor Yellow
        Set-DistributionGroup -Identity $EmailAddress -RequireSenderAuthenticationEnabled $RequireSenderAuth
        Write-Host "[SUCCESS] Group updated" -ForegroundColor Green
    } else {
        # Create new group
        New-DistributionGroup -Name $GroupName \`
            -PrimarySmtpAddress $EmailAddress \`
            -ManagedBy $Owner \`
            -RequireSenderAuthenticationEnabled $RequireSenderAuth
        Write-Host "[SUCCESS] Distribution group created" -ForegroundColor Green
    }
    
    ${members.length > 0 ? `
    # Add members
    foreach ($Member in $Members) {
        try {
            Add-DistributionGroupMember -Identity $EmailAddress -Member $Member
            Write-Host "  [SUCCESS] Added member: $Member" -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING] Failed to add $Member: $_" -ForegroundColor Yellow
        }
    }
    ` : ''}
    
    Write-Host ""
    Write-Host "Distribution group ready!" -ForegroundColor Green
    Write-Host "  Name: $GroupName" -ForegroundColor Gray
    Write-Host "  Email: $EmailAddress" -ForegroundColor Gray
    Write-Host "  Owner: $Owner" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create/modify distribution group: $_"
    exit 1
}`;
    }
  },

  {
    id: 'bulk-group-members',
    name: 'Bulk Add/Remove Group Members',
    category: 'Distribution & Groups',
    isPremium: true,
    description: 'Add or remove multiple members from a distribution group using CSV',
    instructions: `**How This Task Works:**
This script manages distribution group membership at scale using CSV import for efficient bulk operations.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Recipient Management role
- CSV file prepared with Email column
- Connected to Exchange Online

**What You Need to Provide:**
- Group email address
- CSV file with "Email" column
- Action (Add or Remove members)
- Test mode for preview

**What the Script Does:**
1. Connects to Exchange Online
2. Verifies group exists
3. Imports CSV file with member emails
4. Adds or removes members in bulk
5. Reports success/failure per member
6. Provides summary statistics

**Important Notes:**
- ALWAYS test first with preview mode enabled
- CSV must have "Email" column header
- Large batches (500+) may take time
- Duplicates are handled gracefully (no error)
- Removing non-member shows as failure
- Changes take effect immediately`,
    parameters: [
      { id: 'groupIdentity', label: 'Group Email Address', type: 'email', required: true, placeholder: 'group@contoso.com' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Scripts\\members.csv', description: 'CSV with "Email" column' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const groupIdentity = escapePowerShellString(params.groupIdentity);
      const csvPath = escapePowerShellString(params.csvPath);
      const action = params.action || 'Add';
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk ${action} Group Members
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$GroupIdentity = "${groupIdentity}"
$CsvPath = "${csvPath}"
$Action = "${action}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

try {
    # Verify group exists
    $Group = Get-DistributionGroup -Identity $GroupIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Group: $($Group.DisplayName)" -ForegroundColor Green
    
    # Import members
    $Members = Import-Csv -Path $CsvPath
    Write-Host "[SUCCESS] Loaded $($Members.Count) members from CSV" -ForegroundColor Green
    
    if ($TestMode) {
        Write-Host "[WARNING] TEST MODE - No changes will be made" -ForegroundColor Yellow
        Write-Host ""
    }
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Member in $Members) {
        try {
            if ($TestMode) {
                Write-Host "  [TEST] Would $Action : $($Member.Email)" -ForegroundColor Gray
                $SuccessCount++
            } else {
                if ($Action -eq "Add") {
                    Add-DistributionGroupMember -Identity $GroupIdentity -Member $Member.Email -ErrorAction Stop
                    Write-Host "  [SUCCESS] Added: $($Member.Email)" -ForegroundColor Green
                } else {
                    Remove-DistributionGroupMember -Identity $GroupIdentity -Member $Member.Email -Confirm:\$false -ErrorAction Stop
                    Write-Host "  [SUCCESS] Removed: $($Member.Email)" -ForegroundColor Green
                }
                $SuccessCount++
            }
        } catch {
            Write-Host "  [FAILED] Failed for $($Member.Email): $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Bulk operation completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })
    
} catch {
    Write-Error "Failed to process group members: $_"
    exit 1
}`;
    }
  },

  {
    id: 'export-group-membership',
    name: 'Export Group Membership Reports',
    category: 'Distribution & Groups',
    isPremium: true,
    description: 'Generate detailed membership reports for distribution groups',
    instructions: `**How This Task Works:**
This script generates comprehensive distribution group membership reports for audits, documentation, and access governance.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Security Reader role
- Connected to Exchange Online

**What You Need to Provide:**
- Optional: Group filter (specific group or wildcard pattern)
- CSV export file path

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves distribution groups (filtered or all)
3. Extracts membership for each group
4. Compiles group details and member lists
5. Exports comprehensive report to CSV

**Important Notes:**
- Critical for access audits and compliance
- Filter by name pattern (e.g., Sales*) or domain
- Shows group type, owner, and all members
- Essential for distribution group governance
- Large tenants (100+ groups) may take time
- Use for SOC 2 and access review documentation`,
    parameters: [
      { id: 'groupFilter', label: 'Group Filter (Optional)', type: 'text', required: false, placeholder: '*@contoso.com or Sales*' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\GroupMembership.csv' }
    ],
    scriptTemplate: (params) => {
      const groupFilter = params.groupFilter ? escapePowerShellString(params.groupFilter) : '';
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Export Group Membership Report
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

${groupFilter ? `$GroupFilter = "${groupFilter}"` : ''}
$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Collecting distribution groups..." -ForegroundColor Cyan
    
    # Get groups
    ${groupFilter ? `
    $Groups = Get-DistributionGroup -Identity $GroupFilter -ErrorAction Stop
    ` : `
    $Groups = Get-DistributionGroup -ResultSize Unlimited
    `}
    
    Write-Host "[SUCCESS] Found $($Groups.Count) groups" -ForegroundColor Green
    
    foreach ($Group in $Groups) {
        Write-Host "Processing: $($Group.DisplayName)" -ForegroundColor Gray
        
        $Members = Get-DistributionGroupMember -Identity $Group.PrimarySmtpAddress
        
        foreach ($Member in $Members) {
            $Results += [PSCustomObject]@{
                GroupName = $Group.DisplayName
                GroupEmail = $Group.PrimarySmtpAddress
                MemberName = $Member.DisplayName
                MemberEmail = $Member.PrimarySmtpAddress
                MemberType = $Member.RecipientTypeDetails
            }
        }
    }
    
    # Export to CSV
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Report generated successfully!" -ForegroundColor Green
    Write-Host "  Total Memberships: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate report: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // TRANSPORT RULES & MAIL FLOW CATEGORY
  // ========================================
  {
    id: 'create-transport-rule',
    name: 'Create/Update Transport Rule',
    category: 'Transport Rules & Mail Flow',
    isPremium: true,
    description: 'Create or update mail flow transport rules for disclaimers, routing, or blocking',
    instructions: `**How This Task Works:**
This script creates transport rules for mail flow control, including message routing, blocking, disclaimers, and compliance enforcement.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Organization Management role
- Connected to Exchange Online

**What You Need to Provide:**
- Rule name
- Rule action (Reject, Redirect, Disclaimer, or Set SCL)
- Condition type (Scope, Subject, Attachment, Message Size)
- Condition value
- Enable/disable status

**What the Script Does:**
1. Connects to Exchange Online
2. Checks if rule already exists
3. Creates new transport rule or updates existing
4. Configures conditions and actions
5. Confirms rule creation/modification

**Important Notes:**
- Transport rules process ALL mail flow
- Rules execute in priority order (1 is highest)
- RejectMessage blocks and returns NDR
- SetSCL=9 marks as spam, SetSCL=-1 bypasses filter
- Test rules carefully before enabling
- Changes take effect within 30 minutes`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Block External Forwarding' },
      { id: 'ruleAction', label: 'Rule Action', type: 'select', required: true, options: ['RejectMessage', 'RedirectMessageTo', 'ApplyDisclaimer', 'SetSCL'], defaultValue: 'RejectMessage' },
      { id: 'condition', label: 'Condition Type', type: 'select', required: true, options: ['FromScope', 'SubjectContains', 'AttachmentExtension', 'MessageSizeOver'], defaultValue: 'FromScope' },
      { id: 'conditionValue', label: 'Condition Value', type: 'text', required: true, placeholder: 'NotInOrganization' },
      { id: 'enabled', label: 'Enable Rule', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const ruleAction = params.ruleAction || 'RejectMessage';
      const condition = params.condition || 'FromScope';
      const conditionValue = escapePowerShellString(params.conditionValue);
      const enabled = toPowerShellBoolean(params.enabled ?? true);

      return `# Create/Update Transport Rule
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$RuleName = "${ruleName}"
$RuleAction = "${ruleAction}"
$Condition = "${condition}"
$ConditionValue = "${conditionValue}"
$Enabled = ${enabled}

try {
    # Check if rule exists
    $Existing = Get-TransportRule -Identity $RuleName -ErrorAction SilentlyContinue
    
    if ($Existing) {
        Write-Host "[WARNING] Rule already exists. Updating..." -ForegroundColor Yellow
        Set-TransportRule -Identity $RuleName -Enabled $Enabled
        Write-Host "[SUCCESS] Transport rule updated" -ForegroundColor Green
    } else {
        # Create rule based on action type
        $params = @{
            Name = $RuleName
            Enabled = $Enabled
        }
        
        # Add condition
        switch ($Condition) {
            "FromScope" { $params.FromScope = $ConditionValue }
            "SubjectContains" { $params.SubjectContainsWords = $ConditionValue }
            "AttachmentExtension" { $params.AttachmentExtensionMatchesWords = $ConditionValue }
            "MessageSizeOver" { $params.MessageSizeOver = $ConditionValue }
        }
        
        # Add action
        switch ($RuleAction) {
            "RejectMessage" { $params.RejectMessageReasonText = "Message rejected by transport rule" }
            "RedirectMessageTo" { $params.RedirectMessageTo = $ConditionValue }
            "SetSCL" { $params.SetSCL = 9 }
        }
        
        New-TransportRule @params
        Write-Host "[SUCCESS] Transport rule created" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Transport rule ready!" -ForegroundColor Green
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Enabled: $Enabled" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create/update transport rule: $_"
    exit 1
}`;
    }
  },

  {
    id: 'block-allow-domains',
    name: 'Block/Allow Specific Domains',
    category: 'Transport Rules & Mail Flow',
    isPremium: true,
    description: 'Block or allow email from specific domains or addresses',
    instructions: `**How This Task Works:**
This script creates transport rules to block or allow specific domains for security, spam prevention, or trusted partner communication.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Domains to block/allow (comma-separated)
- Action (Block or Allow)
- Apply to (Inbound, Outbound, or Both)

**What the Script Does:**
1. Connects to Exchange Online
2. Parses domain list
3. Creates transport rule with domain conditions
4. Sets action (block with SCL=9 or allow with SCL=-1)
5. Confirms rule creation

**Important Notes:**
- Block: Sets SCL=9 (high confidence spam)
- Allow: Sets SCL=-1 (bypass all spam filtering)
- Inbound: Applies to external senders only
- Outbound: Applies to internal senders only
- Use for trusted partners or known spam domains
- Changes take effect within 30 minutes`,
    parameters: [
      { id: 'domains', label: 'Domains (comma-separated)', type: 'textarea', required: true, placeholder: 'spam.com, malicious.net' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Block', 'Allow'], defaultValue: 'Block' },
      { id: 'applyTo', label: 'Apply To', type: 'select', required: true, options: ['Inbound', 'Outbound', 'Both'], defaultValue: 'Inbound' }
    ],
    scriptTemplate: (params) => {
      const domains = params.domains.split(',').map((d: string) => d.trim()).filter((d: string) => d);
      const action = params.action || 'Block';
      const applyTo = params.applyTo || 'Inbound';

      return `# ${action} Domains
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$Domains = @(${domains.map((d: string) => `"${escapePowerShellString(d)}"`).join(', ')})
$Action = "${action}"
$ApplyTo = "${applyTo}"

try {
    $RuleName = "${action} Domains - $(Get-Date -Format 'yyyyMMdd')"
    
    $params = @{
        Name = $RuleName
        Enabled = \$true
    }
    
    # Set scope
    if ($ApplyTo -eq "Inbound" -or $ApplyTo -eq "Both") {
        $params.FromScope = "NotInOrganization"
    }
    if ($ApplyTo -eq "Outbound" -or $ApplyTo -eq "Both") {
        $params.FromScope = "InOrganization"
    }
    
    # Set domains
    $params.SenderDomainIs = $Domains
    
    # Set action
    if ($Action -eq "Block") {
        $params.RejectMessageReasonText = "Messages from this domain are blocked"
        $params.SetSCL = 9
    } else {
        $params.SetSCL = -1  # Bypass spam filtering
    }
    
    New-TransportRule @params
    Write-Host "[SUCCESS] Transport rule created: $RuleName" -ForegroundColor Green
    Write-Host "  Domains: $($Domains.Count)" -ForegroundColor Gray
    Write-Host "  Action: $Action" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create transport rule: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MESSAGE TRACE & REPORTING CATEGORY
  // ========================================
  {
    id: 'automated-message-trace',
    name: 'Automated Message Trace',
    category: 'Message Trace & Reporting',
    isPremium: true,
    description: 'Trace messages by sender, recipient, or date range with detailed results',
    instructions: `**How This Task Works:**
This script performs message trace searches for troubleshooting mail flow issues, investigating delivery failures, and compliance audits.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Security Reader role
- Connected to Exchange Online

**What You Need to Provide:**
- Optional: Sender email address
- Optional: Recipient email address
- Start date (days ago, e.g., 7 for past week)
- End date (days ago, e.g., 0 for today)
- CSV export file path

**What the Script Does:**
1. Connects to Exchange Online
2. Calculates date range
3. Traces messages matching criteria
4. Retrieves delivery status and events
5. Exports detailed results to CSV

**Important Notes:**
- Message trace limited to 10 days for Get-MessageTrace
- Use both sender/recipient for targeted searches
- Results include status (Delivered, Failed, Pending, Spam)
- Essential for troubleshooting delivery issues
- Large result sets (10,000+) may take time
- For >10 days, use historical trace cmdlets`,
    parameters: [
      { id: 'senderAddress', label: 'Sender Address (Optional)', type: 'email', required: false, placeholder: 'sender@contoso.com' },
      { id: 'recipientAddress', label: 'Recipient Address (Optional)', type: 'email', required: false, placeholder: 'recipient@contoso.com' },
      { id: 'startDate', label: 'Start Date (days ago)', type: 'number', required: true, defaultValue: 7, placeholder: '7' },
      { id: 'endDate', label: 'End Date (days ago)', type: 'number', required: true, defaultValue: 0, placeholder: '0' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MessageTrace.csv' }
    ],
    scriptTemplate: (params) => {
      const senderAddress = params.senderAddress ? escapePowerShellString(params.senderAddress) : '';
      const recipientAddress = params.recipientAddress ? escapePowerShellString(params.recipientAddress) : '';
      const startDate = params.startDate || 7;
      const endDate = params.endDate || 0;
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Automated Message Trace
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

${senderAddress ? `$SenderAddress = "${senderAddress}"` : ''}
${recipientAddress ? `$RecipientAddress = "${recipientAddress}"` : ''}
$StartDate = (Get-Date).AddDays(-${startDate})
$EndDate = (Get-Date).AddDays(-${endDate})
$OutputPath = "${outputPath}"

try {
    Write-Host "Tracing messages from $StartDate to $EndDate..." -ForegroundColor Cyan
    
    $params = @{
        StartDate = $StartDate
        EndDate = $EndDate
    }
    
    ${senderAddress ? '$params.SenderAddress = $SenderAddress' : ''}
    ${recipientAddress ? '$params.RecipientAddress = $RecipientAddress' : ''}
    
    $Messages = Get-MessageTrace @params
    
    if ($Messages) {
        $Messages | Export-Csv -Path $OutputPath -NoTypeInformation
        Write-Host "[SUCCESS] Message trace completed!" -ForegroundColor Green
        Write-Host "  Messages Found: $($Messages.Count)" -ForegroundColor Gray
        Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] No messages found matching criteria" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to trace messages: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SHARED/RESOURCE MAILBOXES CATEGORY
  // ========================================
  {
    id: 'create-shared-mailbox',
    name: 'Create Shared/Resource Mailbox',
    category: 'Shared & Resource Mailboxes',
    isPremium: true,
    description: 'Create a shared mailbox or resource mailbox (room/equipment)',
    instructions: `**How This Task Works:**
This script creates shared mailboxes for team collaboration or resource mailboxes for conference room/equipment booking.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Mailbox type (Shared, Room, or Equipment)
- Mailbox name
- Email address
- Optional: Members with Full Access (comma-separated)

**What the Script Does:**
1. Connects to Exchange Online
2. Verifies mailbox doesn't already exist
3. Creates shared or resource mailbox
4. Waits for provisioning
5. Grants Full Access to specified members
6. Confirms creation

**Important Notes:**
- Shared mailboxes don't require licenses (up to 50GB)
- Room/Equipment mailboxes for calendar booking
- Auto-mapping adds mailbox to members' Outlook
- Members can send as the shared mailbox
- Shared mailboxes limited to 50GB storage
- No interactive sign-in for shared mailboxes`,
    parameters: [
      { id: 'mailboxType', label: 'Mailbox Type', type: 'select', required: true, options: ['Shared', 'Room', 'Equipment'], defaultValue: 'Shared' },
      { id: 'name', label: 'Mailbox Name', type: 'text', required: true, placeholder: 'Sales Team' },
      { id: 'emailAddress', label: 'Email Address', type: 'email', required: true, placeholder: 'sales@contoso.com' },
      { id: 'members', label: 'Members with Full Access (comma-separated)', type: 'textarea', required: false, placeholder: 'user1@contoso.com, user2@contoso.com' }
    ],
    scriptTemplate: (params) => {
      const mailboxType = params.mailboxType || 'Shared';
      const name = escapePowerShellString(params.name);
      const emailAddress = escapePowerShellString(params.emailAddress);
      const members = params.members ? params.members.split(',').map((m: string) => m.trim()).filter((m: string) => m) : [];

      return `# Create ${mailboxType} Mailbox
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$MailboxType = "${mailboxType}"
$Name = "${name}"
$EmailAddress = "${emailAddress}"
${members.length > 0 ? `$Members = @(${members.map((m: string) => `"${escapePowerShellString(m)}"`).join(', ')})` : ''}

try {
    # Check if mailbox exists
    $Existing = Get-EXOMailbox -Identity $EmailAddress -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Mailbox already exists: $EmailAddress" -ForegroundColor Yellow
        exit 0
    }
    
    # Create mailbox
    if ($MailboxType -eq "Shared") {
        New-Mailbox -Shared -Name $Name -PrimarySmtpAddress $EmailAddress
    } elseif ($MailboxType -eq "Room") {
        New-Mailbox -Room -Name $Name -PrimarySmtpAddress $EmailAddress
    } else {
        New-Mailbox -Equipment -Name $Name -PrimarySmtpAddress $EmailAddress
    }
    
    Write-Host "[SUCCESS] $MailboxType mailbox created" -ForegroundColor Green
    
    # Wait for provisioning
    Start-Sleep -Seconds 10
    
    ${members.length > 0 ? `
    # Add members
    foreach ($Member in $Members) {
        try {
            Add-MailboxPermission -Identity $EmailAddress -User $Member -AccessRights FullAccess -AutoMapping \$true
            Write-Host "  [SUCCESS] Added $Member with Full Access" -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING] Failed to add $Member: $_" -ForegroundColor Yellow
        }
    }
    ` : ''}
    
    Write-Host ""
    Write-Host "$MailboxType mailbox ready!" -ForegroundColor Green
    Write-Host "  Name: $Name" -ForegroundColor Gray
    Write-Host "  Email: $EmailAddress" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create mailbox: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SECURITY & COMPLIANCE CATEGORY
  // ========================================
  {
    id: 'enable-mailbox-auditing',
    name: 'Enable Mailbox Auditing and Export Logs',
    category: 'Security & Compliance',
    isPremium: true,
    description: 'Enable mailbox auditing and export audit logs for compliance',
    instructions: `**How This Task Works:**
This script enables mailbox auditing for compliance and forensic investigations, tracking mailbox access and actions.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Compliance Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Optional: Mailbox identity (leave blank for all)
- Action (Enable Auditing or Export Logs)
- Optional: Output path for exported logs

**What the Script Does:**
1. Connects to Exchange Online
2. For Enable: Activates auditing for specified/all mailboxes
3. For Export: Retrieves audit logs
4. Exports logs to CSV (if applicable)
5. Confirms operation

**Important Notes:**
- Auditing tracks owner, delegate, and admin actions
- Essential for SOC 2, HIPAA, and compliance requirements
- Audit logs retained for 90 days (E3) or 365 days (E5)
- Enabled by default in Exchange Online
- Logs accessible via Purview Compliance Center
- Critical for forensic investigations`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity (Optional - leave blank for all)', type: 'email', required: false, placeholder: 'user@contoso.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['EnableAuditing', 'ExportLogs'], defaultValue: 'EnableAuditing' },
      { id: 'outputPath', label: 'Output Path (for ExportLogs)', type: 'path', required: false, placeholder: 'C:\\Reports\\AuditLogs.csv' }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = params.mailboxIdentity ? escapePowerShellString(params.mailboxIdentity) : '';
      const action = params.action || 'EnableAuditing';
      const outputPath = params.outputPath ? escapePowerShellString(params.outputPath) : '';

      return `# ${action === 'EnableAuditing' ? 'Enable' : 'Export'} Mailbox Auditing
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

${mailboxIdentity ? `$MailboxIdentity = "${mailboxIdentity}"` : ''}
$Action = "${action}"
${outputPath ? `$OutputPath = "${outputPath}"` : ''}

try {
    if ($Action -eq "EnableAuditing") {
        ${mailboxIdentity ? `
        # Enable for specific mailbox
        Set-Mailbox -Identity $MailboxIdentity -AuditEnabled \$true
        Write-Host "[SUCCESS] Auditing enabled for: $MailboxIdentity" -ForegroundColor Green
        ` : `
        # Enable for all mailboxes
        Get-EXOMailbox -ResultSize Unlimited | Set-Mailbox -AuditEnabled \$true
        Write-Host "[SUCCESS] Auditing enabled for all mailboxes" -ForegroundColor Green
        `}
    } else {
        # Export audit logs
        $StartDate = (Get-Date).AddDays(-90)
        $EndDate = Get-Date
        
        $Logs = Search-UnifiedAuditLog -StartDate $StartDate -EndDate $EndDate ${mailboxIdentity ? '-UserIds $MailboxIdentity' : ''} -RecordType ExchangeItem
        
        if ($Logs) {
            $Logs | Export-Csv -Path $OutputPath -NoTypeInformation
            Write-Host "[SUCCESS] Audit logs exported" -ForegroundColor Green
            Write-Host "  Records: $($Logs.Count)" -ForegroundColor Gray
            Write-Host "  Output: $OutputPath" -ForegroundColor Gray
        } else {
            Write-Host "[WARNING] No audit logs found" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Failed to process audit operation: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAINTENANCE CATEGORY
  // ========================================
  {
    id: 'inactive-mailbox-cleanup',
    name: 'Mailbox Inactive Cleanup/Reporting',
    category: 'Maintenance & Hygiene',
    isPremium: true,
    description: 'Find and report on mailboxes with no login activity for specified days',
    instructions: `**How This Task Works:**
This script identifies inactive mailboxes for license optimization, reporting unused mailboxes and optionally converting them to shared mailboxes.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Inactive days threshold (e.g., 90 days)
- CSV export file path
- Action (Report Only or Convert to Shared)

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves all mailboxes with last logon data
3. Identifies mailboxes inactive beyond threshold
4. Reports inactive mailboxes to CSV
5. Optionally converts inactive user mailboxes to shared

**Important Notes:**
- Inactive = No logon activity for specified days
- Converting to shared saves license costs
- Review report before converting mailboxes
- Former employees often show as inactive
- Shared mailbox conversion is reversible
- Essential for license optimization and cost savings`,
    parameters: [
      { id: 'inactiveDays', label: 'Inactive Days Threshold', type: 'number', required: true, defaultValue: 90, placeholder: '90' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\InactiveMailboxes.csv' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['ReportOnly', 'ConvertToShared'], defaultValue: 'ReportOnly' }
    ],
    scriptTemplate: (params) => {
      const inactiveDays = params.inactiveDays || 90;
      const outputPath = escapePowerShellString(params.outputPath);
      const action = params.action || 'ReportOnly';

      return `# Inactive Mailbox Cleanup/Report
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$InactiveDays = ${inactiveDays}
$OutputPath = "${outputPath}"
$Action = "${action}"
$Results = @()

try {
    Write-Host "Finding inactive mailboxes ($InactiveDays+ days)..." -ForegroundColor Cyan
    
    $Mailboxes = Get-EXOMailbox -ResultSize Unlimited -Properties LastLogonTime, WhenCreated
    
    foreach ($Mailbox in $Mailboxes) {
        $LastLogon = $Mailbox.LastLogonTime
        
        if ($LastLogon) {
            $DaysSinceLogon = (Get-Date) - $LastLogon
            
            if ($DaysSinceLogon.Days -gt $InactiveDays) {
                $Results += [PSCustomObject]@{
                    DisplayName = $Mailbox.DisplayName
                    PrimarySmtpAddress = $Mailbox.PrimarySmtpAddress
                    LastLogonTime = $LastLogon
                    DaysInactive = $DaysSinceLogon.Days
                    MailboxType = $Mailbox.RecipientTypeDetails
                }
                
                if ($Action -eq "ConvertToShared" -and $Mailbox.RecipientTypeDetails -eq "UserMailbox") {
                    Set-Mailbox -Identity $Mailbox.PrimarySmtpAddress -Type Shared
                    Write-Host "  [SUCCESS] Converted to Shared: $($Mailbox.DisplayName)" -ForegroundColor Green
                }
            }
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Inactive mailbox report generated!" -ForegroundColor Green
    Write-Host "  Inactive Mailboxes: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to process inactive mailboxes: $_"
    exit 1
}`;
    }
  },

  {
    id: 'detect-disable-forwarding',
    name: 'Detect and Disable Forwarding to External Domains',
    category: 'Maintenance & Hygiene',
    isPremium: true,
    description: 'Find and optionally disable automatic forwarding rules to external domains',
    instructions: `**How This Task Works:**
This script detects and remediates external email forwarding for security, preventing data exfiltration and account compromise indicators.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Action (Report Only or Disable Forwarding)
- CSV export file path

**What the Script Does:**
1. Connects to Exchange Online
2. Scans all mailboxes for forwarding rules
3. Identifies forwarding to external domains
4. Reports external forwarding to CSV
5. Optionally disables external forwarding

**Important Notes:**
- External forwarding is common attack indicator
- Compromised accounts often forward to attacker emails
- Review forwarding before disabling (may be legitimate)
- Disabling is reversible (can re-enable manually)
- Essential for security incident response
- Consider blocking external forwarding via transport rules`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['ReportOnly', 'DisableForwarding'], defaultValue: 'ReportOnly' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ExternalForwarding.csv' }
    ],
    scriptTemplate: (params) => {
      const action = params.action || 'ReportOnly';
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Detect and Disable External Forwarding
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$Action = "${action}"
$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Scanning for external forwarding rules..." -ForegroundColor Cyan
    
    $Mailboxes = Get-EXOMailbox -ResultSize Unlimited -Properties ForwardingSmtpAddress
    
    foreach ($Mailbox in $Mailboxes) {
        if ($Mailbox.ForwardingSmtpAddress) {
            $ForwardAddress = $Mailbox.ForwardingSmtpAddress
            
            # Check if external
            if ($ForwardAddress -notlike "*@$($Mailbox.PrimarySmtpAddress.Split('@')[1])") {
                $Results += [PSCustomObject]@{
                    Mailbox = $Mailbox.PrimarySmtpAddress
                    DisplayName = $Mailbox.DisplayName
                    ForwardingAddress = $ForwardAddress
                    Status = if ($Action -eq "DisableForwarding") { "Disabled" } else { "Active" }
                }
                
                if ($Action -eq "DisableForwarding") {
                    Set-Mailbox -Identity $Mailbox.PrimarySmtpAddress -ForwardingSmtpAddress \$null
                    Write-Host "  [SUCCESS] Disabled forwarding for: $($Mailbox.DisplayName)" -ForegroundColor Green
                } else {
                    Write-Host "  Found: $($Mailbox.DisplayName) -> $ForwardAddress" -ForegroundColor Yellow
                }
            }
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] External forwarding scan completed!" -ForegroundColor Green
    Write-Host "  Forwarding Rules Found: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to process forwarding rules: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // REPORTING & INVENTORY CATEGORY
  // ========================================
  {
    id: 'mailbox-size-report',
    name: 'Mailbox Size Report',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Generate comprehensive mailbox size reports including primary and archive sizes',
    instructions: `**How This Task Works:**
This script generates mailbox storage reports for capacity planning, quota management, and identifying oversized mailboxes.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Security Reader role
- Connected to Exchange Online

**What You Need to Provide:**
- CSV export file path
- Optional: Domain filter

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves all mailboxes (or filtered by domain)
3. Collects mailbox statistics (item count, size)
4. Includes archive mailbox data if enabled
5. Exports comprehensive report to CSV

**Important Notes:**
- Essential for storage capacity planning
- Identifies mailboxes approaching quota limits
- Archive data included when archive enabled
- Large tenants (1000+ mailboxes) may take time
- Use for quota policy enforcement
- TotalItemSize shown in GB for easy analysis`,
    parameters: [
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MailboxSizes.csv' },
      { id: 'filterDomain', label: 'Filter by Domain (Optional)', type: 'text', required: false, placeholder: 'contoso.com' }
    ],
    scriptTemplate: (params) => {
      const outputPath = escapePowerShellString(params.outputPath);
      const filterDomain = params.filterDomain ? escapePowerShellString(params.filterDomain) : '';

      return `# Mailbox Size Report
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$OutputPath = "${outputPath}"
${filterDomain ? `$FilterDomain = "${filterDomain}"` : ''}
$Results = @()

try {
    Write-Host "Collecting mailbox statistics..." -ForegroundColor Cyan
    
    # Get mailboxes
    ${filterDomain ? `
    $Mailboxes = Get-EXOMailbox -Filter "PrimarySmtpAddress -like '*@$FilterDomain'" -ResultSize Unlimited
    ` : `
    $Mailboxes = Get-EXOMailbox -ResultSize Unlimited
    `}
    
    Write-Host "[SUCCESS] Found $($Mailboxes.Count) mailboxes" -ForegroundColor Green
    
    foreach ($Mailbox in $Mailboxes) {
        Write-Host "Processing: $($Mailbox.PrimarySmtpAddress)" -ForegroundColor Gray
        
        $Stats = Get-EXOMailboxStatistics -Identity $Mailbox.PrimarySmtpAddress
        $ArchiveStats = $null
        
        if ($Mailbox.ArchiveStatus -eq "Active") {
            $ArchiveStats = Get-EXOMailboxStatistics -Identity $Mailbox.PrimarySmtpAddress -Archive -ErrorAction SilentlyContinue
        }
        
        $Results += [PSCustomObject]@{
            DisplayName = $Mailbox.DisplayName
            PrimarySmtpAddress = $Mailbox.PrimarySmtpAddress
            MailboxType = $Mailbox.RecipientTypeDetails
            ItemCount = $Stats.ItemCount
            TotalItemSize = $Stats.TotalItemSize
            ArchiveStatus = $Mailbox.ArchiveStatus
            ArchiveItemCount = if ($ArchiveStats) { $ArchiveStats.ItemCount } else { 0 }
            ArchiveSize = if ($ArchiveStats) { $ArchiveStats.TotalItemSize } else { "N/A" }
        }
    }
    
    # Export to CSV
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Report generated successfully!" -ForegroundColor Green
    Write-Host "  Mailboxes Processed: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate report: $_"
    exit 1
}`;
    }
  },

  {
    id: 'export-distribution-list-members',
    name: 'Export Distribution List Members',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Export all members of distribution lists and groups to CSV',
    instructions: `**How This Task Works:**
This script exports distribution group membership for documentation, audits, and access reviews.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Security Reader role
- Connected to Exchange Online

**What You Need to Provide:**
- Optional: Distribution list email (leave blank for all)
- CSV export file path

**What the Script Does:**
1. Connects to Exchange Online
2. Retrieves specified or all distribution groups
3. Extracts membership for each group
4. Compiles group and member details
5. Exports comprehensive report to CSV

**Important Notes:**
- Critical for access reviews and compliance
- Shows nested group memberships
- Essential for distribution group governance
- Use for audit documentation
- Large groups (1000+ members) may take time
- Report includes group owner and type`,
    parameters: [
      { id: 'groupIdentity', label: 'Distribution List Identity (Optional - leave blank for all)', type: 'email', required: false, placeholder: 'sales@contoso.com' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\DistributionListMembers.csv' }
    ],
    scriptTemplate: (params) => {
      const groupIdentity = params.groupIdentity ? escapePowerShellString(params.groupIdentity) : '';
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Export Distribution List Members
# Generated: ${new Date().toISOString()}

# Connect to Exchange Online
# Run: Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

${groupIdentity ? `$GroupIdentity = "${groupIdentity}"` : ''}
$OutputPath = "${outputPath}"
$Results = @()

try {
    ${groupIdentity ? `
    # Export specific group
    $Group = Get-DistributionGroup -Identity $GroupIdentity
    $Groups = @($Group)
    ` : `
    # Export all groups
    $Groups = Get-DistributionGroup -ResultSize Unlimited
    `}
    
    Write-Host "Processing $($Groups.Count) distribution lists..." -ForegroundColor Cyan
    
    foreach ($Group in $Groups) {
        $Members = Get-DistributionGroupMember -Identity $Group.PrimarySmtpAddress
        
        foreach ($Member in $Members) {
            $Results += [PSCustomObject]@{
                GroupName = $Group.DisplayName
                GroupEmail = $Group.PrimarySmtpAddress
                MemberName = $Member.DisplayName
                MemberEmail = $Member.PrimarySmtpAddress
                MemberType = $Member.RecipientTypeDetails
            }
        }
    }
    
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Distribution list members exported!" -ForegroundColor Green
    Write-Host "  Groups Processed: $($Groups.Count)" -ForegroundColor Gray
    Write-Host "  Total Members: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export distribution list members: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAIL FLOW & TRANSPORT CATEGORY
  // ========================================
  {
    id: 'configure-inbound-connector',
    name: 'Configure Inbound Mail Connector',
    category: 'Mail Flow & Transport',
    isPremium: true,
    description: 'Create an inbound connector for mail flow from on-premises or third-party systems',
    instructions: `**How This Task Works:**
This script creates an inbound connector to receive mail from external mail servers like on-premises Exchange or third-party email security gateways.

**Prerequisites:**
- Exchange Online Administrator role
- Sender IP addresses or certificate information
- TLS requirements documented

**What You Need to Provide:**
- Connector name
- Sender domains or IP addresses
- TLS/security settings

**What the Script Does:**
1. Creates new inbound connector
2. Configures sender authentication (IP/certificate)
3. Sets TLS requirements
4. Enables the connector

**Important Notes:**
- Test mail flow after creating connector
- Use IP restrictions for on-premises servers
- Certificate-based auth recommended for production
- Monitor connector usage in mail flow reports`,
    parameters: [
      { id: 'connectorName', label: 'Connector Name', type: 'text', required: true, placeholder: 'Inbound from On-Prem' },
      { id: 'senderDomains', label: 'Sender Domains', type: 'textarea', required: false, placeholder: 'contoso.com, fabrikam.com', description: 'Comma-separated domains' },
      { id: 'senderIPAddresses', label: 'Sender IP Addresses', type: 'textarea', required: false, placeholder: '192.168.1.10, 10.0.0.5', description: 'Comma-separated IPs' },
      { id: 'requireTLS', label: 'Require TLS', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const connectorName = escapePowerShellString(params.connectorName);
      const senderDomains = params.senderDomains ? params.senderDomains.split(',').map((d: string) => escapePowerShellString(d.trim())).filter((d: string) => d) : [];
      const senderIPs = params.senderIPAddresses ? params.senderIPAddresses.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip) : [];
      const requireTLS = params.requireTLS !== false;
      const psRequireTLS = requireTLS ? '$true' : '$false';

      return `# Configure Inbound Mail Connector
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Creating inbound connector: ${connectorName}" -ForegroundColor Cyan
    
    $ConnectorParams = @{
        Name = "${connectorName}"
        ConnectorType = "OnPremises"
        RequireTls = ${psRequireTLS}
        Enabled = \\$true
    }
    
    ${senderDomains.length > 0 ? `$ConnectorParams.SenderDomains = @(${senderDomains.map((d: string) => `"${d}"`).join(', ')})` : ''}
    ${senderIPs.length > 0 ? `$ConnectorParams.SenderIPAddresses = @(${senderIPs.map((ip: string) => `"${ip}"`).join(', ')})` : ''}
    
    New-InboundConnector @ConnectorParams
    
    Write-Host "[SUCCESS] Inbound connector created successfully" -ForegroundColor Green
    Write-Host "  Name: ${connectorName}" -ForegroundColor Gray
    Write-Host "  TLS Required: ${requireTLS}" -ForegroundColor Gray
    ${senderDomains.length > 0 ? `Write-Host "  Sender Domains: ${senderDomains.join(', ')}" -ForegroundColor Gray` : ''}
    ${senderIPs.length > 0 ? `Write-Host "  Sender IPs: ${senderIPs.join(', ')}" -ForegroundColor Gray` : ''}
    
} catch {
    Write-Error "Failed to create inbound connector: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-accepted-domain',
    name: 'Add Accepted Domain',
    category: 'Mail Flow & Transport',
    isPremium: true,
    description: 'Add an accepted domain to Exchange Online for receiving mail',
    instructions: `**How This Task Works:**
This script adds a new accepted domain to Exchange Online, allowing the organization to receive mail for that domain.

**Prerequisites:**
- Exchange Administrator role
- Domain ownership verified in Microsoft 365 admin center
- DNS MX records configured

**What You Need to Provide:**
- Domain name
- Domain type (Authoritative or Internal Relay)

**What the Script Does:**
1. Adds the accepted domain
2. Sets domain type
3. Verifies configuration

**Important Notes:**
- Domain must be verified in M365 admin center first
- Authoritative = primary mail domain
- Internal Relay = mail forwarded elsewhere
- Update MX records in DNS after adding`,
    parameters: [
      { id: 'domainName', label: 'Domain Name', type: 'text', required: true, placeholder: 'newdomain.com' },
      { id: 'domainType', label: 'Domain Type', type: 'select', required: true, options: ['Authoritative', 'InternalRelay'], defaultValue: 'Authoritative' }
    ],
    scriptTemplate: (params) => {
      const domainName = escapePowerShellString(params.domainName);
      const domainType = params.domainType || 'Authoritative';

      return `# Add Accepted Domain
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Adding accepted domain: ${domainName}" -ForegroundColor Cyan
    
    New-AcceptedDomain -Name "${domainName}" -DomainName "${domainName}" -DomainType ${domainType}
    
    Write-Host "[SUCCESS] Accepted domain added successfully" -ForegroundColor Green
    Write-Host "  Domain: ${domainName}" -ForegroundColor Gray
    Write-Host "  Type: ${domainType}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING]️ Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Update DNS MX records to point to Exchange Online" -ForegroundColor Gray
    Write-Host "  2. Verify mail flow with Test-MxRecordCache" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to add accepted domain: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MIGRATION & COMPLIANCE CATEGORY  
  // ========================================
  {
    id: 'start-mailbox-migration-batch',
    name: 'Start Mailbox Migration Batch',
    category: 'Migration & Compliance',
    isPremium: true,
    description: 'Create and start a mailbox migration batch from on-premises Exchange',
    instructions: `**How This Task Works:**
This script creates a migration batch to move mailboxes from on-premises Exchange Server to Exchange Online.

**Prerequisites:**
- Hybrid configuration completed (Hybrid Configuration Wizard)
- Migration endpoint created and tested
- Mailboxes licensed in Microsoft 365
- MRS Proxy enabled on on-premises Exchange

**What You Need to Provide:**
- CSV file with mailboxes to migrate
- Migration endpoint name
- Target delivery domain

**What the Script Does:**
1. Imports CSV with user list
2. Creates migration batch
3. Starts the migration
4. Reports progress

**Important Notes:**
- CSV must have EmailAddress column
- Test with small batch first
- Monitor for sync errors
- Complete migration in Exchange Admin Center
- Users may experience brief Outlook reconnection`,
    parameters: [
      { id: 'batchName', label: 'Migration Batch Name', type: 'text', required: true, placeholder: 'Q1-2025-Migration' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\\\Migrations\\\\users.csv', description: 'CSV with EmailAddress column' },
      { id: 'migrationEndpoint', label: 'Migration Endpoint', type: 'text', required: true, placeholder: 'Hybrid Migration Endpoint' },
      { id: 'targetDeliveryDomain', label: 'Target Delivery Domain', type: 'text', required: true, placeholder: 'contoso.mail.onmicrosoft.com' }
    ],
    scriptTemplate: (params) => {
      const batchName = escapePowerShellString(params.batchName);
      const csvPath = escapePowerShellString(params.csvPath);
      const endpoint = escapePowerShellString(params.migrationEndpoint);
      const targetDomain = escapePowerShellString(params.targetDeliveryDomain);

      return `# Start Mailbox Migration Batch
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Creating migration batch: ${batchName}" -ForegroundColor Cyan
    
    $BatchParams = @{
        Name = "${batchName}"
        CSVData = ([System.IO.File]::ReadAllBytes("${csvPath}"))
        SourceEndpoint = "${endpoint}"
        TargetDeliveryDomain = "${targetDomain}"
        AutoStart = \\$true
        AutoComplete = \\$false
    }
    
    $Batch = New-MigrationBatch @BatchParams
    
    Write-Host "[SUCCESS] Migration batch created and started" -ForegroundColor Green
    Write-Host "  Batch Name: ${batchName}" -ForegroundColor Gray
    Write-Host "  Endpoint: ${endpoint}" -ForegroundColor Gray
    Write-Host "  Target Domain: ${targetDomain}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Monitor progress with:" -ForegroundColor Cyan
    Write-Host "  Get-MigrationBatch -Identity '${batchName}' | fl" -ForegroundColor Gray
    Write-Host "  Get-MigrationUser -BatchId '${batchName}'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create migration batch: $_"
    exit 1
}`;
    }
  },

  {
    id: 'enable-mailbox-archive',
    name: 'Enable In-Place Archive for Mailbox',
    category: 'Migration & Compliance',
    isPremium: true,
    description: 'Enable online archive mailbox for a user',
    instructions: `**How This Task Works:**
This script enables the In-Place Archive (online archive) for a user mailbox, providing additional storage capacity.

**Prerequisites:**
- Exchange Online Plan 2 or archive add-on license
- Exchange Administrator role
- Mailbox must already exist

**What You Need to Provide:**
- User email address

**What the Script Does:**
1. Verifies mailbox exists
2. Enables archive mailbox
3. Sets archive quota (if specified)
4. Confirms activation

**Important Notes:**
- Archive appears in Outlook after provisioning (5-10 minutes)
- Default quota: 100 GB (can be increased to unlimited with license)
- Use for long-term email retention
- Archive policies can auto-move old items`,
    parameters: [
      { id: 'userEmail', label: 'User Email Address', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'archiveQuota', label: 'Archive Warning Quota (GB)', type: 'number', required: false, placeholder: '90', description: 'Optional: warning quota in GB' }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const quota = params.archiveQuota ? parseInt(params.archiveQuota) : null;

      return `# Enable In-Place Archive
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Enabling archive for ${userEmail}..." -ForegroundColor Cyan
    
    Enable-Mailbox -Identity "${userEmail}" -Archive
    
    ${quota ? `
    # Set archive quota
    Set-Mailbox -Identity "${userEmail}" -ArchiveWarningQuota "${quota}GB" -ArchiveQuota "${quota + 10}GB"
    Write-Host "  Archive Quota: ${quota} GB (warning)" -ForegroundColor Gray
    ` : ''}
    
    $Mailbox = Get-Mailbox -Identity "${userEmail}"
    
    Write-Host "[SUCCESS] Archive enabled successfully" -ForegroundColor Green
    Write-Host "  User: ${userEmail}" -ForegroundColor Gray
    Write-Host "  Archive Status: $($Mailbox.ArchiveStatus)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ℹ️ Archive will appear in Outlook within 5-10 minutes" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to enable archive: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-ediscovery-case',
    name: 'Create eDiscovery Case',
    category: 'Migration & Compliance',
    isPremium: true,
    description: 'Create a new eDiscovery case for legal hold and content search',
    instructions: `**How This Task Works:**
This script creates an eDiscovery case in the Security & Compliance Center for legal investigations and content preservation.

**Prerequisites:**
- eDiscovery Manager role in Security & Compliance Center
- Appropriate compliance license (E3/E5)
- Connect to Security & Compliance PowerShell

**What You Need to Provide:**
- Case name
- Case description
- Case members (optional)

**What the Script Does:**
1. Connects to Security & Compliance Center
2. Creates eDiscovery case
3. Adds case members if specified
4. Reports case details

**Important Notes:**
- Use for legal holds and content searches
- Add searches and holds after creating case
- Case members can view/manage the case
- Export results via Security & Compliance Center`,
    parameters: [
      { id: 'caseName', label: 'Case Name', type: 'text', required: true, placeholder: 'Legal-Investigation-2025-001' },
      { id: 'caseDescription', label: 'Case Description', type: 'textarea', required: true, placeholder: 'Investigation regarding...' },
      { id: 'caseMembers', label: 'Case Members (emails)', type: 'textarea', required: false, placeholder: 'legal@contoso.com, compliance@contoso.com', description: 'Comma-separated emails' }
    ],
    scriptTemplate: (params) => {
      const caseName = escapePowerShellString(params.caseName);
      const caseDesc = escapePowerShellString(params.caseDescription);
      const members = params.caseMembers ? params.caseMembers.split(',').map((m: string) => escapePowerShellString(m.trim())).filter((m: string) => m) : [];

      return `# Create eDiscovery Case
# Generated: ${new Date().toISOString()}

# Connect to Security & Compliance Center
Connect-IPPSSession

try {
    Write-Host "Creating eDiscovery case: ${caseName}" -ForegroundColor Cyan
    
    $Case = New-ComplianceCase -Name "${caseName}" -Description "${caseDesc}"
    
    ${members.length > 0 ? `
    # Add case members
    foreach ($Member in @(${members.map((m: string) => `"${m}"`).join(', ')})) {
        Add-ComplianceCaseMember -Case "${caseName}" -Member $Member
        Write-Host "  Added member: $Member" -ForegroundColor Gray
    }
    ` : ''}
    
    Write-Host "[SUCCESS] eDiscovery case created successfully" -ForegroundColor Green
    Write-Host "  Case Name: ${caseName}" -ForegroundColor Gray
    Write-Host "  Case ID: $($Case.Identity)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Create content searches in this case" -ForegroundColor Gray
    Write-Host "  2. Place mailboxes/sites on hold" -ForegroundColor Gray
    Write-Host "  3. Export search results when ready" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create eDiscovery case: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SECURITY & DLP CATEGORY
  // ========================================
  {
    id: 'configure-dkim-signing',
    name: 'Enable DKIM Signing for Domain',
    category: 'Security & DLP',
    isPremium: true,
    description: 'Enable DomainKeys Identified Mail (DKIM) signing for a domain',
    instructions: `**How This Task Works:**
This script enables DKIM email authentication for a domain, cryptographically signing outbound messages to prevent spoofing.

**Prerequisites:**
- Exchange Administrator role
- Domain must be accepted domain in Exchange Online
- Access to DNS management for the domain

**What You Need to Provide:**
- Domain name to enable DKIM for

**What the Script Does:**
1. Enables DKIM signing configuration
2. Generates CNAME records for publication
3. Provides DNS record details
4. Activates DKIM signing

**Important Notes:**
- Publish CNAME records in DNS before activating
- DKIM improves email deliverability
- Required for DMARC policy enforcement
- Check DKIM status after DNS propagation (24-48 hours)`,
    parameters: [
      { id: 'domainName', label: 'Domain Name', type: 'text', required: true, placeholder: 'contoso.com' }
    ],
    scriptTemplate: (params) => {
      const domainName = escapePowerShellString(params.domainName);

      return `# Enable DKIM Signing
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Configuring DKIM for domain: ${domainName}" -ForegroundColor Cyan
    
    # Get or create DKIM signing config
    $DkimConfig = Get-DkimSigningConfig -Identity "${domainName}" -ErrorAction SilentlyContinue
    
    if (-not $DkimConfig) {
        $DkimConfig = New-DkimSigningConfig -DomainName "${domainName}" -Enabled \\$false
        Write-Host "  DKIM config created" -ForegroundColor Gray
    }
    
    # Get CNAME records
    $CnameRecords = $DkimConfig | Select-Object -ExpandProperty Selector1CNAME, Selector2CNAME
    
    Write-Host ""
    Write-Host "[SUCCESS] DKIM configuration created" -ForegroundColor Green
    Write-Host ""
    Write-Host "[WARNING]️ IMPORTANT: Add these CNAME records to your DNS:" -ForegroundColor Yellow
    Write-Host "  Selector 1 CNAME:" -ForegroundColor Cyan
    Write-Host "    $($DkimConfig.Selector1CNAME)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Selector 2 CNAME:" -ForegroundColor Cyan  
    Write-Host "    $($DkimConfig.Selector2CNAME)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After publishing DNS records (wait 24-48 hours), enable DKIM:" -ForegroundColor Cyan
    Write-Host "  Set-DkimSigningConfig -Identity '${domainName}' -Enabled \\$true" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure DKIM: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-dlp-policy',
    name: 'Create DLP Policy',
    category: 'Security & DLP',
    isPremium: true,
    description: 'Create a Data Loss Prevention policy to protect sensitive information',
    instructions: `**How This Task Works:**
This script creates a DLP policy in Exchange Online to detect and protect sensitive information in emails.

**Prerequisites:**
- Security Administrator or Compliance Administrator role
- DLP feature available in license (E3/E5)
- Connect to Security & Compliance PowerShell

**What You Need to Provide:**
- Policy name
- Sensitive information type to protect
- Action to take (notify, block, etc.)

**What the Script Does:**
1. Creates DLP policy
2. Configures rules for sensitive info detection
3. Sets policy actions
4. Enables the policy

**Important Notes:**
- Test in audit mode first
- Common types: Credit Card, SSN, Financial Data
- Can notify users or block sending
- Monitor policy matches in reports`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Protect Credit Card Numbers' },
      { id: 'sensitiveType', label: 'Sensitive Info Type', type: 'select', required: true, options: ['Credit Card Number', 'U.S. Social Security Number', 'U.S. Bank Account Number', 'SWIFT Code'], defaultValue: 'Credit Card Number' },
      { id: 'action', label: 'Policy Action', type: 'select', required: true, options: ['NotifyUser', 'BlockAccess', 'NotifyAndBlock'], defaultValue: 'NotifyUser', description: 'Action when sensitive info detected' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const sensitiveType = params.sensitiveType || 'Credit Card Number';
      const action = params.action || 'NotifyUser';

      return `# Create DLP Policy
# Generated: ${new Date().toISOString()}

# Connect to Security & Compliance Center
Connect-IPPSSession

try {
    Write-Host "Creating DLP policy: ${policyName}" -ForegroundColor Cyan
    
    # Create DLP policy
    New-DlpCompliancePolicy -Name "${policyName}" -ExchangeLocation All -Mode Enable
    
    # Create DLP rule
    $RuleParams = @{
        Policy = "${policyName}"
        Name = "${policyName} Rule"
        ContentContainsSensitiveInformation = @{Name="${sensitiveType}"; minCount="1"}
    }
    
    # Add action based on selection
    switch ("${action}") {
        "NotifyUser" { 
            $RuleParams.NotifyUser = @("LastModifier")
            $RuleParams.NotifyUserType = "NotSet"
        }
        "BlockAccess" {
            $RuleParams.BlockAccess = \\$true
            $RuleParams.BlockAccessScope = "All"
        }
        "NotifyAndBlock" {
            $RuleParams.NotifyUser = @("LastModifier")
            $RuleParams.BlockAccess = \\$true
            $RuleParams.BlockAccessScope = "All"
        }
    }
    
    New-DlpComplianceRule @RuleParams
    
    Write-Host "[SUCCESS] DLP policy created successfully" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Gray
    Write-Host "  Protects: ${sensitiveType}" -ForegroundColor Gray
    Write-Host "  Action: ${action}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ℹ️ Monitor policy matches in Compliance Center > Reports" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create DLP policy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'set-mobile-device-access-rule',
    name: 'Configure Mobile Device Access Rule',
    category: 'Security & DLP',
    isPremium: true,
    description: 'Set mobile device access rules for Exchange ActiveSync',
    instructions: `**How This Task Works:**
This script configures access rules for mobile devices connecting via Exchange ActiveSync (EAS).

**Prerequisites:**
- Exchange Administrator role
- Mobile Device Management configured
- ActiveSync enabled for organization

**What You Need to Provide:**
- Device type or family to target
- Access level (Allow, Block, Quarantine)

**What the Script Does:**
1. Creates or updates mobile device access rule
2. Sets access level for specified devices
3. Applies rule to organization

**Important Notes:**
- Rules apply to new device connections
- Existing devices may need manual intervention
- Quarantine allows admin review before access
- Use with device compliance policies for best security`,
    parameters: [
      { id: 'deviceFamily', label: 'Device Family', type: 'select', required: true, options: ['iOS', 'Android', 'WindowsPhone', 'WindowsMail'], defaultValue: 'Android' },
      { id: 'accessLevel', label: 'Access Level', type: 'select', required: true, options: ['Allow', 'Block', 'Quarantine'], defaultValue: 'Allow' }
    ],
    scriptTemplate: (params) => {
      const deviceFamily = params.deviceFamily || 'Android';
      const accessLevel = params.accessLevel || 'Allow';

      return `# Configure Mobile Device Access Rule
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Configuring mobile device access rule..." -ForegroundColor Cyan
    Write-Host "  Device Family: ${deviceFamily}" -ForegroundColor Gray
    Write-Host "  Access Level: ${accessLevel}" -ForegroundColor Gray
    
    $RuleName = "${deviceFamily} Access Rule"
    
    # Check if rule exists
    $ExistingRule = Get-ActiveSyncDeviceAccessRule | Where-Object { $_.QueryString -like "*${deviceFamily}*" }
    
    if ($ExistingRule) {
        Set-ActiveSyncDeviceAccessRule -Identity $ExistingRule.Identity -AccessLevel ${accessLevel}
        Write-Host "[SUCCESS] Updated existing rule" -ForegroundColor Green
    } else {
        New-ActiveSyncDeviceAccessRule -Characteristic DeviceType -QueryString "${deviceFamily}" -AccessLevel ${accessLevel}
        Write-Host "[SUCCESS] Created new access rule" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Current mobile device access rules:" -ForegroundColor Cyan
    Get-ActiveSyncDeviceAccessRule | Format-Table Name, AccessLevel, Characteristic, QueryString -AutoSize
    
} catch {
    Write-Error "Failed to configure mobile device access rule: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-transport-rule-compliance',
    name: 'Create Transport Rule for Compliance',
    category: 'Security & DLP',
    isPremium: true,
    description: 'Create mail flow rule for compliance requirements (disclaimers, encryption, blocking)',
    instructions: `**How This Task Works:**
This script creates an Exchange transport rule to enforce compliance requirements on email messages.

**Prerequisites:**
- Exchange Administrator role
- Understanding of mail flow and compliance needs

**What You Need to Provide:**
- Rule name and description
- Conditions to match
- Actions to take

**What the Script Does:**
1. Creates mail transport rule
2. Sets conditions (sender, recipient, content)
3. Defines actions (add disclaimer, encrypt, block, redirect)
4. Enables the rule

**Important Notes:**
- Rules process in priority order
- Test with specific users first
- Can add disclaimers, encrypt sensitive mail
- Monitor rule hits in message trace`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Add Legal Disclaimer' },
      { id: 'ruleType', label: 'Rule Type', type: 'select', required: true, options: ['AddDisclaimer', 'EncryptMessage', 'BlockMessage', 'RedirectMessage'], defaultValue: 'AddDisclaimer' },
      { id: 'senderDomain', label: 'Apply to Sender Domain', type: 'text', required: false, placeholder: 'contoso.com', description: 'Leave blank for all' },
      { id: 'disclaimerText', label: 'Disclaimer Text', type: 'textarea', required: false, placeholder: 'This email contains confidential information...', description: 'For AddDisclaimer type' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const ruleType = params.ruleType || 'AddDisclaimer';
      const senderDomain = params.senderDomain ? escapePowerShellString(params.senderDomain) : '';
      const disclaimerText = params.disclaimerText ? escapePowerShellString(params.disclaimerText) : 'This email contains confidential information.';

      return `# Create Transport Rule for Compliance
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Creating transport rule: ${ruleName}" -ForegroundColor Cyan
    
    $RuleParams = @{
        Name = "${ruleName}"
        Enabled = \\$true
        Priority = 0
    }
    
    # Add sender condition if specified
    ${senderDomain ? `$RuleParams.FromScope = "InOrganization"` : ''}
    ${senderDomain ? `$RuleParams.SenderDomainIs = "${senderDomain}"` : ''}
    
    # Configure action based on rule type
    switch ("${ruleType}") {
        "AddDisclaimer" {
            $RuleParams.ApplyHtmlDisclaimerText = "${disclaimerText}"
            $RuleParams.ApplyHtmlDisclaimerLocation = "Append"
            $RuleParams.ApplyHtmlDisclaimerFallbackAction = "Wrap"
        }
        "EncryptMessage" {
            $RuleParams.ApplyRightsProtectionTemplate = "Encrypt"
        }
        "BlockMessage" {
            $RuleParams.RejectMessageReasonText = "Message blocked by compliance policy"
            $RuleParams.RejectMessageEnhancedStatusCode = "5.7.1"
        }
        "RedirectMessage" {
            Write-Host "[WARNING]️ Redirect requires -RedirectMessageTo parameter - add manually" -ForegroundColor Yellow
        }
    }
    
    New-TransportRule @RuleParams
    
    Write-Host "[SUCCESS] Transport rule created successfully" -ForegroundColor Green
    Write-Host "  Rule: ${ruleName}" -ForegroundColor Gray
    Write-Host "  Type: ${ruleType}" -ForegroundColor Gray
    ${senderDomain ? `Write-Host "  Scope: ${senderDomain}" -ForegroundColor Gray` : ''}
    
} catch {
    Write-Error "Failed to create transport rule: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-remote-domain',
    name: 'Configure Remote Domain Settings',
    category: 'Mail Flow & Transport',
    isPremium: true,
    description: 'Configure remote domain settings for external email domains',
    instructions: `**How This Task Works:**
This script configures settings for how Exchange Online handles mail sent to external domains (remote domains).

**Prerequisites:**
- Exchange Administrator role
- Understanding of remote domain requirements

**What You Need to Provide:**
- Domain name pattern (e.g., partner.com or *.gov)
- Settings for out-of-office, delivery reports, etc.

**What the Script Does:**
1. Creates or updates remote domain configuration
2. Sets allowed/blocked features
3. Configures message format options

**Important Notes:**
- Default remote domain (*) applies to all external domains
- Create specific domains to override defaults
- Control out-of-office, read receipts, delivery reports
- Useful for partner/vendor-specific policies`,
    parameters: [
      { id: 'domainName', label: 'Remote Domain', type: 'text', required: true, placeholder: 'partner.com or *.gov' },
      { id: 'allowOOF', label: 'Allow Out-of-Office Messages', type: 'boolean', required: false, defaultValue: true },
      { id: 'allowDeliveryReports', label: 'Allow Delivery Reports', type: 'boolean', required: false, defaultValue: true },
      { id: 'allowAutomaticReplies', label: 'Allow Automatic Replies', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const domainName = escapePowerShellString(params.domainName);
      const allowOOF = params.allowOOF !== false;
      const allowDR = params.allowDeliveryReports !== false;
      const allowAuto = params.allowAutomaticReplies === true;
      const psOOF = allowOOF ? '$true' : '$false';
      const psDR = allowDR ? '$true' : '$false';
      const psAuto = allowAuto ? '$true' : '$false';

      return `# Configure Remote Domain
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Configuring remote domain: ${domainName}" -ForegroundColor Cyan
    
    $RemoteDomain = Get-RemoteDomain | Where-Object { $_.DomainName -eq "${domainName}" }
    
    if ($RemoteDomain) {
        Set-RemoteDomain -Identity $RemoteDomain.Identity -AllowedOOFType ${allowOOF ? 'External' : 'None'} -DeliveryReportEnabled ${psDR} -AutoReplyEnabled ${psAuto}
        Write-Host "[SUCCESS] Updated existing remote domain" -ForegroundColor Green
    } else {
        New-RemoteDomain -Name "${domainName}" -DomainName "${domainName}" -AllowedOOFType ${allowOOF ? 'External' : 'None'} -DeliveryReportEnabled ${psDR} -AutoReplyEnabled ${psAuto}
        Write-Host "[SUCCESS] Created new remote domain" -ForegroundColor Green
    }
    
    Write-Host "  Domain: ${domainName}" -ForegroundColor Gray
    Write-Host "  Out-of-Office: ${allowOOF}" -ForegroundColor Gray
    Write-Host "  Delivery Reports: ${allowDR}" -ForegroundColor Gray
    Write-Host "  Auto Replies: ${allowAuto}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure remote domain: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-litigation-hold',
    name: 'Configure Mailbox Litigation Hold',
    category: 'Compliance & eDiscovery',
    isPremium: true,
    description: 'Place mailbox on litigation hold to preserve all content for legal/compliance purposes',
    instructions: `**How This Task Works:**
This script places mailboxes on litigation hold, preserving all mailbox content indefinitely for legal or compliance purposes.

**Prerequisites:**
- Exchange Administrator role
- Understanding of legal hold requirements
- Sufficient mailbox quota

**What You Need to Provide:**
- User email address
- Hold duration (optional)
- Hold comment/reason

**What the Script Does:**
1. Enables litigation hold on mailbox
2. Sets optional hold duration
3. Records reason for hold
4. Verifies hold is active

**Important Notes:**
- Preserves all items including deleted
- Content cannot be permanently deleted
- Users can still delete items (marked as hold items)
- Requires additional storage quota
- Hold takes precedence over retention policies`,
    parameters: [
      { id: 'userEmail', label: 'User Email Address', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'holdDuration', label: 'Hold Duration (Days)', type: 'number', required: false, placeholder: '365', description: 'Leave blank for indefinite hold' },
      { id: 'holdComment', label: 'Hold Comment/Reason', type: 'textarea', required: true, placeholder: 'Legal case #12345 - preserve all communications' }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const holdComment = escapePowerShellString(params.holdComment);
      const holdDuration = params.holdDuration;

      return `# Configure Mailbox Litigation Hold
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Enabling litigation hold for: ${userEmail}" -ForegroundColor Cyan
    
    $SetParams = @{
        Identity = "${userEmail}"
        LitigationHoldEnabled = \\$true
        LitigationHoldComment = "${holdComment}"
    }
    
    ${holdDuration ? `$SetParams.LitigationHoldDuration = ${holdDuration}` : ''}
    
    Set-Mailbox @SetParams
    
    Write-Host "[SUCCESS] Litigation hold enabled successfully" -ForegroundColor Green
    Write-Host "  User: ${userEmail}" -ForegroundColor Gray
    ${holdDuration ? `Write-Host "  Duration: ${holdDuration} days" -ForegroundColor Gray` : `Write-Host "  Duration: Indefinite" -ForegroundColor Gray`}
    Write-Host "  Comment: ${holdComment}" -ForegroundColor Gray
    
    $Mailbox = Get-Mailbox -Identity "${userEmail}" | Select-Object LitigationHoldEnabled, LitigationHoldDate
    Write-Host "  Hold Date: $($Mailbox.LitigationHoldDate)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to enable litigation hold: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-audit-bypass',
    name: 'Configure Mailbox Audit Bypass',
    category: 'Auditing & Compliance',
    isPremium: true,
    description: 'Configure audit bypass for service accounts or automated processes',
    instructions: `**How This Task Works:**
This script configures mailbox audit bypass associations to exclude service accounts from mailbox audit logging.

**Prerequisites:**
- Exchange Administrator role
- Audit Administrator role
- Understanding of audit requirements

**What You Need to Provide:**
- Service account email
- Whether to enable or disable bypass

**What the Script Does:**
1. Configures audit bypass association
2. Excludes specified accounts from audit logs
3. Verifies bypass configuration

**Important Notes:**
- Use for service accounts only
- Reduces audit log noise
- May be required for compliance
- Document all bypass accounts`,
    parameters: [
      { id: 'serviceAccountEmail', label: 'Service Account Email', type: 'email', required: true, placeholder: 'serviceaccount@contoso.com' },
      { id: 'enableBypass', label: 'Enable Audit Bypass', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const accountEmail = escapePowerShellString(params.serviceAccountEmail);
      const enable = params.enableBypass !== false;

      return `# Configure Mailbox Audit Bypass
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "${enable ? 'Enabling' : 'Disabling'} audit bypass for: ${accountEmail}" -ForegroundColor Cyan
    
    Set-MailboxAuditBypassAssociation -Identity "${accountEmail}" -AuditBypassEnabled $${enable ? 'true' : 'false'}
    
    Write-Host "[SUCCESS] Audit bypass ${enable ? 'enabled' : 'disabled'} successfully" -ForegroundColor Green
    Write-Host "  Account: ${accountEmail}" -ForegroundColor Gray
    
    $BypassConfig = Get-MailboxAuditBypassAssociation -Identity "${accountEmail}"
    Write-Host "  Current Status: $($BypassConfig.AuditBypassEnabled)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure audit bypass: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-journaling-rule',
    name: 'Configure Journaling Rule',
    category: 'Compliance & eDiscovery',
    isPremium: true,
    description: 'Create journaling rule to send message copies to compliance mailbox',
    instructions: `**How This Task Works:**
This script creates journaling rules to automatically send copies of messages to a designated journal mailbox for compliance archiving.

**Prerequisites:**
- Exchange Administrator role
- Journal mailbox already created
- Understanding of compliance requirements

**What You Need to Provide:**
- Rule name
- Journal recipient email
- Scope (internal, external, or all messages)
- Optional specific user to journal

**What the Script Does:**
1. Creates new journal rule
2. Configures scope and recipients
3. Enables the rule
4. Verifies configuration

**Important Notes:**
- All matching messages sent to journal mailbox
- Can target specific users or all mail
- Journal mailbox fills quickly - monitor size
- Required for many compliance regulations`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Executive Communications Journal' },
      { id: 'journalEmail', label: 'Journal Recipient Email', type: 'email', required: true, placeholder: 'journal@contoso.com' },
      { id: 'scope', label: 'Scope', type: 'select', required: true, options: ['Global', 'Internal', 'External'], defaultValue: 'Global' },
      { id: 'recipientEmail', label: 'Specific Recipient (Optional)', type: 'email', required: false, placeholder: 'Leave blank for all users', description: 'Journal specific user only' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const journalEmail = escapePowerShellString(params.journalEmail);
      const scope = params.scope || 'Global';
      const recipientEmail = params.recipientEmail ? escapePowerShellString(params.recipientEmail) : '';

      return `# Configure Journaling Rule
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Creating journaling rule: ${ruleName}" -ForegroundColor Cyan
    
    $RuleParams = @{
        Name = "${ruleName}"
        JournalEmailAddress = "${journalEmail}"
        Scope = "${scope}"
        Enabled = \\$true
    }
    
    ${recipientEmail ? `$RuleParams.Recipient = "${recipientEmail}"` : ''}
    
    New-JournalRule @RuleParams
    
    Write-Host "[SUCCESS] Journaling rule created successfully" -ForegroundColor Green
    Write-Host "  Rule: ${ruleName}" -ForegroundColor Gray
    Write-Host "  Journal Mailbox: ${journalEmail}" -ForegroundColor Gray
    Write-Host "  Scope: ${scope}" -ForegroundColor Gray
    ${recipientEmail ? `Write-Host "  Target User: ${recipientEmail}" -ForegroundColor Gray` : `Write-Host "  Target: All users" -ForegroundColor Gray`}
    
} catch {
    Write-Error "Failed to create journaling rule: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mail-flow-connector',
    name: 'Configure Mail Flow Connector',
    category: 'Mail Flow & Transport',
    isPremium: true,
    description: 'Create inbound or outbound connector for hybrid or third-party mail flow',
    instructions: `**How This Task Works:**
This script creates mail flow connectors for routing mail to/from on-premises servers, partner organizations, or third-party services.

**Prerequisites:**
- Exchange Administrator role
- Certificate or smart host details
- Understanding of mail routing

**What You Need to Provide:**
- Connector name
- Direction (inbound or outbound)
- Smart host or sender domain
- TLS settings

**What the Script Does:**
1. Creates send or receive connector
2. Configures smart host routing
3. Sets TLS/security requirements
4. Enables the connector

**Important Notes:**
- Required for hybrid Exchange deployments
- Use for third-party email security gateways
- Validate certificates for TLS
- Test mail flow after creation`,
    parameters: [
      { id: 'connectorName', label: 'Connector Name', type: 'text', required: true, placeholder: 'To On-Premises Exchange' },
      { id: 'connectorType', label: 'Connector Type', type: 'select', required: true, options: ['Outbound', 'Inbound'], defaultValue: 'Outbound' },
      { id: 'smartHost', label: 'Smart Host', type: 'text', required: true, placeholder: 'mail.contoso.com', description: 'For outbound connectors' },
      { id: 'requireTLS', label: 'Require TLS', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const connectorName = escapePowerShellString(params.connectorName);
      const connectorType = params.connectorType || 'Outbound';
      const smartHost = escapePowerShellString(params.smartHost);
      const requireTLS = params.requireTLS !== false;

      return `# Configure Mail Flow Connector
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Creating ${connectorType.toLowerCase()} connector: ${connectorName}" -ForegroundColor Cyan
    
    ${connectorType === 'Outbound' ? `New-OutboundConnector -Name "${connectorName}" \`
        -RecipientDomains "*" \`
        -SmartHosts "${smartHost}" \`
        -TlsSettings ${requireTLS ? 'DomainValidation' : 'OpportunisticTLS'} \`
        -Enabled \\$true` : 
    `New-InboundConnector -Name "${connectorName}" \`
        -SenderDomains "*" \`
        -RequireTls $${requireTLS ? 'true' : 'false'} \`
        -Enabled \\$true`}
    
    Write-Host "[SUCCESS] ${connectorType} connector created successfully" -ForegroundColor Green
    Write-Host "  Name: ${connectorName}" -ForegroundColor Gray
    ${connectorType === 'Outbound' ? `Write-Host "  Smart Host: ${smartHost}" -ForegroundColor Gray` : ''}
    Write-Host "  TLS Required: ${requireTLS}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create connector: $_"
    exit 1
}`;
    }
  },

  {
    id: 'bulk-mailbox-permission-audit',
    name: 'Bulk Mailbox Permission Audit Report',
    category: 'Auditing & Compliance',
    isPremium: true,
    description: 'Generate comprehensive report of all mailbox permissions across organization',
    instructions: `**How This Task Works:**
This script generates a comprehensive audit report of all mailbox permissions, including FullAccess, SendAs, and SendOnBehalf delegations.

**Prerequisites:**
- Exchange Administrator role
- View-Only Recipients role
- PowerShell execution rights

**What You Need to Provide:**
- Export path for CSV report
- Optional filter for specific domain or OU

**What the Script Does:**
1. Retrieves all mailboxes
2. Checks FullAccess permissions
3. Checks SendAs permissions  
4. Checks SendOnBehalf permissions
5. Exports detailed CSV report

**Important Notes:**
- Long-running for large organizations
- Export includes all delegation types
- Review for excessive permissions
- Use for compliance audits`,
    parameters: [
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MailboxPermissions.csv' },
      { id: 'domainFilter', label: 'Domain Filter (Optional)', type: 'text', required: false, placeholder: 'contoso.com', description: 'Filter by specific domain' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const domainFilter = params.domainFilter ? escapePowerShellString(params.domainFilter) : '';

      return `# Bulk Mailbox Permission Audit Report
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Starting mailbox permission audit..." -ForegroundColor Cyan
    
    $Results = @()
    ${domainFilter ? `$Mailboxes = Get-EXOMailbox -Filter "PrimarySmtpAddress -like '*@${domainFilter}'" -ResultSize Unlimited` : `$Mailboxes = Get-EXOMailbox -ResultSize Unlimited`}
    
    Write-Host "Found $($Mailboxes.Count) mailboxes to audit" -ForegroundColor Yellow
    
    $Counter = 0
    foreach ($Mailbox in $Mailboxes) {
        $Counter++
        Write-Progress -Activity "Auditing Permissions" -Status "Processing $($Mailbox.DisplayName)" -PercentComplete (($Counter / $Mailboxes.Count) * 100)
        
        # Check FullAccess permissions
        $FullAccess = Get-EXOMailboxPermission -Identity $Mailbox.UserPrincipalName | Where-Object { $_.IsInherited -eq \\$false -and $_.User -notlike "NT AUTHORITY\\SELF" }
        
        # Check SendAs permissions
        $SendAs = Get-EXORecipientPermission -Identity $Mailbox.UserPrincipalName | Where-Object { $_.Trustee -notlike "NT AUTHORITY\\SELF" }
        
        # Check SendOnBehalf
        $SendOnBehalf = $Mailbox.GrantSendOnBehalfTo
        
        # Record FullAccess
        foreach ($Perm in $FullAccess) {
            $Results += [PSCustomObject]@{
                Mailbox = $Mailbox.UserPrincipalName
                DisplayName = $Mailbox.DisplayName
                PermissionType = "FullAccess"
                GrantedTo = $Perm.User
                AccessRights = $Perm.AccessRights -join ';'
            }
        }
        
        # Record SendAs
        foreach ($Perm in $SendAs) {
            $Results += [PSCustomObject]@{
                Mailbox = $Mailbox.UserPrincipalName
                DisplayName = $Mailbox.DisplayName
                PermissionType = "SendAs"
                GrantedTo = $Perm.Trustee
                AccessRights = "SendAs"
            }
        }
        
        # Record SendOnBehalf
        foreach ($Delegate in $SendOnBehalf) {
            $Results += [PSCustomObject]@{
                Mailbox = $Mailbox.UserPrincipalName
                DisplayName = $Mailbox.DisplayName
                PermissionType = "SendOnBehalf"
                GrantedTo = $Delegate
                AccessRights = "SendOnBehalf"
            }
        }
    }
    
    Write-Progress -Activity "Auditing Permissions" -Completed
    
    $Results | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Audit report generated successfully" -ForegroundColor Green
    Write-Host "  Mailboxes Audited: $($Mailboxes.Count)" -ForegroundColor Gray
    Write-Host "  Permissions Found: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Report Location: ${exportPath}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate audit report: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-focused-inbox-policy',
    name: 'Configure Focused Inbox Organization Policy',
    category: 'User Experience',
    isPremium: true,
    description: 'Enable or disable Focused Inbox feature organization-wide or for specific users',
    instructions: `**How This Task Works:**
This script configures the Focused Inbox feature, which separates important emails from others in Outlook.

**Prerequisites:**
- Exchange Administrator role
- Understanding of user experience preferences

**What You Need to Provide:**
- Whether to enable or disable Focused Inbox
- Apply to all users or specific user

**What the Script Does:**
1. Modifies Focused Inbox policy
2. Applies to organization or specific users
3. Verifies configuration

**Important Notes:**
- Users can override organization settings
- Feature available in Outlook 2016+, OWA, mobile
- Helps reduce email noise
- Some users prefer traditional view`,
    parameters: [
      { id: 'enableFocusedInbox', label: 'Enable Focused Inbox', type: 'boolean', required: true, defaultValue: true },
      { id: 'targetUser', label: 'Target User (Optional)', type: 'email', required: false, placeholder: 'Leave blank for organization-wide', description: 'Apply to specific user only' }
    ],
    scriptTemplate: (params) => {
      const enable = params.enableFocusedInbox !== false;
      const targetUser = params.targetUser ? escapePowerShellString(params.targetUser) : '';

      return `# Configure Focused Inbox Policy
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "${enable ? 'Enabling' : 'Disabling'} Focused Inbox${targetUser ? ` for ${targetUser}` : ' organization-wide'}" -ForegroundColor Cyan
    
    ${targetUser ? 
    `Set-FocusedInbox -Identity "${targetUser}" -FocusedInboxOn $${enable ? 'true' : 'false'}
    
    Write-Host "[SUCCESS] Focused Inbox ${enable ? 'enabled' : 'disabled'} for user" -ForegroundColor Green
    Write-Host "  User: ${targetUser}" -ForegroundColor Gray` :
    `$AllMailboxes = Get-EXOMailbox -ResultSize Unlimited
    
    Write-Host "Configuring $($AllMailboxes.Count) mailboxes..." -ForegroundColor Yellow
    
    foreach ($Mailbox in $AllMailboxes) {
        Set-FocusedInbox -Identity $Mailbox.UserPrincipalName -FocusedInboxOn $${enable ? 'true' : 'false'}
    }
    
    Write-Host "[SUCCESS] Focused Inbox ${enable ? 'enabled' : 'disabled'} organization-wide" -ForegroundColor Green
    Write-Host "  Mailboxes Updated: $($AllMailboxes.Count)" -ForegroundColor Gray`}
    
} catch {
    Write-Error "Failed to configure Focused Inbox: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-language-timezone',
    name: 'Configure Mailbox Language and Timezone',
    category: 'User Experience',
    isPremium: true,
    description: 'Set mailbox language, timezone, and regional settings for users',
    instructions: `**How This Task Works:**
This script configures mailbox regional settings including language, timezone, and date/time formats.

**Prerequisites:**
- Exchange Administrator role
- User Administrator role

**What You Need to Provide:**
- User email address
- Language code (e.g., en-US, fr-FR)
- Timezone identifier
- Date/time format preference

**What the Script Does:**
1. Configures mailbox language settings
2. Sets timezone for calendar
3. Sets date/time format preferences
4. Verifies configuration

**Important Notes:**
- Affects Outlook Web App experience
- Important for international users
- Timezone affects meeting times
- Common languages: en-US, en-GB, fr-FR, de-DE, es-ES`,
    parameters: [
      { id: 'userEmail', label: 'User Email Address', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'language', label: 'Language Code', type: 'text', required: true, placeholder: 'en-US', description: 'E.g., en-US, fr-FR, de-DE' },
      { id: 'timezone', label: 'Timezone', type: 'select', required: true, options: ['Pacific Standard Time', 'Mountain Standard Time', 'Central Standard Time', 'Eastern Standard Time', 'GMT Standard Time', 'W. Europe Standard Time', 'Tokyo Standard Time'], defaultValue: 'Pacific Standard Time' },
      { id: 'dateFormat', label: 'Date Format', type: 'select', required: true, options: ['M/d/yyyy', 'd/M/yyyy', 'yyyy-MM-dd'], defaultValue: 'M/d/yyyy' }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const language = escapePowerShellString(params.language);
      const timezone = params.timezone || 'Pacific Standard Time';
      const dateFormat = params.dateFormat || 'M/d/yyyy';

      return `# Configure Mailbox Language and Timezone
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Configuring regional settings for: ${userEmail}" -ForegroundColor Cyan
    
    Set-MailboxRegionalConfiguration -Identity "${userEmail}" \`
        -Language "${language}" \`
        -TimeZone "${timezone}" \`
        -DateFormat "${dateFormat}" \`
        -TimeFormat "h:mm tt"
    
    Write-Host "[SUCCESS] Regional settings configured successfully" -ForegroundColor Green
    Write-Host "  User: ${userEmail}" -ForegroundColor Gray
    Write-Host "  Language: ${language}" -ForegroundColor Gray
    Write-Host "  Timezone: ${timezone}" -ForegroundColor Gray
    Write-Host "  Date Format: ${dateFormat}" -ForegroundColor Gray
    
    $Config = Get-MailboxRegionalConfiguration -Identity "${userEmail}"
    Write-Host "  Verified Language: $($Config.Language)" -ForegroundColor Gray
    Write-Host "  Verified Timezone: $($Config.TimeZone)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure regional settings: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-calendar-processing',
    name: 'Configure Room/Resource Mailbox Calendar Processing',
    category: 'Calendar & Scheduling',
    isPremium: true,
    description: 'Configure automatic calendar processing rules for room and resource mailboxes',
    instructions: `**How This Task Works:**
This script configures calendar processing settings for room and resource mailboxes, controlling automatic booking behavior.

**Prerequisites:**
- Exchange Administrator role
- Room or resource mailbox already created

**What You Need to Provide:**
- Room/resource email address
- Auto-accept/decline settings
- Booking restrictions (duration, advance time)
- Delegate configuration

**What the Script Does:**
1. Configures automatic booking acceptance
2. Sets booking policies and restrictions
3. Configures delegate permissions
4. Sets scheduling options

**Important Notes:**
- Controls automatic meeting acceptance
- Can restrict booking duration and advance time
- Can require specific users to approve
- Prevents double-booking automatically`,
    parameters: [
      { id: 'roomEmail', label: 'Room/Resource Email', type: 'email', required: true, placeholder: 'confroom1@contoso.com' },
      { id: 'autoAccept', label: 'Auto-Accept Meetings', type: 'boolean', required: true, defaultValue: true },
      { id: 'maxDuration', label: 'Max Booking Duration (Minutes)', type: 'number', required: false, placeholder: '480', description: 'Maximum meeting duration' },
      { id: 'bookingWindow', label: 'Booking Window (Days)', type: 'number', required: false, placeholder: '180', description: 'How far in advance can book' },
      { id: 'allowRecurring', label: 'Allow Recurring Meetings', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const roomEmail = escapePowerShellString(params.roomEmail);
      const autoAccept = params.autoAccept !== false;
      const maxDuration = params.maxDuration || 480;
      const bookingWindow = params.bookingWindow || 180;
      const allowRecurring = params.allowRecurring !== false;

      return `# Configure Room/Resource Mailbox Calendar Processing
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Configuring calendar processing for: ${roomEmail}" -ForegroundColor Cyan
    
    Set-CalendarProcessing -Identity "${roomEmail}" \`
        -AutomateProcessing ${autoAccept ? 'AutoAccept' : 'AutoUpdate'} \`
        -DeleteComments \\$false \`
        -AddOrganizerToSubject \\$true \`
        -DeleteSubject \\$false \`
        -MaximumDurationInMinutes ${maxDuration} \`
        -BookingWindowInDays ${bookingWindow} \`
        -AllowRecurringMeetings $${allowRecurring ? 'true' : 'false'} \`
        -EnforceSchedulingHorizon \\$true \`
        -ScheduleOnlyDuringWorkHours \\$false
    
    Write-Host "[SUCCESS] Calendar processing configured successfully" -ForegroundColor Green
    Write-Host "  Room/Resource: ${roomEmail}" -ForegroundColor Gray
    Write-Host "  Auto-Accept: ${autoAccept}" -ForegroundColor Gray
    Write-Host "  Max Duration: ${maxDuration} minutes" -ForegroundColor Gray
    Write-Host "  Booking Window: ${bookingWindow} days" -ForegroundColor Gray
    Write-Host "  Allow Recurring: ${allowRecurring}" -ForegroundColor Gray
    
    $Config = Get-CalendarProcessing -Identity "${roomEmail}"
    Write-Host "  Current Processing: $($Config.AutomateProcessing)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure calendar processing: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-oauth-authentication-policy',
    name: 'Configure OAuth Authentication Policy',
    category: 'Security & Authentication',
    isPremium: true,
    description: 'Configure OAuth authentication policies for modern authentication and application access',
    instructions: `**How This Task Works:**
This script configures OAuth authentication policies to control which applications can access Exchange Online mailboxes.

**Prerequisites:**
- Exchange Administrator role
- Azure AD Administrator role
- Understanding of OAuth and modern authentication

**What You Need to Provide:**
- Policy name
- Allowed/blocked apps or protocols
- Target users or groups

**What the Script Does:**
1. Creates or modifies authentication policy
2. Specifies allowed/blocked client applications
3. Applies policy to users or organization
4. Verifies configuration

**Important Notes:**
- Controls modern authentication access
- Can block legacy protocols per-user
- Required for conditional access scenarios
- Default policy applies to all users unless overridden`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Block Legacy Auth' },
      { id: 'allowBasicAuth', label: 'Allow Basic Authentication', type: 'boolean', required: true, defaultValue: false },
      { id: 'allowOAuthOnly', label: 'Require OAuth/Modern Auth Only', type: 'boolean', required: true, defaultValue: true },
      { id: 'targetUser', label: 'Target User (Optional)', type: 'email', required: false, placeholder: 'Leave blank for organization default' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const allowBasic = params.allowBasicAuth === true;
      const oauthOnly = params.allowOAuthOnly !== false;
      const targetUser = params.targetUser ? escapePowerShellString(params.targetUser) : '';

      return `# Configure OAuth Authentication Policy
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    Write-Host "Configuring authentication policy: ${policyName}" -ForegroundColor Cyan
    
    # Check if policy exists
    $Policy = Get-AuthenticationPolicy -Identity "${policyName}" -ErrorAction SilentlyContinue
    
    $PolicyParams = @{
        AllowBasicAuthActiveSync = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthAutodiscover = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthImap = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthMapi = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthOfflineAddressBook = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthOutlookService = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthPop = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthPowershell = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthReportingWebServices = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthRpc = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthSmtp = $${allowBasic ? 'true' : 'false'}
        AllowBasicAuthWebServices = $${allowBasic ? 'true' : 'false'}
    }
    
    if ($Policy) {
        Set-AuthenticationPolicy -Identity "${policyName}" @PolicyParams
        Write-Host "[SUCCESS] Updated existing authentication policy" -ForegroundColor Green
    } else {
        New-AuthenticationPolicy -Name "${policyName}" @PolicyParams
        Write-Host "[SUCCESS] Created new authentication policy" -ForegroundColor Green
    }
    
    ${targetUser ? `
    # Apply policy to user
    Set-User -Identity "${targetUser}" -AuthenticationPolicy "${policyName}"
    Write-Host "[SUCCESS] Policy applied to user: ${targetUser}" -ForegroundColor Green` : 
    `
    # Set as organization default
    Set-OrganizationConfig -DefaultAuthenticationPolicy "${policyName}"
    Write-Host "[SUCCESS] Policy set as organization default" -ForegroundColor Green`}
    
    Write-Host "  Policy: ${policyName}" -ForegroundColor Gray
    Write-Host "  Basic Auth Allowed: ${allowBasic}" -ForegroundColor Gray
    Write-Host "  OAuth Required: ${oauthOnly}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure authentication policy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-folder-permissions-bulk',
    name: 'Configure Mailbox Folder Permissions in Bulk',
    category: 'Delegation & Permissions',
    isPremium: true,
    description: 'Set calendar or folder permissions for multiple users at once',
    instructions: `**How This Task Works:**
This script configures mailbox folder permissions (typically calendar) for multiple users simultaneously.

**Prerequisites:**
- Exchange Administrator role
- List of target user emails
- Understanding of permission levels

**What You Need to Provide:**
- List of user emails (comma-separated)
- Folder name (Calendar, Inbox, etc.)
- Delegate user email
- Permission level

**What the Script Does:**
1. Processes each user in the list
2. Grants folder permissions to delegate
3. Reports success/failure for each user
4. Provides summary statistics

**Important Notes:**
- Common use: Grant assistant calendar access
- Permission levels: Editor, Reviewer, Author, etc.
- Folder names are localized (Calendar, Calendrier, etc.)
- Use Default for organization-wide calendar sharing`,
    parameters: [
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true, placeholder: 'user1@contoso.com, user2@contoso.com, user3@contoso.com' },
      { id: 'folderName', label: 'Folder Name', type: 'select', required: true, options: ['Calendar', 'Inbox', 'Contacts', 'Tasks'], defaultValue: 'Calendar' },
      { id: 'delegateEmail', label: 'Delegate Email', type: 'email', required: true, placeholder: 'assistant@contoso.com', description: 'User receiving permissions' },
      { id: 'accessRights', label: 'Access Rights', type: 'select', required: true, options: ['Reviewer', 'Editor', 'Author', 'Owner', 'PublishingEditor', 'LimitedDetails'], defaultValue: 'Reviewer' }
    ],
    scriptTemplate: (params) => {
      const userEmailsRaw = (params.userEmails as string).split(',').map((email: string) => email.trim());
      const folderName = params.folderName || 'Calendar';
      const delegateEmail = escapePowerShellString(params.delegateEmail);
      const accessRights = params.accessRights || 'Reviewer';

      return `# Configure Mailbox Folder Permissions in Bulk
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $Users = @(${userEmailsRaw.map(email => `"${escapePowerShellString(email)}"`).join(', ')})
    $Delegate = "${delegateEmail}"
    $FolderName = "${folderName}"
    $Rights = "${accessRights}"
    
    Write-Host "Configuring $FolderName permissions for $($Users.Count) users..." -ForegroundColor Cyan
    Write-Host "Delegate: $Delegate" -ForegroundColor Cyan
    Write-Host "Access Rights: $Rights" -ForegroundColor Cyan
    Write-Host ""
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($User in $Users) {
        try {
            $FolderPath = "$User:\\\\$FolderName"
            
            # Check if permission already exists
            $Existing = Get-MailboxFolderPermission -Identity $FolderPath -User $Delegate -ErrorAction SilentlyContinue
            
            if ($Existing) {
                Set-MailboxFolderPermission -Identity $FolderPath -User $Delegate -AccessRights $Rights
                Write-Host "[SUCCESS] Updated: $User" -ForegroundColor Green
            } else {
                Add-MailboxFolderPermission -Identity $FolderPath -User $Delegate -AccessRights $Rights
                Write-Host "[SUCCESS] Added: $User" -ForegroundColor Green
            }
            
            $SuccessCount++
        } catch {
            Write-Host "[FAILED] Failed: $User - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "Total Users: $($Users.Count)" -ForegroundColor Gray
    Write-Host "Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })
    
} catch {
    Write-Error "Bulk operation failed: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // RETENTION & COMPLIANCE CATEGORY
  // ========================================
  {
    id: 'create-retention-policy',
    name: 'Create Retention Policy',
    category: 'Retention & Compliance',
    isPremium: true,
    description: 'Create retention policy with retention tags for compliance',
    instructions: `**How This Task Works:**
This script creates a retention policy in Exchange Online for automated email retention and deletion based on compliance requirements.

**Prerequisites:**
- Exchange Administrator role
- Understanding of retention requirements
- Compliance policies defined

**What You Need to Provide:**
- Policy name
- Retention tags to include
- Whether to make it default policy

**What the Script Does:**
1. Creates retention policy
2. Links specified retention tags
3. Optionally sets as default policy
4. Reports policy configuration

**Important Notes:**
- Retention policies automate email lifecycle management
- Tags define retention actions (delete, move to archive)
- Default policy applies to all new mailboxes
- Common tags: Default 2 year move to archive, Personal 1 year, Deleted Items 30 days
- Policies don't delete immediately - deletion occurs during managed folder assistant run
- Test with pilot group before organization-wide deployment`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Corporate Retention Policy' },
      { id: 'retentionTags', label: 'Retention Tags (comma-separated)', type: 'textarea', required: true, placeholder: 'Default 2 year move to archive, Personal 1 year delete and allow recovery, Deleted Items 30 days delete and allow recovery', description: 'Names of existing retention tags to include in policy' },
      { id: 'setAsDefault', label: 'Set as Default Policy', type: 'boolean', required: false, defaultValue: false, description: 'Apply to all new mailboxes automatically' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const retentionTagsRaw = (params.retentionTags as string).split(',').map((tag: string) => tag.trim());
      const setAsDefault = params.setAsDefault || false;

      return `# Create Retention Policy
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $PolicyName = "${policyName}"
    $RetentionTags = @(${retentionTagsRaw.map(tag => `"${escapePowerShellString(tag)}"`).join(', ')})
    $SetAsDefault = $${setAsDefault}
    
    Write-Host "Creating retention policy: $PolicyName" -ForegroundColor Cyan
    Write-Host "Retention tags to include:" -ForegroundColor Gray
    $RetentionTags | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    Write-Host ""
    
    # Check if policy already exists
    $Existing = Get-RetentionPolicy -Identity $PolicyName -ErrorAction SilentlyContinue
    
    if ($Existing) {
        Write-Host "[WARNING] Policy already exists: $PolicyName" -ForegroundColor Yellow
        Write-Host "Updating existing policy..." -ForegroundColor Cyan
        
        # Update retention policy links
        Set-RetentionPolicy -Identity $PolicyName -RetentionPolicyTagLinks $RetentionTags
        Write-Host "[SUCCESS] Updated retention policy tags" -ForegroundColor Green
    } else {
        # Create new retention policy
        New-RetentionPolicy -Name $PolicyName -RetentionPolicyTagLinks $RetentionTags
        Write-Host "[SUCCESS] Created retention policy: $PolicyName" -ForegroundColor Green
    }
    
    # Set as default if requested
    if ($SetAsDefault) {
        Set-RetentionPolicy -Identity $PolicyName -IsDefault $true
        Write-Host "[SUCCESS] Set as default retention policy" -ForegroundColor Green
        Write-Host "  All new mailboxes will receive this policy automatically" -ForegroundColor Gray
    }
    
    # Display policy details
    $Policy = Get-RetentionPolicy -Identity $PolicyName
    Write-Host ""
    Write-Host "================= POLICY DETAILS =================" -ForegroundColor Cyan
    Write-Host "Policy Name: $($Policy.Name)" -ForegroundColor Gray
    Write-Host "Is Default: $($Policy.IsDefault)" -ForegroundColor Gray
    Write-Host "Retention Tags: $($Policy.RetentionPolicyTagLinks.Count)" -ForegroundColor Gray
    
    $Policy.RetentionPolicyTagLinks | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to create retention policy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'apply-retention-policy-mailboxes',
    name: 'Apply Retention Policy to Mailboxes',
    category: 'Retention & Compliance',
    isPremium: true,
    description: 'Apply retention policy to single or multiple mailboxes',
    instructions: `**How This Task Works:**
This script assigns a retention policy to mailboxes for automated email retention management.

**Prerequisites:**
- Exchange Administrator role
- Retention policy already created
- Target mailboxes exist

**What You Need to Provide:**
- Retention policy name
- Target user emails (single or multiple)

**What the Script Does:**
1. Validates retention policy exists
2. Applies policy to each mailbox
3. Reports success/failure per user
4. Provides summary statistics

**Important Notes:**
- Policy changes take effect during next managed folder assistant run
- Users see retention tags in Outlook/OWA
- Existing items are processed based on policy
- Use Get-RetentionPolicy to see available policies
- Can apply to all mailboxes using Get-EXOMailbox | Set-Mailbox pattern
- Policy assignment is immediate but processing is scheduled`,
    parameters: [
      { id: 'policyName', label: 'Retention Policy Name', type: 'text', required: true, placeholder: 'Corporate Retention Policy' },
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true, placeholder: 'user1@contoso.com, user2@contoso.com, user3@contoso.com' },
      { id: 'forceAssistant', label: 'Force Managed Folder Assistant', type: 'boolean', required: false, defaultValue: false, description: 'Immediately run retention processing (may take time)' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const userEmailsRaw = (params.userEmails as string).split(',').map((email: string) => email.trim());
      const forceAssistant = params.forceAssistant || false;

      return `# Apply Retention Policy to Mailboxes
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $PolicyName = "${policyName}"
    $Users = @(${userEmailsRaw.map(email => `"${escapePowerShellString(email)}"`).join(', ')})
    $ForceAssistant = $${forceAssistant}
    
    Write-Host "Applying retention policy: $PolicyName" -ForegroundColor Cyan
    Write-Host "Target mailboxes: $($Users.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify policy exists
    $Policy = Get-RetentionPolicy -Identity $PolicyName -ErrorAction SilentlyContinue
    if (-not $Policy) {
        Write-Error "Retention policy not found: $PolicyName"
        Write-Host "Available policies:" -ForegroundColor Yellow
        Get-RetentionPolicy | Select-Object Name, IsDefault | Format-Table -AutoSize
        exit 1
    }
    
    Write-Host "[SUCCESS] Verified retention policy exists" -ForegroundColor Green
    Write-Host ""
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($User in $Users) {
        try {
            Set-Mailbox -Identity $User -RetentionPolicy $PolicyName -ErrorAction Stop
            Write-Host "[SUCCESS] Applied to: $User" -ForegroundColor Green
            
            # Force managed folder assistant if requested
            if ($ForceAssistant) {
                Start-ManagedFolderAssistant -Identity $User -ErrorAction SilentlyContinue
                Write-Host "  ↳ Triggered managed folder assistant" -ForegroundColor Gray
            }
            
            $SuccessCount++
        } catch {
            Write-Host "[FAILED] Failed: $User - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "Policy: $PolicyName" -ForegroundColor Gray
    Write-Host "Total Mailboxes: $($Users.Count)" -ForegroundColor Gray
    Write-Host "Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })
    
    if (-not $ForceAssistant) {
        Write-Host ""
        Write-Host "Note: Policy will be processed during next managed folder assistant run" -ForegroundColor Yellow
        Write-Host "      To force immediate processing, run Start-ManagedFolderAssistant" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to apply retention policy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-retention-tag',
    name: 'Create Retention Tag',
    category: 'Retention & Compliance',
    isPremium: true,
    description: 'Create retention tag with custom retention action and age limit',
    instructions: `**How This Task Works:**
This script creates a retention policy tag that defines how and when to retain or delete email items.

**Prerequisites:**
- Exchange Administrator role
- Understanding of retention actions
- Compliance requirements documented

**What You Need to Provide:**
- Tag name and type
- Retention action (Delete, MoveToArchive, etc.)
- Retention age limit in days
- Retention enabled status

**What the Script Does:**
1. Creates retention tag with specified settings
2. Configures retention action and age limit
3. Makes tag available for retention policies
4. Reports tag configuration

**Important Notes:**
- Tag Types:
  * Default: Applied to all items without specific tag
  * Personal: Users can apply manually in Outlook
  * All: Applies to entire mailbox
  * Inbox, SentItems, DeletedItems, etc.: Folder-specific
- Retention Actions:
  * Delete: Permanently deletes items
  * DeleteAndAllowRecovery: Moves to Recoverable Items
  * MoveToArchive: Moves to archive mailbox
  * PermanentlyDelete: Cannot be recovered
- Age limit determines when action triggers
- Common patterns: 7 day deleted items, 30 day junk, 2 year archive`,
    parameters: [
      { id: 'tagName', label: 'Tag Name', type: 'text', required: true, placeholder: 'Delete 30 Days', description: 'Descriptive name for the tag' },
      { id: 'tagType', label: 'Tag Type', type: 'select', required: true, options: ['Default', 'Personal', 'All', 'Inbox', 'DeletedItems', 'SentItems', 'JunkEmail', 'Calendar', 'Contacts', 'Tasks', 'Notes'], defaultValue: 'Default', description: 'Scope where tag applies' },
      { id: 'retentionAction', label: 'Retention Action', type: 'select', required: true, options: ['DeleteAndAllowRecovery', 'PermanentlyDelete', 'MoveToArchive', 'Delete', 'MarkAsPastRetentionLimit'], defaultValue: 'DeleteAndAllowRecovery' },
      { id: 'ageLimitDays', label: 'Age Limit (Days)', type: 'number', required: true, placeholder: '30', description: 'Number of days before action triggers' },
      { id: 'retentionEnabled', label: 'Retention Enabled', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const tagName = escapePowerShellString(params.tagName);
      const tagType = params.tagType || 'Default';
      const retentionAction = params.retentionAction || 'DeleteAndAllowRecovery';
      const ageLimitDays = params.ageLimitDays || 30;
      const retentionEnabled = params.retentionEnabled !== false;

      return `# Create Retention Tag
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $TagName = "${tagName}"
    $Type = "${tagType}"
    $Action = "${retentionAction}"
    $AgeLimitDays = ${ageLimitDays}
    $Enabled = $${retentionEnabled}
    
    Write-Host "Creating retention tag..." -ForegroundColor Cyan
    Write-Host "  Name: $TagName" -ForegroundColor Gray
    Write-Host "  Type: $Type" -ForegroundColor Gray
    Write-Host "  Action: $Action" -ForegroundColor Gray
    Write-Host "  Age Limit: $AgeLimitDays days" -ForegroundColor Gray
    Write-Host ""
    
    # Check if tag already exists
    $Existing = Get-RetentionPolicyTag -Identity $TagName -ErrorAction SilentlyContinue
    
    if ($Existing) {
        Write-Host "[WARNING] Retention tag already exists: $TagName" -ForegroundColor Yellow
        Write-Host "Updating existing tag..." -ForegroundColor Cyan
        
        Set-RetentionPolicyTag -Identity $TagName \`
            -RetentionAction $Action \`
            -AgeLimitForRetention $AgeLimitDays \`
            -RetentionEnabled $Enabled
        
        Write-Host "[SUCCESS] Updated retention tag" -ForegroundColor Green
    } else {
        # Create new retention tag
        New-RetentionPolicyTag -Name $TagName \`
            -Type $Type \`
            -RetentionAction $Action \`
            -AgeLimitForRetention $AgeLimitDays \`
            -RetentionEnabled $Enabled
        
        Write-Host "[SUCCESS] Created retention tag: $TagName" -ForegroundColor Green
    }
    
    # Display tag details
    $Tag = Get-RetentionPolicyTag -Identity $TagName
    
    Write-Host ""
    Write-Host "================= TAG DETAILS =================" -ForegroundColor Cyan
    Write-Host "Tag Name: $($Tag.Name)" -ForegroundColor Gray
    Write-Host "Type: $($Tag.Type)" -ForegroundColor Gray
    Write-Host "Retention Action: $($Tag.RetentionAction)" -ForegroundColor Gray
    Write-Host "Age Limit: $($Tag.AgeLimitForRetention) days" -ForegroundColor Gray
    Write-Host "Retention Enabled: $($Tag.RetentionEnabled)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Add this tag to a retention policy using New-RetentionPolicy or Set-RetentionPolicy" -ForegroundColor Gray
    Write-Host "2. Apply the retention policy to mailboxes" -ForegroundColor Gray
    Write-Host "3. Users will see this tag in Outlook/OWA if Type is 'Personal'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create retention tag: $_"
    exit 1
}`;
    }
  },

  {
    id: 'enable-litigation-hold-with-duration',
    name: 'Enable Litigation Hold with Duration',
    category: 'Retention & Compliance',
    isPremium: true,
    description: 'Place mailbox on litigation hold with unlimited or time-based retention',
    instructions: `**How This Task Works:**
This script enables litigation hold on mailboxes to preserve all content for legal/compliance purposes, preventing deletion even by users.

**Prerequisites:**
- Exchange Administrator role
- Exchange Online Plan 2 license (or E3/E5)
- Legal or compliance requirement documented

**What You Need to Provide:**
- Target user emails
- Hold duration (unlimited or days)
- Optional hold comment
- Optional owner notification

**What the Script Does:**
1. Verifies mailbox has required license
2. Enables litigation hold
3. Sets hold duration and comment
4. Optionally notifies mailbox owner
5. Reports hold status

**Important Notes:**
- Litigation hold preserves ALL mailbox content forever (or until duration expires)
- Users cannot permanently delete items while on hold
- Items remain searchable for eDiscovery
- Hold applies to main mailbox and archive
- Requires Exchange Online Plan 2 or E3/E5 license
- Hold comment visible to users in Outlook/OWA
- Duration in days (leave blank for unlimited)
- Use for legal holds, investigations, compliance audits
- Consider In-Place Hold for more granular control`,
    parameters: [
      { id: 'userEmails', label: 'User Emails (comma-separated)', type: 'textarea', required: true, placeholder: 'user1@contoso.com, user2@contoso.com' },
      { id: 'holdDuration', label: 'Hold Duration (Days)', type: 'number', required: false, placeholder: 'Leave blank for unlimited', description: 'Number of days to retain, blank = unlimited' },
      { id: 'holdComment', label: 'Hold Comment', type: 'textarea', required: false, placeholder: 'This mailbox is on litigation hold per legal case #2024-001. Contact legal@contoso.com for questions.', description: 'Message displayed to mailbox owner' },
      { id: 'notifyOwner', label: 'Notify Mailbox Owner', type: 'boolean', required: false, defaultValue: true, description: 'Send email notification to user' }
    ],
    scriptTemplate: (params) => {
      const userEmailsRaw = (params.userEmails as string).split(',').map((email: string) => email.trim());
      const holdDuration = params.holdDuration || null;
      const holdComment = params.holdComment ? escapePowerShellString(params.holdComment) : '';
      const notifyOwner = params.notifyOwner !== false;

      return `# Enable Litigation Hold with Duration
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $Users = @(${userEmailsRaw.map(email => `"${escapePowerShellString(email)}"`).join(', ')})
    ${holdDuration ? `$HoldDuration = ${holdDuration}` : '$HoldDuration = $null'}
    $HoldComment = "${holdComment}"
    $NotifyOwner = $${notifyOwner}
    
    Write-Host "Enabling litigation hold for $($Users.Count) mailboxes..." -ForegroundColor Cyan
    ${holdDuration ? `Write-Host "Hold Duration: $HoldDuration days" -ForegroundColor Gray` : `Write-Host "Hold Duration: Unlimited" -ForegroundColor Gray`}
    Write-Host ""
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($User in $Users) {
        try {
            # Get mailbox details
            $Mailbox = Get-EXOMailbox -Identity $User -Properties LitigationHoldEnabled, LitigationHoldDuration, LitigationHoldDate -ErrorAction Stop
            
            if ($Mailbox.LitigationHoldEnabled) {
                Write-Host "[WARNING] $User - Already on litigation hold" -ForegroundColor Yellow
                Write-Host "  Existing hold date: $($Mailbox.LitigationHoldDate)" -ForegroundColor Gray
                ${holdDuration ? `Write-Host "  Updating hold duration to $HoldDuration days..." -ForegroundColor Cyan` : ''}
            } else {
                Write-Host "Enabling litigation hold: $User" -ForegroundColor Cyan
            }
            
            # Build command parameters
            $HoldParams = @{
                Identity = $User
                LitigationHoldEnabled = $true
            }
            
            if ($HoldDuration) {
                $HoldParams.LitigationHoldDuration = $HoldDuration
            } else {
                $HoldParams.LitigationHoldDuration = 'Unlimited'
            }
            
            if ($HoldComment) {
                $HoldParams.LitigationHoldOwner = $HoldComment
            }
            
            # Enable litigation hold
            Set-Mailbox @HoldParams
            
            Write-Host "[SUCCESS] Litigation hold enabled: $User" -ForegroundColor Green
            ${holdDuration ? `Write-Host "  Duration: $HoldDuration days" -ForegroundColor Gray` : `Write-Host "  Duration: Unlimited" -ForegroundColor Gray`}
            
            # Send notification if requested
            if ($NotifyOwner -and $HoldComment) {
                Write-Host "  ↳ Owner will see hold comment in Outlook/OWA" -ForegroundColor Gray
            }
            
            $SuccessCount++
        } catch {
            Write-Host "[FAILED] Failed: $User - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "Total Mailboxes: $($Users.Count)" -ForegroundColor Gray
    Write-Host "Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })
    ${holdDuration ? `Write-Host "Hold Duration: $HoldDuration days" -ForegroundColor Gray` : `Write-Host "Hold Duration: Unlimited" -ForegroundColor Gray`}
    
    Write-Host ""
    Write-Host "Important Notes:" -ForegroundColor Yellow
    Write-Host "- Items in mailbox cannot be permanently deleted" -ForegroundColor Gray
    Write-Host "- Hold applies to main mailbox and archive" -ForegroundColor Gray
    Write-Host "- All content preserved for eDiscovery searches" -ForegroundColor Gray
    Write-Host "- Users may see notification in Outlook/OWA" -ForegroundColor Gray
    ${holdDuration ? `Write-Host "- Hold will automatically release after $HoldDuration days" -ForegroundColor Gray` : `Write-Host "- Hold remains until manually disabled" -ForegroundColor Gray`}
    
} catch {
    Write-Error "Failed to enable litigation hold: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // ADDITIONAL MAIL FLOW & SECURITY TASKS
  // ========================================
  {
    id: 'manage-quarantine-messages',
    name: 'Manage Quarantine Messages',
    category: 'Mail Flow',
    isPremium: true,
    description: 'Review, release, or delete quarantined messages from Exchange Online Protection',
    instructions: `**How This Task Works:**
This script helps administrators manage messages held in quarantine by Exchange Online Protection (EOP), allowing review, release, or deletion of suspicious emails.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Security Administrator or Quarantine Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Action (List, Release, Delete)
- Optional: Sender email filter
- Optional: Subject filter
- Optional: Date range
- For Release/Delete: Message IDs

**What the Script Does:**
1. Connects to Exchange Online
2. Queries quarantine based on filters
3. Lists quarantined messages with details
4. Releases or deletes specified messages
5. Reports action results

**Important Notes:**
- Quarantine holds spam, phishing, malware, and policy-blocked emails
- Released messages are delivered to original recipients
- Deleting removes messages permanently
- Messages auto-expire after 30 days (default)
- Use -AllowSender to whitelist sender when releasing
- Review carefully before releasing potential threats
- Can filter by quarantine type: Spam, Phish, Malware, HighConfPhish`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List', 'Release', 'Delete'], defaultValue: 'List' },
      { id: 'senderFilter', label: 'Sender Email Filter', type: 'email', required: false, placeholder: 'sender@external.com', description: 'Filter by sender address' },
      { id: 'subjectFilter', label: 'Subject Contains', type: 'text', required: false, placeholder: 'Invoice', description: 'Filter by subject keyword' },
      { id: 'quarantineType', label: 'Quarantine Type', type: 'select', required: false, options: ['All', 'Spam', 'Phish', 'HighConfPhish', 'Malware', 'TransportRule'], defaultValue: 'All' },
      { id: 'daysBack', label: 'Days Back to Search', type: 'number', required: false, defaultValue: 7, placeholder: '7' },
      { id: 'messageIds', label: 'Message IDs (for Release/Delete)', type: 'textarea', required: false, placeholder: 'msg-id-1, msg-id-2', description: 'Comma-separated message IDs from List action' },
      { id: 'allowSender', label: 'Allow Sender (on Release)', type: 'boolean', required: false, defaultValue: false, description: 'Add sender to allowed list when releasing' }
    ],
    scriptTemplate: (params) => {
      const action = params.action || 'List';
      const senderFilter = params.senderFilter ? escapePowerShellString(params.senderFilter) : '';
      const subjectFilter = params.subjectFilter ? escapePowerShellString(params.subjectFilter) : '';
      const quarantineType = params.quarantineType || 'All';
      const daysBack = params.daysBack || 7;
      const messageIds = params.messageIds ? escapePowerShellString(params.messageIds) : '';
      const allowSender = toPowerShellBoolean(params.allowSender ?? false);

      return `# Manage Quarantine Messages
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $Action = "${action}"
    $DaysBack = ${daysBack}
    $StartDate = (Get-Date).AddDays(-$DaysBack)
    $EndDate = Get-Date
    ${senderFilter ? `$SenderFilter = "${senderFilter}"` : '$SenderFilter = $null'}
    ${subjectFilter ? `$SubjectFilter = "${subjectFilter}"` : '$SubjectFilter = $null'}
    $QuarantineType = "${quarantineType}"
    ${messageIds ? `$MessageIds = "${messageIds}" -split ',' | ForEach-Object { $_.Trim() }` : '$MessageIds = @()'}
    $AllowSender = ${allowSender}
    
    Write-Host "Quarantine Management - Action: $Action" -ForegroundColor Cyan
    Write-Host "Date Range: $($StartDate.ToString('yyyy-MM-dd')) to $($EndDate.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    Write-Host ""
    
    if ($Action -eq "List") {
        # Build filter parameters
        $FilterParams = @{
            StartReceivedDate = $StartDate
            EndReceivedDate = $EndDate
            PageSize = 100
        }
        
        if ($QuarantineType -ne "All") {
            $FilterParams.QuarantineTypes = $QuarantineType
        }
        
        if ($SenderFilter) {
            $FilterParams.SenderAddress = $SenderFilter
        }
        
        # Get quarantine messages
        $Messages = Get-QuarantineMessage @FilterParams
        
        if ($SubjectFilter) {
            $Messages = $Messages | Where-Object { $_.Subject -like "*$SubjectFilter*" }
        }
        
        if ($Messages.Count -eq 0) {
            Write-Host "No quarantined messages found matching criteria." -ForegroundColor Yellow
        } else {
            Write-Host "Found $($Messages.Count) quarantined messages:" -ForegroundColor Green
            Write-Host ""
            
            $Messages | ForEach-Object {
                Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
                Write-Host "Message ID: $($_.Identity)" -ForegroundColor White
                Write-Host "  Subject: $($_.Subject)" -ForegroundColor Gray
                Write-Host "  Sender: $($_.SenderAddress)" -ForegroundColor Gray
                Write-Host "  Recipient: $($_.RecipientAddress)" -ForegroundColor Gray
                Write-Host "  Received: $($_.ReceivedTime)" -ForegroundColor Gray
                Write-Host "  Type: $($_.QuarantineTypes)" -ForegroundColor Gray
                Write-Host "  Expires: $($_.Expires)" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
            Write-Host "To release or delete, copy Message ID and run with Release/Delete action" -ForegroundColor Cyan
        }
        
    } elseif ($Action -eq "Release") {
        if ($MessageIds.Count -eq 0) {
            Write-Error "No Message IDs provided. Run List action first to get IDs."
            exit 1
        }
        
        Write-Host "Releasing $($MessageIds.Count) messages..." -ForegroundColor Cyan
        
        $SuccessCount = 0
        foreach ($MsgId in $MessageIds) {
            try {
                $ReleaseParams = @{
                    Identity = $MsgId
                    ReleaseToAll = $true
                }
                
                if ($AllowSender) {
                    $ReleaseParams.AllowSender = $true
                    Write-Host "  ↳ Sender will be added to allowed list" -ForegroundColor Gray
                }
                
                Release-QuarantineMessage @ReleaseParams
                Write-Host "[SUCCESS] Released: $MsgId" -ForegroundColor Green
                $SuccessCount++
            } catch {
                Write-Host "[FAILED] Failed to release $MsgId : $_" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "Released $SuccessCount of $($MessageIds.Count) messages" -ForegroundColor Green
        
    } elseif ($Action -eq "Delete") {
        if ($MessageIds.Count -eq 0) {
            Write-Error "No Message IDs provided. Run List action first to get IDs."
            exit 1
        }
        
        Write-Host "Deleting $($MessageIds.Count) messages..." -ForegroundColor Cyan
        
        $SuccessCount = 0
        foreach ($MsgId in $MessageIds) {
            try {
                Delete-QuarantineMessage -Identity $MsgId -Confirm:\$false
                Write-Host "[SUCCESS] Deleted: $MsgId" -ForegroundColor Green
                $SuccessCount++
            } catch {
                Write-Host "[FAILED] Failed to delete $MsgId : $_" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "Deleted $SuccessCount of $($MessageIds.Count) messages" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to manage quarantine: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-dkim-dmarc',
    name: 'Configure DKIM and DMARC Settings',
    category: 'Security & Compliance',
    isPremium: true,
    description: 'Enable DKIM signing and configure DMARC policies for email authentication',
    instructions: `**How This Task Works:**
This script configures DKIM (DomainKeys Identified Mail) signing and helps set up DMARC (Domain-based Message Authentication) for your domains to improve email deliverability and prevent spoofing.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator role
- DNS access for DKIM CNAME records
- Domain verified in Microsoft 365

**What You Need to Provide:**
- Domain name
- Action (Enable DKIM, Get DKIM Status, Get DMARC Setup Info)
- DMARC policy preference

**What the Script Does:**
1. Connects to Exchange Online
2. Creates/enables DKIM signing configuration
3. Retrieves CNAME records for DNS setup
4. Provides DMARC TXT record for DNS
5. Verifies configuration status

**Important Notes:**
- DKIM signs outgoing emails cryptographically
- DMARC tells receivers how to handle failed authentication
- Add DKIM CNAME records to DNS before enabling
- DMARC requires SPF and DKIM to be configured first
- DNS propagation takes 24-48 hours
- Start with DMARC policy p=none for monitoring
- Gradually move to p=quarantine then p=reject
- DKIM key rotation happens automatically`,
    parameters: [
      { id: 'domain', label: 'Domain Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['GetDKIMStatus', 'EnableDKIM', 'DisableDKIM', 'GetDMARCInfo'], defaultValue: 'GetDKIMStatus' },
      { id: 'dmarcPolicy', label: 'DMARC Policy (for GetDMARCInfo)', type: 'select', required: false, options: ['none', 'quarantine', 'reject'], defaultValue: 'none', description: 'Recommended: Start with none for monitoring' },
      { id: 'dmarcRua', label: 'DMARC Report Email (RUA)', type: 'email', required: false, placeholder: 'dmarc-reports@contoso.com', description: 'Email to receive aggregate reports' }
    ],
    scriptTemplate: (params) => {
      const domain = escapePowerShellString(params.domain);
      const action = params.action || 'GetDKIMStatus';
      const dmarcPolicy = params.dmarcPolicy || 'none';
      const dmarcRua = params.dmarcRua ? escapePowerShellString(params.dmarcRua) : '';

      return `# Configure DKIM and DMARC Settings
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $Domain = "${domain}"
    $Action = "${action}"
    $DMARCPolicy = "${dmarcPolicy}"
    ${dmarcRua ? `$DMARCRua = "${dmarcRua}"` : '$DMARCRua = $null'}
    
    Write-Host "DKIM/DMARC Configuration for: $Domain" -ForegroundColor Cyan
    Write-Host "Action: $Action" -ForegroundColor Gray
    Write-Host ""
    
    switch ($Action) {
        "GetDKIMStatus" {
            Write-Host "Checking DKIM status..." -ForegroundColor Cyan
            
            $DkimConfig = Get-DkimSigningConfig -Identity $Domain -ErrorAction SilentlyContinue
            
            if (-not $DkimConfig) {
                Write-Host "[WARNING] DKIM not configured for $Domain" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "To enable DKIM:" -ForegroundColor Cyan
                Write-Host "1. Run this script with 'EnableDKIM' action to create config" -ForegroundColor Gray
                Write-Host "2. Add the CNAME records to your DNS" -ForegroundColor Gray
                Write-Host "3. Run 'EnableDKIM' again to activate signing" -ForegroundColor Gray
            } else {
                Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
                Write-Host "DKIM Configuration:" -ForegroundColor Green
                Write-Host "  Domain: $($DkimConfig.Domain)" -ForegroundColor Gray
                Write-Host "  Enabled: $($DkimConfig.Enabled)" -ForegroundColor $(if ($DkimConfig.Enabled) { 'Green' } else { 'Yellow' })
                Write-Host "  Status: $($DkimConfig.Status)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "CNAME Records Required:" -ForegroundColor Cyan
                Write-Host "  Selector1: selector1._domainkey.$Domain" -ForegroundColor Gray
                Write-Host "    → $($DkimConfig.Selector1CNAME)" -ForegroundColor White
                Write-Host "  Selector2: selector2._domainkey.$Domain" -ForegroundColor Gray
                Write-Host "    → $($DkimConfig.Selector2CNAME)" -ForegroundColor White
                Write-Host ""
                
                if ($DkimConfig.Enabled) {
                    Write-Host "[SUCCESS] DKIM signing is ACTIVE" -ForegroundColor Green
                } else {
                    Write-Host "[WARNING] DKIM is configured but NOT enabled" -ForegroundColor Yellow
                    Write-Host "  Add CNAME records above to DNS, wait for propagation, then enable" -ForegroundColor Gray
                }
            }
        }
        
        "EnableDKIM" {
            Write-Host "Enabling DKIM signing..." -ForegroundColor Cyan
            
            # Check if config exists
            $DkimConfig = Get-DkimSigningConfig -Identity $Domain -ErrorAction SilentlyContinue
            
            if (-not $DkimConfig) {
                Write-Host "Creating new DKIM configuration..." -ForegroundColor Cyan
                $DkimConfig = New-DkimSigningConfig -DomainName $Domain -Enabled \$false
                Write-Host "[SUCCESS] DKIM configuration created" -ForegroundColor Green
                Write-Host ""
                Write-Host "CNAME Records to add to DNS:" -ForegroundColor Yellow
                Write-Host "  Selector1: selector1._domainkey.$Domain" -ForegroundColor Gray
                Write-Host "    → $($DkimConfig.Selector1CNAME)" -ForegroundColor White
                Write-Host "  Selector2: selector2._domainkey.$Domain" -ForegroundColor Gray
                Write-Host "    → $($DkimConfig.Selector2CNAME)" -ForegroundColor White
                Write-Host ""
                Write-Host "[WARNING] Add these CNAME records to DNS, wait 24-48 hours, then run EnableDKIM again" -ForegroundColor Yellow
            } else {
                try {
                    Set-DkimSigningConfig -Identity $Domain -Enabled \$true
                    Write-Host "[SUCCESS] DKIM signing enabled for $Domain" -ForegroundColor Green
                } catch {
                    Write-Host "[FAILED] Failed to enable DKIM" -ForegroundColor Red
                    Write-Host "  Ensure CNAME records are in DNS and propagated" -ForegroundColor Yellow
                    Write-Host "  Error: $_" -ForegroundColor Red
                }
            }
        }
        
        "DisableDKIM" {
            Write-Host "Disabling DKIM signing..." -ForegroundColor Cyan
            Set-DkimSigningConfig -Identity $Domain -Enabled \$false
            Write-Host "[SUCCESS] DKIM signing disabled for $Domain" -ForegroundColor Green
            Write-Host "[WARNING] Outgoing emails will no longer be DKIM signed" -ForegroundColor Yellow
        }
        
        "GetDMARCInfo" {
            Write-Host "DMARC Setup Information" -ForegroundColor Cyan
            Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
            Write-Host ""
            Write-Host "DMARC requires SPF and DKIM to be configured first!" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Add this TXT record to your DNS:" -ForegroundColor Cyan
            Write-Host "  Host: _dmarc.$Domain" -ForegroundColor Gray
            Write-Host "  Type: TXT" -ForegroundColor Gray
            
            $DmarcRecord = "v=DMARC1; p=$DMARCPolicy"
            if ($DMARCRua) {
                $DmarcRecord += "; rua=mailto:$DMARCRua"
            }
            $DmarcRecord += "; pct=100; adkim=s; aspf=s"
            
            Write-Host "  Value: $DmarcRecord" -ForegroundColor White
            Write-Host ""
            Write-Host "Policy Explanation:" -ForegroundColor Cyan
            Write-Host "  p=none      → Monitor only, don't take action (start here)" -ForegroundColor Gray
            Write-Host "  p=quarantine → Send failing emails to spam" -ForegroundColor Gray
            Write-Host "  p=reject    → Block failing emails completely" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Recommended progression:" -ForegroundColor Cyan
            Write-Host "  1. Start with p=none to monitor" -ForegroundColor Gray
            Write-Host "  2. Review reports for 2-4 weeks" -ForegroundColor Gray
            Write-Host "  3. Move to p=quarantine" -ForegroundColor Gray
            Write-Host "  4. After confidence, move to p=reject" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Failed to configure DKIM/DMARC: $_"
    exit 1
}`;
    }
  },

  {
    id: 'message-trace-report',
    name: 'Generate Message Trace Report',
    category: 'Reporting & Auditing',
    isPremium: true,
    description: 'Run detailed message trace to track email delivery status and troubleshoot mail flow issues',
    instructions: `**How This Task Works:**
This script performs message tracing to track the delivery status of emails through Exchange Online, helping troubleshoot delivery issues and audit mail flow.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Exchange Administrator or Compliance Management role
- Connected to Exchange Online

**What You Need to Provide:**
- Date range (up to 10 days for real-time, up to 90 days for historical)
- Optional: Sender/recipient filters
- Optional: Subject filter
- Optional: Delivery status filter

**What the Script Does:**
1. Connects to Exchange Online
2. Queries message trace data
3. Filters by specified criteria
4. Displays delivery status and details
5. Optionally exports to CSV

**Important Notes:**
- Real-time trace: Last 10 days, results within seconds
- Historical trace: 10-90 days, may take hours to complete
- Message trace data retained for 90 days
- Useful for delivery failures, delays, spam/phishing analysis
- Status types: Delivered, Failed, Pending, Expanded, Quarantined
- Large date ranges or no filters may return many results
- Export to CSV for large result sets`,
    parameters: [
      { id: 'startDate', label: 'Start Date (yyyy-MM-dd)', type: 'text', required: true, placeholder: '2024-01-01', description: 'Start of date range' },
      { id: 'endDate', label: 'End Date (yyyy-MM-dd)', type: 'text', required: true, placeholder: '2024-01-07', description: 'End of date range' },
      { id: 'senderAddress', label: 'Sender Email', type: 'email', required: false, placeholder: 'sender@contoso.com' },
      { id: 'recipientAddress', label: 'Recipient Email', type: 'email', required: false, placeholder: 'recipient@external.com' },
      { id: 'subjectFilter', label: 'Subject Contains', type: 'text', required: false, placeholder: 'Important' },
      { id: 'status', label: 'Delivery Status', type: 'select', required: false, options: ['All', 'Delivered', 'Failed', 'Pending', 'Expanded', 'Quarantined', 'FilteredAsSpam'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export to CSV Path', type: 'path', required: false, placeholder: 'C:\\Reports\\MessageTrace.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const senderAddress = params.senderAddress ? escapePowerShellString(params.senderAddress) : '';
      const recipientAddress = params.recipientAddress ? escapePowerShellString(params.recipientAddress) : '';
      const subjectFilter = params.subjectFilter ? escapePowerShellString(params.subjectFilter) : '';
      const status = params.status || 'All';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# Generate Message Trace Report
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $StartDate = [DateTime]"${startDate}"
    $EndDate = [DateTime]"${endDate}"
    ${senderAddress ? `$SenderAddress = "${senderAddress}"` : '$SenderAddress = $null'}
    ${recipientAddress ? `$RecipientAddress = "${recipientAddress}"` : '$RecipientAddress = $null'}
    ${subjectFilter ? `$SubjectFilter = "${subjectFilter}"` : '$SubjectFilter = $null'}
    $Status = "${status}"
    ${exportPath ? `$ExportPath = "${exportPath}"` : '$ExportPath = $null'}
    
    Write-Host "Message Trace Report" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "Date Range: $($StartDate.ToString('yyyy-MM-dd')) to $($EndDate.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    ${senderAddress ? `Write-Host "Sender: $SenderAddress" -ForegroundColor Gray` : ''}
    ${recipientAddress ? `Write-Host "Recipient: $RecipientAddress" -ForegroundColor Gray` : ''}
    ${subjectFilter ? `Write-Host "Subject Contains: $SubjectFilter" -ForegroundColor Gray` : ''}
    if ($Status -ne "All") { Write-Host "Status Filter: $Status" -ForegroundColor Gray }
    Write-Host ""
    
    # Check if within real-time range (10 days)
    $DaysDiff = ($EndDate - $StartDate).Days
    if ($DaysDiff -gt 10) {
        Write-Host "[WARNING] Date range > 10 days. Using historical message trace (may take time)..." -ForegroundColor Yellow
    }
    
    # Build trace parameters
    $TraceParams = @{
        StartDate = $StartDate
        EndDate = $EndDate
        PageSize = 5000
    }
    
    if ($SenderAddress) { $TraceParams.SenderAddress = $SenderAddress }
    if ($RecipientAddress) { $TraceParams.RecipientAddress = $RecipientAddress }
    if ($Status -ne "All") { $TraceParams.Status = $Status }
    
    Write-Host "Running message trace..." -ForegroundColor Cyan
    $Messages = Get-MessageTrace @TraceParams
    
    # Apply subject filter if specified
    if ($SubjectFilter) {
        $Messages = $Messages | Where-Object { $_.Subject -like "*$SubjectFilter*" }
    }
    
    if ($Messages.Count -eq 0) {
        Write-Host "No messages found matching criteria." -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] Found $($Messages.Count) messages" -ForegroundColor Green
        Write-Host ""
        
        # Group by status for summary
        Write-Host "Status Summary:" -ForegroundColor Cyan
        $Messages | Group-Object Status | ForEach-Object {
            $StatusColor = switch ($_.Name) {
                'Delivered' { 'Green' }
                'Failed' { 'Red' }
                'Pending' { 'Yellow' }
                'Quarantined' { 'Magenta' }
                default { 'Gray' }
            }
            Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor $StatusColor
        }
        Write-Host ""
        
        # Display details (limit to first 50 in console)
        $DisplayCount = [Math]::Min($Messages.Count, 50)
        Write-Host "Showing first $DisplayCount messages:" -ForegroundColor Cyan
        Write-Host ""
        
        $Messages | Select-Object -First $DisplayCount | ForEach-Object {
            $StatusColor = switch ($_.Status) {
                'Delivered' { 'Green' }
                'Failed' { 'Red' }
                'Pending' { 'Yellow' }
                default { 'Gray' }
            }
            Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
            Write-Host "Subject: $($_.Subject)" -ForegroundColor White
            Write-Host "  From: $($_.SenderAddress)" -ForegroundColor Gray
            Write-Host "  To: $($_.RecipientAddress)" -ForegroundColor Gray
            Write-Host "  Date: $($_.Received)" -ForegroundColor Gray
            Write-Host "  Status: $($_.Status)" -ForegroundColor $StatusColor
            Write-Host "  Message ID: $($_.MessageId)" -ForegroundColor DarkGray
        }
        
        # Export to CSV if path specified
        if ($ExportPath) {
            $Messages | Export-Csv -Path $ExportPath -NoTypeInformation
            Write-Host ""
            Write-Host "[SUCCESS] Exported $($Messages.Count) messages to: $ExportPath" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Error "Failed to run message trace: $_"
    exit 1
}`;
    }
  },

  {
    id: 'export-mailbox-audit-logs',
    name: 'Export Mailbox Audit Logs',
    category: 'Reporting & Auditing',
    isPremium: true,
    description: 'Search and export mailbox audit logs for security investigations and compliance',
    instructions: `**How This Task Works:**
This script searches the unified audit log for mailbox-related activities, helping investigate security incidents and meet compliance requirements.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Compliance Administrator or Audit Log role
- Mailbox auditing enabled on target mailboxes
- Connected to Exchange Online

**What You Need to Provide:**
- Date range for search
- Optional: Specific user to audit
- Optional: Operation types to filter
- Export path for results

**What the Script Does:**
1. Connects to Exchange Online
2. Searches unified audit log
3. Filters by operations and users
4. Parses and formats audit data
5. Exports detailed report to CSV

**Important Notes:**
- Mailbox auditing enabled by default since 2019
- Audit logs retained for 90 days (E3) or 1 year (E5)
- Common operations: MailItemsAccessed, Send, MoveToDeletedItems
- Large searches may take several minutes
- Max 50,000 results per search
- Use date ranges < 7 days for best performance
- For investigating breaches, check MailItemsAccessed
- For data exfiltration, check Send and Forward activities`,
    parameters: [
      { id: 'startDate', label: 'Start Date (yyyy-MM-dd)', type: 'text', required: true, placeholder: '2024-01-01' },
      { id: 'endDate', label: 'End Date (yyyy-MM-dd)', type: 'text', required: true, placeholder: '2024-01-07' },
      { id: 'userIds', label: 'User(s) to Audit', type: 'textarea', required: false, placeholder: 'user1@contoso.com, user2@contoso.com', description: 'Leave blank for all users' },
      { id: 'operations', label: 'Operations to Search', type: 'select', required: false, options: ['All', 'MailItemsAccessed', 'Send', 'MoveToDeletedItems', 'SoftDelete', 'HardDelete', 'SendAs', 'SendOnBehalf', 'Create', 'Update', 'FolderBind'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MailboxAudit.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const userIds = params.userIds ? escapePowerShellString(params.userIds) : '';
      const operations = params.operations || 'All';
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Mailbox Audit Logs
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $StartDate = [DateTime]"${startDate}"
    $EndDate = [DateTime]"${endDate}"
    ${userIds ? `$UserIds = "${userIds}" -split ',' | ForEach-Object { $_.Trim() }` : '$UserIds = $null'}
    $Operations = "${operations}"
    $ExportPath = "${exportPath}"
    
    Write-Host "Mailbox Audit Log Search" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "Date Range: $($StartDate.ToString('yyyy-MM-dd')) to $($EndDate.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    ${userIds ? `Write-Host "Users: $($UserIds -join ', ')" -ForegroundColor Gray` : `Write-Host "Users: All" -ForegroundColor Gray`}
    Write-Host "Operations: $Operations" -ForegroundColor Gray
    Write-Host ""
    
    # Build search parameters
    $SearchParams = @{
        StartDate = $StartDate
        EndDate = $EndDate
        RecordType = "ExchangeItemAudit"
        ResultSize = 5000
    }
    
    if ($UserIds) {
        $SearchParams.UserIds = $UserIds
    }
    
    if ($Operations -ne "All") {
        $SearchParams.Operations = $Operations
    }
    
    Write-Host "Searching audit logs (this may take several minutes)..." -ForegroundColor Cyan
    
    $AllResults = @()
    $SessionId = [Guid]::NewGuid().ToString()
    $Complete = $false
    $Page = 1
    
    while (-not $Complete) {
        Write-Host "  Fetching page $Page..." -ForegroundColor Gray
        
        $Results = Search-UnifiedAuditLog @SearchParams -SessionId $SessionId -SessionCommand ReturnLargeSet
        
        if ($Results.Count -eq 0) {
            $Complete = $true
        } else {
            $AllResults += $Results
            $Page++
            
            if ($Results.Count -lt 5000) {
                $Complete = $true
            }
        }
    }
    
    if ($AllResults.Count -eq 0) {
        Write-Host "[WARNING] No audit records found for the specified criteria." -ForegroundColor Yellow
        Write-Host "  Ensure mailbox auditing is enabled for target users." -ForegroundColor Gray
        exit 0
    }
    
    Write-Host "[SUCCESS] Found $($AllResults.Count) audit records" -ForegroundColor Green
    Write-Host ""
    
    # Parse and format results
    Write-Host "Parsing audit data..." -ForegroundColor Cyan
    
    $ParsedResults = $AllResults | ForEach-Object {
        $AuditData = $_.AuditData | ConvertFrom-Json
        
        [PSCustomObject]@{
            CreationTime = $_.CreationDate
            User = $_.UserIds
            Operation = $_.Operations
            ResultStatus = $_.ResultStatus
            Workload = $AuditData.Workload
            ClientIP = $AuditData.ClientIP
            ClientInfoString = $AuditData.ClientInfoString
            ItemSubject = $AuditData.AffectedItems.Subject -join "; "
            DestFolder = $AuditData.DestFolder
            LogonType = $AuditData.LogonType
            ExternalAccess = $AuditData.ExternalAccess
        }
    }
    
    # Display summary
    Write-Host ""
    Write-Host "Operation Summary:" -ForegroundColor Cyan
    $ParsedResults | Group-Object Operation | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "User Summary:" -ForegroundColor Cyan
    $ParsedResults | Group-Object User | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) operations" -ForegroundColor Gray
    }
    
    # Export to CSV
    $ParsedResults | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Exported $($ParsedResults.Count) records to: $ExportPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Important Notes:" -ForegroundColor Yellow
    Write-Host "  - Review 'ExternalAccess=True' for potential compromises" -ForegroundColor Gray
    Write-Host "  - Check ClientIP for unusual locations" -ForegroundColor Gray
    Write-Host "  - 'MailItemsAccessed' indicates email content was read" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export audit logs: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-anti-spam-policy',
    name: 'Configure Anti-Spam Policy',
    category: 'Security & Compliance',
    isPremium: true,
    description: 'Create or modify anti-spam policies with custom thresholds and actions',
    instructions: `**How This Task Works:**
This script creates or modifies Exchange Online Protection (EOP) anti-spam policies to control spam filtering behavior for your organization.

**Prerequisites:**
- Exchange Online Management PowerShell module
- Security Administrator role
- Connected to Exchange Online

**What You Need to Provide:**
- Policy name
- Spam action thresholds
- Actions for spam/high-confidence spam
- Optional: Allow/Block lists

**What the Script Does:**
1. Connects to Exchange Online
2. Creates new or modifies existing anti-spam policy
3. Configures spam detection thresholds
4. Sets actions for different spam types
5. Optionally configures allow/block lists

**Important Notes:**
- Default policy applies to all users unless overridden
- Custom policies require rules to apply to specific users
- Actions: MoveToJmf (Junk), Quarantine, Delete, AddXHeader
- Bulk Complaint Level (BCL) ranges 0-9 (higher = more likely bulk)
- Spam Confidence Level (SCL) ranges -1 to 9
- Test policy changes on pilot group first
- Allow lists bypass spam filtering - use carefully
- Block lists are applied during filtering`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Strict Anti-Spam Policy', description: 'Use "Default" to modify default policy' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Modify', 'GetStatus'], defaultValue: 'GetStatus' },
      { id: 'spamAction', label: 'Spam Action', type: 'select', required: false, options: ['MoveToJmf', 'Quarantine', 'Delete', 'AddXHeader'], defaultValue: 'MoveToJmf' },
      { id: 'highConfidenceSpamAction', label: 'High Confidence Spam Action', type: 'select', required: false, options: ['MoveToJmf', 'Quarantine', 'Delete'], defaultValue: 'Quarantine' },
      { id: 'bulkThreshold', label: 'Bulk Email Threshold (1-9)', type: 'number', required: false, defaultValue: 7, placeholder: '7', description: 'Lower = stricter (5-6 recommended)' },
      { id: 'quarantineDays', label: 'Quarantine Retention (Days)', type: 'number', required: false, defaultValue: 30, placeholder: '30' },
      { id: 'allowedSenders', label: 'Allowed Senders', type: 'textarea', required: false, placeholder: 'trusted@partner.com, newsletter@vendor.com', description: 'Comma-separated - bypasses spam filtering' },
      { id: 'blockedSenders', label: 'Blocked Senders', type: 'textarea', required: false, placeholder: 'spam@bad.com', description: 'Comma-separated - always blocked' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const action = params.action || 'GetStatus';
      const spamAction = params.spamAction || 'MoveToJmf';
      const highConfidenceSpamAction = params.highConfidenceSpamAction || 'Quarantine';
      const bulkThreshold = params.bulkThreshold || 7;
      const quarantineDays = params.quarantineDays || 30;
      const allowedSenders = params.allowedSenders ? escapePowerShellString(params.allowedSenders) : '';
      const blockedSenders = params.blockedSenders ? escapePowerShellString(params.blockedSenders) : '';

      return `# Configure Anti-Spam Policy
# Generated: ${new Date().toISOString()}

Connect-ExchangeOnline

try {
    $PolicyName = "${policyName}"
    $Action = "${action}"
    $SpamAction = "${spamAction}"
    $HighConfidenceSpamAction = "${highConfidenceSpamAction}"
    $BulkThreshold = ${bulkThreshold}
    $QuarantineDays = ${quarantineDays}
    ${allowedSenders ? `$AllowedSenders = "${allowedSenders}" -split ',' | ForEach-Object { $_.Trim() }` : '$AllowedSenders = @()'}
    ${blockedSenders ? `$BlockedSenders = "${blockedSenders}" -split ',' | ForEach-Object { $_.Trim() }` : '$BlockedSenders = @()'}
    
    Write-Host "Anti-Spam Policy Configuration" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "Policy: $PolicyName" -ForegroundColor Gray
    Write-Host "Action: $Action" -ForegroundColor Gray
    Write-Host ""
    
    switch ($Action) {
        "GetStatus" {
            if ($PolicyName -eq "Default") {
                $Policy = Get-HostedContentFilterPolicy -Identity "Default"
            } else {
                $Policy = Get-HostedContentFilterPolicy -Identity $PolicyName -ErrorAction SilentlyContinue
            }
            
            if (-not $Policy) {
                Write-Host "[WARNING] Policy not found: $PolicyName" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Available policies:" -ForegroundColor Cyan
                Get-HostedContentFilterPolicy | ForEach-Object {
                    Write-Host "  - $($_.Name)" -ForegroundColor Gray
                }
            } else {
                Write-Host "Policy Configuration:" -ForegroundColor Green
                Write-Host "  Name: $($Policy.Name)" -ForegroundColor Gray
                Write-Host "  Spam Action: $($Policy.SpamAction)" -ForegroundColor Gray
                Write-Host "  High Confidence Spam Action: $($Policy.HighConfidenceSpamAction)" -ForegroundColor Gray
                Write-Host "  Phish Action: $($Policy.PhishSpamAction)" -ForegroundColor Gray
                Write-Host "  High Confidence Phish Action: $($Policy.HighConfidencePhishAction)" -ForegroundColor Gray
                Write-Host "  Bulk Threshold: $($Policy.BulkThreshold)" -ForegroundColor Gray
                Write-Host "  Quarantine Retention: $($Policy.QuarantineRetentionPeriod) days" -ForegroundColor Gray
                Write-Host ""
                Write-Host "Allow/Block Lists:" -ForegroundColor Cyan
                Write-Host "  Allowed Senders: $($Policy.AllowedSenders.Count)" -ForegroundColor Gray
                Write-Host "  Blocked Senders: $($Policy.BlockedSenders.Count)" -ForegroundColor Gray
                Write-Host "  Allowed Sender Domains: $($Policy.AllowedSenderDomains.Count)" -ForegroundColor Gray
                Write-Host "  Blocked Sender Domains: $($Policy.BlockedSenderDomains.Count)" -ForegroundColor Gray
            }
        }
        
        "Create" {
            Write-Host "Creating new anti-spam policy..." -ForegroundColor Cyan
            
            $PolicyParams = @{
                Name = $PolicyName
                SpamAction = $SpamAction
                HighConfidenceSpamAction = $HighConfidenceSpamAction
                BulkThreshold = $BulkThreshold
                QuarantineRetentionPeriod = $QuarantineDays
            }
            
            if ($AllowedSenders.Count -gt 0) {
                $PolicyParams.AllowedSenders = $AllowedSenders
            }
            
            if ($BlockedSenders.Count -gt 0) {
                $PolicyParams.BlockedSenders = $BlockedSenders
            }
            
            New-HostedContentFilterPolicy @PolicyParams
            
            Write-Host "[SUCCESS] Policy created: $PolicyName" -ForegroundColor Green
            Write-Host ""
            Write-Host "[WARNING] Next Steps:" -ForegroundColor Yellow
            Write-Host "  1. Create a filter rule to apply this policy to users:" -ForegroundColor Gray
            Write-Host "     New-HostedContentFilterRule -Name '$PolicyName Rule' \`" -ForegroundColor Gray
            Write-Host "         -HostedContentFilterPolicy '$PolicyName' \`" -ForegroundColor Gray
            Write-Host "         -RecipientDomainIs 'contoso.com'" -ForegroundColor Gray
            Write-Host "  2. Or apply to specific users/groups with -SentTo parameter" -ForegroundColor Gray
        }
        
        "Modify" {
            Write-Host "Modifying anti-spam policy..." -ForegroundColor Cyan
            
            $SetParams = @{
                Identity = $PolicyName
                SpamAction = $SpamAction
                HighConfidenceSpamAction = $HighConfidenceSpamAction
                BulkThreshold = $BulkThreshold
                QuarantineRetentionPeriod = $QuarantineDays
            }
            
            if ($AllowedSenders.Count -gt 0) {
                $SetParams.AllowedSenders = $AllowedSenders
            }
            
            if ($BlockedSenders.Count -gt 0) {
                $SetParams.BlockedSenders = $BlockedSenders
            }
            
            Set-HostedContentFilterPolicy @SetParams
            
            Write-Host "[SUCCESS] Policy updated: $PolicyName" -ForegroundColor Green
            Write-Host ""
            Write-Host "Settings Applied:" -ForegroundColor Cyan
            Write-Host "  Spam Action: $SpamAction" -ForegroundColor Gray
            Write-Host "  High Confidence Spam Action: $HighConfidenceSpamAction" -ForegroundColor Gray
            Write-Host "  Bulk Threshold: $BulkThreshold" -ForegroundColor Gray
            Write-Host "  Quarantine Retention: $QuarantineDays days" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Failed to configure anti-spam policy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'migrate-mailbox-cross-tenant',
    name: 'Prepare Cross-Tenant Mailbox Migration',
    category: 'Mailbox Migration',
    isPremium: true,
    description: 'Generate migration scripts and prerequisites for cross-tenant mailbox moves (M&A scenarios)',
    instructions: `**How This Task Works:**
This script generates the necessary configuration and commands for cross-tenant mailbox migration, commonly used in mergers, acquisitions, or tenant consolidation projects.

**Prerequisites:**
- Exchange Online Management PowerShell module on both tenants
- Organization Management role in both tenants
- Azure AD application configured for migration
- Network connectivity between tenants

**What You Need to Provide:**
- Source and target tenant domains
- Migration endpoint URL
- Application ID for migration
- User list for migration batch

**What the Script Does:**
1. Validates tenant connectivity
2. Creates organization relationship (if needed)
3. Configures migration endpoint
4. Generates migration batch commands
5. Provides step-by-step migration checklist

**Important Notes:**
- Cross-tenant migration requires significant planning
- Azure AD app registration required in both tenants
- Users need licenses in target tenant before migration
- Mailbox data, calendar, and contacts migrate
- Distribution groups and permissions need manual recreation
- Plan for DNS cutover and email routing
- Test with pilot batch before full migration
- Typical migration: 1-2GB per hour per mailbox`,
    parameters: [
      { id: 'sourceTenant', label: 'Source Tenant Domain', type: 'text', required: true, placeholder: 'source.onmicrosoft.com' },
      { id: 'targetTenant', label: 'Target Tenant Domain', type: 'text', required: true, placeholder: 'target.onmicrosoft.com' },
      { id: 'applicationId', label: 'Migration App ID', type: 'text', required: true, placeholder: '00000000-0000-0000-0000-000000000000', description: 'Azure AD app registered for migration' },
      { id: 'migrationEndpoint', label: 'Migration Endpoint URL', type: 'text', required: false, placeholder: 'https://outlook.office.com/ews/exchange.asmx' },
      { id: 'usersCsv', label: 'Users CSV Path', type: 'path', required: false, placeholder: 'C:\\Migration\\users.csv', description: 'CSV with SourceEmail, TargetEmail columns' },
      { id: 'batchName', label: 'Migration Batch Name', type: 'text', required: true, placeholder: 'Wave1-Migration', description: 'Name for migration batch' }
    ],
    scriptTemplate: (params) => {
      const sourceTenant = escapePowerShellString(params.sourceTenant);
      const targetTenant = escapePowerShellString(params.targetTenant);
      const applicationId = escapePowerShellString(params.applicationId);
      const migrationEndpoint = params.migrationEndpoint ? escapePowerShellString(params.migrationEndpoint) : 'https://outlook.office.com/ews/exchange.asmx';
      const usersCsv = params.usersCsv ? escapePowerShellString(params.usersCsv) : '';
      const batchName = escapePowerShellString(params.batchName);

      return `# Cross-Tenant Mailbox Migration Preparation
# Generated: ${new Date().toISOString()}

<#
.SYNOPSIS
    Prepares and executes cross-tenant mailbox migration between Microsoft 365 tenants.

.DESCRIPTION
    This script handles the complex process of migrating mailboxes between tenants,
    typically used in M&A scenarios or tenant consolidation.

.NOTES
    IMPORTANT: Review each section carefully before executing.
    This is a multi-step process that requires coordination between tenants.
#>

#region Configuration
$SourceTenant = "${sourceTenant}"
$TargetTenant = "${targetTenant}"
$ApplicationId = "${applicationId}"
$MigrationEndpoint = "${migrationEndpoint}"
${usersCsv ? `$UsersCsvPath = "${usersCsv}"` : '# $UsersCsvPath = "C:\\Migration\\users.csv"  # Uncomment and set path'}
$BatchName = "${batchName}"
#endregion

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Cross-Tenant Mailbox Migration Preparation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source Tenant: $SourceTenant" -ForegroundColor Gray
Write-Host "Target Tenant: $TargetTenant" -ForegroundColor Gray
Write-Host "Batch Name: $BatchName" -ForegroundColor Gray
Write-Host ""

#region Pre-Flight Checklist
Write-Host "PRE-FLIGHT CHECKLIST" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "Before proceeding, ensure:" -ForegroundColor White
Write-Host "  [ ] Azure AD app registered in BOTH tenants (ID: $ApplicationId)" -ForegroundColor Gray
Write-Host "  [ ] App has Mail.ReadWrite and User.Read.All permissions" -ForegroundColor Gray
Write-Host "  [ ] Users exist in target tenant (synced or cloud)" -ForegroundColor Gray
Write-Host "  [ ] Users have licenses assigned in target tenant" -ForegroundColor Gray
Write-Host "  [ ] Organization relationship configured" -ForegroundColor Gray
Write-Host "  [ ] Migration endpoint created" -ForegroundColor Gray
Write-Host ""
#endregion

#region Step 1: Connect to Target Tenant
Write-Host "STEP 1: Connect to Target Tenant" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host @"
# Run this in target tenant admin PowerShell:
Connect-ExchangeOnline -UserPrincipalName admin@$TargetTenant
"@ -ForegroundColor White
Write-Host ""
#endregion

#region Step 2: Create Organization Relationship
Write-Host "STEP 2: Create Organization Relationship (Target Tenant)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host @"
# Create organization relationship for migration
\$OrgRel = Get-OrganizationRelationship | Where-Object { \$_.DomainNames -contains "$SourceTenant" }
if (-not \$OrgRel) {
    New-OrganizationRelationship -Name "Migration-$SourceTenant" \`
        -DomainNames "$SourceTenant" \`
        -MailboxMoveEnabled \$true \`
        -MailboxMoveCapability Inbound
    Write-Host "[SUCCESS] Organization relationship created" -ForegroundColor Green
} else {
    Set-OrganizationRelationship -Identity \$OrgRel.Identity -MailboxMoveEnabled \$true -MailboxMoveCapability Inbound
    Write-Host "[SUCCESS] Organization relationship updated" -ForegroundColor Green
}
"@ -ForegroundColor White
Write-Host ""
#endregion

#region Step 3: Create Migration Endpoint
Write-Host "STEP 3: Create Migration Endpoint (Target Tenant)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host @"
# Create migration endpoint
\$Credential = Get-Credential -Message "Enter source tenant admin credentials"
New-MigrationEndpoint -Name "CrossTenant-$SourceTenant" \`
    -RemoteServer "$MigrationEndpoint" \`
    -Credentials \$Credential \`
    -ExchangeRemoteMove \`
    -ApplicationId "$ApplicationId"
Write-Host "[SUCCESS] Migration endpoint created" -ForegroundColor Green
"@ -ForegroundColor White
Write-Host ""
#endregion

#region Step 4: Prepare Migration Batch
Write-Host "STEP 4: Prepare Migration Batch" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
${usersCsv ? `
Write-Host @"
# Import users from CSV
\$Users = Import-Csv -Path "$usersCsv"
Write-Host "Loaded \$(\$Users.Count) users for migration"

# Create migration batch
New-MigrationBatch -Name "$batchName" \`
    -SourceEndpoint "CrossTenant-$SourceTenant" \`
    -CSVData ([System.IO.File]::ReadAllBytes("$usersCsv")) \`
    -TargetDeliveryDomain "$TargetTenant"
Write-Host "[SUCCESS] Migration batch created" -ForegroundColor Green
"@ -ForegroundColor White` : `
Write-Host @"
# Create CSV file with columns: EmailAddress (source), TargetAddress (target UPN)
# Example CSV content:
# EmailAddress,TargetAddress
# user1@source.com,user1@target.com
# user2@source.com,user2@target.com

# Then create migration batch:
New-MigrationBatch -Name "$batchName" \`
    -SourceEndpoint "CrossTenant-$SourceTenant" \`
    -CSVData ([System.IO.File]::ReadAllBytes("C:\\Migration\\users.csv")) \`
    -TargetDeliveryDomain "$TargetTenant"
"@ -ForegroundColor White`}
Write-Host ""
#endregion

#region Step 5: Start and Monitor Migration
Write-Host "STEP 5: Start and Monitor Migration" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host @"
# Start the migration batch
Start-MigrationBatch -Identity "$batchName"

# Monitor progress
Get-MigrationBatch -Identity "$batchName" | Select-Object Status, TotalCount, SyncedCount, FinalizedCount

# Get detailed user status
Get-MigrationUser -BatchId "$batchName" | Select-Object Identity, Status, ItemsSynced, Error

# Complete migration (after sync is done)
Complete-MigrationBatch -Identity "$batchName"
"@ -ForegroundColor White
Write-Host ""
#endregion

#region Post-Migration Tasks
Write-Host "POST-MIGRATION TASKS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "After migration completes:" -ForegroundColor White
Write-Host "  [ ] Update DNS MX records to point to target tenant" -ForegroundColor Gray
Write-Host "  [ ] Verify mail flow to migrated users" -ForegroundColor Gray
Write-Host "  [ ] Recreate distribution groups in target" -ForegroundColor Gray
Write-Host "  [ ] Re-delegate mailbox permissions" -ForegroundColor Gray
Write-Host "  [ ] Update any mail-enabled applications" -ForegroundColor Gray
Write-Host "  [ ] Remove users from source tenant (after validation)" -ForegroundColor Gray
Write-Host "  [ ] Remove organization relationship (when migration complete)" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Cross-tenant migration is complex. Test with pilot users first!" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan`;
    }
  }
];
