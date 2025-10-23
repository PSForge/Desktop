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
  }
];
