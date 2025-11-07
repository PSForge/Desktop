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
  },
  {
    id: 'cs-configure-rtr-policies',
    name: 'Configure Real-Time Response Policies',
    category: 'Common Admin Tasks',
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
    
    # Get existing policy or create new
    $Policy = Get-FalconResponsePolicy -Filter "name:'${policyName}'"
    
    if (-not $Policy) {
        Write-Host "Creating new RTR policy..." -ForegroundColor Yellow
        $Policy = New-FalconResponsePolicy -name "${policyName}" -platform_name "Windows"
    }
    
    # Configure RTR settings
    $Settings = @{
        Id = $Policy.id
        settings = @{
            enable_rtr = ${enableRTR}
            session_timeout = ${sessionTimeout}
        }
    }
    
    Edit-FalconResponsePolicy @Settings
    
    Write-Host "✓ RTR Policy configured successfully" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    # Map exclusion type to API parameter
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
        Write-Host "✓ Exclusion added successfully" -ForegroundColor Green
    } else {
        # Find and remove exclusion
        $Exclusions = Get-FalconIoaExclusion -Filter "value:'$ExclusionValue'"
        if ($Exclusions) {
            Remove-FalconIoaExclusion -Ids $Exclusions.id
            Write-Host "✓ Exclusion removed successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ Exclusion not found" -ForegroundColor Yellow
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
    category: 'Common Admin Tasks',
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
    
    # Start RTR session
    $Session = Start-FalconSession -Id $HostId
    
    if ($Session) {
        Write-Host "✓ RTR session established: $($Session.session_id)" -ForegroundColor Green
        
        # Execute command
        Write-Host "Executing command: $Command" -ForegroundColor Cyan
        
        if ($CommandArgs) {
            $Result = Invoke-FalconRtr -Command $Command -Arguments $CommandArgs -SessionId $Session.session_id
        } else {
            $Result = Invoke-FalconRtr -Command $Command -SessionId $Session.session_id
        }
        
        # Export results
        $Result | Out-File -FilePath "${exportPath}" -Encoding UTF8
        
        Write-Host "✓ Command executed successfully" -ForegroundColor Green
        Write-Host "  Results exported: ${exportPath}" -ForegroundColor Cyan
        Write-Host "  Output Preview:" -ForegroundColor Yellow
        Write-Host $Result.stdout -ForegroundColor Gray
        
        # Close session
        Remove-FalconSession -SessionId $Session.session_id
        Write-Host "✓ RTR session closed" -ForegroundColor Green
        
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
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Threat intelligence report generated" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    # Create IOC array
    $IOCs = @(${iocValuesRaw.map(ioc => `"${escapePowerShellString(ioc)}"`).join(',\n        ')})
    
    Write-Host "Processing $($IOCs.Count) indicators..." -ForegroundColor Yellow
    
    foreach ($IOC in $IOCs) {
        try {
            # Create custom IOC indicator
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
            Write-Host "  ✓ Added: $IOC" -ForegroundColor Green
            
        } catch {
            Write-Host "  ✗ Failed: $IOC - $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ Custom IOC list processing complete" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    # Get or create sensor update policy
    $Policy = Get-FalconSensorUpdatePolicy -Filter "name:'$PolicyName'"
    
    # Map update schedule to settings
    $ScheduleSettings = switch ("${updateSchedule}") {
        "Immediate" { @{ enabled = $true; uninstall_protection = $true } }
        "Staged (25% per day)" { @{ enabled = $true; stages = 4; uninstall_protection = $true } }
        "Maintenance Window Only" { @{ enabled = $true; scheduler = "maintenance_window"; uninstall_protection = $true } }
    }
    
    # Map maintenance window
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
    
    # Apply policy to host groups
    foreach ($GroupId in $HostGroupIds) {
        Edit-FalconSensorUpdatePolicy -Id $Policy.id -groups @($GroupId)
        Write-Host "  ✓ Policy applied to group: $GroupId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✓ Sensor update policy configured successfully" -ForegroundColor Green
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
  }
];
