import { escapePowerShellString } from './powershell-utils';

export interface SophosTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface SophosTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: SophosTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
}

export const sophosTasks: SophosTask[] = [
  {
    id: 'sophos-bulk-isolate-endpoints',
    name: 'Bulk Isolate Endpoints',
    category: 'Bulk Operations',
    description: 'Isolate multiple endpoints from network',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Isolate', 'Deisolate'], defaultValue: 'Isolate' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const endpointIdsRaw = (params.endpointIds as string).split(',').map((n: string) => n.trim());
      const action = params.action.toLowerCase();
      
      return `# Sophos Central Bulk Endpoint Isolation
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    foreach ($EndpointId in $EndpointIds) {
        Set-SophosEndpointIsolation -EndpointId $EndpointId -Action "${action}"
        Write-Host "✓ ${params.action}d endpoint: $EndpointId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk endpoint operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  },
  {
    id: 'sophos-get-alerts',
    name: 'Retrieve Security Alerts',
    category: 'Alert Management',
    description: 'Get and filter security alerts',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'severity', label: 'Severity Filter', type: 'select', required: true, options: ['All', 'Critical', 'High', 'Medium', 'Low'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const severity = params.severity;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Get Security Alerts
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Alerts = Get-SophosAlert${severity !== 'All' ? ` -Severity "${severity}"` : ''}
    
    $Alerts | Select-Object \`
        id,
        severity,
        type,
        category,
        endpoint,
        when,
        description | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Alerts exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Alerts: $($Alerts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  },
  {
    id: 'sophos-manage-policy',
    name: 'Manage Endpoint Policy',
    category: 'Policy Management',
    description: 'Configure endpoint protection policy',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs to Apply (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyName = escapePowerShellString(params.policyName);
      const endpointIdsRaw = (params.endpointIds as string).split(',').map((n: string) => n.trim());
      
      return `# Sophos Central - Manage Endpoint Policy
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Policy = Get-SophosPolicy -Name "${policyName}"
    $EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    foreach ($EndpointId in $EndpointIds) {
        Set-SophosEndpointPolicy -EndpointId $EndpointId -PolicyId $Policy.id
        Write-Host "✓ Policy applied to: $EndpointId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Policy '${policyName}' applied to $($EndpointIds.Count) endpoints" -ForegroundColor Green
    
} catch {
    Write-Error "Policy assignment failed: $_"
}`;
    }
  }
];
