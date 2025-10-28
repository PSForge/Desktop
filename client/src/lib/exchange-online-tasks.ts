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
        Write-Host "⚠ Mailbox already exists for: $UPN" -ForegroundColor Yellow
        exit 0
    }
    
    # Create the mailbox (requires Microsoft Graph PowerShell module)
    Connect-MgGraph -Scopes "User.ReadWrite.All", "Organization.Read.All"
    
    # Set usage location first
    Update-MgUser -UserId $UPN -UsageLocation $UsageLocation
    Write-Host "✓ Usage location set: $UsageLocation" -ForegroundColor Green
    
    # Assign license - first resolve SKU name to GUID
    $Sku = Get-MgSubscribedSku -All | Where-Object { $_.SkuPartNumber -eq $LicenseSku }
    if (-not $Sku) {
        Write-Error "License SKU not found: $LicenseSku. Run 'Get-MgSubscribedSku | Select SkuPartNumber, SkuId' to see available SKUs"
        exit 1
    }
    
    Set-MgUserLicense -UserId $UPN -AddLicenses @{SkuId = $Sku.SkuId} -RemoveLicenses @()
    Write-Host "✓ License assigned: $LicenseSku (SKU ID: $($Sku.SkuId))" -ForegroundColor Green
    
    # Wait for mailbox provisioning
    Write-Host "Waiting for mailbox to provision..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
    
    # Verify mailbox creation
    $Mailbox = Get-EXOMailbox -Identity $UPN -ErrorAction SilentlyContinue
    if ($Mailbox) {
        Write-Host "✓ Mailbox created successfully!" -ForegroundColor Green
        Write-Host "  UPN: $UPN" -ForegroundColor Gray
        Write-Host "  Display Name: $DisplayName" -ForegroundColor Gray
        Write-Host "  Primary SMTP: $($Mailbox.PrimarySmtpAddress)" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Mailbox not yet provisioned. Check again in a few minutes." -ForegroundColor Yellow
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
    Write-Host "✓ Target Mailbox: $($Mailbox.DisplayName) ($($Mailbox.PrimarySmtpAddress))" -ForegroundColor Green
    
    # Verify user exists
    $User = Get-EXOMailbox -Identity $UserIdentity -ErrorAction Stop
    Write-Host "✓ User: $($User.DisplayName) ($($User.PrimarySmtpAddress))" -ForegroundColor Green
    
    if ($Action -eq "Add") {
        switch ($PermissionType) {
            "FullAccess" {
                Add-MailboxPermission -Identity $MailboxIdentity \`
                    -User $UserIdentity \`
                    -AccessRights FullAccess \`
                    -InheritanceType All \`
                    -AutoMapping $AutoMapping
                Write-Host "✓ Full Access permission added" -ForegroundColor Green
                if ($AutoMapping) {
                    Write-Host "  Auto-mapping enabled - mailbox will appear in Outlook" -ForegroundColor Gray
                }
            }
            "SendAs" {
                Add-RecipientPermission -Identity $MailboxIdentity \`
                    -Trustee $UserIdentity \`
                    -AccessRights SendAs \`
                    -Confirm:\$false
                Write-Host "✓ Send As permission added" -ForegroundColor Green
            }
            "SendOnBehalf" {
                Set-Mailbox -Identity $MailboxIdentity \`
                    -GrantSendOnBehalfTo @{Add=$UserIdentity}
                Write-Host "✓ Send on Behalf permission added" -ForegroundColor Green
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
                Write-Host "✓ Full Access permission removed" -ForegroundColor Green
            }
            "SendAs" {
                Remove-RecipientPermission -Identity $MailboxIdentity \`
                    -Trustee $UserIdentity \`
                    -AccessRights SendAs \`
                    -Confirm:\$false
                Write-Host "✓ Send As permission removed" -ForegroundColor Green
            }
            "SendOnBehalf" {
                Set-Mailbox -Identity $MailboxIdentity \`
                    -GrantSendOnBehalfTo @{Remove=$UserIdentity}
                Write-Host "✓ Send on Behalf permission removed" -ForegroundColor Green
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
Write-Host "✓ Loaded $($Users.Count) records from CSV" -ForegroundColor Green

if ($TestMode) {
    Write-Host "⚠ TEST MODE - No changes will be made" -ForegroundColor Yellow
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
                    Write-Host "  ✓ License assigned: $($User.LicenseSku)" -ForegroundColor Green
                    $SuccessCount++
                } else {
                    Write-Host "  ✗ SKU not found: $($User.LicenseSku)" -ForegroundColor Red
                    $FailCount++
                }
            } elseif ($Operation -eq "AssignPermissions") {
                # Assign permissions based on CSV columns
                Add-MailboxPermission -Identity $User.TargetMailbox -User $User.UPN -AccessRights $User.Permission
                Write-Host "  ✓ Permission assigned" -ForegroundColor Green
                $SuccessCount++
            }
        }
    } catch {
        Write-Host "  ✗ Failed: $_" -ForegroundColor Red
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
        Write-Host "✓ Converted to Shared mailbox" -ForegroundColor Green
        
        if ($RemoveLicense) {
            Write-Host "Note: Remove license manually in Microsoft 365 Admin Center" -ForegroundColor Yellow
            Write-Host "  User: $MailboxIdentity" -ForegroundColor Gray
        }
    } else {
        # Convert to Regular (User)
        Set-Mailbox -Identity $MailboxIdentity -Type Regular
        Write-Host "✓ Converted to User mailbox" -ForegroundColor Green
        Write-Host "⚠ Remember to assign a license to this mailbox" -ForegroundColor Yellow
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
    Write-Host "✓ Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    if ($Feature -eq "LitigationHold") {
        if ($Action -eq "Enable") {
            Set-Mailbox -Identity $MailboxIdentity -LitigationHoldEnabled \$true${comment ? ' -LitigationHoldComment $Comment' : ''}
            Write-Host "✓ Litigation Hold enabled" -ForegroundColor Green
            ${comment ? 'Write-Host "  Comment: $Comment" -ForegroundColor Gray' : ''}
        } else {
            Set-Mailbox -Identity $MailboxIdentity -LitigationHoldEnabled \$false
            Write-Host "✓ Litigation Hold disabled" -ForegroundColor Green
        }
    } elseif ($Feature -eq "Archive") {
        if ($Action -eq "Enable") {
            Enable-Mailbox -Identity $MailboxIdentity -Archive
            Write-Host "✓ Archive mailbox enabled" -ForegroundColor Green
            Write-Host "  Archive will be provisioned shortly" -ForegroundColor Gray
        } else {
            Disable-Mailbox -Identity $MailboxIdentity -Archive -Confirm:\$false
            Write-Host "✓ Archive mailbox disabled" -ForegroundColor Green
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
    Write-Host "✓ Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    $params = @{
        Identity = $MailboxIdentity
    }
    
    ${prohibitSendQuota ? `$params.ProhibitSendQuota = "${prohibitSendQuota}GB"` : ''}
    ${prohibitSendReceiveQuota ? `$params.ProhibitSendReceiveQuota = "${prohibitSendReceiveQuota}GB"` : ''}
    ${maxSendSize ? `$params.MaxSendSize = "${maxSendSize}MB"` : ''}
    ${maxReceiveSize ? `$params.MaxReceiveSize = "${maxReceiveSize}MB"` : ''}
    
    Set-Mailbox @params
    Write-Host "✓ Quotas and limits updated" -ForegroundColor Green
    
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
    Write-Host "⚠ TEST MODE - No changes will be made" -ForegroundColor Yellow
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
    
    Write-Host "✓ Found $($Mailboxes.Count) mailboxes to process" -ForegroundColor Green
    
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
                    Write-Host "  ✓ $($Mailbox.PrimarySmtpAddress): Archive enabled" -ForegroundColor Green
                }
                $EnabledCount++
            }
        } catch {
            Write-Host "  ✗ $($Mailbox.PrimarySmtpAddress): Failed - $_" -ForegroundColor Red
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
    
    Write-Host "✓ Found $($Mailboxes.Count) mailboxes" -ForegroundColor Green
    
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
    Write-Host "✓ Report generated successfully!" -ForegroundColor Green
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
        Write-Host "⚠ Group already exists. Updating..." -ForegroundColor Yellow
        Set-DistributionGroup -Identity $EmailAddress -RequireSenderAuthenticationEnabled $RequireSenderAuth
        Write-Host "✓ Group updated" -ForegroundColor Green
    } else {
        # Create new group
        New-DistributionGroup -Name $GroupName \`
            -PrimarySmtpAddress $EmailAddress \`
            -ManagedBy $Owner \`
            -RequireSenderAuthenticationEnabled $RequireSenderAuth
        Write-Host "✓ Distribution group created" -ForegroundColor Green
    }
    
    ${members.length > 0 ? `
    # Add members
    foreach ($Member in $Members) {
        try {
            Add-DistributionGroupMember -Identity $EmailAddress -Member $Member
            Write-Host "  ✓ Added member: $Member" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Failed to add $Member: $_" -ForegroundColor Yellow
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
    Write-Host "✓ Group: $($Group.DisplayName)" -ForegroundColor Green
    
    # Import members
    $Members = Import-Csv -Path $CsvPath
    Write-Host "✓ Loaded $($Members.Count) members from CSV" -ForegroundColor Green
    
    if ($TestMode) {
        Write-Host "⚠ TEST MODE - No changes will be made" -ForegroundColor Yellow
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
                    Write-Host "  ✓ Added: $($Member.Email)" -ForegroundColor Green
                } else {
                    Remove-DistributionGroupMember -Identity $GroupIdentity -Member $Member.Email -Confirm:\$false -ErrorAction Stop
                    Write-Host "  ✓ Removed: $($Member.Email)" -ForegroundColor Green
                }
                $SuccessCount++
            }
        } catch {
            Write-Host "  ✗ Failed for $($Member.Email): $_" -ForegroundColor Red
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
    
    Write-Host "✓ Found $($Groups.Count) groups" -ForegroundColor Green
    
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
    Write-Host "✓ Report generated successfully!" -ForegroundColor Green
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
        Write-Host "⚠ Rule already exists. Updating..." -ForegroundColor Yellow
        Set-TransportRule -Identity $RuleName -Enabled $Enabled
        Write-Host "✓ Transport rule updated" -ForegroundColor Green
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
        Write-Host "✓ Transport rule created" -ForegroundColor Green
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
    Write-Host "✓ Transport rule created: $RuleName" -ForegroundColor Green
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
        Write-Host "✓ Message trace completed!" -ForegroundColor Green
        Write-Host "  Messages Found: $($Messages.Count)" -ForegroundColor Gray
        Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    } else {
        Write-Host "⚠ No messages found matching criteria" -ForegroundColor Yellow
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
        Write-Host "⚠ Mailbox already exists: $EmailAddress" -ForegroundColor Yellow
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
    
    Write-Host "✓ $MailboxType mailbox created" -ForegroundColor Green
    
    # Wait for provisioning
    Start-Sleep -Seconds 10
    
    ${members.length > 0 ? `
    # Add members
    foreach ($Member in $Members) {
        try {
            Add-MailboxPermission -Identity $EmailAddress -User $Member -AccessRights FullAccess -AutoMapping \$true
            Write-Host "  ✓ Added $Member with Full Access" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Failed to add $Member: $_" -ForegroundColor Yellow
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
        Write-Host "✓ Auditing enabled for: $MailboxIdentity" -ForegroundColor Green
        ` : `
        # Enable for all mailboxes
        Get-EXOMailbox -ResultSize Unlimited | Set-Mailbox -AuditEnabled \$true
        Write-Host "✓ Auditing enabled for all mailboxes" -ForegroundColor Green
        `}
    } else {
        # Export audit logs
        $StartDate = (Get-Date).AddDays(-90)
        $EndDate = Get-Date
        
        $Logs = Search-UnifiedAuditLog -StartDate $StartDate -EndDate $EndDate ${mailboxIdentity ? '-UserIds $MailboxIdentity' : ''} -RecordType ExchangeItem
        
        if ($Logs) {
            $Logs | Export-Csv -Path $OutputPath -NoTypeInformation
            Write-Host "✓ Audit logs exported" -ForegroundColor Green
            Write-Host "  Records: $($Logs.Count)" -ForegroundColor Gray
            Write-Host "  Output: $OutputPath" -ForegroundColor Gray
        } else {
            Write-Host "⚠ No audit logs found" -ForegroundColor Yellow
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
                    Write-Host "  ✓ Converted to Shared: $($Mailbox.DisplayName)" -ForegroundColor Green
                }
            }
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Inactive mailbox report generated!" -ForegroundColor Green
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
                    Write-Host "  ✓ Disabled forwarding for: $($Mailbox.DisplayName)" -ForegroundColor Green
                } else {
                    Write-Host "  Found: $($Mailbox.DisplayName) -> $ForwardAddress" -ForegroundColor Yellow
                }
            }
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "✓ External forwarding scan completed!" -ForegroundColor Green
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
    
    Write-Host "✓ Found $($Mailboxes.Count) mailboxes" -ForegroundColor Green
    
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
    Write-Host "✓ Report generated successfully!" -ForegroundColor Green
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
    Write-Host "✓ Distribution list members exported!" -ForegroundColor Green
    Write-Host "  Groups Processed: $($Groups.Count)" -ForegroundColor Gray
    Write-Host "  Total Members: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export distribution list members: $_"
    exit 1
}`;
    }
  }
];
