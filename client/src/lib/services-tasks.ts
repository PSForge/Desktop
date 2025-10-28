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
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
        Write-Host "✓ Service started: $ServiceName" -ForegroundColor Green
        
        # Wait and verify
        Start-Sleep -Seconds 2
        $Status = (Get-Service -Name $ServiceName).Status
        Write-Host "  Current status: $Status" -ForegroundColor Gray
    }
} else {
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
        
        Write-Host "✓ Service stopped: $ServiceName" -ForegroundColor Green
        
        # Wait and verify
        Start-Sleep -Seconds 2
        $Status = (Get-Service -Name $ServiceName).Status
        Write-Host "  Current status: $Status" -ForegroundColor Gray
    }
} else {
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
        Write-Host "✓ Service restarted successfully" -ForegroundColor Green
        Write-Host "  Current status: $Status" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Service restart completed but status is: $Status" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
    Write-Host "✓ Startup type set to $StartupType for $ServiceName" -ForegroundColor Green
    
    # Verify
    $WMIService = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"
    Write-Host "  Current startup type: $($WMIService.StartMode)" -ForegroundColor Gray
} else {
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
    Write-Host "✗ Invalid account type" -ForegroundColor Red
    exit 1
}

$Service = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"

if ($Service) {
    if ($Account -eq "Custom" -and $Password) {
        $Service.Change($null, $null, $null, $null, $null, $null, $Credential, $Password)
    } else {
        $Service.Change($null, $null, $null, $null, $null, $null, $Credential, $null)
    }
    
    Write-Host "✓ Service account changed:" -ForegroundColor Green
    Write-Host "  Service: $ServiceName" -ForegroundColor Gray
    Write-Host "  Account: $Credential" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠ Restart service for changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
    
    Write-Host "✓ Service recovery actions configured:" -ForegroundColor Green
    Write-Host "  Service: $ServiceName" -ForegroundColor Gray
    Write-Host "  First failure: ${params.firstFailure}" -ForegroundColor Gray
    Write-Host "  Second failure: ${params.secondFailure}" -ForegroundColor Gray
    Write-Host "  Subsequent failures: ${params.subsequentFailures}" -ForegroundColor Gray
} else {
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
        Write-Host "⚠ TEST MODE - No services started" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Starting services..." -ForegroundColor Cyan
        foreach ($Service in $Services) {
            try {
                Start-Service -Name $Service.Name -ErrorAction Stop
                Write-Host "  ✓ $($Service.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ $($Service.Name): $_" -ForegroundColor Red
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
        Write-Host "⚠ TEST MODE - No services stopped" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "⚠ WARNING: Stopping services..." -ForegroundColor Red
        foreach ($Service in $Services) {
            try {
                Stop-Service -Name $Service.Name -Force -ErrorAction Stop
                Write-Host "  ✓ $($Service.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ $($Service.Name): $_" -ForegroundColor Red
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

Write-Host "✓ Service configuration exported:" -ForegroundColor Green
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
    Write-Host "⚠ Found $($StoppedAuto.Count) stopped automatic service(s):" -ForegroundColor Yellow
    $StoppedAuto | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "These services may need attention" -ForegroundColor Yellow
} else {
    Write-Host "✓ All automatic services are running" -ForegroundColor Green
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
                Write-Host "  ✓ Disabled: $($Service.DisplayName)" -ForegroundColor Green
            }
        } else {
            Write-Host "  Already disabled: $($Service.DisplayName)" -ForegroundColor Gray
        }
    }
}

${testMode ? `Write-Host ""
Write-Host "⚠ TEST MODE - No services were actually disabled" -ForegroundColor Yellow` : `Write-Host ""
Write-Host "✓ Security hardening complete" -ForegroundColor Green`}`;
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
    Write-Host "⚠ Found $($Events.Count) service failure event(s):" -ForegroundColor Red
    
    $Events | ForEach-Object {
        Write-Host ""
        Write-Host "  Time: $($_.TimeCreated)" -ForegroundColor Yellow
        Write-Host "  $($_.Message.Substring(0, [Math]::Min(200, $_.Message.Length)))" -ForegroundColor Gray
    }
} else {
    Write-Host "✓ No service failures detected" -ForegroundColor Green
}`;
    }
  },
];
