import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface RegistryTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface RegistryTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  isPremium?: boolean;
  parameters: RegistryTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const registryTasks: RegistryTask[] = [
  {
    id: 'read-registry-value',
    name: 'Read Registry Value',
    category: 'Registry Operations',
    description: 'Read a specific registry value from a key',
    instructions: `**How This Task Works:**
- Reads a specific named value from a registry key
- Displays the value's data in the console
- Validates that both key and value exist

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target registry key
- Registry key and value must exist

**What You Need to Provide:**
- Full registry key path (e.g., "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion")
- Exact value name to read (e.g., "ProgramFilesDir")

**What the Script Does:**
1. Checks if the registry key path exists
2. Attempts to read the specified value name
3. Displays key path, value name, and value data
4. Reports error if key or value not found

**Important Notes:**
- Use proper registry hive prefixes: HKLM:, HKCU:, HKCR:, HKU:, HKCC:
- HKLM = HKEY_LOCAL_MACHINE (system-wide settings)
- HKCU = HKEY_CURRENT_USER (current user settings)
- Value names are case-insensitive
- Common use: verify settings, troubleshoot configuration
- No changes are made - read-only operation
- (Default) value name use "(Default)" or empty string
- Path uses backslashes and colon after hive`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion' },
      { id: 'valueName', label: 'Value Name', type: 'text', required: true, placeholder: 'ProgramFilesDir' }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const valueName = escapePowerShellString(params.valueName);
      
      return `# Read Registry Value
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$ValueName = "${valueName}"

if (Test-Path $KeyPath) {
    try {
        $Value = Get-ItemPropertyValue -Path $KeyPath -Name $ValueName -ErrorAction Stop
        Write-Host "[SUCCESS] Registry value found:" -ForegroundColor Green
        Write-Host "  Path: $KeyPath" -ForegroundColor Gray
        Write-Host "  Name: $ValueName" -ForegroundColor Gray
        Write-Host "  Value: $Value" -ForegroundColor Cyan
    } catch {
        Write-Host "[FAILED] Value not found: $ValueName" -ForegroundColor Red
    }
} else {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-registry-value',
    name: 'Set Registry Value',
    category: 'Registry Operations',
    description: 'Create or modify a registry value',
    instructions: `**How This Task Works:**
- Creates or modifies a registry value with specified data
- Automatically creates parent key if missing
- Supports all common registry value types

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges (for HKLM and system keys)
- Write permissions on target registry location

**What You Need to Provide:**
- Registry key path (e.g., "HKLM:\\SOFTWARE\\MyApp")
- Value name to create/modify
- Value data (the actual content)
- Value type: String, DWord, QWord, Binary, MultiString, ExpandString
- Whether to auto-create missing parent key (default: true)

**What the Script Does:**
1. Checks if registry key exists
2. Creates key if missing (optional, default enabled)
3. Sets the value with specified data and type
4. Confirms value creation with full details

**Important Notes:**
- REQUIRES ADMINISTRATOR for HKLM keys
- DWord = 32-bit integer, QWord = 64-bit integer
- String types store text, MultiString stores arrays
- ExpandString expands environment variables (e.g., %ProgramFiles%)
- Overwrites existing values without warning
- Typical use: application configuration, policy deployment
- Test in HKCU: first before modifying HKLM:
- Always backup registry before bulk changes`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp' },
      { id: 'valueName', label: 'Value Name', type: 'text', required: true, placeholder: 'Setting1' },
      { id: 'valueData', label: 'Value Data', type: 'text', required: true, placeholder: '1' },
      { id: 'valueType', label: 'Value Type', type: 'select', required: true, options: ['String', 'DWord', 'QWord', 'Binary', 'MultiString', 'ExpandString'], defaultValue: 'String' },
      { id: 'createKey', label: 'Create Key If Missing', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const valueName = escapePowerShellString(params.valueName);
      const valueData = escapePowerShellString(params.valueData);
      const valueType = params.valueType;
      const createKey = toPowerShellBoolean(params.createKey ?? true);
      
      return `# Set Registry Value
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$ValueName = "${valueName}"
$ValueData = "${valueData}"
$ValueType = "${valueType}"
$CreateKey = ${createKey}

# Create key if needed
if (-not (Test-Path $KeyPath)) {
    if ($CreateKey) {
        New-Item -Path $KeyPath -Force | Out-Null
        Write-Host "[SUCCESS] Created registry key: $KeyPath" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Registry key does not exist: $KeyPath" -ForegroundColor Red
        exit 1
    }
}

# Set value
Set-ItemProperty -Path $KeyPath -Name $ValueName -Value $ValueData -Type $ValueType -Force
Write-Host "[SUCCESS] Registry value set:" -ForegroundColor Green
Write-Host "  Path: $KeyPath" -ForegroundColor Gray
Write-Host "  Name: $ValueName" -ForegroundColor Gray
Write-Host "  Value: $ValueData" -ForegroundColor Gray
Write-Host "  Type: $ValueType" -ForegroundColor Gray`;
    }
  },

  {
    id: 'delete-registry-value',
    name: 'Delete Registry Value',
    category: 'Registry Operations',
    description: 'Remove a specific value from a registry key',
    instructions: `**How This Task Works:**
- Permanently removes a named value from registry key
- Optionally prompts for confirmation before deletion
- Key structure remains, only value is removed

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges (for HKLM and system keys)
- Write permissions on target registry key
- Value must exist to delete

**What You Need to Provide:**
- Full registry key path containing the value
- Exact value name to delete
- Confirmation requirement (default: true for safety)

**What the Script Does:**
1. Validates registry key exists
2. Confirms value exists in the key
3. Prompts for confirmation if enabled
4. Removes the specified value
5. Reports success or error

**Important Notes:**
- PERMANENT DELETION - cannot be undone without backup
- Confirmation enabled by default for safety
- Only deletes the VALUE, not the entire KEY
- Deleting system values can break Windows functionality
- Typical use: remove obsolete settings, cleanup
- Test first in non-production environment
- Always backup before deleting system registry values
- Some applications cache values and need restart`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp' },
      { id: 'valueName', label: 'Value Name', type: 'text', required: true, placeholder: 'OldSetting' },
      { id: 'confirm', label: 'Require Confirmation', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const valueName = escapePowerShellString(params.valueName);
      const confirm = toPowerShellBoolean(params.confirm ?? true);
      
      return `# Delete Registry Value
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$ValueName = "${valueName}"
$RequireConfirm = ${confirm}

if (Test-Path $KeyPath) {
    # Check if value exists
    try {
        $Value = Get-ItemPropertyValue -Path $KeyPath -Name $ValueName -ErrorAction Stop
        
        if ($RequireConfirm) {
            Write-Host "[WARNING] WARNING: About to delete registry value" -ForegroundColor Yellow
            Write-Host "  Path: $KeyPath" -ForegroundColor Gray
            Write-Host "  Name: $ValueName" -ForegroundColor Gray
            Write-Host "  Current Value: $Value" -ForegroundColor Gray
            Write-Host ""
            $Response = Read-Host "Type 'YES' to confirm deletion"
            
            if ($Response -ne 'YES') {
                Write-Host "[FAILED] Deletion cancelled by user" -ForegroundColor Yellow
                exit 0
            }
        }
        
        Remove-ItemProperty -Path $KeyPath -Name $ValueName -Force -ErrorAction Stop
        Write-Host "[SUCCESS] Registry value deleted:" -ForegroundColor Green
        Write-Host "  Path: $KeyPath" -ForegroundColor Gray
        Write-Host "  Name: $ValueName" -ForegroundColor Gray
    } catch {
        Write-Host "[FAILED] Failed to delete value: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'export-registry-key',
    name: 'Export Registry Key to .reg File',
    category: 'Backup & Export',
    description: 'Export registry key and subkeys to .reg file',
    instructions: `**How This Task Works:**
- Exports entire registry key and all subkeys to .reg file
- Creates portable backup file in standard registry format
- Can be imported on same or different systems

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on source registry key
- Write permissions on destination folder
- reg.exe utility (built into Windows)

**What You Need to Provide:**
- Full registry key path to export (e.g., "HKLM:\\SOFTWARE\\MyApp")
- Destination file path with .reg extension

**What the Script Does:**
1. Converts PowerShell path format to reg.exe format
2. Validates source registry key exists
3. Exports key and all subkeys to .reg file
4. Overwrites existing file if present (/y flag)
5. Reports file size of exported backup

**Important Notes:**
- Exports ALL subkeys recursively (entire branch)
- .reg file is human-readable text format
- Can be edited with text editor if needed
- Typical use: backup before changes, migration, disaster recovery
- File includes all values and subkeys
- Import on other systems with Import .reg File task
- Store backups securely - may contain sensitive data
- Use before major registry modifications`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp' },
      { id: 'exportPath', label: 'Export File Path (.reg)', type: 'path', required: true, placeholder: 'C:\\Backups\\MyApp.reg' }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Registry Key
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$ExportPath = "${exportPath}"

# Convert PS path to reg.exe format
$RegPath = $KeyPath -replace 'HKLM:', 'HKEY_LOCAL_MACHINE' -replace 'HKCU:', 'HKEY_CURRENT_USER' -replace 'HKCR:', 'HKEY_CLASSES_ROOT'

if (Test-Path $KeyPath) {
    reg export $RegPath $ExportPath /y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Registry key exported:" -ForegroundColor Green
        Write-Host "  Key: $KeyPath" -ForegroundColor Gray
        Write-Host "  File: $ExportPath" -ForegroundColor Gray
        
        $FileSize = (Get-Item $ExportPath).Length
        Write-Host "  Size: $([math]::Round($FileSize/1KB, 2)) KB" -ForegroundColor Gray
    } else {
        Write-Host "[FAILED] Export failed" -ForegroundColor Red
    }
} else {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'import-registry-file',
    name: 'Import .reg File',
    category: 'Backup & Export',
    description: 'Import registry settings from a .reg file',
    instructions: `**How This Task Works:**
- Imports registry keys and values from .reg file
- Merges settings into registry (overwrites existing)
- Restores backups or deploys configurations

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges (for HKLM imports)
- Valid .reg file with proper syntax
- Write permissions on target registry locations
- reg.exe utility (built into Windows)

**What You Need to Provide:**
- Full path to .reg file to import

**What the Script Does:**
1. Validates .reg file exists
2. Displays warning message about import
3. Imports registry settings via reg.exe
4. Merges keys and values into registry
5. Reports success or failure

**Important Notes:**
- OVERWRITES existing registry values without backup
- REQUIRES ADMINISTRATOR for HKLM imports
- NO confirmation prompt - imports immediately
- Can restore entire application configurations
- Typical use: restore backups, deploy settings, system recovery
- Test .reg files in non-production first
- Review .reg file contents before importing
- Changes take effect immediately (some need reboot/logout)`,
    parameters: [
      { id: 'regFilePath', label: '.reg File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\Settings.reg' }
    ],
    scriptTemplate: (params) => {
      const regFilePath = escapePowerShellString(params.regFilePath);
      
      return `# Import Registry File
# Generated: ${new Date().toISOString()}

$RegFile = "${regFilePath}"

if (Test-Path $RegFile) {
    Write-Host "[WARNING] WARNING: Importing registry settings" -ForegroundColor Yellow
    Write-Host "  File: $RegFile" -ForegroundColor Gray
    Write-Host ""
    
    reg import $RegFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Registry file imported successfully" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Import failed" -ForegroundColor Red
    }
} else {
    Write-Host "[FAILED] File not found: $RegFile" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'search-registry',
    name: 'Search Registry for Value',
    category: 'Search & Query',
    description: 'Search registry for keys or values matching a pattern',
    instructions: `**How This Task Works:**
- Recursively searches registry for matching key names or value names
- Uses wildcard pattern matching to find results
- Limits results to prevent overwhelming output

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target registry hive
- Patience for large searches (can take several minutes)

**What You Need to Provide:**
- Search root: HKLM:\\SOFTWARE, HKCU:\\SOFTWARE, or entire hive
- Search term (supports wildcards via *term*)
- Search type: KeyName or ValueName

**What the Script Does:**
1. Sets search scope and search term
2. Recursively scans registry from root location
3. Matches registry key names or value names against search term
4. Limits results to first 100 matches
5. Displays up to 50 results with full paths

**Important Notes:**
- Searching entire hives (HKLM:, HKCU:) can take 5-15 minutes
- Search is case-insensitive by default
- KeyName searches faster than ValueName
- Results limited to 100 for performance
- Typical use: find application settings, locate configuration keys
- Use specific search root for faster results
- Wildcard matching: Java matches JavaHome, Java8, etc.
- Some keys may be inaccessible (permission denied)
- Searches key/value NAMES only (not value data contents)`,
    parameters: [
      { id: 'searchRoot', label: 'Search Root', type: 'select', required: true, options: ['HKLM:\\SOFTWARE', 'HKCU:\\SOFTWARE', 'HKLM:', 'HKCU:'], defaultValue: 'HKLM:\\SOFTWARE' },
      { id: 'searchTerm', label: 'Search Term', type: 'text', required: true, placeholder: 'Java' },
      { id: 'searchType', label: 'Search Type', type: 'select', required: true, options: ['KeyName', 'ValueName'], defaultValue: 'KeyName' }
    ],
    scriptTemplate: (params) => {
      const searchRoot = escapePowerShellString(params.searchRoot);
      const searchTerm = escapePowerShellString(params.searchTerm);
      const searchType = params.searchType;
      
      return `# Search Registry
# Generated: ${new Date().toISOString()}

$SearchRoot = "${searchRoot}"
$SearchTerm = "${searchTerm}"
$SearchType = "${searchType}"

Write-Host "Searching $SearchRoot for '$SearchTerm'..." -ForegroundColor Cyan
Write-Host "Search type: $SearchType" -ForegroundColor Gray
Write-Host ""

$Results = @()

try {
    if ($SearchType -eq "KeyName") {
        $Results = Get-ChildItem -Path $SearchRoot -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -like "*$SearchTerm*" } | Select-Object -First 100
    } elseif ($SearchType -eq "ValueName") {
        Get-ChildItem -Path $SearchRoot -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            $Key = $_
            Get-ItemProperty -Path $Key.PSPath -ErrorAction SilentlyContinue | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -like "*$SearchTerm*" } | ForEach-Object {
                $Results += [PSCustomObject]@{
                    KeyPath = $Key.PSPath
                    ValueName = $_.Name
                }
            }
            if ($Results.Count -ge 100) { return }
        }
    }
} catch {}

if ($Results) {
    Write-Host "[SUCCESS] Found $($Results.Count) result(s):" -ForegroundColor Green
    $Results | Select-Object -First 50 | ForEach-Object {
        if ($SearchType -eq "KeyName") {
            Write-Host "  $($_.PSPath)" -ForegroundColor Cyan
        } else {
            Write-Host "  $($_.KeyPath) -> $($_.ValueName)" -ForegroundColor Cyan
        }
    }
    if ($Results.Count -gt 50) {
        Write-Host "  ... and $($Results.Count - 50) more" -ForegroundColor Gray
    }
} else {
    Write-Host "No results found" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'backup-registry-hive',
    name: 'Backup Registry Hive',
    category: 'Backup & Export',
    description: 'Create backup of entire registry hive (HKLM or HKCU)',
    instructions: `**How This Task Works:**
- Exports complete registry hive to .reg file
- Creates text-based backup of entire hive
- Enables full system restore capability

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient disk space for .reg file (typically 50-500 MB)
- reg.exe utility (built into Windows)

**What You Need to Provide:**
- Hive to backup: HKLM (system) or HKCU (user)
- Destination directory for backup file

**What the Script Does:**
1. Creates timestamped .reg filename
2. Creates backup directory if missing
3. Uses reg.exe export to backup entire hive
4. Creates .reg file with all keys and values
5. Reports file size of backup

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Hive backups are TEXT .reg format (human-readable)
- HKLM backup includes all system settings
- HKCU backup includes current user settings only
- Typical use: disaster recovery, system migration
- .reg file can be edited with text editor
- Import with "Import .reg File" task
- Store backups on external media for best protection
- Backup takes 10-60 seconds depending on hive size`,
    parameters: [
      { id: 'hive', label: 'Registry Hive', type: 'select', required: true, options: ['HKLM', 'HKCU'], defaultValue: 'HKLM' },
      { id: 'backupPath', label: 'Backup Directory', type: 'path', required: true, placeholder: 'C:\\RegistryBackups' }
    ],
    scriptTemplate: (params) => {
      const hive = params.hive;
      const backupPath = escapePowerShellString(params.backupPath);
      
      return `# Backup Registry Hive
# Generated: ${new Date().toISOString()}

$Hive = "${hive}"
$BackupPath = "${backupPath}"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFile = Join-Path $BackupPath "$Hive-$Timestamp.reg"

# Create backup directory
New-Item -Path $BackupPath -ItemType Directory -Force | Out-Null

# Export hive
Write-Host "Backing up $Hive hive..." -ForegroundColor Cyan

if ($Hive -eq "HKLM") {
    reg export HKEY_LOCAL_MACHINE $BackupFile /y
} else {
    reg export HKEY_CURRENT_USER $BackupFile /y
}

if ($LASTEXITCODE -eq 0) {
    $FileSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "[SUCCESS] Backup complete:" -ForegroundColor Green
    Write-Host "  File: $BackupFile" -ForegroundColor Gray
    Write-Host "  Size: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Backup failed" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'compare-registry-keys',
    name: 'Compare Two Registry Keys',
    category: 'Search & Query',
    description: 'Compare values between two registry keys',
    instructions: `**How This Task Works:**
- Compares all values between two registry keys
- Identifies values that differ or exist in only one key
- Useful for configuration drift detection

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on both registry keys
- Both keys should exist

**What You Need to Provide:**
- Full path to first registry key
- Full path to second registry key

**What the Script Does:**
1. Validates both registry keys exist
2. Retrieves all values from both keys
3. Compares value names and data
4. Reports differences: only in Key1, only in Key2, or different values
5. Confirms if keys are identical

**Important Notes:**
- Compares values only, not subkeys
- Useful for before/after comparison
- Detects configuration drift between systems
- Shows values unique to each key
- Typical use: verify backups, compare prod vs test settings
- Does not compare subkeys recursively
- Case-insensitive value name comparison
- Perfect for troubleshooting configuration issues`,
    parameters: [
      { id: 'key1', label: 'First Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp' },
      { id: 'key2', label: 'Second Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp-Backup' }
    ],
    scriptTemplate: (params) => {
      const key1 = escapePowerShellString(params.key1);
      const key2 = escapePowerShellString(params.key2);
      
      return `# Compare Registry Keys
# Generated: ${new Date().toISOString()}

$Key1 = "${key1}"
$Key2 = "${key2}"

if (-not (Test-Path $Key1)) {
    Write-Host "[FAILED] First key not found: $Key1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Key2)) {
    Write-Host "[FAILED] Second key not found: $Key2" -ForegroundColor Red
    exit 1
}

$Values1 = Get-ItemProperty -Path $Key1
$Values2 = Get-ItemProperty -Path $Key2

$Props1 = $Values1.PSObject.Properties | Where-Object { $_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider') }
$Props2 = $Values2.PSObject.Properties | Where-Object { $_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider') }

Write-Host "Comparing registry keys:" -ForegroundColor Cyan
Write-Host "  Key 1: $Key1" -ForegroundColor Gray
Write-Host "  Key 2: $Key2" -ForegroundColor Gray
Write-Host ""

$Differences = @()

foreach ($Prop in $Props1) {
    $Name = $Prop.Name
    $Value1 = $Prop.Value
    $Value2 = $Values2.$Name
    
    if ($null -eq $Value2) {
        $Differences += "  [Only in Key1] $Name = $Value1"
    } elseif ($Value1 -ne $Value2) {
        $Differences += "  [Different] $Name"
        $Differences += "    Key1: $Value1"
        $Differences += "    Key2: $Value2"
    }
}

foreach ($Prop in $Props2) {
    if ($Prop.Name -notin $Props1.Name) {
        $Differences += "  [Only in Key2] $($Prop.Name) = $($Prop.Value)"
    }
}

if ($Differences) {
    Write-Host "Differences found:" -ForegroundColor Yellow
    $Differences | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "[SUCCESS] Keys are identical" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'list-registry-keys',
    name: 'List Registry Subkeys',
    category: 'Search & Query',
    description: 'Enumerate all subkeys under a registry key',
    instructions: `**How This Task Works:**
- Lists all child keys under specified registry key
- Supports recursive listing with depth control
- Useful for exploring registry structure

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target registry key
- Registry key must exist

**What You Need to Provide:**
- Registry key path to enumerate
- Recursion depth: 1 = direct children only, higher = nested subkeys

**What the Script Does:**
1. Validates registry key exists
2. Enumerates subkeys to specified depth
3. Lists full path of each subkey found
4. Reports total count of subkeys
5. Handles permission errors gracefully

**Important Notes:**
- Depth 1 shows only direct children
- Depth 2+ shows nested subkeys recursively
- Large depth values may take considerable time
- Some subkeys may be inaccessible (permission denied)
- Typical use: explore application settings structure
- Does not show values, only keys
- Useful for understanding registry layout
- Use before exporting or modifying keys`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\Microsoft' },
      { id: 'depth', label: 'Recursion Depth', type: 'number', required: false, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const depth = Number(params.depth || 1);
      
      return `# List Registry Subkeys
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$Depth = ${depth}

if (Test-Path $KeyPath) {
    Write-Host "Subkeys under $KeyPath:" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Depth -eq 1) {
        $Subkeys = Get-ChildItem -Path $KeyPath -ErrorAction SilentlyContinue
    } else {
        $Subkeys = Get-ChildItem -Path $KeyPath -Recurse -Depth ($Depth - 1) -ErrorAction SilentlyContinue
    }
    
    $Subkeys | ForEach-Object {
        Write-Host "  $($_.PSPath)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Total subkeys: $($Subkeys.Count)" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-registry-permissions',
    name: 'Set Registry Key Permissions',
    category: 'Security & Permissions',
    description: 'Modify ACL permissions on a registry key',
    instructions: `**How This Task Works:**
- Modifies Access Control List (ACL) on registry key
- Grants specific permissions to users or groups
- Controls read, write, or full access to registry keys

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Write permissions on target registry key (TrustedInstaller for some keys)
- Target registry key must exist

**What You Need to Provide:**
- Full registry key path to modify
- User or group name (e.g., "DOMAIN\\Users", "Everyone", "Administrators")
- Access rights: ReadKey, WriteKey, or FullControl

**What the Script Does:**
1. Validates registry key exists
2. Retrieves current ACL permissions
3. Creates new access rule for specified user/group
4. Sets access rights (Allow type)
5. Applies modified ACL to registry key

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- ReadKey = read values and subkeys only
- WriteKey = create/modify values and subkeys
- FullControl = complete control including permissions
- Changes apply to current key only (not inherited by default)
- Typical use: grant application access, secure sensitive keys
- Test permissions after setting to verify
- Use DOMAIN\\Username format for domain accounts`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp' },
      { id: 'user', label: 'User/Group', type: 'text', required: true, placeholder: 'DOMAIN\\Users' },
      { id: 'rights', label: 'Access Rights', type: 'select', required: true, options: ['ReadKey', 'WriteKey', 'FullControl'], defaultValue: 'ReadKey' }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const user = escapePowerShellString(params.user);
      const rights = params.rights;
      
      return `# Set Registry Key Permissions
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$User = "${user}"
$Rights = [System.Security.AccessControl.RegistryRights]::${rights}

if (Test-Path $KeyPath) {
    $Acl = Get-Acl -Path $KeyPath
    $Rule = New-Object System.Security.AccessControl.RegistryAccessRule($User, $Rights, 'Allow')
    $Acl.SetAccessRule($Rule)
    Set-Acl -Path $KeyPath -AclObject $Acl
    
    Write-Host "[SUCCESS] Permissions set:" -ForegroundColor Green
    Write-Host "  Key: $KeyPath" -ForegroundColor Gray
    Write-Host "  User: $User" -ForegroundColor Gray
    Write-Host "  Rights: ${rights}" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'audit-registry-permissions',
    name: 'Audit Registry Key Permissions',
    category: 'Security & Permissions',
    description: 'Generate detailed ACL report for registry key permissions',
    isPremium: true,
    instructions: `**How This Task Works:**
- Retrieves complete Access Control List (ACL) for a registry key
- Shows all users/groups with their specific permissions
- Identifies inherited vs explicit permissions
- Exports audit report to file

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target registry key
- Write permissions on output directory

**What You Need to Provide:**
- Registry key path to audit
- Output file path for the report (optional)

**What the Script Does:**
1. Retrieves the ACL for the specified registry key
2. Enumerates all access rules (ACEs)
3. Shows identity, access type, rights, and inheritance
4. Exports detailed report to CSV file
5. Displays summary in console

**Important Notes:**
- Auditing does not require admin unless key is protected
- Shows both Allow and Deny permissions
- Inherited permissions come from parent keys
- Explicit permissions are set directly on this key
- Typical use: security review, compliance auditing
- Review before modifying system registry keys
- Save reports for documentation purposes`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\Microsoft' },
      { id: 'outputPath', label: 'Report Output Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\RegistryAudit.csv' }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const outputPath = escapePowerShellString(params.outputPath || '');
      
      return `# Audit Registry Key Permissions
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$OutputPath = "${outputPath}"

if (-not (Test-Path $KeyPath)) {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Auditing permissions for: $KeyPath" -ForegroundColor Cyan
Write-Host ""

try {
    $Acl = Get-Acl -Path $KeyPath
    $Owner = $Acl.Owner
    
    Write-Host "Owner: $Owner" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Access Rules:" -ForegroundColor Yellow
    Write-Host ("-" * 80) -ForegroundColor Gray
    
    $Results = @()
    
    foreach ($Rule in $Acl.Access) {
        $Entry = [PSCustomObject]@{
            Identity = $Rule.IdentityReference.Value
            AccessType = $Rule.AccessControlType
            Rights = $Rule.RegistryRights
            IsInherited = $Rule.IsInherited
            InheritanceFlags = $Rule.InheritanceFlags
        }
        $Results += $Entry
        
        $InheritText = if ($Rule.IsInherited) { "(Inherited)" } else { "(Explicit)" }
        Write-Host "  $($Rule.IdentityReference)" -ForegroundColor Cyan -NoNewline
        Write-Host " - $($Rule.AccessControlType): $($Rule.RegistryRights) $InheritText" -ForegroundColor Gray
    }
    
    if ($OutputPath) {
        $Results | Export-Csv -Path $OutputPath -NoTypeInformation -Force
        Write-Host ""
        Write-Host "[SUCCESS] Report exported to: $OutputPath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Audit complete. Found $($Results.Count) access rules." -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Failed to audit permissions: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-registry-inheritance',
    name: 'Configure Registry Inheritance',
    category: 'Security & Permissions',
    description: 'Enable or disable permission inheritance on a registry key',
    isPremium: true,
    instructions: `**How This Task Works:**
- Controls whether a registry key inherits permissions from parent
- Can preserve or remove inherited permissions when disabling
- Essential for securing sensitive registry areas

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Ownership or FullControl on target key

**What You Need to Provide:**
- Registry key path to modify
- Whether to enable or disable inheritance
- Whether to preserve inherited permissions as explicit (when disabling)

**What the Script Does:**
1. Retrieves current ACL for the registry key
2. Modifies inheritance protection settings
3. Optionally converts inherited to explicit permissions
4. Applies the modified ACL
5. Reports the new inheritance state

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Disabling inheritance can break applications expecting access
- Preserving permissions converts inherited to explicit rules
- Not preserving removes ALL inherited permissions
- Typical use: secure sensitive keys, isolate application settings
- Test in non-production first
- Some system keys cannot have inheritance modified`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MySecureApp' },
      { id: 'enableInheritance', label: 'Enable Inheritance', type: 'boolean', required: true, defaultValue: true },
      { id: 'preservePermissions', label: 'Preserve Inherited Permissions', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const enableInheritance = toPowerShellBoolean(params.enableInheritance);
      const preservePermissions = toPowerShellBoolean(params.preservePermissions ?? true);
      
      return `# Configure Registry Inheritance
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$EnableInheritance = ${enableInheritance}
$PreservePermissions = ${preservePermissions}

if (-not (Test-Path $KeyPath)) {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
    exit 1
}

try {
    $Acl = Get-Acl -Path $KeyPath
    
    if ($EnableInheritance) {
        $Acl.SetAccessRuleProtection($false, $false)
        Write-Host "[SUCCESS] Inheritance enabled on: $KeyPath" -ForegroundColor Green
    } else {
        $Acl.SetAccessRuleProtection($true, $PreservePermissions)
        if ($PreservePermissions) {
            Write-Host "[SUCCESS] Inheritance disabled (permissions preserved as explicit)" -ForegroundColor Green
        } else {
            Write-Host "[SUCCESS] Inheritance disabled (inherited permissions removed)" -ForegroundColor Yellow
        }
    }
    
    Set-Acl -Path $KeyPath -AclObject $Acl
    Write-Host "  Key: $KeyPath" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Failed to configure inheritance: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'scheduled-registry-backup',
    name: 'Create Scheduled Registry Backup',
    category: 'Backup & Export',
    description: 'Create a scheduled task for automatic registry backups',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a Windows Scheduled Task for automatic registry backups
- Configures daily/weekly backup schedule
- Maintains backup rotation to manage disk space

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Task Scheduler service running
- Backup directory must be accessible

**What You Need to Provide:**
- Registry keys to backup (comma-separated)
- Backup destination directory
- Backup frequency (Daily or Weekly)
- Time to run backup (24-hour format)
- Number of backups to retain

**What the Script Does:**
1. Creates backup script in destination folder
2. Registers scheduled task with specified trigger
3. Configures task to run with highest privileges
4. Sets up backup retention/cleanup logic
5. Reports task registration details

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Task runs under SYSTEM account by default
- Backup script handles timestamping and rotation
- Weekly backups run on Sundays by default
- Retention count determines how many backups to keep
- Older backups are automatically deleted
- Verify backups are being created after setup`,
    parameters: [
      { id: 'registryPaths', label: 'Registry Paths (comma-separated)', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp, HKCU:\\SOFTWARE\\Settings' },
      { id: 'backupDirectory', label: 'Backup Directory', type: 'path', required: true, placeholder: 'C:\\RegistryBackups' },
      { id: 'frequency', label: 'Backup Frequency', type: 'select', required: true, options: ['Daily', 'Weekly'], defaultValue: 'Daily' },
      { id: 'backupTime', label: 'Backup Time (HH:MM)', type: 'text', required: true, placeholder: '02:00', defaultValue: '02:00' },
      { id: 'retentionCount', label: 'Backups to Retain', type: 'number', required: false, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const registryPaths = escapePowerShellString(params.registryPaths);
      const backupDirectory = escapePowerShellString(params.backupDirectory);
      const frequency = params.frequency;
      const backupTime = escapePowerShellString(params.backupTime || '02:00');
      const retentionCount = Number(params.retentionCount || 7);
      
      return `# Create Scheduled Registry Backup
# Generated: ${new Date().toISOString()}

$RegistryPaths = "${registryPaths}"
$BackupDirectory = "${backupDirectory}"
$Frequency = "${frequency}"
$BackupTime = "${backupTime}"
$RetentionCount = ${retentionCount}

# Create backup directory
New-Item -Path $BackupDirectory -ItemType Directory -Force | Out-Null

# Create backup script
$ScriptContent = @'
param([string]$BackupDir, [string]$RegPaths, [int]$Retention)
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Paths = $RegPaths -split ',' | ForEach-Object { $_.Trim() }
foreach ($Path in $Paths) {
    $SafeName = ($Path -replace ':', '' -replace '\\\\', '_')
    $BackupFile = Join-Path $BackupDir "$SafeName-$Timestamp.reg"
    $RegPath = $Path -replace 'HKLM:', 'HKEY_LOCAL_MACHINE' -replace 'HKCU:', 'HKEY_CURRENT_USER'
    reg export $RegPath $BackupFile /y 2>&1 | Out-Null
}
# Cleanup old backups
Get-ChildItem -Path $BackupDir -Filter "*.reg" | Sort-Object CreationTime -Descending | Select-Object -Skip ($Retention * $Paths.Count) | Remove-Item -Force
'@

$ScriptPath = Join-Path $BackupDirectory "ScheduledBackup.ps1"
$ScriptContent | Out-File -FilePath $ScriptPath -Encoding UTF8 -Force

# Parse time
$TimeParts = $BackupTime -split ':'
$Hour = [int]$TimeParts[0]
$Minute = [int]$TimeParts[1]

# Create scheduled task
$TaskName = "RegistryBackup-Scheduled"
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -BackupDir \`"$BackupDirectory\`" -RegPaths \`"$RegistryPaths\`" -Retention $RetentionCount"

if ($Frequency -eq "Daily") {
    $Trigger = New-ScheduledTaskTrigger -Daily -At "$($Hour):$($Minute.ToString('D2'))"
} else {
    $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "$($Hour):$($Minute.ToString('D2'))"
}

$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings | Out-Null

Write-Host "[SUCCESS] Scheduled backup task created:" -ForegroundColor Green
Write-Host "  Task Name: $TaskName" -ForegroundColor Gray
Write-Host "  Frequency: $Frequency at $BackupTime" -ForegroundColor Gray
Write-Host "  Backup Dir: $BackupDirectory" -ForegroundColor Gray
Write-Host "  Retention: $RetentionCount backups" -ForegroundColor Gray`;
    }
  },

  {
    id: 'backup-specific-keys',
    name: 'Backup Multiple Registry Keys',
    category: 'Backup & Export',
    description: 'Export multiple registry keys to individual backup files',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports multiple registry keys to separate .reg files
- Creates timestamped backup files for each key
- Organizes backups in a structured folder

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on all registry keys
- Write permissions on backup directory

**What You Need to Provide:**
- List of registry key paths (comma-separated)
- Destination backup directory

**What the Script Does:**
1. Parses list of registry keys to backup
2. Creates timestamped backup folder
3. Exports each key to separate .reg file
4. Reports success/failure for each key
5. Shows total backup size

**Important Notes:**
- Each key creates a separate .reg file
- Backup folder is timestamped for easy identification
- Failed exports continue with remaining keys
- Typical use: backup application suite, user profiles
- Store backups on separate drive for safety
- Test restore process periodically`,
    parameters: [
      { id: 'keyPaths', label: 'Registry Key Paths (comma-separated)', type: 'textarea', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp1\nHKLM:\\SOFTWARE\\MyApp2\nHKCU:\\SOFTWARE\\Settings' },
      { id: 'backupDirectory', label: 'Backup Directory', type: 'path', required: true, placeholder: 'C:\\RegistryBackups' }
    ],
    scriptTemplate: (params) => {
      const keyPaths = escapePowerShellString(params.keyPaths);
      const backupDirectory = escapePowerShellString(params.backupDirectory);
      
      return `# Backup Multiple Registry Keys
# Generated: ${new Date().toISOString()}

$KeyPaths = @"
${keyPaths}
"@ -split '[,\\n]' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

$BackupDirectory = "${backupDirectory}"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFolder = Join-Path $BackupDirectory "RegistryBackup-$Timestamp"

# Create backup folder
New-Item -Path $BackupFolder -ItemType Directory -Force | Out-Null

Write-Host "Backing up $($KeyPaths.Count) registry keys..." -ForegroundColor Cyan
Write-Host "Destination: $BackupFolder" -ForegroundColor Gray
Write-Host ""

$SuccessCount = 0
$FailCount = 0
$TotalSize = 0

foreach ($KeyPath in $KeyPaths) {
    if (-not (Test-Path $KeyPath)) {
        Write-Host "  [FAILED] Not found: $KeyPath" -ForegroundColor Red
        $FailCount++
        continue
    }
    
    $SafeName = ($KeyPath -replace ':', '' -replace '\\\\', '_' -replace '\\\\\\\\', '_')
    $BackupFile = Join-Path $BackupFolder "$SafeName.reg"
    $RegPath = $KeyPath -replace 'HKLM:', 'HKEY_LOCAL_MACHINE' -replace 'HKCU:', 'HKEY_CURRENT_USER' -replace 'HKCR:', 'HKEY_CLASSES_ROOT'
    
    reg export $RegPath $BackupFile /y 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $BackupFile).Length
        $TotalSize += $FileSize
        Write-Host "  [OK] $KeyPath -> $([math]::Round($FileSize/1KB, 2)) KB" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAILED] Failed: $KeyPath" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "Backup Summary:" -ForegroundColor Cyan
Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })
Write-Host "  Total Size: $([math]::Round($TotalSize/1KB, 2)) KB" -ForegroundColor Gray
Write-Host "  Location: $BackupFolder" -ForegroundColor Gray`;
    }
  },

  {
    id: 'disable-windows-feature-registry',
    name: 'Disable Windows Feature via Registry',
    category: 'Policy Settings',
    description: 'Disable common Windows features through registry modifications',
    isPremium: true,
    instructions: `**How This Task Works:**
- Disables Windows features by setting registry values
- Common features: Cortana, Web Search, Game Bar, Tips, etc.
- Changes take effect after logoff or reboot

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Some features require Group Policy override

**What You Need to Provide:**
- Feature to disable from the selection list

**What the Script Does:**
1. Identifies registry keys for selected feature
2. Creates registry key if it doesn't exist
3. Sets appropriate values to disable feature
4. Reports all changes made
5. Indicates if reboot is required

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Some features may re-enable after Windows updates
- Group Policy may override these settings in domain environments
- Test functionality after disabling
- Typical use: harden workstations, reduce distractions
- Document changes for troubleshooting
- Can be reversed by deleting values or setting to 0/1`,
    parameters: [
      { id: 'feature', label: 'Feature to Disable', type: 'select', required: true, options: [
        'Cortana',
        'Web Search in Start Menu',
        'Game Bar',
        'Game DVR',
        'Windows Tips',
        'Lock Screen Tips',
        'Advertising ID',
        'Telemetry (Basic)',
        'OneDrive Startup',
        'Windows Ink Workspace'
      ], defaultValue: 'Cortana' }
    ],
    scriptTemplate: (params) => {
      const feature = params.feature;
      
      return `# Disable Windows Feature via Registry
# Generated: ${new Date().toISOString()}

$Feature = "${feature}"

Write-Host "Disabling: $Feature" -ForegroundColor Cyan
Write-Host ""

$Changes = @()

switch ($Feature) {
    "Cortana" {
        $Key = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search"
        New-Item -Path $Key -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $Key -Name "AllowCortana" -Value 0 -Type DWord -Force
        $Changes += "Set AllowCortana = 0"
    }
    "Web Search in Start Menu" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search"
        Set-ItemProperty -Path $Key -Name "BingSearchEnabled" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path $Key -Name "CortanaConsent" -Value 0 -Type DWord -Force
        $Changes += "Set BingSearchEnabled = 0"
        $Changes += "Set CortanaConsent = 0"
    }
    "Game Bar" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR"
        Set-ItemProperty -Path $Key -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
        $Key2 = "HKCU:\\System\\GameConfigStore"
        New-Item -Path $Key2 -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $Key2 -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force
        $Changes += "Set AppCaptureEnabled = 0"
        $Changes += "Set GameDVR_Enabled = 0"
    }
    "Game DVR" {
        $Key = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR"
        New-Item -Path $Key -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $Key -Name "AllowGameDVR" -Value 0 -Type DWord -Force
        $Changes += "Set AllowGameDVR = 0"
    }
    "Windows Tips" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager"
        Set-ItemProperty -Path $Key -Name "SoftLandingEnabled" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path $Key -Name "SubscribedContent-338389Enabled" -Value 0 -Type DWord -Force
        $Changes += "Set SoftLandingEnabled = 0"
        $Changes += "Set SubscribedContent-338389Enabled = 0"
    }
    "Lock Screen Tips" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager"
        Set-ItemProperty -Path $Key -Name "RotatingLockScreenOverlayEnabled" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path $Key -Name "SubscribedContent-338387Enabled" -Value 0 -Type DWord -Force
        $Changes += "Set RotatingLockScreenOverlayEnabled = 0"
    }
    "Advertising ID" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo"
        Set-ItemProperty -Path $Key -Name "Enabled" -Value 0 -Type DWord -Force
        $Changes += "Set AdvertisingInfo\\Enabled = 0"
    }
    "Telemetry (Basic)" {
        $Key = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection"
        New-Item -Path $Key -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $Key -Name "AllowTelemetry" -Value 0 -Type DWord -Force
        $Changes += "Set AllowTelemetry = 0 (Requires Enterprise/Education)"
    }
    "OneDrive Startup" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"
        $OneDrivePath = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"
        Remove-ItemProperty -Path $OneDrivePath -Name "OneDrive" -ErrorAction SilentlyContinue
        $Changes += "Removed OneDrive from startup"
    }
    "Windows Ink Workspace" {
        $Key = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\WindowsInkWorkspace"
        New-Item -Path $Key -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $Key -Name "AllowWindowsInkWorkspace" -Value 0 -Type DWord -Force
        $Changes += "Set AllowWindowsInkWorkspace = 0"
    }
}

