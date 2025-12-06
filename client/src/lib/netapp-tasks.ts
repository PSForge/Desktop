import { escapePowerShellString } from './powershell-utils';

export interface NetAppTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface NetAppTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: NetAppTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const netappTasks: NetAppTask[] = [
  {
    id: 'netapp-bulk-create-volumes',
    name: 'Bulk Create Volumes',
    category: 'Bulk Operations',
    description: 'Create multiple storage volumes',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumes', label: 'Volumes (Name=SizeGB, one per line)', type: 'textarea', required: true, placeholder: 'vol_data1=100\nvol_data2=200' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumes = (params.volumes as string).split('\n').filter((v: string) => v.trim());
      
      return `# NetApp ONTAP Bulk Create Volumes
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    $Volumes = @(
${volumes.map(v => {
  const [name, size] = v.split('=').map((s: string) => s.trim());
  return `        @{Name="${escapePowerShellString(name)}"; SizeGB=${size}}`;
}).join(',\n')}
    )
    
    foreach ($Vol in $Volumes) {
        New-NcVol \`
            -Name $Vol.Name \`
            -Vserver "${svm}" \`
            -Aggregate aggr1 \`
            -Size "$($Vol.SizeGB)g"
        
        Write-Host "✓ Volume created: $($Vol.Name) ($($Vol.SizeGB) GB)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk volume creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'netapp-create-cifs-share',
    name: 'Create CIFS Share',
    category: 'Share Management',
    description: 'Create a new CIFS/SMB share',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true },
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'SharedData' },
      { id: 'volumePath', label: 'Volume Path', type: 'path', required: true, placeholder: '/vol_data1' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const shareName = escapePowerShellString(params.shareName);
      const volumePath = escapePowerShellString(params.volumePath);
      
      return `# NetApp ONTAP Create CIFS Share
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Add-NcCifsShare \`
        -Name "${shareName}" \`
        -Path "${volumePath}" \`
        -Vserver "${svm}"
    
    Write-Host "✓ CIFS share '${shareName}' created successfully!" -ForegroundColor Green
    Write-Host "  Path: ${volumePath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Share creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'netapp-create-snapshot',
    name: 'Create Volume Snapshot',
    category: 'Snapshot Management',
    description: 'Create snapshot of a volume',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: true, placeholder: 'daily_backup' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const snapshotName = escapePowerShellString(params.snapshotName);
      
      return `# NetApp ONTAP Create Snapshot
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    New-NcSnapshot \`
        -Volume "${volumeName}" \`
        -Snapshot "${snapshotName}_$(Get-Date -Format 'yyyyMMdd_HHmm')" \`
        -Vserver "${svm}"
    
    Write-Host "✓ Snapshot created for volume: ${volumeName}" -ForegroundColor Green
    
} catch {
    Write-Error "Snapshot creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'netapp-manage-aggregate',
    name: 'Manage Storage Aggregate',
    category: 'Common Admin Tasks',
    description: 'Create or modify storage aggregates',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'aggregateName', label: 'Aggregate Name', type: 'text', required: true, placeholder: 'aggr1' },
      { id: 'diskCount', label: 'Disk Count', type: 'number', required: false, placeholder: '6' },
      { id: 'raidType', label: 'RAID Type', type: 'select', required: false, options: ['raid4', 'raid_dp', 'raid_tec'], defaultValue: 'raid_dp' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const aggregateName = escapePowerShellString(params.aggregateName);
      const diskCount = params.diskCount;
      const raidType = params.raidType;
      
      return `# NetApp ONTAP Manage Storage Aggregate
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
${diskCount ? `    # Create new aggregate
    New-NcAggr \`
        -Name "${aggregateName}" \`
        -DiskCount ${diskCount} \`
        -RaidType ${raidType}
    
    Write-Host "✓ Aggregate '${aggregateName}' created successfully!" -ForegroundColor Green` : `    # Get aggregate info
    $Aggregate = Get-NcAggr -Name "${aggregateName}"
    
    Write-Host "Aggregate Information:" -ForegroundColor Green
    Write-Host "  Name: $($Aggregate.Name)" -ForegroundColor Cyan
    Write-Host "  State: $($Aggregate.State)" -ForegroundColor Cyan
    Write-Host "  Total Size: $($Aggregate.TotalSize / 1GB) GB" -ForegroundColor Cyan
    Write-Host "  Available Size: $($Aggregate.Available / 1GB) GB" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Aggregate operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-create-nfs-export',
    name: 'Configure NFS Export',
    category: 'Common Admin Tasks',
    description: 'Create and configure NFS export',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true },
      { id: 'volumePath', label: 'Volume Path', type: 'path', required: true, placeholder: '/vol_data1' },
      { id: 'clientMatch', label: 'Client Match', type: 'text', required: true, placeholder: '192.168.1.0/24' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumePath = escapePowerShellString(params.volumePath);
      const clientMatch = escapePowerShellString(params.clientMatch);
      
      return `# NetApp ONTAP Configure NFS Export
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    # Create export policy
    $PolicyName = "export_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-NcExportPolicy -Name $PolicyName -Vserver "${svm}"
    
    # Add export rule
    Add-NcExportRule \`
        -Policy $PolicyName \`
        -ClientMatch "${clientMatch}" \`
        -ReadOnlySecurityFlavor sys \`
        -ReadWriteSecurityFlavor sys \`
        -Vserver "${svm}"
    
    # Apply policy to volume
    Set-NcVol -Name (Split-Path "${volumePath}" -Leaf) \`
        -ExportPolicy $PolicyName \`
        -Vserver "${svm}"
    
    Write-Host "✓ NFS export configured successfully!" -ForegroundColor Green
    Write-Host "  Path: ${volumePath}" -ForegroundColor Cyan
    Write-Host "  Client: ${clientMatch}" -ForegroundColor Cyan
    
} catch {
    Write-Error "NFS export configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-monitor-capacity',
    name: 'Monitor Capacity Utilization',
    category: 'Common Admin Tasks',
    description: 'Monitor storage capacity and utilization',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name (optional)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = params.svm ? escapePowerShellString(params.svm) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP Monitor Capacity Utilization
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
${svm ? `    $Volumes = Get-NcVol -Vserver "${svm}"` : `    $Volumes = Get-NcVol`}
    
    $CapacityReport = $Volumes | Select-Object \`
        Name,
        Vserver,
        @{N='TotalGB';E={[math]::Round($_.TotalSize / 1GB, 2)}},
        @{N='UsedGB';E={[math]::Round($_.Used / 1GB, 2)}},
        @{N='AvailableGB';E={[math]::Round($_.Available / 1GB, 2)}},
        @{N='UsedPercent';E={[math]::Round(($_.Used / $_.TotalSize) * 100, 2)}}
    
    Write-Host "Storage Capacity Report:" -ForegroundColor Green
    $CapacityReport | Format-Table -AutoSize
    
    $OverThreshold = $CapacityReport | Where-Object { $_.UsedPercent -gt 80 }
    if ($OverThreshold) {
        Write-Host ""
        Write-Host "Warning: Volumes over 80% capacity:" -ForegroundColor Yellow
        $OverThreshold | Format-Table -AutoSize
    }
    
${exportPath ? `    
    $CapacityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Capacity report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Capacity monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-monitor-performance',
    name: 'Monitor Performance Metrics',
    category: 'Common Admin Tasks',
    description: 'Monitor storage performance metrics',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name (optional)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = params.svm ? escapePowerShellString(params.svm) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP Monitor Performance Metrics
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
${svm ? `    $PerfData = Get-NcPerfData -Vserver "${svm}"` : `    $PerfData = Get-NcPerfData`}
    
    # Get volume performance
    $VolumePerf = Get-NcVol${svm ? ` -Vserver "${svm}"` : ''} | Select-Object \`
        Name,
        Vserver,
        @{N='ReadOps';E={$_.VolumeIdAttributes.InstanceUuid}},
        @{N='WriteOps';E={$_.VolumeIdAttributes.InstanceUuid}}
    
    Write-Host "Storage Performance Metrics:" -ForegroundColor Green
    Write-Host "  Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    
    # Get aggregate performance
    $AggrPerf = Get-NcAggr | Select-Object \`
        Name,
        State,
        @{N='AvailableGB';E={[math]::Round($_.Available / 1GB, 2)}},
        @{N='UsedPercent';E={$_.PercentUsedCapacity}}
    
    $AggrPerf | Format-Table -AutoSize
    
${exportPath ? `    
    $Report = @{
        Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        VolumePerformance = $VolumePerf
        AggregatePerformance = $AggrPerf
    }
    $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath "${exportPath}"
    Write-Host "✓ Performance metrics exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Performance monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-automate-backup',
    name: 'Automate Backup Tasks',
    category: 'Common Admin Tasks',
    description: 'Schedule automated snapshot backups',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true },
      { id: 'schedule', label: 'Schedule', type: 'select', required: true, options: ['Hourly', 'Daily', 'Weekly'], defaultValue: 'Daily' },
      { id: 'retention', label: 'Snapshot Retention Count', type: 'number', required: false, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const schedule = params.schedule;
      const retention = params.retention || 7;
      
      return `# NetApp ONTAP Automate Backup Tasks
# Generated: ${new Date().toISOString()}

$Cluster = "${cluster}"
$SVM = "${svm}"
$Volume = "${volumeName}"
$Schedule = "${schedule}"
$Retention = ${retention}

$ScriptBlock = {
    param($Cluster, $SVM, $Volume, $Retention)
    
    Import-Module NetApp.ONTAP
    
    $CredPath = "$env:USERPROFILE\\netapp-creds.xml"
    $Credential = Import-Clixml -Path $CredPath
    
    try {
        Connect-NcController -Name $Cluster -Credential $Credential
        
        # Create snapshot
        $SnapshotName = "auto_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        New-NcSnapshot -Volume $Volume -Snapshot $SnapshotName -Vserver $SVM
        
        Write-Host "✓ Snapshot created: $SnapshotName"
        
        # Clean up old snapshots
        $Snapshots = Get-NcSnapshot -Volume $Volume -Vserver $SVM | 
            Where-Object { $_.Name -like 'auto_backup_*' } |
            Sort-Object -Property Created -Descending
        
        if ($Snapshots.Count -gt $Retention) {
            $ToDelete = $Snapshots | Select-Object -Skip $Retention
            foreach ($Snap in $ToDelete) {
                Remove-NcSnapshot -Volume $Volume -Snapshot $Snap.Name -Vserver $SVM -Confirm:$false
                Write-Host "  Deleted old snapshot: $($Snap.Name)"
            }
        }
        
    } catch {
        Write-Error "Backup failed: $_"
    }
}

$Trigger = switch ($Schedule) {
    "Hourly"  { New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue) }
    "Daily"   { New-ScheduledTaskTrigger -Daily -At 2am }
    "Weekly"  { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am }
}

$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\\Scripts\\NetApp-Backup.ps1"

# Save script block to file
$ScriptPath = "C:\\Scripts\\NetApp-Backup.ps1"
$ScriptBlock.ToString() | Out-File -FilePath $ScriptPath -Force

Register-ScheduledTask -TaskName "NetApp-AutoBackup-$Volume" -Trigger $Trigger -Action $Action -Description "Automated NetApp snapshot backup for $Volume" -RunLevel Highest

Write-Host "✓ Scheduled backup task created: $Schedule" -ForegroundColor Green
Write-Host "  Script saved to: $ScriptPath" -ForegroundColor Cyan
Write-Host "  Volume: $Volume" -ForegroundColor Cyan
Write-Host "  Retention: $Retention snapshots" -ForegroundColor Cyan
Write-Host "  Note: Save credentials to $env:USERPROFILE\\netapp-creds.xml" -ForegroundColor Yellow
Write-Host "  Run: Get-Credential | Export-Clixml -Path $env:USERPROFILE\\netapp-creds.xml" -ForegroundColor Yellow`;
    },
    isPremium: true
  },
  {
    id: 'netapp-automate-replication',
    name: 'Automate Replication Tasks',
    category: 'Common Admin Tasks',
    description: 'Configure SnapMirror replication',
    parameters: [
      { id: 'sourceCluster', label: 'Source Cluster', type: 'text', required: true },
      { id: 'sourceSVM', label: 'Source SVM', type: 'text', required: true },
      { id: 'sourceVolume', label: 'Source Volume', type: 'text', required: true },
      { id: 'destCluster', label: 'Destination Cluster', type: 'text', required: true },
      { id: 'destSVM', label: 'Destination SVM', type: 'text', required: true },
      { id: 'destVolume', label: 'Destination Volume', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const sourceCluster = escapePowerShellString(params.sourceCluster);
      const sourceSVM = escapePowerShellString(params.sourceSVM);
      const sourceVolume = escapePowerShellString(params.sourceVolume);
      const destCluster = escapePowerShellString(params.destCluster);
      const destSVM = escapePowerShellString(params.destSVM);
      const destVolume = escapePowerShellString(params.destVolume);
      
      return `# NetApp ONTAP Automate Replication Tasks
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    # Connect to source cluster
    $SourceConnection = Connect-NcController -Name "${sourceCluster}" -Credential (Get-Credential -Message "Source cluster credentials")
    
    # Connect to destination cluster
    $DestConnection = Connect-NcController -Name "${destCluster}" -Credential (Get-Credential -Message "Destination cluster credentials")
    
    # Create destination volume (if needed)
    Write-Host "Creating destination volume..." -ForegroundColor Cyan
    New-NcVol \`
        -Name "${destVolume}" \`
        -Vserver "${destSVM}" \`
        -Aggregate aggr1 \`
        -JunctionPath "/${destVolume}" \`
        -Type DP \`
        -VserverContext $DestConnection
    
    # Create SnapMirror relationship
    Write-Host "Creating SnapMirror relationship..." -ForegroundColor Cyan
    New-NcSnapmirror \`
        -SourceCluster "${sourceCluster}" \`
        -SourceVserver "${sourceSVM}" \`
        -SourceVolume "${sourceVolume}" \`
        -DestinationCluster "${destCluster}" \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}" \`
        -Policy MirrorAllSnapshots \`
        -VserverContext $DestConnection
    
    # Initialize replication
    Write-Host "Initializing replication..." -ForegroundColor Cyan
    Invoke-NcSnapmirrorInitialize \`
        -DestinationCluster "${destCluster}" \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}" \`
        -VserverContext $DestConnection
    
    Write-Host "✓ SnapMirror replication configured successfully!" -ForegroundColor Green
    Write-Host "  Source: ${sourceCluster}:${sourceSVM}:${sourceVolume}" -ForegroundColor Cyan
    Write-Host "  Destination: ${destCluster}:${destSVM}:${destVolume}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Replication configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-manage-volume',
    name: 'Manage Volume Settings',
    category: 'Common Admin Tasks',
    description: 'Modify volume settings and properties',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Resize', 'Online', 'Offline', 'Info'], defaultValue: 'Info' },
      { id: 'newSize', label: 'New Size (GB)', type: 'number', required: false, placeholder: '200' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const action = params.action;
      const newSize = params.newSize;
      
      return `# NetApp ONTAP Manage Volume Settings
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    $Volume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    switch ("${action}") {
        "Resize" {
${newSize ? `            Set-NcVolSize \`
                -Name "${volumeName}" \`
                -NewSize "${newSize}g" \`
                -Vserver "${svm}"
            
            Write-Host "✓ Volume resized to ${newSize} GB" -ForegroundColor Green` : `            Write-Host "Error: New size not specified" -ForegroundColor Red`}
        }
        "Online" {
            Set-NcVol -Name "${volumeName}" -Online -Vserver "${svm}"
            Write-Host "✓ Volume brought online" -ForegroundColor Green
        }
        "Offline" {
            Set-NcVol -Name "${volumeName}" -Offline -Vserver "${svm}"
            Write-Host "✓ Volume taken offline" -ForegroundColor Yellow
        }
        "Info" {
            Write-Host "Volume Information:" -ForegroundColor Green
            Write-Host "  Name: $($Volume.Name)" -ForegroundColor Cyan
            Write-Host "  State: $($Volume.State)" -ForegroundColor Cyan
            Write-Host "  Total Size: $([math]::Round($Volume.TotalSize / 1GB, 2)) GB" -ForegroundColor Cyan
            Write-Host "  Used: $([math]::Round($Volume.Used / 1GB, 2)) GB" -ForegroundColor Cyan
            Write-Host "  Available: $([math]::Round($Volume.Available / 1GB, 2)) GB" -ForegroundColor Cyan
            Write-Host "  Junction Path: $($Volume.JunctionPath)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Volume management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-storage-efficiency',
    name: 'Configure Storage Efficiency Policies',
    category: 'Common Admin Tasks',
    description: 'Configure deduplication, compression schedules, and thin provisioning for optimal storage efficiency',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data1' },
      { id: 'enableDedup', label: 'Enable Deduplication', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableCompression', label: 'Enable Compression', type: 'boolean', required: false, defaultValue: true },
      { id: 'scheduleType', label: 'Efficiency Schedule', type: 'select', required: true, options: ['auto', 'daily', 'weekly', 'manual'], defaultValue: 'auto' },
      { id: 'thinProvisioning', label: 'Enable Thin Provisioning', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const enableDedup = params.enableDedup !== false;
      const enableCompression = params.enableCompression !== false;
      const scheduleType = params.scheduleType || 'auto';
      const thinProvisioning = params.thinProvisioning !== false;
      
      return `# NetApp ONTAP Configure Storage Efficiency Policies
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Configuring storage efficiency for volume: ${volumeName}" -ForegroundColor Cyan
    
    # Configure space guarantee (thin provisioning)
${thinProvisioning ? `    Set-NcVol -Name "${volumeName}" -SpaceGuarantee none -Vserver "${svm}"
    Write-Host "✓ Thin provisioning enabled" -ForegroundColor Green` : `    Set-NcVol -Name "${volumeName}" -SpaceGuarantee volume -Vserver "${svm}"
    Write-Host "✓ Thick provisioning enabled" -ForegroundColor Green`}
    
    # Enable/disable deduplication
${enableDedup ? `    Enable-NcSis -Path "/vol/${volumeName}" -Vserver "${svm}"
    Write-Host "✓ Deduplication enabled" -ForegroundColor Green` : `    Disable-NcSis -Path "/vol/${volumeName}" -Vserver "${svm}"
    Write-Host "✓ Deduplication disabled" -ForegroundColor Yellow`}
    
    # Enable/disable compression
${enableCompression ? `    Set-NcSis -Path "/vol/${volumeName}" -EnableCompression \$true -Vserver "${svm}"
    Write-Host "✓ Compression enabled" -ForegroundColor Green` : `    Set-NcSis -Path "/vol/${volumeName}" -EnableCompression \$false -Vserver "${svm}"
    Write-Host "✓ Compression disabled" -ForegroundColor Yellow`}
    
    # Configure efficiency schedule
    $Schedule = switch ("${scheduleType}") {
        "auto"   { "auto" }
        "daily"  { "sun-sat@0" }
        "weekly" { "sun@0" }
        "manual" { "-" }
    }
    
    Set-NcSis -Path "/vol/${volumeName}" -Schedule $Schedule -Vserver "${svm}"
    Write-Host "✓ Efficiency schedule set to: ${scheduleType}" -ForegroundColor Green
    
    # Run storage efficiency scan
${enableDedup || enableCompression ? `    
    Write-Host ""
    Write-Host "Starting storage efficiency scan..." -ForegroundColor Cyan
    Invoke-NcSis -Path "/vol/${volumeName}" -Vserver "${svm}"
    
    # Get efficiency statistics
    Start-Sleep -Seconds 3
    $SisStatus = Get-NcSis -Path "/vol/${volumeName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Storage Efficiency Status:" -ForegroundColor Green
    Write-Host "  Volume: $($SisStatus.Path)" -ForegroundColor Cyan
    Write-Host "  State: $($SisStatus.State)" -ForegroundColor Cyan
    Write-Host "  Dedup: $($SisStatus.IsSisVolume)" -ForegroundColor Cyan
    Write-Host "  Compression: $($SisStatus.CompressionEnabled)" -ForegroundColor Cyan
    Write-Host "  Schedule: $($SisStatus.Schedule)" -ForegroundColor Cyan
    Write-Host "  Space Saved: $([math]::Round($SisStatus.SpaceSaved / 1GB, 2)) GB" -ForegroundColor Cyan` : ''}
    
    Write-Host ""
    Write-Host "✓ Storage efficiency configuration completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Storage efficiency configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-snapmirror-management',
    name: 'Manage SnapMirror Relationships',
    category: 'Common Admin Tasks',
    description: 'Create, update, break, or resume SnapMirror relationships for disaster recovery and data protection',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Update', 'Break', 'Resume', 'Delete', 'Status'], defaultValue: 'Status' },
      { id: 'sourceCluster', label: 'Source Cluster', type: 'text', required: true, placeholder: 'netapp-src' },
      { id: 'sourceSVM', label: 'Source SVM', type: 'text', required: true, placeholder: 'svm_src' },
      { id: 'sourceVolume', label: 'Source Volume', type: 'text', required: true, placeholder: 'vol_src' },
      { id: 'destCluster', label: 'Destination Cluster', type: 'text', required: true, placeholder: 'netapp-dr' },
      { id: 'destSVM', label: 'Destination SVM', type: 'text', required: true, placeholder: 'svm_dr' },
      { id: 'destVolume', label: 'Destination Volume', type: 'text', required: true, placeholder: 'vol_dr' },
      { id: 'policyType', label: 'Replication Policy', type: 'select', required: false, options: ['MirrorAllSnapshots', 'MirrorLatest', 'XDPDefault'], defaultValue: 'MirrorAllSnapshots' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const sourceCluster = escapePowerShellString(params.sourceCluster);
      const sourceSVM = escapePowerShellString(params.sourceSVM);
      const sourceVolume = escapePowerShellString(params.sourceVolume);
      const destCluster = escapePowerShellString(params.destCluster);
      const destSVM = escapePowerShellString(params.destSVM);
      const destVolume = escapePowerShellString(params.destVolume);
      const policyType = params.policyType || 'MirrorAllSnapshots';
      
      return `# NetApp ONTAP Manage SnapMirror Relationships
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    # Connect to source and destination clusters
    Write-Host "Connecting to clusters..." -ForegroundColor Cyan
    $SourceConn = Connect-NcController -Name "${sourceCluster}" -Credential (Get-Credential -Message "Source cluster credentials")
    $DestConn = Connect-NcController -Name "${destCluster}" -Credential (Get-Credential -Message "Destination cluster credentials")
    
    $Action = "${action}"
    
    switch ($Action) {
        "Create" {
            Write-Host "Creating SnapMirror relationship..." -ForegroundColor Cyan
            
            # Create destination volume as DP type
            try {
                New-NcVol \`
                    -Name "${destVolume}" \`
                    -Vserver "${destSVM}" \`
                    -Aggregate aggr1 \`
                    -Type DP \`
                    -VserverContext $DestConn -ErrorAction SilentlyContinue
                Write-Host "  ✓ Destination volume created" -ForegroundColor Green
            } catch {
                Write-Host "  Destination volume already exists or creation skipped" -ForegroundColor Yellow
            }
            
            # Create SnapMirror relationship
            New-NcSnapmirror \`
                -SourceCluster "${sourceCluster}" \`
                -SourceVserver "${sourceSVM}" \`
                -SourceVolume "${sourceVolume}" \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -Policy ${policyType} \`
                -VserverContext $DestConn
            
            Write-Host "  ✓ SnapMirror relationship created" -ForegroundColor Green
            
            # Initialize transfer
            Write-Host "  Initializing baseline transfer..." -ForegroundColor Cyan
            Invoke-NcSnapmirrorInitialize \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn
            
            Write-Host "✓ SnapMirror relationship initialized successfully!" -ForegroundColor Green
        }
        
        "Update" {
            Write-Host "Updating SnapMirror relationship..." -ForegroundColor Cyan
            
            Invoke-NcSnapmirrorUpdate \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn
            
            Write-Host "✓ SnapMirror update initiated successfully!" -ForegroundColor Green
        }
        
        "Break" {
            Write-Host "Breaking SnapMirror relationship..." -ForegroundColor Yellow
            Write-Host "  This will make the destination volume read-write" -ForegroundColor Yellow
            
            # Quiesce first
            Invoke-NcSnapmirrorQuiesce \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn
            
            Start-Sleep -Seconds 5
            
            # Break the relationship
            Invoke-NcSnapmirrorBreak \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn -Confirm:\$false
            
            Write-Host "✓ SnapMirror relationship broken - destination is now read-write" -ForegroundColor Green
        }
        
        "Resume" {
            Write-Host "Resuming SnapMirror relationship..." -ForegroundColor Cyan
            
            Invoke-NcSnapmirrorResync \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn
            
            Write-Host "✓ SnapMirror relationship resumed successfully!" -ForegroundColor Green
        }
        
        "Delete" {
            Write-Host "Deleting SnapMirror relationship..." -ForegroundColor Yellow
            
            # Release on source
            Invoke-NcSnapmirrorRelease \`
                -SourceCluster "${sourceCluster}" \`
                -SourceVserver "${sourceSVM}" \`
                -SourceVolume "${sourceVolume}" \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $SourceConn -Confirm:\$false
            
            # Delete on destination
            Remove-NcSnapmirror \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn -Confirm:\$false
            
            Write-Host "✓ SnapMirror relationship deleted" -ForegroundColor Green
        }
        
        "Status" {
            Write-Host "SnapMirror Relationship Status:" -ForegroundColor Green
            
            $SMRelation = Get-NcSnapmirror \`
                -DestinationCluster "${destCluster}" \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}" \`
                -VserverContext $DestConn
            
            if ($SMRelation) {
                Write-Host "  Source: ${sourceCluster}:${sourceSVM}:${sourceVolume}" -ForegroundColor Cyan
                Write-Host "  Destination: ${destCluster}:${destSVM}:${destVolume}" -ForegroundColor Cyan
                Write-Host "  State: $($SMRelation.MirrorState)" -ForegroundColor Cyan
                Write-Host "  Status: $($SMRelation.RelationshipStatus)" -ForegroundColor Cyan
                Write-Host "  Policy: $($SMRelation.PolicyName)" -ForegroundColor Cyan
                Write-Host "  Last Transfer Size: $([math]::Round($SMRelation.LastTransferSize / 1MB, 2)) MB" -ForegroundColor Cyan
                Write-Host "  Last Transfer Duration: $($SMRelation.LastTransferDuration)" -ForegroundColor Cyan
                Write-Host "  Lag Time: $($SMRelation.LagTime)" -ForegroundColor Cyan
            } else {
                Write-Host "  No SnapMirror relationship found" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Error "SnapMirror operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-qos-policies',
    name: 'Configure Storage QoS Policies',
    category: 'Common Admin Tasks',
    description: 'Set IOPS limits and throughput policies per workload for performance management',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'policyName', label: 'QoS Policy Name', type: 'text', required: true, placeholder: 'qos_policy_db' },
      { id: 'maxIOPS', label: 'Max IOPS', type: 'number', required: false, placeholder: '5000', description: 'Maximum IOPS allowed' },
      { id: 'maxThroughputMBps', label: 'Max Throughput (MB/s)', type: 'number', required: false, placeholder: '500', description: 'Maximum throughput in MB/s' },
      { id: 'minIOPS', label: 'Min IOPS (Expected)', type: 'number', required: false, placeholder: '1000', description: 'Minimum expected IOPS' },
      { id: 'volumeName', label: 'Volume Name (to apply policy)', type: 'text', required: false, placeholder: 'vol_database' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const policyName = escapePowerShellString(params.policyName);
      const maxIOPS = params.maxIOPS;
      const maxThroughputMBps = params.maxThroughputMBps;
      const minIOPS = params.minIOPS;
      const volumeName = params.volumeName ? escapePowerShellString(params.volumeName) : '';
      
      return `# NetApp ONTAP Configure Storage QoS Policies
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Configuring QoS Policy: ${policyName}" -ForegroundColor Cyan
    
    # Build QoS policy parameters
    $QoSParams = @{
        PolicyGroup = "${policyName}"
        Vserver = "${svm}"
    }
    
${maxIOPS ? `    $QoSParams.MaxThroughput = "${maxIOPS}iops"
    Write-Host "  Max IOPS: ${maxIOPS}" -ForegroundColor Cyan` : ''}
${maxThroughputMBps ? `    $QoSParams.MaxThroughput = "${maxThroughputMBps}MB/s"
    Write-Host "  Max Throughput: ${maxThroughputMBps} MB/s" -ForegroundColor Cyan` : ''}
    
    # Check if policy exists
    $ExistingPolicy = Get-NcQosPolicyGroup -Name "${policyName}" -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    if ($ExistingPolicy) {
        Write-Host "  Updating existing QoS policy..." -ForegroundColor Yellow
        
        # Modify existing policy
        Set-NcQosPolicyGroup @QoSParams
        Write-Host "✓ QoS policy updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "  Creating new QoS policy..." -ForegroundColor Cyan
        
        # Create new policy
        New-NcQosPolicyGroup @QoSParams
        Write-Host "✓ QoS policy created successfully!" -ForegroundColor Green
    }
    
${minIOPS ? `    
    # Set minimum IOPS (expected performance)
    # Note: Minimum IOPS requires AFF systems with ONTAP 9.2+
    try {
        Set-NcQosPolicyGroup \`
            -PolicyGroup "${policyName}" \`
            -MinThroughput "${minIOPS}iops" \`
            -Vserver "${svm}" -ErrorAction SilentlyContinue
        Write-Host "  ✓ Min IOPS set to: ${minIOPS}" -ForegroundColor Green
    } catch {
        Write-Host "  Note: Min IOPS not supported on this system" -ForegroundColor Yellow
    }` : ''}
    
${volumeName ? `    
    # Apply QoS policy to volume
    Write-Host ""
    Write-Host "Applying QoS policy to volume: ${volumeName}" -ForegroundColor Cyan
    
    Set-NcVol \`
        -Name "${volumeName}" \`
        -QosPolicyGroup "${policyName}" \`
        -Vserver "${svm}"
    
    Write-Host "✓ QoS policy applied to volume successfully!" -ForegroundColor Green` : ''}
    
    # Display policy details
    Write-Host ""
    Write-Host "QoS Policy Details:" -ForegroundColor Green
    
    $Policy = Get-NcQosPolicyGroup -Name "${policyName}" -Vserver "${svm}"
    
    Write-Host "  Policy Name: $($Policy.PolicyGroup)" -ForegroundColor Cyan
    Write-Host "  Vserver: $($Policy.Vserver)" -ForegroundColor Cyan
    Write-Host "  Max Throughput: $($Policy.MaxThroughput)" -ForegroundColor Cyan
    if ($Policy.MinThroughput) {
        Write-Host "  Min Throughput: $($Policy.MinThroughput)" -ForegroundColor Cyan
    }
    Write-Host "  Number of Workloads: $($Policy.NumWorkloads)" -ForegroundColor Cyan
    
${volumeName ? `    
    # Get volume performance statistics
    Write-Host ""
    Write-Host "Current Volume Statistics:" -ForegroundColor Green
    
    $VolumeStats = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    Write-Host "  Volume: $($VolumeStats.Name)" -ForegroundColor Cyan
    Write-Host "  QoS Policy: $($VolumeStats.QosPolicyGroup)" -ForegroundColor Cyan
    Write-Host "  State: $($VolumeStats.State)" -ForegroundColor Cyan` : ''}
    
    Write-Host ""
    Write-Host "✓ QoS configuration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Monitor QoS performance with:" -ForegroundColor Yellow
    Write-Host "  Get-NcQosStatistic -PolicyGroup '${policyName}'" -ForegroundColor Yellow
    
} catch {
    Write-Error "QoS policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-performance-reports',
    name: 'Generate Volume Performance Reports',
    category: 'Common Admin Tasks',
    description: 'Export comprehensive IOPS, latency, and throughput metrics for performance analysis',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name (optional)', type: 'text', required: false, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name (optional)', type: 'text', required: false, placeholder: 'vol_data1', description: 'Leave blank to report all volumes' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\NetApp_Performance.csv' },
      { id: 'durationMinutes', label: 'Monitoring Duration (minutes)', type: 'number', required: false, defaultValue: 5, placeholder: '5' },
      { id: 'includeAggregate', label: 'Include Aggregate Performance', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = params.svm ? escapePowerShellString(params.svm) : '';
      const volumeName = params.volumeName ? escapePowerShellString(params.volumeName) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      const durationMinutes = params.durationMinutes || 5;
      const includeAggregate = params.includeAggregate !== false;
      
      return `# NetApp ONTAP Generate Volume Performance Reports
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Generating performance report..." -ForegroundColor Cyan
    Write-Host "  Duration: ${durationMinutes} minutes" -ForegroundColor Cyan
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get volumes to monitor
${volumeName ? `    $Volumes = @(Get-NcVol -Name "${volumeName}"${svm ? ` -Vserver "${svm}"` : ''})` : svm ? `    $Volumes = Get-NcVol -Vserver "${svm}"` : `    $Volumes = Get-NcVol`}
    
    Write-Host "Monitoring $($Volumes.Count) volume(s)..." -ForegroundColor Cyan
    
    # Initialize performance data collection
    $PerformanceData = @()
    $SampleInterval = 60  # seconds
    $Iterations = ${durationMinutes}
    
    for ($i = 1; $i -le $Iterations; $i++) {
        Write-Host "  Collecting sample $i of $Iterations..." -ForegroundColor Cyan
        
        foreach ($Vol in $Volumes) {
            # Get volume instance for performance counters
            $VolumeInstance = $Vol.VolumeIdAttributes.InstanceUuid
            
            # Collect performance counters
            $PerfCounters = @{
                'read_ops' = 0
                'write_ops' = 0
                'total_ops' = 0
                'read_latency' = 0
                'write_latency' = 0
                'avg_latency' = 0
                'read_data' = 0
                'write_data' = 0
            }
            
            try {
                # Get performance object instances
                $VolumePerf = Get-NcPerfInstance -Name volume:$($Vol.Name)
                
                if ($VolumePerf) {
                    $Counters = Get-NcPerfData -Name volume -Counter "read_ops,write_ops,read_latency,write_latency,read_data,write_data" -Instance $($Vol.Name)
                    
                    # Calculate metrics
                    $ReadOps = ($Counters | Where-Object {$_.Name -eq 'read_ops'}).Value
                    $WriteOps = ($Counters | Where-Object {$_.Name -eq 'write_ops'}).Value
                    $ReadLatency = ($Counters | Where-Object {$_.Name -eq 'read_latency'}).Value
                    $WriteLatency = ($Counters | Where-Object {$_.Name -eq 'write_latency'}).Value
                    
                    $PerfCounters.read_ops = $ReadOps
                    $PerfCounters.write_ops = $WriteOps
                    $PerfCounters.total_ops = $ReadOps + $WriteOps
                    $PerfCounters.read_latency = if ($ReadOps -gt 0) { $ReadLatency / $ReadOps } else { 0 }
                    $PerfCounters.write_latency = if ($WriteOps -gt 0) { $WriteLatency / $WriteOps } else { 0 }
                    $PerfCounters.avg_latency = if (($ReadOps + $WriteOps) -gt 0) { ($ReadLatency + $WriteLatency) / ($ReadOps + $WriteOps) } else { 0 }
                }
            } catch {
                Write-Host "    Warning: Could not collect all metrics for $($Vol.Name)" -ForegroundColor Yellow
            }
            
            # Create performance record
            $Record = [PSCustomObject]@{
                Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
                Cluster = "${cluster}"
                Vserver = $Vol.Vserver
                Volume = $Vol.Name
                SizeGB = [math]::Round($Vol.TotalSize / 1GB, 2)
                UsedGB = [math]::Round($Vol.Used / 1GB, 2)
                AvailableGB = [math]::Round($Vol.Available / 1GB, 2)
                UsedPercent = [math]::Round(($Vol.Used / $Vol.TotalSize) * 100, 2)
                ReadOps = $PerfCounters.read_ops
                WriteOps = $PerfCounters.write_ops
                TotalIOPS = $PerfCounters.total_ops
                ReadLatencyMS = [math]::Round($PerfCounters.read_latency, 2)
                WriteLatencyMS = [math]::Round($PerfCounters.write_latency, 2)
                AvgLatencyMS = [math]::Round($PerfCounters.avg_latency, 2)
                ReadMBps = [math]::Round($PerfCounters.read_data / 1MB, 2)
                WriteMBps = [math]::Round($PerfCounters.write_data / 1MB, 2)
                State = $Vol.State
                QoSPolicy = $Vol.QosPolicyGroup
            }
            
            $PerformanceData += $Record
        }
        
        if ($i -lt $Iterations) {
            Start-Sleep -Seconds $SampleInterval
        }
    }
    
    # Export volume performance data
    $PerformanceData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Volume performance data exported to: ${exportPath}" -ForegroundColor Green
    
${includeAggregate ? `    
    # Generate aggregate performance report
    Write-Host ""
    Write-Host "Collecting aggregate performance data..." -ForegroundColor Cyan
    
    $Aggregates = Get-NcAggr
    $AggrData = @()
    
    foreach ($Aggr in $Aggregates) {
        $AggrRecord = [PSCustomObject]@{
            Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            Aggregate = $Aggr.Name
            State = $Aggr.State
            TotalGB = [math]::Round($Aggr.TotalSize / 1GB, 2)
            UsedGB = [math]::Round(($Aggr.TotalSize - $Aggr.Available) / 1GB, 2)
            AvailableGB = [math]::Round($Aggr.Available / 1GB, 2)
            UsedPercent = $Aggr.PercentUsedCapacity
            RaidType = $Aggr.RaidType
            VolumeCount = $Aggr.VolumeCount
        }
        $AggrData += $AggrRecord
    }
    
    $AggrPath = "${exportPath}".Replace('.csv', '_Aggregates.csv')
    $AggrData | Export-Csv -Path $AggrPath -NoTypeInformation
    Write-Host "✓ Aggregate performance data exported to: $AggrPath" -ForegroundColor Green` : ''}
    
    # Display summary
    Write-Host ""
    Write-Host "Performance Summary:" -ForegroundColor Green
    Write-Host "  Total Samples Collected: $($PerformanceData.Count)" -ForegroundColor Cyan
    Write-Host "  Average Total IOPS: $([math]::Round(($PerformanceData | Measure-Object -Property TotalIOPS -Average).Average, 2))" -ForegroundColor Cyan
    Write-Host "  Average Latency (ms): $([math]::Round(($PerformanceData | Measure-Object -Property AvgLatencyMS -Average).Average, 2))" -ForegroundColor Cyan
    
    $HighLatency = $PerformanceData | Where-Object { $_.AvgLatencyMS -gt 10 }
    if ($HighLatency) {
        Write-Host ""
        Write-Host "Warning: Volumes with high latency (>10ms):" -ForegroundColor Yellow
        $HighLatency | Select-Object Timestamp, Volume, AvgLatencyMS, TotalIOPS | Format-Table -AutoSize
    }
    
    Write-Host ""
    Write-Host "✓ Performance report generation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Performance report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-create-volume',
    name: 'Create Storage Volume',
    category: 'Volume Management',
    description: 'Create a new storage volume with junction path and export policy',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'sizeGB', label: 'Size (GB)', type: 'number', required: true, placeholder: '100' },
      { id: 'aggregate', label: 'Aggregate Name', type: 'text', required: true, placeholder: 'aggr1' },
      { id: 'junctionPath', label: 'Junction Path', type: 'path', required: false, placeholder: '/vol_data' },
      { id: 'securityStyle', label: 'Security Style', type: 'select', required: true, options: ['unix', 'ntfs', 'mixed'], defaultValue: 'ntfs' },
      { id: 'exportPolicy', label: 'Export Policy', type: 'text', required: false, placeholder: 'default' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const sizeGB = params.sizeGB;
      const aggregate = escapePowerShellString(params.aggregate);
      const junctionPath = params.junctionPath ? escapePowerShellString(params.junctionPath) : `/${params.volumeName}`;
      const securityStyle = params.securityStyle || 'ntfs';
      const exportPolicy = params.exportPolicy ? escapePowerShellString(params.exportPolicy) : 'default';
      
      return `# NetApp ONTAP Create Storage Volume
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating volume: ${volumeName}" -ForegroundColor Cyan
    
    New-NcVol \`
        -Name "${volumeName}" \`
        -Vserver "${svm}" \`
        -Aggregate "${aggregate}" \`
        -Size "${sizeGB}g" \`
        -JunctionPath "${junctionPath}" \`
        -SecurityStyle ${securityStyle} \`
        -ExportPolicy "${exportPolicy}" \`
        -SpaceGuarantee none
    
    Write-Host "✓ Volume '${volumeName}' created successfully!" -ForegroundColor Green
    Write-Host "  Size: ${sizeGB} GB" -ForegroundColor Cyan
    Write-Host "  Junction Path: ${junctionPath}" -ForegroundColor Cyan
    Write-Host "  Security Style: ${securityStyle}" -ForegroundColor Cyan
    Write-Host "  Export Policy: ${exportPolicy}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Volume creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-clone-volume',
    name: 'Clone Volume',
    category: 'Volume Management',
    description: 'Create a FlexClone volume from an existing volume or snapshot',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'parentVolume', label: 'Parent Volume', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'cloneName', label: 'Clone Volume Name', type: 'text', required: true, placeholder: 'vol_data_clone' },
      { id: 'snapshotName', label: 'Snapshot Name (optional)', type: 'text', required: false, placeholder: 'snap_latest', description: 'Leave blank to clone from current state' },
      { id: 'junctionPath', label: 'Junction Path', type: 'path', required: false, placeholder: '/vol_data_clone' },
      { id: 'splitClone', label: 'Split Clone After Creation', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const parentVolume = escapePowerShellString(params.parentVolume);
      const cloneName = escapePowerShellString(params.cloneName);
      const snapshotName = params.snapshotName ? escapePowerShellString(params.snapshotName) : '';
      const junctionPath = params.junctionPath ? escapePowerShellString(params.junctionPath) : `/${params.cloneName}`;
      const splitClone = params.splitClone === true;
      
      return `# NetApp ONTAP Clone Volume
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating FlexClone volume..." -ForegroundColor Cyan
    Write-Host "  Parent Volume: ${parentVolume}" -ForegroundColor Cyan
    Write-Host "  Clone Name: ${cloneName}" -ForegroundColor Cyan
${snapshotName ? `    Write-Host "  From Snapshot: ${snapshotName}" -ForegroundColor Cyan` : ''}
    
${snapshotName ? `    # Clone from specific snapshot
    New-NcVolClone \`
        -CloneVolume "${cloneName}" \`
        -ParentVolume "${parentVolume}" \`
        -ParentSnapshot "${snapshotName}" \`
        -JunctionPath "${junctionPath}" \`
        -Vserver "${svm}"` : `    # Create snapshot for clone base
    \$CloneSnapshot = "clone_base_\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-NcSnapshot -Volume "${parentVolume}" -Snapshot \$CloneSnapshot -Vserver "${svm}"
    
    # Clone from snapshot
    New-NcVolClone \`
        -CloneVolume "${cloneName}" \`
        -ParentVolume "${parentVolume}" \`
        -ParentSnapshot \$CloneSnapshot \`
        -JunctionPath "${junctionPath}" \`
        -Vserver "${svm}"`}
    
    Write-Host "✓ FlexClone volume '${cloneName}' created successfully!" -ForegroundColor Green
    
${splitClone ? `    
    # Split the clone to make it independent
    Write-Host ""
    Write-Host "Splitting clone from parent volume..." -ForegroundColor Cyan
    Start-NcVolCloneSplit -Volume "${cloneName}" -Vserver "${svm}"
    
    # Monitor split progress
    do {
        Start-Sleep -Seconds 5
        \$SplitStatus = Get-NcVol -Name "${cloneName}" -Vserver "${svm}"
        Write-Host "  Split progress: \$(\$SplitStatus.VolumeDrAttributes.PercentageSizeUsed)%" -ForegroundColor Cyan
    } while (\$SplitStatus.VolumeDrAttributes.CloneSplitEstimate -gt 0)
    
    Write-Host "✓ Clone split completed!" -ForegroundColor Green` : ''}
    
    # Display clone information
    \$Clone = Get-NcVol -Name "${cloneName}" -Vserver "${svm}"
    Write-Host ""
    Write-Host "Clone Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$Clone.Name)" -ForegroundColor Cyan
    Write-Host "  Size: \$([math]::Round(\$Clone.TotalSize / 1GB, 2)) GB" -ForegroundColor Cyan
    Write-Host "  Junction Path: \$(\$Clone.JunctionPath)" -ForegroundColor Cyan
    Write-Host "  State: \$(\$Clone.State)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Volume cloning failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-move-volume',
    name: 'Move Volume Between Aggregates',
    category: 'Volume Management',
    description: 'Move a volume from one aggregate to another non-disruptively',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'destAggregate', label: 'Destination Aggregate', type: 'text', required: true, placeholder: 'aggr2' },
      { id: 'cutoverWindow', label: 'Cutover Window (seconds)', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const destAggregate = escapePowerShellString(params.destAggregate);
      const cutoverWindow = params.cutoverWindow || 30;
      
      return `# NetApp ONTAP Move Volume Between Aggregates
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    # Get current volume info
    \$Volume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    \$SourceAggregate = \$Volume.Aggregate
    
    Write-Host "Volume Move Operation:" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  Source Aggregate: \$SourceAggregate" -ForegroundColor Cyan
    Write-Host "  Destination Aggregate: ${destAggregate}" -ForegroundColor Cyan
    Write-Host "  Cutover Window: ${cutoverWindow} seconds" -ForegroundColor Cyan
    Write-Host ""
    
    # Check destination aggregate capacity
    \$DestAggr = Get-NcAggr -Name "${destAggregate}"
    \$RequiredSpace = \$Volume.Used
    
    if (\$DestAggr.Available -lt \$RequiredSpace) {
        Write-Host "Warning: Destination aggregate may not have sufficient space" -ForegroundColor Yellow
        Write-Host "  Required: \$([math]::Round(\$RequiredSpace / 1GB, 2)) GB" -ForegroundColor Yellow
        Write-Host "  Available: \$([math]::Round(\$DestAggr.Available / 1GB, 2)) GB" -ForegroundColor Yellow
    }
    
    # Start volume move
    Write-Host "Starting volume move..." -ForegroundColor Cyan
    
    Start-NcVolMove \`
        -Name "${volumeName}" \`
        -Vserver "${svm}" \`
        -DestinationAggregate "${destAggregate}" \`
        -CutoverWindow ${cutoverWindow}
    
    # Monitor move progress
    Write-Host "Monitoring move progress..." -ForegroundColor Cyan
    
    do {
        Start-Sleep -Seconds 10
        \$MoveStatus = Get-NcVolMove -Vserver "${svm}" | Where-Object { \$_.Volume -eq "${volumeName}" }
        
        if (\$MoveStatus) {
            Write-Host "  State: \$(\$MoveStatus.State) - Progress: \$(\$MoveStatus.PercentComplete)%" -ForegroundColor Cyan
        }
    } while (\$MoveStatus -and \$MoveStatus.State -ne "done" -and \$MoveStatus.State -ne "failed")
    
    if (\$MoveStatus.State -eq "failed") {
        Write-Host "Volume move failed: \$(\$MoveStatus.Details)" -ForegroundColor Red
    } else {
        Write-Host ""
        Write-Host "✓ Volume move completed successfully!" -ForegroundColor Green
        
        # Verify new location
        \$UpdatedVolume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
        Write-Host "  New Aggregate: \$(\$UpdatedVolume.Aggregate)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Volume move failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-delete-snapshots',
    name: 'Delete Volume Snapshots',
    category: 'Snapshot Management',
    description: 'Delete snapshots older than specified retention period',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'retentionDays', label: 'Delete Snapshots Older Than (days)', type: 'number', required: true, placeholder: '30' },
      { id: 'snapshotPattern', label: 'Snapshot Name Pattern (optional)', type: 'text', required: false, placeholder: 'daily_*', description: 'Filter by pattern (e.g., daily_*)' },
      { id: 'dryRun', label: 'Dry Run (Preview Only)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const retentionDays = params.retentionDays;
      const snapshotPattern = params.snapshotPattern ? escapePowerShellString(params.snapshotPattern) : '';
      const dryRun = params.dryRun !== false;
      
      return `# NetApp ONTAP Delete Volume Snapshots
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$RetentionDays = ${retentionDays}
    \$CutoffDate = (Get-Date).AddDays(-\$RetentionDays)
    \$DryRun = \$${dryRun}
    
    Write-Host "Snapshot Cleanup:" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  Retention: ${retentionDays} days" -ForegroundColor Cyan
    Write-Host "  Cutoff Date: \$(\$CutoffDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
${snapshotPattern ? `    Write-Host "  Pattern: ${snapshotPattern}" -ForegroundColor Cyan` : ''}
    Write-Host "  Mode: \$(if (\$DryRun) { 'DRY RUN' } else { 'DELETE' })" -ForegroundColor \$(if (\$DryRun) { 'Yellow' } else { 'Red' })
    Write-Host ""
    
    # Get snapshots
    \$Snapshots = Get-NcSnapshot -Volume "${volumeName}" -Vserver "${svm}"
    
${snapshotPattern ? `    # Filter by pattern
    \$Snapshots = \$Snapshots | Where-Object { \$_.Name -like "${snapshotPattern}" }` : ''}
    
    # Filter by age
    \$OldSnapshots = \$Snapshots | Where-Object { \$_.Created -lt \$CutoffDate }
    
    if (\$OldSnapshots.Count -eq 0) {
        Write-Host "No snapshots found matching criteria" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "Found \$(\$OldSnapshots.Count) snapshot(s) to process:" -ForegroundColor Cyan
    \$OldSnapshots | ForEach-Object {
        Write-Host "  - \$(\$_.Name) (Created: \$(\$_.Created.ToString('yyyy-MM-dd HH:mm:ss')))" -ForegroundColor Cyan
    }
    
    \$DeletedCount = 0
    \$FailedCount = 0
    
    if (-not \$DryRun) {
        Write-Host ""
        Write-Host "Deleting snapshots..." -ForegroundColor Yellow
        
        foreach (\$Snap in \$OldSnapshots) {
            try {
                Remove-NcSnapshot \`
                    -Volume "${volumeName}" \`
                    -Snapshot \$Snap.Name \`
                    -Vserver "${svm}" \`
                    -Confirm:\$false
                
                Write-Host "  ✓ Deleted: \$(\$Snap.Name)" -ForegroundColor Green
                \$DeletedCount++
            } catch {
                Write-Host "  ✗ Failed: \$(\$Snap.Name) - \$_" -ForegroundColor Red
                \$FailedCount++
            }
        }
        
        Write-Host ""
        Write-Host "Cleanup Summary:" -ForegroundColor Green
        Write-Host "  Deleted: \$DeletedCount" -ForegroundColor Cyan
        Write-Host "  Failed: \$FailedCount" -ForegroundColor \$(if (\$FailedCount -gt 0) { 'Red' } else { 'Cyan' })
    } else {
        Write-Host ""
        Write-Host "DRY RUN - No snapshots were deleted" -ForegroundColor Yellow
        Write-Host "Set 'Dry Run' to false to delete snapshots" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Snapshot cleanup failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-restore-snapshot',
    name: 'Restore Volume from Snapshot',
    category: 'Snapshot Management',
    description: 'Restore a volume to a previous snapshot state',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: true, placeholder: 'snap_before_change' },
      { id: 'createBackupSnapshot', label: 'Create Backup Snapshot First', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const snapshotName = escapePowerShellString(params.snapshotName);
      const createBackupSnapshot = params.createBackupSnapshot !== false;
      
      return `# NetApp ONTAP Restore Volume from Snapshot
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Volume Snapshot Restore:" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  Restore to Snapshot: ${snapshotName}" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify snapshot exists
    \$Snapshot = Get-NcSnapshot -Volume "${volumeName}" -Snapshot "${snapshotName}" -Vserver "${svm}"
    
    if (-not \$Snapshot) {
        Write-Host "Error: Snapshot '${snapshotName}' not found" -ForegroundColor Red
        exit
    }
    
    Write-Host "Snapshot found:" -ForegroundColor Green
    Write-Host "  Created: \$(\$Snapshot.Created.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host "  Size: \$([math]::Round(\$Snapshot.Total / 1GB, 2)) GB" -ForegroundColor Cyan
    Write-Host ""
    
${createBackupSnapshot ? `    # Create backup snapshot of current state
    \$BackupSnapshotName = "pre_restore_\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "Creating backup snapshot: \$BackupSnapshotName" -ForegroundColor Cyan
    
    New-NcSnapshot \`
        -Volume "${volumeName}" \`
        -Snapshot \$BackupSnapshotName \`
        -Vserver "${svm}"
    
    Write-Host "✓ Backup snapshot created" -ForegroundColor Green
    Write-Host ""` : ''}
    
    # Restore volume to snapshot
    Write-Host "Restoring volume to snapshot..." -ForegroundColor Yellow
    
    Restore-NcSnapshotVolume \`
        -Volume "${volumeName}" \`
        -Snapshot "${snapshotName}" \`
        -Vserver "${svm}" \`
        -Confirm:\$false
    
    Write-Host ""
    Write-Host "✓ Volume restored successfully to snapshot '${snapshotName}'" -ForegroundColor Green
${createBackupSnapshot ? `    Write-Host "  Backup snapshot available: \$BackupSnapshotName" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Snapshot restore failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-add-aggregate-disks',
    name: 'Add Disks to Aggregate',
    category: 'Aggregate Management',
    description: 'Expand an aggregate by adding spare disks',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'aggregateName', label: 'Aggregate Name', type: 'text', required: true, placeholder: 'aggr1' },
      { id: 'diskCount', label: 'Number of Disks to Add', type: 'number', required: true, placeholder: '4' },
      { id: 'raidGroup', label: 'RAID Group (optional)', type: 'text', required: false, placeholder: 'rg1', description: 'Create new RAID group or add to existing' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const aggregateName = escapePowerShellString(params.aggregateName);
      const diskCount = params.diskCount;
      const raidGroup = params.raidGroup ? escapePowerShellString(params.raidGroup) : '';
      
      return `# NetApp ONTAP Add Disks to Aggregate
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    # Get current aggregate info
    \$Aggregate = Get-NcAggr -Name "${aggregateName}"
    
    Write-Host "Aggregate Expansion:" -ForegroundColor Cyan
    Write-Host "  Aggregate: ${aggregateName}" -ForegroundColor Cyan
    Write-Host "  Current Size: \$([math]::Round(\$Aggregate.TotalSize / 1TB, 2)) TB" -ForegroundColor Cyan
    Write-Host "  Available: \$([math]::Round(\$Aggregate.Available / 1TB, 2)) TB" -ForegroundColor Cyan
    Write-Host "  Disks to Add: ${diskCount}" -ForegroundColor Cyan
    Write-Host ""
    
    # Check spare disks
    \$SpareDisks = Get-NcDisk | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "spare" }
    
    Write-Host "Available Spare Disks: \$(\$SpareDisks.Count)" -ForegroundColor Cyan
    
    if (\$SpareDisks.Count -lt ${diskCount}) {
        Write-Host "Warning: Not enough spare disks available" -ForegroundColor Yellow
        Write-Host "  Required: ${diskCount}" -ForegroundColor Yellow
        Write-Host "  Available: \$(\$SpareDisks.Count)" -ForegroundColor Yellow
        exit
    }
    
    # Add disks to aggregate
    Write-Host ""
    Write-Host "Adding disks to aggregate..." -ForegroundColor Cyan
    
${raidGroup ? `    Add-NcAggrDisk \`
        -Name "${aggregateName}" \`
        -DiskCount ${diskCount} \`
        -RaidGroup "${raidGroup}"` : `    Add-NcAggrDisk \`
        -Name "${aggregateName}" \`
        -DiskCount ${diskCount}`}
    
    # Wait for reconstruction
    Write-Host "Disk addition initiated. Monitoring progress..." -ForegroundColor Cyan
    
    do {
        Start-Sleep -Seconds 30
        \$AggrStatus = Get-NcAggr -Name "${aggregateName}"
        
        if (\$AggrStatus.State -eq "offline") {
            Write-Host "Error: Aggregate went offline" -ForegroundColor Red
            break
        }
        
        Write-Host "  State: \$(\$AggrStatus.State) - Reconstruction in progress..." -ForegroundColor Cyan
    } while (\$AggrStatus.IsReconstruction -eq \$true)
    
    # Get updated aggregate info
    \$UpdatedAggregate = Get-NcAggr -Name "${aggregateName}"
    
    Write-Host ""
    Write-Host "✓ Disks added successfully!" -ForegroundColor Green
    Write-Host "  New Size: \$([math]::Round(\$UpdatedAggregate.TotalSize / 1TB, 2)) TB" -ForegroundColor Cyan
    Write-Host "  New Available: \$([math]::Round(\$UpdatedAggregate.Available / 1TB, 2)) TB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add disks to aggregate: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-aggregate-health',
    name: 'Monitor Aggregate Health',
    category: 'Aggregate Management',
    description: 'Check aggregate health status, disk failures, and RAID reconstruction',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'aggregateName', label: 'Aggregate Name (optional)', type: 'text', required: false, placeholder: 'aggr1', description: 'Leave blank for all aggregates' },
      { id: 'exportPath', label: 'Export Report Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Aggregate_Health.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const aggregateName = params.aggregateName ? escapePowerShellString(params.aggregateName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP Monitor Aggregate Health
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Aggregate Health Report:" -ForegroundColor Cyan
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
    Write-Host "  Timestamp: \$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host ""
    
${aggregateName ? `    \$Aggregates = @(Get-NcAggr -Name "${aggregateName}")` : `    \$Aggregates = Get-NcAggr`}
    
    \$HealthReport = @()
    \$HasIssues = \$false
    
    foreach (\$Aggr in \$Aggregates) {
        Write-Host "Aggregate: \$(\$Aggr.Name)" -ForegroundColor Green
        Write-Host "  State: \$(\$Aggr.State)" -ForegroundColor \$(if (\$Aggr.State -eq 'online') { 'Cyan' } else { 'Red' })
        Write-Host "  RAID Status: \$(\$Aggr.RaidStatus)" -ForegroundColor Cyan
        Write-Host "  Total Size: \$([math]::Round(\$Aggr.TotalSize / 1TB, 2)) TB" -ForegroundColor Cyan
        Write-Host "  Used: \$(\$Aggr.PercentUsedCapacity)%" -ForegroundColor \$(if (\$Aggr.PercentUsedCapacity -gt 90) { 'Red' } elseif (\$Aggr.PercentUsedCapacity -gt 80) { 'Yellow' } else { 'Cyan' })
        
        # Check for issues
        if (\$Aggr.State -ne 'online') { \$HasIssues = \$true }
        if (\$Aggr.IsReconstruction) {
            Write-Host "  ⚠ RAID Reconstruction in Progress" -ForegroundColor Yellow
            \$HasIssues = \$true
        }
        if (\$Aggr.IsDegraded) {
            Write-Host "  ⚠ Aggregate is DEGRADED" -ForegroundColor Red
            \$HasIssues = \$true
        }
        
        # Get disk info for this aggregate
        \$AggrDisks = Get-NcDisk | Where-Object { \$_.Aggregate -eq \$Aggr.Name }
        \$FailedDisks = \$AggrDisks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "broken" }
        
        Write-Host "  Total Disks: \$(\$AggrDisks.Count)" -ForegroundColor Cyan
        
        if (\$FailedDisks) {
            Write-Host "  ⚠ Failed Disks: \$(\$FailedDisks.Count)" -ForegroundColor Red
            \$HasIssues = \$true
            \$FailedDisks | ForEach-Object {
                Write-Host "    - \$(\$_.Name)" -ForegroundColor Red
            }
        }
        
        \$HealthReport += [PSCustomObject]@{
            Aggregate = \$Aggr.Name
            State = \$Aggr.State
            RaidStatus = \$Aggr.RaidStatus
            TotalTB = [math]::Round(\$Aggr.TotalSize / 1TB, 2)
            AvailableTB = [math]::Round(\$Aggr.Available / 1TB, 2)
            UsedPercent = \$Aggr.PercentUsedCapacity
            DiskCount = \$AggrDisks.Count
            FailedDisks = if (\$FailedDisks) { \$FailedDisks.Count } else { 0 }
            IsReconstruction = \$Aggr.IsReconstruction
            IsDegraded = \$Aggr.IsDegraded
        }
        
        Write-Host ""
    }
    
${exportPath ? `    
    \$HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Health report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""` : ''}
    
    if (\$HasIssues) {
        Write-Host "⚠ Issues detected - Review warnings above" -ForegroundColor Yellow
    } else {
        Write-Host "✓ All aggregates healthy" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Aggregate health check failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-create-svm',
    name: 'Create Storage Virtual Machine (SVM)',
    category: 'SVM Management',
    description: 'Create a new SVM with protocols and network configuration',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svmName', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm_production' },
      { id: 'rootVolume', label: 'Root Volume Name', type: 'text', required: true, placeholder: 'svm_production_root' },
      { id: 'rootAggregate', label: 'Root Volume Aggregate', type: 'text', required: true, placeholder: 'aggr1' },
      { id: 'protocols', label: 'Protocols', type: 'select', required: true, options: ['nfs', 'cifs', 'iscsi', 'nfs,cifs', 'nfs,iscsi', 'cifs,iscsi', 'nfs,cifs,iscsi'], defaultValue: 'nfs,cifs' },
      { id: 'language', label: 'Language', type: 'select', required: false, options: ['en_US.UTF-8', 'C.UTF-8', 'de_DE.UTF-8', 'fr_FR.UTF-8', 'ja_JP.UTF-8'], defaultValue: 'C.UTF-8' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svmName = escapePowerShellString(params.svmName);
      const rootVolume = escapePowerShellString(params.rootVolume);
      const rootAggregate = escapePowerShellString(params.rootAggregate);
      const protocols = params.protocols || 'nfs,cifs';
      const language = params.language || 'C.UTF-8';
      
      return `# NetApp ONTAP Create Storage Virtual Machine (SVM)
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating SVM: ${svmName}" -ForegroundColor Cyan
    Write-Host "  Root Volume: ${rootVolume}" -ForegroundColor Cyan
    Write-Host "  Root Aggregate: ${rootAggregate}" -ForegroundColor Cyan
    Write-Host "  Protocols: ${protocols}" -ForegroundColor Cyan
    Write-Host ""
    
    # Create SVM
    New-NcVserver \`
        -Name "${svmName}" \`
        -RootVolume "${rootVolume}" \`
        -RootVolumeAggregate "${rootAggregate}" \`
        -Language "${language}" \`
        -RootVolumeSecurityStyle ntfs
    
    Write-Host "✓ SVM created successfully!" -ForegroundColor Green
    
    # Configure protocols
    \$Protocols = "${protocols}".Split(',')
    
    foreach (\$Protocol in \$Protocols) {
        switch (\$Protocol.Trim()) {
            "nfs" {
                Write-Host "Enabling NFS..." -ForegroundColor Cyan
                Enable-NcNfs -Vserver "${svmName}"
                Write-Host "  ✓ NFS enabled" -ForegroundColor Green
            }
            "cifs" {
                Write-Host "Enabling CIFS..." -ForegroundColor Cyan
                # Note: CIFS requires domain join - configure later
                Write-Host "  Note: CIFS enabled - domain join required" -ForegroundColor Yellow
            }
            "iscsi" {
                Write-Host "Enabling iSCSI..." -ForegroundColor Cyan
                Enable-NcIscsi -Vserver "${svmName}"
                Write-Host "  ✓ iSCSI enabled" -ForegroundColor Green
            }
        }
    }
    
    # Get SVM details
    \$SVM = Get-NcVserver -Vserver "${svmName}"
    
    Write-Host ""
    Write-Host "SVM Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$SVM.VserverName)" -ForegroundColor Cyan
    Write-Host "  State: \$(\$SVM.State)" -ForegroundColor Cyan
    Write-Host "  Root Volume: \$(\$SVM.RootVolume)" -ForegroundColor Cyan
    Write-Host "  Allowed Protocols: \$(\$SVM.AllowedProtocols -join ', ')" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Create network interfaces (LIFs) for data access" -ForegroundColor Yellow
    Write-Host "  2. Configure DNS and name services" -ForegroundColor Yellow
    Write-Host "  3. Join CIFS domain if using SMB" -ForegroundColor Yellow
    Write-Host "  4. Create volumes and shares" -ForegroundColor Yellow
    
} catch {
    Write-Error "SVM creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-create-lif',
    name: 'Create Network Interface (LIF)',
    category: 'SVM Management',
    description: 'Create a logical interface for data access',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'lifName', label: 'LIF Name', type: 'text', required: true, placeholder: 'lif_nfs_data1' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'netmask', label: 'Netmask', type: 'text', required: true, placeholder: '255.255.255.0' },
      { id: 'gateway', label: 'Gateway', type: 'text', required: false, placeholder: '192.168.1.1' },
      { id: 'homeNode', label: 'Home Node', type: 'text', required: true, placeholder: 'node1' },
      { id: 'homePort', label: 'Home Port', type: 'text', required: true, placeholder: 'e0d' },
      { id: 'dataProtocol', label: 'Data Protocol', type: 'select', required: true, options: ['nfs', 'cifs', 'iscsi', 'nfs,cifs'], defaultValue: 'nfs,cifs' },
      { id: 'failoverPolicy', label: 'Failover Policy', type: 'select', required: false, options: ['system-defined', 'local-only', 'sfo-partner-only', 'disabled'], defaultValue: 'system-defined' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const lifName = escapePowerShellString(params.lifName);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const netmask = escapePowerShellString(params.netmask);
      const gateway = params.gateway ? escapePowerShellString(params.gateway) : '';
      const homeNode = escapePowerShellString(params.homeNode);
      const homePort = escapePowerShellString(params.homePort);
      const dataProtocol = params.dataProtocol || 'nfs,cifs';
      const failoverPolicy = params.failoverPolicy || 'system-defined';
      
      return `# NetApp ONTAP Create Network Interface (LIF)
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating LIF: ${lifName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  IP Address: ${ipAddress}" -ForegroundColor Cyan
    Write-Host "  Home Node:Port: ${homeNode}:${homePort}" -ForegroundColor Cyan
    Write-Host ""
    
    # Create the LIF
    New-NcNetInterface \`
        -Name "${lifName}" \`
        -Vserver "${svm}" \`
        -Role data \`
        -DataProtocols ${dataProtocol.split(',').map(p => `"${p.trim()}"`).join(',')} \`
        -Address "${ipAddress}" \`
        -Netmask "${netmask}" \`
        -HomeNode "${homeNode}" \`
        -HomePort "${homePort}" \`
        -FailoverPolicy ${failoverPolicy} \`
        -FirewallPolicy data \`
        -AutoRevert \$true
    
    Write-Host "✓ LIF created successfully!" -ForegroundColor Green
    
${gateway ? `    
    # Configure default gateway
    Write-Host "Configuring gateway..." -ForegroundColor Cyan
    New-NcNetRoute \`
        -Destination "0.0.0.0/0" \`
        -Gateway "${gateway}" \`
        -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    Write-Host "  ✓ Gateway configured: ${gateway}" -ForegroundColor Green` : ''}
    
    # Get LIF details
    \$LIF = Get-NcNetInterface -Name "${lifName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "LIF Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$LIF.InterfaceName)" -ForegroundColor Cyan
    Write-Host "  IP Address: \$(\$LIF.Address)" -ForegroundColor Cyan
    Write-Host "  Netmask: \$(\$LIF.Netmask)" -ForegroundColor Cyan
    Write-Host "  Home Node:Port: \$(\$LIF.HomeNode):\$(\$LIF.HomePort)" -ForegroundColor Cyan
    Write-Host "  Current Node:Port: \$(\$LIF.CurrentNode):\$(\$LIF.CurrentPort)" -ForegroundColor Cyan
    Write-Host "  Operational Status: \$(\$LIF.OpStatus)" -ForegroundColor Cyan
    Write-Host "  Admin Status: \$(\$LIF.AdministrativeStatus)" -ForegroundColor Cyan
    Write-Host "  Data Protocols: \$(\$LIF.DataProtocols -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "LIF creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-configure-dns',
    name: 'Configure SVM DNS',
    category: 'SVM Management',
    description: 'Configure DNS servers and domain for an SVM',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'dnsDomains', label: 'DNS Domains (comma-separated)', type: 'text', required: true, placeholder: 'corp.example.com,example.com' },
      { id: 'dnsServers', label: 'DNS Servers (comma-separated)', type: 'text', required: true, placeholder: '192.168.1.10,192.168.1.11' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const dnsDomains = params.dnsDomains;
      const dnsServers = params.dnsServers;
      
      return `# NetApp ONTAP Configure SVM DNS
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$DnsDomains = @(${dnsDomains.split(',').map(d => `"${d.trim()}"`).join(', ')})
    \$DnsServers = @(${dnsServers.split(',').map(s => `"${s.trim()}"`).join(', ')})
    
    Write-Host "Configuring DNS for SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Domains: \$(\$DnsDomains -join ', ')" -ForegroundColor Cyan
    Write-Host "  Servers: \$(\$DnsServers -join ', ')" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if DNS already configured
    \$ExistingDns = Get-NcNetDns -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    if (\$ExistingDns) {
        Write-Host "Updating existing DNS configuration..." -ForegroundColor Yellow
        Set-NcNetDns \`
            -Vserver "${svm}" \`
            -Domains \$DnsDomains \`
            -NameServers \$DnsServers
    } else {
        Write-Host "Creating DNS configuration..." -ForegroundColor Cyan
        New-NcNetDns \`
            -Vserver "${svm}" \`
            -Domains \$DnsDomains \`
            -NameServers \$DnsServers
    }
    
    Write-Host "✓ DNS configured successfully!" -ForegroundColor Green
    
    # Verify DNS resolution
    Write-Host ""
    Write-Host "Testing DNS resolution..." -ForegroundColor Cyan
    
    foreach (\$Domain in \$DnsDomains) {
        try {
            \$Lookup = Resolve-DnsName -Name \$Domain -Server \$DnsServers[0] -ErrorAction Stop
            Write-Host "  ✓ \$Domain resolves successfully" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ \$Domain resolution failed" -ForegroundColor Yellow
        }
    }
    
    # Get DNS configuration
    \$Dns = Get-NcNetDns -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "DNS Configuration:" -ForegroundColor Green
    Write-Host "  State: \$(\$Dns.State)" -ForegroundColor Cyan
    Write-Host "  Domains: \$(\$Dns.Domains -join ', ')" -ForegroundColor Cyan
    Write-Host "  Servers: \$(\$Dns.NameServers -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "DNS configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-cifs-share-permissions',
    name: 'Manage CIFS Share Permissions',
    category: 'CIFS/SMB Management',
    description: 'Configure share-level permissions for CIFS shares',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'SharedData' },
      { id: 'userOrGroup', label: 'User or Group', type: 'text', required: true, placeholder: 'DOMAIN\\GroupName' },
      { id: 'permission', label: 'Permission', type: 'select', required: true, options: ['Full_Control', 'Change', 'Read', 'No_access'], defaultValue: 'Change' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove', 'List'], defaultValue: 'Add' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const shareName = escapePowerShellString(params.shareName);
      const userOrGroup = escapePowerShellString(params.userOrGroup);
      const permission = params.permission || 'Change';
      const action = params.action || 'Add';
      
      return `# NetApp ONTAP Manage CIFS Share Permissions
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$Action = "${action}"
    
    Write-Host "CIFS Share Permission Management:" -ForegroundColor Cyan
    Write-Host "  Share: ${shareName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Action: \$Action" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify share exists
    \$Share = Get-NcCifsShare -Name "${shareName}" -Vserver "${svm}"
    if (-not \$Share) {
        Write-Host "Error: Share '${shareName}' not found" -ForegroundColor Red
        exit
    }
    
    switch (\$Action) {
        "Add" {
            Write-Host "Adding permission for: ${userOrGroup}" -ForegroundColor Cyan
            Write-Host "  Permission: ${permission}" -ForegroundColor Cyan
            
            Add-NcCifsShareAcl \`
                -Share "${shareName}" \`
                -UserOrGroup "${userOrGroup}" \`
                -Permission ${permission} \`
                -Vserver "${svm}"
            
            Write-Host "✓ Permission added successfully!" -ForegroundColor Green
        }
        "Remove" {
            Write-Host "Removing permission for: ${userOrGroup}" -ForegroundColor Yellow
            
            Remove-NcCifsShareAcl \`
                -Share "${shareName}" \`
                -UserOrGroup "${userOrGroup}" \`
                -Vserver "${svm}" \`
                -Confirm:\$false
            
            Write-Host "✓ Permission removed successfully!" -ForegroundColor Green
        }
        "List" {
            Write-Host "Current Share Permissions:" -ForegroundColor Green
        }
    }
    
    # List current permissions
    Write-Host ""
    Write-Host "Share ACL:" -ForegroundColor Green
    
    \$Acls = Get-NcCifsShareAcl -Share "${shareName}" -Vserver "${svm}"
    \$Acls | ForEach-Object {
        Write-Host "  \$(\$_.UserOrGroup): \$(\$_.Permission)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "CIFS permission management failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-cifs-home-directory',
    name: 'Configure CIFS Home Directories',
    category: 'CIFS/SMB Management',
    description: 'Set up dynamic home directory shares for users',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'homes' },
      { id: 'homeDirPath', label: 'Home Directory Path', type: 'path', required: true, placeholder: '/home' },
      { id: 'searchPath', label: 'Search Path Pattern', type: 'text', required: true, placeholder: '/home/%w', description: '%w=Windows username, %u=UNIX username, %d=domain' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const shareName = escapePowerShellString(params.shareName);
      const homeDirPath = escapePowerShellString(params.homeDirPath);
      const searchPath = escapePowerShellString(params.searchPath);
      
      return `# NetApp ONTAP Configure CIFS Home Directories
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Configuring CIFS Home Directories:" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Share Name: ${shareName}" -ForegroundColor Cyan
    Write-Host "  Base Path: ${homeDirPath}" -ForegroundColor Cyan
    Write-Host "  Search Path: ${searchPath}" -ForegroundColor Cyan
    Write-Host ""
    
    # Add home directory search path
    Write-Host "Adding home directory search path..." -ForegroundColor Cyan
    
    Add-NcCifsHomeDirectorySearchPath \`
        -Path "${searchPath}" \`
        -Vserver "${svm}"
    
    Write-Host "✓ Search path added" -ForegroundColor Green
    
    # Create home directory share
    Write-Host "Creating home directory share..." -ForegroundColor Cyan
    
    Add-NcCifsShare \`
        -Name "${shareName}" \`
        -Path "${homeDirPath}" \`
        -Vserver "${svm}" \`
        -ShareProperties homedirectory,browsable
    
    Write-Host "✓ Home directory share created" -ForegroundColor Green
    
    # Configure share permissions
    Write-Host "Configuring share permissions..." -ForegroundColor Cyan
    
    # Remove everyone
    Remove-NcCifsShareAcl \`
        -Share "${shareName}" \`
        -UserOrGroup "Everyone" \`
        -Vserver "${svm}" \`
        -Confirm:\$false -ErrorAction SilentlyContinue
    
    # Add domain users with change access
    Add-NcCifsShareAcl \`
        -Share "${shareName}" \`
        -UserOrGroup "BUILTIN\\Authenticated Users" \`
        -Permission Change \`
        -Vserver "${svm}"
    
    Write-Host "✓ Permissions configured" -ForegroundColor Green
    
    # Display configuration
    Write-Host ""
    Write-Host "Home Directory Configuration:" -ForegroundColor Green
    
    \$SearchPaths = Get-NcCifsHomeDirectorySearchPath -Vserver "${svm}"
    Write-Host "  Search Paths:" -ForegroundColor Cyan
    \$SearchPaths | ForEach-Object {
        Write-Host "    - \$(\$_.Path)" -ForegroundColor Cyan
    }
    
    \$Share = Get-NcCifsShare -Name "${shareName}" -Vserver "${svm}"
    Write-Host "  Share: \$(\$Share.ShareName)" -ForegroundColor Cyan
    Write-Host "  Properties: \$(\$Share.ShareProperties -join ', ')" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Users can now access: \\\\server\\${shareName}" -ForegroundColor Yellow
    Write-Host "Each user will be redirected to their own folder" -ForegroundColor Yellow
    
} catch {
    Write-Error "Home directory configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-cifs-abe',
    name: 'Enable Access-Based Enumeration',
    category: 'CIFS/SMB Management',
    description: 'Configure Access-Based Enumeration (ABE) to hide files/folders users cannot access',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'SharedData' },
      { id: 'enableABE', label: 'Enable ABE', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const shareName = escapePowerShellString(params.shareName);
      const enableABE = params.enableABE !== false;
      
      return `# NetApp ONTAP Enable Access-Based Enumeration
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Access-Based Enumeration Configuration:" -ForegroundColor Cyan
    Write-Host "  Share: ${shareName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  ABE: ${enableABE ? 'Enable' : 'Disable'}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get current share
    \$Share = Get-NcCifsShare -Name "${shareName}" -Vserver "${svm}"
    
    if (-not \$Share) {
        Write-Host "Error: Share '${shareName}' not found" -ForegroundColor Red
        exit
    }
    
    # Get current properties
    \$CurrentProperties = @(\$Share.ShareProperties)
    
${enableABE ? `    # Add ABE property
    if (\$CurrentProperties -notcontains "access_based_enumeration") {
        \$NewProperties = \$CurrentProperties + "access_based_enumeration"
        
        Set-NcCifsShare \`
            -Name "${shareName}" \`
            -ShareProperties \$NewProperties \`
            -Vserver "${svm}"
        
        Write-Host "✓ Access-Based Enumeration enabled" -ForegroundColor Green
    } else {
        Write-Host "ABE is already enabled on this share" -ForegroundColor Yellow
    }` : `    # Remove ABE property
    if (\$CurrentProperties -contains "access_based_enumeration") {
        \$NewProperties = \$CurrentProperties | Where-Object { \$_ -ne "access_based_enumeration" }
        
        Set-NcCifsShare \`
            -Name "${shareName}" \`
            -ShareProperties \$NewProperties \`
            -Vserver "${svm}"
        
        Write-Host "✓ Access-Based Enumeration disabled" -ForegroundColor Green
    } else {
        Write-Host "ABE is already disabled on this share" -ForegroundColor Yellow
    }`}
    
    # Display current share configuration
    \$UpdatedShare = Get-NcCifsShare -Name "${shareName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Current Share Properties:" -ForegroundColor Green
    Write-Host "  \$(\$UpdatedShare.ShareProperties -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "ABE configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-nfs-export-rules',
    name: 'Manage NFS Export Rules',
    category: 'NFS Management',
    description: 'Add, modify, or remove NFS export policy rules',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'policyName', label: 'Export Policy Name', type: 'text', required: true, placeholder: 'export_policy1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove', 'List'], defaultValue: 'Add' },
      { id: 'clientMatch', label: 'Client Match', type: 'text', required: false, placeholder: '192.168.1.0/24', description: 'IP address, subnet, or hostname pattern' },
      { id: 'roRule', label: 'Read-Only Security', type: 'select', required: false, options: ['sys', 'krb5', 'krb5i', 'krb5p', 'never', 'any'], defaultValue: 'sys' },
      { id: 'rwRule', label: 'Read-Write Security', type: 'select', required: false, options: ['sys', 'krb5', 'krb5i', 'krb5p', 'never', 'any'], defaultValue: 'sys' },
      { id: 'superuser', label: 'Superuser Security', type: 'select', required: false, options: ['sys', 'krb5', 'krb5i', 'krb5p', 'none', 'any'], defaultValue: 'sys' },
      { id: 'anonId', label: 'Anonymous User ID', type: 'number', required: false, placeholder: '65534', defaultValue: 65534 },
      { id: 'ruleIndex', label: 'Rule Index (for remove)', type: 'number', required: false, placeholder: '1' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const policyName = escapePowerShellString(params.policyName);
      const action = params.action || 'Add';
      const clientMatch = params.clientMatch ? escapePowerShellString(params.clientMatch) : '';
      const roRule = params.roRule || 'sys';
      const rwRule = params.rwRule || 'sys';
      const superuser = params.superuser || 'sys';
      const anonId = params.anonId || 65534;
      const ruleIndex = params.ruleIndex;
      
      return `# NetApp ONTAP Manage NFS Export Rules
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$Action = "${action}"
    
    Write-Host "NFS Export Rule Management:" -ForegroundColor Cyan
    Write-Host "  Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Action: \$Action" -ForegroundColor Cyan
    Write-Host ""
    
    # Ensure export policy exists
    \$Policy = Get-NcExportPolicy -Name "${policyName}" -Vserver "${svm}" -ErrorAction SilentlyContinue
    if (-not \$Policy) {
        if (\$Action -eq "Add") {
            Write-Host "Creating export policy: ${policyName}" -ForegroundColor Cyan
            New-NcExportPolicy -Name "${policyName}" -Vserver "${svm}"
            Write-Host "✓ Export policy created" -ForegroundColor Green
        } else {
            Write-Host "Error: Export policy '${policyName}' not found" -ForegroundColor Red
            exit
        }
    }
    
    switch (\$Action) {
        "Add" {
            Write-Host "Adding export rule..." -ForegroundColor Cyan
            Write-Host "  Client Match: ${clientMatch}" -ForegroundColor Cyan
            Write-Host "  RO Rule: ${roRule}" -ForegroundColor Cyan
            Write-Host "  RW Rule: ${rwRule}" -ForegroundColor Cyan
            Write-Host "  Superuser: ${superuser}" -ForegroundColor Cyan
            
            Add-NcExportRule \`
                -Policy "${policyName}" \`
                -ClientMatch "${clientMatch}" \`
                -ReadOnlySecurityFlavor ${roRule} \`
                -ReadWriteSecurityFlavor ${rwRule} \`
                -SuperUserSecurityFlavor ${superuser} \`
                -Anonymous ${anonId} \`
                -Vserver "${svm}"
            
            Write-Host "✓ Export rule added successfully!" -ForegroundColor Green
        }
        "Remove" {
${ruleIndex ? `            Write-Host "Removing export rule index: ${ruleIndex}" -ForegroundColor Yellow
            
            Remove-NcExportRule \`
                -Policy "${policyName}" \`
                -Index ${ruleIndex} \`
                -Vserver "${svm}" \`
                -Confirm:\$false
            
            Write-Host "✓ Export rule removed successfully!" -ForegroundColor Green` : `            Write-Host "Error: Rule index required for removal" -ForegroundColor Red`}
        }
        "List" {
            Write-Host "Export Policy Rules:" -ForegroundColor Green
        }
    }
    
    # List all rules
    Write-Host ""
    Write-Host "Current Export Rules for '${policyName}':" -ForegroundColor Green
    
    \$Rules = Get-NcExportRule -Policy "${policyName}" -Vserver "${svm}"
    
    if (\$Rules) {
        \$Rules | Format-Table -Property RuleIndex, ClientMatch, ReadOnlyRule, ReadWriteRule, SuperUserSecurityType -AutoSize
    } else {
        Write-Host "  No rules defined" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "NFS export rule management failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-nfs-client-access',
    name: 'List NFS Connected Clients',
    category: 'NFS Management',
    description: 'Display all connected NFS clients and their mount information',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name (optional)', type: 'text', required: false, placeholder: 'svm1' },
      { id: 'exportPath', label: 'Export Report Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\NFS_Clients.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = params.svm ? escapePowerShellString(params.svm) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP List NFS Connected Clients
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "NFS Connected Clients Report:" -ForegroundColor Cyan
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
${svm ? `    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan` : ''}
    Write-Host "  Timestamp: \$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host ""
    
    # Get NFS client information
${svm ? `    \$NfsClients = Get-NcNfsConnectedClient -Vserver "${svm}"` : `    \$NfsClients = Get-NcNfsConnectedClient`}
    
    if (\$NfsClients) {
        Write-Host "Connected NFS Clients: \$(\$NfsClients.Count)" -ForegroundColor Green
        Write-Host ""
        
        \$ClientReport = \$NfsClients | Select-Object \`
            ClientIP,
            Vserver,
            Protocol,
            Volume,
            @{N='IdleDuration';E={\$_.IdleDuration}},
            LocalRequestCount,
            RemoteRequestCount
        
        \$ClientReport | Format-Table -AutoSize
        
${exportPath ? `        
        \$ClientReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "✓ Client report exported to: ${exportPath}" -ForegroundColor Green` : ''}
        
        # Summary by client
        Write-Host ""
        Write-Host "Summary by Client IP:" -ForegroundColor Green
        
        \$NfsClients | Group-Object ClientIP | ForEach-Object {
            Write-Host "  \$(\$_.Name): \$(\$_.Count) connection(s)" -ForegroundColor Cyan
        }
        
        # Summary by volume
        Write-Host ""
        Write-Host "Summary by Volume:" -ForegroundColor Green
        
        \$NfsClients | Group-Object Volume | ForEach-Object {
            Write-Host "  \$(\$_.Name): \$(\$_.Count) client(s)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "No connected NFS clients found" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "NFS client report failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-create-lun',
    name: 'Create iSCSI LUN',
    category: 'iSCSI/FCP Management',
    description: 'Create a new LUN for iSCSI or FCP access',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_luns' },
      { id: 'lunName', label: 'LUN Name', type: 'text', required: true, placeholder: 'lun_sql_data' },
      { id: 'sizeGB', label: 'Size (GB)', type: 'number', required: true, placeholder: '500' },
      { id: 'osType', label: 'OS Type', type: 'select', required: true, options: ['windows', 'windows_2008', 'windows_gpt', 'linux', 'vmware', 'hyper_v', 'aix', 'hpux', 'solaris'], defaultValue: 'windows_gpt' },
      { id: 'spaceReserved', label: 'Space Reserved', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const lunName = escapePowerShellString(params.lunName);
      const sizeGB = params.sizeGB;
      const osType = params.osType || 'windows_gpt';
      const spaceReserved = params.spaceReserved !== false;
      
      return `# NetApp ONTAP Create iSCSI LUN
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$LunPath = "/vol/${volumeName}/${lunName}"
    
    Write-Host "Creating LUN:" -ForegroundColor Cyan
    Write-Host "  Path: \$LunPath" -ForegroundColor Cyan
    Write-Host "  Size: ${sizeGB} GB" -ForegroundColor Cyan
    Write-Host "  OS Type: ${osType}" -ForegroundColor Cyan
    Write-Host "  Space Reserved: ${spaceReserved}" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify volume exists
    \$Volume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    if (-not \$Volume) {
        Write-Host "Error: Volume '${volumeName}' not found" -ForegroundColor Red
        exit
    }
    
    # Create LUN
    New-NcLun \`
        -Path \$LunPath \`
        -Size ${sizeGB}g \`
        -OsType ${osType} \`
        -SpaceReservation ${spaceReserved ? '$true' : '$false'} \`
        -Vserver "${svm}"
    
    Write-Host "✓ LUN created successfully!" -ForegroundColor Green
    
    # Get LUN details
    \$Lun = Get-NcLun -Path \$LunPath -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "LUN Details:" -ForegroundColor Green
    Write-Host "  Path: \$(\$Lun.Path)" -ForegroundColor Cyan
    Write-Host "  Size: \$([math]::Round(\$Lun.Size / 1GB, 2)) GB" -ForegroundColor Cyan
    Write-Host "  Online: \$(\$Lun.Online)" -ForegroundColor Cyan
    Write-Host "  Serial Number: \$(\$Lun.SerialNumber)" -ForegroundColor Cyan
    Write-Host "  OS Type: \$(\$Lun.OsType)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Create an igroup for your initiators" -ForegroundColor Yellow
    Write-Host "  2. Map the LUN to the igroup" -ForegroundColor Yellow
    
} catch {
    Write-Error "LUN creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-create-igroup',
    name: 'Create iSCSI Initiator Group',
    category: 'iSCSI/FCP Management',
    description: 'Create an igroup and add iSCSI or FCP initiators',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'igroupName', label: 'Igroup Name', type: 'text', required: true, placeholder: 'igroup_sql_cluster' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['iscsi', 'fcp', 'mixed'], defaultValue: 'iscsi' },
      { id: 'osType', label: 'OS Type', type: 'select', required: true, options: ['windows', 'linux', 'vmware', 'hyper_v', 'aix', 'hpux', 'solaris'], defaultValue: 'windows' },
      { id: 'initiators', label: 'Initiators (comma-separated)', type: 'textarea', required: true, placeholder: 'iqn.1991-05.com.microsoft:server1\niqn.1991-05.com.microsoft:server2', description: 'iSCSI IQNs or FCP WWPNs' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const igroupName = escapePowerShellString(params.igroupName);
      const protocol = params.protocol || 'iscsi';
      const osType = params.osType || 'windows';
      const initiators = (params.initiators as string).split('\n').filter(i => i.trim()).map(i => escapePowerShellString(i.trim()));
      
      return `# NetApp ONTAP Create iSCSI Initiator Group
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating Initiator Group:" -ForegroundColor Cyan
    Write-Host "  Name: ${igroupName}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  OS Type: ${osType}" -ForegroundColor Cyan
    Write-Host ""
    
    # Create igroup
    New-NcIgroup \`
        -Name "${igroupName}" \`
        -Protocol ${protocol} \`
        -Type ${osType} \`
        -Vserver "${svm}"
    
    Write-Host "✓ Igroup created successfully!" -ForegroundColor Green
    
    # Add initiators
    \$Initiators = @(
${initiators.map(i => `        "${i}"`).join(',\n')}
    )
    
    Write-Host ""
    Write-Host "Adding initiators..." -ForegroundColor Cyan
    
    foreach (\$Initiator in \$Initiators) {
        if (\$Initiator.Trim() -ne "") {
            try {
                Add-NcIgroupInitiator \`
                    -Name "${igroupName}" \`
                    -Initiator \$Initiator.Trim() \`
                    -Vserver "${svm}"
                
                Write-Host "  ✓ Added: \$Initiator" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed: \$Initiator - \$_" -ForegroundColor Red
            }
        }
    }
    
    # Get igroup details
    \$Igroup = Get-NcIgroup -Name "${igroupName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Igroup Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$Igroup.Name)" -ForegroundColor Cyan
    Write-Host "  Protocol: \$(\$Igroup.Protocol)" -ForegroundColor Cyan
    Write-Host "  OS Type: \$(\$Igroup.Type)" -ForegroundColor Cyan
    Write-Host "  Initiators: \$(\$Igroup.Initiators.Count)" -ForegroundColor Cyan
    
    \$Igroup.Initiators | ForEach-Object {
        Write-Host "    - \$(\$_.InitiatorName)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Igroup creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-map-lun',
    name: 'Map LUN to Initiator Group',
    category: 'iSCSI/FCP Management',
    description: 'Map a LUN to an igroup for host access',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'lunPath', label: 'LUN Path', type: 'path', required: true, placeholder: '/vol/vol_luns/lun_sql_data' },
      { id: 'igroupName', label: 'Igroup Name', type: 'text', required: true, placeholder: 'igroup_sql_cluster' },
      { id: 'lunId', label: 'LUN ID (optional)', type: 'number', required: false, placeholder: '0', description: 'Leave blank for automatic assignment' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const lunPath = escapePowerShellString(params.lunPath);
      const igroupName = escapePowerShellString(params.igroupName);
      const lunId = params.lunId;
      
      return `# NetApp ONTAP Map LUN to Initiator Group
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "LUN Mapping:" -ForegroundColor Cyan
    Write-Host "  LUN Path: ${lunPath}" -ForegroundColor Cyan
    Write-Host "  Igroup: ${igroupName}" -ForegroundColor Cyan
${lunId !== undefined && lunId !== '' ? `    Write-Host "  LUN ID: ${lunId}" -ForegroundColor Cyan` : ''}
    Write-Host ""
    
    # Verify LUN exists
    \$Lun = Get-NcLun -Path "${lunPath}" -Vserver "${svm}"
    if (-not \$Lun) {
        Write-Host "Error: LUN '${lunPath}' not found" -ForegroundColor Red
        exit
    }
    
    # Verify igroup exists
    \$Igroup = Get-NcIgroup -Name "${igroupName}" -Vserver "${svm}"
    if (-not \$Igroup) {
        Write-Host "Error: Igroup '${igroupName}' not found" -ForegroundColor Red
        exit
    }
    
    # Map LUN to igroup
${lunId !== undefined && lunId !== '' ? `    Add-NcLunMap \`
        -Path "${lunPath}" \`
        -InitiatorGroup "${igroupName}" \`
        -Id ${lunId} \`
        -Vserver "${svm}"` : `    Add-NcLunMap \`
        -Path "${lunPath}" \`
        -InitiatorGroup "${igroupName}" \`
        -Vserver "${svm}"`}
    
    Write-Host "✓ LUN mapped successfully!" -ForegroundColor Green
    
    # Get mapping details
    \$Mapping = Get-NcLunMap -Path "${lunPath}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "LUN Mapping Details:" -ForegroundColor Green
    \$Mapping | ForEach-Object {
        Write-Host "  Igroup: \$(\$_.InitiatorGroup)" -ForegroundColor Cyan
        Write-Host "  LUN ID: \$(\$_.LunId)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Hosts can now access the LUN using LUN ID: \$(\$Mapping.LunId)" -ForegroundColor Yellow
    
} catch {
    Write-Error "LUN mapping failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-configure-portset',
    name: 'Configure iSCSI Portset',
    category: 'iSCSI/FCP Management',
    description: 'Create and manage portsets for iSCSI target access control',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'portsetName', label: 'Portset Name', type: 'text', required: true, placeholder: 'ps_iscsi_prod' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['iscsi', 'fcp', 'mixed'], defaultValue: 'iscsi' },
      { id: 'lifs', label: 'LIF Names (comma-separated)', type: 'text', required: true, placeholder: 'lif_iscsi_data1,lif_iscsi_data2' },
      { id: 'igroupName', label: 'Bind to Igroup (optional)', type: 'text', required: false, placeholder: 'igroup_sql_cluster' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const portsetName = escapePowerShellString(params.portsetName);
      const protocol = params.protocol || 'iscsi';
      const lifs = (params.lifs as string).split(',').map(l => l.trim());
      const igroupName = params.igroupName ? escapePowerShellString(params.igroupName) : '';
      
      return `# NetApp ONTAP Configure iSCSI Portset
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Configuring Portset:" -ForegroundColor Cyan
    Write-Host "  Name: ${portsetName}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host ""
    
    # Create portset
    New-NcPortset \`
        -Name "${portsetName}" \`
        -Protocol ${protocol} \`
        -Vserver "${svm}"
    
    Write-Host "✓ Portset created" -ForegroundColor Green
    
    # Add LIFs to portset
    \$Lifs = @(${lifs.map(l => `"${escapePowerShellString(l)}"`).join(', ')})
    
    Write-Host ""
    Write-Host "Adding LIFs to portset..." -ForegroundColor Cyan
    
    foreach (\$Lif in \$Lifs) {
        try {
            Add-NcPortsetPort \`
                -Name "${portsetName}" \`
                -Port \$Lif \`
                -Vserver "${svm}"
            
            Write-Host "  ✓ Added: \$Lif" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed: \$Lif - \$_" -ForegroundColor Red
        }
    }
    
${igroupName ? `    
    # Bind portset to igroup
    Write-Host ""
    Write-Host "Binding portset to igroup: ${igroupName}" -ForegroundColor Cyan
    
    Set-NcIgroup \`
        -Name "${igroupName}" \`
        -Portset "${portsetName}" \`
        -Vserver "${svm}"
    
    Write-Host "✓ Portset bound to igroup" -ForegroundColor Green` : ''}
    
    # Get portset details
    \$Portset = Get-NcPortset -Name "${portsetName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Portset Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$Portset.Name)" -ForegroundColor Cyan
    Write-Host "  Protocol: \$(\$Portset.Protocol)" -ForegroundColor Cyan
    Write-Host "  Ports: \$(\$Portset.Ports -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Portset configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-snapvault-configure',
    name: 'Configure SnapVault Relationship',
    category: 'SnapMirror/SnapVault',
    description: 'Set up SnapVault for disk-to-disk backup with policy-based retention',
    parameters: [
      { id: 'sourceCluster', label: 'Source Cluster', type: 'text', required: true, placeholder: 'netapp-prod' },
      { id: 'sourceSVM', label: 'Source SVM', type: 'text', required: true, placeholder: 'svm_prod' },
      { id: 'sourceVolume', label: 'Source Volume', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'destCluster', label: 'Destination Cluster', type: 'text', required: true, placeholder: 'netapp-backup' },
      { id: 'destSVM', label: 'Destination SVM', type: 'text', required: true, placeholder: 'svm_backup' },
      { id: 'destVolume', label: 'Destination Volume', type: 'text', required: true, placeholder: 'vol_data_vault' },
      { id: 'policyName', label: 'SnapVault Policy', type: 'select', required: true, options: ['XDPDefault', 'DPDefault'], defaultValue: 'XDPDefault' },
      { id: 'schedule', label: 'Replication Schedule', type: 'select', required: true, options: ['hourly', 'daily', 'weekly', 'monthly'], defaultValue: 'daily' }
    ],
    scriptTemplate: (params) => {
      const sourceCluster = escapePowerShellString(params.sourceCluster);
      const sourceSVM = escapePowerShellString(params.sourceSVM);
      const sourceVolume = escapePowerShellString(params.sourceVolume);
      const destCluster = escapePowerShellString(params.destCluster);
      const destSVM = escapePowerShellString(params.destSVM);
      const destVolume = escapePowerShellString(params.destVolume);
      const policyName = params.policyName || 'XDPDefault';
      const schedule = params.schedule || 'daily';
      
      return `# NetApp ONTAP Configure SnapVault Relationship
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    # Connect to both clusters
    Write-Host "Connecting to clusters..." -ForegroundColor Cyan
    \$SourceConn = Connect-NcController -Name "${sourceCluster}" -Credential (Get-Credential -Message "Source cluster credentials")
    \$DestConn = Connect-NcController -Name "${destCluster}" -Credential (Get-Credential -Message "Destination cluster credentials")
    
    Write-Host ""
    Write-Host "Configuring SnapVault Relationship:" -ForegroundColor Cyan
    Write-Host "  Source: ${sourceCluster}:${sourceSVM}:${sourceVolume}" -ForegroundColor Cyan
    Write-Host "  Destination: ${destCluster}:${destSVM}:${destVolume}" -ForegroundColor Cyan
    Write-Host "  Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Schedule: ${schedule}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get source volume info
    \$SourceVol = Get-NcVol -Name "${sourceVolume}" -Vserver "${sourceSVM}" -VserverContext \$SourceConn
    
    if (-not \$SourceVol) {
        Write-Host "Error: Source volume not found" -ForegroundColor Red
        exit
    }
    
    # Create destination DP volume
    Write-Host "Creating destination DP volume..." -ForegroundColor Cyan
    
    \$DestAggr = (Get-NcAggr -VserverContext \$DestConn | Where-Object { \$_.State -eq "online" } | Select-Object -First 1).Name
    
    try {
        New-NcVol \`
            -Name "${destVolume}" \`
            -Vserver "${destSVM}" \`
            -Aggregate \$DestAggr \`
            -Type DP \`
            -Size "\$(\$SourceVol.TotalSize / 1GB)g" \`
            -VserverContext \$DestConn -ErrorAction SilentlyContinue
        
        Write-Host "  ✓ Destination volume created" -ForegroundColor Green
    } catch {
        Write-Host "  Destination volume may already exist" -ForegroundColor Yellow
    }
    
    # Create SnapVault relationship
    Write-Host "Creating SnapVault relationship..." -ForegroundColor Cyan
    
    New-NcSnapmirror \`
        -SourceCluster "${sourceCluster}" \`
        -SourceVserver "${sourceSVM}" \`
        -SourceVolume "${sourceVolume}" \`
        -DestinationCluster "${destCluster}" \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}" \`
        -Policy ${policyName} \`
        -Schedule ${schedule} \`
        -Type XDP \`
        -VserverContext \$DestConn
    
    Write-Host "  ✓ SnapVault relationship created" -ForegroundColor Green
    
    # Initialize the relationship
    Write-Host "Initializing baseline transfer..." -ForegroundColor Cyan
    
    Invoke-NcSnapmirrorInitialize \`
        -DestinationCluster "${destCluster}" \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}" \`
        -VserverContext \$DestConn
    
    Write-Host "  ✓ Initialization started" -ForegroundColor Green
    
    # Monitor initialization
    Write-Host ""
    Write-Host "Monitoring initialization progress..." -ForegroundColor Cyan
    
    do {
        Start-Sleep -Seconds 30
        \$Status = Get-NcSnapmirror \`
            -DestinationCluster "${destCluster}" \`
            -DestinationVserver "${destSVM}" \`
            -DestinationVolume "${destVolume}" \`
            -VserverContext \$DestConn
        
        Write-Host "  State: \$(\$Status.MirrorState) - Status: \$(\$Status.RelationshipStatus)" -ForegroundColor Cyan
    } while (\$Status.MirrorState -eq "uninitialized" -or \$Status.RelationshipStatus -eq "transferring")
    
    Write-Host ""
    Write-Host "✓ SnapVault relationship configured successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "SnapVault configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-snapmirror-failover',
    name: 'Execute SnapMirror Failover',
    category: 'SnapMirror/SnapVault',
    description: 'Perform planned or unplanned failover to disaster recovery site',
    parameters: [
      { id: 'destCluster', label: 'DR Cluster (Destination)', type: 'text', required: true, placeholder: 'netapp-dr' },
      { id: 'destSVM', label: 'DR SVM', type: 'text', required: true, placeholder: 'svm_dr' },
      { id: 'destVolume', label: 'DR Volume', type: 'text', required: true, placeholder: 'vol_data_dr' },
      { id: 'failoverType', label: 'Failover Type', type: 'select', required: true, options: ['planned', 'unplanned'], defaultValue: 'planned' },
      { id: 'mountJunctionPath', label: 'Mount Junction Path (optional)', type: 'path', required: false, placeholder: '/vol_data' }
    ],
    scriptTemplate: (params) => {
      const destCluster = escapePowerShellString(params.destCluster);
      const destSVM = escapePowerShellString(params.destSVM);
      const destVolume = escapePowerShellString(params.destVolume);
      const failoverType = params.failoverType || 'planned';
      const mountJunctionPath = params.mountJunctionPath ? escapePowerShellString(params.mountJunctionPath) : '';
      
      return `# NetApp ONTAP Execute SnapMirror Failover
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${destCluster}" -Credential (Get-Credential)
    
    \$FailoverType = "${failoverType}"
    
    Write-Host "SnapMirror Failover:" -ForegroundColor Yellow
    Write-Host "  Type: \$FailoverType" -ForegroundColor Yellow
    Write-Host "  DR Cluster: ${destCluster}" -ForegroundColor Cyan
    Write-Host "  DR SVM: ${destSVM}" -ForegroundColor Cyan
    Write-Host "  DR Volume: ${destVolume}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get current relationship status
    \$Relationship = Get-NcSnapmirror \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}"
    
    if (-not \$Relationship) {
        Write-Host "Error: SnapMirror relationship not found" -ForegroundColor Red
        exit
    }
    
    Write-Host "Current State: \$(\$Relationship.MirrorState)" -ForegroundColor Cyan
    Write-Host "Lag Time: \$(\$Relationship.LagTime)" -ForegroundColor Cyan
    Write-Host ""
    
    if (\$FailoverType -eq "planned") {
        # Planned failover - perform final update first
        Write-Host "Performing final sync..." -ForegroundColor Cyan
        
        Invoke-NcSnapmirrorUpdate \`
            -DestinationVserver "${destSVM}" \`
            -DestinationVolume "${destVolume}"
        
        # Wait for update to complete
        do {
            Start-Sleep -Seconds 5
            \$Status = Get-NcSnapmirror \`
                -DestinationVserver "${destSVM}" \`
                -DestinationVolume "${destVolume}"
        } while (\$Status.RelationshipStatus -eq "transferring")
        
        Write-Host "✓ Final sync completed" -ForegroundColor Green
    } else {
        Write-Host "UNPLANNED FAILOVER - Data loss may occur!" -ForegroundColor Red
        Write-Host "Last sync: \$(\$Relationship.LastTransferEndTimestamp)" -ForegroundColor Red
    }
    
    # Quiesce the relationship
    Write-Host ""
    Write-Host "Quiescing relationship..." -ForegroundColor Cyan
    
    Invoke-NcSnapmirrorQuiesce \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}"
    
    Start-Sleep -Seconds 5
    
    # Break the relationship
    Write-Host "Breaking SnapMirror relationship..." -ForegroundColor Yellow
    
    Invoke-NcSnapmirrorBreak \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}" \`
        -Confirm:\$false
    
    Write-Host "✓ Relationship broken - Volume is now read-write" -ForegroundColor Green
    
${mountJunctionPath ? `    
    # Mount the volume
    Write-Host ""
    Write-Host "Mounting volume at: ${mountJunctionPath}" -ForegroundColor Cyan
    
    Mount-NcVol \`
        -Name "${destVolume}" \`
        -JunctionPath "${mountJunctionPath}" \`
        -Vserver "${destSVM}"
    
    Write-Host "✓ Volume mounted" -ForegroundColor Green` : ''}
    
    # Display volume status
    \$Volume = Get-NcVol -Name "${destVolume}" -Vserver "${destSVM}"
    
    Write-Host ""
    Write-Host "DR Volume Status:" -ForegroundColor Green
    Write-Host "  State: \$(\$Volume.State)" -ForegroundColor Cyan
    Write-Host "  Junction Path: \$(\$Volume.JunctionPath)" -ForegroundColor Cyan
    Write-Host "  Size: \$([math]::Round(\$Volume.TotalSize / 1GB, 2)) GB" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "✓ FAILOVER COMPLETE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Update DNS or client configurations to point to DR site" -ForegroundColor Yellow
    Write-Host "  2. Verify application access to data" -ForegroundColor Yellow
    Write-Host "  3. Plan for failback when primary site is restored" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failover failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-snapmirror-resync',
    name: 'Resync SnapMirror Relationship',
    category: 'SnapMirror/SnapVault',
    description: 'Resynchronize SnapMirror after failback or to reverse direction',
    parameters: [
      { id: 'destCluster', label: 'Destination Cluster', type: 'text', required: true, placeholder: 'netapp-dr' },
      { id: 'destSVM', label: 'Destination SVM', type: 'text', required: true, placeholder: 'svm_dr' },
      { id: 'destVolume', label: 'Destination Volume', type: 'text', required: true, placeholder: 'vol_data_dr' },
      { id: 'reverseResync', label: 'Reverse Resync (Failback)', type: 'boolean', required: false, defaultValue: false, description: 'Make current destination the new source' }
    ],
    scriptTemplate: (params) => {
      const destCluster = escapePowerShellString(params.destCluster);
      const destSVM = escapePowerShellString(params.destSVM);
      const destVolume = escapePowerShellString(params.destVolume);
      const reverseResync = params.reverseResync === true;
      
      return `# NetApp ONTAP Resync SnapMirror Relationship
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${destCluster}" -Credential (Get-Credential)
    
    Write-Host "SnapMirror Resync Operation:" -ForegroundColor Cyan
    Write-Host "  Destination Cluster: ${destCluster}" -ForegroundColor Cyan
    Write-Host "  Destination SVM: ${destSVM}" -ForegroundColor Cyan
    Write-Host "  Destination Volume: ${destVolume}" -ForegroundColor Cyan
    Write-Host "  Reverse Resync: ${reverseResync}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get current relationship
    \$Relationship = Get-NcSnapmirror \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}"
    
    if (-not \$Relationship) {
        Write-Host "Error: SnapMirror relationship not found" -ForegroundColor Red
        exit
    }
    
    Write-Host "Current Relationship:" -ForegroundColor Cyan
    Write-Host "  Source: \$(\$Relationship.SourceCluster):\$(\$Relationship.SourceVserver):\$(\$Relationship.SourceVolume)" -ForegroundColor Cyan
    Write-Host "  State: \$(\$Relationship.MirrorState)" -ForegroundColor Cyan
    Write-Host ""
    
${reverseResync ? `    # Reverse resync - make destination the new source
    Write-Host "Performing REVERSE RESYNC..." -ForegroundColor Yellow
    Write-Host "WARNING: This will make the current destination the new source" -ForegroundColor Yellow
    Write-Host "Data on the original source will be overwritten!" -ForegroundColor Red
    Write-Host ""
    
    # Ensure destination volume is writable (broken state)
    if (\$Relationship.MirrorState -ne "broken-off") {
        Write-Host "Breaking relationship first..." -ForegroundColor Cyan
        Invoke-NcSnapmirrorQuiesce \`
            -DestinationVserver "${destSVM}" \`
            -DestinationVolume "${destVolume}"
        
        Start-Sleep -Seconds 5
        
        Invoke-NcSnapmirrorBreak \`
            -DestinationVserver "${destSVM}" \`
            -DestinationVolume "${destVolume}" \`
            -Confirm:\$false
    }
    
    # Perform reverse resync
    Invoke-NcSnapmirrorResync \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}"
    
    Write-Host "✓ Reverse resync initiated" -ForegroundColor Green` : `    # Standard resync - restore original relationship
    Write-Host "Performing RESYNC..." -ForegroundColor Cyan
    
    Invoke-NcSnapmirrorResync \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}"
    
    Write-Host "✓ Resync initiated" -ForegroundColor Green`}
    
    # Monitor resync progress
    Write-Host ""
    Write-Host "Monitoring resync progress..." -ForegroundColor Cyan
    
    do {
        Start-Sleep -Seconds 30
        \$Status = Get-NcSnapmirror \`
            -DestinationVserver "${destSVM}" \`
            -DestinationVolume "${destVolume}"
        
        Write-Host "  State: \$(\$Status.MirrorState) - Status: \$(\$Status.RelationshipStatus)" -ForegroundColor Cyan
    } while (\$Status.RelationshipStatus -eq "transferring")
    
    Write-Host ""
    Write-Host "✓ Resync completed successfully!" -ForegroundColor Green
    
    # Show updated relationship
    \$UpdatedRelationship = Get-NcSnapmirror \`
        -DestinationVserver "${destSVM}" \`
        -DestinationVolume "${destVolume}"
    
    Write-Host ""
    Write-Host "Updated Relationship:" -ForegroundColor Green
    Write-Host "  Source: \$(\$UpdatedRelationship.SourceCluster):\$(\$UpdatedRelationship.SourceVserver):\$(\$UpdatedRelationship.SourceVolume)" -ForegroundColor Cyan
    Write-Host "  Destination: \$(\$UpdatedRelationship.DestinationCluster):\$(\$UpdatedRelationship.DestinationVserver):\$(\$UpdatedRelationship.DestinationVolume)" -ForegroundColor Cyan
    Write-Host "  State: \$(\$UpdatedRelationship.MirrorState)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Resync failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-cluster-health',
    name: 'Check Cluster Health Status',
    category: 'Monitoring',
    description: 'Comprehensive cluster health check including nodes, disks, and services',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'exportPath', label: 'Export Report Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Cluster_Health.html' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP Check Cluster Health Status
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  NETAPP CLUSTER HEALTH REPORT" -ForegroundColor Cyan
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
    Write-Host "  Timestamp: \$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    \$OverallHealth = "Healthy"
    \$Issues = @()
    
    # 1. Cluster Information
    \$ClusterInfo = Get-NcCluster
    Write-Host "CLUSTER INFORMATION:" -ForegroundColor Green
    Write-Host "  Name: \$(\$ClusterInfo.ClusterName)" -ForegroundColor Cyan
    Write-Host "  UUID: \$(\$ClusterInfo.ClusterUuid)" -ForegroundColor Cyan
    Write-Host "  ONTAP Version: \$(\$ClusterInfo.OntapVersion)" -ForegroundColor Cyan
    Write-Host ""
    
    # 2. Node Health
    \$Nodes = Get-NcNode
    Write-Host "NODE HEALTH:" -ForegroundColor Green
    
    foreach (\$Node in \$Nodes) {
        \$NodeColor = if (\$Node.IsNodeHealthy) { "Cyan" } else { "Red"; \$OverallHealth = "Degraded"; \$Issues += "Node \$(\$Node.Name) unhealthy" }
        Write-Host "  \$(\$Node.Name):" -ForegroundColor \$NodeColor
        Write-Host "    Healthy: \$(\$Node.IsNodeHealthy)" -ForegroundColor \$NodeColor
        Write-Host "    Model: \$(\$Node.NodeModel)" -ForegroundColor Cyan
        Write-Host "    Uptime: \$(\$Node.NodeUptimeSeconds / 86400) days" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # 3. Aggregate Health
    \$Aggregates = Get-NcAggr
    Write-Host "AGGREGATE STATUS:" -ForegroundColor Green
    
    foreach (\$Aggr in \$Aggregates) {
        \$AggrColor = if (\$Aggr.State -eq "online" -and -not \$Aggr.IsDegraded) { "Cyan" } else { "Yellow"; \$OverallHealth = "Warning"; \$Issues += "Aggregate \$(\$Aggr.Name) issue" }
        Write-Host "  \$(\$Aggr.Name):" -ForegroundColor \$AggrColor
        Write-Host "    State: \$(\$Aggr.State)" -ForegroundColor \$AggrColor
        Write-Host "    Used: \$(\$Aggr.PercentUsedCapacity)%" -ForegroundColor \$(if (\$Aggr.PercentUsedCapacity -gt 90) { "Red" } elseif (\$Aggr.PercentUsedCapacity -gt 80) { "Yellow" } else { "Cyan" })
        Write-Host "    RAID Status: \$(\$Aggr.RaidStatus)" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # 4. Disk Health
    \$Disks = Get-NcDisk
    \$FailedDisks = \$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "broken" }
    \$SpareDisks = \$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "spare" }
    
    Write-Host "DISK STATUS:" -ForegroundColor Green
    Write-Host "  Total Disks: \$(\$Disks.Count)" -ForegroundColor Cyan
    Write-Host "  Spare Disks: \$(\$SpareDisks.Count)" -ForegroundColor Cyan
    Write-Host "  Failed Disks: \$(\$FailedDisks.Count)" -ForegroundColor \$(if (\$FailedDisks.Count -gt 0) { "Red"; \$OverallHealth = "Degraded"; \$Issues += "\$(\$FailedDisks.Count) failed disk(s)" } else { "Cyan" })
    
    if (\$FailedDisks) {
        foreach (\$Disk in \$FailedDisks) {
            Write-Host "    - \$(\$Disk.Name)" -ForegroundColor Red
        }
    }
    Write-Host ""
    
    # 5. Network Interface Status
    \$Lifs = Get-NcNetInterface
    \$DownLifs = \$Lifs | Where-Object { \$_.OpStatus -ne "up" }
    
    Write-Host "NETWORK INTERFACES:" -ForegroundColor Green
    Write-Host "  Total LIFs: \$(\$Lifs.Count)" -ForegroundColor Cyan
    Write-Host "  Down LIFs: \$(\$DownLifs.Count)" -ForegroundColor \$(if (\$DownLifs.Count -gt 0) { "Yellow"; \$Issues += "\$(\$DownLifs.Count) LIF(s) down" } else { "Cyan" })
    
    if (\$DownLifs) {
        foreach (\$Lif in \$DownLifs) {
            Write-Host "    - \$(\$Lif.InterfaceName) (\$(\$Lif.Vserver))" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    
    # 6. SnapMirror Status
    \$SnapMirrors = Get-NcSnapmirror
    \$UnhealthySM = \$SnapMirrors | Where-Object { \$_.IsHealthy -eq \$false }
    
    Write-Host "SNAPMIRROR STATUS:" -ForegroundColor Green
    Write-Host "  Total Relationships: \$(\$SnapMirrors.Count)" -ForegroundColor Cyan
    Write-Host "  Unhealthy: \$(\$UnhealthySM.Count)" -ForegroundColor \$(if (\$UnhealthySM.Count -gt 0) { "Yellow"; \$Issues += "\$(\$UnhealthySM.Count) unhealthy SnapMirror(s)" } else { "Cyan" })
    Write-Host ""
    
    # 7. Volume Space Alerts
    \$Volumes = Get-NcVol | Where-Object { \$_.State -eq "online" }
    \$HighUtilVols = \$Volumes | Where-Object { (\$_.Used / \$_.TotalSize) * 100 -gt 90 }
    
    Write-Host "VOLUME SPACE ALERTS:" -ForegroundColor Green
    Write-Host "  Volumes > 90% Used: \$(\$HighUtilVols.Count)" -ForegroundColor \$(if (\$HighUtilVols.Count -gt 0) { "Yellow"; \$Issues += "\$(\$HighUtilVols.Count) volume(s) > 90% used" } else { "Cyan" })
    
    if (\$HighUtilVols) {
        foreach (\$Vol in \$HighUtilVols) {
            Write-Host "    - \$(\$Vol.Name): \$([math]::Round((\$Vol.Used / \$Vol.TotalSize) * 100, 1))%" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    
    # Summary
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  OVERALL HEALTH: \$OverallHealth" -ForegroundColor \$(if (\$OverallHealth -eq "Healthy") { "Green" } elseif (\$OverallHealth -eq "Warning") { "Yellow" } else { "Red" })
    Write-Host "============================================" -ForegroundColor Cyan
    
    if (\$Issues.Count -gt 0) {
        Write-Host ""
        Write-Host "ISSUES DETECTED:" -ForegroundColor Yellow
        foreach (\$Issue in \$Issues) {
            Write-Host "  - \$Issue" -ForegroundColor Yellow
        }
    }
    
${exportPath ? `    
    # Export HTML Report
    \$HtmlReport = @"
<!DOCTYPE html>
<html>
<head>
    <title>NetApp Cluster Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .healthy { color: green; }
        .warning { color: orange; }
        .critical { color: red; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
    </style>
</head>
<body>
    <h1>NetApp Cluster Health Report</h1>
    <p>Cluster: ${cluster}</p>
    <p>Generated: \$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
    <h2 class="\$(\$OverallHealth.ToLower())">Overall Health: \$OverallHealth</h2>
</body>
</html>
"@
    
    \$HtmlReport | Out-File -FilePath "${exportPath}"
    Write-Host ""
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Health check failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-autosupport',
    name: 'Configure and Trigger AutoSupport',
    category: 'Monitoring',
    description: 'Configure AutoSupport settings and trigger manual ASUP messages',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'nodeName', label: 'Node Name', type: 'text', required: true, placeholder: 'node1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Status', 'Trigger', 'Configure', 'Test'], defaultValue: 'Status' },
      { id: 'mailHosts', label: 'Mail Hosts (for Configure)', type: 'text', required: false, placeholder: 'smtp.example.com' },
      { id: 'recipients', label: 'Recipients (for Configure)', type: 'text', required: false, placeholder: 'admin@example.com,support@example.com' },
      { id: 'message', label: 'Message (for Trigger)', type: 'text', required: false, placeholder: 'Test ASUP from PowerShell' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const nodeName = escapePowerShellString(params.nodeName);
      const action = params.action || 'Status';
      const mailHosts = params.mailHosts ? escapePowerShellString(params.mailHosts) : '';
      const recipients = params.recipients ? escapePowerShellString(params.recipients) : '';
      const message = params.message ? escapePowerShellString(params.message) : 'Manual AutoSupport triggered via PowerShell';
      
      return `# NetApp ONTAP Configure and Trigger AutoSupport
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$Action = "${action}"
    
    Write-Host "AutoSupport Management:" -ForegroundColor Cyan
    Write-Host "  Node: ${nodeName}" -ForegroundColor Cyan
    Write-Host "  Action: \$Action" -ForegroundColor Cyan
    Write-Host ""
    
    switch (\$Action) {
        "Status" {
            Write-Host "AutoSupport Configuration:" -ForegroundColor Green
            
            \$AsupConfig = Get-NcAutoSupportConfig -Node "${nodeName}"
            
            Write-Host "  Enabled: \$(\$AsupConfig.IsEnabled)" -ForegroundColor Cyan
            Write-Host "  Transport: \$(\$AsupConfig.Transport)" -ForegroundColor Cyan
            Write-Host "  Mail Hosts: \$(\$AsupConfig.MailHosts -join ', ')" -ForegroundColor Cyan
            Write-Host "  From: \$(\$AsupConfig.From)" -ForegroundColor Cyan
            Write-Host "  Support Enabled: \$(\$AsupConfig.IsSupportEnabled)" -ForegroundColor Cyan
            
            Write-Host ""
            Write-Host "Recent AutoSupport History:" -ForegroundColor Green
            
            \$AsupHistory = Get-NcAutoSupportHistory -Node "${nodeName}" | Select-Object -First 10
            \$AsupHistory | Format-Table Destination, Subject, Size, Status, LastAttemptTimestamp -AutoSize
        }
        
        "Trigger" {
            Write-Host "Triggering AutoSupport..." -ForegroundColor Cyan
            
            Invoke-NcAutoSupportInvoke \`
                -Node "${nodeName}" \`
                -Type all \`
                -Message "${message}"
            
            Write-Host "✓ AutoSupport triggered successfully!" -ForegroundColor Green
            Write-Host "  Message: ${message}" -ForegroundColor Cyan
        }
        
        "Configure" {
${mailHosts && recipients ? `            Write-Host "Configuring AutoSupport..." -ForegroundColor Cyan
            
            Set-NcAutoSupportConfig \`
                -Node "${nodeName}" \`
                -MailHost @("${mailHosts.split(',').join('","')}") \`
                -To @("${recipients.split(',').join('","')}") \`
                -Transport smtp \`
                -IsEnabled \$true
            
            Write-Host "✓ AutoSupport configured successfully!" -ForegroundColor Green` : `            Write-Host "Error: Mail hosts and recipients required for configuration" -ForegroundColor Red`}
        }
        
        "Test" {
            Write-Host "Sending test AutoSupport..." -ForegroundColor Cyan
            
            Invoke-NcAutoSupportInvoke \`
                -Node "${nodeName}" \`
                -Type test
            
            Write-Host "✓ Test AutoSupport sent!" -ForegroundColor Green
            Write-Host "  Check your inbox to confirm delivery" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "AutoSupport operation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-disk-health',
    name: 'Monitor Disk Health',
    category: 'Monitoring',
    description: 'Check disk health status, failures, and spare availability',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'nodeName', label: 'Node Name (optional)', type: 'text', required: false, placeholder: 'node1' },
      { id: 'exportPath', label: 'Export Report Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Disk_Health.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const nodeName = params.nodeName ? escapePowerShellString(params.nodeName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP Monitor Disk Health
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Disk Health Report:" -ForegroundColor Cyan
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
${nodeName ? `    Write-Host "  Node: ${nodeName}" -ForegroundColor Cyan` : ''}
    Write-Host "  Timestamp: \$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host ""
    
    # Get all disks
${nodeName ? `    \$Disks = Get-NcDisk | Where-Object { \$_.DiskOwnerInfo.OwnerNodeName -eq "${nodeName}" }` : `    \$Disks = Get-NcDisk`}
    
    # Categorize disks
    \$DiskSummary = @{
        Total = \$Disks.Count
        Data = (\$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "aggregate" }).Count
        Spare = (\$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "spare" }).Count
        Failed = (\$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "broken" }).Count
        Maintenance = (\$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "maintenance" }).Count
    }
    
    Write-Host "DISK SUMMARY:" -ForegroundColor Green
    Write-Host "  Total Disks: \$(\$DiskSummary.Total)" -ForegroundColor Cyan
    Write-Host "  Data Disks: \$(\$DiskSummary.Data)" -ForegroundColor Cyan
    Write-Host "  Spare Disks: \$(\$DiskSummary.Spare)" -ForegroundColor \$(if (\$DiskSummary.Spare -lt 2) { "Yellow" } else { "Cyan" })
    Write-Host "  Failed Disks: \$(\$DiskSummary.Failed)" -ForegroundColor \$(if (\$DiskSummary.Failed -gt 0) { "Red" } else { "Cyan" })
    Write-Host "  Maintenance: \$(\$DiskSummary.Maintenance)" -ForegroundColor Cyan
    Write-Host ""
    
    # Failed disks details
    \$FailedDisks = \$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "broken" }
    
    if (\$FailedDisks) {
        Write-Host "FAILED DISKS:" -ForegroundColor Red
        foreach (\$Disk in \$FailedDisks) {
            Write-Host "  Disk: \$(\$Disk.Name)" -ForegroundColor Red
            Write-Host "    Serial: \$(\$Disk.SerialNumber)" -ForegroundColor Red
            Write-Host "    Model: \$(\$Disk.Model)" -ForegroundColor Red
            Write-Host "    Shelf: \$(\$Disk.Shelf)" -ForegroundColor Red
            Write-Host "    Bay: \$(\$Disk.Bay)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Spare disk availability by pool
    \$SpareDisks = \$Disks | Where-Object { \$_.DiskRaidInfo.ContainerType -eq "spare" }
    
    Write-Host "SPARE DISK AVAILABILITY:" -ForegroundColor Green
    
    \$SparesByPool = \$SpareDisks | Group-Object -Property { \$_.DiskRaidInfo.Pool }
    foreach (\$Pool in \$SparesByPool) {
        Write-Host "  Pool \$(\$Pool.Name): \$(\$Pool.Count) spare(s)" -ForegroundColor Cyan
    }
    
    # Disk age/hours
    Write-Host ""
    Write-Host "DISK STATISTICS:" -ForegroundColor Green
    
    \$DiskStats = \$Disks | ForEach-Object {
        [PSCustomObject]@{
            Name = \$_.Name
            Model = \$_.Model
            SerialNumber = \$_.SerialNumber
            ContainerType = \$_.DiskRaidInfo.ContainerType
            Aggregate = \$_.Aggregate
            Shelf = \$_.Shelf
            Bay = \$_.Bay
            SizeGB = [math]::Round(\$_.CapacityBytes / 1GB, 2)
            DiskType = \$_.DiskType
            RPM = \$_.RPM
        }
    }
    
    # Show disk distribution
    \$DisksByType = \$Disks | Group-Object DiskType
    foreach (\$Type in \$DisksByType) {
        Write-Host "  \$(\$Type.Name): \$(\$Type.Count) disk(s)" -ForegroundColor Cyan
    }
    
${exportPath ? `    
    # Export detailed report
    \$DiskStats | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Disk report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
    # Warnings
    Write-Host ""
    if (\$DiskSummary.Spare -lt 2) {
        Write-Host "⚠ WARNING: Low spare disk count (\$(\$DiskSummary.Spare))" -ForegroundColor Yellow
        Write-Host "  Recommend maintaining at least 2 spare disks per pool" -ForegroundColor Yellow
    }
    
    if (\$DiskSummary.Failed -gt 0) {
        Write-Host "⚠ ALERT: \$(\$DiskSummary.Failed) failed disk(s) detected!" -ForegroundColor Red
        Write-Host "  Replace failed disks as soon as possible" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Disk health check failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-volume-autosize',
    name: 'Configure Volume Autosize',
    category: 'Volume Management',
    description: 'Enable and configure automatic volume growth and shrink settings',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'autosizeMode', label: 'Autosize Mode', type: 'select', required: true, options: ['off', 'grow', 'grow_shrink'], defaultValue: 'grow' },
      { id: 'maxSizeGB', label: 'Maximum Size (GB)', type: 'number', required: true, placeholder: '500' },
      { id: 'minSizeGB', label: 'Minimum Size (GB)', type: 'number', required: false, placeholder: '50' },
      { id: 'growThresholdPercent', label: 'Grow Threshold (%)', type: 'number', required: false, defaultValue: 85 },
      { id: 'shrinkThresholdPercent', label: 'Shrink Threshold (%)', type: 'number', required: false, defaultValue: 50 }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const autosizeMode = params.autosizeMode || 'grow';
      const maxSizeGB = params.maxSizeGB;
      const minSizeGB = params.minSizeGB;
      const growThresholdPercent = params.growThresholdPercent || 85;
      const shrinkThresholdPercent = params.shrinkThresholdPercent || 50;
      
      return `# NetApp ONTAP Configure Volume Autosize
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Configuring Volume Autosize:" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Mode: ${autosizeMode}" -ForegroundColor Cyan
    Write-Host "  Max Size: ${maxSizeGB} GB" -ForegroundColor Cyan
${minSizeGB ? `    Write-Host "  Min Size: ${minSizeGB} GB" -ForegroundColor Cyan` : ''}
    Write-Host "  Grow Threshold: ${growThresholdPercent}%" -ForegroundColor Cyan
${autosizeMode === 'grow_shrink' ? `    Write-Host "  Shrink Threshold: ${shrinkThresholdPercent}%" -ForegroundColor Cyan` : ''}
    Write-Host ""
    
    # Get current volume
    \$Volume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    if (-not \$Volume) {
        Write-Host "Error: Volume '${volumeName}' not found" -ForegroundColor Red
        exit
    }
    
    Write-Host "Current Settings:" -ForegroundColor Cyan
    Write-Host "  Size: \$([math]::Round(\$Volume.TotalSize / 1GB, 2)) GB" -ForegroundColor Cyan
    Write-Host "  Autosize Mode: \$(\$Volume.VolumeAutosizeAttributes.Mode)" -ForegroundColor Cyan
    Write-Host ""
    
    # Configure autosize
    \$AutosizeParams = @{
        Name = "${volumeName}"
        Vserver = "${svm}"
        Mode = "${autosizeMode}"
        MaximumSize = "${maxSizeGB}g"
        GrowThresholdPercent = ${growThresholdPercent}
    }
    
${minSizeGB ? `    \$AutosizeParams.MinimumSize = "${minSizeGB}g"` : ''}
${autosizeMode === 'grow_shrink' ? `    \$AutosizeParams.ShrinkThresholdPercent = ${shrinkThresholdPercent}` : ''}
    
    Set-NcVolAutosize @AutosizeParams
    
    Write-Host "✓ Volume autosize configured successfully!" -ForegroundColor Green
    
    # Verify configuration
    \$UpdatedVolume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Updated Autosize Configuration:" -ForegroundColor Green
    Write-Host "  Mode: \$(\$UpdatedVolume.VolumeAutosizeAttributes.Mode)" -ForegroundColor Cyan
    Write-Host "  Max Size: \$([math]::Round([int64]\$UpdatedVolume.VolumeAutosizeAttributes.MaximumSize / 1GB, 2)) GB" -ForegroundColor Cyan
    Write-Host "  Grow Threshold: \$(\$UpdatedVolume.VolumeAutosizeAttributes.GrowThresholdPercent)%" -ForegroundColor Cyan
    
    if (\$UpdatedVolume.VolumeAutosizeAttributes.Mode -eq "grow_shrink") {
        Write-Host "  Min Size: \$([math]::Round([int64]\$UpdatedVolume.VolumeAutosizeAttributes.MinimumSize / 1GB, 2)) GB" -ForegroundColor Cyan
        Write-Host "  Shrink Threshold: \$(\$UpdatedVolume.VolumeAutosizeAttributes.ShrinkThresholdPercent)%" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Autosize configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-snapshot-policy',
    name: 'Create and Apply Snapshot Policy',
    category: 'Snapshot Management',
    description: 'Create custom snapshot policies with schedules and retention',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'custom_snapshot_policy' },
      { id: 'hourlyCount', label: 'Hourly Snapshots to Keep', type: 'number', required: false, placeholder: '6', defaultValue: 6 },
      { id: 'dailyCount', label: 'Daily Snapshots to Keep', type: 'number', required: false, placeholder: '7', defaultValue: 7 },
      { id: 'weeklyCount', label: 'Weekly Snapshots to Keep', type: 'number', required: false, placeholder: '4', defaultValue: 4 },
      { id: 'monthlyCount', label: 'Monthly Snapshots to Keep', type: 'number', required: false, placeholder: '6', defaultValue: 6 },
      { id: 'volumeName', label: 'Apply to Volume (optional)', type: 'text', required: false, placeholder: 'vol_data' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const policyName = escapePowerShellString(params.policyName);
      const hourlyCount = params.hourlyCount || 6;
      const dailyCount = params.dailyCount || 7;
      const weeklyCount = params.weeklyCount || 4;
      const monthlyCount = params.monthlyCount || 6;
      const volumeName = params.volumeName ? escapePowerShellString(params.volumeName) : '';
      
      return `# NetApp ONTAP Create and Apply Snapshot Policy
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating Snapshot Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Retention Schedule:" -ForegroundColor Cyan
    Write-Host "  Hourly: ${hourlyCount} snapshots" -ForegroundColor Cyan
    Write-Host "  Daily: ${dailyCount} snapshots" -ForegroundColor Cyan
    Write-Host "  Weekly: ${weeklyCount} snapshots" -ForegroundColor Cyan
    Write-Host "  Monthly: ${monthlyCount} snapshots" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if policy exists
    \$ExistingPolicy = Get-NcSnapshotPolicy -Name "${policyName}" -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    if (\$ExistingPolicy) {
        Write-Host "Policy '${policyName}' already exists, updating..." -ForegroundColor Yellow
        Remove-NcSnapshotPolicy -Name "${policyName}" -Vserver "${svm}" -Confirm:\$false
    }
    
    # Create new snapshot policy
    # Define schedules
    \$Schedules = @()
    
${hourlyCount > 0 ? `    \$Schedules += @{
        Schedule = "hourly"
        Count = ${hourlyCount}
        SnapmirrorLabel = ""
        Prefix = "hourly"
    }` : ''}
    
${dailyCount > 0 ? `    \$Schedules += @{
        Schedule = "daily"
        Count = ${dailyCount}
        SnapmirrorLabel = "daily"
        Prefix = "daily"
    }` : ''}
    
${weeklyCount > 0 ? `    \$Schedules += @{
        Schedule = "weekly"
        Count = ${weeklyCount}
        SnapmirrorLabel = "weekly"
        Prefix = "weekly"
    }` : ''}
    
${monthlyCount > 0 ? `    \$Schedules += @{
        Schedule = "monthly"
        Count = ${monthlyCount}
        SnapmirrorLabel = "monthly"
        Prefix = "monthly"
    }` : ''}
    
    # Create policy with schedules
    New-NcSnapshotPolicy \`
        -Name "${policyName}" \`
        -Enabled \$true \`
        -Schedule1 "hourly" \`
        -Count1 ${hourlyCount} \`
        -Prefix1 "hourly" \`
        -Schedule2 "daily" \`
        -Count2 ${dailyCount} \`
        -Prefix2 "daily" \`
        -Schedule3 "weekly" \`
        -Count3 ${weeklyCount} \`
        -Prefix3 "weekly" \`
        -Schedule4 "monthly" \`
        -Count4 ${monthlyCount} \`
        -Prefix4 "monthly" \`
        -Vserver "${svm}"
    
    Write-Host "✓ Snapshot policy created successfully!" -ForegroundColor Green
    
${volumeName ? `    
    # Apply policy to volume
    Write-Host ""
    Write-Host "Applying policy to volume: ${volumeName}" -ForegroundColor Cyan
    
    Set-NcVol \`
        -Name "${volumeName}" \`
        -SnapshotPolicy "${policyName}" \`
        -Vserver "${svm}"
    
    Write-Host "✓ Policy applied to volume" -ForegroundColor Green` : ''}
    
    # Display policy details
    \$Policy = Get-NcSnapshotPolicy -Name "${policyName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Policy Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$Policy.PolicyName)" -ForegroundColor Cyan
    Write-Host "  Enabled: \$(\$Policy.Enabled)" -ForegroundColor Cyan
    Write-Host "  Total Snapshots: \$(\$Policy.TotalSchedules)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Snapshot policy creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-svm-migrate',
    name: 'Migrate SVM to Another Cluster',
    category: 'SVM Management',
    description: 'Migrate an SVM with its data between clusters using SVM DR',
    parameters: [
      { id: 'sourceCluster', label: 'Source Cluster', type: 'text', required: true, placeholder: 'netapp-src' },
      { id: 'sourceSVM', label: 'Source SVM', type: 'text', required: true, placeholder: 'svm_prod' },
      { id: 'destCluster', label: 'Destination Cluster', type: 'text', required: true, placeholder: 'netapp-dest' },
      { id: 'destSVM', label: 'Destination SVM Name', type: 'text', required: true, placeholder: 'svm_prod_dr' },
      { id: 'ipspaceMapping', label: 'IPspace Mapping', type: 'text', required: false, placeholder: 'Default:Default' }
    ],
    scriptTemplate: (params) => {
      const sourceCluster = escapePowerShellString(params.sourceCluster);
      const sourceSVM = escapePowerShellString(params.sourceSVM);
      const destCluster = escapePowerShellString(params.destCluster);
      const destSVM = escapePowerShellString(params.destSVM);
      const ipspaceMapping = params.ipspaceMapping ? escapePowerShellString(params.ipspaceMapping) : 'Default:Default';
      
      return `# NetApp ONTAP Migrate SVM to Another Cluster (SVM DR)
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Write-Host "SVM Migration Setup:" -ForegroundColor Cyan
    Write-Host "  Source: ${sourceCluster}:${sourceSVM}" -ForegroundColor Cyan
    Write-Host "  Destination: ${destCluster}:${destSVM}" -ForegroundColor Cyan
    Write-Host ""
    
    # Connect to both clusters
    Write-Host "Connecting to clusters..." -ForegroundColor Cyan
    \$SourceConn = Connect-NcController -Name "${sourceCluster}" -Credential (Get-Credential -Message "Source cluster credentials")
    \$DestConn = Connect-NcController -Name "${destCluster}" -Credential (Get-Credential -Message "Destination cluster credentials")
    
    # Get source SVM info
    \$SourceSVMInfo = Get-NcVserver -Vserver "${sourceSVM}" -VserverContext \$SourceConn
    
    if (-not \$SourceSVMInfo) {
        Write-Host "Error: Source SVM '${sourceSVM}' not found" -ForegroundColor Red
        exit
    }
    
    Write-Host ""
    Write-Host "Source SVM Configuration:" -ForegroundColor Green
    Write-Host "  Name: \$(\$SourceSVMInfo.VserverName)" -ForegroundColor Cyan
    Write-Host "  Root Volume: \$(\$SourceSVMInfo.RootVolume)" -ForegroundColor Cyan
    Write-Host "  Protocols: \$(\$SourceSVMInfo.AllowedProtocols -join ', ')" -ForegroundColor Cyan
    Write-Host ""
    
    # Create SVM peer relationship
    Write-Host "Creating SVM peer relationship..." -ForegroundColor Cyan
    
    # First, ensure cluster peer exists
    \$ClusterPeer = Get-NcClusterPeer -VserverContext \$SourceConn | Where-Object { \$_.ClusterName -eq "${destCluster}" }
    
    if (-not \$ClusterPeer) {
        Write-Host "Warning: Cluster peer relationship not found" -ForegroundColor Yellow
        Write-Host "Please ensure cluster peering is configured first" -ForegroundColor Yellow
    }
    
    # Create SVM peer
    try {
        New-NcVserverPeer \`
            -Vserver "${sourceSVM}" \`
            -PeerVserver "${destSVM}" \`
            -PeerCluster "${destCluster}" \`
            -Applications snapmirror \`
            -VserverContext \$SourceConn -ErrorAction SilentlyContinue
        
        Write-Host "  ✓ SVM peer relationship initiated" -ForegroundColor Green
    } catch {
        Write-Host "  SVM peer may already exist: \$_" -ForegroundColor Yellow
    }
    
    # Accept peer on destination
    try {
        Set-NcVserverPeer \`
            -Vserver "${destSVM}" \`
            -PeerVserver "${sourceSVM}" \`
            -PeerCluster "${sourceCluster}" \`
            -State active \`
            -VserverContext \$DestConn -ErrorAction SilentlyContinue
        
        Write-Host "  ✓ SVM peer relationship accepted" -ForegroundColor Green
    } catch {
        Write-Host "  Peer acceptance: \$_" -ForegroundColor Yellow
    }
    
    # Create SVM-DR relationship
    Write-Host ""
    Write-Host "Creating SVM-DR relationship..." -ForegroundColor Cyan
    
    # Get destination aggregate for SVM root
    \$DestAggr = (Get-NcAggr -VserverContext \$DestConn | Where-Object { \$_.State -eq "online" } | Select-Object -First 1).Name
    
    New-NcSnapmirror \`
        -SourceCluster "${sourceCluster}" \`
        -SourceVserver "${sourceSVM}" \`
        -DestinationCluster "${destCluster}" \`
        -DestinationVserver "${destSVM}" \`
        -Type DP \`
        -IdentityPreserve \$true \`
        -VserverContext \$DestConn
    
    Write-Host "  ✓ SVM-DR relationship created" -ForegroundColor Green
    
    # Initialize the relationship
    Write-Host ""
    Write-Host "Initializing SVM-DR baseline transfer..." -ForegroundColor Cyan
    Write-Host "This may take a while depending on data size" -ForegroundColor Yellow
    
    Invoke-NcSnapmirrorInitialize \`
        -DestinationCluster "${destCluster}" \`
        -DestinationVserver "${destSVM}" \`
        -VserverContext \$DestConn
    
    Write-Host "  ✓ Initialization started" -ForegroundColor Green
    
    # Monitor progress
    Write-Host ""
    Write-Host "Monitoring initialization progress..." -ForegroundColor Cyan
    
    do {
        Start-Sleep -Seconds 60
        \$Status = Get-NcSnapmirror \`
            -DestinationCluster "${destCluster}" \`
            -DestinationVserver "${destSVM}" \`
            -VserverContext \$DestConn
        
        Write-Host "  State: \$(\$Status.MirrorState) - Status: \$(\$Status.RelationshipStatus)" -ForegroundColor Cyan
    } while (\$Status.MirrorState -eq "uninitialized" -or \$Status.RelationshipStatus -eq "transferring")
    
    Write-Host ""
    Write-Host "✓ SVM-DR configuration completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps for Cutover:" -ForegroundColor Yellow
    Write-Host "  1. Quiesce the SVM-DR relationship" -ForegroundColor Yellow
    Write-Host "  2. Break the relationship to make destination active" -ForegroundColor Yellow
    Write-Host "  3. Start the destination SVM" -ForegroundColor Yellow
    Write-Host "  4. Configure network interfaces on destination" -ForegroundColor Yellow
    
} catch {
    Write-Error "SVM migration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-cifs-domain-join',
    name: 'Join CIFS Server to Active Directory',
    category: 'CIFS/SMB Management',
    description: 'Configure and join a CIFS server to an Active Directory domain',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'cifsServerName', label: 'CIFS Server Name', type: 'text', required: true, placeholder: 'FILESERVER01' },
      { id: 'domain', label: 'AD Domain', type: 'text', required: true, placeholder: 'corp.example.com' },
      { id: 'ouPath', label: 'Organizational Unit (optional)', type: 'text', required: false, placeholder: 'OU=Servers,DC=corp,DC=example,DC=com' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const cifsServerName = escapePowerShellString(params.cifsServerName);
      const domain = escapePowerShellString(params.domain);
      const ouPath = params.ouPath ? escapePowerShellString(params.ouPath) : '';
      
      return `# NetApp ONTAP Join CIFS Server to Active Directory
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential -Message "NetApp cluster credentials")
    
    Write-Host "CIFS Server Configuration:" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  CIFS Server Name: ${cifsServerName}" -ForegroundColor Cyan
    Write-Host "  Domain: ${domain}" -ForegroundColor Cyan
${ouPath ? `    Write-Host "  Organizational Unit: ${ouPath}" -ForegroundColor Cyan` : ''}
    Write-Host ""
    
    # Get AD credentials
    Write-Host "Enter Active Directory credentials with domain join permissions:" -ForegroundColor Yellow
    \$ADCredential = Get-Credential -Message "AD Domain Admin credentials (DOMAIN\\username)"
    
    \$ADUser = \$ADCredential.UserName
    \$ADPassword = \$ADCredential.GetNetworkCredential().Password
    
    # Check if CIFS is already configured
    \$ExistingCifs = Get-NcCifsServer -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    if (\$ExistingCifs) {
        Write-Host "Existing CIFS configuration found:" -ForegroundColor Yellow
        Write-Host "  Server Name: \$(\$ExistingCifs.CifsServerName)" -ForegroundColor Yellow
        Write-Host "  Domain: \$(\$ExistingCifs.Domain)" -ForegroundColor Yellow
        
        \$Confirm = Read-Host "Do you want to reconfigure? (yes/no)"
        if (\$Confirm -ne "yes") {
            Write-Host "Operation cancelled" -ForegroundColor Yellow
            exit
        }
        
        # Remove existing CIFS server
        Write-Host "Removing existing CIFS configuration..." -ForegroundColor Yellow
        Remove-NcCifsServer -Vserver "${svm}" -AdminUsername \$ADUser -AdminPassword \$ADPassword -Confirm:\$false
    }
    
    # Create CIFS server and join domain
    Write-Host ""
    Write-Host "Joining domain..." -ForegroundColor Cyan
    
    \$CifsParams = @{
        Name = "${cifsServerName}"
        Domain = "${domain}"
        AdminUsername = \$ADUser
        AdminPassword = \$ADPassword
        Vserver = "${svm}"
    }
    
${ouPath ? `    \$CifsParams.OrganizationalUnit = "${ouPath}"` : ''}
    
    Add-NcCifsServer @CifsParams
    
    Write-Host "✓ CIFS server joined to domain successfully!" -ForegroundColor Green
    
    # Verify configuration
    \$CifsServer = Get-NcCifsServer -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "CIFS Server Details:" -ForegroundColor Green
    Write-Host "  Server Name: \$(\$CifsServer.CifsServerName)" -ForegroundColor Cyan
    Write-Host "  Domain: \$(\$CifsServer.Domain)" -ForegroundColor Cyan
    Write-Host "  Status: \$(\$CifsServer.AdministrativeStatus)" -ForegroundColor Cyan
    Write-Host "  Authentication Style: \$(\$CifsServer.AuthStyle)" -ForegroundColor Cyan
    
    # Get domain info
    \$DomainInfo = Get-NcCifsDomainDiscoveredServers -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    if (\$DomainInfo) {
        Write-Host ""
        Write-Host "Discovered Domain Controllers:" -ForegroundColor Green
        \$DomainInfo | Select-Object Name, Type | Format-Table -AutoSize
    }
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Create CIFS shares using 'Create CIFS Share' task" -ForegroundColor Yellow
    Write-Host "  2. Configure share permissions" -ForegroundColor Yellow
    Write-Host "  3. Test client access: \\\\${cifsServerName}\\" -ForegroundColor Yellow
    
} catch {
    Write-Error "CIFS domain join failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-flexgroup-create',
    name: 'Create FlexGroup Volume',
    category: 'Volume Management',
    description: 'Create a FlexGroup volume spanning multiple aggregates for scale-out NAS',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'FlexGroup Name', type: 'text', required: true, placeholder: 'fg_bigdata' },
      { id: 'sizeTB', label: 'Total Size (TB)', type: 'number', required: true, placeholder: '10' },
      { id: 'aggregates', label: 'Aggregates (comma-separated)', type: 'text', required: true, placeholder: 'aggr1,aggr2,aggr3,aggr4' },
      { id: 'constituentCount', label: 'Constituents per Aggregate', type: 'number', required: false, defaultValue: 8 },
      { id: 'junctionPath', label: 'Junction Path', type: 'path', required: false, placeholder: '/fg_bigdata' },
      { id: 'securityStyle', label: 'Security Style', type: 'select', required: true, options: ['unix', 'ntfs', 'mixed'], defaultValue: 'unix' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const sizeTB = params.sizeTB;
      const aggregates = (params.aggregates as string).split(',').map(a => a.trim());
      const constituentCount = params.constituentCount || 8;
      const junctionPath = params.junctionPath ? escapePowerShellString(params.junctionPath) : `/${params.volumeName}`;
      const securityStyle = params.securityStyle || 'unix';
      
      return `# NetApp ONTAP Create FlexGroup Volume
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Creating FlexGroup Volume:" -ForegroundColor Cyan
    Write-Host "  Name: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Total Size: ${sizeTB} TB" -ForegroundColor Cyan
    Write-Host "  Aggregates: ${aggregates.join(', ')}" -ForegroundColor Cyan
    Write-Host "  Constituents per Aggregate: ${constituentCount}" -ForegroundColor Cyan
    Write-Host "  Junction Path: ${junctionPath}" -ForegroundColor Cyan
    Write-Host "  Security Style: ${securityStyle}" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify aggregates exist and have capacity
    \$Aggregates = @(${aggregates.map(a => `"${escapePowerShellString(a)}"`).join(', ')})
    \$TotalConstituents = \$Aggregates.Count * ${constituentCount}
    \$SizePerConstituent = (${sizeTB} * 1024) / \$TotalConstituents  # GB per constituent
    
    Write-Host "FlexGroup Layout:" -ForegroundColor Cyan
    Write-Host "  Total Constituents: \$TotalConstituents" -ForegroundColor Cyan
    Write-Host "  Size per Constituent: \$([math]::Round(\$SizePerConstituent, 2)) GB" -ForegroundColor Cyan
    Write-Host ""
    
    # Validate aggregates
    Write-Host "Validating aggregates..." -ForegroundColor Cyan
    
    foreach (\$Aggr in \$Aggregates) {
        \$AggrInfo = Get-NcAggr -Name \$Aggr
        if (-not \$AggrInfo) {
            Write-Host "  Error: Aggregate '\$Aggr' not found" -ForegroundColor Red
            exit
        }
        
        \$RequiredSpace = (\$SizePerConstituent * ${constituentCount}) * 1.2  # 20% overhead
        if (\$AggrInfo.Available / 1GB -lt \$RequiredSpace) {
            Write-Host "  Warning: Aggregate '\$Aggr' may not have sufficient space" -ForegroundColor Yellow
        }
        Write-Host "  ✓ \$Aggr - Available: \$([math]::Round(\$AggrInfo.Available / 1TB, 2)) TB" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Creating FlexGroup volume..." -ForegroundColor Cyan
    
    # Create FlexGroup
    New-NcVolFlexGroup \`
        -Name "${volumeName}" \`
        -Vserver "${svm}" \`
        -Aggr-List \$Aggregates \`
        -Aggr-List-Multiplier ${constituentCount} \`
        -Size "${sizeTB}tb" \`
        -JunctionPath "${junctionPath}" \`
        -SecurityStyle ${securityStyle}
    
    Write-Host "✓ FlexGroup volume created successfully!" -ForegroundColor Green
    
    # Get FlexGroup details
    \$FlexGroup = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "FlexGroup Details:" -ForegroundColor Green
    Write-Host "  Name: \$(\$FlexGroup.Name)" -ForegroundColor Cyan
    Write-Host "  Size: \$([math]::Round(\$FlexGroup.TotalSize / 1TB, 2)) TB" -ForegroundColor Cyan
    Write-Host "  State: \$(\$FlexGroup.State)" -ForegroundColor Cyan
    Write-Host "  Junction Path: \$(\$FlexGroup.JunctionPath)" -ForegroundColor Cyan
    Write-Host "  Security Style: \$(\$FlexGroup.SecurityStyle)" -ForegroundColor Cyan
    
    # Get constituent information
    \$Constituents = Get-NcVol -Name "${volumeName}__*" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Constituents: \$(\$Constituents.Count)" -ForegroundColor Cyan
    
    \$Constituents | Group-Object Aggregate | ForEach-Object {
        Write-Host "  \$(\$_.Name): \$(\$_.Count) constituent(s)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "FlexGroup creation failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-quota-management',
    name: 'Configure Volume Quotas',
    category: 'Volume Management',
    description: 'Set up and manage user, group, or tree quotas on volumes',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_data' },
      { id: 'quotaType', label: 'Quota Type', type: 'select', required: true, options: ['user', 'group', 'tree'], defaultValue: 'user' },
      { id: 'quotaTarget', label: 'Quota Target', type: 'text', required: true, placeholder: '*', description: 'User/Group name, qtree path, or * for default' },
      { id: 'diskLimitGB', label: 'Disk Limit (GB)', type: 'number', required: true, placeholder: '50' },
      { id: 'softLimitGB', label: 'Soft Limit (GB)', type: 'number', required: false, placeholder: '40' },
      { id: 'fileLimit', label: 'File Limit', type: 'number', required: false, placeholder: '100000' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const quotaType = params.quotaType || 'user';
      const quotaTarget = escapePowerShellString(params.quotaTarget);
      const diskLimitGB = params.diskLimitGB;
      const softLimitGB = params.softLimitGB;
      const fileLimit = params.fileLimit;
      
      return `# NetApp ONTAP Configure Volume Quotas
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Configuring Volume Quotas:" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Quota Type: ${quotaType}" -ForegroundColor Cyan
    Write-Host "  Target: ${quotaTarget}" -ForegroundColor Cyan
    Write-Host "  Disk Limit: ${diskLimitGB} GB" -ForegroundColor Cyan
${softLimitGB ? `    Write-Host "  Soft Limit: ${softLimitGB} GB" -ForegroundColor Cyan` : ''}
${fileLimit ? `    Write-Host "  File Limit: ${fileLimit}" -ForegroundColor Cyan` : ''}
    Write-Host ""
    
    # Check if quotas are already enabled
    \$Volume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    if (-not \$Volume) {
        Write-Host "Error: Volume '${volumeName}' not found" -ForegroundColor Red
        exit
    }
    
    # Create quota policy if needed
    \$PolicyName = "${svm}_quota_policy"
    \$ExistingPolicy = Get-NcQuotaPolicy -PolicyName \$PolicyName -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    if (-not \$ExistingPolicy) {
        Write-Host "Creating quota policy: \$PolicyName" -ForegroundColor Cyan
        New-NcQuotaPolicy -PolicyName \$PolicyName -Vserver "${svm}"
    }
    
    # Set policy on SVM
    Set-NcVserver -Name "${svm}" -QuotaPolicy \$PolicyName
    
    # Add quota rule
    Write-Host "Adding quota rule..." -ForegroundColor Cyan
    
    \$QuotaParams = @{
        Volume = "${volumeName}"
        Type = "${quotaType}"
        Target = "${quotaTarget}"
        DiskLimit = "${diskLimitGB}GB"
        Vserver = "${svm}"
        Policy = \$PolicyName
    }
    
${softLimitGB ? `    \$QuotaParams.SoftDiskLimit = "${softLimitGB}GB"` : ''}
${fileLimit ? `    \$QuotaParams.FileLimit = ${fileLimit}` : ''}
    
    # Remove existing rule if present
    Get-NcQuota -Volume "${volumeName}" -Type "${quotaType}" -QuotaTarget "${quotaTarget}" -Vserver "${svm}" -ErrorAction SilentlyContinue |
        Remove-NcQuota -Confirm:\$false
    
    # Add new rule
    Add-NcQuota @QuotaParams
    
    Write-Host "✓ Quota rule added" -ForegroundColor Green
    
    # Enable/reinitialize quotas on volume
    Write-Host ""
    Write-Host "Enabling quotas on volume..." -ForegroundColor Cyan
    
    # Turn off quotas first if on
    Disable-NcQuota -Volume "${volumeName}" -Vserver "${svm}" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Turn on quotas
    Enable-NcQuota -Volume "${volumeName}" -Vserver "${svm}"
    
    # Wait for quota initialization
    Write-Host "Waiting for quota initialization..." -ForegroundColor Cyan
    
    do {
        Start-Sleep -Seconds 5
        \$QuotaStatus = Get-NcQuotaStatus -Volume "${volumeName}" -Vserver "${svm}"
        Write-Host "  Status: \$(\$QuotaStatus.Status)" -ForegroundColor Cyan
    } while (\$QuotaStatus.Status -eq "initializing")
    
    Write-Host ""
    Write-Host "✓ Quotas enabled successfully!" -ForegroundColor Green
    
    # Display quota rules
    Write-Host ""
    Write-Host "Current Quota Rules:" -ForegroundColor Green
    
    \$Quotas = Get-NcQuota -Volume "${volumeName}" -Vserver "${svm}"
    \$Quotas | Format-Table Type, QuotaTarget, DiskLimit, SoftDiskLimit, FileLimit -AutoSize
    
    # Display quota report
    Write-Host ""
    Write-Host "Quota Report:" -ForegroundColor Green
    
    \$QuotaReport = Get-NcQuotaReport -Volume "${volumeName}" -Vserver "${svm}"
    
    if (\$QuotaReport) {
        \$QuotaReport | Select-Object -First 10 | Format-Table Tree, DiskUsed, DiskLimit, FileUsed, FileLimit -AutoSize
    }
    
} catch {
    Write-Error "Quota configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-event-log-export',
    name: 'Export Event Log and Alerts',
    category: 'Monitoring',
    description: 'Export system event logs and alerts for analysis and auditing',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: false, defaultValue: 24, placeholder: '24' },
      { id: 'severity', label: 'Minimum Severity', type: 'select', required: false, options: ['DEBUG', 'INFORMATIONAL', 'NOTICE', 'WARNING', 'ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'], defaultValue: 'WARNING' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\NetApp_Events.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const hoursBack = params.hoursBack || 24;
      const severity = params.severity || 'WARNING';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# NetApp ONTAP Export Event Log and Alerts
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    \$HoursBack = ${hoursBack}
    \$StartTime = (Get-Date).AddHours(-\$HoursBack)
    
    Write-Host "Event Log Export:" -ForegroundColor Cyan
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
    Write-Host "  Time Range: Last \$HoursBack hours" -ForegroundColor Cyan
    Write-Host "  Minimum Severity: ${severity}" -ForegroundColor Cyan
    Write-Host "  Export Path: ${exportPath}" -ForegroundColor Cyan
    Write-Host ""
    
    # Define severity levels
    \$SeverityLevels = @{
        'DEBUG' = 0
        'INFORMATIONAL' = 1
        'NOTICE' = 2
        'WARNING' = 3
        'ERROR' = 4
        'CRITICAL' = 5
        'ALERT' = 6
        'EMERGENCY' = 7
    }
    
    \$MinSeverity = \$SeverityLevels['${severity}']
    
    # Get EMS events
    Write-Host "Retrieving EMS events..." -ForegroundColor Cyan
    
    \$Events = Get-NcEmsMessage | Where-Object { 
        \$_.Time -gt \$StartTime -and
        \$SeverityLevels[\$_.Severity] -ge \$MinSeverity
    }
    
    Write-Host "Found \$(\$Events.Count) event(s)" -ForegroundColor Cyan
    Write-Host ""
    
    # Process events
    \$EventReport = \$Events | Select-Object @{
        N='Timestamp'
        E={\$_.Time.ToString('yyyy-MM-dd HH:mm:ss')}
    }, Severity, Node, MessageName, Event
    
    # Display summary by severity
    Write-Host "Events by Severity:" -ForegroundColor Green
    
    \$Events | Group-Object Severity | Sort-Object @{
        Expression={
            \$SeverityLevels[\$_.Name]
        }
        Descending=\$true
    } | ForEach-Object {
        \$Color = switch (\$_.Name) {
            'EMERGENCY' { 'Red' }
            'ALERT' { 'Red' }
            'CRITICAL' { 'Red' }
            'ERROR' { 'Red' }
            'WARNING' { 'Yellow' }
            default { 'Cyan' }
        }
        Write-Host "  \$(\$_.Name): \$(\$_.Count)" -ForegroundColor \$Color
    }
    
    Write-Host ""
    
    # Display recent critical events
    \$CriticalEvents = \$Events | Where-Object {
        \$SeverityLevels[\$_.Severity] -ge \$SeverityLevels['ERROR']
    } | Select-Object -First 10
    
    if (\$CriticalEvents) {
        Write-Host "Recent Critical Events:" -ForegroundColor Red
        \$CriticalEvents | ForEach-Object {
            Write-Host "  [\$(\$_.Time.ToString('MM/dd HH:mm'))] \$(\$_.Severity): \$(\$_.MessageName)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Export to CSV
    \$EventReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Events exported to: ${exportPath}" -ForegroundColor Green
    
    # Also export alerts
    \$AlertsPath = "${exportPath}".Replace('.csv', '_Alerts.csv')
    
    Write-Host ""
    Write-Host "Retrieving active alerts..." -ForegroundColor Cyan
    
    \$Alerts = Get-NcHealthAlert
    
    if (\$Alerts) {
        Write-Host "Found \$(\$Alerts.Count) active alert(s)" -ForegroundColor Yellow
        
        \$Alerts | Select-Object @{
            N='Timestamp'
            E={\$_.AlertTime.ToString('yyyy-MM-dd HH:mm:ss')}
        }, Severity, Alerting-Resource, Probable-Cause, Possible-Effect |
            Export-Csv -Path \$AlertsPath -NoTypeInformation
        
        Write-Host "✓ Alerts exported to: \$AlertsPath" -ForegroundColor Green
        
        # Display active alerts
        Write-Host ""
        Write-Host "Active Alerts:" -ForegroundColor Yellow
        \$Alerts | ForEach-Object {
            Write-Host "  [\$(\$_.Severity)] \$(\$_.'Alerting-Resource')" -ForegroundColor Yellow
            Write-Host "    Cause: \$(\$_.'Probable-Cause')" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No active alerts" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Event log export failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-fpolicy-configure',
    name: 'Configure FPolicy for File Screening',
    category: 'Security',
    description: 'Set up FPolicy for native file screening and blocking unwanted file types',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'block_ransomware' },
      { id: 'extensions', label: 'File Extensions to Block', type: 'textarea', required: true, placeholder: '.encrypted\n.locky\n.crypto\n.cerber', description: 'One extension per line' },
      { id: 'volumeNames', label: 'Volumes to Protect (comma-separated)', type: 'text', required: true, placeholder: 'vol_data,vol_share' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Monitor', 'Block'], defaultValue: 'Block' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const policyName = escapePowerShellString(params.policyName);
      const extensions = (params.extensions as string).split('\n').filter(e => e.trim()).map(e => e.trim());
      const volumeNames = (params.volumeNames as string).split(',').map(v => v.trim());
      const action = params.action || 'Block';
      
      return `# NetApp ONTAP Configure FPolicy for File Screening
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "FPolicy Configuration:" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Policy: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Action: ${action}" -ForegroundColor Cyan
    Write-Host ""
    
    \$Extensions = @(
${extensions.map(e => `        "${escapePowerShellString(e)}"`).join(',\n')}
    )
    
    \$Volumes = @(
${volumeNames.map(v => `        "${escapePowerShellString(v)}"`).join(',\n')}
    )
    
    Write-Host "Extensions to Block:" -ForegroundColor Cyan
    \$Extensions | ForEach-Object { Write-Host "  \$_" -ForegroundColor Cyan }
    Write-Host ""
    Write-Host "Volumes to Protect:" -ForegroundColor Cyan
    \$Volumes | ForEach-Object { Write-Host "  \$_" -ForegroundColor Cyan }
    Write-Host ""
    
    # Create FPolicy event
    \$EventName = "${policyName}_event"
    Write-Host "Creating FPolicy event: \$EventName" -ForegroundColor Cyan
    
    New-NcFpolicyEvent \`
        -EventName \$EventName \`
        -Protocol cifs \`
        -FileOperations create,rename \`
        -Filters file-op-with-extension \`
        -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    Write-Host "✓ FPolicy event created" -ForegroundColor Green
    
    # Create FPolicy engine (native)
    \$EngineName = "${policyName}_engine"
    Write-Host "Creating native FPolicy engine: \$EngineName" -ForegroundColor Cyan
    
    New-NcFpolicyExternalEngine \`
        -EngineName \$EngineName \`
        -Type native \`
        -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    Write-Host "✓ FPolicy engine created" -ForegroundColor Green
    
    # Create FPolicy policy
    Write-Host "Creating FPolicy policy: ${policyName}" -ForegroundColor Cyan
    
    New-NcFpolicyPolicy \`
        -PolicyName "${policyName}" \`
        -Engine \$EngineName \`
        -Events \$EventName \`
        -IsPassthroughReadEnabled \$false \`
        -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    Write-Host "✓ FPolicy policy created" -ForegroundColor Green
    
    # Create FPolicy scope
    Write-Host "Creating FPolicy scope..." -ForegroundColor Cyan
    
    New-NcFpolicyScope \`
        -PolicyName "${policyName}" \`
        -VolumesToInclude \$Volumes \`
        -ExportPoliciesToInclude "*" \`
        -FileExtensionsToInclude \$Extensions \`
        -Vserver "${svm}" -ErrorAction SilentlyContinue
    
    Write-Host "✓ FPolicy scope configured" -ForegroundColor Green
    
    # Enable FPolicy
    Write-Host "Enabling FPolicy..." -ForegroundColor Cyan
    
    Enable-NcFpolicy \`
        -PolicyName "${policyName}" \`
        -SequenceNumber 1 \`
        -Vserver "${svm}"
    
    Write-Host "✓ FPolicy enabled!" -ForegroundColor Green
    
    # Display FPolicy status
    \$FpolicyStatus = Get-NcFpolicy -PolicyName "${policyName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "FPolicy Status:" -ForegroundColor Green
    Write-Host "  Policy: \$(\$FpolicyStatus.PolicyName)" -ForegroundColor Cyan
    Write-Host "  Enabled: \$(\$FpolicyStatus.Enabled)" -ForegroundColor Cyan
    Write-Host "  Engine: \$(\$FpolicyStatus.Engine)" -ForegroundColor Cyan
    
    Write-Host ""
${action === 'Block' ? `    Write-Host "Files with blocked extensions will be prevented from creation/rename" -ForegroundColor Yellow` : `    Write-Host "File operations will be logged for monitoring (not blocked)" -ForegroundColor Yellow`}
    
} catch {
    Write-Error "FPolicy configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-alua-settings',
    name: 'Configure ALUA Settings',
    category: 'iSCSI/FCP Management',
    description: 'Configure Asymmetric Logical Unit Access (ALUA) for optimized multipath access',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'igroupName', label: 'Igroup Name', type: 'text', required: true, placeholder: 'igroup_vmware' },
      { id: 'aluaEnabled', label: 'Enable ALUA', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const igroupName = escapePowerShellString(params.igroupName);
      const aluaEnabled = params.aluaEnabled !== false;
      
      return `# NetApp ONTAP Configure ALUA Settings
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "ALUA Configuration:" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Igroup: ${igroupName}" -ForegroundColor Cyan
    Write-Host "  ALUA Enabled: ${aluaEnabled}" -ForegroundColor Cyan
    Write-Host ""
    
    # Get igroup details
    \$Igroup = Get-NcIgroup -Name "${igroupName}" -Vserver "${svm}"
    
    if (-not \$Igroup) {
        Write-Host "Error: Igroup '${igroupName}' not found" -ForegroundColor Red
        exit
    }
    
    Write-Host "Current Igroup Configuration:" -ForegroundColor Cyan
    Write-Host "  Name: \$(\$Igroup.Name)" -ForegroundColor Cyan
    Write-Host "  Type: \$(\$Igroup.Type)" -ForegroundColor Cyan
    Write-Host "  Protocol: \$(\$Igroup.Protocol)" -ForegroundColor Cyan
    Write-Host ""
    
    # Configure ALUA
${aluaEnabled ? `    Write-Host "Enabling ALUA..." -ForegroundColor Cyan
    
    Set-NcIgroup \`
        -Name "${igroupName}" \`
        -ALUA \$true \`
        -Vserver "${svm}"
    
    Write-Host "✓ ALUA enabled for igroup '${igroupName}'" -ForegroundColor Green` : `    Write-Host "Disabling ALUA..." -ForegroundColor Yellow
    
    Set-NcIgroup \`
        -Name "${igroupName}" \`
        -ALUA \$false \`
        -Vserver "${svm}"
    
    Write-Host "✓ ALUA disabled for igroup '${igroupName}'" -ForegroundColor Yellow`}
    
    # Get LUN mappings for this igroup
    Write-Host ""
    Write-Host "LUN Mappings for this igroup:" -ForegroundColor Green
    
    \$Mappings = Get-NcLunMap -InitiatorGroup "${igroupName}" -Vserver "${svm}"
    
    if (\$Mappings) {
        \$Mappings | ForEach-Object {
            \$Lun = Get-NcLun -Path \$_.Path -Vserver "${svm}"
            Write-Host "  LUN ID \$(\$_.LunId): \$(\$_.Path)" -ForegroundColor Cyan
            Write-Host "    Size: \$([math]::Round(\$Lun.Size / 1GB, 2)) GB" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  No LUNs mapped to this igroup" -ForegroundColor Yellow
    }
    
    Write-Host ""
${aluaEnabled ? `    Write-Host "ALUA Information:" -ForegroundColor Green
    Write-Host "  With ALUA enabled, the host will receive optimized path information" -ForegroundColor Cyan
    Write-Host "  Optimized paths go directly to the node owning the LUN" -ForegroundColor Cyan
    Write-Host "  Non-optimized paths cross the cluster interconnect" -ForegroundColor Cyan
    Write-Host "  Ensure host multipathing software supports ALUA (MPIO, PowerPath, etc.)" -ForegroundColor Yellow` : ''}
    
} catch {
    Write-Error "ALUA configuration failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-network-port-status',
    name: 'Monitor Network Port Status',
    category: 'Monitoring',
    description: 'Check network port health, link status, and interface groups',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'nodeName', label: 'Node Name (optional)', type: 'text', required: false, placeholder: 'node1' },
      { id: 'exportPath', label: 'Export Report Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Network_Ports.csv' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const nodeName = params.nodeName ? escapePowerShellString(params.nodeName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# NetApp ONTAP Monitor Network Port Status
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "Network Port Status Report:" -ForegroundColor Cyan
    Write-Host "  Cluster: ${cluster}" -ForegroundColor Cyan
${nodeName ? `    Write-Host "  Node: ${nodeName}" -ForegroundColor Cyan` : ''}
    Write-Host "  Timestamp: \$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host ""
    
    # Get network ports
${nodeName ? `    \$Ports = Get-NcNetPort -Node "${nodeName}"` : `    \$Ports = Get-NcNetPort`}
    
    \$HasIssues = \$false
    
    Write-Host "PHYSICAL PORTS:" -ForegroundColor Green
    
    \$PhysicalPorts = \$Ports | Where-Object { \$_.PortType -eq "physical" }
    
    \$PortReport = @()
    
    foreach (\$Port in \$PhysicalPorts) {
        \$LinkStatus = \$Port.LinkStatus
        \$Color = if (\$LinkStatus -eq "up") { "Cyan" } else { "Red"; \$HasIssues = \$true }
        
        Write-Host "  \$(\$Port.Node):\$(\$Port.Port)" -ForegroundColor \$Color
        Write-Host "    Link Status: \$LinkStatus" -ForegroundColor \$Color
        Write-Host "    Speed: \$(\$Port.Speed)" -ForegroundColor Cyan
        Write-Host "    MTU: \$(\$Port.Mtu)" -ForegroundColor Cyan
        Write-Host "    Role: \$(\$Port.Role)" -ForegroundColor Cyan
        
        \$PortReport += [PSCustomObject]@{
            Node = \$Port.Node
            Port = \$Port.Port
            Type = \$Port.PortType
            LinkStatus = \$Port.LinkStatus
            Speed = \$Port.Speed
            MTU = \$Port.Mtu
            Role = \$Port.Role
            IPspace = \$Port.Ipspace
            BroadcastDomain = \$Port.BroadcastDomain
        }
    }
    
    # Get interface groups (LAGs)
    Write-Host ""
    Write-Host "INTERFACE GROUPS (LAGs):" -ForegroundColor Green
    
    \$IfGroups = \$Ports | Where-Object { \$_.PortType -eq "if_group" }
    
    if (\$IfGroups) {
        foreach (\$Ifg in \$IfGroups) {
            \$Color = if (\$Ifg.LinkStatus -eq "up") { "Cyan" } else { "Yellow"; \$HasIssues = \$true }
            
            Write-Host "  \$(\$Ifg.Node):\$(\$Ifg.Port)" -ForegroundColor \$Color
            Write-Host "    Status: \$(\$Ifg.LinkStatus)" -ForegroundColor \$Color
            Write-Host "    Mode: \$(\$Ifg.IfgrpMode)" -ForegroundColor Cyan
            Write-Host "    Members: \$(\$Ifg.IfgrpPorts -join ', ')" -ForegroundColor Cyan
            
            \$PortReport += [PSCustomObject]@{
                Node = \$Ifg.Node
                Port = \$Ifg.Port
                Type = \$Ifg.PortType
                LinkStatus = \$Ifg.LinkStatus
                Speed = \$Ifg.Speed
                MTU = \$Ifg.Mtu
                Role = \$Ifg.Role
                IPspace = \$Ifg.Ipspace
                BroadcastDomain = \$Ifg.BroadcastDomain
            }
        }
    } else {
        Write-Host "  No interface groups configured" -ForegroundColor Yellow
    }
    
    # Get VLANs
    Write-Host ""
    Write-Host "VLANs:" -ForegroundColor Green
    
    \$Vlans = \$Ports | Where-Object { \$_.PortType -eq "vlan" }
    
    if (\$Vlans) {
        foreach (\$Vlan in \$Vlans) {
            Write-Host "  \$(\$Vlan.Node):\$(\$Vlan.Port) - Status: \$(\$Vlan.LinkStatus)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  No VLANs configured" -ForegroundColor Yellow
    }
    
${exportPath ? `    
    # Export report
    \$PortReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "✓ Port report exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
    # Summary
    Write-Host ""
    \$UpPorts = (\$PhysicalPorts | Where-Object { \$_.LinkStatus -eq "up" }).Count
    \$DownPorts = (\$PhysicalPorts | Where-Object { \$_.LinkStatus -ne "up" }).Count
    
    Write-Host "Port Summary:" -ForegroundColor Green
    Write-Host "  Ports Up: \$UpPorts" -ForegroundColor Cyan
    Write-Host "  Ports Down: \$DownPorts" -ForegroundColor \$(if (\$DownPorts -gt 0) { "Red" } else { "Cyan" })
    
    if (\$HasIssues) {
        Write-Host ""
        Write-Host "⚠ Network issues detected - Review ports marked in red" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Network port status check failed: \$_"
}`;
    },
    isPremium: true
  },
  {
    id: 'netapp-fabricpool-tiering',
    name: 'Configure FabricPool Tiering',
    category: 'Storage Efficiency',
    description: 'Set up automatic data tiering to cloud storage with FabricPool',
    parameters: [
      { id: 'cluster', label: 'Cluster Name', type: 'text', required: true, placeholder: 'netapp-cluster' },
      { id: 'svm', label: 'SVM Name', type: 'text', required: true, placeholder: 'svm1' },
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'vol_archive' },
      { id: 'tieringPolicy', label: 'Tiering Policy', type: 'select', required: true, options: ['none', 'snapshot-only', 'auto', 'all'], defaultValue: 'auto' },
      { id: 'coolingDays', label: 'Cooling Period (days)', type: 'number', required: false, defaultValue: 31, description: 'Days before data is considered cold' }
    ],
    scriptTemplate: (params) => {
      const cluster = escapePowerShellString(params.cluster);
      const svm = escapePowerShellString(params.svm);
      const volumeName = escapePowerShellString(params.volumeName);
      const tieringPolicy = params.tieringPolicy || 'auto';
      const coolingDays = params.coolingDays || 31;
      
      return `# NetApp ONTAP Configure FabricPool Tiering
# Generated: ${new Date().toISOString()}

Import-Module NetApp.ONTAP

try {
    Connect-NcController -Name "${cluster}" -Credential (Get-Credential)
    
    Write-Host "FabricPool Tiering Configuration:" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeName}" -ForegroundColor Cyan
    Write-Host "  SVM: ${svm}" -ForegroundColor Cyan
    Write-Host "  Tiering Policy: ${tieringPolicy}" -ForegroundColor Cyan
    Write-Host "  Cooling Period: ${coolingDays} days" -ForegroundColor Cyan
    Write-Host ""
    
    # Get volume details
    \$Volume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    if (-not \$Volume) {
        Write-Host "Error: Volume '${volumeName}' not found" -ForegroundColor Red
        exit
    }
    
    # Check if aggregate has FabricPool attached
    \$Aggregate = Get-NcAggr -Name \$Volume.Aggregate
    
    if (-not \$Aggregate.HasObjectStoreTier) {
        Write-Host "Warning: Aggregate '\$(\$Aggregate.Name)' does not have a cloud tier attached" -ForegroundColor Yellow
        Write-Host "FabricPool requires an object store to be attached to the aggregate" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To attach an object store, use:" -ForegroundColor Yellow
        Write-Host "  Attach-NcAggrObjectStore -Name '\$(\$Aggregate.Name)' -ObjectStoreName 'object_store_name'" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "Current Volume Settings:" -ForegroundColor Cyan
    Write-Host "  Current Tiering Policy: \$(\$Volume.TieringPolicy)" -ForegroundColor Cyan
    Write-Host "  Aggregate: \$(\$Volume.Aggregate)" -ForegroundColor Cyan
    Write-Host ""
    
    # Set tiering policy
    Write-Host "Configuring tiering policy..." -ForegroundColor Cyan
    
    Set-NcVol \`
        -Name "${volumeName}" \`
        -TieringPolicy ${tieringPolicy} \`
        -TieringMinimumCoolingDays ${coolingDays} \`
        -Vserver "${svm}"
    
    Write-Host "✓ Tiering policy configured!" -ForegroundColor Green
    
    # Get updated volume info
    \$UpdatedVolume = Get-NcVol -Name "${volumeName}" -Vserver "${svm}"
    
    Write-Host ""
    Write-Host "Updated Volume Settings:" -ForegroundColor Green
    Write-Host "  Tiering Policy: \$(\$UpdatedVolume.TieringPolicy)" -ForegroundColor Cyan
    Write-Host "  Minimum Cooling Days: \$(\$UpdatedVolume.TieringMinimumCoolingDays)" -ForegroundColor Cyan
    
    # Explain the tiering policy
    Write-Host ""
    Write-Host "Tiering Policy Explanation:" -ForegroundColor Yellow
    
    switch ("${tieringPolicy}") {
        "none" {
            Write-Host "  No data will be tiered to the cloud tier" -ForegroundColor Cyan
            Write-Host "  All data remains on the performance tier" -ForegroundColor Cyan
        }
        "snapshot-only" {
            Write-Host "  Only snapshot data blocks not associated with the active file system are tiered" -ForegroundColor Cyan
            Write-Host "  User data blocks remain on the performance tier" -ForegroundColor Cyan
        }
        "auto" {
            Write-Host "  Cold user data blocks and snapshot blocks are tiered" -ForegroundColor Cyan
            Write-Host "  Data is tiered after ${coolingDays} days of inactivity" -ForegroundColor Cyan
            Write-Host "  Cold data is automatically returned when accessed" -ForegroundColor Cyan
        }
        "all" {
            Write-Host "  All user data blocks are immediately tiered to the cloud" -ForegroundColor Cyan
            Write-Host "  Metadata remains on the performance tier" -ForegroundColor Cyan
            Write-Host "  Best for data that is rarely accessed" -ForegroundColor Cyan
        }
    }
    
    # Show tiering status
    Write-Host ""
    Write-Host "To monitor tiering progress, run:" -ForegroundColor Yellow
    Write-Host "  Get-NcVol -Name '${volumeName}' -Vserver '${svm}' | Select TieringPolicy, SpaceTierCloudUsed, SpaceTierCloudRetrieved" -ForegroundColor Yellow
    
} catch {
    Write-Error "FabricPool configuration failed: \$_"
}`;
    },
    isPremium: true
  }
];
