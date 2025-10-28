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
