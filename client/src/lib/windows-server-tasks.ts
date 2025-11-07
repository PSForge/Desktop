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
  }
];

export const windowsServerCategories = [
  'Server Management',
  'Roles & Features',
  'Event Logs',
  'Services',
  'Storage',
  'File Sharing',
  'Security & Networking',
  'Disk Management',
  'Common Admin Tasks'
];
