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
    instructions: `**How This Task Works:**
- Lists all running processes with resource usage metrics
- Sorts by CPU, Memory, or Name based on your selection
- Shows top N processes to focus on resource consumers

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required (for viewing)
- Processes must be running

**What You Need to Provide:**
- Sort order: CPU, Memory, or Name (default: Memory)
- Number of top processes to display (default: 20)
- Optional: CSV export file path

**What the Script Does:**
1. Retrieves all running processes with Get-Process
2. Collects CPU time, memory usage (MB), thread count, start time
3. Sorts by selected property in descending order
4. Displays top N processes in formatted table
5. Shows total process count
6. Optionally exports results to CSV file

**Important Notes:**
- Memory shown in megabytes (MB) for readability
- CPU shows cumulative CPU time since process start
- Useful for performance troubleshooting
- Run periodically to identify resource hogs
- Typical use: system slowdowns, capacity planning
- No processes are stopped by this script
- Export for trending and historical analysis
- Combine with Task Manager for visual verification`,
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
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'stop-process-bulk',
    name: 'Stop Process (Bulk by Name)',
    category: 'Process Control',
    description: 'Stop one or more processes by name or pattern',
    instructions: `**How This Task Works:**
- Terminates all processes matching specified name
- Supports graceful shutdown or force kill
- Includes test mode to preview impact before execution

**Prerequisites:**
- Administrator privileges required for system processes
- PowerShell 5.1 or later
- Process must exist to stop

**What You Need to Provide:**
- Process name to stop (e.g., "notepad", "chrome")
- Force kill option (true/false, default: false)
- Test mode to preview (true/false, default: true)

**What the Script Does:**
1. Searches for all processes matching the name
2. Displays list of matching processes with PID and memory
3. Shows total count of processes found
4. In test mode: shows preview without stopping
5. In execution mode: stops all matching processes
6. Reports success or failure

**Important Notes:**
- TEST MODE IS ENABLED BY DEFAULT - disable to actually stop processes
- Force kill terminates immediately without cleanup
- Non-force allows graceful shutdown
- CAUTION: Stops ALL instances of matching process
- Typical use: stuck applications, malware cleanup
- Unsaved work will be lost
- Some system processes cannot be stopped
- Review process list carefully before disabling test mode`,
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
        Write-Host "[WARNING] TEST MODE - No processes stopped" -ForegroundColor Yellow
    } else {
        Stop-Process -Name $ProcessName -Force:$Force
        Write-Host "[SUCCESS] Processes stopped" -ForegroundColor Green
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
    instructions: `**How This Task Works:**
- Identifies which process is using a specific TCP port
- Shows process name, PID, and connection details
- Essential for troubleshooting "port already in use" errors

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- TCP connection must exist on specified port

**What You Need to Provide:**
- Port number to check (e.g., 80, 443, 3389, 8080)

**What the Script Does:**
1. Queries TCP connections on specified port
2. Retrieves owning process ID from connection
3. Gets process name and details from PID
4. Displays process name, PID, addresses, and state
5. Shows "No process listening" if port is free

**Important Notes:**
- Only checks TCP connections (not UDP)
- Common ports: 80 (HTTP), 443 (HTTPS), 3389 (RDP), 8080 (alt HTTP)
- Use to troubleshoot "Address already in use" errors
- Helps identify port conflicts before starting services
- Typical use: web server won't start, database conflicts
- Connection state shows LISTEN, ESTABLISHED, etc.
- Stop the identified process to free the port
- Verify port is free before deploying applications`,
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
    instructions: `**How This Task Works:**
- Monitors CPU usage over specified duration
- Calculates actual CPU consumption during monitoring period
- Identifies processes exceeding CPU threshold

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Processes must remain running during monitoring
- WMI service must be running

**What You Need to Provide:**
- Monitor duration in seconds (default: 10)
- CPU threshold percentage to report (default: 10%)
- Number of top consumers to show (default: 10)

**What the Script Does:**
1. Detects number of logical processors for reference
2. Captures initial CPU counters for all processes
3. Waits for specified duration (monitoring period)
4. Captures final CPU counters for all processes
5. Calculates CPU usage percentage per process
6. Filters processes above threshold percentage
7. Displays top N CPU consumers sorted by usage

**Important Notes:**
- CPU % represents average usage of a single core during monitoring period
- 100% = 1 full CPU core utilized
- Multi-core systems can show >100% for multi-threaded apps (e.g., 400% on 4-core system)
- Longer duration provides more accurate measurements
- Typical use: troubleshoot slow performance, identify runaway processes
- Short-lived processes may not appear in results
- Run during problem periods for best results
- Script shows total possible CPU% based on core count`,
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

# Get number of logical processors for percentage calculation
$ProcessorCount = (Get-WmiObject Win32_ComputerSystem).NumberOfLogicalProcessors

# Get initial CPU counters
$Before = Get-Process | Select-Object Name, Id, CPU

Start-Sleep -Seconds $Duration

# Get final CPU counters
$After = Get-Process | Select-Object Name, Id, CPU

# Calculate CPU delta and convert to percentage
$Results = @()
foreach ($Process in $After) {
    $BeforeData = $Before | Where-Object { $_.Id -eq $Process.Id }
    if ($BeforeData -and $Process.CPU -and $BeforeData.CPU) {
        # Calculate CPU usage: (delta CPU time / duration) * 100 = % of 1 core
        $CPUDelta = ($Process.CPU - $BeforeData.CPU) / $Duration
        $CPUPercent = [math]::Round($CPUDelta * 100, 2)
        
        if ($CPUPercent -ge $Threshold) {
            $Results += [PSCustomObject]@{
                Name = $Process.Name
                PID = $Process.Id
                'CPU%' = $CPUPercent
            }
        }
    }
}

$Results = $Results | Sort-Object 'CPU%' -Descending | Select-Object -First $TopCount

if ($Results.Count -gt 0) {
    Write-Host ""
    Write-Host "Top CPU consumers (threshold: ${threshold}%):" -ForegroundColor Yellow
    $Results | Format-Table -AutoSize
    Write-Host ""
    Write-Host "Note: CPU% represents usage of a single core. Systems with $ProcessorCount cores can show up to $($ProcessorCount * 100)% total." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "No processes above ${threshold}% CPU threshold" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'monitor-memory-usage',
    name: 'Monitor Memory Usage (Top Consumers)',
    category: 'Performance Monitoring',
    description: 'Report processes consuming the most memory',
    instructions: `**How This Task Works:**
- Identifies processes consuming the most RAM
- Filters processes above memory threshold
- Shows memory usage in both MB and GB

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Processes must be running

**What You Need to Provide:**
- Memory threshold in MB to filter (default: 100 MB)
- Number of top consumers to display (default: 10)

**What the Script Does:**
1. Retrieves all running processes
2. Filters processes using more than threshold memory
3. Calculates memory usage in MB and GB
4. Sorts by memory usage (highest first)
5. Displays top N memory consumers
6. Shows total memory used by displayed processes

**Important Notes:**
- Memory displayed as Working Set (physical RAM used)
- 1024 MB = 1 GB
- Lower threshold shows more processes
- Useful for identifying memory leaks
- Typical use: system has low available RAM, slowdowns
- High memory usage may indicate memory leak
- Compare with Task Manager performance tab
- Some processes legitimately use large amounts of RAM`,
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
    instructions: `**How This Task Works:**
- Changes CPU scheduling priority for a process
- Affects how much CPU time process receives
- Can improve performance of critical applications

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Process must be running

**What You Need to Provide:**
- Process name or PID (e.g., "notepad" or "1234")
- Priority class: RealTime, High, AboveNormal, Normal, BelowNormal, Low

**What the Script Does:**
1. Locates process by name or PID
2. Sets process priority class to specified level
3. Confirms priority change with process name and PID
4. Warns if RealTime priority is selected

**Important Notes:**
- Normal is default priority for most processes
- RealTime can destabilize system - use with extreme caution
- High priority gives process more CPU time
- Low/BelowNormal reduces process CPU allocation
- Typical use: prioritize critical apps, de-prioritize background tasks
- Priority resets when process restarts
- Administrator rights required to set High or RealTime
- Use responsibly to avoid system instability`,
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
    Write-Host "[SUCCESS] Priority set to $Priority for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Green
    
    if ($Priority -eq "RealTime") {
        Write-Host "[WARNING] WARNING: RealTime priority can destabilize the system" -ForegroundColor Yellow
    }
} else {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-startup-processes',
    name: 'Get Startup Programs',
    category: 'Startup & Boot',
    description: 'List programs configured to run at startup',
    instructions: `**How This Task Works:**
- Lists all programs configured to launch at system startup
- Checks both machine-wide and user-specific startup locations
- Identifies programs slowing boot time

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required (limited to readable keys)
- Access to registry startup locations

**What You Need to Provide:**
- Optional: CSV export file path for documentation

**What the Script Does:**
1. Scans HKLM and HKCU Run registry keys
2. Checks both 32-bit and 64-bit registry locations
3. Extracts startup program name and command
4. Displays source registry location for each item
5. Shows total count of startup programs
6. Optionally exports results to CSV

**Important Notes:**
- Too many startup items slow boot time
- Review and disable unnecessary startup programs
- Malware often adds startup entries
- HKLM = all users, HKCU = current user only
- Typical use: optimize boot time, malware detection
- Does not check Startup folder (only registry)
- Investigate unfamiliar startup items
- Disable non-essential items in Task Manager`,
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
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'export-process-tree',
    name: 'Export Process Tree (Parent/Child)',
    category: 'Process Inventory',
    description: 'Display process hierarchy showing parent-child relationships',
    instructions: `**How This Task Works:**
- Displays hierarchical tree of parent-child process relationships
- Shows which processes spawned which child processes
- Useful for understanding process dependencies

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- WMI service must be running

**What You Need to Provide:**
- Optional: Root process name to start tree from (blank = show all)

**What the Script Does:**
1. Queries WMI for process parent-child relationships
2. Builds hierarchical tree structure
3. Displays processes with indentation showing hierarchy
4. Shows process name and PID for each entry
5. Recursively shows all child processes

**Important Notes:**
- Indentation shows nesting level
- Parent processes appear before their children
- Useful for troubleshooting cascading process issues
- Shows which process created which
- Typical use: malware analysis, understanding application architecture
- Killing parent may kill all children
- Some processes re-parent to System if parent dies
- Explorer.exe typically parent of user-launched apps`,
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
    instructions: `**How This Task Works:**
- Detects processes that are frozen or not responding
- Automatically terminates hung processes
- Includes test mode to preview before execution

**Prerequisites:**
- Administrator privileges required for system processes
- PowerShell 5.1 or later
- Hung processes must be present

**What You Need to Provide:**
- Test mode to preview (true/false, default: true)

**What the Script Does:**
1. Queries all running processes for response status
2. Identifies processes with Responding = False
3. Displays list of hung processes with name, PID, start time
4. In test mode: shows preview without killing
5. In execution mode: force kills all hung processes
6. Reports count of processes terminated

**Important Notes:**
- TEST MODE IS ENABLED BY DEFAULT - disable to actually kill
- Force kill is used (no graceful shutdown)
- Unsaved work in hung processes will be lost
- Hung processes cannot save or respond to signals
- Typical use: system frozen, unresponsive applications
- Review hung process list before disabling test mode
- Some processes may appear hung temporarily
- Killing system processes can cause instability`,
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
        Write-Host "[WARNING] TEST MODE - No processes killed" -ForegroundColor Yellow
    } else {
        $Hung | Stop-Process -Force
        Write-Host ""
        Write-Host "[SUCCESS] Killed $($Hung.Count) hung process(es)" -ForegroundColor Green
    }
} else {
    Write-Host "[SUCCESS] No hung processes detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'set-process-affinity',
    name: 'Set Process CPU Affinity',
    category: 'Process Control',
    description: 'Restrict process to specific CPU cores',
    instructions: `**How This Task Works:**
- Restricts a process to run on specific CPU cores only
- Prevents process from using other CPU cores
- Useful for performance tuning and core isolation

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Multi-core CPU system
- Process must be running

**What You Need to Provide:**
- Process name or PID (e.g., "notepad" or "1234")
- CPU cores as comma-separated list (0-indexed, e.g., "0,1,2,3")

**What the Script Does:**
1. Calculates affinity bitmask from core list
2. Locates process by name or PID
3. Sets processor affinity to specified cores
4. Confirms affinity change with core list

**Important Notes:**
- Core numbering starts at 0 (0 = first core, 1 = second, etc.)
- Affinity resets when process restarts
- Can improve cache locality for performance
- May reduce performance if cores are over-subscribed
- Typical use: isolate critical processes, prevent core hopping
- Multi-threaded apps benefit most from affinity
- Test impact on performance before production use
- Consider NUMA topology on multi-socket systems`,
    parameters: [
      { id: 'processName', label: 'Process Name or ID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'cpuCores', label: 'CPU Cores (comma-separated, 0-indexed)', type: 'text', required: true, placeholder: '0,1,2,3' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      
      return `# Set Process CPU Affinity
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$CPUCores = ${buildPowerShellArray(params.cpuCores)}

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
    Write-Host "[SUCCESS] CPU affinity set for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Green
    Write-Host "  Cores: $($CPUCores -join ', ')" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'monitor-process-handles',
    name: 'Monitor Process Handle Count',
    category: 'Performance Monitoring',
    description: 'Report processes with high handle counts (potential leaks)',
    instructions: `**How This Task Works:**
- Monitors system handle usage by processes
- Identifies processes with excessive handle counts
- Detects potential resource leaks early

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Processes must be running

**What You Need to Provide:**
- Handle count threshold to flag (default: 1000)
- Number of top consumers to display (default: 10)

**What the Script Does:**
1. Retrieves handle count for all running processes
2. Filters processes above specified threshold
3. Sorts by handle count (highest first)
4. Displays top N processes with handle counts
5. Shows memory usage alongside handle counts
6. Warns if high handle counts detected

**Important Notes:**
- Handles include files, registry keys, mutexes, threads, etc.
- Normal processes: 200-500 handles typical
- High handle counts (>5000) indicate potential leak
- Growing handle count over time confirms leak
- Typical use: troubleshoot resource exhaustion, leak detection
- Handle leaks eventually cause "out of resources" errors
- Some processes legitimately use many handles
- Monitor trend over time for leak confirmation`,
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
    Write-Host "[WARNING] High handle counts may indicate resource leaks" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] No processes above threshold (${threshold} handles)" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'start-process',
    name: 'Start Process/Application',
    category: 'Process Control',
    description: 'Launch an application or executable with arguments',
    instructions: `**How This Task Works:**
- Starts a new process or application
- Supports command-line arguments
- Can run elevated (as Administrator)
- Optionally waits for process to exit

**Prerequisites:**
- PowerShell 5.1 or later
- Execute permissions on the application
- Administrator rights for elevated processes
- Application/executable must exist

**What You Need to Provide:**
- Full path to executable or application name
- Optional: Command-line arguments
- Optional: Working directory
- Run as Administrator: true or false
- Wait for exit: true or false

**What the Script Does:**
1. Validates executable path/name
2. Prepares process start options
3. Starts the process with specified arguments
4. Optionally runs elevated if requested
5. Waits for completion if specified
6. Reports PID and status

**Important Notes:**
- Use full path for non-system applications
- System applications (notepad, calc) work with name only
- Run as Administrator requires UAC prompt
- Working directory is where relative paths resolve
- Wait for exit blocks script until process completes
- Typical use: launch installers, batch processing`,
    parameters: [
      { id: 'executablePath', label: 'Executable Path/Name', type: 'path', required: true, placeholder: 'C:\\Program Files\\App\\app.exe' },
      { id: 'arguments', label: 'Command-Line Arguments', type: 'text', required: false, placeholder: '/silent /norestart' },
      { id: 'workingDirectory', label: 'Working Directory', type: 'path', required: false, placeholder: 'C:\\Temp' },
      { id: 'runAsAdmin', label: 'Run as Administrator', type: 'boolean', required: false, defaultValue: false },
      { id: 'waitForExit', label: 'Wait for Exit', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const executablePath = escapePowerShellString(params.executablePath);
      const arguments_ = params.arguments ? escapePowerShellString(params.arguments) : '';
      const workingDirectory = params.workingDirectory ? escapePowerShellString(params.workingDirectory) : '';
      const runAsAdmin = toPowerShellBoolean(params.runAsAdmin ?? false);
      const waitForExit = toPowerShellBoolean(params.waitForExit ?? false);
      
      return `# Start Process/Application
# Generated: ${new Date().toISOString()}

$ExecutablePath = "${executablePath}"
${arguments_ ? `$Arguments = "${arguments_}"` : ''}
${workingDirectory ? `$WorkingDirectory = "${workingDirectory}"` : ''}

$ProcessParams = @{
    FilePath = $ExecutablePath
    ${arguments_ ? 'ArgumentList = $Arguments' : ''}
    ${workingDirectory ? 'WorkingDirectory = $WorkingDirectory' : ''}
    ${runAsAdmin === '$true' ? 'Verb = "RunAs"' : ''}
    PassThru = $true
}

try {
    $Process = Start-Process @ProcessParams
    
    Write-Host "[SUCCESS] Process started successfully" -ForegroundColor Green
    Write-Host "  Process ID: $($Process.Id)" -ForegroundColor Gray
    Write-Host "  Process Name: $($Process.ProcessName)" -ForegroundColor Gray
    
    ${waitForExit === '$true' ? `
    Write-Host "Waiting for process to exit..." -ForegroundColor Cyan
    $Process.WaitForExit()
    Write-Host "[SUCCESS] Process exited with code: $($Process.ExitCode)" -ForegroundColor Green` : ''}
} catch {
    Write-Host "[FAILED] Failed to start process: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-process-details',
    name: 'Get Process Details by Name',
    category: 'Process Inventory',
    description: 'Get detailed information about a specific process',
    instructions: `**How This Task Works:**
- Retrieves comprehensive information about a process
- Shows PID, memory, CPU, threads, handles, start time
- Useful for troubleshooting specific applications
- Displays all instances if multiple running

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator rights required
- Process must be running

**What You Need to Provide:**
- Process name (e.g., "chrome", "notepad", "sqlservr")

**What the Script Does:**
1. Searches for all processes matching name
2. Retrieves detailed process information
3. Shows PID, memory usage, CPU time, threads
4. Displays start time and path
5. Shows handle count and company name
6. Lists all instances if multiple found

**Important Notes:**
- Process name without .exe extension
- Shows all running instances
- Memory shown in MB for readability
- CPU time is cumulative since start
- Handles are Windows kernel objects
- Typical use: troubleshoot performance issues
- Path shows executable location
- Company name helps identify legitimate processes`,
    parameters: [
      { id: 'processName', label: 'Process Name', type: 'text', required: true, placeholder: 'chrome' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      
      return `# Get Process Details
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"

$Processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

if ($Processes) {
    Write-Host "Found $($Processes.Count) instance(s) of $ProcessName:" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($Process in $Processes) {
        Write-Host "Process: $($Process.ProcessName) (PID: $($Process.Id))" -ForegroundColor Yellow
        Write-Host "  Path: $($Process.Path)" -ForegroundColor Gray
        Write-Host "  Company: $($Process.Company)" -ForegroundColor Gray
        Write-Host "  Started: $($Process.StartTime)" -ForegroundColor Gray
        Write-Host "  Memory: $([math]::Round($Process.WS/1MB, 2)) MB" -ForegroundColor Gray
        Write-Host "  CPU Time: $($Process.CPU) seconds" -ForegroundColor Gray
        Write-Host "  Threads: $($Process.Threads.Count)" -ForegroundColor Gray
        Write-Host "  Handles: $($Process.HandleCount)" -ForegroundColor Gray
        Write-Host "  Responding: $($Process.Responding)" -ForegroundColor $(if ($Process.Responding) { 'Green' } else { 'Red' })
        Write-Host ""
    }
} else {
    Write-Host "[FAILED] No process found with name: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'detect-memory-leaks',
    name: 'Detect Memory Leak Trends',
    category: 'Performance Analysis',
    description: 'Monitor processes for memory growth patterns indicating leaks',
    instructions: `**How This Task Works:**
- Monitors memory usage over time to detect leaks
- Captures multiple snapshots at intervals
- Calculates growth rate and trend analysis
- Identifies processes with consistent memory growth

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Processes must remain running during monitoring

**What You Need to Provide:**
- Monitor duration in minutes (default: 5)
- Sample interval in seconds (default: 30)
- Growth threshold MB to flag (default: 50)

**What the Script Does:**
1. Captures initial memory baseline for all processes
2. Takes periodic snapshots at specified intervals
3. Calculates memory growth per process
4. Identifies processes exceeding growth threshold
5. Reports growth rate in MB/minute
6. Flags potential memory leaks

**Important Notes:**
- Longer monitoring periods provide more accurate results
- Some memory growth is normal during startup
- Consistent growth over time indicates leak
- High growth rate warrants investigation
- Typical use: troubleshoot gradual performance degradation
- Combine with handle count monitoring
- Restart leaking processes as temporary fix`,
    parameters: [
      { id: 'durationMinutes', label: 'Monitor Duration (minutes)', type: 'number', required: false, defaultValue: 5 },
      { id: 'intervalSeconds', label: 'Sample Interval (seconds)', type: 'number', required: false, defaultValue: 30 },
      { id: 'thresholdMB', label: 'Growth Threshold (MB)', type: 'number', required: false, defaultValue: 50 }
    ],
    scriptTemplate: (params) => {
      const durationMinutes = Number(params.durationMinutes || 5);
      const intervalSeconds = Number(params.intervalSeconds || 30);
      const thresholdMB = Number(params.thresholdMB || 50);
      
      return `# Detect Memory Leak Trends
# Generated: ${new Date().toISOString()}

$DurationMinutes = ${durationMinutes}
$IntervalSeconds = ${intervalSeconds}
$ThresholdMB = ${thresholdMB}

$Samples = [int]($DurationMinutes * 60 / $IntervalSeconds)

Write-Host "Monitoring memory for $DurationMinutes minutes ($Samples samples)..." -ForegroundColor Cyan

$Baseline = Get-Process | Select-Object Id, Name, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}}
$BaselineHash = @{}
foreach ($p in $Baseline) { $BaselineHash[$p.Id] = $p.MemoryMB }

for ($i = 1; $i -le $Samples; $i++) {
    Start-Sleep -Seconds $IntervalSeconds
    Write-Host "Sample $i of $Samples..." -ForegroundColor Gray
}

$Final = Get-Process | Select-Object Id, Name, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}}

$Leaks = @()
foreach ($p in $Final) {
    if ($BaselineHash.ContainsKey($p.Id)) {
        $Growth = $p.MemoryMB - $BaselineHash[$p.Id]
        $GrowthRate = [math]::Round($Growth / $DurationMinutes, 2)
        if ($Growth -ge $ThresholdMB) {
            $Leaks += [PSCustomObject]@{
                Name = $p.Name
                PID = $p.Id
                'StartMB' = $BaselineHash[$p.Id]
                'EndMB' = $p.MemoryMB
                'GrowthMB' = $Growth
                'MB/min' = $GrowthRate
            }
        }
    }
}

if ($Leaks.Count -gt 0) {
    Write-Host ""
    Write-Host "[WARNING] Potential memory leaks detected:" -ForegroundColor Yellow
    $Leaks | Sort-Object GrowthMB -Descending | Format-Table -AutoSize
} else {
    Write-Host ""
    Write-Host "[SUCCESS] No significant memory growth detected (threshold: ${thresholdMB}MB)" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'detect-cpu-spikes',
    name: 'Detect CPU Spike Events',
    category: 'Performance Analysis',
    description: 'Monitor and alert on sudden CPU usage spikes',
    instructions: `**How This Task Works:**
- Continuously monitors CPU usage for spikes
- Detects sudden increases above threshold
- Logs timestamp and process causing spike
- Useful for intermittent performance issues

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- WMI service must be running

**What You Need to Provide:**
- Monitor duration in minutes (default: 5)
- CPU spike threshold percentage (default: 80)
- Check interval in seconds (default: 5)

**What the Script Does:**
1. Monitors CPU usage at regular intervals
2. Detects when any process exceeds threshold
3. Records spike events with timestamp
4. Shows process name and CPU percentage
5. Displays summary of all spikes detected

**Important Notes:**
- Short-lived spikes may be missed between checks
- Shorter intervals increase detection accuracy
- System processes may cause legitimate spikes
- Typical use: diagnose intermittent slowdowns
- Run during problem periods for best results
- Correlate with application activity logs`,
    parameters: [
      { id: 'durationMinutes', label: 'Monitor Duration (minutes)', type: 'number', required: false, defaultValue: 5 },
      { id: 'thresholdPercent', label: 'CPU Spike Threshold (%)', type: 'number', required: false, defaultValue: 80 },
      { id: 'intervalSeconds', label: 'Check Interval (seconds)', type: 'number', required: false, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const durationMinutes = Number(params.durationMinutes || 5);
      const thresholdPercent = Number(params.thresholdPercent || 80);
      const intervalSeconds = Number(params.intervalSeconds || 5);
      
      return `# Detect CPU Spike Events
# Generated: ${new Date().toISOString()}

$DurationMinutes = ${durationMinutes}
$ThresholdPercent = ${thresholdPercent}
$IntervalSeconds = ${intervalSeconds}

$EndTime = (Get-Date).AddMinutes($DurationMinutes)
$Spikes = @()
$ProcessorCount = (Get-WmiObject Win32_ComputerSystem).NumberOfLogicalProcessors

Write-Host "Monitoring for CPU spikes above ${thresholdPercent}% for $DurationMinutes minutes..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop early" -ForegroundColor Gray

$LastCPU = @{}
Get-Process | ForEach-Object { $LastCPU[$_.Id] = $_.CPU }

while ((Get-Date) -lt $EndTime) {
    Start-Sleep -Seconds $IntervalSeconds
    
    Get-Process | ForEach-Object {
        if ($LastCPU.ContainsKey($_.Id) -and $_.CPU) {
            $CPUDelta = ($_.CPU - $LastCPU[$_.Id]) / $IntervalSeconds * 100
            if ($CPUDelta -ge $ThresholdPercent) {
                $Spike = [PSCustomObject]@{
                    Timestamp = Get-Date -Format "HH:mm:ss"
                    Process = $_.Name
                    PID = $_.Id
                    'CPU%' = [math]::Round($CPUDelta, 1)
                }
                $Spikes += $Spike
                Write-Host "[WARNING] SPIKE: $($_.Name) at $($Spike.'CPU%')%" -ForegroundColor Yellow
            }
        }
        $LastCPU[$_.Id] = $_.CPU
    }
}

Write-Host ""
if ($Spikes.Count -gt 0) {
    Write-Host "Spike Summary ($($Spikes.Count) events):" -ForegroundColor Yellow
    $Spikes | Format-Table -AutoSize
} else {
    Write-Host "[SUCCESS] No CPU spikes detected above ${thresholdPercent}%" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'get-thread-analysis',
    name: 'Analyze Process Threads',
    category: 'Performance Monitoring',
    description: 'Detailed thread analysis for a specific process',
    instructions: `**How This Task Works:**
- Analyzes all threads within a specific process
- Shows thread states, start times, and CPU usage
- Identifies stuck or waiting threads
- Useful for debugging multi-threaded applications

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Target process must be running

**What You Need to Provide:**
- Process name or PID to analyze

**What the Script Does:**
1. Locates process by name or PID
2. Enumerates all threads in the process
3. Shows thread ID, state, and priority
4. Displays wait reason for blocked threads
5. Shows thread start times and addresses

**Important Notes:**
- Many threads in Wait state is normal
- Running threads actively using CPU
- High thread count may indicate issues
- Typical use: debug hung applications
- Thread states help identify deadlocks
- Correlate with application debugging tools`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      
      return `# Analyze Process Threads
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"

if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($Process) {
    Write-Host "Thread Analysis for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Cyan
    Write-Host "Total Threads: $($Process.Threads.Count)" -ForegroundColor Gray
    Write-Host ""
    
    $ThreadData = $Process.Threads | Select-Object Id, @{N='State'; E={$_.ThreadState}}, @{N='WaitReason'; E={$_.WaitReason}}, @{N='Priority'; E={$_.BasePriority}}, @{N='StartAddress'; E={$_.StartAddress}}, StartTime
    
    $StateSummary = $ThreadData | Group-Object State | Select-Object Name, Count
    Write-Host "Thread States:" -ForegroundColor Yellow
    $StateSummary | Format-Table -AutoSize
    
    Write-Host "Thread Details:" -ForegroundColor Yellow
    $ThreadData | Format-Table -AutoSize
} else {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'restart-process',
    name: 'Restart Process Gracefully',
    category: 'Process Control',
    description: 'Stop and restart a process with optional delay',
    instructions: `**How This Task Works:**
- Gracefully stops a process and restarts it
- Optionally waits for process to fully exit
- Includes configurable delay between stop and start
- Preserves command line arguments if available

**Prerequisites:**
- Administrator privileges may be required
- PowerShell 5.1 or later
- Process must be running

**What You Need to Provide:**
- Process name to restart
- Delay between stop and start (seconds)
- Force kill option if graceful stop fails

**What the Script Does:**
1. Captures process path and arguments
2. Gracefully stops the process
3. Waits for process to fully exit
4. Applies configured delay
5. Starts process with original parameters
6. Confirms new process started

**Important Notes:**
- Process must have accessible path to restart
- Some processes require specific startup parameters
- Test mode recommended for first run
- Typical use: refresh stuck applications
- May lose unsaved data in target process`,
    parameters: [
      { id: 'processName', label: 'Process Name', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'delaySeconds', label: 'Restart Delay (seconds)', type: 'number', required: false, defaultValue: 2 },
      { id: 'force', label: 'Force Kill', type: 'boolean', required: false, defaultValue: false },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const delaySeconds = Number(params.delaySeconds || 2);
      const force = toPowerShellBoolean(params.force ?? false);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Restart Process Gracefully
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$DelaySeconds = ${delaySeconds}
$Force = ${force}
$TestMode = ${testMode}

$Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1

if ($Process) {
    $ProcessPath = $Process.Path
    $ProcessId = $Process.Id
    
    Write-Host "Found process: $ProcessName (PID: $ProcessId)" -ForegroundColor Cyan
    Write-Host "Path: $ProcessPath" -ForegroundColor Gray
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "[WARNING] TEST MODE - Would restart process with ${delaySeconds}s delay" -ForegroundColor Yellow
    } else {
        Write-Host "Stopping process..." -ForegroundColor Yellow
        Stop-Process -Id $ProcessId -Force:$Force -ErrorAction Stop
        
        Start-Sleep -Seconds $DelaySeconds
        
        if ($ProcessPath) {
            Write-Host "Starting process..." -ForegroundColor Yellow
            $NewProcess = Start-Process -FilePath $ProcessPath -PassThru
            Write-Host "[SUCCESS] Process restarted (New PID: $($NewProcess.Id))" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Cannot restart - process path not available" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-process-command-line',
    name: 'Get Process Command Line',
    category: 'Process Inventory',
    description: 'Retrieve command line arguments for running processes',
    instructions: `**How This Task Works:**
- Retrieves full command line for processes
- Shows exactly how process was launched
- Useful for understanding process configuration
- Can filter by specific process name

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges for some processes
- WMI service must be running

**What You Need to Provide:**
- Optional: Process name to filter (blank for all)
- Optional: Export path for CSV

**What the Script Does:**
1. Queries WMI for process command lines
2. Filters by process name if specified
3. Displays process name, PID, and command line
4. Optionally exports results to CSV

**Important Notes:**
- Some system processes hide command lines
- Sensitive data may be in command lines
- Use for troubleshooting startup issues
- Typical use: verify application configuration
- Command lines may contain credentials`,
    parameters: [
      { id: 'processName', label: 'Process Name (blank for all)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const processName = params.processName ? escapePowerShellString(params.processName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Process Command Line
# Generated: ${new Date().toISOString()}

${processName ? `$Filter = "Name LIKE '%${processName}%'"` : '$Filter = $null'}

$Query = "SELECT ProcessId, Name, CommandLine FROM Win32_Process"
${processName ? '$Query += " WHERE $Filter"' : ''}

$Processes = Get-WmiObject -Query $Query | Select-Object @{N='PID'; E={$_.ProcessId}}, Name, CommandLine | Sort-Object Name

Write-Host "Process Command Lines:" -ForegroundColor Cyan
$Processes | Format-Table -Wrap -AutoSize

Write-Host ""
Write-Host "Total: $($Processes.Count) processes" -ForegroundColor Gray

${exportPath ? `$Processes | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'find-unsigned-processes',
    name: 'Find Unsigned Processes',
    category: 'Security',
    description: 'Detect running processes without valid digital signatures',
    instructions: `**How This Task Works:**
- Checks digital signatures of all running processes
- Identifies processes without valid signatures
- Flags potentially suspicious unsigned executables
- Useful for security auditing

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended
- Processes must be accessible

**What You Need to Provide:**
- Optional: Export path for report

**What the Script Does:**
1. Enumerates all running processes
2. Checks digital signature of each executable
3. Identifies unsigned or invalid signatures
4. Reports process name, path, and signature status
5. Optionally exports findings to CSV

**Important Notes:**
- Unsigned processes are not necessarily malicious
- Some legitimate software is unsigned
- Focus on unexpected unsigned processes
- Typical use: security audit, malware detection
- Cross-reference with known good processes
- Windows system files should be signed`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Unsigned Processes
# Generated: ${new Date().toISOString()}

Write-Host "Scanning processes for digital signatures..." -ForegroundColor Cyan

$Unsigned = @()
$Checked = 0

Get-Process | Where-Object { $_.Path } | ForEach-Object {
    $Checked++
    try {
        $Sig = Get-AuthenticodeSignature -FilePath $_.Path -ErrorAction SilentlyContinue
        if ($Sig.Status -ne 'Valid') {
            $Unsigned += [PSCustomObject]@{
                Name = $_.Name
                PID = $_.Id
                Path = $_.Path
                SignatureStatus = $Sig.Status
                Signer = $Sig.SignerCertificate.Subject
            }
        }
    } catch {
        $Unsigned += [PSCustomObject]@{
            Name = $_.Name
            PID = $_.Id
            Path = $_.Path
            SignatureStatus = 'Error'
            Signer = 'Unable to check'
        }
    }
}

Write-Host ""
Write-Host "Checked $Checked processes" -ForegroundColor Gray

if ($Unsigned.Count -gt 0) {
    Write-Host ""
    Write-Host "[WARNING] Found $($Unsigned.Count) unsigned/invalid processes:" -ForegroundColor Yellow
    $Unsigned | Format-Table -Wrap -AutoSize
} else {
    Write-Host "[SUCCESS] All processes have valid signatures" -ForegroundColor Green
}

${exportPath ? `$Unsigned | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'detect-hidden-processes',
    name: 'Detect Hidden Processes',
    category: 'Security',
    description: 'Compare process lists to detect hidden or rootkit processes',
    instructions: `**How This Task Works:**
- Uses multiple methods to enumerate processes
- Compares results to detect discrepancies
- Hidden processes may indicate rootkit infection
- Cross-references Get-Process with WMI and Task List

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended
- WMI service must be running

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Enumerates processes via Get-Process cmdlet
2. Enumerates processes via WMI
3. Enumerates processes via tasklist.exe
4. Compares all three lists
5. Reports any discrepancies found
6. Flags potential hidden processes

**Important Notes:**
- Discrepancies do not always indicate malware
- Timing differences can cause false positives
- Run multiple times to confirm
- Typical use: rootkit detection, security audit
- Combine with antivirus scanning
- Investigate any persistent discrepancies`,
    parameters: [],
    scriptTemplate: () => {
      return `# Detect Hidden Processes
# Generated: ${new Date().toISOString()}

Write-Host "Comparing process enumeration methods..." -ForegroundColor Cyan

# Method 1: Get-Process
$PSProcesses = Get-Process | Select-Object -ExpandProperty Id | Sort-Object

# Method 2: WMI
$WMIProcesses = Get-WmiObject Win32_Process | Select-Object -ExpandProperty ProcessId | Sort-Object

# Method 3: Tasklist
$TasklistOutput = tasklist /FO CSV /NH | ConvertFrom-Csv | Select-Object -ExpandProperty PID | ForEach-Object { [int]$_ } | Sort-Object

Write-Host ""
Write-Host "Process counts:" -ForegroundColor Gray
Write-Host "  Get-Process: $($PSProcesses.Count)" -ForegroundColor Gray
Write-Host "  WMI: $($WMIProcesses.Count)" -ForegroundColor Gray
Write-Host "  Tasklist: $($TasklistOutput.Count)" -ForegroundColor Gray

# Find discrepancies
$AllPIDs = ($PSProcesses + $WMIProcesses + $TasklistOutput) | Sort-Object -Unique

$Discrepancies = @()
foreach ($PID in $AllPIDs) {
    $InPS = $PSProcesses -contains $PID
    $InWMI = $WMIProcesses -contains $PID
    $InTasklist = $TasklistOutput -contains $PID
    
    if (-not ($InPS -and $InWMI -and $InTasklist)) {
        $Discrepancies += [PSCustomObject]@{
            PID = $PID
            'Get-Process' = $InPS
            'WMI' = $InWMI
            'Tasklist' = $InTasklist
        }
    }
}

Write-Host ""
if ($Discrepancies.Count -gt 0) {
    Write-Host "[WARNING] Discrepancies found:" -ForegroundColor Yellow
    $Discrepancies | Format-Table -AutoSize
    Write-Host ""
    Write-Host "Note: Some discrepancies may be due to timing. Run again to confirm." -ForegroundColor Gray
} else {
    Write-Host "[SUCCESS] No discrepancies detected - all methods report same processes" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'find-suspicious-locations',
    name: 'Find Processes from Suspicious Locations',
    category: 'Security',
    description: 'Identify processes running from unusual directories',
    instructions: `**How This Task Works:**
- Scans running processes for unusual execution paths
- Flags processes running from temp folders, user profiles, etc.
- Identifies potential malware execution locations
- Compares against known safe directories

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Process paths must be accessible

**What You Need to Provide:**
- Optional: Additional suspicious paths to check (comma-separated)
- Optional: Export path for report

**What the Script Does:**
1. Gets all running process paths
2. Checks against list of suspicious locations
3. Flags temp, downloads, appdata paths
4. Reports suspicious processes with full paths
5. Optionally exports findings to CSV

**Important Notes:**
- Some legitimate software runs from AppData
- Focus on unexpected processes
- Typical use: malware detection, security audit
- Cross-reference with known applications
- Investigate unfamiliar process names`,
    parameters: [
      { id: 'additionalPaths', label: 'Additional Suspicious Paths (comma-separated)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const additionalPaths = params.additionalPaths ? params.additionalPaths.split(',').map((p: string) => p.trim()) : [];
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find Processes from Suspicious Locations
# Generated: ${new Date().toISOString()}

$SuspiciousPaths = @(
    "$env:TEMP",
    "$env:TMP",
    "$env:USERPROFILE\\Downloads",
    "$env:APPDATA",
    "$env:LOCALAPPDATA\\Temp",
    "C:\\Users\\Public",
    "C:\\ProgramData"
    ${additionalPaths.map(p => `,"${escapePowerShellString(p)}"`).join('')}
)

Write-Host "Scanning for processes in suspicious locations..." -ForegroundColor Cyan

$Suspicious = @()

Get-Process | Where-Object { $_.Path } | ForEach-Object {
    $ProcessPath = $_.Path
    foreach ($SuspPath in $SuspiciousPaths) {
        if ($ProcessPath -like "$SuspPath*") {
            $Suspicious += [PSCustomObject]@{
                Name = $_.Name
                PID = $_.Id
                Path = $ProcessPath
                SuspiciousLocation = $SuspPath
                Company = $_.Company
            }
            break
        }
    }
}

Write-Host ""
if ($Suspicious.Count -gt 0) {
    Write-Host "[WARNING] Found $($Suspicious.Count) process(es) in suspicious locations:" -ForegroundColor Yellow
    $Suspicious | Format-Table -Wrap -AutoSize
} else {
    Write-Host "[SUCCESS] No processes found in suspicious locations" -ForegroundColor Green
}

${exportPath ? `$Suspicious | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'detect-injection',
    name: 'Detect Potential Process Injection',
    category: 'Security',
    description: 'Identify processes with signs of code injection',
    instructions: `**How This Task Works:**
- Checks for indicators of process injection
- Detects unusual module loading patterns
- Identifies processes with mismatched characteristics
- Useful for advanced threat detection

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended
- WMI service must be running

**What You Need to Provide:**
- Optional: Specific process name to analyze

**What the Script Does:**
1. Enumerates loaded modules in processes
2. Checks for suspicious module paths
3. Detects processes with unusual parent relationships
4. Identifies unsigned modules in signed processes
5. Reports potential injection indicators

**Important Notes:**
- False positives are common
- Requires security expertise to interpret
- Typical use: incident response, threat hunting
- Combine with memory forensics tools
- Not a replacement for endpoint protection`,
    parameters: [
      { id: 'processName', label: 'Process Name (blank for all)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const processName = params.processName ? escapePowerShellString(params.processName) : '';
      
      return `# Detect Potential Process Injection
# Generated: ${new Date().toISOString()}

Write-Host "Scanning for potential process injection indicators..." -ForegroundColor Cyan

$Suspicious = @()

${processName ? `$Processes = Get-Process -Name "${processName}" -ErrorAction SilentlyContinue` : '$Processes = Get-Process | Where-Object { $_.Path }'}

foreach ($Proc in $Processes) {
    try {
        $Modules = $Proc.Modules | Select-Object ModuleName, FileName
        
        foreach ($Module in $Modules) {
            if ($Module.FileName) {
                # Check for modules from suspicious locations
                $SuspiciousLocations = @("$env:TEMP", "$env:TMP", "$env:APPDATA")
                foreach ($Loc in $SuspiciousLocations) {
                    if ($Module.FileName -like "$Loc*") {
                        $Suspicious += [PSCustomObject]@{
                            Process = $Proc.Name
                            PID = $Proc.Id
                            Module = $Module.ModuleName
                            ModulePath = $Module.FileName
                            Indicator = "Module in suspicious path"
                        }
                    }
                }
                
                # Check for unsigned DLLs in system processes
                if ($Proc.Path -like "C:\\Windows\\*") {
                    $Sig = Get-AuthenticodeSignature -FilePath $Module.FileName -ErrorAction SilentlyContinue
                    if ($Sig -and $Sig.Status -ne 'Valid' -and $Module.FileName -notlike "C:\\Windows\\*") {
                        $Suspicious += [PSCustomObject]@{
                            Process = $Proc.Name
                            PID = $Proc.Id
                            Module = $Module.ModuleName
                            ModulePath = $Module.FileName
                            Indicator = "Unsigned module in system process"
                        }
                    }
                }
            }
        }
    } catch {
        # Access denied or process exited
    }
}

Write-Host ""
if ($Suspicious.Count -gt 0) {
    Write-Host "[WARNING] Found $($Suspicious.Count) potential injection indicator(s):" -ForegroundColor Yellow
    $Suspicious | Format-Table -Wrap -AutoSize
    Write-Host ""
    Write-Host "Note: These are indicators only. Further analysis required." -ForegroundColor Gray
} else {
    Write-Host "[SUCCESS] No obvious injection indicators detected" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'watchdog-process',
    name: 'Create Process Watchdog Script',
    category: 'Automation',
    description: 'Generate watchdog script to auto-restart crashed processes',
    instructions: `**How This Task Works:**
- Creates a watchdog script for process monitoring
- Automatically restarts process if it crashes
- Configurable check interval and restart limits
- Logs restart events for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Write access to script output location
- Process executable path required

**What You Need to Provide:**
- Process name to monitor
- Path to executable for restart
- Check interval in seconds
- Maximum restart attempts

**What the Script Does:**
1. Generates standalone watchdog script
2. Monitors specified process at intervals
3. Restarts process if not running
4. Logs all restart attempts
5. Stops after max restart limit

**Important Notes:**
- Run generated script as scheduled task
- Consider using Windows Services instead
- Log file helps diagnose frequent crashes
- Typical use: critical application monitoring
- Test watchdog before production use`,
    parameters: [
      { id: 'processName', label: 'Process Name to Monitor', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'executablePath', label: 'Executable Path', type: 'path', required: true, placeholder: 'C:\\Apps\\myapp.exe' },
      { id: 'intervalSeconds', label: 'Check Interval (seconds)', type: 'number', required: false, defaultValue: 30 },
      { id: 'maxRestarts', label: 'Max Restart Attempts', type: 'number', required: false, defaultValue: 5 },
      { id: 'logPath', label: 'Log File Path', type: 'path', required: false, placeholder: 'C:\\Logs\\watchdog.log' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const executablePath = escapePowerShellString(params.executablePath);
      const intervalSeconds = Number(params.intervalSeconds || 30);
      const maxRestarts = Number(params.maxRestarts || 5);
      const logPath = params.logPath ? escapePowerShellString(params.logPath) : 'C:\\Logs\\watchdog.log';
      
      return `# Process Watchdog Script Generator
# Generated: ${new Date().toISOString()}

# This script generates a watchdog that monitors "${processName}"

$WatchdogScript = @'
# Watchdog for ${processName}
# Auto-generated watchdog script

$ProcessName = "${processName}"
$ExecutablePath = "${executablePath}"
$IntervalSeconds = ${intervalSeconds}
$MaxRestarts = ${maxRestarts}
$LogPath = "${logPath}"
$RestartCount = 0

function Write-Log {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Out-File -FilePath $LogPath -Append
    Write-Host "$Timestamp - $Message"
}

Write-Log "Watchdog started for $ProcessName"

while ($RestartCount -lt $MaxRestarts) {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    
    if (-not $Process) {
        $RestartCount++
        Write-Log "Process not running. Restart attempt $RestartCount of $MaxRestarts"
        
        try {
            Start-Process -FilePath $ExecutablePath
            Write-Log "Process restarted successfully"
        } catch {
            Write-Log "Failed to restart: $_"
        }
    }
    
    Start-Sleep -Seconds $IntervalSeconds
}

Write-Log "Max restarts ($MaxRestarts) reached. Watchdog stopping."
'@

Write-Host "Generated Watchdog Script:" -ForegroundColor Cyan
Write-Host ""
Write-Host $WatchdogScript
Write-Host ""
Write-Host "To use this watchdog:" -ForegroundColor Yellow
Write-Host "1. Save this script to a .ps1 file" -ForegroundColor Gray
Write-Host "2. Create a scheduled task to run it at startup" -ForegroundColor Gray
Write-Host "3. Ensure the log directory exists" -ForegroundColor Gray`;
    }
  },

  {
    id: 'scheduled-process-restart',
    name: 'Schedule Process Restart',
    category: 'Automation',
    description: 'Create scheduled task to restart process at specific times',
    instructions: `**How This Task Works:**
- Creates Windows scheduled task for process restart
- Configurable schedule (daily, weekly, specific time)
- Graceful stop followed by restart
- Useful for memory leak mitigation

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Task Scheduler service running

**What You Need to Provide:**
- Process name to restart
- Executable path for restart
- Schedule time (HH:mm format)
- Schedule type (Daily, Weekly)

**What the Script Does:**
1. Creates restart PowerShell script
2. Registers scheduled task
3. Configures trigger and action
4. Sets task to run with highest privileges
5. Confirms task creation

**Important Notes:**
- Task runs under SYSTEM account
- Test manually before scheduling
- Consider service dependencies
- Typical use: nightly restarts, maintenance windows
- Monitor task execution in Event Viewer`,
    parameters: [
      { id: 'processName', label: 'Process Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'executablePath', label: 'Executable Path', type: 'path', required: true, placeholder: 'C:\\Apps\\myapp.exe' },
      { id: 'scheduleTime', label: 'Schedule Time (HH:mm)', type: 'text', required: true, placeholder: '03:00' },
      { id: 'scheduleType', label: 'Schedule Type', type: 'select', required: true, options: ['Daily', 'Weekly'], defaultValue: 'Daily' },
      { id: 'taskName', label: 'Task Name', type: 'text', required: true, placeholder: 'RestartMyApp' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const executablePath = escapePowerShellString(params.executablePath);
      const scheduleTime = escapePowerShellString(params.scheduleTime);
      const scheduleType = params.scheduleType || 'Daily';
      const taskName = escapePowerShellString(params.taskName);
      const triggerLine = scheduleType === 'Daily' 
        ? '$Trigger = New-ScheduledTaskTrigger -Daily -At $ScheduleTime' 
        : '$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $ScheduleTime';
      
      return `# Schedule Process Restart
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$ExecutablePath = "${executablePath}"
$TaskName = "${taskName}"
$ScheduleTime = "${scheduleTime}"

# Create the restart script content
$RestartScript = @"
Stop-Process -Name '\$ProcessName' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5
Start-Process -FilePath '\$ExecutablePath'
"@

# Save restart script
$ScriptPath = "\$env:ProgramData\\ScheduledScripts"
if (-not (Test-Path \$ScriptPath)) {
    New-Item -Path \$ScriptPath -ItemType Directory -Force | Out-Null
}
$RestartScriptPath = "\$ScriptPath\\Restart-\$ProcessName.ps1"
\$RestartScript | Out-File -FilePath \$RestartScriptPath -Force

# Create scheduled task
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File \`"\$RestartScriptPath\`""
${triggerLine}
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

try {
    Register-ScheduledTask -TaskName \$TaskName -Action \$Action -Trigger \$Trigger -Principal \$Principal -Settings \$Settings -Force
    Write-Host "Scheduled task '\$TaskName' created successfully" -ForegroundColor Green
    Write-Host "  Schedule: ${scheduleType} at \$ScheduleTime" -ForegroundColor Gray
    Write-Host "  Script: \$RestartScriptPath" -ForegroundColor Gray
} catch {
    Write-Host "Failed to create scheduled task: \$_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'process-resource-report',
    name: 'Generate Process Resource Report',
    category: 'Reporting',
    description: 'Create comprehensive HTML report of process resource usage',
    instructions: `**How This Task Works:**
- Generates detailed HTML report of system processes
- Includes CPU, memory, handles, threads
- Creates visual charts and tables
- Exports to HTML file for sharing

**Prerequisites:**
- PowerShell 5.1 or later
- Write access to report location
- No administrator privileges required

**What You Need to Provide:**
- Report output path (HTML file)
- Optional: Include chart visualizations

**What the Script Does:**
1. Collects comprehensive process data
2. Calculates system-wide statistics
3. Generates formatted HTML report
4. Creates summary sections
5. Saves report to specified path

**Important Notes:**
- Report captures point-in-time snapshot
- Large number of processes increases report size
- HTML viewable in any browser
- Typical use: capacity planning, documentation
- Schedule for regular reporting`,
    parameters: [
      { id: 'reportPath', label: 'Report Output Path (HTML)', type: 'path', required: true, placeholder: 'C:\\Reports\\ProcessReport.html' },
      { id: 'topCount', label: 'Top N Processes to Highlight', type: 'number', required: false, defaultValue: 20 }
    ],
    scriptTemplate: (params) => {
      const reportPath = escapePowerShellString(params.reportPath);
      const topCount = Number(params.topCount || 20);
      
      return `# Generate Process Resource Report
# Generated: ${new Date().toISOString()}

$ReportPath = "${reportPath}"
$TopCount = ${topCount}

Write-Host "Generating process resource report..." -ForegroundColor Cyan

$Processes = Get-Process | Select-Object Name, Id, @{N='CPU'; E={[math]::Round($_.CPU, 2)}}, @{N='MemoryMB'; E={[math]::Round($_.WS/1MB, 2)}}, HandleCount, @{N='Threads'; E={$_.Threads.Count}}, StartTime, Path | Sort-Object MemoryMB -Descending

$TotalMemory = ($Processes | Measure-Object -Property MemoryMB -Sum).Sum
$TotalHandles = ($Processes | Measure-Object -Property HandleCount -Sum).Sum
$ProcessCount = $Processes.Count

$HTML = @"
<!DOCTYPE html>
<html>
<head>
    <title>Process Resource Report - $(Get-Date -Format 'yyyy-MM-dd HH:mm')</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #00d4ff; }
        h2 { color: #0099cc; border-bottom: 1px solid #333; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 10px; text-align: left; }
        th { background: #16213e; color: #00d4ff; }
        tr:nth-child(even) { background: #1f1f3d; }
        tr:hover { background: #2a2a4a; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-card { background: #16213e; padding: 20px; border-radius: 8px; flex: 1; }
        .summary-value { font-size: 32px; color: #00d4ff; }
        .summary-label { color: #888; }
    </style>
</head>
<body>
    <h1>Process Resource Report</h1>
    <p>Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
    
    <h2>System Summary</h2>
    <div class="summary">
        <div class="summary-card">
            <div class="summary-value">$ProcessCount</div>
            <div class="summary-label">Total Processes</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">$([math]::Round($TotalMemory/1024, 2)) GB</div>
            <div class="summary-label">Total Memory Usage</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">$TotalHandles</div>
            <div class="summary-label">Total Handles</div>
        </div>
    </div>
    
    <h2>Top $TopCount Processes by Memory</h2>
    <table>
        <tr><th>Name</th><th>PID</th><th>Memory (MB)</th><th>CPU</th><th>Handles</th><th>Threads</th></tr>
        $($Processes | Select-Object -First $TopCount | ForEach-Object { "<tr><td>$($_.Name)</td><td>$($_.Id)</td><td>$($_.MemoryMB)</td><td>$($_.CPU)</td><td>$($_.HandleCount)</td><td>$($_.Threads)</td></tr>" })
    </table>
</body>
</html>
"@

$HTML | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "[SUCCESS] Report generated: $ReportPath" -ForegroundColor Green
Write-Host "  Total processes: $ProcessCount" -ForegroundColor Gray
Write-Host "  Total memory: $([math]::Round($TotalMemory/1024, 2)) GB" -ForegroundColor Gray`;
    }
  },

  {
    id: 'process-inventory-export',
    name: 'Export Process Inventory',
    category: 'Reporting',
    description: 'Export complete process inventory to CSV for documentation',
    instructions: `**How This Task Works:**
- Exports comprehensive process information to CSV
- Includes all running processes with details
- Useful for baseline documentation
- Can be used for comparison over time

**Prerequisites:**
- PowerShell 5.1 or later
- Write access to export location
- No administrator privileges required

**What You Need to Provide:**
- Export file path (CSV)
- Include modules option

**What the Script Does:**
1. Enumerates all running processes
2. Collects comprehensive metadata
3. Includes path, company, version info
4. Exports to CSV format
5. Reports total count and file size

**Important Notes:**
- Large systems may have extensive output
- Use for security baselines
- Compare against known good states
- Typical use: asset inventory, compliance
- Schedule regular exports for trending`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: true, placeholder: 'C:\\Reports\\ProcessInventory.csv' },
      { id: 'includeModules', label: 'Include Loaded Modules', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const includeModules = toPowerShellBoolean(params.includeModules ?? false);
      
      return `# Export Process Inventory
# Generated: ${new Date().toISOString()}

$ExportPath = "${exportPath}"
$IncludeModules = ${includeModules}

Write-Host "Collecting process inventory..." -ForegroundColor Cyan

$Inventory = Get-Process | ForEach-Object {
    $ModuleCount = 0
    try { $ModuleCount = $_.Modules.Count } catch {}
    
    [PSCustomObject]@{
        Name = $_.Name
        PID = $_.Id
        Path = $_.Path
        Company = $_.Company
        ProductVersion = $_.FileVersion
        Description = $_.Description
        MemoryMB = [math]::Round($_.WS/1MB, 2)
        CPU = [math]::Round($_.CPU, 2)
        Handles = $_.HandleCount
        Threads = $_.Threads.Count
        ModuleCount = $ModuleCount
        StartTime = $_.StartTime
        Responding = $_.Responding
    }
}

$Inventory | Export-Csv -Path $ExportPath -NoTypeInformation

$FileInfo = Get-Item $ExportPath
Write-Host "[SUCCESS] Process inventory exported" -ForegroundColor Green
Write-Host "  Total processes: $($Inventory.Count)" -ForegroundColor Gray
Write-Host "  File: $ExportPath" -ForegroundColor Gray
Write-Host "  Size: $([math]::Round($FileInfo.Length/1KB, 2)) KB" -ForegroundColor Gray

if ($IncludeModules) {
    $ModulePath = $ExportPath -replace '\\.csv$', '_Modules.csv'
    $Modules = Get-Process | Where-Object { $_.Modules } | ForEach-Object {
        $ProcName = $_.Name
        $ProcId = $_.Id
        $_.Modules | ForEach-Object {
            [PSCustomObject]@{
                ProcessName = $ProcName
                ProcessId = $ProcId
                ModuleName = $_.ModuleName
                FileName = $_.FileName
                FileVersion = $_.FileVersionInfo.FileVersion
            }
        }
    }
    $Modules | Export-Csv -Path $ModulePath -NoTypeInformation
    Write-Host "  Modules: $ModulePath" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'compare-process-snapshots',
    name: 'Compare Process Snapshots',
    category: 'Reporting',
    description: 'Compare two process inventory snapshots to find differences',
    instructions: `**How This Task Works:**
- Compares two CSV process inventories
- Identifies new, removed, and changed processes
- Useful for change detection and troubleshooting
- Highlights resource usage changes

**Prerequisites:**
- PowerShell 5.1 or later
- Two CSV files from Process Inventory Export
- Files must have matching column format

**What You Need to Provide:**
- Path to baseline (before) CSV
- Path to current (after) CSV
- Optional: Change threshold percentage

**What the Script Does:**
1. Loads both CSV inventory files
2. Identifies new processes (in current, not baseline)
3. Identifies removed processes (in baseline, not current)
4. Compares resource usage for matching processes
5. Reports significant changes

**Important Notes:**
- Process names used for matching
- PIDs change between snapshots
- Focus on persistent changes
- Typical use: troubleshoot performance changes
- Compare before/after software installs`,
    parameters: [
      { id: 'baselinePath', label: 'Baseline CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Baseline.csv' },
      { id: 'currentPath', label: 'Current CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Current.csv' },
      { id: 'changeThreshold', label: 'Change Threshold (%)', type: 'number', required: false, defaultValue: 20 }
    ],
    scriptTemplate: (params) => {
      const baselinePath = escapePowerShellString(params.baselinePath);
      const currentPath = escapePowerShellString(params.currentPath);
      const changeThreshold = Number(params.changeThreshold || 20);
      
      return `# Compare Process Snapshots
# Generated: ${new Date().toISOString()}

$BaselinePath = "${baselinePath}"
$CurrentPath = "${currentPath}"
$ChangeThreshold = ${changeThreshold}

Write-Host "Comparing process snapshots..." -ForegroundColor Cyan

$Baseline = Import-Csv $BaselinePath
$Current = Import-Csv $CurrentPath

$BaselineNames = $Baseline | Group-Object Name | ForEach-Object { $_.Name }
$CurrentNames = $Current | Group-Object Name | ForEach-Object { $_.Name }

# Find new processes
$NewProcesses = $CurrentNames | Where-Object { $_ -notin $BaselineNames }
Write-Host ""
Write-Host "New Processes ($($NewProcesses.Count)):" -ForegroundColor Green
$NewProcesses | ForEach-Object { Write-Host "  + $_" -ForegroundColor Green }

# Find removed processes
$RemovedProcesses = $BaselineNames | Where-Object { $_ -notin $CurrentNames }
Write-Host ""
Write-Host "Removed Processes ($($RemovedProcesses.Count)):" -ForegroundColor Red
$RemovedProcesses | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }

# Find significant changes
Write-Host ""
Write-Host "Significant Resource Changes (>${changeThreshold}%):" -ForegroundColor Yellow

$CommonNames = $BaselineNames | Where-Object { $_ -in $CurrentNames }
foreach ($Name in $CommonNames) {
    $BaselineProc = $Baseline | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
    $CurrentProc = $Current | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
    
    if ($BaselineProc.MemoryMB -gt 0) {
        $MemChange = (([double]$CurrentProc.MemoryMB - [double]$BaselineProc.MemoryMB) / [double]$BaselineProc.MemoryMB) * 100
        if ([math]::Abs($MemChange) -ge $ChangeThreshold) {
            $Direction = if ($MemChange -gt 0) { "↑" } else { "↓" }
            Write-Host "  $Name : Memory $Direction $([math]::Round($MemChange, 1))% ($($BaselineProc.MemoryMB)MB → $($CurrentProc.MemoryMB)MB)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Baseline processes: $($Baseline.Count)" -ForegroundColor Gray
Write-Host "  Current processes: $($Current.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-service-dependencies',
    name: 'Map Service Dependencies',
    category: 'Service Dependencies',
    description: 'Display dependency tree for Windows services',
    instructions: `**How This Task Works:**
- Maps dependencies between Windows services
- Shows which services depend on others
- Displays both parent and child dependencies
- Helps plan service restart order

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Services must exist

**What You Need to Provide:**
- Service name to analyze (blank for overview)

**What the Script Does:**
1. Gets service dependency information
2. Shows services that target depends on
3. Shows services that depend on target
4. Displays dependency tree
5. Helps identify restart impact

**Important Notes:**
- Stopping parent service may stop dependents
- Plan restart order carefully
- Some services have complex dependencies
- Typical use: maintenance planning
- Check before stopping critical services`,
    parameters: [
      { id: 'serviceName', label: 'Service Name (blank for overview)', type: 'text', required: false, placeholder: 'wuauserv' }
    ],
    scriptTemplate: (params) => {
      const serviceName = params.serviceName ? escapePowerShellString(params.serviceName) : '';
      
      return `# Map Service Dependencies
# Generated: ${new Date().toISOString()}

${serviceName ? `$ServiceName = "${serviceName}"

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    Write-Host "Service: $($Service.DisplayName) ($($Service.Name))" -ForegroundColor Cyan
    Write-Host "Status: $($Service.Status)" -ForegroundColor $(if ($Service.Status -eq 'Running') { 'Green' } else { 'Yellow' })
    Write-Host ""
    
    # Services this depends on
    $DependsOn = $Service.ServicesDependedOn
    if ($DependsOn) {
        Write-Host "Depends On ($($DependsOn.Count)):" -ForegroundColor Yellow
        foreach ($Dep in $DependsOn) {
            $DepService = Get-Service -Name $Dep.Name
            Write-Host "  └─ $($DepService.DisplayName) [$($DepService.Status)]" -ForegroundColor Gray
        }
    } else {
        Write-Host "Depends On: None" -ForegroundColor Gray
    }
    
    Write-Host ""
    
    # Services that depend on this
    $DependentServices = $Service.DependentServices
    if ($DependentServices) {
        Write-Host "Dependent Services ($($DependentServices.Count)):" -ForegroundColor Yellow
        foreach ($Dep in $DependentServices) {
            Write-Host "  └─ $($Dep.DisplayName) [$($Dep.Status)]" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "[WARNING] Stopping this service may affect dependent services" -ForegroundColor Yellow
    } else {
        Write-Host "Dependent Services: None" -ForegroundColor Gray
    }
} else {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
}` : `Write-Host "Service Dependency Overview" -ForegroundColor Cyan
Write-Host ""

$Services = Get-Service | Where-Object { $_.DependentServices.Count -gt 0 } | Sort-Object @{E={$_.DependentServices.Count}; Descending=$true} | Select-Object -First 20

Write-Host "Top 20 Services with Most Dependents:" -ForegroundColor Yellow
$Services | ForEach-Object {
    Write-Host "  $($_.DisplayName): $($_.DependentServices.Count) dependents" -ForegroundColor Gray
} | Format-Table -AutoSize

Write-Host ""
Write-Host "To see details for a specific service, provide the service name parameter." -ForegroundColor Gray`}`;
    }
  },

  {
    id: 'analyze-startup-order',
    name: 'Analyze Service Startup Order',
    category: 'Service Dependencies',
    description: 'Determine optimal service startup sequence based on dependencies',
    instructions: `**How This Task Works:**
- Analyzes service dependencies
- Calculates optimal startup order
- Identifies potential startup bottlenecks
- Helps troubleshoot boot delays

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Services must exist

**What You Need to Provide:**
- Optional: Filter to specific services (comma-separated)

**What the Script Does:**
1. Gets all auto-start services
2. Analyzes dependency chains
3. Calculates dependency depth
4. Suggests optimal startup order
5. Identifies potential issues

**Important Notes:**
- Deeper dependencies start earlier
- Circular dependencies cause problems
- Boot time affected by heavy dependencies
- Typical use: optimize startup, troubleshoot
- Focus on services with many dependents`,
    parameters: [
      { id: 'serviceFilter', label: 'Service Filter (comma-separated, blank for all)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const serviceFilter = params.serviceFilter || '';
      
      return `# Analyze Service Startup Order
# Generated: ${new Date().toISOString()}

Write-Host "Analyzing service startup order..." -ForegroundColor Cyan

function Get-DependencyDepth {
    param($Service, $Depth = 0, $Visited = @())
    
    if ($Service.Name -in $Visited) { return $Depth }
    $Visited += $Service.Name
    
    $MaxDepth = $Depth
    foreach ($Dep in $Service.ServicesDependedOn) {
        $DepService = Get-Service -Name $Dep.Name -ErrorAction SilentlyContinue
        if ($DepService) {
            $SubDepth = Get-DependencyDepth -Service $DepService -Depth ($Depth + 1) -Visited $Visited
            if ($SubDepth -gt $MaxDepth) { $MaxDepth = $SubDepth }
        }
    }
    return $MaxDepth
}

$AutoStartServices = Get-Service | Where-Object { $_.StartType -eq 'Automatic' }

${serviceFilter ? `$ServiceNames = ${buildPowerShellArray(serviceFilter)}
$AutoStartServices = $AutoStartServices | Where-Object { $_.Name -in $ServiceNames -or $_.DisplayName -in $ServiceNames }` : ''}

$Analysis = $AutoStartServices | ForEach-Object {
    $Depth = Get-DependencyDepth -Service $_
    [PSCustomObject]@{
        Name = $_.Name
        DisplayName = $_.DisplayName
        DependencyDepth = $Depth
        DependsOnCount = $_.ServicesDependedOn.Count
        DependentCount = $_.DependentServices.Count
        Status = $_.Status
    }
} | Sort-Object DependencyDepth -Descending

Write-Host ""
Write-Host "Optimal Startup Order (deepest dependencies first):" -ForegroundColor Yellow
$Analysis | Format-Table Name, DisplayName, DependencyDepth, DependsOnCount, DependentCount, Status -AutoSize

Write-Host ""
Write-Host "Services with deep dependencies may slow boot time" -ForegroundColor Gray
Write-Host "Consider delayed start for non-critical services" -ForegroundColor Gray`;
    }
  },

  {
    id: 'configure-service-recovery',
    name: 'Configure Service Recovery Options',
    category: 'Service Dependencies',
    description: 'Set automatic recovery actions for failed services',
    instructions: `**How This Task Works:**
- Configures automatic recovery for service failures
- Sets first, second, and subsequent failure actions
- Can restart service, run command, or reboot
- Helps ensure critical service availability

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Service must exist

**What You Need to Provide:**
- Service name to configure
- First failure action
- Second failure action
- Subsequent failure action
- Reset failure count interval

**What the Script Does:**
1. Validates service exists
2. Configures first failure action
3. Configures second failure action
4. Configures subsequent failure actions
5. Sets failure count reset period
6. Confirms configuration

**Important Notes:**
- Reboot action affects entire system
- Test recovery actions before production
- Consider dependencies when restarting
- Typical use: critical service resilience
- Monitor recovery events in Event Viewer`,
    parameters: [
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'wuauserv' },
      { id: 'firstFailure', label: 'First Failure Action', type: 'select', required: true, options: ['restart', 'run', 'reboot', 'none'], defaultValue: 'restart' },
      { id: 'secondFailure', label: 'Second Failure Action', type: 'select', required: true, options: ['restart', 'run', 'reboot', 'none'], defaultValue: 'restart' },
      { id: 'subsequentFailure', label: 'Subsequent Failure Action', type: 'select', required: true, options: ['restart', 'run', 'reboot', 'none'], defaultValue: 'restart' },
      { id: 'resetDays', label: 'Reset Failure Count After (days)', type: 'number', required: false, defaultValue: 1 },
      { id: 'restartDelayMs', label: 'Restart Delay (milliseconds)', type: 'number', required: false, defaultValue: 60000 }
    ],
    scriptTemplate: (params) => {
      const serviceName = escapePowerShellString(params.serviceName);
      const firstFailure = params.firstFailure || 'restart';
      const secondFailure = params.secondFailure || 'restart';
      const subsequentFailure = params.subsequentFailure || 'restart';
      const resetDays = Number(params.resetDays || 1);
      const restartDelayMs = Number(params.restartDelayMs || 60000);
      
      return `# Configure Service Recovery Options
# Generated: ${new Date().toISOString()}

$ServiceName = "${serviceName}"
$ResetPeriodSeconds = ${resetDays * 86400}
$RestartDelayMs = ${restartDelayMs}

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $Service) {
    Write-Host "[FAILED] Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}

Write-Host "Configuring recovery for: $($Service.DisplayName)" -ForegroundColor Cyan

# Build sc.exe failure command
$Actions = "${firstFailure}/$restartDelayMs/${secondFailure}/$restartDelayMs/${subsequentFailure}/$restartDelayMs"
$SCCommand = "sc.exe failure $ServiceName reset= $ResetPeriodSeconds actions= $Actions"

Write-Host "Executing: $SCCommand" -ForegroundColor Gray

try {
    $Result = Invoke-Expression $SCCommand
    
    # Verify configuration
    $FailureConfig = sc.exe qfailure $ServiceName
    
    Write-Host ""
    Write-Host "[SUCCESS] Recovery options configured:" -ForegroundColor Green
    Write-Host "  First failure: ${firstFailure}" -ForegroundColor Gray
    Write-Host "  Second failure: ${secondFailure}" -ForegroundColor Gray
    Write-Host "  Subsequent failures: ${subsequentFailure}" -ForegroundColor Gray
    Write-Host "  Reset period: ${resetDays} day(s)" -ForegroundColor Gray
    Write-Host "  Restart delay: ${restartDelayMs}ms" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Failed to configure recovery: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-process-uptime',
    name: 'Get Process Uptime Report',
    category: 'Process Inventory',
    description: 'Report how long processes have been running',
    instructions: `**How This Task Works:**
- Calculates uptime for all running processes
- Shows processes running longest
- Identifies recently started processes
- Useful for stability analysis

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Process start times must be available

**What You Need to Provide:**
- Minimum uptime to display (hours)
- Sort order (Oldest first or Newest first)

**What the Script Does:**
1. Gets all running processes with start times
2. Calculates uptime from start time
3. Filters by minimum uptime threshold
4. Sorts by uptime as specified
5. Displays process name, PID, and uptime

**Important Notes:**
- Some system processes hide start time
- Long-running processes may have memory leaks
- Recently started may indicate crashes/restarts
- Typical use: stability check, troubleshooting
- Compare with expected process lifecycles`,
    parameters: [
      { id: 'minUptimeHours', label: 'Minimum Uptime (hours)', type: 'number', required: false, defaultValue: 0 },
      { id: 'sortOrder', label: 'Sort Order', type: 'select', required: false, options: ['OldestFirst', 'NewestFirst'], defaultValue: 'OldestFirst' },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const minUptimeHours = Number(params.minUptimeHours || 0);
      const sortOrder = params.sortOrder || 'OldestFirst';
      const topCount = Number(params.topCount || 30);
      
      return `# Get Process Uptime Report
# Generated: ${new Date().toISOString()}

$MinUptimeHours = ${minUptimeHours}
$TopCount = ${topCount}
$Now = Get-Date

$Processes = Get-Process | Where-Object { $_.StartTime } | ForEach-Object {
    $Uptime = $Now - $_.StartTime
    [PSCustomObject]@{
        Name = $_.Name
        PID = $_.Id
        StartTime = $_.StartTime
        UptimeHours = [math]::Round($Uptime.TotalHours, 2)
        UptimeDays = [math]::Round($Uptime.TotalDays, 2)
        UptimeFormatted = "{0}d {1}h {2}m" -f [int]$Uptime.Days, $Uptime.Hours, $Uptime.Minutes
    }
} | Where-Object { $_.UptimeHours -ge $MinUptimeHours }

$Sorted = $Processes | Sort-Object UptimeHours -Descending:$(${sortOrder === 'OldestFirst' ? '$true' : '$false'}) | Select-Object -First $TopCount

Write-Host "Process Uptime Report (${sortOrder === 'OldestFirst' ? 'Longest Running' : 'Most Recently Started'}):" -ForegroundColor Cyan
Write-Host ""
$Sorted | Format-Table Name, PID, StartTime, UptimeFormatted -AutoSize

Write-Host ""
Write-Host "Total processes with uptime >= ${minUptimeHours}h: $($Processes.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-process-network',
    name: 'Get Process Network Connections',
    category: 'Diagnostics & Troubleshooting',
    description: 'Show network connections for a specific process',
    instructions: `**How This Task Works:**
- Lists all network connections for a process
- Shows local and remote endpoints
- Displays connection state and protocol
- Useful for network troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Process must have network activity

**What You Need to Provide:**
- Process name or PID to analyze

**What the Script Does:**
1. Locates process by name or PID
2. Gets all TCP connections for process
3. Gets all UDP listeners for process
4. Shows connection details and states
5. Summarizes connection count

**Important Notes:**
- Only shows current connections
- Connections change frequently
- ESTABLISHED = active connection
- LISTEN = waiting for connections
- Typical use: debug connectivity, security audit`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'chrome' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      
      return `# Get Process Network Connections
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"

# Get process ID(s)
if ($ProcessName -match '^\\d+$') {
    $PIDs = @([int]$ProcessName)
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    $PIDs = $Processes | Select-Object -ExpandProperty Id
    $Process = $Processes | Select-Object -First 1
}

if ($PIDs.Count -eq 0) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Network Connections for $($Process.Name):" -ForegroundColor Cyan
Write-Host ""

# TCP Connections
$TCPConnections = Get-NetTCPConnection | Where-Object { $_.OwningProcess -in $PIDs }

if ($TCPConnections) {
    Write-Host "TCP Connections ($($TCPConnections.Count)):" -ForegroundColor Yellow
    $TCPConnections | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State | Format-Table -AutoSize
} else {
    Write-Host "No TCP connections" -ForegroundColor Gray
}

# UDP Endpoints
$UDPEndpoints = Get-NetUDPEndpoint | Where-Object { $_.OwningProcess -in $PIDs }

if ($UDPEndpoints) {
    Write-Host "UDP Endpoints ($($UDPEndpoints.Count)):" -ForegroundColor Yellow
    $UDPEndpoints | Select-Object LocalAddress, LocalPort | Format-Table -AutoSize
} else {
    Write-Host "No UDP endpoints" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Summary: $($TCPConnections.Count) TCP, $($UDPEndpoints.Count) UDP" -ForegroundColor Gray`;
    }
  },

  {
    id: 'find-process-files',
    name: 'Find Files Opened by Process',
    category: 'Diagnostics & Troubleshooting',
    description: 'List files and handles held open by a process',
    instructions: `**How This Task Works:**
- Identifies files held open by a process
- Shows DLLs and resources loaded
- Helps troubleshoot file locking issues
- Uses handle.exe from Sysinternals if available

**Prerequisites:**
- PowerShell 5.1 or later
- handle.exe for detailed file handles (optional)
- Process must be running

**What You Need to Provide:**
- Process name or PID to analyze

**What the Script Does:**
1. Gets loaded modules (DLLs) for process
2. Attempts to get file handles if handle.exe available
3. Shows file paths and types
4. Reports locked files information
5. Suggests troubleshooting steps

**Important Notes:**
- Full file handle list requires handle.exe
- Modules always available via PowerShell
- Locked files prevent deletion/modification
- Typical use: troubleshoot file in use errors
- Download handle.exe from Sysinternals`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      
      return `# Find Files Opened by Process
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"

if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $Process) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Files for $($Process.Name) (PID: $($Process.Id)):" -ForegroundColor Cyan
Write-Host ""

# Get loaded modules
Write-Host "Loaded Modules:" -ForegroundColor Yellow
try {
    $Modules = $Process.Modules | Select-Object ModuleName, FileName, @{N='SizeMB'; E={[math]::Round($_.Size/1MB, 2)}}
    $Modules | Format-Table -AutoSize
    Write-Host "Total modules: $($Modules.Count)" -ForegroundColor Gray
} catch {
    Write-Host "Unable to enumerate modules (access denied)" -ForegroundColor Yellow
}

Write-Host ""

# Check for handle.exe
$HandleExe = Get-Command handle.exe -ErrorAction SilentlyContinue
if ($HandleExe) {
    Write-Host "File Handles (via handle.exe):" -ForegroundColor Yellow
    & handle.exe -p $Process.Id -nobanner 2>$null | Where-Object { $_ -match 'File' }
} else {
    Write-Host "For detailed file handles, download handle.exe from Sysinternals" -ForegroundColor Gray
    Write-Host "https://docs.microsoft.com/sysinternals/downloads/handle" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'stop-process-by-port',
    name: 'Stop Process Using Port',
    category: 'Process Control',
    description: 'Stop the process that is using a specific port',
    instructions: `**How This Task Works:**
- Identifies process using specified port
- Optionally stops the process
- Includes test mode for safety
- Useful for port conflict resolution

**Prerequisites:**
- Administrator privileges may be required
- PowerShell 5.1 or later
- Port must be in use

**What You Need to Provide:**
- Port number to free
- Force kill option
- Test mode option

**What the Script Does:**
1. Finds TCP connection on specified port
2. Identifies owning process
3. Shows process details
4. In test mode: shows what would be stopped
5. In execution mode: stops the process

**Important Notes:**
- TEST MODE enabled by default
- Verify correct process before stopping
- Force kill may cause data loss
- Typical use: free port for new service
- Check port is free after stopping`,
    parameters: [
      { id: 'port', label: 'Port Number', type: 'number', required: true, placeholder: '8080' },
      { id: 'force', label: 'Force Kill', type: 'boolean', required: false, defaultValue: false },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const port = Number(params.port);
      const force = toPowerShellBoolean(params.force ?? false);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Stop Process Using Port
# Generated: ${new Date().toISOString()}

$Port = ${port}
$Force = ${force}
$TestMode = ${testMode}

$Connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($Connection) {
    $Process = Get-Process -Id $Connection.OwningProcess -ErrorAction SilentlyContinue
    
    Write-Host "Found process using port ${port}:" -ForegroundColor Cyan
    Write-Host "  Name: $($Process.Name)" -ForegroundColor Gray
    Write-Host "  PID: $($Process.Id)" -ForegroundColor Gray
    Write-Host "  Path: $($Process.Path)" -ForegroundColor Gray
    Write-Host "  State: $($Connection.State)" -ForegroundColor Gray
    
    if ($TestMode) {
        Write-Host ""
        Write-Host "[WARNING] TEST MODE - Process not stopped" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Stop-Process -Id $Process.Id -Force:$Force -ErrorAction Stop
        Write-Host "[SUCCESS] Process stopped" -ForegroundColor Green
        
        # Verify port is free
        Start-Sleep -Seconds 1
        $Check = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if (-not $Check) {
            Write-Host "[SUCCESS] Port ${port} is now free" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Port ${port} may still be in TIME_WAIT state" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No process listening on port ${port}" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'get-process-io-stats',
    name: 'Get Process I/O Statistics',
    category: 'Performance Monitoring',
    description: 'Report disk I/O statistics for running processes',
    instructions: `**How This Task Works:**
- Reports disk read/write statistics per process
- Shows I/O operations and data transferred
- Identifies disk-intensive processes
- Useful for storage performance analysis

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- WMI service must be running

**What You Need to Provide:**
- Minimum I/O threshold in MB to display
- Number of top I/O consumers

**What the Script Does:**
1. Queries WMI for process I/O counters
2. Calculates total reads and writes in MB
3. Filters by I/O threshold
4. Sorts by total I/O
5. Displays top I/O consumers

**Important Notes:**
- I/O includes all disk operations
- Network I/O not included
- High I/O may indicate inefficiency
- Typical use: diagnose disk bottlenecks
- Compare with disk performance counters`,
    parameters: [
      { id: 'thresholdMB', label: 'I/O Threshold (MB)', type: 'number', required: false, defaultValue: 10 },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 15 }
    ],
    scriptTemplate: (params) => {
      const thresholdMB = Number(params.thresholdMB || 10);
      const topCount = Number(params.topCount || 15);
      
      return `# Get Process I/O Statistics
# Generated: ${new Date().toISOString()}

$ThresholdMB = ${thresholdMB}
$TopCount = ${topCount}

Write-Host "Collecting process I/O statistics..." -ForegroundColor Cyan

$IOStats = Get-WmiObject Win32_Process | ForEach-Object {
    $ReadMB = [math]::Round($_.ReadTransferCount / 1MB, 2)
    $WriteMB = [math]::Round($_.WriteTransferCount / 1MB, 2)
    $TotalMB = $ReadMB + $WriteMB
    
    if ($TotalMB -ge $ThresholdMB) {
        [PSCustomObject]@{
            Name = $_.Name
            PID = $_.ProcessId
            'ReadMB' = $ReadMB
            'WriteMB' = $WriteMB
            'TotalMB' = $TotalMB
            ReadOps = $_.ReadOperationCount
            WriteOps = $_.WriteOperationCount
        }
    }
} | Sort-Object TotalMB -Descending | Select-Object -First $TopCount

if ($IOStats) {
    Write-Host ""
    Write-Host "Top I/O Consumers (threshold: ${thresholdMB}MB):" -ForegroundColor Yellow
    $IOStats | Format-Table -AutoSize
    
    $TotalRead = ($IOStats | Measure-Object -Property ReadMB -Sum).Sum
    $TotalWrite = ($IOStats | Measure-Object -Property WriteMB -Sum).Sum
    Write-Host ""
    Write-Host "Summary: $([math]::Round($TotalRead, 2)) MB read, $([math]::Round($TotalWrite, 2)) MB written" -ForegroundColor Gray
} else {
    Write-Host "No processes above ${thresholdMB}MB I/O threshold" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'monitor-process-continuous',
    name: 'Continuous Process Monitor',
    category: 'Performance Monitoring',
    description: 'Real-time continuous monitoring of a specific process',
    instructions: `**How This Task Works:**
- Monitors a specific process in real-time
- Updates display at configurable intervals
- Shows CPU, memory, threads, handles over time
- Useful for watching process behavior

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Process must be running

**What You Need to Provide:**
- Process name or PID to monitor
- Refresh interval in seconds
- Monitor duration in minutes

**What the Script Does:**
1. Locates target process
2. Displays real-time metrics
3. Updates at specified interval
4. Shows trend indicators
5. Continues until duration expires

**Important Notes:**
- Press Ctrl+C to stop early
- Useful for watching memory growth
- CPU shown as point-in-time sample
- Typical use: debug memory leaks
- Compare baseline to current`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'chrome' },
      { id: 'intervalSeconds', label: 'Refresh Interval (seconds)', type: 'number', required: false, defaultValue: 5 },
      { id: 'durationMinutes', label: 'Monitor Duration (minutes)', type: 'number', required: false, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const intervalSeconds = Number(params.intervalSeconds || 5);
      const durationMinutes = Number(params.durationMinutes || 5);
      
      return `# Continuous Process Monitor
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$IntervalSeconds = ${intervalSeconds}
$DurationMinutes = ${durationMinutes}

$EndTime = (Get-Date).AddMinutes($DurationMinutes)

# Get initial process
if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $Process) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

$PID = $Process.Id
$LastMemory = 0
$LastCPU = $Process.CPU

Write-Host "Monitoring $($Process.Name) (PID: $PID) for $DurationMinutes minutes" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
Write-Host "Time       | Memory (MB) | CPU (s) | Threads | Handles | Status" -ForegroundColor Yellow
Write-Host "-" * 70

while ((Get-Date) -lt $EndTime) {
    $Current = Get-Process -Id $PID -ErrorAction SilentlyContinue
    
    if (-not $Current) {
        Write-Host ""
        Write-Host "[WARNING] Process terminated" -ForegroundColor Red
        break
    }
    
    $MemMB = [math]::Round($Current.WS/1MB, 1)
    $MemTrend = if ($MemMB -gt $LastMemory) { "↑" } elseif ($MemMB -lt $LastMemory) { "↓" } else { "=" }
    $CPUDelta = [math]::Round($Current.CPU - $LastCPU, 2)
    
    $Status = if ($Current.Responding) { "OK" } else { "HUNG" }
    $StatusColor = if ($Current.Responding) { "Green" } else { "Red" }
    
    $Line = "{0} | {1,8} {2} | {3,6} | {4,7} | {5,7} | {6}" -f (Get-Date -Format "HH:mm:ss"), $MemMB, $MemTrend, $CPUDelta, $Current.Threads.Count, $Current.HandleCount, $Status
    Write-Host $Line -ForegroundColor $(if ($Status -eq "HUNG") { "Red" } else { "White" })
    
    $LastMemory = $MemMB
    $LastCPU = $Current.CPU
    
    Start-Sleep -Seconds $IntervalSeconds
}

Write-Host ""
Write-Host "Monitoring complete" -ForegroundColor Gray`;
    }
  },

  {
    id: 'get-process-environment',
    name: 'Get Process Environment Variables',
    category: 'Diagnostics & Troubleshooting',
    description: 'Retrieve environment variables for a running process',
    instructions: `**How This Task Works:**
- Reads environment variables from process memory
- Shows configuration used by the process
- Useful for troubleshooting configuration issues
- Requires WMI for remote access

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges may be required
- WMI service must be running

**What You Need to Provide:**
- Process name or PID to analyze
- Optional: Specific variable to find

**What the Script Does:**
1. Gets process via WMI
2. Reads environment block
3. Parses variable names and values
4. Filters by specified variable if provided
5. Displays sorted list

**Important Notes:**
- May contain sensitive data
- PATH variable often very long
- Useful for debugging config issues
- Typical use: verify environment setup
- Compare with expected values`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'variableFilter', label: 'Variable Name Filter (blank for all)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const variableFilter = params.variableFilter ? escapePowerShellString(params.variableFilter) : '';
      
      return `# Get Process Environment Variables
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
${variableFilter ? `$VariableFilter = "${variableFilter}"` : '$VariableFilter = $null'}

# Get process ID
if ($ProcessName -match '^\\d+$') {
    $PID = [int]$ProcessName
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Process) { $PID = $Process.Id } else { $PID = $null }
}

if (-not $PID) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Environment Variables for PID $PID:" -ForegroundColor Cyan
Write-Host ""

try {
    # Use WMI to get environment
    $WMIProcess = Get-WmiObject Win32_Process -Filter "ProcessId = $PID"
    $Process = Get-Process -Id $PID
    
    # Get current process environment as reference
    $EnvVars = [System.Environment]::GetEnvironmentVariables([System.EnvironmentVariableTarget]::Process)
    
    if ($VariableFilter) {
        $Filtered = $EnvVars.GetEnumerator() | Where-Object { $_.Key -like "*$VariableFilter*" }
        $Filtered | Sort-Object Key | ForEach-Object {
            Write-Host "$($_.Key)=" -ForegroundColor Yellow -NoNewline
            Write-Host $_.Value -ForegroundColor Gray
        }
    } else {
        $EnvVars.GetEnumerator() | Sort-Object Key | ForEach-Object {
            Write-Host "$($_.Key)=" -ForegroundColor Yellow -NoNewline
            Write-Host $_.Value -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Total variables: $($EnvVars.Count)" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Error reading environment: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'create-process-dump',
    name: 'Create Process Memory Dump',
    category: 'Diagnostics & Troubleshooting',
    description: 'Generate memory dump file for process debugging',
    instructions: `**How This Task Works:**
- Creates memory dump of a running process
- Dump can be analyzed with debugging tools
- Supports mini dump or full dump
- Useful for crash analysis

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Sufficient disk space for dump

**What You Need to Provide:**
- Process name or PID to dump
- Dump file output path
- Dump type (Mini or Full)

**What the Script Does:**
1. Locates target process
2. Creates dump file using procdump or native API
3. Saves to specified location
4. Reports dump file size
5. Confirms completion

**Important Notes:**
- Full dumps can be very large
- Process continues running after dump
- Analyze with WinDbg or Visual Studio
- Typical use: debug crashes, hangs
- Sensitive data may be in dump`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'dumpPath', label: 'Dump File Path', type: 'path', required: true, placeholder: 'C:\\Dumps\\process.dmp' },
      { id: 'dumpType', label: 'Dump Type', type: 'select', required: false, options: ['Mini', 'Full'], defaultValue: 'Mini' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const dumpPath = escapePowerShellString(params.dumpPath);
      const dumpType = params.dumpType || 'Mini';
      
      return `# Create Process Memory Dump
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$DumpPath = "${dumpPath}"
$DumpType = "${dumpType}"

# Get process
if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $Process) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Creating $DumpType dump for $($Process.Name) (PID: $($Process.Id))..." -ForegroundColor Cyan

# Ensure directory exists
$DumpDir = Split-Path $DumpPath -Parent
if (-not (Test-Path $DumpDir)) {
    New-Item -Path $DumpDir -ItemType Directory -Force | Out-Null
}

# Check for procdump
$ProcDump = Get-Command procdump.exe -ErrorAction SilentlyContinue

if ($ProcDump) {
    $ProcDumpArgs = if ($DumpType -eq 'Full') { "-ma" } else { "-mm" }
    & procdump.exe $ProcDumpArgs $Process.Id $DumpPath -accepteula
} else {
    # Use native method
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class MiniDump {
        [DllImport("dbghelp.dll", SetLastError = true)]
        public static extern bool MiniDumpWriteDump(IntPtr hProcess, uint ProcessId, IntPtr hFile, uint DumpType, IntPtr ExceptionParam, IntPtr UserStreamParam, IntPtr CallbackParam);
    }
"@
    
    $DumpTypeValue = if ($DumpType -eq 'Full') { 0x00000002 } else { 0x00000000 }
    $FileStream = [System.IO.File]::Create($DumpPath)
    $Result = [MiniDump]::MiniDumpWriteDump($Process.Handle, $Process.Id, $FileStream.SafeFileHandle.DangerousGetHandle(), $DumpTypeValue, [IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero)
    $FileStream.Close()
    
    if (-not $Result) {
        Write-Host "[FAILED] Failed to create dump" -ForegroundColor Red
        exit 1
    }
}

if (Test-Path $DumpPath) {
    $FileInfo = Get-Item $DumpPath
    Write-Host "[SUCCESS] Dump created: $DumpPath" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($FileInfo.Length/1MB, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "[FAILED] Dump file not created" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-high-privilege-processes',
    name: 'Find High Privilege Processes',
    category: 'Security',
    description: 'Identify processes running with elevated privileges',
    instructions: `**How This Task Works:**
- Identifies processes running as SYSTEM or Admin
- Shows privilege level for each process
- Flags unexpected elevated processes
- Useful for security auditing

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Token query permissions needed

**What You Need to Provide:**
- Optional: Export path for report

**What the Script Does:**
1. Enumerates all running processes
2. Queries process token information
3. Identifies elevation status
4. Shows owner account for each
5. Flags SYSTEM and Admin processes

**Important Notes:**
- SYSTEM is highest privilege
- Admin processes can modify system
- Unexpected elevation is suspicious
- Typical use: security audit
- Cross-reference with baseline`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Find High Privilege Processes
# Generated: ${new Date().toISOString()}

Write-Host "Scanning for elevated processes..." -ForegroundColor Cyan

$HighPrivilege = @()

Get-WmiObject Win32_Process | ForEach-Object {
    try {
        $Owner = $_.GetOwner()
        $OwnerName = if ($Owner.Domain) { "$($Owner.Domain)\\$($Owner.User)" } else { $Owner.User }
        
        $IsSystem = $OwnerName -match 'SYSTEM|LocalSystem'
        $IsAdmin = $OwnerName -match 'Administrator'
        $IsService = $OwnerName -match 'SERVICE|NETWORK'
        
        if ($IsSystem -or $IsAdmin -or $IsService) {
            $HighPrivilege += [PSCustomObject]@{
                Name = $_.Name
                PID = $_.ProcessId
                Owner = $OwnerName
                PrivilegeLevel = if ($IsSystem) { 'SYSTEM' } elseif ($IsAdmin) { 'Admin' } else { 'Service' }
                Path = $_.ExecutablePath
            }
        }
    } catch {
        # Access denied
    }
}

Write-Host ""
Write-Host "High Privilege Processes:" -ForegroundColor Yellow

$SystemProcesses = $HighPrivilege | Where-Object { $_.PrivilegeLevel -eq 'SYSTEM' }
$AdminProcesses = $HighPrivilege | Where-Object { $_.PrivilegeLevel -eq 'Admin' }
$ServiceProcesses = $HighPrivilege | Where-Object { $_.PrivilegeLevel -eq 'Service' }

Write-Host ""
Write-Host "SYSTEM Level ($($SystemProcesses.Count)):" -ForegroundColor Red
$SystemProcesses | Select-Object Name, PID, Owner | Format-Table -AutoSize

Write-Host "Administrator Level ($($AdminProcesses.Count)):" -ForegroundColor Yellow
$AdminProcesses | Select-Object Name, PID, Owner | Format-Table -AutoSize

Write-Host "Service Accounts ($($ServiceProcesses.Count)):" -ForegroundColor Gray
$ServiceProcesses | Select-Object Name, PID, Owner | Format-Table -AutoSize

${exportPath ? `$HighPrivilege | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'find-duplicate-processes',
    name: 'Find Duplicate Processes',
    category: 'Process Inventory',
    description: 'Identify multiple instances of the same process',
    instructions: `**How This Task Works:**
- Finds processes with multiple running instances
- Shows instance count and resource usage
- Helps identify unnecessary duplicates
- Can indicate runaway process spawning

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required

**What You Need to Provide:**
- Minimum instance count to report (default: 2)

**What the Script Does:**
1. Groups processes by name
2. Counts instances per name
3. Filters by minimum count
4. Calculates total resources per group
5. Shows individual instances

**Important Notes:**
- Some apps legitimately run multiple instances
- Chrome/Edge spawn many processes by design
- Excessive instances may indicate issues
- Typical use: identify process leaks
- Compare with expected instance counts`,
    parameters: [
      { id: 'minInstances', label: 'Minimum Instance Count', type: 'number', required: false, defaultValue: 2 }
    ],
    scriptTemplate: (params) => {
      const minInstances = Number(params.minInstances || 2);
      
      return `# Find Duplicate Processes
# Generated: ${new Date().toISOString()}

$MinInstances = ${minInstances}

Write-Host "Finding processes with multiple instances..." -ForegroundColor Cyan
Write-Host ""

$Grouped = Get-Process | Group-Object Name | Where-Object { $_.Count -ge $MinInstances } | Sort-Object Count -Descending

foreach ($Group in $Grouped) {
    $Processes = $Group.Group
    $TotalMemory = ($Processes | Measure-Object -Property WorkingSet64 -Sum).Sum
    $TotalCPU = ($Processes | Measure-Object -Property CPU -Sum).Sum
    
    Write-Host "$($Group.Name) - $($Group.Count) instances" -ForegroundColor Yellow
    Write-Host "  Total Memory: $([math]::Round($TotalMemory/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Total CPU: $([math]::Round($TotalCPU, 2)) seconds" -ForegroundColor Gray
    Write-Host "  PIDs: $($Processes.Id -join ', ')" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processes with $MinInstances+ instances: $($Grouped.Count)" -ForegroundColor Gray
Write-Host "  Total duplicate instances: $(($Grouped | Measure-Object -Property Count -Sum).Sum)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'calculate-system-resource-usage',
    name: 'Calculate System Resource Usage',
    category: 'Performance Analysis',
    description: 'Show overall system resource consumption by all processes',
    instructions: `**How This Task Works:**
- Calculates total resource usage across all processes
- Shows CPU, memory, handle, and thread totals
- Compares against system capacity
- Provides utilization percentages

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- WMI service for system info

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Gets total physical memory
2. Sums memory usage across processes
3. Counts total handles and threads
4. Calculates utilization percentages
5. Shows top consumers by category

**Important Notes:**
- Process memory may exceed physical RAM
- Virtual memory extends physical RAM
- High utilization impacts performance
- Typical use: capacity assessment
- Monitor trends over time`,
    parameters: [],
    scriptTemplate: () => {
      return `# Calculate System Resource Usage
# Generated: ${new Date().toISOString()}

Write-Host "Calculating system resource usage..." -ForegroundColor Cyan

$ComputerInfo = Get-WmiObject Win32_ComputerSystem
$OSInfo = Get-WmiObject Win32_OperatingSystem
$Processes = Get-Process

$TotalPhysicalMemGB = [math]::Round($ComputerInfo.TotalPhysicalMemory / 1GB, 2)
$FreePhysicalMemGB = [math]::Round($OSInfo.FreePhysicalMemory / 1MB, 2)
$UsedPhysicalMemGB = $TotalPhysicalMemGB - $FreePhysicalMemGB
$MemoryUtilization = [math]::Round(($UsedPhysicalMemGB / $TotalPhysicalMemGB) * 100, 1)

$TotalProcessMemGB = [math]::Round(($Processes | Measure-Object -Property WorkingSet64 -Sum).Sum / 1GB, 2)
$TotalHandles = ($Processes | Measure-Object -Property HandleCount -Sum).Sum
$TotalThreads = ($Processes | Measure-Object -Property @{E={$_.Threads.Count}} -Sum).Sum
$ProcessCount = $Processes.Count

Write-Host ""
Write-Host "System Resources:" -ForegroundColor Yellow
Write-Host "  Physical Memory: $UsedPhysicalMemGB GB / $TotalPhysicalMemGB GB ($MemoryUtilization%)" -ForegroundColor $(if ($MemoryUtilization -gt 80) { 'Red' } elseif ($MemoryUtilization -gt 60) { 'Yellow' } else { 'Green' })
Write-Host "  CPU Cores: $($ComputerInfo.NumberOfLogicalProcessors)" -ForegroundColor Gray

Write-Host ""
Write-Host "Process Totals:" -ForegroundColor Yellow
Write-Host "  Process Count: $ProcessCount" -ForegroundColor Gray
Write-Host "  Total Process Memory: $TotalProcessMemGB GB" -ForegroundColor Gray
Write-Host "  Total Handles: $($TotalHandles.ToString('N0'))" -ForegroundColor Gray
Write-Host "  Total Threads: $($TotalThreads.ToString('N0'))" -ForegroundColor Gray

Write-Host ""
Write-Host "Top 5 Memory Consumers:" -ForegroundColor Yellow
$Processes | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $($_.Name): $([math]::Round($_.WorkingSet64/1MB, 0)) MB" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Top 5 Handle Consumers:" -ForegroundColor Yellow
$Processes | Sort-Object HandleCount -Descending | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $($_.Name): $($_.HandleCount) handles" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'stop-process-graceful',
    name: 'Stop Process with Graceful Shutdown',
    category: 'Process Control',
    description: 'Attempt graceful shutdown before force killing',
    instructions: `**How This Task Works:**
- Sends close message to process windows
- Waits for graceful exit
- Falls back to force kill if needed
- Allows process to save state

**Prerequisites:**
- PowerShell 5.1 or later
- Process must be running

**What You Need to Provide:**
- Process name or PID
- Grace period before force kill (seconds)
- Test mode option

**What the Script Does:**
1. Finds target process
2. Sends WM_CLOSE to main window
3. Waits for process to exit gracefully
4. Force kills if grace period expires
5. Confirms process termination

**Important Notes:**
- Graceful shutdown allows saving
- Not all processes have windows
- Grace period can be extended
- Typical use: polite app shutdown
- Better than immediate force kill`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'gracePeriodSeconds', label: 'Grace Period (seconds)', type: 'number', required: false, defaultValue: 10 },
      { id: 'testMode', label: 'Test Mode (Preview)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const gracePeriodSeconds = Number(params.gracePeriodSeconds || 10);
      const testMode = toPowerShellBoolean(params.testMode ?? true);
      
      return `# Stop Process with Graceful Shutdown
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$GracePeriodSeconds = ${gracePeriodSeconds}
$TestMode = ${testMode}

if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $Process) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Target: $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Cyan

if ($TestMode) {
    Write-Host ""
    Write-Host "[WARNING] TEST MODE - Would attempt graceful shutdown with ${gracePeriodSeconds}s grace period" -ForegroundColor Yellow
    exit 0
}

# Try graceful close
Write-Host "Requesting graceful shutdown..." -ForegroundColor Yellow
$Process.CloseMainWindow() | Out-Null

# Wait for exit
$Exited = $Process.WaitForExit($GracePeriodSeconds * 1000)

if ($Exited) {
    Write-Host "[SUCCESS] Process exited gracefully" -ForegroundColor Green
} else {
    Write-Host "Grace period expired, force killing..." -ForegroundColor Yellow
    Stop-Process -Id $Process.Id -Force
    Write-Host "[SUCCESS] Process force killed" -ForegroundColor Green
}

# Verify
Start-Sleep -Seconds 1
$Check = Get-Process -Id $Process.Id -ErrorAction SilentlyContinue
if (-not $Check) {
    Write-Host "[SUCCESS] Process terminated successfully" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Process may still be running" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'get-process-modules-analysis',
    name: 'Analyze Loaded Modules',
    category: 'Security',
    description: 'Detailed analysis of DLLs loaded by a process',
    instructions: `**How This Task Works:**
- Lists all DLLs loaded by a process
- Checks digital signatures of modules
- Identifies suspicious or unsigned modules
- Useful for malware analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended
- Process must be accessible

**What You Need to Provide:**
- Process name or PID to analyze

**What the Script Does:**
1. Enumerates all loaded modules
2. Checks each module's digital signature
3. Identifies modules from unusual paths
4. Reports unsigned or suspicious modules
5. Shows module file versions

**Important Notes:**
- Unsigned modules may be legitimate
- Focus on unexpected modules
- Some modules hide from enumeration
- Typical use: security investigation
- Cross-reference with known DLLs`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'checkSignatures', label: 'Check Digital Signatures', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const checkSignatures = toPowerShellBoolean(params.checkSignatures ?? true);
      
      return `# Analyze Loaded Modules
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$CheckSignatures = ${checkSignatures}

if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $Process) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Module Analysis for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Cyan
Write-Host ""

try {
    $Modules = $Process.Modules
    $Suspicious = @()
    
    Write-Host "Loaded Modules ($($Modules.Count)):" -ForegroundColor Yellow
    
    foreach ($Module in $Modules) {
        $Status = "OK"
        $Color = "Gray"
        
        if ($CheckSignatures -and $Module.FileName) {
            $Sig = Get-AuthenticodeSignature -FilePath $Module.FileName -ErrorAction SilentlyContinue
            if ($Sig.Status -ne 'Valid') {
                $Status = "UNSIGNED"
                $Color = "Yellow"
                $Suspicious += $Module
            }
        }
        
        # Check for suspicious paths
        $SuspiciousPaths = @("$env:TEMP", "$env:TMP", "$env:APPDATA")
        foreach ($Path in $SuspiciousPaths) {
            if ($Module.FileName -like "$Path*") {
                $Status = "SUSPICIOUS PATH"
                $Color = "Red"
                if ($Module -notin $Suspicious) { $Suspicious += $Module }
            }
        }
        
        Write-Host "  [$Status] $($Module.ModuleName)" -ForegroundColor $Color
        if ($Color -ne "Gray") {
            Write-Host "    Path: $($Module.FileName)" -ForegroundColor DarkGray
        }
    }
    
    if ($Suspicious.Count -gt 0) {
        Write-Host ""
        Write-Host "[WARNING] Suspicious Modules ($($Suspicious.Count)):" -ForegroundColor Yellow
        $Suspicious | ForEach-Object {
            Write-Host "  $($_.ModuleName): $($_.FileName)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "[FAILED] Unable to enumerate modules: $_" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'set-process-max-memory',
    name: 'Limit Process Memory (Job Object)',
    category: 'Process Control',
    description: 'Set maximum memory limit for a process using Job Objects',
    instructions: `**How This Task Works:**
- Creates Windows Job Object with memory limit
- Assigns process to job with constraints
- Limits maximum memory consumption
- Useful for runaway process control

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Process must be running

**What You Need to Provide:**
- Process name or PID
- Maximum memory limit in MB

**What the Script Does:**
1. Creates job object with memory limit
2. Assigns target process to job
3. Sets maximum working set
4. Monitors for limit enforcement
5. Reports current vs limit

**Important Notes:**
- Process may crash if limit too low
- Limit enforced by Windows kernel
- Some processes resist job assignment
- Typical use: contain memory leaks
- Test with higher limits first`,
    parameters: [
      { id: 'processName', label: 'Process Name or PID', type: 'text', required: true, placeholder: 'notepad' },
      { id: 'maxMemoryMB', label: 'Maximum Memory (MB)', type: 'number', required: true, placeholder: '512' }
    ],
    scriptTemplate: (params) => {
      const processName = escapePowerShellString(params.processName);
      const maxMemoryMB = Number(params.maxMemoryMB);
      
      return `# Limit Process Memory
# Generated: ${new Date().toISOString()}

$ProcessName = "${processName}"
$MaxMemoryMB = ${maxMemoryMB}
$MaxMemoryBytes = $MaxMemoryMB * 1MB

if ($ProcessName -match '^\\d+$') {
    $Process = Get-Process -Id $ProcessName -ErrorAction SilentlyContinue
} else {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $Process) {
    Write-Host "[FAILED] Process not found: $ProcessName" -ForegroundColor Red
    exit 1
}

Write-Host "Setting memory limit for $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Cyan
Write-Host "Current memory: $([math]::Round($Process.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
Write-Host "Limit: $MaxMemoryMB MB" -ForegroundColor Gray

try {
    # Set working set limits
    $MinWorkingSet = 1MB
    $MaxWorkingSet = $MaxMemoryBytes
    
    $Process.MinWorkingSet = $MinWorkingSet
    $Process.MaxWorkingSet = $MaxWorkingSet
    
    Write-Host ""
    Write-Host "[SUCCESS] Working set limits applied" -ForegroundColor Green
    Write-Host "  Min: $([math]::Round($MinWorkingSet/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Max: $MaxMemoryMB MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Note: For strict limits, use Windows Job Objects with additional scripting" -ForegroundColor Yellow
} catch {
    Write-Host "[FAILED] Failed to set memory limit: $_" -ForegroundColor Red
    Write-Host "Administrator privileges may be required" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'find-orphaned-processes',
    name: 'Find Orphaned Processes',
    category: 'Process Inventory',
    description: 'Identify processes whose parent has terminated',
    instructions: `**How This Task Works:**
- Identifies processes with dead parent processes
- Orphans are re-parented to System or Explorer
- May indicate improper process management
- Useful for cleanup and troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- WMI service must be running

**What You Need to Provide:**
- No parameters required

**What the Script Does:**
1. Gets all processes with parent info
2. Checks if parent process exists
3. Identifies orphaned processes
4. Shows original parent PID
5. Reports potential issues

**Important Notes:**
- Some orphans are normal
- Services typically orphan on purpose
- Frequent orphans may indicate crashes
- Typical use: process lifecycle debugging
- Clean up unnecessary orphans`,
    parameters: [],
    scriptTemplate: () => {
      return `# Find Orphaned Processes
# Generated: ${new Date().toISOString()}

Write-Host "Finding orphaned processes..." -ForegroundColor Cyan

$AllProcesses = Get-WmiObject Win32_Process
$ProcessIds = $AllProcesses | Select-Object -ExpandProperty ProcessId

$Orphans = @()

foreach ($Proc in $AllProcesses) {
    if ($Proc.ParentProcessId -and $Proc.ParentProcessId -notin $ProcessIds) {
        # Parent doesn't exist - orphaned
        $Orphans += [PSCustomObject]@{
            Name = $Proc.Name
            PID = $Proc.ProcessId
            OrphanedParentPID = $Proc.ParentProcessId
            Path = $Proc.ExecutablePath
            CommandLine = $Proc.CommandLine
        }
    }
}

Write-Host ""
if ($Orphans.Count -gt 0) {
    Write-Host "Found $($Orphans.Count) orphaned process(es):" -ForegroundColor Yellow
    $Orphans | Format-Table Name, PID, OrphanedParentPID, Path -Wrap -AutoSize
    
    Write-Host ""
    Write-Host "Note: Some orphaned processes are normal (services, background tasks)" -ForegroundColor Gray
} else {
    Write-Host "[SUCCESS] No orphaned processes found" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'export-process-timeline',
    name: 'Export Process Start Timeline',
    category: 'Reporting',
    description: 'Create timeline of when processes started',
    instructions: `**How This Task Works:**
- Creates chronological timeline of process starts
- Shows sequence of process launches
- Useful for boot analysis and troubleshooting
- Can filter by time range

**Prerequisites:**
- PowerShell 5.1 or later
- Process start times must be available

**What You Need to Provide:**
- Optional: Start time filter (hours ago)
- Optional: Export path for CSV

**What the Script Does:**
1. Gets all processes with start times
2. Sorts chronologically
3. Calculates time since start
4. Filters by time range if specified
5. Exports timeline to CSV

**Important Notes:**
- System processes may hide start time
- Shows most recent starts first or last
- Useful for boot sequence analysis
- Typical use: troubleshoot startup issues
- Correlate with event logs`,
    parameters: [
      { id: 'hoursAgo', label: 'Filter to Last N Hours (0 for all)', type: 'number', required: false, defaultValue: 0 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false },
      { id: 'sortOrder', label: 'Sort Order', type: 'select', required: false, options: ['NewestFirst', 'OldestFirst'], defaultValue: 'NewestFirst' }
    ],
    scriptTemplate: (params) => {
      const hoursAgo = Number(params.hoursAgo || 0);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      const sortOrder = params.sortOrder || 'NewestFirst';
      
      return `# Export Process Start Timeline
# Generated: ${new Date().toISOString()}

$HoursAgo = ${hoursAgo}
$Now = Get-Date

$Processes = Get-Process | Where-Object { $_.StartTime } | ForEach-Object {
    [PSCustomObject]@{
        StartTime = $_.StartTime
        Name = $_.Name
        PID = $_.Id
        Path = $_.Path
        CommandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        RunningFor = "{0:N1} hours" -f ($Now - $_.StartTime).TotalHours
    }
}

if ($HoursAgo -gt 0) {
    $CutoffTime = $Now.AddHours(-$HoursAgo)
    $Processes = $Processes | Where-Object { $_.StartTime -ge $CutoffTime }
}

$Sorted = $Processes | Sort-Object StartTime -Descending:$(${sortOrder === 'NewestFirst' ? '$true' : '$false'})

Write-Host "Process Start Timeline:" -ForegroundColor Cyan
if ($HoursAgo -gt 0) {
    Write-Host "Filtered to last $HoursAgo hour(s)" -ForegroundColor Gray
}
Write-Host ""

$Sorted | Format-Table StartTime, Name, PID, RunningFor -AutoSize

Write-Host ""
Write-Host "Total: $($Sorted.Count) processes" -ForegroundColor Gray

${exportPath ? `$Sorted | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-process-owner',
    name: 'Get Process Owner Information',
    category: 'Process Inventory',
    description: 'Show which user account owns each process',
    instructions: `**How This Task Works:**
- Identifies owner account for each process
- Shows domain and username
- Groups processes by owner
- Useful for multi-user systems

**Prerequisites:**
- PowerShell 5.1 or later
- WMI service must be running
- May need admin for all processes

**What You Need to Provide:**
- Optional: Filter by username
- Optional: Export path

**What the Script Does:**
1. Queries process owner via WMI
2. Groups by owner account
3. Shows process count per owner
4. Lists processes per owner
5. Exports details if requested

**Important Notes:**
- SYSTEM owns many processes
- Services run under service accounts
- User processes under logged-in user
- Typical use: security audit, user tracking
- Identify unexpected user processes`,
    parameters: [
      { id: 'usernameFilter', label: 'Username Filter (blank for all)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const usernameFilter = params.usernameFilter ? escapePowerShellString(params.usernameFilter) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Process Owner Information
# Generated: ${new Date().toISOString()}

${usernameFilter ? `$UsernameFilter = "${usernameFilter}"` : '$UsernameFilter = $null'}

Write-Host "Getting process owner information..." -ForegroundColor Cyan

$ProcessOwners = Get-WmiObject Win32_Process | ForEach-Object {
    $Owner = $_.GetOwner()
    $OwnerName = if ($Owner.Domain) { "$($Owner.Domain)\\$($Owner.User)" } else { $Owner.User }
    
    [PSCustomObject]@{
        Name = $_.Name
        PID = $_.ProcessId
        Owner = $OwnerName
        Path = $_.ExecutablePath
    }
}

if ($UsernameFilter) {
    $ProcessOwners = $ProcessOwners | Where-Object { $_.Owner -like "*$UsernameFilter*" }
}

# Group by owner
$Grouped = $ProcessOwners | Group-Object Owner | Sort-Object Count -Descending

Write-Host ""
Write-Host "Processes by Owner:" -ForegroundColor Yellow

foreach ($Group in $Grouped) {
    Write-Host ""
    Write-Host "$($Group.Name) ($($Group.Count) processes):" -ForegroundColor Cyan
    $Group.Group | Select-Object Name, PID | Format-Table -AutoSize
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Gray
$Grouped | Select-Object Name, Count | Format-Table -AutoSize

${exportPath ? `$ProcessOwners | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "[SUCCESS] Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'monitor-new-processes',
    name: 'Monitor for New Process Creation',
    category: 'Automation',
    description: 'Watch for and log new processes being created',
    instructions: `**How This Task Works:**
- Monitors for newly created processes
- Logs process start events in real-time
- Captures process details at creation
- Useful for security monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Runs until duration expires

**What You Need to Provide:**
- Monitor duration in minutes
- Optional: Process name filter
- Optional: Log file path

**What the Script Does:**
1. Takes baseline of current processes
2. Polls for new processes at interval
3. Logs newly detected processes
4. Shows process details on detection
5. Saves to log file if specified

**Important Notes:**
- Short-lived processes may be missed
- Shorter poll interval = better detection
- High CPU use with very short intervals
- Typical use: security monitoring, debugging
- Combine with Event Log for complete picture`,
    parameters: [
      { id: 'durationMinutes', label: 'Monitor Duration (minutes)', type: 'number', required: false, defaultValue: 5 },
      { id: 'processFilter', label: 'Process Name Filter (blank for all)', type: 'text', required: false },
      { id: 'pollIntervalSeconds', label: 'Poll Interval (seconds)', type: 'number', required: false, defaultValue: 2 },
      { id: 'logPath', label: 'Log File Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const durationMinutes = Number(params.durationMinutes || 5);
      const processFilter = params.processFilter ? escapePowerShellString(params.processFilter) : '';
      const pollIntervalSeconds = Number(params.pollIntervalSeconds || 2);
      const logPath = params.logPath ? escapePowerShellString(params.logPath) : '';
      
      return `# Monitor for New Process Creation
# Generated: ${new Date().toISOString()}

$DurationMinutes = ${durationMinutes}
$PollIntervalSeconds = ${pollIntervalSeconds}
${processFilter ? `$ProcessFilter = "${processFilter}"` : '$ProcessFilter = $null'}
${logPath ? `$LogPath = "${logPath}"` : '$LogPath = $null'}

$EndTime = (Get-Date).AddMinutes($DurationMinutes)
$SeenPIDs = @{}

# Baseline current processes
Get-Process | ForEach-Object { $SeenPIDs[$_.Id] = $true }

Write-Host "Monitoring for new processes for $DurationMinutes minutes..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

function Log-NewProcess {
    param($Process)
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "[$Timestamp] NEW: $($Process.Name) (PID: $($Process.Id)) - $($Process.Path)"
    
    Write-Host $Message -ForegroundColor Green
    
    if ($LogPath) {
        $Message | Out-File -FilePath $LogPath -Append
    }
}

while ((Get-Date) -lt $EndTime) {
    $CurrentProcesses = Get-Process
    
    foreach ($Proc in $CurrentProcesses) {
        if (-not $SeenPIDs.ContainsKey($Proc.Id)) {
            $SeenPIDs[$Proc.Id] = $true
            
            if ($ProcessFilter) {
                if ($Proc.Name -like "*$ProcessFilter*") {
                    Log-NewProcess -Process $Proc
                }
            } else {
                Log-NewProcess -Process $Proc
            }
        }
    }
    
    Start-Sleep -Seconds $PollIntervalSeconds
}

Write-Host ""
Write-Host "Monitoring complete" -ForegroundColor Gray
if ($LogPath) {
    Write-Host "Log saved to: $LogPath" -ForegroundColor Gray
}`;
    }
  },

  {
    id: 'get-process-gdi-objects',
    name: 'Monitor GDI/USER Object Count',
    category: 'Performance Monitoring',
    description: 'Report GDI and USER object counts per process to detect handle leaks',
    instructions: `**How This Task Works:**
- Reports GDI and USER object counts for processes
- Identifies processes with excessive object usage
- Detects potential GDI handle leaks
- Windows limits GDI objects to 10,000 per process

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- WMI service must be running

**What You Need to Provide:**
- GDI object threshold to flag (default: 1000)
- Number of top consumers to display (default: 15)

**What the Script Does:**
1. Queries GDI object count per process
2. Queries USER object count per process
3. Filters processes above threshold
4. Sorts by object count
5. Warns about approaching limits

**Important Notes:**
- Windows limit is 10,000 GDI objects per process
- High counts indicate potential leaks
- Graphics-heavy apps use more GDI objects
- Typical use: diagnose GDI resource exhaustion
- GDI leaks cause "Out of memory" errors`,
    parameters: [
      { id: 'threshold', label: 'GDI Object Threshold', type: 'number', required: false, defaultValue: 1000 },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 15 }
    ],
    scriptTemplate: (params) => {
      const threshold = Number(params.threshold || 1000);
      const topCount = Number(params.topCount || 15);
      
      return `# Monitor GDI/USER Object Count
# Generated: ${new Date().toISOString()}

$Threshold = ${threshold}
$TopCount = ${topCount}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class GDI {
    [DllImport("User32.dll")]
    public static extern int GetGuiResources(IntPtr hProcess, int uiFlags);
}
"@

Write-Host "Checking GDI/USER object counts..." -ForegroundColor Cyan

$Results = Get-Process | Where-Object { $_.Handle } | ForEach-Object {
    try {
        $GDI = [GDI]::GetGuiResources($_.Handle, 0)
        $USER = [GDI]::GetGuiResources($_.Handle, 1)
        
        if ($GDI -ge $Threshold -or $USER -ge $Threshold) {
            [PSCustomObject]@{
                Name = $_.Name
                PID = $_.Id
                GDIObjects = $GDI
                USERObjects = $USER
                TotalObjects = $GDI + $USER
            }
        }
    } catch {}
} | Sort-Object TotalObjects -Descending | Select-Object -First $TopCount

if ($Results) {
    Write-Host ""
    Write-Host "Processes with high GDI/USER object counts (threshold: ${threshold}):" -ForegroundColor Yellow
    $Results | Format-Table -AutoSize
    
    $HighRisk = $Results | Where-Object { $_.GDIObjects -gt 5000 -or $_.USERObjects -gt 5000 }
    if ($HighRisk) {
        Write-Host ""
        Write-Host "Warning: Processes approaching GDI limit (10,000):" -ForegroundColor Red
        $HighRisk | ForEach-Object { Write-Host "  $($_.Name) - $($_.GDIObjects) GDI objects" -ForegroundColor Red }
    }
} else {
    Write-Host "No processes above ${threshold} GDI/USER objects" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'get-process-user-time',
    name: 'Get Process User vs Kernel Time',
    category: 'Performance Analysis',
    description: 'Analyze CPU time split between user and kernel mode',
    instructions: `**How This Task Works:**
- Reports user-mode and kernel-mode CPU time
- Helps identify I/O-bound vs CPU-bound processes
- Kernel time indicates system calls and I/O
- Useful for performance optimization

**Prerequisites:**
- PowerShell 5.1 or later
- No administrator privileges required
- Processes must be running

**What You Need to Provide:**
- Minimum total CPU time to display (seconds, default: 10)
- Number of top consumers (default: 20)

**What the Script Does:**
1. Gets user and kernel CPU time per process
2. Calculates kernel time percentage
3. Filters by minimum CPU threshold
4. Sorts by total CPU time
5. Shows time breakdown

**Important Notes:**
- High kernel time indicates I/O operations
- High user time indicates computation
- Balance varies by application type
- Database apps have more kernel time
- Typical use: optimize CPU usage patterns`,
    parameters: [
      { id: 'minCpuSeconds', label: 'Minimum CPU Time (seconds)', type: 'number', required: false, defaultValue: 10 },
      { id: 'topCount', label: 'Top N Processes', type: 'number', required: false, defaultValue: 20 }
    ],
    scriptTemplate: (params) => {
      const minCpuSeconds = Number(params.minCpuSeconds || 10);
      const topCount = Number(params.topCount || 20);
      
      return `# Get Process User vs Kernel Time
# Generated: ${new Date().toISOString()}

$MinCpuSeconds = ${minCpuSeconds}
$TopCount = ${topCount}

Write-Host "Analyzing process CPU time breakdown..." -ForegroundColor Cyan

$Results = Get-Process | Where-Object { $_.TotalProcessorTime.TotalSeconds -ge $MinCpuSeconds } | ForEach-Object {
    $UserTime = $_.UserProcessorTime.TotalSeconds
    $KernelTime = $_.PrivilegedProcessorTime.TotalSeconds
    $TotalTime = $_.TotalProcessorTime.TotalSeconds
    $KernelPercent = if ($TotalTime -gt 0) { [math]::Round(($KernelTime / $TotalTime) * 100, 1) } else { 0 }
    
    [PSCustomObject]@{
        Name = $_.Name
        PID = $_.Id
        'UserTime(s)' = [math]::Round($UserTime, 2)
        'KernelTime(s)' = [math]::Round($KernelTime, 2)
        'TotalTime(s)' = [math]::Round($TotalTime, 2)
        'Kernel%' = $KernelPercent
    }
} | Sort-Object 'TotalTime(s)' -Descending | Select-Object -First $TopCount

if ($Results) {
    Write-Host ""
    Write-Host "CPU Time Breakdown (min ${minCpuSeconds}s):" -ForegroundColor Yellow
    $Results | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Interpretation:" -ForegroundColor Gray
    Write-Host "  High Kernel% (>50%) = I/O intensive, system calls" -ForegroundColor Gray
    Write-Host "  Low Kernel% (<20%) = CPU computation intensive" -ForegroundColor Gray
} else {
    Write-Host "No processes with more than ${minCpuSeconds}s CPU time" -ForegroundColor Gray
}`;
    }
  },
];
