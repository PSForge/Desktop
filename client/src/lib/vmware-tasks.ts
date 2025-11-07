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
        
        Write-Host "✓ $VMName migrated successfully" -ForegroundColor Green
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
    
    Write-Host "✓ VM '${vmName}' created successfully!" -ForegroundColor Green
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
    
    Write-Host "✓ Inventory exported to: ${exportPath}" -ForegroundColor Green
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
    
    Write-Host "✓ Resource pool '${poolName}' created successfully!" -ForegroundColor Green
    
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
    
    Write-Host "✓ Template '${templateName}' created successfully!" -ForegroundColor Green
    
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
        
        Write-Host "✓ Linked clone $VMName created" -ForegroundColor Green
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
        Write-Host "✓ VM reverted to snapshot: $($Snapshot.Name)" -ForegroundColor Green
    } else {
        Write-Error "No snapshot found"
    }` : `    # Consolidate all snapshots
    $VM | Remove-Snapshot -Confirm:$false
    Write-Host "✓ Snapshots consolidated for ${vmName}" -ForegroundColor Green`}
    
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
        Write-Host "✓ vSwitch '${vSwitchName}' created" -ForegroundColor Green
    }
    
    # Create port group
    New-VirtualPortGroup -VirtualSwitch $vSwitch -Name "${portGroupName}" -VLanId ${params.vlanId}
    
    Write-Host "✓ Port group '${portGroupName}' created with VLAN ${params.vlanId}" -ForegroundColor Green
    
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
    Write-Host "✓ Role '${roleName}' created" -ForegroundColor Green` :
action === 'AssignPermission' ? `    $Role = Get-VIRole -Name "${roleName}"
    $Entity = Get-Folder -Name "${entityName}" -ErrorAction SilentlyContinue
    if (-not $Entity) {
        $Entity = Get-VM -Name "${entityName}" -ErrorAction SilentlyContinue
    }
    
    if ($Entity) {
        New-VIPermission -Entity $Entity -Principal "${userName}" -Role $Role
        Write-Host "✓ Permission assigned to ${userName}" -ForegroundColor Green
    } else {
        Write-Error "Entity ${entityName} not found"
    }` :
`    $Permission = Get-VIPermission -Entity (Get-Folder -Name "${entityName}") -Principal "${userName}"
    Remove-VIPermission -Permission $Permission -Confirm:$false
    Write-Host "✓ Permission removed from ${userName}" -ForegroundColor Green`}
    
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
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
    Write-Host ""
    Write-Host "Health check completed for $($HealthReport.Count) host(s)" -ForegroundColor Green
    
} catch {
    Write-Error "Health check failed: $_"
} finally {
    Disconnect-VIServer -Server "${vcenter}" -Confirm:$false -ErrorAction SilentlyContinue
}`;
    },
    isPremium: true
  }
];
