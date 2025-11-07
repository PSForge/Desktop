import { escapePowerShellString } from './powershell-utils';

export interface GitHubTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface GitHubTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: GitHubTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const githubTasks: GitHubTask[] = [
  {
    id: 'github-bulk-create-repos',
    name: 'Bulk Create Repositories',
    category: 'Bulk Operations',
    description: 'Create multiple GitHub repositories',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true, placeholder: 'my-company' },
      { id: 'repoNames', label: 'Repository Names (comma-separated)', type: 'textarea', required: true, placeholder: 'project-alpha, project-beta' },
      { id: 'private', label: 'Private Repositories', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const repoNamesRaw = (params.repoNames as string).split(',').map((n: string) => n.trim());
      const isPrivate = params.private ? 'true' : 'false';
      
      return `# GitHub Bulk Create Repositories
# Generated: ${new Date().toISOString()}

$Org = "${org}"
$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$RepoNames = @(${repoNamesRaw.map(r => `"${escapePowerShellString(r)}"`).join(', ')})

try {
    foreach ($RepoName in $RepoNames) {
        $Body = @{
            name = $RepoName
            private = $${isPrivate}
            auto_init = $true
        } | ConvertTo-Json
        
        $Uri = "https://api.github.com/orgs/$Org/repos"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ Repository created: $Org/$RepoName" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk repository creation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'github-create-release',
    name: 'Create Release',
    category: 'Release Management',
    description: 'Create a new GitHub release',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'tag', label: 'Tag Name', type: 'text', required: true, placeholder: 'v1.0.0' },
      { id: 'name', label: 'Release Name', type: 'text', required: true, placeholder: 'Version 1.0.0' },
      { id: 'body', label: 'Release Notes', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const tag = escapePowerShellString(params.tag);
      const name = escapePowerShellString(params.name);
      const body = escapePowerShellString(params.body);
      
      return `# GitHub Create Release
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    tag_name = "${tag}"
    name = "${name}"
    body = "${body}"
    draft = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/releases"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Release created: ${tag}" -ForegroundColor Green
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'github-delete-repo',
    name: 'Delete Repository',
    category: 'Common Admin Tasks',
    description: 'Delete a GitHub repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      
      return `# GitHub Delete Repository
# Generated: ${new Date().toISOString()}

$Owner = "${owner}"
$Repo = "${repo}"

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Confirm = Read-Host "Are you sure you want to delete $Owner/$Repo? Type 'DELETE' to confirm"

if ($Confirm -eq 'DELETE') {
    try {
        $Uri = "https://api.github.com/repos/$Owner/$Repo"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
        
        Write-Host "✓ Repository deleted: $Owner/$Repo" -ForegroundColor Green
        
    } catch {
        Write-Error "Failed: $_"
    }
} else {
    Write-Host "Operation cancelled" -ForegroundColor Yellow
}`;
    },
    isPremium: true
  },
  {
    id: 'github-change-visibility',
    name: 'Change Repository Visibility',
    category: 'Common Admin Tasks',
    description: 'Change repository visibility (public/private)',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'visibility', label: 'Visibility', type: 'select', required: true, options: ['public', 'private'], defaultValue: 'private' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const visibility = params.visibility;
      
      return `# GitHub Change Repository Visibility
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    private = $${visibility === 'private' ? 'true' : 'false'}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "✓ Repository visibility changed to: ${visibility}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-manage-collaborators',
    name: 'Manage Repository Collaborators',
    category: 'Common Admin Tasks',
    description: 'Add or remove repository collaborators',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'username', label: 'GitHub Username', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'permission', label: 'Permission Level', type: 'select', required: false, options: ['pull', 'push', 'admin', 'maintain', 'triage'], defaultValue: 'push' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const username = escapePowerShellString(params.username);
      const action = params.action;
      const permission = params.permission || 'push';
      
      return `# GitHub Manage Repository Collaborators
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/collaborators/${username}"
    
    ${action === 'Add' ? `
    $Body = @{
        permission = "${permission}"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    Write-Host "✓ Collaborator added: ${username} with ${permission} permission" -ForegroundColor Green
    ` : `
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    Write-Host "✓ Collaborator removed: ${username}" -ForegroundColor Green
    `}
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-trigger-workflow',
    name: 'Trigger CI/CD Pipeline',
    category: 'Common Admin Tasks',
    description: 'Trigger a GitHub Actions workflow',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'workflowId', label: 'Workflow ID or Filename', type: 'text', required: true, placeholder: 'build.yml' },
      { id: 'ref', label: 'Branch/Ref', type: 'text', required: true, placeholder: 'main', defaultValue: 'main' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const workflowId = escapePowerShellString(params.workflowId);
      const ref = escapePowerShellString(params.ref);
      
      return `# GitHub Trigger CI/CD Pipeline
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    ref = "${ref}"
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Workflow triggered: ${workflowId} on ${ref}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-issues',
    name: 'Retrieve Issue Data and Statistics',
    category: 'Common Admin Tasks',
    description: 'Retrieve and analyze repository issues',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'state', label: 'Issue State', type: 'select', required: true, options: ['open', 'closed', 'all'], defaultValue: 'all' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const state = params.state;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub Retrieve Issue Data and Statistics
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=100"
    $Issues = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $IssueData = $Issues | Select-Object \`
        @{N='Number';E={$_.number}},
        @{N='Title';E={$_.title}},
        @{N='State';E={$_.state}},
        @{N='Author';E={$_.user.login}},
        @{N='Labels';E={($_.labels | ForEach-Object { $_.name }) -join ', '}},
        @{N='Created';E={$_.created_at}},
        @{N='Updated';E={$_.updated_at}},
        @{N='Comments';E={$_.comments}}
    
    $IssueData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Issues exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Issues: $($IssueData.Count)" -ForegroundColor Cyan
    
    $Stats = @{
        Total = $IssueData.Count
        Open = ($IssueData | Where-Object { $_.State -eq 'open' }).Count
        Closed = ($IssueData | Where-Object { $_.State -eq 'closed' }).Count
    }
    
    Write-Host ""
    Write-Host "Statistics:" -ForegroundColor Yellow
    Write-Host "  Total: $($Stats.Total)" -ForegroundColor Cyan
    Write-Host "  Open: $($Stats.Open)" -ForegroundColor Cyan
    Write-Host "  Closed: $($Stats.Closed)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-commits',
    name: 'Retrieve Commit History and Data',
    category: 'Common Admin Tasks',
    description: 'Retrieve commit history and export to CSV',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'branch', label: 'Branch', type: 'text', required: false, placeholder: 'main', defaultValue: 'main' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const branch = escapePowerShellString(params.branch || 'main');
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub Retrieve Commit History
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=100"
    $Commits = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $CommitData = $Commits | Select-Object \`
        @{N='SHA';E={$_.sha.Substring(0,7)}},
        @{N='Author';E={$_.commit.author.name}},
        @{N='Email';E={$_.commit.author.email}},
        @{N='Date';E={$_.commit.author.date}},
        @{N='Message';E={$_.commit.message -replace '[\r\n]+', ' '}}
    
    $CommitData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Commits exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Commits: $($CommitData.Count)" -ForegroundColor Cyan
    Write-Host "  Branch: ${branch}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-manage-teams',
    name: 'Manage Teams and Organization Access',
    category: 'Common Admin Tasks',
    description: 'Manage team access to repositories',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'teamSlug', label: 'Team Slug', type: 'text', required: true, placeholder: 'developers' },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'permission', label: 'Permission Level', type: 'select', required: true, options: ['pull', 'push', 'admin', 'maintain', 'triage'], defaultValue: 'push' }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const teamSlug = escapePowerShellString(params.teamSlug);
      const repo = escapePowerShellString(params.repo);
      const permission = params.permission;
      
      return `# GitHub Manage Teams and Organization Access
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    permission = "${permission}"
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/orgs/${org}/teams/${teamSlug}/repos/${org}/${repo}"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "✓ Team access granted: ${teamSlug}" -ForegroundColor Green
    Write-Host "  Repository: ${repo}" -ForegroundColor Cyan
    Write-Host "  Permission: ${permission}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-configure-webhook',
    name: 'Configure Webhooks',
    category: 'Common Admin Tasks',
    description: 'Create or update repository webhooks',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://example.com/webhook' },
      { id: 'events', label: 'Events (comma-separated)', type: 'text', required: true, placeholder: 'push,pull_request', defaultValue: 'push' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const webhookUrl = escapePowerShellString(params.webhookUrl);
      const events = (params.events as string).split(',').map((e: string) => e.trim());
      
      return `# GitHub Configure Webhook
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    name = "web"
    active = $true
    events = @(${events.map(e => `"${escapePowerShellString(e)}"`).join(', ')})
    config = @{
        url = "${webhookUrl}"
        content_type = "json"
        insecure_ssl = "0"
    }
} | ConvertTo-Json -Depth 10

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/hooks"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Webhook created successfully" -ForegroundColor Green
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  URL: ${webhookUrl}" -ForegroundColor Cyan
    Write-Host "  Events: ${params.events}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-branch-protection',
    name: 'Manage Branch Protection Rules',
    category: 'Common Admin Tasks',
    description: 'Configure branch protection rules',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'branch', label: 'Branch Name', type: 'text', required: true, placeholder: 'main' },
      { id: 'requireReviews', label: 'Require Pull Request Reviews', type: 'boolean', required: false, defaultValue: true },
      { id: 'requiredReviewers', label: 'Required Reviewers Count', type: 'number', required: false, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const branch = escapePowerShellString(params.branch);
      const requireReviews = params.requireReviews ? 'true' : 'false';
      const requiredReviewers = params.requiredReviewers || 1;
      
      return `# GitHub Manage Branch Protection Rules
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    required_status_checks = $null
    enforce_admins = $true
    required_pull_request_reviews = $(if ($${requireReviews}) {
        @{
            required_approving_review_count = ${requiredReviewers}
            dismiss_stale_reviews = $true
        }
    } else { $null })
    restrictions = $null
} | ConvertTo-Json -Depth 10

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "✓ Branch protection enabled: ${branch}" -ForegroundColor Green
    Write-Host "  Required reviews: $${requireReviews}" -ForegroundColor Cyan
    ${params.requireReviews ? `Write-Host "  Reviewers required: ${requiredReviewers}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-manage-actions-workflows',
    name: 'Manage GitHub Actions Workflows',
    category: 'Common Admin Tasks',
    description: 'Create, enable/disable, trigger workflows',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'workflowId', label: 'Workflow ID or Filename', type: 'text', required: true, placeholder: 'build.yml' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable', 'Trigger'], defaultValue: 'Enable' },
      { id: 'ref', label: 'Branch/Ref (for Trigger)', type: 'text', required: false, placeholder: 'main', defaultValue: 'main' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const workflowId = escapePowerShellString(params.workflowId);
      const action = params.action;
      const ref = escapePowerShellString(params.ref || 'main');
      
      return `# GitHub Manage Actions Workflows
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    ${action === 'Enable' ? `
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/enable"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers
    Write-Host "✓ Workflow enabled: ${workflowId}" -ForegroundColor Green
    ` : action === 'Disable' ? `
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/disable"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers
    Write-Host "✓ Workflow disabled: ${workflowId}" -ForegroundColor Green
    ` : `
    $Body = @{
        ref = "${ref}"
    } | ConvertTo-Json
    
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    Write-Host "✓ Workflow triggered: ${workflowId} on ${ref}" -ForegroundColor Green
    `}
    
} catch {
    Write-Error "Workflow management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-configure-dependabot',
    name: 'Configure Dependabot Security',
    category: 'Common Admin Tasks',
    description: 'Set up Dependabot alerts, auto-updates, security policies',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'ecosystem', label: 'Package Ecosystem', type: 'select', required: true, options: ['npm', 'pip', 'maven', 'gradle', 'docker', 'github-actions'], defaultValue: 'npm' },
      { id: 'updateSchedule', label: 'Update Schedule', type: 'select', required: true, options: ['daily', 'weekly', 'monthly'], defaultValue: 'weekly' },
      { id: 'enableAlerts', label: 'Enable Security Alerts', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const ecosystem = params.ecosystem;
      const updateSchedule = params.updateSchedule;
      const enableAlerts = params.enableAlerts ? 'true' : 'false';
      
      return `# GitHub Configure Dependabot Security
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    # Enable vulnerability alerts
    ${params.enableAlerts ? `
    $AlertsUri = "https://api.github.com/repos/${owner}/${repo}/vulnerability-alerts"
    Invoke-RestMethod -Uri $AlertsUri -Method Put -Headers $Headers
    Write-Host "✓ Vulnerability alerts enabled" -ForegroundColor Green
    ` : ''}
    
    # Enable automated security fixes
    $SecurityFixesUri = "https://api.github.com/repos/${owner}/${repo}/automated-security-fixes"
    Invoke-RestMethod -Uri $SecurityFixesUri -Method Put -Headers $Headers
    Write-Host "✓ Automated security fixes enabled" -ForegroundColor Green
    
    # Create/Update dependabot.yml configuration
    $DependabotConfig = @"
version: 2
updates:
  - package-ecosystem: "${ecosystem}"
    directory: "/"
    schedule:
      interval: "${updateSchedule}"
    open-pull-requests-limit: 10
    reviewers:
      - "$owner"
    assignees:
      - "$owner"
"@
    
    $ConfigContent = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($DependabotConfig))
    
    # Check if file exists
    try {
        $ExistingFileUri = "https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yml"
        $ExistingFile = Invoke-RestMethod -Uri $ExistingFileUri -Method Get -Headers $Headers
        $Sha = $ExistingFile.sha
    } catch {
        $Sha = $null
    }
    
    $Body = @{
        message = "Configure Dependabot for ${ecosystem}"
        content = $ConfigContent
        branch = "main"
    }
    
    if ($Sha) {
        $Body.sha = $Sha
    }
    
    $ConfigUri = "https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yml"
    Invoke-RestMethod -Uri $ConfigUri -Method Put -Headers $Headers -Body ($Body | ConvertTo-Json)
    
    Write-Host "✓ Dependabot configuration created/updated" -ForegroundColor Green
    Write-Host "  Ecosystem: ${ecosystem}" -ForegroundColor Cyan
    Write-Host "  Schedule: ${updateSchedule}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Dependabot configuration failed: $_"
}`;
    },
    isPremium: true
  }
];
