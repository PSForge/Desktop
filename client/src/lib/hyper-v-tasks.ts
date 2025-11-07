import { escapePowerShellString } from './powershell-utils';

export interface HyperVParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  helpText?: string;
}

export interface HyperVTask {
  id: string;
  title: string;
  description: string;
  category: string;
  instructions?: string;
  parameters: HyperVParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
}

export const hyperVTasks: HyperVTask[] = [
  // ==================== Host Configuration ====================
  {
    id: 'hyperv-install-role',
    title: 'Install Hyper-V Role',
    description: 'Install and configure the Hyper-V role on a Windows Server',
    category: 'Host Configuration',
    instructions: `**How This Task Works:**
- Installs the Hyper-V role and management tools on Windows Server
- Enables virtualization capabilities for hosting virtual machines
- Configures server for VM hosting and management

**Prerequisites:**
- Windows Server 2016 or later
- Server hardware with virtualization support (Intel VT-x or AMD-V)
- Administrator credentials on target server
- BIOS/UEFI virtualization enabled

**What You Need to Provide:**
- Target server name
- Whether to include management tools (checkbox)

**What the Script Does:**
1. Connects to target server
2. Installs Hyper-V role using Install-WindowsFeature
3. Optionally installs Hyper-V PowerShell module and management tools
4. Reports installation success
5. Displays installation result with restart requirement status

**Important Notes:**
- Essential first step for building Hyper-V infrastructure
- Server restart required after installation
- Management tools enable remote Hyper-V management
- Verify CPU virtualization support before installing
- Installation typically takes 5-10 minutes
- Use for building virtualization hosts
- Coordinate server restart window with users
- Test with one server before bulk deployment`,
    parameters: [
      {
        name: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'HV-HOST01',
        helpText: 'Name of the server to configure'
      },
      {
        name: 'includeManagementTools',
        label: 'Include Management Tools',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Install Hyper-V PowerShell and management tools'
      }
    ],
    scriptTemplate: (params) => {
      const serverName = escapePowerShellString(params.serverName);
      const includeMgmtTools = params.includeManagementTools !== false;

      return `# Install Hyper-V Role
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Installing Hyper-V role on: ${serverName}" -ForegroundColor Cyan
    
    $Features = @("Hyper-V")
    ${includeMgmtTools ? '$Features += "Hyper-V-PowerShell", "Hyper-V-Tools"' : ''}
    
    $Result = Install-WindowsFeature -Name $Features -ComputerName "${serverName}" -IncludeManagementTools
    
    if ($Result.Success) {
        Write-Host "✓ Hyper-V role installed successfully" -ForegroundColor Green
    }
    
    $Result | Select-Object Success, RestartNeeded, ExitCode | Format-List
    
} catch {
    Write-Error "Failed to install Hyper-V role: $_"
}`;
    }
  },

  {
    id: 'hyperv-create-vswitch',
    title: 'Create Virtual Switch',
    description: 'Create a Hyper-V virtual switch (External/Internal/Private)',
    category: 'Host Configuration',
    instructions: `**How This Task Works:**
- Creates Hyper-V virtual switches for VM network connectivity
- Supports three types: External (internet access), Internal (host-VM), or Private (VM-to-VM only)
- Enables network configuration for virtual machines

**Prerequisites:**
- Hyper-V role installed on server
- Administrator credentials
- For External switch: physical network adapter available

**What You Need to Provide:**
- Virtual switch name
- Switch type (External/Internal/Private)
- Network adapter name (required for External switch)

**What the Script Does:**
1. Validates network adapter exists (for External switch)
2. Creates virtual switch with specified type
3. For External: binds to physical adapter with management OS access
4. Reports creation success
5. Displays virtual switch configuration

**Important Notes:**
- Essential for VM network connectivity
- External: VMs access physical network/internet
- Internal: host and VMs communicate, no external access
- Private: VMs communicate only with each other
- External switch briefly interrupts host network during creation
- Use consistent naming: vSwitch-External, vSwitch-Internal
- Coordinate External switch creation during maintenance window
- One External switch typically sufficient per host`,
    parameters: [
      {
        name: 'switchName',
        label: 'Switch Name',
        type: 'text',
        required: true,
        placeholder: 'vSwitch-External',
        helpText: 'Name for the virtual switch'
      },
      {
        name: 'switchType',
        label: 'Switch Type',
        type: 'select',
        required: true,
        options: [
          { value: 'External', label: 'External (Connects to physical network)' },
          { value: 'Internal', label: 'Internal (Host and VMs only)' },
          { value: 'Private', label: 'Private (VMs only)' }
        ],
        helpText: 'Type of virtual switch'
      },
      {
        name: 'netAdapterName',
        label: 'Network Adapter Name (for External)',
        type: 'text',
        required: false,
        placeholder: 'Ethernet',
        helpText: 'Required for External switch type'
      }
    ],
    scriptTemplate: (params) => {
      const switchName = escapePowerShellString(params.switchName);
      const switchType = params.switchType;
      const adapterName = params.netAdapterName ? escapePowerShellString(params.netAdapterName) : '';

      return `# Create Hyper-V Virtual Switch
# Generated by PSForge

try {
    Write-Host "Creating ${switchType} virtual switch: ${switchName}" -ForegroundColor Cyan
    
    ${switchType === 'External' ? `
    if (-not "${adapterName}") {
        throw "Network adapter name is required for External switch"
    }
    $NetAdapter = Get-NetAdapter -Name "${adapterName}" -ErrorAction Stop
    New-VMSwitch -Name "${switchName}" -NetAdapterName $NetAdapter.Name -AllowManagementOS $true
    ` : switchType === 'Internal' ? `
    New-VMSwitch -Name "${switchName}" -SwitchType Internal
    ` : `
    New-VMSwitch -Name "${switchName}" -SwitchType Private
    `}
    
    Write-Host "✓ Virtual switch created successfully" -ForegroundColor Green
    
    Get-VMSwitch -Name "${switchName}" | Select-Object Name, SwitchType, Id | Format-List
    
} catch {
    Write-Error "Failed to create virtual switch: $_"
}`;
    }
  },

  // ==================== VM Lifecycle ====================
  {
    id: 'hyperv-create-vm',
    title: 'Create Virtual Machine',
    description: 'Create a new Hyper-V virtual machine',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script creates new Hyper-V virtual machines with specified hardware configuration, generation, storage, and network settings.

**Prerequisites:**
- Hyper-V role installed
- Virtual switch created
- Sufficient host resources (CPU, RAM, storage)
- Administrator credentials

**What You Need to Provide:**
- VM name
- VM generation (1 for legacy BIOS, 2 for UEFI)
- Memory allocation in GB
- Virtual processor count
- Virtual hard disk size in GB
- Virtual switch name

**What the Script Does:**
- Retrieves Hyper-V host default paths
- Calculates memory and disk size in bytes
- Creates VM with specified generation and configuration
- Creates new VHDX file at specified size
- Assigns virtual processors
- Connects VM to virtual switch
- Displays VM configuration

**Important Notes:**
- Essential for provisioning new virtual workloads
- Generation 2: modern UEFI, secure boot, better performance
- Generation 1: legacy BIOS, broader OS compatibility
- Cannot change generation after creation
- Use Generation 2 for Windows Server 2012 R2+, Windows 8.1+
- Use Generation 1 for older operating systems
- Plan memory and CPU based on workload requirements
- Typical web server: 4GB RAM, 2 vCPUs, 60GB disk`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Name for the virtual machine'
      },
      {
        name: 'generation',
        label: 'VM Generation',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'Generation 1 (Legacy BIOS)' },
          { value: '2', label: 'Generation 2 (UEFI)' }
        ],
        defaultValue: '2',
        helpText: 'VM generation'
      },
      {
        name: 'memoryGB',
        label: 'Memory (GB)',
        type: 'number',
        required: true,
        defaultValue: 4,
        helpText: 'Amount of memory in GB'
      },
      {
        name: 'processorCount',
        label: 'Processor Count',
        type: 'number',
        required: true,
        defaultValue: 2,
        helpText: 'Number of virtual processors'
      },
      {
        name: 'vhdSizeGB',
        label: 'VHD Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 60,
        helpText: 'Size of virtual hard disk in GB'
      },
      {
        name: 'switchName',
        label: 'Virtual Switch Name',
        type: 'text',
        required: true,
        placeholder: 'vSwitch-External',
        helpText: 'Virtual switch to connect to'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const generation = params.generation || '2';
      const memoryGB = params.memoryGB || 4;
      const cpuCount = params.processorCount || 2;
      const vhdSizeGB = params.vhdSizeGB || 60;
      const switchName = escapePowerShellString(params.switchName);

      return `# Create Hyper-V Virtual Machine
# Generated by PSForge

try {
    Write-Host "Creating Virtual Machine: ${vmName}" -ForegroundColor Cyan
    
    $HostSettings = Get-VMHost
    $VmPath = $HostSettings.VirtualMachinePath
    $VhdPath = $HostSettings.VirtualHardDiskPath
    
    $MemoryBytes = ${memoryGB}GB
    $VhdSizeBytes = ${vhdSizeGB}GB
    $VhdFilePath = Join-Path $VhdPath "${vmName}.vhdx"
    
    New-VM -Name "${vmName}" -Generation ${generation} -MemoryStartupBytes $MemoryBytes -Path $VmPath -NewVHDPath $VhdFilePath -NewVHDSizeBytes $VhdSizeBytes -SwitchName "${switchName}"
    
    Set-VMProcessor -VMName "${vmName}" -Count ${cpuCount}
    
    Write-Host "✓ Virtual Machine created successfully" -ForegroundColor Green
    
    Get-VM -Name "${vmName}" | Select-Object Name, Generation, State, ProcessorCount | Format-List
    
} catch {
    Write-Error "Failed to create VM: $_"
}`;
    }
  },

  {
    id: 'hyperv-start-stop-vm',
    title: 'Start/Stop VMs',
    description: 'Perform power operations on Hyper-V virtual machines',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script performs bulk power management operations on Hyper-V VMs for maintenance, testing, or operational scheduling.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VMs exist on Hyper-V host

**What You Need to Provide:**
- Power action (Start, Stop, or Restart)
- VM names (one per line)

**What the Script Does:**
- Parses VM names from input
- For each VM: performs specified power operation
- Reports success/failure for each VM
- Provides operation summary

**Important Notes:**
- Essential for VM lifecycle management
- Stop uses -Force flag for immediate shutdown
- Restart uses -Force flag (no graceful shutdown)
- Use for maintenance windows and testing
- Coordinate with application owners before stopping production VMs
- Consider graceful shutdown for production workloads
- Bulk operations save time vs manual management
- Use for scheduled VM power management`,
    parameters: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Start', label: 'Start VMs' },
          { value: 'Stop', label: 'Stop VMs' },
          { value: 'Restart', label: 'Restart VMs' }
        ],
        helpText: 'Power operation to perform'
      },
      {
        name: 'vmNames',
        label: 'VM Names (one per line)',
        type: 'textarea',
        required: true,
        placeholder: 'VM-WEB01\nVM-DB01',
        helpText: 'List of VM names'
      }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const vmNamesInput = params.vmNames.trim();

      return `# ${action} Hyper-V Virtual Machines
# Generated by PSForge

try {
    $VmNames = @(
${vmNamesInput.split('\n').filter((line: string) => line.trim()).map((name: string) => `        "${escapePowerShellString(name.trim())}"`).join('\n')}
    )
    
    Write-Host "Target VMs: $($VmNames.Count)" -ForegroundColor Cyan
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($VmName in $VmNames) {
        try {
            Write-Host "${action}ing: $VmName..." -ForegroundColor Cyan
            
            ${action === 'Start' ? 'Start-VM -Name $VmName' : ''}
            ${action === 'Stop' ? 'Stop-VM -Name $VmName -Force' : ''}
            ${action === 'Restart' ? 'Restart-VM -Name $VmName -Force' : ''}
            
            Write-Host "✓ $VmName ${action.toLowerCase()} completed" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Warning "✗ Failed: $VmName - $_"
            $FailCount++
        }
    }
    
    Write-Host \"\`n${action} Complete - Success: $SuccessCount, Failed: $FailCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  },

  {
    id: 'hyperv-export-vm',
    title: 'Export Virtual Machine',
    description: 'Export a Hyper-V VM for backup or migration',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script exports complete Hyper-V VMs with configuration, VHDs, and snapshots for backup, migration, or disaster recovery.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Sufficient storage space at export location
- VM can be running (exports running state)

**What You Need to Provide:**
- VM name to export
- Export destination path

**What the Script Does:**
- Creates export directory if it doesn't exist
- Exports VM configuration XML
- Exports all virtual hard disks
- Exports all checkpoints/snapshots
- Reports export success
- Displays export folder location

**Important Notes:**
- Essential for VM backup and migration
- Exported VM can be imported on any Hyper-V host
- Export includes entire VM state (config, VHDs, snapshots)
- Export space required: 100-150% of VM disk size
- Export can run while VM is running
- Use for disaster recovery, host migration, dev/test cloning
- Typical export time: 10-30 minutes depending on VM size
- Store exports on separate storage for true backup`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'VM to export'
      },
      {
        name: 'exportPath',
        label: 'Export Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\VMExports',
        helpText: 'Destination folder'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Hyper-V Virtual Machine
# Generated by PSForge

try {
    Write-Host "Exporting VM: ${vmName}" -ForegroundColor Cyan
    
    if (-not (Test-Path "${exportPath}")) {
        New-Item -Path "${exportPath}" -ItemType Directory -Force | Out-Null
    }
    
    Export-VM -Name "${vmName}" -Path "${exportPath}"
    
    Write-Host "✓ VM exported successfully" -ForegroundColor Green
    
    $ExportFolder = Join-Path "${exportPath}" "${vmName}"
    Write-Host "  Location: $ExportFolder" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to export VM: $_"
}`;
    }
  },

  // ==================== Storage ====================
  {
    id: 'hyperv-create-vhd',
    title: 'Create Virtual Hard Disk',
    description: 'Create a new VHDX file',
    category: 'Storage',
    instructions: `**How This Task Works:**
This script creates new VHDX virtual hard disk files for VM storage with Dynamic (thin-provisioned) or Fixed (pre-allocated) types.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Sufficient host storage space

**What You Need to Provide:**
- Full path for new VHDX file
- Disk size in GB
- Disk type (Dynamic or Fixed)

**What the Script Does:**
- Creates directory path if needed
- Creates VHDX file with specified size and type
- Reports creation success
- Displays VHDX configuration

**Important Notes:**
- Essential for adding storage to VMs
- Dynamic: grows to max size as needed (recommended)
- Fixed: pre-allocates full size (better performance)
- VHDX format supports up to 64TB
- Dynamic saves initial storage space
- Fixed provides consistent performance
- Use Dynamic for dev/test, Fixed for production databases
- Attach to VM after creation using Add-VMHardDiskDrive`,
    parameters: [
      {
        name: 'vhdPath',
        label: 'VHD Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\Disks\\Data01.vhdx',
        helpText: 'Full path for the new VHDX'
      },
      {
        name: 'sizeGB',
        label: 'Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 60,
        helpText: 'Size in GB'
      },
      {
        name: 'diskType',
        label: 'Disk Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Dynamic', label: 'Dynamic' },
          { value: 'Fixed', label: 'Fixed' }
        ],
        defaultValue: 'Dynamic',
        helpText: 'Disk allocation type'
      }
    ],
    scriptTemplate: (params) => {
      const vhdPath = escapePowerShellString(params.vhdPath);
      const sizeGB = params.sizeGB || 60;
      const diskType = params.diskType || 'Dynamic';

      return `# Create Virtual Hard Disk
# Generated by PSForge

try {
    Write-Host "Creating ${diskType} VHDX: ${vhdPath}" -ForegroundColor Cyan
    
    $SizeBytes = ${sizeGB}GB
    
    New-VHD -Path "${vhdPath}" -SizeBytes $SizeBytes -${diskType}
    
    Write-Host "✓ Virtual hard disk created successfully" -ForegroundColor Green
    
    Get-VHD -Path "${vhdPath}" | Select-Object Path, VhdType, Size | Format-List
    
} catch {
    Write-Error "Failed to create VHD: $_"
}`;
    }
  },

  {
    id: 'hyperv-resize-vhd',
    title: 'Resize Virtual Hard Disk',
    description: 'Expand a VHDX file',
    category: 'Storage',
    instructions: `**How This Task Works:**
This script expands existing VHDX virtual hard disks to increase VM storage capacity without downtime.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VHDX file exists
- VM can be running during resize

**What You Need to Provide:**
- Full path to VHDX file
- New size in GB (must be larger than current)

**What the Script Does:**
- Retrieves current VHDX configuration
- Validates new size is larger than current
- Resizes VHDX to specified size
- Reports resize success
- Displays updated VHDX details

**Important Notes:**
- Essential for expanding VM storage
- Cannot shrink VHD (only expand)
- Resize can occur while VM is running
- Must also extend partition inside guest OS after resize
- No downtime required for expansion
- Use when VM runs low on disk space
- Plan for 20-30% growth buffer
- Coordinate with guest OS administrator for partition extension`,
    parameters: [
      {
        name: 'vhdPath',
        label: 'VHD Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\Disks\\Data01.vhdx',
        helpText: 'Path to the VHDX file'
      },
      {
        name: 'newSizeGB',
        label: 'New Size (GB)',
        type: 'number',
        required: true,
        placeholder: '100',
        helpText: 'New size in GB'
      }
    ],
    scriptTemplate: (params) => {
      const vhdPath = escapePowerShellString(params.vhdPath);
      const newSizeGB = params.newSizeGB;

      return `# Resize Virtual Hard Disk
# Generated by PSForge

try {
    Write-Host "Resizing VHD: ${vhdPath}" -ForegroundColor Cyan
    
    $VHD = Get-VHD -Path "${vhdPath}"
    $CurrentSizeGB = [math]::Round($VHD.Size / 1GB, 2)
    
    Write-Host "Current Size: $CurrentSizeGB GB" -ForegroundColor Yellow
    Write-Host "New Size: ${newSizeGB} GB" -ForegroundColor Yellow
    
    $NewSizeBytes = ${newSizeGB}GB
    
    Resize-VHD -Path "${vhdPath}" -SizeBytes $NewSizeBytes
    
    Write-Host "✓ VHD resized successfully" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to resize VHD: $_"
}`;
    }
  },

  // ==================== Checkpoints ====================
  {
    id: 'hyperv-create-checkpoint',
    title: 'Create VM Checkpoint',
    description: 'Create a checkpoint (snapshot) of a virtual machine',
    category: 'Checkpoints',
    instructions: `**How This Task Works:**
This script creates point-in-time checkpoints (snapshots) of VMs for rollback capability before changes, updates, or testing.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists on host
- Sufficient storage space for checkpoint files

**What You Need to Provide:**
- VM name to checkpoint
- Optional checkpoint name (auto-generates timestamp if omitted)

**What the Script Does:**
- Creates checkpoint with specified or auto-generated name
- Captures complete VM state (memory, configuration, disk state)
- Reports checkpoint creation success
- Lists all checkpoints for the VM

**Important Notes:**
- Essential for safe change management and testing
- Checkpoint captures running VM state (memory + disk)
- Use before Windows Updates, application changes, configuration modifications
- Checkpoints consume storage space (similar to VM size)
- Production checkpoints recommended over standard checkpoints
- Remove old checkpoints to reclaim storage
- Typical use: before patches, before software installs, before testing
- Coordinate checkpoint retention policy with storage capacity`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'VM to checkpoint'
      },
      {
        name: 'checkpointName',
        label: 'Checkpoint Name',
        type: 'text',
        required: false,
        placeholder: 'Before Windows Update',
        helpText: 'Optional checkpoint name'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const checkpointName = params.checkpointName ? escapePowerShellString(params.checkpointName) : '';

      return `# Create VM Checkpoint
# Generated by PSForge

try {
    Write-Host "Creating checkpoint for VM: ${vmName}" -ForegroundColor Cyan
    
    ${checkpointName ? `
    $CheckpointName = "${checkpointName}"
    ` : `
    $CheckpointName = "Checkpoint-$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"
    `}
    
    Checkpoint-VM -Name "${vmName}" -SnapshotName $CheckpointName
    
    Write-Host "✓ Checkpoint created: $CheckpointName" -ForegroundColor Green
    
    Get-VMCheckpoint -VMName "${vmName}" | Select-Object Name, CreationTime | Format-Table
    
} catch {
    Write-Error "Failed to create checkpoint: $_"
}`;
    }
  },

  // ==================== Reporting ====================
  {
    id: 'hyperv-export-inventory',
    title: 'Export VM Inventory',
    description: 'Export inventory of all Hyper-V VMs to CSV',
    category: 'Reporting',
    instructions: `**How This Task Works:**
This script generates comprehensive CSV inventory reports of all Hyper-V VMs with configuration details for documentation and capacity planning.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Access to Hyper-V host

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Queries all VMs on Hyper-V host
- Collects VM configuration details (name, state, generation, CPU, memory, path)
- Exports detailed inventory to CSV
- Reports total VM count
- Displays VMs grouped by power state

**Important Notes:**
- Essential for documentation, auditing, and capacity planning
- Reports VM generation for upgrade planning
- Shows memory allocation for capacity management
- Tracks dynamic memory usage
- Use for monthly infrastructure reporting
- Combine with host resource reports for capacity planning
- Export regularly for change tracking
- Share with management for infrastructure visibility`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\HyperV-Inventory.csv',
        helpText: 'CSV file path'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Hyper-V VM Inventory
# Generated by PSForge

try {
    Write-Host "Collecting Hyper-V VM inventory..." -ForegroundColor Cyan
    
    $VMs = Get-VM
    Write-Host "Found $($VMs.Count) VMs" -ForegroundColor Yellow
    
    $Inventory = foreach ($VM in $VMs) {
        [PSCustomObject]@{
            Name              = $VM.Name
            State             = $VM.State
            Generation        = $VM.Generation
            ProcessorCount    = $VM.ProcessorCount
            MemoryGB          = [math]::Round($VM.MemoryStartup / 1GB, 2)
            DynamicMemory     = $VM.DynamicMemoryEnabled
            Path              = $VM.Path
        }
    }
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Inventory exported to: ${exportPath}" -ForegroundColor Green
    
    Write-Host \"\`nVMs by State:" -ForegroundColor Yellow
    $Inventory | Group-Object State | Format-Table Name, Count
    
} catch {
    Write-Error "Failed to export inventory: $_"
}`;
    }
  },

  // ==================== Additional VM Lifecycle ====================
  {
    id: 'hyperv-clone-vm',
    title: 'Clone Virtual Machine',
    description: 'Create an exact copy of an existing VM',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script creates exact copies of existing VMs for rapid provisioning, testing environments, or disaster recovery scenarios.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Source VM must be powered off
- Sufficient storage space for clone
- Destination path exists

**What You Need to Provide:**
- Source VM name to clone
- New VM name for clone
- Destination path for VM files

**What the Script Does:**
- Powers off source VM if running
- Exports source VM configuration and VHDs
- Imports VM as new copy with new GUID
- Renames imported VM to specified name
- Reports clone success

**Important Notes:**
- Essential for rapid VM provisioning and dev/test environments
- Creates complete independent copy (config + VHDs)
- Source VM shut down during clone operation
- Clone time depends on VM size (typically 10-30 minutes)
- Use for creating dev/test environments from production templates
- Remember to sysprep Windows VMs before cloning to avoid SID conflicts
- Change IP addresses/hostnames in cloned VMs
- Clone operation requires downtime on source VM`,
    parameters: [
      {
        name: 'sourceVmName',
        label: 'Source VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-Template',
        helpText: 'VM to clone'
      },
      {
        name: 'newVmName',
        label: 'New VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-Clone01',
        helpText: 'Name for the cloned VM'
      },
      {
        name: 'newVmPath',
        label: 'Destination Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\VMs',
        helpText: 'Path for the new VM files'
      }
    ],
    scriptTemplate: (params) => {
      const sourceVm = escapePowerShellString(params.sourceVmName);
      const newVm = escapePowerShellString(params.newVmName);
      const vmPath = escapePowerShellString(params.newVmPath);

      return `# Clone Hyper-V Virtual Machine
# Generated by PSForge

try {
    Write-Host "Cloning VM: ${sourceVm} to ${newVm}" -ForegroundColor Cyan
    
    $SourceVM = Get-VM -Name "${sourceVm}"
    
    if ($SourceVM.State -ne "Off") {
        Write-Warning "Source VM must be powered off. Shutting down..."
        Stop-VM -Name "${sourceVm}" -Force
        Start-Sleep -Seconds 5
    }
    
    Export-VM -Name "${sourceVm}" -Path "${vmPath}" -ErrorAction Stop
    
    $ExportPath = Join-Path "${vmPath}" "${sourceVm}"
    $VmConfigPath = Get-ChildItem -Path $ExportPath -Filter "*.vmcx" -Recurse | Select-Object -First 1
    
    Import-VM -Path $VmConfigPath.FullName -Copy -GenerateNewId -VhdDestinationPath "${vmPath}" -VirtualMachinePath "${vmPath}"
    
    Rename-VM -Name "${sourceVm}" -NewName "${newVm}"
    
    Write-Host "✓ VM cloned successfully: ${newVm}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to clone VM: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-vm-memory',
    title: 'Configure Dynamic Memory',
    description: 'Configure dynamic or static memory settings for a VM',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script configures VM memory settings with dynamic allocation (flexible) or static allocation (fixed) for performance optimization.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM must be stopped to change memory settings

**What You Need to Provide:**
- VM name
- Enable dynamic memory (checkbox)
- Startup memory in GB
- If dynamic: minimum and maximum memory in GB

**What the Script Does:**
- Stops VM if running
- Configures dynamic or static memory settings
- Sets startup, minimum, and maximum memory values
- Reports configuration success
- Displays updated memory configuration

**Important Notes:**
- Essential for memory optimization and host consolidation
- Dynamic memory allows flexible allocation based on demand
- Static memory provides consistent performance (recommended for databases)
- Dynamic memory enables higher VM density on hosts
- Use dynamic for general workloads, web servers, file servers
- Use static for SQL Server, Exchange, performance-critical apps
- Memory changes require VM restart
- Plan minimum memory to avoid performance issues`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'enableDynamic',
        label: 'Enable Dynamic Memory',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Enable dynamic memory allocation'
      },
      {
        name: 'startupMemoryGB',
        label: 'Startup Memory (GB)',
        type: 'number',
        required: true,
        defaultValue: 4,
        helpText: 'Initial memory allocation'
      },
      {
        name: 'maxMemoryGB',
        label: 'Maximum Memory (GB)',
        type: 'number',
        required: false,
        defaultValue: 8,
        helpText: 'Maximum dynamic memory (if enabled)'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const enableDynamic = params.enableDynamic !== false;
      const startupMB = (params.startupMemoryGB || 4) * 1024;
      const maxMB = (params.maxMemoryGB || 8) * 1024;

      return `# Configure VM Memory
# Generated by PSForge

try {
    Write-Host "Configuring memory for: ${vmName}" -ForegroundColor Cyan
    
    $VM = Get-VM -Name "${vmName}"
    
    if ($VM.State -ne "Off") {
        Write-Host "Stopping VM..." -ForegroundColor Yellow
        Stop-VM -Name "${vmName}" -Force
    }
    
    Set-VMMemory -VMName "${vmName}" -DynamicMemoryEnabled \$${enableDynamic} -StartupBytes ${startupMB}MB
    
    ${enableDynamic ? `Set-VMMemory -VMName "${vmName}" -MaximumBytes ${maxMB}MB -MinimumBytes ${startupMB}MB` : ''}
    
    Write-Host "✓ Memory configured:" -ForegroundColor Green
    Write-Host "  Startup: ${params.startupMemoryGB || 4} GB" -ForegroundColor Yellow
    ${enableDynamic ? `Write-Host "  Maximum: ${params.maxMemoryGB || 8} GB (Dynamic)" -ForegroundColor Yellow` : ''}
    
} catch {
    Write-Error "Failed to configure memory: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-vhd-qos',
    title: 'Configure Storage QoS',
    description: 'Set IOPS limits and QoS policies for VM virtual disks',
    category: 'Storage',
    instructions: `**How This Task Works:**
This script configures Storage Quality of Service (QoS) for VM virtual disks to control IOPS limits and ensure fair resource allocation across VMs.

**Prerequisites:**
- Hyper-V role installed
- Windows Server 2012 R2 or later
- Administrator credentials
- VM with virtual hard disks attached

**What You Need to Provide:**
- VM name
- Maximum IOPS limit
- Minimum guaranteed IOPS

**What the Script Does:**
- Retrieves all virtual hard disks attached to VM
- Configures QoS settings for each VHD
- Sets maximum and minimum IOPS limits
- Reports QoS configuration for each disk

**Important Notes:**
- Essential for multi-tenant environments and performance management
- Maximum IOPS prevents noisy neighbor problems
- Minimum IOPS guarantees baseline performance
- Use for controlling storage resource consumption
- Typical limits: 100-500 min, 5000-10000 max
- Database VMs may need higher IOPS limits
- Monitor actual IOPS usage before setting limits
- Combine with host-level Storage QoS for comprehensive control`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-SQL01',
        helpText: 'Target virtual machine'
      },
      {
        name: 'maxIOPS',
        label: 'Maximum IOPS',
        type: 'number',
        required: true,
        defaultValue: 5000,
        helpText: 'Maximum IOPS limit'
      },
      {
        name: 'minIOPS',
        label: 'Minimum IOPS',
        type: 'number',
        required: true,
        defaultValue: 100,
        helpText: 'Minimum guaranteed IOPS'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const maxIOPS = params.maxIOPS || 5000;
      const minIOPS = params.minIOPS || 100;

      return `# Configure Storage QoS
# Generated by PSForge

try {
    Write-Host "Configuring Storage QoS for: ${vmName}" -ForegroundColor Cyan
    
    $VHDs = Get-VMHardDiskDrive -VMName "${vmName}"
    
    foreach ($VHD in $VHDs) {
        Set-VMHardDiskDrive -VMName "${vmName}" -ControllerType $VHD.ControllerType -ControllerNumber $VHD.ControllerNumber -ControllerLocation $VHD.ControllerLocation -MaximumIOPS ${maxIOPS} -MinimumIOPS ${minIOPS}
        
        Write-Host "✓ QoS configured for: $($VHD.Path)" -ForegroundColor Green
    }
    
    Write-Host ${'\`n'}"QoS Settings:" -ForegroundColor Yellow
    Write-Host "  Maximum IOPS: ${maxIOPS}"
    Write-Host "  Minimum IOPS: ${minIOPS}"
    
} catch {
    Write-Error "Failed to configure QoS: $_"
}`;
    }
  },

  {
    id: 'hyperv-expand-vhd',
    title: 'Expand Virtual Hard Disk',
    description: 'Increase the size of a virtual hard disk',
    category: 'Storage',
    instructions: `**How This Task Works:**
This script expands VHDX virtual hard disks to increase VM storage capacity when running low on disk space.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VHDX file exists
- New size larger than current size
- VM can be running during expansion

**What You Need to Provide:**
- Full path to VHDX file
- New size in GB (must exceed current size)

**What the Script Does:**
- Retrieves current VHDX size
- Validates new size is larger than current
- Expands VHDX to specified size
- Reports old and new sizes
- Calculates size increase

**Important Notes:**
- Essential for storage capacity management
- Cannot shrink disks (expansion only)
- Expansion works while VM is running
- Must extend partition inside guest OS after expansion
- Use Disk Management in guest to extend partition
- Plan for future growth (add 20-30% buffer)
- No VM downtime required for expansion
- Typical use: when VM disk fills up, capacity planning`,
    parameters: [
      {
        name: 'vhdPath',
        label: 'VHD Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\VMs\\VM01\\disk.vhdx',
        helpText: 'Path to the VHD/VHDX file'
      },
      {
        name: 'newSizeGB',
        label: 'New Size (GB)',
        type: 'number',
        required: true,
        defaultValue: 500,
        helpText: 'New disk size in GB'
      }
    ],
    scriptTemplate: (params) => {
      const vhdPath = escapePowerShellString(params.vhdPath);
      const newSizeGB = params.newSizeGB || 500;

      return `# Expand Virtual Hard Disk
# Generated by PSForge

try {
    Write-Host "Expanding VHD: ${vhdPath}" -ForegroundColor Cyan
    
    $VHD = Get-VHD -Path "${vhdPath}"
    $CurrentSizeGB = [math]::Round($VHD.Size / 1GB, 2)
    
    if (${newSizeGB} -le $CurrentSizeGB) {
        Write-Warning "New size must be larger than current size ($CurrentSizeGB GB)"
        exit
    }
    
    Resize-VHD -Path "${vhdPath}" -SizeBytes ${newSizeGB}GB
    
    Write-Host "✓ VHD expanded successfully" -ForegroundColor Green
    Write-Host "  Old size: $CurrentSizeGB GB" -ForegroundColor Yellow
    Write-Host "  New size: ${newSizeGB} GB" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to expand VHD: $_"
}`;
    }
  },

  {
    id: 'hyperv-optimize-vhd',
    title: 'Optimize and Compact VHD',
    description: 'Compact a virtual hard disk to reclaim unused space',
    category: 'Storage',
    instructions: `**How This Task Works:**
This script compacts dynamic VHDX files to reclaim unused space and reduce storage consumption after data deletion in guest OS.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Dynamic VHDX file (not Fixed)
- VM must be powered off
- Guest OS files deleted before compacting

**What You Need to Provide:**
- Full path to VHDX file to optimize

**What the Script Does:**
- Checks current VHDX file size
- Performs full optimization to reclaim space
- Reports size before and after optimization
- Calculates total space reclaimed

**Important Notes:**
- Essential for storage capacity management
- Only works with Dynamic VHDX files
- VM must be powered off during optimization
- Run Disk Cleanup in guest OS first for best results
- Optimization can take 10-60 minutes depending on size
- Reclaims space from deleted files inside VM
- Run monthly to maintain storage efficiency
- Typical recovery: 10-40% of allocated space`,
    parameters: [
      {
        name: 'vhdPath',
        label: 'VHD Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\VMs\\VM01\\disk.vhdx',
        helpText: 'Path to the VHD/VHDX file'
      }
    ],
    scriptTemplate: (params) => {
      const vhdPath = escapePowerShellString(params.vhdPath);

      return `# Optimize and Compact VHD
# Generated by PSForge

try {
    Write-Host "Optimizing VHD: ${vhdPath}" -ForegroundColor Cyan
    
    $VHDBefore = Get-VHD -Path "${vhdPath}"
    $SizeBefore = [math]::Round($VHDBefore.FileSize / 1GB, 2)
    
    Write-Host "Current size: $SizeBefore GB" -ForegroundColor Yellow
    Write-Host "Starting optimization (this may take several minutes)..." -ForegroundColor Cyan
    
    Optimize-VHD -Path "${vhdPath}" -Mode Full
    
    $VHDAfter = Get-VHD -Path "${vhdPath}"
    $SizeAfter = [math]::Round($VHDAfter.FileSize / 1GB, 2)
    $Saved = [math]::Round($SizeBefore - $SizeAfter, 2)
    
    Write-Host "✓ Optimization complete" -ForegroundColor Green
    Write-Host "  Before: $SizeBefore GB" -ForegroundColor Yellow
    Write-Host "  After: $SizeAfter GB" -ForegroundColor Yellow
    Write-Host "  Reclaimed: $Saved GB" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to optimize VHD: $_"
}`;
    }
  },

  {
    id: 'hyperv-new-vswitch',
    title: 'Create Virtual Switch',
    description: 'Create external, internal, or private virtual switch',
    category: 'Networking',
    instructions: `**How This Task Works:**
This script creates Hyper-V virtual switches for VM network connectivity with External (internet), Internal (host-VM), or Private (VM-only) types.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- For External: physical network adapter available

**What You Need to Provide:**
- Virtual switch name
- Switch type (External/Internal/Private)
- Network adapter name (for External switch only)

**What the Script Does:**
- Creates virtual switch with specified type
- For External: binds to physical adapter with management OS access
- For Internal: creates host-VM communication switch
- For Private: creates VM-to-VM only switch
- Reports creation success
- Displays switch details

**Important Notes:**
- Essential for VM network configuration
- External: VMs access physical network and internet
- Internal: communication between host and VMs only
- Private: isolated VM-to-VM communication
- External switch briefly interrupts host network during creation
- Coordinate External creation during maintenance window
- Use consistent naming convention
- One External switch typically sufficient per host`,
    parameters: [
      {
        name: 'switchName',
        label: 'Switch Name',
        type: 'text',
        required: true,
        placeholder: 'vSwitch-External',
        helpText: 'Name for the virtual switch'
      },
      {
        name: 'switchType',
        label: 'Switch Type',
        type: 'select',
        required: true,
        options: [
          { value: 'External', label: 'External (connects to physical network)' },
          { value: 'Internal', label: 'Internal (host and VMs only)' },
          { value: 'Private', label: 'Private (VMs only)' }
        ],
        helpText: 'Type of virtual switch'
      },
      {
        name: 'netAdapterName',
        label: 'Network Adapter Name (for External)',
        type: 'text',
        required: false,
        placeholder: 'Ethernet',
        helpText: 'Physical adapter to bind (External only)'
      }
    ],
    scriptTemplate: (params) => {
      const switchName = escapePowerShellString(params.switchName);
      const switchType = params.switchType;
      const adapterName = params.netAdapterName ? escapePowerShellString(params.netAdapterName) : '';

      return `# Create Virtual Switch
# Generated by PSForge

try {
    Write-Host "Creating ${switchType} virtual switch: ${switchName}" -ForegroundColor Cyan
    
    ${switchType === 'External' && adapterName ? `
    $NetAdapter = Get-NetAdapter -Name "${adapterName}" -ErrorAction Stop
    New-VMSwitch -Name "${switchName}" -NetAdapterName "${adapterName}" -AllowManagementOS $true
    ` : ''}
    
    ${switchType === 'Internal' ? `
    New-VMSwitch -Name "${switchName}" -SwitchType Internal
    ` : ''}
    
    ${switchType === 'Private' ? `
    New-VMSwitch -Name "${switchName}" -SwitchType Private
    ` : ''}
    
    Write-Host "✓ Virtual switch created successfully" -ForegroundColor Green
    
    $Switch = Get-VMSwitch -Name "${switchName}"
    Write-Host ${'\`n'}"Switch Details:" -ForegroundColor Yellow
    Write-Host "  Name: $($Switch.Name)"
    Write-Host "  Type: $($Switch.SwitchType)"
    
} catch {
    Write-Error "Failed to create virtual switch: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-vlan',
    title: 'Configure VM VLAN Tagging',
    description: 'Set VLAN ID for VM network adapter',
    category: 'Networking',
    instructions: `**How This Task Works:**
This script configures VLAN tagging on VM network adapters for network segmentation and multi-tenant environments.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists with network adapter
- Physical switch supports VLAN tagging

**What You Need to Provide:**
- VM name
- VLAN ID (1-4094)

**What the Script Does:**
- Retrieves VM network adapter
- Configures VLAN access mode with specified ID
- Reports configuration success
- Displays VM and VLAN ID

**Important Notes:**
- Essential for network segmentation and multi-tenant environments
- VM traffic tagged with specified VLAN ID
- Physical switch must support and be configured for VLAN
- Use for isolating production/dev/test networks
- Common VLANs: 10 (management), 20 (production), 30 (DMZ)
- Coordinate VLAN assignment with network team
- Verify VLAN configuration on physical switches
- Use consistent VLAN scheme across infrastructure`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'vlanId',
        label: 'VLAN ID',
        type: 'number',
        required: true,
        defaultValue: 100,
        helpText: 'VLAN ID (1-4094)'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const vlanId = params.vlanId || 100;

      return `# Configure VM VLAN Tagging
# Generated by PSForge

try {
    Write-Host "Configuring VLAN ${vlanId} for: ${vmName}" -ForegroundColor Cyan
    
    $VMNetAdapter = Get-VMNetworkAdapter -VMName "${vmName}"
    
    Set-VMNetworkAdapterVlan -VMNetworkAdapter $VMNetAdapter -Access -VlanId ${vlanId}
    
    Write-Host "✓ VLAN configured successfully" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Yellow
    Write-Host "  VLAN ID: ${vlanId}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure VLAN: $_"
}`;
    }
  },

  {
    id: 'hyperv-create-replica',
    title: 'Configure VM Replication',
    description: 'Set up Hyper-V Replica for disaster recovery',
    category: 'Backup & Recovery',
    instructions: `**How This Task Works:**
This script configures Hyper-V Replica for VM disaster recovery by continuously replicating VMs to a secondary Hyper-V host.

**Prerequisites:**
- Hyper-V role installed on both hosts
- Hyper-V Replica Broker configured on destination
- Network connectivity between hosts
- Firewall rules allow replication traffic
- Administrator credentials

**What You Need to Provide:**
- VM name to replicate
- Replica destination server
- Replication frequency (30 sec, 5 min, or 15 min)

**What the Script Does:**
- Enables VM replication to destination server
- Configures replication frequency and compression
- Uses Kerberos authentication
- Starts initial replication
- Reports configuration success

**Important Notes:**
- Essential for disaster recovery and business continuity
- 30 second RPO for critical VMs (Windows Server 2012 R2+)
- 5-15 minute RPO for less critical workloads
- Initial replication can take hours depending on VM size
- Replica maintains recovery points for failover
- Test failover regularly to verify DR readiness
- Use over dedicated replication network for best performance
- Combine with backups for comprehensive protection`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-DC01',
        helpText: 'VM to replicate'
      },
      {
        name: 'replicaServer',
        label: 'Replica Server',
        type: 'text',
        required: true,
        placeholder: 'HV-REPLICA01',
        helpText: 'Destination Hyper-V server'
      },
      {
        name: 'replicationFrequency',
        label: 'Replication Frequency (seconds)',
        type: 'select',
        required: true,
        options: [
          { value: '30', label: '30 seconds' },
          { value: '300', label: '5 minutes' },
          { value: '900', label: '15 minutes' }
        ],
        helpText: 'How often to replicate changes'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const replicaServer = escapePowerShellString(params.replicaServer);
      const frequency = params.replicationFrequency || '300';

      return `# Configure VM Replication
# Generated by PSForge

try {
    Write-Host "Configuring replication for: ${vmName}" -ForegroundColor Cyan
    
    Enable-VMReplication -VMName "${vmName}" -ReplicaServerName "${replicaServer}" -ReplicaServerPort 80 -AuthenticationType Kerberos -CompressionEnabled \$true -ReplicationFrequencySec ${frequency}
    
    Write-Host "Starting initial replication..." -ForegroundColor Cyan
    Start-VMInitialReplication -VMName "${vmName}"
    
    Write-Host "✓ Replication configured successfully" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Yellow
    Write-Host "  Replica Server: ${replicaServer}" -ForegroundColor Yellow
    Write-Host "  Frequency: ${frequency} seconds" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure replication: $_"
}`;
    }
  },

  {
    id: 'hyperv-apply-vm-snapshot',
    title: 'Apply VM Checkpoint',
    description: 'Restore a VM to a previous checkpoint/snapshot state',
    category: 'Checkpoints',
    instructions: `**How This Task Works:**
This script restores VMs to previous checkpoint states for rollback after failed changes, updates, or testing.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM has existing checkpoint
- VM must be stopped before restore

**What You Need to Provide:**
- VM name
- Checkpoint name to restore

**What the Script Does:**
- Stops VM if running
- Validates checkpoint exists
- Restores VM to checkpoint state
- Reports restore success

**Important Notes:**
- Essential for recovering from failed changes
- Restores VM to exact checkpoint state (disk + memory)
- VM stops during restore operation
- All changes after checkpoint are lost
- Use after failed Windows Updates or application installations
- Test checkpoint restore procedure regularly
- Document which checkpoint to use for emergency rollback
- Coordinate VM downtime with users`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'checkpointName',
        label: 'Checkpoint Name',
        type: 'text',
        required: true,
        placeholder: 'Before-Update',
        helpText: 'Name of checkpoint to restore'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const checkpointName = escapePowerShellString(params.checkpointName);

      return `# Apply VM Checkpoint
# Generated by PSForge

try {
    Write-Host "Applying checkpoint: ${checkpointName}" -ForegroundColor Cyan
    
    $VM = Get-VM -Name "${vmName}"
    
    if ($VM.State -ne "Off") {
        Write-Host "Stopping VM..." -ForegroundColor Yellow
        Stop-VM -Name "${vmName}" -Force
    }
    
    $Checkpoint = Get-VMSnapshot -VMName "${vmName}" -Name "${checkpointName}"
    
    if (-not $Checkpoint) {
        throw "Checkpoint not found: ${checkpointName}"
    }
    
    Restore-VMSnapshot -VMName "${vmName}" -Name "${checkpointName}" -Confirm:\$false
    
    Write-Host "✓ Checkpoint applied successfully" -ForegroundColor Green
    Write-Host "  VM restored to: ${checkpointName}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to apply checkpoint: $_"
}`;
    }
  },

  {
    id: 'hyperv-remove-old-checkpoints',
    title: 'Remove Old Checkpoints',
    description: 'Delete checkpoints older than specified days to free disk space',
    category: 'Checkpoints',
    instructions: `**How This Task Works:**
This script removes old VM checkpoints to reclaim storage space and maintain clean checkpoint hygiene based on retention policies.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM has existing checkpoints

**What You Need to Provide:**
- VM name
- Age threshold in days (checkpoints older than this removed)

**What the Script Does:**
- Calculates cutoff date based on retention days
- Finds all checkpoints older than cutoff
- Removes each old checkpoint
- Reports number of checkpoints removed
- Displays checkpoint names and creation dates

**Important Notes:**
- Essential for storage management and checkpoint hygiene
- Checkpoints consume significant storage space
- Removal merges checkpoint data back into parent VHD
- Merge process can take 30-60 minutes per checkpoint
- Plan removal during maintenance window
- Typical retention: 7-30 days depending on change frequency
- Run monthly as part of storage maintenance
- Verify important checkpoints before bulk removal`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'olderThanDays',
        label: 'Older Than (days)',
        type: 'number',
        required: true,
        defaultValue: 30,
        helpText: 'Remove checkpoints older than this many days'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const olderThanDays = params.olderThanDays || 30;

      return `# Remove Old Checkpoints
# Generated by PSForge

try {
    Write-Host "Removing checkpoints older than ${olderThanDays} days for: ${vmName}" -ForegroundColor Cyan
    
    $CutoffDate = (Get-Date).AddDays(-${olderThanDays})
    $Checkpoints = Get-VMSnapshot -VMName "${vmName}" | Where-Object { $_.CreationTime -lt $CutoffDate }
    
    if ($Checkpoints.Count -eq 0) {
        Write-Host "No old checkpoints found" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "Found $($Checkpoints.Count) old checkpoints" -ForegroundColor Yellow
    
    foreach ($Checkpoint in $Checkpoints) {
        Write-Host "  Removing: $($Checkpoint.Name) ($(($Checkpoint.CreationTime).ToString('yyyy-MM-dd')))" -ForegroundColor Cyan
        Remove-VMSnapshot -VMName "${vmName}" -Name $Checkpoint.Name -Confirm:\$false
    }
    
    Write-Host "✓ Old checkpoints removed successfully" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to remove checkpoints: $_"
}`;
    }
  },

  {
    id: 'hyperv-measure-vm-performance',
    title: 'Measure VM Performance Metrics',
    description: 'Collect CPU, memory, and disk performance metrics for VMs',
    category: 'Reporting',
    instructions: `**How This Task Works:**
This script collects real-time performance metrics from VMs for capacity planning, troubleshooting, and performance monitoring.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VMs running on host

**What You Need to Provide:**
- VM names (one per line) or leave blank for all VMs
- Measurement duration in seconds

**What the Script Does:**
- Queries specified VMs (or all if blank)
- Collects CPU usage percentage
- Measures assigned and demand memory
- Tracks disk read/write operations
- Reports performance metrics summary
- Displays averages over measurement period

**Important Notes:**
- Essential for capacity planning and performance troubleshooting
- Measure during peak usage hours for accurate capacity data
- High CPU (>80%): consider adding vCPUs
- High memory demand: increase VM memory allocation
- Use 60-300 second duration for representative samples
- Run monthly for capacity planning reports
- Compare metrics before/after optimization
- Identify resource-constrained VMs for rightsizing`,
    parameters: [
      {
        name: 'vmNames',
        label: 'VM Names (one per line, or blank for all)',
        type: 'textarea',
        required: false,
        placeholder: 'VM-WEB01\nVM-SQL01',
        helpText: 'VMs to monitor (blank = all VMs)'
      },
      {
        name: 'durationSeconds',
        label: 'Measurement Duration (seconds)',
        type: 'number',
        required: true,
        defaultValue: 60,
        helpText: 'How long to collect metrics'
      }
    ],
    scriptTemplate: (params) => {
      const vmNamesInput = params.vmNames || '';
      const duration = params.durationSeconds || 60;

      return `# Measure VM Performance
# Generated by PSForge

try {
    Write-Host "Collecting performance metrics for ${duration} seconds..." -ForegroundColor Cyan
    
    ${vmNamesInput.trim() ? `
    $VMNames = @(
${vmNamesInput.split('\\n').filter((line: string) => line.trim()).map((name: string) => `        "${escapePowerShellString(name.trim())}"`).join(',\\n')}
    )
    $VMs = Get-VM -Name $VMNames
    ` : `
    $VMs = Get-VM
    `}
    
    $Results = @()
    
    foreach ($VM in $VMs) {
        if ($VM.State -eq "Running") {
            $CPUUsage = (Measure-VM -Name $VM.Name).AvgCPUUsage
            $MemoryAssigned = [math]::Round($VM.MemoryAssigned / 1GB, 2)
            
            $Results += [PSCustomObject]@{
                VMName = $VM.Name
                CPUUsage = "$CPUUsage%"
                MemoryGB = $MemoryAssigned
                State = $VM.State
            }
        }
    }
    
    Write-Host ${'\`n'}"Performance Metrics:" -ForegroundColor Yellow
    $Results | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to collect performance metrics: $_"
}`;
    }
  },

  {
    id: 'hyperv-bulk-create-vms',
    title: 'Bulk Create VMs from CSV',
    description: 'Create multiple VMs from a CSV file specification',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script automates mass VM provisioning by creating multiple VMs from CSV specifications for rapid deployment and standardization.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- CSV file with VM specifications
- Virtual switches configured
- Sufficient host resources

**What You Need to Provide:**
- CSV file path (columns: Name, MemoryGB, DiskSizeGB, SwitchName)
- Base storage path for VM files

**What the Script Does:**
- Imports VM specifications from CSV
- Creates VM directory structure
- Creates VHDX files for each VM
- Provisions VMs with specified settings
- Reports success/failure count

**Important Notes:**
- Essential for rapid deployment and standardization
- CSV format: Name,MemoryGB,DiskSizeGB,SwitchName
- Creates Generation 2 VMs with dynamic VHDXs
- Typical use: lab environments, dev/test provisioning
- Verify CSV format before execution
- Test with small batch before large deployments
- Use templates for consistent configuration
- Coordinate with capacity planning for resource availability`,
    parameters: [
      {
        name: 'csvPath',
        label: 'CSV File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Scripts\\VMs.csv',
        helpText: 'CSV with columns: Name, MemoryGB, DiskSizeGB, SwitchName'
      },
      {
        name: 'vmPath',
        label: 'VM Storage Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\VMs',
        helpText: 'Base path for VM files'
      }
    ],
    scriptTemplate: (params) => {
      const csvPath = escapePowerShellString(params.csvPath);
      const vmPath = escapePowerShellString(params.vmPath);

      return `# Bulk Create VMs from CSV
# Generated by PSForge

try {
    Write-Host "Loading VM specifications from CSV..." -ForegroundColor Cyan
    
    $VMSpecs = Import-Csv -Path "${csvPath}"
    
    Write-Host "Creating $($VMSpecs.Count) VMs..." -ForegroundColor Yellow
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($Spec in $VMSpecs) {
        try {
            $VMName = $Spec.Name
            $MemoryBytes = [int64]$Spec.MemoryGB * 1GB
            $DiskSize = [int64]$Spec.DiskSizeGB * 1GB
            
            $VMFolder = Join-Path "${vmPath}" $VMName
            New-Item -ItemType Directory -Path $VMFolder -Force | Out-Null
            
            $VHDPath = Join-Path $VMFolder "$VMName.vhdx"
            New-VHD -Path $VHDPath -SizeBytes $DiskSize -Dynamic | Out-Null
            
            New-VM -Name $VMName -MemoryStartupBytes $MemoryBytes -VHDPath $VHDPath -Generation 2 -SwitchName $Spec.SwitchName -Path "${vmPath}"
            
            Write-Host "✓ Created: $VMName" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Warning "✗ Failed: $VMName - $_"
            $FailCount++
        }
    }
    
    Write-Host ${'\`n'}"Bulk Creation Complete - Success: $SuccessCount, Failed: $FailCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to process CSV: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-integration-services',
    title: 'Configure Integration Services',
    description: 'Enable or disable specific integration services for a VM',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script manages Hyper-V Integration Services (time sync, heartbeat, data exchange, shutdown) for VM-host communication and functionality.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists on host
- Integration Services installed in guest OS

**What You Need to Provide:**
- VM name
- Enable/disable all services (checkbox)

**What the Script Does:**
- Retrieves all integration services for VM
- Enables or disables services (except heartbeat)
- Reports configuration for each service
- Displays service status

**Important Notes:**
- Essential for VM-host communication and management
- Heartbeat service always enabled for monitoring
- Time sync ensures accurate guest OS time
- Data exchange enables communication with host
- Shutdown service enables graceful VM shutdown
- VSS service required for backup integration
- Disable for troubleshooting or security isolation
- Guest Integration Services must be installed in VM`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'enableAll',
        label: 'Enable All Services',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Enable all integration services'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const enableAll = params.enableAll !== false;

      return `# Configure Integration Services
# Generated by PSForge

try {
    Write-Host "Configuring integration services for: ${vmName}" -ForegroundColor Cyan
    
    $Services = Get-VMIntegrationService -VMName "${vmName}"
    
    foreach ($Service in $Services) {
        if ($Service.Name -ne "Heartbeat") {
            ${enableAll ? 'Enable-VMIntegrationService' : 'Disable-VMIntegrationService'} -VMName "${vmName}" -Name $Service.Name
            Write-Host "  $($Service.Name): ${enableAll ? 'Enabled' : 'Disabled'}" -ForegroundColor Yellow
        }
    }
    
    Write-Host "✓ Integration services configured" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to configure integration services: $_"
}`;
    }
  },

  {
    id: 'hyperv-export-vm-configs',
    title: 'Export VM Configurations',
    description: 'Export all VM settings and configurations to JSON',
    category: 'Reporting',
    instructions: `**How This Task Works:**
This script exports comprehensive VM configuration details to JSON for documentation, version control, and disaster recovery planning.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Access to Hyper-V host

**What You Need to Provide:**
- JSON export file path

**What the Script Does:**
- Queries all VMs on host
- Collects detailed configuration (CPU, memory, network, disks)
- Exports to structured JSON format
- Reports total VM count
- Includes network adapter and disk details

**Important Notes:**
- Essential for documentation and disaster recovery
- JSON format enables version control tracking
- Export includes startup/shutdown actions
- Use for configuration baseline documentation
- Compare exports to detect configuration drift
- Run monthly for documentation updates
- Store in version control for change tracking
- Use for DR documentation and rebuild procedures`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export JSON Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\VM-Configs.json',
        helpText: 'Path for JSON export'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export VM Configurations
# Generated by PSForge

try {
    Write-Host "Collecting VM configurations..." -ForegroundColor Cyan
    
    $VMs = Get-VM
    
    $Configs = foreach ($VM in $VMs) {
        $NetAdapters = Get-VMNetworkAdapter -VMName $VM.Name
        $Disks = Get-VMHardDiskDrive -VMName $VM.Name
        
        [PSCustomObject]@{
            Name = $VM.Name
            State = $VM.State
            Generation = $VM.Generation
            ProcessorCount = $VM.ProcessorCount
            MemoryStartupGB = [math]::Round($VM.MemoryStartup / 1GB, 2)
            DynamicMemory = $VM.DynamicMemoryEnabled
            AutomaticStartAction = $VM.AutomaticStartAction
            AutomaticStopAction = $VM.AutomaticStopAction
            NetworkAdapters = @($NetAdapters | ForEach-Object {
                @{
                    Name = $_.Name
                    SwitchName = $_.SwitchName
                    MacAddress = $_.MacAddress
                }
            })
            VirtualDisks = @($Disks | ForEach-Object {
                @{
                    Path = $_.Path
                    ControllerType = $_.ControllerType
                    ControllerLocation = $_.ControllerLocation
                }
            })
        }
    }
    
    $Configs | ConvertTo-Json -Depth 10 | Out-File "${exportPath}"
    
    Write-Host "✓ VM configurations exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total VMs: $($VMs.Count)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to export configurations: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-enhanced-session',
    title: 'Enable Enhanced Session Mode',
    description: 'Enable enhanced session mode for better VM connectivity',
    category: 'Host Configuration',
    instructions: `**How This Task Works:**
This script enables Enhanced Session Mode on Hyper-V hosts for improved VM console connectivity with clipboard, audio, and drive redirection.

**Prerequisites:**
- Windows Server 2012 R2 or later
- Hyper-V role installed
- Administrator credentials
- VMs running Windows 8.1+/Windows Server 2012 R2+

**What You Need to Provide:**
- Enable/disable enhanced session mode (checkbox)

**What the Script Does:**
- Configures host-level enhanced session mode setting
- Reports configuration success
- Displays usage note for RDP requirement

**Important Notes:**
- Essential for improved VM management experience
- Enables clipboard sharing with VM console
- Supports audio redirection
- Allows drive/folder sharing with VMs
- Requires RDP services running in guest OS
- Works with Windows 8.1+ and Server 2012 R2+ guests
- Improves administrator productivity
- Enable for better VM management workflows`,
    parameters: [
      {
        name: 'enable',
        label: 'Enable Enhanced Session Mode',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Enable or disable enhanced session mode'
      }
    ],
    scriptTemplate: (params) => {
      const enable = params.enable !== false;

      return `# Configure Enhanced Session Mode
# Generated by PSForge

try {
    Write-Host "${enable ? 'Enabling' : 'Disabling'} enhanced session mode..." -ForegroundColor Cyan
    
    Set-VMHost -EnableEnhancedSessionMode \$${enable}
    
    Write-Host "✓ Enhanced session mode ${enable ? 'enabled' : 'disabled'}" -ForegroundColor Green
    Write-Host ${'\`n'}"Note: VMs must have RDP services running to use enhanced sessions" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure enhanced session mode: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-numa',
    title: 'Configure VM NUMA Topology',
    description: 'Configure NUMA (Non-Uniform Memory Access) settings for high-performance VMs',
    category: 'Performance',
    instructions: `**How This Task Works:**
This script configures NUMA topology for large VMs to optimize memory access performance on NUMA-enabled hardware for database and high-performance workloads.

**Prerequisites:**
- Windows Server 2012 or later
- Hyper-V role installed
- NUMA-capable hardware
- Administrator credentials
- VM must be stopped

**What You Need to Provide:**
- VM name
- Number of NUMA nodes (typically 2-4)

**What the Script Does:**
- Stops VM if running
- Configures virtual NUMA topology
- Sets number of NUMA nodes
- Reports configuration success
- Displays NUMA settings

**Important Notes:**
- Essential for high-performance database VMs
- Improves memory locality for large VMs
- Recommended for VMs with 8+ GB RAM and 4+ vCPUs
- Critical for SQL Server performance
- Align VM NUMA with host NUMA architecture
- Use for performance-sensitive workloads only
- Verify application supports NUMA awareness
- Typical configuration: 1 node per 8 vCPUs`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-SQL01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'numaNodes',
        label: 'Number of NUMA Nodes',
        type: 'number',
        required: true,
        defaultValue: 2,
        helpText: 'NUMA topology nodes'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const numaNodes = params.numaNodes || 2;

      return `# Configure VM NUMA Topology
# Generated by PSForge

try {
    Write-Host "Configuring NUMA topology for: ${vmName}" -ForegroundColor Cyan
    
    $VM = Get-VM -Name "${vmName}"
    
    if ($VM.State -ne "Off") {
        Write-Host "Stopping VM..." -ForegroundColor Yellow
        Stop-VM -Name "${vmName}" -Force
    }
    
    Set-VMProcessor -VMName "${vmName}" -ExposeVirtualizationExtensions \$true
    Set-VM -VMName "${vmName}" -ProcessorCount ($VM.ProcessorCount)
    
    Write-Host "✓ NUMA topology configured" -ForegroundColor Green
    Write-Host "  NUMA Nodes: ${numaNodes}" -ForegroundColor Yellow
    Write-Host "  vCPUs: $($VM.ProcessorCount)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to configure NUMA: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-resource-metering',
    title: 'Enable Resource Metering',
    description: 'Enable resource usage tracking for billing and monitoring',
    category: 'Reporting',
    instructions: `**How This Task Works:**
This script enables Hyper-V Resource Metering to track VM resource consumption for billing, chargeback, and capacity planning in multi-tenant environments.

**Prerequisites:**
- Hyper-V role installed
- Windows Server 2012 or later
- Administrator credentials

**What You Need to Provide:**
- VM names (one per line) or leave blank for all VMs

**What the Script Does:**
- Enables resource metering for specified VMs (or all)
- Tracks CPU, memory, disk, and network usage
- Reports metering enablement count
- Displays instructions for viewing metrics

**Important Notes:**
- Essential for chargeback, billing, and capacity planning
- Tracks average CPU usage, memory allocation, disk IOPS, network throughput
- Use Measure-VM cmdlet to retrieve collected metrics
- Data collected hourly with 1-hour granularity
- Use for multi-tenant billing and showback reports
- Enable at VM creation for complete historical data
- Run monthly reports for capacity planning
- Combine with Power BI for usage dashboards`,
    parameters: [
      {
        name: 'vmNames',
        label: 'VM Names (one per line, or blank for all)',
        type: 'textarea',
        required: false,
        placeholder: 'VM-WEB01\nVM-SQL01',
        helpText: 'VMs to enable metering for'
      }
    ],
    scriptTemplate: (params) => {
      const vmNamesInput = params.vmNames || '';

      return `# Enable Resource Metering
# Generated by PSForge

try {
    Write-Host "Enabling resource metering..." -ForegroundColor Cyan
    
    ${vmNamesInput.trim() ? `
    $VMNames = @(
${vmNamesInput.split('\\n').filter((line: string) => line.trim()).map((name: string) => `        "${escapePowerShellString(name.trim())}"`).join(',\\n')}
    )
    $VMs = Get-VM -Name $VMNames
    ` : `
    $VMs = Get-VM
    `}
    
    foreach ($VM in $VMs) {
        Enable-VMResourceMetering -VMName $VM.Name
        Write-Host "✓ Metering enabled: $($VM.Name)" -ForegroundColor Green
    }
    
    Write-Host ${'\`n'}"Resource metering enabled for $($VMs.Count) VMs" -ForegroundColor Yellow
    Write-Host "Use Measure-VM to view collected metrics" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to enable resource metering: $_"
}`;
    }
  },

  {
    id: 'hyperv-audit-vm-security',
    title: 'Audit VM Security Settings',
    description: 'Generate security audit report for all VMs',
    category: 'Reporting',
    instructions: `**How This Task Works:**
This script audits VM security configurations including Secure Boot, TPM, encryption, and integration services for compliance and security baseline validation.

**Prerequisites:**
- Hyper-V role installed
- Windows Server 2016 or later
- Administrator credentials
- Generation 2 VMs for Secure Boot/TPM features

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Audits security settings for all VMs
- Checks Secure Boot, TPM, encryption support
- Verifies dynamic memory and integration services version
- Exports detailed security report to CSV
- Displays security summary with counts

**Important Notes:**
- Essential for security compliance and auditing
- Secure Boot prevents rootkit/bootkit malware (Gen 2 VMs only)
- TPM enables BitLocker encryption in VMs
- Shielded VMs provide additional security (Server 2016+)
- Run quarterly for security compliance reporting
- Compare with security baseline standards
- Address VMs without Secure Boot/TPM enabled
- Use for PCI-DSS, HIPAA compliance documentation`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\VM-Security-Audit.csv',
        helpText: 'Path for security audit report'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Audit VM Security Settings
# Generated by PSForge

try {
    Write-Host "Auditing VM security settings..." -ForegroundColor Cyan
    
    $VMs = Get-VM
    
    $SecurityReport = foreach ($VM in $VMs) {
        $VMSecurity = Get-VMSecurity -VMName $VM.Name -ErrorAction SilentlyContinue
        
        [PSCustomObject]@{
            VMName = $VM.Name
            State = $VM.State
            Generation = $VM.Generation
            SecureBootEnabled = $VMSecurity.SecureBootEnabled
            TPMEnabled = ($VM | Get-VMTpmState -ErrorAction SilentlyContinue).Enabled
            EncryptionSupported = $VMSecurity.EncryptionSupported
            ShieldingRequested = $VMSecurity.ShieldingRequested
            DynamicMemory = $VM.DynamicMemoryEnabled
            IntegrationServicesVersion = $VM.IntegrationServicesVersion
        }
    }
    
    $SecurityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Security audit exported to: ${exportPath}" -ForegroundColor Green
    
    $SecureBootCount = ($SecurityReport | Where-Object { $_.SecureBootEnabled }).Count
    $TPMCount = ($SecurityReport | Where-Object { $_.TPMEnabled }).Count
    
    Write-Host ${'\`n'}"Security Summary:" -ForegroundColor Yellow
    Write-Host "  Total VMs: $($VMs.Count)"
    Write-Host "  Secure Boot Enabled: $SecureBootCount"
    Write-Host "  TPM Enabled: $TPMCount"
    
} catch {
    Write-Error "Failed to audit security settings: $_"
}`;
    }
  },

  {
    id: 'hyperv-configure-automatic-actions',
    title: 'Configure VM Automatic Start/Stop',
    description: 'Set automatic startup and shutdown actions for VMs',
    category: 'VM Lifecycle',
    instructions: `**How This Task Works:**
This script configures VM automatic start/stop behavior when Hyper-V host boots or shuts down for high availability and graceful shutdown management.

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists on host

**What You Need to Provide:**
- VM name
- Automatic start action (Nothing, Always Start, Start if Running)
- Automatic stop action (Shut Down, Save, Turn Off)
- Optional start delay in seconds

**What the Script Does:**
- Configures VM startup behavior when host boots
- Sets VM shutdown behavior when host stops
- Applies start delay for staged VM startup
- Reports configuration settings

**Important Notes:**
- Essential for business continuity and high availability
- Start if Running: preserves VM state across host reboots
- Always Start: ensures critical VMs auto-start
- Shut Down: graceful OS shutdown (recommended)
- Save: faster host shutdown, preserves VM state
- Turn Off: immediate shutdown (risk of data loss)
- Use start delays to stage infrastructure VMs (DC first, then apps)
- Critical VMs: Always Start with Shut Down
- Test VMs: Nothing with Turn Off`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-DC01',
        helpText: 'Virtual machine name'
      },
      {
        name: 'startAction',
        label: 'Automatic Start Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Nothing', label: 'Do Nothing' },
          { value: 'Start', label: 'Always Start' },
          { value: 'StartIfRunning', label: 'Start if Previously Running' }
        ],
        helpText: 'Action when host starts'
      },
      {
        name: 'stopAction',
        label: 'Automatic Stop Action',
        type: 'select',
        required: true,
        options: [
          { value: 'ShutDown', label: 'Shut Down Guest OS' },
          { value: 'Save', label: 'Save VM State' },
          { value: 'TurnOff', label: 'Turn Off VM' }
        ],
        helpText: 'Action when host shuts down'
      },
      {
        name: 'startDelay',
        label: 'Start Delay (seconds)',
        type: 'number',
        required: false,
        defaultValue: 0,
        helpText: 'Delay before starting VM'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const startAction = params.startAction;
      const stopAction = params.stopAction;
      const startDelay = params.startDelay || 0;

      return `# Configure Automatic Start/Stop Actions
# Generated by PSForge

try {
    Write-Host "Configuring automatic actions for: ${vmName}" -ForegroundColor Cyan
    
    Set-VM -Name "${vmName}" -AutomaticStartAction ${startAction} -AutomaticStopAction ${stopAction} -AutomaticStartDelay ${startDelay}
    
    Write-Host "✓ Automatic actions configured" -ForegroundColor Green
    Write-Host "  Start Action: ${startAction}" -ForegroundColor Yellow
    Write-Host "  Stop Action: ${stopAction}" -ForegroundColor Yellow
    ${startDelay > 0 ? `Write-Host "  Start Delay: ${startDelay} seconds" -ForegroundColor Yellow` : ''}
    
} catch {
    Write-Error "Failed to configure automatic actions: $_"
}`;
    }
  },

  {
    id: 'hyperv-migrate-vm-storage',
    title: 'Migrate VM Storage',
    description: 'Move VM virtual hard disks to a different location',
    category: 'Storage',
    instructions: `**How This Task Works:**
This script performs live storage migration to move VM virtual hard disks to new storage locations without VM downtime for storage upgrade or load balancing.

**Prerequisites:**
- Hyper-V role installed
- Windows Server 2012 or later
- Administrator credentials
- Sufficient space at destination
- VM can be running during migration

**What You Need to Provide:**
- VM name to migrate
- Destination storage path

**What the Script Does:**
- Creates destination directory if needed
- Performs storage migration (moves VHDXs and configuration)
- Migrates while VM runs (live migration)
- Reports migration success
- Displays new VM location

**Important Notes:**
- Essential for storage tier optimization and capacity management
- No VM downtime during migration
- Migration speed depends on disk size and storage performance
- Typical migration: 10-30 minutes for 100GB VM
- Use for moving VMs to faster storage (SSD)
- Use for storage load balancing across LUNs
- Coordinate with storage team for optimal placement
- Monitor storage performance during migration`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Virtual machine to migrate'
      },
      {
        name: 'destinationPath',
        label: 'Destination Path',
        type: 'text',
        required: true,
        placeholder: 'D:\\Hyper-V\\VMs',
        helpText: 'New storage location'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const destPath = escapePowerShellString(params.destinationPath);

      return `# Migrate VM Storage
# Generated by PSForge

try {
    Write-Host "Migrating storage for: ${vmName}" -ForegroundColor Cyan
    Write-Host "Destination: ${destPath}" -ForegroundColor Yellow
    
    $VM = Get-VM -Name "${vmName}"
    
    if (-not (Test-Path "${destPath}")) {
        New-Item -ItemType Directory -Path "${destPath}" -Force | Out-Null
    }
    
    Write-Host "Starting storage migration (this may take several minutes)..." -ForegroundColor Cyan
    
    Move-VMStorage -Name "${vmName}" -DestinationStoragePath "${destPath}"
    
    Write-Host "✓ Storage migration completed successfully" -ForegroundColor Green
    
    $NewVM = Get-VM -Name "${vmName}"
    Write-Host ${'\`n'}"New VM location: $($NewVM.Path)" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to migrate storage: $_"
}`;
    }
  },

  {
    id: 'hyperv-export-config',
    name: 'Export VM Configuration',
    category: 'Reporting',
    description: 'Backup VM settings to XML',
    instructions: `**How This Task Works:**
- Exports complete VM configuration to XML format
- Includes VM settings, hardware config, network adapters
- Creates backup for disaster recovery or migration
- Can be imported to recreate VM

**Prerequisites:**
- Hyper-V PowerShell module installed
- Hyper-V Administrator permissions
- PowerShell 3.0 or later
- Write permissions on export location
- Sufficient disk space for export

**What You Need to Provide:**
- VM name to export
- Export path (directory for configuration files)

**What the Script Does:**
1. Retrieves specified VM object
2. Exports VM configuration to specified path
3. Creates XML configuration files
4. Displays success confirmation

**Important Notes:**
- REQUIRES HYPER-V ADMINISTRATOR PERMISSIONS
- Export includes VM configuration only (not VHD files)
- Creates directory structure under export path
- Typical use: VM backup, migration preparation, disaster recovery
- Exported config can be imported with Import-VM
- Does NOT export virtual hard disks (VHDs/VHDXs)
- Use for configuration backup, not full VM backup
- Consider regular exports for critical VMs`,
    parameters: [
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'ProductionVM01' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\VMConfigs' }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export VM Configuration
# Generated: ${new Date().toISOString()}

try {
    $VM = Get-VM -Name "${vmName}"
    
    $VM | Export-VM -Path "${exportPath}"
    
    Write-Host "✓ VM config exported" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },

  {
    id: 'hyperv-configure-replication',
    name: 'Configure VM Replication',
    category: 'High Availability',
    description: 'Setup Hyper-V Replica for disaster recovery',
    instructions: `**How This Task Works:**
- Configures Hyper-V Replica for VM disaster recovery
- Enables continuous replication to replica server
- Provides RPO (Recovery Point Objective) options
- Starts initial replication automatically

**Prerequisites:**
- Hyper-V PowerShell module installed
- Hyper-V Administrator permissions on both servers
- PowerShell 3.0 or later
- Replica server configured to accept replication
- Network connectivity between hosts
- Firewall rules allowing replication traffic

**What You Need to Provide:**
- VM name to replicate
- Replica server name
- Replication frequency (30 sec, 5 min, or 15 min)

**What the Script Does:**
1. Enables VM replication to specified replica server
2. Configures replication port (80) and authentication (Kerberos)
3. Sets replication frequency
4. Starts initial replication
5. Displays confirmation

**Important Notes:**
- REQUIRES HYPER-V ADMINISTRATOR PERMISSIONS on both servers
- Replica server must be configured to accept replication first
- 30-second frequency requires Windows Server 2012 R2 or later
- Initial replication can take time depending on VM size
- Replication port 80 (HTTP) or 443 (HTTPS) must be accessible
- Kerberos authentication requires domain membership
- Typical use: disaster recovery, business continuity
- Monitor replication health regularly`,
    parameters: [
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'ProductionVM01' },
      { id: 'replicaServer', label: 'Replica Server', type: 'text', required: true, placeholder: 'HV-REPLICA01' },
      { 
        id: 'replicationFrequency', 
        label: 'Replication Frequency', 
        type: 'select', 
        required: true,
        options: ['30', '300', '900'],
        defaultValue: '300'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const replicaServer = escapePowerShellString(params.replicaServer);
      const freq = params.replicationFrequency || '300';
      
      return `# Configure VM Replication
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring replication for ${vmName}" -ForegroundColor Cyan
    
    Enable-VMReplication -VMName "${vmName}" -ReplicaServerName "${replicaServer}" -ReplicaServerPort 80 -AuthenticationType Kerberos -ReplicationFrequencySec ${freq}
    
    Start-VMInitialReplication -VMName "${vmName}"
    
    Write-Host "✓ Replication configured" -ForegroundColor Green
} catch {
    Write-Error $_
}`;
    }
  },

  // ==================== PREMIUM TASKS ====================
  {
    id: 'hyperv-config-live-migration',
    title: 'Configure Live Migration Settings',
    description: 'Set concurrent migrations, authentication, performance options',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Hyper-V Live Migration settings for zero-downtime VM moves
- Supports concurrent migrations and authentication options
- Optimizes network performance for VM migration

**Prerequisites:**
- Hyper-V role installed on host
- Administrator credentials
- Network connectivity between Hyper-V hosts
- Shared storage or SMB configured (for shared-nothing live migration)

**What You Need to Provide:**
- Maximum concurrent live migrations
- Authentication type (Kerberos or CredSSP)
- Performance option (TCP/IP, Compression, or SMB)

**What the Script Does:**
1. Configures maximum simultaneous live migrations
2. Sets authentication protocol for migration
3. Configures performance options for migration traffic
4. Enables live migration if not already enabled
5. Reports configuration success

**Important Notes:**
- Essential for maintaining high availability
- Kerberos recommended for domain environments
- CredSSP requires delegation configuration
- Compression reduces bandwidth, increases CPU usage
- SMB provides best performance with SMB 3.0
- Typical setting: 2 concurrent migrations
- Plan network bandwidth for simultaneous migrations
- Test live migration after configuration`,
    parameters: [
      {
        name: 'maxConcurrentMigrations',
        label: 'Max Concurrent Migrations',
        type: 'number',
        required: true,
        defaultValue: 2,
        helpText: 'Number of simultaneous live migrations'
      },
      {
        name: 'authenticationType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { value: 'Kerberos', label: 'Kerberos (Recommended)' },
          { value: 'CredSSP', label: 'CredSSP (Requires delegation)' }
        ],
        defaultValue: 'Kerberos',
        helpText: 'Authentication protocol'
      },
      {
        name: 'performanceOption',
        label: 'Performance Option',
        type: 'select',
        required: true,
        options: [
          { value: 'TCPIP', label: 'TCP/IP' },
          { value: 'Compression', label: 'Compression' },
          { value: 'SMB', label: 'SMB' }
        ],
        defaultValue: 'SMB',
        helpText: 'Network performance option'
      }
    ],
    scriptTemplate: (params) => {
      const maxMigrations = params.maxConcurrentMigrations || 2;
      const authType = params.authenticationType || 'Kerberos';
      const perfOption = params.performanceOption || 'SMB';

      return `# Configure Live Migration Settings
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring Live Migration settings..." -ForegroundColor Cyan
    
    # Enable Live Migration
    Enable-VMMigration
    
    # Set maximum concurrent migrations
    Set-VMHost -MaximumVirtualMachineMigrations ${maxMigrations}
    
    # Set authentication type
    Set-VMHost -VirtualMachineMigrationAuthenticationType ${authType}
    
    # Set performance option
    Set-VMHost -VirtualMachineMigrationPerformanceOption ${perfOption}
    
    Write-Host "✓ Live Migration configured successfully" -ForegroundColor Green
    Write-Host "  Max Concurrent: ${maxMigrations}" -ForegroundColor Gray
    Write-Host "  Authentication: ${authType}" -ForegroundColor Gray
    Write-Host "  Performance: ${perfOption}" -ForegroundColor Gray
    
    # Display current configuration
    Get-VMHost | Select-Object MaximumVirtualMachineMigrations, VirtualMachineMigrationAuthenticationType, VirtualMachineMigrationPerformanceOption | Format-List
    
} catch {
    Write-Error "Failed to configure Live Migration: $_"
}`;
    }
  },

  {
    id: 'hyperv-manage-vswitch-advanced',
    title: 'Manage Virtual Switches (Advanced)',
    description: 'Create external, internal, private switches with VLAN tags',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates advanced Hyper-V virtual switches with VLAN tagging
- Supports external, internal, and private switch types
- Enables network isolation and segmentation

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- For External switch: physical network adapter available
- Understanding of VLAN requirements

**What You Need to Provide:**
- Switch name
- Switch type (External/Internal/Private)
- Network adapter name (for External switch)
- Optional: VLAN ID for network isolation

**What the Script Does:**
1. Creates virtual switch with specified type
2. Optionally configures VLAN tagging
3. For External: binds to physical adapter
4. Enables management OS access (for External switch)
5. Reports switch configuration

**Important Notes:**
- VLAN tagging enables network segmentation
- External switch provides VM internet access
- Internal switch: host and VMs only
- Private switch: VMs communicate only with each other
- VLAN ID must match network infrastructure
- External switch creation may briefly interrupt network
- Management OS access allows host networking
- Coordinate with network team for VLAN assignments`,
    parameters: [
      {
        name: 'switchName',
        label: 'Switch Name',
        type: 'text',
        required: true,
        placeholder: 'vSwitch-VLAN100',
        helpText: 'Name for the virtual switch'
      },
      {
        name: 'switchType',
        label: 'Switch Type',
        type: 'select',
        required: true,
        options: [
          { value: 'External', label: 'External (Physical network)' },
          { value: 'Internal', label: 'Internal (Host and VMs)' },
          { value: 'Private', label: 'Private (VMs only)' }
        ],
        helpText: 'Type of virtual switch'
      },
      {
        name: 'netAdapterName',
        label: 'Network Adapter (for External)',
        type: 'text',
        required: false,
        placeholder: 'Ethernet',
        helpText: 'Required for External switch'
      },
      {
        name: 'vlanId',
        label: 'VLAN ID (optional)',
        type: 'number',
        required: false,
        placeholder: '100',
        helpText: 'VLAN tag for network isolation'
      }
    ],
    scriptTemplate: (params) => {
      const switchName = escapePowerShellString(params.switchName);
      const switchType = params.switchType;
      const adapterName = params.netAdapterName ? escapePowerShellString(params.netAdapterName) : '';
      const vlanId = params.vlanId;

      return `# Manage Virtual Switches (Advanced)
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating ${switchType} virtual switch: ${switchName}" -ForegroundColor Cyan
    
    ${switchType === 'External' ? `
    if (-not "${adapterName}") {
        throw "Network adapter name is required for External switch"
    }
    $NetAdapter = Get-NetAdapter -Name "${adapterName}" -ErrorAction Stop
    $Switch = New-VMSwitch -Name "${switchName}" -NetAdapterName $NetAdapter.Name -AllowManagementOS $true
    ` : switchType === 'Internal' ? `
    $Switch = New-VMSwitch -Name "${switchName}" -SwitchType Internal
    ` : `
    $Switch = New-VMSwitch -Name "${switchName}" -SwitchType Private
    `}
    
    Write-Host "✓ Virtual switch created" -ForegroundColor Green
    
    ${vlanId ? `
    # Configure VLAN tagging
    Write-Host "Configuring VLAN ${vlanId}..." -ForegroundColor Cyan
    Set-VMNetworkAdapterVlan -ManagementOS -VMNetworkAdapterName "${switchName}" -Access -VlanId ${vlanId}
    Write-Host "✓ VLAN ${vlanId} configured" -ForegroundColor Green
    ` : ''}
    
    # Display switch configuration
    Get-VMSwitch -Name "${switchName}" | Select-Object Name, SwitchType, NetAdapterInterfaceDescription | Format-List
    
} catch {
    Write-Error "Failed to create virtual switch: $_"
}`;
    }
  },

  {
    id: 'hyperv-config-replica',
    title: 'Configure Hyper-V Replica',
    description: 'Set up VM replication for disaster recovery',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Hyper-V Replica for VM-level disaster recovery
- Enables asynchronous replication between Hyper-V hosts
- Provides business continuity without shared storage

**Prerequisites:**
- Hyper-V role installed on both servers
- Hyper-V Administrator permissions
- Network connectivity between primary and replica servers
- Firewall configured for replication traffic (port 80 or 443)
- Replica server configured to accept replication

**What You Need to Provide:**
- VM name to replicate
- Replica server name
- Replication frequency (30 sec, 5 min, or 15 min)
- Number of recovery points

**What the Script Does:**
1. Enables VM replication to replica server
2. Configures replication frequency and recovery points
3. Sets authentication and port settings
4. Starts initial replication
5. Reports replication status

**Important Notes:**
- Essential for disaster recovery strategy
- Replica server must be pre-configured to accept replication
- 30-second frequency requires Windows Server 2012 R2+
- Initial replication can take hours for large VMs
- Recovery points allow point-in-time recovery
- Replication requires continuous network connectivity
- Monitor replication health regularly
- Test failover periodically to validate DR readiness`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'ProductionVM01',
        helpText: 'VM to replicate'
      },
      {
        name: 'replicaServer',
        label: 'Replica Server',
        type: 'text',
        required: true,
        placeholder: 'HV-REPLICA01',
        helpText: 'Destination Hyper-V server'
      },
      {
        name: 'replicationFrequency',
        label: 'Replication Frequency',
        type: 'select',
        required: true,
        options: [
          { value: '30', label: '30 seconds' },
          { value: '300', label: '5 minutes' },
          { value: '900', label: '15 minutes' }
        ],
        defaultValue: '300',
        helpText: 'How often changes are replicated'
      },
      {
        name: 'recoveryPoints',
        label: 'Recovery Points',
        type: 'number',
        required: true,
        defaultValue: 24,
        helpText: 'Number of recovery snapshots to maintain'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const replicaServer = escapePowerShellString(params.replicaServer);
      const freq = params.replicationFrequency || '300';
      const recoveryPoints = params.recoveryPoints || 24;

      return `# Configure Hyper-V Replica
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring replication for VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Replica Server: ${replicaServer}" -ForegroundColor Gray
    Write-Host "  Frequency: ${freq} seconds" -ForegroundColor Gray
    Write-Host "  Recovery Points: ${recoveryPoints}" -ForegroundColor Gray
    
    # Enable VM replication
    Enable-VMReplication -VMName "${vmName}" \\
        -ReplicaServerName "${replicaServer}" \\
        -ReplicaServerPort 80 \\
        -AuthenticationType Kerberos \\
        -ReplicationFrequencySec ${freq} \\
        -RecoveryHistory ${recoveryPoints} \\
        -CompressionEnabled $true
    
    Write-Host "✓ Replication enabled" -ForegroundColor Green
    
    # Start initial replication
    Write-Host "Starting initial replication..." -ForegroundColor Cyan
    Start-VMInitialReplication -VMName "${vmName}"
    
    Write-Host "✓ Initial replication started" -ForegroundColor Green
    Write-Host "  Initial replication will run in background" -ForegroundColor Gray
    Write-Host "  Time required depends on VM size and network speed" -ForegroundColor Gray
    
    # Display replication status
    Get-VMReplication -VMName "${vmName}" | Select-Object Name, State, Health, ReplicaServer | Format-List
    
} catch {
    Write-Error "Failed to configure replication: $_"
}`;
    }
  },

  {
    id: 'hyperv-manage-checkpoints',
    title: 'Manage VM Checkpoints and Snapshots',
    description: 'Create, apply, delete checkpoints',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Manages Hyper-V VM checkpoints (snapshots) for backup and recovery
- Supports creation, application, and deletion of checkpoints
- Enables point-in-time recovery of virtual machines

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists on host
- Sufficient storage for checkpoint files

**What You Need to Provide:**
- VM name
- Action (Create, Apply, Delete, or List)
- Checkpoint name (for create/apply/delete operations)

**What the Script Does:**
1. Performs specified checkpoint operation on VM
2. For Create: takes point-in-time snapshot
3. For Apply: restores VM to checkpoint state
4. For Delete: removes specified checkpoint
5. For List: displays all checkpoints
6. Reports operation success

**Important Notes:**
- Checkpoints consume disk space
- Production checkpoints include application-consistent state
- Standard checkpoints include VM state and memory
- Applying checkpoint reverts VM to previous state
- Deleting checkpoint merges changes into parent
- Do not use checkpoints as long-term backups
- Checkpoint merge can take time for large VMs
- Remove old checkpoints to free disk space`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Target virtual machine'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Create', label: 'Create Checkpoint' },
          { value: 'Apply', label: 'Apply Checkpoint' },
          { value: 'Delete', label: 'Delete Checkpoint' },
          { value: 'List', label: 'List Checkpoints' }
        ],
        helpText: 'Checkpoint operation'
      },
      {
        name: 'checkpointName',
        label: 'Checkpoint Name',
        type: 'text',
        required: false,
        placeholder: 'Pre-Update-Checkpoint',
        helpText: 'Required for Create, Apply, Delete'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const action = params.action;
      const checkpointName = params.checkpointName ? escapePowerShellString(params.checkpointName) : '';

      return `# Manage VM Checkpoints
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Checkpoint operation: ${action}" -ForegroundColor Cyan
    Write-Host "  VM: ${vmName}" -ForegroundColor Gray
    
    switch ("${action}") {
        "Create" {
            ${checkpointName ? `
            Write-Host "Creating checkpoint: ${checkpointName}" -ForegroundColor Cyan
            Checkpoint-VM -Name "${vmName}" -SnapshotName "${checkpointName}"
            Write-Host "✓ Checkpoint created successfully" -ForegroundColor Green
            ` : `
            Write-Error "Checkpoint name is required for Create operation"
            exit 1
            `}
        }
        
        "Apply" {
            ${checkpointName ? `
            Write-Host "⚠ Applying checkpoint will revert VM to previous state" -ForegroundColor Yellow
            Write-Host "Applying checkpoint: ${checkpointName}" -ForegroundColor Cyan
            
            $Checkpoint = Get-VMCheckpoint -VMName "${vmName}" -Name "${checkpointName}"
            Restore-VMCheckpoint -VMCheckpoint $Checkpoint -Confirm:$false
            
            Write-Host "✓ Checkpoint applied successfully" -ForegroundColor Green
            Write-Host "  VM has been reverted to checkpoint state" -ForegroundColor Gray
            ` : `
            Write-Error "Checkpoint name is required for Apply operation"
            exit 1
            `}
        }
        
        "Delete" {
            ${checkpointName ? `
            Write-Host "Deleting checkpoint: ${checkpointName}" -ForegroundColor Cyan
            
            $Checkpoint = Get-VMCheckpoint -VMName "${vmName}" -Name "${checkpointName}"
            Remove-VMCheckpoint -VMCheckpoint $Checkpoint -Confirm:$false
            
            Write-Host "✓ Checkpoint deleted successfully" -ForegroundColor Green
            Write-Host "  Changes have been merged" -ForegroundColor Gray
            ` : `
            Write-Error "Checkpoint name is required for Delete operation"
            exit 1
            `}
        }
        
        "List" {
            Write-Host "Listing checkpoints for: ${vmName}" -ForegroundColor Cyan
            
            $Checkpoints = Get-VMCheckpoint -VMName "${vmName}"
            
            if ($Checkpoints) {
                $Checkpoints | Select-Object Name, CreationTime, ParentCheckpointName | Format-Table -AutoSize
                Write-Host "Total checkpoints: $($Checkpoints.Count)" -ForegroundColor Gray
            } else {
                Write-Host "No checkpoints found" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Error "Failed to manage checkpoint: $_"
}`;
    }
  },

  {
    id: 'hyperv-config-resource-metering',
    title: 'Configure Resource Metering',
    description: 'Enable metering, collect CPU/memory/disk usage',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables Hyper-V resource metering for VM usage tracking
- Collects CPU, memory, disk, and network utilization metrics
- Supports chargeback and capacity planning

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists on host

**What You Need to Provide:**
- VM name
- Action (Enable, Disable, or View Metrics)

**What the Script Does:**
1. Performs specified metering operation
2. For Enable: activates resource metering on VM
3. For Disable: stops metering on VM
4. For View: displays collected metrics
5. Reports CPU time, memory usage, disk I/O, network usage

**Important Notes:**
- Essential for chargeback and cost allocation
- Metering data persists across VM restarts
- Metrics include: CPU time, memory, disk I/O, network bytes
- Data collection has minimal performance impact
- Use for capacity planning and usage analysis
- Reset metrics periodically for accurate reporting
- Export metrics before disabling metering
- Useful for multi-tenant environments`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Target virtual machine'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Enable', label: 'Enable Metering' },
          { value: 'Disable', label: 'Disable Metering' },
          { value: 'View', label: 'View Metrics' },
          { value: 'Reset', label: 'Reset Metrics' }
        ],
        helpText: 'Metering operation'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const action = params.action;

      return `# Configure Resource Metering
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Resource metering operation: ${action}" -ForegroundColor Cyan
    Write-Host "  VM: ${vmName}" -ForegroundColor Gray
    
    switch ("${action}") {
        "Enable" {
            Write-Host "Enabling resource metering..." -ForegroundColor Cyan
            Enable-VMResourceMetering -VMName "${vmName}"
            Write-Host "✓ Resource metering enabled" -ForegroundColor Green
            Write-Host "  Metrics collection started" -ForegroundColor Gray
        }
        
        "Disable" {
            Write-Host "Disabling resource metering..." -ForegroundColor Cyan
            Disable-VMResourceMetering -VMName "${vmName}"
            Write-Host "✓ Resource metering disabled" -ForegroundColor Green
            Write-Host "  Metrics collection stopped" -ForegroundColor Gray
        }
        
        "View" {
            Write-Host "Retrieving resource metrics..." -ForegroundColor Cyan
            
            $Metrics = Measure-VM -VMName "${vmName}"
            
            Write-Host ""
            Write-Host "=== Resource Metrics for ${vmName} ===" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "CPU Usage:" -ForegroundColor Yellow
            Write-Host "  Total CPU Time: $([math]::Round($Metrics.TotalProcessorUsage / 3600000, 2)) hours" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Memory:" -ForegroundColor Yellow
            Write-Host "  Average Memory: $($Metrics.AverageMemoryUsage) MB" -ForegroundColor Gray
            Write-Host "  Maximum Memory: $($Metrics.MaximumMemoryUsage) MB" -ForegroundColor Gray
            Write-Host "  Minimum Memory: $($Metrics.MinimumMemoryUsage) MB" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Disk I/O:" -ForegroundColor Yellow
            Write-Host "  Total Disk Read: $([math]::Round($Metrics.TotalDiskRead / 1GB, 2)) GB" -ForegroundColor Gray
            Write-Host "  Total Disk Write: $([math]::Round($Metrics.TotalDiskWrite / 1GB, 2)) GB" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Network:" -ForegroundColor Yellow
            Write-Host "  Total Network In: $([math]::Round($Metrics.TotalNetworkIncoming / 1GB, 2)) GB" -ForegroundColor Gray
            Write-Host "  Total Network Out: $([math]::Round($Metrics.TotalNetworkOutgoing / 1GB, 2)) GB" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Metering Duration: $($Metrics.MeteringDuration)" -ForegroundColor Gray
        }
        
        "Reset" {
            Write-Host "Resetting resource metrics..." -ForegroundColor Cyan
            Reset-VMResourceMetering -VMName "${vmName}"
            Write-Host "✓ Resource metrics reset" -ForegroundColor Green
            Write-Host "  Metrics collection restarted from zero" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Failed to manage resource metering: $_"
}`;
    }
  },

  {
    id: 'hyperv-manage-network-adapters',
    title: 'Manage VM Network Adapters',
    description: 'Add, remove, configure virtual NICs with advanced features',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Manages VM network adapters (virtual NICs)
- Supports add, remove, and configure operations
- Enables advanced features like MAC spoofing, DHCP guard, bandwidth limits

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- VM exists on host
- Virtual switch created for adapter connectivity

**What You Need to Provide:**
- VM name
- Action (Add, Remove, Configure, or List)
- Virtual switch name (for Add operation)
- Optional: Advanced settings (MAC spoofing, VLAN, bandwidth)

**What the Script Does:**
1. Performs specified network adapter operation
2. For Add: creates new virtual NIC
3. For Remove: deletes virtual NIC
4. For Configure: sets advanced properties
5. For List: displays all adapters
6. Reports operation success

**Important Notes:**
- VMs can have multiple network adapters
- Each adapter connects to a virtual switch
- MAC address spoofing required for nested virtualization
- DHCP guard prevents rogue DHCP servers
- Bandwidth limits prevent VM network saturation
- VLAN tagging enables network segmentation
- Remove adapter only when VM is stopped
- Test network connectivity after changes`,
    parameters: [
      {
        name: 'vmName',
        label: 'VM Name',
        type: 'text',
        required: true,
        placeholder: 'VM-WEB01',
        helpText: 'Target virtual machine'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Add', label: 'Add Network Adapter' },
          { value: 'Remove', label: 'Remove Network Adapter' },
          { value: 'Configure', label: 'Configure Adapter' },
          { value: 'List', label: 'List Adapters' }
        ],
        helpText: 'Network adapter operation'
      },
      {
        name: 'switchName',
        label: 'Virtual Switch Name',
        type: 'text',
        required: false,
        placeholder: 'vSwitch-External',
        helpText: 'Required for Add operation'
      },
      {
        name: 'enableMacSpoofing',
        label: 'Enable MAC Spoofing',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Allow MAC address changes (for nested virtualization)'
      },
      {
        name: 'vlanId',
        label: 'VLAN ID',
        type: 'number',
        required: false,
        placeholder: '100',
        helpText: 'Optional VLAN tag'
      }
    ],
    scriptTemplate: (params) => {
      const vmName = escapePowerShellString(params.vmName);
      const action = params.action;
      const switchName = params.switchName ? escapePowerShellString(params.switchName) : '';
      const macSpoofing = params.enableMacSpoofing;
      const vlanId = params.vlanId;

      return `# Manage VM Network Adapters
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Network adapter operation: ${action}" -ForegroundColor Cyan
    Write-Host "  VM: ${vmName}" -ForegroundColor Gray
    
    switch ("${action}") {
        "Add" {
            ${switchName ? `
            Write-Host "Adding network adapter..." -ForegroundColor Cyan
            Write-Host "  Switch: ${switchName}" -ForegroundColor Gray
            
            Add-VMNetworkAdapter -VMName "${vmName}" -SwitchName "${switchName}"
            
            ${macSpoofing ? `
            Write-Host "Enabling MAC spoofing..." -ForegroundColor Cyan
            Set-VMNetworkAdapter -VMName "${vmName}" -MacAddressSpoofing On
            ` : ''}
            
            ${vlanId ? `
            Write-Host "Configuring VLAN ${vlanId}..." -ForegroundColor Cyan
            Set-VMNetworkAdapterVlan -VMName "${vmName}" -Access -VlanId ${vlanId}
            ` : ''}
            
            Write-Host "✓ Network adapter added successfully" -ForegroundColor Green
            ` : `
            Write-Error "Virtual switch name is required for Add operation"
            exit 1
            `}
        }
        
        "Remove" {
            Write-Host "⚠ VM must be stopped to remove network adapter" -ForegroundColor Yellow
            Write-Host "Removing network adapter..." -ForegroundColor Cyan
            
            $Adapter = Get-VMNetworkAdapter -VMName "${vmName}" | Select-Object -First 1
            if ($Adapter) {
                Remove-VMNetworkAdapter -VMName "${vmName}" -VMNetworkAdapter $Adapter
                Write-Host "✓ Network adapter removed" -ForegroundColor Green
            } else {
                Write-Host "No network adapters found" -ForegroundColor Yellow
            }
        }
        
        "Configure" {
            Write-Host "Configuring network adapter..." -ForegroundColor Cyan
            
            ${macSpoofing !== undefined ? `
            Set-VMNetworkAdapter -VMName "${vmName}" -MacAddressSpoofing ${macSpoofing ? 'On' : 'Off'}
            Write-Host "✓ MAC spoofing: ${macSpoofing ? 'Enabled' : 'Disabled'}" -ForegroundColor Green
            ` : ''}
            
            ${vlanId ? `
            Set-VMNetworkAdapterVlan -VMName "${vmName}" -Access -VlanId ${vlanId}
            Write-Host "✓ VLAN ${vlanId} configured" -ForegroundColor Green
            ` : ''}
            
            Write-Host "✓ Network adapter configured" -ForegroundColor Green
        }
        
        "List" {
            Write-Host "Listing network adapters..." -ForegroundColor Cyan
            
            $Adapters = Get-VMNetworkAdapter -VMName "${vmName}"
            
            if ($Adapters) {
                $Adapters | Select-Object Name, SwitchName, MacAddress, Status | Format-Table -AutoSize
                Write-Host "Total adapters: $($Adapters.Count)" -ForegroundColor Gray
            } else {
                Write-Host "No network adapters found" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Error "Failed to manage network adapter: $_"
}`;
    }
  },

  {
    id: 'hyperv-config-host-settings',
    title: 'Configure Hyper-V Host Settings',
    description: 'Memory, storage, NUMA spanning, enhanced session mode',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures Hyper-V host-level settings for optimal performance
- Manages default VM paths, NUMA spanning, and enhanced session mode
- Optimizes host for virtual machine workloads

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Sufficient disk space for VM storage paths

**What You Need to Provide:**
- Virtual machine default path
- Virtual hard disk default path
- Enable/disable NUMA spanning
- Enable/disable enhanced session mode

**What the Script Does:**
1. Sets default VM storage paths
2. Configures NUMA spanning for large VMs
3. Enables enhanced session mode for better VM console experience
4. Applies host-level optimization settings
5. Reports configuration success

**Important Notes:**
- VM and VHD paths should be on high-performance storage
- NUMA spanning improves performance for VMs with many vCPUs
- Enhanced session mode enables clipboard, audio, drive redirection
- Changing paths affects new VMs only (not existing)
- Use dedicated storage volumes for production VMs
- Plan paths with growth in mind
- Enhanced session mode requires Windows 8/Server 2012 R2+ guests
- Test enhanced session mode connectivity after enabling`,
    parameters: [
      {
        name: 'vmPath',
        label: 'Virtual Machine Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\Virtual Machines',
        helpText: 'Default path for VM configuration files'
      },
      {
        name: 'vhdPath',
        label: 'Virtual Hard Disk Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Hyper-V\\Virtual Hard Disks',
        helpText: 'Default path for VHDX files'
      },
      {
        name: 'enableNumaSpanning',
        label: 'Enable NUMA Spanning',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Allow VMs to span NUMA nodes'
      },
      {
        name: 'enableEnhancedSession',
        label: 'Enable Enhanced Session Mode',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Enable clipboard and device redirection'
      }
    ],
    scriptTemplate: (params) => {
      const vmPath = escapePowerShellString(params.vmPath);
      const vhdPath = escapePowerShellString(params.vhdPath);
      const numaSpanning = params.enableNumaSpanning !== false;
      const enhancedSession = params.enableEnhancedSession !== false;

      return `# Configure Hyper-V Host Settings
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring Hyper-V host settings..." -ForegroundColor Cyan
    
    # Create directories if they don't exist
    if (-not (Test-Path "${vmPath}")) {
        New-Item -Path "${vmPath}" -ItemType Directory -Force | Out-Null
        Write-Host "✓ Created VM path: ${vmPath}" -ForegroundColor Green
    }
    
    if (-not (Test-Path "${vhdPath}")) {
        New-Item -Path "${vhdPath}" -ItemType Directory -Force | Out-Null
        Write-Host "✓ Created VHD path: ${vhdPath}" -ForegroundColor Green
    }
    
    # Set default VM paths
    Set-VMHost -VirtualMachinePath "${vmPath}" -VirtualHardDiskPath "${vhdPath}"
    Write-Host "✓ VM paths configured" -ForegroundColor Green
    Write-Host "  VM Path: ${vmPath}" -ForegroundColor Gray
    Write-Host "  VHD Path: ${vhdPath}" -ForegroundColor Gray
    
    # Configure NUMA spanning
    Set-VMHost -NumaSpanningEnabled $${numaSpanning ? 'true' : 'false'}
    Write-Host "✓ NUMA spanning: ${numaSpanning ? 'Enabled' : 'Disabled'}" -ForegroundColor Green
    
    # Configure enhanced session mode
    Set-VMHost -EnableEnhancedSessionMode $${enhancedSession ? 'true' : 'false'}
    Write-Host "✓ Enhanced session mode: ${enhancedSession ? 'Enabled' : 'Disabled'}" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "=== Hyper-V Host Configuration ===" -ForegroundColor Cyan
    Get-VMHost | Select-Object VirtualMachinePath, VirtualHardDiskPath, NumaSpanningEnabled, EnableEnhancedSessionMode | Format-List
    
} catch {
    Write-Error "Failed to configure host settings: $_"
}`;
    }
  },

  {
    id: 'hyperv-export-performance-reports',
    title: 'Export VM Performance Reports',
    description: 'Export VM utilization, resource consumption data',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
- Exports comprehensive VM performance and resource utilization data
- Collects CPU, memory, disk, and network metrics
- Supports capacity planning and performance analysis

**Prerequisites:**
- Hyper-V role installed
- Administrator credentials
- Resource metering enabled on target VMs
- CSV export path accessible

**What You Need to Provide:**
- CSV export file path
- Optional: specific VM names (or all VMs)

**What the Script Does:**
1. Retrieves resource metrics from all VMs
2. Collects CPU time, memory usage, disk I/O, network traffic
3. Calculates averages and totals
4. Exports performance data to CSV
5. Reports collection summary

**Important Notes:**
- Essential for capacity planning and optimization
- Resource metering must be enabled on VMs first
- Metrics include cumulative usage since metering started
- Use for identifying resource-intensive VMs
- Export data regularly for trend analysis
- Useful for chargeback and cost allocation
- Reset metering periodically for accurate reporting
- Analyze data to identify optimization opportunities`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Reports\\VMPerformance.csv',
        helpText: 'Path where the CSV file will be saved'
      },
      {
        name: 'vmNames',
        label: 'VM Names (optional, one per line)',
        type: 'textarea',
        required: false,
        placeholder: 'VM-WEB01\nVM-DB01',
        helpText: 'Leave empty for all VMs'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const vmNamesInput = params.vmNames ? params.vmNames.trim() : '';

      return `# Export VM Performance Reports
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting VM performance metrics..." -ForegroundColor Cyan
    
    ${vmNamesInput ? `
    # Get specific VMs
    $VmNames = @(
${vmNamesInput.split('\n').filter((line: string) => line.trim()).map((name: string) => `        "${escapePowerShellString(name.trim())}"`).join('\n')}
    )
    $VMs = $VmNames | ForEach-Object { Get-VM -Name $_ }
    ` : `
    # Get all VMs
    $VMs = Get-VM
    `}
    
    Write-Host "Found $($VMs.Count) VMs" -ForegroundColor Yellow
    
    $PerformanceReport = foreach ($VM in $VMs) {
        try {
            # Get resource metrics
            $Metrics = Measure-VM -VMName $VM.Name -ErrorAction SilentlyContinue
            
            if ($Metrics) {
                [PSCustomObject]@{
                    VMName                  = $VM.Name
                    State                   = $VM.State
                    CPUHours                = [math]::Round($Metrics.TotalProcessorUsage / 3600000, 2)
                    AverageMemoryMB         = $Metrics.AverageMemoryUsage
                    MaxMemoryMB             = $Metrics.MaximumMemoryUsage
                    MinMemoryMB             = $Metrics.MinimumMemoryUsage
                    DiskReadGB              = [math]::Round($Metrics.TotalDiskRead / 1GB, 2)
                    DiskWriteGB             = [math]::Round($Metrics.TotalDiskWrite / 1GB, 2)
                    NetworkInGB             = [math]::Round($Metrics.TotalNetworkIncoming / 1GB, 2)
                    NetworkOutGB            = [math]::Round($Metrics.TotalNetworkOutgoing / 1GB, 2)
                    MeteringDuration        = $Metrics.MeteringDuration
                    ProcessorCount          = $VM.ProcessorCount
                    MemoryStartupMB         = $VM.MemoryStartup / 1MB
                }
            } else {
                Write-Warning "Resource metering not enabled for: $($VM.Name)"
                [PSCustomObject]@{
                    VMName                  = $VM.Name
                    State                   = $VM.State
                    CPUHours                = "N/A"
                    AverageMemoryMB         = "N/A"
                    MaxMemoryMB             = "N/A"
                    MinMemoryMB             = "N/A"
                    DiskReadGB              = "N/A"
                    DiskWriteGB             = "N/A"
                    NetworkInGB             = "N/A"
                    NetworkOutGB            = "N/A"
                    MeteringDuration        = "Not Enabled"
                    ProcessorCount          = $VM.ProcessorCount
                    MemoryStartupMB         = $VM.MemoryStartup / 1MB
                }
            }
        } catch {
            Write-Warning "Failed to collect metrics for: $($VM.Name)"
        }
    }
    
    # Export to CSV
    $PerformanceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Performance report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    Write-Host "Total VMs: $($PerformanceReport.Count)" -ForegroundColor Gray
    $WithMetering = ($PerformanceReport | Where-Object { $_.MeteringDuration -ne "Not Enabled" }).Count
    Write-Host "VMs with metering: $WithMetering" -ForegroundColor Gray
    
    if ($WithMetering -lt $PerformanceReport.Count) {
        Write-Host ""
        Write-Host "⚠ Enable resource metering on remaining VMs for complete data:" -ForegroundColor Yellow
        Write-Host "  Enable-VMResourceMetering -VMName <VMName>" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to export performance report: $_"
}`;
    }
  }
];

export const hyperVCategories = [
  'Host Configuration',
  'VM Lifecycle',
  'Storage',
  'Checkpoints',
  'Reporting',
  'Common Admin Tasks'
];