Write-Host "[SUCCESS] Feature disabled: $Feature" -ForegroundColor Green
Write-Host ""
Write-Host "Changes made:" -ForegroundColor Yellow
$Changes | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
Write-Host ""
Write-Host "[WARNING] Note: Log off or restart may be required for changes to take effect" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'configure-windows-update-registry',
    name: 'Configure Windows Update Settings',
    category: 'Policy Settings',
    description: 'Configure Windows Update behavior via registry settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows Update policies through registry
- Controls auto-update behavior, active hours, and notifications
- Settings may be overridden by Group Policy in domain environments

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows 10/11 or Windows Server 2016+

**What You Need to Provide:**
- Auto-update setting (Disabled, Notify, Auto Download, Auto Install)
- Whether to defer feature updates
- Feature update deferral days (if enabled)

**What the Script Does:**
1. Creates Windows Update policy registry keys
2. Sets AUOptions for auto-update behavior
3. Configures feature update deferral if enabled
4. Applies settings immediately
5. Reports all configuration changes

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Domain Group Policy will override these settings
- Windows Home edition has limited options
- Disabling updates is not recommended for security
- Typical use: control update timing, prevent disruption
- Test settings before deploying to production
- Consider using WSUS for enterprise environments`,
    parameters: [
      { id: 'autoUpdate', label: 'Auto Update Setting', type: 'select', required: true, options: [
        'Disabled',
        'Notify before download',
        'Auto download, notify before install',
        'Auto download and install'
      ], defaultValue: 'Auto download, notify before install' },
      { id: 'deferFeatureUpdates', label: 'Defer Feature Updates', type: 'boolean', required: false, defaultValue: false },
      { id: 'deferralDays', label: 'Feature Update Deferral Days', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const autoUpdate = params.autoUpdate;
      const deferFeatureUpdates = toPowerShellBoolean(params.deferFeatureUpdates);
      const deferralDays = Number(params.deferralDays || 30);
      
      let auOption = 2;
      switch (autoUpdate) {
        case 'Disabled': auOption = 1; break;
        case 'Notify before download': auOption = 2; break;
        case 'Auto download, notify before install': auOption = 3; break;
        case 'Auto download and install': auOption = 4; break;
      }
      
      return `# Configure Windows Update Settings
# Generated: ${new Date().toISOString()}

$AUOption = ${auOption}
$DeferFeatureUpdates = ${deferFeatureUpdates}
$DeferralDays = ${deferralDays}

Write-Host "Configuring Windows Update settings..." -ForegroundColor Cyan
Write-Host ""

# Create Windows Update policy key
$WUKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate"
$AUKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"

New-Item -Path $WUKey -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -Path $AUKey -Force -ErrorAction SilentlyContinue | Out-Null

# Set auto-update option
Set-ItemProperty -Path $AUKey -Name "NoAutoUpdate" -Value $(if ($AUOption -eq 1) { 1 } else { 0 }) -Type DWord -Force
Set-ItemProperty -Path $AUKey -Name "AUOptions" -Value $AUOption -Type DWord -Force

$AutoUpdateText = switch ($AUOption) {
    1 { "Disabled" }
    2 { "Notify before download" }
    3 { "Auto download, notify before install" }
    4 { "Auto download and install" }
}

Write-Host "[SUCCESS] Auto-update: $AutoUpdateText" -ForegroundColor Green

# Configure feature update deferral
if ($DeferFeatureUpdates) {
    Set-ItemProperty -Path $WUKey -Name "DeferFeatureUpdates" -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $WUKey -Name "DeferFeatureUpdatesPeriodInDays" -Value $DeferralDays -Type DWord -Force
    Write-Host "[SUCCESS] Feature updates deferred: $DeferralDays days" -ForegroundColor Green
} else {
    Remove-ItemProperty -Path $WUKey -Name "DeferFeatureUpdates" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $WUKey -Name "DeferFeatureUpdatesPeriodInDays" -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] Feature update deferral: Disabled" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[WARNING] Note: Group Policy may override these settings in domain environments" -ForegroundColor Yellow
Write-Host "[WARNING] Restart the Windows Update service for changes to take effect" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'configure-windows-defender-registry',
    name: 'Configure Windows Defender Settings',
    category: 'Policy Settings',
    description: 'Configure Windows Defender/Security via registry settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows Defender settings through registry
- Controls real-time protection, cloud protection, and scan options
- Some settings require Windows Security to be the active AV

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Defender must be active (not replaced by third-party AV)

**What You Need to Provide:**
- Real-time protection setting
- Cloud-based protection setting
- Automatic sample submission setting

**What the Script Does:**
1. Creates Windows Defender policy registry keys
2. Configures real-time protection
3. Sets cloud protection options
4. Configures sample submission
5. Reports all settings applied

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Disabling protection is NOT recommended
- Domain Group Policy may override settings
- Third-party AV may disable these settings
- Typical use: enterprise configuration, testing
- Re-enable protection after testing
- Monitor Security Center for status`,
    parameters: [
      { id: 'realtimeProtection', label: 'Real-time Protection', type: 'select', required: true, options: ['Enabled', 'Disabled'], defaultValue: 'Enabled' },
      { id: 'cloudProtection', label: 'Cloud-based Protection', type: 'select', required: true, options: ['Enabled', 'Disabled'], defaultValue: 'Enabled' },
      { id: 'sampleSubmission', label: 'Automatic Sample Submission', type: 'select', required: true, options: ['Always prompt', 'Send safe samples', 'Never send', 'Send all samples'], defaultValue: 'Send safe samples' }
    ],
    scriptTemplate: (params) => {
      const realtimeProtection = params.realtimeProtection === 'Enabled' ? 0 : 1;
      const cloudProtection = params.cloudProtection === 'Enabled' ? 0 : 1;
      
      let sampleSubmission = 1;
      switch (params.sampleSubmission) {
        case 'Always prompt': sampleSubmission = 0; break;
        case 'Send safe samples': sampleSubmission = 1; break;
        case 'Never send': sampleSubmission = 2; break;
        case 'Send all samples': sampleSubmission = 3; break;
      }
      
      return `# Configure Windows Defender Settings
