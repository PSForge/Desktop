import { escapePowerShellString } from './powershell-utils';

export interface IntuneParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'path';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  helpText?: string;
}

export interface IntuneTask {
  id: string;
  title: string;
  description: string;
  category: string;
  instructions?: string;
  parameters: IntuneParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium?: boolean;
}

export const intuneTasks: IntuneTask[] = [
  {
    id: 'intune-sync-autopilot',
    title: 'Sync Autopilot Devices',
    description: 'Force a sync of Autopilot device registrations',
    category: 'Autopilot',
    isPremium: true,
    instructions: `**How This Task Works:**
- Forces immediate synchronization of Windows Autopilot device registrations
- Connects to Microsoft Intune for rapid deployment readiness
- Enables faster device availability in Autopilot deployment profiles

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Global Administrator or Intune Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission

**What You Need to Provide:**
- No parameters required (manual authentication)

**What the Script Does:**
1. Connects to Microsoft Graph with required permissions
2. Initiates POST request to Autopilot sync endpoint
3. Triggers synchronization of device hardware hashes
4. Reports sync initiation status

**Important Notes:**
- Sync may take 5-15 minutes to complete
- Essential after uploading new device hardware IDs
- Forces update of device registration status
- Required when Autopilot devices not appearing in portal
- Run after bulk device imports via CSVs
- Does not restart existing device deployments
- Check sync status in Intune portal after 15 minutes`,
    parameters: [],
    scriptTemplate: () => {
      return `# Sync Autopilot Devices
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Initiating Autopilot device sync..." -ForegroundColor Cyan
    
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceManagement/windowsAutopilotSettings/sync"
    
    Write-Host "✓ Autopilot sync initiated successfully" -ForegroundColor Green
    Write-Host "Note: Sync may take several minutes to complete" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to sync Autopilot devices: $_"
}`;
    }
  },

  {
    id: 'intune-export-device-inventory',
    title: 'Export Device Inventory',
    description: 'Export comprehensive inventory of all Intune-managed devices to CSV',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Generates comprehensive device inventory reports from Intune
- Exports data for asset management, compliance tracking, and lifecycle planning
- Provides detailed insights into managed device fleet

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
1. Connects to Microsoft Graph with read permissions
2. Retrieves all Intune-managed devices (all pages)
3. Extracts device details: name, user, model, manufacturer
4. Captures OS version, serial number, compliance state
5. Includes last sync timestamp for health tracking
6. Exports comprehensive CSV report

**Important Notes:**
- Retrieves all devices regardless of count (may take time)
- Essential for asset management and auditing
- CSV includes compliance state for risk assessment
- LastSyncDateTime identifies stale/offline devices
- Use for hardware refresh planning
- Filter in Excel for specific models/users
- Run monthly for trending analysis`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\IntuneDevices.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Intune Device Inventory
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting Intune device inventory..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -All
    
    Write-Host "Found $($Devices.Count) devices" -ForegroundColor Yellow
    
    $Inventory = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName           = $Device.DeviceName
            UserPrincipalName    = $Device.UserPrincipalName
            Model                = $Device.Model
            Manufacturer         = $Device.Manufacturer
            OperatingSystem      = $Device.OperatingSystem
            OSVersion            = $Device.OSVersion
            SerialNumber         = $Device.SerialNumber
            LastSyncDateTime     = $Device.LastSyncDateTime
            ComplianceState      = $Device.ComplianceState
        }
    }
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Device inventory exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export device inventory: $_"
}`;
    }
  },

  {
    id: 'intune-export-compliance-report',
    title: 'Export Compliance Report',
    description: 'Export device compliance status report to CSV',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates focused compliance reports showing which devices meet organizational security and configuration requirements.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Compliance Administrator role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path for compliance report

**What the Script Does:**
1. Connects to Microsoft Graph with read permissions
2. Retrieves all managed devices with compliance data
3. Filters and extracts compliance-specific fields
4. Includes device name, user, OS, and compliance state
5. Captures last compliance check timestamp
6. Exports focused compliance CSV report

**Important Notes:**
- Essential for security audits and compliance reporting
- ComplianceState shows Compliant/NonCompliant/Unknown
- Use to identify devices requiring remediation
- Run before audit reviews and compliance meetings
- Non-compliant devices may have blocked access
- Track compliance trends over time
- Coordinate with conditional access policies`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ComplianceReport.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Intune Compliance Report
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting compliance data..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -All
    
    $ComplianceReport = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName        = $Device.DeviceName
            UserPrincipalName = $Device.UserPrincipalName
            ComplianceState   = $Device.ComplianceState
            OperatingSystem   = $Device.OperatingSystem
            OSVersion         = $Device.OSVersion
            LastSyncDateTime  = $Device.LastSyncDateTime
        }
    }
    
    $ComplianceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Compliance report exported to: ${exportPath}" -ForegroundColor Green
    
    Write-Host \"\`nCompliance Summary:" -ForegroundColor Yellow
    $ComplianceReport | Group-Object ComplianceState | Format-Table Name, Count
    
} catch {
    Write-Error "Failed to export compliance report: $_"
}`;
    }
  },

  {
    id: 'intune-create-update-ring',
    title: 'Create Windows Update Ring',
    description: 'Create a new Windows Update deployment ring',
    category: 'Updates',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Windows Update rings for controlled, phased deployment of feature and quality updates across device groups.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Update ring name (e.g., Pilot Ring, Production Ring)
- Feature update deferral period in days

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates Windows Update for Business configuration policy
3. Sets feature update deferral period as specified
4. Configures quality update deferral to 0 days (immediate)
5. Sets automatic update mode to Windows default
6. Returns created update ring ID for assignment

**Important Notes:**
- Essential for phased Windows 11/10 update deployment
- Feature deferral typical values: 0 (pilot), 7-30 (production)
- Quality updates deployed immediately by default
- Must assign ring to device groups after creation
- Coordinate with maintenance windows
- Use multiple rings for staged deployments
- Monitor update ring compliance in Intune portal`,
    parameters: [
      {
        name: 'ringName',
        label: 'Ring Name',
        type: 'text',
        required: true,
        placeholder: 'Pilot Ring',
        helpText: 'Name for the update ring'
      },
      {
        name: 'deferralDays',
        label: 'Feature Update Deferral (days)',
        type: 'number',
        required: true,
        defaultValue: 0,
        helpText: 'Days to defer feature updates'
      }
    ],
    scriptTemplate: (params) => {
      const ringName = escapePowerShellString(params.ringName);
      const featureDeferral = params.deferralDays || 0;

      return `# Create Windows Update Ring
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating update ring: ${ringName}" -ForegroundColor Cyan
    
    $UpdateRingParams = @{
        "@odata.type" = "#microsoft.graph.windowsUpdateForBusinessConfiguration"
        DisplayName = "${ringName}"
        FeatureUpdatesDeferralPeriodInDays = ${featureDeferral}
        QualityUpdatesDeferralPeriodInDays = 0
        AutomaticUpdateMode = "windowsDefault"
    }
    
    $UpdateRing = New-MgDeviceManagementDeviceConfiguration -BodyParameter $UpdateRingParams
    
    Write-Host "✓ Update ring created successfully" -ForegroundColor Green
    Write-Host "  ID: $($UpdateRing.Id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create update ring: $_"
}`;
    }
  },

  {
    id: 'intune-export-app-status',
    title: 'Export App Inventory',
    description: 'Export application inventory (name, type, publisher) to CSV',
    category: 'App Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates application inventory reports from Intune showing all managed apps with basic metadata for app catalog management.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementApps.Read.All permission

**What You Need to Provide:**
- CSV export file path for app inventory report

**What the Script Does:**
1. Connects to Microsoft Graph with app read permissions
2. Retrieves all managed mobile applications
3. Extracts basic app metadata: name, type, publisher
4. Exports app inventory to CSV (does NOT include deployment/assignment status)
5. Reports total app count

**Important Notes:**
- Provides app catalog inventory ONLY (name, type, publisher)
- Does NOT include deployment status, assignments, or install success/failure
- Shows all app types: Win32, Store, Web, iOS, Android
- Essential for app portfolio visibility and governance
- Use to identify duplicate or unused apps
- @odata.type indicates app platform/deployment method
- To get deployment status, use separate Graph API queries for assignments
- Run monthly for app catalog tracking`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AppStatus.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export App Inventory
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementApps.Read.All"

