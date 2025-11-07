import { escapePowerShellString, toPowerShellBoolean } from './powershell-utils';

export interface NutanixTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface NutanixTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: NutanixTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const nutanixTasks: NutanixTask[] = [
  {
    id: 'nutanix-bulk-vm-power',
    name: 'Bulk VM Power Actions',
    category: 'Bulk Operations',
    description: 'Power on, off, or restart multiple VMs',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'action', label: 'Power Action', type: 'select', required: true, options: ['ON', 'OFF', 'REBOOT'], defaultValue: 'ON' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      
      return `# Bulk Nutanix VM Power Control
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        $VM = Get-NTNXVM | Where-Object { $_.vmName -eq $VMName }
        
        if ($VM) {
            Set-NTNXVMPowerState -Vmid $VM.vmId -Transition "${action}"
            Write-Host "✓ Power ${action}: $VMName" -ForegroundColor Green
        } else {
            Write-Host "⚠ VM not found: $VMName" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Bulk power operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'nutanix-create-vm',
    name: 'Create VM',
    category: 'VM Management',
    description: 'Create a new virtual machine on Nutanix',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true, placeholder: 'NewVM01' },
      { id: 'container', label: 'Storage Container', type: 'text', required: true },
      { id: 'vCPUs', label: 'vCPUs', type: 'number', required: true, defaultValue: 2 },
      { id: 'memoryMB', label: 'Memory (MB)', type: 'number', required: true, defaultValue: 4096 },
      { id: 'diskGB', label: 'Disk Size (GB)', type: 'number', required: true, defaultValue: 60 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      const container = escapePowerShellString(params.container);
      
      return `# Create Nutanix VM
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Container = Get-NTNXContainer | Where-Object { $_.name -eq "${container}" }
    
    $VMSpec = @{
        Name = "${vmName}"
        NumVcpus = ${params.vCPUs}
        MemoryMB = ${params.memoryMB}
    }
    
    $NewVM = New-NTNXVM @VMSpec
    
    # Add disk
    $DiskSpec = @{
        VmId = $NewVM.vmId
        ContainerId = $Container.id
        SizeMB = (${params.diskGB} * 1024)
    }
    Add-NTNXVMDisk @DiskSpec
    
    Write-Host "✓ VM '${vmName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create VM: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'nutanix-bulk-snapshot',
    name: 'Bulk Snapshot Creation',
    category: 'Bulk Operations',
    description: 'Create snapshots for multiple VMs',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: true, placeholder: 'Pre-Maintenance' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const snapshotName = escapePowerShellString(params.snapshotName);
      
      return `# Bulk Nutanix Snapshot Creation
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        $VM = Get-NTNXVM | Where-Object { $_.vmName -eq $VMName }
        
        if ($VM) {
            New-NTNXSnapshot -VmId $VM.vmId -SnapshotName "${snapshotName}_$(Get-Date -Format 'yyyyMMdd_HHmm')"
            Write-Host "✓ Snapshot created for: $VMName" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Bulk snapshot completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'nutanix-cluster-health',
    name: 'Monitor Cluster Health',
    category: 'Monitoring',
    description: 'Check cluster health and alert status',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      
      return `# Nutanix Cluster Health Check
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $ClusterInfo = Get-NTNXCluster
    $Alerts = Get-NTNXAlert | Where-Object { $_.resolved -eq $false }
    
    Write-Host "Cluster Health Status" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    Write-Host "Cluster Name: $($ClusterInfo.name)"
    Write-Host "Version: $($ClusterInfo.version)"
    Write-Host "Status: $($ClusterInfo.status)"
    Write-Host ""
    Write-Host "Active Alerts: $($Alerts.Count)" -ForegroundColor $(if ($Alerts.Count -gt 0) { 'Yellow' } else { 'Green' })
    
    if ($Alerts.Count -gt 0) {
        Write-Host ""
        Write-Host "Alerts:" -ForegroundColor Yellow
        $Alerts | ForEach-Object {
            Write-Host "  - $($_.message)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Health check failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'nutanix-create-storage-container',
    name: 'Create and Configure Storage Containers',
    category: 'Common Admin Tasks',
    description: 'Create new storage containers with compression and deduplication',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'Production-Storage' },
      { id: 'enableCompression', label: 'Enable Compression', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableDeduplication', label: 'Enable Deduplication', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const containerName = escapePowerShellString(params.containerName);
      const enableCompression = toPowerShellBoolean(params.enableCompression);
      const enableDeduplication = toPowerShellBoolean(params.enableDeduplication);
      
      return `# Create Storage Container
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    # Get storage pool
    $StoragePool = Get-NTNXStoragePool | Select-Object -First 1
    
    # Create container
    $ContainerSpec = @{
        name = "${containerName}"
        storagePoolId = $StoragePool.id
        compressionEnabled = ${enableCompression}
        fingerPrintOnWrite = ${enableDeduplication}
    }
    
    New-NTNXContainer -Body $ContainerSpec
    
    Write-Host "✓ Storage container '${containerName}' created successfully!" -ForegroundColor Green
    Write-Host "  Compression: ${params.enableCompression}" -ForegroundColor Cyan
    Write-Host "  Deduplication: ${params.enableDeduplication}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create container: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-configure-protection-policy',
    name: 'Configure Data Protection Policies',
    category: 'Common Admin Tasks',
    description: 'Set up data protection and snapshot schedules',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'policyName', label: 'Protection Domain Name', type: 'text', required: true, placeholder: 'Daily-Backup-Policy' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'scheduleInterval', label: 'Snapshot Interval (Hours)', type: 'number', required: true, defaultValue: 24 },
      { id: 'retentionCount', label: 'Snapshots to Retain', type: 'number', required: true, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const policyName = escapePowerShellString(params.policyName);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      
      return `# Configure Data Protection Policy
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    # Create protection domain
    $ProtectionDomain = New-NTNXProtectionDomain -Name "${policyName}"
    
    # Add VMs to protection domain
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($VMName in $VMNames) {
        $VM = Get-NTNXVM | Where-Object { $_.vmName -eq $VMName }
        if ($VM) {
            Add-NTNXProtectionDomainVM -Id $ProtectionDomain.name -VmIds $VM.vmId
            Write-Host "✓ Added VM to protection domain: $VMName" -ForegroundColor Green
        }
    }
    
    # Configure snapshot schedule
    $ScheduleSpec = @{
        type = "DAILY"
        everyNth = ${params.scheduleInterval}
        retentionPolicy = @{
            localMaxSnapshots = ${params.retentionCount}
        }
    }
    
    Set-NTNXProtectionDomainSchedule -Name $ProtectionDomain.name -Body $ScheduleSpec
    
    Write-Host ""
    Write-Host "✓ Protection domain configured successfully!" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Schedule: Every ${params.scheduleInterval} hours" -ForegroundColor Cyan
    Write-Host "  Retention: ${params.retentionCount} snapshots" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to configure protection policy: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-manage-networks',
    name: 'Manage Networks and VLANs',
    category: 'Common Admin Tasks',
    description: 'Create and configure virtual networks with VLAN tags',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'networkName', label: 'Network Name', type: 'text', required: true, placeholder: 'Production-VLAN100' },
      { id: 'vlanId', label: 'VLAN ID', type: 'number', required: true, defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const networkName = escapePowerShellString(params.networkName);
      
      return `# Manage Networks and VLANs
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    # Create network
    $NetworkSpec = @{
        name = "${networkName}"
        vlanId = ${params.vlanId}
    }
    
    New-NTNXNetwork -Body $NetworkSpec
    
    Write-Host "✓ Network '${networkName}' created with VLAN ${params.vlanId}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create network: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-configure-ipam',
    name: 'Configure IPAM Settings',
    category: 'Common Admin Tasks',
    description: 'Set up IP address management for networks',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'networkName', label: 'Network Name', type: 'text', required: true },
      { id: 'ipPoolStart', label: 'IP Pool Start', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'ipPoolEnd', label: 'IP Pool End', type: 'text', required: true, placeholder: '192.168.1.200' },
      { id: 'gatewayIP', label: 'Gateway IP', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'subnetMask', label: 'Subnet Mask', type: 'text', required: true, placeholder: '255.255.255.0' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const networkName = escapePowerShellString(params.networkName);
      const ipPoolStart = escapePowerShellString(params.ipPoolStart);
      const ipPoolEnd = escapePowerShellString(params.ipPoolEnd);
      const gatewayIP = escapePowerShellString(params.gatewayIP);
      const subnetMask = escapePowerShellString(params.subnetMask);
      
      return `# Configure IPAM Settings
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    # Get network
    $Network = Get-NTNXNetwork | Where-Object { $_.name -eq "${networkName}" }
    
    if ($Network) {
        # Configure IPAM
        $IPAMConfig = @{
            dhcpOptions = @{
                domainNameServers = @("8.8.8.8", "8.8.4.4")
                routers = @("${gatewayIP}")
            }
            networkAddress = "${ipPoolStart}"
            prefixLength = 24
            pool = @{
                range = "${ipPoolStart} ${ipPoolEnd}"
            }
        }
        
        Set-NTNXNetwork -NetworkId $Network.uuid -Body @{ ipConfig = $IPAMConfig }
        
        Write-Host "✓ IPAM configured for network: ${networkName}" -ForegroundColor Green
        Write-Host "  IP Pool: ${ipPoolStart} - ${ipPoolEnd}" -ForegroundColor Cyan
        Write-Host "  Gateway: ${gatewayIP}" -ForegroundColor Cyan
        Write-Host "  Subnet Mask: ${subnetMask}" -ForegroundColor Cyan
    } else {
        Write-Error "Network ${networkName} not found"
    }
    
} catch {
    Write-Error "IPAM configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-manage-capacity',
    name: 'Manage Capacity and Deduplication',
    category: 'Common Admin Tasks',
    description: 'View and manage storage capacity with deduplication metrics',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Nutanix-Capacity.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Manage Capacity and Deduplication
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Cluster = Get-NTNXCluster
    $Containers = Get-NTNXContainer
    
    Write-Host "Cluster Capacity Report" -ForegroundColor Cyan
    Write-Host "=======================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Overall Cluster:" -ForegroundColor Yellow
    Write-Host "  Total Capacity: $([math]::Round($Cluster.stats.storage.capacity_bytes/1TB,2)) TB"
    Write-Host "  Used Space: $([math]::Round($Cluster.stats.storage.usage_bytes/1TB,2)) TB"
    Write-Host "  Free Space: $([math]::Round(($Cluster.stats.storage.capacity_bytes - $Cluster.stats.storage.usage_bytes)/1TB,2)) TB"
    Write-Host ""
    
    $CapacityReport = $Containers | ForEach-Object {
        $Container = $_
        
        [PSCustomObject]@{
            ContainerName = $Container.name
            TotalCapacityTB = [math]::Round($Container.maxCapacity/1TB,2)
            UsedSpaceTB = [math]::Round($Container.usage/1TB,2)
            FreeSpaceTB = [math]::Round(($Container.maxCapacity - $Container.usage)/1TB,2)
            CompressionEnabled = $Container.compressionEnabled
            DeduplicationEnabled = $Container.fingerPrintOnWrite
            DeduplicationRatio = if ($Container.fingerPrintOnWrite) { "$($Container.deduplicationRatio):1" } else { "N/A" }
        }
    }
    
    $CapacityReport | Format-Table -AutoSize
    
    ${exportPath ? `$CapacityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Capacity report exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Capacity check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-export-performance-report',
    name: 'Export Performance Metrics Report',
    category: 'Common Admin Tasks',
    description: 'Generate detailed performance metrics report',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Nutanix-Performance.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Performance Metrics
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Cluster = Get-NTNXCluster
    $Hosts = Get-NTNXHost
    $VMs = Get-NTNXVM
    
    # Cluster-level metrics
    $ClusterMetrics = [PSCustomObject]@{
        ResourceType = "Cluster"
        Name = $Cluster.name
        CPUUsagePercent = [math]::Round($Cluster.stats.hypervisor_cpu_usage_ppm/10000,2)
        MemoryUsagePercent = [math]::Round($Cluster.stats.hypervisor_memory_usage_ppm/10000,2)
        IOPS = $Cluster.stats.controller_num_iops
        Latency_us = $Cluster.stats.controller_avg_io_latency_usecs
        Throughput_MBps = [math]::Round($Cluster.stats.controller_io_bandwidth_kBps/1024,2)
    }
    
    # Host-level metrics
    $HostMetrics = $Hosts | ForEach-Object {
        [PSCustomObject]@{
            ResourceType = "Host"
            Name = $_.name
            CPUUsagePercent = [math]::Round($_.stats.hypervisor_cpu_usage_ppm/10000,2)
            MemoryUsagePercent = [math]::Round($_.stats.hypervisor_memory_usage_ppm/10000,2)
            IOPS = $_.stats.controller_num_iops
            Latency_us = $_.stats.controller_avg_io_latency_usecs
            Throughput_MBps = [math]::Round($_.stats.controller_io_bandwidth_kBps/1024,2)
        }
    }
    
    # Combine all metrics
    $AllMetrics = @($ClusterMetrics) + $HostMetrics
    
    $AllMetrics | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Performance report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Metrics: $($AllMetrics.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Performance export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-manage-vm-network',
    name: 'Manage VM Network Configuration',
    category: 'Common Admin Tasks',
    description: 'Configure network adapters for virtual machines',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'networkName', label: 'Network Name', type: 'text', required: true, placeholder: 'Production-Network' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove', 'Change'], defaultValue: 'Add' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      const networkName = escapePowerShellString(params.networkName);
      const action = params.action;
      
      return `# Manage VM Network Configuration
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VM = Get-NTNXVM | Where-Object { $_.vmName -eq "${vmName}" }
    $Network = Get-NTNXNetwork | Where-Object { $_.name -eq "${networkName}" }
    
    if ($VM -and $Network) {
${action === 'Add' ? `        # Add network adapter
        $NicSpec = @{
            networkUuid = $Network.uuid
            requestedIpAddress = $null
        }
        
        Add-NTNXVMNic -Vmid $VM.vmId -Body $NicSpec
        Write-Host "✓ Network adapter added to ${vmName}" -ForegroundColor Green` :
action === 'Remove' ? `        # Remove first network adapter
        $Nics = Get-NTNXVMNic -Vmid $VM.vmId
        if ($Nics.Count -gt 0) {
            Remove-NTNXVMNic -Vmid $VM.vmId -NicId $Nics[0].uuid
            Write-Host "✓ Network adapter removed from ${vmName}" -ForegroundColor Green
        }` :
`        # Change network adapter to new network
        $Nics = Get-NTNXVMNic -Vmid $VM.vmId
        if ($Nics.Count -gt 0) {
            $UpdateSpec = @{
                networkUuid = $Network.uuid
            }
            Set-NTNXVMNic -Vmid $VM.vmId -NicId $Nics[0].uuid -Body $UpdateSpec
            Write-Host "✓ Network changed for ${vmName} to ${networkName}" -ForegroundColor Green
        }`}
    } else {
        Write-Error "VM or Network not found"
    }
    
} catch {
    Write-Error "Network configuration failed: $_"
}`;
    },
    isPremium: true
  }
];
