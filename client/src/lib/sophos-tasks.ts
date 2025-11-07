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
  isPremium: boolean;
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
  ,
    isPremium: true
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
  ,
    isPremium: true
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
  ,
    isPremium: true
  },
  {
    id: 'sophos-threat-reports',
    name: 'Generate Threat Intelligence Reports',
    category: 'Common Admin Tasks',
    description: 'Generate detailed threat intelligence and analysis reports',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Threat Intelligence Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $StartDate = (Get-Date).AddDays(-${params.days})
    
    $Threats = Get-SophosAlert -FromDate $StartDate | Where-Object { $_.type -like "*threat*" }
    
    $Report = $Threats | Select-Object \`
        id,
        type,
        severity,
        category,
        endpoint,
        threat_name,
        when,
        description,
        mitigation_status | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Threat intelligence report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Threats Analyzed: $($Threats.Count)" -ForegroundColor Cyan
    Write-Host "  Period: Last ${params.days} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'sophos-web-control',
    name: 'Configure Web Control Policies',
    category: 'Common Admin Tasks',
    description: 'Configure web filtering and control policies',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyName', label: 'Web Control Policy Name', type: 'text', required: true },
      { id: 'blockedCategories', label: 'Blocked Categories (comma-separated)', type: 'textarea', required: true, placeholder: 'Social Networking,Gambling,Adult Content' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyName = escapePowerShellString(params.policyName);
      const categoriesRaw = (params.blockedCategories as string).split(',').map((n: string) => n.trim());
      
      return `# Sophos Central - Configure Web Control
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $PolicyName = "${policyName}"
    $BlockedCategories = @(${categoriesRaw.map(cat => `"${escapePowerShellString(cat)}"`).join(', ')})
    
    $WebPolicy = Get-SophosWebControlPolicy -Name $PolicyName
    
    if (-not $WebPolicy) {
        $WebPolicy = New-SophosWebControlPolicy -Name $PolicyName
        Write-Host "✓ Created new web control policy: $PolicyName" -ForegroundColor Green
    }
    
    foreach ($Category in $BlockedCategories) {
        Add-SophosWebControlBlockedCategory -PolicyId $WebPolicy.id -Category $Category
        Write-Host "  Blocked category: $Category" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Web control policy configured successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Web control configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'sophos-manage-roles',
    name: 'Manage Role Assignments',
    category: 'Common Admin Tasks',
    description: 'Assign and manage administrative roles for users',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'role', label: 'Role', type: 'select', required: true, options: ['Administrator', 'Security Analyst', 'Viewer', 'Endpoint Manager'], defaultValue: 'Viewer' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const userEmail = escapePowerShellString(params.userEmail);
      const role = escapePowerShellString(params.role);
      
      return `# Sophos Central - Manage Role Assignments
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $UserEmail = "${userEmail}"
    $Role = "${role}"
    
    $User = Get-SophosUser -Email $UserEmail
    
    if (-not $User) {
        Write-Host "⚠ User not found, creating invitation..." -ForegroundColor Yellow
        New-SophosUserInvitation -Email $UserEmail -Role $Role
        Write-Host "✓ Invitation sent to $UserEmail with role: $Role" -ForegroundColor Green
    } else {
        Set-SophosUserRole -UserId $User.id -Role $Role
        Write-Host "✓ User role updated: $UserEmail" -ForegroundColor Green
        Write-Host "  New Role: $Role" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Role assignment failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'sophos-endpoint-status',
    name: 'Monitor Endpoint Status and Coverage',
    category: 'Common Admin Tasks',
    description: 'Monitor endpoint protection status and coverage metrics',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Endpoint Status Monitoring
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $StatusReport = $Endpoints | Select-Object \`
        hostname,
        type,
        os,
        health_status,
        tamper_protection_enabled,
        last_seen,
        assigned_products,
        encryption_status,
        @{N='IsProtected';E={$_.health_status -eq 'good'}},
        @{N='DaysSinceLastSeen';E={((Get-Date) - [DateTime]$_.last_seen).Days}}
    
    $StatusReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalEndpoints = $Endpoints.Count
    $ProtectedEndpoints = ($Endpoints | Where-Object { $_.health_status -eq 'good' }).Count
    $CoveragePercent = [math]::Round(($ProtectedEndpoints / $TotalEndpoints) * 100, 2)
    
    Write-Host "✓ Endpoint status report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Coverage Summary:" -ForegroundColor Cyan
    Write-Host "  Total Endpoints: $TotalEndpoints"
    Write-Host "  Protected: $ProtectedEndpoints"
    Write-Host "  Coverage: $CoveragePercent%"
    
} catch {
    Write-Error "Status monitoring failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'sophos-manage-exclusions',
    name: 'Manage Exclusions and Scanning Rules',
    category: 'Common Admin Tasks',
    description: 'Configure scan exclusions and custom scanning rules',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exclusionType', label: 'Exclusion Type', type: 'select', required: true, options: ['File Path', 'File Extension', 'Process'], defaultValue: 'File Path' },
      { id: 'exclusionValue', label: 'Exclusion Value', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exclusionType = params.exclusionType;
      const exclusionValue = escapePowerShellString(params.exclusionValue);
      const policyId = escapePowerShellString(params.policyId);
      
      return `# Sophos Central - Manage Exclusions
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $PolicyId = "${policyId}"
    $ExclusionValue = "${exclusionValue}"
    
    $ExclusionParams = @{
        PolicyId = $PolicyId
        Value = $ExclusionValue
    }
    
    switch ("${exclusionType}") {
        "File Path" {
            $ExclusionParams.Type = "path"
        }
        "File Extension" {
            $ExclusionParams.Type = "extension"
        }
        "Process" {
            $ExclusionParams.Type = "process"
        }
    }
    
    Add-SophosScanExclusion @ExclusionParams
    
    Write-Host "✓ Exclusion added successfully" -ForegroundColor Green
    Write-Host "  Type: ${exclusionType}" -ForegroundColor Cyan
    Write-Host "  Value: $ExclusionValue" -ForegroundColor Cyan
    Write-Host "  Policy ID: $PolicyId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Exclusion configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
