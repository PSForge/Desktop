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
        
        Write-Host "✓ VM $VMName created successfully" -ForegroundColor Green
        
        if (${powerOn}) {
            Start-VM -VM $NewVM -Confirm:$false
            Write-Host "✓ VM $VMName powered on" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Bulk VM creation completed! Created $($VMNames.Count) VMs." -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create VMs: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
        Write-Host "✓ Snapshot created for $VMName" -ForegroundColor Green` : `        Write-Host "Removing snapshot from: $VMName..." -ForegroundColor Yellow
        $Snapshot = Get-Snapshot -VM $VM -Name "${snapshotName}" -ErrorAction SilentlyContinue
        if ($Snapshot) {
            Remove-Snapshot -Snapshot $Snapshot -Confirm:$false
            Write-Host "✓ Snapshot removed from $VMName" -ForegroundColor Green
        } else {
            Write-Host "⚠ Snapshot not found on $VMName" -ForegroundColor Yellow
        }`}
    }
    
    Write-Host ""
    Write-Host "Bulk snapshot operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
        
        Write-Host "✓ $VMName migrated successfully" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "All VMs migrated to ${targetDatastore}" -ForegroundColor Green
    
} catch {
    Write-Error "Migration failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
    
    Write-Host "✓ VM '${vmName}' created successfully!" -ForegroundColor Green
    Write-Host "  CPU: ${params.numCPU} vCPUs" -ForegroundColor Cyan
    Write-Host "  Memory: ${params.memoryGB} GB" -ForegroundColor Cyan
    Write-Host "  Disk: ${params.diskGB} GB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create VM: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
        Write-Host "✓ $VMName powered on" -ForegroundColor Green` : 
action === 'PowerOff' ? `        Stop-VM -VM $VM -Confirm:$false
        Write-Host "✓ $VMName powered off" -ForegroundColor Green` :
`        Restart-VM -VM $VM -Confirm:$false
        Write-Host "✓ $VMName restarted" -ForegroundColor Green`}
    }
    
    Write-Host ""
    Write-Host "Power operation completed for all VMs" -ForegroundColor Green
    
} catch {
    Write-Error "Power control failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
    
    Write-Host "✓ Inventory exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total VMs: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
    
    Write-Host "✓ Resource pool '${poolName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create resource pool: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    }
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
    Write-Host "✓ Datastore mounted on all hosts" -ForegroundColor Green` :
action === 'Unmount' ? `    $VMHosts = Get-VMHost
    foreach ($VMHost in $VMHosts) {
        Unmount-Datastore -Datastore $DS -VMHost $VMHost -Confirm:$false
    }
    Write-Host "✓ Datastore unmounted from all hosts" -ForegroundColor Green` :
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
    }
  }
];
