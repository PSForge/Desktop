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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Storage report exported to: ${exportPath}" -ForegroundColor Green
    
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Sharing report exported to: ${exportPath}" -ForegroundColor Green
    
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
    isPremium: true,
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Sync health exported to: ${exportPath}" -ForegroundColor Green
    
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] OneDrive sites exported to: ${exportPath}" -ForegroundColor Green
    
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Quota set to ${quotaGB}GB for ${userEmail}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Downloads blocked for ${userEmail}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Version limit set to ${versions} for ${userEmail}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Anonymous sharing links will expire in ${days} days" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] OneDrive sync blocked for ${userEmail}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] OneDrive external sharing set to: ${level}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Orphaned OneDrive retention set to ${days} days" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Recycle bin retention set to ${days} days" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Default sharing link type set to: ${type}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Owner notifications ${enable ? 'enabled' : 'disabled'}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Infected file downloads ${enable ? 'blocked' : 'allowed'}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Non-web-viewable file downloads ${restrict ? 'restricted' : 'allowed'}" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] File count report exported to ${exportPath}" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Shared links report exported to ${exportPath}" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Storage trend report exported to ${exportPath}" -ForegroundColor Green
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
    isPremium: true,
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
        Write-Host "[SUCCESS] Access requests enabled for all OneDrive sites" -ForegroundColor Green
        Write-Host "  Users can request access to shared OneDrive files" -ForegroundColor Gray
    } else {
        Set-SPOTenant -ODBAccessRequests Off
        Write-Host "[SUCCESS] Access requests disabled for all OneDrive sites" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Legacy authentication: ${block ? 'Blocked' : 'Allowed'}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Idle timeout configured: ${minutes} minutes" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Unmanaged device policy: ${action}" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Deleted $($Sites.Count) OneDrive sites" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Set quotas for $SuccessCount of $($Users.Count) users" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] OneDrive site located: $($Site.Url)" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] Activity report exported to ${exportPath}" -ForegroundColor Green
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
    isPremium: true,
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
    Write-Host "[SUCCESS] Blocked file types from sync: ${extensions}" -ForegroundColor Green
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
    isPremium: true,
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
    
    Write-Host "[SUCCESS] OneDrive site restored successfully" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Personal account sync blocked" -ForegroundColor Green
    }
    
    Write-Host "[SUCCESS] OneDrive sync restrictions configured" -ForegroundColor Green
    ${allowedGuids ? `Write-Host "  Domain restrictions active" -ForegroundColor Yellow` : ''}
    Write-Host "  Block Personal Accounts: ${blockPersonal}" -ForegroundColor Yellow
    Write-Host "  Block macOS Sync: ${blockMac}" -ForegroundColor Yellow
    Write-Host "[WARNING] Changes apply to new sync sessions" -ForegroundColor Cyan
    
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
    
    Write-Host "[SUCCESS] OneDrive storage quotas configured" -ForegroundColor Green
    Write-Host "  Default Quota: ${defaultQuota} GB ($DefaultQuotaMB MB)" -ForegroundColor Yellow
    Write-Host "  Minimum Quota: ${minQuota} GB ($MinQuotaMB MB)" -ForegroundColor Yellow
    Write-Host "  Maximum Quota: ${maxQuota} GB ($MaxQuotaMB MB)" -ForegroundColor Yellow
    Write-Host "[WARNING] Applies to newly provisioned OneDrive sites" -ForegroundColor Cyan
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
    
    Write-Host "[SUCCESS] OneDrive Files Restore initiated" -ForegroundColor Green
    Write-Host "  All files being restored to $($RestoreDate.ToString('yyyy-MM-dd'))" -ForegroundColor Cyan
    Write-Host "  Restore may take several minutes to complete" -ForegroundColor Gray
    Write-Host "[WARNING] Current versions will be overwritten with restored versions" -ForegroundColor Yellow
    
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
    
    Write-Host "[SUCCESS] OneDrive retention policies configured" -ForegroundColor Green
    Write-Host "  Deleted Files Retention: ${deletedRetention} days" -ForegroundColor Yellow
    Write-Host "  Orphaned OneDrive Retention: ${orphanedRetention} days" -ForegroundColor Yellow
    Write-Host "[WARNING] Applies to all OneDrive sites tenant-wide" -ForegroundColor Cyan
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
    
    Write-Host "[SUCCESS] OneDrive usage report exported successfully" -ForegroundColor Green
    Write-Host "  Total Users: $TotalUsers" -ForegroundColor Yellow
    Write-Host "  Active Users: $ActiveUsers ($([math]::Round(($ActiveUsers/$TotalUsers)*100, 1))%)" -ForegroundColor Yellow
    Write-Host "  Total Storage Used: $([math]::Round($TotalStorageGB, 2)) GB" -ForegroundColor Yellow
    Write-Host "  Files Shared Externally: $ExternalShares" -ForegroundColor $(if ($ExternalShares -gt 0) { "Yellow" } else { "Cyan" })
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export usage reports: $_"
}`;
    }
  },

  // ============================================
  // NEW TASKS: Storage Management, Sharing, Compliance, Sync, User Management
  // ============================================

  {
    id: 'od-large-files-report',
    title: 'Export Large Files Report',
    description: 'Identify large files consuming OneDrive storage quota',
    category: 'Storage Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script identifies and reports on large files across OneDrive sites that are consuming significant storage quota.

**Prerequisites:**
- SharePoint Online Management Shell installed
- PnP PowerShell module installed
- SharePoint Administrator or Global Administrator role
- Connection to SharePoint admin center

**What You Need to Provide:**
- Minimum file size threshold (MB)
- Export CSV file path

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Retrieves all OneDrive sites
3. Scans each site for files exceeding threshold
4. Exports large file details to CSV
5. Reports total large files found and storage consumed

**Important Notes:**
- Essential for storage optimization and cost management
- Identifies candidates for archival or deletion
- May take extended time for large tenants
- Typical use: quarterly storage audits, quota management
- Consider archival policies for old large files
- Review with users before requesting deletion
- Can be filtered by file type for targeted analysis`,
    parameters: [
      {
        name: 'minSizeMB',
        label: 'Minimum File Size (MB)',
        type: 'number',
        required: true,
        defaultValue: 100,
        helpText: 'Files larger than this will be reported'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\LargeFiles.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const minSizeMB = params.minSizeMB || 100;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Large Files Report
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Scanning OneDrive sites for large files (>${minSizeMB}MB)..." -ForegroundColor Cyan
    
    $Sites = Get-SPOSite -IncludePersonalSite $true -Limit All -Filter "Url -like '-my.sharepoint.com/personal/'"
    $LargeFiles = @()
    $MinSizeBytes = ${minSizeMB} * 1MB
    
    $TotalSites = $Sites.Count
    $CurrentSite = 0
    
    foreach ($Site in $Sites) {
        $CurrentSite++
        Write-Progress -Activity "Scanning OneDrive Sites" -Status "$CurrentSite of $TotalSites" -PercentComplete (($CurrentSite / $TotalSites) * 100)
        
        try {
            Connect-PnPOnline -Url $Site.Url -Interactive -ErrorAction SilentlyContinue
            
            $Files = Get-PnPListItem -List "Documents" -PageSize 500 | Where-Object { 
                $_["File_x0020_Size"] -gt $MinSizeBytes 
            }
            
            foreach ($File in $Files) {
                $LargeFiles += [PSCustomObject]@{
                    Owner = $Site.Owner
                    FileName = $File["FileLeafRef"]
                    FilePath = $File["FileRef"]
                    SizeMB = [math]::Round($File["File_x0020_Size"] / 1MB, 2)
                    SizeGB = [math]::Round($File["File_x0020_Size"] / 1GB, 3)
                    Created = $File["Created"]
                    Modified = $File["Modified"]
                    SiteUrl = $Site.Url
                }
            }
            
            Disconnect-PnPOnline -ErrorAction SilentlyContinue
        } catch {
            Write-Warning "Could not scan $($Site.Url): $_"
        }
    }
    
    Write-Progress -Activity "Scanning OneDrive Sites" -Completed
    
    $LargeFiles | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalSizeGB = ($LargeFiles | Measure-Object -Property SizeGB -Sum).Sum
    
    Write-Host "[SUCCESS] Large files report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total large files found: $($LargeFiles.Count)" -ForegroundColor Yellow
    Write-Host "  Total storage consumed: $([math]::Round($TotalSizeGB, 2)) GB" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to generate large files report: $_"
}`;
    }
  },

  {
    id: 'od-orphaned-sites-report',
    title: 'Export Orphaned OneDrive Sites',
    description: 'Find OneDrive sites with deleted or disabled owners',
    category: 'Storage Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script identifies OneDrive sites where the owner account has been deleted or disabled, indicating orphaned storage.

**Prerequisites:**
- SharePoint Online Management Shell installed
- Microsoft Graph PowerShell module installed
- SharePoint Administrator or Global Administrator role
- User.Read.All permission

**What You Need to Provide:**
- Export CSV file path

**What the Script Does:**
1. Connects to SharePoint Online and Microsoft Graph
2. Retrieves all personal OneDrive sites
3. Checks each owner against Azure AD
4. Identifies sites with deleted/disabled owners
5. Exports orphaned site details to CSV

**Important Notes:**
- Essential for storage cleanup and cost optimization
- Orphaned sites consume storage quota unnecessarily
- Default retention: 30 days after owner deletion
- Typical use: quarterly cleanup, license reclamation
- Consider data backup before deletion
- Assign secondary admin for data recovery
- Legal holds may prevent deletion`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\OrphanedOneDrive.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Orphaned OneDrive Sites Report
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com
Connect-MgGraph -Scopes "User.Read.All"

try {
    Write-Host "Scanning for orphaned OneDrive sites..." -ForegroundColor Cyan
    
    $Sites = Get-SPOSite -IncludePersonalSite $true -Limit All -Filter "Url -like '-my.sharepoint.com/personal/'"
    $OrphanedSites = @()
    
    $TotalSites = $Sites.Count
    $CurrentSite = 0
    
    foreach ($Site in $Sites) {
        $CurrentSite++
        Write-Progress -Activity "Checking OneDrive owners" -Status "$CurrentSite of $TotalSites" -PercentComplete (($CurrentSite / $TotalSites) * 100)
        
        try {
            $User = Get-MgUser -UserId $Site.Owner -ErrorAction SilentlyContinue
            
            if (-not $User) {
                $OrphanedSites += [PSCustomObject]@{
                    Owner = $Site.Owner
                    SiteUrl = $Site.Url
                    StorageUsedMB = $Site.StorageUsageCurrent
                    StorageUsedGB = [math]::Round($Site.StorageUsageCurrent / 1024, 2)
                    LastModified = $Site.LastContentModifiedDate
                    Status = "Owner Not Found"
                }
            } elseif ($User.AccountEnabled -eq $false) {
                $OrphanedSites += [PSCustomObject]@{
                    Owner = $Site.Owner
                    SiteUrl = $Site.Url
                    StorageUsedMB = $Site.StorageUsageCurrent
                    StorageUsedGB = [math]::Round($Site.StorageUsageCurrent / 1024, 2)
                    LastModified = $Site.LastContentModifiedDate
                    Status = "Owner Disabled"
                }
            }
        } catch {
            $OrphanedSites += [PSCustomObject]@{
                Owner = $Site.Owner
                SiteUrl = $Site.Url
                StorageUsedMB = $Site.StorageUsageCurrent
                StorageUsedGB = [math]::Round($Site.StorageUsageCurrent / 1024, 2)
                LastModified = $Site.LastContentModifiedDate
                Status = "Check Failed"
            }
        }
    }
    
    Write-Progress -Activity "Checking OneDrive owners" -Completed
    
    $OrphanedSites | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalStorageGB = ($OrphanedSites | Measure-Object -Property StorageUsedGB -Sum).Sum
    
    Write-Host "[SUCCESS] Orphaned sites report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Orphaned OneDrive sites found: $($OrphanedSites.Count)" -ForegroundColor Yellow
    Write-Host "  Total orphaned storage: $([math]::Round($TotalStorageGB, 2)) GB" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to generate orphaned sites report: $_"
}

Disconnect-MgGraph`;
    }
  },

  {
    id: 'od-bulk-quota-update',
    title: 'Bulk Update OneDrive Quotas',
    description: 'Update storage quotas for multiple users from CSV',
    category: 'User Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script bulk updates OneDrive storage quotas for multiple users based on a CSV input file.

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- CSV file with UserEmail and QuotaGB columns

**What You Need to Provide:**
- CSV file path with user quotas

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Imports user quota assignments from CSV
3. Locates each user's OneDrive site
4. Updates storage quota for each user
5. Reports success and failure counts

**Important Notes:**
- CSV must have columns: UserEmail, QuotaGB
- Quota values in GB (converted to MB internally)
- Users must have OneDrive provisioned
- Typical use: role-based quota management, department policies
- Test with small batch first
- Consider quota limits (min 1GB, max tenant limit)
- Changes take effect immediately`,
    parameters: [
      {
        name: 'csvPath',
        label: 'CSV File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\QuotaUpdates.csv',
        helpText: 'CSV with UserEmail and QuotaGB columns'
      }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);

      return `# Bulk Update OneDrive Quotas
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Importing quota updates from CSV..." -ForegroundColor Cyan
    
    $Users = Import-Csv "${csvPath}"
    
    if (-not ($Users | Get-Member -Name "UserEmail") -or -not ($Users | Get-Member -Name "QuotaGB")) {
        throw "CSV must contain UserEmail and QuotaGB columns"
    }
    
    $SuccessCount = 0
    $FailCount = 0
    $Results = @()
    
    foreach ($User in $Users) {
        try {
            $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '$($User.UserEmail)'" -ErrorAction Stop
            
            if ($Site) {
                $QuotaMB = [int]$User.QuotaGB * 1024
                Set-SPOSite -Identity $Site.Url -StorageQuota $QuotaMB -ErrorAction Stop
                
                $Results += [PSCustomObject]@{
                    UserEmail = $User.UserEmail
                    QuotaGB = $User.QuotaGB
                    Status = "Success"
                    Message = "Quota updated to $($User.QuotaGB)GB"
                }
                $SuccessCount++
                Write-Host "  [SUCCESS] $($User.UserEmail): $($User.QuotaGB)GB" -ForegroundColor Green
            } else {
                $Results += [PSCustomObject]@{
                    UserEmail = $User.UserEmail
                    QuotaGB = $User.QuotaGB
                    Status = "Failed"
                    Message = "OneDrive not found"
                }
                $FailCount++
                Write-Host "  [FAILED] $($User.UserEmail): OneDrive not found" -ForegroundColor Red
            }
        } catch {
            $Results += [PSCustomObject]@{
                UserEmail = $User.UserEmail
                QuotaGB = $User.QuotaGB
                Status = "Failed"
                Message = $_.Exception.Message
            }
            $FailCount++
            Write-Host "  [FAILED] $($User.UserEmail): $_" -ForegroundColor Red
        }
    }
    
    $ResultsPath = "${csvPath}".Replace(".csv", "_results.csv")
    $Results | Export-Csv -Path $ResultsPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Bulk quota update complete" -ForegroundColor Green
    Write-Host "  Successful updates: $SuccessCount" -ForegroundColor Yellow
    Write-Host "  Failed updates: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Yellow" })
    Write-Host "  Results exported to: $ResultsPath" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to process bulk quota updates: $_"
}`;
    }
  },

  {
    id: 'od-anonymous-links-audit',
    title: 'Audit Anonymous Sharing Links',
    description: 'Find all anonymous (anyone) sharing links across OneDrive',
    category: 'Sharing & Permissions',
    isPremium: true,
    instructions: `**How This Task Works:**
This script audits all anonymous sharing links (Anyone links) across OneDrive sites for security review.

**Prerequisites:**
- SharePoint Online Management Shell installed
- PnP PowerShell module installed
- SharePoint Administrator or Global Administrator role

**What You Need to Provide:**
- Export CSV file path

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Retrieves all OneDrive sites
3. Scans each site for anonymous sharing links
4. Exports link details including expiration and permissions
5. Reports total anonymous links found

**Important Notes:**
- Essential for security audits and compliance reviews
- Anonymous links allow access without authentication
- Identifies potential data exposure risks
- Typical use: security reviews, compliance audits
- Consider link expiration policies
- Review and revoke unnecessary anonymous links
- Run monthly for ongoing security monitoring`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AnonymousLinks.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Audit Anonymous Sharing Links
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Auditing anonymous sharing links..." -ForegroundColor Cyan
    
    $Sites = Get-SPOSite -IncludePersonalSite $true -Limit All -Filter "Url -like '-my.sharepoint.com/personal/'"
    $AnonymousLinks = @()
    
    $TotalSites = $Sites.Count
    $CurrentSite = 0
    
    foreach ($Site in $Sites) {
        $CurrentSite++
        Write-Progress -Activity "Scanning OneDrive sites for anonymous links" -Status "$CurrentSite of $TotalSites" -PercentComplete (($CurrentSite / $TotalSites) * 100)
        
        try {
            Connect-PnPOnline -Url $Site.Url -Interactive -ErrorAction SilentlyContinue
            
            $SharingLinks = Get-PnPFileSharingLink -ErrorAction SilentlyContinue
            
            $AnonLinks = $SharingLinks | Where-Object { $_.LinkKind -eq "AnonymousAccess" }
            
            foreach ($Link in $AnonLinks) {
                $AnonymousLinks += [PSCustomObject]@{
                    Owner = $Site.Owner
                    SiteUrl = $Site.Url
                    ItemName = $Link.Name
                    ItemPath = $Link.ServerRelativeUrl
                    LinkUrl = $Link.WebUrl
                    LinkType = $Link.LinkKind
                    Permissions = $Link.Roles -join ", "
                    Expiration = $Link.Expiration
                    Created = $Link.Created
                }
            }
            
            Disconnect-PnPOnline -ErrorAction SilentlyContinue
        } catch {
            # Skip sites with access issues
        }
    }
    
    Write-Progress -Activity "Scanning OneDrive sites" -Completed
    
    $AnonymousLinks | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Anonymous links audit exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total anonymous links found: $($AnonymousLinks.Count)" -ForegroundColor $(if ($AnonymousLinks.Count -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Sites scanned: $TotalSites" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to audit anonymous links: $_"
}`;
    }
  },

  {
    id: 'od-revoke-external-access',
    title: 'Revoke All External Sharing',
    description: 'Remove all external sharing from a user OneDrive',
    category: 'Sharing & Permissions',
    isPremium: true,
    instructions: `**How This Task Works:**
