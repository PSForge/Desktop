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
  }
];
