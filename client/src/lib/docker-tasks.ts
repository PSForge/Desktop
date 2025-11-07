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
  }
];
