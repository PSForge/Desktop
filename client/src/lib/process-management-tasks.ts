import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface ProcessManagementTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface ProcessManagementTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: ProcessManagementTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const processManagementTasks: ProcessManagementTask[] = [
  {
    id: 'get-process-list',
    name: 'Get Running Processes Report',
    category: 'Process Inventory',
    description: 'List all running processes with CPU, memory, and resource usage',
    parameters: [
      { id: 'sortBy', label: 'Sort By', type: 'select', required: false, options: ['CPU', 'Memory', 'Name'], defaultValue: 'Memory' },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 20 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const sortBy = params.sortBy || 'Memory';
      const topCount = Number(params.topCount || 20);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Running Processes
# Generated: ${new Date().toISOString()}

$SortProperty = "${sortBy === 'Memory' ? 'WS' : sortBy === 'CPU' ? 'CPU' : 'Name'}"

$Processes = Get-Process | Select-Object Name, Id, @{N='CPU'; E={$_.CPU}}, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}}, @{N='Threads'; E={$_.Threads.Count}}, StartTime | Sort-Object $SortProperty -Descending | Select-Object -First ${topCount}

$Processes | Format-Table -AutoSize

Write-Host ""
Write-Host "Total Processes: $(( Get-Process).Count)" -ForegroundColor Gray

${exportPath ? `$Processes | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'stop-process-bulk',
    name: 'Stop Process (Bulk by Name)',
    category: 'Process Control',
    description: 'Stop one or more processes by name or pattern',
    parameters: [
      { id: 'processName', label: 'Process Name', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'force', label: 'Force Kill', type: 'boolean', required: false, defaultValue: false },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const force = toPowerShellBoolean(params.force ?? false);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Stop Process (Bulk)
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$Force = ${force}
$TestMode = ${testMode}

$Processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

if ($Processes) {
    Write-Host "Found $($Processes.Count) process(es) matching '$ProcessName':" -ForegroundColor Yellow
    $Processes | Select-Object Name, Id, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}} | Format-Table -AutoSize
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "⚠ TEST MODE - No processes stopped" -ForegroundColor Yellow
    } else {
        Stop-Process -Name $ProcessName -Force:$Force
        Write-Host "✓ Processes stopped" -ForegroundColor Green
    }
} else {
    Write-Host "No processes found matching '$ProcessName'" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'get-process-by-port',
    name: 'Find Process Using Port',
    category: 'Diagnostics & Troubleshooting',
    description: 'Identify process listening on or using a specific port',
    parameters: [
      { id: 'port', label: 'Port Number', type: 'number', required: true, placeholder: '80' }
    ],
    scriptTemplate: (params) => {
      const port = Number(params.port);
      
      return `# Find Process Using Port
# Generated: ${new Date().toISOString()}

$Port = ${port}

$Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if ($Connections) {
    Write-Host "Processes using port ${port}:" -ForegroundColor Cyan
    Write-Host ""
    
    $Connections | ForEach-Object {
        $Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        [PSCustomObject]@{
            ProcessName = $Process.Name
            PID = $_.OwningProcess
            LocalAddress = $_.LocalAddress
            LocalPort = $_.LocalPort
            RemoteAddress = $_.RemoteAddress
            State = $_.State
        }
    } | Format-Table -AutoSize
} else {
    Write-Host "No process listening on port ${port}" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'monitor-cpu-usage',
    name: 'Monitor CPU Usage (Top Consumers)',
    category: 'Performance Monitoring',
    description: 'Monitor and report processes with highest CPU usage',
    parameters: [
      { id: 'duration', label: 'Monitor Duration (seconds)', type: 'number', required: false, defaultValue: 10 },
      { id: 'threshold', label: 'CPU Threshold (%)', type: 'number', required: false, defaultValue: 10 },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const duration = Number(params.duration || 10);
      const threshold = Number(params.threshold || 10);
      const topCount = Number(params.topCount || 10);
      
      return `# Monitor CPU Usage
# Generated: ${new Date().toISOString()}

$Duration = ${duration}
$Threshold = ${threshold}
$TopCount = ${topCount}

Write-Host "Monitoring CPU usage for $Duration seconds..." -ForegroundColor Cyan

# Get initial CPU counters
$Before = Get-Process | Select-Object Name, Id, CPU

Start-Sleep -Seconds $Duration

# Get final CPU counters
$After = Get-Process | Select-Object Name, Id, CPU

# Calculate CPU delta
$Results = @()
foreach ($Process in $After) {
    $BeforeData = $Before | Where-Object { $_.Id -eq $Process.Id }
    if ($BeforeData) {
        $CPUDelta = ($Process.CPU - $BeforeData.CPU) / $Duration
        if ($CPUDelta -ge $Threshold) {
            $Results += [PSCustomObject]@{
                Name = $Process.Name
                PID = $Process.Id
                CPUPercent = [math]::Round($CPUDelta, 2)
            }
        }
    }
}

$Results = $Results | Sort-Object CPUPercent -Descending | Select-Object -First $TopCount

Write-Host ""
Write-Host "Top CPU consumers (threshold: ${threshold}%):" -ForegroundColor Yellow
$Results | Format-Table -AutoSize`;
    }
  },

  {
    id: 'monitor-memory-usage',
    name: 'Monitor Memory Usage (Top Consumers)',
    category: 'Performance Monitoring',
    description: 'Report processes consuming the most memory',
    parameters: [
      { id: 'thresholdMB', label: 'Memory Threshold (MB)', type: 'number', required: false, defaultValue: 100 },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const thresholdMB = Number(params.thresholdMB || 100);
      const topCount = Number(params.topCount || 10);
      
      return `# Monitor Memory Usage
# Generated: ${new Date().toISOString()}

$ThresholdMB = ${thresholdMB}
$TopCount = ${topCount}

$Processes = Get-Process | Where-Object { ($_.WS/1MB) -ge $ThresholdMB } | Select-Object Name, Id, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}}, @{N='MemoryGB'; E={[math]::Round($_.WS/1GB, 2)}} | Sort-Object MemoryMB -Descending | Select-Object -First $TopCount

Write-Host "Top memory consumers (threshold: ${thresholdMB}MB):" -ForegroundColor Yellow
$Processes | Format-Table -AutoSize

$TotalMemory = ($Processes | Measure-Object -Property MemoryMB -Sum).Sum
Write-Host ""
Write-Host "Total memory used by top processes: $([math]::Round($TotalMemory/1024, 2)) GB" -ForegroundColor Gray`;
    }
  },

  {
    id: 'set-process-priority',
    name: 'Set Process Priority',
    category: 'Process Control',
    description: 'Change priority class for a running process',
    parameters: [
      { id: 'processName', label: 'Process Name or ID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'priority', label: 'Priority Class', type: 'select', required: true, options: ['RealTime', 'High', 'AboveNormal', 'Normal', 'BelowNormal', 'Low'], defaultValue: 'Normal' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const priority = params.priority;
      
      return `# Set Process Priority
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$Priority = "${priority}"

# Try to get process by name first, then by ID
if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($Process) {
    $Process.PriorityClass = $Priority
    Write-Host "✓ Priority set to $Priority for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Green
    
    if ($Priority -eq "RealTime") {
        Write-Host "⚠ WARNING: RealTime priority can destabilize the system" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Process not found: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-startup-processes',
    name: 'Get Startup Programs',
    category: 'Startup & Boot',
    description: 'List programs configured to run at startup',
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Startup Programs
# Generated: ${new Date().toISOString()}

$StartupLocations = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
    "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
    "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run"
)

$StartupItems = @()

foreach ($Location in $StartupLocations) {
    if (Test-Path $Location) {
        Get-ItemProperty -Path $Location | Get-Member -MemberType NoteProperty | ForEach-Object {
            $Name = $_.Name
            if ($Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider')) {
                $StartupItems += [PSCustomObject]@{
                    Name = $Name
                    Command = (Get-ItemProperty -Path $Location).$Name
                    Location = $Location
                }
            }
        }
    }
}

$StartupItems | Format-Table -Wrap

Write-Host ""
Write-Host "Total startup items: $($StartupItems.Count)" -ForegroundColor Gray

${exportPath ? `$StartupItems | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'export-process-tree',
    name: 'Export Process Tree (Parent/Child)',
    category: 'Process Inventory',
    description: 'Display process hierarchy showing parent-child relationships',
    parameters: [
      { id: 'processName', label: 'Root Process Name (blank for all)', type: 'text', required: false, placeholder: 'explorer' }
    ],
    scriptTemplate: (params) => {
      const processName = params.processName ? escapePowerShellString(params.processName) : '';
      
      return `# Export Process Tree
# Generated: ${new Date().toISOString()}

function Get-ProcessTree {
    param($ParentId, $Indent = 0)
    
    $Children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $ParentId }
    
    foreach ($Child in $Children) {
        $Prefix = "  " * $Indent
        Write-Host "$Prefix├─ $($Child.Name) (PID: $($Child.ProcessId))" -ForegroundColor Cyan
        Get-ProcessTree -ParentId $Child.ProcessId -Indent ($Indent + 1)
    }
}

${processName ? `$RootProcess = Get-Process -Name "${processName}" -ErrorAction SilentlyContinue | Select-Object -First 1` : `$RootProcess = Get-Process | Where-Object { $_.Name -eq 'System' } | Select-Object -First 1`}

if ($RootProcess) {
    Write-Host "$($RootProcess.Name) (PID: $($RootProcess.Id))" -ForegroundColor Yellow
    Get-ProcessTree -ParentId $RootProcess.Id
} else {
    Write-Host "All processes:" -ForegroundColor Yellow
    Get-WmiObject Win32_Process | Select-Object Name, ProcessId, ParentProcessId | Format-Table -AutoSize
}`;
    }
  },

  {
    id: 'kill-hung-processes',
    name: 'Kill Hung/Not Responding Processes',
    category: 'Process Control',
    description: 'Automatically detect and kill processes that are not responding',
    parameters: [
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Kill Hung Processes
# Generated: ${new Date().toISOString()}

$TestMode = ${testMode}

Write-Host "Detecting hung processes..." -ForegroundColor Cyan

$Hung = Get-Process | Where-Object { $_.Responding -eq $false }

if ($Hung) {
    Write-Host ""
    Write-Host "Found $($Hung.Count) hung process(es):" -ForegroundColor Yellow
    $Hung | Select-Object Name, Id, StartTime | Format-Table -AutoSize
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "⚠ TEST MODE - No processes killed" -ForegroundColor Yellow
    } else {
        $Hung | Stop-Process -Force
        Write-Host ""
        Write-Host "✓ Killed $($Hung.Count) hung process(es)" -ForegroundColor Green
    }
} else {
    Write-Host "✓ No hung processes detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'set-process-affinity',
    name: 'Set Process CPU Affinity',
    category: 'Process Control',
    description: 'Restrict process to specific CPU cores',
    parameters: [
      { id: 'processName', label: 'Process Name or ID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'cpuCores', label: 'CPU Cores (comma-separated, 0-indexed)', type: 'text', required: true, placeholder: '0,1,2,3' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const cpuCores = params.cpuCores.split(',').map((c: string) => c.trim());
      
      return `# Set Process CPU Affinity
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$CPUCores = ${buildPowerShellArray(cpuCores)}

# Calculate affinity mask
$AffinityMask = 0
foreach ($Core in $CPUCores) {
    $AffinityMask += [math]::Pow(2, $Core)
}

# Get process
if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($Process) {
    $Process.ProcessorAffinity = $AffinityMask
    Write-Host "✓ CPU affinity set for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Green
    Write-Host "  Cores: $($CPUCores -join ', ')" -ForegroundColor Gray
} else {
    Write-Host "✗ Process not found: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'monitor-process-handles',
    name: 'Monitor Process Handle Count',
    category: 'Performance Monitoring',
    description: 'Report processes with high handle counts (potential leaks)',
    parameters: [
      { id: 'threshold', label: 'Handle Count Threshold', type: 'number', required: false, defaultValue: 1000 },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const threshold = Number(params.threshold || 1000);
      const topCount = Number(params.topCount || 10);
      
      return `# Monitor Process Handle Count
# Generated: ${new Date().toISOString()}

$Threshold = ${threshold}
$TopCount = ${topCount}

$Processes = Get-Process | Where-Object { $_.HandleCount -ge $Threshold } | Select-Object Name, Id, HandleCount, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}} | Sort-Object HandleCount -Descending | Select-Object -First $TopCount

if ($Processes) {
    Write-Host "Processes with handle count >= ${threshold}:" -ForegroundColor Yellow
    $Processes | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "⚠ High handle counts may indicate resource leaks" -ForegroundColor Yellow
} else {
    Write-Host "✓ No processes above threshold (${threshold} handles)" -ForegroundColor Green
}`;
    }
  },
];
