import { escapePowerShellString } from './powershell-utils';

export interface GCPTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface GCPTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: GCPTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
}

export const gcpTasks: GCPTask[] = [
  {
    id: 'gcp-bulk-vm-control',
    name: 'Bulk VM Start/Stop/Delete',
    category: 'Bulk Operations',
    description: 'Control multiple GCE instances',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-123' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'instanceNames', label: 'Instance Names (comma-separated)', type: 'textarea', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Start', 'Stop', 'Delete'], defaultValue: 'Start' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const zone = escapePowerShellString(params.zone);
      const instanceNamesRaw = (params.instanceNames as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      
      return `# GCP Bulk VM Control
# Generated: ${new Date().toISOString()}

gcloud config set project ${project}

$InstanceNames = @(${instanceNamesRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})

try {
    foreach ($Instance in $InstanceNames) {
        Write-Host "${action}ing instance: $Instance..." -ForegroundColor Yellow
        
        gcloud compute instances ${action.toLowerCase()} $Instance --zone="${zone}"${action === 'Delete' ? ' --quiet' : ''}
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ ${action}: $Instance" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $Instance" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Bulk VM operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  },
  {
    id: 'gcp-create-vm',
    name: 'Create GCE Instance',
    category: 'Compute Management',
    description: 'Create a new Google Compute Engine instance',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'instanceName', label: 'Instance Name', type: 'text', required: true, placeholder: 'web-server-01' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'machineType', label: 'Machine Type', type: 'select', required: true, options: ['e2-micro', 'e2-small', 'e2-medium', 'n1-standard-1', 'n1-standard-2'], defaultValue: 'e2-micro' },
      { id: 'image', label: 'Boot Image', type: 'text', required: true, placeholder: 'debian-11' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const instanceName = escapePowerShellString(params.instanceName);
      const zone = escapePowerShellString(params.zone);
      const machineType = params.machineType;
      const image = escapePowerShellString(params.image);
      
      return `# Create GCP Compute Instance
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
    gcloud compute instances create "${instanceName}" \`
        --zone="${zone}" \`
        --machine-type="${machineType}" \`
        --image-family="${image}" \`
        --image-project=debian-cloud \`
        --boot-disk-size=10GB
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Instance '${instanceName}' created successfully!" -ForegroundColor Green
    } else {
        Write-Error "Instance creation failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  },
  {
    id: 'gcp-manage-storage-bucket',
    name: 'Manage Cloud Storage Bucket',
    category: 'Storage Management',
    description: 'Create or configure GCS bucket',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'location', label: 'Location', type: 'select', required: true, options: ['US', 'EU', 'ASIA'], defaultValue: 'US' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const bucketName = escapePowerShellString(params.bucketName);
      const location = params.location;
      
      return `# GCP Cloud Storage Bucket Management
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
    gsutil mb -l ${location} gs://${bucketName}/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Bucket '${bucketName}' created successfully!" -ForegroundColor Green
    } else {
        Write-Error "Bucket creation failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  }
];
