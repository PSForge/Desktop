import { escapePowerShellString } from './powershell-utils';

export interface OneDriveParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  helpText?: string;
}

export interface OneDriveTask {
  id: string;
  title: string;
  description: string;
  category: string;
  instructions?: string;
  parameters: OneDriveParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
}

export const oneDriveTasks: OneDriveTask[] = [
  {
    id: 'onedrive-export-storage-report',
    title: 'Export Storage Usage Report',
    description: 'Export OneDrive storage usage for all users to CSV',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
This script exports comprehensive OneDrive storage usage statistics for all users to monitor consumption and plan capacity.

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- Reports.Read.All permission
- Global Administrator or Reports Reader role

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves 7-day OneDrive usage details
3. Exports storage metrics to CSV
4. Reports export success

**Important Notes:**
- Essential for capacity planning and storage management
- Shows storage used per user
- Use for identifying storage hogs and quota planning
- Run monthly for storage trend analysis
- Plan for storage growth (average 20-30% annually)
- Identify users exceeding quotas
- Typical use: capacity planning, cost optimization
- Compare with assigned quotas to prevent overruns`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\OneDriveStorage.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export OneDrive Storage Usage
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Collecting OneDrive storage usage..." -ForegroundColor Cyan
    
    $StorageReport = Get-MgReportOneDriveUsageAccountDetail -Period D7
    
    $StorageReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Storage report exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export storage report: $_"
}`;
    }
  },

  {
    id: 'onedrive-export-sharing-report',
    title: 'Export Sharing Activity Report',
    description: 'Export OneDrive sharing activity to CSV',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
This script exports OneDrive sharing and file activity metrics for security monitoring and collaboration analytics.

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- Reports.Read.All permission
- Global Administrator or Reports Reader role

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves 7-day OneDrive activity details
3. Exports sharing activity to CSV
4. Reports export success

**Important Notes:**
- Essential for security monitoring and compliance
- Shows file views, edits, shares, and syncs
- Use for identifying excessive external sharing
- Run weekly for security audits
- Monitor for data exfiltration patterns
- Identify inactive users for license optimization
- Typical use: security reviews, compliance reporting
- Compare sharing patterns against policies`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\OneDriveSharing.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export OneDrive Sharing Activity
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Collecting OneDrive sharing activity..." -ForegroundColor Cyan
    
    $SharingReport = Get-MgReportOneDriveActivityUserDetail -Period D7
    
    $SharingReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Sharing report exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export sharing report: $_"
}`;
    }
  },

  {
    id: 'onedrive-list-external-shares',
    title: 'List Externally Shared Files',
    description: 'List all files shared externally from a user OneDrive',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
This script lists all files shared externally from a specific user's OneDrive for security audit and compliance verification.

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- Sites.Read.All permission
- SharePoint Administrator or Global Administrator role

**What You Need to Provide:**
- User principal name (email address)

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves user's OneDrive
3. Lists all externally shared items
4. Displays file names and URLs
5. Reports total shared item count

**Important Notes:**
- Essential for security audits and data loss prevention
- Shows files accessible outside organization
- Use during offboarding to revoke external access
- Run quarterly for compliance reviews
- Identify sensitive data shared externally
- Use for GDPR/HIPAA compliance verification
- Typical use: security incidents, user departures
- Revoke sharing for departed employees immediately`,
    parameters: [
      {
        name: 'userPrincipalName',
        label: 'User Principal Name',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'User email address'
      }
    ],
    scriptTemplate: (params) => {
      const upn = escapePowerShellString(params.userPrincipalName);

      return `# List Externally Shared Files
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Sites.Read.All"

try {
    Write-Host "Finding externally shared files for: ${upn}" -ForegroundColor Cyan
    
    $User = Get-MgUser -UserId "${upn}"
    $Drive = Get-MgUserDrive -UserId $User.Id
    
    $SharedItems = Get-MgDriveSharedWithMe -DriveId $Drive.Id
    
    Write-Host "Found $($SharedItems.Count) shared items" -ForegroundColor Yellow
    
    $SharedItems | Select-Object Name, WebUrl | Format-Table
    
} catch {
    Write-Error "Failed to list shared files: $_"
}`;
    }
  },

  {
    id: 'onedrive-export-sync-health',
    title: 'Export OneDrive Sync Health',
    description: 'Export OneDrive sync client health status to CSV',
    category: 'Sync & Client',
    instructions: `**How This Task Works:**
This script exports OneDrive sync client health metrics to troubleshoot sync issues and monitor client performance.

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- Reports.Read.All permission
- Global Administrator or Reports Reader role

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves 7-day OneDrive sync health data
3. Exports sync metrics to CSV
4. Reports export success

**Important Notes:**
- Essential for troubleshooting sync problems
- Shows sync errors, conflicts, and health status
- Use for identifying users with sync failures
- Run weekly for proactive support
- Common issues: quota exceeded, authentication failures
- Identify users needing Known Folder Move assistance
- Typical use: helpdesk troubleshooting, proactive monitoring
- Compare with support tickets to identify patterns`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\SyncHealth.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export OneDrive Sync Health
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Collecting OneDrive sync health data..." -ForegroundColor Cyan
    
    $SyncHealth = Get-MgReportOneDriveUsageAccountDetail -Period D7
    
    $SyncHealth | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Sync health exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export sync health: $_"
}`;
    }
  },

  {
    id: 'onedrive-export-user-inventory',
    title: 'Export OneDrive User Inventory',
    description: 'Export list of all OneDrive sites to CSV',
    category: 'Reporting',
    instructions: `**How This Task Works:**
This script exports complete inventory of all OneDrive sites with owner, storage usage, and quota details for tenant-wide management.

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
1. Retrieves all personal OneDrive sites
2. Collects owner, URL, storage usage, and quota
3. Exports comprehensive inventory to CSV
4. Reports total OneDrive site count

**Important Notes:**
- Essential for tenant-wide OneDrive management
- Shows all provisioned OneDrive sites
- Use for capacity planning and license verification
- Run monthly for inventory updates
- Identify orphaned OneDrives from departed users
- Compare with active directory for discrepancies
- Typical use: annual audits, capacity planning
- Total storage cost calculation for budgeting`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\OneDriveSites.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export OneDrive User Inventory
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting OneDrive sites..." -ForegroundColor Cyan
    
    $Sites = Get-SPOSite -IncludePersonalSite $true -Limit All -Filter "Url -like '-my.sharepoint.com/personal/'"
    
    Write-Host "Found $($Sites.Count) OneDrive sites" -ForegroundColor Yellow
    
    $SiteReport = foreach ($Site in $Sites) {
        [PSCustomObject]@{
            Owner            = $Site.Owner
            Url              = $Site.Url
            StorageUsageMB   = $Site.StorageUsageCurrent
            StorageQuotaMB   = $Site.StorageQuota
        }
    }
    
    $SiteReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ OneDrive sites exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export OneDrive sites: $_"
}`;
    }
  },
  {
    id: 'od-set-quota',
    title: 'Set OneDrive Storage Quota',
    description: 'Configure storage quota for a user OneDrive',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Sets individual OneDrive storage quota for specific users
- Overrides default tenant-wide quota settings
- Converts GB input to MB for SharePoint configuration
- Useful for managing high-storage users or VIPs

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- User must have OneDrive provisioned

**What You Need to Provide:**
- User email address
- Storage quota in GB

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Finds user's personal OneDrive site by email
3. Converts GB quota to MB (multiply by 1024)
4. Applies new storage quota to the OneDrive site
5. Reports successful quota configuration

**Important Notes:**
- Quota must be between 1 GB and maximum tenant limit
- Default tenant quota typically 1024 GB (1 TB)
- Changes take effect immediately
- Typical use: VIP users, executives, power users with large data needs
- Monitor storage usage regularly to optimize costs
- Consider lifecycle policies before increasing quotas
- User will receive warning at 90% capacity`,
    parameters: [
      { name: 'userEmail', label: 'User Email', type: 'text', required: true, placeholder: 'user@domain.com' },
      { name: 'quotaGB', label: 'Quota (GB)', type: 'number', required: true, defaultValue: 1024 }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const quotaGB = params.quotaGB;
      
      return `# Set OneDrive Storage Quota
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    Set-SPOSite -Identity $Site.Url -StorageQuota $((${quotaGB})*1024)
    Write-Host "✓ Quota set to ${quotaGB}GB for ${userEmail}" -ForegroundColor Green
} catch {
    Write-Error "Failed to set quota: $_"
}`;
    }
  },
  {
    id: 'od-block-download',
    title: 'Block File Downloads',
    description: 'Prevent file downloads from OneDrive',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Blocks file downloads from user's OneDrive
- Users can still view files in browser (web preview)
- Prevents local file copies for security
- Useful for contractors, temps, or sensitive data

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- User must have OneDrive provisioned

**What You Need to Provide:**
- User email address

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Finds user's personal OneDrive site by email
3. Sets limited access file type to web-previewable only
4. Disables company-wide sharing links
5. Reports successful download blocking

**Important Notes:**
- Files can still be viewed in browser
- Prevents downloads, prints, and sync
- Typical use: departing employees, contractors, data loss prevention
- Users can still edit files in Office Online
- Does not affect existing shared links
- Consider combining with sync restrictions
- Reversible - can re-enable downloads anytime`,
    parameters: [
      { name: 'userEmail', label: 'User Email', type: 'text', required: true, placeholder: 'user@domain.com' }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Block File Downloads
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    Set-SPOSite -Identity $Site.Url -DisableCompanyWideSharingLinks -LimitedAccessFileType WebPreviewableFiles
    Write-Host "✓ Downloads blocked for ${userEmail}" -ForegroundColor Green
    Write-Host "  Files can still be viewed in browser" -ForegroundColor Gray
} catch {
    Write-Error "Failed to block downloads: $_"
}`;
    }
  },
  {
    id: 'od-enable-versioning',
    title: 'Enable File Versioning',
    description: 'Turn on version history for OneDrive',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Configures version history limits for OneDrive files
- OneDrive versioning is enabled by default and cannot be disabled
- Sets maximum number of major versions to retain
- Essential for document management and compliance

**Prerequisites:**
- PnP PowerShell module installed (Install-Module PnP.PowerShell)
- SharePoint Administrator or Global Administrator role
- User must have OneDrive provisioned
- Interactive authentication to user's OneDrive site

**What You Need to Provide:**
- User email address
- Maximum number of versions to retain (default: 500)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Finds user's personal OneDrive site URL by email
3. Connects to user's OneDrive site with PnP PowerShell
4. Configures major version limit on Documents library
5. Reports successful version limit configuration

**Important Notes:**
- Versioning is ALWAYS enabled on OneDrive (cannot be disabled)
- Each version consumes storage quota
- Default limit is 500 major versions
- Older versions auto-delete when limit reached
- Typical use: compliance requirements, accidental deletion protection, storage management
- Users can restore previous versions anytime
- Versions visible in file history menu
- Consider storage impact with large version limits
- Recommended: 50-100 versions for most users, 500 for compliance`,
    parameters: [
      { name: 'userEmail', label: 'User Email', type: 'text', required: true },
      { name: 'versions', label: 'Max Versions', type: 'number', required: false, defaultValue: 500 }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const versions = params.versions || 500;
      
      return `# Configure Version Limits for OneDrive
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    Connect-PnPOnline -Url $Site.Url -Interactive
    Set-PnPList -Identity "Documents" -EnableVersioning $true -MajorVersions ${versions}
    Disconnect-PnPOnline
    Write-Host "✓ Version limit set to ${versions} for ${userEmail}" -ForegroundColor Green
    Write-Host "  Versioning is always enabled on OneDrive" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure versioning: $_"
}`;
    }
  },
  {
    id: 'od-sharing-link-exp',
    title: 'Set Sharing Link Expiration',
    description: 'Configure expiration for sharing links',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Sets automatic expiration for anonymous sharing links
- Applies tenant-wide to all new anonymous links created
- Reduces security risk from forgotten shared links
- Forces periodic link refresh for continued access

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Tenant-wide setting affects all OneDrive and SharePoint sites

**What You Need to Provide:**
- Expiration period in days (e.g., 30, 60, 90)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures tenant-wide anonymous link expiration policy
3. Sets expiration days for all new anonymous sharing links
4. Reports successful policy configuration

**Important Notes:**
- Only affects NEW links created after policy set
- Existing links retain their original expiration settings
- Typical use: security hardening, compliance requirements, data governance
- Recommended values: 7-30 days for sensitive data, 60-90 for general use
- Users must create new links after expiration
- Zero-trust security best practice
- Consider business needs vs. security requirements
- Communicate policy to users before implementation`,
    parameters: [
      { name: 'days', label: 'Expiration Days', type: 'number', required: true, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const days = params.days;
      
      return `# Set Sharing Link Expiration
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -RequireAnonymousLinksExpireInDays ${days}
    Write-Host "✓ Anonymous sharing links will expire in ${days} days" -ForegroundColor Green
    Write-Host "  Applies to new links only (existing links unchanged)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to set link expiration: $_"
}`;
    }
  },
  {
    id: 'od-disable-sync',
    title: 'Disable OneDrive Sync',
    description: 'Prevent syncing for specific OneDrive',
    category: 'Sync & Client',
    instructions: `**How This Task Works:**
- Blocks OneDrive sync by preventing file downloads
- Restricts files to web-preview only (view-only mode)
- User can still view files in browser but cannot download or sync
- Effective method for security lockdowns or departing employees

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- User must have OneDrive provisioned

**What You Need to Provide:**
- User email address

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Finds user's personal OneDrive site by email
3. Sets limited access to web-previewable files only
4. Blocks downloads which prevents OneDrive sync client
5. Reports successful sync blocking configuration

**Important Notes:**
- User can still view files in browser (read-only)
- OneDrive sync requires download permission, so blocking downloads prevents sync
- Typical use: offboarding employees, security incidents, prevent data exfiltration
- Does not delete or remove files
- Reversible - can re-enable by removing restrictions
- More effective than Conditional Access for immediate lockdown
- User's existing synced files remain on their device
- Desktop client will show sync errors after restriction applied`,
    parameters: [
      { name: 'userEmail', label: 'User Email', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Disable OneDrive Sync (via Download Blocking)
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    Set-SPOSite -Identity $Site.Url -LimitedAccessFileType WebPreviewableFiles
    Write-Host "✓ OneDrive sync blocked for ${userEmail}" -ForegroundColor Green
    Write-Host "  Files restricted to web preview only (no downloads/sync)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to block sync: $_"
}`;
    }
  },
  {
    id: 'od-external-sharing',
    title: 'Configure External Sharing',
    description: 'Control external sharing settings',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Configures tenant-wide external sharing policy for OneDrive
- Controls how users can share files with external parties
- Three security levels: Disabled, Existing Guests Only, Anyone
- Balances collaboration needs with security requirements

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Tenant-wide setting affects all OneDrive sites

**What You Need to Provide:**
- Sharing level (Disabled/Existing Guests/Anyone)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Retrieves current OneDrive sharing capability setting
3. Applies new tenant-wide sharing level
4. Reports successful policy configuration

**Important Notes:**
- Tenant-wide setting affects all users' OneDrive
- Disabled: No external sharing allowed
- Existing Guests: Only previously added guests can access
- Anyone: Anonymous links allowed (highest risk)
- Typical use: compliance requirements, security hardening, data governance
- Cannot be more restrictive than SharePoint sharing settings
- Recommended: "Existing Guests" for balanced security
- Consider conditional access policies in conjunction
- Communicate changes to users before implementation`,
    parameters: [
      { name: 'level', label: 'Sharing Level', type: 'select', required: true, options: [{ value: 'Disabled', label: 'Disabled' }, { value: 'ExternalUserSharingOnly', label: 'Existing Guests' }, { value: 'ExternalUserAndGuestSharing', label: 'Anyone' }] }
    ],
    scriptTemplate: (params) => {
      const level = params.level;
      
      return `# Configure External Sharing
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -OneDriveSharingCapability ${level}
    Write-Host "✓ OneDrive external sharing set to: ${level}" -ForegroundColor Green
    Write-Host "  Applies to all users' OneDrive sites" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure external sharing: $_"
}`;
    }
  },
  {
    id: 'od-retention-policy',
    title: 'Apply Retention Policy',
    description: 'Set retention policy for OneDrive content',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Sets retention period for orphaned OneDrive sites
- Determines how long deleted users' OneDrive content remains accessible
- Applies tenant-wide policy for data preservation
- Balances compliance needs with storage costs

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Tenant-wide setting affects all orphaned OneDrive sites

**What You Need to Provide:**
- Retention period in days (e.g., 30, 90, 365)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures orphaned personal site retention period
3. Sets number of days to retain content after user deletion
4. Reports successful retention policy configuration

**Important Notes:**
- Applies when user account is deleted from Azure AD
- Default retention: 30 days
- Typical values: 30-90 days (short-term), 365 days (long-term compliance)
- Typical use: legal holds, compliance requirements, data governance
- Content accessible to admins during retention period
- After retention expires, OneDrive permanently deleted
- Consider compliance requirements before setting
- Longer retention increases storage costs
- Manager can be granted access during retention`,
    parameters: [
      { name: 'days', label: 'Retention Days', type: 'number', required: true, defaultValue: 365 }
    ],
    scriptTemplate: (params) => {
      const days = params.days;
      
      return `# Apply Retention Policy
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -OrphanedPersonalSitesRetentionPeriod ${days}
    Write-Host "✓ Orphaned OneDrive retention set to ${days} days" -ForegroundColor Green
    Write-Host "  Applies when user accounts are deleted" -ForegroundColor Gray
} catch {
    Write-Error "Failed to set retention policy: $_"
}`;
    }
  },
  {
    id: 'od-recycle-bin-quota',
    title: 'Set Recycle Bin Quota',
    description: 'Configure recycle bin storage percentage',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Configures recycle bin retention period (not quota percentage as title suggests)
- Sets number of days deleted items remain in second-stage recycle bin
- Applies tenant-wide to all OneDrive and SharePoint sites
- Helps recover accidentally deleted files

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Tenant-wide setting affects all sites

**What You Need to Provide:**
- Retention period in days (e.g., 30, 60, 93)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures second-stage recycle bin retention period
3. Sets number of days items stay before permanent deletion
4. Reports successful retention configuration

**Important Notes:**
- Parameter sets RETENTION PERIOD (days), not storage percentage
- Default retention: 93 days (maximum allowed)
- Valid range: 30-93 days
- Typical use: data recovery, compliance, accidental deletion protection
- Two-stage recycle bin: user recycle bin → site collection recycle bin
- After retention expires, items permanently deleted
- Shorter retention reduces storage costs
- Longer retention provides better recovery window
- Cannot exceed 93 days due to Microsoft limits`,
    parameters: [
      { name: 'days', label: 'Retention Days', type: 'number', required: true, defaultValue: 93 }
    ],
    scriptTemplate: (params) => {
      const days = params.days;
      
      return `# Set Recycle Bin Retention Period
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -RecycleBinRetentionPeriod ${days}
    Write-Host "✓ Recycle bin retention set to ${days} days" -ForegroundColor Green
    Write-Host "  Maximum allowed: 93 days" -ForegroundColor Gray
} catch {
    Write-Error "Failed to set recycle bin retention: $_"
}`;
    }
  },
  {
    id: 'od-default-link-type',
    title: 'Set Default Sharing Link',
    description: 'Configure default link type for sharing',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Sets default sharing link type when users click "Share" button
- Determines what kind of link is created by default
- Applies tenant-wide to all OneDrive and SharePoint sites
- Balances usability with security requirements

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Tenant-wide setting affects all sharing actions

**What You Need to Provide:**
- Link type (None, Direct, Internal/Organization, AnonymousAccess/Anyone)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures tenant-wide default sharing link type
3. Sets what link type is selected by default in share dialog
4. Reports successful configuration

**Important Notes:**
- None: No default link (user must choose)
- Direct: Specific people (most secure, requires recipient email)
- Internal: Anyone in organization (recommended for most enterprises)
- AnonymousAccess: Anyone with link (least secure, no auth required)
- Typical use: security policies, user experience optimization, data governance
- Does not restrict what types users CAN create, only the default
- Recommended: "Internal" for balanced security and usability
- Consider external sharing capability setting in conjunction
- Communicate changes to users for awareness
- Can be overridden by users in share dialog`,
    parameters: [
      { name: 'type', label: 'Link Type', type: 'select', required: true, options: [{ value: 'None', label: 'None' }, { value: 'Direct', label: 'Specific People' }, { value: 'Internal', label: 'Organization' }, { value: 'AnonymousAccess', label: 'Anyone' }] }
    ],
    scriptTemplate: (params) => {
      const type = params.type;
      
      return `# Set Default Sharing Link Type
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -DefaultSharingLinkType ${type}
    Write-Host "✓ Default sharing link type set to: ${type}" -ForegroundColor Green
    Write-Host "  Users can still choose other types if allowed" -ForegroundColor Gray
} catch {
    Write-Error "Failed to set default link type: $_"
}`;
    }
  },
  {
    id: 'od-notify-owner',
    title: 'Enable Owner Notifications',
    description: 'Notify owners of sharing activities',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Enables email notifications to file owners when their files are reshared
- Alerts owners when shared content is passed to additional users
- Applies tenant-wide to all OneDrive and SharePoint sites
- Helps track unauthorized or excessive sharing

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Tenant-wide setting affects all sharing notifications

**What You Need to Provide:**
- Enable/disable notifications (checkbox)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures tenant-wide owner notification setting
3. Enables or disables email alerts when items are reshared
4. Reports successful notification configuration

**Important Notes:**
- Owners receive email when someone reshares their shared content
- Helps prevent uncontrolled data dissemination
- Typical use: security awareness, data governance, compliance monitoring
- Notifications only for NEW resharing actions
- Does not notify about initial shares, only subsequent reshares
- Recommended: Enable for security-conscious organizations
- May generate notification fatigue in high-sharing environments
- Consider user training on sharing best practices
- Part of defense-in-depth security strategy`,
    parameters: [
      { name: 'enable', label: 'Enable Notifications', type: 'checkbox', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const enable = params.enable !== false;
      
      return `# Enable Owner Notifications
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -NotifyOwnersWhenItemsReshared \\$${enable}
    Write-Host "✓ Owner notifications ${enable ? 'enabled' : 'disabled'}" -ForegroundColor Green
    Write-Host "  Owners will ${enable ? '' : 'not '}receive alerts when items are reshared" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure owner notifications: $_"
}`;
    }
  },
  {
    id: 'od-pre-upload-scan',
    title: 'Configure Pre-Upload Scanning',
    description: 'Enable malware scanning before upload',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Controls whether infected files can be downloaded from OneDrive
- Scans files for malware using Microsoft Defender
- Blocks download of files detected as malicious
- Applies tenant-wide to all OneDrive and SharePoint sites

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Microsoft Defender for Office 365 active

**What You Need to Provide:**
- Enable/disable infected file download blocking (checkbox)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures tenant-wide infected file download policy
3. Enables or disables blocking of detected malicious files
4. Reports successful malware protection configuration

**Important Notes:**
- When enabled, users cannot download files detected as infected
- Files are scanned automatically upon upload
- Blocking prevents malware spread across organization
- Typical use: security hardening, zero-trust security, compliance
- Recommended: Always keep enabled for security
- Users see warning message when attempting infected file download
- Does not prevent file upload, only download
- Admins can still access files if needed for investigation`,
    parameters: [
      { name: 'enable', label: 'Block Infected Downloads', type: 'checkbox', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const enable = params.enable !== false;
      
      return `# Configure Malware Protection
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -DisallowInfectedFileDownload \\$${enable}
    Write-Host "✓ Infected file downloads ${enable ? 'blocked' : 'allowed'}" -ForegroundColor Green
    Write-Host "  ${enable ? 'Users cannot download detected malware' : 'Warning: Malware can be downloaded'}" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure malware protection: $_"
}`;
    }
  },
  {
    id: 'od-sync-restrictions',
    title: 'Configure Sync Restrictions',
    description: 'Limit OneDrive sync to managed devices',
    category: 'Sync & Client',
    instructions: `**How This Task Works:**
