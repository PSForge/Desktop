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
  },
  {
    id: 'kubectl-manage-ingress',
    name: 'Manage Kubernetes Ingress Controllers',
    category: 'Common Admin Tasks',
    description: 'Deploy and configure nginx or traefik ingress controllers for routing external traffic',
    parameters: [
      { id: 'controllerType', label: 'Ingress Controller Type', type: 'select', required: true, options: ['nginx', 'traefik'], defaultValue: 'nginx' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'ingress-nginx', defaultValue: 'ingress-nginx' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Deploy', 'Delete'], defaultValue: 'Deploy' }
    ],
    scriptTemplate: (params) => {
      const controllerType = params.controllerType;
      const namespace = escapePowerShellString(params.namespace);
      const action = params.action;
      
      return `# Kubernetes Manage Ingress Controllers
# Generated: ${new Date().toISOString()}

$Namespace = "${namespace}"

try {
    ${action === 'Deploy' ? `
    Write-Host "Deploying ${controllerType} ingress controller..." -ForegroundColor Cyan
    
    # Create namespace if it doesn't exist
    kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
    
    ${controllerType === 'nginx' ? `
    # Deploy NGINX Ingress Controller
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml -n $Namespace
    ` : `
    # Deploy Traefik Ingress Controller
    kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml -n $Namespace
    kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml -n $Namespace
    `}
    
    Write-Host "Waiting for controller pods to be ready..." -ForegroundColor Yellow
    kubectl wait --namespace $Namespace --for=condition=ready pod --selector=app.kubernetes.io/component=${controllerType === 'nginx' ? 'controller' : 'traefik'} --timeout=90s
    ` : `
    $Confirm = Read-Host "Delete ${controllerType} ingress controller from $Namespace? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting ${controllerType} ingress controller..." -ForegroundColor Cyan
        kubectl delete namespace $Namespace
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${action} completed successfully!" -ForegroundColor Green
        ${action === 'Deploy' ? 'kubectl get pods,services -n $Namespace' : ''}
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
    id: 'kubectl-manage-pvc',
    name: 'Configure Persistent Volume Claims (PVC)',
    category: 'Common Admin Tasks',
    description: 'Create and manage Persistent Volume Claims and storage classes for stateful applications',
    parameters: [
      { id: 'pvcName', label: 'PVC Name', type: 'text', required: true, placeholder: 'my-pvc' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'storageSize', label: 'Storage Size (e.g., 10Gi)', type: 'text', required: true, placeholder: '10Gi', defaultValue: '10Gi' },
      { id: 'storageClass', label: 'Storage Class', type: 'text', required: false, placeholder: 'standard', defaultValue: 'standard' },
      { id: 'accessMode', label: 'Access Mode', type: 'select', required: true, options: ['ReadWriteOnce', 'ReadOnlyMany', 'ReadWriteMany'], defaultValue: 'ReadWriteOnce' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Delete', 'Inspect'], defaultValue: 'Create' }
    ],
    scriptTemplate: (params) => {
      const pvcName = escapePowerShellString(params.pvcName);
      const namespace = escapePowerShellString(params.namespace);
      const storageSize = escapePowerShellString(params.storageSize);
      const storageClass = escapePowerShellString(params.storageClass || 'standard');
      const accessMode = params.accessMode;
      const action = params.action;
      
      return `# Kubernetes Configure Persistent Volume Claims
# Generated: ${new Date().toISOString()}

$PVCName = "${pvcName}"
$Namespace = "${namespace}"

try {
    ${action === 'Create' ? `
    Write-Host "Creating PVC..." -ForegroundColor Cyan
    
    $PVCManifest = @"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $PVCName
  namespace: $Namespace
spec:
  accessModes:
    - ${accessMode}
  resources:
    requests:
      storage: ${storageSize}
  storageClassName: ${storageClass}
"@
    
    $PVCManifest | kubectl apply -f -
    
    Write-Host "Waiting for PVC to be bound..." -ForegroundColor Yellow
    kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/$PVCName -n $Namespace --timeout=60s
    ` : action === 'Inspect' ? `
    Write-Host "Inspecting PVC..." -ForegroundColor Cyan
    kubectl describe pvc $PVCName -n $Namespace
    kubectl get pvc $PVCName -n $Namespace -o yaml
    ` : `
    $Confirm = Read-Host "Delete PVC $PVCName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting PVC..." -ForegroundColor Cyan
        kubectl delete pvc $PVCName -n $Namespace
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${action} completed successfully!" -ForegroundColor Green
        ${action !== 'Delete' ? 'kubectl get pvc -n $Namespace' : ''}
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
    id: 'kubectl-manage-configmaps',
    name: 'Manage Kubernetes ConfigMaps',
    category: 'Common Admin Tasks',
    description: 'Create, update, and mount ConfigMaps for application configuration management',
    parameters: [
      { id: 'configMapName', label: 'ConfigMap Name', type: 'text', required: true, placeholder: 'app-config' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Update', 'Delete', 'Inspect'], defaultValue: 'Create' },
      { id: 'configData', label: 'Configuration Data (KEY=VALUE, one per line)', type: 'textarea', required: false, placeholder: 'APP_ENV=production\nAPI_URL=https://api.example.com\nLOG_LEVEL=info' }
    ],
    scriptTemplate: (params) => {
      const configMapName = escapePowerShellString(params.configMapName);
      const namespace = escapePowerShellString(params.namespace);
      const action = params.action;
      const configData = params.configData || '';
      
      return `# Kubernetes Manage ConfigMaps
# Generated: ${new Date().toISOString()}

$ConfigMapName = "${configMapName}"
$Namespace = "${namespace}"

try {
    ${action === 'Create' || action === 'Update' ? `
    Write-Host "${action === 'Update' ? 'Updating' : 'Creating'} ConfigMap..." -ForegroundColor Cyan
    
    ${configData ? `
    # Parse configuration data
    $ConfigLines = @"
${configData.split('\n').map((line: string) => line.trim()).filter((line: string) => line).join('\n')}
"@
    
    $FromLiteral = $ConfigLines -split "\\n" | ForEach-Object {
        if ($_ -match "^(.+?)=(.+)$") {
            "--from-literal=$_"
        }
    }
    
    kubectl create configmap $ConfigMapName -n $Namespace @FromLiteral --dry-run=client -o yaml | kubectl apply -f -
    ` : `
    Write-Host "Creating empty ConfigMap (add data using Update action)..." -ForegroundColor Yellow
    kubectl create configmap $ConfigMapName -n $Namespace --dry-run=client -o yaml | kubectl apply -f -
    `}
    ` : action === 'Inspect' ? `
    Write-Host "Inspecting ConfigMap..." -ForegroundColor Cyan
    kubectl describe configmap $ConfigMapName -n $Namespace
    Write-Host ""
    Write-Host "ConfigMap Data:" -ForegroundColor Yellow
    kubectl get configmap $ConfigMapName -n $Namespace -o yaml
    ` : `
    $Confirm = Read-Host "Delete ConfigMap $ConfigMapName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting ConfigMap..." -ForegroundColor Cyan
        kubectl delete configmap $ConfigMapName -n $Namespace
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${action} completed successfully!" -ForegroundColor Green
        ${action !== 'Delete' && action !== 'Inspect' ? 'kubectl get configmap $ConfigMapName -n $Namespace' : ''}
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
    id: 'kubectl-configure-rbac',
    name: 'Configure Kubernetes RBAC',
    category: 'Common Admin Tasks',
    description: 'Create and manage service accounts, roles, and role bindings for access control',
    parameters: [
      { id: 'resourceType', label: 'Resource Type', type: 'select', required: true, options: ['ServiceAccount', 'Role', 'RoleBinding', 'ClusterRole', 'ClusterRoleBinding'], defaultValue: 'ServiceAccount' },
      { id: 'resourceName', label: 'Resource Name', type: 'text', required: true, placeholder: 'my-service-account' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Delete'], defaultValue: 'Create' },
      { id: 'rolePermissions', label: 'Role Permissions (for Role/ClusterRole: verbs=resources, e.g., get,list=pods)', type: 'textarea', required: false, placeholder: 'get,list,watch=pods\ncreate,update,delete=deployments' },
      { id: 'bindingTarget', label: 'Binding Target (for RoleBinding: serviceaccount name)', type: 'text', required: false, placeholder: 'my-service-account' }
    ],
    scriptTemplate: (params) => {
      const resourceType = params.resourceType;
      const resourceName = escapePowerShellString(params.resourceName);
      const namespace = escapePowerShellString(params.namespace);
      const action = params.action;
      const rolePermissions = params.rolePermissions || '';
      const bindingTarget = escapePowerShellString(params.bindingTarget || '');
      
      return `# Kubernetes Configure RBAC
# Generated: ${new Date().toISOString()}

$ResourceName = "${resourceName}"
$Namespace = "${namespace}"

try {
    ${action === 'Create' ? `
    Write-Host "Creating ${resourceType}..." -ForegroundColor Cyan
    
    ${resourceType === 'ServiceAccount' ? `
    kubectl create serviceaccount $ResourceName -n $Namespace
    ` : resourceType === 'Role' || resourceType === 'ClusterRole' ? `
    # Create Role/ClusterRole with permissions
    $RoleManifest = @"
apiVersion: rbac.authorization.k8s.io/v1
kind: ${resourceType}
metadata:
  name: $ResourceName
  ${resourceType === 'Role' ? 'namespace: ' + namespace : ''}
rules:
${rolePermissions ? rolePermissions.split('\n').map((line: string) => {
  const parts = line.trim().split('=');
  if (parts.length === 2) {
    const verbs = parts[0].split(',').map((v: string) => `"${v.trim()}"`).join(', ');
    const resources = parts[1].split(',').map((r: string) => `"${r.trim()}"`).join(', ');
    return `- apiGroups: ["", "apps", "batch"]
  resources: [${resources}]
  verbs: [${verbs}]`;
  }
  return '';
}).join('\n') : '- apiGroups: [""]\\n  resources: ["pods"]\\n  verbs: ["get", "list"]'}
"@
    
    $RoleManifest | kubectl apply -f -
    ` : `
    # Create RoleBinding/ClusterRoleBinding
    ${bindingTarget ? `
    kubectl create ${resourceType === 'RoleBinding' ? 'rolebinding' : 'clusterrolebinding'} $ResourceName \\
      --${resourceType === 'RoleBinding' ? 'role' : 'clusterrole'}=$ResourceName \\
      --serviceaccount=$Namespace:${bindingTarget} \\
      ${resourceType === 'RoleBinding' ? '-n $Namespace' : ''}
    ` : `
    Write-Host "Error: Binding Target (service account) is required for ${resourceType}" -ForegroundColor Red
    exit 1
    `}
    `}
    ` : `
    $Confirm = Read-Host "Delete ${resourceType} $ResourceName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting ${resourceType}..." -ForegroundColor Cyan
        kubectl delete ${resourceType.toLowerCase()} $ResourceName ${resourceType.includes('Cluster') ? '' : '-n $Namespace'}
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ${action} completed successfully!" -ForegroundColor Green
        ${action === 'Create' ? `kubectl get ${resourceType.toLowerCase()} ${resourceType.includes('Cluster') ? '' : '-n $Namespace'}` : ''}
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
    id: 'docker-manage-registry',
    name: 'Manage Docker Registry',
    category: 'Common Admin Tasks',
    description: 'Set up private Docker registry, push/pull images, and manage image tags',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Setup Registry', 'Push Image', 'Pull Image', 'List Tags', 'Delete Image'], defaultValue: 'Setup Registry' },
      { id: 'registryUrl', label: 'Registry URL', type: 'text', required: true, placeholder: 'localhost:5000 or registry.example.com' },
      { id: 'imageName', label: 'Image Name', type: 'text', required: false, placeholder: 'myapp' },
      { id: 'imageTag', label: 'Image Tag', type: 'text', required: false, placeholder: 'latest', defaultValue: 'latest' },
      { id: 'registryPort', label: 'Registry Port (for Setup)', type: 'number', required: false, placeholder: '5000', defaultValue: 5000 }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const registryUrl = escapePowerShellString(params.registryUrl);
      const imageName = escapePowerShellString(params.imageName || '');
      const imageTag = escapePowerShellString(params.imageTag || 'latest');
      const registryPort = params.registryPort || 5000;
      
      return `# Docker Manage Registry
# Generated: ${new Date().toISOString()}

$RegistryUrl = "${registryUrl}"

try {
    ${action === 'Setup Registry' ? `
    Write-Host "Setting up private Docker registry..." -ForegroundColor Cyan
    
    # Create registry volume for persistence
    docker volume create registry-data
    
    # Run registry container
    docker run -d -p ${registryPort}:5000 --name registry --restart=always -v registry-data:/var/lib/registry registry:2
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Registry started on port ${registryPort}" -ForegroundColor Green
        Write-Host "  Access at: http://localhost:${registryPort}" -ForegroundColor Cyan
        docker ps -f name=registry
    }
    ` : action === 'Push Image' ? `
    ${imageName ? `
    Write-Host "Pushing image to registry..." -ForegroundColor Cyan
    
    $LocalImage = "${imageName}:${imageTag}"
    $RegistryImage = "$RegistryUrl/${imageName}:${imageTag}"
    
    # Tag image for registry
    docker tag $LocalImage $RegistryImage
    
    if ($LASTEXITCODE -eq 0) {
        # Push to registry
        docker push $RegistryImage
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Image pushed: $RegistryImage" -ForegroundColor Green
        } else {
            Write-Error "Push failed"
        }
    } else {
        Write-Error "Image tag failed. Ensure image exists locally."
    }
    ` : `
    Write-Host "Error: Image Name is required for Push action" -ForegroundColor Red
    exit 1
    `}
    ` : action === 'Pull Image' ? `
    ${imageName ? `
    Write-Host "Pulling image from registry..." -ForegroundColor Cyan
    
    $RegistryImage = "$RegistryUrl/${imageName}:${imageTag}"
    
    docker pull $RegistryImage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Image pulled: $RegistryImage" -ForegroundColor Green
        docker images $RegistryImage
    } else {
        Write-Error "Pull failed"
    }
    ` : `
    Write-Host "Error: Image Name is required for Pull action" -ForegroundColor Red
    exit 1
    `}
    ` : action === 'List Tags' ? `
    ${imageName ? `
    Write-Host "Listing tags for image: ${imageName}..." -ForegroundColor Cyan
    
    $ApiUrl = "http://$RegistryUrl/v2/${imageName}/tags/list"
    
    try {
        $Response = Invoke-RestMethod -Uri $ApiUrl -Method Get
        Write-Host "✓ Available tags for ${imageName}:" -ForegroundColor Green
        $Response.tags | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
    } catch {
        Write-Error "Failed to list tags: $_"
    }
    ` : `
    Write-Host "Error: Image Name is required for List Tags action" -ForegroundColor Red
    exit 1
    `}
    ` : `
    ${imageName ? `
    $Confirm = Read-Host "Delete image ${imageName}:${imageTag} from registry? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting image from registry..." -ForegroundColor Cyan
        
        # Get image digest
        $ApiUrl = "http://$RegistryUrl/v2/${imageName}/manifests/${imageTag}"
        try {
            $Headers = @{ "Accept" = "application/vnd.docker.distribution.manifest.v2+json" }
            $Response = Invoke-WebRequest -Uri $ApiUrl -Method Get -Headers $Headers
            $Digest = $Response.Headers["Docker-Content-Digest"]
            
            if ($Digest) {
                $DeleteUrl = "http://$RegistryUrl/v2/${imageName}/manifests/$Digest"
                Invoke-RestMethod -Uri $DeleteUrl -Method Delete
                Write-Host "✓ Image deleted: ${imageName}:${imageTag}" -ForegroundColor Green
            } else {
                Write-Error "Could not retrieve image digest"
            }
        } catch {
            Write-Error "Failed to delete image: $_"
        }
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }
    ` : `
    Write-Host "Error: Image Name is required for Delete action" -ForegroundColor Red
    exit 1
    `}
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  }
];
