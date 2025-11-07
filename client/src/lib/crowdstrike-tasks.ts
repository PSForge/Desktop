import { escapePowerShellString } from './powershell-utils';

export interface CrowdStrikeTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface CrowdStrikeTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: CrowdStrikeTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const crowdstrikeTasks: CrowdStrikeTask[] = [
  {
    id: 'cs-bulk-isolate-hosts',
    name: 'Bulk Isolate/Contain Hosts',
    category: 'Bulk Operations',
    description: 'Isolate or un-isolate multiple hosts from network',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostIds', label: 'Host IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Contain', 'Lift Containment'], defaultValue: 'Contain' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostIdsRaw = (params.hostIds as string).split(',').map((n: string) => n.trim());
      const action = params.action === 'Contain' ? 'contain' : 'lift_containment';
      
      return `# CrowdStrike Bulk Host Isolation
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    # Authenticate
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostIds = @(${hostIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    Invoke-FalconContainment -Ids $HostIds -Action "${action}"
    
    Write-Host "✓ ${params.action} action initiated for $($HostIds.Count) hosts" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-query-detections',
    name: 'Query Security Detections',
    category: 'Threat Management',
    description: 'Retrieve and filter security detections',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'severity', label: 'Severity', type: 'select', required: true, options: ['All', 'Critical', 'High', 'Medium', 'Low'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const severity = params.severity;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Query Detections
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    ${severity !== 'All' ? `$Filter = "severity:'${severity}'"` : '$Filter = $null'}
    
    $Detections = Get-FalconDetection${severity !== 'All' ? ' -Filter $Filter' : ''}
    
    $Detections | Select-Object \`
        detection_id,
        severity,
        status,
        device.hostname,
        behaviors.tactic,
        first_behavior,
        last_behavior | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Detections exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Detections: $($Detections.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-get-host-details',
    name: 'Get Host Details',
    category: 'Host Management',
    description: 'Retrieve detailed information about hosts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostname', label: 'Hostname', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostname = escapePowerShellString(params.hostname);
      
      return `# CrowdStrike Get Host Details
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $Host = Get-FalconHost -Filter "hostname:'${hostname}'"
    
    if ($Host) {
        Write-Host "Host Information:" -ForegroundColor Cyan
        Write-Host "  Hostname: $($Host.hostname)"
        Write-Host "  OS: $($Host.os_version)"
        Write-Host "  Agent Version: $($Host.agent_version)"
        Write-Host "  Last Seen: $($Host.last_seen)"
        Write-Host "  Status: $($Host.status)"
    } else {
        Write-Host "⚠ Host not found: ${hostname}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
