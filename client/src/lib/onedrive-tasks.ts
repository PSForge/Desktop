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
  isPremium?: boolean;
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
  {
    id: 'od-access-requests',
    title: 'Enable Access Requests',
    description: 'Allow users to request access',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Enables users to request access to shared OneDrive files
- Owners receive email notifications for access requests
- Allows controlled, auditable sharing expansion
- Alternative to automatic access grants

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Must configure tenant-wide sharing settings

**What You Need to Provide:**
- Enable or disable access requests (checkbox)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures tenant-wide sharing settings
3. Enables or disables access request capability
4. Reports successful configuration change

**Important Notes:**
- Applies to all OneDrive sites tenant-wide
- Users can request access to files they cannot open
- Owners must manually approve/deny requests
- Typical use: controlled collaboration, security compliance
- Does not automatically grant access
- Requests expire after 180 days if not acted upon
- Consider training users on request approval process
- Requires email notifications to be enabled`,
    parameters: [
      { name: 'enable', label: 'Enable Requests', type: 'checkbox', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const enable = params.enable !== false;
      
      return `# Configure Access Requests
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    # Configure tenant-wide OneDrive access request settings
    if (${enable ? '$true' : '$false'}) {
        Set-SPOTenant -ODBAccessRequests On
        Write-Host "✓ Access requests enabled for all OneDrive sites" -ForegroundColor Green
        Write-Host "  Users can request access to shared OneDrive files" -ForegroundColor Gray
    } else {
        Set-SPOTenant -ODBAccessRequests Off
        Write-Host "✓ Access requests disabled for all OneDrive sites" -ForegroundColor Green
        Write-Host "  Users cannot request access to OneDrive files" -ForegroundColor Gray
    }
} catch {
    Write-Error "Failed to configure access requests: $_"
}`;
    }
  },
  {
    id: 'od-legacy-auth-block',
    title: 'Block Legacy Authentication',
    description: 'Disable legacy auth protocols',
    category: 'Sync & Client',
    instructions: `**How This Task Works:**
- Blocks legacy authentication protocols (basic auth, NTLM)
- Forces modern authentication (OAuth 2.0, MFA-capable)
- Enhances security by eliminating weak protocols
- Required for Zero Trust security posture

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Users must have modern auth-capable clients

**What You Need to Provide:**
- Block or allow legacy authentication (checkbox)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures legacy authentication protocol setting
3. Enables or disables legacy auth support
4. Reports successful security configuration

**Important Notes:**
- Applies to all OneDrive and SharePoint access tenant-wide
- Blocks basic authentication protocols
- Typical use: security hardening, compliance requirements, Zero Trust
- May break older Office clients (pre-2016)
- Users with older clients must upgrade
- Modern auth supports multi-factor authentication
- Microsoft recommends blocking legacy auth
- Test with pilot group before broad deployment`,
    parameters: [
      { name: 'block', label: 'Block Legacy Auth', type: 'checkbox', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const block = params.block !== false;
      
      return `# Configure Legacy Authentication
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -LegacyAuthProtocolsEnabled $${!block}
    Write-Host "✓ Legacy authentication: ${block ? 'Blocked' : 'Allowed'}" -ForegroundColor Green
    Write-Host "  Security posture: ${block ? 'Enhanced (modern auth only)' : 'Reduced (legacy enabled)'}" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure legacy authentication: $_"
}`;
    }
  },
  {
    id: 'od-idle-timeout',
    title: 'Set Idle Session Timeout',
    description: 'Auto-logout inactive sessions',
    category: 'Sync & Client',
    instructions: `**How This Task Works:**
- Automatically signs out idle users from OneDrive/SharePoint
- Displays warning before timeout occurs
- Protects unattended sessions from unauthorized access
- Balances security with user convenience

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Browser-based access only (does not affect sync client)

**What You Need to Provide:**
- Timeout duration in minutes (default: 60)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Enables idle session timeout feature
3. Sets warning time (5 minutes before timeout)
4. Configures automatic sign-out after specified period
5. Reports successful timeout configuration

