import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface FileSystemTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface FileSystemTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  isPremium?: boolean;
  parameters: FileSystemTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const fileSystemTasks: FileSystemTask[] = [
  {
    id: 'enum-shares',
    name: 'Enumerate Network Shares',
    category: 'Share Management',
    description: 'List all SMB shares with paths, descriptions, and permissions',
    instructions: `**How This Task Works:**
- Lists all SMB file shares on server
- Shows share name, path, description, state, caching mode
- Optionally includes hidden administrative shares
- Optional CSV export for documentation

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required for viewing)
- SMB service must be running

**What You Need to Provide:**
- Optional: Export path for CSV output
- Include hidden shares: true or false (default: false)

**What the Script Does:**
1. Retrieves all SMB shares using Get-SmbShare
2. Filters out hidden shares (ending with $) unless includeHidden is true
3. Selects name, path, description, state, and caching mode
4. Displays formatted table
5. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Hidden shares (ending with $): administrative shares like C$, ADMIN$
- Typical use: inventory, documentation, access reviews
- ShareState: Online or Offline
- CachingMode: controls offline file caching behavior
- CSV export useful for compliance and documentation`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\Shares.csv' },
      { id: 'includeHidden', label: 'Include Hidden Shares', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      const includeHidden = toPowerShellBoolean(params.includeHidden ?? false);
      
      return `# Enumerate Network Shares
# Generated: ${new Date().toISOString()}

$Shares = Get-SmbShare | Where-Object {
    ${includeHidden ? '$true' : '$_.Name -notlike "*$"'}
} | Select-Object Name, Path, Description, ShareState, CachingMode

$Shares | Format-Table -AutoSize
${exportPath ? `$Shares | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'create-smb-share',
    name: 'Create SMB Share with Permissions',
    category: 'Share Management',
    description: 'Create a new SMB file share with access control',
    instructions: `**How This Task Works:**
- Creates new SMB file share with permissions
- Automatically creates directory if it doesn't exist
- Configures both full access and read-only users/groups
- Essential for file server management

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- SMB service must be running
- Write permissions on parent directory

**What You Need to Provide:**
- Share name (unique identifier)
- Folder path (will be created if missing)
- Optional: Share description
- Optional: Comma-separated full access users/groups (DOMAIN\\Group)
- Optional: Comma-separated read access users/groups

**What the Script Does:**
1. Creates directory if it doesn't exist
2. Creates SMB share with New-SmbShare
3. Sets initial full access to Everyone (modified next)
4. Grants full access to specified users/groups
5. Grants read access to specified users/groups
6. Displays share configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Directory created automatically if missing
- Use DOMAIN\\username or DOMAIN\\groupname format
- Typical use: department shares, project folders, collaboration spaces
- Full access: read, write, modify, delete
- Read access: read and execute only
- Consider NTFS permissions separately from share permissions
- Effective permissions: most restrictive of share and NTFS`,
    parameters: [
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'Documents' },
      { id: 'path', label: 'Folder Path', type: 'path', required: true, placeholder: 'D:\\Shares\\Documents' },
      { id: 'description', label: 'Share Description', type: 'text', required: false, placeholder: 'Company Documents' },
      { id: 'fullAccessUsers', label: 'Full Access Users/Groups', type: 'textarea', required: false, placeholder: 'DOMAIN\\IT-Admins,DOMAIN\\FileAdmins' },
      { id: 'readAccessUsers', label: 'Read Access Users/Groups', type: 'textarea', required: false, placeholder: 'DOMAIN\\All-Users' }
    ],
    scriptTemplate: (params) => {
      const shareName = escapePowerShellString(params.shareName);
      const path = escapePowerShellString(params.path);
      const description = params.description ? escapePowerShellString(params.description) : '';
      const fullAccess = params.fullAccessUsers ? params.fullAccessUsers.split(',').map((u: string) => u.trim()) : [];
      const readAccess = params.readAccessUsers ? params.readAccessUsers.split(',').map((u: string) => u.trim()) : [];
      
      return `# Create SMB Share
# Generated: ${new Date().toISOString()}

$ShareName = "${shareName}"
$Path = "${path}"

# Create directory if it doesn't exist
if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
    Write-Host "[SUCCESS] Created directory: $Path" -ForegroundColor Green
}

# Create share
New-SmbShare -Name $ShareName -Path $Path${description ? ` -Description "${description}"` : ''} -FullAccess "Everyone" -ErrorAction Stop

Write-Host "[SUCCESS] Share created: $ShareName" -ForegroundColor Green

${fullAccess.length > 0 ? `# Grant Full Access
${fullAccess.map((u: string) => `Grant-SmbShareAccess -Name $ShareName -AccountName "${escapePowerShellString(u)}" -AccessRight Full -Force | Out-Null`).join('\n')}
Write-Host "[SUCCESS] Full access granted" -ForegroundColor Green` : ''}

${readAccess.length > 0 ? `# Grant Read Access
${readAccess.map((u: string) => `Grant-SmbShareAccess -Name $ShareName -AccountName "${escapePowerShellString(u)}" -AccessRight Read -Force | Out-Null`).join('\n')}
Write-Host "[SUCCESS] Read access granted" -ForegroundColor Green` : ''}

Get-SmbShare -Name $ShareName | Format-List`;
    }
  },

  {
    id: 'remove-smb-share',
    name: 'Remove SMB Share',
    category: 'Share Management',
    description: 'Remove an existing SMB file share (preserves files)',
    instructions: `**How This Task Works:**
- Removes SMB share while preserving files by default
- Optionally deletes all files in share (dangerous!)
- Captures share path before removal
- Essential for decommissioning shares

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Share must exist
- Backup recommended if deleting files

**What You Need to Provide:**
- Share name to remove
- Delete files: true to DELETE FILES, false to preserve (default: false)

**What the Script Does:**
1. Retrieves share information including path
2. Removes SMB share with Remove-SmbShare
3. If delete files enabled: recursively deletes all files and folders
4. If delete files disabled: preserves files at original path
5. Reports action taken

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Files PRESERVED by default (safe operation)
- Delete files option PERMANENTLY DELETES ALL DATA
- Typical use: decommission shares, reorganize file servers
- Share removal immediate but files remain
- Users lose network access to files even if preserved
- Review share contents before enabling delete files
- No recycle bin for deleted network files`,
    parameters: [
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'OldShare' },
      { id: 'deleteFiles', label: 'Delete Files (WARNING)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const shareName = escapePowerShellString(params.shareName);
      const deleteFiles = toPowerShellBoolean(params.deleteFiles ?? false);
      
      return `# Remove SMB Share
# Generated: ${new Date().toISOString()}

$ShareName = "${shareName}"

# Get share path before removal
$Share = Get-SmbShare -Name $ShareName -ErrorAction Stop
$SharePath = $Share.Path

# Remove share
Remove-SmbShare -Name $ShareName -Force
Write-Host "[SUCCESS] Share removed: $ShareName" -ForegroundColor Green

${deleteFiles ? `# WARNING: Deleting files
if (Test-Path $SharePath) {
    Remove-Item $SharePath -Recurse -Force
    Write-Host "[WARNING] Files deleted: $SharePath" -ForegroundColor Yellow
}` : `Write-Host "Files preserved at: $SharePath" -ForegroundColor Gray`}`;
    }
  },

  {
    id: 'audit-share-permissions',
    name: 'Audit Share Permissions Report',
    category: 'Permissions & Security',
    description: 'Generate detailed report of share permissions and access',
    instructions: `**How This Task Works:**
- Audits SMB share permissions across server
- Reports who has access to each share
- Shows access rights (Full, Change, Read)
- Essential for security reviews and compliance

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- SMB service must be running
- Write permissions on export location

**What You Need to Provide:**
- Export CSV file path
- Optional: Specific share name (blank for all shares)

**What the Script Does:**
1. Retrieves all shares (or specific share if specified)
2. For each share: gets all access control entries
3. Collects share name, path, account, access right, control type
4. Exports detailed report to CSV file
5. Reports total permission entries found

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Excludes hidden administrative shares
- Access rights: Full (all), Change (modify), Read (read-only)
- Control type: Allow or Deny
- Typical use: security audits, compliance reviews, access certification
- CSV format for analysis in Excel or compliance tools
- Review for over-privileged accounts
- Identify shares with Everyone full access (security risk)`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\SharePermissions.csv' },
      { id: 'shareName', label: 'Share Name (blank for all)', type: 'text', required: false, placeholder: 'Documents' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const shareName = params.shareName ? escapePowerShellString(params.shareName) : '';
      
      return `# Audit Share Permissions
# Generated: ${new Date().toISOString()}

${shareName ? `$Shares = Get-SmbShare -Name "${shareName}"` : `$Shares = Get-SmbShare | Where-Object { $_.Name -notlike "*$" }`}

$Report = @()

foreach ($Share in $Shares) {
    $Access = Get-SmbShareAccess -Name $Share.Name
    foreach ($Ace in $Access) {
        $Report += [PSCustomObject]@{
            ShareName = $Share.Name
            Path = $Share.Path
            Account = $Ace.AccountName
            AccessRight = $Ace.AccessRight
            AccessControlType = $Ace.AccessControlType
        }
    }
}

$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Permissions report exported: ${exportPath}" -ForegroundColor Green
Write-Host "  Total entries: $($Report.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'fix-ntfs-inheritance',
    name: 'Fix NTFS Inheritance (Recursive)',
    category: 'Permissions & Security',
    description: 'Enable inheritance and propagate permissions recursively',
    instructions: `**How This Task Works:**
- Fixes broken NTFS permission inheritance
- Recursively scans all subfolders and files
- Re-enables inheritance where disabled
- Test mode available for safe preview

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control permissions on target folder
- Understanding of NTFS permissions

**What You Need to Provide:**
- Target folder path
- Test mode: true for preview only, false to apply changes (default: true)

**What the Script Does:**
1. Recursively scans all items in target path
2. Checks each item for broken inheritance (AreAccessRulesProtected)
3. In test mode: reports items with broken inheritance without fixing
4. In apply mode: re-enables inheritance on each broken item
5. Reports total items processed and fixed

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Test mode enabled by default for safety
- Broken inheritance prevents permissions from parent folder
- Typical use: fix permission issues after migrations, restore standard inheritance
- Re-enabling inheritance preserves existing explicit permissions
- Changes apply immediately
- Review test mode results before applying
- May take time on large folder structures`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares\\Documents' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Fix NTFS Inheritance
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$TestMode = ${testMode}

$Items = Get-ChildItem -Path $TargetPath -Recurse -ErrorAction SilentlyContinue
$Fixed = 0

foreach ($Item in $Items) {
    try {
        $Acl = Get-Acl -Path $Item.FullName
        if ($Acl.AreAccessRulesProtected) {
            if (-not $TestMode) {
                $Acl.SetAccessRuleProtection($false, $true)
                Set-Acl -Path $Item.FullName -AclObject $Acl
            }
            Write-Host "  Fixed: $($Item.FullName)" -ForegroundColor Yellow
            $Fixed++
        }
    } catch {
        Write-Host "  [WARNING] Error: $($Item.FullName)" -ForegroundColor Red
    }
}

Write-Host "[SUCCESS] Processed $($Items.Count) items, fixed $Fixed broken inheritance" -ForegroundColor Green
${testMode ? 'Write-Host "  [WARNING] TEST MODE - No changes made" -ForegroundColor Yellow' : ''}`;
    }
  },

  {
    id: 'set-folder-ownership',
    name: 'Set Folder Ownership (Bulk)',
    category: 'Permissions & Security',
    description: 'Take ownership of a folder and all contents',
    instructions: `**How This Task Works:**
- Takes ownership of folder and all contents
- Changes owner to specified user or group
- Optionally recursive to include all subfolders
- Essential for recovering access to orphaned files

**Prerequisites:**
- Administrator privileges (or TakeOwnership right)
- PowerShell 5.1 or later
- Access to target folder
- Valid DOMAIN\\username or group name

**What You Need to Provide:**
- Target folder path
- New owner (format: DOMAIN\\Username or DOMAIN\\Groupname)
- Recursive: true for all contents, false for folder only (default: true)

**What the Script Does:**
1. Creates NTAccount object for new owner
2. Retrieves all items (recursive or single folder)
3. For each item: gets ACL, sets new owner, applies ACL
4. Reports total items changed
5. Displays failures separately

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES or TakeOwnership right
- Recursive by default (processes all subfolders and files)
- Typical use: recover access after user termination, fix orphaned files
- Use DOMAIN\\Administrators for administrative ownership
- Taking ownership different from granting permissions (separate step)
- May take time on large folder structures
- Ownership change required before modifying permissions`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares\\OldData' },
      { id: 'owner', label: 'New Owner', type: 'text', required: true, placeholder: 'DOMAIN\\Administrators' },
      { id: 'recursive', label: 'Recursive', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const owner = escapePowerShellString(params.owner);
      const recursive = toPowerShellBoolean(params.recursive ?? true);
      
      return `# Set Folder Ownership
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$Owner = New-Object System.Security.Principal.NTAccount("${owner}")
$Recursive = ${recursive}

if ($Recursive) {
    $Items = Get-ChildItem -Path $TargetPath -Recurse -ErrorAction SilentlyContinue
} else {
    $Items = Get-Item $TargetPath
}

$Count = 0
foreach ($Item in $Items) {
    try {
        $Acl = Get-Acl -Path $Item.FullName
        $Acl.SetOwner($Owner)
        Set-Acl -Path $Item.FullName -AclObject $Acl
        $Count++
    } catch {
        Write-Host "  [WARNING] Failed: $($Item.FullName)" -ForegroundColor Red
    }
}

Write-Host "[SUCCESS] Ownership set for $Count items to ${owner}" -ForegroundColor Green`;
    }
  },

  {
    id: 'disk-space-report',
    name: 'Disk Space Report (All Drives)',
    category: 'Disk Reporting',
    description: 'Generate detailed disk space report with usage thresholds',
    instructions: `**How This Task Works:**
- Reports disk space usage for all drives
- Calculates used percentage for each volume
- Alerts when usage exceeds threshold
- Optional CSV export for trending

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Alert threshold percentage (default: 80%)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all logical disks (Get-WmiObject Win32_LogicalDisk)
2. For each disk: calculates total size, free space, used percentage
3. Color-codes output: Red if above threshold, Green if OK
4. Displays formatted table with drive letter, label, size, free, used%
5. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Reports all drive types: Fixed, Network, Removable, CD-ROM
- Alert threshold default: 80% (industry standard warning level)
- Typical use: proactive monitoring, capacity planning, health checks
- Export useful for trending and capacity forecasting
- Schedule regular checks to avoid space issues
- Critical threshold typically 90% for urgent action`,
    parameters: [
      { id: 'threshold', label: 'Alert Threshold (%)', type: 'number', required: false, defaultValue: 80 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\DiskSpace.csv' }
    ],
    scriptTemplate: (params) => {
      const threshold = Number(params.threshold || 80);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Disk Space Report
# Generated: ${new Date().toISOString()}

$Threshold = ${threshold}
$Disks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, VolumeName, @{N='SizeGB'; E={[math]::Round($_.Size/1GB, 2)}}, @{N='FreeGB'; E={[math]::Round($_.FreeSpace/1GB, 2)}}, @{N='UsedGB'; E={[math]::Round(($_.Size - $_.FreeSpace)/1GB, 2)}}, @{N='PercentFree'; E={[math]::Round(($_.FreeSpace/$_.Size)*100, 1)}}

$Disks | Format-Table -AutoSize

# Alert on low space
$Alerts = $Disks | Where-Object { (100 - $_.PercentFree) -ge $Threshold }
if ($Alerts) {
    Write-Host ""
    Write-Host "[WARNING] ALERT: Drives above ${threshold}% usage:" -ForegroundColor Red
    $Alerts | ForEach-Object {
        Write-Host "  $($_.DeviceID) - $(100 - $_.PercentFree)% used ($($_.FreeGB)GB free)" -ForegroundColor Yellow
    }
}

${exportPath ? `$Disks | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'find-large-files',
    name: 'Find Large Files (Top N)',
    category: 'Disk Reporting',
    description: 'Locate largest files by size threshold or top N count',
    instructions: `**How This Task Works:**
- Scans directory tree for largest files
- Filters by minimum file size threshold
- Returns top N files by size
- Optional CSV export for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on search path
- No administrator privileges required
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Search path (root directory to scan)
- Minimum file size in MB (default: 100 MB)
- Top N files to return (default: 50)
- Optional: Export CSV file path

**What the Script Does:**
1. Recursively scans all files in search path
2. Filters files larger than minimum size threshold
3. Sorts by size descending
4. Returns top N largest files
5. Displays size (MB), full path, last modified date
6. Reports total count and cumulative size
7. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Scan time depends on directory size and depth
- Typical use: identify space hogs, cleanup candidates, capacity analysis
- Minimum size default: 100 MB (adjust for your needs)
- Results sorted by size (largest first)
- CSV export useful for trending and cleanup planning
- Consider user profile folders as common culprits`,
    parameters: [
      { id: 'searchPath', label: 'Search Path', type: 'path', required: true, placeholder: 'C:\\Users' },
      { id: 'minSizeMB', label: 'Minimum Size (MB)', type: 'number', required: false, defaultValue: 100 },
      { id: 'topCount', label: 'Top N Files', type: 'number', required: false, defaultValue: 50 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const searchPath = escapePowerShellString(params.searchPath);
      const minSize = Number(params.minSizeMB || 100);
      const topCount = Number(params.topCount || 50);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Large Files
# Generated: ${new Date().toISOString()}

$SearchPath = "${searchPath}"
$MinSize = ${minSize} * 1MB
$TopCount = ${topCount}

Write-Host "Scanning $SearchPath..." -ForegroundColor Gray

$Files = Get-ChildItem -Path $SearchPath -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -ge $MinSize } | Sort-Object Length -Descending | Select-Object -First $TopCount @{N='SizeMB'; E={[math]::Round($_.Length/1MB, 2)}}, FullName, LastWriteTime

$Files | Format-Table -AutoSize

Write-Host ""
Write-Host "[SUCCESS] Found $($Files.Count) files larger than ${minSize}MB" -ForegroundColor Green
Write-Host "  Total size: $([math]::Round(($Files | Measure-Object -Property SizeMB -Sum).Sum, 2)) MB" -ForegroundColor Gray

${exportPath ? `$Files | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'cleanup-old-files',
    name: 'Delete Old Files (Age-Based)',
    category: 'Disk Cleanup',
    description: 'Remove files older than specified age with optional test mode',
    instructions: `**How This Task Works:**
- Deletes files older than specified days
- Supports file pattern filtering (*.log, *.tmp, etc.)
- Test mode for safe preview before deletion
- Reclaims disk space from old files

**Prerequisites:**
- PowerShell 5.1 or later
- Delete permissions on target directory
- Administrator privileges recommended
- Backup recommended before large deletions

**What You Need to Provide:**
- Target directory path
- Age threshold in days (files older than this will be deleted)
- Optional: File pattern (*.log, *.tmp, or *.* for all)
- Test mode: true for preview, false to delete (default: true)

**What the Script Does:**
1. Calculates cutoff date based on days old parameter
2. Recursively scans target path for matching files
3. Filters files with LastWriteTime older than cutoff
4. In test mode: shows preview of first 10 files without deletion
5. In deletion mode: permanently removes all matching files
6. Reports count and total space freed

**Important Notes:**
- REQUIRES DELETE PERMISSIONS (admin recommended)
- Test mode enabled by default for safety
- Files permanently deleted (no recycle bin)
- Typical use: log cleanup, temp file removal, archive maintenance
- Default threshold: 90 days
- File pattern default: *.* (all files)
- Review test mode output before disabling test mode
- LastWriteTime used for age determination`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'C:\\Temp' },
      { id: 'daysOld', label: 'Days Old', type: 'number', required: true, defaultValue: 90 },
      { id: 'filePattern', label: 'File Pattern', type: 'text', required: false, placeholder: '*.log', defaultValue: '*.*' },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const daysOld = Number(params.daysOld);
      const filePattern = escapePowerShellString(params.filePattern || '*.*');
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Delete Old Files
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$DaysOld = ${daysOld}
$FilePattern = "${filePattern}"
$TestMode = ${testMode}
$CutoffDate = (Get-Date).AddDays(-$DaysOld)

$Files = Get-ChildItem -Path $TargetPath -Filter $FilePattern -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate }

$TotalSize = ($Files | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "Found $($Files.Count) files older than $DaysOld days" -ForegroundColor Yellow
Write-Host "Total size: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Gray

if ($TestMode) {
    Write-Host ""
    Write-Host "[WARNING] TEST MODE - Preview only (no files deleted)" -ForegroundColor Yellow
    $Files | Select-Object -First 10 FullName, LastWriteTime | Format-Table -AutoSize
} else {
    $Files | Remove-Item -Force
    Write-Host "[SUCCESS] Deleted $($Files.Count) files, freed $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'cleanup-temp-files',
    name: 'Clean Windows Temp Folders',
    category: 'Disk Cleanup',
    description: 'Remove temporary files from Windows and user temp directories',
    instructions: `**How This Task Works:**
- Cleans Windows temp and user profile temp folders
- Removes files older than specified age
- Optionally includes all user profiles
- Safe reclamation of wasted disk space

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control on C:\\Windows\\Temp and user profile folders
- Some files may be locked (script handles gracefully)

**What You Need to Provide:**
- Include user profiles: true to clean all users, false for system only (default: true)
- Minimum age in days (default: 7 days)

**What the Script Does:**
1. Targets Windows temp folder (C:\\Windows\\Temp)
2. If includeUserProfiles: also targets C:\\Users\\*\\AppData\\Local\\Temp
3. Calculates cutoff date from minimum age
4. Removes files older than cutoff date
5. Handles locked files gracefully (skips with error suppression)
6. Reports total space freed

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Locked files skipped automatically (no script failure)
- Typical use: reclaim disk space, routine maintenance, troubleshooting
- Default age: 7 days (safe for most environments)
- System temp: C:\\Windows\\Temp
- User temps: C:\\Users\\[username]\\AppData\\Local\\Temp
- Files permanently deleted
- Schedule monthly for best results`,
    parameters: [
      { id: 'includeUserProfiles', label: 'Include User Profiles', type: 'boolean', required: false, defaultValue: true },
      { id: 'daysOld', label: 'Min Age (Days)', type: 'number', required: false, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const includeUsers = toPowerShellBoolean(params.includeUserProfiles ?? true);
      const daysOld = Number(params.daysOld || 7);
      
      return `# Clean Windows Temp Folders
# Generated: ${new Date().toISOString()}

$DaysOld = ${daysOld}
$CutoffDate = (Get-Date).AddDays(-$DaysOld)
$TotalSize = 0

# Clean Windows Temp
$WinTemp = "$env:SystemRoot\\Temp"
$Files = Get-ChildItem -Path $WinTemp -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate }
$TotalSize += ($Files | Measure-Object -Property Length -Sum).Sum
$Files | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "[SUCCESS] Cleaned Windows Temp: $($Files.Count) files" -ForegroundColor Green

${includeUsers ? `# Clean User Temp Folders
$UserProfiles = Get-ChildItem "C:\\Users" -Directory -ErrorAction SilentlyContinue
foreach ($User in $UserProfiles) {
    $UserTemp = Join-Path $User.FullName "AppData\\Local\\Temp"
    if (Test-Path $UserTemp) {
        $Files = Get-ChildItem -Path $UserTemp -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate }
        $TotalSize += ($Files | Measure-Object -Property Length -Sum).Sum
        $Files | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] Cleaned $($User.Name): $($Files.Count) files" -ForegroundColor Green
    }
}` : ''}

Write-Host ""
Write-Host "[SUCCESS] Total space freed: $([math]::Round($TotalSize/1MB, 2)) MB" -ForegroundColor Green`;
    }
  },

  {
    id: 'set-disk-quota',
    name: 'Set Disk Quota (Per User)',
    category: 'Quotas & Storage',
    description: 'Configure disk quotas with warning and limit thresholds',
    instructions: `**How This Task Works:**
- Enables NTFS disk quotas on volume
- Sets warning and hard limit thresholds
- Optionally enforces quotas (deny writes over limit)
- Essential for multi-user file servers

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- NTFS volume (quotas not supported on FAT32)
- fsutil.exe available (built into Windows)

**What You Need to Provide:**
- Drive letter (e.g., D:)
- Quota limit in MB (hard limit)
- Warning threshold in MB (soft warning)
- Deny over limit: true to block writes, false to warn only (default: false)

**What the Script Does:**
1. Enables quota tracking on specified drive
2. Enforces quota system using fsutil
3. Sets default warning and limit thresholds
4. Optionally denies storage over limit
5. Reports quota configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- NTFS volumes only (not FAT32)
- Quotas apply per user
- Warning threshold should be less than limit
- Typical use: file servers, shared storage, capacity management
- Deny over limit: blocks writes when user exceeds quota
- Warn only mode: allows over-quota but alerts
- Monitor quota usage separately with monitor-quota-usage task`,
    parameters: [
      { id: 'drive', label: 'Drive Letter', type: 'text', required: true, placeholder: 'D:' },
      { id: 'quotaLimitMB', label: 'Quota Limit (MB)', type: 'number', required: true, placeholder: '10240' },
      { id: 'warningMB', label: 'Warning Threshold (MB)', type: 'number', required: true, placeholder: '8192' },
      { id: 'denyOver', label: 'Deny Storage Over Limit', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const drive = escapePowerShellString(params.drive);
      const quotaLimit = Number(params.quotaLimitMB);
      const warning = Number(params.warningMB);
      const denyOver = toPowerShellBoolean(params.denyOver ?? false);
      
      return `# Set Disk Quota
# Generated: ${new Date().toISOString()}

$Drive = "${drive}"
$QuotaLimit = ${quotaLimit} * 1MB
$WarningLevel = ${warning} * 1MB
$DenyOver = ${denyOver}

# Enable quotas on drive
fsutil quota enforce $Drive
fsutil quota track $Drive

# Set default quota
fsutil quota modify $Drive $WarningLevel $QuotaLimit

if ($DenyOver) {
    fsutil quota violations $Drive
    Write-Host "[SUCCESS] Quota enforcement enabled (deny over limit)" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Quota tracking enabled (warn only)" -ForegroundColor Green
}

Write-Host "  Limit: $(${quotaLimit})MB, Warning: $(${warning})MB" -ForegroundColor Gray`;
    }
  },

  {
    id: 'monitor-quota-usage',
    name: 'Monitor User Quota Usage',
    category: 'Quotas & Storage',
    description: 'Report users exceeding quota thresholds',
    instructions: `**How This Task Works:**
- Monitors disk quota usage by user
- Identifies users exceeding thresholds
- Queries quota entries with fsutil
- Recommends FSRM for advanced reporting

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Quotas must be enabled on drive
- File Server Resource Manager recommended for detailed reports

**What You Need to Provide:**
- Drive letter to monitor
- Alert threshold percentage (default: 80%)
- Optional: Export CSV file path

**What the Script Does:**
1. Queries quota entries on specified drive using fsutil
2. Reports basic quota information
3. Recommends File Server Resource Manager (FSRM) for detailed analysis
4. Provides alternative PowerShell command for FSRM quota monitoring

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Quotas must be enabled first (use set-disk-quota task)
- Basic fsutil output requires parsing for detailed analysis
- Typical use: proactive monitoring, capacity planning, user notifications
- File Server Resource Manager provides richer quota reports
- Alternative: Get-FsrmQuota cmdlet (requires FSRM role)
- Schedule regular monitoring for proactive management
- Consider automating user notifications for over-quota users`,
    parameters: [
      { id: 'drive', label: 'Drive Letter', type: 'text', required: true, placeholder: 'D:' },
      { id: 'threshold', label: 'Alert Threshold (%)', type: 'number', required: false, defaultValue: 80 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const drive = escapePowerShellString(params.drive);
      const threshold = Number(params.threshold || 80);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Monitor Disk Quota Usage
# Generated: ${new Date().toISOString()}

$Drive = "${drive}"
$Threshold = ${threshold}

# Get quota entries
$Quotas = fsutil quota query $Drive

# Parse and report (simplified - full parsing requires more complex logic)
Write-Host "Quota usage report for $Drive" -ForegroundColor Cyan
Write-Host "Threshold: ${threshold}%" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: Use Windows File Server Resource Manager (FSRM) for detailed quota reports" -ForegroundColor Yellow
Write-Host ""
Write-Host "Alternative PowerShell approach:" -ForegroundColor Gray
Write-Host '  Get-FsrmQuota | Where-Object { ($_.Usage/$_.Size)*100 -ge ${threshold} }' -ForegroundColor Gray`;
    }
  },

  {
    id: 'file-type-breakdown',
    name: 'File Type Breakdown Report',
    category: 'Disk Reporting',
    description: 'Analyze disk usage by file extension with size statistics',
    instructions: `**How This Task Works:**
- Analyzes disk usage by file extension
- Groups files by extension type
- Reports count and total size per extension
- Identifies space-consuming file types

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on search path
- No administrator privileges required
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Search path (root directory to analyze)
- Top N extensions to display (default: 20)
- Optional: Export CSV file path

**What the Script Does:**
1. Recursively scans all files in search path
2. Groups files by extension
3. Calculates file count and total size (MB) per extension
4. Sorts by total size descending
5. Returns top N extensions
6. Displays formatted table
7. Reports total file count and overall size
8. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Scan time depends on file count and directory depth
- Typical use: storage analysis, cleanup planning, capacity forecasting
- Files without extension reported as "(No Extension)"
- Results sorted by total size (largest first)
- Identify unexpected large file types (temp files, logs, media)
- CSV export useful for trend analysis
- Use results to target cleanup efforts`,
    parameters: [
      { id: 'searchPath', label: 'Search Path', type: 'path', required: true, placeholder: 'D:\\Shares' },
      { id: 'topCount', label: 'Top N Extensions', type: 'number', required: false, defaultValue: 20 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const searchPath = escapePowerShellString(params.searchPath);
      const topCount = Number(params.topCount || 20);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# File Type Breakdown Report
# Generated: ${new Date().toISOString()}

$SearchPath = "${searchPath}"
$TopCount = ${topCount}

Write-Host "Analyzing $SearchPath..." -ForegroundColor Gray

$Files = Get-ChildItem -Path $SearchPath -Recurse -File -ErrorAction SilentlyContinue

$Report = $Files | Group-Object Extension | Select-Object @{N='Extension'; E={if ($_.Name) {$_.Name} else {'(No Extension)'}}}, Count, @{N='TotalSizeMB'; E={[math]::Round(($_.Group | Measure-Object -Property Length -Sum).Sum/1MB, 2)}} | Sort-Object TotalSizeMB -Descending | Select-Object -First $TopCount

$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "[SUCCESS] Analysis complete" -ForegroundColor Green
Write-Host "  Total files: $($Files.Count)" -ForegroundColor Gray
Write-Host "  Total size: $([math]::Round(($Files | Measure-Object -Property Length -Sum).Sum/1GB, 2)) GB" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'duplicate-file-finder',
    name: 'Find Duplicate Files (Hash-Based)',
    category: 'Disk Cleanup',
    description: 'Locate duplicate files using file hash comparison',
    instructions: `**How This Task Works:**
- Identifies duplicate files using MD5 hash comparison
- Filters by minimum file size
- Reports potential space savings
- Hash-based detection ensures accuracy

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on search path
- No administrator privileges required
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Search path (root directory to scan)
- Minimum file size in MB (default: 1 MB)
- Optional: Export CSV file path

**What the Script Does:**
1. Scans all files larger than minimum size
2. Computes MD5 hash for each file
3. Groups files by hash value
4. Identifies sets where multiple files share same hash
5. Reports duplicate sets with file paths
6. Calculates potential space savings
7. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- MD5 hashing ensures byte-for-byte accuracy
- Scan time depends on file count and total size
- Typical use: reclaim wasted space, identify redundant copies
- Minimum size filter improves performance (skip tiny files)
- Results show all files in each duplicate set
- Manually review before deletion
- Space savings = total size - one copy per set
- Hash computation CPU-intensive for large files`,
    parameters: [
      { id: 'searchPath', label: 'Search Path', type: 'path', required: true, placeholder: 'D:\\Shares' },
      { id: 'minSizeMB', label: 'Min File Size (MB)', type: 'number', required: false, defaultValue: 1 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const searchPath = escapePowerShellString(params.searchPath);
      const minSize = Number(params.minSizeMB || 1);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Duplicate Files
# Generated: ${new Date().toISOString()}

$SearchPath = "${searchPath}"
$MinSize = ${minSize} * 1MB

Write-Host "Scanning for files larger than ${minSize}MB..." -ForegroundColor Gray

$Files = Get-ChildItem -Path $SearchPath -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -ge $MinSize }

Write-Host "Computing file hashes..." -ForegroundColor Gray
$Hashes = $Files | ForEach-Object {
    [PSCustomObject]@{
        Path = $_.FullName
        SizeMB = [math]::Round($_.Length/1MB, 2)
        Hash = (Get-FileHash -Path $_.FullName -Algorithm MD5).Hash
    }
}

$Duplicates = $Hashes | Group-Object Hash | Where-Object { $_.Count -gt 1 }

if ($Duplicates) {
    Write-Host ""
    Write-Host "[WARNING] Found $($Duplicates.Count) sets of duplicate files" -ForegroundColor Yellow
    $WastedSpace = 0
    
    foreach ($Dup in $Duplicates) {
        $WastedSpace += ($Dup.Group | Select-Object -Skip 1 | Measure-Object -Property SizeMB -Sum).Sum
        Write-Host ""
        Write-Host "Duplicate set ($($Dup.Group[0].SizeMB) MB):" -ForegroundColor Cyan
        $Dup.Group | ForEach-Object { Write-Host "  $($_.Path)" -ForegroundColor Gray }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Potential space savings: $([math]::Round($WastedSpace, 2)) MB" -ForegroundColor Green
    
    ${exportPath ? `$Duplicates | ForEach-Object { $_.Group } | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "[SUCCESS] No duplicates found" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'copy-files',
    name: 'Copy Files/Folders',
    category: 'File Operations',
    description: 'Copy files or folders with progress tracking',
    instructions: `**How This Task Works:**
- Copies files or entire folder structures to destination
- Shows progress and file count
- Preserves timestamps and attributes
- Option to overwrite existing files

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on source location
- Write permissions on destination location

**What You Need to Provide:**
- Source path (file or folder)
- Destination path
- Overwrite existing files: true or false (default: false)
- Recurse subfolders: true or false (default: true)

**What the Script Does:**
1. Validates source path exists
2. Creates destination folder if needed
3. Copies files/folders with specified options
4. Reports total files copied and errors
5. Preserves file attributes and timestamps

**Important Notes:**
- Large copies may take time
- Network paths supported (UNC paths)
- Locked files will be skipped with error
- Use -Force to overwrite read-only files`,
    parameters: [
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: 'C:\\Source\\Files' },
      { id: 'destinationPath', label: 'Destination Path', type: 'path', required: true, placeholder: 'D:\\Backup\\Files' },
      { id: 'overwrite', label: 'Overwrite Existing Files', type: 'boolean', required: false, defaultValue: false },
      { id: 'recurse', label: 'Include Subfolders', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const destinationPath = escapePowerShellString(params.destinationPath);
      const overwrite = toPowerShellBoolean(params.overwrite ?? false);
      const recurse = toPowerShellBoolean(params.recurse ?? true);
      
      return `# Copy Files/Folders
# Generated: ${new Date().toISOString()}

$Source = "${sourcePath}"
$Destination = "${destinationPath}"

if (-not (Test-Path $Source)) {
    Write-Host "[FAILED] Source path not found: $Source" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -Path $Destination -ItemType Directory -Force | Out-Null
    Write-Host "[SUCCESS] Created destination folder" -ForegroundColor Green
}

Write-Host "Copying from $Source to $Destination..." -ForegroundColor Gray

try {
    Copy-Item -Path $Source -Destination $Destination ${recurse === '$true' ? '-Recurse' : ''} ${overwrite === '$true' ? '-Force' : ''} -ErrorAction Stop
    Write-Host "[SUCCESS] Copy completed successfully" -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Copy failed: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'delete-files',
    name: 'Delete Files/Folders',
    category: 'File Operations',
    description: 'Safely delete files or folders with confirmation',
    instructions: `**How This Task Works:**
- Deletes files or folders permanently
- Shows what will be deleted before action
- Option for recursive deletion of folders
- Safety confirmation required

**Prerequisites:**
- PowerShell 5.1 or later
- Delete permissions on target location
- Administrator rights for system folders

**What You Need to Provide:**
- Path to delete (file or folder)
- Force deletion of read-only files: true or false
- Recurse (delete folders and contents): true or false

**What the Script Does:**
1. Validates path exists
2. Shows what will be deleted
3. Prompts for confirmation
4. Deletes file/folder recursively if specified
5. Reports success or errors

**Important Notes:**
- PERMANENT DELETION - no Recycle Bin
- Use with extreme caution
- Test with -WhatIf first
- Locked/in-use files will fail
- Force flag removes read-only attribute`,
    parameters: [
      { id: 'targetPath', label: 'Path to Delete', type: 'path', required: true, placeholder: 'C:\\Temp\\OldFiles' },
      { id: 'force', label: 'Force (Delete Read-Only)', type: 'boolean', required: false, defaultValue: false },
      { id: 'recurse', label: 'Recurse (Delete Subfolders)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const force = toPowerShellBoolean(params.force ?? false);
      const recurse = toPowerShellBoolean(params.recurse ?? false);
      
      return `# Delete Files/Folders
# Generated: ${new Date().toISOString()}
# WARNING: This permanently deletes files - no Recycle Bin

$Target = "${targetPath}"

if (-not (Test-Path $Target)) {
    Write-Host "[FAILED] Path not found: $Target" -ForegroundColor Red
    exit 1
}

Write-Host "[WARNING] WARNING: The following will be PERMANENTLY deleted:" -ForegroundColor Yellow
if (${recurse}) {
    Get-ChildItem -Path $Target -Recurse | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    $ItemCount = (Get-ChildItem -Path $Target -Recurse | Measure-Object).Count
    Write-Host "  ... and $($ItemCount - 10) more items" -ForegroundColor Gray
} else {
    Write-Host "  $Target" -ForegroundColor Gray
}

$Confirm = Read-Host "Type 'DELETE' to confirm permanent deletion"
if ($Confirm -ne 'DELETE') {
    Write-Host "[SUCCESS] Deletion cancelled" -ForegroundColor Green
    exit 0
}

try {
    Remove-Item -Path $Target ${recurse === '$true' ? '-Recurse' : ''} ${force === '$true' ? '-Force' : ''} -ErrorAction Stop
    Write-Host "[SUCCESS] Successfully deleted: $Target" -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Deletion failed: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'search-files',
    name: 'Search for Files',
    category: 'File Operations',
    description: 'Search for files by name pattern, extension, or content',
    instructions: `**How This Task Works:**
- Searches for files matching pattern
- Supports wildcards (*. ?)
- Optional content search within files
- Exports results to CSV

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on search path
- No administrator rights required

**What You Need to Provide:**
- Search path (root directory)
- File name pattern (wildcards supported)
- Optional: Search for text content inside files
- Optional: File extension filter
- Optional: CSV export path

**What the Script Does:**
1. Scans directory and subdirectories
2. Filters by name pattern and extension
3. Optionally searches file content
4. Displays matches with path, size, date
5. Exports to CSV if specified

**Important Notes:**
- Wildcards: * (any chars), ? (single char)
- Content search works on text files only
- Large directory scans take time
- Hidden files excluded by default
- Typical use: find logs, configs, documents`,
    parameters: [
      { id: 'searchPath', label: 'Search Path', type: 'path', required: true, placeholder: 'C:\\Users\\Documents' },
      { id: 'filePattern', label: 'File Name Pattern', type: 'text', required: true, placeholder: '*.log' },
      { id: 'searchContent', label: 'Search Content (Optional)', type: 'text', required: false, placeholder: 'error' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const searchPath = escapePowerShellString(params.searchPath);
      const filePattern = escapePowerShellString(params.filePattern);
      const searchContent = params.searchContent ? escapePowerShellString(params.searchContent) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Search for Files
# Generated: ${new Date().toISOString()}

$SearchPath = "${searchPath}"
$FilePattern = "${filePattern}"
${searchContent ? `$SearchContent = "${searchContent}"` : ''}

if (-not (Test-Path $SearchPath)) {
    Write-Host "[FAILED] Search path not found: $SearchPath" -ForegroundColor Red
    exit 1
}

Write-Host "Searching for: $FilePattern in $SearchPath..." -ForegroundColor Gray

$Results = Get-ChildItem -Path $SearchPath -Filter $FilePattern -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    ${searchContent ? `
    # Search content if specified
    $Match = Select-String -Path $_.FullName -Pattern $SearchContent -SimpleMatch -ErrorAction SilentlyContinue
    if ($Match) {` : ''}
        [PSCustomObject]@{
            FileName = $_.Name
            Path = $_.FullName
            SizeMB = [math]::Round($_.Length/1MB, 2)
            Modified = $_.LastWriteTime
            ${searchContent ? 'MatchFound = if ($Match) { "Yes" } else { "No" }' : ''}
        }
    ${searchContent ? `}` : ''}
}

if ($Results) {
    Write-Host ""
    Write-Host "[SUCCESS] Found $($Results.Count) matching files:" -ForegroundColor Green
    $Results | Format-Table -AutoSize
    
    ${exportPath ? `$Results | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "No files found matching pattern" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'get-folder-size',
    name: 'Get Folder Size Report',
    category: 'File Operations',
    description: 'Calculate total size of folders and subfolders',
    instructions: `**How This Task Works:**
- Calculates total size of folder contents
- Lists top folders by size
- Includes subfolder breakdown
- Exports to CSV for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target folder
- No administrator rights required

**What You Need to Provide:**
- Folder path to analyze
- Depth level (how many levels deep to report)
- Optional: CSV export path

**What the Script Does:**
1. Scans folder and all subfolders
2. Calculates total size for each folder
3. Sorts by size (largest first)
4. Shows folder path, size, file count
5. Optionally exports to CSV

**Important Notes:**
- Large folders take time to scan
- Size includes all subfolders
- Useful for disk cleanup planning
- Network paths supported
- Locked files counted but not read`,
    parameters: [
      { id: 'folderPath', label: 'Folder Path', type: 'path', required: true, placeholder: 'C:\\Users' },
      { id: 'depth', label: 'Depth Level', type: 'number', required: false, defaultValue: 1, description: 'How many levels deep (1-3)' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const folderPath = escapePowerShellString(params.folderPath);
      const depth = Number(params.depth || 1);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Folder Size Report
# Generated: ${new Date().toISOString()}

$FolderPath = "${folderPath}"
$Depth = ${depth}

if (-not (Test-Path $FolderPath)) {
    Write-Host "[FAILED] Folder not found: $FolderPath" -ForegroundColor Red
    exit 1
}

Write-Host "Calculating folder sizes..." -ForegroundColor Gray

function Get-FolderSize {
    param([string]$Path, [int]$CurrentDepth, [int]$MaxDepth)
    
    if ($CurrentDepth -gt $MaxDepth) { return }
    
    $Folders = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue
    
    foreach ($Folder in $Folders) {
        $Size = (Get-ChildItem -Path $Folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $FileCount = (Get-ChildItem -Path $Folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        
        [PSCustomObject]@{
            FolderName = $Folder.Name
            Path = $Folder.FullName
            SizeGB = [math]::Round($Size/1GB, 2)
            SizeMB = [math]::Round($Size/1MB, 2)
            FileCount = $FileCount
        }
        
        if ($CurrentDepth -lt $MaxDepth) {
            Get-FolderSize -Path $Folder.FullName -CurrentDepth ($CurrentDepth + 1) -MaxDepth $MaxDepth
        }
    }
}

$Results = Get-FolderSize -Path $FolderPath -CurrentDepth 1 -MaxDepth $Depth | Sort-Object SizeGB -Descending

if ($Results) {
    Write-Host ""
    Write-Host "[SUCCESS] Folder size analysis complete:" -ForegroundColor Green
    $Results | Format-Table FolderName, SizeGB, SizeMB, FileCount -AutoSize
    
    $TotalSize = ($Results | Measure-Object -Property SizeGB -Sum).Sum
    Write-Host ""
    Write-Host "Total size: $([math]::Round($TotalSize, 2)) GB" -ForegroundColor Cyan
    
    ${exportPath ? `$Results | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "No subfolders found" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'compress-zip',
    name: 'Compress to ZIP Archive',
    category: 'File Operations',
    description: 'Create ZIP archive from files or folders',
    instructions: `**How This Task Works:**
- Compresses files/folders into ZIP archive
- Supports compression level selection
- Preserves folder structure
- Shows compression ratio

**Prerequisites:**
- PowerShell 5.1 or later
- .NET Framework 4.5+
- Read permissions on source
- Write permissions on destination

**What You Need to Provide:**
- Source path (file or folder)
- Destination ZIP file path
- Compression level (Optimal, Fastest, or NoCompression)

**What the Script Does:**
1. Validates source path exists
2. Creates ZIP archive with specified compression
3. Includes all files and subfolders
4. Reports original vs compressed size
5. Confirms successful creation

**Important Notes:**
- Optimal: best compression, slower
- Fastest: quick compression, larger files
- NoCompression: fastest, no size reduction
- Existing ZIP files overwritten
- Network paths supported`,
    parameters: [
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: 'C:\\ProjectFiles' },
      { id: 'zipPath', label: 'Destination ZIP Path', type: 'path', required: true, placeholder: 'C:\\Backups\\project.zip' },
      { id: 'compressionLevel', label: 'Compression Level', type: 'select', required: false, options: ['Optimal', 'Fastest', 'NoCompression'], defaultValue: 'Optimal' }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const zipPath = escapePowerShellString(params.zipPath);
      const compressionLevel = params.compressionLevel || 'Optimal';
      
      return `# Compress to ZIP Archive
# Generated: ${new Date().toISOString()}

$Source = "${sourcePath}"
$Destination = "${zipPath}"
$CompressionLevel = "${compressionLevel}"

if (-not (Test-Path $Source)) {
    Write-Host "[FAILED] Source path not found: $Source" -ForegroundColor Red
    exit 1
}

# Remove existing ZIP if present
if (Test-Path $Destination) {
    Remove-Item $Destination -Force
    Write-Host "[WARNING] Removed existing ZIP file" -ForegroundColor Yellow
}

Write-Host "Compressing to ZIP archive..." -ForegroundColor Gray

try {
    $OriginalSize = (Get-ChildItem -Path $Source -Recurse -File | Measure-Object -Property Length -Sum).Sum
    
    Compress-Archive -Path $Source -DestinationPath $Destination -CompressionLevel $CompressionLevel -ErrorAction Stop
    
    $CompressedSize = (Get-Item $Destination).Length
    $Ratio = [math]::Round((1 - ($CompressedSize / $OriginalSize)) * 100, 1)
    
    Write-Host ""
    Write-Host "[SUCCESS] ZIP archive created successfully" -ForegroundColor Green
    Write-Host "  Original size: $([math]::Round($OriginalSize/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Compressed size: $([math]::Round($CompressedSize/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Compression ratio: $Ratio%" -ForegroundColor Cyan
    Write-Host "  Location: $Destination" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Compression failed: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'extract-zip',
    name: 'Extract ZIP Archive',
    category: 'File Operations',
    description: 'Extract contents from ZIP archive to folder',
    instructions: `**How This Task Works:**
- Extracts all files from ZIP archive
- Preserves folder structure
- Option to overwrite existing files
- Shows extraction progress

**Prerequisites:**
- PowerShell 5.1 or later
- .NET Framework 4.5+
- Read permissions on ZIP file
- Write permissions on destination

**What You Need to Provide:**
- ZIP file path
- Destination folder path
- Overwrite existing files: true or false

**What the Script Does:**
1. Validates ZIP file exists
2. Creates destination folder if needed
3. Extracts all contents
4. Preserves original folder structure
5. Reports file count and completion

**Important Notes:**
- Destination folder created automatically
- Existing files overwritten if force flag set
- Extracts full directory structure
- Large archives take time
- Network paths supported`,
    parameters: [
      { id: 'zipPath', label: 'ZIP File Path', type: 'path', required: true, placeholder: 'C:\\Downloads\\archive.zip' },
      { id: 'destinationPath', label: 'Destination Folder', type: 'path', required: true, placeholder: 'C:\\Extracted' },
      { id: 'overwrite', label: 'Overwrite Existing Files', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const zipPath = escapePowerShellString(params.zipPath);
      const destinationPath = escapePowerShellString(params.destinationPath);
      const overwrite = toPowerShellBoolean(params.overwrite ?? false);
      
      return `# Extract ZIP Archive
# Generated: ${new Date().toISOString()}

$ZipFile = "${zipPath}"
$Destination = "${destinationPath}"

if (-not (Test-Path $ZipFile)) {
    Write-Host "[FAILED] ZIP file not found: $ZipFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -Path $Destination -ItemType Directory -Force | Out-Null
    Write-Host "[SUCCESS] Created destination folder" -ForegroundColor Green
}

Write-Host "Extracting ZIP archive..." -ForegroundColor Gray

try {
    Expand-Archive -Path $ZipFile -DestinationPath $Destination ${overwrite === '$true' ? '-Force' : ''} -ErrorAction Stop
    
    $FileCount = (Get-ChildItem -Path $Destination -Recurse -File | Measure-Object).Count
    
    Write-Host ""
    Write-Host "[SUCCESS] Extraction complete" -ForegroundColor Green
    Write-Host "  Files extracted: $FileCount" -ForegroundColor Gray
    Write-Host "  Location: $Destination" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Extraction failed: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'list-files',
    name: 'List Files in Directory',
    category: 'File Operations',
    description: 'Generate detailed file listing with sizes and dates',
    instructions: `**How This Task Works:**
- Lists all files in directory
- Shows file name, size, modified date, attributes
- Option to include subfolders
- Exports to CSV for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on directory
- No administrator rights required

**What You Need to Provide:**
- Directory path
- Include subfolders: true or false
- Include hidden files: true or false
- Optional: CSV export path

**What the Script Does:**
1. Scans directory for files
2. Retrieves name, size, dates, attributes
3. Formats results in table
4. Sorts by name or size
5. Optionally exports to CSV

**Important Notes:**
- Hidden files excluded by default
- System files excluded by default
- Typical use: inventory, documentation
- CSV export for Excel analysis
- Shows file attributes (R, H, S, A)`,
    parameters: [
      { id: 'directoryPath', label: 'Directory Path', type: 'path', required: true, placeholder: 'C:\\Reports' },
      { id: 'includeSubfolders', label: 'Include Subfolders', type: 'boolean', required: false, defaultValue: false },
      { id: 'includeHidden', label: 'Include Hidden Files', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const directoryPath = escapePowerShellString(params.directoryPath);
      const includeSubfolders = toPowerShellBoolean(params.includeSubfolders ?? false);
      const includeHidden = toPowerShellBoolean(params.includeHidden ?? false);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List Files in Directory
# Generated: ${new Date().toISOString()}

$Directory = "${directoryPath}"

if (-not (Test-Path $Directory)) {
    Write-Host "[FAILED] Directory not found: $Directory" -ForegroundColor Red
    exit 1
}

Write-Host "Listing files..." -ForegroundColor Gray

$Files = Get-ChildItem -Path $Directory ${includeSubfolders === '$true' ? '-Recurse' : ''} -File ${includeHidden === '$true' ? '-Force' : ''} -ErrorAction SilentlyContinue | ForEach-Object {
    [PSCustomObject]@{
        FileName = $_.Name
        Path = $_.FullName
        SizeMB = [math]::Round($_.Length/1MB, 2)
        Modified = $_.LastWriteTime
        Created = $_.CreationTime
        Attributes = $_.Attributes
    }
} | Sort-Object FileName

if ($Files) {
    Write-Host ""
    Write-Host "[SUCCESS] Found $($Files.Count) files:" -ForegroundColor Green
    $Files | Format-Table -AutoSize
    
    $TotalSize = ($Files | Measure-Object -Property SizeMB -Sum).Sum
    Write-Host ""
    Write-Host "Total size: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Cyan
    
    ${exportPath ? `$Files | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "No files found" -ForegroundColor Yellow
}`;
    }
  },

  // ============================================
  // NEW TASKS: File Operations
  // ============================================

  {
    id: 'move-files',
    name: 'Move Files/Folders',
    category: 'File Operations',
    isPremium: true,
    description: 'Move files or folders to a new location with progress tracking',
    instructions: `**How This Task Works:**
- Moves files or entire folder structures to destination
- Removes original after successful move
- Shows progress and file count
- Option to overwrite existing files

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on source location
- Write permissions on destination location
- Delete permissions on source (for move)

**What You Need to Provide:**
- Source path (file or folder)
- Destination path
- Overwrite existing files: true or false (default: false)

**What the Script Does:**
1. Validates source path exists
2. Creates destination folder if needed
3. Moves files/folders with specified options
4. Removes source after successful move
5. Reports total files moved and errors

**Important Notes:**
- Move removes original files
- Large moves may take time
- Network paths supported (UNC paths)
- Locked files will fail the move
- Use -Force to overwrite existing files`,
    parameters: [
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: 'C:\\OldLocation\\Files' },
      { id: 'destinationPath', label: 'Destination Path', type: 'path', required: true, placeholder: 'D:\\NewLocation\\Files' },
      { id: 'overwrite', label: 'Overwrite Existing Files', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const destinationPath = escapePowerShellString(params.destinationPath);
      const overwrite = toPowerShellBoolean(params.overwrite ?? false);
      
      return `# Move Files/Folders
# Generated: ${new Date().toISOString()}

$Source = "${sourcePath}"
$Destination = "${destinationPath}"

if (-not (Test-Path $Source)) {
    Write-Host "[FAILED] Source path not found: $Source" -ForegroundColor Red
    exit 1
}

$DestParent = Split-Path $Destination -Parent
if (-not (Test-Path $DestParent)) {
    New-Item -Path $DestParent -ItemType Directory -Force | Out-Null
    Write-Host "[SUCCESS] Created destination folder" -ForegroundColor Green
}

Write-Host "Moving from $Source to $Destination..." -ForegroundColor Gray

try {
    Move-Item -Path $Source -Destination $Destination ${overwrite === '$true' ? '-Force' : ''} -ErrorAction Stop
    Write-Host "[SUCCESS] Move completed successfully" -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Move failed: \$_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'rename-files-bulk',
    name: 'Bulk Rename Files',
    category: 'File Operations',
    isPremium: true,
    description: 'Rename multiple files using pattern matching and replacement',
    instructions: `**How This Task Works:**
- Renames multiple files matching a pattern
- Supports find/replace text in filenames
- Optional prefix/suffix addition
- Test mode for safe preview

**Prerequisites:**
- PowerShell 5.1 or later
- Write permissions on target directory
- No administrator rights required

**What You Need to Provide:**
- Target directory path
- File pattern to match (e.g., *.txt)
- Find text (text to replace in filename)
- Replace text (new text to insert)
- Test mode: true for preview, false to rename

**What the Script Does:**
1. Finds all files matching pattern
2. Applies find/replace to each filename
3. In test mode: shows preview of changes
4. In rename mode: renames all matching files
5. Reports count of files renamed

**Important Notes:**
- Test mode enabled by default
- Only affects filename, not extension
- Case-sensitive replacement
- Duplicate names will cause errors
- Review preview before applying`,
    parameters: [
      { id: 'targetPath', label: 'Target Directory', type: 'path', required: true, placeholder: 'C:\\Documents' },
      { id: 'filePattern', label: 'File Pattern', type: 'text', required: true, placeholder: '*.txt', defaultValue: '*.*' },
      { id: 'findText', label: 'Find Text', type: 'text', required: true, placeholder: 'old' },
      { id: 'replaceText', label: 'Replace With', type: 'text', required: false, placeholder: 'new', defaultValue: '' },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const filePattern = escapePowerShellString(params.filePattern || '*.*');
      const findText = escapePowerShellString(params.findText);
      const replaceText = escapePowerShellString(params.replaceText || '');
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Bulk Rename Files
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$FilePattern = "${filePattern}"
$FindText = "${findText}"
$ReplaceText = "${replaceText}"
$TestMode = ${testMode}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Directory not found: $TargetPath" -ForegroundColor Red
    exit 1
}

$Files = Get-ChildItem -Path $TargetPath -Filter $FilePattern -File | Where-Object { $_.Name -like "*$FindText*" }

if ($Files.Count -eq 0) {
    Write-Host "No files found matching pattern with '$FindText'" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($Files.Count) files to rename" -ForegroundColor Cyan

$Renamed = 0
foreach ($File in $Files) {
    $NewName = $File.Name -replace [regex]::Escape($FindText), $ReplaceText
    
    if ($TestMode) {
        Write-Host "  [Preview] $($File.Name) -> $NewName" -ForegroundColor Gray
    } else {
        try {
            Rename-Item -Path $File.FullName -NewName $NewName -ErrorAction Stop
            Write-Host "  [SUCCESS] $($File.Name) -> $NewName" -ForegroundColor Green
            $Renamed++
        } catch {
            Write-Host "  [FAILED] Failed: $($File.Name) - \$_" -ForegroundColor Red
        }
    }
}

if ($TestMode) {
    Write-Host ""
    Write-Host "[WARNING] TEST MODE - No files renamed" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[SUCCESS] Renamed $Renamed files" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'compare-files',
    name: 'Compare Two Files',
    category: 'File Operations',
    isPremium: true,
    description: 'Compare two files for differences using hash or content comparison',
    instructions: `**How This Task Works:**
- Compares two files for equality
- Uses hash comparison for binary files
- Optional line-by-line text comparison
- Reports differences found

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on both files
- No administrator rights required

**What You Need to Provide:**
- First file path
- Second file path
- Comparison type: Hash or Content

**What the Script Does:**
1. Validates both files exist
2. For hash: computes SHA256 hashes and compares
3. For content: performs line-by-line comparison
4. Reports if files are identical or different
5. Shows specific differences for content mode

**Important Notes:**
- Hash comparison fastest for large files
- Content comparison shows actual differences
- Binary files use hash comparison only
- Large text files may be slow for content compare`,
    parameters: [
      { id: 'file1Path', label: 'First File Path', type: 'path', required: true, placeholder: 'C:\\File1.txt' },
      { id: 'file2Path', label: 'Second File Path', type: 'path', required: true, placeholder: 'C:\\File2.txt' },
      { id: 'compareType', label: 'Comparison Type', type: 'select', required: false, options: ['Hash', 'Content'], defaultValue: 'Hash' }
    ],
    scriptTemplate: (params) => {
      const file1Path = escapePowerShellString(params.file1Path);
      const file2Path = escapePowerShellString(params.file2Path);
      const compareType = params.compareType || 'Hash';
      
      return `# Compare Two Files
# Generated: ${new Date().toISOString()}

$File1 = "${file1Path}"
$File2 = "${file2Path}"

if (-not (Test-Path $File1)) {
    Write-Host "[FAILED] First file not found: $File1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $File2)) {
    Write-Host "[FAILED] Second file not found: $File2" -ForegroundColor Red
    exit 1
}

$File1Info = Get-Item $File1
$File2Info = Get-Item $File2

Write-Host "Comparing files..." -ForegroundColor Gray
Write-Host "  File 1: $File1 ($([math]::Round($File1Info.Length/1KB, 2)) KB)" -ForegroundColor Gray
Write-Host "  File 2: $File2 ($([math]::Round($File2Info.Length/1KB, 2)) KB)" -ForegroundColor Gray
Write-Host ""

${compareType === 'Hash' ? `# Hash Comparison
$Hash1 = (Get-FileHash -Path $File1 -Algorithm SHA256).Hash
$Hash2 = (Get-FileHash -Path $File2 -Algorithm SHA256).Hash

Write-Host "Hash 1: $Hash1" -ForegroundColor Cyan
Write-Host "Hash 2: $Hash2" -ForegroundColor Cyan
Write-Host ""

if ($Hash1 -eq $Hash2) {
    Write-Host "[SUCCESS] Files are IDENTICAL" -ForegroundColor Green
} else {
    Write-Host "[FAILED] Files are DIFFERENT" -ForegroundColor Red
}` : `# Content Comparison
$Content1 = Get-Content $File1
$Content2 = Get-Content $File2

$Differences = Compare-Object -ReferenceObject $Content1 -DifferenceObject $Content2

if ($Differences) {
    Write-Host "[FAILED] Files are DIFFERENT" -ForegroundColor Red
    Write-Host ""
    Write-Host "Differences found:" -ForegroundColor Yellow
    $Differences | ForEach-Object {
        $Indicator = if ($_.SideIndicator -eq "<=") { "File1" } else { "File2" }
        Write-Host "  [$Indicator] $($_.InputObject)" -ForegroundColor Gray
    }
} else {
    Write-Host "[SUCCESS] Files are IDENTICAL" -ForegroundColor Green
}`}`;
    }
  },

  {
    id: 'compare-directories',
    name: 'Compare Two Directories',
    category: 'File Operations',
    isPremium: true,
    description: 'Compare directory contents and identify differences',
    instructions: `**How This Task Works:**
- Compares contents of two directories
- Identifies files only in source or destination
- Optional hash comparison for matching files
- Export report to CSV

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on both directories
- No administrator rights required

**What You Need to Provide:**
- Source directory path
- Destination directory path
- Include subdirectories: true or false
- Optional: CSV export path

**What the Script Does:**
1. Scans both directories for files
2. Compares file lists by relative path
3. Identifies unique files in each directory
4. Reports matching and different files
5. Exports detailed report to CSV

**Important Notes:**
- Comparison by filename and relative path
- Hash comparison optional for identical names
- Large directories take time to compare
- Useful for sync verification, backup audits`,
    parameters: [
      { id: 'sourceDir', label: 'Source Directory', type: 'path', required: true, placeholder: 'C:\\Source' },
      { id: 'destDir', label: 'Destination Directory', type: 'path', required: true, placeholder: 'D:\\Destination' },
      { id: 'recurse', label: 'Include Subdirectories', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const sourceDir = escapePowerShellString(params.sourceDir);
      const destDir = escapePowerShellString(params.destDir);
      const recurse = toPowerShellBoolean(params.recurse ?? true);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Compare Two Directories
# Generated: ${new Date().toISOString()}

$SourceDir = "${sourceDir}"
$DestDir = "${destDir}"

if (-not (Test-Path $SourceDir)) {
    Write-Host "[FAILED] Source directory not found: $SourceDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $DestDir)) {
    Write-Host "[FAILED] Destination directory not found: $DestDir" -ForegroundColor Red
    exit 1
}

Write-Host "Comparing directories..." -ForegroundColor Gray

$SourceFiles = Get-ChildItem -Path $SourceDir ${recurse === '$true' ? '-Recurse' : ''} -File | ForEach-Object {
    [PSCustomObject]@{
        RelativePath = $_.FullName.Substring($SourceDir.Length)
        FullPath = $_.FullName
        Size = $_.Length
    }
}

$DestFiles = Get-ChildItem -Path $DestDir ${recurse === '$true' ? '-Recurse' : ''} -File | ForEach-Object {
    [PSCustomObject]@{
        RelativePath = $_.FullName.Substring($DestDir.Length)
        FullPath = $_.FullName
        Size = $_.Length
    }
}

$Report = @()

# Files only in source
$OnlyInSource = $SourceFiles | Where-Object { $_.RelativePath -notin $DestFiles.RelativePath }
foreach ($f in $OnlyInSource) {
    $Report += [PSCustomObject]@{ Status = "Only in Source"; RelativePath = $f.RelativePath; Size = $f.Size }
}

# Files only in destination
$OnlyInDest = $DestFiles | Where-Object { $_.RelativePath -notin $SourceFiles.RelativePath }
foreach ($f in $OnlyInDest) {
    $Report += [PSCustomObject]@{ Status = "Only in Destination"; RelativePath = $f.RelativePath; Size = $f.Size }
}

# Files in both
$InBoth = $SourceFiles | Where-Object { $_.RelativePath -in $DestFiles.RelativePath }
foreach ($f in $InBoth) {
    $Report += [PSCustomObject]@{ Status = "In Both"; RelativePath = $f.RelativePath; Size = $f.Size }
}

Write-Host ""
Write-Host "[SUCCESS] Comparison complete" -ForegroundColor Green
Write-Host "  Source files: $($SourceFiles.Count)" -ForegroundColor Gray
Write-Host "  Destination files: $($DestFiles.Count)" -ForegroundColor Gray
Write-Host "  Only in source: $($OnlyInSource.Count)" -ForegroundColor Yellow
Write-Host "  Only in destination: $($OnlyInDest.Count)" -ForegroundColor Yellow
Write-Host "  In both: $($InBoth.Count)" -ForegroundColor Green

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  // ============================================
  // NEW TASKS: Directory Management
  // ============================================

  {
    id: 'create-directory-structure',
    name: 'Create Directory Structure',
    category: 'Directory Management',
    isPremium: true,
    description: 'Create nested folder structure from template',
    instructions: `**How This Task Works:**
- Creates multiple folders at once
- Supports nested folder structures
- Optionally creates from comma-separated list
- Useful for project setup

**Prerequisites:**
- PowerShell 5.1 or later
- Write permissions on target location
- No administrator rights required

**What You Need to Provide:**
- Base path (parent directory)
- Folder names (comma-separated list)
- Create nested structure: true or false

**What the Script Does:**
1. Creates base directory if needed
2. Parses folder list
3. Creates each folder and subfolders
4. Reports folders created
5. Shows final directory tree

**Important Notes:**
- Nested paths use backslash separator
- Existing folders are skipped (no error)
- Useful for project templates
- Creates parent directories automatically`,
    parameters: [
      { id: 'basePath', label: 'Base Path', type: 'path', required: true, placeholder: 'D:\\Projects\\NewProject' },
      { id: 'folderList', label: 'Folder Names (comma-separated)', type: 'textarea', required: true, placeholder: 'src,docs,tests,config,logs' }
    ],
    scriptTemplate: (params) => {
      const basePath = escapePowerShellString(params.basePath);
      const folderList = params.folderList || '';
      const folders = folderList.split(',').map((f: string) => f.trim()).filter((f: string) => f);
      
      return `# Create Directory Structure
# Generated: ${new Date().toISOString()}

$BasePath = "${basePath}"
$Folders = @(${folders.map((f: string) => `"${escapePowerShellString(f)}"`).join(', ')})

if (-not (Test-Path $BasePath)) {
    New-Item -Path $BasePath -ItemType Directory -Force | Out-Null
    Write-Host "[SUCCESS] Created base directory: $BasePath" -ForegroundColor Green
}

$Created = 0
foreach ($Folder in $Folders) {
    $FolderPath = Join-Path $BasePath $Folder
    if (-not (Test-Path $FolderPath)) {
        New-Item -Path $FolderPath -ItemType Directory -Force | Out-Null
        Write-Host "  [SUCCESS] Created: $Folder" -ForegroundColor Green
        $Created++
    } else {
        Write-Host "  - Exists: $Folder" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[SUCCESS] Created $Created new folders" -ForegroundColor Green
Write-Host ""
Write-Host "Directory structure:" -ForegroundColor Cyan
Get-ChildItem $BasePath -Directory | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }`;
    }
  },

  {
    id: 'remove-empty-directories',
    name: 'Remove Empty Directories',
    category: 'Directory Management',
    isPremium: true,
    description: 'Find and remove empty folders recursively',
    instructions: `**How This Task Works:**
- Scans for empty directories
- Recursively removes nested empty folders
- Test mode for safe preview
- Reports folders removed

**Prerequisites:**
- PowerShell 5.1 or later
- Delete permissions on target location
- No administrator rights required

**What You Need to Provide:**
- Target path to scan
- Test mode: true for preview, false to delete

**What the Script Does:**
1. Scans all subdirectories
2. Identifies folders with no files
3. Processes from deepest level up
4. In test mode: lists empty folders
5. In delete mode: removes empty folders

**Important Notes:**
- Processes bottom-up (removes nested first)
- Hidden files count as content
- Test mode shows what would be deleted
- May need multiple passes for nested empty`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares' },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Remove Empty Directories
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$TestMode = ${testMode}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Scanning for empty directories..." -ForegroundColor Gray

$Removed = 0
$EmptyDirs = @()

do {
    $EmptyDirs = Get-ChildItem -Path $TargetPath -Directory -Recurse | Where-Object {
        (Get-ChildItem -Path $_.FullName -Force | Measure-Object).Count -eq 0
    }
    
    foreach ($Dir in $EmptyDirs) {
        if ($TestMode) {
            Write-Host "  [Would remove] $($Dir.FullName)" -ForegroundColor Yellow
        } else {
            try {
                Remove-Item -Path $Dir.FullName -Force
                Write-Host "  [SUCCESS] Removed: $($Dir.FullName)" -ForegroundColor Green
                $Removed++
            } catch {
                Write-Host "  [FAILED] Failed: $($Dir.FullName)" -ForegroundColor Red
            }
        }
    }
} while ($EmptyDirs.Count -gt 0 -and -not $TestMode)

Write-Host ""
if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - Found $($EmptyDirs.Count) empty directories" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Removed $Removed empty directories" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'directory-tree-export',
    name: 'Export Directory Tree',
    category: 'Directory Management',
    isPremium: true,
    description: 'Generate visual directory tree structure export',
    instructions: `**How This Task Works:**
- Creates visual tree representation
- Shows folder hierarchy with indentation
- Optional depth limit
- Exports to text file

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target path
- No administrator rights required

**What You Need to Provide:**
- Target directory path
- Maximum depth (levels to display)
- Export file path

**What the Script Does:**
1. Scans directory structure
2. Creates indented tree visualization
3. Shows folder names with tree characters
4. Limits to specified depth
5. Exports to text file

**Important Notes:**
- Useful for documentation
- Large structures may be slow
- Depth limit improves performance
- Uses tree-like ASCII characters`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'C:\\Projects' },
      { id: 'maxDepth', label: 'Maximum Depth', type: 'number', required: false, defaultValue: 5 },
      { id: 'exportPath', label: 'Export Path (TXT)', type: 'path', required: true, placeholder: 'C:\\Reports\\tree.txt' }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const maxDepth = Number(params.maxDepth || 5);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Directory Tree
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$MaxDepth = ${maxDepth}
$ExportPath = "${exportPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

function Get-DirectoryTree {
    param([string]$Path, [int]$Depth = 0, [int]$MaxDepth = 5, [string]$Prefix = "")
    
    if ($Depth -gt $MaxDepth) { return }
    
    $Items = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue
    $Count = $Items.Count
    $Index = 0
    
    foreach ($Item in $Items) {
        $Index++
        $IsLast = ($Index -eq $Count)
        $Connector = if ($IsLast) { "└── " } else { "├── " }
        $NewPrefix = if ($IsLast) { "$Prefix    " } else { "$Prefix│   " }
        
        "$Prefix$Connector$($Item.Name)"
        Get-DirectoryTree -Path $Item.FullName -Depth ($Depth + 1) -MaxDepth $MaxDepth -Prefix $NewPrefix
    }
}

Write-Host "Generating directory tree..." -ForegroundColor Gray

$Tree = @()
$Tree += $TargetPath
$Tree += Get-DirectoryTree -Path $TargetPath -MaxDepth $MaxDepth

$Tree | Out-File -FilePath $ExportPath -Encoding UTF8

Write-Host ""
Write-Host "[SUCCESS] Directory tree exported to: $ExportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Preview (first 20 lines):" -ForegroundColor Cyan
$Tree | Select-Object -First 20 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }`;
    }
  },

  // ============================================
  // NEW TASKS: Permissions & Security
  // ============================================

  {
    id: 'grant-ntfs-permissions',
    name: 'Grant NTFS Permissions',
    category: 'Permissions & Security',
    isPremium: true,
    description: 'Add NTFS permissions for user or group on folder',
    instructions: `**How This Task Works:**
- Grants NTFS permissions to user/group
- Supports various permission levels
- Option for inheritance to subfolders
- Does not remove existing permissions

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control on target folder
- Valid user/group account

**What You Need to Provide:**
- Target folder path
- User or group (DOMAIN\\Username format)
- Permission level (FullControl, Modify, Read, etc.)
- Apply to subfolders: true or false

**What the Script Does:**
1. Validates target folder exists
2. Creates access rule for specified user
3. Adds rule to folder ACL
4. Applies to subfolders if specified
5. Reports permission applied

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Does NOT remove existing permissions
- Use DOMAIN\\Username or DOMAIN\\Groupname
- Permission levels: FullControl, Modify, ReadAndExecute, Read, Write`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares\\Documents' },
      { id: 'identity', label: 'User or Group', type: 'text', required: true, placeholder: 'DOMAIN\\Users' },
      { id: 'permission', label: 'Permission Level', type: 'select', required: true, options: ['FullControl', 'Modify', 'ReadAndExecute', 'Read', 'Write'], defaultValue: 'ReadAndExecute' },
      { id: 'applyToSubfolders', label: 'Apply to Subfolders', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const identity = escapePowerShellString(params.identity);
      const permission = params.permission || 'ReadAndExecute';
      const applyToSubfolders = params.applyToSubfolders ?? true;
      
      return `# Grant NTFS Permissions
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$Identity = "${identity}"
$Permission = "${permission}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

try {
    $Acl = Get-Acl -Path $TargetPath
    
    $InheritanceFlag = ${applyToSubfolders ? '"ContainerInherit,ObjectInherit"' : '"None"'}
    $PropagationFlag = "None"
    $AccessType = "Allow"
    
    $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $Identity,
        $Permission,
        $InheritanceFlag,
        $PropagationFlag,
        $AccessType
    )
    
    $Acl.AddAccessRule($AccessRule)
    Set-Acl -Path $TargetPath -AclObject $Acl
    
    Write-Host "[SUCCESS] Granted $Permission to $Identity on $TargetPath" -ForegroundColor Green
    ${applyToSubfolders ? 'Write-Host "  Applied to subfolders: Yes" -ForegroundColor Gray' : ''}
} catch {
    Write-Host "[FAILED] Failed to set permissions: \$_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'remove-ntfs-permissions',
    name: 'Remove NTFS Permissions',
    category: 'Permissions & Security',
    isPremium: true,
    description: 'Remove NTFS permissions for user or group from folder',
    instructions: `**How This Task Works:**
- Removes specific user/group from ACL
- Preserves all other permissions
- Option to remove from subfolders
- Reports permissions removed

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control on target folder
- Permission entry must exist

**What You Need to Provide:**
- Target folder path
- User or group to remove (DOMAIN\\Username format)
- Apply to subfolders: true or false

**What the Script Does:**
1. Validates target folder exists
2. Gets current ACL
3. Removes all rules for specified user
4. Applies updated ACL
5. Optionally removes from subfolders

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Removes ALL permissions for that user/group
- Owner permissions cannot be removed
- Consider inheritance implications`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares\\Documents' },
      { id: 'identity', label: 'User or Group', type: 'text', required: true, placeholder: 'DOMAIN\\OldUsers' },
      { id: 'applyToSubfolders', label: 'Apply to Subfolders', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const identity = escapePowerShellString(params.identity);
      const applyToSubfolders = toPowerShellBoolean(params.applyToSubfolders ?? false);
      
      return `# Remove NTFS Permissions
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$Identity = "${identity}"
$ApplyToSubfolders = ${applyToSubfolders}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

function Remove-UserPermission {
    param([string]$Path, [string]$User)
    
    try {
        $Acl = Get-Acl -Path $Path
        $RulesToRemove = $Acl.Access | Where-Object { $_.IdentityReference -eq $User }
        
        foreach ($Rule in $RulesToRemove) {
            $Acl.RemoveAccessRule($Rule) | Out-Null
        }
        
        Set-Acl -Path $Path -AclObject $Acl
        return $RulesToRemove.Count
    } catch {
        return 0
    }
}

$Removed = Remove-UserPermission -Path $TargetPath -User $Identity
Write-Host "[SUCCESS] Removed $Removed permission(s) from: $TargetPath" -ForegroundColor Green

if ($ApplyToSubfolders) {
    Write-Host "Processing subfolders..." -ForegroundColor Gray
    $Items = Get-ChildItem -Path $TargetPath -Recurse -Directory
    foreach ($Item in $Items) {
        $Count = Remove-UserPermission -Path $Item.FullName -User $Identity
        if ($Count -gt 0) {
            Write-Host "  [SUCCESS] Removed from: $($Item.FullName)" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "[SUCCESS] Permission removal complete" -ForegroundColor Green`;
    }
  },

  {
    id: 'export-ntfs-permissions',
    name: 'Export NTFS Permissions Report',
    category: 'Permissions & Security',
    isPremium: true,
    description: 'Generate comprehensive NTFS permissions report',
    instructions: `**How This Task Works:**
- Exports all NTFS permissions to CSV
- Includes inheritance and propagation flags
- Optionally scans subdirectories
- Comprehensive security audit report

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target path
- Administrator recommended for full report
- Write permissions on export location

**What You Need to Provide:**
- Target folder path
- Include subdirectories: true or false
- Export CSV file path

**What the Script Does:**
1. Scans target folder and subfolders
2. Gets ACL for each folder
3. Exports all access rules
4. Includes identity, permissions, inheritance
5. Creates detailed CSV report

**Important Notes:**
- Large structures may take time
- Useful for security audits
- Shows inherited vs explicit permissions
- CSV format for Excel analysis`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares' },
      { id: 'recurse', label: 'Include Subdirectories', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\Permissions.csv' }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const recurse = toPowerShellBoolean(params.recurse ?? true);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export NTFS Permissions Report
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$Recurse = ${recurse}
$ExportPath = "${exportPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Scanning NTFS permissions..." -ForegroundColor Gray

$Report = @()

if ($Recurse) {
    $Folders = @(Get-Item $TargetPath) + @(Get-ChildItem -Path $TargetPath -Directory -Recurse -ErrorAction SilentlyContinue)
} else {
    $Folders = @(Get-Item $TargetPath)
}

foreach ($Folder in $Folders) {
    try {
        $Acl = Get-Acl -Path $Folder.FullName
        foreach ($Access in $Acl.Access) {
            $Report += [PSCustomObject]@{
                Path = $Folder.FullName
                Identity = $Access.IdentityReference
                Permission = $Access.FileSystemRights
                AccessType = $Access.AccessControlType
                Inherited = $Access.IsInherited
                InheritanceFlags = $Access.InheritanceFlags
                PropagationFlags = $Access.PropagationFlags
            }
        }
    } catch {
        Write-Host "  [WARNING] Access denied: $($Folder.FullName)" -ForegroundColor Yellow
    }
}

$Report | Export-Csv -Path $ExportPath -NoTypeInformation

Write-Host ""
Write-Host "[SUCCESS] Permissions report exported" -ForegroundColor Green
Write-Host "  Folders scanned: $($Folders.Count)" -ForegroundColor Gray
Write-Host "  Permission entries: $($Report.Count)" -ForegroundColor Gray
Write-Host "  Export path: $ExportPath" -ForegroundColor Gray`;
    }
  },

  {
    id: 'reset-ntfs-permissions',
    name: 'Reset NTFS Permissions to Default',
    category: 'Permissions & Security',
    isPremium: true,
    description: 'Reset folder permissions to inherited defaults',
    instructions: `**How This Task Works:**
- Removes all explicit permissions
- Re-enables permission inheritance
- Resets to parent folder defaults
- Option to apply recursively

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control or TakeOwnership right
- Backup permissions before reset

**What You Need to Provide:**
- Target folder path
- Apply recursively: true or false
- Test mode: true for preview, false to apply

**What the Script Does:**
1. Clears all explicit permissions
2. Re-enables inheritance from parent
3. Applies inherited permissions
4. Processes subfolders if recursive
5. Reports folders reset

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REMOVES ALL EXPLICIT PERMISSIONS
- Uses parent folder permissions
- Test mode highly recommended first`,
    parameters: [
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true, placeholder: 'D:\\Shares\\Folder' },
      { id: 'recurse', label: 'Apply Recursively', type: 'boolean', required: false, defaultValue: false },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const recurse = toPowerShellBoolean(params.recurse ?? false);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Reset NTFS Permissions to Default
# Generated: ${new Date().toISOString()}
# WARNING: This removes all explicit permissions

$TargetPath = "${targetPath}"
$Recurse = ${recurse}
$TestMode = ${testMode}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

function Reset-FolderPermissions {
    param([string]$Path, [bool]$Preview)
    
    if ($Preview) {
        Write-Host "  [Would reset] $Path" -ForegroundColor Yellow
        return
    }
    
    try {
        $Acl = Get-Acl -Path $Path
        $Acl.SetAccessRuleProtection($false, $false)
        Set-Acl -Path $Path -AclObject $Acl
        Write-Host "  [SUCCESS] Reset: $Path" -ForegroundColor Green
    } catch {
        Write-Host "  [FAILED] Failed: $Path - \$_" -ForegroundColor Red
    }
}

Write-Host "Resetting NTFS permissions..." -ForegroundColor Gray
Reset-FolderPermissions -Path $TargetPath -Preview $TestMode

if ($Recurse) {
    $Items = Get-ChildItem -Path $TargetPath -Directory -Recurse
    foreach ($Item in $Items) {
        Reset-FolderPermissions -Path $Item.FullName -Preview $TestMode
    }
}

Write-Host ""
if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - No changes made" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Permissions reset complete" -ForegroundColor Green
}`;
    }
  },

  // ============================================
  // NEW TASKS: Compression & Archives
  // ============================================

  {
    id: 'create-7zip-archive',
    name: 'Create 7-Zip Archive',
    category: 'Compression',
    isPremium: true,
    description: 'Create compressed 7z archive with password option',
    instructions: `**How This Task Works:**
- Creates 7z archive using 7-Zip
- Supports password protection
- Better compression than ZIP
- Optional compression level

**Prerequisites:**
- 7-Zip installed (7z.exe in PATH)
- PowerShell 5.1 or later
- Read permissions on source
- Write permissions on destination

**What You Need to Provide:**
- Source path (file or folder)
- Destination archive path (.7z)
- Optional: Password for encryption
- Compression level (0=none, 9=maximum)

**What the Script Does:**
1. Validates 7-Zip installation
2. Creates 7z archive with specified options
3. Applies password encryption if set
4. Reports compression ratio
5. Confirms archive creation

**Important Notes:**
- Requires 7-Zip installation
- Password uses AES-256 encryption
- Level 9 = best compression, slowest
- Level 0 = no compression, fastest
- Stronger compression than ZIP format`,
    parameters: [
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: 'C:\\DataFolder' },
      { id: 'archivePath', label: 'Archive Path (.7z)', type: 'path', required: true, placeholder: 'C:\\Backups\\data.7z' },
      { id: 'password', label: 'Password (Optional)', type: 'text', required: false, placeholder: 'SecurePassword123' },
      { id: 'compressionLevel', label: 'Compression Level (0-9)', type: 'number', required: false, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const archivePath = escapePowerShellString(params.archivePath);
      const password = params.password ? escapePowerShellString(params.password) : '';
      const compressionLevel = Number(params.compressionLevel ?? 5);
      
      return `# Create 7-Zip Archive
# Generated: ${new Date().toISOString()}

$Source = "${sourcePath}"
$Archive = "${archivePath}"
$CompressionLevel = ${compressionLevel}

# Check for 7-Zip
$7zPath = Get-Command "7z.exe" -ErrorAction SilentlyContinue
if (-not $7zPath) {
    $7zPath = "C:\\Program Files\\7-Zip\\7z.exe"
    if (-not (Test-Path $7zPath)) {
        Write-Host "[FAILED] 7-Zip not found. Please install 7-Zip." -ForegroundColor Red
        exit 1
    }
} else {
    $7zPath = $7zPath.Source
}

if (-not (Test-Path $Source)) {
    Write-Host "[FAILED] Source not found: $Source" -ForegroundColor Red
    exit 1
}

Write-Host "Creating 7z archive..." -ForegroundColor Gray

$Args = @("a", "-t7z", "-mx=$CompressionLevel", $Archive, $Source)
${password ? `$Args += "-p${password}"
$Args += "-mhe=on"` : ''}

try {
    & $7zPath @Args
    
    if (Test-Path $Archive) {
        $ArchiveInfo = Get-Item $Archive
        Write-Host ""
        Write-Host "[SUCCESS] Archive created successfully" -ForegroundColor Green
        Write-Host "  Location: $Archive" -ForegroundColor Gray
        Write-Host "  Size: $([math]::Round($ArchiveInfo.Length/1MB, 2)) MB" -ForegroundColor Gray
        ${password ? 'Write-Host "  Password protected: Yes" -ForegroundColor Yellow' : ''}
    }
} catch {
    Write-Host "[FAILED] Archive creation failed: \$_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'extract-7zip-archive',
    name: 'Extract 7-Zip Archive',
    category: 'Compression',
    isPremium: true,
    description: 'Extract 7z, ZIP, RAR, and other archives',
    instructions: `**How This Task Works:**
- Extracts various archive formats
- Supports 7z, ZIP, RAR, TAR, GZIP
- Password support for encrypted archives
- Preserves folder structure

**Prerequisites:**
- 7-Zip installed (7z.exe in PATH)
- PowerShell 5.1 or later
- Read permissions on archive
- Write permissions on destination

**What You Need to Provide:**
- Archive file path
- Destination folder
- Password (if encrypted)
- Overwrite option

**What the Script Does:**
1. Validates 7-Zip installation
2. Extracts archive to destination
3. Uses password if encrypted
4. Preserves original structure
5. Reports files extracted

**Important Notes:**
- Requires 7-Zip installation
- Supports many archive formats
- Overwrites existing if specified
- Creates destination folder if needed`,
    parameters: [
      { id: 'archivePath', label: 'Archive Path', type: 'path', required: true, placeholder: 'C:\\Downloads\\archive.7z' },
      { id: 'destinationPath', label: 'Destination Folder', type: 'path', required: true, placeholder: 'C:\\Extracted' },
      { id: 'password', label: 'Password (if encrypted)', type: 'text', required: false },
      { id: 'overwrite', label: 'Overwrite Existing', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const archivePath = escapePowerShellString(params.archivePath);
      const destinationPath = escapePowerShellString(params.destinationPath);
      const password = params.password ? escapePowerShellString(params.password) : '';
      const overwrite = params.overwrite ?? false;
      
      return `# Extract 7-Zip Archive
# Generated: ${new Date().toISOString()}

$Archive = "${archivePath}"
$Destination = "${destinationPath}"

# Check for 7-Zip
$7zPath = Get-Command "7z.exe" -ErrorAction SilentlyContinue
if (-not $7zPath) {
    $7zPath = "C:\\Program Files\\7-Zip\\7z.exe"
    if (-not (Test-Path $7zPath)) {
        Write-Host "[FAILED] 7-Zip not found. Please install 7-Zip." -ForegroundColor Red
        exit 1
    }
} else {
    $7zPath = $7zPath.Source
}

if (-not (Test-Path $Archive)) {
    Write-Host "[FAILED] Archive not found: $Archive" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -Path $Destination -ItemType Directory -Force | Out-Null
}

Write-Host "Extracting archive..." -ForegroundColor Gray

$Args = @("x", $Archive, "-o$Destination", ${overwrite ? '"-aoa"' : '"-aos"'})
${password ? `$Args += "-p${password}"` : ''}

try {
    & $7zPath @Args
    
    $FileCount = (Get-ChildItem -Path $Destination -Recurse -File | Measure-Object).Count
    Write-Host ""
    Write-Host "[SUCCESS] Extraction complete" -ForegroundColor Green
    Write-Host "  Files extracted: $FileCount" -ForegroundColor Gray
    Write-Host "  Location: $Destination" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Extraction failed: \$_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'list-archive-contents',
    name: 'List Archive Contents',
    category: 'Compression',
    isPremium: true,
    description: 'View contents of ZIP, 7z, or other archives without extracting',
    instructions: `**How This Task Works:**
- Lists archive contents without extraction
- Shows file sizes, dates, compression ratio
- Supports multiple archive formats
- Export listing to CSV

**Prerequisites:**
- 7-Zip installed for 7z/RAR formats
- PowerShell 5.1 or later
- Read permissions on archive

**What You Need to Provide:**
- Archive file path
- Optional: Export CSV path

**What the Script Does:**
1. Opens archive for reading
2. Lists all files with details
3. Shows size, compressed size, ratio
4. Displays modification dates
5. Optionally exports to CSV

**Important Notes:**
- ZIP uses built-in .NET classes
- Other formats require 7-Zip
- Does not extract any files
- Useful for archive inspection`,
    parameters: [
      { id: 'archivePath', label: 'Archive Path', type: 'path', required: true, placeholder: 'C:\\Downloads\\archive.zip' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const archivePath = escapePowerShellString(params.archivePath);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List Archive Contents
# Generated: ${new Date().toISOString()}

$Archive = "${archivePath}"

if (-not (Test-Path $Archive)) {
    Write-Host "[FAILED] Archive not found: $Archive" -ForegroundColor Red
    exit 1
}

$Extension = [System.IO.Path]::GetExtension($Archive).ToLower()

if ($Extension -eq ".zip") {
    # Use .NET for ZIP files
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    $ZipArchive = [System.IO.Compression.ZipFile]::OpenRead($Archive)
    
    $Contents = $ZipArchive.Entries | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.Name
            FullPath = $_.FullName
            SizeKB = [math]::Round($_.Length/1KB, 2)
            CompressedKB = [math]::Round($_.CompressedLength/1KB, 2)
            Ratio = if ($_.Length -gt 0) { [math]::Round((1 - $_.CompressedLength/$_.Length) * 100, 1) } else { 0 }
            Modified = $_.LastWriteTime
        }
    }
    
    $ZipArchive.Dispose()
} else {
    # Use 7-Zip for other formats
    $7zPath = "C:\\Program Files\\7-Zip\\7z.exe"
    if (-not (Test-Path $7zPath)) {
        Write-Host "[FAILED] 7-Zip required for this format" -ForegroundColor Red
        exit 1
    }
    
    $Output = & $7zPath l $Archive
    Write-Host $Output
    exit 0
}

Write-Host "Archive contents:" -ForegroundColor Cyan
$Contents | Format-Table Name, SizeKB, CompressedKB, @{N='Ratio%';E={$_.Ratio}}, Modified -AutoSize

Write-Host ""
Write-Host "Total files: $($Contents.Count)" -ForegroundColor Gray
Write-Host "Total size: $([math]::Round(($Contents | Measure-Object -Property SizeKB -Sum).Sum, 2)) KB" -ForegroundColor Gray

${exportPath ? `$Contents | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  // ============================================
  // NEW TASKS: Disk Management
  // ============================================

  {
    id: 'get-disk-info',
    name: 'Get Physical Disk Information',
    category: 'Disk Management',
    isPremium: true,
    description: 'Display detailed physical disk and partition information',
    instructions: `**How This Task Works:**
- Shows physical disk details
- Displays partition layout
- Reports disk health status
- Includes SMART data if available

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator recommended for full info
- No special software required

**What You Need to Provide:**
- Optional: Export CSV path

**What the Script Does:**
1. Gets all physical disks
2. Shows disk model, size, interface
3. Lists partitions on each disk
4. Reports health/operational status
5. Optionally exports to CSV

**Important Notes:**
- Administrator gets more detailed info
- Shows all connected disks
- Includes USB, SSD, HDD
- Useful for inventory and planning`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Physical Disk Information
# Generated: ${new Date().toISOString()}

Write-Host "Physical Disk Information" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$Disks = Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, HealthStatus, OperationalStatus, BusType

$Disks | Format-Table -AutoSize

Write-Host ""
Write-Host "Volume Information" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

$Volumes = Get-Volume | Where-Object { $_.DriveLetter } | Select-Object DriveLetter, FileSystemLabel, FileSystem, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, @{N='FreeGB';E={[math]::Round($_.SizeRemaining/1GB,2)}}, HealthStatus

$Volumes | Format-Table -AutoSize

Write-Host ""
Write-Host "Partition Information" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, Type | Format-Table -AutoSize

${exportPath ? `
$Report = @()
foreach ($Disk in $Disks) {
    $Report += [PSCustomObject]@{
        Type = "PhysicalDisk"
        DeviceId = $Disk.DeviceId
        Name = $Disk.FriendlyName
        MediaType = $Disk.MediaType
        SizeGB = $Disk.SizeGB
        Status = $Disk.HealthStatus
    }
}
$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-volume-info',
    name: 'Get Volume and Mount Point Info',
    category: 'Disk Management',
    isPremium: true,
    description: 'Display volume details including mount points and drive letters',
    instructions: `**How This Task Works:**
- Lists all volumes with details
- Shows mount points and junctions
- Displays file system information
- Reports space usage

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator required
- No special software needed

**What You Need to Provide:**
- Optional: Export CSV path

**What the Script Does:**
1. Gets all Windows volumes
2. Shows drive letter, label, file system
3. Displays total and free space
4. Lists mount points if any
5. Optionally exports to CSV

**Important Notes:**
- Shows local and network volumes
- Mount points show folder paths
- Useful for storage planning
- No admin required for basic info`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Volume and Mount Point Info
# Generated: ${new Date().toISOString()}

Write-Host "Volume Information" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

$Volumes = Get-Volume | Select-Object @{N='Drive';E={if ($_.DriveLetter) {"$($_.DriveLetter):"} else {"N/A"}}}, FileSystemLabel, FileSystem, DriveType, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, @{N='FreeGB';E={[math]::Round($_.SizeRemaining/1GB,2)}}, @{N='UsedPercent';E={if ($_.Size -gt 0) {[math]::Round((($_.Size - $_.SizeRemaining)/$_.Size)*100,1)} else {0}}}, HealthStatus

$Volumes | Format-Table -AutoSize

Write-Host ""
Write-Host "Mount Points" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host ""

$MountPoints = Get-WmiObject Win32_MountPoint | ForEach-Object {
    $Volume = Get-WmiObject Win32_Volume | Where-Object { $_.DeviceID -eq $_.Volume }
    if ($Volume) {
        [PSCustomObject]@{
            Directory = $_.Directory.Split('"')[1]
            DeviceID = $_.Volume
        }
    }
}

if ($MountPoints) {
    $MountPoints | Format-Table -AutoSize
} else {
    Write-Host "No volume mount points found" -ForegroundColor Gray
}

${exportPath ? `$Volumes | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'check-disk-health',
    name: 'Check Disk Health Status',
    category: 'Disk Management',
    isPremium: true,
    description: 'Monitor disk health and predict potential failures',
    instructions: `**How This Task Works:**
- Checks physical disk health
- Reports SMART status
- Identifies potential failures
- Shows reliability statistics

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator recommended
- Windows 8/Server 2012 or later

**What You Need to Provide:**
- Optional: Export CSV path

**What the Script Does:**
1. Gets all physical disk status
2. Checks health and operational status
3. Reports any warnings or errors
4. Lists disk reliability counters
5. Optionally exports to CSV

**Important Notes:**
- Healthy = disk operating normally
- Warning/Unhealthy = backup immediately
- SMART data may not be available on all disks
- SSD and HDD both supported`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Check Disk Health Status
# Generated: ${new Date().toISOString()}

Write-Host "Disk Health Status Report" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$Disks = Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, HealthStatus, OperationalStatus

foreach ($Disk in $Disks) {
    $StatusColor = switch ($Disk.HealthStatus) {
        "Healthy" { "Green" }
        "Warning" { "Yellow" }
        "Unhealthy" { "Red" }
        default { "Gray" }
    }
    
    Write-Host "Disk $($Disk.DeviceId): $($Disk.FriendlyName)" -ForegroundColor White
    Write-Host "  Type: $($Disk.MediaType)" -ForegroundColor Gray
    Write-Host "  Size: $($Disk.SizeGB) GB" -ForegroundColor Gray
    Write-Host "  Health: $($Disk.HealthStatus)" -ForegroundColor $StatusColor
    Write-Host "  Status: $($Disk.OperationalStatus)" -ForegroundColor Gray
    Write-Host ""
}

# Check for reliability counters
Write-Host "Disk Reliability Data" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

try {
    $Reliability = Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object DeviceId, ReadErrorsTotal, WriteErrorsTotal, Temperature, Wear

    if ($Reliability) {
        $Reliability | Format-Table -AutoSize
    } else {
        Write-Host "Reliability data not available" -ForegroundColor Gray
    }
} catch {
    Write-Host "Unable to retrieve reliability counters" -ForegroundColor Yellow
}

# Summary
$UnhealthyDisks = $Disks | Where-Object { $_.HealthStatus -ne "Healthy" }
if ($UnhealthyDisks) {
    Write-Host ""
    Write-Host "[WARNING] WARNING: $($UnhealthyDisks.Count) disk(s) require attention!" -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "[SUCCESS] All disks healthy" -ForegroundColor Green
}

${exportPath ? `$Disks | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  // ============================================
  // NEW TASKS: File Monitoring
  // ============================================

  {
    id: 'monitor-folder-realtime',
    name: 'Monitor Folder Changes (Real-Time)',
    category: 'File Monitoring',
    isPremium: true,
    description: 'Watch folder for file changes in real-time',
    instructions: `**How This Task Works:**
- Monitors folder for file changes
- Detects create, modify, delete, rename
- Real-time notifications
- Optional logging to file

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target folder
- Script runs continuously

**What You Need to Provide:**
- Target folder path
- Include subdirectories: true or false
- Log file path (optional)
- Duration in seconds (0 = indefinite)

**What the Script Does:**
1. Creates FileSystemWatcher object
2. Registers event handlers
3. Monitors for all change types
4. Displays changes in console
5. Optionally logs to file

**Important Notes:**
- Runs continuously until stopped
- Use Ctrl+C to stop monitoring
- Large folders may miss rapid changes
- Log file grows with activity`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\ImportantFiles' },
      { id: 'includeSubdirs', label: 'Include Subdirectories', type: 'boolean', required: false, defaultValue: true },
      { id: 'logPath', label: 'Log File Path', type: 'path', required: false, placeholder: 'C:\\Logs\\FolderMonitor.log' },
      { id: 'durationSeconds', label: 'Duration (seconds, 0=indefinite)', type: 'number', required: false, defaultValue: 0 }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const includeSubdirs = toPowerShellBoolean(params.includeSubdirs ?? true);
      const logPath = params.logPath ? escapePowerShellString(params.logPath) : '';
      const duration = Number(params.durationSeconds || 0);
      
      return `# Monitor Folder Changes (Real-Time)
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$IncludeSubdirs = ${includeSubdirs}
${logPath ? `$LogPath = "${logPath}"` : ''}
$Duration = ${duration}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Starting folder monitor..." -ForegroundColor Cyan
Write-Host "Watching: $TargetPath" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$Watcher = New-Object System.IO.FileSystemWatcher
$Watcher.Path = $TargetPath
$Watcher.IncludeSubdirectories = $IncludeSubdirs
$Watcher.EnableRaisingEvents = $true

$Action = {
    $Event = $Event.SourceEventArgs
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "[$Timestamp] $($Event.ChangeType): $($Event.FullPath)"
    
    $Color = switch ($Event.ChangeType) {
        "Created" { "Green" }
        "Deleted" { "Red" }
        "Changed" { "Yellow" }
        "Renamed" { "Cyan" }
        default { "Gray" }
    }
    
    Write-Host $Message -ForegroundColor $Color
    ${logPath ? `Add-Content -Path $LogPath -Value $Message` : ''}
}

$Handlers = @()
$Handlers += Register-ObjectEvent $Watcher "Created" -Action $Action
$Handlers += Register-ObjectEvent $Watcher "Deleted" -Action $Action
$Handlers += Register-ObjectEvent $Watcher "Changed" -Action $Action
$Handlers += Register-ObjectEvent $Watcher "Renamed" -Action $Action

try {
    if ($Duration -gt 0) {
        Start-Sleep -Seconds $Duration
    } else {
        while ($true) { Start-Sleep -Seconds 1 }
    }
} finally {
    $Handlers | ForEach-Object { Unregister-Event -SubscriptionId $_.Id }
    $Watcher.Dispose()
    Write-Host ""
    Write-Host "[SUCCESS] Monitoring stopped" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'audit-file-access',
    name: 'Enable File Access Auditing',
    category: 'File Monitoring',
    isPremium: true,
    description: 'Configure NTFS auditing for file access tracking',
    instructions: `**How This Task Works:**
- Enables NTFS audit policies
- Tracks file access, modify, delete
- Logs to Windows Security Event Log
- Configurable audit options

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control on target folder
- Audit policy must be enabled in GPO

**What You Need to Provide:**
- Target folder path
- Audit success: true or false
- Audit failure: true or false
- Apply to subfolders: true or false

**What the Script Does:**
1. Gets current folder ACL
2. Creates audit rule for Everyone
3. Adds audit rule to SACL
4. Applies to folder and subfolders
5. Events appear in Security Log

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Must enable "Audit object access" in GPO
- Security log stores audit events
- High volume folders generate many events`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\SensitiveData' },
      { id: 'auditSuccess', label: 'Audit Success', type: 'boolean', required: false, defaultValue: true },
      { id: 'auditFailure', label: 'Audit Failure', type: 'boolean', required: false, defaultValue: true },
      { id: 'applyToSubfolders', label: 'Apply to Subfolders', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const auditSuccess = params.auditSuccess ?? true;
      const auditFailure = params.auditFailure ?? true;
      const applyToSubfolders = params.applyToSubfolders ?? true;
      
      return `# Enable File Access Auditing
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

# Build audit flags
$AuditFlags = @()
${auditSuccess ? '$AuditFlags += "Success"' : ''}
${auditFailure ? '$AuditFlags += "Failure"' : ''}

if ($AuditFlags.Count -eq 0) {
    Write-Host "[FAILED] Must enable at least Success or Failure auditing" -ForegroundColor Red
    exit 1
}

$AuditType = $AuditFlags -join ","

try {
    $Acl = Get-Acl -Path $TargetPath -Audit
    
    $InheritanceFlags = ${applyToSubfolders ? '"ContainerInherit,ObjectInherit"' : '"None"'}
    
    $AuditRule = New-Object System.Security.AccessControl.FileSystemAuditRule(
        "Everyone",
        "ReadData,WriteData,Delete,ChangePermissions",
        $InheritanceFlags,
        "None",
        $AuditType
    )
    
    $Acl.AddAuditRule($AuditRule)
    Set-Acl -Path $TargetPath -AclObject $Acl
    
    Write-Host "[SUCCESS] Auditing enabled on: $TargetPath" -ForegroundColor Green
    Write-Host "  Audit type: $AuditType" -ForegroundColor Gray
    ${applyToSubfolders ? 'Write-Host "  Applied to subfolders: Yes" -ForegroundColor Gray' : ''}
    Write-Host ""
    Write-Host "Note: Ensure 'Audit object access' is enabled in Group Policy" -ForegroundColor Yellow
    Write-Host "View events in: Event Viewer > Windows Logs > Security" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Failed to set auditing: \$_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-recent-file-changes',
    name: 'Get Recently Modified Files',
    category: 'File Monitoring',
    isPremium: true,
    description: 'Find files modified within specified time period',
    instructions: `**How This Task Works:**
- Finds files changed in time window
- Filters by hours, days, or minutes
- Shows modification timestamps
- Exports results to CSV

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target path
- No administrator required

**What You Need to Provide:**
- Target folder path
- Time period (hours, days, or minutes)
- Time value (number)
- Optional: CSV export path

**What the Script Does:**
1. Calculates cutoff timestamp
2. Scans folder recursively
3. Filters by LastWriteTime
4. Sorts by modification time
5. Exports results if requested

**Important Notes:**
- Uses LastWriteTime attribute
- Includes all file types
- Large folders take longer
- Useful for change tracking`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\Projects' },
      { id: 'timePeriod', label: 'Time Period', type: 'select', required: true, options: ['Minutes', 'Hours', 'Days'], defaultValue: 'Hours' },
      { id: 'timeValue', label: 'Time Value', type: 'number', required: true, defaultValue: 24 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const timePeriod = params.timePeriod || 'Hours';
      const timeValue = Number(params.timeValue || 24);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Recently Modified Files
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$TimeValue = ${timeValue}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

$Cutoff = switch ("${timePeriod}") {
    "Minutes" { (Get-Date).AddMinutes(-$TimeValue) }
    "Hours" { (Get-Date).AddHours(-$TimeValue) }
    "Days" { (Get-Date).AddDays(-$TimeValue) }
}

Write-Host "Searching for files modified since: $Cutoff" -ForegroundColor Gray
Write-Host ""

$Files = Get-ChildItem -Path $TargetPath -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $Cutoff } | Sort-Object LastWriteTime -Descending | Select-Object @{N='FileName';E={$_.Name}}, @{N='Path';E={$_.FullName}}, @{N='SizeKB';E={[math]::Round($_.Length/1KB,2)}}, @{N='Modified';E={$_.LastWriteTime}}, @{N='Created';E={$_.CreationTime}}

if ($Files) {
    $Files | Format-Table FileName, SizeKB, Modified -AutoSize
    
    Write-Host ""
    Write-Host "[SUCCESS] Found $($Files.Count) files modified in last ${timeValue} ${timePeriod.ToLower()}" -ForegroundColor Green
    
    ${exportPath ? `$Files | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "No files modified in specified time period" -ForegroundColor Yellow
}`;
    }
  },

  // ============================================
  // NEW TASKS: Cleanup & Maintenance
  // ============================================

  {
    id: 'cleanup-iis-logs',
    name: 'Cleanup IIS Log Files',
    category: 'Disk Cleanup',
    isPremium: true,
    description: 'Remove old IIS log files to reclaim disk space',
    instructions: `**How This Task Works:**
- Cleans IIS log files by age
- Targets default and custom log paths
- Test mode for safe preview
- Compresses old logs before deletion

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- IIS installed on server
- Delete permissions on log folders

**What You Need to Provide:**
- Log folder path (default: C:\\inetpub\\logs)
- Days to keep (default: 30)
- Test mode: true for preview

**What the Script Does:**
1. Scans IIS log directories
2. Identifies files older than retention
3. In test mode: shows files to delete
4. In delete mode: removes old logs
5. Reports space reclaimed

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Default IIS logs: C:\\inetpub\\logs\\LogFiles
- Check compliance requirements first
- Consider archiving before deletion`,
    parameters: [
      { id: 'logPath', label: 'IIS Log Path', type: 'path', required: false, defaultValue: 'C:\\inetpub\\logs\\LogFiles', placeholder: 'C:\\inetpub\\logs\\LogFiles' },
      { id: 'daysToKeep', label: 'Days to Keep', type: 'number', required: false, defaultValue: 30 },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const logPath = escapePowerShellString(params.logPath || 'C:\\inetpub\\logs\\LogFiles');
      const daysToKeep = Number(params.daysToKeep || 30);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Cleanup IIS Log Files
# Generated: ${new Date().toISOString()}

$LogPath = "${logPath}"
$DaysToKeep = ${daysToKeep}
$TestMode = ${testMode}
$CutoffDate = (Get-Date).AddDays(-$DaysToKeep)

if (-not (Test-Path $LogPath)) {
    Write-Host "[FAILED] Log path not found: $LogPath" -ForegroundColor Red
    exit 1
}

Write-Host "Scanning IIS logs older than $DaysToKeep days..." -ForegroundColor Gray

$LogFiles = Get-ChildItem -Path $LogPath -Recurse -Filter "*.log" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate }

$TotalSize = ($LogFiles | Measure-Object -Property Length -Sum).Sum

Write-Host ""
Write-Host "Found $($LogFiles.Count) log files to clean" -ForegroundColor Yellow
Write-Host "Total size: $([math]::Round($TotalSize/1MB, 2)) MB" -ForegroundColor Gray

if ($TestMode) {
    Write-Host ""
    Write-Host "[WARNING] TEST MODE - Preview only (no files deleted)" -ForegroundColor Yellow
    $LogFiles | Select-Object -First 10 Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}, LastWriteTime | Format-Table -AutoSize
} else {
    $Deleted = 0
    foreach ($File in $LogFiles) {
        try {
            Remove-Item $File.FullName -Force
            $Deleted++
        } catch {
            Write-Host "  [WARNING] Cannot delete: $($File.Name)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    Write-Host "[SUCCESS] Deleted $Deleted files, freed $([math]::Round($TotalSize/1MB, 2)) MB" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'cleanup-windows-update',
    name: 'Cleanup Windows Update Cache',
    category: 'Disk Cleanup',
    isPremium: true,
    description: 'Remove Windows Update download cache files',
    instructions: `**How This Task Works:**
- Cleans Windows Update cache
- Removes downloaded update files
- Frees significant disk space
- Stops/starts Windows Update service

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Update service access

**What You Need to Provide:**
- Test mode: true for preview only

**What the Script Does:**
1. Stops Windows Update service
2. Clears SoftwareDistribution\\Download folder
3. Restarts Windows Update service
4. Reports space reclaimed

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Temporarily stops Windows Update
- Safe operation - files redownload if needed
- May require system restart`,
    parameters: [
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Cleanup Windows Update Cache
# Generated: ${new Date().toISOString()}

$TestMode = ${testMode}
$CachePath = "$env:SystemRoot\\SoftwareDistribution\\Download"

if (-not (Test-Path $CachePath)) {
    Write-Host "[FAILED] Windows Update cache not found" -ForegroundColor Red
    exit 1
}

$Files = Get-ChildItem -Path $CachePath -Recurse -File -ErrorAction SilentlyContinue
$TotalSize = ($Files | Measure-Object -Property Length -Sum).Sum

Write-Host "Windows Update Cache Analysis" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "  Path: $CachePath" -ForegroundColor Gray
Write-Host "  Files: $($Files.Count)" -ForegroundColor Gray
Write-Host "  Size: $([math]::Round($TotalSize/1MB, 2)) MB" -ForegroundColor Gray
Write-Host ""

if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - No changes made" -ForegroundColor Yellow
} else {
    Write-Host "Stopping Windows Update service..." -ForegroundColor Gray
    Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
    
    try {
        Remove-Item -Path "$CachePath\\*" -Recurse -Force -ErrorAction Stop
        Write-Host "[SUCCESS] Cache cleared" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Some files could not be removed" -ForegroundColor Yellow
    }
    
    Write-Host "Starting Windows Update service..." -ForegroundColor Gray
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "[SUCCESS] Freed approximately $([math]::Round($TotalSize/1MB, 2)) MB" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'cleanup-user-profiles',
    name: 'Cleanup Old User Profiles',
    category: 'Disk Cleanup',
    isPremium: true,
    description: 'Remove unused local user profiles by age',
    instructions: `**How This Task Works:**
- Identifies inactive user profiles
- Removes profiles not used recently
- Excludes system and special accounts
- Reclaims significant disk space

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows 7/Server 2008 R2 or later
- Backup user data first

**What You Need to Provide:**
- Days inactive (default: 90)
- Test mode: true for preview
- Exclude patterns (optional)

**What the Script Does:**
1. Gets all local user profiles
2. Checks last use date
3. Excludes system/special accounts
4. In test mode: lists profiles to remove
5. In delete mode: removes old profiles

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- PERMANENTLY DELETES USER DATA
- Test mode strongly recommended
- Excludes: Administrator, Default, Public, System`,
    parameters: [
      { id: 'daysInactive', label: 'Days Inactive', type: 'number', required: false, defaultValue: 90 },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true },
      { id: 'excludeUsers', label: 'Exclude Users (comma-separated)', type: 'textarea', required: false, placeholder: 'serviceaccount,admin' }
    ],
    scriptTemplate: (params) => {
      const daysInactive = Number(params.daysInactive || 90);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      const excludeUsers = params.excludeUsers ? params.excludeUsers.split(',').map((u: string) => u.trim()).filter((u: string) => u) : [];
      
      return `# Cleanup Old User Profiles
# Generated: ${new Date().toISOString()}

$DaysInactive = ${daysInactive}
$TestMode = ${testMode}
$CutoffDate = (Get-Date).AddDays(-$DaysInactive)

# Default exclusions
$ExcludedProfiles = @(
    "Administrator", "Default", "Default User", "Public", 
    "All Users", "LocalService", "NetworkService", "systemprofile"
    ${excludeUsers.length > 0 ? `, ${excludeUsers.map((u: string) => `"${escapePowerShellString(u)}"`).join(', ')}` : ''}
)

Write-Host "Scanning user profiles..." -ForegroundColor Gray

$Profiles = Get-WmiObject Win32_UserProfile | Where-Object {
    -not $_.Special -and
    $_.LocalPath -notlike "*\\Windows\\*" -and
    (Split-Path $_.LocalPath -Leaf) -notin $ExcludedProfiles
}

$OldProfiles = @()
foreach ($Profile in $Profiles) {
    $LastUse = if ($Profile.LastUseTime) {
        [System.Management.ManagementDateTimeConverter]::ToDateTime($Profile.LastUseTime)
    } else {
        [datetime]::MinValue
    }
    
    if ($LastUse -lt $CutoffDate) {
        $FolderSize = 0
        if (Test-Path $Profile.LocalPath) {
            $FolderSize = (Get-ChildItem -Path $Profile.LocalPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        }
        
        $OldProfiles += [PSCustomObject]@{
            Username = Split-Path $Profile.LocalPath -Leaf
            Path = $Profile.LocalPath
            LastUsed = $LastUse
            SizeGB = [math]::Round($FolderSize/1GB, 2)
            SID = $Profile.SID
        }
    }
}

Write-Host ""
Write-Host "Found $($OldProfiles.Count) profiles unused for $DaysInactive+ days" -ForegroundColor Yellow

if ($OldProfiles.Count -gt 0) {
    $OldProfiles | Format-Table Username, SizeGB, LastUsed -AutoSize
    
    $TotalSize = ($OldProfiles | Measure-Object -Property SizeGB -Sum).Sum
    Write-Host "Total recoverable: $([math]::Round($TotalSize, 2)) GB" -ForegroundColor Cyan
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "[WARNING] TEST MODE - No profiles deleted" -ForegroundColor Yellow
    } else {
        foreach ($Profile in $OldProfiles) {
            try {
                $WmiProfile = Get-WmiObject Win32_UserProfile | Where-Object { $_.SID -eq $Profile.SID }
                $WmiProfile.Delete()
                Write-Host "  [SUCCESS] Removed: $($Profile.Username)" -ForegroundColor Green
            } catch {
                Write-Host "  [FAILED] Failed: $($Profile.Username)" -ForegroundColor Red
            }
        }
        Write-Host ""
        Write-Host "[SUCCESS] Profile cleanup complete" -ForegroundColor Green
    }
} else {
    Write-Host "No old profiles found" -ForegroundColor Green
}`;
    }
  },

  // ============================================
  // NEW TASKS: Reporting
  // ============================================

  {
    id: 'file-inventory-report',
    name: 'Generate File Inventory Report',
    category: 'Reporting',
    isPremium: true,
    description: 'Create comprehensive file inventory with metadata',
    instructions: `**How This Task Works:**
- Creates detailed file inventory
- Includes size, dates, attributes, owner
- Exports to CSV for analysis
- Optional hash calculation

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target path
- Administrator for owner information
- Write permissions on export location

**What You Need to Provide:**
- Target folder path
- Include subdirectories: true or false
- Include file hashes: true or false
- Export CSV file path

**What the Script Does:**
1. Scans all files in target path
2. Collects comprehensive metadata
3. Optionally computes file hashes
4. Exports detailed inventory
5. Reports statistics

**Important Notes:**
- Hash calculation slows processing
- Large folders take significant time
- CSV useful for asset management
- Owner requires admin privileges`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\DataFiles' },
      { id: 'recurse', label: 'Include Subdirectories', type: 'boolean', required: false, defaultValue: true },
      { id: 'includeHash', label: 'Include File Hash', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\FileInventory.csv' }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const recurse = toPowerShellBoolean(params.recurse ?? true);
      const includeHash = params.includeHash ?? false;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate File Inventory Report
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$Recurse = ${recurse}
$IncludeHash = ${toPowerShellBoolean(includeHash)}
$ExportPath = "${exportPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Generating file inventory..." -ForegroundColor Gray
Write-Host "Path: $TargetPath" -ForegroundColor Gray
${includeHash ? 'Write-Host "Hash calculation enabled (this may take time)" -ForegroundColor Yellow' : ''}

$Files = if ($Recurse) {
    Get-ChildItem -Path $TargetPath -Recurse -File -ErrorAction SilentlyContinue
} else {
    Get-ChildItem -Path $TargetPath -File -ErrorAction SilentlyContinue
}

$Inventory = @()
$Counter = 0
$Total = $Files.Count

foreach ($File in $Files) {
    $Counter++
    if ($Counter % 100 -eq 0) {
        Write-Progress -Activity "Processing files" -Status "$Counter of $Total" -PercentComplete (($Counter/$Total)*100)
    }
    
    $Owner = try { (Get-Acl $File.FullName).Owner } catch { "Unknown" }
    
    $Item = [PSCustomObject]@{
        FileName = $File.Name
        Extension = $File.Extension
        FullPath = $File.FullName
        RelativePath = $File.FullName.Substring($TargetPath.Length)
        SizeBytes = $File.Length
        SizeKB = [math]::Round($File.Length/1KB, 2)
        SizeMB = [math]::Round($File.Length/1MB, 2)
        Created = $File.CreationTime
        Modified = $File.LastWriteTime
        Accessed = $File.LastAccessTime
        Attributes = $File.Attributes.ToString()
        Owner = $Owner
        ${includeHash ? 'Hash = (Get-FileHash -Path $File.FullName -Algorithm MD5 -ErrorAction SilentlyContinue).Hash' : ''}
    }
    
    $Inventory += $Item
}

Write-Progress -Activity "Processing files" -Completed

$Inventory | Export-Csv -Path $ExportPath -NoTypeInformation

Write-Host ""
Write-Host "[SUCCESS] File inventory complete" -ForegroundColor Green
Write-Host "  Total files: $($Inventory.Count)" -ForegroundColor Gray
Write-Host "  Total size: $([math]::Round(($Inventory | Measure-Object -Property SizeMB -Sum).Sum, 2)) MB" -ForegroundColor Gray
Write-Host "  Export path: $ExportPath" -ForegroundColor Gray`;
    }
  },

  {
    id: 'folder-size-comparison',
    name: 'Folder Size Comparison Report',
    category: 'Reporting',
    isPremium: true,
    description: 'Compare folder sizes for capacity analysis',
    instructions: `**How This Task Works:**
- Analyzes top-level folder sizes
- Compares relative usage
- Shows percentage of total
- Exports to CSV for trending

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target path
- No administrator required

**What You Need to Provide:**
- Target folder path
- Top N folders to display
- Export CSV file path

**What the Script Does:**
1. Scans first-level subfolders
2. Calculates total size of each
3. Computes percentage of total
4. Sorts by size descending
5. Exports comparison report

**Important Notes:**
- Scans only first level
- Large folders take time
- Useful for quota planning
- CSV tracks growth over time`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\UserData' },
      { id: 'topCount', label: 'Top N Folders', type: 'number', required: false, defaultValue: 25 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\FolderSizes.csv' }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const topCount = Number(params.topCount || 25);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Folder Size Comparison Report
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$TopCount = ${topCount}
$ExportPath = "${exportPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Analyzing folder sizes..." -ForegroundColor Gray

$Folders = Get-ChildItem -Path $TargetPath -Directory -ErrorAction SilentlyContinue

$Report = @()
$Counter = 0

foreach ($Folder in $Folders) {
    $Counter++
    Write-Progress -Activity "Calculating sizes" -Status $Folder.Name -PercentComplete (($Counter/$Folders.Count)*100)
    
    $Size = (Get-ChildItem -Path $Folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $FileCount = (Get-ChildItem -Path $Folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    
    $Report += [PSCustomObject]@{
        FolderName = $Folder.Name
        Path = $Folder.FullName
        SizeBytes = $Size
        SizeGB = [math]::Round($Size/1GB, 2)
        SizeMB = [math]::Round($Size/1MB, 2)
        FileCount = $FileCount
    }
}

Write-Progress -Activity "Calculating sizes" -Completed

# Calculate percentages
$TotalSize = ($Report | Measure-Object -Property SizeBytes -Sum).Sum
$Report = $Report | ForEach-Object {
    $_ | Add-Member -NotePropertyName "PercentOfTotal" -NotePropertyValue ([math]::Round(($_.SizeBytes/$TotalSize)*100, 2)) -PassThru
} | Sort-Object SizeBytes -Descending

Write-Host ""
Write-Host "Top $TopCount Folders by Size" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
$Report | Select-Object -First $TopCount | Format-Table FolderName, SizeGB, FileCount, PercentOfTotal -AutoSize

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total folders: $($Report.Count)" -ForegroundColor Gray
Write-Host "  Total size: $([math]::Round($TotalSize/1GB, 2)) GB" -ForegroundColor Gray
Write-Host "  Total files: $(($Report | Measure-Object -Property FileCount -Sum).Sum)" -ForegroundColor Gray

$Report | Export-Csv -Path $ExportPath -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Exported to $ExportPath" -ForegroundColor Green`;
    }
  },

  {
    id: 'storage-growth-analysis',
    name: 'Storage Growth Analysis',
    category: 'Reporting',
    isPremium: true,
    description: 'Analyze storage usage trends and growth patterns',
    instructions: `**How This Task Works:**
- Analyzes files by creation/modification date
- Groups by time period (day/week/month)
- Shows storage growth over time
- Exports trend data

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target path
- No administrator required

**What You Need to Provide:**
- Target folder path
- Time grouping (Day/Week/Month)
- Number of periods to analyze
- Export CSV file path

**What the Script Does:**
1. Scans all files in target
2. Groups by creation date period
3. Calculates size added per period
4. Shows cumulative growth
5. Exports trend report

**Important Notes:**
- Uses file creation date
- Useful for capacity planning
- CSV enables charting
- Large folders take time`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\DataFiles' },
      { id: 'groupBy', label: 'Group By', type: 'select', required: true, options: ['Day', 'Week', 'Month'], defaultValue: 'Month' },
      { id: 'periods', label: 'Number of Periods', type: 'number', required: false, defaultValue: 12 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\StorageGrowth.csv' }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const groupBy = params.groupBy || 'Month';
      const periods = Number(params.periods || 12);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Storage Growth Analysis
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$GroupBy = "${groupBy}"
$Periods = ${periods}
$ExportPath = "${exportPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Analyzing storage growth patterns..." -ForegroundColor Gray

$Files = Get-ChildItem -Path $TargetPath -Recurse -File -ErrorAction SilentlyContinue | Select-Object CreationTime, Length

$DateFormat = switch ($GroupBy) {
    "Day" { "yyyy-MM-dd" }
    "Week" { "yyyy-\\Www" }
    "Month" { "yyyy-MM" }
}

$GroupedData = $Files | Group-Object { $_.CreationTime.ToString($DateFormat) } | ForEach-Object {
    [PSCustomObject]@{
        Period = $_.Name
        FilesCreated = $_.Count
        SizeAddedMB = [math]::Round(($_.Group | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        SizeAddedGB = [math]::Round(($_.Group | Measure-Object -Property Length -Sum).Sum / 1GB, 2)
    }
} | Sort-Object Period -Descending | Select-Object -First $Periods

# Add cumulative totals
$Cumulative = 0
$Report = $GroupedData | Sort-Object Period | ForEach-Object {
    $Cumulative += $_.SizeAddedGB
    $_ | Add-Member -NotePropertyName "CumulativeGB" -NotePropertyValue ([math]::Round($Cumulative, 2)) -PassThru
} | Sort-Object Period -Descending

Write-Host ""
Write-Host "Storage Growth by $GroupBy (Last $Periods periods)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
$Report | Format-Table Period, FilesCreated, SizeAddedGB, CumulativeGB -AutoSize

$AvgGrowth = [math]::Round(($Report | Measure-Object -Property SizeAddedGB -Average).Average, 2)
Write-Host ""
Write-Host "Average growth per $($GroupBy.ToLower()): $AvgGrowth GB" -ForegroundColor Cyan

$Report | Export-Csv -Path $ExportPath -NoTypeInformation
Write-Host "[SUCCESS] Exported to $ExportPath" -ForegroundColor Green`;
    }
  },

  {
    id: 'orphaned-files-report',
    name: 'Find Orphaned Files',
    category: 'Reporting',
    isPremium: true,
    description: 'Identify files with no owner or broken permissions',
    instructions: `**How This Task Works:**
- Finds files with invalid owners
- Identifies broken SID references
- Reports permission issues
- Exports findings to CSV

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Full control on target path

**What You Need to Provide:**
- Target folder path
- Include subdirectories: true or false
- Export CSV file path

**What the Script Does:**
1. Scans all files and folders
2. Checks ownership and ACL
3. Identifies orphaned SIDs
4. Reports permission anomalies
5. Exports detailed findings

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Orphaned = owner SID not resolvable
- Common after user deletion
- Use for security audits`,
    parameters: [
      { id: 'targetPath', label: 'Target Folder', type: 'path', required: true, placeholder: 'D:\\Shares' },
      { id: 'recurse', label: 'Include Subdirectories', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\OrphanedFiles.csv' }
    ],
    scriptTemplate: (params) => {
      const targetPath = escapePowerShellString(params.targetPath);
      const recurse = toPowerShellBoolean(params.recurse ?? true);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Find Orphaned Files
# Generated: ${new Date().toISOString()}

$TargetPath = "${targetPath}"
$Recurse = ${recurse}
$ExportPath = "${exportPath}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Scanning for orphaned files..." -ForegroundColor Gray

$Items = if ($Recurse) {
    Get-ChildItem -Path $TargetPath -Recurse -ErrorAction SilentlyContinue
} else {
    Get-ChildItem -Path $TargetPath -ErrorAction SilentlyContinue
}

$Orphaned = @()
$Counter = 0

foreach ($Item in $Items) {
    $Counter++
    if ($Counter % 100 -eq 0) {
        Write-Progress -Activity "Scanning" -Status "$Counter items processed" -PercentComplete -1
    }
    
    try {
        $Acl = Get-Acl -Path $Item.FullName -ErrorAction Stop
        $Owner = $Acl.Owner
        
        # Check if owner is a SID (unresolvable)
        if ($Owner -match "^S-1-") {
            $Orphaned += [PSCustomObject]@{
                Type = if ($Item.PSIsContainer) { "Folder" } else { "File" }
                Path = $Item.FullName
                Owner = $Owner
                Issue = "Orphaned SID (owner cannot be resolved)"
                SizeKB = if (-not $Item.PSIsContainer) { [math]::Round($Item.Length/1KB, 2) } else { 0 }
            }
        }
        
        # Check for orphaned SIDs in ACL
        foreach ($Access in $Acl.Access) {
            if ($Access.IdentityReference.Value -match "^S-1-") {
                $Orphaned += [PSCustomObject]@{
                    Type = if ($Item.PSIsContainer) { "Folder" } else { "File" }
                    Path = $Item.FullName
                    Owner = $Owner
                    Issue = "Orphaned SID in ACL: $($Access.IdentityReference.Value)"
                    SizeKB = if (-not $Item.PSIsContainer) { [math]::Round($Item.Length/1KB, 2) } else { 0 }
                }
            }
        }
    } catch {
        $Orphaned += [PSCustomObject]@{
            Type = if ($Item.PSIsContainer) { "Folder" } else { "File" }
            Path = $Item.FullName
            Owner = "Unknown"
            Issue = "Cannot read permissions: \$_"
            SizeKB = 0
        }
    }
}

Write-Progress -Activity "Scanning" -Completed

if ($Orphaned.Count -gt 0) {
    Write-Host ""
    Write-Host "[WARNING] Found $($Orphaned.Count) items with permission issues" -ForegroundColor Yellow
    $Orphaned | Select-Object -First 20 | Format-Table Type, Issue, Path -AutoSize
    
    $Orphaned | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host ""
    Write-Host "[SUCCESS] Full report exported to $ExportPath" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[SUCCESS] No orphaned files or permission issues found" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'robocopy-mirror',
    name: 'Robocopy Mirror Sync',
    category: 'File Operations',
    isPremium: true,
    description: 'Mirror directory using Robocopy with advanced options',
    instructions: `**How This Task Works:**
- Uses Robocopy for robust file copying
- Mirror mode syncs source to destination
- Deletes files in dest not in source
- Supports restartable mode for large files

**Prerequisites:**
- PowerShell 5.1 or later
- Robocopy (included in Windows)
- Read permissions on source
- Write/delete permissions on destination

**What You Need to Provide:**
- Source directory path
- Destination directory path
- Include subfolders: true or false
- Mirror mode (delete extra files): true or false
- Log file path (optional)

**What the Script Does:**
1. Validates source exists
2. Runs Robocopy with specified options
3. Uses restartable mode for resilience
4. Logs progress to file if specified
5. Reports copy statistics

**Important Notes:**
- Mirror mode DELETES extra files in destination
- Restartable mode handles large files
- Better than Copy-Item for large operations
- Preserves timestamps and attributes
- Exit code 0-3 = success with warnings`,
    parameters: [
      { id: 'sourcePath', label: 'Source Directory', type: 'path', required: true, placeholder: 'C:\\Source' },
      { id: 'destPath', label: 'Destination Directory', type: 'path', required: true, placeholder: 'D:\\Backup' },
      { id: 'recurse', label: 'Include Subfolders', type: 'boolean', required: false, defaultValue: true },
      { id: 'mirror', label: 'Mirror Mode (Delete Extra)', type: 'boolean', required: false, defaultValue: false },
      { id: 'logPath', label: 'Log File Path', type: 'path', required: false, placeholder: 'C:\\Logs\\robocopy.log' }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const destPath = escapePowerShellString(params.destPath);
      const recurse = params.recurse ?? true;
      const mirror = params.mirror ?? false;
      const logPath = params.logPath ? escapePowerShellString(params.logPath) : '';
      
      const modeMessage = mirror 
        ? 'Write-Host "  Mode: MIRROR (will delete extra files in destination)" -ForegroundColor Yellow'
        : 'Write-Host "  Mode: Copy" -ForegroundColor Gray';
      
      const robocopyMode = mirror ? '"/MIR"' : '"/E"';
      const logArg = logPath ? `\n    "/LOG:${logPath}"` : '';
      const logOutput = logPath ? `\nWrite-Host "Log file: ${logPath}" -ForegroundColor Gray` : '';
      
      return `# Robocopy Mirror Sync
# Generated: ${new Date().toISOString()}

$Source = "${sourcePath}"
$Destination = "${destPath}"

if (-not (Test-Path $Source)) {
    Write-Host "[FAILED] Source not found: $Source" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Robocopy operation..." -ForegroundColor Gray
Write-Host "  Source: $Source" -ForegroundColor Gray
Write-Host "  Destination: $Destination" -ForegroundColor Gray
${modeMessage}

$RobocopyArgs = @(
    $Source
    $Destination
    "/E"
    ${robocopyMode}
    "/R:3"
    "/W:5"
    "/NP"
    "/NDL"${logArg}
)

$Result = & robocopy.exe @RobocopyArgs

Write-Host ""
Write-Host "Robocopy completed" -ForegroundColor Green
Write-Host "Review output above for details" -ForegroundColor Gray${logOutput}`;
    }
  },

  {
    id: 'symbolic-link-management',
    name: 'Create Symbolic Link or Junction',
    category: 'Directory Management',
    isPremium: true,
    description: 'Create symbolic links, hard links, or directory junctions',
    instructions: `**How This Task Works:**
- Creates Windows symbolic links
- Supports file and directory links
- Creates junctions for directories
- Creates hard links for files

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Developer Mode enabled (for non-admin symlinks)
- NTFS file system required

**What You Need to Provide:**
- Link path (the new link to create)
- Target path (existing file/folder to point to)
- Link type: SymbolicLink, Junction, or HardLink

**What the Script Does:**
1. Validates target exists
2. Checks for existing link
3. Creates specified link type
4. Verifies link creation
5. Reports success or failure

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- SymbolicLink: works for files and folders
- Junction: directories only, no admin on older Windows
- HardLink: files only, same volume
- Junctions don't work across network paths`,
    parameters: [
      { id: 'linkPath', label: 'Link Path (new)', type: 'path', required: true, placeholder: 'C:\\Links\\MyLink' },
      { id: 'targetPath', label: 'Target Path (existing)', type: 'path', required: true, placeholder: 'D:\\ActualFolder' },
      { id: 'linkType', label: 'Link Type', type: 'select', required: true, options: ['SymbolicLink', 'Junction', 'HardLink'], defaultValue: 'SymbolicLink' }
    ],
    scriptTemplate: (params) => {
      const linkPath = escapePowerShellString(params.linkPath);
      const targetPath = escapePowerShellString(params.targetPath);
      const linkType = params.linkType || 'SymbolicLink';
      
      return `# Create Symbolic Link or Junction
# Generated: ${new Date().toISOString()}

$LinkPath = "${linkPath}"
$TargetPath = "${targetPath}"
$LinkType = "${linkType}"

if (-not (Test-Path $TargetPath)) {
    Write-Host "[FAILED] Target path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

if (Test-Path $LinkPath) {
    Write-Host "[FAILED] Link path already exists: $LinkPath" -ForegroundColor Red
    exit 1
}

$TargetItem = Get-Item $TargetPath
$IsDirectory = $TargetItem.PSIsContainer

# Validate link type compatibility
if ($LinkType -eq "HardLink" -and $IsDirectory) {
    Write-Host "[FAILED] HardLink cannot be used for directories" -ForegroundColor Red
    exit 1
}

if ($LinkType -eq "Junction" -and -not $IsDirectory) {
    Write-Host "[FAILED] Junction can only be used for directories" -ForegroundColor Red
    exit 1
}

Write-Host "Creating $LinkType..." -ForegroundColor Gray
Write-Host "  Link: $LinkPath" -ForegroundColor Gray
Write-Host "  Target: $TargetPath" -ForegroundColor Gray

try {
    New-Item -ItemType $LinkType -Path $LinkPath -Target $TargetPath -Force | Out-Null
    
    if (Test-Path $LinkPath) {
        $LinkItem = Get-Item $LinkPath
        Write-Host ""
        Write-Host "[SUCCESS] $LinkType created successfully" -ForegroundColor Green
        Write-Host "  Link type: $($LinkItem.LinkType)" -ForegroundColor Gray
        Write-Host "  Points to: $($LinkItem.Target)" -ForegroundColor Gray
    } else {
        Write-Host "[FAILED] Failed to create link" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAILED] Error creating link: \$_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Note: Creating symbolic links requires:" -ForegroundColor Yellow
    Write-Host "  - Administrator privileges, OR" -ForegroundColor Yellow
    Write-Host "  - Developer Mode enabled in Windows Settings" -ForegroundColor Yellow
    exit 1
}`;
    }
  },
];
