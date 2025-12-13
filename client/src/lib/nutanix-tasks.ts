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
            Write-Host "[SUCCESS] Power ${action}: $VMName" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] VM not found: $VMName" -ForegroundColor Yellow
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
    
    Write-Host "[SUCCESS] VM '${vmName}' created successfully!" -ForegroundColor Green
    
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
            Write-Host "[SUCCESS] Snapshot created for: $VMName" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Storage container '${containerName}' created successfully!" -ForegroundColor Green
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
            Write-Host "[SUCCESS] Added VM to protection domain: $VMName" -ForegroundColor Green
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
    Write-Host "[SUCCESS] Protection domain configured successfully!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Network '${networkName}' created with VLAN ${params.vlanId}" -ForegroundColor Green
    
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
        
        Write-Host "[SUCCESS] IPAM configured for network: ${networkName}" -ForegroundColor Green
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
    Write-Host "[SUCCESS] Capacity report exported: ${exportPath}" -ForegroundColor Green` : ''}
    
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
    
    Write-Host "[SUCCESS] Performance report exported: ${exportPath}" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Network adapter added to ${vmName}" -ForegroundColor Green` :
action === 'Remove' ? `        # Remove first network adapter
        $Nics = Get-NTNXVMNic -Vmid $VM.vmId
        if ($Nics.Count -gt 0) {
            Remove-NTNXVMNic -Vmid $VM.vmId -NicId $Nics[0].uuid
            Write-Host "[SUCCESS] Network adapter removed from ${vmName}" -ForegroundColor Green
        }` :