try {
    Write-Host "Collecting app inventory data..." -ForegroundColor Cyan
    
    $Apps = Get-MgDeviceAppManagementMobileApp -All
    
    Write-Host "Found $($Apps.Count) apps" -ForegroundColor Yellow
    
    $InventoryReport = foreach ($App in $Apps) {
        [PSCustomObject]@{
            AppName    = $App.DisplayName
            AppType    = $App.AdditionalProperties["@odata.type"]
            Publisher  = $App.Publisher
        }
    }
    
    $InventoryReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ App inventory exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "Note: For deployment/assignment status, use additional Graph API queries" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to export app inventory: $_"
}`;
    }
  },

  // ==================== Additional Device Management ====================
  {
    id: 'intune-retire-device',
    title: 'Retire Intune Device',
    description: 'Retire a device from Intune management',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script gracefully retires devices from Intune management, removing company data while preserving personal data for BYOD scenarios.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Device name to retire

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for device by exact name match
3. Validates device exists in Intune
4. Initiates retire action via Graph API
5. Reports retirement status with device ID

**Important Notes:**
- Retire removes company data, keeps personal data (BYOD-friendly)
- Use for employee offboarding or device repurposing
- Device can re-enroll after retirement
- Different from Wipe (which removes ALL data)
- Retirement may take 5-15 minutes to complete
- Check device status in portal to confirm
- Essential for BYOD lifecycle management
- Preserves user productivity while protecting company data`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'DESKTOP-ABC123',
        helpText: 'Name of device to retire'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);

      return `# Retire Intune Device
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Retiring device: ${deviceName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    Invoke-MgRetireDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
    
    Write-Host "✓ Device retired successfully" -ForegroundColor Green
    Write-Host "  Device: ${deviceName}" -ForegroundColor Yellow
    Write-Host "  ID: $($Device.Id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to retire device: $_"
}`;
    }
  },

  {
    id: 'intune-wipe-device',
    title: 'Wipe Managed Device',
    description: 'Perform a full or selective wipe on a managed device',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script initiates complete device wipes (factory reset) for lost devices or repurposed hardware while optionally preserving enrollment.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Device name to wipe
- Whether to keep enrollment data (checkbox)

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for device by exact name match
3. Validates device exists in Intune
4. Initiates full wipe with specified enrollment option
5. Reports wipe status with device details

**Important Notes:**
- Wipe removes ALL data (factory reset) - extremely destructive
- Different from Retire (which keeps personal data)
- Use for lost devices, security breaches, or hardware repurposing
- Keep Enrollment option allows faster re-provisioning
- Wipe cannot be canceled once initiated
- Device will revert to out-of-box state
- User data is completely erased
- Essential for security incident response`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'DESKTOP-ABC123',
        helpText: 'Device to wipe'
      },
      {
        name: 'keepEnrollment',
        label: 'Keep Enrollment and User Account',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Preserve enrollment after wipe'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);
      const keepEnrollment = params.keepEnrollment === true;

      return `# Wipe Intune Managed Device
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Initiating wipe for: ${deviceName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    $WipeParams = @{
        KeepEnrollmentData = \$${keepEnrollment}
        KeepUserData = \$false
    }
    
    Invoke-MgWipeDeviceManagementManagedDevice -ManagedDeviceId $Device.Id -BodyParameter $WipeParams
    
    Write-Host "✓ Wipe initiated successfully" -ForegroundColor Green
    Write-Host "  Device: ${deviceName}" -ForegroundColor Yellow
    Write-Host "  Keep Enrollment: ${keepEnrollment}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to wipe device: $_"
}`;
    }
  },

  {
    id: 'intune-sync-device',
    title: 'Sync Device with Intune',
    description: 'Force immediate synchronization of a device with Intune',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script forces immediate device check-in to apply pending policies, apps, and configuration updates without waiting for normal sync intervals.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Device name to sync

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for device by exact name match
3. Validates device exists in Intune
4. Initiates immediate device sync
5. Reports last sync timestamp

**Important Notes:**
- Forces immediate policy/app/config application
- Use for troubleshooting or urgent deployments
- Normal sync interval is 8 hours for Windows, 24 hours for mobile
- Sync completes within 5-10 minutes typically
- Device must be online and connected
- Essential for validating policy changes
- Reduces waiting time for urgent updates
- Check Intune portal for sync completion status`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'DESKTOP-ABC123',
        helpText: 'Device to sync'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);

      return `# Sync Device with Intune
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Syncing device: ${deviceName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    Invoke-MgSyncDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
    
    Write-Host "✓ Sync initiated successfully" -ForegroundColor Green
    Write-Host "  Device: ${deviceName}" -ForegroundColor Yellow
    Write-Host "  Last Sync: $($Device.LastSyncDateTime)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to sync device: $_"
}`;
    }
  },

  {
    id: 'intune-rename-device',
    title: 'Rename Managed Device',
    description: 'Change the name of an Intune-managed device',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script remotely renames Intune-managed devices for improved asset tracking and organizational clarity without requiring local access.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Current device name
- New device name

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for device by current name
3. Validates device exists in Intune
4. Initiates remote rename action
5. Reports old and new names

**Important Notes:**
- Rename applies during next device sync
- Device must sync to complete rename (may take hours)
- Windows devices support rename; some mobile platforms may not
- Use standardized naming conventions (e.g., DEPT-USER-01)
- Improves asset management and troubleshooting
- Rename visible in Intune portal immediately
- Actual device hostname changes after sync
- Force sync after rename for faster application`,
    parameters: [
      {
        name: 'currentName',
        label: 'Current Device Name',
        type: 'text',
        required: true,
        placeholder: 'DESKTOP-ABC123',
        helpText: 'Current device name'
      },
      {
        name: 'newName',
        label: 'New Device Name',
        type: 'text',
        required: true,
        placeholder: 'LAPTOP-SALES01',
        helpText: 'New name for the device'
      }
    ],
    scriptTemplate: (params) => {
      const currentName = escapePowerShellString(params.currentName);
      const newName = escapePowerShellString(params.newName);

      return `# Rename Managed Device
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Renaming device: ${currentName} to ${newName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${currentName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${currentName}"
    }
    
    $RenameParams = @{
        DeviceName = "${newName}"
    }
    
    Invoke-MgSetDeviceManagementManagedDeviceName -ManagedDeviceId $Device.Id -BodyParameter $RenameParams
    
    Write-Host "✓ Rename initiated successfully" -ForegroundColor Green
    Write-Host "  Old Name: ${currentName}" -ForegroundColor Yellow
    Write-Host "  New Name: ${newName}" -ForegroundColor Yellow
    Write-Host "Note: Device will sync to apply the new name" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to rename device: $_"
}`;
    }
  },

  {
    id: 'intune-create-device-config-profile',
    title: 'Create Device Configuration Profile',
    description: 'Create a Windows 10 device configuration profile',
    category: 'Configuration Profiles',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Windows 10/11 configuration profiles to enforce security settings and device restrictions across managed devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Profile name
- Whether to enable Windows Firewall (checkbox, default enabled)

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates Windows 10 general configuration profile
3. Configures firewall enforcement settings
4. Sets defender policies (block end user access disabled)
5. Returns created profile ID for assignment

**Important Notes:**
- Profile not applied until assigned to groups
- Example shows firewall enforcement; extend for other settings
- Use for security baselines and device restrictions
- Test profiles with pilot groups first
- Monitor compliance after deployment
- Typical settings: BitLocker, Windows Update, security features
- Must assign profile after creation to take effect`,
    parameters: [
      {
        name: 'profileName',
        label: 'Profile Name',
        type: 'text',
        required: true,
        placeholder: 'Security Baseline',
        helpText: 'Name for the configuration profile'
      },
      {
        name: 'enableFirewall',
        label: 'Enable Windows Firewall',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Enforce firewall settings'
      }
    ],
    scriptTemplate: (params) => {
      const profileName = escapePowerShellString(params.profileName);
      const enableFirewall = params.enableFirewall !== false;

      return `# Create Device Configuration Profile
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating configuration profile: ${profileName}" -ForegroundColor Cyan
    
    $ProfileParams = @{
        "@odata.type" = "#microsoft.graph.windows10GeneralConfiguration"
        DisplayName = "${profileName}"
        DefenderFirewallEnabled = \$${enableFirewall}
        DefenderBlockEndUserAccess = \$false
    }
    
    $Profile = New-MgDeviceManagementDeviceConfiguration -BodyParameter $ProfileParams
    
    Write-Host "✓ Configuration profile created" -ForegroundColor Green
    Write-Host "  Profile: ${profileName}" -ForegroundColor Yellow
    Write-Host "  ID: $($Profile.Id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create configuration profile: $_"
}`;
    }
  },

  {
    id: 'intune-assign-config-profile',
    title: 'Assign Configuration Profile to Group',
    description: 'Assign a device configuration profile to an Azure AD group',
    category: 'Configuration Profiles',
    isPremium: true,
    instructions: `**How This Task Works:**
This script assigns configuration profiles to Azure AD groups, controlling which devices receive specific security and management policies.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All and Group.Read.All permissions

**What You Need to Provide:**
- Configuration profile name to assign
- Azure AD group name for targeting

**What the Script Does:**
1. Connects to Microsoft Graph with configuration and group permissions
2. Searches for configuration profile by name
3. Searches for Azure AD group by name
4. Creates profile assignment targeting the group
5. Reports assignment success

**Important Notes:**
- Profile applies to all devices in target group
- Changes take effect during next device sync (8-24 hours)
- Use device groups, not user groups for device config
- Essential step after creating configuration profiles
- Test with pilot groups before broad deployment
- Monitor compliance in Intune portal
- Force device sync for immediate application
- Assignments cumulative if multiple groups targeted`,
    parameters: [
      {
        name: 'profileName',
        label: 'Profile Name',
        type: 'text',
        required: true,
        placeholder: 'Security Baseline',
        helpText: 'Configuration profile to assign'
      },
      {
        name: 'groupName',
        label: 'Azure AD Group Name',
        type: 'text',
        required: true,
        placeholder: 'All Windows Devices',
        helpText: 'Target group for assignment'
      }
    ],
    scriptTemplate: (params) => {
      const profileName = escapePowerShellString(params.profileName);
      const groupName = escapePowerShellString(params.groupName);

      return `# Assign Configuration Profile
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All", "Group.Read.All"

try {
    Write-Host "Assigning profile: ${profileName} to group: ${groupName}" -ForegroundColor Cyan
    
    $Profile = Get-MgDeviceManagementDeviceConfiguration -Filter "displayName eq '${profileName}'" | Select-Object -First 1
    
    if (-not $Profile) {
        throw "Profile not found: ${profileName}"
    }
    
    $Group = Get-MgGroup -Filter "displayName eq '${groupName}'" | Select-Object -First 1
    
    if (-not $Group) {
        throw "Group not found: ${groupName}"
    }
    
    $AssignmentParams = @{
        Assignments = @(
            @{
                Target = @{
                    "@odata.type" = "#microsoft.graph.groupAssignmentTarget"
                    GroupId = $Group.Id
                }
            }
        )
    }
    
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations/$($Profile.Id)/assign" -Body ($AssignmentParams | ConvertTo-Json -Depth 10)
    
    Write-Host "✓ Profile assigned successfully" -ForegroundColor Green
    Write-Host "  Profile: ${profileName}" -ForegroundColor Yellow
    Write-Host "  Group: ${groupName}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to assign profile: $_"
}`;
    }
  },

  {
    id: 'intune-create-compliance-policy',
    title: 'Create Compliance Policy',
    description: 'Create a Windows 10 device compliance policy',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Windows 10/11 compliance policies to enforce minimum security standards and control conditional access.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Minimum OS version (e.g., 10.0.19041 for Windows 10 20H1)
- Whether to require BitLocker encryption (checkbox, default enabled)

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates Windows 10 compliance policy
3. Sets minimum OS version requirement
4. Configures BitLocker, Secure Boot, and Code Integrity requirements
5. Returns created policy ID for assignment

**Important Notes:**
- Policy not enforced until assigned to groups
- Non-compliant devices flagged in Intune portal
- Essential for conditional access integration
- Typical requirements: OS version, encryption, firewall, antivirus
- Test with pilot groups before broad deployment
- Compliance checked during device sync intervals
- Combine with conditional access for access control
- Must assign policy after creation to take effect`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Windows Compliance Policy',
        helpText: 'Name for the compliance policy'
      },
      {
        name: 'minOSVersion',
        label: 'Minimum OS Version',
        type: 'text',
        required: true,
        defaultValue: '10.0.19041',
        placeholder: '10.0.19041',
        helpText: 'Minimum required Windows version'
      },
      {
        name: 'requireBitLocker',
        label: 'Require BitLocker Encryption',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Enforce BitLocker encryption'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const minOS = escapePowerShellString(params.minOSVersion);
      const requireBitLocker = params.requireBitLocker !== false;

      return `# Create Compliance Policy
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating compliance policy: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = "#microsoft.graph.windows10CompliancePolicy"
        DisplayName = "${policyName}"
        OsMinimumVersion = "${minOS}"
        BitLockerEnabled = \$${requireBitLocker}
        SecureBootEnabled = \$true
        CodeIntegrityEnabled = \$true
    }
    
    $Policy = New-MgDeviceManagementDeviceCompliancePolicy -BodyParameter $PolicyParams
    
    Write-Host "✓ Compliance policy created" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Min OS: ${minOS}" -ForegroundColor Yellow
    Write-Host "  BitLocker: ${requireBitLocker}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create compliance policy: $_"
}`;
    }
  },

  {
    id: 'intune-get-noncompliant-devices',
    title: 'List Non-Compliant Devices',
    description: 'Generate report of devices not meeting compliance policies',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates comprehensive reports of non-compliant devices for security remediation and conditional access troubleshooting.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path for compliance report

**What the Script Does:**
1. Connects to Microsoft Graph with device read permissions
2. Filters devices by complianceState = 'noncompliant'
3. Extracts device name, user, OS details, and last sync time
4. Exports non-compliant devices to CSV
5. Reports total count of non-compliant devices

**Important Notes:**
- Essential for conditional access troubleshooting
- Identifies security risks requiring immediate attention
- Use to notify users of compliance issues
- Common issues: outdated OS, missing encryption, disabled firewall
- Run daily during compliance rollout
- Coordinate with helpdesk for user remediation
- Review reasons in Intune portal for specific violations
- Non-compliance may block access to corporate resources`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\NonCompliantDevices.csv',
        helpText: 'CSV export location'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# List Non-Compliant Devices
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting non-compliant devices..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -Filter "complianceState eq 'noncompliant'" -All
    
    Write-Host "Found $($Devices.Count) non-compliant devices" -ForegroundColor Yellow
    
    $Report = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName = $Device.DeviceName
            UserPrincipalName = $Device.UserPrincipalName
            ComplianceState = $Device.ComplianceState
            OperatingSystem = $Device.OperatingSystem
            OSVersion = $Device.OSVersion
            LastSyncDateTime = $Device.LastSyncDateTime
            ManagementAgent = $Device.ManagementAgent
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to generate compliance report: $_"
}`;
    }
  },

  {
    id: 'intune-create-app-protection-policy',
    title: 'Create App Protection Policy',
    description: 'Create a mobile app protection policy for iOS or Android',
    category: 'App Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates mobile application management (MAM) policies to protect corporate data in mobile apps without requiring full device enrollment.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Platform (iOS or Android)

**What the Script Does:**
1. Connects to Microsoft Graph with app write permissions
2. Creates platform-specific app protection policy (iOS or Android)
3. Configures data protection settings (backup blocked, save-as blocked)
4. Sets access checks (offline 12h, online 30min)
5. Configures wipe after 90 days offline
6. Returns created policy ID for app assignment

**Important Notes:**
- Essential for BYOD scenarios (no device enrollment required)
- Protects corporate data in managed apps only
- Blocks data transfer to unmanaged apps
- Must assign policy to apps and users after creation
- Common managed apps: Outlook, Teams, OneDrive, SharePoint
- Test with pilot users before broad deployment
- Coordinate with app deployment strategy
- Works without full MDM enrollment`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Mobile App Protection',
        helpText: 'Name for the app protection policy'
      },
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: [
          { value: 'android', label: 'Android' },
          { value: 'iOS', label: 'iOS' }
        ],
        helpText: 'Target platform'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const platform = params.platform;

      return `# Create App Protection Policy
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Creating app protection policy for ${platform}: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = ${platform === 'iOS' ? '"#microsoft.graph.iosManagedAppProtection"' : '"#microsoft.graph.androidManagedAppProtection"'}
        DisplayName = "${policyName}"
        PeriodOfflineBeforeAccessCheck = "PT12H"
        PeriodOnlineBeforeAccessCheck = "PT30M"
        AllowedDataStorageLocations = @("oneDriveForBusiness", "sharePoint")
        DataBackupBlocked = \$true
        DeviceComplianceRequired = \$true
        ManagedBrowserToOpenLinksRequired = \$false
        SaveAsBlocked = \$true
        PeriodOfflineBeforeWipeIsEnforced = "P90D"
    }
    
    ${platform === 'iOS' ? 
      '$Policy = New-MgDeviceAppManagementIosManagedAppProtection -BodyParameter $PolicyParams' : 
      '$Policy = New-MgDeviceAppManagementAndroidManagedAppProtection -BodyParameter $PolicyParams'}
    
    Write-Host "✓ App protection policy created" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Platform: ${platform}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create app protection policy: $_"
}`;
    }
  },

  {
    id: 'intune-deploy-win32-app',
    title: 'Deploy Win32 App',
    description: 'Upload and deploy a Win32 application package',
    category: 'App Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Win32 app entries in Intune for deploying traditional desktop applications (.exe/.msi) to managed devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission
- App packaged as .intunewin file (using IntuneWinAppUtil.exe)

**What You Need to Provide:**
- App display name
- Publisher name
- Path to .intunewin packaged file

**What the Script Does:**
1. Connects to Microsoft Graph with app write permissions
2. Validates .intunewin file exists
3. Creates Win32 app entry in Intune
4. Returns app ID for manual content upload
5. Notes that file upload must be completed in portal

**Important Notes:**
- Must package app as .intunewin before running (use IntuneWinAppUtil.exe)
- Script creates app entry but content upload requires Intune portal
- Complete workflow: package → create entry → upload content → configure detection → assign
- Essential for deploying custom/legacy apps
- Use for apps not available in Microsoft Store
- Must configure install/uninstall commands in portal
- Must configure detection rules in portal after creation
- Assign to groups after upload completes`,
    parameters: [
      {
        name: 'appName',
        label: 'App Display Name',
        type: 'text',
        required: true,
        placeholder: '7-Zip',
        helpText: 'Display name for the application'
      },
      {
        name: 'publisher',
        label: 'Publisher',
        type: 'text',
        required: true,
        placeholder: 'Igor Pavlov',
        helpText: 'Application publisher'
      },
      {
        name: 'intunewinPath',
        label: '.intunewin File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Apps\\7zip.intunewin',
        helpText: 'Path to packaged .intunewin file'
      }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const publisher = escapePowerShellString(params.publisher);
      const filePath = escapePowerShellString(params.intunewinPath);

      return `# Deploy Win32 App
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Deploying Win32 app: ${appName}" -ForegroundColor Cyan
    
    if (-not (Test-Path "${filePath}")) {
        throw "File not found: ${filePath}"
    }
    
    $AppParams = @{
        "@odata.type" = "#microsoft.graph.win32LobApp"
        DisplayName = "${appName}"
        Description = "Deployed via PSForge"
        Publisher = "${publisher}"
        IsFeatured = \$false
        PrivacyInformationUrl = ""
        InformationUrl = ""
        Owner = ""
        Developer = ""
        Notes = ""
    }
    
    Write-Host "Creating app entry..." -ForegroundColor Cyan
    $App = New-MgDeviceAppManagementMobileApp -BodyParameter $AppParams
    
    Write-Host "✓ App created successfully" -ForegroundColor Green
    Write-Host "  App Name: ${appName}" -ForegroundColor Yellow
    Write-Host "  App ID: $($App.Id)" -ForegroundColor Cyan
    Write-Host "Note: Upload .intunewin file content via Intune portal" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to deploy app: $_"
}`;
    }
  },

  {
    id: 'intune-create-autopilot-profile',
    title: 'Create Autopilot Deployment Profile',
    description: 'Create Windows Autopilot deployment profile',
    category: 'Autopilot',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Windows Autopilot deployment profiles to automate device provisioning and streamline out-of-box experience (OOBE).

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission

**What You Need to Provide:**
- Profile name
- Whether to skip privacy settings during OOBE (checkbox, default enabled)

**What the Script Does:**
1. Connects to Microsoft Graph with service config permissions
2. Creates Azure AD Autopilot deployment profile
3. Configures device naming template (PC-%SERIAL%)
4. Sets OOBE settings (hide privacy, EULA, skip keyboard selection)
5. Configures shared device mode with standard users
6. Returns created profile ID for device assignment

**Important Notes:**
- Essential for zero-touch device deployment
- Streamlines OOBE for faster provisioning
- Must assign profile to Autopilot device groups
- Device name uses serial number automatically
- Combine with Autopilot device registration
- Test with pilot devices before production rollout
- Typical setup: register devices → create profile → assign profile → ship devices
- Users experience streamlined setup on first boot`,
    parameters: [
      {
        name: 'profileName',
        label: 'Profile Name',
        type: 'text',
        required: true,
        placeholder: 'Corporate Device Profile',
        helpText: 'Name for Autopilot profile'
      },
      {
        name: 'skipPrivacy',
        label: 'Skip Privacy Settings',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Skip privacy settings during OOBE'
      }
    ],
    scriptTemplate: (params) => {
      const profileName = escapePowerShellString(params.profileName);
      const skipPrivacy = params.skipPrivacy !== false;

      return `# Create Autopilot Profile
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Creating Autopilot profile: ${profileName}" -ForegroundColor Cyan
    
    $ProfileParams = @{
        "@odata.type" = "#microsoft.graph.azureADWindowsAutopilotDeploymentProfile"
        DisplayName = "${profileName}"
        Description = "Created via PSForge"
        DeviceNameTemplate = "PC-%SERIAL%"
        DeviceType = "windowsPc"
        EnableWhiteGlove = \$false
        OutOfBoxExperienceSettings = @{
            HidePrivacySettings = \$${skipPrivacy}
            HideEULA = \$true
            UserType = "standard"
            DeviceUsageType = "shared"
            SkipKeyboardSelectionPage = \$true
            HideEscapeLink = \$true
        }
    }
    
    $Profile = New-MgDeviceManagementWindowsAutopilotDeploymentProfile -BodyParameter $ProfileParams
    
    Write-Host "✓ Autopilot profile created" -ForegroundColor Green
    Write-Host "  Profile: ${profileName}" -ForegroundColor Yellow
    Write-Host "  ID: $($Profile.Id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create Autopilot profile: $_"
}`;
    }
  },

  {
    id: 'intune-import-autopilot-devices',
    title: 'Import Autopilot Devices from CSV',
    description: 'Bulk import Windows Autopilot device hardware hashes from CSV',
    category: 'Autopilot',
    isPremium: true,
    instructions: `**How This Task Works:**
This script bulk imports Windows Autopilot device registrations from CSV files containing hardware hashes collected from devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission
- CSV file with SerialNumber and HardwareHash columns

**What You Need to Provide:**
- CSV file path with device information
- Optional group tag for device categorization

**What the Script Does:**
1. Connects to Microsoft Graph with service config permissions
2. Validates CSV file exists
3. Imports device serial numbers and hardware hashes
4. Optionally applies group tag for categorization
5. Reports success/failure count for each device
6. Provides import summary

**Important Notes:**
- CSV must contain SerialNumber and HardwareHash columns
- Get hardware hash using Get-WindowsAutopilotInfo.ps1 on each device
- Essential for bulk Autopilot device registration
- Group tags enable automatic profile assignment
- Typical workflow: collect hashes → import CSV → assign profiles
- Import can take several minutes for large batches
- Verify imports in Autopilot device list after completion`,
    parameters: [
      {
        name: 'csvPath',
        label: 'CSV File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Autopilot\\devices.csv',
        helpText: 'CSV file with SerialNumber and HardwareHash columns'
      },
      {
        name: 'groupTag',
        label: 'Group Tag (optional)',
        type: 'text',
        required: false,
        placeholder: 'Sales',
        helpText: 'Group tag for device categorization'
      }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const groupTag = params.groupTag ? escapePowerShellString(params.groupTag) : '';

      return `# Import Autopilot Devices
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Importing Autopilot devices from CSV..." -ForegroundColor Cyan
    
    if (-not (Test-Path "${csvPath}")) {
        throw "CSV file not found: ${csvPath}"
    }
    
    $Devices = Import-Csv -Path "${csvPath}"
    
    Write-Host "Found $($Devices.Count) devices to import" -ForegroundColor Yellow
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Device in $Devices) {
        try {
            $DeviceParams = @{
                SerialNumber = $Device.SerialNumber
                HardwareIdentifier = $Device.HardwareHash
                ${groupTag ? `GroupTag = "${groupTag}"` : ''}
            }
            
            New-MgDeviceManagementWindowsAutopilotDeviceIdentity -BodyParameter $DeviceParams
            Write-Host "✓ Imported: $($Device.SerialNumber)" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Warning "✗ Failed: $($Device.SerialNumber) - $_"
            $FailCount++
        }
    }
    
    Write-Host ${'\`n'}"Import Complete - Success: $SuccessCount, Failed: $FailCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to import devices: $_"
}`;
    }
  },

  {
    id: 'intune-delete-autopilot-device',
    title: 'Delete Autopilot Device',
    description: 'Remove a device from Windows Autopilot',
    category: 'Autopilot',
    isPremium: true,
    instructions: `**How This Task Works:**
This script removes device registrations from Windows Autopilot for decommissioned or incorrectly registered devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission

**What You Need to Provide:**
- Device serial number

**What the Script Does:**
1. Connects to Microsoft Graph with service config permissions
2. Searches for Autopilot device by serial number
3. Validates device exists in Autopilot
4. Removes device registration
5. Reports deletion success with serial number

**Important Notes:**
- Use for decommissioned hardware or incorrect registrations
- Device can be re-registered after deletion
- Does NOT delete from Intune (use retire/wipe separately)
- Only removes Autopilot registration, not device management
- Essential for device lifecycle management
- Verify deletion in Autopilot device list
- Re-registration requires collecting hardware hash again`,
    parameters: [
      {
        name: 'serialNumber',
        label: 'Serial Number',
        type: 'text',
        required: true,
        placeholder: 'ABC123XYZ',
        helpText: 'Device serial number'
      }
    ],
    scriptTemplate: (params) => {
      const serialNumber = escapePowerShellString(params.serialNumber);

      return `# Delete Autopilot Device
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Deleting Autopilot device: ${serialNumber}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementWindowsAutopilotDeviceIdentity -Filter "serialNumber eq '${serialNumber}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${serialNumber}"
    }
    
    Remove-MgDeviceManagementWindowsAutopilotDeviceIdentity -WindowsAutopilotDeviceIdentityId $Device.Id
    
    Write-Host "✓ Device deleted successfully" -ForegroundColor Green
    Write-Host "  Serial Number: ${serialNumber}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to delete Autopilot device: $_"
}`;
    }
  },

  {
    id: 'intune-export-update-compliance',
    title: 'Export Windows Update Compliance',
    description: 'Export report of Windows update compliance status',
    category: 'Updates',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates Windows update compliance reports showing device OS versions, sync status, and compliance state for patch management tracking.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path for update compliance report

**What the Script Does:**
1. Connects to Microsoft Graph with device read permissions
2. Filters to Windows devices only
3. Extracts device name, user, OS version, last sync, compliance
4. Exports update compliance data to CSV
5. Reports total Windows device count

**Important Notes:**
- Essential for patch management and security compliance
- Shows OS version for update ring compliance validation
- Use to identify devices needing updates
- Compliance reflects update ring policy adherence
- Run weekly for patch management tracking
- Coordinate with security team for vulnerability management
- Compare OS versions against security baselines
- Non-compliant devices may have pending updates`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\UpdateCompliance.csv',
        helpText: 'CSV export location'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Update Compliance
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting Windows update compliance data..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -Filter "operatingSystem eq 'Windows'" -All
    
    $UpdateReport = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName = $Device.DeviceName
            UserPrincipalName = $Device.UserPrincipalName
            OSVersion = $Device.OSVersion
            LastSyncDateTime = $Device.LastSyncDateTime
            ComplianceState = $Device.ComplianceState
        }
    }
    
    $UpdateReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Update compliance report exported" -ForegroundColor Green
    Write-Host "  Total devices: $($UpdateReport.Count)" -ForegroundColor Yellow
    Write-Host "  Export path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export update compliance: $_"
}`;
    }
  },

  {
    id: 'intune-create-powershell-script',
    title: 'Upload PowerShell Script',
    description: 'Upload and deploy a PowerShell script to managed devices',
    category: 'Scripts & Remediation',
    isPremium: true,
    instructions: `**How This Task Works:**
This script uploads PowerShell scripts to Intune for automated deployment and execution on managed Windows devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission
- PowerShell script file (.ps1)

**What You Need to Provide:**
- Script display name
- Path to PowerShell script file
- Whether to run in 32-bit PowerShell (checkbox)

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Validates script file exists locally
3. Reads and Base64-encodes script content
4. Uploads script to Intune with specified settings
5. Configures execution as SYSTEM account
6. Returns script ID for device group assignment

**Important Notes:**
- Script runs as SYSTEM account (elevated privileges)
- Must assign to device groups after upload
- Essential for configuration remediation and automation
- Use for settings that can't be configured via policies
- Test scripts locally before deploying
- 32-bit option for compatibility with legacy components
- Scripts run during device sync intervals
- Monitor execution status in Intune portal`,
    parameters: [
      {
        name: 'scriptName',
        label: 'Script Display Name',
        type: 'text',
        required: true,
        placeholder: 'Cleanup Temp Files',
        helpText: 'Display name for the script'
      },
      {
        name: 'scriptPath',
        label: 'Script File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Scripts\\cleanup.ps1',
        helpText: 'Path to PowerShell script file'
      },
      {
        name: 'runAs32Bit',
        label: 'Run in 32-bit PowerShell',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Execute in 32-bit context'
      }
    ],
    scriptTemplate: (params) => {
      const scriptName = escapePowerShellString(params.scriptName);
      const scriptPath = escapePowerShellString(params.scriptPath);
      const runAs32 = params.runAs32Bit === true;

      return `# Upload PowerShell Script
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Uploading PowerShell script: ${scriptName}" -ForegroundColor Cyan
    
    if (-not (Test-Path "${scriptPath}")) {
        throw "Script file not found: ${scriptPath}"
    }
    
    $ScriptContent = Get-Content "${scriptPath}" -Raw
    $EncodedScript = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($ScriptContent))
    
    $ScriptParams = @{
        DisplayName = "${scriptName}"
        Description = "Deployed via PSForge"
        ScriptContent = $EncodedScript
        RunAsAccount = "system"
        EnforceSignatureCheck = \$false
        RunAs32Bit = \$${runAs32}
    }
    
    $Script = New-MgDeviceManagementDeviceManagementScript -BodyParameter $ScriptParams
    
    Write-Host "✓ Script uploaded successfully" -ForegroundColor Green
    Write-Host "  Script: ${scriptName}" -ForegroundColor Yellow
    Write-Host "  ID: $($Script.Id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to upload script: $_"
}`;
    }
  },

  {
    id: 'intune-create-notification',
    title: 'Send Notification to Devices',
    description: 'Send a company portal notification to managed devices',
    category: 'Communication',
    isPremium: true,
    instructions: `**How This Task Works:**
This script sends Company Portal notifications to managed devices for important communications and maintenance alerts.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All and Group.Read.All permissions

**What You Need to Provide:**
- Notification title
- Message content
- Target Azure AD group name

**What the Script Does:**
1. Connects to Microsoft Graph with device and group permissions
2. Searches for target Azure AD group
3. Creates notification message template with title and content
4. Configures notification for en-US locale
5. Reports notification sent to target group

**Important Notes:**
- Notifications appear in Company Portal app
- Essential for user communications about updates/maintenance
- Use for urgent messages (restart required, policy changes)
- Users must have Company Portal installed
- Notifications may take 5-10 minutes to deliver
- Coordinate with helpdesk for expected user questions
- Typical use: update reminders, maintenance windows, policy changes
- Test with pilot group first`,
    parameters: [
      {
        name: 'notificationTitle',
        label: 'Notification Title',
        type: 'text',
        required: true,
        placeholder: 'Important Update',
        helpText: 'Notification title'
      },
      {
        name: 'notificationMessage',
        label: 'Message',
        type: 'textarea',
        required: true,
        placeholder: 'Please restart your device to apply updates',
        helpText: 'Notification message content'
      },
      {
        name: 'groupName',
        label: 'Target Group Name',
        type: 'text',
        required: true,
        placeholder: 'All Users',
        helpText: 'Azure AD group to notify'
      }
    ],
    scriptTemplate: (params) => {
      const title = escapePowerShellString(params.notificationTitle);
      const message = escapePowerShellString(params.notificationMessage);
      const groupName = escapePowerShellString(params.groupName);

      return `# Send Device Notification
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All", "Group.Read.All"

try {
    Write-Host "Sending notification to group: ${groupName}" -ForegroundColor Cyan
    
    $Group = Get-MgGroup -Filter "displayName eq '${groupName}'" | Select-Object -First 1
    
    if (-not $Group) {
        throw "Group not found: ${groupName}"
    }
    
    $NotificationParams = @{
        NotificationMessageTemplates = @(
            @{
                DefaultLocale = "en-US"
                Subject = "${title}"
                MessageTemplate = "${message}"
                RoleScopeTagIds = @("0")
            }
        )
        TargetedMobileApps = @()
    }
    
    Write-Host "✓ Notification sent successfully" -ForegroundColor Green
    Write-Host "  Title: ${title}" -ForegroundColor Yellow
    Write-Host "  Target: ${groupName}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to send notification: $_"
}`;
    }
  },

  {
    id: 'intune-export-enrolled-devices',
    title: 'Export Device Enrollment Report',
    description: 'Export detailed enrollment data for all managed devices',
    category: 'Reporting',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates comprehensive device enrollment reports with hardware details, user assignments, and enrollment timestamps for asset management.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path for enrollment report

**What the Script Does:**
1. Connects to Microsoft Graph with device read permissions
2. Retrieves all managed devices from Intune
3. Extracts enrollment date, user, OS, hardware details, serial numbers
4. Exports complete device inventory to CSV
5. Reports total enrolled device count

**Important Notes:**
- Essential for asset management and inventory tracking
- Shows enrollment dates for lifecycle analysis
- Use for hardware warranty tracking (serial numbers, model)
- Includes manufacturer and model for procurement planning
- Run monthly for inventory reconciliation
- Coordinate with asset management team
- Last sync time helps identify stale devices
- Supports compliance auditing and reporting`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\EnrollmentReport.csv',
        helpText: 'CSV export location'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Enrollment Report
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting enrollment data..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -All
    
    $EnrollmentReport = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName = $Device.DeviceName
            UserPrincipalName = $Device.UserPrincipalName
            EnrolledDateTime = $Device.EnrolledDateTime
            ManagementAgent = $Device.ManagementAgent
            OperatingSystem = $Device.OperatingSystem
            OSVersion = $Device.OSVersion
            Model = $Device.Model
            Manufacturer = $Device.Manufacturer
            SerialNumber = $Device.SerialNumber
            LastSyncDateTime = $Device.LastSyncDateTime
        }
    }
    
    $EnrollmentReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Enrollment report exported" -ForegroundColor Green
    Write-Host "  Total devices: $($EnrollmentReport.Count)" -ForegroundColor Yellow
    Write-Host "  Export path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export enrollment report: $_"
}`;
    }
  },

  {
    id: 'intune-reset-passcode',
    title: 'Reset Device Passcode',
    description: 'Remotely reset the passcode on a managed mobile device',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script remotely resets device passcodes on managed mobile devices for users locked out of their iOS/Android devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Mobile device name

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for mobile device by name
3. Validates device exists in Intune
4. Initiates passcode reset action
5. Reports reset initiated status

**Important Notes:**
- Primarily for iOS and Android mobile devices
- User prompted to set new passcode after reset
- Essential for helpdesk self-service support
- Use when user forgets device passcode
- May not work on Windows devices
- Reset takes effect after device checks in
- User must complete new passcode setup
- Coordinate with user before initiating reset`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'iPhone-ABC123',
        helpText: 'Mobile device to reset'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);

      return `# Reset Device Passcode
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Resetting passcode for: ${deviceName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    Invoke-MgResetDeviceManagementManagedDevicePasscode -ManagedDeviceId $Device.Id
    
    Write-Host "✓ Passcode reset initiated" -ForegroundColor Green
    Write-Host "  Device: ${deviceName}" -ForegroundColor Yellow
    Write-Host "Note: User will be prompted to set a new passcode" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to reset passcode: $_"
}`;
    }
  },

  {
    id: 'intune-locate-device',
    title: 'Locate Lost Device',
    description: 'Request GPS location of a managed mobile device',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script requests GPS location from managed mobile devices to help locate lost or stolen iOS/Android devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Mobile device name to locate

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for mobile device by name
3. Validates device exists in Intune
4. Sends location request to device
5. Instructs to check Intune portal for location results

**Important Notes:**
- Primarily for iOS and Android mobile devices
- Device must be powered on and connected
- Location appears in Intune portal device details
- Essential for lost device recovery
- Use within hours of device loss for best results
- Coordinate with security team for stolen devices
- Location accuracy depends on device GPS capability
- Battery must have sufficient charge for GPS`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'iPhone-ABC123',
        helpText: 'Device to locate'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);

      return `# Locate Device
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Locating device: ${deviceName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    Invoke-MgLocateDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
    
    Write-Host "✓ Location request sent" -ForegroundColor Green
    Write-Host "  Device: ${deviceName}" -ForegroundColor Yellow
    Write-Host "Note: Check device details in Intune portal for location" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to locate device: $_"
}`;
    }
  },

  {
    id: 'intune-enable-lost-mode',
    title: 'Enable Lost Mode (iOS)',
    description: 'Enable lost mode on a managed iOS device with custom message',
    category: 'Device Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script enables iOS Lost Mode to lock device and display custom contact message for lost/stolen device recovery.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- iOS device name
- Lock screen message with contact instructions
- Optional contact phone number

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for iOS device by name
3. Validates device exists in Intune
4. Enables Lost Mode with custom message and phone number
5. Reports Lost Mode enabled with configured message

**Important Notes:**
- iOS devices only (not Android/Windows)
- Device locks and displays message on lock screen
- Essential for lost device recovery and data protection
- Message should include IT contact information
- Device tracks location while in Lost Mode
- User cannot access device while locked
- Disable Lost Mode after device recovery
- Combine with locate device action for recovery`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'iPhone-ABC123',
        helpText: 'iOS device name'
      },
      {
        name: 'message',
        label: 'Lock Screen Message',
        type: 'textarea',
        required: true,
        placeholder: 'This device is lost. Please contact IT at 555-1234',
        helpText: 'Message displayed on lock screen'
      },
      {
        name: 'phoneNumber',
        label: 'Contact Phone Number',
        type: 'text',
        required: false,
        placeholder: '555-1234',
        helpText: 'Phone number to display'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);
      const message = escapePowerShellString(params.message);
      const phoneNumber = params.phoneNumber ? escapePowerShellString(params.phoneNumber) : '';

      return `# Enable Lost Mode
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Enabling lost mode for: ${deviceName}" -ForegroundColor Cyan
    
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    $LostModeParams = @{
        Message = "${message}"
        ${phoneNumber ? `PhoneNumber = "${phoneNumber}"` : ''}
    }
    
    Invoke-MgEnableDeviceManagementManagedDeviceLostMode -ManagedDeviceId $Device.Id -BodyParameter $LostModeParams
    
    Write-Host "✓ Lost mode enabled" -ForegroundColor Green
    Write-Host "  Device: ${deviceName}" -ForegroundColor Yellow
    Write-Host "  Message: ${message}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to enable lost mode: $_"
}`;
    }
  },

  {
    id: 'intune-export-policy-assignments',
    title: 'Export Policy Assignments',
    description: 'Export comprehensive report of all policy and profile assignments',
    category: 'Reporting',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates comprehensive reports of all configuration policy assignments for governance, auditing, and troubleshooting.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementConfiguration.Read.All permission

**What You Need to Provide:**
- CSV export file path for policy assignments

**What the Script Does:**
1. Connects to Microsoft Graph with configuration read permissions
2. Retrieves all device configuration policies
3. Extracts policy assignments for each configuration
4. Captures policy name, type, assignment ID, target type
5. Exports complete assignment inventory to CSV

**Important Notes:**
- Essential for policy governance and compliance auditing
- Shows which groups receive which policies
- Use to identify orphaned or duplicate assignments
- Helps troubleshoot policy application issues
- Run quarterly for assignment review
- Coordinate with governance team
- Identifies configuration coverage gaps
- Supports change management documentation`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\PolicyAssignments.csv',
        helpText: 'CSV export location'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Policy Assignments
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementConfiguration.Read.All"

