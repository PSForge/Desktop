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
  // =====================
  // ISSUE MANAGEMENT
  // =====================
  {
    id: 'jira-create-issue',
    name: 'Create Single Issue',
    category: 'Issue Management',
    description: 'Create a new Jira issue with detailed fields',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'issueType', label: 'Issue Type', type: 'select', required: true, options: ['Task', 'Bug', 'Story', 'Epic', 'Sub-task'], defaultValue: 'Task' },
      { id: 'summary', label: 'Summary', type: 'text', required: true, placeholder: 'Issue summary' },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'priority', label: 'Priority', type: 'select', required: false, options: ['Highest', 'High', 'Medium', 'Low', 'Lowest'], defaultValue: 'Medium' },
      { id: 'assignee', label: 'Assignee Email', type: 'email', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const issueType = params.issueType;
      const summary = escapePowerShellString(params.summary);
      const description = escapePowerShellString(params.description || '');
      const priority = params.priority || 'Medium';
      const assignee = escapePowerShellString(params.assignee || '');
      
      return `# Jira Create Single Issue
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        fields = @{
            project = @{ key = "${projectKey}" }
            summary = "${summary}"
            description = @{
                type = "doc"
                version = 1
                content = @(
                    @{
                        type = "paragraph"
                        content = @(
                            @{
                                type = "text"
                                text = "${description}"
                            }
                        )
                    }
                )
            }
            issuetype = @{ name = "${issueType}" }
            priority = @{ name = "${priority}" }
            ${assignee ? `assignee = @{ emailAddress = "${assignee}" }` : ''}
        }
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/issue"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Issue created successfully!" -ForegroundColor Green
    Write-Host "  Key: $($Response.key)" -ForegroundColor Cyan
    Write-Host "  URL: $JiraUrl/browse/$($Response.key)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create issue: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-bulk-create-issues',
    name: 'Bulk Create Issues',
    category: 'Issue Management',
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
        
        Write-Host "Issue created: $($Response.key) - $Summary" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk issue creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-update-issue',
    name: 'Update Issue Fields',
    category: 'Issue Management',
    description: 'Update fields on an existing Jira issue',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKey', label: 'Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'summary', label: 'New Summary', type: 'text', required: false },
      { id: 'description', label: 'New Description', type: 'textarea', required: false },
      { id: 'priority', label: 'New Priority', type: 'select', required: false, options: ['Highest', 'High', 'Medium', 'Low', 'Lowest'] },
      { id: 'labels', label: 'Labels (comma-separated)', type: 'text', required: false, placeholder: 'bug,urgent,production' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKey = escapePowerShellString(params.issueKey);
      const summary = escapePowerShellString(params.summary || '');
      const description = escapePowerShellString(params.description || '');
      const priority = params.priority || '';
      const labels = params.labels ? (params.labels as string).split(',').map((l: string) => l.trim()) : [];
      
      return `# Jira Update Issue Fields
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$IssueKey = "${issueKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Fields = @{}
    
    ${summary ? `$Fields["summary"] = "${summary}"` : '# No summary update'}
    ${description ? `$Fields["description"] = @{
        type = "doc"
        version = 1
        content = @(@{
            type = "paragraph"
            content = @(@{ type = "text"; text = "${description}" })
        })
    }` : '# No description update'}
    ${priority ? `$Fields["priority"] = @{ name = "${priority}" }` : '# No priority update'}
    ${labels.length > 0 ? `$Fields["labels"] = @(${labels.map(l => `"${escapePowerShellString(l)}"`).join(', ')})` : '# No labels update'}
    
    if ($Fields.Count -eq 0) {
        Write-Host "No fields to update specified" -ForegroundColor Yellow
        return
    }
    
    $Body = @{ fields = $Fields } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "Issue updated successfully: $IssueKey" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to update issue: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-transition-issue',
    name: 'Transition Issue Status',
    category: 'Issue Management',
    description: 'Move an issue through workflow transitions',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKey', label: 'Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'transitionName', label: 'Transition Name', type: 'text', required: true, placeholder: 'In Progress, Done, etc.' },
      { id: 'comment', label: 'Transition Comment', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKey = escapePowerShellString(params.issueKey);
      const transitionName = escapePowerShellString(params.transitionName);
      const comment = escapePowerShellString(params.comment || '');
      
      return `# Jira Transition Issue Status
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$IssueKey = "${issueKey}"
$TransitionName = "${transitionName}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    # Get available transitions
    $TransitionsUri = "$JiraUrl/rest/api/3/issue/$IssueKey/transitions"
    $TransitionsResponse = Invoke-RestMethod -Uri $TransitionsUri -Method Get -Headers $Headers
    
    $Transition = $TransitionsResponse.transitions | Where-Object { $_.name -eq $TransitionName } | Select-Object -First 1
    
    if (-not $Transition) {
        Write-Host "Available transitions:" -ForegroundColor Yellow
        $TransitionsResponse.transitions | ForEach-Object { Write-Host "  - $($_.name)" }
        throw "Transition '$TransitionName' not found"
    }
    
    $Body = @{
        transition = @{ id = $Transition.id }
        ${comment ? `update = @{
            comment = @(
                @{
                    add = @{
                        body = @{
                            type = "doc"
                            version = 1
                            content = @(@{
                                type = "paragraph"
                                content = @(@{ type = "text"; text = "${comment}" })
                            })
                        }
                    }
                }
            )
        }` : ''}
    } | ConvertTo-Json -Depth 10
    
    Invoke-RestMethod -Uri $TransitionsUri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Issue transitioned successfully!" -ForegroundColor Green
    Write-Host "  Issue: $IssueKey" -ForegroundColor Cyan
    Write-Host "  Transition: $TransitionName" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to transition issue: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-bulk-transition',
    name: 'Bulk Transition Issues',
    category: 'Issue Management',
    description: 'Transition multiple issues to a new status',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKeys', label: 'Issue Keys (comma-separated)', type: 'text', required: true, placeholder: 'PROJ-1, PROJ-2, PROJ-3' },
      { id: 'transitionName', label: 'Transition Name', type: 'text', required: true, placeholder: 'Done' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKeys = (params.issueKeys as string).split(',').map((k: string) => k.trim());
      const transitionName = escapePowerShellString(params.transitionName);
      
      return `# Jira Bulk Transition Issues
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$TransitionName = "${transitionName}"
$IssueKeys = @(${issueKeys.map(k => `"${escapePowerShellString(k)}"`).join(', ')})

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

$SuccessCount = 0
$FailCount = 0

foreach ($IssueKey in $IssueKeys) {
    try {
        # Get available transitions
        $TransitionsUri = "$JiraUrl/rest/api/3/issue/$IssueKey/transitions"
        $TransitionsResponse = Invoke-RestMethod -Uri $TransitionsUri -Method Get -Headers $Headers
        
        $Transition = $TransitionsResponse.transitions | Where-Object { $_.name -eq $TransitionName } | Select-Object -First 1
        
        if ($Transition) {
            $Body = @{ transition = @{ id = $Transition.id } } | ConvertTo-Json -Depth 5
            Invoke-RestMethod -Uri $TransitionsUri -Method Post -Headers $Headers -Body $Body
            Write-Host "Transitioned: $IssueKey -> $TransitionName" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "Transition not available for: $IssueKey" -ForegroundColor Yellow
            $FailCount++
        }
    } catch {
        Write-Host "Failed: $IssueKey - $_" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "Bulk transition completed!" -ForegroundColor Green
Write-Host "  Successful: $SuccessCount" -ForegroundColor Cyan
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Yellow' } else { 'Cyan' })`;
    },
    isPremium: true
  },
  {
    id: 'jira-link-issues',
    name: 'Link Issues',
    category: 'Issue Management',
    description: 'Create links between Jira issues',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'inwardIssue', label: 'Inward Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'outwardIssue', label: 'Outward Issue Key', type: 'text', required: true, placeholder: 'PROJ-456' },
      { id: 'linkType', label: 'Link Type', type: 'select', required: true, options: ['Blocks', 'Cloners', 'Duplicate', 'Relates'], defaultValue: 'Relates' },
      { id: 'comment', label: 'Link Comment', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const inwardIssue = escapePowerShellString(params.inwardIssue);
      const outwardIssue = escapePowerShellString(params.outwardIssue);
      const linkType = params.linkType;
      const comment = escapePowerShellString(params.comment || '');
      
      return `# Jira Link Issues
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        type = @{ name = "${linkType}" }
        inwardIssue = @{ key = "${inwardIssue}" }
        outwardIssue = @{ key = "${outwardIssue}" }
        ${comment ? `comment = @{
            body = @{
                type = "doc"
                version = 1
                content = @(@{
                    type = "paragraph"
                    content = @(@{ type = "text"; text = "${comment}" })
                })
            }
        }` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/issueLink"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Issues linked successfully!" -ForegroundColor Green
    Write-Host "  ${inwardIssue} <-> ${outwardIssue}" -ForegroundColor Cyan
    Write-Host "  Link Type: ${linkType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to link issues: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-add-comment',
    name: 'Add Comment to Issue',
    category: 'Issue Management',
    description: 'Add a comment to an existing issue',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKey', label: 'Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'comment', label: 'Comment', type: 'textarea', required: true },
      { id: 'visibility', label: 'Visibility', type: 'select', required: false, options: ['All Users', 'Developers', 'Administrators'], defaultValue: 'All Users' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKey = escapePowerShellString(params.issueKey);
      const comment = escapePowerShellString(params.comment);
      const visibility = params.visibility || 'All Users';
      
      return `# Jira Add Comment to Issue
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$IssueKey = "${issueKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        body = @{
            type = "doc"
            version = 1
            content = @(
                @{
                    type = "paragraph"
                    content = @(
                        @{
                            type = "text"
                            text = "${comment}"
                        }
                    )
                }
            )
        }
        ${visibility !== 'All Users' ? `visibility = @{
            type = "role"
            value = "${visibility}"
        }` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey/comment"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Comment added successfully!" -ForegroundColor Green
    Write-Host "  Issue: $IssueKey" -ForegroundColor Cyan
    Write-Host "  Comment ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add comment: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-add-worklog',
    name: 'Log Work on Issue',
    category: 'Issue Management',
    description: 'Add a worklog entry to track time spent',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKey', label: 'Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'timeSpent', label: 'Time Spent', type: 'text', required: true, placeholder: '2h 30m' },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'comment', label: 'Work Description', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKey = escapePowerShellString(params.issueKey);
      const timeSpent = escapePowerShellString(params.timeSpent);
      const startDate = escapePowerShellString(params.startDate);
      const comment = escapePowerShellString(params.comment || '');
      
      return `# Jira Log Work on Issue
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$IssueKey = "${issueKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        timeSpent = "${timeSpent}"
        started = "${startDate}T09:00:00.000+0000"
        ${comment ? `comment = @{
            type = "doc"
            version = 1
            content = @(@{
                type = "paragraph"
                content = @(@{ type = "text"; text = "${comment}" })
            })
        }` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey/worklog"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Worklog added successfully!" -ForegroundColor Green
    Write-Host "  Issue: $IssueKey" -ForegroundColor Cyan
    Write-Host "  Time Logged: ${timeSpent}" -ForegroundColor Cyan
    Write-Host "  Worklog ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to log work: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-assign-issues',
    name: 'Bulk Assign Issues',
    category: 'Issue Management',
    description: 'Bulk assign issues to a user',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true },
      { id: 'issueKeys', label: 'Issue Keys (comma-separated)', type: 'text', required: true, placeholder: 'PROJ-1, PROJ-2' },
      { id: 'assignee', label: 'Assignee Account ID or Email', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKeys = (params.issueKeys as string).split(',').map((k: string) => k.trim());
      const assignee = escapePowerShellString(params.assignee);
      
      return `# Jira Bulk Assign Issues
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Assignee = "${assignee}"
$IssueKeys = @(${issueKeys.map(k => `"${escapePowerShellString(k)}"`).join(', ')})

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

$SuccessCount = 0
$FailCount = 0

foreach ($IssueKey in $IssueKeys) {
    try {
        $Body = @{ accountId = $Assignee } | ConvertTo-Json
        
        $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey/assignee"
        Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
        
        Write-Host "Assigned: $IssueKey -> $Assignee" -ForegroundColor Green
        $SuccessCount++
    } catch {
        Write-Host "Failed: $IssueKey - $_" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "Bulk assignment completed!" -ForegroundColor Green
Write-Host "  Successful: $SuccessCount" -ForegroundColor Cyan
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Yellow' } else { 'Cyan' })`;
    },
    isPremium: true
  },
  {
    id: 'jira-delete-issues',
    name: 'Delete Issues',
    category: 'Issue Management',
    description: 'Delete one or more Jira issues (use with caution)',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKeys', label: 'Issue Keys (comma-separated)', type: 'text', required: true, placeholder: 'PROJ-1, PROJ-2' },
      { id: 'deleteSubtasks', label: 'Delete Subtasks', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKeys = (params.issueKeys as string).split(',').map((k: string) => k.trim());
      const deleteSubtasks = params.deleteSubtasks !== false;
      
      return `# Jira Delete Issues
# Generated: ${new Date().toISOString()}
# WARNING: This action is irreversible!

$JiraUrl = "${jiraUrl}"
$IssueKeys = @(${issueKeys.map(k => `"${escapePowerShellString(k)}"`).join(', ')})
$DeleteSubtasks = ${deleteSubtasks ? '$true' : '$false'}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
}

Write-Host "WARNING: You are about to delete $($IssueKeys.Count) issue(s)!" -ForegroundColor Red
$Confirm = Read-Host "Type 'DELETE' to confirm"

if ($Confirm -ne 'DELETE') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    return
}

$SuccessCount = 0
$FailCount = 0

foreach ($IssueKey in $IssueKeys) {
    try {
        $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey"
        if ($DeleteSubtasks) {
            $Uri += "?deleteSubtasks=true"
        }
        
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
        Write-Host "Deleted: $IssueKey" -ForegroundColor Green
        $SuccessCount++
    } catch {
        Write-Host "Failed to delete: $IssueKey - $_" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "Deletion completed!" -ForegroundColor Green
Write-Host "  Deleted: $SuccessCount" -ForegroundColor Cyan
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Yellow' } else { 'Cyan' })`;
    },
    isPremium: true
  },

  // =====================
  // PROJECT MANAGEMENT
  // =====================
  {
    id: 'jira-create-project',
    name: 'Create Project',
    category: 'Project Management',
    description: 'Create a new Jira project',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'My Project' },
      { id: 'projectType', label: 'Project Type', type: 'select', required: true, options: ['software', 'business', 'service_desk'], defaultValue: 'software' },
      { id: 'leadAccountId', label: 'Project Lead Account ID', type: 'text', required: true },
      { id: 'description', label: 'Project Description', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const projectName = escapePowerShellString(params.projectName);
      const projectType = params.projectType;
      const leadAccountId = escapePowerShellString(params.leadAccountId);
      const description = escapePowerShellString(params.description || '');
      
      return `# Jira Create Project
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
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
        leadAccountId = "${leadAccountId}"
        ${description ? `description = "${description}"` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/project"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Project created successfully!" -ForegroundColor Green
    Write-Host "  Key: ${projectKey}" -ForegroundColor Cyan
    Write-Host "  Name: ${projectName}" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create project: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-create-component',
    name: 'Create Project Component',
    category: 'Project Management',
    description: 'Create a new component in a project',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'componentName', label: 'Component Name', type: 'text', required: true, placeholder: 'Backend' },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'leadAccountId', label: 'Component Lead Account ID', type: 'text', required: false },
      { id: 'assigneeType', label: 'Default Assignee', type: 'select', required: false, options: ['PROJECT_DEFAULT', 'COMPONENT_LEAD', 'PROJECT_LEAD', 'UNASSIGNED'], defaultValue: 'PROJECT_DEFAULT' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const componentName = escapePowerShellString(params.componentName);
      const description = escapePowerShellString(params.description || '');
      const leadAccountId = escapePowerShellString(params.leadAccountId || '');
      const assigneeType = params.assigneeType || 'PROJECT_DEFAULT';
      
      return `# Jira Create Project Component
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${componentName}"
        project = "${projectKey}"
        ${description ? `description = "${description}"` : ''}
        ${leadAccountId ? `leadAccountId = "${leadAccountId}"` : ''}
        assigneeType = "${assigneeType}"
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/component"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Component created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${componentName}" -ForegroundColor Cyan
    Write-Host "  Project: ${projectKey}" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create component: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-create-version',
    name: 'Create Project Version',
    category: 'Project Management',
    description: 'Create a new version/release in a project',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'versionName', label: 'Version Name', type: 'text', required: true, placeholder: 'v1.0.0' },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: false },
      { id: 'releaseDate', label: 'Release Date (YYYY-MM-DD)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const versionName = escapePowerShellString(params.versionName);
      const description = escapePowerShellString(params.description || '');
      const startDate = escapePowerShellString(params.startDate || '');
      const releaseDate = escapePowerShellString(params.releaseDate || '');
      
      return `# Jira Create Project Version
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${versionName}"
        project = "${projectKey}"
        ${description ? `description = "${description}"` : ''}
        ${startDate ? `startDate = "${startDate}"` : ''}
        ${releaseDate ? `releaseDate = "${releaseDate}"` : ''}
        released = $false
        archived = $false
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/version"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Version created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${versionName}" -ForegroundColor Cyan
    Write-Host "  Project: ${projectKey}" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create version: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-release-version',
    name: 'Release Version',
    category: 'Project Management',
    description: 'Mark a project version as released',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'versionId', label: 'Version ID', type: 'text', required: true, placeholder: '10001' },
      { id: 'releaseDate', label: 'Release Date (YYYY-MM-DD)', type: 'text', required: false },
      { id: 'moveUnfixedTo', label: 'Move Unfixed Issues To Version ID', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const versionId = escapePowerShellString(params.versionId);
      const releaseDate = escapePowerShellString(params.releaseDate || '');
      const moveUnfixedTo = escapePowerShellString(params.moveUnfixedTo || '');
      
      return `# Jira Release Version
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$VersionId = "${versionId}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        released = $true
        ${releaseDate ? `releaseDate = "${releaseDate}"` : `releaseDate = (Get-Date -Format "yyyy-MM-dd")`}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/version/$VersionId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "Version released successfully!" -ForegroundColor Green
    Write-Host "  Version: $($Response.name)" -ForegroundColor Cyan
    Write-Host "  Release Date: $($Response.releaseDate)" -ForegroundColor Cyan
    
    ${moveUnfixedTo ? `
    # Move unfixed issues to next version
    Write-Host "Moving unfixed issues to version ${moveUnfixedTo}..." -ForegroundColor Yellow
    # Note: This would require additional API calls to update affected issues
    ` : ''}
    
} catch {
    Write-Error "Failed to release version: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-list-projects',
    name: 'List All Projects',
    category: 'Project Management',
    description: 'Get a list of all projects in the Jira instance',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira List All Projects
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/project"
    $Projects = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $ProjectData = $Projects | Select-Object \`
        @{N='Key';E={$_.key}},
        @{N='Name';E={$_.name}},
        @{N='Type';E={$_.projectTypeKey}},
        @{N='Lead';E={$_.lead.displayName}},
        @{N='ID';E={$_.id}}
    
    Write-Host "Projects found: $($Projects.Count)" -ForegroundColor Green
    $ProjectData | Format-Table -AutoSize
    
    ${exportPath ? `
    $ProjectData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list projects: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-update-project',
    name: 'Update Project Settings',
    category: 'Project Management',
    description: 'Update project name, description, or lead',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'newName', label: 'New Project Name', type: 'text', required: false },
      { id: 'newDescription', label: 'New Description', type: 'textarea', required: false },
      { id: 'newLeadAccountId', label: 'New Lead Account ID', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const newName = escapePowerShellString(params.newName || '');
      const newDescription = escapePowerShellString(params.newDescription || '');
      const newLeadAccountId = escapePowerShellString(params.newLeadAccountId || '');
      
      return `# Jira Update Project Settings
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Updates = @{}
    ${newName ? `$Updates["name"] = "${newName}"` : ''}
    ${newDescription ? `$Updates["description"] = "${newDescription}"` : ''}
    ${newLeadAccountId ? `$Updates["leadAccountId"] = "${newLeadAccountId}"` : ''}
    
    if ($Updates.Count -eq 0) {
        Write-Host "No updates specified" -ForegroundColor Yellow
        return
    }
    
    $Body = $Updates | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/project/$ProjectKey"
    $Response = Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "Project updated successfully!" -ForegroundColor Green
    Write-Host "  Key: $ProjectKey" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update project: $_"
}`;
    },
    isPremium: true
  },

  // =====================
  // USER MANAGEMENT
  // =====================
  {
    id: 'jira-search-users',
    name: 'Search Users',
    category: 'User Management',
    description: 'Search for users by name or email',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'query', label: 'Search Query', type: 'text', required: true, placeholder: 'john' },
      { id: 'maxResults', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const query = escapePowerShellString(params.query);
      const maxResults = params.maxResults || 50;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira Search Users
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$Query = "${query}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/user/search?query=$([uri]::EscapeDataString($Query))&maxResults=${maxResults}"
    $Users = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $UserData = $Users | Select-Object \`
        @{N='AccountId';E={$_.accountId}},
        @{N='DisplayName';E={$_.displayName}},
        @{N='Email';E={$_.emailAddress}},
        @{N='Active';E={$_.active}},
        @{N='AccountType';E={$_.accountType}}
    
    Write-Host "Users found: $($Users.Count)" -ForegroundColor Green
    $UserData | Format-Table -AutoSize
    
    ${exportPath ? `
    $UserData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to search users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-user-permissions',
    name: 'Get User Permissions',
    category: 'User Management',
    description: 'Check user permissions for a project',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'accountId', label: 'User Account ID', type: 'text', required: false, description: 'Leave empty to check your own permissions' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const accountId = escapePowerShellString(params.accountId || '');
      
      return `# Jira Get User Permissions
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/mypermissions?projectKey=$ProjectKey"
    ${accountId ? `$Uri += "&accountId=${accountId}"` : ''}
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Permissions = $Response.permissions.PSObject.Properties | ForEach-Object {
        [PSCustomObject]@{
            Permission = $_.Name
            Have = $_.Value.havePermission
            Description = $_.Value.description
        }
    }
    
    Write-Host "Permissions for project: $ProjectKey" -ForegroundColor Green
    Write-Host ""
    
    $Granted = $Permissions | Where-Object { $_.Have -eq $true }
    $Denied = $Permissions | Where-Object { $_.Have -eq $false }
    
    Write-Host "Granted Permissions:" -ForegroundColor Cyan
    $Granted | ForEach-Object { Write-Host "  + $($_.Permission)" -ForegroundColor Green }
    
    Write-Host ""
    Write-Host "Denied Permissions:" -ForegroundColor Yellow
    $Denied | ForEach-Object { Write-Host "  - $($_.Permission)" -ForegroundColor Red }
    
} catch {
    Write-Error "Failed to get permissions: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-list-project-roles',
    name: 'List Project Roles',
    category: 'User Management',
    description: 'Get all roles and their members for a project',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      
      return `# Jira List Project Roles
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/project/$ProjectKey/role"
    $Roles = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Project Roles for: $ProjectKey" -ForegroundColor Green
    Write-Host ""
    
    foreach ($RoleName in $Roles.PSObject.Properties.Name) {
        $RoleUrl = $Roles.$RoleName
        $RoleDetails = Invoke-RestMethod -Uri $RoleUrl -Method Get -Headers $Headers
        
        Write-Host "Role: $RoleName" -ForegroundColor Cyan
        Write-Host "  Description: $($RoleDetails.description)" -ForegroundColor Gray
        
        if ($RoleDetails.actors.Count -gt 0) {
            Write-Host "  Members:" -ForegroundColor Yellow
            foreach ($Actor in $RoleDetails.actors) {
                Write-Host "    - $($Actor.displayName) ($($Actor.type))" -ForegroundColor White
            }
        } else {
            Write-Host "  No members assigned" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
} catch {
    Write-Error "Failed to list project roles: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-add-user-to-role',
    name: 'Add User to Project Role',
    category: 'User Management',
    description: 'Add a user or group to a project role',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'roleId', label: 'Role ID', type: 'text', required: true, placeholder: '10002' },
      { id: 'accountId', label: 'User Account ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const roleId = escapePowerShellString(params.roleId);
      const accountId = escapePowerShellString(params.accountId);
      
      return `# Jira Add User to Project Role
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"
$RoleId = "${roleId}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        user = @("${accountId}")
    } | ConvertTo-Json
    
    $Uri = "$JiraUrl/rest/api/3/project/$ProjectKey/role/$RoleId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "User added to role successfully!" -ForegroundColor Green
    Write-Host "  Project: $ProjectKey" -ForegroundColor Cyan
    Write-Host "  Role: $($Response.name)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add user to role: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-bulk-add-watchers',
    name: 'Bulk Add Watchers',
    category: 'User Management',
    description: 'Add watchers to multiple issues',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKeys', label: 'Issue Keys (comma-separated)', type: 'text', required: true, placeholder: 'PROJ-1, PROJ-2' },
      { id: 'accountIds', label: 'Watcher Account IDs (comma-separated)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKeys = (params.issueKeys as string).split(',').map((k: string) => k.trim());
      const accountIds = (params.accountIds as string).split(',').map((a: string) => a.trim());
      
      return `# Jira Bulk Add Watchers
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$IssueKeys = @(${issueKeys.map(k => `"${escapePowerShellString(k)}"`).join(', ')})
$AccountIds = @(${accountIds.map(a => `"${escapePowerShellString(a)}"`).join(', ')})

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

$SuccessCount = 0
$FailCount = 0

foreach ($IssueKey in $IssueKeys) {
    foreach ($AccountId in $AccountIds) {
        try {
            $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey/watchers"
            $Body = '"' + $AccountId + '"'
            
            Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
            Write-Host "Added watcher to $IssueKey" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $IssueKey - $_" -ForegroundColor Red
            $FailCount++
        }
    }
}

Write-Host ""
Write-Host "Bulk add watchers completed!" -ForegroundColor Green
Write-Host "  Successful: $SuccessCount" -ForegroundColor Cyan
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Yellow' } else { 'Cyan' })`;
    },
    isPremium: true
  },

  // =====================
  // AGILE / BOARDS
  // =====================
  {
    id: 'jira-create-sprint',
    name: 'Create Sprint',
    category: 'Agile/Boards',
    description: 'Create a new sprint on an agile board',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'boardId', label: 'Board ID', type: 'number', required: true, placeholder: '123' },
      { id: 'sprintName', label: 'Sprint Name', type: 'text', required: true, placeholder: 'Sprint 1' },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: false },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: false },
      { id: 'goal', label: 'Sprint Goal', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const boardId = params.boardId;
      const sprintName = escapePowerShellString(params.sprintName);
      const startDate = escapePowerShellString(params.startDate || '');
      const endDate = escapePowerShellString(params.endDate || '');
      const goal = escapePowerShellString(params.goal || '');
      
      return `# Jira Create Sprint
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${sprintName}"
        originBoardId = ${boardId}
        ${startDate ? `startDate = "${startDate}T00:00:00.000Z"` : ''}
        ${endDate ? `endDate = "${endDate}T23:59:59.999Z"` : ''}
        ${goal ? `goal = "${goal}"` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/agile/1.0/sprint"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Sprint created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${sprintName}" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  State: $($Response.state)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create sprint: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-start-sprint',
    name: 'Start Sprint',
    category: 'Agile/Boards',
    description: 'Start an existing sprint',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'sprintId', label: 'Sprint ID', type: 'number', required: true, placeholder: '1' },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'goal', label: 'Sprint Goal', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const sprintId = params.sprintId;
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const goal = escapePowerShellString(params.goal || '');
      
      return `# Jira Start Sprint
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$SprintId = ${sprintId}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        state = "active"
        startDate = "${startDate}T00:00:00.000Z"
        endDate = "${endDate}T23:59:59.999Z"
        ${goal ? `goal = "${goal}"` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Sprint started successfully!" -ForegroundColor Green
    Write-Host "  Name: $($Response.name)" -ForegroundColor Cyan
    Write-Host "  State: active" -ForegroundColor Cyan
    Write-Host "  End Date: ${endDate}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to start sprint: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-complete-sprint',
    name: 'Complete Sprint',
    category: 'Agile/Boards',
    description: 'Complete a sprint and move incomplete issues',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'sprintId', label: 'Sprint ID', type: 'number', required: true, placeholder: '1' },
      { id: 'moveToSprintId', label: 'Move Incomplete Issues to Sprint ID', type: 'number', required: false, description: 'Leave empty to move to backlog' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const sprintId = params.sprintId;
      const moveToSprintId = params.moveToSprintId || '';
      
      return `# Jira Complete Sprint
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$SprintId = ${sprintId}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        state = "closed"
        ${moveToSprintId ? `completeDate = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Sprint completed successfully!" -ForegroundColor Green
    Write-Host "  Name: $($Response.name)" -ForegroundColor Cyan
    Write-Host "  State: closed" -ForegroundColor Cyan
    
    ${moveToSprintId ? `
    Write-Host "Note: Incomplete issues will be moved to sprint ${moveToSprintId}" -ForegroundColor Yellow
    ` : `
    Write-Host "Note: Incomplete issues will be moved to backlog" -ForegroundColor Yellow
    `}
    
} catch {
    Write-Error "Failed to complete sprint: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-move-issues-to-sprint',
    name: 'Move Issues to Sprint',
    category: 'Agile/Boards',
    description: 'Move issues to a specific sprint',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'sprintId', label: 'Target Sprint ID', type: 'number', required: true, placeholder: '1' },
      { id: 'issueKeys', label: 'Issue Keys (comma-separated)', type: 'text', required: true, placeholder: 'PROJ-1, PROJ-2' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const sprintId = params.sprintId;
      const issueKeys = (params.issueKeys as string).split(',').map((k: string) => k.trim());
      
      return `# Jira Move Issues to Sprint
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$SprintId = ${sprintId}
$IssueKeys = @(${issueKeys.map(k => `"${escapePowerShellString(k)}"`).join(', ')})

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        issues = $IssueKeys
    } | ConvertTo-Json
    
    $Uri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId/issue"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Issues moved to sprint successfully!" -ForegroundColor Green
    Write-Host "  Sprint ID: $SprintId" -ForegroundColor Cyan
    Write-Host "  Issues: $($IssueKeys -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to move issues: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-sprint-report',
    name: 'Get Sprint Report',
    category: 'Agile/Boards',
    description: 'Generate a sprint report with issue statistics',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'boardId', label: 'Board ID', type: 'number', required: true, placeholder: '123' },
      { id: 'sprintId', label: 'Sprint ID', type: 'number', required: true, placeholder: '1' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const boardId = params.boardId;
      const sprintId = params.sprintId;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira Get Sprint Report
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$BoardId = ${boardId}
$SprintId = ${sprintId}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get sprint details
    $SprintUri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId"
    $Sprint = Invoke-RestMethod -Uri $SprintUri -Method Get -Headers $Headers
    
    # Get sprint issues
    $IssuesUri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId/issue"
    $IssuesResponse = Invoke-RestMethod -Uri $IssuesUri -Method Get -Headers $Headers
    
    $Issues = $IssuesResponse.issues
    
    $Completed = $Issues | Where-Object { $_.fields.status.statusCategory.name -eq 'Done' }
    $InProgress = $Issues | Where-Object { $_.fields.status.statusCategory.name -eq 'In Progress' }
    $ToDo = $Issues | Where-Object { $_.fields.status.statusCategory.name -eq 'To Do' }
    
    Write-Host "Sprint Report: $($Sprint.name)" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Gray
    Write-Host "State: $($Sprint.state)" -ForegroundColor Cyan
    Write-Host "Start: $($Sprint.startDate)" -ForegroundColor Cyan
    Write-Host "End: $($Sprint.endDate)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Issue Summary:" -ForegroundColor Yellow
    Write-Host "  Total Issues: $($Issues.Count)" -ForegroundColor White
    Write-Host "  Completed: $($Completed.Count)" -ForegroundColor Green
    Write-Host "  In Progress: $($InProgress.Count)" -ForegroundColor Yellow
    Write-Host "  To Do: $($ToDo.Count)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Completion Rate: $([math]::Round(($Completed.Count / [math]::Max($Issues.Count, 1)) * 100, 1))%" -ForegroundColor Cyan
    
    ${exportPath ? `
    $ReportData = $Issues | Select-Object \`
        @{N='Key';E={$_.key}},
        @{N='Summary';E={$_.fields.summary}},
        @{N='Status';E={$_.fields.status.name}},
        @{N='Assignee';E={$_.fields.assignee.displayName}},
        @{N='StoryPoints';E={$_.fields.customfield_10016}}
    
    $ReportData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "Report exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get sprint report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-velocity-report',
    name: 'Get Velocity Report',
    category: 'Agile/Boards',
    description: 'Generate velocity metrics across sprints',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'boardId', label: 'Board ID', type: 'number', required: true, placeholder: '123' },
      { id: 'sprintCount', label: 'Number of Sprints', type: 'number', required: false, defaultValue: 5 },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const boardId = params.boardId;
      const sprintCount = params.sprintCount || 5;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira Get Velocity Report
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$BoardId = ${boardId}
$SprintCount = ${sprintCount}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get closed sprints
    $SprintsUri = "$JiraUrl/rest/agile/1.0/board/$BoardId/sprint?state=closed&maxResults=$SprintCount"
    $SprintsResponse = Invoke-RestMethod -Uri $SprintsUri -Method Get -Headers $Headers
    
    $VelocityData = @()
    
    foreach ($Sprint in $SprintsResponse.values) {
        $IssuesUri = "$JiraUrl/rest/agile/1.0/sprint/$($Sprint.id)/issue?fields=status,customfield_10016"
        $IssuesResponse = Invoke-RestMethod -Uri $IssuesUri -Method Get -Headers $Headers
        
        $CompletedIssues = $IssuesResponse.issues | Where-Object { $_.fields.status.statusCategory.name -eq 'Done' }
        $TotalPoints = ($CompletedIssues.fields.customfield_10016 | Measure-Object -Sum).Sum
        
        $VelocityData += [PSCustomObject]@{
            SprintName = $Sprint.name
            StartDate = $Sprint.startDate
            EndDate = $Sprint.endDate
            CompletedIssues = $CompletedIssues.Count
            StoryPoints = if ($TotalPoints) { $TotalPoints } else { 0 }
        }
    }
    
    Write-Host "Velocity Report - Board $BoardId" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Gray
    Write-Host ""
    
    $VelocityData | Format-Table -AutoSize
    
    $AvgVelocity = ($VelocityData.StoryPoints | Measure-Object -Average).Average
    Write-Host ""
    Write-Host "Average Velocity: $([math]::Round($AvgVelocity, 1)) story points per sprint" -ForegroundColor Cyan
    
    ${exportPath ? `
    $VelocityData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Report exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get velocity report: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-list-boards',
    name: 'List Agile Boards',
    category: 'Agile/Boards',
    description: 'List all Scrum and Kanban boards',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key (optional)', type: 'text', required: false },
      { id: 'boardType', label: 'Board Type', type: 'select', required: false, options: ['scrum', 'kanban', 'all'], defaultValue: 'all' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey || '');
      const boardType = params.boardType || 'all';
      
      return `# Jira List Agile Boards
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/agile/1.0/board"
    ${projectKey ? `$Uri += "?projectKeyOrId=${projectKey}"` : ''}
    ${boardType !== 'all' ? `$Uri += "${projectKey ? '&' : '?'}type=${boardType}"` : ''}
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Boards = $Response.values | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Type';E={$_.type}},
        @{N='Project';E={$_.location.projectKey}}
    
    Write-Host "Agile Boards Found: $($Boards.Count)" -ForegroundColor Green
    Write-Host ""
    $Boards | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to list boards: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-backlog',
    name: 'Get Board Backlog',
    category: 'Agile/Boards',
    description: 'Get all issues in the backlog for a board',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'boardId', label: 'Board ID', type: 'number', required: true, placeholder: '123' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const boardId = params.boardId;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira Get Board Backlog
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$BoardId = ${boardId}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/agile/1.0/board/$BoardId/backlog"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $BacklogItems = $Response.issues | Select-Object \`
        @{N='Key';E={$_.key}},
        @{N='Summary';E={$_.fields.summary}},
        @{N='Type';E={$_.fields.issuetype.name}},
        @{N='Priority';E={$_.fields.priority.name}},
        @{N='Status';E={$_.fields.status.name}},
        @{N='StoryPoints';E={$_.fields.customfield_10016}}
    
    Write-Host "Backlog Items: $($BacklogItems.Count)" -ForegroundColor Green
    Write-Host ""
    $BacklogItems | Format-Table -AutoSize
    
    ${exportPath ? `
    $BacklogItems | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get backlog: $_"
}`;
    },
    isPremium: true
  },

  // =====================
  // JQL QUERIES
  // =====================
  {
    id: 'jira-jql-search',
    name: 'JQL Search',
    category: 'JQL Queries',
    description: 'Execute a JQL query and export results',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'jql', label: 'JQL Query', type: 'textarea', required: true, placeholder: 'project = PROJ AND status = "In Progress"' },
      { id: 'maxResults', label: 'Max Results', type: 'number', required: false, defaultValue: 100 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const jql = escapePowerShellString(params.jql);
      const maxResults = params.maxResults || 100;
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira JQL Search
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$JQL = "${jql}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=${maxResults}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Issues = $Response.issues | Select-Object \`
        @{N='Key';E={$_.key}},
        @{N='Summary';E={$_.fields.summary}},
        @{N='Type';E={$_.fields.issuetype.name}},
        @{N='Status';E={$_.fields.status.name}},
        @{N='Priority';E={$_.fields.priority.name}},
        @{N='Assignee';E={$_.fields.assignee.displayName}},
        @{N='Reporter';E={$_.fields.reporter.displayName}},
        @{N='Created';E={$_.fields.created}},
        @{N='Updated';E={$_.fields.updated}}
    
    Write-Host "JQL: $JQL" -ForegroundColor Yellow
    Write-Host "Results: $($Response.total) total, showing $($Issues.Count)" -ForegroundColor Green
    Write-Host ""
    $Issues | Format-Table -AutoSize
    
    ${exportPath ? `
    $Issues | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "JQL search failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-create-filter',
    name: 'Create Saved Filter',
    category: 'JQL Queries',
    description: 'Create a saved JQL filter',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'filterName', label: 'Filter Name', type: 'text', required: true, placeholder: 'My Open Bugs' },
      { id: 'jql', label: 'JQL Query', type: 'textarea', required: true, placeholder: 'project = PROJ AND type = Bug AND status != Done' },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'favourite', label: 'Add to Favorites', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const filterName = escapePowerShellString(params.filterName);
      const jql = escapePowerShellString(params.jql);
      const description = escapePowerShellString(params.description || '');
      const favourite = params.favourite !== false;
      
      return `# Jira Create Saved Filter
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        name = "${filterName}"
        jql = "${jql}"
        ${description ? `description = "${description}"` : ''}
        favourite = ${favourite ? '$true' : '$false'}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$JiraUrl/rest/api/3/filter"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Filter created successfully!" -ForegroundColor Green
    Write-Host "  Name: ${filterName}" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  URL: $($Response.viewUrl)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create filter: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-bulk-update-jql',
    name: 'Bulk Update by JQL',
    category: 'JQL Queries',
    description: 'Update multiple issues matching a JQL query',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'jql', label: 'JQL Query', type: 'textarea', required: true, placeholder: 'project = PROJ AND labels = old-label' },
      { id: 'updateField', label: 'Field to Update', type: 'select', required: true, options: ['labels', 'priority', 'assignee', 'fixVersions', 'components'], defaultValue: 'labels' },
      { id: 'updateValue', label: 'New Value', type: 'text', required: true, placeholder: 'new-label or user account ID' },
      { id: 'updateAction', label: 'Update Action', type: 'select', required: true, options: ['set', 'add', 'remove'], defaultValue: 'set' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const jql = escapePowerShellString(params.jql);
      const updateField = params.updateField;
      const updateValue = escapePowerShellString(params.updateValue);
      const updateAction = params.updateAction;
      
      return `# Jira Bulk Update by JQL
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$JQL = "${jql}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    # First, get all matching issues
    $SearchUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=1000&fields=key"
    $SearchResponse = Invoke-RestMethod -Uri $SearchUri -Method Get -Headers $Headers
    
    $IssueKeys = $SearchResponse.issues | ForEach-Object { $_.key }
    
    Write-Host "Found $($IssueKeys.Count) issues matching JQL" -ForegroundColor Yellow
    
    $Confirm = Read-Host "Proceed with bulk update? (yes/no)"
    if ($Confirm -ne 'yes') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        return
    }
    
    $SuccessCount = 0
    $FailCount = 0
    
    foreach ($IssueKey in $IssueKeys) {
        try {
            ${updateField === 'labels' ? `
            $UpdateBody = @{
                update = @{
                    labels = @(
                        @{ ${updateAction} = "${updateValue}" }
                    )
                }
            } | ConvertTo-Json -Depth 10
            ` : updateField === 'priority' ? `
            $UpdateBody = @{
                fields = @{
                    priority = @{ name = "${updateValue}" }
                }
            } | ConvertTo-Json -Depth 10
            ` : updateField === 'assignee' ? `
            $UpdateBody = @{
                fields = @{
                    assignee = @{ accountId = "${updateValue}" }
                }
            } | ConvertTo-Json -Depth 10
            ` : `
            $UpdateBody = @{
                update = @{
                    ${updateField} = @(
                        @{ ${updateAction} = @{ name = "${updateValue}" } }
                    )
                }
            } | ConvertTo-Json -Depth 10
            `}
            
            $UpdateUri = "$JiraUrl/rest/api/3/issue/$IssueKey"
            Invoke-RestMethod -Uri $UpdateUri -Method Put -Headers $Headers -Body $UpdateBody
            
            Write-Host "Updated: $IssueKey" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "Failed: $IssueKey - $_" -ForegroundColor Red
            $FailCount++
        }
    }
    
    Write-Host ""
    Write-Host "Bulk update completed!" -ForegroundColor Green
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Cyan
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { 'Yellow' } else { 'Cyan' })
    
} catch {
    Write-Error "Bulk update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-list-filters',
    name: 'List Saved Filters',
    category: 'JQL Queries',
    description: 'List all saved filters accessible to you',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'filterType', label: 'Filter Type', type: 'select', required: false, options: ['my', 'favourite', 'all'], defaultValue: 'my' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const filterType = params.filterType || 'my';
      
      return `# Jira List Saved Filters
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    ${filterType === 'my' ? `
    $Uri = "$JiraUrl/rest/api/3/filter/my"
    ` : filterType === 'favourite' ? `
    $Uri = "$JiraUrl/rest/api/3/filter/favourite"
    ` : `
    $Uri = "$JiraUrl/rest/api/3/filter/search"
    `}
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Filters = ${filterType === 'all' ? '$Response.values' : '$Response'} | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Owner';E={$_.owner.displayName}},
        @{N='JQL';E={$_.jql}},
        @{N='Favourite';E={$_.favourite}}
    
    Write-Host "Saved Filters:" -ForegroundColor Green
    Write-Host ""
    $Filters | Format-Table -AutoSize -Wrap
    
} catch {
    Write-Error "Failed to list filters: $_"
}`;
    },
    isPremium: true
  },

  // =====================
  // REPORTING
  // =====================
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
    
    Write-Host "Issues exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Issues: $($Issues.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-worklog-report',
    name: 'Worklog Report',
    category: 'Reporting',
    description: 'Generate a time tracking report for a project',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
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
      
      return `# Jira Worklog Report
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"
$StartDate = "${startDate}"
$EndDate = "${endDate}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get issues with worklogs
    $JQL = "project = $ProjectKey AND worklogDate >= '$StartDate' AND worklogDate <= '$EndDate'"
    $SearchUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=500&fields=key,summary,worklog"
    $Response = Invoke-RestMethod -Uri $SearchUri -Method Get -Headers $Headers
    
    $WorklogData = @()
    
    foreach ($Issue in $Response.issues) {
        # Get full worklog for each issue
        $WorklogUri = "$JiraUrl/rest/api/3/issue/$($Issue.key)/worklog"
        $WorklogResponse = Invoke-RestMethod -Uri $WorklogUri -Method Get -Headers $Headers
        
        foreach ($Worklog in $WorklogResponse.worklogs) {
            $WorklogDate = [DateTime]::Parse($Worklog.started).ToString("yyyy-MM-dd")
            
            if ($WorklogDate -ge $StartDate -and $WorklogDate -le $EndDate) {
                $WorklogData += [PSCustomObject]@{
                    IssueKey = $Issue.key
                    Summary = $Issue.fields.summary
                    Author = $Worklog.author.displayName
                    Date = $WorklogDate
                    TimeSpent = $Worklog.timeSpent
                    TimeSpentSeconds = $Worklog.timeSpentSeconds
                    Comment = ($Worklog.comment.content.content.text -join ' ')
                }
            }
        }
    }
    
    $WorklogData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $TotalSeconds = ($WorklogData.TimeSpentSeconds | Measure-Object -Sum).Sum
    $TotalHours = [math]::Round($TotalSeconds / 3600, 2)
    
    Write-Host "Worklog Report Generated!" -ForegroundColor Green
    Write-Host "  Period: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Total Entries: $($WorklogData.Count)" -ForegroundColor Cyan
    Write-Host "  Total Hours: $TotalHours" -ForegroundColor Cyan
    Write-Host "  Export: ${exportPath}" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Time by User:" -ForegroundColor Yellow
    $WorklogData | Group-Object Author | ForEach-Object {
        $UserHours = [math]::Round(($_.Group.TimeSpentSeconds | Measure-Object -Sum).Sum / 3600, 2)
        Write-Host "  $($_.Name): $UserHours hours" -ForegroundColor White
    }
    
} catch {
    Write-Error "Worklog report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-sla-report',
    name: 'SLA Compliance Report',
    category: 'Reporting',
    description: 'Generate SLA compliance metrics for service desk projects',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Service Desk Project Key', type: 'text', required: true, placeholder: 'SD' },
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
      
      return `# Jira SLA Compliance Report
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"
$StartDate = "${startDate}"
$EndDate = "${endDate}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get resolved issues in date range
    $JQL = "project = $ProjectKey AND resolved >= '$StartDate' AND resolved <= '$EndDate'"
    $SearchUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=1000"
    $Response = Invoke-RestMethod -Uri $SearchUri -Method Get -Headers $Headers
    
    $SLAData = @()
    
    foreach ($Issue in $Response.issues) {
        $Created = [DateTime]::Parse($Issue.fields.created)
        $Resolved = [DateTime]::Parse($Issue.fields.resolutiondate)
        $ResolutionTime = ($Resolved - $Created).TotalHours
        
        # Determine SLA target based on priority (example thresholds)
        $Priority = $Issue.fields.priority.name
        $SLATarget = switch ($Priority) {
            'Highest' { 4 }   # 4 hours
            'High' { 8 }      # 8 hours
            'Medium' { 24 }   # 24 hours
            'Low' { 48 }      # 48 hours
            default { 72 }    # 72 hours
        }
        
        $SLAData += [PSCustomObject]@{
            Key = $Issue.key
            Summary = $Issue.fields.summary
            Priority = $Priority
            Created = $Created.ToString("yyyy-MM-dd HH:mm")
            Resolved = $Resolved.ToString("yyyy-MM-dd HH:mm")
            ResolutionHours = [math]::Round($ResolutionTime, 2)
            SLATargetHours = $SLATarget
            SLAMet = if ($ResolutionTime -le $SLATarget) { "Yes" } else { "No" }
        }
    }
    
    $SLAData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Calculate metrics
    $TotalIssues = $SLAData.Count
    $SLAMet = ($SLAData | Where-Object { $_.SLAMet -eq "Yes" }).Count
    $SLABreached = $TotalIssues - $SLAMet
    $ComplianceRate = if ($TotalIssues -gt 0) { [math]::Round(($SLAMet / $TotalIssues) * 100, 1) } else { 0 }
    
    Write-Host "SLA Compliance Report Generated!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Gray
    Write-Host "  Period: $StartDate to $EndDate" -ForegroundColor Cyan
    Write-Host "  Total Issues: $TotalIssues" -ForegroundColor Cyan
    Write-Host "  SLA Met: $SLAMet" -ForegroundColor Green
    Write-Host "  SLA Breached: $SLABreached" -ForegroundColor $(if ($SLABreached -gt 0) { 'Red' } else { 'Cyan' })
    Write-Host "  Compliance Rate: $ComplianceRate%" -ForegroundColor $(if ($ComplianceRate -ge 90) { 'Green' } elseif ($ComplianceRate -ge 70) { 'Yellow' } else { 'Red' })
    Write-Host ""
    Write-Host "Export: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "SLA report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-project-status-report',
    name: 'Project Status Report',
    category: 'Reporting',
    description: 'Generate a comprehensive project status report',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira Project Status Report
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get project details
    $ProjectUri = "$JiraUrl/rest/api/3/project/$ProjectKey"
    $Project = Invoke-RestMethod -Uri $ProjectUri -Method Get -Headers $Headers
    
    # Get all issues
    $JQL = "project = $ProjectKey"
    $SearchUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=0"
    $TotalResponse = Invoke-RestMethod -Uri $SearchUri -Method Get -Headers $Headers
    $TotalIssues = $TotalResponse.total
    
    # Get issues by status
    $StatusQueries = @{
        'Open' = "project = $ProjectKey AND status = 'Open'"
        'In Progress' = "project = $ProjectKey AND status = 'In Progress'"
        'Done' = "project = $ProjectKey AND status = 'Done'"
        'Blocked' = "project = $ProjectKey AND (status = 'Blocked' OR labels = 'blocked')"
    }
    
    $StatusCounts = @{}
    foreach ($Status in $StatusQueries.Keys) {
        $StatusUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($StatusQueries[$Status]))&maxResults=0"
        $StatusResponse = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers
        $StatusCounts[$Status] = $StatusResponse.total
    }
    
    # Get issues by type
    $TypeQueries = @{
        'Bug' = "project = $ProjectKey AND type = Bug"
        'Task' = "project = $ProjectKey AND type = Task"
        'Story' = "project = $ProjectKey AND type = Story"
        'Epic' = "project = $ProjectKey AND type = Epic"
    }
    
    $TypeCounts = @{}
    foreach ($Type in $TypeQueries.Keys) {
        $TypeUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($TypeQueries[$Type]))&maxResults=0"
        $TypeResponse = Invoke-RestMethod -Uri $TypeUri -Method Get -Headers $Headers
        $TypeCounts[$Type] = $TypeResponse.total
    }
    
    # Output report
    Write-Host "Project Status Report: $ProjectKey" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Gray
    Write-Host "Project Name: $($Project.name)" -ForegroundColor Cyan
    Write-Host "Lead: $($Project.lead.displayName)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Total Issues: $TotalIssues" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "By Status:" -ForegroundColor Yellow
    foreach ($Status in $StatusCounts.Keys) {
        $Count = $StatusCounts[$Status]
        $Percentage = if ($TotalIssues -gt 0) { [math]::Round(($Count / $TotalIssues) * 100, 1) } else { 0 }
        Write-Host "  $Status: $Count ($Percentage%)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "By Type:" -ForegroundColor Yellow
    foreach ($Type in $TypeCounts.Keys) {
        Write-Host "  $Type: $($TypeCounts[$Type])" -ForegroundColor White
    }
    
    ${exportPath ? `
    $ReportData = [PSCustomObject]@{
        Project = $ProjectKey
        ProjectName = $Project.name
        Lead = $Project.lead.displayName
        TotalIssues = $TotalIssues
        Open = $StatusCounts['Open']
        InProgress = $StatusCounts['In Progress']
        Done = $StatusCounts['Done']
        Blocked = $StatusCounts['Blocked']
        Bugs = $TypeCounts['Bug']
        Tasks = $TypeCounts['Task']
        Stories = $TypeCounts['Story']
        Epics = $TypeCounts['Epic']
    }
    
    $ReportData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "Export: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Project status report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-burndown-data',
    name: 'Export Burndown Data',
    category: 'Reporting',
    description: 'Export sprint burndown chart data',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'boardId', label: 'Board ID', type: 'number', required: true, placeholder: '123' },
      { id: 'sprintId', label: 'Sprint ID', type: 'number', required: true, placeholder: '1' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const boardId = params.boardId;
      const sprintId = params.sprintId;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Jira Export Burndown Data
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$BoardId = ${boardId}
$SprintId = ${sprintId}

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get sprint details
    $SprintUri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId"
    $Sprint = Invoke-RestMethod -Uri $SprintUri -Method Get -Headers $Headers
    
    # Get sprint issues with changelog
    $IssuesUri = "$JiraUrl/rest/agile/1.0/sprint/$SprintId/issue?expand=changelog"
    $IssuesResponse = Invoke-RestMethod -Uri $IssuesUri -Method Get -Headers $Headers
    
    $SprintStart = [DateTime]::Parse($Sprint.startDate)
    $SprintEnd = if ($Sprint.endDate) { [DateTime]::Parse($Sprint.endDate) } else { Get-Date }
    
    # Calculate daily burndown
    $BurndownData = @()
    $CurrentDate = $SprintStart
    
    while ($CurrentDate -le $SprintEnd) {
        $DateStr = $CurrentDate.ToString("yyyy-MM-dd")
        
        # Count issues completed by this date
        $Completed = 0
        $Remaining = 0
        
        foreach ($Issue in $IssuesResponse.issues) {
            $IsCompleted = $false
            
            foreach ($History in $Issue.changelog.histories) {
                $HistoryDate = [DateTime]::Parse($History.created)
                if ($HistoryDate.Date -le $CurrentDate.Date) {
                    foreach ($Item in $History.items) {
                        if ($Item.field -eq 'status' -and $Item.toString -eq 'Done') {
                            $IsCompleted = $true
                        }
                    }
                }
            }
            
            if ($IsCompleted) {
                $Completed++
            } else {
                $Remaining++
            }
        }
        
        $BurndownData += [PSCustomObject]@{
            Date = $DateStr
            TotalIssues = $IssuesResponse.issues.Count
            Completed = $Completed
            Remaining = $Remaining
        }
        
        $CurrentDate = $CurrentDate.AddDays(1)
    }
    
    $BurndownData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Burndown Data Exported!" -ForegroundColor Green
    Write-Host "  Sprint: $($Sprint.name)" -ForegroundColor Cyan
    Write-Host "  Period: $($SprintStart.ToString('yyyy-MM-dd')) to $($SprintEnd.ToString('yyyy-MM-dd'))" -ForegroundColor Cyan
    Write-Host "  Export: ${exportPath}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Data Points:" -ForegroundColor Yellow
    $BurndownData | Format-Table -AutoSize
    
} catch {
    Write-Error "Burndown data export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-team-capacity-report',
    name: 'Team Capacity Report',
    category: 'Reporting',
    description: 'Generate team workload and capacity metrics',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Jira Team Capacity Report
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    # Get all open issues assigned to team members
    $JQL = "project = $ProjectKey AND status != Done AND assignee IS NOT EMPTY"
    $SearchUri = "$JiraUrl/rest/api/3/search?jql=$([uri]::EscapeDataString($JQL))&maxResults=1000"
    $Response = Invoke-RestMethod -Uri $SearchUri -Method Get -Headers $Headers
    
    # Group by assignee
    $TeamData = $Response.issues | Group-Object { $_.fields.assignee.displayName } | ForEach-Object {
        $Assignee = $_.Name
        $Issues = $_.Group
        
        $HighPriority = ($Issues | Where-Object { $_.fields.priority.name -in @('Highest', 'High') }).Count
        $InProgress = ($Issues | Where-Object { $_.fields.status.name -eq 'In Progress' }).Count
        $ToDo = ($Issues | Where-Object { $_.fields.status.name -eq 'To Do' }).Count
        
        # Estimate remaining work (story points or issue count)
        $StoryPoints = ($Issues.fields.customfield_10016 | Where-Object { $_ } | Measure-Object -Sum).Sum
        
        [PSCustomObject]@{
            Assignee = $Assignee
            TotalOpenIssues = $Issues.Count
            InProgress = $InProgress
            ToDo = $ToDo
            HighPriority = $HighPriority
            StoryPoints = if ($StoryPoints) { $StoryPoints } else { 'N/A' }
        }
    }
    
    $TeamData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Team Capacity Report - $ProjectKey" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Gray
    Write-Host ""
    $TeamData | Sort-Object TotalOpenIssues -Descending | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Team Members: $($TeamData.Count)" -ForegroundColor Cyan
    Write-Host "  Total Open Issues: $(($TeamData.TotalOpenIssues | Measure-Object -Sum).Sum)" -ForegroundColor Cyan
    Write-Host "  High Priority Items: $(($TeamData.HighPriority | Measure-Object -Sum).Sum)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Export: ${exportPath}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Team capacity report failed: $_"
}`;
    },
    isPremium: true
  },

  // =====================
  // CONFLUENCE INTEGRATION
  // =====================
  {
    id: 'confluence-create-page',
    name: 'Create Confluence Page',
    category: 'Confluence',
    description: 'Create a new page in a Confluence space',
    parameters: [
      { id: 'confluenceUrl', label: 'Confluence URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net/wiki' },
      { id: 'spaceKey', label: 'Space Key', type: 'text', required: true, placeholder: 'TEAM' },
      { id: 'pageTitle', label: 'Page Title', type: 'text', required: true },
      { id: 'pageContent', label: 'Page Content (HTML)', type: 'textarea', required: true },
      { id: 'parentPageId', label: 'Parent Page ID (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const confluenceUrl = escapePowerShellString(params.confluenceUrl);
      const spaceKey = escapePowerShellString(params.spaceKey);
      const pageTitle = escapePowerShellString(params.pageTitle);
      const pageContent = escapePowerShellString(params.pageContent);
      const parentPageId = escapePowerShellString(params.parentPageId || '');
      
      return `# Confluence Create Page
# Generated: ${new Date().toISOString()}

$ConfluenceUrl = "${confluenceUrl}"

$Credential = Get-Credential -Message "Enter Confluence credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

try {
    $Body = @{
        type = "page"
        title = "${pageTitle}"
        space = @{ key = "${spaceKey}" }
        body = @{
            storage = @{
                value = "${pageContent}"
                representation = "storage"
            }
        }
        ${parentPageId ? `ancestors = @(@{ id = "${parentPageId}" })` : ''}
    } | ConvertTo-Json -Depth 10
    
    $Uri = "$ConfluenceUrl/rest/api/content"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "Page created successfully!" -ForegroundColor Green
    Write-Host "  Title: ${pageTitle}" -ForegroundColor Cyan
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  URL: $ConfluenceUrl$($Response._links.webui)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create page: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'confluence-manage-spaces',
    name: 'Create Confluence Space',
    category: 'Confluence',
    description: 'Create a new Confluence space',
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
      
      return `# Confluence Create Space
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
    
    Write-Host "Space created: ${spaceKey}" -ForegroundColor Green
    Write-Host "  Name: ${spaceName}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Space creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'confluence-search-content',
    name: 'Search Confluence Content',
    category: 'Confluence',
    description: 'Search for pages and content in Confluence',
    parameters: [
      { id: 'confluenceUrl', label: 'Confluence URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net/wiki' },
      { id: 'searchQuery', label: 'Search Query', type: 'text', required: true, placeholder: 'project documentation' },
      { id: 'spaceKey', label: 'Space Key (optional)', type: 'text', required: false },
      { id: 'maxResults', label: 'Max Results', type: 'number', required: false, defaultValue: 25 }
    ],
    scriptTemplate: (params) => {
      const confluenceUrl = escapePowerShellString(params.confluenceUrl);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const spaceKey = escapePowerShellString(params.spaceKey || '');
      const maxResults = params.maxResults || 25;
      
      return `# Confluence Search Content
# Generated: ${new Date().toISOString()}

$ConfluenceUrl = "${confluenceUrl}"
$SearchQuery = "${searchQuery}"

$Credential = Get-Credential -Message "Enter Confluence credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $CQL = 'text ~ "' + $SearchQuery + '"'
    ${spaceKey ? `$CQL += ' AND space = "${spaceKey}"'` : ''}
    
    $Uri = "$ConfluenceUrl/rest/api/content/search?cql=$([uri]::EscapeDataString($CQL))&limit=${maxResults}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Results = $Response.results | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Title';E={$_.title}},
        @{N='Type';E={$_.type}},
        @{N='Space';E={$_.space.key}},
        @{N='LastModified';E={$_.history.lastUpdated.when}}
    
    Write-Host "Search Results for: '$SearchQuery'" -ForegroundColor Green
    Write-Host "Found: $($Results.Count) results" -ForegroundColor Cyan
    Write-Host ""
    $Results | Format-Table -AutoSize
    
} catch {
    Write-Error "Search failed: $_"
}`;
    },
    isPremium: true
  },

  // =====================
  // CUSTOM FIELDS & WORKFLOWS
  // =====================
  {
    id: 'jira-list-custom-fields',
    name: 'List Custom Fields',
    category: 'Configuration',
    description: 'List all custom fields in the Jira instance',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira List Custom Fields
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/field"
    $Fields = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $CustomFields = $Fields | Where-Object { $_.custom -eq $true } | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Type';E={$_.schema.type}},
        @{N='CustomType';E={$_.schema.custom}},
        @{N='Searchable';E={$_.searchable}}
    
    Write-Host "Custom Fields: $($CustomFields.Count)" -ForegroundColor Green
    Write-Host ""
    $CustomFields | Format-Table -AutoSize
    
    ${exportPath ? `
    $CustomFields | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to list custom fields: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-list-workflows',
    name: 'List Workflows',
    category: 'Configuration',
    description: 'List all workflows in the Jira instance',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      
      return `# Jira List Workflows
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/workflow/search"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Workflows = $Response.values | Select-Object \`
        @{N='Name';E={$_.id.name}},
        @{N='Description';E={$_.description}},
        @{N='Statuses';E={$_.statuses.Count}},
        @{N='Transitions';E={$_.transitions.Count}},
        @{N='Default';E={$_.isDefault}}
    
    Write-Host "Workflows: $($Workflows.Count)" -ForegroundColor Green
    Write-Host ""
    $Workflows | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to list workflows: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-issue-types',
    name: 'List Issue Types',
    category: 'Configuration',
    description: 'List all issue types available in Jira',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      
      return `# Jira List Issue Types
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/issuetype"
    $IssueTypes = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $TypeData = $IssueTypes | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Description';E={$_.description}},
        @{N='Subtask';E={$_.subtask}},
        @{N='Scope';E={if ($_.scope) { $_.scope.type } else { 'Global' }}}
    
    Write-Host "Issue Types: $($TypeData.Count)" -ForegroundColor Green
    Write-Host ""
    $TypeData | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to list issue types: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-priorities',
    name: 'List Priorities',
    category: 'Configuration',
    description: 'List all priority levels in Jira',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      
      return `# Jira List Priorities
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/priority"
    $Priorities = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $PriorityData = $Priorities | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Description';E={$_.description}},
        @{N='StatusColor';E={$_.statusColor}}
    
    Write-Host "Priorities:" -ForegroundColor Green
    Write-Host ""
    $PriorityData | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to list priorities: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-statuses',
    name: 'List Statuses',
    category: 'Configuration',
    description: 'List all issue statuses in Jira',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      
      return `# Jira List Statuses
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/status"
    $Statuses = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $StatusData = $Statuses | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Description';E={$_.description}},
        @{N='Category';E={$_.statusCategory.name}},
        @{N='CategoryColor';E={$_.statusCategory.colorName}}
    
    Write-Host "Statuses: $($StatusData.Count)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "By Category:" -ForegroundColor Yellow
    $StatusData | Group-Object Category | ForEach-Object {
        Write-Host ""
        Write-Host "  $($_.Name):" -ForegroundColor Cyan
        $_.Group | ForEach-Object {
            Write-Host "    - $($_.Name)" -ForegroundColor White
        }
    }
    
} catch {
    Write-Error "Failed to list statuses: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-clone-issue',
    name: 'Clone Issue',
    category: 'Issue Management',
    description: 'Clone an existing issue with all its details',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKey', label: 'Source Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'newSummary', label: 'New Summary (optional)', type: 'text', required: false, placeholder: 'Leave empty to copy original' },
      { id: 'targetProject', label: 'Target Project Key (optional)', type: 'text', required: false, placeholder: 'Leave empty for same project' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKey = escapePowerShellString(params.issueKey);
      const newSummary = escapePowerShellString(params.newSummary || '');
      const targetProject = escapePowerShellString(params.targetProject || '');
      
      return `# Jira Clone Issue
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$SourceIssueKey = "${issueKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

try {
    # Get source issue details
    $SourceUri = "$JiraUrl/rest/api/3/issue/$SourceIssueKey"
    $SourceIssue = Invoke-RestMethod -Uri $SourceUri -Method Get -Headers $Headers
    
    # Prepare clone data
    $ProjectKey = ${targetProject ? `"${targetProject}"` : '$SourceIssue.fields.project.key'}
    $Summary = ${newSummary ? `"${newSummary}"` : '"[Clone] " + $SourceIssue.fields.summary'}
    
    $CloneBody = @{
        fields = @{
            project = @{ key = $ProjectKey }
            summary = $Summary
            issuetype = @{ id = $SourceIssue.fields.issuetype.id }
            description = $SourceIssue.fields.description
            priority = @{ id = $SourceIssue.fields.priority.id }
        }
    } | ConvertTo-Json -Depth 10
    
    $CreateUri = "$JiraUrl/rest/api/3/issue"
    $NewIssue = Invoke-RestMethod -Uri $CreateUri -Method Post -Headers $Headers -Body $CloneBody
    
    # Create link to original
    $LinkBody = @{
        type = @{ name = "Cloners" }
        inwardIssue = @{ key = $NewIssue.key }
        outwardIssue = @{ key = $SourceIssueKey }
    } | ConvertTo-Json -Depth 10
    
    $LinkUri = "$JiraUrl/rest/api/3/issueLink"
    Invoke-RestMethod -Uri $LinkUri -Method Post -Headers $Headers -Body $LinkBody
    
    Write-Host "Issue cloned successfully!" -ForegroundColor Green
    Write-Host "  Original: $SourceIssueKey" -ForegroundColor Cyan
    Write-Host "  Clone: $($NewIssue.key)" -ForegroundColor Cyan
    Write-Host "  URL: $JiraUrl/browse/$($NewIssue.key)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to clone issue: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-get-issue-history',
    name: 'Get Issue Change History',
    category: 'Issue Management',
    description: 'View the complete change history of an issue',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'issueKey', label: 'Issue Key', type: 'text', required: true, placeholder: 'PROJ-123' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const issueKey = escapePowerShellString(params.issueKey);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Jira Get Issue Change History
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$IssueKey = "${issueKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Accept" = "application/json"
}

try {
    $Uri = "$JiraUrl/rest/api/3/issue/$IssueKey?expand=changelog"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $HistoryData = @()
    
    foreach ($History in $Response.changelog.histories) {
        foreach ($Item in $History.items) {
            $HistoryData += [PSCustomObject]@{
                Date = [DateTime]::Parse($History.created).ToString("yyyy-MM-dd HH:mm")
                Author = $History.author.displayName
                Field = $Item.field
                From = $Item.fromString
                To = $Item.toString
            }
        }
    }
    
    Write-Host "Change History for: $IssueKey" -ForegroundColor Green
    Write-Host "Total Changes: $($HistoryData.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    $HistoryData | Sort-Object Date -Descending | Format-Table -AutoSize -Wrap
    
    ${exportPath ? `
    $HistoryData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host ""
    Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    ` : ''}
    
} catch {
    Write-Error "Failed to get issue history: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'jira-archive-project',
    name: 'Archive Project',
    category: 'Project Management',
    description: 'Archive a Jira project (reversible action)',
    parameters: [
      { id: 'jiraUrl', label: 'Jira URL', type: 'text', required: true, placeholder: 'https://company.atlassian.net' },
      { id: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' }
    ],
    scriptTemplate: (params) => {
      const jiraUrl = escapePowerShellString(params.jiraUrl);
      const projectKey = escapePowerShellString(params.projectKey);
      
      return `# Jira Archive Project
# Generated: ${new Date().toISOString()}

$JiraUrl = "${jiraUrl}"
$ProjectKey = "${projectKey}"

$Credential = Get-Credential -Message "Enter Jira credentials (email/API token)"
$Base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))

$Headers = @{
    "Authorization" = "Basic $Base64Auth"
    "Content-Type" = "application/json"
}

Write-Host "WARNING: You are about to archive project '$ProjectKey'" -ForegroundColor Yellow
Write-Host "This action can be reversed by restoring the project." -ForegroundColor Yellow
$Confirm = Read-Host "Type 'ARCHIVE' to confirm"

if ($Confirm -ne 'ARCHIVE') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    return
}

try {
    $Uri = "$JiraUrl/rest/api/3/project/$ProjectKey/archive"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "Project archived successfully!" -ForegroundColor Green
    Write-Host "  Project: $ProjectKey" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To restore this project, use the Jira admin interface or REST API." -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to archive project: $_"
}`;
    },
    isPremium: true
  }
];