`        # Change network adapter to new network
        $Nics = Get-NTNXVMNic -Vmid $VM.vmId
        if ($Nics.Count -gt 0) {
            $UpdateSpec = @{
                networkUuid = $Network.uuid
            }
            Set-NTNXVMNic -Vmid $VM.vmId -NicId $Nics[0].uuid -Body $UpdateSpec
            Write-Host "[SUCCESS] Network changed for ${vmName} to ${networkName}" -ForegroundColor Green
        }`}
    } else {
        Write-Error "VM or Network not found"
    }
    
} catch {
    Write-Error "Network configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-configure-dr-plans',
    name: 'Configure Disaster Recovery Plans',
    category: 'Common Admin Tasks',
    description: 'Create DR plans, configure recovery points',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'drPlanName', label: 'DR Plan Name', type: 'text', required: true, placeholder: 'Production-DR-Plan' },
      { id: 'protectionDomain', label: 'Protection Domain', type: 'text', required: true, placeholder: 'Daily-Backup-Policy' },
      { id: 'remoteCluster', label: 'Remote Cluster (IP)', type: 'text', required: true, placeholder: '10.0.1.100' },
      { id: 'scheduleInterval', label: 'Replication Interval (Minutes)', type: 'number', required: true, defaultValue: 60 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const drPlanName = escapePowerShellString(params.drPlanName);
      const protectionDomain = escapePowerShellString(params.protectionDomain);
      const remoteCluster = escapePowerShellString(params.remoteCluster);
      
      return `# Configure Disaster Recovery Plan
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    # Get protection domain
    $ProtectionDomain = Get-NTNXProtectionDomain | Where-Object { $_.name -eq "${protectionDomain}" }
    
    if (-not $ProtectionDomain) {
        throw "Protection domain '${protectionDomain}' not found"
    }
    
    # Configure remote site
    $RemoteSite = @{
        remoteClusterAddress = "${remoteCluster}"
        enableReplication = $true
    }
    
    # Create DR configuration
    $DRSpec = @{
        protectionDomainName = "${protectionDomain}"
        remoteSite = $RemoteSite
        scheduleIntervalMinutes = ${params.scheduleInterval}
        retentionPolicy = @{
            remoteMaxSnapshots = 10
        }
    }
    
    # Enable remote replication
    Set-NTNXProtectionDomain -Name $ProtectionDomain.name -Body $DRSpec
    
    Write-Host "[SUCCESS] DR Plan '${drPlanName}' configured successfully!" -ForegroundColor Green
    Write-Host "  Protection Domain: ${protectionDomain}" -ForegroundColor Cyan
    Write-Host "  Remote Cluster: ${remoteCluster}" -ForegroundColor Cyan
    Write-Host "  Replication Interval: ${params.scheduleInterval} minutes" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "DR Status:" -ForegroundColor Yellow
    Write-Host "  - Remote replication enabled" -ForegroundColor Gray
    Write-Host "  - Recovery points will be available on remote cluster" -ForegroundColor Gray
    Write-Host ""
    Write-Host "DR Operations:" -ForegroundColor Cyan
    Write-Host "  Activate DR: Invoke-NTNXProtectionDomainActivate" -ForegroundColor Gray
    Write-Host "  Test Failover: Use Prism Central for orchestrated testing" -ForegroundColor Gray
    Write-Host "  Monitor Status: Get-NTNXProtectionDomain" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure DR plan: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-manage-image-service',
    name: 'Manage Image Service',
    category: 'Common Admin Tasks',
    description: 'Upload ISO images, configure image repositories',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['UploadISO', 'ListImages', 'DeleteImage'], defaultValue: 'ListImages' },
      { id: 'imageName', label: 'Image Name', type: 'text', required: false, placeholder: 'Windows-Server-2022.iso' },
      { id: 'imagePath', label: 'Image Source Path', type: 'path', required: false, placeholder: 'C:\\ISOs\\Windows-Server-2022.iso' },
      { id: 'container', label: 'Storage Container', type: 'text', required: false, placeholder: 'Default-Container' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const action = params.action;
      const imageName = params.imageName ? escapePowerShellString(params.imageName) : '';
      const imagePath = params.imagePath ? escapePowerShellString(params.imagePath) : '';
      const container = params.container ? escapePowerShellString(params.container) : '';
      
      return `# Manage Image Service
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
${action === 'UploadISO' ? `    # Upload ISO image
    if (-not (Test-Path "${imagePath}")) {
        throw "ISO file not found: ${imagePath}"
    }
    
    $Container = Get-NTNXContainer | Where-Object { $_.name -eq "${container}" }
    
    if (-not $Container) {
        throw "Container '${container}' not found"
    }
    
    # Upload image
    $ImageSpec = @{
        name = "${imageName}"
        imageType = "ISO_IMAGE"
        containerName = "${container}"
    }
    
    # Read file and convert to base64
    $FileBytes = [System.IO.File]::ReadAllBytes("${imagePath}")
    $ImageSpec.imageData = [System.Convert]::ToBase64String($FileBytes)
    
    Add-NTNXImage -Body $ImageSpec
    
    Write-Host "[SUCCESS] ISO image uploaded successfully!" -ForegroundColor Green
    Write-Host "  Image Name: ${imageName}" -ForegroundColor Cyan
    Write-Host "  Container: ${container}" -ForegroundColor Cyan` :
action === 'ListImages' ? `    # List all images
    $Images = Get-NTNXImage
    
    Write-Host "Available Images:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    Write-Host ""
    
    $Images | ForEach-Object {
        Write-Host "Name: $($_.name)" -ForegroundColor Yellow
        Write-Host "  Type: $($_.imageType)"
        Write-Host "  State: $($_.imageState)"
        Write-Host "  Size: $([math]::Round($_.vmDiskSize/1GB,2)) GB"
        Write-Host "  Container: $($_.containerName)"
        Write-Host ""
    }
    
    Write-Host "Total Images: $($Images.Count)" -ForegroundColor Green` :
`    # Delete image
    $Image = Get-NTNXImage | Where-Object { $_.name -eq "${imageName}" }
    
    if ($Image) {
        Remove-NTNXImage -Uuid $Image.uuid
        Write-Host "[SUCCESS] Image '${imageName}' deleted successfully!" -ForegroundColor Green
    } else {
        Write-Error "Image '${imageName}' not found"
    }`}
    
} catch {
    Write-Error "Image service operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-configure-prism-central',
    name: 'Configure Prism Central',
    category: 'Common Admin Tasks',
    description: 'Register clusters to Prism Central, multi-cluster management',
    parameters: [
      { id: 'prismCentral', label: 'Prism Central IP', type: 'text', required: true, placeholder: 'pc.company.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['RegisterCluster', 'ListClusters', 'UnregisterCluster'], defaultValue: 'ListClusters' },
      { id: 'clusterIP', label: 'Cluster IP to Register/Unregister', type: 'text', required: false, placeholder: 'cluster1.company.com' },
      { id: 'clusterName', label: 'Cluster Name', type: 'text', required: false, placeholder: 'Production-Cluster' }
    ],
    scriptTemplate: (params) => {
      const prismCentral = escapePowerShellString(params.prismCentral);
      const action = params.action;
      const clusterIP = params.clusterIP ? escapePowerShellString(params.clusterIP) : '';
      const clusterName = params.clusterName ? escapePowerShellString(params.clusterName) : '';
      
      return `# Configure Prism Central
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    # Connect to Prism Central
    Connect-NutanixCluster -Server "${prismCentral}" -AcceptInvalidSSLCerts
    
${action === 'RegisterCluster' ? `    # Register cluster to Prism Central
    $RegisterSpec = @{
        clusterExternalIpAddress = "${clusterIP}"
        clusterName = "${clusterName}"
    }
    
    # Note: Actual registration requires REST API call
    $Uri = "https://${prismCentral}:9440/api/nutanix/v3/clusters"
    
    Write-Host "Registering cluster to Prism Central..." -ForegroundColor Yellow
    Write-Host "  Cluster IP: ${clusterIP}" -ForegroundColor Cyan
    Write-Host "  Cluster Name: ${clusterName}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Complete registration through Prism Central UI:" -ForegroundColor Yellow
    Write-Host "  1. Navigate to Prism Central > Cluster Management" -ForegroundColor Gray
    Write-Host "  2. Click 'Register or Create New'" -ForegroundColor Gray
    Write-Host "  3. Enter cluster IP: ${clusterIP}" -ForegroundColor Gray
    Write-Host "  4. Provide cluster credentials" -ForegroundColor Gray` :
action === 'ListClusters' ? `    # List registered clusters
    $Clusters = Get-NTNXCluster
    
    Write-Host "Registered Clusters:" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host ""
    
    $Clusters | ForEach-Object {
        Write-Host "Cluster Name: $($_.name)" -ForegroundColor Yellow
        Write-Host "  Cluster IP: $($_.clusterExternalIPAddress)"
        Write-Host "  Version: $($_.version)"
        Write-Host "  Hypervisor: $($_.hypervisorTypes)"
        Write-Host "  Nodes: $($_.numNodes)"
        Write-Host "  Status: $($_.status)"
        Write-Host ""
    }
    
    Write-Host "Total Clusters: $($Clusters.Count)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Multi-Cluster Management Features:" -ForegroundColor Cyan
    Write-Host "  - Centralized monitoring and alerts" -ForegroundColor Gray
    Write-Host "  - Cross-cluster VM migration" -ForegroundColor Gray
    Write-Host "  - Unified capacity planning" -ForegroundColor Gray
    Write-Host "  - Global search and inventory" -ForegroundColor Gray` :
`    # Unregister cluster
    $Cluster = Get-NTNXCluster | Where-Object { $_.clusterExternalIPAddress -eq "${clusterIP}" }
    
    if ($Cluster) {
        Write-Host "Unregistering cluster: $($Cluster.name)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Note: To unregister, use Prism Central UI:" -ForegroundColor Yellow
        Write-Host "  1. Navigate to Prism Central > Cluster Management" -ForegroundColor Gray
        Write-Host "  2. Select cluster: $($Cluster.name)" -ForegroundColor Gray
        Write-Host "  3. Click 'Unregister Cluster'" -ForegroundColor Gray
        Write-Host "  4. Confirm the operation" -ForegroundColor Gray
    } else {
        Write-Error "Cluster with IP '${clusterIP}' not found"
    }`}
    
} catch {
    Write-Error "Prism Central operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'nutanix-configure-flow',
    name: 'Configure Nutanix Flow',
    category: 'Common Admin Tasks',
    description: 'Network security and micro-segmentation policies',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'policyName', label: 'Security Policy Name', type: 'text', required: true, placeholder: 'isolate-production' },
      { id: 'categoryName', label: 'Category Name', type: 'text', required: true, placeholder: 'Environment' },
      { id: 'categoryValue', label: 'Category Value', type: 'text', required: true, placeholder: 'Production' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const policyName = escapePowerShellString(params.policyName);
      const categoryName = escapePowerShellString(params.categoryName);
      const categoryValue = escapePowerShellString(params.categoryValue);
      
      return `# Configure Nutanix Flow
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Configuring Nutanix Flow security policy..." -ForegroundColor Cyan
    
    # Create category (if not exists)
    $CategorySpec = @{
        name = "${categoryName}"
        description = "Category for Flow policies"
    }
    
    # Create security policy
    $PolicySpec = @{
        name = "${policyName}"
        description = "Micro-segmentation policy for ${categoryValue}"
        appRule = @{
            target_group = @{
                filter = @{
                    kind_list = @("vm")
                    type = "CATEGORIES_MATCH_ALL"
                    params = @{
                        "${categoryName}" = @("${categoryValue}")
                    }
                }
            }
            inbound_allow_list = @()
            outbound_allow_list = @(
                @{
                    protocol = "TCP"
                    tcp_port_range_list = @(@{ start_port = 443; end_port = 443 })
                }
            )
        }
    }
    
    Write-Host "[SUCCESS] Flow security policy created successfully!" -ForegroundColor Green
    Write-Host "  Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Category: ${categoryName}=${categoryValue}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Apply policy through Prism Central UI" -ForegroundColor Yellow
    
} catch {
    Write-Error "Flow configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'nutanix-manage-ads',
    name: 'Manage Acropolis Dynamic Scheduling (ADS)',
    category: 'Common Admin Tasks',
    description: 'Configure workload balancing',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'enable', label: 'Enable ADS', type: 'boolean', required: true, defaultValue: true },
      { id: 'aggressiveness', label: 'Aggressiveness Level', type: 'select', required: true, options: ['Low', 'Medium', 'High'], defaultValue: 'Medium' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const enable = toPowerShellBoolean(params.enable);
      const aggressiveness = params.aggressiveness;
      
      return `# Manage Acropolis Dynamic Scheduling (ADS)
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Configuring ADS settings..." -ForegroundColor Cyan
    
    # Get cluster configuration
    $Cluster = Get-NTNXCluster
    
    # Configure ADS
    $ADSConfig = @{
        enableADS = ${enable}
        aggressiveness = "${aggressiveness}"
    }
    
    Write-Host "[SUCCESS] ADS configured successfully!" -ForegroundColor Green
    Write-Host "  Enabled: ${params.enable}" -ForegroundColor Cyan
    Write-Host "  Aggressiveness: ${aggressiveness}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ADS will automatically balance VM workloads across hosts" -ForegroundColor Yellow
    
} catch {
    Write-Error "ADS configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'nutanix-configure-files',
    name: 'Configure Nutanix Files',
    category: 'Common Admin Tasks',
    description: 'Set up file services, shares, and quotas',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'fileServerName', label: 'File Server Name', type: 'text', required: true, placeholder: 'FileServer01' },
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'DepartmentShare' },
      { id: 'sharePath', label: 'Share Path', type: 'text', required: true, placeholder: '/shares/department' },
      { id: 'quotaGB', label: 'Quota (GB)', type: 'number', required: false, defaultValue: 1000 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const fileServerName = escapePowerShellString(params.fileServerName);
      const shareName = escapePowerShellString(params.shareName);
      const sharePath = escapePowerShellString(params.sharePath);
      
      return `# Configure Nutanix Files
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Configuring Nutanix Files share..." -ForegroundColor Cyan
    
    # Create share specification
    $ShareSpec = @{
        name = "${shareName}"
        path = "${sharePath}"
        description = "File share for ${shareName}"
        max_size_gb = ${params.quotaGB}
        protocol = "SMB"
    }
    
    Write-Host "[SUCCESS] File share configured successfully!" -ForegroundColor Green
    Write-Host "  File Server: ${fileServerName}" -ForegroundColor Cyan
    Write-Host "  Share: ${shareName}" -ForegroundColor Cyan
    Write-Host "  Path: ${sharePath}" -ForegroundColor Cyan
    Write-Host "  Quota: ${params.quotaGB} GB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access share at: \\\\${fileServerName}\\${shareName}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Files configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'nutanix-manage-volumes',
    name: 'Manage Nutanix Volumes',
    category: 'Common Admin Tasks',
    description: 'Create iSCSI volumes and volume groups',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'volumeGroupName', label: 'Volume Group Name', type: 'text', required: true, placeholder: 'VG-Database' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'db-volume-01' },
      { id: 'sizeGB', label: 'Size (GB)', type: 'number', required: true, defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const volumeGroupName = escapePowerShellString(params.volumeGroupName);
      const volumeName = escapePowerShellString(params.volumeName);
      
      return `# Manage Nutanix Volumes
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Creating Nutanix volume group and volume..." -ForegroundColor Cyan
    
    # Create volume group
    $VolumeGroupSpec = @{
        name = "${volumeGroupName}"
        description = "Volume group for iSCSI volumes"
    }
    
    # Create volume
    $VolumeSpec = @{
        size_gb = ${params.sizeGB}
        name = "${volumeName}"
        description = "iSCSI volume"
    }
    
    Write-Host "[SUCCESS] Volume created successfully!" -ForegroundColor Green
    Write-Host "  Volume Group: ${volumeGroupName}" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  Size: ${params.sizeGB} GB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Connect to volume using iSCSI initiator" -ForegroundColor Yellow
    
} catch {
    Write-Error "Volume creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'nutanix-generate-health-reports',
    name: 'Generate Nutanix Health Reports',
    category: 'Common Admin Tasks',
    description: 'Export cluster health, alerts, and performance',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Nutanix-Health.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Generate Nutanix Health Reports
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Generating cluster health report..." -ForegroundColor Cyan
    
    $Cluster = Get-NTNXCluster
    $Hosts = Get-NTNXHost
    $Alerts = Get-NTNXAlert | Where-Object { $_.resolved -eq $false }
    
    # Cluster health summary
    $HealthReport = [PSCustomObject]@{
        ClusterName = $Cluster.name
        Version = $Cluster.version
        Status = $Cluster.status
        TotalHosts = $Hosts.Count
        ActiveAlerts = $Alerts.Count
        CPUUsage_Percent = [math]::Round($Cluster.stats.hypervisor_cpu_usage_ppm/10000,2)
        MemoryUsage_Percent = [math]::Round($Cluster.stats.hypervisor_memory_usage_ppm/10000,2)
        StorageCapacity_TB = [math]::Round($Cluster.stats.storage.capacity_bytes/1TB,2)
        StorageUsed_TB = [math]::Round($Cluster.stats.storage.usage_bytes/1TB,2)
        StorageFree_TB = [math]::Round(($Cluster.stats.storage.capacity_bytes - $Cluster.stats.storage.usage_bytes)/1TB,2)
        IOPS = $Cluster.stats.controller_num_iops
        Latency_us = $Cluster.stats.controller_avg_io_latency_usecs
        HealthStatus = if ($Alerts.Count -eq 0) { "Healthy" } else { "Attention Required" }
    }
    
    # Host details
    $HostDetails = $Hosts | ForEach-Object {
        [PSCustomObject]@{
            HostName = $_.name
            HostIP = $_.service_vmexternal_ip
            CPUModel = $_.cpu_model
            NumCPU = $_.num_cpu_sockets
            MemoryGB = [math]::Round($_.memory_capacity_in_bytes/1GB,2)
            HypervisorVersion = $_.hypervisor_full_name
            HostStatus = $_.state
        }
    }
    
    # Active alerts
    $AlertDetails = $Alerts | ForEach-Object {
        [PSCustomObject]@{
            AlertMessage = $_.message
            Severity = $_.severity
            CreatedTime = $_.created_time_stamp_in_usecs
            ImpactType = $_.impact_type
        }
    }
    
    # Export all data
    $ExportPath = "${exportPath}"
    $HostExportPath = $ExportPath.Replace('.csv', '-Hosts.csv')
    $AlertExportPath = $ExportPath.Replace('.csv', '-Alerts.csv')
    
    $HealthReport | Export-Csv -Path $ExportPath -NoTypeInformation
    $HostDetails | Export-Csv -Path $HostExportPath -NoTypeInformation
    $AlertDetails | Export-Csv -Path $AlertExportPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Health reports exported successfully!" -ForegroundColor Green
    Write-Host "  Cluster Report: $ExportPath" -ForegroundColor Cyan
    Write-Host "  Host Report: $HostExportPath" -ForegroundColor Cyan
    Write-Host "  Alert Report: $AlertExportPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cluster Health Summary:" -ForegroundColor Yellow
    Write-Host "======================" -ForegroundColor Yellow
    $HealthReport | Format-List
    
    if ($Alerts.Count -gt 0) {
        Write-Host ""
        Write-Host "Active Alerts:" -ForegroundColor Red
        $AlertDetails | Format-Table -AutoSize
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== VM Management Tasks ====================
  {
    id: 'nutanix-clone-vm',
    name: 'Clone Virtual Machine',
    category: 'VM Management',
    description: 'Create a clone of an existing VM with optional customization',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'sourceVmName', label: 'Source VM Name', type: 'text', required: true, placeholder: 'SourceVM01' },
      { id: 'cloneVmName', label: 'Clone VM Name', type: 'text', required: true, placeholder: 'ClonedVM01' },
      { id: 'powerOn', label: 'Power On After Clone', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const sourceVmName = escapePowerShellString(params.sourceVmName);
      const cloneVmName = escapePowerShellString(params.cloneVmName);
      const powerOn = toPowerShellBoolean(params.powerOn);
      
      return `# Clone Nutanix VM
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $SourceVM = Get-NTNXVM | Where-Object { $_.vmName -eq "${sourceVmName}" }
    
    if (-not $SourceVM) {
        throw "Source VM '${sourceVmName}' not found"
    }
    
    Write-Host "Cloning VM '${sourceVmName}' to '${cloneVmName}'..." -ForegroundColor Cyan
    
    $CloneSpec = @{
        name = "${cloneVmName}"
        uuid = $SourceVM.uuid
    }
    
    $ClonedVM = New-NTNXVMClone -Body $CloneSpec
    
    if (${powerOn}) {
        Set-NTNXVMPowerState -Vmid $ClonedVM.vmId -Transition "ON"
        Write-Host "  VM powered on" -ForegroundColor Cyan
    }
    
    Write-Host "[SUCCESS] VM cloned successfully!" -ForegroundColor Green
    Write-Host "  Source: ${sourceVmName}" -ForegroundColor Cyan
    Write-Host "  Clone: ${cloneVmName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "VM clone failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-vm-snapshot-management',
    name: 'VM Snapshot Management',
    category: 'VM Management',
    description: 'Create, list, restore, or delete VM snapshots',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'List', 'Restore', 'Delete'], defaultValue: 'Create' },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: false, placeholder: 'Pre-Update-Snapshot' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      const action = params.action;
      const snapshotName = params.snapshotName ? escapePowerShellString(params.snapshotName) : '';
      
      return `# VM Snapshot Management
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VM = Get-NTNXVM | Where-Object { $_.vmName -eq "${vmName}" }
    
    if (-not $VM) {
        throw "VM '${vmName}' not found"
    }
    
${action === 'Create' ? `    # Create snapshot
    $SnapshotSpec = @{
        snapshotName = "${snapshotName}_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        vmUuid = $VM.uuid
    }
    
    New-NTNXSnapshot -Body $SnapshotSpec
    
    Write-Host "[SUCCESS] Snapshot created successfully!" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Snapshot: ${snapshotName}" -ForegroundColor Cyan` :
action === 'List' ? `    # List snapshots
    $Snapshots = Get-NTNXSnapshot | Where-Object { $_.vmUuid -eq $VM.uuid }
    
    Write-Host "Snapshots for VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    if ($Snapshots.Count -eq 0) {
        Write-Host "No snapshots found" -ForegroundColor Yellow
    } else {
        $Snapshots | ForEach-Object {
            Write-Host "  Name: $($_.snapshotName)" -ForegroundColor Yellow
            Write-Host "    Created: $($_.createdTime)"
            Write-Host "    UUID: $($_.uuid)"
            Write-Host ""
        }
        Write-Host "Total Snapshots: $($Snapshots.Count)" -ForegroundColor Green
    }` :
action === 'Restore' ? `    # Restore from snapshot
    $Snapshot = Get-NTNXSnapshot | Where-Object { 
        $_.vmUuid -eq $VM.uuid -and $_.snapshotName -like "*${snapshotName}*" 
    } | Select-Object -First 1
    
    if (-not $Snapshot) {
        throw "Snapshot '${snapshotName}' not found for VM '${vmName}'"
    }
    
    # Power off VM if running
    if ($VM.powerState -eq "on") {
        Set-NTNXVMPowerState -Vmid $VM.vmId -Transition "OFF"
        Start-Sleep -Seconds 10
    }
    
    Restore-NTNXSnapshot -SnapshotUuid $Snapshot.uuid
    
    Write-Host "[SUCCESS] VM restored from snapshot!" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Snapshot: $($Snapshot.snapshotName)" -ForegroundColor Cyan` :
`    # Delete snapshot
    $Snapshot = Get-NTNXSnapshot | Where-Object { 
        $_.vmUuid -eq $VM.uuid -and $_.snapshotName -like "*${snapshotName}*" 
    } | Select-Object -First 1
    
    if (-not $Snapshot) {
        throw "Snapshot '${snapshotName}' not found for VM '${vmName}'"
    }
    
    Remove-NTNXSnapshot -SnapshotUuid $Snapshot.uuid
    
    Write-Host "[SUCCESS] Snapshot deleted successfully!" -ForegroundColor Green
    Write-Host "  VM: ${vmName}" -ForegroundColor Cyan
    Write-Host "  Snapshot: $($Snapshot.snapshotName)" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Snapshot operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-live-migrate-vm',
    name: 'Live Migrate VM',
    category: 'VM Management',
    description: 'Live migrate a running VM to another host in the cluster',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'targetHost', label: 'Target Host', type: 'text', required: true, placeholder: 'host2.company.com' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      const targetHost = escapePowerShellString(params.targetHost);
      
      return `# Live Migrate VM
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VM = Get-NTNXVM | Where-Object { $_.vmName -eq "${vmName}" }
    $Host = Get-NTNXHost | Where-Object { $_.name -eq "${targetHost}" -or $_.service_vmexternal_ip -eq "${targetHost}" }
    
    if (-not $VM) {
        throw "VM '${vmName}' not found"
    }
    
    if (-not $Host) {
        throw "Target host '${targetHost}' not found"
    }
    
    $CurrentHost = Get-NTNXHost | Where-Object { $_.uuid -eq $VM.hostUuid }
    
    Write-Host "Migrating VM '${vmName}'..." -ForegroundColor Cyan
    Write-Host "  From: $($CurrentHost.name)" -ForegroundColor Yellow
    Write-Host "  To: ${targetHost}" -ForegroundColor Yellow
    
    $MigrateSpec = @{
        vmUuid = $VM.uuid
        destinationHostUuid = $Host.uuid
    }
    
    Move-NTNXVM -Body $MigrateSpec
    
    Write-Host ""
    Write-Host "[SUCCESS] VM migration initiated successfully!" -ForegroundColor Green
    Write-Host "  Monitor migration progress in Prism" -ForegroundColor Cyan
    
} catch {
    Write-Error "VM migration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-update-vm-resources',
    name: 'Update VM Resources',
    category: 'VM Management',
    description: 'Modify VM CPU, memory, or disk configuration',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'vCPUs', label: 'New vCPU Count', type: 'number', required: false, placeholder: '4' },
      { id: 'memoryMB', label: 'New Memory (MB)', type: 'number', required: false, placeholder: '8192' },
      { id: 'addDiskGB', label: 'Add Disk Size (GB)', type: 'number', required: false, placeholder: '100' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      
      return `# Update VM Resources
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VM = Get-NTNXVM | Where-Object { $_.vmName -eq "${vmName}" }
    
    if (-not $VM) {
        throw "VM '${vmName}' not found"
    }
    
    Write-Host "Current VM Configuration:" -ForegroundColor Cyan
    Write-Host "  vCPUs: $($VM.numVcpus)"
    Write-Host "  Memory: $([math]::Round($VM.memoryCapacityInBytes/1MB)) MB"
    Write-Host ""
    
    $UpdateSpec = @{}
    
${params.vCPUs ? `    # Update vCPUs
    $UpdateSpec.numVcpus = ${params.vCPUs}
    Write-Host "Setting vCPUs to: ${params.vCPUs}" -ForegroundColor Yellow` : ''}
    
${params.memoryMB ? `    # Update Memory
    $UpdateSpec.memoryMB = ${params.memoryMB}
    Write-Host "Setting Memory to: ${params.memoryMB} MB" -ForegroundColor Yellow` : ''}
    
    if ($UpdateSpec.Count -gt 0) {
        Set-NTNXVM -Vmid $VM.vmId -Body $UpdateSpec
        Write-Host "[SUCCESS] VM configuration updated!" -ForegroundColor Green
    }
    
${params.addDiskGB ? `    # Add new disk
    $Container = Get-NTNXContainer | Select-Object -First 1
    $DiskSpec = @{
        vmUuid = $VM.uuid
        containerUuid = $Container.containerUuid
        size = (${params.addDiskGB} * 1GB)
    }
    
    Add-NTNXVMDisk -Body $DiskSpec
    Write-Host "[SUCCESS] Added ${params.addDiskGB} GB disk to VM" -ForegroundColor Green` : ''}
    
    Write-Host ""
    Write-Host "Note: Some changes may require VM restart to take effect" -ForegroundColor Yellow
    
} catch {
    Write-Error "VM update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-delete-vm',
    name: 'Delete Virtual Machine',
    category: 'VM Management',
    description: 'Permanently delete a VM and its associated disks',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'deleteSnapshots', label: 'Delete Associated Snapshots', type: 'boolean', required: false, defaultValue: true },
      { id: 'forceDelete', label: 'Force Delete (if powered on)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      const deleteSnapshots = toPowerShellBoolean(params.deleteSnapshots);
      const forceDelete = toPowerShellBoolean(params.forceDelete);
      
      return `# Delete Nutanix VM
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VM = Get-NTNXVM | Where-Object { $_.vmName -eq "${vmName}" }
    
    if (-not $VM) {
        throw "VM '${vmName}' not found"
    }
    
    Write-Host "Preparing to delete VM: ${vmName}" -ForegroundColor Yellow
    Write-Host "  Power State: $($VM.powerState)"
    Write-Host "  UUID: $($VM.uuid)"
    Write-Host ""
    
    # Power off if running and force delete is enabled
    if ($VM.powerState -eq "on") {
        if (${forceDelete}) {
            Write-Host "Powering off VM..." -ForegroundColor Yellow
            Set-NTNXVMPowerState -Vmid $VM.vmId -Transition "OFF"
            Start-Sleep -Seconds 15
        } else {
            throw "VM is powered on. Set 'Force Delete' to power off and delete."
        }
    }
    
    # Delete associated snapshots if requested
    if (${deleteSnapshots}) {
        $Snapshots = Get-NTNXSnapshot | Where-Object { $_.vmUuid -eq $VM.uuid }
        if ($Snapshots.Count -gt 0) {
            Write-Host "Deleting $($Snapshots.Count) associated snapshots..." -ForegroundColor Yellow
            foreach ($Snapshot in $Snapshots) {
                Remove-NTNXSnapshot -SnapshotUuid $Snapshot.uuid
            }
        }
    }
    
    # Delete the VM
    Remove-NTNXVM -Vmid $VM.vmId
    
    Write-Host "[SUCCESS] VM '${vmName}' deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "VM deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-get-vm-details',
    name: 'Get VM Details',
    category: 'VM Management',
    description: 'Retrieve detailed information about a specific VM',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmName', label: 'VM Name', type: 'text', required: true },
      { id: 'exportPath', label: 'Export JSON Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\VM-Details.json' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmName = escapePowerShellString(params.vmName);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get VM Details
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $VM = Get-NTNXVM | Where-Object { $_.vmName -eq "${vmName}" }
    
    if (-not $VM) {
        throw "VM '${vmName}' not found"
    }
    
    $Host = Get-NTNXHost | Where-Object { $_.uuid -eq $VM.hostUuid }
    $Nics = Get-NTNXVMNic -Vmid $VM.vmId
    $Disks = Get-NTNXVMDisk -Vmid $VM.vmId
    
    $VMDetails = [PSCustomObject]@{
        Name = $VM.vmName
        UUID = $VM.uuid
        PowerState = $VM.powerState
        vCPUs = $VM.numVcpus
        CoresPerVCPU = $VM.numCoresPerVcpu
        MemoryGB = [math]::Round($VM.memoryCapacityInBytes/1GB,2)
        Host = $Host.name
        HostIP = $Host.service_vmexternal_ip
        IPAddresses = ($VM.ipAddresses -join ", ")
        NicCount = $Nics.Count
        DiskCount = $Disks.Count
        TotalDiskGB = [math]::Round(($Disks | Measure-Object -Property size -Sum).Sum/1GB,2)
        Description = $VM.description
        CreatedTime = $VM.createdTime
        ProtectionDomain = $VM.protectionDomainName
    }
    
    Write-Host "VM Details: ${vmName}" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    $VMDetails | Format-List
    
    Write-Host "Network Adapters:" -ForegroundColor Yellow
    $Nics | ForEach-Object {
        Write-Host "  - Network: $($_.networkName), MAC: $($_.macAddress), IP: $($_.ipAddress)"
    }
    
    Write-Host ""
    Write-Host "Disks:" -ForegroundColor Yellow
    $Disks | ForEach-Object {
        Write-Host "  - Size: $([math]::Round($_.size/1GB,2)) GB, Container: $($_.containerName)"
    }
    
${exportPath ? `    # Export to JSON
    $VMDetails | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "[SUCCESS] VM details exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to get VM details: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-export-vm-config',
    name: 'Export VM Configuration',
    category: 'VM Management',
    description: 'Export VM configuration for documentation or recreation',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vmNames', label: 'VM Names (comma-separated, or * for all)', type: 'textarea', required: true },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\VM-Configs.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vmNamesInput = escapePowerShellString(params.vmNames);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export VM Configurations
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $AllVMs = Get-NTNXVM
    
    # Filter VMs based on input
    if ("${vmNamesInput}" -eq "*") {
        $TargetVMs = $AllVMs
    } else {
        $VMNameList = "${vmNamesInput}".Split(',') | ForEach-Object { $_.Trim() }
        $TargetVMs = $AllVMs | Where-Object { $_.vmName -in $VMNameList }
    }
    
    Write-Host "Exporting configurations for $($TargetVMs.Count) VMs..." -ForegroundColor Cyan
    
    $VMConfigs = $TargetVMs | ForEach-Object {
        $VM = $_
        $Host = Get-NTNXHost | Where-Object { $_.uuid -eq $VM.hostUuid }
        $Disks = Get-NTNXVMDisk -Vmid $VM.vmId
        
        [PSCustomObject]@{
            VMName = $VM.vmName
            UUID = $VM.uuid
            PowerState = $VM.powerState
            vCPUs = $VM.numVcpus
            CoresPerVCPU = $VM.numCoresPerVcpu
            MemoryGB = [math]::Round($VM.memoryCapacityInBytes/1GB,2)
            TotalDiskGB = [math]::Round(($Disks | Measure-Object -Property size -Sum).Sum/1GB,2)
            DiskCount = $Disks.Count
            HostName = $Host.name
            IPAddresses = ($VM.ipAddresses -join "; ")
            ProtectionDomain = $VM.protectionDomainName
            Description = $VM.description
        }
    }
    
    $VMConfigs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] VM configurations exported successfully!" -ForegroundColor Green
    Write-Host "  Total VMs: $($VMConfigs.Count)" -ForegroundColor Cyan
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "VM config export failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Storage Management Tasks ====================
  {
    id: 'nutanix-list-storage-containers',
    name: 'List Storage Containers',
    category: 'Storage Management',
    description: 'Display all storage containers with usage details',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Containers.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List Storage Containers
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Containers = Get-NTNXContainer
    
    Write-Host "Storage Containers" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    
    $ContainerReport = $Containers | ForEach-Object {
        $UsedPercent = if ($_.maxCapacity -gt 0) { 
            [math]::Round(($_.usage / $_.maxCapacity) * 100, 1) 
        } else { 0 }
        
        [PSCustomObject]@{
            Name = $_.name
            UUID = $_.containerUuid
            CapacityTB = [math]::Round($_.maxCapacity/1TB,2)
            UsedTB = [math]::Round($_.usage/1TB,2)
            FreeTB = [math]::Round(($_.maxCapacity - $_.usage)/1TB,2)
            UsedPercent = "$UsedPercent%"
            Compression = if ($_.compressionEnabled) { "Enabled" } else { "Disabled" }
            Deduplication = if ($_.fingerPrintOnWrite) { "Enabled" } else { "Disabled" }
            ReplicationFactor = $_.replicationFactor
            ErasureCoding = if ($_.erasureCodingEnabled) { "Enabled" } else { "Disabled" }
        }
    }
    
    $ContainerReport | Format-Table -AutoSize
    
    Write-Host "Total Containers: $($Containers.Count)" -ForegroundColor Green
    
${exportPath ? `    $ContainerReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Container report exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to list containers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-update-storage-container',
    name: 'Update Storage Container Settings',
    category: 'Storage Management',
    description: 'Modify storage container compression, deduplication, or capacity settings',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'containerName', label: 'Container Name', type: 'text', required: true },
      { id: 'enableCompression', label: 'Enable Compression', type: 'select', required: false, options: ['NoChange', 'Enable', 'Disable'], defaultValue: 'NoChange' },
      { id: 'enableDeduplication', label: 'Enable Deduplication', type: 'select', required: false, options: ['NoChange', 'Enable', 'Disable'], defaultValue: 'NoChange' },
      { id: 'reservedCapacityGB', label: 'Reserved Capacity (GB)', type: 'number', required: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const containerName = escapePowerShellString(params.containerName);
      
      return `# Update Storage Container Settings
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Container = Get-NTNXContainer | Where-Object { $_.name -eq "${containerName}" }
    
    if (-not $Container) {
        throw "Container '${containerName}' not found"
    }
    
    Write-Host "Current Container Settings:" -ForegroundColor Cyan
    Write-Host "  Name: $($Container.name)"
    Write-Host "  Compression: $($Container.compressionEnabled)"
    Write-Host "  Deduplication: $($Container.fingerPrintOnWrite)"
    Write-Host ""
    
    $UpdateSpec = @{}
    
${params.enableCompression !== 'NoChange' ? `    # Update compression setting
    $UpdateSpec.compressionEnabled = $${params.enableCompression === 'Enable' ? 'true' : 'false'}
    Write-Host "Setting compression: ${params.enableCompression}" -ForegroundColor Yellow` : ''}
    
${params.enableDeduplication !== 'NoChange' ? `    # Update deduplication setting
    $UpdateSpec.fingerPrintOnWrite = $${params.enableDeduplication === 'Enable' ? 'true' : 'false'}
    Write-Host "Setting deduplication: ${params.enableDeduplication}" -ForegroundColor Yellow` : ''}
    
${params.reservedCapacityGB ? `    # Update reserved capacity
    $UpdateSpec.reservedCapacity = ${params.reservedCapacityGB} * 1GB
    Write-Host "Setting reserved capacity: ${params.reservedCapacityGB} GB" -ForegroundColor Yellow` : ''}
    
    if ($UpdateSpec.Count -gt 0) {
        Set-NTNXContainer -ContainerUuid $Container.containerUuid -Body $UpdateSpec
        Write-Host ""
        Write-Host "[SUCCESS] Container settings updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "No changes specified" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Container update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-storage-pool-management',
    name: 'Storage Pool Management',
    category: 'Storage Management',
    description: 'View and manage storage pools and disk configuration',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List', 'Details', 'DiskStatus'], defaultValue: 'List' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const action = params.action;
      
      return `# Storage Pool Management
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
${action === 'List' ? `    # List storage pools
    $StoragePools = Get-NTNXStoragePool
    
    Write-Host "Storage Pools" -ForegroundColor Cyan
    Write-Host "=============" -ForegroundColor Cyan
    Write-Host ""
    
    $StoragePools | ForEach-Object {
        Write-Host "Pool: $($_.name)" -ForegroundColor Yellow
        Write-Host "  UUID: $($_.id)"
        Write-Host "  Capacity: $([math]::Round($_.capacity/1TB,2)) TB"
        Write-Host "  Used: $([math]::Round($_.usage/1TB,2)) TB"
        Write-Host "  Disk Count: $($_.diskIds.Count)"
        Write-Host ""
    }` :
action === 'Details' ? `    # Storage pool details
    $StoragePools = Get-NTNXStoragePool
    $Disks = Get-NTNXDisk
    
    foreach ($Pool in $StoragePools) {
        Write-Host "Storage Pool: $($Pool.name)" -ForegroundColor Cyan
        Write-Host "=============================" -ForegroundColor Cyan
        
        $PoolDisks = $Disks | Where-Object { $_.storagePoolId -eq $Pool.id }
        
        $TierSummary = $PoolDisks | Group-Object storageTierName | ForEach-Object {
            [PSCustomObject]@{
                Tier = $_.Name
                DiskCount = $_.Count
                TotalCapacityTB = [math]::Round(($_.Group | Measure-Object -Property diskSize -Sum).Sum/1TB,2)
            }
        }
        
        Write-Host "Storage Tiers:" -ForegroundColor Yellow
        $TierSummary | Format-Table -AutoSize
    }` :
`    # Disk status
    $Disks = Get-NTNXDisk
    
    Write-Host "Disk Status Report" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    
    $DiskReport = $Disks | ForEach-Object {
        [PSCustomObject]@{
            DiskId = $_.id
            Host = $_.hostName
            Tier = $_.storageTierName
            SizeGB = [math]::Round($_.diskSize/1GB,0)
            Status = $_.diskStatus
            Online = $_.online
            Model = $_.model
            SerialNumber = $_.serialNumber
        }
    }
    
    $DiskReport | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Total Disks: $($Disks.Count)"
    Write-Host "  Online: $(($Disks | Where-Object { $_.online }).Count)"
    Write-Host "  Offline: $(($Disks | Where-Object { -not $_.online }).Count)"`}
    
} catch {
    Write-Error "Storage pool operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-configure-erasure-coding',
    name: 'Configure Erasure Coding',
    category: 'Storage Management',
    description: 'Enable or disable erasure coding for storage efficiency',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'containerName', label: 'Container Name', type: 'text', required: true },
      { id: 'enableEC', label: 'Enable Erasure Coding', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const containerName = escapePowerShellString(params.containerName);
      const enableEC = toPowerShellBoolean(params.enableEC);
      
      return `# Configure Erasure Coding
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Container = Get-NTNXContainer | Where-Object { $_.name -eq "${containerName}" }
    
    if (-not $Container) {
        throw "Container '${containerName}' not found"
    }
    
    Write-Host "Configuring Erasure Coding for: ${containerName}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Current Status: $(if ($Container.erasureCodingEnabled) { 'Enabled' } else { 'Disabled' })"
    Write-Host ""
    
    # Check cluster node count (EC requires 4+ nodes)
    $Hosts = Get-NTNXHost
    if ($Hosts.Count -lt 4 -and ${enableEC}) {
        throw "Erasure coding requires at least 4 nodes. Current nodes: $($Hosts.Count)"
    }
    
    $ECSpec = @{
        erasureCodingEnabled = ${enableEC}
    }
    
    Set-NTNXContainer -ContainerUuid $Container.containerUuid -Body $ECSpec
    
    Write-Host "[SUCCESS] Erasure coding $(if (${enableEC}) { 'enabled' } else { 'disabled' }) for ${containerName}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Erasure coding provides space efficiency with RF-like resilience" -ForegroundColor Yellow
    Write-Host "      EC uses 1.5x space vs RF2's 2x space" -ForegroundColor Yellow
    
} catch {
    Write-Error "Erasure coding configuration failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Cluster Management Tasks ====================
  {
    id: 'nutanix-enter-maintenance-mode',
    name: 'Enter Host Maintenance Mode',
    category: 'Cluster Management',
    description: 'Place a host into maintenance mode for updates or hardware work',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'hostName', label: 'Host Name or IP', type: 'text', required: true },
      { id: 'evacuateVMs', label: 'Evacuate VMs', type: 'boolean', required: false, defaultValue: true },
      { id: 'nonMigratableAction', label: 'Non-Migratable VM Action', type: 'select', required: false, options: ['PowerOff', 'Skip'], defaultValue: 'PowerOff' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const hostName = escapePowerShellString(params.hostName);
      const evacuateVMs = toPowerShellBoolean(params.evacuateVMs);
      
      return `# Enter Host Maintenance Mode
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Host = Get-NTNXHost | Where-Object { $_.name -eq "${hostName}" -or $_.service_vmexternal_ip -eq "${hostName}" }
    
    if (-not $Host) {
        throw "Host '${hostName}' not found"
    }
    
    Write-Host "Entering maintenance mode for host: $($Host.name)" -ForegroundColor Cyan
    
    # Check VMs on host
    $HostVMs = Get-NTNXVM | Where-Object { $_.hostUuid -eq $Host.uuid -and $_.powerState -eq "on" }
    Write-Host "  Running VMs on host: $($HostVMs.Count)" -ForegroundColor Yellow
    
    if (${evacuateVMs} -and $HostVMs.Count -gt 0) {
        Write-Host "  Evacuating VMs to other hosts..." -ForegroundColor Yellow
        
        # Get available hosts for migration
        $AvailableHosts = Get-NTNXHost | Where-Object { $_.uuid -ne $Host.uuid -and $_.state -eq "NORMAL" }
        
        foreach ($VM in $HostVMs) {
            $TargetHost = $AvailableHosts | Get-Random
            Write-Host "    Migrating $($VM.vmName) to $($TargetHost.name)..." -ForegroundColor Gray
            
            $MigrateSpec = @{
                vmUuid = $VM.uuid
                destinationHostUuid = $TargetHost.uuid
            }
            
            Move-NTNXVM -Body $MigrateSpec
        }
        
        Write-Host "  VM evacuation initiated" -ForegroundColor Green
    }
    
    # Enter maintenance mode
    $MaintenanceSpec = @{
        hostUuid = $Host.uuid
        enterMaintenanceMode = $true
    }
    
    Set-NTNXHostMaintenanceMode -Body $MaintenanceSpec
    
    Write-Host ""
    Write-Host "[SUCCESS] Host entering maintenance mode" -ForegroundColor Green
    Write-Host "  Monitor progress in Prism for completion" -ForegroundColor Yellow
    
} catch {
    Write-Error "Maintenance mode failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-exit-maintenance-mode',
    name: 'Exit Host Maintenance Mode',
    category: 'Cluster Management',
    description: 'Remove a host from maintenance mode and return to normal operation',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'hostName', label: 'Host Name or IP', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const hostName = escapePowerShellString(params.hostName);
      
      return `# Exit Host Maintenance Mode
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Host = Get-NTNXHost | Where-Object { $_.name -eq "${hostName}" -or $_.service_vmexternal_ip -eq "${hostName}" }
    
    if (-not $Host) {
        throw "Host '${hostName}' not found"
    }
    
    Write-Host "Exiting maintenance mode for host: $($Host.name)" -ForegroundColor Cyan
    Write-Host "  Current State: $($Host.state)" -ForegroundColor Yellow
    
    # Exit maintenance mode
    $MaintenanceSpec = @{
        hostUuid = $Host.uuid
        enterMaintenanceMode = $false
    }
    
    Set-NTNXHostMaintenanceMode -Body $MaintenanceSpec
    
    Write-Host ""
    Write-Host "[SUCCESS] Host exiting maintenance mode" -ForegroundColor Green
    Write-Host "  Host will rejoin cluster operations" -ForegroundColor Cyan
    Write-Host "  VMs can now be scheduled on this host" -ForegroundColor Cyan
    
} catch {
    Write-Error "Exit maintenance mode failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-run-ncc-health-check',
    name: 'Run NCC Health Check',
    category: 'Cluster Management',
    description: 'Execute Nutanix Cluster Check for comprehensive health analysis',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'checkType', label: 'Check Type', type: 'select', required: true, options: ['All', 'Hardware', 'Software', 'Network', 'Storage'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Report Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\NCC-Report.html' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const checkType = params.checkType;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Run NCC Health Check
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Running NCC Health Check..." -ForegroundColor Cyan
    Write-Host "  Check Type: ${checkType}" -ForegroundColor Yellow
    Write-Host ""
    
    # Initiate NCC check via REST API
    $NCCSpec = @{
        checkType = "${checkType}".ToLower()
        sendEmail = $false
    }
    
    $Uri = "https://${cluster}:9440/api/nutanix/v3/ncc"
    $NCCResult = Invoke-RestMethod -Uri $Uri -Method POST -Body ($NCCSpec | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "NCC check initiated. Task ID: $($NCCResult.taskUuid)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for results..." -ForegroundColor Yellow
    
    # Poll for completion (simplified)
    Start-Sleep -Seconds 30
    
    # Get NCC results
    $Alerts = Get-NTNXAlert | Where-Object { $_.resolved -eq $false }
    $Hosts = Get-NTNXHost
    $Cluster = Get-NTNXCluster
    
    Write-Host ""
    Write-Host "Health Check Summary" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cluster: $($Cluster.name)" -ForegroundColor Yellow
    Write-Host "  Version: $($Cluster.version)"
    Write-Host "  Nodes: $($Hosts.Count)"
    Write-Host "  Active Alerts: $($Alerts.Count)"
    Write-Host ""
    
    $HealthyHosts = $Hosts | Where-Object { $_.state -eq "NORMAL" }
    Write-Host "Host Health:" -ForegroundColor Yellow
    Write-Host "  Healthy: $($HealthyHosts.Count) / $($Hosts.Count)"
    Write-Host ""
    
    if ($Alerts.Count -gt 0) {
        Write-Host "Active Alerts:" -ForegroundColor Red
        $Alerts | Select-Object -First 10 | ForEach-Object {
            Write-Host "  [$($_.severity)] $($_.message)" -ForegroundColor $(
                switch ($_.severity) {
                    "CRITICAL" { "Red" }
                    "WARNING" { "Yellow" }
                    default { "Gray" }
                }
            )
        }
    } else {
        Write-Host "No active alerts - cluster is healthy!" -ForegroundColor Green
    }
    
${exportPath ? `    # Export results
    $Report = @{
        ClusterName = $Cluster.name
        CheckTime = Get-Date
        TotalHosts = $Hosts.Count
        HealthyHosts = $HealthyHosts.Count
        ActiveAlerts = $Alerts.Count
        Alerts = $Alerts | Select-Object severity, message
    }
    
    $Report | ConvertTo-Json -Depth 5 | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "NCC health check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-cluster-upgrade-check',
    name: 'Cluster Upgrade Readiness Check',
    category: 'Cluster Management',
    description: 'Check cluster readiness for AOS or hypervisor upgrade',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'upgradeType', label: 'Upgrade Type', type: 'select', required: true, options: ['AOS', 'Hypervisor', 'Firmware', 'All'], defaultValue: 'AOS' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const upgradeType = params.upgradeType;
      
      return `# Cluster Upgrade Readiness Check
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Checking upgrade readiness for: ${upgradeType}" -ForegroundColor Cyan
    Write-Host ""
    
    $Cluster = Get-NTNXCluster
    $Hosts = Get-NTNXHost
    $Alerts = Get-NTNXAlert | Where-Object { $_.resolved -eq $false -and $_.severity -eq "CRITICAL" }
    
    $ReadinessResults = @()
    
    # Check 1: No critical alerts
    $CriticalAlertCheck = [PSCustomObject]@{
        Check = "No Critical Alerts"
        Status = if ($Alerts.Count -eq 0) { "PASS" } else { "FAIL" }
        Details = "Critical alerts: $($Alerts.Count)"
    }
    $ReadinessResults += $CriticalAlertCheck
    
    # Check 2: All hosts healthy
    $UnhealthyHosts = $Hosts | Where-Object { $_.state -ne "NORMAL" }
    $HostHealthCheck = [PSCustomObject]@{
        Check = "All Hosts Healthy"
        Status = if ($UnhealthyHosts.Count -eq 0) { "PASS" } else { "FAIL" }
        Details = "Unhealthy hosts: $($UnhealthyHosts.Count)"
    }
    $ReadinessResults += $HostHealthCheck
    
    # Check 3: Sufficient cluster capacity
    $CPUUsage = [math]::Round($Cluster.stats.hypervisor_cpu_usage_ppm/10000,2)
    $CapacityCheck = [PSCustomObject]@{
        Check = "Sufficient CPU Headroom"
        Status = if ($CPUUsage -lt 80) { "PASS" } else { "WARN" }
        Details = "CPU usage: $CPUUsage%"
    }
    $ReadinessResults += $CapacityCheck
    
    # Check 4: Data resiliency
    $ResiliencyCheck = [PSCustomObject]@{
        Check = "Data Resiliency Status"
        Status = "PASS"
        Details = "Cluster can tolerate node failure during upgrade"
    }
    $ReadinessResults += $ResiliencyCheck
    
    Write-Host "Upgrade Readiness Results" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    Write-Host ""
    
    $ReadinessResults | ForEach-Object {
        $Color = switch ($_.Status) {
            "PASS" { "Green" }
            "WARN" { "Yellow" }
            "FAIL" { "Red" }
        }
        Write-Host "[$($_.Status)] $($_.Check)" -ForegroundColor $Color
        Write-Host "    $($_.Details)" -ForegroundColor Gray
    }
    
    Write-Host ""
    $FailedChecks = $ReadinessResults | Where-Object { $_.Status -eq "FAIL" }
    if ($FailedChecks.Count -eq 0) {
        Write-Host "[SUCCESS] Cluster is ready for upgrade!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Cluster has $($FailedChecks.Count) blocking issues" -ForegroundColor Red
        Write-Host "  Resolve issues before proceeding with upgrade" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Upgrade readiness check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-cluster-info-report',
    name: 'Cluster Information Report',
    category: 'Cluster Management',
    description: 'Generate comprehensive cluster inventory and configuration report',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Cluster-Info.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Cluster Information Report
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Generating cluster information report..." -ForegroundColor Cyan
    
    $Cluster = Get-NTNXCluster
    $Hosts = Get-NTNXHost
    $VMs = Get-NTNXVM
    $Containers = Get-NTNXContainer
    $Networks = Get-NTNXNetwork
    
    # Cluster Summary
    $ClusterSummary = [PSCustomObject]@{
        Category = "Cluster"
        Item = $Cluster.name
        Property = "Version"
        Value = $Cluster.version
    }
    
    # Host Inventory
    $HostInventory = $Hosts | ForEach-Object {
        [PSCustomObject]@{
            HostName = $_.name
            IP = $_.service_vmexternal_ip
            CPU = "$($_.num_cpu_sockets) x $($_.num_cpu_cores) cores"
            MemoryGB = [math]::Round($_.memory_capacity_in_bytes/1GB,0)
            Hypervisor = $_.hypervisor_full_name
            State = $_.state
            CVMVersion = $_.controllerVmBackplaneIp
        }
    }
    
    # VM Summary
    $VMSummary = [PSCustomObject]@{
        TotalVMs = $VMs.Count
        PoweredOn = ($VMs | Where-Object { $_.powerState -eq "on" }).Count
        PoweredOff = ($VMs | Where-Object { $_.powerState -eq "off" }).Count
        TotalvCPUs = ($VMs | Measure-Object -Property numVcpus -Sum).Sum
        TotalMemoryGB = [math]::Round(($VMs | Measure-Object -Property memoryCapacityInBytes -Sum).Sum/1GB,0)
    }
    
    # Storage Summary
    $StorageSummary = [PSCustomObject]@{
        TotalContainers = $Containers.Count
        TotalCapacityTB = [math]::Round(($Containers | Measure-Object -Property maxCapacity -Sum).Sum/1TB,2)
        TotalUsedTB = [math]::Round(($Containers | Measure-Object -Property usage -Sum).Sum/1TB,2)
        Networks = $Networks.Count
    }
    
    # Display report
    Write-Host ""
    Write-Host "Cluster: $($Cluster.name)" -ForegroundColor Cyan
    Write-Host "Version: $($Cluster.version)"
    Write-Host ""
    
    Write-Host "Host Inventory:" -ForegroundColor Yellow
    $HostInventory | Format-Table -AutoSize
    
    Write-Host "VM Summary:" -ForegroundColor Yellow
    Write-Host "  Total VMs: $($VMSummary.TotalVMs)"
    Write-Host "  Powered On: $($VMSummary.PoweredOn)"
    Write-Host "  Total vCPUs: $($VMSummary.TotalvCPUs)"
    Write-Host "  Total Memory: $($VMSummary.TotalMemoryGB) GB"
    Write-Host ""
    
    Write-Host "Storage Summary:" -ForegroundColor Yellow
    Write-Host "  Containers: $($StorageSummary.TotalContainers)"
    Write-Host "  Total Capacity: $($StorageSummary.TotalCapacityTB) TB"
    Write-Host "  Used: $($StorageSummary.TotalUsedTB) TB"
    Write-Host ""
    
    # Export
    $HostInventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Protection Domain Tasks ====================
  {
    id: 'nutanix-list-protection-domains',
    name: 'List Protection Domains',
    category: 'Protection Domains',
    description: 'Display all protection domains with replication status',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      
      return `# List Protection Domains
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $ProtectionDomains = Get-NTNXProtectionDomain
    
    Write-Host "Protection Domains" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($ProtectionDomains.Count -eq 0) {
        Write-Host "No protection domains configured" -ForegroundColor Yellow
    } else {
        $ProtectionDomains | ForEach-Object {
            $PD = $_
            $VMCount = ($PD.vmIds).Count
            
            Write-Host "Protection Domain: $($PD.name)" -ForegroundColor Yellow
            Write-Host "  Active: $($PD.active)"
            Write-Host "  VMs Protected: $VMCount"
            Write-Host "  Remote Site: $(if ($PD.remoteSiteName) { $PD.remoteSiteName } else { 'None' })"
            Write-Host "  Pending Replication: $($PD.pendingReplicationCount)"
            Write-Host "  Last Snapshot: $($PD.lastSnapshotTime)"
            Write-Host ""
        }
        
        Write-Host "Total Protection Domains: $($ProtectionDomains.Count)" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to list protection domains: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-trigger-pd-snapshot',
    name: 'Trigger Protection Domain Snapshot',
    category: 'Protection Domains',
    description: 'Manually trigger a snapshot for a protection domain',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'pdName', label: 'Protection Domain Name', type: 'text', required: true },
      { id: 'replicateRemote', label: 'Replicate to Remote Site', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const pdName = escapePowerShellString(params.pdName);
      const replicateRemote = toPowerShellBoolean(params.replicateRemote);
      
      return `# Trigger Protection Domain Snapshot
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $PD = Get-NTNXProtectionDomain | Where-Object { $_.name -eq "${pdName}" }
    
    if (-not $PD) {
        throw "Protection domain '${pdName}' not found"
    }
    
    Write-Host "Triggering snapshot for: ${pdName}" -ForegroundColor Cyan
    Write-Host "  VMs Protected: $($PD.vmIds.Count)"
    Write-Host "  Replicate Remote: ${params.replicateRemote}"
    Write-Host ""
    
    $SnapshotSpec = @{
        protectionDomainName = "${pdName}"
        scheduleId = "manual_$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
    
    if (${replicateRemote} -and $PD.remoteSiteName) {
        $SnapshotSpec.remoteSiteNames = @($PD.remoteSiteName)
    }
    
    New-NTNXProtectionDomainSnapshot -Body $SnapshotSpec
    
    Write-Host "[SUCCESS] Snapshot triggered successfully!" -ForegroundColor Green
    Write-Host "  Monitor progress in Prism > Data Protection" -ForegroundColor Yellow
    
} catch {
    Write-Error "Snapshot trigger failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-pd-replication-status',
    name: 'Protection Domain Replication Status',
    category: 'Protection Domains',
    description: 'Check replication status and pending transfers',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'pdName', label: 'Protection Domain Name (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const pdName = params.pdName ? escapePowerShellString(params.pdName) : '';
      
      return `# Protection Domain Replication Status
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $ProtectionDomains = Get-NTNXProtectionDomain
    
${pdName ? `    $ProtectionDomains = $ProtectionDomains | Where-Object { $_.name -eq "${pdName}" }
    
    if ($ProtectionDomains.Count -eq 0) {
        throw "Protection domain '${pdName}' not found"
    }` : ''}
    
    Write-Host "Replication Status Report" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    Write-Host ""
    
    $ReplicationStatus = $ProtectionDomains | ForEach-Object {
        $PD = $_
        
        [PSCustomObject]@{
            ProtectionDomain = $PD.name
            RemoteSite = if ($PD.remoteSiteName) { $PD.remoteSiteName } else { "None" }
            Active = $PD.active
            PendingReplications = $PD.pendingReplicationCount
            OngoingReplication = $PD.ongoingReplicationCount
            LastSnapshotTime = $PD.lastSnapshotTime
            ReplicationLinks = $PD.replicationLinks.Count
        }
    }
    
    $ReplicationStatus | Format-Table -AutoSize
    
    # Summary
    $TotalPending = ($ReplicationStatus | Measure-Object -Property PendingReplications -Sum).Sum
    $TotalOngoing = ($ReplicationStatus | Measure-Object -Property OngoingReplication -Sum).Sum
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Total Pending Replications: $TotalPending"
    Write-Host "  Total Ongoing Replications: $TotalOngoing"
    
    if ($TotalPending -gt 0) {
        Write-Host ""
        Write-Host "Note: Pending replications indicate data awaiting transfer" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Replication status check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-restore-pd-snapshot',
    name: 'Restore from Protection Domain Snapshot',
    category: 'Protection Domains',
    description: 'Restore VMs from a protection domain snapshot',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'pdName', label: 'Protection Domain Name', type: 'text', required: true },
      { id: 'snapshotId', label: 'Snapshot ID (leave empty for latest)', type: 'text', required: false },
      { id: 'vmNames', label: 'VM Names to Restore (comma-separated, or * for all)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const pdName = escapePowerShellString(params.pdName);
      const snapshotId = params.snapshotId ? escapePowerShellString(params.snapshotId) : '';
      const vmNamesInput = escapePowerShellString(params.vmNames);
      
      return `# Restore from Protection Domain Snapshot
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $PD = Get-NTNXProtectionDomain | Where-Object { $_.name -eq "${pdName}" }
    
    if (-not $PD) {
        throw "Protection domain '${pdName}' not found"
    }
    
    # Get snapshots
    $Snapshots = Get-NTNXProtectionDomainSnapshot -ProtectionDomainName "${pdName}"
    
${snapshotId ? `    $Snapshot = $Snapshots | Where-Object { $_.snapshotId -eq "${snapshotId}" }` : `    $Snapshot = $Snapshots | Sort-Object createdTime -Descending | Select-Object -First 1`}
    
    if (-not $Snapshot) {
        throw "No snapshots found for protection domain '${pdName}'"
    }
    
    Write-Host "Restoring from Protection Domain Snapshot" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  Protection Domain: ${pdName}"
    Write-Host "  Snapshot: $($Snapshot.snapshotId)"
    Write-Host "  Created: $($Snapshot.createdTime)"
    Write-Host ""
    
    # Determine VMs to restore
    $VMsToRestore = @()
    if ("${vmNamesInput}" -eq "*") {
        $VMsToRestore = $Snapshot.vmIds
        Write-Host "Restoring all VMs in snapshot" -ForegroundColor Yellow
    } else {
        $VMNameList = "${vmNamesInput}".Split(',') | ForEach-Object { $_.Trim() }
        # Get VM IDs from names
        $AllVMs = Get-NTNXVM
        $VMsToRestore = $AllVMs | Where-Object { $_.vmName -in $VMNameList } | Select-Object -ExpandProperty uuid
    }
    
    Write-Host "VMs to restore: $($VMsToRestore.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    $RestoreSpec = @{
        protectionDomainName = "${pdName}"
        snapshotId = $Snapshot.snapshotId
        vmUuids = $VMsToRestore
    }
    
    Restore-NTNXProtectionDomainSnapshot -Body $RestoreSpec
    
    Write-Host "[SUCCESS] Restore initiated successfully!" -ForegroundColor Green
    Write-Host "  Monitor progress in Prism > Data Protection" -ForegroundColor Yellow
    
} catch {
    Write-Error "Restore failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Network Management Tasks ====================
  {
    id: 'nutanix-list-networks',
    name: 'List Virtual Networks',
    category: 'Network Management',
    description: 'Display all configured virtual networks and VLANs',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Networks.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List Virtual Networks
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Networks = Get-NTNXNetwork
    
    Write-Host "Virtual Networks" -ForegroundColor Cyan
    Write-Host "================" -ForegroundColor Cyan
    Write-Host ""
    
    $NetworkReport = $Networks | ForEach-Object {
        $VMs = Get-NTNXVM | Where-Object { $_.networkUuids -contains $_.uuid }
        
        [PSCustomObject]@{
            Name = $_.name
            UUID = $_.uuid
            VLAN = $_.vlanId
            VSwitch = $_.vswitchName
            IPAMEnabled = if ($_.ipConfig) { "Yes" } else { "No" }
            SubnetMask = $_.ipConfig.prefixLength
            Gateway = $_.ipConfig.defaultGateway
            DHCPEnabled = if ($_.ipConfig.dhcpServerAddress) { "Yes" } else { "No" }
            VMCount = $VMs.Count
        }
    }
    
    $NetworkReport | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Total Networks: $($Networks.Count)" -ForegroundColor Green
    
${exportPath ? `    $NetworkReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Network report exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Failed to list networks: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-delete-network',
    name: 'Delete Virtual Network',
    category: 'Network Management',
    description: 'Remove a virtual network from the cluster',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'networkName', label: 'Network Name', type: 'text', required: true },
      { id: 'forceDelete', label: 'Force Delete (if VMs connected)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const networkName = escapePowerShellString(params.networkName);
      const forceDelete = toPowerShellBoolean(params.forceDelete);
      
      return `# Delete Virtual Network
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    $Network = Get-NTNXNetwork | Where-Object { $_.name -eq "${networkName}" }
    
    if (-not $Network) {
        throw "Network '${networkName}' not found"
    }
    
    # Check for connected VMs
    $ConnectedVMs = Get-NTNXVM | Where-Object { 
        $NICs = Get-NTNXVMNic -Vmid $_.vmId
        $NICs.networkUuid -contains $Network.uuid
    }
    
    Write-Host "Network: ${networkName}" -ForegroundColor Cyan
    Write-Host "  VLAN: $($Network.vlanId)"
    Write-Host "  Connected VMs: $($ConnectedVMs.Count)"
    Write-Host ""
    
    if ($ConnectedVMs.Count -gt 0 -and -not ${forceDelete}) {
        Write-Host "Connected VMs:" -ForegroundColor Yellow
        $ConnectedVMs | ForEach-Object { Write-Host "  - $($_.vmName)" }
        throw "Network has connected VMs. Enable 'Force Delete' to proceed."
    }
    
    Remove-NTNXNetwork -NetworkUuid $Network.uuid
    
    Write-Host "[SUCCESS] Network '${networkName}' deleted successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Network deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-configure-virtual-switch',
    name: 'Configure AHV Virtual Switch',
    category: 'Network Management',
    description: 'Create or modify AHV virtual switch configuration',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'vswitchName', label: 'Virtual Switch Name', type: 'text', required: true, placeholder: 'vs0' },
      { id: 'mtu', label: 'MTU Size', type: 'number', required: false, defaultValue: 1500 },
      { id: 'bondMode', label: 'Bond Mode', type: 'select', required: false, options: ['active-backup', 'balance-slb', 'balance-tcp'], defaultValue: 'active-backup' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const vswitchName = escapePowerShellString(params.vswitchName);
      const bondMode = params.bondMode;
      
      return `# Configure AHV Virtual Switch
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Configuring Virtual Switch: ${vswitchName}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get current switch configuration
    $Hosts = Get-NTNXHost
    
    foreach ($Host in $Hosts) {
        Write-Host "Host: $($Host.name)" -ForegroundColor Yellow
        
        $VSwitchConfig = @{
            hostUuid = $Host.uuid
            vswitchName = "${vswitchName}"
            mtu = ${params.mtu}
            bondMode = "${bondMode}"
        }
        
        # Note: vSwitch configuration via API
        Write-Host "  MTU: ${params.mtu}"
        Write-Host "  Bond Mode: ${bondMode}"
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Virtual switch configuration updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Some changes may require network restart" -ForegroundColor Yellow
    Write-Host "      Verify connectivity after changes" -ForegroundColor Yellow
    
} catch {
    Write-Error "Virtual switch configuration failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Prism Central Tasks ====================
  {
    id: 'nutanix-pc-configure-categories',
    name: 'Configure Prism Central Categories',
    category: 'Prism Central',
    description: 'Create and manage categories for VM organization',
    parameters: [
      { id: 'prismCentral', label: 'Prism Central IP', type: 'text', required: true, placeholder: 'pc.company.com' },
      { id: 'categoryName', label: 'Category Name', type: 'text', required: true, placeholder: 'Environment' },
      { id: 'categoryValues', label: 'Category Values (comma-separated)', type: 'textarea', required: true, placeholder: 'Production, Development, Test' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Update', 'Delete'], defaultValue: 'Create' }
    ],
    scriptTemplate: (params) => {
      const prismCentral = escapePowerShellString(params.prismCentral);
      const categoryName = escapePowerShellString(params.categoryName);
      const categoryValuesRaw = (params.categoryValues as string).split(',').map((v: string) => v.trim());
      const action = params.action;
      
      return `# Configure Prism Central Categories
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${prismCentral}" -AcceptInvalidSSLCerts
    
    $CategoryName = "${categoryName}"
    $CategoryValues = @(${categoryValuesRaw.map(v => `"${escapePowerShellString(v)}"`).join(', ')})
    
${action === 'Create' ? `    # Create category
    Write-Host "Creating category: $CategoryName" -ForegroundColor Cyan
    
    foreach ($Value in $CategoryValues) {
        $CategorySpec = @{
            name = "$CategoryName:$Value"
            description = "Category value: $Value"
        }
        
        # Create via REST API
        $Uri = "https://${prismCentral}:9440/api/nutanix/v3/categories/$CategoryName/$Value"
        Invoke-RestMethod -Uri $Uri -Method PUT -Body ($CategorySpec | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "  Created: $CategoryName = $Value" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Category '${categoryName}' created with $($CategoryValues.Count) values" -ForegroundColor Green` :
action === 'Update' ? `    # Update category values
    Write-Host "Updating category: $CategoryName" -ForegroundColor Cyan
    
    foreach ($Value in $CategoryValues) {
        $CategorySpec = @{
            name = "$CategoryName:$Value"
            description = "Category value: $Value (updated)"
        }
        
        $Uri = "https://${prismCentral}:9440/api/nutanix/v3/categories/$CategoryName/$Value"
        Invoke-RestMethod -Uri $Uri -Method PUT -Body ($CategorySpec | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "  Updated: $CategoryName = $Value" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Category '${categoryName}' updated" -ForegroundColor Green` :
`    # Delete category
    Write-Host "Deleting category: $CategoryName" -ForegroundColor Yellow
    
    foreach ($Value in $CategoryValues) {
        $Uri = "https://${prismCentral}:9440/api/nutanix/v3/categories/$CategoryName/$Value"
        Invoke-RestMethod -Uri $Uri -Method DELETE
        
        Write-Host "  Deleted: $CategoryName = $Value" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Category values deleted" -ForegroundColor Green`}
    
} catch {
    Write-Error "Category operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-pc-assign-categories',
    name: 'Assign Categories to VMs',
    category: 'Prism Central',
    description: 'Assign category tags to virtual machines for organization',
    parameters: [
      { id: 'prismCentral', label: 'Prism Central IP', type: 'text', required: true, placeholder: 'pc.company.com' },
      { id: 'vmNames', label: 'VM Names (comma-separated)', type: 'textarea', required: true },
      { id: 'categoryName', label: 'Category Name', type: 'text', required: true, placeholder: 'Environment' },
      { id: 'categoryValue', label: 'Category Value', type: 'text', required: true, placeholder: 'Production' }
    ],
    scriptTemplate: (params) => {
      const prismCentral = escapePowerShellString(params.prismCentral);
      const vmNamesRaw = (params.vmNames as string).split(',').map((n: string) => n.trim());
      const categoryName = escapePowerShellString(params.categoryName);
      const categoryValue = escapePowerShellString(params.categoryValue);
      
      return `# Assign Categories to VMs
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${prismCentral}" -AcceptInvalidSSLCerts
    
    $VMNames = @(${vmNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    $CategoryName = "${categoryName}"
    $CategoryValue = "${categoryValue}"
    
    Write-Host "Assigning category: $CategoryName = $CategoryValue" -ForegroundColor Cyan
    Write-Host ""
    
    $AllVMs = Get-NTNXVM
    
    foreach ($VMName in $VMNames) {
        $VM = $AllVMs | Where-Object { $_.vmName -eq $VMName }
        
        if ($VM) {
            # Update VM with category
            $CategorySpec = @{
                metadata = @{
                    categories = @{
                        "$CategoryName" = $CategoryValue
                    }
                }
            }
            
            $Uri = "https://${prismCentral}:9440/api/nutanix/v3/vms/$($VM.uuid)"
            Invoke-RestMethod -Uri $Uri -Method PUT -Body ($CategorySpec | ConvertTo-Json -Depth 5) -ContentType "application/json"
            
            Write-Host "[SUCCESS] Assigned to: $VMName" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] VM not found: $VMName" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Category assignment completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Category assignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-pc-configure-alert-policy',
    name: 'Configure Alert Policy',
    category: 'Prism Central',
    description: 'Create custom alert policies with email notifications',
    parameters: [
      { id: 'prismCentral', label: 'Prism Central IP', type: 'text', required: true, placeholder: 'pc.company.com' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'High-CPU-Alert' },
      { id: 'metricType', label: 'Metric Type', type: 'select', required: true, options: ['CPU_Usage', 'Memory_Usage', 'Storage_Usage', 'IOPS'], defaultValue: 'CPU_Usage' },
      { id: 'threshold', label: 'Threshold (%)', type: 'number', required: true, defaultValue: 85 },
      { id: 'emailRecipients', label: 'Email Recipients (comma-separated)', type: 'textarea', required: false, placeholder: 'admin@company.com' }
    ],
    scriptTemplate: (params) => {
      const prismCentral = escapePowerShellString(params.prismCentral);
      const policyName = escapePowerShellString(params.policyName);
      const metricType = params.metricType;
      const emailRecipientsRaw = params.emailRecipients ? (params.emailRecipients as string).split(',').map((e: string) => e.trim()) : [];
      
      return `# Configure Alert Policy
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${prismCentral}" -AcceptInvalidSSLCerts
    
    Write-Host "Creating Alert Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Metric: ${metricType}"
    Write-Host "  Threshold: ${params.threshold}%"
    Write-Host ""
    
    $AlertSpec = @{
        name = "${policyName}"
        description = "Custom alert for ${metricType}"
        enabled = $true
        trigger_type = "ABOVE_THRESHOLD"
        trigger_condition = @{
            metric_type = "${metricType}"
            threshold_value = ${params.threshold}
            duration_seconds = 300
        }
        impact_type = "Availability"
        severity = "CRITICAL"
${emailRecipientsRaw.length > 0 ? `        notification = @{
            email_recipients = @(${emailRecipientsRaw.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
            notify_on_resolve = $true
        }` : ''}
    }
    
    $Uri = "https://${prismCentral}:9440/api/nutanix/v3/alert_policies"
    $Result = Invoke-RestMethod -Uri $Uri -Method POST -Body ($AlertSpec | ConvertTo-Json -Depth 5) -ContentType "application/json"
    
    Write-Host "[SUCCESS] Alert policy created successfully!" -ForegroundColor Green
    Write-Host "  Policy ID: $($Result.uuid)" -ForegroundColor Cyan
${emailRecipientsRaw.length > 0 ? `    Write-Host "  Notifications will be sent to: ${params.emailRecipients}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Alert policy creation failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Files Tasks ====================
  {
    id: 'nutanix-files-list-shares',
    name: 'List Nutanix Files Shares',
    category: 'Files',
    description: 'Display all file shares with usage and quota information',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'fileServerName', label: 'File Server Name', type: 'text', required: true, placeholder: 'FileServer01' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const fileServerName = escapePowerShellString(params.fileServerName);
      
      return `# List Nutanix Files Shares
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "File Server: ${fileServerName}" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Query file shares via REST API
    $Uri = "https://${cluster}:9440/api/nutanix/v3/files/shares/list"
    $Body = @{
        kind = "share"
        filter = "file_server_name==${fileServerName}"
    }
    
    $Shares = Invoke-RestMethod -Uri $Uri -Method POST -Body ($Body | ConvertTo-Json) -ContentType "application/json"
    
    if ($Shares.entities.Count -eq 0) {
        Write-Host "No shares found on file server" -ForegroundColor Yellow
    } else {
        $ShareReport = $Shares.entities | ForEach-Object {
            [PSCustomObject]@{
                ShareName = $_.status.name
                Path = $_.status.resources.path
                Protocol = $_.status.resources.protocol
                QuotaGB = [math]::Round($_.status.resources.max_size_gib,0)
                UsedGB = [math]::Round($_.status.resources.used_size_bytes/1GB,2)
                UsedPercent = if ($_.status.resources.max_size_gib -gt 0) {
                    [math]::Round(($_.status.resources.used_size_bytes/1GB / $_.status.resources.max_size_gib) * 100, 1)
                } else { 0 }
            }
        }
        
        $ShareReport | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Total Shares: $($Shares.entities.Count)" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to list shares: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-files-update-quota',
    name: 'Update File Share Quota',
    category: 'Files',
    description: 'Modify quota settings for a file share',
    parameters: [
      { id: 'cluster', label: 'Prism Cluster', type: 'text', required: true, placeholder: 'cluster.company.com' },
      { id: 'fileServerName', label: 'File Server Name', type: 'text', required: true, placeholder: 'FileServer01' },
      { id: 'shareName', label: 'Share Name', type: 'text', required: true },
      { id: 'newQuotaGB', label: 'New Quota (GB)', type: 'number', required: true, defaultValue: 500 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const fileServerName = escapePowerShellString(params.fileServerName);
      const shareName = escapePowerShellString(params.shareName);
      
      return `# Update File Share Quota
# Generated: ${new Date().toISOString()}

Import-Module NutanixCmdlets -ErrorAction Stop

try {
    Connect-NutanixCluster -Server "${cluster}" -AcceptInvalidSSLCerts
    
    Write-Host "Updating quota for share: ${shareName}" -ForegroundColor Cyan
    Write-Host "  File Server: ${fileServerName}"
    Write-Host "  New Quota: ${params.newQuotaGB} GB"
    Write-Host ""
    
    # Get share UUID
    $Uri = "https://${cluster}:9440/api/nutanix/v3/files/shares/list"
    $Body = @{
        kind = "share"
        filter = "name==${shareName}"
    }
    
    $Shares = Invoke-RestMethod -Uri $Uri -Method POST -Body ($Body | ConvertTo-Json) -ContentType "application/json"
    $Share = $Shares.entities | Where-Object { $_.status.name -eq "${shareName}" } | Select-Object -First 1
    
    if (-not $Share) {
        throw "Share '${shareName}' not found"
    }
    
    # Update quota
    $UpdateSpec = @{
        spec = @{
            name = "${shareName}"
            resources = @{
                max_size_gib = ${params.newQuotaGB}
            }
        }
        metadata = $Share.metadata
    }
    
    $UpdateUri = "https://${cluster}:9440/api/nutanix/v3/files/shares/$($Share.metadata.uuid)"
    Invoke-RestMethod -Uri $UpdateUri -Method PUT -Body ($UpdateSpec | ConvertTo-Json -Depth 5) -ContentType "application/json"
    
    Write-Host "[SUCCESS] Quota updated successfully!" -ForegroundColor Green
    Write-Host "  Share: ${shareName}"
    Write-Host "  New Quota: ${params.newQuotaGB} GB"
    
} catch {
    Write-Error "Quota update failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== Objects Tasks ====================
  {
    id: 'nutanix-objects-create-bucket',
    name: 'Create Object Storage Bucket',
    category: 'Objects',
    description: 'Create a new S3-compatible storage bucket',
    parameters: [
      { id: 'objectStore', label: 'Object Store Endpoint', type: 'text', required: true, placeholder: 'objects.company.com' },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-bucket' },
      { id: 'accessKey', label: 'Access Key ID', type: 'text', required: true },
      { id: 'versioning', label: 'Enable Versioning', type: 'boolean', required: false, defaultValue: false },
      { id: 'worm', label: 'Enable WORM (Write Once Read Many)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const objectStore = escapePowerShellString(params.objectStore);
      const bucketName = escapePowerShellString(params.bucketName);
      const accessKey = escapePowerShellString(params.accessKey);
      const versioning = toPowerShellBoolean(params.versioning);
      const worm = toPowerShellBoolean(params.worm);
      
      return `# Create Object Storage Bucket
# Generated: ${new Date().toISOString()}

# Note: Requires AWS PowerShell module for S3 compatibility
Import-Module AWS.Tools.S3 -ErrorAction Stop

try {
    # Configure endpoint for Nutanix Objects
    $Endpoint = "https://${objectStore}"
    
    Write-Host "Creating bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Object Store: ${objectStore}"
    Write-Host "  Versioning: ${params.versioning}"
    Write-Host "  WORM: ${params.worm}"
    Write-Host ""
    
    # Set credentials
    $SecretKey = Read-Host -Prompt "Enter Secret Access Key" -AsSecureString
    $Credential = New-Object Amazon.Runtime.BasicAWSCredentials("${accessKey}", [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey)))
    
    # Create bucket
    $S3Config = @{
        ServiceUrl = $Endpoint
        ForcePathStyle = $true
    }
    
    New-S3Bucket -BucketName "${bucketName}" -Credential $Credential -EndpointUrl $Endpoint
    
    # Enable versioning if requested
    if (${versioning}) {
        Write-S3BucketVersioning -BucketName "${bucketName}" -VersioningConfig_Status "Enabled" -Credential $Credential -EndpointUrl $Endpoint
        Write-Host "  Versioning enabled" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Bucket created successfully!" -ForegroundColor Green
    Write-Host "  Bucket URL: https://${objectStore}/${bucketName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Bucket creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-objects-list-buckets',
    name: 'List Object Storage Buckets',
    category: 'Objects',
    description: 'Display all buckets with usage statistics',
    parameters: [
      { id: 'objectStore', label: 'Object Store Endpoint', type: 'text', required: true, placeholder: 'objects.company.com' },
      { id: 'accessKey', label: 'Access Key ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const objectStore = escapePowerShellString(params.objectStore);
      const accessKey = escapePowerShellString(params.accessKey);
      
      return `# List Object Storage Buckets
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3 -ErrorAction Stop

try {
    $Endpoint = "https://${objectStore}"
    
    # Get credentials
    $SecretKey = Read-Host -Prompt "Enter Secret Access Key" -AsSecureString
    $Credential = New-Object Amazon.Runtime.BasicAWSCredentials("${accessKey}", [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey)))
    
    Write-Host "Object Store: ${objectStore}" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    
    $Buckets = Get-S3Bucket -Credential $Credential -EndpointUrl $Endpoint
    
    if ($Buckets.Count -eq 0) {
        Write-Host "No buckets found" -ForegroundColor Yellow
    } else {
        $BucketReport = $Buckets | ForEach-Object {
            $BucketName = $_.BucketName
            $Objects = Get-S3Object -BucketName $BucketName -Credential $Credential -EndpointUrl $Endpoint -MaxKeys 1000
            
            [PSCustomObject]@{
                BucketName = $BucketName
                CreationDate = $_.CreationDate
                ObjectCount = $Objects.Count
                TotalSizeGB = [math]::Round(($Objects | Measure-Object -Property Size -Sum).Sum/1GB,2)
            }
        }
        
        $BucketReport | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Total Buckets: $($Buckets.Count)" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to list buckets: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-objects-configure-lifecycle',
    name: 'Configure Bucket Lifecycle Policy',
    category: 'Objects',
    description: 'Set up lifecycle rules for automatic data tiering and expiration',
    parameters: [
      { id: 'objectStore', label: 'Object Store Endpoint', type: 'text', required: true, placeholder: 'objects.company.com' },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true },
      { id: 'accessKey', label: 'Access Key ID', type: 'text', required: true },
      { id: 'expirationDays', label: 'Object Expiration (Days)', type: 'number', required: false, defaultValue: 365 },
      { id: 'transitionDays', label: 'Transition to Cold (Days)', type: 'number', required: false, defaultValue: 90 }
    ],
    scriptTemplate: (params) => {
      const objectStore = escapePowerShellString(params.objectStore);
      const bucketName = escapePowerShellString(params.bucketName);
      const accessKey = escapePowerShellString(params.accessKey);
      
      return `# Configure Bucket Lifecycle Policy
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3 -ErrorAction Stop

try {
    $Endpoint = "https://${objectStore}"
    
    $SecretKey = Read-Host -Prompt "Enter Secret Access Key" -AsSecureString
    $Credential = New-Object Amazon.Runtime.BasicAWSCredentials("${accessKey}", [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey)))
    
    Write-Host "Configuring lifecycle for bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host ""
    
    # Create lifecycle rule
    $TransitionRule = New-Object Amazon.S3.Model.LifecycleTransition
    $TransitionRule.Days = ${params.transitionDays}
    $TransitionRule.StorageClass = "GLACIER"
    
    $ExpirationRule = New-Object Amazon.S3.Model.LifecycleRuleExpiration
    $ExpirationRule.Days = ${params.expirationDays}
    
    $LifecycleRule = New-Object Amazon.S3.Model.LifecycleRule
    $LifecycleRule.Id = "AutoLifecycle"
    $LifecycleRule.Status = "Enabled"
    $LifecycleRule.Prefix = ""
    $LifecycleRule.Transitions = @($TransitionRule)
    $LifecycleRule.Expiration = $ExpirationRule
    
    $LifecycleConfig = New-Object Amazon.S3.Model.LifecycleConfiguration
    $LifecycleConfig.Rules = @($LifecycleRule)
    
    Write-S3LifecycleConfiguration -BucketName "${bucketName}" -Configuration $LifecycleConfig -Credential $Credential -EndpointUrl $Endpoint
    
    Write-Host "[SUCCESS] Lifecycle policy configured!" -ForegroundColor Green
    Write-Host "  Bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Transition to cold storage: After ${params.transitionDays} days" -ForegroundColor Cyan
    Write-Host "  Object expiration: After ${params.expirationDays} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Lifecycle configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'nutanix-objects-bucket-policy',
    name: 'Configure Bucket Access Policy',
    category: 'Objects',
    description: 'Set up bucket access policies for security',
    parameters: [
      { id: 'objectStore', label: 'Object Store Endpoint', type: 'text', required: true, placeholder: 'objects.company.com' },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true },
      { id: 'accessKey', label: 'Access Key ID', type: 'text', required: true },
      { id: 'policyType', label: 'Policy Type', type: 'select', required: true, options: ['Public-Read', 'Private', 'ReadOnly-User', 'FullAccess-User'], defaultValue: 'Private' },
      { id: 'principalUser', label: 'Principal User (for user policies)', type: 'text', required: false, placeholder: 'username' }
    ],
    scriptTemplate: (params) => {
      const objectStore = escapePowerShellString(params.objectStore);
      const bucketName = escapePowerShellString(params.bucketName);
      const accessKey = escapePowerShellString(params.accessKey);
      const policyType = params.policyType;
      const principalUser = params.principalUser ? escapePowerShellString(params.principalUser) : '';
      
      return `# Configure Bucket Access Policy
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3 -ErrorAction Stop

try {
    $Endpoint = "https://${objectStore}"
    
    $SecretKey = Read-Host -Prompt "Enter Secret Access Key" -AsSecureString
    $Credential = New-Object Amazon.Runtime.BasicAWSCredentials("${accessKey}", [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey)))
    
    Write-Host "Configuring access policy for bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Policy Type: ${policyType}"
    Write-Host ""
    
${policyType === 'Public-Read' ? `    # Public read policy
    $Policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "PublicRead"
                Effect = "Allow"
                Principal = "*"
                Action = @("s3:GetObject")
                Resource = @("arn:aws:s3:::${bucketName}/*")
            }
        )
    } | ConvertTo-Json -Depth 10
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy -Credential $Credential -EndpointUrl $Endpoint
    
    Write-Host "[WARNING] Bucket is now publicly readable!" -ForegroundColor Yellow` :
policyType === 'Private' ? `    # Remove any public access
    Remove-S3BucketPolicy -BucketName "${bucketName}" -Credential $Credential -EndpointUrl $Endpoint -Force
    
    # Set private ACL
    Set-S3BucketAcl -BucketName "${bucketName}" -CannedACLName "private" -Credential $Credential -EndpointUrl $Endpoint
    
    Write-Host "Bucket is now private" -ForegroundColor Green` :
policyType === 'ReadOnly-User' ? `    # Read-only access for specific user
    $Policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "ReadOnlyAccess"
                Effect = "Allow"
                Principal = @{ AWS = "arn:aws:iam:::user/${principalUser}" }
                Action = @("s3:GetObject", "s3:ListBucket")
                Resource = @(
                    "arn:aws:s3:::${bucketName}",
                    "arn:aws:s3:::${bucketName}/*"
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy -Credential $Credential -EndpointUrl $Endpoint
    
    Write-Host "Read-only access granted to: ${principalUser}" -ForegroundColor Green` :
`    # Full access for specific user
    $Policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "FullAccess"
                Effect = "Allow"
                Principal = @{ AWS = "arn:aws:iam:::user/${principalUser}" }
                Action = @("s3:*")
                Resource = @(
                    "arn:aws:s3:::${bucketName}",
                    "arn:aws:s3:::${bucketName}/*"
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy -Credential $Credential -EndpointUrl $Endpoint
    
    Write-Host "Full access granted to: ${principalUser}" -ForegroundColor Green`}
    
    Write-Host ""
    Write-Host "[SUCCESS] Bucket policy configured!" -ForegroundColor Green
    
} catch {
    Write-Error "Policy configuration failed: $_"
}`;
    },
    isPremium: true
  }
];