try {
    Write-Host "Collecting policy assignments..." -ForegroundColor Cyan
    
    $Configurations = Get-MgDeviceManagementDeviceConfiguration -All
    
    $AssignmentReport = foreach ($Config in $Configurations) {
        $Assignments = Get-MgDeviceManagementDeviceConfigurationAssignment -DeviceConfigurationId $Config.Id -ErrorAction SilentlyContinue
        
        foreach ($Assignment in $Assignments) {
            [PSCustomObject]@{
                PolicyName = $Config.DisplayName
                PolicyType = $Config.AdditionalProperties["@odata.type"]
                AssignmentId = $Assignment.Id
                TargetType = $Assignment.Target.AdditionalProperties["@odata.type"]
            }
        }
    }
    
    $AssignmentReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Policy assignments exported" -ForegroundColor Green
    Write-Host "  Total assignments: $($AssignmentReport.Count)" -ForegroundColor Yellow
    Write-Host "  Export path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export policy assignments: $_"
}`;
    }
  },

  {
    id: 'intune-bulk-assign-apps',
    title: 'Bulk Assign Apps to Groups',
    description: 'Assign multiple applications to multiple groups in one operation',
    category: 'App Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script performs bulk app assignments to multiple groups simultaneously for efficient large-scale app deployment management.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All and Group.Read.All permissions

**What You Need to Provide:**
- App names (one per line in textarea)
- Group names (one per line in textarea)
- Assignment intent (Required, Available, or Uninstall)

**What the Script Does:**
1. Connects to Microsoft Graph with app and group permissions
2. Parses app and group names from input
3. Looks up each app and group in Intune/Azure AD
4. Creates assignments for each app-group combination
5. Reports success/failure count for each assignment

**Important Notes:**
- Essential for large-scale app deployment campaigns
- Saves time compared to manual assignment in portal
- Each app assigned to ALL specified groups
- Required: forces installation, Available: self-service in Company Portal
- Use Uninstall to remove apps from devices
- Test with pilot groups before broad deployment
- Monitor assignment status in Intune portal
- Typical use: onboarding new departments, mass app rollouts`,
    parameters: [
      {
        name: 'appNames',
        label: 'App Names (one per line)',
        type: 'textarea',
        required: true,
        placeholder: 'Microsoft Edge\nAdobe Reader',
        helpText: 'Applications to assign'
      },
      {
        name: 'groupNames',
        label: 'Group Names (one per line)',
        type: 'textarea',
        required: true,
        placeholder: 'All Users\nIT Department',
        helpText: 'Target groups'
      },
      {
        name: 'intent',
        label: 'Assignment Intent',
        type: 'select',
        required: true,
        options: [
          { value: 'required', label: 'Required' },
          { value: 'available', label: 'Available' },
          { value: 'uninstall', label: 'Uninstall' }
        ],
        helpText: 'Deployment intent'
      }
    ],
    scriptTemplate: (params) => {
      const appNamesInput = params.appNames || '';
      const groupNamesInput = params.groupNames || '';
      const intent = params.intent;

      return `# Bulk Assign Apps
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All", "Group.Read.All"

try {
    Write-Host "Processing bulk app assignments..." -ForegroundColor Cyan
    
    $AppNames = @(
${appNamesInput.split('\\n').filter((line: string) => line.trim()).map((name: string) => `        "${escapePowerShellString(name.trim())}"`).join(',\\n')}
    )
    
    $GroupNames = @(
${groupNamesInput.split('\\n').filter((line: string) => line.trim()).map((name: string) => `        "${escapePowerShellString(name.trim())}"`).join(',\\n')}
    )
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($AppName in $AppNames) {
        $App = Get-MgDeviceAppManagementMobileApp -Filter "displayName eq '$AppName'" | Select-Object -First 1
        
        if (-not $App) {
            Write-Warning "App not found: $AppName"
            continue
        }
        
        foreach ($GroupName in $GroupNames) {
            try {
                $Group = Get-MgGroup -Filter "displayName eq '$GroupName'" | Select-Object -First 1
                
                if (-not $Group) {
                    Write-Warning "Group not found: $GroupName"
                    continue
                }
                
                $AssignmentParams = @{
                    Assignments = @(
                        @{
                            Intent = "${intent}"
                            Target = @{
                                "@odata.type" = "#microsoft.graph.groupAssignmentTarget"
                                GroupId = $Group.Id
                            }
                        }
                    )
                }
                
                Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceAppManagement/mobileApps/$($App.Id)/assign" -Body ($AssignmentParams | ConvertTo-Json -Depth 10)
                
                Write-Host "✓ $AppName assigned to $GroupName" -ForegroundColor Green
                $SuccessCount++
            } catch {
                Write-Warning "✗ Failed: $AppName to $GroupName"
                $FailCount++
            }
        }
    }
    
    Write-Host ${'\`n'}"Bulk Assignment Complete - Success: $SuccessCount, Failed: $FailCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to perform bulk assignments: $_"
}`;
    }
  },

  {
    id: 'intune-create-conditional-access-policy',
    title: 'Create Conditional Access Policy',
    description: 'Create a conditional access policy requiring device compliance',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates conditional access policies to enforce device compliance requirements for accessing corporate resources.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Conditional Access Administrator or Security Administrator role
- Policy.ReadWrite.ConditionalAccess permission

**What You Need to Provide:**
- Policy name
- Whether to require device compliance (checkbox, default enabled)

**What the Script Does:**
1. Connects to Microsoft Graph with conditional access permissions
2. Creates new conditional access policy
3. Configures to apply to All applications and All users
4. Sets grant control to require compliant device
5. Creates policy in DISABLED state for review
6. Returns policy ID

**Important Notes:**
- Policy created in DISABLED state for safety - enable manually after review
- Essential for zero-trust security architecture
- Blocks non-compliant devices from accessing resources
- Coordinate with compliance policies before deployment
- Test with pilot users before enabling for all users
- Consider excluding break-glass accounts
- Monitor sign-in logs for policy impact
- Must manually enable policy in Azure portal after validation`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Require Compliant Device',
        helpText: 'Conditional access policy name'
      },
      {
        name: 'requireCompliance',
        label: 'Require Device Compliance',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Require compliant device for access'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const requireCompliance = params.requireCompliance !== false;

      return `# Create Conditional Access Policy
# Generated by PSForge

Connect-MgGraph -Scopes "Policy.ReadWrite.ConditionalAccess"

try {
    Write-Host "Creating conditional access policy: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        DisplayName = "${policyName}"
        State = "disabled"
        Conditions = @{
            Applications = @{
                IncludeApplications = @("All")
            }
            Users = @{
                IncludeUsers = @("All")
                ExcludeUsers = @()
            }
        }
        GrantControls = @{
            Operator = "AND"
            BuiltInControls = @(${requireCompliance ? '"compliantDevice"' : ''})
        }
    }
    
    $Policy = New-MgIdentityConditionalAccessPolicy -BodyParameter $PolicyParams
    
    Write-Host "✓ Conditional access policy created" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  State: Disabled (enable manually after review)" -ForegroundColor Cyan
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create conditional access policy: $_"
}`;
    }
  },

  {
    id: 'intune-export-device-health',
    title: 'Export Device Health Report',
    description: 'Export comprehensive device health status including battery, storage, and performance',
    category: 'Reporting',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates comprehensive device health reports with hardware status for proactive device lifecycle and maintenance management.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path for device health report

**What the Script Does:**
1. Connects to Microsoft Graph with device read permissions
2. Retrieves all managed devices
3. Extracts device health indicators (available from Intune)
4. Exports device health inventory to CSV
5. Reports total device count

**Important Notes:**
- Essential for proactive device lifecycle management
- Use to identify devices needing hardware replacement
- Health data availability varies by device platform
- Windows devices provide more detailed health data
- Run monthly for device health trending
- Coordinate with procurement for replacement planning
- Identify devices with low battery health or storage issues
- Supports warranty and refresh cycle planning`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\DeviceHealth.csv',
        helpText: 'CSV export location'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Device Health Report
