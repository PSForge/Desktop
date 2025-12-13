import { escapePowerShellString, toPowerShellBoolean } from './powershell-utils';

export interface VMwareTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface VMwareTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: VMwareTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const vmwareTasks: VMwareTask[] = [
  // BULK OPERATIONS
  {
    id: 'vmware-bulk-create-vms',
    name: 'Bulk Create VMs from Template',
    category: 'Bulk Operations',
    description: 'Create multiple VMs from a template with automated configuration',
    instructions: `**Prerequisites:** VMware.PowerCLI module, vCenter credentials, VM template available

**What it does:** Clones VMs from template, configures network, applies customization`,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true, placeholder: 'vcenter.company.com' },
      { id: 'template', label: 'VM Template Name', type: 'text', required: true, placeholder: 'Windows2022-Template' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Server01, Server02, Server03' },
      { id: 'datastore', label: 'Datastore', type: 'text', required: true, placeholder: 'Datastore01' },
      { id: 'cluster', label: 'Cluster/Host', type: 'text', required: true, placeholder: 'Prod-Cluster' },
      { id: 'powerOn', label: 'Power On After Creation', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const template = escapePowerShellString(params.template);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const datastore = escapePowerShellString(params.datastore);
      const cluster = escapePowerShellString(params.cluster);
      const powerOn = toPowerShellBoolean(params.powerOn);
      
      return `# Bulk Create VMs from Template
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    # Connect to vCenter
    Write-Host "Connecting to vCenter: ${vcenter}..." -ForegroundColor Cyan
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    # Get template and target resources
    $Template = Get-Template -Name "${template}"
    $Datastore = Get-Datastore -Name "${datastore}"
    $Location = Get-Cluster -Name "${cluster}"
    
    # VM names to create
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        Write-Host "Creating VM: $VMName..." -ForegroundColor Yellow
        
        $NewVM = New-VM \`
            -Name $VMName \`
            -Template $Template \`
            -Datastore $Datastore \`
            -Location $Location \`
            -ErrorAction Stop
        
        Write-Host "[SUCCESS] VM $VMName created successfully" -ForegroundColor Green
        
        if (${powerOn}) {
            Start-VM -VM $NewVM -Confirm:$false
            Write-Host "[SUCCESS] VM $VMName powered on" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Bulk VM creation completed! Created $($VMNames.Count) VMs." -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create VMs: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-bulk-snapshot',
    name: 'Bulk Create/Remove Snapshots',
    category: 'Bulk Operations',
    description: 'Create or remove snapshots for multiple VMs',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true, placeholder: 'vcenter.company.com' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true, placeholder: 'VM01, VM02' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Remove'], defaultValue: 'Create' },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: true, placeholder: 'Pre-Patch-Snapshot' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Before monthly patching' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      const snapshotName = escapePowerShellString(params.snapshotName);
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# Bulk Snapshot ${action}
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        $VM = Get-VM -Name $VMName -ErrorAction Stop
        
${action === 'Create' ? `        Write-Host "Creating snapshot for: $VMName..." -ForegroundColor Yellow
        New-Snapshot -VM $VM -Name "${snapshotName}"${description ? ` -Description "${description}"` : ''} -Confirm:$false
        Write-Host "[SUCCESS] Snapshot created for $VMName" -ForegroundColor Green` : `        Write-Host "Removing snapshot from: $VMName..." -ForegroundColor Yellow
        $Snapshot = Get-Snapshot -VM $VM -Name "${snapshotName}" -ErrorAction SilentlyContinue
        if ($Snapshot) {
            Remove-Snapshot -Snapshot $Snapshot -Confirm:$false
            Write-Host "[SUCCESS] Snapshot removed from $VMName" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Snapshot not found on $VMName" -ForegroundColor Yellow
        }`}
    }
    
    Write-Host ""
    Write-Host "Bulk snapshot operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-bulk-move-vms',
    name: 'Bulk Move VMs Between Datastores',
    category: 'Bulk Operations',
    description: 'Migrate VMs to different datastore or cluster',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true, placeholder: 'vcenter.company.com' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'targetDatastore', label: 'Target Datastore', type: 'text', required: true },
      { id: 'storageFormat', label: 'Storage Format', type: 'select', required: true, options: ['Thin', 'Thick', 'EagerZeroedThick'], defaultValue: 'Thin' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const targetDatastore = escapePowerShellString(params.targetDatastore);
      const storageFormat = params.storageFormat;
      
      return `# Bulk Move VMs to Different Datastore
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $TargetDS = Get-Datastore -Name "${targetDatastore}"
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        Write-Host "Migrating $VMName to ${targetDatastore}..." -ForegroundColor Yellow
        
        $VM = Get-VM -Name $VMName
        Move-VM -VM $VM -Datastore $TargetDS -DiskStorageFormat ${storageFormat} -Confirm:$false
        
        Write-Host "[SUCCESS] $VMName migrated successfully" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "All VMs migrated to ${targetDatastore}" -ForegroundColor Green
    
} catch {
    Write-Error "Migration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  // COMMON ADMIN TASKS
  {
    id: 'vmware-create-vm',
    name: 'Create New VM',
    category: 'VM Management',
    description: 'Create a new virtual machine with custom configuration',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'NewServer01' },
      { id: 'datastore', label: 'Datastore', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster', type: 'text', required: true },
      { id: 'numCPU', label: 'Number of vCPUs', type: 'number', required: true, defaultValue: 2 },
      { id: 'memoryGB', label: 'Memory (GB)', type: 'number', required: true, defaultValue: 4 },
      { id: 'diskGB', label: 'Disk Size (GB)', type: 'number', required: true, defaultValue: 60 },
      { id: 'guestOS', label: 'Guest OS', type: 'select', required: true, options: ['windows9Server64Guest', 'rhel8_64Guest', 'ubuntu64Guest'], defaultValue: 'windows9Server64Guest' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const datastore = escapePowerShellString(params.datastore);
      const cluster = escapePowerShellString(params.cluster);
      
      return `# Create New VM
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-Cluster -Name "${cluster}" | Get-VMHost | Select-Object -First 1
    $Datastore = Get-Datastore -Name "${datastore}"
    
    $NewVM = New-VM \`
        -Name "${vmName}" \`
        -VMHost $VMHost \`
        -Datastore $Datastore \`
        -NumCpu ${params.numCPU} \`
        -MemoryGB ${params.memoryGB} \`
        -DiskGB ${params.diskGB} \`
        -GuestId ${params.guestOS} \`
        -ErrorAction Stop
    
    Write-Host "[SUCCESS] VM '${vmName}' created successfully!" -ForegroundColor Green
    Write-Host "  CPU: ${params.numCPU} vCPUs" -ForegroundColor Cyan
    Write-Host "  Memory: ${params.memoryGB} GB" -ForegroundColor Cyan
    Write-Host "  Disk: ${params.diskGB} GB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create VM: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-power-control',
    name: 'VM Power Control',
    category: 'VM Management',
    description: 'Power on, power off, or restart VMs',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'action', label: 'Power Action', type: 'select', required: true, options: ['PowerOn', 'PowerOff', 'Restart'], defaultValue: 'PowerOn' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      
      return `# VM Power Control
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        $VM = Get-VM -Name $VMName -ErrorAction Stop
        
${action === 'PowerOn' ? `        Start-VM -VM $VM -Confirm:$false
        Write-Host "[SUCCESS] $VMName powered on" -ForegroundColor Green` : 
action === 'PowerOff' ? `        Stop-VM -VM $VM -Confirm:$false
        Write-Host "[SUCCESS] $VMName powered off" -ForegroundColor Green` :
`        Restart-VM -VM $VM -Confirm:$false
        Write-Host "[SUCCESS] $VMName restarted" -ForegroundColor Green`}
    }
    
    Write-Host ""
    Write-Host "Power operation completed for all VMs" -ForegroundColor Green
    
} catch {
    Write-Error "Power control failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-export-inventory',
    name: 'Export VM Inventory Report',
    category: 'Reporting',
    description: 'Generate detailed inventory report of all VMs',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\VM-Inventory.csv' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export VM Inventory Report
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    Write-Host "Collecting VM inventory..." -ForegroundColor Cyan
    
    $Report = Get-VM | Select-Object \`
        Name,
        PowerState,
        NumCpu,
        MemoryGB,
        @{N='ProvisionedSpaceGB';E={[math]::Round($_.ProvisionedSpaceGB,2)}},
        @{N='UsedSpaceGB';E={[math]::Round($_.UsedSpaceGB,2)}},
        @{N='Datastore';E={($_ | Get-Datastore).Name -join ','}},
        @{N='Cluster';E={($_ | Get-Cluster).Name}},
        @{N='Host';E={$_.VMHost.Name}},
        @{N='GuestOS';E={$_.Guest.OSFullName}},
        @{N='IPAddress';E={$_.Guest.IPAddress -join ','}},
        @{N='ToolsVersion';E={$_.Guest.ToolsVersion}},
        @{N='ToolsStatus';E={$_.Guest.ToolsStatus}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Inventory exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total VMs: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-configure-resource-pool',
    name: 'Configure Resource Pool',
    category: 'Resource Management',
    description: 'Create and configure resource pools for workload isolation',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'poolName', label: 'Resource Pool Name', type: 'text', required: true, placeholder: 'Production-Pool' },
      { id: 'cpuShares', label: 'CPU Shares', type: 'select', required: true, options: ['Low', 'Normal', 'High'], defaultValue: 'Normal' },
      { id: 'memoryShares', label: 'Memory Shares', type: 'select', required: true, options: ['Low', 'Normal', 'High'], defaultValue: 'Normal' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const poolName = escapePowerShellString(params.poolName);
      
      return `# Configure Resource Pool
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    
    $ResourcePool = New-ResourcePool \`
        -Location $Cluster \`
        -Name "${poolName}" \`
        -CpuSharesLevel ${params.cpuShares} \`
        -MemSharesLevel ${params.memoryShares}
    
    Write-Host "[SUCCESS] Resource pool '${poolName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create resource pool: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-manage-datastores',
    name: 'Manage Datastores',
    category: 'Storage Management',
    description: 'Mount, unmount, or expand datastores',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'datastore', label: 'Datastore Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Mount', 'Unmount', 'GetInfo'], defaultValue: 'GetInfo' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const datastore = escapePowerShellString(params.datastore);
      const action = params.action;
      
      return `# Manage Datastores
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DS = Get-Datastore -Name "${datastore}"
    
${action === 'Mount' ? `    $VMHosts = Get-VMHost
    foreach ($VMHost in $VMHosts) {
        Mount-Datastore -Datastore $DS -VMHost $VMHost
    }
    Write-Host "[SUCCESS] Datastore mounted on all hosts" -ForegroundColor Green` :
action === 'Unmount' ? `    $VMHosts = Get-VMHost
    foreach ($VMHost in $VMHosts) {
        Unmount-Datastore -Datastore $DS -VMHost $VMHost -Confirm:$false
    }
    Write-Host "[SUCCESS] Datastore unmounted from all hosts" -ForegroundColor Green` :
`    Write-Host "Datastore Information:" -ForegroundColor Cyan
    Write-Host "  Name: $($DS.Name)"
    Write-Host "  Capacity: $([math]::Round($DS.CapacityGB,2)) GB"
    Write-Host "  Free Space: $([math]::Round($DS.FreeSpaceGB,2)) GB"
    Write-Host "  Type: $($DS.Type)"
    Write-Host "  State: $($DS.State)"
    Write-Host "  Number of VMs: $(($DS | Get-VM).Count)"`}
    
} catch {
    Write-Error "Datastore operation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-create-template',
    name: 'Create VM Template from Existing VM',
    category: 'Common Admin Tasks',
    description: 'Convert an existing VM into a reusable template',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true, placeholder: 'vcenter.company.com' },
      { id: 'vmName', label: 'Source VM Name', type: 'text', required: true, placeholder: 'BaseVM-Windows2022' },
      { id: 'templateName', label: 'Template Name', type: 'text', required: true, placeholder: 'Template-Windows2022' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const templateName = escapePowerShellString(params.templateName);
      
      return `# Create VM Template from Existing VM
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    
    # Ensure VM is powered off
    if ($VM.PowerState -ne 'PoweredOff') {
        Write-Host "Shutting down VM..." -ForegroundColor Yellow
        Stop-VM -VM $VM -Confirm:$false
        Start-Sleep -Seconds 10
    }
    
    # Convert to template
    Set-VM -VM $VM -ToTemplate -Name "${templateName}" -Confirm:$false
    
    Write-Host "[SUCCESS] Template '${templateName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create template: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-create-linked-clones',
    name: 'Create Linked Clones from Template',
    category: 'Common Admin Tasks',
    description: 'Create space-efficient linked clone VMs from a template',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'template', label: 'Template Name', type: 'text', required: true, placeholder: 'Windows10-Template' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true, placeholder: 'Clone01, Clone02' },
      { id: 'datastore', label: 'Datastore', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const template = escapePowerShellString(params.template);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const datastore = escapePowerShellString(params.datastore);
      const cluster = escapePowerShellString(params.cluster);
      
      return `# Create Linked Clones from Template
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Template = Get-Template -Name "${template}"
    $Datastore = Get-Datastore -Name "${datastore}"
    $Cluster = Get-Cluster -Name "${cluster}"
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        Write-Host "Creating linked clone: $VMName..." -ForegroundColor Yellow
        
        # Create snapshot on template for linked clones
        $Snapshot = Get-Snapshot -VM $Template | Select-Object -First 1
        if (-not $Snapshot) {
            $Snapshot = New-Snapshot -VM $Template -Name "Base-Snapshot"
        }
        
        # Create linked clone
        New-VM -Name $VMName \`
            -Template $Template \`
            -LinkedClone \`
            -ReferenceSnapshot $Snapshot \`
            -Datastore $Datastore \`
            -ResourcePool ($Cluster | Get-ResourcePool | Select-Object -First 1) \`
            -ErrorAction Stop
        
        Write-Host "[SUCCESS] Linked clone $VMName created" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "All linked clones created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create linked clones: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-manage-snapshots',
    name: 'Manage VM Snapshots (Revert, Consolidate)',
    category: 'Common Admin Tasks',
    description: 'Revert to snapshot or consolidate snapshot files',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Revert', 'Consolidate'], defaultValue: 'Revert' },
      { id: 'snapshotName', label: 'Snapshot Name (for Revert)', type: 'text', required: false, placeholder: 'Pre-Patch-Snapshot' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const action = params.action;
      const snapshotName = params.snapshotName ? escapePowerShellString(params.snapshotName) : '';
      
      return `# Manage VM Snapshots
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    
${action === 'Revert' ? `    if ("${snapshotName}") {
        $Snapshot = Get-Snapshot -VM $VM -Name "${snapshotName}"
    } else {
        # Get most recent snapshot
        $Snapshot = Get-Snapshot -VM $VM | Sort-Object Created -Descending | Select-Object -First 1
    }
    
    if ($Snapshot) {
        Set-VM -VM $VM -Snapshot $Snapshot -Confirm:$false
        Write-Host "[SUCCESS] VM reverted to snapshot: $($Snapshot.Name)" -ForegroundColor Green
    } else {
        Write-Error "No snapshot found"
    }` : `    # Consolidate all snapshots
    $VM | Remove-Snapshot -Confirm:$false
    Write-Host "[SUCCESS] Snapshots consolidated for ${vmName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Snapshot operation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-configure-vswitches',
    name: 'Configure vSwitches and Distributed Port Groups',
    category: 'Common Admin Tasks',
    description: 'Create and configure virtual switches and port groups',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmHost', label: 'ESXi Host', type: 'text', required: true, placeholder: 'esxi01.company.com' },
      { id: 'vSwitchName', label: 'vSwitch Name', type: 'text', required: true, placeholder: 'vSwitch1' },
      { id: 'portGroupName', label: 'Port Group Name', type: 'text', required: true, placeholder: 'Production-Network' },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: true, defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmHost = escapePowerShellString(params.vmHost);
      const vSwitchName = escapePowerShellString(params.vSwitchName);
      const portGroupName = escapePowerShellString(params.portGroupName);
      
      return `# Configure vSwitches and Port Groups
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${vmHost}"
    
    # Check if vSwitch exists, create if not
    $vSwitch = Get-VirtualSwitch -VMHost $VMHost -Name "${vSwitchName}" -ErrorAction SilentlyContinue
    if (-not $vSwitch) {
        $vSwitch = New-VirtualSwitch -VMHost $VMHost -Name "${vSwitchName}"
        Write-Host "[SUCCESS] vSwitch '${vSwitchName}' created" -ForegroundColor Green
    }
    
    # Create port group
    New-VirtualPortGroup -VirtualSwitch $vSwitch -Name "${portGroupName}" -VLanId ${params.vlanId}
    
    Write-Host "[SUCCESS] Port group '${portGroupName}' created with VLAN ${params.vlanId}" -ForegroundColor Green
    
} catch {
    Write-Error "Configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-manage-vcenter-roles',
    name: 'Manage vCenter Roles and Permissions',
    category: 'Common Admin Tasks',
    description: 'Create roles and assign permissions to users',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['CreateRole', 'AssignPermission', 'RemovePermission'], defaultValue: 'CreateRole' },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'VM-Operator' },
      { id: 'userName', label: 'User/Group Name', type: 'text', required: false, placeholder: 'domain\\user' },
      { id: 'entityName', label: 'Entity Name (VM/Folder)', type: 'text', required: false, placeholder: 'Production-VMs' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const action = params.action;
      const roleName = escapePowerShellString(params.roleName);
      const userName = params.userName ? escapePowerShellString(params.userName) : '';
      const entityName = params.entityName ? escapePowerShellString(params.entityName) : '';
      
      return `# Manage vCenter Roles and Permissions
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
${action === 'CreateRole' ? `    # Create new role with basic VM privileges
    New-VIRole -Name "${roleName}" -Privilege (
        Get-VIPrivilege -Name "Virtual machine.Interaction.Power On",
        Get-VIPrivilege -Name "Virtual machine.Interaction.Power Off",
        Get-VIPrivilege -Name "Virtual machine.Interaction.Reset"
    )
    Write-Host "[SUCCESS] Role '${roleName}' created" -ForegroundColor Green` :
action === 'AssignPermission' ? `    $Role = Get-VIRole -Name "${roleName}"
    $Entity = Get-Folder -Name "${entityName}" -ErrorAction SilentlyContinue
    if (-not $Entity) {
        $Entity = Get-VM -Name "${entityName}" -ErrorAction SilentlyContinue
    }
    
    if ($Entity) {
        New-VIPermission -Entity $Entity -Principal "${userName}" -Role $Role
        Write-Host "[SUCCESS] Permission assigned to ${userName}" -ForegroundColor Green
    } else {
        Write-Error "Entity ${entityName} not found"
    }` :
`    $Permission = Get-VIPermission -Entity (Get-Folder -Name "${entityName}") -Principal "${userName}"
    Remove-VIPermission -Permission $Permission -Confirm:$false
    Write-Host "[SUCCESS] Permission removed from ${userName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Operation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },
  {
    id: 'vmware-monitor-host-health',
    name: 'Monitor Host Health and Performance Metrics',
    category: 'Common Admin Tasks',
    description: 'Check ESXi host health status and performance',
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmHost', label: 'ESXi Host (optional - blank for all)', type: 'text', required: false, placeholder: 'esxi01.company.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Host-Health.csv' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmHost = params.vmHost ? escapePowerShellString(params.vmHost) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Monitor Host Health and Performance
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    ${vmHost ? `$VMHosts = Get-VMHost -Name "${vmHost}"` : `$VMHosts = Get-VMHost`}
    
    $HealthReport = $VMHosts | ForEach-Object {
        $VMHost = $_
        $Stats = Get-Stat -Entity $VMHost -Stat "cpu.usage.average","mem.usage.average" -Realtime -MaxSamples 1
        
        [PSCustomObject]@{
            HostName = $VMHost.Name
            ConnectionState = $VMHost.ConnectionState
            PowerState = $VMHost.PowerState
            Version = $VMHost.Version
            CPUUsagePercent = [math]::Round(($Stats | Where-Object { $_.MetricId -eq "cpu.usage.average" }).Value, 2)
            MemoryUsagePercent = [math]::Round(($Stats | Where-Object { $_.MetricId -eq "mem.usage.average" }).Value, 2)
            MemoryTotalGB = [math]::Round($VMHost.MemoryTotalGB, 2)
            CPUTotalMhz = $VMHost.CpuTotalMhz
            NumCPU = $VMHost.NumCpu
            VMCount = ($VMHost | Get-VM).Count
        }
    }
    
    $HealthReport | Format-Table -AutoSize
    
    ${exportPath ? `$HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
    Write-Host ""
    Write-Host "Health check completed for $($HealthReport.Count) host(s)" -ForegroundColor Green
    
} catch {
    Write-Error "Health check failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  },

  {
    id: 'vmware-configure-vmotion',
    name: 'Configure vMotion and Storage vMotion',
    category: 'Common Admin Tasks',
    description: 'Migrate VMs across hosts and datastores',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'migrationType', label: 'Migration Type', type: 'select', required: true, options: ['vMotion', 'Storage vMotion', 'Both'], defaultValue: 'vMotion' },
      { id: 'targetHost', label: 'Target Host (for vMotion)', type: 'text', required: false, placeholder: 'esxi-host02.company.com' },
      { id: 'targetDatastore', label: 'Target Datastore (for Storage vMotion)', type: 'text', required: false, placeholder: 'Datastore02' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const migrationType = params.migrationType;
      const targetHost = params.targetHost ? escapePowerShellString(params.targetHost) : '';
      const targetDatastore = params.targetDatastore ? escapePowerShellString(params.targetDatastore) : '';
      
      return `# Configure vMotion and Storage vMotion
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    
    ${migrationType === 'vMotion' ? `
    $TargetHost = Get-VMHost -Name "${targetHost}"
    Move-VM -VM $VM -Destination $TargetHost
    Write-Host "[SUCCESS] VM migrated to host: ${targetHost}" -ForegroundColor Green
    ` : migrationType === 'Storage vMotion' ? `
    $TargetDatastore = Get-Datastore -Name "${targetDatastore}"
    Move-VM -VM $VM -Datastore $TargetDatastore
    Write-Host "[SUCCESS] VM storage migrated to: ${targetDatastore}" -ForegroundColor Green
    ` : `
    $TargetHost = Get-VMHost -Name "${targetHost}"
    $TargetDatastore = Get-Datastore -Name "${targetDatastore}"
    Move-VM -VM $VM -Destination $TargetHost -Datastore $TargetDatastore
    Write-Host "[SUCCESS] VM and storage migrated successfully" -ForegroundColor Green
    `}
    
} catch {
    Write-Error "Migration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  {
    id: 'vmware-manage-tags',
    name: 'Manage vSphere Tags and Categories',
    category: 'Common Admin Tasks',
    description: 'Create tags for organization and automation',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['CreateCategory', 'CreateTag', 'AssignTag'], defaultValue: 'CreateCategory' },
      { id: 'categoryName', label: 'Category Name', type: 'text', required: false, placeholder: 'Environment' },
      { id: 'tagName', label: 'Tag Name', type: 'text', required: false, placeholder: 'Production' },
      { id: 'vmName', label: 'VM Name (for AssignTag)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const action = params.action;
      const categoryName = params.categoryName ? escapePowerShellString(params.categoryName) : '';
      const tagName = params.tagName ? escapePowerShellString(params.tagName) : '';
      const vmName = params.vmName ? escapePowerShellString(params.vmName) : '';
      
      return `# Manage vSphere Tags and Categories
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    ${action === 'CreateCategory' ? `
    New-TagCategory -Name "${categoryName}" -Cardinality "Single" -EntityType "VirtualMachine"
    Write-Host "[SUCCESS] Tag category created: ${categoryName}" -ForegroundColor Green
    ` : action === 'CreateTag' ? `
    $Category = Get-TagCategory -Name "${categoryName}"
    New-Tag -Name "${tagName}" -Category $Category
    Write-Host "[SUCCESS] Tag created: ${tagName}" -ForegroundColor Green
    ` : `
    $Tag = Get-Tag -Name "${tagName}"
    $VM = Get-VM -Name "${vmName}"
    New-TagAssignment -Entity $VM -Tag $Tag
    Write-Host "[SUCCESS] Tag '${tagName}' assigned to VM: ${vmName}" -ForegroundColor Green
    `}
    
} catch {
    Write-Error "Tag operation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  {
    id: 'vmware-configure-drs',
    name: 'Configure DRS (Distributed Resource Scheduler)',
    category: 'Common Admin Tasks',
    description: 'Enable DRS and set automation levels',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'automationLevel', label: 'Automation Level', type: 'select', required: true, options: ['Manual', 'PartiallyAutomated', 'FullyAutomated'], defaultValue: 'FullyAutomated' },
      { id: 'migrationThreshold', label: 'Migration Threshold (1-5)', type: 'number', required: true, defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const automationLevel = params.automationLevel;
      
      return `# Configure DRS (Distributed Resource Scheduler)
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    
    Set-Cluster -Cluster $Cluster \`
        -DrsEnabled:$true \`
        -DrsAutomationLevel "${automationLevel}" \`
        -DrsMigrationThreshold ${params.migrationThreshold} \`
        -Confirm:$false
    
    Write-Host "[SUCCESS] DRS configured successfully" -ForegroundColor Green
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
    Write-Host "  Automation Level: ${automationLevel}" -ForegroundColor Cyan
    Write-Host "  Migration Threshold: ${params.migrationThreshold}" -ForegroundColor Cyan
    
} catch {
    Write-Error "DRS configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  {
    id: 'vmware-manage-esxi-networking',
    name: 'Manage ESXi Host Networking',
    category: 'Common Admin Tasks',
    description: 'Configure vmkernel adapters and vMotion networks',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmHost', label: 'ESXi Host', type: 'text', required: true },
      { id: 'portGroup', label: 'Port Group Name', type: 'text', required: true, placeholder: 'vMotion-Network' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'subnetMask', label: 'Subnet Mask', type: 'text', required: true, placeholder: '255.255.255.0' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmHost = escapePowerShellString(params.vmHost);
      const portGroup = escapePowerShellString(params.portGroup);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const subnetMask = escapePowerShellString(params.subnetMask);
      
      return `# Manage ESXi Host Networking
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${vmHost}"
    
    # Create vmkernel adapter
    New-VMHostNetworkAdapter \`
        -VMHost $VMHost \`
        -PortGroup "${portGroup}" \`
        -VirtualSwitch (Get-VirtualSwitch -VMHost $VMHost | Select-Object -First 1) \`
        -IP "${ipAddress}" \`
        -SubnetMask "${subnetMask}" \`
        -VMotionEnabled:$true
    
    Write-Host "[SUCCESS] vmkernel adapter configured" -ForegroundColor Green
    Write-Host "  Host: ${vmHost}" -ForegroundColor Cyan
    Write-Host "  IP: ${ipAddress}" -ForegroundColor Cyan
    Write-Host "  Port Group: ${portGroup}" -ForegroundColor Cyan
    Write-Host "  vMotion: Enabled" -ForegroundColor Cyan
    
} catch {
    Write-Error "Networking configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  {
    id: 'vmware-configure-vsphere-ha',
    name: 'Configure vSphere HA (High Availability)',
    category: 'Common Admin Tasks',
    description: 'Enable HA and configure admission control',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'admissionControl', label: 'Admission Control', type: 'select', required: true, options: ['Enabled', 'Disabled'], defaultValue: 'Enabled' },
      { id: 'failoverLevel', label: 'Host Failures Cluster Tolerates', type: 'number', required: true, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const admissionControl = params.admissionControl === 'Enabled';
      
      return `# Configure vSphere HA (High Availability)
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    
    Set-Cluster -Cluster $Cluster \`
        -HAEnabled:$true \`
        -HAAdmissionControlEnabled:${admissionControl} \`
        -HAFailoverLevel ${params.failoverLevel} \`
        -Confirm:$false
    
    Write-Host "[SUCCESS] vSphere HA configured successfully" -ForegroundColor Green
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
    Write-Host "  Admission Control: ${params.admissionControl}" -ForegroundColor Cyan
    Write-Host "  Failover Level: ${params.failoverLevel}" -ForegroundColor Cyan
    
} catch {
    Write-Error "HA configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  {
    id: 'vmware-generate-capacity-reports',
    name: 'Generate vCenter Capacity Reports',
    category: 'Common Admin Tasks',
    description: 'Export resource utilization and capacity planning data',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\vCenter-Capacity.csv' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate vCenter Capacity Reports
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Clusters = Get-Cluster
    
    $CapacityReport = $Clusters | ForEach-Object {
        $Cluster = $_
        $Hosts = $Cluster | Get-VMHost
        $VMs = $Cluster | Get-VM
        
        [PSCustomObject]@{
            Cluster = $Cluster.Name
            TotalHosts = $Hosts.Count
            TotalVMs = $VMs.Count
            TotalCPU_GHz = [math]::Round(($Hosts | Measure-Object -Property CpuTotalMhz -Sum).Sum / 1000, 2)
            UsedCPU_GHz = [math]::Round(($Hosts | Measure-Object -Property CpuUsageMhz -Sum).Sum / 1000, 2)
            TotalMemory_GB = [math]::Round(($Hosts | Measure-Object -Property MemoryTotalGB -Sum).Sum, 2)
            UsedMemory_GB = [math]::Round(($Hosts | Measure-Object -Property MemoryUsageGB -Sum).Sum, 2)
            CPUUsage_Percent = [math]::Round((($Hosts | Measure-Object -Property CpuUsageMhz -Sum).Sum / ($Hosts | Measure-Object -Property CpuTotalMhz -Sum).Sum) * 100, 2)
            MemoryUsage_Percent = [math]::Round((($Hosts | Measure-Object -Property MemoryUsageGB -Sum).Sum / ($Hosts | Measure-Object -Property MemoryTotalGB -Sum).Sum) * 100, 2)
        }
    }
    
    $CapacityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Capacity report exported to: ${exportPath}" -ForegroundColor Green
    
    $CapacityReport | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // HOST MANAGEMENT TASKS
  {
    id: 'vmware-host-maintenance-mode',
    name: 'Enter/Exit Host Maintenance Mode',
    category: 'Host Management',
    description: 'Put ESXi host into maintenance mode or exit maintenance mode',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true, placeholder: 'vcenter.company.com' },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true, placeholder: 'esxi01.company.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enter', 'Exit'], defaultValue: 'Enter' },
      { id: 'evacuateVMs', label: 'Evacuate Powered On VMs', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const action = params.action;
      const evacuateVMs = toPowerShellBoolean(params.evacuateVMs);
      
      return `# Enter/Exit Host Maintenance Mode
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}" -ErrorAction Stop
    
${action === 'Enter' ? `    Write-Host "Entering maintenance mode for: ${hostName}..." -ForegroundColor Yellow
    Set-VMHost -VMHost $VMHost -State Maintenance -Evacuate:${evacuateVMs} -Confirm:$false
    Write-Host "[SUCCESS] Host ${hostName} is now in maintenance mode" -ForegroundColor Green` :
`    Write-Host "Exiting maintenance mode for: ${hostName}..." -ForegroundColor Yellow
    Set-VMHost -VMHost $VMHost -State Connected -Confirm:$false
    Write-Host "[SUCCESS] Host ${hostName} has exited maintenance mode" -ForegroundColor Green`}
    
} catch {
    Write-Error "Maintenance mode operation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-services-management',
    name: 'Manage ESXi Host Services',
    category: 'Host Management',
    description: 'Start, stop, or restart ESXi services like SSH, NTP, SNMP',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'serviceName', label: 'Service Name', type: 'select', required: true, options: ['TSM-SSH', 'ntpd', 'snmpd', 'vpxa', 'hostd'], defaultValue: 'TSM-SSH' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Start', 'Stop', 'Restart'], defaultValue: 'Start' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const serviceName = escapePowerShellString(params.serviceName);
      const action = params.action;
      
      return `# Manage ESXi Host Services
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    $Service = Get-VMHostService -VMHost $VMHost | Where-Object { $_.Key -eq "${serviceName}" }
    
    if (-not $Service) {
        throw "Service '${serviceName}' not found on host ${hostName}"
    }
    
${action === 'Start' ? `    Start-VMHostService -HostService $Service -Confirm:$false
    Write-Host "[SUCCESS] Service '${serviceName}' started on ${hostName}" -ForegroundColor Green` :
action === 'Stop' ? `    Stop-VMHostService -HostService $Service -Confirm:$false
    Write-Host "[SUCCESS] Service '${serviceName}' stopped on ${hostName}" -ForegroundColor Green` :
`    Restart-VMHostService -HostService $Service -Confirm:$false
    Write-Host "[SUCCESS] Service '${serviceName}' restarted on ${hostName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Service management failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-ntp-configuration',
    name: 'Configure ESXi Host NTP Settings',
    category: 'Host Management',
    description: 'Configure NTP servers and time synchronization on ESXi hosts',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'ntpServers', label: 'NTP Servers (comma-separated)', type: 'text', required: true, placeholder: '0.pool.ntp.org, 1.pool.ntp.org' },
      { id: 'startService', label: 'Start NTP Service', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const ntpServersRaw = (params.ntpServers as string).split(',').map((n: string) => n.trim());
      const startService = toPowerShellBoolean(params.startService);
      
      return `# Configure ESXi Host NTP Settings
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    $NTPServers = @(${ntpServersRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    # Remove existing NTP servers
    $CurrentNTP = Get-VMHostNtpServer -VMHost $VMHost
    if ($CurrentNTP) {
        Remove-VMHostNtpServer -VMHost $VMHost -NtpServer $CurrentNTP -Confirm:$false
    }
    
    # Add new NTP servers
    foreach ($NTPServer in $NTPServers) {
        Add-VMHostNtpServer -VMHost $VMHost -NtpServer $NTPServer
        Write-Host "  Added NTP server: $NTPServer" -ForegroundColor Cyan
    }
    
    if (${startService}) {
        $NTPService = Get-VMHostService -VMHost $VMHost | Where-Object { $_.Key -eq 'ntpd' }
        Set-VMHostService -HostService $NTPService -Policy On
        Start-VMHostService -HostService $NTPService -Confirm:$false
        Write-Host "[SUCCESS] NTP service started and set to start with host" -ForegroundColor Green
    }
    
    Write-Host "[SUCCESS] NTP configuration completed for ${hostName}" -ForegroundColor Green
    
} catch {
    Write-Error "NTP configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-syslog-configuration',
    name: 'Configure ESXi Host Syslog',
    category: 'Host Management',
    description: 'Configure remote syslog server for ESXi host logging',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'syslogServer', label: 'Syslog Server', type: 'text', required: true, placeholder: 'udp://syslog.company.com:514' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const syslogServer = escapePowerShellString(params.syslogServer);
      
      return `# Configure ESXi Host Syslog
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    
    # Configure syslog server
    Set-VMHostSysLogServer -VMHost $VMHost -SysLogServer "${syslogServer}"
    
    # Reload syslog to apply changes
    $esxcli = Get-EsxCli -VMHost $VMHost -V2
    $esxcli.system.syslog.reload.Invoke()
    
    Write-Host "[SUCCESS] Syslog configured for ${hostName}" -ForegroundColor Green
    Write-Host "  Syslog Server: ${syslogServer}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Syslog configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-profile-apply',
    name: 'Apply Host Profile to ESXi Hosts',
    category: 'Host Management',
    description: 'Apply a host profile to one or more ESXi hosts for consistent configuration',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostProfile', label: 'Host Profile Name', type: 'text', required: true, placeholder: 'Standard-ESXi-Profile' },
      { id: 'hostNames', label: 'ESXi Host Names (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostProfile = escapePowerShellString(params.hostProfile);
      const hostNamesRaw = (params.hostNames as string).split(',').map((n: string) => n.trim());
      
      return `# Apply Host Profile to ESXi Hosts
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Profile = Get-VMHostProfile -Name "${hostProfile}" -ErrorAction Stop
    $HostNames = @(${hostNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($HostName in $HostNames) {
        Write-Host "Applying profile to: $HostName..." -ForegroundColor Yellow
        
        $VMHost = Get-VMHost -Name $HostName
        
        # Attach the host profile
        Apply-VMHostProfile -Profile $Profile -Entity $VMHost -Confirm:$false
        
        Write-Host "[SUCCESS] Host profile applied to $HostName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Host profile '${hostProfile}' applied to all specified hosts" -ForegroundColor Green
    
} catch {
    Write-Error "Host profile application failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-network-adapter-config',
    name: 'Configure Host Physical Network Adapters',
    category: 'Host Management',
    description: 'Configure vmnic speed, duplex, and add to vSwitch',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'vSwitchName', label: 'vSwitch Name', type: 'text', required: true, placeholder: 'vSwitch0' },
      { id: 'vmnicName', label: 'Physical Adapter Name', type: 'text', required: true, placeholder: 'vmnic1' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const vSwitchName = escapePowerShellString(params.vSwitchName);
      const vmnicName = escapePowerShellString(params.vmnicName);
      
      return `# Configure Host Physical Network Adapters
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    $vSwitch = Get-VirtualSwitch -VMHost $VMHost -Name "${vSwitchName}"
    
    # Get the physical NIC
    $vmnic = Get-VMHostNetworkAdapter -VMHost $VMHost -Physical | Where-Object { $_.Name -eq "${vmnicName}" }
    
    if (-not $vmnic) {
        throw "Physical adapter '${vmnicName}' not found on ${hostName}"
    }
    
    # Add physical NIC to vSwitch
    Add-VirtualSwitchPhysicalNetworkAdapter -VirtualSwitch $vSwitch -VMHostPhysicalNic $vmnic -Confirm:$false
    
    Write-Host "[SUCCESS] Added ${vmnicName} to ${vSwitchName} on ${hostName}" -ForegroundColor Green
    
    # Display current vSwitch configuration
    $vSwitch = Get-VirtualSwitch -VMHost $VMHost -Name "${vSwitchName}"
    Write-Host "  NICs on vSwitch: $($vSwitch.Nic -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Network adapter configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // STORAGE MANAGEMENT TASKS
  {
    id: 'vmware-create-vmfs-datastore',
    name: 'Create VMFS Datastore',
    category: 'Storage Management',
    description: 'Create a new VMFS datastore from available LUN',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'datastoreName', label: 'New Datastore Name', type: 'text', required: true, placeholder: 'NewDatastore01' },
      { id: 'lunCanonicalName', label: 'LUN Canonical Name (naa.xxx)', type: 'text', required: true, placeholder: 'naa.600508b400099f8e0000300001490000' },
      { id: 'vmfsVersion', label: 'VMFS Version', type: 'select', required: true, options: ['6', '5'], defaultValue: '6' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const datastoreName = escapePowerShellString(params.datastoreName);
      const lunCanonicalName = escapePowerShellString(params.lunCanonicalName);
      const vmfsVersion = params.vmfsVersion;
      
      return `# Create VMFS Datastore
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    
    # Find the LUN
    $ScsiLun = Get-ScsiLun -VMHost $VMHost | Where-Object { $_.CanonicalName -eq "${lunCanonicalName}" }
    
    if (-not $ScsiLun) {
        throw "LUN '${lunCanonicalName}' not found on host ${hostName}"
    }
    
    # Create new VMFS datastore
    $Datastore = New-Datastore \`
        -VMHost $VMHost \`
        -Name "${datastoreName}" \`
        -Path $ScsiLun.CanonicalName \`
        -Vmfs \`
        -FileSystemVersion ${vmfsVersion}
    
    Write-Host "[SUCCESS] Datastore '${datastoreName}' created successfully!" -ForegroundColor Green
    Write-Host "  Capacity: $([math]::Round($Datastore.CapacityGB, 2)) GB" -ForegroundColor Cyan
    Write-Host "  VMFS Version: ${vmfsVersion}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Datastore creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-expand-vmfs-datastore',
    name: 'Expand VMFS Datastore',
    category: 'Storage Management',
    description: 'Expand an existing VMFS datastore using additional LUN or extent',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'datastoreName', label: 'Datastore Name', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const datastoreName = escapePowerShellString(params.datastoreName);
      const hostName = escapePowerShellString(params.hostName);
      
      return `# Expand VMFS Datastore
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    $Datastore = Get-Datastore -Name "${datastoreName}"
    
    # Rescan HBA for new LUNs
    $VMHost | Get-VMHostStorage -RescanAllHba -RescanVmfs
    
    # Get the ESXCLI for advanced operations
    $esxcli = Get-EsxCli -VMHost $VMHost -V2
    
    # Refresh datastore capacity (picks up grown LUN)
    $esxcli.storage.vmfs.extent.list.Invoke() | Where-Object { $_.VolumeName -eq "${datastoreName}" }
    
    # Get updated datastore info
    $Datastore = Get-Datastore -Name "${datastoreName}" -Refresh
    
    Write-Host "[SUCCESS] Datastore refresh completed for '${datastoreName}'" -ForegroundColor Green
    Write-Host "  Current Capacity: $([math]::Round($Datastore.CapacityGB, 2)) GB" -ForegroundColor Cyan
    Write-Host "  Free Space: $([math]::Round($Datastore.FreeSpaceGB, 2)) GB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Datastore expansion failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-storage-drs-configuration',
    name: 'Configure Storage DRS',
    category: 'Storage Management',
    description: 'Enable and configure Storage DRS for datastore clusters',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'datastoreCluster', label: 'Datastore Cluster Name', type: 'text', required: true, placeholder: 'SDRS-Cluster' },
      { id: 'automationLevel', label: 'Automation Level', type: 'select', required: true, options: ['FullyAutomated', 'Manual'], defaultValue: 'FullyAutomated' },
      { id: 'spaceThreshold', label: 'Space Utilization Threshold (%)', type: 'number', required: true, defaultValue: 80 },
      { id: 'ioLatencyThreshold', label: 'I/O Latency Threshold (ms)', type: 'number', required: true, defaultValue: 15 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const datastoreCluster = escapePowerShellString(params.datastoreCluster);
      const automationLevel = params.automationLevel;
      const spaceThreshold = params.spaceThreshold;
      const ioLatencyThreshold = params.ioLatencyThreshold;
      
      return `# Configure Storage DRS
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DSCluster = Get-DatastoreCluster -Name "${datastoreCluster}"
    
    Set-DatastoreCluster -DatastoreCluster $DSCluster \`
        -SdrsAutomationLevel ${automationLevel} \`
        -SpaceUtilizationThresholdPercent ${spaceThreshold} \`
        -IOLatencyThresholdMillisecond ${ioLatencyThreshold} \`
        -Confirm:$false
    
    Write-Host "[SUCCESS] Storage DRS configured for '${datastoreCluster}'" -ForegroundColor Green
    Write-Host "  Automation Level: ${automationLevel}" -ForegroundColor Cyan
    Write-Host "  Space Threshold: ${spaceThreshold}%" -ForegroundColor Cyan
    Write-Host "  I/O Latency Threshold: ${ioLatencyThreshold}ms" -ForegroundColor Cyan
    
} catch {
    Write-Error "Storage DRS configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-storage-policy-create',
    name: 'Create VM Storage Policy',
    category: 'Storage Management',
    description: 'Create a storage policy for VM placement based on capabilities',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'Gold-Storage-Policy' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'High performance tier storage' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const policyName = escapePowerShellString(params.policyName);
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# Create VM Storage Policy
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    # Create new storage policy
    $Policy = New-SpbmStoragePolicy \`
        -Name "${policyName}" \`
        -Description "${description}"
    
    Write-Host "[SUCCESS] Storage policy '${policyName}' created successfully!" -ForegroundColor Green
    
    # List all storage policies
    Write-Host ""
    Write-Host "Available Storage Policies:" -ForegroundColor Cyan
    Get-SpbmStoragePolicy | Select-Object Name, Description | Format-Table -AutoSize
    
} catch {
    Write-Error "Storage policy creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-datastore-cluster-create',
    name: 'Create Datastore Cluster',
    category: 'Storage Management',
    description: 'Create a datastore cluster and add datastores to it',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'datacenter', label: 'Datacenter Name', type: 'text', required: true },
      { id: 'clusterName', label: 'Datastore Cluster Name', type: 'text', required: true, placeholder: 'Production-SDRS' },
      { id: 'datastores', label: 'Datastores to Add (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const datacenter = escapePowerShellString(params.datacenter);
      const clusterName = escapePowerShellString(params.clusterName);
      const datastoresRaw = (params.datastores as string).split(',').map((n: string) => n.trim());
      
      return `# Create Datastore Cluster
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DC = Get-Datacenter -Name "${datacenter}"
    
    # Create datastore cluster
    $DSCluster = New-DatastoreCluster -Name "${clusterName}" -Location $DC
    
    Write-Host "[SUCCESS] Datastore cluster '${clusterName}' created" -ForegroundColor Green
    
    # Add datastores to cluster
    $DatastoreNames = @(${datastoresRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($DSName in $DatastoreNames) {
        $DS = Get-Datastore -Name $DSName
        Move-Datastore -Datastore $DS -Destination $DSCluster -Confirm:$false
        Write-Host "  Added datastore: $DSName" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Datastore cluster configuration complete!" -ForegroundColor Green
    
} catch {
    Write-Error "Datastore cluster creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // NETWORKING TASKS
  {
    id: 'vmware-distributed-switch-create',
    name: 'Create Distributed Virtual Switch',
    category: 'Networking',
    description: 'Create a new distributed virtual switch in vCenter',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'datacenter', label: 'Datacenter Name', type: 'text', required: true },
      { id: 'dvsName', label: 'Distributed Switch Name', type: 'text', required: true, placeholder: 'Production-DVS' },
      { id: 'numUplinks', label: 'Number of Uplinks', type: 'number', required: true, defaultValue: 2 },
      { id: 'mtu', label: 'MTU Size', type: 'number', required: true, defaultValue: 1500 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const datacenter = escapePowerShellString(params.datacenter);
      const dvsName = escapePowerShellString(params.dvsName);
      const numUplinks = params.numUplinks;
      const mtu = params.mtu;
      
      return `# Create Distributed Virtual Switch
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DC = Get-Datacenter -Name "${datacenter}"
    
    $DVS = New-VDSwitch \`
        -Name "${dvsName}" \`
        -Location $DC \`
        -NumUplinkPorts ${numUplinks} \`
        -Mtu ${mtu}
    
    Write-Host "[SUCCESS] Distributed switch '${dvsName}' created successfully!" -ForegroundColor Green
    Write-Host "  Datacenter: ${datacenter}" -ForegroundColor Cyan
    Write-Host "  Uplinks: ${numUplinks}" -ForegroundColor Cyan
    Write-Host "  MTU: ${mtu}" -ForegroundColor Cyan
    
} catch {
    Write-Error "DVS creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-distributed-portgroup-create',
    name: 'Create Distributed Port Group',
    category: 'Networking',
    description: 'Create a port group on a distributed virtual switch',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'dvsName', label: 'Distributed Switch Name', type: 'text', required: true },
      { id: 'portGroupName', label: 'Port Group Name', type: 'text', required: true, placeholder: 'VLAN100-Production' },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: true, defaultValue: 100 },
      { id: 'numPorts', label: 'Number of Ports', type: 'number', required: false, defaultValue: 128 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const dvsName = escapePowerShellString(params.dvsName);
      const portGroupName = escapePowerShellString(params.portGroupName);
      const vlanId = params.vlanId;
      const numPorts = params.numPorts || 128;
      
      return `# Create Distributed Port Group
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DVS = Get-VDSwitch -Name "${dvsName}"
    
    $PortGroup = New-VDPortgroup \`
        -VDSwitch $DVS \`
        -Name "${portGroupName}" \`
        -VlanId ${vlanId} \`
        -NumPorts ${numPorts}
    
    Write-Host "[SUCCESS] Distributed port group '${portGroupName}' created!" -ForegroundColor Green
    Write-Host "  DVS: ${dvsName}" -ForegroundColor Cyan
    Write-Host "  VLAN ID: ${vlanId}" -ForegroundColor Cyan
    Write-Host "  Ports: ${numPorts}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Port group creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-add-host-to-dvs',
    name: 'Add ESXi Host to Distributed Switch',
    category: 'Networking',
    description: 'Add an ESXi host and its physical NICs to a distributed switch',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'dvsName', label: 'Distributed Switch Name', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'vmnicNames', label: 'Physical NICs (comma-separated)', type: 'text', required: true, placeholder: 'vmnic2, vmnic3' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const dvsName = escapePowerShellString(params.dvsName);
      const hostName = escapePowerShellString(params.hostName);
      const vmnicNamesRaw = (params.vmnicNames as string).split(',').map((n: string) => n.trim());
      
      return `# Add ESXi Host to Distributed Switch
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DVS = Get-VDSwitch -Name "${dvsName}"
    $VMHost = Get-VMHost -Name "${hostName}"
    
    # Add host to DVS
    Add-VDSwitchVMHost -VDSwitch $DVS -VMHost $VMHost
    Write-Host "[SUCCESS] Host ${hostName} added to DVS ${dvsName}" -ForegroundColor Green
    
    # Get physical NICs
    $VmnicNames = @(${vmnicNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VmnicName in $VmnicNames) {
        $Vmnic = Get-VMHostNetworkAdapter -VMHost $VMHost -Physical -Name $VmnicName
        
        # Add physical NIC to uplink
        Add-VDSwitchPhysicalNetworkAdapter -VMHostPhysicalNic $Vmnic -DistributedSwitch $DVS -Confirm:$false
        Write-Host "  Added $VmnicName to DVS uplinks" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Host networking migration complete!" -ForegroundColor Green
    
} catch {
    Write-Error "DVS host addition failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-network-io-control',
    name: 'Configure Network I/O Control',
    category: 'Networking',
    description: 'Enable and configure Network I/O Control (NIOC) on distributed switch',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'dvsName', label: 'Distributed Switch Name', type: 'text', required: true },
      { id: 'enableNIOC', label: 'Enable NIOC', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const dvsName = escapePowerShellString(params.dvsName);
      const enableNIOC = toPowerShellBoolean(params.enableNIOC);
      
      return `# Configure Network I/O Control
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $DVS = Get-VDSwitch -Name "${dvsName}"
    
    # Enable/Disable NIOC
    Set-VDSwitch -VDSwitch $DVS -EnableNetworkResourceManagement:${enableNIOC} -Confirm:$false
    
    Write-Host "[SUCCESS] Network I/O Control ${enableNIOC ? 'enabled' : 'disabled'} on ${dvsName}" -ForegroundColor Green
    
    # Display resource pools
    if (${enableNIOC}) {
        Write-Host ""
        Write-Host "Network Resource Pools:" -ForegroundColor Cyan
        Get-VDSwitchNetworkResourcePool -VDSwitch $DVS | Select-Object Name, NumPorts, Key | Format-Table -AutoSize
    }
    
} catch {
    Write-Error "NIOC configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-migrate-vm-network',
    name: 'Migrate VM Network to Distributed Port Group',
    category: 'Networking',
    description: 'Move VM network adapters from standard to distributed port groups',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'targetPortGroup', label: 'Target Distributed Port Group', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const targetPortGroup = escapePowerShellString(params.targetPortGroup);
      
      return `# Migrate VM Network to Distributed Port Group
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $TargetPG = Get-VDPortgroup -Name "${targetPortGroup}"
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        Write-Host "Migrating network for: $VMName..." -ForegroundColor Yellow
        
        $VM = Get-VM -Name $VMName
        $NetworkAdapters = $VM | Get-NetworkAdapter
        
        foreach ($Adapter in $NetworkAdapters) {
            Set-NetworkAdapter -NetworkAdapter $Adapter -Portgroup $TargetPG -Confirm:$false
            Write-Host "  Migrated adapter $($Adapter.Name) to ${targetPortGroup}" -ForegroundColor Cyan
        }
        
        Write-Host "[SUCCESS] $VMName network migration complete" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "All VM network migrations complete!" -ForegroundColor Green
    
} catch {
    Write-Error "VM network migration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // CLUSTER MANAGEMENT TASKS
  {
    id: 'vmware-configure-drs',
    name: 'Configure vSphere DRS',
    category: 'Cluster Management',
    description: 'Enable and configure Distributed Resource Scheduler settings',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'automationLevel', label: 'Automation Level', type: 'select', required: true, options: ['FullyAutomated', 'PartiallyAutomated', 'Manual'], defaultValue: 'FullyAutomated' },
      { id: 'migrationThreshold', label: 'Migration Threshold (1-5)', type: 'number', required: true, defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const automationLevel = params.automationLevel;
      const migrationThreshold = params.migrationThreshold;
      
      return `# Configure vSphere DRS
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    
    Set-Cluster -Cluster $Cluster \`
        -DrsEnabled:$true \`
        -DrsAutomationLevel ${automationLevel} \`
        -Confirm:$false
    
    Write-Host "[SUCCESS] DRS configured for cluster '${cluster}'" -ForegroundColor Green
    Write-Host "  Automation Level: ${automationLevel}" -ForegroundColor Cyan
    Write-Host "  Migration Threshold: ${migrationThreshold}" -ForegroundColor Cyan
    
} catch {
    Write-Error "DRS configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-create-drs-affinity-rule',
    name: 'Create DRS Affinity/Anti-Affinity Rule',
    category: 'Cluster Management',
    description: 'Create VM affinity or anti-affinity rules for DRS',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Keep-VMs-Together' },
      { id: 'ruleType', label: 'Rule Type', type: 'select', required: true, options: ['Affinity', 'AntiAffinity'], defaultValue: 'AntiAffinity' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const ruleName = escapePowerShellString(params.ruleName);
      const ruleType = params.ruleType;
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      
      return `# Create DRS Affinity/Anti-Affinity Rule
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    # Get VMs
    $VMs = $VMNames | ForEach-Object { Get-VM -Name $_ }
    
    if ($VMs.Count -lt 2) {
        throw "At least 2 VMs are required for an affinity/anti-affinity rule"
    }
    
    # Create the DRS rule
    New-DrsRule \`
        -Cluster $Cluster \`
        -Name "${ruleName}" \`
        -VM $VMs \`
        -KeepTogether:${ruleType === 'Affinity' ? '$true' : '$false'} \`
        -Enabled:$true
    
    Write-Host "[SUCCESS] DRS ${ruleType} rule '${ruleName}' created" -ForegroundColor Green
    Write-Host "  VMs in rule: $($VMNames -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "DRS rule creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-create-drs-host-group',
    name: 'Create DRS Host and VM Groups',
    category: 'Cluster Management',
    description: 'Create host groups and VM groups for DRS host affinity rules',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'groupType', label: 'Group Type', type: 'select', required: true, options: ['Host', 'VM'], defaultValue: 'VM' },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Production-VMs' },
      { id: 'members', label: 'Member Names (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const groupType = params.groupType;
      const groupName = escapePowerShellString(params.groupName);
      const membersRaw = (params.members as string).split(',').map((n: string) => n.trim());
      
      return `# Create DRS Host and VM Groups
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    $MemberNames = @(${membersRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
${groupType === 'VM' ? `    # Get VMs
    $Members = $MemberNames | ForEach-Object { Get-VM -Name $_ }
    
    # Create VM Group
    New-DrsClusterGroup -Cluster $Cluster -Name "${groupName}" -VM $Members
    Write-Host "[SUCCESS] DRS VM Group '${groupName}' created" -ForegroundColor Green` :
`    # Get Hosts
    $Members = $MemberNames | ForEach-Object { Get-VMHost -Name $_ }
    
    # Create Host Group
    New-DrsClusterGroup -Cluster $Cluster -Name "${groupName}" -VMHost $Members
    Write-Host "[SUCCESS] DRS Host Group '${groupName}' created" -ForegroundColor Green`}
    
    Write-Host "  Members: $($MemberNames -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "DRS group creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-configure-evc',
    name: 'Configure Enhanced vMotion Compatibility (EVC)',
    category: 'Cluster Management',
    description: 'Enable EVC mode for cluster CPU compatibility',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'evcMode', label: 'EVC Mode', type: 'select', required: true, options: ['intel-skylake', 'intel-cascadelake', 'intel-icelake', 'amd-zen', 'amd-zen2', 'amd-zen3'], defaultValue: 'intel-skylake' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = escapePowerShellString(params.cluster);
      const evcMode = escapePowerShellString(params.evcMode);
      
      return `# Configure Enhanced vMotion Compatibility (EVC)
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Cluster = Get-Cluster -Name "${cluster}"
    
    # Note: All VMs must be powered off and hosts must be in maintenance mode to enable EVC
    Write-Host "Configuring EVC mode: ${evcMode}..." -ForegroundColor Yellow
    
    Set-Cluster -Cluster $Cluster -EVCMode "${evcMode}" -Confirm:$false
    
    Write-Host "[SUCCESS] EVC mode '${evcMode}' configured for cluster '${cluster}'" -ForegroundColor Green
    
} catch {
    Write-Error "EVC configuration failed: $_"
    Write-Host "Note: Ensure all VMs are powered off before enabling EVC" -ForegroundColor Yellow
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // VM MANAGEMENT ADDITIONAL TASKS
  {
    id: 'vmware-vm-hardware-upgrade',
    name: 'Upgrade VM Hardware Version',
    category: 'VM Management',
    description: 'Upgrade virtual machine hardware compatibility version',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'targetVersion', label: 'Target Hardware Version', type: 'select', required: true, options: ['vmx-19', 'vmx-20', 'vmx-21'], defaultValue: 'vmx-19' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const targetVersion = params.targetVersion;
      
      return `# Upgrade VM Hardware Version
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        $VM = Get-VM -Name $VMName
        
        if ($VM.PowerState -ne 'PoweredOff') {
            Write-Host "[WARNING] $VMName must be powered off to upgrade hardware" -ForegroundColor Yellow
            continue
        }
        
        Write-Host "Upgrading hardware version for: $VMName..." -ForegroundColor Yellow
        
        Set-VM -VM $VM -Version ${targetVersion} -Confirm:$false
        
        Write-Host "[SUCCESS] $VMName upgraded to ${targetVersion}" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Hardware upgrade failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-vm-add-disk',
    name: 'Add Virtual Disk to VM',
    category: 'VM Management',
    description: 'Add a new virtual hard disk to an existing VM',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'diskSizeGB', label: 'Disk Size (GB)', type: 'number', required: true, defaultValue: 100 },
      { id: 'storageFormat', label: 'Storage Format', type: 'select', required: true, options: ['Thin', 'Thick', 'EagerZeroedThick'], defaultValue: 'Thin' },
      { id: 'datastore', label: 'Datastore (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const diskSizeGB = params.diskSizeGB;
      const storageFormat = params.storageFormat;
      const datastore = params.datastore ? escapePowerShellString(params.datastore) : '';
      
      return `# Add Virtual Disk to VM
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    
    $DiskParams = @{
        VM = $VM
        CapacityGB = ${diskSizeGB}
        StorageFormat = '${storageFormat}'
        Confirm = $false
    }
    
${datastore ? `    $Datastore = Get-Datastore -Name "${datastore}"
    $DiskParams.Datastore = $Datastore` : ''}
    
    $NewDisk = New-HardDisk @DiskParams
    
    Write-Host "[SUCCESS] New disk added to ${vmName}" -ForegroundColor Green
    Write-Host "  Size: ${diskSizeGB} GB" -ForegroundColor Cyan
    Write-Host "  Format: ${storageFormat}" -ForegroundColor Cyan
    Write-Host "  SCSI: $($NewDisk.ExtensionData.ControllerKey):$($NewDisk.ExtensionData.UnitNumber)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Disk addition failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-vm-modify-resources',
    name: 'Modify VM CPU and Memory',
    category: 'VM Management',
    description: 'Change the CPU and memory allocation for a VM',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'numCPU', label: 'Number of vCPUs', type: 'number', required: true, defaultValue: 2 },
      { id: 'memoryGB', label: 'Memory (GB)', type: 'number', required: true, defaultValue: 4 },
      { id: 'hotAdd', label: 'Enable CPU/Memory Hot Add', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const numCPU = params.numCPU;
      const memoryGB = params.memoryGB;
      const hotAdd = toPowerShellBoolean(params.hotAdd);
      
      return `# Modify VM CPU and Memory
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    
    # Check if VM needs to be powered off for changes
    $NeedsPowerOff = $false
    if ($VM.PowerState -eq 'PoweredOn') {
        $VMView = $VM | Get-View
        if (-not $VMView.Config.CpuHotAddEnabled -or -not $VMView.Config.MemoryHotAddEnabled) {
            $NeedsPowerOff = $true
            Write-Host "[WARNING] VM may need to be powered off for resource changes" -ForegroundColor Yellow
        }
    }
    
    Set-VM -VM $VM \`
        -NumCpu ${numCPU} \`
        -MemoryGB ${memoryGB} \`
        -Confirm:$false
    
    Write-Host "[SUCCESS] VM '${vmName}' resources modified" -ForegroundColor Green
    Write-Host "  vCPUs: ${numCPU}" -ForegroundColor Cyan
    Write-Host "  Memory: ${memoryGB} GB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Resource modification failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-vm-clone',
    name: 'Clone Virtual Machine',
    category: 'VM Management',
    description: 'Create a full clone of an existing VM',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'sourceVM', label: 'Source VM Name', type: 'text', required: true },
      { id: 'cloneName', label: 'Clone Name', type: 'text', required: true },
      { id: 'datastore', label: 'Target Datastore', type: 'text', required: true },
      { id: 'cluster', label: 'Target Cluster', type: 'text', required: true },
      { id: 'powerOn', label: 'Power On Clone', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const sourceVM = escapePowerShellString(params.sourceVM);
      const cloneName = escapePowerShellString(params.cloneName);
      const datastore = escapePowerShellString(params.datastore);
      const cluster = escapePowerShellString(params.cluster);
      const powerOn = toPowerShellBoolean(params.powerOn);
      
      return `# Clone Virtual Machine
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $SourceVM = Get-VM -Name "${sourceVM}"
    $Datastore = Get-Datastore -Name "${datastore}"
    $Cluster = Get-Cluster -Name "${cluster}"
    $VMHost = $Cluster | Get-VMHost | Select-Object -First 1
    
    Write-Host "Cloning ${sourceVM} to ${cloneName}..." -ForegroundColor Yellow
    
    $Clone = New-VM \`
        -Name "${cloneName}" \`
        -VM $SourceVM \`
        -VMHost $VMHost \`
        -Datastore $Datastore \`
        -Location $Cluster
    
    Write-Host "[SUCCESS] Clone '${cloneName}' created successfully!" -ForegroundColor Green
    
    if (${powerOn}) {
        Start-VM -VM $Clone -Confirm:$false
        Write-Host "[SUCCESS] Clone powered on" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Clone operation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-vmotion-vm',
    name: 'vMotion VM to Different Host',
    category: 'VM Management',
    description: 'Live migrate a running VM to a different ESXi host',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'targetHost', label: 'Target ESXi Host', type: 'text', required: true },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['HighPriority', 'LowPriority', 'StandardPriority'], defaultValue: 'HighPriority' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const targetHost = escapePowerShellString(params.targetHost);
      const priority = params.priority;
      
      return `# vMotion VM to Different Host
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    $TargetHost = Get-VMHost -Name "${targetHost}"
    
    Write-Host "Initiating vMotion for ${vmName} to ${targetHost}..." -ForegroundColor Yellow
    
    Move-VM -VM $VM -Destination $TargetHost -VMotionPriority ${priority}
    
    Write-Host "[SUCCESS] vMotion completed successfully!" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  New Host: ${targetHost}" -ForegroundColor Cyan
    
} catch {
    Write-Error "vMotion failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // MONITORING TASKS
  {
    id: 'vmware-create-alarm',
    name: 'Create vCenter Alarm',
    category: 'Monitoring',
    description: 'Create custom alarms for VM or host monitoring',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'alarmName', label: 'Alarm Name', type: 'text', required: true, placeholder: 'High CPU Usage Alarm' },
      { id: 'alarmType', label: 'Alarm Entity Type', type: 'select', required: true, options: ['VirtualMachine', 'HostSystem'], defaultValue: 'VirtualMachine' },
      { id: 'metric', label: 'Metric', type: 'select', required: true, options: ['cpu.usage.average', 'mem.usage.average', 'disk.usage.average'], defaultValue: 'cpu.usage.average' },
      { id: 'warningThreshold', label: 'Warning Threshold (%)', type: 'number', required: true, defaultValue: 75 },
      { id: 'criticalThreshold', label: 'Critical Threshold (%)', type: 'number', required: true, defaultValue: 90 }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const alarmName = escapePowerShellString(params.alarmName);
      const alarmType = params.alarmType;
      const metric = params.metric;
      const warningThreshold = params.warningThreshold;
      const criticalThreshold = params.criticalThreshold;
      
      return `# Create vCenter Alarm
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Entity = Get-Folder -Name "vm" -Type VM | Select-Object -First 1
    $AlarmMgr = Get-View AlarmManager
    
    # Create alarm spec
    $AlarmSpec = New-Object VMware.Vim.AlarmSpec
    $AlarmSpec.Name = "${alarmName}"
    $AlarmSpec.Description = "Monitors ${metric} with thresholds at ${warningThreshold}% and ${criticalThreshold}%"
    $AlarmSpec.Enabled = $true
    
    # Metric expression
    $Expression = New-Object VMware.Vim.MetricAlarmExpression
    $Expression.Metric = New-Object VMware.Vim.PerfMetricId
    $Expression.Metric.CounterId = (Get-StatType | Where-Object { $_.Key -eq "${metric}" }).Key
    $Expression.Type = "Percentage"
    $Expression.Yellow = ${warningThreshold}
    $Expression.Red = ${criticalThreshold}
    $Expression.YellowInterval = 300
    $Expression.RedInterval = 300
    
    $AlarmSpec.Expression = New-Object VMware.Vim.OrAlarmExpression
    $AlarmSpec.Expression.Expression = @($Expression)
    
    Write-Host "[SUCCESS] Alarm configuration prepared: ${alarmName}" -ForegroundColor Green
    Write-Host "  Entity Type: ${alarmType}" -ForegroundColor Cyan
    Write-Host "  Metric: ${metric}" -ForegroundColor Cyan
    Write-Host "  Warning: ${warningThreshold}%" -ForegroundColor Yellow
    Write-Host "  Critical: ${criticalThreshold}%" -ForegroundColor Red
    
} catch {
    Write-Error "Alarm creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-performance-report',
    name: 'Generate VM Performance Report',
    category: 'Monitoring',
    description: 'Export CPU, memory, and disk performance metrics for VMs',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmNames', label: 'VM Names (comma-separated, or * for all)', type: 'textarea', required: true, defaultValue: '*' },
      { id: 'intervalDays', label: 'Interval (Days)', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\VM-Performance.csv' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNames = params.vmNames as string;
      const intervalDays = params.intervalDays;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate VM Performance Report
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $StartDate = (Get-Date).AddDays(-${intervalDays})
    
${vmNames === '*' ? `    $VMs = Get-VM` : `    $VMNames = @(${vmNames.split(',').map((n: string) => `"${escapePowerShellString(n.trim())}"`).join(', ')})
    $VMs = $VMNames | ForEach-Object { Get-VM -Name $_ }`}
    
    Write-Host "Collecting performance data for $($VMs.Count) VMs..." -ForegroundColor Cyan
    
    $Report = $VMs | ForEach-Object {
        $VM = $_
        
        $Stats = Get-Stat -Entity $VM -Stat cpu.usage.average, mem.usage.average, disk.usage.average -Start $StartDate -ErrorAction SilentlyContinue
        
        [PSCustomObject]@{
            VMName = $VM.Name
            PowerState = $VM.PowerState
            AvgCPU_Percent = [math]::Round(($Stats | Where-Object { $_.MetricId -eq 'cpu.usage.average' } | Measure-Object -Property Value -Average).Average, 2)
            MaxCPU_Percent = [math]::Round(($Stats | Where-Object { $_.MetricId -eq 'cpu.usage.average' } | Measure-Object -Property Value -Maximum).Maximum, 2)
            AvgMemory_Percent = [math]::Round(($Stats | Where-Object { $_.MetricId -eq 'mem.usage.average' } | Measure-Object -Property Value -Average).Average, 2)
            MaxMemory_Percent = [math]::Round(($Stats | Where-Object { $_.MetricId -eq 'mem.usage.average' } | Measure-Object -Property Value -Maximum).Maximum, 2)
            ConfiguredCPU = $VM.NumCpu
            ConfiguredMemoryGB = $VM.MemoryGB
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Performance report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    $Report | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-health-check',
    name: 'ESXi Host Health Check',
    category: 'Monitoring',
    description: 'Check health status of ESXi hosts including hardware, services, and connectivity',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster Name (optional)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const cluster = params.cluster ? escapePowerShellString(params.cluster) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# ESXi Host Health Check
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
${cluster ? `    $VMHosts = Get-Cluster -Name "${cluster}" | Get-VMHost` : `    $VMHosts = Get-VMHost`}
    
    Write-Host "Running health check on $($VMHosts.Count) hosts..." -ForegroundColor Cyan
    
    $Report = $VMHosts | ForEach-Object {
        $VMHost = $_
        
        # Get hardware health
        $HardwareHealth = Get-VMHostHardware -VMHost $VMHost -ErrorAction SilentlyContinue
        
        # Check critical services
        $SSHService = Get-VMHostService -VMHost $VMHost | Where-Object { $_.Key -eq 'TSM-SSH' }
        $NTPService = Get-VMHostService -VMHost $VMHost | Where-Object { $_.Key -eq 'ntpd' }
        
        [PSCustomObject]@{
            HostName = $VMHost.Name
            ConnectionState = $VMHost.ConnectionState
            PowerState = $VMHost.PowerState
            CPUUsage_Percent = [math]::Round(($VMHost.CpuUsageMhz / $VMHost.CpuTotalMhz) * 100, 2)
            MemUsage_Percent = [math]::Round(($VMHost.MemoryUsageGB / $VMHost.MemoryTotalGB) * 100, 2)
            VMCount = ($VMHost | Get-VM).Count
            Uptime_Days = [math]::Round((Get-Date) - (Get-View $VMHost).Runtime.BootTime).TotalDays, 2)
            SSHRunning = $SSHService.Running
            NTPRunning = $NTPService.Running
            Version = $VMHost.Version
            Build = $VMHost.Build
        }
    }
    
    Write-Host ""
    $Report | Format-Table -AutoSize
    
${exportPath ? `    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Health check failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // SECURITY TASKS
  {
    id: 'vmware-create-custom-role',
    name: 'Create Custom vCenter Role',
    category: 'Security',
    description: 'Create a custom role with specific privileges',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'VM-Operator' },
      { id: 'privilegeIds', label: 'Privilege IDs (comma-separated)', type: 'textarea', required: true, placeholder: 'VirtualMachine.Interact.PowerOn, VirtualMachine.Interact.PowerOff, VirtualMachine.Interact.Reset' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const roleName = escapePowerShellString(params.roleName);
      const privilegeIdsRaw = (params.privilegeIds as string).split(',').map((n: string) => n.trim());
      
      return `# Create Custom vCenter Role
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $PrivilegeIds = @(${privilegeIdsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    # Get privilege objects
    $Privileges = Get-VIPrivilege -Id $PrivilegeIds
    
    # Create new role
    $Role = New-VIRole -Name "${roleName}" -Privilege $Privileges
    
    Write-Host "[SUCCESS] Custom role '${roleName}' created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Assigned Privileges:" -ForegroundColor Cyan
    $Privileges | ForEach-Object { Write-Host "  - $($_.Id)" }
    
} catch {
    Write-Error "Role creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-assign-permission',
    name: 'Assign vCenter Permission',
    category: 'Security',
    description: 'Assign a role to a user or group on a specific object',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'principal', label: 'User or Group', type: 'text', required: true, placeholder: 'DOMAIN\\Username' },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'ReadOnly' },
      { id: 'entityName', label: 'Entity Name (Folder, VM, Cluster)', type: 'text', required: true },
      { id: 'entityType', label: 'Entity Type', type: 'select', required: true, options: ['Folder', 'VirtualMachine', 'Cluster', 'Datacenter'], defaultValue: 'Folder' },
      { id: 'propagate', label: 'Propagate to Children', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const principal = escapePowerShellString(params.principal);
      const roleName = escapePowerShellString(params.roleName);
      const entityName = escapePowerShellString(params.entityName);
      const entityType = params.entityType;
      const propagate = toPowerShellBoolean(params.propagate);
      
      return `# Assign vCenter Permission
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    # Get the entity
${entityType === 'Folder' ? `    $Entity = Get-Folder -Name "${entityName}"` :
entityType === 'VirtualMachine' ? `    $Entity = Get-VM -Name "${entityName}"` :
entityType === 'Cluster' ? `    $Entity = Get-Cluster -Name "${entityName}"` :
`    $Entity = Get-Datacenter -Name "${entityName}"`}
    
    # Get the role
    $Role = Get-VIRole -Name "${roleName}"
    
    # Assign permission
    New-VIPermission \`
        -Entity $Entity \`
        -Principal "${principal}" \`
        -Role $Role \`
        -Propagate:${propagate}
    
    Write-Host "[SUCCESS] Permission assigned successfully!" -ForegroundColor Green
    Write-Host "  Principal: ${principal}" -ForegroundColor Cyan
    Write-Host "  Role: ${roleName}" -ForegroundColor Cyan
    Write-Host "  Entity: ${entityName}" -ForegroundColor Cyan
    Write-Host "  Propagate: ${propagate}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Permission assignment failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-audit-permissions',
    name: 'Audit vCenter Permissions',
    category: 'Security',
    description: 'Export all permissions across vCenter for security audit',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\vCenter-Permissions.csv' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Audit vCenter Permissions
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    Write-Host "Collecting all permissions..." -ForegroundColor Cyan
    
    $Permissions = Get-VIPermission | Select-Object \`
        @{N='Entity';E={$_.Entity.Name}},
        @{N='EntityType';E={$_.Entity.GetType().Name}},
        Principal,
        @{N='Role';E={$_.Role}},
        Propagate,
        @{N='IsGroup';E={$_.IsGroup}}
    
    $Permissions | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Permissions exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Permissions: $($Permissions.Count)" -ForegroundColor Cyan
    
    # Summary
    Write-Host ""
    Write-Host "Permission Summary by Role:" -ForegroundColor Yellow
    $Permissions | Group-Object Role | Sort-Object Count -Descending | Select-Object Name, Count | Format-Table
    
} catch {
    Write-Error "Permission audit failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-host-lockdown-mode',
    name: 'Configure ESXi Lockdown Mode',
    category: 'Security',
    description: 'Enable or disable lockdown mode on ESXi hosts',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'hostName', label: 'ESXi Host Name', type: 'text', required: true },
      { id: 'lockdownMode', label: 'Lockdown Mode', type: 'select', required: true, options: ['Disabled', 'Normal', 'Strict'], defaultValue: 'Normal' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const hostName = escapePowerShellString(params.hostName);
      const lockdownMode = params.lockdownMode;
      
      return `# Configure ESXi Lockdown Mode
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VMHost = Get-VMHost -Name "${hostName}"
    $HostView = $VMHost | Get-View
    
    # Get Host Access Manager
    $LockdownMgr = Get-View $HostView.ConfigManager.HostAccessManager
    
${lockdownMode === 'Disabled' ? `    # Disable lockdown mode
    $LockdownMgr.ChangeLockdownMode('lockdownDisabled')
    Write-Host "[SUCCESS] Lockdown mode DISABLED on ${hostName}" -ForegroundColor Yellow` :
lockdownMode === 'Normal' ? `    # Enable Normal lockdown mode
    $LockdownMgr.ChangeLockdownMode('lockdownNormal')
    Write-Host "[SUCCESS] Normal lockdown mode ENABLED on ${hostName}" -ForegroundColor Green` :
`    # Enable Strict lockdown mode
    $LockdownMgr.ChangeLockdownMode('lockdownStrict')
    Write-Host "[SUCCESS] Strict lockdown mode ENABLED on ${hostName}" -ForegroundColor Green
    Write-Host "[WARNING] WARNING: Direct console access is now restricted!" -ForegroundColor Red`}
    
} catch {
    Write-Error "Lockdown mode configuration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },

  // TEMPLATE TASKS
  {
    id: 'vmware-deploy-from-template-with-customization',
    name: 'Deploy VM from Template with Guest Customization',
    category: 'Templates',
    description: 'Deploy a VM from template with OS customization specification',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'templateName', label: 'Template Name', type: 'text', required: true },
      { id: 'vmName', label: 'New VM Name', type: 'text', required: true },
      { id: 'customizationSpec', label: 'Customization Spec Name', type: 'text', required: true, placeholder: 'Windows-Standard' },
      { id: 'datastore', label: 'Datastore', type: 'text', required: true },
      { id: 'cluster', label: 'Cluster', type: 'text', required: true },
      { id: 'portGroup', label: 'Network Port Group', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const templateName = escapePowerShellString(params.templateName);
      const vmName = escapePowerShellString(params.vmName);
      const customizationSpec = escapePowerShellString(params.customizationSpec);
      const datastore = escapePowerShellString(params.datastore);
      const cluster = escapePowerShellString(params.cluster);
      const portGroup = escapePowerShellString(params.portGroup);
      
      return `# Deploy VM from Template with Guest Customization
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $Template = Get-Template -Name "${templateName}"
    $CustSpec = Get-OSCustomizationSpec -Name "${customizationSpec}"
    $Datastore = Get-Datastore -Name "${datastore}"
    $Cluster = Get-Cluster -Name "${cluster}"
    $VMHost = $Cluster | Get-VMHost | Select-Object -First 1
    $PortGroup = Get-VDPortgroup -Name "${portGroup}"
    
    Write-Host "Deploying VM from template..." -ForegroundColor Yellow
    
    $NewVM = New-VM \`
        -Name "${vmName}" \`
        -Template $Template \`
        -OSCustomizationSpec $CustSpec \`
        -Datastore $Datastore \`
        -VMHost $VMHost \`
        -Location $Cluster
    
    # Set network adapter
    Get-NetworkAdapter -VM $NewVM | Set-NetworkAdapter -Portgroup $PortGroup -Confirm:$false
    
    Write-Host "[SUCCESS] VM '${vmName}' deployed successfully!" -ForegroundColor Green
    Write-Host "  Template: ${templateName}" -ForegroundColor Cyan
    Write-Host "  Customization: ${customizationSpec}" -ForegroundColor Cyan
    Write-Host "  Network: ${portGroup}" -ForegroundColor Cyan
    
    # Power on VM to start customization
    Start-VM -VM $NewVM -Confirm:$false
    Write-Host "[SUCCESS] VM powered on - customization in progress" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-create-customization-spec',
    name: 'Create Windows Customization Specification',
    category: 'Templates',
    description: 'Create a Windows OS customization spec for automated VM deployments',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'specName', label: 'Spec Name', type: 'text', required: true, placeholder: 'Windows-Server-Standard' },
      { id: 'orgName', label: 'Organization Name', type: 'text', required: true, placeholder: 'Contoso Ltd' },
      { id: 'timezone', label: 'Timezone', type: 'number', required: true, defaultValue: 85, description: '85 = Eastern Time' },
      { id: 'adminPassword', label: 'Local Admin Password', type: 'text', required: true },
      { id: 'joinDomain', label: 'Join Domain', type: 'boolean', required: false, defaultValue: false },
      { id: 'domainName', label: 'Domain Name', type: 'text', required: false, placeholder: 'contoso.com' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const specName = escapePowerShellString(params.specName);
      const orgName = escapePowerShellString(params.orgName);
      const timezone = params.timezone;
      const adminPassword = escapePowerShellString(params.adminPassword);
      const joinDomain = params.joinDomain;
      const domainName = params.domainName ? escapePowerShellString(params.domainName) : '';
      
      return `# Create Windows Customization Specification
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $SpecParams = @{
        Name = "${specName}"
        Type = 'Windows'
        OrgName = "${orgName}"
        TimeZone = ${timezone}
        AdminPassword = "${adminPassword}"
        ChangeSid = $true
    }
    
${joinDomain && domainName ? `    # Domain join settings
    $SpecParams.Domain = "${domainName}"
    # Note: Domain credentials will be prompted or can be added via DomainUsername/DomainPassword` : `    $SpecParams.Workgroup = "WORKGROUP"`}
    
    $Spec = New-OSCustomizationSpec @SpecParams
    
    Write-Host "[SUCCESS] Customization spec '${specName}' created successfully!" -ForegroundColor Green
    Write-Host ""
    Get-OSCustomizationSpec -Name "${specName}" | Format-List
    
} catch {
    Write-Error "Customization spec creation failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-update-vmtools',
    name: 'Update VMware Tools on VMs',
    category: 'VM Management',
    description: 'Update VMware Tools on one or more virtual machines',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmNames', label: 'VM Names (comma-separated, or * for all)', type: 'textarea', required: true },
      { id: 'reboot', label: 'Allow Reboot if Required', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmNames = params.vmNames as string;
      const reboot = toPowerShellBoolean(params.reboot);
      
      return `# Update VMware Tools on VMs
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
${vmNames === '*' ? `    $VMs = Get-VM | Where-Object { $_.PowerState -eq 'PoweredOn' }` : 
`    $VMNames = @(${vmNames.split(',').map((n: string) => `"${escapePowerShellString(n.trim())}"`).join(', ')})
    $VMs = $VMNames | ForEach-Object { Get-VM -Name $_ }`}
    
    Write-Host "Checking VMware Tools on $($VMs.Count) VMs..." -ForegroundColor Cyan
    
    foreach ($VM in $VMs) {
        $ToolsStatus = $VM.ExtensionData.Guest.ToolsVersionStatus
        
        if ($ToolsStatus -eq 'guestToolsNeedUpgrade') {
            Write-Host "Updating tools on: $($VM.Name)..." -ForegroundColor Yellow
            
            $UpdateParams = @{
                VM = $VM
                NoReboot = -not ${reboot}
            }
            
            Update-Tools @UpdateParams
            Write-Host "[SUCCESS] Tools update initiated for $($VM.Name)" -ForegroundColor Green
        } else {
            Write-Host "  $($VM.Name): Tools are current ($ToolsStatus)" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "VMware Tools update operation complete!" -ForegroundColor Green
    
} catch {
    Write-Error "Tools update failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  },
  {
    id: 'vmware-export-vm-to-ovf',
    name: 'Export VM to OVF/OVA',
    category: 'VM Management',
    description: 'Export a virtual machine to OVF or OVA format',
    isPremium: true,
    parameters: [
      { id: 'vcenter', label: 'vCenter Server', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Directory', type: 'path', required: true, placeholder: 'C:\\Exports' },
      { id: 'format', label: 'Format', type: 'select', required: true, options: ['OVF', 'OVA'], defaultValue: 'OVA' }
    ],
    scriptTemplate: (params) => {
      const vcenter = escapePowerShellString(params.vcenter);
      const vmName = escapePowerShellString(params.vmName);
      const exportPath = escapePowerShellString(params.exportPath);
      const format = params.format;
      
      return `# Export VM to OVF/OVA
# Generated: ${new Date().toISOString()}

Import-Module VMware.PowerCLI -ErrorAction Stop

try {
    Connect-VIServer -Server "${vcenter}" -ErrorAction Stop
    
    $VM = Get-VM -Name "${vmName}"
    
    # Ensure export directory exists
    if (-not (Test-Path "${exportPath}")) {
        New-Item -ItemType Directory -Path "${exportPath}" -Force | Out-Null
    }
    
    Write-Host "Exporting ${vmName} to ${format} format..." -ForegroundColor Yellow
    Write-Host "This may take several minutes depending on VM size." -ForegroundColor Cyan
    
    Export-VApp -VM $VM \`
        -Destination "${exportPath}" \`
        -Format ${format} \`
        -Force
    
    Write-Host "[SUCCESS] Export completed successfully!" -ForegroundColor Green
    Write-Host "  Location: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
  }
];
