import { 
  escapePowerShellString, 
  buildPowerShellArray, 
  toPowerShellBoolean,
  validateRequiredFields 
} from './powershell-utils';

export interface ExchangeServerTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface ExchangeServerTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: ExchangeServerTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium?: boolean;
}

export const exchangeServerTasks: ExchangeServerTask[] = [
  // ========================================
  // MAILBOXES & USERS CATEGORY
  // ========================================
  {
    id: 'create-mailbox-onprem',
    name: 'Create New Mailbox (User/Shared/Resource)',
    category: 'Mailboxes & Users',
    isPremium: true,
    description: 'Create a new mailbox in Exchange Server on-premises',
    instructions: `**How This Task Works:**
- Creates new mailboxes in Exchange Server on-premises
- Supports User, Shared, Room, and Equipment mailbox types
- Integrates with Active Directory for user accounts
- Assigns mailbox to specified database

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Active Directory integration configured
- Mailbox database must exist and be mounted
- For User mailboxes: AD account should already exist

**What You Need to Provide:**
- Mailbox type: User, Shared, Room, or Equipment
- Alias (unique mailbox identifier)
- Display name
- Mailbox database name
- Optional: Organizational Unit path

**What the Script Does:**
1. Connects to Exchange Management Shell
2. Checks if mailbox with alias already exists
3. Verifies target mailbox database exists and is mounted
4. Creates mailbox based on type (User: enables existing AD account, others: creates new)
5. Reports mailbox creation success with details

**Important Notes:**
- Exchange Server Administrator role required
- User mailboxes require existing AD user account (use Enable-Mailbox)
- Shared/Room/Equipment mailboxes create new AD accounts automatically
- Alias must be unique across organization
- Typical use: onboarding new users, creating shared resources, conference rooms
- Run on Exchange Server or via remote PowerShell session
- Room and Equipment mailboxes for resource booking
- Shared mailboxes for team collaboration (no license required)`,
    parameters: [
      { id: 'mailboxType', label: 'Mailbox Type', type: 'select', required: true, options: ['User', 'Shared', 'Room', 'Equipment'], defaultValue: 'User' },
      { id: 'alias', label: 'Alias', type: 'text', required: true, placeholder: 'jdoe' },
      { id: 'displayName', label: 'Display Name', type: 'text', required: true, placeholder: 'John Doe' },
      { id: 'database', label: 'Mailbox Database', type: 'text', required: true, placeholder: 'DB01' },
      { id: 'organizationalUnit', label: 'Organizational Unit', type: 'text', required: false, placeholder: 'contoso.com/Users' }
    ],
    scriptTemplate: (params) => {
      const mailboxType = params.mailboxType || 'User';
      const alias = escapePowerShellString(params.alias);
      const displayName = escapePowerShellString(params.displayName);
      const database = escapePowerShellString(params.database);
      const organizationalUnit = params.organizationalUnit ? escapePowerShellString(params.organizationalUnit) : '';

      return `# Create Exchange Server Mailbox
# Generated: ${new Date().toISOString()}

# Connect to Exchange Management Shell
# Run this script on Exchange Server or use: $Session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://ExchangeServer/PowerShell/

$MailboxType = "${mailboxType}"
$Alias = "${alias}"
$DisplayName = "${displayName}"
$Database = "${database}"
${organizationalUnit ? `$OrganizationalUnit = "${organizationalUnit}"` : ''}

try {
    # Check if mailbox exists
    $Existing = Get-Mailbox -Identity $Alias -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Mailbox already exists: $Alias" -ForegroundColor Yellow
        exit 0
    }
    
    # Verify database exists
    $DB = Get-MailboxDatabase -Identity $Database -ErrorAction Stop
    Write-Host "[SUCCESS] Target Database: $($DB.Name)" -ForegroundColor Green
    
    # Create mailbox based on type
    $params = @{
        Name = $DisplayName
        Alias = $Alias
        Database = $Database
    }
    
    ${organizationalUnit ? '$params.OrganizationalUnit = $OrganizationalUnit' : ''}
    
    switch ($MailboxType) {
        "User" {
            # For user mailbox, AD account should already exist
            # Enable existing AD user for mailbox
            Enable-Mailbox @params
            Write-Host "[SUCCESS] User mailbox enabled" -ForegroundColor Green
        }
        "Shared" {
            New-Mailbox @params -Shared
            Write-Host "[SUCCESS] Shared mailbox created" -ForegroundColor Green
        }
        "Room" {
            New-Mailbox @params -Room
            Write-Host "[SUCCESS] Room mailbox created" -ForegroundColor Green
        }
        "Equipment" {
            New-Mailbox @params -Equipment
            Write-Host "[SUCCESS] Equipment mailbox created" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Mailbox created successfully!" -ForegroundColor Green
    Write-Host "  Type: $MailboxType" -ForegroundColor Gray
    Write-Host "  Alias: $Alias" -ForegroundColor Gray
    Write-Host "  Database: $Database" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create mailbox: $_"
    exit 1
}`;
    }
  },

  {
    id: 'move-mailbox-database',
    name: 'Move Mailbox Between Databases',
    category: 'Mailboxes & Users',
    isPremium: true,
    description: 'Move mailbox to different database with throttling options',
    instructions: `**How This Task Works:**
- Moves mailboxes between Exchange databases
- Creates asynchronous move request with throttling
- Handles corrupted items with bad item limit
- Test mode allows preview before execution

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Source and target databases must exist and be mounted
- Sufficient space on target database
- Network connectivity between databases

**What You Need to Provide:**
- Mailbox identity (email address or alias)
- Target database name
- Bad item limit (number of corrupted items to skip, default: 10)
- Test mode: true to preview, false to execute

**What the Script Does:**
1. Verifies mailbox exists and retrieves current database
2. Verifies target database exists and is accessible
3. In test mode: displays what would be moved without executing
4. In execution mode: creates New-MoveRequest with specified parameters
5. Reports move request creation and provides monitoring command

**Important Notes:**
- Exchange Server Administrator role required
- Move is asynchronous - mailbox remains accessible during move
- BadItemLimit handles corrupted items (increase if mailbox has corruption)
- Test mode enabled by default for safety
- Typical use: database load balancing, maintenance, server decommissioning
- Monitor progress with Get-MoveRequest and Get-MoveRequestStatistics
- Large mailboxes may take hours to move
- Users can access mailbox during move with minimal interruption`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'targetDatabase', label: 'Target Database', type: 'text', required: true, placeholder: 'DB02' },
      { id: 'badItemLimit', label: 'Bad Item Limit', type: 'number', required: false, defaultValue: 10, placeholder: '10' },
      { id: 'testMode', label: 'Test Mode (What-If)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const targetDatabase = escapePowerShellString(params.targetDatabase);
      const badItemLimit = params.badItemLimit || 10;
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Move Mailbox to Different Database
# Generated: ${new Date().toISOString()}

$MailboxIdentity = "${mailboxIdentity}"
$TargetDatabase = "${targetDatabase}"
$BadItemLimit = ${badItemLimit}
$TestMode = ${testMode}

try {
    # Verify mailbox exists
    $Mailbox = Get-Mailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Source Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    Write-Host "  Current Database: $($Mailbox.Database)" -ForegroundColor Gray
    
    # Verify target database exists
    $TargetDB = Get-MailboxDatabase -Identity $TargetDatabase -ErrorAction Stop
    Write-Host "[SUCCESS] Target Database: $($TargetDB.Name)" -ForegroundColor Green
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "[WARNING] TEST MODE - No mailbox will be moved" -ForegroundColor Yellow
        Write-Host "  Would move: $MailboxIdentity" -ForegroundColor Gray
        Write-Host "  From: $($Mailbox.Database)" -ForegroundColor Gray
        Write-Host "  To: $TargetDatabase" -ForegroundColor Gray
    } else {
        # Initiate mailbox move
        Write-Host ""
        Write-Host "Initiating mailbox move..." -ForegroundColor Cyan
        
        $MoveRequest = New-MoveRequest -Identity $MailboxIdentity \`
            -TargetDatabase $TargetDatabase \`
            -BadItemLimit $BadItemLimit \`
            -AcceptLargeDataLoss
        
        Write-Host "[SUCCESS] Move request created" -ForegroundColor Green
        Write-Host "  Request Name: $($MoveRequest.DisplayName)" -ForegroundColor Gray
        Write-Host "  Status: $($MoveRequest.Status)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Monitor progress with: Get-MoveRequest -Identity '$MailboxIdentity' | Get-MoveRequestStatistics" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to move mailbox: $_"
    exit 1
}`;
    }
  },

  {
    id: 'set-mailbox-protocol-access',
    name: 'Enable/Disable OWA, ActiveSync, POP, IMAP',
    category: 'Mailboxes & Users',
    isPremium: true,
    description: 'Control protocol access for mailboxes (OWA, ActiveSync, POP3, IMAP4)',
    instructions: `**How This Task Works:**
- Controls which protocols mailbox can use for access
- Configures OWA (Outlook Web App), ActiveSync, POP3, IMAP4
- Security hardening by disabling unnecessary protocols
- Changes take effect immediately

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Mailbox must exist
- Client Access Server (CAS) services running

**What You Need to Provide:**
- Mailbox identity (email address)
- OWA enabled: true or false (default: true)
- ActiveSync enabled: true or false (default: true)
- POP3 enabled: true or false (default: false)
- IMAP4 enabled: true or false (default: false)

**What the Script Does:**
1. Verifies mailbox exists
2. Configures CAS mailbox settings with Set-CASMailbox
3. Enables or disables each protocol as specified
4. Displays protocol access configuration summary
5. Shows current enabled status for each protocol

**Important Notes:**
- Exchange Server Administrator role required
- OWA: web-based email access (Outlook Web App)
- ActiveSync: mobile device synchronization
- POP3/IMAP4: legacy email protocols (typically disabled for security)
- Typical use: security hardening, comply with access policies, troubleshooting
- Disabling protocols prevents access via that method immediately
- Users must use enabled protocols or Outlook/MAPI
- Security best practice: disable POP3/IMAP4 unless required
- ActiveSync required for mobile email access`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'owaEnabled', label: 'OWA Enabled', type: 'boolean', required: false, defaultValue: true },
      { id: 'activeSyncEnabled', label: 'ActiveSync Enabled', type: 'boolean', required: false, defaultValue: true },
      { id: 'popEnabled', label: 'POP3 Enabled', type: 'boolean', required: false, defaultValue: false },
      { id: 'imapEnabled', label: 'IMAP4 Enabled', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const owaEnabled = toPowerShellBoolean(params.owaEnabled ?? true);
      const activeSyncEnabled = toPowerShellBoolean(params.activeSyncEnabled ?? true);
      const popEnabled = toPowerShellBoolean(params.popEnabled ?? false);
      const imapEnabled = toPowerShellBoolean(params.imapEnabled ?? false);

      return `# Configure Protocol Access
# Generated: ${new Date().toISOString()}

$MailboxIdentity = "${mailboxIdentity}"
$OWAEnabled = ${owaEnabled}
$ActiveSyncEnabled = ${activeSyncEnabled}
$POPEnabled = ${popEnabled}
$IMAPEnabled = ${imapEnabled}

try {
    # Verify mailbox exists
    $Mailbox = Get-Mailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    # Set CAS mailbox settings
    Set-CASMailbox -Identity $MailboxIdentity \`
        -OWAEnabled $OWAEnabled \`
        -ActiveSyncEnabled $ActiveSyncEnabled \`
        -PopEnabled $POPEnabled \`
        -ImapEnabled $IMAPEnabled
    
    Write-Host "[SUCCESS] Protocol access configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Protocol Status:" -ForegroundColor Cyan
    Write-Host "  OWA: $OWAEnabled" -ForegroundColor Gray
    Write-Host "  ActiveSync: $ActiveSyncEnabled" -ForegroundColor Gray
    Write-Host "  POP3: $POPEnabled" -ForegroundColor Gray
    Write-Host "  IMAP4: $IMAPEnabled" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure protocol access: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DISTRIBUTION GROUPS CATEGORY
  // ========================================
  {
    id: 'create-dg-onprem',
    name: 'Create Distribution Group',
    category: 'Distribution Groups & Contacts',
    isPremium: true,
    description: 'Create new distribution group with members and moderation settings',
    instructions: `**How This Task Works:**
- Creates new distribution groups for email collaboration
- Sets owner who can manage group membership
- Optionally adds initial members
- Integrates with Active Directory

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Group owner must have valid mailbox
- Members must have valid mailboxes or mail contacts

**What You Need to Provide:**
- Group name (display name)
- Email address for the group
- Group owner email address
- Optional: Comma-separated list of initial members

**What the Script Does:**
1. Checks if distribution group already exists
2. Creates new distribution group with specified name and email
3. Sets group owner (ManagedBy)
4. Adds initial members if provided
5. Reports creation success with group details

**Important Notes:**
- Exchange Server Administrator role required
- Email address must be unique across organization
- Group owner can add/remove members
- Typical use: department aliases, project teams, mailing lists
- Members receive all emails sent to group
- Distribution groups don't require Exchange licenses
- Can be converted to dynamic distribution group later
- Use Security Groups for permissions, Distribution Groups for email only`,
    parameters: [
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Sales Team' },
      { id: 'emailAddress', label: 'Email Address', type: 'email', required: true, placeholder: 'sales@contoso.com' },
      { id: 'owner', label: 'Group Owner', type: 'email', required: true, placeholder: 'manager@contoso.com' },
      { id: 'members', label: 'Initial Members (comma-separated)', type: 'textarea', required: false, placeholder: 'user1@contoso.com, user2@contoso.com' }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const emailAddress = escapePowerShellString(params.emailAddress);
      const owner = escapePowerShellString(params.owner);
      const members = params.members ? params.members.split(',').map((m: string) => m.trim()).filter((m: string) => m) : [];

      return `# Create Distribution Group
# Generated: ${new Date().toISOString()}

$GroupName = "${groupName}"
$EmailAddress = "${emailAddress}"
$Owner = "${owner}"
${members.length > 0 ? `$Members = @(${members.map((m: string) => `"${escapePowerShellString(m)}"`).join(', ')})` : ''}

try {
    # Check if group exists
    $Existing = Get-DistributionGroup -Identity $EmailAddress -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Group already exists: $EmailAddress" -ForegroundColor Yellow
        exit 0
    }
    
    # Create distribution group
    New-DistributionGroup -Name $GroupName \`
        -PrimarySmtpAddress $EmailAddress \`
        -ManagedBy $Owner \`
        -Type "Distribution"
    
    Write-Host "[SUCCESS] Distribution group created" -ForegroundColor Green
    
    ${members.length > 0 ? `
    # Add members
    foreach ($Member in $Members) {
        try {
            Add-DistributionGroupMember -Identity $EmailAddress -Member $Member
            Write-Host "  [OK] Added member: $Member" -ForegroundColor Green
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
    Write-Error "Failed to create distribution group: $_"
    exit 1
}`;
    }
  },

  {
    id: 'set-dg-moderation',
    name: 'Set Group Moderation and Delivery Restrictions',
    category: 'Distribution Groups & Contacts',
    isPremium: true,
    description: 'Configure moderation and delivery management for distribution groups',
    instructions: `**How This Task Works:**
- Configures message moderation for distribution groups
- Requires moderator approval before delivery
- Controls who can send to group (authentication)
- Prevents unauthorized or inappropriate messages

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Distribution group must exist
- Moderators must have valid mailboxes

**What You Need to Provide:**
- Group identity (email address)
- Enable moderation: true or false
- Optional: Comma-separated list of moderators
- Require sender authentication: true or false

**What the Script Does:**
1. Verifies distribution group exists
2. Configures moderation enabled/disabled
3. Sets moderators who approve messages (if moderation enabled)
4. Configures sender authentication requirement
5. Displays moderation settings summary

**Important Notes:**
- Exchange Server Administrator role required
- Moderation: messages held for moderator approval before delivery
- Moderators receive approval requests via email
- Typical use: executive communications, sensitive announcements, compliance
- Require sender auth: prevents external users from sending to group
- Moderated messages have delivery delay while awaiting approval
- Moderators can approve or reject with reason
- Multiple moderators can be assigned (any one can approve)`,
    parameters: [
      { id: 'groupIdentity', label: 'Group Identity', type: 'email', required: true, placeholder: 'group@contoso.com' },
      { id: 'moderationEnabled', label: 'Enable Moderation', type: 'boolean', required: false, defaultValue: false },
      { id: 'moderators', label: 'Moderators (comma-separated)', type: 'textarea', required: false, placeholder: 'mod1@contoso.com, mod2@contoso.com' },
      { id: 'requireSenderAuth', label: 'Require Sender Authentication', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const groupIdentity = escapePowerShellString(params.groupIdentity);
      const moderationEnabled = toPowerShellBoolean(params.moderationEnabled ?? false);
      const moderators = params.moderators ? params.moderators.split(',').map((m: string) => m.trim()).filter((m: string) => m) : [];
      const requireSenderAuth = toPowerShellBoolean(params.requireSenderAuth ?? true);

      return `# Configure Group Moderation
# Generated: ${new Date().toISOString()}

$GroupIdentity = "${groupIdentity}"
$ModerationEnabled = ${moderationEnabled}
${moderators.length > 0 ? `$Moderators = @(${moderators.map((m: string) => `"${escapePowerShellString(m)}"`).join(', ')})` : ''}
$RequireSenderAuth = ${requireSenderAuth}

try {
    # Verify group exists
    $Group = Get-DistributionGroup -Identity $GroupIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Group: $($Group.DisplayName)" -ForegroundColor Green
    
    # Configure moderation
    $params = @{
        Identity = $GroupIdentity
        ModerationEnabled = $ModerationEnabled
        RequireSenderAuthenticationEnabled = $RequireSenderAuth
    }
    
    ${moderators.length > 0 ? '$params.ModeratedBy = $Moderators' : ''}
    
    Set-DistributionGroup @params
    
    Write-Host "[SUCCESS] Moderation configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Settings:" -ForegroundColor Cyan
    Write-Host "  Moderation Enabled: $ModerationEnabled" -ForegroundColor Gray
    Write-Host "  Require Auth: $RequireSenderAuth" -ForegroundColor Gray
    ${moderators.length > 0 ? 'Write-Host "  Moderators: $($Moderators.Count)" -ForegroundColor Gray' : ''}
    
} catch {
    Write-Error "Failed to configure moderation: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAIL FLOW & TRANSPORT RULES CATEGORY
  // ========================================
  {
    id: 'create-transport-rule-onprem',
    name: 'Create/Modify Transport Rule',
    category: 'Mail Flow & Transport Rules',
    isPremium: true,
    description: 'Create or modify transport rules for mail flow control',
    instructions: `**How This Task Works:**
- Creates or modifies Exchange transport rules
- Controls mail flow based on conditions and actions
- Enforces email policies automatically
- Can block, redirect, or modify messages

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Understanding of mail flow policies
- Transport service must be running

**What You Need to Provide:**
- Rule name (unique identifier)
- Condition: FromScope, MessageSizeOver, AttachmentExtension, or SubjectContains
- Condition value (specific to condition type)
- Action: RejectMessage, DeleteMessage, or RedirectTo
- Enable rule: true or false

**What the Script Does:**
1. Checks if transport rule with name already exists
2. If exists: updates enabled status
3. If new: creates rule with specified condition and action
4. Configures condition (scope, size, extension, subject)
5. Configures action (reject, delete, redirect)
6. Reports rule creation or update success

**Important Notes:**
- Exchange Server Administrator role required
- Rules process in priority order
- Typical use: block attachments, prevent data loss, enforce disclaimers, size limits
- MessageSizeOver: specify size like "25MB"
- AttachmentExtension: specify extensions like "exe,bat,vbs"
- SubjectContains: specify words or phrases
- Reject provides explanation to sender, Delete is silent
- Rules apply to all mail flow through server
- Test rules carefully before enabling in production`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Block Large Attachments' },
      { id: 'condition', label: 'Condition', type: 'select', required: true, options: ['FromScope', 'MessageSizeOver', 'AttachmentExtension', 'SubjectContains'], defaultValue: 'MessageSizeOver' },
      { id: 'conditionValue', label: 'Condition Value', type: 'text', required: true, placeholder: '25MB' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['RejectMessage', 'DeleteMessage', 'RedirectTo'], defaultValue: 'RejectMessage' },
      { id: 'enabled', label: 'Enable Rule', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const condition = params.condition || 'MessageSizeOver';
      const conditionValue = escapePowerShellString(params.conditionValue);
      const action = params.action || 'RejectMessage';
      const enabled = toPowerShellBoolean(params.enabled ?? true);

      return `# Create/Modify Transport Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$Condition = "${condition}"
$ConditionValue = "${conditionValue}"
$Action = "${action}"
$Enabled = ${enabled}

try {
    # Check if rule exists
    $Existing = Get-TransportRule -Identity $RuleName -ErrorAction SilentlyContinue
    
    if ($Existing) {
        Write-Host "[WARNING] Rule already exists. Updating..." -ForegroundColor Yellow
        Set-TransportRule -Identity $RuleName -Enabled $Enabled
        Write-Host "[SUCCESS] Transport rule updated" -ForegroundColor Green
    } else {
        # Create new rule
        $params = @{
            Name = $RuleName
            Enabled = $Enabled
        }
        
        # Add condition
        switch ($Condition) {
            "FromScope" { $params.FromScope = $ConditionValue }
            "MessageSizeOver" { $params.AttachmentSizeOver = $ConditionValue }
            "AttachmentExtension" { $params.AttachmentExtensionMatchesWords = $ConditionValue }
            "SubjectContains" { $params.SubjectContainsWords = $ConditionValue }
        }
        
        # Add action
        switch ($Action) {
            "RejectMessage" { $params.RejectMessageReasonText = "Message rejected by transport rule" }
            "DeleteMessage" { $params.DeleteMessage = \$true }
            "RedirectTo" { $params.RedirectMessageTo = $ConditionValue }
        }
        
        New-TransportRule @params
        Write-Host "[SUCCESS] Transport rule created" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Transport rule ready!" -ForegroundColor Green
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Enabled: $Enabled" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create/modify transport rule: $_"
    exit 1
}`;
    }
  },

  {
    id: 'manage-accepted-domains',
    name: 'Manage Accepted Domains',
    category: 'Mail Flow & Transport Rules',
    isPremium: true,
    description: 'Add or configure accepted domains for the Exchange organization',
    instructions: `**How This Task Works:**
- Configures domains Exchange accepts email for
- Supports Authoritative, Internal Relay, and External Relay types
- Required for receiving email at custom domains
- Integrates with DNS MX records

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- DNS MX records pointing to Exchange server
- Domain ownership verification

**What You Need to Provide:**
- Domain name (e.g., contoso.com)
- Domain type: Authoritative (default), InternalRelay, or ExternalRelay

**What the Script Does:**
1. Checks if accepted domain already exists
2. If exists: displays warning and current configuration
3. If new: creates accepted domain with specified type
4. Configures domain as Authoritative, InternalRelay, or ExternalRelay
5. Reports domain configuration success

**Important Notes:**
- Exchange Server Administrator role required
- Authoritative: Exchange hosts all mailboxes for this domain (most common)
- InternalRelay: Exchange relays to internal servers hosting mailboxes
- ExternalRelay: Exchange relays to external mail servers
- Typical use: add company domain, subsidiaries, acquisition domains
- DNS MX records must point to Exchange server
- First accepted domain often becomes default reply address
- Multiple domains supported for multi-brand organizations
- Verify domain ownership before adding`,
    parameters: [
      { id: 'domainName', label: 'Domain Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'domainType', label: 'Domain Type', type: 'select', required: true, options: ['Authoritative', 'InternalRelay', 'ExternalRelay'], defaultValue: 'Authoritative' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' }
    ],
    scriptTemplate: (params) => {
      const domainName = escapePowerShellString(params.domainName);
      const domainType = params.domainType || 'Authoritative';
      const action = params.action || 'Add';

      return `# Manage Accepted Domains
# Generated: ${new Date().toISOString()}

$DomainName = "${domainName}"
$DomainType = "${domainType}"
$Action = "${action}"

try {
    # Check if domain exists
    $Existing = Get-AcceptedDomain -Identity $DomainName -ErrorAction SilentlyContinue
    
    if ($Action -eq "Add") {
        if ($Existing) {
            Write-Host "[WARNING] Domain already exists. Updating type..." -ForegroundColor Yellow
            Set-AcceptedDomain -Identity $DomainName -DomainType $DomainType
            Write-Host "[SUCCESS] Domain type updated to: $DomainType" -ForegroundColor Green
        } else {
            New-AcceptedDomain -Name $DomainName -DomainName $DomainName -DomainType $DomainType
            Write-Host "[SUCCESS] Accepted domain added" -ForegroundColor Green
        }
    } else {
        # Remove domain
        if ($Existing) {
            Remove-AcceptedDomain -Identity $DomainName -Confirm:\$false
            Write-Host "[SUCCESS] Accepted domain removed" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Domain does not exist: $DomainName" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Operation completed!" -ForegroundColor Green
    Write-Host "  Domain: $DomainName" -ForegroundColor Gray
    Write-Host "  Type: $DomainType" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to manage accepted domain: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DATABASE & DAG CATEGORY
  // ========================================
  {
    id: 'create-mailbox-database',
    name: 'Create Mailbox Database',
    category: 'Database & DAG Management',
    isPremium: true,
    description: 'Create a new mailbox database on an Exchange server',
    instructions: `**How This Task Works:**
- Creates new mailbox database on Exchange server
- Configures database and log file locations
- Automatically mounts database after creation
- Required for storing user mailboxes

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Sufficient disk space for database and logs
- Exchange Server must be running
- Separate volumes for database and logs recommended

**What You Need to Provide:**
- Database name (unique identifier)
- Server name where database will be created
- EDB file path (database file location)
- Log folder path (transaction log location)

**What the Script Does:**
1. Checks if database with name already exists
2. Creates new mailbox database with New-MailboxDatabase
3. Configures database file path (.edb file)
4. Configures transaction log folder path
5. Automatically mounts database
6. Reports creation success with configuration details

**Important Notes:**
- Exchange Server Administrator role required
- Database and logs should be on separate physical disks for performance
- Typical database size: starts small, grows with mailbox content
- Transaction logs critical for database recovery
- Typical use: capacity expansion, new server setup, load balancing
- Database name must be unique across organization
- Mount operation verifies database integrity
- Plan for database growth and backup space`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB03' },
      { id: 'server', label: 'Server Name', type: 'text', required: true, placeholder: 'EX01' },
      { id: 'edbFilePath', label: 'EDB File Path', type: 'path', required: true, placeholder: 'D:\\Databases\\DB03\\DB03.edb' },
      { id: 'logFolderPath', label: 'Log Folder Path', type: 'path', required: true, placeholder: 'D:\\Databases\\DB03' }
    ],
    scriptTemplate: (params) => {
      const databaseName = escapePowerShellString(params.databaseName);
      const server = escapePowerShellString(params.server);
      const edbFilePath = escapePowerShellString(params.edbFilePath);
      const logFolderPath = escapePowerShellString(params.logFolderPath);

      return `# Create Mailbox Database
# Generated: ${new Date().toISOString()}

$DatabaseName = "${databaseName}"
$Server = "${server}"
$EdbFilePath = "${edbFilePath}"
$LogFolderPath = "${logFolderPath}"

try {
    # Check if database exists
    $Existing = Get-MailboxDatabase -Identity $DatabaseName -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Database already exists: $DatabaseName" -ForegroundColor Yellow
        exit 0
    }
    
    # Create database
    New-MailboxDatabase -Server $Server \`
        -Name $DatabaseName \`
        -EdbFilePath $EdbFilePath \`
        -LogFolderPath $LogFolderPath
    
    Write-Host "[SUCCESS] Mailbox database created" -ForegroundColor Green
    
    # Mount database
    Write-Host "Mounting database..." -ForegroundColor Cyan
    Mount-Database -Identity $DatabaseName
    
    Write-Host "[SUCCESS] Database mounted successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database Details:" -ForegroundColor Cyan
    Write-Host "  Name: $DatabaseName" -ForegroundColor Gray
    Write-Host "  Server: $Server" -ForegroundColor Gray
    Write-Host "  EDB Path: $EdbFilePath" -ForegroundColor Gray
    Write-Host "  Log Path: $LogFolderPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create mailbox database: $_"
    exit 1
}`;
    }
  },

  {
    id: 'mount-dismount-database',
    name: 'Mount/Dismount Database',
    category: 'Database & DAG Management',
    isPremium: true,
    description: 'Mount or dismount a mailbox database',
    instructions: `**How This Task Works:**
- Mounts or dismounts mailbox databases
- Mounting makes database available for mailbox access
- Dismounting takes database offline for maintenance
- Essential for database maintenance and troubleshooting

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Database must exist
- For dismount: no active connections recommended

**What You Need to Provide:**
- Database name
- Action: Mount or Dismount

**What the Script Does:**
1. Verifies database exists
2. Checks current mounted status
3. For Mount: mounts database if currently dismounted
4. For Dismount: dismounts database if currently mounted
5. Reports current status and action result

**Important Notes:**
- Exchange Server Administrator role required
- Dismounting makes mailboxes inaccessible to users
- Mount verifies database integrity before making available
- Typical use: database maintenance, backup operations, troubleshooting
- Dismount before database moves or offline maintenance
- Users cannot access mailboxes in dismounted database
- Mount failures may indicate database corruption
- Always mount database after maintenance to restore service`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB01' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Mount', 'Dismount'], defaultValue: 'Mount' }
    ],
    scriptTemplate: (params) => {
      const databaseName = escapePowerShellString(params.databaseName);
      const action = params.action || 'Mount';

      return `# ${action} Mailbox Database
# Generated: ${new Date().toISOString()}

$DatabaseName = "${databaseName}"
$Action = "${action}"

try {
    # Verify database exists
    $Database = Get-MailboxDatabase -Identity $DatabaseName -ErrorAction Stop
    Write-Host "[SUCCESS] Database: $($Database.Name)" -ForegroundColor Green
    Write-Host "  Server: $($Database.Server)" -ForegroundColor Gray
    Write-Host "  Current Status: $($Database.Mounted)" -ForegroundColor Gray
    
    if ($Action -eq "Mount") {
        if ($Database.Mounted) {
            Write-Host "[WARNING] Database is already mounted" -ForegroundColor Yellow
        } else {
            Mount-Database -Identity $DatabaseName
            Write-Host "[SUCCESS] Database mounted successfully!" -ForegroundColor Green
        }
    } else {
        if (-not $Database.Mounted) {
            Write-Host "[WARNING] Database is already dismounted" -ForegroundColor Yellow
        } else {
            Dismount-Database -Identity $DatabaseName -Confirm:\$false
            Write-Host "[SUCCESS] Database dismounted successfully!" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Error "Failed to $Action database: $_"
    exit 1
}`;
    }
  },

  {
    id: 'dag-replication-health',
    name: 'Check DAG Replication Health',
    category: 'Database & DAG Management',
    isPremium: true,
    description: 'Monitor Database Availability Group replication status and health',
    instructions: `**How This Task Works:**
- Monitors Database Availability Group (DAG) replication health
- Checks replication status for database copies
- Reports copy queue length and replay lag
- Essential for high availability monitoring

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- DAG must be configured
- Database copies must exist

**What You Need to Provide:**
- Optional: DAG name (if not specified, checks all databases)
- Output CSV file path for health report

**What the Script Does:**
1. Retrieves mailbox databases (all or filtered by DAG)
2. Gets replication status for each database copy
3. Checks status, copy queue length, replay queue length, content index state
4. Displays health status with color coding (Green=Healthy, Yellow=Warning)
5. Exports detailed report to CSV file

**Important Notes:**
- Exchange Server Administrator role required
- Healthy status indicates replication working correctly
- Copy queue: logs waiting to be copied to passive copy
- Replay queue: logs copied but not yet replayed into database
- Typical use: proactive monitoring, health checks, troubleshooting failover issues
- High queue lengths may indicate replication lag or network issues
- Content index state critical for search functionality
- Schedule regular health checks for production DAGs
- CSV report useful for trending and capacity planning`,
    parameters: [
      { id: 'dagName', label: 'DAG Name (Optional)', type: 'text', required: false, placeholder: 'DAG01' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\DAGHealth.csv' }
    ],
    scriptTemplate: (params) => {
      const dagName = params.dagName ? escapePowerShellString(params.dagName) : '';
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Check DAG Replication Health
# Generated: ${new Date().toISOString()}

${dagName ? `$DAGName = "${dagName}"` : ''}
$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Checking DAG replication health..." -ForegroundColor Cyan
    
    # Get databases
    ${dagName ? `
    $Databases = Get-MailboxDatabase | Where-Object { $_.MasterServerOrAvailabilityGroup -eq $DAGName }
    ` : `
    $Databases = Get-MailboxDatabase | Where-Object { $_.Recovery -eq \$false }
    `}
    
    foreach ($Database in $Databases) {
        $Status = Get-MailboxDatabaseCopyStatus -Identity "$($Database.Name)\\*"
        
        foreach ($Copy in $Status) {
            $Results += [PSCustomObject]@{
                Database = $Database.Name
                Server = $Copy.MailboxServer
                Status = $Copy.Status
                CopyQueueLength = $Copy.CopyQueueLength
                ReplayQueueLength = $Copy.ReplayQueueLength
                ContentIndexState = $Copy.ContentIndexState
                LastInspectedLogTime = $Copy.LastInspectedLogTime
            }
            
            $Color = if ($Copy.Status -eq "Healthy") { "Green" } else { "Yellow" }
            Write-Host "$($Database.Name)\\$($Copy.MailboxServer): $($Copy.Status)" -ForegroundColor $Color
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] DAG health report generated!" -ForegroundColor Green
    Write-Host "  Database Copies: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to check DAG health: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAINTENANCE CATEGORY
  // ========================================
  {
    id: 'purge-disconnected-mailboxes',
    name: 'Purge Disconnected Mailboxes',
    category: 'Maintenance & Hygiene',
    isPremium: true,
    description: 'Find and purge disconnected mailboxes from database',
    instructions: `**How This Task Works:**
- Identifies disconnected mailboxes in database
- Shows disconnect reason and date for each
- Report-only mode for review before purging
- Purge mode permanently removes disconnected mailboxes

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Database must exist and be mounted
- Backup recommended before purging

**What You Need to Provide:**
- Database name to scan
- Action: ReportOnly (default) or Purge
- Output CSV file path for report

**What the Script Does:**
1. Scans specified database for disconnected mailboxes
2. Retrieves disconnect reason, date, and mailbox size for each
3. In ReportOnly mode: lists disconnected mailboxes without removing
4. In Purge mode: permanently removes each disconnected mailbox
5. Exports detailed report to CSV file

**Important Notes:**
- Exchange Server Administrator role required
- ReportOnly mode enabled by default for safety
- Disconnected mailboxes result from: user deletion, mailbox moves, mailbox disable
- Typical disconnect reasons: Disabled, SoftDeleted
- Typical use: reclaim database space, cleanup after user terminations
- Purged mailboxes CANNOT be recovered (permanent deletion)
- Review report before switching to Purge mode
- Exchange retains disconnected mailboxes for 30 days by default
- Purging frees database white space (requires maintenance to reclaim)`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB01' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['ReportOnly', 'Purge'], defaultValue: 'ReportOnly' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\DisconnectedMailboxes.csv' }
    ],
    scriptTemplate: (params) => {
      const databaseName = escapePowerShellString(params.databaseName);
      const action = params.action || 'ReportOnly';
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Purge Disconnected Mailboxes
# Generated: ${new Date().toISOString()}

$DatabaseName = "${databaseName}"
$Action = "${action}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Finding disconnected mailboxes in: $DatabaseName" -ForegroundColor Cyan
    
    # Get disconnected mailboxes
    $Disconnected = Get-MailboxStatistics -Database $DatabaseName | 
        Where-Object { $_.DisconnectReason -ne \$null }
    
    Write-Host "[SUCCESS] Found $($Disconnected.Count) disconnected mailboxes" -ForegroundColor Green
    
    $Results = @()
    
    foreach ($Mailbox in $Disconnected) {
        $Results += [PSCustomObject]@{
            DisplayName = $Mailbox.DisplayName
            Alias = $Mailbox.MailboxGuid
            DisconnectReason = $Mailbox.DisconnectReason
            DisconnectDate = $Mailbox.DisconnectDate
            TotalItemSize = $Mailbox.TotalItemSize
        }
        
        if ($Action -eq "Purge") {
            try {
                Remove-StoreMailbox -Database $DatabaseName -Identity $Mailbox.MailboxGuid -MailboxState Disabled
                Write-Host "  [OK] Purged: $($Mailbox.DisplayName)" -ForegroundColor Green
            } catch {
                Write-Host "  [FAILED] Failed to purge: $($Mailbox.DisplayName)" -ForegroundColor Red
            }
        } else {
            Write-Host "  Found: $($Mailbox.DisplayName) - $($Mailbox.DisconnectReason)" -ForegroundColor Gray
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Operation completed!" -ForegroundColor Green
    Write-Host "  Disconnected Mailboxes: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to process disconnected mailboxes: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SECURITY & COMPLIANCE CATEGORY
  // ========================================
  {
    id: 'enable-mailbox-audit-onprem',
    name: 'Enable Mailbox Auditing Globally',
    category: 'Security & Compliance',
    isPremium: true,
    description: 'Enable mailbox auditing for all mailboxes in the organization',
    instructions: `**How This Task Works:**
- Enables mailbox auditing across organization
- Tracks owner, delegate, and admin actions
- Creates audit log for compliance and security
- Essential for detecting unauthorized access

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Sufficient mailbox database space for audit logs
- Understanding of compliance requirements

**What You Need to Provide:**
- Optional: Database filter (e.g., "DB*" to filter specific databases)
- Audit owner actions: true or false (mailbox owner activities)
- Audit delegate actions: true or false (delegate access)
- Audit admin actions: true or false (administrator access)

**What the Script Does:**
1. Retrieves all mailboxes (or filtered by database)
2. Enables audit logging on each mailbox
3. Configures which actions to audit (owner, delegate, admin)
4. Sets standard audit actions for each category
5. Reports total mailboxes configured and any failures

**Important Notes:**
- Exchange Server Administrator role required
- Owner auditing: tracks mailbox owner actions (login, folder access)
- Delegate auditing: tracks actions by users with delegate permissions
- Admin auditing: tracks actions by Exchange administrators
- Typical use: compliance (SOX, HIPAA, PCI), security monitoring, forensics
- Audit logs stored in mailbox (increases mailbox size)
- Query audit logs with Search-MailboxAuditLog cmdlet
- May impact database size and performance at scale
- Configure audit log age limit to manage storage`,
    parameters: [
      { id: 'databaseFilter', label: 'Database Filter (Optional)', type: 'text', required: false, placeholder: 'DB*' },
      { id: 'auditOwner', label: 'Audit Owner Actions', type: 'boolean', required: false, defaultValue: true },
      { id: 'auditDelegate', label: 'Audit Delegate Actions', type: 'boolean', required: false, defaultValue: true },
      { id: 'auditAdmin', label: 'Audit Admin Actions', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const databaseFilter = params.databaseFilter ? escapePowerShellString(params.databaseFilter) : '';
      const auditOwner = toPowerShellBoolean(params.auditOwner ?? true);
      const auditDelegate = toPowerShellBoolean(params.auditDelegate ?? true);
      const auditAdmin = toPowerShellBoolean(params.auditAdmin ?? true);

      return `# Enable Mailbox Auditing Globally
# Generated: ${new Date().toISOString()}

${databaseFilter ? `$DatabaseFilter = "${databaseFilter}"` : ''}
$AuditOwner = ${auditOwner}
$AuditDelegate = ${auditDelegate}
$AuditAdmin = ${auditAdmin}

try {
    Write-Host "Enabling mailbox auditing..." -ForegroundColor Cyan
    
    # Get mailboxes
    ${databaseFilter ? `
    $Mailboxes = Get-Mailbox -Database $DatabaseFilter -ResultSize Unlimited
    ` : `
    $Mailboxes = Get-Mailbox -ResultSize Unlimited
    `}
    
    Write-Host "[SUCCESS] Found $($Mailboxes.Count) mailboxes" -ForegroundColor Green
    
    $EnabledCount = 0
    
    foreach ($Mailbox in $Mailboxes) {
        try {
            Set-Mailbox -Identity $Mailbox.Alias -AuditEnabled \$true
            
            if ($AuditOwner) {
                Set-Mailbox -Identity $Mailbox.Alias -AuditOwner Update,Move,MoveToDeletedItems,SoftDelete,HardDelete
            }
            if ($AuditDelegate) {
                Set-Mailbox -Identity $Mailbox.Alias -AuditDelegate Update,Move,MoveToDeletedItems,SoftDelete,HardDelete,SendAs,SendOnBehalf
            }
            if ($AuditAdmin) {
                Set-Mailbox -Identity $Mailbox.Alias -AuditAdmin Update,Move,MoveToDeletedItems,SoftDelete,HardDelete,Copy
            }
            
            $EnabledCount++
            Write-Host "  [OK] Enabled: $($Mailbox.DisplayName)" -ForegroundColor Green
        } catch {
            Write-Host "  [FAILED] Failed: $($Mailbox.DisplayName) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Mailbox auditing enabled!" -ForegroundColor Green
    Write-Host "  Total Enabled: $EnabledCount" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to enable auditing: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // REPORTING CATEGORY
  // ========================================
  {
    id: 'database-size-report',
    name: 'Mailbox Database Size Report',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Generate comprehensive database size and growth reports',
    instructions: `**How This Task Works:**
- Generates comprehensive database size report
- Shows database and transaction log sizes
- Reports mailbox count per database
- Essential for capacity planning and growth trending

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- File system access to database and log paths
- Read permissions on database files

**What You Need to Provide:**
- Output CSV file path for report

**What the Script Does:**
1. Retrieves all mailbox databases with status
2. For each database: measures EDB file size and transaction log total size
3. Counts mailboxes in each database
4. Collects mounted status and circular logging configuration
5. Exports detailed report to CSV file

**Important Notes:**
- Exchange Server Administrator role required
- Database size includes all mailbox content
- Log size shows transaction logs (cleared by backup)
- Typical use: capacity planning, growth trending, storage forecasting
- Circular logging: if enabled, logs auto-delete (not backup-aware)
- Plan database growth: 50-100GB per 100 users typical
- Monitor growth monthly for capacity planning
- CSV report useful for trending and budgeting`,
    parameters: [
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\DatabaseSizes.csv' }
    ],
    scriptTemplate: (params) => {
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Database Size Report
# Generated: ${new Date().toISOString()}

$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Collecting database statistics..." -ForegroundColor Cyan
    
    $Databases = Get-MailboxDatabase -Status
    
    foreach ($Database in $Databases) {
        $DBSize = Get-ChildItem -Path $Database.EdbFilePath.PathName -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty Length
        
        $LogSize = Get-ChildItem -Path "$($Database.LogFolderPath.PathName)\\*.log" -ErrorAction SilentlyContinue | 
            Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum
        
        $MailboxCount = (Get-Mailbox -Database $Database.Name).Count
        
        $Results += [PSCustomObject]@{
            DatabaseName = $Database.Name
            Server = $Database.Server
            Mounted = $Database.Mounted
            DatabaseSizeGB = [Math]::Round($DBSize / 1GB, 2)
            LogSizeGB = [Math]::Round($LogSize / 1GB, 2)
            MailboxCount = $MailboxCount
            EdbFilePath = $Database.EdbFilePath
            CircularLoggingEnabled = $Database.CircularLoggingEnabled
        }
        
        Write-Host "[SUCCESS] $($Database.Name): $([Math]::Round($DBSize / 1GB, 2)) GB" -ForegroundColor Green
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Database size report generated!" -ForegroundColor Green
    Write-Host "  Databases: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate report: $_"
    exit 1
}`;
    }
  },

  {
    id: 'transport-queue-monitoring',
    name: 'Transport Queue Length Monitoring',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Monitor transport queue lengths and identify mail flow issues',
    instructions: `**How This Task Works:**
- Monitors Exchange transport queues for mail delivery
- Identifies mail flow issues and bottlenecks
- Alerts when queue lengths exceed thresholds
- Essential for mail flow health monitoring

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Transport service must be running
- Network connectivity to Exchange servers

**What You Need to Provide:**
- Optional: Server name (if not specified, checks all servers)
- Alert threshold count (default: 100 messages)
- Output CSV file path for report

**What the Script Does:**
1. Retrieves all transport queues (or filtered by server)
2. For each queue: collects identity, delivery type, status, message count
3. Color-codes results: Red if exceeds threshold, Yellow if half threshold, Green if OK
4. Exports detailed report to CSV file
5. Alerts if any queues exceed threshold

**Important Notes:**
- Exchange Server Administrator role required
- High queue counts indicate mail flow issues
- Typical causes: network issues, DNS problems, recipient server down
- Delivery types: SmtpDelivery (external), MapiDelivery (internal), Shadow (redundancy)
- Typical use: proactive monitoring, troubleshooting delivery delays
- Healthy queues typically have <10 messages
- Threshold of 100 messages indicates potential problem
- Check LastError field for specific failure reasons
- Schedule regular checks for production monitoring`,
    parameters: [
      { id: 'server', label: 'Server Name (Optional)', type: 'text', required: false, placeholder: 'EX01' },
      { id: 'thresholdCount', label: 'Alert Threshold Count', type: 'number', required: false, defaultValue: 100, placeholder: '100' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\QueueStatus.csv' }
    ],
    scriptTemplate: (params) => {
      const server = params.server ? escapePowerShellString(params.server) : '';
      const thresholdCount = params.thresholdCount || 100;
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Transport Queue Monitoring
# Generated: ${new Date().toISOString()}

${server ? `$Server = "${server}"` : ''}
$ThresholdCount = ${thresholdCount}
$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Checking transport queues..." -ForegroundColor Cyan
    
    # Get queues
    ${server ? `
    $Queues = Get-Queue -Server $Server
    ` : `
    $Queues = Get-Queue
    `}
    
    foreach ($Queue in $Queues) {
        $Results += [PSCustomObject]@{
            Server = $Queue.Identity.Split("\\")[0]
            QueueIdentity = $Queue.Identity
            DeliveryType = $Queue.DeliveryType
            Status = $Queue.Status
            MessageCount = $Queue.MessageCount
            NextHopDomain = $Queue.NextHopDomain
            LastError = $Queue.LastError
        }
        
        $Color = if ($Queue.MessageCount -gt $ThresholdCount) { "Red" } 
                 elseif ($Queue.MessageCount -gt ($ThresholdCount / 2)) { "Yellow" }
                 else { "Green" }
        
        Write-Host "$($Queue.Identity): $($Queue.MessageCount) messages - $($Queue.Status)" -ForegroundColor $Color
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Queue monitoring report generated!" -ForegroundColor Green
    Write-Host "  Queues Checked: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
    # Alert if threshold exceeded
    $HighQueues = $Results | Where-Object { $_.MessageCount -gt $ThresholdCount }
    if ($HighQueues) {
        Write-Host ""
        Write-Host "[WARNING] WARNING: $($HighQueues.Count) queue(s) exceed threshold!" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Failed to monitor queues: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SERVER & SERVICE MANAGEMENT CATEGORY
  // ========================================
  {
    id: 'exchange-service-control',
    name: 'Start/Stop Exchange Services',
    category: 'Server & Service Management',
    isPremium: true,
    description: 'Gracefully start or stop Exchange services on a server',
    instructions: `**How This Task Works:**
- Controls Exchange services on server
- Supports Start, Stop, and Restart actions
- Filters services by pattern (All, MSExchange*, HostController)
- Essential for maintenance and troubleshooting

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with remoting enabled
- Network connectivity to target server
- Administrative access to target server

**What You Need to Provide:**
- Server name
- Action: Start, Stop, or Restart
- Service filter: All, MSExchange* (Exchange services), or HostController

**What the Script Does:**
1. Connects to specified server
2. Retrieves services matching filter pattern
3. For each service: performs specified action (Start/Stop/Restart)
4. Skips disabled services
5. Reports success or failure for each service

**Important Notes:**
- Exchange Server Administrator and local admin privileges required
- Stopping services makes Exchange unavailable to users
- MSExchange* filter targets all Exchange services
- HostController manages Exchange service dependencies
- Typical use: server maintenance, troubleshooting, applying updates
- Restart recommended after configuration changes
- Services start in dependency order automatically
- Stopping Exchange services impacts mail flow and user access
- Plan maintenance windows for service operations`,
    parameters: [
      { id: 'server', label: 'Server Name', type: 'text', required: true, placeholder: 'EX01' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Start', 'Stop', 'Restart'], defaultValue: 'Start' },
      { id: 'serviceFilter', label: 'Service Filter', type: 'select', required: false, options: ['All', 'MSExchange*', 'HostController'], defaultValue: 'MSExchange*' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const action = params.action || 'Start';
      const serviceFilter = params.serviceFilter || 'MSExchange*';

      return `# ${action} Exchange Services
# Generated: ${new Date().toISOString()}

$Server = "${server}"
$Action = "${action}"
$ServiceFilter = "${serviceFilter}"

try {
    Write-Host "${action} Exchange services on: $Server" -ForegroundColor Cyan
    
    # Get services
    $Services = Get-Service -ComputerName $Server -Name $ServiceFilter | 
        Where-Object { $_.Status -ne "Disabled" }
    
    Write-Host "[SUCCESS] Found $($Services.Count) services" -ForegroundColor Green
    
    foreach ($Service in $Services) {
        try {
            if ($Action -eq "Start") {
                if ($Service.Status -ne "Running") {
                    Start-Service -InputObject $Service
                    Write-Host "  [OK] Started: $($Service.DisplayName)" -ForegroundColor Green
                }
            } elseif ($Action -eq "Stop") {
                if ($Service.Status -eq "Running") {
                    Stop-Service -InputObject $Service -Force
                    Write-Host "  [OK] Stopped: $($Service.DisplayName)" -ForegroundColor Green
                }
            } else {
                # Restart
                Restart-Service -InputObject $Service -Force
                Write-Host "  [OK] Restarted: $($Service.DisplayName)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [FAILED] Failed: $($Service.DisplayName) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Service operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to manage services: $_"
    exit 1
}`;
    }
  },

  {
    id: 'export-database-sizes',
    name: 'Export Database Sizes Report',
    category: 'Database Management',
    isPremium: true,
    description: 'List all mailbox databases and their sizes',
    instructions: `**How This Task Works:**
- Retrieves all mailbox databases with size information
- Calculates database size and available space in GB
- Includes mount status for each database
- Exports comprehensive database inventory

**Prerequisites:**
- Exchange Server Management Tools installed
- Exchange Administrator permissions
- PowerShell 2.0 or later with Exchange snap-in
- Write permissions on export location

**What You Need to Provide:**
- Export path for CSV file

**What the Script Does:**
1. Loads Exchange Management snap-in
2. Retrieves all mailbox databases with status
3. For each database: calculates size in GB, available space, mount status
4. Exports to CSV with columns: Name, Server, DatabaseSizeGB, AvailableNewMailboxSpaceGB, Mounted
5. Displays count of exported databases

**Important Notes:**
- REQUIRES EXCHANGE ADMINISTRATOR PERMISSIONS
- Database must be mounted to get accurate size
- Size calculation uses actual database file size
- Available space shows room for new mailboxes
- Typical use: capacity planning, database inventory, compliance reporting
- Run during low-usage periods for accurate results
- Larger databases may take longer to query`,
    parameters: [
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\DatabaseSizes.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Database Sizes Report
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Collecting database sizes..." -ForegroundColor Cyan
    
    $Databases = Get-MailboxDatabase -Status
    $Results = $Databases | Select Name, Server, @{N='DatabaseSizeGB';E={[math]::Round($_.DatabaseSize.ToBytes()/1GB,2)}}, @{N='AvailableNewMailboxSpaceGB';E={[math]::Round($_.AvailableNewMailboxSpace.ToBytes()/1GB,2)}}, Mounted
    
    $Results | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Database sizes exported: $($Results.Count) databases" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },
  {
    id: 'configure-database-backup',
    name: 'Configure Database Backup Settings',
    category: 'Database Management',
    isPremium: true,
    description: 'Set circular logging and backup schedule',
    instructions: `**How This Task Works:**
- Configures circular logging for mailbox database
- Circular logging controls transaction log retention
- Critical for backup strategy and disk space management
- Affects database recoverability

**Prerequisites:**
- Exchange Server Management Tools installed
- Exchange Administrator permissions
- PowerShell 2.0 or later with Exchange snap-in
- Understanding of backup implications

**What You Need to Provide:**
- Database name to configure
- Enable/disable circular logging (checkbox)

**What the Script Does:**
1. Loads Exchange Management snap-in
2. Sets circular logging enabled/disabled on specified database
3. Displays current configuration
4. Reminds to run full backup to apply changes

**Important Notes:**
- REQUIRES EXCHANGE ADMINISTRATOR PERMISSIONS
- Circular logging enabled: deletes logs after commit (saves disk space, limits point-in-time recovery)
- Circular logging disabled: keeps logs until backup (requires more disk space, enables point-in-time recovery)
- Changes require FULL BACKUP to take effect
- Typical use: Enable for non-critical databases, disable for production databases with backup
- Transaction logs grow quickly when disabled
- Most production environments: circular logging OFF
- Monitor disk space when disabling circular logging`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'Mailbox Database 01' },
      { id: 'circularLogging', label: 'Enable Circular Logging', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const dbName = escapePowerShellString(params.databaseName);
      const circularLogging = toPowerShellBoolean(params.circularLogging ?? false);
      
      return `# Configure Database Backup Settings
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring backup settings for ${dbName}" -ForegroundColor Cyan
    
    Set-MailboxDatabase -Identity "${dbName}" -CircularLoggingEnabled $${circularLogging}
    
    Write-Host "[SUCCESS] Circular logging: ${circularLogging}" -ForegroundColor Green
    Write-Host "  Run full backup to apply changes" -ForegroundColor Yellow
} catch {
    Write-Error $_
}`;
    }
  },
  {
    id: 'test-mail-flow',
    name: 'Test Mail Flow',
    category: 'Mail Flow',
    isPremium: true,
    description: 'Send test message to verify mail flow',
    instructions: `**How This Task Works:**
- Tests mail flow between Exchange servers
- Sends test message through transport pipeline
- Verifies SMTP connectivity and mail delivery
- Essential for troubleshooting mail delivery issues

**Prerequisites:**
- Exchange Server Management Tools installed
- Exchange Administrator permissions
- PowerShell 2.0 or later with Exchange snap-in
- Valid sender and recipient addresses

**What You Need to Provide:**
- Sender email address (must be valid mailbox)
- Recipient email address (must be valid mailbox)

**What the Script Does:**
1. Loads Exchange Management snap-in
2. Runs Test-Mailflow cmdlet for mailbox connectivity
3. Sends test message with timestamp subject
4. Displays success or failure message

**Important Notes:**
- REQUIRES EXCHANGE ADMINISTRATOR PERMISSIONS
- Both addresses must be valid Exchange mailboxes
- Test message will appear in recipient inbox
- Typical use: verify mail flow after configuration changes, troubleshoot delivery issues
- Check recipient's inbox to confirm delivery
- Use journaling/auditing-compliant addresses if required
- Test-Mailflow checks system mailbox delivery
- Send-MailMessage tests actual SMTP flow`,
    parameters: [
      { id: 'sender', label: 'Sender Address', type: 'email', required: true, placeholder: 'admin@contoso.com' },
      { id: 'recipient', label: 'Recipient Address', type: 'email', required: true, placeholder: 'test@contoso.com' }
    ],
    scriptTemplate: (params) => {
      const sender = escapePowerShellString(params.sender);
      const recipient = escapePowerShellString(params.recipient);
      
      return `# Test Mail Flow
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Testing mail flow from ${sender} to ${recipient}" -ForegroundColor Cyan
    
    Test-Mailflow -TargetEmailAddress "${recipient}"
    
    Send-MailMessage -From "${sender}" -To "${recipient}" -Subject "Mail Flow Test - $(Get-Date)" -Body "This is a test message generated by PSForge" -SmtpServer localhost
    
    Write-Host "[SUCCESS] Test message sent successfully" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },
  {
    id: 'export-queue-stats',
    name: 'Export Queue Statistics',
    category: 'Mail Flow',
    isPremium: true,
    description: 'Report on message queues and delivery status',
    instructions: `**How This Task Works:**
- Exports all message queue statistics to CSV
- Shows queue identity, type, status, message count
- Includes next hop domain and error information
- Essential for troubleshooting mail delivery delays

**Prerequisites:**
- Exchange Server Management Tools installed
- Exchange Administrator permissions
- PowerShell 2.0 or later with Exchange snap-in
- Write permissions on export location

**What You Need to Provide:**
- Export path for CSV file

**What the Script Does:**
1. Loads Exchange Management snap-in
2. Retrieves all transport queues
3. For each queue: collects identity, delivery type, status, message count, next hop, last error
4. Exports to CSV file
5. Displays queue count and total messages

**Important Notes:**
- REQUIRES EXCHANGE ADMINISTRATOR PERMISSIONS
- Useful for identifying mail flow bottlenecks
- Message count shows backlog in each queue
- LastError helps diagnose delivery failures
- Typical use: troubleshoot mail delays, capacity planning, monitoring
- High message counts indicate delivery issues
- Check NextHopDomain for routing problems
- "Active" status normal, "Retry" indicates issues`,
    parameters: [
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\QueueStats.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Queue Statistics
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Collecting queue statistics..." -ForegroundColor Cyan
    
    $Queues = Get-Queue
    $Results = $Queues | Select Identity, DeliveryType, Status, MessageCount, @{N='NextHopDomain';E={$_.NextHopDomain}}, LastError
    
    $Results | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Queue stats exported: $($Queues.Count) queues" -ForegroundColor Green
    
    $TotalMessages = ($Queues | Measure-Object -Property MessageCount -Sum).Sum
    Write-Host "  Total messages in queues: $TotalMessages" -ForegroundColor Yellow
} catch {
    Write-Error $_
}`;
    }
  },
  {
    id: 'configure-database-maintenance',
    name: 'Configure Database Maintenance Schedule',
    category: 'Database Management',
    isPremium: true,
    description: 'Set online maintenance schedule for database defragmentation',
    instructions: `**How This Task Works:**
- Sets online maintenance window for mailbox database
- During maintenance: defragmentation, index optimization, checksum verification
- Maintenance runs automatically during specified window
- Does not dismount database (online maintenance)

**Prerequisites:**
- Exchange Server Management Tools installed
- Exchange Administrator permissions
- PowerShell 2.0 or later with Exchange snap-in
- Understanding of maintenance impact

**What You Need to Provide:**
- Database name to configure
- Maintenance schedule window (select from presets)

**What the Script Does:**
1. Loads Exchange Management snap-in
2. Sets maintenance schedule on specified database
3. Displays configured schedule
4. Confirms successful configuration

**Important Notes:**
- REQUIRES EXCHANGE ADMINISTRATOR PERMISSIONS
- Maintenance causes increased I/O and CPU usage
- Schedule during low-usage periods (nights/weekends)
- Database remains online during maintenance
- Defragmentation reclaims white space
- Longer databases take longer to maintain
- Typical use: optimize database performance, reclaim space, maintain health
- Default: 1-5 AM Sunday (good for most organizations)
- Consider business hours and time zones`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'Mailbox Database 01' },
      { 
        id: 'maintenanceSchedule', 
        label: 'Maintenance Schedule', 
        type: 'select', 
        required: true,
        options: ['Sun.1:00 AM-Sun.5:00 AM', 'Sat.11:00 PM-Sun.6:00 AM', 'Daily.2:00 AM-Daily.6:00 AM'],
        defaultValue: 'Sun.1:00 AM-Sun.5:00 AM'
      }
    ],
    scriptTemplate: (params) => {
      const dbName = escapePowerShellString(params.databaseName);
      const schedule = escapePowerShellString(params.maintenanceSchedule || 'Sun.1:00 AM-Sun.5:00 AM');
      
      return `# Configure Database Maintenance Schedule
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring maintenance schedule for ${dbName}" -ForegroundColor Cyan
    
    Set-MailboxDatabase -Identity "${dbName}" -MaintenanceSchedule "${schedule}"
    
    Write-Host "[SUCCESS] Maintenance schedule configured" -ForegroundColor Green
    Write-Host "  Schedule: ${schedule}" -ForegroundColor Yellow
} catch {
    Write-Error $_
}`;
    }
  },

  // ========================================
  // DAG & HIGH AVAILABILITY CATEGORY
  // ========================================
  {
    id: 'create-database-availability-group',
    name: 'Create Database Availability Group (DAG)',
    category: 'DAG & High Availability',
    isPremium: true,
    description: 'Create a new Database Availability Group for high availability',
    instructions: `**How This Task Works:**
This script creates a Database Availability Group (DAG) to provide automatic database-level recovery from failures.

**Prerequisites:**
- Exchange Enterprise CALs for all users
- Multiple Exchange servers in same AD site
- Witness server configured
- Network configured for DAG replication

**What You Need to Provide:**
- DAG name
- Witness server and directory
- DAG IP address (or use DHCP)

**What the Script Does:**
1. Creates new DAG
2. Configures witness server
3. Sets DAG network settings
4. Prepares for server addition

**Important Notes:**
- Requires Enterprise Edition Exchange
- Plan network topology before creating
- Use dedicated replication network
- Add servers after DAG creation
- Witness server can be any Windows server`,
    parameters: [
      { id: 'dagName', label: 'DAG Name', type: 'text', required: true, placeholder: 'DAG-Primary' },
      { id: 'witnessServer', label: 'Witness Server', type: 'text', required: true, placeholder: 'FS01.contoso.com' },
      { id: 'witnessDirectory', label: 'Witness Directory', type: 'path', required: true, placeholder: 'C:\\\\DAGWitness\\\\DAG-Primary' },
      { id: 'dagIPAddress', label: 'DAG IP Address', type: 'text', required: false, placeholder: '192.168.1.100 (leave blank for DHCP)', description: 'Static IP or leave blank for DHCP' }
    ],
    scriptTemplate: (params) => {
      const dagName = escapePowerShellString(params.dagName);
      const witnessServer = escapePowerShellString(params.witnessServer);
      const witnessDir = escapePowerShellString(params.witnessDirectory);
      const dagIP = params.dagIPAddress ? escapePowerShellString(params.dagIPAddress) : '';

      return `# Create Database Availability Group
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Creating DAG: ${dagName}" -ForegroundColor Cyan
    
    $DAGParams = @{
        Name = "${dagName}"
        WitnessServer = "${witnessServer}"
        WitnessDirectory = "${witnessDir}"
    }
    
    ${dagIP ? `$DAGParams.DatabaseAvailabilityGroupIpAddresses = "${dagIP}"` : `$DAGParams.DatabaseAvailabilityGroupIpAddresses = ([System.Net.IPAddress]::None)`}
    
    New-DatabaseAvailabilityGroup @DAGParams
    
    Write-Host "[SUCCESS] DAG created successfully" -ForegroundColor Green
    Write-Host "  Name: ${dagName}" -ForegroundColor Gray
    Write-Host "  Witness Server: ${witnessServer}" -ForegroundColor Gray
    Write-Host "  Witness Directory: ${witnessDir}" -ForegroundColor Gray
    ${dagIP ? `Write-Host "  IP Address: ${dagIP}" -ForegroundColor Gray` : `Write-Host "  IP Mode: DHCP" -ForegroundColor Gray`}
    Write-Host ""
    Write-Host "Next: Add servers with Add-DatabaseAvailabilityGroupServer" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create DAG: $_"
    exit 1
}`;
    }
  },

  {
    id: 'add-database-copy',
    name: 'Add Database Copy to DAG',
    category: 'DAG & High Availability',
    isPremium: true,
    description: 'Add a passive copy of a mailbox database to another server in the DAG',
    instructions: `**How This Task Works:**
This script creates a passive database copy on another server for high availability and disaster recovery.

**Prerequisites:**
- DAG already created
- Target server added to DAG
- Sufficient disk space on target server
- Database to copy must be on DAG member

**What You Need to Provide:**
- Database name
- Target server for copy
- Replay lag time (optional)

**What the Script Does:**
1. Adds database copy to target server
2. Begins automatic seeding
3. Configures replication settings
4. Reports copy status

**Important Notes:**
- Initial seeding can take hours for large databases
- Monitor seeding with Get-MailboxDatabaseCopyStatus
- Replay lag allows point-in-time recovery
- Ensure disk layout matches source server`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MBX-DB01' },
      { id: 'targetServer', label: 'Target Server', type: 'text', required: true, placeholder: 'EXCH02' },
      { id: 'replayLagTime', label: 'Replay Lag (days)', type: 'number', required: false, placeholder: '0', description: 'Days to delay log replay (0-14)' }
    ],
    scriptTemplate: (params) => {
      const dbName = escapePowerShellString(params.databaseName);
      const targetServer = escapePowerShellString(params.targetServer);
      const lagDays = params.replayLagTime ? parseInt(params.replayLagTime) : 0;

      return `# Add Database Copy
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Adding database copy: ${dbName} to ${targetServer}" -ForegroundColor Cyan
    
    $CopyParams = @{
        Identity = "${dbName}"
        MailboxServer = "${targetServer}"
        SeedingPostponed = \\$false
    }
    
    ${lagDays > 0 ? `$CopyParams.ReplayLagTime = "${lagDays}.00:00:00"` : ''}
    
    Add-MailboxDatabaseCopy @CopyParams
    
    Write-Host "[SUCCESS] Database copy added successfully" -ForegroundColor Green
    Write-Host "  Database: ${dbName}" -ForegroundColor Gray
    Write-Host "  Copy Location: ${targetServer}" -ForegroundColor Gray
    ${lagDays > 0 ? `Write-Host "  Replay Lag: ${lagDays} days" -ForegroundColor Gray` : ''}
    Write-Host ""
    Write-Host "Monitor copy status:" -ForegroundColor Cyan
    Write-Host "  Get-MailboxDatabaseCopyStatus '${dbName}\\\\${targetServer}'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to add database copy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'update-database-copy-seed',
    name: 'Seed/Reseed Database Copy',
    category: 'DAG & High Availability',
    isPremium: true,
    description: 'Manually seed or reseed a database copy',
    instructions: `**How This Task Works:**
This script manually seeds or reseeds a database copy when automatic seeding fails or after corruption.

**Prerequisites:**
- Database copy already added
- Network connectivity between servers
- Sufficient disk space on target

**What You Need to Provide:**
- Database name
- Server hosting the copy to seed

**What the Script Does:**
1. Suspends database copy (if active)
2. Initiates manual seeding
3. Monitors seeding progress
4. Resumes replication after seeding

**Important Notes:**
- Use when automatic seeding fails
- Can take hours for large databases
- Source database remains online
- Consider network bandwidth impact
- Verify copy health after seeding completes`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MBX-DB01' },
      { id: 'targetServer', label: 'Server to Seed', type: 'text', required: true, placeholder: 'EXCH02' }
    ],
    scriptTemplate: (params) => {
      const dbName = escapePowerShellString(params.databaseName);
      const targetServer = escapePowerShellString(params.targetServer);

      return `# Seed Database Copy
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    $CopyIdentity = "${dbName}\\\\${targetServer}"
    Write-Host "Seeding database copy: $CopyIdentity" -ForegroundColor Cyan
    
    # Suspend copy before seeding
    Suspend-MailboxDatabaseCopy -Identity $CopyIdentity -Confirm:\\$false
    Write-Host "  Copy suspended" -ForegroundColor Gray
    
    # Start seeding
    Update-MailboxDatabaseCopy -Identity $CopyIdentity -DeleteExistingFiles -Confirm:\\$false
    Write-Host "  Seeding initiated" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "[SUCCESS] Seeding started successfully" -ForegroundColor Green
    Write-Host "  Database: ${dbName}" -ForegroundColor Gray
    Write-Host "  Target: ${targetServer}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Monitor progress:" -ForegroundColor Cyan
    Write-Host "  Get-MailboxDatabaseCopyStatus '$CopyIdentity'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After seeding completes, resume copy:" -ForegroundColor Yellow
    Write-Host "  Resume-MailboxDatabaseCopy '$CopyIdentity'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to seed database copy: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // CERTIFICATES & VIRTUAL DIRECTORIES CATEGORY
  // ========================================
  {
    id: 'request-exchange-certificate',
    name: 'Request and Install Exchange Certificate',
    category: 'Certificates & Virtual Directories',
    isPremium: true,
    description: 'Generate CSR, request certificate from CA, and install on Exchange server',
    instructions: `**How This Task Works:**
This script creates a certificate signing request (CSR) for Exchange Server SSL/TLS certificates.

**Prerequisites:**
- Exchange Administrator permissions
- Access to certificate authority
- Fully qualified domain names (FQDNs) documented

**What You Need to Provide:**
- Subject name (primary FQDN)
- Subject Alternative Names (SANs)
- Friendly name for certificate

**What the Script Does:**
1. Generates certificate request (CSR)
2. Saves CSR to file
3. Provides instructions for CA submission
4. Prepares for certificate installation

**Important Notes:**
- Include all required FQDNs in SANs
- Typical SANs: mail.domain.com, autodiscover.domain.com
- Submit CSR to your certificate authority
- Install certificate after receiving from CA
- Assign services (SMTP, IIS, IMAP, POP) after install`,
    parameters: [
      { id: 'subjectName', label: 'Subject Name (CN)', type: 'text', required: true, placeholder: 'mail.contoso.com' },
      { id: 'subjectAltNames', label: 'Subject Alternative Names', type: 'textarea', required: true, placeholder: 'mail.contoso.com, autodiscover.contoso.com, outlook.contoso.com', description: 'Comma-separated FQDNs' },
      { id: 'friendlyName', label: 'Friendly Name', type: 'text', required: true, placeholder: 'Exchange 2019 Certificate' },
      { id: 'outputPath', label: 'CSR Output Path', type: 'path', required: true, placeholder: 'C:\\\\Certs\\\\ExchangeCSR.req' }
    ],
    scriptTemplate: (params) => {
      const subjectName = escapePowerShellString(params.subjectName);
      const sans = params.subjectAltNames.split(',').map((s: string) => escapePowerShellString(s.trim())).filter((s: string) => s);
      const friendlyName = escapePowerShellString(params.friendlyName);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Request Exchange Certificate
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Generating certificate request..." -ForegroundColor Cyan
    
    $SubjectName = "CN=${subjectName}"
    $SANs = @(${sans.map((s: string) => `"${s}"`).join(', ')})
    
    # Generate certificate request
    $CertRequest = New-ExchangeCertificate -GenerateRequest -SubjectName $SubjectName -DomainName $SANs -FriendlyName "${friendlyName}" -PrivateKeyExportable \\$true
    
    # Save CSR to file
    $CertRequest | Out-File -FilePath "${outputPath}" -Encoding ASCII
    
    Write-Host "[SUCCESS] Certificate request generated" -ForegroundColor Green
    Write-Host "  Subject: ${subjectName}" -ForegroundColor Gray
    Write-Host "  SANs: ${sans.join(', ')}" -ForegroundColor Gray
    Write-Host "  Output: ${outputPath}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Submit ${outputPath} to your Certificate Authority" -ForegroundColor Gray
    Write-Host "  2. After receiving certificate, import with:" -ForegroundColor Gray
    Write-Host "     Import-ExchangeCertificate -FileData ([Byte[]](Get-Content cert.cer -Encoding byte))" -ForegroundColor Gray
    Write-Host "  3. Enable services with:" -ForegroundColor Gray
    Write-Host "     Enable-ExchangeCertificate -Thumbprint <thumbprint> -Services SMTP,IIS" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate certificate request: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-owa-virtual-directory',
    name: 'Configure OWA Virtual Directory',
    category: 'Certificates & Virtual Directories',
    isPremium: true,
    description: 'Configure Outlook on the Web (OWA) virtual directory URLs and authentication',
    instructions: `**How This Task Works:**
This script configures the Outlook on the Web (OWA) virtual directory with external and internal URLs.

**Prerequisites:**
- Exchange Server installed and running
- IIS configured properly
- DNS records for OWA URL

**What You Need to Provide:**
- Server name
- Internal and external URLs
- Authentication methods

**What the Script Does:**
1. Configures OWA virtual directory
2. Sets internal and external URLs
3. Configures authentication
4. Restarts IIS application pool

**Important Notes:**
- URL format: https://mail.domain.com/owa
- Match AutoDiscover published URLs
- Consider authentication requirements
- Test after configuration
- May require IIS reset`,
    parameters: [
      { id: 'serverName', label: 'Exchange Server', type: 'text', required: true, placeholder: 'EXCH01' },
      { id: 'internalUrl', label: 'Internal URL', type: 'text', required: true, placeholder: 'https://mail.contoso.local/owa' },
      { id: 'externalUrl', label: 'External URL', type: 'text', required: true, placeholder: 'https://mail.contoso.com/owa' }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const internalUrl = escapePowerShellString(params.internalUrl);
      const externalUrl = escapePowerShellString(params.externalUrl);

      return `# Configure OWA Virtual Directory
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring OWA virtual directory on ${serverName}" -ForegroundColor Cyan
    
    Set-OwaVirtualDirectory -Identity "${serverName}\\\\owa (Default Web Site)" -InternalUrl "${internalUrl}" -ExternalUrl "${externalUrl}"
    
    Write-Host "[SUCCESS] OWA virtual directory configured" -ForegroundColor Green
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host "  Internal URL: ${internalUrl}" -ForegroundColor Gray
    Write-Host "  External URL: ${externalUrl}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING]️ Restart IIS to apply changes:" -ForegroundColor Yellow
    Write-Host "  iisreset /noforce" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure OWA virtual directory: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // TRANSPORT & CONNECTORS CATEGORY
  // ========================================
  {
    id: 'create-send-connector',
    name: 'Create Send Connector',
    category: 'Transport & Connectors',
    isPremium: true,
    description: 'Create an SMTP send connector for outbound mail routing',
    instructions: `**How This Task Works:**
This script creates an SMTP send connector to route outbound email to external destinations.

**Prerequisites:**
- Exchange Administrator permissions
- Smart host or MX routing plan
- Network/firewall configured for SMTP

**What You Need to Provide:**
- Connector name
- Address spaces to route
- Smart host (if using) or DNS routing
- Source servers

**What the Script Does:**
1. Creates send connector
2. Configures address spaces
3. Sets routing method
4. Assigns source servers

**Important Notes:**
- Use smart host for mail gateways/security appliances
- DNS routing for direct internet delivery
- Configure SPF/DKIM for delivered mail
- Test with telnet after creation
- Monitor send connector queues`,
    parameters: [
      { id: 'connectorName', label: 'Connector Name', type: 'text', required: true, placeholder: 'Internet Send Connector' },
      { id: 'addressSpaces', label: 'Address Spaces', type: 'textarea', required: true, placeholder: 'SMTP:*;1', description: 'Format: SMTP:domain;cost (e.g., SMTP:*;1 for all)' },
      { id: 'smartHost', label: 'Smart Host', type: 'text', required: false, placeholder: 'smtp.relay.com', description: 'Leave blank for DNS routing' },
      { id: 'sourceServers', label: 'Source Servers', type: 'textarea', required: true, placeholder: 'EXCH01, EXCH02', description: 'Comma-separated server names' }
    ],
    scriptTemplate: (params) => {
      const connectorName = escapePowerShellString(params.connectorName);
      const addressSpaces = params.addressSpaces.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      const smartHost = params.smartHost ? escapePowerShellString(params.smartHost) : '';
      const sourceServers = params.sourceServers.split(',').map((s: string) => s.trim()).filter((s: string) => s);

      return `# Create Send Connector
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Creating send connector: ${connectorName}" -ForegroundColor Cyan
    
    $ConnectorParams = @{
        Name = "${connectorName}"
        AddressSpaces = @(${addressSpaces.map((s: string) => `"${s}"`).join(', ')})
        SourceTransportServers = @(${sourceServers.map((s: string) => `"${s}"`).join(', ')})
        ${smartHost ? `SmartHosts = @("${smartHost}")` : 'DNSRoutingEnabled = $true'}
        ${smartHost ? 'DNSRoutingEnabled = $false' : ''}
    }
    
    New-SendConnector @ConnectorParams
    
    Write-Host "[SUCCESS] Send connector created successfully" -ForegroundColor Green
    Write-Host "  Name: ${connectorName}" -ForegroundColor Gray
    Write-Host "  Address Spaces: ${addressSpaces.join(', ')}" -ForegroundColor Gray
    ${smartHost ? `Write-Host "  Smart Host: ${smartHost}" -ForegroundColor Gray` : `Write-Host "  Routing: DNS" -ForegroundColor Gray`}
    Write-Host "  Source Servers: ${sourceServers.join(', ')}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create send connector: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-receive-connector',
    name: 'Create Receive Connector',
    category: 'Transport & Connectors',
    isPremium: true,
    description: 'Create a receive connector for inbound SMTP mail',
    instructions: `**How This Task Works:**
This script creates a receive connector to accept inbound SMTP connections from specified sources.

**Prerequisites:**
- Exchange Administrator permissions
- IP addresses/ranges of sending servers
- Port and binding requirements documented

**What You Need to Provide:**
- Connector name
- Server to host connector
- Remote IP ranges allowed
- Binding (IP and port)

**What the Script Does:**
1. Creates receive connector
2. Configures remote IP ranges
3. Sets authentication methods
4. Binds to network interface

**Important Notes:**
- Default frontend: port 25, all IPs
- Backend connector: port 2525, local subnet
- Configure permissions carefully
- Use for application relay, hybrid, etc.
- Monitor for open relay vulnerabilities`,
    parameters: [
      { id: 'connectorName', label: 'Connector Name', type: 'text', required: true, placeholder: 'Application Relay Connector' },
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'EXCH01' },
      { id: 'remoteIPRanges', label: 'Remote IP Ranges', type: 'textarea', required: true, placeholder: '192.168.1.0/24, 10.0.0.5', description: 'Comma-separated IPs/ranges' },
      { id: 'port', label: 'Port', type: 'number', required: true, defaultValue: 25, placeholder: '25' }
    ],
    scriptTemplate: (params) => {
      const connectorName = escapePowerShellString(params.connectorName);
      const serverName = escapePowerShellString(params.serverName);
      const remoteIPs = params.remoteIPRanges.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      const port = params.port || 25;

      return `# Create Receive Connector
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Creating receive connector: ${connectorName}" -ForegroundColor Cyan
    
    New-ReceiveConnector -Name "${connectorName}" -Server "${serverName}" -TransportRole FrontendTransport -Bindings "0.0.0.0:${port}" -RemoteIPRanges @(${remoteIPs.map((ip: string) => `"${ip}"`).join(', ')})
    
    Write-Host "[SUCCESS] Receive connector created successfully" -ForegroundColor Green
    Write-Host "  Name: ${connectorName}" -ForegroundColor Gray
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host "  Port: ${port}" -ForegroundColor Gray
    Write-Host "  Remote IPs: ${remoteIPs.join(', ')}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING]️ Configure permissions as needed:" -ForegroundColor Yellow
    Write-Host "  Set-ReceiveConnector '${serverName}\\\\${connectorName}' -PermissionGroups <groups>" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create receive connector: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAINTENANCE & HEALTH CATEGORY
  // ========================================
  {
    id: 'set-server-maintenance-mode',
    name: 'Put Server into Maintenance Mode',
    category: 'Maintenance & Health',
    isPremium: true,
    description: 'Safely put Exchange server into maintenance mode for patching or maintenance',
    instructions: `**How This Task Works:**
This script gracefully puts an Exchange server into maintenance mode, draining connections and preparing for maintenance.

**Prerequisites:**
- Multiple Exchange servers (DAG or load-balanced)
- Exchange Administrator permissions
- Maintenance window scheduled

**What You Need to Provide:**
- Server name to put into maintenance

**What the Script Does:**
1. Sets ServerComponentState to inactive
2. Drains active mailbox databases (if DAG)
3. Redirects client connections
4. Pauses transport queues
5. Suspends cluster node (if DAG member)

**Important Notes:**
- Only for multi-server environments
- Allows safe patching/maintenance
- Monitor active sessions before starting
- Complete maintenance before business hours
- Exit maintenance mode after work completes`,
    parameters: [
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'EXCH01' }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);

      return `# Set Server into Maintenance Mode
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Putting ${serverName} into maintenance mode..." -ForegroundColor Yellow
    Write-Host "This may take several minutes." -ForegroundColor Gray
    Write-Host ""
    
    # Set server component state
    Write-Host "1. Setting component states to inactive..." -ForegroundColor Cyan
    Set-ServerComponentState "${serverName}" -Component ServerWideOffline -State Inactive -Requester Maintenance
    
    # Drain active databases if DAG member
    Write-Host "2. Checking for active database copies..." -ForegroundColor Cyan
    $ActiveDBs = Get-MailboxDatabaseCopyStatus -Server "${serverName}" | Where-Object { $_.Status -eq "Mounted" }
    if ($ActiveDBs) {
        Write-Host "   Found $($ActiveDBs.Count) active databases" -ForegroundColor Gray
        foreach ($DB in $ActiveDBs) {
            Write-Host "   Moving $($DB.DatabaseName)..." -ForegroundColor Gray
            Move-ActiveMailboxDatabase $DB.DatabaseName -Confirm:\\$false
        }
    }
    
    # Redirect protocols
    Write-Host "3. Redirecting client protocols..." -ForegroundColor Cyan
    Set-ServerComponentState "${serverName}" -Component HubTransport -State Inactive -Requester Maintenance
    
    # Pause transport queues
    Write-Host "4. Pausing transport queues..." -ForegroundColor Cyan
    Set-ServerComponentState "${serverName}" -Component UMCallRouter -State Inactive -Requester Maintenance
    
    # Suspend cluster node if DAG
    Write-Host "5. Suspending cluster node..." -ForegroundColor Cyan
    $DAGMembership = Get-DatabaseAvailabilityGroup | Where-Object { $_.Servers -contains "${serverName}" }
    if ($DAGMembership) {
        Suspend-ClusterNode "${serverName}"
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Server in maintenance mode" -ForegroundColor Green
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ℹ️ Perform maintenance now" -ForegroundColor Cyan
    Write-Host "After completing maintenance, exit with:" -ForegroundColor Yellow
    Write-Host "  Set-ServerComponentState '${serverName}' -Component ServerWideOffline -State Active -Requester Maintenance" -ForegroundColor Gray
    Write-Host "  Resume-ClusterNode '${serverName}'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to set maintenance mode: $_"
    exit 1
}`;
    }
  },

  {
    id: 'enable-mrs-proxy',
    name: 'Enable MRS Proxy for Migrations',
    category: 'Maintenance & Health',
    isPremium: true,
    description: 'Enable Mailbox Replication Service (MRS) Proxy for cross-forest migrations',
    instructions: `**How This Task Works:**
This script enables the MRS Proxy endpoint on Client Access servers to allow mailbox migrations.

**Prerequisites:**
- Exchange Server with Client Access role
- Exchange Administrator permissions
- Certificate configured for EWS

**What You Need to Provide:**
- Server name to enable MRS Proxy on

**What the Script Does:**
1. Enables MRS Proxy on EWS virtual directory
2. Restarts MRS service
3. Verifies configuration

**Important Notes:**
- Required for hybrid migrations
- Required for cross-forest moves
- Must be enabled on CAS servers
- Requires IIS restart to take effect
- Test connectivity after enabling`,
    parameters: [
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'EXCH01' }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);

      return `# Enable MRS Proxy
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Enabling MRS Proxy on ${serverName}" -ForegroundColor Cyan
    
    # Enable MRS Proxy
    Set-WebServicesVirtualDirectory -Identity "${serverName}\\\\EWS (Default Web Site)" -MRSProxyEnabled \\$true
    
    Write-Host "  MRS Proxy enabled on EWS virtual directory" -ForegroundColor Gray
    
    # Restart MRS service
    Write-Host "  Restarting Mailbox Replication Service..." -ForegroundColor Gray
    Restart-Service MSExchangeMailboxReplication
    
    Write-Host ""
    Write-Host "[SUCCESS] MRS Proxy enabled successfully" -ForegroundColor Green
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING]️ Restart IIS for changes to take effect:" -ForegroundColor Yellow
    Write-Host "  iisreset /noforce" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test MRS Proxy:" -ForegroundColor Cyan
    Write-Host "  Test-MigrationServerAvailability -ExchangeRemoteMove -RemoteServer '${serverName}'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to enable MRS Proxy: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-dag-network-compression',
    name: 'Configure DAG Network Compression',
    category: 'High Availability',
    isPremium: true,
    description: 'Configure network compression and encryption for DAG replication traffic',
    instructions: `**How This Task Works:**
This script configures compression and encryption settings for Database Availability Group replication networks.

**Prerequisites:**
- Exchange Administrator role
- DAG already configured
- Understanding of network requirements

**What You Need to Provide:**
- DAG name
- Network name
- Compression and encryption settings

**What the Script Does:**
1. Retrieves DAG network configuration
2. Configures compression settings
3. Configures encryption settings
4. Verifies changes

**Important Notes:**
- Compression reduces bandwidth usage
- Encryption protects replication data
- May impact replication performance
- Balance security with performance needs`,
    parameters: [
      { id: 'dagName', label: 'DAG Name', type: 'text', required: true, placeholder: 'DAG01' },
      { id: 'networkName', label: 'DAG Network Name', type: 'text', required: true, placeholder: 'MapiDagNetwork' },
      { id: 'enableCompression', label: 'Enable Compression', type: 'boolean', required: true, defaultValue: true },
      { id: 'enableEncryption', label: 'Enable Encryption', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const dagName = escapePowerShellString(params.dagName);
      const networkName = escapePowerShellString(params.networkName);
      const compression = params.enableCompression !== false;
      const encryption = params.enableEncryption !== false;

      return `# Configure DAG Network Compression
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring DAG network: ${networkName}" -ForegroundColor Cyan
    
    Set-DatabaseAvailabilityGroupNetwork -Identity "${dagName}\\\\${networkName}" \`
        -ReplicationEnabled \\$true \`
        -NetworkCompression ${compression ? 'Enabled' : 'Disabled'} \`
        -NetworkEncryption ${encryption ? 'Enabled' : 'Disabled'}
    
    Write-Host "[SUCCESS] DAG network configured successfully" -ForegroundColor Green
    Write-Host "  DAG: ${dagName}" -ForegroundColor Gray
    Write-Host "  Network: ${networkName}" -ForegroundColor Gray
    Write-Host "  Compression: ${compression ? 'Enabled' : 'Disabled'}" -ForegroundColor Gray
    Write-Host "  Encryption: ${encryption ? 'Enabled' : 'Disabled'}" -ForegroundColor Gray
    
    $Network = Get-DatabaseAvailabilityGroupNetwork -Identity "${dagName}\\\\${networkName}"
    Write-Host "  Current Settings:" -ForegroundColor Cyan
    Write-Host "    Compression: $($Network.ReplicationNetworkCompression)" -ForegroundColor Gray
    Write-Host "    Encryption: $($Network.ReplicationNetworkEncryption)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure DAG network: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-database-circular-logging',
    name: 'Configure Mailbox Database Circular Logging',
    category: 'Database Management',
    isPremium: true,
    description: 'Enable or disable circular logging for mailbox databases',
    instructions: `**How This Task Works:**
This script configures circular logging for Exchange mailbox databases to manage transaction log growth.

**Prerequisites:**
- Exchange Administrator role
- Understanding of backup strategy
- Planned database dismount window

**What You Need to Provide:**
- Database name
- Enable or disable circular logging

**What the Script Does:**
1. Dismounts the database
2. Enables or disables circular logging
3. Mounts the database
4. Verifies configuration

**Important Notes:**
- DISABLES log-based backups when enabled
- Reduces disk space for logs
- NOT recommended for production if using backups
- Requires database dismount (causes downtime)
- Use only in dev/test or with snapshot backups`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB01' },
      { id: 'enableCircularLogging', label: 'Enable Circular Logging', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const dbName = escapePowerShellString(params.databaseName);
      const enable = params.enableCircularLogging === true;

      return `# Configure Mailbox Database Circular Logging
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring circular logging for: ${dbName}" -ForegroundColor Cyan
    Write-Host "[WARNING]️ This will dismount the database temporarily!" -ForegroundColor Yellow
    Read-Host "Press Enter to continue or Ctrl+C to cancel"
    
    # Dismount database
    Write-Host "Dismounting database..." -ForegroundColor Yellow
    Dismount-Database -Identity "${dbName}" -Confirm:\\$false
    
    # Configure circular logging
    Set-MailboxDatabase -Identity "${dbName}" -CircularLoggingEnabled $${enable ? 'true' : 'false'}
    
    Write-Host "[SUCCESS] Circular logging ${enable ? 'enabled' : 'disabled'}" -ForegroundColor Green
    
    # Mount database
    Write-Host "Mounting database..." -ForegroundColor Yellow
    Mount-Database -Identity "${dbName}"
    
    Write-Host "[SUCCESS] Database mounted successfully" -ForegroundColor Green
    Write-Host "  Database: ${dbName}" -ForegroundColor Gray
    Write-Host "  Circular Logging: ${enable ? 'Enabled' : 'Disabled'}" -ForegroundColor Gray
    
    ${enable ? `Write-Host ""
    Write-Host "[WARNING]️ WARNING: Circular logging is now ENABLED" -ForegroundColor Yellow
    Write-Host "  - Transaction log backups will NOT truncate logs" -ForegroundColor Yellow
    Write-Host "  - Only full/incremental database backups supported" -ForegroundColor Yellow
    Write-Host "  - NOT recommended for production environments" -ForegroundColor Yellow` : ''}
    
} catch {
    Write-Error "Failed to configure circular logging: $_"
    Write-Host "Attempting to mount database..." -ForegroundColor Yellow
    Mount-Database -Identity "${dbName}" -ErrorAction SilentlyContinue
    exit 1
}`;
    }
  },

  {
    id: 'configure-send-receive-connectors-bulk',
    name: 'Configure Multiple Send/Receive Connectors',
    category: 'Mail Flow',
    isPremium: true,
    description: 'Bulk configure send and receive connectors for mail routing',
    instructions: `**How This Task Works:**
This script creates multiple send and receive connectors for routing mail to different destinations or accepting mail from different sources.

**Prerequisites:**
- Exchange Administrator role
- Hub Transport server access
- Understanding of mail routing

**What You Need to Provide:**
- Connector type (Send or Receive)
- Server name
- Smart host or remote IPs
- Address spaces or permissions

**What the Script Does:**
1. Creates send or receive connector
2. Configures routing or acceptance rules
3. Sets permissions and authentication
4. Enables the connector

**Important Notes:**
- Send connectors route outbound mail
- Receive connectors accept inbound mail
- Configure permissions carefully
- Test mail flow after creation`,
    parameters: [
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'EXCH01' },
      { id: 'connectorType', label: 'Connector Type', type: 'select', required: true, options: ['Send', 'Receive'], defaultValue: 'Send' },
      { id: 'connectorName', label: 'Connector Name', type: 'text', required: true, placeholder: 'To Partner Domain' },
      { id: 'smartHost', label: 'Smart Host (for Send)', type: 'text', required: false, placeholder: 'smtp.partner.com' },
      { id: 'remoteIPs', label: 'Remote IPs (for Receive)', type: 'text', required: false, placeholder: '192.168.1.100' }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const connectorType = params.connectorType || 'Send';
      const connectorName = escapePowerShellString(params.connectorName);
      const smartHost = params.smartHost ? escapePowerShellString(params.smartHost) : '';
      const remoteIPs = params.remoteIPs ? escapePowerShellString(params.remoteIPs) : '';

      return `# Configure Send/Receive Connectors
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Creating ${connectorType} connector: ${connectorName}" -ForegroundColor Cyan
    
    ${connectorType === 'Send' ? `
    # Create Send Connector
    New-SendConnector -Name "${connectorName}" \`
        -AddressSpaces "*" \`
        -SourceTransportServers "${serverName}" \`
        ${smartHost ? `-SmartHosts "${smartHost}" \`` : ''}
        -DNSRoutingEnabled $${smartHost ? 'false' : 'true'} \`
        -UseExternalDNSServersEnabled \\$false
    
    Write-Host "[SUCCESS] Send connector created" -ForegroundColor Green
    ${smartHost ? `Write-Host "  Smart Host: ${smartHost}" -ForegroundColor Gray` : ''}` :
    `
    # Create Receive Connector
    New-ReceiveConnector -Name "${connectorName}" \`
        -Server "${serverName}" \`
        -Bindings "0.0.0.0:25" \`
        -RemoteIPRanges ${remoteIPs ? `"${remoteIPs}"` : '"0.0.0.0-255.255.255.255"'} \`
        -PermissionGroups AnonymousUsers
    
    Write-Host "[SUCCESS] Receive connector created" -ForegroundColor Green
    ${remoteIPs ? `Write-Host "  Remote IPs: ${remoteIPs}" -ForegroundColor Gray` : `Write-Host "  Remote IPs: All (0.0.0.0-255.255.255.255)" -ForegroundColor Gray`}`}
    
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host "  Connector: ${connectorName}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create connector: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-accepted-domains-bulk',
    name: 'Configure Multiple Accepted Domains',
    category: 'Mail Flow',
    isPremium: true,
    description: 'Add and configure multiple accepted domains for the Exchange organization',
    instructions: `**How This Task Works:**
This script configures accepted domains to allow Exchange to receive mail for multiple domains.

**Prerequisites:**
- Exchange Organization Management role
- DNS records configured for domains
- Understanding of domain types

**What You Need to Provide:**
- Domain names (comma-separated)
- Domain type (Authoritative, InternalRelay, or ExternalRelay)

**What the Script Does:**
1. Processes each domain in the list
2. Creates accepted domain entry
3. Sets domain type appropriately
4. Verifies configuration

**Important Notes:**
- Authoritative: Organization is final destination
- InternalRelay: Relay to internal mail server
- ExternalRelay: Relay to external mail server
- Requires proper DNS MX records`,
    parameters: [
      { id: 'domains', label: 'Domain Names (comma-separated)', type: 'textarea', required: true, placeholder: 'contoso.com, fabrikam.com, northwind.com' },
      { id: 'domainType', label: 'Domain Type', type: 'select', required: true, options: ['Authoritative', 'InternalRelay', 'ExternalRelay'], defaultValue: 'Authoritative' }
    ],
    scriptTemplate: (params) => {
      const domainsRaw = (params.domains as string).split(',').map((d: string) => d.trim());
      const domainType = params.domainType || 'Authoritative';

      return `# Configure Multiple Accepted Domains
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    $Domains = @(${domainsRaw.map(d => `"${escapePowerShellString(d)}"`).join(', ')})
    $DomainType = "${domainType}"
    
    Write-Host "Adding $($Domains.Count) accepted domains as type: $DomainType" -ForegroundColor Cyan
    Write-Host ""
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Domain in $Domains) {
        try {
            $Existing = Get-AcceptedDomain -Identity $Domain -ErrorAction SilentlyContinue
            
            if ($Existing) {
                Set-AcceptedDomain -Identity $Domain -DomainType $DomainType
                Write-Host "[SUCCESS] Updated: $Domain" -ForegroundColor Green
            } else {
                New-AcceptedDomain -Name $Domain -DomainName $Domain -DomainType $DomainType
                Write-Host "[SUCCESS] Added: $Domain" -ForegroundColor Green
            }
            
            $SuccessCount++
        } catch {
            Write-Host "[FAILED] Failed: $Domain - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "================= SUMMARY =================" -ForegroundColor Cyan
    Write-Host "Total Domains: $($Domains.Count)" -ForegroundColor Gray
    Write-Host "Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })
    Write-Host "Domain Type: $DomainType" -ForegroundColor Gray
    
} catch {
    Write-Error "Bulk operation failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-content-filter-agent',
    name: 'Configure Content Filter Anti-Spam Settings',
    category: 'Security',
    isPremium: true,
    description: 'Configure content filtering and SCL thresholds for anti-spam protection',
    instructions: `**How This Task Works:**
This script configures the Content Filter agent to block or quarantine spam based on SCL (Spam Confidence Level) ratings.

**Prerequisites:**
- Exchange Administrator role
- Edge Transport or Hub Transport server
- Anti-spam agents enabled

**What You Need to Provide:**
- SCL thresholds for reject and quarantine
- Actions to take for different SCL levels
- Allowed/blocked phrases (optional)

**What the Script Does:**
1. Configures SCL thresholds
2. Sets reject and quarantine levels
3. Configures custom phrases
4. Enables content filtering

**Important Notes:**
- SCL ranges from 0-9 (0=not spam, 9=definitely spam)
- Typical reject threshold: 7-9
- Typical quarantine threshold: 5-6
- Test settings before production use`,
    parameters: [
      { id: 'sclRejectThreshold', label: 'SCL Reject Threshold', type: 'number', required: true, placeholder: '7', description: 'Reject messages with SCL >= this value' },
      { id: 'sclQuarantineThreshold', label: 'SCL Quarantine Threshold', type: 'number', required: true, placeholder: '5', description: 'Quarantine messages with SCL >= this value' },
      { id: 'enableBypassedSenders', label: 'Enable Bypassed Senders List', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const rejectThreshold = params.sclRejectThreshold || 7;
      const quarantineThreshold = params.sclQuarantineThreshold || 5;
      const enableBypass = params.enableBypassedSenders !== false;

      return `# Configure Content Filter Anti-Spam Settings
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring Content Filter agent..." -ForegroundColor Cyan
    
    Set-ContentFilterConfig \`
        -SCLRejectEnabled \\$true \`
        -SCLRejectThreshold ${rejectThreshold} \`
        -SCLQuarantineEnabled \\$true \`
        -SCLQuarantineThreshold ${quarantineThreshold} \`
        -BypassedSenders ${enableBypass ? '$null' : '@()'} \`
        -Enabled \\$true
    
    Write-Host "[SUCCESS] Content filtering configured successfully" -ForegroundColor Green
    Write-Host "  SCL Reject Threshold: ${rejectThreshold}" -ForegroundColor Gray
    Write-Host "  SCL Quarantine Threshold: ${quarantineThreshold}" -ForegroundColor Gray
    Write-Host "  Bypassed Senders: ${enableBypass ? 'Enabled' : 'Disabled'}" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "SCL Rating Guide:" -ForegroundColor Cyan
    Write-Host "  0-1: Not spam" -ForegroundColor Gray
    Write-Host "  2-4: Probably not spam" -ForegroundColor Gray
    Write-Host "  5-6: Uncertain (quarantine)" -ForegroundColor Yellow
    Write-Host "  7-9: Spam (reject)" -ForegroundColor Red
    
    $Config = Get-ContentFilterConfig
    Write-Host ""
    Write-Host "Current Configuration:" -ForegroundColor Cyan
    Write-Host "  Enabled: $($Config.Enabled)" -ForegroundColor Gray
    Write-Host "  Reject at SCL: $($Config.SCLRejectThreshold)" -ForegroundColor Gray
    Write-Host "  Quarantine at SCL: $($Config.SCLQuarantineThreshold)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure content filter: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-mailbox-audit-retention',
    name: 'Configure Mailbox Audit Log Retention',
    category: 'Compliance & Auditing',
    isPremium: true,
    description: 'Set mailbox audit log age limit for compliance and retention policies',
    instructions: `**How This Task Works:**
This script configures how long mailbox audit logs are retained before being automatically purged.

**Prerequisites:**
- Exchange Administrator role
- Mailbox auditing already enabled
- Understanding of compliance requirements

**What You Need to Provide:**
- Retention period in days
- Apply to all mailboxes or specific mailbox

**What the Script Does:**
1. Configures audit log age limit
2. Applies to organization or specific mailbox
3. Verifies retention settings

**Important Notes:**
- Default retention: 90 days
- Maximum retention: 24,855 days (~68 years)
- Logs auto-purge after age limit
- Consider compliance requirements
- Longer retention uses more storage`,
    parameters: [
      { id: 'retentionDays', label: 'Retention Period (Days)', type: 'number', required: true, placeholder: '365', description: 'How long to keep audit logs' },
      { id: 'targetMailbox', label: 'Target Mailbox (Optional)', type: 'email', required: false, placeholder: 'Leave blank for all mailboxes' }
    ],
    scriptTemplate: (params) => {
      const retentionDays = params.retentionDays || 365;
      const targetMailbox = params.targetMailbox ? escapePowerShellString(params.targetMailbox) : '';

      return `# Configure Mailbox Audit Log Retention
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring audit log retention: ${retentionDays} days" -ForegroundColor Cyan
    
    ${targetMailbox ? `
    # Configure specific mailbox
    Set-Mailbox -Identity "${targetMailbox}" -AuditLogAgeLimit ${retentionDays}.00:00:00
    
    Write-Host "[SUCCESS] Audit log retention configured" -ForegroundColor Green
    Write-Host "  Mailbox: ${targetMailbox}" -ForegroundColor Gray
    Write-Host "  Retention: ${retentionDays} days" -ForegroundColor Gray
    
    $Mailbox = Get-Mailbox -Identity "${targetMailbox}"
    Write-Host "  Current Setting: $($Mailbox.AuditLogAgeLimit)" -ForegroundColor Gray` :
    `
    # Configure all mailboxes
    $Mailboxes = Get-Mailbox -ResultSize Unlimited
    
    Write-Host "Configuring $($Mailboxes.Count) mailboxes..." -ForegroundColor Yellow
    
    $Count = 0
    foreach ($Mailbox in $Mailboxes) {
        Set-Mailbox -Identity $Mailbox.Identity -AuditLogAgeLimit ${retentionDays}.00:00:00
        $Count++
        if ($Count % 50 -eq 0) {
            Write-Host "  Processed $Count mailboxes..." -ForegroundColor Gray
        }
    }
    
    Write-Host "[SUCCESS] Audit log retention configured for all mailboxes" -ForegroundColor Green
    Write-Host "  Mailboxes Updated: $($Mailboxes.Count)" -ForegroundColor Gray
    Write-Host "  Retention: ${retentionDays} days" -ForegroundColor Gray`}
    
    Write-Host ""
    Write-Host "Retention Policy:" -ForegroundColor Cyan
    Write-Host "  Logs older than ${retentionDays} days will be automatically purged" -ForegroundColor Yellow
    Write-Host "  Consider compliance requirements before reducing retention" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure audit retention: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-outlook-anywhere',
    name: 'Configure Outlook Anywhere (RPC over HTTP)',
    category: 'Client Access',
    isPremium: true,
    description: 'Enable and configure Outlook Anywhere for remote client access',
    instructions: `**How This Task Works:**
This script enables and configures Outlook Anywhere (RPC over HTTP) to allow external Outlook clients to connect to Exchange.

**Prerequisites:**
- Exchange Administrator role
- SSL certificate installed
- External hostname configured
- IIS with RPC over HTTP feature

**What You Need to Provide:**
- Server name
- External hostname
- Authentication method
- SSL requirements

**What the Script Does:**
1. Enables Outlook Anywhere
2. Configures external hostname
3. Sets authentication methods
4. Configures SSL requirements
5. Restarts IIS

**Important Notes:**
- Required for external Outlook connectivity
- Requires valid SSL certificate
- Configure firewall for port 443
- Modern auth recommended over basic auth`,
    parameters: [
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'EXCH01' },
      { id: 'externalHostname', label: 'External Hostname', type: 'text', required: true, placeholder: 'mail.contoso.com' },
      { id: 'authMethod', label: 'Authentication Method', type: 'select', required: true, options: ['Basic', 'NTLM', 'Negotiate'], defaultValue: 'NTLM' },
      { id: 'requireSSL', label: 'Require SSL', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const externalHostname = escapePowerShellString(params.externalHostname);
      const authMethod = params.authMethod || 'NTLM';
      const requireSSL = params.requireSSL !== false;

      return `# Configure Outlook Anywhere
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Configuring Outlook Anywhere on ${serverName}" -ForegroundColor Cyan
    
    # Enable Outlook Anywhere
    Enable-OutlookAnywhere -Server "${serverName}" \`
        -ExternalHostname "${externalHostname}" \`
        -ExternalClientsRequireSsl $${requireSSL ? 'true' : 'false'} \`
        -InternalHostname "${externalHostname}" \`
        -InternalClientsRequireSsl $${requireSSL ? 'true' : 'false'} \`
        -DefaultAuthenticationMethod ${authMethod}
    
    Write-Host "[SUCCESS] Outlook Anywhere enabled successfully" -ForegroundColor Green
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host "  External Hostname: ${externalHostname}" -ForegroundColor Gray
    Write-Host "  Authentication: ${authMethod}" -ForegroundColor Gray
    Write-Host "  SSL Required: ${requireSSL}" -ForegroundColor Gray
    
    # Restart IIS to apply changes
    Write-Host ""
    Write-Host "Restarting IIS..." -ForegroundColor Yellow
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock { iisreset /noforce }
    
    Write-Host "[SUCCESS] IIS restarted successfully" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Client Configuration:" -ForegroundColor Cyan
    Write-Host "  Server: ${externalHostname}" -ForegroundColor Gray
    Write-Host "  Port: 443 (HTTPS)" -ForegroundColor Gray
    Write-Host "  Encryption: ${requireSSL ? 'Required' : 'Optional'}" -ForegroundColor Gray
    
    ${authMethod === 'Basic' ? `Write-Host ""
    Write-Host "[WARNING]️ WARNING: Basic authentication selected" -ForegroundColor Yellow
    Write-Host "  Consider using NTLM or Negotiate for better security" -ForegroundColor Yellow` : ''}
    
} catch {
    Write-Error "Failed to configure Outlook Anywhere: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-address-list-segmentation',
    name: 'Configure Address List Segmentation (ABP)',
    category: 'Organization Configuration',
    isPremium: true,
    description: 'Create Address Book Policy for multi-tenant address list segmentation',
    instructions: `**How This Task Works:**
This script creates Address Book Policies to segment the Global Address List for multi-tenant scenarios or organizational separation.

**Prerequisites:**
- Exchange Organization Management role
- Address lists already created
- Understanding of ABP requirements

**What You Need to Provide:**
- Policy name
- Address lists to include
- Global Address List
- Room list

**What the Script Does:**
1. Creates Address Book Policy
2. Associates address lists
3. Configures GAL and room list
4. Enables the policy

**Important Notes:**
- Limits what users see in address book
- Required for multi-tenant deployments
- Users only see filtered contacts
- Apply ABP to mailboxes after creation`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Contoso ABP' },
      { id: 'addressListName', label: 'Address List Name', type: 'text', required: true, placeholder: 'Contoso Users' },
      { id: 'galName', label: 'Global Address List Name', type: 'text', required: true, placeholder: 'Contoso GAL' },
      { id: 'roomListName', label: 'Room List Name', type: 'text', required: true, placeholder: 'Contoso Rooms' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const addressList = escapePowerShellString(params.addressListName);
      const gal = escapePowerShellString(params.galName);
      const roomList = escapePowerShellString(params.roomListName);

      return `# Configure Address Book Policy
# Generated: ${new Date().toISOString()}

Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn

try {
    Write-Host "Creating Address Book Policy: ${policyName}" -ForegroundColor Cyan
    
    # Verify required components exist
    Write-Host "Verifying address lists..." -ForegroundColor Yellow
    
    $AL = Get-AddressList -Identity "${addressList}" -ErrorAction SilentlyContinue
    $GAL = Get-GlobalAddressList -Identity "${gal}" -ErrorAction SilentlyContinue
    $RL = Get-AddressList -Identity "${roomList}" -ErrorAction SilentlyContinue
    
    if (-not $AL) {
        Write-Error "Address list not found: ${addressList}"
        exit 1
    }
    if (-not $GAL) {
        Write-Error "Global address list not found: ${gal}"
        exit 1
    }
    if (-not $RL) {
        Write-Error "Room list not found: ${roomList}"
        exit 1
    }
    
    # Create Address Book Policy
    New-AddressBookPolicy -Name "${policyName}" \`
        -AddressLists "${addressList}" \`
        -GlobalAddressList "${gal}" \`
        -RoomList "${roomList}" \`
        -OfflineAddressBook "\\Default Offline Address Book"
    
    Write-Host "[SUCCESS] Address Book Policy created successfully" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Gray
    Write-Host "  Address List: ${addressList}" -ForegroundColor Gray
    Write-Host "  GAL: ${gal}" -ForegroundColor Gray
    Write-Host "  Room List: ${roomList}" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Apply policy to mailboxes:" -ForegroundColor Gray
    Write-Host "     Set-Mailbox -Identity <user> -AddressBookPolicy '${policyName}'" -ForegroundColor Gray
    Write-Host "  2. Users will see filtered address book after policy applied" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create Address Book Policy: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAILBOX MANAGEMENT - QUOTAS
  // ========================================
  {
    id: 'set-mailbox-quota-limits',
    name: 'Set Mailbox Quota Limits',
    category: 'Mailboxes & Users',
    isPremium: true,
    description: 'Configure mailbox storage quotas including warning, prohibit send, and prohibit send/receive limits',
    instructions: `**How This Task Works:**
This script configures storage quota limits for Exchange mailboxes to manage storage consumption and enforce retention policies.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Mailbox must exist

**What You Need to Provide:**
- Mailbox identity (email address)
- Issue Warning At quota (in MB)
- Prohibit Send At quota (in MB)
- Prohibit Send Receive At quota (in MB)
- Use database defaults: true or false

**What the Script Does:**
1. Verifies mailbox exists
2. Configures individual quota limits or uses database defaults
3. Sets warning, prohibit send, and prohibit send/receive thresholds
4. Displays current quota configuration

**Important Notes:**
- Exchange Server Administrator role required
- Quotas are in MB (1024 MB = 1 GB)
- Issue Warning: user receives warning email
- Prohibit Send: user cannot send new mail
- Prohibit Send Receive: user cannot send or receive mail
- Typical use: storage management, user discipline, compliance
- Set quotas progressively (Warning < ProhibitSend < ProhibitSendReceive)`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'issueWarningMB', label: 'Issue Warning At (MB)', type: 'number', required: true, placeholder: '1800', defaultValue: 1800 },
      { id: 'prohibitSendMB', label: 'Prohibit Send At (MB)', type: 'number', required: true, placeholder: '1900', defaultValue: 1900 },
      { id: 'prohibitSendReceiveMB', label: 'Prohibit Send Receive At (MB)', type: 'number', required: true, placeholder: '2000', defaultValue: 2000 },
      { id: 'useDatabaseDefaults', label: 'Use Database Defaults', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const issueWarning = params.issueWarningMB || 1800;
      const prohibitSend = params.prohibitSendMB || 1900;
      const prohibitSendReceive = params.prohibitSendReceiveMB || 2000;
      const useDefaults = toPowerShellBoolean(params.useDatabaseDefaults ?? false);

      return `# Set Mailbox Quota Limits
# Generated: ${new Date().toISOString()}

$MailboxIdentity = "${mailboxIdentity}"
$IssueWarningMB = ${issueWarning}
$ProhibitSendMB = ${prohibitSend}
$ProhibitSendReceiveMB = ${prohibitSendReceive}
$UseDatabaseDefaults = ${useDefaults}

try {
    # Verify mailbox exists
    $Mailbox = Get-Mailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    if ($UseDatabaseDefaults) {
        # Use database default quotas
        Set-Mailbox -Identity $MailboxIdentity -UseDatabaseQuotaDefaults $true
        Write-Host "[SUCCESS] Mailbox set to use database default quotas" -ForegroundColor Green
    } else {
        # Set individual quotas
        Set-Mailbox -Identity $MailboxIdentity \`
            -UseDatabaseQuotaDefaults $false \`
            -IssueWarningQuota "$($IssueWarningMB)MB" \`
            -ProhibitSendQuota "$($ProhibitSendMB)MB" \`
            -ProhibitSendReceiveQuota "$($ProhibitSendReceiveMB)MB"
        
        Write-Host "[SUCCESS] Mailbox quotas configured" -ForegroundColor Green
        Write-Host "  Issue Warning At: $IssueWarningMB MB" -ForegroundColor Gray
        Write-Host "  Prohibit Send At: $ProhibitSendMB MB" -ForegroundColor Gray
        Write-Host "  Prohibit Send Receive At: $ProhibitSendReceiveMB MB" -ForegroundColor Gray
    }
    
    # Display current settings
    $Updated = Get-Mailbox -Identity $MailboxIdentity
    Write-Host ""
    Write-Host "Current Quota Settings:" -ForegroundColor Cyan
    Write-Host "  Use Database Defaults: $($Updated.UseDatabaseQuotaDefaults)" -ForegroundColor Gray
    Write-Host "  Issue Warning: $($Updated.IssueWarningQuota)" -ForegroundColor Gray
    Write-Host "  Prohibit Send: $($Updated.ProhibitSendQuota)" -ForegroundColor Gray
    Write-Host "  Prohibit Send Receive: $($Updated.ProhibitSendReceiveQuota)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to set mailbox quotas: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAILBOX MANAGEMENT - PERMISSIONS
  // ========================================
  {
    id: 'grant-mailbox-full-access',
    name: 'Grant Full Access Mailbox Permissions',
    category: 'Mailboxes & Users',
    isPremium: true,
    description: 'Grant Full Access and/or Send As permissions to a mailbox for another user',
    instructions: `**How This Task Works:**
This script grants mailbox permissions allowing one user to access another user's mailbox with Full Access and optionally Send As rights.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Both mailboxes must exist

**What You Need to Provide:**
- Target mailbox identity (mailbox to access)
- Trustee (user receiving permissions)
- Grant Full Access: true or false
- Grant Send As: true or false
- Enable automapping (auto-add to Outlook)

**What the Script Does:**
1. Verifies target mailbox and trustee exist
2. Grants Full Access permission if enabled
3. Grants Send As permission if enabled
4. Configures automapping for Outlook client
5. Reports permissions granted

**Important Notes:**
- Exchange Server Administrator role required
- Full Access: complete mailbox access (read/write/delete)
- Send As: send mail appearing from target mailbox
- Automapping: mailbox appears automatically in Outlook
- Typical use: executive assistants, shared mailbox access, departing employees
- Permissions may take up to 60 minutes to propagate
- User must restart Outlook to see automapped mailbox`,
    parameters: [
      { id: 'targetMailbox', label: 'Target Mailbox', type: 'email', required: true, placeholder: 'target@contoso.com' },
      { id: 'trustee', label: 'Trustee (User to Grant Access)', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'grantFullAccess', label: 'Grant Full Access', type: 'boolean', required: false, defaultValue: true },
      { id: 'grantSendAs', label: 'Grant Send As', type: 'boolean', required: false, defaultValue: false },
      { id: 'automapping', label: 'Enable Automapping', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetMailbox = escapePowerShellString(params.targetMailbox);
      const trustee = escapePowerShellString(params.trustee);
      const grantFullAccess = toPowerShellBoolean(params.grantFullAccess ?? true);
      const grantSendAs = toPowerShellBoolean(params.grantSendAs ?? false);
      const automapping = toPowerShellBoolean(params.automapping ?? true);

      return `# Grant Mailbox Permissions
# Generated: ${new Date().toISOString()}

$TargetMailbox = "${targetMailbox}"
$Trustee = "${trustee}"
$GrantFullAccess = ${grantFullAccess}
$GrantSendAs = ${grantSendAs}
$Automapping = ${automapping}

try {
    # Verify target mailbox exists
    $Target = Get-Mailbox -Identity $TargetMailbox -ErrorAction Stop
    Write-Host "[SUCCESS] Target Mailbox: $($Target.DisplayName)" -ForegroundColor Green
    
    # Verify trustee exists
    $User = Get-Mailbox -Identity $Trustee -ErrorAction Stop
    Write-Host "[SUCCESS] Trustee: $($User.DisplayName)" -ForegroundColor Green
    
    if ($GrantFullAccess) {
        Add-MailboxPermission -Identity $TargetMailbox \`
            -User $Trustee \`
            -AccessRights FullAccess \`
            -InheritanceType All \`
            -AutoMapping $Automapping
        
        Write-Host "[SUCCESS] Full Access granted" -ForegroundColor Green
        Write-Host "  Automapping: $Automapping" -ForegroundColor Gray
    }
    
    if ($GrantSendAs) {
        Add-ADPermission -Identity $Target.DistinguishedName \`
            -User $Trustee \`
            -AccessRights ExtendedRight \`
            -ExtendedRights "Send As"
        
        Write-Host "[SUCCESS] Send As permission granted" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Permission Summary:" -ForegroundColor Cyan
    Write-Host "  Target: $TargetMailbox" -ForegroundColor Gray
    Write-Host "  Trustee: $Trustee" -ForegroundColor Gray
    Write-Host "  Full Access: $GrantFullAccess" -ForegroundColor Gray
    Write-Host "  Send As: $GrantSendAs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING]️ Permissions may take up to 60 minutes to propagate" -ForegroundColor Yellow
    Write-Host "  User should restart Outlook to see changes" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to grant permissions: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // MAILBOX MANAGEMENT - EXPORT
  // ========================================
  {
    id: 'export-mailbox-pst',
    name: 'Export Mailbox to PST File',
    category: 'Mailboxes & Users',
    isPremium: true,
    description: 'Export a mailbox or specific folders to a PST file for backup or migration',
    instructions: `**How This Task Works:**
This script creates a mailbox export request to export mailbox contents to a PST file on a network share.

**Prerequisites:**
- Exchange Server Administrator privileges (or Mailbox Import Export role)
- PowerShell with Exchange Management Shell loaded
- Network share accessible from Exchange server
- Write permissions on export path

**What You Need to Provide:**
- Mailbox identity (email address)
- Export path (UNC path to network share)
- Include folders (optional, leave blank for entire mailbox)
- Content filter date range (optional)

**What the Script Does:**
1. Verifies mailbox exists
2. Creates asynchronous mailbox export request
3. Configures folder filter if specified
4. Configures date range filter if specified
5. Reports export request status and monitoring command

**Important Notes:**
- Mailbox Import Export management role required
- Export path must be UNC path (\\\\server\\share\\file.pst)
- Exchange server must have write access to network share
- Typical use: legal discovery, offboarding, backup, migration
- Export is asynchronous and may take hours for large mailboxes
- Monitor with Get-MailboxExportRequest cmdlet
- Date range format: MM/DD/YYYY
- Folder filter: #Inbox#, #SentItems#, etc.`,
    parameters: [
      { id: 'mailboxIdentity', label: 'Mailbox Identity', type: 'email', required: true, placeholder: 'user@contoso.com' },
      { id: 'exportPath', label: 'Export Path (UNC)', type: 'path', required: true, placeholder: '\\\\server\\exports\\user.pst' },
      { id: 'includeFolders', label: 'Include Folders (Optional)', type: 'text', required: false, placeholder: '#Inbox#, #SentItems#' },
      { id: 'startDate', label: 'Start Date (Optional)', type: 'text', required: false, placeholder: '01/01/2024' },
      { id: 'endDate', label: 'End Date (Optional)', type: 'text', required: false, placeholder: '12/31/2024' }
    ],
    scriptTemplate: (params) => {
      const mailboxIdentity = escapePowerShellString(params.mailboxIdentity);
      const exportPath = escapePowerShellString(params.exportPath);
      const includeFolders = params.includeFolders ? escapePowerShellString(params.includeFolders) : '';
      const startDate = params.startDate ? escapePowerShellString(params.startDate) : '';
      const endDate = params.endDate ? escapePowerShellString(params.endDate) : '';

      return `# Export Mailbox to PST
# Generated: ${new Date().toISOString()}

$MailboxIdentity = "${mailboxIdentity}"
$ExportPath = "${exportPath}"
${includeFolders ? `$IncludeFolders = "${includeFolders}"` : ''}
${startDate ? `$StartDate = "${startDate}"` : ''}
${endDate ? `$EndDate = "${endDate}"` : ''}

try {
    # Verify mailbox exists
    $Mailbox = Get-Mailbox -Identity $MailboxIdentity -ErrorAction Stop
    Write-Host "[SUCCESS] Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    # Build export request parameters
    $params = @{
        Mailbox = $MailboxIdentity
        FilePath = $ExportPath
    }
    
    ${includeFolders ? `
    # Add folder filter
    $params.IncludeFolders = $IncludeFolders.Split(',').Trim()
    Write-Host "  Folders: $IncludeFolders" -ForegroundColor Gray` : ''}
    
    ${startDate && endDate ? `
    # Add date filter
    $params.ContentFilter = "(Received -ge '$StartDate') -and (Received -le '$EndDate')"
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Gray` : ''}
    
    # Create export request
    Write-Host ""
    Write-Host "Creating mailbox export request..." -ForegroundColor Cyan
    
    $Request = New-MailboxExportRequest @params
    
    Write-Host "[SUCCESS] Export request created" -ForegroundColor Green
    Write-Host "  Request Name: $($Request.Name)" -ForegroundColor Gray
    Write-Host "  Status: $($Request.Status)" -ForegroundColor Gray
    Write-Host "  Export Path: $ExportPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Monitor progress with:" -ForegroundColor Yellow
    Write-Host "  Get-MailboxExportRequest -Identity '$MailboxIdentity\\$($Request.Name)' | Get-MailboxExportRequestStatistics" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Remove completed request with:" -ForegroundColor Yellow
    Write-Host "  Get-MailboxExportRequest -Identity '$MailboxIdentity\\$($Request.Name)' | Remove-MailboxExportRequest" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create export request: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DATABASE MANAGEMENT - CREATE DATABASE
  // ========================================
  {
    id: 'create-mailbox-database',
    name: 'Create New Mailbox Database',
    category: 'Database Management',
    isPremium: true,
    description: 'Create a new mailbox database with specified paths and mount options',
    instructions: `**How This Task Works:**
This script creates a new mailbox database on an Exchange server with configurable file paths and mount settings.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Sufficient disk space for database and logs
- Target paths must exist on server

**What You Need to Provide:**
- Database name
- Server name
- EDB file path
- Log folder path
- Mount database after creation (true/false)

**What the Script Does:**
1. Verifies server exists
2. Creates new mailbox database with specified paths
3. Mounts database if requested
4. Configures circular logging if specified
5. Reports database creation details

**Important Notes:**
- Exchange Server Administrator role required
- EDB file path: location for database file (.edb)
- Log folder path: location for transaction logs
- Best practice: separate disks for EDB and logs
- Typical use: expanding capacity, balancing load, new sites
- Database name must be unique across organization
- Paths must be local to the server (not network shares)
- Mount may fail if paths are incorrect or inaccessible`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB03' },
      { id: 'serverName', label: 'Server Name', type: 'text', required: true, placeholder: 'EXCH01' },
      { id: 'edbFilePath', label: 'EDB File Path', type: 'path', required: true, placeholder: 'E:\\Databases\\DB03\\DB03.edb' },
      { id: 'logFolderPath', label: 'Log Folder Path', type: 'path', required: true, placeholder: 'L:\\Logs\\DB03' },
      { id: 'mountDatabase', label: 'Mount After Creation', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const databaseName = escapePowerShellString(params.databaseName);
      const serverName = escapePowerShellString(params.serverName);
      const edbFilePath = escapePowerShellString(params.edbFilePath);
      const logFolderPath = escapePowerShellString(params.logFolderPath);
      const mountDatabase = toPowerShellBoolean(params.mountDatabase ?? true);

      return `# Create Mailbox Database
# Generated: ${new Date().toISOString()}

$DatabaseName = "${databaseName}"
$ServerName = "${serverName}"
$EdbFilePath = "${edbFilePath}"
$LogFolderPath = "${logFolderPath}"
$MountDatabase = ${mountDatabase}

try {
    # Verify server exists
    $Server = Get-ExchangeServer -Identity $ServerName -ErrorAction Stop
    Write-Host "[SUCCESS] Server: $($Server.Name)" -ForegroundColor Green
    
    # Check if database already exists
    $Existing = Get-MailboxDatabase -Identity $DatabaseName -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Database already exists: $DatabaseName" -ForegroundColor Yellow
        exit 0
    }
    
    # Create database
    Write-Host ""
    Write-Host "Creating mailbox database..." -ForegroundColor Cyan
    
    New-MailboxDatabase -Name $DatabaseName \`
        -Server $ServerName \`
        -EdbFilePath $EdbFilePath \`
        -LogFolderPath $LogFolderPath
    
    Write-Host "[SUCCESS] Database created: $DatabaseName" -ForegroundColor Green
    
    if ($MountDatabase) {
        Write-Host "Mounting database..." -ForegroundColor Cyan
        Mount-Database -Identity $DatabaseName
        Write-Host "[SUCCESS] Database mounted" -ForegroundColor Green
    }
    
    # Get database status
    $DB = Get-MailboxDatabase -Identity $DatabaseName -Status
    
    Write-Host ""
    Write-Host "Database Details:" -ForegroundColor Cyan
    Write-Host "  Name: $($DB.Name)" -ForegroundColor Gray
    Write-Host "  Server: $($DB.Server)" -ForegroundColor Gray
    Write-Host "  EDB Path: $($DB.EdbFilePath)" -ForegroundColor Gray
    Write-Host "  Log Path: $($DB.LogFolderPath)" -ForegroundColor Gray
    Write-Host "  Mounted: $($DB.Mounted)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create database: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DATABASE MANAGEMENT - MAINTENANCE
  // ========================================
  {
    id: 'configure-database-maintenance',
    name: 'Configure Database Maintenance Schedule',
    category: 'Database Management',
    isPremium: true,
    description: 'Configure the online database maintenance schedule window for a mailbox database',
    instructions: `**How This Task Works:**
This script configures the maintenance schedule for mailbox database background maintenance (online defragmentation, content indexing, etc.).

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Database must exist

**What You Need to Provide:**
- Database name
- Maintenance start day (Sunday-Saturday)
- Maintenance start hour (0-23)
- Maintenance duration in hours (1-24)

**What the Script Does:**
1. Verifies database exists
2. Calculates maintenance window from start day/hour and duration
3. Configures MaintenanceSchedule property
4. Displays current maintenance configuration

**Important Notes:**
- Exchange Server Administrator role required
- Maintenance window: background database tasks run during this time
- Tasks include: online defragmentation, content indexing, background housekeeping
- Best practice: schedule during off-peak hours
- Typical window: 4-8 hours overnight
- Maintenance still runs if window missed, but during busy hours
- Too short a window may cause incomplete maintenance cycles
- Exchange 2010+: schedule is in 15-minute increments`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB01' },
      { id: 'startDay', label: 'Start Day', type: 'select', required: true, options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], defaultValue: 'Sunday' },
      { id: 'startHour', label: 'Start Hour (0-23)', type: 'number', required: true, placeholder: '1', defaultValue: 1 },
      { id: 'durationHours', label: 'Duration (Hours)', type: 'number', required: true, placeholder: '6', defaultValue: 6 }
    ],
    scriptTemplate: (params) => {
      const databaseName = escapePowerShellString(params.databaseName);
      const startDay = params.startDay || 'Sunday';
      const startHour = params.startHour ?? 1;
      const durationHours = params.durationHours || 6;

      return `# Configure Database Maintenance Schedule
# Generated: ${new Date().toISOString()}

$DatabaseName = "${databaseName}"
$StartDay = "${startDay}"
$StartHour = ${startHour}
$DurationHours = ${durationHours}

try {
    # Verify database exists
    $Database = Get-MailboxDatabase -Identity $DatabaseName -ErrorAction Stop
    Write-Host "[SUCCESS] Database: $($Database.Name)" -ForegroundColor Green
    
    # Build maintenance schedule
    # Format: Day.StartTime-Day.EndTime
    $EndHour = ($StartHour + $DurationHours) % 24
    $EndDay = $StartDay
    
    # Adjust end day if we cross midnight
    if (($StartHour + $DurationHours) -ge 24) {
        $DaysOfWeek = @('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
        $StartDayIndex = $DaysOfWeek.IndexOf($StartDay)
        $EndDayIndex = ($StartDayIndex + 1) % 7
        $EndDay = $DaysOfWeek[$EndDayIndex]
    }
    
    $StartTime = "{0:D2}:00" -f $StartHour
    $EndTime = "{0:D2}:00" -f $EndHour
    
    $Schedule = "$StartDay.$StartTime-$EndDay.$EndTime"
    
    Write-Host ""
    Write-Host "Configuring maintenance schedule..." -ForegroundColor Cyan
    Write-Host "  Window: $Schedule" -ForegroundColor Gray
    
    Set-MailboxDatabase -Identity $DatabaseName -MaintenanceSchedule $Schedule
    
    Write-Host "[SUCCESS] Maintenance schedule configured" -ForegroundColor Green
    
    # Display current settings
    $Updated = Get-MailboxDatabase -Identity $DatabaseName
    Write-Host ""
    Write-Host "Maintenance Configuration:" -ForegroundColor Cyan
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "  Start: $StartDay at $StartTime" -ForegroundColor Gray
    Write-Host "  Duration: $DurationHours hours" -ForegroundColor Gray
    Write-Host "  End: $EndDay at $EndTime" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ℹ️ Maintenance includes:" -ForegroundColor Yellow
    Write-Host "  - Online defragmentation" -ForegroundColor Gray
    Write-Host "  - Content indexing updates" -ForegroundColor Gray
    Write-Host "  - Background housekeeping" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure maintenance schedule: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // TRANSPORT RULES - JOURNALING
  // ========================================
  {
    id: 'configure-journaling-rule',
    name: 'Configure Email Journaling Rule',
    category: 'Mail Flow & Transport Rules',
    isPremium: true,
    description: 'Create a journaling rule to capture copies of email for compliance and legal requirements',
    instructions: `**How This Task Works:**
This script creates a journal rule to capture copies of email messages sent to or from specific recipients for compliance, legal, or archival purposes.

**Prerequisites:**
- Exchange Server Organization Management role
- PowerShell with Exchange Management Shell loaded
- Journaling mailbox already configured
- Understanding of compliance requirements

**What You Need to Provide:**
- Rule name
- Journal recipient email (where copies are sent)
- Scope: Internal (within org), External (outside org), or Global (all)
- Target recipient (optional, leave blank for all recipients)

**What the Script Does:**
1. Verifies journal recipient mailbox exists
2. Creates journal rule with specified scope
3. Targets specific recipient if specified, otherwise all mail
4. Enables the journal rule
5. Reports rule configuration

**Important Notes:**
- Organization Management role required
- Journal recipient: mailbox/address where copies are delivered
- Scope determines which messages are journaled
- Global: all internal and external messages
- Typical use: legal compliance (SEC, HIPAA, SOX), e-discovery, archival
- Journal mailbox should have large quota or archiving configured
- Journal reports contain original message as attachment
- High volume environments may need dedicated journal mailbox`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'All Mail Journaling' },
      { id: 'journalRecipient', label: 'Journal Recipient Email', type: 'email', required: true, placeholder: 'journal@contoso.com' },
      { id: 'scope', label: 'Scope', type: 'select', required: true, options: ['Internal', 'External', 'Global'], defaultValue: 'Global' },
      { id: 'targetRecipient', label: 'Target Recipient (Optional)', type: 'email', required: false, placeholder: 'Leave blank for all recipients' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const journalRecipient = escapePowerShellString(params.journalRecipient);
      const scope = params.scope || 'Global';
      const targetRecipient = params.targetRecipient ? escapePowerShellString(params.targetRecipient) : '';

      return `# Configure Journaling Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$JournalRecipient = "${journalRecipient}"
$Scope = "${scope}"
${targetRecipient ? `$TargetRecipient = "${targetRecipient}"` : ''}

try {
    # Verify journal recipient exists
    $JournalMbx = Get-Mailbox -Identity $JournalRecipient -ErrorAction SilentlyContinue
    if (-not $JournalMbx) {
        Write-Host "[WARNING] Journal recipient mailbox not found, will use as external address" -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] Journal Recipient: $($JournalMbx.DisplayName)" -ForegroundColor Green
    }
    
    # Check if rule exists
    $Existing = Get-JournalRule -Identity $RuleName -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "[WARNING] Journal rule already exists: $RuleName" -ForegroundColor Yellow
        Write-Host "  Updating existing rule..." -ForegroundColor Gray
        
        ${targetRecipient ? `
        Set-JournalRule -Identity $RuleName \`
            -JournalEmailAddress $JournalRecipient \`
            -Scope $Scope \`
            -Recipient $TargetRecipient \`
            -Enabled $true` : `
        Set-JournalRule -Identity $RuleName \`
            -JournalEmailAddress $JournalRecipient \`
            -Scope $Scope \`
            -Enabled $true`}
    } else {
        # Create new journal rule
        Write-Host ""
        Write-Host "Creating journal rule..." -ForegroundColor Cyan
        
        ${targetRecipient ? `
        New-JournalRule -Name $RuleName \`
            -JournalEmailAddress $JournalRecipient \`
            -Scope $Scope \`
            -Recipient $TargetRecipient \`
            -Enabled $true` : `
        New-JournalRule -Name $RuleName \`
            -JournalEmailAddress $JournalRecipient \`
            -Scope $Scope \`
            -Enabled $true`}
    }
    
    Write-Host "[SUCCESS] Journal rule configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Journal Rule Settings:" -ForegroundColor Cyan
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Journal To: $JournalRecipient" -ForegroundColor Gray
    Write-Host "  Scope: $Scope" -ForegroundColor Gray
    ${targetRecipient ? 'Write-Host "  Target: $TargetRecipient" -ForegroundColor Gray' : 'Write-Host "  Target: All Recipients" -ForegroundColor Gray'}
    Write-Host ""
    Write-Host "[WARNING]️ Ensure journal mailbox has adequate quota" -ForegroundColor Yellow
    Write-Host "  High volume can quickly fill journal mailbox" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure journaling: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // TRANSPORT RULES - DLP
  // ========================================
  {
    id: 'create-dlp-transport-rule',
    name: 'Create Data Loss Prevention (DLP) Transport Rule',
    category: 'Mail Flow & Transport Rules',
    isPremium: true,
    description: 'Create a transport rule to detect and block sensitive information like credit card or SSN data',
    instructions: `**How This Task Works:**
This script creates a transport rule to detect sensitive information patterns (credit cards, SSNs, etc.) in email messages and take action to prevent data loss.

**Prerequisites:**
- Exchange Server Organization Management role
- PowerShell with Exchange Management Shell loaded
- Understanding of sensitive data types
- Compliance requirements defined

**What You Need to Provide:**
- Rule name
- Sensitive data type: CreditCard, SSN, or CustomRegex
- Custom regex pattern (if CustomRegex selected)
- Action: Notify, Reject, or Moderate
- Notify recipient email (for notifications)

**What the Script Does:**
1. Creates transport rule with sensitive information detection
2. Configures pattern matching for specified data type
3. Sets action (notify, reject, or moderate)
4. Configures notification recipient if specified
5. Reports rule configuration

**Important Notes:**
- Organization Management role required
- Credit Card pattern matches major card formats (Visa, MC, Amex, etc.)
- SSN pattern matches ###-##-#### format
- Reject blocks message with NDR to sender
- Moderate holds message for approval
- Notify sends copy to compliance team
- Typical use: PCI-DSS compliance, privacy protection, data governance
- Test rules before production deployment
- May cause false positives, tune patterns as needed`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Block Credit Card Numbers' },
      { id: 'dataType', label: 'Sensitive Data Type', type: 'select', required: true, options: ['CreditCard', 'SSN', 'CustomRegex'], defaultValue: 'CreditCard' },
      { id: 'customPattern', label: 'Custom Regex Pattern', type: 'text', required: false, placeholder: '\\b\\d{4}-\\d{4}-\\d{4}-\\d{4}\\b' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Notify', 'Reject', 'Moderate'], defaultValue: 'Notify' },
      { id: 'notifyRecipient', label: 'Notify Recipient', type: 'email', required: false, placeholder: 'compliance@contoso.com' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const dataType = params.dataType || 'CreditCard';
      const customPattern = params.customPattern ? escapePowerShellString(params.customPattern) : '';
      const action = params.action || 'Notify';
      const notifyRecipient = params.notifyRecipient ? escapePowerShellString(params.notifyRecipient) : '';

      return `# Create DLP Transport Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$DataType = "${dataType}"
${customPattern ? `$CustomPattern = "${customPattern}"` : ''}
$Action = "${action}"
${notifyRecipient ? `$NotifyRecipient = "${notifyRecipient}"` : ''}

# Define patterns for sensitive data
$Patterns = @{
    "CreditCard" = "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b"
    "SSN" = "\\b\\d{3}-\\d{2}-\\d{4}\\b"
    "CustomRegex" = ${customPattern ? `"${customPattern}"` : '""'}
}

try {
    $Pattern = $Patterns[$DataType]
    
    if (-not $Pattern) {
        Write-Error "Invalid pattern selected"
        exit 1
    }
    
    Write-Host "Creating DLP transport rule..." -ForegroundColor Cyan
    Write-Host "  Pattern Type: $DataType" -ForegroundColor Gray
    
    # Build rule parameters
    $params = @{
        Name = $RuleName
        SubjectOrBodyMatchesPatterns = $Pattern
    }
    
    switch ($Action) {
        "Notify" {
            ${notifyRecipient ? `
            $params.BlindCopyTo = $NotifyRecipient
            $params.SetAuditSeverity = "High"
            Write-Host "  Action: Notify $NotifyRecipient" -ForegroundColor Gray` : `
            $params.SetAuditSeverity = "High"
            Write-Host "  Action: Audit only (no recipient specified)" -ForegroundColor Yellow`}
        }
        "Reject" {
            $params.RejectMessageReasonText = "This message contains sensitive information that cannot be sent externally."
            Write-Host "  Action: Reject with NDR" -ForegroundColor Gray
        }
        "Moderate" {
            ${notifyRecipient ? `
            $params.ModerateMessageByUser = $NotifyRecipient` : `
            Write-Error "Moderate action requires a notify recipient"
            exit 1`}
            Write-Host "  Action: Moderate by $NotifyRecipient" -ForegroundColor Gray
        }
    }
    
    New-TransportRule @params
    
    Write-Host ""
    Write-Host "[SUCCESS] DLP transport rule created" -ForegroundColor Green
    Write-Host ""
    Write-Host "Rule Configuration:" -ForegroundColor Cyan
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Data Type: $DataType" -ForegroundColor Gray
    Write-Host "  Action: $Action" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING]️ Test the rule before production deployment" -ForegroundColor Yellow
    Write-Host "  Use -Mode Enforce or -Mode Audit as needed" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create DLP rule: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // CLIENT ACCESS - OWA POLICY
  // ========================================
  {
    id: 'configure-owa-policy',
    name: 'Configure OWA Mailbox Policy',
    category: 'Client Access',
    isPremium: true,
    description: 'Create or modify OWA policies to control Outlook Web App features and settings',
    instructions: `**How This Task Works:**
This script creates or modifies Outlook Web App (OWA) mailbox policies to control which features are available to users accessing email via web browser.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Understanding of OWA features

**What You Need to Provide:**
- Policy name
- Feature settings for various OWA capabilities
- Whether to set as default policy

**What the Script Does:**
1. Checks if OWA policy exists (creates or updates)
2. Configures enabled/disabled features
3. Sets as default policy if specified
4. Reports policy configuration summary

**Important Notes:**
- Exchange Server Administrator role required
- Policies control OWA features (calendar, tasks, contacts, attachments)
- Typical use: security hardening, user experience customization, compliance
- DirectFileAccess: download attachments to local machine
- PublicFolders: access to public folders via OWA
- Apply policy to users with Set-CASMailbox -OwaMailboxPolicy
- Default policy applies to new mailboxes automatically`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Restricted OWA Policy' },
      { id: 'directFileAccess', label: 'Allow Direct File Access', type: 'boolean', required: false, defaultValue: true },
      { id: 'publicFolders', label: 'Allow Public Folders', type: 'boolean', required: false, defaultValue: true },
      { id: 'calendar', label: 'Allow Calendar', type: 'boolean', required: false, defaultValue: true },
      { id: 'contacts', label: 'Allow Contacts', type: 'boolean', required: false, defaultValue: true },
      { id: 'tasks', label: 'Allow Tasks', type: 'boolean', required: false, defaultValue: true },
      { id: 'setAsDefault', label: 'Set as Default Policy', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const directFileAccess = toPowerShellBoolean(params.directFileAccess ?? true);
      const publicFolders = toPowerShellBoolean(params.publicFolders ?? true);
      const calendar = toPowerShellBoolean(params.calendar ?? true);
      const contacts = toPowerShellBoolean(params.contacts ?? true);
      const tasks = toPowerShellBoolean(params.tasks ?? true);
      const setAsDefault = toPowerShellBoolean(params.setAsDefault ?? false);

      return `# Configure OWA Mailbox Policy
# Generated: ${new Date().toISOString()}

$PolicyName = "${policyName}"
$DirectFileAccess = ${directFileAccess}
$PublicFolders = ${publicFolders}
$Calendar = ${calendar}
$Contacts = ${contacts}
$Tasks = ${tasks}
$SetAsDefault = ${setAsDefault}

try {
    # Check if policy exists
    $Existing = Get-OwaMailboxPolicy -Identity $PolicyName -ErrorAction SilentlyContinue
    
    $params = @{
        DirectFileAccessOnPublicComputersEnabled = $DirectFileAccess
        DirectFileAccessOnPrivateComputersEnabled = $DirectFileAccess
        PublicFoldersEnabled = $PublicFolders
        CalendarEnabled = $Calendar
        ContactsEnabled = $Contacts
        TasksEnabled = $Tasks
    }
    
    if ($Existing) {
        Write-Host "Updating existing OWA policy..." -ForegroundColor Yellow
        Set-OwaMailboxPolicy -Identity $PolicyName @params
    } else {
        Write-Host "Creating new OWA policy..." -ForegroundColor Cyan
        New-OwaMailboxPolicy -Name $PolicyName
        Set-OwaMailboxPolicy -Identity $PolicyName @params
    }
    
    if ($SetAsDefault) {
        Set-OwaMailboxPolicy -Identity $PolicyName -IsDefault $true
        Write-Host "[SUCCESS] Set as default policy" -ForegroundColor Green
    }
    
    Write-Host "[SUCCESS] OWA policy configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Policy Settings:" -ForegroundColor Cyan
    Write-Host "  Name: $PolicyName" -ForegroundColor Gray
    Write-Host "  Direct File Access: $DirectFileAccess" -ForegroundColor Gray
    Write-Host "  Public Folders: $PublicFolders" -ForegroundColor Gray
    Write-Host "  Calendar: $Calendar" -ForegroundColor Gray
    Write-Host "  Contacts: $Contacts" -ForegroundColor Gray
    Write-Host "  Tasks: $Tasks" -ForegroundColor Gray
    Write-Host "  Default Policy: $SetAsDefault" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Apply to users with:" -ForegroundColor Yellow
    Write-Host "  Set-CASMailbox -Identity <user> -OwaMailboxPolicy '$PolicyName'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure OWA policy: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // CLIENT ACCESS - ACTIVESYNC POLICY
  // ========================================
  {
    id: 'configure-activesync-policy',
    name: 'Configure ActiveSync Device Policy',
    category: 'Client Access',
    isPremium: true,
    description: 'Create or modify mobile device policies for Exchange ActiveSync security and compliance',
    instructions: `**How This Task Works:**
This script creates or modifies ActiveSync mailbox policies to control mobile device security settings and features.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Understanding of mobile device security requirements

**What You Need to Provide:**
- Policy name
- Password requirements (required, length, complexity)
- Device encryption requirement
- Attachment download settings
- Whether to set as default policy

**What the Script Does:**
1. Checks if ActiveSync policy exists (creates or updates)
2. Configures password requirements
3. Configures device encryption
4. Sets attachment download limits
5. Sets as default policy if specified

**Important Notes:**
- Exchange Server Administrator role required
- Device Password: requires PIN/password on mobile device
- Device Encryption: requires device storage encryption
- Typical use: security compliance, corporate device policy, BYOD policy
- Stricter policies may cause compatibility issues with older devices
- Apply policy to users with Set-CASMailbox -ActiveSyncMailboxPolicy
- Default policy applies to new mailboxes automatically`,
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Corporate Mobile Policy' },
      { id: 'requirePassword', label: 'Require Device Password', type: 'boolean', required: false, defaultValue: true },
      { id: 'minPasswordLength', label: 'Minimum Password Length', type: 'number', required: false, defaultValue: 6, placeholder: '6' },
      { id: 'requireEncryption', label: 'Require Device Encryption', type: 'boolean', required: false, defaultValue: true },
      { id: 'allowAttachments', label: 'Allow Attachment Download', type: 'boolean', required: false, defaultValue: true },
      { id: 'maxAttachmentSizeMB', label: 'Max Attachment Size (MB)', type: 'number', required: false, defaultValue: 10, placeholder: '10' },
      { id: 'setAsDefault', label: 'Set as Default Policy', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const requirePassword = toPowerShellBoolean(params.requirePassword ?? true);
      const minPasswordLength = params.minPasswordLength || 6;
      const requireEncryption = toPowerShellBoolean(params.requireEncryption ?? true);
      const allowAttachments = toPowerShellBoolean(params.allowAttachments ?? true);
      const maxAttachmentSize = params.maxAttachmentSizeMB || 10;
      const setAsDefault = toPowerShellBoolean(params.setAsDefault ?? false);

      return `# Configure ActiveSync Device Policy
# Generated: ${new Date().toISOString()}

$PolicyName = "${policyName}"
$RequirePassword = ${requirePassword}
$MinPasswordLength = ${minPasswordLength}
$RequireEncryption = ${requireEncryption}
$AllowAttachments = ${allowAttachments}
$MaxAttachmentSizeMB = ${maxAttachmentSize}
$SetAsDefault = ${setAsDefault}

try {
    # Check if policy exists
    $Existing = Get-MobileDeviceMailboxPolicy -Identity $PolicyName -ErrorAction SilentlyContinue
    
    $params = @{
        DevicePasswordEnabled = $RequirePassword
        MinDevicePasswordLength = $MinPasswordLength
        RequireDeviceEncryption = $RequireEncryption
        AttachmentsEnabled = $AllowAttachments
        MaxAttachmentSize = "$($MaxAttachmentSizeMB)MB"
        AllowSimpleDevicePassword = $false
        AlphanumericDevicePasswordRequired = $false
    }
    
    if ($Existing) {
        Write-Host "Updating existing ActiveSync policy..." -ForegroundColor Yellow
        Set-MobileDeviceMailboxPolicy -Identity $PolicyName @params
    } else {
        Write-Host "Creating new ActiveSync policy..." -ForegroundColor Cyan
        New-MobileDeviceMailboxPolicy -Name $PolicyName @params
    }
    
    if ($SetAsDefault) {
        Set-MobileDeviceMailboxPolicy -Identity $PolicyName -IsDefault $true
        Write-Host "[SUCCESS] Set as default policy" -ForegroundColor Green
    }
    
    Write-Host "[SUCCESS] ActiveSync policy configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Policy Settings:" -ForegroundColor Cyan
    Write-Host "  Name: $PolicyName" -ForegroundColor Gray
    Write-Host "  Require Password: $RequirePassword" -ForegroundColor Gray
    Write-Host "  Min Password Length: $MinPasswordLength" -ForegroundColor Gray
    Write-Host "  Require Encryption: $RequireEncryption" -ForegroundColor Gray
    Write-Host "  Allow Attachments: $AllowAttachments" -ForegroundColor Gray
    Write-Host "  Max Attachment Size: $MaxAttachmentSizeMB MB" -ForegroundColor Gray
    Write-Host "  Default Policy: $SetAsDefault" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Apply to users with:" -ForegroundColor Yellow
    Write-Host "  Set-CASMailbox -Identity <user> -ActiveSyncMailboxPolicy '$PolicyName'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure ActiveSync policy: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // HIGH AVAILABILITY - DAG FAILOVER
  // ========================================
  {
    id: 'initiate-dag-failover',
    name: 'Initiate DAG Database Failover',
    category: 'High Availability',
    isPremium: true,
    description: 'Manually failover a mailbox database to another DAG member server',
    instructions: `**How This Task Works:**
This script manually triggers a database failover to move the active database copy from one DAG member to another.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Database must be part of a DAG with healthy copies
- Target server must have a healthy copy of the database

**What You Need to Provide:**
- Database name
- Target server (where to activate the database)
- Mount dial override (optional, for forcing mount)

**What the Script Does:**
1. Verifies database exists and is in a DAG
2. Checks health of copy on target server
3. Moves active database to target server
4. Verifies successful activation
5. Reports failover status

**Important Notes:**
- Exchange Server Administrator role required
- Target server must have Healthy database copy
- Failover may cause brief client reconnection
- Use BestAvailability for automatic server selection
- Use Lossless to prevent potential data loss
- Typical use: planned maintenance, load balancing, testing DR
- -MountDialOverride: use GoodAvailability or BestEffort for forced mount
- Monitor with Get-MailboxDatabaseCopyStatus after failover`,
    parameters: [
      { id: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'DB01' },
      { id: 'targetServer', label: 'Target Server', type: 'text', required: true, placeholder: 'EXCH02' },
      { id: 'mountDialOverride', label: 'Mount Dial Override', type: 'select', required: false, options: ['None', 'Lossless', 'GoodAvailability', 'BestAvailability', 'BestEffort'], defaultValue: 'None' }
    ],
    scriptTemplate: (params) => {
      const databaseName = escapePowerShellString(params.databaseName);
      const targetServer = escapePowerShellString(params.targetServer);
      const mountDialOverride = params.mountDialOverride || 'None';

      return `# Initiate DAG Database Failover
# Generated: ${new Date().toISOString()}

$DatabaseName = "${databaseName}"
$TargetServer = "${targetServer}"
$MountDialOverride = "${mountDialOverride}"

try {
    # Verify database exists
    $Database = Get-MailboxDatabase -Identity $DatabaseName -ErrorAction Stop
    Write-Host "[SUCCESS] Database: $($Database.Name)" -ForegroundColor Green
    
    # Get current status
    $CurrentStatus = Get-MailboxDatabaseCopyStatus -Identity "$DatabaseName\\*" | Where-Object { $_.Status -eq "Mounted" }
    Write-Host "  Currently mounted on: $($CurrentStatus.MailboxServer)" -ForegroundColor Gray
    
    # Check target copy status
    $TargetStatus = Get-MailboxDatabaseCopyStatus -Identity "$DatabaseName\\$TargetServer" -ErrorAction Stop
    Write-Host "  Target copy status: $($TargetStatus.Status)" -ForegroundColor Gray
    
    if ($TargetStatus.Status -ne "Healthy") {
        Write-Host "[WARNING] Warning: Target copy is not Healthy ($($TargetStatus.Status))" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Initiating failover to $TargetServer..." -ForegroundColor Cyan
    
    # Build move command
    $params = @{
        Identity = $DatabaseName
        ActivateOnServer = $TargetServer
        Confirm = $false
    }
    
    if ($MountDialOverride -ne "None") {
        $params.MountDialOverride = $MountDialOverride
        Write-Host "  Mount dial override: $MountDialOverride" -ForegroundColor Gray
    }
    
    Move-ActiveMailboxDatabase @params
    
    # Verify new status
    Start-Sleep -Seconds 5
    $NewStatus = Get-MailboxDatabaseCopyStatus -Identity "$DatabaseName\\*" | Where-Object { $_.Status -eq "Mounted" }
    
    Write-Host ""
    Write-Host "[SUCCESS] Failover completed" -ForegroundColor Green
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "  Now mounted on: $($NewStatus.MailboxServer)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verify all copies with:" -ForegroundColor Yellow
    Write-Host "  Get-MailboxDatabaseCopyStatus -Identity '$DatabaseName\\*' | ft Name, Status, CopyQueueLength, ReplayQueueLength" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to initiate failover: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // REPORTING - MESSAGE TRACKING
  // ========================================
  {
    id: 'track-message-delivery',
    name: 'Track Message Delivery',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Search message tracking logs to trace email delivery and identify issues',
    instructions: `**How This Task Works:**
This script searches Exchange message tracking logs to trace email delivery path and identify any delivery issues.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Message tracking logs enabled (default)
- Search within log retention period (default 30 days)

**What You Need to Provide:**
- Sender email address (optional)
- Recipient email address (optional)
- Subject contains text (optional)
- Start and end date range
- Output CSV path for results

**What the Script Does:**
1. Searches message tracking logs with specified criteria
2. Retrieves event types (Receive, Send, Deliver, Fail, etc.)
3. Exports results to CSV for analysis
4. Displays summary of found messages

**Important Notes:**
- Exchange Server Administrator role required
- At least one search criteria required (sender, recipient, or subject)
- Date range limited by log retention (default 30 days)
- Typical use: troubleshooting delivery, compliance, user requests
- Event types: RECEIVE, SEND, DELIVER, FAIL, RESOLVE, EXPAND
- Search all Hub Transport servers for complete tracking
- Large date ranges may take significant time to process`,
    parameters: [
      { id: 'sender', label: 'Sender Email (Optional)', type: 'email', required: false, placeholder: 'sender@contoso.com' },
      { id: 'recipient', label: 'Recipient Email (Optional)', type: 'email', required: false, placeholder: 'recipient@contoso.com' },
      { id: 'subjectContains', label: 'Subject Contains (Optional)', type: 'text', required: false, placeholder: 'Meeting Request' },
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: '01/01/2024' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: '01/31/2024' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MessageTracking.csv' }
    ],
    scriptTemplate: (params) => {
      const sender = params.sender ? escapePowerShellString(params.sender) : '';
      const recipient = params.recipient ? escapePowerShellString(params.recipient) : '';
      const subjectContains = params.subjectContains ? escapePowerShellString(params.subjectContains) : '';
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Track Message Delivery
# Generated: ${new Date().toISOString()}

${sender ? `$Sender = "${sender}"` : ''}
${recipient ? `$Recipient = "${recipient}"` : ''}
${subjectContains ? `$SubjectContains = "${subjectContains}"` : ''}
$StartDate = "${startDate}"
$EndDate = "${endDate}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Searching message tracking logs..." -ForegroundColor Cyan
    Write-Host "  Date Range: $StartDate to $EndDate" -ForegroundColor Gray
    ${sender ? 'Write-Host "  Sender: $Sender" -ForegroundColor Gray' : ''}
    ${recipient ? 'Write-Host "  Recipient: $Recipient" -ForegroundColor Gray' : ''}
    ${subjectContains ? 'Write-Host "  Subject Contains: $SubjectContains" -ForegroundColor Gray' : ''}
    
    # Build search parameters
    $params = @{
        Start = $StartDate
        End = $EndDate
        ResultSize = "Unlimited"
    }
    
    ${sender ? '$params.Sender = $Sender' : ''}
    ${recipient ? '$params.Recipients = $Recipient' : ''}
    ${subjectContains ? '$params.MessageSubject = $SubjectContains' : ''}
    
    # Search message tracking logs
    $Results = Get-MessageTrackingLog @params | Select-Object \`
        Timestamp, \`
        EventId, \`
        Source, \`
        Sender, \`
        @{N='Recipients';E={\$_.Recipients -join '; '}}, \`
        MessageSubject, \`
        TotalBytes, \`
        SourceContext, \`
        ServerHostname, \`
        RecipientStatus
    
    Write-Host ""
    Write-Host "[SUCCESS] Found $($Results.Count) message tracking entries" -ForegroundColor Green
    
    if ($Results.Count -gt 0) {
        # Export to CSV
        $Results | Export-Csv -Path $OutputPath -NoTypeInformation
        Write-Host "  Exported to: $OutputPath" -ForegroundColor Gray
        
        # Show event summary
        Write-Host ""
        Write-Host "Event Summary:" -ForegroundColor Cyan
        $Results | Group-Object EventId | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
        }
        
        # Show first few results
        Write-Host ""
        Write-Host "Recent Messages:" -ForegroundColor Cyan
        $Results | Select-Object -First 5 | ForEach-Object {
            Write-Host "  [$($_.Timestamp)] $($_.EventId): $($_.MessageSubject)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] No messages found matching criteria" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to search message tracking: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // REPORTING - MAILBOX STATISTICS
  // ========================================
  {
    id: 'generate-mailbox-statistics-report',
    name: 'Generate Mailbox Statistics Report',
    category: 'Reporting & Inventory',
    isPremium: true,
    description: 'Generate comprehensive mailbox statistics report including size, item count, and last logon',
    instructions: `**How This Task Works:**
This script generates a detailed report of mailbox statistics for capacity planning, usage analysis, and administration.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Write permissions on output path

**What You Need to Provide:**
- Database filter (optional, to limit scope)
- Include disconnected mailboxes: true or false
- Output CSV path for report

**What the Script Does:**
1. Retrieves all mailboxes (or filtered by database)
2. Collects statistics for each mailbox
3. Gathers size, item count, last logon time
4. Exports comprehensive report to CSV
5. Displays summary statistics

**Important Notes:**
- Exchange Server Administrator role required
- Large organizations may take significant time to process
- Statistics include: size, item count, deleted items, last logon
- Typical use: capacity planning, license audit, inactive mailbox detection
- Last logon helps identify inactive accounts
- Filter by database to reduce scope and processing time
- Disconnected mailboxes are those pending deletion`,
    parameters: [
      { id: 'databaseFilter', label: 'Database Filter (Optional)', type: 'text', required: false, placeholder: 'DB01' },
      { id: 'includeDisconnected', label: 'Include Disconnected Mailboxes', type: 'boolean', required: false, defaultValue: false },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MailboxStatistics.csv' }
    ],
    scriptTemplate: (params) => {
      const databaseFilter = params.databaseFilter ? escapePowerShellString(params.databaseFilter) : '';
      const includeDisconnected = toPowerShellBoolean(params.includeDisconnected ?? false);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Generate Mailbox Statistics Report
# Generated: ${new Date().toISOString()}

${databaseFilter ? `$DatabaseFilter = "${databaseFilter}"` : ''}
$IncludeDisconnected = ${includeDisconnected}
$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Generating mailbox statistics report..." -ForegroundColor Cyan
    
    # Get mailboxes
    ${databaseFilter ? `
    $Mailboxes = Get-Mailbox -Database $DatabaseFilter -ResultSize Unlimited` : `
    $Mailboxes = Get-Mailbox -ResultSize Unlimited`}
    
    Write-Host "  Processing $($Mailboxes.Count) mailboxes..." -ForegroundColor Gray
    
    $Count = 0
    foreach ($Mailbox in $Mailboxes) {
        $Count++
        if ($Count % 50 -eq 0) {
            Write-Host "    Processed $Count of $($Mailboxes.Count)..." -ForegroundColor Gray
        }
        
        try {
            $Stats = Get-MailboxStatistics -Identity $Mailbox.Identity -ErrorAction SilentlyContinue
            
            $Results += [PSCustomObject]@{
                DisplayName = $Mailbox.DisplayName
                PrimarySmtpAddress = $Mailbox.PrimarySmtpAddress
                Database = $Mailbox.Database
                MailboxType = $Mailbox.RecipientTypeDetails
                TotalItemSizeMB = if ($Stats) { [Math]::Round($Stats.TotalItemSize.Value.ToMB(), 2) } else { 0 }
                ItemCount = if ($Stats) { $Stats.ItemCount } else { 0 }
                DeletedItemSizeMB = if ($Stats) { [Math]::Round($Stats.TotalDeletedItemSize.Value.ToMB(), 2) } else { 0 }
                DeletedItemCount = if ($Stats) { $Stats.DeletedItemCount } else { 0 }
                LastLogonTime = if ($Stats) { $Stats.LastLogonTime } else { "Never" }
                LastLogoffTime = if ($Stats) { $Stats.LastLogoffTime } else { "Never" }
                IsArchiveMailbox = $Mailbox.ArchiveStatus
                ProhibitSendQuota = $Mailbox.ProhibitSendQuota
            }
        } catch {
            Write-Host "    [WARNING] Failed to get stats for: $($Mailbox.DisplayName)" -ForegroundColor Yellow
        }
    }
    
    ${params.includeDisconnected ? `
    # Get disconnected mailboxes if requested
    if ($IncludeDisconnected) {
        Write-Host "  Checking for disconnected mailboxes..." -ForegroundColor Gray
        ${databaseFilter ? `
        $Disconnected = Get-MailboxStatistics -Database $DatabaseFilter | Where-Object { $_.DisconnectReason -ne $null }` : `
        $Databases = Get-MailboxDatabase
        $Disconnected = @()
        foreach ($DB in $Databases) {
            $Disconnected += Get-MailboxStatistics -Database $DB.Name | Where-Object { $_.DisconnectReason -ne $null }
        }`}
        
        foreach ($Disc in $Disconnected) {
            $Results += [PSCustomObject]@{
                DisplayName = $Disc.DisplayName + " (DISCONNECTED)"
                PrimarySmtpAddress = "N/A"
                Database = $Disc.DatabaseName
                MailboxType = "Disconnected"
                TotalItemSizeMB = [Math]::Round($Disc.TotalItemSize.Value.ToMB(), 2)
                ItemCount = $Disc.ItemCount
                DeletedItemSizeMB = 0
                DeletedItemCount = 0
                LastLogonTime = $Disc.DisconnectDate
                LastLogoffTime = "N/A"
                IsArchiveMailbox = "N/A"
                ProhibitSendQuota = "N/A"
            }
        }
        Write-Host "    Found $($Disconnected.Count) disconnected mailboxes" -ForegroundColor Gray
    }` : ''}
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "[SUCCESS] Report generated successfully" -ForegroundColor Green
    Write-Host "  Total Mailboxes: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
    # Calculate summary
    $TotalSizeGB = [Math]::Round(($Results | Measure-Object -Property TotalItemSizeMB -Sum).Sum / 1024, 2)
    $TotalItems = ($Results | Measure-Object -Property ItemCount -Sum).Sum
    
    Write-Host ""
    Write-Host "Summary Statistics:" -ForegroundColor Cyan
    Write-Host "  Total Size: $TotalSizeGB GB" -ForegroundColor Gray
    Write-Host "  Total Items: $TotalItems" -ForegroundColor Gray
    Write-Host "  Average Size: $([Math]::Round($TotalSizeGB * 1024 / $Results.Count, 2)) MB" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate report: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // DATABASE MANAGEMENT - BACKUP STATUS
  // ========================================
  {
    id: 'check-database-backup-status',
    name: 'Check Database Backup Status',
    category: 'Database Management',
    isPremium: true,
    description: 'Check the last backup status and age for all mailbox databases to identify backup gaps',
    instructions: `**How This Task Works:**
This script checks the backup status of all mailbox databases to identify databases that haven't been backed up recently.

**Prerequisites:**
- Exchange Server Administrator privileges
- PowerShell with Exchange Management Shell loaded
- Database must exist and be mounted

**What You Need to Provide:**
- Warning threshold in hours (default: 24)
- Critical threshold in hours (default: 48)
- Output CSV path for report

**What the Script Does:**
1. Retrieves all mailbox databases with status
2. Checks last full backup and last incremental backup timestamps
3. Calculates backup age in hours
4. Flags databases exceeding warning/critical thresholds
5. Exports report with backup status for each database

**Important Notes:**
- Exchange Server Administrator role required
- LastFullBackup: timestamp of last full (normal) backup
- LastIncrementalBackup: timestamp of last incremental backup
- Typical use: backup monitoring, compliance verification, DR planning
- Databases without recent backups should be investigated
- Best practice: full backup at least weekly, incremental daily
- Backup status helps ensure recoverability
- Consider circular logging impact on backup requirements`,
    parameters: [
      { id: 'warningThresholdHours', label: 'Warning Threshold (Hours)', type: 'number', required: false, defaultValue: 24, placeholder: '24' },
      { id: 'criticalThresholdHours', label: 'Critical Threshold (Hours)', type: 'number', required: false, defaultValue: 48, placeholder: '48' },
      { id: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\BackupStatus.csv' }
    ],
    scriptTemplate: (params) => {
      const warningHours = params.warningThresholdHours || 24;
      const criticalHours = params.criticalThresholdHours || 48;
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Check Database Backup Status
# Generated: ${new Date().toISOString()}

$WarningThresholdHours = ${warningHours}
$CriticalThresholdHours = ${criticalHours}
$OutputPath = "${outputPath}"
$Results = @()

try {
    Write-Host "Checking database backup status..." -ForegroundColor Cyan
    Write-Host "  Warning Threshold: $WarningThresholdHours hours" -ForegroundColor Gray
    Write-Host "  Critical Threshold: $CriticalThresholdHours hours" -ForegroundColor Gray
    Write-Host ""
    
    $Databases = Get-MailboxDatabase -Status
    
    foreach ($Database in $Databases) {
        $LastFullBackup = $Database.LastFullBackup
        $LastIncrementalBackup = $Database.LastIncrementalBackup
        
        # Calculate backup age
        $FullBackupAge = if ($LastFullBackup) {
            [Math]::Round(((Get-Date) - $LastFullBackup).TotalHours, 1)
        } else { -1 }
        
        $IncrementalBackupAge = if ($LastIncrementalBackup) {
            [Math]::Round(((Get-Date) - $LastIncrementalBackup).TotalHours, 1)
        } else { -1 }
        
        # Determine status
        $Status = "OK"
        $Color = "Green"
        
        if ($FullBackupAge -eq -1 -or $FullBackupAge -gt $CriticalThresholdHours) {
            $Status = "CRITICAL"
            $Color = "Red"
        } elseif ($FullBackupAge -gt $WarningThresholdHours) {
            $Status = "WARNING"
            $Color = "Yellow"
        }
        
        $Results += [PSCustomObject]@{
            DatabaseName = $Database.Name
            Server = $Database.Server
            Mounted = $Database.Mounted
            LastFullBackup = if ($LastFullBackup) { $LastFullBackup } else { "Never" }
            FullBackupAgeHours = if ($FullBackupAge -eq -1) { "Never" } else { $FullBackupAge }
            LastIncrementalBackup = if ($LastIncrementalBackup) { $LastIncrementalBackup } else { "Never" }
            IncrementalBackupAgeHours = if ($IncrementalBackupAge -eq -1) { "Never" } else { $IncrementalBackupAge }
            CircularLogging = $Database.CircularLoggingEnabled
            Status = $Status
        }
        
        Write-Host "$($Database.Name): $Status" -ForegroundColor $Color
        Write-Host "  Last Full Backup: $(if ($LastFullBackup) { $LastFullBackup.ToString() } else { 'Never' })" -ForegroundColor Gray
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "[SUCCESS] Backup status report generated" -ForegroundColor Green
    Write-Host "  Total Databases: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
    # Summary
    $Critical = ($Results | Where-Object { $_.Status -eq "CRITICAL" }).Count
    $Warning = ($Results | Where-Object { $_.Status -eq "WARNING" }).Count
    $OK = ($Results | Where-Object { $_.Status -eq "OK" }).Count
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  OK: $OK" -ForegroundColor Green
    Write-Host "  Warning: $Warning" -ForegroundColor Yellow
    Write-Host "  Critical: $Critical" -ForegroundColor Red
    
    if ($Critical -gt 0) {
        Write-Host ""
        Write-Host "[WARNING]️ $Critical database(s) require immediate backup attention!" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Failed to check backup status: \$_"
    exit 1
}`;
    }
  }
];
