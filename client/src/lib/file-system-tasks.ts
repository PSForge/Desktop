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
];
