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

if (Test-Path $KeyPath) {
    try {
        Remove-ItemProperty -Path $KeyPath -Name $ValueName -Force${confirm ? '' : ' -Confirm:$false'} -ErrorAction Stop
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
    parameters: [
      { id: 'searchRoot', label: 'Search Root', type: 'select', required: true, options: ['HKLM:\\SOFTWARE', 'HKCU:\\SOFTWARE', 'HKLM:', 'HKCU:'], defaultValue: 'HKLM:\\SOFTWARE' },
      { id: 'searchTerm', label: 'Search Term', type: 'text', required: true, placeholder: 'Java' },
      { id: 'searchType', label: 'Search Type', type: 'select', required: true, options: ['KeyName', 'ValueName', 'ValueData'], defaultValue: 'KeyName' }
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