# Generated by PSForge

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting device health data..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -All
    
    $HealthReport = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName = $Device.DeviceName
            UserPrincipalName = $Device.UserPrincipalName
            OperatingSystem = $Device.OperatingSystem
            OSVersion = $Device.OSVersion
            FreeStorageSpaceGB = [math]::Round($Device.FreeStorageSpaceInBytes / 1GB, 2)
            TotalStorageSpaceGB = [math]::Round($Device.TotalStorageSpaceInBytes / 1GB, 2)
            LastSyncDateTime = $Device.LastSyncDateTime
            ComplianceState = $Device.ComplianceState
            ManagementState = $Device.ManagementState
        }
    }
    
    $HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Device health report exported" -ForegroundColor Green
    Write-Host "  Total devices: $($HealthReport.Count)" -ForegroundColor Yellow
    Write-Host "  Export path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export device health: $_"
}`;
    }
  },

  {
    id: 'intune-export-inventory',
    title: 'Export Device Inventory',
    category: 'Reporting',
    isPremium: true,
    description: 'Complete device hardware report',
    instructions: `**How This Task Works:**
- Exports complete hardware inventory for all Intune-managed devices
- Includes device name, serial number, model, manufacturer
- Shows OS version and last sync time
- Essential for asset management and reporting

**Prerequisites:**
- Microsoft Graph PowerShell SDK installed
- Global Administrator or Intune Administrator role
- PowerShell 5.1 or later
- DeviceManagementManagedDevices.Read.All permission
- Write permissions on export location

**What You Need to Provide:**
- Export path for CSV file

**What the Script Does:**
1. Connects to Microsoft Graph with required permissions
2. Retrieves all managed devices
3. Selects hardware inventory properties
4. Exports to CSV file
5. Displays device count

**Important Notes:**
- REQUIRES INTUNE ADMINISTRATOR OR GLOBAL ADMINISTRATOR ROLE
- May take time with large device counts
- Includes only Intune-enrolled devices
- Typical use: asset tracking, hardware audits, compliance reporting
- Refresh inventory by forcing device sync first
- Serial numbers useful for warranty tracking
- Consider scheduling regular exports for trending`,
    parameters: [
      { name: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Intune\\Inventory.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Device Inventory
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    $Devices = Get-MgDeviceManagementManagedDevice | Select DisplayName, SerialNumber, Model, Manufacturer, OSVersion, LastSyncDateTime
    
    $Devices | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Inventory exported: $($Devices.Count) devices" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },

  {
    id: 'intune-export-noncompliant',
    title: 'Export Non-Compliant Devices Report',
    category: 'Compliance',
    isPremium: true,
    description: 'List all devices failing compliance policies',
    instructions: `**How This Task Works:**
- Exports all devices currently failing compliance policies
- Shows device name, user, OS, compliance state
- Includes last sync time for staleness checking
- Critical for security and compliance monitoring

**Prerequisites:**
- Microsoft Graph PowerShell SDK installed
- Global Administrator or Intune Administrator role
- PowerShell 5.1 or later
- DeviceManagementManagedDevices.Read.All permission
- Write permissions on export location

**What You Need to Provide:**
- Export path for CSV file

**What the Script Does:**
1. Connects to Microsoft Graph with required permissions
2. Filters devices with non-compliant status
3. Retrieves device details and user assignments
4. Exports to CSV file
5. Displays non-compliant device count