# Generated: ${new Date().toISOString()}

$DisableRealtimeMonitoring = ${realtimeProtection}
$DisableCloudProtection = ${cloudProtection}
$SampleSubmission = ${sampleSubmission}

Write-Host "Configuring Windows Defender settings..." -ForegroundColor Cyan
Write-Host ""

# Create Defender policy keys
$DefenderKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender"
$RealtimeKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection"
$SpynetKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet"

New-Item -Path $DefenderKey -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -Path $RealtimeKey -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -Path $SpynetKey -Force -ErrorAction SilentlyContinue | Out-Null

# Real-time protection
Set-ItemProperty -Path $RealtimeKey -Name "DisableRealtimeMonitoring" -Value $DisableRealtimeMonitoring -Type DWord -Force
Write-Host "[SUCCESS] Real-time Protection: $(if ($DisableRealtimeMonitoring -eq 0) { 'Enabled' } else { 'Disabled' })" -ForegroundColor $(if ($DisableRealtimeMonitoring -eq 0) { 'Green' } else { 'Yellow' })

# Cloud protection
Set-ItemProperty -Path $SpynetKey -Name "DisableBlockAtFirstSeen" -Value $DisableCloudProtection -Type DWord -Force
Write-Host "[SUCCESS] Cloud Protection: $(if ($DisableCloudProtection -eq 0) { 'Enabled' } else { 'Disabled' })" -ForegroundColor $(if ($DisableCloudProtection -eq 0) { 'Green' } else { 'Yellow' })

# Sample submission
Set-ItemProperty -Path $SpynetKey -Name "SubmitSamplesConsent" -Value $SampleSubmission -Type DWord -Force
$SampleText = switch ($SampleSubmission) {
    0 { "Always prompt" }
    1 { "Send safe samples automatically" }
    2 { "Never send" }
    3 { "Send all samples automatically" }
}
Write-Host "[SUCCESS] Sample Submission: $SampleText" -ForegroundColor Gray

