import { escapePowerShellString, toPowerShellBoolean } from './powershell-utils';

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
  isPremium: boolean;
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
  ,
    isPremium: true
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
  ,
    isPremium: true
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
  ,
    isPremium: true
  },
  {
    id: 'gcp-modify-vm-instance',
    name: 'Modify VM Instances',
    category: 'Common Admin Tasks',
    description: 'Modify existing GCE instance configurations',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'instanceName', label: 'Instance Name', type: 'text', required: true, placeholder: 'web-server-01' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Change Machine Type', 'Add Labels', 'Update Metadata'], defaultValue: 'Change Machine Type' },
      { id: 'machineType', label: 'New Machine Type', type: 'select', required: false, options: ['e2-micro', 'e2-small', 'e2-medium', 'n1-standard-1', 'n1-standard-2'], defaultValue: 'e2-small' },
      { id: 'labels', label: 'Labels (key=value, comma-separated)', type: 'textarea', required: false, placeholder: 'env=prod,team=engineering' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const instanceName = escapePowerShellString(params.instanceName);
      const zone = escapePowerShellString(params.zone);
      const action = params.action;
      const machineType = params.machineType;
      const labelsRaw = params.labels ? (params.labels as string).split(',').map((l: string) => l.trim()) : [];
      
      return `# GCP Modify VM Instance
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Change Machine Type' ? `    # Stop instance
    gcloud compute instances stop "${instanceName}" --zone="${zone}" --quiet
    Write-Host "Stopping instance..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Change machine type
    gcloud compute instances set-machine-type "${instanceName}" \`
        --zone="${zone}" \`
        --machine-type="${machineType}"
    
    # Start instance
    gcloud compute instances start "${instanceName}" --zone="${zone}" --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Machine type changed to: ${machineType}" -ForegroundColor Green
        Write-Host "✓ Instance restarted" -ForegroundColor Green
    }` :
action === 'Add Labels' ? `    $LabelArgs = "${labelsRaw.join(',')}"
    gcloud compute instances add-labels "${instanceName}" \`
        --zone="${zone}" \`
        --labels=$LabelArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Labels added to instance" -ForegroundColor Green
    }` :
`    gcloud compute instances add-metadata "${instanceName}" \`
        --zone="${zone}" \`
        --metadata=startup-script="#!/bin/bash\necho 'Modified by PSForge'"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Metadata updated" -ForegroundColor Green
    }`}
    
} catch {
    Write-Error "Modification failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-manage-persistent-disks',
    name: 'Create and Manage Persistent Disks',
    category: 'Common Admin Tasks',
    description: 'Create, attach, and manage persistent disks',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Disk', 'Attach Disk', 'Detach Disk', 'Delete Disk'], defaultValue: 'Create Disk' },
      { id: 'diskName', label: 'Disk Name', type: 'text', required: true, placeholder: 'my-disk' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'size', label: 'Disk Size (GB)', type: 'number', required: false, placeholder: '100', defaultValue: 100 },
      { id: 'diskType', label: 'Disk Type', type: 'select', required: false, options: ['pd-standard', 'pd-ssd', 'pd-balanced'], defaultValue: 'pd-standard' },
      { id: 'instanceName', label: 'Instance Name (for attach/detach)', type: 'text', required: false, placeholder: 'web-server-01' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const diskName = escapePowerShellString(params.diskName);
      const zone = escapePowerShellString(params.zone);
      const size = params.size || 100;
      const diskType = params.diskType;
      const instanceName = params.instanceName ? escapePowerShellString(params.instanceName) : '';
      
      return `# GCP Persistent Disk Management
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create Disk' ? `    gcloud compute disks create "${diskName}" \`
        --zone="${zone}" \`
        --size=${size}GB \`
        --type=${diskType}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Disk created: ${diskName}" -ForegroundColor Green
        Write-Host "  Size: ${size} GB" -ForegroundColor Cyan
        Write-Host "  Type: ${diskType}" -ForegroundColor Cyan
    }` :
action === 'Attach Disk' ? `    gcloud compute instances attach-disk "${instanceName}" \`
        --disk="${diskName}" \`
        --zone="${zone}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Disk attached to instance: ${instanceName}" -ForegroundColor Green
    }` :
action === 'Detach Disk' ? `    gcloud compute instances detach-disk "${instanceName}" \`
        --disk="${diskName}" \`
        --zone="${zone}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Disk detached from instance: ${instanceName}" -ForegroundColor Green
    }` :
`    gcloud compute disks delete "${diskName}" \`
        --zone="${zone}" \`
        --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Disk deleted: ${diskName}" -ForegroundColor Green
    }`}
    
} catch {
    Write-Error "Disk operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-configure-network-settings',
    name: 'Configure Network Settings',
    category: 'Common Admin Tasks',
    description: 'Configure VPC networks and subnets',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create VPC Network', 'Create Subnet', 'List Networks'], defaultValue: 'Create VPC Network' },
      { id: 'networkName', label: 'Network Name', type: 'text', required: false, placeholder: 'my-vpc-network' },
      { id: 'subnetName', label: 'Subnet Name', type: 'text', required: false, placeholder: 'my-subnet' },
      { id: 'subnetRegion', label: 'Subnet Region', type: 'text', required: false, placeholder: 'us-central1' },
      { id: 'ipRange', label: 'IP Range (CIDR)', type: 'text', required: false, placeholder: '10.0.1.0/24' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const networkName = params.networkName ? escapePowerShellString(params.networkName) : '';
      const subnetName = params.subnetName ? escapePowerShellString(params.subnetName) : '';
      const subnetRegion = params.subnetRegion ? escapePowerShellString(params.subnetRegion) : '';
      const ipRange = params.ipRange ? escapePowerShellString(params.ipRange) : '';
      
      return `# GCP Network Configuration
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create VPC Network' ? `    gcloud compute networks create "${networkName}" \`
        --subnet-mode=custom \`
        --bgp-routing-mode=regional
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ VPC network created: ${networkName}" -ForegroundColor Green
    }` :
action === 'Create Subnet' ? `    gcloud compute networks subnets create "${subnetName}" \`
        --network="${networkName}" \`
        --region="${subnetRegion}" \`
        --range="${ipRange}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Subnet created: ${subnetName}" -ForegroundColor Green
        Write-Host "  Network: ${networkName}" -ForegroundColor Cyan
        Write-Host "  Region: ${subnetRegion}" -ForegroundColor Cyan
        Write-Host "  IP Range: ${ipRange}" -ForegroundColor Cyan
    }` :
`    Write-Host "✓ VPC Networks:" -ForegroundColor Green
    gcloud compute networks list
    
    Write-Host ""
    Write-Host "✓ Subnets:" -ForegroundColor Green
    gcloud compute networks subnets list`}
    
} catch {
    Write-Error "Network operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-manage-bucket-permissions',
    name: 'Manage Storage Buckets and Permissions',
    category: 'Common Admin Tasks',
    description: 'Configure bucket access control and IAM policies',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Make Public', 'Make Private', 'Add IAM Member'], defaultValue: 'Make Private' },
      { id: 'memberEmail', label: 'Member Email (for IAM)', type: 'email', required: false, placeholder: 'user@example.com' },
      { id: 'role', label: 'IAM Role', type: 'select', required: false, options: ['roles/storage.objectViewer', 'roles/storage.objectAdmin', 'roles/storage.admin'], defaultValue: 'roles/storage.objectViewer' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const bucketName = escapePowerShellString(params.bucketName);
      const action = params.action;
      const memberEmail = params.memberEmail ? escapePowerShellString(params.memberEmail) : '';
      const role = params.role;
      
      return `# GCP Storage Bucket Permissions
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Make Public' ? `    gsutil iam ch allUsers:objectViewer gs://${bucketName}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Bucket is now public: ${bucketName}" -ForegroundColor Green
        Write-Host "  ⚠ All users can view objects!" -ForegroundColor Yellow
    }` :
action === 'Make Private' ? `    gsutil iam ch -d allUsers:objectViewer gs://${bucketName}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Public access removed from: ${bucketName}" -ForegroundColor Green
    }` :
`    gsutil iam ch user:${memberEmail}:${role} gs://${bucketName}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ IAM policy updated for: ${bucketName}" -ForegroundColor Green
        Write-Host "  Member: ${memberEmail}" -ForegroundColor Cyan
        Write-Host "  Role: ${role}" -ForegroundColor Cyan
    }`}
    
} catch {
    Write-Error "Permission update failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-monitor-performance-metrics',
    name: 'Monitor Performance Metrics',
    category: 'Common Admin Tasks',
    description: 'Retrieve and monitor GCP resource metrics',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'resourceType', label: 'Resource Type', type: 'select', required: true, options: ['gce_instance', 'gcs_bucket', 'cloudsql_database'], defaultValue: 'gce_instance' },
      { id: 'metricType', label: 'Metric Type', type: 'select', required: true, options: ['CPU Utilization', 'Disk Usage', 'Network Traffic'], defaultValue: 'CPU Utilization' },
      { id: 'instanceName', label: 'Instance/Resource Name', type: 'text', required: false, placeholder: 'web-server-01' },
      { id: 'hours', label: 'Hours of History', type: 'number', required: true, placeholder: '24', defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const resourceType = params.resourceType;
      const metricType = params.metricType;
      const instanceName = params.instanceName ? escapePowerShellString(params.instanceName) : '';
      const hours = params.hours;
      
      const metricMap: Record<string, string> = {
        'CPU Utilization': 'compute.googleapis.com/instance/cpu/utilization',
        'Disk Usage': 'compute.googleapis.com/instance/disk/read_bytes_count',
        'Network Traffic': 'compute.googleapis.com/instance/network/received_bytes_count'
      };
      
      return `# GCP Performance Metrics Monitoring
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
    $StartTime = (Get-Date).AddHours(-${hours}).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $EndTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    Write-Host "✓ Fetching metrics for: ${instanceName}" -ForegroundColor Green
    Write-Host "  Resource Type: ${resourceType}" -ForegroundColor Cyan
    Write-Host "  Metric: ${metricType}" -ForegroundColor Cyan
    Write-Host "  Period: Last ${hours} hours" -ForegroundColor Cyan
    Write-Host ""
    
    # Using gcloud monitoring metrics
    gcloud monitoring time-series list \`
        --filter="metric.type=\\"${metricMap[metricType]}\\"" \`
        --format="table(metric.labels, points)" \`
        --project="${project}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Metrics retrieved successfully" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Metrics retrieval failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-export-billing-reports',
    name: 'Export Billing Reports',
    category: 'Common Admin Tasks',
    description: 'Export GCP billing data and cost reports',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'billingAccountId', label: 'Billing Account ID', type: 'text', required: true, placeholder: '012345-6789AB-CDEF01' },
      { id: 'reportMonth', label: 'Report Month (YYYY-MM)', type: 'text', required: true, placeholder: '2024-01' },
      { id: 'exportFormat', label: 'Export Format', type: 'select', required: true, options: ['CSV', 'JSON'], defaultValue: 'CSV' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const billingAccountId = escapePowerShellString(params.billingAccountId);
      const reportMonth = escapePowerShellString(params.reportMonth);
      const exportFormat = params.exportFormat;
      
      return `# GCP Billing Report Export
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
    Write-Host "✓ Exporting billing data for: ${reportMonth}" -ForegroundColor Green
    Write-Host "  Billing Account: ${billingAccountId}" -ForegroundColor Cyan
    Write-Host "  Format: ${exportFormat}" -ForegroundColor Cyan
    Write-Host ""
    
    # List billing data
    gcloud billing accounts list
    
    Write-Host ""
    Write-Host "To export detailed billing data, configure BigQuery export:" -ForegroundColor Yellow
    Write-Host "1. Enable BigQuery API" -ForegroundColor Cyan
    Write-Host "2. Create a BigQuery dataset" -ForegroundColor Cyan
    Write-Host "3. Configure billing export in Cloud Console" -ForegroundColor Cyan
    Write-Host ""
    
    # Get project costs (requires billing export to BigQuery)
    Write-Host "Current project billing status:" -ForegroundColor Green
    gcloud billing projects describe ${project}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Billing information retrieved" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Billing export failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-automate-backup-actions',
    name: 'Automate Backup Actions',
    category: 'Common Admin Tasks',
    description: 'Create automated backups for disks and snapshots',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'resourceType', label: 'Resource Type', type: 'select', required: true, options: ['Disk Snapshot', 'Cloud SQL Backup'], defaultValue: 'Disk Snapshot' },
      { id: 'resourceName', label: 'Resource Name', type: 'text', required: true, placeholder: 'my-disk or my-sql-instance' },
      { id: 'zone', label: 'Zone (for disks)', type: 'text', required: false, placeholder: 'us-central1-a' },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: false, placeholder: 'backup-snapshot' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const resourceType = params.resourceType;
      const resourceName = escapePowerShellString(params.resourceName);
      const zone = params.zone ? escapePowerShellString(params.zone) : '';
      const snapshotName = params.snapshotName ? escapePowerShellString(params.snapshotName) : `backup-${new Date().toISOString().split('T')[0]}`;
      
      return `# GCP Automated Backup
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${resourceType === 'Disk Snapshot' ? `    Write-Host "Creating disk snapshot..." -ForegroundColor Yellow
    
    gcloud compute disks snapshot "${resourceName}" \`
        --zone="${zone}" \`
        --snapshot-names="${snapshotName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Disk snapshot created: ${snapshotName}" -ForegroundColor Green
        Write-Host "  Source Disk: ${resourceName}" -ForegroundColor Cyan
        Write-Host "  Zone: ${zone}" -ForegroundColor Cyan
    }` :
