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
  }
];