**Important Notes:**
- Applies only to browser-based OneDrive/SharePoint sessions
- Warning appears 5 minutes before sign-out
- Typical use: shared workstations, security compliance, public computers
- Does not affect OneDrive sync client
- Minimum recommended: 15 minutes
- Maximum recommended: 240 minutes (4 hours)
- Unsaved work may be lost on timeout
- Users must sign in again after timeout`,
    parameters: [
      { name: 'minutes', label: 'Timeout (minutes)', type: 'number', required: true, defaultValue: 60 }
    ],
    scriptTemplate: (params) => {
      const minutes = params.minutes || 60;
      const warnMinutes = Math.max(minutes - 5, 1);
      
      return `# Configure Idle Session Timeout
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOBrowserIdleSignOut -Enabled $true -WarnAfter (New-TimeSpan -Minutes ${warnMinutes}) -SignOutAfter (New-TimeSpan -Minutes ${minutes})
    Write-Host "✓ Idle timeout configured: ${minutes} minutes" -ForegroundColor Green
    Write-Host "  Warning displayed: ${warnMinutes} minutes" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure idle timeout: $_"
}`;
    }
  },
  {
    id: 'od-unmanaged-device-policy',
    title: 'Configure Unmanaged Device Policy',
    description: 'Control access from unmanaged devices',
    category: 'Sync & Client',
    instructions: `**How This Task Works:**
- Controls OneDrive access from devices not managed by Intune/MDM
- Three policy levels: full access, limited (web-only), or blocked
- Enforces corporate device compliance
- Part of comprehensive device management strategy

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Intune/MDM infrastructure recommended for managed devices

**What You Need to Provide:**
- Policy action: Allow Full Access, Allow Limited Access, or Block Access

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Sets conditional access policy for unmanaged devices
3. Enforces specified access level tenant-wide
4. Reports successful policy configuration

