import { escapePowerShellString } from './powershell-utils';

export interface ServiceNowTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface ServiceNowTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: ServiceNowTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const servicenowTasks: ServiceNowTask[] = [
  {
    id: 'snow-bulk-create-incidents',
    name: 'Bulk Create Incidents',
    category: 'Bulk Operations',
    description: 'Create multiple incidents from a list',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true, placeholder: 'company.service-now.com' },
      { id: 'shortDescriptions', label: 'Short Descriptions (one per line)', type: 'textarea', required: true },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low'], defaultValue: '3 - Moderate' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const descriptions = (params.shortDescriptions as string).split('\n').filter((d: string) => d.trim());
      const priority = params.priority.split(' - ')[0];
      
      return `# ServiceNow Bulk Create Incidents
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/incident"

# Credentials - retrieve from secure store or prompt
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$Headers = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

$Descriptions = @(
${descriptions.map(d => `    "${escapePowerShellString(d.trim())}"`).join(',\n')}
)

try {
    foreach ($Description in $Descriptions) {
        $Body = @{
            short_description = $Description
            priority = "${priority}"
            urgency = "3"
            impact = "3"
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri $ApiUrl \`
            -Method Post \`
            -Headers $Headers \`
            -Credential $Credential \`
            -Body $Body
        
        Write-Host "✓ Incident created: $($Response.result.number) - $Description" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Created $($Descriptions.Count) incidents!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'snow-query-incidents',
    name: 'Query Incidents',
    category: 'Incident Management',
    description: 'Retrieve and filter incidents',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'state', label: 'State', type: 'select', required: true, options: ['New', 'In Progress', 'Resolved', 'Closed', 'All'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const state = params.state;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Query ServiceNow Incidents
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/incident"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
${state !== 'All' ? `    $StateFilter = "?sysparm_query=state=${state}"
    $Uri = $ApiUrl + $StateFilter` : `    $Uri = $ApiUrl`}
    
    $Response = Invoke-RestMethod -Uri $Uri \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    $Incidents = $Response.result | Select-Object \`
        number,
        short_description,
        state,
        priority,
        assigned_to,
        opened_at,
        sys_updated_on
    
    Write-Host "Found $($Incidents.Count) incidents" -ForegroundColor Cyan
    $Incidents | Format-Table -AutoSize
    
${exportPath ? `    $Incidents | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'snow-update-cmdb',
    name: 'Update CMDB Records',
    category: 'CMDB Management',
    description: 'Update Configuration Management Database records',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciName', label: 'CI Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'field', label: 'Field to Update', type: 'text', required: true, placeholder: 'ip_address' },
      { id: 'value', label: 'New Value', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const ciName = escapePowerShellString(params.ciName);
      const field = escapePowerShellString(params.field);
      const value = escapePowerShellString(params.value);
      
      return `# Update ServiceNow CMDB Record
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find CI
    $SearchUrl = "https://$Instance/api/now/table/cmdb_ci?sysparm_query=name=${ciName}"
    $CI = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    if ($CI.result) {
        $CIId = $CI.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/cmdb_ci/$CIId"
        
        $Body = @{ "${field}" = "${value}" } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body
        
        Write-Host "✓ CI '${ciName}' updated: ${field} = ${value}" -ForegroundColor Green
    } else {
        Write-Host "⚠ CI not found: ${ciName}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Update failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'snow-update-incident',
    name: 'Create and Update Incidents',
    category: 'Common Admin Tasks',
    description: 'Update an existing incident in ServiceNow',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'incidentNumber', label: 'Incident Number', type: 'text', required: true, placeholder: 'INC0010001' },
      { id: 'state', label: 'New State', type: 'select', required: false, options: ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed'], defaultValue: 'In Progress' },
      { id: 'workNotes', label: 'Work Notes', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const incidentNumber = escapePowerShellString(params.incidentNumber);
      const state = params.state;
      const workNotes = params.workNotes ? escapePowerShellString(params.workNotes) : '';
      
      return `# Update ServiceNow Incident
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$StateMap = @{
    "New" = "1"
    "In Progress" = "2"
    "On Hold" = "3"
    "Resolved" = "6"
    "Closed" = "7"
}

try {
    # Find incident by number
    $SearchUrl = "https://$Instance/api/now/table/incident?sysparm_query=number=${incidentNumber}"
    $Incident = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    if ($Incident.result) {
        $IncidentId = $Incident.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/incident/$IncidentId"
        
        $Body = @{}
${state ? `        $Body["state"] = $StateMap["${state}"]` : ''}
${workNotes ? `        $Body["work_notes"] = "${workNotes}"` : ''}
        
        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body ($Body | ConvertTo-Json)
        
        Write-Host "✓ Incident ${incidentNumber} updated successfully!" -ForegroundColor Green
${state ? `        Write-Host "  State: ${state}" -ForegroundColor Cyan` : ''}
    } else {
        Write-Host "⚠ Incident not found: ${incidentNumber}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-create-service-request',
    name: 'Create Service Requests',
    category: 'Common Admin Tasks',
    description: 'Create a new service request in ServiceNow',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'shortDescription', label: 'Short Description', type: 'text', required: true },
      { id: 'description', label: 'Detailed Description', type: 'textarea', required: true },
      { id: 'requestedFor', label: 'Requested For (username)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const shortDescription = escapePowerShellString(params.shortDescription);
      const description = escapePowerShellString(params.description);
      const requestedFor = escapePowerShellString(params.requestedFor);
      
      return `# Create ServiceNow Service Request
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/sc_request"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        short_description = "${shortDescription}"
        description = "${description}"
        requested_for = "${requestedFor}"
    } | ConvertTo-Json
    
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body
    
    Write-Host "✓ Service request created: $($Response.result.number)" -ForegroundColor Green
    Write-Host "  Description: ${shortDescription}" -ForegroundColor Cyan
    Write-Host "  Requested For: ${requestedFor}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Service request creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-query-cmdb',
    name: 'Query CMDB Assets and Relationships',
    category: 'Common Admin Tasks',
    description: 'Query CMDB for assets and their relationships',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciClass', label: 'CI Class', type: 'select', required: true, options: ['cmdb_ci_server', 'cmdb_ci_computer', 'cmdb_ci_netgear', 'cmdb_ci'], defaultValue: 'cmdb_ci' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\CMDB-Assets.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const ciClass = params.ciClass;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Query ServiceNow CMDB Assets
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/${ciClass}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    $Assets = $Response.result | Select-Object \`
        name,
        sys_class_name,
        ip_address,
        dns_domain,
        operational_status,
        location,
        managed_by,
        owned_by,
        sys_created_on,
        sys_updated_on
    
    $Assets | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ CMDB assets exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Assets: $($Assets.Count)" -ForegroundColor Cyan
    Write-Host "  Class: ${ciClass}" -ForegroundColor Cyan
    
} catch {
    Write-Error "CMDB query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-ticket-statistics',
    name: 'Retrieve Ticket Statistics by Priority',
    category: 'Common Admin Tasks',
    description: 'Generate ticket statistics report by priority',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'days', label: 'Days to Include', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const days = params.days || 30;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# ServiceNow Ticket Statistics by Priority
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $StartDate = (Get-Date).AddDays(-${days}).ToString("yyyy-MM-dd")
    $ApiUrl = "https://$Instance/api/now/table/incident?sysparm_query=opened_atONLast ${days} days@javascript:gs.daysAgoStart(${days})@javascript:gs.daysAgoEnd(0)"
    
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    $Statistics = $Response.result | Group-Object priority | Select-Object \`
        @{N='Priority';E={
            switch($_.Name) {
                "1" { "Critical" }
                "2" { "High" }
                "3" { "Moderate" }
                "4" { "Low" }
                default { "Unknown" }
            }
        }},
        @{N='Count';E={$_.Count}},
        @{N='Percentage';E={[Math]::Round(($_.Count / $Response.result.Count) * 100, 2)}}
    
    Write-Host "Ticket Statistics (Last ${days} Days):" -ForegroundColor Cyan
    $Statistics | Format-Table -AutoSize
    
${exportPath ? `    $Statistics | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Statistics exported: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Statistics retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-sla-metrics',
    name: 'Retrieve SLA Performance Metrics',
    category: 'Common Admin Tasks',
    description: 'Generate SLA performance and compliance report',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'days', label: 'Days to Include', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SLA-Metrics.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ServiceNow SLA Performance Metrics
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/task_sla"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    $SLAMetrics = $Response.result | Select-Object \`
        @{N='SLA_Name';E={$_.sla.display_value}},
        @{N='Task';E={$_.task.display_value}},
        @{N='Stage';E={$_.stage}},
        @{N='HasBreached';E={$_.has_breached}},
        @{N='PercentageComplete';E={$_.percentage}},
        @{N='DurationTime';E={$_.duration}},
        @{N='TimeLeft';E={$_.time_left}},
        sys_created_on
    
    $SLAMetrics | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalSLAs = $SLAMetrics.Count
    $BreachedSLAs = ($SLAMetrics | Where-Object HasBreached -eq "true").Count
    $ComplianceRate = [Math]::Round((($TotalSLAs - $BreachedSLAs) / $TotalSLAs) * 100, 2)
    
    Write-Host "✓ SLA metrics exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total SLAs: $TotalSLAs" -ForegroundColor Cyan
    Write-Host "  Breached: $BreachedSLAs" -ForegroundColor Red
    Write-Host "  Compliance Rate: $ComplianceRate%" -ForegroundColor Green
    
} catch {
    Write-Error "SLA metrics retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-performance-report',
    name: 'Generate Service Performance Reports',
    category: 'Common Admin Tasks',
    description: 'Generate comprehensive service performance report',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'reportType', label: 'Report Type', type: 'select', required: true, options: ['Incident Resolution', 'Request Fulfillment', 'Change Success', 'Overall'], defaultValue: 'Overall' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Service-Performance.txt' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const reportType = params.reportType;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ServiceNow Service Performance Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$Report = @()

try {
    # Get incident metrics
    $IncidentUrl = "https://$Instance/api/now/table/incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)"
    $Incidents = Invoke-RestMethod -Uri $IncidentUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
    
    $Report += "=== Service Performance Report ==="
    $Report += "Generated: $(Get-Date)"
    $Report += "Instance: ${instance}"
    $Report += ""
    $Report += "--- Incident Metrics (Last 30 Days) ---"
    $Report += "Total Incidents: $($Incidents.result.Count)"
    $Report += "Resolved: $(($Incidents.result | Where-Object state -eq '6').Count)"
    $Report += "Closed: $(($Incidents.result | Where-Object state -eq '7').Count)"
    $Report += "In Progress: $(($Incidents.result | Where-Object state -eq '2').Count)"
    $Report += ""
    
    $Report | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    Write-Host "✓ Performance report generated: ${exportPath}" -ForegroundColor Green
    $Report | ForEach-Object { Write-Host $_ }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-manage-groups',
    name: 'Manage Groups and Roles',
    category: 'Common Admin Tasks',
    description: 'Create or manage ServiceNow groups and assignments',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'IT-Support-Team' },
      { id: 'description', label: 'Group Description', type: 'text', required: true },
      { id: 'groupType', label: 'Group Type', type: 'text', required: false, placeholder: 'Support' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const groupName = escapePowerShellString(params.groupName);
      const description = escapePowerShellString(params.description);
      const groupType = params.groupType ? escapePowerShellString(params.groupType) : '';
      
      return `# Manage ServiceNow Groups
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/sys_user_group"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        name = "${groupName}"
        description = "${description}"
${groupType ? `        type = "${groupType}"` : ''}
        active = "true"
    } | ConvertTo-Json
    
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body
    
    Write-Host "✓ Group created: ${groupName}" -ForegroundColor Green
    Write-Host "  Description: ${description}" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Group creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-manage-permissions',
    name: 'Manage User Permissions',
    category: 'Common Admin Tasks',
    description: 'Assign or remove user roles and permissions',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'itil' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const username = escapePowerShellString(params.username);
      const roleName = escapePowerShellString(params.roleName);
      const action = params.action;
      
      return `# Manage ServiceNow User Permissions
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find user
    $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${username}"
    $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
    
    if ($User.result) {
        $UserId = $User.result[0].sys_id
        
        # Find role
        $RoleUrl = "https://$Instance/api/now/table/sys_user_role?sysparm_query=name=${roleName}"
        $Role = Invoke-RestMethod -Uri $RoleUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
        
        if ($Role.result) {
            $RoleId = $Role.result[0].sys_id
            
${action === 'Add' ? `            # Add role to user
            $AssignUrl = "https://$Instance/api/now/table/sys_user_has_role"
            $Body = @{
                user = $UserId
                role = $RoleId
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri $AssignUrl -Method Post -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body
            
            Write-Host "✓ Role '${roleName}' added to user '${username}'" -ForegroundColor Green` : `            # Remove role from user
            $SearchUrl = "https://$Instance/api/now/table/sys_user_has_role?sysparm_query=user=$UserId^role=$RoleId"
            $Assignment = Invoke-RestMethod -Uri $SearchUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
            
            if ($Assignment.result) {
                $DeleteUrl = "https://$Instance/api/now/table/sys_user_has_role/$($Assignment.result[0].sys_id)"
                Invoke-RestMethod -Uri $DeleteUrl -Method Delete -Credential $Credential -Headers @{"Accept"="application/json"}
                Write-Host "✓ Role '${roleName}' removed from user '${username}'" -ForegroundColor Green
            }`}
        } else {
            Write-Host "⚠ Role not found: ${roleName}" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ User not found: ${username}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Permission management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-integrate-event-alerts',
    name: 'Integrate ServiceNow with Event Alerts',
    category: 'Common Admin Tasks',
    description: 'Create event monitoring integration for automated alerts',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'eventSource', label: 'Event Source', type: 'text', required: true, placeholder: 'Monitoring-System' },
      { id: 'eventType', label: 'Event Type', type: 'text', required: true, placeholder: 'Server-Down' },
      { id: 'severity', label: 'Severity', type: 'select', required: true, options: ['Critical', 'Major', 'Minor', 'Warning', 'Info'], defaultValue: 'Major' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const eventSource = escapePowerShellString(params.eventSource);
      const eventType = escapePowerShellString(params.eventType);
      const severity = params.severity;
      
      return `# Integrate ServiceNow Event Alerts
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/em_event"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Create event alert
    $Body = @{
        source = "${eventSource}"
        event_class = "${eventType}"
        severity = "${severity}"
        description = "Automated event from ${eventSource}"
        node = $env:COMPUTERNAME
        time_of_event = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json
    
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body
    
    Write-Host "✓ Event alert created in ServiceNow" -ForegroundColor Green
    Write-Host "  Source: ${eventSource}" -ForegroundColor Cyan
    Write-Host "  Type: ${eventType}" -ForegroundColor Cyan
    Write-Host "  Severity: ${severity}" -ForegroundColor Cyan
    Write-Host "  Event Number: $($Response.result.number)" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Example integration script for automated monitoring:" -ForegroundColor Yellow
    Write-Host "  Monitor your systems and POST events to this endpoint" -ForegroundColor Yellow
    
} catch {
    Write-Error "Event integration failed: $_"
}`;
    },
    isPremium: true
  }
];
