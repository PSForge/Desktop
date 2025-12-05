import { escapePowerShellString } from './powershell-utils';

export interface WindowsServerParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  helpText?: string;
}

export interface WindowsServerTask {
  id: string;
  title: string;
  description: string;
  category: string;
  instructions?: string;
  parameters: WindowsServerParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium?: boolean;
}

export const windowsServerTasks: WindowsServerTask[] = [
  {
    id: 'ws-export-server-inventory',
    title: 'Export Server Inventory',
    description: 'Export comprehensive server inventory from multiple servers to CSV',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports hardware and OS inventory from multiple Windows Servers
- Supports asset management and capacity planning
- Shows detailed hardware and software configuration

**Prerequisites:**
- PowerShell remoting enabled on target servers
- Administrator credentials for target servers
- WMI access to target servers

**What You Need to Provide:**
- Server names (one per line)
- CSV export file path

**What the Script Does:**
1. Queries each server via WMI
2. Collects OS, manufacturer, model, memory, and domain
3. Exports server inventory to CSV
4. Reports collection failures

**Important Notes:**
- Essential for server asset management
- Shows hardware specs and OS versions
- Use for capacity planning and refresh cycles
- Run quarterly for inventory updates
- Identify servers needing upgrades
- Typical use: asset audits, capacity planning
- Plan hardware refresh based on age
- Consolidate underutilized servers`,
    parameters: [
      {
        name: 'serverNames',
        label: 'Server Names (one per line)',
        type: 'textarea',
        required: true,
        placeholder: 'SERVER01\nSERVER02',
        helpText: 'List of server names'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ServerInventory.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverNamesInput = params.serverNames.trim();
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Server Inventory
# Generated: ${new Date().toISOString()}

$Servers = @(
${serverNamesInput.split('\n').filter((line: string) => line.trim()).map((name: string) => `    "${escapePowerShellString(name.trim())}"`).join('\n')}
)

try {
    Write-Host "Collecting server inventory..." -ForegroundColor Cyan
    
    $Inventory = foreach ($Server in $Servers) {
        try {
            $OS = Get-WmiObject -Class Win32_OperatingSystem -ComputerName $Server
            $CS = Get-WmiObject -Class Win32_ComputerSystem -ComputerName $Server
            
            [PSCustomObject]@{
                ServerName       = $Server
                OperatingSystem  = $OS.Caption
                OSVersion        = $OS.Version
                Manufacturer     = $CS.Manufacturer
                Model            = $CS.Model
                TotalMemoryGB    = [math]::Round($CS.TotalPhysicalMemory / 1GB, 2)
                Domain           = $CS.Domain
            }
        } catch {
            Write-Warning "Failed to collect data from: $Server"
        }
    }
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Server inventory exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export server inventory: $_"
}`;
    }
  },

  {
    id: 'ws-export-installed-roles',
    title: 'Export Installed Roles and Features',
    description: 'Export installed Windows Server roles and features to CSV',
    category: 'Roles & Features',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports installed roles and features from Windows Server
- Supports configuration documentation and compliance verification
- Shows all installed server roles and optional features

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Server Manager PowerShell module

**What You Need to Provide:**
- Server name
- CSV export file path

**What the Script Does:**
1. Queries installed Windows features
2. Filters to installed features only
3. Collects name, type, and install state
4. Exports feature inventory to CSV

**Important Notes:**
- Essential for server configuration documentation
- Shows all installed roles and features
- Use for compliance verification
- Run after server configuration changes
- Document server roles for disaster recovery
- Typical use: configuration audits, DR planning
- Match installed roles to server purpose
- Remove unnecessary features for security`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\InstalledRoles.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Installed Roles and Features
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting installed roles and features from: ${serverName}" -ForegroundColor Cyan
    
    $Features = Get-WindowsFeature -ComputerName "${serverName}" | Where-Object { $_.Installed -eq $true }
    
    Write-Host "Found $($Features.Count) installed features" -ForegroundColor Yellow
    
    $FeatureReport = foreach ($Feature in $Features) {
        [PSCustomObject]@{
            DisplayName      = $Feature.DisplayName
            Name             = $Feature.Name
            FeatureType      = $Feature.FeatureType
            InstallState     = $Feature.InstallState
        }
    }
    
    $FeatureReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Roles and features exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export roles and features: $_"
}`;
    }
  },

  {
    id: 'ws-export-event-logs',
    title: 'Export Event Logs',
    description: 'Export recent event logs from a Windows Server to CSV',
    category: 'Event Logs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports recent event log entries
- Supports troubleshooting, security monitoring, and compliance auditing
- Shows errors, warnings, and informational events

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Event log access permissions

**What You Need to Provide:**
- Server name
- Log name (System/Application/Security)
- Time window in hours
- CSV export file path

**What the Script Does:**
1. Queries specified event log remotely
2. Filters events by time window
3. Limits to 1000 most recent events
4. Exports event details to CSV

**Important Notes:**
- Essential for troubleshooting and security monitoring
- Shows errors, warnings, and critical events
- Use for incident investigation
- Run during troubleshooting or security incidents
- Security log requires special permissions
- Typical use: troubleshooting, security audits
- Investigate errors and warnings immediately
- Monitor for security events regularly`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'logName',
        label: 'Log Name',
        type: 'select',
        required: true,
        options: [
          { value: 'System', label: 'System' },
          { value: 'Application', label: 'Application' },
          { value: 'Security', label: 'Security' }
        ],
        defaultValue: 'System',
        helpText: 'Event log to export'
      },
      {
        name: 'hours',
        label: 'Last Hours',
        type: 'number',
        required: true,
        defaultValue: 24,
        helpText: 'Export events from the last N hours'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\EventLogs.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const logName = params.logName;
      const hours = params.hours || 24;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Event Logs
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting ${logName} event logs from: ${serverName}" -ForegroundColor Cyan
    
    $StartTime = (Get-Date).AddHours(-${hours})
    
    $Events = Get-WinEvent -ComputerName "${serverName}" -FilterHashtable @{
        LogName = "${logName}"
        StartTime = $StartTime
    } -MaxEvents 1000 -ErrorAction Stop
    
    Write-Host "Found $($Events.Count) events" -ForegroundColor Yellow
    
    $EventReport = foreach ($Event in $Events) {
        [PSCustomObject]@{
            TimeCreated      = $Event.TimeCreated
            Level            = $Event.LevelDisplayName
            Source           = $Event.ProviderName
            EventID          = $Event.Id
            Message          = $Event.Message
        }
    }
    
    $EventReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Event logs exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export event logs: $_"
}`;
    }
  },

  {
    id: 'ws-export-services',
    title: 'Export Services Status',
    description: 'Export Windows services status from a server to CSV',
    category: 'Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports Windows service inventory with status
- Supports service monitoring and configuration documentation
- Shows all services and their startup configurations

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Service control manager access

**What You Need to Provide:**
- Server name
- CSV export file path

**What the Script Does:**
1. Queries all Windows services remotely
2. Collects service name, display name, status, and startup type
3. Exports service inventory to CSV
4. Reports total service count

**Important Notes:**
- Essential for service health monitoring
- Shows all Windows services and their states
- Use for troubleshooting service failures
- Run during server health checks
- Identify stopped automatic services
- Typical use: health monitoring, troubleshooting
- Investigate stopped automatic services immediately
- Document critical service dependencies`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\Services.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Services Status
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting services from: ${serverName}" -ForegroundColor Cyan
    
    $Services = Get-Service -ComputerName "${serverName}"
    
    Write-Host "Found $($Services.Count) services" -ForegroundColor Yellow
    
    $ServiceReport = foreach ($Service in $Services) {
        [PSCustomObject]@{
            ServiceName      = $Service.Name
            DisplayName      = $Service.DisplayName
            Status           = $Service.Status
            StartType        = $Service.StartType
        }
    }
    
    $ServiceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Services exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export services: $_"
}`;
    }
  },

  {
    id: 'ws-export-disk-usage',
    title: 'Export Disk Usage',
    description: 'Export disk usage information from a server to CSV',
    category: 'Storage',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports disk space usage metrics
- Supports capacity planning and proactive storage management
- Shows all local drives with size and free space

**Prerequisites:**
- PowerShell remoting enabled on target server (or local execution)
- Administrator credentials for target server
- WMI access to target server

**What You Need to Provide:**
- Server name
- CSV export file path

**What the Script Does:**
1. Queries local disk drives via WMI
2. Calculates size, free space, and percentage free
3. Exports disk usage report to CSV
4. Shows all fixed local disks

**Important Notes:**
- Essential for capacity planning and storage monitoring
- Shows all local disk drives and space usage
- Use for proactive storage management
- Run weekly for storage trend analysis
- Plan storage expansion before running out
- Typical use: capacity planning, monitoring
- Alert when free space drops below 15%
- Clean up or expand before critical levels`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\DiskUsage.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Disk Usage
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting disk usage from: ${serverName}" -ForegroundColor Cyan
    
    $Disks = Get-WmiObject -Class Win32_LogicalDisk -ComputerName "${serverName}" -Filter "DriveType=3"
    
    $DiskReport = foreach ($Disk in $Disks) {
        $PercentFree = if ($Disk.Size -gt 0) {
            [math]::Round(($Disk.FreeSpace / $Disk.Size) * 100, 2)
        } else { 0 }
        
        [PSCustomObject]@{
            DriveLetter      = $Disk.DeviceID
            VolumeName       = $Disk.VolumeName
            SizeGB           = [math]::Round($Disk.Size / 1GB, 2)
            FreeSpaceGB      = [math]::Round($Disk.FreeSpace / 1GB, 2)
            PercentFree      = $PercentFree
        }
    }
    
    $DiskReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Disk usage exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export disk usage: $_"
}`;
    }
  },
  {
    id: 'ws-install-role',
    title: 'Install Server Role/Feature',
    description: 'Install a Windows Server role or feature with management tools',
    category: 'Roles & Features',
    isPremium: true,
    instructions: `**How This Task Works:**
- Installs Windows Server roles and features remotely
- Automatically includes management tools and PowerShell modules
- Supports all available server roles (AD, DNS, DHCP, IIS, etc.)

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Server Manager PowerShell module installed

**What You Need to Provide:**
- Server name to install the role on
- Role or feature name to install

**What the Script Does:**
1. Connects to the target server remotely
2. Installs the specified role or feature
3. Includes management tools and snap-ins
4. Reports installation status and any required reboots

**Important Notes:**
- Essential for deploying new server roles
- Some roles require server restart to complete
- Management tools installed automatically
- Use for initial server configuration
- Check prerequisites for specific roles
- Typical use: deploying AD, DNS, DHCP, File Services, IIS
- Validate role requirements before installation
- Plan for server reboot if required`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to install the role on'
      },
      {
        name: 'roleName',
        label: 'Role/Feature Name',
        type: 'select',
        required: true,
        options: [
          { value: 'AD-Domain-Services', label: 'Active Directory Domain Services' },
          { value: 'DHCP', label: 'DHCP Server' },
          { value: 'DNS', label: 'DNS Server' },
          { value: 'Web-Server', label: 'Web Server (IIS)' },
          { value: 'File-Services', label: 'File and Storage Services' },
          { value: 'Print-Services', label: 'Print and Document Services' },
          { value: 'Remote-Desktop-Services', label: 'Remote Desktop Services' },
          { value: 'Windows-Server-Backup', label: 'Windows Server Backup' }
        ],
        helpText: 'Select the role or feature to install'
      },
      {
        name: 'includeManagementTools',
        label: 'Include Management Tools',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Install management tools and PowerShell modules'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const roleName = params.roleName;
      const includeTools = params.includeManagementTools !== false;

      return `# Install Server Role/Feature
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Installing ${roleName} on server: ${serverName}" -ForegroundColor Cyan
    
    $InstallParams = @{
        Name            = "${roleName}"
        ComputerName    = "${serverName}"
        IncludeManagementTools = $${includeTools ? 'true' : 'false'}
    }
    
    $Result = Install-WindowsFeature @InstallParams
    
    if ($Result.Success) {
        Write-Host "✓ ${roleName} installed successfully" -ForegroundColor Green
        
        if ($Result.RestartNeeded -eq 'Yes') {
            Write-Host "⚠ Server restart required to complete installation" -ForegroundColor Yellow
        }
        
        Write-Host "Exit Code: $($Result.ExitCode)" -ForegroundColor Gray
    } else {
        Write-Error "Installation failed: $($Result.ExitCode)"
    }
    
} catch {
    Write-Error "Failed to install role: $_"
}`;
    }
  },

  {
    id: 'ws-remove-role',
    title: 'Remove Server Role/Feature',
    description: 'Uninstall a Windows Server role or feature',
    category: 'Roles & Features',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes Windows Server roles and features remotely
- Can optionally remove installation files to save disk space
- Supports safe removal with dependency checking

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Server Manager PowerShell module installed

**What You Need to Provide:**
- Server name to remove the role from
- Role or feature name to remove

**What the Script Does:**
1. Connects to the target server remotely
2. Uninstalls the specified role or feature
3. Optionally removes installation files
4. Reports removal status and any required reboots

**Important Notes:**
- Use for decommissioning server roles
- Some roles require server restart after removal
- Consider dependencies before removing
- Removal can free up significant disk space
- Use -Remove parameter to delete installation files
- Typical use: role consolidation, security hardening
- Validate no services depend on the role
- Plan for server reboot if required`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to remove the role from'
      },
      {
        name: 'roleName',
        label: 'Role/Feature Name',
        type: 'text',
        required: true,
        placeholder: 'Web-Server',
        helpText: 'Name of the role or feature to remove (e.g., Web-Server, DHCP, DNS)'
      },
      {
        name: 'removeFiles',
        label: 'Remove Installation Files',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Remove installation files to save disk space'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const roleName = escapePowerShellString(params.roleName);
      const removeFiles = params.removeFiles === true;

      return `# Remove Server Role/Feature
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Removing ${roleName} from server: ${serverName}" -ForegroundColor Cyan
    
    $RemoveParams = @{
        Name            = "${roleName}"
        ComputerName    = "${serverName}"
        Remove          = $${removeFiles ? 'true' : 'false'}
    }
    
    $Result = Uninstall-WindowsFeature @RemoveParams
    
    if ($Result.Success) {
        Write-Host "✓ ${roleName} removed successfully" -ForegroundColor Green
        
        if ($Result.RestartNeeded -eq 'Yes') {
            Write-Host "⚠ Server restart required to complete removal" -ForegroundColor Yellow
        }
        
        Write-Host "Exit Code: $($Result.ExitCode)" -ForegroundColor Gray
    } else {
        Write-Error "Removal failed: $($Result.ExitCode)"
    }
    
} catch {
    Write-Error "Failed to remove role: $_"
}`;
    }
  },

  {
    id: 'ws-export-features',
    title: 'Export Available Features List',
    description: 'Export list of all available Windows Server roles and features',
    category: 'Roles & Features',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports complete inventory of available Windows features
- Shows installation state of each role and feature
- Supports configuration documentation and planning

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Server Manager PowerShell module installed

**What You Need to Provide:**
- Server name to query features from
- CSV export file path

**What the Script Does:**
1. Queries all available Windows features
2. Collects name, display name, installation state, and type
3. Exports complete feature inventory to CSV
4. Reports total count of available features

**Important Notes:**
- Essential for server configuration planning
- Shows both installed and available features
- Use for capacity planning and documentation
- Run before server role deployments
- Identify what features are available
- Typical use: planning, documentation, audits
- Compare features across different Windows versions
- Plan role installations based on availability`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to query'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AvailableFeatures.csv',
        helpText: 'Path where the CSV file will be saved'
      },
      {
        name: 'installedOnly',
        label: 'Export Installed Only',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Export only installed features'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);
      const installedOnly = params.installedOnly === true;

      return `# Export Available Features List
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Windows features from: ${serverName}" -ForegroundColor Cyan
    
    $Features = Get-WindowsFeature -ComputerName "${serverName}"
    
    ${installedOnly ? `$Features = $Features | Where-Object { $_.Installed -eq $true }
    Write-Host "Found $($Features.Count) installed features" -ForegroundColor Yellow` : `Write-Host "Found $($Features.Count) total features" -ForegroundColor Yellow`}
    
    $FeatureReport = foreach ($Feature in $Features) {
        [PSCustomObject]@{
            Name             = $Feature.Name
            DisplayName      = $Feature.DisplayName
            Installed        = $Feature.Installed
            InstallState     = $Feature.InstallState
            FeatureType      = $Feature.FeatureType
            Path             = $Feature.Path
            Depth            = $Feature.Depth
        }
    }
    
    $FeatureReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Features list exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export features list: $_"
}`;
    }
  },

  {
    id: 'ws-restart-server',
    title: 'Restart Windows Server',
    description: 'Reboot a Windows Server with optional force and delay',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restarts Windows Server remotely with controlled timing
- Supports graceful or forced restart options
- Allows notification delay for logged-in users

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Network connectivity to target server

**What You Need to Provide:**
- Server name to restart
- Force option (for immediate restart)
- Optional delay in seconds

**What the Script Does:**
1. Connects to the target server remotely
2. Initiates a controlled restart
3. Forces restart if specified (no user prompts)
4. Reports restart initiation status

**Important Notes:**
- Use for applying updates and configuration changes
- Force option bypasses user warnings
- Consider logged-in users before restarting
- Server will be unavailable during restart
- Plan restart during maintenance windows
- Typical use: patch deployment, role installation
- Notify users before forcing restart
- Verify no critical processes are running`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to restart'
      },
      {
        name: 'force',
        label: 'Force Restart',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Force restart without waiting for applications to close'
      },
      {
        name: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        required: false,
        defaultValue: 30,
        helpText: 'Number of seconds to wait before restart'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const force = params.force === true;
      const timeout = params.timeout || 30;

      return `# Restart Windows Server
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Initiating restart of server: ${serverName}" -ForegroundColor Cyan
    ${force ? `Write-Host "⚠ Force restart enabled - applications will be closed immediately" -ForegroundColor Yellow` : ''}
    
    $RestartParams = @{
        ComputerName = "${serverName}"
        Force        = $${force ? 'true' : 'false'}
        Timeout      = ${timeout}
    }
    
    Restart-Computer @RestartParams
    
    Write-Host "✓ Restart initiated successfully" -ForegroundColor Green
    Write-Host "Server ${serverName} will restart in ${timeout} seconds" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to restart server: $_"
}`;
    }
  },

  {
    id: 'ws-shutdown-server',
    title: 'Shutdown Windows Server',
    description: 'Power off a Windows Server gracefully or forcefully',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Shuts down Windows Server remotely with controlled timing
- Supports graceful or forced shutdown options
- Allows notification delay for logged-in users

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Network connectivity to target server

**What You Need to Provide:**
- Server name to shut down
- Force option (for immediate shutdown)

**What the Script Does:**
1. Connects to the target server remotely
2. Initiates a controlled shutdown
3. Forces shutdown if specified (no user prompts)
4. Reports shutdown initiation status

**Important Notes:**
- Use for planned server maintenance or decommissioning
- Force option bypasses user warnings
- Consider logged-in users before shutting down
- Server will be offline until manually powered on
- Plan shutdown during maintenance windows
- Typical use: hardware maintenance, power saving
- Notify users before forcing shutdown
- Coordinate with physical access for power-on`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to shut down'
      },
      {
        name: 'force',
        label: 'Force Shutdown',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Force shutdown without waiting for applications to close'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const force = params.force === true;

      return `# Shutdown Windows Server
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Initiating shutdown of server: ${serverName}" -ForegroundColor Cyan
    ${force ? `Write-Host "⚠ Force shutdown enabled - applications will be closed immediately" -ForegroundColor Yellow` : ''}
    
    $ShutdownParams = @{
        ComputerName = "${serverName}"
        Force        = $${force ? 'true' : 'false'}
    }
    
    Stop-Computer @ShutdownParams
    
    Write-Host "✓ Shutdown initiated successfully" -ForegroundColor Green
    Write-Host "Server ${serverName} is shutting down" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to shutdown server: $_"
}`;
    }
  },

  {
    id: 'ws-rename-server',
    title: 'Rename Windows Server',
    description: 'Change the computer name of a Windows Server',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Renames Windows Server computer name remotely
- Automatically restarts server to apply changes
- Updates Active Directory computer object if domain-joined

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Domain admin rights if server is domain-joined

**What You Need to Provide:**
- Current server name
- New server name (NetBIOS name)

**What the Script Does:**
1. Connects to the target server remotely
2. Changes the computer name
3. Automatically restarts the server
4. Updates AD computer object if applicable

**Important Notes:**
- Server restart is required and automatic
- Plan for brief service interruption
- Update DNS records after rename
- Update monitoring and documentation
- Domain-joined servers update AD automatically
- Typical use: standardizing naming conventions
- Coordinate with other administrators
- Update inventory and CMDB systems`,
    parameters: [
      {
        name: 'serverName',
        label: 'Current Server Name',
        type: 'text',
        required: true,
        placeholder: 'OLDSERVER01',
        helpText: 'Current name of the server'
      },
      {
        name: 'newName',
        label: 'New Server Name',
        type: 'text',
        required: true,
        placeholder: 'NEWSERVER01',
        helpText: 'New name for the server (15 characters max)'
      },
      {
        name: 'restart',
        label: 'Restart Automatically',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Restart server to apply name change'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const newName = escapePowerShellString(params.newName);
      const restart = params.restart !== false;

      return `# Rename Windows Server
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Renaming server: ${serverName} -> ${newName}" -ForegroundColor Cyan
    
    $RenameParams = @{
        ComputerName = "${serverName}"
        NewName      = "${newName}"
        Force        = $true
        ${restart ? 'Restart      = $true' : ''}
    }
    
    Rename-Computer @RenameParams
    
    Write-Host "✓ Server renamed successfully" -ForegroundColor Green
    ${restart ? `Write-Host "⚠ Server is restarting to apply changes" -ForegroundColor Yellow` : `Write-Host "⚠ Server restart required to apply changes" -ForegroundColor Yellow`}
    Write-Host "New name: ${newName}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to rename server: $_"
}`;
    }
  },

  {
    id: 'ws-list-services',
    title: 'List All Services',
    description: 'Export complete list of Windows services with status',
    category: 'Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports comprehensive list of all Windows services
- Shows service status, startup type, and display name
- Supports service monitoring and documentation

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Service Control Manager access

**What You Need to Provide:**
- Server name to query services from
- CSV export file path

**What the Script Does:**
1. Queries all Windows services remotely
2. Collects name, display name, status, startup type, and description
3. Exports complete service list to CSV
4. Reports total service count

**Important Notes:**
- Essential for service inventory and monitoring
- Shows all services regardless of state
- Use for troubleshooting and documentation
- Run during server health checks
- Identify service configuration changes
- Typical use: health checks, change tracking
- Compare against baseline configurations
- Identify unauthorized service installations`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to query services from'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AllServices.csv',
        helpText: 'Path where the CSV file will be saved'
      },
      {
        name: 'statusFilter',
        label: 'Filter by Status',
        type: 'select',
        required: false,
        options: [
          { value: 'All', label: 'All Services' },
          { value: 'Running', label: 'Running Only' },
          { value: 'Stopped', label: 'Stopped Only' }
        ],
        defaultValue: 'All',
        helpText: 'Filter services by running status'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);
      const statusFilter = params.statusFilter || 'All';

      return `# List All Services
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting services from: ${serverName}" -ForegroundColor Cyan
    
    $Services = Get-Service -ComputerName "${serverName}"
    
    ${statusFilter !== 'All' ? `$Services = $Services | Where-Object { $_.Status -eq '${statusFilter}' }` : ''}
    
    Write-Host "Found $($Services.Count) services" -ForegroundColor Yellow
    
    $ServiceReport = foreach ($Service in $Services) {
        # Get additional details using WMI
        $WmiService = Get-WmiObject -Class Win32_Service -ComputerName "${serverName}" -Filter "Name='$($Service.Name)'" -ErrorAction SilentlyContinue
        
        [PSCustomObject]@{
            ServiceName      = $Service.Name
            DisplayName      = $Service.DisplayName
            Status           = $Service.Status
            StartType        = $Service.StartType
            CanStop          = $Service.CanStop
            CanPauseAndContinue = $Service.CanPauseAndContinue
            Description      = if ($WmiService) { $WmiService.Description } else { '' }
            PathName         = if ($WmiService) { $WmiService.PathName } else { '' }
            StartName        = if ($WmiService) { $WmiService.StartName } else { '' }
        }
    }
    
    $ServiceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Services list exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export services list: $_"
}`;
    }
  },

  {
    id: 'ws-start-service',
    title: 'Start Windows Service',
    description: 'Start a stopped Windows service remotely',
    category: 'Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Starts a stopped Windows service on a remote server
- Verifies service dependencies are started first
- Confirms service reached running state

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Service Control Manager permissions

**What You Need to Provide:**
- Server name where service is located
- Service name to start

**What the Script Does:**
1. Connects to the target server remotely
2. Checks current service status
3. Starts the service and dependent services
4. Verifies service reached running state

**Important Notes:**
- Use for service recovery and maintenance
- Service dependencies are started automatically
- Verify service prerequisites before starting
- Check application logs if service fails to start
- Some services require specific startup order
- Typical use: service recovery, post-maintenance
- Investigate if service fails to start
- Check service account permissions`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server where the service is located'
      },
      {
        name: 'serviceName',
        label: 'Service Name',
        type: 'text',
        required: true,
        placeholder: 'W3SVC',
        helpText: 'Name of the service to start (e.g., W3SVC for IIS)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const serviceName = escapePowerShellString(params.serviceName);

      return `# Start Windows Service
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Starting service: ${serviceName} on server: ${serverName}" -ForegroundColor Cyan
    
    # Get current service status
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}" -ErrorAction Stop
    
    if ($Service.Status -eq 'Running') {
        Write-Host "Service is already running" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Current status: $($Service.Status)" -ForegroundColor Gray
    
    # Start the service
    Start-Service -Name "${serviceName}" -ComputerName "${serverName}" -ErrorAction Stop
    
    # Wait for service to start and verify
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}"
    $Timeout = 30
    $Timer = 0
    
    while ($Service.Status -ne 'Running' -and $Timer -lt $Timeout) {
        Start-Sleep -Seconds 1
        $Timer++
        $Service.Refresh()
    }
    
    if ($Service.Status -eq 'Running') {
        Write-Host "✓ Service ${serviceName} started successfully" -ForegroundColor Green
    } else {
        Write-Warning "Service did not reach running state within $Timeout seconds. Current status: $($Service.Status)"
    }
    
} catch {
    Write-Error "Failed to start service: $_"
}`;
    }
  },

  {
    id: 'ws-stop-service',
    title: 'Stop Windows Service',
    description: 'Stop a running Windows service remotely',
    category: 'Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Stops a running Windows service on a remote server
- Forces stop if service doesn't respond gracefully
- Stops dependent services automatically

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Service Control Manager permissions

**What You Need to Provide:**
- Server name where service is located
- Service name to stop

**What the Script Does:**
1. Connects to the target server remotely
2. Checks current service status
3. Stops the service and dependent services
4. Verifies service reached stopped state

**Important Notes:**
- Use for maintenance or troubleshooting
- Dependent services are stopped automatically
- Force option ensures service stops
- Plan for service interruption
- Some services cannot be stopped
- Typical use: maintenance, updates, troubleshooting
- Check dependent services before stopping
- Document service stop for change management`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server where the service is located'
      },
      {
        name: 'serviceName',
        label: 'Service Name',
        type: 'text',
        required: true,
        placeholder: 'W3SVC',
        helpText: 'Name of the service to stop (e.g., W3SVC for IIS)'
      },
      {
        name: 'force',
        label: 'Force Stop',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Force service to stop even if it has dependent services'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const serviceName = escapePowerShellString(params.serviceName);
      const force = params.force !== false;

      return `# Stop Windows Service
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Stopping service: ${serviceName} on server: ${serverName}" -ForegroundColor Cyan
    
    # Get current service status
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}" -ErrorAction Stop
    
    if ($Service.Status -eq 'Stopped') {
        Write-Host "Service is already stopped" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Current status: $($Service.Status)" -ForegroundColor Gray
    ${force ? `Write-Host "Force stop enabled" -ForegroundColor Yellow` : ''}
    
    # Check for dependent services
    $DependentServices = $Service.DependentServices | Where-Object { $_.Status -eq 'Running' }
    if ($DependentServices) {
        Write-Host "Stopping $($DependentServices.Count) dependent service(s)" -ForegroundColor Yellow
        foreach ($DepService in $DependentServices) {
            Write-Host "  - $($DepService.Name)" -ForegroundColor Gray
        }
    }
    
    # Stop the service
    Stop-Service -Name "${serviceName}" -ComputerName "${serverName}" -Force:$${force ? 'true' : 'false'} -ErrorAction Stop
    
    # Wait for service to stop and verify
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}"
    $Timeout = 30
    $Timer = 0
    
    while ($Service.Status -ne 'Stopped' -and $Timer -lt $Timeout) {
        Start-Sleep -Seconds 1
        $Timer++
        $Service.Refresh()
    }
    
    if ($Service.Status -eq 'Stopped') {
        Write-Host "✓ Service ${serviceName} stopped successfully" -ForegroundColor Green
    } else {
        Write-Warning "Service did not stop within $Timeout seconds. Current status: $($Service.Status)"
    }
    
} catch {
    Write-Error "Failed to stop service: $_"
}`;
    }
  },

  {
    id: 'ws-restart-service',
    title: 'Restart Windows Service',
    description: 'Restart a Windows service (stop then start)',
    category: 'Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restarts a Windows service by stopping and starting it
- Verifies service returns to running state
- Handles dependent services appropriately

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Service Control Manager permissions

**What You Need to Provide:**
- Server name where service is located
- Service name to restart

**What the Script Does:**
1. Connects to the target server remotely
2. Stops the service gracefully
3. Waits for service to fully stop
4. Starts the service and dependencies
5. Verifies service reached running state

**Important Notes:**
- Use for applying configuration changes
- Service must support stop/start operations
- Brief service interruption occurs
- Dependent services are handled automatically
- Verify configuration before restart
- Typical use: config changes, cache clearing
- Test configuration before restarting
- Monitor service logs after restart`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server where the service is located'
      },
      {
        name: 'serviceName',
        label: 'Service Name',
        type: 'text',
        required: true,
        placeholder: 'W3SVC',
        helpText: 'Name of the service to restart (e.g., W3SVC for IIS)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const serviceName = escapePowerShellString(params.serviceName);

      return `# Restart Windows Service
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Restarting service: ${serviceName} on server: ${serverName}" -ForegroundColor Cyan
    
    # Get current service status
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}" -ErrorAction Stop
    
    Write-Host "Current status: $($Service.Status)" -ForegroundColor Gray
    
    # Check for dependent services that are running
    $DependentServices = $Service.DependentServices | Where-Object { $_.Status -eq 'Running' }
    if ($DependentServices) {
        Write-Host "⚠ Service has $($DependentServices.Count) running dependent service(s)" -ForegroundColor Yellow
        foreach ($DepService in $DependentServices) {
            Write-Host "  - $($DepService.Name)" -ForegroundColor Gray
        }
    }
    
    # Restart the service
    Restart-Service -Name "${serviceName}" -ComputerName "${serverName}" -Force -ErrorAction Stop
    
    # Wait for service to restart and verify
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}"
    $Timeout = 60
    $Timer = 0
    
    while ($Service.Status -ne 'Running' -and $Timer -lt $Timeout) {
        Start-Sleep -Seconds 1
        $Timer++
        $Service.Refresh()
    }
    
    if ($Service.Status -eq 'Running') {
        Write-Host "✓ Service ${serviceName} restarted successfully" -ForegroundColor Green
        Write-Host "Service is now running" -ForegroundColor Gray
    } else {
        Write-Warning "Service did not reach running state within $Timeout seconds. Current status: $($Service.Status)"
    }
    
} catch {
    Write-Error "Failed to restart service: $_"
}`;
    }
  },

  {
    id: 'ws-set-service-startup',
    title: 'Set Service Startup Type',
    description: 'Configure Windows service startup behavior',
    category: 'Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Changes Windows service startup type configuration
- Supports Automatic, Manual, Disabled, and Delayed Auto start
- Does not start or stop the service, only changes startup behavior

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Service Control Manager permissions

**What You Need to Provide:**
- Server name where service is located
- Service name to configure
- Desired startup type

**What the Script Does:**
1. Connects to the target server remotely
2. Queries current service startup type
3. Changes startup type to specified value
4. Verifies configuration change applied

**Important Notes:**
- Does not affect current running state
- Use for service hardening and optimization
- Automatic: starts at boot automatically
- Manual: requires manual start or trigger
- Disabled: cannot be started
- Delayed Auto: starts after boot completes
- Typical use: security hardening, optimization
- Disable unnecessary services for security
- Set critical services to Automatic`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server where the service is located'
      },
      {
        name: 'serviceName',
        label: 'Service Name',
        type: 'text',
        required: true,
        placeholder: 'W3SVC',
        helpText: 'Name of the service to configure'
      },
      {
        name: 'startupType',
        label: 'Startup Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Automatic', label: 'Automatic' },
          { value: 'Manual', label: 'Manual' },
          { value: 'Disabled', label: 'Disabled' },
          { value: 'AutomaticDelayedStart', label: 'Automatic (Delayed Start)' }
        ],
        helpText: 'Select the desired startup behavior'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const serviceName = escapePowerShellString(params.serviceName);
      const startupType = params.startupType;

      return `# Set Service Startup Type
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring service: ${serviceName} on server: ${serverName}" -ForegroundColor Cyan
    
    # Get current service configuration
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}" -ErrorAction Stop
    $WmiService = Get-WmiObject -Class Win32_Service -ComputerName "${serverName}" -Filter "Name='${serviceName}'" -ErrorAction Stop
    
    Write-Host "Current startup type: $($Service.StartType)" -ForegroundColor Gray
    Write-Host "New startup type: ${startupType}" -ForegroundColor Yellow
    
    # Set the startup type
    ${startupType === 'AutomaticDelayedStart' ? `
    # For delayed automatic start, use WMI method
    $WmiService.ChangeStartMode("Automatic") | Out-Null
    Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\${serviceName}" -Name "DelayedAutostart" -Value 1 -ErrorAction SilentlyContinue
    ` : `
    Set-Service -Name "${serviceName}" -ComputerName "${serverName}" -StartupType ${startupType} -ErrorAction Stop
    `}
    
    # Verify the change
    $Service = Get-Service -Name "${serviceName}" -ComputerName "${serverName}"
    
    Write-Host "✓ Service startup type changed successfully" -ForegroundColor Green
    Write-Host "Current status: $($Service.Status)" -ForegroundColor Gray
    Write-Host "Startup type: $($Service.StartType)" -ForegroundColor Gray
    ${startupType === 'Disabled' ? `Write-Host "⚠ Service is now disabled and cannot be started" -ForegroundColor Yellow` : ''}
    
} catch {
    Write-Error "Failed to set service startup type: $_"
}`;
    }
  },

  {
    id: 'ws-clear-eventlog',
    title: 'Clear Event Log',
    description: 'Clear a Windows event log (Application, System, etc.)',
    category: 'Event Logs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Clears all entries from a specified Windows event log
- Optionally backs up log before clearing
- Supports Application, System, and other event logs

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Event Log access permissions

**What You Need to Provide:**
- Server name where event log is located
- Event log name to clear

**What the Script Does:**
1. Connects to the target server remotely
2. Optionally backs up the event log
3. Clears all entries from the specified log
4. Verifies log was cleared successfully

**Important Notes:**
- Permanently deletes all log entries if not backed up
- Use for log maintenance and space management
- Cannot clear Security log without special permissions
- Consider archiving logs before clearing
- Clearing logs may impact troubleshooting
- Typical use: routine maintenance, space cleanup
- Always back up logs before clearing
- Some compliance requirements prohibit clearing`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server where the event log is located'
      },
      {
        name: 'logName',
        label: 'Event Log Name',
        type: 'select',
        required: true,
        options: [
          { value: 'Application', label: 'Application' },
          { value: 'System', label: 'System' },
          { value: 'Setup', label: 'Setup' },
          { value: 'Security', label: 'Security (requires special permissions)' }
        ],
        helpText: 'Select the event log to clear'
      },
      {
        name: 'backupFirst',
        label: 'Backup Before Clearing',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Create a backup before clearing the log'
      },
      {
        name: 'backupPath',
        label: 'Backup Path (if backup enabled)',
        type: 'text',
        required: false,
        placeholder: 'C:\\Backups\\EventLogs\\',
        helpText: 'Directory to save backup file (only if backup is enabled)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const logName = params.logName;
      const backupFirst = params.backupFirst !== false;
      const backupPath = params.backupPath ? escapePowerShellString(params.backupPath) : '';

      return `# Clear Event Log
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Clearing ${logName} event log on server: ${serverName}" -ForegroundColor Cyan
    ${logName === 'Security' ? `Write-Host "⚠ Clearing Security log requires special permissions" -ForegroundColor Yellow` : ''}
    
    ${backupFirst ? `
    # Backup event log first
    $BackupDir = "${backupPath}"
    if (-not $BackupDir) {
        $BackupDir = "C:\\EventLogBackups"
    }
    
    # Create backup directory if it doesn't exist
    if (-not (Test-Path -Path $BackupDir)) {
        New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
    }
    
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $BackupFile = Join-Path $BackupDir "${logName}_${serverName}_$Timestamp.evtx"
    
    Write-Host "Backing up log to: $BackupFile" -ForegroundColor Yellow
    
    # Export log before clearing
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Log, $Backup)
        wevtutil epl $Log $Backup
    } -ArgumentList "${logName}", $BackupFile
    
    Write-Host "✓ Backup completed" -ForegroundColor Green
    ` : ''}
    
    # Clear the event log
    Clear-EventLog -LogName "${logName}" -ComputerName "${serverName}" -ErrorAction Stop
    
    Write-Host "✓ Event log ${logName} cleared successfully" -ForegroundColor Green
    ${backupFirst && backupPath ? `Write-Host "Backup saved to: $BackupFile" -ForegroundColor Gray` : ''}
    
    # Verify log was cleared
    $EventCount = (Get-EventLog -LogName "${logName}" -ComputerName "${serverName}" -Newest 1 -ErrorAction SilentlyContinue | Measure-Object).Count
    
    if ($EventCount -eq 0 -or $null -eq $EventCount) {
        Write-Host "Verified: Event log is now empty" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to clear event log: $_"
}`;
    }
  },

  {
    id: 'ws-search-eventlog',
    title: 'Search Event Log for Pattern',
    description: 'Search Windows event logs for specific patterns, event IDs, or keywords',
    category: 'Event Logs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Searches event logs for specific patterns or event IDs
- Supports filtering by event level, source, and time range
- Exports matching events to CSV for analysis

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Event log read permissions

**What You Need to Provide:**
- Server name to search
- Event log name (System/Application/Security)
- Search pattern (keyword or event ID)
- CSV export file path

**What the Script Does:**
1. Connects to the target server's event log
2. Searches for events matching the pattern
3. Filters by event ID if specified
4. Exports matching events to CSV

**Important Notes:**
- Essential for troubleshooting and security investigations
- Search by event ID for specific error patterns
- Use for compliance audits and security monitoring
- Limit results to avoid overwhelming output
- Security log requires elevated permissions
- Typical use: error investigation, security audits
- Search for error patterns after incidents
- Monitor for security event IDs regularly`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to search'
      },
      {
        name: 'logName',
        label: 'Event Log Name',
        type: 'select',
        required: true,
        options: [
          { value: 'System', label: 'System' },
          { value: 'Application', label: 'Application' },
          { value: 'Security', label: 'Security' }
        ],
        defaultValue: 'System',
        helpText: 'Event log to search'
      },
      {
        name: 'eventId',
        label: 'Event ID (optional)',
        type: 'number',
        required: false,
        placeholder: '1001',
        helpText: 'Specific Event ID to search for'
      },
      {
        name: 'hours',
        label: 'Search Last Hours',
        type: 'number',
        required: true,
        defaultValue: 24,
        helpText: 'Search events from the last N hours'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\EventSearch.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const logName = params.logName;
      const eventId = params.eventId;
      const hours = params.hours || 24;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Search Event Log for Pattern
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Searching ${logName} event log on server: ${serverName}" -ForegroundColor Cyan
    
    $StartTime = (Get-Date).AddHours(-${hours})
    
    ${eventId ? `# Searching for Event ID: ${eventId}
    $FilterHashtable = @{
        LogName = "${logName}"
        StartTime = $StartTime
        Id = ${eventId}
    }` : `# Searching recent events
    $FilterHashtable = @{
        LogName = "${logName}"
        StartTime = $StartTime
    }`}
    
    $Events = Get-WinEvent -ComputerName "${serverName}" -FilterHashtable $FilterHashtable -MaxEvents 1000 -ErrorAction Stop
    
    Write-Host "Found $($Events.Count) matching events" -ForegroundColor Yellow
    
    $EventReport = foreach ($Event in $Events) {
        [PSCustomObject]@{
            TimeCreated      = $Event.TimeCreated
            Level            = $Event.LevelDisplayName
            EventID          = $Event.Id
            Source           = $Event.ProviderName
            Message          = $Event.Message
            MachineName      = $Event.MachineName
        }
    }
    
    $EventReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Search results exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to search event log: $_"
}`;
    }
  },

  {
    id: 'ws-create-share',
    title: 'Create SMB File Share',
    description: 'Create a new SMB network file share with custom permissions',
    category: 'File Sharing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a new SMB network file share
- Configures share-level permissions
- Makes folders accessible over the network

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- File Server role installed (or File Services feature)
- Target folder must exist

**What You Need to Provide:**
- Server name to create share on
- Share name (network name)
- Local folder path to share
- Access level (Read or Full Access)

**What the Script Does:**
1. Connects to the target file server
2. Creates the SMB share with specified name
3. Sets share permissions based on access level
4. Confirms share creation

**Important Notes:**
- Essential for file server management
- Share name cannot contain spaces or special characters
- Folder path must exist before creating share
- Consider security when setting permissions
- Use Read-only for most users
- Typical use: departmental shares, user home drives
- Restrict full access to administrators only
- Document share purposes and permissions`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'FILESERVER01',
        helpText: 'Name of the file server'
      },
      {
        name: 'shareName',
        label: 'Share Name',
        type: 'text',
        required: true,
        placeholder: 'DeptShare',
        helpText: 'Network name for the share (no spaces)'
      },
      {
        name: 'folderPath',
        label: 'Local Folder Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Shares\\DeptShare',
        helpText: 'Local path to the folder to share'
      },
      {
        name: 'accessLevel',
        label: 'Default Access Level',
        type: 'select',
        required: true,
        options: [
          { value: 'Read', label: 'Read Only' },
          { value: 'Change', label: 'Read & Write' },
          { value: 'Full', label: 'Full Control' }
        ],
        defaultValue: 'Read',
        helpText: 'Default permission level for Everyone group'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const shareName = escapePowerShellString(params.shareName);
      const folderPath = escapePowerShellString(params.folderPath);
      const accessLevel = params.accessLevel || 'Read';

      return `# Create SMB File Share
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating SMB share '${shareName}' on server: ${serverName}" -ForegroundColor Cyan
    
    # Create the SMB share
    $ShareParams = @{
        Name            = "${shareName}"
        Path            = "${folderPath}"
        ${accessLevel === 'Full' ? 'FullAccess' : accessLevel === 'Change' ? 'ChangeAccess' : 'ReadAccess'} = "Everyone"
    }
    
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Params)
        New-SmbShare @Params
    } -ArgumentList $ShareParams
    
    Write-Host "✓ Share '${shareName}' created successfully" -ForegroundColor Green
    Write-Host "Network Path: \\\\${serverName}\\${shareName}" -ForegroundColor Gray
    Write-Host "Local Path: ${folderPath}" -ForegroundColor Gray
    Write-Host "Access Level: ${accessLevel}" -ForegroundColor Gray
    
    # Verify share creation
    $Share = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Name)
        Get-SmbShare -Name $Name -ErrorAction SilentlyContinue
    } -ArgumentList "${shareName}"
    
    if ($Share) {
        Write-Host "✓ Share verification successful" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to create SMB share: $_"
}`;
    }
  },

  {
    id: 'ws-remove-share',
    title: 'Remove SMB File Share',
    description: 'Delete an existing SMB network file share',
    category: 'File Sharing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes an existing SMB network file share
- Does not delete the underlying folder or files
- Only removes network accessibility

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Share must exist on the target server

**What You Need to Provide:**
- Server name where share exists
- Share name to remove

**What the Script Does:**
1. Connects to the target file server
2. Removes the specified SMB share
3. Forces removal without confirmation
4. Verifies share deletion

**Important Notes:**
- Use for decommissioning old shares
- Does NOT delete files or folders
- Only removes network access to the share
- Users will lose network access immediately
- Local files remain intact
- Typical use: reorganizing file shares, security cleanup
- Notify users before removing shares
- Verify share name before removal`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'FILESERVER01',
        helpText: 'Name of the file server'
      },
      {
        name: 'shareName',
        label: 'Share Name',
        type: 'text',
        required: true,
        placeholder: 'OldShare',
        helpText: 'Name of the share to remove'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const shareName = escapePowerShellString(params.shareName);

      return `# Remove SMB File Share
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Removing SMB share '${shareName}' from server: ${serverName}" -ForegroundColor Cyan
    Write-Host "⚠ WARNING: Network access to this share will be removed immediately" -ForegroundColor Yellow
    Write-Host "Note: Files and folders will NOT be deleted" -ForegroundColor Yellow
    
    # Verify share exists before removal
    $ShareExists = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Name)
        Get-SmbShare -Name $Name -ErrorAction SilentlyContinue
    } -ArgumentList "${shareName}"
    
    if (-not $ShareExists) {
        Write-Warning "Share '${shareName}' does not exist on ${serverName}"
        return
    }
    
    Write-Host "Share found: $($ShareExists.Path)" -ForegroundColor Gray
    
    # Remove the share
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Name)
        Remove-SmbShare -Name $Name -Force
    } -ArgumentList "${shareName}"
    
    Write-Host "✓ Share '${shareName}' removed successfully" -ForegroundColor Green
    Write-Host "Files remain at: $($ShareExists.Path)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to remove SMB share: $_"
}`;
    }
  },

  {
    id: 'ws-export-shares',
    title: 'Export All File Shares',
    description: 'Export inventory of all SMB file shares to CSV',
    category: 'File Sharing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports complete inventory of all SMB shares
- Shows share names, paths, and permissions
- Supports documentation and audit compliance

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- File Services feature installed

**What You Need to Provide:**
- Server name to query
- CSV export file path

**What the Script Does:**
1. Connects to the target file server
2. Queries all SMB shares
3. Collects share details and permissions
4. Exports complete inventory to CSV

**Important Notes:**
- Essential for share documentation and auditing
- Shows all network shares on the server
- Use for compliance reporting
- Run quarterly for share inventories
- Identify unused or misconfigured shares
- Typical use: audits, documentation, migration planning
- Review share permissions regularly
- Remove unused shares for security`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'FILESERVER01',
        helpText: 'Name of the file server'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\FileShares.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export All File Shares
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting file shares from: ${serverName}" -ForegroundColor Cyan
    
    $Shares = Get-SmbShare -CimSession "${serverName}" | Where-Object { $_.Special -eq $false }
    
    Write-Host "Found $($Shares.Count) user shares" -ForegroundColor Yellow
    
    $ShareReport = foreach ($Share in $Shares) {
        # Get share permissions
        $Permissions = Get-SmbShareAccess -Name $Share.Name -CimSession "${serverName}"
        $PermissionList = ($Permissions | ForEach-Object { "$($_.AccountName):$($_.AccessRight)" }) -join "; "
        
        [PSCustomObject]@{
            ShareName        = $Share.Name
            Path             = $Share.Path
            Description      = $Share.Description
            ShareState       = $Share.ShareState
            ScopeName        = $Share.ScopeName
            Permissions      = $PermissionList
        }
    }
    
    $ShareReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ File shares exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export file shares: $_"
}`;
    }
  },

  {
    id: 'ws-set-timezone',
    title: 'Set Server Time Zone',
    description: 'Configure the time zone settings for a Windows Server',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Changes the system time zone on Windows Server
- Updates system time zone without requiring restart
- Ensures consistent time settings across servers

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- No special features required

**What You Need to Provide:**
- Server name to configure
- Time zone ID (e.g., Pacific Standard Time)

**What the Script Does:**
1. Connects to the target server
2. Sets the system time zone
3. Verifies the new time zone setting
4. Confirms successful update

**Important Notes:**
- Essential for server time synchronization
- No restart required after change
- Important for log timestamps and scheduling
- Use standard Windows time zone IDs
- Coordinate with domain time settings
- Typical use: new server setup, datacenter migrations
- Match time zone to server physical location
- Ensure all servers in farm use same timezone`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to configure'
      },
      {
        name: 'timeZone',
        label: 'Time Zone',
        type: 'select',
        required: true,
        options: [
          { value: 'Pacific Standard Time', label: 'Pacific Time (US & Canada)' },
          { value: 'Mountain Standard Time', label: 'Mountain Time (US & Canada)' },
          { value: 'Central Standard Time', label: 'Central Time (US & Canada)' },
          { value: 'Eastern Standard Time', label: 'Eastern Time (US & Canada)' },
          { value: 'GMT Standard Time', label: 'GMT (London)' },
          { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
          { value: 'Tokyo Standard Time', label: 'Tokyo, Osaka, Sapporo' },
          { value: 'AUS Eastern Standard Time', label: 'Sydney, Melbourne' }
        ],
        defaultValue: 'Pacific Standard Time',
        helpText: 'Select the time zone to set'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const timeZone = params.timeZone;

      return `# Set Server Time Zone
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Setting time zone to '${timeZone}' on server: ${serverName}" -ForegroundColor Cyan
    
    # Get current timezone for comparison
    $CurrentTZ = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        (Get-TimeZone).Id
    }
    
    Write-Host "Current Time Zone: $CurrentTZ" -ForegroundColor Gray
    
    # Set new timezone
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($TZ)
        Set-TimeZone -Id $TZ
    } -ArgumentList "${timeZone}"
    
    # Verify the change
    $NewTZ = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        Get-TimeZone
    }
    
    Write-Host "✓ Time zone updated successfully" -ForegroundColor Green
    Write-Host "New Time Zone: $($NewTZ.DisplayName)" -ForegroundColor Gray
    Write-Host "Current Time: $($NewTZ.StandardName)" -ForegroundColor Gray
    Write-Host "No restart required" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to set time zone: $_"
}`;
    }
  },

  {
    id: 'ws-configure-firewall',
    title: 'Configure Firewall Rule',
    description: 'Create a new Windows Firewall rule to allow or block traffic',
    category: 'Security & Networking',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates custom Windows Firewall rules
- Controls inbound or outbound traffic
- Configures port-based or program-based rules

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Windows Firewall service running

**What You Need to Provide:**
- Server name to configure
- Rule name and description
- Port number and protocol (TCP/UDP)
- Rule direction (Inbound/Outbound)
- Action (Allow/Block)

**What the Script Does:**
1. Connects to the target server
2. Creates the firewall rule with specified parameters
3. Enables the rule immediately
4. Verifies rule creation

**Important Notes:**
- Essential for securing server communications
- Test rules before production deployment
- Use descriptive rule names
- Document firewall changes for compliance
- Consider security implications carefully
- Typical use: opening application ports, securing services
- Review firewall rules regularly
- Remove unused rules to reduce attack surface`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to configure'
      },
      {
        name: 'ruleName',
        label: 'Rule Name',
        type: 'text',
        required: true,
        placeholder: 'Allow SQL Server',
        helpText: 'Descriptive name for the firewall rule'
      },
      {
        name: 'port',
        label: 'Port Number',
        type: 'number',
        required: true,
        placeholder: '1433',
        helpText: 'Port number to allow or block'
      },
      {
        name: 'protocol',
        label: 'Protocol',
        type: 'select',
        required: true,
        options: [
          { value: 'TCP', label: 'TCP' },
          { value: 'UDP', label: 'UDP' }
        ],
        defaultValue: 'TCP',
        helpText: 'Select the protocol'
      },
      {
        name: 'direction',
        label: 'Direction',
        type: 'select',
        required: true,
        options: [
          { value: 'Inbound', label: 'Inbound' },
          { value: 'Outbound', label: 'Outbound' }
        ],
        defaultValue: 'Inbound',
        helpText: 'Traffic direction'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Allow', label: 'Allow' },
          { value: 'Block', label: 'Block' }
        ],
        defaultValue: 'Allow',
        helpText: 'Allow or block traffic'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const ruleName = escapePowerShellString(params.ruleName);
      const port = params.port;
      const protocol = params.protocol;
      const direction = params.direction;
      const action = params.action;

      return `# Configure Firewall Rule
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating firewall rule '${ruleName}' on server: ${serverName}" -ForegroundColor Cyan
    Write-Host "⚠ WARNING: Firewall changes can affect network connectivity" -ForegroundColor Yellow
    
    $RuleParams = @{
        DisplayName       = "${ruleName}"
        Direction         = "${direction}"
        LocalPort         = ${port}
        Protocol          = "${protocol}"
        Action            = "${action}"
        Enabled           = "True"
        Profile           = "Any"
    }
    
    Write-Host "Port: ${port}/${protocol}" -ForegroundColor Gray
    Write-Host "Direction: ${direction}" -ForegroundColor Gray
    Write-Host "Action: ${action}" -ForegroundColor Gray
    
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Params)
        New-NetFirewallRule @Params
    } -ArgumentList $RuleParams
    
    Write-Host "✓ Firewall rule created successfully" -ForegroundColor Green
    
    # Verify rule creation
    $Rule = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Name)
        Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    } -ArgumentList "${ruleName}"
    
    if ($Rule) {
        Write-Host "✓ Rule verification successful" -ForegroundColor Green
        Write-Host "Rule is enabled and active" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to create firewall rule: $_"
}`;
    }
  },

  {
    id: 'ws-export-firewall',
    title: 'Export Firewall Rules',
    description: 'Export all Windows Firewall rules to CSV for documentation',
    category: 'Security & Networking',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports complete inventory of firewall rules
- Shows rule names, directions, actions, and status
- Supports compliance auditing and documentation

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Windows Firewall service running

**What You Need to Provide:**
- Server name to query
- CSV export file path

**What the Script Does:**
1. Connects to the target server
2. Queries all firewall rules
3. Collects rule details and settings
4. Exports complete inventory to CSV

**Important Notes:**
- Essential for security audits and compliance
- Shows all configured firewall rules
- Use for documentation and change tracking
- Run before and after firewall changes
- Identify obsolete or conflicting rules
- Typical use: security audits, compliance reporting
- Review rules quarterly for accuracy
- Remove unused rules to improve security`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to query'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\FirewallRules.csv',
        helpText: 'Path where the CSV file will be saved'
      },
      {
        name: 'enabledOnly',
        label: 'Export Enabled Rules Only',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Export only enabled firewall rules'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const exportPath = escapePowerShellString(params.exportPath);
      const enabledOnly = params.enabledOnly === true;

      return `# Export Firewall Rules
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting firewall rules from: ${serverName}" -ForegroundColor Cyan
    
    $Rules = Get-NetFirewallRule -CimSession "${serverName}"
    
    ${enabledOnly ? `$Rules = $Rules | Where-Object { $_.Enabled -eq 'True' }
    Write-Host "Found $($Rules.Count) enabled firewall rules" -ForegroundColor Yellow` : `Write-Host "Found $($Rules.Count) total firewall rules" -ForegroundColor Yellow`}
    
    $RuleReport = foreach ($Rule in $Rules) {
        # Get port filter if exists
        $PortFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $Rule -CimSession "${serverName}" -ErrorAction SilentlyContinue
        
        [PSCustomObject]@{
            DisplayName      = $Rule.DisplayName
            Name             = $Rule.Name
            Enabled          = $Rule.Enabled
            Direction        = $Rule.Direction
            Action           = $Rule.Action
            Profile          = $Rule.Profile
            LocalPort        = $PortFilter.LocalPort
            Protocol         = $PortFilter.Protocol
            Description      = $Rule.Description
        }
    }
    
    $RuleReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Firewall rules exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export firewall rules: $_"
}`;
    }
  },

  {
    id: 'ws-defrag-disk',
    title: 'Defragment Disk Volume',
    description: 'Optimize and defragment a disk volume for better performance',
    category: 'Disk Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Defragments and optimizes disk volumes
- Improves disk read/write performance
- Supports traditional HDDs (not needed for SSDs)

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Volume must not be in use for critical operations

**What You Need to Provide:**
- Server name to optimize
- Drive letter to defragment

**What the Script Does:**
1. Connects to the target server
2. Initiates disk defragmentation
3. Optimizes file placement on disk
4. Reports completion status

**Important Notes:**
- Essential for maintaining HDD performance
- NOT recommended for SSD drives
- Can take hours for large or fragmented drives
- Server remains accessible during operation
- Schedule during maintenance windows
- Typical use: monthly HDD maintenance
- Monitor progress in Task Manager if needed
- Consider SSD optimization (TRIM) instead for SSDs`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'driveLetter',
        label: 'Drive Letter',
        type: 'text',
        required: true,
        placeholder: 'C',
        helpText: 'Drive letter to defragment (without colon)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const driveLetter = escapePowerShellString(params.driveLetter).replace(':', '');

      return `# Defragment Disk Volume
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Starting disk defragmentation on ${driveLetter}: (Server: ${serverName})" -ForegroundColor Cyan
    Write-Host "⚠ Note: This operation may take a long time for large or fragmented drives" -ForegroundColor Yellow
    Write-Host "⚠ Not recommended for SSD drives" -ForegroundColor Yellow
    
    # Get volume info before defrag
    $VolumeBefore = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Get-Volume -DriveLetter $Drive
    } -ArgumentList "${driveLetter}"
    
    Write-Host "Drive: $($VolumeBefore.DriveLetter):" -ForegroundColor Gray
    Write-Host "File System: $($VolumeBefore.FileSystem)" -ForegroundColor Gray
    Write-Host "Size: $([math]::Round($VolumeBefore.Size / 1GB, 2)) GB" -ForegroundColor Gray
    
    # Start defragmentation
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Optimize-Volume -DriveLetter $Drive -Defrag -Verbose
    } -ArgumentList "${driveLetter}"
    
    Write-Host "✓ Disk defragmentation completed for ${driveLetter}:" -ForegroundColor Green
    Write-Host "Drive optimization finished" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to defragment disk: $_"
}`;
    }
  },

  {
    id: 'ws-check-disk',
    title: 'Run Disk Check (CHKDSK)',
    description: 'Scan disk volume for errors and bad sectors',
    category: 'Disk Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans disk volumes for file system errors
- Detects bad sectors and corruption
- Reports disk health status

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Volume should not be in active use

**What You Need to Provide:**
- Server name to check
- Drive letter to scan

**What the Script Does:**
1. Connects to the target server
2. Initiates disk error scanning
3. Checks for file system corruption
4. Reports findings and health status

**Important Notes:**
- Essential for maintaining disk integrity
- Run after unexpected shutdowns or power loss
- Scan detects but does not repair errors
- Full repair requires volume to be offline
- Schedule during maintenance windows for repairs
- Typical use: troubleshooting disk issues, preventive maintenance
- Monitor disk health with SMART tools
- Replace drives showing errors`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'driveLetter',
        label: 'Drive Letter',
        type: 'text',
        required: true,
        placeholder: 'C',
        helpText: 'Drive letter to check (without colon)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const driveLetter = escapePowerShellString(params.driveLetter).replace(':', '');

      return `# Run Disk Check (CHKDSK)
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Running disk check on ${driveLetter}: (Server: ${serverName})" -ForegroundColor Cyan
    Write-Host "⚠ Scanning for errors - this may take several minutes" -ForegroundColor Yellow
    
    # Get volume info
    $Volume = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Get-Volume -DriveLetter $Drive
    } -ArgumentList "${driveLetter}"
    
    Write-Host "Drive: $($Volume.DriveLetter):" -ForegroundColor Gray
    Write-Host "File System: $($Volume.FileSystem)" -ForegroundColor Gray
    Write-Host "Health Status: $($Volume.HealthStatus)" -ForegroundColor Gray
    
    # Run disk scan
    Write-Host "Starting disk scan..." -ForegroundColor Cyan
    
    $ScanResult = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Repair-Volume -DriveLetter $Drive -Scan
    } -ArgumentList "${driveLetter}"
    
    # Get updated health status
    $VolumeAfter = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Get-Volume -DriveLetter $Drive
    } -ArgumentList "${driveLetter}"
    
    Write-Host "✓ Disk check completed for ${driveLetter}:" -ForegroundColor Green
    Write-Host "Health Status: $($VolumeAfter.HealthStatus)" -ForegroundColor $(if ($VolumeAfter.HealthStatus -eq 'Healthy') { 'Green' } else { 'Yellow' })
    
    if ($VolumeAfter.HealthStatus -ne 'Healthy') {
        Write-Host "⚠ Disk errors detected - consider running offline repair" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to run disk check: $_"
}`;
    }
  },

  {
    id: 'ws-extend-volume',
    title: 'Extend Disk Volume',
    description: 'Expand a disk partition to use available free space',
    category: 'Disk Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Extends disk partitions to use unallocated space
- Increases volume capacity without data loss
- Requires contiguous free space after partition

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Unallocated space must exist after the partition
- Volume must use NTFS file system
- Cannot extend system/boot volumes while online

**What You Need to Provide:**
- Server name to configure
- Drive letter to extend
- Size to add (in GB) or maximum available

**What the Script Does:**
1. Connects to the target server
2. Checks available unallocated space
3. Extends partition to maximum size
4. Verifies new volume size

**Important Notes:**
- Essential for managing storage growth
- Backup data before extending volumes
- Free space must be contiguous (next to partition)
- Operation cannot be undone easily
- System volumes may require offline mode
- Typical use: increasing data volume capacity
- Monitor disk space proactively
- Plan storage expansion in advance`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server'
      },
      {
        name: 'driveLetter',
        label: 'Drive Letter',
        type: 'text',
        required: true,
        placeholder: 'D',
        helpText: 'Drive letter to extend (without colon)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const driveLetter = escapePowerShellString(params.driveLetter).replace(':', '');

      return `# Extend Disk Volume
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Extending volume ${driveLetter}: on server: ${serverName}" -ForegroundColor Cyan
    Write-Host "⚠ WARNING: Backup data before extending volumes" -ForegroundColor Yellow
    
    # Get current volume size
    $VolumeBefore = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Get-Volume -DriveLetter $Drive
    } -ArgumentList "${driveLetter}"
    
    $SizeBefore = [math]::Round($VolumeBefore.Size / 1GB, 2)
    Write-Host "Current Size: $SizeBefore GB" -ForegroundColor Gray
    
    # Get maximum supported size
    $MaxSize = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        (Get-PartitionSupportedSize -DriveLetter $Drive).SizeMax
    } -ArgumentList "${driveLetter}"
    
    $MaxSizeGB = [math]::Round($MaxSize / 1GB, 2)
    $AvailableGB = [math]::Round(($MaxSize - $VolumeBefore.Size) / 1GB, 2)
    
    Write-Host "Maximum Possible Size: $MaxSizeGB GB" -ForegroundColor Gray
    Write-Host "Available to Extend: $AvailableGB GB" -ForegroundColor Yellow
    
    if ($AvailableGB -le 0) {
        Write-Host "⚠ No additional space available to extend this volume" -ForegroundColor Yellow
        return
    }
    
    # Extend to maximum size
    Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive, $Size)
        Resize-Partition -DriveLetter $Drive -Size $Size
    } -ArgumentList "${driveLetter}", $MaxSize
    
    # Verify new size
    $VolumeAfter = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        param($Drive)
        Get-Volume -DriveLetter $Drive
    } -ArgumentList "${driveLetter}"
    
    $SizeAfter = [math]::Round($VolumeAfter.Size / 1GB, 2)
    
    Write-Host "✓ Volume extended successfully" -ForegroundColor Green
    Write-Host "Previous Size: $SizeBefore GB" -ForegroundColor Gray
    Write-Host "New Size: $SizeAfter GB" -ForegroundColor Green
    Write-Host "Added: $([math]::Round($SizeAfter - $SizeBefore, 2)) GB" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to extend volume: $_"
}`;
    }
  },

  {
    id: 'ws-join-domain',
    title: 'Join Server to Domain',
    description: 'Join a Windows Server to an Active Directory domain',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Joins a standalone server to an Active Directory domain
- Creates computer account in Active Directory
- Requires domain admin credentials and server restart

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Domain admin credentials
- DNS configured to resolve domain
- Network connectivity to domain controller
- Server must be on domain network

**What You Need to Provide:**
- Server name to join to domain
- Fully qualified domain name (FQDN)
- Domain admin credentials (will be prompted)

**What the Script Does:**
1. Prompts for domain admin credentials
2. Connects to the target server
3. Joins server to specified domain
4. Initiates automatic restart
5. Server will reboot to complete domain join

**Important Notes:**
- ⚠ CRITICAL: Server will restart automatically
- Requires domain administrator credentials
- DNS must be configured correctly first
- Server will be unavailable during restart
- Plan downtime for domain join operation
- Typical use: new server deployment, domain migration
- Notify users before joining servers
- Verify DNS settings before attempting`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to join to domain'
      },
      {
        name: 'domainName',
        label: 'Domain Name (FQDN)',
        type: 'text',
        required: true,
        placeholder: 'contoso.com',
        helpText: 'Fully qualified domain name'
      },
      {
        name: 'ouPath',
        label: 'OU Path (optional)',
        type: 'text',
        required: false,
        placeholder: 'OU=Servers,DC=contoso,DC=com',
        helpText: 'Organizational Unit path (leave empty for default)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const domainName = escapePowerShellString(params.domainName);
      const ouPath = params.ouPath ? escapePowerShellString(params.ouPath) : '';

      return `# Join Server to Domain
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Preparing to join ${serverName} to domain: ${domainName}" -ForegroundColor Cyan
    Write-Host "⚠ CRITICAL WARNING: Server will restart automatically after domain join" -ForegroundColor Yellow
    Write-Host "⚠ Ensure all users are logged off and applications are closed" -ForegroundColor Yellow
    
    # Prompt for domain admin credentials
    Write-Host "" 
    Write-Host "Please provide Domain Administrator credentials" -ForegroundColor Yellow
    $DomainCred = Get-Credential -Message "Enter Domain Admin credentials for ${domainName}"
    
    if (-not $DomainCred) {
        Write-Error "Domain credentials are required to join the domain"
        return
    }
    
    Write-Host "Joining server to domain..." -ForegroundColor Cyan
    
    $JoinParams = @{
        ComputerName  = "${serverName}"
        DomainName    = "${domainName}"
        Credential    = $DomainCred
        Restart       = $true
        Force         = $true
    }
    
    ${ouPath ? `$JoinParams['OUPath'] = "${ouPath}"
    Write-Host "Target OU: ${ouPath}" -ForegroundColor Gray` : ''}
    
    Add-Computer @JoinParams
    
    Write-Host "✓ Domain join initiated successfully" -ForegroundColor Green
    Write-Host "Server is restarting to complete domain join..." -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "After restart, log in with domain credentials: ${domainName}\\Administrator" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to join domain: $_"
    Write-Host "" 
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- DNS not configured to resolve domain" -ForegroundColor Yellow
    Write-Host "- Domain controller not reachable" -ForegroundColor Yellow
    Write-Host "- Insufficient domain admin privileges" -ForegroundColor Yellow
    Write-Host "- Server already has a computer account in AD" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'ws-leave-domain',
    title: 'Remove Server from Domain',
    description: 'Remove a Windows Server from Active Directory domain and join workgroup',
    category: 'Server Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes server from Active Directory domain
- Joins server to a workgroup (standalone mode)
- Requires local admin and domain credentials

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials for target server
- Domain admin credentials
- Access to domain controller

**What You Need to Provide:**
- Server name to remove from domain
- Domain admin credentials (will be prompted)
- Workgroup name (default: WORKGROUP)

**What the Script Does:**
1. Prompts for domain admin credentials
2. Connects to the target server
3. Removes server from domain
4. Joins specified workgroup
5. Initiates automatic restart

**Important Notes:**
- ⚠ CRITICAL: Server will restart automatically
- Server loses access to domain resources
- Local admin account required after restart
- Computer account remains in AD (manual cleanup needed)
- All domain user profiles remain on disk
- Typical use: server decommissioning, troubleshooting
- Document local admin password before proceeding
- Plan for downtime during restart`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to remove from domain'
      },
      {
        name: 'workgroupName',
        label: 'Workgroup Name',
        type: 'text',
        required: false,
        defaultValue: 'WORKGROUP',
        placeholder: 'WORKGROUP',
        helpText: 'Name of workgroup to join (default: WORKGROUP)'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const workgroupName = params.workgroupName || 'WORKGROUP';

      return `# Remove Server from Domain
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Preparing to remove ${serverName} from domain" -ForegroundColor Cyan
    Write-Host "⚠ CRITICAL WARNING: Server will restart automatically" -ForegroundColor Yellow
    Write-Host "⚠ Server will lose access to all domain resources" -ForegroundColor Yellow
    Write-Host "⚠ Ensure you have local administrator credentials" -ForegroundColor Yellow
    
    # Get current domain
    $CurrentDomain = Invoke-Command -ComputerName "${serverName}" -ScriptBlock {
        (Get-WmiObject Win32_ComputerSystem).Domain
    }
    
    Write-Host "Current Domain: $CurrentDomain" -ForegroundColor Gray
    Write-Host "Target Workgroup: ${workgroupName}" -ForegroundColor Gray
    
    # Prompt for domain admin credentials
    Write-Host "" 
    Write-Host "Please provide Domain Administrator credentials to unjoin" -ForegroundColor Yellow
    $DomainCred = Get-Credential -Message "Enter Domain Admin credentials for $CurrentDomain"
    
    if (-not $DomainCred) {
        Write-Error "Domain credentials are required to unjoin from domain"
        return
    }
    
    Write-Host "Removing server from domain..." -ForegroundColor Cyan
    
    $UnjoinParams = @{
        ComputerName             = "${serverName}"
        UnjoinDomainCredential   = $DomainCred
        WorkgroupName            = "${workgroupName}"
        Restart                  = $true
        Force                    = $true
    }
    
    Remove-Computer @UnjoinParams
    
    Write-Host "✓ Domain removal initiated successfully" -ForegroundColor Green
    Write-Host "Server is restarting to complete workgroup join..." -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "After restart, log in with: .\\Administrator (local account)" -ForegroundColor Cyan
    Write-Host "Note: Computer account remains in AD - delete manually if needed" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to leave domain: $_"
    Write-Host "" 
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Domain controller not reachable" -ForegroundColor Yellow
    Write-Host "- Insufficient domain admin privileges" -ForegroundColor Yellow
    Write-Host "- Server already in workgroup" -ForegroundColor Yellow
}`;
    }
  },

  // ==================== PREMIUM TASKS ====================
  {
    id: 'ws-config-server-backup',
    title: 'Configure Windows Server Backup',
    description: 'Set up automated backups, schedules',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Windows Server Backup for automated system and data protection
- Supports full server, system state, and selective file backups
- Enables disaster recovery and business continuity

**Prerequisites:**
- Windows Server Backup feature installed
- Administrator credentials
- Backup destination available (local disk, network share, or removable media)
- Sufficient storage space for backups

**What You Need to Provide:**
- Backup type (Full Server, System State, or Custom)
- Backup destination path
- Schedule (Daily, Weekly, or Once)
- Backup time

**What the Script Does:**
1. Installs Windows Server Backup feature if needed
2. Configures backup policy with specified parameters
3. Sets backup schedule and retention
4. Validates backup destination accessibility
5. Reports configuration success

**Important Notes:**
- Essential for disaster recovery
- Full server backup includes all volumes and system state
- System state includes AD, registry, boot files
- Network share requires credentials
- Schedule daily backups during off-hours
- Monitor backup job status regularly
- Test restore process periodically
- Typical use: nightly automated backups`,
    parameters: [
      {
        name: 'backupType',
        label: 'Backup Type',
        type: 'select',
        required: true,
        options: [
          { value: 'FullServer', label: 'Full Server (All volumes)' },
          { value: 'SystemState', label: 'System State Only' },
          { value: 'Custom', label: 'Custom (Specific volumes)' }
        ],
        helpText: 'Type of backup to perform'
      },
      {
        name: 'backupPath',
        label: 'Backup Destination Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Backups or \\\\SERVER\\Backups',
        helpText: 'Local path or network share'
      },
      {
        name: 'schedule',
        label: 'Backup Schedule',
        type: 'select',
        required: true,
        options: [
          { value: 'Daily', label: 'Daily' },
          { value: 'Weekly', label: 'Weekly' },
          { value: 'Once', label: 'Once (Manual)' }
        ],
        helpText: 'Backup frequency'
      },
      {
        name: 'backupTime',
        label: 'Backup Time',
        type: 'text',
        required: true,
        placeholder: '23:00',
        defaultValue: '23:00',
        helpText: 'Time to run backup (HH:MM format)'
      }
    ],
    scriptTemplate: (params) => {
      const backupType = params.backupType;
      const backupPath = escapePowerShellString(params.backupPath);
      const schedule = params.schedule;
      const backupTime = escapePowerShellString(params.backupTime);

      return `# Configure Windows Server Backup
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring Windows Server Backup..." -ForegroundColor Cyan
    
    # Install Windows Server Backup feature if needed
    $Feature = Get-WindowsFeature -Name Windows-Server-Backup
    if (-not $Feature.Installed) {
        Write-Host "Installing Windows Server Backup feature..." -ForegroundColor Cyan
        Install-WindowsFeature -Name Windows-Server-Backup -IncludeManagementTools
        Write-Host "✓ Windows Server Backup installed" -ForegroundColor Green
    }
    
    # Validate backup destination
    if (-not (Test-Path "${backupPath}")) {
        New-Item -Path "${backupPath}" -ItemType Directory -Force | Out-Null
        Write-Host "✓ Backup destination created" -ForegroundColor Green
    }
    
    # Create backup policy
    $Policy = New-WBPolicy
    
    # Configure backup items based on type
    switch ("${backupType}") {
        "FullServer" {
            Write-Host "Configuring full server backup..." -ForegroundColor Cyan
            $Volumes = Get-WBVolume -AllVolumes
            Add-WBVolume -Policy $Policy -Volume $Volumes
            Add-WBSystemState -Policy $Policy
        }
        "SystemState" {
            Write-Host "Configuring system state backup..." -ForegroundColor Cyan
            Add-WBSystemState -Policy $Policy
        }
        "Custom" {
            Write-Host "Configuring custom backup..." -ForegroundColor Cyan
            Write-Host "⚠ Modify script to specify custom volumes" -ForegroundColor Yellow
        }
    }
    
    # Configure backup destination
    $BackupLocation = New-WBBackupTarget -Path "${backupPath}"
    Add-WBBackupTarget -Policy $Policy -Target $BackupLocation
    
    # Configure schedule
    switch ("${schedule}") {
        "Daily" {
            $Time = [DateTime]"${backupTime}"
            Set-WBSchedule -Policy $Policy -Schedule $Time
            Write-Host "✓ Daily backup scheduled for ${backupTime}" -ForegroundColor Green
        }
        "Weekly" {
            Write-Host "⚠ Configure weekly schedule manually" -ForegroundColor Yellow
        }
        "Once" {
            Write-Host "Backup set for manual execution only" -ForegroundColor Yellow
        }
    }
    
    # Apply the policy
    Set-WBPolicy -Policy $Policy
    
    Write-Host "✓ Windows Server Backup configured successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backup Configuration:" -ForegroundColor Cyan
    Write-Host "  Type: ${backupType}" -ForegroundColor Gray
    Write-Host "  Destination: ${backupPath}" -ForegroundColor Gray
    Write-Host "  Schedule: ${schedule} at ${backupTime}" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure Windows Server Backup: $_"
}`;
    }
  },

  {
    id: 'ws-manage-firewall-advanced',
    title: 'Manage Windows Firewall Rules (Advanced)',
    description: 'Create inbound/outbound rules, port exceptions',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates advanced Windows Firewall rules for network security
- Supports inbound/outbound traffic control with port and program exceptions
- Enables granular network access control

**Prerequisites:**
- Administrator credentials on target server
- Windows Firewall enabled
- Understanding of required network ports

**What You Need to Provide:**
- Rule name
- Rule direction (Inbound or Outbound)
- Port number or program path
- Action (Allow or Block)
- Protocol (TCP or UDP)

**What the Script Does:**
1. Creates firewall rule with specified parameters
2. Configures port or program exception
3. Sets rule direction and action
4. Enables rule immediately
5. Reports rule creation success

**Important Notes:**
- Essential for network security
- Inbound rules control incoming traffic
- Outbound rules control outgoing traffic
- Use specific ports instead of allowing all traffic
- Document firewall rules for audit purposes
- Test connectivity after creating rules
- Typical use: opening application ports, blocking services
- Review firewall logs for unauthorized access attempts`,
    parameters: [
      {
        name: 'ruleName',
        label: 'Rule Name',
        type: 'text',
        required: true,
        placeholder: 'Allow SQL Server',
        helpText: 'Descriptive rule name'
      },
      {
        name: 'direction',
        label: 'Rule Direction',
        type: 'select',
        required: true,
        options: [
          { value: 'Inbound', label: 'Inbound (Incoming traffic)' },
          { value: 'Outbound', label: 'Outbound (Outgoing traffic)' }
        ],
        helpText: 'Traffic direction'
      },
      {
        name: 'protocol',
        label: 'Protocol',
        type: 'select',
        required: true,
        options: [
          { value: 'TCP', label: 'TCP' },
          { value: 'UDP', label: 'UDP' },
          { value: 'Any', label: 'Any' }
        ],
        helpText: 'Network protocol'
      },
      {
        name: 'localPort',
        label: 'Local Port',
        type: 'text',
        required: false,
        placeholder: '1433',
        helpText: 'Port number or range (e.g., 1433, 80-443)'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Allow', label: 'Allow' },
          { value: 'Block', label: 'Block' }
        ],
        helpText: 'Allow or block traffic'
      }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const direction = params.direction;
      const protocol = params.protocol;
      const localPort = params.localPort ? escapePowerShellString(params.localPort) : '';
      const action = params.action;

      return `# Manage Windows Firewall Rules (Advanced)
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating Windows Firewall rule..." -ForegroundColor Cyan
    Write-Host "  Rule Name: ${ruleName}" -ForegroundColor Gray
    Write-Host "  Direction: ${direction}" -ForegroundColor Gray
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Gray
    ${localPort ? `Write-Host "  Local Port: ${localPort}" -ForegroundColor Gray` : ''}
    Write-Host "  Action: ${action}" -ForegroundColor Gray
    
    # Build firewall rule parameters
    $RuleParams = @{
        DisplayName = "${ruleName}"
        Direction   = "${direction}"
        Protocol    = "${protocol}"
        Action      = "${action}"
        Enabled     = "True"
    }
    
    ${localPort ? `
    # Add port specification
    $RuleParams.LocalPort = "${localPort}"
    ` : ''}
    
    # Create firewall rule
    New-NetFirewallRule @RuleParams
    
    Write-Host "✓ Firewall rule created successfully" -ForegroundColor Green
    
    # Display the new rule
    Write-Host ""
    Write-Host "Rule Details:" -ForegroundColor Cyan
    Get-NetFirewallRule -DisplayName "${ruleName}" | Select-Object DisplayName, Enabled, Direction, Action | Format-List
    
} catch {
    Write-Error "Failed to create firewall rule: $_"
}`;
    }
  },

  {
    id: 'ws-config-nic-teaming',
    title: 'Configure NIC Teaming',
    description: 'Create NIC teams for redundancy, load balancing',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures NIC teaming for network redundancy and load balancing
- Combines multiple network adapters into a single logical interface
- Provides high availability and increased bandwidth

**Prerequisites:**
- Windows Server 2012 or later
- Multiple network adapters installed
- Administrator credentials
- Network adapters not currently in use

**What You Need to Provide:**
- Team name
- Network adapter names to combine
- Teaming mode (Switch Independent or LACP)
- Load balancing algorithm

**What the Script Does:**
1. Validates network adapters exist
2. Creates NIC team with specified adapters
3. Configures teaming mode and load balancing
4. Verifies team creation
5. Reports team status

**Important Notes:**
- Essential for network high availability
- Switch Independent works with any switch
- LACP requires switch configuration
- Team survives adapter failure
- Provides load balancing across adapters
- Use minimum of 2 adapters
- Test failover after configuration
- Typical use: production servers, Hyper-V hosts`,
    parameters: [
      {
        name: 'teamName',
        label: 'Team Name',
        type: 'text',
        required: true,
        placeholder: 'Team1',
        helpText: 'Name for the NIC team'
      },
      {
        name: 'adapterNames',
        label: 'Network Adapter Names (comma-separated)',
        type: 'text',
        required: true,
        placeholder: 'Ethernet, Ethernet 2',
        helpText: 'Adapters to combine into team'
      },
      {
        name: 'teamingMode',
        label: 'Teaming Mode',
        type: 'select',
        required: true,
        options: [
          { value: 'SwitchIndependent', label: 'Switch Independent (No switch config needed)' },
          { value: 'LACP', label: 'LACP (Requires switch configuration)' }
        ],
        defaultValue: 'SwitchIndependent',
        helpText: 'NIC teaming mode'
      },
      {
        name: 'loadBalancing',
        label: 'Load Balancing Algorithm',
        type: 'select',
        required: true,
        options: [
          { value: 'TransportPorts', label: 'Transport Ports (Recommended)' },
          { value: 'IPAddresses', label: 'IP Addresses' },
          { value: 'HyperVPort', label: 'Hyper-V Port' }
        ],
        defaultValue: 'TransportPorts',
        helpText: 'Load distribution method'
      }
    ],
    scriptTemplate: (params) => {
      const teamName = escapePowerShellString(params.teamName);
      const adapterNamesInput = params.adapterNames;
      const teamingMode = params.teamingMode || 'SwitchIndependent';
      const loadBalancing = params.loadBalancing || 'TransportPorts';

      // Parse adapter names
      const adapters = adapterNamesInput.split(',').map((name: string) => `"${escapePowerShellString(name.trim())}"`).join(', ');

      return `# Configure NIC Teaming
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring NIC teaming..." -ForegroundColor Cyan
    Write-Host "  Team Name: ${teamName}" -ForegroundColor Gray
    Write-Host "  Teaming Mode: ${teamingMode}" -ForegroundColor Gray
    Write-Host "  Load Balancing: ${loadBalancing}" -ForegroundColor Gray
    
    # Define network adapters
    $Adapters = @(${adapters})
    
    # Validate adapters exist
    foreach ($Adapter in $Adapters) {
        if (-not (Get-NetAdapter -Name $Adapter -ErrorAction SilentlyContinue)) {
            throw "Network adapter not found: $Adapter"
        }
    }
    
    Write-Host "✓ All network adapters validated" -ForegroundColor Green
    
    # Create NIC team
    New-NetLbfoTeam -Name "${teamName}" -TeamMembers $Adapters -TeamingMode ${teamingMode} -LoadBalancingAlgorithm ${loadBalancing}
    
    Write-Host "✓ NIC team created successfully" -ForegroundColor Green
    
    # Display team status
    Write-Host ""
    Write-Host "NIC Team Status:" -ForegroundColor Cyan
    Get-NetLbfoTeam -Name "${teamName}" | Select-Object Name, Status, TeamingMode, LoadBalancingAlgorithm, Members | Format-List
    
    Write-Host ""
    Write-Host "Team Members:" -ForegroundColor Cyan
    Get-NetLbfoTeamMember -Team "${teamName}" | Select-Object Name, Team, AdministrativeMode, OperationalMode | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to configure NIC teaming: $_"
}`;
    }
  },

  {
    id: 'ws-manage-storage-spaces',
    title: 'Manage Storage Spaces',
    description: 'Create storage pools, virtual disks',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates Storage Spaces for flexible and resilient storage
- Combines multiple physical disks into storage pools
- Provides software-defined storage with redundancy options

**Prerequisites:**
- Windows Server 2012 or later
- Multiple physical disks available
- Administrator credentials
- Disks not currently in use

**What You Need to Provide:**
- Storage pool name
- Physical disk numbers to include
- Virtual disk name
- Resiliency type (Simple, Mirror, or Parity)
- Virtual disk size

**What the Script Does:**
1. Identifies available physical disks
2. Creates storage pool from specified disks
3. Creates virtual disk with resiliency
4. Initializes and formats virtual disk
5. Reports storage configuration

**Important Notes:**
- Essential for flexible storage management
- Mirror provides redundancy (requires 2+ disks)
- Parity provides efficiency (requires 3+ disks)
- Simple provides no redundancy (maximum capacity)
- Storage Spaces allows easy capacity expansion
- Use SSD for caching tier
- Typical use: file servers, Hyper-V storage
- Monitor pool health regularly`,
    parameters: [
      {
        name: 'poolName',
        label: 'Storage Pool Name',
        type: 'text',
        required: true,
        placeholder: 'StoragePool1',
        helpText: 'Name for the storage pool'
      },
      {
        name: 'virtualDiskName',
        label: 'Virtual Disk Name',
        type: 'text',
        required: true,
        placeholder: 'DataDisk1',
        helpText: 'Name for the virtual disk'
      },
      {
        name: 'resiliencyType',
        label: 'Resiliency Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Simple', label: 'Simple (No redundancy, max capacity)' },
          { value: 'Mirror', label: 'Mirror (Redundancy, requires 2+ disks)' },
          { value: 'Parity', label: 'Parity (Space efficient, requires 3+ disks)' }
        ],
        defaultValue: 'Mirror',
        helpText: 'Storage redundancy level'
      },
      {
        name: 'sizeGB',
        label: 'Virtual Disk Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 500,
        placeholder: '500',
        helpText: 'Size of virtual disk'
      }
    ],
    scriptTemplate: (params) => {
      const poolName = escapePowerShellString(params.poolName);
      const vdiskName = escapePowerShellString(params.virtualDiskName);
      const resiliency = params.resiliencyType || 'Mirror';
      const sizeGB = params.sizeGB || 500;

      return `# Manage Storage Spaces
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating Storage Spaces configuration..." -ForegroundColor Cyan
    Write-Host "  Pool Name: ${poolName}" -ForegroundColor Gray
    Write-Host "  Virtual Disk: ${vdiskName}" -ForegroundColor Gray
    Write-Host "  Resiliency: ${resiliency}" -ForegroundColor Gray
    Write-Host "  Size: ${sizeGB} GB" -ForegroundColor Gray
    
    # Get available physical disks (not in use)
    $PhysicalDisks = Get-PhysicalDisk -CanPool $true
    
    if ($PhysicalDisks.Count -lt 2 -and "${resiliency}" -ne "Simple") {
        Write-Error "At least 2 disks required for ${resiliency} resiliency"
        exit 1
    }
    
    Write-Host "Found $($PhysicalDisks.Count) available disks" -ForegroundColor Yellow
    $PhysicalDisks | Select-Object FriendlyName, Size | Format-Table
    
    # Create storage pool
    Write-Host "Creating storage pool..." -ForegroundColor Cyan
    $Pool = New-StoragePool -FriendlyName "${poolName}" -PhysicalDisks $PhysicalDisks -StorageSubSystemFriendlyName "Windows Storage*"
    Write-Host "✓ Storage pool created" -ForegroundColor Green
    
    # Create virtual disk
    Write-Host "Creating virtual disk..." -ForegroundColor Cyan
    $VDisk = New-VirtualDisk -FriendlyName "${vdiskName}" -StoragePoolFriendlyName "${poolName}" -ResiliencySettingName ${resiliency} -Size ${sizeGB}GB
    Write-Host "✓ Virtual disk created" -ForegroundColor Green
    
    # Initialize and format disk
    Write-Host "Initializing and formatting disk..." -ForegroundColor Cyan
    $Disk = Get-Disk | Where-Object { $_.FriendlyName -eq "${vdiskName}" }
    Initialize-Disk -Number $Disk.Number -PartitionStyle GPT
    $Partition = New-Partition -DiskNumber $Disk.Number -UseMaximumSize -AssignDriveLetter
    Format-Volume -DriveLetter $Partition.DriveLetter -FileSystem NTFS -NewFileSystemLabel "${vdiskName}" -Confirm:$false
    
    Write-Host "✓ Disk initialized and formatted" -ForegroundColor Green
    Write-Host ""
    Write-Host "Storage Configuration Complete:" -ForegroundColor Cyan
    Write-Host "  Drive Letter: $($Partition.DriveLetter):" -ForegroundColor Gray
    Write-Host "  Resiliency: ${resiliency}" -ForegroundColor Gray
    Write-Host "  Capacity: ${sizeGB} GB" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to manage Storage Spaces: $_"
}`;
    }
  },

  {
    id: 'ws-config-branchcache',
    title: 'Configure BranchCache',
    description: 'Enable BranchCache for distributed offices',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures BranchCache for WAN bandwidth optimization
- Caches content from central servers at branch offices
- Reduces WAN traffic and improves user experience

**Prerequisites:**
- Windows Server 2012 or later (client and server)
- BranchCache feature installed
- Administrator credentials
- Firewall configured for BranchCache traffic

**What You Need to Provide:**
- BranchCache mode (Hosted Cache or Distributed Cache)
- For Hosted Cache: cache server name
- Cache size in MB

**What the Script Does:**
1. Installs BranchCache feature if needed
2. Configures BranchCache mode
3. Sets cache size and location
4. Configures firewall rules
5. Reports configuration success

**Important Notes:**
- Essential for branch office performance
- Hosted Cache requires dedicated cache server
- Distributed Cache uses peer-to-peer caching
- Reduces WAN bandwidth usage significantly
- Improves file server access speed
- Configure on both clients and servers
- Typical use: multi-site organizations
- Monitor cache hit ratios`,
    parameters: [
      {
        name: 'mode',
        label: 'BranchCache Mode',
        type: 'select',
        required: true,
        options: [
          { value: 'DistributedCache', label: 'Distributed Cache (Peer-to-peer)' },
          { value: 'HostedCache', label: 'Hosted Cache (Dedicated server)' }
        ],
        defaultValue: 'DistributedCache',
        helpText: 'Caching mode'
      },
      {
        name: 'cacheServer',
        label: 'Hosted Cache Server (if applicable)',
        type: 'text',
        required: false,
        placeholder: 'CACHE-SERVER01',
        helpText: 'Required for Hosted Cache mode'
      },
      {
        name: 'cacheSizeMB',
        label: 'Cache Size (MB)',
        type: 'number',
        required: true,
        defaultValue: 5120,
        placeholder: '5120',
        helpText: 'Local cache size in megabytes'
      }
    ],
    scriptTemplate: (params) => {
      const mode = params.mode || 'DistributedCache';
      const cacheServer = params.cacheServer ? escapePowerShellString(params.cacheServer) : '';
      const cacheSizeMB = params.cacheSizeMB || 5120;

      return `# Configure BranchCache
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring BranchCache..." -ForegroundColor Cyan
    Write-Host "  Mode: ${mode}" -ForegroundColor Gray
    ${cacheServer ? `Write-Host "  Cache Server: ${cacheServer}" -ForegroundColor Gray` : ''}
    Write-Host "  Cache Size: ${cacheSizeMB} MB" -ForegroundColor Gray
    
    # Install BranchCache feature if needed
    $Feature = Get-WindowsFeature -Name BranchCache
    if (-not $Feature.Installed) {
        Write-Host "Installing BranchCache feature..." -ForegroundColor Cyan
        Install-WindowsFeature -Name BranchCache
        Write-Host "✓ BranchCache installed" -ForegroundColor Green
    }
    
    # Configure BranchCache mode
    switch ("${mode}") {
        "DistributedCache" {
            Write-Host "Enabling Distributed Cache mode..." -ForegroundColor Cyan
            Enable-BCDistributed
            Write-Host "✓ Distributed Cache enabled" -ForegroundColor Green
        }
        "HostedCache" {
            ${cacheServer ? `
            Write-Host "Enabling Hosted Cache mode..." -ForegroundColor Cyan
            Enable-BCHostedClient -ServerNames "${cacheServer}"
            Write-Host "✓ Hosted Cache enabled" -ForegroundColor Green
            Write-Host "  Cache Server: ${cacheServer}" -ForegroundColor Gray
            ` : `
            Write-Error "Cache server name required for Hosted Cache mode"
            exit 1
            `}
        }
    }
    
    # Set cache size
    Write-Host "Setting cache size..." -ForegroundColor Cyan
    Set-BCCache -Percentage 100
    
    # Configure firewall rules
    Write-Host "Configuring firewall rules..." -ForegroundColor Cyan
    Enable-NetFirewallRule -DisplayGroup "BranchCache*"
    Write-Host "✓ Firewall rules enabled" -ForegroundColor Green
    
    # Display configuration
    Write-Host ""
    Write-Host "BranchCache Configuration:" -ForegroundColor Cyan
    Get-BCStatus | Select-Object BranchCacheIsEnabled, BranchCacheServiceStatus | Format-List
    
    Write-Host ""
    Write-Host "✓ BranchCache configured successfully" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to configure BranchCache: $_"
}`;
    }
  },

  {
    id: 'ws-manage-wsus-updates',
    title: 'Manage Windows Server Updates (WSUS)',
    description: 'Approve, deploy, decline updates',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Manages Windows Server Update Services (WSUS) for centralized patch management
- Approves, deploys, and declines updates for client computers
- Enables controlled update deployment

**Prerequisites:**
- WSUS role installed and configured
- Administrator credentials
- WSUS database configured
- Client computers configured to use WSUS server

**What You Need to Provide:**
- WSUS server name
- Action (Approve, Decline, or Get Updates)
- Update classification (Security, Critical, etc.)
- Target computer group

**What the Script Does:**
1. Connects to WSUS server
2. Retrieves updates based on classification
3. Performs specified action (approve/decline)
4. Applies updates to target computer group
5. Reports operation success

**Important Notes:**
- Essential for centralized patch management
- Test updates in lab before production deployment
- Approve security updates promptly
- Decline superseded updates
- Schedule deployments during maintenance windows
- Monitor update installation status
- Typical use: monthly patch deployments
- Review declined updates periodically`,
    parameters: [
      {
        name: 'wsusServer',
        label: 'WSUS Server Name',
        type: 'text',
        required: true,
        placeholder: 'WSUS-SERVER01',
        helpText: 'WSUS server to manage'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'GetUpdates', label: 'Get Pending Updates' },
          { value: 'Approve', label: 'Approve Updates' },
          { value: 'Decline', label: 'Decline Updates' }
        ],
        helpText: 'WSUS management operation'
      },
      {
        name: 'classification',
        label: 'Update Classification',
        type: 'select',
        required: true,
        options: [
          { value: 'Security Updates', label: 'Security Updates' },
          { value: 'Critical Updates', label: 'Critical Updates' },
          { value: 'Definition Updates', label: 'Definition Updates' },
          { value: 'Feature Packs', label: 'Feature Packs' }
        ],
        helpText: 'Type of updates to manage'
      },
      {
        name: 'computerGroup',
        label: 'Target Computer Group',
        type: 'text',
        required: false,
        placeholder: 'All Computers',
        defaultValue: 'All Computers',
        helpText: 'Computer group to deploy to'
      }
    ],
    scriptTemplate: (params) => {
      const wsusServer = escapePowerShellString(params.wsusServer);
      const action = params.action;
      const classification = escapePowerShellString(params.classification);
      const computerGroup = params.computerGroup ? escapePowerShellString(params.computerGroup) : 'All Computers';

      return `# Manage WSUS Updates
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Managing WSUS updates..." -ForegroundColor Cyan
    Write-Host "  WSUS Server: ${wsusServer}" -ForegroundColor Gray
    Write-Host "  Action: ${action}" -ForegroundColor Gray
    Write-Host "  Classification: ${classification}" -ForegroundColor Gray
    Write-Host "  Computer Group: ${computerGroup}" -ForegroundColor Gray
    
    # Load WSUS assembly
    [void][reflection.assembly]::LoadWithPartialName("Microsoft.UpdateServices.Administration")
    
    # Connect to WSUS server
    $Wsus = [Microsoft.UpdateServices.Administration.AdminProxy]::GetUpdateServer("${wsusServer}", $false, 8530)
    Write-Host "✓ Connected to WSUS server" -ForegroundColor Green
    
    # Get update scope for classification
    $UpdateScope = New-Object Microsoft.UpdateServices.Administration.UpdateScope
    $UpdateScope.ApprovedStates = [Microsoft.UpdateServices.Administration.ApprovedStates]::NotApproved
    
    # Get target computer group
    $AllComputers = $Wsus.GetComputerTargetGroups() | Where-Object { $_.Name -eq "${computerGroup}" }
    
    if (-not $AllComputers) {
        Write-Error "Computer group not found: ${computerGroup}"
        exit 1
    }
    
    # Perform action
    switch ("${action}") {
        "GetUpdates" {
            Write-Host "Retrieving updates..." -ForegroundColor Cyan
            $Updates = $Wsus.GetUpdates($UpdateScope)
            
            Write-Host "Found $($Updates.Count) updates" -ForegroundColor Yellow
            $Updates | Select-Object -First 20 Title, KnowledgebaseArticles, CreationDate | Format-Table -AutoSize
        }
        
        "Approve" {
            Write-Host "Approving ${classification}..." -ForegroundColor Cyan
            $Updates = $Wsus.GetUpdates($UpdateScope) | Where-Object { $_.UpdateClassificationTitle -eq "${classification}" }
            
            $ApprovedCount = 0
            foreach ($Update in $Updates) {
                $Update.Approve([Microsoft.UpdateServices.Administration.UpdateApprovalAction]::Install, $AllComputers) | Out-Null
                $ApprovedCount++
            }
            
            Write-Host "✓ Approved $ApprovedCount updates for ${computerGroup}" -ForegroundColor Green
        }
        
        "Decline" {
            Write-Host "⚠ Declining updates..." -ForegroundColor Yellow
            $Updates = $Wsus.GetUpdates($UpdateScope) | Where-Object { $_.UpdateClassificationTitle -eq "${classification}" }
            
            $DeclinedCount = 0
            foreach ($Update in $Updates) {
                $Update.Decline()
                $DeclinedCount++
            }
            
            Write-Host "✓ Declined $DeclinedCount updates" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Error "Failed to manage WSUS updates: $_"
}`;
    }
  },

  // ==================== FAILOVER CLUSTERING TASKS ====================
  {
    id: 'ws-get-cluster-health',
    title: 'Get Cluster Health Report',
    description: 'Generate comprehensive health report for Windows Failover Cluster',
    category: 'Failover Clustering',
    isPremium: true,
    instructions: `**How This Task Works:**
- Generates detailed health report for Windows Failover Cluster
- Checks cluster nodes, resources, networks, and quorum status
- Identifies issues before they cause outages

**Prerequisites:**
- Failover Clustering feature installed
- Administrator credentials on cluster nodes
- PowerShell remoting enabled on cluster nodes

**What You Need to Provide:**
- Cluster name to query
- Export path for health report

**What the Script Does:**
1. Connects to the failover cluster
2. Checks node health and online status
3. Verifies cluster resources and groups
4. Reports quorum configuration and health
5. Exports comprehensive health report

**Important Notes:**
- Essential for proactive cluster monitoring
- Run regularly to identify issues early
- Check before planned maintenance
- Monitor after configuration changes
- Critical for high availability environments
- Typical use: daily health checks, pre-maintenance validation
- Investigate any warnings immediately
- Document baseline health for comparison`,
    parameters: [
      {
        name: 'clusterName',
        label: 'Cluster Name',
        type: 'text',
        required: true,
        placeholder: 'CLUSTER01',
        helpText: 'Name of the failover cluster'
      },
      {
        name: 'exportPath',
        label: 'Export Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ClusterHealth.html',
        helpText: 'Path for the HTML health report'
      }
    ],
    scriptTemplate: (params) => {
      const clusterName = escapePowerShellString(params.clusterName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Get Cluster Health Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating cluster health report for: ${clusterName}" -ForegroundColor Cyan
    
    # Import Failover Clusters module
    Import-Module FailoverClusters -ErrorAction Stop
    
    # Get cluster object
    $Cluster = Get-Cluster -Name "${clusterName}" -ErrorAction Stop
    Write-Host "✓ Connected to cluster: $($Cluster.Name)" -ForegroundColor Green
    
    # Get cluster nodes
    Write-Host ""
    Write-Host "Cluster Nodes:" -ForegroundColor Cyan
    $Nodes = Get-ClusterNode -Cluster "${clusterName}"
    $Nodes | ForEach-Object {
        $StateColor = if ($_.State -eq 'Up') { 'Green' } else { 'Red' }
        Write-Host "  $($_.Name): $($_.State)" -ForegroundColor $StateColor
    }
    
    # Get cluster resources
    Write-Host ""
    Write-Host "Cluster Resources:" -ForegroundColor Cyan
    $Resources = Get-ClusterResource -Cluster "${clusterName}"
    $OnlineCount = ($Resources | Where-Object { $_.State -eq 'Online' }).Count
    $OfflineCount = ($Resources | Where-Object { $_.State -ne 'Online' }).Count
    Write-Host "  Online: $OnlineCount" -ForegroundColor Green
    if ($OfflineCount -gt 0) {
        Write-Host "  Offline: $OfflineCount" -ForegroundColor Red
    }
    
    # Get quorum status
    Write-Host ""
    Write-Host "Quorum Configuration:" -ForegroundColor Cyan
    $Quorum = Get-ClusterQuorum -Cluster "${clusterName}"
    Write-Host "  Type: $($Quorum.QuorumType)" -ForegroundColor Gray
    Write-Host "  Resource: $($Quorum.QuorumResource)" -ForegroundColor Gray
    
    # Generate validation report
    Write-Host ""
    Write-Host "Generating HTML health report..." -ForegroundColor Cyan
    Test-Cluster -Cluster "${clusterName}" -ReportName "${exportPath}" -ErrorAction SilentlyContinue
    
    Write-Host "✓ Cluster health report exported to: ${exportPath}" -ForegroundColor Green
    
    # Summary
    Write-Host ""
    Write-Host "Cluster Health Summary:" -ForegroundColor Cyan
    Write-Host "  Nodes: $($Nodes.Count) total, $(($Nodes | Where-Object { $_.State -eq 'Up' }).Count) online" -ForegroundColor Gray
    Write-Host "  Resources: $($Resources.Count) total, $OnlineCount online" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate cluster health report: \$_"
}`;
    }
  },

  {
    id: 'ws-cluster-node-management',
    title: 'Manage Cluster Node',
    description: 'Pause, resume, or evict a node from Windows Failover Cluster',
    category: 'Failover Clustering',
    isPremium: true,
    instructions: `**How This Task Works:**
- Manages cluster node state for maintenance or removal
- Supports pause, resume, and evict operations
- Ensures workloads are migrated before maintenance

**Prerequisites:**
- Failover Clustering feature installed
- Administrator credentials on cluster nodes
- Node must be part of the cluster

**What You Need to Provide:**
- Cluster name
- Node name to manage
- Action to perform (Pause/Resume/Evict)

**What the Script Does:**
1. Connects to the failover cluster
2. Validates node exists in cluster
3. Performs specified action on node
4. Migrates workloads if pausing or evicting
5. Reports operation status

**Important Notes:**
- Pause node before maintenance
- Resume node after maintenance completes
- Evict permanently removes node from cluster
- Workloads migrate during pause/evict
- Plan for temporary capacity reduction
- Typical use: OS updates, hardware maintenance
- Verify workloads migrated successfully
- Monitor cluster during operations`,
    parameters: [
      {
        name: 'clusterName',
        label: 'Cluster Name',
        type: 'text',
        required: true,
        placeholder: 'CLUSTER01',
        helpText: 'Name of the failover cluster'
      },
      {
        name: 'nodeName',
        label: 'Node Name',
        type: 'text',
        required: true,
        placeholder: 'NODE01',
        helpText: 'Name of the cluster node'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Pause', label: 'Pause (Drain roles for maintenance)' },
          { value: 'Resume', label: 'Resume (Return to service)' },
          { value: 'Evict', label: 'Evict (Remove from cluster)' }
        ],
        helpText: 'Action to perform on the node'
      }
    ],
    scriptTemplate: (params) => {
      const clusterName = escapePowerShellString(params.clusterName);
      const nodeName = escapePowerShellString(params.nodeName);
      const action = params.action;

      return `# Manage Cluster Node
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Managing cluster node: ${nodeName}" -ForegroundColor Cyan
    Write-Host "Cluster: ${clusterName}" -ForegroundColor Gray
    Write-Host "Action: ${action}" -ForegroundColor Gray
    
    # Import Failover Clusters module
    Import-Module FailoverClusters -ErrorAction Stop
    
    # Verify node exists
    $Node = Get-ClusterNode -Cluster "${clusterName}" -Name "${nodeName}" -ErrorAction Stop
    Write-Host "Current state: $($Node.State)" -ForegroundColor Yellow
    
    switch ("${action}") {
        "Pause" {
            Write-Host ""
            Write-Host "Pausing node and draining roles..." -ForegroundColor Cyan
            Suspend-ClusterNode -Cluster "${clusterName}" -Name "${nodeName}" -Drain -Wait
            
            $Node = Get-ClusterNode -Cluster "${clusterName}" -Name "${nodeName}"
            Write-Host "✓ Node paused successfully" -ForegroundColor Green
            Write-Host "New state: $($Node.State)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Node is now safe for maintenance" -ForegroundColor Yellow
        }
        
        "Resume" {
            Write-Host ""
            Write-Host "Resuming node..." -ForegroundColor Cyan
            Resume-ClusterNode -Cluster "${clusterName}" -Name "${nodeName}"
            
            $Node = Get-ClusterNode -Cluster "${clusterName}" -Name "${nodeName}"
            Write-Host "✓ Node resumed successfully" -ForegroundColor Green
            Write-Host "New state: $($Node.State)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Node is available to host cluster roles" -ForegroundColor Yellow
        }
        
        "Evict" {
            Write-Host ""
            Write-Host "⚠ WARNING: This will permanently remove the node from the cluster" -ForegroundColor Yellow
            Write-Host "Evicting node..." -ForegroundColor Cyan
            Remove-ClusterNode -Cluster "${clusterName}" -Name "${nodeName}" -Force
            
            Write-Host "✓ Node evicted from cluster" -ForegroundColor Green
            Write-Host ""
            Write-Host "To rejoin, use Add-ClusterNode cmdlet" -ForegroundColor Gray
        }
    }
    
    # Show remaining nodes
    Write-Host ""
    Write-Host "Current cluster nodes:" -ForegroundColor Cyan
    Get-ClusterNode -Cluster "${clusterName}" | Select-Object Name, State | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to manage cluster node: \$_"
}`;
    }
  },

  {
    id: 'ws-configure-cluster-quorum',
    title: 'Configure Cluster Quorum',
    description: 'Set up quorum configuration for Windows Failover Cluster',
    category: 'Failover Clustering',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures cluster quorum for high availability voting
- Supports disk witness, file share witness, and cloud witness
- Ensures cluster can maintain quorum during failures

**Prerequisites:**
- Failover Clustering feature installed
- Administrator credentials on cluster
- Witness resource available (disk, share, or Azure account)

**What You Need to Provide:**
- Cluster name
- Quorum type (Node Majority, Disk Witness, File Share, Cloud)
- Witness path or Azure account (depending on type)

**What the Script Does:**
1. Connects to the failover cluster
2. Shows current quorum configuration
3. Configures new quorum settings
4. Validates quorum is operational
5. Reports configuration status

**Important Notes:**
- Critical for cluster high availability
- Node Majority for odd number of nodes
- Use witness for even number of nodes
- Cloud witness requires Azure storage account
- File share witness must be on separate server
- Typical use: initial cluster setup, witness migration
- Test quorum by simulating node failure
- Monitor quorum during maintenance`,
    parameters: [
      {
        name: 'clusterName',
        label: 'Cluster Name',
        type: 'text',
        required: true,
        placeholder: 'CLUSTER01',
        helpText: 'Name of the failover cluster'
      },
      {
        name: 'quorumType',
        label: 'Quorum Type',
        type: 'select',
        required: true,
        options: [
          { value: 'NodeMajority', label: 'Node Majority (No witness)' },
          { value: 'DiskWitness', label: 'Disk Witness' },
          { value: 'FileShareWitness', label: 'File Share Witness' },
          { value: 'CloudWitness', label: 'Cloud Witness (Azure)' }
        ],
        helpText: 'Type of quorum configuration'
      },
      {
        name: 'witnessPath',
        label: 'Witness Path/Account',
        type: 'text',
        required: false,
        placeholder: '\\\\FILESERVER\\Witness or Azure Storage Account',
        helpText: 'Path for file share witness or Azure account name for cloud witness'
      }
    ],
    scriptTemplate: (params) => {
      const clusterName = escapePowerShellString(params.clusterName);
      const quorumType = params.quorumType;
      const witnessPath = params.witnessPath ? escapePowerShellString(params.witnessPath) : '';

      return `# Configure Cluster Quorum
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring cluster quorum for: ${clusterName}" -ForegroundColor Cyan
    Write-Host "Quorum Type: ${quorumType}" -ForegroundColor Gray
    ${witnessPath ? `Write-Host "Witness: ${witnessPath}" -ForegroundColor Gray` : ''}
    
    # Import Failover Clusters module
    Import-Module FailoverClusters -ErrorAction Stop
    
    # Get current quorum configuration
    Write-Host ""
    Write-Host "Current quorum configuration:" -ForegroundColor Yellow
    $CurrentQuorum = Get-ClusterQuorum -Cluster "${clusterName}"
    Write-Host "  Type: $($CurrentQuorum.QuorumType)" -ForegroundColor Gray
    Write-Host "  Resource: $($CurrentQuorum.QuorumResource)" -ForegroundColor Gray
    
    # Configure new quorum
    Write-Host ""
    Write-Host "Configuring new quorum..." -ForegroundColor Cyan
    
    switch ("${quorumType}") {
        "NodeMajority" {
            Set-ClusterQuorum -Cluster "${clusterName}" -NoWitness
            Write-Host "✓ Node Majority quorum configured" -ForegroundColor Green
        }
        
        "DiskWitness" {
            if (-not "${witnessPath}") {
                Write-Error "Disk witness resource name required"
                exit 1
            }
            Set-ClusterQuorum -Cluster "${clusterName}" -DiskWitness "${witnessPath}"
            Write-Host "✓ Disk Witness quorum configured" -ForegroundColor Green
        }
        
        "FileShareWitness" {
            if (-not "${witnessPath}") {
                Write-Error "File share path required"
                exit 1
            }
            Set-ClusterQuorum -Cluster "${clusterName}" -FileShareWitness "${witnessPath}"
            Write-Host "✓ File Share Witness quorum configured" -ForegroundColor Green
        }
        
        "CloudWitness" {
            if (-not "${witnessPath}") {
                Write-Error "Azure storage account name required"
                exit 1
            }
            Write-Host "⚠ Cloud witness requires Azure storage access key" -ForegroundColor Yellow
            $AccessKey = Read-Host "Enter Azure storage access key" -AsSecureString
            Set-ClusterQuorum -Cluster "${clusterName}" -CloudWitness -AccountName "${witnessPath}" -AccessKey $AccessKey
            Write-Host "✓ Cloud Witness quorum configured" -ForegroundColor Green
        }
    }
    
    # Verify new configuration
    Write-Host ""
    Write-Host "New quorum configuration:" -ForegroundColor Cyan
    $NewQuorum = Get-ClusterQuorum -Cluster "${clusterName}"
    Write-Host "  Type: $($NewQuorum.QuorumType)" -ForegroundColor Gray
    Write-Host "  Resource: $($NewQuorum.QuorumResource)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure cluster quorum: \$_"
}`;
    }
  },

  {
    id: 'ws-export-cluster-resources',
    title: 'Export Cluster Resources',
    description: 'Export inventory of all cluster resources and groups to CSV',
    category: 'Failover Clustering',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports complete inventory of cluster resources and groups
- Shows resource status, owner nodes, and dependencies
- Supports documentation and disaster recovery planning

**Prerequisites:**
- Failover Clustering feature installed
- Administrator credentials on cluster
- Access to cluster nodes

**What You Need to Provide:**
- Cluster name
- CSV export file path

**What the Script Does:**
1. Connects to the failover cluster
2. Queries all cluster groups and resources
3. Collects status, owner, and configuration
4. Exports complete inventory to CSV
5. Reports resource counts

**Important Notes:**
- Essential for cluster documentation
- Use for disaster recovery planning
- Run after configuration changes
- Track resource ownership and dependencies
- Monitor resource states over time
- Typical use: audits, DR planning, change tracking
- Review resource health regularly
- Document preferred owners for failback`,
    parameters: [
      {
        name: 'clusterName',
        label: 'Cluster Name',
        type: 'text',
        required: true,
        placeholder: 'CLUSTER01',
        helpText: 'Name of the failover cluster'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ClusterResources.csv',
        helpText: 'Path for the CSV export file'
      }
    ],
    scriptTemplate: (params) => {
      const clusterName = escapePowerShellString(params.clusterName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Cluster Resources
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting cluster resources from: ${clusterName}" -ForegroundColor Cyan
    
    # Import Failover Clusters module
    Import-Module FailoverClusters -ErrorAction Stop
    
    # Get all cluster groups
    $Groups = Get-ClusterGroup -Cluster "${clusterName}"
    Write-Host "Found $($Groups.Count) cluster groups" -ForegroundColor Yellow
    
    # Get all resources with details
    $ResourceReport = foreach ($Group in $Groups) {
        $Resources = Get-ClusterResource -Cluster "${clusterName}" | Where-Object { $_.OwnerGroup -eq $Group.Name }
        
        foreach ($Resource in $Resources) {
            [PSCustomObject]@{
                GroupName           = $Group.Name
                GroupState          = $Group.State
                GroupOwnerNode      = $Group.OwnerNode
                ResourceName        = $Resource.Name
                ResourceType        = $Resource.ResourceType
                ResourceState       = $Resource.State
                OwnerNode           = $Resource.OwnerNode
                IsClusterSharedVol  = $Resource.IsCoreResource
            }
        }
    }
    
    # Also add group-level info for groups without resources
    $GroupReport = foreach ($Group in $Groups) {
        [PSCustomObject]@{
            GroupName           = $Group.Name
            GroupState          = $Group.State
            GroupOwnerNode      = $Group.OwnerNode
            ResourceName        = "(Group Summary)"
            ResourceType        = "ClusterGroup"
            ResourceState       = $Group.State
            OwnerNode           = $Group.OwnerNode
            IsClusterSharedVol  = $false
        }
    }
    
    # Combine and export
    $AllData = $ResourceReport + $GroupReport | Sort-Object GroupName, ResourceName
    $AllData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Cluster resources exported to: ${exportPath}" -ForegroundColor Green
    
    # Summary
    Write-Host ""
    Write-Host "Export Summary:" -ForegroundColor Cyan
    Write-Host "  Groups: $($Groups.Count)" -ForegroundColor Gray
    Write-Host "  Resources: $($ResourceReport.Count)" -ForegroundColor Gray
    Write-Host "  Online Groups: $(($Groups | Where-Object { $_.State -eq 'Online' }).Count)" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export cluster resources: \$_"
}`;
    }
  },

  // ==================== STORAGE SPACES TASKS ====================
  {
    id: 'ws-create-storage-pool',
    title: 'Create Storage Pool',
    description: 'Create a new Storage Spaces storage pool from physical disks',
    category: 'Storage Spaces',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a Storage Spaces storage pool from available physical disks
- Combines multiple disks into a single storage pool
- Enables flexible storage allocation with virtual disks

**Prerequisites:**
- Windows Server 2012 or later
- Physical disks available for pooling
- Administrator credentials
- Storage Spaces feature enabled

**What You Need to Provide:**
- Storage pool name
- Friendly name for the pool

**What the Script Does:**
1. Identifies all available physical disks
2. Creates storage pool from selected disks
3. Configures pool settings
4. Reports pool creation status
5. Shows pool capacity information

**Important Notes:**
- Essential for software-defined storage
- Disks must be uninitialized or primordial
- Minimum 1 disk required (2+ recommended for resiliency)
- Cannot undo pool creation without data loss
- Use for flexible storage allocation
- Typical use: file servers, Hyper-V storage
- Plan disk layout before creating pool
- Consider fault domains for resiliency`,
    parameters: [
      {
        name: 'poolName',
        label: 'Storage Pool Name',
        type: 'text',
        required: true,
        placeholder: 'DataPool1',
        helpText: 'Name for the new storage pool'
      },
      {
        name: 'subsystemFriendlyName',
        label: 'Storage Subsystem',
        type: 'text',
        required: false,
        placeholder: 'Windows Storage',
        defaultValue: 'Windows Storage*',
        helpText: 'Storage subsystem name (default: Windows Storage)'
      }
    ],
    scriptTemplate: (params) => {
      const poolName = escapePowerShellString(params.poolName);
      const subsystem = params.subsystemFriendlyName || 'Windows Storage*';

      return `# Create Storage Pool
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating storage pool: ${poolName}" -ForegroundColor Cyan
    
    # Get storage subsystem
    $Subsystem = Get-StorageSubSystem -FriendlyName "${subsystem}" -ErrorAction Stop
    Write-Host "✓ Found storage subsystem: $($Subsystem.FriendlyName)" -ForegroundColor Green
    
    # Get available physical disks
    $AvailableDisks = Get-PhysicalDisk -CanPool $true
    
    if ($AvailableDisks.Count -eq 0) {
        Write-Error "No physical disks available for pooling"
        exit 1
    }
    
    Write-Host ""
    Write-Host "Available disks for pooling:" -ForegroundColor Cyan
    $AvailableDisks | Select-Object FriendlyName, MediaType, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, HealthStatus | Format-Table -AutoSize
    
    Write-Host "Total disks: $($AvailableDisks.Count)" -ForegroundColor Yellow
    $TotalCapacity = ($AvailableDisks | Measure-Object -Property Size -Sum).Sum / 1GB
    Write-Host "Total capacity: $([math]::Round($TotalCapacity,2)) GB" -ForegroundColor Yellow
    
    # Create storage pool
    Write-Host ""
    Write-Host "Creating storage pool..." -ForegroundColor Cyan
    
    $Pool = New-StoragePool -FriendlyName "${poolName}" -StorageSubSystemFriendlyName $Subsystem.FriendlyName -PhysicalDisks $AvailableDisks
    
    Write-Host "✓ Storage pool created successfully" -ForegroundColor Green
    
    # Display pool information
    Write-Host ""
    Write-Host "Storage Pool Details:" -ForegroundColor Cyan
    Write-Host "  Name: $($Pool.FriendlyName)" -ForegroundColor Gray
    Write-Host "  Health: $($Pool.HealthStatus)" -ForegroundColor Gray
    Write-Host "  Operational Status: $($Pool.OperationalStatus)" -ForegroundColor Gray
    Write-Host "  Size: $([math]::Round($Pool.Size/1GB,2)) GB" -ForegroundColor Gray
    Write-Host "  Allocated: $([math]::Round($Pool.AllocatedSize/1GB,2)) GB" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create storage pool: \$_"
}`;
    }
  },

  {
    id: 'ws-create-virtual-disk',
    title: 'Create Virtual Disk',
    description: 'Create a resilient virtual disk from a storage pool',
    category: 'Storage Spaces',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a virtual disk with specified resiliency from storage pool
- Supports Simple, Mirror, and Parity layouts
- Enables flexible and resilient storage allocation

**Prerequisites:**
- Existing storage pool with available capacity
- Administrator credentials
- Understanding of resiliency requirements

**What You Need to Provide:**
- Storage pool name
- Virtual disk name
- Resiliency type and size

**What the Script Does:**
1. Connects to specified storage pool
2. Creates virtual disk with resiliency settings
3. Initializes and formats the disk
4. Assigns drive letter
5. Reports disk configuration

**Important Notes:**
- Mirror requires 2+ disks for redundancy
- Parity requires 3+ disks
- Simple provides no fault tolerance
- Thin provisioning allows overcommitment
- Fixed provisioning reserves space immediately
- Typical use: creating data volumes
- Match resiliency to data importance
- Monitor pool capacity for thin disks`,
    parameters: [
      {
        name: 'poolName',
        label: 'Storage Pool Name',
        type: 'text',
        required: true,
        placeholder: 'DataPool1',
        helpText: 'Name of the storage pool'
      },
      {
        name: 'vdiskName',
        label: 'Virtual Disk Name',
        type: 'text',
        required: true,
        placeholder: 'DataDisk1',
        helpText: 'Name for the virtual disk'
      },
      {
        name: 'resiliencyType',
        label: 'Resiliency Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Simple', label: 'Simple (No fault tolerance)' },
          { value: 'Mirror', label: 'Two-way Mirror (1 disk failure)' },
          { value: 'Parity', label: 'Parity (Space efficient)' }
        ],
        defaultValue: 'Mirror',
        helpText: 'Data protection level'
      },
      {
        name: 'sizeGB',
        label: 'Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 100,
        helpText: 'Size of the virtual disk in GB'
      },
      {
        name: 'driveLetter',
        label: 'Drive Letter',
        type: 'text',
        required: false,
        placeholder: 'E',
        helpText: 'Drive letter to assign (optional)'
      }
    ],
    scriptTemplate: (params) => {
      const poolName = escapePowerShellString(params.poolName);
      const vdiskName = escapePowerShellString(params.vdiskName);
      const resiliencyType = params.resiliencyType || 'Mirror';
      const sizeGB = params.sizeGB || 100;
      const driveLetter = params.driveLetter ? escapePowerShellString(params.driveLetter) : '';

      return `# Create Virtual Disk
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating virtual disk: ${vdiskName}" -ForegroundColor Cyan
    Write-Host "  Pool: ${poolName}" -ForegroundColor Gray
    Write-Host "  Resiliency: ${resiliencyType}" -ForegroundColor Gray
    Write-Host "  Size: ${sizeGB} GB" -ForegroundColor Gray
    
    # Verify storage pool exists
    $Pool = Get-StoragePool -FriendlyName "${poolName}" -ErrorAction Stop
    Write-Host "✓ Storage pool found: $($Pool.FriendlyName)" -ForegroundColor Green
    
    # Check available capacity
    $AvailableGB = [math]::Round(($Pool.Size - $Pool.AllocatedSize) / 1GB, 2)
    Write-Host "  Available capacity: $AvailableGB GB" -ForegroundColor Gray
    
    # Create virtual disk
    Write-Host ""
    Write-Host "Creating virtual disk..." -ForegroundColor Cyan
    
    $VDisk = New-VirtualDisk -StoragePoolFriendlyName "${poolName}" -FriendlyName "${vdiskName}" -ResiliencySettingName "${resiliencyType}" -Size ${sizeGB}GB -ProvisioningType Thin
    
    Write-Host "✓ Virtual disk created" -ForegroundColor Green
    
    # Initialize disk
    Write-Host "Initializing disk..." -ForegroundColor Cyan
    $Disk = $VDisk | Get-Disk
    $Disk | Initialize-Disk -PartitionStyle GPT
    
    # Create partition and format
    Write-Host "Creating partition and formatting..." -ForegroundColor Cyan
    ${driveLetter ? `
    $Partition = $Disk | New-Partition -UseMaximumSize -DriveLetter "${driveLetter}"
    $Partition | Format-Volume -FileSystem NTFS -NewFileSystemLabel "${vdiskName}" -Confirm:\$false
    Write-Host "✓ Volume formatted and mounted as ${driveLetter}:" -ForegroundColor Green
    ` : `
    $Partition = $Disk | New-Partition -UseMaximumSize -AssignDriveLetter
    $Partition | Format-Volume -FileSystem NTFS -NewFileSystemLabel "${vdiskName}" -Confirm:\$false
    Write-Host "✓ Volume formatted and mounted" -ForegroundColor Green
    `}
    
    # Display summary
    Write-Host ""
    Write-Host "Virtual Disk Summary:" -ForegroundColor Cyan
    Get-VirtualDisk -FriendlyName "${vdiskName}" | Select-Object FriendlyName, ResiliencySettingName, Size, OperationalStatus, HealthStatus | Format-List
    
} catch {
    Write-Error "Failed to create virtual disk: \$_"
}`;
    }
  },

  {
    id: 'ws-export-storage-spaces',
    title: 'Export Storage Spaces Report',
    description: 'Export inventory of storage pools, virtual disks, and physical disks',
    category: 'Storage Spaces',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports comprehensive Storage Spaces inventory
- Shows pools, virtual disks, and physical disk health
- Supports capacity planning and health monitoring

**Prerequisites:**
- Storage Spaces configured on server
- Administrator credentials
- Storage PowerShell module available

**What You Need to Provide:**
- Export file path for CSV report

**What the Script Does:**
1. Queries all storage pools
2. Collects virtual disk information
3. Gathers physical disk health data
4. Exports complete inventory to CSV
5. Reports storage health summary

**Important Notes:**
- Essential for storage capacity planning
- Monitor disk health status
- Track pool utilization over time
- Identify degraded or failing disks
- Plan capacity expansion proactively
- Typical use: capacity planning, health audits
- Review weekly for proactive maintenance
- Replace unhealthy disks promptly`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\StorageSpaces.csv',
        helpText: 'Path for the CSV export file'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Storage Spaces Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating Storage Spaces report..." -ForegroundColor Cyan
    
    # Get all storage pools
    $Pools = Get-StoragePool | Where-Object { $_.IsPrimordial -eq $false }
    Write-Host "Found $($Pools.Count) storage pools" -ForegroundColor Yellow
    
    # Build comprehensive report
    $Report = @()
    
    foreach ($Pool in $Pools) {
        # Get virtual disks in this pool
        $VDisks = Get-VirtualDisk -StoragePool $Pool -ErrorAction SilentlyContinue
        
        # Get physical disks in this pool
        $PDisks = Get-PhysicalDisk -StoragePool $Pool -ErrorAction SilentlyContinue
        
        foreach ($VDisk in $VDisks) {
            $Report += [PSCustomObject]@{
                PoolName            = $Pool.FriendlyName
                PoolHealthStatus    = $Pool.HealthStatus
                PoolOperationalStatus = $Pool.OperationalStatus
                PoolSizeGB          = [math]::Round($Pool.Size / 1GB, 2)
                PoolAllocatedGB     = [math]::Round($Pool.AllocatedSize / 1GB, 2)
                VirtualDiskName     = $VDisk.FriendlyName
                VDiskResiliency     = $VDisk.ResiliencySettingName
                VDiskSizeGB         = [math]::Round($VDisk.Size / 1GB, 2)
                VDiskHealthStatus   = $VDisk.HealthStatus
                PhysicalDiskCount   = $PDisks.Count
            }
        }
        
        # If no virtual disks, still report pool
        if ($VDisks.Count -eq 0) {
            $Report += [PSCustomObject]@{
                PoolName            = $Pool.FriendlyName
                PoolHealthStatus    = $Pool.HealthStatus
                PoolOperationalStatus = $Pool.OperationalStatus
                PoolSizeGB          = [math]::Round($Pool.Size / 1GB, 2)
                PoolAllocatedGB     = [math]::Round($Pool.AllocatedSize / 1GB, 2)
                VirtualDiskName     = "(No virtual disks)"
                VDiskResiliency     = "N/A"
                VDiskSizeGB         = 0
                VDiskHealthStatus   = "N/A"
                PhysicalDiskCount   = $PDisks.Count
            }
        }
    }
    
    # Export report
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Storage Spaces report exported to: ${exportPath}" -ForegroundColor Green
    
    # Physical disk health summary
    Write-Host ""
    Write-Host "Physical Disk Health Summary:" -ForegroundColor Cyan
    Get-PhysicalDisk | Group-Object HealthStatus | ForEach-Object {
        $Color = if ($_.Name -eq 'Healthy') { 'Green' } elseif ($_.Name -eq 'Warning') { 'Yellow' } else { 'Red' }
        Write-Host "  $($_.Name): $($_.Count) disks" -ForegroundColor $Color
    }
    
    # Storage pool summary
    Write-Host ""
    Write-Host "Storage Pool Summary:" -ForegroundColor Cyan
    foreach ($Pool in $Pools) {
        $UsedPercent = [math]::Round(($Pool.AllocatedSize / $Pool.Size) * 100, 1)
        Write-Host "  $($Pool.FriendlyName): $UsedPercent% used ($([math]::Round($Pool.AllocatedSize/1GB,0))/$([math]::Round($Pool.Size/1GB,0)) GB)" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to export Storage Spaces report: \$_"
}`;
    }
  },

  // ==================== REMOTE DESKTOP SERVICES TASKS ====================
  {
    id: 'ws-get-rds-session-hosts',
    title: 'Get RDS Session Hosts Status',
    description: 'Report on Remote Desktop Session Host servers and sessions',
    category: 'Remote Desktop Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports on RDS Session Host servers in a collection
- Shows active sessions, user counts, and server health
- Supports RDS farm monitoring and capacity planning

**Prerequisites:**
- Remote Desktop Services role installed
- RD Connection Broker configured
- Administrator credentials on RD servers

**What You Need to Provide:**
- RD Connection Broker server name
- Collection name (optional)

**What the Script Does:**
1. Connects to RD Connection Broker
2. Queries Session Host servers
3. Collects session and user information
4. Reports server health and capacity
5. Shows current session counts

**Important Notes:**
- Essential for RDS farm monitoring
- Monitor session counts for capacity
- Identify overloaded servers
- Track user distribution across hosts
- Plan maintenance during low usage
- Typical use: daily monitoring, capacity planning
- Balance sessions across hosts
- Monitor for disconnected sessions`,
    parameters: [
      {
        name: 'connectionBroker',
        label: 'RD Connection Broker',
        type: 'text',
        required: true,
        placeholder: 'RDCB01.domain.com',
        helpText: 'RD Connection Broker server name'
      },
      {
        name: 'collectionName',
        label: 'Collection Name',
        type: 'text',
        required: false,
        placeholder: 'Desktop Collection',
        helpText: 'Optional: specific collection to query'
      }
    ],
    scriptTemplate: (params) => {
      const connectionBroker = escapePowerShellString(params.connectionBroker);
      const collectionName = params.collectionName ? escapePowerShellString(params.collectionName) : '';

      return `# Get RDS Session Hosts Status
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Querying RDS Session Hosts from: ${connectionBroker}" -ForegroundColor Cyan
    
    # Import Remote Desktop module
    Import-Module RemoteDesktop -ErrorAction Stop
    
    # Get collections
    ${collectionName ? `
    $Collections = Get-RDSessionCollection -ConnectionBroker "${connectionBroker}" | Where-Object { $_.CollectionName -eq "${collectionName}" }
    ` : `
    $Collections = Get-RDSessionCollection -ConnectionBroker "${connectionBroker}"
    `}
    
    Write-Host "Found $($Collections.Count) session collection(s)" -ForegroundColor Yellow
    
    foreach ($Collection in $Collections) {
        Write-Host ""
        Write-Host "Collection: $($Collection.CollectionName)" -ForegroundColor Cyan
        Write-Host "  Description: $($Collection.CollectionDescription)" -ForegroundColor Gray
        
        # Get session hosts in collection
        $SessionHosts = Get-RDSessionHost -CollectionName $Collection.CollectionName -ConnectionBroker "${connectionBroker}"
        
        Write-Host ""
        Write-Host "  Session Hosts:" -ForegroundColor Yellow
        foreach ($Host in $SessionHosts) {
            $StateColor = if ($Host.NewConnectionAllowed -eq 'Yes') { 'Green' } else { 'Yellow' }
            Write-Host "    $($Host.SessionHost)" -ForegroundColor $StateColor
            Write-Host "      New Connections: $($Host.NewConnectionAllowed)" -ForegroundColor Gray
        }
        
        # Get active sessions
        $Sessions = Get-RDUserSession -CollectionName $Collection.CollectionName -ConnectionBroker "${connectionBroker}" -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "  Active Sessions: $($Sessions.Count)" -ForegroundColor Yellow
        
        if ($Sessions.Count -gt 0) {
            $Sessions | Group-Object HostServer | ForEach-Object {
                Write-Host "    $($_.Name): $($_.Count) sessions" -ForegroundColor Gray
            }
            
            # Session state breakdown
            Write-Host ""
            Write-Host "  Session States:" -ForegroundColor Yellow
            $Sessions | Group-Object SessionState | ForEach-Object {
                Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor Gray
            }
        }
    }
    
    # Summary
    Write-Host ""
    Write-Host "RDS Farm Summary:" -ForegroundColor Cyan
    $TotalHosts = ($Collections | ForEach-Object { Get-RDSessionHost -CollectionName $_.CollectionName -ConnectionBroker "${connectionBroker}" }).Count
    $TotalSessions = ($Collections | ForEach-Object { Get-RDUserSession -CollectionName $_.CollectionName -ConnectionBroker "${connectionBroker}" -ErrorAction SilentlyContinue }).Count
    Write-Host "  Total Session Hosts: $TotalHosts" -ForegroundColor Gray
    Write-Host "  Total Active Sessions: $TotalSessions" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to query RDS Session Hosts: \$_"
}`;
    }
  },

  {
    id: 'ws-manage-rds-sessions',
    title: 'Manage RDS User Sessions',
    description: 'Disconnect, logoff, or send messages to RDS user sessions',
    category: 'Remote Desktop Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Manages user sessions on RDS Session Host servers
- Supports disconnect, logoff, and messaging operations
- Enables session management for maintenance

**Prerequisites:**
- Remote Desktop Services role installed
- Administrator credentials on RD servers
- RD Connection Broker configured

**What You Need to Provide:**
- RD Connection Broker server name
- Username or session to manage
- Action to perform

**What the Script Does:**
1. Connects to RD Connection Broker
2. Finds specified user sessions
3. Performs requested action
4. Reports operation result
5. Shows updated session status

**Important Notes:**
- Disconnect preserves user session state
- Logoff closes all applications
- Send message before forced logoff
- Use for maintenance and support
- Monitor session cleanup after logoff
- Typical use: user support, maintenance prep
- Warn users before disconnecting
- Check for unsaved work before logoff`,
    parameters: [
      {
        name: 'connectionBroker',
        label: 'RD Connection Broker',
        type: 'text',
        required: true,
        placeholder: 'RDCB01.domain.com',
        helpText: 'RD Connection Broker server name'
      },
      {
        name: 'userName',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'domain\\username',
        helpText: 'Username to manage (domain\\user format)'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'List', label: 'List Sessions' },
          { value: 'Disconnect', label: 'Disconnect Session' },
          { value: 'Logoff', label: 'Logoff Session' },
          { value: 'Message', label: 'Send Message' }
        ],
        helpText: 'Action to perform on session'
      },
      {
        name: 'message',
        label: 'Message Text',
        type: 'text',
        required: false,
        placeholder: 'System maintenance in 10 minutes',
        helpText: 'Message to send (for Message action)'
      }
    ],
    scriptTemplate: (params) => {
      const connectionBroker = escapePowerShellString(params.connectionBroker);
      const userName = escapePowerShellString(params.userName);
      const action = params.action;
      const message = params.message ? escapePowerShellString(params.message) : 'System maintenance message';

      return `# Manage RDS User Sessions
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Managing RDS sessions for: ${userName}" -ForegroundColor Cyan
    Write-Host "Connection Broker: ${connectionBroker}" -ForegroundColor Gray
    Write-Host "Action: ${action}" -ForegroundColor Gray
    
    # Import Remote Desktop module
    Import-Module RemoteDesktop -ErrorAction Stop
    
    # Find user sessions
    $AllCollections = Get-RDSessionCollection -ConnectionBroker "${connectionBroker}"
    $UserSessions = @()
    
    foreach ($Collection in $AllCollections) {
        $Sessions = Get-RDUserSession -CollectionName $Collection.CollectionName -ConnectionBroker "${connectionBroker}" -ErrorAction SilentlyContinue
        $UserSessions += $Sessions | Where-Object { $_.UserName -like "*${userName}*" }
    }
    
    if ($UserSessions.Count -eq 0) {
        Write-Host "No sessions found for user: ${userName}" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "Found $($UserSessions.Count) session(s)" -ForegroundColor Yellow
    
    foreach ($Session in $UserSessions) {
        Write-Host ""
        Write-Host "Session: $($Session.UnifiedSessionId)" -ForegroundColor Cyan
        Write-Host "  User: $($Session.UserName)" -ForegroundColor Gray
        Write-Host "  Host: $($Session.HostServer)" -ForegroundColor Gray
        Write-Host "  State: $($Session.SessionState)" -ForegroundColor Gray
        Write-Host "  Created: $($Session.CreateTime)" -ForegroundColor Gray
        
        switch ("${action}") {
            "List" {
                # Just listing, no action needed
            }
            
            "Disconnect" {
                Write-Host "Disconnecting session..." -ForegroundColor Yellow
                Disconnect-RDUser -HostServer $Session.HostServer -UnifiedSessionID $Session.UnifiedSessionId -Force
                Write-Host "✓ Session disconnected" -ForegroundColor Green
            }
            
            "Logoff" {
                Write-Host "⚠ Logging off session..." -ForegroundColor Yellow
                Invoke-RDUserLogoff -HostServer $Session.HostServer -UnifiedSessionID $Session.UnifiedSessionId -Force
                Write-Host "✓ Session logged off" -ForegroundColor Green
            }
            
            "Message" {
                Write-Host "Sending message..." -ForegroundColor Yellow
                Send-RDUserMessage -HostServer $Session.HostServer -UnifiedSessionID $Session.UnifiedSessionId -MessageTitle "Administrator Message" -MessageBody "${message}"
                Write-Host "✓ Message sent" -ForegroundColor Green
            }
        }
    }
    
    # Summary
    Write-Host ""
    Write-Host "Operation completed for $($UserSessions.Count) session(s)" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to manage RDS sessions: \$_"
}`;
    }
  },

  {
    id: 'ws-get-rds-licensing',
    title: 'Get RDS Licensing Status',
    description: 'Report on Remote Desktop Services licensing and CAL usage',
    category: 'Remote Desktop Services',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports on RDS license server configuration
- Shows CAL (Client Access License) usage and availability
- Supports license compliance and planning

**Prerequisites:**
- RD Licensing role installed
- Administrator credentials on license server
- RDS deployment configured

**What You Need to Provide:**
- RD License Server name

**What the Script Does:**
1. Connects to RD License Server
2. Queries installed license packs
3. Reports issued and available CALs
4. Shows license expiration dates
5. Provides compliance summary

**Important Notes:**
- Essential for RDS license compliance
- Monitor available CAL count
- Plan license purchases proactively
- Check for expired licenses
- Per User vs Per Device licensing
- Typical use: license audits, capacity planning
- Review monthly for compliance
- Add licenses before running out`,
    parameters: [
      {
        name: 'licenseServer',
        label: 'RD License Server',
        type: 'text',
        required: true,
        placeholder: 'RDLS01.domain.com',
        helpText: 'Remote Desktop License Server name'
      }
    ],
    scriptTemplate: (params) => {
      const licenseServer = escapePowerShellString(params.licenseServer);

      return `# Get RDS Licensing Status
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Querying RDS licensing from: ${licenseServer}" -ForegroundColor Cyan
    
    # Import Remote Desktop module
    Import-Module RemoteDesktopServices -ErrorAction Stop
    
    # Connect to license server via WMI
    $LicenseServer = "${licenseServer}"
    
    Write-Host ""
    Write-Host "License Server Information:" -ForegroundColor Cyan
    
    # Get license server status
    $ServerStatus = Get-WmiObject -Class Win32_TSLicenseServer -ComputerName $LicenseServer -ErrorAction Stop
    Write-Host "  Server: $($ServerStatus.PSComputerName)" -ForegroundColor Gray
    Write-Host "  Version: $($ServerStatus.Version)" -ForegroundColor Gray
    Write-Host "  Status: $($ServerStatus.ServerStatus)" -ForegroundColor Gray
    
    # Get installed license packs
    Write-Host ""
    Write-Host "Installed License Packs:" -ForegroundColor Cyan
    
    $LicensePacks = Get-WmiObject -Class Win32_TSLicenseKeyPack -ComputerName $LicenseServer -ErrorAction Stop
    
    foreach ($Pack in $LicensePacks) {
        $TypeName = switch ($Pack.KeyPackType) {
            0 { "Unknown" }
            1 { "Retail" }
            2 { "Volume" }
            3 { "Concurrent" }
            4 { "Temporary" }
            5 { "Open" }
            6 { "Built-in" }
            default { "Other" }
        }
        
        $ProductType = switch ($Pack.ProductType) {
            0 { "Per Device" }
            1 { "Per User" }
            2 { "Not Specified" }
            default { "Unknown" }
        }
        
        Write-Host ""
        Write-Host "  Product: $($Pack.ProductVersion)" -ForegroundColor Yellow
        Write-Host "    Type: $ProductType ($TypeName)" -ForegroundColor Gray
        Write-Host "    Total Licenses: $($Pack.TotalLicenses)" -ForegroundColor Gray
        Write-Host "    Issued Licenses: $($Pack.IssuedLicenses)" -ForegroundColor Gray
        Write-Host "    Available: $($Pack.AvailableLicenses)" -ForegroundColor $(if ($Pack.AvailableLicenses -gt 10) { 'Green' } elseif ($Pack.AvailableLicenses -gt 0) { 'Yellow' } else { 'Red' })
        
        if ($Pack.ExpirationDate) {
            Write-Host "    Expiration: $($Pack.ExpirationDate)" -ForegroundColor Gray
        }
    }
    
    # Summary
    Write-Host ""
    Write-Host "License Summary:" -ForegroundColor Cyan
    $TotalLicenses = ($LicensePacks | Measure-Object -Property TotalLicenses -Sum).Sum
    $IssuedLicenses = ($LicensePacks | Measure-Object -Property IssuedLicenses -Sum).Sum
    $AvailableLicenses = ($LicensePacks | Measure-Object -Property AvailableLicenses -Sum).Sum
    
    Write-Host "  Total CALs: $TotalLicenses" -ForegroundColor Gray
    Write-Host "  Issued: $IssuedLicenses" -ForegroundColor Gray
    Write-Host "  Available: $AvailableLicenses" -ForegroundColor $(if ($AvailableLicenses -gt 10) { 'Green' } elseif ($AvailableLicenses -gt 0) { 'Yellow' } else { 'Red' })
    
    $UsagePercent = if ($TotalLicenses -gt 0) { [math]::Round(($IssuedLicenses / $TotalLicenses) * 100, 1) } else { 0 }
    Write-Host "  Usage: $UsagePercent%" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to query RDS licensing: \$_"
}`;
    }
  },

  // ==================== WINDOWS SERVER BACKUP TASKS ====================
  {
    id: 'ws-run-system-state-backup',
    title: 'Run System State Backup',
    description: 'Create a system state backup for disaster recovery',
    category: 'Windows Server Backup',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a system state backup of Windows Server
- Includes Active Directory, registry, boot files, and COM+ registration
- Essential for bare metal recovery and AD restoration

**Prerequisites:**
- Windows Server Backup feature installed
- Administrator credentials
- Sufficient backup destination space
- Backup target available (local or network)

**What You Need to Provide:**
- Backup destination path
- Optional network credentials

**What the Script Does:**
1. Validates Windows Server Backup is installed
2. Creates system state backup policy
3. Initiates backup to destination
4. Monitors backup progress
5. Reports completion status

**Important Notes:**
- Critical for domain controllers
- Includes AD database and SYSVOL
- Required for authoritative restore
- Takes significant time for large AD
- Schedule during low-activity periods
- Typical use: nightly DC backups
- Test restore procedures regularly
- Maintain multiple backup generations`,
    parameters: [
      {
        name: 'backupTarget',
        label: 'Backup Destination',
        type: 'text',
        required: true,
        placeholder: 'E:\\Backups or \\\\SERVER\\Backups',
        helpText: 'Local path or network share for backup'
      },
      {
        name: 'useVss',
        label: 'Use VSS Copy Backup',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Use Volume Shadow Copy for consistent backup'
      }
    ],
    scriptTemplate: (params) => {
      const backupTarget = escapePowerShellString(params.backupTarget);
      const useVss = params.useVss !== false;

      return `# Run System State Backup
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Starting System State Backup..." -ForegroundColor Cyan
    Write-Host "Destination: ${backupTarget}" -ForegroundColor Gray
    
    # Check if Windows Server Backup is installed
    $WsbFeature = Get-WindowsFeature -Name Windows-Server-Backup
    if (-not $WsbFeature.Installed) {
        Write-Host "Installing Windows Server Backup feature..." -ForegroundColor Yellow
        Install-WindowsFeature -Name Windows-Server-Backup -IncludeManagementTools
        Write-Host "✓ Windows Server Backup installed" -ForegroundColor Green
    }
    
    # Add Windows Server Backup snap-in
    Add-PSSnapin Windows.ServerBackup -ErrorAction SilentlyContinue
    
    # Validate backup target
    if (-not (Test-Path "${backupTarget}")) {
        New-Item -Path "${backupTarget}" -ItemType Directory -Force | Out-Null
        Write-Host "✓ Created backup directory" -ForegroundColor Green
    }
    
    # Create backup policy
    Write-Host ""
    Write-Host "Creating backup policy..." -ForegroundColor Cyan
    $Policy = New-WBPolicy
    
    # Add system state to backup
    Add-WBSystemState -Policy $Policy
    
    # Configure backup target
    $BackupLocation = New-WBBackupTarget -VolumePath "${backupTarget}"
    Add-WBBackupTarget -Policy $Policy -Target $BackupLocation
    
    # Set VSS option
    ${useVss ? `Set-WBVssBackupOption -Policy $Policy -VssCopyBackup` : `Set-WBVssBackupOption -Policy $Policy -VssFullBackup`}
    
    Write-Host ""
    Write-Host "System State Backup includes:" -ForegroundColor Yellow
    Write-Host "  - Active Directory (if DC)" -ForegroundColor Gray
    Write-Host "  - Boot files" -ForegroundColor Gray
    Write-Host "  - COM+ registration database" -ForegroundColor Gray
    Write-Host "  - Registry" -ForegroundColor Gray
    Write-Host "  - SYSVOL (if DC)" -ForegroundColor Gray
    Write-Host "  - Certificate Services (if installed)" -ForegroundColor Gray
    
    # Start backup
    Write-Host ""
    Write-Host "Starting backup job..." -ForegroundColor Cyan
    $BackupJob = Start-WBBackup -Policy $Policy
    
    # Monitor progress
    do {
        Start-Sleep -Seconds 10
        $Status = Get-WBJob -Previous 1
        Write-Host "  Status: $($Status.JobState) - $($Status.PercentComplete)% complete" -ForegroundColor Gray
    } while ($Status.JobState -eq 'Running')
    
    # Report result
    if ($Status.JobState -eq 'Completed') {
        Write-Host ""
        Write-Host "✓ System State Backup completed successfully" -ForegroundColor Green
        Write-Host "  Start Time: $($Status.StartTime)" -ForegroundColor Gray
        Write-Host "  End Time: $($Status.EndTime)" -ForegroundColor Gray
        Write-Host "  Destination: ${backupTarget}" -ForegroundColor Gray
    } else {
        Write-Error "Backup job ended with status: $($Status.JobState)"
        Write-Host "Error: $($Status.ErrorDescription)" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Failed to run system state backup: \$_"
}`;
    }
  },

  {
    id: 'ws-run-bmr-backup',
    title: 'Run Bare Metal Recovery Backup',
    description: 'Create a full server backup for bare metal recovery',
    category: 'Windows Server Backup',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates complete bare metal recovery (BMR) backup
- Includes all volumes needed to restore server
- Enables full server recovery to new hardware

**Prerequisites:**
- Windows Server Backup feature installed
- Administrator credentials
- Large backup destination (full server size)
- Backup target available

**What You Need to Provide:**
- Backup destination path
- Volumes to include (or all volumes)

**What the Script Does:**
1. Validates Windows Server Backup installation
2. Creates BMR backup policy
3. Includes all critical volumes
4. Initiates full server backup
5. Reports completion and size

**Important Notes:**
- Essential for disaster recovery
- Largest backup type - plan storage accordingly
- Enables recovery to dissimilar hardware
- Include system reserved partition
- Schedule weekly during maintenance
- Typical use: weekly full server backup
- Combine with incremental backups
- Test recovery to spare hardware`,
    parameters: [
      {
        name: 'backupTarget',
        label: 'Backup Destination',
        type: 'text',
        required: true,
        placeholder: 'E:\\Backups or \\\\SERVER\\BMR',
        helpText: 'Local path or network share for backup'
      },
      {
        name: 'allVolumes',
        label: 'Include All Volumes',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Backup all volumes for complete BMR'
      }
    ],
    scriptTemplate: (params) => {
      const backupTarget = escapePowerShellString(params.backupTarget);
      const allVolumes = params.allVolumes !== false;

      return `# Run Bare Metal Recovery Backup
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Starting Bare Metal Recovery Backup..." -ForegroundColor Cyan
    Write-Host "Destination: ${backupTarget}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠ This backup type includes ALL data required for full server recovery" -ForegroundColor Yellow
    Write-Host "⚠ Ensure sufficient storage space is available" -ForegroundColor Yellow
    
    # Check if Windows Server Backup is installed
    $WsbFeature = Get-WindowsFeature -Name Windows-Server-Backup
    if (-not $WsbFeature.Installed) {
        Write-Host ""
        Write-Host "Installing Windows Server Backup feature..." -ForegroundColor Yellow
        Install-WindowsFeature -Name Windows-Server-Backup -IncludeManagementTools
        Write-Host "✓ Windows Server Backup installed" -ForegroundColor Green
    }
    
    # Add Windows Server Backup snap-in
    Add-PSSnapin Windows.ServerBackup -ErrorAction SilentlyContinue
    
    # Validate backup target
    if (-not (Test-Path "${backupTarget}")) {
        New-Item -Path "${backupTarget}" -ItemType Directory -Force | Out-Null
        Write-Host "✓ Created backup directory" -ForegroundColor Green
    }
    
    # Create backup policy
    Write-Host ""
    Write-Host "Creating BMR backup policy..." -ForegroundColor Cyan
    $Policy = New-WBPolicy
    
    # Add bare metal recovery option
    Add-WBBareMetalRecovery -Policy $Policy
    
    # Add system state (required for BMR)
    Add-WBSystemState -Policy $Policy
    
    # Add volumes
    ${allVolumes ? `
    $AllVolumes = Get-WBVolume -AllVolumes
    Write-Host "Including all volumes:" -ForegroundColor Yellow
    $AllVolumes | ForEach-Object { Write-Host "  - $($_.MountPath)" -ForegroundColor Gray }
    Add-WBVolume -Policy $Policy -Volume $AllVolumes
    ` : `
    $CriticalVolumes = Get-WBVolume -CriticalVolumes
    Write-Host "Including critical volumes only:" -ForegroundColor Yellow
    $CriticalVolumes | ForEach-Object { Write-Host "  - $($_.MountPath)" -ForegroundColor Gray }
    Add-WBVolume -Policy $Policy -Volume $CriticalVolumes
    `}
    
    # Configure backup target
    $BackupLocation = New-WBBackupTarget -VolumePath "${backupTarget}"
    Add-WBBackupTarget -Policy $Policy -Target $BackupLocation
    
    # Set VSS options for consistent backup
    Set-WBVssBackupOption -Policy $Policy -VssCopyBackup
    
    Write-Host ""
    Write-Host "BMR Backup includes:" -ForegroundColor Yellow
    Write-Host "  - System partition" -ForegroundColor Gray
    Write-Host "  - Boot partition" -ForegroundColor Gray
    Write-Host "  - System state" -ForegroundColor Gray
    Write-Host "  - All application data" -ForegroundColor Gray
    Write-Host "  - Recovery partition" -ForegroundColor Gray
    
    # Start backup
    Write-Host ""
    Write-Host "Starting backup job (this may take several hours)..." -ForegroundColor Cyan
    $BackupJob = Start-WBBackup -Policy $Policy
    
    # Monitor progress
    do {
        Start-Sleep -Seconds 30
        $Status = Get-WBJob -Previous 1
        Write-Host "  Status: $($Status.JobState) - $($Status.PercentComplete)% complete" -ForegroundColor Gray
    } while ($Status.JobState -eq 'Running')
    
    # Report result
    if ($Status.JobState -eq 'Completed') {
        Write-Host ""
        Write-Host "✓ Bare Metal Recovery Backup completed successfully" -ForegroundColor Green
        Write-Host "  Start Time: $($Status.StartTime)" -ForegroundColor Gray
        Write-Host "  End Time: $($Status.EndTime)" -ForegroundColor Gray
        Write-Host "  Duration: $(($Status.EndTime - $Status.StartTime).ToString())" -ForegroundColor Gray
        Write-Host "  Destination: ${backupTarget}" -ForegroundColor Gray
        Write-Host ""
        Write-Host "This backup can be used for full server recovery using Windows RE" -ForegroundColor Yellow
    } else {
        Write-Error "Backup job ended with status: $($Status.JobState)"
        Write-Host "Error: $($Status.ErrorDescription)" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Failed to run BMR backup: \$_"
}`;
    }
  },

  {
    id: 'ws-get-backup-history',
    title: 'Get Backup History Report',
    description: 'Generate report of Windows Server Backup job history',
    category: 'Windows Server Backup',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports on recent Windows Server Backup job history
- Shows success, failure, and warning status
- Supports backup monitoring and compliance

**Prerequisites:**
- Windows Server Backup feature installed
- Administrator credentials
- Backup jobs previously executed

**What You Need to Provide:**
- Number of recent backup jobs to report

**What the Script Does:**
1. Queries Windows Server Backup job history
2. Collects job status, duration, and size
3. Reports success and failure counts
4. Shows backup destination details
5. Exports history to CSV if specified

**Important Notes:**
- Essential for backup monitoring
- Identify failed backups immediately
- Track backup duration trends
- Monitor backup size growth
- Verify backup completion daily
- Typical use: daily backup verification
- Investigate any failures immediately
- Document backup success for compliance`,
    parameters: [
      {
        name: 'jobCount',
        label: 'Number of Jobs',
        type: 'number',
        required: false,
        defaultValue: 10,
        helpText: 'Number of recent backup jobs to show'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path (Optional)',
        type: 'text',
        required: false,
        placeholder: 'C:\\Exports\\BackupHistory.csv',
        helpText: 'Optional path to export backup history'
      }
    ],
    scriptTemplate: (params) => {
      const jobCount = params.jobCount || 10;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# Get Backup History Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating Backup History Report..." -ForegroundColor Cyan
    Write-Host "Showing last ${jobCount} backup jobs" -ForegroundColor Gray
    
    # Check if Windows Server Backup is installed
    $WsbFeature = Get-WindowsFeature -Name Windows-Server-Backup
    if (-not $WsbFeature.Installed) {
        Write-Error "Windows Server Backup is not installed"
        exit 1
    }
    
    # Add Windows Server Backup snap-in
    Add-PSSnapin Windows.ServerBackup -ErrorAction SilentlyContinue
    
    # Get backup history
    $BackupSummary = Get-WBSummary
    
    Write-Host ""
    Write-Host "Backup Summary:" -ForegroundColor Cyan
    Write-Host "  Next Scheduled Backup: $($BackupSummary.NextBackupTime)" -ForegroundColor Gray
    Write-Host "  Last Backup Time: $($BackupSummary.LastBackupTime)" -ForegroundColor Gray
    Write-Host "  Last Backup Result: $($BackupSummary.LastBackupResultHR)" -ForegroundColor $(if ($BackupSummary.LastBackupResultHR -eq 0) { 'Green' } else { 'Red' })
    
    # Get detailed job history
    Write-Host ""
    Write-Host "Recent Backup Jobs:" -ForegroundColor Cyan
    
    $Jobs = @()
    for ($i = 1; $i -le ${jobCount}; $i++) {
        $Job = Get-WBJob -Previous $i -ErrorAction SilentlyContinue
        if ($Job) {
            $Jobs += [PSCustomObject]@{
                JobNumber       = $i
                StartTime       = $Job.StartTime
                EndTime         = $Job.EndTime
                Duration        = if ($Job.EndTime -and $Job.StartTime) { ($Job.EndTime - $Job.StartTime).ToString() } else { "N/A" }
                JobState        = $Job.JobState
                PercentComplete = $Job.PercentComplete
                ErrorDescription = $Job.ErrorDescription
            }
            
            $StateColor = switch ($Job.JobState) {
                'Completed' { 'Green' }
                'Failed' { 'Red' }
                'Running' { 'Yellow' }
                default { 'Gray' }
            }
            
            Write-Host ""
            Write-Host "  Job #$i" -ForegroundColor Yellow
            Write-Host "    Start: $($Job.StartTime)" -ForegroundColor Gray
            Write-Host "    End: $($Job.EndTime)" -ForegroundColor Gray
            Write-Host "    Status: $($Job.JobState)" -ForegroundColor $StateColor
            if ($Job.ErrorDescription) {
                Write-Host "    Error: $($Job.ErrorDescription)" -ForegroundColor Red
            }
        }
    }
    
    # Export to CSV if path provided
    ${exportPath ? `
    $Jobs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Backup history exported to: ${exportPath}" -ForegroundColor Green
    ` : ''}
    
    # Summary statistics
    Write-Host ""
    Write-Host "Backup Statistics:" -ForegroundColor Cyan
    $SuccessCount = ($Jobs | Where-Object { $_.JobState -eq 'Completed' }).Count
    $FailedCount = ($Jobs | Where-Object { $_.JobState -eq 'Failed' }).Count
    $TotalCount = $Jobs.Count
    
    Write-Host "  Total Jobs: $TotalCount" -ForegroundColor Gray
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailedCount" -ForegroundColor $(if ($FailedCount -eq 0) { 'Gray' } else { 'Red' })
    
    if ($TotalCount -gt 0) {
        $SuccessRate = [math]::Round(($SuccessCount / $TotalCount) * 100, 1)
        Write-Host "  Success Rate: $SuccessRate%" -ForegroundColor $(if ($SuccessRate -ge 95) { 'Green' } elseif ($SuccessRate -ge 80) { 'Yellow' } else { 'Red' })
    }
    
} catch {
    Write-Error "Failed to get backup history: \$_"
}`;
    }
  },

  // ==================== ADDITIONAL SERVER ROLES TASKS ====================
  {
    id: 'ws-get-role-services',
    title: 'Get Role Services Configuration',
    description: 'Export detailed role services configuration for installed roles',
    category: 'Roles & Features',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports detailed configuration for installed Windows Server roles
- Shows role services, sub-features, and dependencies
- Supports documentation and configuration auditing

**Prerequisites:**
- PowerShell remoting enabled on target server
- Administrator credentials
- Server Manager PowerShell module

**What You Need to Provide:**
- Server name to query
- Specific role name (optional - all roles if not specified)
- Export file path

**What the Script Does:**
1. Queries installed Windows Server roles
2. Collects role services and sub-features
3. Reports dependencies and install state
4. Exports detailed configuration to CSV
5. Shows role service hierarchy

**Important Notes:**
- Essential for role configuration documentation
- Shows all role services and dependencies
- Use for compliance and auditing
- Run after role installation changes
- Document configuration for DR planning
- Typical use: audits, DR documentation
- Compare configurations across servers
- Identify unnecessary role services`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'SERVER01',
        helpText: 'Name of the server to query'
      },
      {
        name: 'roleName',
        label: 'Role Name (Optional)',
        type: 'text',
        required: false,
        placeholder: 'Web-Server',
        helpText: 'Specific role name to query (leave empty for all roles)'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\RoleServices.csv',
        helpText: 'Path for the CSV export file'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const roleName = params.roleName ? escapePowerShellString(params.roleName) : '';
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Get Role Services Configuration
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Querying role services from: ${serverName}" -ForegroundColor Cyan
    ${roleName ? `Write-Host "Role: ${roleName}" -ForegroundColor Gray` : `Write-Host "Querying all installed roles" -ForegroundColor Gray`}
    
    # Get installed features
    ${roleName ? `
    $Features = Get-WindowsFeature -ComputerName "${serverName}" | Where-Object { 
        $_.Name -like "${roleName}*" -and $_.Installed -eq $true 
    }
    ` : `
    $Features = Get-WindowsFeature -ComputerName "${serverName}" | Where-Object { 
        $_.Installed -eq $true 
    }
    `}
    
    Write-Host "Found $($Features.Count) installed features" -ForegroundColor Yellow
    
    # Build detailed report
    $Report = foreach ($Feature in $Features) {
        [PSCustomObject]@{
            Name              = $Feature.Name
            DisplayName       = $Feature.DisplayName
            FeatureType       = $Feature.FeatureType
            Depth             = $Feature.Depth
            Parent            = $Feature.Parent
            SubFeatures       = ($Feature.SubFeatures -join '; ')
            InstallState      = $Feature.InstallState
            DependsOn         = ($Feature.DependsOn -join '; ')
            Path              = $Feature.Path
        }
    }
    
    # Export report
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Role services exported to: ${exportPath}" -ForegroundColor Green
    
    # Display summary by feature type
    Write-Host ""
    Write-Host "Feature Summary:" -ForegroundColor Cyan
    $Features | Group-Object FeatureType | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    # Show role hierarchy
    Write-Host ""
    Write-Host "Role Hierarchy:" -ForegroundColor Cyan
    $RootRoles = $Features | Where-Object { $_.Depth -eq 1 -and $_.FeatureType -eq 'Role' }
    foreach ($Role in $RootRoles) {
        Write-Host "  $($Role.DisplayName)" -ForegroundColor Yellow
        $SubFeatures = $Features | Where-Object { $_.Parent -eq $Role.Name }
        foreach ($Sub in $SubFeatures) {
            Write-Host "    - $($Sub.DisplayName)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Failed to get role services configuration: \$_"
}`;
    }
  },

  {
    id: 'ws-configure-tiered-storage',
    title: 'Configure Tiered Storage',
    description: 'Set up SSD and HDD tiered storage in Storage Spaces',
    category: 'Storage Spaces',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures tiered storage combining SSD and HDD tiers
- Automatically moves frequently accessed data to SSD tier
- Maximizes performance while maintaining capacity

**Prerequisites:**
- Storage Spaces configured
- Mix of SSD and HDD physical disks
- Storage pool with both disk types
- Administrator credentials

**What You Need to Provide:**
- Storage pool name
- Tiered virtual disk name
- Tier sizes for SSD and HDD

**What the Script Does:**
1. Identifies SSD and HDD disks in pool
2. Creates storage tiers for each media type
3. Creates tiered virtual disk
4. Configures automatic tiering
5. Reports tier configuration

**Important Notes:**
- Essential for cost-effective performance
- Hot data moves to SSD tier automatically
- Cold data moves to HDD tier
- Monitor tier utilization over time
- Adjust tier sizes based on workload
- Typical use: file servers, SQL databases
- Review tiering statistics monthly
- Increase SSD tier if overutilized`,
    parameters: [
      {
        name: 'poolName',
        label: 'Storage Pool Name',
        type: 'text',
        required: true,
        placeholder: 'DataPool1',
        helpText: 'Name of the storage pool'
      },
      {
        name: 'vdiskName',
        label: 'Virtual Disk Name',
        type: 'text',
        required: true,
        placeholder: 'TieredDisk1',
        helpText: 'Name for the tiered virtual disk'
      },
      {
        name: 'ssdSizeGB',
        label: 'SSD Tier Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 100,
        helpText: 'Size of the fast SSD tier'
      },
      {
        name: 'hddSizeGB',
        label: 'HDD Tier Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 500,
        helpText: 'Size of the capacity HDD tier'
      },
      {
        name: 'resiliency',
        label: 'Resiliency Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Mirror', label: 'Mirror (Recommended)' },
          { value: 'Simple', label: 'Simple (No redundancy)' }
        ],
        defaultValue: 'Mirror',
        helpText: 'Data protection level'
      }
    ],
    scriptTemplate: (params) => {
      const poolName = escapePowerShellString(params.poolName);
      const vdiskName = escapePowerShellString(params.vdiskName);
      const ssdSizeGB = params.ssdSizeGB || 100;
      const hddSizeGB = params.hddSizeGB || 500;
      const resiliency = params.resiliency || 'Mirror';

      return `# Configure Tiered Storage
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring tiered storage in pool: ${poolName}" -ForegroundColor Cyan
    Write-Host "  Virtual Disk: ${vdiskName}" -ForegroundColor Gray
    Write-Host "  SSD Tier: ${ssdSizeGB} GB" -ForegroundColor Gray
    Write-Host "  HDD Tier: ${hddSizeGB} GB" -ForegroundColor Gray
    Write-Host "  Resiliency: ${resiliency}" -ForegroundColor Gray
    
    # Get storage pool
    $Pool = Get-StoragePool -FriendlyName "${poolName}" -ErrorAction Stop
    Write-Host "✓ Storage pool found" -ForegroundColor Green
    
    # Get physical disks by media type
    $SSDDisks = Get-PhysicalDisk -StoragePool $Pool | Where-Object { $_.MediaType -eq 'SSD' }
    $HDDDisks = Get-PhysicalDisk -StoragePool $Pool | Where-Object { $_.MediaType -eq 'HDD' }
    
    Write-Host ""
    Write-Host "Physical Disk Inventory:" -ForegroundColor Cyan
    Write-Host "  SSD Disks: $($SSDDisks.Count)" -ForegroundColor Yellow
    Write-Host "  HDD Disks: $($HDDDisks.Count)" -ForegroundColor Yellow
    
    if ($SSDDisks.Count -eq 0 -or $HDDDisks.Count -eq 0) {
        Write-Error "Tiered storage requires both SSD and HDD disks in the pool"
        exit 1
    }
    
    # Create storage tiers
    Write-Host ""
    Write-Host "Creating storage tiers..." -ForegroundColor Cyan
    
    $SSDTier = New-StorageTier -StoragePoolFriendlyName "${poolName}" -FriendlyName "${vdiskName}_SSDTier" -MediaType SSD -ResiliencySettingName ${resiliency}
    Write-Host "✓ SSD tier created" -ForegroundColor Green
    
    $HDDTier = New-StorageTier -StoragePoolFriendlyName "${poolName}" -FriendlyName "${vdiskName}_HDDTier" -MediaType HDD -ResiliencySettingName ${resiliency}
    Write-Host "✓ HDD tier created" -ForegroundColor Green
    
    # Create tiered virtual disk
    Write-Host ""
    Write-Host "Creating tiered virtual disk..." -ForegroundColor Cyan
    
    $VDisk = New-VirtualDisk -StoragePoolFriendlyName "${poolName}" -FriendlyName "${vdiskName}" -StorageTiers $SSDTier, $HDDTier -StorageTierSizes ${ssdSizeGB}GB, ${hddSizeGB}GB -WriteCacheSize 1GB
    
    Write-Host "✓ Tiered virtual disk created" -ForegroundColor Green
    
    # Initialize and format
    Write-Host ""
    Write-Host "Initializing and formatting disk..." -ForegroundColor Cyan
    
    $Disk = $VDisk | Get-Disk
    $Disk | Initialize-Disk -PartitionStyle GPT
    $Partition = $Disk | New-Partition -UseMaximumSize -AssignDriveLetter
    $Partition | Format-Volume -FileSystem NTFS -NewFileSystemLabel "${vdiskName}" -Confirm:\$false
    
    Write-Host "✓ Volume formatted and mounted at $($Partition.DriveLetter):" -ForegroundColor Green
    
    # Display configuration
    Write-Host ""
    Write-Host "Tiered Storage Configuration:" -ForegroundColor Cyan
    Write-Host "  Virtual Disk: ${vdiskName}" -ForegroundColor Gray
    Write-Host "  Total Size: $([math]::Round(($VDisk.Size / 1GB), 2)) GB" -ForegroundColor Gray
    Write-Host "  SSD Tier: ${ssdSizeGB} GB (fast tier)" -ForegroundColor Gray
    Write-Host "  HDD Tier: ${hddSizeGB} GB (capacity tier)" -ForegroundColor Gray
    Write-Host "  Write Cache: 1 GB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Storage tiering will automatically move data between tiers based on access patterns" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure tiered storage: \$_"
}`;
    }
  }
];

export const windowsServerCategories = [
  'Server Management',
  'Roles & Features',
  'Event Logs',
  'Services',
  'Storage',
  'Storage Spaces',
  'File Sharing',
  'Security & Networking',
  'Disk Management',
  'Failover Clustering',
  'Remote Desktop Services',
  'Windows Server Backup',
  'Common Admin Tasks'
];
