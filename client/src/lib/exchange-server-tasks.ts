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
}

export const exchangeServerTasks: ExchangeServerTask[] = [
  // ========================================
  // MAILBOXES & USERS CATEGORY
  // ========================================
  {
    id: 'create-mailbox-onprem',
    name: 'Create New Mailbox (User/Shared/Resource)',
    category: 'Mailboxes & Users',
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
        Write-Host "⚠ Mailbox already exists: $Alias" -ForegroundColor Yellow
        exit 0
    }
    
    # Verify database exists
    $DB = Get-MailboxDatabase -Identity $Database -ErrorAction Stop
    Write-Host "✓ Target Database: $($DB.Name)" -ForegroundColor Green
    
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
            Write-Host "✓ User mailbox enabled" -ForegroundColor Green
        }
        "Shared" {
            New-Mailbox @params -Shared
            Write-Host "✓ Shared mailbox created" -ForegroundColor Green
        }
        "Room" {
            New-Mailbox @params -Room
            Write-Host "✓ Room mailbox created" -ForegroundColor Green
        }
        "Equipment" {
            New-Mailbox @params -Equipment
            Write-Host "✓ Equipment mailbox created" -ForegroundColor Green
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
    Write-Host "✓ Source Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    Write-Host "  Current Database: $($Mailbox.Database)" -ForegroundColor Gray
    
    # Verify target database exists
    $TargetDB = Get-MailboxDatabase -Identity $TargetDatabase -ErrorAction Stop
    Write-Host "✓ Target Database: $($TargetDB.Name)" -ForegroundColor Green
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "⚠ TEST MODE - No mailbox will be moved" -ForegroundColor Yellow
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
        
        Write-Host "✓ Move request created" -ForegroundColor Green
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
    Write-Host "✓ Mailbox: $($Mailbox.DisplayName)" -ForegroundColor Green
    
    # Set CAS mailbox settings
    Set-CASMailbox -Identity $MailboxIdentity \`
        -OWAEnabled $OWAEnabled \`
        -ActiveSyncEnabled $ActiveSyncEnabled \`
        -PopEnabled $POPEnabled \`
        -ImapEnabled $IMAPEnabled
    
    Write-Host "✓ Protocol access configured" -ForegroundColor Green
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
        Write-Host "⚠ Group already exists: $EmailAddress" -ForegroundColor Yellow
        exit 0
    }
    
    # Create distribution group
    New-DistributionGroup -Name $GroupName \`
        -PrimarySmtpAddress $EmailAddress \`
        -ManagedBy $Owner \`
        -Type "Distribution"
    
    Write-Host "✓ Distribution group created" -ForegroundColor Green
    
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
    Write-Error "Failed to create distribution group: $_"
    exit 1
}`;
    }
  },

  {
    id: 'set-dg-moderation',
    name: 'Set Group Moderation and Delivery Restrictions',
    category: 'Distribution Groups & Contacts',
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
    Write-Host "✓ Group: $($Group.DisplayName)" -ForegroundColor Green
    
    # Configure moderation
    $params = @{
        Identity = $GroupIdentity
        ModerationEnabled = $ModerationEnabled
        RequireSenderAuthenticationEnabled = $RequireSenderAuth
    }
    
    ${moderators.length > 0 ? '$params.ModeratedBy = $Moderators' : ''}
    
    Set-DistributionGroup @params
    
    Write-Host "✓ Moderation configured" -ForegroundColor Green
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
        Write-Host "⚠ Rule already exists. Updating..." -ForegroundColor Yellow
        Set-TransportRule -Identity $RuleName -Enabled $Enabled
        Write-Host "✓ Transport rule updated" -ForegroundColor Green
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
        Write-Host "✓ Transport rule created" -ForegroundColor Green
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
            Write-Host "⚠ Domain already exists. Updating type..." -ForegroundColor Yellow
            Set-AcceptedDomain -Identity $DomainName -DomainType $DomainType
            Write-Host "✓ Domain type updated to: $DomainType" -ForegroundColor Green
        } else {
            New-AcceptedDomain -Name $DomainName -DomainName $DomainName -DomainType $DomainType
            Write-Host "✓ Accepted domain added" -ForegroundColor Green
        }
    } else {
        # Remove domain
        if ($Existing) {
            Remove-AcceptedDomain -Identity $DomainName -Confirm:\$false
            Write-Host "✓ Accepted domain removed" -ForegroundColor Green
        } else {
            Write-Host "⚠ Domain does not exist: $DomainName" -ForegroundColor Yellow
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
        Write-Host "⚠ Database already exists: $DatabaseName" -ForegroundColor Yellow
        exit 0
    }
    
    # Create database
    New-MailboxDatabase -Server $Server \`
        -Name $DatabaseName \`
        -EdbFilePath $EdbFilePath \`
        -LogFolderPath $LogFolderPath
    
    Write-Host "✓ Mailbox database created" -ForegroundColor Green
    
    # Mount database
    Write-Host "Mounting database..." -ForegroundColor Cyan
    Mount-Database -Identity $DatabaseName
    
    Write-Host "✓ Database mounted successfully!" -ForegroundColor Green
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
    Write-Host "✓ Database: $($Database.Name)" -ForegroundColor Green
    Write-Host "  Server: $($Database.Server)" -ForegroundColor Gray
    Write-Host "  Current Status: $($Database.Mounted)" -ForegroundColor Gray
    
    if ($Action -eq "Mount") {
        if ($Database.Mounted) {
            Write-Host "⚠ Database is already mounted" -ForegroundColor Yellow
        } else {
            Mount-Database -Identity $DatabaseName
            Write-Host "✓ Database mounted successfully!" -ForegroundColor Green
        }
    } else {
        if (-not $Database.Mounted) {
            Write-Host "⚠ Database is already dismounted" -ForegroundColor Yellow
        } else {
            Dismount-Database -Identity $DatabaseName -Confirm:\$false
            Write-Host "✓ Database dismounted successfully!" -ForegroundColor Green
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
    Write-Host "✓ DAG health report generated!" -ForegroundColor Green
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
    
    Write-Host "✓ Found $($Disconnected.Count) disconnected mailboxes" -ForegroundColor Green
    
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
                Write-Host "  ✓ Purged: $($Mailbox.DisplayName)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to purge: $($Mailbox.DisplayName)" -ForegroundColor Red
            }
        } else {
            Write-Host "  Found: $($Mailbox.DisplayName) - $($Mailbox.DisconnectReason)" -ForegroundColor Gray
        }
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Operation completed!" -ForegroundColor Green
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
    
    Write-Host "✓ Found $($Mailboxes.Count) mailboxes" -ForegroundColor Green
    
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
            Write-Host "  ✓ Enabled: $($Mailbox.DisplayName)" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed: $($Mailbox.DisplayName) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ Mailbox auditing enabled!" -ForegroundColor Green
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
        
        Write-Host "✓ $($Database.Name): $([Math]::Round($DBSize / 1GB, 2)) GB" -ForegroundColor Green
    }
    
    # Export report
    $Results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Database size report generated!" -ForegroundColor Green
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
    Write-Host "✓ Queue monitoring report generated!" -ForegroundColor Green
    Write-Host "  Queues Checked: $($Results.Count)" -ForegroundColor Gray
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    
    # Alert if threshold exceeded
    $HighQueues = $Results | Where-Object { $_.MessageCount -gt $ThresholdCount }
    if ($HighQueues) {
        Write-Host ""
        Write-Host "⚠ WARNING: $($HighQueues.Count) queue(s) exceed threshold!" -ForegroundColor Red
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
    
    Write-Host "✓ Found $($Services.Count) services" -ForegroundColor Green
    
    foreach ($Service in $Services) {
        try {
            if ($Action -eq "Start") {
                if ($Service.Status -ne "Running") {
                    Start-Service -InputObject $Service
                    Write-Host "  ✓ Started: $($Service.DisplayName)" -ForegroundColor Green
                }
            } elseif ($Action -eq "Stop") {
                if ($Service.Status -eq "Running") {
                    Stop-Service -InputObject $Service -Force
                    Write-Host "  ✓ Stopped: $($Service.DisplayName)" -ForegroundColor Green
                }
            } else {
                # Restart
                Restart-Service -InputObject $Service -Force
                Write-Host "  ✓ Restarted: $($Service.DisplayName)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ✗ Failed: $($Service.DisplayName) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ Service operation completed!" -ForegroundColor Green
    
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
    
    Write-Host "✓ Database sizes exported: $($Results.Count) databases" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },
  {
    id: 'configure-database-backup',
    name: 'Configure Database Backup Settings',
    category: 'Database Management',
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
    
    Write-Host "✓ Circular logging: ${circularLogging}" -ForegroundColor Green
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
    
    Write-Host "✓ Test message sent successfully" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },
  {
    id: 'export-queue-stats',
    name: 'Export Queue Statistics',
    category: 'Mail Flow',
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
    
    Write-Host "✓ Queue stats exported: $($Queues.Count) queues" -ForegroundColor Green
    
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
    
    Write-Host "✓ Maintenance schedule configured" -ForegroundColor Green
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
    
    Write-Host "✓ DAG created successfully" -ForegroundColor Green
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
    
    Write-Host "✓ Database copy added successfully" -ForegroundColor Green
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
    Write-Host "✓ Seeding started successfully" -ForegroundColor Green
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
    
    Write-Host "✓ Certificate request generated" -ForegroundColor Green
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
    
    Write-Host "✓ OWA virtual directory configured" -ForegroundColor Green
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host "  Internal URL: ${internalUrl}" -ForegroundColor Gray
    Write-Host "  External URL: ${externalUrl}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️ Restart IIS to apply changes:" -ForegroundColor Yellow
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
    
    Write-Host "✓ Send connector created successfully" -ForegroundColor Green
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
    
    Write-Host "✓ Receive connector created successfully" -ForegroundColor Green
    Write-Host "  Name: ${connectorName}" -ForegroundColor Gray
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host "  Port: ${port}" -ForegroundColor Gray
    Write-Host "  Remote IPs: ${remoteIPs.join(', ')}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️ Configure permissions as needed:" -ForegroundColor Yellow
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
    Write-Host "✓ Server in maintenance mode" -ForegroundColor Green
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
    Write-Host "✓ MRS Proxy enabled successfully" -ForegroundColor Green
    Write-Host "  Server: ${serverName}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️ Restart IIS for changes to take effect:" -ForegroundColor Yellow
    Write-Host "  iisreset /noforce" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test MRS Proxy:" -ForegroundColor Cyan
    Write-Host "  Test-MigrationServerAvailability -ExchangeRemoteMove -RemoteServer '${serverName}'" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to enable MRS Proxy: $_"
    exit 1
}`;
    }
  }
];
