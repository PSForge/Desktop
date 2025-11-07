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
  }
];
