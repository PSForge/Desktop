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
        Write-Host "[SUCCESS] ${params.action}d endpoint: $EndpointId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk endpoint operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    },
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
    
    Write-Host "[SUCCESS] Alerts exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Alerts: $($Alerts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    },
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
        Write-Host "[SUCCESS] Policy applied to: $EndpointId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Policy '${policyName}' applied to $($EndpointIds.Count) endpoints" -ForegroundColor Green
    
} catch {
    Write-Error "Policy assignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-threat-reports',
    name: 'Generate Threat Intelligence Reports',
    category: 'Reporting',
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
    
    Write-Host "[SUCCESS] Threat intelligence report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Threats Analyzed: $($Threats.Count)" -ForegroundColor Cyan
    Write-Host "  Period: Last ${params.days} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-web-control',
    name: 'Configure Web Control Policies',
    category: 'Policy Management',
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
        Write-Host "[SUCCESS] Created new web control policy: $PolicyName" -ForegroundColor Green
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
    },
    isPremium: true
  },
  {
    id: 'sophos-manage-roles',
    name: 'Manage Role Assignments',
    category: 'Integration',
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
        Write-Host "[WARNING] User not found, creating invitation..." -ForegroundColor Yellow
        New-SophosUserInvitation -Email $UserEmail -Role $Role
        Write-Host "[SUCCESS] Invitation sent to $UserEmail with role: $Role" -ForegroundColor Green
    } else {
        Set-SophosUserRole -UserId $User.id -Role $Role
        Write-Host "[SUCCESS] User role updated: $UserEmail" -ForegroundColor Green
        Write-Host "  New Role: $Role" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Role assignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-endpoint-status',
    name: 'Monitor Endpoint Status and Coverage',
    category: 'Reporting',
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
    
    Write-Host "[SUCCESS] Endpoint status report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Coverage Summary:" -ForegroundColor Cyan
    Write-Host "  Total Endpoints: $TotalEndpoints"
    Write-Host "  Protected: $ProtectedEndpoints"
    Write-Host "  Coverage: $CoveragePercent%"
    
} catch {
    Write-Error "Status monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-manage-exclusions',
    name: 'Add Scan Exclusions',
    category: 'Exclusions',
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
    
    Write-Host "[SUCCESS] Exclusion added successfully" -ForegroundColor Green
    Write-Host "  Type: ${exclusionType}" -ForegroundColor Cyan
    Write-Host "  Value: $ExclusionValue" -ForegroundColor Cyan
    Write-Host "  Policy ID: $PolicyId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Exclusion configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-scan-endpoints',
    name: 'Trigger Endpoint Scan',
    category: 'Endpoint Protection',
    description: 'Initiate on-demand malware scan on selected endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'scanType', label: 'Scan Type', type: 'select', required: true, options: ['Quick', 'Full', 'Custom'], defaultValue: 'Quick' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const endpointIdsRaw = (params.endpointIds as string).split(',').map((n: string) => n.trim());
      const scanType = escapePowerShellString(params.scanType);
      
      return `# Sophos Central - Trigger Endpoint Scan
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $ScanType = "${scanType}"
    
    $Results = @()
    
    foreach ($EndpointId in $EndpointIds) {
        $ScanResult = Invoke-SophosScan -EndpointId $EndpointId -Type $ScanType
        $Results += [PSCustomObject]@{
            EndpointId = $EndpointId
            ScanId = $ScanResult.id
            Status = $ScanResult.status
            StartedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        Write-Host "[SUCCESS] Scan initiated on endpoint: $EndpointId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Scan Summary:" -ForegroundColor Cyan
    Write-Host "  Scan Type: $ScanType"
    Write-Host "  Endpoints Scanned: $($EndpointIds.Count)"
    
    $Results | Format-Table -AutoSize
    
} catch {
    Write-Error "Scan operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-update-definitions',
    name: 'Update Virus Definitions',
    category: 'Endpoint Protection',
    description: 'Force update of virus definitions on endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated, leave empty for all)', type: 'textarea', required: false },
      { id: 'forceUpdate', label: 'Force Update', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const endpointIdsRaw = params.endpointIds ? (params.endpointIds as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Sophos Central - Update Virus Definitions
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    ${endpointIdsRaw.length > 0 ? `$EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})` : `$EndpointIds = (Get-SophosEndpoint).id`}
    
    $UpdateResults = @()
    
    foreach ($EndpointId in $EndpointIds) {
        try {
            $Result = Update-SophosEndpointDefinitions -EndpointId $EndpointId -Force:$${params.forceUpdate ? 'true' : 'false'}
            $UpdateResults += [PSCustomObject]@{
                EndpointId = $EndpointId
                Status = "Update Triggered"
                Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            Write-Host "[SUCCESS] Definition update triggered: $EndpointId" -ForegroundColor Green
        } catch {
            $UpdateResults += [PSCustomObject]@{
                EndpointId = $EndpointId
                Status = "Failed: $_"
                Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            Write-Host "[FAILED] Failed to update: $EndpointId" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Definition Update Summary:" -ForegroundColor Cyan
    Write-Host "  Total Endpoints: $($EndpointIds.Count)"
    Write-Host "  Successful: $($UpdateResults | Where-Object { $_.Status -eq 'Update Triggered' } | Measure-Object).Count"
    
} catch {
    Write-Error "Definition update operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-quarantine-management',
    name: 'Manage Quarantined Items',
    category: 'Endpoint Protection',
    description: 'View, restore, or delete quarantined threats',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List', 'Restore', 'Delete'], defaultValue: 'List' },
      { id: 'quarantineId', label: 'Quarantine Item ID (for Restore/Delete)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (for List)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const action = params.action;
      const quarantineId = escapePowerShellString(params.quarantineId || '');
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Sophos Central - Quarantine Management
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    switch ("${action}") {
        "List" {
            $QuarantinedItems = Get-SophosQuarantinedItems
            
            Write-Host "Quarantined Items:" -ForegroundColor Cyan
            $QuarantinedItems | Format-Table -Property id, threat_name, endpoint, quarantined_at, file_path -AutoSize
            
            ${exportPath ? `$QuarantinedItems | Export-Csv -Path "${exportPath}" -NoTypeInformation
            Write-Host "[SUCCESS] Exported to: ${exportPath}" -ForegroundColor Green` : `Write-Host "Total items: $($QuarantinedItems.Count)" -ForegroundColor Cyan`}
        }
        "Restore" {
            if ([string]::IsNullOrEmpty("${quarantineId}")) {
                throw "Quarantine Item ID is required for restore operation"
            }
            Restore-SophosQuarantinedItem -Id "${quarantineId}"
            Write-Host "[SUCCESS] Item restored successfully: ${quarantineId}" -ForegroundColor Green
        }
        "Delete" {
            if ([string]::IsNullOrEmpty("${quarantineId}")) {
                throw "Quarantine Item ID is required for delete operation"
            }
            Remove-SophosQuarantinedItem -Id "${quarantineId}" -Confirm:$false
            Write-Host "[SUCCESS] Item deleted permanently: ${quarantineId}" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Error "Quarantine management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-endpoint-health-report',
    name: 'Generate Endpoint Health Report',
    category: 'Endpoint Protection',
    description: 'Generate comprehensive endpoint health and protection status report',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'includeOffline', label: 'Include Offline Endpoints', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Endpoint Health Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    ${!params.includeOffline ? `$Endpoints = $Endpoints | Where-Object { $_.health_status -ne 'offline' }` : ''}
    
    $HealthReport = $Endpoints | ForEach-Object {
        [PSCustomObject]@{
            Hostname = $_.hostname
            OS = $_.os
            HealthStatus = $_.health_status
            ThreatStatus = $_.threat_status
            LastSeen = $_.last_seen
            DefinitionVersion = $_.definition_version
            AgentVersion = $_.agent_version
            TamperProtection = $_.tamper_protection_enabled
            EncryptionStatus = $_.encryption_status
            DaysSinceLastSeen = ((Get-Date) - [DateTime]$_.last_seen).Days
            NeedsAttention = ($_.health_status -ne 'good' -or $_.threat_status -ne 'clean')
        }
    }
    
    $HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $Summary = @{
        TotalEndpoints = $Endpoints.Count
        Healthy = ($HealthReport | Where-Object { $_.HealthStatus -eq 'good' }).Count
        NeedsAttention = ($HealthReport | Where-Object { $_.NeedsAttention }).Count
        Offline = ($HealthReport | Where-Object { $_.HealthStatus -eq 'offline' }).Count
    }
    
    Write-Host "[SUCCESS] Health report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Health Summary:" -ForegroundColor Cyan
    Write-Host "  Total Endpoints: $($Summary.TotalEndpoints)"
    Write-Host "  Healthy: $($Summary.Healthy)" -ForegroundColor Green
    Write-Host "  Needs Attention: $($Summary.NeedsAttention)" -ForegroundColor Yellow
    Write-Host "  Offline: $($Summary.Offline)" -ForegroundColor Red
    
} catch {
    Write-Error "Health report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-create-policy',
    name: 'Create Protection Policy',
    category: 'Policy Management',
    description: 'Create a new endpoint protection policy with custom settings',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'policyType', label: 'Policy Type', type: 'select', required: true, options: ['Threat Protection', 'Peripheral Control', 'Application Control', 'Data Loss Prevention'], defaultValue: 'Threat Protection' },
      { id: 'description', label: 'Description', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyName = escapePowerShellString(params.policyName);
      const policyType = escapePowerShellString(params.policyType);
      const description = escapePowerShellString(params.description || '');
      
      return `# Sophos Central - Create Protection Policy
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $PolicyParams = @{
        Name = "${policyName}"
        Type = "${policyType}"
        ${description ? `Description = "${description}"` : ''}
    }
    
    $ExistingPolicy = Get-SophosPolicy -Name "${policyName}" -ErrorAction SilentlyContinue
    
    if ($ExistingPolicy) {
        Write-Host "[WARNING] Policy already exists: ${policyName}" -ForegroundColor Yellow
        Write-Host "  Policy ID: $($ExistingPolicy.id)" -ForegroundColor Cyan
    } else {
        $NewPolicy = New-SophosPolicy @PolicyParams
        
        Write-Host "[SUCCESS] Policy created successfully" -ForegroundColor Green
        Write-Host "  Name: ${policyName}" -ForegroundColor Cyan
        Write-Host "  Type: ${policyType}" -ForegroundColor Cyan
        Write-Host "  Policy ID: $($NewPolicy.id)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-policy-compliance-report',
    name: 'Generate Policy Compliance Report',
    category: 'Policy Management',
    description: 'Generate report showing endpoint policy compliance status',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID (leave empty for all policies)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyId = escapePowerShellString(params.policyId || '');
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Policy Compliance Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    ${policyId ? `$Policies = @(Get-SophosPolicy -Id "${policyId}")` : `$Policies = Get-SophosPolicy`}
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $ComplianceReport = @()
    
    foreach ($Policy in $Policies) {
        $AssignedEndpoints = $Endpoints | Where-Object { $_.policy_id -eq $Policy.id }
        $CompliantEndpoints = $AssignedEndpoints | Where-Object { $_.health_status -eq 'good' }
        
        $ComplianceReport += [PSCustomObject]@{
            PolicyName = $Policy.name
            PolicyId = $Policy.id
            PolicyType = $Policy.type
            TotalAssigned = $AssignedEndpoints.Count
            Compliant = $CompliantEndpoints.Count
            NonCompliant = $AssignedEndpoints.Count - $CompliantEndpoints.Count
            ComplianceRate = if ($AssignedEndpoints.Count -gt 0) { 
                [math]::Round(($CompliantEndpoints.Count / $AssignedEndpoints.Count) * 100, 2) 
            } else { 0 }
        }
    }
    
    $ComplianceReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Compliance report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Policy Compliance Summary:" -ForegroundColor Cyan
    $ComplianceReport | Format-Table PolicyName, TotalAssigned, Compliant, NonCompliant, ComplianceRate -AutoSize
    
} catch {
    Write-Error "Compliance report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-clone-policy',
    name: 'Clone Existing Policy',
    category: 'Policy Management',
    description: 'Create a copy of an existing policy with a new name',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'sourcePolicyId', label: 'Source Policy ID', type: 'text', required: true },
      { id: 'newPolicyName', label: 'New Policy Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const sourcePolicyId = escapePowerShellString(params.sourcePolicyId);
      const newPolicyName = escapePowerShellString(params.newPolicyName);
      
      return `# Sophos Central - Clone Policy
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $SourcePolicy = Get-SophosPolicy -Id "${sourcePolicyId}"
    
    if (-not $SourcePolicy) {
        throw "Source policy not found: ${sourcePolicyId}"
    }
    
    $ClonedPolicy = Copy-SophosPolicy -SourceId "${sourcePolicyId}" -NewName "${newPolicyName}"
    
    Write-Host "[SUCCESS] Policy cloned successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Source Policy:" -ForegroundColor Cyan
    Write-Host "  Name: $($SourcePolicy.name)"
    Write-Host "  ID: ${sourcePolicyId}"
    Write-Host ""
    Write-Host "New Policy:" -ForegroundColor Cyan
    Write-Host "  Name: ${newPolicyName}"
    Write-Host "  ID: $($ClonedPolicy.id)"
    
} catch {
    Write-Error "Policy cloning failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-create-group',
    name: 'Create Endpoint Group',
    category: 'Group Management',
    description: 'Create a new endpoint group for organization',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'groupType', label: 'Group Type', type: 'select', required: true, options: ['computer', 'server'], defaultValue: 'computer' },
      { id: 'description', label: 'Description', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const groupName = escapePowerShellString(params.groupName);
      const groupType = escapePowerShellString(params.groupType);
      const description = escapePowerShellString(params.description || '');
      
      return `# Sophos Central - Create Endpoint Group
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $GroupParams = @{
        Name = "${groupName}"
        Type = "${groupType}"
        ${description ? `Description = "${description}"` : ''}
    }
    
    $ExistingGroup = Get-SophosEndpointGroup -Name "${groupName}" -ErrorAction SilentlyContinue
    
    if ($ExistingGroup) {
        Write-Host "[WARNING] Group already exists: ${groupName}" -ForegroundColor Yellow
        Write-Host "  Group ID: $($ExistingGroup.id)" -ForegroundColor Cyan
    } else {
        $NewGroup = New-SophosEndpointGroup @GroupParams
        
        Write-Host "[SUCCESS] Group created successfully" -ForegroundColor Green
        Write-Host "  Name: ${groupName}" -ForegroundColor Cyan
        Write-Host "  Type: ${groupType}" -ForegroundColor Cyan
        Write-Host "  Group ID: $($NewGroup.id)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Group creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-move-endpoints-to-group',
    name: 'Move Endpoints to Group',
    category: 'Group Management',
    description: 'Move one or more endpoints to a specified group',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'targetGroupId', label: 'Target Group ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const endpointIdsRaw = (params.endpointIds as string).split(',').map((n: string) => n.trim());
      const targetGroupId = escapePowerShellString(params.targetGroupId);
      
      return `# Sophos Central - Move Endpoints to Group
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $TargetGroupId = "${targetGroupId}"
    
    $TargetGroup = Get-SophosEndpointGroup -Id $TargetGroupId
    
    if (-not $TargetGroup) {
        throw "Target group not found: $TargetGroupId"
    }
    
    $MoveResults = @()
    
    foreach ($EndpointId in $EndpointIds) {
        try {
            Move-SophosEndpointToGroup -EndpointId $EndpointId -GroupId $TargetGroupId
            $MoveResults += [PSCustomObject]@{
                EndpointId = $EndpointId
                Status = "Moved"
                TargetGroup = $TargetGroup.name
            }
            Write-Host "[SUCCESS] Moved endpoint: $EndpointId" -ForegroundColor Green
        } catch {
            $MoveResults += [PSCustomObject]@{
                EndpointId = $EndpointId
                Status = "Failed: $_"
                TargetGroup = $TargetGroup.name
            }
            Write-Host "[FAILED] Failed to move: $EndpointId" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Move Summary:" -ForegroundColor Cyan
    Write-Host "  Target Group: $($TargetGroup.name)"
    Write-Host "  Total Endpoints: $($EndpointIds.Count)"
    Write-Host "  Successfully Moved: $($MoveResults | Where-Object { $_.Status -eq 'Moved' } | Measure-Object).Count"
    
} catch {
    Write-Error "Endpoint move operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-group-membership-report',
    name: 'Generate Group Membership Report',
    category: 'Group Management',
    description: 'Generate report of all endpoint groups and their members',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Group Membership Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Groups = Get-SophosEndpointGroup
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $MembershipReport = @()
    
    foreach ($Group in $Groups) {
        $GroupMembers = $Endpoints | Where-Object { $_.group_id -eq $Group.id }
        
        foreach ($Member in $GroupMembers) {
            $MembershipReport += [PSCustomObject]@{
                GroupName = $Group.name
                GroupId = $Group.id
                GroupType = $Group.type
                EndpointName = $Member.hostname
                EndpointId = $Member.id
                OS = $Member.os
                HealthStatus = $Member.health_status
                LastSeen = $Member.last_seen
            }
        }
        
        if ($GroupMembers.Count -eq 0) {
            $MembershipReport += [PSCustomObject]@{
                GroupName = $Group.name
                GroupId = $Group.id
                GroupType = $Group.type
                EndpointName = "(No members)"
                EndpointId = ""
                OS = ""
                HealthStatus = ""
                LastSeen = ""
            }
        }
    }
    
    $MembershipReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Group membership report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Group Summary:" -ForegroundColor Cyan
    $Groups | ForEach-Object {
        $MemberCount = ($Endpoints | Where-Object { $_.group_id -eq $_.id }).Count
        Write-Host "  $($_.name): $MemberCount members"
    }
    
} catch {
    Write-Error "Group membership report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-remove-exclusion',
    name: 'Remove Scan Exclusion',
    category: 'Exclusions',
    description: 'Remove an existing scan exclusion from a policy',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exclusionId', label: 'Exclusion ID', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exclusionId = escapePowerShellString(params.exclusionId);
      const policyId = escapePowerShellString(params.policyId);
      
      return `# Sophos Central - Remove Scan Exclusion
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $ExclusionId = "${exclusionId}"
    $PolicyId = "${policyId}"
    
    $Exclusion = Get-SophosScanExclusion -PolicyId $PolicyId -Id $ExclusionId
    
    if (-not $Exclusion) {
        throw "Exclusion not found: $ExclusionId"
    }
    
    Remove-SophosScanExclusion -PolicyId $PolicyId -Id $ExclusionId -Confirm:$false
    
    Write-Host "[SUCCESS] Exclusion removed successfully" -ForegroundColor Green
    Write-Host "  Exclusion ID: $ExclusionId" -ForegroundColor Cyan
    Write-Host "  Type: $($Exclusion.type)" -ForegroundColor Cyan
    Write-Host "  Value: $($Exclusion.value)" -ForegroundColor Cyan
    Write-Host "  Policy ID: $PolicyId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Exclusion removal failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-exclusion-audit',
    name: 'Audit Scan Exclusions',
    category: 'Exclusions',
    description: 'Generate audit report of all configured scan exclusions',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Exclusion Audit Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Policies = Get-SophosPolicy
    $ExclusionReport = @()
    
    foreach ($Policy in $Policies) {
        $Exclusions = Get-SophosScanExclusion -PolicyId $Policy.id
        
        foreach ($Exclusion in $Exclusions) {
            $ExclusionReport += [PSCustomObject]@{
                PolicyName = $Policy.name
                PolicyId = $Policy.id
                ExclusionId = $Exclusion.id
                Type = $Exclusion.type
                Value = $Exclusion.value
                Comment = $Exclusion.comment
                CreatedAt = $Exclusion.created_at
                CreatedBy = $Exclusion.created_by
            }
        }
    }
    
    $ExclusionReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Exclusion audit report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Exclusion Summary:" -ForegroundColor Cyan
    Write-Host "  Total Exclusions: $($ExclusionReport.Count)"
    Write-Host "  Policies with Exclusions: $($ExclusionReport | Select-Object PolicyId -Unique | Measure-Object).Count"
    Write-Host ""
    Write-Host "By Type:" -ForegroundColor Cyan
    $ExclusionReport | Group-Object Type | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    
} catch {
    Write-Error "Exclusion audit failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-create-firewall-rule',
    name: 'Create Firewall Rule',
    category: 'Firewall Rules',
    description: 'Create a new firewall rule in Sophos Central',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Allow', 'Block', 'Log'], defaultValue: 'Block' },
      { id: 'direction', label: 'Direction', type: 'select', required: true, options: ['Inbound', 'Outbound', 'Both'], defaultValue: 'Inbound' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['TCP', 'UDP', 'ICMP', 'Any'], defaultValue: 'TCP' },
      { id: 'ports', label: 'Ports (comma-separated)', type: 'text', required: false, placeholder: '80,443,8080' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const ruleName = escapePowerShellString(params.ruleName);
      const action = escapePowerShellString(params.action);
      const direction = escapePowerShellString(params.direction);
      const protocol = escapePowerShellString(params.protocol);
      const ports = params.ports ? (params.ports as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Sophos Central - Create Firewall Rule
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $RuleParams = @{
        Name = "${ruleName}"
        Action = "${action}"
        Direction = "${direction}"
        Protocol = "${protocol}"
        Enabled = $true
    }
    
    ${ports.length > 0 ? `$RuleParams.Ports = @(${ports.map(p => `"${escapePowerShellString(p)}"`).join(', ')})` : ''}
    
    $NewRule = New-SophosFirewallRule @RuleParams
    
    Write-Host "[SUCCESS] Firewall rule created successfully" -ForegroundColor Green
    Write-Host "  Rule Name: ${ruleName}" -ForegroundColor Cyan
    Write-Host "  Action: ${action}" -ForegroundColor Cyan
    Write-Host "  Direction: ${direction}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    ${ports.length > 0 ? `Write-Host "  Ports: ${ports.join(', ')}" -ForegroundColor Cyan` : ''}
    Write-Host "  Rule ID: $($NewRule.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Firewall rule creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-toggle-firewall-rule',
    name: 'Enable/Disable Firewall Rule',
    category: 'Firewall Rules',
    description: 'Enable or disable an existing firewall rule',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'ruleId', label: 'Rule ID', type: 'text', required: true },
      { id: 'enabled', label: 'Enable Rule', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const ruleId = escapePowerShellString(params.ruleId);
      
      return `# Sophos Central - Toggle Firewall Rule
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $RuleId = "${ruleId}"
    $Enabled = $${params.enabled ? 'true' : 'false'}
    
    $Rule = Get-SophosFirewallRule -Id $RuleId
    
    if (-not $Rule) {
        throw "Firewall rule not found: $RuleId"
    }
    
    Set-SophosFirewallRule -Id $RuleId -Enabled $Enabled
    
    $Status = if ($Enabled) { "enabled" } else { "disabled" }
    
    Write-Host "[SUCCESS] Firewall rule $Status successfully" -ForegroundColor Green
    Write-Host "  Rule Name: $($Rule.name)" -ForegroundColor Cyan
    Write-Host "  Rule ID: $RuleId" -ForegroundColor Cyan
    Write-Host "  Status: $Status" -ForegroundColor Cyan
    
} catch {
    Write-Error "Firewall rule toggle failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-export-firewall-rules',
    name: 'Export Firewall Rules',
    category: 'Firewall Rules',
    description: 'Export all firewall rules to CSV for backup or review',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Export Firewall Rules
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $FirewallRules = Get-SophosFirewallRule
    
    $RulesExport = $FirewallRules | Select-Object \`
        id,
        name,
        description,
        enabled,
        action,
        direction,
        protocol,
        @{N='Ports';E={$_.ports -join ','}},
        @{N='SourceIPs';E={$_.source_ips -join ','}},
        @{N='DestinationIPs';E={$_.destination_ips -join ','}},
        priority,
        created_at,
        modified_at
    
    $RulesExport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Firewall rules exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Export Summary:" -ForegroundColor Cyan
    Write-Host "  Total Rules: $($FirewallRules.Count)"
    Write-Host "  Enabled: $($FirewallRules | Where-Object { $_.enabled } | Measure-Object).Count"
    Write-Host "  Disabled: $($FirewallRules | Where-Object { -not $_.enabled } | Measure-Object).Count"
    
} catch {
    Write-Error "Firewall rules export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-import-firewall-rules',
    name: 'Import Firewall Rules',
    category: 'Firewall Rules',
    description: 'Import firewall rules from a CSV file',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'importPath', label: 'Import CSV Path', type: 'path', required: true },
      { id: 'overwriteExisting', label: 'Overwrite Existing Rules', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const importPath = escapePowerShellString(params.importPath);
      
      return `# Sophos Central - Import Firewall Rules
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $ImportPath = "${importPath}"
    $OverwriteExisting = $${params.overwriteExisting ? 'true' : 'false'}
    
    if (-not (Test-Path $ImportPath)) {
        throw "Import file not found: $ImportPath"
    }
    
    $RulesToImport = Import-Csv -Path $ImportPath
    $ImportResults = @()
    
    foreach ($Rule in $RulesToImport) {
        try {
            $ExistingRule = Get-SophosFirewallRule -Name $Rule.name -ErrorAction SilentlyContinue
            
            if ($ExistingRule -and -not $OverwriteExisting) {
                $ImportResults += [PSCustomObject]@{
                    Name = $Rule.name
                    Status = "Skipped (exists)"
                }
                Write-Host "[WARNING] Skipped existing rule: $($Rule.name)" -ForegroundColor Yellow
                continue
            }
            
            $RuleParams = @{
                Name = $Rule.name
                Action = $Rule.action
                Direction = $Rule.direction
                Protocol = $Rule.protocol
                Enabled = [bool]::Parse($Rule.enabled)
            }
            
            if ($Rule.Ports) {
                $RuleParams.Ports = $Rule.Ports -split ','
            }
            
            if ($ExistingRule) {
                Set-SophosFirewallRule -Id $ExistingRule.id @RuleParams
                $ImportResults += [PSCustomObject]@{ Name = $Rule.name; Status = "Updated" }
                Write-Host "[SUCCESS] Updated rule: $($Rule.name)" -ForegroundColor Green
            } else {
                New-SophosFirewallRule @RuleParams
                $ImportResults += [PSCustomObject]@{ Name = $Rule.name; Status = "Created" }
                Write-Host "[SUCCESS] Created rule: $($Rule.name)" -ForegroundColor Green
            }
        } catch {
            $ImportResults += [PSCustomObject]@{ Name = $Rule.name; Status = "Failed: $_" }
            Write-Host "[FAILED] Failed: $($Rule.name)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Import Summary:" -ForegroundColor Cyan
    Write-Host "  Total: $($RulesToImport.Count)"
    Write-Host "  Created: $($ImportResults | Where-Object { $_.Status -eq 'Created' } | Measure-Object).Count"
    Write-Host "  Updated: $($ImportResults | Where-Object { $_.Status -eq 'Updated' } | Measure-Object).Count"
    Write-Host "  Skipped: $($ImportResults | Where-Object { $_.Status -like 'Skipped*' } | Measure-Object).Count"
    
} catch {
    Write-Error "Firewall rules import failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-active-alerts-dashboard',
    name: 'Get Active Alerts Dashboard',
    category: 'Alerts & Incidents',
    description: 'Display dashboard of currently active security alerts',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'maxAlerts', label: 'Maximum Alerts to Display', type: 'number', required: false, defaultValue: 50 }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      
      return `# Sophos Central - Active Alerts Dashboard
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $ActiveAlerts = Get-SophosAlert -Status "Active" | Select-Object -First ${params.maxAlerts || 50}
    
    $AlertsByCategory = $ActiveAlerts | Group-Object severity
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  ACTIVE ALERTS DASHBOARD                    " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Summary by Severity:" -ForegroundColor Yellow
    foreach ($Group in $AlertsByCategory) {
        $Color = switch ($Group.Name) {
            "critical" { "Red" }
            "high" { "Red" }
            "medium" { "Yellow" }
            "low" { "Green" }
            default { "White" }
        }
        Write-Host "  $($Group.Name.ToUpper()): $($Group.Count)" -ForegroundColor $Color
    }
    
    Write-Host ""
    Write-Host "Recent Active Alerts:" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────"
    
    $ActiveAlerts | Select-Object -First 10 | ForEach-Object {
        $SevColor = switch ($_.severity) {
            "critical" { "Red" }
            "high" { "Red" }
            "medium" { "Yellow" }
            default { "White" }
        }
        Write-Host "[$($_.severity.ToUpper())]" -NoNewline -ForegroundColor $SevColor
        Write-Host " $($_.type) - $($_.endpoint)" -ForegroundColor White
        Write-Host "   $($_.description)" -ForegroundColor Gray
        Write-Host "   When: $($_.when)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "Total Active Alerts: $($ActiveAlerts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Active alerts dashboard failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-acknowledge-alert',
    name: 'Acknowledge Security Alert',
    category: 'Alerts & Incidents',
    description: 'Acknowledge one or more security alerts',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'alertIds', label: 'Alert IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'comment', label: 'Acknowledgment Comment', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const alertIdsRaw = (params.alertIds as string).split(',').map((n: string) => n.trim());
      const comment = escapePowerShellString(params.comment || 'Alert acknowledged via automation');
      
      return `# Sophos Central - Acknowledge Security Alerts
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $AlertIds = @(${alertIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $Comment = "${comment}"
    
    $Results = @()
    
    foreach ($AlertId in $AlertIds) {
        try {
            $Alert = Get-SophosAlert -Id $AlertId
            
            if (-not $Alert) {
                $Results += [PSCustomObject]@{
                    AlertId = $AlertId
                    Status = "Not Found"
                }
                Write-Host "[WARNING] Alert not found: $AlertId" -ForegroundColor Yellow
                continue
            }
            
            Set-SophosAlertStatus -Id $AlertId -Status "Acknowledged" -Comment $Comment
            
            $Results += [PSCustomObject]@{
                AlertId = $AlertId
                Status = "Acknowledged"
                Type = $Alert.type
            }
            Write-Host "[SUCCESS] Acknowledged: $AlertId" -ForegroundColor Green
        } catch {
            $Results += [PSCustomObject]@{
                AlertId = $AlertId
                Status = "Failed: $_"
            }
            Write-Host "[FAILED] Failed: $AlertId - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Acknowledgment Summary:" -ForegroundColor Cyan
    Write-Host "  Total Alerts: $($AlertIds.Count)"
    Write-Host "  Acknowledged: $($Results | Where-Object { $_.Status -eq 'Acknowledged' } | Measure-Object).Count"
    Write-Host "  Failed: $($Results | Where-Object { $_.Status -like 'Failed*' } | Measure-Object).Count"
    
} catch {
    Write-Error "Alert acknowledgment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-incident-response',
    name: 'Initiate Incident Response',
    category: 'Alerts & Incidents',
    description: 'Initiate automated incident response actions for a security incident',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'incidentId', label: 'Incident/Alert ID', type: 'text', required: true },
      { id: 'actions', label: 'Response Actions', type: 'select', required: true, options: ['Isolate Endpoint', 'Collect Forensics', 'Kill Process', 'Full Remediation'], defaultValue: 'Isolate Endpoint' },
      { id: 'notifyTeam', label: 'Notify Security Team', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const incidentId = escapePowerShellString(params.incidentId);
      const actions = escapePowerShellString(params.actions);
      
      return `# Sophos Central - Incident Response
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $IncidentId = "${incidentId}"
    $ResponseAction = "${actions}"
    $NotifyTeam = $${params.notifyTeam ? 'true' : 'false'}
    
    $Incident = Get-SophosAlert -Id $IncidentId
    
    if (-not $Incident) {
        throw "Incident not found: $IncidentId"
    }
    
    $EndpointId = $Incident.endpoint_id
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "              INCIDENT RESPONSE INITIATED                    " -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "Incident Details:" -ForegroundColor Yellow
    Write-Host "  ID: $IncidentId"
    Write-Host "  Type: $($Incident.type)"
    Write-Host "  Severity: $($Incident.severity)"
    Write-Host "  Endpoint: $($Incident.endpoint)"
    Write-Host ""
    
    switch ($ResponseAction) {
        "Isolate Endpoint" {
            Set-SophosEndpointIsolation -EndpointId $EndpointId -Action "isolate"
            Write-Host "[SUCCESS] Endpoint isolated from network" -ForegroundColor Green
        }
        "Collect Forensics" {
            Start-SophosForensicCollection -EndpointId $EndpointId -IncidentId $IncidentId
            Write-Host "[SUCCESS] Forensic data collection initiated" -ForegroundColor Green
        }
        "Kill Process" {
            if ($Incident.process_id) {
                Stop-SophosProcess -EndpointId $EndpointId -ProcessId $Incident.process_id
                Write-Host "[SUCCESS] Malicious process terminated" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] No process ID associated with incident" -ForegroundColor Yellow
            }
        }
        "Full Remediation" {
            Set-SophosEndpointIsolation -EndpointId $EndpointId -Action "isolate"
            Start-SophosForensicCollection -EndpointId $EndpointId -IncidentId $IncidentId
            Invoke-SophosScan -EndpointId $EndpointId -Type "Full"
            Write-Host "[SUCCESS] Full remediation initiated (isolate, collect, scan)" -ForegroundColor Green
        }
    }
    
    if ($NotifyTeam) {
        Send-SophosIncidentNotification -IncidentId $IncidentId -Action $ResponseAction
        Write-Host "[SUCCESS] Security team notified" -ForegroundColor Green
    }
    
    Set-SophosAlertStatus -Id $IncidentId -Status "InProgress" -Comment "Incident response action: $ResponseAction"
    
    Write-Host ""
    Write-Host "Incident response completed successfully" -ForegroundColor Cyan
    
} catch {
    Write-Error "Incident response failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-compliance-report',
    name: 'Generate Compliance Report',
    category: 'Reporting',
    description: 'Generate comprehensive compliance report for audit purposes',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'complianceFramework', label: 'Compliance Framework', type: 'select', required: true, options: ['CIS', 'NIST', 'PCI-DSS', 'HIPAA', 'SOC2', 'General'], defaultValue: 'General' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const framework = escapePowerShellString(params.complianceFramework);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Compliance Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Framework = "${framework}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    $Policies = Get-SophosPolicy
    $Alerts = Get-SophosAlert -FromDate (Get-Date).AddDays(-30)
    
    $ComplianceChecks = @()
    
    $ComplianceChecks += [PSCustomObject]@{
        Category = "Endpoint Protection"
        Check = "All endpoints have protection installed"
        Status = if (($Endpoints | Where-Object { $_.health_status -eq 'good' }).Count -eq $Endpoints.Count) { "Compliant" } else { "Non-Compliant" }
        Details = "$(($Endpoints | Where-Object { $_.health_status -eq 'good' }).Count)/$($Endpoints.Count) endpoints protected"
    }
    
    $ComplianceChecks += [PSCustomObject]@{
        Category = "Tamper Protection"
        Check = "Tamper protection enabled on all endpoints"
        Status = if (($Endpoints | Where-Object { $_.tamper_protection_enabled }).Count -eq $Endpoints.Count) { "Compliant" } else { "Non-Compliant" }
        Details = "$(($Endpoints | Where-Object { $_.tamper_protection_enabled }).Count)/$($Endpoints.Count) endpoints with tamper protection"
    }
    
    $ComplianceChecks += [PSCustomObject]@{
        Category = "Security Monitoring"
        Check = "Critical alerts addressed within 24 hours"
        Status = if (($Alerts | Where-Object { $_.severity -eq 'critical' -and $_.status -eq 'Active' }).Count -eq 0) { "Compliant" } else { "Non-Compliant" }
        Details = "$(($Alerts | Where-Object { $_.severity -eq 'critical' -and $_.status -eq 'Active' }).Count) unresolved critical alerts"
    }
    
    $ComplianceChecks += [PSCustomObject]@{
        Category = "Policy Coverage"
        Check = "All endpoints assigned to a policy"
        Status = if (($Endpoints | Where-Object { $_.policy_id }).Count -eq $Endpoints.Count) { "Compliant" } else { "Non-Compliant" }
        Details = "$(($Endpoints | Where-Object { $_.policy_id }).Count)/$($Endpoints.Count) endpoints with policy"
    }
    
    $ComplianceChecks += [PSCustomObject]@{
        Category = "Encryption"
        Check = "Disk encryption enabled on all endpoints"
        Status = if (($Endpoints | Where-Object { $_.encryption_status -eq 'encrypted' }).Count -eq $Endpoints.Count) { "Compliant" } else { "Non-Compliant" }
        Details = "$(($Endpoints | Where-Object { $_.encryption_status -eq 'encrypted' }).Count)/$($Endpoints.Count) endpoints encrypted"
    }
    
    $ComplianceChecks | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $CompliantCount = ($ComplianceChecks | Where-Object { $_.Status -eq 'Compliant' }).Count
    $TotalChecks = $ComplianceChecks.Count
    $ComplianceScore = [math]::Round(($CompliantCount / $TotalChecks) * 100, 2)
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "              ${framework} COMPLIANCE REPORT                 " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Compliance Score: $ComplianceScore%" -ForegroundColor $(if ($ComplianceScore -ge 90) { "Green" } elseif ($ComplianceScore -ge 70) { "Yellow" } else { "Red" })
    Write-Host ""
    
    $ComplianceChecks | ForEach-Object {
        $StatusColor = if ($_.Status -eq 'Compliant') { "Green" } else { "Red" }
        Write-Host "[$($_.Status)]" -NoNewline -ForegroundColor $StatusColor
        Write-Host " $($_.Check)" -ForegroundColor White
        Write-Host "   $($_.Details)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Compliance report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-license-usage-report',
    name: 'Generate License Usage Report',
    category: 'Reporting',
    description: 'Generate report on license usage and availability',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - License Usage Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Licenses = Get-SophosLicense
    $Endpoints = Get-SophosEndpoint
    
    $LicenseReport = $Licenses | ForEach-Object {
        $UsedCount = ($Endpoints | Where-Object { $_.assigned_products -contains $_.product_name }).Count
        
        [PSCustomObject]@{
            ProductName = $_.product_name
            LicenseType = $_.license_type
            TotalLicenses = $_.total_count
            UsedLicenses = $UsedCount
            AvailableLicenses = $_.total_count - $UsedCount
            UsagePercent = [math]::Round(($UsedCount / $_.total_count) * 100, 2)
            ExpirationDate = $_.expiration_date
            DaysUntilExpiry = ((Get-Date $_.expiration_date) - (Get-Date)).Days
            Status = if (((Get-Date $_.expiration_date) - (Get-Date)).Days -lt 30) { "Expiring Soon" } else { "Active" }
        }
    }
    
    $LicenseReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  LICENSE USAGE REPORT                       " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $LicenseReport | ForEach-Object {
        $UsageColor = if ($_.UsagePercent -lt 80) { "Green" } elseif ($_.UsagePercent -lt 95) { "Yellow" } else { "Red" }
        $ExpiryColor = if ($_.DaysUntilExpiry -gt 60) { "Green" } elseif ($_.DaysUntilExpiry -gt 30) { "Yellow" } else { "Red" }
        
        Write-Host "$($_.ProductName)" -ForegroundColor White
        Write-Host "  Usage: $($_.UsedLicenses)/$($_.TotalLicenses) ($($_.UsagePercent)%)" -ForegroundColor $UsageColor
        Write-Host "  Expires: $($_.ExpirationDate) ($($_.DaysUntilExpiry) days)" -ForegroundColor $ExpiryColor
        Write-Host ""
    }
    
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "License report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-deployment-status-report',
    name: 'Generate Deployment Status Report',
    category: 'Reporting',
    description: 'Generate report on endpoint deployment and agent status',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Deployment Status Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $DeploymentReport = $Endpoints | ForEach-Object {
        [PSCustomObject]@{
            Hostname = $_.hostname
            EndpointId = $_.id
            OS = $_.os
            OSVersion = $_.os_version
            AgentVersion = $_.agent_version
            LatestAgentVersion = $_.latest_agent_version
            NeedsUpdate = $_.agent_version -ne $_.latest_agent_version
            DefinitionVersion = $_.definition_version
            LastUpdated = $_.last_updated
            DeployedProducts = ($_.assigned_products -join ', ')
            InstallDate = $_.install_date
            HealthStatus = $_.health_status
            LastSeen = $_.last_seen
            DaysSinceDeployment = ((Get-Date) - [DateTime]$_.install_date).Days
        }
    }
    
    $DeploymentReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $Summary = @{
        TotalEndpoints = $Endpoints.Count
        UpToDate = ($DeploymentReport | Where-Object { -not $_.NeedsUpdate }).Count
        NeedsUpdate = ($DeploymentReport | Where-Object { $_.NeedsUpdate }).Count
        ByOS = $Endpoints | Group-Object os
        RecentDeployments = ($DeploymentReport | Where-Object { $_.DaysSinceDeployment -le 7 }).Count
    }
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                DEPLOYMENT STATUS REPORT                     " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Deployment Summary:" -ForegroundColor Yellow
    Write-Host "  Total Endpoints: $($Summary.TotalEndpoints)"
    Write-Host "  Up to Date: $($Summary.UpToDate)" -ForegroundColor Green
    Write-Host "  Needs Update: $($Summary.NeedsUpdate)" -ForegroundColor Yellow
    Write-Host "  Recent Deployments (7 days): $($Summary.RecentDeployments)"
    Write-Host ""
    Write-Host "By Operating System:" -ForegroundColor Yellow
    $Summary.ByOS | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment status report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-api-health-check',
    name: 'API Health Check',
    category: 'Integration',
    description: 'Check the health and connectivity of Sophos Central API',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'clientSecret', label: 'API Client Secret', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const clientId = escapePowerShellString(params.clientId);
      const clientSecret = escapePowerShellString(params.clientSecret);
      
      return `# Sophos Central - API Health Check
# Generated: ${new Date().toISOString()}

try {
    $AuthBody = @{
        grant_type = "client_credentials"
        client_id = "${clientId}"
        client_secret = "${clientSecret}"
        scope = "token"
    }
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  API HEALTH CHECK                           " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Testing Authentication..." -ForegroundColor Yellow
    $AuthStart = Get-Date
    $AuthResponse = Invoke-RestMethod -Uri "https://id.sophos.com/api/v2/oauth2/token" \`
        -Method POST -Body $AuthBody -ContentType "application/x-www-form-urlencoded"
    $AuthTime = ((Get-Date) - $AuthStart).TotalMilliseconds
    
    if ($AuthResponse.access_token) {
        Write-Host "  [OK] Authentication successful ($([math]::Round($AuthTime, 0))ms)" -ForegroundColor Green
    } else {
        throw "Authentication failed - no token received"
    }
    
    $Headers = @{
        Authorization = "Bearer $($AuthResponse.access_token)"
        "X-Tenant-ID" = "${tenantId}"
    }
    
    Write-Host "Testing Tenant Access..." -ForegroundColor Yellow
    $TenantStart = Get-Date
    $TenantResponse = Invoke-RestMethod -Uri "https://api.central.sophos.com/whoami/v1" \`
        -Headers $Headers -Method GET
    $TenantTime = ((Get-Date) - $TenantStart).TotalMilliseconds
    
    if ($TenantResponse.id) {
        Write-Host "  [OK] Tenant access verified ($([math]::Round($TenantTime, 0))ms)" -ForegroundColor Green
    }
    
    Write-Host "Testing Endpoint API..." -ForegroundColor Yellow
    $EndpointStart = Get-Date
    $EndpointResponse = Invoke-RestMethod -Uri "https://api-$($TenantResponse.dataRegion).central.sophos.com/endpoint/v1/endpoints?pageSize=1" \`
        -Headers $Headers -Method GET
    $EndpointTime = ((Get-Date) - $EndpointStart).TotalMilliseconds
    Write-Host "  [OK] Endpoint API accessible ($([math]::Round($EndpointTime, 0))ms)" -ForegroundColor Green
    
    Write-Host "Testing Alert API..." -ForegroundColor Yellow
    $AlertStart = Get-Date
    $AlertResponse = Invoke-RestMethod -Uri "https://api-$($TenantResponse.dataRegion).central.sophos.com/common/v1/alerts?pageSize=1" \`
        -Headers $Headers -Method GET
    $AlertTime = ((Get-Date) - $AlertStart).TotalMilliseconds
    Write-Host "  [OK] Alert API accessible ($([math]::Round($AlertTime, 0))ms)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "API Health: HEALTHY" -ForegroundColor Green
    Write-Host ""
    Write-Host "Performance Summary:" -ForegroundColor Cyan
    Write-Host "  Authentication: $([math]::Round($AuthTime, 0))ms"
    Write-Host "  Tenant Lookup: $([math]::Round($TenantTime, 0))ms"
    Write-Host "  Endpoint API: $([math]::Round($EndpointTime, 0))ms"
    Write-Host "  Alert API: $([math]::Round($AlertTime, 0))ms"
    Write-Host "  Total: $([math]::Round($AuthTime + $TenantTime + $EndpointTime + $AlertTime, 0))ms"
    
} catch {
    Write-Host ""
    Write-Host "API Health: UNHEALTHY" -ForegroundColor Red
    Write-Error "API health check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-sync-status',
    name: 'Check Sync Status',
    category: 'Integration',
    description: 'Check synchronization status between Sophos Central and endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'maxOutOfSyncDays', label: 'Max Days Out of Sync', type: 'number', required: false, defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      
      return `# Sophos Central - Sync Status Check
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $MaxOutOfSyncDays = ${params.maxOutOfSyncDays || 7}
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $SyncStatus = $Endpoints | ForEach-Object {
        $DaysSinceSync = ((Get-Date) - [DateTime]$_.last_seen).Days
        
        [PSCustomObject]@{
            Hostname = \$_.hostname
            EndpointId = \$_.id
            LastSeen = \$_.last_seen
            DaysSinceSync = \$DaysSinceSync
            SyncStatus = if (\$DaysSinceSync -eq 0) { "Online" } elseif (\$DaysSinceSync -le \$MaxOutOfSyncDays) { "Recent" } else { "Out of Sync" }
            DefinitionAge = ((Get-Date) - [DateTime]\$_.definition_update_date).Days
            PolicySynced = \$_.policy_synced
        }
    }
    
    $Online = ($SyncStatus | Where-Object { $_.SyncStatus -eq 'Online' }).Count
    $Recent = ($SyncStatus | Where-Object { $_.SyncStatus -eq 'Recent' }).Count
    $OutOfSync = ($SyncStatus | Where-Object { $_.SyncStatus -eq 'Out of Sync' }).Count
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  SYNC STATUS REPORT                         " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Sync Summary:" -ForegroundColor Yellow
    Write-Host "  Online (today): $Online" -ForegroundColor Green
    Write-Host "  Recent (within $MaxOutOfSyncDays days): $Recent" -ForegroundColor Yellow
    Write-Host "  Out of Sync (>$MaxOutOfSyncDays days): $OutOfSync" -ForegroundColor Red
    Write-Host ""
    
    if ($OutOfSync -gt 0) {
        Write-Host "Out of Sync Endpoints:" -ForegroundColor Red
        $SyncStatus | Where-Object { $_.SyncStatus -eq 'Out of Sync' } | ForEach-Object {
            Write-Host "  $($_.Hostname) - Last seen: $($_.LastSeen) ($($_.DaysSinceSync) days ago)"
        }
        Write-Host ""
    }
    
    $SyncHealth = [math]::Round((($Online + $Recent) / $Endpoints.Count) * 100, 2)
    Write-Host "Overall Sync Health: $SyncHealth%" -ForegroundColor $(if ($SyncHealth -ge 90) { "Green" } elseif ($SyncHealth -ge 70) { "Yellow" } else { "Red" })
    
} catch {
    Write-Error "Sync status check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-bulk-update-policies',
    name: 'Bulk Update Endpoint Policies',
    category: 'Bulk Operations',
    description: 'Apply policy updates to multiple endpoints based on criteria',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'targetPolicyId', label: 'Target Policy ID', type: 'text', required: true },
      { id: 'filterBy', label: 'Filter Endpoints By', type: 'select', required: true, options: ['Group', 'OS', 'Health Status', 'All'], defaultValue: 'All' },
      { id: 'filterValue', label: 'Filter Value (if applicable)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const targetPolicyId = escapePowerShellString(params.targetPolicyId);
      const filterBy = params.filterBy;
      const filterValue = escapePowerShellString(params.filterValue || '');
      
      return `# Sophos Central - Bulk Update Policies
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $TargetPolicy = Get-SophosPolicy -Id "${targetPolicyId}"
    
    if (-not $TargetPolicy) {
        throw "Target policy not found: ${targetPolicyId}"
    }
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    switch ("${filterBy}") {
        "Group" {
            $Endpoints = $Endpoints | Where-Object { $_.group_name -eq "${filterValue}" }
        }
        "OS" {
            $Endpoints = $Endpoints | Where-Object { $_.os -like "*${filterValue}*" }
        }
        "Health Status" {
            $Endpoints = $Endpoints | Where-Object { $_.health_status -eq "${filterValue}" }
        }
        "All" {
        }
    }
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                BULK POLICY UPDATE                           " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Target Policy: $($TargetPolicy.name)" -ForegroundColor Yellow
    Write-Host "Endpoints to Update: $($Endpoints.Count)" -ForegroundColor Yellow
    Write-Host "Filter: ${filterBy}" $(if ("${filterValue}") { "= ${filterValue}" }) -ForegroundColor Yellow
    Write-Host ""
    
    $Results = @()
    $ProgressCount = 0
    
    foreach ($Endpoint in $Endpoints) {
        $ProgressCount++
        Write-Progress -Activity "Updating Policies" -Status "$ProgressCount of $($Endpoints.Count)" \`
            -PercentComplete (($ProgressCount / $Endpoints.Count) * 100)
        
        try {
            Set-SophosEndpointPolicy -EndpointId $Endpoint.id -PolicyId "${targetPolicyId}"
            $Results += [PSCustomObject]@{
                Endpoint = $Endpoint.hostname
                Status = "Updated"
                PreviousPolicy = $Endpoint.policy_name
                NewPolicy = $TargetPolicy.name
            }
        } catch {
            $Results += [PSCustomObject]@{
                Endpoint = $Endpoint.hostname
                Status = "Failed: $_"
                PreviousPolicy = $Endpoint.policy_name
                NewPolicy = ""
            }
        }
    }
    
    Write-Progress -Activity "Updating Policies" -Completed
    
    $Successful = ($Results | Where-Object { $_.Status -eq 'Updated' }).Count
    $Failed = ($Results | Where-Object { $_.Status -like 'Failed*' }).Count
    
    Write-Host ""
    Write-Host "Update Summary:" -ForegroundColor Cyan
    Write-Host "  Total Processed: $($Endpoints.Count)"
    Write-Host "  Successful: $Successful" -ForegroundColor Green
    Write-Host "  Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
    
    if ($Failed -gt 0) {
        Write-Host ""
        Write-Host "Failed Endpoints:" -ForegroundColor Red
        $Results | Where-Object { $_.Status -like 'Failed*' } | ForEach-Object {
            Write-Host "  $($_.Endpoint): $($_.Status)"
        }
    }
    
} catch {
    Write-Error "Bulk policy update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-bulk-scan-endpoints',
    name: 'Bulk Scan Endpoints',
    category: 'Bulk Operations',
    description: 'Initiate scans on multiple endpoints simultaneously',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'scanType', label: 'Scan Type', type: 'select', required: true, options: ['Quick', 'Full'], defaultValue: 'Quick' },
      { id: 'targetGroup', label: 'Target Group (leave empty for all)', type: 'text', required: false },
      { id: 'maxConcurrent', label: 'Max Concurrent Scans', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const scanType = escapePowerShellString(params.scanType);
      const targetGroup = escapePowerShellString(params.targetGroup || '');
      
      return `# Sophos Central - Bulk Endpoint Scan
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $ScanType = "${scanType}"
    $MaxConcurrent = ${params.maxConcurrent || 10}
    
    $Endpoints = Get-SophosEndpoint -Detailed | Where-Object { $_.health_status -eq 'good' }
    
    ${targetGroup ? `$Endpoints = $Endpoints | Where-Object { $_.group_name -eq "${targetGroup}" }` : ''}
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  BULK ENDPOINT SCAN                         " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Scan Type: $ScanType" -ForegroundColor Yellow
    Write-Host "Target Endpoints: $($Endpoints.Count)" -ForegroundColor Yellow
    Write-Host "Max Concurrent: $MaxConcurrent" -ForegroundColor Yellow
    Write-Host ""
    
    $ScanJobs = @()
    $BatchCount = 0
    $TotalBatches = [math]::Ceiling($Endpoints.Count / $MaxConcurrent)
    
    for ($i = 0; $i -lt $Endpoints.Count; $i += $MaxConcurrent) {
        $BatchCount++
        $Batch = $Endpoints | Select-Object -Skip $i -First $MaxConcurrent
        
        Write-Host "Processing batch $BatchCount of $TotalBatches..." -ForegroundColor Yellow
        
        foreach ($Endpoint in $Batch) {
            try {
                $ScanResult = Invoke-SophosScan -EndpointId $Endpoint.id -Type $ScanType
                $ScanJobs += [PSCustomObject]@{
                    Endpoint = $Endpoint.hostname
                    EndpointId = $Endpoint.id
                    ScanId = $ScanResult.id
                    Status = "Initiated"
                    StartTime = Get-Date
                }
                Write-Host "  [OK] $($Endpoint.hostname)" -ForegroundColor Green
            } catch {
                $ScanJobs += [PSCustomObject]@{
                    Endpoint = $Endpoint.hostname
                    EndpointId = $Endpoint.id
                    ScanId = ""
                    Status = "Failed: $_"
                    StartTime = Get-Date
                }
                Write-Host "  [FAILED] $($Endpoint.hostname)" -ForegroundColor Red
            }
        }
        
        if ($BatchCount -lt $TotalBatches) {
            Write-Host "  Waiting before next batch..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }
    
    Write-Host ""
    Write-Host "Scan Summary:" -ForegroundColor Cyan
    Write-Host "  Total Endpoints: $($Endpoints.Count)"
    Write-Host "  Scans Initiated: $($ScanJobs | Where-Object { $_.Status -eq 'Initiated' } | Measure-Object).Count" -ForegroundColor Green
    Write-Host "  Failed: $($ScanJobs | Where-Object { $_.Status -like 'Failed*' } | Measure-Object).Count" -ForegroundColor $(if (($ScanJobs | Where-Object { $_.Status -like 'Failed*' }).Count -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Bulk scan operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-delete-group',
    name: 'Delete Endpoint Group',
    category: 'Group Management',
    description: 'Delete an endpoint group and optionally move endpoints to another group',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'groupId', label: 'Group ID to Delete', type: 'text', required: true },
      { id: 'targetGroupId', label: 'Move Endpoints to Group ID (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const groupId = escapePowerShellString(params.groupId);
      const targetGroupId = escapePowerShellString(params.targetGroupId || '');
      
      return `# Sophos Central - Delete Endpoint Group
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $GroupId = "${groupId}"
    $TargetGroupId = "${targetGroupId}"
    
    $Group = Get-SophosEndpointGroup -Id $GroupId
    
    if (-not $Group) {
        throw "Group not found: $GroupId"
    }
    
    $GroupMembers = Get-SophosEndpoint | Where-Object { $_.group_id -eq $GroupId }
    
    Write-Host "Group to Delete: $($Group.name)" -ForegroundColor Yellow
    Write-Host "Members: $($GroupMembers.Count)" -ForegroundColor Yellow
    
    if ($GroupMembers.Count -gt 0) {
        if ([string]::IsNullOrEmpty($TargetGroupId)) {
            throw "Group has $($GroupMembers.Count) members. Specify a target group to move them to."
        }
        
        $TargetGroup = Get-SophosEndpointGroup -Id $TargetGroupId
        
        if (-not $TargetGroup) {
            throw "Target group not found: $TargetGroupId"
        }
        
        Write-Host "Moving members to: $($TargetGroup.name)" -ForegroundColor Yellow
        
        foreach ($Endpoint in $GroupMembers) {
            Move-SophosEndpointToGroup -EndpointId $Endpoint.id -GroupId $TargetGroupId
            Write-Host "  [OK] Moved: $($Endpoint.hostname)" -ForegroundColor Green
        }
    }
    
    Remove-SophosEndpointGroup -Id $GroupId -Confirm:$false
    
    Write-Host ""
    Write-Host "[SUCCESS] Group deleted successfully: $($Group.name)" -ForegroundColor Green
    
    if ($GroupMembers.Count -gt 0) {
        Write-Host "  $($GroupMembers.Count) endpoints moved to: $($TargetGroup.name)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Group deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-tamper-protection-report',
    name: 'Tamper Protection Status Report',
    category: 'Endpoint Protection',
    description: 'Generate report on tamper protection status across all endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Tamper Protection Status Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $TamperReport = $Endpoints | ForEach-Object {
        [PSCustomObject]@{
            Hostname = $_.hostname
            EndpointId = $_.id
            OS = $_.os
            TamperProtectionEnabled = $_.tamper_protection_enabled
            TamperProtectionPassword = if ($_.tamper_protection_password) { "Set" } else { "Not Set" }
            LastSeen = $_.last_seen
            HealthStatus = $_.health_status
            GroupName = $_.group_name
        }
    }
    
    $TamperReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $Enabled = ($TamperReport | Where-Object { $_.TamperProtectionEnabled }).Count
    $Disabled = ($TamperReport | Where-Object { -not $_.TamperProtectionEnabled }).Count
    $PasswordSet = ($TamperReport | Where-Object { $_.TamperProtectionPassword -eq 'Set' }).Count
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "             TAMPER PROTECTION STATUS REPORT                 " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Total Endpoints: $($Endpoints.Count)"
    Write-Host "  Tamper Protection Enabled: $Enabled" -ForegroundColor Green
    Write-Host "  Tamper Protection Disabled: $Disabled" -ForegroundColor $(if ($Disabled -gt 0) { "Red" } else { "Green" })
    Write-Host "  Password Set: $PasswordSet" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Disabled -gt 0) {
        Write-Host "Endpoints Without Tamper Protection:" -ForegroundColor Red
        $TamperReport | Where-Object { -not $_.TamperProtectionEnabled } | ForEach-Object {
            Write-Host "  - $($_.Hostname) ($($_.OS))"
        }
        Write-Host ""
    }
    
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Tamper protection report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-enable-tamper-protection',
    name: 'Enable Tamper Protection',
    category: 'Endpoint Protection',
    description: 'Enable tamper protection on specified endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated, empty for all disabled)', type: 'textarea', required: false },
      { id: 'setPassword', label: 'Set Tamper Password', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const endpointIdsRaw = params.endpointIds ? (params.endpointIds as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# Sophos Central - Enable Tamper Protection
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    ${endpointIdsRaw.length > 0 
      ? `$EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})` 
      : `$EndpointIds = (Get-SophosEndpoint -Detailed | Where-Object { -not $_.tamper_protection_enabled }).id`}
    
    $SetPassword = $${params.setPassword ? 'true' : 'false'}
    
    Write-Host "Enabling tamper protection on $($EndpointIds.Count) endpoints..." -ForegroundColor Yellow
    Write-Host ""
    
    $Results = @()
    
    foreach ($EndpointId in $EndpointIds) {
        try {
            $Params = @{
                EndpointId = $EndpointId
                Enabled = $true
            }
            
            if ($SetPassword) {
                $Params.GeneratePassword = $true
            }
            
            Set-SophosTamperProtection @Params
            
            $Endpoint = Get-SophosEndpoint -Id $EndpointId
            $Results += [PSCustomObject]@{
                Endpoint = $Endpoint.hostname
                Status = "Enabled"
            }
            Write-Host "[SUCCESS] Enabled: $($Endpoint.hostname)" -ForegroundColor Green
        } catch {
            $Results += [PSCustomObject]@{
                Endpoint = $EndpointId
                Status = "Failed: $_"
            }
            Write-Host "[FAILED] Failed: $EndpointId" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Total Processed: $($EndpointIds.Count)"
    Write-Host "  Enabled: $($Results | Where-Object { $_.Status -eq 'Enabled' } | Measure-Object).Count" -ForegroundColor Green
    Write-Host "  Failed: $($Results | Where-Object { $_.Status -like 'Failed*' } | Measure-Object).Count" -ForegroundColor $(if (($Results | Where-Object { $_.Status -like 'Failed*' }).Count -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Tamper protection enablement failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-user-activity-report',
    name: 'User Activity Audit Report',
    category: 'Reporting',
    description: 'Generate audit report of administrative user activity',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - User Activity Audit Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Days = ${params.days}
    $StartDate = (Get-Date).AddDays(-$Days)
    
    $AuditLogs = Get-SophosAuditLog -FromDate $StartDate
    
    $ActivityReport = $AuditLogs | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = $_.when
            User = $_.user_name
            UserEmail = $_.user_email
            Action = $_.action
            ResourceType = $_.resource_type
            ResourceName = $_.resource_name
            SourceIP = $_.source_ip
            Status = $_.status
            Details = $_.details
        }
    }
    
    $ActivityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "               USER ACTIVITY AUDIT REPORT                    " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Period: Last $Days days" -ForegroundColor Yellow
    Write-Host "Total Events: $($AuditLogs.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Activity by User:" -ForegroundColor Cyan
    $AuditLogs | Group-Object user_name | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) actions"
    }
    
    Write-Host ""
    Write-Host "Activity by Type:" -ForegroundColor Cyan
    $AuditLogs | Group-Object action | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "User activity report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-delete-policy',
    name: 'Delete Protection Policy',
    category: 'Policy Management',
    description: 'Delete an existing protection policy',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyId', label: 'Policy ID', type: 'text', required: true },
      { id: 'reassignPolicyId', label: 'Reassign Endpoints to Policy ID (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyId = escapePowerShellString(params.policyId);
      const reassignPolicyId = escapePowerShellString(params.reassignPolicyId || '');
      
      return `# Sophos Central - Delete Protection Policy
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $PolicyId = "${policyId}"
    $ReassignPolicyId = "${reassignPolicyId}"
    
    $Policy = Get-SophosPolicy -Id $PolicyId
    
    if (-not $Policy) {
        throw "Policy not found: $PolicyId"
    }
    
    $AssignedEndpoints = Get-SophosEndpoint | Where-Object { $_.policy_id -eq $PolicyId }
    
    Write-Host "Policy to Delete: $($Policy.name)" -ForegroundColor Yellow
    Write-Host "Assigned Endpoints: $($AssignedEndpoints.Count)" -ForegroundColor Yellow
    
    if ($AssignedEndpoints.Count -gt 0) {
        if ([string]::IsNullOrEmpty($ReassignPolicyId)) {
            throw "Policy has $($AssignedEndpoints.Count) assigned endpoints. Specify a policy to reassign them to."
        }
        
        $ReassignPolicy = Get-SophosPolicy -Id $ReassignPolicyId
        
        if (-not $ReassignPolicy) {
            throw "Reassignment policy not found: $ReassignPolicyId"
        }
        
        Write-Host "Reassigning endpoints to: $($ReassignPolicy.name)" -ForegroundColor Yellow
        
        foreach ($Endpoint in $AssignedEndpoints) {
            Set-SophosEndpointPolicy -EndpointId $Endpoint.id -PolicyId $ReassignPolicyId
            Write-Host "  [OK] Reassigned: $($Endpoint.hostname)" -ForegroundColor Green
        }
    }
    
    Remove-SophosPolicy -Id $PolicyId -Confirm:$false
    
    Write-Host ""
    Write-Host "[SUCCESS] Policy deleted successfully: $($Policy.name)" -ForegroundColor Green
    
    if ($AssignedEndpoints.Count -gt 0) {
        Write-Host "  $($AssignedEndpoints.Count) endpoints reassigned to: $($ReassignPolicy.name)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Policy deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-peripheral-control-policy',
    name: 'Configure Peripheral Control Policy',
    category: 'Policy Management',
    description: 'Configure USB and peripheral device control policies',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'usbStorage', label: 'USB Storage', type: 'select', required: true, options: ['Allow', 'Block', 'Read Only'], defaultValue: 'Block' },
      { id: 'opticalDrives', label: 'Optical Drives', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Block' },
      { id: 'wirelessDevices', label: 'Wireless Devices', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Allow' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyName = escapePowerShellString(params.policyName);
      const usbStorage = escapePowerShellString(params.usbStorage);
      const opticalDrives = escapePowerShellString(params.opticalDrives);
      const wirelessDevices = escapePowerShellString(params.wirelessDevices);
      
      return `# Sophos Central - Configure Peripheral Control Policy
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $PolicyName = "${policyName}"
    
    $ExistingPolicy = Get-SophosPeripheralControlPolicy -Name $PolicyName -ErrorAction SilentlyContinue
    
    $PolicySettings = @{
        UsbStorage = "${usbStorage}"
        OpticalDrives = "${opticalDrives}"
        WirelessDevices = "${wirelessDevices}"
    }
    
    if ($ExistingPolicy) {
        Set-SophosPeripheralControlPolicy -Id $ExistingPolicy.id @PolicySettings
        Write-Host "[SUCCESS] Updated existing peripheral control policy: $PolicyName" -ForegroundColor Green
    } else {
        $NewPolicy = New-SophosPeripheralControlPolicy -Name $PolicyName @PolicySettings
        Write-Host "[SUCCESS] Created new peripheral control policy: $PolicyName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Policy Settings:" -ForegroundColor Cyan
    Write-Host "  USB Storage: ${usbStorage}"
    Write-Host "  Optical Drives: ${opticalDrives}"
    Write-Host "  Wireless Devices: ${wirelessDevices}"
    
} catch {
    Write-Error "Peripheral control policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-application-control-policy',
    name: 'Configure Application Control Policy',
    category: 'Policy Management',
    description: 'Configure application control and blocking policies',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'blockedApps', label: 'Blocked Applications (comma-separated)', type: 'textarea', required: true, placeholder: 'BitTorrent,uTorrent,TeamViewer' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Block', 'Warn', 'Log Only'], defaultValue: 'Block' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const policyName = escapePowerShellString(params.policyName);
      const blockedAppsRaw = (params.blockedApps as string).split(',').map((n: string) => n.trim());
      const action = escapePowerShellString(params.action);
      
      return `# Sophos Central - Configure Application Control Policy
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $PolicyName = "${policyName}"
    $BlockedApps = @(${blockedAppsRaw.map(app => `"${escapePowerShellString(app)}"`).join(', ')})
    $Action = "${action}"
    
    $ExistingPolicy = Get-SophosApplicationControlPolicy -Name $PolicyName -ErrorAction SilentlyContinue
    
    if ($ExistingPolicy) {
        $Policy = $ExistingPolicy
        Write-Host "Updating existing policy: $PolicyName" -ForegroundColor Yellow
    } else {
        $Policy = New-SophosApplicationControlPolicy -Name $PolicyName
        Write-Host "Created new policy: $PolicyName" -ForegroundColor Green
    }
    
    foreach ($App in $BlockedApps) {
        Add-SophosApplicationControlRule -PolicyId $Policy.id -Application $App -Action $Action
        Write-Host "  [OK] Added rule for: $App ($Action)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Application Control Policy Configured:" -ForegroundColor Green
    Write-Host "  Policy Name: $PolicyName"
    Write-Host "  Blocked Applications: $($BlockedApps.Count)"
    Write-Host "  Action: $Action"
    
} catch {
    Write-Error "Application control policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-get-blocked-items',
    name: 'Get Blocked Items Report',
    category: 'Endpoint Protection',
    description: 'Generate report of all blocked threats, applications, and websites',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 7 },
      { id: 'blockType', label: 'Block Type', type: 'select', required: true, options: ['All', 'Malware', 'PUA', 'Web', 'Application'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const blockType = params.blockType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Blocked Items Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Days = ${params.days}
    $StartDate = (Get-Date).AddDays(-$Days)
    $BlockType = "${blockType}"
    
    $BlockedItems = Get-SophosBlockedItems -FromDate $StartDate
    
    if ($BlockType -ne 'All') {
        $BlockedItems = $BlockedItems | Where-Object { $_.type -eq $BlockType }
    }
    
    $BlockedReport = $BlockedItems | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = $_.when
            Type = $_.type
            Name = $_.name
            Endpoint = $_.endpoint
            User = $_.user
            Path = $_.path
            SHA256 = $_.sha256
            Action = $_.action_taken
            Details = $_.details
        }
    }
    
    $BlockedReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                 BLOCKED ITEMS REPORT                        " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Period: Last $Days days" -ForegroundColor Yellow
    Write-Host "Filter: $BlockType" -ForegroundColor Yellow
    Write-Host "Total Blocked: $($BlockedItems.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "By Type:" -ForegroundColor Cyan
    $BlockedItems | Group-Object type | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    
    Write-Host ""
    Write-Host "Top Affected Endpoints:" -ForegroundColor Cyan
    $BlockedItems | Group-Object endpoint | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) blocks"
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Blocked items report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-delete-firewall-rule',
    name: 'Delete Firewall Rule',
    category: 'Firewall Rules',
    description: 'Delete an existing firewall rule',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'ruleId', label: 'Rule ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const ruleId = escapePowerShellString(params.ruleId);
      
      return `# Sophos Central - Delete Firewall Rule
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $RuleId = "${ruleId}"
    
    $Rule = Get-SophosFirewallRule -Id $RuleId
    
    if (-not $Rule) {
        throw "Firewall rule not found: $RuleId"
    }
    
    Write-Host "Rule to Delete:" -ForegroundColor Yellow
    Write-Host "  Name: $($Rule.name)"
    Write-Host "  Action: $($Rule.action)"
    Write-Host "  Direction: $($Rule.direction)"
    Write-Host "  Enabled: $($Rule.enabled)"
    Write-Host ""
    
    Remove-SophosFirewallRule -Id $RuleId -Confirm:$false
    
    Write-Host "[SUCCESS] Firewall rule deleted successfully" -ForegroundColor Green
    Write-Host "  Rule Name: $($Rule.name)" -ForegroundColor Cyan
    Write-Host "  Rule ID: $RuleId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Firewall rule deletion failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-endpoint-software-inventory',
    name: 'Generate Software Inventory Report',
    category: 'Reporting',
    description: 'Generate inventory of installed software across all endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Software Inventory Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $SoftwareInventory = @()
    
    foreach ($Endpoint in $Endpoints) {
        $InstalledSoftware = Get-SophosEndpointSoftware -EndpointId $Endpoint.id
        
        foreach ($Software in $InstalledSoftware) {
            $SoftwareInventory += [PSCustomObject]@{
                Hostname = $Endpoint.hostname
                EndpointId = $Endpoint.id
                OS = $Endpoint.os
                SoftwareName = $Software.name
                Version = $Software.version
                Publisher = $Software.publisher
                InstallDate = $Software.install_date
            }
        }
    }
    
    $SoftwareInventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "               SOFTWARE INVENTORY REPORT                     " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Total Endpoints: $($Endpoints.Count)"
    Write-Host "  Total Software Entries: $($SoftwareInventory.Count)"
    Write-Host "  Unique Applications: $($SoftwareInventory | Select-Object SoftwareName -Unique | Measure-Object).Count"
    Write-Host ""
    
    Write-Host "Top 10 Most Common Applications:" -ForegroundColor Cyan
    $SoftwareInventory | Group-Object SoftwareName | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) installations"
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Software inventory report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-resolve-alert',
    name: 'Resolve Security Alert',
    category: 'Alerts & Incidents',
    description: 'Mark security alerts as resolved with resolution details',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'alertIds', label: 'Alert IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'resolution', label: 'Resolution Type', type: 'select', required: true, options: ['Remediated', 'False Positive', 'Accepted Risk', 'Duplicate'], defaultValue: 'Remediated' },
      { id: 'comment', label: 'Resolution Comment', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const alertIdsRaw = (params.alertIds as string).split(',').map((n: string) => n.trim());
      const resolution = escapePowerShellString(params.resolution);
      const comment = escapePowerShellString(params.comment);
      
      return `# Sophos Central - Resolve Security Alerts
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $AlertIds = @(${alertIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $Resolution = "${resolution}"
    $Comment = "${comment}"
    
    $Results = @()
    
    foreach ($AlertId in $AlertIds) {
        try {
            $Alert = Get-SophosAlert -Id $AlertId
            
            if (-not $Alert) {
                $Results += [PSCustomObject]@{
                    AlertId = $AlertId
                    Status = "Not Found"
                }
                Write-Host "[WARNING] Alert not found: $AlertId" -ForegroundColor Yellow
                continue
            }
            
            Set-SophosAlertStatus -Id $AlertId -Status "Resolved" -Resolution $Resolution -Comment $Comment
            
            $Results += [PSCustomObject]@{
                AlertId = $AlertId
                Status = "Resolved"
                Resolution = $Resolution
                Type = $Alert.type
            }
            Write-Host "[SUCCESS] Resolved: $AlertId ($($Alert.type))" -ForegroundColor Green
        } catch {
            $Results += [PSCustomObject]@{
                AlertId = $AlertId
                Status = "Failed: $_"
            }
            Write-Host "[FAILED] Failed: $AlertId - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Resolution Summary:" -ForegroundColor Cyan
    Write-Host "  Total Alerts: $($AlertIds.Count)"
    Write-Host "  Resolved: $($Results | Where-Object { $_.Status -eq 'Resolved' } | Measure-Object).Count" -ForegroundColor Green
    Write-Host "  Resolution Type: $Resolution"
    Write-Host "  Comment: $Comment"
    
} catch {
    Write-Error "Alert resolution failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-encryption-status-report',
    name: 'Encryption Status Report',
    category: 'Reporting',
    description: 'Generate report on disk encryption status across all endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Encryption Status Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Endpoints = Get-SophosEndpoint -Detailed
    
    $EncryptionReport = $Endpoints | ForEach-Object {
        [PSCustomObject]@{
            Hostname = $_.hostname
            EndpointId = $_.id
            OS = $_.os
            EncryptionStatus = $_.encryption_status
            EncryptionType = $_.encryption_type
            RecoveryKeyEscrowed = $_.recovery_key_escrowed
            LastSeen = $_.last_seen
            HealthStatus = $_.health_status
            GroupName = $_.group_name
        }
    }
    
    $EncryptionReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $Encrypted = ($EncryptionReport | Where-Object { $_.EncryptionStatus -eq 'encrypted' }).Count
    $NotEncrypted = ($EncryptionReport | Where-Object { $_.EncryptionStatus -ne 'encrypted' }).Count
    $KeyEscrowed = ($EncryptionReport | Where-Object { $_.RecoveryKeyEscrowed }).Count
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                ENCRYPTION STATUS REPORT                     " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Total Endpoints: $($Endpoints.Count)"
    Write-Host "  Encrypted: $Encrypted" -ForegroundColor Green
    Write-Host "  Not Encrypted: $NotEncrypted" -ForegroundColor $(if ($NotEncrypted -gt 0) { "Red" } else { "Green" })
    Write-Host "  Recovery Keys Escrowed: $KeyEscrowed" -ForegroundColor Cyan
    Write-Host ""
    
    $EncryptionPercent = [math]::Round(($Encrypted / $Endpoints.Count) * 100, 2)
    Write-Host "Encryption Coverage: $EncryptionPercent%" -ForegroundColor $(if ($EncryptionPercent -ge 95) { "Green" } elseif ($EncryptionPercent -ge 80) { "Yellow" } else { "Red" })
    
    if ($NotEncrypted -gt 0) {
        Write-Host ""
        Write-Host "Unencrypted Endpoints:" -ForegroundColor Red
        $EncryptionReport | Where-Object { $_.EncryptionStatus -ne 'encrypted' } | ForEach-Object {
            Write-Host "  - $($_.Hostname) ($($_.OS))"
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Encryption status report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-live-discover-query',
    name: 'Run Live Discover Query',
    category: 'Integration',
    description: 'Execute Live Discover queries across endpoints for threat hunting',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'queryName', label: 'Query Name', type: 'text', required: true },
      { id: 'queryText', label: 'SQL Query', type: 'textarea', required: true, placeholder: 'SELECT * FROM processes WHERE name LIKE "%suspicious%"' },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated, empty for all)', type: 'textarea', required: false },
      { id: 'exportPath', label: 'Export Results Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const queryName = escapePowerShellString(params.queryName);
      const queryText = escapePowerShellString(params.queryText);
      const endpointIdsRaw = params.endpointIds ? (params.endpointIds as string).split(',').map((n: string) => n.trim()) : [];
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Live Discover Query
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $QueryName = "${queryName}"
    $QueryText = @"
${queryText}
"@
    
    ${endpointIdsRaw.length > 0 
      ? `$TargetEndpoints = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})` 
      : `$TargetEndpoints = (Get-SophosEndpoint | Where-Object { $_.health_status -eq 'good' }).id`}
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  LIVE DISCOVER QUERY                        " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Query: $QueryName" -ForegroundColor Yellow
    Write-Host "Target Endpoints: $($TargetEndpoints.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    $QueryJob = Start-SophosLiveDiscoverQuery -Name $QueryName -Query $QueryText -EndpointIds $TargetEndpoints
    
    Write-Host "Query submitted. Job ID: $($QueryJob.id)" -ForegroundColor Cyan
    Write-Host "Waiting for results..." -ForegroundColor Gray
    
    $Timeout = 300
    $StartTime = Get-Date
    
    do {
        Start-Sleep -Seconds 5
        \$JobStatus = Get-SophosLiveDiscoverJob -Id \$QueryJob.id
        \$Elapsed = ((Get-Date) - \$StartTime).TotalSeconds
        Write-Host "  Status: \$(\$JobStatus.status) (\$Elapsed seconds elapsed)" -ForegroundColor Gray
    } while (\$JobStatus.status -eq 'running' -and \$Elapsed -lt \$Timeout)
    
    if ($JobStatus.status -eq 'completed') {
        $Results = Get-SophosLiveDiscoverResults -JobId $QueryJob.id
        $Results | Export-Csv -Path "${exportPath}" -NoTypeInformation
        
        Write-Host ""
        Write-Host "[SUCCESS] Query completed successfully" -ForegroundColor Green
        Write-Host "  Results: $($Results.Count) rows" -ForegroundColor Cyan
        Write-Host "  Exported to: ${exportPath}" -ForegroundColor Cyan
    } else {
        Write-Host "[WARNING] Query did not complete within timeout" -ForegroundColor Yellow
        Write-Host "  Final Status: $($JobStatus.status)"
    }
    
} catch {
    Write-Error "Live Discover query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-endpoint-restart',
    name: 'Restart Endpoint Protection Service',
    category: 'Endpoint Protection',
    description: 'Remotely restart the Sophos protection service on endpoints',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'endpointIds', label: 'Endpoint IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'serviceType', label: 'Service Type', type: 'select', required: true, options: ['Protection Service', 'Update Service', 'All Services'], defaultValue: 'Protection Service' }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const endpointIdsRaw = (params.endpointIds as string).split(',').map((n: string) => n.trim());
      const serviceType = escapePowerShellString(params.serviceType);
      
      return `# Sophos Central - Restart Endpoint Service
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $EndpointIds = @(${endpointIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $ServiceType = "${serviceType}"
    
    Write-Host "Restarting $ServiceType on $($EndpointIds.Count) endpoints..." -ForegroundColor Yellow
    Write-Host ""
    
    $Results = @()
    
    foreach ($EndpointId in $EndpointIds) {
        try {
            $Endpoint = Get-SophosEndpoint -Id $EndpointId
            
            if (-not $Endpoint) {
                $Results += [PSCustomObject]@{
                    Endpoint = $EndpointId
                    Status = "Not Found"
                }
                Write-Host "[WARNING] Endpoint not found: $EndpointId" -ForegroundColor Yellow
                continue
            }
            
            $RestartParams = @{
                EndpointId = $EndpointId
            }
            
            switch ($ServiceType) {
                "Protection Service" { $RestartParams.Service = "protection" }
                "Update Service" { $RestartParams.Service = "update" }
                "All Services" { $RestartParams.Service = "all" }
            }
            
            Invoke-SophosServiceRestart @RestartParams
            
            $Results += [PSCustomObject]@{
                Endpoint = $Endpoint.hostname
                Status = "Restart Initiated"
                Service = $ServiceType
            }
            Write-Host "[SUCCESS] Restart initiated: $($Endpoint.hostname)" -ForegroundColor Green
        } catch {
            $Results += [PSCustomObject]@{
                Endpoint = $EndpointId
                Status = "Failed: $_"
            }
            Write-Host "[FAILED] Failed: $EndpointId" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Restart Summary:" -ForegroundColor Cyan
    Write-Host "  Total Endpoints: $($EndpointIds.Count)"
    Write-Host "  Initiated: $($Results | Where-Object { $_.Status -eq 'Restart Initiated' } | Measure-Object).Count" -ForegroundColor Green
    Write-Host "  Failed: $($Results | Where-Object { $_.Status -like 'Failed*' } | Measure-Object).Count" -ForegroundColor $(if (($Results | Where-Object { $_.Status -like 'Failed*' }).Count -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Service restart failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-global-exclusion',
    name: 'Add Global Exclusion',
    category: 'Exclusions',
    description: 'Add a global exclusion that applies to all policies',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'exclusionType', label: 'Exclusion Type', type: 'select', required: true, options: ['Path', 'Process', 'Website', 'Application'], defaultValue: 'Path' },
      { id: 'exclusionValue', label: 'Exclusion Value', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'scanningExclusion', label: 'Exclude from Scanning', type: 'boolean', required: false, defaultValue: true },
      { id: 'exploitExclusion', label: 'Exclude from Exploit Protection', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exclusionType = escapePowerShellString(params.exclusionType);
      const exclusionValue = escapePowerShellString(params.exclusionValue);
      const description = escapePowerShellString(params.description || '');
      
      return `# Sophos Central - Add Global Exclusion
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $ExclusionParams = @{
        Type = "${exclusionType}"
        Value = "${exclusionValue}"
        ScanningExclusion = $${params.scanningExclusion ? 'true' : 'false'}
        ExploitExclusion = $${params.exploitExclusion ? 'true' : 'false'}
        ${description ? `Description = "${description}"` : ''}
    }
    
    $ExistingExclusions = Get-SophosGlobalExclusion | Where-Object { $_.value -eq "${exclusionValue}" -and $_.type -eq "${exclusionType}" }
    
    if ($ExistingExclusions) {
        Write-Host "[WARNING] Exclusion already exists:" -ForegroundColor Yellow
        Write-Host "  Type: ${exclusionType}" -ForegroundColor Cyan
        Write-Host "  Value: ${exclusionValue}" -ForegroundColor Cyan
        Write-Host "  ID: $($ExistingExclusions.id)" -ForegroundColor Cyan
    } else {
        $NewExclusion = New-SophosGlobalExclusion @ExclusionParams
        
        Write-Host "[SUCCESS] Global exclusion created successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Exclusion Details:" -ForegroundColor Cyan
        Write-Host "  ID: $($NewExclusion.id)"
        Write-Host "  Type: ${exclusionType}"
        Write-Host "  Value: ${exclusionValue}"
        Write-Host "  Scanning Exclusion: ${params.scanningExclusion ? 'Yes' : 'No'}"
        Write-Host "  Exploit Exclusion: ${params.exploitExclusion ? 'Yes' : 'No'}"
        ${description ? `Write-Host "  Description: ${description}"` : ''}
    }
    
} catch {
    Write-Error "Global exclusion creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'sophos-alert-statistics',
    name: 'Generate Alert Statistics Report',
    category: 'Alerts & Incidents',
    description: 'Generate statistical analysis of security alerts over time',
    parameters: [
      { id: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const tenantId = escapePowerShellString(params.tenantId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Sophos Central - Alert Statistics Report
# Generated: ${new Date().toISOString()}

Import-Module SophosCentral

try {
    Connect-SophosCentral -TenantId "${tenantId}"
    
    $Days = ${params.days}
    $StartDate = (Get-Date).AddDays(-$Days)
    
    $Alerts = Get-SophosAlert -FromDate $StartDate
    
    $DailyStats = $Alerts | Group-Object { ([DateTime]$_.when).Date.ToString('yyyy-MM-dd') } | ForEach-Object {
        $DayAlerts = $_.Group
        [PSCustomObject]@{
            Date = $_.Name
            TotalAlerts = $DayAlerts.Count
            Critical = ($DayAlerts | Where-Object { $_.severity -eq 'critical' }).Count
            High = ($DayAlerts | Where-Object { $_.severity -eq 'high' }).Count
            Medium = ($DayAlerts | Where-Object { $_.severity -eq 'medium' }).Count
            Low = ($DayAlerts | Where-Object { $_.severity -eq 'low' }).Count
            Resolved = ($DayAlerts | Where-Object { $_.status -eq 'resolved' }).Count
            Active = ($DayAlerts | Where-Object { $_.status -eq 'active' }).Count
        }
    } | Sort-Object Date
    
    $DailyStats | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $AvgDaily = [math]::Round($Alerts.Count / $Days, 2)
    $CriticalPercent = [math]::Round((($Alerts | Where-Object { $_.severity -eq 'critical' }).Count / $Alerts.Count) * 100, 2)
    $ResolutionRate = [math]::Round((($Alerts | Where-Object { $_.status -eq 'resolved' }).Count / $Alerts.Count) * 100, 2)
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                 ALERT STATISTICS REPORT                     " -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Period: Last $Days days" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Overall Statistics:" -ForegroundColor Cyan
    Write-Host "  Total Alerts: $($Alerts.Count)"
    Write-Host "  Daily Average: $AvgDaily"
    Write-Host "  Resolution Rate: $ResolutionRate%"
    Write-Host ""
    
    Write-Host "By Severity:" -ForegroundColor Cyan
    Write-Host "  Critical: $(($Alerts | Where-Object { $_.severity -eq 'critical' }).Count)" -ForegroundColor Red
    Write-Host "  High: $(($Alerts | Where-Object { $_.severity -eq 'high' }).Count)" -ForegroundColor Red
    Write-Host "  Medium: $(($Alerts | Where-Object { $_.severity -eq 'medium' }).Count)" -ForegroundColor Yellow
    Write-Host "  Low: $(($Alerts | Where-Object { $_.severity -eq 'low' }).Count)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Top Alert Types:" -ForegroundColor Cyan
    $Alerts | Group-Object type | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)"
    }
    
    Write-Host ""
    Write-Host "Top Affected Endpoints:" -ForegroundColor Cyan
    $Alerts | Group-Object endpoint | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) alerts"
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Alert statistics report failed: $_"
}`;
    },
    isPremium: true
  }
];
