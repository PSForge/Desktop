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
  }
];
