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
  }
];
