import { 
  escapePowerShellString, 
  buildPowerShellArray, 
  toPowerShellBoolean,
  validateRequiredFields 
} from './powershell-utils';

export interface MECMTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface MECMTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: MECMTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const mecmTasks: MECMTask[] = [
  // ========================================
  // COLLECTIONS & QUERIES CATEGORY
  // ========================================
  {
    id: 'create-device-collection',
    name: 'Create Device Collection (Query-based)',
    category: 'Collections & Queries',
    description: 'Create a new device collection with WQL query rules and automatic refresh schedule',
    instructions: `**How This Task Works:**
This script creates dynamic device collections in MECM using WQL queries for automated device grouping based on criteria.

**Prerequisites:**
- MECM Console installed with ConfigurationManager PowerShell module
- SMS Provider access
- Collection creation permissions

**What You Need to Provide:**
- Collection name
- Limiting collection (scope boundary)
- WQL query for membership criteria
- Optional: Folder path, incremental updates, refresh schedule

**What the Script Does:**
1. Imports ConfigurationManager module
2. Connects to MECM site
3. Creates device collection with limiting collection
4. Adds query membership rule
5. Configures refresh schedule and incremental updates
6. Optional: Moves collection to specific folder

**Important Notes:**
- Limiting collection defines maximum scope
- WQL query determines automatic membership
- Incremental updates provide real-time membership changes
- Refresh schedule updates full membership evaluation
- Essential for automated device management at scale
- Test WQL queries before deployment`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Windows 11 Devices' },
      { id: 'limitingCollection', label: 'Limiting Collection', type: 'text', required: true, placeholder: 'All Systems', defaultValue: 'All Systems' },
      { id: 'wqlQuery', label: 'WQL Query', type: 'textarea', required: true, placeholder: 'SELECT * FROM SMS_R_System WHERE OperatingSystemNameandVersion LIKE "Microsoft Windows NT Workstation 10.0%"' },
      { id: 'folderPath', label: 'Folder Path (Optional)', type: 'text', required: false, placeholder: 'Device Collections\\Windows 11' },
      { id: 'enableIncremental', label: 'Enable Incremental Updates', type: 'boolean', required: false, defaultValue: true },
      { id: 'refreshSchedule', label: 'Refresh Schedule', type: 'select', required: true, defaultValue: 'Daily', options: ['Hourly', 'Daily', 'Weekly', 'None'] }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const limitingCollection = escapePowerShellString(params.limitingCollection);
      const wqlQuery = escapePowerShellString(params.wqlQuery);
      const folderPath = params.folderPath ? escapePowerShellString(params.folderPath) : '';
      const enableIncremental = toPowerShellBoolean(params.enableIncremental ?? true);
      const refreshSchedule = escapePowerShellString(params.refreshSchedule || 'Daily');

      return `# Create MECM Device Collection (Query-based)
# Generated: ${new Date().toISOString()}

# Import ConfigurationManager module
Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"

# Get site code
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CollectionName = "${collectionName}"
$LimitingCollection = "${limitingCollection}"
$WQLQuery = "${wqlQuery}"
$EnableIncremental = ${enableIncremental}
$RefreshSchedule = "${refreshSchedule}"

try {
    # Check if collection already exists
    $ExistingCollection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction SilentlyContinue
    if ($ExistingCollection) {
        Write-Host "⚠ Collection already exists: $CollectionName" -ForegroundColor Yellow
        Write-Host "  Update existing? Modify script to use Set-CMDeviceCollection" -ForegroundColor Gray
        exit 0
    }
    
    # Create schedule based on selection
    $Schedule = $null
    switch ($RefreshSchedule) {
        "Hourly" {
            $Schedule = New-CMSchedule -RecurInterval Hours -RecurCount 1
        }
        "Daily" {
            $Schedule = New-CMSchedule -RecurInterval Days -RecurCount 1
        }
        "Weekly" {
            $Schedule = New-CMSchedule -RecurInterval Days -RecurCount 7
        }
    }
    
    # Create the collection
    $Collection = New-CMDeviceCollection \`
        -Name $CollectionName \`
        -LimitingCollectionName $LimitingCollection \`
        -Comment "[AUTO] Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
    
    Write-Host "✓ Collection created: $CollectionName" -ForegroundColor Green
    
    # Add query rule
    Add-CMDeviceCollectionQueryMembershipRule \`
        -CollectionName $CollectionName \`
        -QueryExpression $WQLQuery \`
        -RuleName "Query-$CollectionName"
    
    Write-Host "✓ Query rule added" -ForegroundColor Green
    
    # Configure incremental updates
    if ($EnableIncremental) {
        Set-CMCollection -Name $CollectionName -RefreshType Periodic -RefreshSchedule $Schedule
        Set-CMCollection -Name $CollectionName -RefreshType Both
        Write-Host "✓ Incremental updates enabled" -ForegroundColor Green
    } elseif ($Schedule) {
        Set-CMCollection -Name $CollectionName -RefreshType Periodic -RefreshSchedule $Schedule
        Write-Host "✓ Refresh schedule set: $RefreshSchedule" -ForegroundColor Green
    }
${folderPath ? `    
    # Move to folder
    $FolderPath = "${folderPath}"
    $Folder = Get-Item -Path "$SiteCode:\\DeviceCollection\\$FolderPath" -ErrorAction SilentlyContinue
    if ($Folder) {
        Move-CMObject -FolderPath "$SiteCode:\\DeviceCollection\\$FolderPath" -InputObject $Collection
        Write-Host "✓ Moved to folder: $FolderPath" -ForegroundColor Green
    }
` : ''}
    Write-Host ""
    Write-Host "Collection created successfully!" -ForegroundColor Green
    Write-Host "  Name: $CollectionName" -ForegroundColor Gray
    Write-Host "  Limiting: $LimitingCollection" -ForegroundColor Gray
    Write-Host "  Refresh: $RefreshSchedule" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create collection: $_"
    exit 1
}`;
    }
  },

  {
    id: 'bulk-add-devices-to-collection',
    name: 'Bulk Add Devices to Collection',
    category: 'Collections & Queries',
    description: 'Add multiple devices to a collection using direct membership from CSV file',
    instructions: `**How This Task Works:**
This script adds multiple devices to MECM collections at scale using CSV import for efficient bulk membership management.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Collection management permissions
- CSV file with DeviceName column

**What You Need to Provide:**
- Target collection name
- CSV file path with device names
- Test mode for preview (recommended first run)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates collection exists
3. Imports CSV with device names
4. For each device: finds in MECM, checks existing membership
5. Adds direct membership rules (or previews in test mode)
6. Reports success/failure/already-member statistics

**Important Notes:**
- ALWAYS test first with preview mode enabled
- Direct membership overrides query-based rules
- Skips devices already in collection
- Large batches (500+) may take significant time
- CSV must have "DeviceName" column header
- Essential for pilot deployments and targeted groups`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Pilot-Workstations' },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Scripts\\devices.csv', description: 'CSV with "DeviceName" column' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const csvPath = escapePowerShellString(params.csvPath);
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Add Devices to MECM Collection
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CollectionName = "${collectionName}"
$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Validate collection exists
try {
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    Write-Host "✓ Target Collection: $CollectionName" -ForegroundColor Green
} catch {
    Write-Error "Collection not found: $CollectionName"
    exit 1
}

# Import CSV
$Devices = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0
$AlreadyMemberCount = 0

Write-Host ""
Write-Host "Processing $($Devices.Count) devices..." -ForegroundColor Cyan
Write-Host ""

foreach ($Device in $Devices) {
    if (-not $Device.DeviceName) {
        Write-Host "⚠ Skipping row with missing DeviceName" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Get device from MECM
        $CMDevice = Get-CMDevice -Name $Device.DeviceName -ErrorAction Stop
        
        # Check if already a member
        $IsMember = Get-CMDeviceCollectionDirectMembershipRule -CollectionName $CollectionName | 
            Where-Object { $_.ResourceID -eq $CMDevice.ResourceID }
        
        if ($IsMember) {
            Write-Host "ℹ $($Device.DeviceName): Already a member" -ForegroundColor Gray
            $AlreadyMemberCount++
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Device.DeviceName): Would be added (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            Add-CMDeviceCollectionDirectMembershipRule \`
                -CollectionName $CollectionName \`
                -ResourceId $CMDevice.ResourceID
            Write-Host "✓ $($Device.DeviceName): Added successfully" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Device.DeviceName): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Devices.Count) devices" -ForegroundColor Gray
Write-Host "  Added: $SuccessCount" -ForegroundColor Green
Write-Host "  Already Members: $AlreadyMemberCount" -ForegroundColor Gray
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'create-pilot-collection',
    name: 'Create Pilot Collection (N% Sampling)',
    category: 'Collections & Queries',
    description: 'Create a pilot collection with random sampling from a source collection',
    instructions: `**How This Task Works:**
This script creates pilot collections using random sampling for safe staged deployments and testing before broad rollouts.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Collection creation permissions
- Source collection with devices

**What You Need to Provide:**
- Source collection name
- Pilot collection name
- Sample percentage (e.g., 10% for 10 of 100 devices)
- Option to exclude VIPs/Servers

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates source collection exists
3. Retrieves all devices from source
4. Optional: Filters out VIP/Server devices
5. Calculates sample size based on percentage
6. Randomly selects devices for pilot
7. Creates pilot collection with direct membership

**Important Notes:**
- Random sampling ensures representative pilot group
- Excludes VIP/Server devices by default for safety
- Essential for phased deployments
- Pilot percentage typically 5-15%
- Use for application/update testing before production
- Can re-run to create different pilot groups`,
    parameters: [
      { id: 'sourceCollection', label: 'Source Collection', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'pilotName', label: 'Pilot Collection Name', type: 'text', required: true, placeholder: 'Pilot - Workstations' },
      { id: 'samplePercent', label: 'Sample Percentage', type: 'number', required: true, placeholder: '10', defaultValue: 10 },
      { id: 'excludeVIPs', label: 'Exclude VIPs/Servers', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const sourceCollection = escapePowerShellString(params.sourceCollection);
      const pilotName = escapePowerShellString(params.pilotName);
      const samplePercent = params.samplePercent || 10;
      const excludeVIPs = toPowerShellBoolean(params.excludeVIPs ?? true);

      return `# Create MECM Pilot Collection with Random Sampling
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$SourceCollection = "${sourceCollection}"
$PilotName = "${pilotName}"
$SamplePercent = ${samplePercent}
$ExcludeVIPs = ${excludeVIPs}

try {
    # Validate source collection
    $Source = Get-CMDeviceCollection -Name $SourceCollection -ErrorAction Stop
    Write-Host "✓ Source collection: $SourceCollection" -ForegroundColor Green
    
    # Get all devices from source
    $AllDevices = Get-CMDevice -CollectionName $SourceCollection
    Write-Host "  Total devices: $($AllDevices.Count)" -ForegroundColor Gray
    
    # Filter out VIPs/Servers if requested
    $EligibleDevices = $AllDevices
    if ($ExcludeVIPs) {
        $EligibleDevices = $AllDevices | Where-Object {
            $_.Name -notlike "*VIP*" -and
            $_.Name -notlike "*SRV*" -and
            $_.Name -notlike "*SERVER*" -and
            $_.OperatingSystemNameandVersion -notlike "*Server*"
        }
        Write-Host "  Eligible devices (excluding VIPs/Servers): $($EligibleDevices.Count)" -ForegroundColor Gray
    }
    
    # Calculate sample size
    $SampleSize = [Math]::Ceiling($EligibleDevices.Count * ($SamplePercent / 100))
    Write-Host "  Sample size ($SamplePercent%): $SampleSize devices" -ForegroundColor Gray
    
    # Random sampling
    $PilotDevices = $EligibleDevices | Get-Random -Count $SampleSize
    
    # Create pilot collection
    $PilotCollection = New-CMDeviceCollection \`
        -Name $PilotName \`
        -LimitingCollectionName $SourceCollection \`
        -Comment "[AUTO] Pilot collection - $SamplePercent% random sample. Created $(Get-Date -Format 'yyyy-MM-dd')"
    
    Write-Host "✓ Pilot collection created: $PilotName" -ForegroundColor Green
    
    # Add direct membership rules
    Write-Host ""
    Write-Host "Adding $($PilotDevices.Count) devices to pilot..." -ForegroundColor Cyan
    
    foreach ($Device in $PilotDevices) {
        try {
            Add-CMDeviceCollectionDirectMembershipRule \`
                -CollectionName $PilotName \`
                -ResourceId $Device.ResourceID \`
                -ErrorAction Stop
        } catch {
            Write-Host "  ⚠ Could not add: $($Device.Name)" -ForegroundColor Yellow
        }
    }
    
    # Trigger collection update
    Invoke-CMDeviceCollectionUpdate -Name $PilotName
    
    Write-Host ""
    Write-Host "✓ Pilot collection ready!" -ForegroundColor Green
    Write-Host "  Name: $PilotName" -ForegroundColor Gray
    Write-Host "  Devices: $($PilotDevices.Count) ($SamplePercent% of $($EligibleDevices.Count))" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create pilot collection: $_"
    exit 1
}`;
    }
  },

  {
    id: 'bulk-create-collections-csv',
    name: 'Bulk Create Collections from CSV',
    category: 'Collections & Queries',
    description: 'Create multiple collections from CSV file with names, limiting collections, and queries',
    instructions: `**How This Task Works:**
This script automates mass collection creation from CSV for efficient MECM environment setup and standardization.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Collection creation permissions
- CSV file with Name, Limiting, Query columns

**What You Need to Provide:**
- CSV file path with collection definitions
- Optional: Target folder path for organization
- Test mode for preview (recommended first run)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates CSV file exists and reads collection definitions
3. For each collection: checks if exists, creates with limiting collection
4. Adds query membership rule for dynamic membership
5. Configures daily refresh schedule
6. Optional: Moves collections to specified folder
7. Reports success/failure statistics

**Important Notes:**
- CSV must have columns: Name, Limiting, Query
- ALWAYS test first with preview mode enabled
- Essential for standardized environment builds
- Use for multi-tenant or templated deployments
- Validate WQL queries before bulk import
- Can create dozens/hundreds of collections quickly
- Backup existing collections before bulk operations`,
    parameters: [
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, placeholder: 'C:\\Scripts\\collections.csv', description: 'CSV with Name, Limiting, Query columns' },
      { id: 'folderPath', label: 'Target Folder Path (Optional)', type: 'text', required: false, placeholder: 'Device Collections\\Automated' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const folderPath = params.folderPath ? escapePowerShellString(params.folderPath) : '';
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Bulk Create MECM Collections from CSV
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CsvPath = "${csvPath}"
$TestMode = ${testMode}

# Validate CSV
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

$Collections = Import-Csv -Path $CsvPath
$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Expected CSV columns: Name, Limiting, Query" -ForegroundColor Cyan
Write-Host "Processing $($Collections.Count) collections..." -ForegroundColor Cyan
Write-Host ""

foreach ($Coll in $Collections) {
    if (-not $Coll.Name -or -not $Coll.Limiting -or -not $Coll.Query) {
        Write-Host "⚠ Skipping row with missing Name, Limiting, or Query" -ForegroundColor Yellow
        $FailCount++
        continue
    }
    
    try {
        # Check if exists
        $Existing = Get-CMDeviceCollection -Name $Coll.Name -ErrorAction SilentlyContinue
        if ($Existing) {
            Write-Host "ℹ $($Coll.Name): Already exists" -ForegroundColor Gray
            continue
        }
        
        if ($TestMode) {
            Write-Host "✓ $($Coll.Name): Would create with limiting '$($Coll.Limiting)' (TEST MODE)" -ForegroundColor Cyan
            $SuccessCount++
        } else {
            # Create collection
            $NewColl = New-CMDeviceCollection \`
                -Name $Coll.Name \`
                -LimitingCollectionName $Coll.Limiting \`
                -Comment "[AUTO] Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
            
            # Add query rule
            Add-CMDeviceCollectionQueryMembershipRule \`
                -CollectionName $Coll.Name \`
                -QueryExpression $Coll.Query \`
                -RuleName "Query-$($Coll.Name)"
            
            # Set daily refresh
            $Schedule = New-CMSchedule -RecurInterval Days -RecurCount 1
            Set-CMCollection -Name $Coll.Name -RefreshType Periodic -RefreshSchedule $Schedule
${folderPath ? `            
            # Move to folder
            $FolderPath = "${folderPath}"
            $Folder = Get-Item -Path "$SiteCode:\\DeviceCollection\\$FolderPath" -ErrorAction SilentlyContinue
            if ($Folder) {
                Move-CMObject -FolderPath "$SiteCode:\\DeviceCollection\\$FolderPath" -InputObject $NewColl
            }
` : ''}            
            Write-Host "✓ $($Coll.Name): Created successfully" -ForegroundColor Green
            $SuccessCount++
        }
        
    } catch {
        Write-Host "✗ $($Coll.Name): Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $($Collections.Count) collections" -ForegroundColor Gray
Write-Host "  Created: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  // ========================================
  // APPLICATIONS & DEPLOYMENTS CATEGORY
  // ========================================
  {
    id: 'create-application',
    name: 'Create Application from Installer',
    category: 'Applications & Deployments',
    description: 'Create a new application with install/uninstall commands and detection rules',
    instructions: `**How This Task Works:**
This script creates MECM applications with deployment types, install/uninstall commands, and detection logic for software distribution.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Application management permissions
- Network-accessible source content path

**What You Need to Provide:**
- Application name and version
- Source content UNC path (must be accessible by MECM)
- Installer type (MSI, EXE, or Script)
- Install and uninstall commands
- Detection method (MSI product code, file path, registry, or custom script)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates application doesn't already exist
3. Creates new application object with version
4. Adds deployment type with install/uninstall commands
5. Configures detection method based on selected type
6. Reports next steps for content distribution

**Important Notes:**
- Source path must be UNC path accessible from MECM server
- MSI detection extracts product code from install command
- File/Registry detection uses PowerShell script validation
- After creation: distribute content and create deployment
- Test install/uninstall commands before production
- Essential foundation for software distribution
- Detection rules critical for accurate installation reporting`,
    parameters: [
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: '7-Zip 23.01' },
      { id: 'sourcePath', label: 'Source Content Path', type: 'path', required: true, placeholder: '\\\\server\\sources$\\7-Zip\\23.01' },
      { id: 'installerType', label: 'Installer Type', type: 'select', required: true, defaultValue: 'MSI', options: ['MSI', 'EXE', 'Script'] },
      { id: 'installCommand', label: 'Install Command', type: 'text', required: true, placeholder: 'msiexec /i "7z2301-x64.msi" /qn' },
      { id: 'uninstallCommand', label: 'Uninstall Command', type: 'text', required: true, placeholder: 'msiexec /x "7z2301-x64.msi" /qn' },
      { id: 'detectionMethod', label: 'Detection Method', type: 'select', required: true, defaultValue: 'MSI', options: ['MSI', 'Registry', 'File', 'Script'] },
      { id: 'detectionValue', label: 'Detection Value', type: 'text', required: false, placeholder: 'C:\\Program Files\\7-Zip\\7z.exe' }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const sourcePath = escapePowerShellString(params.sourcePath);
      const installerType = escapePowerShellString(params.installerType || 'MSI');
      const installCommand = escapePowerShellString(params.installCommand);
      const uninstallCommand = escapePowerShellString(params.uninstallCommand);
      const detectionMethod = escapePowerShellString(params.detectionMethod || 'MSI');
      const detectionValue = params.detectionValue ? escapePowerShellString(params.detectionValue) : '';

      return `# Create MECM Application
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$AppName = "${appName}"
$SourcePath = "${sourcePath}"
$InstallCommand = "${installCommand}"
$UninstallCommand = "${uninstallCommand}"
$DetectionMethod = "${detectionMethod}"

try {
    # Check if app already exists
    $ExistingApp = Get-CMApplication -Name $AppName -ErrorAction SilentlyContinue
    if ($ExistingApp) {
        Write-Host "⚠ Application already exists: $AppName" -ForegroundColor Yellow
        Write-Host "  Consider versioning or updating existing app" -ForegroundColor Gray
        exit 0
    }
    
    # Validate source path
    if (-not (Test-Path $SourcePath)) {
        Write-Host "⚠ Warning: Source path not accessible: $SourcePath" -ForegroundColor Yellow
        Write-Host "  Continuing anyway - verify path is accessible from MECM" -ForegroundColor Gray
    }
    
    # Create the application
    $App = New-CMApplication -Name $AppName -SoftwareVersion "1.0"
    Write-Host "✓ Application created: $AppName" -ForegroundColor Green
    
    # Add deployment type
    $DTParams = @{
        ApplicationName = $AppName
        DeploymentTypeName = "$AppName - Windows Installer"
        InstallationBehaviorType = 'InstallForSystem'
        InstallCommand = $InstallCommand
        UninstallCommand = $UninstallCommand
        ContentLocation = $SourcePath
        ProductCode = '' # Will be set based on detection
    }
    
    # Add detection method based on type
    switch ($DetectionMethod) {
        "MSI" {
            # For MSI, extract product code from install command
            if ($InstallCommand -match '\\{[A-F0-9-]+\\}') {
                $DTParams.ProductCode = $Matches[0]
            }
            $DT = Add-CMMsiDeploymentType @DTParams
        }
        "File" {
            $DT = Add-CMScriptDeploymentType @DTParams -ScriptLanguage PowerShell -ScriptText @"
if (Test-Path "${detectionValue}") { Write-Host "Installed" }
"@
        }
        "Registry" {
            $DT = Add-CMScriptDeploymentType @DTParams -ScriptLanguage PowerShell -ScriptText @"
if (Test-Path "${detectionValue}") { Write-Host "Installed" }
"@
        }
        "Script" {
            $DT = Add-CMScriptDeploymentType @DTParams -ScriptLanguage PowerShell -ScriptText @"
# Custom detection script
${detectionValue}
"@
        }
    }
    
    Write-Host "✓ Deployment type added" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Application created successfully!" -ForegroundColor Green
    Write-Host "  Name: $AppName" -ForegroundColor Gray
    Write-Host "  Source: $SourcePath" -ForegroundColor Gray
    Write-Host "  Detection: $DetectionMethod" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Distribute content to distribution points" -ForegroundColor Gray
    Write-Host "  2. Create deployment to collection" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create application: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-deployment',
    name: 'Create Deployment to Collection',
    category: 'Applications & Deployments',
    description: 'Deploy an application or package to one or more collections',
    instructions: `**How This Task Works:**
This script creates application deployments to collections for software distribution with configurable timing, notifications, and enforcement.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Application deployment permissions
- Application must exist with content ALREADY DISTRIBUTED to distribution points
- CRITICAL: Deployment will fail if content not distributed first

**What You Need to Provide:**
- Application/package name
- Target collection(s) - comma-separated for multiple
- Deployment action (Install/Uninstall)
- Purpose (Available for self-service, Required for enforced)
- Deadline hours (only used when Purpose=Required; 0=no deadline)
- User notification preferences

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates application exists
3. For each collection: validates exists, checks for existing deployment
4. Creates deployment with specified action and purpose
5. If Purpose=Required AND deadline>0: sets enforcement deadline
6. Sets user notification preferences
7. Reports success/failure for each collection

**Important Notes:**
- MUST distribute application content to DPs BEFORE running this script
- Deployment will be created but fail if content not distributed
- Available deployments appear in Software Center for self-service
- Required deployments enforce installation/uninstall automatically
- Deadline ONLY applies when Purpose=Required (ignored for Available)
- Setting deadline=0 creates Required deployment with no enforcement time
- Can deploy to multiple collections simultaneously
- Check existing deployments to avoid duplicates
- Essential for software distribution workflows`,
    parameters: [
      { id: 'appName', label: 'Application/Package Name', type: 'text', required: true, placeholder: '7-Zip 23.01' },
      { id: 'collectionNames', label: 'Target Collections (comma-separated)', type: 'textarea', required: true, placeholder: 'Pilot-Workstations, IT-Department' },
      { id: 'deploymentAction', label: 'Action', type: 'select', required: true, defaultValue: 'Install', options: ['Install', 'Uninstall'] },
      { id: 'deploymentPurpose', label: 'Purpose', type: 'select', required: true, defaultValue: 'Available', options: ['Available', 'Required'] },
      { id: 'deadline', label: 'Deadline (hours from now, 0=none)', type: 'number', required: false, defaultValue: 0 },
      { id: 'userNotification', label: 'User Notification', type: 'select', required: true, defaultValue: 'DisplayAll', options: ['DisplayAll', 'DisplaySoftwareCenterOnly', 'HideAll'] }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const collectionNames = params.collectionNames ? buildPowerShellArray(params.collectionNames) : '';
      const deploymentAction = escapePowerShellString(params.deploymentAction || 'Install');
      const deploymentPurpose = escapePowerShellString(params.deploymentPurpose || 'Available');
      const deadline = params.deadline || 0;
      const userNotification = escapePowerShellString(params.userNotification || 'DisplayAll');

      return `# Create MECM Application Deployment
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$AppName = "${appName}"
$Collections = ${collectionNames}
$DeploymentAction = "${deploymentAction}"
$DeploymentPurpose = "${deploymentPurpose}"
$DeadlineHours = ${deadline}
$UserNotification = "${userNotification}"

# Validate application exists
try {
    $App = Get-CMApplication -Name $AppName -ErrorAction Stop
    Write-Host "✓ Application found: $AppName" -ForegroundColor Green
} catch {
    Write-Error "Application not found: $AppName"
    exit 1
}

# Calculate deadline
$DeadlineTime = $null
if ($DeploylineHours -gt 0 -and $DeploymentPurpose -eq "Required") {
    $DeadlineTime = (Get-Date).AddHours($DeadlineHours)
}

$SuccessCount = 0
$FailCount = 0

Write-Host ""
Write-Host "Creating deployments to $($Collections.Count) collections..." -ForegroundColor Cyan
Write-Host ""

foreach ($CollectionName in $Collections) {
    try {
        # Validate collection exists
        $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
        
        # Check if deployment already exists
        $ExistingDeployment = Get-CMApplicationDeployment -Name $AppName -CollectionName $CollectionName -ErrorAction SilentlyContinue
        if ($ExistingDeployment) {
            Write-Host "ℹ $CollectionName: Deployment already exists" -ForegroundColor Gray
            continue
        }
        
        # Create deployment parameters
        $DeployParams = @{
            ApplicationName = $AppName
            CollectionName = $CollectionName
            DeployAction = $DeploymentAction
            DeployPurpose = $DeploymentPurpose
            UserNotification = $UserNotification
            AvailableDateTime = (Get-Date)
        }
        
        if ($DeadlineTime -and $DeploymentPurpose -eq "Required") {
            $DeployParams.DeadlineDateTime = $DeadlineTime
        }
        
        # Create deployment
        New-CMApplicationDeployment @DeployParams
        
        Write-Host "✓ $CollectionName: Deployment created" -ForegroundColor Green
        $SuccessCount++
        
    } catch {
        Write-Host "✗ $CollectionName: Failed - $($_.Exception.Message)" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Collections: $($Collections.Count)" -ForegroundColor Gray
Write-Host "  Deployed: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor Red
Write-Host ""
Write-Host "Deployment Details:" -ForegroundColor Cyan
Write-Host "  Application: $AppName" -ForegroundColor Gray
Write-Host "  Action: $DeploymentAction" -ForegroundColor Gray
Write-Host "  Purpose: $DeploymentPurpose" -ForegroundColor Gray
if ($DeadlineTime) {
    Write-Host "  Deadline: $($DeadlineTime.ToString('yyyy-MM-dd HH:mm'))" -ForegroundColor Gray
}
Write-Host "======================================" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'phased-deployment',
    name: 'Phased Deployment (Pilot → Broad)',
    category: 'Applications & Deployments',
    description: 'Create a phased deployment starting with pilot collection then expanding to broad collection',
    instructions: `**How This Task Works:**
This script creates staged deployments with pilot testing before broad rollout for risk mitigation and controlled software distribution.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Application deployment permissions
- Pilot and broad collections configured
- Application with content ALREADY DISTRIBUTED to distribution points
- CRITICAL: Phased deployment will fail if content not distributed first

**What You Need to Provide:**
- Application name
- Pilot collection (small test group)
- Broad collection (production users)
- Pilot duration in days (evaluation period)
- Success threshold percentage (e.g., 95%)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates application and both collections exist
3. Creates Required deployment to pilot collection immediately
4. Monitors pilot success rate during pilot duration
5. After pilot duration: checks if success threshold met
6. If successful: creates Required deployment to broad collection
7. Reports phased deployment status and next steps

**Important Notes:**
- MUST distribute application content to DPs BEFORE running this script
- Both pilot and broad deployments require prior content distribution
- Pilot deployment is immediate and Required
- Broad deployment waits for pilot duration + success check
- Success threshold based on installation success rate
- Essential for risk mitigation in production deployments
- Allows rollback before broad impact
- Monitor pilot results during pilot duration
- Typical pilot duration: 3-14 days depending on urgency`,
    parameters: [
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Microsoft Edge 119' },
      { id: 'pilotCollection', label: 'Pilot Collection', type: 'text', required: true, placeholder: 'Pilot-Workstations' },
      { id: 'broadCollection', label: 'Broad Collection', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'pilotDuration', label: 'Pilot Duration (days)', type: 'number', required: true, defaultValue: 7 },
      { id: 'successThreshold', label: 'Success Threshold %', type: 'number', required: true, defaultValue: 95 }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const pilotCollection = escapePowerShellString(params.pilotCollection);
      const broadCollection = escapePowerShellString(params.broadCollection);
      const pilotDuration = params.pilotDuration || 7;
      const successThreshold = params.successThreshold || 95;

      return `# Create Phased MECM Deployment
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$AppName = "${appName}"
$PilotCollection = "${pilotCollection}"
$BroadCollection = "${broadCollection}"
$PilotDuration = ${pilotDuration}
$SuccessThreshold = ${successThreshold}

try {
    # Validate application and collections
    $App = Get-CMApplication -Name $AppName -ErrorAction Stop
    $Pilot = Get-CMDeviceCollection -Name $PilotCollection -ErrorAction Stop
    $Broad = Get-CMDeviceCollection -Name $BroadCollection -ErrorAction Stop
    
    Write-Host "✓ Application: $AppName" -ForegroundColor Green
    Write-Host "✓ Pilot Collection: $PilotCollection" -ForegroundColor Green
    Write-Host "✓ Broad Collection: $BroadCollection" -ForegroundColor Green
    
    # Create phased deployment
    $PhasedDeployment = New-CMApplicationAutoPhasedDeployment \`
        -ApplicationName $AppName \`
        -Name "Phased-$AppName" \`
        -FirstCollectionName $PilotCollection \`
        -SecondCollectionName $BroadCollection \`
        -CriteriaOption Compliance \`
        -CriteriaValue $SuccessThreshold \`
        -BeginCondition AfterPeriod \`
        -DaysAfterPreviousPhaseSuccess $PilotDuration \`
        -ThrottlingDays 0 \`
        -Description "Phased deployment: $PilotDuration day pilot, $SuccessThreshold% success threshold"
    
    Write-Host ""
    Write-Host "✓ Phased deployment created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment Timeline:" -ForegroundColor Cyan
    Write-Host "  Phase 1 (Pilot): Now → +$PilotDuration days" -ForegroundColor Gray
    Write-Host "    Collection: $PilotCollection" -ForegroundColor Gray
    Write-Host "    Success threshold: $SuccessThreshold%" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Phase 2 (Broad): Auto-starts after success criteria met" -ForegroundColor Gray
    Write-Host "    Collection: $BroadCollection" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Monitor deployment progress in MECM console" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create phased deployment: $_"
    exit 1
}`;
    }
  },

  {
    id: 'redeploy-failed-devices',
    name: 'Redeploy to Failed Devices',
    category: 'Applications & Deployments',
    description: 'Create a new deployment targeting only devices that failed the original deployment',
    instructions: `**How This Task Works:**
This script creates intelligent retry deployments by automatically targeting only devices that failed the original application deployment.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Application deployment permissions
- Existing deployment with failure data
- Application content already distributed

**What You Need to Provide:**
- Application name that had failures
- Original target collection name
- New retry collection name

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates application and original deployment exist
3. Creates WQL query to find devices with compliance state 2 or 4 (failed)
4. Creates new collection with query-based membership for failed devices
5. Configures incremental updates for real-time membership changes
6. Creates Required deployment to retry collection with 24-hour deadline
7. Reports retry deployment configuration

**Important Notes:**
- Compliance state 2 = Non-compliant (failed installation)
- Compliance state 4 = Error state (deployment error)
- Collection auto-updates as failures occur
- 24-hour deadline gives immediate retry opportunity
- Essential for improving deployment success rates
- Monitor retry collection membership for troubleshooting
- If devices continue failing, investigate root cause
- Can reuse retry collection for future failures`,
    parameters: [
      { id: 'appName', label: 'Application Name', type: 'text', required: true, placeholder: 'Adobe Acrobat Reader' },
      { id: 'originalCollection', label: 'Original Target Collection', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'retryCollectionName', label: 'Retry Collection Name', type: 'text', required: true, placeholder: 'Retry-AdobeReader' }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const originalCollection = escapePowerShellString(params.originalCollection);
      const retryCollectionName = escapePowerShellString(params.retryCollectionName);

      return `# Redeploy to Failed Devices
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$AppName = "${appName}"
$OriginalCollection = "${originalCollection}"
$RetryCollectionName = "${retryCollectionName}"

try {
    # Validate application
    $App = Get-CMApplication -Name $AppName -ErrorAction Stop
    Write-Host "✓ Application: $AppName" -ForegroundColor Green
    
    # Get deployment status
    $Deployment = Get-CMApplicationDeployment -Name $AppName -CollectionName $OriginalCollection -ErrorAction Stop
    
    # Query for failed devices
    $WQLQuery = @"
SELECT SMS_R_System.ResourceId, SMS_R_System.Name
FROM SMS_R_System
INNER JOIN SMS_AppDeploymentAssetDetails ON SMS_R_System.ResourceId = SMS_AppDeploymentAssetDetails.MachineId
WHERE SMS_AppDeploymentAssetDetails.AppName = '$AppName'
AND SMS_AppDeploymentAssetDetails.ComplianceState IN (2, 4)
"@
    
    # Create retry collection
    $RetryCollection = New-CMDeviceCollection \`
        -Name $RetryCollectionName \`
        -LimitingCollectionName $OriginalCollection \`
        -Comment "[AUTO] Retry collection for failed $AppName deployments"
    
    Write-Host "✓ Retry collection created: $RetryCollectionName" -ForegroundColor Green
    
    # Add query rule for failed devices
    Add-CMDeviceCollectionQueryMembershipRule \`
        -CollectionName $RetryCollectionName \`
        -QueryExpression $WQLQuery \`
        -RuleName "Failed-$AppName"
    
    # Set incremental updates for fast refreshes
    Set-CMCollection -Name $RetryCollectionName -RefreshType Both
    
    # Trigger collection update
    Invoke-CMDeviceCollectionUpdate -Name $RetryCollectionName
    
    Write-Host "✓ Collection configured with failed device query" -ForegroundColor Green
    
    # Create new deployment to retry collection
    New-CMApplicationDeployment \`
        -ApplicationName $AppName \`
        -CollectionName $RetryCollectionName \`
        -DeployAction Install \`
        -DeployPurpose Required \`
        -UserNotification DisplayAll \`
        -AvailableDateTime (Get-Date) \`
        -DeadlineDateTime (Get-Date).AddHours(24)
    
    Write-Host "✓ Retry deployment created" -ForegroundColor Green
    Write-Host ""
    Write-Host "Retry deployment ready!" -ForegroundColor Green
    Write-Host "  Collection: $RetryCollectionName" -ForegroundColor Gray
    Write-Host "  Deadline: 24 hours from now" -ForegroundColor Gray
    Write-Host ""
    Write-Host "The collection will automatically update with failed devices" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create retry deployment: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // SOFTWARE UPDATES CATEGORY
  // ========================================
  {
    id: 'create-adr',
    name: 'Create ADR (Automatic Deployment Rule)',
    category: 'Software Updates',
    description: 'Create an automatic deployment rule for patch management with specified criteria',
    instructions: `**How This Task Works:**
This script creates Automatic Deployment Rules (ADRs) for automated patch management, reducing manual patching workload significantly.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Software Update Point configured
- WSUS synchronized with Microsoft Update
- Software update deployment permissions
- Target collections exist

**What You Need to Provide:**
- ADR name (descriptive naming convention)
- Product categories (e.g., Windows 11, Office 365 Client)
- Update classifications (Security Updates, Critical Updates, etc.)
- Target collection(s) for deployment
- Deployment deadline in days (enforcement window)
- Option to exclude preview updates

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates ADR doesn't already exist
3. Builds update criteria based on products, classifications, date range
4. Optional: Excludes preview/beta updates
5. Creates ADR with monthly schedule
6. For each target collection: creates deployment with deadline
7. Configures automatic deployment with restart permissions
8. Reports ADR configuration details

**Important Notes:**
- ADR automates monthly patching workflow
- Schedule runs every 30 days by default
- Deadline controls enforcement window (typical: 7-14 days)
- Preview updates excluded by default (stability)
- Includes updates from last 30 days only
- Essential for enterprise patch management
- Configure maintenance windows to control restart timing
- Test with pilot collection before broad deployment
- Review ADR runs monthly for issues`,
    parameters: [
      { id: 'adrName', label: 'ADR Name', type: 'text', required: true, placeholder: 'Workstations-Monthly-Patches' },
      { id: 'productCategories', label: 'Products (comma-separated)', type: 'textarea', required: true, placeholder: 'Windows 11, Office 365 Client' },
      { id: 'updateClassifications', label: 'Classifications (comma-separated)', type: 'textarea', required: true, placeholder: 'Security Updates, Critical Updates, Updates' },
      { id: 'targetCollections', label: 'Target Collections (comma-separated)', type: 'textarea', required: true, placeholder: 'Workstations-Ring1, Workstations-Ring2' },
      { id: 'deadlineDays', label: 'Deployment Deadline (days)', type: 'number', required: true, defaultValue: 7 },
      { id: 'excludePreviews', label: 'Exclude Preview Updates', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const adrName = escapePowerShellString(params.adrName);
      const products = params.productCategories ? buildPowerShellArray(params.productCategories) : '';
      const classifications = params.updateClassifications ? buildPowerShellArray(params.updateClassifications) : '';
      const collections = params.targetCollections ? buildPowerShellArray(params.targetCollections) : '';
      const deadlineDays = params.deadlineDays || 7;
      const excludePreviews = toPowerShellBoolean(params.excludePreviews ?? true);

      return `# Create MECM Automatic Deployment Rule (ADR)
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$ADRName = "${adrName}"
$Products = ${products}
$Classifications = ${classifications}
$Collections = ${collections}
$DeadlineDays = ${deadlineDays}
$ExcludePreviews = ${excludePreviews}

try {
    # Check if ADR already exists
    $ExistingADR = Get-CMSoftwareUpdateAutoDeploymentRule -Name $ADRName -ErrorAction SilentlyContinue
    if ($ExistingADR) {
        Write-Host "⚠ ADR already exists: $ADRName" -ForegroundColor Yellow
        Write-Host "  Modify script to update existing or choose different name" -ForegroundColor Gray
        exit 0
    }
    
    # Build criteria for updates
    $Criteria = @()
    
    # Product filter
    foreach ($Product in $Products) {
        $Criteria += "Product -eq '$Product'"
    }
    
    # Classification filter
    foreach ($Classification in $Classifications) {
        $Criteria += "UpdateClassification -eq '$Classification'"
    }
    
    # Date released filter (last 30 days)
    $Criteria += "DateRevised -ge (Get-Date).AddDays(-30)"
    
    # Exclude preview updates if requested
    if ($ExcludePreviews) {
        $Criteria += "Title -NotLike '*Preview*'"
    }
    
    # Create deployment package for updates
    $PackageName = "SUG-$ADRName-$(Get-Date -Format 'yyyyMM')"
    
    # Create the ADR
    Write-Host "Creating ADR: $ADRName..." -ForegroundColor Cyan
    
    # Schedule - run on Patch Tuesday (2nd Tuesday of month)
    $Schedule = New-CMSchedule -Start (Get-Date) -RecurInterval Days -RecurCount 30
    
    # Create ADR parameters
    $ADRParams = @{
        Name = $ADRName
        Description = "[AUTO] Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
        AddToExistingSoftwareUpdateGroup = $false
        EnabledAfterCreate = $true
        SendWakeupPacket = $false
        VerboseLevel = 'AllMessages'
        Schedule = $Schedule
    }
    
    $ADR = New-CMSoftwareUpdateAutoDeploymentRule @ADRParams
    
    Write-Host "✓ ADR created: $ADRName" -ForegroundColor Green
    
    # Add deployments to each collection
    foreach ($CollectionName in $Collections) {
        try {
            $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
            
            # Add deployment
            New-CMAutoDeploymentRuleDeployment \`
                -SoftwareUpdateAutoDeploymentRuleName $ADRName \`
                -CollectionName $CollectionName \`
                -EnableDeployment $true \`
                -SendWakeUpPacket $false \`
                -VerboseLevel AllMessages \`
                -DeadlineDay $DeadlineDays \`
                -AvailableImmediately $true \`
                -UserNotification DisplaySoftwareCenterOnly \`
                -AllowRestart $true \`
                -SuppressRestartServer $false \`
                -WriteFilterHandling $false
            
            Write-Host "✓ Deployment added for: $CollectionName" -ForegroundColor Green
            
        } catch {
            Write-Host "✗ Failed to add deployment for: $CollectionName" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ ADR created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "ADR Details:" -ForegroundColor Cyan
    Write-Host "  Name: $ADRName" -ForegroundColor Gray
    Write-Host "  Products: $($Products -join ', ')" -ForegroundColor Gray
    Write-Host "  Classifications: $($Classifications -join ', ')" -ForegroundColor Gray
    Write-Host "  Deadline: $DeadlineDays days" -ForegroundColor Gray
    Write-Host "  Collections: $($Collections.Count)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next step: Run ADR to download and deploy initial updates" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create ADR: $_"
    exit 1
}`;
    }
  },

  {
    id: 'cleanup-old-sugs',
    name: 'Cleanup Old Software Update Groups',
    category: 'Software Updates',
    description: 'Expire and cleanup old software update groups based on age threshold',
    instructions: `**How This Task Works:**
This script maintains MECM database health by automatically expiring old software update groups while preserving recent ones for compliance tracking.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Software update management permissions
- Understanding of SUG retention requirements

**What You Need to Provide:**
- Age threshold in days (older SUGs eligible for cleanup)
- Number of most recent SUGs to keep (safety buffer)
- Test mode for preview (recommended first run)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Retrieves all software update groups
3. Sorts by creation date (newest first)
4. Always preserves N most recent SUGs regardless of age
5. For remaining SUGs: checks age against threshold
6. For old SUGs: removes deployments, then expires SUG
7. Reports expired vs. kept counts

**Important Notes:**
- ALWAYS test first with preview mode enabled
- Most recent N SUGs always kept (typically 3-6)
- Age threshold typically 90-180 days
- Expiring SUGs doesn't delete deployed updates
- Essential for database performance and maintenance
- Removes deployments automatically before expiring
- Expired SUGs remain visible but inactive
- Run quarterly or after major patching cycles
- Coordinate with compliance reporting schedules`,
    parameters: [
      { id: 'ageThresholdDays', label: 'Age Threshold (days)', type: 'number', required: true, defaultValue: 90 },
      { id: 'keepRecentCount', label: 'Keep N Most Recent', type: 'number', required: true, defaultValue: 3 },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const ageThresholdDays = params.ageThresholdDays || 90;
      const keepRecentCount = params.keepRecentCount || 3;
      const testMode = toPowerShellBoolean(params.testMode ?? true);

      return `# Cleanup Old MECM Software Update Groups
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$AgeThresholdDays = ${ageThresholdDays}
$KeepRecentCount = ${keepRecentCount}
$TestMode = ${testMode}

$CutoffDate = (Get-Date).AddDays(-$AgeThresholdDays)
$ExpiredCount = 0
$KeptCount = 0

try {
    # Get all software update groups
    $AllSUGs = Get-CMSoftwareUpdateGroup
    
    # Sort by creation date descending
    $SortedSUGs = $AllSUGs | Sort-Object DateCreated -Descending
    
    Write-Host ""
    Write-Host "Analyzing $($AllSUGs.Count) Software Update Groups..." -ForegroundColor Cyan
    Write-Host "  Cutoff date: $($CutoffDate.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    Write-Host "  Will keep: $KeepRecentCount most recent" -ForegroundColor Gray
    Write-Host ""
    
    # Always keep the N most recent regardless of age
    $ToKeep = $SortedSUGs | Select-Object -First $KeepRecentCount
    $ToEvaluate = $SortedSUGs | Select-Object -Skip $KeepRecentCount
    
    foreach ($SUG in $ToEvaluate) {
        if ($SUG.DateCreated -lt $CutoffDate) {
            if ($TestMode) {
                Write-Host "Would expire: $($SUG.LocalizedDisplayName) (Created: $($SUG.DateCreated.ToString('yyyy-MM-dd')))" -ForegroundColor Cyan
                $ExpiredCount++
            } else {
                try {
                    # Remove deployments first
                    $Deployments = Get-CMSoftwareUpdateDeployment -SoftwareUpdateGroupId $SUG.CI_ID
                    foreach ($Deployment in $Deployments) {
                        Remove-CMSoftwareUpdateDeployment -SoftwareUpdateDeploymentId $Deployment.AssignmentID -Force
                    }
                    
                    # Expire the SUG
                    Set-CMSoftwareUpdateGroup -Id $SUG.CI_ID -Expired $true
                    
                    Write-Host "✓ Expired: $($SUG.LocalizedDisplayName)" -ForegroundColor Green
                    $ExpiredCount++
                } catch {
                    Write-Host "✗ Failed to expire: $($SUG.LocalizedDisplayName) - $_" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "ℹ Keeping (within threshold): $($SUG.LocalizedDisplayName)" -ForegroundColor Gray
            $KeptCount++
        }
    }
    
    # Report on always-kept items
    foreach ($SUG in $ToKeep) {
        Write-Host "ℹ Keeping (recent): $($SUG.LocalizedDisplayName)" -ForegroundColor Gray
    }
    $KeptCount += $ToKeep.Count
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total SUGs: $($AllSUGs.Count)" -ForegroundColor Gray
    Write-Host "  Expired: $ExpiredCount" -ForegroundColor Green
    Write-Host "  Kept: $KeptCount" -ForegroundColor Gray
    if ($TestMode) {
        Write-Host ""
        Write-Host "⚠ TEST MODE - No changes were made" -ForegroundColor Yellow
        Write-Host "  Set TestMode to \\$false to apply changes" -ForegroundColor Yellow
    }
    Write-Host "======================================" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to cleanup SUGs: $_"
    exit 1
}`;
    }
  },

  {
    id: 'compliance-report',
    name: 'Software Update Compliance Report',
    category: 'Software Updates',
    description: 'Generate compliance report showing top failed updates for a collection',
    instructions: `**How This Task Works:**
This script generates comprehensive patch compliance reports identifying problematic updates and non-compliant devices for remediation planning.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Software update reporting permissions
- Collection with update deployments
- Export path accessible

**What You Need to Provide:**
- Target collection name
- CSV export path for report
- Optional: Number of top failed updates to highlight

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates collection exists and retrieves member devices
3. Gathers compliance status for all deployed updates
4. Calculates overall compliance percentage
5. Identifies top N most problematic updates (by failure count)
6. Exports detailed CSV report with device and update details
7. Reports summary statistics

**Important Notes:**
- Essential for patch management oversight
- Identifies updates requiring troubleshooting
- Shows per-device compliance status
- Top failed updates indicate deployment issues
- Use report to prioritize remediation efforts
- Run monthly or before patch cycles
- Coordinate with change management processes
- CSV format enables pivot analysis in Excel
- High failure rates may indicate compatibility issues`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'reportPath', label: 'Report Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\UpdateCompliance.csv' },
      { id: 'topCount', label: 'Top N Failed Updates', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const collectionName = escapePowerShellString(params.collectionName);
      const reportPath = escapePowerShellString(params.reportPath);
      const topCount = params.topCount || 10;

      return `# MECM Software Update Compliance Report
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CollectionName = "${collectionName}"
$ReportPath = "${reportPath}"
$TopCount = ${topCount}

try {
    # Validate collection
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    Write-Host "✓ Collection: $CollectionName" -ForegroundColor Green
    
    # Get collection members
    $Devices = Get-CMDevice -CollectionName $CollectionName
    Write-Host "  Devices: $($Devices.Count)" -ForegroundColor Gray
    
    # Query compliance status
    Write-Host ""
    Write-Host "Gathering compliance data..." -ForegroundColor Cyan
    
    $ComplianceData = @()
    $TotalDevices = $Devices.Count
    $CompliantDevices = 0
    $NonCompliantDevices = 0
    
    # Get update deployment status
    $Updates = Get-CMSoftwareUpdate -Fast | Where-Object { $_.IsDeployed -eq $true }
    
    # Aggregate by update
    $UpdateStats = @{}
    
    foreach ($Update in $Updates) {
        $Status = Get-CMSoftwareUpdateDeploymentStatus -Id $Update.CI_ID
        
        $Failed = $Status | Where-Object { $_.StatusType -eq 'Failed' } | Measure-Object | Select-Object -ExpandProperty Count
        $Success = $Status | Where-Object { $_.StatusType -eq 'Success' } | Measure-Object | Select-Object -ExpandProperty Count
        $Unknown = $Status | Where-Object { $_.StatusType -eq 'Unknown' } | Measure-Object | Select-Object -ExpandProperty Count
        
        $UpdateStats[$Update.LocalizedDisplayName] = @{
            ArticleID = $Update.ArticleID
            Failed = $Failed
            Success = $Success
            Unknown = $Unknown
            Total = $Failed + $Success + $Unknown
        }
    }
    
    # Sort by failure count and take top N
    $TopFailures = $UpdateStats.GetEnumerator() | 
        Sort-Object { $_.Value.Failed } -Descending | 
        Select-Object -First $TopCount
    
    # Build report
    $Report = foreach ($Item in $TopFailures) {
        [PSCustomObject]@{
            Update = $Item.Key
            ArticleID = $Item.Value.ArticleID
            Failed = $Item.Value.Failed
            Success = $Item.Value.Success
            Unknown = $Item.Value.Unknown
            Total = $Item.Value.Total
            FailureRate = [Math]::Round(($Item.Value.Failed / $Item.Value.Total) * 100, 2)
        }
    }
    
    # Export to CSV
    $Report | Export-Csv -Path $ReportPath -NoTypeInformation
    
    # Display summary
    Write-Host ""
    Write-Host "✓ Report generated: $ReportPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Top $TopCount Failed Updates:" -ForegroundColor Cyan
    Write-Host ""
    
    $Report | Format-Table -Property ArticleID, Update, Failed, Success, FailureRate -AutoSize
    
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "  1. Review failed devices for common error codes" -ForegroundColor Gray
    Write-Host "  2. Check for disk space, pending reboots, or conflicts" -ForegroundColor Gray
    Write-Host "  3. Consider redeploying to failed devices" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate compliance report: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // CLIENT MANAGEMENT & HEALTH CATEGORY
  // ========================================
  {id:'force-policy-refresh',name:'Force Client Policy Refresh',category:'Client Management & Health',description:'Force immediate policy refresh on targeted devices',parameters:[{id:'devices',label:'Device Names (comma-separated)',type:'textarea',required:true,placeholder:'PC001,PC002,PC003'}],scriptTemplate:p=>{const d=p.devices?buildPowerShellArray(p.devices):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Devices=${d};foreach($Dev in $Devices){try{Invoke-CMClientAction -DeviceName $Dev -ActionType ClientNotificationRequestMachinePolicyNow;Write-Host "✓ $Dev: Policy refresh triggered" -ForegroundColor Green}catch{Write-Host "✗ $Dev: Failed" -ForegroundColor Red}}`;}},
  {id:'repair-client',name:'Repair MECM Client',category:'Client Management & Health',description:'Reinstall/repair Configuration Manager client on devices',parameters:[{id:'computerName',label:'Computer Name',type:'text',required:true,placeholder:'PC001'},{id:'siteCode',label:'Site Code',type:'text',required:true,placeholder:'PS1'},{id:'mpServer',label:'Management Point',type:'text',required:true,placeholder:'mecm.contoso.com'}],scriptTemplate:p=>{const c=escapePowerShellString(p.computerName),s=escapePowerShellString(p.siteCode),m=escapePowerShellString(p.mpServer);return `$Computer="${c}";$Site="${s}";$MP="${m}";try{Write-Host "Uninstalling client..." -ForegroundColor Cyan;Invoke-Command -ComputerName $Computer -ScriptBlock{Start-Process "C:\\Windows\\ccmsetup\\ccmsetup.exe" -ArgumentList "/uninstall" -Wait};Start-Sleep -Seconds 30;Write-Host "Installing client..." -ForegroundColor Cyan;Invoke-Command -ComputerName $Computer -ScriptBlock{param($s,$m);Start-Process "\\\\$m\\SMS_$s\\Client\\ccmsetup.exe" -ArgumentList "SMSSITECODE=$s","MP=$m","/forceinstall" -Wait} -ArgumentList $Site,$MP;Write-Host "✓ Client repair completed" -ForegroundColor Green}catch{Write-Error "Failed: $_"}`;}},
  {id:'client-health-check',name:'Export Client Health Dashboard',category:'Client Management & Health',description:'Generate comprehensive client health report with installation, online, and error status',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'All Systems'},{id:'exportPath',label:'Export Path',type:'path',required:true,placeholder:'C:\\Reports\\ClientHealth.csv'}],scriptTemplate:p=>{const c=escapePowerShellString(p.collectionName),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Collection="${c}";$Export="${e}";$Devices=Get-CMDevice -CollectionName $Collection;$Report=$Devices|ForEach{$LastHB=(Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_R_System -Filter "Name='$($_.Name)'"|Select -First 1).LastLogonTimestamp;[PSCustomObject]@{Name=$_.Name;Client=$_.IsClient;Online=$_.IsActive;LastHeartbeat=$LastHB;Version=$_.ClientVersion}};$Report|Export-Csv $Export -NoTypeInformation;Write-Host "✓ Report: $Export" -ForegroundColor Green`;}},
  {id:'clear-client-cache',name:'Clear Client Cache',category:'Client Management & Health',description:'Clear Configuration Manager client cache on devices to free disk space',parameters:[{id:'devices',label:'Device Names (comma-separated)',type:'textarea',required:true,placeholder:'PC001,PC002'},{id:'ageThresholdDays',label:'Delete Items Older Than (days)',type:'number',required:false,defaultValue:30}],scriptTemplate:p=>{const d=p.devices?buildPowerShellArray(p.devices):'',a=p.ageThresholdDays||30;return `$Devices=${d};$AgeDays=${a};foreach($Dev in $Devices){try{Invoke-Command -ComputerName $Dev -ScriptBlock{param($days);$Cache=New-Object -ComObject UIResource.UIResourceMgr;$Items=$Cache.GetCacheInfo().GetCacheElements();$Cutoff=(Get-Date).AddDays(-$days);foreach($Item in $Items){if($Item.LastReferenceTime -lt $Cutoff){$Cache.GetCacheInfo().DeleteCacheElement($Item.CacheElementID)}}};Write-Host "✓ $Dev: Cache cleared" -ForegroundColor Green}catch{Write-Host "✗ $Dev: Failed" -ForegroundColor Red}}`;}},
  {id:'remote-client-actions',name:'Remote Client Actions',category:'Client Management & Health',description:'Execute remote actions on client devices (restart, wake, lock, etc.)',parameters:[{id:'devices',label:'Device Names (comma-separated)',type:'textarea',required:true,placeholder:'PC001,PC002'},{id:'action',label:'Action',type:'select',required:true,defaultValue:'Restart',options:['Restart','Shutdown','WakeUp','Lock','Logoff']}],scriptTemplate:p=>{const d=p.devices?buildPowerShellArray(p.devices):'',a=escapePowerShellString(p.action||'Restart');return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Devices=${d};$Action="${a}";$ActionMap=@{Restart='ClientNotificationRequestMachineRestart';WakeUp='ClientNotificationSendWakeupPacket';Lock='Undefined';Shutdown='Undefined';Logoff='Undefined'};foreach($Dev in $Devices){try{if($ActionMap[$Action] -ne 'Undefined'){Invoke-CMClientAction -DeviceName $Dev -ActionType $ActionMap[$Action];Write-Host "✓ $Dev: $Action triggered" -ForegroundColor Green}else{Invoke-Command -ComputerName $Dev -ScriptBlock{param($a);if($a -eq 'Lock'){rundll32.exe user32.dll,LockWorkStation}elseif($a -eq 'Shutdown'){Stop-Computer -Force}elseif($a -eq 'Logoff'){shutdown /l}} -ArgumentList $Action;Write-Host "✓ $Dev: $Action completed" -ForegroundColor Green}}catch{Write-Host "✗ $Dev: Failed" -ForegroundColor Red}}`;}},

  // ========================================
  // PACKAGES & PROGRAMS CATEGORY
  // ========================================
  {id:'create-package',name:'Create Package from Source',category:'Packages & Programs',description:'Create a legacy package with program for software distribution',parameters:[{id:'packageName',label:'Package Name',type:'text',required:true,placeholder:'Adobe Reader DC'},{id:'sourcePath',label:'Source Path',type:'path',required:true,placeholder:'\\\\server\\sources$\\AdobeReader'},{id:'programName',label:'Program Name',type:'text',required:true,placeholder:'Install'},{id:'commandLine',label:'Command Line',type:'text',required:true,placeholder:'setup.exe /sAll /rs /msi EULA_ACCEPT=YES'}],scriptTemplate:p=>{const n=escapePowerShellString(p.packageName),s=escapePowerShellString(p.sourcePath),pn=escapePowerShellString(p.programName),c=escapePowerShellString(p.commandLine);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Pkg=New-CMPackage -Name "${n}" -Path "${s}" -Description "[AUTO] Created by PSForge";Write-Host "✓ Package created: ${n}" -ForegroundColor Green;$Prog=New-CMProgram -PackageName "${n}" -StandardProgramName "${pn}" -CommandLine "${c}" -RunType Normal -ProgramRunType WhetherOrNotUserIsLoggedOn;Write-Host "✓ Program created: ${pn}" -ForegroundColor Green}catch{Write-Error "Failed: $_"}`;}},
  {id:'distribute-content',name:'Distribute Content to DPs',category:'Packages & Programs',description:'Distribute package/application content to distribution point groups',parameters:[{id:'contentName',label:'Package/Application Name',type:'text',required:true,placeholder:'7-Zip 23.01'},{id:'dpGroup',label:'Distribution Point Group',type:'text',required:true,placeholder:'All DPs'},{id:'contentType',label:'Content Type',type:'select',required:true,defaultValue:'Package',options:['Package','Application','BootImage','DriverPackage']}],scriptTemplate:p=>{const n=escapePowerShellString(p.contentName),g=escapePowerShellString(p.dpGroup),t=escapePowerShellString(p.contentType||'Package');return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Name="${n}";$DPGroup="${g}";$Type="${t}";try{switch($Type){'Package'{Start-CMContentDistribution -PackageName $Name -DistributionPointGroupName $DPGroup}'Application'{Start-CMContentDistribution -ApplicationName $Name -DistributionPointGroupName $DPGroup}'BootImage'{Start-CMContentDistribution -BootImageName $Name -DistributionPointGroupName $DPGroup}'DriverPackage'{Start-CMContentDistribution -DriverPackageName $Name -DistributionPointGroupName $DPGroup}};Write-Host "✓ Distribution started to: $DPGroup" -ForegroundColor Green}catch{Write-Error "Failed: $_"}`;}},
  {id:'monitor-content-distribution',name:'Monitor Content Distribution Status',category:'Packages & Programs',description:'Check distribution status of content across all distribution points',parameters:[{id:'contentName',label:'Package/Application Name',type:'text',required:true,placeholder:'Windows 11 22H2'},{id:'exportPath',label:'Export Path (optional)',type:'path',required:false,placeholder:'C:\\Reports\\DistStatus.csv'}],scriptTemplate:p=>{const n=escapePowerShellString(p.contentName),e=p.exportPath?escapePowerShellString(p.exportPath):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Name="${n}";try{$Status=Get-CMDistributionStatus -Name $Name;$Report=$Status|ForEach{[PSCustomObject]@{DP=$_.ServerNALPath;Status=$_.LastStatusMessage;Targeted=$_.Targeted;Installed=$_.Installed;Failed=$_.Failed;InProgress=$_.InProgress}};$Report|Format-Table -AutoSize;${e?`$Report|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Report: ${e}" -ForegroundColor Green`:''}}catch{Write-Error "Failed: $_"}`;}},

  // ========================================
  // OPERATING SYSTEM DEPLOYMENT CATEGORY
  // ========================================
  {id:'create-boot-image',name:'Create Custom Boot Image',category:'Operating System Deployment',description:'Create and customize WinPE boot image with drivers and components',parameters:[{id:'name',label:'Boot Image Name',type:'text',required:true,placeholder:'Custom WinPE x64'},{id:'sourcePath',label:'WIM Source Path',type:'path',required:true,placeholder:'C:\\Program Files\\Microsoft Configuration Manager\\OSD\\boot\\x64\\boot.wim'},{id:'enableCommandSupport',label:'Enable Command Support (F8)',type:'boolean',required:false,defaultValue:true}],scriptTemplate:p=>{const n=escapePowerShellString(p.name),s=escapePowerShellString(p.sourcePath),e=toPowerShellBoolean(p.enableCommandSupport??true);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Boot=New-CMBootImage -Name "${n}" -Path "${s}" -Index 1;if(${e}){Set-CMBootImage -Name "${n}" -EnableCommandSupport \\$true;Write-Host "✓ Command support enabled" -ForegroundColor Green};Write-Host "✓ Boot image created: ${n}" -ForegroundColor Green;Write-Host "Next: Distribute to DPs" -ForegroundColor Cyan}catch{Write-Error "Failed: $_"}`;}},
  {id:'import-driver-package',name:'Import Driver Package',category:'Operating System Deployment',description:'Import and categorize device drivers into MECM for OS deployment',parameters:[{id:'packageName',label:'Driver Package Name',type:'text',required:true,placeholder:'Dell Latitude 7490 Drivers'},{id:'sourcePath',label:'Driver Source Path',type:'path',required:true,placeholder:'\\\\server\\drivers$\\Dell\\Latitude7490'},{id:'category',label:'Driver Category',type:'text',required:false,placeholder:'Laptops'}],scriptTemplate:p=>{const n=escapePowerShellString(p.packageName),s=escapePowerShellString(p.sourcePath),c=p.category?escapePowerShellString(p.category):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{Write-Host "Importing drivers from: ${s}" -ForegroundColor Cyan;$Drivers=Import-CMDriver -Path "${s}" -ImportFolder${c?` -DriverCategory "${c}"`:''};Write-Host "✓ Imported: $($Drivers.Count) drivers" -ForegroundColor Green;$Pkg=New-CMDriverPackage -Name "${n}" -Path "\\\\$($env:COMPUTERNAME)\\SMS_$SiteCode\\Drivers\\${n}";foreach($Drv in $Drivers){Add-CMDriverToDriverPackage -DriverId $Drv.CI_ID -DriverPackageName "${n}"};Write-Host "✓ Driver package created: ${n}" -ForegroundColor Green}catch{Write-Error "Failed: $_"}`;}},
  {id:'create-task-sequence',name:'Create OS Deployment Task Sequence',category:'Operating System Deployment',description:'Create a new operating system deployment task sequence',parameters:[{id:'name',label:'Task Sequence Name',type:'text',required:true,placeholder:'Deploy Windows 11 22H2'},{id:'osImage',label:'OS Image Package',type:'text',required:true,placeholder:'Windows 11 22H2 x64'},{id:'bootImage',label:'Boot Image',type:'text',required:true,placeholder:'Boot Image (x64)'},{id:'productKey',label:'Product Key (optional)',type:'text',required:false,placeholder:'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'}],scriptTemplate:p=>{const n=escapePowerShellString(p.name),o=escapePowerShellString(p.osImage),b=escapePowerShellString(p.bootImage),k=p.productKey?escapePowerShellString(p.productKey):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$OS=Get-CMOperatingSystemImage -Name "${o}";$Boot=Get-CMBootImage -Name "${b}";$TS=New-CMTaskSequence -Name "${n}" -BootImagePackageId $Boot.PackageID -OperatingSystemImagePackageId $OS.PackageID -InstallOperatingSystemImage${k?` -ProductKey "${k}"`:''} -JoinDomain WorkGroup -WorkgroupName "WORKGROUP";Write-Host "✓ Task sequence created: ${n}" -ForegroundColor Green;Write-Host "Next: Customize steps and deploy" -ForegroundColor Cyan}catch{Write-Error "Failed: $_"}`;}},
  {id:'deploy-task-sequence',name:'Deploy Task Sequence to Collection',category:'Operating System Deployment',description:'Deploy OS task sequence with PXE and media options',parameters:[{id:'tsName',label:'Task Sequence Name',type:'text',required:true,placeholder:'Deploy Windows 11 22H2'},{id:'collectionName',label:'Target Collection',type:'text',required:true,placeholder:'OSD-Staging'},{id:'enablePXE',label:'Enable PXE',type:'boolean',required:false,defaultValue:true},{id:'enableMedia',label:'Enable Task Sequence Media',type:'boolean',required:false,defaultValue:true}],scriptTemplate:p=>{const t=escapePowerShellString(p.tsName),c=escapePowerShellString(p.collectionName),px=toPowerShellBoolean(p.enablePXE??true),m=toPowerShellBoolean(p.enableMedia??true);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{New-CMTaskSequenceDeployment -TaskSequenceName "${t}" -CollectionName "${c}" -DeployPurpose Available -AvailableDateTime (Get-Date) -MakeAvailableTo ClientsMediaAndPxe -ShowTaskSequenceProgress \\$true${px?` -AllowUsersRunIndependently \\$true`:``}${m?` -AllowUseUnprotectedDP \\$true`:``};Write-Host "✓ Task sequence deployed: ${t}" -ForegroundColor Green;Write-Host "  Collection: ${c}" -ForegroundColor Gray}catch{Write-Error "Failed: $_"}`;}},

  // ========================================
  // REPORTING & INVENTORY CATEGORY
  // ========================================
  {id:'export-hardware-inventory',name:'Export Hardware Inventory Report',category:'Reporting & Inventory',description:'Export detailed hardware inventory for collection devices',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'All Workstations'},{id:'exportPath',label:'Export Path',type:'path',required:true,placeholder:'C:\\Reports\\HardwareInventory.csv'}],scriptTemplate:p=>{const c=escapePowerShellString(p.collectionName),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Devices=Get-CMDevice -CollectionName "${c}";$Report=$Devices|ForEach{$Sys=Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_G_System_COMPUTER_SYSTEM -Filter "ResourceID='$($_.ResourceID)'"|Select -First 1;$Disk=Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_G_System_DISK -Filter "ResourceID='$($_.ResourceID)'"|Measure-Object -Property Size -Sum|Select -ExpandProperty Sum;[PSCustomObject]@{Name=$_.Name;Manufacturer=$Sys.Manufacturer;Model=$Sys.Model;RAM=$_.RAMSize;DiskGB=[Math]::Round($Disk/1024,2);LastInventory=$_.LastHardwareScan}};$Report|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Report: ${e}" -ForegroundColor Green`;}},
  {id:'export-software-inventory',name:'Export Software Inventory Report',category:'Reporting & Inventory',description:'Export installed software inventory for devices in collection',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'All Systems'},{id:'exportPath',label:'Export Path',type:'path',required:true,placeholder:'C:\\Reports\\SoftwareInventory.csv'},{id:'productFilter',label:'Product Name Filter (optional)',type:'text',required:false,placeholder:'Microsoft'}],scriptTemplate:p=>{const c=escapePowerShellString(p.collectionName),e=escapePowerShellString(p.exportPath),f=p.productFilter?escapePowerShellString(p.productFilter):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Devices=Get-CMDevice -CollectionName "${c}";$Report=@();foreach($Dev in $Devices){$Apps=Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_G_System_ADD_REMOVE_PROGRAMS -Filter "ResourceID='$($Dev.ResourceID)'"${f?` |Where-Object{$_.DisplayName -like '*${f}*'}`:``};foreach($App in $Apps){$Report+=[PSCustomObject]@{Computer=$Dev.Name;Software=$App.DisplayName;Version=$App.Version;Publisher=$App.Publisher}}};$Report|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Report: ${e} ($($Report.Count) items)" -ForegroundColor Green`;}},
  {id:'run-custom-query',name:'Run Custom WQL Query',category:'Reporting & Inventory',description:'Execute custom WQL query and export results',parameters:[{id:'queryName',label:'Query Name',type:'text',required:true,placeholder:'Find Devices with Low Disk Space'},{id:'wqlQuery',label:'WQL Query',type:'textarea',required:true,placeholder:'SELECT Name, Size, FreeSpace FROM SMS_G_System_LOGICAL_DISK WHERE DriveType=3 AND FreeSpace < 10000'},{id:'exportPath',label:'Export Path',type:'path',required:true,placeholder:'C:\\Reports\\QueryResults.csv'}],scriptTemplate:p=>{const n=escapePowerShellString(p.queryName),q=escapePowerShellString(p.wqlQuery),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{Write-Host "Executing query: ${n}" -ForegroundColor Cyan;$Results=Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Query "${q}";Write-Host "✓ Found: $($Results.Count) results" -ForegroundColor Green;$Results|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Exported: ${e}" -ForegroundColor Green}catch{Write-Error "Query failed: $_"}`;}},
  {id:'collection-membership-report',name:'Collection Membership Report',category:'Reporting & Inventory',description:'Generate detailed membership report showing devices across multiple collections',parameters:[{id:'collections',label:'Collections (comma-separated)',type:'textarea',required:true,placeholder:'Pilot-Group,Production-Group'},{id:'exportPath',label:'Export Path',type:'path',required:true,placeholder:'C:\\Reports\\CollectionMembership.csv'}],scriptTemplate:p=>{const c=p.collections?buildPowerShellArray(p.collections):'',e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Collections=${c};$Report=@();foreach($Coll in $Collections){$Members=Get-CMDevice -CollectionName $Coll;foreach($Dev in $Members){$Report+=[PSCustomObject]@{Collection=$Coll;Device=$Dev.Name;User=$Dev.UserName;LastLogon=$Dev.LastLogonUser;ClientVersion=$Dev.ClientVersion}}};$Report|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Report: ${e}" -ForegroundColor Green;Write-Host "  Total members: $($Report.Count)" -ForegroundColor Gray`;}},

  // ========================================
  // SITE CONFIGURATION & MAINTENANCE CATEGORY
  // ========================================
  {id:'configure-maintenance-window',name:'Configure Maintenance Window',category:'Site Configuration & Maintenance',description:'Create maintenance windows for collections to control deployment timing',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'Production-Servers'},{id:'windowName',label:'Window Name',type:'text',required:true,placeholder:'Monthly Patching Window'},{id:'startTime',label:'Start Time (HH:mm)',type:'text',required:true,placeholder:'02:00'},{id:'durationHours',label:'Duration (hours)',type:'number',required:true,defaultValue:4},{id:'recurrence',label:'Recurrence',type:'select',required:true,defaultValue:'Monthly',options:['None','Weekly','Monthly']}],scriptTemplate:p=>{const c=escapePowerShellString(p.collectionName),n=escapePowerShellString(p.windowName),s=escapePowerShellString(p.startTime),d=p.durationHours||4,r=escapePowerShellString(p.recurrence||'Monthly');return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";$Coll="${c}";$Name="${n}";$Start="${s}";$Duration=${d};$Recur="${r}";try{$Collection=Get-CMDeviceCollection -Name $Coll;$StartDate=Get-Date;$StartDate=$StartDate.Date.AddHours($Start.Split(':')[0]).AddMinutes($Start.Split(':')[1]);$Schedule=if($Recur -eq 'Monthly'){New-CMSchedule -Start $StartDate -DurationInterval Hours -DurationCount $Duration -RecurInterval Months -RecurCount 1}elseif($Recur -eq 'Weekly'){New-CMSchedule -Start $StartDate -DurationInterval Hours -DurationCount $Duration -RecurInterval Weeks -RecurCount 1}else{New-CMSchedule -Start $StartDate -DurationInterval Hours -DurationCount $Duration -RecurCount 1};New-CMMaintenanceWindow -CollectionId $Collection.CollectionID -Name $Name -Schedule $Schedule -ApplyTo SoftwareUpdatesOnly;Write-Host "✓ Maintenance window created" -ForegroundColor Green;Write-Host "  Collection: $Coll" -ForegroundColor Gray;Write-Host "  Start: $Start" -ForegroundColor Gray;Write-Host "  Duration: $Duration hours" -ForegroundColor Gray}catch{Write-Error "Failed: $_"}`;}},
  {id:'create-boundary-group',name:'Create Boundary Group',category:'Site Configuration & Maintenance',description:'Create boundary group and assign distribution points',parameters:[{id:'name',label:'Boundary Group Name',type:'text',required:true,placeholder:'Building-A-Network'},{id:'siteCode',label:'Site Code',type:'text',required:true,placeholder:'PS1'},{id:'boundaries',label:'Boundaries (comma-separated)',type:'textarea',required:true,placeholder:'10.1.0.0/24,10.1.1.0/24',description:'IP subnets or AD sites'}],scriptTemplate:p=>{const n=escapePowerShellString(p.name),s=escapePowerShellString(p.siteCode),b=p.boundaries?buildPowerShellArray(p.boundaries):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$BG=New-CMBoundaryGroup -Name "${n}" -DefaultSiteCode "${s}";Write-Host "✓ Boundary group created: ${n}" -ForegroundColor Green;$Boundaries=${b};foreach($Bound in $Boundaries){if($Bound -match '/'){$Type='IPSubnet'}else{$Type='ADSite'};$NewBound=New-CMBoundary -Name "Boundary-$Bound" -Type $Type -Value $Bound;Add-CMBoundaryToGroup -BoundaryGroupId $BG.GroupID -BoundaryId $NewBound.BoundaryID;Write-Host "  Added boundary: $Bound" -ForegroundColor Gray};Write-Host "✓ Configuration complete" -ForegroundColor Green}catch{Write-Error "Failed: $_"}`;}},
  {id:'site-status-monitor',name:'Site Status Health Monitor',category:'Site Configuration & Maintenance',description:'Check MECM site component status and generate health report',parameters:[{id:'siteCode',label:'Site Code',type:'text',required:true,placeholder:'PS1'},{id:'exportPath',label:'Export Path (optional)',type:'path',required:false,placeholder:'C:\\Reports\\SiteHealth.csv'}],scriptTemplate:p=>{const s=escapePowerShellString(p.siteCode),e=p.exportPath?escapePowerShellString(p.exportPath):'';return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Components=Get-CMComponentStatusMessage -SiteCode "${s}" -Severity Error,Warning -ViewingPeriod "24 hours";$Summary=$Components|Group-Object ComponentName|Select @{N='Component';E={$_.Name}},@{N='Errors';E={($_.Group|Where Severity -eq 'Error').Count}},@{N='Warnings';E={($_.Group|Where Severity -eq 'Warning').Count}};Write-Host "Site Health Summary (Last 24h):" -ForegroundColor Cyan;$Summary|Format-Table -AutoSize;${e?`$Summary|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Report: ${e}" -ForegroundColor Green`:''};$Overall=if(($Summary|Measure -Property Errors -Sum).Sum -eq 0){'Healthy'}else{'Issues Detected'};Write-Host "Overall Status: $Overall" -ForegroundColor $(if($Overall -eq 'Healthy'){'Green'}else{'Yellow'})}catch{Write-Error "Failed: $_"}`;}},
  {id:'clear-client-cache',name:'Clear Client Cache',category:'Client Management & Health',description:'Clear MECM client cache to free disk space',parameters:[{id:'devices',label:'Device Names (comma-separated)',type:'textarea',required:true,placeholder:'PC001,PC002'}],scriptTemplate:p=>{const d=p.devices?buildPowerShellArray(p.devices):'';return `$Devices=${d};foreach($Dev in $Devices){try{Invoke-Command -ComputerName $Dev -ScriptBlock{$UIResource=New-Object -ComObject UIResource.UIResourceMgr;$Cache=$UIResource.GetCacheInfo();$Cache.GetCacheElements()|ForEach{$Cache.DeleteCacheElement($_.CacheElementID)}};Write-Host "✓ $Dev: Cache cleared" -ForegroundColor Green}catch{Write-Host "✗ $Dev: Failed" -ForegroundColor Red}}`;}},
  {id:'export-hardware-inventory',name:'Export Hardware Inventory',category:'Inventory & Reporting',description:'Export hardware inventory for devices',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'All Workstations'},{id:'exportPath',label:'Export Path',type:'text',required:true,placeholder:'C:\\\\Reports\\\\HWInventory.csv'}],scriptTemplate:p=>{const c=escapePowerShellString(p.collectionName),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Devices=Get-CMDevice -CollectionName "${c}";$Results=$Devices|Select Name,Manufacturer,Model,TotalPhysicalMemory,OSVersion;$Results|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Exported: $($Results.Count) devices" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'create-dynamic-collection',name:'Create Dynamic Device Collection',category:'Collections',description:'Create query-based device collection',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'Windows 11 Devices'},{id:'queryExpression',label:'WQL Query',type:'textarea',required:true,placeholder:'SELECT * FROM SMS_R_System WHERE OperatingSystemNameAndVersion LIKE "%Windows 11%"'}],scriptTemplate:p=>{const n=escapePowerShellString(p.collectionName),q=escapePowerShellString(p.queryExpression);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Collection=New-CMDeviceCollection -Name "${n}" -LimitingCollectionName "All Systems";Add-CMDeviceCollectionQueryMembershipRule -CollectionName "${n}" -QueryExpression "${q}" -RuleName "Query-${n}";Write-Host "✓ Collection created: ${n}" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'deploy-os-image',name:'Deploy OS Task Sequence',category:'OS Deployment',description:'Deploy operating system to collection',parameters:[{id:'taskSequenceName',label:'Task Sequence Name',type:'text',required:true,placeholder:'Windows 11 23H2'},{id:'collectionName',label:'Target Collection',type:'text',required:true,placeholder:'Pilot-Workstations'}],scriptTemplate:p=>{const t=escapePowerShellString(p.taskSequenceName),c=escapePowerShellString(p.collectionName);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{New-CMTaskSequenceDeployment -TaskSequenceName "${t}" -CollectionName "${c}" -DeployPurpose Available -AllowSharedContent $true -AllowFallback $true -MakeAvailableTo ClientsMediaAndPxe;Write-Host "✓ OS deployment created" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'export-software-inventory',name:'Export Software Inventory',category:'Inventory & Reporting',description:'Export installed software for devices',parameters:[{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'All Workstations'},{id:'exportPath',label:'Export Path',type:'text',required:true,placeholder:'C:\\\\Reports\\\\SWInventory.csv'}],scriptTemplate:p=>{const c=escapePowerShellString(p.collectionName),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Query="SELECT SMS_R_System.Name,SMS_G_System_INSTALLED_SOFTWARE.ProductName,SMS_G_System_INSTALLED_SOFTWARE.ProductVersion FROM SMS_R_System JOIN SMS_G_System_INSTALLED_SOFTWARE ON SMS_R_System.ResourceId=SMS_G_System_INSTALLED_SOFTWARE.ResourceID";$Results=Get-WmiObject -Namespace "root\\\\SMS\\\\site_$SiteCode" -Query $Query;$Results|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Software inventory exported" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'distribute-content',name:'Distribute Content to DP Group',category:'Content Distribution',description:'Distribute packages to distribution point group',parameters:[{id:'packageName',label:'Package/Application Name',type:'text',required:true,placeholder:'Microsoft Office'},{id:'dpGroupName',label:'DP Group Name',type:'text',required:true,placeholder:'All Distribution Points'}],scriptTemplate:p=>{const pkg=escapePowerShellString(p.packageName),dp=escapePowerShellString(p.dpGroupName);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{Start-CMContentDistribution -ApplicationName "${pkg}" -DistributionPointGroupName "${dp}";Write-Host "✓ Content distribution started" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'monitor-dp-status',name:'Monitor Distribution Point Status',category:'Content Distribution',description:'Check distribution point health and content status',parameters:[{id:'exportPath',label:'Export Path',type:'text',required:true,placeholder:'C:\\\\Reports\\\\DPStatus.csv'}],scriptTemplate:p=>{const e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$DPs=Get-CMDistributionPoint;$Results=$DPs|Select ServerName,IsPeerDP,IsPullDP,IsActive;$Results|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ DP status exported: $($DPs.Count) DPs" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'export-compliance-settings',name:'Export Compliance Settings Report',category:'Compliance Settings',description:'Export compliance baseline results',parameters:[{id:'baselineName',label:'Baseline Name',type:'text',required:true,placeholder:'Security Baseline'},{id:'exportPath',label:'Export Path',type:'text',required:true,placeholder:'C:\\\\Reports\\\\Compliance.csv'}],scriptTemplate:p=>{const b=escapePowerShellString(p.baselineName),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Baseline=Get-CMBaseline -Name "${b}";$Results=Get-CMBaselineDeploymentStatus -Id $Baseline.CI_ID|Select DeviceName,ComplianceStatus,IsCompliant;$Results|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Compliance exported: $($Results.Count) devices" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'deploy-baseline',name:'Deploy Compliance Baseline',category:'Compliance Settings',description:'Deploy configuration baseline to collection',parameters:[{id:'baselineName',label:'Baseline Name',type:'text',required:true,placeholder:'Security Baseline'},{id:'collectionName',label:'Collection Name',type:'text',required:true,placeholder:'All Workstations'}],scriptTemplate:p=>{const b=escapePowerShellString(p.baselineName),c=escapePowerShellString(p.collectionName);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{New-CMBaselineDeployment -Name "${b}" -CollectionName "${c}" -GenerateAlert $true;Write-Host "✓ Baseline deployed to ${c}" -ForegroundColor Green}catch{Write-Error $_}`;}},
  {id:'export-app-deployment-status',name:'Export Application Deployment Status',category:'Applications & Deployments',description:'Export deployment success/failure statistics',parameters:[{id:'applicationName',label:'Application Name',type:'text',required:true,placeholder:'Microsoft 365'},{id:'exportPath',label:'Export Path',type:'text',required:true,placeholder:'C:\\\\Reports\\\\AppDeployment.csv'}],scriptTemplate:p=>{const a=escapePowerShellString(p.applicationName),e=escapePowerShellString(p.exportPath);return `Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1";$SiteCode=Get-PSDrive -PSProvider CMSite|Select -ExpandProperty Name;Set-Location "$SiteCode:";try{$Status=Get-CMApplicationDeploymentStatus -Name "${a}";$Results=$Status|Select DeviceName,UserName,StatusType,ErrorCode,LastStatusTime;$Results|Export-Csv "${e}" -NoTypeInformation;Write-Host "✓ Deployment status exported: $($Results.Count) devices" -ForegroundColor Green}catch{Write-Error $_}`;}}
];