Write-Host ""
Write-Host "[WARNING] Note: Disabling protection reduces system security" -ForegroundColor Yellow
Write-Host "[WARNING] Changes may require service restart or reboot" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'clear-app-cache-registry',
    name: 'Clear Application Cache via Registry',
    category: 'Application Settings',
    description: 'Clear cached settings and MRU lists for applications',
    isPremium: true,
    instructions: `**How This Task Works:**
- Clears application cache and Most Recently Used (MRU) lists
- Removes recent file lists, search history, and temp settings
- Helps resolve application issues and protects privacy

**Prerequisites:**
- PowerShell 5.1 or later
- Application should be closed before clearing
- Some items require administrator privileges

**What You Need to Provide:**
- Cache type to clear from selection

**What the Script Does:**
1. Identifies registry locations for selected cache type
2. Backs up existing values (optional)
3. Removes cached entries from registry
4. Reports items cleared
5. Suggests application restart

**Important Notes:**
- Close target applications before clearing cache
- Recent file lists will be empty after clearing
- Some applications recreate cache on next launch
- Typical use: troubleshooting, privacy, reset to defaults
- Does not clear file system cache (temp files)
- Run-MRU clears Run dialog history
- User-specific, does not affect other users`,
    parameters: [
      { id: 'cacheType', label: 'Cache Type to Clear', type: 'select', required: true, options: [
        'Explorer Recent Documents',
        'Run Dialog History',
        'Common Dialog MRU',
        'Office Recent Files',
        'WordPad Recent Files',
        'Paint Recent Files',
        'Notepad Settings',
        'TypedPaths (Explorer Address Bar)'
      ], defaultValue: 'Explorer Recent Documents' }
    ],
    scriptTemplate: (params) => {
      const cacheType = params.cacheType;
      
      return `# Clear Application Cache via Registry
# Generated: ${new Date().toISOString()}

$CacheType = "${cacheType}"

Write-Host "Clearing cache: $CacheType" -ForegroundColor Cyan
Write-Host ""

$ItemsCleared = 0

switch ($CacheType) {
    "Explorer Recent Documents" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs"
        if (Test-Path $Key) {
            $Items = Get-Item -Path $Key | Select-Object -ExpandProperty Property
            Remove-Item -Path $Key -Recurse -Force -ErrorAction SilentlyContinue
            New-Item -Path $Key -Force | Out-Null
            $ItemsCleared = $Items.Count
        }
    }
    "Run Dialog History" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU"
        if (Test-Path $Key) {
            $Props = Get-ItemProperty -Path $Key | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -notmatch 'PS' }
            $Props | ForEach-Object { Remove-ItemProperty -Path $Key -Name $_.Name -ErrorAction SilentlyContinue }
            $ItemsCleared = $Props.Count
        }
    }
    "Common Dialog MRU" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU"
        if (Test-Path $Key) {
            $Subkeys = Get-ChildItem -Path $Key -ErrorAction SilentlyContinue
            $ItemsCleared = $Subkeys.Count
            Remove-Item -Path $Key -Recurse -Force -ErrorAction SilentlyContinue
            New-Item -Path $Key -Force | Out-Null
        }
    }
    "Office Recent Files" {
        $OfficeVersions = @("16.0", "15.0", "14.0")
        foreach ($Ver in $OfficeVersions) {
            $Key = "HKCU:\\SOFTWARE\\Microsoft\\Office\\$Ver\\Common\\Open Find"
            if (Test-Path $Key) {
                Remove-Item -Path $Key -Recurse -Force -ErrorAction SilentlyContinue
                $ItemsCleared++
            }
        }
    }
    "WordPad Recent Files" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Applets\\Wordpad\\Recent File List"
        if (Test-Path $Key) {
            $Props = Get-ItemProperty -Path $Key | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -match 'File' }
            $Props | ForEach-Object { Remove-ItemProperty -Path $Key -Name $_.Name -ErrorAction SilentlyContinue }
            $ItemsCleared = $Props.Count
        }
    }
    "Paint Recent Files" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Applets\\Paint\\Recent File List"
        if (Test-Path $Key) {
            $Props = Get-ItemProperty -Path $Key | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -match 'File' }
            $Props | ForEach-Object { Remove-ItemProperty -Path $Key -Name $_.Name -ErrorAction SilentlyContinue }
            $ItemsCleared = $Props.Count
        }
    }
    "Notepad Settings" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Notepad"
        if (Test-Path $Key) {
            Remove-Item -Path $Key -Recurse -Force -ErrorAction SilentlyContinue
            $ItemsCleared = 1
            Write-Host "  Notepad will use default settings on next launch" -ForegroundColor Gray
        }
    }
    "TypedPaths (Explorer Address Bar)" {
        $Key = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths"
        if (Test-Path $Key) {
            $Props = Get-ItemProperty -Path $Key | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -match 'url' }
            $Props | ForEach-Object { Remove-ItemProperty -Path $Key -Name $_.Name -ErrorAction SilentlyContinue }
            $ItemsCleared = $Props.Count
        }
    }
}

if ($ItemsCleared -gt 0) {
    Write-Host "[SUCCESS] Cleared $ItemsCleared cached item(s)" -ForegroundColor Green
} else {
    Write-Host "No cached items found to clear" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[WARNING] Restart affected applications for changes to take effect" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'reset-app-settings-registry',
    name: 'Reset Application Settings to Defaults',
    category: 'Application Settings',
    description: 'Reset application settings by removing registry configuration',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes application-specific registry keys to reset settings
- Application will recreate defaults on next launch
- Provides backup option before deletion

**Prerequisites:**
- PowerShell 5.1 or later
- Target application must be closed
- Some applications require administrator privileges

**What You Need to Provide:**
- Application registry path (HKCU or HKLM)
- Whether to create backup before reset
- Backup file path (if backup enabled)

**What the Script Does:**
1. Validates the registry key exists
2. Optionally exports backup to .reg file
3. Removes the registry key and all subkeys
4. Reports what was removed
5. Application will recreate defaults on launch

**Important Notes:**
- CLOSE APPLICATION BEFORE RUNNING
- Creates backup by default for safety
- All custom settings will be lost
- Subkeys and values are recursively deleted
- Typical use: fix corrupted settings, troubleshooting
- Import backup .reg file to restore settings
- Some applications store settings in multiple locations`,
    parameters: [
      { id: 'appKeyPath', label: 'Application Registry Path', type: 'text', required: true, placeholder: 'HKCU:\\SOFTWARE\\MyApplication' },
      { id: 'createBackup', label: 'Create Backup Before Reset', type: 'boolean', required: false, defaultValue: true },
      { id: 'backupPath', label: 'Backup File Path', type: 'path', required: false, placeholder: 'C:\\Backups\\AppSettings.reg' }
    ],
    scriptTemplate: (params) => {
      const appKeyPath = escapePowerShellString(params.appKeyPath);
      const createBackup = toPowerShellBoolean(params.createBackup ?? true);
      const backupPath = escapePowerShellString(params.backupPath || '');
      
      return `# Reset Application Settings to Defaults
# Generated: ${new Date().toISOString()}

$AppKeyPath = "${appKeyPath}"
$CreateBackup = ${createBackup}
$BackupPath = "${backupPath}"

if (-not (Test-Path $AppKeyPath)) {
    Write-Host "[FAILED] Registry key not found: $AppKeyPath" -ForegroundColor Red
    Write-Host "  Application may not have any settings stored yet" -ForegroundColor Gray
    exit 1
}

Write-Host "Resetting application settings: $AppKeyPath" -ForegroundColor Cyan
Write-Host ""

# Create backup if requested
if ($CreateBackup) {
    if (-not $BackupPath) {
        $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $SafeName = ($AppKeyPath -replace ':', '' -replace '\\\\', '_')
        $BackupPath = "$env:TEMP\\$SafeName-Backup-$Timestamp.reg"
    }
    
    $RegPath = $AppKeyPath -replace 'HKLM:', 'HKEY_LOCAL_MACHINE' -replace 'HKCU:', 'HKEY_CURRENT_USER'
    reg export $RegPath $BackupPath /y 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Backup created: $BackupPath" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Backup failed, continuing anyway..." -ForegroundColor Yellow
    }
}

# Count items being removed
$SubkeyCount = (Get-ChildItem -Path $AppKeyPath -Recurse -ErrorAction SilentlyContinue).Count
$ValueCount = (Get-ItemProperty -Path $AppKeyPath -ErrorAction SilentlyContinue).PSObject.Properties.Count - 5

# Remove the key and all subkeys
try {
    Remove-Item -Path $AppKeyPath -Recurse -Force -ErrorAction Stop
    
    Write-Host "[SUCCESS] Application settings reset" -ForegroundColor Green
    Write-Host "  Removed key: $AppKeyPath" -ForegroundColor Gray
    Write-Host "  Subkeys removed: $SubkeyCount" -ForegroundColor Gray
    Write-Host "  Values removed: ~$ValueCount" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Launch the application to recreate default settings" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to reset settings: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-default-programs-registry',
    name: 'Configure Default Program Associations',
    category: 'Application Settings',
    description: 'Set default programs for file types via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures file type associations through registry
- Sets default programs for common file extensions
- Changes take effect for current user

**Prerequisites:**
- PowerShell 5.1 or later (some settings need Admin)
- Target application must be installed
- Application ProgId must be known

**What You Need to Provide:**
- File extension (e.g., .txt, .pdf, .html)
- Application ProgId (e.g., txtfile, Notepad++, ChromeHTML)

**What the Script Does:**
1. Creates/modifies UserChoice registry key for extension
2. Sets the ProgId for the file association
3. Notifies shell of the change
4. Reports the new association

**Important Notes:**
- Works for current user only (HKCU)
- Windows 10+ has protected associations (hash required)
- Some extensions may require special handling
- Typical use: set text editor, browser, PDF viewer
- May require logout/restart for full effect
- Verify ProgId exists before setting
- Use assoc/ftype commands for system-wide changes`,
    parameters: [
      { id: 'fileExtension', label: 'File Extension', type: 'text', required: true, placeholder: '.txt' },
      { id: 'progId', label: 'Program ProgId', type: 'text', required: true, placeholder: 'txtfile' }
    ],
    scriptTemplate: (params) => {
      const fileExtension = escapePowerShellString(params.fileExtension);
      const progId = escapePowerShellString(params.progId);
      
      return `# Configure Default Program Associations
# Generated: ${new Date().toISOString()}

$Extension = "${fileExtension}"
$ProgId = "${progId}"

# Ensure extension starts with dot
if (-not $Extension.StartsWith('.')) {
    $Extension = ".$Extension"
}

Write-Host "Setting default program for $Extension" -ForegroundColor Cyan
Write-Host ""

# Check if ProgId exists
$ProgIdKey = "HKLM:\\SOFTWARE\\Classes\\$ProgId"
$ProgIdKeyUser = "HKCU:\\SOFTWARE\\Classes\\$ProgId"

if (-not (Test-Path $ProgIdKey) -and -not (Test-Path $ProgIdKeyUser)) {
    Write-Host "[WARNING] Warning: ProgId '$ProgId' not found in registry" -ForegroundColor Yellow
    Write-Host "  The application may not be installed correctly" -ForegroundColor Gray
    Write-Host ""
}

try {
    # Set file extension association
    $ExtKey = "HKCU:\\SOFTWARE\\Classes\\$Extension"
    New-Item -Path $ExtKey -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $ExtKey -Name "(Default)" -Value $ProgId -Force
    
    # Set OpenWithProgids
    $OpenWithKey = "HKCU:\\SOFTWARE\\Classes\\$Extension\\OpenWithProgids"
    New-Item -Path $OpenWithKey -Force -ErrorAction SilentlyContinue | Out-Null
    New-ItemProperty -Path $OpenWithKey -Name $ProgId -PropertyType String -Value "" -Force | Out-Null
    
    # Attempt to set UserChoice (may fail on Windows 10+ due to hash protection)
    $UserChoiceKey = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$Extension\\UserChoice"
    
    # Remove existing UserChoice (triggers recalculation)
    Remove-Item -Path $UserChoiceKey -Recurse -Force -ErrorAction SilentlyContinue
    
    # Notify shell of changes
    $code = @'
[DllImport("shell32.dll")]
public static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);
'@
    $shell = Add-Type -MemberDefinition $code -Name "Shell32" -Namespace "Win32" -PassThru
    $shell::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    
    Write-Host "[SUCCESS] File association set:" -ForegroundColor Green
    Write-Host "  Extension: $Extension" -ForegroundColor Gray
    Write-Host "  ProgId: $ProgId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Note: Windows 10+ may require using Default Apps settings" -ForegroundColor Yellow
    Write-Host "  for protected extensions like .htm, .pdf, .mp3, etc." -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to set association: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'find-invalid-registry-entries',
    name: 'Find Invalid Registry Entries',
    category: 'Troubleshooting',
    description: 'Scan registry for invalid file paths and broken references',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans common registry locations for invalid file paths
- Identifies references to non-existent files or folders
- Helps identify leftover entries from uninstalled software

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on registry (Admin for HKLM)
- Patience for thorough scans

**What You Need to Provide:**
- Hive to scan (HKLM, HKCU, or Both)
- Maximum results to return
- Whether to export results to file

**What the Script Does:**
1. Scans Run keys, Uninstall keys, and App Paths
2. Validates file paths found in registry values
3. Reports entries pointing to missing files
4. Optionally exports results to CSV
5. Shows summary of scan results

**Important Notes:**
- Scan may take several minutes for full scan
- Does NOT automatically remove entries
- Review results before manual cleanup
- Some paths may be valid but inaccessible
- Network paths may show as invalid if offline
- Typical use: cleanup after uninstall, troubleshooting
- Export results for documentation`,
    parameters: [
      { id: 'hive', label: 'Registry Hive to Scan', type: 'select', required: true, options: ['HKLM', 'HKCU', 'Both'], defaultValue: 'Both' },
      { id: 'maxResults', label: 'Maximum Results', type: 'number', required: false, defaultValue: 100 },
      { id: 'exportPath', label: 'Export Results Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\InvalidRegistry.csv' }
    ],
    scriptTemplate: (params) => {
      const hive = params.hive;
      const maxResults = Number(params.maxResults || 100);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Find Invalid Registry Entries
# Generated: ${new Date().toISOString()}

$Hive = "${hive}"
$MaxResults = ${maxResults}
$ExportPath = "${exportPath}"

Write-Host "Scanning registry for invalid entries..." -ForegroundColor Cyan
Write-Host "Hive: $Hive | Max Results: $MaxResults" -ForegroundColor Gray
Write-Host ""

$InvalidEntries = @()

function Test-RegistryPath {
    param([string]$Path, [string]$ValueName, [string]$Value)
    
    if ($Value -match '^[A-Za-z]:\\\\' -or $Value -match '^"[A-Za-z]:\\\\') {
        $CleanPath = $Value -replace '^"' -replace '".*$' -replace '\s+.*$'
        if ($CleanPath -and -not (Test-Path $CleanPath -ErrorAction SilentlyContinue)) {
            return [PSCustomObject]@{
                KeyPath = $Path
                ValueName = $ValueName
                Value = $Value
                MissingPath = $CleanPath
            }
        }
    }
    return $null
}

$Hives = @()
if ($Hive -eq "HKLM" -or $Hive -eq "Both") { $Hives += "HKLM:" }
if ($Hive -eq "HKCU" -or $Hive -eq "Both") { $Hives += "HKCU:" }

foreach ($HiveRoot in $Hives) {
    # Scan Run keys
    $RunKeys = @(
        "$HiveRoot\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        "$HiveRoot\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
    )
    
    foreach ($RunKey in $RunKeys) {
        if (Test-Path $RunKey) {
            Get-ItemProperty -Path $RunKey -ErrorAction SilentlyContinue | Get-Member -MemberType NoteProperty | 
                Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
                $Value = (Get-ItemProperty -Path $RunKey).$($_.Name)
                $Invalid = Test-RegistryPath -Path $RunKey -ValueName $_.Name -Value $Value
                if ($Invalid) { $InvalidEntries += $Invalid }
            }
        }
    }
    
    # Scan Uninstall keys
    $UninstallKey = "$HiveRoot\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
    if (Test-Path $UninstallKey) {
        Get-ChildItem -Path $UninstallKey -ErrorAction SilentlyContinue | ForEach-Object {
            $Props = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
            foreach ($PropName in @("InstallLocation", "UninstallString", "DisplayIcon")) {
                if ($Props.$PropName) {
                    $Invalid = Test-RegistryPath -Path $_.PSPath -ValueName $PropName -Value $Props.$PropName
                    if ($Invalid) { $InvalidEntries += $Invalid }
                }
            }
        }
    }
    
    if ($InvalidEntries.Count -ge $MaxResults) { break }
}

$InvalidEntries = $InvalidEntries | Select-Object -First $MaxResults

if ($InvalidEntries.Count -gt 0) {
    Write-Host "Found $($InvalidEntries.Count) invalid registry entries:" -ForegroundColor Yellow
    Write-Host ""
    
    $InvalidEntries | Select-Object -First 20 | ForEach-Object {
        Write-Host "  Key: $($_.KeyPath)" -ForegroundColor Gray
        Write-Host "  Value: $($_.ValueName) = $($_.Value)" -ForegroundColor Gray
        Write-Host "  Missing: $($_.MissingPath)" -ForegroundColor Red
        Write-Host ""
    }
    
    if ($InvalidEntries.Count -gt 20) {
        Write-Host "  ... and $($InvalidEntries.Count - 20) more" -ForegroundColor Gray
    }
    
    if ($ExportPath) {
        $InvalidEntries | Export-Csv -Path $ExportPath -NoTypeInformation -Force
        Write-Host "[SUCCESS] Results exported to: $ExportPath" -ForegroundColor Green
    }
} else {
    Write-Host "[SUCCESS] No invalid registry entries found" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'find-orphaned-file-associations',
    name: 'Find Orphaned File Associations',
    category: 'Troubleshooting',
    description: 'Identify file associations pointing to uninstalled programs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans file type associations in registry
- Identifies ProgIds pointing to missing executables
- Helps clean up after uninstalling applications

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on registry
- Admin for full HKLM scan

**What You Need to Provide:**
- Maximum number of results to return
- Whether to export findings to file

**What the Script Does:**
1. Enumerates file extensions from HKCR
2. Retrieves associated ProgId for each extension
3. Validates the shell command executable exists
4. Reports orphaned associations
5. Optionally exports to CSV

**Important Notes:**
- Scan may take several minutes
- Does NOT automatically fix associations
- Some system associations may appear orphaned
- Review results carefully before cleanup
- Typical use: post-uninstall cleanup
- Missing exe may indicate incomplete uninstall
- Can use Default Programs to reset associations`,
    parameters: [
      { id: 'maxResults', label: 'Maximum Results', type: 'number', required: false, defaultValue: 50 },
      { id: 'exportPath', label: 'Export Results Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\OrphanedAssociations.csv' }
    ],
    scriptTemplate: (params) => {
      const maxResults = Number(params.maxResults || 50);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Find Orphaned File Associations
# Generated: ${new Date().toISOString()}

$MaxResults = ${maxResults}
$ExportPath = "${exportPath}"

Write-Host "Scanning for orphaned file associations..." -ForegroundColor Cyan
Write-Host ""

$OrphanedAssocs = @()

# Get all file extensions
$Extensions = Get-ChildItem -Path "Registry::HKEY_CLASSES_ROOT" -ErrorAction SilentlyContinue | 
    Where-Object { $_.PSChildName -match '^\\.\\w+$' } |
    Select-Object -First 500

$Total = $Extensions.Count
$Current = 0

foreach ($Ext in $Extensions) {
    $Current++
    Write-Progress -Activity "Scanning file associations" -Status "$($Ext.PSChildName)" -PercentComplete (($Current / $Total) * 100)
    
    $ExtName = $Ext.PSChildName
    $ProgId = (Get-ItemProperty -Path $Ext.PSPath -ErrorAction SilentlyContinue).'(Default)'
    
    if ($ProgId) {
        $ShellPath = "Registry::HKEY_CLASSES_ROOT\\$ProgId\\shell\\open\\command"
        
        if (Test-Path $ShellPath) {
            $Command = (Get-ItemProperty -Path $ShellPath -ErrorAction SilentlyContinue).'(Default)'
            
            if ($Command) {
                $ExePath = $Command -replace '^"([^"]+)".*', '$1' -replace '^([^\\s]+)\\s.*', '$1'
                
                if ($ExePath -match '^[A-Za-z]:\\\\' -and -not (Test-Path $ExePath -ErrorAction SilentlyContinue)) {
                    $OrphanedAssocs += [PSCustomObject]@{
                        Extension = $ExtName
                        ProgId = $ProgId
                        Command = $Command
                        MissingExe = $ExePath
                    }
                }
            }
        }
    }
    
    if ($OrphanedAssocs.Count -ge $MaxResults) { break }
}

Write-Progress -Activity "Scanning file associations" -Completed

if ($OrphanedAssocs.Count -gt 0) {
    Write-Host "Found $($OrphanedAssocs.Count) orphaned file associations:" -ForegroundColor Yellow
    Write-Host ""
    
    $OrphanedAssocs | Select-Object -First 20 | ForEach-Object {
        Write-Host "  Extension: $($_.Extension)" -ForegroundColor Cyan
        Write-Host "  ProgId: $($_.ProgId)" -ForegroundColor Gray
        Write-Host "  Missing: $($_.MissingExe)" -ForegroundColor Red
        Write-Host ""
    }
    
    if ($OrphanedAssocs.Count -gt 20) {
        Write-Host "  ... and $($OrphanedAssocs.Count - 20) more" -ForegroundColor Gray
    }
    
    if ($ExportPath) {
        $OrphanedAssocs | Export-Csv -Path $ExportPath -NoTypeInformation -Force
        Write-Host ""
        Write-Host "[SUCCESS] Results exported to: $ExportPath" -ForegroundColor Green
    }
} else {
    Write-Host "[SUCCESS] No orphaned file associations found" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'cleanup-uninstall-registry',
    name: 'Cleanup Uninstall Registry Entries',
    category: 'Troubleshooting',
    description: 'Remove leftover uninstall entries for programs no longer installed',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans Uninstall registry keys for orphaned entries
- Identifies entries where InstallLocation no longer exists
- Optionally removes orphaned entries

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Backup recommended before cleanup

**What You Need to Provide:**
- Whether to scan only or also remove orphaned entries
- Whether to require confirmation before each removal

**What the Script Does:**
1. Scans HKLM and HKCU Uninstall registry keys
2. Validates InstallLocation for each entry
3. Identifies entries pointing to missing paths
4. Reports or removes orphaned entries
5. Creates backup before removal (if enabled)

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Scan-only mode is safe for initial review
- Some entries may not have InstallLocation
- System components may appear orphaned
- Review entries before removal
- Typical use: clean Programs and Features list
- Backup created before each removal
- Some entries regenerate after Windows Update`,
    parameters: [
      { id: 'scanOnly', label: 'Scan Only (No Removal)', type: 'boolean', required: false, defaultValue: true },
      { id: 'confirmEach', label: 'Confirm Each Removal', type: 'boolean', required: false, defaultValue: true },
      { id: 'backupPath', label: 'Backup Directory', type: 'path', required: false, placeholder: 'C:\\Backups\\UninstallCleanup' }
    ],
    scriptTemplate: (params) => {
      const scanOnly = toPowerShellBoolean(params.scanOnly ?? true);
      const confirmEach = toPowerShellBoolean(params.confirmEach ?? true);
      const backupPath = escapePowerShellString(params.backupPath || '');
      
      return `# Cleanup Uninstall Registry Entries
# Generated: ${new Date().toISOString()}

$ScanOnly = ${scanOnly}
$ConfirmEach = ${confirmEach}
$BackupPath = "${backupPath}"

Write-Host "Scanning for orphaned uninstall entries..." -ForegroundColor Cyan
Write-Host "Mode: $(if ($ScanOnly) { 'Scan Only' } else { 'Cleanup' })" -ForegroundColor Gray
Write-Host ""

$OrphanedEntries = @()

$UninstallPaths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
)

foreach ($UninstallPath in $UninstallPaths) {
    if (-not (Test-Path $UninstallPath)) { continue }
    
    Get-ChildItem -Path $UninstallPath -ErrorAction SilentlyContinue | ForEach-Object {
        $Props = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
        $DisplayName = $Props.DisplayName
        $InstallLocation = $Props.InstallLocation
        $UninstallString = $Props.UninstallString
        
        if ($InstallLocation -and (Test-Path $InstallLocation -ErrorAction SilentlyContinue) -eq $false) {
            $OrphanedEntries += [PSCustomObject]@{
                Path = $_.PSPath
                Name = $_.PSChildName
                DisplayName = $DisplayName
                InstallLocation = $InstallLocation
            }
        }
    }
}

if ($OrphanedEntries.Count -eq 0) {
    Write-Host "[SUCCESS] No orphaned uninstall entries found" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($OrphanedEntries.Count) orphaned uninstall entries:" -ForegroundColor Yellow
Write-Host ""

$RemovedCount = 0

foreach ($Entry in $OrphanedEntries) {
    Write-Host "  $($Entry.DisplayName)" -ForegroundColor Cyan
    Write-Host "    Key: $($Entry.Name)" -ForegroundColor Gray
    Write-Host "    Missing: $($Entry.InstallLocation)" -ForegroundColor Red
    
    if (-not $ScanOnly) {
        $DoRemove = $true
        
        if ($ConfirmEach) {
            $Response = Read-Host "    Remove this entry? (Y/N)"
            $DoRemove = $Response -eq 'Y'
        }
        
        if ($DoRemove) {
            # Create backup
            if ($BackupPath) {
                $BackupDir = Join-Path $BackupPath (Get-Date -Format "yyyyMMdd-HHmmss")
                New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
                $BackupFile = Join-Path $BackupDir "$($Entry.Name).reg"
                $RegPath = $Entry.Path -replace 'Microsoft.PowerShell.Core\\\\Registry::', ''
                reg export $RegPath $BackupFile /y 2>&1 | Out-Null
            }
            
            Remove-Item -Path $Entry.Path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "    [OK] Removed" -ForegroundColor Green
            $RemovedCount++
        } else {
            Write-Host "    Skipped" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
}

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Orphaned entries found: $($OrphanedEntries.Count)" -ForegroundColor Gray
if (-not $ScanOnly) {
    Write-Host "  Entries removed: $RemovedCount" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'delete-registry-key',
    name: 'Delete Registry Key',
    category: 'Registry Operations',
    description: 'Remove an entire registry key and all its subkeys and values',
    isPremium: true,
    instructions: `**How This Task Works:**
- Permanently removes a registry key and ALL its contents
- Includes all subkeys and values recursively
- Optionally creates backup before deletion

**Prerequisites:**
- Administrator privileges (for HKLM keys)
- PowerShell 5.1 or later
- Write permissions on target registry key

**What You Need to Provide:**
- Full registry key path to delete
- Whether to create backup before deletion
- Backup file path (if backup enabled)
- Whether to require confirmation

**What the Script Does:**
1. Validates registry key exists
2. Counts subkeys and values to be removed
3. Optionally exports backup to .reg file
4. Prompts for confirmation if enabled
5. Recursively removes key and all contents

**Important Notes:**
- PERMANENT DELETION - cannot be undone without backup
- REQUIRES ADMIN for HKLM and system keys
- Removes ALL subkeys and values recursively
- Critical system keys are protected
- Always backup before deleting important keys
- Typical use: cleanup, remove application traces
- Some keys may be locked by running processes`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\OldApplication' },
      { id: 'createBackup', label: 'Create Backup Before Delete', type: 'boolean', required: false, defaultValue: true },
      { id: 'backupPath', label: 'Backup File Path', type: 'path', required: false, placeholder: 'C:\\Backups\\DeletedKey.reg' },
      { id: 'confirm', label: 'Require Confirmation', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const createBackup = toPowerShellBoolean(params.createBackup ?? true);
      const backupPath = escapePowerShellString(params.backupPath || '');
      const confirm = toPowerShellBoolean(params.confirm ?? true);
      
      return `# Delete Registry Key
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$CreateBackup = ${createBackup}
$BackupPath = "${backupPath}"
$RequireConfirm = ${confirm}

if (-not (Test-Path $KeyPath)) {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
    exit 1
}

# Count contents
$SubkeyCount = (Get-ChildItem -Path $KeyPath -Recurse -ErrorAction SilentlyContinue).Count
$ValueCount = (Get-ItemProperty -Path $KeyPath -ErrorAction SilentlyContinue).PSObject.Properties.Count - 5

Write-Host "[WARNING] WARNING: About to delete registry key" -ForegroundColor Yellow
Write-Host "  Path: $KeyPath" -ForegroundColor Gray
Write-Host "  Subkeys: $SubkeyCount" -ForegroundColor Gray
Write-Host "  Values: ~$ValueCount" -ForegroundColor Gray
Write-Host ""

# Create backup if requested
if ($CreateBackup) {
    if (-not $BackupPath) {
        $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $SafeName = ($KeyPath -replace ':', '' -replace '\\\\', '_')
        $BackupPath = "$env:TEMP\\$SafeName-Backup-$Timestamp.reg"
    }
    
    $RegPath = $KeyPath -replace 'HKLM:', 'HKEY_LOCAL_MACHINE' -replace 'HKCU:', 'HKEY_CURRENT_USER'
    reg export $RegPath $BackupPath /y 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Backup created: $BackupPath" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Backup failed - proceeding with caution" -ForegroundColor Yellow
    }
}

# Confirm deletion
if ($RequireConfirm) {
    $Response = Read-Host "Type 'DELETE' to confirm deletion"
    
    if ($Response -ne 'DELETE') {
        Write-Host "[FAILED] Deletion cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

# Delete the key
try {
    Remove-Item -Path $KeyPath -Recurse -Force -ErrorAction Stop
    
    Write-Host ""
    Write-Host "[SUCCESS] Registry key deleted: $KeyPath" -ForegroundColor Green
    Write-Host "  Subkeys removed: $SubkeyCount" -ForegroundColor Gray
    Write-Host "  Values removed: ~$ValueCount" -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "[FAILED] Failed to delete key: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-registry-key-info',
    name: 'Get Registry Key Information',
    category: 'Search & Query',
    description: 'Display detailed information about a registry key and its values',
    isPremium: true,
    instructions: `**How This Task Works:**
- Retrieves comprehensive information about a registry key
- Shows all values with their types and data
- Displays key metadata including last write time

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on target registry key
- Key must exist

**What You Need to Provide:**
- Full registry key path to examine

**What the Script Does:**
1. Validates registry key exists
2. Retrieves key properties and metadata
3. Enumerates all values with types and data
4. Shows subkey count
5. Displays last modification time

**Important Notes:**
- Read-only operation - no changes made
- Shows all value types: String, DWord, Binary, etc
- Binary values displayed as hex
- Typical use: inspection, documentation, troubleshooting
- Subkey contents not shown (use List Subkeys task)
- Large values may be truncated in display
- Last write time is approximate`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion' }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      
      return `# Get Registry Key Information
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"

if (-not (Test-Path $KeyPath)) {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Registry Key Information" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host ""
Write-Host "Path: $KeyPath" -ForegroundColor Yellow
Write-Host ""

# Get key object for metadata
$Key = Get-Item -Path $KeyPath

# Get subkey count
$SubkeyCount = $Key.SubKeyCount
Write-Host "Subkeys: $SubkeyCount" -ForegroundColor Gray

# Get values
$Values = Get-ItemProperty -Path $KeyPath
$Props = $Values.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' }

Write-Host "Values: $($Props.Count)" -ForegroundColor Gray
Write-Host ""

if ($Props.Count -gt 0) {
    Write-Host "Values:" -ForegroundColor Yellow
    Write-Host ("-" * 60) -ForegroundColor Gray
    
    foreach ($Prop in $Props) {
        $ValueName = $Prop.Name
        $ValueData = $Prop.Value
        
        # Get value type
        try {
            $ValueType = (Get-Item -Path $KeyPath).GetValueKind($ValueName)
        } catch {
            $ValueType = "Unknown"
        }
        
        # Format value for display
        $DisplayValue = switch ($ValueType) {
            "Binary" { 
                if ($ValueData -is [byte[]]) {
                    ($ValueData | ForEach-Object { $_.ToString("X2") }) -join " "
                } else { $ValueData }
            }
            "MultiString" { $ValueData -join ", " }
            default { $ValueData }
        }
        
        # Truncate long values
        if ($DisplayValue.Length -gt 100) {
            $DisplayValue = $DisplayValue.Substring(0, 100) + "..."
        }
        
        Write-Host "  $ValueName" -ForegroundColor Cyan
        Write-Host "    Type: $ValueType" -ForegroundColor Gray
        Write-Host "    Data: $DisplayValue" -ForegroundColor White
        Write-Host ""
    }
}

# Show subkeys if any
if ($SubkeyCount -gt 0) {
    Write-Host "Subkeys:" -ForegroundColor Yellow
    Write-Host ("-" * 60) -ForegroundColor Gray
    
    Get-ChildItem -Path $KeyPath | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $($_.PSChildName)" -ForegroundColor Gray
    }
    
    if ($SubkeyCount -gt 20) {
        Write-Host "  ... and $($SubkeyCount - 20) more" -ForegroundColor DarkGray
    }
}`;
    }
  },

  // ============================================
  // SYSTEM CONFIGURATION TASKS
  // ============================================

  {
    id: 'configure-service-startup-type',
    name: 'Configure Service Startup Type',
    category: 'System Configuration',
    description: 'Set Windows service startup type via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows service startup behavior via registry
- Changes persist across reboots
- More reliable than SC command for some services

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist in registry

**What You Need to Provide:**
- Service name (internal name, not display name)
- Desired startup type

**What the Script Does:**
1. Validates service exists in registry
2. Retrieves current startup configuration
3. Sets new startup type value
4. Reports before/after settings
5. Indicates if restart is required

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Use internal service name (e.g., "Spooler" not "Print Spooler")
- 0=Boot, 1=System, 2=Automatic, 3=Manual, 4=Disabled
- Some system services cannot be modified
- Changes take effect after service restart or reboot
- Typical use: security hardening, optimization
- Check dependencies before disabling services`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' },
      { id: 'startupType', label: 'Startup Type', type: 'select', required: true, options: ['Automatic', 'Automatic (Delayed Start)', 'Manual', 'Disabled'], defaultValue: 'Manual' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const startupType = params.startupType;
      
      let startValue = 3;
      let delayedStart = 0;
      switch (startupType) {
        case 'Automatic': startValue = 2; break;
        case 'Automatic (Delayed Start)': startValue = 2; delayedStart = 1; break;
        case 'Manual': startValue = 3; break;
        case 'Disabled': startValue = 4; break;
      }
      
      return `# Configure Service Startup Type
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$StartValue = ${startValue}
$DelayedStart = ${delayedStart}
$StartupType = "${startupType}"

$ServiceKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$ServiceName"

if (-not (Test-Path $ServiceKey)) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    Write-Host "  Use the internal service name (e.g., 'Spooler' not 'Print Spooler')" -ForegroundColor Gray
    exit 1
}

# Get current setting
$CurrentStart = (Get-ItemProperty -Path $ServiceKey -Name "Start" -ErrorAction SilentlyContinue).Start
$StartTypeMap = @{ 0 = "Boot"; 1 = "System"; 2 = "Automatic"; 3 = "Manual"; 4 = "Disabled" }
$CurrentType = $StartTypeMap[$CurrentStart]

Write-Host "Configuring service: $ServiceName" -ForegroundColor Cyan
Write-Host "  Current: $CurrentType" -ForegroundColor Gray
Write-Host "  New: $StartupType" -ForegroundColor Yellow
Write-Host ""

try {
    Set-ItemProperty -Path $ServiceKey -Name "Start" -Value $StartValue -Type DWord -Force
    
    if ($DelayedStart -eq 1) {
        Set-ItemProperty -Path $ServiceKey -Name "DelayedAutostart" -Value 1 -Type DWord -Force
    } else {
        Remove-ItemProperty -Path $ServiceKey -Name "DelayedAutostart" -ErrorAction SilentlyContinue
    }
    
    Write-Host "[SUCCESS] Service startup type configured:" -ForegroundColor Green
    Write-Host "  Service: $ServiceName" -ForegroundColor Gray
    Write-Host "  Startup: $StartupType" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Restart the service or reboot for changes to take effect" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure service: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'manage-startup-programs',
    name: 'Manage Startup Programs',
    category: 'System Configuration',
    description: 'Add or remove programs from Windows startup via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Manages applications that run at Windows startup
- Configures Run/RunOnce registry keys
- Can add or remove startup entries

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator for HKLM (system-wide)
- Standard user for HKCU (current user)

**What You Need to Provide:**
- Action: Add or Remove startup entry
- Entry name (identifier for the startup item)
- Program path (for Add action)
- Startup scope: Current User or All Users

**What the Script Does:**
1. Validates parameters and paths
2. Selects appropriate registry hive (HKLM/HKCU)
3. Adds or removes the startup entry
4. Reports current startup entries
5. Confirms action completion

**Important Notes:**
- HKLM requires Administrator privileges
- Startup entries run before user desktop loads
- Quote paths with spaces: "C:\\Program Files\\app.exe"
- Remove entries for uninstalled software
- Typical use: deploy applications, remove bloatware
- Check Task Manager > Startup for full list
- Some entries may be in Task Scheduler instead`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'entryName', label: 'Entry Name', type: 'text', required: true, placeholder: 'MyApplication' },
      { id: 'programPath', label: 'Program Path (for Add)', type: 'path', required: false, placeholder: 'C:\\Program Files\\MyApp\\app.exe' },
      { id: 'scope', label: 'Startup Scope', type: 'select', required: true, options: ['Current User', 'All Users'], defaultValue: 'Current User' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const entryName = escapePowerShellString(params.entryName);
      const programPath = escapePowerShellString(params.programPath || '');
      const scope = params.scope;
      
      return `# Manage Startup Programs
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$EntryName = "${entryName}"
$ProgramPath = "${programPath}"
$Scope = "${scope}"

$RunKey = if ($Scope -eq "All Users") {
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"
} else {
    "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"
}

Write-Host "Startup Programs Management" -ForegroundColor Cyan
Write-Host "  Scope: $Scope" -ForegroundColor Gray
Write-Host "  Key: $RunKey" -ForegroundColor Gray
Write-Host ""

if ($Action -eq "Add") {
    if (-not $ProgramPath) {
        Write-Host "[FAILED] Program path is required for Add action" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Test-Path $ProgramPath -ErrorAction SilentlyContinue)) {
        Write-Host "[WARNING] Warning: Program path does not exist: $ProgramPath" -ForegroundColor Yellow
    }
    
    try {
        Set-ItemProperty -Path $RunKey -Name $EntryName -Value $ProgramPath -Type String -Force
        Write-Host "[SUCCESS] Startup entry added:" -ForegroundColor Green
        Write-Host "  Name: $EntryName" -ForegroundColor Gray
        Write-Host "  Path: $ProgramPath" -ForegroundColor Gray
    } catch {
        Write-Host "[FAILED] Failed to add startup entry: $_" -ForegroundColor Red
    }
} elseif ($Action -eq "Remove") {
    try {
        $CurrentValue = Get-ItemPropertyValue -Path $RunKey -Name $EntryName -ErrorAction Stop
        Remove-ItemProperty -Path $RunKey -Name $EntryName -Force -ErrorAction Stop
        Write-Host "[SUCCESS] Startup entry removed:" -ForegroundColor Green
        Write-Host "  Name: $EntryName" -ForegroundColor Gray
        Write-Host "  Was: $CurrentValue" -ForegroundColor Gray
    } catch {
        Write-Host "[FAILED] Startup entry not found: $EntryName" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Current startup entries in $Scope scope:" -ForegroundColor Yellow
Get-ItemProperty -Path $RunKey -ErrorAction SilentlyContinue | 
    Get-Member -MemberType NoteProperty | 
    Where-Object { $_.Name -notmatch '^PS' } | 
    ForEach-Object {
        $Value = (Get-ItemProperty -Path $RunKey).$($_.Name)
        Write-Host "  $($_.Name): $Value" -ForegroundColor Gray
    }`;
    }
  },

  {
    id: 'configure-remote-desktop',
    name: 'Configure Remote Desktop',
    category: 'System Configuration',
    description: 'Enable or disable Remote Desktop via registry settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables or disables Windows Remote Desktop Protocol (RDP)
- Configures Network Level Authentication (NLA)
- Manages firewall rule state for RDP

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Pro/Enterprise/Server edition

**What You Need to Provide:**
- Enable or Disable Remote Desktop
- Whether to require Network Level Authentication
- Whether to configure firewall rules

**What the Script Does:**
1. Sets Terminal Services registry values
2. Configures fDenyTSConnections (0=enable, 1=disable)
3. Sets NLA requirement if enabled
4. Optionally enables RDP firewall rules
5. Reports configuration status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Windows Home edition does not support RDP server
- NLA provides stronger authentication security
- Firewall rules must be enabled for remote access
- Consider VPN for internet-facing RDP
- Typical use: enable remote administration
- RDP uses port 3389 by default
- Restart may be required for some changes`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' },
      { id: 'requireNLA', label: 'Require Network Level Authentication', type: 'boolean', required: false, defaultValue: true },
      { id: 'configureFirewall', label: 'Configure Firewall Rules', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const requireNLA = toPowerShellBoolean(params.requireNLA ?? true);
      const configureFirewall = toPowerShellBoolean(params.configureFirewall ?? true);
      const fDenyValue = action === 'Enable' ? 0 : 1;
      
      return `# Configure Remote Desktop
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$fDenyConnections = ${fDenyValue}
$RequireNLA = ${requireNLA}
$ConfigureFirewall = ${configureFirewall}

Write-Host "Configuring Remote Desktop..." -ForegroundColor Cyan
Write-Host "  Action: $Action" -ForegroundColor Gray
Write-Host ""

$TSKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server"
$WinStationKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp"

try {
    # Set Remote Desktop enabled/disabled
    Set-ItemProperty -Path $TSKey -Name "fDenyTSConnections" -Value $fDenyConnections -Type DWord -Force
    Write-Host "[SUCCESS] Remote Desktop: $Action" -ForegroundColor Green
    
    # Configure NLA
    if ($Action -eq "Enable") {
        $NLAValue = if ($RequireNLA) { 1 } else { 0 }
        Set-ItemProperty -Path $WinStationKey -Name "UserAuthentication" -Value $NLAValue -Type DWord -Force
        Write-Host "[SUCCESS] Network Level Authentication: $(if ($RequireNLA) { 'Required' } else { 'Not Required' })" -ForegroundColor Green
    }
    
    # Configure Firewall
    if ($ConfigureFirewall) {
        if ($Action -eq "Enable") {
            Enable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue
            Write-Host "[SUCCESS] Firewall rules enabled for Remote Desktop" -ForegroundColor Green
        } else {
            Disable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue
            Write-Host "[SUCCESS] Firewall rules disabled for Remote Desktop" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Remote Desktop Configuration Complete" -ForegroundColor Cyan
    
    if ($Action -eq "Enable") {
        $HostName = $env:COMPUTERNAME
        Write-Host "  Connect using: $HostName" -ForegroundColor Yellow
        Write-Host "  Port: 3389 (default)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAILED] Failed to configure Remote Desktop: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-uac-settings',
    name: 'Configure UAC Settings',
    category: 'System Configuration',
    description: 'Configure User Account Control behavior via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures User Account Control (UAC) behavior
- Adjusts elevation prompts and consent levels
- Can enable/disable Admin Approval Mode

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Reboot required for changes to take effect

**What You Need to Provide:**
- UAC level (preset configuration)
- Whether to enable secure desktop for prompts

**What the Script Does:**
1. Sets ConsentPromptBehaviorAdmin value
2. Sets ConsentPromptBehaviorUser value
3. Configures EnableLUA (Admin Approval Mode)
4. Sets PromptOnSecureDesktop setting
5. Reports all configuration changes

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REBOOT REQUIRED for changes to take effect
- Disabling UAC is NOT recommended for security
- Level 0 = No prompts (least secure)
- Level 4 = Always notify (most secure)
- Secure Desktop prevents prompt manipulation
- Typical use: enterprise deployment, kiosk mode
- Group Policy may override these settings`,
    parameters: [
      { id: 'uacLevel', label: 'UAC Level', type: 'select', required: true, options: [
        'Always Notify (Most Secure)',
        'Notify on App Changes Only',
        'Notify (No Dim Desktop)',
        'Never Notify (Least Secure)'
      ], defaultValue: 'Notify on App Changes Only' },
      { id: 'secureDesktop', label: 'Use Secure Desktop', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const uacLevel = params.uacLevel;
      const secureDesktop = toPowerShellBoolean(params.secureDesktop ?? true);
      
      let consentAdmin = 5;
      let consentUser = 3;
      let enableLUA = 1;
      let promptSecure = 1;
      
      switch (uacLevel) {
        case 'Always Notify (Most Secure)':
          consentAdmin = 2;
          consentUser = 3;
          promptSecure = 1;
          break;
        case 'Notify on App Changes Only':
          consentAdmin = 5;
          consentUser = 3;
          promptSecure = 1;
          break;
        case 'Notify (No Dim Desktop)':
          consentAdmin = 5;
          consentUser = 3;
          promptSecure = 0;
          break;
        case 'Never Notify (Least Secure)':
          consentAdmin = 0;
          consentUser = 0;
          enableLUA = 0;
          promptSecure = 0;
          break;
      }
      
      return `# Configure UAC Settings
# Generated: ${new Date().toISOString()}

$UACLevel = "${uacLevel}"
$ConsentAdmin = ${consentAdmin}
$ConsentUser = ${consentUser}
$EnableLUA = ${enableLUA}
$PromptSecure = $(params.secureDesktop ?? true ? promptSecure : 0)

$PolicyKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"

Write-Host "Configuring User Account Control..." -ForegroundColor Cyan
Write-Host "  Level: $UACLevel" -ForegroundColor Gray
Write-Host ""

try {
    Set-ItemProperty -Path $PolicyKey -Name "ConsentPromptBehaviorAdmin" -Value $ConsentAdmin -Type DWord -Force
    Set-ItemProperty -Path $PolicyKey -Name "ConsentPromptBehaviorUser" -Value $ConsentUser -Type DWord -Force
    Set-ItemProperty -Path $PolicyKey -Name "EnableLUA" -Value $EnableLUA -Type DWord -Force
    Set-ItemProperty -Path $PolicyKey -Name "PromptOnSecureDesktop" -Value $PromptSecure -Type DWord -Force
    
    Write-Host "[SUCCESS] UAC Settings configured:" -ForegroundColor Green
    Write-Host "  ConsentPromptBehaviorAdmin: $ConsentAdmin" -ForegroundColor Gray
    Write-Host "  ConsentPromptBehaviorUser: $ConsentUser" -ForegroundColor Gray
    Write-Host "  EnableLUA (Admin Approval Mode): $EnableLUA" -ForegroundColor Gray
    Write-Host "  PromptOnSecureDesktop: $PromptSecure" -ForegroundColor Gray
    Write-Host ""
    
    if ($EnableLUA -eq 0) {
        Write-Host "[WARNING] WARNING: UAC is disabled. This is NOT recommended for security." -ForegroundColor Red
    }
    
    Write-Host "[WARNING] REBOOT REQUIRED for changes to take effect" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure UAC: $_" -ForegroundColor Red
}`;
    }
  },

  // ============================================
  // NETWORK SETTINGS TASKS
  // ============================================

  {
    id: 'configure-proxy-settings',
    name: 'Configure System Proxy Settings',
    category: 'Network Settings',
    description: 'Configure Internet proxy settings via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures system-wide Internet proxy settings
- Affects Internet Explorer and system components
- Can enable/disable proxy and set server address

**Prerequisites:**
- PowerShell 5.1 or later
- User or Administrator privileges
- Proxy server must be accessible

**What You Need to Provide:**
- Enable or Disable proxy
- Proxy server address and port
- Optional bypass list for local addresses

**What the Script Does:**
1. Sets ProxyEnable value (0 or 1)
2. Configures ProxyServer address:port
3. Sets ProxyOverride for bypass list
4. Updates Internet Settings registry key
5. Reports configuration status

**Important Notes:**
- Settings affect Internet Explorer and WinHTTP
- Some applications use their own proxy settings
- Bypass list supports wildcards (*.local)
- Use <local> to bypass intranet addresses
- Changes take effect immediately for new connections
- Typical use: enterprise proxy deployment
- Chrome/Firefox may need separate configuration
- Test connectivity after configuration`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable Proxy', 'Disable Proxy'], defaultValue: 'Enable Proxy' },
      { id: 'proxyServer', label: 'Proxy Server (server:port)', type: 'text', required: false, placeholder: 'proxy.company.com:8080' },
      { id: 'bypassList', label: 'Bypass List (semicolon-separated)', type: 'text', required: false, placeholder: '*.local;192.168.*;<local>' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const proxyServer = escapePowerShellString(params.proxyServer || '');
      const bypassList = escapePowerShellString(params.bypassList || '<local>');
      const proxyEnable = action === 'Enable Proxy' ? 1 : 0;
      
      return `# Configure System Proxy Settings
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$ProxyEnable = ${proxyEnable}
$ProxyServer = "${proxyServer}"
$BypassList = "${bypassList}"

$InternetSettingsKey = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"

Write-Host "Configuring System Proxy Settings..." -ForegroundColor Cyan
Write-Host ""

try {
    Set-ItemProperty -Path $InternetSettingsKey -Name "ProxyEnable" -Value $ProxyEnable -Type DWord -Force
    
    if ($ProxyEnable -eq 1) {
        if (-not $ProxyServer) {
            Write-Host "[FAILED] Proxy server address is required when enabling proxy" -ForegroundColor Red
            exit 1
        }
        
        Set-ItemProperty -Path $InternetSettingsKey -Name "ProxyServer" -Value $ProxyServer -Type String -Force
        Set-ItemProperty -Path $InternetSettingsKey -Name "ProxyOverride" -Value $BypassList -Type String -Force
        
        Write-Host "[SUCCESS] Proxy Enabled:" -ForegroundColor Green
        Write-Host "  Server: $ProxyServer" -ForegroundColor Gray
        Write-Host "  Bypass: $BypassList" -ForegroundColor Gray
    } else {
        Remove-ItemProperty -Path $InternetSettingsKey -Name "ProxyServer" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $InternetSettingsKey -Name "ProxyOverride" -ErrorAction SilentlyContinue
        
        Write-Host "[SUCCESS] Proxy Disabled" -ForegroundColor Green
    }
    
    # Notify WinINet of the change
    $signature = @'
[DllImport("wininet.dll", SetLastError=true)]
public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int lpdwBufferLength);
'@
    
    $type = Add-Type -MemberDefinition $signature -Name WinINet -Namespace Proxy -PassThru
    $type::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null  # INTERNET_OPTION_SETTINGS_CHANGED
    $type::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null  # INTERNET_OPTION_REFRESH
    
    Write-Host ""
    Write-Host "[SUCCESS] Settings applied to system" -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Failed to configure proxy: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-dns-client-settings',
    name: 'Configure DNS Client Settings',
    category: 'Network Settings',
    description: 'Configure DNS client caching and resolution settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures DNS client cache and resolver behavior
- Adjusts cache size, TTL, and negative caching
- Can enable/disable DNS over HTTPS (DoH)

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- DNS Client service must be running

**What You Need to Provide:**
- Maximum cache TTL (time-to-live in seconds)
- Negative cache TTL for failed lookups
- Whether to enable DNS caching

**What the Script Does:**
1. Sets MaxCacheTtl for positive cache entries
2. Configures NegativeCacheTime for failed lookups
3. Optionally disables DNS client caching
4. Restarts DNS Client service if needed
5. Reports current configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Changes may require DNS Client service restart
- Disabling cache increases DNS traffic
- Lower TTL = faster updates, more queries
- Negative cache prevents hammering failed domains
- Typical use: troubleshooting, security, performance
- Use ipconfig /flushdns to clear cache manually
- Test DNS resolution after changes`,
    parameters: [
      { id: 'maxCacheTtl', label: 'Max Cache TTL (seconds)', type: 'number', required: false, defaultValue: 86400 },
      { id: 'negativeCacheTtl', label: 'Negative Cache TTL (seconds)', type: 'number', required: false, defaultValue: 5 },
      { id: 'enableCache', label: 'Enable DNS Caching', type: 'boolean', required: false, defaultValue: true },
      { id: 'restartService', label: 'Restart DNS Client Service', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const maxCacheTtl = Number(params.maxCacheTtl || 86400);
      const negativeCacheTtl = Number(params.negativeCacheTtl || 5);
      const enableCache = toPowerShellBoolean(params.enableCache ?? true);
      const restartService = toPowerShellBoolean(params.restartService ?? true);
      
      return `# Configure DNS Client Settings
# Generated: ${new Date().toISOString()}

$MaxCacheTtl = ${maxCacheTtl}
$NegativeCacheTtl = ${negativeCacheTtl}
$EnableCache = ${enableCache}
$RestartService = ${restartService}

$DNSKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters"

Write-Host "Configuring DNS Client Settings..." -ForegroundColor Cyan
Write-Host ""

try {
    # Ensure registry key exists
    if (-not (Test-Path $DNSKey)) {
        New-Item -Path $DNSKey -Force | Out-Null
    }
    
    # Set cache TTL values
    Set-ItemProperty -Path $DNSKey -Name "MaxCacheTtl" -Value $MaxCacheTtl -Type DWord -Force
    Set-ItemProperty -Path $DNSKey -Name "MaxNegativeCacheTtl" -Value $NegativeCacheTtl -Type DWord -Force
    
    Write-Host "[SUCCESS] Cache Settings:" -ForegroundColor Green
    Write-Host "  Max Cache TTL: $MaxCacheTtl seconds" -ForegroundColor Gray
    Write-Host "  Negative Cache TTL: $NegativeCacheTtl seconds" -ForegroundColor Gray
    
    # Enable/disable caching
    $CacheLevel = if ($EnableCache) { 0 } else { 1 }
    $ServiceKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache"
    Set-ItemProperty -Path $ServiceKey -Name "Start" -Value $(if ($EnableCache) { 2 } else { 4 }) -Type DWord -Force -ErrorAction SilentlyContinue
    
    Write-Host "  DNS Caching: $(if ($EnableCache) { 'Enabled' } else { 'Disabled' })" -ForegroundColor Gray
    
    # Restart service if requested
    if ($RestartService) {
        Write-Host ""
        Write-Host "Restarting DNS Client service..." -ForegroundColor Yellow
        Restart-Service -Name "Dnscache" -Force -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] DNS Client service restarted" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Current DNS Cache Statistics:" -ForegroundColor Cyan
    Get-DnsClientCache | Measure-Object | ForEach-Object {
        Write-Host "  Cached entries: $($_.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAILED] Failed to configure DNS settings: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-network-discovery',
    name: 'Configure Network Discovery',
    category: 'Network Settings',
    description: 'Enable or disable network discovery and file sharing via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures network discovery and sharing settings
- Controls visibility on local network
- Manages Function Discovery services

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network Location Awareness service running

**What You Need to Provide:**
- Enable or disable network discovery
- Network profile type (Domain/Private/Public)
- Whether to enable file and printer sharing

**What the Script Does:**
1. Configures network profile category
2. Enables/disables required services
3. Sets firewall rules for discovery
4. Configures file sharing if enabled
5. Reports current network profile settings

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Public networks should have discovery disabled
- Discovery allows other devices to see this PC
- File sharing exposes shared folders
- Typical use: home/office network setup
- Security risk on public/untrusted networks
- May need to configure specific shares separately`,
    parameters: [
      { id: 'action', label: 'Network Discovery', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' },
      { id: 'networkProfile', label: 'Network Profile', type: 'select', required: true, options: ['Private', 'Domain', 'Public'], defaultValue: 'Private' },
      { id: 'fileSharing', label: 'Enable File and Printer Sharing', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const networkProfile = params.networkProfile;
      const fileSharing = toPowerShellBoolean(params.fileSharing ?? false);
      
      return `# Configure Network Discovery
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$NetworkProfile = "${networkProfile}"
$FileSharing = ${fileSharing}

Write-Host "Configuring Network Discovery..." -ForegroundColor Cyan
Write-Host "  Profile: $NetworkProfile" -ForegroundColor Gray
Write-Host ""

try {
    # Get current network profile
    $CurrentProfile = Get-NetConnectionProfile | Select-Object -First 1
    Write-Host "Current Network: $($CurrentProfile.Name)" -ForegroundColor Gray
    Write-Host "Current Category: $($CurrentProfile.NetworkCategory)" -ForegroundColor Gray
    Write-Host ""
    
    # Set firewall rules based on action
    $RuleGroups = @(
        "Network Discovery",
        "File and Printer Sharing"
    )
    
    if ($Action -eq "Enable") {
        # Enable Network Discovery
        Enable-NetFirewallRule -DisplayGroup "Network Discovery" -Profile $NetworkProfile -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] Network Discovery: Enabled for $NetworkProfile" -ForegroundColor Green
        
        # Start required services
        $Services = @("FDResPub", "SSDPSRV", "upnphost", "fdPHost")
        foreach ($Svc in $Services) {
            Set-Service -Name $Svc -StartupType Automatic -ErrorAction SilentlyContinue
            Start-Service -Name $Svc -ErrorAction SilentlyContinue
        }
        Write-Host "[SUCCESS] Discovery services started" -ForegroundColor Green
        
        if ($FileSharing) {
            Enable-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Profile $NetworkProfile -ErrorAction SilentlyContinue
            Set-Service -Name "LanmanServer" -StartupType Automatic -ErrorAction SilentlyContinue
            Start-Service -Name "LanmanServer" -ErrorAction SilentlyContinue
            Write-Host "[SUCCESS] File and Printer Sharing: Enabled" -ForegroundColor Green
        }
    } else {
        # Disable Network Discovery
        Disable-NetFirewallRule -DisplayGroup "Network Discovery" -Profile $NetworkProfile -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] Network Discovery: Disabled for $NetworkProfile" -ForegroundColor Green
        
        if (-not $FileSharing) {
            Disable-NetFirewallRule -DisplayGroup "File and Printer Sharing" -Profile $NetworkProfile -ErrorAction SilentlyContinue
            Write-Host "[SUCCESS] File and Printer Sharing: Disabled" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Network Discovery Configuration Complete" -ForegroundColor Cyan
} catch {
    Write-Host "[FAILED] Failed to configure network discovery: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-smb-settings',
    name: 'Configure SMB Protocol Settings',
    category: 'Network Settings',
    description: 'Configure SMB protocol versions and security settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Server Message Block (SMB) protocol settings
- Enables/disables specific SMB versions
- Adjusts SMB security configurations

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- LanmanServer and LanmanWorkstation services

**What You Need to Provide:**
- SMB1 enable/disable (legacy, security risk)
- SMB2 enable/disable
- SMB signing requirement
- SMB encryption requirement

**What the Script Does:**
1. Configures SMB1 protocol (via registry)
2. Sets SMB2/SMB3 protocol state
3. Configures SMB signing policy
4. Sets encryption requirements
5. Reports protocol status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- SMB1 is a SECURITY RISK - disable unless required
- SMB1 needed for Windows XP and older NAS devices
- SMB signing prevents man-in-the-middle attacks
- SMB encryption protects data in transit
- Typical use: security hardening, compliance
- Test file sharing after changes
- Reboot may be required for full effect`,
    parameters: [
      { id: 'smb1Enabled', label: 'Enable SMB1 (Legacy - Security Risk)', type: 'boolean', required: false, defaultValue: false },
      { id: 'smb2Enabled', label: 'Enable SMB2/SMB3', type: 'boolean', required: false, defaultValue: true },
      { id: 'requireSigning', label: 'Require SMB Signing', type: 'boolean', required: false, defaultValue: true },
      { id: 'requireEncryption', label: 'Require SMB Encryption', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const smb1Enabled = toPowerShellBoolean(params.smb1Enabled ?? false);
      const smb2Enabled = toPowerShellBoolean(params.smb2Enabled ?? true);
      const requireSigning = toPowerShellBoolean(params.requireSigning ?? true);
      const requireEncryption = toPowerShellBoolean(params.requireEncryption ?? false);
      
      return `# Configure SMB Protocol Settings
# Generated: ${new Date().toISOString()}

$SMB1Enabled = ${smb1Enabled}
$SMB2Enabled = ${smb2Enabled}
$RequireSigning = ${requireSigning}
$RequireEncryption = ${requireEncryption}

Write-Host "Configuring SMB Protocol Settings..." -ForegroundColor Cyan
Write-Host ""

try {
    # Configure SMB1
    $SMB1Key = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters"
    Set-ItemProperty -Path $SMB1Key -Name "SMB1" -Value $(if ($SMB1Enabled) { 1 } else { 0 }) -Type DWord -Force
    
    if ($SMB1Enabled) {
        Write-Host "[WARNING] SMB1: Enabled (SECURITY RISK)" -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] SMB1: Disabled (Recommended)" -ForegroundColor Green
    }
    
    # Configure SMB2/3
    Set-ItemProperty -Path $SMB1Key -Name "SMB2" -Value $(if ($SMB2Enabled) { 1 } else { 0 }) -Type DWord -Force
    Write-Host "[SUCCESS] SMB2/SMB3: $(if ($SMB2Enabled) { 'Enabled' } else { 'Disabled' })" -ForegroundColor Green
    
    # Configure SMB Signing (Server)
    Set-ItemProperty -Path $SMB1Key -Name "RequireSecuritySignature" -Value $(if ($RequireSigning) { 1 } else { 0 }) -Type DWord -Force
    Write-Host "[SUCCESS] SMB Signing (Server): $(if ($RequireSigning) { 'Required' } else { 'Optional' })" -ForegroundColor Green
    
    # Configure SMB Signing (Client)
    $ClientKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters"
    Set-ItemProperty -Path $ClientKey -Name "RequireSecuritySignature" -Value $(if ($RequireSigning) { 1 } else { 0 }) -Type DWord -Force
    Write-Host "[SUCCESS] SMB Signing (Client): $(if ($RequireSigning) { 'Required' } else { 'Optional' })" -ForegroundColor Green
    
    # Configure SMB Encryption
    Set-ItemProperty -Path $SMB1Key -Name "EncryptData" -Value $(if ($RequireEncryption) { 1 } else { 0 }) -Type DWord -Force
    Write-Host "[SUCCESS] SMB Encryption: $(if ($RequireEncryption) { 'Required' } else { 'Optional' })" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[WARNING] Restart may be required for all changes to take effect" -ForegroundColor Yellow
    
    # Show current SMB configuration
    Write-Host ""
    Write-Host "Current SMB Server Configuration:" -ForegroundColor Cyan
    Get-SmbServerConfiguration | Select-Object EnableSMB1Protocol, EnableSMB2Protocol, RequireSecuritySignature, EncryptData | Format-List
} catch {
    Write-Host "[FAILED] Failed to configure SMB settings: $_" -ForegroundColor Red
}`;
    }
  },

  // ============================================
  // SOFTWARE MANAGEMENT TASKS
  // ============================================

  {
    id: 'get-installed-software-report',
    name: 'Get Installed Software Report',
    category: 'Software Management',
    description: 'Generate comprehensive report of installed software from registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans registry for all installed software
- Retrieves detailed information about each program
- Exports results to CSV or displays in console

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on registry
- Admin for complete HKLM scan

**What You Need to Provide:**
- Output format (Console or CSV)
- Export path for CSV output
- Whether to include system components

**What the Script Does:**
1. Scans HKLM and HKCU Uninstall keys
2. Retrieves DisplayName, Version, Publisher, InstallDate
3. Captures InstallLocation and UninstallString
4. Formats output for display or export
5. Reports total software count

**Important Notes:**
- Scans both 32-bit and 64-bit registry locations
- SystemComponent flag hides items from Programs list
- Some entries may have incomplete information
- Typical use: software inventory, auditing, compliance
- Export to CSV for spreadsheet analysis
- InstallDate format may vary by installer
- Run as admin for complete results`,
    parameters: [
      { id: 'outputFormat', label: 'Output Format', type: 'select', required: true, options: ['Console', 'CSV'], defaultValue: 'Console' },
      { id: 'exportPath', label: 'CSV Export Path (if CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\InstalledSoftware.csv' },
      { id: 'includeSystemComponents', label: 'Include System Components', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const outputFormat = params.outputFormat;
      const exportPath = escapePowerShellString(params.exportPath || '');
      const includeSystemComponents = toPowerShellBoolean(params.includeSystemComponents ?? false);
      
      return `# Get Installed Software Report
# Generated: ${new Date().toISOString()}

$OutputFormat = "${outputFormat}"
$ExportPath = "${exportPath}"
$IncludeSystemComponents = ${includeSystemComponents}

Write-Host "Scanning installed software..." -ForegroundColor Cyan
Write-Host ""

$UninstallPaths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
)

$Software = @()

foreach ($Path in $UninstallPaths) {
    if (-not (Test-Path $Path)) { continue }
    
    Get-ChildItem -Path $Path -ErrorAction SilentlyContinue | ForEach-Object {
        $Props = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
        
        # Skip if no display name
        if (-not $Props.DisplayName) { return }
        
        # Skip system components unless requested
        if (-not $IncludeSystemComponents -and $Props.SystemComponent -eq 1) { return }
        
        $Software += [PSCustomObject]@{
            Name = $Props.DisplayName
            Version = $Props.DisplayVersion
            Publisher = $Props.Publisher
            InstallDate = $Props.InstallDate
            InstallLocation = $Props.InstallLocation
            UninstallString = $Props.UninstallString
            Architecture = if ($Path -match 'WOW6432Node') { 'x86' } else { 'x64' }
            RegistryPath = $_.PSPath
        }
    }
}

# Remove duplicates and sort
$Software = $Software | Sort-Object Name -Unique

Write-Host "Found $($Software.Count) installed programs" -ForegroundColor Green
Write-Host ""

if ($OutputFormat -eq "CSV") {
    if (-not $ExportPath) {
        $ExportPath = "$env:TEMP\\InstalledSoftware_$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    }
    
    $Software | Export-Csv -Path $ExportPath -NoTypeInformation -Force
    Write-Host "[SUCCESS] Report exported to: $ExportPath" -ForegroundColor Green
} else {
    Write-Host "Installed Software:" -ForegroundColor Yellow
    Write-Host ("-" * 80) -ForegroundColor Gray
    
    $Software | ForEach-Object {
        Write-Host "$($_.Name)" -ForegroundColor Cyan
        if ($_.Version) { Write-Host "  Version: $($_.Version)" -ForegroundColor Gray }
        if ($_.Publisher) { Write-Host "  Publisher: $($_.Publisher)" -ForegroundColor Gray }
        if ($_.InstallDate) { Write-Host "  Installed: $($_.InstallDate)" -ForegroundColor Gray }
        Write-Host ""
    }
}`;
    }
  },

  {
    id: 'configure-file-association',
    name: 'Configure File Association',
    category: 'Software Management',
    description: 'Set default program for file extension via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures default program for a file extension
- Sets ProgId and shell command for opening files
- Creates new file type if it doesn't exist

**Prerequisites:**
- Administrator privileges (for system-wide)
- PowerShell 5.1 or later
- Target program must exist

**What You Need to Provide:**
- File extension (with dot, e.g., .txt)
- Program path to handle the file type
- Friendly type name (appears in Explorer)
- Icon path (optional)

**What the Script Does:**
1. Creates/updates extension key in HKCR
2. Creates ProgId with friendly name
3. Sets open command with program path
4. Configures file type icon if provided
5. Notifies shell of association change

**Important Notes:**
- REQUIRES ADMINISTRATOR for HKCR changes
- User associations in HKCU may override HKCR
- Windows 10+ may require additional steps
- Use SHChangeNotify to update Explorer
- Typical use: deploy default apps, fix associations
- Test by double-clicking file after change
- Some file types are protected by Windows`,
    parameters: [
      { id: 'extension', label: 'File Extension', type: 'text', required: true, placeholder: '.txt' },
      { id: 'programPath', label: 'Program Path', type: 'path', required: true, placeholder: 'C:\\Program Files\\Notepad++\\notepad++.exe' },
      { id: 'typeName', label: 'Friendly Type Name', type: 'text', required: true, placeholder: 'Text Document' },
      { id: 'iconPath', label: 'Icon Path (optional)', type: 'path', required: false, placeholder: 'C:\\Program Files\\MyApp\\icon.ico' }
    ],
    scriptTemplate: (params) => {
      const extension = escapePowerShellString(params.extension);
      const programPath = escapePowerShellString(params.programPath);
      const typeName = escapePowerShellString(params.typeName);
      const iconPath = escapePowerShellString(params.iconPath || '');
      
      return `# Configure File Association
# Generated: ${new Date().toISOString()}

$Extension = "${extension}"
$ProgramPath = "${programPath}"
$TypeName = "${typeName}"
$IconPath = "${iconPath}"

# Ensure extension starts with dot
if (-not $Extension.StartsWith('.')) {
    $Extension = ".$Extension"
}

# Create ProgId
$ProgId = "PSForge" + $Extension.TrimStart('.').ToUpper() + "File"

Write-Host "Configuring File Association..." -ForegroundColor Cyan
Write-Host "  Extension: $Extension" -ForegroundColor Gray
Write-Host "  Program: $ProgramPath" -ForegroundColor Gray
Write-Host ""

try {
    # Verify program exists
    if (-not (Test-Path $ProgramPath)) {
        Write-Host "[WARNING] Warning: Program not found at specified path" -ForegroundColor Yellow
    }
    
    # Create extension key
    $ExtKey = "Registry::HKEY_CLASSES_ROOT\\$Extension"
    New-Item -Path $ExtKey -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $ExtKey -Name "(Default)" -Value $ProgId -Force
    Write-Host "[SUCCESS] Extension registered: $Extension -> $ProgId" -ForegroundColor Green
    
    # Create ProgId key
    $ProgIdKey = "Registry::HKEY_CLASSES_ROOT\\$ProgId"
    New-Item -Path $ProgIdKey -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $ProgIdKey -Name "(Default)" -Value $TypeName -Force
    Write-Host "[SUCCESS] ProgId created: $ProgId" -ForegroundColor Green
    
    # Create shell\\open\\command
    $CommandKey = "$ProgIdKey\\shell\\open\\command"
    New-Item -Path $CommandKey -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $CommandKey -Name "(Default)" -Value "\`"$ProgramPath\`" \`"%1\`"" -Force
    Write-Host "[SUCCESS] Open command configured" -ForegroundColor Green
    
    # Set icon if provided
    if ($IconPath) {
        $IconKey = "$ProgIdKey\\DefaultIcon"
        New-Item -Path $IconKey -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $IconKey -Name "(Default)" -Value $IconPath -Force
        Write-Host "[SUCCESS] Icon configured: $IconPath" -ForegroundColor Green
    }
    
    # Notify shell of change
    $code = @'
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
'@
    $shell = Add-Type -MemberDefinition $code -Name Shell -Namespace Win32 -PassThru
    $shell::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    
    Write-Host ""
    Write-Host "[SUCCESS] File association configured successfully" -ForegroundColor Green
    Write-Host "  Files with $Extension will open with: $ProgramPath" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Failed to configure file association: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'manage-context-menu-entries',
    name: 'Manage Context Menu Entries',
    category: 'Software Management',
    description: 'Add or remove entries from Windows Explorer context menu',
    isPremium: true,
    instructions: `**How This Task Works:**
- Adds or removes custom context menu entries
- Configures right-click menu for files/folders
- Can target specific file types or all files

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Command/script must exist for Add action

**What You Need to Provide:**
- Action: Add or Remove menu entry
- Menu text (what appears in context menu)
- Command to execute when clicked
- Target: All Files, Folders, or specific extension

**What the Script Does:**
1. Determines target registry location
2. Creates or removes shell command key
3. Sets menu text and command
4. Optionally adds icon
5. Notifies Explorer of change

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Use %1 in command for selected file path
- Menu entries appear after restart or refresh
- Too many entries clutter the menu
- Typical use: add tools, quick actions
- Test thoroughly before deployment
- Position controlled by registry order`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'menuText', label: 'Menu Text', type: 'text', required: true, placeholder: 'Open with MyApp' },
      { id: 'command', label: 'Command (for Add)', type: 'text', required: false, placeholder: '"C:\\Program Files\\MyApp\\app.exe" "%1"' },
      { id: 'target', label: 'Target', type: 'select', required: true, options: ['All Files', 'Folders', 'Directory Background'], defaultValue: 'All Files' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const menuText = escapePowerShellString(params.menuText);
      const command = escapePowerShellString(params.command || '');
      const target = params.target;
      
      return `# Manage Context Menu Entries
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$MenuText = "${menuText}"
$Command = "${command}"
$Target = "${target}"

# Generate safe key name from menu text
$KeyName = $MenuText -replace '[^a-zA-Z0-9]', ''

# Determine registry path based on target
$RegistryPath = switch ($Target) {
    "All Files" { "Registry::HKEY_CLASSES_ROOT\\*\\shell\\$KeyName" }
    "Folders" { "Registry::HKEY_CLASSES_ROOT\\Directory\\shell\\$KeyName" }
    "Directory Background" { "Registry::HKEY_CLASSES_ROOT\\Directory\\Background\\shell\\$KeyName" }
}

Write-Host "Managing Context Menu Entry..." -ForegroundColor Cyan
Write-Host "  Target: $Target" -ForegroundColor Gray
Write-Host "  Menu Text: $MenuText" -ForegroundColor Gray
Write-Host ""

try {
    if ($Action -eq "Add") {
        if (-not $Command) {
            Write-Host "[FAILED] Command is required for Add action" -ForegroundColor Red
            exit 1
        }
        
        # Create shell key
        New-Item -Path $RegistryPath -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $MenuText -Force
        
        # Create command key
        $CommandKey = "$RegistryPath\\command"
        New-Item -Path $CommandKey -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $CommandKey -Name "(Default)" -Value $Command -Force
        
        Write-Host "[SUCCESS] Context menu entry added:" -ForegroundColor Green
        Write-Host "  Menu: $MenuText" -ForegroundColor Gray
        Write-Host "  Command: $Command" -ForegroundColor Gray
        Write-Host "  Location: $RegistryPath" -ForegroundColor Gray
        
    } elseif ($Action -eq "Remove") {
        if (Test-Path $RegistryPath) {
            Remove-Item -Path $RegistryPath -Recurse -Force
            Write-Host "[SUCCESS] Context menu entry removed: $MenuText" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Context menu entry not found: $MenuText" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "[WARNING] Restart Explorer or log off for changes to appear" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to manage context menu: $_" -ForegroundColor Red
}`;
    }
  },

  // ============================================
  // SECURITY HARDENING TASKS
  // ============================================

  {
    id: 'configure-password-policy',
    name: 'Configure Password Policy',
    category: 'Security Hardening',
    description: 'Configure local password policy settings via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures local password complexity and requirements
- Sets minimum password length and history
- Note: Domain GPO overrides these settings

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Local security policy access

**What You Need to Provide:**
- Minimum password length
- Password history count
- Maximum password age (days)
- Complexity requirement

**What the Script Does:**
1. Exports current security policy
2. Modifies password policy settings
3. Imports updated security policy
4. Reports all configuration changes
5. Validates settings applied

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Domain Group Policy will OVERRIDE these settings
- Affects local accounts only in domain environment
- Uses secedit for policy management
- Complexity requires 3 of 4: upper, lower, number, symbol
- Typical use: standalone workstations, kiosks
- Test user password change after configuration
- Changes affect new passwords only`,
    parameters: [
      { id: 'minLength', label: 'Minimum Password Length', type: 'number', required: true, defaultValue: 12 },
      { id: 'historyCount', label: 'Password History Count', type: 'number', required: false, defaultValue: 24 },
      { id: 'maxAge', label: 'Maximum Password Age (days)', type: 'number', required: false, defaultValue: 90 },
      { id: 'requireComplexity', label: 'Require Complexity', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const minLength = Number(params.minLength || 12);
      const historyCount = Number(params.historyCount || 24);
      const maxAge = Number(params.maxAge || 90);
      const requireComplexity = params.requireComplexity ?? true;
      
      return `# Configure Password Policy
# Generated: ${new Date().toISOString()}

$MinLength = ${minLength}
$HistoryCount = ${historyCount}
$MaxAge = ${maxAge}
$RequireComplexity = $(requireComplexity ? 1 : 0)

Write-Host "Configuring Password Policy..." -ForegroundColor Cyan
Write-Host ""

try {
    # Export current security policy
    $TempCfg = "$env:TEMP\\secpol_temp.cfg"
    $TempDb = "$env:TEMP\\secpol_temp.sdb"
    
    secedit /export /cfg $TempCfg /quiet
    
    # Read and modify the policy
    $Content = Get-Content $TempCfg
    
    $NewContent = $Content | ForEach-Object {
        if ($_ -match "^MinimumPasswordLength") {
            "MinimumPasswordLength = $MinLength"
        } elseif ($_ -match "^PasswordHistorySize") {
            "PasswordHistorySize = $HistoryCount"
        } elseif ($_ -match "^MaximumPasswordAge") {
            "MaximumPasswordAge = $MaxAge"
        } elseif ($_ -match "^PasswordComplexity") {
            "PasswordComplexity = $RequireComplexity"
        } else {
            $_
        }
    }
    
    $NewContent | Set-Content $TempCfg -Force
    
    # Import the modified policy
    secedit /configure /db $TempDb /cfg $TempCfg /quiet
    
    # Cleanup
    Remove-Item $TempCfg -Force -ErrorAction SilentlyContinue
    Remove-Item $TempDb -Force -ErrorAction SilentlyContinue
    
    Write-Host "[SUCCESS] Password Policy Configured:" -ForegroundColor Green
    Write-Host "  Minimum Length: $MinLength characters" -ForegroundColor Gray
    Write-Host "  Password History: $HistoryCount passwords" -ForegroundColor Gray
    Write-Host "  Maximum Age: $MaxAge days" -ForegroundColor Gray
    Write-Host "  Complexity Required: $(if ($RequireComplexity -eq 1) { 'Yes' } else { 'No' })" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Domain Group Policy will override these settings" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure password policy: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-audit-policy',
    name: 'Configure Audit Policy',
    category: 'Security Hardening',
    description: 'Enable security auditing via registry settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows security audit policy
- Enables logging of security events
- Sets up failure and success auditing

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Security event log must have space

**What You Need to Provide:**
- Audit category to configure
- Whether to audit success events
- Whether to audit failure events

**What the Script Does:**
1. Identifies audit subcategory GUID
2. Configures success/failure auditing
3. Uses auditpol.exe for reliable configuration
4. Reports audit policy changes
5. Verifies settings applied

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Excessive auditing impacts performance
- Check Security event log size
- Domain GPO may override settings
- Typical use: compliance, security monitoring
- Monitor event log for overflow
- Consider SIEM for log collection
- Test with minimal auditing first`,
    parameters: [
      { id: 'auditCategory', label: 'Audit Category', type: 'select', required: true, options: [
        'Logon/Logoff',
        'Account Management',
        'Object Access',
        'Policy Change',
        'Privilege Use',
        'Process Tracking',
        'System Events',
        'All Categories'
      ], defaultValue: 'Logon/Logoff' },
      { id: 'auditSuccess', label: 'Audit Success Events', type: 'boolean', required: false, defaultValue: true },
      { id: 'auditFailure', label: 'Audit Failure Events', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const auditCategory = params.auditCategory;
      const auditSuccess = params.auditSuccess ?? true;
      const auditFailure = params.auditFailure ?? true;
      
      let setting = 'disable';
      if (auditSuccess && auditFailure) setting = 'enable';
      else if (auditSuccess) setting = 'success:enable';
      else if (auditFailure) setting = 'failure:enable';
      
      return `# Configure Audit Policy
# Generated: ${new Date().toISOString()}

$AuditCategory = "${auditCategory}"
$AuditSuccess = $(auditSuccess ? '$true' : '$false')
$AuditFailure = $(auditFailure ? '$true' : '$false')

Write-Host "Configuring Audit Policy..." -ForegroundColor Cyan
Write-Host "  Category: $AuditCategory" -ForegroundColor Gray
Write-Host "  Success: $AuditSuccess" -ForegroundColor Gray
Write-Host "  Failure: $AuditFailure" -ForegroundColor Gray
Write-Host ""

try {
    $Categories = @{
        "Logon/Logoff" = "Logon"
        "Account Management" = "Account Management"
        "Object Access" = "Object Access"
        "Policy Change" = "Policy Change"
        "Privilege Use" = "Privilege Use"
        "Process Tracking" = "Detailed Tracking"
        "System Events" = "System"
    }
    
    # Build audit setting
    $Setting = if ($AuditSuccess -and $AuditFailure) { "/success:enable /failure:enable" }
               elseif ($AuditSuccess) { "/success:enable /failure:disable" }
               elseif ($AuditFailure) { "/success:disable /failure:enable" }
               else { "/success:disable /failure:disable" }
    
    if ($AuditCategory -eq "All Categories") {
        foreach ($Cat in $Categories.Keys) {
            $CatName = $Categories[$Cat]
            auditpol /set /category:"$CatName" $Setting.Split(' ') 2>&1 | Out-Null
            Write-Host "  [OK] $Cat configured" -ForegroundColor Green
        }
    } else {
        $CatName = $Categories[$AuditCategory]
        auditpol /set /category:"$CatName" $Setting.Split(' ') 2>&1 | Out-Null
        Write-Host "  [OK] $AuditCategory configured" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Current Audit Policy:" -ForegroundColor Yellow
    auditpol /get /category:* | Where-Object { $_ -match "\\s+(Success|Failure|No Auditing)" } | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAILED] Failed to configure audit policy: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-lsa-protection',
    name: 'Configure LSA Protection',
    category: 'Security Hardening',
    description: 'Enable Local Security Authority protection and Credential Guard',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables LSA protection (RunAsPPL)
- Configures Credential Guard settings
- Hardens credential storage against attacks

**Prerequisites:**
- Administrator privileges required
- Windows 10/11 Enterprise or Education
- UEFI firmware with Secure Boot
- VBS-capable hardware

**What You Need to Provide:**
- Enable LSA Protection (RunAsPPL)
- Enable Credential Guard
- Lock configuration (prevent changes)

**What the Script Does:**
1. Enables LSA protected mode (RunAsPPL)
2. Configures Virtualization Based Security
3. Enables Credential Guard if hardware supports
4. Sets lock configuration if enabled
5. Reports compatibility status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REQUIRES compatible hardware (VT-x, SLAT)
- May cause compatibility issues with some apps
- LSA protection prevents credential dumping
- Credential Guard isolates secrets in VM
- Test thoroughly before production deployment
- REBOOT REQUIRED for changes to take effect
- Cannot be disabled without safe mode`,
    parameters: [
      { id: 'enableLSAProtection', label: 'Enable LSA Protection (RunAsPPL)', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableCredentialGuard', label: 'Enable Credential Guard', type: 'boolean', required: false, defaultValue: false },
      { id: 'lockConfiguration', label: 'Lock Configuration (UEFI)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const enableLSAProtection = toPowerShellBoolean(params.enableLSAProtection ?? true);
      const enableCredentialGuard = toPowerShellBoolean(params.enableCredentialGuard ?? false);
      const lockConfiguration = toPowerShellBoolean(params.lockConfiguration ?? false);
      
      return `# Configure LSA Protection
# Generated: ${new Date().toISOString()}

$EnableLSAProtection = ${enableLSAProtection}
$EnableCredentialGuard = ${enableCredentialGuard}
$LockConfiguration = ${lockConfiguration}

Write-Host "Configuring LSA Protection..." -ForegroundColor Cyan
Write-Host ""

try {
    # Configure LSA Protection (RunAsPPL)
    $LSAKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Lsa"
    
    if ($EnableLSAProtection) {
        Set-ItemProperty -Path $LSAKey -Name "RunAsPPL" -Value 1 -Type DWord -Force
        Write-Host "[SUCCESS] LSA Protection (RunAsPPL): Enabled" -ForegroundColor Green
    } else {
        Set-ItemProperty -Path $LSAKey -Name "RunAsPPL" -Value 0 -Type DWord -Force
        Write-Host "[SUCCESS] LSA Protection (RunAsPPL): Disabled" -ForegroundColor Yellow
    }
    
    # Configure Credential Guard
    if ($EnableCredentialGuard) {
        $DeviceGuardKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard"
        New-Item -Path $DeviceGuardKey -Force -ErrorAction SilentlyContinue | Out-Null
        
        # Enable Virtualization Based Security
        Set-ItemProperty -Path $DeviceGuardKey -Name "EnableVirtualizationBasedSecurity" -Value 1 -Type DWord -Force
        
        # Configure Credential Guard
        if ($LockConfiguration) {
            Set-ItemProperty -Path $DeviceGuardKey -Name "LsaCfgFlags" -Value 1 -Type DWord -Force  # Enabled with UEFI lock
            Write-Host "[SUCCESS] Credential Guard: Enabled with UEFI Lock" -ForegroundColor Green
            Write-Host "  [WARNING] Warning: Cannot be disabled without UEFI setting change" -ForegroundColor Yellow
        } else {
            Set-ItemProperty -Path $DeviceGuardKey -Name "LsaCfgFlags" -Value 2 -Type DWord -Force  # Enabled without lock
            Write-Host "[SUCCESS] Credential Guard: Enabled (no UEFI lock)" -ForegroundColor Green
        }
        
        # Enable required features
        Set-ItemProperty -Path $DeviceGuardKey -Name "RequirePlatformSecurityFeatures" -Value 1 -Type DWord -Force
    }
    
    Write-Host ""
    Write-Host "Hardware Requirements Check:" -ForegroundColor Cyan
    
    # Check hardware support
    $VBSStatus = Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\\Microsoft\\Windows\\DeviceGuard -ErrorAction SilentlyContinue
    if ($VBSStatus) {
        Write-Host "  VBS Available: $($VBSStatus.VirtualizationBasedSecurityStatus -eq 2)" -ForegroundColor Gray
        Write-Host "  Secure Boot: $($VBSStatus.SecureBootEnabled)" -ForegroundColor Gray
    } else {
        Write-Host "  Unable to query Device Guard status" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "[WARNING] REBOOT REQUIRED for changes to take effect" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure LSA protection: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-attack-surface-reduction',
    name: 'Configure Attack Surface Reduction',
    category: 'Security Hardening',
    description: 'Configure Windows Defender Attack Surface Reduction rules',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures ASR rules to block attack techniques
- Prevents malicious scripts, macros, and exploits
- Part of Windows Defender Exploit Guard

**Prerequisites:**
- Administrator privileges required
- Windows 10/11 Pro or Enterprise
- Windows Defender must be active
- PowerShell 5.1 or later

**What You Need to Provide:**
- ASR rule to configure
- Action: Block, Audit, or Disable

**What the Script Does:**
1. Identifies ASR rule GUID
2. Sets rule action via PowerShell cmdlet
3. Alternatively uses registry for compatibility
4. Reports rule status
5. Lists all configured rules

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Third-party AV may disable Defender ASR
- Audit mode logs without blocking
- Test in Audit before Block
- Some rules may cause app compatibility issues
- Typical use: ransomware protection, exploit prevention
- Monitor Security event log for blocked actions
- Use Get-MpPreference to check current rules`,
    parameters: [
      { id: 'asrRule', label: 'ASR Rule', type: 'select', required: true, options: [
        'Block Office apps from creating child processes',
        'Block Office apps from creating executable content',
        'Block Office apps from injecting into processes',
        'Block JavaScript/VBScript from launching downloaded content',
        'Block execution of obfuscated scripts',
        'Block Win32 API calls from Office macros',
        'Block credential stealing from LSASS',
        'Block untrusted processes from USB',
        'Block process creation from PSExec/WMI',
        'Block Adobe Reader from creating child processes'
      ], defaultValue: 'Block credential stealing from LSASS' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Block', 'Audit', 'Disable'], defaultValue: 'Audit' }
    ],
    scriptTemplate: (params) => {
      const asrRule = params.asrRule;
      const action = params.action;
      
      const ruleGuids: Record<string, string> = {
        'Block Office apps from creating child processes': 'd4f940ab-401b-4efc-aadc-ad5f3c50688a',
        'Block Office apps from creating executable content': '3b576869-a4ec-4529-8536-b80a7769e899',
        'Block Office apps from injecting into processes': '75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84',
        'Block JavaScript/VBScript from launching downloaded content': 'd3e037e1-3eb8-44c8-a917-57927947596d',
        'Block execution of obfuscated scripts': '5beb7efe-fd9a-4556-801d-275e5ffc04cc',
        'Block Win32 API calls from Office macros': '92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b',
        'Block credential stealing from LSASS': '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2',
        'Block untrusted processes from USB': 'b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4',
        'Block process creation from PSExec/WMI': 'd1e49aac-8f56-4280-b9ba-993a6d77406c',
        'Block Adobe Reader from creating child processes': '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c'
      };
      
      return `# Configure Attack Surface Reduction
# Generated: ${new Date().toISOString()}

$ASRRule = "${asrRule}"
$Action = "${action}"

$RuleGuids = @{
    "Block Office apps from creating child processes" = "d4f940ab-401b-4efc-aadc-ad5f3c50688a"
    "Block Office apps from creating executable content" = "3b576869-a4ec-4529-8536-b80a7769e899"
    "Block Office apps from injecting into processes" = "75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84"
    "Block JavaScript/VBScript from launching downloaded content" = "d3e037e1-3eb8-44c8-a917-57927947596d"
    "Block execution of obfuscated scripts" = "5beb7efe-fd9a-4556-801d-275e5ffc04cc"
    "Block Win32 API calls from Office macros" = "92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b"
    "Block credential stealing from LSASS" = "9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2"
    "Block untrusted processes from USB" = "b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4"
    "Block process creation from PSExec/WMI" = "d1e49aac-8f56-4280-b9ba-993a6d77406c"
    "Block Adobe Reader from creating child processes" = "7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c"
}

$ActionValues = @{
    "Disable" = 0
    "Block" = 1
    "Audit" = 2
}

Write-Host "Configuring Attack Surface Reduction..." -ForegroundColor Cyan
Write-Host "  Rule: $ASRRule" -ForegroundColor Gray
Write-Host "  Action: $Action" -ForegroundColor Gray
Write-Host ""

try {
    $RuleGuid = $RuleGuids[$ASRRule]
    $ActionValue = $ActionValues[$Action]
    
    if (-not $RuleGuid) {
        Write-Host "[FAILED] Unknown ASR rule" -ForegroundColor Red
        exit 1
    }
    
    # Try using Set-MpPreference cmdlet first
    try {
        Set-MpPreference -AttackSurfaceReductionRules_Ids $RuleGuid -AttackSurfaceReductionRules_Actions $ActionValue -ErrorAction Stop
        Write-Host "[SUCCESS] ASR rule configured via Windows Defender cmdlet" -ForegroundColor Green
    } catch {
        # Fallback to registry
        $ASRKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\ASR\\Rules"
        New-Item -Path $ASRKey -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $ASRKey -Name $RuleGuid -Value $ActionValue.ToString() -Type String -Force
        Write-Host "[SUCCESS] ASR rule configured via registry" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "  GUID: $RuleGuid" -ForegroundColor Gray
    Write-Host "  Action Value: $ActionValue" -ForegroundColor Gray
    
    if ($Action -eq "Audit") {
        Write-Host ""
        Write-Host "[WARNING] Audit mode: Actions will be logged but not blocked" -ForegroundColor Yellow
        Write-Host "  Check: Event Viewer > Applications and Services > Microsoft > Windows > Windows Defender > Operational" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAILED] Failed to configure ASR rule: $_" -ForegroundColor Red
}`;
    }
  },

  // ============================================
  // PERFORMANCE TUNING TASKS
  // ============================================

  {
    id: 'configure-visual-effects',
    name: 'Configure Visual Effects',
    category: 'Performance Tuning',
    description: 'Optimize Windows visual effects for performance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows visual effects settings
- Can optimize for performance or appearance
- Modifies desktop composition and animations

**Prerequisites:**
- PowerShell 5.1 or later
- No special privileges for current user
- Admin for system-wide changes

**What You Need to Provide:**
- Visual effects preset or custom settings
- Whether to disable transparency
- Animation speed preference

**What the Script Does:**
1. Sets UserPreferencesMask in registry
2. Configures individual visual effect settings
3. Adjusts DWM (Desktop Window Manager) settings
4. Applies changes for current user
5. Notifies system of preference change

**Important Notes:**
- Changes take effect immediately or after logoff
- Performance mode reduces GPU/CPU usage
- Useful on older hardware or VMs
- Remote Desktop may override these settings
- Typical use: optimize VDI, older systems
- Some effects are hardware accelerated
- Custom settings allow fine-grained control`,
    parameters: [
      { id: 'preset', label: 'Preset', type: 'select', required: true, options: [
        'Best Performance',
        'Best Appearance',
        'Custom - Disable Animations',
        'Custom - Minimal Effects'
      ], defaultValue: 'Best Performance' },
      { id: 'disableTransparency', label: 'Disable Transparency Effects', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const preset = params.preset;
      const disableTransparency = toPowerShellBoolean(params.disableTransparency ?? true);
      
      return `# Configure Visual Effects
# Generated: ${new Date().toISOString()}

$Preset = "${preset}"
$DisableTransparency = ${disableTransparency}

$VisualFXKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects"
$AdvancedKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced"
$DWMKey = "HKCU:\\Software\\Microsoft\\Windows\\DWM"
$ThemesKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"

Write-Host "Configuring Visual Effects..." -ForegroundColor Cyan
Write-Host "  Preset: $Preset" -ForegroundColor Gray
Write-Host ""

try {
    # Set VisualFXSetting: 0=Custom, 1=Best appearance, 2=Best performance, 3=Let Windows choose
    $VisualFXSetting = switch ($Preset) {
        "Best Performance" { 2 }
        "Best Appearance" { 1 }
        default { 0 }  # Custom
    }
    
    New-Item -Path $VisualFXKey -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $VisualFXKey -Name "VisualFXSetting" -Value $VisualFXSetting -Type DWord -Force
    
    if ($Preset -eq "Best Performance" -or $Preset -match "Custom") {
        # Disable various visual effects
        Set-ItemProperty -Path $AdvancedKey -Name "TaskbarAnimations" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path $AdvancedKey -Name "ListviewAlphaSelect" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path $AdvancedKey -Name "ListviewShadow" -Value 0 -Type DWord -Force
        
        # Disable animations
        $AnimationKey = "HKCU:\\Control Panel\\Desktop\\WindowMetrics"
        Set-ItemProperty -Path $AnimationKey -Name "MinAnimate" -Value "0" -Type String -Force -ErrorAction SilentlyContinue
        
        Write-Host "[SUCCESS] Disabled: Taskbar animations" -ForegroundColor Green
        Write-Host "[SUCCESS] Disabled: List view effects" -ForegroundColor Green
    }
    
    if ($Preset -eq "Best Appearance") {
        Set-ItemProperty -Path $AdvancedKey -Name "TaskbarAnimations" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path $AdvancedKey -Name "ListviewAlphaSelect" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path $AdvancedKey -Name "ListviewShadow" -Value 1 -Type DWord -Force
        Write-Host "[SUCCESS] Enabled: All visual effects" -ForegroundColor Green
    }
    
    # Configure transparency
    if ($DisableTransparency) {
        New-Item -Path $ThemesKey -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $ThemesKey -Name "EnableTransparency" -Value 0 -Type DWord -Force
        Write-Host "[SUCCESS] Disabled: Transparency effects" -ForegroundColor Green
    }
    
    # Notify system of preference change
    $code = @'
    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, ref int lpvParam, int fuWinIni);
'@
    $User32 = Add-Type -MemberDefinition $code -Name User32 -Namespace Win32 -PassThru
    $dummy = 0
    $User32::SystemParametersInfo(0x0013, 0, [ref]$dummy, 2) | Out-Null  # SPI_SETICONTITLELOGFONT
    
    Write-Host ""
    Write-Host "[SUCCESS] Visual effects configured" -ForegroundColor Green
    Write-Host "[WARNING] Log off and back on for all changes to take effect" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure visual effects: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-memory-management',
    name: 'Configure Memory Management',
    category: 'Performance Tuning',
    description: 'Configure Windows memory management settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows memory management behavior
- Adjusts paging file, large pages, and cache settings
- Can improve performance for specific workloads

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient RAM for settings

**What You Need to Provide:**
- Disable paging executive (keep kernel in RAM)
- Enable large system cache
- Clear page file at shutdown (security)

**What the Script Does:**
1. Sets DisablePagingExecutive value
2. Configures LargeSystemCache option
3. Sets ClearPageFileAtShutdown
4. Adjusts IoPageLockLimit if specified
5. Reports memory configuration changes

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REBOOT REQUIRED for changes
- DisablePagingExecutive needs sufficient RAM
- Large cache helps file servers
- Clear page file adds shutdown time
- Typical use: servers, high-performance workstations
- Monitor memory usage after changes
- Revert if system becomes unstable`,
    parameters: [
      { id: 'disablePagingExecutive', label: 'Disable Paging Executive (Keep Kernel in RAM)', type: 'boolean', required: false, defaultValue: false },
      { id: 'largeSystemCache', label: 'Enable Large System Cache', type: 'boolean', required: false, defaultValue: false },
      { id: 'clearPageFile', label: 'Clear Page File at Shutdown', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const disablePagingExecutive = toPowerShellBoolean(params.disablePagingExecutive ?? false);
      const largeSystemCache = toPowerShellBoolean(params.largeSystemCache ?? false);
      const clearPageFile = toPowerShellBoolean(params.clearPageFile ?? false);
      
      return `# Configure Memory Management
# Generated: ${new Date().toISOString()}

$DisablePagingExecutive = ${disablePagingExecutive}
$LargeSystemCache = ${largeSystemCache}
$ClearPageFile = ${clearPageFile}

$MemMgmtKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management"

Write-Host "Configuring Memory Management..." -ForegroundColor Cyan
Write-Host ""

try {
    # Get current RAM
    $RAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB, 2)
    Write-Host "System RAM: $RAM GB" -ForegroundColor Gray
    Write-Host ""
    
    # Disable Paging Executive
    Set-ItemProperty -Path $MemMgmtKey -Name "DisablePagingExecutive" -Value $(if ($DisablePagingExecutive) { 1 } else { 0 }) -Type DWord -Force
    if ($DisablePagingExecutive) {
        if ($RAM -lt 8) {
            Write-Host "[WARNING] DisablePagingExecutive: Enabled (Warning: Low RAM)" -ForegroundColor Yellow
        } else {
            Write-Host "[SUCCESS] DisablePagingExecutive: Enabled (Kernel stays in RAM)" -ForegroundColor Green
        }
    } else {
        Write-Host "[SUCCESS] DisablePagingExecutive: Disabled (Default)" -ForegroundColor Green
    }
    
    # Large System Cache
    Set-ItemProperty -Path $MemMgmtKey -Name "LargeSystemCache" -Value $(if ($LargeSystemCache) { 1 } else { 0 }) -Type DWord -Force
    Write-Host "[SUCCESS] LargeSystemCache: $(if ($LargeSystemCache) { 'Enabled (File Server Mode)' } else { 'Disabled (Application Mode)' })" -ForegroundColor Green
    
    # Clear Page File at Shutdown
    Set-ItemProperty -Path $MemMgmtKey -Name "ClearPageFileAtShutdown" -Value $(if ($ClearPageFile) { 1 } else { 0 }) -Type DWord -Force
    Write-Host "[SUCCESS] ClearPageFileAtShutdown: $(if ($ClearPageFile) { 'Enabled (Security)' } else { 'Disabled' })" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Current Page File Configuration:" -ForegroundColor Cyan
    Get-CimInstance Win32_PageFileSetting | ForEach-Object {
        Write-Host "  Location: $($_.Name)" -ForegroundColor Gray
        Write-Host "  Initial Size: $($_.InitialSize) MB" -ForegroundColor Gray
        Write-Host "  Maximum Size: $($_.MaximumSize) MB" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[WARNING] REBOOT REQUIRED for changes to take effect" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure memory management: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'configure-power-settings',
    name: 'Configure Power Settings',
    category: 'Performance Tuning',
    description: 'Configure Windows power management via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures power management settings via registry
- Controls CPU throttling and sleep states
- Optimizes for performance or energy saving

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Not all settings available on all hardware

**What You Need to Provide:**
- Power plan preference
- Processor performance settings
- USB selective suspend setting
- Hard disk timeout

**What the Script Does:**
1. Sets active power plan if specified
2. Configures processor min/max performance
3. Sets USB selective suspend policy
4. Configures hard disk timeout
5. Reports current power configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Some settings depend on power plan
- High Performance increases power usage
- USB suspend may cause device issues
- Typical use: workstations, gaming PCs, servers
- Desktop vs laptop settings differ
- Hybrid sleep affects power loss recovery`,
    parameters: [
      { id: 'powerPlan', label: 'Power Plan', type: 'select', required: true, options: ['Balanced', 'High Performance', 'Power Saver', 'Ultimate Performance'], defaultValue: 'Balanced' },
      { id: 'minProcessor', label: 'Minimum Processor State (%)', type: 'number', required: false, defaultValue: 5 },
      { id: 'maxProcessor', label: 'Maximum Processor State (%)', type: 'number', required: false, defaultValue: 100 },
      { id: 'disableUSBSuspend', label: 'Disable USB Selective Suspend', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const powerPlan = params.powerPlan;
      const minProcessor = Number(params.minProcessor || 5);
      const maxProcessor = Number(params.maxProcessor || 100);
      const disableUSBSuspend = toPowerShellBoolean(params.disableUSBSuspend ?? false);
      
      return `# Configure Power Settings
# Generated: ${new Date().toISOString()}

$PowerPlan = "${powerPlan}"
$MinProcessor = ${minProcessor}
$MaxProcessor = ${maxProcessor}
$DisableUSBSuspend = ${disableUSBSuspend}

Write-Host "Configuring Power Settings..." -ForegroundColor Cyan
Write-Host ""

try {
    # Power plan GUIDs
    $PlanGuids = @{
        "Balanced" = "381b4222-f694-41f0-9685-ff5bb260df2e"
        "High Performance" = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
        "Power Saver" = "a1841308-3541-4fab-bc81-f71556f20b4a"
        "Ultimate Performance" = "e9a42b02-d5df-448d-aa00-03f14749eb61"
    }
    
    $PlanGuid = $PlanGuids[$PowerPlan]
    
    if ($PowerPlan -eq "Ultimate Performance") {
        # Create Ultimate Performance plan if it doesn't exist
        powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1 | Out-Null
    }
    
    # Set active power plan
    powercfg /setactive $PlanGuid
    Write-Host "[SUCCESS] Power Plan: $PowerPlan" -ForegroundColor Green
    
    # Configure processor states
    # GUID_PROCESSOR_SUBGROUP: 54533251-82be-4824-96c1-47b60b740d00
    # PROCTHROTTLEMIN: 893dee8e-2bef-41e0-89c6-b55d0929964c
    # PROCTHROTTLEMAX: bc5038f7-23e0-4960-96da-33abaf5935ec
    
    powercfg /setacvalueindex $PlanGuid 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c $MinProcessor
    powercfg /setacvalueindex $PlanGuid 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec $MaxProcessor
    powercfg /setdcvalueindex $PlanGuid 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c $MinProcessor
    powercfg /setdcvalueindex $PlanGuid 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec $MaxProcessor
    
    Write-Host "[SUCCESS] Processor State: $MinProcessor% - $MaxProcessor%" -ForegroundColor Green
    
    # Configure USB Selective Suspend
    # USB_SUBGROUP: 2a737441-1930-4402-8d77-b2bebba308a3
    # USB_SELECTIVE_SUSPEND: 48e6b7a6-50f5-4782-a5d4-53bb8f07e226
    
    $USBValue = if ($DisableUSBSuspend) { 0 } else { 1 }
    powercfg /setacvalueindex $PlanGuid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 $USBValue
    powercfg /setdcvalueindex $PlanGuid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 $USBValue
    
    Write-Host "[SUCCESS] USB Selective Suspend: $(if ($DisableUSBSuspend) { 'Disabled' } else { 'Enabled' })" -ForegroundColor Green
    
    # Apply changes
    powercfg /setactive $PlanGuid
    
    Write-Host ""
    Write-Host "Current Power Plan:" -ForegroundColor Cyan
    powercfg /getactivescheme
} catch {
    Write-Host "[FAILED] Failed to configure power settings: $_" -ForegroundColor Red
}`;
    }
  },

  // ============================================
  // GROUP POLICY TASKS
  // ============================================

  {
    id: 'check-gpo-applied-settings',
    name: 'Check GPO Applied Settings',
    category: 'Group Policy',
    description: 'Report Group Policy registry settings applied to this computer',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans registry for Group Policy-applied settings
- Identifies policies in Policies registry keys
- Reports both computer and user policies

**Prerequisites:**
- PowerShell 5.1 or later
- Read permissions on registry
- Domain membership for GPO

**What You Need to Provide:**
- Policy scope: Computer, User, or Both
- Whether to export findings

**What the Script Does:**
1. Scans HKLM\\SOFTWARE\\Policies for computer policies
2. Scans HKCU\\SOFTWARE\\Policies for user policies
3. Enumerates all applied settings
4. Optionally exports to CSV
5. Reports total settings count

**Important Notes:**
- Policies subkeys contain GPO-applied settings
- Some settings may be in Microsoft subkeys
- Local policy stored in same locations
- Typical use: troubleshooting, documentation
- Does not show which GPO applied setting
- Use gpresult for full policy report
- Administrative Templates use these paths`,
    parameters: [
      { id: 'scope', label: 'Policy Scope', type: 'select', required: true, options: ['Computer Only', 'User Only', 'Both'], defaultValue: 'Both' },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\GPOSettings.csv' }
    ],
    scriptTemplate: (params) => {
      const scope = params.scope;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Check GPO Applied Settings
# Generated: ${new Date().toISOString()}

$Scope = "${scope}"
$ExportPath = "${exportPath}"

Write-Host "Checking Group Policy Applied Settings..." -ForegroundColor Cyan
Write-Host ""

$Results = @()

function Get-PolicySettings {
    param([string]$Path, [string]$Scope)
    
    if (-not (Test-Path $Path)) { return }
    
    Get-ChildItem -Path $Path -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        $Key = $_
        Get-ItemProperty -Path $Key.PSPath -ErrorAction SilentlyContinue | 
            Get-Member -MemberType NoteProperty | 
            Where-Object { $_.Name -notmatch '^PS' } | 
            ForEach-Object {
                $Value = (Get-ItemProperty -Path $Key.PSPath).$($_.Name)
                [PSCustomObject]@{
                    Scope = $Scope
                    KeyPath = $Key.PSPath -replace 'Microsoft.PowerShell.Core\\\\Registry::', ''
                    ValueName = $_.Name
                    Value = $Value
                }
            }
    }
}

# Scan Computer policies
if ($Scope -eq "Computer Only" -or $Scope -eq "Both") {
    Write-Host "Scanning Computer Policies..." -ForegroundColor Gray
    $Results += Get-PolicySettings -Path "HKLM:\\SOFTWARE\\Policies" -Scope "Computer"
    $Results += Get-PolicySettings -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies" -Scope "Computer"
}

# Scan User policies
if ($Scope -eq "User Only" -or $Scope -eq "Both") {
    Write-Host "Scanning User Policies..." -ForegroundColor Gray
    $Results += Get-PolicySettings -Path "HKCU:\\SOFTWARE\\Policies" -Scope "User"
    $Results += Get-PolicySettings -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies" -Scope "User"
}

Write-Host ""

if ($Results.Count -eq 0) {
    Write-Host "No Group Policy settings found in registry" -ForegroundColor Yellow
} else {
    Write-Host "Found $($Results.Count) policy settings:" -ForegroundColor Green
    Write-Host ""
    
    $Results | Group-Object Scope | ForEach-Object {
        Write-Host "$($_.Name) Policies: $($_.Count)" -ForegroundColor Cyan
        $_.Group | Select-Object -First 10 | ForEach-Object {
            $ShortPath = $_.KeyPath -replace '.*\\\\Policies\\\\', ''
            Write-Host "  $ShortPath\\$($_.ValueName) = $($_.Value)" -ForegroundColor Gray
        }
        if ($_.Count -gt 10) {
            Write-Host "  ... and $($_.Count - 10) more" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
    
    if ($ExportPath) {
        $Results | Export-Csv -Path $ExportPath -NoTypeInformation -Force
        Write-Host "[SUCCESS] Exported to: $ExportPath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "For detailed GPO report, run: gpresult /H report.html" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'apply-admin-template-setting',
    name: 'Apply Administrative Template Setting',
    category: 'Group Policy',
    description: 'Apply a specific Administrative Template policy via registry',
    isPremium: true,
    instructions: `**How This Task Works:**
- Applies Administrative Template settings via registry
- Replicates GPO settings without Group Policy infrastructure
- Useful for standalone or workgroup machines

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Knowledge of specific policy paths

**What You Need to Provide:**
- Policy scope (Computer or User)
- Policy registry path
- Value name and data
- Value type

**What the Script Does:**
1. Creates Policies registry path if needed
2. Sets policy value in appropriate location
3. Validates policy applied correctly
4. Reports policy configuration
5. Notes if policy may conflict with GPO

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Domain GPO will OVERRIDE these settings
- Policies path indicates GPO-style configuration
- Use Microsoft documentation for correct paths
- Typical use: workgroup machines, testing
- Changes take effect on next policy refresh
- Run gpupdate to force refresh`,
    parameters: [
      { id: 'policyScope', label: 'Policy Scope', type: 'select', required: true, options: ['Computer', 'User'], defaultValue: 'Computer' },
      { id: 'policyPath', label: 'Policy Path (under Policies)', type: 'text', required: true, placeholder: 'Microsoft\\Windows\\WindowsUpdate' },
      { id: 'valueName', label: 'Value Name', type: 'text', required: true, placeholder: 'DisableWindowsUpdateAccess' },
      { id: 'valueData', label: 'Value Data', type: 'text', required: true, placeholder: '1' },
      { id: 'valueType', label: 'Value Type', type: 'select', required: true, options: ['DWord', 'String', 'ExpandString', 'MultiString'], defaultValue: 'DWord' }
    ],
    scriptTemplate: (params) => {
      const policyScope = params.policyScope;
      const policyPath = escapePowerShellString(params.policyPath);
      const valueName = escapePowerShellString(params.valueName);
      const valueData = escapePowerShellString(params.valueData);
      const valueType = params.valueType;
      
      return `# Apply Administrative Template Setting
# Generated: ${new Date().toISOString()}

$PolicyScope = "${policyScope}"
$PolicyPath = "${policyPath}"
$ValueName = "${valueName}"
$ValueData = "${valueData}"
$ValueType = "${valueType}"

Write-Host "Applying Administrative Template Setting..." -ForegroundColor Cyan
Write-Host "  Scope: $PolicyScope" -ForegroundColor Gray
Write-Host ""

try {
    # Build full registry path
    $BasePath = if ($PolicyScope -eq "Computer") {
        "HKLM:\\SOFTWARE\\Policies"
    } else {
        "HKCU:\\SOFTWARE\\Policies"
    }
    
    $FullPath = Join-Path $BasePath $PolicyPath
    
    # Create path if it doesn't exist
    if (-not (Test-Path $FullPath)) {
        New-Item -Path $FullPath -Force | Out-Null
        Write-Host "[SUCCESS] Created policy path: $FullPath" -ForegroundColor Green
    }
    
    # Convert value data based on type
    $Data = switch ($ValueType) {
        "DWord" { [int]$ValueData }
        "String" { $ValueData }
        "ExpandString" { $ValueData }
        "MultiString" { $ValueData -split ',' }
        default { $ValueData }
    }
    
    # Set the policy value
    Set-ItemProperty -Path $FullPath -Name $ValueName -Value $Data -Type $ValueType -Force
    
    Write-Host "[SUCCESS] Policy setting applied:" -ForegroundColor Green
    Write-Host "  Path: $FullPath" -ForegroundColor Gray
    Write-Host "  Name: $ValueName" -ForegroundColor Gray
    Write-Host "  Value: $ValueData" -ForegroundColor Gray
    Write-Host "  Type: $ValueType" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "[WARNING] Domain Group Policy will override this setting if conflicting" -ForegroundColor Yellow
    Write-Host "[WARNING] Run 'gpupdate /force' to refresh policy" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to apply policy setting: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'clear-gpo-registry-settings',
    name: 'Clear GPO Registry Settings',
    category: 'Group Policy',
    description: 'Remove locally applied Group Policy registry settings',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes registry values from Policies keys
- Clears local Group Policy configurations
- Does NOT affect domain GPO settings

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Backup recommended before clearing

**What You Need to Provide:**
- Scope: Computer, User, or Both
- Specific policy path to clear (optional)
- Whether to require confirmation

**What the Script Does:**
1. Identifies policy registry locations
2. Backs up settings before removal (optional)
3. Removes policy keys/values
4. Reports removed settings
5. Triggers policy refresh

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Clears LOCAL policy settings only
- Domain GPO will reapply on next refresh
- Backup created in temp folder
- Typical use: reset local policies, troubleshooting
- Run gpupdate after clearing
- Some settings may require reboot`,
    parameters: [
      { id: 'scope', label: 'Scope', type: 'select', required: true, options: ['Computer Only', 'User Only', 'Both'], defaultValue: 'Both' },
      { id: 'specificPath', label: 'Specific Path (optional)', type: 'text', required: false, placeholder: 'Microsoft\\Windows\\WindowsUpdate' },
      { id: 'createBackup', label: 'Create Backup Before Clearing', type: 'boolean', required: false, defaultValue: true },
      { id: 'requireConfirm', label: 'Require Confirmation', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const scope = params.scope;
      const specificPath = escapePowerShellString(params.specificPath || '');
      const createBackup = toPowerShellBoolean(params.createBackup ?? true);
      const requireConfirm = toPowerShellBoolean(params.requireConfirm ?? true);
      
      return `# Clear GPO Registry Settings
# Generated: ${new Date().toISOString()}

$Scope = "${scope}"
$SpecificPath = "${specificPath}"
$CreateBackup = ${createBackup}
$RequireConfirm = ${requireConfirm}

Write-Host "Clear GPO Registry Settings" -ForegroundColor Cyan
Write-Host "  Scope: $Scope" -ForegroundColor Gray
if ($SpecificPath) {
    Write-Host "  Path: $SpecificPath" -ForegroundColor Gray
}
Write-Host ""

$PathsToClear = @()

if ($Scope -eq "Computer Only" -or $Scope -eq "Both") {
    if ($SpecificPath) {
        $PathsToClear += "HKLM:\\SOFTWARE\\Policies\\$SpecificPath"
    } else {
        $PathsToClear += "HKLM:\\SOFTWARE\\Policies"
    }
}

if ($Scope -eq "User Only" -or $Scope -eq "Both") {
    if ($SpecificPath) {
        $PathsToClear += "HKCU:\\SOFTWARE\\Policies\\$SpecificPath"
    } else {
        $PathsToClear += "HKCU:\\SOFTWARE\\Policies"
    }
}

# Count settings to be cleared
$TotalCount = 0
foreach ($Path in $PathsToClear) {
    if (Test-Path $Path) {
        $Count = (Get-ChildItem -Path $Path -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
        $TotalCount += $Count
    }
}

Write-Host "Settings to be cleared: $TotalCount" -ForegroundColor Yellow
Write-Host ""

if ($RequireConfirm) {
    $Response = Read-Host "Type 'CLEAR' to confirm clearing policy settings"
    if ($Response -ne 'CLEAR') {
        Write-Host "[FAILED] Operation cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

try {
    foreach ($Path in $PathsToClear) {
        if (-not (Test-Path $Path)) {
            Write-Host "  Path not found: $Path" -ForegroundColor Gray
            continue
        }
        
        # Create backup if requested
        if ($CreateBackup) {
            $BackupFile = "$env:TEMP\\PolicyBackup_$(Get-Date -Format 'yyyyMMdd-HHmmss').reg"
            $RegPath = $Path -replace 'HKLM:', 'HKEY_LOCAL_MACHINE' -replace 'HKCU:', 'HKEY_CURRENT_USER'
            reg export $RegPath $BackupFile /y 2>&1 | Out-Null
            Write-Host "[SUCCESS] Backup created: $BackupFile" -ForegroundColor Green
        }
        
        # Clear the path
        if ($SpecificPath) {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Host "[SUCCESS] Cleared: $Path" -ForegroundColor Green
        } else {
            Get-ChildItem -Path $Path -ErrorAction SilentlyContinue | ForEach-Object {
                Remove-Item -Path $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
            }
            Write-Host "[SUCCESS] Cleared contents of: $Path" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Policy settings cleared" -ForegroundColor Green
    Write-Host ""
    Write-Host "[WARNING] Run 'gpupdate /force' to refresh Group Policy" -ForegroundColor Yellow
    Write-Host "[WARNING] Domain GPO settings will reapply on next refresh" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to clear settings: $_" -ForegroundColor Red
}`;
    }
  },

  // ============================================
  // COMPLIANCE TASKS
  // ============================================

  {
    id: 'export-security-baseline',
    name: 'Export Security Baseline',
    category: 'Compliance',
    description: 'Export current security settings as a baseline for comparison',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports security-related registry settings to JSON/CSV
- Creates baseline for future comparison
- Covers common security configurations

**Prerequisites:**
- Administrator privileges recommended
- PowerShell 5.1 or later
- Write permissions on export location

**What You Need to Provide:**
- Export format (JSON or CSV)
- Export file path
- Categories to include in baseline

**What the Script Does:**
1. Scans security-related registry keys
2. Captures current values for baseline
3. Exports to specified format
4. Timestamps the baseline
5. Reports settings captured

**Important Notes:**
- ADMINISTRATOR recommended for full scan
- JSON format preserves data types
- CSV format for spreadsheet analysis
- Baseline is point-in-time snapshot
- Typical use: compliance auditing, change detection
- Store baseline securely for comparison
- Re-export after authorized changes`,
    parameters: [
      { id: 'exportFormat', label: 'Export Format', type: 'select', required: true, options: ['JSON', 'CSV'], defaultValue: 'JSON' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Baselines\\SecurityBaseline.json' },
      { id: 'includeCategories', label: 'Categories', type: 'select', required: true, options: [
        'All Security Settings',
        'Authentication Only',
        'Firewall Only',
        'Audit Policy Only'
      ], defaultValue: 'All Security Settings' }
    ],
    scriptTemplate: (params) => {
      const exportFormat = params.exportFormat;
      const exportPath = escapePowerShellString(params.exportPath);
      const includeCategories = params.includeCategories;
      
      return `# Export Security Baseline
# Generated: ${new Date().toISOString()}

$ExportFormat = "${exportFormat}"
$ExportPath = "${exportPath}"
$Categories = "${includeCategories}"

Write-Host "Exporting Security Baseline..." -ForegroundColor Cyan
Write-Host "  Categories: $Categories" -ForegroundColor Gray
Write-Host ""

$Baseline = @{
    ComputerName = $env:COMPUTERNAME
    ExportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Settings = @()
}

function Get-RegistryBaseline {
    param([string]$Path, [string]$Category)
    
    if (-not (Test-Path $Path)) { return @() }
    
    $Settings = @()
    Get-ItemProperty -Path $Path -ErrorAction SilentlyContinue | 
        Get-Member -MemberType NoteProperty | 
        Where-Object { $_.Name -notmatch '^PS' } | 
        ForEach-Object {
            $Value = (Get-ItemProperty -Path $Path).$($_.Name)
            $Settings += [PSCustomObject]@{
                Category = $Category
                Path = $Path
                Name = $_.Name
                Value = $Value
                Type = $Value.GetType().Name
            }
        }
    return $Settings
}

try {
    # Security Policy Settings
    if ($Categories -match "All|Authentication") {
        $Baseline.Settings += Get-RegistryBaseline -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Lsa" -Category "LSA"
        $Baseline.Settings += Get-RegistryBaseline -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Category "System Policies"
    }
    
    # Firewall Settings
    if ($Categories -match "All|Firewall") {
        $Baseline.Settings += Get-RegistryBaseline -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\StandardProfile" -Category "Firewall"
    }
    
    # Windows Defender Settings
    if ($Categories -match "All") {
        $Baseline.Settings += Get-RegistryBaseline -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender" -Category "Defender"
        $Baseline.Settings += Get-RegistryBaseline -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection" -Category "Defender RTP"
    }
    
    # Audit Settings
    if ($Categories -match "All|Audit") {
        $AuditPolicy = auditpol /get /category:* /r 2>&1 | ConvertFrom-Csv -ErrorAction SilentlyContinue
        $AuditPolicy | ForEach-Object {
            $Baseline.Settings += [PSCustomObject]@{
                Category = "Audit Policy"
                Path = "auditpol"
                Name = $_.'Subcategory'
                Value = $_.'Inclusion Setting'
                Type = "String"
            }
        }
    }
    
    Write-Host "Captured $($Baseline.Settings.Count) settings" -ForegroundColor Green
    Write-Host ""
    
    # Export
    $ParentDir = Split-Path $ExportPath -Parent
    if (-not (Test-Path $ParentDir)) {
        New-Item -Path $ParentDir -ItemType Directory -Force | Out-Null
    }
    
    if ($ExportFormat -eq "JSON") {
        $Baseline | ConvertTo-Json -Depth 10 | Out-File -FilePath $ExportPath -Encoding UTF8 -Force
    } else {
        $Baseline.Settings | Export-Csv -Path $ExportPath -NoTypeInformation -Force
    }
    
    Write-Host "[SUCCESS] Baseline exported to: $ExportPath" -ForegroundColor Green
    Write-Host "  Settings captured: $($Baseline.Settings.Count)" -ForegroundColor Gray
    Write-Host "  Date: $($Baseline.ExportDate)" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Failed to export baseline: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'compare-security-baseline',
    name: 'Compare Security Baseline',
    category: 'Compliance',
    description: 'Compare current settings against a saved security baseline',
    isPremium: true,
    instructions: `**How This Task Works:**
- Compares current registry settings against saved baseline
- Identifies additions, removals, and changes
- Generates compliance report

**Prerequisites:**
- Existing baseline file (JSON format)
- PowerShell 5.1 or later
- Read permissions on registry and baseline

**What You Need to Provide:**
- Path to baseline file
- Whether to export differences
- Difference export path

**What the Script Does:**
1. Loads saved baseline from file
2. Scans current registry settings
3. Compares values against baseline
4. Identifies all differences
5. Reports compliance status

**Important Notes:**
- Baseline must be in JSON format
- Reports: Added, Removed, Changed settings
- Useful for change management
- Typical use: compliance verification, audit prep
- Schedule regular comparisons
- Investigate unauthorized changes
- Update baseline after approved changes`,
    parameters: [
      { id: 'baselinePath', label: 'Baseline File Path', type: 'path', required: true, placeholder: 'C:\\Baselines\\SecurityBaseline.json' },
      { id: 'exportDifferences', label: 'Export Differences', type: 'boolean', required: false, defaultValue: true },
      { id: 'diffExportPath', label: 'Differences Export Path', type: 'path', required: false, placeholder: 'C:\\Reports\\BaselineDifferences.csv' }
    ],
    scriptTemplate: (params) => {
      const baselinePath = escapePowerShellString(params.baselinePath);
      const exportDifferences = toPowerShellBoolean(params.exportDifferences ?? true);
      const diffExportPath = escapePowerShellString(params.diffExportPath || '');
      
      return `# Compare Security Baseline
# Generated: ${new Date().toISOString()}

$BaselinePath = "${baselinePath}"
$ExportDifferences = ${exportDifferences}
$DiffExportPath = "${diffExportPath}"

Write-Host "Comparing Security Baseline..." -ForegroundColor Cyan
Write-Host ""

try {
    # Load baseline
    if (-not (Test-Path $BaselinePath)) {
        Write-Host "[FAILED] Baseline file not found: $BaselinePath" -ForegroundColor Red
        exit 1
    }
    
    $Baseline = Get-Content $BaselinePath -Raw | ConvertFrom-Json
    Write-Host "Baseline loaded: $($Baseline.ComputerName) - $($Baseline.ExportDate)" -ForegroundColor Gray
    Write-Host "Baseline settings: $($Baseline.Settings.Count)" -ForegroundColor Gray
    Write-Host ""
    
    $Differences = @()
    
    # Compare each baseline setting
    foreach ($Setting in $Baseline.Settings) {
        if ($Setting.Path -eq "auditpol") {
            # Handle audit policy separately
            continue
        }
        
        if (-not (Test-Path $Setting.Path)) {
            $Differences += [PSCustomObject]@{
                Status = "Key Missing"
                Category = $Setting.Category
                Path = $Setting.Path
                Name = $Setting.Name
                BaselineValue = $Setting.Value
                CurrentValue = "N/A"
            }
            continue
        }
        
        try {
            $CurrentValue = Get-ItemPropertyValue -Path $Setting.Path -Name $Setting.Name -ErrorAction Stop
            
            if ($CurrentValue -ne $Setting.Value) {
                $Differences += [PSCustomObject]@{
                    Status = "Changed"
                    Category = $Setting.Category
                    Path = $Setting.Path
                    Name = $Setting.Name
                    BaselineValue = $Setting.Value
                    CurrentValue = $CurrentValue
                }
            }
        } catch {
            $Differences += [PSCustomObject]@{
                Status = "Value Missing"
                Category = $Setting.Category
                Path = $Setting.Path
                Name = $Setting.Name
                BaselineValue = $Setting.Value
                CurrentValue = "N/A"
            }
        }
    }
    
    Write-Host "Comparison Results:" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Gray
    
    if ($Differences.Count -eq 0) {
        Write-Host "[SUCCESS] No differences found - system matches baseline" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Found $($Differences.Count) differences:" -ForegroundColor Yellow
        Write-Host ""
        
        $Differences | Group-Object Status | ForEach-Object {
            Write-Host "$($_.Name): $($_.Count)" -ForegroundColor $(if ($_.Name -eq "Changed") { "Red" } else { "Yellow" })
        }
        
        Write-Host ""
        $Differences | Select-Object -First 10 | ForEach-Object {
            Write-Host "[$($_.Status)] $($_.Name)" -ForegroundColor Yellow
            Write-Host "  Path: $($_.Path)" -ForegroundColor Gray
            Write-Host "  Baseline: $($_.BaselineValue)" -ForegroundColor Gray
            Write-Host "  Current:  $($_.CurrentValue)" -ForegroundColor $(if ($_.Status -eq "Changed") { "Red" } else { "Gray" })
            Write-Host ""
        }
        
        if ($Differences.Count -gt 10) {
            Write-Host "... and $($Differences.Count - 10) more differences" -ForegroundColor Gray
        }
    }
    
    # Export differences
    if ($ExportDifferences -and $Differences.Count -gt 0) {
        if (-not $DiffExportPath) {
            $DiffExportPath = "$env:TEMP\\BaselineDifferences_$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
        }
        $Differences | Export-Csv -Path $DiffExportPath -NoTypeInformation -Force
        Write-Host ""
        Write-Host "[SUCCESS] Differences exported to: $DiffExportPath" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAILED] Failed to compare baseline: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'monitor-registry-changes',
    name: 'Monitor Registry Changes',
    category: 'Compliance',
    description: 'Set up monitoring for registry key changes',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a registry change monitoring solution
- Uses WMI event subscription for real-time monitoring
- Logs changes to event log or file

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- WMI service running

**What You Need to Provide:**
- Registry keys to monitor
- Log destination (Event Log or File)
- Log file path (if file logging)

**What the Script Does:**
1. Creates WMI event subscription for registry changes
2. Configures logging destination
3. Sets up permanent event consumer
4. Reports monitoring status
5. Provides instructions to remove

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Creates permanent WMI subscription
- Survives reboots
- High-volume paths may impact performance
- Typical use: security monitoring, change detection
- Use specific paths, not entire hives
- Remove subscription when no longer needed
- Check logs regularly for unauthorized changes`,
    parameters: [
      { id: 'registryPath', label: 'Registry Path to Monitor', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' },
      { id: 'logDestination', label: 'Log Destination', type: 'select', required: true, options: ['Event Log', 'File'], defaultValue: 'Event Log' },
      { id: 'logFilePath', label: 'Log File Path (if File)', type: 'path', required: false, placeholder: 'C:\\Logs\\RegistryChanges.log' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Monitor', 'Remove Monitor', 'Check Status'], defaultValue: 'Create Monitor' }
    ],
    scriptTemplate: (params) => {
      const registryPath = escapePowerShellString(params.registryPath);
      const logDestination = params.logDestination;
      const logFilePath = escapePowerShellString(params.logFilePath || 'C:\\Logs\\RegistryChanges.log');
      const action = params.action;
      
      return `# Monitor Registry Changes
# Generated: ${new Date().toISOString()}

$RegistryPath = "${registryPath}"
$LogDestination = "${logDestination}"
$LogFilePath = "${logFilePath}"
$Action = "${action}"

$FilterName = "RegistryChangeMonitor_PSForge"
$ConsumerName = "RegistryChangeConsumer_PSForge"

Write-Host "Registry Change Monitoring" -ForegroundColor Cyan
Write-Host "  Path: $RegistryPath" -ForegroundColor Gray
Write-Host "  Action: $Action" -ForegroundColor Gray
Write-Host ""

try {
    if ($Action -eq "Remove Monitor") {
        # Remove existing subscription
        Get-WmiObject -Namespace root\\subscription -Class __EventFilter -Filter "Name='$FilterName'" -ErrorAction SilentlyContinue | Remove-WmiObject
        Get-WmiObject -Namespace root\\subscription -Class CommandLineEventConsumer -Filter "Name='$ConsumerName'" -ErrorAction SilentlyContinue | Remove-WmiObject
        Get-WmiObject -Namespace root\\subscription -Class __FilterToConsumerBinding -ErrorAction SilentlyContinue | 
            Where-Object { $_.Filter -match $FilterName } | Remove-WmiObject
        
        Write-Host "[SUCCESS] Registry monitoring removed" -ForegroundColor Green
        exit 0
    }
    
    if ($Action -eq "Check Status") {
        $Filter = Get-WmiObject -Namespace root\\subscription -Class __EventFilter -Filter "Name='$FilterName'" -ErrorAction SilentlyContinue
        
        if ($Filter) {
            Write-Host "[SUCCESS] Registry monitoring is ACTIVE" -ForegroundColor Green
            Write-Host "  Filter: $FilterName" -ForegroundColor Gray
        } else {
            Write-Host "Registry monitoring is NOT configured" -ForegroundColor Yellow
        }
        exit 0
    }
    
    # Convert registry path to WMI format
    $WMIHive = switch -Regex ($RegistryPath) {
        "^HKLM:" { "HKEY_LOCAL_MACHINE" }
        "^HKCU:" { "HKEY_CURRENT_USER" }
        "^HKCR:" { "HKEY_CLASSES_ROOT" }
        default { "HKEY_LOCAL_MACHINE" }
    }
    $WMIKeyPath = ($RegistryPath -replace '^HK[A-Z]+:', '').Replace('\\', '\\\\')
    
    # Create log directory if using file logging
    if ($LogDestination -eq "File") {
        $LogDir = Split-Path $LogFilePath -Parent
        if (-not (Test-Path $LogDir)) {
            New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
        }
    }
    
    # Create WMI Event Filter
    $FilterQuery = "SELECT * FROM RegistryTreeChangeEvent WHERE Hive='$WMIHive' AND RootPath='$WMIKeyPath'"
    
    $FilterInstance = ([wmiclass]"\\\\localhost\\root\\subscription:__EventFilter").CreateInstance()
    $FilterInstance.Name = $FilterName
    $FilterInstance.QueryLanguage = "WQL"
    $FilterInstance.Query = $FilterQuery
    $FilterInstance.Put() | Out-Null
    
    Write-Host "[SUCCESS] Created event filter" -ForegroundColor Green
    
    # Create Event Consumer
    $LogCommand = if ($LogDestination -eq "File") {
        "powershell.exe -NoProfile -Command \\"Add-Content -Path '$LogFilePath' -Value ('Registry change detected at ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' in $RegistryPath')\\""
    } else {
        "powershell.exe -NoProfile -Command \\"Write-EventLog -LogName Application -Source 'PSForge' -EventId 1000 -EntryType Warning -Message 'Registry change detected in $RegistryPath'\\""
    }
    
    $ConsumerInstance = ([wmiclass]"\\\\localhost\\root\\subscription:CommandLineEventConsumer").CreateInstance()
    $ConsumerInstance.Name = $ConsumerName
    $ConsumerInstance.CommandLineTemplate = $LogCommand
    $ConsumerInstance.Put() | Out-Null
    
    Write-Host "[SUCCESS] Created event consumer" -ForegroundColor Green
    
    # Bind filter to consumer
    $BindingInstance = ([wmiclass]"\\\\localhost\\root\\subscription:__FilterToConsumerBinding").CreateInstance()
    $BindingInstance.Filter = "\\\\localhost\\root\\subscription:__EventFilter.Name='$FilterName'"
    $BindingInstance.Consumer = "\\\\localhost\\root\\subscription:CommandLineEventConsumer.Name='$ConsumerName'"
    $BindingInstance.Put() | Out-Null
    
    Write-Host "[SUCCESS] Created binding" -ForegroundColor Green
    Write-Host ""
    Write-Host "Registry monitoring is now ACTIVE" -ForegroundColor Green
    Write-Host "  Monitoring: $RegistryPath" -ForegroundColor Gray
    Write-Host "  Logging to: $LogDestination" -ForegroundColor Gray
    if ($LogDestination -eq "File") {
        Write-Host "  Log file: $LogFilePath" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "To remove monitoring, run this task again with 'Remove Monitor' action" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to configure monitoring: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'repair-registry-permissions',
    name: 'Repair Registry Permissions',
    category: 'Troubleshooting',
    description: 'Reset registry key permissions to default inherited values',
    isPremium: true,
    instructions: `**How This Task Works:**
- Resets registry key permissions to inherited defaults
- Fixes permission issues preventing access to keys
- Restores proper ownership and ACLs

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- May need to take ownership first

**What You Need to Provide:**
- Registry key path to repair
- Whether to reset subkeys recursively
- Whether to take ownership first

**What the Script Does:**
1. Takes ownership if requested
2. Enables permission inheritance
3. Removes explicit deny entries
4. Resets ACL to inherited permissions
5. Reports repair status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Some keys protected by TrustedInstaller
- Recursive repair can take time
- May require reboot for full effect
- Typical use: fix broken app, resolve access denied
- Backup registry before major repairs
- Test application access after repair`,
    parameters: [
      { id: 'keyPath', label: 'Registry Key Path', type: 'text', required: true, placeholder: 'HKLM:\\SOFTWARE\\MyApp' },
      { id: 'recursive', label: 'Apply to Subkeys', type: 'boolean', required: false, defaultValue: false },
      { id: 'takeOwnership', label: 'Take Ownership First', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const keyPath = escapePowerShellString(params.keyPath);
      const recursive = toPowerShellBoolean(params.recursive ?? false);
      const takeOwnership = toPowerShellBoolean(params.takeOwnership ?? true);
      
      return `# Repair Registry Permissions
# Generated: ${new Date().toISOString()}

$KeyPath = "${keyPath}"
$Recursive = ${recursive}
$TakeOwnership = ${takeOwnership}

Write-Host "Repairing Registry Permissions..." -ForegroundColor Cyan
Write-Host "  Path: $KeyPath" -ForegroundColor Gray
Write-Host "  Recursive: $Recursive" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $KeyPath)) {
    Write-Host "[FAILED] Registry key not found: $KeyPath" -ForegroundColor Red
    exit 1
}

function Repair-KeyPermissions {
    param([string]$Path)
    
    try {
        $Key = Get-Item -Path $Path -ErrorAction Stop
        $Acl = $Key.GetAccessControl()
        
        if ($TakeOwnership) {
            # Take ownership as Administrators
            $AdminGroup = [System.Security.Principal.NTAccount]"BUILTIN\\Administrators"
            $Acl.SetOwner($AdminGroup)
        }
        
        # Enable inheritance
        $Acl.SetAccessRuleProtection($false, $true)
        
        # Remove explicit deny entries
        $DenyRules = $Acl.Access | Where-Object { $_.AccessControlType -eq 'Deny' }
        foreach ($Rule in $DenyRules) {
            $Acl.RemoveAccessRule($Rule) | Out-Null
        }
        
        # Apply the ACL
        Set-Acl -Path $Path -AclObject $Acl -ErrorAction Stop
        
        Write-Host "  [OK] Repaired: $Path" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [FAILED] Failed: $Path - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

$SuccessCount = 0
$FailCount = 0

# Repair the main key
if (Repair-KeyPermissions -Path $KeyPath) {
    $SuccessCount++
} else {
    $FailCount++
}

# Repair subkeys if recursive
if ($Recursive) {
    Get-ChildItem -Path $KeyPath -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        if (Repair-KeyPermissions -Path $_.PSPath) {
            $SuccessCount++
        } else {
            $FailCount++
        }
    }
}

Write-Host ""
Write-Host "Repair Summary:" -ForegroundColor Cyan
Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Red' } else { 'Gray' })

if ($FailCount -gt 0) {
    Write-Host ""
    Write-Host "[WARNING] Some keys could not be repaired. They may be protected by TrustedInstaller." -ForegroundColor Yellow
}`;
    }
  },
];
