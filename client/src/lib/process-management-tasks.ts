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
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
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
    Write-Host "⚠ High handle counts may indicate resource leaks" -ForegroundColor Yellow
} else {
    Write-Host "✓ No processes above threshold (${threshold} handles)" -ForegroundColor Green
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
    
    Write-Host "✓ Process started successfully" -ForegroundColor Green
    Write-Host "  Process ID: $($Process.Id)" -ForegroundColor Gray
    Write-Host "  Process Name: $($Process.ProcessName)" -ForegroundColor Gray
    
    ${waitForExit === '$true' ? `
    Write-Host "Waiting for process to exit..." -ForegroundColor Cyan
    $Process.WaitForExit()
    Write-Host "✓ Process exited with code: $($Process.ExitCode)" -ForegroundColor Green` : ''}
} catch {
    Write-Host "✗ Failed to start process: $_" -ForegroundColor Red
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
    Write-Host "✗ No process found with name: $ProcessName" -ForegroundColor Red
}`;
    }
  },
];
