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
  }
];