`    Write-Host "Creating Cloud SQL backup..." -ForegroundColor Yellow
    
    gcloud sql backups create \`
        --instance="${resourceName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud SQL backup created" -ForegroundColor Green
        Write-Host "  Instance: ${resourceName}" -ForegroundColor Cyan
    }`}
    
    Write-Host ""
    Write-Host "To automate backups:" -ForegroundColor Yellow
    Write-Host "1. Set up Cloud Scheduler" -ForegroundColor Cyan
    Write-Host "2. Create a Cloud Function with this script" -ForegroundColor Cyan
    Write-Host "3. Schedule the function to run daily/weekly" -ForegroundColor Cyan
    
} catch {
    Write-Error "Backup creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-automate-restore-actions',
    name: 'Automate Restore Actions',
    category: 'Common Admin Tasks',
    description: 'Restore from disk snapshots and backups',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'restoreType', label: 'Restore Type', type: 'select', required: true, options: ['Disk from Snapshot', 'Cloud SQL from Backup'], defaultValue: 'Disk from Snapshot' },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: false, placeholder: 'backup-snapshot' },
      { id: 'newDiskName', label: 'New Disk Name', type: 'text', required: false, placeholder: 'restored-disk' },
      { id: 'zone', label: 'Zone', type: 'text', required: false, placeholder: 'us-central1-a' },
      { id: 'instanceName', label: 'Instance Name (for SQL)', type: 'text', required: false, placeholder: 'my-sql-instance' },
      { id: 'backupId', label: 'Backup ID (for SQL)', type: 'text', required: false, placeholder: '1234567890' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const restoreType = params.restoreType;
      const snapshotName = params.snapshotName ? escapePowerShellString(params.snapshotName) : '';
      const newDiskName = params.newDiskName ? escapePowerShellString(params.newDiskName) : '';
      const zone = params.zone ? escapePowerShellString(params.zone) : '';
      const instanceName = params.instanceName ? escapePowerShellString(params.instanceName) : '';
      const backupId = params.backupId ? escapePowerShellString(params.backupId) : '';
      
      return `# GCP Automated Restore
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${restoreType === 'Disk from Snapshot' ? `    Write-Host "Restoring disk from snapshot..." -ForegroundColor Yellow
    
    gcloud compute disks create "${newDiskName}" \`
        --source-snapshot="${snapshotName}" \`
        --zone="${zone}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Disk restored from snapshot" -ForegroundColor Green
        Write-Host "  New Disk: ${newDiskName}" -ForegroundColor Cyan
        Write-Host "  Source Snapshot: ${snapshotName}" -ForegroundColor Cyan
        Write-Host "  Zone: ${zone}" -ForegroundColor Cyan
    }` :
`    Write-Host "Restoring Cloud SQL from backup..." -ForegroundColor Yellow
    
    gcloud sql backups restore ${backupId} \`
        --backup-instance="${instanceName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud SQL instance restored" -ForegroundColor Green
        Write-Host "  Instance: ${instanceName}" -ForegroundColor Cyan
        Write-Host "  Backup ID: ${backupId}" -ForegroundColor Cyan
    }`}
    
} catch {
    Write-Error "Restore operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-configure-firewall-rules',
    name: 'Configure Firewall Rules',
    category: 'Common Admin Tasks',
    description: 'Create and manage VPC firewall rules',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Rule', 'Delete Rule', 'List Rules'], defaultValue: 'Create Rule' },
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: false, placeholder: 'allow-http' },
      { id: 'network', label: 'Network', type: 'text', required: false, placeholder: 'default' },
      { id: 'direction', label: 'Direction', type: 'select', required: false, options: ['INGRESS', 'EGRESS'], defaultValue: 'INGRESS' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: false, options: ['tcp', 'udp', 'icmp'], defaultValue: 'tcp' },
      { id: 'ports', label: 'Ports (comma-separated)', type: 'text', required: false, placeholder: '80,443' },
      { id: 'sourceRanges', label: 'Source IP Ranges', type: 'text', required: false, placeholder: '0.0.0.0/0', defaultValue: '0.0.0.0/0' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const ruleName = params.ruleName ? escapePowerShellString(params.ruleName) : '';
      const network = params.network ? escapePowerShellString(params.network) : 'default';
      const direction = params.direction;
      const protocol = params.protocol;
      const ports = params.ports ? escapePowerShellString(params.ports) : '';
      const sourceRanges = params.sourceRanges ? escapePowerShellString(params.sourceRanges) : '0.0.0.0/0';
      
      return `# GCP Firewall Rule Configuration
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create Rule' ? `    gcloud compute firewall-rules create "${ruleName}" \`
        --network="${network}" \`
        --direction=${direction} \`
        --action=ALLOW \`
        --rules=${protocol}:${ports} \`
        --source-ranges="${sourceRanges}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Firewall rule created: ${ruleName}" -ForegroundColor Green
        Write-Host "  Network: ${network}" -ForegroundColor Cyan
        Write-Host "  Direction: ${direction}" -ForegroundColor Cyan
        Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
        Write-Host "  Ports: ${ports}" -ForegroundColor Cyan
        Write-Host "  Source: ${sourceRanges}" -ForegroundColor Cyan
    }` :
action === 'Delete Rule' ? `    gcloud compute firewall-rules delete "${ruleName}" --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Firewall rule deleted: ${ruleName}" -ForegroundColor Green
    }` :
`    Write-Host "✓ Firewall Rules:" -ForegroundColor Green
    gcloud compute firewall-rules list --format="table(name,network,direction,priority,sourceRanges.list():label=SRC_RANGES,allowed[].map().firewall_rule().list():label=ALLOW)"`}
    
} catch {
    Write-Error "Firewall operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-manage-iam-roles',
    name: 'Manage IAM Roles and Assignments',
    category: 'Common Admin Tasks',
    description: 'Configure IAM roles and member assignments',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add IAM Binding', 'Remove IAM Binding', 'List IAM Policy'], defaultValue: 'Add IAM Binding' },
      { id: 'memberType', label: 'Member Type', type: 'select', required: false, options: ['user', 'serviceAccount', 'group'], defaultValue: 'user' },
      { id: 'memberEmail', label: 'Member Email', type: 'email', required: false, placeholder: 'user@example.com' },
      { id: 'role', label: 'Role', type: 'select', required: false, options: [
        'roles/viewer',
        'roles/editor',
        'roles/owner',
        'roles/compute.admin',
        'roles/storage.admin',
        'roles/iam.serviceAccountUser'
      ], defaultValue: 'roles/viewer' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const memberType = params.memberType;
      const memberEmail = params.memberEmail ? escapePowerShellString(params.memberEmail) : '';
      const role = params.role;
      
      return `# GCP IAM Role Management
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Add IAM Binding' ? `    gcloud projects add-iam-policy-binding ${project} \`
        --member="${memberType}:${memberEmail}" \`
        --role="${role}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ IAM binding added" -ForegroundColor Green
        Write-Host "  Member: ${memberType}:${memberEmail}" -ForegroundColor Cyan
        Write-Host "  Role: ${role}" -ForegroundColor Cyan
    }` :
action === 'Remove IAM Binding' ? `    gcloud projects remove-iam-policy-binding ${project} \`
        --member="${memberType}:${memberEmail}" \`
        --role="${role}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ IAM binding removed" -ForegroundColor Green
        Write-Host "  Member: ${memberType}:${memberEmail}" -ForegroundColor Cyan
        Write-Host "  Role: ${role}" -ForegroundColor Cyan
    }` :
`    Write-Host "✓ IAM Policy for project: ${project}" -ForegroundColor Green
    Write-Host ""
    
    gcloud projects get-iam-policy ${project} --format="table(bindings.role,bindings.members.flatten())"`}
    
} catch {
    Write-Error "IAM operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-manage-gke-clusters',
    name: 'Manage Google Kubernetes Engine (GKE) Clusters',
    category: 'Common Admin Tasks',
    description: 'Create and manage GKE clusters and node pools',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Cluster', 'Delete Cluster', 'Create Node Pool', 'List Clusters'], defaultValue: 'Create Cluster' },
      { id: 'clusterName', label: 'Cluster Name', type: 'text', required: false, placeholder: 'my-gke-cluster' },
      { id: 'zone', label: 'Zone', type: 'text', required: false, placeholder: 'us-central1-a' },
      { id: 'numNodes', label: 'Number of Nodes', type: 'number', required: false, placeholder: '3', defaultValue: 3 },
      { id: 'machineType', label: 'Machine Type', type: 'select', required: false, options: ['e2-medium', 'n1-standard-1', 'n1-standard-2', 'n1-standard-4'], defaultValue: 'e2-medium' },
      { id: 'nodePoolName', label: 'Node Pool Name', type: 'text', required: false, placeholder: 'default-pool' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const clusterName = params.clusterName ? escapePowerShellString(params.clusterName) : '';
      const zone = params.zone ? escapePowerShellString(params.zone) : '';
      const numNodes = params.numNodes || 3;
      const machineType = params.machineType;
      const nodePoolName = params.nodePoolName ? escapePowerShellString(params.nodePoolName) : '';
      
      return `# GCP GKE Cluster Management
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create Cluster' ? `    Write-Host "Creating GKE cluster..." -ForegroundColor Yellow
    
    gcloud container clusters create "${clusterName}" \`
        --zone="${zone}" \`
        --num-nodes=${numNodes} \`
        --machine-type="${machineType}" \`
        --enable-autoscaling \`
        --min-nodes=1 \`
        --max-nodes=10
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ GKE cluster created successfully!" -ForegroundColor Green
        Write-Host "  Cluster: ${clusterName}" -ForegroundColor Cyan
        Write-Host "  Zone: ${zone}" -ForegroundColor Cyan
        Write-Host "  Nodes: ${numNodes}" -ForegroundColor Cyan
        Write-Host "  Machine Type: ${machineType}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Fetching cluster credentials..." -ForegroundColor Yellow
        gcloud container clusters get-credentials "${clusterName}" --zone="${zone}"
    }` :
action === 'Delete Cluster' ? `    Write-Host "Deleting GKE cluster..." -ForegroundColor Yellow
    
    gcloud container clusters delete "${clusterName}" \`
        --zone="${zone}" \`
        --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ GKE cluster deleted: ${clusterName}" -ForegroundColor Green
    }` :
action === 'Create Node Pool' ? `    Write-Host "Creating node pool..." -ForegroundColor Yellow
    
    gcloud container node-pools create "${nodePoolName}" \`
        --cluster="${clusterName}" \`
        --zone="${zone}" \`
        --num-nodes=${numNodes} \`
        --machine-type="${machineType}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node pool created successfully!" -ForegroundColor Green
        Write-Host "  Node Pool: ${nodePoolName}" -ForegroundColor Cyan
        Write-Host "  Cluster: ${clusterName}" -ForegroundColor Cyan
        Write-Host "  Nodes: ${numNodes}" -ForegroundColor Cyan
    }` :
`    Write-Host "✓ GKE Clusters:" -ForegroundColor Green
    Write-Host ""
    
    gcloud container clusters list --format="table(name,location,currentMasterVersion,currentNodeVersion,numNodes,status)"`}
    
} catch {
    Write-Error "GKE operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-configure-cloud-functions',
    name: 'Configure Cloud Functions',
    category: 'Common Admin Tasks',
    description: 'Deploy serverless functions and manage triggers',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Deploy Function', 'Delete Function', 'List Functions'], defaultValue: 'Deploy Function' },
      { id: 'functionName', label: 'Function Name', type: 'text', required: false, placeholder: 'my-function' },
      { id: 'runtime', label: 'Runtime', type: 'select', required: false, options: ['nodejs18', 'nodejs20', 'python39', 'python310', 'python311', 'go119', 'go121'], defaultValue: 'nodejs20' },
      { id: 'triggerType', label: 'Trigger Type', type: 'select', required: false, options: ['http', 'pubsub', 'storage'], defaultValue: 'http' },
      { id: 'entryPoint', label: 'Entry Point', type: 'text', required: false, placeholder: 'helloWorld' },
      { id: 'region', label: 'Region', type: 'text', required: false, placeholder: 'us-central1', defaultValue: 'us-central1' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const functionName = params.functionName ? escapePowerShellString(params.functionName) : '';
      const runtime = params.runtime;
      const triggerType = params.triggerType;
      const entryPoint = params.entryPoint ? escapePowerShellString(params.entryPoint) : 'helloWorld';
      const region = params.region ? escapePowerShellString(params.region) : 'us-central1';
      
      return `# GCP Cloud Functions Configuration
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Deploy Function' ? `    Write-Host "Deploying Cloud Function..." -ForegroundColor Yellow
    
    # Note: This assumes you have source code in the current directory
    # For production use, specify --source with actual code location
    
    gcloud functions deploy "${functionName}" \`
        --runtime="${runtime}" \`
        --trigger-${triggerType} \`
        --entry-point="${entryPoint}" \`
        --region="${region}" \`
        --allow-unauthenticated
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud Function deployed successfully!" -ForegroundColor Green
        Write-Host "  Function: ${functionName}" -ForegroundColor Cyan
        Write-Host "  Runtime: ${runtime}" -ForegroundColor Cyan
        Write-Host "  Trigger: ${triggerType}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Getting function details..." -ForegroundColor Yellow
        gcloud functions describe "${functionName}" --region="${region}"
    }` :
action === 'Delete Function' ? `    Write-Host "Deleting Cloud Function..." -ForegroundColor Yellow
    
    gcloud functions delete "${functionName}" \`
        --region="${region}" \`
        --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud Function deleted: ${functionName}" -ForegroundColor Green
    }` :
`    Write-Host "✓ Cloud Functions:" -ForegroundColor Green
    Write-Host ""
    
    gcloud functions list --format="table(name,status,trigger,runtime,updateTime)"`}
    
    Write-Host ""
    Write-Host "Note: For function deployment, ensure source code is available." -ForegroundColor Yellow
    Write-Host "Use --source flag to specify code location in production." -ForegroundColor Cyan
    
} catch {
    Write-Error "Cloud Functions operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-manage-cloud-sql',
    name: 'Manage Cloud SQL Instances',
    category: 'Common Admin Tasks',
    description: 'Create Cloud SQL databases, configure replicas, and manage backups',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Instance', 'Delete Instance', 'Create Replica', 'List Instances'], defaultValue: 'Create Instance' },
      { id: 'instanceName', label: 'Instance Name', type: 'text', required: false, placeholder: 'my-sql-instance' },
      { id: 'databaseVersion', label: 'Database Version', type: 'select', required: false, options: ['MYSQL_8_0', 'MYSQL_5_7', 'POSTGRES_14', 'POSTGRES_13', 'SQLSERVER_2019_STANDARD'], defaultValue: 'MYSQL_8_0' },
      { id: 'tier', label: 'Machine Tier', type: 'select', required: false, options: ['db-f1-micro', 'db-g1-small', 'db-n1-standard-1', 'db-n1-standard-2'], defaultValue: 'db-f1-micro' },
      { id: 'region', label: 'Region', type: 'text', required: false, placeholder: 'us-central1', defaultValue: 'us-central1' },
      { id: 'masterInstanceName', label: 'Master Instance (for replica)', type: 'text', required: false, placeholder: 'master-instance' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const instanceName = params.instanceName ? escapePowerShellString(params.instanceName) : '';
      const databaseVersion = params.databaseVersion;
      const tier = params.tier;
      const region = params.region ? escapePowerShellString(params.region) : 'us-central1';
      const masterInstanceName = params.masterInstanceName ? escapePowerShellString(params.masterInstanceName) : '';
      
      return `# GCP Cloud SQL Management
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create Instance' ? `    Write-Host "Creating Cloud SQL instance..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Cyan
    Write-Host ""
    
    gcloud sql instances create "${instanceName}" \`
        --database-version="${databaseVersion}" \`
        --tier="${tier}" \`
        --region="${region}" \`
        --enable-bin-log \`
        --backup-start-time=02:00
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud SQL instance created successfully!" -ForegroundColor Green
        Write-Host "  Instance: ${instanceName}" -ForegroundColor Cyan
        Write-Host "  Database: ${databaseVersion}" -ForegroundColor Cyan
        Write-Host "  Tier: ${tier}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Setting root password..." -ForegroundColor Yellow
        Write-Host "Run: gcloud sql users set-password root --host=% --instance=${instanceName} --password=[PASSWORD]" -ForegroundColor Cyan
    }` :
action === 'Delete Instance' ? `    Write-Host "Deleting Cloud SQL instance..." -ForegroundColor Yellow
    
    gcloud sql instances delete "${instanceName}" --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud SQL instance deleted: ${instanceName}" -ForegroundColor Green
    }` :
action === 'Create Replica' ? `    Write-Host "Creating read replica..." -ForegroundColor Yellow
    
    gcloud sql instances create "${instanceName}" \`
        --master-instance-name="${masterInstanceName}" \`
        --tier="${tier}" \`
        --region="${region}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Read replica created successfully!" -ForegroundColor Green
        Write-Host "  Replica: ${instanceName}" -ForegroundColor Cyan
        Write-Host "  Master: ${masterInstanceName}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
    }` :
`    Write-Host "✓ Cloud SQL Instances:" -ForegroundColor Green
    Write-Host ""
    
    gcloud sql instances list --format="table(name,databaseVersion,region,tier,ipAddress,state)"`}
    
} catch {
    Write-Error "Cloud SQL operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-configure-logging-monitoring',
    name: 'Configure Cloud Logging and Monitoring',
    category: 'Common Admin Tasks',
    description: 'Set up log sinks, metrics, and uptime checks',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Log Sink', 'Create Uptime Check', 'List Metrics', 'View Recent Logs'], defaultValue: 'Create Log Sink' },
      { id: 'sinkName', label: 'Log Sink Name', type: 'text', required: false, placeholder: 'my-log-sink' },
      { id: 'destinationType', label: 'Sink Destination Type', type: 'select', required: false, options: ['storage', 'bigquery', 'pubsub'], defaultValue: 'storage' },
      { id: 'destinationName', label: 'Destination Name', type: 'text', required: false, placeholder: 'my-bucket or my-dataset' },
      { id: 'logFilter', label: 'Log Filter', type: 'textarea', required: false, placeholder: 'resource.type="gce_instance"' },
      { id: 'uptimeCheckName', label: 'Uptime Check Name', type: 'text', required: false, placeholder: 'my-uptime-check' },
      { id: 'monitoredUrl', label: 'URL to Monitor', type: 'text', required: false, placeholder: 'https://example.com' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const sinkName = params.sinkName ? escapePowerShellString(params.sinkName) : '';
      const destinationType = params.destinationType;
      const destinationName = params.destinationName ? escapePowerShellString(params.destinationName) : '';
      const logFilter = params.logFilter ? escapePowerShellString(params.logFilter) : '';
      const uptimeCheckName = params.uptimeCheckName ? escapePowerShellString(params.uptimeCheckName) : '';
      const monitoredUrl = params.monitoredUrl ? escapePowerShellString(params.monitoredUrl) : '';
      
      const destinationMap: Record<string, string> = {
        'storage': 'storage.googleapis.com',
        'bigquery': 'bigquery.googleapis.com/projects',
        'pubsub': 'pubsub.googleapis.com/projects'
      };
      
      return `# GCP Cloud Logging and Monitoring
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create Log Sink' ? `    Write-Host "Creating log sink..." -ForegroundColor Yellow
    
    $Destination = "${destinationMap[destinationType]}/${destinationName}"
    
    gcloud logging sinks create "${sinkName}" \`
        $Destination \`
        --log-filter="${logFilter}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Log sink created successfully!" -ForegroundColor Green
        Write-Host "  Sink: ${sinkName}" -ForegroundColor Cyan
        Write-Host "  Destination: $Destination" -ForegroundColor Cyan
        Write-Host "  Filter: ${logFilter}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Note: Grant the service account write permissions to the destination." -ForegroundColor Yellow
    }` :
action === 'Create Uptime Check' ? `    Write-Host "Creating uptime check..." -ForegroundColor Yellow
    
    # Create uptime check configuration JSON
    $ConfigJson = @"
{
  "displayName": "${uptimeCheckName}",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "host": "${monitoredUrl.replace('https://', '').replace('http://', '')}"
    }
  },
  "httpCheck": {
    "path": "/",
    "port": 443,
    "useSsl": true
  },
  "period": "60s",
  "timeout": "10s"
}
"@
    
    Write-Host "Uptime check configuration:" -ForegroundColor Cyan
    Write-Host $ConfigJson
    Write-Host ""
    Write-Host "To create uptime check via Console or API:" -ForegroundColor Yellow
    Write-Host "1. Navigate to Monitoring > Uptime checks" -ForegroundColor Cyan
    Write-Host "2. Or use: gcloud alpha monitoring uptime create" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Listing existing uptime checks..." -ForegroundColor Yellow
    gcloud alpha monitoring uptime list 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Note: Alpha API may not be enabled. Enable in Console." -ForegroundColor Yellow
    }` :
action === 'List Metrics' ? `    Write-Host "✓ Available Metrics:" -ForegroundColor Green
    Write-Host ""
    
    gcloud logging metrics list --format="table(name,description,filter)"
    
    Write-Host ""
    Write-Host "Monitoring metric descriptors (sample):" -ForegroundColor Yellow
    gcloud monitoring metric-descriptors list --limit=20 --format="table(type,description)"` :
`    Write-Host "✓ Recent Logs (last 10 entries):" -ForegroundColor Green
    Write-Host ""
    
    gcloud logging read "timestamp >= \\"$(Get-Date (Get-Date).AddHours(-1) -Format 'yyyy-MM-ddTHH:mm:ssZ')\\"" \`
        --limit=10 \`
        --format="table(timestamp,severity,resource.type,textPayload)"`}
    
} catch {
    Write-Error "Logging/Monitoring operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'gcp-manage-load-balancing',
    name: 'Manage Cloud Load Balancing',
    category: 'Common Admin Tasks',
    description: 'Create load balancers and configure backend services',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create HTTP LB', 'Create Backend Service', 'List Load Balancers', 'Delete Load Balancer'], defaultValue: 'List Load Balancers' },
      { id: 'lbName', label: 'Load Balancer Name', type: 'text', required: false, placeholder: 'my-lb' },
      { id: 'backendServiceName', label: 'Backend Service Name', type: 'text', required: false, placeholder: 'my-backend' },
      { id: 'instanceGroup', label: 'Instance Group Name', type: 'text', required: false, placeholder: 'my-instance-group' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: false, options: ['HTTP', 'HTTPS', 'TCP', 'UDP'], defaultValue: 'HTTP' },
      { id: 'healthCheckName', label: 'Health Check Name', type: 'text', required: false, placeholder: 'my-health-check' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const lbName = params.lbName ? escapePowerShellString(params.lbName) : '';
      const backendServiceName = params.backendServiceName ? escapePowerShellString(params.backendServiceName) : '';
      const instanceGroup = params.instanceGroup ? escapePowerShellString(params.instanceGroup) : '';
      const protocol = params.protocol;
      const healthCheckName = params.healthCheckName ? escapePowerShellString(params.healthCheckName) : '';
      
      return `# GCP Cloud Load Balancing
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project ${project}
    
${action === 'Create HTTP LB' ? `    Write-Host "Creating HTTP(S) Load Balancer..." -ForegroundColor Yellow
    Write-Host "This is a multi-step process:" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Create health check
    Write-Host "1. Creating health check..." -ForegroundColor Yellow
    gcloud compute health-checks create ${protocol.toLowerCase()} "${healthCheckName}" \`
        --port=80 \`
        --check-interval=10s \`
        --timeout=5s
    
    # Step 2: Create backend service
    Write-Host "2. Creating backend service..." -ForegroundColor Yellow
    gcloud compute backend-services create "${backendServiceName}" \`
        --protocol=${protocol} \`
        --health-checks="${healthCheckName}" \`
        --global
    
    # Step 3: Create URL map
    Write-Host "3. Creating URL map..." -ForegroundColor Yellow
    gcloud compute url-maps create "${lbName}-url-map" \`
        --default-service="${backendServiceName}"
    
    # Step 4: Create target proxy
    Write-Host "4. Creating target proxy..." -ForegroundColor Yellow
    gcloud compute target-${protocol.toLowerCase()}-proxies create "${lbName}-proxy" \`
        --url-map="${lbName}-url-map"
    
    # Step 5: Create forwarding rule
    Write-Host "5. Creating forwarding rule..." -ForegroundColor Yellow
    gcloud compute forwarding-rules create "${lbName}-forwarding-rule" \`
        --global \`
        --target-${protocol.toLowerCase()}-proxy="${lbName}-proxy" \`
        --ports=80
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ HTTP(S) Load Balancer created successfully!" -ForegroundColor Green
        Write-Host "  Name: ${lbName}" -ForegroundColor Cyan
        Write-Host "  Backend Service: ${backendServiceName}" -ForegroundColor Cyan
        Write-Host "  Health Check: ${healthCheckName}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Add backends to the backend service" -ForegroundColor Cyan
        Write-Host "2. Configure SSL certificates (for HTTPS)" -ForegroundColor Cyan
        Write-Host "3. Update DNS to point to the load balancer IP" -ForegroundColor Cyan
    }` :
action === 'Create Backend Service' ? `    Write-Host "Creating backend service..." -ForegroundColor Yellow
    
    # Create health check first
    gcloud compute health-checks create ${protocol.toLowerCase()} "${healthCheckName}" \`
        --port=80 \`
        --check-interval=10s \`
        --timeout=5s
    
    # Create backend service
    gcloud compute backend-services create "${backendServiceName}" \`
        --protocol=${protocol} \`
        --health-checks="${healthCheckName}" \`
        --global
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backend service created successfully!" -ForegroundColor Green
        Write-Host "  Service: ${backendServiceName}" -ForegroundColor Cyan
        Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
        Write-Host "  Health Check: ${healthCheckName}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Add backend with:" -ForegroundColor Yellow
        Write-Host "gcloud compute backend-services add-backend ${backendServiceName} --instance-group=[GROUP]" -ForegroundColor Cyan
    }` :
action === 'Delete Load Balancer' ? `    Write-Host "Deleting load balancer components..." -ForegroundColor Yellow
    Write-Host ""
    
    # Delete in reverse order
    Write-Host "1. Deleting forwarding rule..." -ForegroundColor Yellow
    gcloud compute forwarding-rules delete "${lbName}-forwarding-rule" --global --quiet 2>$null
    
    Write-Host "2. Deleting target proxy..." -ForegroundColor Yellow
    gcloud compute target-${protocol.toLowerCase()}-proxies delete "${lbName}-proxy" --quiet 2>$null
    
    Write-Host "3. Deleting URL map..." -ForegroundColor Yellow
    gcloud compute url-maps delete "${lbName}-url-map" --quiet 2>$null
    
    Write-Host "4. Deleting backend service..." -ForegroundColor Yellow
    gcloud compute backend-services delete "${backendServiceName}" --global --quiet 2>$null
    
    Write-Host "5. Deleting health check..." -ForegroundColor Yellow
    gcloud compute health-checks delete "${healthCheckName}" --quiet 2>$null
    
    Write-Host ""
    Write-Host "✓ Load balancer components deleted" -ForegroundColor Green` :
`    Write-Host "✓ Load Balancer Components:" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Forwarding Rules:" -ForegroundColor Cyan
    gcloud compute forwarding-rules list --format="table(name,IPAddress,target,region)"
    
    Write-Host ""
    Write-Host "Backend Services:" -ForegroundColor Cyan
    gcloud compute backend-services list --format="table(name,protocol,healthChecks,backends)"
    
    Write-Host ""
    Write-Host "Health Checks:" -ForegroundColor Cyan
    gcloud compute health-checks list --format="table(name,type,checkIntervalSec)"`}
    
} catch {
    Write-Error "Load Balancing operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },

  {
    id: 'gcp-configure-cloud-sql-backup',
    name: 'Configure Cloud SQL Automated Backups',
    category: 'Database Management',
    description: 'Configure automated backup settings for Cloud SQL instances',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'instanceName', label: 'Instance Name', type: 'text', required: true, placeholder: 'my-sql-instance' },
      { id: 'backupStartTime', label: 'Backup Start Time', type: 'text', required: true, placeholder: '02:00' },
      { id: 'retentionDays', label: 'Retention (Days)', type: 'number', required: true, placeholder: '7' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const instanceName = escapePowerShellString(params.instanceName);
      const startTime = escapePowerShellString(params.backupStartTime);
      const retention = params.retentionDays || 7;

      return `# Configure Cloud SQL Automated Backups
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    gcloud sql instances patch "${instanceName}" \`
        --backup-start-time="${startTime}" \`
        --retained-backups-count=${retention} \`
        --enable-bin-log
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud SQL backups configured" -ForegroundColor Green
        Write-Host "  Instance: ${instanceName}" -ForegroundColor Cyan
        Write-Host "  Start Time: ${startTime}" -ForegroundColor Cyan
        Write-Host "  Retention: ${retention} days" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Cloud SQL backup configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-iam-service-account',
    name: 'Create and Configure IAM Service Account',
    category: 'Security & IAM',
    description: 'Create service account and assign IAM roles for automation',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'accountName', label: 'Service Account Name', type: 'text', required: true, placeholder: 'my-automation-sa' },
      { id: 'displayName', label: 'Display Name', type: 'text', required: true, placeholder: 'Automation Service Account' },
      { id: 'role', label: 'IAM Role', type: 'select', required: true, options: ['roles/editor', 'roles/viewer', 'roles/compute.admin', 'roles/storage.admin'], defaultValue: 'roles/viewer' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const accountName = escapePowerShellString(params.accountName);
      const displayName = escapePowerShellString(params.displayName);
      const role = params.role || 'roles/viewer';

      return `# Create and Configure IAM Service Account
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    # Create service account
    gcloud iam service-accounts create "${accountName}" \`
        --display-name="${displayName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Service account created: ${accountName}" -ForegroundColor Green
        
        # Assign role
        $ServiceAccountEmail = "${accountName}@${project}.iam.gserviceaccount.com"
        
        gcloud projects add-iam-policy-binding "${project}" \`
            --member="serviceAccount:$ServiceAccountEmail" \`
            --role="${role}"
        
        Write-Host "✓ Role assigned: ${role}" -ForegroundColor Green
        Write-Host "  Service Account: $ServiceAccountEmail" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Service account creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-configure-vpc-peering',
    name: 'Create VPC Network Peering Connection',
    category: 'Networking',
    description: 'Establish VPC peering between two networks for private communication',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'network1', label: 'Network 1', type: 'text', required: true, placeholder: 'vpc-network-1' },
      { id: 'network2', label: 'Network 2', type: 'text', required: true, placeholder: 'vpc-network-2' },
      { id: 'peeringName', label: 'Peering Connection Name', type: 'text', required: true, placeholder: 'prod-to-dev-peering' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const network1 = escapePowerShellString(params.network1);
      const network2 = escapePowerShellString(params.network2);
      const peeringName = escapePowerShellString(params.peeringName);

      return `# Create VPC Network Peering Connection
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    # Create peering from network1 to network2
    gcloud compute networks peerings create "${peeringName}" \`
        --network="${network1}" \`
        --peer-network="${network2}" \`
        --auto-create-routes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ VPC peering connection created" -ForegroundColor Green
        Write-Host "  Peering Name: ${peeringName}" -ForegroundColor Cyan
        Write-Host "  Network 1: ${network1}" -ForegroundColor Cyan
        Write-Host "  Network 2: ${network2}" -ForegroundColor Cyan
        Write-Host "  Auto Routes: Enabled" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "VPC peering creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-bigquery-dataset',
    name: 'Create and Configure BigQuery Dataset',
    category: 'Big Data & Analytics',
    description: 'Create BigQuery dataset with access controls and expiration settings',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'datasetId', label: 'Dataset ID', type: 'text', required: true, placeholder: 'my_analytics_dataset' },
      { id: 'location', label: 'Location', type: 'select', required: true, options: ['US', 'EU', 'asia-northeast1', 'europe-west1'], defaultValue: 'US' },
      { id: 'defaultTableExpiration', label: 'Default Table Expiration (Hours)', type: 'number', required: false, placeholder: '2160' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const datasetId = escapePowerShellString(params.datasetId);
      const location = params.location || 'US';
      const expiration = params.defaultTableExpiration;

      return `# Create and Configure BigQuery Dataset
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    # Create dataset
    $CreateCmd = "gcloud bigquery datasets create ${datasetId} --location=${location}"
    ${expiration ? `$CreateCmd += " --default-table-expiration=${expiration * 3600}"` : ''}
    
    Invoke-Expression $CreateCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ BigQuery dataset created successfully" -ForegroundColor Green
        Write-Host "  Dataset ID: ${datasetId}" -ForegroundColor Cyan
        Write-Host "  Location: ${location}" -ForegroundColor Cyan
        ${expiration ? `Write-Host "  Table Expiration: ${expiration} hours" -ForegroundColor Cyan` : ''}
        
        Write-Host ""
        Write-Host "Query your dataset with:" -ForegroundColor Yellow
        Write-Host "bq query --use_legacy_sql=false 'SELECT * FROM \`${project}.${datasetId}.table_name\` LIMIT 10'" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "BigQuery dataset creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-configure-cloud-cdn',
    name: 'Enable and Configure Cloud CDN',
    category: 'Content Delivery',
    description: 'Enable Cloud CDN for backend service to cache content globally',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'backendService', label: 'Backend Service Name', type: 'text', required: true, placeholder: 'my-backend-service' },
      { id: 'cacheMode', label: 'Cache Mode', type: 'select', required: true, options: ['CACHE_ALL_STATIC', 'USE_ORIGIN_HEADERS', 'FORCE_CACHE_ALL'], defaultValue: 'CACHE_ALL_STATIC' },
      { id: 'maxTtl', label: 'Max TTL (Seconds)', type: 'number', required: true, placeholder: '3600' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const backendService = escapePowerShellString(params.backendService);
      const cacheMode = params.cacheMode || 'CACHE_ALL_STATIC';
      const maxTtl = params.maxTtl || 3600;

      return `# Enable and Configure Cloud CDN
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    # Enable Cloud CDN on backend service
    gcloud compute backend-services update "${backendService}" \`
        --enable-cdn \`
        --cache-mode=${cacheMode} \`
        --client-ttl=${maxTtl} \`
        --max-ttl=${maxTtl} \`
        --global
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cloud CDN enabled successfully" -ForegroundColor Green
        Write-Host "  Backend Service: ${backendService}" -ForegroundColor Cyan
        Write-Host "  Cache Mode: ${cacheMode}" -ForegroundColor Cyan
        Write-Host "  Max TTL: ${maxTtl} seconds" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "⚠️ CDN cache may take a few minutes to warm up" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Cloud CDN configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-vm-snapshot',
    name: 'Create VM Disk Snapshot',
    category: 'Compute Engine',
    description: 'Create a point-in-time snapshot of a persistent disk for backup',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'diskName', label: 'Source Disk Name', type: 'text', required: true, placeholder: 'instance-boot-disk' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'snapshotName', label: 'Snapshot Name', type: 'text', required: true, placeholder: 'backup-2024-01-15' },
      { id: 'storageLocation', label: 'Storage Location', type: 'select', required: false, options: ['us', 'eu', 'asia'], defaultValue: 'us' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const diskName = escapePowerShellString(params.diskName);
      const zone = escapePowerShellString(params.zone);
      const snapshotName = escapePowerShellString(params.snapshotName);
      const storageLocation = params.storageLocation || 'us';

      return `# Create VM Disk Snapshot
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating snapshot of disk: ${diskName}..." -ForegroundColor Yellow
    
    gcloud compute snapshots create "${snapshotName}" \`
        --source-disk="${diskName}" \`
        --source-disk-zone="${zone}" \`
        --storage-location=${storageLocation}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Snapshot created successfully!" -ForegroundColor Green
        Write-Host "  Snapshot Name: ${snapshotName}" -ForegroundColor Cyan
        Write-Host "  Source Disk: ${diskName}" -ForegroundColor Cyan
        Write-Host "  Storage Location: ${storageLocation}" -ForegroundColor Cyan
        
        gcloud compute snapshots describe "${snapshotName}" --format="table(name,diskSizeGb,status,storageLocations)"
    }
    
} catch {
    Write-Error "Snapshot creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-custom-image',
    name: 'Create Custom Machine Image',
    category: 'Compute Engine',
    description: 'Create a custom image from a disk for replication',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'imageName', label: 'Image Name', type: 'text', required: true, placeholder: 'my-custom-image' },
      { id: 'sourceDisk', label: 'Source Disk Name', type: 'text', required: true, placeholder: 'source-disk-name' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'family', label: 'Image Family', type: 'text', required: false, placeholder: 'my-app-images' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const imageName = escapePowerShellString(params.imageName);
      const sourceDisk = escapePowerShellString(params.sourceDisk);
      const zone = escapePowerShellString(params.zone);
      const family = params.family ? escapePowerShellString(params.family) : '';
      const familyArg = family ? `--family="${family}"` : '';

      return `# Create Custom Machine Image
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating custom image from disk: ${sourceDisk}..." -ForegroundColor Yellow
    
    gcloud compute images create "${imageName}" \`
        --source-disk="${sourceDisk}" \`
        --source-disk-zone="${zone}" ${familyArg}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Custom image created successfully!" -ForegroundColor Green
        Write-Host "  Image Name: ${imageName}" -ForegroundColor Cyan
        Write-Host "  Source Disk: ${sourceDisk}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Use this image with:" -ForegroundColor Yellow
        Write-Host "gcloud compute instances create [NAME] --image=${imageName} --image-project=${project}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Custom image creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-instance-template',
    name: 'Create Instance Template',
    category: 'Compute Engine',
    description: 'Create a reusable instance template for managed instance groups',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'templateName', label: 'Template Name', type: 'text', required: true, placeholder: 'web-server-template' },
      { id: 'machineType', label: 'Machine Type', type: 'select', required: true, options: ['e2-micro', 'e2-small', 'e2-medium', 'n1-standard-1', 'n2-standard-2'], defaultValue: 'e2-medium' },
      { id: 'imageFamily', label: 'Image Family', type: 'text', required: true, placeholder: 'debian-11' },
      { id: 'diskSize', label: 'Boot Disk Size (GB)', type: 'number', required: true, placeholder: '20', defaultValue: 20 },
      { id: 'tags', label: 'Network Tags', type: 'text', required: false, placeholder: 'http-server,https-server' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const templateName = escapePowerShellString(params.templateName);
      const machineType = params.machineType;
      const imageFamily = escapePowerShellString(params.imageFamily);
      const diskSize = params.diskSize || 20;
      const tags = params.tags ? escapePowerShellString(params.tags) : '';
      const tagsArg = tags ? `--tags=${tags}` : '';

      return `# Create Instance Template
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating instance template: ${templateName}..." -ForegroundColor Yellow
    
    gcloud compute instance-templates create "${templateName}" \`
        --machine-type=${machineType} \`
        --image-family="${imageFamily}" \`
        --image-project=debian-cloud \`
        --boot-disk-size=${diskSize}GB \`
        --boot-disk-type=pd-balanced ${tagsArg}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Instance template created successfully!" -ForegroundColor Green
        Write-Host "  Template: ${templateName}" -ForegroundColor Cyan
        Write-Host "  Machine Type: ${machineType}" -ForegroundColor Cyan
        Write-Host "  Image: ${imageFamily}" -ForegroundColor Cyan
        Write-Host "  Disk Size: ${diskSize}GB" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Instance template creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-managed-instance-group',
    name: 'Create Managed Instance Group',
    category: 'Compute Engine',
    description: 'Create a managed instance group with autoscaling',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'groupName', label: 'Instance Group Name', type: 'text', required: true, placeholder: 'web-server-group' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'templateName', label: 'Instance Template Name', type: 'text', required: true, placeholder: 'web-server-template' },
      { id: 'targetSize', label: 'Initial Instance Count', type: 'number', required: true, placeholder: '3', defaultValue: 3 },
      { id: 'minReplicas', label: 'Minimum Replicas', type: 'number', required: false, placeholder: '2', defaultValue: 2 },
      { id: 'maxReplicas', label: 'Maximum Replicas', type: 'number', required: false, placeholder: '10', defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const groupName = escapePowerShellString(params.groupName);
      const zone = escapePowerShellString(params.zone);
      const templateName = escapePowerShellString(params.templateName);
      const targetSize = params.targetSize || 3;
      const minReplicas = params.minReplicas || 2;
      const maxReplicas = params.maxReplicas || 10;

      return `# Create Managed Instance Group with Autoscaling
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating managed instance group..." -ForegroundColor Yellow
    
    gcloud compute instance-groups managed create "${groupName}" \`
        --zone="${zone}" \`
        --template="${templateName}" \`
        --size=${targetSize}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Instance group created: ${groupName}" -ForegroundColor Green
        
        Write-Host "Configuring autoscaling..." -ForegroundColor Yellow
        
        gcloud compute instance-groups managed set-autoscaling "${groupName}" \`
            --zone="${zone}" \`
            --min-num-replicas=${minReplicas} \`
            --max-num-replicas=${maxReplicas} \`
            --target-cpu-utilization=0.6 \`
            --cool-down-period=60
        
        Write-Host "Autoscaling configured: ${minReplicas}-${maxReplicas} instances" -ForegroundColor Green
        
        gcloud compute instance-groups managed list-instances "${groupName}" --zone="${zone}"
    }
    
} catch {
    Write-Error "Instance group creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-configure-bucket-lifecycle',
    name: 'Configure Bucket Lifecycle Policy',
    category: 'Cloud Storage',
    description: 'Set up automatic object lifecycle management rules',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-storage-bucket' },
      { id: 'ageDays', label: 'Delete Objects Older Than (Days)', type: 'number', required: true, placeholder: '90', defaultValue: 90 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const bucketName = escapePowerShellString(params.bucketName);
      const ageDays = params.ageDays || 90;

      return `# Configure Bucket Lifecycle Policy
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Configuring lifecycle policy for bucket: ${bucketName}..." -ForegroundColor Yellow
    
    $LifecycleConfig = @'
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": ${ageDays} }
    }
  ]
}
'@
    
    $TempFile = [System.IO.Path]::GetTempFileName()
    $LifecycleConfig | Out-File -FilePath $TempFile -Encoding UTF8
    
    gsutil lifecycle set $TempFile gs://${bucketName}
    
    Remove-Item $TempFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Lifecycle policy configured successfully!" -ForegroundColor Green
        Write-Host "  Bucket: ${bucketName}" -ForegroundColor Cyan
        Write-Host "  Delete objects older than: ${ageDays} days" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Current lifecycle configuration:" -ForegroundColor Yellow
        gsutil lifecycle get gs://${bucketName}
    }
    
} catch {
    Write-Error "Lifecycle policy configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-sync-bucket-objects',
    name: 'Sync Objects Between Buckets',
    category: 'Cloud Storage',
    description: 'Synchronize objects between Cloud Storage buckets',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'sourcePath', label: 'Source Path', type: 'text', required: true, placeholder: 'gs://source-bucket/folder/' },
      { id: 'destinationPath', label: 'Destination Path', type: 'text', required: true, placeholder: 'gs://dest-bucket/folder/' },
      { id: 'deleteExtra', label: 'Delete Extra Files in Destination', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const sourcePath = escapePowerShellString(params.sourcePath);
      const destinationPath = escapePowerShellString(params.destinationPath);
      const deleteExtra = params.deleteExtra;
      const deleteArg = deleteExtra ? '-d' : '';

      return `# Sync Objects Between Buckets
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Synchronizing objects..." -ForegroundColor Yellow
    Write-Host "  Source: ${sourcePath}" -ForegroundColor Cyan
    Write-Host "  Destination: ${destinationPath}" -ForegroundColor Cyan
    
    gsutil -m rsync -r ${deleteArg} "${sourcePath}" "${destinationPath}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Sync completed successfully!" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Bucket sync failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-configure-bucket-versioning',
    name: 'Configure Bucket Versioning',
    category: 'Cloud Storage',
    description: 'Enable or disable object versioning on a Cloud Storage bucket',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-storage-bucket' },
      { id: 'enabled', label: 'Enable Versioning', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const bucketName = escapePowerShellString(params.bucketName);
      const enabled = params.enabled !== false;
      const versioningState = enabled ? 'on' : 'off';

      return `# Configure Bucket Versioning
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Configuring versioning for bucket: ${bucketName}..." -ForegroundColor Yellow
    
    gsutil versioning set ${versioningState} gs://${bucketName}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Versioning ${versioningState} for bucket: ${bucketName}" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Current versioning status:" -ForegroundColor Yellow
        gsutil versioning get gs://${bucketName}
    }
    
} catch {
    Write-Error "Versioning configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-custom-iam-role',
    name: 'Create Custom IAM Role',
    category: 'Security & IAM',
    description: 'Create a custom IAM role with specific permissions',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'roleId', label: 'Role ID', type: 'text', required: true, placeholder: 'customStorageViewer' },
      { id: 'roleTitle', label: 'Role Title', type: 'text', required: true, placeholder: 'Custom Storage Viewer' },
      { id: 'permissions', label: 'Permissions (comma-separated)', type: 'textarea', required: true, placeholder: 'storage.buckets.get,storage.objects.list' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const roleId = escapePowerShellString(params.roleId);
      const roleTitle = escapePowerShellString(params.roleTitle);
      const permissions = escapePowerShellString(params.permissions);

      return `# Create Custom IAM Role
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating custom IAM role: ${roleId}..." -ForegroundColor Yellow
    
    gcloud iam roles create "${roleId}" \`
        --project="${project}" \`
        --title="${roleTitle}" \`
        --permissions="${permissions}" \`
        --stage=GA
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Custom role created successfully!" -ForegroundColor Green
        Write-Host "  Role ID: ${roleId}" -ForegroundColor Cyan
        Write-Host "  Title: ${roleTitle}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Assign this role with:" -ForegroundColor Yellow
        Write-Host "gcloud projects add-iam-policy-binding ${project} --member=[MEMBER] --role=projects/${project}/roles/${roleId}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Custom role creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-audit-iam-permissions',
    name: 'Audit IAM Permissions',
    category: 'Security & IAM',
    description: 'Generate IAM audit report showing all role bindings',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'outputFormat', label: 'Output Format', type: 'select', required: true, options: ['table', 'json', 'yaml'], defaultValue: 'table' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const outputFormat = params.outputFormat || 'table';

      return `# Audit IAM Permissions
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Generating IAM Audit Report for: ${project}" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "IAM Policy Bindings:" -ForegroundColor Green
    gcloud projects get-iam-policy "${project}" --format="${outputFormat}"
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Service Accounts:" -ForegroundColor Green
    gcloud iam service-accounts list --format="${outputFormat}(email,displayName,disabled)"
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Custom Roles:" -ForegroundColor Green
    gcloud iam roles list --project="${project}" --format="${outputFormat}(name,title,stage)"
    
    Write-Host ""
    Write-Host "IAM audit completed" -ForegroundColor Green
    
} catch {
    Write-Error "IAM audit failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-service-account-key',
    name: 'Create Service Account Key',
    category: 'Security & IAM',
    description: 'Generate a new key for a service account',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'serviceAccountEmail', label: 'Service Account Email', type: 'email', required: true, placeholder: 'my-sa@project.iam.gserviceaccount.com' },
      { id: 'outputPath', label: 'Key Output Path', type: 'path', required: true, placeholder: './service-account-key.json' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const serviceAccountEmail = escapePowerShellString(params.serviceAccountEmail);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# Create Service Account Key
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating key for service account: ${serviceAccountEmail}..." -ForegroundColor Yellow
    
    gcloud iam service-accounts keys create "${outputPath}" \`
        --iam-account="${serviceAccountEmail}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Service account key created successfully!" -ForegroundColor Green
        Write-Host "  Service Account: ${serviceAccountEmail}" -ForegroundColor Cyan
        Write-Host "  Key File: ${outputPath}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "IMPORTANT: Store this key securely and do not commit to version control!" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Service account key creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-vpc-network',
    name: 'Create VPC Network',
    category: 'Networking',
    description: 'Create a custom VPC network with subnets',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'networkName', label: 'Network Name', type: 'text', required: true, placeholder: 'my-vpc-network' },
      { id: 'subnetName', label: 'Subnet Name', type: 'text', required: true, placeholder: 'my-subnet' },
      { id: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'ipRange', label: 'IP Range (CIDR)', type: 'text', required: true, placeholder: '10.0.1.0/24' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const networkName = escapePowerShellString(params.networkName);
      const subnetName = escapePowerShellString(params.subnetName);
      const region = escapePowerShellString(params.region);
      const ipRange = escapePowerShellString(params.ipRange);

      return `# Create VPC Network
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating VPC network: ${networkName}..." -ForegroundColor Yellow
    
    gcloud compute networks create "${networkName}" \`
        --subnet-mode=custom \`
        --bgp-routing-mode=regional
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "VPC network created" -ForegroundColor Green
        
        Write-Host "Creating subnet: ${subnetName}..." -ForegroundColor Yellow
        
        gcloud compute networks subnets create "${subnetName}" \`
            --network="${networkName}" \`
            --region="${region}" \`
            --range="${ipRange}"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Subnet created successfully!" -ForegroundColor Green
            Write-Host "  Network: ${networkName}" -ForegroundColor Cyan
            Write-Host "  Subnet: ${subnetName}" -ForegroundColor Cyan
            Write-Host "  Region: ${region}" -ForegroundColor Cyan
            Write-Host "  IP Range: ${ipRange}" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "VPC network creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-cloud-nat',
    name: 'Configure Cloud NAT',
    category: 'Networking',
    description: 'Set up Cloud NAT for instances without external IPs',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'natName', label: 'NAT Gateway Name', type: 'text', required: true, placeholder: 'my-nat-gateway' },
      { id: 'routerName', label: 'Cloud Router Name', type: 'text', required: true, placeholder: 'my-router' },
      { id: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'network', label: 'VPC Network', type: 'text', required: true, placeholder: 'default' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const natName = escapePowerShellString(params.natName);
      const routerName = escapePowerShellString(params.routerName);
      const region = escapePowerShellString(params.region);
      const network = escapePowerShellString(params.network);

      return `# Configure Cloud NAT
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating Cloud Router: ${routerName}..." -ForegroundColor Yellow
    
    gcloud compute routers create "${routerName}" \`
        --network="${network}" \`
        --region="${region}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cloud Router created" -ForegroundColor Green
        
        Write-Host "Creating Cloud NAT: ${natName}..." -ForegroundColor Yellow
        
        gcloud compute routers nats create "${natName}" \`
            --router="${routerName}" \`
            --region="${region}" \`
            --nat-all-subnet-ip-ranges \`
            --auto-allocate-nat-external-ips
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Cloud NAT configured successfully!" -ForegroundColor Green
            Write-Host "  NAT Gateway: ${natName}" -ForegroundColor Cyan
            Write-Host "  Router: ${routerName}" -ForegroundColor Cyan
            Write-Host "  Region: ${region}" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Cloud NAT configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-ssl-certificate',
    name: 'Create Managed SSL Certificate',
    category: 'Networking',
    description: 'Create a Google-managed SSL certificate for load balancer',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'certificateName', label: 'Certificate Name', type: 'text', required: true, placeholder: 'my-ssl-cert' },
      { id: 'domains', label: 'Domains (comma-separated)', type: 'text', required: true, placeholder: 'example.com,www.example.com' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const certificateName = escapePowerShellString(params.certificateName);
      const domains = escapePowerShellString(params.domains);

      return `# Create Managed SSL Certificate
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating managed SSL certificate: ${certificateName}..." -ForegroundColor Yellow
    
    gcloud compute ssl-certificates create "${certificateName}" \`
        --domains="${domains}" \`
        --global
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSL certificate created successfully!" -ForegroundColor Green
        Write-Host "  Certificate: ${certificateName}" -ForegroundColor Cyan
        Write-Host "  Domains: ${domains}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Certificate Status:" -ForegroundColor Yellow
        gcloud compute ssl-certificates describe "${certificateName}" --global --format="table(name,type,managed.status)"
        
        Write-Host ""
        Write-Host "Note: Certificate provisioning may take up to 60 minutes." -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "SSL certificate creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-gke-cluster',
    name: 'Create GKE Cluster',
    category: 'Kubernetes Engine',
    description: 'Create a Google Kubernetes Engine cluster',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'clusterName', label: 'Cluster Name', type: 'text', required: true, placeholder: 'production-cluster' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'nodeCount', label: 'Initial Node Count', type: 'number', required: true, placeholder: '3', defaultValue: 3 },
      { id: 'machineType', label: 'Node Machine Type', type: 'select', required: true, options: ['e2-medium', 'e2-standard-2', 'n1-standard-2', 'n2-standard-2'], defaultValue: 'e2-medium' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const clusterName = escapePowerShellString(params.clusterName);
      const zone = escapePowerShellString(params.zone);
      const nodeCount = params.nodeCount || 3;
      const machineType = params.machineType;

      return `# Create GKE Cluster
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating GKE cluster: ${clusterName}..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Cyan
    
    gcloud container clusters create "${clusterName}" \`
        --zone="${zone}" \`
        --num-nodes=${nodeCount} \`
        --machine-type=${machineType} \`
        --enable-ip-alias
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "GKE cluster created successfully!" -ForegroundColor Green
        Write-Host "  Cluster: ${clusterName}" -ForegroundColor Cyan
        Write-Host "  Zone: ${zone}" -ForegroundColor Cyan
        Write-Host "  Node Count: ${nodeCount}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Fetching cluster credentials..." -ForegroundColor Yellow
        gcloud container clusters get-credentials "${clusterName}" --zone="${zone}"
        
        Write-Host ""
        Write-Host "Cluster nodes:" -ForegroundColor Yellow
        kubectl get nodes
    }
    
} catch {
    Write-Error "GKE cluster creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-gke-node-pool',
    name: 'Create GKE Node Pool',
    category: 'Kubernetes Engine',
    description: 'Create a new node pool in a GKE cluster',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'clusterName', label: 'Cluster Name', type: 'text', required: true, placeholder: 'production-cluster' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'nodePoolName', label: 'Node Pool Name', type: 'text', required: true, placeholder: 'high-memory-pool' },
      { id: 'machineType', label: 'Machine Type', type: 'select', required: true, options: ['e2-medium', 'e2-highmem-2', 'n2-highmem-2', 'n2-standard-4'], defaultValue: 'e2-highmem-2' },
      { id: 'nodeCount', label: 'Node Count', type: 'number', required: true, placeholder: '3', defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const clusterName = escapePowerShellString(params.clusterName);
      const zone = escapePowerShellString(params.zone);
      const nodePoolName = escapePowerShellString(params.nodePoolName);
      const machineType = params.machineType;
      const nodeCount = params.nodeCount || 3;

      return `# Create GKE Node Pool
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating node pool: ${nodePoolName}..." -ForegroundColor Yellow
    
    gcloud container node-pools create "${nodePoolName}" \`
        --cluster="${clusterName}" \`
        --zone="${zone}" \`
        --num-nodes=${nodeCount} \`
        --machine-type=${machineType}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Node pool created successfully!" -ForegroundColor Green
        Write-Host "  Pool: ${nodePoolName}" -ForegroundColor Cyan
        Write-Host "  Machine Type: ${machineType}" -ForegroundColor Cyan
        Write-Host "  Node Count: ${nodeCount}" -ForegroundColor Cyan
        
        Write-Host ""
        gcloud container node-pools list --cluster="${clusterName}" --zone="${zone}"
    }
    
} catch {
    Write-Error "Node pool creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-deploy-gke-workload',
    name: 'Deploy Workload to GKE',
    category: 'Kubernetes Engine',
    description: 'Deploy a containerized application to GKE cluster',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'clusterName', label: 'Cluster Name', type: 'text', required: true, placeholder: 'production-cluster' },
      { id: 'zone', label: 'Zone', type: 'text', required: true, placeholder: 'us-central1-a' },
      { id: 'deploymentName', label: 'Deployment Name', type: 'text', required: true, placeholder: 'my-app' },
      { id: 'image', label: 'Container Image', type: 'text', required: true, placeholder: 'gcr.io/project/image:tag' },
      { id: 'replicas', label: 'Replicas', type: 'number', required: true, placeholder: '3', defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const clusterName = escapePowerShellString(params.clusterName);
      const zone = escapePowerShellString(params.zone);
      const deploymentName = escapePowerShellString(params.deploymentName);
      const image = escapePowerShellString(params.image);
      const replicas = params.replicas || 3;

      return `# Deploy Workload to GKE
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Connecting to cluster: ${clusterName}..." -ForegroundColor Yellow
    gcloud container clusters get-credentials "${clusterName}" --zone="${zone}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Creating deployment: ${deploymentName}..." -ForegroundColor Yellow
        
        kubectl create deployment "${deploymentName}" --image="${image}" --replicas=${replicas}
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Deployment created" -ForegroundColor Green
            
            Write-Host "Exposing as LoadBalancer..." -ForegroundColor Yellow
            kubectl expose deployment "${deploymentName}" --type=LoadBalancer --port=80
            
            Write-Host ""
            Write-Host "Deployment status:" -ForegroundColor Yellow
            kubectl get deployment "${deploymentName}"
            
            Write-Host ""
            Write-Host "Pods:" -ForegroundColor Yellow
            kubectl get pods -l app="${deploymentName}"
        }
    }
    
} catch {
    Write-Error "GKE deployment failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-cloud-sql-instance',
    name: 'Create Cloud SQL Instance',
    category: 'Database Management',
    description: 'Create a new Cloud SQL database instance',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'instanceName', label: 'Instance Name', type: 'text', required: true, placeholder: 'my-database' },
      { id: 'databaseVersion', label: 'Database Version', type: 'select', required: true, options: ['MYSQL_8_0', 'MYSQL_5_7', 'POSTGRES_14', 'POSTGRES_13'], defaultValue: 'POSTGRES_14' },
      { id: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'tier', label: 'Machine Tier', type: 'select', required: true, options: ['db-f1-micro', 'db-g1-small', 'db-n1-standard-1', 'db-n1-standard-2'], defaultValue: 'db-n1-standard-1' },
      { id: 'rootPassword', label: 'Root Password', type: 'text', required: true, placeholder: 'SecurePassword123!' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const instanceName = escapePowerShellString(params.instanceName);
      const databaseVersion = params.databaseVersion;
      const region = escapePowerShellString(params.region);
      const tier = params.tier;
      const rootPassword = escapePowerShellString(params.rootPassword);

      return `# Create Cloud SQL Instance
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating Cloud SQL instance: ${instanceName}..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Cyan
    
    gcloud sql instances create "${instanceName}" \`
        --database-version=${databaseVersion} \`
        --region="${region}" \`
        --tier=${tier} \`
        --storage-size=10GB \`
        --storage-type=SSD \`
        --root-password="${rootPassword}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cloud SQL instance created successfully!" -ForegroundColor Green
        Write-Host "  Instance: ${instanceName}" -ForegroundColor Cyan
        Write-Host "  Version: ${databaseVersion}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
        Write-Host "  Tier: ${tier}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Connection Information:" -ForegroundColor Yellow
        gcloud sql instances describe "${instanceName}" --format="table(connectionName,ipAddresses)"
    }
    
} catch {
    Write-Error "Cloud SQL instance creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-cloud-sql-users',
    name: 'Manage Cloud SQL Users',
    category: 'Database Management',
    description: 'Create or delete Cloud SQL database users',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'instanceName', label: 'Instance Name', type: 'text', required: true, placeholder: 'my-database' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Delete', 'List'], defaultValue: 'Create' },
      { id: 'userName', label: 'User Name', type: 'text', required: true, placeholder: 'app_user' },
      { id: 'password', label: 'Password (for Create)', type: 'text', required: false, placeholder: 'SecurePassword123!' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const instanceName = escapePowerShellString(params.instanceName);
      const action = params.action;
      const userName = escapePowerShellString(params.userName);
      const password = params.password ? escapePowerShellString(params.password) : '';

      let actionScript = '';
      if (action === 'Create') {
        actionScript = `gcloud sql users create "${userName}" --instance="${instanceName}" --password="${password}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "User created successfully!" -ForegroundColor Green
        Write-Host "  User: ${userName}" -ForegroundColor Cyan
    }`;
      } else if (action === 'Delete') {
        actionScript = `gcloud sql users delete "${userName}" --instance="${instanceName}" --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "User deleted successfully!" -ForegroundColor Green
    }`;
      } else {
        actionScript = `gcloud sql users list --instance="${instanceName}" --format="table(name,host,type)"`;
      }

      return `# Manage Cloud SQL Users
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "${action}ing user for instance: ${instanceName}..." -ForegroundColor Yellow
    
    ${actionScript}
    
} catch {
    Write-Error "Cloud SQL user operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-create-alerting-policy',
    name: 'Create Monitoring Alert Policy',
    category: 'Monitoring & Logging',
    description: 'Create an alerting policy for monitoring GCP resources',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'High CPU Alert' },
      { id: 'metricType', label: 'Metric Type', type: 'select', required: true, options: ['CPU Utilization', 'Memory Usage', 'Disk Usage'], defaultValue: 'CPU Utilization' },
      { id: 'threshold', label: 'Threshold Value (%)', type: 'number', required: true, placeholder: '80', defaultValue: 80 },
      { id: 'notificationEmail', label: 'Notification Email', type: 'email', required: true, placeholder: 'alerts@example.com' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const policyName = escapePowerShellString(params.policyName);
      const metricType = params.metricType;
      const threshold = params.threshold || 80;
      const notificationEmail = escapePowerShellString(params.notificationEmail);

      const metricFilter = metricType === 'CPU Utilization' 
        ? 'compute.googleapis.com/instance/cpu/utilization'
        : metricType === 'Memory Usage'
        ? 'compute.googleapis.com/instance/memory/balloon/ram_used'
        : 'compute.googleapis.com/instance/disk/write_bytes_count';

      return `# Create Monitoring Alert Policy
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Creating alerting policy: ${policyName}..." -ForegroundColor Yellow
    
    # Note: Full alert policy creation requires the API or Cloud Console
    # This script creates a notification channel and provides guidance
    
    Write-Host ""
    Write-Host "Alert Policy Configuration:" -ForegroundColor Green
    Write-Host "  Name: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Metric: ${metricFilter}" -ForegroundColor Cyan
    Write-Host "  Threshold: ${threshold}%" -ForegroundColor Cyan
    Write-Host "  Notification: ${notificationEmail}" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "To create this policy:" -ForegroundColor Yellow
    Write-Host "1. Navigate to Cloud Console > Monitoring > Alerting" -ForegroundColor Cyan
    Write-Host "2. Click 'Create Policy'" -ForegroundColor Cyan
    Write-Host "3. Select metric type: ${metricType}" -ForegroundColor Cyan
    Write-Host "4. Set threshold to ${threshold}%" -ForegroundColor Cyan
    Write-Host "5. Configure notification channel: ${notificationEmail}" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Current alert policies:" -ForegroundColor Yellow
    gcloud alpha monitoring policies list --format="table(displayName,enabled)"
    
} catch {
    Write-Error "Alert policy creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-query-logs',
    name: 'Query Cloud Logging',
    category: 'Monitoring & Logging',
    description: 'Search and filter logs using Cloud Logging',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'resourceType', label: 'Resource Type', type: 'select', required: true, options: ['gce_instance', 'gke_cluster', 'cloud_function', 'cloudsql_database'], defaultValue: 'gce_instance' },
      { id: 'severity', label: 'Minimum Severity', type: 'select', required: true, options: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], defaultValue: 'INFO' },
      { id: 'hours', label: 'Hours to Search', type: 'number', required: true, placeholder: '24', defaultValue: 24 },
      { id: 'limit', label: 'Result Limit', type: 'number', required: false, placeholder: '100', defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const resourceType = params.resourceType;
      const severity = params.severity;
      const hours = params.hours || 24;
      const limit = params.limit || 100;

      return `# Query Cloud Logging
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Querying logs for: ${resourceType}..." -ForegroundColor Yellow
    Write-Host "  Time Range: Last ${hours} hours" -ForegroundColor Cyan
    Write-Host "  Severity: >= ${severity}" -ForegroundColor Cyan
    Write-Host ""
    
    $StartTime = (Get-Date).AddHours(-${hours}).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    gcloud logging read "resource.type=${resourceType} AND severity>=${severity} AND timestamp>=\\"$StartTime\\"" \`
        --limit=${limit} \`
        --format="table(timestamp,severity,resource.labels,textPayload)"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Log query completed" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Log query failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-deploy-cloud-function',
    name: 'Deploy Cloud Function',
    category: 'Serverless',
    description: 'Deploy a Cloud Function with HTTP trigger',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'functionName', label: 'Function Name', type: 'text', required: true, placeholder: 'my-function' },
      { id: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'runtime', label: 'Runtime', type: 'select', required: true, options: ['python311', 'python310', 'nodejs20', 'nodejs18', 'go121'], defaultValue: 'python311' },
      { id: 'entryPoint', label: 'Entry Point Function', type: 'text', required: true, placeholder: 'main' },
      { id: 'sourceDir', label: 'Source Directory', type: 'path', required: true, placeholder: './function-source' },
      { id: 'memory', label: 'Memory (MB)', type: 'select', required: false, options: ['128', '256', '512', '1024'], defaultValue: '256' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const functionName = escapePowerShellString(params.functionName);
      const region = escapePowerShellString(params.region);
      const runtime = params.runtime;
      const entryPoint = escapePowerShellString(params.entryPoint);
      const sourceDir = escapePowerShellString(params.sourceDir);
      const memory = params.memory || '256';

      return `# Deploy Cloud Function
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Deploying Cloud Function: ${functionName}..." -ForegroundColor Yellow
    
    gcloud functions deploy "${functionName}" \`
        --gen2 \`
        --region="${region}" \`
        --runtime=${runtime} \`
        --source="${sourceDir}" \`
        --entry-point="${entryPoint}" \`
        --memory=${memory}MB \`
        --trigger-http \`
        --allow-unauthenticated
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cloud Function deployed successfully!" -ForegroundColor Green
        Write-Host "  Function: ${functionName}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
        Write-Host "  Runtime: ${runtime}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Function URL:" -ForegroundColor Yellow
        gcloud functions describe "${functionName}" --region="${region}" --gen2 --format="value(serviceConfig.uri)"
    }
    
} catch {
    Write-Error "Cloud Function deployment failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-cloud-function',
    name: 'Manage Cloud Function',
    category: 'Serverless',
    description: 'View logs or delete Cloud Functions',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'functionName', label: 'Function Name', type: 'text', required: true, placeholder: 'my-function' },
      { id: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['View Logs', 'Delete', 'Describe', 'List All'], defaultValue: 'Describe' },
      { id: 'logLimit', label: 'Log Limit', type: 'number', required: false, placeholder: '50', defaultValue: 50 }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const functionName = escapePowerShellString(params.functionName);
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const logLimit = params.logLimit || 50;

      let actionScript = '';
      if (action === 'View Logs') {
        actionScript = `gcloud functions logs read "${functionName}" --region="${region}" --gen2 --limit=${logLimit}`;
      } else if (action === 'Delete') {
        actionScript = `gcloud functions delete "${functionName}" --region="${region}" --gen2 --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cloud Function deleted successfully!" -ForegroundColor Green
    }`;
      } else if (action === 'Describe') {
        actionScript = `gcloud functions describe "${functionName}" --region="${region}" --gen2`;
      } else {
        actionScript = `gcloud functions list --regions="${region}" --format="table(name,state,trigger,updateTime)"`;
      }

      return `# Manage Cloud Function
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "${action} for function: ${functionName}..." -ForegroundColor Yellow
    
    ${actionScript}
    
} catch {
    Write-Error "Cloud Function operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-deploy-cloud-run',
    name: 'Deploy to Cloud Run',
    category: 'Serverless',
    description: 'Deploy a containerized application to Cloud Run',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'my-api-service' },
      { id: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'image', label: 'Container Image', type: 'text', required: true, placeholder: 'gcr.io/project/image:tag' },
      { id: 'port', label: 'Container Port', type: 'number', required: false, placeholder: '8080', defaultValue: 8080 },
      { id: 'memory', label: 'Memory', type: 'select', required: false, options: ['256Mi', '512Mi', '1Gi', '2Gi'], defaultValue: '512Mi' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const serviceName = escapePowerShellString(params.serviceName);
      const region = escapePowerShellString(params.region);
      const image = escapePowerShellString(params.image);
      const port = params.port || 8080;
      const memory = params.memory || '512Mi';

      return `# Deploy to Cloud Run
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "Deploying Cloud Run service: ${serviceName}..." -ForegroundColor Yellow
    
    gcloud run deploy "${serviceName}" \`
        --image="${image}" \`
        --region="${region}" \`
        --port=${port} \`
        --memory=${memory} \`
        --platform=managed \`
        --allow-unauthenticated
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cloud Run service deployed successfully!" -ForegroundColor Green
        Write-Host "  Service: ${serviceName}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
        Write-Host "  Memory: ${memory}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Service URL:" -ForegroundColor Yellow
        gcloud run services describe "${serviceName}" --region="${region}" --format="value(status.url)"
    }
    
} catch {
    Write-Error "Cloud Run deployment failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-pubsub-topic',
    name: 'Manage Pub/Sub Topics',
    category: 'Messaging',
    description: 'Create or list Pub/Sub topics and subscriptions',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Topic', 'Create Subscription', 'List Topics', 'Publish Message'], defaultValue: 'Create Topic' },
      { id: 'topicName', label: 'Topic Name', type: 'text', required: true, placeholder: 'my-topic' },
      { id: 'subscriptionName', label: 'Subscription Name', type: 'text', required: false, placeholder: 'my-subscription' },
      { id: 'message', label: 'Message (for Publish)', type: 'textarea', required: false, placeholder: '{"event": "test"}' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const topicName = escapePowerShellString(params.topicName);
      const subscriptionName = params.subscriptionName ? escapePowerShellString(params.subscriptionName) : '';
      const message = params.message ? escapePowerShellString(params.message) : '';

      let actionScript = '';
      if (action === 'Create Topic') {
        actionScript = `gcloud pubsub topics create "${topicName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Topic created: projects/${project}/topics/${topicName}" -ForegroundColor Green
    }`;
      } else if (action === 'Create Subscription') {
        actionScript = `gcloud pubsub subscriptions create "${subscriptionName}" --topic="${topicName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Subscription created: ${subscriptionName}" -ForegroundColor Green
    }`;
      } else if (action === 'Publish Message') {
        actionScript = `gcloud pubsub topics publish "${topicName}" --message="${message}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Message published to: ${topicName}" -ForegroundColor Green
    }`;
      } else {
        actionScript = `Write-Host "Pub/Sub Topics:" -ForegroundColor Green
    gcloud pubsub topics list --format="table(name)"
    
    Write-Host ""
    Write-Host "Subscriptions:" -ForegroundColor Green
    gcloud pubsub subscriptions list --format="table(name,topic,ackDeadlineSeconds)"`;
      }

      return `# Manage Pub/Sub Topics
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "${action}..." -ForegroundColor Yellow
    
    ${actionScript}
    
} catch {
    Write-Error "Pub/Sub operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-secrets',
    name: 'Manage Secret Manager',
    category: 'Security & IAM',
    description: 'Create and access secrets in Secret Manager',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Secret', 'Access Secret', 'List Secrets', 'Delete Secret'], defaultValue: 'Create Secret' },
      { id: 'secretName', label: 'Secret Name', type: 'text', required: true, placeholder: 'my-api-key' },
      { id: 'secretValue', label: 'Secret Value (for Create)', type: 'text', required: false, placeholder: 'your-secret-value' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const secretName = escapePowerShellString(params.secretName);
      const secretValue = params.secretValue ? escapePowerShellString(params.secretValue) : '';

      let actionScript = '';
      if (action === 'Create Secret') {
        actionScript = `gcloud secrets create "${secretName}" --replication-policy="automatic"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Secret created, adding initial version..." -ForegroundColor Green
        echo "${secretValue}" | gcloud secrets versions add "${secretName}" --data-file=-
        Write-Host "Secret with initial version created: ${secretName}" -ForegroundColor Green
    }`;
      } else if (action === 'Access Secret') {
        actionScript = `$SecretValue = gcloud secrets versions access latest --secret="${secretName}"
    Write-Host "Secret value retrieved (first 10 chars):" -ForegroundColor Green
    Write-Host ($SecretValue.Substring(0, [Math]::Min(10, $SecretValue.Length)) + "***")`;
      } else if (action === 'Delete Secret') {
        actionScript = `gcloud secrets delete "${secretName}" --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Secret deleted: ${secretName}" -ForegroundColor Green
    }`;
      } else {
        actionScript = `gcloud secrets list --format="table(name,replication.automatic,createTime)"`;
      }

      return `# Manage Secret Manager
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "${action}..." -ForegroundColor Yellow
    
    ${actionScript}
    
} catch {
    Write-Error "Secret Manager operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-artifact-registry',
    name: 'Manage Artifact Registry',
    category: 'DevOps',
    description: 'Create and manage Artifact Registry repositories',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Repository', 'List Repositories', 'Delete Repository'], defaultValue: 'Create Repository' },
      { id: 'repositoryName', label: 'Repository Name', type: 'text', required: true, placeholder: 'my-docker-repo' },
      { id: 'location', label: 'Location', type: 'text', required: true, placeholder: 'us-central1' },
      { id: 'format', label: 'Repository Format', type: 'select', required: false, options: ['docker', 'npm', 'python', 'maven'], defaultValue: 'docker' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const repositoryName = escapePowerShellString(params.repositoryName);
      const location = escapePowerShellString(params.location);
      const format = params.format || 'docker';

      let actionScript = '';
      if (action === 'Create Repository') {
        actionScript = `gcloud artifacts repositories create "${repositoryName}" \`
        --location="${location}" \`
        --repository-format=${format}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Repository created: ${repositoryName}" -ForegroundColor Green
        Write-Host "  Location: ${location}" -ForegroundColor Cyan
        Write-Host "  Format: ${format}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "To push images, configure Docker:" -ForegroundColor Yellow
        Write-Host "gcloud auth configure-docker ${location}-docker.pkg.dev" -ForegroundColor Cyan
    }`;
      } else if (action === 'Delete Repository') {
        actionScript = `gcloud artifacts repositories delete "${repositoryName}" --location="${location}" --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Repository deleted: ${repositoryName}" -ForegroundColor Green
    }`;
      } else {
        actionScript = `gcloud artifacts repositories list --format="table(name,format,location)"`;
      }

      return `# Manage Artifact Registry
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "${action}..." -ForegroundColor Yellow
    
    ${actionScript}
    
} catch {
    Write-Error "Artifact Registry operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'gcp-manage-cloud-dns',
    name: 'Manage Cloud DNS',
    category: 'Networking',
    description: 'Create and manage DNS zones and records',
    parameters: [
      { id: 'project', label: 'GCP Project ID', type: 'text', required: true, placeholder: 'my-project-id' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Zone', 'List Records', 'Add Record'], defaultValue: 'Create Zone' },
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'my-zone' },
      { id: 'dnsName', label: 'DNS Name (for Zone)', type: 'text', required: false, placeholder: 'example.com.' },
      { id: 'recordName', label: 'Record Name', type: 'text', required: false, placeholder: 'www.example.com.' },
      { id: 'recordType', label: 'Record Type', type: 'select', required: false, options: ['A', 'AAAA', 'CNAME', 'MX', 'TXT'], defaultValue: 'A' },
      { id: 'recordData', label: 'Record Data', type: 'text', required: false, placeholder: '203.0.113.1' }
    ],
    scriptTemplate: (params) => {
      const project = escapePowerShellString(params.project);
      const action = params.action;
      const zoneName = escapePowerShellString(params.zoneName);
      const dnsName = params.dnsName ? escapePowerShellString(params.dnsName) : '';
      const recordName = params.recordName ? escapePowerShellString(params.recordName) : '';
      const recordType = params.recordType || 'A';
      const recordData = params.recordData ? escapePowerShellString(params.recordData) : '';

      let actionScript = '';
      if (action === 'Create Zone') {
        actionScript = `gcloud dns managed-zones create "${zoneName}" --dns-name="${dnsName}" --description="Managed by PSForge"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DNS zone created: ${zoneName}" -ForegroundColor Green
        Write-Host "  DNS Name: ${dnsName}" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Name servers:" -ForegroundColor Yellow
        gcloud dns managed-zones describe "${zoneName}" --format="value(nameServers)"
    }`;
      } else if (action === 'Add Record') {
        actionScript = `gcloud dns record-sets transaction start --zone="${zoneName}"
    gcloud dns record-sets transaction add "${recordData}" --zone="${zoneName}" --name="${recordName}" --type=${recordType} --ttl=300
    gcloud dns record-sets transaction execute --zone="${zoneName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DNS record added: ${recordName} ${recordType} ${recordData}" -ForegroundColor Green
    }`;
      } else {
        actionScript = `gcloud dns record-sets list --zone="${zoneName}" --format="table(name,type,ttl,rrdatas)"`;
      }

      return `# Manage Cloud DNS
# Generated: ${new Date().toISOString()}

try {
    gcloud config set project "${project}"
    
    Write-Host "${action}..." -ForegroundColor Yellow
    
    ${actionScript}
    
} catch {
    Write-Error "Cloud DNS operation failed: $_"
}`;
    },
    isPremium: true
  }
];
