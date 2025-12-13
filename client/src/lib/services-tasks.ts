import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface ServicesTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface ServicesTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: ServicesTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium?: boolean;
}

export const servicesTasks: ServicesTask[] = [
  {
    id: 'get-service-status',
    name: 'Get Service Status Report',
    category: 'Service Inventory',
    description: 'List Windows services with status, startup type, and account',
    instructions: `**How This Task Works:**
- Generates comprehensive report of all Windows services
- Shows current status, startup configuration, and service account
- Can filter by running or stopped status
- Exports to CSV for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required for basic info)
- WMI access for startup mode and account details

**What You Need to Provide:**
- Status filter: All, Running, or Stopped services
- Optional: CSV export path for saving report

**What the Script Does:**
1. Retrieves services based on status filter
2. Queries WMI for detailed startup and account information
3. Creates structured report with name, display name, status, startup type, and account
4. Displays formatted table in console
5. Optionally exports to CSV file

**Important Notes:**
- Service names are case-insensitive
- Report includes both automatic and manual services
- Typical use: inventory, documentation, troubleshooting
- CSV export useful for Excel analysis
- Shows actual service account (LocalSystem, NetworkService, custom accounts)
- Use this before making service configuration changes`,
    parameters: [
      { id: 'status', label: 'Filter by Status', type: 'select', required: false, options: ['All', 'Running', 'Stopped'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const status = params.status || 'All';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Service Status Report
# Generated: ${new Date().toISOString()}

$Status = "${status}"

if ($Status -eq "All") {
    $Services = Get-Service
} else {
    $Services = Get-Service | Where-Object { $_.Status -eq "$Status" }
}

$Report = $Services | ForEach-Object {
    $WMIService = Get-WmiObject Win32_Service -Filter "Name='$($_.Name)'" -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Name = $_.Name
        DisplayName = $_.DisplayName
        Status = $_.Status
        StartType = $WMIService.StartMode
        Account = $WMIService.StartName
    }
}

$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total services: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'start-service',
    name: 'Start Windows Service',
    category: 'Service Control',
    description: 'Start a stopped Windows service',
    instructions: `**How This Task Works:**
- Starts a single Windows service by name
- Verifies service exists before attempting start
- Checks if already running to avoid errors
- Waits and confirms successful startup

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must be enabled (not disabled)
- Service dependencies must be running

**What You Need to Provide:**
- Service name (not display name, e.g., "Spooler" not "Print Spooler")

**What the Script Does:**
1. Validates service exists on system
2. Checks current service status
3. Skips if already running
4. Starts the service
5. Waits 2 seconds and verifies startup success

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Use exact service name (case-insensitive)
- Find service names with "Get Service Status Report" task
- Service may fail to start if dependencies are stopped
- Typical use: restart failed services, enable disabled features
- Some services require specific accounts or permissions
- Check Event Viewer if service fails to start`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Start Windows Service
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    if ($Service.Status -eq "Running") {
        Write-Host "Service is already running: $ServiceName" -ForegroundColor Yellow
    } else {
        Start-Service -Name $ServiceName
        Write-Host "[SUCCESS] Service started: $ServiceName" -ForegroundColor Green
        
        # Wait and verify
        Start-Sleep -Seconds 2
        $Status = (Get-Service -Name $ServiceName).Status
        Write-Host "  Current status: $Status" -ForegroundColor Gray
    }
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'stop-service',
    name: 'Stop Windows Service',
    category: 'Service Control',
    description: 'Stop a running Windows service',
    instructions: `**How This Task Works:**
- Stops a single Windows service by name
- Can optionally force stop dependent services
- Verifies service exists before attempting stop
- Confirms successful shutdown

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must be running
- Consider impact on dependent services

**What You Need to Provide:**
- Service name (not display name)
- Force option: stops dependent services if enabled

**What the Script Does:**
1. Validates service exists on system
2. Checks current service status
3. Skips if already stopped
4. Stops the service (with or without dependencies)
5. Waits 2 seconds and verifies stop success

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Force option stops ALL dependent services (use with caution)
- Typical use: troubleshooting, maintenance, service conflicts
- Some system services may restart automatically
- Stopping critical services can impact system stability
- Check dependencies before stopping with "Get Service Dependencies" task
- Services set to Automatic may restart on next boot`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' },
      { id: 'force', label: 'Force Stop (Kill Dependent Services)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const force = toPowerShellBoolean(params.force ?? false);
      
      return `# Stop Windows Service
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Force = ${force}

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    if ($Service.Status -eq "Stopped") {
        Write-Host "Service is already stopped: $ServiceName" -ForegroundColor Yellow
    } else {
        if ($Force) {
            Stop-Service -Name $ServiceName -Force
        } else {
            Stop-Service -Name $ServiceName
        }
        
        Write-Host "[SUCCESS] Service stopped: $ServiceName" -ForegroundColor Green
        
        # Wait and verify
        Start-Sleep -Seconds 2
        $Status = (Get-Service -Name $ServiceName).Status
        Write-Host "  Current status: $Status" -ForegroundColor Gray
    }
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'restart-service',
    name: 'Restart Windows Service',
    category: 'Service Control',
    description: 'Restart a Windows service (stop and start)',
    instructions: `**How This Task Works:**
- Restarts service by stopping and starting it
- Forces restart even if service is already stopped
- Waits and verifies service returns to running state
- Essential for applying configuration changes

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must be enabled (not disabled)
- Service dependencies must be running

**What You Need to Provide:**
- Service name (not display name)

**What the Script Does:**
1. Validates service exists on system
2. Stops the service if running
3. Starts the service again
4. Waits 3 seconds for stabilization
5. Verifies service is running

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Always forces restart (even dependent services)
- Typical use: apply config changes, resolve hung services
- Brief service interruption expected (3-5 seconds)
- Some services may take longer to restart
- Check Event Viewer if restart fails
- Configuration changes often require restart to take effect`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Restart Windows Service
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    Write-Host "Restarting service: $ServiceName" -ForegroundColor Cyan
    
    Restart-Service -Name $ServiceName -Force
    
    # Wait and verify
    Start-Sleep -Seconds 3
    $Status = (Get-Service -Name $ServiceName).Status
    
    if ($Status -eq "Running") {
        Write-Host "[SUCCESS] Service restarted successfully" -ForegroundColor Green
        Write-Host "  Current status: $Status" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] Service restart completed but status is: $Status" -ForegroundColor Yellow
    }
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-service-startup',
    name: 'Set Service Startup Type',
    category: 'Startup Configuration',
    description: 'Change service startup type (Automatic, Manual, Disabled)',
    instructions: `**How This Task Works:**
- Changes when and how a service starts
- Configures service to start automatically, manually, or never
- Does not affect currently running services
- Essential for service optimization and security

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system

**What You Need to Provide:**
- Service name (not display name)
- Startup type: Automatic, Manual, or Disabled

**What the Script Does:**
1. Validates service exists on system
2. Changes startup type configuration
3. Verifies new startup type is applied
4. Reports current startup mode

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Automatic: starts at boot automatically
- Manual: starts only when triggered by user/application
- Disabled: prevents service from starting at all
- Change does NOT stop/start running services
- Typical use: optimize boot time, disable unused services, security hardening
- Some services are critical and should not be disabled
- Use "Get Stopped Auto Services" task to find services that should be running`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' },
      { id: 'startupType', label: 'Startup Type', type: 'select', required: true, options: ['Automatic', 'Manual', 'Disabled'], defaultValue: 'Manual' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const startupType = params.startupType;
      
      return `# Set Service Startup Type
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$StartupType = "${startupType}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    Set-Service -Name $ServiceName -StartupType $StartupType
    Write-Host "[SUCCESS] Startup type set to $StartupType for $ServiceName" -ForegroundColor Green
    
    # Verify
    $WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"
    Write-Host "  Current startup type: $($WMIService.StartMode)" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-service-account',
    name: 'Set Service Logon Account',
    category: 'Service Accounts',
    description: 'Change the account a service runs under',
    instructions: `**How This Task Works:**
- Changes the security context a service runs under
- Supports built-in accounts or custom domain/local accounts
- Critical for service permissions and security
- Requires service restart to take effect

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system
- Custom account must have "Log on as a service" right

**What You Need to Provide:**
- Service name (not display name)
- Account type: LocalSystem, NetworkService, LocalService, or Custom
- If Custom: account name (DOMAIN\\User) and password

**What the Script Does:**
1. Validates service exists on system
2. Configures service to run under specified account
3. Sets password if custom account selected
4. Verifies account change applied
5. Displays current service account

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- LocalSystem: most privileges, use for system services only
- NetworkService: network access with computer account credentials
- LocalService: limited privileges, no network access
- Custom: specific user account with custom permissions
- Service MUST BE RESTARTED after account change
- Custom accounts need "Log on as a service" right in Local Security Policy
- Typical use: security hardening, grant specific permissions, domain service accounts`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'account', label: 'Account', type: 'select', required: true, options: ['LocalSystem', 'NetworkService', 'LocalService', 'Custom'], defaultValue: 'NetworkService' },
      { id: 'customAccount', label: 'Custom Account (if Custom selected)', type: 'text', required: false, placeholder: 'DOMAIN\\ServiceAccount' },
      { id: 'password', label: 'Password (if Custom selected)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const account = params.account;
      const customAccount = params.customAccount ? escapePowerShellString(params.customAccount) : '';
      const password = params.password ? escapePowerShellString(params.password) : '';
      
      return `# Set Service Logon Account
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Account = "${account}"

if ($Account -eq "LocalSystem") {
    $Credential = "LocalSystem"
} elseif ($Account -eq "NetworkService") {
    $Credential = "NT AUTHORITY\\NetworkService"
} elseif ($Account -eq "LocalService") {
    $Credential = "NT AUTHORITY\\LocalService"
} elseif ($Account -eq "Custom") {
    $Credential = "${customAccount}"
    ${password ? `$Password = "${password}"` : `$Password = ""`}
} else {
    Write-Host "[FAILED] Invalid account type" -ForegroundColor Red
    exit 1
}

$Service = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"

if ($Service) {
    if ($Account -eq "Custom" -and $Password) {
        $Service.Change($null, $null, $null, $null, $null, $null, $Credential, $Password)
    } else {
        $Service.Change($null, $null, $null, $null, $null, $null, $Credential, $null)
    }
    
    Write-Host "[SUCCESS] Service account changed:" -ForegroundColor Green
    Write-Host "  Service: $ServiceName" -ForegroundColor Gray
    Write-Host "  Account: $Credential" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Restart service for changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-service-dependencies',
    name: 'Get Service Dependencies',
    category: 'Service Dependencies',
    description: 'List services that depend on or are required by a service',
    instructions: `**How This Task Works:**
- Shows bidirectional service dependency relationships
- Lists services this service requires to function
- Lists services that require this service to function
- Essential before stopping or modifying services

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Service must exist on system

**What You Need to Provide:**
- Service name (not display name)

**What the Script Does:**
1. Validates service exists on system
2. Retrieves services this service depends on (required for startup)
3. Retrieves services that depend on this service (will be affected if stopped)
4. Displays both dependency lists with status
5. Reports if no dependencies exist

**Important Notes:**
- Dependencies are critical for service operation
- Stopping a service may stop dependent services too
- Starting a service requires its dependencies to be running
- Typical use: troubleshooting startup failures, planning maintenance
- Use before bulk service operations
- Circular dependencies can exist in complex systems
- Some services have hidden dependencies not shown here`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Get Service Dependencies
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    Write-Host "Service: $($Service.DisplayName)" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Services this service DEPENDS ON:" -ForegroundColor Yellow
    if ($Service.ServicesDependedOn.Count -gt 0) {
        $Service.ServicesDependedOn | Select-Object Name, DisplayName, Status | Format-Table -AutoSize
    } else {
        Write-Host "  (None)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Services that DEPEND ON this service:" -ForegroundColor Yellow
    if ($Service.DependentServices.Count -gt 0) {
        $Service.DependentServices | Select-Object Name, DisplayName, Status | Format-Table -AutoSize
    } else {
        Write-Host "  (None)" -ForegroundColor Gray
    }
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-service-recovery',
    name: 'Set Service Recovery Options',
    category: 'Recovery & Failover',
    description: 'Configure service failure recovery actions',
    instructions: `**How This Task Works:**
- Configures automatic actions when service fails
- Sets different actions for first, second, and subsequent failures
- Enables service self-healing and high availability
- Uses Windows Service Control Manager (SCM) recovery features

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system
- sc.exe utility (built into Windows)

**What You Need to Provide:**
- Service name (not display name)
- First failure action: Restart, Reboot, or None
- Second failure action: Restart, Reboot, or None
- Subsequent failures action: Restart, Reboot, or None

**What the Script Does:**
1. Validates service exists on system
2. Configures recovery actions using sc.exe
3. Sets 60-second delay before restart actions
4. Sets 24-hour reset period for failure counter
5. Reports configured recovery actions

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Restart: automatically restarts service after 60 seconds
- Reboot: restarts entire computer (use with extreme caution)
- None: no automatic action taken
- Typical use: critical service high availability, unattended servers
- Failure counter resets after 24 hours without failures
- Consider impact of Reboot action on production systems
- Does not prevent failures, only responds to them`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'firstFailure', label: 'First Failure Action', type: 'select', required: true, options: ['Restart', 'Reboot', 'None'], defaultValue: 'Restart' },
      { id: 'secondFailure', label: 'Second Failure Action', type: 'select', required: true, options: ['Restart', 'Reboot', 'None'], defaultValue: 'Restart' },
      { id: 'subsequentFailures', label: 'Subsequent Failures', type: 'select', required: true, options: ['Restart', 'Reboot', 'None'], defaultValue: 'Restart' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const first = params.firstFailure.toLowerCase();
      const second = params.secondFailure.toLowerCase();
      const subsequent = params.subsequentFailures.toLowerCase();
      
      return `# Set Service Recovery Options
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    # Use sc.exe to configure recovery
    sc.exe failure $ServiceName reset= 86400 actions= ${first}/60000/${second}/60000/${subsequent}/60000
    
    Write-Host "[SUCCESS] Service recovery actions configured:" -ForegroundColor Green
    Write-Host "  Service: $ServiceName" -ForegroundColor Gray
    Write-Host "  First failure: ${params.firstFailure}" -ForegroundColor Gray
    Write-Host "  Second failure: ${params.secondFailure}" -ForegroundColor Gray
    Write-Host "  Subsequent failures: ${params.subsequentFailures}" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'bulk-start-services',
    name: 'Bulk Start Services (by Pattern)',
    category: 'Service Control',
    description: 'Start multiple services matching a name pattern',
    instructions: `**How This Task Works:**
- Starts multiple services using wildcard pattern matching
- Filters to only stopped services
- Test mode allows preview before actual execution
- Efficient for managing service groups

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Services must exist and be enabled
- Service dependencies must be running

**What You Need to Provide:**
- Service name pattern with wildcards (e.g., "Windows*", "*Update*")
- Test mode: true to preview, false to execute

**What the Script Does:**
1. Finds stopped services matching pattern
2. Displays list of matching services
3. In test mode: shows services without starting
4. In execution mode: starts each service individually
5. Reports success/failure for each service

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Test mode enabled by default for safety
- Wildcard patterns: * matches any characters
- Typical use: start application service groups, post-maintenance startup
- Services start sequentially, not simultaneously
- Individual failures reported but don't stop bulk operation
- Disable test mode to actually start services
- Review pattern matches in test mode first`,
    parameters: [
      { id: 'pattern', label: 'Service Name Pattern', type: 'text', required: true, placeholder: 'Windows*' },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const pattern = escapePowerShellString(params.pattern);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Bulk Start Services
# Generated: ${new Date().toISOString()}

$Pattern = "${pattern}"
$TestMode = ${testMode}

$Services = Get-Service -Name $Pattern -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Stopped' }

if ($Services) {
    Write-Host "Found $($Services.Count) stopped service(s) matching '$Pattern':" -ForegroundColor Yellow
    $Services | Select-Object Name, DisplayName | Format-Table -AutoSize
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "[WARNING] TEST MODE - No services started" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Starting services..." -ForegroundColor Cyan
        foreach ($Service in $Services) {
            try {
                Start-Service -Name $Service.Name -ErrorAction Stop
                Write-Host "  [OK] $($Service.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  [FAILED] $($Service.Name): $_" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "No stopped services found matching '$Pattern'" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'bulk-stop-services',
    name: 'Bulk Stop Services (by Pattern)',
    category: 'Service Control',
    description: 'Stop multiple services matching a name pattern',
    instructions: `**How This Task Works:**
- Stops multiple services using wildcard pattern matching
- Filters to only running services
- Test mode allows preview before actual execution
- Forces stop to handle dependent services

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Services must exist on system
- Consider impact on dependent services

**What You Need to Provide:**
- Service name pattern with wildcards (e.g., "Windows*", "*SQL*")
- Test mode: true to preview, false to execute

**What the Script Does:**
1. Finds running services matching pattern
2. Displays list of matching services
3. In test mode: shows services without stopping
4. In execution mode: force stops each service individually
5. Reports success/failure for each service

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Test mode enabled by default for safety
- Force stops ALL matching services and dependencies
- Typical use: shut down application service groups, maintenance prep
- Services stop sequentially, not simultaneously
- Individual failures reported but don't stop bulk operation
- REVIEW pattern matches in test mode before disabling test mode
- Stopping critical services can impact system stability`,
    parameters: [
      { id: 'pattern', label: 'Service Name Pattern', type: 'text', required: true, placeholder: 'Windows*' },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const pattern = escapePowerShellString(params.pattern);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Bulk Stop Services
# Generated: ${new Date().toISOString()}

$Pattern = "${pattern}"
$TestMode = ${testMode}

$Services = Get-Service -Name $Pattern -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }

if ($Services) {
    Write-Host "Found $($Services.Count) running service(s) matching '$Pattern':" -ForegroundColor Yellow
    $Services | Select-Object Name, DisplayName | Format-Table -AutoSize
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "[WARNING] TEST MODE - No services stopped" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "[WARNING] WARNING: Stopping services..." -ForegroundColor Red
        foreach ($Service in $Services) {
            try {
                Stop-Service -Name $Service.Name -Force -ErrorAction Stop
                Write-Host "  [OK] $($Service.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  [FAILED] $($Service.Name): $_" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "No running services found matching '$Pattern'" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'export-service-config',
    name: 'Export Service Configuration',
    category: 'Backup & Documentation',
    description: 'Export service configuration for backup or documentation',
    instructions: `**How This Task Works:**
- Exports complete service configuration to CSV file
- Captures all service details for documentation or backup
- Useful for disaster recovery and compliance
- Can be imported into Excel for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Write permissions on export destination
- WMI access for service details

**What You Need to Provide:**
- Export file path with .csv extension

**What the Script Does:**
1. Queries WMI for all services on system
2. Retrieves name, display name, state, startup mode, account, path, and description
3. Exports to CSV file with headers
4. Reports total service count

**Important Notes:**
- No administrator privileges required
- Exports ALL services on system
- CSV format compatible with Excel, documentation tools
- Typical use: documentation, compliance audits, disaster recovery planning
- Compare exports before/after changes to track configuration drift
- Includes service executable paths and descriptions
- Service account names visible (passwords not included)`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Backups\\Services.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Service Configuration
# Generated: ${new Date().toISOString()}

$ExportPath = "${exportPath}"

Write-Host "Exporting service configuration..." -ForegroundColor Cyan

$Services = Get-WmiObject Win32_Service | Select-Object Name, DisplayName, State, StartMode, StartName, PathName, Description

$Services | Export-Csv $ExportPath -NoTypeInformation

Write-Host "[SUCCESS] Service configuration exported:" -ForegroundColor Green
Write-Host "  File: $ExportPath" -ForegroundColor Gray
Write-Host "  Total services: $($Services.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-stopped-auto-services',
    name: 'Get Stopped Automatic Services',
    category: 'Service Health',
    description: 'Report services set to Automatic that are currently stopped',
    instructions: `**How This Task Works:**
- Identifies services that should be running but aren't
- Checks for automatic services in stopped state
- Essential health check for system reliability
- No parameters required - fully automated

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- WMI access for service details

**What You Need to Provide:**
- Nothing - fully automated scan

**What the Script Does:**
1. Queries WMI for all services on system
2. Filters to services with Automatic startup type
3. Identifies services not in Running state
4. Displays table of stopped automatic services
5. Reports count of issues found

**Important Notes:**
- No administrator privileges required
- Services set to Automatic should always be running
- Stopped automatic services may indicate problems
- Typical use: health monitoring, troubleshooting, compliance checks
- Run after system startup to verify all services started
- Some services fail to start due to missing dependencies
- Check Event Viewer for service failure reasons
- Use "Start Service" task to manually start stopped services`,
    parameters: [],
    scriptTemplate: () => {
      return `# Get Stopped Automatic Services
# Generated: ${new Date().toISOString()}

Write-Host "Checking for stopped automatic services..." -ForegroundColor Cyan

$StoppedAuto = Get-WmiObject Win32_Service | Where-Object { 
    $_.StartMode -eq 'Auto' -and $_.State -ne 'Running' 
} | Select-Object Name, DisplayName, State, StartMode

if ($StoppedAuto) {
    Write-Host ""
    Write-Host "[WARNING] Found $($StoppedAuto.Count) stopped automatic service(s):" -ForegroundColor Yellow
    $StoppedAuto | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "These services may need attention" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] All automatic services are running" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'disable-unnecessary-services',
    name: 'Disable Unnecessary Services (Security Hardening)',
    category: 'Security Hardening',
    description: 'Disable common unnecessary services for security hardening',
    instructions: `**How This Task Works:**
- Disables commonly unnecessary services for security
- Reduces attack surface by stopping unused services
- Test mode shows what would be disabled before executing
- Based on security hardening best practices

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Understanding of impact on system functionality
- Backup or documentation of current state recommended

**What You Need to Provide:**
- Test mode: true to preview, false to execute

**What the Script Does:**
1. Defines list of commonly disabled services (RemoteRegistry, RemoteAccess, SSDP, UPnP, Error Reporting, Search)
2. Checks each service status and startup mode
3. In test mode: shows which services would be disabled
4. In execution mode: disables and stops each service
5. Reports action taken for each service

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Test mode enabled by default for safety
- Services disabled: RemoteRegistry, RemoteAccess, SSDP Discovery, UPnP, Windows Error Reporting, Windows Search
- Typical use: security hardening, reduce attack surface, compliance
- Disabling services may impact some features
- Windows Search disable affects file search performance
- REVIEW list before disabling test mode
- Can re-enable services if needed with "Set Service Startup" task`,
    parameters: [
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Disable Unnecessary Services
# Generated: ${new Date().toISOString()}

$TestMode = ${testMode}

# List of commonly disabled services for security hardening
$ServicesToDisable = @(
    "RemoteRegistry",
    "RemoteAccess",
    "SSDPSRV",  # SSDP Discovery
    "upnphost",  # UPnP Device Host
    "WerSvc",  # Windows Error Reporting
    "WSearch"  # Windows Search (optional)
)

Write-Host "Security Hardening: Disabling unnecessary services" -ForegroundColor Cyan
Write-Host ""

foreach ($ServiceName in $ServicesToDisable) {
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    if ($Service) {
        $WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"
        
        if ($WMIService.StartMode -ne "Disabled") {
            if ($TestMode) {
                Write-Host "  [TEST] Would disable: $($Service.DisplayName)" -ForegroundColor Yellow
            } else {
                Set-Service -Name $ServiceName -StartupType Disabled
                Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
                Write-Host "  [OK] Disabled: $($Service.DisplayName)" -ForegroundColor Green
            }
        } else {
            Write-Host "  Already disabled: $($Service.DisplayName)" -ForegroundColor Gray
        }
    }
}

${testMode ? `Write-Host ""
Write-Host "[WARNING] TEST MODE - No services were actually disabled" -ForegroundColor Yellow` : `Write-Host ""
Write-Host "[SUCCESS] Security hardening complete" -ForegroundColor Green`}`;
    }
  },

  {
    id: 'monitor-service-failures',
    name: 'Monitor Service Failures (Event Log)',
    category: 'Service Health',
    description: 'Report service crash/failure events from System event log',
    instructions: `**How This Task Works:**
- Scans Windows System Event Log for service crash events
- Identifies unexpected service terminations
- Reports service failures within specified timeframe
- Essential for monitoring service health and reliability

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required for reading logs)
- Windows Event Log service must be running
- Event log access permissions

**What You Need to Provide:**
- Hours back to search (default: 24 hours)

**What the Script Does:**
1. Calculates search timeframe from current time
2. Queries System Event Log for service crash events (Event IDs 7034, 7031)
3. Event ID 7034: service crashed unexpectedly
4. Event ID 7031: service terminated unexpectedly
5. Displays each failure event with timestamp and message

**Important Notes:**
- No administrator privileges required
- Event ID 7034: service process terminated unexpectedly
- Event ID 7031: service terminated and needs to restart
- Typical use: proactive monitoring, troubleshooting, root cause analysis
- Check results regularly for early warning of service issues
- Events persist based on Event Log retention settings
- Use with "Set Service Recovery" task to auto-restart failed services
- Review Event Viewer Application log for additional service details`,
    parameters: [
      { id: 'hours', label: 'Hours Back', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const hours = Number(params.hours || 24);
      
      return `# Monitor Service Failures
# Generated: ${new Date().toISOString()}

$Hours = ${hours}
$StartTime = (Get-Date).AddHours(-$Hours)

Write-Host "Checking for service failures (last $Hours hours)..." -ForegroundColor Cyan

# Event ID 7034 = Service crashed unexpectedly
# Event ID 7031 = Service terminated unexpectedly
$Events = Get-WinEvent -FilterHashtable @{LogName='System'; ID=7034,7031; StartTime=$StartTime} -ErrorAction SilentlyContinue

if ($Events) {
    Write-Host ""
    Write-Host "[WARNING] Found $($Events.Count) service failure event(s):" -ForegroundColor Red
    
    $Events | ForEach-Object {
        Write-Host ""
        Write-Host "  Time: $($_.TimeCreated)" -ForegroundColor Yellow
        Write-Host "  $($_.Message.Substring(0, [Math]::Min(200, $_.Message.Length)))" -ForegroundColor Gray
    }
} else {
    Write-Host "[SUCCESS] No service failures detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'set-service-dependencies',
    name: 'Set Service Dependencies',
    category: 'Service Dependencies',
    description: 'Configure which services must start before this service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures service startup dependencies
- Ensures required services start first
- Uses sc.exe to modify dependency chain
- Critical for proper service startup order

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system
- Dependency services must exist

**What You Need to Provide:**
- Service name to configure
- Comma-separated list of dependency service names

**What the Script Does:**
1. Validates target service exists
2. Validates all dependency services exist
3. Configures dependency chain using sc.exe
4. Verifies dependencies applied
5. Reports new dependency configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Service will not start if dependencies are stopped
- Circular dependencies cause startup failures
- Use "Get Service Dependencies" to view current dependencies
- Typical use: custom applications, multi-tier services
- Changes take effect on next service start
- Be careful not to create dependency loops`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'dependencies', label: 'Dependency Services (comma-separated)', type: 'text', required: true, placeholder: 'LanmanWorkstation,RpcSs' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const dependencies = escapePowerShellString(params.dependencies);
      
      return `# Set Service Dependencies
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Dependencies = "${dependencies}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

# Validate all dependency services exist
$DepList = $Dependencies -split ',' | ForEach-Object { $_.Trim() }
$InvalidDeps = @()

foreach ($Dep in $DepList) {
    $DepService = Get-Service -Name $Dep -ErrorAction SilentlyContinue
    if (-not $DepService) {
        $InvalidDeps += $Dep
    }
}

if ($InvalidDeps.Count -gt 0) {
    Write-Host "[FAILED] Invalid dependency service(s): $($InvalidDeps -join ', ')" -ForegroundColor Red
    exit 1
}

# Configure dependencies using sc.exe
$DepString = $DepList -join '/'
sc.exe config $ServiceName depend= $DepString

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Dependencies configured for $ServiceName" -ForegroundColor Green
    Write-Host "  Dependencies: $Dependencies" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] Restart service for changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host "[FAILED] Failed to configure dependencies" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'audit-service-accounts',
    name: 'Audit Service Accounts',
    category: 'Service Accounts',
    description: 'Generate report of all service accounts and their usage',
    isPremium: true,
    instructions: `**How This Task Works:**
- Audits all Windows services for account usage
- Identifies services running under non-standard accounts
- Highlights potential security concerns
- Exports comprehensive audit report

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for basic audit
- Administrator for complete account details
- WMI access required

**What You Need to Provide:**
- Whether to show only non-standard accounts
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all Windows services
2. Extracts service account information
3. Categorizes accounts (LocalSystem, NetworkService, custom)
4. Identifies unusual or risky configurations
5. Generates formatted audit report
6. Optionally exports to CSV

**Important Notes:**
- Custom domain accounts may indicate security risks if over-privileged
- LocalSystem is most privileged (potential security concern)
- NetworkService is preferred for network access
- Typical use: security audits, compliance reporting
- Review custom accounts for proper access rights
- Consider reducing LocalSystem usage where possible`,
    parameters: [
      { id: 'nonStandardOnly', label: 'Show Only Non-Standard Accounts', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const nonStandardOnly = toPowerShellBoolean(params.nonStandardOnly ?? false);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Audit Service Accounts
# Generated: ${new Date().toISOString()}

$NonStandardOnly = ${nonStandardOnly}

Write-Host "Auditing service accounts..." -ForegroundColor Cyan

$Services = Get-WmiObject Win32_Service | ForEach-Object {
    $AccountType = switch ($_.StartName) {
        "LocalSystem" { "LocalSystem (High Privilege)" }
        "NT AUTHORITY\\LocalService" { "LocalService (Low Privilege)" }
        "NT AUTHORITY\\NetworkService" { "NetworkService (Network Access)" }
        "NT AUTHORITY\\SYSTEM" { "LocalSystem (High Privilege)" }
        $null { "Unknown" }
        default { "Custom Account" }
    }
    
    [PSCustomObject]@{
        ServiceName = $_.Name
        DisplayName = $_.DisplayName
        Account = $_.StartName
        AccountType = $AccountType
        Status = $_.State
        StartMode = $_.StartMode
    }
}

if ($NonStandardOnly) {
    $Services = $Services | Where-Object { 
        $_.AccountType -eq "Custom Account" -or $_.Account -eq $null 
    }
}

# Display summary
$GroupedAccounts = $Services | Group-Object AccountType | Sort-Object Count -Descending

Write-Host ""
Write-Host "Account Usage Summary:" -ForegroundColor Yellow
$GroupedAccounts | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) services" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Service Details:" -ForegroundColor Yellow
$Services | Format-Table ServiceName, Account, AccountType, Status -AutoSize

${exportPath ? `$Services | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'reset-service-account-password',
    name: 'Reset Service Account Password',
    category: 'Service Accounts',
    description: 'Update password for a service running under custom account',
    isPremium: true,
    instructions: `**How This Task Works:**
- Updates the password for a service account
- Applies to services running under custom domain/local accounts
- Does not change passwords for built-in accounts
- Requires service restart to apply

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must run under custom account
- New password must meet complexity requirements

**What You Need to Provide:**
- Service name
- New password for the service account

**What the Script Does:**
1. Validates service exists
2. Confirms service uses custom account
3. Updates service credential with new password
4. Verifies password change was successful
5. Prompts for service restart

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Does NOT change the domain/local account password itself
- Only updates the stored credential for this service
- Service MUST be restarted after password change
- Typical use: password rotation, security updates
- If password is wrong, service will fail to start
- Test in non-production environment first`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'newPassword', label: 'New Password', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const newPassword = escapePowerShellString(params.newPassword);
      
      return `# Reset Service Account Password
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$NewPassword = "${newPassword}"

$Service = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

# Check if using custom account
$BuiltInAccounts = @("LocalSystem", "NT AUTHORITY\\LocalService", "NT AUTHORITY\\NetworkService", "NT AUTHORITY\\SYSTEM")
if ($BuiltInAccounts -contains $Service.StartName) {
    Write-Host "[FAILED] Service uses built-in account: $($Service.StartName)" -ForegroundColor Red
    Write-Host "  Cannot reset password for built-in accounts" -ForegroundColor Yellow
    exit 1
}

Write-Host "Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Account: $($Service.StartName)" -ForegroundColor Gray

# Update the password
$Result = $Service.Change($null, $null, $null, $null, $null, $null, $null, $NewPassword)

if ($Result.ReturnValue -eq 0) {
    Write-Host "[SUCCESS] Password updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "[WARNING] IMPORTANT: Restart the service for changes to take effect" -ForegroundColor Yellow
    Write-Host "  Run: Restart-Service -Name $ServiceName -Force" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Failed to update password. Error code: $($Result.ReturnValue)" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-service-health-report',
    name: 'Service Health Report',
    category: 'Service Health',
    description: 'Generate comprehensive service health status report',
    isPremium: true,
    instructions: `**How This Task Works:**
- Generates detailed health report for all services
- Identifies unhealthy states and potential issues
- Checks startup configuration against current state
- Highlights services requiring attention

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- WMI access for extended details

**What You Need to Provide:**
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all Windows services
2. Identifies services in unexpected states
3. Checks for auto-start services that are stopped
4. Reports services with recent failures
5. Calculates overall health score
6. Generates prioritized action items

**Important Notes:**
- No administrator privileges required for report
- Auto-start services should normally be running
- Stopped auto-start services may indicate problems
- Typical use: daily health checks, monitoring
- Use with scheduled tasks for automated monitoring
- Check Event Viewer for failure root causes`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Service Health Report
# Generated: ${new Date().toISOString()}

Write-Host "Generating Service Health Report..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$Services = Get-WmiObject Win32_Service

# Calculate statistics
$TotalServices = $Services.Count
$RunningServices = ($Services | Where-Object { $_.State -eq "Running" }).Count
$StoppedServices = ($Services | Where-Object { $_.State -eq "Stopped" }).Count
$AutoServices = ($Services | Where-Object { $_.StartMode -eq "Auto" }).Count
$StoppedAutoServices = $Services | Where-Object { $_.StartMode -eq "Auto" -and $_.State -eq "Stopped" }

# Health Score (100 = perfect)
$HealthScore = 100
if ($StoppedAutoServices.Count -gt 0) {
    $HealthScore -= [Math]::Min(50, $StoppedAutoServices.Count * 5)
}

Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host "  Total Services: $TotalServices" -ForegroundColor Gray
Write-Host "  Running: $RunningServices" -ForegroundColor Green
Write-Host "  Stopped: $StoppedServices" -ForegroundColor Gray
Write-Host "  Auto-Start: $AutoServices" -ForegroundColor Gray
Write-Host ""

if ($HealthScore -ge 90) {
    Write-Host "  Health Score: $HealthScore% (Excellent)" -ForegroundColor Green
} elseif ($HealthScore -ge 70) {
    Write-Host "  Health Score: $HealthScore% (Good)" -ForegroundColor Yellow
} else {
    Write-Host "  Health Score: $HealthScore% (Needs Attention)" -ForegroundColor Red
}

Write-Host ""

if ($StoppedAutoServices.Count -gt 0) {
    Write-Host "[WARNING] AUTO-START SERVICES THAT ARE STOPPED:" -ForegroundColor Red
    $StoppedAutoServices | ForEach-Object {
        Write-Host "  - $($_.DisplayName) ($($_.Name))" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Build detailed report
$Report = $Services | ForEach-Object {
    $Health = if ($_.StartMode -eq "Auto" -and $_.State -ne "Running") { "Warning" } else { "OK" }
    [PSCustomObject]@{
        Name = $_.Name
        DisplayName = $_.DisplayName
        Status = $_.State
        StartMode = $_.StartMode
        Account = $_.StartName
        Health = $Health
    }
}

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Full report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-failed-services-report',
    name: 'Failed Services Report',
    category: 'Service Health',
    description: 'Generate detailed report of services with recent failures',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes Windows Event Log for service failures
- Groups failures by service name
- Shows failure frequency and patterns
- Helps identify problematic services

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Windows Event Log access
- System Event Log retention

**What You Need to Provide:**
- Days back to analyze (default: 7)
- Optional: CSV export path

**What the Script Does:**
1. Queries System Event Log for service failures
2. Extracts service names from event messages
3. Groups and counts failures per service
4. Sorts by failure frequency
5. Displays failure timeline
6. Identifies repeat offenders

**Important Notes:**
- Requires Event Log read access
- Event IDs analyzed: 7034, 7031, 7023, 7024
- Repeat failures indicate systemic issues
- Typical use: incident investigation, reliability analysis
- Correlate with application logs for root cause
- Consider recovery options for frequently failing services`,
    parameters: [
      { id: 'daysBack', label: 'Days Back to Analyze', type: 'number', required: false, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const daysBack = Number(params.daysBack || 7);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Failed Services Report
# Generated: ${new Date().toISOString()}

$DaysBack = ${daysBack}
$StartTime = (Get-Date).AddDays(-$DaysBack)

Write-Host "Analyzing service failures (last $DaysBack days)..." -ForegroundColor Cyan
Write-Host ""

# Query relevant event IDs
# 7034 = Service crashed unexpectedly
# 7031 = Service terminated unexpectedly  
# 7023 = Service terminated with error
# 7024 = Service terminated with service-specific error
$Events = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ID = 7034, 7031, 7023, 7024
    StartTime = $StartTime
} -ErrorAction SilentlyContinue

if (-not $Events -or $Events.Count -eq 0) {
    Write-Host "[SUCCESS] No service failures found in the last $DaysBack days" -ForegroundColor Green
    exit 0
}

Write-Host "[WARNING] Found $($Events.Count) service failure event(s)" -ForegroundColor Yellow
Write-Host ""

# Group by service (extract from message)
$FailureReport = $Events | ForEach-Object {
    # Try to extract service name from message
    $ServiceMatch = $_.Message -match "The (.+?) service"
    $ServiceName = if ($ServiceMatch) { $Matches[1] } else { "Unknown" }
    
    [PSCustomObject]@{
        ServiceName = $ServiceName
        TimeCreated = $_.TimeCreated
        EventId = $_.Id
        Message = $_.Message.Substring(0, [Math]::Min(150, $_.Message.Length))
    }
}

# Summary by service
$Summary = $FailureReport | Group-Object ServiceName | Sort-Object Count -Descending | ForEach-Object {
    [PSCustomObject]@{
        ServiceName = $_.Name
        FailureCount = $_.Count
        LastFailure = ($_.Group | Sort-Object TimeCreated -Descending | Select-Object -First 1).TimeCreated
    }
}

Write-Host "FAILURE SUMMARY BY SERVICE:" -ForegroundColor Yellow
$Summary | Format-Table ServiceName, FailureCount, LastFailure -AutoSize

Write-Host ""
Write-Host "TOP REPEAT OFFENDERS:" -ForegroundColor Red
$Summary | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $($_.ServiceName): $($_.FailureCount) failures" -ForegroundColor Yellow
}

${exportPath ? `$FailureReport | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Detailed report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'restart-hung-services',
    name: 'Restart Hung Services',
    category: 'Service Health',
    description: 'Detect and restart services stuck in pending states',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies services stuck in transitional states
- Detects StartPending, StopPending, and other hung states
- Forcefully restarts stuck services
- Essential for automated recovery

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- SC.exe utility (built into Windows)

**What You Need to Provide:**
- Test mode option (preview without action)

**What the Script Does:**
1. Queries all services for pending states
2. Identifies services stuck longer than expected
3. Attempts graceful stop via SC.exe
4. Kills service process if necessary
5. Restarts the service
6. Reports recovery results

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- May cause data loss in running applications
- Test mode shows stuck services without action
- Typical use: automated remediation, helpdesk scripts
- Some services intentionally stay in pending briefly
- Consider root cause after recovery
- Use with caution on production systems`,
    parameters: [
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Restart Hung Services
# Generated: ${new Date().toISOString()}

$TestMode = ${testMode}

Write-Host "Scanning for hung services..." -ForegroundColor Cyan

# Find services in transitional states
$HungServices = Get-Service | Where-Object {
    $_.Status -eq 'StartPending' -or 
    $_.Status -eq 'StopPending' -or 
    $_.Status -eq 'ContinuePending' -or 
    $_.Status -eq 'PausePending'
}

if ($HungServices.Count -eq 0) {
    Write-Host "[SUCCESS] No hung services detected" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "[WARNING] Found $($HungServices.Count) hung service(s):" -ForegroundColor Yellow
$HungServices | ForEach-Object {
    Write-Host "  - $($_.DisplayName) ($($_.Name)) - Status: $($_.Status)" -ForegroundColor Yellow
}

if ($TestMode) {
    Write-Host ""
    Write-Host "[WARNING] TEST MODE - No actions taken" -ForegroundColor Yellow
    Write-Host "  Set Test Mode to false to restart these services" -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "Attempting to recover hung services..." -ForegroundColor Cyan

foreach ($Service in $HungServices) {
    Write-Host ""
    Write-Host "Processing: $($Service.Name)" -ForegroundColor Gray
    
    try {
        # Try to get the service PID
        $WMIService = Get-WmiObject Win32_Service -Filter "Name='$($Service.Name)'"
        $ProcessId = $WMIService.ProcessId
        
        if ($ProcessId -and $ProcessId -gt 0) {
            Write-Host "  Killing process ID: $ProcessId" -ForegroundColor Yellow
            Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        
        # Try to start the service
        sc.exe start $($Service.Name) | Out-Null
        Start-Sleep -Seconds 3
        
        $NewStatus = (Get-Service -Name $Service.Name).Status
        if ($NewStatus -eq 'Running') {
            Write-Host "  [OK] Service recovered and running" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Service status: $NewStatus" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [FAILED] Failed to recover: $_" -ForegroundColor Red
    }
}`;
    }
  },

  {
    id: 'restart-service-group',
    name: 'Restart Service Group',
    category: 'Service Groups',
    description: 'Restart a named group of related services in proper order',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restarts multiple services as a coordinated group
- Stops services in reverse dependency order
- Starts services in proper dependency order
- Supports common service group templates

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- All services in group must exist

**What You Need to Provide:**
- Service group name or custom service list
- Whether to ignore missing services

**What the Script Does:**
1. Resolves service group to service list
2. Determines proper stop/start order
3. Stops all services (reverse order)
4. Waits for all services to stop
5. Starts all services (dependency order)
6. Verifies all services running

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Built-in groups: SQL, IIS, Print, RemoteDesktop
- Custom list: comma-separated service names
- Typical use: application restarts, maintenance
- Partial failures are reported but don't stop process
- Use test mode to preview before executing`,
    parameters: [
      { id: 'serviceGroup', label: 'Service Group', type: 'select', required: true, options: ['SQL', 'IIS', 'Print', 'RemoteDesktop', 'Custom'], defaultValue: 'Custom' },
      { id: 'customServices', label: 'Custom Services (comma-separated, if Custom)', type: 'text', required: false, placeholder: 'Service1,Service2,Service3' },
      { id: 'ignoreMissing', label: 'Ignore Missing Services', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serviceGroup = params.serviceGroup;
      const customServices = params.customServices ? escapePowerShellString(params.customServices) : '';
      const ignoreMissing = toPowerShellBoolean(params.ignoreMissing ?? true);
      
      return `# Restart Service Group
# Generated: ${new Date().toISOString()}

$ServiceGroup = "${serviceGroup}"
$CustomServices = "${customServices}"
$IgnoreMissing = ${ignoreMissing}

# Define service groups
$ServiceGroups = @{
    "SQL" = @("MSSQLSERVER", "SQLSERVERAGENT", "MSSQLServerOLAPService", "ReportServer")
    "IIS" = @("W3SVC", "WAS", "IISADMIN")
    "Print" = @("Spooler")
    "RemoteDesktop" = @("TermService", "SessionEnv", "UmRdpService")
}

# Get service list
if ($ServiceGroup -eq "Custom") {
    $Services = $CustomServices -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
} else {
    $Services = $ServiceGroups[$ServiceGroup]
}

if (-not $Services -or $Services.Count -eq 0) {
    Write-Host "[FAILED] No services specified" -ForegroundColor Red
    exit 1
}

Write-Host "Restarting service group: $ServiceGroup" -ForegroundColor Cyan
Write-Host "Services: $($Services -join ', ')" -ForegroundColor Gray
Write-Host ""

# Validate services exist
$ValidServices = @()
foreach ($ServiceName in $Services) {
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($Service) {
        $ValidServices += $ServiceName
    } elseif (-not $IgnoreMissing) {
        Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "[WARNING] Skipping missing service: $ServiceName" -ForegroundColor Yellow
    }
}

# Stop all services (reverse order)
Write-Host "Stopping services..." -ForegroundColor Yellow
for ($i = $ValidServices.Count - 1; $i -ge 0; $i--) {
    $ServiceName = $ValidServices[$i]
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped: $ServiceName" -ForegroundColor Gray
    } catch {
        Write-Host "  [WARNING] Could not stop: $ServiceName" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 3

# Start all services (forward order)
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
foreach ($ServiceName in $ValidServices) {
    try {
        Start-Service -Name $ServiceName -ErrorAction Stop
        Write-Host "  [OK] Started: $ServiceName" -ForegroundColor Green
    } catch {
        Write-Host "  [FAILED] Failed to start: $ServiceName - $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[SUCCESS] Service group restart completed" -ForegroundColor Green`;
    }
  },

  {
    id: 'clear-service-event-logs',
    name: 'Clear Service Event Logs',
    category: 'Troubleshooting',
    description: 'Clear service-related Windows Event Log entries',
    isPremium: true,
    instructions: `**How This Task Works:**
- Clears service-related events from System log
- Optionally backs up logs before clearing
- Creates fresh baseline for troubleshooting
- Use before testing service configurations

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Event Log service running

**What You Need to Provide:**
- Whether to backup logs before clearing
- Backup path (if backup enabled)

**What the Script Does:**
1. Optionally exports current logs to file
2. Clears System Event Log entries
3. Creates a new baseline event entry
4. Confirms log cleared successfully

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- DESTRUCTIVE: Clears ALL System log events
- Always backup in production environments
- Typical use: pre-testing baseline, troubleshooting
- Consider regulatory requirements before clearing
- Backup exports to EVTX format (can reimport)
- Application log is NOT cleared (only System)`,
    parameters: [
      { id: 'backupFirst', label: 'Backup Logs Before Clearing', type: 'boolean', required: false, defaultValue: true },
      { id: 'backupPath', label: 'Backup Path (if backup enabled)', type: 'path', required: false, placeholder: 'C:\\Logs\\SystemBackup.evtx' }
    ],
    scriptTemplate: (params) => {
      const backupFirst = toPowerShellBoolean(params.backupFirst ?? true);
      const backupPath = params.backupPath ? escapePowerShellString(params.backupPath) : '';
      
      return `# Clear Service Event Logs
# Generated: ${new Date().toISOString()}

$BackupFirst = ${backupFirst}
$BackupPath = "${backupPath}"

Write-Host "Preparing to clear System Event Log..." -ForegroundColor Cyan

if ($BackupFirst) {
    if (-not $BackupPath) {
        $BackupPath = "C:\\Windows\\Temp\\SystemLog_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').evtx"
    }
    
    Write-Host "Backing up current log to: $BackupPath" -ForegroundColor Yellow
    
    try {
        wevtutil epl System $BackupPath
        Write-Host "[SUCCESS] Backup created successfully" -ForegroundColor Green
    } catch {
        Write-Host "[FAILED] Backup failed: $_" -ForegroundColor Red
        Write-Host "  Aborting clear operation for safety" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Clearing System Event Log..." -ForegroundColor Yellow

try {
    wevtutil cl System
    Write-Host "[SUCCESS] System Event Log cleared" -ForegroundColor Green
    
    # Create baseline entry
    Write-EventLog -LogName System -Source "EventLog" -EventId 1 -EntryType Information -Message "Event log cleared by administrator for service troubleshooting." -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "Log Status:" -ForegroundColor Gray
    $LogInfo = Get-WinEvent -ListLog System
    Write-Host "  Current entries: $($LogInfo.RecordCount)" -ForegroundColor Gray
    
    if ($BackupFirst -and $BackupPath) {
        Write-Host ""
        Write-Host "  Backup location: $BackupPath" -ForegroundColor Gray
        Write-Host "  To restore: wevtutil im $BackupPath" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAILED] Failed to clear log: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'analyze-service-failures',
    name: 'Analyze Service Failure Patterns',
    category: 'Troubleshooting',
    description: 'Deep analysis of service failure patterns and root causes',
    isPremium: true,
    instructions: `**How This Task Works:**
- Performs deep analysis of service failure events
- Identifies patterns by time, frequency, and type
- Correlates related events for root cause analysis
- Provides actionable remediation recommendations

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- Windows Event Log access
- Sufficient log retention period

**What You Need to Provide:**
- Service name to analyze
- Days back to analyze

**What the Script Does:**
1. Queries all failure events for specified service
2. Analyzes failure timing patterns
3. Identifies correlated events
4. Determines likely root causes
5. Provides specific recommendations
6. Generates detailed analysis report

**Important Notes:**
- More data (longer timeframe) = better analysis
- Correlates with Application log events
- Typical use: chronic issue investigation
- Export results for incident documentation
- Follow recommendations systematically
- Some patterns require domain expertise to interpret`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'daysBack', label: 'Days Back to Analyze', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const daysBack = Number(params.daysBack || 30);
      
      return `# Analyze Service Failure Patterns
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$DaysBack = ${daysBack}
$StartTime = (Get-Date).AddDays(-$DaysBack)

Write-Host "Analyzing failure patterns for: $ServiceName" -ForegroundColor Cyan
Write-Host "Timeframe: Last $DaysBack days" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray

# Verify service exists
$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Current Status: $($Service.Status)" -ForegroundColor $(if ($Service.Status -eq 'Running') { 'Green' } else { 'Yellow' })

# Query failure events
$Events = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object {
    $_.Message -like "*$ServiceName*" -and $_.Id -in @(7034, 7031, 7023, 7024, 7000, 7001, 7009)
}

if (-not $Events -or $Events.Count -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] No failure events found for $ServiceName in the last $DaysBack days" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "FAILURE ANALYSIS" -ForegroundColor Yellow
Write-Host "  Total Events: $($Events.Count)" -ForegroundColor Gray

# Time-based analysis
$ByHour = $Events | Group-Object { $_.TimeCreated.Hour } | Sort-Object Count -Descending
$ByDayOfWeek = $Events | Group-Object { $_.TimeCreated.DayOfWeek } | Sort-Object Count -Descending

Write-Host ""
Write-Host "Peak Failure Hours:" -ForegroundColor Yellow
$ByHour | Select-Object -First 3 | ForEach-Object {
    Write-Host "  $($_.Name):00 - $($_.Count) failures" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Peak Failure Days:" -ForegroundColor Yellow
$ByDayOfWeek | Select-Object -First 3 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) failures" -ForegroundColor Gray
}

# Event type analysis
$ByEventId = $Events | Group-Object Id | Sort-Object Count -Descending

Write-Host ""
Write-Host "Failure Types:" -ForegroundColor Yellow
$ByEventId | ForEach-Object {
    $EventType = switch ($_.Name) {
        "7034" { "Unexpected termination" }
        "7031" { "Terminated unexpectedly" }
        "7023" { "Terminated with error" }
        "7024" { "Service-specific error" }
        "7000" { "Failed to start" }
        "7001" { "Dependency failure" }
        "7009" { "Timeout waiting to connect" }
        default { "Other ($($_.Name))" }
    }
    Write-Host "  $EventType\`: $($_.Count) occurrences" -ForegroundColor Gray
}

# Recommendations
Write-Host ""
Write-Host "RECOMMENDATIONS:" -ForegroundColor Cyan

if ($ByEventId.Name -contains "7001") {
    Write-Host "  → Check service dependencies are running" -ForegroundColor Yellow
}
if ($ByEventId.Name -contains "7009") {
    Write-Host "  → Increase service startup timeout" -ForegroundColor Yellow
}
if ($Events.Count -gt 10) {
    Write-Host "  → Consider enabling automatic recovery (Set-Service -RecoveryAction)" -ForegroundColor Yellow
}
if ($ByHour[0].Count -gt ($Events.Count / 4)) {
    Write-Host "  → Investigate scheduled tasks or jobs at peak failure times" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  → Review Event Viewer for detailed error messages" -ForegroundColor Gray
Write-Host "  → Check Application log for related errors" -ForegroundColor Gray`;
    }
  },

  {
    id: 'repair-corrupted-service',
    name: 'Repair Corrupted Service',
    category: 'Troubleshooting',
    description: 'Attempt to repair corrupted or broken service configuration',
    isPremium: true,
    instructions: `**How This Task Works:**
- Attempts to repair common service configuration issues
- Resets service configuration to known-good defaults
- Fixes permissions and registry entries
- Last resort before service reinstallation

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- SC.exe and reg.exe utilities
- Service must be registered (even if broken)

**What You Need to Provide:**
- Service name to repair
- Whether to backup current config first

**What the Script Does:**
1. Exports current configuration for backup
2. Stops service if running
3. Resets service configuration via SC.exe
4. Repairs registry permissions
5. Resets to default startup account
6. Attempts to start repaired service

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- HIGH RISK: May lose custom configuration
- Always backup before attempting repair
- Typical use: services that won't start, access denied errors
- May require reinstall if repair fails
- Not suitable for third-party services with custom configs
- Test in non-production environment first`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'backupConfig', label: 'Backup Current Configuration', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const backupConfig = toPowerShellBoolean(params.backupConfig ?? true);
      
      return `# Repair Corrupted Service
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$BackupConfig = ${backupConfig}

Write-Host "Service Repair Utility" -ForegroundColor Cyan
Write-Host "Target: $ServiceName" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray

# Check if service exists in registry
$RegPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$ServiceName"
if (-not (Test-Path $RegPath)) {
    Write-Host "[FAILED] Service not found in registry: $ServiceName" -ForegroundColor Red
    Write-Host "  Service may need to be reinstalled" -ForegroundColor Yellow
    exit 1
}

# Backup current configuration
if ($BackupConfig) {
    $BackupFile = "C:\\Windows\\Temp\\$ServiceName\`_ServiceBackup_$(Get-Date -Format 'yyyyMMdd_HHmmss').reg"
    Write-Host ""
    Write-Host "Backing up configuration..." -ForegroundColor Yellow
    reg export "HKLM\\SYSTEM\\CurrentControlSet\\Services\\$ServiceName" $BackupFile /y 2>$null
    Write-Host "  Backup saved to: $BackupFile" -ForegroundColor Gray
}

# Stop service if running
Write-Host ""
Write-Host "Stopping service..." -ForegroundColor Yellow
Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Attempt repairs
Write-Host ""
Write-Host "Attempting repairs..." -ForegroundColor Yellow

# Reset failure count
Write-Host "  Resetting failure counter..." -ForegroundColor Gray
sc.exe failure $ServiceName reset= 0 2>$null

# Reset recovery actions to defaults
Write-Host "  Resetting recovery options..." -ForegroundColor Gray
sc.exe failure $ServiceName actions= restart/60000/restart/60000/restart/60000 2>$null

# Fix common permission issues
Write-Host "  Checking service permissions..." -ForegroundColor Gray
$Acl = Get-Acl $RegPath -ErrorAction SilentlyContinue
if ($Acl) {
    $AdminRule = New-Object System.Security.AccessControl.RegistryAccessRule(
        "BUILTIN\\Administrators", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow"
    )
    $Acl.AddAccessRule($AdminRule)
    Set-Acl -Path $RegPath -AclObject $Acl -ErrorAction SilentlyContinue
}

# Attempt to start service
Write-Host ""
Write-Host "Attempting to start service..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 3
    $Status = (Get-Service -Name $ServiceName).Status
    
    if ($Status -eq 'Running') {
        Write-Host ""
        Write-Host "[SUCCESS] Service repaired and running successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[WARNING] Service started but status is: $Status" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "[FAILED] Service failed to start after repair" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Additional steps to try:" -ForegroundColor Yellow
    Write-Host "  1. Check Event Viewer for detailed error" -ForegroundColor Gray
    Write-Host "  2. Verify service executable exists" -ForegroundColor Gray
    Write-Host "  3. Consider reinstalling the application" -ForegroundColor Gray
    
    if ($BackupConfig) {
        Write-Host ""
        Write-Host "To restore original config:" -ForegroundColor Yellow
        Write-Host "  reg import $BackupFile" -ForegroundColor Gray
    }
}`;
    }
  },

  {
    id: 'get-service-account-privileges',
    name: 'Check Service Account Privileges',
    category: 'Service Accounts',
    description: 'Analyze privileges and rights for service accounts',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes security privileges for service accounts
- Identifies over-privileged services
- Checks for "Log on as a service" right
- Reports security recommendations

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Local Security Policy access
- secedit.exe utility

**What You Need to Provide:**
- Optional: specific service name to check

**What the Script Does:**
1. Exports current security policy
2. Identifies accounts with service logon rights
3. Cross-references with running services
4. Identifies potentially risky configurations
5. Provides security recommendations

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- LocalSystem has highest privileges (security risk)
- Custom accounts should have minimal rights
- Typical use: security audits, compliance checks
- Review accounts with unnecessary admin rights
- Consider Group Managed Service Accounts (gMSA)`,
    parameters: [
      { id: 'serviceName', label: 'Service Name (optional, leave blank for all)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const serviceName = params.serviceName ? escapePowerShellString(params.serviceName) : '';
      
      return `# Check Service Account Privileges
# Generated: ${new Date().toISOString()}

$TargetService = "${serviceName}"

Write-Host "Service Account Privilege Analysis" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray

# Get services to analyze
if ($TargetService) {
    $Services = Get-WmiObject Win32_Service -Filter "Name='$TargetService'"
    if (-not $Services) {
        Write-Host "[FAILED] Service not found: $TargetService" -ForegroundColor Red
        exit 1
    }
} else {
    $Services = Get-WmiObject Win32_Service
}

# Analyze each service account
$AccountAnalysis = $Services | ForEach-Object {
    $PrivilegeLevel = switch ($_.StartName) {
        "LocalSystem" { "CRITICAL - Full system access" }
        "NT AUTHORITY\\SYSTEM" { "CRITICAL - Full system access" }
        "NT AUTHORITY\\LocalService" { "LOW - Limited local access" }
        "NT AUTHORITY\\NetworkService" { "MEDIUM - Network access with machine creds" }
        $null { "UNKNOWN" }
        default { 
            if ($_.StartName -match "\\\\") {
                "CUSTOM - Review permissions manually"
            } else {
                "LOCAL - Local account"
            }
        }
    }
    
    $Risk = switch -Regex ($PrivilegeLevel) {
        "CRITICAL" { "High" }
        "MEDIUM" { "Medium" }
        "CUSTOM" { "Review" }
        default { "Low" }
    }
    
    [PSCustomObject]@{
        ServiceName = $_.Name
        DisplayName = $_.DisplayName
        Account = $_.StartName
        PrivilegeLevel = $PrivilegeLevel
        Risk = $Risk
        Status = $_.State
    }
}

# Summary
Write-Host ""
Write-Host "PRIVILEGE SUMMARY:" -ForegroundColor Yellow
$AccountAnalysis | Group-Object Risk | Sort-Object @{Expression={
    switch ($_.Name) { "High" { 1 } "Medium" { 2 } "Review" { 3 } "Low" { 4 } default { 5 } }
}} | ForEach-Object {
    $Color = switch ($_.Name) {
        "High" { "Red" }
        "Medium" { "Yellow" }
        "Review" { "Cyan" }
        default { "Green" }
    }
    Write-Host "  $($_.Name) Risk: $($_.Count) services" -ForegroundColor $Color
}

# High-risk services
$HighRisk = $AccountAnalysis | Where-Object { $_.Risk -eq "High" }
if ($HighRisk) {
    Write-Host ""
    Write-Host "[WARNING] HIGH PRIVILEGE SERVICES (LocalSystem):" -ForegroundColor Red
    $HighRisk | ForEach-Object {
        Write-Host "  - $($_.DisplayName)" -ForegroundColor Yellow
    }
}

# Custom accounts to review
$CustomAccounts = $AccountAnalysis | Where-Object { $_.Risk -eq "Review" }
if ($CustomAccounts) {
    Write-Host ""
    Write-Host "CUSTOM ACCOUNTS TO REVIEW:" -ForegroundColor Cyan
    $CustomAccounts | ForEach-Object {
        Write-Host "  - $($_.DisplayName): $($_.Account)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "RECOMMENDATIONS:" -ForegroundColor Green
Write-Host "  1. Minimize LocalSystem usage where possible" -ForegroundColor Gray
Write-Host "  2. Use NetworkService for network-enabled services" -ForegroundColor Gray
Write-Host "  3. Consider Group Managed Service Accounts (gMSA)" -ForegroundColor Gray
Write-Host "  4. Review custom account permissions regularly" -ForegroundColor Gray`;
    }
  },

  {
    id: 'validate-service-config',
    name: 'Validate Service Configuration',
    category: 'Troubleshooting',
    description: 'Validate service configuration against best practices',
    isPremium: true,
    instructions: `**How This Task Works:**
- Validates service configuration completeness
- Checks against Windows best practices
- Identifies potential issues before they cause problems
- Provides remediation guidance

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for basic checks
- Administrator for advanced validation
- WMI access required

**What You Need to Provide:**
- Service name to validate

**What the Script Does:**
1. Retrieves complete service configuration
2. Validates executable path exists
3. Checks recovery options are configured
4. Verifies dependencies are valid
5. Confirms service account is valid
6. Scores overall configuration health

**Important Notes:**
- Run before deploying to production
- Typical use: pre-deployment validation, troubleshooting
- Some checks require admin privileges
- Review warnings even if validation passes
- Consider automating as part of deployment pipeline
- Export results for documentation`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Validate Service Configuration
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

Write-Host "Service Configuration Validator" -ForegroundColor Cyan
Write-Host "Target: $ServiceName" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray

$Issues = @()
$Warnings = @()
$Passed = @()

# Get service
$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
$WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue

if (-not $Service -or -not $WMIService) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running validation checks..." -ForegroundColor Yellow

# Check 1: Service executable exists
$ExePath = ($WMIService.PathName -replace '"', '') -split ' ' | Select-Object -First 1
if (Test-Path $ExePath) {
    $Passed += "Executable exists: $ExePath"
} else {
    $Issues += "Executable NOT found: $ExePath"
}

# Check 2: Service account is valid
$Account = $WMIService.StartName
if ($Account) {
    $Passed += "Service account configured: $Account"
} else {
    $Issues += "No service account configured"
}

# Check 3: Dependencies exist
$Deps = $Service.ServicesDependedOn
if ($Deps.Count -gt 0) {
    $InvalidDeps = $Deps | Where-Object { -not (Get-Service -Name $_.Name -ErrorAction SilentlyContinue) }
    if ($InvalidDeps.Count -eq 0) {
        $Passed += "All $($Deps.Count) dependencies valid"
    } else {
        $Issues += "Invalid dependencies: $($InvalidDeps.Name -join ', ')"
    }
} else {
    $Passed += "No dependencies (standalone service)"
}

# Check 4: Startup type is appropriate
$StartMode = $WMIService.StartMode
if ($StartMode -eq "Auto" -and $Service.Status -ne "Running") {
    $Warnings += "Auto-start service is not running"
} elseif ($StartMode -eq "Disabled") {
    $Warnings += "Service is disabled"
} else {
    $Passed += "Startup type: $StartMode"
}

# Check 5: Recovery options configured
$FailureActions = sc.exe qfailure $ServiceName 2>$null
if ($FailureActions -match "RESTART") {
    $Passed += "Recovery options configured"
} else {
    $Warnings += "No recovery options configured"
}

# Check 6: Description exists
if ($WMIService.Description) {
    $Passed += "Service description present"
} else {
    $Warnings += "No service description (documentation issue)"
}

# Display results
Write-Host ""
Write-Host "PASSED CHECKS ($($Passed.Count)):" -ForegroundColor Green
$Passed | ForEach-Object { Write-Host "  [OK] $_" -ForegroundColor Green }

if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS ($($Warnings.Count)):" -ForegroundColor Yellow
    $Warnings | ForEach-Object { Write-Host "  [WARNING] $_" -ForegroundColor Yellow }
}

if ($Issues.Count -gt 0) {
    Write-Host ""
    Write-Host "ISSUES ($($Issues.Count)):" -ForegroundColor Red
    $Issues | ForEach-Object { Write-Host "  [FAILED] $_" -ForegroundColor Red }
}

# Overall score
$Score = [Math]::Round(($Passed.Count / ($Passed.Count + $Warnings.Count + $Issues.Count)) * 100)
Write-Host ""
Write-Host "============================================" -ForegroundColor Gray

if ($Issues.Count -eq 0 -and $Warnings.Count -eq 0) {
    Write-Host "RESULT: PASSED (Score: $Score%)" -ForegroundColor Green
} elseif ($Issues.Count -eq 0) {
    Write-Host "RESULT: PASSED WITH WARNINGS (Score: $Score%)" -ForegroundColor Yellow
} else {
    Write-Host "RESULT: FAILED (Score: $Score%)" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'pause-service',
    name: 'Pause Windows Service',
    category: 'Service Control',
    description: 'Pause a running Windows service that supports pause operations',
    isPremium: true,
    instructions: `**How This Task Works:**
- Pauses a service without fully stopping it
- Service remains in memory but stops processing
- Not all services support pause operations
- Useful for temporary maintenance

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must support pause operation
- Service must be running

**What You Need to Provide:**
- Service name (not display name)

**What the Script Does:**
1. Validates service exists and is running
2. Checks if service supports pause
3. Sends pause command
4. Verifies service is paused
5. Reports final status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Not all services support pause (CanPauseAndContinue property)
- Paused services remain in memory
- Use continue to resume operations
- Typical use: brief maintenance windows
- Some services may timeout if paused too long`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Pause Windows Service
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

if ($Service.Status -ne "Running") {
    Write-Host "[FAILED] Service is not running: $ServiceName (Status: $($Service.Status))" -ForegroundColor Red
    exit 1
}

if (-not $Service.CanPauseAndContinue) {
    Write-Host "[FAILED] Service does not support pause: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Pausing service: $($Service.DisplayName)" -ForegroundColor Cyan

Suspend-Service -Name $ServiceName

Start-Sleep -Seconds 2
$Status = (Get-Service -Name $ServiceName).Status

if ($Status -eq "Paused") {
    Write-Host "[SUCCESS] Service paused successfully" -ForegroundColor Green
    Write-Host "  Current status: $Status" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] Pause command sent but status is: $Status" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'continue-service',
    name: 'Continue Paused Service',
    category: 'Service Control',
    description: 'Resume a paused Windows service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Resumes a service that was previously paused
- Service continues processing from where it stopped
- Faster than full restart
- No service reinitialization required

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must be in paused state
- Service must support continue operation

**What You Need to Provide:**
- Service name (not display name)

**What the Script Does:**
1. Validates service exists
2. Confirms service is paused
3. Sends continue command
4. Verifies service is running
5. Reports final status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Only works on paused services
- Faster than stop/start cycle
- Typical use: resume after maintenance
- If continue fails, try full restart`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Continue Paused Service
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

if ($Service.Status -ne "Paused") {
    Write-Host "[FAILED] Service is not paused: $ServiceName (Status: $($Service.Status))" -ForegroundColor Red
    exit 1
}

Write-Host "Resuming service: $($Service.DisplayName)" -ForegroundColor Cyan

Resume-Service -Name $ServiceName

Start-Sleep -Seconds 2
$Status = (Get-Service -Name $ServiceName).Status

if ($Status -eq "Running") {
    Write-Host "[SUCCESS] Service resumed successfully" -ForegroundColor Green
    Write-Host "  Current status: $Status" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] Continue command sent but status is: $Status" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'get-remote-service-status',
    name: 'Get Remote Service Status',
    category: 'Remote Services',
    description: 'Check service status on a remote computer',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries service status on remote Windows computers
- Uses WMI for remote connectivity
- Supports domain and workgroup environments
- Displays detailed service information

**Prerequisites:**
- Administrator privileges on remote computer
- PowerShell 5.1 or later
- WinRM or WMI connectivity to remote host
- Firewall rules allowing remote management
- Valid credentials for remote computer

**What You Need to Provide:**
- Remote computer name or IP address
- Service name to check
- Optional: alternate credentials

**What the Script Does:**
1. Tests connectivity to remote computer
2. Queries service status via WMI
3. Retrieves service configuration details
4. Displays status and configuration
5. Reports any connectivity issues

**Important Notes:**
- Requires network connectivity to remote host
- WMI/DCOM ports must be open (TCP 135, dynamic)
- Alternatively configure WinRM for PowerShell remoting
- Typical use: centralized monitoring, troubleshooting
- Consider PowerShell remoting for bulk operations
- Firewall may block WMI queries`,
    parameters: [
      { id: 'computerName', label: 'Remote Computer Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const computerName = escapePowerShellString(params.computerName);
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Get Remote Service Status
# Generated: ${new Date().toISOString()}

$ComputerName = "${computerName}"
$ServiceName = "${serviceName}"

Write-Host "Querying service on remote computer..." -ForegroundColor Cyan
Write-Host "  Computer: $ComputerName" -ForegroundColor Gray
Write-Host "  Service: $ServiceName" -ForegroundColor Gray
Write-Host ""

# Test connectivity first
if (-not (Test-Connection -ComputerName $ComputerName -Count 1 -Quiet)) {
    Write-Host "[FAILED] Cannot reach computer: $ComputerName" -ForegroundColor Red
    exit 1
}

try {
    $Service = Get-WmiObject Win32_Service -ComputerName $ComputerName -Filter "Name='$ServiceName'" -ErrorAction Stop
    
    if ($Service) {
        Write-Host "SERVICE DETAILS:" -ForegroundColor Yellow
        Write-Host "  Name: $($Service.Name)" -ForegroundColor Gray
        Write-Host "  Display Name: $($Service.DisplayName)" -ForegroundColor Gray
        Write-Host "  Status: $($Service.State)" -ForegroundColor $(if ($Service.State -eq "Running") { "Green" } else { "Yellow" })
        Write-Host "  Start Mode: $($Service.StartMode)" -ForegroundColor Gray
        Write-Host "  Account: $($Service.StartName)" -ForegroundColor Gray
        Write-Host "  Process ID: $($Service.ProcessId)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "[SUCCESS] Query completed successfully" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Service not found on $ComputerName\`: $ServiceName" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAILED] Failed to query remote service" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  - Verify WMI/DCOM connectivity" -ForegroundColor Gray
    Write-Host "  - Check firewall rules" -ForegroundColor Gray
    Write-Host "  - Ensure administrator credentials" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'restart-remote-service',
    name: 'Restart Remote Service',
    category: 'Remote Services',
    description: 'Restart a Windows service on a remote computer',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restarts a service on a remote Windows computer
- Uses PowerShell remoting (WinRM) for reliability
- Waits and verifies restart completion
- Provides detailed status feedback

**Prerequisites:**
- Administrator privileges on remote computer
- PowerShell 5.1 or later
- WinRM enabled on remote computer
- Network connectivity to remote host
- Trusted hosts configured if not domain-joined

**What You Need to Provide:**
- Remote computer name or IP address
- Service name to restart

**What the Script Does:**
1. Tests WinRM connectivity to remote computer
2. Connects via PowerShell remoting
3. Stops the service on remote host
4. Starts the service on remote host
5. Verifies service is running
6. Reports final status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES on remote host
- WinRM must be enabled (Enable-PSRemoting)
- Non-domain computers need TrustedHosts configuration
- Typical use: remote troubleshooting, centralized management
- Brief service interruption expected
- Consider impact on connected users`,
    parameters: [
      { id: 'computerName', label: 'Remote Computer Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const computerName = escapePowerShellString(params.computerName);
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Restart Remote Service
# Generated: ${new Date().toISOString()}

$ComputerName = "${computerName}"
$ServiceName = "${serviceName}"

Write-Host "Restarting service on remote computer..." -ForegroundColor Cyan
Write-Host "  Computer: $ComputerName" -ForegroundColor Gray
Write-Host "  Service: $ServiceName" -ForegroundColor Gray
Write-Host ""

# Test WinRM connectivity
try {
    $TestResult = Test-WSMan -ComputerName $ComputerName -ErrorAction Stop
    Write-Host "[SUCCESS] WinRM connectivity verified" -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Cannot connect via WinRM to: $ComputerName" -ForegroundColor Red
    Write-Host "  Ensure WinRM is enabled: Enable-PSRemoting -Force" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Executing remote restart..." -ForegroundColor Yellow

try {
    $Result = Invoke-Command -ComputerName $ComputerName -ScriptBlock {
        param($SvcName)
        
        $Service = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
        if (-not $Service) {
            return @{ Success = $false; Message = "Service not found: $SvcName" }
        }
        
        try {
            Restart-Service -Name $SvcName -Force -ErrorAction Stop
            Start-Sleep -Seconds 3
            $NewStatus = (Get-Service -Name $SvcName).Status
            return @{ Success = $true; Status = $NewStatus }
        } catch {
            return @{ Success = $false; Message = $_.Exception.Message }
        }
    } -ArgumentList $ServiceName -ErrorAction Stop
    
    if ($Result.Success) {
        Write-Host ""
        Write-Host "[SUCCESS] Service restarted successfully on $ComputerName" -ForegroundColor Green
        Write-Host "  Current status: $($Result.Status)" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "[FAILED] Failed to restart service" -ForegroundColor Red
        Write-Host "  Error: $($Result.Message)" -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "[FAILED] Remote command failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'bulk-restart-services-multiserver',
    name: 'Bulk Restart Service on Multiple Servers',
    category: 'Remote Services',
    description: 'Restart a service across multiple remote servers simultaneously',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restarts a specific service on multiple servers
- Executes in parallel for efficiency
- Reports success/failure for each server
- Essential for enterprise fleet management

**Prerequisites:**
- Administrator privileges on all target servers
- PowerShell 5.1 or later
- WinRM enabled on all target servers
- Network connectivity to all servers

**What You Need to Provide:**
- Comma-separated list of server names
- Service name to restart on all servers
- Test mode option for preview

**What the Script Does:**
1. Parses server list
2. Validates connectivity to each server
3. In test mode: shows servers without action
4. In execution mode: restarts service on all servers
5. Collects results from each server
6. Generates summary report

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES on all servers
- Test mode enabled by default for safety
- Parallel execution may strain network
- Typical use: patching, maintenance windows
- Consider staggered restarts for critical services
- Large server lists may timeout`,
    parameters: [
      { id: 'servers', label: 'Server Names (comma-separated)', type: 'textarea', required: true, placeholder: 'SERVER01, SERVER02, SERVER03' },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const servers = escapePowerShellString(params.servers);
      const serviceName = escapePowerShellString(params.serviceName);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Bulk Restart Service on Multiple Servers
# Generated: ${new Date().toISOString()}

$ServerList = "${servers}" -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
$ServiceName = "${serviceName}"
$TestMode = ${testMode}

Write-Host "Multi-Server Service Restart" -ForegroundColor Cyan
Write-Host "Service: $ServiceName" -ForegroundColor Gray
Write-Host "Servers: $($ServerList.Count)" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

if ($ServerList.Count -eq 0) {
    Write-Host "[FAILED] No servers specified" -ForegroundColor Red
    exit 1
}

Write-Host "Target Servers:" -ForegroundColor Yellow
$ServerList | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - No actions will be taken" -ForegroundColor Yellow
    Write-Host ""
    
    # Test connectivity
    Write-Host "Testing connectivity..." -ForegroundColor Cyan
    foreach ($Server in $ServerList) {
        $Ping = Test-Connection -ComputerName $Server -Count 1 -Quiet
        if ($Ping) {
            Write-Host "  [OK] $Server - Reachable" -ForegroundColor Green
        } else {
            Write-Host "  [FAILED] $Server - Unreachable" -ForegroundColor Red
        }
    }
    exit 0
}

# Execute restart on all servers
Write-Host "Restarting service on all servers..." -ForegroundColor Cyan
Write-Host ""

$Results = @()

foreach ($Server in $ServerList) {
    Write-Host "Processing: $Server" -ForegroundColor Yellow
    
    try {
        $Result = Invoke-Command -ComputerName $Server -ScriptBlock {
            param($SvcName)
            try {
                Restart-Service -Name $SvcName -Force -ErrorAction Stop
                Start-Sleep -Seconds 2
                $Status = (Get-Service -Name $SvcName).Status
                return @{ Success = $true; Status = $Status.ToString() }
            } catch {
                return @{ Success = $false; Error = $_.Exception.Message }
            }
        } -ArgumentList $ServiceName -ErrorAction Stop
        
        if ($Result.Success) {
            Write-Host "  [OK] Success - Status: $($Result.Status)" -ForegroundColor Green
            $Results += [PSCustomObject]@{ Server = $Server; Status = "Success"; Details = $Result.Status }
        } else {
            Write-Host "  [FAILED] Failed - $($Result.Error)" -ForegroundColor Red
            $Results += [PSCustomObject]@{ Server = $Server; Status = "Failed"; Details = $Result.Error }
        }
    } catch {
        Write-Host "  [FAILED] Connection failed - $_" -ForegroundColor Red
        $Results += [PSCustomObject]@{ Server = $Server; Status = "Error"; Details = $_.Exception.Message }
    }
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host "SUMMARY:" -ForegroundColor Cyan
$Successful = ($Results | Where-Object { $_.Status -eq "Success" }).Count
$Failed = ($Results | Where-Object { $_.Status -ne "Success" }).Count
Write-Host "  Successful: $Successful" -ForegroundColor Green
Write-Host "  Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Gray" })`;
    }
  },

  {
    id: 'get-orphaned-services',
    name: 'Find Orphaned Services',
    category: 'Service Discovery',
    description: 'Identify services whose executable files no longer exist',
    isPremium: true,
    instructions: `**How This Task Works:**
- Scans all Windows services for orphaned entries
- Identifies services pointing to missing executables
- Helps clean up remnants from uninstalled software
- Essential for system hygiene and troubleshooting

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- WMI access for service path information

**What You Need to Provide:**
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all registered Windows services
2. Extracts executable path for each service
3. Validates each executable file exists
4. Reports services with missing executables
5. Provides cleanup recommendations

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES for complete scan
- Some services use svchost.exe (shared services)
- Orphaned services can cause boot delays
- Typical use: post-uninstall cleanup, troubleshooting
- Removing orphaned services requires caution
- Verify before removing - some paths may be dynamic`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Orphaned Services
# Generated: ${new Date().toISOString()}

Write-Host "Scanning for orphaned services..." -ForegroundColor Cyan
Write-Host ""

$Services = Get-WmiObject Win32_Service

$OrphanedServices = @()

foreach ($Service in $Services) {
    $PathName = $Service.PathName
    
    if (-not $PathName) {
        continue
    }
    
    # Extract executable path (handle quotes and arguments)
    if ($PathName.StartsWith('"')) {
        $ExePath = $PathName.Substring(1, $PathName.IndexOf('"', 1) - 1)
    } else {
        $ExePath = ($PathName -split ' ')[0]
    }
    
    # Skip system paths that use environment variables
    if ($ExePath -match '^%') {
        $ExePath = [Environment]::ExpandEnvironmentVariables($ExePath)
    }
    
    # Check if executable exists
    if (-not (Test-Path $ExePath -ErrorAction SilentlyContinue)) {
        $OrphanedServices += [PSCustomObject]@{
            ServiceName = $Service.Name
            DisplayName = $Service.DisplayName
            Status = $Service.State
            StartMode = $Service.StartMode
            ExpectedPath = $ExePath
        }
    }
}

if ($OrphanedServices.Count -eq 0) {
    Write-Host "[SUCCESS] No orphaned services found" -ForegroundColor Green
    exit 0
}

Write-Host "[WARNING] Found $($OrphanedServices.Count) orphaned service(s):" -ForegroundColor Yellow
Write-Host ""

$OrphanedServices | ForEach-Object {
    Write-Host "Service: $($_.DisplayName)" -ForegroundColor Yellow
    Write-Host "  Name: $($_.ServiceName)" -ForegroundColor Gray
    Write-Host "  Status: $($_.Status)" -ForegroundColor Gray
    Write-Host "  Missing Path: $($_.ExpectedPath)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "RECOMMENDATIONS:" -ForegroundColor Cyan
Write-Host "  1. Verify the application was properly uninstalled" -ForegroundColor Gray
Write-Host "  2. Disable orphaned services to prevent boot issues" -ForegroundColor Gray
Write-Host "  3. Use 'sc.exe delete ServiceName' to remove (caution!)" -ForegroundColor Gray

${exportPath ? `
$OrphanedServices | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-third-party-services',
    name: 'Inventory Third-Party Services',
    category: 'Service Discovery',
    description: 'List all non-Microsoft services installed on the system',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies services not from Microsoft/Windows
- Separates third-party from built-in services
- Helps with software inventory and licensing
- Essential for security audits

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for basic info
- Administrator for complete file details
- WMI access required

**What You Need to Provide:**
- Optional: filter by running services only
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all Windows services
2. Extracts publisher/company information from executable
3. Filters out Microsoft/Windows services
4. Groups by publisher for easy review
5. Generates categorized report

**Important Notes:**
- Some services may not have publisher information
- Unsigned services may indicate security concerns
- Typical use: software inventory, security audits
- Verify unknown publishers are legitimate
- Consider reviewing services from unknown sources`,
    parameters: [
      { id: 'runningOnly', label: 'Running Services Only', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const runningOnly = toPowerShellBoolean(params.runningOnly ?? false);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Inventory Third-Party Services
# Generated: ${new Date().toISOString()}

$RunningOnly = ${runningOnly}

Write-Host "Scanning for third-party services..." -ForegroundColor Cyan
Write-Host ""

$Services = Get-WmiObject Win32_Service
if ($RunningOnly) {
    $Services = $Services | Where-Object { $_.State -eq "Running" }
}

$ThirdPartyServices = @()

foreach ($Service in $Services) {
    $PathName = $Service.PathName
    
    if (-not $PathName) {
        continue
    }
    
    # Extract executable path
    if ($PathName.StartsWith('"')) {
        $ExePath = $PathName.Substring(1, $PathName.IndexOf('"', 1) - 1)
    } else {
        $ExePath = ($PathName -split ' ')[0]
    }
    
    # Get file version info
    $Publisher = "Unknown"
    if (Test-Path $ExePath -ErrorAction SilentlyContinue) {
        try {
            $VersionInfo = (Get-Item $ExePath -ErrorAction SilentlyContinue).VersionInfo
            $Publisher = $VersionInfo.CompanyName
        } catch {
            $Publisher = "Unknown"
        }
    }
    
    # Filter out Microsoft services
    if ($Publisher -and $Publisher -notmatch "Microsoft|Windows") {
        $ThirdPartyServices += [PSCustomObject]@{
            ServiceName = $Service.Name
            DisplayName = $Service.DisplayName
            Publisher = if ($Publisher) { $Publisher } else { "Unknown" }
            Status = $Service.State
            StartMode = $Service.StartMode
            Path = $ExePath
        }
    }
}

# Summary by publisher
Write-Host "THIRD-PARTY SERVICES BY PUBLISHER:" -ForegroundColor Yellow
Write-Host ""

$ByPublisher = $ThirdPartyServices | Group-Object Publisher | Sort-Object Count -Descending

foreach ($Group in $ByPublisher) {
    Write-Host "$($Group.Name): $($Group.Count) service(s)" -ForegroundColor Cyan
    $Group.Group | ForEach-Object {
        $StatusColor = if ($_.Status -eq "Running") { "Green" } else { "Gray" }
        Write-Host "  - $($_.DisplayName) [$($_.Status)]" -ForegroundColor $StatusColor
    }
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Gray
Write-Host "Total third-party services: $($ThirdPartyServices.Count)" -ForegroundColor Yellow

${exportPath ? `
$ThirdPartyServices | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-service-startup-impact',
    name: 'Analyze Service Startup Impact',
    category: 'Service Monitoring',
    description: 'Identify services that may be slowing system boot time',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes automatic services for boot impact
- Identifies services with slow startup patterns
- Checks for delayed start optimization opportunities
- Helps improve system boot performance

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges for complete analysis
- Event Log access for timing data
- WMI access required

**What You Need to Provide:**
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all automatic start services
2. Identifies non-essential auto-start services
3. Checks for delayed start configuration
4. Analyzes service dependencies
5. Provides optimization recommendations

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES for full analysis
- Some services are critical and cannot be delayed
- Delayed Auto start reduces boot contention
- Typical use: boot optimization, performance tuning
- Test changes in non-production first
- Document baseline before making changes`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Analyze Service Startup Impact
# Generated: ${new Date().toISOString()}

Write-Host "Analyzing service startup impact..." -ForegroundColor Cyan
Write-Host ""

# Get all auto-start services
$AutoServices = Get-WmiObject Win32_Service | Where-Object { $_.StartMode -eq "Auto" }

$Analysis = @()

foreach ($Service in $AutoServices) {
    # Check if it's delayed auto
    $RegPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$($Service.Name)"
    $DelayedAutoStart = $false
    try {
        $DelayedValue = Get-ItemProperty -Path $RegPath -Name "DelayedAutostart" -ErrorAction SilentlyContinue
        $DelayedAutoStart = $DelayedValue.DelayedAutostart -eq 1
    } catch {}
    
    # Get dependency count
    $DepService = Get-Service -Name $Service.Name -ErrorAction SilentlyContinue
    $DependencyCount = 0
    $DependentCount = 0
    if ($DepService) {
        $DependencyCount = $DepService.ServicesDependedOn.Count
        $DependentCount = $DepService.DependentServices.Count
    }
    
    # Categorize impact
    $Impact = "Low"
    if ($DependentCount -gt 3) { $Impact = "High" }
    elseif ($DependentCount -gt 0 -or $DependencyCount -gt 2) { $Impact = "Medium" }
    
    $Analysis += [PSCustomObject]@{
        ServiceName = $Service.Name
        DisplayName = $Service.DisplayName
        DelayedStart = $DelayedAutoStart
        Dependencies = $DependencyCount
        Dependents = $DependentCount
        Status = $Service.State
        Impact = $Impact
        Account = $Service.StartName
    }
}

# Sort by impact
$Analysis = $Analysis | Sort-Object @{Expression={switch ($_.Impact) { "High" { 1 } "Medium" { 2 } "Low" { 3 } }}}, DependentCount -Descending

# Summary
$HighImpact = ($Analysis | Where-Object { $_.Impact -eq "High" }).Count
$DelayedCount = ($Analysis | Where-Object { $_.DelayedStart }).Count
$NotDelayed = ($Analysis | Where-Object { -not $_.DelayedStart }).Count

Write-Host "STARTUP IMPACT SUMMARY:" -ForegroundColor Yellow
Write-Host "  Total auto-start services: $($Analysis.Count)" -ForegroundColor Gray
Write-Host "  High impact services: $HighImpact" -ForegroundColor $(if ($HighImpact -gt 5) { "Red" } else { "Gray" })
Write-Host "  Using Delayed Auto-start: $DelayedCount" -ForegroundColor Green
Write-Host "  Standard Auto-start: $NotDelayed" -ForegroundColor Gray
Write-Host ""

# High impact services
Write-Host "HIGH IMPACT SERVICES:" -ForegroundColor Red
$Analysis | Where-Object { $_.Impact -eq "High" } | ForEach-Object {
    Write-Host "  $($_.DisplayName) - $($_.Dependents) dependent(s)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "OPTIMIZATION CANDIDATES (not using Delayed Start):" -ForegroundColor Cyan
$Candidates = $Analysis | Where-Object { -not $_.DelayedStart -and $_.Impact -eq "Low" -and $_.Dependents -eq 0 } | Select-Object -First 10
$Candidates | ForEach-Object {
    Write-Host "  $($_.DisplayName)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "RECOMMENDATION:" -ForegroundColor Green
Write-Host "  Consider setting low-impact services to 'Automatic (Delayed Start)'" -ForegroundColor Gray
Write-Host "  Use: sc.exe config ServiceName start= delayed-auto" -ForegroundColor Gray

${exportPath ? `
$Analysis | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Full analysis exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'set-service-delayed-start',
    name: 'Set Delayed Auto-Start',
    category: 'Startup Configuration',
    description: 'Configure service to start automatically with delay after boot',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures service to start after initial boot rush
- Reduces boot contention with other services
- Improves overall system startup time
- Service still starts automatically, just delayed

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist and be set to automatic
- sc.exe utility (built into Windows)

**What You Need to Provide:**
- Service name (not display name)
- Enable or disable delayed start

**What the Script Does:**
1. Validates service exists
2. Confirms service is set to automatic startup
3. Configures delayed auto-start setting
4. Verifies configuration change
5. Reports new startup configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Only applies to automatic start services
- Delayed services start approximately 2 minutes after boot
- Critical services should not be delayed
- Typical use: non-essential auto-start services
- Test impact on dependent applications`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'enableDelayed', label: 'Enable Delayed Start', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const enableDelayed = toPowerShellBoolean(params.enableDelayed ?? true);
      
      return `# Set Delayed Auto-Start
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$EnableDelayed = ${enableDelayed}

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

$WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"

if ($WMIService.StartMode -ne "Auto") {
    Write-Host "[FAILED] Service is not set to Automatic startup" -ForegroundColor Red
    Write-Host "  Current startup type: $($WMIService.StartMode)" -ForegroundColor Yellow
    Write-Host "  Delayed start only applies to Automatic services" -ForegroundColor Gray
    exit 1
}

Write-Host "Configuring delayed auto-start for: $($Service.DisplayName)" -ForegroundColor Cyan

if ($EnableDelayed) {
    sc.exe config $ServiceName start= delayed-auto | Out-Null
    Write-Host "[SUCCESS] Delayed auto-start ENABLED" -ForegroundColor Green
} else {
    sc.exe config $ServiceName start= auto | Out-Null
    Write-Host "[SUCCESS] Delayed auto-start DISABLED (standard auto)" -ForegroundColor Green
}

# Verify
$RegPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$ServiceName"
$DelayedValue = Get-ItemProperty -Path $RegPath -Name "DelayedAutostart" -ErrorAction SilentlyContinue
$IsDelayed = $DelayedValue.DelayedAutostart -eq 1

Write-Host ""
Write-Host "Current configuration:" -ForegroundColor Gray
Write-Host "  Service: $ServiceName" -ForegroundColor Gray
Write-Host "  Startup Type: Automatic $(if ($IsDelayed) { '(Delayed Start)' } else { '(Immediate)' })" -ForegroundColor Gray
Write-Host ""
Write-Host "[WARNING] Changes take effect on next system boot" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'export-service-config',
    name: 'Export Service Configuration',
    category: 'Reporting',
    description: 'Export complete service configuration for backup or documentation',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports comprehensive service configuration
- Creates backup for disaster recovery
- Documents current service state
- Supports registry export for complete backup

**Prerequisites:**
- Administrator privileges for full export
- PowerShell 5.1 or later
- WMI access required
- Write access to export path

**What You Need to Provide:**
- Service name (or leave blank for all services)
- Export directory path
- Whether to include registry backup

**What the Script Does:**
1. Retrieves complete service configuration
2. Extracts startup, account, recovery settings
3. Optionally exports registry keys
4. Creates JSON configuration file
5. Documents dependencies and permissions

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES for complete export
- Registry export enables full restoration
- Typical use: backup before changes, documentation
- Keep exports in secure location (may contain paths)
- Review before sharing externally
- Export before major system changes`,
    parameters: [
      { id: 'serviceName', label: 'Service Name (blank for all)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Directory', type: 'path', required: true, placeholder: 'C:\\ServiceBackups' },
      { id: 'includeRegistry', label: 'Include Registry Backup', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serviceName = params.serviceName ? escapePowerShellString(params.serviceName) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      const includeRegistry = toPowerShellBoolean(params.includeRegistry ?? true);
      
      return `# Export Service Configuration
# Generated: ${new Date().toISOString()}

$ServiceFilter = "${serviceName}"
$ExportPath = "${exportPath}"
$IncludeRegistry = ${includeRegistry}

# Create export directory
if (-not (Test-Path $ExportPath)) {
    New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "Exporting service configuration..." -ForegroundColor Cyan
Write-Host "  Export path: $ExportPath" -ForegroundColor Gray
Write-Host ""

# Get services to export
if ($ServiceFilter) {
    $Services = Get-WmiObject Win32_Service -Filter "Name='$ServiceFilter'"
    if (-not $Services) {
        Write-Host "[FAILED] Service not found: $ServiceFilter" -ForegroundColor Red
        exit 1
    }
} else {
    $Services = Get-WmiObject Win32_Service
}

Write-Host "Exporting $($Services.Count) service(s)..." -ForegroundColor Yellow

$ExportData = @()

foreach ($Service in $Services) {
    # Get additional info from PowerShell cmdlet
    $PSService = Get-Service -Name $Service.Name -ErrorAction SilentlyContinue
    
    $Config = [PSCustomObject]@{
        ExportDate = (Get-Date).ToString("o")
        ComputerName = $env:COMPUTERNAME
        ServiceName = $Service.Name
        DisplayName = $Service.DisplayName
        Description = $Service.Description
        PathName = $Service.PathName
        State = $Service.State
        StartMode = $Service.StartMode
        StartName = $Service.StartName
        ProcessId = $Service.ProcessId
        CanPauseAndContinue = $PSService.CanPauseAndContinue
        CanStop = $PSService.CanStop
        DependsOn = ($PSService.ServicesDependedOn | Select-Object -ExpandProperty Name) -join ','
        DependentServices = ($PSService.DependentServices | Select-Object -ExpandProperty Name) -join ','
    }
    
    $ExportData += $Config
    
    # Registry backup if requested
    if ($IncludeRegistry) {
        $RegExportFile = Join-Path $ExportPath "$($Service.Name)_$Timestamp.reg"
        reg export "HKLM\\SYSTEM\\CurrentControlSet\\Services\\$($Service.Name)" $RegExportFile /y 2>$null | Out-Null
    }
}

# Export to JSON
$JsonFile = Join-Path $ExportPath "ServiceConfig_$Timestamp.json"
$ExportData | ConvertTo-Json -Depth 10 | Out-File $JsonFile -Encoding UTF8

# Export to CSV
$CsvFile = Join-Path $ExportPath "ServiceConfig_$Timestamp.csv"
$ExportData | Export-Csv $CsvFile -NoTypeInformation

Write-Host ""
Write-Host "[SUCCESS] Export completed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Exported files:" -ForegroundColor Yellow
Write-Host "  JSON: $JsonFile" -ForegroundColor Gray
Write-Host "  CSV: $CsvFile" -ForegroundColor Gray
if ($IncludeRegistry) {
    Write-Host "  Registry: $($Services.Count) .reg file(s)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Total services exported: $($ExportData.Count)" -ForegroundColor Cyan`;
    }
  },

  {
    id: 'compare-service-baseline',
    name: 'Compare Services to Baseline',
    category: 'Reporting',
    description: 'Compare current service configuration against a saved baseline',
    isPremium: true,
    instructions: `**How This Task Works:**
- Compares current services to a baseline configuration
- Identifies new, removed, or changed services
- Detects configuration drift over time
- Essential for change management and compliance

**Prerequisites:**
- PowerShell 5.1 or later
- Baseline JSON file from previous export
- Standard user permissions for comparison
- Administrator for complete details

**What You Need to Provide:**
- Path to baseline JSON file
- Optional: export path for comparison report

**What the Script Does:**
1. Loads baseline configuration from JSON
2. Retrieves current service configuration
3. Compares service lists (additions/removals)
4. Compares settings for matching services
5. Generates detailed change report

**Important Notes:**
- Baseline file must be valid JSON from Export task
- Changes flagged may be intentional
- Typical use: drift detection, compliance audits
- Review changes before taking action
- Create new baseline after approved changes
- Automate for continuous monitoring`,
    parameters: [
      { id: 'baselinePath', label: 'Baseline JSON File Path', type: 'path', required: true, placeholder: 'C:\\Baselines\\ServiceConfig.json' },
      { id: 'exportPath', label: 'Export Report Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const baselinePath = escapePowerShellString(params.baselinePath);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Compare Services to Baseline
# Generated: ${new Date().toISOString()}

$BaselinePath = "${baselinePath}"

Write-Host "Comparing services to baseline..." -ForegroundColor Cyan
Write-Host "  Baseline: $BaselinePath" -ForegroundColor Gray
Write-Host ""

# Load baseline
if (-not (Test-Path $BaselinePath)) {
    Write-Host "[FAILED] Baseline file not found: $BaselinePath" -ForegroundColor Red
    exit 1
}

try {
    $Baseline = Get-Content $BaselinePath -Raw | ConvertFrom-Json
} catch {
    Write-Host "[FAILED] Invalid baseline JSON file" -ForegroundColor Red
    exit 1
}

Write-Host "Baseline date: $($Baseline[0].ExportDate)" -ForegroundColor Gray
Write-Host "Baseline services: $($Baseline.Count)" -ForegroundColor Gray
Write-Host ""

# Get current services
$CurrentServices = Get-WmiObject Win32_Service | ForEach-Object {
    [PSCustomObject]@{
        ServiceName = $_.Name
        DisplayName = $_.DisplayName
        State = $_.State
        StartMode = $_.StartMode
        StartName = $_.StartName
    }
}

$Changes = @()

# Check for new services
$BaselineNames = $Baseline.ServiceName
$CurrentNames = $CurrentServices.ServiceName

$NewServices = $CurrentNames | Where-Object { $_ -notin $BaselineNames }
$RemovedServices = $BaselineNames | Where-Object { $_ -notin $CurrentNames }

# Check for changed services
foreach ($Current in $CurrentServices) {
    if ($Current.ServiceName -in $RemovedServices -or $Current.ServiceName -in $NewServices) {
        continue
    }
    
    $BaselineService = $Baseline | Where-Object { $_.ServiceName -eq $Current.ServiceName }
    
    $ServiceChanges = @()
    if ($Current.State -ne $BaselineService.State) {
        $ServiceChanges += "State: $($BaselineService.State) -> $($Current.State)"
    }
    if ($Current.StartMode -ne $BaselineService.StartMode) {
        $ServiceChanges += "StartMode: $($BaselineService.StartMode) -> $($Current.StartMode)"
    }
    if ($Current.StartName -ne $BaselineService.StartName) {
        $ServiceChanges += "Account: $($BaselineService.StartName) -> $($Current.StartName)"
    }
    
    if ($ServiceChanges.Count -gt 0) {
        $Changes += [PSCustomObject]@{
            ServiceName = $Current.ServiceName
            ChangeType = "Modified"
            Details = $ServiceChanges -join "; "
        }
    }
}

# Add new and removed
$NewServices | ForEach-Object {
    $Changes += [PSCustomObject]@{
        ServiceName = $_
        ChangeType = "Added"
        Details = "New service since baseline"
    }
}

$RemovedServices | ForEach-Object {
    $Changes += [PSCustomObject]@{
        ServiceName = $_
        ChangeType = "Removed"
        Details = "Service no longer exists"
    }
}

# Display results
Write-Host "COMPARISON RESULTS:" -ForegroundColor Yellow
Write-Host "  Current services: $($CurrentServices.Count)" -ForegroundColor Gray
Write-Host "  New services: $($NewServices.Count)" -ForegroundColor $(if ($NewServices.Count -gt 0) { "Cyan" } else { "Gray" })
Write-Host "  Removed services: $($RemovedServices.Count)" -ForegroundColor $(if ($RemovedServices.Count -gt 0) { "Red" } else { "Gray" })
Write-Host "  Modified services: $($Changes.Count - $NewServices.Count - $RemovedServices.Count)" -ForegroundColor $(if ($Changes.Count -gt 0) { "Yellow" } else { "Gray" })
Write-Host ""

if ($Changes.Count -eq 0) {
    Write-Host "[SUCCESS] No changes detected - configuration matches baseline" -ForegroundColor Green
} else {
    Write-Host "CHANGES DETECTED:" -ForegroundColor Red
    Write-Host ""
    
    $Changes | ForEach-Object {
        $Color = switch ($_.ChangeType) {
            "Added" { "Cyan" }
            "Removed" { "Red" }
            "Modified" { "Yellow" }
        }
        Write-Host "[$($_.ChangeType)] $($_.ServiceName)" -ForegroundColor $Color
        Write-Host "  $($_.Details)" -ForegroundColor Gray
    }
}

${exportPath ? `
$Changes | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-service-event-history',
    name: 'Get Service Event History',
    category: 'Service Monitoring',
    description: 'Retrieve detailed event log history for a specific service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Retrieves all events related to a specific service
- Includes start, stop, failure, and configuration events
- Shows timeline of service activity
- Essential for troubleshooting and auditing

**Prerequisites:**
- PowerShell 5.1 or later
- Event Log read access
- Service must exist on system
- Sufficient event log retention

**What You Need to Provide:**
- Service name to analyze
- Days of history to retrieve
- Optional: CSV export path

**What the Script Does:**
1. Queries System and Application event logs
2. Filters for service-specific events
3. Sorts events chronologically
4. Categorizes events by type
5. Displays timeline with details

**Important Notes:**
- Event retention depends on log configuration
- Some services generate many events
- Typical use: troubleshooting, root cause analysis
- Check both System and Application logs
- Consider filtering by severity for large datasets`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' },
      { id: 'daysBack', label: 'Days of History', type: 'number', required: false, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const daysBack = Number(params.daysBack || 7);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Service Event History
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$DaysBack = ${daysBack}
$StartTime = (Get-Date).AddDays(-$DaysBack)

Write-Host "Retrieving event history for: $ServiceName" -ForegroundColor Cyan
Write-Host "  Period: Last $DaysBack days" -ForegroundColor Gray
Write-Host ""

# Verify service exists
$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Searching event logs..." -ForegroundColor Yellow

# Query System log for service events
$ServiceEvents = @()

# Service Control Manager events (System log)
$SCMEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = 'Service Control Manager'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { $_.Message -match $ServiceName }

if ($SCMEvents) {
    $ServiceEvents += $SCMEvents | ForEach-Object {
        [PSCustomObject]@{
            TimeCreated = $_.TimeCreated
            Source = "System"
            EventId = $_.Id
            Level = $_.LevelDisplayName
            Message = $_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))
        }
    }
}

# Application log events (if service logs there)
$AppEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    StartTime = $StartTime
} -ErrorAction SilentlyContinue | Where-Object { $_.ProviderName -eq $ServiceName -or $_.Message -match $ServiceName } | Select-Object -First 50

if ($AppEvents) {
    $ServiceEvents += $AppEvents | ForEach-Object {
        [PSCustomObject]@{
            TimeCreated = $_.TimeCreated
            Source = "Application"
            EventId = $_.Id
            Level = $_.LevelDisplayName
            Message = $_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))
        }
    }
}

# Sort by time
$ServiceEvents = $ServiceEvents | Sort-Object TimeCreated -Descending

if ($ServiceEvents.Count -eq 0) {
    Write-Host "No events found for service: $ServiceName" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Found $($ServiceEvents.Count) event(s)" -ForegroundColor Green
Write-Host ""

# Summary by level
$ByLevel = $ServiceEvents | Group-Object Level
Write-Host "EVENT SUMMARY:" -ForegroundColor Yellow
$ByLevel | ForEach-Object {
    $Color = switch ($_.Name) {
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "Gray" }
    }
    Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor $Color
}
Write-Host ""

# Show recent events
Write-Host "RECENT EVENTS (last 20):" -ForegroundColor Yellow
$ServiceEvents | Select-Object -First 20 | ForEach-Object {
    $LevelColor = switch ($_.Level) {
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "Gray" }
    }
    Write-Host ""
    Write-Host "[$($_.TimeCreated)] [$($_.Level)]" -ForegroundColor $LevelColor
    Write-Host "  $($_.Message)" -ForegroundColor Gray
}

${exportPath ? `
$ServiceEvents | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Full history exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'configure-gmsa-service',
    name: 'Configure Group Managed Service Account',
    category: 'Service Accounts',
    description: 'Configure a service to use a Group Managed Service Account (gMSA)',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures service to use gMSA for authentication
- Eliminates need for password management
- Enhances security with automatic password rotation
- Requires Active Directory domain environment

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with AD module
- Domain-joined computer
- gMSA must already exist in AD
- Computer must be in gMSA principals group

**What You Need to Provide:**
- Service name to configure
- gMSA account name (DOMAIN\\gMSA$)

**What the Script Does:**
1. Validates gMSA account exists and is accessible
2. Tests computer can retrieve gMSA password
3. Configures service to use gMSA
4. Sets password to empty (managed by AD)
5. Verifies configuration change

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- gMSA must exist before running this script
- Computer must be in PrincipalsAllowedToRetrieveManagedPassword
- Service MUST BE RESTARTED after change
- Typical use: secure service accounts, compliance
- Test thoroughly before production deployment`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'gmsaAccount', label: 'gMSA Account (DOMAIN\\gMSA$)', type: 'text', required: true, placeholder: 'CONTOSO\\svc_webapp$' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const gmsaAccount = escapePowerShellString(params.gmsaAccount);
      
      return `# Configure Group Managed Service Account
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$GMSAAccount = "${gmsaAccount}"

Write-Host "Configuring gMSA for service..." -ForegroundColor Cyan
Write-Host "  Service: $ServiceName" -ForegroundColor Gray
Write-Host "  gMSA: $GMSAAccount" -ForegroundColor Gray
Write-Host ""

# Verify domain membership
if (-not (Get-WmiObject Win32_ComputerSystem).PartOfDomain) {
    Write-Host "[FAILED] This computer is not domain-joined" -ForegroundColor Red
    Write-Host "  gMSA requires Active Directory domain membership" -ForegroundColor Yellow
    exit 1
}

# Verify service exists
$Service = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"
if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

# Validate gMSA account format
if ($GMSAAccount -notmatch '\\$\$') {
    Write-Host "[WARNING] gMSA account should end with \$ (e.g., DOMAIN\\account\$)" -ForegroundColor Yellow
}

# Test gMSA access (requires AD module)
Write-Host "Testing gMSA access..." -ForegroundColor Yellow
try {
    if (Get-Command Test-ADServiceAccount -ErrorAction SilentlyContinue) {
        $AccountName = ($GMSAAccount -split '\\\\')[1]
        $TestResult = Test-ADServiceAccount -Identity $AccountName -ErrorAction Stop
        if ($TestResult) {
            Write-Host "[SUCCESS] gMSA access verified" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] gMSA test returned false - computer may not have access" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARNING] AD PowerShell module not available - skipping gMSA test" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Could not test gMSA access: $_" -ForegroundColor Yellow
}

# Configure service
Write-Host ""
Write-Host "Configuring service account..." -ForegroundColor Yellow

# Use sc.exe to set gMSA (password left empty for managed accounts)
$Result = sc.exe config $ServiceName obj= $GMSAAccount password= "" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Service configured to use gMSA" -ForegroundColor Green
    Write-Host "  Service: $ServiceName" -ForegroundColor Gray
    Write-Host "  Account: $GMSAAccount" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[WARNING] IMPORTANT: Restart the service for changes to take effect" -ForegroundColor Yellow
    Write-Host "  Run: Restart-Service -Name $ServiceName -Force" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "[FAILED] Failed to configure service" -ForegroundColor Red
    Write-Host "  Error: $Result" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Yellow
    Write-Host "  1. gMSA account exists in AD" -ForegroundColor Gray
    Write-Host "  2. Computer is in PrincipalsAllowedToRetrieveManagedPassword" -ForegroundColor Gray
    Write-Host "  3. DNS and domain connectivity" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'set-service-description',
    name: 'Set Service Description',
    category: 'Service Configuration',
    description: 'Update the description text for a Windows service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Updates the description displayed in services.msc
- Improves documentation and discoverability
- Does not affect service functionality
- Persists across reboots

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system

**What You Need to Provide:**
- Service name (not display name)
- New description text

**What the Script Does:**
1. Validates service exists
2. Updates description via sc.exe
3. Verifies description was set
4. Displays new description

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Description is visible in Services console
- Useful for custom/third-party services
- Typical use: documentation, identification
- Does not affect service behavior
- Clear descriptions help with troubleshooting`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'This service provides...' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const description = escapePowerShellString(params.description);
      
      return `# Set Service Description
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Description = "${description}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Updating service description..." -ForegroundColor Cyan
Write-Host "  Service: $($Service.DisplayName)" -ForegroundColor Gray

# Set description using sc.exe
sc.exe description $ServiceName $Description | Out-Null

if ($LASTEXITCODE -eq 0) {
    # Verify
    $WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"
    
    Write-Host ""
    Write-Host "[SUCCESS] Description updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current description:" -ForegroundColor Yellow
    Write-Host "  $($WMIService.Description)" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Failed to update description" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'clear-service-dependencies',
    name: 'Clear Service Dependencies',
    category: 'Service Dependencies',
    description: 'Remove all dependencies from a Windows service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes all startup dependencies from a service
- Makes service completely standalone
- Useful for troubleshooting dependency issues
- Service will start regardless of other services

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system
- sc.exe utility (built into Windows)

**What You Need to Provide:**
- Service name (not display name)
- Confirmation to proceed

**What the Script Does:**
1. Validates service exists
2. Shows current dependencies
3. Removes all dependencies
4. Verifies removal
5. Displays new configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- HIGH RISK: Service may fail if it needs dependencies
- Document original dependencies before clearing
- Typical use: troubleshooting, testing
- Service restart required for change to take effect
- Consider Set Service Dependencies to restore if needed`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'confirm', label: 'Confirm Removal', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const confirm = toPowerShellBoolean(params.confirm ?? false);
      
      return `# Clear Service Dependencies
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Confirm = ${confirm}

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Service: $($Service.DisplayName)" -ForegroundColor Cyan
Write-Host ""

# Show current dependencies
Write-Host "Current dependencies:" -ForegroundColor Yellow
if ($Service.ServicesDependedOn.Count -gt 0) {
    $Service.ServicesDependedOn | ForEach-Object {
        Write-Host "  - $($_.DisplayName) ($($_.Name))" -ForegroundColor Gray
    }
} else {
    Write-Host "  (None)" -ForegroundColor Gray
}

Write-Host ""

if (-not $Confirm) {
    Write-Host "[WARNING] Confirmation required to clear dependencies" -ForegroundColor Yellow
    Write-Host "  Set 'Confirm Removal' to true to proceed" -ForegroundColor Gray
    exit 0
}

# Clear dependencies using sc.exe
Write-Host "Removing all dependencies..." -ForegroundColor Yellow
sc.exe config $ServiceName depend= "" | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Dependencies cleared successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "[WARNING] Restart service for changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[FAILED] Failed to clear dependencies" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-service-permissions',
    name: 'Get Service Security Permissions',
    category: 'Service Accounts',
    description: 'View the security descriptor and access permissions for a service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Retrieves security permissions for a Windows service
- Shows who can start, stop, and configure the service
- Essential for security audits
- Identifies potential permission issues

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist on system
- sc.exe utility (built into Windows)

**What You Need to Provide:**
- Service name (not display name)

**What the Script Does:**
1. Validates service exists
2. Retrieves service security descriptor
3. Parses and displays permissions
4. Shows DACL entries
5. Identifies high-risk permissions

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Complex output - requires understanding of SDDL
- Typical use: security audits, troubleshooting access
- Default permissions are usually appropriate
- Modifying permissions can break service management
- Document before changing permissions`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      
      return `# Get Service Security Permissions
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Service Security Permissions" -ForegroundColor Cyan
Write-Host "Service: $($Service.DisplayName)" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

# Get security descriptor using sc.exe
$SDDL = sc.exe sdshow $ServiceName 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILED] Failed to retrieve security descriptor" -ForegroundColor Red
    exit 1
}

Write-Host "Security Descriptor (SDDL):" -ForegroundColor Yellow
Write-Host "  $SDDL" -ForegroundColor Gray
Write-Host ""

# Try to parse common permission patterns
Write-Host "Parsed Permissions:" -ForegroundColor Yellow

# Common SID translations
$SIDMap = @{
    "BA" = "Built-in Administrators"
    "SY" = "Local System"
    "WD" = "Everyone"
    "IU" = "Interactive Users"
    "AU" = "Authenticated Users"
    "LS" = "Local Service"
    "NS" = "Network Service"
    "BU" = "Built-in Users"
    "NO" = "Network Configuration Operators"
    "PU" = "Power Users"
}

# Common permission masks
$PermissionMap = @{
    "CC" = "Query Configuration"
    "LC" = "Query Status"
    "SW" = "Enumerate Dependents"
    "LO" = "Interrogate"
    "RC" = "Read Control"
    "RP" = "Start"
    "WP" = "Stop"
    "DT" = "Pause/Continue"
    "CR" = "User-defined Control"
    "SD" = "Delete"
    "WD" = "Write DAC"
    "WO" = "Write Owner"
}

# Extract and display DACL entries
$DACLMatch = $SDDL -match 'D:(.+)'
if ($Matches[1]) {
    $DACL = $Matches[1]
    
    # Parse ACE entries (simplified)
    $ACEPattern = '\\(([^)]+)\\)'
    $ACEs = [regex]::Matches($DACL, $ACEPattern)
    
    foreach ($ACE in $ACEs) {
        $ACEText = $ACE.Groups[1].Value
        $Parts = $ACEText -split ';'
        
        if ($Parts.Count -ge 6) {
            $AceType = if ($Parts[0] -eq "A") { "Allow" } else { "Deny" }
            $Trustee = $Parts[5]
            
            # Translate SID
            $TrusteeName = if ($SIDMap[$Trustee]) { $SIDMap[$Trustee] } else { $Trustee }
            
            Write-Host "  $AceType : $TrusteeName" -ForegroundColor $(if ($AceType -eq "Allow") { "Green" } else { "Red" })
        }
    }
}

Write-Host ""
Write-Host "NOTE:" -ForegroundColor Gray
Write-Host "  SDDL format is complex. Use 'sc sdshow' and 'sc sdset' for modifications." -ForegroundColor Gray
Write-Host "  Consult Microsoft documentation for detailed SDDL syntax." -ForegroundColor Gray`;
    }
  },

  {
    id: 'generate-service-compliance-report',
    name: 'Generate Service Compliance Report',
    category: 'Reporting',
    description: 'Generate a compliance report for service configurations against best practices',
    isPremium: true,
    instructions: `**How This Task Works:**
- Audits all services against security best practices
- Checks for common misconfigurations
- Identifies compliance issues
- Generates actionable recommendations

**Prerequisites:**
- Administrator privileges for complete audit
- PowerShell 5.1 or later
- WMI access required

**What You Need to Provide:**
- Optional: CSV export path for full report

**What the Script Does:**
1. Scans all Windows services
2. Checks startup type appropriateness
3. Audits service accounts for security
4. Validates recovery configurations
5. Scores overall compliance
6. Provides remediation guidance

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES for full audit
- Recommendations are guidelines, not absolute rules
- Some exceptions may be valid for your environment
- Typical use: security audits, CIS benchmarks
- Review findings before making changes
- Document any approved exceptions`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Generate Service Compliance Report
# Generated: ${new Date().toISOString()}

Write-Host "Service Compliance Audit" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

$ComplianceIssues = @()
$Warnings = @()
$Passed = @()

$Services = Get-WmiObject Win32_Service

foreach ($Service in $Services) {
    $Issues = @()
    
    # Check 1: Unnecessary auto-start services
    $CriticalAutoServices = @("EventLog", "PlugPlay", "RpcSs", "DcomLaunch", "LSM", "Winmgmt")
    if ($Service.StartMode -eq "Auto" -and $Service.State -ne "Running" -and $Service.Name -notin $CriticalAutoServices) {
        $Issues += "Auto-start service not running"
    }
    
    # Check 2: Services running as LocalSystem that shouldn't
    $AllowedLocalSystem = @("Spooler", "W32Time", "PlugPlay", "EventLog", "MSDTC", "netprofm", "NlaSvc")
    if ($Service.StartName -match "LocalSystem|SYSTEM" -and $Service.Name -notin $AllowedLocalSystem -and $Service.State -eq "Running") {
        $Issues += "Running as LocalSystem (high privilege)"
    }
    
    # Check 3: Disabled but should be enabled
    $ShouldBeEnabled = @("EventLog", "RpcSs", "Winmgmt")
    if ($Service.StartMode -eq "Disabled" -and $Service.Name -in $ShouldBeEnabled) {
        $Issues += "Critical service is disabled"
    }
    
    # Check 4: Custom account without proper notation
    if ($Service.StartName -and $Service.StartName -match "\\\\" -and $Service.StartName -notmatch "\\$\$" -and $Service.StartName -notmatch "NT AUTHORITY") {
        $Warnings += [PSCustomObject]@{
            ServiceName = $Service.Name
            DisplayName = $Service.DisplayName
            Issue = "Custom account - consider gMSA"
            Severity = "Warning"
        }
    }
    
    if ($Issues.Count -gt 0) {
        foreach ($Issue in $Issues) {
            $ComplianceIssues += [PSCustomObject]@{
                ServiceName = $Service.Name
                DisplayName = $Service.DisplayName
                Issue = $Issue
                Severity = "Issue"
                Account = $Service.StartName
                Status = $Service.State
            }
        }
    }
}

# Calculate score
$TotalServices = $Services.Count
$IssueCount = $ComplianceIssues.Count
$WarningCount = $Warnings.Count
$ComplianceScore = [Math]::Round((1 - ($IssueCount / $TotalServices)) * 100, 1)

Write-Host "COMPLIANCE SUMMARY:" -ForegroundColor Yellow
Write-Host "  Total Services: $TotalServices" -ForegroundColor Gray
Write-Host "  Compliance Issues: $IssueCount" -ForegroundColor $(if ($IssueCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Warnings: $WarningCount" -ForegroundColor $(if ($WarningCount -gt 0) { "Yellow" } else { "Gray" })
Write-Host ""

if ($ComplianceScore -ge 95) {
    Write-Host "  Compliance Score: $ComplianceScore% (Excellent)" -ForegroundColor Green
} elseif ($ComplianceScore -ge 80) {
    Write-Host "  Compliance Score: $ComplianceScore% (Good)" -ForegroundColor Yellow
} else {
    Write-Host "  Compliance Score: $ComplianceScore% (Needs Improvement)" -ForegroundColor Red
}

Write-Host ""

if ($ComplianceIssues.Count -gt 0) {
    Write-Host "COMPLIANCE ISSUES:" -ForegroundColor Red
    $ComplianceIssues | ForEach-Object {
        Write-Host "  [$($_.Severity)] $($_.DisplayName)" -ForegroundColor Yellow
        Write-Host "    Issue: $($_.Issue)" -ForegroundColor Gray
        Write-Host "    Account: $($_.Account)" -ForegroundColor Gray
    }
    Write-Host ""
}

if ($Warnings.Count -gt 0) {
    Write-Host "WARNINGS:" -ForegroundColor Yellow
    $Warnings | ForEach-Object {
        Write-Host "  $($_.DisplayName): $($_.Issue)" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "RECOMMENDATIONS:" -ForegroundColor Cyan
Write-Host "  1. Review auto-start services that are stopped" -ForegroundColor Gray
Write-Host "  2. Minimize LocalSystem usage where possible" -ForegroundColor Gray
Write-Host "  3. Consider Group Managed Service Accounts (gMSA)" -ForegroundColor Gray
Write-Host "  4. Ensure critical services are enabled" -ForegroundColor Gray
Write-Host "  5. Configure recovery options for important services" -ForegroundColor Gray

${exportPath ? `
$AllFindings = $ComplianceIssues + $Warnings
$AllFindings | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Full report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'bulk-set-startup-type',
    name: 'Bulk Set Startup Type',
    category: 'Bulk Operations',
    description: 'Change startup type for multiple services matching a pattern',
    isPremium: true,
    instructions: `**How This Task Works:**
- Changes startup type for multiple services at once
- Uses pattern matching to select services
- Test mode for preview before changes
- Efficient for bulk configuration

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Pattern must match intended services

**What You Need to Provide:**
- Service name pattern with wildcards
- Target startup type
- Test mode option

**What the Script Does:**
1. Finds services matching pattern
2. Displays list of matching services
3. In test mode: shows without changing
4. In execution mode: changes each service
5. Reports success/failure for each

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Test mode enabled by default for safety
- Typical use: security hardening, optimization
- Review pattern matches carefully
- Some services may reject changes
- Document original settings before bulk changes`,
    parameters: [
      { id: 'pattern', label: 'Service Name Pattern', type: 'text', required: true, placeholder: 'Remote*' },
      { id: 'startupType', label: 'Startup Type', type: 'select', required: true, options: ['Automatic', 'Manual', 'Disabled'], defaultValue: 'Manual' },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const pattern = escapePowerShellString(params.pattern);
      const startupType = params.startupType;
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Bulk Set Startup Type
# Generated: ${new Date().toISOString()}

$Pattern = "${pattern}"
$StartupType = "${startupType}"
$TestMode = ${testMode}

Write-Host "Bulk Startup Type Configuration" -ForegroundColor Cyan
Write-Host "  Pattern: $Pattern" -ForegroundColor Gray
Write-Host "  Target Startup Type: $StartupType" -ForegroundColor Gray
Write-Host ""

$Services = Get-Service -Name $Pattern -ErrorAction SilentlyContinue

if (-not $Services) {
    Write-Host "[FAILED] No services found matching pattern: $Pattern" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($Services.Count) matching service(s):" -ForegroundColor Yellow
$Services | ForEach-Object {
    $WMI = Get-WmiObject Win32_Service -Filter "Name='$($_.Name)'" -ErrorAction SilentlyContinue
    Write-Host "  - $($_.DisplayName) [Current: $($WMI.StartMode)]" -ForegroundColor Gray
}
Write-Host ""

if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host "  Set Test Mode to false to apply changes" -ForegroundColor Gray
    exit 0
}

Write-Host "Applying changes..." -ForegroundColor Yellow
Write-Host ""

$Success = 0
$Failed = 0

foreach ($Service in $Services) {
    try {
        Set-Service -Name $Service.Name -StartupType $StartupType -ErrorAction Stop
        Write-Host "  [OK] $($Service.Name)" -ForegroundColor Green
        $Success++
    } catch {
        Write-Host "  [FAILED] $($Service.Name): $_" -ForegroundColor Red
        $Failed++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "  Successful: $Success" -ForegroundColor Green
Write-Host "  Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Gray" })`;
    }
  },

  {
    id: 'monitor-service-resource-usage',
    name: 'Monitor Service Resource Usage',
    category: 'Service Monitoring',
    description: 'Monitor CPU and memory usage for a specific service',
    isPremium: true,
    instructions: `**How This Task Works:**
- Monitors resource consumption of a running service
- Tracks CPU and memory usage over time
- Identifies resource-intensive services
- Helps with capacity planning

**Prerequisites:**
- PowerShell 5.1 or later
- Service must be running
- Standard user permissions for basic monitoring

**What You Need to Provide:**
- Service name to monitor
- Number of samples to collect
- Interval between samples (seconds)

**What the Script Does:**
1. Validates service is running
2. Gets service process ID
3. Collects resource samples at specified interval
4. Calculates average and peak usage
5. Displays usage statistics

**Important Notes:**
- Only works for running services
- Some services share svchost.exe (grouped)
- Typical use: performance troubleshooting, capacity planning
- Longer sampling provides more accurate data
- Consider external monitoring for production systems`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'Spooler' },
      { id: 'samples', label: 'Number of Samples', type: 'number', required: false, defaultValue: 5 },
      { id: 'interval', label: 'Interval (seconds)', type: 'number', required: false, defaultValue: 2 }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const samples = Number(params.samples || 5);
      const interval = Number(params.interval || 2);
      
      return `# Monitor Service Resource Usage
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Samples = ${samples}
$Interval = ${interval}

Write-Host "Service Resource Monitor" -ForegroundColor Cyan
Write-Host "  Service: $ServiceName" -ForegroundColor Gray
Write-Host "  Samples: $Samples @ ${interval}s intervals" -ForegroundColor Gray
Write-Host ""

# Verify service exists and is running
$WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"

if (-not $WMIService) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

if ($WMIService.State -ne "Running") {
    Write-Host "[FAILED] Service is not running: $ServiceName (Status: $($WMIService.State))" -ForegroundColor Red
    exit 1
}

$ProcessId = $WMIService.ProcessId

if ($ProcessId -eq 0) {
    Write-Host "[FAILED] Service has no associated process" -ForegroundColor Red
    exit 1
}

Write-Host "Process ID: $ProcessId" -ForegroundColor Gray

# Check if svchost (shared)
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
if ($Process.Name -eq "svchost") {
    Write-Host "[WARNING] Service runs in shared svchost - resource usage may include other services" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Collecting samples..." -ForegroundColor Yellow
Write-Host ""

$ResourceData = @()

for ($i = 1; $i -le $Samples; $i++) {
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    
    if (-not $Process) {
        Write-Host "[WARNING] Process terminated during monitoring" -ForegroundColor Yellow
        break
    }
    
    $CPUTime = $Process.CPU
    $MemoryMB = [Math]::Round($Process.WorkingSet64 / 1MB, 2)
    $ThreadCount = $Process.Threads.Count
    $HandleCount = $Process.HandleCount
    
    $Sample = [PSCustomObject]@{
        SampleNum = $i
        CPUTime = $CPUTime
        MemoryMB = $MemoryMB
        Threads = $ThreadCount
        Handles = $HandleCount
    }
    
    $ResourceData += $Sample
    
    Write-Host "Sample $i\`: CPU=$CPUTime s, Memory=$MemoryMB MB, Threads=$ThreadCount, Handles=$HandleCount" -ForegroundColor Gray
    
    if ($i -lt $Samples) {
        Start-Sleep -Seconds $Interval
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host "RESOURCE SUMMARY:" -ForegroundColor Yellow

$AvgMemory = [Math]::Round(($ResourceData.MemoryMB | Measure-Object -Average).Average, 2)
$MaxMemory = ($ResourceData.MemoryMB | Measure-Object -Maximum).Maximum
$AvgThreads = [Math]::Round(($ResourceData.Threads | Measure-Object -Average).Average)
$MaxHandles = ($ResourceData.Handles | Measure-Object -Maximum).Maximum

Write-Host "  Average Memory: $AvgMemory MB" -ForegroundColor Gray
Write-Host "  Peak Memory: $MaxMemory MB" -ForegroundColor Gray
Write-Host "  Average Threads: $AvgThreads" -ForegroundColor Gray
Write-Host "  Peak Handles: $MaxHandles" -ForegroundColor Gray

# Simple assessment
if ($MaxMemory -gt 500) {
    Write-Host ""
    Write-Host "[WARNING] High memory usage detected (>500 MB)" -ForegroundColor Yellow
} elseif ($MaxMemory -gt 200) {
    Write-Host ""
    Write-Host "Memory usage is moderate" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "[SUCCESS] Memory usage is within normal range" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'get-services-by-account',
    name: 'List Services by Account',
    category: 'Service Discovery',
    description: 'List all services running under a specific account',
    isPremium: true,
    instructions: `**How This Task Works:**
- Finds all services configured to run under a specific account
- Useful for password rotation planning
- Essential for service account auditing
- Supports partial matching

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for basic info
- WMI access required

**What You Need to Provide:**
- Account name or partial match
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all Windows services
2. Filters by service account
3. Groups services by exact account
4. Displays service count and details
5. Optionally exports to CSV

**Important Notes:**
- Supports partial matching (e.g., "CONTOSO" matches all CONTOSO accounts)
- Use full account name for exact match
- Typical use: password rotation, account auditing
- Shows both running and stopped services
- Include domain in search for domain accounts`,
    parameters: [
      { id: 'accountName', label: 'Account Name (or partial)', type: 'text', required: true, placeholder: 'NetworkService or DOMAIN\\user' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const accountName = escapePowerShellString(params.accountName);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List Services by Account
# Generated: ${new Date().toISOString()}

$AccountFilter = "${accountName}"

Write-Host "Finding services running as: $AccountFilter" -ForegroundColor Cyan
Write-Host ""

$Services = Get-WmiObject Win32_Service | Where-Object { 
    $_.StartName -like "*$AccountFilter*" 
}

if ($Services.Count -eq 0) {
    Write-Host "No services found running under account matching: $AccountFilter" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($Services.Count) service(s):" -ForegroundColor Green
Write-Host ""

# Group by exact account name
$ByAccount = $Services | Group-Object StartName

foreach ($Group in $ByAccount) {
    Write-Host "$($Group.Name): $($Group.Count) service(s)" -ForegroundColor Yellow
    $Group.Group | ForEach-Object {
        $StatusColor = if ($_.State -eq "Running") { "Green" } elseif ($_.State -eq "Stopped") { "Gray" } else { "Yellow" }
        Write-Host "  - $($_.DisplayName) [$($_.State)]" -ForegroundColor $StatusColor
        Write-Host "    Name: $($_.Name) | Startup: $($_.StartMode)" -ForegroundColor Gray
    }
    Write-Host ""
}

# Summary
Write-Host "============================================" -ForegroundColor Gray
$Running = ($Services | Where-Object { $_.State -eq "Running" }).Count
$Stopped = ($Services | Where-Object { $_.State -eq "Stopped" }).Count

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total: $($Services.Count)" -ForegroundColor Gray
Write-Host "  Running: $Running" -ForegroundColor Green
Write-Host "  Stopped: $Stopped" -ForegroundColor Gray

${exportPath ? `
$Services | Select-Object Name, DisplayName, State, StartMode, StartName | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'restart-services-with-delay',
    name: 'Restart Services with Delay',
    category: 'Bulk Operations',
    description: 'Restart multiple services with configurable delay between restarts',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restarts services sequentially with delays
- Reduces impact on system resources
- Allows services to fully stabilize before next restart
- Essential for dependent service chains

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Services must exist on system

**What You Need to Provide:**
- Comma-separated list of service names
- Delay between restarts (seconds)
- Test mode option

**What the Script Does:**
1. Parses service list
2. Validates each service exists
3. In test mode: shows plan without action
4. In execution mode: restarts each with delay
5. Verifies each service started before continuing
6. Reports final status for all services

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Test mode enabled by default
- Order matters for dependent services
- Delay allows dependent services to recover
- Typical use: rolling restarts, maintenance`,
    parameters: [
      { id: 'services', label: 'Service Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Service1, Service2, Service3' },
      { id: 'delaySeconds', label: 'Delay Between Restarts (seconds)', type: 'number', required: false, defaultValue: 5 },
      { id: 'testMode', label: 'Test Mode (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const services = escapePowerShellString(params.services);
      const delaySeconds = Number(params.delaySeconds || 5);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Restart Services with Delay
# Generated: ${new Date().toISOString()}

$ServiceList = "${services}" -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
$DelaySeconds = ${delaySeconds}
$TestMode = ${testMode}

Write-Host "Sequential Service Restart" -ForegroundColor Cyan
Write-Host "  Services: $($ServiceList.Count)" -ForegroundColor Gray
Write-Host "  Delay: $DelaySeconds seconds between restarts" -ForegroundColor Gray
Write-Host ""

if ($ServiceList.Count -eq 0) {
    Write-Host "[FAILED] No services specified" -ForegroundColor Red
    exit 1
}

# Validate all services exist
Write-Host "Validating services..." -ForegroundColor Yellow
$InvalidServices = @()
foreach ($SvcName in $ServiceList) {
    $Svc = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
    if (-not $Svc) {
        $InvalidServices += $SvcName
        Write-Host "  [FAILED] $SvcName - Not found" -ForegroundColor Red
    } else {
        Write-Host "  [OK] $($Svc.DisplayName) [$($Svc.Status)]" -ForegroundColor Green
    }
}

if ($InvalidServices.Count -gt 0) {
    Write-Host ""
    Write-Host "[FAILED] Some services not found. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host ""

if ($TestMode) {
    Write-Host "[WARNING] TEST MODE - Restart order preview:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $ServiceList.Count; $i++) {
        Write-Host "  $($i + 1). $($ServiceList[$i])" -ForegroundColor Gray
        if ($i -lt $ServiceList.Count - 1) {
            Write-Host "     (wait $DelaySeconds seconds)" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    Write-Host "Set Test Mode to false to execute" -ForegroundColor Gray
    exit 0
}

Write-Host "Starting sequential restart..." -ForegroundColor Yellow
Write-Host ""

$Results = @()

for ($i = 0; $i -lt $ServiceList.Count; $i++) {
    $SvcName = $ServiceList[$i]
    Write-Host "[$($i + 1)/$($ServiceList.Count)] Restarting: $SvcName" -ForegroundColor Cyan
    
    try {
        Restart-Service -Name $SvcName -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
        $Status = (Get-Service -Name $SvcName).Status
        
        if ($Status -eq "Running") {
            Write-Host "  [OK] Running" -ForegroundColor Green
            $Results += [PSCustomObject]@{ Service = $SvcName; Status = "Success"; FinalState = $Status }
        } else {
            Write-Host "  [WARNING] Status: $Status" -ForegroundColor Yellow
            $Results += [PSCustomObject]@{ Service = $SvcName; Status = "Warning"; FinalState = $Status }
        }
    } catch {
        Write-Host "  [FAILED] Failed: $_" -ForegroundColor Red
        $Results += [PSCustomObject]@{ Service = $SvcName; Status = "Failed"; FinalState = "Error" }
    }
    
    if ($i -lt $ServiceList.Count - 1) {
        Write-Host "  Waiting $DelaySeconds seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds $DelaySeconds
    }
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Gray
Write-Host "SUMMARY:" -ForegroundColor Cyan
$Success = ($Results | Where-Object { $_.Status -eq "Success" }).Count
$Failed = ($Results | Where-Object { $_.Status -ne "Success" }).Count
Write-Host "  Successful: $Success" -ForegroundColor Green
Write-Host "  Issues: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Gray" })`;
    }
  },

  {
    id: 'get-stopped-auto-services',
    name: 'Find Stopped Auto-Start Services',
    category: 'Service Health',
    description: 'Identify automatic services that are not currently running',
    isPremium: true,
    instructions: `**How This Task Works:**
- Finds services configured to auto-start but currently stopped
- Indicates potential issues or incomplete startup
- Essential for system health monitoring
- Excludes services that are meant to be stopped

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions
- WMI access for full details

**What You Need to Provide:**
- Optional: exclude trigger-start services
- Optional: CSV export path

**What the Script Does:**
1. Retrieves all automatic start services
2. Filters to only stopped services
3. Excludes known trigger-start services if requested
4. Analyzes potential causes
5. Provides remediation options

**Important Notes:**
- Some auto-start services use triggers (start on demand)
- Not all stopped auto-start services indicate problems
- Typical use: post-boot verification, health checks
- Check Event Viewer for startup failure details
- Consider dependencies that may be stopping services`,
    parameters: [
      { id: 'excludeTrigger', label: 'Exclude Trigger-Start Services', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const excludeTrigger = toPowerShellBoolean(params.excludeTrigger ?? true);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Stopped Auto-Start Services
# Generated: ${new Date().toISOString()}

$ExcludeTrigger = ${excludeTrigger}

Write-Host "Finding stopped auto-start services..." -ForegroundColor Cyan
Write-Host ""

# Common trigger-start services that are normally stopped
$TriggerServices = @(
    "AppReadiness", "BITS", "DoSvc", "DusmSvc", "InstallService",
    "MapsBroker", "WMPNetworkSvc", "XblAuthManager", "XblGameSave",
    "diagnosticshub.standardcollector.service", "lfsvc", "WerSvc"
)

$AutoServices = Get-WmiObject Win32_Service | Where-Object { 
    $_.StartMode -eq "Auto" -and $_.State -eq "Stopped"
}

if ($ExcludeTrigger) {
    $AutoServices = $AutoServices | Where-Object { $_.Name -notin $TriggerServices }
}

if ($AutoServices.Count -eq 0) {
    Write-Host "[SUCCESS] All auto-start services are running" -ForegroundColor Green
    exit 0
}

Write-Host "[WARNING] Found $($AutoServices.Count) stopped auto-start service(s):" -ForegroundColor Yellow
Write-Host ""

$Report = $AutoServices | ForEach-Object {
    [PSCustomObject]@{
        ServiceName = $_.Name
        DisplayName = $_.DisplayName
        Account = $_.StartName
        StartMode = $_.StartMode
        State = $_.State
    }
}

$Report | ForEach-Object {
    Write-Host "$($_.DisplayName)" -ForegroundColor Yellow
    Write-Host "  Name: $($_.ServiceName)" -ForegroundColor Gray
    Write-Host "  Account: $($_.Account)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Gray
Write-Host "RECOMMENDATIONS:" -ForegroundColor Cyan
Write-Host "  1. Check Event Viewer > System for startup errors" -ForegroundColor Gray
Write-Host "  2. Verify service dependencies are running" -ForegroundColor Gray
Write-Host "  3. Confirm service account has correct permissions" -ForegroundColor Gray
Write-Host "  4. Try starting services manually to see errors" -ForegroundColor Gray

${exportPath ? `
$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-new-services',
    name: 'Find Recently Installed Services',
    category: 'Service Discovery',
    description: 'Identify services installed within a specified time period',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies services installed recently
- Uses registry timestamps to determine installation time
- Helps track changes to service configuration
- Essential for security and change management

**Prerequisites:**
- Administrator privileges for registry access
- PowerShell 5.1 or later
- Registry access to Services key

**What You Need to Provide:**
- Days back to search (default: 7)
- Optional: CSV export path

**What the Script Does:**
1. Enumerates service registry keys
2. Checks last write time on each key
3. Filters services modified within timeframe
4. Sorts by modification date
5. Displays recently added services

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES for accurate results
- Registry timestamp shows last modification, not just creation
- May include updated services, not just new ones
- Typical use: change tracking, security auditing
- Combine with software installation logs for context`,
    parameters: [
      { id: 'daysBack', label: 'Days Back to Search', type: 'number', required: false, defaultValue: 7 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const daysBack = Number(params.daysBack || 7);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Recently Installed Services
# Generated: ${new Date().toISOString()}

$DaysBack = ${daysBack}
$CutoffDate = (Get-Date).AddDays(-$DaysBack)

Write-Host "Finding services modified in the last $DaysBack days..." -ForegroundColor Cyan
Write-Host "  Cutoff date: $($CutoffDate.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
Write-Host ""

$ServicesPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services"

$RecentServices = @()

Get-ChildItem $ServicesPath -ErrorAction SilentlyContinue | ForEach-Object {
    $ServiceKey = $_
    $LastWriteTime = $ServiceKey.LastWriteTime
    
    if ($LastWriteTime -gt $CutoffDate) {
        # Get service details
        $ServiceName = $ServiceKey.PSChildName
        $WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
        
        if ($WMIService) {
            $RecentServices += [PSCustomObject]@{
                ServiceName = $ServiceName
                DisplayName = $WMIService.DisplayName
                ModifiedDate = $LastWriteTime
                State = $WMIService.State
                StartMode = $WMIService.StartMode
                Account = $WMIService.StartName
                Path = $WMIService.PathName
            }
        }
    }
}

# Sort by date
$RecentServices = $RecentServices | Sort-Object ModifiedDate -Descending

if ($RecentServices.Count -eq 0) {
    Write-Host "No new or modified services found in the last $DaysBack days" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($RecentServices.Count) recently modified service(s):" -ForegroundColor Yellow
Write-Host ""

$RecentServices | ForEach-Object {
    Write-Host "$($_.DisplayName)" -ForegroundColor Yellow
    Write-Host "  Name: $($_.ServiceName)" -ForegroundColor Gray
    Write-Host "  Modified: $($_.ModifiedDate)" -ForegroundColor Cyan
    Write-Host "  Status: $($_.State) | Startup: $($_.StartMode)" -ForegroundColor Gray
    Write-Host "  Account: $($_.Account)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Gray
Write-Host "NOTE: Modification date may indicate update, not just new installation" -ForegroundColor Gray

${exportPath ? `
$RecentServices | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'kill-service-process',
    name: 'Force Kill Service Process',
    category: 'Troubleshooting',
    description: 'Forcefully terminate a service process that is not responding',
    isPremium: true,
    instructions: `**How This Task Works:**
- Forcefully terminates a service's underlying process
- Bypasses normal service stop procedures
- Last resort for hung or unresponsive services
- Service may auto-restart based on recovery settings

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must have associated process

**What You Need to Provide:**
- Service name (not display name)
- Confirmation to proceed

**What the Script Does:**
1. Validates service exists
2. Gets associated process ID
3. Warns about potential consequences
4. If confirmed, terminates process
5. Verifies service status after termination

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- HIGH RISK: May cause data loss
- Last resort after normal stop fails
- Service may restart automatically (recovery)
- Typical use: hung services, emergency recovery
- Check Event Viewer for crash details`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'MyService' },
      { id: 'confirm', label: 'Confirm Force Kill', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const confirm = toPowerShellBoolean(params.confirm ?? false);
      
      return `# Force Kill Service Process
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$Confirm = ${confirm}

Write-Host "Force Kill Service Process" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""

# Get service
$WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"

if (-not $WMIService) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Service: $($WMIService.DisplayName)" -ForegroundColor Yellow
Write-Host "Status: $($WMIService.State)" -ForegroundColor Gray
Write-Host "Process ID: $($WMIService.ProcessId)" -ForegroundColor Gray
Write-Host ""

$ProcessId = $WMIService.ProcessId

if (-not $ProcessId -or $ProcessId -eq 0) {
    Write-Host "[FAILED] Service has no associated process (may already be stopped)" -ForegroundColor Red
    exit 1
}

# Get process info
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

if (-not $Process) {
    Write-Host "[FAILED] Process ID $ProcessId not found" -ForegroundColor Red
    exit 1
}

Write-Host "Process Details:" -ForegroundColor Yellow
Write-Host "  Name: $($Process.ProcessName)" -ForegroundColor Gray
Write-Host "  ID: $ProcessId" -ForegroundColor Gray
Write-Host "  Memory: $([Math]::Round($Process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Gray
Write-Host ""

if ($Process.ProcessName -eq "svchost") {
    Write-Host "[WARNING] WARNING: This is a svchost process!" -ForegroundColor Red
    Write-Host "  Killing may affect multiple services" -ForegroundColor Yellow
    Write-Host ""
}

if (-not $Confirm) {
    Write-Host "[WARNING] This action will forcefully terminate the process" -ForegroundColor Yellow
    Write-Host "  This may cause data loss or system instability" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Set 'Confirm Force Kill' to true to proceed" -ForegroundColor Gray
    exit 0
}

Write-Host "Terminating process..." -ForegroundColor Red

try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    
    Start-Sleep -Seconds 2
    
    $Service = Get-Service -Name $ServiceName
    Write-Host ""
    Write-Host "[SUCCESS] Process terminated" -ForegroundColor Green
    Write-Host "  Service status: $($Service.Status)" -ForegroundColor Gray
    
    if ($Service.Status -eq "Running") {
        Write-Host "  [WARNING] Service has restarted (recovery options may have triggered)" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "[FAILED] Failed to terminate process" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Gray
}`;
    }
  },
];
