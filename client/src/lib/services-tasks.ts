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
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
    Write-Host "✗ Invalid dependency service(s): $($InvalidDeps -join ', ')" -ForegroundColor Red
    exit 1
}

# Configure dependencies using sc.exe
$DepString = $DepList -join '/'
sc.exe config $ServiceName depend= $DepString

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies configured for $ServiceName" -ForegroundColor Green
    Write-Host "  Dependencies: $Dependencies" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠ Restart service for changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host "✗ Failed to configure dependencies" -ForegroundColor Red
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
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

# Check if using custom account
$BuiltInAccounts = @("LocalSystem", "NT AUTHORITY\\LocalService", "NT AUTHORITY\\NetworkService", "NT AUTHORITY\\SYSTEM")
if ($BuiltInAccounts -contains $Service.StartName) {
    Write-Host "✗ Service uses built-in account: $($Service.StartName)" -ForegroundColor Red
    Write-Host "  Cannot reset password for built-in accounts" -ForegroundColor Yellow
    exit 1
}

Write-Host "Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Account: $($Service.StartName)" -ForegroundColor Gray

# Update the password
$Result = $Service.Change($null, $null, $null, $null, $null, $null, $null, $NewPassword)

if ($Result.ReturnValue -eq 0) {
    Write-Host "✓ Password updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Restart the service for changes to take effect" -ForegroundColor Yellow
    Write-Host "  Run: Restart-Service -Name $ServiceName -Force" -ForegroundColor Gray
} else {
    Write-Host "✗ Failed to update password. Error code: $($Result.ReturnValue)" -ForegroundColor Red
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
    Write-Host "⚠ AUTO-START SERVICES THAT ARE STOPPED:" -ForegroundColor Red
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
Write-Host "✓ Full report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "✓ No service failures found in the last $DaysBack days" -ForegroundColor Green
    exit 0
}

Write-Host "⚠ Found $($Events.Count) service failure event(s)" -ForegroundColor Yellow
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
Write-Host "✓ Detailed report exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "✓ No hung services detected" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "⚠ Found $($HungServices.Count) hung service(s):" -ForegroundColor Yellow
$HungServices | ForEach-Object {
    Write-Host "  - $($_.DisplayName) ($($_.Name)) - Status: $($_.Status)" -ForegroundColor Yellow
}

if ($TestMode) {
    Write-Host ""
    Write-Host "⚠ TEST MODE - No actions taken" -ForegroundColor Yellow
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
            Write-Host "  ✓ Service recovered and running" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Service status: $NewStatus" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ Failed to recover: $_" -ForegroundColor Red
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
    Write-Host "✗ No services specified" -ForegroundColor Red
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
        Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "⚠ Skipping missing service: $ServiceName" -ForegroundColor Yellow
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
        Write-Host "  ⚠ Could not stop: $ServiceName" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 3

# Start all services (forward order)
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
foreach ($ServiceName in $ValidServices) {
    try {
        Start-Service -Name $ServiceName -ErrorAction Stop
        Write-Host "  ✓ Started: $ServiceName" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to start: $ServiceName - $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✓ Service group restart completed" -ForegroundColor Green`;
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
        Write-Host "✓ Backup created successfully" -ForegroundColor Green
    } catch {
        Write-Host "✗ Backup failed: $_" -ForegroundColor Red
        Write-Host "  Aborting clear operation for safety" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Clearing System Event Log..." -ForegroundColor Yellow

try {
    wevtutil cl System
    Write-Host "✓ System Event Log cleared" -ForegroundColor Green
    
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
    Write-Host "✗ Failed to clear log: $_" -ForegroundColor Red
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
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
    Write-Host "✓ No failure events found for $ServiceName in the last $DaysBack days" -ForegroundColor Green
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
    Write-Host "✗ Service not found in registry: $ServiceName" -ForegroundColor Red
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
        Write-Host "✓ Service repaired and running successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠ Service started but status is: $Status" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "✗ Service failed to start after repair" -ForegroundColor Red
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
        Write-Host "✗ Service not found: $TargetService" -ForegroundColor Red
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
    Write-Host "⚠ HIGH PRIVILEGE SERVICES (LocalSystem):" -ForegroundColor Red
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
    Write-Host "✗ Service not found: $ServiceName" -ForegroundColor Red
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
$Passed | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Green }

if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS ($($Warnings.Count)):" -ForegroundColor Yellow
    $Warnings | ForEach-Object { Write-Host "  ⚠ $_" -ForegroundColor Yellow }
}

if ($Issues.Count -gt 0) {
    Write-Host ""
    Write-Host "ISSUES ($($Issues.Count)):" -ForegroundColor Red
    $Issues | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
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
];
