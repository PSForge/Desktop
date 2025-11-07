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
  }
];