This script revokes all external sharing permissions from a specific user's OneDrive for security lockdown.

**Prerequisites:**
- SharePoint Online Management Shell installed
- PnP PowerShell module installed
- SharePoint Administrator or Global Administrator role

**What You Need to Provide:**
- User email address

**What the Script Does:**
1. Connects to user's OneDrive site
2. Enumerates all shared items
3. Removes external sharing permissions
4. Revokes anonymous access links
5. Reports count of shares revoked

**Important Notes:**
- DESTRUCTIVE - External users will lose access immediately
- Typical use: offboarding, security incidents, data breach response
- Does not affect internal sharing
- Consider backup of sharing report before revoking
- Users will not be notified automatically
- Cannot be undone - shares must be recreated
- Run during maintenance window if possible`,
    parameters: [
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'OneDrive owner email address'
      }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);

      return `# Revoke All External Sharing
# Generated: ${new Date().toISOString()}
# WARNING: This will remove ALL external access to user's OneDrive

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Revoking external sharing for: ${userEmail}" -ForegroundColor Cyan
    
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    
    if (-not $Site) {
        throw "OneDrive not found for user: ${userEmail}"
    }
    
    Connect-PnPOnline -Url $Site.Url -Interactive
    
    Write-Host "  Scanning for shared items..." -ForegroundColor Gray
    
    $ListItems = Get-PnPListItem -List "Documents" -PageSize 500
    $RevokedCount = 0
    
    foreach ($Item in $ListItems) {
        try {
            $Sharing = Get-PnPFileSharingLink -Identity $Item.Id -ErrorAction SilentlyContinue
            
            foreach ($Link in $Sharing) {
                if ($Link.LinkKind -eq "AnonymousAccess" -or $Link.IsExternal) {
                    Remove-PnPFileSharingLink -Identity $Item.Id -SharingLinkId $Link.Id -Force -ErrorAction SilentlyContinue
                    $RevokedCount++
                    Write-Host "  Revoked: $($Item['FileLeafRef'])" -ForegroundColor Gray
                }
            }
        } catch {
            # Skip items without sharing links
        }
    }
    
    Set-SPOSite -Identity $Site.Url -SharingCapability Disabled -ErrorAction SilentlyContinue
    
    Disconnect-PnPOnline
    
    Write-Host "[SUCCESS] External sharing revoked for ${userEmail}" -ForegroundColor Green
    Write-Host "  Sharing links revoked: $RevokedCount" -ForegroundColor Yellow
    Write-Host "  OneDrive external sharing disabled" -ForegroundColor Yellow
    Write-Host "[WARNING] External users have lost access immediately" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to revoke external sharing: $_"
}`;
    }
  },

  {
    id: 'od-external-users-report',
    title: 'Export External Users Access Report',
    description: 'List all external users with access to OneDrive files',
    category: 'Sharing & Permissions',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports a report of all external users (guests) who have access to OneDrive content across the tenant.

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- SharePoint Administrator or Global Administrator role
- Sites.Read.All permission

**What You Need to Provide:**
- Export CSV file path

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves all guest users in tenant
3. Identifies OneDrive resources they can access
4. Exports external user access details to CSV
5. Reports total external users with OneDrive access

**Important Notes:**
- Essential for security audits and compliance
- Shows who outside organization has file access
- Typical use: GDPR compliance, security reviews
- Identify stale guest accounts for cleanup
- Consider guest access policies
- Run quarterly for governance
- Review before audits`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ExternalUsersAccess.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export External Users Access Report
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "User.Read.All", "Sites.Read.All"