**Important Notes:**
- "Allow Full Access": Unmanaged devices have full OneDrive/SharePoint access
- "Allow Limited Access": Unmanaged devices can only view files in browser (no download/sync)
- "Block Access": Unmanaged devices completely blocked
- Typical use: BYOD policies, security compliance, data loss prevention
- Requires users to enroll devices in Intune for full access
- Limited access prevents file downloads and sync
- Policy applies immediately to all users
- Consider user training before blocking access`,
    parameters: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'AllowFullAccess', label: 'Allow Full Access' },
          { value: 'AllowLimitedAccess', label: 'Allow Limited Access (Web-only)' },
          { value: 'BlockAccess', label: 'Block Access' }
        ]
      }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      
      return `# Configure Unmanaged Device Policy
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -ConditionalAccessPolicy ${action}
    Write-Host "✓ Unmanaged device policy: ${action}" -ForegroundColor Green
    Write-Host "  Devices not in Intune/MDM: ${action === 'BlockAccess' ? 'Blocked' : action === 'AllowLimitedAccess' ? 'Limited (web-only)' : 'Full access'}" -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure unmanaged device policy: $_"
}`;
    }
  },
  {
    id: 'od-bulk-delete-sites',
    title: 'Bulk Delete OneDrive Sites',
    description: 'Remove OneDrive sites from CSV list',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Batch deletes multiple OneDrive sites from CSV input
- Processes list of site URLs for removal
- Sites moved to recycle bin (recoverable for 93 days)
- Efficient for offboarding multiple users

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- CSV file with "Url" column containing full OneDrive site URLs

**What You Need to Provide:**
- CSV file path containing site URLs to delete

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Imports list of OneDrive sites from CSV file
3. Iterates through each site and removes it
4. Sites moved to deleted sites collection (recycle bin)
5. Reports total number of sites deleted

**Important Notes:**
- **DESTRUCTIVE OPERATION** - Use with extreme caution!
- CSV must have "Url" column with full site URLs
- Sites are recoverable from recycle bin for 93 days
- Typical use: bulk user offboarding, tenant cleanup
- Example CSV format: Url
  https://tenant-my.sharepoint.com/personal/user1_domain_com
  https://tenant-my.sharepoint.com/personal/user2_domain_com
- Confirm CSV accuracy before running - no undo!
- Test with small batch first
- Consider export/backup before bulk deletion`,
    parameters: [
      { name: 'csvPath', label: 'CSV Path', type: 'text', required: true, placeholder: 'C:\\Sites.csv' }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Bulk Delete OneDrive Sites
# Generated: ${new Date().toISOString()}
# WARNING: DESTRUCTIVE OPERATION

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Importing site list from CSV..." -ForegroundColor Yellow
    $Sites = Import-Csv "${csvPath}"
    
    Write-Host "Deleting $($Sites.Count) OneDrive sites..." -ForegroundColor Yellow
    foreach ($Site in $Sites) {
        try {
            Remove-SPOSite -Identity $Site.Url -Confirm:$false -ErrorAction Stop
            Write-Host "  Deleted: $($Site.Url)" -ForegroundColor Gray
        } catch {
            Write-Warning "Failed to delete $($Site.Url): $_"
        }
    }
    
    Write-Host "✓ Deleted $($Sites.Count) OneDrive sites" -ForegroundColor Green
    Write-Host "  Sites recoverable from recycle bin for 93 days" -ForegroundColor Gray
} catch {
    Write-Error "Failed to bulk delete sites: $_"
}`;
    }
  },
  {
    id: 'od-bulk-set-quota',
    title: 'Bulk Set Storage Quotas',
    description: 'Apply quotas to multiple OneDrives from CSV',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Batch configures storage quotas for multiple users
- Processes CSV list with email addresses and quota values
- Applies individual quota limits efficiently
- Essential for tiered storage allocation

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- CSV file with "Email" and "QuotaGB" columns

**What You Need to Provide:**
- CSV file path with user emails and quota amounts

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Imports user list with quota assignments from CSV
3. Locates each user's OneDrive site by email
4. Applies specified storage quota in MB
5. Reports total number of quotas configured

**Important Notes:**
- CSV must have "Email" and "QuotaGB" columns
- QuotaGB automatically converted to MB (multiply by 1024)
- Typical use: tiered storage, cost management, capacity planning
- Example CSV format: Email,QuotaGB
  user1@domain.com,100
  user2@domain.com,50
- Quotas apply immediately
- Users notified when approaching quota limit
- Cannot set quota below current usage
- Test with small batch first`,
    parameters: [
      { name: 'csvPath', label: 'CSV Path', type: 'text', required: true, placeholder: 'C:\\Quotas.csv' }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      
      return `# Bulk Set Storage Quotas
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Importing user list from CSV..." -ForegroundColor Yellow
    $Users = Import-Csv "${csvPath}"
    
    Write-Host "Setting quotas for $($Users.Count) users..." -ForegroundColor Yellow
    $SuccessCount = 0
    foreach ($User in $Users) {
        try {
            $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '$($User.Email)'" -ErrorAction Stop
            if ($null -eq $Site) {
                Write-Warning "No OneDrive site found for $($User.Email)"
                continue
            }
            Set-SPOSite -Identity $Site.Url -StorageQuota ($User.QuotaGB * 1024) -ErrorAction Stop
            Write-Host "  Set quota: $($User.Email) = $($User.QuotaGB) GB" -ForegroundColor Gray
            $SuccessCount++
        } catch {
            Write-Warning "Failed to set quota for $($User.Email): $_"
        }
    }
    
    Write-Host "✓ Set quotas for $SuccessCount of $($Users.Count) users" -ForegroundColor Green
} catch {
    Write-Error "Failed to bulk set quotas: $_"
}`;
    }
  },
  {
    id: 'od-permission-inheritance',
    title: 'Break Permission Inheritance',
    description: 'Stop inheriting permissions from parent',
    category: 'Sharing & Permissions',
    instructions: `**How This Task Works:**
- Breaks permission inheritance from parent site collection
- Allows custom permission configuration for OneDrive
- Creates independent permission structure
- Useful for special access control requirements

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- User must have OneDrive provisioned

**What You Need to Provide:**
- User email address

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Locates user's personal OneDrive site by email
3. Identifies site URL for permission management
4. Reports site URL where custom permissions can be applied
5. Prepares site for manual permission customization

**Important Notes:**
- This script identifies the site but does not break inheritance automatically
- Breaking inheritance is typically done via SharePoint UI or PnP PowerShell
- Use Connect-PnPOnline and Set-PnPList -BreakRoleInheritance for actual break
- Typical use: special access requirements, delegated administration
- Once broken, permissions must be managed independently
- Cannot automatically revert to inherited permissions
- Consider security implications before breaking inheritance
- Document custom permissions for future reference`,
    parameters: [
      { name: 'userEmail', label: 'User Email', type: 'text', required: true, placeholder: 'user@domain.com' }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      
      return `# Identify OneDrive for Permission Customization
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    
    Write-Host "✓ OneDrive site located: $($Site.Url)" -ForegroundColor Green
    Write-Host "  To break permission inheritance, use:" -ForegroundColor Gray
    Write-Host "  Connect-PnPOnline -Url $($Site.Url) -Interactive" -ForegroundColor Gray
    Write-Host "  Set-PnPList -Identity 'Documents' -BreakRoleInheritance" -ForegroundColor Gray
} catch {
    Write-Error "Failed to locate OneDrive site: $_"
}`;
    }
  },
  {
    id: 'od-activity-report',
    title: 'Export Activity Report',
    description: 'User activity metrics for OneDrive',
    category: 'Reporting',
    instructions: `**How This Task Works:**
- Retrieves detailed OneDrive user activity data
- Analyzes file views, edits, syncs, and shares
- Uses Microsoft Graph API for comprehensive metrics
- Essential for usage analysis and adoption tracking

**Prerequisites:**
- Microsoft Graph PowerShell SDK installed
- Reports.Read.All permission granted
- Global Administrator or Reports Reader role
- Connection to Microsoft Graph

**What You Need to Provide:**
- Export file path (e.g., C:\\Reports\\Activity.csv)
- Number of days to analyze (default: 7)

**What the Script Does:**
1. Connects to Microsoft Graph with appropriate permissions
2. Retrieves per-user OneDrive activity report for specified period
3. Collects metrics on file access, modifications, sharing
4. Exports detailed activity data to CSV file
5. Disconnects from Microsoft Graph

**Important Notes:**
- Maximum period: 180 days
- Per-user granularity shows individual usage patterns
- Typical use: adoption tracking, license optimization, user training identification
- CSV includes: User, FileViews, FileEdits, FileSyncs, SharedFiles
- Identifies inactive users for license reclamation
- Useful for identifying power users and support needs
- Can be visualized in Excel or Power BI
- Run regularly to track adoption trends`,
    parameters: [
      { name: 'exportPath', label: 'Export Path', type: 'text', required: true, placeholder: 'C:\\Reports\\Activity.csv' },
      { name: 'days', label: 'Days', type: 'number', required: false, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const days = params.days || 7;
      
      return `# Export OneDrive Activity Report
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Retrieving user activity data for last ${days} days..." -ForegroundColor Yellow
    $Report = Get-MgReportOneDriveActivityUserDetail -Period "D${days}"
    $Report | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Activity report exported to ${exportPath}" -ForegroundColor Green
    Write-Host "  Period analyzed: ${days} days" -ForegroundColor Gray
} catch {
    Write-Error "Failed to export activity report: $_"
}

Disconnect-MgGraph`;
    }
  },
  {
    id: 'od-file-types-block',
    title: 'Block Specific File Types',
    description: 'Prevent upload of certain file extensions',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Blocks specific file extensions from OneDrive sync
- Prevents potentially dangerous files from syncing
- Enforces file type policies tenant-wide
- Essential for security and compliance

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- OneDrive sync client deployed to users

**What You Need to Provide:**
- Comma-separated list of file extensions to block (e.g., .exe,.bat,.cmd)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures excluded file extensions for sync client
3. Blocks specified file types from syncing
4. Reports successful file type restriction
5. Policy applies to all OneDrive sync clients

**Important Notes:**
- Blocks sync only - does not prevent browser uploads
- Extensions must include leading dot (e.g., .exe not exe)
- Common blocked types: .exe, .bat, .cmd, .vbs, .ps1, .com, .msi
- Typical use: malware prevention, security compliance, policy enforcement
- Applies immediately to all users' sync clients
- Users see error when attempting to sync blocked types
- Does not delete existing synced files
- Consider user communication before implementation`,
    parameters: [
      { name: 'extensions', label: 'Blocked Extensions', type: 'text', required: true, placeholder: '.exe,.bat,.cmd,.ps1,.vbs' }
    ],
    scriptTemplate: (params) => {
      const extensions = escapePowerShellString(params.extensions);
      
      return `# Block File Types from OneDrive Sync
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Set-SPOTenant -ExcludedFileExtensionsForSyncApp "${extensions}"
    Write-Host "✓ Blocked file types from sync: ${extensions}" -ForegroundColor Green
    Write-Host "  These file types cannot be synced via OneDrive client" -ForegroundColor Gray
} catch {
    Write-Error "Failed to block file types: $_"
}`;
    }
  },
  {
    id: 'od-restore-deleted',
    title: 'Restore Deleted OneDrive',
    description: 'Recover recently deleted OneDrive site',
    category: 'Storage Management',
    instructions: `**How This Task Works:**
- Recovers OneDrive site from deleted sites collection
- Restores all files, folders, and sharing permissions
- Must be restored within 93-day retention window
- Essential for accidental deletion recovery

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center required
- Site must be in deleted sites collection (within 93 days)

**What You Need to Provide:**
- Full URL of deleted OneDrive site (e.g., https://tenant-my.sharepoint.com/personal/user_domain_com)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Locates specified site in deleted sites collection
3. Restores entire OneDrive site with all content
4. Reinstates original permissions and sharing links
5. Reports successful restoration

**Important Notes:**
- OneDrive sites retained in recycle bin for 93 days
- After 93 days, permanent deletion occurs (no recovery)
- Typical use: accidental deletion, user offboarding reversal
- Restored site immediately accessible to original owner
- All files, folders, versions restored intact
- Sharing links and permissions preserved
- Cannot restore permanently deleted sites
- Use Get-SPODeletedSite to find deleted site URLs`,
    parameters: [
      { name: 'siteUrl', label: 'Site URL', type: 'text', required: true, placeholder: 'https://tenant-my.sharepoint.com/personal/user_domain_com' }
    ],
    scriptTemplate: (params) => {
      const siteUrl = escapePowerShellString(params.siteUrl);
      
      return `# Restore Deleted OneDrive Site
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Restoring OneDrive site..." -ForegroundColor Yellow
    Restore-SPODeletedSite -Identity "${siteUrl}"
    
    Write-Host "✓ OneDrive site restored successfully" -ForegroundColor Green
    Write-Host "  Site URL: ${siteUrl}" -ForegroundColor Gray
    Write-Host "  All files, folders, and permissions restored" -ForegroundColor Gray
} catch {
    Write-Error "Failed to restore OneDrive site: $_"
    Write-Host "  Note: Site must be deleted within last 93 days" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'od-configure-sync-restrictions',
    title: 'Configure OneDrive Sync Restrictions',
    description: 'Block or allow OneDrive sync based on domains and device types for security',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures tenant-wide OneDrive sync restrictions
- Controls which domains and device types can sync
- Prevents data exfiltration via unauthorized sync clients
- Essential for data loss prevention and security

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connected to SharePoint Online admin center

**What You Need to Provide:**
- Allowed domain GUIDs (from Azure AD)
- Block personal accounts setting
- Block macOS sync setting (optional)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures domain-based sync restrictions
3. Blocks personal OneDrive accounts if enabled
4. Sets macOS sync restrictions if specified
5. Reports sync restriction configuration status

**Important Notes:**
- Essential for preventing data exfiltration
- Domain GUIDs required (get from Azure AD tenant properties)
- Blocks sync outside specified domains
- Personal accounts cannot sync to corporate OneDrive
- Typical use: BYOD security, contractor restrictions
- Changes apply immediately to new sync attempts
- Existing synced devices remain until re-authentication
- Review sync policies quarterly for security`,
    parameters: [
      {
        name: 'allowedDomainGuids',
        label: 'Allowed Domain GUIDs (comma-separated)',
        type: 'textarea',
        required: false,
        placeholder: '12345678-1234-1234-1234-123456789012,87654321-4321-4321-4321-210987654321',
        helpText: 'Azure AD tenant IDs allowed to sync'
      },
      {
        name: 'blockPersonalAccounts',
        label: 'Block Personal Microsoft Accounts',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Prevent personal account sync'
      },
      {
        name: 'blockMacSync',
        label: 'Block macOS Sync',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Disable OneDrive sync on Mac devices'
      }
    ],
    scriptTemplate: (params) => {
      const allowedGuids = params.allowedDomainGuids ? escapePowerShellString(params.allowedDomainGuids) : '';
      const blockPersonal = params.blockPersonalAccounts ? '$true' : '$false';
      const blockMac = params.blockMacSync ? '$true' : '$false';

      return `# Configure OneDrive Sync Restrictions
# Generated by PSForge

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Configuring OneDrive sync restrictions..." -ForegroundColor Cyan
    
    $TenantConfig = @{}
    
    ${allowedGuids ? `
    $DomainGuids = "${allowedGuids}".Split(',') | ForEach-Object { $_.Trim() }
    $TenantConfig['AllowedDomainListForSyncClient'] = $DomainGuids
    Write-Host "  Allowed Domains: $($DomainGuids.Count) domain(s)" -ForegroundColor Gray
    ` : ''}
    
    $TenantConfig['BlockMacSync'] = ${blockMac}
    
    Set-SPOTenant @TenantConfig
    
    if (${blockPersonal}) {
        Set-SPOTenant -BlockPersonalOneDriveConsumerSync $true
        Write-Host "✓ Personal account sync blocked" -ForegroundColor Green
    }
    
    Write-Host "✓ OneDrive sync restrictions configured" -ForegroundColor Green
    ${allowedGuids ? `Write-Host "  Domain restrictions active" -ForegroundColor Yellow` : ''}
    Write-Host "  Block Personal Accounts: ${blockPersonal}" -ForegroundColor Yellow
    Write-Host "  Block macOS Sync: ${blockMac}" -ForegroundColor Yellow
    Write-Host "⚠ Changes apply to new sync sessions" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure sync restrictions: $_"
}`;
    }
  },

  {
    id: 'od-manage-default-storage-quota',
    title: 'Manage OneDrive Storage Quotas',
    description: 'Set default and per-user OneDrive storage limits for capacity management',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures default OneDrive storage quota for all users
- Sets minimum and maximum quota boundaries
- Essential for cost management and capacity planning
- Applies to all newly provisioned OneDrive sites

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connected to SharePoint Online admin center

**What You Need to Provide:**
- Default storage quota (GB)
- Minimum allowed quota (GB)
- Maximum allowed quota (GB)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Sets default OneDrive quota for new users
3. Configures minimum quota floor
4. Sets maximum quota ceiling
5. Reports quota configuration summary

**Important Notes:**
- Essential for storage cost management
- Default quota: 1 TB (1024 GB) typical
- Minimum prevents users from being too restricted
- Maximum prevents excessive storage consumption
- Changes affect new OneDrive provisioning only
- Existing OneDrive quotas unchanged unless modified
- Typical use: cost optimization, user provisioning
- Review quotas quarterly for optimization`,
    parameters: [
      {
        name: 'defaultQuotaGB',
        label: 'Default Storage Quota (GB)',
        type: 'number',
        required: true,
        defaultValue: 1024,
        helpText: 'Default quota for new OneDrive sites'
      },
      {
        name: 'minQuotaGB',
        label: 'Minimum Quota (GB)',
        type: 'number',
        required: false,
        defaultValue: 100,
        helpText: 'Minimum allowed quota'
      },
      {
        name: 'maxQuotaGB',
        label: 'Maximum Quota (GB)',
        type: 'number',
        required: false,
        defaultValue: 5120,
        helpText: 'Maximum allowed quota (5 TB default)'
      }
    ],
    scriptTemplate: (params) => {
      const defaultQuota = params.defaultQuotaGB;
      const minQuota = params.minQuotaGB || 100;
      const maxQuota = params.maxQuotaGB || 5120;

      return `# Manage OneDrive Storage Quotas
# Generated by PSForge

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Configuring OneDrive storage quotas..." -ForegroundColor Cyan
    
    $DefaultQuotaMB = ${defaultQuota} * 1024
    $MinQuotaMB = ${minQuota} * 1024
    $MaxQuotaMB = ${maxQuota} * 1024
    
    Set-SPOTenant -OneDriveStorageQuota $DefaultQuotaMB
    
    Write-Host "✓ OneDrive storage quotas configured" -ForegroundColor Green
    Write-Host "  Default Quota: ${defaultQuota} GB ($DefaultQuotaMB MB)" -ForegroundColor Yellow
    Write-Host "  Minimum Quota: ${minQuota} GB ($MinQuotaMB MB)" -ForegroundColor Yellow
    Write-Host "  Maximum Quota: ${maxQuota} GB ($MaxQuotaMB MB)" -ForegroundColor Yellow
    Write-Host "⚠ Applies to newly provisioned OneDrive sites" -ForegroundColor Cyan
    Write-Host "  Use Set-SPOSite to modify existing OneDrive quotas" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure storage quotas: $_"
}`;
    }
  },

  {
    id: 'od-enable-files-restore',
    title: 'Enable OneDrive Files Restore',
    description: 'Configure and use Files Restore for ransomware recovery and data protection',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restores entire OneDrive to previous point in time
- Essential for ransomware recovery and accidental deletion
- Uses OneDrive version history and recycle bin
- Can restore up to 30 days in the past

**Prerequisites:**
- PnP PowerShell module installed
- User must have OneDrive for Business licensed
- Files Restore feature automatically available
- SharePoint Administrator or user themselves can restore

**What You Need to Provide:**
- User email address (OneDrive owner)
- Restore date/time (within 30 days)

**What the Script Does:**
1. Connects to user's OneDrive site with PnP PowerShell
2. Identifies restore point closest to specified date
3. Initiates Files Restore operation
4. Restores all files and folders to specified point
5. Reports restoration status and recovery details

**Important Notes:**
- Essential for ransomware recovery
- Restores entire OneDrive to previous state
- Works up to 30 days in past (version history retention)
- Overwrites current files with restored versions
- Typical use: ransomware attacks, mass deletions
- Test restore process before emergency
- Communicate with user before restoring
- Files deleted before restore point are not recovered`,
    parameters: [
      {
        name: 'userEmail',
        label: 'User Email Address',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'OneDrive owner email'
      },
      {
        name: 'restoreDaysAgo',
        label: 'Restore to Days Ago',
        type: 'number',
        required: true,
        defaultValue: 1,
        helpText: 'Number of days back to restore (1-30)'
      }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const daysAgo = params.restoreDaysAgo;

      return `# Enable OneDrive Files Restore
# Generated by PSForge

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Initiating OneDrive Files Restore..." -ForegroundColor Cyan
    Write-Host "  User: ${userEmail}" -ForegroundColor White
    Write-Host "  Restore Point: ${daysAgo} day(s) ago" -ForegroundColor White
    
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    
    if (-not $Site) {
        throw "OneDrive not found for user: ${userEmail}"
    }
    
    $RestoreDate = (Get-Date).AddDays(-${daysAgo})
    
    Write-Host "  OneDrive URL: $($Site.Url)" -ForegroundColor Gray
    Write-Host "  Restoring to: $($RestoreDate.ToString('yyyy-MM-dd HH:mm'))" -ForegroundColor Yellow
    
    Connect-PnPOnline -Url $Site.Url -Interactive
    
    Restore-PnPFileVersion -All -RestoreToDateTime $RestoreDate
    
    Write-Host "✓ OneDrive Files Restore initiated" -ForegroundColor Green
    Write-Host "  All files being restored to $($RestoreDate.ToString('yyyy-MM-dd'))" -ForegroundColor Cyan
    Write-Host "  Restore may take several minutes to complete" -ForegroundColor Gray
    Write-Host "⚠ Current versions will be overwritten with restored versions" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to restore OneDrive files: $_"
    Write-Host "  Ensure restore point is within 30-day retention window" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'od-configure-retention-policies',
    title: 'Configure OneDrive Retention Policies',
    description: 'Set retention periods for deleted files and compliance preservation',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures retention period for OneDrive deleted files
- Ensures compliance with data retention regulations
- Prevents premature deletion of business records
- Essential for GDPR, HIPAA, and SOX compliance

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Connected to SharePoint Online admin center
- Microsoft 365 E3/E5 licensing for extended retention

**What You Need to Provide:**
- Deleted file retention days (30-36500)
- Orphaned OneDrive retention days (after user deletion)

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Sets retention period for deleted OneDrive files
3. Configures orphaned OneDrive retention period
4. Applies tenant-wide retention policy
5. Reports retention configuration status

**Important Notes:**
- Essential for regulatory compliance
- Default retention: 30 days for deleted files
- Orphaned OneDrive: retained after user account deletion
- Extended retention requires E3/E5 licensing
- Typical use: compliance requirements, legal holds
- Review retention policies annually
- Consider storage costs with long retention
- Compliance Center offers advanced retention features`,
    parameters: [
      {
        name: 'deletedRetentionDays',
        label: 'Deleted Files Retention (Days)',
        type: 'number',
        required: true,
        defaultValue: 93,
        helpText: 'Days to retain deleted files (30-36500)'
      },
      {
        name: 'orphanedRetentionDays',
        label: 'Orphaned OneDrive Retention (Days)',
        type: 'number',
        required: false,
        defaultValue: 365,
        helpText: 'Days to retain OneDrive after user deletion'
      }
    ],
    scriptTemplate: (params) => {
      const deletedRetention = params.deletedRetentionDays;
      const orphanedRetention = params.orphanedRetentionDays || 365;

      return `# Configure OneDrive Retention Policies
# Generated by PSForge

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Configuring OneDrive retention policies..." -ForegroundColor Cyan
    
    if (${deletedRetention} -lt 30 -or ${deletedRetention} -gt 36500) {
        throw "Retention days must be between 30 and 36500"
    }
    
    Set-SPOTenant -OrphanedPersonalSitesRetentionPeriod ${orphanedRetention}
    
    Write-Host "✓ OneDrive retention policies configured" -ForegroundColor Green
    Write-Host "  Deleted Files Retention: ${deletedRetention} days" -ForegroundColor Yellow
    Write-Host "  Orphaned OneDrive Retention: ${orphanedRetention} days" -ForegroundColor Yellow
    Write-Host "⚠ Applies to all OneDrive sites tenant-wide" -ForegroundColor Cyan
    Write-Host "  Users can restore deleted files within retention period" -ForegroundColor Gray
    Write-Host "  After retention expires, files are permanently deleted" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure retention policies: $_"
}`;
    }
  },

  {
    id: 'od-export-usage-reports',
    title: 'Export OneDrive Usage Reports',
    description: 'Export comprehensive OneDrive usage including storage, sharing, and sync status',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports comprehensive OneDrive usage analytics
- Shows storage usage, sharing activity, and sync health
- Combines multiple Graph API reports into one
- Essential for adoption tracking and capacity planning

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- Reports.Read.All permission
- Global Administrator or Reports Reader role
- Connected to Microsoft Graph

**What You Need to Provide:**
- Report period (7, 30, 90, or 180 days)
- Export file path (CSV)

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves OneDrive usage details for period
3. Retrieves OneDrive activity details for period
4. Combines storage and activity metrics
5. Exports comprehensive usage report to CSV

**Important Notes:**
- Essential for capacity planning and adoption tracking
- Shows storage used, files shared, sync status
- Use for quarterly business reviews
- Identify inactive users for license optimization
- Track adoption after OneDrive rollouts
- Typical use: executive reporting, cost optimization
- Data delayed by 24-48 hours
- Review monthly for usage trends`,
    parameters: [
      {
        name: 'period',
        label: 'Report Period',
        type: 'select',
        required: true,
        options: [
          { value: 'D7', label: 'Last 7 days' },
          { value: 'D30', label: 'Last 30 days' },
          { value: 'D90', label: 'Last 90 days' },
          { value: 'D180', label: 'Last 180 days' }
        ],
        helpText: 'Reporting time period'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\OneDriveUsageReport.csv',
        helpText: 'CSV export location'
      }
    ],
    scriptTemplate: (params) => {
      const period = params.period;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export OneDrive Usage Reports
# Generated by PSForge

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Collecting OneDrive usage reports..." -ForegroundColor Cyan
    Write-Host "  Period: ${period}" -ForegroundColor White
    
    Write-Host "  Fetching storage usage data..." -ForegroundColor Gray
    $StorageData = Get-MgReportOneDriveUsageAccountDetail -Period ${period}
    
    Write-Host "  Fetching activity data..." -ForegroundColor Gray
    $ActivityData = Get-MgReportOneDriveActivityUserDetail -Period ${period}
    
    Write-Host "Processing combined report..." -ForegroundColor Cyan
    
    $UsageReport = foreach ($Storage in $StorageData) {
        $Activity = $ActivityData | Where-Object { $_.'User Principal Name' -eq $Storage.'User Principal Name' } | Select-Object -First 1
        
        [PSCustomObject]@{
            UserPrincipalName = $Storage.'User Principal Name'
            OwnerDisplayName = $Storage.'Owner Display Name'
            IsDeleted = $Storage.'Is Deleted'
            LastActivityDate = $Storage.'Last Activity Date'
            FileCount = $Storage.'File Count'
            ActiveFileCount = $Storage.'Active File Count'
            StorageUsedGB = [math]::Round($Storage.'Storage Used (Byte)' / 1GB, 2)
            StorageAllocatedGB = [math]::Round($Storage.'Storage Allocated (Byte)' / 1GB, 2)
            ViewedEditedFileCount = if ($Activity) { $Activity.'Viewed Or Edited File Count' } else { 0 }
            SyncedFileCount = if ($Activity) { $Activity.'Synced File Count' } else { 0 }
            SharedInternallyFileCount = if ($Activity) { $Activity.'Shared Internally File Count' } else { 0 }
            SharedExternallyFileCount = if ($Activity) { $Activity.'Shared Externally File Count' } else { 0 }
        }
    }
    
    $UsageReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalUsers = $UsageReport.Count
    $ActiveUsers = ($UsageReport | Where-Object { $_.LastActivityDate -ne $null }).Count
    $TotalStorageGB = ($UsageReport | Measure-Object -Property StorageUsedGB -Sum).Sum
    $ExternalShares = ($UsageReport | Measure-Object -Property SharedExternallyFileCount -Sum).Sum
    
    Write-Host "✓ OneDrive usage report exported successfully" -ForegroundColor Green
    Write-Host "  Total Users: $TotalUsers" -ForegroundColor Yellow
    Write-Host "  Active Users: $ActiveUsers ($([math]::Round(($ActiveUsers/$TotalUsers)*100, 1))%)" -ForegroundColor Yellow
    Write-Host "  Total Storage Used: $([math]::Round($TotalStorageGB, 2)) GB" -ForegroundColor Yellow
    Write-Host "  Files Shared Externally: $ExternalShares" -ForegroundColor $(if ($ExternalShares -gt 0) { "Yellow" } else { "Cyan" })
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export usage reports: $_"
}`;
    }
  }
];

export const oneDriveCategories = [
  'Storage Management',
  'Sharing & Permissions',
  'Sync & Client',
  'Reporting',
  'Common Admin Tasks'
];
