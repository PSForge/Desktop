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
        Write-Host "✓ Registry value found:" -ForegroundColor Green
        Write-Host "  Path: $KeyPath" -ForegroundColor Gray
        Write-Host "  Name: $ValueName" -ForegroundColor Gray
        Write-Host "  Value: $Value" -ForegroundColor Cyan
    } catch {
        Write-Host "✗ Value not found: $ValueName" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Registry key not found: $KeyPath" -ForegroundColor Red
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
        Write-Host "✓ Created registry key: $KeyPath" -ForegroundColor Green
    } else {
        Write-Host "✗ Registry key does not exist: $KeyPath" -ForegroundColor Red
        exit 1
    }
}

# Set value
Set-ItemProperty -Path $KeyPath -Name $ValueName -Value $ValueData -Type $ValueType -Force
Write-Host "✓ Registry value set:" -ForegroundColor Green
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
            Write-Host "⚠ WARNING: About to delete registry value" -ForegroundColor Yellow
            Write-Host "  Path: $KeyPath" -ForegroundColor Gray
            Write-Host "  Name: $ValueName" -ForegroundColor Gray
            Write-Host "  Current Value: $Value" -ForegroundColor Gray
            Write-Host ""
            $Response = Read-Host "Type 'YES' to confirm deletion"
            
            if ($Response -ne 'YES') {
                Write-Host "✗ Deletion cancelled by user" -ForegroundColor Yellow
                exit 0
            }
        }
        
        Remove-ItemProperty -Path $KeyPath -Name $ValueName -Force -ErrorAction Stop
        Write-Host "✓ Registry value deleted:" -ForegroundColor Green
        Write-Host "  Path: $KeyPath" -ForegroundColor Gray
        Write-Host "  Name: $ValueName" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed to delete value: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Registry key not found: $KeyPath" -ForegroundColor Red
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
        Write-Host "✓ Registry key exported:" -ForegroundColor Green
        Write-Host "  Key: $KeyPath" -ForegroundColor Gray
        Write-Host "  File: $ExportPath" -ForegroundColor Gray
        
        $FileSize = (Get-Item $ExportPath).Length
        Write-Host "  Size: $([math]::Round($FileSize/1KB, 2)) KB" -ForegroundColor Gray
    } else {
        Write-Host "✗ Export failed" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Registry key not found: $KeyPath" -ForegroundColor Red
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
    Write-Host "⚠ WARNING: Importing registry settings" -ForegroundColor Yellow
    Write-Host "  File: $RegFile" -ForegroundColor Gray
    Write-Host ""
    
    reg import $RegFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Registry file imported successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Import failed" -ForegroundColor Red
    }
} else {
    Write-Host "✗ File not found: $RegFile" -ForegroundColor Red
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
    Write-Host "✓ Found $($Results.Count) result(s):" -ForegroundColor Green
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
    Write-Host "✓ Backup complete:" -ForegroundColor Green
    Write-Host "  File: $BackupFile" -ForegroundColor Gray
    Write-Host "  Size: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "✗ Backup failed" -ForegroundColor Red
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
    Write-Host "✗ First key not found: $Key1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Key2)) {
    Write-Host "✗ Second key not found: $Key2" -ForegroundColor Red
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
    Write-Host "✓ Keys are identical" -ForegroundColor Green
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
    Write-Host "✗ Registry key not found: $KeyPath" -ForegroundColor Red
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
    
    Write-Host "✓ Permissions set:" -ForegroundColor Green
    Write-Host "  Key: $KeyPath" -ForegroundColor Gray
    Write-Host "  User: $User" -ForegroundColor Gray
    Write-Host "  Rights: ${rights}" -ForegroundColor Gray
} else {
    Write-Host "✗ Registry key not found: $KeyPath" -ForegroundColor Red
}`;
    }
  },
];
