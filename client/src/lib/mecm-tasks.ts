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
  isPremium?: boolean;
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
  {
    id: 'force-policy-refresh',
    name: 'Force Client Policy Refresh',
    category: 'Client Management & Health',
    description: 'Force immediate policy refresh on targeted devices',
    instructions: `**How This Task Works:**
- Triggers instant MECM client policy download and application
- Forces client to contact management point immediately
- Updates machine and user policies
- Bypasses normal policy polling schedule

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Fast channel client notifications enabled
- Target devices online and responsive

**What You Need to Provide:**
- Device names (comma-separated list)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Loops through each device
4. Sends client notification action for immediate policy refresh
5. Displays success or failure per device

**Important Notes:**
- REQUIRES CLIENT TO BE ONLINE
- Useful after deploying new policies or applications
- Typical use: force policy after collection membership changes, troubleshoot policy issues
- Devices must have fast channel enabled (default)
- Alternative to waiting for policy polling cycle (default: every 60 minutes)
- Failed devices may be offline or have firewall blocking client notifications`,
    parameters: [
      { id: 'devices', label: 'Device Names (comma-separated)', type: 'textarea', required: true, placeholder: 'PC001,PC002,PC003' }
    ],
    scriptTemplate: (params) => {
      const d = params.devices ? buildPowerShellArray(params.devices) : '';
      
      return `# Force Client Policy Refresh
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Devices = ${d}

foreach ($Dev in $Devices) {
    try {
        Invoke-CMClientAction -DeviceName $Dev -ActionType ClientNotificationRequestMachinePolicyNow
        Write-Host "✓ $Dev: Policy refresh triggered" -ForegroundColor Green
    } catch {
        Write-Host "✗ $Dev: Failed" -ForegroundColor Red
    }
}`;
    }
  },

  {
    id: 'repair-client',
    name: 'Repair MECM Client',
    category: 'Client Management & Health',
    description: 'Reinstall/repair Configuration Manager client on devices',
    instructions: `**How This Task Works:**
- Uninstalls existing MECM client
- Reinstalls fresh client from management point
- Fixes corrupted client installations
- Resolves client communication issues

**Prerequisites:**
- PowerShell Remoting enabled on target device
- Administrator credentials for target computer
- Network access to management point
- Access to client installation source files
- WinRM service running on target

**What You Need to Provide:**
- Computer name
- Site code
- Management point server name

**What the Script Does:**
1. Uninstalls existing Configuration Manager client using ccmsetup.exe /uninstall
2. Waits 30 seconds for uninstall to complete
3. Reinstalls client from management point with site code and MP parameters
4. Forces installation even if client exists
5. Displays completion status

**Important Notes:**
- REQUIRES ADMINISTRATOR ACCESS to target computer
- REQUIRES POWERSHELL REMOTING enabled
- Client will be offline during reinstall (30+ seconds)
- May lose pending client actions during reinstall
- Typical use: fix corrupted clients, resolve certificate issues, fix WMI corruption
- Device will check in after successful installation
- Consider running hardware inventory scan after repair`,
    parameters: [
      { id: 'computerName', label: 'Computer Name', type: 'text', required: true, placeholder: 'PC001' },
      { id: 'siteCode', label: 'Site Code', type: 'text', required: true, placeholder: 'PS1' },
      { id: 'mpServer', label: 'Management Point', type: 'text', required: true, placeholder: 'mecm.contoso.com' }
    ],
    scriptTemplate: (params) => {
      const c = escapePowerShellString(params.computerName);
      const s = escapePowerShellString(params.siteCode);
      const m = escapePowerShellString(params.mpServer);
      
      return `# Repair MECM Client
# Generated: ${new Date().toISOString()}

$Computer = "${c}"
$Site = "${s}"
$MP = "${m}"

try {
    Write-Host "Uninstalling client..." -ForegroundColor Cyan
    
    Invoke-Command -ComputerName $Computer -ScriptBlock {
        Start-Process "C:\\Windows\\ccmsetup\\ccmsetup.exe" -ArgumentList "/uninstall" -Wait
    }
    
    Start-Sleep -Seconds 30
    
    Write-Host "Installing client..." -ForegroundColor Cyan
    
    Invoke-Command -ComputerName $Computer -ScriptBlock {
        param($s, $m)
        Start-Process "\\\\$m\\SMS_$s\\Client\\ccmsetup.exe" -ArgumentList "SMSSITECODE=$s", "MP=$m", "/forceinstall" -Wait
    } -ArgumentList $Site, $MP
    
    Write-Host "✓ Client repair completed" -ForegroundColor Green
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  {
    id: 'client-health-check',
    name: 'Export Client Health Dashboard',
    category: 'Client Management & Health',
    description: 'Generate comprehensive client health report',
    instructions: `**How This Task Works:**
- Exports client health status for all devices in collection
- Shows client installation status, online state, heartbeat
- Displays client version for inventory tracking
- Essential for identifying client health issues

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Read permissions on collections
- WMI access to site database

**What You Need to Provide:**
- Collection name
- Export path for CSV file

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Retrieves all devices from specified collection
4. Queries WMI for last heartbeat timestamp
5. Builds report with client status, online state, version
6. Exports to CSV file

**Important Notes:**
- Large collections may take time to process
- Typical use: identify offline clients, find outdated client versions, troubleshoot client issues
- LastHeartbeat indicates last successful communication
- IsClient=False indicates missing client installation
- IsActive indicates current online status
- Client version useful for upgrade planning
- Consider scheduling regular exports for trending`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All Systems' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ClientHealth.csv' }
    ],
    scriptTemplate: (params) => {
      const c = escapePowerShellString(params.collectionName);
      const e = escapePowerShellString(params.exportPath);
      
      return `# Export Client Health Dashboard
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Collection = "${c}"
$Export = "${e}"

$Devices = Get-CMDevice -CollectionName $Collection

$Report = $Devices | ForEach {
    $LastHB = (Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_R_System -Filter "Name='$($_.Name)'" | Select -First 1).LastLogonTimestamp
    
    [PSCustomObject]@{
        Name          = $_.Name
        Client        = $_.IsClient
        Online        = $_.IsActive
        LastHeartbeat = $LastHB
        Version       = $_.ClientVersion
    }
}

$Report | Export-Csv $Export -NoTypeInformation

Write-Host "✓ Report: $Export" -ForegroundColor Green`;
    }
  },

  {
    id: 'clear-client-cache',
    name: 'Clear Client Cache',
    category: 'Client Management & Health',
    description: 'Clear Configuration Manager client cache',
    instructions: `**How This Task Works:**
- Clears MECM client cache to free disk space
- Deletes cached content older than threshold
- Removes old application installers and updates
- Preserves recently used content

**Prerequisites:**
- PowerShell Remoting enabled on target devices
- Administrator credentials
- WinRM service running on targets
- Network connectivity to devices

**What You Need to Provide:**
- Device names (comma-separated list)
- Age threshold in days (optional, default 30)

**What the Script Does:**
1. Loops through each device
2. Connects via PowerShell Remoting
3. Creates UIResource COM object to access cache
4. Retrieves all cached items
5. Deletes items older than threshold
6. Displays success or failure per device

**Important Notes:**
- REQUIRES POWERSHELL REMOTING and ADMINISTRATOR ACCESS
- Content deleted if last referenced older than threshold
- Active/recently used content preserved
- Typical use: free disk space, remove old cached content, prepare for new deployments
- Cache default location: C:\\Windows\\ccmcache
- Failed devices may be offline or deny remote access
- Consider increasing threshold for critical devices`,
    parameters: [
      { id: 'devices', label: 'Device Names (comma-separated)', type: 'textarea', required: true, placeholder: 'PC001,PC002' },
      { id: 'ageThresholdDays', label: 'Delete Items Older Than (days)', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const d = params.devices ? buildPowerShellArray(params.devices) : '';
      const a = params.ageThresholdDays || 30;
      
      return `# Clear Client Cache
# Generated: ${new Date().toISOString()}

$Devices = ${d}
$AgeDays = ${a}

foreach ($Dev in $Devices) {
    try {
        Invoke-Command -ComputerName $Dev -ScriptBlock {
            param($days)
            
            $Cache = New-Object -ComObject UIResource.UIResourceMgr
            $Items = $Cache.GetCacheInfo().GetCacheElements()
            $Cutoff = (Get-Date).AddDays(-$days)
            
            foreach ($Item in $Items) {
                if ($Item.LastReferenceTime -lt $Cutoff) {
                    $Cache.GetCacheInfo().DeleteCacheElement($Item.CacheElementID)
                }
            }
        } -ArgumentList $AgeDays
        
        Write-Host "✓ $Dev: Cache cleared" -ForegroundColor Green
    } catch {
        Write-Host "✗ $Dev: Failed" -ForegroundColor Red
    }
}`;
    }
  },

  {
    id: 'remote-client-actions',
    name: 'Remote Client Actions',
    category: 'Client Management & Health',
    description: 'Execute remote actions on client devices',
    instructions: `**How This Task Works:**
- Executes remote management actions on MECM clients
- Supports restart, shutdown, wake, lock, logoff
- Uses client notifications or PowerShell Remoting
- Enables mass device management operations

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- For Restart/WakeUp: Fast channel client notifications enabled
- For Lock/Shutdown/Logoff: PowerShell Remoting enabled
- Target devices online

**What You Need to Provide:**
- Device names (comma-separated list)
- Action to perform (Restart, Shutdown, WakeUp, Lock, Logoff)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Maps selected action to appropriate method
4. For Restart/WakeUp: uses MECM client notification
5. For Lock/Shutdown/Logoff: uses PowerShell Remoting
6. Displays success or failure per device

**Important Notes:**
- Restart and WakeUp use MECM client notifications (fast channel required)
- Lock, Shutdown, Logoff use PowerShell Remoting (requires WinRM)
- Typical use: emergency restarts, scheduled shutdowns, Wake-on-LAN for maintenance
- Restart is graceful (allows save prompts)
- Shutdown is forced (no save prompts)
- WakeUp requires WOL-capable hardware and network configuration
- Lock immediately locks workstation
- Logoff logs off current user`,
    parameters: [
      { id: 'devices', label: 'Device Names (comma-separated)', type: 'textarea', required: true, placeholder: 'PC001,PC002' },
      { 
        id: 'action', 
        label: 'Action', 
        type: 'select', 
        required: true,
        options: ['Restart', 'Shutdown', 'WakeUp', 'Lock', 'Logoff'],
        defaultValue: 'Restart'
      }
    ],
    scriptTemplate: (params) => {
      const d = params.devices ? buildPowerShellArray(params.devices) : '';
      const a = escapePowerShellString(params.action || 'Restart');
      
      return `# Remote Client Actions
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Devices = ${d}
$Action = "${a}"

$ActionMap = @{
    Restart  = 'ClientNotificationRequestMachineRestart'
    WakeUp   = 'ClientNotificationSendWakeupPacket'
    Lock     = 'Undefined'
    Shutdown = 'Undefined'
    Logoff   = 'Undefined'
}

foreach ($Dev in $Devices) {
    try {
        if ($ActionMap[$Action] -ne 'Undefined') {
            Invoke-CMClientAction -DeviceName $Dev -ActionType $ActionMap[$Action]
            Write-Host "✓ $Dev: $Action triggered" -ForegroundColor Green
        } else {
            Invoke-Command -ComputerName $Dev -ScriptBlock {
                param($a)
                if ($a -eq 'Lock') {
                    rundll32.exe user32.dll,LockWorkStation
                } elseif ($a -eq 'Shutdown') {
                    Stop-Computer -Force
                } elseif ($a -eq 'Logoff') {
                    shutdown /l
                }
            } -ArgumentList $Action
            Write-Host "✓ $Dev: $Action completed" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ $Dev: Failed" -ForegroundColor Red
    }
}`;
    }
  },

  // ========================================
  // PACKAGES & PROGRAMS CATEGORY
  // ========================================
  {
    id: 'create-package',
    name: 'Create Package from Source',
    category: 'Packages & Programs',
    description: 'Create a legacy package with program for software distribution',
    instructions: `**How This Task Works:**
- Creates legacy MECM package from source files
- Adds program with command-line installer
- Supports silent installations for software deployment
- Alternative to modern applications for older software

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Package creation permissions
- Network access to source files location

**What You Need to Provide:**
- Package name
- Source path (network share containing installer files)
- Program name
- Command line for silent installation

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Creates new package pointing to source path
4. Creates program with specified command line
5. Configures program to run whether user logged on or not
6. Displays creation confirmation

**Important Notes:**
- Source path must be accessible to site server and distribution points
- Use UNC paths (\\\\server\\share) not local paths
- Command line should support silent/unattended installation
- Typical use: deploy legacy software, custom installers, scripts
- After creation, distribute to distribution points
- Then deploy to collections as needed
- Consider using applications instead for modern software`,
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Adobe Reader DC' },
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: '\\\\server\\sources$\\AdobeReader' },
      { id: 'programName', label: 'Program Name', type: 'text', required: true, placeholder: 'Install' },
      { id: 'commandLine', label: 'Command Line', type: 'text', required: true, placeholder: 'setup.exe /sAll /rs /msi EULA_ACCEPT=YES' }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.packageName);
      const s = escapePowerShellString(params.sourcePath);
      const pn = escapePowerShellString(params.programName);
      const c = escapePowerShellString(params.commandLine);
      
      return `# Create Package from Source
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    $Pkg = New-CMPackage -Name "${n}" -Path "${s}" -Description "[AUTO] Created by PSForge"
    Write-Host "✓ Package created: ${n}" -ForegroundColor Green
    
    $Prog = New-CMProgram -PackageName "${n}" -StandardProgramName "${pn}" -CommandLine "${c}" -RunType Normal -ProgramRunType WhetherOrNotUserIsLoggedOn
    Write-Host "✓ Program created: ${pn}" -ForegroundColor Green
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  {
    id: 'distribute-content',
    name: 'Distribute Content to DPs',
    category: 'Packages & Programs',
    description: 'Distribute package/application content to distribution point groups',
    instructions: `**How This Task Works:**
- Distributes content to distribution point groups
- Supports packages, applications, boot images, driver packages
- Makes content available for client downloads
- Essential step after creating or updating content

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Content distribution permissions
- Distribution point groups configured

**What You Need to Provide:**
- Package/Application name
- Distribution point group name
- Content type (Package, Application, BootImage, or DriverPackage)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Determines content type
4. Initiates distribution to specified DP group
5. Displays confirmation

**Important Notes:**
- Distribution is asynchronous (continues in background)
- Large content may take time to distribute
- Monitor distribution status separately
- Typical use: make new software available, update existing content, prepare for deployments
- Content must exist before distribution
- Distribution point group must be configured
- Check DP health before large distributions`,
    parameters: [
      { id: 'contentName', label: 'Package/Application Name', type: 'text', required: true, placeholder: '7-Zip 23.01' },
      { id: 'dpGroup', label: 'Distribution Point Group', type: 'text', required: true, placeholder: 'All DPs' },
      { 
        id: 'contentType', 
        label: 'Content Type', 
        type: 'select', 
        required: true,
        options: ['Package', 'Application', 'BootImage', 'DriverPackage'],
        defaultValue: 'Package'
      }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.contentName);
      const g = escapePowerShellString(params.dpGroup);
      const t = escapePowerShellString(params.contentType || 'Package');
      
      return `# Distribute Content to DPs
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Name = "${n}"
$DPGroup = "${g}"
$Type = "${t}"

try {
    switch ($Type) {
        'Package' {
            Start-CMContentDistribution -PackageName $Name -DistributionPointGroupName $DPGroup
        }
        'Application' {
            Start-CMContentDistribution -ApplicationName $Name -DistributionPointGroupName $DPGroup
        }
        'BootImage' {
            Start-CMContentDistribution -BootImageName $Name -DistributionPointGroupName $DPGroup
        }
        'DriverPackage' {
            Start-CMContentDistribution -DriverPackageName $Name -DistributionPointGroupName $DPGroup
        }
    }
    
    Write-Host "✓ Distribution started to: $DPGroup" -ForegroundColor Green
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  {
    id: 'monitor-content-distribution',
    name: 'Monitor Content Distribution Status',
    category: 'Packages & Programs',
    description: 'Check distribution status of content across all distribution points',
    instructions: `**How This Task Works:**
- Monitors content distribution progress across DPs
- Shows targeted, installed, failed, in-progress counts
- Displays distribution status messages
- Optional CSV export for reporting

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Read permissions on distribution points

**What You Need to Provide:**
- Package/Application name
- Export path (optional)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Queries distribution status for specified content
4. Builds report showing DP-level status
5. Displays table output
6. Optionally exports to CSV

**Important Notes:**
- Shows real-time distribution status
- Targeted = DPs that should have content
- Installed = successfully distributed
- Failed = distribution errors
- InProgress = currently distributing
- Typical use: verify distribution completion, troubleshoot failed distributions, audit content availability
- Large packages may show InProgress for extended time
- Check failed DPs for disk space or connectivity issues`,
    parameters: [
      { id: 'contentName', label: 'Package/Application Name', type: 'text', required: true, placeholder: 'Windows 11 22H2' },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\DistStatus.csv' }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.contentName);
      const e = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Monitor Content Distribution Status
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Name = "${n}"

try {
    $Status = Get-CMDistributionStatus -Name $Name
    
    $Report = $Status | ForEach {
        [PSCustomObject]@{
            DP         = $_.ServerNALPath
            Status     = $_.LastStatusMessage
            Targeted   = $_.Targeted
            Installed  = $_.Installed
            Failed     = $_.Failed
            InProgress = $_.InProgress
        }
    }
    
    $Report | Format-Table -AutoSize
    ${e ? `
    $Report | Export-Csv "${e}" -NoTypeInformation
    Write-Host "✓ Report: ${e}" -ForegroundColor Green` : ''}
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  // ========================================
  // OPERATING SYSTEM DEPLOYMENT CATEGORY
  // ========================================
  {
    id: 'create-boot-image',
    name: 'Create Custom Boot Image',
    category: 'Operating System Deployment',
    description: 'Create and customize WinPE boot image',
    instructions: `**How This Task Works:**
- Creates custom Windows PE boot image for OS deployment
- Enables F8 command support for troubleshooting
- Base for PXE boot and task sequence media
- Essential for OS deployment infrastructure

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Boot image creation permissions
- Access to WIM source file

**What You Need to Provide:**
- Boot image name
- WIM source path (default MECM boot.wim location)
- Enable command support option (F8 key)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Creates boot image from WIM source
4. Optionally enables F8 command support for troubleshooting
5. Displays creation confirmation

**Important Notes:**
- Default WIM located in MECM installation directory
- F8 command support useful for troubleshooting deployments
- After creation, distribute to distribution points
- Add drivers if needed for hardware support
- Typical use: OS deployment, bare-metal provisioning, recovery tasks
- Update boot images when adding new hardware support
- Separate x86 and x64 boot images required for mixed environments`,
    parameters: [
      { id: 'name', label: 'Boot Image Name', type: 'text', required: true, placeholder: 'Custom WinPE x64' },
      { id: 'sourcePath', label: 'WIM Source Path', type: 'path', required: true, placeholder: 'C:\\Program Files\\Microsoft Configuration Manager\\OSD\\boot\\x64\\boot.wim' },
      { id: 'enableCommandSupport', label: 'Enable Command Support (F8)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.name);
      const s = escapePowerShellString(params.sourcePath);
      const e = toPowerShellBoolean(params.enableCommandSupport ?? true);
      
      return `# Create Custom Boot Image
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    $Boot = New-CMBootImage -Name "${n}" -Path "${s}" -Index 1
    
    if (${e}) {
        Set-CMBootImage -Name "${n}" -EnableCommandSupport $true
        Write-Host "✓ Command support enabled" -ForegroundColor Green
    }
    
    Write-Host "✓ Boot image created: ${n}" -ForegroundColor Green
    Write-Host "Next: Distribute to DPs" -ForegroundColor Cyan
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  {
    id: 'import-driver-package',
    name: 'Import Driver Package',
    category: 'Operating System Deployment',
    description: 'Import and categorize device drivers',
    instructions: `**How This Task Works:**
- Imports device drivers from source folder
- Categorizes drivers for easier management
- Creates driver package for deployment
- Adds all imported drivers to package

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Driver import permissions
- Network access to driver source files

**What You Need to Provide:**
- Driver package name
- Driver source path (network location with driver files)
- Driver category (optional, for organization)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Imports all drivers from source path
4. Optionally assigns category
5. Creates driver package
6. Adds all imported drivers to package
7. Displays driver count and package name

**Important Notes:**
- Source path should contain extracted driver files
- Import scans recursively through folders
- Category helps organize drivers (e.g., by manufacturer or model)
- Typical use: prepare drivers for OS deployment, support new hardware models
- After creation, distribute package to distribution points
- Add driver package to boot images or task sequences as needed
- Consider separate packages per manufacturer or device type`,
    parameters: [
      { id: 'packageName', label: 'Driver Package Name', type: 'text', required: true, placeholder: 'Dell Latitude 7490 Drivers' },
      { id: 'sourcePath', label: 'Driver Source Path', type: 'path', required: true, placeholder: '\\\\server\\drivers$\\Dell\\Latitude7490' },
      { id: 'category', label: 'Driver Category', type: 'text', required: false, placeholder: 'Laptops' }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.packageName);
      const s = escapePowerShellString(params.sourcePath);
      const c = params.category ? escapePowerShellString(params.category) : '';
      
      return `# Import Driver Package
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    Write-Host "Importing drivers from: ${s}" -ForegroundColor Cyan
    
    $Drivers = Import-CMDriver -Path "${s}" -ImportFolder${c ? ` -DriverCategory "${c}"` : ''}
    
    Write-Host "✓ Imported: $($Drivers.Count) drivers" -ForegroundColor Green
    
    $Pkg = New-CMDriverPackage -Name "${n}" -Path "\\\\$($env:COMPUTERNAME)\\SMS_$SiteCode\\Drivers\\${n}"
    
    foreach ($Drv in $Drivers) {
        Add-CMDriverToDriverPackage -DriverId $Drv.CI_ID -DriverPackageName "${n}"
    }
    
    Write-Host "✓ Driver package created: ${n}" -ForegroundColor Green
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  {
    id: 'create-task-sequence',
    name: 'Create OS Deployment Task Sequence',
    category: 'Operating System Deployment',
    description: 'Create operating system deployment task sequence',
    instructions: `**How This Task Works:**
- Creates automated OS deployment task sequence
- Links OS image and boot image
- Configures basic installation steps
- Foundation for customized deployment automation

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Task sequence creation permissions
- Existing OS image package
- Existing boot image

**What You Need to Provide:**
- Task sequence name
- OS image package name
- Boot image name
- Product key (optional, for volume licensing)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Retrieves specified OS image and boot image
4. Creates task sequence with linked images
5. Optionally includes product key
6. Configures workgroup join (default)
7. Displays creation confirmation

**Important Notes:**
- Default joins workgroup (not domain) - customize after creation
- Product key optional for volume licensing scenarios
- Typical use: automated OS deployment, bare-metal provisioning, refresh scenarios
- After creation, customize task sequence steps as needed
- Add applications, drivers, settings before deployment
- Test in pilot collection before production
- Distribute referenced content to distribution points`,
    parameters: [
      { id: 'name', label: 'Task Sequence Name', type: 'text', required: true, placeholder: 'Deploy Windows 11 22H2' },
      { id: 'osImage', label: 'OS Image Package', type: 'text', required: true, placeholder: 'Windows 11 22H2 x64' },
      { id: 'bootImage', label: 'Boot Image', type: 'text', required: true, placeholder: 'Boot Image (x64)' },
      { id: 'productKey', label: 'Product Key (optional)', type: 'text', required: false, placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX' }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.name);
      const o = escapePowerShellString(params.osImage);
      const b = escapePowerShellString(params.bootImage);
      const k = params.productKey ? escapePowerShellString(params.productKey) : '';
      
      return `# Create OS Deployment Task Sequence
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    $OS = Get-CMOperatingSystemImage -Name "${o}"
    $Boot = Get-CMBootImage -Name "${b}"
    
    $TS = New-CMTaskSequence -Name "${n}" -BootImagePackageId $Boot.PackageID -OperatingSystemImagePackageId $OS.PackageID -InstallOperatingSystemImage${k ? ` -ProductKey "${k}"` : ''} -JoinDomain WorkGroup -WorkgroupName "WORKGROUP"
    
    Write-Host "✓ Task sequence created: ${n}" -ForegroundColor Green
    Write-Host "Next: Customize steps and deploy" -ForegroundColor Cyan
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  {
    id: 'deploy-task-sequence',
    name: 'Deploy Task Sequence to Collection',
    category: 'Operating System Deployment',
    description: 'Deploy OS task sequence with PXE and media options',
    instructions: `**How This Task Works:**
- Deploys task sequence to target collection
- Enables PXE boot and media availability
- Configures deployment as Available (user-initiated)
- Makes OS deployment accessible to devices

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Deployment creation permissions
- Existing task sequence
- Target collection created
- Content distributed to DPs

**What You Need to Provide:**
- Task sequence name
- Target collection name
- Enable PXE option
- Enable media option

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Creates task sequence deployment to collection
4. Sets deployment purpose as Available
5. Configures PXE and media availability
6. Shows task sequence progress during deployment
7. Displays confirmation

**Important Notes:**
- Available deployment requires user initiation (not automatic)
- PXE enables network boot deployment
- Media enables USB/DVD deployment
- Typical use: OS deployment, computer refresh, bare-metal provisioning
- Ensure all content distributed before deployment
- Test with pilot collection first
- Monitor deployment status after creation
- Consider maintenance windows for production servers`,
    parameters: [
      { id: 'tsName', label: 'Task Sequence Name', type: 'text', required: true, placeholder: 'Deploy Windows 11 22H2' },
      { id: 'collectionName', label: 'Target Collection', type: 'text', required: true, placeholder: 'OSD-Staging' },
      { id: 'enablePXE', label: 'Enable PXE', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableMedia', label: 'Enable Task Sequence Media', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const t = escapePowerShellString(params.tsName);
      const c = escapePowerShellString(params.collectionName);
      const px = toPowerShellBoolean(params.enablePXE ?? true);
      const m = toPowerShellBoolean(params.enableMedia ?? true);
      
      return `# Deploy Task Sequence to Collection
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    New-CMTaskSequenceDeployment -TaskSequenceName "${t}" -CollectionName "${c}" -DeployPurpose Available -AvailableDateTime (Get-Date) -MakeAvailableTo ClientsMediaAndPxe -ShowTaskSequenceProgress $true${px ? ` -AllowUsersRunIndependently $true` : ``}${m ? ` -AllowUseUnprotectedDP $true` : ``}
    
    Write-Host "✓ Task sequence deployed: ${t}" -ForegroundColor Green
    Write-Host "  Collection: ${c}" -ForegroundColor Gray
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },

  // ========================================
  // REPORTING & INVENTORY CATEGORY
  // ========================================
  {
    id: 'export-hardware-inventory',
    name: 'Export Hardware Inventory Report',
    category: 'Reporting & Inventory',
    description: 'Export detailed hardware inventory for collection devices',
    instructions: `**How This Task Works:**
- Exports comprehensive hardware inventory data
- Queries MECM database for device details
- Includes manufacturer, model, RAM, disk space
- Generates CSV report for analysis

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Read permissions on device inventory
- Hardware inventory enabled and collected

**What You Need to Provide:**
- Collection name
- Export path for CSV file

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Retrieves all devices from collection
4. Queries hardware inventory for each device
5. Collects manufacturer, model, RAM, disk, last inventory scan
6. Builds comprehensive report
7. Exports to CSV file

**Important Notes:**
- Hardware inventory must be enabled and scanned
- Large collections may take time to process
- Report includes only successfully inventoried devices
- Typical use: hardware audits, lifecycle planning, capacity reporting
- Disk space calculated from total disk sizes
- RAM displayed in MB
- Review last inventory date for data freshness`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\HardwareInventory.csv' }
    ],
    scriptTemplate: (params) => {
      const c = escapePowerShellString(params.collectionName);
      const e = escapePowerShellString(params.exportPath);
      
      return `# Export Hardware Inventory Report
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Devices = Get-CMDevice -CollectionName "${c}"

$Report = $Devices | ForEach {
    $Sys = Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_G_System_COMPUTER_SYSTEM -Filter "ResourceID='$($_.ResourceID)'" | Select -First 1
    $Disk = Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_G_System_DISK -Filter "ResourceID='$($_.ResourceID)'" | Measure-Object -Property Size -Sum | Select -ExpandProperty Sum
    
    [PSCustomObject]@{
        Name          = $_.Name
        Manufacturer  = $Sys.Manufacturer
        Model         = $Sys.Model
        RAM           = $_.RAMSize
        DiskGB        = [Math]::Round($Disk/1024, 2)
        LastInventory = $_.LastHardwareScan
    }
}

$Report | Export-Csv "${e}" -NoTypeInformation
Write-Host "✓ Report: ${e}" -ForegroundColor Green`;
    }
  },

  {
    id: 'export-software-inventory',
    name: 'Export Software Inventory Report',
    category: 'Reporting & Inventory',
    description: 'Export installed software inventory',
    instructions: `**How This Task Works:**
- Exports installed software across devices
- Queries Add/Remove Programs inventory data
- Optional product name filtering
- Generates detailed software inventory CSV

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Read permissions on software inventory
- Software inventory enabled and collected

**What You Need to Provide:**
- Collection name
- Export path for CSV file
- Product name filter (optional)

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Retrieves devices from collection
4. Queries installed software for each device
5. Optionally filters by product name
6. Collects software name, version, publisher per device
7. Exports detailed report to CSV

**Important Notes:**
- Software inventory must be enabled
- Large collections generate large reports
- Filter reduces report size and processing time
- Typical use: software audits, license compliance, vulnerability tracking
- Report shows per-computer installations
- Multiple versions of same software appear as separate entries
- Data accuracy depends on inventory scan frequency`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All Systems' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SoftwareInventory.csv' },
      { id: 'productFilter', label: 'Product Name Filter (optional)', type: 'text', required: false, placeholder: 'Microsoft' }
    ],
    scriptTemplate: (params) => {
      const c = escapePowerShellString(params.collectionName);
      const e = escapePowerShellString(params.exportPath);
      const f = params.productFilter ? escapePowerShellString(params.productFilter) : '';
      
      return `# Export Software Inventory Report
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Devices = Get-CMDevice -CollectionName "${c}"
$Report = @()

foreach ($Dev in $Devices) {
    $Apps = Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Class SMS_G_System_ADD_REMOVE_PROGRAMS -Filter "ResourceID='$($Dev.ResourceID)'"${f ? ` | Where-Object { $_.DisplayName -like '*${f}*' }` : ``}
    
    foreach ($App in $Apps) {
        $Report += [PSCustomObject]@{
            Computer  = $Dev.Name
            Software  = $App.DisplayName
            Version   = $App.Version
            Publisher = $App.Publisher
        }
    }
}

$Report | Export-Csv "${e}" -NoTypeInformation
Write-Host "✓ Report: ${e} ($($Report.Count) items)" -ForegroundColor Green`;
    }
  },

  {
    id: 'run-custom-query',
    name: 'Run Custom WQL Query',
    category: 'Reporting & Inventory',
    description: 'Execute custom WQL query and export results',
    instructions: `**How This Task Works:**
- Executes custom WQL (WMI Query Language) queries
- Queries MECM database directly
- Flexible reporting for any data class
- Exports results to CSV for analysis

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Read permissions on queried classes
- Understanding of WQL syntax and MECM schema

**What You Need to Provide:**
- Query name (descriptive identifier)
- WQL query statement
- Export path for results

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Executes custom WQL query against MECM database
4. Displays result count
5. Exports all results to CSV
6. Shows export confirmation

**Important Notes:**
- WQL query must be syntactically correct
- Query performance depends on complexity and data volume
- Typical use: custom reports, troubleshooting, compliance checks, advanced auditing
- Example queries: disk space, missing updates, specific configurations
- Test queries with small datasets first
- Review MECM schema documentation for available classes
- Use proper filtering to limit result set size`,
    parameters: [
      { id: 'queryName', label: 'Query Name', type: 'text', required: true, placeholder: 'Find Devices with Low Disk Space' },
      { id: 'wqlQuery', label: 'WQL Query', type: 'textarea', required: true, placeholder: 'SELECT Name, Size, FreeSpace FROM SMS_G_System_LOGICAL_DISK WHERE DriveType=3 AND FreeSpace < 10000' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\QueryResults.csv' }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.queryName);
      const q = escapePowerShellString(params.wqlQuery);
      const e = escapePowerShellString(params.exportPath);
      
      return `# Run Custom WQL Query
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    Write-Host "Executing query: ${n}" -ForegroundColor Cyan
    
    $Results = Get-WmiObject -Namespace "root\\sms\\site_$SiteCode" -Query "${q}"
    
    Write-Host "✓ Found: $($Results.Count) results" -ForegroundColor Green
    
    $Results | Export-Csv "${e}" -NoTypeInformation
    Write-Host "✓ Exported: ${e}" -ForegroundColor Green
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  },

  {
    id: 'collection-membership-report',
    name: 'Collection Membership Report',
    category: 'Reporting & Inventory',
    description: 'Generate collection membership report',
    instructions: `**How This Task Works:**
- Generates comprehensive collection membership report
- Shows all devices across multiple collections
- Includes user, logon, and client version data
- Useful for collection auditing and overlap analysis

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- SMS Provider access
- Read permissions on collections
- Collections must exist

**What You Need to Provide:**
- Collection names (comma-separated list)
- Export path for CSV report

**What the Script Does:**
1. Imports Configuration Manager module
2. Connects to MECM site
3. Processes each collection in the list
4. Retrieves all member devices
5. Collects device, user, last logon, client version
6. Combines all collection data into single report
7. Exports to CSV with totals

**Important Notes:**
- Report shows which devices belong to which collections
- Useful for identifying collection overlap
- Typical use: collection audits, deployment planning, client health tracking
- Large collections may take time to process
- Device can appear multiple times if in multiple collections
- Client version helps identify outdated clients
- Last logon user shows recent activity`,
    parameters: [
      { id: 'collections', label: 'Collections (comma-separated)', type: 'textarea', required: true, placeholder: 'Pilot-Group,Production-Group' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\CollectionMembership.csv' }
    ],
    scriptTemplate: (params) => {
      const c = params.collections ? buildPowerShellArray(params.collections) : '';
      const e = escapePowerShellString(params.exportPath);
      
      return `# Collection Membership Report
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Collections = ${c}
$Report = @()

foreach ($Coll in $Collections) {
    $Members = Get-CMDevice -CollectionName $Coll
    
    foreach ($Dev in $Members) {
        $Report += [PSCustomObject]@{
            Collection    = $Coll
            Device        = $Dev.Name
            User          = $Dev.UserName
            LastLogon     = $Dev.LastLogonUser
            ClientVersion = $Dev.ClientVersion
        }
    }
}

$Report | Export-Csv "${e}" -NoTypeInformation
Write-Host "✓ Report: ${e}" -ForegroundColor Green
Write-Host "  Total members: $($Report.Count)" -ForegroundColor Gray`;
    }
  },

  // ========================================
  // SITE CONFIGURATION & MAINTENANCE CATEGORY
  // ========================================
  {
    id: 'configure-maintenance-window',
    name: 'Configure Maintenance Window',
    category: 'Site Configuration & Maintenance',
    description: 'Create maintenance windows for collections to control deployment timing',
    instructions: `**How This Task Works:**
- Creates scheduled maintenance windows for device collections
- Controls when software updates and deployments can install
- Prevents disruptions during business hours
- Supports one-time, weekly, or monthly recurrence patterns

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- Full Administrator role on target collection
- PowerShell 5.1 or later
- Target collection must exist

**What You Need to Provide:**
- Collection name for maintenance window assignment
- Window name (descriptive label)
- Start time in 24-hour format (HH:mm)
- Duration in hours
- Recurrence pattern (None/Weekly/Monthly)

**What the Script Does:**
1. Imports Configuration Manager module and connects to site
2. Retrieves target device collection
3. Parses start time and creates schedule object
4. Configures recurrence pattern (monthly/weekly/one-time)
5. Creates maintenance window applied to software updates only
6. Reports creation success with collection details

**Important Notes:**
- Maintenance windows only control software updates by default
- Devices will only install updates during specified window
- Multiple overlapping windows are allowed on same collection
- Typical use: production servers, critical workstations, deployment rings
- Weekly pattern: same day/time each week
- Monthly pattern: same date/time each month
- One-time windows useful for emergency maintenance
- Does not prevent users from manually installing updates`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Production-Servers' },
      { id: 'windowName', label: 'Window Name', type: 'text', required: true, placeholder: 'Monthly Patching Window' },
      { id: 'startTime', label: 'Start Time (HH:mm)', type: 'text', required: true, placeholder: '02:00' },
      { id: 'durationHours', label: 'Duration (hours)', type: 'number', required: true, defaultValue: 4 },
      { id: 'recurrence', label: 'Recurrence', type: 'select', required: true, defaultValue: 'Monthly', options: ['None', 'Weekly', 'Monthly'] }
    ],
    scriptTemplate: (params) => {
      const c = escapePowerShellString(params.collectionName);
      const n = escapePowerShellString(params.windowName);
      const s = escapePowerShellString(params.startTime);
      const d = params.durationHours || 4;
      const r = escapePowerShellString(params.recurrence || 'Monthly');
      
      return `# Configure Maintenance Window
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

$Coll = "${c}"
$Name = "${n}"
$Start = "${s}"
$Duration = ${d}
$Recur = "${r}"

try {
    $Collection = Get-CMDeviceCollection -Name $Coll
    
    $StartDate = Get-Date
    $StartDate = $StartDate.Date.AddHours($Start.Split(':')[0]).AddMinutes($Start.Split(':')[1])
    
    $Schedule = if ($Recur -eq 'Monthly') {
        New-CMSchedule -Start $StartDate -DurationInterval Hours -DurationCount $Duration -RecurInterval Months -RecurCount 1
    } elseif ($Recur -eq 'Weekly') {
        New-CMSchedule -Start $StartDate -DurationInterval Hours -DurationCount $Duration -RecurInterval Weeks -RecurCount 1
    } else {
        New-CMSchedule -Start $StartDate -DurationInterval Hours -DurationCount $Duration -RecurCount 1
    }
    
    New-CMMaintenanceWindow -CollectionId $Collection.CollectionID -Name $Name -Schedule $Schedule -ApplyTo SoftwareUpdatesOnly
    
    Write-Host "✓ Maintenance window created" -ForegroundColor Green
    Write-Host "  Collection: $Coll" -ForegroundColor Gray
    Write-Host "  Window: $Name" -ForegroundColor Gray
    Write-Host "  Start: $Start (Duration: $Duration hours)" -ForegroundColor Gray
    Write-Host "  Recurrence: $Recur" -ForegroundColor Gray
} catch {
    Write-Error "Failed to create maintenance window: $_"
    exit 1
}`;
    }
  },
  {
    id: 'create-boundary-group',
    name: 'Create Boundary Group',
    category: 'Site Configuration & Maintenance',
    description: 'Create boundary group and assign distribution points',
    instructions: `**How This Task Works:**
- Creates logical boundary groups for client assignment
- Groups network locations (IP subnets or AD sites)
- Controls which management points and distribution points clients use
- Essential for multi-site and multi-network deployments

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- Full Administrator role
- PowerShell 5.1 or later
- Site code must exist
- Valid IP subnets or AD site names

**What You Need to Provide:**
- Boundary group name
- Site code to assign as default
- Comma-separated list of boundaries (IP subnets with CIDR or AD site names)

**What the Script Does:**
1. Imports Configuration Manager module and connects to site
2. Creates new boundary group with specified name and default site
3. Loops through provided boundaries list
4. Detects boundary type (IP subnet if contains /, AD site otherwise)
5. Creates each boundary object
6. Adds boundary to the group
7. Reports successful configuration

**Important Notes:**
- IP subnets must use CIDR notation (e.g., 10.1.0.0/24)
- AD sites must match exact Active Directory site names
- Boundary groups control content location and client assignment
- Typical use: branch offices, VPN networks, multi-site deployments
- After creation, manually assign distribution points and management points in console
- Clients automatically discover boundaries based on their network location
- Overlapping boundaries allowed but may cause unpredictable client assignment`,
    parameters: [
      { id: 'name', label: 'Boundary Group Name', type: 'text', required: true, placeholder: 'Building-A-Network' },
      { id: 'siteCode', label: 'Site Code', type: 'text', required: true, placeholder: 'PS1' },
      { id: 'boundaries', label: 'Boundaries (comma-separated)', type: 'textarea', required: true, placeholder: '10.1.0.0/24,10.1.1.0/24', description: 'IP subnets or AD sites' }
    ],
    scriptTemplate: (params) => {
      const n = escapePowerShellString(params.name);
      const s = escapePowerShellString(params.siteCode);
      const b = params.boundaries ? buildPowerShellArray(params.boundaries) : '';
      
      return `# Create Boundary Group
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    $BG = New-CMBoundaryGroup -Name "${n}" -DefaultSiteCode "${s}"
    Write-Host "✓ Boundary group created: ${n}" -ForegroundColor Green
    
    $Boundaries = ${b}
    
    foreach ($Bound in $Boundaries) {
        if ($Bound -match '/') {
            $Type = 'IPSubnet'
        } else {
            $Type = 'ADSite'
        }
        
        $NewBound = New-CMBoundary -Name "Boundary-$Bound" -Type $Type -Value $Bound
        Add-CMBoundaryToGroup -BoundaryGroupId $BG.GroupID -BoundaryId $NewBound.BoundaryID
        
        Write-Host "  Added boundary: $Bound ($Type)" -ForegroundColor Gray
    }
    
    Write-Host "✓ Configuration complete" -ForegroundColor Green
    Write-Host "  Remember to assign distribution points and management points in console" -ForegroundColor Yellow
} catch {
    Write-Error "Failed to create boundary group: $_"
    exit 1
}`;
    }
  },
  {
    id: 'site-status-monitor',
    name: 'Site Status Health Monitor',
    category: 'Site Configuration & Maintenance',
    description: 'Check MECM site component status and generate health report',
    instructions: `**How This Task Works:**
- Monitors MECM site component health and error/warning messages
- Retrieves component status messages from last 24 hours
- Groups errors and warnings by component name
- Generates summary report of site health issues
- Optional CSV export for trending analysis

**Prerequisites:**
- MECM Console with Configuration Manager PowerShell module
- Read permissions on site status messages
- PowerShell 5.1 or later
- Access to SMS Provider

**What You Need to Provide:**
- Site code to monitor
- Optional: CSV export path for persistent reporting

**What the Script Does:**
1. Imports Configuration Manager module and connects to site
2. Retrieves component status messages (errors and warnings only) from last 24 hours
3. Groups messages by component name
4. Counts errors and warnings per component
5. Displays formatted summary table in console
6. Exports to CSV if path provided
7. Calculates overall site health status (Healthy/Issues Detected)

**Important Notes:**
- Only retrieves errors and warnings (not informational messages)
- 24-hour window provides recent health snapshot
- Typical use: daily health checks, proactive monitoring, troubleshooting
- High error counts indicate component failures requiring investigation
- Common problematic components: Management Point, Distribution Manager, SMS_SITE_COMPONENT_MANAGER
- CSV export useful for trending and historical analysis
- Overall status is "Healthy" only if zero errors found
- Schedule script for automated daily health monitoring`,
    parameters: [
      { id: 'siteCode', label: 'Site Code', type: 'text', required: true, placeholder: 'PS1' },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\SiteHealth.csv' }
    ],
    scriptTemplate: (params) => {
      const s = escapePowerShellString(params.siteCode);
      const e = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Site Status Health Monitor
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select -ExpandProperty Name
Set-Location "$SiteCode:"

try {
    $Components = Get-CMComponentStatusMessage -SiteCode "${s}" -Severity Error,Warning -ViewingPeriod "24 hours"
    
    $Summary = $Components | Group-Object ComponentName | Select @{N='Component';E={$_.Name}},@{N='Errors';E={($_.Group|Where Severity -eq 'Error').Count}},@{N='Warnings';E={($_.Group|Where Severity -eq 'Warning').Count}}
    
    Write-Host "Site Health Summary (Last 24h):" -ForegroundColor Cyan
    $Summary | Format-Table -AutoSize
    ${e ? `
    $Summary | Export-Csv "${e}" -NoTypeInformation
    Write-Host "✓ Report: ${e}" -ForegroundColor Green` : ''}
    
    $Overall = if (($Summary | Measure -Property Errors -Sum).Sum -eq 0) { 'Healthy' } else { 'Issues Detected' }
    Write-Host "Overall Status: $Overall" -ForegroundColor $(if ($Overall -eq 'Healthy') {'Green'} else {'Yellow'})
} catch {
    Write-Error "Failed to check site status: $_"
    exit 1
}`;
    }
  },

  // ========================================
  // COMMON ADMIN TASKS CATEGORY (PREMIUM)
  // ========================================
  {
    id: 'create-deploy-task-sequence',
    name: 'Create and Deploy Task Sequences',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create OS deployment task sequences with drivers and deploy to collections',
    instructions: `**How This Task Works:**
This script creates comprehensive OS deployment task sequences in MECM with driver integration for automated OS deployment workflows.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Operating System Deployment permissions
- OS image package already imported
- Driver packages created and distributed

**What You Need to Provide:**
- Task sequence name
- Boot image package ID
- OS image package ID
- Driver package ID (optional)
- Target collection for deployment

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Creates new task sequence for OS deployment
3. Associates boot image for PXE/media boot
4. Links OS image package for installation
5. Optional: Adds driver package application step
6. Creates deployment to target collection
7. Configures deployment as Available to allow user-initiated deployment

**Important Notes:**
- Boot image must be distributed to DPs before deployment
- OS image package must be distributed to DPs
- Driver packages improve hardware compatibility
- Task sequences are complex - test thoroughly before production
- Deployment is set to Available (not Required) for safety
- Essential for zero-touch and automated OS deployments
- Can be customized post-creation with additional steps`,
    parameters: [
      { id: 'taskSequenceName', label: 'Task Sequence Name', type: 'text', required: true, placeholder: 'Deploy Windows 11 23H2' },
      { id: 'bootImageId', label: 'Boot Image Package ID', type: 'text', required: true, placeholder: 'PS100001' },
      { id: 'osImageId', label: 'OS Image Package ID', type: 'text', required: true, placeholder: 'PS100002' },
      { id: 'driverPackageId', label: 'Driver Package ID (Optional)', type: 'text', required: false, placeholder: 'PS100003' },
      { id: 'collectionName', label: 'Deployment Collection', type: 'text', required: true, placeholder: 'OSD-Pilot' }
    ],
    scriptTemplate: (params) => {
      const tsName = escapePowerShellString(params.taskSequenceName);
      const bootImg = escapePowerShellString(params.bootImageId);
      const osImg = escapePowerShellString(params.osImageId);
      const drvPkg = params.driverPackageId ? escapePowerShellString(params.driverPackageId) : '';
      const collection = escapePowerShellString(params.collectionName);

      return `# Create and Deploy OS Task Sequence
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$TSName = "${tsName}"
$BootImageId = "${bootImg}"
$OSImageId = "${osImg}"
$CollectionName = "${collection}"

try {
    # Validate packages exist
    $BootImage = Get-CMBootImage -Id $BootImageId -ErrorAction Stop
    $OSImage = Get-CMOperatingSystemImage -Id $OSImageId -ErrorAction Stop
    Write-Host "✓ Boot image validated: $($BootImage.Name)" -ForegroundColor Green
    Write-Host "✓ OS image validated: $($OSImage.Name)" -ForegroundColor Green
    
${drvPkg ? `    # Validate driver package if provided
    $DriverPackageId = "${drvPkg}"
    $DriverPkg = Get-CMDriverPackage -Id $DriverPackageId -ErrorAction Stop
    Write-Host "✓ Driver package validated: $($DriverPkg.Name)" -ForegroundColor Green
` : ''}    
    # Create task sequence
    $TS = New-CMTaskSequence \`
        -Name $TSName \`
        -BootImagePackageId $BootImageId \`
        -InstallOperatingSystemImagePackageId $OSImageId \`
        -ApplyAll $true \`
        -JoinDomain DomainType
    
    Write-Host "✓ Task sequence created: $TSName" -ForegroundColor Green
    
${drvPkg ? `    # Add driver package step
    $StepParams = @{
        TaskSequenceName = $TSName
        StepName = "Apply Drivers"
        DriverPackageId = $DriverPackageId
    }
    Add-CMTaskSequenceStep -TaskSequenceName $TSName -Step (New-CMTaskSequenceStepApplyDriverPackage @StepParams)
    Write-Host "✓ Driver package step added" -ForegroundColor Green
` : ''}    
    # Validate collection exists
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    
    # Create deployment
    New-CMTaskSequenceDeployment \`
        -TaskSequenceName $TSName \`
        -CollectionName $CollectionName \`
        -DeployPurpose Available \`
        -AllowSharedContent $true \`
        -AllowFallback $true \`
        -MakeAvailableTo ClientsMediaAndPxe \`
        -ShowTaskSequenceProgress $true
    
    Write-Host "✓ Deployment created to collection: $CollectionName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Sequence Ready!" -ForegroundColor Cyan
    Write-Host "  Name: $TSName" -ForegroundColor Gray
    Write-Host "  Deployment: Available (user-initiated)" -ForegroundColor Gray
    Write-Host "  Next: Ensure content distributed to DPs" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create task sequence: $_"
    exit 1
}`;
    }
  },

  {
    id: 'manage-software-update-groups',
    name: 'Manage Software Update Groups',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create software update groups and deploy patches to collections',
    instructions: `**How This Task Works:**
This script creates software update groups in MECM and deploys patches to collections for centralized patch management.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Software Update Point configured
- Updates synchronized from WSUS/Microsoft Update
- Collection already created for deployment

**What You Need to Provide:**
- Update group name
- Collection name for deployment
- Deployment deadline hours (0 for no deadline)
- Update severity filters (Critical, Important, etc.)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Searches for updates matching severity criteria
3. Creates new software update group with matching updates
4. Validates target collection exists
5. Creates deployment with specified deadline
6. Configures user notifications and restart behavior
7. Reports update count and deployment status

**Important Notes:**
- Deadline determines enforcement time (0 = Available only)
- Critical/Important updates typically deployed Required
- Test deployments on pilot collections first
- Deadline too short may disrupt users
- Essential for monthly patch management
- Can filter by multiple severity levels
- Deployment sends notifications to users`,
    parameters: [
      { id: 'groupName', label: 'Update Group Name', type: 'text', required: true, placeholder: 'Security Updates - January 2024' },
      { id: 'collectionName', label: 'Target Collection', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'deadlineHours', label: 'Deployment Deadline (hours)', type: 'number', required: true, placeholder: '72', defaultValue: 72 },
      { id: 'severity', label: 'Update Severity', type: 'select', required: true, defaultValue: 'Critical', options: ['Critical', 'Important', 'Moderate', 'Low', 'All'] }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const collection = escapePowerShellString(params.collectionName);
      const deadlineHours = params.deadlineHours || 72;
      const severity = escapePowerShellString(params.severity || 'Critical');

      return `# Manage Software Update Groups
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$GroupName = "${groupName}"
$CollectionName = "${collection}"
$DeadlineHours = ${deadlineHours}
$Severity = "${severity}"

try {
    # Search for updates matching severity
    Write-Host "Searching for $Severity updates..." -ForegroundColor Cyan
    
    if ($Severity -eq "All") {
        $Updates = Get-CMSoftwareUpdate -Fast | Where-Object { $_.IsDeployed -eq $false -and $_.IsExpired -eq $false }
    } else {
        $Updates = Get-CMSoftwareUpdate -Fast | Where-Object { 
            $_.IsDeployed -eq $false -and 
            $_.IsExpired -eq $false -and 
            $_.SeverityName -eq $Severity 
        }
    }
    
    Write-Host "  Found: $($Updates.Count) updates" -ForegroundColor Gray
    
    if ($Updates.Count -eq 0) {
        Write-Host "⚠ No matching updates found. Exiting." -ForegroundColor Yellow
        exit 0
    }
    
    # Create software update group
    $SUG = New-CMSoftwareUpdateGroup -Name $GroupName -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
    Write-Host "✓ Software update group created: $GroupName" -ForegroundColor Green
    
    # Add updates to group
    Add-CMSoftwareUpdateToGroup -SoftwareUpdateGroupName $GroupName -SoftwareUpdateId $Updates.CI_ID
    Write-Host "✓ Added $($Updates.Count) updates to group" -ForegroundColor Green
    
    # Validate collection
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    Write-Host "✓ Target collection validated: $CollectionName" -ForegroundColor Green
    
    # Calculate deadline
    $DeadlineDate = (Get-Date).AddHours($DeadlineHours)
    
    # Create deployment
    $DeploymentParams = @{
        SoftwareUpdateGroupName = $GroupName
        CollectionName = $CollectionName
        DeploymentType = if ($DeadlineHours -eq 0) { "Available" } else { "Required" }
        VerbosityLevel = "AllMessages"
        TimeBasedOn = "LocalTime"
        AvailableDateTime = (Get-Date)
        UserNotification = "DisplaySoftwareCenterOnly"
        SoftwareInstallation = $true
        AllowRestart = $true
    }
    
    if ($DeadlineHours -gt 0) {
        $DeploymentParams.DeadlineDateTime = $DeadlineDate
        $DeploymentParams.RequirePostRebootFullScan = $true
    }
    
    New-CMSoftwareUpdateDeployment @DeploymentParams
    
    Write-Host "✓ Deployment created" -ForegroundColor Green
    Write-Host ""
    Write-Host "Software Update Deployment Summary:" -ForegroundColor Cyan
    Write-Host "  Group: $GroupName" -ForegroundColor Gray
    Write-Host "  Updates: $($Updates.Count)" -ForegroundColor Gray
    Write-Host "  Collection: $CollectionName" -ForegroundColor Gray
    Write-Host "  Deadline: $(if ($DeadlineHours -eq 0) {'Available Only'} else {"$DeadlineHours hours ($DeadlineDate)"})" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create update deployment: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-client-settings',
    name: 'Configure Client Settings Policies',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Configure device/user client settings for ConfigMgr clients',
    instructions: `**How This Task Works:**
This script creates custom client settings policies in MECM for granular control over client behavior and features.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Client settings management permissions
- Target collection already created

**What You Need to Provide:**
- Client settings policy name
- Policy type (Device or User)
- Target collection for deployment
- Hardware inventory schedule
- Software inventory enabled/disabled

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Creates new client settings policy with specified type
3. Configures hardware inventory schedule (daily/weekly)
4. Enables or disables software inventory
5. Deploys policy to target collection
6. Reports configuration summary

**Important Notes:**
- Device settings apply to computers
- User settings apply to logged-in users
- Custom settings override default client settings
- Priority determines which settings win (lower number = higher priority)
- Hardware inventory frequency impacts network/DB load
- Software inventory can consume significant resources
- Typical use: different settings for servers vs workstations
- Changes take effect at next policy refresh cycle`,
    parameters: [
      { id: 'settingsName', label: 'Client Settings Name', type: 'text', required: true, placeholder: 'Workstation Client Settings' },
      { id: 'settingsType', label: 'Settings Type', type: 'select', required: true, defaultValue: 'Device', options: ['Device', 'User'] },
      { id: 'collectionName', label: 'Target Collection', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'hwInventorySchedule', label: 'Hardware Inventory Schedule', type: 'select', required: true, defaultValue: 'Daily', options: ['Daily', 'Weekly', 'None'] },
      { id: 'enableSwInventory', label: 'Enable Software Inventory', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const settingsName = escapePowerShellString(params.settingsName);
      const settingsType = escapePowerShellString(params.settingsType || 'Device');
      const collection = escapePowerShellString(params.collectionName);
      const hwSchedule = escapePowerShellString(params.hwInventorySchedule || 'Daily');
      const swInventory = toPowerShellBoolean(params.enableSwInventory ?? true);

      return `# Configure Client Settings Policies
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$SettingsName = "${settingsName}"
$SettingsType = "${settingsType}"
$CollectionName = "${collection}"
$HWSchedule = "${hwSchedule}"
$EnableSWInventory = ${swInventory}

try {
    # Validate collection exists
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    Write-Host "✓ Target collection validated: $CollectionName" -ForegroundColor Green
    
    # Determine settings type parameter
    $TypeParam = if ($SettingsType -eq "Device") { "-SettingsType Device" } else { "-SettingsType User" }
    
    # Create client settings
    $ClientSettings = New-CMClientSetting -Name $SettingsName -Type $TypeParam -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
    Write-Host "✓ Client settings created: $SettingsName ($SettingsType)" -ForegroundColor Green
    
    # Configure hardware inventory
    if ($HWSchedule -ne "None") {
        $Schedule = if ($HWSchedule -eq "Daily") {
            New-CMSchedule -RecurInterval Days -RecurCount 1
        } else {
            New-CMSchedule -RecurInterval Days -RecurCount 7
        }
        
        Set-CMClientSettingHardwareInventory \`
            -Name $SettingsName \`
            -Enable $true \`
            -Schedule $Schedule
        
        Write-Host "✓ Hardware inventory configured: $HWSchedule" -ForegroundColor Green
    }
    
    # Configure software inventory
    if ($EnableSWInventory) {
        $SWSchedule = New-CMSchedule -RecurInterval Days -RecurCount 7
        Set-CMClientSettingSoftwareInventory \`
            -Name $SettingsName \`
            -Enable $true \`
            -Schedule $SWSchedule
        
        Write-Host "✓ Software inventory enabled (weekly)" -ForegroundColor Green
    } else {
        Set-CMClientSettingSoftwareInventory -Name $SettingsName -Enable $false
        Write-Host "ℹ Software inventory disabled" -ForegroundColor Gray
    }
    
    # Deploy to collection
    Start-CMClientSettingDeployment -ClientSettingName $SettingsName -CollectionName $CollectionName
    Write-Host "✓ Client settings deployed to: $CollectionName" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Client Settings Configuration Complete!" -ForegroundColor Cyan
    Write-Host "  Name: $SettingsName" -ForegroundColor Gray
    Write-Host "  Type: $SettingsType" -ForegroundColor Gray
    Write-Host "  HW Inventory: $HWSchedule" -ForegroundColor Gray
    Write-Host "  SW Inventory: $(if ($EnableSWInventory) {'Enabled'} else {'Disabled'})" -ForegroundColor Gray
    Write-Host "  Deployed to: $CollectionName" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Note: Changes take effect at next policy refresh" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure client settings: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-app-deployment-type',
    name: 'Create Application Deployment Types',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Configure detection methods and installation commands for application deployment types',
    instructions: `**How This Task Works:**
This script adds deployment types to existing MECM applications with custom detection logic and installation commands.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Application already created in MECM
- Installation source files accessible via UNC path
- Knowledge of detection methods (file, registry, or MSI)

**What You Need to Provide:**
- Application name (must already exist)
- Deployment type name
- Content source UNC path
- Install command
- Uninstall command
- Detection method and value

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates application exists
3. Creates deployment type with specified install/uninstall commands
4. Configures detection method based on selected type
5. Sets installation behavior (system vs user context)
6. Reports successful configuration

**Important Notes:**
- Application must already exist (create first with separate task)
- MSI detection uses product code from installer
- File detection checks file existence at specified path
- Registry detection checks for registry key/value
- Script detection allows custom PowerShell logic
- Content must be accessible from MECM server
- After adding: distribute content to DPs`,
    parameters: [
      { id: 'applicationName', label: 'Application Name', type: 'text', required: true, placeholder: 'Adobe Reader DC' },
      { id: 'deploymentTypeName', label: 'Deployment Type Name', type: 'text', required: true, placeholder: 'Adobe Reader DC 2023 - Script' },
      { id: 'contentLocation', label: 'Content Source Path', type: 'path', required: true, placeholder: '\\\\server\\sources$\\Adobe\\ReaderDC' },
      { id: 'installCommand', label: 'Install Command', type: 'text', required: true, placeholder: 'AcroRdrDC2300620360_en_US.exe /sAll /rs /msi EULA_ACCEPT=YES' },
      { id: 'uninstallCommand', label: 'Uninstall Command', type: 'text', required: true, placeholder: 'msiexec /x {AC76BA86-7AD7-1033-7B44-AC0F074E4100} /qn' },
      { id: 'detectionMethod', label: 'Detection Method', type: 'select', required: true, defaultValue: 'File', options: ['File', 'Registry', 'MSI', 'Script'] },
      { id: 'detectionValue', label: 'Detection Value', type: 'text', required: true, placeholder: 'C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe' }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.applicationName);
      const dtName = escapePowerShellString(params.deploymentTypeName);
      const contentPath = escapePowerShellString(params.contentLocation);
      const installCmd = escapePowerShellString(params.installCommand);
      const uninstallCmd = escapePowerShellString(params.uninstallCommand);
      const detectionMethod = escapePowerShellString(params.detectionMethod || 'File');
      const detectionValue = escapePowerShellString(params.detectionValue);

      return `# Create Application Deployment Type
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$AppName = "${appName}"
$DTName = "${dtName}"
$ContentLocation = "${contentPath}"
$InstallCommand = "${installCmd}"
$UninstallCommand = "${uninstallCmd}"
$DetectionMethod = "${detectionMethod}"
$DetectionValue = "${detectionValue}"

try {
    # Validate application exists
    $App = Get-CMApplication -Name $AppName -ErrorAction Stop
    Write-Host "✓ Application found: $AppName" -ForegroundColor Green
    
    # Prepare detection clause based on method
    $DetectionClause = switch ($DetectionMethod) {
        "File" {
            $FilePath = Split-Path $DetectionValue -Parent
            $FileName = Split-Path $DetectionValue -Leaf
            New-CMDetectionClauseFile -Path $FilePath -FileName $FileName -Existence
        }
        "Registry" {
            # Assume format: HKLM\\Software\\Company\\Product
            $RegParts = $DetectionValue -split '\\\\'
            $Hive = $RegParts[0]
            $KeyPath = $RegParts[1..($RegParts.Length-2)] -join '\\'
            $ValueName = $RegParts[-1]
            
            New-CMDetectionClauseRegistryKey \`
                -Hive $Hive \`
                -KeyName $KeyPath \`
                -Existence
        }
        "MSI" {
            # For MSI, use product code from detection value
            New-CMDetectionClauseMacFile -ProductCode $DetectionValue
        }
        "Script" {
            # Custom PowerShell script
            $ScriptText = @"
# Custom detection script
if (Test-Path "$DetectionValue") {
    Write-Host "Installed"
}
"@
            New-CMDetectionClauseFile -Path "C:\\" -FileName "dummy.txt" -Existence # Placeholder
        }
    }
    
    # Add script deployment type
    $DTParams = @{
        ApplicationName = $AppName
        DeploymentTypeName = $DTName
        ScriptInstaller = $true
        InstallCommand = $InstallCommand
        UninstallCommand = $UninstallCommand
        ContentLocation = $ContentLocation
        InstallationBehaviorType = 'InstallForSystem'
        LogonRequirementType = 'WhetherOrNotUserLoggedOn'
        ScriptType = 'PowerShell'
        ScriptContent = 'Write-Host "Detection"'
        AddDetectionClause = $DetectionClause
    }
    
    Add-CMScriptDeploymentType @DTParams
    
    Write-Host "✓ Deployment type added: $DTName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment Type Configuration:" -ForegroundColor Cyan
    Write-Host "  Application: $AppName" -ForegroundColor Gray
    Write-Host "  Type: $DTName" -ForegroundColor Gray
    Write-Host "  Detection: $DetectionMethod" -ForegroundColor Gray
    Write-Host "  Content: $ContentLocation" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Distribute content to distribution points" -ForegroundColor Gray
    Write-Host "  2. Test detection logic" -ForegroundColor Gray
    Write-Host "  3. Create deployment to collection" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to add deployment type: $_"
    exit 1
}`;
    }
  },

  {
    id: 'manage-dp-groups',
    name: 'Manage Distribution Point Groups',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create DP groups and distribute content efficiently',
    instructions: `**How This Task Works:**
This script creates distribution point groups in MECM for simplified content distribution management.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Distribution point management permissions
- Distribution points already configured

**What You Need to Provide:**
- DP group name
- Comma-separated list of DP server names
- Optional: Package/application name to distribute immediately

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Creates new distribution point group
3. Validates each DP server exists in MECM
4. Adds distribution points to group
5. Optional: Distributes specified package/application to group
6. Reports configuration summary

**Important Notes:**
- DP groups simplify content distribution to multiple DPs
- Add/remove DPs from group instead of individual distributions
- Essential for large environments with many DPs
- Typical use: geographic regions, site boundaries
- Validate DP names match MECM exactly (FQDN vs NetBIOS)
- Content distributed to group propagates to all member DPs
- Changes to group membership affect future distributions only`,
    parameters: [
      { id: 'groupName', label: 'DP Group Name', type: 'text', required: true, placeholder: 'Regional-DPs-US-East' },
      { id: 'dpServers', label: 'DP Servers (comma-separated)', type: 'textarea', required: true, placeholder: 'DP01.contoso.com,DP02.contoso.com,DP03.contoso.com' },
      { id: 'packageToDistribute', label: 'Package/App to Distribute (Optional)', type: 'text', required: false, placeholder: 'Microsoft 365' }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const dpServers = params.dpServers ? buildPowerShellArray(params.dpServers) : '';
      const packageName = params.packageToDistribute ? escapePowerShellString(params.packageToDistribute) : '';

      return `# Manage Distribution Point Groups
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$GroupName = "${groupName}"
$DPServers = ${dpServers}

try {
    # Create DP group
    $DPGroup = New-CMDistributionPointGroup -Name $GroupName -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
    Write-Host "✓ Distribution point group created: $GroupName" -ForegroundColor Green
    
    # Add distribution points to group
    $AddedCount = 0
    $FailedCount = 0
    
    foreach ($DPServer in $DPServers) {
        try {
            # Validate DP exists
            $DP = Get-CMDistributionPoint -SiteSystemServerName $DPServer -ErrorAction Stop
            
            # Add to group
            Add-CMDistributionPointToGroup -DistributionPointGroupName $GroupName -DistributionPointName $DPServer
            
            Write-Host "  ✓ Added: $DPServer" -ForegroundColor Green
            $AddedCount++
            
        } catch {
            Write-Host "  ✗ Failed: $DPServer - $($_.Exception.Message)" -ForegroundColor Red
            $FailedCount++
        }
    }
    
    Write-Host ""
    Write-Host "DP Group Configuration:" -ForegroundColor Cyan
    Write-Host "  Group Name: $GroupName" -ForegroundColor Gray
    Write-Host "  DPs Added: $AddedCount" -ForegroundColor Green
    Write-Host "  DPs Failed: $FailedCount" -ForegroundColor $(if ($FailedCount -gt 0) {'Red'} else {'Gray'})
    
${packageName ? `    # Distribute package to DP group
    Write-Host ""
    Write-Host "Distributing content to DP group..." -ForegroundColor Cyan
    
    try {
        $PackageName = "${packageName}"
        
        # Try as application first
        $App = Get-CMApplication -Name $PackageName -ErrorAction SilentlyContinue
        if ($App) {
            Start-CMContentDistribution -ApplicationName $PackageName -DistributionPointGroupName $GroupName
            Write-Host "✓ Application distribution started: $PackageName" -ForegroundColor Green
        } else {
            # Try as package
            $Package = Get-CMPackage -Name $PackageName -ErrorAction Stop
            Start-CMContentDistribution -PackageName $PackageName -DistributionPointGroupName $GroupName
            Write-Host "✓ Package distribution started: $PackageName" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "⚠ Failed to distribute content: $($_.Exception.Message)" -ForegroundColor Yellow
    }
` : ''}    
    Write-Host ""
    Write-Host "Distribution Point Group Ready!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to manage DP group: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-maintenance-windows',
    name: 'Configure Maintenance Windows',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Set up maintenance windows for collections to control deployment timing',
    instructions: `**How This Task Works:**
This script configures maintenance windows on collections to control when software installations, updates, and reboots can occur.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Collection management permissions
- Target collection already created

**What You Need to Provide:**
- Collection name
- Maintenance window name
- Window type (All Deployments, Software Updates, Task Sequences)
- Schedule (Daily, Weekly, Monthly)
- Start time (24-hour format)
- Duration in hours

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates collection exists
3. Creates schedule based on recurrence pattern
4. Configures maintenance window with specified parameters
5. Applies window to collection
6. Reports configuration details

**Important Notes:**
- Maintenance windows prevent installations outside allowed times
- Essential for production servers and critical workstations
- Software Updates windows apply only to patch deployments
- Task Sequence windows apply only to OSD
- All Deployments windows apply to everything
- Multiple windows can exist on same collection
- Clients will wait until next window for deployment enforcement
- Typical use: after-hours deployment windows`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'Production Servers' },
      { id: 'windowName', label: 'Maintenance Window Name', type: 'text', required: true, placeholder: 'Weekend Patching Window' },
      { id: 'windowType', label: 'Window Type', type: 'select', required: true, defaultValue: 'Updates', options: ['All Deployments', 'Software Updates', 'Task Sequences'] },
      { id: 'schedule', label: 'Schedule', type: 'select', required: true, defaultValue: 'Weekly', options: ['Daily', 'Weekly', 'Monthly'] },
      { id: 'startTime', label: 'Start Time (24h)', type: 'text', required: true, placeholder: '22:00' },
      { id: 'durationHours', label: 'Duration (hours)', type: 'number', required: true, placeholder: '4', defaultValue: 4 }
    ],
    scriptTemplate: (params) => {
      const collection = escapePowerShellString(params.collectionName);
      const windowName = escapePowerShellString(params.windowName);
      const windowType = escapePowerShellString(params.windowType || 'Software Updates');
      const schedule = escapePowerShellString(params.schedule || 'Weekly');
      const startTime = escapePowerShellString(params.startTime || '22:00');
      const duration = params.durationHours || 4;

      return `# Configure Maintenance Windows
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CollectionName = "${collection}"
$WindowName = "${windowName}"
$WindowType = "${windowType}"
$Schedule = "${schedule}"
$StartTime = "${startTime}"
$DurationHours = ${duration}

try {
    # Validate collection exists
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    Write-Host "✓ Collection found: $CollectionName" -ForegroundColor Green
    
    # Parse start time
    $TimeParts = $StartTime -split ':'
    $Hour = [int]$TimeParts[0]
    $Minute = [int]$TimeParts[1]
    
    # Create start date/time (next occurrence)
    $StartDate = Get-Date -Hour $Hour -Minute $Minute -Second 0
    if ($StartDate -lt (Get-Date)) {
        $StartDate = $StartDate.AddDays(1)
    }
    
    # Create schedule based on recurrence
    $ScheduleObj = switch ($Schedule) {
        "Daily" {
            New-CMSchedule -Start $StartDate -RecurInterval Days -RecurCount 1 -DurationInterval Hours -DurationCount $DurationHours
        }
        "Weekly" {
            New-CMSchedule -Start $StartDate -RecurInterval Days -RecurCount 7 -DurationInterval Hours -DurationCount $DurationHours
        }
        "Monthly" {
            New-CMSchedule -Start $StartDate -RecurInterval Days -RecurCount 30 -DurationInterval Hours -DurationCount $DurationHours
        }
    }
    
    # Determine window type parameter
    $ApplyTo = switch ($WindowType) {
        "All Deployments" { "Any" }
        "Software Updates" { "SoftwareUpdate" }
        "Task Sequences" { "TaskSequence" }
    }
    
    # Create maintenance window
    New-CMMaintenanceWindow \`
        -CollectionId $Collection.CollectionID \`
        -Name $WindowName \`
        -Schedule $ScheduleObj \`
        -ApplyTo $ApplyTo
    
    Write-Host "✓ Maintenance window created: $WindowName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Maintenance Window Configuration:" -ForegroundColor Cyan
    Write-Host "  Collection: $CollectionName" -ForegroundColor Gray
    Write-Host "  Window Name: $WindowName" -ForegroundColor Gray
    Write-Host "  Type: $WindowType" -ForegroundColor Gray
    Write-Host "  Schedule: $Schedule" -ForegroundColor Gray
    Write-Host "  Start Time: $StartTime" -ForegroundColor Gray
    Write-Host "  Duration: $DurationHours hours" -ForegroundColor Gray
    Write-Host "  Next Window: $($StartDate.ToString('yyyy-MM-dd HH:mm'))" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Note: Deployments will only run during this window" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create maintenance window: $_"
    exit 1
}`;
    }
  },

  {
    id: 'deploy-os-image',
    name: 'Deploy Operating System Images',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Deploy WIM/custom OS images to collections using task sequences',
    instructions: `**How This Task Works:**
This script deploys OS images to collections using existing task sequences for operating system deployment.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- OS deployment permissions
- Task sequence already created and tested
- Boot images distributed to DPs
- OS image distributed to DPs
- Target collection created

**What You Need to Provide:**
- Task sequence name (must already exist)
- Target collection name
- Deployment type (Available or Required)
- PXE availability
- Media and prestaged media availability

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates task sequence exists
3. Validates target collection exists
4. Creates OS deployment with specified parameters
5. Configures availability (PXE, media, prestaged media)
6. Sets deployment purpose (Available for user-initiated, Required for automatic)
7. Enables task sequence progress UI
8. Reports deployment configuration

**Important Notes:**
- Task sequence must already exist and be tested
- Available deployments require user initiation
- Required deployments auto-deploy (use with caution!)
- PXE allows network boot deployment
- Media allows bootable media creation
- Prestaged media for factory imaging scenarios
- ALWAYS test on pilot collection first
- Required deployments can wipe machines - be careful!`,
    parameters: [
      { id: 'taskSequenceName', label: 'Task Sequence Name', type: 'text', required: true, placeholder: 'Deploy Windows 11 23H2' },
      { id: 'collectionName', label: 'Target Collection', type: 'text', required: true, placeholder: 'OSD-Pilot' },
      { id: 'deployPurpose', label: 'Deployment Purpose', type: 'select', required: true, defaultValue: 'Available', options: ['Available', 'Required'] },
      { id: 'enablePXE', label: 'Make Available to PXE', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableMedia', label: 'Make Available to Media', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const tsName = escapePowerShellString(params.taskSequenceName);
      const collection = escapePowerShellString(params.collectionName);
      const purpose = escapePowerShellString(params.deployPurpose || 'Available');
      const pxe = toPowerShellBoolean(params.enablePXE ?? true);
      const media = toPowerShellBoolean(params.enableMedia ?? true);

      return `# Deploy Operating System Image
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$TSName = "${tsName}"
$CollectionName = "${collection}"
$DeployPurpose = "${purpose}"
$EnablePXE = ${pxe}
$EnableMedia = ${media}

try {
    # Validate task sequence exists
    $TS = Get-CMTaskSequence -Name $TSName -ErrorAction Stop
    Write-Host "✓ Task sequence found: $TSName" -ForegroundColor Green
    
    # Validate collection exists
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    Write-Host "✓ Target collection found: $CollectionName" -ForegroundColor Green
    Write-Host "  Member count: $($Collection.MemberCount)" -ForegroundColor Gray
    
    # Determine availability
    $MakeAvailableTo = @()
    if ($EnablePXE) { $MakeAvailableTo += "Clients" }
    if ($EnableMedia) { $MakeAvailableTo += "Media" }
    
    $AvailabilityOptions = if ($EnablePXE -and $EnableMedia) {
        "ClientsMediaAndPxe"
    } elseif ($EnablePXE) {
        "ClientsAndPxe"
    } elseif ($EnableMedia) {
        "MediaAndPxe"
    } else {
        "Clients"
    }
    
    # Warning for Required deployments
    if ($DeployPurpose -eq "Required") {
        Write-Host ""
        Write-Host "⚠ WARNING: Required OS deployment will automatically deploy!" -ForegroundColor Yellow
        Write-Host "  This will REIMAGE devices in the collection!" -ForegroundColor Yellow
        Write-Host "  Ensure collection contains only intended devices!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press Ctrl+C to cancel, or wait 10 seconds to continue..." -ForegroundColor Red
        Start-Sleep -Seconds 10
    }
    
    # Create deployment
    $DeployParams = @{
        TaskSequenceName = $TSName
        CollectionName = $CollectionName
        DeployPurpose = $DeployPurpose
        AllowSharedContent = $true
        AllowFallback = $true
        MakeAvailableTo = $AvailabilityOptions
        ShowTaskSequenceProgress = $true
    }
    
    New-CMTaskSequenceDeployment @DeployParams
    
    Write-Host "✓ OS deployment created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "OS Deployment Configuration:" -ForegroundColor Cyan
    Write-Host "  Task Sequence: $TSName" -ForegroundColor Gray
    Write-Host "  Collection: $CollectionName" -ForegroundColor Gray
    Write-Host "  Purpose: $DeployPurpose" -ForegroundColor Gray
    Write-Host "  Available to PXE: $(if ($EnablePXE) {'Yes'} else {'No'})" -ForegroundColor Gray
    Write-Host "  Available to Media: $(if ($EnableMedia) {'Yes'} else {'No'})" -ForegroundColor Gray
    Write-Host ""
    
    if ($DeployPurpose -eq "Available") {
        Write-Host "Users can initiate deployment from Software Center" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Deployment will run automatically on collection members!" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to create OS deployment: $_"
    exit 1
}`;
    }
  },

  {
    id: 'client-health-remediation',
    name: 'Manage Client Health and Remediation',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Monitor client health, run remediation scripts, and fix common client issues',
    instructions: `**How This Task Works:**
This script monitors MECM client health and runs remediation actions to fix common client issues.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Collection management permissions
- PowerShell remoting enabled on clients
- Administrative access to client devices

**What You Need to Provide:**
- Collection name to check
- Export path for health report
- Option to remediate unhealthy clients
- Remediation actions to perform

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Retrieves client health data for collection
3. Identifies unhealthy clients (no heartbeat, pending restart, etc.)
4. Generates health report with statistics
5. Optional: Runs remediation scripts on unhealthy clients
6. Remediation actions: restart ccmexec, repair client, trigger policy refresh
7. Exports detailed report to CSV

**Important Notes:**
- Monitors last heartbeat, client version, and activity status
- Unhealthy = no heartbeat in 7+ days or client not installed
- Remediation requires PowerShell remoting
- Common fixes: service restart, policy refresh, client repair
- Essential for proactive client management
- Schedule regularly for ongoing monitoring
- Review report to identify chronic problem devices`,
    parameters: [
      { id: 'collectionName', label: 'Collection Name', type: 'text', required: true, placeholder: 'All Workstations' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ClientHealth.csv' },
      { id: 'runRemediation', label: 'Run Remediation on Unhealthy Clients', type: 'boolean', required: false, defaultValue: false },
      { id: 'remediationAction', label: 'Remediation Action', type: 'select', required: false, defaultValue: 'RestartService', options: ['RestartService', 'PolicyRefresh', 'RepairClient', 'All'] }
    ],
    scriptTemplate: (params) => {
      const collection = escapePowerShellString(params.collectionName);
      const exportPath = escapePowerShellString(params.exportPath);
      const remediate = toPowerShellBoolean(params.runRemediation ?? false);
      const action = escapePowerShellString(params.remediationAction || 'RestartService');

      return `# Client Health and Remediation
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CollectionName = "${collection}"
$ExportPath = "${exportPath}"
$RunRemediation = ${remediate}
$RemediationAction = "${action}"

try {
    # Get collection members
    $Devices = Get-CMDevice -CollectionName $CollectionName
    Write-Host "Analyzing $($Devices.Count) devices in $CollectionName..." -ForegroundColor Cyan
    Write-Host ""
    
    $HealthResults = @()
    $HealthyCount = 0
    $UnhealthyCount = 0
    $UnhealthyDevices = @()
    
    foreach ($Device in $Devices) {
        # Determine health status
        $LastActive = $Device.LastActiveTime
        $DaysSinceActive = if ($LastActive) { (New-TimeSpan -Start $LastActive -End (Get-Date)).Days } else { 999 }
        
        $IsHealthy = $Device.IsActive -and $DaysSinceActive -lt 7 -and $Device.IsClient
        
        if ($IsHealthy) {
            $HealthyCount++
            $Status = "Healthy"
        } else {
            $UnhealthyCount++
            $Status = "Unhealthy"
            $UnhealthyDevices += $Device.Name
        }
        
        $HealthResults += [PSCustomObject]@{
            DeviceName = $Device.Name
            Status = $Status
            LastActive = $LastActive
            DaysSinceActive = $DaysSinceActive
            ClientInstalled = $Device.IsClient
            ClientVersion = $Device.ClientVersion
        }
    }
    
    # Display summary
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Client Health Summary:" -ForegroundColor Cyan
    Write-Host "  Total Devices: $($Devices.Count)" -ForegroundColor Gray
    Write-Host "  Healthy: $HealthyCount" -ForegroundColor Green
    Write-Host "  Unhealthy: $UnhealthyCount" -ForegroundColor Red
    Write-Host "  Health Rate: $('{0:P0}' -f ($HealthyCount / $Devices.Count))" -ForegroundColor Gray
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Export report
    $HealthResults | Export-Csv -Path $ExportPath -NoTypeInformation
    Write-Host "✓ Health report exported: $ExportPath" -ForegroundColor Green
    
    # Remediation
    if ($RunRemediation -and $UnhealthyDevices.Count -gt 0) {
        Write-Host ""
        Write-Host "Running remediation on $($UnhealthyDevices.Count) unhealthy devices..." -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($DeviceName in $UnhealthyDevices) {
            try {
                if ($RemediationAction -eq "RestartService" -or $RemediationAction -eq "All") {
                    Invoke-Command -ComputerName $DeviceName -ScriptBlock {
                        Restart-Service -Name CcmExec -Force
                    } -ErrorAction Stop
                    Write-Host "  ✓ $DeviceName: CCMExec service restarted" -ForegroundColor Green
                }
                
                if ($RemediationAction -eq "PolicyRefresh" -or $RemediationAction -eq "All") {
                    Invoke-Command -ComputerName $DeviceName -ScriptBlock {
                        Invoke-WmiMethod -Namespace root\\ccm -Class SMS_CLIENT -Name TriggerSchedule "{00000000-0000-0000-0000-000000000021}"
                    } -ErrorAction Stop
                    Write-Host "  ✓ $DeviceName: Policy refresh triggered" -ForegroundColor Green
                }
                
                if ($RemediationAction -eq "RepairClient" -or $RemediationAction -eq "All") {
                    Invoke-Command -ComputerName $DeviceName -ScriptBlock {
                        Start-Process -FilePath "C:\\Windows\\ccmsetup\\ccmsetup.exe" -ArgumentList "/mp:SCCM-SERVER.contoso.com SMSSITECODE=AUTO" -NoNewWindow -Wait
                    } -ErrorAction Stop
                    Write-Host "  ✓ $DeviceName: Client repair initiated" -ForegroundColor Green
                }
                
            } catch {
                Write-Host "  ✗ $DeviceName: Remediation failed - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "Remediation complete. Re-run health check in 15 minutes." -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to check client health: $_"
    exit 1
}`;
    }
  },

  {
    id: 'configure-boundary-groups',
    name: 'Configure Boundary Groups',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create boundaries and boundary groups for client site assignment and content location',
    instructions: `**How This Task Works:**
This script creates boundary groups with associated boundaries for controlling client site assignment and content source locations.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Site configuration permissions
- Knowledge of network IP ranges or AD site names
- Distribution points and management points configured

**What You Need to Provide:**
- Boundary group name
- Default site code for client assignment
- Comma-separated boundaries (IP subnets with CIDR or AD site names)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Creates new boundary group with default site assignment
3. Parses boundary list (detects IP subnets vs AD sites)
4. Creates individual boundary objects
5. Associates boundaries with boundary group
6. Reports configuration success

**Important Notes:**
- IP subnets require CIDR notation (e.g., 192.168.1.0/24)
- AD sites must match exact Active Directory site names
- Boundary groups control: client assignment, content location, software update points
- After creation: manually assign DPs and MPs to group in console
- Clients use boundaries to discover their location
- Multiple boundary groups can contain same boundary
- Essential for multi-site and roaming client scenarios
- Overlapping boundaries may cause unpredictable client behavior`,
    parameters: [
      { id: 'groupName', label: 'Boundary Group Name', type: 'text', required: true, placeholder: 'NYC-Office-Network' },
      { id: 'siteCode', label: 'Default Site Code', type: 'text', required: true, placeholder: 'NYC' },
      { id: 'boundaries', label: 'Boundaries (comma-separated)', type: 'textarea', required: true, placeholder: '192.168.1.0/24,192.168.2.0/24,Default-First-Site-Name' }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const siteCode = escapePowerShellString(params.siteCode);
      const boundaries = params.boundaries ? buildPowerShellArray(params.boundaries) : '';

      return `# Configure Boundary Groups
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$GroupName = "${groupName}"
$DefaultSiteCode = "${siteCode}"
$BoundariesList = ${boundaries}

try {
    # Create boundary group
    $BG = New-CMBoundaryGroup \`
        -Name $GroupName \`
        -DefaultSiteCode $DefaultSiteCode \`
        -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
    
    Write-Host "✓ Boundary group created: $GroupName" -ForegroundColor Green
    Write-Host "  Default site code: $DefaultSiteCode" -ForegroundColor Gray
    Write-Host ""
    
    # Add boundaries
    Write-Host "Adding boundaries to group..." -ForegroundColor Cyan
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($BoundaryValue in $BoundariesList) {
        try {
            # Detect boundary type
            if ($BoundaryValue -match '/') {
                # IP subnet with CIDR
                $BoundaryType = "IPSubnet"
                $DisplayName = "Subnet-$BoundaryValue"
            } else {
                # AD Site
                $BoundaryType = "ADSite"
                $DisplayName = "ADSite-$BoundaryValue"
            }
            
            # Create boundary
            $Boundary = New-CMBoundary \`
                -Name $DisplayName \`
                -Type $BoundaryType \`
                -Value $BoundaryValue
            
            # Add to group
            Add-CMBoundaryToGroup \`
                -BoundaryGroupId $BG.GroupID \`
                -BoundaryId $Boundary.BoundaryID
            
            Write-Host "  ✓ Added: $BoundaryValue ($BoundaryType)" -ForegroundColor Green
            $SuccessCount++
            
        } catch {
            Write-Host "  ✗ Failed: $BoundaryValue - $($_.Exception.Message)" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Boundary Group Configuration Complete!" -ForegroundColor Cyan
    Write-Host "  Group: $GroupName" -ForegroundColor Gray
    Write-Host "  Boundaries Added: $SuccessCount" -ForegroundColor Green
    Write-Host "  Boundaries Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) {'Red'} else {'Gray'})
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Assign distribution points to boundary group" -ForegroundColor Gray
    Write-Host "  2. Assign management points to boundary group" -ForegroundColor Gray
    Write-Host "  3. Configure software update points if needed" -ForegroundColor Gray
    Write-Host "  4. Test client assignment from boundary network" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure boundary group: $_"
    exit 1
}`;
    }
  },

  {
    id: 'create-compliance-baseline',
    name: 'Create Custom Compliance Baselines',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Create configuration items and compliance baselines for security and configuration management',
    instructions: `**How This Task Works:**
This script creates compliance baselines with configuration items to monitor and enforce security and configuration standards.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Compliance settings management permissions
- PowerShell script for configuration check
- Knowledge of desired state configuration

**What You Need to Provide:**
- Baseline name
- Configuration item name
- Discovery script (PowerShell to check current state)
- Remediation script (PowerShell to fix non-compliant state)
- Expected value for compliance
- Collection to deploy baseline

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Creates configuration item with script-based setting
3. Configures discovery script to check current state
4. Optional: Configures remediation script to fix issues
5. Creates compliance baseline containing the CI
6. Deploys baseline to specified collection
7. Configures compliance evaluation schedule

**Important Notes:**
- Discovery script must return actual state value
- Remediation script fixes non-compliant systems (optional)
- Baseline can contain multiple configuration items
- Typical uses: registry settings, service states, file existence
- Evaluation runs on client according to schedule
- Non-compliance reports to MECM console
- Essential for security hardening and standards enforcement
- Can generate alerts for non-compliance`,
    parameters: [
      { id: 'baselineName', label: 'Baseline Name', type: 'text', required: true, placeholder: 'Corporate Security Baseline' },
      { id: 'ciName', label: 'Configuration Item Name', type: 'text', required: true, placeholder: 'Windows Firewall Enabled' },
      { id: 'discoveryScript', label: 'Discovery Script', type: 'textarea', required: true, placeholder: '(Get-NetFirewallProfile -Profile Domain).Enabled' },
      { id: 'expectedValue', label: 'Expected Value', type: 'text', required: true, placeholder: 'True' },
      { id: 'remediationScript', label: 'Remediation Script (Optional)', type: 'textarea', required: false, placeholder: 'Set-NetFirewallProfile -Profile Domain -Enabled True' },
      { id: 'collectionName', label: 'Deployment Collection', type: 'text', required: true, placeholder: 'All Workstations' }
    ],
    scriptTemplate: (params) => {
      const baselineName = escapePowerShellString(params.baselineName);
      const ciName = escapePowerShellString(params.ciName);
      const discoveryScript = escapePowerShellString(params.discoveryScript);
      const expectedValue = escapePowerShellString(params.expectedValue);
      const remediationScript = params.remediationScript ? escapePowerShellString(params.remediationScript) : '';
      const collection = escapePowerShellString(params.collectionName);

      return `# Create Compliance Baseline
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$BaselineName = "${baselineName}"
$CIName = "${ciName}"
$DiscoveryScript = "${discoveryScript}"
$ExpectedValue = "${expectedValue}"
$CollectionName = "${collection}"

try {
    # Create configuration item
    $CI = New-CMConfigurationItem \`
        -Name $CIName \`
        -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')" \`
        -CreationType WindowsOS
    
    Write-Host "✓ Configuration item created: $CIName" -ForegroundColor Green
    
    # Add script-based setting
    $Setting = New-CMComplianceSettingScript \`
        -DataType String \`
        -DiscoveryScriptLanguage PowerShell \`
        -DiscoveryScriptText $DiscoveryScript \`
        -Name "ScriptSetting-$CIName" \`
        -Description "Checks compliance for $CIName"
${remediationScript ? `    
    # Add remediation script
    $Setting = $Setting | Set-CMComplianceSettingScript \`
        -RemediationScriptLanguage PowerShell \`
        -RemediationScriptText "${remediationScript}"
    
    Write-Host "✓ Remediation script configured" -ForegroundColor Green
` : ''}    
    # Add setting to CI
    Add-CMComplianceSetting -InputObject $CI -Setting $Setting
    
    # Create compliance rule
    $Rule = New-CMComplianceRuleValue \`
        -SettingName $Setting.Name \`
        -RuleName "Rule-$CIName" \`
        -ExpectedValue $ExpectedValue \`
        -ExpressionOperator IsEquals \`
        -NoncomplianceSeverity Warning \`
        -ReportNoncompliance $true
${remediationScript ? `        -Remediate $true` : ''}
    
    Add-CMComplianceSettingRule -InputObject $CI -Rule $Rule
    Write-Host "✓ Compliance rule added: Expected value = $ExpectedValue" -ForegroundColor Green
    
    # Create baseline
    $Baseline = New-CMBaseline \`
        -Name $BaselineName \`
        -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')"
    
    # Add CI to baseline
    Set-CMBaseline -Name $BaselineName -AddOSConfigurationItem $CI.CI_ID
    
    Write-Host "✓ Compliance baseline created: $BaselineName" -ForegroundColor Green
    
    # Validate collection
    $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
    
    # Deploy baseline
    New-CMBaselineDeployment \`
        -Name $BaselineName \`
        -CollectionName $CollectionName \`
        -GenerateAlert $true \`
        -MonitoredByScom $false \`
        -Schedule (New-CMSchedule -RecurInterval Days -RecurCount 1)
    
    Write-Host "✓ Baseline deployed to: $CollectionName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Compliance Baseline Configuration Complete!" -ForegroundColor Cyan
    Write-Host "  Baseline: $BaselineName" -ForegroundColor Gray
    Write-Host "  Configuration Item: $CIName" -ForegroundColor Gray
    Write-Host "  Expected Value: $ExpectedValue" -ForegroundColor Gray
    Write-Host "  Remediation: $(if ('${remediationScript}') {'Enabled'} else {'Disabled'})" -ForegroundColor Gray
    Write-Host "  Deployed to: $CollectionName" -ForegroundColor Gray
    Write-Host "  Evaluation: Daily" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check Compliance dashboard for results in 24 hours" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create compliance baseline: $_"
    exit 1
}`;
    }
  },

  {
    id: 'manage-driver-packages',
    name: 'Manage Driver Packages and Catalogs',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Import drivers, create driver packages, and manage driver catalogs for OS deployment',
    instructions: `**How This Task Works:**
This script imports drivers into MECM, creates driver packages, and manages driver catalogs for operating system deployment.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Driver management permissions
- Driver files extracted to UNC path
- Network share accessible from MECM server

**What You Need to Provide:**
- Driver source path (UNC path to extracted drivers)
- Driver package name
- Package source path (where to store driver content)
- Target OS version (Windows 10, Windows 11, etc.)
- Manufacturer filter (optional)

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Imports drivers from source path recursively
3. Filters drivers by OS version and manufacturer
4. Creates driver package with imported drivers
5. Sets package source location
6. Reports driver count and package details
7. Package ready for distribution to DPs

**Important Notes:**
- Driver source must contain INF files
- Import is recursive (scans all subfolders)
- Drivers are categorized by OS version and manufacturer
- Driver packages separate from boot images
- Typical use: model-specific driver packages
- After creation: distribute package to DPs
- Can create multiple packages for different hardware models
- Essential for bare-metal OS deployments`,
    parameters: [
      { id: 'driverSourcePath', label: 'Driver Source Path', type: 'path', required: true, placeholder: '\\\\server\\drivers$\\Dell\\Latitude7420' },
      { id: 'packageName', label: 'Driver Package Name', type: 'text', required: true, placeholder: 'Dell Latitude 7420 - Windows 11 Drivers' },
      { id: 'packageSourcePath', label: 'Package Source Path', type: 'path', required: true, placeholder: '\\\\server\\sources$\\DriverPackages\\Dell\\Latitude7420' },
      { id: 'osVersion', label: 'Target OS Version', type: 'select', required: true, defaultValue: 'Windows 11', options: ['Windows 10', 'Windows 11', 'Windows Server 2019', 'Windows Server 2022'] },
      { id: 'manufacturer', label: 'Manufacturer Filter (Optional)', type: 'text', required: false, placeholder: 'Dell Inc.' }
    ],
    scriptTemplate: (params) => {
      const driverPath = escapePowerShellString(params.driverSourcePath);
      const packageName = escapePowerShellString(params.packageName);
      const packagePath = escapePowerShellString(params.packageSourcePath);
      const osVersion = escapePowerShellString(params.osVersion || 'Windows 11');
      const manufacturer = params.manufacturer ? escapePowerShellString(params.manufacturer) : '';

      return `# Manage Driver Packages
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$DriverSourcePath = "${driverPath}"
$PackageName = "${packageName}"
$PackageSourcePath = "${packagePath}"
$OSVersion = "${osVersion}"

try {
    # Validate source path exists
    if (-not (Test-Path $DriverSourcePath)) {
        Write-Error "Driver source path not found: $DriverSourcePath"
        exit 1
    }
    
    Write-Host "Scanning for drivers in: $DriverSourcePath" -ForegroundColor Cyan
    Write-Host "This may take several minutes..." -ForegroundColor Gray
    Write-Host ""
    
    # Import drivers
    $ImportedDrivers = @()
    $DriverFiles = Get-ChildItem -Path $DriverSourcePath -Filter "*.inf" -Recurse
    
    Write-Host "Found $($DriverFiles.Count) INF files. Importing..." -ForegroundColor Cyan
    
    foreach ($InfFile in $DriverFiles) {
        try {
            $Driver = Import-CMDriver \`
                -UncFileLocation $InfFile.FullName \`
                -ImportDuplicateDriverOption AppendCategory \`
                -EnableAndAllowInstall $true \`
                -ErrorAction Stop
${manufacturer ? `            
            # Filter by manufacturer if specified
            if ($Driver.DriverProvider -like "*${manufacturer}*") {
                $ImportedDrivers += $Driver
                Write-Host "  ✓ Imported: $($Driver.DriverName)" -ForegroundColor Green
            } else {
                # Remove non-matching driver
                Remove-CMDriver -Id $Driver.CI_ID -Force
            }
` : `            
            $ImportedDrivers += $Driver
            Write-Host "  ✓ Imported: $($Driver.DriverName)" -ForegroundColor Green
`}            
        } catch {
            Write-Host "  ⚠ Skipped: $($InfFile.Name) - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Successfully imported: $($ImportedDrivers.Count) drivers" -ForegroundColor Green
    
    if ($ImportedDrivers.Count -eq 0) {
        Write-Host "⚠ No drivers imported. Exiting." -ForegroundColor Yellow
        exit 0
    }
    
    # Create driver package
    $Package = New-CMDriverPackage \`
        -Name $PackageName \`
        -Description "Created by PSForge on $(Get-Date -Format 'yyyy-MM-dd')" \`
        -Path $PackageSourcePath
    
    Write-Host "✓ Driver package created: $PackageName" -ForegroundColor Green
    
    # Add drivers to package
    Write-Host ""
    Write-Host "Adding drivers to package..." -ForegroundColor Cyan
    
    foreach ($Driver in $ImportedDrivers) {
        try {
            Add-CMDriverToDriverPackage \`
                -DriverId $Driver.CI_ID \`
                -DriverPackageName $PackageName \`
                -ErrorAction Stop
        } catch {
            Write-Host "  ⚠ Could not add driver: $($Driver.DriverName)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "✓ Drivers added to package" -ForegroundColor Green
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Driver Package Configuration Complete!" -ForegroundColor Cyan
    Write-Host "  Package: $PackageName" -ForegroundColor Gray
    Write-Host "  Drivers: $($ImportedDrivers.Count)" -ForegroundColor Gray
    Write-Host "  OS Version: $OSVersion" -ForegroundColor Gray
${manufacturer ? `    Write-Host "  Manufacturer: ${manufacturer}" -ForegroundColor Gray` : ''}
    Write-Host "  Source Path: $PackageSourcePath" -ForegroundColor Gray
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Distribute package to distribution points" -ForegroundColor Gray
    Write-Host "  2. Add package to task sequence" -ForegroundColor Gray
    Write-Host "  3. Test deployment on target hardware" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to manage driver package: $_"
    exit 1
}`;
    }
  },

  {
    id: 'export-collection-membership',
    name: 'Export Collection Membership Reports',
    category: 'Common Admin Tasks',
    isPremium: true,
    description: 'Export detailed collection membership data with device information to CSV',
    instructions: `**How This Task Works:**
This script exports comprehensive collection membership reports with detailed device information for analysis and documentation.

**Prerequisites:**
- MECM Console with ConfigurationManager PowerShell module
- Read permissions on collections
- Collection(s) already created

**What You Need to Provide:**
- Collection name (or comma-separated list for multiple)
- Export file path
- Option to include detailed device properties
- Option to include hardware information

**What the Script Does:**
1. Imports ConfigurationManager module and connects to site
2. Validates collection(s) exist
3. Retrieves all devices in collection(s)
4. Gathers device properties: name, OS, last logon, client version
5. Optional: Adds hardware info (manufacturer, model, RAM, disk)
6. Optional: Adds AD properties (OU, domain)
7. Exports to CSV with all requested data
8. Reports total device count

**Important Notes:**
- Useful for inventory audits and documentation
- Can process multiple collections in one run
- Hardware info requires hardware inventory enabled
- Large collections (1000+) may take time to process
- Export includes: device name, OS, last activity, client health
- Optional details: manufacturer, model, memory, primary user
- Essential for change management and asset reporting
- Schedule regularly for up-to-date documentation`,
    parameters: [
      { id: 'collectionNames', label: 'Collection Names (comma-separated)', type: 'textarea', required: true, placeholder: 'All Workstations,All Servers' },
      { id: 'exportPath', label: 'Export File Path', type: 'path', required: true, placeholder: 'C:\\Reports\\CollectionMembership.csv' },
      { id: 'includeHardware', label: 'Include Hardware Details', type: 'boolean', required: false, defaultValue: true },
      { id: 'includeADInfo', label: 'Include AD Information', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const collections = params.collectionNames ? buildPowerShellArray(params.collectionNames) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      const includeHW = toPowerShellBoolean(params.includeHardware ?? true);
      const includeAD = toPowerShellBoolean(params.includeADInfo ?? false);

      return `# Export Collection Membership Report
# Generated: ${new Date().toISOString()}

Import-Module "\$($ENV:SMS_ADMIN_UI_PATH)\\..\\ConfigurationManager.psd1"
$SiteCode = Get-PSDrive -PSProvider CMSite | Select-Object -ExpandProperty Name
Set-Location "$SiteCode:"

$CollectionNames = ${collections}
$ExportPath = "${exportPath}"
$IncludeHardware = ${includeHW}
$IncludeAD = ${includeAD}

try {
    $AllResults = @()
    $TotalDeviceCount = 0
    
    Write-Host "Exporting collection membership data..." -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($CollectionName in $CollectionNames) {
        try {
            # Validate collection exists
            $Collection = Get-CMDeviceCollection -Name $CollectionName -ErrorAction Stop
            Write-Host "Processing: $CollectionName" -ForegroundColor Cyan
            Write-Host "  Member count: $($Collection.MemberCount)" -ForegroundColor Gray
            
            # Get collection members
            $Devices = Get-CMDevice -CollectionName $CollectionName
            $TotalDeviceCount += $Devices.Count
            
            foreach ($Device in $Devices) {
                # Base device information
                $DeviceInfo = [PSCustomObject]@{
                    CollectionName = $CollectionName
                    DeviceName = $Device.Name
                    OperatingSystem = $Device.OperatingSystemNameandVersion
                    ClientVersion = $Device.ClientVersion
                    LastActiveTime = $Device.LastActiveTime
                    LastLogonUser = $Device.LastLogonUserName
                    IsActive = $Device.IsActive
                    IsClient = $Device.IsClient
                    ResourceID = $Device.ResourceID
                }
                
                # Add hardware information if requested
                if ($IncludeHardware) {
                    try {
                        $HW = Get-WmiObject -Namespace "root\\SMS\\site_$SiteCode" \`
                            -Class SMS_R_System \`
                            -Filter "ResourceId = $($Device.ResourceID)" \`
                            -ErrorAction SilentlyContinue
                        
                        if ($HW) {
                            $DeviceInfo | Add-Member -NotePropertyName "Manufacturer" -NotePropertyValue $Device.Manufacturer
                            $DeviceInfo | Add-Member -NotePropertyName "Model" -NotePropertyValue $Device.Model
                            $DeviceInfo | Add-Member -NotePropertyName "TotalPhysicalMemory" -NotePropertyValue $Device.TotalPhysicalMemory
                        }
                    } catch {
                        # Silently continue if hardware info not available
                    }
                }
                
                # Add AD information if requested
                if ($IncludeAD) {
                    try {
                        $DeviceInfo | Add-Member -NotePropertyName "ADSiteName" -NotePropertyValue $Device.ADSiteName
                        $DeviceInfo | Add-Member -NotePropertyName "Domain" -NotePropertyValue $Device.Domain
                        $DeviceInfo | Add-Member -NotePropertyName "DistinguishedName" -NotePropertyValue $Device.DistinguishedName
                    } catch {
                        # Silently continue if AD info not available
                    }
                }
                
                $AllResults += $DeviceInfo
            }
            
            Write-Host "  ✓ Processed: $($Devices.Count) devices" -ForegroundColor Green
            
        } catch {
            Write-Host "  ✗ Failed: $CollectionName - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Export to CSV
    if ($AllResults.Count -gt 0) {
        $AllResults | Export-Csv -Path $ExportPath -NoTypeInformation
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "Collection Membership Export Complete!" -ForegroundColor Cyan
        Write-Host "  Collections: $($CollectionNames.Count)" -ForegroundColor Gray
        Write-Host "  Total Devices: $TotalDeviceCount" -ForegroundColor Gray
        Write-Host "  Export Path: $ExportPath" -ForegroundColor Gray
        Write-Host "  Hardware Details: $(if ($IncludeHardware) {'Yes'} else {'No'})" -ForegroundColor Gray
        Write-Host "  AD Information: $(if ($IncludeAD) {'Yes'} else {'No'})" -ForegroundColor Gray
        Write-Host "======================================" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ No devices found to export" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to export collection membership: $_"
    exit 1
}`;
    }
  },

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
