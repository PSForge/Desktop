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
    category: 'Host Management',
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
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostIds = @(${hostIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    Invoke-FalconContainment -Ids $HostIds -Action "${action}"
    
    Write-Host "[SUCCESS] ${params.action} action initiated for $($HostIds.Count) hosts" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-query-detections',
    name: 'Query Security Detections',
    category: 'Detection Management',
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
    
    Write-Host "[SUCCESS] Detections exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Detections: $($Detections.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    },
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
        Write-Host "[WARNING] Host not found: ${hostname}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-retrieve-incidents',
    name: 'Retrieve Security Incidents',
    category: 'Detection Management',
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
    
    Write-Host "[SUCCESS] Incidents exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Incidents: $($Incidents.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-assign-incident',
    name: 'Assign and Update Incidents',
    category: 'Detection Management',
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
    
    Write-Host "[SUCCESS] Incident $IncidentId updated successfully" -ForegroundColor Green
    Write-Host "  Assigned To: $AssignTo" -ForegroundColor Cyan
    Write-Host "  Status: $NewStatus" -ForegroundColor Cyan
    
} catch {
    Write-Error "Update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-download-forensics',
    name: 'Download Forensic Data',
    category: 'Real-Time Response',
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
    
    $GetCmd = Invoke-FalconRtr -Command "get" -Arguments $RemoteFile -SessionId $SessionId
    
    Receive-FalconRtrGetFile -SessionId $SessionId -Sha256 $GetCmd.sha256 -OutputPath $LocalPath
    
    Write-Host "[SUCCESS] Forensic data downloaded: $LocalPath" -ForegroundColor Green
    
} catch {
    Write-Error "Download failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-manage-prevention-policy',
    name: 'Manage Prevention Policies',
    category: 'Prevention Policies',
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
        Write-Host "[SUCCESS] Policy applied to group: $GroupId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Prevention policy '${policyName}' applied to $($HostGroupIds.Count) host groups" -ForegroundColor Green
    
} catch {
    Write-Error "Policy assignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-compliance-report',
    name: 'Generate Security Compliance Report',
    category: 'Reporting',
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
    
    Write-Host "[SUCCESS] Compliance report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-search-iocs',
    name: 'Search for IOCs Across Hosts',
    category: 'IOC Management',
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
    
    Write-Host "[SUCCESS] IOC search completed" -ForegroundColor Green
    Write-Host "  Matches Found: $($Results.Count)" -ForegroundColor Cyan
    Write-Host "  Results exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "IOC search failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-host-inventory',
    name: 'Retrieve Host Inventory',
    category: 'Host Management',
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
    
    Write-Host "[SUCCESS] Host inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Hosts: $($Hosts.Count)" -ForegroundColor Cyan
    ${osFilter !== 'All' ? `Write-Host "  OS Filter: ${osFilter}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Inventory retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-configure-rtr-policies',
    name: 'Configure Real-Time Response Policies',
    category: 'Response Policies',
    description: 'Enable/disable RTR capabilities and configure session timeouts for response operations',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policyName', label: 'RTR Policy Name', type: 'text', required: true },
      { id: 'enableRTR', label: 'Enable RTR', type: 'boolean', required: true, defaultValue: true },
      { id: 'sessionTimeout', label: 'Session Timeout (minutes)', type: 'number', required: true, defaultValue: 30, description: 'RTR session timeout in minutes (1-480)' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policyName = escapePowerShellString(params.policyName);
      const enableRTR = params.enableRTR ? '$true' : '$false';
      const sessionTimeout = params.sessionTimeout;
      
      return `# CrowdStrike Configure Real-Time Response Policies
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Configuring RTR Policy: ${policyName}" -ForegroundColor Cyan
    
    $Policy = Get-FalconResponsePolicy -Filter "name:'${policyName}'"
    
    if (-not $Policy) {
        Write-Host "Creating new RTR policy..." -ForegroundColor Yellow
        $Policy = New-FalconResponsePolicy -name "${policyName}" -platform_name "Windows"
    }
    
    $Settings = @{
        Id = $Policy.id
        settings = @{
            enable_rtr = ${enableRTR}
            session_timeout = ${sessionTimeout}
        }
    }
    
    Edit-FalconResponsePolicy @Settings
    
    Write-Host "[SUCCESS] RTR Policy configured successfully" -ForegroundColor Green
    Write-Host "  Policy Name: ${policyName}" -ForegroundColor Cyan
    Write-Host "  RTR Enabled: ${params.enableRTR}" -ForegroundColor Cyan
    Write-Host "  Session Timeout: ${sessionTimeout} minutes" -ForegroundColor Cyan
    
} catch {
    Write-Error "RTR policy configuration failed: $_"
    Write-Host "Please verify policy name and timeout value (1-480 minutes)" -ForegroundColor Yellow
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-manage-exclusions',
    name: 'Manage Detection Exclusions',
    category: 'Prevention Policies',
    description: 'Add or remove hash, path, and behavior-based detection exclusions',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'exclusionType', label: 'Exclusion Type', type: 'select', required: true, options: ['Hash (SHA256)', 'File Path', 'Registry Path', 'Behavior'], defaultValue: 'Hash (SHA256)' },
      { id: 'exclusionValue', label: 'Exclusion Value', type: 'text', required: true, description: 'Hash, file path, registry path, or behavior pattern to exclude' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'description', label: 'Exclusion Description', type: 'text', required: true, description: 'Justification for this exclusion' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const exclusionType = params.exclusionType;
      const exclusionValue = escapePowerShellString(params.exclusionValue);
      const action = params.action;
      const description = escapePowerShellString(params.description);
      
      return `# CrowdStrike Manage Detection Exclusions
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $ExclusionType = "${exclusionType}"
    $ExclusionValue = "${exclusionValue}"
    $Description = "${description}"
    
    Write-Host "${action} ${exclusionType} exclusion..." -ForegroundColor Cyan
    
    $TypeParam = switch ($ExclusionType) {
        "Hash (SHA256)" { 
            @{ value = $ExclusionValue; type = "sha256" }
        }
        "File Path" { 
            @{ value = $ExclusionValue; type = "path" }
        }
        "Registry Path" { 
            @{ value = $ExclusionValue; type = "registry_path" }
        }
        "Behavior" { 
            @{ value = $ExclusionValue; type = "behavior" }
        }
    }
    
    if ("${action}" -eq "Add") {
        New-FalconIoaExclusion @TypeParam -description $Description
        Write-Host "[SUCCESS] Exclusion added successfully" -ForegroundColor Green
    } else {
        $Exclusions = Get-FalconIoaExclusion -Filter "value:'$ExclusionValue'"
        if ($Exclusions) {
            Remove-FalconIoaExclusion -Ids $Exclusions.id
            Write-Host "[SUCCESS] Exclusion removed successfully" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Exclusion not found" -ForegroundColor Yellow
        }
    }
    
    Write-Host "  Type: $ExclusionType" -ForegroundColor Cyan
    Write-Host "  Value: $ExclusionValue" -ForegroundColor Cyan
    Write-Host "  Description: $Description" -ForegroundColor Cyan
    
} catch {
    Write-Error "Exclusion management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-execute-rtr-commands',
    name: 'Execute Real-Time Response Commands',
    category: 'Real-Time Response',
    description: 'Run investigative commands on remote endpoints (ps, netstat, ls, reg query)',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostId', label: 'Target Host ID', type: 'text', required: true },
      { id: 'command', label: 'RTR Command', type: 'select', required: true, options: ['ps (Process List)', 'netstat (Network Connections)', 'ls (List Files)', 'reg query (Registry)', 'cat (View File)'], defaultValue: 'ps (Process List)' },
      { id: 'commandArgs', label: 'Command Arguments', type: 'text', required: false, description: 'Optional command arguments (e.g., file path, registry key)' },
      { id: 'exportPath', label: 'Export Results Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostId = escapePowerShellString(params.hostId);
      const command = params.command.split(' ')[0];
      const commandArgs = params.commandArgs ? escapePowerShellString(params.commandArgs) : '';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Execute Real-Time Response Commands
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostId = "${hostId}"
    $Command = "${command}"
    ${commandArgs ? `$CommandArgs = "${commandArgs}"` : '$CommandArgs = $null'}
    
    Write-Host "Initiating RTR session with host: $HostId" -ForegroundColor Cyan
    
    $Session = Start-FalconSession -Id $HostId
    
    if ($Session) {
        Write-Host "[SUCCESS] RTR session established: $($Session.session_id)" -ForegroundColor Green
        
        Write-Host "Executing command: $Command" -ForegroundColor Cyan
        
        if ($CommandArgs) {
            $Result = Invoke-FalconRtr -Command $Command -Arguments $CommandArgs -SessionId $Session.session_id
        } else {
            $Result = Invoke-FalconRtr -Command $Command -SessionId $Session.session_id
        }
        
        $Result | Out-File -FilePath "${exportPath}" -Encoding UTF8
        
        Write-Host "[SUCCESS] Command executed successfully" -ForegroundColor Green
        Write-Host "  Results exported: ${exportPath}" -ForegroundColor Cyan
        Write-Host "  Output Preview:" -ForegroundColor Yellow
        Write-Host $Result.stdout -ForegroundColor Gray
        
        Remove-FalconSession -SessionId $Session.session_id
        Write-Host "[SUCCESS] RTR session closed" -ForegroundColor Green
        
    } else {
        Write-Error "Failed to establish RTR session"
    }
    
} catch {
    Write-Error "RTR command execution failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-threat-intel-reports',
    name: 'Generate Threat Intelligence Reports',
    category: 'Reporting',
    description: 'Export comprehensive threat intelligence reports including IOCs and threat actor data',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['IOC Summary', 'Threat Actors', 'Malware Families', 'Adversary Intelligence'], defaultValue: 'IOC Summary' },
      { id: 'timeRange', label: 'Time Range', type: 'select', required: true, options: ['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'], defaultValue: 'Last 7 Days' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const reportType = params.reportType;
      const timeRange = params.timeRange;
      const exportPath = escapePowerShellString(params.exportPath);
      
      const daysMap: Record<string, string> = {
        'Last 24 Hours': '1',
        'Last 7 Days': '7',
        'Last 30 Days': '30',
        'Last 90 Days': '90'
      };
      const days = daysMap[timeRange];
      
      return `# CrowdStrike Generate Threat Intelligence Reports
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Generating ${reportType} report for ${timeRange}" -ForegroundColor Cyan
    
    $DateFilter = (Get-Date).AddDays(-${days}).ToString("yyyy-MM-dd")
    
    switch ("${reportType}") {
        "IOC Summary" {
            $Indicators = Get-FalconIndicator -Filter "created_date:>='$DateFilter'"
            $Report = $Indicators | Select-Object \`
                indicator,
                type,
                malicious_confidence,
                published_date,
                malware_families,
                kill_chains,
                threat_types,
                labels
        }
        "Threat Actors" {
            $Actors = Get-FalconActor -Filter "last_modified_date:>='$DateFilter'"
            $Report = $Actors | Select-Object \`
                name,
                description,
                origins,
                target_countries,
                target_industries,
                first_activity_date,
                last_activity_date,
                capability,
                motivations
        }
        "Malware Families" {
            $Malware = Get-FalconMalwareFamily
            $Report = $Malware | Select-Object \`
                name,
                description,
                first_seen,
                last_seen,
                platforms,
                capabilities
        }
        "Adversary Intelligence" {
            $Adversaries = Get-FalconAdversary
            $Report = $Adversaries | Select-Object \`
                adversary,
                description,
                regions,
                verticals,
                last_modified,
                active
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Threat intelligence report generated" -ForegroundColor Green
    Write-Host "  Report Type: ${reportType}" -ForegroundColor Cyan
    Write-Host "  Time Range: ${timeRange}" -ForegroundColor Cyan
    Write-Host "  Total Records: $($Report.Count)" -ForegroundColor Cyan
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Threat intelligence report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-custom-ioc-lists',
    name: 'Manage Custom IOC Lists',
    category: 'IOC Management',
    description: 'Create and update custom IOC lists for automated blocking and detection',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'listName', label: 'IOC List Name', type: 'text', required: true },
      { id: 'iocType', label: 'IOC Type', type: 'select', required: true, options: ['SHA256', 'MD5', 'Domain', 'IPv4', 'IPv6'], defaultValue: 'SHA256' },
      { id: 'iocValues', label: 'IOC Values (one per line)', type: 'textarea', required: true, description: 'Enter one IOC per line' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Detect', 'Prevent'], defaultValue: 'Prevent', description: 'Detect: Alert only, Prevent: Block execution' },
      { id: 'severity', label: 'Severity', type: 'select', required: true, options: ['Critical', 'High', 'Medium', 'Low'], defaultValue: 'High' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const listName = escapePowerShellString(params.listName);
      const iocType = params.iocType;
      const iocValuesRaw = (params.iocValues as string).split('\n').map((v: string) => v.trim()).filter((v: string) => v.length > 0);
      const action = params.action.toLowerCase();
      const severity = params.severity.toLowerCase();
      
      return `# CrowdStrike Manage Custom IOC Lists
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $ListName = "${listName}"
    $IOCType = "${iocType}"
    $Action = "${action}"
    $Severity = "${severity}"
    
    Write-Host "Creating/Updating custom IOC list: $ListName" -ForegroundColor Cyan
    
    $IOCs = @(${iocValuesRaw.map(ioc => `"${escapePowerShellString(ioc)}"`).join(',\n        ')})
    
    Write-Host "Processing $($IOCs.Count) indicators..." -ForegroundColor Yellow
    
    foreach ($IOC in $IOCs) {
        try {
            $Params = @{
                type = $IOCType
                value = $IOC
                action = $Action
                severity = $Severity
                description = "Custom IOC from list: $ListName"
                platforms = @("windows", "mac", "linux")
                applied_globally = $true
            }
            
            New-FalconIndicator @Params
            Write-Host "  [SUCCESS] Added: $IOC" -ForegroundColor Green
            
        } catch {
            Write-Host "  [FAILED] Failed: $IOC - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Custom IOC list processing complete" -ForegroundColor Green
    Write-Host "  List Name: $ListName" -ForegroundColor Cyan
    Write-Host "  IOC Type: $IOCType" -ForegroundColor Cyan
    Write-Host "  Action: $Action" -ForegroundColor Cyan
    Write-Host "  Severity: $Severity" -ForegroundColor Cyan
    Write-Host "  Total IOCs: $($IOCs.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Custom IOC list management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-sensor-update-policies',
    name: 'Configure Sensor Update Policies',
    category: 'Sensor Management',
    description: 'Manage sensor versions, update schedules, and maintenance windows',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policyName', label: 'Update Policy Name', type: 'text', required: true },
      { id: 'sensorVersion', label: 'Target Sensor Version', type: 'text', required: false, description: 'Specific version or leave empty for latest' },
      { id: 'updateSchedule', label: 'Update Schedule', type: 'select', required: true, options: ['Immediate', 'Staged (25% per day)', 'Maintenance Window Only'], defaultValue: 'Staged (25% per day)' },
      { id: 'maintenanceWindow', label: 'Maintenance Window', type: 'select', required: true, options: ['Anytime', 'Off Hours (6PM-6AM)', 'Weekends Only', 'Custom'], defaultValue: 'Off Hours (6PM-6AM)' },
      { id: 'hostGroupIds', label: 'Target Host Group IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policyName = escapePowerShellString(params.policyName);
      const sensorVersion = params.sensorVersion ? escapePowerShellString(params.sensorVersion) : 'latest';
      const updateSchedule = params.updateSchedule;
      const maintenanceWindow = params.maintenanceWindow;
      const hostGroupIdsRaw = (params.hostGroupIds as string).split(',').map((g: string) => g.trim());
      
      return `# CrowdStrike Configure Sensor Update Policies
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $PolicyName = "${policyName}"
    $SensorVersion = "${sensorVersion}"
    $HostGroupIds = @(${hostGroupIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    Write-Host "Configuring sensor update policy: $PolicyName" -ForegroundColor Cyan
    
    $Policy = Get-FalconSensorUpdatePolicy -Filter "name:'$PolicyName'"
    
    $ScheduleSettings = switch ("${updateSchedule}") {
        "Immediate" { @{ enabled = $true; uninstall_protection = $true } }
        "Staged (25% per day)" { @{ enabled = $true; stages = 4; uninstall_protection = $true } }
        "Maintenance Window Only" { @{ enabled = $true; scheduler = "maintenance_window"; uninstall_protection = $true } }
    }
    
    $WindowSettings = switch ("${maintenanceWindow}") {
        "Anytime" { $null }
        "Off Hours (6PM-6AM)" { @{ start = "18:00"; end = "06:00" } }
        "Weekends Only" { @{ days = @("saturday", "sunday") } }
        "Custom" { @{ start = "22:00"; end = "04:00" } }
    }
    
    if (-not $Policy) {
        Write-Host "Creating new sensor update policy..." -ForegroundColor Yellow
        
        $PolicyParams = @{
            name = $PolicyName
            platform_name = "Windows"
            settings = $ScheduleSettings
        }
        
        if ($SensorVersion -ne "latest") {
            $PolicyParams.settings.sensor_version = $SensorVersion
        }
        
        if ($WindowSettings) {
            $PolicyParams.settings.maintenance_window = $WindowSettings
        }
        
        $Policy = New-FalconSensorUpdatePolicy @PolicyParams
    } else {
        Write-Host "Updating existing policy..." -ForegroundColor Yellow
        
        $UpdateParams = @{
            Id = $Policy.id
            settings = $ScheduleSettings
        }
        
        if ($SensorVersion -ne "latest") {
            $UpdateParams.settings.sensor_version = $SensorVersion
        }
        
        if ($WindowSettings) {
            $UpdateParams.settings.maintenance_window = $WindowSettings
        }
        
        Edit-FalconSensorUpdatePolicy @UpdateParams
    }
    
    foreach ($GroupId in $HostGroupIds) {
        Edit-FalconSensorUpdatePolicy -Id $Policy.id -groups @($GroupId)
        Write-Host "  [SUCCESS] Policy applied to group: $GroupId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Sensor update policy configured successfully" -ForegroundColor Green
    Write-Host "  Policy Name: $PolicyName" -ForegroundColor Cyan
    Write-Host "  Target Version: $SensorVersion" -ForegroundColor Cyan
    Write-Host "  Update Schedule: ${updateSchedule}" -ForegroundColor Cyan
    Write-Host "  Maintenance Window: ${maintenanceWindow}" -ForegroundColor Cyan
    Write-Host "  Applied to $($HostGroupIds.Count) host groups" -ForegroundColor Cyan
    
} catch {
    Write-Error "Sensor update policy configuration failed: $_"
    Write-Host "Please verify host group IDs and sensor version" -ForegroundColor Yellow
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-host-search-advanced',
    name: 'Advanced Host Search',
    category: 'Host Management',
    description: 'Search hosts using multiple criteria including tags, status, and last seen time',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'searchField', label: 'Search Field', type: 'select', required: true, options: ['Hostname', 'IP Address', 'Tag', 'Agent Version', 'OS Version'], defaultValue: 'Hostname' },
      { id: 'searchValue', label: 'Search Value', type: 'text', required: true },
      { id: 'statusFilter', label: 'Status Filter', type: 'select', required: false, options: ['All', 'Normal', 'Contained', 'Reduced Functionality'], defaultValue: 'All' },
      { id: 'lastSeenDays', label: 'Last Seen Within (days)', type: 'number', required: false, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const searchField = params.searchField;
      const searchValue = escapePowerShellString(params.searchValue);
      const statusFilter = params.statusFilter;
      const lastSeenDays = params.lastSeenDays || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Advanced Host Search
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Performing advanced host search..." -ForegroundColor Cyan
    
    $FilterField = switch ("${searchField}") {
        "Hostname" { "hostname" }
        "IP Address" { "local_ip" }
        "Tag" { "tags" }
        "Agent Version" { "agent_version" }
        "OS Version" { "os_version" }
    }
    
    $Filters = @()
    $Filters += "$FilterField:*'${searchValue}'*"
    
    ${statusFilter !== 'All' ? `$Filters += "status:'${statusFilter}'"` : ''}
    
    $LastSeenDate = (Get-Date).AddDays(-${lastSeenDays}).ToString("yyyy-MM-dd")
    $Filters += "last_seen:>='$LastSeenDate'"
    
    $FilterString = $Filters -join "+"
    
    $Hosts = Get-FalconHost -Filter $FilterString -Detailed
    
    $Results = $Hosts | Select-Object \`
        hostname,
        device_id,
        local_ip,
        external_ip,
        platform_name,
        os_version,
        agent_version,
        status,
        last_seen,
        first_seen,
        tags,
        groups
    
    $Results | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Advanced host search completed" -ForegroundColor Green
    Write-Host "  Search Field: ${searchField}" -ForegroundColor Cyan
    Write-Host "  Search Value: ${searchValue}" -ForegroundColor Cyan
    Write-Host "  Hosts Found: $($Hosts.Count)" -ForegroundColor Cyan
    Write-Host "  Results exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Host search failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-bulk-tag-hosts',
    name: 'Bulk Tag/Untag Hosts',
    category: 'Host Management',
    description: 'Add or remove tags from multiple hosts for organization and policy targeting',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostIds', label: 'Host IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'tags', label: 'Tags (comma-separated)', type: 'text', required: true, description: 'Tags to add or remove (e.g., Production, Finance, Critical)' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add Tags', 'Remove Tags'], defaultValue: 'Add Tags' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostIdsRaw = (params.hostIds as string).split(',').map((n: string) => n.trim());
      const tagsRaw = (params.tags as string).split(',').map((t: string) => t.trim());
      const action = params.action;
      
      return `# CrowdStrike Bulk Tag/Untag Hosts
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostIds = @(${hostIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $Tags = @(${tagsRaw.map(t => `"FalconGroupingTags/${escapePowerShellString(t)}"`).join(', ')})
    
    Write-Host "${action} for $($HostIds.Count) hosts..." -ForegroundColor Cyan
    
    foreach ($HostId in $HostIds) {
        try {
            if ("${action}" -eq "Add Tags") {
                Edit-FalconHost -Id $HostId -tags $Tags
            } else {
                $CurrentHost = Get-FalconHost -Id $HostId
                $NewTags = $CurrentHost.tags | Where-Object { $_ -notin $Tags }
                Edit-FalconHost -Id $HostId -tags $NewTags
            }
            Write-Host "  [SUCCESS] Updated: $HostId" -ForegroundColor Green
        } catch {
            Write-Host "  [FAILED] Failed: $HostId - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Bulk tag operation completed" -ForegroundColor Green
    Write-Host "  Action: ${action}" -ForegroundColor Cyan
    Write-Host "  Hosts Processed: $($HostIds.Count)" -ForegroundColor Cyan
    Write-Host "  Tags: ${params.tags}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Bulk tag operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-hide-unhide-hosts',
    name: 'Hide/Unhide Hosts',
    category: 'Host Management',
    description: 'Hide inactive hosts from inventory or unhide previously hidden hosts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostIds', label: 'Host IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Hide', 'Unhide'], defaultValue: 'Hide' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostIdsRaw = (params.hostIds as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      
      return `# CrowdStrike Hide/Unhide Hosts
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostIds = @(${hostIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    Write-Host "${action} $($HostIds.Count) hosts..." -ForegroundColor Cyan
    
    if ("${action}" -eq "Hide") {
        Invoke-FalconHostAction -Action hide_host -Ids $HostIds
    } else {
        Invoke-FalconHostAction -Action unhide_host -Ids $HostIds
    }
    
    Write-Host "[SUCCESS] ${action} operation completed for $($HostIds.Count) hosts" -ForegroundColor Green
    
} catch {
    Write-Error "${action} operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-detection-status-update',
    name: 'Bulk Update Detection Status',
    category: 'Detection Management',
    description: 'Update status for multiple detections (new, in progress, true positive, false positive, closed)',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'detectionIds', label: 'Detection IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'newStatus', label: 'New Status', type: 'select', required: true, options: ['new', 'in_progress', 'true_positive', 'false_positive', 'closed', 'reopened'], defaultValue: 'closed' },
      { id: 'comment', label: 'Status Comment', type: 'text', required: false, description: 'Optional comment for the status change' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const detectionIdsRaw = (params.detectionIds as string).split(',').map((n: string) => n.trim());
      const newStatus = params.newStatus;
      const comment = params.comment ? escapePowerShellString(params.comment) : '';
      
      return `# CrowdStrike Bulk Update Detection Status
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $DetectionIds = @(${detectionIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $NewStatus = "${newStatus}"
    ${comment ? `$Comment = "${comment}"` : '$Comment = $null'}
    
    Write-Host "Updating $($DetectionIds.Count) detections to status: $NewStatus" -ForegroundColor Cyan
    
    $UpdateParams = @{
        Ids = $DetectionIds
        status = $NewStatus
    }
    
    if ($Comment) {
        $UpdateParams.comment = $Comment
    }
    
    Edit-FalconDetection @UpdateParams
    
    Write-Host "[SUCCESS] Detection status update completed" -ForegroundColor Green
    Write-Host "  Detections Updated: $($DetectionIds.Count)" -ForegroundColor Cyan
    Write-Host "  New Status: $NewStatus" -ForegroundColor Cyan
    ${comment ? `Write-Host "  Comment: ${comment}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Detection status update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-add-detection-notes',
    name: 'Add Notes to Detections',
    category: 'Detection Management',
    description: 'Add investigation notes and comments to detections for documentation',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'detectionId', label: 'Detection ID', type: 'text', required: true },
      { id: 'note', label: 'Investigation Note', type: 'textarea', required: true, description: 'Note content to add to the detection' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const detectionId = escapePowerShellString(params.detectionId);
      const note = escapePowerShellString(params.note);
      
      return `# CrowdStrike Add Notes to Detection
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $DetectionId = "${detectionId}"
    $Note = "${note}"
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "Adding note to detection: $DetectionId" -ForegroundColor Cyan
    
    Edit-FalconDetection -Id $DetectionId -comment "[$Timestamp] $Note"
    
    Write-Host "[SUCCESS] Note added successfully" -ForegroundColor Green
    Write-Host "  Detection ID: $DetectionId" -ForegroundColor Cyan
    Write-Host "  Timestamp: $Timestamp" -ForegroundColor Cyan
    Write-Host "  Note Preview: $($Note.Substring(0, [Math]::Min(100, $Note.Length)))..." -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to add note: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-detection-timeline',
    name: 'Export Detection Timeline',
    category: 'Detection Management',
    description: 'Export chronological detection timeline with behaviors and tactics',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'detectionId', label: 'Detection ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const detectionId = escapePowerShellString(params.detectionId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Export Detection Timeline
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $DetectionId = "${detectionId}"
    
    Write-Host "Retrieving detection timeline: $DetectionId" -ForegroundColor Cyan
    
    $Detection = Get-FalconDetection -Id $DetectionId -Detailed
    
    $Timeline = $Detection.behaviors | ForEach-Object {
        [PSCustomObject]@{
            Timestamp = $_.timestamp
            Tactic = $_.tactic
            Technique = $_.technique
            TechniqueId = $_.technique_id
            DisplayName = $_.display_name
            Description = $_.description
            Severity = $_.severity
            Confidence = $_.confidence
            Cmdline = $_.cmdline
            Filename = $_.filename
            Filepath = $_.filepath
            ParentDetails = $_.parent_details
            UserName = $_.user_name
            Objective = $_.objective
        }
    } | Sort-Object Timestamp
    
    $Timeline | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Detection timeline exported" -ForegroundColor Green
    Write-Host "  Detection ID: $DetectionId" -ForegroundColor Cyan
    Write-Host "  Total Behaviors: $($Timeline.Count)" -ForegroundColor Cyan
    Write-Host "  Exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Timeline export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-create-prevention-policy',
    name: 'Create Prevention Policy',
    category: 'Prevention Policies',
    description: 'Create a new prevention policy with custom detection and prevention settings',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'description', label: 'Policy Description', type: 'text', required: true },
      { id: 'platformName', label: 'Platform', type: 'select', required: true, options: ['Windows', 'Mac', 'Linux'], defaultValue: 'Windows' },
      { id: 'mlDetection', label: 'ML-Based Detection', type: 'select', required: true, options: ['Disabled', 'Moderate', 'Aggressive', 'Extra Aggressive'], defaultValue: 'Aggressive' },
      { id: 'cloudProtection', label: 'Cloud Anti-Malware', type: 'boolean', required: true, defaultValue: true },
      { id: 'sensorAntiMalware', label: 'Sensor Anti-Malware', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policyName = escapePowerShellString(params.policyName);
      const description = escapePowerShellString(params.description);
      const platformName = params.platformName;
      const mlDetection = params.mlDetection;
      const cloudProtection = params.cloudProtection ? '$true' : '$false';
      const sensorAntiMalware = params.sensorAntiMalware ? '$true' : '$false';
      
      return `# CrowdStrike Create Prevention Policy
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Creating prevention policy: ${policyName}" -ForegroundColor Cyan
    
    $MLLevel = switch ("${mlDetection}") {
        "Disabled" { 0 }
        "Moderate" { 1 }
        "Aggressive" { 2 }
        "Extra Aggressive" { 3 }
    }
    
    $PolicySettings = @{
        prevention = @{
            cloud_anti_malware = @{
                detection = ${cloudProtection}
                prevention = ${cloudProtection}
            }
            sensor_anti_malware = @{
                detection = ${sensorAntiMalware}
                prevention = ${sensorAntiMalware}
            }
            on_sensor_ml_slider = $MLLevel
        }
    }
    
    $Policy = New-FalconPreventionPolicy \`
        -name "${policyName}" \`
        -description "${description}" \`
        -platform_name "${platformName}" \`
        -settings $PolicySettings
    
    Write-Host "[SUCCESS] Prevention policy created successfully" -ForegroundColor Green
    Write-Host "  Policy ID: $($Policy.id)" -ForegroundColor Cyan
    Write-Host "  Policy Name: ${policyName}" -ForegroundColor Cyan
    Write-Host "  Platform: ${platformName}" -ForegroundColor Cyan
    Write-Host "  ML Detection: ${mlDetection}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-clone-prevention-policy',
    name: 'Clone Prevention Policy',
    category: 'Prevention Policies',
    description: 'Clone an existing prevention policy to create a new policy with the same settings',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'sourcePolicyName', label: 'Source Policy Name', type: 'text', required: true },
      { id: 'newPolicyName', label: 'New Policy Name', type: 'text', required: true },
      { id: 'newDescription', label: 'New Policy Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const sourcePolicyName = escapePowerShellString(params.sourcePolicyName);
      const newPolicyName = escapePowerShellString(params.newPolicyName);
      const newDescription = params.newDescription ? escapePowerShellString(params.newDescription) : '';
      
      return `# CrowdStrike Clone Prevention Policy
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Cloning prevention policy: ${sourcePolicyName}" -ForegroundColor Cyan
    
    $SourcePolicy = Get-FalconPreventionPolicy -Filter "name:'${sourcePolicyName}'" -Detailed
    
    if (-not $SourcePolicy) {
        throw "Source policy not found: ${sourcePolicyName}"
    }
    
    $Description = if ("${newDescription}") { "${newDescription}" } else { "Cloned from: ${sourcePolicyName}" }
    
    $NewPolicy = New-FalconPreventionPolicy \`
        -name "${newPolicyName}" \`
        -description $Description \`
        -platform_name $SourcePolicy.platform_name \`
        -settings $SourcePolicy.prevention_settings
    
    Write-Host "[SUCCESS] Prevention policy cloned successfully" -ForegroundColor Green
    Write-Host "  Source Policy: ${sourcePolicyName}" -ForegroundColor Cyan
    Write-Host "  New Policy ID: $($NewPolicy.id)" -ForegroundColor Cyan
    Write-Host "  New Policy Name: ${newPolicyName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy cloning failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-prevention-policy-comparison',
    name: 'Compare Prevention Policies',
    category: 'Prevention Policies',
    description: 'Compare settings between two prevention policies and identify differences',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policy1Name', label: 'First Policy Name', type: 'text', required: true },
      { id: 'policy2Name', label: 'Second Policy Name', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Comparison Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policy1Name = escapePowerShellString(params.policy1Name);
      const policy2Name = escapePowerShellString(params.policy2Name);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Compare Prevention Policies
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Comparing prevention policies..." -ForegroundColor Cyan
    
    $Policy1 = Get-FalconPreventionPolicy -Filter "name:'${policy1Name}'" -Detailed
    $Policy2 = Get-FalconPreventionPolicy -Filter "name:'${policy2Name}'" -Detailed
    
    if (-not $Policy1) { throw "Policy not found: ${policy1Name}" }
    if (-not $Policy2) { throw "Policy not found: ${policy2Name}" }
    
    $Comparison = @()
    
    $Settings1 = $Policy1.prevention_settings | ConvertTo-Json -Depth 10 | ConvertFrom-Json -AsHashtable
    $Settings2 = $Policy2.prevention_settings | ConvertTo-Json -Depth 10 | ConvertFrom-Json -AsHashtable
    
    function Compare-Settings {
        param($Path, $Obj1, $Obj2)
        
        foreach ($Key in ($Obj1.Keys + $Obj2.Keys | Select-Object -Unique)) {
            $FullPath = if ($Path) { "$Path.$Key" } else { $Key }
            $Val1 = $Obj1[$Key]
            $Val2 = $Obj2[$Key]
            
            if ($Val1 -is [Hashtable] -and $Val2 -is [Hashtable]) {
                Compare-Settings -Path $FullPath -Obj1 $Val1 -Obj2 $Val2
            } elseif ($Val1 -ne $Val2) {
                [PSCustomObject]@{
                    Setting = $FullPath
                    Policy1_Value = $Val1
                    Policy2_Value = $Val2
                    Match = "No"
                }
            }
        }
    }
    
    $Comparison = Compare-Settings -Path "" -Obj1 $Settings1 -Obj2 $Settings2
    
    $Comparison | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Policy comparison completed" -ForegroundColor Green
    Write-Host "  Policy 1: ${policy1Name}" -ForegroundColor Cyan
    Write-Host "  Policy 2: ${policy2Name}" -ForegroundColor Cyan
    Write-Host "  Differences Found: $($Comparison.Count)" -ForegroundColor Yellow
    Write-Host "  Comparison exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Policy comparison failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-create-rtr-script',
    name: 'Upload RTR Script',
    category: 'Response Policies',
    description: 'Upload a custom PowerShell or bash script for Real-Time Response execution',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'scriptName', label: 'Script Name', type: 'text', required: true },
      { id: 'scriptDescription', label: 'Script Description', type: 'text', required: true },
      { id: 'scriptContent', label: 'Script Content', type: 'textarea', required: true },
      { id: 'platform', label: 'Platform', type: 'select', required: true, options: ['Windows', 'Mac', 'Linux'], defaultValue: 'Windows' },
      { id: 'permissionType', label: 'Permission Type', type: 'select', required: true, options: ['public', 'group', 'private'], defaultValue: 'group' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const scriptName = escapePowerShellString(params.scriptName);
      const scriptDescription = escapePowerShellString(params.scriptDescription);
      const scriptContent = escapePowerShellString(params.scriptContent);
      const platform = params.platform;
      const permissionType = params.permissionType;
      
      return `# CrowdStrike Upload RTR Script
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Uploading RTR script: ${scriptName}" -ForegroundColor Cyan
    
    $ScriptContent = @"
${scriptContent}
"@
    
    $TempFile = [System.IO.Path]::GetTempFileName()
    $ScriptContent | Out-File -FilePath $TempFile -Encoding UTF8
    
    $Script = Send-FalconPutFile \`
        -Path $TempFile \`
        -Name "${scriptName}" \`
        -Description "${scriptDescription}" \`
        -platform "${platform}" \`
        -permission_type "${permissionType}"
    
    Remove-Item -Path $TempFile -Force
    
    Write-Host "[SUCCESS] RTR script uploaded successfully" -ForegroundColor Green
    Write-Host "  Script Name: ${scriptName}" -ForegroundColor Cyan
    Write-Host "  Platform: ${platform}" -ForegroundColor Cyan
    Write-Host "  Permission Type: ${permissionType}" -ForegroundColor Cyan
    Write-Host "  Script ID: $($Script.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Script upload failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-run-rtr-script',
    name: 'Execute RTR Script on Hosts',
    category: 'Response Policies',
    description: 'Execute an uploaded RTR script on one or more hosts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'scriptName', label: 'Script Name', type: 'text', required: true },
      { id: 'hostIds', label: 'Target Host IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'commandLineArgs', label: 'Command Line Arguments', type: 'text', required: false },
      { id: 'timeout', label: 'Timeout (seconds)', type: 'number', required: true, defaultValue: 300 }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const scriptName = escapePowerShellString(params.scriptName);
      const hostIdsRaw = (params.hostIds as string).split(',').map((n: string) => n.trim());
      const commandLineArgs = params.commandLineArgs ? escapePowerShellString(params.commandLineArgs) : '';
      const timeout = params.timeout || 300;
      
      return `# CrowdStrike Execute RTR Script on Hosts
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostIds = @(${hostIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $ScriptName = "${scriptName}"
    ${commandLineArgs ? `$Arguments = "${commandLineArgs}"` : '$Arguments = $null'}
    
    Write-Host "Executing RTR script on $($HostIds.Count) hosts..." -ForegroundColor Cyan
    
    $Results = @()
    
    foreach ($HostId in $HostIds) {
        try {
            Write-Host "  Starting session: $HostId" -ForegroundColor Yellow
            
            $Session = Start-FalconSession -Id $HostId
            
            if ($Session) {
                $CmdParams = @{
                    Command = "runscript"
                    Arguments = "-CloudFile='$ScriptName'"
                    SessionId = $Session.session_id
                    Timeout = ${timeout}
                }
                
                if ($Arguments) {
                    $CmdParams.Arguments += " -CommandLine='$Arguments'"
                }
                
                $Output = Invoke-FalconRtr @CmdParams
                
                $Results += [PSCustomObject]@{
                    HostId = $HostId
                    SessionId = $Session.session_id
                    Status = "Success"
                    Output = $Output.stdout
                    Errors = $Output.stderr
                }
                
                Remove-FalconSession -SessionId $Session.session_id
                Write-Host "  [SUCCESS] Completed: $HostId" -ForegroundColor Green
            }
            
        } catch {
            $Results += [PSCustomObject]@{
                HostId = $HostId
                Status = "Failed"
                Error = $_.Exception.Message
            }
            Write-Host "  [FAILED] Failed: $HostId - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Script execution completed" -ForegroundColor Green
    Write-Host "  Script: $ScriptName" -ForegroundColor Cyan
    Write-Host "  Total Hosts: $($HostIds.Count)" -ForegroundColor Cyan
    Write-Host "  Successful: $($Results | Where-Object Status -eq 'Success' | Measure-Object).Count" -ForegroundColor Green
    Write-Host "  Failed: $($Results | Where-Object Status -eq 'Failed' | Measure-Object).Count" -ForegroundColor Red
    
} catch {
    Write-Error "Script execution failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-bulk-ioc-import',
    name: 'Bulk Import IOCs from CSV',
    category: 'IOC Management',
    description: 'Import indicators of compromise from a CSV file',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'csvPath', label: 'CSV File Path', type: 'path', required: true, description: 'CSV with columns: type, value, action, severity, description' },
      { id: 'defaultAction', label: 'Default Action', type: 'select', required: true, options: ['detect', 'prevent', 'no_action'], defaultValue: 'prevent' },
      { id: 'defaultSeverity', label: 'Default Severity', type: 'select', required: true, options: ['critical', 'high', 'medium', 'low', 'informational'], defaultValue: 'high' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const csvPath = escapePowerShellString(params.csvPath);
      const defaultAction = params.defaultAction;
      const defaultSeverity = params.defaultSeverity;
      
      return `# CrowdStrike Bulk Import IOCs from CSV
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $CsvPath = "${csvPath}"
    $DefaultAction = "${defaultAction}"
    $DefaultSeverity = "${defaultSeverity}"
    
    if (-not (Test-Path $CsvPath)) {
        throw "CSV file not found: $CsvPath"
    }
    
    Write-Host "Importing IOCs from CSV: $CsvPath" -ForegroundColor Cyan
    
    $IOCs = Import-Csv -Path $CsvPath
    $TotalCount = $IOCs.Count
    $SuccessCount = 0
    $FailCount = 0
    
    Write-Host "Processing $TotalCount indicators..." -ForegroundColor Yellow
    
    foreach ($IOC in $IOCs) {
        try {
            $Params = @{
                type = $IOC.type
                value = $IOC.value
                action = if ($IOC.action) { $IOC.action } else { $DefaultAction }
                severity = if ($IOC.severity) { $IOC.severity } else { $DefaultSeverity }
                platforms = @("windows", "mac", "linux")
                applied_globally = $true
            }
            
            if ($IOC.description) {
                $Params.description = $IOC.description
            }
            
            New-FalconIndicator @Params
            $SuccessCount++
            Write-Host "  [SUCCESS] Added: $($IOC.value)" -ForegroundColor Green
            
        } catch {
            $FailCount++
            Write-Host "  [FAILED] Failed: $($IOC.value) - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] IOC import completed" -ForegroundColor Green
    Write-Host "  Total IOCs: $TotalCount" -ForegroundColor Cyan
    Write-Host "  Successfully Imported: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor Red
    
} catch {
    Write-Error "IOC import failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-ioc-expiration-management',
    name: 'Manage IOC Expiration',
    category: 'IOC Management',
    description: 'Set or update expiration dates for custom IOCs',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'iocType', label: 'IOC Type', type: 'select', required: true, options: ['sha256', 'md5', 'domain', 'ipv4', 'ipv6'], defaultValue: 'sha256' },
      { id: 'iocValue', label: 'IOC Value', type: 'text', required: true },
      { id: 'expirationDays', label: 'Expiration (days from now)', type: 'number', required: true, defaultValue: 30, description: 'Number of days until expiration (0 = never expire)' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const iocType = params.iocType;
      const iocValue = escapePowerShellString(params.iocValue);
      const expirationDays = params.expirationDays;
      
      return `# CrowdStrike Manage IOC Expiration
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $IOCType = "${iocType}"
    $IOCValue = "${iocValue}"
    $ExpirationDays = ${expirationDays}
    
    Write-Host "Updating IOC expiration: $IOCValue" -ForegroundColor Cyan
    
    $IOC = Get-FalconIndicator -Filter "type:'$IOCType'+value:'$IOCValue'"
    
    if (-not $IOC) {
        throw "IOC not found: $IOCValue"
    }
    
    $UpdateParams = @{
        Id = $IOC.id
    }
    
    if ($ExpirationDays -gt 0) {
        $ExpirationDate = (Get-Date).AddDays($ExpirationDays).ToString("yyyy-MM-ddTHH:mm:ssZ")
        $UpdateParams.expiration = $ExpirationDate
        Write-Host "  Setting expiration to: $ExpirationDate" -ForegroundColor Yellow
    } else {
        $UpdateParams.expiration = $null
        Write-Host "  Removing expiration (never expire)" -ForegroundColor Yellow
    }
    
    Edit-FalconIndicator @UpdateParams
    
    Write-Host "[SUCCESS] IOC expiration updated" -ForegroundColor Green
    Write-Host "  IOC Type: $IOCType" -ForegroundColor Cyan
    Write-Host "  IOC Value: $IOCValue" -ForegroundColor Cyan
    if ($ExpirationDays -gt 0) {
        Write-Host "  Expires In: $ExpirationDays days" -ForegroundColor Cyan
    } else {
        Write-Host "  Expires: Never" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "IOC expiration update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-delete-expired-iocs',
    name: 'Delete Expired IOCs',
    category: 'IOC Management',
    description: 'Find and delete IOCs that have expired or are about to expire',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'deleteMode', label: 'Delete Mode', type: 'select', required: true, options: ['Already Expired', 'Expiring Within 7 Days', 'Expiring Within 30 Days', 'Report Only'], defaultValue: 'Report Only' },
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const deleteMode = params.deleteMode;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Delete Expired IOCs
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $DeleteMode = "${deleteMode}"
    
    Write-Host "Finding expired or expiring IOCs..." -ForegroundColor Cyan
    
    $FilterDate = switch ($DeleteMode) {
        "Already Expired" { (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") }
        "Expiring Within 7 Days" { (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ") }
        "Expiring Within 30 Days" { (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ") }
        "Report Only" { (Get-Date).AddDays(90).ToString("yyyy-MM-ddTHH:mm:ssZ") }
    }
    
    $IOCs = Get-FalconIndicator -Filter "expiration:<='$FilterDate'"
    
    $Report = $IOCs | Select-Object \`
        type,
        value,
        action,
        severity,
        expiration,
        created_on,
        modified_on,
        description
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "  Found: $($IOCs.Count) IOCs matching criteria" -ForegroundColor Yellow
    
    if ($DeleteMode -ne "Report Only" -and $IOCs.Count -gt 0) {
        Write-Host "  Deleting IOCs..." -ForegroundColor Yellow
        
        $DeletedCount = 0
        foreach ($IOC in $IOCs) {
            try {
                Remove-FalconIndicator -Id $IOC.id
                $DeletedCount++
            } catch {
                Write-Host "    [FAILED] Failed to delete: $($IOC.value)" -ForegroundColor Red
            }
        }
        
        Write-Host "  [SUCCESS] Deleted: $DeletedCount IOCs" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] IOC cleanup completed" -ForegroundColor Green
    Write-Host "  Mode: $DeleteMode" -ForegroundColor Cyan
    Write-Host "  IOCs Processed: $($IOCs.Count)" -ForegroundColor Cyan
    Write-Host "  Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "IOC cleanup failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-sensor-version-report',
    name: 'Sensor Version Report',
    category: 'Sensor Management',
    description: 'Generate a report of all sensor versions deployed across the environment',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'groupBy', label: 'Group Results By', type: 'select', required: true, options: ['Sensor Version', 'OS Platform', 'Host Group'], defaultValue: 'Sensor Version' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const groupBy = params.groupBy;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Sensor Version Report
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Generating sensor version report..." -ForegroundColor Cyan
    
    $Hosts = Get-FalconHost -Detailed
    
    $GroupField = switch ("${groupBy}") {
        "Sensor Version" { "agent_version" }
        "OS Platform" { "platform_name" }
        "Host Group" { "groups" }
    }
    
    $Summary = $Hosts | Group-Object -Property $GroupField | ForEach-Object {
        [PSCustomObject]@{
            "${groupBy}" = $_.Name
            Count = $_.Count
            Percentage = [Math]::Round(($_.Count / $Hosts.Count) * 100, 2)
            Hostnames = ($_.Group.hostname | Select-Object -First 5) -join ", "
        }
    } | Sort-Object Count -Descending
    
    $DetailedReport = $Hosts | Select-Object \`
        hostname,
        device_id,
        platform_name,
        os_version,
        agent_version,
        last_seen,
        status,
        reduced_functionality_mode
    
    $Summary | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $DetailPath = "${exportPath}".Replace(".csv", "_detailed.csv")
    $DetailedReport | Export-Csv -Path $DetailPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Sensor version report generated" -ForegroundColor Green
    Write-Host "  Total Hosts: $($Hosts.Count)" -ForegroundColor Cyan
    Write-Host "  Unique ${groupBy}s: $($Summary.Count)" -ForegroundColor Cyan
    Write-Host "  Summary exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Detailed exported: $DetailPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Top 5 ${groupBy}s:" -ForegroundColor Yellow
    $Summary | Select-Object -First 5 | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-download-sensor-installer',
    name: 'Download Sensor Installer',
    category: 'Sensor Management',
    description: 'Download the latest sensor installer for a specific platform',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'platform', label: 'Platform', type: 'select', required: true, options: ['Windows', 'Mac', 'Linux (deb)', 'Linux (rpm)'], defaultValue: 'Windows' },
      { id: 'version', label: 'Version', type: 'select', required: true, options: ['Latest (N)', 'N-1', 'N-2', 'Specific Version'], defaultValue: 'Latest (N)' },
      { id: 'specificVersion', label: 'Specific Version Number', type: 'text', required: false, description: 'Only required if Version is "Specific Version"' },
      { id: 'downloadPath', label: 'Download Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const platform = params.platform;
      const version = params.version;
      const specificVersion = params.specificVersion ? escapePowerShellString(params.specificVersion) : '';
      const downloadPath = escapePowerShellString(params.downloadPath);
      
      return `# CrowdStrike Download Sensor Installer
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $Platform = "${platform}"
    $DownloadPath = "${downloadPath}"
    
    Write-Host "Retrieving available sensor installers for $Platform..." -ForegroundColor Cyan
    
    $PlatformFilter = switch ($Platform) {
        "Windows" { "windows" }
        "Mac" { "mac" }
        "Linux (deb)" { "linux" }
        "Linux (rpm)" { "linux" }
    }
    
    $Installers = Get-FalconCcidInstaller -Filter "platform:'$PlatformFilter'"
    
    $VersionFilter = switch ("${version}") {
        "Latest (N)" { 0 }
        "N-1" { 1 }
        "N-2" { 2 }
        "Specific Version" { -1 }
    }
    
    if ($VersionFilter -eq -1) {
        $Installer = $Installers | Where-Object { $_.version -eq "${specificVersion}" }
    } else {
        $SortedInstallers = $Installers | Sort-Object version -Descending
        $Installer = $SortedInstallers[$VersionFilter]
    }
    
    if (-not $Installer) {
        throw "Installer not found for specified criteria"
    }
    
    Write-Host "Downloading sensor version: $($Installer.version)" -ForegroundColor Yellow
    
    Receive-FalconCcidInstaller -Id $Installer.sha256 -Path $DownloadPath
    
    Write-Host "[SUCCESS] Sensor installer downloaded" -ForegroundColor Green
    Write-Host "  Platform: $Platform" -ForegroundColor Cyan
    Write-Host "  Version: $($Installer.version)" -ForegroundColor Cyan
    Write-Host "  SHA256: $($Installer.sha256)" -ForegroundColor Cyan
    Write-Host "  Downloaded to: $DownloadPath" -ForegroundColor Green
    
} catch {
    Write-Error "Installer download failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-reduced-functionality-hosts',
    name: 'Find Reduced Functionality Hosts',
    category: 'Sensor Management',
    description: 'Identify hosts with sensors in reduced functionality mode',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Find Reduced Functionality Hosts
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Finding hosts in reduced functionality mode..." -ForegroundColor Cyan
    
    $RFMHosts = Get-FalconHost -Filter "reduced_functionality_mode:'yes'" -Detailed
    
    $Report = $RFMHosts | Select-Object \`
        hostname,
        device_id,
        local_ip,
        platform_name,
        os_version,
        agent_version,
        last_seen,
        status,
        reduced_functionality_mode,
        config_id_base,
        config_id_build,
        config_id_platform
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Reduced functionality report generated" -ForegroundColor Green
    Write-Host "  Hosts in RFM: $($RFMHosts.Count)" -ForegroundColor Yellow
    Write-Host "  Report exported: ${exportPath}" -ForegroundColor Green
    
    if ($RFMHosts.Count -gt 0) {
        Write-Host ""
        Write-Host "Affected Hosts:" -ForegroundColor Yellow
        $RFMHosts | Select-Object hostname, agent_version, last_seen | Format-Table -AutoSize
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-weekly-detection-report',
    name: 'Generate Weekly Detection Report',
    category: 'Reporting',
    description: 'Generate a comprehensive weekly detection summary with trends',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'weeksBack', label: 'Weeks to Include', type: 'number', required: true, defaultValue: 4 },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const weeksBack = params.weeksBack || 4;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Weekly Detection Report
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $WeeksBack = ${weeksBack}
    
    Write-Host "Generating weekly detection report for last $WeeksBack weeks..." -ForegroundColor Cyan
    
    $StartDate = (Get-Date).AddDays(-($WeeksBack * 7)).ToString("yyyy-MM-dd")
    
    $Detections = Get-FalconDetection -Filter "first_behavior:>='$StartDate'"
    
    $WeeklyData = @()
    
    for ($w = 0; $w -lt $WeeksBack; $w++) {
        $WeekStart = (Get-Date).AddDays(-((($WeeksBack - $w) * 7)))
        $WeekEnd = $WeekStart.AddDays(7)
        
        $WeekDetections = $Detections | Where-Object {
            $DetDate = [DateTime]$_.first_behavior
            $DetDate -ge $WeekStart -and $DetDate -lt $WeekEnd
        }
        
        $WeeklyData += [PSCustomObject]@{
            Week = "Week $($w + 1)"
            StartDate = $WeekStart.ToString("yyyy-MM-dd")
            EndDate = $WeekEnd.ToString("yyyy-MM-dd")
            TotalDetections = $WeekDetections.Count
            Critical = ($WeekDetections | Where-Object severity -eq "Critical").Count
            High = ($WeekDetections | Where-Object severity -eq "High").Count
            Medium = ($WeekDetections | Where-Object severity -eq "Medium").Count
            Low = ($WeekDetections | Where-Object severity -eq "Low").Count
            UniqueHosts = ($WeekDetections | Select-Object -ExpandProperty device -Unique).Count
        }
    }
    
    $WeeklyData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TacticSummary = $Detections | Group-Object { $_.behaviors[0].tactic } | 
        Select-Object @{N='Tactic';E={$_.Name}}, Count | 
        Sort-Object Count -Descending
    
    $TacticPath = "${exportPath}".Replace(".csv", "_tactics.csv")
    $TacticSummary | Export-Csv -Path $TacticPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Weekly detection report generated" -ForegroundColor Green
    Write-Host "  Period: $StartDate to $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor Cyan
    Write-Host "  Total Detections: $($Detections.Count)" -ForegroundColor Cyan
    Write-Host "  Weekly summary: ${exportPath}" -ForegroundColor Green
    Write-Host "  Tactic summary: $TacticPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Weekly Summary:" -ForegroundColor Yellow
    $WeeklyData | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-host-group-report',
    name: 'Host Group Coverage Report',
    category: 'Reporting',
    description: 'Generate a report showing host distribution across host groups',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Host Group Coverage Report
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Generating host group coverage report..." -ForegroundColor Cyan
    
    $HostGroups = Get-FalconHostGroup -Detailed
    $AllHosts = Get-FalconHost -Detailed
    
    $Report = foreach ($Group in $HostGroups) {
        $GroupHosts = $AllHosts | Where-Object { $_.groups -contains $Group.id }
        
        [PSCustomObject]@{
            GroupName = $Group.name
            GroupId = $Group.id
            GroupType = $Group.group_type
            Description = $Group.description
            HostCount = $GroupHosts.Count
            WindowsHosts = ($GroupHosts | Where-Object platform_name -eq "Windows").Count
            MacHosts = ($GroupHosts | Where-Object platform_name -eq "Mac").Count
            LinuxHosts = ($GroupHosts | Where-Object platform_name -eq "Linux").Count
            LastModified = $Group.modified_timestamp
            AssignmentRule = $Group.assignment_rule
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $UngroupedHosts = $AllHosts | Where-Object { -not $_.groups -or $_.groups.Count -eq 0 }
    
    if ($UngroupedHosts.Count -gt 0) {
        $UngroupedPath = "${exportPath}".Replace(".csv", "_ungrouped.csv")
        $UngroupedHosts | Select-Object hostname, device_id, platform_name, last_seen | 
            Export-Csv -Path $UngroupedPath -NoTypeInformation
        Write-Host "  [WARNING] Ungrouped hosts found: $($UngroupedHosts.Count)" -ForegroundColor Yellow
        Write-Host "  Ungrouped hosts exported: $UngroupedPath" -ForegroundColor Yellow
    }
    
    Write-Host "[SUCCESS] Host group coverage report generated" -ForegroundColor Green
    Write-Host "  Total Host Groups: $($HostGroups.Count)" -ForegroundColor Cyan
    Write-Host "  Total Hosts: $($AllHosts.Count)" -ForegroundColor Cyan
    Write-Host "  Report exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-executive-summary',
    name: 'Generate Executive Security Summary',
    category: 'Reporting',
    description: 'Generate an executive-level security posture summary',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'timeRangeDays', label: 'Time Range (days)', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const timeRangeDays = params.timeRangeDays || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Executive Security Summary
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $TimeRangeDays = ${timeRangeDays}
    $StartDate = (Get-Date).AddDays(-$TimeRangeDays).ToString("yyyy-MM-dd")
    
    Write-Host "Generating executive security summary for last $TimeRangeDays days..." -ForegroundColor Cyan
    
    $Hosts = Get-FalconHost -Detailed
    $Detections = Get-FalconDetection -Filter "first_behavior:>='$StartDate'"
    $Incidents = Get-FalconIncident -Filter "start:>='$StartDate'"
    $Policies = Get-FalconPreventionPolicy
    
    $Summary = [PSCustomObject]@{
        ReportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TimeRange = "$TimeRangeDays days"
        TotalManagedHosts = $Hosts.Count
        ActiveHosts = ($Hosts | Where-Object status -eq "normal").Count
        ContainedHosts = ($Hosts | Where-Object status -eq "contained").Count
        RFMHosts = ($Hosts | Where-Object reduced_functionality_mode -eq "yes").Count
        TotalDetections = $Detections.Count
        CriticalDetections = ($Detections | Where-Object severity -eq "Critical").Count
        HighDetections = ($Detections | Where-Object severity -eq "High").Count
        MediumDetections = ($Detections | Where-Object severity -eq "Medium").Count
        LowDetections = ($Detections | Where-Object severity -eq "Low").Count
        OpenDetections = ($Detections | Where-Object status -eq "new").Count
        ClosedDetections = ($Detections | Where-Object status -eq "closed").Count
        TotalIncidents = $Incidents.Count
        OpenIncidents = ($Incidents | Where-Object state -ne "closed").Count
        ActivePolicies = ($Policies | Where-Object enabled -eq $true).Count
        TotalPolicies = $Policies.Count
    }
    
    $Summary | ConvertTo-Json | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    $CsvPath = "${exportPath}".Replace(".json", ".csv")
    $Summary | Export-Csv -Path $CsvPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Executive security summary generated" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Security Posture Summary ===" -ForegroundColor Cyan
    Write-Host "  Managed Hosts: $($Summary.TotalManagedHosts)" -ForegroundColor White
    Write-Host "  Active Hosts: $($Summary.ActiveHosts)" -ForegroundColor Green
    Write-Host "  Contained Hosts: $($Summary.ContainedHosts)" -ForegroundColor Yellow
    Write-Host "  RFM Hosts: $($Summary.RFMHosts)" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== Detection Summary ===" -ForegroundColor Cyan
    Write-Host "  Total: $($Summary.TotalDetections)" -ForegroundColor White
    Write-Host "  Critical: $($Summary.CriticalDetections)" -ForegroundColor Red
    Write-Host "  High: $($Summary.HighDetections)" -ForegroundColor Yellow
    Write-Host "  Open: $($Summary.OpenDetections)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Reports exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-rtr-kill-process',
    name: 'RTR Kill Process',
    category: 'Real-Time Response',
    description: 'Kill a running process on a remote host via RTR',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostId', label: 'Target Host ID', type: 'text', required: true },
      { id: 'processIdentifier', label: 'Process Name or PID', type: 'text', required: true, description: 'Process name (e.g., malware.exe) or PID (e.g., 1234)' },
      { id: 'identifierType', label: 'Identifier Type', type: 'select', required: true, options: ['Process Name', 'PID'], defaultValue: 'Process Name' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostId = escapePowerShellString(params.hostId);
      const processIdentifier = escapePowerShellString(params.processIdentifier);
      const identifierType = params.identifierType;
      
      return `# CrowdStrike RTR Kill Process
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostId = "${hostId}"
    $ProcessIdentifier = "${processIdentifier}"
    
    Write-Host "Initiating RTR session to kill process..." -ForegroundColor Cyan
    
    $Session = Start-FalconSession -Id $HostId
    
    if ($Session) {
        Write-Host "[SUCCESS] RTR session established: $($Session.session_id)" -ForegroundColor Green
        
        if ("${identifierType}" -eq "Process Name") {
            $PsResult = Invoke-FalconRtr -Command "ps" -SessionId $Session.session_id
            $TargetProcess = $PsResult.stdout | Select-String -Pattern "$ProcessIdentifier"
            
            if ($TargetProcess) {
                Write-Host "  Found process: $ProcessIdentifier" -ForegroundColor Yellow
                $KillResult = Invoke-FalconRtr -Command "kill" -Arguments "$ProcessIdentifier" -SessionId $Session.session_id
            } else {
                Write-Host "  [WARNING] Process not found: $ProcessIdentifier" -ForegroundColor Yellow
            }
        } else {
            $KillResult = Invoke-FalconRtr -Command "kill" -Arguments "$ProcessIdentifier" -SessionId $Session.session_id
        }
        
        if ($KillResult.complete) {
            Write-Host "[SUCCESS] Process terminated successfully" -ForegroundColor Green
        } else {
            Write-Host "  Process termination may have failed" -ForegroundColor Yellow
            Write-Host "  Output: $($KillResult.stdout)" -ForegroundColor Gray
            Write-Host "  Errors: $($KillResult.stderr)" -ForegroundColor Red
        }
        
        Remove-FalconSession -SessionId $Session.session_id
        Write-Host "[SUCCESS] RTR session closed" -ForegroundColor Green
        
    } else {
        Write-Error "Failed to establish RTR session"
    }
    
} catch {
    Write-Error "Process kill failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-rtr-file-operations',
    name: 'RTR File Operations',
    category: 'Real-Time Response',
    description: 'Perform file operations (delete, rename, move) on remote hosts via RTR',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostId', label: 'Target Host ID', type: 'text', required: true },
      { id: 'operation', label: 'Operation', type: 'select', required: true, options: ['Delete File', 'Rename File', 'Create Directory', 'Remove Directory'], defaultValue: 'Delete File' },
      { id: 'targetPath', label: 'Target Path', type: 'path', required: true },
      { id: 'destinationPath', label: 'Destination Path (for rename)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostId = escapePowerShellString(params.hostId);
      const operation = params.operation;
      const targetPath = escapePowerShellString(params.targetPath);
      const destinationPath = params.destinationPath ? escapePowerShellString(params.destinationPath) : '';
      
      return `# CrowdStrike RTR File Operations
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostId = "${hostId}"
    $TargetPath = "${targetPath}"
    ${destinationPath ? `$DestinationPath = "${destinationPath}"` : ''}
    
    Write-Host "Initiating RTR session for file operation..." -ForegroundColor Cyan
    
    $Session = Start-FalconSession -Id $HostId
    
    if ($Session) {
        Write-Host "[SUCCESS] RTR session established: $($Session.session_id)" -ForegroundColor Green
        
        $Command = switch ("${operation}") {
            "Delete File" { "rm" }
            "Rename File" { "mv" }
            "Create Directory" { "mkdir" }
            "Remove Directory" { "rm" }
        }
        
        $Arguments = switch ("${operation}") {
            "Delete File" { "$TargetPath" }
            "Rename File" { "$TargetPath $DestinationPath" }
            "Create Directory" { "$TargetPath" }
            "Remove Directory" { "-r $TargetPath" }
        }
        
        Write-Host "  Executing: $Command $Arguments" -ForegroundColor Yellow
        
        $Result = Invoke-FalconRtr -Command $Command -Arguments $Arguments -SessionId $Session.session_id
        
        if ($Result.complete) {
            Write-Host "[SUCCESS] File operation completed successfully" -ForegroundColor Green
        } else {
            Write-Host "  Operation output: $($Result.stdout)" -ForegroundColor Gray
            if ($Result.stderr) {
                Write-Host "  Errors: $($Result.stderr)" -ForegroundColor Red
            }
        }
        
        Remove-FalconSession -SessionId $Session.session_id
        Write-Host "[SUCCESS] RTR session closed" -ForegroundColor Green
        
    } else {
        Write-Error "Failed to establish RTR session"
    }
    
} catch {
    Write-Error "File operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-rtr-collect-artifacts',
    name: 'RTR Collect Forensic Artifacts',
    category: 'Real-Time Response',
    description: 'Collect common forensic artifacts from a host (event logs, prefetch, etc.)',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostId', label: 'Target Host ID', type: 'text', required: true },
      { id: 'artifactType', label: 'Artifact Type', type: 'select', required: true, options: ['Windows Event Logs', 'Prefetch Files', 'Browser History', 'Registry Hives', 'Scheduled Tasks'], defaultValue: 'Windows Event Logs' },
      { id: 'localDownloadPath', label: 'Local Download Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostId = escapePowerShellString(params.hostId);
      const artifactType = params.artifactType;
      const localDownloadPath = escapePowerShellString(params.localDownloadPath);
      
      return `# CrowdStrike RTR Collect Forensic Artifacts
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostId = "${hostId}"
    $ArtifactType = "${artifactType}"
    $LocalPath = "${localDownloadPath}"
    
    Write-Host "Collecting forensic artifacts: $ArtifactType" -ForegroundColor Cyan
    
    $ArtifactPaths = switch ($ArtifactType) {
        "Windows Event Logs" { 
            @(
                "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx",
                "C:\\Windows\\System32\\winevt\\Logs\\System.evtx",
                "C:\\Windows\\System32\\winevt\\Logs\\Application.evtx"
            )
        }
        "Prefetch Files" { 
            @("C:\\Windows\\Prefetch\\*.pf")
        }
        "Browser History" {
            @(
                "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\History",
                "$env:APPDATA\\Mozilla\\Firefox\\Profiles\\*\\places.sqlite"
            )
        }
        "Registry Hives" {
            @(
                "C:\\Windows\\System32\\config\\SAM",
                "C:\\Windows\\System32\\config\\SYSTEM",
                "C:\\Windows\\System32\\config\\SOFTWARE"
            )
        }
        "Scheduled Tasks" {
            @("C:\\Windows\\System32\\Tasks\\*")
        }
    }
    
    $Session = Start-FalconSession -Id $HostId
    
    if ($Session) {
        Write-Host "[SUCCESS] RTR session established: $($Session.session_id)" -ForegroundColor Green
        
        $CollectedFiles = @()
        
        foreach ($ArtifactPath in $ArtifactPaths) {
            try {
                Write-Host "  Collecting: $ArtifactPath" -ForegroundColor Yellow
                
                $GetResult = Invoke-FalconRtr -Command "get" -Arguments $ArtifactPath -SessionId $Session.session_id
                
                if ($GetResult.sha256) {
                    $FileName = Split-Path $ArtifactPath -Leaf
                    $OutputFile = Join-Path $LocalPath $FileName
                    
                    Receive-FalconRtrGetFile -SessionId $Session.session_id -Sha256 $GetResult.sha256 -OutputPath $OutputFile
                    
                    $CollectedFiles += $OutputFile
                    Write-Host "    [SUCCESS] Downloaded: $FileName" -ForegroundColor Green
                }
                
            } catch {
                Write-Host "    [FAILED] Failed: $ArtifactPath - $_" -ForegroundColor Red
            }
        }
        
        Remove-FalconSession -SessionId $Session.session_id
        
        Write-Host ""
        Write-Host "[SUCCESS] Artifact collection completed" -ForegroundColor Green
        Write-Host "  Artifact Type: $ArtifactType" -ForegroundColor Cyan
        Write-Host "  Files Collected: $($CollectedFiles.Count)" -ForegroundColor Cyan
        Write-Host "  Download Location: $LocalPath" -ForegroundColor Green
        
    } else {
        Write-Error "Failed to establish RTR session"
    }
    
} catch {
    Write-Error "Artifact collection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-rtr-memory-dump',
    name: 'RTR Memory Dump Collection',
    category: 'Real-Time Response',
    description: 'Collect a full memory dump from a host for forensic analysis',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostId', label: 'Target Host ID', type: 'text', required: true },
      { id: 'localDownloadPath', label: 'Local Download Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostId = escapePowerShellString(params.hostId);
      const localDownloadPath = escapePowerShellString(params.localDownloadPath);
      
      return `# CrowdStrike RTR Memory Dump Collection
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostId = "${hostId}"
    $LocalPath = "${localDownloadPath}"
    
    Write-Host "Initiating memory dump collection..." -ForegroundColor Cyan
    Write-Host "[WARNING] This operation may take several minutes depending on host memory size" -ForegroundColor Yellow
    
    $Session = Start-FalconSession -Id $HostId
    
    if ($Session) {
        Write-Host "[SUCCESS] RTR session established: $($Session.session_id)" -ForegroundColor Green
        
        Write-Host "  Starting memory dump..." -ForegroundColor Yellow
        
        $MemDump = Invoke-FalconRtr -Command "memdump" -SessionId $Session.session_id -Timeout 1800
        
        if ($MemDump.sha256) {
            Write-Host "  Memory dump completed, downloading..." -ForegroundColor Yellow
            
            $OutputFile = Join-Path $LocalPath "memdump_$(Get-Date -Format 'yyyyMMdd_HHmmss').dmp"
            
            Receive-FalconRtrGetFile -SessionId $Session.session_id -Sha256 $MemDump.sha256 -OutputPath $OutputFile
            
            Write-Host "[SUCCESS] Memory dump downloaded successfully" -ForegroundColor Green
            Write-Host "  File: $OutputFile" -ForegroundColor Cyan
            Write-Host "  SHA256: $($MemDump.sha256)" -ForegroundColor Cyan
            
        } else {
            Write-Host "  Memory dump may have failed" -ForegroundColor Yellow
            Write-Host "  Output: $($MemDump.stdout)" -ForegroundColor Gray
        }
        
        Remove-FalconSession -SessionId $Session.session_id
        Write-Host "[SUCCESS] RTR session closed" -ForegroundColor Green
        
    } else {
        Write-Error "Failed to establish RTR session"
    }
    
} catch {
    Write-Error "Memory dump collection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-create-host-group',
    name: 'Create Host Group',
    category: 'Host Management',
    description: 'Create a new static or dynamic host group',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'groupType', label: 'Group Type', type: 'select', required: true, options: ['Static', 'Dynamic'], defaultValue: 'Dynamic' },
      { id: 'description', label: 'Group Description', type: 'text', required: true },
      { id: 'assignmentRule', label: 'Assignment Rule (for dynamic)', type: 'text', required: false, description: 'FQL filter for dynamic groups (e.g., platform_name:Windows+tags:Production)' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const groupName = escapePowerShellString(params.groupName);
      const groupType = params.groupType.toLowerCase();
      const description = escapePowerShellString(params.description);
      const assignmentRule = params.assignmentRule ? escapePowerShellString(params.assignmentRule) : '';
      
      return `# CrowdStrike Create Host Group
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Creating host group: ${groupName}" -ForegroundColor Cyan
    
    $GroupParams = @{
        name = "${groupName}"
        group_type = "${groupType}"
        description = "${description}"
    }
    
    if ("${groupType}" -eq "dynamic" -and "${assignmentRule}") {
        $GroupParams.assignment_rule = "${assignmentRule}"
    }
    
    $Group = New-FalconHostGroup @GroupParams
    
    Write-Host "[SUCCESS] Host group created successfully" -ForegroundColor Green
    Write-Host "  Group ID: $($Group.id)" -ForegroundColor Cyan
    Write-Host "  Group Name: ${groupName}" -ForegroundColor Cyan
    Write-Host "  Group Type: ${groupType}" -ForegroundColor Cyan
    ${assignmentRule ? `Write-Host "  Assignment Rule: ${assignmentRule}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Host group creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-add-hosts-to-group',
    name: 'Add Hosts to Static Group',
    category: 'Host Management',
    description: 'Add hosts to an existing static host group',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true },
      { id: 'hostIds', label: 'Host IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const groupName = escapePowerShellString(params.groupName);
      const hostIdsRaw = (params.hostIds as string).split(',').map((n: string) => n.trim());
      
      return `# CrowdStrike Add Hosts to Static Group
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $GroupName = "${groupName}"
    $HostIds = @(${hostIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    Write-Host "Finding host group: $GroupName" -ForegroundColor Cyan
    
    $Group = Get-FalconHostGroup -Filter "name:'$GroupName'"
    
    if (-not $Group) {
        throw "Host group not found: $GroupName"
    }
    
    if ($Group.group_type -ne "static") {
        throw "Cannot add hosts to dynamic group. Use assignment rules instead."
    }
    
    Write-Host "Adding $($HostIds.Count) hosts to group..." -ForegroundColor Yellow
    
    Invoke-FalconHostGroupAction -Action add-hosts -Id $Group.id -Ids $HostIds
    
    Write-Host "[SUCCESS] Hosts added successfully" -ForegroundColor Green
    Write-Host "  Group: $GroupName" -ForegroundColor Cyan
    Write-Host "  Hosts Added: $($HostIds.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add hosts: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-stale-sensor-report',
    name: 'Stale Sensor Report',
    category: 'Sensor Management',
    description: 'Find hosts with sensors that have not checked in recently',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'staleDays', label: 'Days Since Last Seen', type: 'number', required: true, defaultValue: 7, description: 'Hosts not seen in this many days are considered stale' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const staleDays = params.staleDays || 7;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Stale Sensor Report
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $StaleDays = ${staleDays}
    $StaleDate = (Get-Date).AddDays(-$StaleDays).ToString("yyyy-MM-dd")
    
    Write-Host "Finding hosts not seen since: $StaleDate" -ForegroundColor Cyan
    
    $StaleHosts = Get-FalconHost -Filter "last_seen:<='$StaleDate'" -Detailed
    
    $Report = $StaleHosts | Select-Object \`
        hostname,
        device_id,
        local_ip,
        platform_name,
        os_version,
        agent_version,
        first_seen,
        last_seen,
        status,
        @{N='DaysSinceLastSeen';E={((Get-Date) - [DateTime]$_.last_seen).Days}},
        groups,
        tags
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Stale sensor report generated" -ForegroundColor Green
    Write-Host "  Threshold: $StaleDays days" -ForegroundColor Cyan
    Write-Host "  Stale Hosts Found: $($StaleHosts.Count)" -ForegroundColor Yellow
    Write-Host "  Report exported: ${exportPath}" -ForegroundColor Green
    
    if ($StaleHosts.Count -gt 0) {
        Write-Host ""
        Write-Host "Top 10 Stale Hosts:" -ForegroundColor Yellow
        $Report | Sort-Object DaysSinceLastSeen -Descending | 
            Select-Object hostname, DaysSinceLastSeen, last_seen -First 10 | 
            Format-Table -AutoSize
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-uninstall-sensor',
    name: 'Uninstall Sensor Token Generation',
    category: 'Sensor Management',
    description: 'Generate an uninstall token for sensor removal',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'hostId', label: 'Host ID', type: 'text', required: true },
      { id: 'auditMessage', label: 'Audit Message', type: 'text', required: true, description: 'Reason for generating uninstall token' }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const hostId = escapePowerShellString(params.hostId);
      const auditMessage = escapePowerShellString(params.auditMessage);
      
      return `# CrowdStrike Uninstall Sensor Token Generation
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $HostId = "${hostId}"
    $AuditMessage = "${auditMessage}"
    
    Write-Host "Generating uninstall token for host: $HostId" -ForegroundColor Cyan
    
    $Host = Get-FalconHost -Id $HostId
    
    if (-not $Host) {
        throw "Host not found: $HostId"
    }
    
    Write-Host "  Hostname: $($Host.hostname)" -ForegroundColor Yellow
    Write-Host "  Platform: $($Host.platform_name)" -ForegroundColor Yellow
    
    $Token = Get-FalconUninstallToken -Id $HostId -audit_message $AuditMessage
    
    Write-Host ""
    Write-Host "[SUCCESS] Uninstall token generated" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  UNINSTALL TOKEN" -ForegroundColor Yellow
    Write-Host "  $($Token.uninstall_token)" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Host: $($Host.hostname)" -ForegroundColor Cyan
    Write-Host "  Host ID: $HostId" -ForegroundColor Cyan
    Write-Host "  Audit Message: $AuditMessage" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[WARNING] Store this token securely. It is required to uninstall the sensor." -ForegroundColor Yellow
    
} catch {
    Write-Error "Token generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-vulnerability-scan-results',
    name: 'Export Vulnerability Scan Results',
    category: 'Reporting',
    description: 'Export Spotlight vulnerability assessment results for hosts',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'severityFilter', label: 'Minimum Severity', type: 'select', required: true, options: ['Critical', 'High', 'Medium', 'Low', 'All'], defaultValue: 'High' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const severityFilter = params.severityFilter;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Export Vulnerability Scan Results
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Exporting Spotlight vulnerability results..." -ForegroundColor Cyan
    
    ${severityFilter !== 'All' ? `$Filter = "cve.severity:['${severityFilter.toLowerCase()}']"` : '$Filter = $null'}
    
    $Vulnerabilities = Get-FalconSpotlightVulnerability${severityFilter !== 'All' ? ' -Filter $Filter' : ''} -Detailed
    
    $Report = $Vulnerabilities | Select-Object \`
        id,
        cve.id,
        cve.severity,
        cve.base_score,
        cve.exploitability_score,
        cve.description,
        host_info.hostname,
        host_info.local_ip,
        host_info.os_version,
        apps.product_name_version,
        status,
        created_timestamp,
        updated_timestamp
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $SeveritySummary = $Vulnerabilities | Group-Object { $_.cve.severity } | 
        Select-Object @{N='Severity';E={$_.Name}}, Count | 
        Sort-Object @{E={switch($_.Severity){"critical"{1}"high"{2}"medium"{3}"low"{4}default{5}}}}
    
    $SummaryPath = "${exportPath}".Replace(".csv", "_summary.csv")
    $SeveritySummary | Export-Csv -Path $SummaryPath -NoTypeInformation
    
    Write-Host "[SUCCESS] Vulnerability report exported" -ForegroundColor Green
    Write-Host "  Total Vulnerabilities: $($Vulnerabilities.Count)" -ForegroundColor Cyan
    Write-Host "  Severity Filter: ${severityFilter}" -ForegroundColor Cyan
    Write-Host "  Detailed Report: ${exportPath}" -ForegroundColor Green
    Write-Host "  Summary Report: $SummaryPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Severity Breakdown:" -ForegroundColor Yellow
    $SeveritySummary | Format-Table -AutoSize
    
} catch {
    Write-Error "Vulnerability export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-firewall-policy-management',
    name: 'Manage Firewall Policies',
    category: 'Prevention Policies',
    description: 'Create or update Falcon Firewall Management policies',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Policy', 'Enable Policy', 'Disable Policy', 'Delete Policy'], defaultValue: 'Create Policy' },
      { id: 'platform', label: 'Platform', type: 'select', required: true, options: ['Windows', 'Mac', 'Linux'], defaultValue: 'Windows' },
      { id: 'description', label: 'Policy Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policyName = escapePowerShellString(params.policyName);
      const action = params.action;
      const platform = params.platform;
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# CrowdStrike Manage Firewall Policies
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $PolicyName = "${policyName}"
    $Action = "${action}"
    
    Write-Host "Managing firewall policy: $PolicyName" -ForegroundColor Cyan
    
    switch ($Action) {
        "Create Policy" {
            $Params = @{
                name = $PolicyName
                platform_name = "${platform}"
            }
            ${description ? `$Params.description = "${description}"` : ''}
            
            $Policy = New-FalconFirewallPolicy @Params
            Write-Host "[SUCCESS] Firewall policy created" -ForegroundColor Green
            Write-Host "  Policy ID: $($Policy.id)" -ForegroundColor Cyan
        }
        "Enable Policy" {
            $Policy = Get-FalconFirewallPolicy -Filter "name:'$PolicyName'"
            if ($Policy) {
                Edit-FalconFirewallPolicy -Id $Policy.id -enabled $true
                Write-Host "[SUCCESS] Firewall policy enabled" -ForegroundColor Green
            } else {
                throw "Policy not found: $PolicyName"
            }
        }
        "Disable Policy" {
            $Policy = Get-FalconFirewallPolicy -Filter "name:'$PolicyName'"
            if ($Policy) {
                Edit-FalconFirewallPolicy -Id $Policy.id -enabled $false
                Write-Host "[SUCCESS] Firewall policy disabled" -ForegroundColor Yellow
            } else {
                throw "Policy not found: $PolicyName"
            }
        }
        "Delete Policy" {
            $Policy = Get-FalconFirewallPolicy -Filter "name:'$PolicyName'"
            if ($Policy) {
                Remove-FalconFirewallPolicy -Id $Policy.id
                Write-Host "[SUCCESS] Firewall policy deleted" -ForegroundColor Red
            } else {
                throw "Policy not found: $PolicyName"
            }
        }
    }
    
    Write-Host "  Policy Name: $PolicyName" -ForegroundColor Cyan
    Write-Host "  Action: $Action" -ForegroundColor Cyan
    
} catch {
    Write-Error "Firewall policy management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-device-control-policies',
    name: 'Manage Device Control Policies',
    category: 'Prevention Policies',
    description: 'Configure USB and removable device control policies',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true },
      { id: 'usbAction', label: 'USB Storage Action', type: 'select', required: true, options: ['Allow', 'Block', 'Read Only'], defaultValue: 'Block' },
      { id: 'bluetoothAction', label: 'Bluetooth Action', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Allow' },
      { id: 'hostGroupIds', label: 'Target Host Group IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const policyName = escapePowerShellString(params.policyName);
      const usbAction = params.usbAction;
      const bluetoothAction = params.bluetoothAction;
      const hostGroupIdsRaw = (params.hostGroupIds as string).split(',').map((n: string) => n.trim());
      
      return `# CrowdStrike Manage Device Control Policies
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $PolicyName = "${policyName}"
    $HostGroupIds = @(${hostGroupIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    Write-Host "Configuring device control policy: $PolicyName" -ForegroundColor Cyan
    
    $UsbSetting = switch ("${usbAction}") {
        "Allow" { "FULL_ACCESS" }
        "Block" { "BLOCK_ALL" }
        "Read Only" { "READ_ONLY" }
    }
    
    $BluetoothSetting = switch ("${bluetoothAction}") {
        "Allow" { "FULL_ACCESS" }
        "Block" { "BLOCK_ALL" }
    }
    
    $PolicySettings = @{
        settings = @{
            classes = @(
                @{
                    id = "USB_MASS_STORAGE"
                    action = $UsbSetting
                }
                @{
                    id = "BLUETOOTH"
                    action = $BluetoothSetting
                }
            )
        }
    }
    
    $Policy = Get-FalconDeviceControlPolicy -Filter "name:'$PolicyName'"
    
    if (-not $Policy) {
        Write-Host "Creating new device control policy..." -ForegroundColor Yellow
        $Policy = New-FalconDeviceControlPolicy -name $PolicyName -platform_name "Windows" @PolicySettings
    } else {
        Write-Host "Updating existing policy..." -ForegroundColor Yellow
        Edit-FalconDeviceControlPolicy -Id $Policy.id @PolicySettings
    }
    
    foreach ($GroupId in $HostGroupIds) {
        Edit-FalconDeviceControlPolicy -Id $Policy.id -groups @($GroupId)
        Write-Host "  [SUCCESS] Policy applied to group: $GroupId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Device control policy configured" -ForegroundColor Green
    Write-Host "  Policy: $PolicyName" -ForegroundColor Cyan
    Write-Host "  USB Storage: ${usbAction}" -ForegroundColor Cyan
    Write-Host "  Bluetooth: ${bluetoothAction}" -ForegroundColor Cyan
    Write-Host "  Applied to $($HostGroupIds.Count) groups" -ForegroundColor Cyan
    
} catch {
    Write-Error "Device control policy configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-api-audit-log',
    name: 'Export API Audit Logs',
    category: 'Reporting',
    description: 'Export API activity audit logs for security review',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'daysBack', label: 'Days to Include', type: 'number', required: true, defaultValue: 7 },
      { id: 'activityFilter', label: 'Activity Filter', type: 'select', required: false, options: ['All Activities', 'Authentication', 'Detection Updates', 'Policy Changes', 'Host Actions'], defaultValue: 'All Activities' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const daysBack = params.daysBack || 7;
      const activityFilter = params.activityFilter;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Export API Audit Logs
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    $DaysBack = ${daysBack}
    $StartDate = (Get-Date).AddDays(-$DaysBack).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    Write-Host "Exporting API audit logs for last $DaysBack days..." -ForegroundColor Cyan
    
    $Filter = "timestamp:>='$StartDate'"
    
    ${activityFilter !== 'All Activities' ? `
    $ActivityFilter = switch ("${activityFilter}") {
        "Authentication" { "+operation_name:['AuthenticateWithClientId','Authenticate']" }
        "Detection Updates" { "+operation_name:['UpdateDetectsByIds']" }
        "Policy Changes" { "+operation_name:['*Policy*']" }
        "Host Actions" { "+operation_name:['*Host*']" }
    }
    $Filter += $ActivityFilter
    ` : ''}
    
    $AuditEvents = Get-FalconEvent -Filter $Filter
    
    $Report = $AuditEvents | Select-Object \`
        timestamp,
        user_name,
        operation_name,
        service_name,
        audit_key_values,
        success,
        user_ip
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $OperationSummary = $AuditEvents | Group-Object operation_name | 
        Select-Object @{N='Operation';E={$_.Name}}, Count | 
        Sort-Object Count -Descending
    
    $SummaryPath = "${exportPath}".Replace(".csv", "_summary.csv")
    $OperationSummary | Export-Csv -Path $SummaryPath -NoTypeInformation
    
    Write-Host "[SUCCESS] API audit log exported" -ForegroundColor Green
    Write-Host "  Period: Last $DaysBack days" -ForegroundColor Cyan
    Write-Host "  Filter: ${activityFilter}" -ForegroundColor Cyan
    Write-Host "  Total Events: $($AuditEvents.Count)" -ForegroundColor Cyan
    Write-Host "  Detailed Log: ${exportPath}" -ForegroundColor Green
    Write-Host "  Operation Summary: $SummaryPath" -ForegroundColor Green
    
} catch {
    Write-Error "Audit log export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-quarantine-management',
    name: 'Manage Quarantined Files',
    category: 'Response Policies',
    description: 'List, release, or delete quarantined files',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['List Quarantined Files', 'Release Files', 'Delete Files'], defaultValue: 'List Quarantined Files' },
      { id: 'hostId', label: 'Host ID (optional)', type: 'text', required: false },
      { id: 'sha256', label: 'File SHA256 (for release/delete)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Path (for list)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const action = params.action;
      const hostId = params.hostId ? escapePowerShellString(params.hostId) : '';
      const sha256 = params.sha256 ? escapePowerShellString(params.sha256) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# CrowdStrike Manage Quarantined Files
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Managing quarantined files: ${action}" -ForegroundColor Cyan
    
    switch ("${action}") {
        "List Quarantined Files" {
            ${hostId ? `$Filter = "device.device_id:'${hostId}'"` : '$Filter = $null'}
            
            $Quarantined = Get-FalconQuarantine${hostId ? ' -Filter $Filter' : ''}
            
            $Report = $Quarantined | Select-Object \`
                id,
                sha256,
                filename,
                paths,
                device_id,
                hostname,
                date_created,
                date_updated
            
            ${exportPath ? `$Report | Export-Csv -Path "${exportPath}" -NoTypeInformation` : '$Report | Format-Table -AutoSize'}
            
            Write-Host "[SUCCESS] Found $($Quarantined.Count) quarantined files" -ForegroundColor Green
            ${exportPath ? `Write-Host "  Exported to: ${exportPath}" -ForegroundColor Green` : ''}
        }
        "Release Files" {
            if (-not "${sha256}") {
                throw "SHA256 required for release operation"
            }
            
            Invoke-FalconQuarantineAction -Action "release" -Ids @("${sha256}")
            Write-Host "[SUCCESS] File released from quarantine" -ForegroundColor Green
            Write-Host "  SHA256: ${sha256}" -ForegroundColor Cyan
        }
        "Delete Files" {
            if (-not "${sha256}") {
                throw "SHA256 required for delete operation"
            }
            
            Invoke-FalconQuarantineAction -Action "delete" -Ids @("${sha256}")
            Write-Host "[SUCCESS] File deleted from quarantine" -ForegroundColor Green
            Write-Host "  SHA256: ${sha256}" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Error "Quarantine management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cs-user-role-management',
    name: 'Manage User Roles and Permissions',
    category: 'Reporting',
    description: 'Export user roles and permissions for access review and audit',
    parameters: [
      { id: 'clientId', label: 'API Client ID', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const clientId = escapePowerShellString(params.clientId);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# CrowdStrike Manage User Roles and Permissions
# Generated: ${new Date().toISOString()}

Import-Module PSFalcon

try {
    Request-FalconToken -ClientId "${clientId}" -ClientSecret (Read-Host -AsSecureString -Prompt "Enter API Secret")
    
    Write-Host "Retrieving user roles and permissions..." -ForegroundColor Cyan
    
    $Users = Get-FalconUser -Detailed
    $Roles = Get-FalconRole
    
    $Report = $Users | ForEach-Object {
        $User = $_
        $UserRoles = $User.roles | ForEach-Object {
            $RoleId = $_
            $RoleInfo = $Roles | Where-Object { $_.id -eq $RoleId }
            $RoleInfo.name
        }
        
        [PSCustomObject]@{
            UserId = $User.uuid
            Email = $User.email
            FirstName = $User.first_name
            LastName = $User.last_name
            Status = $User.status
            Roles = ($UserRoles -join ", ")
            LastLogin = $User.last_login
            CreatedAt = $User.created_at
        }
    }
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $RoleSummary = $Users | ForEach-Object { $_.roles } | Group-Object | 
        ForEach-Object {
            $RoleInfo = $Roles | Where-Object { $_.id -eq $_.Name }
            [PSCustomObject]@{
                Role = if ($RoleInfo) { $RoleInfo.name } else { $_.Name }
                UserCount = $_.Count
            }
        } | Sort-Object UserCount -Descending
    
    $RolePath = "${exportPath}".Replace(".csv", "_roles.csv")
    $RoleSummary | Export-Csv -Path $RolePath -NoTypeInformation
    
    Write-Host "[SUCCESS] User roles report generated" -ForegroundColor Green
    Write-Host "  Total Users: $($Users.Count)" -ForegroundColor Cyan
    Write-Host "  Total Roles: $($Roles.Count)" -ForegroundColor Cyan
    Write-Host "  User Report: ${exportPath}" -ForegroundColor Green
    Write-Host "  Role Summary: $RolePath" -ForegroundColor Green
    
} catch {
    Write-Error "User roles report failed: $_"
}`;
    },
    isPremium: true
  }
];
