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
  },
  {
    id: 'cs-retrieve-incidents',
    name: 'Retrieve Security Incidents',
    category: 'Common Admin Tasks',
    description: 'Retrieve and filter security incidents and alerts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'status', label: 'Incident Status', type: 'select', required: true, options: ['All', 'New', 'In Progress', 'Closed'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const status = params.status;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Retrieve Security Incidents
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    ${status !== 'All' ? `$Filter = "state:'${status}'"` : '$Filter = $null'}
    
    $Incidents = Get-FalconIncident${status !== 'All' ? ' -Filter $Filter' : ''}
    
    $Incidents | Select-Object \`
        incident_id,
        name,
        description,
        state,
        status,
        assigned_to_name,
        created,
        modified,
        host_ids | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Incidents exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Incidents: $($Incidents.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-assign-incident',
    name: 'Assign and Update Incidents',
    category: 'Common Admin Tasks',
    description: 'Assign incidents to users and update incident status',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'incidentId', label: 'Incident ID', type: 'text', required: true },
      { id: 'assignTo', label: 'Assign To (User UUID)', type: 'text', required: true },
      { id: 'newStatus', label: 'New Status', type: 'select', required: true, options: ['New', 'In Progress', 'Closed'], defaultValue: 'In Progress' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const incidentId = escapePowerShellString(params.incidentId);
      const assignTo = escapePowerShellString(params.assignTo);
      const newStatus = escapePowerShellString(params.newStatus);
      
      return `# CrowdStrike Assign and Update Incident
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $IncidentId = "${incidentId}"
    $AssignTo = "${assignTo}"
    $NewStatus = "${newStatus}"
    
    Edit-FalconIncident -Id $IncidentId -assigned_to_uuid $AssignTo -status $NewStatus
    
    Write-Host "✓ Incident $IncidentId updated successfully" -ForegroundColor Green
    Write-Host "  Assigned To: $AssignTo" -ForegroundColor Cyan
    Write-Host "  Status: $NewStatus" -ForegroundColor Cyan
    
} catch {
    Write-Error "Update failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-download-forensics',
    name: 'Download Forensic Data',
    category: 'Common Admin Tasks',
    description: 'Download forensic data and quarantined files from hosts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'sessionId', label: 'RTR Session ID', type: 'text', required: true },
      { id: 'filePath', label: 'Remote File Path', type: 'path', required: true },
      { id: 'localPath', label: 'Local Save Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const sessionId = escapePowerShellString(params.sessionId);
      const filePath = escapePowerShellString(params.filePath);
      const localPath = escapePowerShellString(params.localPath);
      
      return `# CrowdStrike Download Forensic Data
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $SessionId = "${sessionId}"
    $RemoteFile = "${filePath}"
    $LocalPath = "${localPath}"
    
    # Execute get command in RTR session
    $GetCmd = Invoke-FalconRtr -Command "get" -Arguments $RemoteFile -SessionId $SessionId
    
    # Download the file
    Receive-FalconRtrGetFile -SessionId $SessionId -Sha256 $GetCmd.sha256 -OutputPath $LocalPath
    
    Write-Host "✓ Forensic data downloaded: $LocalPath" -ForegroundColor Green
    
} catch {
    Write-Error "Download failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-manage-prevention-policy',
    name: 'Manage Prevention Policies',
    category: 'Common Admin Tasks',
    description: 'Configure and apply prevention policies to host groups',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'hostGroupIds', label: 'Host Group IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policyName = escapePowerShellString(params.policyName);
      const hostGroupIdsRaw = (params.hostGroupIds as string).split(',').map((n: string) => n.trim());
      
      return `# CrowdStrike Manage Prevention Policies
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $Policy = Get-FalconPreventionPolicy -Filter "name:'${policyName}'"
    $HostGroupIds = @(${hostGroupIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    foreach ($GroupId in $HostGroupIds) {
        Edit-FalconPreventionPolicy -Id $Policy.id -groups @($GroupId)
        Write-Host "✓ Policy applied to group: $GroupId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Prevention policy '${policyName}' applied to $($HostGroupIds.Count) host groups" -ForegroundColor Green
    
} catch {
    Write-Error "Policy assignment failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-compliance-report',
    name: 'Generate Security Compliance Report',
    category: 'Common Admin Tasks',
    description: 'Generate comprehensive security compliance reports',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['Host Compliance', 'Detection Summary', 'Policy Coverage'], defaultValue: 'Host Compliance' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Security Compliance Report
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Generating ${reportType} report..." -ForegroundColor Cyan
    
    switch ("${reportType}") {
        "Host Compliance" {
            $Hosts = Get-FalconHost -Detailed
            $Report = $Hosts | Select-Object \`
                hostname,
                os_version,
                agent_version,
                last_seen,
                status,
                platform_name,
                reduced_functionality_mode
        }
        "Detection Summary" {
            $Detections = Get-FalconDetection
            $Report = $Detections | Group-Object severity | Select-Object \`
                @{N='Severity';E={$_.Name}},
                @{N='Count';E={$_.Count}}
        }
        "Policy Coverage" {
            $Policies = Get-FalconPreventionPolicy
            $Report = $Policies | Select-Object \`
                name,
                platform_name,
                enabled,
                groups
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Compliance report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-search-iocs',
    name: 'Search for IOCs Across Hosts',
    category: 'Common Admin Tasks',
    description: 'Search for indicators of compromise across all managed hosts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'iocType', label: 'IOC Type', type: 'select', required: true, options: ['Hash', 'IP Address', 'Domain', 'File Path'], defaultValue: 'Hash' },
      { id: 'iocValue', label: 'IOC Value', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Results CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const iocType = params.iocType;
      const iocValue = escapePowerShellString(params.iocValue);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Search for IOCs
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Searching for ${iocType}: ${iocValue}" -ForegroundColor Cyan
    
    $FilterField = switch ("${iocType}") {
        "Hash" { "sha256" }
        "IP Address" { "local_ip" }
        "Domain" { "domain" }
        "File Path" { "filename" }
    }
    
    $Filter = "$FilterField:'${iocValue}'"
    $Results = Get-FalconHost -Filter $Filter -Detailed
    
    $Report = $Results | Select-Object \`
        hostname,
        local_ip,
        os_version,
        last_seen,
        status,
        @{N='IOC_Type';E={"${iocType}"}},
        @{N='IOC_Value';E={"${iocValue}"}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ IOC search completed" -ForegroundColor Green
    Write-Host "  Matches Found: $($Results.Count)" -ForegroundColor Cyan
    Write-Host "  Results exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "IOC search failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cs-host-inventory',
    name: 'Retrieve Host Inventory',
    category: 'Common Admin Tasks',
    description: 'Retrieve complete host inventory with detailed information',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'osFilter', label: 'OS Filter', type: 'select', required: false, options: ['All', 'Windows', 'Linux', 'Mac'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const osFilter = params.osFilter;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Host Inventory
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Retrieving host inventory..." -ForegroundColor Cyan
    
    ${osFilter !== 'All' ? `$Filter = "platform_name:'${osFilter}'"` : '$Filter = $null'}
    
    $Hosts = Get-FalconHost${osFilter !== 'All' ? ' -Filter $Filter' : ''} -Detailed
    
    $Inventory = $Hosts | Select-Object \`
        hostname,
        device_id,
        platform_name,
        os_version,
        system_manufacturer,
        system_product_name,
        bios_version,
        agent_version,
        first_seen,
        last_seen,
        local_ip,
        mac_address,
        status,
        tags
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Host inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Hosts: $($Hosts.Count)" -ForegroundColor Cyan
    ${osFilter !== 'All' ? `Write-Host "  OS Filter: ${osFilter}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Inventory retrieval failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