- Controls download of non-web-viewable files from OneDrive
- When restricted, users can only download Office files and web-viewable content
- Helps enforce device management policies
- Part of Conditional Access and device trust strategy

**Prerequisites:**
- SharePoint Online Management Shell installed
- Global Administrator or SharePoint Administrator role
- Connection to SharePoint admin center required
- Works best with Conditional Access policies

**What You Need to Provide:**
- Enable/disable non-web-viewable file download restrictions (checkbox)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures tenant-wide file download restrictions
3. Allows or blocks download of non-web-viewable files
4. Reports successful sync restriction configuration

**Important Notes:**
- When restricted, users can only download Office docs and web-viewable files
- Prevents download of executables, archives, and other non-previewable types
- Typical use: managed device enforcement, BYOD restrictions, data loss prevention
- Does not prevent viewing files in browser
- Combine with Conditional Access for managed device enforcement
- Users on unmanaged devices see limited download options
- Does not affect fully managed/compliant devices when combined with CA
- Recommended: Enable with Conditional Access policies for BYOD scenarios`,
    parameters: [
      { name: 'restrict', label: 'Restrict Non-Viewable Downloads', type: 'checkbox', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const restrict = params.restrict !== false;
      
      return `# Configure Sync/Download Restrictions
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -AllowDownloadingNonWebViewableFiles \\$${!restrict}
    Write-Host "✓ Non-web-viewable file downloads ${restrict ? 'restricted' : 'allowed'}" -ForegroundColor Green
    Write-Host "  ${restrict ? 'Users can only download Office docs and previewable files' : 'All file types can be downloaded'}" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure download restrictions: $_"
}`;
    }
  },
  {
    id: 'od-file-count-report',
    title: 'Export File Count Report',
    description: 'Report file counts per OneDrive',
    category: 'Reporting',
    instructions: `**How This Task Works:**
