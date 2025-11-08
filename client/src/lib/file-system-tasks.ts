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
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "✓ Created directory: $Path" -ForegroundColor Green
}

# Create share
New-SmbShare -Name $ShareName -Path $Path${description ? ` -Description "${description}"` : ''} -FullAccess "Everyone" -ErrorAction Stop

Write-Host "✓ Share created: $ShareName" -ForegroundColor Green

${fullAccess.length > 0 ? `# Grant Full Access
${fullAccess.map((u: string) => `Grant-SmbShareAccess -Name $ShareName -AccountName "${escapePowerShellString(u)}" -AccessRight Full -Force | Out-Null`).join('\n')}
Write-Host "✓ Full access granted" -ForegroundColor Green` : ''}

${readAccess.length > 0 ? `# Grant Read Access
${readAccess.map((u: string) => `Grant-SmbShareAccess -Name $ShareName -AccountName "${escapePowerShellString(u)}" -AccessRight Read -Force | Out-Null`).join('\n')}
Write-Host "✓ Read access granted" -ForegroundColor Green` : ''}

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
Write-Host "✓ Share removed: $ShareName" -ForegroundColor Green

${deleteFiles ? `# WARNING: Deleting files
if (Test-Path $SharePath) {
    Remove-Item $SharePath -Recurse -Force
    Write-Host "⚠ Files deleted: $SharePath" -ForegroundColor Yellow
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
Write-Host "✓ Permissions report exported: ${exportPath}" -ForegroundColor Green
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
        Write-Host "  ⚠ Error: $($Item.FullName)" -ForegroundColor Red
    }
}

Write-Host "✓ Processed $($Items.Count) items, fixed $Fixed broken inheritance" -ForegroundColor Green
${testMode ? 'Write-Host "  ⚠ TEST MODE - No changes made" -ForegroundColor Yellow' : ''}`;
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
        Write-Host "  ⚠ Failed: $($Item.FullName)" -ForegroundColor Red
    }
}

Write-Host "✓ Ownership set for $Count items to ${owner}" -ForegroundColor Green`;
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
    Write-Host "⚠ ALERT: Drives above ${threshold}% usage:" -ForegroundColor Red
    $Alerts | ForEach-Object {
        Write-Host "  $($_.DeviceID) - $(100 - $_.PercentFree)% used ($($_.FreeGB)GB free)" -ForegroundColor Yellow
    }
}

${exportPath ? `$Disks | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
Write-Host "✓ Found $($Files.Count) files larger than ${minSize}MB" -ForegroundColor Green
Write-Host "  Total size: $([math]::Round(($Files | Measure-Object -Property SizeMB -Sum).Sum, 2)) MB" -ForegroundColor Gray