try {
    Write-Host "Collecting external users with OneDrive access..." -ForegroundColor Cyan
    
    $GuestUsers = Get-MgUser -Filter "userType eq 'Guest'" -All
    
    Write-Host "  Found $($GuestUsers.Count) guest users in tenant" -ForegroundColor Gray
    
    $ExternalAccess = @()
    $CurrentUser = 0
    
    foreach ($Guest in $GuestUsers) {
        $CurrentUser++
        Write-Progress -Activity "Checking guest user access" -Status "$CurrentUser of $($GuestUsers.Count)" -PercentComplete (($CurrentUser / $GuestUsers.Count) * 100)
        
        try {
            $SharedDrives = Get-MgUserDriveSharedWithMe -UserId $Guest.Id -ErrorAction SilentlyContinue
            
            foreach ($Drive in $SharedDrives) {
                $ExternalAccess += [PSCustomObject]@{
                    GuestEmail = $Guest.Mail
                    GuestDisplayName = $Guest.DisplayName
                    GuestId = $Guest.Id
                    CreatedDateTime = $Guest.CreatedDateTime
                    LastSignIn = $Guest.SignInActivity.LastSignInDateTime
                    SharedItemName = $Drive.Name
                    SharedItemUrl = $Drive.WebUrl
                    DriveType = $Drive.DriveType
                }
            }
        } catch {
            # Skip users without shared content
        }
    }
    
    Write-Progress -Activity "Checking guest user access" -Completed
    
    $ExternalAccess | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $UniqueGuests = ($ExternalAccess | Select-Object -Property GuestEmail -Unique).Count
    
    Write-Host "[SUCCESS] External users report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  External users with OneDrive access: $UniqueGuests" -ForegroundColor Yellow
    Write-Host "  Total shared items: $($ExternalAccess.Count)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to export external users report: $_"
}

