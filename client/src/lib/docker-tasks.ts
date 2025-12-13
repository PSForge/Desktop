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
            Write-Host "[SUCCESS] ${params.action}ed: $Container" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Failed: $Container" -ForegroundColor Red
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
        Write-Host "[SUCCESS] Stack deployed successfully!" -ForegroundColor Green
        
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
        Write-Host "[SUCCESS] Manifest deployed successfully!" -ForegroundColor Green
        
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
        Write-Host "[SUCCESS] Container deployed: $ContainerName" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Deployment created: $PodName" -ForegroundColor Green
        
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
        Write-Host "[SUCCESS] ${action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] ${params.action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] ${params.action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] ${action} completed successfully!" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Node health data exported: ${exportPath}" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Configuration ${action}ed successfully!" -ForegroundColor Green
        
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
        Write-Host "[SUCCESS] Cleanup completed successfully!" -ForegroundColor Green
        
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
        Write-Host "[SUCCESS] ${action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] ${action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] ${action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] ${action} completed successfully!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Registry started on port ${registryPort}" -ForegroundColor Green
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
            Write-Host "[SUCCESS] Image pushed: $RegistryImage" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Image pulled: $RegistryImage" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Available tags for ${imageName}:" -ForegroundColor Green
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
                Write-Host "[SUCCESS] Image deleted: ${imageName}:${imageTag}" -ForegroundColor Green
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
  },

  {
    id: 'kubectl-manage-namespaces',
    name: 'Manage Kubernetes Namespaces',
    category: 'Common Admin Tasks',
    description: 'Create, delete, and configure resource quotas for namespaces',
    parameters: [
      { id: 'namespaceName', label: 'Namespace Name', type: 'text', required: true, placeholder: 'production' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Delete', 'SetQuota'], defaultValue: 'Create' },
      { id: 'cpuLimit', label: 'CPU Limit (for SetQuota)', type: 'text', required: false, placeholder: '4', defaultValue: '4' },
      { id: 'memoryLimit', label: 'Memory Limit (for SetQuota)', type: 'text', required: false, placeholder: '8Gi', defaultValue: '8Gi' }
    ],
    scriptTemplate: (params) => {
      const namespaceName = escapePowerShellString(params.namespaceName);
      const action = params.action;
      const cpuLimit = params.cpuLimit || '4';
      const memoryLimit = params.memoryLimit || '8Gi';
      
      return `# Kubernetes Manage Namespaces
# Generated: ${new Date().toISOString()}

$Namespace = "${namespaceName}"

try {
    ${action === 'Create' ? `
    Write-Host "Creating namespace: $Namespace..." -ForegroundColor Cyan
    kubectl create namespace $Namespace
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Namespace created successfully!" -ForegroundColor Green
        kubectl get namespace $Namespace
    }` : action === 'Delete' ? `
    $Confirm = Read-Host "Delete namespace $Namespace? This will delete ALL resources. Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Deleting namespace: $Namespace..." -ForegroundColor Yellow
        kubectl delete namespace $Namespace
        Write-Host "[SUCCESS] Namespace deleted" -ForegroundColor Green
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit
    }` : `
    Write-Host "Setting resource quota for namespace: $Namespace..." -ForegroundColor Cyan
    
    $QuotaYaml = @"
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: $Namespace
spec:
  hard:
    requests.cpu: "${cpuLimit}"
    requests.memory: "${memoryLimit}"
    limits.cpu: "${cpuLimit}"
    limits.memory: "${memoryLimit}"
"@
    
    $QuotaYaml | kubectl apply -f -
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Resource quota configured successfully!" -ForegroundColor Green
        kubectl get resourcequota -n $Namespace
    }`}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'kubectl-configure-network-policies',
    name: 'Configure Kubernetes Network Policies',
    category: 'Common Admin Tasks',
    description: 'Define pod-to-pod communication rules for network isolation',
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'deny-all-ingress' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'production' },
      { id: 'policyType', label: 'Policy Type', type: 'select', required: true, options: ['DenyAllIngress', 'AllowSpecificPod', 'AllowFromNamespace'], defaultValue: 'DenyAllIngress' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const namespace = escapePowerShellString(params.namespace);
      const policyType = params.policyType;
      
      let policyYaml = '';
      if (policyType === 'DenyAllIngress') {
        policyYaml = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${policyName}
  namespace: ${namespace}
spec:
  podSelector: {}
  policyTypes:
  - Ingress`;
      } else if (policyType === 'AllowSpecificPod') {
        policyYaml = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${policyName}
  namespace: ${namespace}
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend`;
      } else {
        policyYaml = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${policyName}
  namespace: ${namespace}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: trusted`;
      }
      
      return `# Configure Kubernetes Network Policies
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating network policy: ${policyName}..." -ForegroundColor Cyan
    
    $PolicyYaml = @"
${policyYaml}
"@
    
    $PolicyYaml | kubectl apply -f -
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Network policy created successfully!" -ForegroundColor Green
        kubectl get networkpolicy -n ${namespace}
    } else {
        Write-Error "Failed to create network policy"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'kubectl-manage-jobs-cronjobs',
    name: 'Manage Kubernetes Jobs and CronJobs',
    category: 'Common Admin Tasks',
    description: 'Create batch jobs and scheduled tasks',
    parameters: [
      { id: 'jobType', label: 'Job Type', type: 'select', required: true, options: ['Job', 'CronJob'], defaultValue: 'Job' },
      { id: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'backup-job' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'image', label: 'Container Image', type: 'text', required: true, placeholder: 'busybox' },
      { id: 'command', label: 'Command', type: 'text', required: true, placeholder: 'echo Hello World' },
      { id: 'schedule', label: 'Schedule (for CronJob)', type: 'text', required: false, placeholder: '0 2 * * *', defaultValue: '0 2 * * *' }
    ],
    scriptTemplate: (params) => {
      const jobType = params.jobType;
      const jobName = escapePowerShellString(params.jobName);
      const namespace = escapePowerShellString(params.namespace);
      const image = escapePowerShellString(params.image);
      const command = escapePowerShellString(params.command);
      const schedule = params.schedule || '0 2 * * *';
      
      return `# Kubernetes Manage Jobs and CronJobs
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating ${jobType}: ${jobName}..." -ForegroundColor Cyan
    
    ${jobType === 'Job' ? `
    $JobYaml = @"
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${namespace}
spec:
  template:
    spec:
      containers:
      - name: job-container
        image: ${image}
        command: ["sh", "-c", "${command}"]
      restartPolicy: Never
  backoffLimit: 4
"@
    ` : `
    $JobYaml = @"
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${jobName}
  namespace: ${namespace}
spec:
  schedule: "${schedule}"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cron-container
            image: ${image}
            command: ["sh", "-c", "${command}"]
          restartPolicy: OnFailure
"@
    `}
    
    $JobYaml | kubectl apply -f -
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] ${jobType} created successfully!" -ForegroundColor Green
        ${jobType === 'Job' ? 'kubectl get jobs -n $namespace' : 'kubectl get cronjobs -n $namespace'}
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'kubectl-configure-hpa',
    name: 'Configure Horizontal Pod Autoscaler (HPA)',
    category: 'Common Admin Tasks',
    description: 'Set up auto-scaling based on CPU/memory metrics',
    parameters: [
      { id: 'hpaName', label: 'HPA Name', type: 'text', required: true, placeholder: 'web-app-hpa' },
      { id: 'deploymentName', label: 'Deployment Name', type: 'text', required: true, placeholder: 'web-app' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: true, placeholder: 'default' },
      { id: 'minReplicas', label: 'Min Replicas', type: 'number', required: true, defaultValue: 2 },
      { id: 'maxReplicas', label: 'Max Replicas', type: 'number', required: true, defaultValue: 10 },
      { id: 'cpuPercent', label: 'Target CPU %', type: 'number', required: true, defaultValue: 70 }
    ],
    scriptTemplate: (params) => {
      const hpaName = escapePowerShellString(params.hpaName);
      const deploymentName = escapePowerShellString(params.deploymentName);
      const namespace = escapePowerShellString(params.namespace);
      
      return `# Configure Horizontal Pod Autoscaler
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating HPA: ${hpaName}..." -ForegroundColor Cyan
    
    kubectl autoscale deployment ${deploymentName} \`
        --name ${hpaName} \`
        --namespace ${namespace} \`
        --min ${params.minReplicas} \`
        --max ${params.maxReplicas} \`
        --cpu-percent ${params.cpuPercent}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] HPA configured successfully!" -ForegroundColor Green
        Write-Host "  Min Replicas: ${params.minReplicas}" -ForegroundColor Cyan
        Write-Host "  Max Replicas: ${params.maxReplicas}" -ForegroundColor Cyan
        Write-Host "  Target CPU: ${params.cpuPercent}%" -ForegroundColor Cyan
        
        Write-Host ""
        kubectl get hpa -n ${namespace}
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'kubectl-manage-service-mesh',
    name: 'Manage Kubernetes Service Mesh',
    category: 'Common Admin Tasks',
    description: 'Deploy Istio or Linkerd for microservices',
    parameters: [
      { id: 'meshType', label: 'Service Mesh', type: 'select', required: true, options: ['Istio', 'Linkerd'], defaultValue: 'Istio' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Install', 'Check Status'], defaultValue: 'Install' }
    ],
    scriptTemplate: (params) => {
      const meshType = params.meshType;
      const action = params.action;
      
      return `# Manage Kubernetes Service Mesh
# Generated: ${new Date().toISOString()}

try {
    ${action === 'Install' ? `
    Write-Host "Installing ${meshType} service mesh..." -ForegroundColor Cyan
    
    ${meshType === 'Istio' ? `
    # Download and install Istio
    Write-Host "Downloading Istio..." -ForegroundColor Yellow
    curl -L https://istio.io/downloadIstio | sh -
    
    Write-Host "Installing Istio..." -ForegroundColor Cyan
    cd istio-*
    ./bin/istioctl install --set profile=demo -y
    
    # Enable sidecar injection
    kubectl label namespace default istio-injection=enabled
    
    Write-Host "[SUCCESS] Istio installed successfully!" -ForegroundColor Green
    Write-Host "  Verify with: kubectl get pods -n istio-system" -ForegroundColor Cyan
    ` : `
    # Download and install Linkerd
    Write-Host "Downloading Linkerd CLI..." -ForegroundColor Yellow
    curl -sL https://run.linkerd.io/install | sh
    
    Write-Host "Installing Linkerd..." -ForegroundColor Cyan
    linkerd install | kubectl apply -f -
    
    # Wait for installation
    linkerd check
    
    Write-Host "[SUCCESS] Linkerd installed successfully!" -ForegroundColor Green
    Write-Host "  Verify with: linkerd check" -ForegroundColor Cyan
    `}
    ` : `
    Write-Host "Checking ${meshType} status..." -ForegroundColor Cyan
    
    ${meshType === 'Istio' ? `
    kubectl get pods -n istio-system
    Write-Host ""
    istioctl version
    ` : `
    linkerd check
    `}
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  // Container Management Tasks
  {
    id: 'docker-container-logs',
    name: 'View Container Logs',
    category: 'Container Management',
    description: 'Stream and analyze container logs with filtering options',
    parameters: [
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'tailLines', label: 'Tail Lines', type: 'number', required: false, defaultValue: 100, placeholder: '100' },
      { id: 'follow', label: 'Follow Logs', type: 'boolean', required: false, defaultValue: false },
      { id: 'since', label: 'Since (e.g., 1h, 30m, 2023-01-01)', type: 'text', required: false, placeholder: '1h' },
      { id: 'exportPath', label: 'Export to File (optional)', type: 'path', required: false, placeholder: 'C:\\Logs\\container.log' }
    ],
    scriptTemplate: (params) => {
      const containerName = escapePowerShellString(params.containerName);
      const tailLines = params.tailLines || 100;
      const follow = params.follow;
      const since = params.since ? escapePowerShellString(params.since) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Docker Container Logs
# Generated: ${new Date().toISOString()}

$ContainerName = "${containerName}"

try {
    Write-Host "Fetching logs for container: $ContainerName..." -ForegroundColor Cyan
    
    $LogArgs = @("logs", $ContainerName, "--tail", "${tailLines}")
    
    ${since ? `$LogArgs += @("--since", "${since}")` : ''}
    ${follow ? `$LogArgs += "--follow"` : ''}
    
    ${exportPath ? `
    Write-Host "Exporting logs to: ${exportPath}" -ForegroundColor Yellow
    docker @LogArgs | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Logs exported successfully!" -ForegroundColor Green
        Write-Host "  File: ${exportPath}" -ForegroundColor Cyan
        Write-Host "  Size: $((Get-Item '${exportPath}').Length / 1KB) KB" -ForegroundColor Cyan
    }
    ` : `
    docker @LogArgs
    `}
    
} catch {
    Write-Error "Failed to fetch logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-container-exec',
    name: 'Execute Command in Container',
    category: 'Container Management',
    description: 'Run commands or open interactive shell inside a running container',
    parameters: [
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'command', label: 'Command', type: 'text', required: true, placeholder: '/bin/bash or ls -la /app' },
      { id: 'interactive', label: 'Interactive Mode', type: 'boolean', required: false, defaultValue: true },
      { id: 'user', label: 'Run as User (optional)', type: 'text', required: false, placeholder: 'root' },
      { id: 'workdir', label: 'Working Directory', type: 'text', required: false, placeholder: '/app' }
    ],
    scriptTemplate: (params) => {
      const containerName = escapePowerShellString(params.containerName);
      const command = escapePowerShellString(params.command);
      const interactive = params.interactive;
      const user = params.user ? escapePowerShellString(params.user) : '';
      const workdir = params.workdir ? escapePowerShellString(params.workdir) : '';
      
      return `# Docker Container Exec
# Generated: ${new Date().toISOString()}

$ContainerName = "${containerName}"

try {
    Write-Host "Executing command in container: $ContainerName..." -ForegroundColor Cyan
    
    $ExecArgs = @("exec")
    
    ${interactive ? `$ExecArgs += @("-it")` : ''}
    ${user ? `$ExecArgs += @("-u", "${user}")` : ''}
    ${workdir ? `$ExecArgs += @("-w", "${workdir}")` : ''}
    
    $ExecArgs += $ContainerName
    $ExecArgs += "${command}".Split(" ")
    
    Write-Host "Running: docker $($ExecArgs -join ' ')" -ForegroundColor Yellow
    docker @ExecArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Command executed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Command exited with code: $LASTEXITCODE" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to execute command: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-container-inspect',
    name: 'Inspect Container Details',
    category: 'Container Management',
    description: 'Get detailed information about container configuration and state',
    parameters: [
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'format', label: 'Output Format', type: 'select', required: true, options: ['Full JSON', 'Network Info', 'Mount Info', 'Environment', 'Health Status'], defaultValue: 'Full JSON' }
    ],
    scriptTemplate: (params) => {
      const containerName = escapePowerShellString(params.containerName);
      const format = params.format;
      
      return `# Docker Container Inspect
# Generated: ${new Date().toISOString()}

$ContainerName = "${containerName}"

try {
    Write-Host "Inspecting container: $ContainerName..." -ForegroundColor Cyan
    
    ${format === 'Full JSON' ? `
    docker inspect $ContainerName | ConvertFrom-Json | ConvertTo-Json -Depth 10
    ` : format === 'Network Info' ? `
    Write-Host "Network Configuration:" -ForegroundColor Yellow
    $Info = docker inspect $ContainerName | ConvertFrom-Json
    $Networks = $Info.NetworkSettings.Networks
    
    foreach ($Network in $Networks.PSObject.Properties) {
        Write-Host "  Network: $($Network.Name)" -ForegroundColor Cyan
        Write-Host "    IP Address: $($Network.Value.IPAddress)" -ForegroundColor White
        Write-Host "    Gateway: $($Network.Value.Gateway)" -ForegroundColor White
        Write-Host "    MAC: $($Network.Value.MacAddress)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Port Mappings:" -ForegroundColor Yellow
    $Info.NetworkSettings.Ports.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name) -> $($_.Value.HostPort)" -ForegroundColor White
    }
    ` : format === 'Mount Info' ? `
    Write-Host "Volume Mounts:" -ForegroundColor Yellow
    $Info = docker inspect $ContainerName | ConvertFrom-Json
    
    $Info.Mounts | ForEach-Object {
        Write-Host "  Type: $($_.Type)" -ForegroundColor Cyan
        Write-Host "    Source: $($_.Source)" -ForegroundColor White
        Write-Host "    Destination: $($_.Destination)" -ForegroundColor White
        Write-Host "    Mode: $($_.Mode)" -ForegroundColor White
        Write-Host ""
    }
    ` : format === 'Environment' ? `
    Write-Host "Environment Variables:" -ForegroundColor Yellow
    $Info = docker inspect $ContainerName | ConvertFrom-Json
    
    $Info.Config.Env | ForEach-Object {
        $Parts = $_ -split "=", 2
        Write-Host "  $($Parts[0]): $($Parts[1])" -ForegroundColor White
    }
    ` : `
    Write-Host "Health Status:" -ForegroundColor Yellow
    $Info = docker inspect $ContainerName | ConvertFrom-Json
    
    if ($Info.State.Health) {
        Write-Host "  Status: $($Info.State.Health.Status)" -ForegroundColor $(if ($Info.State.Health.Status -eq 'healthy') { 'Green' } else { 'Red' })
        Write-Host "  Failing Streak: $($Info.State.Health.FailingStreak)" -ForegroundColor White
        Write-Host ""
        Write-Host "  Recent Logs:" -ForegroundColor Cyan
        $Info.State.Health.Log | Select-Object -Last 5 | ForEach-Object {
            Write-Host "    [$($_.Start)] Exit: $($_.ExitCode) - $($_.Output)" -ForegroundColor White
        }
    } else {
        Write-Host "  No health check configured" -ForegroundColor Yellow
    }
    `}
    
    Write-Host ""
    Write-Host "[SUCCESS] Inspection completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to inspect container: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-container-stats',
    name: 'Monitor Container Resource Usage',
    category: 'Container Management',
    description: 'Display real-time CPU, memory, network, and I/O statistics',
    parameters: [
      { id: 'containerNames', label: 'Container Names (comma-separated, leave empty for all)', type: 'textarea', required: false, placeholder: 'web-app, database' },
      { id: 'noStream', label: 'Snapshot Only (no live updates)', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const containerNames = params.containerNames ? (params.containerNames as string).split(',').map((n: string) => n.trim()).filter((n: string) => n) : [];
      const noStream = params.noStream;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Docker Container Stats
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Monitoring container resource usage..." -ForegroundColor Cyan
    
    ${containerNames.length > 0 ? `
    $Containers = @(${containerNames.map(c => `"${escapePowerShellString(c)}"`).join(', ')})
    ` : `
    $Containers = @()
    `}
    
    ${exportPath ? `
    Write-Host "Collecting stats snapshot for export..." -ForegroundColor Yellow
    
    $StatsOutput = if ($Containers.Count -gt 0) {
        docker stats --no-stream --format "{{.Container}},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}" $Containers
    } else {
        docker stats --no-stream --format "{{.Container}},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}"
    }
    
    $Results = @()
    $Results += "ContainerID,Name,CPU%,MemUsage,Mem%,NetIO,BlockIO,PIDs"
    $Results += $StatsOutput
    
    $Results | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    Write-Host "[SUCCESS] Stats exported to: ${exportPath}" -ForegroundColor Green
    
    # Also display the stats
    $StatsOutput | ForEach-Object {
        $Parts = $_ -split ","
        Write-Host "Container: $($Parts[1])" -ForegroundColor Cyan
        Write-Host "  CPU: $($Parts[2]) | Memory: $($Parts[3]) ($($Parts[4]))" -ForegroundColor White
    }
    ` : `
    ${noStream ? `
    if ($Containers.Count -gt 0) {
        docker stats --no-stream $Containers
    } else {
        docker stats --no-stream
    }
    ` : `
    Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Yellow
    Write-Host ""
    
    if ($Containers.Count -gt 0) {
        docker stats $Containers
    } else {
        docker stats
    }
    `}
    `}
    
} catch {
    Write-Error "Failed to get stats: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-container-rename',
    name: 'Rename Container',
    category: 'Container Management',
    description: 'Rename an existing Docker container',
    parameters: [
      { id: 'currentName', label: 'Current Container Name', type: 'text', required: true, placeholder: 'old-name' },
      { id: 'newName', label: 'New Container Name', type: 'text', required: true, placeholder: 'new-name' }
    ],
    scriptTemplate: (params) => {
      const currentName = escapePowerShellString(params.currentName);
      const newName = escapePowerShellString(params.newName);
      
      return `# Docker Rename Container
# Generated: ${new Date().toISOString()}

$CurrentName = "${currentName}"
$NewName = "${newName}"

try {
    Write-Host "Renaming container from '$CurrentName' to '$NewName'..." -ForegroundColor Cyan
    
    # Verify container exists
    $Container = docker ps -a --filter "name=$CurrentName" --format "{{.Names}}"
    
    if (-not $Container) {
        Write-Error "Container '$CurrentName' not found"
        exit 1
    }
    
    docker rename $CurrentName $NewName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Container renamed successfully!" -ForegroundColor Green
        Write-Host "  Old name: $CurrentName" -ForegroundColor Yellow
        Write-Host "  New name: $NewName" -ForegroundColor Green
        
        docker ps -a --filter "name=$NewName"
    } else {
        Write-Error "Rename failed"
    }
    
} catch {
    Write-Error "Failed to rename container: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-container-copy',
    name: 'Copy Files To/From Container',
    category: 'Container Management',
    description: 'Copy files between host and container',
    parameters: [
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'direction', label: 'Copy Direction', type: 'select', required: true, options: ['Host to Container', 'Container to Host'], defaultValue: 'Host to Container' },
      { id: 'hostPath', label: 'Host Path', type: 'path', required: true, placeholder: 'C:\\Files\\data' },
      { id: 'containerPath', label: 'Container Path', type: 'text', required: true, placeholder: '/app/data' }
    ],
    scriptTemplate: (params) => {
      const containerName = escapePowerShellString(params.containerName);
      const direction = params.direction;
      const hostPath = escapePowerShellString(params.hostPath);
      const containerPath = escapePowerShellString(params.containerPath);
      
      return `# Docker Copy Files
# Generated: ${new Date().toISOString()}

$ContainerName = "${containerName}"
$HostPath = "${hostPath}"
$ContainerPath = "${containerPath}"

try {
    ${direction === 'Host to Container' ? `
    Write-Host "Copying from host to container..." -ForegroundColor Cyan
    Write-Host "  Source: $HostPath" -ForegroundColor Yellow
    Write-Host "  Destination: ${containerName}:$ContainerPath" -ForegroundColor Yellow
    
    if (-not (Test-Path $HostPath)) {
        Write-Error "Source path does not exist: $HostPath"
        exit 1
    }
    
    docker cp $HostPath ${containerName}:$ContainerPath
    ` : `
    Write-Host "Copying from container to host..." -ForegroundColor Cyan
    Write-Host "  Source: ${containerName}:$ContainerPath" -ForegroundColor Yellow
    Write-Host "  Destination: $HostPath" -ForegroundColor Yellow
    
    # Ensure destination directory exists
    $DestDir = Split-Path -Parent $HostPath
    if ($DestDir -and -not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    }
    
    docker cp ${containerName}:$ContainerPath $HostPath
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Files copied successfully!" -ForegroundColor Green
    } else {
        Write-Error "Copy operation failed"
    }
    
} catch {
    Write-Error "Failed to copy files: $_"
}`;
    },
    isPremium: true
  },

  // Image Management Tasks
  {
    id: 'docker-image-build',
    name: 'Build Docker Image',
    category: 'Image Management',
    description: 'Build a Docker image from a Dockerfile',
    parameters: [
      { id: 'contextPath', label: 'Build Context Path', type: 'path', required: true, placeholder: 'C:\\Projects\\myapp' },
      { id: 'imageName', label: 'Image Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'tag', label: 'Tag', type: 'text', required: false, defaultValue: 'latest', placeholder: 'latest' },
      { id: 'dockerfile', label: 'Dockerfile Path (optional)', type: 'text', required: false, placeholder: 'Dockerfile.prod' },
      { id: 'buildArgs', label: 'Build Arguments (KEY=VALUE, comma-separated)', type: 'textarea', required: false, placeholder: 'NODE_ENV=production, VERSION=1.0.0' },
      { id: 'noCache', label: 'No Cache', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const contextPath = escapePowerShellString(params.contextPath);
      const imageName = escapePowerShellString(params.imageName);
      const tag = escapePowerShellString(params.tag || 'latest');
      const dockerfile = params.dockerfile ? escapePowerShellString(params.dockerfile) : '';
      const buildArgs = params.buildArgs ? (params.buildArgs as string).split(',').map((a: string) => a.trim()).filter((a: string) => a) : [];
      const noCache = params.noCache;
      
      return `# Docker Image Build