${exportPath ? `$Files | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "⚠ TEST MODE - Preview only (no files deleted)" -ForegroundColor Yellow
    $Files | Select-Object -First 10 FullName, LastWriteTime | Format-Table -AutoSize
} else {
    $Files | Remove-Item -Force
    Write-Host "✓ Deleted $($Files.Count) files, freed $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Green
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
Write-Host "✓ Cleaned Windows Temp: $($Files.Count) files" -ForegroundColor Green

${includeUsers ? `# Clean User Temp Folders
$UserProfiles = Get-ChildItem "C:\\Users" -Directory -ErrorAction SilentlyContinue
foreach ($User in $UserProfiles) {
    $UserTemp = Join-Path $User.FullName "AppData\\Local\\Temp"
    if (Test-Path $UserTemp) {
        $Files = Get-ChildItem -Path $UserTemp -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate }
        $TotalSize += ($Files | Measure-Object -Property Length -Sum).Sum
        $Files | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Cleaned $($User.Name): $($Files.Count) files" -ForegroundColor Green
    }
}` : ''}

Write-Host ""
Write-Host "✓ Total space freed: $([math]::Round($TotalSize/1MB, 2)) MB" -ForegroundColor Green`;
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
    Write-Host "✓ Quota enforcement enabled (deny over limit)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Quota tracking enabled (warn only)" -ForegroundColor Green
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
Write-Host "✓ Analysis complete" -ForegroundColor Green
Write-Host "  Total files: $($Files.Count)" -ForegroundColor Gray
Write-Host "  Total size: $([math]::Round(($Files | Measure-Object -Property Length -Sum).Sum/1GB, 2)) GB" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "⚠ Found $($Duplicates.Count) sets of duplicate files" -ForegroundColor Yellow
    $WastedSpace = 0
    
    foreach ($Dup in $Duplicates) {
        $WastedSpace += ($Dup.Group | Select-Object -Skip 1 | Measure-Object -Property SizeMB -Sum).Sum
        Write-Host ""
        Write-Host "Duplicate set ($($Dup.Group[0].SizeMB) MB):" -ForegroundColor Cyan
        $Dup.Group | ForEach-Object { Write-Host "  $($_.Path)" -ForegroundColor Gray }
    }
    
    Write-Host ""
    Write-Host "✓ Potential space savings: $([math]::Round($WastedSpace, 2)) MB" -ForegroundColor Green
    
    ${exportPath ? `$Duplicates | ForEach-Object { $_.Group } | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "✓ No duplicates found" -ForegroundColor Green
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
    Write-Host "✗ Source path not found: $Source" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -Path $Destination -ItemType Directory -Force | Out-Null
    Write-Host "✓ Created destination folder" -ForegroundColor Green
}

Write-Host "Copying from $Source to $Destination..." -ForegroundColor Gray

try {
    Copy-Item -Path $Source -Destination $Destination ${recurse === '$true' ? '-Recurse' : ''} ${overwrite === '$true' ? '-Force' : ''} -ErrorAction Stop
    Write-Host "✓ Copy completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Copy failed: $_" -ForegroundColor Red
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
    Write-Host "✗ Path not found: $Target" -ForegroundColor Red
    exit 1
}

Write-Host "⚠ WARNING: The following will be PERMANENTLY deleted:" -ForegroundColor Yellow
if (${recurse}) {
    Get-ChildItem -Path $Target -Recurse | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    $ItemCount = (Get-ChildItem -Path $Target -Recurse | Measure-Object).Count
    Write-Host "  ... and $($ItemCount - 10) more items" -ForegroundColor Gray
} else {
    Write-Host "  $Target" -ForegroundColor Gray
}

$Confirm = Read-Host "Type 'DELETE' to confirm permanent deletion"
if ($Confirm -ne 'DELETE') {
    Write-Host "✓ Deletion cancelled" -ForegroundColor Green
    exit 0
}

try {
    Remove-Item -Path $Target ${recurse === '$true' ? '-Recurse' : ''} ${force === '$true' ? '-Force' : ''} -ErrorAction Stop
    Write-Host "✓ Successfully deleted: $Target" -ForegroundColor Green
} catch {
    Write-Host "✗ Deletion failed: $_" -ForegroundColor Red
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
    Write-Host "✗ Search path not found: $SearchPath" -ForegroundColor Red
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
    Write-Host "✓ Found $($Results.Count) matching files:" -ForegroundColor Green
    $Results | Format-Table -AutoSize
    
    ${exportPath ? `$Results | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}
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
    Write-Host "✗ Folder not found: $FolderPath" -ForegroundColor Red
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
    Write-Host "✓ Folder size analysis complete:" -ForegroundColor Green
    $Results | Format-Table FolderName, SizeGB, SizeMB, FileCount -AutoSize
    
    $TotalSize = ($Results | Measure-Object -Property SizeGB -Sum).Sum
    Write-Host ""
    Write-Host "Total size: $([math]::Round($TotalSize, 2)) GB" -ForegroundColor Cyan
    
    ${exportPath ? `$Results | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}
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
    Write-Host "✗ Source path not found: $Source" -ForegroundColor Red
    exit 1
}

# Remove existing ZIP if present
if (Test-Path $Destination) {
    Remove-Item $Destination -Force
    Write-Host "⚠ Removed existing ZIP file" -ForegroundColor Yellow
}

Write-Host "Compressing to ZIP archive..." -ForegroundColor Gray

try {
    $OriginalSize = (Get-ChildItem -Path $Source -Recurse -File | Measure-Object -Property Length -Sum).Sum
    
    Compress-Archive -Path $Source -DestinationPath $Destination -CompressionLevel $CompressionLevel -ErrorAction Stop
    
    $CompressedSize = (Get-Item $Destination).Length
    $Ratio = [math]::Round((1 - ($CompressedSize / $OriginalSize)) * 100, 1)
    
    Write-Host ""
    Write-Host "✓ ZIP archive created successfully" -ForegroundColor Green
    Write-Host "  Original size: $([math]::Round($OriginalSize/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Compressed size: $([math]::Round($CompressedSize/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Compression ratio: $Ratio%" -ForegroundColor Cyan
    Write-Host "  Location: $Destination" -ForegroundColor Gray
} catch {
    Write-Host "✗ Compression failed: $_" -ForegroundColor Red
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
    Write-Host "✗ ZIP file not found: $ZipFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -Path $Destination -ItemType Directory -Force | Out-Null
    Write-Host "✓ Created destination folder" -ForegroundColor Green
}

Write-Host "Extracting ZIP archive..." -ForegroundColor Gray

try {
    Expand-Archive -Path $ZipFile -DestinationPath $Destination ${overwrite === '$true' ? '-Force' : ''} -ErrorAction Stop
    
    $FileCount = (Get-ChildItem -Path $Destination -Recurse -File | Measure-Object).Count
    
    Write-Host ""
    Write-Host "✓ Extraction complete" -ForegroundColor Green
    Write-Host "  Files extracted: $FileCount" -ForegroundColor Gray
    Write-Host "  Location: $Destination" -ForegroundColor Gray
} catch {
    Write-Host "✗ Extraction failed: $_" -ForegroundColor Red
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
    Write-Host "✗ Directory not found: $Directory" -ForegroundColor Red
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
    Write-Host "✓ Found $($Files.Count) files:" -ForegroundColor Green
    $Files | Format-Table -AutoSize
    
    $TotalSize = ($Files | Measure-Object -Property SizeMB -Sum).Sum
    Write-Host ""
    Write-Host "Total size: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Cyan
    
    ${exportPath ? `$Files | Export-Csv "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}
} else {
    Write-Host "No files found" -ForegroundColor Yellow
}`;
    }
  },
];