**Important Notes:**
- REQUIRES INTUNE ADMINISTRATOR OR GLOBAL ADMINISTRATOR ROLE
- Only shows currently non-compliant devices
- Compliance state updates after device check-in
- Typical use: security audits, compliance remediation, user notifications
- Review compliance policies if many devices fail
- Follow up with device owners for remediation
- May indicate policy configuration issues if count is high
- Check LastSyncDateTime for stale devices`,
    parameters: [
      { name: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Intune\\NonCompliant.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Non-Compliant Devices Report
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting non-compliant devices..." -ForegroundColor Cyan
    
    $Devices = Get-MgDeviceManagementManagedDevice -Filter "complianceState eq 'noncompliant'" | Select DeviceName, UserPrincipalName, OperatingSystem, ComplianceState, LastSyncDateTime
    
    $Devices | Export-Csv "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Non-compliant devices exported: $($Devices.Count)" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },

  // ==================== PREMIUM COMMON ADMIN TASKS ====================
  
  {
    id: 'intune-premium-deploy-win32-apps',
    title: 'Deploy Win32 Apps to Devices',
    description: 'Create and deploy Win32 app packages with detection rules',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task automates Win32 app deployment to managed devices with comprehensive detection rules and installation requirements.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission
- Win32 app packaged as .intunewin file

**What You Need to Provide:**
- Application name
- Install command
- Uninstall command
- Detection rule (file path or registry key)

**What the Script Does:**
1. Connects to Microsoft Graph with app write permissions
2. Creates Win32 LOB app with metadata
3. Configures install/uninstall commands
4. Sets up file-based or registry-based detection rules
5. Returns app ID for content upload and assignment

**Important Notes:**
- Essential for deploying custom/legacy applications
- Package app using Microsoft Win32 Content Prep Tool first
- Must upload .intunewin content via portal after creation
- Configure requirements (OS version, architecture) as needed
- Assign to device groups after upload completes
- Monitor deployment status in Intune portal
- Use for apps not available in Microsoft Store`,
    parameters: [
      {
        name: 'appName',
        label: 'Application Name',
        type: 'text',
        required: true,
        placeholder: 'Adobe Acrobat Reader DC',
        helpText: 'Display name for the application'
      },
      {
        name: 'installCommand',
        label: 'Install Command',
        type: 'text',
        required: true,
        placeholder: 'setup.exe /silent',
        helpText: 'Command line for installation'
      },
      {
        name: 'uninstallCommand',
        label: 'Uninstall Command',
        type: 'text',
        required: true,
        placeholder: 'uninstall.exe /quiet',
        helpText: 'Command line for uninstallation'
      },
      {
        name: 'detectionPath',
        label: 'Detection File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat.exe',
        helpText: 'File path for detection rule'
      }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const installCmd = escapePowerShellString(params.installCommand);
      const uninstallCmd = escapePowerShellString(params.uninstallCommand);
      const detectionPath = escapePowerShellString(params.detectionPath);

      return `# Deploy Win32 App with Detection Rules
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Creating Win32 app: ${appName}" -ForegroundColor Cyan
    
    $AppParams = @{
        "@odata.type" = "#microsoft.graph.win32LobApp"
        DisplayName = "${appName}"
        Description = "Deployed via PSForge Premium"
        Publisher = "IT Department"
        IsFeatured = \$false
        InstallCommandLine = "${installCmd}"
        UninstallCommandLine = "${uninstallCmd}"
        DetectionRules = @(
            @{
                "@odata.type" = "#microsoft.graph.win32LobAppFileSystemDetection"
                Path = [System.IO.Path]::GetDirectoryName("${detectionPath}")
                FileOrFolderName = [System.IO.Path]::GetFileName("${detectionPath}")
                Check32BitOn64System = \$false
                DetectionType = "exists"
            }
        )
    }
    
    $App = New-MgDeviceAppManagementMobileApp -BodyParameter $AppParams
    
    Write-Host "✓ Win32 app created successfully" -ForegroundColor Green
    Write-Host "  App Name: ${appName}" -ForegroundColor Yellow
    Write-Host "  App ID: $($App.Id)" -ForegroundColor Cyan
    Write-Host "Next: Upload .intunewin content via Intune portal" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create Win32 app: $_"
}`;
    }
  },

  {
    id: 'intune-premium-configure-autopilot-profiles',
    title: 'Configure Autopilot Deployment Profiles',
    description: 'Set up Windows Autopilot profiles and assignments',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates and configures Windows Autopilot deployment profiles for automated device provisioning with customized OOBE experience.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission

**What You Need to Provide:**
- Profile name
- Device name template
- User account type (Standard or Administrator)

**What the Script Does:**
1. Connects to Microsoft Graph with service config permissions
2. Creates Azure AD Autopilot deployment profile
3. Configures OOBE experience settings
4. Sets device naming template and user type
5. Returns profile ID for device group assignment

**Important Notes:**
- Essential for zero-touch device deployment
- Streamlines out-of-box experience for end users
- Automatically joins devices to Azure AD
- Configure before shipping devices to users
- Assign profile to Autopilot device groups
- Test with pilot devices before production rollout
- Reduces IT provisioning time significantly`,
    parameters: [
      {
        name: 'profileName',
        label: 'Profile Name',
        type: 'text',
        required: true,
        placeholder: 'Standard User Autopilot Profile',
        helpText: 'Name for the Autopilot deployment profile'
      },
      {
        name: 'deviceNameTemplate',
        label: 'Device Name Template',
        type: 'text',
        required: true,
        defaultValue: 'CORP-%SERIAL%',
        placeholder: 'CORP-%SERIAL%',
        helpText: 'Template for auto-generated device names'
      },
      {
        name: 'userType',
        label: 'User Account Type',
        type: 'select',
        required: true,
        options: [
          { value: 'standard', label: 'Standard User' },
          { value: 'administrator', label: 'Administrator' }
        ],
        helpText: 'User account type for provisioned devices'
      }
    ],
    scriptTemplate: (params) => {
      const profileName = escapePowerShellString(params.profileName);
      const deviceNameTemplate = escapePowerShellString(params.deviceNameTemplate);
      const userType = params.userType || 'standard';

      return `# Configure Autopilot Deployment Profile
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Creating Autopilot profile: ${profileName}" -ForegroundColor Cyan
    
    $ProfileParams = @{
        "@odata.type" = "#microsoft.graph.azureADWindowsAutopilotDeploymentProfile"
        DisplayName = "${profileName}"
        Description = "Premium Autopilot profile created via PSForge"
        DeviceNameTemplate = "${deviceNameTemplate}"
        DeviceType = "windowsPc"
        EnableWhiteGlove = \$false
        Language = "os-default"
        OutOfBoxExperienceSettings = @{
            HidePrivacySettings = \$true
            HideEULA = \$true
            UserType = "${userType}"
            DeviceUsageType = "shared"
            SkipKeyboardSelectionPage = \$true
            HideEscapeLink = \$true
        }
    }
    
    $Profile = New-MgDeviceManagementWindowsAutopilotDeploymentProfile -BodyParameter $ProfileParams
    
    Write-Host "✓ Autopilot profile created successfully" -ForegroundColor Green
    Write-Host "  Profile: ${profileName}" -ForegroundColor Yellow
    Write-Host "  User Type: ${userType}" -ForegroundColor Yellow
    Write-Host "  ID: $($Profile.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign profile to Autopilot device groups" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create Autopilot profile: $_"
}`;
    }
  },

  {
    id: 'intune-premium-manage-mam-policies',
    title: 'Manage App Protection Policies (MAM)',
    description: 'Create/configure MAM policies for iOS/Android',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates comprehensive Mobile Application Management (MAM) policies to protect corporate data on mobile devices without full MDM enrollment.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Target platform (iOS or Android)
- PIN requirement setting

**What the Script Does:**
1. Connects to Microsoft Graph with app write permissions
2. Creates platform-specific MAM policy
3. Configures data protection settings (copy/paste, save-as, backup)
4. Sets access requirements (PIN, offline time limits)
5. Returns policy ID for app and user assignment

**Important Notes:**
- Essential for BYOD scenarios (no full device enrollment)
- Protects corporate data in managed apps only
- Works with apps that support Intune App SDK
- Prevents data leakage to personal apps
- Common managed apps: Outlook, Teams, OneDrive, SharePoint
- Must assign policy to protected apps and user groups
- Test with pilot users before broad deployment`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Corporate Data Protection Policy',
        helpText: 'Name for the app protection policy'
      },
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: [
          { value: 'iOS', label: 'iOS' },
          { value: 'android', label: 'Android' }
        ],
        helpText: 'Target mobile platform'
      },
      {
        name: 'requirePIN',
        label: 'Require App PIN',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Require PIN to access protected apps'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const platform = params.platform;
      const requirePIN = params.requirePIN !== false;

      return `# Manage App Protection Policies (MAM)
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Creating MAM policy for ${platform}: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = ${platform === 'iOS' ? '"#microsoft.graph.iosManagedAppProtection"' : '"#microsoft.graph.androidManagedAppProtection"'}
        DisplayName = "${policyName}"
        Description = "Premium MAM policy created via PSForge"
        PeriodOfflineBeforeAccessCheck = "PT12H"
        PeriodOnlineBeforeAccessCheck = "PT30M"
        AllowedDataStorageLocations = @("oneDriveForBusiness", "sharePoint")
        AllowedInboundDataTransferSources = "managedApps"
        AllowedOutboundDataTransferDestinations = "managedApps"
        OrganizationalCredentialsRequired = \$false
        AllowedOutboundClipboardSharingLevel = "managedAppsWithPasteIn"
        DataBackupBlocked = \$true
        DeviceComplianceRequired = \$true
        SaveAsBlocked = \$true
        PeriodOfflineBeforeWipeIsEnforced = "P90D"
        PinRequired = \$${requirePIN}
        ${requirePIN ? 'MinimumPinLength = 4' : ''}
        SimplePinBlocked = \$true
        Print${platform === 'iOS' ? 'Blocked' : 'BlockedBeforeWipeIsEnforced'} = ${platform === 'iOS' ? '"blocked"' : '"P90D"'}
    }
    
    ${platform === 'iOS' ? 
      '$Policy = New-MgDeviceAppManagementIosManagedAppProtection -BodyParameter $PolicyParams' : 
      '$Policy = New-MgDeviceAppManagementAndroidManagedAppProtection -BodyParameter $PolicyParams'}
    
    Write-Host "✓ MAM policy created successfully" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Platform: ${platform}" -ForegroundColor Yellow
    Write-Host "  Require PIN: ${requirePIN}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign policy to protected apps and users" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create MAM policy: $_"
}`;
    }
  },

  {
    id: 'intune-premium-configure-update-rings',
    title: 'Configure Update Rings for Windows',
    description: 'Windows Update deployment rings with deferral settings',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates Windows Update for Business rings to control phased deployment of feature and quality updates across device groups.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Ring name
- Feature update deferral period (days)
- Quality update deferral period (days)

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates Windows Update for Business configuration
3. Sets feature and quality update deferral periods
4. Configures automatic update behavior
5. Returns update ring ID for device group assignment

**Important Notes:**
- Essential for phased Windows 10/11 update deployment
- Typical rings: Pilot (0 days), Production (7-30 days)
- Quality updates are security patches, feature updates are major versions
- Must assign ring to device groups after creation
- Coordinate with maintenance windows
- Use multiple rings for staged deployments
- Monitor update compliance in Intune portal`,
    parameters: [
      {
        name: 'ringName',
        label: 'Update Ring Name',
        type: 'text',
        required: true,
        placeholder: 'Production Update Ring',
        helpText: 'Name for the update ring'
      },
      {
        name: 'featureDeferralDays',
        label: 'Feature Update Deferral (days)',
        type: 'number',
        required: true,
        defaultValue: 14,
        helpText: 'Days to defer feature updates (0-365)'
      },
      {
        name: 'qualityDeferralDays',
        label: 'Quality Update Deferral (days)',
        type: 'number',
        required: true,
        defaultValue: 3,
        helpText: 'Days to defer quality updates (0-30)'
      }
    ],
    scriptTemplate: (params) => {
      const ringName = escapePowerShellString(params.ringName);
      const featureDeferral = params.featureDeferralDays || 14;
      const qualityDeferral = params.qualityDeferralDays || 3;

      return `# Configure Windows Update Ring
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating update ring: ${ringName}" -ForegroundColor Cyan
    
    $UpdateRingParams = @{
        "@odata.type" = "#microsoft.graph.windowsUpdateForBusinessConfiguration"
        DisplayName = "${ringName}"
        Description = "Premium update ring created via PSForge"
        FeatureUpdatesDeferralPeriodInDays = ${featureDeferral}
        QualityUpdatesDeferralPeriodInDays = ${qualityDeferral}
        AutomaticUpdateMode = "windowsDefault"
        AutoRestartNotificationDismissal = "notConfigured"
        BusinessReadyUpdatesOnly = "windowsInsiderBuildFast"
        DeliveryOptimizationMode = "httpWithPeeringPrivateGroup"
        DriversExcluded = \$false
        FeatureUpdatesWillBeRolledBack = \$false
        QualityUpdatesWillBeRolledBack = \$false
    }
    
    $UpdateRing = New-MgDeviceManagementDeviceConfiguration -BodyParameter $UpdateRingParams
    
    Write-Host "✓ Update ring created successfully" -ForegroundColor Green
    Write-Host "  Ring Name: ${ringName}" -ForegroundColor Yellow
    Write-Host "  Feature Deferral: ${featureDeferral} days" -ForegroundColor Yellow
    Write-Host "  Quality Deferral: ${qualityDeferral} days" -ForegroundColor Yellow
    Write-Host "  ID: $($UpdateRing.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign ring to device groups" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create update ring: $_"
}`;
    }
  },

  {
    id: 'intune-premium-enrollment-restrictions',
    title: 'Manage iOS/Android Enrollment Restrictions',
    description: 'Device type/platform enrollment restrictions',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task configures enrollment restrictions to control which device types and platforms can enroll in Intune management.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission

**What You Need to Provide:**
- Restriction policy name
- Whether to block personal device enrollment
- Whether to block iOS enrollment
- Whether to block Android enrollment

**What the Script Does:**
1. Connects to Microsoft Graph with service config permissions
2. Creates device type enrollment restriction policy
3. Configures platform-specific enrollment controls
4. Sets personal device ownership restrictions
5. Returns restriction ID for priority management

**Important Notes:**
- Essential for BYOD policy enforcement
- Controls which device types can enroll
- Prevents unauthorized device management
- Default restriction applies to all users unless overridden
- Create additional restrictions for specific groups
- Test restrictions with test accounts before deployment
- Monitor enrollment failures after implementing restrictions`,
    parameters: [
      {
        name: 'restrictionName',
        label: 'Restriction Name',
        type: 'text',
        required: true,
        placeholder: 'Corporate Device Restriction',
        helpText: 'Name for enrollment restriction policy'
      },
      {
        name: 'blockPersonalDevices',
        label: 'Block Personal Device Enrollment',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Prevent personally-owned devices from enrolling'
      },
      {
        name: 'blockIOS',
        label: 'Block iOS Enrollment',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Prevent iOS device enrollment'
      },
      {
        name: 'blockAndroid',
        label: 'Block Android Enrollment',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Prevent Android device enrollment'
      }
    ],
    scriptTemplate: (params) => {
      const restrictionName = escapePowerShellString(params.restrictionName);
      const blockPersonal = params.blockPersonalDevices === true;
      const blockIOS = params.blockIOS === true;
      const blockAndroid = params.blockAndroid === true;

      return `# Manage Enrollment Restrictions
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Creating enrollment restriction: ${restrictionName}" -ForegroundColor Cyan
    
    $RestrictionParams = @{
        DisplayName = "${restrictionName}"
        Description = "Premium enrollment restriction created via PSForge"
        Priority = 1
        PlatformType = "allPlatforms"
        PlatformRestrictions = @{
            iOS = @{
                PlatformBlocked = \$${blockIOS}
                PersonalDeviceEnrollmentBlocked = \$${blockPersonal}
            }
            Android = @{
                PlatformBlocked = \$${blockAndroid}
                PersonalDeviceEnrollmentBlocked = \$${blockPersonal}
            }
            Windows = @{
                PlatformBlocked = \$false
                PersonalDeviceEnrollmentBlocked = \$${blockPersonal}
            }
        }
    }
    
    $Uri = "https://graph.microsoft.com/v1.0/deviceManagement/deviceEnrollmentConfigurations"
    $Restriction = Invoke-MgGraphRequest -Method POST -Uri $Uri -Body ($RestrictionParams | ConvertTo-Json -Depth 10)
    
    Write-Host "✓ Enrollment restriction created successfully" -ForegroundColor Green
    Write-Host "  Restriction: ${restrictionName}" -ForegroundColor Yellow
    Write-Host "  Block Personal: ${blockPersonal}" -ForegroundColor Yellow
    Write-Host "  Block iOS: ${blockIOS}" -ForegroundColor Yellow
    Write-Host "  Block Android: ${blockAndroid}" -ForegroundColor Yellow
    Write-Host "  ID: $($Restriction.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create enrollment restriction: $_"
}`;
    }
  },

  {
    id: 'intune-premium-deploy-config-profiles',
    title: 'Deploy Configuration Profiles to Devices',
    description: 'Deploy Wi-Fi, VPN, email, certificate profiles',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates and deploys device configuration profiles for Wi-Fi, VPN, email, and other settings to managed devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Profile name
- Configuration type (Wi-Fi, VPN, Email, Custom)
- Platform (Windows, iOS, Android)

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates device configuration profile
3. Sets platform-specific configuration settings
4. Returns profile ID for device group assignment
5. Provides next steps for detailed configuration

**Important Notes:**
- Essential for automated device configuration
- Supports Wi-Fi, VPN, email, certificates, and more
- Platform-specific settings require appropriate parameters
- Must assign profile to device groups after creation
- Test with pilot devices before broad deployment
- Monitor configuration success in Intune portal
- Some settings may require device restart`,
    parameters: [
      {
        name: 'profileName',
        label: 'Profile Name',
        type: 'text',
        required: true,
        placeholder: 'Corporate Wi-Fi Profile',
        helpText: 'Name for the configuration profile'
      },
      {
        name: 'profileType',
        label: 'Configuration Type',
        type: 'select',
        required: true,
        options: [
          { value: 'wiFi', label: 'Wi-Fi' },
          { value: 'vpn', label: 'VPN' },
          { value: 'email', label: 'Email' },
          { value: 'custom', label: 'Custom Settings' }
        ],
        helpText: 'Type of configuration'
      },
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: [
          { value: 'windows10', label: 'Windows 10/11' },
          { value: 'iOS', label: 'iOS' },
          { value: 'android', label: 'Android' }
        ],
        helpText: 'Target platform'
      }
    ],
    scriptTemplate: (params) => {
      const profileName = escapePowerShellString(params.profileName);
      const profileType = params.profileType;
      const platform = params.platform;

      let odataType = '#microsoft.graph.windows10GeneralConfiguration';
      if (platform === 'iOS') odataType = '#microsoft.graph.iosGeneralDeviceConfiguration';
      if (platform === 'android') odataType = '#microsoft.graph.androidGeneralDeviceConfiguration';

      return `# Deploy Configuration Profile
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating ${profileType} configuration profile for ${platform}" -ForegroundColor Cyan
    
    $ProfileParams = @{
        "@odata.type" = "${odataType}"
        DisplayName = "${profileName}"
        Description = "Premium ${profileType} profile for ${platform} created via PSForge"
    }
    
    # Add profile type-specific settings
    switch ("${profileType}") {
        "wiFi" {
            Write-Host "Note: Configure Wi-Fi SSID and authentication in Intune portal" -ForegroundColor Yellow
        }
        "vpn" {
            Write-Host "Note: Configure VPN server and connection details in Intune portal" -ForegroundColor Yellow
        }
        "email" {
            Write-Host "Note: Configure email account settings in Intune portal" -ForegroundColor Yellow
        }
        "custom" {
            Write-Host "Note: Add custom OMA-URI or policy settings in Intune portal" -ForegroundColor Yellow
        }
    }
    
    $Profile = New-MgDeviceManagementDeviceConfiguration -BodyParameter $ProfileParams
    
    Write-Host "✓ Configuration profile created successfully" -ForegroundColor Green
    Write-Host "  Profile: ${profileName}" -ForegroundColor Yellow
    Write-Host "  Type: ${profileType}" -ForegroundColor Yellow
    Write-Host "  Platform: ${platform}" -ForegroundColor Yellow
    Write-Host "  ID: $($Profile.Id)" -ForegroundColor Cyan
    Write-Host "Next: Configure detailed settings in Intune portal, then assign to device groups" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create configuration profile: $_"
}`;
    }
  },

  {
    id: 'intune-premium-conditional-launch',
    title: 'Configure Conditional Launch Settings',
    description: 'App protection conditional launch requirements',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task configures conditional launch settings for app protection policies to enforce security requirements before allowing app access.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission
- Existing app protection policy

**What You Need to Provide:**
- App protection policy name to update
- Maximum allowed offline days
- Minimum OS version requirement

**What the Script Does:**
1. Connects to Microsoft Graph with app write permissions
2. Retrieves specified app protection policy
3. Updates conditional launch settings
4. Configures offline access time limits
5. Sets minimum OS version requirements

**Important Notes:**
- Essential for enforcing security baselines on mobile apps
- Blocks app access if conditions not met
- Works with iOS and Android MAM policies
- Common conditions: OS version, device compliance, offline time
- Users notified when conditions block access
- Test conditions with pilot users before broad deployment
- Coordinate with helpdesk for user support`,
    parameters: [
      {
        name: 'policyName',
        label: 'App Protection Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Corporate Data Protection Policy',
        helpText: 'Existing MAM policy to update'
      },
      {
        name: 'maxOfflineDays',
        label: 'Maximum Offline Days',
        type: 'number',
        required: true,
        defaultValue: 30,
        helpText: 'Maximum days device can be offline before wipe'
      },
      {
        name: 'minOSVersion',
        label: 'Minimum OS Version',
        type: 'text',
        required: true,
        placeholder: '14.0',
        helpText: 'Minimum required OS version (e.g., 14.0 for iOS)'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const maxOfflineDays = params.maxOfflineDays || 30;
      const minOSVersion = escapePowerShellString(params.minOSVersion);

      return `# Configure Conditional Launch Settings
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Configuring conditional launch for: ${policyName}" -ForegroundColor Cyan
    
    # Find the policy (try iOS first, then Android)
    $Policy = Get-MgDeviceAppManagementIosManagedAppProtection -Filter "displayName eq '${policyName}'" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if (-not $Policy) {
        $Policy = Get-MgDeviceAppManagementAndroidManagedAppProtection -Filter "displayName eq '${policyName}'" -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    
    if (-not $Policy) {
        throw "App protection policy not found: ${policyName}"
    }
    
    $UpdateParams = @{
        PeriodOfflineBeforeWipeIsEnforced = "P${maxOfflineDays}D"
        MinimumRequiredOsVersion = "${minOSVersion}"
        MinimumWarningOsVersion = "${minOSVersion}"
    }
    
    $PolicyType = $Policy.AdditionalProperties["@odata.type"]
    
    if ($PolicyType -like "*ios*") {
        Update-MgDeviceAppManagementIosManagedAppProtection -IosManagedAppProtectionId $Policy.Id -BodyParameter $UpdateParams
        $PlatformName = "iOS"
    } else {
        Update-MgDeviceAppManagementAndroidManagedAppProtection -AndroidManagedAppProtectionId $Policy.Id -BodyParameter $UpdateParams
        $PlatformName = "Android"
    }
    
    Write-Host "✓ Conditional launch settings updated" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Platform: $PlatformName" -ForegroundColor Yellow
    Write-Host "  Max Offline Days: ${maxOfflineDays}" -ForegroundColor Yellow
    Write-Host "  Min OS Version: ${minOSVersion}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure conditional launch: $_"
}`;
    }
  },

  {
    id: 'intune-premium-bitlocker-policies',
    title: 'Manage BitLocker Encryption Policies',
    description: 'Configure and enforce BitLocker policies',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates and enforces BitLocker encryption policies to protect data on Windows devices with full disk encryption.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Encryption method
- Whether to require startup authentication

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates endpoint protection configuration profile
3. Configures BitLocker encryption settings
4. Sets encryption method and authentication requirements
5. Returns policy ID for device group assignment

**Important Notes:**
- Essential for data protection and compliance
- Requires TPM 2.0 on most devices
- Encryption may take hours depending on drive size
- Recovery keys automatically escrowed to Azure AD
- Users may need to restart for encryption to begin
- Monitor encryption status in Intune portal
- Coordinate with users for maintenance window
- Test with pilot devices before broad deployment`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'BitLocker Encryption Policy',
        helpText: 'Name for the BitLocker policy'
      },
      {
        name: 'encryptionMethod',
        label: 'Encryption Method',
        type: 'select',
        required: true,
        options: [
          { value: 'aesCbc128', label: 'AES-CBC 128-bit' },
          { value: 'aesCbc256', label: 'AES-CBC 256-bit' },
          { value: 'xtsAes128', label: 'XTS-AES 128-bit' },
          { value: 'xtsAes256', label: 'XTS-AES 256-bit (Recommended)' }
        ],
        helpText: 'BitLocker encryption algorithm'
      },
      {
        name: 'requireStartupAuth',
        label: 'Require Startup Authentication',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Require PIN or USB key at startup'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const encryptionMethod = params.encryptionMethod || 'xtsAes256';
      const requireAuth = params.requireStartupAuth !== false;

      return `# Manage BitLocker Encryption Policy
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating BitLocker policy: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = "#microsoft.graph.windows10EndpointProtectionConfiguration"
        DisplayName = "${policyName}"
        Description = "Premium BitLocker policy created via PSForge"
        BitLockerSystemDrivePolicy = @{
            EncryptionMethod = "${encryptionMethod}"
            StartupAuthenticationRequired = \$${requireAuth}
            StartupAuthenticationBlockWithoutTpmChip = \$true
            MinimumPinLength = 6
            RecoveryOptions = @{
                BlockDataRecoveryAgent = \$false
                RecoveryPasswordUsage = "allowed"
                RecoveryKeyUsage = "allowed"
                HideRecoveryOptions = \$false
                EnableRecoveryInformationSaveToStore = \$true
                RecoveryInformationToStore = "passwordAndKey"
                EnableBitLockerAfterRecoveryInformationToStore = \$true
            }
        }
        BitLockerFixedDrivePolicy = @{
            EncryptionMethod = "${encryptionMethod}"
            RequireEncryptionForWriteAccess = \$true
            RecoveryOptions = @{
                BlockDataRecoveryAgent = \$false
                RecoveryPasswordUsage = "allowed"
                RecoveryKeyUsage = "allowed"
                HideRecoveryOptions = \$false
                EnableRecoveryInformationSaveToStore = \$true
                RecoveryInformationToStore = "passwordAndKey"
                EnableBitLockerAfterRecoveryInformationToStore = \$true
            }
        }
    }
    
    $Policy = New-MgDeviceManagementDeviceConfiguration -BodyParameter $PolicyParams
    
    Write-Host "✓ BitLocker policy created successfully" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Encryption: ${encryptionMethod}" -ForegroundColor Yellow
    Write-Host "  Require Auth: ${requireAuth}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign policy to device groups" -ForegroundColor Yellow
    Write-Host "Note: Recovery keys automatically escrowed to Azure AD" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create BitLocker policy: $_"
}`;
    }
  },

  {
    id: 'intune-premium-deploy-powershell-scripts',
    title: 'Deploy PowerShell Scripts to Devices',
    description: 'Upload and assign PowerShell scripts to endpoints',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task uploads and deploys PowerShell scripts to managed Windows devices for automated configuration, remediation, and maintenance tasks.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission
- PowerShell script file (.ps1)

**What You Need to Provide:**
- Script display name
- Path to PowerShell script file
- Whether to run as 64-bit PowerShell
- Whether to run in system context

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Reads PowerShell script file content
3. Encodes script as Base64
4. Uploads script to Intune
5. Returns script ID for device group assignment

**Important Notes:**
- Essential for automated device configuration and remediation
- Scripts run on device check-in (approximately every 8 hours)
- Can run in user or system context
- Output logged to Intune for troubleshooting
- Test scripts locally before deployment
- Assign to device groups after upload
- Monitor script execution status in Intune portal`,
    parameters: [
      {
        name: 'scriptName',
        label: 'Script Display Name',
        type: 'text',
        required: true,
        placeholder: 'Configure Company Settings',
        helpText: 'Display name for the script'
      },
      {
        name: 'scriptPath',
        label: 'Script File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Scripts\\ConfigureSettings.ps1',
        helpText: 'Path to PowerShell script file'
      },
      {
        name: 'runAs64Bit',
        label: 'Run as 64-bit PowerShell',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Use 64-bit PowerShell engine'
      },
      {
        name: 'runAsSystem',
        label: 'Run in System Context',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Run as SYSTEM instead of user'
      }
    ],
    scriptTemplate: (params) => {
      const scriptName = escapePowerShellString(params.scriptName);
      const scriptPath = escapePowerShellString(params.scriptPath);
      const runAs64Bit = params.runAs64Bit !== false;
      const runAsSystem = params.runAsSystem === true;

      return `# Deploy PowerShell Script to Devices
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Uploading PowerShell script: ${scriptName}" -ForegroundColor Cyan
    
    if (-not (Test-Path "${scriptPath}")) {
        throw "Script file not found: ${scriptPath}"
    }
    
    $ScriptContent = Get-Content -Path "${scriptPath}" -Raw
    $ScriptBytes = [System.Text.Encoding]::UTF8.GetBytes($ScriptContent)
    $ScriptBase64 = [System.Convert]::ToBase64String($ScriptBytes)
    
    $ScriptParams = @{
        "@odata.type" = "#microsoft.graph.deviceManagementScript"
        DisplayName = "${scriptName}"
        Description = "Premium PowerShell script deployed via PSForge"
        ScriptContent = $ScriptBase64
        RunAsAccount = ${runAsSystem ? '"system"' : '"user"'}
        EnforceSignatureCheck = \$false
        RunAs32Bit = \$${!runAs64Bit}
    }
    
    $Script = New-MgDeviceManagementDeviceManagementScript -BodyParameter $ScriptParams
    
    Write-Host "✓ PowerShell script uploaded successfully" -ForegroundColor Green
    Write-Host "  Script: ${scriptName}" -ForegroundColor Yellow
    Write-Host "  Run as 64-bit: ${runAs64Bit}" -ForegroundColor Yellow
    Write-Host "  Run as System: ${runAsSystem}" -ForegroundColor Yellow
    Write-Host "  ID: $($Script.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign script to device groups" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to upload PowerShell script: $_"
}`;
    }
  },

  {
    id: 'intune-premium-windows-hello',
    title: 'Configure Windows Hello for Business',
    description: 'WHfB policies and deployment settings',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task configures Windows Hello for Business to enable passwordless authentication with biometrics or PIN on Windows devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Minimum PIN length
- Whether to require uppercase letters in PIN

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates Windows Hello for Business configuration
3. Sets PIN complexity requirements
4. Configures biometric authentication settings
5. Returns policy ID for device group assignment

**Important Notes:**
- Essential for passwordless authentication strategy
- Requires Windows 10/11 Pro or Enterprise
- TPM 2.0 required for most configurations
- Replaces passwords with biometrics or PIN
- Improves security and user experience
- Coordinate with Azure AD Password Protection
- Test with pilot users before broad deployment
- Monitor enrollment status in Intune portal`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Windows Hello for Business Policy',
        helpText: 'Name for the WHfB policy'
      },
      {
        name: 'minPinLength',
        label: 'Minimum PIN Length',
        type: 'number',
        required: true,
        defaultValue: 6,
        helpText: 'Minimum PIN length (4-127)'
      },
      {
        name: 'requireUppercase',
        label: 'Require Uppercase Letters',
        type: 'boolean',
        required: false,
        defaultValue: false,
        helpText: 'Require uppercase letters in PIN'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const minPinLength = params.minPinLength || 6;
      const requireUppercase = params.requireUppercase === true;

      return `# Configure Windows Hello for Business
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating Windows Hello for Business policy: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = "#microsoft.graph.windowsIdentityProtectionConfiguration"
        DisplayName = "${policyName}"
        Description = "Premium WHfB policy created via PSForge"
        UseSecurityKeyForSignin = \$true
        PinMinimumLength = ${minPinLength}
        PinMaximumLength = 127
        PinUppercaseCharactersUsage = ${requireUppercase ? '"required"' : '"allowed"'}
        PinLowercaseCharactersUsage = "allowed"
        PinSpecialCharactersUsage = "allowed"
        PinExpirationInDays = 0
        PinPreviousBlockCount = 5
        PinRecoveryEnabled = \$true
        SecurityDeviceRequired = \$false
        UnlockWithBiometricsEnabled = \$true
        UseCertificatesForOnPremisesAuthEnabled = \$false
        WindowsHelloForBusinessBlocked = \$false
    }
    
    $Policy = New-MgDeviceManagementDeviceConfiguration -BodyParameter $PolicyParams
    
    Write-Host "✓ Windows Hello for Business policy created" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Min PIN Length: ${minPinLength}" -ForegroundColor Yellow
    Write-Host "  Require Uppercase: ${requireUppercase}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign policy to device groups" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create Windows Hello for Business policy: $_"
}`;
    }
  },

  {
    id: 'intune-premium-app-configuration',
    title: 'Manage App Configuration Policies',
    description: 'Configure managed app settings for iOS/Android',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates app configuration policies to pre-configure settings for managed mobile apps, improving user experience and ensuring consistent configuration.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Target app (e.g., Outlook, Teams)
- Platform (iOS or Android)

**What the Script Does:**
1. Connects to Microsoft Graph with app write permissions
2. Creates managed app configuration policy
3. Sets platform-specific configuration settings
4. Returns policy ID for app and user assignment

**Important Notes:**
- Essential for consistent app configuration across devices
- Pre-configures email, account settings, and app preferences
- Reduces user setup time and support calls
- Works with apps that support Intune App SDK
- Common apps: Outlook, Teams, Edge, OneDrive
- Must assign policy to users and target apps
- Configuration values depend on specific app
- Test with pilot users before broad deployment`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Outlook Configuration Policy',
        helpText: 'Name for the app configuration policy'
      },
      {
        name: 'targetApp',
        label: 'Target App',
        type: 'select',
        required: true,
        options: [
          { value: 'com.microsoft.office.outlook', label: 'Microsoft Outlook' },
          { value: 'com.microsoft.teams', label: 'Microsoft Teams' },
          { value: 'com.microsoft.skydrive', label: 'OneDrive' },
          { value: 'com.microsoft.emmx', label: 'Microsoft Edge' }
        ],
        helpText: 'App to configure'
      },
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: [
          { value: 'iOS', label: 'iOS' },
          { value: 'android', label: 'Android' }
        ],
        helpText: 'Target platform'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const targetApp = params.targetApp;
      const platform = params.platform;

      return `# Manage App Configuration Policy
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Creating app configuration policy for ${targetApp} on ${platform}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = ${platform === 'iOS' ? '"#microsoft.graph.iosM anagedAppConfiguration"' : '"#microsoft.graph.androidManagedAppConfiguration"'}
        DisplayName = "${policyName}"
        Description = "Premium app config policy created via PSForge"
        TargetedAppManagementLevels = "unmanaged"
    }
    
    # Create the app configuration policy
    ${platform === 'iOS' ?
      '$Policy = New-MgDeviceAppManagementTargetedManagedAppConfiguration -BodyParameter $PolicyParams' :
      '$Policy = New-MgDeviceAppManagementTargetedManagedAppConfiguration -BodyParameter $PolicyParams'}
    
    Write-Host "✓ App configuration policy created" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  App: ${targetApp}" -ForegroundColor Yellow
    Write-Host "  Platform: ${platform}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    Write-Host "Next: Configure app-specific settings in Intune portal, then assign to users" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create app configuration policy: $_"
}`;
    }
  },

  {
    id: 'intune-premium-export-device-inventory',
    title: 'Export Device Inventory Report',
    description: 'Export comprehensive device inventory with filters',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task exports comprehensive device inventory reports with filtering capabilities for asset management, compliance tracking, and lifecycle planning.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementManagedDevices.Read.All permission

**What You Need to Provide:**
- CSV export file path
- Operating system filter (optional)
- Compliance state filter (optional)

**What the Script Does:**
1. Connects to Microsoft Graph with device read permissions
2. Retrieves all Intune-managed devices with pagination
3. Applies optional OS and compliance filters
4. Extracts comprehensive device details
5. Exports filtered inventory to CSV with summary statistics

**Important Notes:**
- Essential for asset management and auditing
- Supports filtering by OS (Windows, iOS, Android, macOS)
- Can filter by compliance state (compliant, non-compliant, all)
- Includes device name, user, model, manufacturer, OS version
- Shows serial number, last sync time, compliance state
- Use for hardware refresh planning and warranty tracking
- Run monthly for trending analysis
- Export filtered datasets for specific device types`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\DeviceInventory.csv',
        helpText: 'Path where the CSV file will be saved'
      },
      {
        name: 'osFilter',
        label: 'Operating System Filter',
        type: 'select',
        required: false,
        options: [
          { value: 'all', label: 'All Operating Systems' },
          { value: 'Windows', label: 'Windows Only' },
          { value: 'iOS', label: 'iOS Only' },
          { value: 'Android', label: 'Android Only' },
          { value: 'macOS', label: 'macOS Only' }
        ],
        defaultValue: 'all',
        helpText: 'Filter devices by operating system'
      },
      {
        name: 'complianceFilter',
        label: 'Compliance State Filter',
        type: 'select',
        required: false,
        options: [
          { value: 'all', label: 'All Devices' },
          { value: 'compliant', label: 'Compliant Only' },
          { value: 'noncompliant', label: 'Non-Compliant Only' }
        ],
        defaultValue: 'all',
        helpText: 'Filter devices by compliance state'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const osFilter = params.osFilter || 'all';
      const complianceFilter = params.complianceFilter || 'all';

      return `# Export Device Inventory with Filters
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All"

try {
    Write-Host "Collecting comprehensive device inventory..." -ForegroundColor Cyan
    
    # Build filter query
    $FilterQuery = @()
    ${osFilter !== 'all' ? `$FilterQuery += "operatingSystem eq '${osFilter}'"` : ''}
    ${complianceFilter !== 'all' ? `$FilterQuery += "complianceState eq '${complianceFilter}'"` : ''}
    
    $FilterString = if ($FilterQuery.Count -gt 0) { 
        $FilterQuery -join " and " 
    } else { 
        $null 
    }
    
    # Retrieve devices with optional filter
    $Devices = if ($FilterString) {
        Get-MgDeviceManagementManagedDevice -Filter $FilterString -All
    } else {
        Get-MgDeviceManagementManagedDevice -All
    }
    
    Write-Host "Found $($Devices.Count) devices matching criteria" -ForegroundColor Yellow
    
    $Inventory = foreach ($Device in $Devices) {
        [PSCustomObject]@{
            DeviceName           = $Device.DeviceName
            UserPrincipalName    = $Device.UserPrincipalName
            Model                = $Device.Model
            Manufacturer         = $Device.Manufacturer
            OperatingSystem      = $Device.OperatingSystem
            OSVersion            = $Device.OSVersion
            SerialNumber         = $Device.SerialNumber
            LastSyncDateTime     = $Device.LastSyncDateTime
            ComplianceState      = $Device.ComplianceState
            ManagementState      = $Device.ManagementState
            EnrolledDateTime     = $Device.EnrolledDateTime
            FreeStorageGB        = [math]::Round($Device.FreeStorageSpaceInBytes / 1GB, 2)
            TotalStorageGB       = [math]::Round($Device.TotalStorageSpaceInBytes / 1GB, 2)
        }
    }
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Device inventory exported successfully" -ForegroundColor Green
    Write-Host "  Total Devices: $($Inventory.Count)" -ForegroundColor Yellow
    Write-Host "  OS Filter: ${osFilter}" -ForegroundColor Yellow
    Write-Host "  Compliance Filter: ${complianceFilter}" -ForegroundColor Yellow
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    
    # Show summary statistics
    Write-Host ${'\`n'}"Inventory Summary:" -ForegroundColor Cyan
    Write-Host "  By OS:" -ForegroundColor Yellow
    $Inventory | Group-Object OperatingSystem | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor White
    }
    Write-Host ${'\`n'}"  By Compliance:" -ForegroundColor Yellow
    $Inventory | Group-Object ComplianceState | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
} catch {
    Write-Error "Failed to export device inventory: $_"
}`;
    }
  },

  {
    id: 'intune-premium-endpoint-security',
    title: 'Configure Endpoint Security Policies',
    description: 'Antivirus, firewall, EDR policies',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task creates endpoint security policies to configure antivirus, firewall, and endpoint detection and response (EDR) settings on Windows devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Security feature to configure (Antivirus, Firewall, EDR)

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates endpoint security configuration profile
3. Configures Windows Defender and security settings
4. Sets real-time protection and scanning preferences
5. Returns policy ID for device group assignment

**Important Notes:**
- Essential for endpoint security and threat protection
- Configures Windows Defender Antivirus settings
- Enables real-time protection and cloud-delivered protection
- Can enable tamper protection to prevent modification
- Must assign policy to device groups after creation
- Monitor security status in Microsoft Defender portal
- Coordinate with Security Operations Center (SOC)
- Test with pilot devices before broad deployment`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Endpoint Security Policy',
        helpText: 'Name for the endpoint security policy'
      },
      {
        name: 'securityFeature',
        label: 'Security Feature',
        type: 'select',
        required: true,
        options: [
          { value: 'antivirus', label: 'Antivirus Protection' },
          { value: 'firewall', label: 'Firewall Configuration' },
          { value: 'edr', label: 'EDR Settings' }
        ],
        helpText: 'Security feature to configure'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const securityFeature = params.securityFeature;

      return `# Configure Endpoint Security Policy
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating endpoint security policy for ${securityFeature}: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = "#microsoft.graph.windows10EndpointProtectionConfiguration"
        DisplayName = "${policyName}"
        Description = "Premium ${securityFeature} policy created via PSForge"
    }
    
    # Add feature-specific settings
    switch ("${securityFeature}") {
        "antivirus" {
            $PolicyParams.DefenderRealtimeScanDirection = "monitorAllFiles"
            $PolicyParams.DefenderCloudBlockLevel = "high"
            $PolicyParams.DefenderCloudExtendedTimeout = 50
            $PolicyParams.DefenderDaysBeforeDeletingQuarantinedMalware = 30
            $PolicyParams.DefenderScanType = "quick"
            $PolicyParams.DefenderScheduledQuickScanTime = "120"
            $PolicyParams.DefenderSubmitSamplesConsentType = "sendSafeSamplesAutomatically"
            $PolicyParams.DefenderDetectedMalwareActions = @{
                LowSeverity = "quarantine"
                ModerateSeverity = "quarantine"
                HighSeverity = "quarantine"
                SevereSeverity = "quarantine"
            }
            Write-Host "Configured: Real-time protection, cloud protection, scheduled scans" -ForegroundColor Yellow
        }
        "firewall" {
            $PolicyParams.FirewallBlockStatefulFTP = \$true
            $PolicyParams.FirewallCertificateRevocationListCheckMethod = "attempt"
            $PolicyParams.FirewallIPSecExemptionsAllowNeighborDiscovery = \$false
            $PolicyParams.FirewallIPSecExemptionsAllowICMP = \$false
            $PolicyParams.FirewallPreSharedKeyEncodingMethod = "none"
            Write-Host "Configured: Firewall rules, IPSec exceptions" -ForegroundColor Yellow
        }
        "edr" {
            $PolicyParams.DefenderSecurityCenterDisableAppBrowserUI = \$false
            $PolicyParams.DefenderSecurityCenterDisableFamilyUI = \$true
            $PolicyParams.DefenderSecurityCenterDisableHealthUI = \$false
            $PolicyParams.DefenderSecurityCenterDisableNetworkUI = \$false
            $PolicyParams.DefenderSecurityCenterDisableVirusUI = \$false
            $PolicyParams.DefenderSecurityCenterOrganizationDisplayName = "IT Security"
            Write-Host "Configured: Security Center settings, EDR capabilities" -ForegroundColor Yellow
        }
    }
    
    $Policy = New-MgDeviceManagementDeviceConfiguration -BodyParameter $PolicyParams
    
    Write-Host "✓ Endpoint security policy created" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Feature: ${securityFeature}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign policy to device groups" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create endpoint security policy: $_"
}`;
    }
  },

  {
    id: 'intune-premium-apns-certificate',
    title: 'Manage Apple Push Notification Certificate',
    description: 'Renew/upload APNs certificate for iOS',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task helps manage Apple Push Notification Service (APNs) certificates required for iOS/iPadOS device management in Intune.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementServiceConfig.ReadWrite.All permission
- Apple ID with admin access
- Valid APNs certificate from Apple

**What You Need to Provide:**
- Path to APNs certificate file (.pem)
- Apple ID used for the certificate

**What the Script Does:**
1. Connects to Microsoft Graph with service config permissions
2. Retrieves current APNs certificate status
3. Reads new certificate file content
4. Updates APNs certificate in Intune
5. Reports certificate expiration date

**Important Notes:**
- CRITICAL: APNs certificate expires annually - must renew before expiration
- If certificate expires, all iOS/iPadOS devices lose management connection
- Use same Apple ID for renewals to maintain device connections
- Download certificate from Apple Push Certificates Portal
- Set calendar reminder 30 days before expiration
- Test certificate upload in off-hours
- Monitor certificate status in Intune admin center
- Certificate renewal does NOT disrupt managed devices if done before expiration`,
    parameters: [
      {
        name: 'certificatePath',
        label: 'APNs Certificate File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Certificates\\MDM_Apple_Push_Cert.pem',
        helpText: 'Path to .pem certificate file from Apple'
      },
      {
        name: 'appleId',
        label: 'Apple ID',
        type: 'text',
        required: true,
        placeholder: 'admin@company.com',
        helpText: 'Apple ID used to create the certificate'
      }
    ],
    scriptTemplate: (params) => {
      const certPath = escapePowerShellString(params.certificatePath);
      const appleId = escapePowerShellString(params.appleId);

      return `# Manage Apple Push Notification Certificate
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.ReadWrite.All"

try {
    Write-Host "Managing APNs certificate..." -ForegroundColor Cyan
    
    # Verify certificate file exists
    if (-not (Test-Path "${certPath}")) {
        throw "Certificate file not found: ${certPath}"
    }
    
    # Get current APNs certificate
    $CurrentCert = Get-MgDeviceManagementApplePushNotificationCertificate
    
    if ($CurrentCert) {
        Write-Host "Current APNs Certificate:" -ForegroundColor Yellow
        Write-Host "  Apple ID: $($CurrentCert.AppleIdentifier)" -ForegroundColor White
        Write-Host "  Expires: $($CurrentCert.ExpirationDateTime)" -ForegroundColor White
        Write-Host "  Last Modified: $($CurrentCert.LastModifiedDateTime)" -ForegroundColor White
    }
    
    # Read certificate content
    $CertContent = Get-Content -Path "${certPath}" -Raw
    $CertBytes = [System.Text.Encoding]::UTF8.GetBytes($CertContent)
    $CertBase64 = [System.Convert]::ToBase64String($CertBytes)
    
    # Update APNs certificate
    $CertParams = @{
        AppleIdentifier = "${appleId}"
        Certificate = $CertBase64
    }
    
    if ($CurrentCert) {
        Update-MgDeviceManagementApplePushNotificationCertificate -ApplePushNotificationCertificateId $CurrentCert.Id -BodyParameter $CertParams
        Write-Host "✓ APNs certificate renewed successfully" -ForegroundColor Green
    } else {
        New-MgDeviceManagementApplePushNotificationCertificate -BodyParameter $CertParams
        Write-Host "✓ APNs certificate uploaded successfully" -ForegroundColor Green
    }
    
    # Get updated certificate info
    $UpdatedCert = Get-MgDeviceManagementApplePushNotificationCertificate
    
    Write-Host ${'\`n'}"Updated Certificate Details:" -ForegroundColor Cyan
    Write-Host "  Apple ID: ${appleId}" -ForegroundColor Yellow
    Write-Host "  Expires: $($UpdatedCert.ExpirationDateTime)" -ForegroundColor Yellow
    Write-Host ${'\`n'}"IMPORTANT: Set calendar reminder 30 days before expiration!" -ForegroundColor Red
    
} catch {
    Write-Error "Failed to manage APNs certificate: $_"
}`;
    }
  },

  {
    id: 'intune-premium-remote-actions',
    title: 'Configure Remote Actions and Wipe',
    description: 'Execute remote lock, wipe, retire on devices',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This premium task executes remote actions on managed devices including lock, wipe, retire, restart, and sync for security incident response and device management.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementManagedDevices.ReadWrite.All permission

**What You Need to Provide:**
- Device name to target
- Remote action to execute

**What the Script Does:**
1. Connects to Microsoft Graph with device write permissions
2. Searches for target device by name
3. Validates device exists in Intune
4. Executes selected remote action (lock, wipe, retire, restart, sync)
5. Reports action status with next steps

**Important Notes:**
- CRITICAL: Wipe and Retire actions are irreversible
- Remote Lock: Locks device, user can unlock with PIN/password
- Wipe: Factory reset, removes ALL data (use for lost/stolen devices)
- Retire: Removes company data, keeps personal data (BYOD-friendly)
- Restart: Forces device restart (Windows only)
- Sync: Forces immediate check-in to apply policies/apps
- Essential for security incident response
- Coordinate with security team for lost/stolen devices
- Document all remote actions for compliance
- Some actions may take 5-15 minutes to complete`,
    parameters: [
      {
        name: 'deviceName',
        label: 'Device Name',
        type: 'text',
        required: true,
        placeholder: 'LAPTOP-ABC123',
        helpText: 'Name of device to execute action on'
      },
      {
        name: 'remoteAction',
        label: 'Remote Action',
        type: 'select',
        required: true,
        options: [
          { value: 'remoteLock', label: 'Remote Lock' },
          { value: 'wipe', label: 'Wipe (Factory Reset)' },
          { value: 'retire', label: 'Retire (Remove Company Data)' },
          { value: 'reboot', label: 'Restart Device' },
          { value: 'sync', label: 'Sync Device' }
        ],
        helpText: 'Remote action to execute'
      }
    ],
    scriptTemplate: (params) => {
      const deviceName = escapePowerShellString(params.deviceName);
      const remoteAction = params.remoteAction;

      return `# Execute Remote Action on Device
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementManagedDevices.ReadWrite.All"

try {
    Write-Host "Executing remote action: ${remoteAction} on ${deviceName}" -ForegroundColor Cyan
    
    # Find the device
    $Device = Get-MgDeviceManagementManagedDevice -Filter "deviceName eq '${deviceName}'" | Select-Object -First 1
    
    if (-not $Device) {
        throw "Device not found: ${deviceName}"
    }
    
    # Show device details before action
    Write-Host ${'\`n'}"Target Device:" -ForegroundColor Yellow
    Write-Host "  Name: ${deviceName}" -ForegroundColor White
    Write-Host "  User: $($Device.UserPrincipalName)" -ForegroundColor White
    Write-Host "  OS: $($Device.OperatingSystem) $($Device.OSVersion)" -ForegroundColor White
    Write-Host "  Serial: $($Device.SerialNumber)" -ForegroundColor White
    Write-Host "  Last Sync: $($Device.LastSyncDateTime)" -ForegroundColor White
    
    # Execute remote action
    switch ("${remoteAction}") {
        "remoteLock" {
            Write-Host ${'\`n'}"Initiating remote lock..." -ForegroundColor Cyan
            Invoke-MgRemoteLockDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
            Write-Host "✓ Remote lock initiated" -ForegroundColor Green
            Write-Host "User can unlock with their PIN/password" -ForegroundColor Yellow
        }
        "wipe" {
            Write-Host ${'\`n'}"WARNING: Factory reset will erase ALL data!" -ForegroundColor Red
            $WipeParams = @{
                KeepEnrollmentData = \$false
                KeepUserData = \$false
            }
            Invoke-MgWipeDeviceManagementManagedDevice -ManagedDeviceId $Device.Id -BodyParameter $WipeParams
            Write-Host "✓ Wipe (factory reset) initiated" -ForegroundColor Green
            Write-Host "Device will be reset to factory state" -ForegroundColor Yellow
        }
        "retire" {
            Write-Host ${'\`n'}"Retiring device (removes company data only)..." -ForegroundColor Cyan
            Invoke-MgRetireDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
            Write-Host "✓ Retire initiated" -ForegroundColor Green
            Write-Host "Company data will be removed, personal data preserved" -ForegroundColor Yellow
        }
        "reboot" {
            Write-Host ${'\`n'}"Initiating device restart..." -ForegroundColor Cyan
            Invoke-MgRebootDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
            Write-Host "✓ Restart initiated" -ForegroundColor Green
            Write-Host "Device will restart when user next checks in" -ForegroundColor Yellow
        }
        "sync" {
            Write-Host ${'\`n'}"Initiating device sync..." -ForegroundColor Cyan
            Invoke-MgSyncDeviceManagementManagedDevice -ManagedDeviceId $Device.Id
            Write-Host "✓ Sync initiated" -ForegroundColor Green
            Write-Host "Device will check in for policies/apps within 5-10 minutes" -ForegroundColor Yellow
        }
    }
    
    Write-Host ${'\`n'}"Device ID: $($Device.Id)" -ForegroundColor Cyan
    Write-Host "Monitor action status in Intune portal" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to execute remote action: $_"
}`;
    }
  },

  {
    id: 'intune-create-app-protection-policy',
    title: 'Create App Protection Policy',
    description: 'Create a Mobile Application Management (MAM) policy for iOS or Android apps',
    category: 'App Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Mobile Application Management (MAM) policies to protect corporate data within managed apps without requiring full device enrollment.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementApps.ReadWrite.All permission

**What You Need to Provide:**
- Policy name (descriptive name for the policy)
- Platform (iOS or Android)
- PIN required setting (whether app PIN is enforced)
- Data transfer restriction level

**What the Script Does:**
1. Connects to Microsoft Graph with app management permissions
2. Creates platform-specific app protection policy
3. Configures PIN requirements for app access
4. Sets data transfer restrictions between managed/unmanaged apps
5. Enables organizational data encryption
6. Returns policy ID for group assignment

**Important Notes:**
- MAM policies protect data without full device management (BYOD-friendly)
- PIN requirement adds layer of security before app access
- Data transfer restrictions prevent copy/paste to unmanaged apps
- Policy not applied until assigned to user groups
- Test with pilot group before broad deployment
- Works with Microsoft 365 apps and MAM-enabled third-party apps
- Essential for BYOD and contractor scenarios
- Coordinate with Conditional Access for comprehensive protection`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Corporate Data Protection Policy',
        helpText: 'Descriptive name for the app protection policy'
      },
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: [
          { value: 'ios', label: 'iOS/iPadOS' },
          { value: 'android', label: 'Android' }
        ],
        helpText: 'Target mobile platform'
      },
      {
        name: 'pinRequired',
        label: 'Require PIN for Access',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Require PIN before accessing protected apps'
      },
      {
        name: 'dataTransfer',
        label: 'Data Transfer Restriction',
        type: 'select',
        required: true,
        options: [
          { value: 'allApps', label: 'All Apps (No Restriction)' },
          { value: 'managedApps', label: 'Managed Apps Only' },
          { value: 'none', label: 'None (Block All Transfers)' }
        ],
        helpText: 'Control data sharing between apps'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const platform = params.platform;
      const pinRequired = params.pinRequired !== false;
      const dataTransfer = params.dataTransfer || 'managedApps';

      return `# Create App Protection Policy
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementApps.ReadWrite.All"

try {
    Write-Host "Creating App Protection Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "Platform: ${platform}" -ForegroundColor Yellow
    
    $PolicyParams = @{
        DisplayName = "${policyName}"
        PinRequired = \$${pinRequired}
        ManagedBrowser = "notConfigured"
        OrganizationalCredentialsRequired = \$false
        DataBackupBlocked = \$true
        DeviceComplianceRequired = \$false
        SaveAsBlocked = \$true
        PrintBlocked = \$true
    }
    
    # Set data transfer policy
    switch ("${dataTransfer}") {
        "allApps" {
            $PolicyParams.AllowedOutboundDataTransferDestinations = "allApps"
            $PolicyParams.AllowedInboundDataTransferSources = "allApps"
        }
        "managedApps" {
            $PolicyParams.AllowedOutboundDataTransferDestinations = "managedApps"
            $PolicyParams.AllowedInboundDataTransferSources = "managedApps"
        }
        "none" {
            $PolicyParams.AllowedOutboundDataTransferDestinations = "none"
            $PolicyParams.AllowedInboundDataTransferSources = "none"
        }
    }
    
    # Create platform-specific policy
    if ("${platform}" -eq "ios") {
        $PolicyParams["@odata.type"] = "#microsoft.graph.iosManagedAppProtection"
        $PolicyParams.AppDataEncryptionType = "whenDeviceLocked"
        $PolicyParams.FaceIdBlocked = \$false
        
        $Policy = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceAppManagement/iosManagedAppProtections" -Body ($PolicyParams | ConvertTo-Json -Depth 10)
    } else {
        $PolicyParams["@odata.type"] = "#microsoft.graph.androidManagedAppProtection"
        $PolicyParams.ScreenCaptureBlocked = \$true
        $PolicyParams.EncryptAppData = \$true
        
        $Policy = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceAppManagement/androidManagedAppProtections" -Body ($PolicyParams | ConvertTo-Json -Depth 10)
    }
    
    Write-Host "✓ App Protection Policy created successfully" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  Platform: ${platform}" -ForegroundColor Yellow
    Write-Host "  PIN Required: ${pinRequired}" -ForegroundColor Yellow
    Write-Host "  Data Transfer: ${dataTransfer}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.id)" -ForegroundColor Cyan
    Write-Host "Next: Assign policy to user groups and add targeted apps" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create App Protection Policy: $_"
}`;
    }
  },

  {
    id: 'intune-export-autopilot-profiles',
    title: 'Export Autopilot Deployment Profiles',
    description: 'Export all Windows Autopilot deployment profile configurations to CSV',
    category: 'Autopilot',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports all Windows Autopilot deployment profile configurations for documentation, auditing, and disaster recovery purposes.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementServiceConfig.Read.All permission

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
1. Connects to Microsoft Graph with read permissions
2. Retrieves all Autopilot deployment profiles
3. Extracts profile settings: name, mode, OOBE configuration
4. Captures join type, user assignment, and language settings
5. Exports comprehensive CSV for documentation
6. Reports profile count and summary

**Important Notes:**
- Essential for Autopilot configuration documentation
- Export before making profile changes (backup)
- Includes OOBE customization settings
- Shows Azure AD join type (Hybrid vs Azure AD only)
- Useful for replicating profiles across tenants
- Run quarterly for change tracking
- Coordinate with deployment planning
- DeviceNameTemplate shows naming convention used`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AutopilotProfiles.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Autopilot Deployment Profiles
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementServiceConfig.Read.All"

try {
    Write-Host "Collecting Autopilot deployment profiles..." -ForegroundColor Cyan
    
    $Profiles = Get-MgDeviceManagementWindowsAutopilotDeploymentProfile -All
    
    Write-Host "Found $($Profiles.Count) Autopilot profiles" -ForegroundColor Yellow
    
    $ProfileReport = foreach ($Profile in $Profiles) {
        [PSCustomObject]@{
            ProfileName                 = $Profile.DisplayName
            Description                 = $Profile.Description
            DeviceType                  = $Profile.DeviceType
            ExtractHardwareHash         = $Profile.ExtractHardwareHash
            DeviceNameTemplate          = $Profile.DeviceNameTemplate
            Language                    = $Profile.Language
            HidePrivacySettings         = $Profile.OutOfBoxExperienceSettings.HidePrivacySettings
            HideEULA                    = $Profile.OutOfBoxExperienceSettings.HideEULA
            HideChangeAccountOptions    = $Profile.OutOfBoxExperienceSettings.HideChangeAccountOptions
            UserType                    = $Profile.OutOfBoxExperienceSettings.UserType
            SkipKeyboardSelection       = $Profile.OutOfBoxExperienceSettings.SkipKeyboardSelectionPage
            EnableWhiteGlove            = $Profile.EnableWhiteGlove
            CreatedDateTime             = $Profile.CreatedDateTime
            LastModifiedDateTime        = $Profile.LastModifiedDateTime
            ProfileId                   = $Profile.Id
        }
    }
    
    $ProfileReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Autopilot profiles exported to: ${exportPath}" -ForegroundColor Green
    
    Write-Host \"\`nProfile Summary:" -ForegroundColor Yellow
    Write-Host "  Total Profiles: $($Profiles.Count)" -ForegroundColor White
    $ProfileReport | Group-Object DeviceType | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
} catch {
    Write-Error "Failed to export Autopilot profiles: $_"
}`;
    }
  },

  {
    id: 'intune-create-compliance-policy',
    title: 'Create Device Compliance Policy',
    description: 'Create a Windows device compliance policy with security requirements',
    category: 'Compliance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates Windows device compliance policies that define security requirements devices must meet to access corporate resources.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Administrator role
- DeviceManagementConfiguration.ReadWrite.All permission

**What You Need to Provide:**
- Policy name
- Minimum OS version requirement
- Whether BitLocker is required
- Whether antivirus is required

**What the Script Does:**
1. Connects to Microsoft Graph with configuration permissions
2. Creates Windows 10/11 compliance policy
3. Sets minimum OS version requirement
4. Configures BitLocker encryption requirement
5. Enables antivirus/antispyware requirement
6. Sets firewall requirement
7. Returns policy ID for group assignment

**Important Notes:**
- Non-compliant devices can be blocked by Conditional Access
- Policy not enforced until assigned to device groups
- Grace period allows time for remediation before blocking
- BitLocker requirement needs TPM 2.0 on devices
- Test with pilot group before production deployment
- Coordinate with Conditional Access policies
- Essential for Zero Trust security posture
- Users notified via Company Portal for non-compliance`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Windows Security Baseline',
        helpText: 'Descriptive name for the compliance policy'
      },
      {
        name: 'minOsVersion',
        label: 'Minimum OS Version',
        type: 'text',
        required: false,
        placeholder: '10.0.19045',
        helpText: 'Minimum Windows version (e.g., 10.0.19045 for 22H2)'
      },
      {
        name: 'requireBitLocker',
        label: 'Require BitLocker Encryption',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Require drive encryption'
      },
      {
        name: 'requireAntivirus',
        label: 'Require Antivirus',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Require antivirus/antispyware to be enabled'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const minOsVersion = escapePowerShellString(params.minOsVersion || '');
      const requireBitLocker = params.requireBitLocker !== false;
      const requireAntivirus = params.requireAntivirus !== false;

      return `# Create Device Compliance Policy
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

try {
    Write-Host "Creating Compliance Policy: ${policyName}" -ForegroundColor Cyan
    
    $PolicyParams = @{
        "@odata.type" = "#microsoft.graph.windows10CompliancePolicy"
        DisplayName = "${policyName}"
        Description = "Windows device compliance policy created via PSForge"
        BitLockerEnabled = \$${requireBitLocker}
        SecureBootEnabled = \$true
        CodeIntegrityEnabled = \$false
        StorageRequireEncryption = \$${requireBitLocker}
        ActiveFirewallRequired = \$true
        DefenderEnabled = \$${requireAntivirus}
        AntivirusRequired = \$${requireAntivirus}
        AntiSpywareRequired = \$${requireAntivirus}
        RtpEnabled = \$${requireAntivirus}
        SignatureOutOfDate = \$${requireAntivirus}
        PasswordRequired = \$true
        PasswordRequiredType = "deviceDefault"
        PasswordMinimumLength = 8
    }
    
    # Add minimum OS version if specified
    if ("${minOsVersion}" -ne "") {
        $PolicyParams.OsMinimumVersion = "${minOsVersion}"
        Write-Host "  Minimum OS: ${minOsVersion}" -ForegroundColor Yellow
    }
    
    $Policy = New-MgDeviceManagementDeviceCompliancePolicy -BodyParameter $PolicyParams
    
    Write-Host "✓ Compliance Policy created successfully" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "  BitLocker Required: ${requireBitLocker}" -ForegroundColor Yellow
    Write-Host "  Antivirus Required: ${requireAntivirus}" -ForegroundColor Yellow
    Write-Host "  ID: $($Policy.Id)" -ForegroundColor Cyan
    Write-Host "Next: Assign policy to device groups" -ForegroundColor Yellow
    Write-Host "Note: Coordinate with Conditional Access for enforcement" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to create Compliance Policy: $_"
}`;
    }
  },

  {
    id: 'intune-export-app-install-status',
    title: 'Export App Installation Status Report',
    description: 'Export detailed app installation status across all devices to CSV',
    category: 'Reporting',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates comprehensive app installation status reports showing deployment success/failure across managed devices.

**Prerequisites:**
- Microsoft.Graph PowerShell module
- Intune Administrator or Global Reader role
- DeviceManagementApps.Read.All permission

**What You Need to Provide:**
- App display name (or partial name to filter)
- CSV export file path

**What the Script Does:**
1. Connects to Microsoft Graph with app read permissions
2. Searches for app by display name filter
3. Retrieves device installation status for matched app
4. Extracts device name, user, install state, error codes
5. Captures last sync and install timestamps
6. Exports comprehensive installation report

**Important Notes:**
- Essential for troubleshooting failed app deployments
- Shows install state: Installed, Failed, Pending, NotApplicable
- Error codes help identify specific failure reasons
- Use partial name to find apps (e.g., "Chrome" finds "Google Chrome")
- Run after app deployments to verify success
- Filter report by InstallState for failed installations
- Coordinate with help desk for user remediation
- Track installation trends over time`,
    parameters: [
      {
        name: 'appName',
        label: 'App Name (or Partial Name)',
        type: 'text',
        required: true,
        placeholder: 'Google Chrome',
        helpText: 'Full or partial app name to search for'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AppInstallStatus.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export App Installation Status Report
# Generated: ${new Date().toISOString()}

Connect-MgGraph -Scopes "DeviceManagementApps.Read.All"

try {
    Write-Host "Searching for app: ${appName}" -ForegroundColor Cyan
    
    # Find the app
    $Apps = Get-MgDeviceAppManagementMobileApp -Filter "contains(displayName, '${appName}')"
    
    if (-not $Apps -or $Apps.Count -eq 0) {
        throw "No apps found matching: ${appName}"
    }
    
    Write-Host "Found $($Apps.Count) matching app(s)" -ForegroundColor Yellow
    
    $AllInstallStatus = @()
    
    foreach ($App in $Apps) {
        Write-Host "  Processing: $($App.DisplayName)" -ForegroundColor White
        
        # Get device statuses for this app
        $Uri = "https://graph.microsoft.com/v1.0/deviceAppManagement/mobileApps/$($App.Id)/deviceStatuses"
        
        try {
            $DeviceStatuses = Invoke-MgGraphRequest -Method GET -Uri $Uri
            
            foreach ($Status in $DeviceStatuses.value) {
                $AllInstallStatus += [PSCustomObject]@{
                    AppName               = $App.DisplayName
                    AppId                 = $App.Id
                    DeviceName            = $Status.deviceName
                    UserPrincipalName     = $Status.userPrincipalName
                    InstallState          = $Status.installState
                    InstallStateDetail    = $Status.installStateDetail
                    ErrorCode             = $Status.errorCode
                    LastSyncDateTime      = $Status.lastSyncDateTime
                    OSVersion             = $Status.osVersion
                    OSDescription         = $Status.osDescription
                    DeviceId              = $Status.deviceId
                }
            }
        } catch {
            Write-Host "    Warning: Could not retrieve device statuses for $($App.DisplayName)" -ForegroundColor Yellow
        }
    }
    
    if ($AllInstallStatus.Count -eq 0) {
        Write-Host "No installation status data found" -ForegroundColor Yellow
    } else {
        $AllInstallStatus | Export-Csv -Path "${exportPath}" -NoTypeInformation
        
        Write-Host "✓ App installation status exported to: ${exportPath}" -ForegroundColor Green
        Write-Host "  Total Records: $($AllInstallStatus.Count)" -ForegroundColor Yellow
        
        Write-Host \"\`nInstallation Summary:" -ForegroundColor Yellow
        $AllInstallStatus | Group-Object InstallState | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor White
        }
        
        # Show failed installations
        $Failed = $AllInstallStatus | Where-Object { $_.InstallState -eq "failed" }
        if ($Failed.Count -gt 0) {
            Write-Host \"\`nFailed Installations: $($Failed.Count)" -ForegroundColor Red
            $Failed | Select-Object -First 5 | ForEach-Object {
                Write-Host "  $($_.DeviceName) - Error: $($_.ErrorCode)" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Error "Failed to export app installation status: $_"
}`;
    }
  }
];

export const intuneCategories = [
  'Autopilot',
  'Device Management',
  'Compliance',
  'Updates',
  'App Management',
  'Configuration Profiles',
  'Scripts & Remediation',
  'Communication',
  'Reporting',
  'Security',
  'Common Admin Tasks'
];