Disconnect-MgGraph`;
    }
  },

  {
    id: 'od-legal-hold',
    title: 'Apply Legal Hold to OneDrive',
    description: 'Place OneDrive content on legal hold for litigation',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script applies a legal hold to a user's OneDrive to preserve content for litigation or compliance requirements.

**Prerequisites:**
- Security & Compliance PowerShell module installed
- eDiscovery Manager or Compliance Administrator role
- Microsoft 365 E3/E5 licensing

**What You Need to Provide:**
- User email address
- Case name for the hold
- Hold description (optional)

**What the Script Does:**
1. Connects to Security & Compliance Center
2. Creates or updates eDiscovery case
3. Places user's OneDrive on hold
4. Preserves all content from deletion
5. Reports hold status

**Important Notes:**
- Prevents deletion of held content
- Content preserved even if user deletes
- Affects storage quota calculations
- Typical use: litigation, investigations, audits
- Requires proper legal authorization
- Document hold reasons for compliance
- Remove holds promptly when no longer needed`,
    parameters: [
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'OneDrive owner email address'
      },
      {
        name: 'caseName',
        label: 'Case Name',
        type: 'text',
        required: true,
        placeholder: 'Legal-Hold-2024-001',
        helpText: 'Name for the eDiscovery case'
      },
      {
        name: 'holdDescription',
        label: 'Hold Description',
        type: 'textarea',
        required: false,
        placeholder: 'Legal hold for litigation matter...',
        helpText: 'Description of hold purpose'
      }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const caseName = escapePowerShellString(params.caseName);
      const description = escapePowerShellString(params.holdDescription || 'Legal hold applied via PSForge');

      return `# Apply Legal Hold to OneDrive
# Generated: ${new Date().toISOString()}

Connect-IPPSSession

try {
    Write-Host "Applying legal hold to OneDrive for: ${userEmail}" -ForegroundColor Cyan
    
    $Case = Get-ComplianceCase -Identity "${caseName}" -ErrorAction SilentlyContinue
    
    if (-not $Case) {
        Write-Host "  Creating eDiscovery case: ${caseName}" -ForegroundColor Gray
        $Case = New-ComplianceCase -Name "${caseName}" -Description "${description}"
    }
    
    $HoldName = "${caseName}-OneDrive-Hold"
    $ExistingHold = Get-CaseHoldPolicy -Case $Case.Identity -Identity $HoldName -ErrorAction SilentlyContinue
    
    if (-not $ExistingHold) {
        Write-Host "  Creating hold policy..." -ForegroundColor Gray
        $HoldPolicy = New-CaseHoldPolicy -Name $HoldName -Case $Case.Identity -Comment "${description}"
        
        Write-Host "  Adding OneDrive location..." -ForegroundColor Gray
        New-CaseHoldRule -Name "$HoldName-Rule" -Policy $HoldPolicy.Identity -ContentMatchQuery "*"
        
        Set-CaseHoldPolicy -Identity $HoldPolicy.Identity -AddOneDriveLocation "${userEmail}"
    } else {
        Write-Host "  Updating existing hold..." -ForegroundColor Gray
        Set-CaseHoldPolicy -Identity $ExistingHold.Identity -AddOneDriveLocation "${userEmail}"
    }
    
    Write-Host "[SUCCESS] Legal hold applied successfully" -ForegroundColor Green
    Write-Host "  Case: ${caseName}" -ForegroundColor Yellow
    Write-Host "  User: ${userEmail}" -ForegroundColor Yellow
    Write-Host "  Status: OneDrive content preserved" -ForegroundColor Cyan
    Write-Host "[WARNING] Content cannot be permanently deleted while on hold" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to apply legal hold: $_"
}

Disconnect-ExchangeOnline -Confirm:$false`;
    }
  },

  {
    id: 'od-ediscovery-export',
    title: 'Export OneDrive for eDiscovery',
    description: 'Export OneDrive content for legal eDiscovery review',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports OneDrive content for eDiscovery using content search and export functionality.

**Prerequisites:**
- Security & Compliance PowerShell module installed
- eDiscovery Manager role
- Microsoft 365 E3/E5 licensing
- eDiscovery Export Tool installed on workstation

**What You Need to Provide:**
- User email address
- Search query (optional - blank for all content)
- Export name

**What the Script Does:**
1. Connects to Security & Compliance Center
2. Creates content search targeting OneDrive
3. Runs search with specified query
4. Initiates export action
5. Provides export download instructions

**Important Notes:**
- Exports may take hours for large OneDrives
- Download requires eDiscovery Export Tool
- Maintains chain of custody for legal purposes
- Typical use: litigation, investigations, audits
- Document search queries for legal records
- Consider export format (PST, native, etc.)
- Large exports may require staging location`,
    parameters: [
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'OneDrive owner email address'
      },
      {
        name: 'searchQuery',
        label: 'Search Query (KQL)',
        type: 'text',
        required: false,
        placeholder: 'Leave blank for all content',
        helpText: 'KQL query to filter content (optional)'
      },
      {
        name: 'exportName',
        label: 'Export Name',
        type: 'text',
        required: true,
        placeholder: 'eDiscovery-Export-2024-001',
        helpText: 'Name for the export job'
      }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const searchQuery = params.searchQuery ? escapePowerShellString(params.searchQuery) : '*';
      const exportName = escapePowerShellString(params.exportName);

      return `# Export OneDrive for eDiscovery
# Generated: ${new Date().toISOString()}

Connect-IPPSSession

try {
    Write-Host "Creating eDiscovery export for: ${userEmail}" -ForegroundColor Cyan
    
    $SearchName = "${exportName}-Search"
    
    Write-Host "  Creating content search..." -ForegroundColor Gray
    $Search = New-ComplianceSearch -Name $SearchName -OneDriveLocation "${userEmail}" -ContentMatchQuery "${searchQuery}"
    
    Write-Host "  Starting search..." -ForegroundColor Gray
    Start-ComplianceSearch -Identity $SearchName
    
    do {
        Start-Sleep -Seconds 10
        $SearchStatus = Get-ComplianceSearch -Identity $SearchName
        Write-Host "  Search status: $($SearchStatus.Status)" -ForegroundColor Gray
    } while ($SearchStatus.Status -ne "Completed")
    
    Write-Host "  Search complete. Items found: $($SearchStatus.Items)" -ForegroundColor Yellow
    
    if ($SearchStatus.Items -gt 0) {
        Write-Host "  Creating export action..." -ForegroundColor Gray
        New-ComplianceSearchAction -SearchName $SearchName -Export -ExportType OriginalFormat -EnableDedupe $true
        
        Write-Host "[SUCCESS] eDiscovery export initiated" -ForegroundColor Green
        Write-Host "  Export Name: ${exportName}" -ForegroundColor Yellow
        Write-Host "  User: ${userEmail}" -ForegroundColor Yellow
        Write-Host "  Items: $($SearchStatus.Items)" -ForegroundColor Yellow
        Write-Host "  Size: $([math]::Round($SearchStatus.Size / 1GB, 2)) GB" -ForegroundColor Yellow
        Write-Host "" -ForegroundColor White
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Go to Microsoft Purview compliance portal" -ForegroundColor White
        Write-Host "  2. Navigate to Content Search" -ForegroundColor White
        Write-Host "  3. Select export and download using eDiscovery Export Tool" -ForegroundColor White
    } else {
        Write-Host "[WARNING] No items found matching search criteria" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to create eDiscovery export: $_"
}

Disconnect-ExchangeOnline -Confirm:$false`;
    }
  },

  {
    id: 'od-compliance-content-search',
    title: 'Search OneDrive for Sensitive Content',
    description: 'Search OneDrive for sensitive data using compliance search',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script searches OneDrive content for sensitive information types (PII, financial data, etc.) using Microsoft Purview.

**Prerequisites:**
- Security & Compliance PowerShell module installed
- Compliance Administrator role
- Microsoft 365 E3/E5 licensing

**What You Need to Provide:**
- Sensitive information type to search for
- Scope (specific user or all OneDrive)

**What the Script Does:**
1. Connects to Security & Compliance Center
2. Creates content search with SIT query
3. Searches OneDrive locations
4. Reports matches found
5. Exports results for review

**Important Notes:**
- Essential for DLP and compliance audits
- Identifies sensitive data exposure
- Supports custom sensitive info types
- Typical use: GDPR, PCI-DSS, HIPAA compliance
- Review matches before taking action
- Consider data classification policies
- Document findings for compliance records`,
    parameters: [
      {
        name: 'sensitiveType',
        label: 'Sensitive Information Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Credit Card Number', label: 'Credit Card Numbers' },
          { value: 'U.S. Social Security Number', label: 'US Social Security Numbers' },
          { value: 'International Banking Account Number', label: 'IBAN Numbers' },
          { value: 'U.S. Individual Taxpayer Identification Number', label: 'US Tax IDs (ITIN)' },
          { value: 'All Medical Terms And Conditions', label: 'Medical Terms (HIPAA)' }
        ],
        helpText: 'Type of sensitive data to search for'
      },
      {
        name: 'userEmail',
        label: 'User Email (Optional)',
        type: 'text',
        required: false,
        placeholder: 'user@domain.com or leave blank for all',
        helpText: 'Specific user or all OneDrive if blank'
      },
      {
        name: 'exportPath',
        label: 'Results Export Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\SensitiveContent.csv',
        helpText: 'Path to export search results'
      }
    ],
    scriptTemplate: (params) => {
      const sensitiveType = escapePowerShellString(params.sensitiveType);
      const userEmail = params.userEmail ? escapePowerShellString(params.userEmail) : '';
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Search OneDrive for Sensitive Content
# Generated: ${new Date().toISOString()}

Connect-IPPSSession

try {
    Write-Host "Searching OneDrive for sensitive content..." -ForegroundColor Cyan
    Write-Host "  Sensitive Type: ${sensitiveType}" -ForegroundColor White
    
    \$SearchName = "SIT-Search-\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    \$Query = "SensitiveType:\`"${sensitiveType}\`""
    
    ${userEmail ? `
    Write-Host "  Scope: ${userEmail}" -ForegroundColor White
    $Search = New-ComplianceSearch -Name $SearchName -OneDriveLocation "${userEmail}" -ContentMatchQuery $Query
    ` : `
    Write-Host "  Scope: All OneDrive sites" -ForegroundColor White
    $Search = New-ComplianceSearch -Name $SearchName -OneDriveLocation All -ContentMatchQuery $Query
    `}
    
    Write-Host "  Starting search..." -ForegroundColor Gray
    Start-ComplianceSearch -Identity $SearchName
    
    do {
        Start-Sleep -Seconds 15
        $SearchStatus = Get-ComplianceSearch -Identity $SearchName
        Write-Host "  Status: $($SearchStatus.Status) - Items: $($SearchStatus.Items)" -ForegroundColor Gray
    } while ($SearchStatus.Status -ne "Completed")
    
    $Results = Get-ComplianceSearch -Identity $SearchName | Select-Object Name, Status, Items, Size, ContentMatchQuery, @{N='SizeGB';E={[math]::Round($_.Size/1GB, 2)}}
    
    $Results | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Sensitive content search complete" -ForegroundColor Green
    Write-Host "  Items with sensitive data: $($SearchStatus.Items)" -ForegroundColor $(if ($SearchStatus.Items -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Total size: $([math]::Round($SearchStatus.Size / 1GB, 2)) GB" -ForegroundColor Yellow
    Write-Host "  Results exported to: ${exportPath}" -ForegroundColor Cyan
    
    if ($SearchStatus.Items -gt 0) {
        Write-Host "" -ForegroundColor White
        Write-Host "[WARNING] Sensitive data found! Review and take appropriate action:" -ForegroundColor Yellow
        Write-Host "  1. Review items in Purview compliance portal" -ForegroundColor White
        Write-Host "  2. Consider applying sensitivity labels" -ForegroundColor White
        Write-Host "  3. Implement DLP policies to prevent sharing" -ForegroundColor White
    }
    
} catch {
    Write-Error "Failed to search for sensitive content: $_"
}

Disconnect-ExchangeOnline -Confirm:$false`;
    }
  },

  {
    id: 'od-sync-errors-report',
    title: 'Export Sync Errors Report',
    description: 'Export detailed OneDrive sync errors for troubleshooting',
    category: 'Sync & Client',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports OneDrive sync errors and issues for desktop support troubleshooting.

**Prerequisites:**
- Microsoft Graph PowerShell module installed
- Reports.Read.All permission
- Global Administrator or Reports Reader role

**What You Need to Provide:**
- Report period (days)
- Export CSV file path

**What the Script Does:**
1. Connects to Microsoft Graph
2. Retrieves OneDrive sync health data
3. Filters for users with sync issues
4. Exports error details to CSV
5. Reports summary of sync problems

**Important Notes:**
- Essential for proactive support
- Identifies users needing help desk assistance
- Common issues: quota exceeded, file conflicts, path too long
- Typical use: weekly support reviews, user onboarding issues
- Correlate with support tickets
- Consider Known Folder Move policies
- Address sync blockers promptly`,
    parameters: [
      {
        name: 'days',
        label: 'Report Period (Days)',
        type: 'select',
        required: true,
        options: [
          { value: '7', label: 'Last 7 days' },
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 90 days' }
        ],
        helpText: 'Time period for sync error data'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\SyncErrors.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const days = params.days;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export OneDrive Sync Errors Report
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "Reports.Read.All"

try {
    Write-Host "Collecting OneDrive sync error data..." -ForegroundColor Cyan
    Write-Host "  Period: Last ${days} days" -ForegroundColor White
    
    $SyncData = Get-MgReportOneDriveUsageAccountDetail -Period "D${days}"
    
    $SyncErrors = $SyncData | Where-Object { 
        $_.'Sync Status' -ne 'Up to date' -or 
        $_.'Has Errors' -eq $true -or
        $_.'Sync Errors Count' -gt 0
    } | Select-Object @{N='UserPrincipalName';E={$_.'User Principal Name'}},
                       @{N='DisplayName';E={$_.'Owner Display Name'}},
                       @{N='SyncStatus';E={$_.'Sync Status'}},
                       @{N='LastSyncDate';E={$_.'Last Sync Date'}},
                       @{N='ErrorCount';E={$_.'Sync Errors Count'}},
                       @{N='HasConflicts';E={$_.'Has Conflicts'}},
                       @{N='StorageUsedGB';E={[math]::Round($_.'Storage Used (Byte)' / 1GB, 2)}},
                       @{N='FileCount';E={$_.'File Count'}},
                       @{N='LastActivityDate';E={$_.'Last Activity Date'}}
    
    $SyncErrors | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalUsers = $SyncData.Count
    $ErrorUsers = $SyncErrors.Count
    $ErrorRate = if ($TotalUsers -gt 0) { [math]::Round(($ErrorUsers / $TotalUsers) * 100, 2) } else { 0 }
    
    Write-Host "[SUCCESS] Sync errors report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total OneDrive users: $TotalUsers" -ForegroundColor Yellow
    Write-Host "  Users with sync issues: $ErrorUsers ($ErrorRate%)" -ForegroundColor $(if ($ErrorRate -gt 5) { "Red" } else { "Yellow" })
    
    if ($ErrorUsers -gt 0) {
        Write-Host "" -ForegroundColor White
        Write-Host "Common Sync Error Causes:" -ForegroundColor Cyan
        Write-Host "  - Storage quota exceeded" -ForegroundColor Gray
        Write-Host "  - File path too long (>400 characters)" -ForegroundColor Gray
        Write-Host "  - Unsupported characters in file names" -ForegroundColor Gray
        Write-Host "  - Network connectivity issues" -ForegroundColor Gray
        Write-Host "  - OneDrive client outdated" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to export sync errors report: $_"
}

Disconnect-MgGraph`;
    }
  },

  {
    id: 'od-known-folder-move',
    title: 'Configure Known Folder Move',
    description: 'Enable automatic backup of Desktop, Documents, and Pictures',
    category: 'Sync & Client',
    isPremium: true,
    instructions: `**How This Task Works:**
This script configures Known Folder Move (KFM) to automatically redirect and backup user's Desktop, Documents, and Pictures folders to OneDrive.

**Prerequisites:**
- SharePoint Online Management Shell installed
- Azure AD Domain GUIDs for your tenant
- SharePoint Administrator or Global Administrator role

**What You Need to Provide:**
- Tenant ID (Azure AD)
- Folders to include (Desktop, Documents, Pictures)
- Whether to silently redirect or prompt users

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Configures KFM policy settings
3. Enables folder redirection for specified folders
4. Sets silent move or user prompt preference
5. Reports configuration status

**Important Notes:**
- Deploys via Group Policy or Intune
- Silent move recommended for enterprise
- Protects user data against device loss
- Typical use: data protection, device refresh
- Test with pilot group first
- Large documents folders may take time
- Users see backup progress notification`,
    parameters: [
      {
        name: 'tenantId',
        label: 'Azure AD Tenant ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        helpText: 'Your Azure AD tenant GUID'
      },
      {
        name: 'silentMove',
        label: 'Silent Move (No User Prompt)',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Move folders without user interaction'
      },
      {
        name: 'includeDesktop',
        label: 'Include Desktop',
        type: 'checkbox',
        required: false,
        defaultValue: true
      },
      {
        name: 'includeDocuments',
        label: 'Include Documents',
        type: 'checkbox',
        required: false,
        defaultValue: true
      },
      {
        name: 'includePictures',
        label: 'Include Pictures',
        type: 'checkbox',
        required: false,
        defaultValue: true
      }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const silentMove = params.silentMove !== false;
      const includeDesktop = params.includeDesktop !== false;
      const includeDocuments = params.includeDocuments !== false;
      const includePictures = params.includePictures !== false;

      return `# Configure Known Folder Move
# Generated: ${new Date().toISOString()}

# This script outputs the Group Policy settings or Intune configuration
# to enable Known Folder Move for your organization

Write-Host "Known Folder Move Configuration" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$TenantId = "${tenantId}"

Write-Host "Tenant ID: $TenantId" -ForegroundColor White
Write-Host "Silent Move: ${silentMove ? 'Enabled' : 'Disabled'}" -ForegroundColor White
Write-Host ""

Write-Host "Folders to Redirect:" -ForegroundColor Yellow
${includeDesktop ? `Write-Host "  [SUCCESS] Desktop" -ForegroundColor Green` : `Write-Host "  [FAILED] Desktop (excluded)" -ForegroundColor Gray`}
${includeDocuments ? `Write-Host "  [SUCCESS] Documents" -ForegroundColor Green` : `Write-Host "  [FAILED] Documents (excluded)" -ForegroundColor Gray`}
${includePictures ? `Write-Host "  [SUCCESS] Pictures" -ForegroundColor Green` : `Write-Host "  [FAILED] Pictures (excluded)" -ForegroundColor Gray`}

Write-Host ""
Write-Host "Registry Settings for Group Policy:" -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Cyan
Write-Host "HKLM\\SOFTWARE\\Policies\\Microsoft\\OneDrive"
Write-Host "  KFMSilentOptIn = $TenantId" -ForegroundColor White
${silentMove ? `Write-Host "  KFMSilentOptInWithNotification = 1" -ForegroundColor White` : `Write-Host "  KFMOptInWithWizard = $TenantId" -ForegroundColor White`}

$KfmFolders = @()
${includeDesktop ? `$KfmFolders += "Desktop"` : ''}
${includeDocuments ? `$KfmFolders += "Documents"` : ''}
${includePictures ? `$KfmFolders += "Pictures"` : ''}

if ($KfmFolders.Count -lt 3) {
    Write-Host "  KFMBlockOptOut = 1" -ForegroundColor White
    # Note: Selective folder exclusion requires additional registry settings
}

Write-Host ""
Write-Host "Intune Configuration Profile:" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Cyan
Write-Host "Create Administrative Templates profile with:" -ForegroundColor White
Write-Host "  Silently move Windows known folders to OneDrive: Enabled" -ForegroundColor Gray
Write-Host "  Tenant ID: $TenantId" -ForegroundColor Gray
${silentMove ? `Write-Host "  Show notification after folders redirected: Yes" -ForegroundColor Gray` : ''}

Write-Host ""
Write-Host "[SUCCESS] Configuration details generated" -ForegroundColor Green
Write-Host "  Apply via Group Policy or Intune" -ForegroundColor Yellow
Write-Host "  Test with pilot group before broad deployment" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'od-pre-provision',
    title: 'Pre-Provision OneDrive for Users',
    description: 'Create OneDrive sites for users before first sign-in',
    category: 'User Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script pre-provisions OneDrive sites for users before they sign in for the first time, ensuring immediate availability.

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role
- Users must have OneDrive license assigned

**What You Need to Provide:**
- CSV file with user email addresses

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Imports user list from CSV
3. Requests OneDrive provisioning for each user
4. Monitors provisioning status
5. Reports success and failure counts

**Important Notes:**
- Provisioning may take 24-48 hours to complete
- Users must have valid OneDrive license
- Typical use: new hire onboarding, migration prep
- Pre-provision before device deployment
- Reduces first sign-in delays
- Batch limit: 200 users per request
- Run in advance of user start dates`,
    parameters: [
      {
        name: 'csvPath',
        label: 'CSV File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Users\\NewHires.csv',
        helpText: 'CSV with UserEmail column'
      }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);

      return `# Pre-Provision OneDrive for Users
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Pre-provisioning OneDrive sites..." -ForegroundColor Cyan
    
    $Users = Import-Csv "${csvPath}"
    
    if (-not ($Users | Get-Member -Name "UserEmail")) {
        throw "CSV must contain UserEmail column"
    }
    
    $UserEmails = $Users | ForEach-Object { $_.UserEmail }
    
    Write-Host "  Users to provision: $($UserEmails.Count)" -ForegroundColor White
    
    $BatchSize = 200
    $TotalBatches = [math]::Ceiling($UserEmails.Count / $BatchSize)
    $CurrentBatch = 0
    $SuccessCount = 0
    $FailCount = 0
    
    for ($i = 0; $i -lt $UserEmails.Count; $i += $BatchSize) {
        $CurrentBatch++
        $Batch = $UserEmails[$i..([math]::Min($i + $BatchSize - 1, $UserEmails.Count - 1))]
        
        Write-Host "  Processing batch $CurrentBatch of $TotalBatches..." -ForegroundColor Gray
        
        try {
            Request-SPOPersonalSite -UserEmails $Batch -NoWait
            $SuccessCount += $Batch.Count
        } catch {
            Write-Warning "  Batch $CurrentBatch failed: $_"
            $FailCount += $Batch.Count
        }
    }
    
    Write-Host "[SUCCESS] OneDrive pre-provisioning requests submitted" -ForegroundColor Green
    Write-Host "  Provisioning requested: $SuccessCount users" -ForegroundColor Yellow
    Write-Host "  Failed requests: $FailCount users" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Yellow" })
    Write-Host "" -ForegroundColor White
    Write-Host "Note: Provisioning completes within 24-48 hours" -ForegroundColor Cyan
    Write-Host "  Verify with: Get-SPOSite -IncludePersonalSite" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to pre-provision OneDrive sites: $_"
}`;
    }
  },

  {
    id: 'od-add-site-admin',
    title: 'Add Site Collection Administrator',
    description: 'Grant admin access to user OneDrive for support or compliance',
    category: 'User Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script adds a site collection administrator to a user's OneDrive for support access or compliance review.

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator or Global Administrator role

**What You Need to Provide:**
- OneDrive owner email
- Administrator email to add

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Locates user's OneDrive site
3. Adds specified account as secondary admin
4. Verifies admin access granted
5. Reports successful admin addition

**Important Notes:**
- Secondary admins have full access to OneDrive content
- Document access grants for audit purposes
- Typical use: support escalations, compliance reviews
- Remove admin access when no longer needed
- Follows principle of least privilege
- User may see admin in shared access list
- Consider notifying user of admin access`,
    parameters: [
      {
        name: 'ownerEmail',
        label: 'OneDrive Owner Email',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'Email of OneDrive owner'
      },
      {
        name: 'adminEmail',
        label: 'Administrator Email',
        type: 'text',
        required: true,
        placeholder: 'admin@domain.com',
        helpText: 'Email of admin to add'
      }
    ],
    scriptTemplate: (params) => {
      const ownerEmail = escapePowerShellString(params.ownerEmail);
      const adminEmail = escapePowerShellString(params.adminEmail);

      return `# Add Site Collection Administrator to OneDrive
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Adding site collection admin to OneDrive..." -ForegroundColor Cyan
    Write-Host "  Owner: ${ownerEmail}" -ForegroundColor White
    Write-Host "  Admin: ${adminEmail}" -ForegroundColor White
    
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${ownerEmail}'"
    
    if (-not $Site) {
        throw "OneDrive not found for user: ${ownerEmail}"
    }
    
    Write-Host "  OneDrive URL: $($Site.Url)" -ForegroundColor Gray
    
    Set-SPOUser -Site $Site.Url -LoginName "${adminEmail}" -IsSiteCollectionAdmin $true
    
    $Admins = Get-SPOUser -Site $Site.Url | Where-Object { $_.IsSiteAdmin -eq $true }
    
    Write-Host "[SUCCESS] Site collection admin added successfully" -ForegroundColor Green
    Write-Host "  Admin now has full access to OneDrive content" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor White
    Write-Host "Current Site Collection Admins:" -ForegroundColor Cyan
    $Admins | ForEach-Object { Write-Host "  - $($_.LoginName)" -ForegroundColor Gray }
    Write-Host "" -ForegroundColor White
    Write-Host "[WARNING] Remember to remove admin access when no longer needed" -ForegroundColor Yellow
    Write-Host "  Use: Set-SPOUser -Site <url> -LoginName <admin> -IsSiteCollectionAdmin \$false" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to add site collection admin: $_"
}`;
    }
  },

  {
    id: 'od-migration-status',
    title: 'Check OneDrive Migration Status',
    description: 'Monitor migration progress from SharePoint Migration Tool',
    category: 'User Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script checks the status of OneDrive migrations using SharePoint Migration Tool or Migration Manager.

**Prerequisites:**
- SharePoint Online Management Shell installed
- SharePoint Administrator role
- Active migration job in progress

**What You Need to Provide:**
- Migration job ID or user email

**What the Script Does:**
1. Connects to SharePoint Online admin center
2. Queries migration job status
3. Reports progress percentage
4. Shows items migrated and remaining
5. Exports detailed status to CSV

**Important Notes:**
- Monitors SPMT or Migration Manager jobs
- Shows real-time migration progress
- Typical use: migration project monitoring
- Identify failed items for remediation
- Large migrations may take days
- Check network bandwidth during migration
- Schedule migrations during off-hours`,
    parameters: [
      {
        name: 'userEmail',
        label: 'User Email (Optional)',
        type: 'text',
        required: false,
        placeholder: 'user@domain.com or leave blank for all',
        helpText: 'Filter by specific user or view all'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\MigrationStatus.csv',
        helpText: 'Path to export migration status'
      }
    ],
    scriptTemplate: (params) => {
      const userEmail = params.userEmail ? escapePowerShellString(params.userEmail) : '';
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Check OneDrive Migration Status
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com

try {
    Write-Host "Checking OneDrive migration status..." -ForegroundColor Cyan
    
    ${userEmail ? `
    Write-Host "  Filtering for: ${userEmail}" -ForegroundColor White
    $MigrationJobs = Get-SPOMigrationJob | Where-Object { 
        $_.TargetSiteUrl -like "*$('${userEmail}'.Replace('@','_').Replace('.','_'))*" 
    }
    ` : `
    Write-Host "  Retrieving all migration jobs..." -ForegroundColor White
    $MigrationJobs = Get-SPOMigrationJob
    `}
    
    if ($MigrationJobs.Count -eq 0) {
        Write-Host "No active migration jobs found" -ForegroundColor Yellow
        return
    }
    
    $StatusReport = foreach ($Job in $MigrationJobs) {
        $JobStatus = Get-SPOMigrationJobStatus -JobId $Job.JobId
        
        [PSCustomObject]@{
            JobId = $Job.JobId
            TargetSite = $Job.TargetSiteUrl
            Status = $JobStatus.Status
            ItemsMigrated = $JobStatus.ItemsMigrated
            ItemsFailed = $JobStatus.ItemsFailed
            ItemsTotal = $JobStatus.ItemsTotal
            ProgressPercent = if ($JobStatus.ItemsTotal -gt 0) { 
                [math]::Round(($JobStatus.ItemsMigrated / $JobStatus.ItemsTotal) * 100, 2) 
            } else { 0 }
            BytesMigrated = $JobStatus.BytesMigrated
            SizeGB = [math]::Round($JobStatus.BytesMigrated / 1GB, 2)
            StartTime = $Job.StartTime
            EndTime = $Job.EndTime
        }
    }
    
    $StatusReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Migration status report generated" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "Migration Summary:" -ForegroundColor Cyan
    Write-Host "  Total jobs: $($StatusReport.Count)" -ForegroundColor Yellow
    
    $Completed = ($StatusReport | Where-Object { $_.Status -eq 'Completed' }).Count
    $InProgress = ($StatusReport | Where-Object { $_.Status -eq 'InProgress' }).Count
    $Failed = ($StatusReport | Where-Object { $_.Status -eq 'Failed' }).Count
    
    Write-Host "  Completed: $Completed" -ForegroundColor Green
    Write-Host "  In Progress: $InProgress" -ForegroundColor Yellow
    Write-Host "  Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Gray" })
    
    $TotalMigrated = ($StatusReport | Measure-Object -Property SizeGB -Sum).Sum
    Write-Host "  Total data migrated: $([math]::Round($TotalMigrated, 2)) GB" -ForegroundColor Yellow
    
    Write-Host "" -ForegroundColor White
    Write-Host "  Detailed report: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to check migration status: $_"
}`;
    }
  },

  {
    id: 'od-sensitivity-labels',
    title: 'Apply Sensitivity Labels to OneDrive',
    description: 'Configure default sensitivity labels for OneDrive content',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script configures default sensitivity labels for OneDrive sites to enforce data classification and protection.

**Prerequisites:**
- Security & Compliance PowerShell module installed
- Compliance Administrator role
- Microsoft 365 E3/E5 with sensitivity labels configured
- Labels published to users

**What You Need to Provide:**
- User email address
- Sensitivity label name to apply

**What the Script Does:**
1. Connects to Security & Compliance Center
2. Locates user's OneDrive site
3. Applies default sensitivity label
4. Configures label enforcement settings
5. Reports label application status

**Important Notes:**
- Labels must be published before application
- Default label applies to new files
- Existing files not automatically labeled
- Typical use: compliance requirements, data protection
- Consider user training on labels
- Monitor label usage with reports
- Combine with DLP policies for enforcement`,
    parameters: [
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@domain.com',
        helpText: 'OneDrive owner email address'
      },
      {
        name: 'labelName',
        label: 'Sensitivity Label Name',
        type: 'text',
        required: true,
        placeholder: 'Confidential',
        helpText: 'Name of published sensitivity label'
      }
    ],
    scriptTemplate: (params) => {
      const userEmail = escapePowerShellString(params.userEmail);
      const labelName = escapePowerShellString(params.labelName);

      return `# Apply Sensitivity Labels to OneDrive
# Generated: ${new Date().toISOString()}

Connect-SPOService -Url https://tenant-admin.sharepoint.com
Connect-IPPSSession

try {
    Write-Host "Applying sensitivity label to OneDrive..." -ForegroundColor Cyan
    Write-Host "  User: ${userEmail}" -ForegroundColor White
    Write-Host "  Label: ${labelName}" -ForegroundColor White
    
    $Label = Get-Label -Name "${labelName}" -ErrorAction SilentlyContinue
    
    if (-not $Label) {
        throw "Sensitivity label '${labelName}' not found. Ensure it is published."
    }
    
    Write-Host "  Label GUID: $($Label.Guid)" -ForegroundColor Gray
    
    $Site = Get-SPOSite -IncludePersonalSite $true -Filter "Owner -eq '${userEmail}'"
    
    if (-not $Site) {
        throw "OneDrive not found for user: ${userEmail}"
    }
    
    Set-SPOSite -Identity $Site.Url -SensitivityLabel $Label.Guid
    
    $UpdatedSite = Get-SPOSite -Identity $Site.Url
    
    Write-Host "[SUCCESS] Sensitivity label applied successfully" -ForegroundColor Green
    Write-Host "  OneDrive URL: $($Site.Url)" -ForegroundColor Yellow
    Write-Host "  Applied Label: ${labelName}" -ForegroundColor Yellow
    Write-Host "  Label GUID: $($Label.Guid)" -ForegroundColor Gray
    Write-Host "" -ForegroundColor White
    Write-Host "Note: Label applies as default for new content" -ForegroundColor Cyan
    Write-Host "  Existing files retain their current labels" -ForegroundColor Gray
    Write-Host "  Use auto-labeling policies for existing content" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to apply sensitivity label: $_"
}

Disconnect-ExchangeOnline -Confirm:$false`;
    }
  }
];

export const oneDriveCategories = [
  'Storage Management',
  'Sharing & Permissions',
  'Sync & Client',
  'Reporting',
  'Compliance',
  'User Management',
  'Common Admin Tasks'
];
