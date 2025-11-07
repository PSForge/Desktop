import { escapePowerShellString } from './powershell-utils';

export interface JiraTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface JiraTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: JiraTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const jiraTasks: JiraTask[] = [
  {
    id: 'jira-bulk-create-issues',
    name: 'Bulk Create Issues',
    category: 'Bulk Operations',
    description: 'Create multiple Jira issues from a list',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'issueType', label: 'Issue Type', type: 'select', required: true, options: ['Task', 'Bug', 'Story'], defaultValue: 'Task' },
      { id: 'summaries', label: 'Issue Summaries (one per line)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const issueType = params.issueType;
      const summaries = (params.summaries as string).split('\n').filter((s: string) => s.trim());
      
      return `# Jira Bulk Create Issues
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

$Summaries = @(
${summaries.map(s => `    "${escapePowerShellString(s.trim())}"`).join(',\n')}
)

try {
    foreach ($Summary in $Summaries) {
        $Body = @{
            fields = @{
                project = @{ key = $ProjectKey }
                summary = $Summary
                issuetype = @{ name = "${issueType}" }
            }
        } | ConvertTo-Json -Depth 10
        
        $Uri = "$JiraUrl/rest/api/3/issue"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ Issue created: $($Response.key) - $Summary" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk issue creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'jira-export-issues',
    name: 'Export Issues to CSV',
    category: 'Reporting',
    description: 'Export Jira issues matching JQL query',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'jql', label: 'JQL Query', type: 'textarea', required: true, placeholder: 'project = PROJ AND status = "In Progress"' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const jql = escapePowerShellString(params.jql);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Jira Export Issues
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$JQL = "${jql}"

$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=1000"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Issues = $Response.issues | Select-Object \`
        @{N='Key';E={$_.key}},
        @{N='Summary';E={$_.fields.summary}},
        @{N='Status';E={$_.fields.status.name}},
        @{N='Assignee';E={$_.fields.assignee.displayName}},
        @{N='Created';E={$_.fields.created}},
        @{N='Updated';E={$_.fields.updated}}
    
    $Issues | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Issues exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Issues: $($Issues.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'jira-manage-projects',
    name: 'Manage Projects and Boards',
    category: 'Common Admin Tasks',
    description: 'Create or configure Jira projects and boards',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'My Project' },
      { id: 'leadEmail', label: 'Project Lead Email', type: 'email', required: true },
      { id: 'projectType', label: 'Project Type', type: 'select', required: true, options: ['software', 'business'], defaultValue: 'software' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const projectName = escapePowerShellString(params.projectName);
      const leadEmail = escapePowerShellString(params.leadEmail);
      const projectType = params.projectType;
      
      return `# Jira Manage Projects and Boards
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        key = "${projectKey}"
        name = "${projectName}"
        projectTypeKey = "${projectType}"
        lead = "${leadEmail}"
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/project"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Project created: ${projectKey}" -ForegroundColor Green
    Write-Host "  Name: ${projectName}" -ForegroundColor Cyan
    Write-Host "  Type: ${projectType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Project creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-manage-sprints',
    name: 'Manage Sprints and Backlogs',
    category: 'Common Admin Tasks',
    description: 'Create and manage Jira sprints',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'boardId', label: 'Board ID', type: 'number', required: true, placeholder: '123' },
      { id: 'sprintName', label: 'Sprint Name', type: 'text', required: true, placeholder: 'Sprint 1' },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const boardId = params.boardId;
      const sprintName = escapePowerShellString(params.sprintName);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      
      return `# Jira Manage Sprints and Backlogs
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${sprintName}"
        startDate = "${startDate}T00:00:00.000Z"
        endDate = "${endDate}T23:59:59.999Z"
        originBoardId = ${boardId}
    } | ConvertTo-Json
    
    $Uri = "$JiraUrl/rest/agile/1.0/sprint"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Sprint created: ${sprintName}" -ForegroundColor Green
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Start: ${startDate}" -ForegroundColor Cyan
    Write-Host "  End: ${endDate}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Sprint creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-assign-issues',
    name: 'Assign Issues and Update Statuses',
    category: 'Common Admin Tasks',
    description: 'Bulk assign issues and update their status',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'issueKeys', label: 'Issue Keys (comma-separated)', type: 'text', required: true, placeholder: 'PROJ-1, PROJ-2' },
      { id: 'assignee', label: 'Assignee Email', type: 'email', required: true },
      { id: 'newStatus', label: 'New Status', type: 'select', required: false, options: ['To Do', 'In Progress', 'Done'], defaultValue: 'In Progress' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKeys = (params.issueKeys as string).split(',').map((k: string) => k.trim());
      const assignee = escapePowerShellString(params.assignee);
      const newStatus = params.newStatus;
      
      return `# Jira Assign Issues and Update Statuses
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

$IssueKeys = @(${issueKeys.map(k => `"${escapePowerShellString(k)}"`).join(', ')})

try {
    foreach ($IssueKey in $IssueKeys) {
        # Assign issue
        $Body = @{
            fields = @{
                assignee = @{ emailAddress = "${assignee}" }
            }
        } | ConvertTo-Json -Depth 10
        
        $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey"
        Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
        
        Write-Host "✓ Issue assigned: $IssueKey -> ${assignee}" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk assignment completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'confluence-manage-spaces',
    name: 'Manage Confluence Spaces',
    category: 'Common Admin Tasks',
    description: 'Create and configure Confluence spaces',
    parameters: [
      { id: 'confluenceUrl', label: 'Confluence URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net/wiki' },
      { id: 'spaceKey', label: 'Space Key', type: 'text', required: true, placeholder: 'TEAM' },
      { id: 'spaceName', label: 'Space Name', type: 'text', required: true, placeholder: 'Team Space' },
      { id: 'description', label: 'Description', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const confluenceUrl = escapePowerShellString(params.confluenceUrl);
      const spaceKey = escapePowerShellString(params.spaceKey);
      const spaceName = escapePowerShellString(params.spaceName);
      const description = escapePowerShellString(params.description || '');
      
      return `# Confluence Manage Spaces
# Generated: ${new Date().toISOString()}

$ConfluenceUrl = "${confluenceUrl}"
$Credential = Get-Credential -Message "Enter Confluence credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        key = "${spaceKey}"
        name = "${spaceName}"
        description = @{
            plain = @{
                value = "${description}"
                representation = "plain"
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$ConfluenceUrl/rest/api/space"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Space created: ${spaceKey}" -ForegroundColor Green
    Write-Host "  Name: ${spaceName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Space creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'confluence-manage-permissions',
    name: 'Manage Content Access Permissions',
    category: 'Common Admin Tasks',
    description: 'Configure Confluence page and space permissions',
    parameters: [
      { id: 'confluenceUrl', label: 'Confluence URL', type: 'text', required: true },
      { id: 'spaceKey', label: 'Space Key', type: 'text', required: true, placeholder: 'TEAM' },
      { id: 'userEmail', label: 'User Email', type: 'email', required: true },
      { id: 'permission', label: 'Permission Type', type: 'select', required: true, options: ['read', 'write', 'admin'], defaultValue: 'read' }
    ],
    scriptTemplate: (params) => {
      const confluenceUrl = escapePowerShellString(params.confluenceUrl);
      const spaceKey = escapePowerShellString(params.spaceKey);
      const userEmail = escapePowerShellString(params.userEmail);
      const permission = params.permission;
      
      return `# Confluence Manage Content Access Permissions
# Generated: ${new Date().toISOString()}

$ConfluenceUrl = "${confluenceUrl}"
$Credential = Get-Credential -Message "Enter Confluence credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        subject = @{
            type = "user"
            identifier = "${userEmail}"
        }
        operation = @{
            key = "${permission}"
            target = "space"
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$ConfluenceUrl/rest/api/space/${spaceKey}/permission"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Permission granted: ${userEmail}" -ForegroundColor Green
    Write-Host "  Space: ${spaceKey}" -ForegroundColor Cyan
    Write-Host "  Permission: ${permission}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Permission configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-productivity-report',
    name: 'Generate Productivity Reports',
    category: 'Common Admin Tasks',
    description: 'Generate team productivity metrics',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Jira Generate Productivity Reports
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $JQL = "project = ${projectKey} AND created >= '${startDate}' AND created <= '${endDate}'"
    $Uri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=1000"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $ProductivityData = $Response.issues | Group-Object { $_.fields.assignee.displayName } | Select-Object \`
        @{N='Assignee';E={$_.Name}},
        @{N='TotalIssues';E={$_.Count}},
        @{N='Completed';E={($_.Group | Where-Object { $_.fields.status.name -eq 'Done' }).Count}},
        @{N='InProgress';E={($_.Group | Where-Object { $_.fields.status.name -eq 'In Progress' }).Count}},
        @{N='ToDo';E={($_.Group | Where-Object { $_.fields.status.name -eq 'To Do' }).Count}}
    
    $ProductivityData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Productivity report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    $ProductivityData | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-usage-report',
    name: 'Generate Usage Reports',
    category: 'Common Admin Tasks',
    description: 'Generate Jira usage statistics',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Jira Generate Usage Reports
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get all projects
    $ProjectsUri = "$JiraUrl/rest/api/3/project"
    $Projects = Invoke-RestMethod -Uri $ProjectsUri -Method Get -Headers $Headers
    
    $UsageData = $Projects | ForEach-Object {
        $ProjectKey = $_.key
        
        # Get issue count for this project
        $JQL = "project = $ProjectKey"
        $SearchUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=0"
        $SearchResult = Invoke-RestMethod -Uri $SearchUri -Method Get -Headers $Headers
        
        [PSCustomObject]@{
            ProjectKey = $ProjectKey
            ProjectName = $_.name
            TotalIssues = $SearchResult.total
            ProjectType = $_.projectTypeKey
        }
    }
    
    $UsageData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Usage report exported: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Project Summary:" -ForegroundColor Yellow
    $UsageData | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-export-project-data',
    name: 'Export Project Data',
    category: 'Common Admin Tasks',
    description: 'Export comprehensive project data including issues, comments, and attachments',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Jira Export Project Data
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $JQL = "project = $ProjectKey"
    $Uri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=1000&fields=*all"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $ProjectData = $Response.issues | Select-Object \`
        @{N='Key';E={$_.key}},
        @{N='Summary';E={$_.fields.summary}},
        @{N='Description';E={$_.fields.description.content.content.text -join ' '}},
        @{N='Status';E={$_.fields.status.name}},
        @{N='Priority';E={$_.fields.priority.name}},
        @{N='Assignee';E={$_.fields.assignee.displayName}},
        @{N='Reporter';E={$_.fields.reporter.displayName}},
        @{N='Created';E={$_.fields.created}},
        @{N='Updated';E={$_.fields.updated}},
        @{N='Comments';E={$_.fields.comment.total}},
        @{N='Attachments';E={$_.fields.attachment.Count}}
    
    $ProjectData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Project data exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Issues: $($ProjectData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  }
];