# Generated: ${new Date().toISOString()}

$ContextPath = "${contextPath}"
$ImageName = "${imageName}:${tag}"

try {
    Write-Host "Building Docker image: $ImageName..." -ForegroundColor Cyan
    
    $BuildArgs = @("build", "-t", $ImageName)
    
    ${dockerfile ? `$BuildArgs += @("-f", "${dockerfile}")` : ''}
    ${noCache ? `$BuildArgs += "--no-cache"` : ''}
    ${buildArgs.map(arg => `$BuildArgs += @("--build-arg", "${escapePowerShellString(arg)}")`).join('\n    ')}
    
    $BuildArgs += $ContextPath
    
    Write-Host "Running: docker $($BuildArgs -join ' ')" -ForegroundColor Yellow
    Write-Host ""
    
    $StartTime = Get-Date
    docker @BuildArgs
    $EndTime = Get-Date
    
    if ($LASTEXITCODE -eq 0) {
        $Duration = $EndTime - $StartTime
        Write-Host ""
        Write-Host "[SUCCESS] Image built successfully!" -ForegroundColor Green
        Write-Host "  Image: $ImageName" -ForegroundColor Cyan
        Write-Host "  Build time: $($Duration.TotalSeconds.ToString('F2')) seconds" -ForegroundColor Cyan
        
        # Show image details
        docker images $ImageName
    } else {
        Write-Error "Build failed"
    }
    
} catch {
    Write-Error "Failed to build image: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-image-tag',
    name: 'Tag Docker Image',
    category: 'Image Management',
    description: 'Create a tag for an existing Docker image',
    parameters: [
      { id: 'sourceImage', label: 'Source Image', type: 'text', required: true, placeholder: 'myapp:latest' },
      { id: 'targetImage', label: 'Target Image (with registry)', type: 'text', required: true, placeholder: 'registry.example.com/myapp:v1.0.0' }
    ],
    scriptTemplate: (params) => {
      const sourceImage = escapePowerShellString(params.sourceImage);
      const targetImage = escapePowerShellString(params.targetImage);
      
      return `# Docker Image Tag
# Generated: ${new Date().toISOString()}

$SourceImage = "${sourceImage}"
$TargetImage = "${targetImage}"

try {
    Write-Host "Tagging Docker image..." -ForegroundColor Cyan
    Write-Host "  Source: $SourceImage" -ForegroundColor Yellow
    Write-Host "  Target: $TargetImage" -ForegroundColor Yellow
    
    # Verify source image exists
    $Exists = docker images -q $SourceImage
    if (-not $Exists) {
        Write-Error "Source image not found: $SourceImage"
        exit 1
    }
    
    docker tag $SourceImage $TargetImage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Image tagged successfully!" -ForegroundColor Green
        docker images | Select-String -Pattern ($TargetImage -replace ":", "\\s+")
    } else {
        Write-Error "Tagging failed"
    }
    
} catch {
    Write-Error "Failed to tag image: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-image-export',
    name: 'Export Docker Image',
    category: 'Image Management',
    description: 'Save a Docker image to a tar archive file',
    parameters: [
      { id: 'imageName', label: 'Image Name', type: 'text', required: true, placeholder: 'myapp:latest' },
      { id: 'outputPath', label: 'Output File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\myapp.tar' },
      { id: 'compress', label: 'Compress with gzip', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const imageName = escapePowerShellString(params.imageName);
      const outputPath = escapePowerShellString(params.outputPath);
      const compress = params.compress;
      
      return `# Docker Image Export
# Generated: ${new Date().toISOString()}

$ImageName = "${imageName}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Exporting Docker image: $ImageName..." -ForegroundColor Cyan
    
    # Verify image exists
    $Exists = docker images -q $ImageName
    if (-not $Exists) {
        Write-Error "Image not found: $ImageName"
        exit 1
    }
    
    # Ensure output directory exists
    $OutputDir = Split-Path -Parent $OutputPath
    if ($OutputDir -and -not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    
    ${compress ? `
    Write-Host "Exporting and compressing..." -ForegroundColor Yellow
    $TempFile = "$OutputPath.tmp"
    docker save $ImageName -o $TempFile
    
    if ($LASTEXITCODE -eq 0) {
        # Compress the file
        $CompressedPath = if ($OutputPath -notmatch '\\.gz$') { "$OutputPath.gz" } else { $OutputPath }
        
        # Use .NET compression
        $InputStream = [System.IO.File]::OpenRead($TempFile)
        $OutputStream = [System.IO.File]::Create($CompressedPath)
        $GzipStream = [System.IO.Compression.GzipStream]::new($OutputStream, [System.IO.Compression.CompressionMode]::Compress)
        
        $InputStream.CopyTo($GzipStream)
        
        $GzipStream.Close()
        $OutputStream.Close()
        $InputStream.Close()
        
        Remove-Item $TempFile -Force
        
        $FileSize = (Get-Item $CompressedPath).Length / 1MB
        Write-Host "[SUCCESS] Image exported and compressed!" -ForegroundColor Green
        Write-Host "  File: $CompressedPath" -ForegroundColor Cyan
        Write-Host "  Size: $($FileSize.ToString('F2')) MB" -ForegroundColor Cyan
    }
    ` : `
    docker save $ImageName -o $OutputPath
    
    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $OutputPath).Length / 1MB
        Write-Host "[SUCCESS] Image exported successfully!" -ForegroundColor Green
        Write-Host "  File: $OutputPath" -ForegroundColor Cyan
        Write-Host "  Size: $($FileSize.ToString('F2')) MB" -ForegroundColor Cyan
    } else {
        Write-Error "Export failed"
    }
    `}
    
} catch {
    Write-Error "Failed to export image: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-image-import',
    name: 'Import Docker Image',
    category: 'Image Management',
    description: 'Load a Docker image from a tar archive file',
    parameters: [
      { id: 'inputPath', label: 'Input File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\myapp.tar' }
    ],
    scriptTemplate: (params) => {
      const inputPath = escapePowerShellString(params.inputPath);
      
      return `# Docker Image Import
# Generated: ${new Date().toISOString()}

$InputPath = "${inputPath}"

try {
    Write-Host "Importing Docker image from: $InputPath..." -ForegroundColor Cyan
    
    if (-not (Test-Path $InputPath)) {
        Write-Error "File not found: $InputPath"
        exit 1
    }
    
    $FileSize = (Get-Item $InputPath).Length / 1MB
    Write-Host "  File size: $($FileSize.ToString('F2')) MB" -ForegroundColor Yellow
    
    # Check if gzip compressed
    if ($InputPath -match '\\.gz$') {
        Write-Host "Decompressing gzip archive..." -ForegroundColor Yellow
        
        $TempFile = $InputPath -replace '\\.gz$', ''
        
        $InputStream = [System.IO.File]::OpenRead($InputPath)
        $GzipStream = [System.IO.Compression.GzipStream]::new($InputStream, [System.IO.Compression.CompressionMode]::Decompress)
        $OutputStream = [System.IO.File]::Create($TempFile)
        
        $GzipStream.CopyTo($OutputStream)
        
        $OutputStream.Close()
        $GzipStream.Close()
        $InputStream.Close()
        
        docker load -i $TempFile
        Remove-Item $TempFile -Force
    } else {
        docker load -i $InputPath
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Image imported successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Available images:" -ForegroundColor Yellow
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
    } else {
        Write-Error "Import failed"
    }
    
} catch {
    Write-Error "Failed to import image: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-image-inspect',
    name: 'Inspect Docker Image',
    category: 'Image Management',
    description: 'Display detailed information about a Docker image',
    parameters: [
      { id: 'imageName', label: 'Image Name', type: 'text', required: true, placeholder: 'nginx:latest' },
      { id: 'infoType', label: 'Information Type', type: 'select', required: true, options: ['Full Details', 'Layers', 'Environment', 'Ports', 'Labels'], defaultValue: 'Full Details' }
    ],
    scriptTemplate: (params) => {
      const imageName = escapePowerShellString(params.imageName);
      const infoType = params.infoType;
      
      return `# Docker Image Inspect
# Generated: ${new Date().toISOString()}

$ImageName = "${imageName}"

try {
    Write-Host "Inspecting image: $ImageName..." -ForegroundColor Cyan
    
    $ImageInfo = docker inspect $ImageName | ConvertFrom-Json
    
    if (-not $ImageInfo) {
        Write-Error "Image not found: $ImageName"
        exit 1
    }
    
    ${infoType === 'Full Details' ? `
    $ImageInfo | ConvertTo-Json -Depth 10
    ` : infoType === 'Layers' ? `
    Write-Host "Image Layers:" -ForegroundColor Yellow
    Write-Host "  Created: $($ImageInfo.Created)" -ForegroundColor White
    Write-Host "  Size: $(($ImageInfo.Size / 1MB).ToString('F2')) MB" -ForegroundColor White
    Write-Host ""
    Write-Host "Layer History:" -ForegroundColor Cyan
    
    docker history $ImageName --no-trunc --format "{{.CreatedBy}}" | ForEach-Object {
        $Line = $_ -replace '/bin/sh -c #\\(nop\\)\\s+', ''
        $Line = $Line -replace '/bin/sh -c ', 'RUN '
        if ($Line.Length -gt 100) {
            $Line = $Line.Substring(0, 97) + "..."
        }
        Write-Host "  $Line" -ForegroundColor White
    }
    ` : infoType === 'Environment' ? `
    Write-Host "Environment Variables:" -ForegroundColor Yellow
    $ImageInfo.Config.Env | ForEach-Object {
        $Parts = $_ -split "=", 2
        Write-Host "  $($Parts[0]) = $($Parts[1])" -ForegroundColor White
    }
    ` : infoType === 'Ports' ? `
    Write-Host "Exposed Ports:" -ForegroundColor Yellow
    if ($ImageInfo.Config.ExposedPorts) {
        $ImageInfo.Config.ExposedPorts.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name)" -ForegroundColor White
        }
    } else {
        Write-Host "  No ports exposed" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Entrypoint:" -ForegroundColor Yellow
    Write-Host "  $($ImageInfo.Config.Entrypoint -join ' ')" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Default Command:" -ForegroundColor Yellow
    Write-Host "  $($ImageInfo.Config.Cmd -join ' ')" -ForegroundColor White
    ` : `
    Write-Host "Image Labels:" -ForegroundColor Yellow
    if ($ImageInfo.Config.Labels) {
        $ImageInfo.Config.Labels.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
        }
    } else {
        Write-Host "  No labels defined" -ForegroundColor Gray
    }
    `}
    
    Write-Host ""
    Write-Host "[SUCCESS] Inspection completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to inspect image: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-image-history',
    name: 'View Image Build History',
    category: 'Image Management',
    description: 'Display the history of an image including all layers',
    parameters: [
      { id: 'imageName', label: 'Image Name', type: 'text', required: true, placeholder: 'myapp:latest' },
      { id: 'showFull', label: 'Show Full Commands', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const imageName = escapePowerShellString(params.imageName);
      const showFull = params.showFull;
      
      return `# Docker Image History
# Generated: ${new Date().toISOString()}

$ImageName = "${imageName}"

try {
    Write-Host "Image build history for: $ImageName" -ForegroundColor Cyan
    Write-Host ""
    
    ${showFull ? `
    docker history $ImageName --no-trunc --format "table {{.CreatedSince}}\t{{.Size}}\t{{.CreatedBy}}"
    ` : `
    docker history $ImageName --format "table {{.CreatedSince}}\t{{.Size}}\t{{.CreatedBy}}"
    `}
    
    Write-Host ""
    Write-Host "Total image size:" -ForegroundColor Yellow
    docker images $ImageName --format "  {{.Size}}"
    
    Write-Host ""
    Write-Host "[SUCCESS] History displayed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to get image history: $_"
}`;
    },
    isPremium: true
  },

  // Network Management Tasks
  {
    id: 'docker-network-connect',
    name: 'Connect Container to Network',
    category: 'Network Management',
    description: 'Connect a running container to a Docker network',
    parameters: [
      { id: 'networkName', label: 'Network Name', type: 'text', required: true, placeholder: 'my-network' },
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'ipAddress', label: 'IP Address (optional)', type: 'text', required: false, placeholder: '172.18.0.10' },
      { id: 'alias', label: 'Network Alias (optional)', type: 'text', required: false, placeholder: 'webserver' }
    ],
    scriptTemplate: (params) => {
      const networkName = escapePowerShellString(params.networkName);
      const containerName = escapePowerShellString(params.containerName);
      const ipAddress = params.ipAddress ? escapePowerShellString(params.ipAddress) : '';
      const alias = params.alias ? escapePowerShellString(params.alias) : '';
      
      return `# Docker Network Connect
# Generated: ${new Date().toISOString()}

$NetworkName = "${networkName}"
$ContainerName = "${containerName}"

try {
    Write-Host "Connecting container to network..." -ForegroundColor Cyan
    Write-Host "  Container: $ContainerName" -ForegroundColor Yellow
    Write-Host "  Network: $NetworkName" -ForegroundColor Yellow
    
    $ConnectArgs = @("network", "connect")
    
    ${ipAddress ? `$ConnectArgs += @("--ip", "${ipAddress}")` : ''}
    ${alias ? `$ConnectArgs += @("--alias", "${alias}")` : ''}
    
    $ConnectArgs += @($NetworkName, $ContainerName)
    
    docker @ConnectArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Container connected to network!" -ForegroundColor Green
        
        # Show network details
        Write-Host ""
        Write-Host "Network configuration:" -ForegroundColor Yellow
        $Info = docker inspect $ContainerName | ConvertFrom-Json
        $NetworkInfo = $Info.NetworkSettings.Networks.$NetworkName
        Write-Host "  IP Address: $($NetworkInfo.IPAddress)" -ForegroundColor White
        Write-Host "  Gateway: $($NetworkInfo.Gateway)" -ForegroundColor White
        ${alias ? `Write-Host "  Alias: ${alias}" -ForegroundColor White` : ''}
    } else {
        Write-Error "Connection failed"
    }
    
} catch {
    Write-Error "Failed to connect container: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-network-disconnect',
    name: 'Disconnect Container from Network',
    category: 'Network Management',
    description: 'Disconnect a container from a Docker network',
    parameters: [
      { id: 'networkName', label: 'Network Name', type: 'text', required: true, placeholder: 'my-network' },
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'force', label: 'Force Disconnect', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const networkName = escapePowerShellString(params.networkName);
      const containerName = escapePowerShellString(params.containerName);
      const force = params.force;
      
      return `# Docker Network Disconnect
# Generated: ${new Date().toISOString()}

$NetworkName = "${networkName}"
$ContainerName = "${containerName}"

try {
    Write-Host "Disconnecting container from network..." -ForegroundColor Cyan
    Write-Host "  Container: $ContainerName" -ForegroundColor Yellow
    Write-Host "  Network: $NetworkName" -ForegroundColor Yellow
    
    ${force ? `
    docker network disconnect --force $NetworkName $ContainerName
    ` : `
    docker network disconnect $NetworkName $ContainerName
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Container disconnected from network!" -ForegroundColor Green
        
        # Show remaining networks
        Write-Host ""
        Write-Host "Remaining network connections:" -ForegroundColor Yellow
        $Info = docker inspect $ContainerName | ConvertFrom-Json
        $Info.NetworkSettings.Networks.PSObject.Properties | ForEach-Object {
            Write-Host "  - $($_.Name): $($_.Value.IPAddress)" -ForegroundColor White
        }
    } else {
        Write-Error "Disconnect failed"
    }
    
} catch {
    Write-Error "Failed to disconnect container: $_"
}`;
    },
    isPremium: true
  },

  // Volume Management Tasks
  {
    id: 'docker-volume-backup',
    name: 'Backup Docker Volume',
    category: 'Volume Management',
    description: 'Create a backup of a Docker volume to a tar file',
    parameters: [
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'my-volume' },
      { id: 'backupPath', label: 'Backup File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\volume-backup.tar' },
      { id: 'compress', label: 'Compress Backup', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const volumeName = escapePowerShellString(params.volumeName);
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = params.compress;
      
      return `# Docker Volume Backup
# Generated: ${new Date().toISOString()}

$VolumeName = "${volumeName}"
$BackupPath = "${backupPath}"

try {
    Write-Host "Backing up Docker volume: $VolumeName..." -ForegroundColor Cyan
    
    # Verify volume exists
    $VolumeExists = docker volume ls -q -f "name=$VolumeName"
    if (-not $VolumeExists) {
        Write-Error "Volume not found: $VolumeName"
        exit 1
    }
    
    # Ensure backup directory exists
    $BackupDir = Split-Path -Parent $BackupPath
    if ($BackupDir -and -not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    Write-Host "Creating backup..." -ForegroundColor Yellow
    
    ${compress ? `
    $TempBackup = "$BackupPath.tmp"
    docker run --rm -v ${volumeName}:/source -v ${backupPath.replace(/[^\\\/]+$/, '')}:/backup alpine tar -cf /backup/backup.tar -C /source .
    
    if ($LASTEXITCODE -eq 0) {
        # Compress
        $SourceFile = Join-Path (Split-Path $BackupPath -Parent) "backup.tar"
        $CompressedPath = if ($BackupPath -notmatch '\\.gz$') { "$BackupPath.gz" } else { $BackupPath }
        
        $InputStream = [System.IO.File]::OpenRead($SourceFile)
        $OutputStream = [System.IO.File]::Create($CompressedPath)
        $GzipStream = [System.IO.Compression.GzipStream]::new($OutputStream, [System.IO.Compression.CompressionMode]::Compress)
        
        $InputStream.CopyTo($GzipStream)
        
        $GzipStream.Close()
        $OutputStream.Close()
        $InputStream.Close()
        
        Remove-Item $SourceFile -Force
        
        $FileSize = (Get-Item $CompressedPath).Length / 1MB
        Write-Host "[SUCCESS] Volume backed up and compressed!" -ForegroundColor Green
        Write-Host "  File: $CompressedPath" -ForegroundColor Cyan
        Write-Host "  Size: $($FileSize.ToString('F2')) MB" -ForegroundColor Cyan
    }
    ` : `
    docker run --rm -v ${volumeName}:/source -v ${backupPath.replace(/[^\\\/]+$/, '')}:/backup alpine tar -cf /backup/$(Split-Path $BackupPath -Leaf) -C /source .
    
    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $BackupPath).Length / 1MB
        Write-Host "[SUCCESS] Volume backed up successfully!" -ForegroundColor Green
        Write-Host "  File: $BackupPath" -ForegroundColor Cyan
        Write-Host "  Size: $($FileSize.ToString('F2')) MB" -ForegroundColor Cyan
    } else {
        Write-Error "Backup failed"
    }
    `}
    
} catch {
    Write-Error "Failed to backup volume: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-volume-restore',
    name: 'Restore Docker Volume',
    category: 'Volume Management',
    description: 'Restore a Docker volume from a tar backup file',
    parameters: [
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'my-volume' },
      { id: 'backupPath', label: 'Backup File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\volume-backup.tar' },
      { id: 'createVolume', label: 'Create Volume if Not Exists', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const volumeName = escapePowerShellString(params.volumeName);
      const backupPath = escapePowerShellString(params.backupPath);
      const createVolume = params.createVolume;
      
      return `# Docker Volume Restore
# Generated: ${new Date().toISOString()}

$VolumeName = "${volumeName}"
$BackupPath = "${backupPath}"

try {
    Write-Host "Restoring Docker volume: $VolumeName..." -ForegroundColor Cyan
    
    if (-not (Test-Path $BackupPath)) {
        Write-Error "Backup file not found: $BackupPath"
        exit 1
    }
    
    ${createVolume ? `
    # Create volume if it doesn't exist
    $VolumeExists = docker volume ls -q -f "name=$VolumeName"
    if (-not $VolumeExists) {
        Write-Host "Creating volume: $VolumeName" -ForegroundColor Yellow
        docker volume create $VolumeName
    }
    ` : ''}
    
    # Check if backup is compressed
    if ($BackupPath -match '\\.gz$') {
        Write-Host "Decompressing backup..." -ForegroundColor Yellow
        
        $TempFile = $BackupPath -replace '\\.gz$', ''
        
        $InputStream = [System.IO.File]::OpenRead($BackupPath)
        $GzipStream = [System.IO.Compression.GzipStream]::new($InputStream, [System.IO.Compression.CompressionMode]::Decompress)
        $OutputStream = [System.IO.File]::Create($TempFile)
        
        $GzipStream.CopyTo($OutputStream)
        
        $OutputStream.Close()
        $GzipStream.Close()
        $InputStream.Close()
        
        $BackupPath = $TempFile
        $CleanupTemp = $true
    } else {
        $CleanupTemp = $false
    }
    
    Write-Host "Restoring data..." -ForegroundColor Yellow
    
    $BackupDir = Split-Path $BackupPath -Parent
    $BackupFile = Split-Path $BackupPath -Leaf
    
    docker run --rm -v ${volumeName}:/target -v ${backupPath.replace(/[^\\\/]+$/, '')}:/backup alpine sh -c "rm -rf /target/* && tar -xf /backup/$BackupFile -C /target"
    
    if ($CleanupTemp) {
        Remove-Item $BackupPath -Force
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Volume restored successfully!" -ForegroundColor Green
        
        # Show volume info
        Write-Host ""
        Write-Host "Volume details:" -ForegroundColor Yellow
        docker volume inspect $VolumeName
    } else {
        Write-Error "Restore failed"
    }
    
} catch {
    Write-Error "Failed to restore volume: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-volume-list-contents',
    name: 'List Volume Contents',
    category: 'Volume Management',
    description: 'Display files and directories inside a Docker volume',
    parameters: [
      { id: 'volumeName', label: 'Volume Name', type: 'text', required: true, placeholder: 'my-volume' },
      { id: 'path', label: 'Path Inside Volume', type: 'text', required: false, defaultValue: '/', placeholder: '/' },
      { id: 'recursive', label: 'Recursive Listing', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const volumeName = escapePowerShellString(params.volumeName);
      const path = escapePowerShellString(params.path || '/');
      const recursive = params.recursive;
      
      return `# Docker Volume List Contents
# Generated: ${new Date().toISOString()}

$VolumeName = "${volumeName}"

try {
    Write-Host "Listing contents of volume: $VolumeName" -ForegroundColor Cyan
    Write-Host "Path: ${path}" -ForegroundColor Yellow
    Write-Host ""
    
    ${recursive ? `
    docker run --rm -v ${volumeName}:/data alpine find /data${path === '/' ? '' : path} -type f -o -type d | ForEach-Object {
        Write-Host $_ -ForegroundColor White
    }
    ` : `
    docker run --rm -v ${volumeName}:/data alpine ls -la /data${path === '/' ? '' : path}
    `}
    
    Write-Host ""
    Write-Host "[SUCCESS] Listing completed!" -ForegroundColor Green
    
    # Show volume size
    Write-Host ""
    Write-Host "Volume size:" -ForegroundColor Yellow
    docker run --rm -v ${volumeName}:/data alpine du -sh /data
    
} catch {
    Write-Error "Failed to list volume contents: $_"
}`;
    },
    isPremium: true
  },

  // Docker Compose Tasks
  {
    id: 'docker-compose-down',
    name: 'Stop Docker Compose Stack',
    category: 'Docker Compose',
    description: 'Stop and remove containers, networks, and optionally volumes',
    parameters: [
      { id: 'composePath', label: 'Docker Compose File Path', type: 'path', required: true, placeholder: 'C:\\Projects\\app\\docker-compose.yml' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'removeVolumes', label: 'Remove Volumes', type: 'boolean', required: false, defaultValue: false },
      { id: 'removeImages', label: 'Remove Images', type: 'select', required: false, options: ['none', 'local', 'all'], defaultValue: 'none' }
    ],
    scriptTemplate: (params) => {
      const composePath = escapePowerShellString(params.composePath);
      const projectName = escapePowerShellString(params.projectName);
      const removeVolumes = params.removeVolumes;
      const removeImages = params.removeImages || 'none';
      
      return `# Docker Compose Down
# Generated: ${new Date().toISOString()}

$ComposePath = "${composePath}"
$ProjectName = "${projectName}"

try {
    Write-Host "Stopping Docker Compose stack: $ProjectName..." -ForegroundColor Cyan
    
    $DownArgs = @("-f", $ComposePath, "-p", $ProjectName, "down")
    
    ${removeVolumes ? `$DownArgs += "-v"` : ''}
    ${removeImages !== 'none' ? `$DownArgs += @("--rmi", "${removeImages}")` : ''}
    
    docker-compose @DownArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Stack stopped successfully!" -ForegroundColor Green
        ${removeVolumes ? `Write-Host "  Volumes removed" -ForegroundColor Yellow` : ''}
        ${removeImages !== 'none' ? `Write-Host "  Images removed: ${removeImages}" -ForegroundColor Yellow` : ''}
    } else {
        Write-Error "Failed to stop stack"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-compose-scale',
    name: 'Scale Docker Compose Services',
    category: 'Docker Compose',
    description: 'Scale specific services to multiple replicas',
    parameters: [
      { id: 'composePath', label: 'Docker Compose File Path', type: 'path', required: true, placeholder: 'C:\\Projects\\app\\docker-compose.yml' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'web' },
      { id: 'replicas', label: 'Number of Replicas', type: 'number', required: true, defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const composePath = escapePowerShellString(params.composePath);
      const projectName = escapePowerShellString(params.projectName);
      const serviceName = escapePowerShellString(params.serviceName);
      const replicas = params.replicas || 3;
      
      return `# Docker Compose Scale
# Generated: ${new Date().toISOString()}

$ComposePath = "${composePath}"
$ProjectName = "${projectName}"
$ServiceName = "${serviceName}"

try {
    Write-Host "Scaling service '$ServiceName' to ${replicas} replicas..." -ForegroundColor Cyan
    
    docker-compose -f $ComposePath -p $ProjectName up -d --scale $ServiceName=${replicas}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Service scaled successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Running containers:" -ForegroundColor Yellow
        docker-compose -f $ComposePath -p $ProjectName ps
    } else {
        Write-Error "Scaling failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-compose-logs',
    name: 'View Docker Compose Logs',
    category: 'Docker Compose',
    description: 'Stream logs from all or specific services in a compose stack',
    parameters: [
      { id: 'composePath', label: 'Docker Compose File Path', type: 'path', required: true, placeholder: 'C:\\Projects\\app\\docker-compose.yml' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'serviceName', label: 'Service Name (optional, leave empty for all)', type: 'text', required: false },
      { id: 'tailLines', label: 'Tail Lines', type: 'number', required: false, defaultValue: 100 },
      { id: 'follow', label: 'Follow Logs', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const composePath = escapePowerShellString(params.composePath);
      const projectName = escapePowerShellString(params.projectName);
      const serviceName = params.serviceName ? escapePowerShellString(params.serviceName) : '';
      const tailLines = params.tailLines || 100;
      const follow = params.follow;
      
      return `# Docker Compose Logs
# Generated: ${new Date().toISOString()}

$ComposePath = "${composePath}"
$ProjectName = "${projectName}"

try {
    Write-Host "Fetching logs for stack: $ProjectName..." -ForegroundColor Cyan
    
    $LogArgs = @("-f", $ComposePath, "-p", $ProjectName, "logs", "--tail", "${tailLines}")
    
    ${follow ? `$LogArgs += "-f"` : ''}
    ${serviceName ? `$LogArgs += "${serviceName}"` : ''}
    
    ${follow ? `Write-Host "Press Ctrl+C to stop following logs..." -ForegroundColor Yellow
    Write-Host ""` : ''}
    
    docker-compose @LogArgs
    
} catch {
    Write-Error "Failed to get logs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-compose-ps',
    name: 'List Docker Compose Services',
    category: 'Docker Compose',
    description: 'Display status of all services in a compose stack',
    parameters: [
      { id: 'composePath', label: 'Docker Compose File Path', type: 'path', required: true, placeholder: 'C:\\Projects\\app\\docker-compose.yml' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'showAll', label: 'Show All (including stopped)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const composePath = escapePowerShellString(params.composePath);
      const projectName = escapePowerShellString(params.projectName);
      const showAll = params.showAll;
      
      return `# Docker Compose PS
# Generated: ${new Date().toISOString()}

$ComposePath = "${composePath}"
$ProjectName = "${projectName}"

try {
    Write-Host "Services in stack: $ProjectName" -ForegroundColor Cyan
    Write-Host ""
    
    $PsArgs = @("-f", $ComposePath, "-p", $ProjectName, "ps")
    ${showAll ? `$PsArgs += "-a"` : ''}
    
    docker-compose @PsArgs
    
    Write-Host ""
    Write-Host "Service health summary:" -ForegroundColor Yellow
    
    $Services = docker-compose -f $ComposePath -p $ProjectName ps -q
    $Running = ($Services | Where-Object { docker inspect --format '{{.State.Running}}' $_ -eq 'true' }).Count
    $Total = ($Services | Measure-Object).Count
    
    Write-Host "  Running: $Running / $Total" -ForegroundColor $(if ($Running -eq $Total) { 'Green' } else { 'Yellow' })
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-compose-build',
    name: 'Build Docker Compose Services',
    category: 'Docker Compose',
    description: 'Build or rebuild services defined in docker-compose',
    parameters: [
      { id: 'composePath', label: 'Docker Compose File Path', type: 'path', required: true, placeholder: 'C:\\Projects\\app\\docker-compose.yml' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'myapp' },
      { id: 'serviceName', label: 'Service Name (optional)', type: 'text', required: false },
      { id: 'noCache', label: 'No Cache', type: 'boolean', required: false, defaultValue: false },
      { id: 'parallel', label: 'Parallel Build', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const composePath = escapePowerShellString(params.composePath);
      const projectName = escapePowerShellString(params.projectName);
      const serviceName = params.serviceName ? escapePowerShellString(params.serviceName) : '';
      const noCache = params.noCache;
      const parallel = params.parallel;
      
      return `# Docker Compose Build
# Generated: ${new Date().toISOString()}

$ComposePath = "${composePath}"
$ProjectName = "${projectName}"

try {
    Write-Host "Building services for stack: $ProjectName..." -ForegroundColor Cyan
    
    $BuildArgs = @("-f", $ComposePath, "-p", $ProjectName, "build")
    
    ${noCache ? `$BuildArgs += "--no-cache"` : ''}
    ${parallel ? `$BuildArgs += "--parallel"` : ''}
    ${serviceName ? `$BuildArgs += "${serviceName}"` : ''}
    
    $StartTime = Get-Date
    docker-compose @BuildArgs
    $EndTime = Get-Date
    
    if ($LASTEXITCODE -eq 0) {
        $Duration = $EndTime - $StartTime
        Write-Host ""
        Write-Host "[SUCCESS] Build completed successfully!" -ForegroundColor Green
        Write-Host "  Duration: $($Duration.TotalSeconds.ToString('F2')) seconds" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Built images:" -ForegroundColor Yellow
        docker images --filter "reference=${projectName}*" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
    } else {
        Write-Error "Build failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  // Docker Swarm Tasks
  {
    id: 'docker-swarm-init',
    name: 'Initialize Docker Swarm',
    category: 'Docker Swarm',
    description: 'Initialize a new Docker Swarm cluster',
    parameters: [
      { id: 'advertiseAddr', label: 'Advertise Address (IP:Port)', type: 'text', required: false, placeholder: '192.168.1.10:2377' },
      { id: 'listenAddr', label: 'Listen Address', type: 'text', required: false, placeholder: '0.0.0.0:2377' }
    ],
    scriptTemplate: (params) => {
      const advertiseAddr = params.advertiseAddr ? escapePowerShellString(params.advertiseAddr) : '';
      const listenAddr = params.listenAddr ? escapePowerShellString(params.listenAddr) : '';
      
      return `# Docker Swarm Init
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Initializing Docker Swarm..." -ForegroundColor Cyan
    
    $InitArgs = @("swarm", "init")
    
    ${advertiseAddr ? `$InitArgs += @("--advertise-addr", "${advertiseAddr}")` : ''}
    ${listenAddr ? `$InitArgs += @("--listen-addr", "${listenAddr}")` : ''}
    
    docker @InitArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Swarm initialized successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Swarm status:" -ForegroundColor Yellow
        docker info --format '{{.Swarm.LocalNodeState}}'
        
        Write-Host ""
        Write-Host "To add workers, run on worker nodes:" -ForegroundColor Cyan
        docker swarm join-token worker
        
        Write-Host ""
        Write-Host "To add managers, run on manager nodes:" -ForegroundColor Cyan
        docker swarm join-token manager
    } else {
        Write-Error "Swarm initialization failed"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-swarm-join',
    name: 'Join Docker Swarm',
    category: 'Docker Swarm',
    description: 'Join a node to an existing Docker Swarm cluster',
    parameters: [
      { id: 'joinToken', label: 'Join Token', type: 'text', required: true, placeholder: 'SWMTKN-1-xxxxx' },
      { id: 'managerAddr', label: 'Manager Address (IP:Port)', type: 'text', required: true, placeholder: '192.168.1.10:2377' }
    ],
    scriptTemplate: (params) => {
      const joinToken = escapePowerShellString(params.joinToken);
      const managerAddr = escapePowerShellString(params.managerAddr);
      
      return `# Docker Swarm Join
# Generated: ${new Date().toISOString()}

$JoinToken = "${joinToken}"
$ManagerAddr = "${managerAddr}"

try {
    Write-Host "Joining Docker Swarm..." -ForegroundColor Cyan
    Write-Host "  Manager: $ManagerAddr" -ForegroundColor Yellow
    
    docker swarm join --token $JoinToken $ManagerAddr
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Successfully joined the Swarm!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Node information:" -ForegroundColor Yellow
        docker info --format 'Node ID: {{.Swarm.NodeID}}'
        docker info --format 'Is Manager: {{.Swarm.ControlAvailable}}'
    } else {
        Write-Error "Failed to join Swarm"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-swarm-services',
    name: 'Manage Swarm Services',
    category: 'Docker Swarm',
    description: 'Create, list, update, or remove Swarm services',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List', 'Create', 'Update', 'Remove', 'Scale'], defaultValue: 'List' },
      { id: 'serviceName', label: 'Service Name', type: 'text', required: false, placeholder: 'my-service' },
      { id: 'image', label: 'Image (for Create/Update)', type: 'text', required: false, placeholder: 'nginx:latest' },
      { id: 'replicas', label: 'Replicas', type: 'number', required: false, defaultValue: 1 },
      { id: 'ports', label: 'Port Mapping (for Create)', type: 'text', required: false, placeholder: '80:80' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const serviceName = params.serviceName ? escapePowerShellString(params.serviceName) : '';
      const image = params.image ? escapePowerShellString(params.image) : '';
      const replicas = params.replicas || 1;
      const ports = params.ports ? escapePowerShellString(params.ports) : '';
      
      return `# Docker Swarm Services
# Generated: ${new Date().toISOString()}

try {
    ${action === 'List' ? `
    Write-Host "Listing Swarm services..." -ForegroundColor Cyan
    docker service ls
    
    Write-Host ""
    Write-Host "Service tasks:" -ForegroundColor Yellow
    docker service ps $(docker service ls -q) 2>$null
    ` : action === 'Create' ? `
    ${serviceName && image ? `
    Write-Host "Creating service: ${serviceName}..." -ForegroundColor Cyan
    
    $CreateArgs = @("service", "create", "--name", "${serviceName}", "--replicas", "${replicas}")
    ${ports ? `$CreateArgs += @("-p", "${ports}")` : ''}
    $CreateArgs += "${image}"
    
    docker @CreateArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Service created successfully!" -ForegroundColor Green
        docker service ps ${serviceName}
    }
    ` : `
    Write-Host "Error: Service name and image are required for Create" -ForegroundColor Red
    exit 1
    `}
    ` : action === 'Update' ? `
    ${serviceName ? `
    Write-Host "Updating service: ${serviceName}..." -ForegroundColor Cyan
    
    $UpdateArgs = @("service", "update")
    ${image ? `$UpdateArgs += @("--image", "${image}")` : ''}
    $UpdateArgs += @("--replicas", "${replicas}")
    $UpdateArgs += "${serviceName}"
    
    docker @UpdateArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Service updated successfully!" -ForegroundColor Green
        docker service ps ${serviceName}
    }
    ` : `
    Write-Host "Error: Service name is required for Update" -ForegroundColor Red
    exit 1
    `}
    ` : action === 'Remove' ? `
    ${serviceName ? `
    $Confirm = Read-Host "Remove service ${serviceName}? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Removing service: ${serviceName}..." -ForegroundColor Cyan
        docker service rm ${serviceName}
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Service removed!" -ForegroundColor Green
        }
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
    }
    ` : `
    Write-Host "Error: Service name is required for Remove" -ForegroundColor Red
    exit 1
    `}
    ` : `
    ${serviceName ? `
    Write-Host "Scaling service: ${serviceName} to ${replicas} replicas..." -ForegroundColor Cyan
    docker service scale ${serviceName}=${replicas}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Service scaled successfully!" -ForegroundColor Green
        docker service ps ${serviceName}
    }
    ` : `
    Write-Host "Error: Service name is required for Scale" -ForegroundColor Red
    exit 1
    `}
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-swarm-stacks',
    name: 'Deploy Swarm Stack',
    category: 'Docker Swarm',
    description: 'Deploy a stack from a Docker Compose file to Swarm',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Deploy', 'Remove', 'List', 'Services'], defaultValue: 'Deploy' },
      { id: 'stackName', label: 'Stack Name', type: 'text', required: true, placeholder: 'mystack' },
      { id: 'composePath', label: 'Compose File (for Deploy)', type: 'path', required: false, placeholder: 'C:\\Projects\\docker-compose.yml' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const stackName = escapePowerShellString(params.stackName);
      const composePath = params.composePath ? escapePowerShellString(params.composePath) : '';
      
      return `# Docker Swarm Stacks
# Generated: ${new Date().toISOString()}

$StackName = "${stackName}"

try {
    ${action === 'Deploy' ? `
    ${composePath ? `
    Write-Host "Deploying stack: $StackName..." -ForegroundColor Cyan
    docker stack deploy -c "${composePath}" $StackName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Stack deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Stack services:" -ForegroundColor Yellow
        docker stack services $StackName
    }
    ` : `
    Write-Host "Error: Compose file path is required for Deploy" -ForegroundColor Red
    exit 1
    `}
    ` : action === 'Remove' ? `
    $Confirm = Read-Host "Remove stack $StackName? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Removing stack: $StackName..." -ForegroundColor Cyan
        docker stack rm $StackName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Stack removed!" -ForegroundColor Green
        }
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
    }
    ` : action === 'List' ? `
    Write-Host "Listing stacks..." -ForegroundColor Cyan
    docker stack ls
    ` : `
    Write-Host "Services in stack: $StackName" -ForegroundColor Cyan
    docker stack services $StackName
    
    Write-Host ""
    Write-Host "Stack tasks:" -ForegroundColor Yellow
    docker stack ps $StackName
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-swarm-secrets',
    name: 'Manage Swarm Secrets',
    category: 'Docker Swarm',
    description: 'Create, list, and remove Docker Swarm secrets',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'List', 'Remove', 'Inspect'], defaultValue: 'List' },
      { id: 'secretName', label: 'Secret Name', type: 'text', required: false, placeholder: 'my-secret' },
      { id: 'secretValue', label: 'Secret Value (for Create)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const secretName = params.secretName ? escapePowerShellString(params.secretName) : '';
      const secretValue = params.secretValue ? escapePowerShellString(params.secretValue) : '';
      
      return `# Docker Swarm Secrets
# Generated: ${new Date().toISOString()}

try {
    ${action === 'List' ? `
    Write-Host "Listing Swarm secrets..." -ForegroundColor Cyan
    docker secret ls
    ` : action === 'Create' ? `
    ${secretName ? `
    Write-Host "Creating secret: ${secretName}..." -ForegroundColor Cyan
    
    ${secretValue ? `
    echo "${secretValue}" | docker secret create ${secretName} -
    ` : `
    $SecretValue = Read-Host -AsSecureString -Prompt "Enter secret value"
    $ValuePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretValue))
    echo $ValuePlain | docker secret create ${secretName} -
    `}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Secret created!" -ForegroundColor Green
        docker secret ls
    }
    ` : `
    Write-Host "Error: Secret name is required" -ForegroundColor Red
    exit 1
    `}
    ` : action === 'Remove' ? `
    ${secretName ? `
    $Confirm = Read-Host "Remove secret ${secretName}? Type 'YES' to confirm"
    if ($Confirm -eq 'YES') {
        Write-Host "Removing secret: ${secretName}..." -ForegroundColor Cyan
        docker secret rm ${secretName}
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Secret removed!" -ForegroundColor Green
        }
    } else {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
    }
    ` : `
    Write-Host "Error: Secret name is required" -ForegroundColor Red
    exit 1
    `}
    ` : `
    ${secretName ? `
    Write-Host "Inspecting secret: ${secretName}..." -ForegroundColor Cyan
    docker secret inspect ${secretName}
    ` : `
    Write-Host "Error: Secret name is required" -ForegroundColor Red
    exit 1
    `}
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  // Monitoring Tasks
  {
    id: 'docker-container-events',
    name: 'Monitor Docker Events',
    category: 'Monitoring',
    description: 'Stream real-time Docker events from containers, images, and volumes',
    parameters: [
      { id: 'eventTypes', label: 'Event Types', type: 'select', required: true, options: ['all', 'container', 'image', 'volume', 'network'], defaultValue: 'all' },
      { id: 'since', label: 'Since (e.g., 1h, 30m)', type: 'text', required: false, placeholder: '1h' },
      { id: 'until', label: 'Until (for historical)', type: 'text', required: false },
      { id: 'filterName', label: 'Filter by Name', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const eventTypes = params.eventTypes === 'all' ? '' : params.eventTypes;
      const since = params.since ? escapePowerShellString(params.since) : '';
      const until = params.until ? escapePowerShellString(params.until) : '';
      const filterName = params.filterName ? escapePowerShellString(params.filterName) : '';
      
      return `# Docker Events Monitor
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Monitoring Docker events..." -ForegroundColor Cyan
    ${since || until ? '' : `Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Yellow`}
    Write-Host ""
    
    $EventArgs = @("events")
    
    ${eventTypes ? `$EventArgs += @("--filter", "type=${eventTypes}")` : ''}
    ${since ? `$EventArgs += @("--since", "${since}")` : ''}
    ${until ? `$EventArgs += @("--until", "${until}")` : ''}
    ${filterName ? `$EventArgs += @("--filter", "name=${filterName}")` : ''}
    
    $EventArgs += @("--format", "{{.Time}} {{.Type}} {{.Action}} {{.Actor.Attributes.name}}")
    
    docker @EventArgs | ForEach-Object {
        $Parts = $_ -split " ", 4
        $Time = $Parts[0]
        $Type = $Parts[1]
        $Action = $Parts[2]
        $Name = $Parts[3]
        
        $Color = switch ($Action) {
            { $_ -in @('start', 'create', 'attach') } { 'Green' }
            { $_ -in @('stop', 'kill', 'die', 'destroy') } { 'Red' }
            { $_ -in @('pause', 'unpause') } { 'Yellow' }
            default { 'White' }
        }
        
        Write-Host "[$Time] " -NoNewline -ForegroundColor Gray
        Write-Host "$Type " -NoNewline -ForegroundColor Cyan
        Write-Host "$Action " -NoNewline -ForegroundColor $Color
        Write-Host "$Name" -ForegroundColor White
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-healthcheck-report',
    name: 'Container Health Check Report',
    category: 'Monitoring',
    description: 'Generate a health status report for all containers',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false },
      { id: 'onlyUnhealthy', label: 'Show Only Unhealthy', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      const onlyUnhealthy = params.onlyUnhealthy;
      
      return `# Docker Container Health Check Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating container health report..." -ForegroundColor Cyan
    Write-Host ""
    
    $Containers = docker ps -a --format "{{.Names}}" | ForEach-Object {
        $Name = $_
        $Info = docker inspect $Name | ConvertFrom-Json
        
        $HealthStatus = if ($Info.State.Health) {
            $Info.State.Health.Status
        } else {
            "no healthcheck"
        }
        
        $FailingStreak = if ($Info.State.Health) {
            $Info.State.Health.FailingStreak
        } else {
            0
        }
        
        [PSCustomObject]@{
            Name = $Name
            Status = $Info.State.Status
            Health = $HealthStatus
            FailingStreak = $FailingStreak
            Uptime = if ($Info.State.StartedAt) {
                $Start = [DateTime]::Parse($Info.State.StartedAt)
                $Duration = (Get-Date) - $Start
                "$($Duration.Days)d $($Duration.Hours)h $($Duration.Minutes)m"
            } else { "N/A" }
        }
    }
    
    ${onlyUnhealthy ? `
    $Containers = $Containers | Where-Object { $_.Health -notin @('healthy', 'no healthcheck') -or $_.Status -ne 'running' }
    ` : ''}
    
    ${exportPath ? `
    $Containers | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "[SUCCESS] Report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    ` : ''}
    
    Write-Host "Container Health Status:" -ForegroundColor Yellow
    Write-Host ""
    
    $Containers | ForEach-Object {
        $HealthColor = switch ($_.Health) {
            'healthy' { 'Green' }
            'unhealthy' { 'Red' }
            'starting' { 'Yellow' }
            default { 'Gray' }
        }
        
        $StatusColor = if ($_.Status -eq 'running') { 'Green' } else { 'Red' }
        
        Write-Host "  $($_.Name)" -NoNewline -ForegroundColor White
        Write-Host " [" -NoNewline
        Write-Host "$($_.Status)" -NoNewline -ForegroundColor $StatusColor
        Write-Host "] " -NoNewline
        Write-Host "$($_.Health)" -NoNewline -ForegroundColor $HealthColor
        if ($_.FailingStreak -gt 0) {
            Write-Host " (failing: $($_.FailingStreak))" -NoNewline -ForegroundColor Red
        }
        Write-Host " - Uptime: $($_.Uptime)" -ForegroundColor Gray
    }
    
    Write-Host ""
    $Healthy = ($Containers | Where-Object { $_.Health -eq 'healthy' }).Count
    $Unhealthy = ($Containers | Where-Object { $_.Health -eq 'unhealthy' }).Count
    $NoCheck = ($Containers | Where-Object { $_.Health -eq 'no healthcheck' }).Count
    
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Healthy: $Healthy" -ForegroundColor Green
    Write-Host "  Unhealthy: $Unhealthy" -ForegroundColor $(if ($Unhealthy -gt 0) { 'Red' } else { 'Green' })
    Write-Host "  No Healthcheck: $NoCheck" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'docker-resource-limits',
    name: 'Set Container Resource Limits',
    category: 'Monitoring',
    description: 'Update CPU and memory limits for running containers',
    parameters: [
      { id: 'containerName', label: 'Container Name', type: 'text', required: true, placeholder: 'my-container' },
      { id: 'cpuLimit', label: 'CPU Limit (cores, e.g., 0.5, 2)', type: 'text', required: false, placeholder: '1.0' },
      { id: 'memoryLimit', label: 'Memory Limit (e.g., 512m, 2g)', type: 'text', required: false, placeholder: '512m' },
      { id: 'memoryReservation', label: 'Memory Reservation (e.g., 256m)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const containerName = escapePowerShellString(params.containerName);
      const cpuLimit = params.cpuLimit ? escapePowerShellString(params.cpuLimit) : '';
      const memoryLimit = params.memoryLimit ? escapePowerShellString(params.memoryLimit) : '';
      const memoryReservation = params.memoryReservation ? escapePowerShellString(params.memoryReservation) : '';
      
      return `# Docker Container Resource Limits
# Generated: ${new Date().toISOString()}

$ContainerName = "${containerName}"

try {
    Write-Host "Updating resource limits for: $ContainerName..." -ForegroundColor Cyan
    
    # Verify container exists
    $Exists = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}"
    if (-not $Exists) {
        Write-Error "Container not found: $ContainerName"
        exit 1
    }
    
    $UpdateArgs = @("update")
    
    ${cpuLimit ? `
    Write-Host "  CPU Limit: ${cpuLimit} cores" -ForegroundColor Yellow
    $UpdateArgs += @("--cpus", "${cpuLimit}")
    ` : ''}
    
    ${memoryLimit ? `
    Write-Host "  Memory Limit: ${memoryLimit}" -ForegroundColor Yellow
    $UpdateArgs += @("--memory", "${memoryLimit}")
    ` : ''}
    
    ${memoryReservation ? `
    Write-Host "  Memory Reservation: ${memoryReservation}" -ForegroundColor Yellow
    $UpdateArgs += @("--memory-reservation", "${memoryReservation}")
    ` : ''}
    
    $UpdateArgs += $ContainerName
    
    docker @UpdateArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Resource limits updated!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Current resource configuration:" -ForegroundColor Yellow
        $Info = docker inspect $ContainerName | ConvertFrom-Json
        Write-Host "  CPU Quota: $($Info.HostConfig.CpuQuota)" -ForegroundColor White
        Write-Host "  CPU Period: $($Info.HostConfig.CpuPeriod)" -ForegroundColor White
        Write-Host "  Memory: $(($Info.HostConfig.Memory / 1MB).ToString('F0')) MB" -ForegroundColor White
        Write-Host "  Memory Reservation: $(($Info.HostConfig.MemoryReservation / 1MB).ToString('F0')) MB" -ForegroundColor White
    } else {
        Write-Error "Failed to update resource limits"
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  }
];