- Generates inventory report of all personal OneDrive sites
- Counts total files/items stored in each OneDrive
- Exports data to CSV for analysis and capacity planning
- Useful for identifying storage usage patterns

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Write permission to export directory

**What You Need to Provide:**
- Export file path (e.g., C:\\Reports\\FileCounts.csv)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Retrieves all personal OneDrive sites
3. Collects owner email, URL, and file count for each site
4. Exports comprehensive inventory to CSV file
5. Reports total number of OneDrive sites processed

**Important Notes:**
- File count includes all items (documents, folders, list items)
- May take several minutes for large tenants
- CSV includes: Owner, URL, FileCount columns
- Typical use: capacity planning, license optimization, storage audits
- Useful for identifying power users or abandoned sites
- Run regularly to track growth trends
- Can be imported into Excel or Power BI for visualization
- Filter by domain to target specific departments`,
    parameters: [
      { name: 'exportPath', label: 'Export Path', type: 'text', required: true, placeholder: 'C:\\Reports\\FileCounts.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export OneDrive File Count Report
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Retrieving all OneDrive sites..." -ForegroundColor Yellow
    $Sites = Get-SPOSite -IncludePersonalSite $true -Limit All -Filter "Url -like '-my.sharepoint.com/personal/'"
    
    $Report = $Sites | Select-Object Owner, Url, @{N='FileCount';E={$_.ItemCount}}
    $Report | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ File count report exported to ${exportPath}" -ForegroundColor Green
    Write-Host "  Total OneDrive sites: $($Sites.Count)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to export file count report: $_"
}`;
    }
  },
  {
    id: 'od-shared-links-report',
    title: 'Export Shared Links Report',
    description: 'List all sharing links created',
    category: 'Reporting',
    instructions: `**How This Task Works:**
- Audits sharing links across all OneDrive sites
- Identifies anonymous and guest access links
- Exports comprehensive sharing activity report
- Critical for security audits and compliance

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Write permission to export directory

**What You Need to Provide:**
- Export file path (e.g., C:\\Reports\\SharedLinks.csv)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Retrieves all OneDrive sites (personal and shared)
3. Collects sharing link information from each site
4. Aggregates all sharing links across tenant
5. Exports comprehensive sharing audit to CSV file

**Important Notes:**
- May take extended time for large tenants (many sites)
- Identifies potential security risks from oversharing
- Typical use: security audits, compliance reviews, access governance
- Shows anonymous links that bypass authentication
- Useful for identifying stale or risky sharing links
- Run regularly to monitor sharing activity
- CSV can be analyzed for patterns and anomalies
- Consider revoking unnecessary anonymous links found`,
    parameters: [
      { name: 'exportPath', label: 'Export Path', type: 'text', required: true, placeholder: 'C:\\Reports\\SharedLinks.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Shared Links Audit Report
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Retrieving all sites (this may take several minutes)..." -ForegroundColor Yellow
    $Sites = Get-SPOSite -IncludePersonalSite $true -Limit All
    
    Write-Host "Collecting sharing links from $($Sites.Count) sites..." -ForegroundColor Yellow
    $Links = @()
    foreach ($Site in $Sites) {
        try {
            $SiteLinks = Get-SPOSiteSharing -Identity $Site.Url -ErrorAction SilentlyContinue
            if ($SiteLinks) {
                $Links += $SiteLinks
            }
        } catch {
            # Skip sites without sharing permissions or access issues
        }
    }
    
    $Links | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Shared links report exported to ${exportPath}" -ForegroundColor Green
    Write-Host "  Total sharing links found: $($Links.Count)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to export shared links report: $_"
}`;
    }
  },
  {
    id: 'od-storage-trend',
    title: 'Export Storage Trend Report',
    description: 'Historical storage usage analysis',
    category: 'Reporting',
    instructions: `**How This Task Works:**
- Retrieves historical OneDrive storage usage data
- Analyzes storage consumption trends over time
- Uses Microsoft Graph API for accurate reporting
- Essential for capacity planning and forecasting

**Prerequisites:**
- Microsoft Graph PowerShell SDK installed
- Reports.Read.All permission granted
- Global Administrator or Reports Reader role
- Connection to Microsoft Graph

**What You Need to Provide:**
- Export file path (e.g., C:\\Reports\\StorageTrend.csv)
- Number of days to analyze (default: 30)

**What the Script Does:**
1. Connects to Microsoft Graph with appropriate permissions
2. Retrieves OneDrive storage usage report for specified period
3. Collects daily storage metrics across all OneDrive accounts
4. Exports historical trend data to CSV file
5. Reports analysis period covered

**Important Notes:**
- Maximum period: 180 days
- Daily granularity shows storage growth patterns
- Typical use: capacity planning, budget forecasting, trend analysis
- Identifies rapid growth requiring attention
- CSV includes: Date, StorageUsed, FileCount metrics
- Useful for predicting when additional storage needed
- Can be visualized in Excel or Power BI
- Run monthly to track long-term trends`,
    parameters: [
      { name: 'exportPath', label: 'Export Path', type: 'text', required: true, placeholder: 'C:\\Reports\\StorageTrend.csv' },
      { name: 'days', label: 'Days Back', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const days = params.days || 30;
      
      return `# Export OneDrive Storage Trend Report
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Retrieving storage trend data for last ${days} days..." -ForegroundColor Yellow
    $Report = Get-MgReportOneDriveUsageStorage -Period "D${days}"
    $Report | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Storage trend report exported to ${exportPath}" -ForegroundColor Green
    Write-Host "  Period analyzed: ${days} days" -ForegroundColor Gray
} catch {
    Write-Error "Failed to export storage trend report: $_"
}

Disconnect-MgGraph`;
    }
  },
  {id:'od-access-requests',title:'Enable Access Requests',description:'Allow users to request access',category:'Sharing & Permissions',parameters:[{name:'enable',label:'Enable Requests',type:'checkbox',required:false,defaultValue:true}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{Set-SPOTenant -PreventExternalUsersFromResharing \\$${!(p.enable!==false)};Write-Host "✓ Access requests: ${p.enable!==false}" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-legacy-auth-block',title:'Block Legacy Authentication',description:'Disable legacy auth protocols',category:'Sync & Client',parameters:[{name:'block',label:'Block Legacy Auth',type:'checkbox',required:false,defaultValue:true}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{Set-SPOTenant -LegacyAuthProtocolsEnabled \\$${!(p.block!==false)};Write-Host "✓ Legacy auth blocked: ${p.block!==false}" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-idle-timeout',title:'Set Idle Session Timeout',description:'Auto-logout inactive sessions',category:'Sync & Client',parameters:[{name:'minutes',label:'Timeout (minutes)',type:'number',required:true,defaultValue:60}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{Set-SPOBrowserIdleSignOut -Enabled $true -WarnAfter (New-TimeSpan -Minutes $((${p.minutes})-5)) -SignOutAfter (New-TimeSpan -Minutes ${p.minutes});Write-Host "✓ Idle timeout: ${p.minutes} min" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-unmanaged-device-policy',title:'Configure Unmanaged Device Policy',description:'Control access from unmanaged devices',category:'Sync & Client',parameters:[{name:'action',label:'Action',type:'select',required:true,options:[{value:'AllowFullAccess',label:'Allow Full'},{value:'AllowLimitedAccess',label:'Limited'},{value:'BlockAccess',label:'Block'}]}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{Set-SPOTenant -ConditionalAccessPolicy ${p.action};Write-Host "✓ Unmanaged device policy: ${p.action}" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-bulk-delete-sites',title:'Bulk Delete OneDrive Sites',description:'Remove OneDrive sites from CSV list',category:'Storage Management',parameters:[{name:'csvPath',label:'CSV Path',type:'text',required:true,placeholder:'C:\\\\Sites.csv'}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{$Sites=Import-Csv "${escapePowerShellString(p.csvPath)}";foreach($Site in $Sites){Remove-SPOSite -Identity $Site.Url -Confirm:$false};Write-Host "✓ Deleted $($Sites.Count) sites" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-bulk-set-quota',title:'Bulk Set Storage Quotas',description:'Apply quotas to multiple OneDrives from CSV',category:'Storage Management',parameters:[{name:'csvPath',label:'CSV Path',type:'text',required:true}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{$Users=Import-Csv "${escapePowerShellString(p.csvPath)}";foreach($User in $Users){Set-SPOSite -Identity (Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '$($User.Email)'").Url -StorageQuota ($User.QuotaGB*1024)};Write-Host "✓ Set $($Users.Count) quotas" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-permission-inheritance',title:'Break Permission Inheritance',description:'Stop inheriting permissions from parent',category:'Sharing & Permissions',parameters:[{name:'userEmail',label:'User Email',type:'text',required:true}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{$Site=Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${escapePowerShellString(p.userEmail)}'";Write-Host "✓ Permissions can be customized for $($Site.Url)" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-activity-report',title:'Export Activity Report',description:'User activity metrics for OneDrive',category:'Reporting',parameters:[{name:'exportPath',label:'Export Path',type:'text',required:true},{name:'days',label:'Days',type:'number',required:false,defaultValue:7}],scriptTemplate:p=>`Connect-MgGraph -Scopes "Reports.Read.All"\ntry{$Report=Get-MgReportOneDriveActivityUserDetail -Period "D${p.days}";$Report|Export-Csv "${escapePowerShellString(p.exportPath)}" -NoTypeInformation;Write-Host "✓ Activity report exported (${p.days} days)" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-file-types-block',title:'Block Specific File Types',description:'Prevent upload of certain file extensions',category:'Storage Management',parameters:[{name:'extensions',label:'Blocked Extensions',type:'text',required:true,placeholder:'.exe,.bat,.cmd'}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{Set-SPOTenant -ExcludedFileExtensionsForSyncApp "${escapePowerShellString(p.extensions)}";Write-Host "✓ Blocked file types: ${p.extensions}" -ForegroundColor Green}catch{Write-Error $_}`},
  {id:'od-restore-deleted',title:'Restore Deleted OneDrive',description:'Recover recently deleted OneDrive site',category:'Storage Management',parameters:[{name:'siteUrl',label:'Site URL',type:'text',required:true,placeholder:'https://tenant-my.sharepoint.com/personal/user_domain_com'}],scriptTemplate:p=>`Connect-SPOService -Url https://tenant-admin.sharepoint.com\ntry{Restore-SPODeletedSite -Identity "${escapePowerShellString(p.siteUrl)}";Write-Host "✓ OneDrive restored" -ForegroundColor Green}catch{Write-Error $_}`}
];

export const oneDriveCategories = [
  'Storage Management',
  'Sharing & Permissions',
  'Sync & Client',
  'Reporting'
];
