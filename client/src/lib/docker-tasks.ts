import { escapePowerShellString } from './powershell-utils';

export interface DockerTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface DockerTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: DockerTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const dockerTasks: DockerTask[] = [
  {
    id: 'docker-bulk-container-control',
    name: 'Bulk Container Start/Stop/Remove',
    category: 'Bulk Operations',
    description: 'Control multiple Docker containers',
    parameters: [
      { id: 'containerNames', label: 'Container Names (comma-separated)', type: 'textarea', required: true, placeholder: 'web-app, database, cache' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Start', 'Stop', 'Restart', 'Remove'], defaultValue: 'Start' }
    ],
    scriptTemplate: (params) => {
      const containerNamesRaw = (params.containerNames as string).split(',').map((n: string) => n.trim());
      const action = params.action.toLowerCase();
      
      return `# Docker Bulk Container Control
# Generated: ${new Date().toISOString()}

$ContainerNames = @(${containerNamesRaw.map(c => `"${escapePowerShellString(c)}"`).join(', ')})

try {
    foreach ($Container in $ContainerNames) {
        Write-Host "${params.action}ing container: $Container..." -ForegroundColor Yellow
        
        docker ${action} $Container
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ ${params.action}ed: $Container" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $Container" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Bulk container operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'docker-deploy-compose',
    name: 'Deploy Docker Compose Stack',
    category: 'Container Management',
    description: 'Deploy containers using docker-compose',
    parameters: [
      { id: 'composePath', label: 'Docker Compose File Path', type: 'path', required: true, placeholder: 'C:\\Projects\\app\\docker-compose.yml' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'myapp' }
    ],
    scriptTemplate: (params) => {
      const composePath = escapePowerShellString(params.composePath);
      const projectName = escapePowerShellString(params.projectName);
      
      return `# Docker Compose Deploy
# Generated: ${new Date().toISOString()}

$ComposePath = "${composePath}"
$ProjectName = "${projectName}"

try {
    Write-Host "Deploying Docker Compose stack..." -ForegroundColor Cyan
    
    docker-compose -f $ComposePath -p $ProjectName up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Stack deployed successfully!" -ForegroundColor Green
        
        # Show running containers
        docker-compose -f $ComposePath -p $ProjectName ps
    } else {
        Write-Error "Deployment failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'kubectl-deploy-manifest',
    name: 'Kubernetes: Deploy Manifest',
    category: 'Kubernetes Management',
    description: 'Deploy Kubernetes resources from manifest file',
    parameters: [
      { id: 'manifestPath', label: 'Manifest File Path', type: 'path', required: true, placeholder: 'C:\\Manifests\\deployment.yaml' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'production' }
    ],
    scriptTemplate: (params) => {
      const manifestPath = escapePowerShellString(params.manifestPath);
      const namespace = escapePowerShellString(params.namespace);
      
      return `# Kubernetes Deploy Manifest
# Generated: ${new Date().toISOString()}

$ManifestPath = "${manifestPath}"
$Namespace = "${namespace}"

try {
    Write-Host "Deploying to namespace: $Namespace..." -ForegroundColor Cyan
    
    kubectl apply -f $ManifestPath -n $Namespace
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Manifest deployed successfully!" -ForegroundColor Green
        
        # Show deployment status
        kubectl get all -n $Namespace
    } else {
        Write-Error "Deployment failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'docker-deploy-image',
    name: 'Deploy Container from Image',
    category: 'Common Admin Tasks',
    description: 'Deploy a single container from a Docker image',
    parameters: [
      { id: 'imageName', label: 'Image Name', type: 'text', required: true, placeholder: 'nginx:latest' },
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-nginx' },
      { id: 'ports', label: 'Port Mapping', type: 'text', required: false, placeholder: '8080:80' },
      { id: 'envVars', label: 'Environment Variables (KEY=VALUE, comma-separated)', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const imageName = escapePowerShellString(params.imageName);
      const containerName = escapePowerShellString(params.containerName);
      const ports = params.ports ? `-p ${escapePowerShellString(params.ports)}` : '';
      const envVars = params.envVars ? (params.envVars as string).split(',').map((e: string) => `-e ${escapePowerShellString(e.trim())}`).join(' ') : '';
      
      return `# Docker Deploy Container from Image
# Generated: ${new Date().toISOString()}

$ImageName = "${imageName}"
$ContainerName = "${containerName}"

try {
    Write-Host "Pulling image..." -ForegroundColor Cyan
    docker pull $ImageName
    
    Write-Host "Deploying container..." -ForegroundColor Cyan
    docker run -d --name $ContainerName ${ports} ${envVars} $ImageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Container deployed: $ContainerName" -ForegroundColor Green
        docker ps -f name=$ContainerName
    } else {
        Write-Error "Deployment failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'kubectl-deploy-pod',
    name: 'Deploy Pods to Kubernetes',
    category: 'Common Admin Tasks',
    description: 'Deploy pods directly to Kubernetes cluster',
    parameters: [
      { id: 'podName', label: 'Pod Name', type: 'text', required: true, placeholder: 'my-pod' },
      { id: 'image', label: 'Container Image', type: 'text', required: true, placeholder: 'nginx:latest' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'replicas', label: 'Replicas', type: 'number', required: false, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const podName = escapePowerShellString(params.podName);
      const image = escapePowerShellString(params.image);
      const namespace = escapePowerShellString(params.namespace);
      const replicas = params.replicas || 1;
      
      return `# Kubernetes Deploy Pods
# Generated: ${new Date().toISOString()}

$PodName = "${podName}"
$Image = "${image}"
$Namespace = "${namespace}"

try {
    Write-Host "Creating deployment..." -ForegroundColor Cyan
    
    kubectl create deployment $PodName --image=$Image --replicas=${replicas} -n $Namespace
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Deployment created: $PodName" -ForegroundColor Green
        
        Write-Host "Waiting for pods to be ready..." -ForegroundColor Yellow
        kubectl wait --for=condition=ready pod -l app=$PodName -n $Namespace --timeout=60s
        
        kubectl get pods -n $Namespace -l app=$PodName
    } else {
        Write-Error "Deployment failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'kubectl-update-deployment',
    name: 'Update Deployments and Rollout Changes',
    category: 'Common Admin Tasks',
    description: 'Update Kubernetes deployment and manage rollout',
    parameters: [
      { id: 'deploymentName', label: 'Deployment Name', type: 'text', required: true },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'newImage', label: 'New Image', type: 'text', required: true, placeholder: 'nginx:1.21' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Update', 'Rollback'], defaultValue: 'Update' }
    ],
    scriptTemplate: (params) => {
      const deploymentName = escapePowerShellString(params.deploymentName);
      const namespace = escapePowerShellString(params.namespace);
      const newImage = escapePowerShellString(params.newImage);
      const action = params.action;
      
      return `# Kubernetes Update Deployment and Rollout
# Generated: ${new Date().toISOString()}

$DeploymentName = "${deploymentName}"
$Namespace = "${namespace}"

try {
    ${action === 'Update' ? `
    Write-Host "Updating deployment image..." -ForegroundColor Cyan
    kubectl set image deployment/$DeploymentName *="${newImage}" -n $Namespace
    
    Write-Host "Monitoring rollout status..." -ForegroundColor Yellow
    kubectl rollout status deployment/$DeploymentName -n $Namespace
    ` : `
    Write-Host "Rolling back deployment..." -ForegroundColor Cyan
    kubectl rollout undo deployment/$DeploymentName -n $Namespace
    
    Write-Host "Monitoring rollback status..." -ForegroundColor Yellow
    kubectl rollout status deployment/$DeploymentName -n $Namespace
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${action} completed successfully!" -ForegroundColor Green
        kubectl get deployment $DeploymentName -n $Namespace
    } else {
        Write-Error "${action} failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-manage-volumes',
    name: 'Manage Volumes and Persistent Storage',
    category: 'Common Admin Tasks',
    description: 'Create and manage Docker volumes',
    parameters: [
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'my-volume' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Remove', 'Inspect'], defaultValue: 'Create' },
      { id: 'driver', label: 'Volume Driver', type: 'text', required: false, placeholder: 'local', defaultValue: 'local' }
    ],
    scriptTemplate: (params) => {
      const volumeName = escapePowerShellString(params.volumeName);
      const action = params.action.toLowerCase();
      const driver = escapePowerShellString(params.driver || 'local');
      
      return `# Docker Manage Volumes and Persistent Storage
# Generated: ${new Date().toISOString()}

$VolumeName = "${volumeName}"

try {
    ${params.action === 'Create' ? `
    Write-Host "Creating volume..." -ForegroundColor Cyan
    docker volume create --driver ${driver} $VolumeName
    ` : params.action === 'Inspect' ? `
    Write-Host "Inspecting volume..." -ForegroundColor Cyan
    docker volume inspect $VolumeName
    ` : `
    $Confirm = Read-Host "Remove volume $VolumeName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Removing volume..." -ForegroundColor Cyan
        docker volume rm $VolumeName
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${params.action} completed successfully!" -ForegroundColor Green
        ${params.action !== 'Remove' ? 'docker volume ls' : ''}
    } else {
        Write-Error "${params.action} failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-manage-networks',
    name: 'Manage Docker Networks',
    category: 'Common Admin Tasks',
    description: 'Create and manage Docker networks',
    parameters: [
      { id: 'networkName', label: 'Network Name', type: 'text', required: true, placeholder: 'my-network' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Remove', 'Inspect'], defaultValue: 'Create' },
      { id: 'driver', label: 'Network Driver', type: 'select', required: false, options: ['bridge', 'host', 'overlay', 'macvlan'], defaultValue: 'bridge' }
    ],
    scriptTemplate: (params) => {
      const networkName = escapePowerShellString(params.networkName);
      const action = params.action.toLowerCase();
      const driver = params.driver || 'bridge';
      
      return `# Docker Manage Networks
# Generated: ${new Date().toISOString()}

$NetworkName = "${networkName}"

try {
    ${params.action === 'Create' ? `
    Write-Host "Creating network..." -ForegroundColor Cyan
    docker network create --driver ${driver} $NetworkName
    ` : params.action === 'Inspect' ? `
    Write-Host "Inspecting network..." -ForegroundColor Cyan
    docker network inspect $NetworkName
    ` : `
    $Confirm = Read-Host "Remove network $NetworkName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Removing network..." -ForegroundColor Cyan
        docker network rm $NetworkName
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${params.action} completed successfully!" -ForegroundColor Green
        ${params.action !== 'Remove' ? 'docker network ls' : ''}
    } else {
        Write-Error "${params.action} failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'kubectl-manage-secrets',
    name: 'Manage Kubernetes Secrets',
    category: 'Common Admin Tasks',
    description: 'Create and manage Kubernetes secrets',
    parameters: [
      { id: 'secretName', label: 'Secret Name', type: 'text', required: true, placeholder: 'my-secret' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Delete'], defaultValue: 'Create' },
      { id: 'secretType', label: 'Secret Type', type: 'select', required: false, options: ['generic', 'tls', 'docker-registry'], defaultValue: 'generic' }
    ],
    scriptTemplate: (params) => {
      const secretName = escapePowerShellString(params.secretName);
      const namespace = escapePowerShellString(params.namespace);
      const action = params.action;
      const secretType = params.secretType || 'generic';
      
      return `# Kubernetes Manage Secrets
# Generated: ${new Date().toISOString()}

$SecretName = "${secretName}"
$Namespace = "${namespace}"

try {
    ${action === 'Create' ? `
    Write-Host "Creating secret..." -ForegroundColor Cyan
    
    $Key = Read-Host -Prompt "Enter secret key name"
    $Value = Read-Host -AsSecureString -Prompt "Enter secret value"
    $ValuePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value))
    
    kubectl create secret ${secretType} $SecretName --from-literal="$Key=$ValuePlain" -n $Namespace
    ` : `
    $Confirm = Read-Host "Delete secret $SecretName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting secret..." -ForegroundColor Cyan
        kubectl delete secret $SecretName -n $Namespace
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${action} completed successfully!" -ForegroundColor Green
        ${action === 'Create' ? 'kubectl get secrets -n $Namespace' : ''}
    } else {
        Write-Error "${action} failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'kubectl-monitor-nodes',
    name: 'Monitor Node Health',
    category: 'Common Admin Tasks',
    description: 'Monitor Kubernetes node health and resource usage',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Kubernetes Monitor Node Health
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Gathering node information..." -ForegroundColor Cyan
    
    $Nodes = kubectl get nodes -o json | ConvertFrom-Json
    
    $NodeData = $Nodes.items | ForEach-Object {
        $Node = $_
        $Status = ($Node.status.conditions | Where-Object { $_.type -eq 'Ready' }).status
        
        [PSCustomObject]@{
            Name = $Node.metadata.name
            Status = $Status
            CPU = $Node.status.capacity.cpu
            Memory = $Node.status.capacity.memory
            Pods = $Node.status.capacity.pods
            KubeletVersion = $Node.status.nodeInfo.kubeletVersion
            OSImage = $Node.status.nodeInfo.osImage
        }
    }
    
    $NodeData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Node health data exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Node Summary:" -ForegroundColor Yellow
    $NodeData | Format-Table -AutoSize
    
    $ReadyNodes = ($NodeData | Where-Object { $_.Status -eq 'True' }).Count
    $TotalNodes = $NodeData.Count
    Write-Host "  Ready Nodes: $ReadyNodes / $TotalNodes" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'kubectl-cluster-config',
    name: 'Automate Cluster Configuration',
    category: 'Common Admin Tasks',
    description: 'Apply cluster-wide configurations',
    parameters: [
      { id: 'configPath', label: 'Configuration File Path', type: 'path', required: true, placeholder: 'C:\\Configs\\cluster-config.yaml' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Apply', 'Delete'], defaultValue: 'Apply' }
    ],
    scriptTemplate: (params) => {
      const configPath = escapePowerShellString(params.configPath);
      const action = params.action.toLowerCase();
      
      return `# Kubernetes Automate Cluster Configuration
# Generated: ${new Date().toISOString()}

$ConfigPath = "${configPath}"

try {
    Write-Host "${params.action}ing cluster configuration..." -ForegroundColor Cyan
    
    kubectl ${action} -f $ConfigPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Configuration ${action}ed successfully!" -ForegroundColor Green
        
        kubectl get all --all-namespaces
    } else {
        Write-Error "Configuration ${action} failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-cleanup',
    name: 'Clean Up Unused Resources',
    category: 'Common Admin Tasks',
    description: 'Remove unused Docker resources to free disk space',
    parameters: [
      { id: 'resourceType', label: 'Resource Type', type: 'select', required: true, options: ['All', 'Containers', 'Images', 'Volumes', 'Networks'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const resourceType = params.resourceType;
      
      return `# Docker Clean Up Unused Resources
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Cleaning up unused Docker resources..." -ForegroundColor Cyan
    
    ${resourceType === 'All' ? `
    Write-Host "Removing all unused resources..." -ForegroundColor Yellow
    docker system prune -a -f --volumes
    ` : resourceType === 'Containers' ? `
    Write-Host "Removing stopped containers..." -ForegroundColor Yellow
    docker container prune -f
    ` : resourceType === 'Images' ? `
    Write-Host "Removing unused images..." -ForegroundColor Yellow
    docker image prune -a -f
    ` : resourceType === 'Volumes' ? `
    Write-Host "Removing unused volumes..." -ForegroundColor Yellow
    docker volume prune -f
    ` : `
    Write-Host "Removing unused networks..." -ForegroundColor Yellow
    docker network prune -f
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cleanup completed successfully!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Current Docker disk usage:" -ForegroundColor Yellow
        docker system df
    } else {
        Write-Error "Cleanup failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  }
];
