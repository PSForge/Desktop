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
  }
];
