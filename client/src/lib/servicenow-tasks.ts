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
  // ==================== INCIDENT MANAGEMENT ====================
  {
    id: 'snow-create-incident',
    name: 'Create Incident',
    category: 'Incident Management',
    description: 'Create a new incident in ServiceNow',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true, placeholder: 'company.service-now.com' },
      { id: 'shortDescription', label: 'Short Description', type: 'text', required: true },
      { id: 'description', label: 'Detailed Description', type: 'textarea', required: false },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low'], defaultValue: '3 - Moderate' },
      { id: 'assignmentGroup', label: 'Assignment Group', type: 'text', required: false, placeholder: 'Service Desk' },
      { id: 'caller', label: 'Caller (username)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const shortDescription = escapePowerShellString(params.shortDescription);
      const description = params.description ? escapePowerShellString(params.description) : '';
      const priority = params.priority.split(' - ')[0];
      const assignmentGroup = params.assignmentGroup ? escapePowerShellString(params.assignmentGroup) : '';
      const caller = escapePowerShellString(params.caller);

      return `# Create ServiceNow Incident
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/incident"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$Headers = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        short_description = "${shortDescription}"
        priority = "${priority}"
        caller_id = "${caller}"
        urgency = "3"
        impact = "3"
${description ? `        description = "${description}"` : ''}
${assignmentGroup ? `        assignment_group = "${assignmentGroup}"` : ''}
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Headers $Headers \`
        -Credential $Credential \`
        -Body $Body

    Write-Host "✓ Incident created successfully!" -ForegroundColor Green
    Write-Host "  Number: $($Response.result.number)" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan
    Write-Host "  Priority: ${priority}" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to create incident: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-bulk-create-incidents',
    name: 'Bulk Create Incidents',
    category: 'Incident Management',
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
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$Headers = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

$Descriptions = @(
${descriptions.map(d => `    "${escapePowerShellString(d.trim())}"`).join(',\n')}
)

try {
    $CreatedCount = 0
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
        $CreatedCount++
    }

    Write-Host ""
    Write-Host "Created $CreatedCount incidents!" -ForegroundColor Green

} catch {
    Write-Error "Failed: $_"
}`;
    },
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
    },
    isPremium: true
  },
  {
    id: 'snow-update-incident',
    name: 'Update Incident',
    category: 'Incident Management',
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
    id: 'snow-resolve-incident',
    name: 'Resolve Incident',
    category: 'Incident Management',
    description: 'Resolve an incident with resolution details',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'incidentNumber', label: 'Incident Number', type: 'text', required: true, placeholder: 'INC0010001' },
      { id: 'resolutionCode', label: 'Resolution Code', type: 'select', required: true, options: ['Solved (Work Around)', 'Solved (Permanently)', 'Solved Remotely (Work Around)', 'Solved Remotely (Permanently)', 'Not Solved (Not Reproducible)', 'Not Solved (Too Costly)', 'Closed/Resolved by Caller'], defaultValue: 'Solved (Permanently)' },
      { id: 'resolutionNotes', label: 'Resolution Notes', type: 'textarea', required: true },
      { id: 'closeNotes', label: 'Close Notes', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const incidentNumber = escapePowerShellString(params.incidentNumber);
      const resolutionCode = escapePowerShellString(params.resolutionCode);
      const resolutionNotes = escapePowerShellString(params.resolutionNotes);
      const closeNotes = params.closeNotes ? escapePowerShellString(params.closeNotes) : '';

      return `# Resolve ServiceNow Incident
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

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

        $Body = @{
            state = "6"
            close_code = "${resolutionCode}"
            close_notes = "${resolutionNotes}"
${closeNotes ? `            work_notes = "${closeNotes}"` : ''}
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Incident ${incidentNumber} resolved!" -ForegroundColor Green
        Write-Host "  Resolution Code: ${resolutionCode}" -ForegroundColor Cyan
        Write-Host "  Resolution Notes: ${resolutionNotes}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Incident not found: ${incidentNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Resolution failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-escalate-incident',
    name: 'Escalate Incident',
    category: 'Incident Management',
    description: 'Escalate an incident to higher priority or different group',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'incidentNumber', label: 'Incident Number', type: 'text', required: true, placeholder: 'INC0010001' },
      { id: 'newPriority', label: 'New Priority', type: 'select', required: true, options: ['1 - Critical', '2 - High', '3 - Moderate'], defaultValue: '2 - High' },
      { id: 'escalationGroup', label: 'Escalation Group', type: 'text', required: true, placeholder: 'Level 2 Support' },
      { id: 'escalationReason', label: 'Escalation Reason', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const incidentNumber = escapePowerShellString(params.incidentNumber);
      const newPriority = params.newPriority.split(' - ')[0];
      const escalationGroup = escapePowerShellString(params.escalationGroup);
      const escalationReason = escapePowerShellString(params.escalationReason);

      return `# Escalate ServiceNow Incident
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

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

        # Find escalation group
        $GroupUrl = "https://$Instance/api/now/table/sys_user_group?sysparm_query=name=${escalationGroup}"
        $Group = Invoke-RestMethod -Uri $GroupUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Group.result) {
            $GroupId = $Group.result[0].sys_id

            $Body = @{
                priority = "${newPriority}"
                assignment_group = $GroupId
                escalation = "1"
                work_notes = "ESCALATED: ${escalationReason}"
            } | ConvertTo-Json

            $Response = Invoke-RestMethod -Uri $UpdateUrl \`
                -Method Patch \`
                -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body

            Write-Host "✓ Incident ${incidentNumber} escalated!" -ForegroundColor Green
            Write-Host "  New Priority: ${newPriority}" -ForegroundColor Cyan
            Write-Host "  Assigned to: ${escalationGroup}" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ Escalation group not found: ${escalationGroup}" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Incident not found: ${incidentNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Escalation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-reassign-incident',
    name: 'Reassign Incident',
    category: 'Incident Management',
    description: 'Reassign an incident to a different user or group',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'incidentNumber', label: 'Incident Number', type: 'text', required: true, placeholder: 'INC0010001' },
      { id: 'assignedTo', label: 'Assign to User (username)', type: 'text', required: false },
      { id: 'assignmentGroup', label: 'Assignment Group', type: 'text', required: false, placeholder: 'Network Operations' },
      { id: 'reassignReason', label: 'Reassignment Reason', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const incidentNumber = escapePowerShellString(params.incidentNumber);
      const assignedTo = params.assignedTo ? escapePowerShellString(params.assignedTo) : '';
      const assignmentGroup = params.assignmentGroup ? escapePowerShellString(params.assignmentGroup) : '';
      const reassignReason = escapePowerShellString(params.reassignReason);

      return `# Reassign ServiceNow Incident
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

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

        $Body = @{
            work_notes = "REASSIGNED: ${reassignReason}"
        }

${assignedTo ? `        # Find user
        $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${assignedTo}"
        $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
        if ($User.result) {
            $Body["assigned_to"] = $User.result[0].sys_id
        }` : ''}

${assignmentGroup ? `        # Find group
        $GroupUrl = "https://$Instance/api/now/table/sys_user_group?sysparm_query=name=${assignmentGroup}"
        $Group = Invoke-RestMethod -Uri $GroupUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
        if ($Group.result) {
            $Body["assignment_group"] = $Group.result[0].sys_id
        }` : ''}

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body ($Body | ConvertTo-Json)

        Write-Host "✓ Incident ${incidentNumber} reassigned!" -ForegroundColor Green
${assignedTo ? `        Write-Host "  Assigned To: ${assignedTo}" -ForegroundColor Cyan` : ''}
${assignmentGroup ? `        Write-Host "  Assignment Group: ${assignmentGroup}" -ForegroundColor Cyan` : ''}
    } else {
        Write-Host "⚠ Incident not found: ${incidentNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Reassignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-add-incident-worknotes',
    name: 'Add Incident Work Notes',
    category: 'Incident Management',
    description: 'Add work notes or comments to an incident',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'incidentNumber', label: 'Incident Number', type: 'text', required: true, placeholder: 'INC0010001' },
      { id: 'workNotes', label: 'Work Notes', type: 'textarea', required: true },
      { id: 'isPublic', label: 'Add as Customer Visible', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const incidentNumber = escapePowerShellString(params.incidentNumber);
      const workNotes = escapePowerShellString(params.workNotes);
      const isPublic = params.isPublic;

      return `# Add Work Notes to ServiceNow Incident
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

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

        $Body = @{
${isPublic ? `            comments = "${workNotes}"` : `            work_notes = "${workNotes}"`}
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Work notes added to ${incidentNumber}" -ForegroundColor Green
        Write-Host "  Type: ${isPublic ? 'Customer Visible' : 'Internal Work Notes'}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Incident not found: ${incidentNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Failed to add work notes: $_"
}`;
    },
    isPremium: true
  },

  // ==================== CHANGE MANAGEMENT ====================
  {
    id: 'snow-create-change-request',
    name: 'Create Change Request',
    category: 'Change Management',
    description: 'Create a new change request',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'shortDescription', label: 'Short Description', type: 'text', required: true },
      { id: 'description', label: 'Detailed Description', type: 'textarea', required: true },
      { id: 'type', label: 'Change Type', type: 'select', required: true, options: ['Standard', 'Normal', 'Emergency'], defaultValue: 'Normal' },
      { id: 'category', label: 'Category', type: 'select', required: true, options: ['Hardware', 'Software', 'Network', 'Database', 'Other'], defaultValue: 'Software' },
      { id: 'assignmentGroup', label: 'Assignment Group', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const shortDescription = escapePowerShellString(params.shortDescription);
      const description = escapePowerShellString(params.description);
      const type = params.type.toLowerCase();
      const category = escapePowerShellString(params.category);
      const assignmentGroup = escapePowerShellString(params.assignmentGroup);

      return `# Create ServiceNow Change Request
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/change_request"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find assignment group
    $GroupUrl = "https://$Instance/api/now/table/sys_user_group?sysparm_query=name=${assignmentGroup}"
    $Group = Invoke-RestMethod -Uri $GroupUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    $Body = @{
        short_description = "${shortDescription}"
        description = "${description}"
        type = "${type}"
        category = "${category}"
        state = "-5"
    }

    if ($Group.result) {
        $Body["assignment_group"] = $Group.result[0].sys_id
    }

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body ($Body | ConvertTo-Json)

    Write-Host "✓ Change request created!" -ForegroundColor Green
    Write-Host "  Number: $($Response.result.number)" -ForegroundColor Cyan
    Write-Host "  Type: ${type}" -ForegroundColor Cyan
    Write-Host "  Category: ${category}" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to create change request: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-query-change-requests',
    name: 'Query Change Requests',
    category: 'Change Management',
    description: 'Query and filter change requests',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'state', label: 'State', type: 'select', required: true, options: ['New', 'Assess', 'Authorize', 'Scheduled', 'Implement', 'Review', 'Closed', 'Cancelled', 'All'], defaultValue: 'All' },
      { id: 'type', label: 'Change Type', type: 'select', required: false, options: ['Standard', 'Normal', 'Emergency', 'All'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const state = params.state;
      const type = params.type;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# Query ServiceNow Change Requests
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$StateMap = @{
    "New" = "-5"
    "Assess" = "-4"
    "Authorize" = "-3"
    "Scheduled" = "-2"
    "Implement" = "-1"
    "Review" = "0"
    "Closed" = "3"
    "Cancelled" = "4"
}

try {
    $Query = @()
${state !== 'All' ? `    $Query += "state=$($StateMap['${state}'])"` : ''}
${type !== 'All' ? `    $Query += "type=${type.toLowerCase()}"` : ''}

    $QueryString = if ($Query.Count -gt 0) { "?sysparm_query=" + ($Query -join "^") } else { "" }
    $ApiUrl = "https://$Instance/api/now/table/change_request$QueryString"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $Changes = $Response.result | Select-Object \`
        number,
        short_description,
        type,
        state,
        category,
        assignment_group,
        start_date,
        end_date,
        sys_created_on

    Write-Host "Found $($Changes.Count) change requests" -ForegroundColor Cyan
    $Changes | Format-Table -AutoSize

${exportPath ? `    $Changes | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green` : ''}

} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-approve-change',
    name: 'Approve Change Request',
    category: 'Change Management',
    description: 'Approve a pending change request',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'changeNumber', label: 'Change Number', type: 'text', required: true, placeholder: 'CHG0010001' },
      { id: 'approvalComments', label: 'Approval Comments', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const changeNumber = escapePowerShellString(params.changeNumber);
      const approvalComments = escapePowerShellString(params.approvalComments);

      return `# Approve ServiceNow Change Request
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find change request
    $SearchUrl = "https://$Instance/api/now/table/change_request?sysparm_query=number=${changeNumber}"
    $Change = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Change.result) {
        $ChangeId = $Change.result[0].sys_id

        # Find pending approval
        $ApprovalUrl = "https://$Instance/api/now/table/sysapproval_approver?sysparm_query=sysapproval=$ChangeId^state=requested"
        $Approval = Invoke-RestMethod -Uri $ApprovalUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Approval.result) {
            $ApprovalId = $Approval.result[0].sys_id
            $UpdateUrl = "https://$Instance/api/now/table/sysapproval_approver/$ApprovalId"

            $Body = @{
                state = "approved"
                comments = "${approvalComments}"
            } | ConvertTo-Json

            Invoke-RestMethod -Uri $UpdateUrl \`
                -Method Patch \`
                -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body

            Write-Host "✓ Change ${changeNumber} approved!" -ForegroundColor Green
            Write-Host "  Comments: ${approvalComments}" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ No pending approval found for ${changeNumber}" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Change request not found: ${changeNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Approval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-reject-change',
    name: 'Reject Change Request',
    category: 'Change Management',
    description: 'Reject a pending change request',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'changeNumber', label: 'Change Number', type: 'text', required: true, placeholder: 'CHG0010001' },
      { id: 'rejectionReason', label: 'Rejection Reason', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const changeNumber = escapePowerShellString(params.changeNumber);
      const rejectionReason = escapePowerShellString(params.rejectionReason);

      return `# Reject ServiceNow Change Request
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find change request
    $SearchUrl = "https://$Instance/api/now/table/change_request?sysparm_query=number=${changeNumber}"
    $Change = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Change.result) {
        $ChangeId = $Change.result[0].sys_id

        # Find pending approval
        $ApprovalUrl = "https://$Instance/api/now/table/sysapproval_approver?sysparm_query=sysapproval=$ChangeId^state=requested"
        $Approval = Invoke-RestMethod -Uri $ApprovalUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Approval.result) {
            $ApprovalId = $Approval.result[0].sys_id
            $UpdateUrl = "https://$Instance/api/now/table/sysapproval_approver/$ApprovalId"

            $Body = @{
                state = "rejected"
                comments = "${rejectionReason}"
            } | ConvertTo-Json

            Invoke-RestMethod -Uri $UpdateUrl \`
                -Method Patch \`
                -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body

            Write-Host "✓ Change ${changeNumber} rejected!" -ForegroundColor Red
            Write-Host "  Reason: ${rejectionReason}" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ No pending approval found for ${changeNumber}" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Change request not found: ${changeNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Rejection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-schedule-change',
    name: 'Schedule Change Implementation',
    category: 'Change Management',
    description: 'Schedule a change request for implementation',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'changeNumber', label: 'Change Number', type: 'text', required: true, placeholder: 'CHG0010001' },
      { id: 'startDate', label: 'Planned Start Date', type: 'text', required: true, placeholder: '2024-01-15 22:00:00' },
      { id: 'endDate', label: 'Planned End Date', type: 'text', required: true, placeholder: '2024-01-15 23:00:00' },
      { id: 'implementationPlan', label: 'Implementation Plan', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const changeNumber = escapePowerShellString(params.changeNumber);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const implementationPlan = escapePowerShellString(params.implementationPlan);

      return `# Schedule ServiceNow Change Request
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find change request
    $SearchUrl = "https://$Instance/api/now/table/change_request?sysparm_query=number=${changeNumber}"
    $Change = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Change.result) {
        $ChangeId = $Change.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/change_request/$ChangeId"

        $Body = @{
            start_date = "${startDate}"
            end_date = "${endDate}"
            implementation_plan = "${implementationPlan}"
            state = "-2"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Change ${changeNumber} scheduled!" -ForegroundColor Green
        Write-Host "  Start: ${startDate}" -ForegroundColor Cyan
        Write-Host "  End: ${endDate}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Change request not found: ${changeNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Scheduling failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-schedule-cab-meeting',
    name: 'Schedule CAB Meeting',
    category: 'Change Management',
    description: 'Schedule a Change Advisory Board meeting',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'meetingName', label: 'Meeting Name', type: 'text', required: true, placeholder: 'Weekly CAB Review' },
      { id: 'startDateTime', label: 'Start Date/Time', type: 'text', required: true, placeholder: '2024-01-15 14:00:00' },
      { id: 'endDateTime', label: 'End Date/Time', type: 'text', required: true, placeholder: '2024-01-15 15:00:00' },
      { id: 'agenda', label: 'Meeting Agenda', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const meetingName = escapePowerShellString(params.meetingName);
      const startDateTime = escapePowerShellString(params.startDateTime);
      const endDateTime = escapePowerShellString(params.endDateTime);
      const agenda = escapePowerShellString(params.agenda);

      return `# Schedule ServiceNow CAB Meeting
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/cab_meeting"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        name = "${meetingName}"
        start_date = "${startDateTime}"
        end_date = "${endDateTime}"
        agenda = "${agenda}"
        state = "scheduled"
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body

    Write-Host "✓ CAB meeting scheduled!" -ForegroundColor Green
    Write-Host "  Name: ${meetingName}" -ForegroundColor Cyan
    Write-Host "  Start: ${startDateTime}" -ForegroundColor Cyan
    Write-Host "  End: ${endDateTime}" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to schedule CAB meeting: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-close-change',
    name: 'Close Change Request',
    category: 'Change Management',
    description: 'Close a completed change request',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'changeNumber', label: 'Change Number', type: 'text', required: true, placeholder: 'CHG0010001' },
      { id: 'closeCode', label: 'Close Code', type: 'select', required: true, options: ['Successful', 'Successful with issues', 'Unsuccessful', 'Cancelled'], defaultValue: 'Successful' },
      { id: 'closeNotes', label: 'Close Notes', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const changeNumber = escapePowerShellString(params.changeNumber);
      const closeCode = escapePowerShellString(params.closeCode);
      const closeNotes = escapePowerShellString(params.closeNotes);

      return `# Close ServiceNow Change Request
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find change request
    $SearchUrl = "https://$Instance/api/now/table/change_request?sysparm_query=number=${changeNumber}"
    $Change = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Change.result) {
        $ChangeId = $Change.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/change_request/$ChangeId"

        $Body = @{
            state = "3"
            close_code = "${closeCode}"
            close_notes = "${closeNotes}"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Change ${changeNumber} closed!" -ForegroundColor Green
        Write-Host "  Close Code: ${closeCode}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Change request not found: ${changeNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Failed to close change: $_"
}`;
    },
    isPremium: true
  },

  // ==================== PROBLEM MANAGEMENT ====================
  {
    id: 'snow-create-problem',
    name: 'Create Problem',
    category: 'Problem Management',
    description: 'Create a new problem record',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'shortDescription', label: 'Short Description', type: 'text', required: true },
      { id: 'description', label: 'Detailed Description', type: 'textarea', required: true },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low'], defaultValue: '3 - Moderate' },
      { id: 'assignmentGroup', label: 'Assignment Group', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const shortDescription = escapePowerShellString(params.shortDescription);
      const description = escapePowerShellString(params.description);
      const priority = params.priority.split(' - ')[0];
      const assignmentGroup = escapePowerShellString(params.assignmentGroup);

      return `# Create ServiceNow Problem
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/problem"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find assignment group
    $GroupUrl = "https://$Instance/api/now/table/sys_user_group?sysparm_query=name=${assignmentGroup}"
    $Group = Invoke-RestMethod -Uri $GroupUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    $Body = @{
        short_description = "${shortDescription}"
        description = "${description}"
        priority = "${priority}"
        state = "1"
    }

    if ($Group.result) {
        $Body["assignment_group"] = $Group.result[0].sys_id
    }

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body ($Body | ConvertTo-Json)

    Write-Host "✓ Problem created!" -ForegroundColor Green
    Write-Host "  Number: $($Response.result.number)" -ForegroundColor Cyan
    Write-Host "  Priority: ${priority}" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to create problem: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-query-problems',
    name: 'Query Problems',
    category: 'Problem Management',
    description: 'Query and filter problem records',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'state', label: 'State', type: 'select', required: true, options: ['New', 'Assess', 'Root Cause Analysis', 'Fix in Progress', 'Resolved', 'Closed', 'All'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const state = params.state;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# Query ServiceNow Problems
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$StateMap = @{
    "New" = "1"
    "Assess" = "101"
    "Root Cause Analysis" = "102"
    "Fix in Progress" = "103"
    "Resolved" = "104"
    "Closed" = "3"
}

try {
${state !== 'All' ? `    $Query = "?sysparm_query=state=$($StateMap['${state}'])"` : `    $Query = ""`}
    $ApiUrl = "https://$Instance/api/now/table/problem$Query"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $Problems = $Response.result | Select-Object \`
        number,
        short_description,
        state,
        priority,
        assignment_group,
        known_error,
        opened_at,
        sys_updated_on

    Write-Host "Found $($Problems.Count) problems" -ForegroundColor Cyan
    $Problems | Format-Table -AutoSize

${exportPath ? `    $Problems | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green` : ''}

} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-update-problem-rca',
    name: 'Update Problem Root Cause',
    category: 'Problem Management',
    description: 'Update a problem with root cause analysis',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'problemNumber', label: 'Problem Number', type: 'text', required: true, placeholder: 'PRB0010001' },
      { id: 'rootCause', label: 'Root Cause', type: 'textarea', required: true },
      { id: 'workaround', label: 'Workaround', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const problemNumber = escapePowerShellString(params.problemNumber);
      const rootCause = escapePowerShellString(params.rootCause);
      const workaround = params.workaround ? escapePowerShellString(params.workaround) : '';

      return `# Update ServiceNow Problem Root Cause
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find problem by number
    $SearchUrl = "https://$Instance/api/now/table/problem?sysparm_query=number=${problemNumber}"
    $Problem = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Problem.result) {
        $ProblemId = $Problem.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/problem/$ProblemId"

        $Body = @{
            cause_notes = "${rootCause}"
            state = "103"
${workaround ? `            workaround = "${workaround}"` : ''}
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Problem ${problemNumber} updated with root cause!" -ForegroundColor Green
        Write-Host "  Root Cause: ${rootCause}" -ForegroundColor Cyan
${workaround ? `        Write-Host "  Workaround: ${workaround}" -ForegroundColor Cyan` : ''}
    } else {
        Write-Host "⚠ Problem not found: ${problemNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-create-known-error',
    name: 'Create Known Error',
    category: 'Problem Management',
    description: 'Mark a problem as a known error with workaround',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'problemNumber', label: 'Problem Number', type: 'text', required: true, placeholder: 'PRB0010001' },
      { id: 'workaround', label: 'Workaround', type: 'textarea', required: true },
      { id: 'knowledgeArticle', label: 'Knowledge Article Number (optional)', type: 'text', required: false, placeholder: 'KB0010001' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const problemNumber = escapePowerShellString(params.problemNumber);
      const workaround = escapePowerShellString(params.workaround);
      const knowledgeArticle = params.knowledgeArticle ? escapePowerShellString(params.knowledgeArticle) : '';

      return `# Create ServiceNow Known Error
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find problem by number
    $SearchUrl = "https://$Instance/api/now/table/problem?sysparm_query=number=${problemNumber}"
    $Problem = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Problem.result) {
        $ProblemId = $Problem.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/problem/$ProblemId"

        $Body = @{
            known_error = "true"
            workaround = "${workaround}"
${knowledgeArticle ? `            work_notes = "Known Error documented. Related KB: ${knowledgeArticle}"` : ''}
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Problem ${problemNumber} marked as Known Error!" -ForegroundColor Green
        Write-Host "  Workaround documented" -ForegroundColor Cyan
${knowledgeArticle ? `        Write-Host "  Related KB: ${knowledgeArticle}" -ForegroundColor Cyan` : ''}
    } else {
        Write-Host "⚠ Problem not found: ${problemNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Failed to create known error: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-link-incidents-to-problem',
    name: 'Link Incidents to Problem',
    category: 'Problem Management',
    description: 'Link multiple incidents to a problem record',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'problemNumber', label: 'Problem Number', type: 'text', required: true, placeholder: 'PRB0010001' },
      { id: 'incidentNumbers', label: 'Incident Numbers (comma-separated)', type: 'text', required: true, placeholder: 'INC0010001, INC0010002, INC0010003' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const problemNumber = escapePowerShellString(params.problemNumber);
      const incidentNumbers = params.incidentNumbers.split(',').map((i: string) => i.trim());

      return `# Link Incidents to ServiceNow Problem
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$IncidentNumbers = @(
${incidentNumbers.map((i: string) => `    "${escapePowerShellString(i)}"`).join(',\n')}
)

try {
    # Find problem by number
    $ProblemUrl = "https://$Instance/api/now/table/problem?sysparm_query=number=${problemNumber}"
    $Problem = Invoke-RestMethod -Uri $ProblemUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($Problem.result) {
        $ProblemId = $Problem.result[0].sys_id
        $LinkedCount = 0

        foreach ($IncNumber in $IncidentNumbers) {
            # Find incident
            $IncUrl = "https://$Instance/api/now/table/incident?sysparm_query=number=$IncNumber"
            $Incident = Invoke-RestMethod -Uri $IncUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

            if ($Incident.result) {
                $IncId = $Incident.result[0].sys_id
                $UpdateUrl = "https://$Instance/api/now/table/incident/$IncId"

                $Body = @{
                    problem_id = $ProblemId
                } | ConvertTo-Json

                Invoke-RestMethod -Uri $UpdateUrl \`
                    -Method Patch \`
                    -Credential $Credential \`
                    -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                    -Body $Body

                Write-Host "✓ Linked $IncNumber to ${problemNumber}" -ForegroundColor Green
                $LinkedCount++
            } else {
                Write-Host "⚠ Incident not found: $IncNumber" -ForegroundColor Yellow
            }
        }

        Write-Host ""
        Write-Host "Linked $LinkedCount incidents to problem ${problemNumber}" -ForegroundColor Green
    } else {
        Write-Host "⚠ Problem not found: ${problemNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Linking failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-resolve-problem',
    name: 'Resolve Problem',
    category: 'Problem Management',
    description: 'Resolve a problem with fix details',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'problemNumber', label: 'Problem Number', type: 'text', required: true, placeholder: 'PRB0010001' },
      { id: 'fixNotes', label: 'Fix Notes', type: 'textarea', required: true },
      { id: 'resolutionCode', label: 'Resolution Code', type: 'select', required: true, options: ['Fix Applied', 'Risk Accepted', 'Canceled', 'Duplicate'], defaultValue: 'Fix Applied' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const problemNumber = escapePowerShellString(params.problemNumber);
      const fixNotes = escapePowerShellString(params.fixNotes);
      const resolutionCode = escapePowerShellString(params.resolutionCode);

      return `# Resolve ServiceNow Problem
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find problem by number
    $SearchUrl = "https://$Instance/api/now/table/problem?sysparm_query=number=${problemNumber}"
    $Problem = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($Problem.result) {
        $ProblemId = $Problem.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/problem/$ProblemId"

        $Body = @{
            state = "104"
            fix_notes = "${fixNotes}"
            resolution_code = "${resolutionCode}"
            resolved_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Problem ${problemNumber} resolved!" -ForegroundColor Green
        Write-Host "  Resolution Code: ${resolutionCode}" -ForegroundColor Cyan
        Write-Host "  Fix Notes: ${fixNotes}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Problem not found: ${problemNumber}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Resolution failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== CMDB MANAGEMENT ====================
  {
    id: 'snow-create-ci',
    name: 'Create Configuration Item',
    category: 'CMDB Management',
    description: 'Create a new CI in the CMDB',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciClass', label: 'CI Class', type: 'select', required: true, options: ['cmdb_ci_server', 'cmdb_ci_computer', 'cmdb_ci_win_server', 'cmdb_ci_linux_server', 'cmdb_ci_netgear', 'cmdb_ci_app_server'], defaultValue: 'cmdb_ci_server' },
      { id: 'name', label: 'CI Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: false, placeholder: '192.168.1.100' },
      { id: 'serialNumber', label: 'Serial Number', type: 'text', required: false },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, placeholder: 'Dell' },
      { id: 'operationalStatus', label: 'Operational Status', type: 'select', required: true, options: ['Operational', 'Non-Operational', 'Repair in Progress', 'Retired'], defaultValue: 'Operational' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const ciClass = params.ciClass;
      const name = escapePowerShellString(params.name);
      const ipAddress = params.ipAddress ? escapePowerShellString(params.ipAddress) : '';
      const serialNumber = params.serialNumber ? escapePowerShellString(params.serialNumber) : '';
      const manufacturer = params.manufacturer ? escapePowerShellString(params.manufacturer) : '';
      const operationalStatus = params.operationalStatus;

      const statusMap: Record<string, string> = {
        'Operational': '1',
        'Non-Operational': '2',
        'Repair in Progress': '3',
        'Retired': '6'
      };

      return `# Create ServiceNow Configuration Item
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/${ciClass}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        name = "${name}"
        operational_status = "${statusMap[operationalStatus]}"
${ipAddress ? `        ip_address = "${ipAddress}"` : ''}
${serialNumber ? `        serial_number = "${serialNumber}"` : ''}
${manufacturer ? `        manufacturer = "${manufacturer}"` : ''}
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body

    Write-Host "✓ CI created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${name}" -ForegroundColor Cyan
    Write-Host "  Class: ${ciClass}" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to create CI: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-update-cmdb',
    name: 'Update CMDB Record',
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
    },
    isPremium: true
  },
  {
    id: 'snow-query-cmdb',
    name: 'Query CMDB Assets',
    category: 'CMDB Management',
    description: 'Query CMDB for assets and their relationships',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciClass', label: 'CI Class', type: 'select', required: true, options: ['cmdb_ci_server', 'cmdb_ci_computer', 'cmdb_ci_netgear', 'cmdb_ci_app_server', 'cmdb_ci'], defaultValue: 'cmdb_ci' },
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
    id: 'snow-create-ci-relationship',
    name: 'Create CI Relationship',
    category: 'CMDB Management',
    description: 'Create a relationship between two CIs',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'parentCI', label: 'Parent CI Name', type: 'text', required: true, placeholder: 'APP-SERVER-01' },
      { id: 'childCI', label: 'Child CI Name', type: 'text', required: true, placeholder: 'DB-SERVER-01' },
      { id: 'relationshipType', label: 'Relationship Type', type: 'select', required: true, options: ['Depends on', 'Used by', 'Runs on', 'Contains', 'Hosted on', 'Connected to'], defaultValue: 'Depends on' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const parentCI = escapePowerShellString(params.parentCI);
      const childCI = escapePowerShellString(params.childCI);
      const relationshipType = escapePowerShellString(params.relationshipType);

      return `# Create ServiceNow CI Relationship
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find parent CI
    $ParentUrl = "https://$Instance/api/now/table/cmdb_ci?sysparm_query=name=${parentCI}"
    $Parent = Invoke-RestMethod -Uri $ParentUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    # Find child CI
    $ChildUrl = "https://$Instance/api/now/table/cmdb_ci?sysparm_query=name=${childCI}"
    $Child = Invoke-RestMethod -Uri $ChildUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($Parent.result -and $Child.result) {
        $ParentId = $Parent.result[0].sys_id
        $ChildId = $Child.result[0].sys_id

        # Find relationship type
        $TypeUrl = "https://$Instance/api/now/table/cmdb_rel_type?sysparm_query=name=${relationshipType}"
        $Type = Invoke-RestMethod -Uri $TypeUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Type.result) {
            $TypeId = $Type.result[0].sys_id

            $RelUrl = "https://$Instance/api/now/table/cmdb_rel_ci"
            $Body = @{
                parent = $ParentId
                child = $ChildId
                type = $TypeId
            } | ConvertTo-Json

            $Response = Invoke-RestMethod -Uri $RelUrl \`
                -Method Post \`
                -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body

            Write-Host "✓ Relationship created!" -ForegroundColor Green
            Write-Host "  ${parentCI} ${relationshipType} ${childCI}" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ Relationship type not found: ${relationshipType}" -ForegroundColor Yellow
        }
    } else {
        if (-not $Parent.result) { Write-Host "⚠ Parent CI not found: ${parentCI}" -ForegroundColor Yellow }
        if (-not $Child.result) { Write-Host "⚠ Child CI not found: ${childCI}" -ForegroundColor Yellow }
    }

} catch {
    Write-Error "Failed to create relationship: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-query-ci-relationships',
    name: 'Query CI Relationships',
    category: 'CMDB Management',
    description: 'Query relationships for a specific CI',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciName', label: 'CI Name', type: 'text', required: true, placeholder: 'APP-SERVER-01' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const ciName = escapePowerShellString(params.ciName);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';

      return `# Query ServiceNow CI Relationships
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find CI
    $CIUrl = "https://$Instance/api/now/table/cmdb_ci?sysparm_query=name=${ciName}"
    $CI = Invoke-RestMethod -Uri $CIUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($CI.result) {
        $CIId = $CI.result[0].sys_id

        # Get outbound relationships (this CI as parent)
        $OutboundUrl = "https://$Instance/api/now/table/cmdb_rel_ci?sysparm_query=parent=$CIId"
        $Outbound = Invoke-RestMethod -Uri $OutboundUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        # Get inbound relationships (this CI as child)
        $InboundUrl = "https://$Instance/api/now/table/cmdb_rel_ci?sysparm_query=child=$CIId"
        $Inbound = Invoke-RestMethod -Uri $InboundUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        $AllRelationships = @()

        foreach ($Rel in $Outbound.result) {
            $AllRelationships += [PSCustomObject]@{
                Direction = "Outbound"
                RelatedCI = $Rel.child.display_value
                RelationshipType = $Rel.type.display_value
            }
        }

        foreach ($Rel in $Inbound.result) {
            $AllRelationships += [PSCustomObject]@{
                Direction = "Inbound"
                RelatedCI = $Rel.parent.display_value
                RelationshipType = $Rel.type.display_value
            }
        }

        Write-Host "Relationships for ${ciName}:" -ForegroundColor Cyan
        $AllRelationships | Format-Table -AutoSize

${exportPath ? `        $AllRelationships | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green` : ''}
    } else {
        Write-Host "⚠ CI not found: ${ciName}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-retire-ci',
    name: 'Retire Configuration Item',
    category: 'CMDB Management',
    description: 'Retire a CI from the CMDB',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciName', label: 'CI Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'retirementReason', label: 'Retirement Reason', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const ciName = escapePowerShellString(params.ciName);
      const retirementReason = escapePowerShellString(params.retirementReason);

      return `# Retire ServiceNow Configuration Item
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

        $Body = @{
            operational_status = "6"
            install_status = "7"
            comments = "RETIRED: ${retirementReason}"
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ CI '${ciName}' retired" -ForegroundColor Green
        Write-Host "  Reason: ${retirementReason}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ CI not found: ${ciName}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Retirement failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-cmdb-reconciliation',
    name: 'CMDB Reconciliation Report',
    category: 'CMDB Management',
    description: 'Generate CMDB reconciliation report for orphaned or stale CIs',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'staleDays', label: 'Days Since Last Update (Stale)', type: 'number', required: true, defaultValue: 90 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\CMDB-Reconciliation.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const staleDays = params.staleDays || 90;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# CMDB Reconciliation Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $StaleDate = (Get-Date).AddDays(-${staleDays}).ToString("yyyy-MM-dd")
    $Query = "sys_updated_on<$StaleDate^operational_status!=6"
    $ApiUrl = "https://$Instance/api/now/table/cmdb_ci?sysparm_query=$Query"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $StaleCIs = $Response.result | Select-Object \`
        name,
        sys_class_name,
        ip_address,
        operational_status,
        @{N='DaysSinceUpdate';E={
            ((Get-Date) - [DateTime]::Parse($_.sys_updated_on)).Days
        }},
        sys_updated_on,
        managed_by,
        owned_by

    Write-Host "CMDB Reconciliation Report" -ForegroundColor Cyan
    Write-Host "Stale CIs (not updated in ${staleDays}+ days): $($StaleCIs.Count)" -ForegroundColor Yellow

    $StaleCIs | Format-Table name, sys_class_name, DaysSinceUpdate, operational_status -AutoSize

    $StaleCIs | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Report exported to: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "Reconciliation report failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== USER MANAGEMENT ====================
  {
    id: 'snow-create-user',
    name: 'Create User',
    category: 'User Management',
    description: 'Create a new user in ServiceNow',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'userName', label: 'Username', type: 'text', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'department', label: 'Department', type: 'text', required: false },
      { id: 'title', label: 'Job Title', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const userName = escapePowerShellString(params.userName);
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const email = escapePowerShellString(params.email);
      const department = params.department ? escapePowerShellString(params.department) : '';
      const title = params.title ? escapePowerShellString(params.title) : '';

      return `# Create ServiceNow User
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/sys_user"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        user_name = "${userName}"
        first_name = "${firstName}"
        last_name = "${lastName}"
        email = "${email}"
        active = "true"
${department ? `        department = "${department}"` : ''}
${title ? `        title = "${title}"` : ''}
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body

    Write-Host "✓ User created successfully!" -ForegroundColor Green
    Write-Host "  Username: ${userName}" -ForegroundColor Cyan
    Write-Host "  Name: ${firstName} ${lastName}" -ForegroundColor Cyan
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to create user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-deactivate-user',
    name: 'Deactivate User',
    category: 'User Management',
    description: 'Deactivate a user account',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'userName', label: 'Username', type: 'text', required: true },
      { id: 'deactivationReason', label: 'Deactivation Reason', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const userName = escapePowerShellString(params.userName);
      const deactivationReason = escapePowerShellString(params.deactivationReason);

      return `# Deactivate ServiceNow User
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find user
    $SearchUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${userName}"
    $User = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    if ($User.result) {
        $UserId = $User.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/sys_user/$UserId"

        $Body = @{
            active = "false"
            locked_out = "true"
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ User '${userName}' deactivated" -ForegroundColor Green
        Write-Host "  Reason: ${deactivationReason}" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ User not found: ${userName}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Deactivation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-assign-role',
    name: 'Assign Role to User',
    category: 'User Management',
    description: 'Assign a role to a user',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'userName', label: 'Username', type: 'text', required: true },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'itil' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const userName = escapePowerShellString(params.userName);
      const roleName = escapePowerShellString(params.roleName);

      return `# Assign Role to ServiceNow User
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find user
    $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${userName}"
    $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($User.result) {
        $UserId = $User.result[0].sys_id

        # Find role
        $RoleUrl = "https://$Instance/api/now/table/sys_user_role?sysparm_query=name=${roleName}"
        $Role = Invoke-RestMethod -Uri $RoleUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Role.result) {
            $RoleId = $Role.result[0].sys_id

            # Assign role
            $AssignUrl = "https://$Instance/api/now/table/sys_user_has_role"
            $Body = @{
                user = $UserId
                role = $RoleId
            } | ConvertTo-Json

            Invoke-RestMethod -Uri $AssignUrl \`
                -Method Post \`
                -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body

            Write-Host "✓ Role '${roleName}' assigned to user '${userName}'" -ForegroundColor Green
        } else {
            Write-Host "⚠ Role not found: ${roleName}" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ User not found: ${userName}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Role assignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-remove-role',
    name: 'Remove Role from User',
    category: 'User Management',
    description: 'Remove a role from a user',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'userName', label: 'Username', type: 'text', required: true },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'itil' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const userName = escapePowerShellString(params.userName);
      const roleName = escapePowerShellString(params.roleName);

      return `# Remove Role from ServiceNow User
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find user
    $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${userName}"
    $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($User.result) {
        $UserId = $User.result[0].sys_id

        # Find role
        $RoleUrl = "https://$Instance/api/now/table/sys_user_role?sysparm_query=name=${roleName}"
        $Role = Invoke-RestMethod -Uri $RoleUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Role.result) {
            $RoleId = $Role.result[0].sys_id

            # Find assignment
            $SearchUrl = "https://$Instance/api/now/table/sys_user_has_role?sysparm_query=user=$UserId^role=$RoleId"
            $Assignment = Invoke-RestMethod -Uri $SearchUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

            if ($Assignment.result) {
                $DeleteUrl = "https://$Instance/api/now/table/sys_user_has_role/$($Assignment.result[0].sys_id)"
                Invoke-RestMethod -Uri $DeleteUrl -Method Delete -Credential $Credential -Headers @{"Accept"="application/json"}
                Write-Host "✓ Role '${roleName}' removed from user '${userName}'" -ForegroundColor Green
            } else {
                Write-Host "⚠ User does not have role: ${roleName}" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠ Role not found: ${roleName}" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ User not found: ${userName}" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Role removal failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-add-user-to-group',
    name: 'Add User to Group',
    category: 'User Management',
    description: 'Add a user to a group',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'userName', label: 'Username', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Service Desk' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const userName = escapePowerShellString(params.userName);
      const groupName = escapePowerShellString(params.groupName);

      return `# Add User to ServiceNow Group
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find user
    $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${userName}"
    $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    # Find group
    $GroupUrl = "https://$Instance/api/now/table/sys_user_group?sysparm_query=name=${groupName}"
    $Group = Invoke-RestMethod -Uri $GroupUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($User.result -and $Group.result) {
        $UserId = $User.result[0].sys_id
        $GroupId = $Group.result[0].sys_id

        $MemberUrl = "https://$Instance/api/now/table/sys_user_grmember"
        $Body = @{
            user = $UserId
            group = $GroupId
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $MemberUrl \`
            -Method Post \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ User '${userName}' added to group '${groupName}'" -ForegroundColor Green
    } else {
        if (-not $User.result) { Write-Host "⚠ User not found: ${userName}" -ForegroundColor Yellow }
        if (-not $Group.result) { Write-Host "⚠ Group not found: ${groupName}" -ForegroundColor Yellow }
    }

} catch {
    Write-Error "Failed to add user to group: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-create-group',
    name: 'Create Group',
    category: 'User Management',
    description: 'Create a new user group',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'IT-Support-Team' },
      { id: 'description', label: 'Group Description', type: 'text', required: true },
      { id: 'groupType', label: 'Group Type', type: 'text', required: false, placeholder: 'Support' },
      { id: 'manager', label: 'Manager (username)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const groupName = escapePowerShellString(params.groupName);
      const description = escapePowerShellString(params.description);
      const groupType = params.groupType ? escapePowerShellString(params.groupType) : '';
      const manager = params.manager ? escapePowerShellString(params.manager) : '';

      return `# Create ServiceNow Group
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/sys_user_group"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        name = "${groupName}"
        description = "${description}"
        active = "true"
${groupType ? `        type = "${groupType}"` : ''}
    }

${manager ? `    # Find manager
    $ManagerUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${manager}"
    $Manager = Invoke-RestMethod -Uri $ManagerUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}
    if ($Manager.result) {
        $Body["manager"] = $Manager.result[0].sys_id
    }` : ''}

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body ($Body | ConvertTo-Json)

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
    id: 'snow-set-user-delegate',
    name: 'Set User Delegate',
    category: 'User Management',
    description: 'Set approval delegation for a user',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'userName', label: 'User (delegator)', type: 'text', required: true },
      { id: 'delegateTo', label: 'Delegate To (username)', type: 'text', required: true },
      { id: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: '2024-01-15' },
      { id: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: '2024-01-22' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const userName = escapePowerShellString(params.userName);
      const delegateTo = escapePowerShellString(params.delegateTo);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);

      return `# Set ServiceNow User Delegate
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find user
    $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${userName}"
    $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    # Find delegate
    $DelegateUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${delegateTo}"
    $Delegate = Invoke-RestMethod -Uri $DelegateUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    if ($User.result -and $Delegate.result) {
        $UserId = $User.result[0].sys_id
        $DelegateId = $Delegate.result[0].sys_id

        $ApiUrl = "https://$Instance/api/now/table/sys_user_delegate"
        $Body = @{
            user = $UserId
            delegate = $DelegateId
            starts = "${startDate}"
            ends = "${endDate}"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri $ApiUrl \`
            -Method Post \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body

        Write-Host "✓ Delegation set!" -ForegroundColor Green
        Write-Host "  ${userName} delegated to ${delegateTo}" -ForegroundColor Cyan
        Write-Host "  Period: ${startDate} to ${endDate}" -ForegroundColor Cyan
    } else {
        if (-not $User.result) { Write-Host "⚠ User not found: ${userName}" -ForegroundColor Yellow }
        if (-not $Delegate.result) { Write-Host "⚠ Delegate not found: ${delegateTo}" -ForegroundColor Yellow }
    }

} catch {
    Write-Error "Delegation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-query-users',
    name: 'Query Users',
    category: 'User Management',
    description: 'Query and export user list',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'activeOnly', label: 'Active Users Only', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Users.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const activeOnly = params.activeOnly !== false;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Query ServiceNow Users
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
${activeOnly ? `    $Query = "?sysparm_query=active=true"` : `    $Query = ""`}
    $ApiUrl = "https://$Instance/api/now/table/sys_user$Query"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $Users = $Response.result | Select-Object \`
        user_name,
        first_name,
        last_name,
        email,
        title,
        department,
        active,
        locked_out,
        last_login_time,
        sys_created_on

    Write-Host "Found $($Users.Count) users" -ForegroundColor Cyan
    $Users | Format-Table user_name, first_name, last_name, email, active -AutoSize

    $Users | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== REPORTING ====================
  {
    id: 'snow-ticket-statistics',
    name: 'Ticket Statistics Report',
    category: 'Reporting',
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
    $ApiUrl = "https://$Instance/api/now/table/incident?sysparm_query=opened_at>=$StartDate"

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
    name: 'SLA Performance Metrics',
    category: 'Reporting',
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
    $ComplianceRate = if ($TotalSLAs -gt 0) { [Math]::Round((($TotalSLAs - $BreachedSLAs) / $TotalSLAs) * 100, 2) } else { 100 }

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
    name: 'Service Performance Report',
    category: 'Reporting',
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
    $IncidentUrl = "https://$Instance/api/now/table/incident?sysparm_query=opened_at>=javascript:gs.daysAgoStart(30)"
    $Incidents = Invoke-RestMethod -Uri $IncidentUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    $Report += "=== Service Performance Report ==="
    $Report += "Generated: $(Get-Date)"
    $Report += "Instance: ${instance}"
    $Report += "Report Type: ${reportType}"
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
    id: 'snow-assignment-group-workload',
    name: 'Assignment Group Workload Report',
    category: 'Reporting',
    description: 'Generate workload report by assignment group',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Group-Workload.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Assignment Group Workload Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Get all open incidents
    $ApiUrl = "https://$Instance/api/now/table/incident?sysparm_query=stateNOT IN7"
    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $GroupWorkload = $Response.result | Group-Object { $_.assignment_group.display_value } | Select-Object \`
        @{N='AssignmentGroup';E={if ($_.Name) { $_.Name } else { 'Unassigned' }}},
        @{N='OpenIncidents';E={$_.Count}},
        @{N='Critical';E={($_.Group | Where-Object priority -eq '1').Count}},
        @{N='High';E={($_.Group | Where-Object priority -eq '2').Count}},
        @{N='Moderate';E={($_.Group | Where-Object priority -eq '3').Count}},
        @{N='Low';E={($_.Group | Where-Object priority -eq '4').Count}}

    Write-Host "Assignment Group Workload:" -ForegroundColor Cyan
    $GroupWorkload | Sort-Object -Property OpenIncidents -Descending | Format-Table -AutoSize

    $GroupWorkload | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Workload report exported: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "Workload report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-incident-aging-report',
    name: 'Incident Aging Report',
    category: 'Reporting',
    description: 'Generate report of aging open incidents',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'agingDays', label: 'Aging Threshold (days)', type: 'number', required: true, defaultValue: 7 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Aging-Incidents.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const agingDays = params.agingDays || 7;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Incident Aging Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $AgingDate = (Get-Date).AddDays(-${agingDays}).ToString("yyyy-MM-dd")
    $Query = "stateNOT IN6,7^opened_at<=$AgingDate"
    $ApiUrl = "https://$Instance/api/now/table/incident?sysparm_query=$Query"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $AgingIncidents = $Response.result | Select-Object \`
        number,
        short_description,
        priority,
        @{N='Age_Days';E={
            ((Get-Date) - [DateTime]::Parse($_.opened_at)).Days
        }},
        state,
        @{N='AssignmentGroup';E={$_.assignment_group.display_value}},
        @{N='AssignedTo';E={$_.assigned_to.display_value}},
        opened_at

    Write-Host "Aging Incidents (${agingDays}+ days old):" -ForegroundColor Cyan
    Write-Host "Total: $($AgingIncidents.Count)" -ForegroundColor Yellow

    $AgingIncidents | Sort-Object -Property Age_Days -Descending | Format-Table number, short_description, Age_Days, priority -AutoSize

    $AgingIncidents | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Aging report exported: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "Aging report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-change-calendar-report',
    name: 'Change Calendar Report',
    category: 'Reporting',
    description: 'Generate upcoming changes calendar report',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'daysAhead', label: 'Days Ahead', type: 'number', required: true, defaultValue: 14 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Change-Calendar.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const daysAhead = params.daysAhead || 14;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Change Calendar Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Today = (Get-Date).ToString("yyyy-MM-dd")
    $FutureDate = (Get-Date).AddDays(${daysAhead}).ToString("yyyy-MM-dd")
    $Query = "start_date>=$Today^start_date<=$FutureDate^stateIN-2,-1"
    $ApiUrl = "https://$Instance/api/now/table/change_request?sysparm_query=$Query"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $UpcomingChanges = $Response.result | Select-Object \`
        number,
        short_description,
        type,
        @{N='ScheduledStart';E={$_.start_date}},
        @{N='ScheduledEnd';E={$_.end_date}},
        @{N='AssignmentGroup';E={$_.assignment_group.display_value}},
        category,
        risk

    Write-Host "Upcoming Changes (Next ${daysAhead} Days):" -ForegroundColor Cyan
    Write-Host "Total: $($UpcomingChanges.Count)" -ForegroundColor Green

    $UpcomingChanges | Sort-Object -Property ScheduledStart | Format-Table number, short_description, ScheduledStart, type -AutoSize

    $UpcomingChanges | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Change calendar exported: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "Change calendar report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-mttr-report',
    name: 'Mean Time to Resolve Report',
    category: 'Reporting',
    description: 'Calculate Mean Time to Resolve (MTTR) metrics',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'days', label: 'Days to Analyze', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\MTTR-Report.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Mean Time to Resolve (MTTR) Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $StartDate = (Get-Date).AddDays(-${days}).ToString("yyyy-MM-dd")
    $Query = "stateIN6,7^resolved_at>=$StartDate"
    $ApiUrl = "https://$Instance/api/now/table/incident?sysparm_query=$Query"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $ResolvedIncidents = $Response.result | Select-Object \`
        number,
        priority,
        @{N='TimeToResolve_Hours';E={
            if ($_.resolved_at -and $_.opened_at) {
                [Math]::Round(([DateTime]::Parse($_.resolved_at) - [DateTime]::Parse($_.opened_at)).TotalHours, 2)
            } else { 0 }
        }},
        opened_at,
        resolved_at

    $MTTRByPriority = $ResolvedIncidents | Group-Object priority | Select-Object \`
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
        @{N='MTTR_Hours';E={[Math]::Round(($_.Group | Measure-Object -Property TimeToResolve_Hours -Average).Average, 2)}}

    Write-Host "MTTR Report (Last ${days} Days):" -ForegroundColor Cyan
    $MTTRByPriority | Format-Table -AutoSize

    $MTTRByPriority | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ MTTR report exported: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "MTTR report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-scheduled-report',
    name: 'Create Scheduled Report',
    category: 'Reporting',
    description: 'Create a scheduled report definition',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'reportName', label: 'Report Name', type: 'text', required: true, placeholder: 'Weekly Incident Summary' },
      { id: 'reportTable', label: 'Report Table', type: 'select', required: true, options: ['incident', 'change_request', 'problem', 'sc_request'], defaultValue: 'incident' },
      { id: 'recipients', label: 'Email Recipients (comma-separated)', type: 'text', required: true, placeholder: 'admin@company.com, manager@company.com' },
      { id: 'frequency', label: 'Frequency', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Weekly' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const reportName = escapePowerShellString(params.reportName);
      const reportTable = params.reportTable;
      const recipients = escapePowerShellString(params.recipients);
      const frequency = params.frequency.toLowerCase();

      return `# Create ServiceNow Scheduled Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/sysauto_report"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        name = "${reportName}"
        table = "${reportTable}"
        run = "${frequency}"
        recipients = "${recipients}"
        active = "true"
        run_time = "06:00:00"
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body

    Write-Host "✓ Scheduled report created!" -ForegroundColor Green
    Write-Host "  Name: ${reportName}" -ForegroundColor Cyan
    Write-Host "  Table: ${reportTable}" -ForegroundColor Cyan
    Write-Host "  Frequency: ${frequency}" -ForegroundColor Cyan
    Write-Host "  Recipients: ${recipients}" -ForegroundColor Cyan
    Write-Host "  Sys ID: $($Response.result.sys_id)" -ForegroundColor Cyan

} catch {
    Write-Error "Failed to create scheduled report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-dashboard-data',
    name: 'Extract Dashboard Data',
    category: 'Reporting',
    description: 'Extract data for dashboard visualization',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'days', label: 'Days to Include', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export JSON Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Dashboard-Data.json' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Extract ServiceNow Dashboard Data
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $StartDate = (Get-Date).AddDays(-${days}).ToString("yyyy-MM-dd")

    # Incident counts
    $IncUrl = "https://$Instance/api/now/table/incident?sysparm_query=opened_at>=$StartDate"
    $Incidents = Invoke-RestMethod -Uri $IncUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    # Change counts
    $ChgUrl = "https://$Instance/api/now/table/change_request?sysparm_query=opened_at>=$StartDate"
    $Changes = Invoke-RestMethod -Uri $ChgUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    # Problem counts
    $PrbUrl = "https://$Instance/api/now/table/problem?sysparm_query=opened_at>=$StartDate"
    $Problems = Invoke-RestMethod -Uri $PrbUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    $DashboardData = @{
        GeneratedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Period = "${days} days"
        Incidents = @{
            Total = $Incidents.result.Count
            Open = ($Incidents.result | Where-Object { $_.state -notin @('6','7') }).Count
            Resolved = ($Incidents.result | Where-Object state -eq '6').Count
            Closed = ($Incidents.result | Where-Object state -eq '7').Count
            ByPriority = @{
                Critical = ($Incidents.result | Where-Object priority -eq '1').Count
                High = ($Incidents.result | Where-Object priority -eq '2').Count
                Moderate = ($Incidents.result | Where-Object priority -eq '3').Count
                Low = ($Incidents.result | Where-Object priority -eq '4').Count
            }
        }
        Changes = @{
            Total = $Changes.result.Count
            Successful = ($Changes.result | Where-Object close_code -eq 'Successful').Count
        }
        Problems = @{
            Total = $Problems.result.Count
            KnownErrors = ($Problems.result | Where-Object known_error -eq 'true').Count
        }
    }

    $DashboardData | ConvertTo-Json -Depth 5 | Out-File -FilePath "${exportPath}" -Encoding UTF8

    Write-Host "✓ Dashboard data exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Incidents: $($DashboardData.Incidents.Total)" -ForegroundColor Cyan
    Write-Host "  Changes: $($DashboardData.Changes.Total)" -ForegroundColor Cyan
    Write-Host "  Problems: $($DashboardData.Problems.Total)" -ForegroundColor Cyan

} catch {
    Write-Error "Dashboard data extraction failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== SERVICE REQUESTS ====================
  {
    id: 'snow-create-service-request',
    name: 'Create Service Request',
    category: 'Service Requests',
    description: 'Create a new service request',
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
    # Find user
    $UserUrl = "https://$Instance/api/now/table/sys_user?sysparm_query=user_name=${requestedFor}"
    $User = Invoke-RestMethod -Uri $UserUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

    $Body = @{
        short_description = "${shortDescription}"
        description = "${description}"
    }

    if ($User.result) {
        $Body["requested_for"] = $User.result[0].sys_id
    }

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body ($Body | ConvertTo-Json)

    Write-Host "✓ Service request created: $($Response.result.number)" -ForegroundColor Green
    Write-Host "  Description: ${shortDescription}" -ForegroundColor Cyan
    Write-Host "  Requested For: ${requestedFor}" -ForegroundColor Cyan

} catch {
    Write-Error "Service request creation failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== INTEGRATION & EVENTS ====================
  {
    id: 'snow-create-event',
    name: 'Create Event Alert',
    category: 'Event Management',
    description: 'Create an event alert in ServiceNow',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'eventSource', label: 'Event Source', type: 'text', required: true, placeholder: 'Monitoring-System' },
      { id: 'eventType', label: 'Event Type', type: 'text', required: true, placeholder: 'Server-Down' },
      { id: 'severity', label: 'Severity', type: 'select', required: true, options: ['Critical', 'Major', 'Minor', 'Warning', 'Info'], defaultValue: 'Major' },
      { id: 'node', label: 'Node Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'description', label: 'Event Description', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const eventSource = escapePowerShellString(params.eventSource);
      const eventType = escapePowerShellString(params.eventType);
      const severity = params.severity;
      const node = escapePowerShellString(params.node);
      const description = escapePowerShellString(params.description);

      const severityMap: Record<string, string> = {
        'Critical': '1',
        'Major': '2',
        'Minor': '3',
        'Warning': '4',
        'Info': '5'
      };

      return `# Create ServiceNow Event Alert
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/em_event"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        source = "${eventSource}"
        event_class = "${eventType}"
        severity = "${severityMap[severity]}"
        node = "${node}"
        description = "${description}"
        time_of_event = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body

    Write-Host "✓ Event alert created!" -ForegroundColor Green
    Write-Host "  Source: ${eventSource}" -ForegroundColor Cyan
    Write-Host "  Type: ${eventType}" -ForegroundColor Cyan
    Write-Host "  Severity: ${severity}" -ForegroundColor Cyan
    Write-Host "  Node: ${node}" -ForegroundColor Cyan

} catch {
    Write-Error "Event creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-knowledge-article',
    name: 'Create Knowledge Article',
    category: 'Knowledge Management',
    description: 'Create a knowledge base article',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'title', label: 'Article Title', type: 'text', required: true },
      { id: 'shortDescription', label: 'Short Description', type: 'text', required: true },
      { id: 'content', label: 'Article Content', type: 'textarea', required: true },
      { id: 'category', label: 'Category', type: 'text', required: false, placeholder: 'IT Support' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const title = escapePowerShellString(params.title);
      const shortDescription = escapePowerShellString(params.shortDescription);
      const content = escapePowerShellString(params.content);
      const category = params.category ? escapePowerShellString(params.category) : '';

      return `# Create ServiceNow Knowledge Article
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/kb_knowledge"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $Body = @{
        short_description = "${title}"
        description = "${shortDescription}"
        text = "${content}"
        workflow_state = "draft"
${category ? `        category = "${category}"` : ''}
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Post \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
        -Body $Body

    Write-Host "✓ Knowledge article created!" -ForegroundColor Green
    Write-Host "  Title: ${title}" -ForegroundColor Cyan
    Write-Host "  Number: $($Response.result.number)" -ForegroundColor Cyan
    Write-Host "  Status: Draft" -ForegroundColor Yellow

} catch {
    Write-Error "Article creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-bulk-update-incidents',
    name: 'Bulk Update Incidents',
    category: 'Incident Management',
    description: 'Update multiple incidents at once',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'incidentNumbers', label: 'Incident Numbers (comma-separated)', type: 'text', required: true, placeholder: 'INC0010001, INC0010002, INC0010003' },
      { id: 'field', label: 'Field to Update', type: 'select', required: true, options: ['state', 'priority', 'assignment_group', 'urgency'], defaultValue: 'state' },
      { id: 'value', label: 'New Value', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const incidentNumbers = params.incidentNumbers.split(',').map((i: string) => i.trim());
      const field = escapePowerShellString(params.field);
      const value = escapePowerShellString(params.value);

      return `# Bulk Update ServiceNow Incidents
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$IncidentNumbers = @(
${incidentNumbers.map((i: string) => `    "${escapePowerShellString(i)}"`).join(',\n')}
)

$UpdatedCount = 0
$FailedCount = 0

try {
    foreach ($IncNumber in $IncidentNumbers) {
        # Find incident
        $SearchUrl = "https://$Instance/api/now/table/incident?sysparm_query=number=$IncNumber"
        $Incident = Invoke-RestMethod -Uri $SearchUrl -Method Get -Credential $Credential -Headers @{"Accept"="application/json"}

        if ($Incident.result) {
            $IncId = $Incident.result[0].sys_id
            $UpdateUrl = "https://$Instance/api/now/table/incident/$IncId"

            $Body = @{
                "${field}" = "${value}"
            } | ConvertTo-Json

            Invoke-RestMethod -Uri $UpdateUrl \`
                -Method Patch \`
                -Credential $Credential \`
                -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
                -Body $Body

            Write-Host "✓ Updated $IncNumber: ${field} = ${value}" -ForegroundColor Green
            $UpdatedCount++
        } else {
            Write-Host "⚠ Incident not found: $IncNumber" -ForegroundColor Yellow
            $FailedCount++
        }
    }

    Write-Host ""
    Write-Host "Bulk Update Complete:" -ForegroundColor Cyan
    Write-Host "  Updated: $UpdatedCount" -ForegroundColor Green
    Write-Host "  Failed: $FailedCount" -ForegroundColor $(if ($FailedCount -gt 0) { 'Red' } else { 'Green' })

} catch {
    Write-Error "Bulk update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'snow-first-response-report',
    name: 'First Response Time Report',
    category: 'Reporting',
    description: 'Calculate and report first response times',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'days', label: 'Days to Analyze', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\First-Response.csv' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const days = params.days || 30;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# First Response Time Report
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    $StartDate = (Get-Date).AddDays(-${days}).ToString("yyyy-MM-dd")
    $ApiUrl = "https://$Instance/api/now/table/incident?sysparm_query=opened_at>=$StartDate^reassignment_count>0"

    $Response = Invoke-RestMethod -Uri $ApiUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}

    $Incidents = $Response.result | Select-Object \`
        number,
        short_description,
        priority,
        @{N='FirstResponseTime_Hours';E={
            if ($_.sys_updated_on -and $_.opened_at) {
                [Math]::Round(([DateTime]::Parse($_.sys_updated_on) - [DateTime]::Parse($_.opened_at)).TotalHours, 2)
            } else { 0 }
        }},
        @{N='AssignmentGroup';E={$_.assignment_group.display_value}},
        opened_at

    $AvgResponseByPriority = $Incidents | Group-Object priority | Select-Object \`
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
        @{N='AvgFirstResponse_Hours';E={[Math]::Round(($_.Group | Measure-Object -Property FirstResponseTime_Hours -Average).Average, 2)}}

    Write-Host "First Response Time Report (Last ${days} Days):" -ForegroundColor Cyan
    $AvgResponseByPriority | Format-Table -AutoSize

    $AvgResponseByPriority | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ First response report exported: ${exportPath}" -ForegroundColor Green

} catch {
    Write-Error "First response report failed: $_"
}`;
    },
    isPremium: true
  }
];
